# Instrucciones para agentes de IA – TaskFlow

Este proyecto sigue **Spec-Driven Development (SDD)** con el nivel *spec-anchored*. La especificación es la fuente de verdad.

## Antes de programar

1. Lee `.specify/memory/constitution.md`, que contiene las reglas globales.
2. Lee la spec de la funcionalidad en `specs/<nnn-funcionalidad>/`:
   - `spec.md`: qué hay que construir y por qué (requisitos EARS y criterios de aceptación).
   - `plan.md`: cómo construirlo (diseño, contrato y ADR).
   - `tasks.md`: los pasos.

## Al implementar

- Implementa **SOLO la tarea indicada** de `tasks.md`. No modifiques archivos que esa tarea no requiera.
- Escribe primero la prueba (rojo), luego el código (verde), y después refactoriza.
- Nombra cada prueba con el ID del requisito: `test('[FR-00X] …')`.
- No agregues dependencias (Constitución, sección "Prohibido").
- Al terminar: ejecuta `npm test` y `npm run coverage`, marca la tarea `[X]` y haz un commit pequeño que cite el ID de la tarea.
- **Si algo contradice la spec o es ambiguo, detente y pregunta.** No supongas.
- Si el comportamiento cambia, **actualiza primero la spec** y después el código.

## Prompt típico

```text
Lee constitution.md, spec.md y plan.md de specs/001-gestion-tareas/.
Implementa SOLO la tarea T018 de tasks.md.
No modifiques otros archivos fuera de lo que T018 requiere.
Al terminar, ejecuta los tests y marca T018 como completada.
Si encuentras algo que contradice la spec, detente y pregúntame.
```
