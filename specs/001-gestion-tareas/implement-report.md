# Reporte de Implementación – Iteración 1

> **Comando SDD:** `/speckit-implement`
> **Rama:** `001-gestion-tareas` | **Fecha:** 2026-10-21
> **Entradas:** [`tasks.md`](./tasks.md), [`plan.md`](./plan.md), [`constitution.md`](../../.specify/memory/constitution.md)

---

## 1. Resumen

El agente implementó las **26 tareas** de `tasks.md` en el orden de fases que se definió (Setup → Fundamentos → US1 → US2 → US3 → US4 → Transversal), con el ciclo **Rojo → Verde → Refactor** que exige la Constitución. Se entrega una API REST funcional que cubre las historias US1–US4.

| Métrica | Valor |
|---|---|
| Tareas completadas | 26 / 26 (100 %) |
| Archivos de código fuente | 5 (`src/`) – 399 líneas |
| Archivos de prueba | 3 (`tests/`) – 325 líneas |
| Pruebas automatizadas | **35 pasan / 0 fallan** |
| Dependencias externas | 0 |
| Endpoints | 7 (6 de negocio + `/health`) |

## 2. Archivos producidos

| Archivo | Capa | Responsabilidad | Tareas |
|---|---|---|---|
| `src/domain/task.js` | Dominio | Entidad Tarea, validación, fechas y máquina de estados | T005 |
| `src/repository/taskRepository.js` | Persistencia | `Map` en memoria + JSON con escritura atómica | T006, T022 |
| `src/services/taskService.js` | Servicios | Casos de uso: crear, listar, obtener, editar, cambiar estado y eliminar | T011, T014, T017, T018, T021 |
| `src/http/app.js` | HTTP | Enrutamiento, parseo JSON, límite de 10 KB y mapeo de errores | T007, T012, T015, T019, T021 |
| `src/server.js` | Arranque | Configuración por variables de entorno | T008 |
| `tests/domain.test.js` | Pruebas | 14 pruebas unitarias del dominio | T004 |
| `tests/service.test.js` | Pruebas | 11 pruebas de servicio y persistencia | T009, T013, T016, T020, T022 |
| `tests/api.test.js` | Pruebas | 10 pruebas de integración HTTP | T010, T016, T020, T023 |

## 3. Bitácora de ejecución por fase

### Fase 1 – Setup ✅
Se crearon la estructura de carpetas y `package.json` con los scripts `start`, `test` y `coverage`, y se redactó la constitución.

### Fase 2 – Fundamentos ✅
- Primero se escribieron las pruebas de dominio (**rojo**). Después se implementó `task.js` hasta que pasaron (**verde**).
- `isValidDate` verifica el formato `YYYY-MM-DD` **y** que la fecha exista en el calendario (rechaza `2026-02-30`), comparando contra `toISOString()`.
- El repositorio devuelve **copias** de los objetos para que no se pueda mutar su estado interno.

### Fase 3 – US1 Registrar ✅
`POST /tasks` responde 201 con `id` UUID, `status: "pendiente"` y `priority: "media"` por defecto. Los datos inválidos producen 400 con `details[]`.

### Fase 4 – US2 Consultar ✅
El orden es por `dueDate` ascendente y, en caso de empate, por el peso de la prioridad (`alta=0`, `media=1`, `baja=2`). El filtro de `subject` no distingue mayúsculas. Los filtros inválidos producen 400.

### Fase 5 – US3 Editar / Estado ✅
- `PATCH /tasks/:id` hace una edición parcial y **rechaza** `status` (lo envía al endpoint dedicado).
- `PATCH /tasks/:id/status` aplica las transiciones de FR-007. Desde `completada` responde **409**.

### Fase 6 – US4 Eliminar ✅
`DELETE /tasks/:id` responde 204, y 404 si la tarea no existe.

### Fase 7 – Transversal ✅
Persistencia atómica (`tasks.json.tmp` → `rename`), pruebas de seguridad, README y medición de cobertura.

## 4. Verificación iterativa (bucle Tareas ↔ Implementar)

Durante la implementación, el ciclo de verificación encontró y corrigió dos desviaciones antes de cerrar la iteración:

| # | Hallazgo | Detectado por | Corrección |
|---|---|---|---|
| 1 | Con un cuerpo > 10 KB, el servidor cortaba el socket (`req.destroy()`) y el cliente recibía *"fetch failed"* en lugar de **413** (incumplía NFR-004 / Principio VI). | Prueba `413 si el cuerpo excede el límite` (T023) en **rojo** | Se descarta el resto del cuerpo sin cortar la conexión y se responde 413 al terminar la lectura. |
| 2 | La cobertura de ramas de `taskService.js` era de 97,37 % por una rama muerta (`typeof … === 'string'`): todos los campos editables ya llegan validados como texto. | `npm run coverage` (T024) | Se simplificó a `changes[key].trim()` y la cobertura de ramas quedó en 100 %. |

Además, el script de pruebas `node --test tests/` no funcionaba en Node 22 (busca un módulo, no una carpeta). Se corrigió al patrón `"tests/**/*.test.js"`.

## 5. Evidencia de ejecución

### Pruebas

```
$ npm test
# tests 35
# suites 7
# pass 35
# fail 0
# cancelled 0
# skipped 0
```

### Prueba manual (smoke test) del servidor real

```
$ PORT=3917 node src/server.js
TaskFlow API escuchando en http://localhost:3917

$ curl -X POST localhost:3917/tasks -H "Content-Type: application/json" \
    -d '{"title":"Entregar SDD","subject":"Gestión","dueDate":"2026-10-28","priority":"alta"}'
{"id":"6d91c2c2-3658-4421-8884-0f01ccc878b0","title":"Entregar SDD","description":"",
 "subject":"Gestión","dueDate":"2026-10-28","priority":"alta","status":"pendiente",
 "createdAt":"2026-10-22T04:30:31.177Z","updatedAt":"2026-10-22T04:30:31.177Z"}
```

Se verificó que el archivo `data/tasks.json` contenía la tarea después de la petición (FR-010).

## 6. Cómo reproducir

```bash
cd taskflow-sdd
npm test
npm run coverage
npm start
```

## 7. Pendiente para la iteración 2 (fuera de alcance)

- Usuarios y autenticación (multiusuario).
- Migrar la persistencia a una base de datos (SQLite o PostgreSQL).
- Recordatorios de entregas próximas.
- Cliente web.
