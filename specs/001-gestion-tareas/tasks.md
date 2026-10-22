# Tareas: Gestión de Tareas Académicas (Iteración 1)

> **Comando SDD:** `/speckit-tasks`
> **Entradas:** [`spec.md`](./spec.md), [`plan.md`](./plan.md)
> **Rama:** `001-gestion-tareas` | **Fecha:** 2026-10-21

**Formato:** `[ID] [P?] [Historia] Descripción → archivo`

- **[P]**: se puede ejecutar en paralelo (archivos distintos y sin dependencias pendientes).
- **[USx]**: historia de usuario a la que pertenece la tarea.
- Las pruebas se escriben **antes o junto** con la implementación (Constitución, Principio III).
- `[X]` = completada en la iteración 1 (ver evidencia en `implement-report.md`).

---

## Fase 1: Preparación (Setup)

- [X] **T001** Crear la estructura de carpetas según `plan.md` (`src/{domain,repository,services,http}`, `tests/`, `data/`).
- [X] **T002** Crear `package.json` con los scripts `start`, `test` y `coverage` (Node ≥ 20, sin dependencias) → `package.json`.
- [X] **T003** [P] Redactar la constitución → `.specify/memory/constitution.md`.

## Fase 2: Fundamentos (bloquean todas las historias)

- [X] **T004** [P] Pruebas del dominio: validación, fechas, valores por defecto y transiciones → `tests/domain.test.js`.
- [X] **T005** Implementar la entidad Tarea: constantes `STATUSES`/`PRIORITIES`, `ValidationError`, `validateTaskInput`, `isValidDate`, `createTask` y `canTransition` → `src/domain/task.js` *(FR-001..FR-003, FR-007)*.
- [X] **T006** [P] Implementar `TaskRepository` en memoria con copias defensivas → `src/repository/taskRepository.js`.
- [X] **T007** Implementar el esqueleto HTTP: enrutador, `send()`, `readJson()` con límite de 10 KB y mapeo de errores a códigos HTTP → `src/http/app.js` *(NFR-004)*.
- [X] **T008** Crear el punto de arranque con las variables de entorno `PORT` y `DATA_FILE` → `src/server.js`.

**Checkpoint:** los fundamentos están listos y las historias pueden comenzar.

---

## Fase 3: US1 – Registrar tarea (P1) 🎯 MVP

- [X] **T009** [P] [US1] Prueba de servicio: crear y recuperar una tarea → `tests/service.test.js`.
- [X] **T010** [P] [US1] Prueba de API: `POST /tasks` 201, 400 con detalles, JSON mal formado y cuerpo vacío → `tests/api.test.js`.
- [X] **T011** [US1] Implementar `TaskService.create()` → `src/services/taskService.js` *(FR-001..FR-004)*.
- [X] **T012** [US1] Ruta `POST /tasks` → `src/http/app.js`.

**Checkpoint:** US1 funciona y se puede probar de forma independiente.

## Fase 4: US2 – Consultar tareas (P1) 🎯 MVP

- [X] **T013** [P] [US2] Pruebas: orden por fecha y prioridad, filtros (sin distinguir mayúsculas) y filtros inválidos → `tests/service.test.js`.
- [X] **T014** [US2] Implementar `TaskService.list(filters)` y `TaskService.get(id)` con `NotFoundError` → `src/services/taskService.js` *(FR-005, FR-006, FR-011)*.
- [X] **T015** [US2] Rutas `GET /tasks` y `GET /tasks/:id` → `src/http/app.js`.

## Fase 5: US3 – Editar y cambiar estado (P2)

- [X] **T016** [P] [US3] Pruebas: edición parcial, edición inválida, transiciones válidas e inválidas (409) → `tests/service.test.js`, `tests/api.test.js`.
- [X] **T017** [US3] Implementar `TaskService.update()` (no permite cambiar `status`) → `src/services/taskService.js` *(FR-008)*.
- [X] **T018** [US3] Implementar `TaskService.changeStatus()` con `TransitionError` → `src/services/taskService.js` *(FR-007)*.
- [X] **T019** [US3] Rutas `PATCH /tasks/:id` y `PATCH /tasks/:id/status` → `src/http/app.js`.

## Fase 6: US4 – Eliminar tarea (P3)

- [X] **T020** [P] [US4] Pruebas: eliminar (204) y eliminar una tarea inexistente (404) → `tests/service.test.js`, `tests/api.test.js`.
- [X] **T021** [US4] Implementar `TaskService.remove()` y la ruta `DELETE /tasks/:id` *(FR-009)*.

## Fase 7: Persistencia y aspectos transversales

- [X] **T022** [US1–US4] Persistencia en JSON con escritura atómica y tolerancia a archivo vacío, más sus pruebas → `src/repository/taskRepository.js`, `tests/service.test.js` *(FR-010)*.
- [X] **T023** [P] Pruebas de seguridad: 413 por cuerpo grande, 500 sin filtrar detalles, cabecera `nosniff`, 404/405 → `tests/api.test.js` *(NFR-004)*.
- [X] **T024** Ejecutar `npm run coverage` y verificar los umbrales de la Constitución.
- [X] **T025** [P] Escribir `README.md` con instrucciones de uso.
- [X] **T026** Redactar el reporte de implementación y la auditoría de convergencia/cobertura.

---

## Dependencias y orden de ejecución

```
Fase 1 (Setup) ──► Fase 2 (Fundamentos) ──┬─► Fase 3 US1 ──► Fase 4 US2 ──┬─► Fase 5 US3
                                          │                               └─► Fase 6 US4
                                          └─────────────────────────────────► Fase 7
```

- T005 depende de T004 (prueba primero).
- T011–T021 dependen de T005, T006 y T007.
- US3 y US4 dependen de US1 (necesitan tareas creadas) y pueden avanzar en paralelo entre sí.
- T024 y T026 se ejecutan al final (convergencia).

## Resumen

| Fase | Tareas | Completadas |
|---|---|---|
| Setup | 3 | 3 |
| Fundamentos | 5 | 5 |
| US1 | 4 | 4 |
| US2 | 3 | 3 |
| US3 | 4 | 4 |
| US4 | 2 | 2 |
| Transversal | 5 | 5 |
| **Total** | **26** | **26 (100 %)** |
