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

| ID | Historia | Prioridad |
|---|---|---|
| **US1** | Como estudiante, quiero **registrar una tarea** con título, materia, fecha de entrega, prioridad y descripción, para no olvidar ninguna entrega. | P1 🎯 MVP |
| **US2** | Como estudiante, quiero **ver mis tareas ordenadas** por fecha y prioridad, y **filtrarlas**, para saber qué hacer primero. | P1 🎯 MVP |
| **US3** | Como estudiante, quiero **editar una tarea y marcar su avance**, para mantener mi lista al día. | P2 |
| **US4** | Como estudiante, quiero **eliminar tareas** que ya no aplican, para mantener mi lista limpia. | P3 |

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

| ID | Requisito (verificable) |
|---|---|
| **NFR-001** | Todas las respuestas DEBEN ser JSON en UTF-8. |
| **NFR-002** | Con 1 000 tareas almacenadas, consultar la lista filtrada DEBE tardar **< 200 ms (p95)** en un equipo de desarrollo. |
| **NFR-003** | La cobertura de pruebas DEBE cumplir los umbrales de la Constitución (líneas ≥ 90 %, ramas ≥ 85 %). |
| **NFR-004** | SI el cuerpo supera 10 KB, ENTONCES el sistema DEBE responder **413**. SI ocurre un error inesperado, ENTONCES DEBE responder **500** sin exponer detalles internos. Toda respuesta DEBE incluir `X-Content-Type-Options: nosniff`. |
| **NFR-005** | El sistema NO DEBE requerir dependencias externas para ejecutarse. |

---

## 4. Criterios de aceptación (Gherkin)

| # | Dado | Cuando | Entonces | Req. |
|---|---|---|---|---|
| CA-01 | título, materia y fecha válidos | registro la tarea | se guarda como `pendiente`, con `id` único, y responde 201 | FR-001, FR-002 |
| CA-02 | no envío la prioridad | registro la tarea | queda con prioridad `media` | FR-003 |
| CA-03 | omito el título o envío la fecha `2026-02-30` | registro la tarea | responde 400 con la lista de errores | FR-001, FR-004 |
| CA-04 | envío un JSON mal formado | registro la tarea | responde 400 "JSON mal formado" | FR-004 |
| CA-05 | tareas con fechas distintas | consulto la lista | aparecen de la más próxima a la más lejana | FR-005 |
| CA-06 | dos tareas con la misma fecha | consulto la lista | primero `alta`, luego `media` y luego `baja` | FR-005 |
| CA-07 | tareas de "Redes" y "Gestión" | filtro `subject=redes` | solo aparecen las de "Redes" | FR-006 |
| CA-08 | — | filtro `priority=urgente` | responde 400 | FR-006 |
| CA-09 | una tarea existente | edito solo la prioridad | los demás campos no cambian y `updatedAt` se actualiza | FR-008 |
| CA-10 | una tarea `pendiente` | la paso a `en_progreso` o `completada` | se acepta el cambio | FR-007 |
| CA-11 | una tarea `completada` | intento cambiarle el estado | responde 409 | FR-007 |
| CA-12 | una tarea existente | envío `status` en la edición general | responde 400 | FR-008 |
| CA-13 | una tarea existente | la elimino | responde 204 y deja de aparecer | FR-009 |
| CA-14 | un `id` inexistente | consulto o elimino | responde 404 | FR-011 |
| CA-15 | tareas guardadas | reinicio el servidor | las tareas siguen disponibles | FR-010 |

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

| # | Pregunta | Responsable | Resolución |
|---|---|---|---|
| Q1 | ¿Se aceptan fechas de entrega ya pasadas? | Product Owner | ✅ **Sí.** El estudiante puede registrar tareas atrasadas. |
| Q2 | ¿Una tarea `completada` se puede reabrir? | Product Owner | ✅ **No.** Es un estado final; para rehacerla se crea una tarea nueva. |
| Q3 | ¿El filtro de materia distingue mayúsculas? | Product Owner | ✅ **No.** `redes` = `Redes`. |
| Q4 | ¿Cuántas tareas debe soportar un estudiante? | Product Owner | ✅ Hasta **1 000** con buen rendimiento (→ NFR-002). |
| Q5 | ¿Se necesita multiusuario? | Product Owner | ⏭️ Pasa a la iteración 2 (`002-usuarios`). |

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
