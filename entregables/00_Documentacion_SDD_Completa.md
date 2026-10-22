# TaskFlow – API de Gestión de Tareas Académicas

**Documentación completa de la iteración 1 (6 fases SDD)**

*Spec-Driven Development (SDD) con GitHub Spec Kit · Nivel spec-anchored*
Iteración 1 · Rama 001-gestion-tareas · 22 de octubre de 2026

- **Estudiante:** kleber enrique chavez oscullo 
- **Asignatura:** Gestión de Proyectos de Software
- **Repositorio:** https://github.com/kechavez07/GestionSDD

## Índice

1. Constitución (`/speckit-constitution`)
2. Especificación (`/speckit-specify`)
3. Planificación (`/speckit-plan`)
4. Tareas (`/speckit-tasks`)
5. Implementación (`/speckit-implement`)
6. Auditoría (`/speckit-converge` · coverage)

---

# Constitución del Proyecto TaskFlow

> **Fase SDD:** 0 – Principios del proyecto | **Comando Spec Kit:** `/speckit-constitution`
> **Artefacto:** `.specify/memory/constitution.md`
> **Versión:** 1.1.0 | **Ratificada:** 2026-10-21 | **Última enmienda:** 2026-10-22

## Propósito

TaskFlow es una API REST para que estudiantes universitarios registren y den seguimiento a sus tareas académicas. Esta constitución reúne las reglas **globales y no negociables** que aplican a todo el proyecto, sin importar la funcionalidad. La IA y el equipo deben respetarlas en cada fase: especificar, diseñar, generar tareas, implementar y validar.

> *Idea central de SDD:* decidir qué código debe existir es el trabajo real; escribirlo es cada vez más automatizable. Por eso las decisiones se toman **por escrito y antes** de que el agente toque un archivo.

**Nivel de rigor adoptado:** **Spec-anchored** (anclado a la especificación). La especificación se mantiene viva durante toda la vida de la funcionalidad: cuando cambia el comportamiento, **primero se edita la spec y después el código**.

---

## 1. Stack

| Componente                  | Decisión                                          |
| --------------------------- | -------------------------------------------------- |
| Lenguaje                    | JavaScript (CommonJS)                              |
| Entorno                     | Node.js ≥ 20 LTS (probado en 22.23)               |
| Servidor HTTP               | `node:http` nativo                               |
| Pruebas                     | `node:test` + `node:assert` + `fetch` nativo |
| Persistencia (iteración 1) | Archivo JSON local con escritura atómica          |
| Dependencias de ejecución  | **Ninguna**                                  |

## 2. Principios fundamentales

### I. La especificación es la fuente de verdad (NO NEGOCIABLE)

- No se escribe código de producción sin `spec.md`, `plan.md` y `tasks.md` aprobados en sus puertas de revisión.
- Si el código y la spec no coinciden, uno de los dos está mal y se resuelve de forma explícita, sin ignorar la diferencia.
- Si una tarea es ambigua o contradice la spec, el agente **se detiene y pregunta**.

### II. Arquitectura limpia por capas

- Dependencias en un solo sentido: `http → services → domain` y `services → repository`.
- El **dominio** no depende de la infraestructura (ni HTTP ni sistema de archivos).
- Los errores de dominio son **tipos** (`ValidationError`, `NotFoundError`, `TransitionError`), no strings.
- Cada módulo tiene una sola responsabilidad. El repositorio devuelve copias, nunca referencias internas.

### III. Requisitos verificables y pruebas trazables (NO NEGOCIABLE)

- Cada requisito tiene un ID (`FR-xxx`, `NFR-xxx`) y al menos una prueba automatizada.
- **El nombre de cada prueba lleva el ID del requisito** que verifica, por ejemplo `[FR-007] 409 ante transición…`.
- Ciclo Rojo → Verde → Refactor.
- Cobertura mínima sobre `src/` (sin contar `server.js`): **líneas ≥ 90 %, ramas ≥ 85 %, funciones ≥ 90 %**.

### IV. Incrementos pequeños

- Se implementa **una tarea a la vez**. Cada tarea debe poder revisarse en minutos.
- Cada tarea tiene su criterio "**Hecho cuando…**".

### V. Seguridad por diseño

- Validación estricta de entradas (tipos, longitudes y enumerados).
- Límite de 10 KB para el cuerpo de las peticiones.
- Las respuestas 5xx **no exponen** detalles internos.
- Cabeceras `Content-Type` explícita y `X-Content-Type-Options: nosniff`.
- Ningún secreto en el código. La configuración va en variables de entorno (`PORT`, `DATA_FILE`).

### VI. Contratos explícitos y errores consistentes

- Siempre se responde JSON, con códigos HTTP semánticos (200, 201, 204, 400, 404, 405, 409, 413, 500).
- Los errores tienen la forma `{ "error": string, "details"?: string[] }`.

### VII. Todo versionado y especificación viva

- Las specs viven en el repositorio junto al código y se revisan **en el mismo commit o PR** que el código.
- Si durante la implementación se descubre algo nuevo, **se actualiza la spec**, no solo el código.

## 3. Prohibido

- ❌ Agregar dependencias sin justificarlas en `plan.md` (sección *Complexity Tracking*).
- ❌ Escribir código que no se pueda trazar a una tarea de `tasks.md`.
- ❌ Hacer cambios grandes de golpe: un commit equivale a una tarea o a un grupo pequeño de tareas.
- ❌ Aprobar una fase **sin leerla**, porque eso es *vibe coding* con más pasos.
- ❌ Especificar todo el producto de una vez (*waterfall* encubierto). Se especifica por funcionalidad.
- ❌ Exponer trazas de error o rutas internas al cliente.

## 4. Puertas de revisión humanas

La IA propone y el humano decide. Ninguna fase avanza sin la aprobación que se indica:

| Puerta | Artefacto                | Aprueba            | Criterio                                         |
| ------ | ------------------------ | ------------------ | ------------------------------------------------ |
| G0     | `constitution.md`      | Equipo             | Consenso                                         |
| G1     | `spec.md` (requisitos) | Product Owner      | Checklist de §15 de la guía (requisitos)       |
| G2     | `plan.md` (diseño)    | Líder técnico    | Checklist de diseño                             |
| G3     | `tasks.md`             | Líder técnico    | Checklist de tareas                              |
| G4     | Implementación          | Revisor de código | Pruebas en verde y revisión del diff            |
| G5     | Auditoría / validación | Product Owner + QA | Checklist de cierre y estado **CONVERGED** |

## 5. Instrucciones para el agente de IA

Están en `AGENTS.md` y `CLAUDE.md`. En resumen: leer la constitución y la spec de la funcionalidad, implementar **solo** la tarea indicada, ejecutar las pruebas, marcar la tarea y detenerse si algo contradice la spec.

## 6. Definición de "Terminado" (Definition of Done)

1. Todas las tareas de `tasks.md` están marcadas `[X]` y cumplen su "Hecho cuando…".
2. `npm test` pasa al 100 %.
3. `npm run coverage` cumple los umbrales del Principio III.
4. Cada requisito (FR/NFR) tiene al menos una prueba que lleva su ID en el nombre.
5. La spec refleja el comportamiento final (no hay *spec drift*).
6. La auditoría indica estado **CONVERGED**, sin hallazgos críticos ni mayores abiertos.

## 7. Gobernanza

- La constitución está **por encima** de cualquier otra práctica del proyecto.
- **Enmiendas:** se proponen por escrito, se aprueban en G0 y se versionan con SemVer (MAYOR: elimina o redefine un principio; MENOR: agrega uno; PARCHE: aclaraciones).
- **Historial:**
  - 1.0.0 (2026-10-21): versión inicial.
  - 1.1.0 (2026-10-22): se agregan el nivel de rigor, el stack, la lista de prohibiciones, las puertas de revisión y la trazabilidad en los nombres de las pruebas.

---

# Especificación (Requisitos): Gestión de Tareas Académicas

> **Fase SDD:** 1 – Especificar (qué / por qué) | **Comando Spec Kit:** `/speckit-specify`
> **Equivale a:** `requirements.md` en la guía SDD
> **Rama:** `001-gestion-tareas` | **Creado:** 2026-10-21 | **Estado:** ✅ Aprobado (puerta G1)
> **Entrada (intención humana):** "Necesito una aplicación donde los estudiantes registren sus tareas de cada materia, con fecha de entrega y prioridad, puedan ver qué tienen pendiente ordenado por lo más urgente, marcar su avance y eliminar lo que ya no sirve."

Este documento describe el comportamiento **desde el punto de vista del usuario**, sin entrar en tecnología. Las decisiones técnicas van en `plan.md`.

---

## 1. Contexto y problema

Los estudiantes llevan varias materias a la vez y anotan sus entregas en lugares dispersos (cuadernos, chats, calendarios). Por eso se les olvidan fechas y no tienen una forma clara de decidir qué tarea atender primero.

**TaskFlow** centraliza las tareas académicas y las ordena por urgencia.

### Objetivos

- **O1:** Reducir las entregas olvidadas con un registro único.
- **O2:** Priorizar con una vista ordenada por fecha de entrega y prioridad.
- **O3:** Seguir el avance de cada tarea.

---

## 2. Historias de usuario

| ID            | Historia                                                                                                                                                 | Prioridad |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| **US1** | Como estudiante, quiero **registrar una tarea** con título, materia, fecha de entrega, prioridad y descripción, para no olvidar ninguna entrega. | P1 🎯 MVP |
| **US2** | Como estudiante, quiero **ver mis tareas ordenadas** por fecha y prioridad, y **filtrarlas**, para saber qué hacer primero.                 | P1 🎯 MVP |
| **US3** | Como estudiante, quiero **editar una tarea y marcar su avance**, para mantener mi lista al día.                                                   | P2        |
| **US4** | Como estudiante, quiero **eliminar tareas** que ya no aplican, para mantener mi lista limpia.                                                      | P3        |

---

## 3. Requisitos funcionales (formato EARS)

Plantillas usadas: **Ubicuo** (el sistema DEBE…), **Por evento** (CUANDO…), **No deseado** (SI… ENTONCES…).

### R1 — Registro de tareas (US1)

- **FR-001** CUANDO el estudiante registra una tarea, el sistema DEBE exigir un título de 1 a 100 caracteres, una materia no vacía y una fecha de entrega válida con formato `AAAA-MM-DD`, y DEBE aceptar una descripción opcional de hasta 500 caracteres.
- **FR-002** CUANDO una tarea se registra correctamente, el sistema DEBE asignarle un identificador único, el estado `pendiente` y las fechas de creación y modificación, y DEBE responder **201**.
- **FR-003** El sistema DEBE aceptar como prioridad solo `baja`, `media` o `alta`. SI no se indica la prioridad, ENTONCES el sistema DEBE asignar `media`.
- **FR-004** SI los datos enviados son inválidos o el JSON está mal formado, ENTONCES el sistema DEBE rechazar la operación con **400** y una lista de mensajes que expliquen cada error.

### R2 — Consulta (US2)

- **FR-005** CUANDO el estudiante consulta la lista, el sistema DEBE ordenarla por fecha de entrega ascendente y, en caso de empate, por prioridad (`alta` → `media` → `baja`).
- **FR-006** CUANDO el estudiante filtra por estado, prioridad o materia, el sistema DEBE devolver solo las tareas que coinciden (la materia, sin distinguir mayúsculas). SI el valor del filtro de estado o prioridad no existe, ENTONCES el sistema DEBE responder **400**.

### R3 — Edición y estado (US3)

- **FR-007** El sistema DEBE manejar los estados `pendiente`, `en_progreso` y `completada`. SI se intenta cambiar el estado de una tarea `completada`, ENTONCES el sistema DEBE rechazarlo con **409 Conflicto**.
- **FR-008** CUANDO el estudiante edita una tarea, el sistema DEBE modificar solo los campos enviados (título, descripción, materia, fecha y prioridad) y actualizar la fecha de modificación. SI se intenta cambiar el estado por esta vía, ENTONCES el sistema DEBE responder **400** e indicar el endpoint de estado.

### R4 — Eliminación y errores generales (US4)

- **FR-009** CUANDO el estudiante elimina una tarea existente, el sistema DEBE borrarla y responder **204**.
- **FR-010** El sistema DEBE conservar las tareas cuando el servidor se reinicia.
- **FR-011** SI se consulta, edita o elimina una tarea que no existe, ENTONCES el sistema DEBE responder **404**.
- **FR-012** SI se solicita una ruta inexistente o un método no soportado, ENTONCES el sistema DEBE responder **404** o **405** respectivamente.

### Requisitos no funcionales

| ID                | Requisito (verificable)                                                                                                                                                                                                                           |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **NFR-001** | Todas las respuestas DEBEN ser JSON en UTF-8.                                                                                                                                                                                                     |
| **NFR-002** | Con 1 000 tareas almacenadas, consultar la lista filtrada DEBE tardar **< 200 ms (p95)** en un equipo de desarrollo.                                                                                                                        |
| **NFR-003** | La cobertura de pruebas DEBE cumplir los umbrales de la Constitución (líneas ≥ 90 %, ramas ≥ 85 %).                                                                                                                                           |
| **NFR-004** | SI el cuerpo supera 10 KB, ENTONCES el sistema DEBE responder **413**. SI ocurre un error inesperado, ENTONCES DEBE responder **500** sin exponer detalles internos. Toda respuesta DEBE incluir `X-Content-Type-Options: nosniff`. |
| **NFR-005** | El sistema NO DEBE requerir dependencias externas para ejecutarse.                                                                                                                                                                                |

---

## 4. Criterios de aceptación (Gherkin)

| #     | Dado                                              | Cuando                                     | Entonces                                                        | Req.           |
| ----- | ------------------------------------------------- | ------------------------------------------ | --------------------------------------------------------------- | -------------- |
| CA-01 | título, materia y fecha válidos                 | registro la tarea                          | se guarda como `pendiente`, con `id` único, y responde 201 | FR-001, FR-002 |
| CA-02 | no envío la prioridad                            | registro la tarea                          | queda con prioridad `media`                                   | FR-003         |
| CA-03 | omito el título o envío la fecha `2026-02-30` | registro la tarea                          | responde 400 con la lista de errores                            | FR-001, FR-004 |
| CA-04 | envío un JSON mal formado                        | registro la tarea                          | responde 400 "JSON mal formado"                                 | FR-004         |
| CA-05 | tareas con fechas distintas                       | consulto la lista                          | aparecen de la más próxima a la más lejana                   | FR-005         |
| CA-06 | dos tareas con la misma fecha                     | consulto la lista                          | primero `alta`, luego `media` y luego `baja`              | FR-005         |
| CA-07 | tareas de "Redes" y "Gestión"                    | filtro `subject=redes`                   | solo aparecen las de "Redes"                                    | FR-006         |
| CA-08 | —                                                | filtro `priority=urgente`                | responde 400                                                    | FR-006         |
| CA-09 | una tarea existente                               | edito solo la prioridad                    | los demás campos no cambian y `updatedAt` se actualiza       | FR-008         |
| CA-10 | una tarea `pendiente`                           | la paso a `en_progreso` o `completada` | se acepta el cambio                                             | FR-007         |
| CA-11 | una tarea `completada`                          | intento cambiarle el estado                | responde 409                                                    | FR-007         |
| CA-12 | una tarea existente                               | envío `status` en la edición general   | responde 400                                                    | FR-008         |
| CA-13 | una tarea existente                               | la elimino                                 | responde 204 y deja de aparecer                                 | FR-009         |
| CA-14 | un `id` inexistente                             | consulto o elimino                         | responde 404                                                    | FR-011         |
| CA-15 | tareas guardadas                                  | reinicio el servidor                       | las tareas siguen disponibles                                   | FR-010         |

## 5. Casos límite y errores

- Título con espacios a los lados: se recortan. Un título hecho solo de espacios es inválido.
- Título > 100 caracteres o descripción > 500 caracteres → 400.
- Fecha inexistente en el calendario (`2026-02-30`) o con otro formato (`15/11/2026`) → 400.
- Cuerpo > 10 KB → 413. Petición sin cuerpo → 400.
- Ruta inexistente → 404. Método no soportado → 405.
- Error inesperado → 500 genérico.
- Archivo de datos vacío al arrancar → el sistema inicia sin tareas.

## 6. Fuera de alcance (esta iteración NO incluye)

- ❌ Usuarios, registro e inicio de sesión (multiusuario).
- ❌ Notificaciones o recordatorios de entregas.
- ❌ Interfaz gráfica web o móvil.
- ❌ Base de datos relacional.
- ❌ Adjuntar archivos a las tareas.

## 7. Preguntas abiertas

| #  | Pregunta                                       | Responsable   | Resolución                                                                  |
| -- | ---------------------------------------------- | ------------- | ---------------------------------------------------------------------------- |
| Q1 | ¿Se aceptan fechas de entrega ya pasadas?     | Product Owner | ✅ **Sí.** El estudiante puede registrar tareas atrasadas.            |
| Q2 | ¿Una tarea `completada` se puede reabrir?   | Product Owner | ✅ **No.** Es un estado final; para rehacerla se crea una tarea nueva. |
| Q3 | ¿El filtro de materia distingue mayúsculas?  | Product Owner | ✅ **No.** `redes` = `Redes`.                                      |
| Q4 | ¿Cuántas tareas debe soportar un estudiante? | Product Owner | ✅ Hasta **1 000** con buen rendimiento (→ NFR-002).                  |
| Q5 | ¿Se necesita multiusuario?                    | Product Owner | ⏭️ Pasa a la iteración 2 (`002-usuarios`).                              |

## 8. Criterios de éxito

- **SC-001:** El 100 % de los criterios de aceptación CA-01 a CA-15 tienen una prueba automatizada que pasa.
- **SC-002:** Ninguna petición inválida produce un 500: todas responden 4xx.
- **SC-003:** El requisito NFR-002 se verifica de forma automática.

---

## ✅ Puerta G1 — Checklist antes de aprobar los requisitos

- [X] El problema y el valor para el usuario están claros (§1).
- [X] Cada requisito es verificable y tiene un ID (FR-001 a FR-012, NFR-001 a NFR-005).
- [X] Hay casos límite y de error (§5).
- [X] Está definido lo que queda fuera de alcance (§6).
- [X] No menciona tecnologías innecesariamente (el stack está en `plan.md`).
- [X] Las preguntas abiertas están resueltas o asignadas (§7).

**Aprobado por:** Product Owner, 2026-10-21.

---

# Plan Técnico (Diseño): Gestión de Tareas Académicas

> **Fase SDD:** 2 – Diseñar / Planificar (cómo) | **Comando Spec Kit:** `/speckit-plan`
> **Equivale a:** `design.md` en la guía SDD
> **Rama:** `001-gestion-tareas` | **Fecha:** 2026-10-21 | **Estado:** ✅ Aprobado (puerta G2)
> **Entradas:** [`spec.md`](./02_Especificacion_speckit-specify.md) · [`constitution.md`](./01_Constitucion_speckit-constitution.md)

---

## 1. Resumen

Se construirá una **API REST** en Node.js, sin dependencias externas, que cumple los requisitos FR-001 a FR-012 y NFR-001 a NFR-005. Tiene cuatro capas (HTTP, servicios, dominio y repositorio) y guarda los datos en un archivo JSON con escritura atómica.

## 2. Contexto técnico

| Aspecto             | Decisión                                                            |
| ------------------- | -------------------------------------------------------------------- |
| Lenguaje / versión | JavaScript (CommonJS), Node.js ≥ 20 LTS                             |
| Dependencias        | Ninguna (`node:http`, `node:fs`, `node:crypto`, `node:test`) |
| Almacenamiento      | `data/tasks.json` + caché en memoria (`Map`)                    |
| Pruebas             | `node:test`; integración con `fetch` nativo                     |
| Meta de desempeño  | < 200 ms p95 con 1 000 tareas (NFR-002)                              |
| Restricciones       | Cuerpo ≤ 10 KB; JSON UTF-8                                          |

## 3. Verificación de la Constitución

| Principio                     | ¿Lo cumple? | Cómo                                                                       |
| ----------------------------- | ------------ | --------------------------------------------------------------------------- |
| I. Spec como fuente de verdad | ✅           | Spec aprobada en G1; cada decisión cita FR/NFR                             |
| II. Arquitectura por capas    | ✅           | `http → services → domain`, `services → repository`; errores tipados |
| III. Requisitos verificables  | ✅           | Estrategia de pruebas con el ID del requisito en el nombre (§8)            |
| IV. Incrementos pequeños     | ✅           | 26 tareas atómicas con "Hecho cuando…"                                    |
| V. Seguridad                  | ✅           | Validación, 10 KB, 500 genérico y `nosniff`                             |
| VI. Contratos                 | ✅           | Contrato de API en §6                                                      |
| VII. Spec viva                | ✅           | Artefactos versionados en el repositorio                                    |

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

| Componente                       | Responsabilidad                                           | Requisitos                                     |
| -------------------------------- | --------------------------------------------------------- | ---------------------------------------------- |
| `domain/task.js`               | Entidad Tarea, validación, fechas y transiciones         | FR-001, FR-002, FR-003, FR-004, FR-007, FR-008 |
| `services/taskService.js`      | Crear, listar, obtener, editar, cambiar estado y eliminar | FR-005, FR-006, FR-007, FR-008, FR-009, FR-011 |
| `repository/taskRepository.js` | Persistencia y copias defensivas                          | FR-010                                         |
| `http/app.js`                  | Contrato REST y mapeo de errores                          | FR-004, FR-012, NFR-001, NFR-004               |
| `server.js`                    | Arranque con variables de entorno                         | Constitución V                                |

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

| Campo                        | Tipo           | Notas                                                     | Req.           |
| ---------------------------- | -------------- | --------------------------------------------------------- | -------------- |
| `id`                       | UUID v4        | `crypto.randomUUID()`                                   | FR-002         |
| `title`                    | string         | 1–100 caracteres, recortado                              | FR-001         |
| `description`              | string         | ≤ 500 caracteres, `""` por defecto                     | FR-001         |
| `subject`                  | string         | obligatorio                                               | FR-001         |
| `dueDate`                  | `AAAA-MM-DD` | válida en el calendario                                  | FR-001         |
| `priority`                 | enum           | `baja` \| `media` \| `alta` (por defecto `media`) | FR-003         |
| `status`                   | enum           | `pendiente` \| `en_progreso` \| `completada`        | FR-007         |
| `createdAt`, `updatedAt` | ISO-8601       | generados por el sistema                                  | FR-002, FR-008 |

### Máquina de estados (FR-007)

```
  pendiente ◄──────► en_progreso
      │                   │
      └──────► completada ◄┘     (estado final → 409 si se intenta salir)
```

## 6. Contrato de la API (v1)

| Método    | Ruta                                  | Éxito      | Errores       | Req.            |
| ---------- | ------------------------------------- | ----------- | ------------- | --------------- |
| `GET`    | `/health`                           | 200         | —            | NFR-001         |
| `POST`   | `/tasks`                            | 201 Tarea   | 400, 413      | FR-001 a FR-004 |
| `GET`    | `/tasks?status=&priority=&subject=` | 200 Tarea[] | 400           | FR-005, FR-006  |
| `GET`    | `/tasks/:id`                        | 200 Tarea   | 404           | FR-011          |
| `PATCH`  | `/tasks/:id`                        | 200 Tarea   | 400, 404      | FR-008          |
| `PATCH`  | `/tasks/:id/status`                 | 200 Tarea   | 400, 404, 409 | FR-007          |
| `DELETE` | `/tasks/:id`                        | 204         | 404           | FR-009          |
| *otra*   | —                                    | —          | 404 / 405     | FR-012          |

**Formato de error:** `{ "error": "mensaje", "details": ["..."] }`

## 7. Decisiones (formato ADR) y alternativas descartadas

| ADR    | Decisión                                                         | Alternativas descartadas y por qué                                                                                                                               | Req.           |
| ------ | ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| ADR-01 | `node:http` nativo                                              | **Express/Fastify:** agregan dependencias (lo prohíbe la Constitución) y son innecesarios para 7 rutas.                                                   | NFR-005        |
| ADR-02 | Archivo JSON con escritura atómica (tmp + `rename`)            | **SQLite/PostgreSQL:** requieren instalación y sobran para un solo usuario. **Escritura directa:** corrompe el archivo si el proceso se cae a mitad. | FR-010         |
| ADR-03 | Endpoint separado `PATCH /tasks/:id/status`                     | **Cambiar `status` en el PATCH general:** mezcla validación de campos con reglas de transición y hace difícil devolver un 409 claro.                   | FR-007, FR-008 |
| ADR-04 | Errores de dominio tipados y mapeados a HTTP en una sola función | **Strings o códigos dentro de los servicios:** acoplan el dominio a HTTP (viola el Principio II).                                                          | FR-004, FR-011 |
| ADR-05 | Copias defensivas en el repositorio                               | **Devolver referencias:** permite mutar el estado sin pasar por las validaciones.                                                                           | Principio II   |
| ADR-06 | Descartar el resto del cuerpo > 10 KB y responder 413             | **Cortar el socket (`req.destroy()`):** el cliente no recibe la respuesta 413. *(Lo descubrió una prueba durante la implementación; ver AUD-01.)*     | NFR-004        |
| ADR-07 | Filtrado y orden en memoria O(n log n)                            | **Índices:** innecesarios para 1 000 tareas; se mide con la prueba NFR-002.                                                                                | NFR-002        |

## 8. Estrategia de pruebas

| Nivel                   | Archivo                   | Qué verifica                                                 |
| ----------------------- | ------------------------- | ------------------------------------------------------------- |
| Unitarias de dominio    | `tests/domain.test.js`  | Validación, fechas, valores por defecto y transiciones       |
| Servicio + persistencia | `tests/service.test.js` | Casos de uso, orden, filtros y archivo JSON                   |
| Integración HTTP       | `tests/api.test.js`     | Contrato completo, 4xx/5xx, seguridad y rendimiento (NFR-002) |

- **Cada prueba lleva el ID del requisito en su nombre**, por ejemplo `[FR-005] US2: lista ordenada…`.
- Validación manual (smoke test) del servidor real para el flujo de punta a punta y la persistencia (FR-010).
- Comandos: `npm test` y `npm run coverage`.

## 9. Riesgos

| Riesgo                                   | Impacto                               | Mitigación                                                 |
| ---------------------------------------- | ------------------------------------- | ----------------------------------------------------------- |
| Escrituras concurrentes en el JSON       | Pérdida de datos con varios procesos | Un solo proceso y escritura atómica; BD en la iteración 2 |
| Crecimiento del archivo                  | Lentitud                              | NFR-002 se mide en cada ejecución de pruebas               |
| Enumeración o abuso con cuerpos grandes | Consumo de recursos                   | Límite de 10 KB (NFR-004)                                  |
| Cobertura experimental de Node           | Métricas inestables                  | Versión de Node fijada (≥ 20)                             |

---

## ✅ Puerta G2 — Checklist antes de aprobar el diseño

- [X] Cubre todos los requisitos y cita sus IDs (§4, §5, §6 y §7).
- [X] Respeta la constitución del proyecto (§3).
- [X] Documenta las alternativas descartadas (§7).
- [X] Incluye una estrategia de pruebas (§8).
- [X] Identifica riesgos de seguridad, rendimiento y migraciones (§9).

**Aprobado por:** Líder técnico, 2026-10-21.

---

# Tareas: Gestión de Tareas Académicas (Iteración 1)

> **Fase SDD:** 3 – Descomponer en tareas | **Comando Spec Kit:** `/speckit-tasks`
> **Entradas:** [`spec.md`](./02_Especificacion_speckit-specify.md) · [`plan.md`](./03_Planificacion_speckit-plan.md)
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

| Requisito              | Tareas                 |
| ---------------------- | ---------------------- |
| FR-001, FR-002, FR-003 | T004, T005, T009, T011 |
| FR-004                 | T004, T007, T010, T011 |
| FR-005, FR-006         | T013, T014, T015       |
| FR-007                 | T004, T016, T018, T019 |
| FR-008                 | T016, T017, T019       |
| FR-009                 | T020, T021             |
| FR-010                 | T022                   |
| FR-011                 | T014, T020             |
| FR-012                 | T007, T023             |
| NFR-001, NFR-004       | T007, T023             |
| NFR-002                | T024                   |
| NFR-003                | T025                   |
| NFR-005                | T002                   |

## Resumen

| Fase                                  | Tareas       | Completadas          |
| ------------------------------------- | ------------ | -------------------- |
| Preparación                          | 3            | 3                    |
| Fundamentos                           | 5            | 5                    |
| US1                                   | 4            | 4                    |
| US2                                   | 3            | 3                    |
| US3                                   | 4            | 4                    |
| US4                                   | 2            | 2                    |
| Persistencia, seguridad y validación | 5            | 5                    |
| **Total**                       | **26** | **26 (100 %)** |

---

## ✅ Puerta G3 — Checklist antes de aprobar las tareas

- [X] Cada tarea es pequeña y se revisa en minutos.
- [X] Cada tarea tiene su "Hecho cuando…".
- [X] Cada tarea referencia requisitos.
- [X] Las dependencias están marcadas.
- [X] Todos los requisitos están cubiertos por alguna tarea (ver la matriz).

**Aprobado por:** Líder técnico, 2026-10-21.

---

# Reporte de Implementación – Iteración 1

> **Fase SDD:** 4 – Implementar | **Comando Spec Kit:** `/speckit-implement`
> **Rama:** `001-gestion-tareas` | **Fecha:** 2026-10-21 / 2026-10-22
> **Entradas:** [`tasks.md`](./04_Tareas_speckit-tasks.md) · [`plan.md`](./03_Planificacion_speckit-plan.md) · [`constitution.md`](./01_Constitucion_speckit-constitution.md) · [`AGENTS.md`](https://github.com/kechavez07/GestionSDD/blob/main/AGENTS.md)

---

## 1. Resumen

El agente ejecutó las **26 tareas** de `tasks.md` **una a la vez**, en el orden de dependencias (Preparación → Fundamentos → US1 → US2 → US3 → US4 → Persistencia, seguridad y validación), con el ciclo **Rojo → Verde → Refactor** que exige la Constitución.

| Métrica                                     | Valor                                    |
| -------------------------------------------- | ---------------------------------------- |
| Tareas completadas                           | 26 / 26 (100 %)                          |
| Código fuente (`src/`)                    | 5 archivos, 399 líneas                  |
| Pruebas (`tests/`)                         | 3 archivos, 352 líneas                  |
| Pruebas automatizadas                        | **36 pasan / 0 fallan** (8 suites) |
| Pruebas con el ID del requisito en el nombre | 36 / 36                                  |
| Dependencias externas                        | 0                                        |
| Endpoints                                    | 7 (6 de negocio + `/health`)           |

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

| Archivo                              | Capa          | Tareas                       | Requisitos                                                |
| ------------------------------------ | ------------- | ---------------------------- | --------------------------------------------------------- |
| `src/domain/task.js`               | Dominio       | T005                         | FR-001, FR-002, FR-003, FR-004, FR-007, FR-008            |
| `src/repository/taskRepository.js` | Persistencia  | T006, T022                   | FR-010                                                    |
| `src/services/taskService.js`      | Servicios     | T011, T014, T017, T018, T021 | FR-005 a FR-009, FR-011                                   |
| `src/http/app.js`                  | HTTP          | T007, T012, T015, T019, T021 | FR-004, FR-012, NFR-001, NFR-004                          |
| `src/server.js`                    | Arranque      | T008                         | Constitución V                                           |
| `tests/domain.test.js`             | Pruebas (14)  | T004                         | FR-001 a FR-004, FR-007, FR-008                           |
| `tests/service.test.js`            | Pruebas (11)  | T009, T013, T016, T020, T022 | FR-001, FR-002, FR-004 a FR-011                           |
| `tests/api.test.js`                | Pruebas (11)  | T010, T016, T020, T023, T024 | FR-004, FR-006, FR-007, FR-012, NFR-001, NFR-002, NFR-004 |
| `AGENTS.md`, `CLAUDE.md`         | Instrucciones | T003                         | Constitución §5                                         |

## 4. Bitácora por fase

| Fase                                     | Resultado | Notas                                                                                                    |
| ---------------------------------------- | --------- | -------------------------------------------------------------------------------------------------------- |
| 1. Preparación                          | ✅        | Estructura, `package.json` y constitución                                                             |
| 2. Fundamentos                           | ✅        | `isValidDate` rechaza fechas que no existen (`2026-02-30`). El repositorio devuelve copias (ADR-05). |
| 3. US1 Registrar                         | ✅        | 201 con UUID, `pendiente` y `media` por defecto. Los datos inválidos dan 400 con `details[]`.     |
| 4. US2 Consultar                         | ✅        | Orden por `dueDate` y luego por el peso de la prioridad. Filtro de materia sin distinguir mayúsculas. |
| 5. US3 Editar/estado                     | ✅        | Endpoint de estado separado (ADR-03). Salir de `completada` da 409.                                    |
| 6. US4 Eliminar                          | ✅        | 204, o 404 si la tarea no existe.                                                                        |
| 7. Persistencia, seguridad y validación | ✅        | JSON atómico, 413, 500 genérico, rendimiento y smoke test.                                             |

## 5. Verificación iterativa: lo que se descubrió al implementar

La guía SDD dice: *"si se descubrió algo nuevo durante la implementación → **se actualiza la spec**, no solo el código"*. Así se aplicó:

| # | Descubrimiento                                                                                                                 | Detectado por                                       | Cambio en el código                              | Cambio en la spec/plan                     |
| - | ------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------- | ------------------------------------------------- | ------------------------------------------ |
| 1 | Con un cuerpo > 10 KB, `req.destroy()` cortaba la conexión y el cliente veía *"fetch failed"* en lugar de 413.           | Prueba `[NFR-004] 413…` en **rojo**        | Se descarta el resto del cuerpo y se responde 413 | Se agregó **ADR-06** en `plan.md` |
| 2 | Había una rama muerta en `update()` (`typeof … === 'string'`), con cobertura de ramas de 97,37 %.                        | `npm run coverage`                                | Se simplificó a `.trim()`                      | — (refactor sin cambio de comportamiento) |
| 3 | Las respuestas 404/405 a rutas y métodos desconocidos estaban implementadas pero **no especificadas** (*spec drift*). | Revisión de trazabilidad                           | —                                                | Se agregó **FR-012** a `spec.md`  |
| 4 | NFR-002 (rendimiento) solo se había medido a mano.                                                                            | Revisión contra la guía (requisitos verificables) | Se agregó la prueba automatizada `[NFR-002]`   | Se agregó la tarea **T024**         |
| 5 | El script `node --test tests/` falla en Node 22, que espera un archivo y no una carpeta.                                     | Primera ejecución                                  | Se cambió al patrón `"tests/**/*.test.js"`    | —                                         |

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

---

# Documento de Auditoría – Validación, Cobertura y Convergencia (Iteración 1)

> **Fase SDD:** 5 – Validar | **Comando Spec Kit:** `/speckit-converge` (auditoría de cobertura, *Speckit-coverage*)
> **Rama:** `001-gestion-tareas` | **Fecha de auditoría:** 2026-10-22
> **Auditado contra:** [`constitution.md`](./01_Constitucion_speckit-constitution.md) · [`spec.md`](./02_Especificacion_speckit-specify.md) · [`plan.md`](./03_Planificacion_speckit-plan.md) · [`tasks.md`](./04_Tareas_speckit-tasks.md)

---

## 1. Dictamen

# ✅ ESTADO: CONVERGED

El resultado cumple **cada criterio de aceptación** de la especificación, el diseño técnico y los siete principios de la Constitución. No quedan hallazgos críticos ni mayores abiertos.

| Dimensión                                                   | Resultado                          |
| ------------------------------------------------------------ | ---------------------------------- |
| Cobertura de código (líneas / ramas / funciones)           | **100 % / 100 % / 100 %** ✅ |
| Pruebas automatizadas                                        | **36 / 36 pasan** ✅         |
| Requisitos funcionales con prueba trazable (ID en el nombre) | **12 / 12** ✅               |
| Requisitos no funcionales verificados                        | **5 / 5** ✅                 |
| Criterios de aceptación (CA-01 a CA-15) verificados         | **15 / 15** ✅               |
| Tareas completadas con su "Hecho cuando…"                   | **26 / 26** ✅               |
| Principios de la Constitución                               | **7 / 7** ✅                 |
| Puertas de revisión (G0 a G5)                               | **6 / 6** ✅                 |

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

| Métrica  | Umbral (Constitución III) | Obtenido | Estado |
| --------- | -------------------------- | -------- | ------ |
| Líneas   | ≥ 90 %                    | 100 %    | ✅     |
| Ramas     | ≥ 85 %                    | 100 %    | ✅     |
| Funciones | ≥ 90 %                    | 100 %    | ✅     |

**Exclusión justificada:** `src/server.js` (16 líneas, solo `listen()`) se verificó con la validación manual (§5).

---

## 3. Trazabilidad requisito → diseño → tarea → código → prueba

| Req.    | Diseño    | Tareas                 | Código                                | Pruebas (nombre con el ID)                                                                | ✔ |
| ------- | ---------- | ---------------------- | -------------------------------------- | ----------------------------------------------------------------------------------------- | -- |
| FR-001  | Modelo §5 | T004, T005, T009, T011 | `validateTaskInput`, `isValidDate` | 7 pruebas `[FR-001]`                                                                    | ✅ |
| FR-002  | Modelo §5 | T005, T009             | `createTask`                         | `[FR-002][FR-003] asigna id…`, `[FR-001][FR-002] US1…`                              | ✅ |
| FR-003  | Modelo §5 | T005                   | `PRIORITIES`                         | `[FR-003] rechaza prioridad inválida`, `[FR-002][FR-003]…`                          | ✅ |
| FR-004  | ADR-04     | T007, T010, T011       | `ValidationError` → 400             | 7 pruebas `[FR-004]`                                                                    | ✅ |
| FR-005  | ADR-07     | T013, T014             | `list()` + `PRIORITY_WEIGHT`       | `[FR-005] US2: lista ordenada…`                                                        | ✅ |
| FR-006  | §6        | T013–T015             | `list(filters)`                      | `[FR-006] US2: filtra…`, `[FR-006][FR-004]…`, `[FR-006] 400 con filtro inválido` | ✅ |
| FR-007  | ADR-03     | T016, T018, T019       | `canTransition`, `changeStatus`    | 4 pruebas `[FR-007]`                                                                    | ✅ |
| FR-008  | ADR-03     | T016, T017             | `update()`                           | 4 pruebas `[FR-008]`                                                                    | ✅ |
| FR-009  | §6        | T020, T021             | `remove()`                           | `[FR-009][FR-011] US4…` + flujo `[US1-US4]`                                          | ✅ |
| FR-010  | ADR-02     | T022                   | `persist()` / `load()`             | `[FR-010] persiste y recarga…`, `[FR-010] tolera un archivo vacío`                  | ✅ |
| FR-011  | ADR-04     | T014, T020             | `NotFoundError` → 404               | `[FR-009][FR-011]…` + flujo `[US1-US4]`                                              | ✅ |
| FR-012  | §6        | T007, T023             | enrutador → 404/405                   | `[FR-012] 404 en rutas desconocidas y 405…`                                            | ✅ |
| NFR-001 | §6        | T007                   | `send()` UTF-8                       | `[NFR-001][NFR-004] GET /health…`                                                      | ✅ |
| NFR-002 | ADR-07     | T024                   | filtro/orden en memoria                | `[NFR-002] lista 1 000 tareas…` → p95 < 200 ms ✅                                     | ✅ |
| NFR-003 | §8        | T025                   | —                                     | `npm run coverage` → 100 %                                                             | ✅ |
| NFR-004 | ADR-06     | T007, T023             | `readJson`, `errorResponse`        | `[NFR-004] 413…`, `[NFR-004] 500…`, `[NFR-001][NFR-004]…`                        | ✅ |
| NFR-005 | ADR-01     | T002                   | `package.json` sin `dependencies`  | inspección                                                                               | ✅ |

### Criterios de aceptación

| CA           | Prueba que lo verifica                                                                                      | ✔ |
| ------------ | ----------------------------------------------------------------------------------------------------------- | -- |
| CA-01        | `[FR-001][FR-002] US1: crea y recupera una tarea` · `[US1-US4] flujo completo` (201)                   | ✅ |
| CA-02        | `[FR-002][FR-003] asigna id, valores por defecto y timestamps`                                            | ✅ |
| CA-03        | `[FR-001] exige title…` · `[FR-001] rechaza fechas inexistentes…` · `[FR-004] 400 con detalles…` | ✅ |
| CA-04        | `[FR-004] 400 con JSON mal formado`                                                                       | ✅ |
| CA-05, CA-06 | `[FR-005] US2: lista ordenada por fecha de entrega y prioridad`                                           | ✅ |
| CA-07        | `[FR-006] US2: filtra por estado, prioridad y materia…`                                                  | ✅ |
| CA-08        | `[FR-006] 400 con filtro inválido`                                                                       | ✅ |
| CA-09        | `[FR-008] US3: edita campos y actualiza updatedAt`                                                        | ✅ |
| CA-10, CA-11 | `[FR-007] US3: cambia estado respetando transiciones` · `[FR-007] 409…`                               | ✅ |
| CA-12        | `[FR-008] no permite fijar status al crear/editar`                                                        | ✅ |
| CA-13        | `[US1-US4] flujo completo` (204) · `[FR-009][FR-011] US4…`                                            | ✅ |
| CA-14        | `[FR-009][FR-011] US4: elimina tarea y luego no existe`                                                   | ✅ |
| CA-15        | `[FR-010] persiste y recarga tareas desde disco` + validación manual                                     | ✅ |

---

## 4. Auditoría contra la Constitución

| Principio                         | Verificación                                                                                  | Resultado           |
| --------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------- |
| I. La spec es la fuente de verdad | El *spec drift* detectado (404/405) se resolvió **editando la spec** (FR-012)         | ✅                  |
| II. Arquitectura por capas        | `domain` solo importa `node:crypto`; no hay dependencias inversas; errores tipados         | ✅                  |
| III. Requisitos verificables      | 36/36 pruebas llevan el ID en el nombre; cobertura del 100 %                                   | ✅                  |
| IV. Incrementos pequeños         | 26 tareas atómicas con "Hecho cuando…" *(ver la observación AUD-05)*                      | ✅ con observación |
| V. Seguridad                      | Validación, 10 KB → 413, 500 genérico, `nosniff`, configuración por variables de entorno | ✅                  |
| VI. Contratos                     | 7/7 rutas coinciden con `plan.md` §6; formato de error uniforme                             | ✅                  |
| VII. Todo versionado              | Specs y código en el mismo repositorio y en el mismo commit                                   | ✅                  |

---

## 5. Validación más allá de las pruebas

La guía advierte sobre la **falsa sensación de verificación** ("pasan los tests, así que funciona"). Por eso también se validó a mano:

| Validación                                               | Resultado                                           |
| --------------------------------------------------------- | --------------------------------------------------- |
| Arranque real (`npm start`)                             | ✅ "TaskFlow API escuchando…"                      |
| Flujo real con `curl`: registrar una tarea              | ✅ 201 con UUID, `pendiente`                      |
| Persistencia real en `data/tasks.json`                  | ✅ La tarea está en el archivo                     |
| Medición de rendimiento con 1 000 tareas (50 peticiones) | ✅ p50 = 15,1 ms · p95 = 17,9 ms · máx = 51,0 ms |

---

## 6. Revisión de antipatrones (guía SDD §12)

| Antipatrón                        | ¿Presente?                               | Evidencia                                                                     |
| ---------------------------------- | ----------------------------------------- | ----------------------------------------------------------------------------- |
| Deriva de la spec (*spec drift*) | ⚠️ Se detectó y se **corrigió** | Faltaba FR-012 en la spec; se agregó                                         |
| Sobre-especificación              | ❌ No                                     | Las specs son proporcionales a 4 historias                                    |
| Spec que es código disfrazado     | ❌ No                                     | `spec.md` no menciona tecnología; el *cómo* está en `plan.md`        |
| Aprobar sin leer                   | ❌ No                                     | Cada puerta tiene su checklist completada                                     |
| Falsa sensación de verificación  | ❌ No                                     | Validación manual en §5                                                     |
| Waterfall encubierto               | ❌ No                                     | Solo se especificó la funcionalidad 001; los usuarios van en la iteración 2 |
| Specs huérfanas                   | ❌ No                                     | Una sola carpeta de spec, vigente                                             |

---

## 7. Hallazgos

| ID     | Severidad       | Descripción                                                                         | Estado                                    |
| ------ | --------------- | ------------------------------------------------------------------------------------ | ----------------------------------------- |
| AUD-01 | 🔴 Mayor        | Cuerpos > 10 KB cortaban la conexión en lugar de responder 413.                     | ✅ Corregido (ADR-06)                     |
| AUD-02 | 🟡 Menor        | Rama muerta en `update()` (cobertura de ramas de 97,37 %).                         | ✅ Corregido                              |
| AUD-03 | 🟡 Menor        | *Spec drift*: 404/405 implementados sin requisito.                                 | ✅ Corregido (FR-012)                     |
| AUD-04 | 🟡 Menor        | NFR-002 solo se verificaba a mano.                                                   | ✅ Corregido (prueba `[NFR-002]`, T024) |
| AUD-05 | 🟢 Observación | El código se subió en un solo commit, no en uno por tarea.                         | Aceptado; se exige en la iteración 2     |
| AUD-06 | 🟢 Observación | El JSON no soporta varios procesos escribiendo a la vez (riesgo de `plan.md` §9). | Aceptado; BD en la iteración 2           |

**Hallazgos críticos o mayores abiertos: 0**

## 8. Historial del ciclo de convergencia

| Ciclo | Resultado                            | Motivo                                                                         |
| ----- | ------------------------------------ | ------------------------------------------------------------------------------ |
| 1     | ❌ No converge                       | Prueba 413 en rojo; cobertura de ramas < 100 %                                 |
| 2     | ✅ Converge (contra Spec Kit)        | 35/35 pruebas, 100 % de cobertura                                              |
| 3     | ❌ No converge (contra la guía SDD) | *Spec drift* (FR-012), NFR-002 no automatizado y pruebas sin ID              |
| 4     | ✅ **CONVERGED**               | 36/36 pruebas con ID, 100 % de cobertura, spec actualizada y puertas completas |

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
