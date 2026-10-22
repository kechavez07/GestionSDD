# Plan de Implementación: Gestión de Tareas Académicas

> **Comando SDD:** `/speckit-plan`
> **Rama:** `001-gestion-tareas` | **Fecha:** 2026-10-21
> **Especificación:** [`spec.md`](./spec.md) | **Constitución:** [`constitution.md`](../../.specify/memory/constitution.md)

---

## 1. Resumen

Se construirá una **API REST** en Node.js, sin dependencias externas, que implementa las historias US1–US4 de la especificación. La arquitectura sigue cuatro capas (HTTP, servicios, dominio y repositorio). La persistencia se hace en un archivo JSON con escritura atómica. Las pruebas se escriben con el *test runner* nativo `node:test` y la cobertura se mide con `--experimental-test-coverage`.

## 2. Contexto técnico (el *cómo*)

| Aspecto | Decisión |
|---|---|
| **Lenguaje / versión** | JavaScript (CommonJS) sobre Node.js ≥ 20 LTS (probado en 22.23) |
| **Dependencias** | Ninguna: `node:http`, `node:fs`, `node:crypto`, `node:test`, `node:assert` |
| **Almacenamiento** | Archivo JSON (`data/tasks.json`) con caché en memoria (`Map`) |
| **Pruebas** | `node:test` + `fetch` nativo para las pruebas de integración HTTP |
| **Plataforma** | Servidor local multiplataforma |
| **Tipo de proyecto** | Servicio backend único (API REST) |
| **Metas de desempeño** | < 200 ms por petición con 1 000 tareas (operaciones O(n) en memoria) |
| **Restricciones** | Cuerpo ≤ 10 KB; respuestas JSON UTF-8 |
| **Escala** | Un usuario, del orden de miles de tareas (iteración 1) |

## 3. Verificación de la Constitución (*Constitution Check*)

| Principio | ¿Cumple el plan? | Cómo |
|---|---|---|
| I. Especificación antes que código | ✅ | Spec aprobada; las tareas se trazan a FR/US |
| II. Arquitectura por capas | ✅ | `http → services → domain`, `services → repository` |
| III. Pruebas y cobertura | ✅ | 3 suites (dominio, servicio, API); umbral de 90/85/90 |
| IV. Mínimas dependencias | ✅ | 0 dependencias externas |
| V. Seguridad por diseño | ✅ | Validación, límite de 10 KB, 500 genérico y `nosniff` |
| VI. Contratos y errores consistentes | ✅ | Contrato de API definido abajo |
| VII. Documentación viva | ✅ | Artefactos en `.specify/` y `specs/` |

**Resultado:** sin violaciones. No hay entradas en *Complexity Tracking*.

## 4. Arquitectura

```
                ┌────────────────────────────────────────┐
  Cliente ────► │  HTTP (src/http/app.js)                │  enrutamiento, parseo JSON,
  (curl/app)    │  - límite 10 KB, mapeo de errores→HTTP │  códigos de estado
                └──────────────┬─────────────────────────┘
                               │
                ┌──────────────▼─────────────────────────┐
                │  Servicios (src/services/taskService)  │  casos de uso US1–US4,
                │  - filtros, orden, transiciones        │  NotFound/Transition errors
                └───────┬───────────────────────┬────────┘
                        │                       │
        ┌───────────────▼──────────┐   ┌────────▼──────────────────────┐
        │ Dominio (src/domain/task)│   │ Repositorio                   │
        │ - validación, entidad    │   │ (src/repository/taskRepository)│
        │ - reglas de estado       │   │ - Map en memoria + JSON atómico│
        └──────────────────────────┘   └───────────────────────────────┘
```

### Estructura del código fuente

```
taskflow-sdd/
├── .specify/memory/constitution.md
├── specs/001-gestion-tareas/
│   ├── spec.md  plan.md  tasks.md
│   ├── implement-report.md
│   └── coverage-audit.md
├── src/
│   ├── domain/task.js               # Entidad, validación y transiciones
│   ├── repository/taskRepository.js # Persistencia
│   ├── services/taskService.js      # Casos de uso
│   ├── http/app.js                  # API REST
│   └── server.js                    # Punto de arranque
├── tests/
│   ├── domain.test.js
│   ├── service.test.js
│   └── api.test.js
├── data/                            # tasks.json (generado)
└── package.json
```

## 5. Modelo de datos

```json
{
  "id": "6d91c2c2-3658-4421-8884-0f01ccc878b0",
  "title": "Entregar informe SDD",
  "description": "Documentos de la iteración 1",
  "subject": "Gestión de Proyectos",
  "dueDate": "2026-10-28",
  "priority": "alta",
  "status": "pendiente",
  "createdAt": "2026-10-22T04:30:31.177Z",
  "updatedAt": "2026-10-22T04:30:31.177Z"
}
```

### Máquina de estados (FR-007)

```
  pendiente ◄──────► en_progreso
      │                   │
      └──────► completada ◄┘     (completada es un estado final)
```

## 6. Contrato de la API (v1)

| Método | Ruta | Cuerpo | Éxito | Errores | Requisito |
|---|---|---|---|---|---|
| `GET` | `/health` | – | 200 `{status:"ok"}` | – | Operación |
| `POST` | `/tasks` | `{title, subject, dueDate, priority?, description?}` | 201 Tarea | 400, 413 | FR-001..004 |
| `GET` | `/tasks?status=&priority=&subject=` | – | 200 Tarea[] | 400 | FR-005, FR-006 |
| `GET` | `/tasks/:id` | – | 200 Tarea | 404 | FR-011 |
| `PATCH` | `/tasks/:id` | campos parciales | 200 Tarea | 400, 404 | FR-008 |
| `PATCH` | `/tasks/:id/status` | `{status}` | 200 Tarea | 400, 404, 409 | FR-007 |
| `DELETE` | `/tasks/:id` | – | 204 | 404 | FR-009 |

**Formato de error:** `{ "error": "mensaje", "details": ["..."] }`

## 7. Decisiones de diseño (investigación)

| Decisión | Alternativas evaluadas | Justificación |
|---|---|---|
| `node:http` nativo | Express, Fastify | Cumple el Principio IV; el número de rutas es pequeño |
| Archivo JSON | SQLite, MongoDB | Basta para un usuario; sin instalación; la BD llega en la iteración 2 |
| Escritura atómica (tmp + rename) | Escritura directa | Evita corromper el archivo si el proceso se cae a mitad de la escritura |
| `node:test` | Jest, Mocha | Viene incluido en Node; trae cobertura nativa |
| Endpoint separado para el estado | Cambiar `status` en el PATCH general | Aísla la regla de transición (FR-007) y da un 409 claro |
| Copias defensivas en el repositorio | Devolver referencias | Evita mutaciones accidentales del estado interno |

## 8. Estrategia de pruebas

| Nivel | Archivo | Qué verifica |
|---|---|---|
| Unitarias de dominio | `tests/domain.test.js` | Validaciones, fechas, valores por defecto, transiciones |
| Servicio + repositorio | `tests/service.test.js` | Casos de uso, orden, filtros, persistencia en disco |
| Integración HTTP | `tests/api.test.js` | Contrato de API, códigos de estado, seguridad (413, 500) |

**Comandos:** `npm test` · `npm run coverage`

## 9. Riesgos

| Riesgo | Mitigación |
|---|---|
| Concurrencia de escrituras en el archivo JSON | Un solo proceso; escrituras síncronas atómicas. Se migra a una BD en la iteración 2 |
| Crecimiento del archivo | Aceptable para miles de tareas; se monitorea en iteraciones futuras |
| Cobertura experimental de Node | Versión fijada (≥ 20); el reporte se adjunta en la auditoría |
