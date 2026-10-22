# Especificación (Requisitos): Núcleo de Sesión Segura

> **Fase SDD:** 1 – Especificar (qué / por qué) | **Comando Spec Kit:** `/speckit-specify`
> **Equivale a:** `requirements.md` en la guía SDD
> **Autor:** Kleber Enrique Chávez Oscullo | **Rama:** `001-nucleo-sesion-segura` | **Iteración:** 1 | **Creado:** 2026-10-22 | **Estado:** ✅ Aprobado (puerta G1)
> **Entrada (intención):** "Los usuarios de la universidad deben entrar una sola vez con dos factores y usar todos los módulos según su rol. Ningún token puede quedar expuesto en el navegador, y cada servicio debe comprobar por sí mismo quién llama."

Este documento describe **qué** debe hacer el sistema y **por qué**. Las tecnologías y los diagramas van en `plan.md`.

---

## 1. Contexto y problema

El sistema anterior, **Proyecto_LoginSWS**, tiene fallas graves en su autenticación:

- Emite un JWT de 30 minutos **antes** de verificar el rostro, así que el segundo factor solo existe en el cliente (hallazgo #1).
- Guarda el JWT en `localStorage`, donde puede robarse con XSS (#12).
- Usa HTTP plano (#11) y una clave JWT por defecto (#5).
- No tiene límite de intentos (#9).
- Permite cambiar la contraseña sin pedir la actual (#7).
- Expone perfiles ajenos por IDOR (#8).
- Sus mensajes permiten enumerar usuarios (#13) y filtran detalles internos (#14).

Esta funcionalidad construye la **base de identidad y sesión** sobre la que se montarán después la biometría (spec 002) y los microfrontends (spec 003). Por eso se resuelve primero el camino **contraseña + TOTP**: demuestra la arquitectura de sesión completa sin depender del resultado del spike S3 (biometría).

### Objetivos
- **O1:** Ninguna credencial con acceso a datos antes del segundo factor.
- **O2:** Ningún token en el navegador; solo una cookie opaca.
- **O3:** Cada backend verifica la identidad por sí mismo (token interno con `aud` propio).
- **O4:** Resistencia a fuerza bruta, enumeración, CSRF y fijación de sesión.

### Actores
| Actor | Rol en el sistema |
|---|---|
| Estudiante, Docente, Bibliotecario | Usuarios que inician sesión y operan según su rol (`ESTUDIANTE`, `DOCENTE`, `BIBLIOTECARIO`) |
| Administrador | Usuario con rol `ADMIN`; en esta iteración, valida el acceso al subgrafo de administración |

---

## 2. Historias de usuario

| ID | Historia | Prioridad |
|---|---|---|
| **US1** | Como usuario, quiero **ingresar mi correo y contraseña** y que el sistema me pida el segundo factor **sin darme todavía acceso a nada**, para que robar mi contraseña no baste para entrar. | P1 🎯 |
| **US2** | Como usuario, quiero **completar el segundo factor con un código TOTP** y quedar con sesión iniciada, para acceder a la plataforma. | P1 🎯 |
| **US3** | Como usuario con sesión, quiero que el módulo que uso **consulte datos de negocio** sin manejar ningún token, y que solo vea lo que mi rol y mi propiedad permiten. | P1 🎯 |
| **US4** | Como usuario, quiero **cerrar sesión** y que se cierre en **todas mis pestañas y módulos**, y que mi sesión expire sola si la dejo abierta. | P2 |
| **US5** | Como usuario, quiero que mi cuenta esté **protegida contra intentos repetidos** de adivinar mi contraseña o mi código. | P2 |
| **US6** | Como usuario, quiero **cambiar mi contraseña** confirmando la actual, y que se cierren todas mis demás sesiones. | P3 |
| **US7** | Como responsable de seguridad, quiero que cada acción de autenticación quede **auditada con un identificador de correlación**, sin datos sensibles en los registros. | P3 |

---

## 3. Requisitos funcionales (formato EARS)

### R1 — Primer factor (US1)
- **FR-001** CUANDO el usuario envía correo y contraseña, el sistema DEBE verificar la contraseña con Argon2id en tiempo constante. *(D9)*
- **FR-002** SI el correo no existe, la contraseña es incorrecta o la cuenta está bloqueada, ENTONCES el sistema DEBE responder con **el mismo mensaje genérico, el mismo código HTTP y un tiempo de respuesta equivalente**. *(#13)*
- **FR-003** CUANDO la contraseña es válida, el sistema DEBE crear una **sesión pendiente** (`PENDIENTE_TOTP`) de **300 s**, sin roles cargados, y entregar solo la cookie `__Host-presid`. **No DEBE emitir ningún token de acceso ni la cookie `__Host-sid`.** *(D1, D9, #1)*
- **FR-004** MIENTRAS la sesión esté pendiente, el sistema DEBE permitir **solo** el endpoint del segundo factor y DEBE rechazar con **401** cualquier acceso a `/graphql` o a `/bff/session`. *(Diagrama 8)*

### R2 — Segundo factor TOTP (US2)
- **FR-005** CUANDO el usuario envía un código TOTP con una sesión pendiente vigente, el sistema DEBE validarlo según RFC 6238 con una ventana de ±1 paso.
- **FR-006** SI el código TOTP ya fue usado (mismo paso de tiempo o uno anterior), ENTONCES el sistema DEBE rechazarlo (**anti-replay**).
- **FR-007** CUANDO el TOTP es válido, el sistema DEBE eliminar la sesión pendiente y crear una sesión `ACTIVA` con un **identificador nuevo** (contra la fijación de sesión), con `amr = ["pwd","otp"]`, los roles del usuario y un `csrf_secret`. Además DEBE entregar la cookie `__Host-sid` y expirar `__Host-presid`.
- **FR-008** SI la sesión pendiente expiró (más de 300 s), ENTONCES el sistema DEBE responder **401** y exigir empezar de nuevo desde la contraseña.
- **FR-009** CUANDO el shell solicita `/bff/session` con una sesión activa, el sistema DEBE devolver `{perfil, roles, csrfToken}` **sin ningún token de acceso**.

### R3 — Propagación de sesión y token interno (US3)
- **FR-010** CUANDO llega una petición a `/graphql`, el sistema DEBE verificar, **en este orden**, antes de contactar cualquier backend:
  1. que el método sea `POST`,
  2. que el `Content-Type` sea `application/json`,
  3. que el `Origin` sea el propio,
  4. que la sesión esté `ACTIVA` y no haya expirado,
  5. que el `X-CSRF-Token` coincida con el de la sesión (comparación en tiempo constante).
- **FR-011** SI falla la verificación del CSRF o del `Origin`, ENTONCES el sistema DEBE responder **403** y no llamar al subgrafo. SI la sesión no existe, expiró o fue revocada, ENTONCES DEBE responder **401** (nunca 200 con `UNAUTHENTICATED`).
- **FR-012** CUANDO el `bff` llama a un backend, DEBE emitir un JWT **ES256** con `iss=bff`, `sub`, `roles`, `aud=<servicio destino>`, `typ=at+jwt`, `iat`, `exp ≤ 300 s`, `jti` y `kid`. *(D5)*
- **FR-013** El `bff` DEBE publicar su clave pública en `/internal/jwks.json`, que es accesible **solo desde la red interna**. SI se pide desde Internet, ENTONCES el `edge-proxy` DEBE responder 404.
- **FR-014** CUANDO un backend recibe una petición, DEBE validar la firma contra el JWKS (y refrescarlo si el `kid` es desconocido), aceptar **solo** `alg=ES256`, y comprobar `iss`, `aud` (= su propio nombre), `typ` y `exp`. SI alguna validación falla, ENTONCES DEBE rechazar la petición (**fallo cerrado**).
- **FR-015** CUANDO un backend responde una consulta, DEBE autorizar por **rol** y por **propiedad** del recurso (`recurso.usuario_id = sub`). SI no se cumple, ENTONCES DEBE devolver el error GraphQL `FORBIDDEN`. *(#8)*
- **FR-016** SI un backend rechaza el token interno, ENTONCES el `bff` DEBE responder un error genérico (502), registrar el evento y **no reintentar con otro `aud`**.

### R4 — Cierre y expiración (US4)
- **FR-017** CUANDO el usuario cierra sesión, el sistema DEBE eliminar la sesión del almacén, registrar `revocada_en` y `motivo_revocacion`, y expirar la cookie.
- **FR-018** CUANDO termina la sesión (por cierre, expiración o un 401), el shell DEBE publicar `session:ended` por `BroadcastChannel('auth')` y todas las pestañas y MFE DEBEN limpiar su estado y redirigir a `/sso`. *(D4)*
- **FR-019** El sistema DEBE expirar la sesión tras **15 min de inactividad** (expiración deslizante) o **8 h absolutas**, lo que ocurra primero.

### R5 — Protección contra fuerza bruta (US5)
- **FR-020** CUANDO falla la contraseña, el sistema DEBE incrementar `fallos_password`. SI se alcanza el umbral de bloqueo (ver Q3), ENTONCES la cuenta DEBE pasar a `BLOQUEADO` y DEBE notificarse por SMTP.
- **FR-021** SI se envían **5 códigos TOTP inválidos** en la misma sesión pendiente, ENTONCES el sistema DEBE eliminar esa sesión pendiente.
- **FR-022** El `edge-proxy` DEBE aplicar **limitación de tasa por IP** en `/bff/auth/*`.

### R6 — Cambio de contraseña (US6)
- **FR-023** CUANDO el usuario cambia su contraseña, el sistema DEBE exigir la contraseña actual y una sesión `ACTIVA`, y DEBE **revocar todas** las sesiones del usuario, incluida la actual. *(#7)*

### R7 — Auditoría (US7)
- **FR-024** El sistema DEBE propagar un `X-Request-Id` desde el `edge-proxy` y DEBE registrar cada intento de autenticación (`factor`, `resultado`, `ip`, `correlation_id`) y cada evento de sesión.
- **FR-025** El sistema NO DEBE registrar contraseñas, códigos o secretos TOTP, cookies, tokens ni datos biométricos en ningún log. *(D12)*

## 4. Requisitos no funcionales

| ID | Requisito (verificable) | Origen |
|---|---|---|
| **NFR-001** | Todo el tráfico externo usa HTTPS (TLS 1.2+/1.3) con HSTS. El puerto 80 solo redirige a 443. | #11 |
| **NFR-002** | Las respuestas incluyen CSP, `X-Content-Type-Options: nosniff`, `Referrer-Policy` y `Permissions-Policy: camera=(self)`. | Diagrama 2 |
| **NFR-003** | Solo `edge-proxy` publica puertos. `bff`, `auth-svc`, `admin-svc`, Redis y PostgreSQL no tienen puertos publicados. | D6 |
| **NFR-004** | Las claves y contraseñas se leen de Docker secrets. SI falta un secreto, ENTONCES el servicio no arranca. | #5 |
| **NFR-005** | Swagger (FastAPI) e introspección GraphQL quedan deshabilitados en producción. | #16 |
| **NFR-006** | Los errores 4xx y 5xx no contienen trazas, `str(e)` ni rutas internas. | #14 |
| **NFR-007** | Un usuario de base de datos por servicio, sin privilegios de DDL en tiempo de ejecución. | D12 |
| **NFR-008** | La sobrecarga del `bff` (sesión + CSRF + emisión del token) es **< 50 ms p95** por petición `/graphql` en el entorno de laboratorio. | Propuesta |
| **NFR-009** | Cobertura según la Constitución X (líneas ≥ 85 %, ramas ≥ 80 %; ≥ 90 % de ramas en módulos de seguridad). | Constitución |

---

## 5. Criterios de aceptación (Gherkin)

| # | Dado | Cuando | Entonces | Req. |
|---|---|---|---|---|
| CA-01 | un usuario con TOTP activo | envía la contraseña correcta | recibe 200 `{siguiente_factor: "TOTP"}` y solo la cookie `__Host-presid`, sin ningún token | FR-001, FR-003 |
| CA-02 | un correo inexistente, otro existente con la contraseña incorrecta y una cuenta bloqueada | se intenta el login con cada uno | las tres respuestas son idénticas en código y cuerpo, y su tiempo difiere < 50 ms | FR-002 |
| CA-03 | una sesión pendiente | se llama a `/graphql` o a `/bff/session` | responde 401 | FR-004 |
| CA-04 | una sesión pendiente | se envía un TOTP válido | se entrega `__Host-sid` con un id distinto al de la sesión pendiente, y `__Host-presid` expira | FR-005, FR-007 |
| CA-05 | un código TOTP ya aceptado | se reenvía | se rechaza | FR-006 |
| CA-06 | una sesión pendiente creada hace 301 s | se envía un TOTP | responde 401 | FR-008 |
| CA-07 | una sesión activa | el shell pide `/bff/session` | recibe perfil, roles y `csrfToken`; el cuerpo no contiene ningún JWT | FR-009 |
| CA-08 | una sesión activa | se llama a `/graphql` sin `X-CSRF-Token` o con un `Origin` ajeno | responde 403 y el subgrafo no recibe la llamada | FR-010, FR-011 |
| CA-09 | una sesión activa y un CSRF correcto | se consulta `/graphql` | el subgrafo recibe un JWT ES256 con `aud=admin-svc`, `typ=at+jwt` y `exp − iat ≤ 300` | FR-012 |
| CA-10 | un token firmado con `aud=auth-svc` | se presenta a `admin-svc` | `admin-svc` lo rechaza | FR-014 |
| CA-11 | un token con `alg=none` o HS256, o vencido | se presenta a un backend | el backend lo rechaza | FR-014 |
| CA-12 | un estudiante | consulta un recurso de otro usuario o una operación de `ADMIN` | recibe `FORBIDDEN` | FR-015 |
| CA-13 | una sesión activa en 2 pestañas | se cierra sesión en una | la otra recibe `session:ended` y redirige a `/sso`; la cookie anterior da 401 | FR-017, FR-018 |
| CA-14 | una sesión sin actividad durante 15 min | se hace una petición | responde 401 | FR-019 |
| CA-15 | 5 TOTP inválidos en una sesión pendiente | se envía el 6.º | responde 401 y hay que reiniciar desde la contraseña | FR-021 |
| CA-16 | un usuario con 2 sesiones activas | cambia su contraseña con la actual correcta | ambas sesiones quedan revocadas | FR-023 |
| CA-17 | cualquier flujo de login | se revisan los logs | contienen `correlation_id` y no contienen la contraseña, el código TOTP, la cookie ni el token | FR-024, FR-025 |
| CA-18 | la topología levantada | se escanean los puertos del host | solo están abiertos el 443 y el 80 | NFR-003 |
| CA-19 | `/internal/jwks.json` | se pide desde Internet | responde 404 | FR-013 |
| CA-20 | una cuenta activa | se falla la contraseña hasta el umbral de Q3 | la cuenta pasa a `BLOQUEADO`, la respuesta sigue siendo la genérica de CA-02 y se registra la notificación | FR-020 |
| CA-21 | una IP | envía a `/bff/auth/*` más peticiones que el límite configurado | recibe 429 | FR-022 |
| CA-22 | un subgrafo que rechaza el token interno | se consulta `/graphql` | el `bff` responde 502 genérico, registra el evento y hace **una sola** llamada al subgrafo | FR-016 |

## 6. Casos límite y errores

- Correo con mayúsculas o espacios: se normaliza (`CITEXT` y recorte).
- Contraseña muy larga: se limita el tamaño de la petición en `edge-proxy` y en el `bff` para no saturar Argon2id.
- Reloj del servidor desfasado: la ventana de ±1 paso cubre 30 s; si el desfase es mayor, se registra una alerta.
- Peticiones simultáneas con el mismo TOTP: solo una puede consumir el paso (actualización atómica de `ultimo_paso_usado`).
- El `kid` cambia durante la rotación: los backends refrescan el JWKS una sola vez antes de rechazar.
- Redis no disponible: el `bff` responde 503 y **nunca** "abre" el acceso.

## 7. Fuera de alcance de esta iteración

- ❌ Segundo factor **biométrico**, liveness, PAD, enrolamiento facial y consentimiento LOPDP → **spec 002** (depende del spike S3).
- ❌ Microfrontends reales en React, Next.js y Angular → **spec 003** (depende del spike S2). En esta iteración el shell es **mínimo**: login, TOTP, sesión, una consulta y logout.
- ❌ Supergrafo GraphQL con Hive Gateway → **spec 004** (depende del spike S1). Esta iteración usa el **plan B** de D7.
- ❌ Subgrafos académico (Spring Boot) y biblioteca (Laravel) → spec 004.
- ❌ Gestión de usuarios y roles desde la interfaz → spec 005. Los usuarios se crean con un script de *seed*.
- ❌ mTLS y service mesh (NIST REC-1): trabajo futuro, declarado en la Constitución IV.

## 8. Preguntas abiertas

| # | Pregunta | Responsable | Estado |
|---|---|---|---|
| Q1 | ¿`auth-svc` será un proveedor OIDC estándar o entregará una aserción propietaria al `bff`? | Autor + tutor | ⏳ Se decide **antes de S2**. Provisionalmente: **aserción propietaria** por la red interna (ADR-04 del plan). |
| Q2 | ¿Supergrafo o BFF sin supergrafo? | Autor | ✅ Iteración 1: **plan B** (BFF enruta a `admin-svc`). La decisión definitiva depende de S1. |
| Q3 | ¿Cuál es el umbral de `fallos_password` para bloquear la cuenta? | Tutor | ⏳ **Propuesta: 10 fallos consecutivos → `BLOQUEADO`**, y se desbloquea con un administrador. La arquitectura no fija el valor. |
| Q4 | ¿El cambio de contraseña revoca también la sesión actual? | Autor | ✅ **Sí.** Revoca todas, por ser lo más seguro, y el usuario vuelve a iniciar sesión. |
| Q5 | ¿Cuál es la ventana de tolerancia del TOTP? | Autor | ✅ ±1 paso (30 s), según el diagrama 3. |

## 9. Criterios de éxito

- **SC-001:** En **ningún** paso previo a CA-04 el navegador tiene una credencial con acceso a datos (lo verifica una prueba e2e).
- **SC-002:** El 100 % de los criterios CA-01 a CA-22 tienen una prueba automatizada que pasa.
- **SC-003:** Los hallazgos de LoginSWS #1, #5, #7, #8, #9, #11, #12, #13 y #14 quedan cerrados con evidencia.

---

## ✅ Puerta G1 — Checklist antes de aprobar los requisitos

- [X] El problema y el valor están claros (§1, con los hallazgos de LoginSWS).
- [X] Cada requisito es verificable y tiene un ID (FR-001 a FR-025, NFR-001 a NFR-009).
- [X] Hay casos límite y de error (§6).
- [X] Está definido lo que queda fuera de alcance (§7, con la spec destino).
- [X] No menciona tecnologías innecesariamente. Solo aparecen los estándares que fija la Constitución (Argon2id, RFC 6238, ES256).
- [X] Las preguntas abiertas están resueltas o asignadas (§8: Q1 y Q3 asignadas, con valor provisional).

**Elaborado por:** Kleber Enrique Chávez Oscullo · **Aprobado por:** ____________________ (tutor), fecha: __________
