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
