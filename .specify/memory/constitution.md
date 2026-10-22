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

| Componente | Decisión |
|---|---|
| Lenguaje | JavaScript (CommonJS) |
| Entorno | Node.js ≥ 20 LTS (probado en 22.23) |
| Servidor HTTP | `node:http` nativo |
| Pruebas | `node:test` + `node:assert` + `fetch` nativo |
| Persistencia (iteración 1) | Archivo JSON local con escritura atómica |
| Dependencias de ejecución | **Ninguna** |

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

| Puerta | Artefacto | Aprueba | Criterio |
|---|---|---|---|
| G0 | `constitution.md` | Equipo | Consenso |
| G1 | `spec.md` (requisitos) | Product Owner | Checklist de §15 de la guía (requisitos) |
| G2 | `plan.md` (diseño) | Líder técnico | Checklist de diseño |
| G3 | `tasks.md` | Líder técnico | Checklist de tareas |
| G4 | Implementación | Revisor de código | Pruebas en verde y revisión del diff |
| G5 | Auditoría / validación | Product Owner + QA | Checklist de cierre y estado **CONVERGED** |

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
