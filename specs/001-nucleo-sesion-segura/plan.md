# Plan Técnico (Diseño): Núcleo de Sesión Segura

> **Fase SDD:** 2 – Diseñar / Planificar (cómo) | **Comando Spec Kit:** `/speckit-plan`
> **Equivale a:** `design.md` en la guía SDD
> **Autor:** Kleber Enrique Chávez Oscullo | **Rama:** `001-nucleo-sesion-segura` | **Fecha:** 2026-10-22 | **Estado:** ✅ Aprobado (puerta G2)
> **Entradas:** [`spec.md`](./spec.md) · [`constitution.md`](../../.specify/memory/constitution.md) · documento de arquitectura de la tesis (diagramas 1–10)

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
