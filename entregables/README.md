# TaskFlow – Spec-Driven Development (SDD) · Iteración 1

> 📁 Carpeta de entregables: aquí están los 6 documentos SDD en Markdown y el documento completo. El código está en el repositorio: https://github.com/kechavez07/GestionSDD

API REST de **gestión de tareas académicas**, desarrollada con **Spec-Driven Development**: la especificación es el artefacto principal y el código es una consecuencia de ella. El proyecto usa el flujo de **GitHub Spec Kit** (`constitution → specify → plan → tasks → implement → converge`).

> *Decidir qué código debe existir es el trabajo real; escribirlo es cada vez más automatizable.*

| Estado | Pruebas | Cobertura | Requisitos trazados | Tareas | Dependencias |
|---|---|---|---|---|---|
| ✅ **CONVERGED** | 36/36 ✅ | 100 % líneas · 100 % ramas | 17/17 (12 FR + 5 NFR) | 26/26 | 0 |

---

## 📦 Entregables SDD

Cada fase tiene su documento en Markdown, tanto en esta carpeta como en el repositorio (junto al código).

| # | Fase SDD | Comando Spec Kit | En el repositorio (GitHub) | En esta carpeta | Puerta de revisión |
|---|---|---|---|---|---|
| 1 | **Constitución** – principios globales | `/speckit-constitution` | [`constitution.md`](https://github.com/kechavez07/GestionSDD/blob/main/.specify/memory/constitution.md) | [01_Constitucion](./01_Constitucion_speckit-constitution.md) | G0 – Equipo ✅ |
| 2 | **Especificación** – qué y por qué | `/speckit-specify` | [`spec.md`](https://github.com/kechavez07/GestionSDD/blob/main/specs/001-gestion-tareas/spec.md) | [02_Especificacion](./02_Especificacion_speckit-specify.md) | G1 – Product Owner ✅ |
| 3 | **Planificación** – cómo (diseño) | `/speckit-plan` | [`plan.md`](https://github.com/kechavez07/GestionSDD/blob/main/specs/001-gestion-tareas/plan.md) | [03_Planificacion](./03_Planificacion_speckit-plan.md) | G2 – Líder técnico ✅ |
| 4 | **Tareas** – pasos pequeños | `/speckit-tasks` | [`tasks.md`](https://github.com/kechavez07/GestionSDD/blob/main/specs/001-gestion-tareas/tasks.md) | [04_Tareas](./04_Tareas_speckit-tasks.md) | G3 – Líder técnico ✅ |
| 5 | **Implementación** de la iteración | `/speckit-implement` | [`implement-report.md`](https://github.com/kechavez07/GestionSDD/blob/main/specs/001-gestion-tareas/implement-report.md) + [`src/`](https://github.com/kechavez07/GestionSDD/blob/main/src) + [`tests/`](https://github.com/kechavez07/GestionSDD/blob/main/tests) | [05_Implementacion](./05_Implementacion_speckit-implement.md) | G4 – Revisor ✅ |
| 6 | **Auditoría** – validación y cobertura | `/speckit-converge` (*coverage*) | [`coverage-audit.md`](https://github.com/kechavez07/GestionSDD/blob/main/specs/001-gestion-tareas/coverage-audit.md) | [06_Auditoria](./06_Auditoria_speckit-coverage.md) | G5 – PO + QA ✅ |
| ★ | **Documento completo** (las 6 fases con portada) | — | — | [00_Documentacion_SDD_Completa](./00_Documentacion_SDD_Completa.md) | — |

Instrucciones para el agente de IA: [`AGENTS.md`](https://github.com/kechavez07/GestionSDD/blob/main/AGENTS.md) · [`CLAUDE.md`](https://github.com/kechavez07/GestionSDD/blob/main/CLAUDE.md)

---

## 🔄 El flujo aplicado

```
 ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
 │0. Constitución│→│1. Especificar│→│2. Planificar │→│ 3. Tareas    │→│4. Implementar│→│ 5. Validar / │
 │   (G0)        │ │   (G1)       │ │   (G2)       │ │   (G3)       │ │   (G4)       │ │  Converger(G5)│
 └──────────────┘  └──────┬───────┘  └──────────────┘  └──────────────┘  └──────────────┘  └──────┬───────┘
                          ▲                                                                       │
                          └──────────── si algo cambia, se actualiza primero la spec ◄────────────┘
```

**Nivel de rigor:** *spec-anchored*. La spec se mantiene viva: cuando algo cambia, se edita primero la spec y después el código.

---

## 📋 Resumen de cada entregable

### 1. Constitución (`/speckit-constitution`)
Son las reglas **no negociables** de todo el proyecto:
- **Stack:** Node.js ≥ 20, sin dependencias, `node:test`.
- **7 principios:** la spec es la fuente de verdad · arquitectura por capas · requisitos verificables con el ID del requisito en el nombre de cada prueba · incrementos pequeños · seguridad por diseño · contratos explícitos · todo versionado.
- **Cobertura mínima:** líneas ≥ 90 %, ramas ≥ 85 %, funciones ≥ 90 %.
- **Prohibido:** dependencias sin justificar, código sin tarea, aprobar fases sin leerlas, *waterfall* encubierto.
- **Puertas de revisión G0 a G5:** quién aprueba cada fase.

### 2. Especificación (`/speckit-specify`)
Describe el **qué** y el **por qué**, sin tecnología:
- **Problema:** los estudiantes olvidan entregas y no saben qué tarea atender primero.
- **4 historias de usuario:** US1 Registrar · US2 Consultar · US3 Editar/estado · US4 Eliminar.
- **12 requisitos funcionales en formato EARS** (CUANDO… / SI… ENTONCES… el sistema DEBE…) y **5 no funcionales**.
- **15 criterios de aceptación** en formato Gherkin (Dado / Cuando / Entonces).
- Casos límite, **fuera de alcance** y **preguntas abiertas resueltas**.

### 3. Planificación (`/speckit-plan`)
Describe el **cómo**:
- **Arquitectura de 4 capas:** HTTP → Servicios → Dominio / Repositorio.
- Modelo de datos, máquina de estados (`pendiente ⇄ en_progreso → completada`) y **contrato de la API** (7 rutas).
- **7 decisiones (ADR)** con sus **alternativas descartadas** y el requisito que cada una cubre.
- Estrategia de pruebas en 3 niveles y matriz de riesgos.

### 4. Tareas (`/speckit-tasks`)
- **26 tareas** en 7 fases, cada una con su **"Hecho cuando…"**, sus requisitos y sus dependencias.
- Tareas paralelizables marcadas con `[P]`, grafo de dependencias y **matriz requisito → tarea**.

### 5. Implementación (`/speckit-implement`)
- Se ejecutó **una tarea a la vez** con Rojo → Verde → Refactor, usando el prompt de `AGENTS.md`.
- **5 descubrimientos** durante la implementación. Cuando correspondía, se actualizó la spec además del código.
- Evidencia: 36 pruebas en verde y validación manual con el servidor real.

### 6. Auditoría (`/speckit-converge` · *coverage*)
- Dictamen **CONVERGED**: 100 % de cobertura, 36/36 pruebas, 15/15 criterios de aceptación y 7/7 principios.
- **Trazabilidad completa:** requisito → diseño → tarea → código → prueba.
- Validación manual (para no caer en la "falsa sensación de verificación") y revisión de los **7 antipatrones** de la guía SDD.
- Historial de **4 ciclos** de convergencia y 6 hallazgos (4 corregidos, 2 aceptados para la iteración 2).

---

## 🗂️ Estructura del repositorio

```
.
├── README.md                         ← este resumen
├── AGENTS.md / CLAUDE.md             ← instrucciones para el agente de IA
├── .specify/memory/constitution.md   ← 1. Constitución
├── specs/001-gestion-tareas/
│   ├── spec.md                       ← 2. Especificación (requisitos)
│   ├── plan.md                       ← 3. Planificación (diseño)
│   ├── tasks.md                      ← 4. Tareas
│   ├── implement-report.md           ← 5. Implementación
│   └── coverage-audit.md             ← 6. Auditoría
├── entregables/                      ← los 6 documentos + el documento completo
├── src/
│   ├── domain/task.js                ← entidad, validación y estados
│   ├── repository/taskRepository.js  ← persistencia JSON atómica
│   ├── services/taskService.js       ← casos de uso US1–US4
│   ├── http/app.js                   ← API REST
│   └── server.js                     ← arranque
└── tests/                            ← 36 pruebas con el ID del requisito en el nombre
```

---

## ▶️ Ejecutar

Requiere **Node.js ≥ 20** (no hace falta `npm install`).

```bash
npm test            # 36 pruebas
npm run coverage    # pruebas + reporte de cobertura
npm start           # http://localhost:3000
```

### API

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/tasks` | Registrar una tarea |
| `GET` | `/tasks?status=&priority=&subject=` | Listar las tareas (ordenadas y filtradas) |
| `GET` | `/tasks/:id` | Ver el detalle de una tarea |
| `PATCH` | `/tasks/:id` | Editar campos |
| `PATCH` | `/tasks/:id/status` | Cambiar el estado |
| `DELETE` | `/tasks/:id` | Eliminar una tarea |

```bash
curl -X POST http://localhost:3000/tasks -H "Content-Type: application/json" \
  -d '{"title":"Entregar informe SDD","subject":"Gestion","dueDate":"2026-10-28","priority":"alta"}'
```

---

## 🔭 Próxima iteración

`002-usuarios`: autenticación y multiusuario, migración a una base de datos, un commit por tarea y CI con umbral de cobertura.
