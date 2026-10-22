# Instrucciones para agentes de IA

Proyecto: **Plataforma universitaria con microfrontends y SSO biométrico facial**. Se desarrolla con **Spec-Driven Development** (nivel *spec-anchored*); la especificación es la fuente de verdad.

## Antes de programar

1. Lee `.specify/memory/constitution.md`: principios no negociables, stack y lista de prohibiciones.
2. Lee la spec de la funcionalidad en `specs/<nnn-funcionalidad>/`:
   - `spec.md`: qué hay que construir y por qué (requisitos EARS y criterios de aceptación).
   - `plan.md`: cómo construirlo (contenedores, secuencias, contratos y ADR).
   - `tasks.md`: los pasos, con su "Hecho cuando…".
   - `implement.md`: la guía de ejecución y la bitácora.

## Reglas al implementar

- Implementa **SOLO la tarea indicada**. No toques archivos que esa tarea no requiera.
- Escribe primero la prueba, nombrada con el ID del requisito: `test('[FR-012] …')`.
- **Nunca** envíes un token al navegador; solo cookies `__Host-` (HttpOnly, Secure, SameSite=Strict).
- **Nunca** emitas `__Host-sid` antes de completar el segundo factor.
- **Nunca** registres en logs contraseñas, códigos TOTP, cookies, tokens ni datos biométricos.
- **Nunca** publiques puertos de backends o bases de datos, ni uses secretos con valores por defecto.
- No agregues dependencias sin justificarlas en *Complexity Tracking* del `plan.md`.
- Al terminar: ejecuta las pruebas del servicio, marca la tarea `[X]`, registra la ejecución en la bitácora de `implement.md` y haz un commit `T0xx: …`.
- **Si algo contradice la spec o es ambiguo, detente y pregunta.** Si el comportamiento cambia, edita primero la spec.

## Prompt típico

```text
Lee .specify/memory/constitution.md y specs/001-nucleo-sesion-segura/{spec,plan,tasks}.md.
Implementa SOLO la tarea T016 de tasks.md.
No modifiques otros archivos fuera de lo que T016 requiere.
Al terminar, ejecuta las pruebas, marca T016 como completada y haz commit "T016: …".
Si encuentras algo que contradice la spec, detente y pregúntame.
```
