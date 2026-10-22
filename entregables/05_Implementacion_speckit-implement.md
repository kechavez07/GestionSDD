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
