# Plan Técnico (Diseño): Gestión de Tareas Académicas

> **Fase SDD:** 2 – Diseñar / Planificar (cómo) | **Comando Spec Kit:** `/speckit-plan`
> **Equivale a:** `design.md` en la guía SDD
> **Rama:** `001-gestion-tareas` | **Fecha:** 2026-10-21 | **Estado:** ✅ Aprobado (puerta G2)
> **Entradas:** [`spec.md`](./02_Especificacion_speckit-specify.md) · [`constitution.md`](./01_Constitucion_speckit-constitution.md)

---

## 1. Resumen

Se construirá una **API REST** en Node.js, sin dependencias externas, que cumple los requisitos FR-001 a FR-012 y NFR-001 a NFR-005. Tiene cuatro capas (HTTP, servicios, dominio y repositorio) y guarda los datos en un archivo JSON con escritura atómica.

## 2. Contexto técnico

| Aspecto | Decisión |
|---|---|
| Lenguaje / versión | JavaScript (CommonJS), Node.js ≥ 20 LTS |
| Dependencias | Ninguna (`node:http`, `node:fs`, `node:crypto`, `node:test`) |
| Almacenamiento | `data/tasks.json` + caché en memoria (`Map`) |
| Pruebas | `node:test`; integración con `fetch` nativo |
| Meta de desempeño | < 200 ms p95 con 1 000 tareas (NFR-002) |
| Restricciones | Cuerpo ≤ 10 KB; JSON UTF-8 |

## 3. Verificación de la Constitución

| Principio | ¿Lo cumple? | Cómo |
|---|---|---|
| I. Spec como fuente de verdad | ✅ | Spec aprobada en G1; cada decisión cita FR/NFR |
| II. Arquitectura por capas | ✅ | `http → services → domain`, `services → repository`; errores tipados |
| III. Requisitos verificables | ✅ | Estrategia de pruebas con el ID del requisito en el nombre (§8) |
| IV. Incrementos pequeños | ✅ | 26 tareas atómicas con "Hecho cuando…" |
| V. Seguridad | ✅ | Validación, 10 KB, 500 genérico y `nosniff` |
| VI. Contratos | ✅ | Contrato de API en §6 |
| VII. Spec viva | ✅ | Artefactos versionados en el repositorio |

**Complexity Tracking:** sin entradas, porque no se agregan dependencias ni hay excepciones a la constitución.

## 4. Componentes y arquitectura

```
                ┌────────────────────────────────────────┐
  Cliente ────► │  HTTP  (src/http/app.js)               │  rutas, parseo JSON, 10 KB,
                │                                        │  errores → códigos HTTP
                └──────────────┬─────────────────────────┘
                               │
                ┌──────────────▼─────────────────────────┐
                │  Servicios (src/services/taskService)  │  casos de uso US1–US4
                └───────┬───────────────────────┬────────┘
                        │                       │
        ┌───────────────▼──────────┐   ┌────────▼────────────────────────┐
        │ Dominio (src/domain/task)│   │ Repositorio                     │
        │ validación, entidad,     │   │ (src/repository/taskRepository) │
        │ máquina de estados       │   │ Map + JSON atómico              │
        └──────────────────────────┘   └─────────────────────────────────┘
```

| Componente | Responsabilidad | Requisitos |
|---|---|---|
| `domain/task.js` | Entidad Tarea, validación, fechas y transiciones | FR-001, FR-002, FR-003, FR-004, FR-007, FR-008 |
| `services/taskService.js` | Crear, listar, obtener, editar, cambiar estado y eliminar | FR-005, FR-006, FR-007, FR-008, FR-009, FR-011 |
| `repository/taskRepository.js` | Persistencia y copias defensivas | FR-010 |
| `http/app.js` | Contrato REST y mapeo de errores | FR-004, FR-012, NFR-001, NFR-004 |
| `server.js` | Arranque con variables de entorno | Constitución V |

### Estructura de carpetas

```
taskflow-sdd/
├── AGENTS.md / CLAUDE.md            # instrucciones para el agente de IA
├── .specify/memory/constitution.md  # Fase 0
├── specs/001-gestion-tareas/
│   ├── spec.md                      # Fase 1 (requisitos)
│   ├── plan.md                      # Fase 2 (diseño)
│   ├── tasks.md                     # Fase 3
│   ├── implement-report.md          # Fase 4
│   └── coverage-audit.md            # Fase 5 (validación / auditoría)
├── src/ {domain, repository, services, http, server.js}
└── tests/ {domain, service, api}.test.js
```

## 5. Modelo de datos

| Campo | Tipo | Notas | Req. |
|---|---|---|---|
| `id` | UUID v4 | `crypto.randomUUID()` | FR-002 |
| `title` | string | 1–100 caracteres, recortado | FR-001 |
| `description` | string | ≤ 500 caracteres, `""` por defecto | FR-001 |
| `subject` | string | obligatorio | FR-001 |
| `dueDate` | `AAAA-MM-DD` | válida en el calendario | FR-001 |
| `priority` | enum | `baja` \| `media` \| `alta` (por defecto `media`) | FR-003 |
| `status` | enum | `pendiente` \| `en_progreso` \| `completada` | FR-007 |
| `createdAt`, `updatedAt` | ISO-8601 | generados por el sistema | FR-002, FR-008 |

### Máquina de estados (FR-007)

```
  pendiente ◄──────► en_progreso
      │                   │
      └──────► completada ◄┘     (estado final → 409 si se intenta salir)
```

## 6. Contrato de la API (v1)

| Método | Ruta | Éxito | Errores | Req. |
|---|---|---|---|---|
| `GET` | `/health` | 200 | — | NFR-001 |
| `POST` | `/tasks` | 201 Tarea | 400, 413 | FR-001 a FR-004 |
| `GET` | `/tasks?status=&priority=&subject=` | 200 Tarea[] | 400 | FR-005, FR-006 |
| `GET` | `/tasks/:id` | 200 Tarea | 404 | FR-011 |
| `PATCH` | `/tasks/:id` | 200 Tarea | 400, 404 | FR-008 |
| `PATCH` | `/tasks/:id/status` | 200 Tarea | 400, 404, 409 | FR-007 |
| `DELETE` | `/tasks/:id` | 204 | 404 | FR-009 |
| *otra* | — | — | 404 / 405 | FR-012 |

**Formato de error:** `{ "error": "mensaje", "details": ["..."] }`

## 7. Decisiones (formato ADR) y alternativas descartadas

| ADR | Decisión | Alternativas descartadas y por qué | Req. |
|---|---|---|---|
| ADR-01 | `node:http` nativo | **Express/Fastify:** agregan dependencias (lo prohíbe la Constitución) y son innecesarios para 7 rutas. | NFR-005 |
| ADR-02 | Archivo JSON con escritura atómica (tmp + `rename`) | **SQLite/PostgreSQL:** requieren instalación y sobran para un solo usuario. **Escritura directa:** corrompe el archivo si el proceso se cae a mitad. | FR-010 |
| ADR-03 | Endpoint separado `PATCH /tasks/:id/status` | **Cambiar `status` en el PATCH general:** mezcla validación de campos con reglas de transición y hace difícil devolver un 409 claro. | FR-007, FR-008 |
| ADR-04 | Errores de dominio tipados y mapeados a HTTP en una sola función | **Strings o códigos dentro de los servicios:** acoplan el dominio a HTTP (viola el Principio II). | FR-004, FR-011 |
| ADR-05 | Copias defensivas en el repositorio | **Devolver referencias:** permite mutar el estado sin pasar por las validaciones. | Principio II |
| ADR-06 | Descartar el resto del cuerpo > 10 KB y responder 413 | **Cortar el socket (`req.destroy()`):** el cliente no recibe la respuesta 413. *(Lo descubrió una prueba durante la implementación; ver AUD-01.)* | NFR-004 |
| ADR-07 | Filtrado y orden en memoria O(n log n) | **Índices:** innecesarios para 1 000 tareas; se mide con la prueba NFR-002. | NFR-002 |

## 8. Estrategia de pruebas

| Nivel | Archivo | Qué verifica |
|---|---|---|
| Unitarias de dominio | `tests/domain.test.js` | Validación, fechas, valores por defecto y transiciones |
| Servicio + persistencia | `tests/service.test.js` | Casos de uso, orden, filtros y archivo JSON |
| Integración HTTP | `tests/api.test.js` | Contrato completo, 4xx/5xx, seguridad y rendimiento (NFR-002) |

- **Cada prueba lleva el ID del requisito en su nombre**, por ejemplo `[FR-005] US2: lista ordenada…`.
- Validación manual (smoke test) del servidor real para el flujo de punta a punta y la persistencia (FR-010).
- Comandos: `npm test` y `npm run coverage`.

## 9. Riesgos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Escrituras concurrentes en el JSON | Pérdida de datos con varios procesos | Un solo proceso y escritura atómica; BD en la iteración 2 |
| Crecimiento del archivo | Lentitud | NFR-002 se mide en cada ejecución de pruebas |
| Enumeración o abuso con cuerpos grandes | Consumo de recursos | Límite de 10 KB (NFR-004) |
| Cobertura experimental de Node | Métricas inestables | Versión de Node fijada (≥ 20) |

---

## ✅ Puerta G2 — Checklist antes de aprobar el diseño

- [X] Cubre todos los requisitos y cita sus IDs (§4, §5, §6 y §7).
- [X] Respeta la constitución del proyecto (§3).
- [X] Documenta las alternativas descartadas (§7).
- [X] Incluye una estrategia de pruebas (§8).
- [X] Identifica riesgos de seguridad, rendimiento y migraciones (§9).

**Aprobado por:** Líder técnico, 2026-10-21.
