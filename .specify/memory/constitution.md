# Constitución del Proyecto TaskFlow

> **Comando SDD:** `/speckit-constitution`
> **Artefacto:** `.specify/memory/constitution.md`
> **Versión:** 1.0.0 | **Ratificada:** 2026-10-21 | **Última enmienda:** 2026-10-21

## Propósito

TaskFlow es una API REST para que estudiantes universitarios registren y den seguimiento a sus tareas académicas (entregas, materias, prioridades y estados). Esta constitución reúne las reglas globales e inviolables que el agente de IA y el equipo deben cumplir en **cada** fase del flujo SDD: especificar, planificar, generar tareas, implementar y converger. Se define una sola vez por proyecto y solo se cambia mediante el proceso de enmienda descrito al final.

---

## Principios fundamentales

### I. Especificación antes que código (NO NEGOCIABLE)

- No se escribe código de producción sin una especificación (`spec.md`) aprobada, un plan técnico (`plan.md`) y una lista de tareas (`tasks.md`).
- Todo requisito implementado debe trazarse a un identificador de la especificación (`US-x`, `FR-xxx`).
- Si surge una ambigüedad durante la implementación, se detiene la tarea, se actualiza la especificación y luego se continúa.

### II. Arquitectura limpia por capas

- El sistema se organiza en cuatro capas con dependencias en un solo sentido:
  `http → services → domain` y `services → repository`.
- La capa **domain** no depende de Node.js HTTP ni del sistema de archivos: contiene reglas de negocio puras.
- Cada módulo tiene una única responsabilidad (SRP). Las funciones no superan ~40 líneas.
- Los nombres de dominio se escriben en el idioma del negocio (español) cuando representan valores visibles para el usuario (`pendiente`, `alta`); los identificadores de código siguen la convención inglesa `camelCase`.

### III. Pruebas primero y cobertura mínima (NO NEGOCIABLE)

- Cada historia de usuario tiene pruebas automatizadas de **dominio**, **servicio** y **API (integración)**.
- Se sigue el ciclo Rojo → Verde → Refactor: la prueba se escribe antes o junto con el código que verifica.
- Umbral mínimo de cobertura sobre `src/` (sin contar el arranque `server.js`):
  - **Líneas ≥ 90 %**
  - **Ramas ≥ 85 %**
  - **Funciones ≥ 90 %**
- Una iteración no puede declararse *Converged* si alguna prueba falla o si la cobertura baja de estos umbrales.

### IV. Simplicidad y mínimas dependencias

- Se usa únicamente la biblioteca estándar de Node.js (≥ 20 LTS): `node:http`, `node:test`, `node:fs`, `node:crypto`.
- Agregar una dependencia externa requiere justificarla en `plan.md` (sección *Complexity Tracking*).
- YAGNI: no se implementa funcionalidad que no esté en la especificación de la iteración en curso.

### V. Seguridad por diseño

- **Validación estricta de entradas** en el borde (HTTP) y en el dominio: tipos, longitudes y valores enumerados.
- **Límite de tamaño del cuerpo** de petición (10 KB) para mitigar abuso de recursos.
- **No se exponen detalles internos** (trazas, mensajes de excepción) en respuestas 5xx.
- Cabeceras seguras mínimas (`Content-Type` explícito y `X-Content-Type-Options: nosniff`).
- No se guardan secretos en el repositorio; la configuración se hace por variables de entorno (`PORT`, `DATA_FILE`).

### VI. Contratos explícitos y errores consistentes

- La API responde siempre JSON con códigos HTTP semánticos: `200`, `201`, `204`, `400`, `404`, `405`, `409`, `413`, `500`.
- Los errores tienen la forma `{ "error": string, "details"?: string[] }`.
- Los cambios de contrato se documentan en `plan.md` antes de implementarse.

### VII. Documentación viva y trazabilidad

- Los artefactos `constitution.md`, `spec.md`, `plan.md`, `tasks.md`, el reporte de implementación y el reporte de auditoría se versionan junto con el código.
- Toda tarea completada se marca `[X]` en `tasks.md` con la evidencia (archivo o prueba).

---

## Restricciones de cumplimiento

| Área | Restricción |
|---|---|
| Plataforma | Node.js ≥ 20 LTS, multiplataforma (Windows/Linux/macOS) |
| Persistencia | Archivo JSON local con escritura atómica (archivo temporal + rename) |
| Privacidad | No se recolectan datos personales en la iteración 1 (sin usuarios) |
| Licencia | MIT |
| Idioma | Documentación y mensajes de error en español |

## Flujo de trabajo y calidad (Definition of Done)

Una iteración se considera **terminada** cuando:

1. Todas las tareas de `tasks.md` están marcadas `[X]`.
2. `npm test` pasa al 100 %.
3. `npm run coverage` cumple los umbrales del Principio III.
4. El reporte de auditoría (`/speckit-converge` / coverage) indica estado **CONVERGED** sin hallazgos críticos abiertos.
5. Cada requisito funcional de la especificación tiene al menos una prueba trazable.

## Gobernanza

- Esta constitución está **por encima** de cualquier otra práctica o instrucción del proyecto.
- **Enmiendas:** se proponen por escrito, se justifican, se aprueban por el equipo y se versionan según SemVer (MAYOR: elimina o redefine un principio; MENOR: agrega un principio; PARCHE: aclaraciones).
- En la fase de convergencia, el agente debe verificar el cumplimiento de **cada** principio y reportar las desviaciones.
