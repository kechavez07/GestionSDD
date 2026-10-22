# TaskFlow – API de gestión de tareas académicas

Proyecto desarrollado con **Desarrollo Guiado por Especificaciones (SDD)** usando el flujo de GitHub Spec Kit (iteración 1).

## Requisitos

- Node.js ≥ 20 (no requiere `npm install`, no tiene dependencias)

## Uso

```bash
npm start            # inicia en http://localhost:3000
npm test             # ejecuta las 35 pruebas
npm run coverage     # pruebas + reporte de cobertura
```

Variables de entorno opcionales: `PORT` (por defecto 3000) y `DATA_FILE` (por defecto `data/tasks.json`).

## Ejemplos

```bash
curl -X POST http://localhost:3000/tasks -H "Content-Type: application/json" \
  -d '{"title":"Entregar informe SDD","subject":"Gestion","dueDate":"2026-10-28","priority":"alta"}'

curl "http://localhost:3000/tasks?status=pendiente"
curl -X PATCH http://localhost:3000/tasks/<id>/status -H "Content-Type: application/json" -d '{"status":"en_progreso"}'
curl -X DELETE http://localhost:3000/tasks/<id>
```

## Artefactos SDD

| Fase | Comando | Documento |
|---|---|---|
| 1. Constitución | `/speckit-constitution` | `.specify/memory/constitution.md` |
| 2. Especificación | `/speckit-specify` | `specs/001-gestion-tareas/spec.md` |
| 3. Planificación | `/speckit-plan` | `specs/001-gestion-tareas/plan.md` |
| 4. Tareas | `/speckit-tasks` | `specs/001-gestion-tareas/tasks.md` |
| 5. Implementación | `/speckit-implement` | `specs/001-gestion-tareas/implement-report.md` + `src/`, `tests/` |
| 6. Auditoría | `/speckit-converge` (coverage) | `specs/001-gestion-tareas/coverage-audit.md` |
