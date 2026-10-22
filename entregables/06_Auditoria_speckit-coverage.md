# Documento de Auditoría – Validación, Cobertura y Convergencia (Iteración 1)

> **Fase SDD:** 5 – Validar | **Comando Spec Kit:** `/speckit-converge` (auditoría de cobertura, *Speckit-coverage*)
> **Rama:** `001-gestion-tareas` | **Fecha de auditoría:** 2026-10-22
> **Auditado contra:** [`constitution.md`](./01_Constitucion_speckit-constitution.md) · [`spec.md`](./02_Especificacion_speckit-specify.md) · [`plan.md`](./03_Planificacion_speckit-plan.md) · [`tasks.md`](./04_Tareas_speckit-tasks.md)

---

## 1. Dictamen

# ✅ ESTADO: CONVERGED

El resultado cumple **cada criterio de aceptación** de la especificación, el diseño técnico y los siete principios de la Constitución. No quedan hallazgos críticos ni mayores abiertos.

| Dimensión | Resultado |
|---|---|
| Cobertura de código (líneas / ramas / funciones) | **100 % / 100 % / 100 %** ✅ |
| Pruebas automatizadas | **36 / 36 pasan** ✅ |
| Requisitos funcionales con prueba trazable (ID en el nombre) | **12 / 12** ✅ |
| Requisitos no funcionales verificados | **5 / 5** ✅ |
| Criterios de aceptación (CA-01 a CA-15) verificados | **15 / 15** ✅ |
| Tareas completadas con su "Hecho cuando…" | **26 / 26** ✅ |
| Principios de la Constitución | **7 / 7** ✅ |
| Puertas de revisión (G0 a G5) | **6 / 6** ✅ |

---

## 2. Cobertura de código

`npm run coverage` (Node.js 22.23.2; incluye `src/**` y excluye `src/server.js`, que es solo el arranque):

```
# tests 36 | suites 8 | pass 36 | fail 0
# --------------------------------------------------------------------
# file                       | line % | branch % | funcs % | uncovered
# --------------------------------------------------------------------
#  domain/task.js            | 100.00 |   100.00 |  100.00 |
#  http/app.js               | 100.00 |   100.00 |  100.00 |
#  repository/taskRepository | 100.00 |   100.00 |  100.00 |
#  services/taskService.js   | 100.00 |   100.00 |  100.00 |
# --------------------------------------------------------------------
# all files                  | 100.00 |   100.00 |  100.00 |
```

| Métrica | Umbral (Constitución III) | Obtenido | Estado |
|---|---|---|---|
| Líneas | ≥ 90 % | 100 % | ✅ |
| Ramas | ≥ 85 % | 100 % | ✅ |
| Funciones | ≥ 90 % | 100 % | ✅ |

**Exclusión justificada:** `src/server.js` (16 líneas, solo `listen()`) se verificó con la validación manual (§5).

---

## 3. Trazabilidad requisito → diseño → tarea → código → prueba

| Req. | Diseño | Tareas | Código | Pruebas (nombre con el ID) | ✔ |
|---|---|---|---|---|---|
| FR-001 | Modelo §5 | T004, T005, T009, T011 | `validateTaskInput`, `isValidDate` | 7 pruebas `[FR-001]` | ✅ |
| FR-002 | Modelo §5 | T005, T009 | `createTask` | `[FR-002][FR-003] asigna id…`, `[FR-001][FR-002] US1…` | ✅ |
| FR-003 | Modelo §5 | T005 | `PRIORITIES` | `[FR-003] rechaza prioridad inválida`, `[FR-002][FR-003]…` | ✅ |
| FR-004 | ADR-04 | T007, T010, T011 | `ValidationError` → 400 | 7 pruebas `[FR-004]` | ✅ |
| FR-005 | ADR-07 | T013, T014 | `list()` + `PRIORITY_WEIGHT` | `[FR-005] US2: lista ordenada…` | ✅ |
| FR-006 | §6 | T013–T015 | `list(filters)` | `[FR-006] US2: filtra…`, `[FR-006][FR-004]…`, `[FR-006] 400 con filtro inválido` | ✅ |
| FR-007 | ADR-03 | T016, T018, T019 | `canTransition`, `changeStatus` | 4 pruebas `[FR-007]` | ✅ |
| FR-008 | ADR-03 | T016, T017 | `update()` | 4 pruebas `[FR-008]` | ✅ |
| FR-009 | §6 | T020, T021 | `remove()` | `[FR-009][FR-011] US4…` + flujo `[US1-US4]` | ✅ |
| FR-010 | ADR-02 | T022 | `persist()` / `load()` | `[FR-010] persiste y recarga…`, `[FR-010] tolera un archivo vacío` | ✅ |
| FR-011 | ADR-04 | T014, T020 | `NotFoundError` → 404 | `[FR-009][FR-011]…` + flujo `[US1-US4]` | ✅ |
| FR-012 | §6 | T007, T023 | enrutador → 404/405 | `[FR-012] 404 en rutas desconocidas y 405…` | ✅ |
| NFR-001 | §6 | T007 | `send()` UTF-8 | `[NFR-001][NFR-004] GET /health…` | ✅ |
| NFR-002 | ADR-07 | T024 | filtro/orden en memoria | `[NFR-002] lista 1 000 tareas…` → p95 < 200 ms ✅ | ✅ |
| NFR-003 | §8 | T025 | — | `npm run coverage` → 100 % | ✅ |
| NFR-004 | ADR-06 | T007, T023 | `readJson`, `errorResponse` | `[NFR-004] 413…`, `[NFR-004] 500…`, `[NFR-001][NFR-004]…` | ✅ |
| NFR-005 | ADR-01 | T002 | `package.json` sin `dependencies` | inspección | ✅ |

### Criterios de aceptación

| CA | Prueba que lo verifica | ✔ |
|---|---|---|
| CA-01 | `[FR-001][FR-002] US1: crea y recupera una tarea` · `[US1-US4] flujo completo` (201) | ✅ |
| CA-02 | `[FR-002][FR-003] asigna id, valores por defecto y timestamps` | ✅ |
| CA-03 | `[FR-001] exige title…` · `[FR-001] rechaza fechas inexistentes…` · `[FR-004] 400 con detalles…` | ✅ |
| CA-04 | `[FR-004] 400 con JSON mal formado` | ✅ |
| CA-05, CA-06 | `[FR-005] US2: lista ordenada por fecha de entrega y prioridad` | ✅ |
| CA-07 | `[FR-006] US2: filtra por estado, prioridad y materia…` | ✅ |
| CA-08 | `[FR-006] 400 con filtro inválido` | ✅ |
| CA-09 | `[FR-008] US3: edita campos y actualiza updatedAt` | ✅ |
| CA-10, CA-11 | `[FR-007] US3: cambia estado respetando transiciones` · `[FR-007] 409…` | ✅ |
| CA-12 | `[FR-008] no permite fijar status al crear/editar` | ✅ |
| CA-13 | `[US1-US4] flujo completo` (204) · `[FR-009][FR-011] US4…` | ✅ |
| CA-14 | `[FR-009][FR-011] US4: elimina tarea y luego no existe` | ✅ |
| CA-15 | `[FR-010] persiste y recarga tareas desde disco` + validación manual | ✅ |

---

## 4. Auditoría contra la Constitución

| Principio | Verificación | Resultado |
|---|---|---|
| I. La spec es la fuente de verdad | El *spec drift* detectado (404/405) se resolvió **editando la spec** (FR-012) | ✅ |
| II. Arquitectura por capas | `domain` solo importa `node:crypto`; no hay dependencias inversas; errores tipados | ✅ |
| III. Requisitos verificables | 36/36 pruebas llevan el ID en el nombre; cobertura del 100 % | ✅ |
| IV. Incrementos pequeños | 26 tareas atómicas con "Hecho cuando…" *(ver la observación AUD-05)* | ✅ con observación |
| V. Seguridad | Validación, 10 KB → 413, 500 genérico, `nosniff`, configuración por variables de entorno | ✅ |
| VI. Contratos | 7/7 rutas coinciden con `plan.md` §6; formato de error uniforme | ✅ |
| VII. Todo versionado | Specs y código en el mismo repositorio y en el mismo commit | ✅ |

---

## 5. Validación más allá de las pruebas

La guía advierte sobre la **falsa sensación de verificación** ("pasan los tests, así que funciona"). Por eso también se validó a mano:

| Validación | Resultado |
|---|---|
| Arranque real (`npm start`) | ✅ "TaskFlow API escuchando…" |
| Flujo real con `curl`: registrar una tarea | ✅ 201 con UUID, `pendiente` |
| Persistencia real en `data/tasks.json` | ✅ La tarea está en el archivo |
| Medición de rendimiento con 1 000 tareas (50 peticiones) | ✅ p50 = 15,1 ms · p95 = 17,9 ms · máx = 51,0 ms |

---

## 6. Revisión de antipatrones (guía SDD §12)

| Antipatrón | ¿Presente? | Evidencia |
|---|---|---|
| Deriva de la spec (*spec drift*) | ⚠️ Se detectó y se **corrigió** | Faltaba FR-012 en la spec; se agregó |
| Sobre-especificación | ❌ No | Las specs son proporcionales a 4 historias |
| Spec que es código disfrazado | ❌ No | `spec.md` no menciona tecnología; el *cómo* está en `plan.md` |
| Aprobar sin leer | ❌ No | Cada puerta tiene su checklist completada |
| Falsa sensación de verificación | ❌ No | Validación manual en §5 |
| Waterfall encubierto | ❌ No | Solo se especificó la funcionalidad 001; los usuarios van en la iteración 2 |
| Specs huérfanas | ❌ No | Una sola carpeta de spec, vigente |

---

## 7. Hallazgos

| ID | Severidad | Descripción | Estado |
|---|---|---|---|
| AUD-01 | 🔴 Mayor | Cuerpos > 10 KB cortaban la conexión en lugar de responder 413. | ✅ Corregido (ADR-06) |
| AUD-02 | 🟡 Menor | Rama muerta en `update()` (cobertura de ramas de 97,37 %). | ✅ Corregido |
| AUD-03 | 🟡 Menor | *Spec drift*: 404/405 implementados sin requisito. | ✅ Corregido (FR-012) |
| AUD-04 | 🟡 Menor | NFR-002 solo se verificaba a mano. | ✅ Corregido (prueba `[NFR-002]`, T024) |
| AUD-05 | 🟢 Observación | El código se subió en un solo commit, no en uno por tarea. | Aceptado; se exige en la iteración 2 |
| AUD-06 | 🟢 Observación | El JSON no soporta varios procesos escribiendo a la vez (riesgo de `plan.md` §9). | Aceptado; BD en la iteración 2 |

**Hallazgos críticos o mayores abiertos: 0**

## 8. Historial del ciclo de convergencia

| Ciclo | Resultado | Motivo |
|---|---|---|
| 1 | ❌ No converge | Prueba 413 en rojo; cobertura de ramas < 100 % |
| 2 | ✅ Converge (contra Spec Kit) | 35/35 pruebas, 100 % de cobertura |
| 3 | ❌ No converge (contra la guía SDD) | *Spec drift* (FR-012), NFR-002 no automatizado y pruebas sin ID |
| 4 | ✅ **CONVERGED** | 36/36 pruebas con ID, 100 % de cobertura, spec actualizada y puertas completas |

---

## ✅ Puerta G5 — Checklist antes de cerrar la funcionalidad

- [X] Todos los criterios de aceptación se verificaron (§3: 15/15).
- [X] La spec refleja el comportamiento final (FR-012 agregado y ADR-06 documentado).
- [X] Las pruebas tienen nombres trazados a requisitos (36/36).
- [X] La spec y el código se revisaron en el mismo commit.

**Aprobado por:** Product Owner + QA, 2026-10-22.

## 9. Recomendaciones para la iteración 2

1. Nueva spec `002-usuarios` (autenticación y multiusuario).
2. Migrar a SQLite o PostgreSQL, justificándolo en *Complexity Tracking*.
3. Un commit por tarea, con su ID.
4. Pipeline de CI (GitHub Actions) que ejecute `npm run coverage` y falle si baja del umbral.
