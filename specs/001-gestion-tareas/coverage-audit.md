# Documento de Auditoría – Convergencia y Cobertura (Iteración 1)

> **Comando SDD:** `/speckit-converge` (auditoría de cobertura, *Speckit-coverage*)
> **Rama:** `001-gestion-tareas` | **Fecha de auditoría:** 2026-10-21
> **Auditado contra:** [`constitution.md`](../../.specify/memory/constitution.md), [`spec.md`](./spec.md), [`plan.md`](./plan.md) y [`tasks.md`](./tasks.md)

---

## 1. Dictamen

# ✅ ESTADO: CONVERGED

El código de la iteración 1 cumple la especificación, el plan técnico y los siete principios de la Constitución. No quedan hallazgos críticos ni mayores abiertos. Los dos hallazgos que encontró el bucle de verificación iterativa se corrigieron antes de este dictamen (ver §6).

| Dimensión auditada | Resultado |
|---|---|
| Cobertura de código (líneas / ramas / funciones) | **100 % / 100 % / 100 %** ✅ |
| Pruebas automatizadas | **35 / 35 pasan** ✅ |
| Requisitos funcionales con prueba trazable | **11 / 11** ✅ |
| Requisitos no funcionales verificados | **5 / 5** ✅ |
| Escenarios de aceptación cubiertos | **15 / 15** ✅ |
| Tareas completadas | **26 / 26** ✅ |
| Principios de la Constitución | **7 / 7** ✅ |

---

## 2. Cobertura de código

Comando: `npm run coverage` (Node.js 22.23.2, `--experimental-test-coverage`; incluye `src/**` y excluye `src/server.js`, que es solo el arranque).

```
# tests 35 | suites 7 | pass 35 | fail 0
# --------------------------------------------------------------------
# file                | line % | branch % | funcs % | uncovered lines
# --------------------------------------------------------------------
#  domain/task.js           | 100.00 |   100.00 |  100.00 |
#  http/app.js              | 100.00 |   100.00 |  100.00 |
#  repository/taskRepository| 100.00 |   100.00 |  100.00 |
#  services/taskService.js  | 100.00 |   100.00 |  100.00 |
# --------------------------------------------------------------------
# all files                 | 100.00 |   100.00 |  100.00 |
# --------------------------------------------------------------------
```

| Métrica | Umbral (Constitución III) | Obtenido | Estado |
|---|---|---|---|
| Líneas | ≥ 90 % | 100 % | ✅ |
| Ramas | ≥ 85 % | 100 % | ✅ |
| Funciones | ≥ 90 % | 100 % | ✅ |

**Exclusión justificada:** `src/server.js` (16 líneas) solo lee variables de entorno y llama a `listen()`. Se verificó con la prueba manual (smoke test) documentada en `implement-report.md` §5.

---

## 3. Matriz de trazabilidad: requisitos → código → pruebas

| Req. | Descripción breve | Implementación | Pruebas que lo verifican | Estado |
|---|---|---|---|---|
| FR-001 | Campos y longitudes de la tarea | `domain/task.js` `validateTaskInput` | domain: *exige title, subject y dueDate*, *rechaza title vacío o demasiado largo*, *rechaza description…*; api: *400 con detalles* | ✅ |
| FR-002 | UUID, estado inicial y timestamps | `domain/task.js` `createTask` | domain: *asigna id, valores por defecto y timestamps* | ✅ |
| FR-003 | Prioridad enum, por defecto `media` | `domain/task.js` | domain: *rechaza prioridad inválida*, *asigna … valores por defecto* | ✅ |
| FR-004 | 400 con lista de errores | `ValidationError` → `http/app.js` | domain: *lanza ValidationError con detalles*; api: *400 con detalles*, *400 con JSON mal formado*, *POST sin cuerpo* | ✅ |
| FR-005 | Orden por fecha y prioridad | `taskService.list` | service: *US2: lista ordenada por fecha de entrega y prioridad* | ✅ |
| FR-006 | Filtros por estado, prioridad y materia | `taskService.list` | service: *US2: filtra…*, *US2: rechaza filtros inválidos*; api: *400 con filtro inválido* | ✅ |
| FR-007 | Máquina de estados, 409 | `canTransition`, `changeStatus` | domain: *permite transiciones válidas*, *bloquea transiciones…*; service: *US3: cambia estado…*; api: *409 ante transición…* | ✅ |
| FR-008 | Edición parcial | `taskService.update` | service: *US3: edita campos…*, *US3: rechaza edición inválida*; domain: *en modo parcial…*, *no permite fijar status* | ✅ |
| FR-009 | Eliminar | `taskService.remove`, `DELETE` | service: *US4: elimina tarea…*; api: *flujo completo* | ✅ |
| FR-010 | Persistencia entre reinicios | `TaskRepository.persist/load` | service: *persiste y recarga tareas desde disco*, *tolera un archivo vacío* | ✅ |
| FR-011 | 404 para id inexistente | `NotFoundError` | service: *US4: elimina…* (get/remove); api: *flujo completo* (GET tras DELETE) | ✅ |

### Requisitos no funcionales

| Req. | Verificación | Evidencia | Estado |
|---|---|---|---|
| NFR-001 JSON UTF-8 | Cabecera `application/json; charset=utf-8` en `send()` | api: todas las respuestas se parsean como JSON | ✅ |
| NFR-002 < 200 ms con 1 000 tareas | Prueba de carga: 1 000 tareas, 50 peticiones `GET /tasks?subject=redes` | **p50 = 15,1 ms · p95 = 17,9 ms · máx = 51,0 ms** | ✅ |
| NFR-003 Cobertura | `npm run coverage` | §2 (100 %) | ✅ |
| NFR-004 Seguridad | 413, 500 genérico, `nosniff` | api: *413 si el cuerpo excede el límite*, *500 genérico sin filtrar detalles internos*, *GET /health* (nosniff) | ✅ |
| NFR-005 Sin dependencias | `package.json` sin `dependencies` | inspección | ✅ |

### Escenarios de aceptación (spec §2)

| Historia | Escenarios | Cubiertos |
|---|---|---|
| US1 Registrar | 4 | 4 ✅ |
| US2 Consultar | 5 | 5 ✅ |
| US3 Editar/Estado | 4 | 4 ✅ |
| US4 Eliminar | 2 | 2 ✅ |
| **Total** | **15** | **15** |

---

## 4. Auditoría contra la Constitución

| Principio | Verificación realizada | Resultado |
|---|---|---|
| **I. Especificación antes que código** | Existen `spec.md`, `plan.md` y `tasks.md` previos al código; los módulos de `src/` referencian `spec.md`, `plan.md` o `constitution.md` en sus comentarios | ✅ Cumple |
| **II. Arquitectura por capas** | `domain/task.js` solo importa `node:crypto`; `services` importa `domain`; `http` importa `services` y `domain` (solo tipos de error). No hay dependencias inversas | ✅ Cumple |
| **III. Pruebas y cobertura** | 35 pruebas en tres niveles; cobertura del 100 % (> umbrales) | ✅ Cumple |
| **IV. Mínimas dependencias** | 0 dependencias, solo módulos `node:*` | ✅ Cumple |
| **V. Seguridad por diseño** | Validación en el dominio; límite de 10 KB; 500 sin detalles; `nosniff`; configuración por variables de entorno; sin secretos | ✅ Cumple |
| **VI. Contratos y errores consistentes** | Los 7 endpoints coinciden con la tabla de `plan.md` §6; formato `{error, details?}` uniforme | ✅ Cumple |
| **VII. Documentación viva** | Seis artefactos versionados junto al código; `tasks.md` marcado con `[X]` | ✅ Cumple |

## 5. Conformidad con el plan técnico

| Elemento del plan | ¿Implementado según el plan? |
|---|---|
| Estructura de carpetas (§4) | ✅ Idéntica |
| Modelo de datos (§5) | ✅ Mismos 9 atributos |
| Máquina de estados (§5) | ✅ `TRANSITIONS` coincide con el diagrama |
| Contrato de API (§6) | ✅ 7/7 rutas y códigos |
| Decisiones (§7): `node:http`, JSON atómico, `node:test`, endpoint de estado separado, copias defensivas | ✅ 5/5 |

---

## 6. Hallazgos

| ID | Severidad | Descripción | Estado |
|---|---|---|---|
| AUD-01 | 🔴 Mayor | Cuerpos > 10 KB cortaban la conexión en lugar de responder 413 (violaba los Principios V y VI). | ✅ **Corregido** en la iteración (ver `implement-report.md` §4) |
| AUD-02 | 🟡 Menor | Rama muerta en `taskService.update` (cobertura de ramas de 97,37 %). | ✅ **Corregido** |
| AUD-03 | 🟢 Observación | La escritura en archivo JSON no soporta varios procesos a la vez. Es aceptable para el alcance de un usuario (riesgo documentado en `plan.md` §9). | Aceptado – iteración 2 |
| AUD-04 | 🟢 Observación | La cobertura de Node es *experimental*. Se recomienda fijar la versión de Node en CI. | Aceptado |

**Hallazgos críticos o mayores abiertos: 0**

## 7. Historial del ciclo de convergencia

| Ciclo | Resultado | Motivo |
|---|---|---|
| 1 | ❌ Fallo de convergencia | 1 prueba fallaba (413) y la cobertura de ramas era < 100 % |
| 2 | ✅ **CONVERGED** | 35/35 pruebas pasan, 100 % de cobertura y 0 hallazgos abiertos de severidad mayor |

## 8. Recomendaciones para la iteración 2

1. Agregar usuarios y autenticación (nueva especificación `002-usuarios`).
2. Migrar a SQLite o PostgreSQL y actualizar `plan.md` (en *Complexity Tracking* se justificaría la dependencia).
3. Integrar `npm run coverage` en un pipeline de CI (GitHub Actions) que falle si la cobertura baja del umbral.
4. Agregar pruebas de carga automatizadas para NFR-002.

---

**Firma de auditoría:** agente de IA (Spec Kit `/speckit-converge`), revisado por el equipo de desarrollo, 2026-10-21.
