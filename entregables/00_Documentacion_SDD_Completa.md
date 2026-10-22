# Plataforma Universitaria con Microfrontends y SSO Biométrico Facial

**Documentación SDD completa – Iteración 1 (`001-nucleo-sesion-segura`)**

*Spec-Driven Development con GitHub Spec Kit · Nivel spec-anchored · 22 de octubre de 2026*

| | |
|---|---|
| **Estudiante** | Kleber Enrique Chávez Oscullo |
| **Asignatura** | Gestión de Proyectos de Software |
| **Docente** | ____________________________ |
| **Repositorio** | https://github.com/kechavez07/GestionSDD |

## Índice

1. Constitución (`/speckit-constitution`)
2. Especificación (`/speckit-specify`)
3. Planificación (`/speckit-plan`)
4. Tareas (`/speckit-tasks`)
5. Implementación (`/speckit-implement`)
6. Auditoría (`/speckit-converge` · coverage)


---

# Constitución del Proyecto: Plataforma Universitaria con Microfrontends y SSO Biométrico Facial

> **Fase SDD:** 0 – Principios del proyecto | **Comando Spec Kit:** `/speckit-constitution`
> **Artefacto:** `.specify/memory/constitution.md`
> **Autor:** Kleber Enrique Chávez Oscullo | **Versión:** 1.0.0 | **Ratificada:** 2026-10-22
> **Fuente:** documento de arquitectura de la tesis (decisiones base D1–D12) y análisis técnico de Proyecto_LoginSWS (hallazgos #1–#16).

## Propósito

La plataforma es una aplicación web universitaria formada por un **shell** y cuatro **microfrontends** (SSO, administración, académico y biblioteca). Ofrece **autenticación única de dos factores**: contraseña más rostro, o TOTP como alternativa. El acceso a cada módulo depende del rol del usuario.

Esta constitución reúne las reglas **globales y no negociables** que aplican a todas las funcionalidades e iteraciones. Ninguna especificación, plan, tarea o línea de código puede contradecirla.

**Nivel de rigor SDD:** *spec-anchored*. La spec se mantiene viva: si cambia el comportamiento, primero se edita la spec y luego el código.

---

## 1. Stack y nomenclatura obligatoria

| Componente | Rol | Tecnología |
|---|---|---|
| `shell` | Host de composición, sesión de UI, router de nivel superior | React + Vite *(propuesta, se valida en el spike S2)* |
| `mf-sso` | Login, enrolamiento y captura facial | React + MediaPipe Tasks Vision (WASM local, versión fijada, SRI) |
| `mf-admin` | Administración | Next.js (Multi-Zones bajo `/admin`) |
| `mf-academico` | Gestión académica | React |
| `mf-biblioteca` | Biblioteca y reservas | Angular + apollo-angular |
| `edge-proxy` | TLS, HSTS, cabeceras de seguridad, enrutamiento, rate limiting | Caddy / Nginx |
| `bff` | Sesión, CSRF, tokens internos, JWKS, gateway GraphQL, endpoint biométrico | NestJS + Hive Gateway |
| `auth-svc` | Identidad, Argon2id, TOTP, roles, bloqueos, consentimiento | FastAPI |
| `bio-svc` | Liveness, PAD, embeddings y plantillas cifradas | FastAPI + DeepFace (ArcFace) + Silent-Face |
| `admin-svc` / `academico-svc` / `biblioteca-svc` | Subgrafos de dominio | NestJS / Spring Boot / Laravel (Lighthouse) |
| `session-store` | Sesiones y retos efímeros | Redis |
| `*-db` | Un almacén por servicio | PostgreSQL |
| Despliegue | Topología completa | Docker Compose v2 con redes internas |

Cambiar una tecnología de esta tabla requiere una **enmienda** (§9) y un ADR en el `plan.md` de la funcionalidad afectada.

---

## 2. Principios fundamentales

### I. La especificación es la fuente de verdad (NO NEGOCIABLE)
- No se escribe código sin `spec.md`, `plan.md` y `tasks.md` aprobados en sus puertas de revisión.
- Cada requisito se traza a una decisión base (D1–D12) o a un hallazgo de LoginSWS (#1–#16) cuando corresponda.
- Si una tarea es ambigua o contradice la spec, el agente **se detiene y pregunta**.

### II. Ningún token en el navegador (D1, D3) (NO NEGOCIABLE)
- El navegador solo transporta la cookie opaca `__Host-sid`, o `__Host-presid` durante el login, con `HttpOnly`, `Secure`, `SameSite=Strict` y `Path=/`.
- Ningún JWT ni token de acceso llega a JavaScript, a `localStorage` ni a `sessionStorage` (corrige el hallazgo #12).
- Los MFE llaman al backend solo a través del contrato del shell: `authFetch` o un cliente GraphQL con `credentials: 'include'` y la cabecera `X-CSRF-Token`.

### III. Mismo origen por rutas (D2)
- Un solo dominio y un solo certificado TLS: `/`, `/sso`, `/admin`, `/academico`, `/biblioteca`, `/bff/*` y `/graphql`.
- **Prohibido** CORS con credenciales.

### IV. Zero Trust reducido y declarado (D5, D6)
- El `bff` **no reenvía** la identidad del usuario tal cual. Por cada llamada emite un JWT **ES256**, `typ=at+jwt`, con vida **≤ 5 min** y un `aud` **único** del servicio destino.
- Cada backend valida `alg` (lista blanca), `iss`, `aud`, `typ` y `exp` contra el JWKS interno del `bff`, y autoriza por rol con **fallo cerrado**.
- Solo `edge-proxy` publica puertos (443, y 80 que redirige a 443). Los backends, las bases de datos y `bio-svc` no publican puertos.
- Se declara el alcance según NIST SP 800-207A: REC-4/REC-5 cubiertos, REC-2/REC-3 parciales y REC-1 (mTLS) **no cubierto**, que queda como trabajo futuro.

### V. El segundo factor se decide en el servidor (D9, D11) (NO NEGOCIABLE)
- La cookie de sesión se emite **solo después de los dos factores**: contraseña y rostro, o contraseña y TOTP (corrige el hallazgo #1).
- El cliente (MediaPipe) solo guía al usuario; **nunca decide**. La prueba de vida usa un nonce de un solo uso generado y consumido en el servidor (corrige el hallazgo #4).
- Límites de intentos: **5 fallos faciales consecutivos → espera de 30 s**; **50 fallos acumulados → biometría deshabilitada**, acceso solo por TOTP y reenrolamiento.

### VI. Protección de datos biométricos – LOPDP Ecuador (D8, D10)
- **Nunca se guardan imágenes faciales**, ni en disco ni en logs (corrige el hallazgo #2). Solo se guardan embeddings cifrados con **AES-256-GCM**.
- El consentimiento es **explícito, versionado y revocable**, y siempre existe una alternativa no biométrica (TOTP).
- La imagen facial **no viaja por GraphQL**. Usa un endpoint binario dedicado `/bff/auth/face/*`.
- `bio-svc` está aislado en su propio segmento de red y su propia base de datos, y **solo `auth-svc`** puede llamarlo.

### VII. Base de datos por servicio y auditoría limpia (D12)
- Cada servicio es dueño exclusivo de su almacén, con credenciales distintas. Entre bases solo hay **referencias lógicas**.
- Toda acción relevante se audita con `correlation_id` (`X-Request-Id`). **Nunca** se registran contraseñas, tokens, secretos TOTP ni datos biométricos.

### VIII. Errores genéricos y sin enumeración
- Las respuestas de autenticación son uniformes en mensaje y en tiempo, para que no revelen si existe una cuenta (corrige el hallazgo #13).
- Las respuestas de error no incluyen trazas, `str(e)` ni rutas internas. El detalle queda solo en la auditoría (corrige el hallazgo #14).

### IX. Secretos y cadena de suministro
- Las claves (ES256, AES, contraseñas de bases de datos, SMTP) viven en **Docker secrets**. Si falta un secreto, el servicio **no arranca** (corrige el hallazgo #5).
- Dependencias con versión fijada y activos con **SRI**. **Prohibido** `@latest` y los CDN sin integridad. Swagger e introspección GraphQL quedan **deshabilitados en producción** (corrige el hallazgo #16).

### X. Requisitos verificables y pruebas trazables
- Cada requisito tiene un ID (`FR-xxx`, `NFR-xxx`) y al menos una prueba planificada. **El nombre de cada prueba lleva el ID del requisito.**
- Cada servicio tiene pruebas unitarias, de integración y de seguridad (casos negativos: token con `aud` incorrecto, CSRF ausente, sesión pendiente usada como activa, etc.).
- Cobertura mínima por servicio: **líneas ≥ 85 %, ramas ≥ 80 %**. En los módulos de seguridad (sesión, CSRF, emisión y validación de tokens, contraseña, TOTP): **ramas ≥ 90 %**.

### XI. Incrementos pequeños, una funcionalidad a la vez
- Se especifica **por funcionalidad**, no todo el producto de golpe.
- Se implementa **una tarea a la vez**, con un commit por tarea que cite su ID.

---

## 3. Prohibido

- ❌ Emitir cualquier credencial con acceso a datos antes de completar el segundo factor.
- ❌ Guardar tokens en el navegador, o enviar JWT de usuario a un MFE.
- ❌ Persistir imágenes faciales o registrarlas en logs.
- ❌ Usar `@authenticated` o `@requiresScopes` del router GraphQL como **único** control de seguridad (D7). La seguridad no depende del router.
- ❌ Publicar puertos de backends o bases de datos.
- ❌ Que un MFE llame directamente a un backend sin pasar por el `bff`.
- ❌ Agregar dependencias sin justificarlas en el `plan.md` (*Complexity Tracking*).
- ❌ Aprobar una fase sin leerla.

## 4. Spikes y decisiones condicionadas

| Spike | Pregunta | Afecta | Regla |
|---|---|---|---|
| **S1** | ¿Federación GraphQL completa (Hive Gateway) o BFF sin supergrafo (plan B)? | D7 | Mientras no haya un go, se usa el **plan B**: el BFF enruta a un endpoint GraphQL por módulo. |
| **S2** | ¿Mecanismo de carga de remotos (Module Federation, Native Federation, single-spa)? ¿Compatibilidad de Next.js y Angular? | Shell, MFE | El contrato `authFetch` y `BroadcastChannel` es independiente del mecanismo. |
| **S3** | ¿Umbral τ de ArcFace y resultados de PAD aceptables? | D9 | Si es no-go, **plan B**: AWS Face Liveness solo para detección de vida, con consentimiento específico por transferencia internacional. |

Cada spike termina con un registro **go/no-go** que se adjunta al `plan.md` de la funcionalidad correspondiente.

## 5. Puertas de revisión humanas

| Puerta | Artefacto | Aprueba | Criterio |
|---|---|---|---|
| G0 | `constitution.md` | Autor de la tesis + tutor | Consenso |
| G1 | `spec.md` | Tutor (rol de Product Owner) | Checklist de requisitos |
| G2 | `plan.md` | Tutor (rol de líder técnico) | Checklist de diseño, coherente con D1–D12 |
| G3 | `tasks.md` | Autor de la tesis | Checklist de tareas |
| G4 | Implementación | Revisor de código | Pruebas en verde y diff revisado |
| G5 | Auditoría | Tutor | Checklist de cierre y estado CONVERGED |

## 6. Definición de "Terminado"

1. Todas las tareas están marcadas `[X]` y cumplen su "Hecho cuando…".
2. Las pruebas de todos los servicios afectados pasan, y la cobertura cumple el Principio X.
3. Cada FR/NFR tiene al menos una prueba con su ID en el nombre.
4. Las pruebas negativas de seguridad (Principios II, IV, V y VIII) pasan.
5. `docker compose up` levanta la topología y solo el puerto 443 (y el 80 de redirección) está publicado.
6. La spec refleja el comportamiento final y la auditoría indica **CONVERGED**.

## 7. Hoja de ruta por funcionalidades

| Spec | Funcionalidad | Depende de |
|---|---|---|
| **001** | Núcleo de sesión segura: contraseña + TOTP, BFF, token interno y un subgrafo | — |
| 002 | Segundo factor biométrico: `bio-svc`, liveness, PAD, ArcFace y enrolamiento | 001, S3 |
| 003 | Shell + microfrontends heterogéneos (React, Next.js, Angular) | 001, S2 |
| 004 | Subgrafos académico y biblioteca, y supergrafo GraphQL | 001, S1 |
| 005 | Administración: usuarios, roles, revocación y reenrolamiento | 001, 002 |

## 8. Instrucciones para el agente de IA

Están en `AGENTS.md` y `CLAUDE.md`.

## 9. Gobernanza

- Esta constitución está **por encima** de cualquier otra práctica del proyecto.
- **Enmiendas:** se proponen por escrito, se aprueban en G0 y se versionan con SemVer (MAYOR: elimina o redefine un principio; MENOR: agrega uno; PARCHE: aclaraciones).
- **Historial:** 1.0.0 (2026-10-22), versión inicial derivada de la arquitectura de la tesis.


---

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


---

# Plan Técnico (Diseño): Núcleo de Sesión Segura

> **Fase SDD:** 2 – Diseñar / Planificar (cómo) | **Comando Spec Kit:** `/speckit-plan`
> **Equivale a:** `design.md` en la guía SDD
> **Autor:** Kleber Enrique Chávez Oscullo | **Rama:** `001-nucleo-sesion-segura` | **Fecha:** 2026-10-22 | **Estado:** ✅ Aprobado (puerta G2)
> **Entradas:** [`spec.md`](./02_Especificacion_speckit-specify.md) · [`constitution.md`](./01_Constitucion_speckit-constitution.md) · documento de arquitectura de la tesis (diagramas 1–10)

---

## 1. Resumen

Se construye el **esqueleto andante** (*walking skeleton*) de la arquitectura: el camino completo entre el navegador y un subgrafo de dominio, con la sesión basada en cookie en el `bff`, el segundo factor TOTP decidido en `auth-svc` y un token interno ES256 con `aud` validado por `admin-svc`. Con esto quedan probadas en código las decisiones D1–D6, D9 (ruta TOTP), D11 (bloqueos de contraseña) y D12, que son la base para la biometría (002) y los microfrontends (003).

## 2. Contexto técnico

| Aspecto | Decisión |
|---|---|
| Servicios de esta iteración | `edge-proxy`, `shell` (mínimo), `bff`, `session-store`, `auth-svc`, `auth-db`, `admin-svc`, `admin-db` |
| `bff` / `admin-svc` | NestJS (TypeScript), `jose` para JOSE/JWKS, `ioredis` |
| `auth-svc` | FastAPI (Python 3.12), SQLAlchemy 2, `argon2-cffi`, `pyotp`, `PyJWT[crypto]`, `cryptography` (AES-GCM para el secreto TOTP) |
| Almacenes | Redis (sesiones) y PostgreSQL (`auth-db`, `admin-db`) |
| Proxy | Caddy (TLS interno en laboratorio, HSTS y cabeceras) |
| Pruebas | Jest + Supertest (NestJS), pytest + httpx (FastAPI), Playwright (e2e de 2 pestañas) |
| Despliegue | Docker Compose v2 con redes `internal` y Docker secrets |
| Restricciones | Ningún token en el navegador, ningún puerto publicado salvo 443/80, fallo cerrado |

## 3. Verificación de la Constitución

| Principio | ¿Lo cumple? | Cómo |
|---|---|---|
| I. Spec como fuente de verdad | ✅ | Cada componente y ADR cita FR/NFR y D/# |
| II. Ningún token en el navegador | ✅ | Solo `__Host-presid` y `__Host-sid`; `/bff/session` no devuelve JWT (§6) |
| III. Mismo origen | ✅ | Caddy enruta `/`, `/bff/*` y `/graphql` en un solo dominio; sin CORS |
| IV. Zero Trust declarado | ✅ | Token ES256 por `aud` (§7); redes internas (§10); mTLS fuera de alcance |
| V. 2.º factor en el servidor | ✅ | La transición `PENDIENTE_TOTP → ACTIVA` solo ocurre en el `bff` tras la respuesta de `auth-svc` |
| VI. Datos biométricos | N/A | No hay biometría en esta iteración (spec 002) |
| VII. BD por servicio | ✅ | `auth-db` y `admin-db` separadas, con usuarios distintos |
| VIII. Errores genéricos | ✅ | Respuesta uniforme y hash ficticio para correos inexistentes (ADR-05) |
| IX. Secretos | ✅ | Docker secrets y arranque fallido si falta uno (ADR-08) |
| X. Pruebas trazables | ✅ | Estrategia §11 |
| XI. Incrementos pequeños | ✅ | 34 tareas en `tasks.md` |

**Complexity Tracking**

| Dependencia | Justificación |
|---|---|
| `jose` (bff, admin-svc) | Implementación auditada de JWS/JWKS. Hacerlo a mano es un riesgo de seguridad. |
| `argon2-cffi`, `pyotp` | Algoritmos exigidos por D9 y RFC 6238. |
| `cryptography` | AES-256-GCM para cifrar el secreto TOTP en reposo (`factor_totp.secreto_cifrado`). |
| `ioredis` | Cliente oficial de Redis para Node. |

---

## 4. Contexto y contenedores (diagramas 1 y 2, recortados a la iteración 1)

```
 Z0 Internet / navegador          Z1 Borde (DMZ)        Z2 Aplicación (net-app, internal)      Z4 Datos (net-data, internal)
 ┌──────────────────────┐        ┌──────────────┐      ┌───────────────────────────────┐      ┌──────────────┐
 │ shell (mínimo)       │ HTTPS  │ edge-proxy   │ HTTP │ bff (NestJS)                  │      │              │
 │  authFetch + CSRF    │──443──►│ Caddy        │─────►│  sesión, CSRF, emisor ES256,  │─RESP─► session-store │
 │  BroadcastChannel    │ cookie │ TLS, HSTS,   │ +XRId│  JWKS interno, /graphql (B)   │      │  (Redis)     │
 └──────────────────────┘        │ CSP, rate    │      └──────┬──────────────┬─────────┘      │              │
                                 │ limit, 404   │             │ JWT aud=      │ JWT aud=       │              │
                                 │ /internal/*  │             │ auth-svc      │ admin-svc      │              │
                                 └──────────────┘      ┌──────▼──────┐ ┌─────▼──────────┐     │              │
                                                       │ auth-svc    │ │ admin-svc      │     │              │
                                                       │ FastAPI     │ │ NestJS subgrafo│     │              │
                                                       └──────┬──────┘ └─────┬──────────┘     │              │
                                                              └──── SQL ─────┴──── SQL ──────►│ auth-db      │
                                                                                              │ admin-db     │
                                                                                              └──────────────┘
```

| Contenedor | Zona | Responsabilidad en la iteración 1 | Requisitos |
|---|---|---|---|
| `shell` (mínimo) | Z0 | Formularios de contraseña y TOTP, `GET /bff/session`, una consulta GraphQL, logout. `authFetch` con `credentials:'include'` + `X-CSRF-Token`. Escucha y publica en `BroadcastChannel('auth')`. | FR-009, FR-018 |
| `edge-proxy` | Z1 | TLS, HSTS, CSP, `nosniff`, `Referrer-Policy`, `Permissions-Policy`; enrutamiento por prefijo; `X-Request-Id`; límite de cuerpo; rate limit en `/bff/auth/*`; **404 para `/internal/*`**. | FR-013, FR-022, FR-024, NFR-001, NFR-002 |
| `bff` | Z2 | Endpoints `/bff/auth/*`, `/bff/session` y `/graphql` (plan B → `admin-svc`); emisor ES256; `/internal/jwks.json`. | FR-003, FR-004, FR-007 a FR-013, FR-016, FR-017, FR-019 |
| `session-store` | Z2 | `presess:*`, `sess:*` y `user_sessions:*` con TTL. | FR-003, FR-019, FR-023 |
| `auth-svc` | Z2 | Argon2id, TOTP con anti-replay, roles, contadores de bloqueo, cambio de contraseña, intentos y auditoría. | FR-001, FR-002, FR-005, FR-006, FR-020, FR-021, FR-023, FR-024 |
| `admin-svc` | Z2 | Subgrafo GraphQL `me` y `panelAdmin`. Valida el token y autoriza por rol y propiedad. | FR-014, FR-015 |
| `auth-db`, `admin-db` | Z4 | PostgreSQL; un usuario por servicio. | NFR-007 |

**Componentes de la arquitectura que esta iteración no incluye:** `bio-svc`, `bio-db`, `mf-*` reales, Hive Gateway, `academico-svc`, `biblioteca-svc`, SMTP real (se usa un *stub* que registra el envío) y AWS Liveness.

---

## 5. Secuencia: login con contraseña + TOTP (variante TOTP del diagrama 3)

```
Usuario   shell      edge-proxy     bff              session-store    auth-svc            auth-db
  │ correo+pwd │          │           │                    │               │                   │
  │───────────►│ POST /bff/auth/password {email,password}  │               │                   │
  │            │─────────►│──XRId────►│ JWT aud=auth-svc ──────────────────►│ leer usuario,     │
  │            │          │           │                    │               │ hash, bloqueo ───►│
  │            │          │           │                    │               │ Argon2id verify   │
  │            │          │           │                    │               │ (o hash ficticio) │
  │            │          │           │                    │               │ registrar intento►│
  │            │          │           │◄── {user_ref, siguiente_factor:"TOTP"} ─────────────────│
  │            │          │           │ SET presess:{h} TTL 300 ──────────►│                   │
  │            │◄─────────│◄──────────│ Set-Cookie __Host-presid (Max-Age=300) — SIN TOKEN       │
  │ código TOTP│          │           │                    │               │                   │
  │───────────►│ POST /bff/auth/totp {code} + presid        │               │                   │
  │            │─────────►│──────────►│ GET presess ──────►│               │                   │
  │            │          │           │ JWT aud=auth-svc ──────────────────►│ RFC 6238 ±1,      │
  │            │          │           │                    │               │ UPDATE atómico    │
  │            │          │           │                    │               │ ultimo_paso_usado►│
  │            │          │           │◄── aserción {sub, roles, amr:[pwd,otp], auth_time} ─────│
  │            │          │           │ DEL presess; SET sess:{nuevo} (15 min / 8 h) ──►│       │
  │            │◄─────────│◄──────────│ Set-Cookie __Host-sid; __Host-presid=; Max-Age=0         │
  │            │ GET /bff/session ───►│──────────►│ → {perfil, roles, csrfToken}                 │
  │            │ BroadcastChannel: session:started │                                            │
```

**Alternativas (`alt`):** contraseña inválida, usuario inexistente o cuenta bloqueada → **401 genérico idéntico**. TOTP inválido → 401 y `fallos_totp++` en la sesión pendiente; al 5.º se borra la sesión pendiente. Sesión pendiente vencida → 401.

## 6. Secuencia: propagación de sesión (diagrama 4, con `admin-svc` como subgrafo)

1. `shell` → `POST /graphql` con la cookie `__Host-sid`, `X-CSRF-Token` y `Content-Type: application/json`.
2. `edge-proxy` agrega `X-Request-Id` y reenvía al `bff`.
3. El `bff` valida, **en orden**: método `POST` → `Content-Type` → `Origin` → sesión `ACTIVA` y no vencida (y renueva el TTL deslizante) → CSRF en tiempo constante.
4. El `bff` emite el JWT `{iss:"bff", sub, roles, aud:"admin-svc", typ:"at+jwt", iat, exp:+300, jti, kid}`.
5. El `bff` → `admin-svc` `POST /graphql` con `Authorization: Bearer` y `X-Request-Id`.
6. `admin-svc` valida con el JWKS en caché, autoriza por rol y propiedad, y responde.

| Condición | Respuesta |
|---|---|
| Sesión inexistente, vencida o revocada | **401** → el shell publica `session:ended` |
| CSRF inválido u `Origin` ajeno | **403**, sin llamar al subgrafo |
| El subgrafo rechaza el token | **502** genérico y auditoría; sin reintento |
| Rol o propiedad insuficiente | Error GraphQL `FORBIDDEN` |

## 7. Contrato del token interno

| Claim / cabecera | Valor | Lo valida el backend |
|---|---|---|
| `alg` (cabecera) | `ES256` (lista blanca) | ✅ rechaza `none`, `HS*`, `RS*` |
| `typ` (cabecera) | `at+jwt` | ✅ |
| `kid` (cabecera) | id de la clave activa | refresca el JWKS si es desconocido |
| `iss` | `bff` | ✅ |
| `aud` | `auth-svc` \| `admin-svc` (uno solo) | ✅ igual a su propio nombre |
| `sub` | UUID del usuario | autorización por propiedad |
| `roles` | p. ej. `["ESTUDIANTE"]` | autorización por rol |
| `iat`, `exp` | `exp − iat ≤ 300` | ✅ con tolerancia de reloj ≤ 30 s |
| `jti` | UUID | auditoría |

**Rotación:** el `bff` publica la clave nueva en el JWKS **antes** de firmar con ella. La clave anterior sigue publicada mientras viva el token más largo (5 min) más un margen.

## 8. Modelo de datos (subconjunto del diagrama 6)

**`auth-db` (dueño: `auth-svc`)**, entidades usadas en la iteración 1:

| Entidad | Uso en la iteración 1 | Req. |
|---|---|---|
| `usuario` (`id`, `email` CITEXT UNIQUE, `nombre_completo`, `estado` ACTIVO/SUSPENDIDO/BLOQUEADO) | Identidad y estado de la cuenta | FR-001, FR-020 |
| `credencial_password` (`hash` Argon2id, `cambiado_en`, `debe_cambiar`) | Primer factor y cambio de contraseña | FR-001, FR-023 |
| `factor_totp` (`secreto_cifrado`, `key_id`, `ultimo_paso_usado`) | TOTP con anti-replay; secreto cifrado con AES-256-GCM | FR-005, FR-006 |
| `rol`, `usuario_rol` | Roles para la aserción y el token | FR-007, FR-015 |
| `sesion` | Registro auditable de sesiones (el estado real vive en Redis) | FR-017 |
| `intento_autenticacion` (`factor` PASSWORD/TOTP, `resultado`, `ip`, `correlation_id`) | Bloqueos y auditoría | FR-020, FR-024 |
| `estado_bloqueo` (`fallos_password`, `bloqueado_hasta`) | Bloqueo de cuenta | FR-020 |
| `auditoria` (solo inserción) | Eventos con `correlation_id` | FR-024, FR-025 |

Se dejan para la spec 002: `consentimiento_biometrico`, los contadores de rostro de `estado_bloqueo` y todo `bio-db`. Se dejan para la spec 005: `permiso` y `rol_permiso`.

**`session-store` (Redis, dueño: `bff`)**

| Clave | Valor | TTL |
|---|---|---|
| `presess:{sha256(presid)}` | `{usuario_ref, siguiente_factor:"TOTP", fallos_totp, creada_en}` | 300 s |
| `sess:{sha256(sid)}` | `{usuario_id, roles, estado:"ACTIVA", amr, csrf_secret, creada_en, expira_absoluta}` | 900 s deslizante, con tope en `expira_absoluta` = 8 h |
| `user_sessions:{usuario_id}` | conjunto de `sha256(sid)` | para revocación masiva (FR-023) |

En Redis solo se guarda el **hash** del identificador de sesión: si se filtra el almacén, los valores no sirven como cookie.

**`admin-db` (dueño: `admin-svc`):** tabla de ejemplo `aviso_administrativo` (`id`, `autor_id`, `texto`, `creado_en`) para demostrar la autorización por rol y por propiedad.

## 9. Contratos de API

**Públicos (vía `edge-proxy`):**

| Método | Ruta | Cuerpo | Éxito | Errores | Req. |
|---|---|---|---|---|---|
| `POST` | `/bff/auth/password` | `{email, password}` | 200 `{siguiente_factor}` + `__Host-presid` | 401 genérico, 429 | FR-001 a FR-003 |
| `POST` | `/bff/auth/totp` | `{code}` | 200 + `__Host-sid` | 401 | FR-005 a FR-008, FR-021 |
| `GET` | `/bff/session` | — | 200 `{perfil, roles, csrfToken}` | 401 | FR-009 |
| `POST` | `/bff/auth/logout` | — (CSRF) | 204 | 401, 403 | FR-017 |
| `POST` | `/bff/auth/password/change` | `{actual, nueva}` (CSRF) | 204 | 400, 401, 403 | FR-023 |
| `POST` | `/graphql` | operación GraphQL (CSRF) | 200 | 401, 403, 502 | FR-010 a FR-016 |

**Internos (solo `net-app`):**

| Servicio | Ruta | Llamador | Credencial |
|---|---|---|---|
| `bff` | `GET /internal/jwks.json` | backends | — (red interna; 404 desde el borde) |
| `auth-svc` | `POST /auth/password`, `POST /auth/totp`, `POST /auth/password/change`, `POST /auth/sessions/revoked` | `bff` | JWT `aud=auth-svc` |
| `admin-svc` | `POST /graphql` | `bff` | JWT `aud=admin-svc` |

**Formato de error público:** `{ "error": "<mensaje genérico>", "requestId": "<X-Request-Id>" }`.

---

## 10. Despliegue (diagrama 10, recortado)

| Red Docker | `internal` | Miembros |
|---|---|---|
| `net-edge` | No | `edge-proxy`, `static-shell`, `bff` |
| `net-app` | **Sí** | `bff`, `session-store`, `auth-svc`, `admin-svc` |
| `net-data` | **Sí** | `auth-svc` + `auth-db`, `admin-svc` + `admin-db` |
| `net-egress` | No | `auth-svc` (SMTP; *stub* en la iteración 1) |

| Servicio | Puertos publicados | Secrets | Endurecimiento |
|---|---|---|---|
| `edge-proxy` | **443**, 80 → 443 | certificados | usuario no root, `read_only` |
| `bff` | — | `jwt_signing_key`, `redis_password` | arranque fallido si falta un secret |
| `session-store` | — | `redis_password` | `requirepass`, sin persistencia |
| `auth-svc` | — | `auth_db_password`, `totp_key` | `docs_url=None`, `DEBUG` off |
| `admin-svc` | — | `admin_db_password` | introspección off |
| `auth-db`, `admin-db` | — | contraseña | volúmenes `pg-auth` y `pg-admin` |

Las dependencias de arranque usan `depends_on: condition: service_healthy`, y todos los servicios tienen *healthchecks*.

---

## 11. Decisiones (ADR) y alternativas descartadas

| ADR | Decisión | Alternativas descartadas y por qué | Req. / Origen |
|---|---|---|---|
| ADR-01 | **Iniciar con la ruta TOTP** y dejar la biometría para la spec 002 | *Empezar por la biometría:* depende del go/no-go de S3 y bloquearía toda la arquitectura de sesión | D9, S3 |
| ADR-02 | **Plan B de D7:** el `bff` enruta `/graphql` a un endpoint por módulo (`admin-svc`) | *Hive Gateway ya en la iteración 1:* agrega una incógnita (S1) a la iteración base. La seguridad no depende del router | D7, S1 |
| ADR-03 | **Sesión pendiente separada** (`presess`) con su propia cookie `__Host-presid` | *Emitir `__Host-sid` con estado pendiente:* mezcla credenciales y facilita usar por error la pendiente como activa | FR-003, FR-004, #1 |
| ADR-04 | **Aserción propietaria** de `auth-svc` al `bff` por la red interna (provisional) | *OIDC estándar:* más interoperable pero más complejo; se decide antes de S2 (Q1) | Q1 |
| ADR-05 | **Hash Argon2id ficticio** cuando el correo no existe | *Responder antes:* el tiempo revelaría si la cuenta existe | FR-002, #13 |
| ADR-06 | **Hash del `sid`** como clave en Redis | *Guardar el `sid` en claro:* si se filtra Redis, se pueden secuestrar sesiones | FR-007 |
| ADR-07 | **Token sincronizador CSRF + verificación de `Origin` + exigir JSON** | *Solo `SameSite=Strict`:* no protege si hay subdominios comprometidos ni navegadores antiguos | FR-010, FR-011 |
| ADR-08 | **Docker secrets y arranque fallido** si falta un secret | *Variables de entorno con valor por defecto:* es exactamente el hallazgo #5 | NFR-004, #5 |
| ADR-09 | **ES256** con JWKS interno y `aud` único por servicio | *HS256 compartido:* cualquier backend podría falsificar tokens para otro. *Reenviar el token del usuario:* permite reutilización lateral | D5, FR-012 |
| ADR-10 | **401 HTTP** (no 200 + `UNAUTHENTICATED`) para sesión inválida en `/graphql` | Convención GraphQL de 200: el interceptor no detectaría el fin de sesión de forma uniforme | FR-011, diagrama 4 |
| ADR-11 | Secreto TOTP **cifrado con AES-256-GCM** (`key_id`) | *Guardarlo en claro:* una filtración de `auth-db` comprometería el segundo factor | FR-005, D12 |

## 12. Estrategia de pruebas

| Nivel | Servicio | Herramienta | Qué verifica |
|---|---|---|---|
| Unitarias | `auth-svc` | pytest | Argon2id, TOTP ±1 y anti-replay, contadores, respuesta uniforme |
| Unitarias | `bff` | Jest | Emisor ES256 (claims), CSRF en tiempo constante, máquina de estados de la sesión, TTL |
| Unitarias | `admin-svc` | Jest | Validación del token (alg, iss, aud, typ, exp, kid) y autorización |
| Integración | `bff` + Redis | Jest + Supertest + Redis de prueba | Flujo password → totp → session → graphql → logout |
| Integración | `auth-svc` + PostgreSQL | pytest + base temporal | Persistencia, bloqueo y cambio de contraseña |
| Seguridad (negativas) | todos | Jest/pytest | `alg=none`, HS256, `aud` ajeno, token vencido, CSRF ausente, `Origin` ajeno, pendiente usada como activa |
| E2E | topología completa | Playwright | 2 pestañas y `session:ended` (CA-13); ningún JWT en `document.cookie`, `localStorage` ni respuestas (SC-001) |
| Infraestructura | compose | script `nmap`/`ss` | Solo 443/80 publicados (CA-18); `/internal/*` da 404 (CA-19) |
| Rendimiento | `bff` | k6 / autocannon | NFR-008 (< 50 ms p95 de sobrecarga) |

Cada prueba se nombra con el ID del requisito, por ejemplo `test('[FR-014] rechaza token con aud=auth-svc')`.

## 13. Riesgos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Error al configurar `__Host-` (exige `Secure` y `Path=/`, sin `Domain`) | Las cookies no se guardan | Prueba e2e sobre HTTPS con el TLS interno de Caddy |
| Desfase de reloj entre servicios | Tokens rechazados | Tolerancia ≤ 30 s y NTP en el host |
| Rotación de la clave ES256 | Rechazos durante la rotación | Publicar antes de firmar y refrescar por `kid` (§7) |
| Redis caído | Pérdida de sesiones | Fallo cerrado (503); las sesiones son efímeras por diseño |
| Fuerza bruta distribuida | Bloqueo de cuentas legítimas (DoS) | Rate limit en el borde + bloqueo con desbloqueo por un administrador; se revisa Q3 |
| Incertidumbre de S1/S2 | Retrabajo en `/graphql` y el shell | El contrato `authFetch`/cookie no depende de esas decisiones |

## 14. Trazabilidad con los diagramas de la arquitectura

| Diagrama | Uso en esta iteración |
|---|---|
| 1. Contexto C4 | Actores y frontera; SMTP como *stub* |
| 2. Contenedores C4 | §4 (subconjunto Z0, Z1, Z2 y Z4) |
| 3. Secuencia del login biométrico | §5 (**variante TOTP**, pasos 1–9 y 24–28) |
| 4. Propagación de sesión | §6 (subgrafo `admin-svc` en lugar de biblioteca) |
| 5. DFD / STRIDE | Activos A1, A5, A6, A8 y A9; flujos F1–F6 y F11–F16 (ver la auditoría) |
| 6. Modelo de datos | §8 (subconjunto de `auth-db`, Redis y metadatos de firma) |
| 7. Enrolamiento biométrico | Fuera de alcance (spec 002) |
| 8. Ciclo de vida de la sesión | Estados ANÓNIMO, PENDIENTE_TOTP, ACTIVA, EXPIRADA, REVOCADA y CUENTA_BLOQUEADA |
| 9. Antes / después | Hallazgos #1, #5, #7, #8, #9, #11, #12, #13 y #14 cerrados por esta iteración |
| 10. Despliegue | §10 (subconjunto de redes y servicios) |

---

## ✅ Puerta G2 — Checklist antes de aprobar el diseño

- [X] Cubre todos los requisitos y cita sus IDs (§4, §9, §11).
- [X] Respeta la constitución (§3); el Principio VI no aplica en esta iteración.
- [X] Documenta las alternativas descartadas (§11: 11 ADR).
- [X] Incluye una estrategia de pruebas (§12).
- [X] Identifica riesgos de seguridad, rendimiento y despliegue (§13).

**Elaborado por:** Kleber Enrique Chávez Oscullo · **Aprobado por:** ____________________ (tutor), fecha: __________


---

# Tareas: Núcleo de Sesión Segura (Iteración 1)

> **Fase SDD:** 3 – Descomponer en tareas | **Comando Spec Kit:** `/speckit-tasks`
> **Autor:** Kleber Enrique Chávez Oscullo | **Rama:** `001-nucleo-sesion-segura` | **Fecha:** 2026-10-22 | **Estado:** ✅ Aprobado (puerta G3) · ⏳ Pendiente de implementación
> **Entradas:** [`spec.md`](./02_Especificacion_speckit-specify.md) · [`plan.md`](./03_Planificacion_speckit-plan.md)

**Formato:** `[ID] [P?] [Historia] Descripción → ruta` · *(requisitos)* · **Hecho cuando:** · **Depende de:**

- **[P]**: se puede hacer en paralelo (otro servicio u otros archivos, sin dependencias pendientes).
- Las pruebas se escriben **antes** del código (rojo → verde). Cada prueba lleva el ID del requisito en su nombre.
- **Un commit por tarea**, con su ID: `T014: emisor ES256 con aud por servicio`.
- `[ ]` = pendiente (esta entrega cubre la documentación; el código no se ha ejecutado).

---

## Fase 1: Preparación del monorepo

- [ ] **T001** Crear la estructura `services/{bff,auth-svc,admin-svc}`, `apps/shell`, `infra/edge-proxy`, `infra/secrets.example/` y `tests/e2e`.
  **Hecho cuando:** la estructura coincide con `plan.md` §4.
- [ ] **T002** [P] Inicializar `bff` y `admin-svc` (NestJS + TypeScript estricto + Jest), con versiones fijadas en el lockfile. *(Constitución IX)*
  **Hecho cuando:** `npm test` corre en ambos (0 pruebas). **Depende de:** T001
- [ ] **T003** [P] Inicializar `auth-svc` (FastAPI + pytest + `pyproject` con versiones fijadas), con `docs_url=None` cuando `ENV=production`. *(NFR-005)*
  **Hecho cuando:** `pytest` corre y `/docs` responde 404 en producción. **Depende de:** T001
- [ ] **T004** Crear `docker-compose.yml` con las redes `net-edge`, `net-app` (internal), `net-data` (internal) y `net-egress`, los secrets, los *healthchecks* y los servicios sin puertos salvo `edge-proxy`. *(NFR-003, NFR-004, D6)*
  **Hecho cuando:** `docker compose config` es válido y `docker compose ps` muestra solo 443/80 publicados. **Depende de:** T002, T003

## Fase 2: Fundamentos de seguridad (bloquean todas las historias)

- [ ] **T005** [P] Escribir pruebas del lector de secrets: si falta un secret, el servicio aborta el arranque (`bff`, `auth-svc`, `admin-svc`). *(NFR-004, #5)*
  **Hecho cuando:** las pruebas `[NFR-004]` existen y fallan.
- [ ] **T006** Implementar el lector de secrets (`/run/secrets/*`) sin valores por defecto en los tres servicios. *(NFR-004)*
  **Hecho cuando:** T005 está en verde. **Depende de:** T005
- [ ] **T007** [P] Modelo de `auth-db` con SQLAlchemy y migraciones: `usuario`, `credencial_password`, `factor_totp`, `rol`, `usuario_rol`, `sesion`, `intento_autenticacion`, `estado_bloqueo` y `auditoria`. *(plan §8)*
  **Hecho cuando:** la migración se aplica y se revierte sin errores en PostgreSQL. **Depende de:** T003
- [ ] **T008** [P] Pruebas del emisor de tokens del `bff`: ES256, `typ=at+jwt`, `aud` único, `exp − iat ≤ 300`, `jti` y `kid`. *(FR-012)*
  **Hecho cuando:** las pruebas `[FR-012]` existen y fallan.
- [ ] **T009** Implementar `TokenIssuer` (con `jose`) y el endpoint `GET /internal/jwks.json` con rotación por `kid`. *(FR-012, FR-013, ADR-09)*
  **Hecho cuando:** T008 está en verde y el JWKS publica la clave activa. **Depende de:** T006, T008
- [ ] **T010** [P] Pruebas de la librería de validación de tokens para los backends: `alg=none`, HS256, `aud` ajeno, `iss` ajeno, vencido, `kid` desconocido → refresco. *(FR-014)*
  **Hecho cuando:** las pruebas `[FR-014]` existen y fallan (en TypeScript para `admin-svc` y en Python para `auth-svc`).
- [ ] **T011** Implementar el validador de tokens en `admin-svc` (guard de NestJS) y en `auth-svc` (dependencia de FastAPI), con fallo cerrado. *(FR-014)*
  **Hecho cuando:** T010 está en verde en ambos lenguajes. **Depende de:** T009, T010
- [ ] **T012** [P] `SessionStore` del `bff` sobre Redis: claves con hash SHA-256 del id, `presess`, `sess` y `user_sessions`, TTL deslizante con tope absoluto, más sus pruebas. *(FR-003, FR-019, ADR-06)*
  **Hecho cuando:** las pruebas `[FR-019]` de TTL (15 min / 8 h) están en verde con un reloj simulado. **Depende de:** T002
- [ ] **T013** Configurar `edge-proxy` (Caddyfile): TLS interno, HSTS, CSP, `nosniff`, `Referrer-Policy`, `Permissions-Policy: camera=(self)`, `X-Request-Id`, límite de cuerpo, enrutamiento `/`, `/bff/*` y `/graphql`, y `respond /internal/* 404`. *(NFR-001, NFR-002, FR-013, FR-024)*
  **Hecho cuando:** `curl -I https://localhost` muestra las cabeceras y `/internal/jwks.json` da 404. **Depende de:** T004

**Checkpoint G4-a:** los fundamentos fueron revisados (secrets, tokens, sesión y borde).

## Fase 3: US1 – Primer factor (P1) 🎯

- [ ] **T014** [P] [US1] Pruebas de `auth-svc` `POST /auth/password`: Argon2id correcto, incorrecto, usuario inexistente (hash ficticio) y cuenta bloqueada, con **respuestas idénticas**. *(FR-001, FR-002)*
  **Hecho cuando:** las pruebas cubren CA-01 y CA-02 (incluido el tiempo: diferencia < 50 ms).
- [ ] **T015** [US1] Implementar `/auth/password` en `auth-svc`: registro de `intento_autenticacion` y respuesta `{user_ref, siguiente_factor:"TOTP"}`. *(FR-001, FR-002, ADR-05)*
  **Hecho cuando:** T014 está en verde. **Depende de:** T007, T011, T014
- [ ] **T016** [US1] Implementar `bff` `POST /bff/auth/password`: llama a `auth-svc` con `aud=auth-svc`, crea `presess` (300 s) y entrega `__Host-presid` (HttpOnly, Secure, SameSite=Strict, Path=/, Max-Age=300) **sin ningún token**. *(FR-003, ADR-03)*
  **Hecho cuando:** una prueba de integración verifica las cookies y que el cuerpo no contiene un JWT (CA-01). **Depende de:** T009, T012, T015
- [ ] **T017** [US1] Guard del `bff` que rechaza con 401 una sesión pendiente en `/graphql` y `/bff/session`. *(FR-004)*
  **Hecho cuando:** la prueba `[FR-004]` cubre CA-03. **Depende de:** T016

## Fase 4: US2 – Segundo factor TOTP (P1) 🎯

- [ ] **T018** [P] [US2] Pruebas de `auth-svc` `POST /auth/totp`: ventana ±1, anti-replay (`ultimo_paso_usado` atómico) y secreto descifrado con AES-GCM. *(FR-005, FR-006, ADR-11)*
  **Hecho cuando:** las pruebas cubren CA-05, incluido el caso de dos peticiones simultáneas con el mismo código.
- [ ] **T019** [US2] Implementar `/auth/totp` en `auth-svc`, que devuelve la aserción `{sub, roles, amr:["pwd","otp"], auth_time}`. *(FR-005, FR-006, ADR-04)*
  **Hecho cuando:** T018 está en verde. **Depende de:** T015, T018
- [ ] **T020** [US2] Implementar `bff` `POST /bff/auth/totp`: valida la `presess`, cuenta los fallos (al 5.º la elimina), **regenera el id**, crea `sess` con `csrf_secret` y emite `__Host-sid` mientras expira `__Host-presid`. *(FR-007, FR-008, FR-021)*
  **Hecho cuando:** las pruebas cubren CA-04, CA-06 y CA-15. **Depende de:** T017, T019
- [ ] **T021** [US2] Implementar `bff` `GET /bff/session` → `{perfil, roles, csrfToken}`. *(FR-009)*
  **Hecho cuando:** la prueba `[FR-009]` comprueba que no hay un JWT en el cuerpo (CA-07). **Depende de:** T020

## Fase 5: US3 – Propagación de sesión (P1) 🎯

- [ ] **T022** [P] [US3] Pruebas de `bff` `/graphql`: método, `Content-Type`, `Origin`, sesión y CSRF en orden; 401 frente a 403; el subgrafo no recibe la llamada si algo falla. *(FR-010, FR-011)*
  **Hecho cuando:** cubren CA-08.
- [ ] **T023** [US3] Implementar el pipeline de `/graphql` en el `bff` (plan B: proxy a `admin-svc`) con el token `aud=admin-svc` y `X-Request-Id`; 502 genérico si el subgrafo rechaza el token. *(FR-010 a FR-012, FR-016, ADR-02, ADR-07, ADR-10)*
  **Hecho cuando:** T022 está en verde y las pruebas verifican los claims recibidos por un subgrafo simulado (CA-09) y el 502 sin reintento (CA-22). **Depende de:** T009, T021, T022
- [ ] **T024** [US3] Implementar `admin-svc`: schema `me` y `panelAdmin`, y el *resolver* de `aviso_administrativo` con autorización por rol y propiedad (`FORBIDDEN`); introspección desactivada en producción. *(FR-015, NFR-005)*
  **Hecho cuando:** las pruebas cubren CA-10, CA-11 y CA-12. **Depende de:** T011

## Fase 6: US4 – Cierre de sesión y expiración (P2)

- [ ] **T025** [US4] Implementar `bff` `POST /bff/auth/logout` (con CSRF): borra `sess`, notifica `revocada_en`/`motivo_revocacion` a `auth-svc` y expira la cookie. *(FR-017)*
  **Hecho cuando:** después del logout, la cookie anterior recibe 401. **Depende de:** T023
- [ ] **T026** [P] [US4] Implementar el shell mínimo: `authFetch`, contrato `getCsrfToken()`, `BroadcastChannel('auth')` con `session:started` y `session:ended`, y redirección a `/sso` ante un 401. *(FR-018, D3, D4)*
  **Hecho cuando:** el e2e de 2 pestañas (CA-13) está en verde. **Depende de:** T021
- [ ] **T027** [US4] Verificar la expiración por inactividad y la absoluta de punta a punta (reloj simulado en la prueba de integración). *(FR-019)*
  **Hecho cuando:** CA-14 está en verde. **Depende de:** T012, T023

## Fase 7: US5 – Fuerza bruta (P2)

- [ ] **T028** [US5] Contadores de `fallos_password` y transición a `BLOQUEADO` al alcanzar el umbral de Q3; notificación por el *stub* de SMTP. *(FR-020)*
  **Hecho cuando:** la prueba `[FR-020]` cubre CA-20 (cuenta `BLOQUEADO` y respuesta genérica). **Depende de:** T015
- [ ] **T029** [P] [US5] Rate limiting por IP en `/bff/auth/*` dentro de `edge-proxy`. *(FR-022)*
  **Hecho cuando:** CA-21 está en verde (una ráfaga que supera el límite recibe 429). **Depende de:** T013

## Fase 8: US6 – Cambio de contraseña (P3)

- [ ] **T030** [US6] `auth-svc` `/auth/password/change` + `bff` `/bff/auth/password/change`: exige la contraseña actual, guarda un hash Argon2id nuevo y **revoca todas** las sesiones mediante `user_sessions:{id}`. *(FR-023, #7)*
  **Hecho cuando:** CA-16 está en verde. **Depende de:** T020, T025

## Fase 9: US7 – Auditoría (P3)

- [ ] **T031** [US7] Propagar `X-Request-Id` en los tres servicios, escribir la auditoría en `auditoria` e `intento_autenticacion`, y aplicar un filtro de logs que censura `password`, `code`, `cookie`, `authorization` y `token`. *(FR-024, FR-025, NFR-006)*
  **Hecho cuando:** la prueba `[FR-025]` captura los logs de un flujo completo, no encuentra datos sensibles y sí encuentra el `correlation_id` (CA-17). **Depende de:** T023, T030

## Fase 10: Validación y cierre

- [ ] **T032** [P] E2E con Playwright sobre `docker compose`: flujo completo; ningún JWT en `document.cookie`, `localStorage` ni respuestas (SC-001); 2 pestañas (CA-13).
  **Hecho cuando:** la suite e2e está en verde. **Depende de:** T026, T030
- [ ] **T033** [P] Verificación de infraestructura: escaneo de puertos (CA-18), `/internal/*` da 404 (CA-19) y medición de NFR-008 con autocannon.
  **Hecho cuando:** solo 443/80 están abiertos y p95 < 50 ms. **Depende de:** T013, T023
- [ ] **T034** Cobertura por servicio (Constitución X), reporte de implementación y auditoría de convergencia.
  **Hecho cuando:** se cumplen los umbrales y la auditoría indica CONVERGED (puerta G5). **Depende de:** T031, T032, T033

---

## Dependencias

```
T001 ─► T002 ─┬─► T012 ───────────────────────────────┐
      └► T003 ─┼─► T007 ─────┐                         │
               └─► T004 ─► T013 ─► T029                │
T005 ─► T006 ─► T009 ◄─ T008                           │
T010 ─────────► T011 ◄─ T009                           │
T014 ─► T015 ◄─ T007,T011 ─► T016 ◄─ T009,T012 ────────┘
                  │            └─► T017
T018 ─► T019 ◄────┘                 │
          └──────────────► T020 ◄───┘ ─► T021 ─┬─► T023 ◄─ T022 ─► T025 ─► T030 ─► T031
                                               └─► T026            T027        │
T011 ─► T024                                                                   ▼
                                                       T032, T033 ─────────► T034
```

## Matriz requisito → tarea

| Requisito | Tareas | Requisito | Tareas |
|---|---|---|---|
| FR-001, FR-002 | T014, T015 | FR-017 | T025 |
| FR-003 | T012, T016 | FR-018 | T026, T032 |
| FR-004 | T017 | FR-019 | T012, T027 |
| FR-005, FR-006 | T018, T019 | FR-020 | T028 |
| FR-007, FR-008 | T020 | FR-021 | T020 |
| FR-009 | T021 | FR-022 | T029 |
| FR-010, FR-011 | T022, T023 | FR-023 | T030 |
| FR-012 | T008, T009, T023 | FR-024, FR-025 | T031 |
| FR-013 | T009, T013, T033 | NFR-001, NFR-002 | T013 |
| FR-014 | T010, T011, T024 | NFR-003 | T004, T033 |
| FR-015 | T024 | NFR-004 | T005, T006 |
| FR-016 | T023 | NFR-005 | T003, T024 |
| | | NFR-006 | T031 |
| | | NFR-007 | T004, T007 |
| | | NFR-008 | T033 |
| | | NFR-009 | T034 |

## Resumen

| Fase | Tareas | Historias |
|---|---|---|
| 1. Preparación | 4 | — |
| 2. Fundamentos de seguridad | 9 | — |
| 3. Primer factor | 4 | US1 |
| 4. Segundo factor TOTP | 4 | US2 |
| 5. Propagación de sesión | 3 | US3 |
| 6. Cierre y expiración | 3 | US4 |
| 7. Fuerza bruta | 2 | US5 |
| 8. Cambio de contraseña | 1 | US6 |
| 9. Auditoría | 1 | US7 |
| 10. Validación y cierre | 3 | — |
| **Total** | **34** | **7 historias** |

---

## ✅ Puerta G3 — Checklist antes de aprobar las tareas

- [X] Cada tarea es pequeña y se revisa en minutos (un servicio y un concepto por tarea).
- [X] Cada tarea tiene su "Hecho cuando…".
- [X] Cada tarea referencia requisitos o un ADR.
- [X] Las dependencias están marcadas (grafo y "Depende de").
- [X] Todos los requisitos (25 FR y 9 NFR) están cubiertos por alguna tarea (matriz).

**Elaborado por:** Kleber Enrique Chávez Oscullo · **Aprobado por:** ____________________ (tutor), fecha: __________


---

# Implementación de la Iteración 1: Guía de Ejecución

> **Fase SDD:** 4 – Implementar | **Comando Spec Kit:** `/speckit-implement`
> **Autor:** Kleber Enrique Chávez Oscullo | **Rama:** `001-nucleo-sesion-segura` | **Fecha:** 2026-10-22
> **Entradas:** [`tasks.md`](./04_Tareas_speckit-tasks.md) · [`plan.md`](./03_Planificacion_speckit-plan.md) · [`spec.md`](./02_Especificacion_speckit-specify.md) · [`constitution.md`](./01_Constitucion_speckit-constitution.md) · [`AGENTS.md`](https://github.com/kechavez07/GestionSDD/blob/main/AGENTS.md)

> ⚠️ **Estado: PLANIFICADA, NO EJECUTADA.** Este documento define **cómo** se ejecuta la iteración 1 con un agente de IA bajo SDD: el orden, los prompts, los artefactos esperados y la verificación de cada tarea. En esta entrega **todavía no existe código**; la bitácora (§7) queda lista para registrar la ejecución.

---

## 1. Alcance de la iteración

| Se construye | Se deja para después |
|---|---|
| `edge-proxy` (Caddy), `shell` mínimo, `bff` (NestJS), `session-store` (Redis), `auth-svc` (FastAPI), `auth-db`, `admin-svc` (NestJS), `admin-db` | `bio-svc` y biometría (002), MFE reales (003), Hive Gateway y subgrafos académico/biblioteca (004), administración (005) |

**Resultado esperado:** un usuario inicia sesión con contraseña + TOTP, recibe solo una cookie opaca, consulta `admin-svc` a través del `bff` con un token interno ES256 `aud=admin-svc`, y cierra sesión en todas sus pestañas.

## 2. Reglas de ejecución (tomadas de la Constitución)

1. **Una tarea a la vez**, en el orden del grafo de `tasks.md`. Las tareas `[P]` pueden ir en paralelo en ramas distintas.
2. **Rojo → Verde → Refactor:** primero la prueba con el ID del requisito en su nombre, luego el código mínimo, luego la limpieza.
3. **Un commit por tarea:** `T0xx: <descripción>`.
4. Si algo **contradice la spec** o es ambiguo, el agente **se detiene y pregunta**. Si el comportamiento cambia, **se edita primero la spec** y se registra en §8.
5. Después de cada tarea: pruebas del servicio en verde, la tarea marcada `[X]` en `tasks.md` y una entrada en la bitácora (§7).

## 3. Prompt tipo para el agente

```text
Lee .specify/memory/constitution.md y specs/001-nucleo-sesion-segura/{spec,plan,tasks}.md.
Implementa SOLO la tarea T016 de tasks.md.
- Escribe primero las pruebas, nombradas con el ID del requisito (p. ej. "[FR-003] …").
- No modifiques archivos fuera de lo que T016 requiere.
- No emitas ningún token al navegador (Constitución II).
Al terminar: ejecuta las pruebas del servicio, marca T016 como [X] y haz commit "T016: …".
Si algo contradice la spec, detente y pregúntame.
```

## 4. Estructura de código esperada

```
plataforma-sso-sdd/
├── docker-compose.yml
├── infra/
│   ├── edge-proxy/Caddyfile
│   └── secrets.example/            # nombres de los secrets; nunca valores reales
├── apps/shell/                     # shell mínimo: authFetch + BroadcastChannel
├── services/
│   ├── bff/                        # NestJS
│   │   └── src/{auth,session,csrf,token,graphql-proxy,jwks,config}/
│   ├── auth-svc/                   # FastAPI
│   │   └── app/{routers,domain,security,db,audit}/
│   └── admin-svc/                  # NestJS (subgrafo)
│       └── src/{auth-guard,schema,resolvers,db}/
└── tests/e2e/                      # Playwright
```

## 5. Plan de ejecución por fase

| Fase | Tareas | Entregable verificable | Comando de verificación |
|---|---|---|---|
| 1. Preparación | T001–T004 | Monorepo y compose válido | `docker compose config` · `docker compose ps` |
| 2. Fundamentos | T005–T013 | Secrets obligatorios, emisor y validador ES256, SessionStore, Caddy | `npm test` (bff, admin-svc) · `pytest` (auth-svc) · `curl -I https://localhost` |
| 3. US1 | T014–T017 | Login con contraseña → sesión pendiente | `pytest -k FR-00` · `npm test -- -t "FR-003"` |
| 4. US2 | T018–T021 | TOTP → sesión activa, `/bff/session` | `npm test -- -t "FR-007"` |
| 5. US3 | T022–T024 | `/graphql` → `admin-svc` con un token validado | `npm test -- -t "FR-01"` |
| 6. US4 | T025–T027 | Logout y expiración; shell con `BroadcastChannel` | `npx playwright test logout` |
| 7. US5 | T028–T029 | Bloqueo de cuenta y rate limit | `pytest -k FR-020` · ráfaga → 429 |
| 8. US6 | T030 | Cambio de contraseña con revocación total | `npm test -- -t "FR-023"` |
| 9. US7 | T031 | Auditoría con `correlation_id` y logs censurados | `pytest -k FR-025` |
| 10. Cierre | T032–T034 | E2E, puertos, rendimiento, cobertura y auditoría | `npx playwright test` · `nmap -p- localhost` · `autocannon` |

## 6. Verificación por historia de usuario (demostración manual)

| Historia | Pasos de demostración | Resultado esperado |
|---|---|---|
| US1 | Iniciar sesión con contraseña en `https://localhost/sso` y revisar DevTools → Application | Solo existe la cookie `__Host-presid` (HttpOnly). No hay nada en `localStorage`. |
| US2 | Ingresar el código de la app autenticadora | `__Host-presid` desaparece y aparece `__Host-sid` con otro valor |
| US3 | Pulsar "Consultar panel" | Los datos se muestran. En los logs de `admin-svc` aparece `aud=admin-svc`; en el navegador no aparece ningún JWT. |
| US3 (negativo) | Repetir la petición con `curl` sin `X-CSRF-Token` | 403; `admin-svc` no registra ninguna llamada |
| US4 | Abrir 2 pestañas y cerrar sesión en una | La otra pestaña redirige a `/sso` |
| US5 | Fallar la contraseña hasta el umbral | La cuenta queda `BLOQUEADO`, la respuesta sigue siendo genérica y el *stub* de SMTP registra la notificación |
| US6 | Cambiar la contraseña con 2 sesiones abiertas | Ambas sesiones reciben 401 |
| US7 | Revisar los logs de un flujo completo | Hay `correlation_id` en los tres servicios; no aparecen la contraseña, el código, la cookie ni el token |

## 7. Bitácora de ejecución

| Tarea | Estado | Commit | Pruebas | Fecha | Notas |
|---|---|---|---|---|---|
| T001–T004 | ⏳ Pendiente | — | — | — | — |
| T005–T013 | ⏳ Pendiente | — | — | — | — |
| T014–T017 | ⏳ Pendiente | — | — | — | — |
| T018–T021 | ⏳ Pendiente | — | — | — | — |
| T022–T024 | ⏳ Pendiente | — | — | — | — |
| T025–T027 | ⏳ Pendiente | — | — | — | — |
| T028–T029 | ⏳ Pendiente | — | — | — | — |
| T030 | ⏳ Pendiente | — | — | — | — |
| T031 | ⏳ Pendiente | — | — | — | — |
| T032–T034 | ⏳ Pendiente | — | — | — | — |

## 8. Registro de cambios a la spec durante la implementación

| Fecha | Descubrimiento | Cambio en la spec o el plan | Tarea |
|---|---|---|---|
| — | *(sin entradas: la implementación no ha comenzado)* | — | — |

## 9. Prerrequisitos del entorno

| Herramienta | Versión | Uso |
|---|---|---|
| Docker Engine + Compose v2 | ≥ 24 / ≥ 2.20 | Topología completa |
| Node.js | 22 LTS | `bff`, `admin-svc`, `shell`, Playwright |
| Python | 3.12 | `auth-svc` |
| App autenticadora TOTP | cualquiera (RFC 6238) | Pruebas manuales de US2 |
| `nmap` o `ss`, `autocannon` | — | CA-18, NFR-008 |

## 10. Riesgos de ejecución

| Riesgo | Mitigación |
|---|---|
| Las cookies `__Host-` no funcionan sobre HTTP en local | Probar siempre a través de Caddy con TLS interno (`https://localhost`) |
| Diferencias entre la validación de JWT en TS y en Python | Un conjunto de **vectores de prueba compartidos** (tokens válidos e inválidos) en `tests/vectors/` que usan ambos lenguajes |
| La iteración crece más de lo previsto | Lo que no sea esencial (NFR-008, rate limit fino) se puede pasar a la iteración siguiente, registrándolo en §8 |

---

**Elaborado por:** Kleber Enrique Chávez Oscullo · **Revisión (puerta G4):** pendiente de ejecución


---

# Documento de Auditoría: Cobertura y Convergencia (Iteración 1)

> **Fase SDD:** 5 – Validar | **Comando Spec Kit:** `/speckit-converge` (auditoría de cobertura, *Speckit-coverage*)
> **Autor:** Kleber Enrique Chávez Oscullo | **Rama:** `001-nucleo-sesion-segura` | **Fecha de auditoría:** 2026-10-22
> **Auditado contra:** documento de arquitectura de la tesis (D1–D12, diagramas 1–10, hallazgos de LoginSWS #1–#16) · [`constitution.md`](./01_Constitucion_speckit-constitution.md) · [`spec.md`](./02_Especificacion_speckit-specify.md) · [`plan.md`](./03_Planificacion_speckit-plan.md) · [`tasks.md`](./04_Tareas_speckit-tasks.md) · [`implement.md`](./05_Implementacion_speckit-implement.md)

---

## 1. Dictamen

| Dimensión | Estado |
|---|---|
| **Especificación** (constitución → spec → plan → tareas) | ✅ **CONVERGED (documental)**: cobertura completa y consistente con la arquitectura, con 2 preguntas abiertas asignadas |
| **Implementación** (código → pruebas → cobertura) | ⏳ **NO INICIADA**: no hay código, así que no se puede medir la cobertura de código |
| **Estado global de la iteración** | 🟡 **NOT CONVERGED: pendiente de implementación (G4) y de validación (G5)** |

> Esta auditoría verifica la **cobertura de la especificación**: que cada decisión de arquitectura y cada hallazgo de LoginSWS en alcance tenga requisito, diseño, tarea y prueba planificada. La **cobertura de código** (líneas y ramas) y la ejecución de los criterios de aceptación se auditarán al terminar T034.

| Métrica documental | Resultado |
|---|---|
| Decisiones base D1–D12 con tratamiento definido | **12 / 12** (7 cubiertas, 3 parciales y 2 diferidas a la spec 002 con justificación) |
| Hallazgos de LoginSWS en alcance cerrados por requisitos | **9 / 9** (#1, #5, #7, #8, #9, #11, #12, #13 y #14), más 1 parcial (#16) |
| Requisitos con ID y formato EARS | **25 FR + 9 NFR** |
| Requisitos cubiertos por ≥ 1 tarea | **34 / 34** |
| Requisitos funcionales con ≥ 1 criterio de aceptación | **25 / 25** |
| Criterios de aceptación con tarea de prueba asignada | **22 / 22** |
| Diagramas de la arquitectura con tratamiento en el plan | **10 / 10** (8 usados y 2 diferidos) |
| Principios de la Constitución verificados en el plan | **10 / 10 aplicables** (VI no aplica) |
| Puertas de revisión | G0–G3 con checklist completo · G4–G5 pendientes |

---

## 2. Cobertura de las decisiones base de la arquitectura (D1–D12)

| ID | Decisión | Requisitos | Diseño | Tareas | Estado |
|---|---|---|---|---|---|
| D1 | BFF con cookie `__Host-sid`, ningún token en el navegador | FR-003, FR-007, FR-009 | plan §5, ADR-03 | T016, T020, T021, T032 | ✅ Cubierta |
| D2 | Mismo origen por rutas | Constitución III | plan §4, §9 | T013 | ✅ Cubierta *(ver AUD-03)* |
| D3 | `authFetch` / cliente GraphQL + `X-CSRF-Token` | FR-010, FR-011, FR-018 | plan §6, ADR-07 | T022, T023, T026 | ✅ Cubierta |
| D4 | Logout multipestaña con `BroadcastChannel` | FR-018 | plan §4 (shell) | T026, T032 | ✅ Cubierta |
| D5 | Token interno ES256, `aud` único, ≤ 5 min | FR-012, FR-014 | plan §7, ADR-09 | T008–T011, T023, T024 | ✅ Cubierta |
| D6 | Red interna; solo el proxy publica puertos; Zero Trust declarado | NFR-003 | plan §10 | T004, T033 | ✅ Cubierta (mTLS declarado fuera de alcance) |
| D7 | GraphQL en el BFF; plan B sin supergrafo | FR-010 a FR-016 | ADR-02 | T023 | 🟡 Parcial: plan B; el supergrafo depende de S1 (spec 004) |
| D8 | La imagen facial no viaja por GraphQL | — | — | — | ⏭️ Diferida (spec 002): no hay biometría en esta iteración |
| D9 | Segundo factor decidido en el servidor | FR-003 a FR-008 | plan §5, ADR-01 | T014–T021 | 🟡 Parcial: ruta TOTP completa; la ruta facial va en la spec 002 |
| D10 | Plantillas biométricas cifradas y LOPDP | — | — | — | ⏭️ Diferida (spec 002) |
| D11 | Límites de intentos | FR-020, FR-021 | plan §8 (`estado_bloqueo`) | T020, T028 | 🟡 Parcial: contraseña y TOTP; los contadores faciales (5 → 30 s, 50 → deshabilitar) van en la spec 002 |
| D12 | BD por servicio y auditoría con `correlation_id` | FR-024, FR-025, NFR-007 | plan §8, §10 | T007, T031 | ✅ Cubierta |

## 3. Cobertura de los hallazgos de Proyecto_LoginSWS (diagrama 9)

| Hallazgo | Severidad | Requisito que lo cierra | Tarea | Estado en la iteración 1 |
|---|---|---|---|---|
| #1 2FA solo en el cliente | Crítica | FR-003, FR-004, FR-007 | T016, T017, T020 | ✅ Cerrado para la ruta TOTP |
| #2 Fotos en GitHub | Crítica | — | — | ⏭️ Spec 002 |
| #3 Anti-spoofing incorrecto | Crítica | — | — | ⏭️ Spec 002 |
| #4 Liveness en el cliente | Crítica | — | — | ⏭️ Spec 002 |
| #5 Clave JWT por defecto | Crítica | NFR-004 | T005, T006 | ✅ Cerrado |
| #6 Enrolamiento sin autenticación | Alta | — | — | ⏭️ Spec 002 |
| #7 Cambio de contraseña sin la actual | Alta | FR-023 | T030 | ✅ Cerrado |
| #8 IDOR | Alta | FR-015 | T024 | ✅ Cerrado (en `admin-svc`; se replica en cada subgrafo) |
| #9 Sin rate limiting | Alta | FR-020, FR-021, FR-022 | T020, T028, T029 | ✅ Cerrado |
| #10 Oráculo de unicidad | Alta | — | — | ⏭️ Spec 002 |
| #11 HTTP plano | Media | NFR-001 | T013 | ✅ Cerrado |
| #12 JWT en `localStorage` | Media | FR-003, FR-009 | T016, T021, T032 | ✅ Cerrado |
| #13 Enumeración | Media | FR-002 | T014, T015 | ✅ Cerrado |
| #14 Fuga de detalles | Media | NFR-006 | T031 | ✅ Cerrado |
| #15 Path traversal | Baja | — | — | ⏭️ Spec 002 (sistema de archivos biométrico) |
| #16 Supply chain / Swagger | Baja | NFR-005, Constitución IX | T002, T003, T024 | 🟡 Parcial: Swagger e introspección off; SRI de MediaPipe en la spec 003 |

**Resumen:** de los 16 hallazgos, **9 se cierran**, **1 es parcial** y **6 se difieren** a la spec 002. Todos los diferidos son biométricos y dependen del spike S3, por lo que **ningún hallazgo queda sin destino**.

## 4. Trazabilidad requisito → criterio de aceptación → tarea de prueba

| Requisito | CA | Tarea de prueba | Requisito | CA | Tarea de prueba |
|---|---|---|---|---|---|
| FR-001 | CA-01 | T014 | FR-014 | CA-10, CA-11 | T010, T024 |
| FR-002 | CA-02 | T014 | FR-015 | CA-12 | T024 |
| FR-003 | CA-01 | T016 | FR-016 | CA-22 | T023 |
| FR-004 | CA-03 | T017 | FR-017 | CA-13 | T025 |
| FR-005 | CA-04 | T018 | FR-018 | CA-13 | T026, T032 |
| FR-006 | CA-05 | T018 | FR-019 | CA-14 | T012, T027 |
| FR-007 | CA-04 | T020 | FR-020 | CA-20 | T028 |
| FR-008 | CA-06 | T020 | FR-021 | CA-15 | T020 |
| FR-009 | CA-07 | T021 | FR-022 | CA-21 | T029 |
| FR-010 | CA-08 | T022 | FR-023 | CA-16 | T030 |
| FR-011 | CA-08 | T022 | FR-024 | CA-17 | T031 |
| FR-012 | CA-09 | T008, T023 | FR-025 | CA-17 | T031 |
| FR-013 | CA-19 | T009, T033 | | | |

| NFR | Verificación planificada | Tarea |
|---|---|---|
| NFR-001, NFR-002 | `curl -I` (cabeceras) | T013 |
| NFR-003 | Escaneo de puertos (CA-18) | T004, T033 |
| NFR-004 | Arranque sin secret → falla | T005, T006 |
| NFR-005 | `/docs` → 404; introspección deshabilitada | T003, T024 |
| NFR-006 | Captura de logs y respuestas de error | T031 |
| NFR-007 | Revisión de los `GRANT` por servicio | T004, T007 |
| NFR-008 | autocannon: p95 < 50 ms | T033 |
| NFR-009 | Reporte de cobertura por servicio | T034 |

## 5. Cobertura de los diagramas de la arquitectura

| Diagrama | Tratamiento | Dónde |
|---|---|---|
| 1. Contexto C4 | ✅ Usado (actores, frontera; SMTP como *stub*) | spec §1, plan §4 |
| 2. Contenedores C4 | ✅ Usado (subconjunto Z0/Z1/Z2/Z4) | plan §4 |
| 3. Login biométrico | ✅ Usado en su **variante TOTP** | plan §5 |
| 4. Propagación de sesión | ✅ Usado (con `admin-svc` como subgrafo) | plan §6 |
| 5. DFD / STRIDE | ✅ Usado (ver §6 de esta auditoría) | — |
| 6. Modelo de datos | ✅ Usado (subconjunto de `auth-db` y Redis) | plan §8 |
| 7. Enrolamiento biométrico | ⏭️ Diferido (spec 002) | — |
| 8. Ciclo de vida de la sesión | ✅ Usado (6 de 9 estados; los biométricos van en la spec 002) | spec FR-003, FR-004, FR-007, FR-019 |
| 9. Antes / después | ✅ Usado (§3 de esta auditoría) | — |
| 10. Despliegue | ✅ Usado (subconjunto de redes y servicios) | plan §10 |

## 6. Revisión STRIDE de los elementos en alcance (diagrama 5)

| Elemento / flujo | Amenaza | Control especificado | Req. | Residual |
|---|---|---|---|---|
| P3 `bff` | **S** robo de cookie | HttpOnly, Secure, SameSite=Strict, `__Host-`; hash del `sid` en Redis | FR-007, ADR-06 | XSS en el shell puede *usar* la sesión (no robarla) → CSP (NFR-002) |
| P3 `bff` | **T** CSRF | Token sincronizador + `Origin` + exigir JSON | FR-010, FR-011 | Bajo |
| P3 `bff` | **E** sesión pendiente usada como activa | Cookie y almacén separados; guard | FR-004, ADR-03 | Bajo |
| F5 `bff` → `auth-svc` | **I** intercepción interna | Red interna, `aud` único | NFR-003, FR-012 | **mTLS no cubierto** (declarado, REC-1) |
| A6 / P6 subgrafo | **S** reutilización lateral del token; **E** escalamiento | `aud` por servicio, ≤ 5 min, rol + propiedad | FR-012, FR-014, FR-015 | Bajo |
| P4 `auth-svc` | **D** fuerza bruta | Rate limit en el borde + contadores + bloqueo | FR-020 a FR-022 | DoS por bloqueo de cuentas legítimas (ver AUD-02) |
| P4 `auth-svc` | **I** enumeración | Respuesta uniforme + hash ficticio | FR-002, ADR-05 | Bajo |
| D6 secrets | **I** exposición de claves | Docker secrets; arranque fallido; rotación por `kid` | NFR-004, plan §7 | Bajo |
| D5 auditoría | **R** negación de acciones | `correlation_id`, tabla de solo inserción | FR-024 | Bajo |
| A9 secreto TOTP | **I** filtración de `auth-db` | AES-256-GCM con `key_id` | ADR-11 | Bajo |

## 7. Auditoría contra la Constitución

| Principio | Verificación documental | Resultado |
|---|---|---|
| I. Spec como fuente de verdad | Las tareas y ADR citan sus requisitos; las preguntas abiertas están registradas | ✅ |
| II. Ningún token en el navegador | FR-003, FR-009 y SC-001; prueba e2e T032 | ✅ |
| III. Mismo origen | Rutas en Caddy (T013) | ✅ *(AUD-03)* |
| IV. Zero Trust declarado | FR-012/FR-014 y NFR-003; mTLS declarado | ✅ |
| V. 2.º factor en el servidor | La transición a ACTIVA solo ocurre tras `auth-svc` (FR-007) | ✅ (ruta TOTP) |
| VI. Datos biométricos | — | N/A (spec 002) |
| VII. BD por servicio y auditoría | NFR-007, FR-024, FR-025 | ✅ |
| VIII. Errores genéricos | FR-002, NFR-006 | ✅ |
| IX. Secretos y supply chain | NFR-004, NFR-005, versiones fijadas (T002, T003) | ✅ |
| X. Pruebas trazables | Cada CA tiene su tarea de prueba; convención `[FR-xxx]` | ✅ (por ejecutar) |
| XI. Incrementos pequeños | 34 tareas, un commit por tarea | ✅ |

## 8. Revisión de antipatrones (guía SDD §12)

| Antipatrón | ¿Presente? | Evidencia |
|---|---|---|
| Deriva de la spec (*spec drift*) | ❌ No aplica todavía | No hay código; el registro de cambios está preparado (`implement.md` §8) |
| Sobre-especificación | ⚠️ Riesgo moderado | 34 tareas para un esqueleto; se justifica por ser la base de seguridad de toda la tesis |
| Spec que es código disfrazado | ❌ No | `spec.md` describe comportamiento; nombres de clases y librerías solo en `plan.md` |
| Aprobar sin leer | ⚠️ Pendiente | Las firmas del tutor en G1–G3 están en blanco y deben completarse antes de implementar |
| Falsa sensación de verificación | ❌ No | Se planifican e2e, escaneo de puertos y demostración manual (`implement.md` §6) |
| Waterfall encubierto | ❌ No | Solo se especifica la funcionalidad 001; 002–005 están en la hoja de ruta |
| Specs huérfanas | ❌ No | Una sola spec activa |

## 9. Hallazgos de la auditoría

| ID | Severidad | Descripción | Acción | Estado |
|---|---|---|---|---|
| AUD-01 | 🔴 Bloqueante para G5 | No hay implementación: no se pueden medir la cobertura de código ni la ejecución de los CA. | Ejecutar T001–T034 según `implement.md` | ⏳ Abierto |
| AUD-02 | 🟡 Menor | El umbral de bloqueo por contraseña (Q3) no está fijado en la arquitectura; un umbral bajo permite bloquear cuentas ajenas a propósito (DoS). | Que el tutor confirme el valor de 10; evaluar un desbloqueo temporal en lugar de manual | ⏳ Abierto (asignado) |
| AUD-03 | 🟡 Menor | La decisión D2 (mismo origen) no tiene un criterio de aceptación propio. | Agregar CA-23: "una petición con `Origin` de otro dominio a `/bff/*` no recibe cabeceras CORS" | ⏳ Abierto |
| AUD-04 | 🟡 Menor | Q1 (OIDC o aserción propietaria) sigue abierta; ADR-04 es provisional. | Decidir antes de S2; si se elige OIDC, enmendar el plan | ⏳ Abierto (asignado) |
| AUD-05 | 🟢 Observación | NFR-008 (< 50 ms p95) es una meta propuesta, sin línea base. | Medir una línea base en T033 y ajustar el valor si hace falta | Aceptado |
| AUD-06 | 🟢 Observación | SMTP es un *stub* en esta iteración: la notificación de bloqueo no llega a un correo real. | Integrar SMTP real en la spec 005 | Aceptado |

**Hallazgos críticos en la especificación: 0.** El único bloqueante (AUD-01) corresponde a la fase de implementación, no a la calidad de los documentos.

## 10. Historial de convergencia

| Ciclo | Fecha | Resultado | Motivo |
|---|---|---|---|
| 1 | 2026-10-22 | 🟡 Especificación CONVERGED · implementación no iniciada | Cobertura documental completa; quedan abiertos AUD-01 a AUD-04 |
| 2 | — | *(pendiente)* | Tras T034: cobertura de código, CA ejecutados y cierre de AUD-01 |

---

## ✅ Puerta G5 — Checklist antes de cerrar la funcionalidad

- [ ] Todos los criterios de aceptación se verificaron **ejecutándolos**. *(Pendiente: AUD-01)*
- [X] La spec refleja el comportamiento esperado y es coherente con la arquitectura (§2–§5).
- [ ] Las pruebas tienen nombres trazados a requisitos. *(Planificado con la convención `[FR-xxx]`; pendiente de ejecución)*
- [ ] La spec y el código se revisaron en el mismo PR. *(Pendiente: no hay código)*

**Dictamen:** la iteración 1 **no puede cerrarse** hasta ejecutar la implementación. La especificación queda **aprobada para implementar**.

**Auditor / elaborado por:** Kleber Enrique Chávez Oscullo · **Revisión del tutor:** ____________________, fecha: __________
