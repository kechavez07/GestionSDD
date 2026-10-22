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
