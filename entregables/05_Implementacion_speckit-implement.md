# Reporte de Implementación – Iteración 1

> **Fase SDD:** 4 – Implementar | **Comando Spec Kit:** `/speckit-implement`
> **Rama:** `001-gestion-tareas` | **Fecha:** 2026-10-21 / 2026-10-22
> **Entradas:** [`tasks.md`](./04_Tareas_speckit-tasks.md) · [`plan.md`](./03_Planificacion_speckit-plan.md) · [`constitution.md`](./01_Constitucion_speckit-constitution.md) · [`AGENTS.md`](https://github.com/kechavez07/GestionSDD/blob/main/AGENTS.md)

---

## 1. Resumen

El agente ejecutó las **26 tareas** de `tasks.md` **una a la vez**, en el orden de dependencias (Preparación → Fundamentos → US1 → US2 → US3 → US4 → Persistencia, seguridad y validación), con el ciclo **Rojo → Verde → Refactor** que exige la Constitución.

| Métrica | Valor |
|---|---|
| Tareas completadas | 26 / 26 (100 %) |
| Código fuente (`src/`) | 5 archivos, 399 líneas |
| Pruebas (`tests/`) | 3 archivos, 352 líneas |
| Pruebas automatizadas | **36 pasan / 0 fallan** (8 suites) |
| Pruebas con el ID del requisito en el nombre | 36 / 36 |
| Dependencias externas | 0 |
| Endpoints | 7 (6 de negocio + `/health`) |

## 2. Cómo se le pidió el trabajo al agente

Cada tarea se pidió con el prompt de `AGENTS.md`, por ejemplo:

```text
Lee constitution.md, spec.md y plan.md de specs/001-gestion-tareas/.
Implementa SOLO la tarea T018 de tasks.md.
No modifiques otros archivos fuera de lo que T018 requiere.
Al terminar, ejecuta los tests y marca T018 como completada.
Si encuentras algo que contradice la spec, detente y pregúntame.
```

## 3. Archivos producidos (trazabilidad)

| Archivo | Capa | Tareas | Requisitos |
|---|---|---|---|
| `src/domain/task.js` | Dominio | T005 | FR-001, FR-002, FR-003, FR-004, FR-007, FR-008 |
| `src/repository/taskRepository.js` | Persistencia | T006, T022 | FR-010 |
| `src/services/taskService.js` | Servicios | T011, T014, T017, T018, T021 | FR-005 a FR-009, FR-011 |
| `src/http/app.js` | HTTP | T007, T012, T015, T019, T021 | FR-004, FR-012, NFR-001, NFR-004 |
| `src/server.js` | Arranque | T008 | Constitución V |
| `tests/domain.test.js` | Pruebas (14) | T004 | FR-001 a FR-004, FR-007, FR-008 |
| `tests/service.test.js` | Pruebas (11) | T009, T013, T016, T020, T022 | FR-001, FR-002, FR-004 a FR-011 |
| `tests/api.test.js` | Pruebas (11) | T010, T016, T020, T023, T024 | FR-004, FR-006, FR-007, FR-012, NFR-001, NFR-002, NFR-004 |
| `AGENTS.md`, `CLAUDE.md` | Instrucciones | T003 | Constitución §5 |

## 4. Bitácora por fase

| Fase | Resultado | Notas |
|---|---|---|
| 1. Preparación | ✅ | Estructura, `package.json` y constitución |
| 2. Fundamentos | ✅ | `isValidDate` rechaza fechas que no existen (`2026-02-30`). El repositorio devuelve copias (ADR-05). |
| 3. US1 Registrar | ✅ | 201 con UUID, `pendiente` y `media` por defecto. Los datos inválidos dan 400 con `details[]`. |
| 4. US2 Consultar | ✅ | Orden por `dueDate` y luego por el peso de la prioridad. Filtro de materia sin distinguir mayúsculas. |
| 5. US3 Editar/estado | ✅ | Endpoint de estado separado (ADR-03). Salir de `completada` da 409. |
| 6. US4 Eliminar | ✅ | 204, o 404 si la tarea no existe. |
| 7. Persistencia, seguridad y validación | ✅ | JSON atómico, 413, 500 genérico, rendimiento y smoke test. |

## 5. Verificación iterativa: lo que se descubrió al implementar

La guía SDD dice: *"si se descubrió algo nuevo durante la implementación → **se actualiza la spec**, no solo el código"*. Así se aplicó:

| # | Descubrimiento | Detectado por | Cambio en el código | Cambio en la spec/plan |
|---|---|---|---|---|
| 1 | Con un cuerpo > 10 KB, `req.destroy()` cortaba la conexión y el cliente veía *"fetch failed"* en lugar de 413. | Prueba `[NFR-004] 413…` en **rojo** | Se descarta el resto del cuerpo y se responde 413 | Se agregó **ADR-06** en `plan.md` |
| 2 | Había una rama muerta en `update()` (`typeof … === 'string'`), con cobertura de ramas de 97,37 %. | `npm run coverage` | Se simplificó a `.trim()` | — (refactor sin cambio de comportamiento) |
| 3 | Las respuestas 404/405 a rutas y métodos desconocidos estaban implementadas pero **no especificadas** (*spec drift*). | Revisión de trazabilidad | — | Se agregó **FR-012** a `spec.md` |
| 4 | NFR-002 (rendimiento) solo se había medido a mano. | Revisión contra la guía (requisitos verificables) | Se agregó la prueba automatizada `[NFR-002]` | Se agregó la tarea **T024** |
| 5 | El script `node --test tests/` falla en Node 22, que espera un archivo y no una carpeta. | Primera ejecución | Se cambió al patrón `"tests/**/*.test.js"` | — |

## 6. Evidencia

### Pruebas

```
$ npm test
# tests 36
# suites 8
# pass 36
# fail 0
```

Extracto con la trazabilidad en los nombres:

```
ok - [FR-005] US2: lista ordenada por fecha de entrega y prioridad
ok - [FR-007] 409 ante transición de estado no permitida
ok - [FR-010] persiste y recarga tareas desde disco
ok - [NFR-002] lista 1 000 tareas filtradas en < 200 ms (p95)
ok - [NFR-004] 500 genérico sin filtrar detalles internos
```

### Validación manual del servidor real

```
$ PORT=3917 node src/server.js
TaskFlow API escuchando en http://localhost:3917

$ curl -X POST localhost:3917/tasks -H "Content-Type: application/json" \
    -d '{"title":"Entregar SDD","subject":"Gestión","dueDate":"2026-10-28","priority":"alta"}'
{"id":"6d91c2c2-3658-4421-8884-0f01ccc878b0","title":"Entregar SDD","description":"",
 "subject":"Gestión","dueDate":"2026-10-28","priority":"alta","status":"pendiente",
 "createdAt":"2026-10-22T04:30:31.177Z","updatedAt":"2026-10-22T04:30:31.177Z"}
```

Se comprobó que `data/tasks.json` contenía la tarea (FR-010, CA-15).

## 7. Desviaciones del proceso (honestidad del registro)

- El código de la iteración se subió al repositorio en **un commit inicial**, y no en un commit por tarea como recomienda la guía. Para la iteración 2 se exigirá un commit por tarea que cite su ID (por ejemplo `T018: changeStatus con TransitionError`).

## 8. Cómo reproducir

```bash
npm test
npm run coverage
npm start
```
