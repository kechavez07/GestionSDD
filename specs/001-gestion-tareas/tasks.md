# Tareas: Gestión de Tareas Académicas (Iteración 1)

> **Fase SDD:** 3 – Descomponer en tareas | **Comando Spec Kit:** `/speckit-tasks`
> **Entradas:** [`spec.md`](./spec.md) · [`plan.md`](./plan.md)
> **Rama:** `001-gestion-tareas` | **Fecha:** 2026-10-21 | **Estado:** ✅ Aprobado (puerta G3) y completado

**Formato:** `[ID] [P?] [Historia] Descripción → archivo` · *(requisitos)* · **Hecho cuando:** criterio verificable · **Depende de:**

- **[P]**: se puede hacer en paralelo (archivos distintos y sin dependencias pendientes).
- Se implementa **una tarea a la vez**, con pruebas y revisión entre tareas (Constitución IV).

---

## Fase 1: Preparación

- [X] **T001** Crear la estructura de carpetas de `plan.md` §4.
  **Hecho cuando:** existen `src/{domain,repository,services,http}`, `tests/` y `data/`.
- [X] **T002** Crear `package.json` con los scripts `start`, `test` y `coverage`, sin dependencias. *(NFR-005)*
  **Hecho cuando:** `npm test` se ejecuta (aunque todavía no haya pruebas). **Depende de:** T001
- [X] **T003** [P] Redactar la constitución y `AGENTS.md`/`CLAUDE.md`.
  **Hecho cuando:** pasaron la puerta G0.

## Fase 2: Fundamentos (bloquean todas las historias)

- [X] **T004** [P] Escribir las pruebas de dominio: validación, fechas, valores por defecto y transiciones → `tests/domain.test.js`. *(FR-001 a FR-004, FR-007, FR-008)*
  **Hecho cuando:** las pruebas existen y fallan (rojo).
- [X] **T005** Implementar la entidad Tarea → `src/domain/task.js`. *(FR-001, FR-002, FR-003, FR-007)*
  **Hecho cuando:** pasan las 14 pruebas de T004. **Depende de:** T004
- [X] **T006** [P] Implementar `TaskRepository` en memoria con copias defensivas → `src/repository/taskRepository.js`. *(ADR-05)*
  **Hecho cuando:** los objetos devueltos no alteran el estado interno.
- [X] **T007** Implementar el esqueleto HTTP: enrutador, `readJson` con límite de 10 KB y mapeo de errores → `src/http/app.js`. *(FR-004, FR-012, NFR-001, NFR-004)*
  **Hecho cuando:** `GET /health` responde 200 con `nosniff`.
- [X] **T008** Crear el punto de arranque con `PORT` y `DATA_FILE` → `src/server.js`.
  **Hecho cuando:** `npm start` muestra "TaskFlow API escuchando…". **Depende de:** T006, T007

**Checkpoint G4-a:** los fundamentos fueron revisados y las historias pueden comenzar.

## Fase 3: US1 – Registrar tarea (P1) 🎯 MVP

- [X] **T009** [P] [US1] Prueba de servicio para crear y recuperar → `tests/service.test.js`. *(FR-001, FR-002)*
  **Hecho cuando:** la prueba existe y falla (rojo).
- [X] **T010** [P] [US1] Pruebas de API para `POST /tasks`: 201, 400 con detalles, JSON mal formado y cuerpo vacío → `tests/api.test.js`. *(FR-004)*
  **Hecho cuando:** las pruebas cubren CA-01 a CA-04.
- [X] **T011** [US1] Implementar `TaskService.create()`. *(FR-001 a FR-004)*
  **Hecho cuando:** T009 está en verde. **Depende de:** T005, T006
- [X] **T012** [US1] Agregar la ruta `POST /tasks`.
  **Hecho cuando:** T010 está en verde. **Depende de:** T007, T011

## Fase 4: US2 – Consultar (P1) 🎯 MVP

- [X] **T013** [P] [US2] Pruebas de orden por fecha y prioridad, filtros sin distinguir mayúsculas y filtros inválidos. *(FR-005, FR-006)*
  **Hecho cuando:** cubren CA-05 a CA-08.
- [X] **T014** [US2] Implementar `list(filters)` y `get(id)` con `NotFoundError`. *(FR-005, FR-006, FR-011)*
  **Hecho cuando:** T013 está en verde. **Depende de:** T011
- [X] **T015** [US2] Agregar las rutas `GET /tasks` y `GET /tasks/:id`.
  **Hecho cuando:** las pruebas de API de listado y 404 están en verde. **Depende de:** T014

## Fase 5: US3 – Editar y cambiar estado (P2)

- [X] **T016** [P] [US3] Pruebas de edición parcial, edición inválida y transiciones (incluido el 409). *(FR-007, FR-008)*
  **Hecho cuando:** cubren CA-09 a CA-12.
- [X] **T017** [US3] Implementar `update()`, que no permite cambiar `status`. *(FR-008)*
  **Hecho cuando:** las pruebas de edición están en verde. **Depende de:** T014
- [X] **T018** [US3] Implementar `changeStatus()` con `TransitionError`. *(FR-007)*
  **Hecho cuando:** la prueba del 409 está en verde. **Depende de:** T014
- [X] **T019** [US3] Agregar las rutas `PATCH /tasks/:id` y `PATCH /tasks/:id/status`.
  **Hecho cuando:** el flujo de API de edición y estado está en verde. **Depende de:** T017, T018

## Fase 6: US4 – Eliminar (P3)

- [X] **T020** [P] [US4] Pruebas de eliminar (204) y de eliminar una tarea inexistente (404). *(FR-009, FR-011)*
  **Hecho cuando:** cubren CA-13 y CA-14.
- [X] **T021** [US4] Implementar `remove()` y la ruta `DELETE /tasks/:id`. *(FR-009)*
  **Hecho cuando:** T020 está en verde. **Depende de:** T014

## Fase 7: Persistencia, seguridad y validación

- [X] **T022** Persistencia JSON atómica que tolera un archivo vacío, más sus pruebas. *(FR-010, ADR-02)*
  **Hecho cuando:** los datos sobreviven a una nueva instancia del repositorio (CA-15).
- [X] **T023** [P] Pruebas de seguridad y errores generales: 413, 500 genérico, `nosniff`, 404/405. *(NFR-004, FR-012)*
  **Hecho cuando:** las pruebas están en verde y ningún 500 expone detalles.
- [X] **T024** [P] Prueba automatizada de rendimiento con 1 000 tareas. *(NFR-002)*
  **Hecho cuando:** p95 < 200 ms.
- [X] **T025** Ejecutar `npm run coverage` y verificar los umbrales. *(NFR-003)*
  **Hecho cuando:** líneas ≥ 90 %, ramas ≥ 85 % y funciones ≥ 90 %.
- [X] **T026** Validación manual (smoke test), README, reporte de implementación y auditoría.
  **Hecho cuando:** la checklist de cierre está completa y el estado es CONVERGED (puerta G5).

---

## Dependencias

```
T001 ─► T002 ─► T004 ─► T005 ─┬─► T011 ─► T012
               T006 ──────────┤      │
               T007 ─► T008   │      ▼
                              │    T014 ─┬─► T015
                              │          ├─► T017 ─┐
                              │          ├─► T018 ─┴─► T019
                              │          └─► T021
                              └─► T022 ─► T023, T024 ─► T025 ─► T026
```

US3 y US4 dependen de US2 (`get`) y pueden avanzar en paralelo entre sí.

## Matriz de cobertura: requisito → tarea

| Requisito | Tareas |
|---|---|
| FR-001, FR-002, FR-003 | T004, T005, T009, T011 |
| FR-004 | T004, T007, T010, T011 |
| FR-005, FR-006 | T013, T014, T015 |
| FR-007 | T004, T016, T018, T019 |
| FR-008 | T016, T017, T019 |
| FR-009 | T020, T021 |
| FR-010 | T022 |
| FR-011 | T014, T020 |
| FR-012 | T007, T023 |
| NFR-001, NFR-004 | T007, T023 |
| NFR-002 | T024 |
| NFR-003 | T025 |
| NFR-005 | T002 |

## Resumen

| Fase | Tareas | Completadas |
|---|---|---|
| Preparación | 3 | 3 |
| Fundamentos | 5 | 5 |
| US1 | 4 | 4 |
| US2 | 3 | 3 |
| US3 | 4 | 4 |
| US4 | 2 | 2 |
| Persistencia, seguridad y validación | 5 | 5 |
| **Total** | **26** | **26 (100 %)** |

---

## ✅ Puerta G3 — Checklist antes de aprobar las tareas

- [X] Cada tarea es pequeña y se revisa en minutos.
- [X] Cada tarea tiene su "Hecho cuando…".
- [X] Cada tarea referencia requisitos.
- [X] Las dependencias están marcadas.
- [X] Todos los requisitos están cubiertos por alguna tarea (ver la matriz).

**Aprobado por:** Líder técnico, 2026-10-21.
