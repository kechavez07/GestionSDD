# Documento de Auditoría: Cobertura y Convergencia (Iteración 1)

> **Fase SDD:** 5 – Validar | **Comando Spec Kit:** `/speckit-converge` (auditoría de cobertura, *Speckit-coverage*)
> **Autor:** Kleber Enrique Chávez Oscullo | **Rama:** `001-nucleo-sesion-segura` | **Fecha de auditoría:** 2026-10-22
> **Auditado contra:** documento de arquitectura de la tesis (D1–D12, diagramas 1–10, hallazgos de LoginSWS #1–#16) · [`constitution.md`](../../.specify/memory/constitution.md) · [`spec.md`](./spec.md) · [`plan.md`](./plan.md) · [`tasks.md`](./tasks.md) · [`implement.md`](./implement.md)

---

## 1. Dictamen

| Dimensión | Estado |
|---|---|
| **Especificación** (constitución → spec → plan → tareas) | ✅ **CONVERGED (documental)**: cobertura completa y consistente con la arquitectura, con 2 preguntas abiertas asignadas |
| **Implementación** (código → pruebas → cobertura) | ⏳ **NO INICIADA**: no hay código, así que no se puede medir la cobertura de código |
| **Estado global de la iteración** | 🟡 **NOT CONVERGED: pendiente de implementación (G4) y de validación (G5)** |

> Esta auditoría verifica la **cobertura de la especificación**: que cada decisión de arquitectura y cada hallazgo de LoginSWS en alcance tenga requisito, diseño, tarea y prueba planificada. La **cobertura de código** (líneas y ramas) y la ejecución de los criterios de aceptación se auditarán al terminar T034.

| Métrica documental | Resultado |
|---|---|
| Decisiones base D1–D12 con tratamiento definido | **12 / 12** (7 cubiertas, 3 parciales y 2 diferidas a la spec 002 con justificación) |
| Hallazgos de LoginSWS en alcance cerrados por requisitos | **9 / 9** (#1, #5, #7, #8, #9, #11, #12, #13 y #14), más 1 parcial (#16) |
| Requisitos con ID y formato EARS | **25 FR + 9 NFR** |
| Requisitos cubiertos por ≥ 1 tarea | **34 / 34** |
| Requisitos funcionales con ≥ 1 criterio de aceptación | **25 / 25** |
| Criterios de aceptación con tarea de prueba asignada | **22 / 22** |
| Diagramas de la arquitectura con tratamiento en el plan | **10 / 10** (8 usados y 2 diferidos) |
| Principios de la Constitución verificados en el plan | **10 / 10 aplicables** (VI no aplica) |
| Puertas de revisión | G0–G3 con checklist completo · G4–G5 pendientes |

---

## 2. Cobertura de las decisiones base de la arquitectura (D1–D12)

| ID | Decisión | Requisitos | Diseño | Tareas | Estado |
|---|---|---|---|---|---|
| D1 | BFF con cookie `__Host-sid`, ningún token en el navegador | FR-003, FR-007, FR-009 | plan §5, ADR-03 | T016, T020, T021, T032 | ✅ Cubierta |
| D2 | Mismo origen por rutas | Constitución III | plan §4, §9 | T013 | ✅ Cubierta *(ver AUD-03)* |
| D3 | `authFetch` / cliente GraphQL + `X-CSRF-Token` | FR-010, FR-011, FR-018 | plan §6, ADR-07 | T022, T023, T026 | ✅ Cubierta |
| D4 | Logout multipestaña con `BroadcastChannel` | FR-018 | plan §4 (shell) | T026, T032 | ✅ Cubierta |
| D5 | Token interno ES256, `aud` único, ≤ 5 min | FR-012, FR-014 | plan §7, ADR-09 | T008–T011, T023, T024 | ✅ Cubierta |
| D6 | Red interna; solo el proxy publica puertos; Zero Trust declarado | NFR-003 | plan §10 | T004, T033 | ✅ Cubierta (mTLS declarado fuera de alcance) |
| D7 | GraphQL en el BFF; plan B sin supergrafo | FR-010 a FR-016 | ADR-02 | T023 | 🟡 Parcial: plan B; el supergrafo depende de S1 (spec 004) |
| D8 | La imagen facial no viaja por GraphQL | — | — | — | ⏭️ Diferida (spec 002): no hay biometría en esta iteración |
| D9 | Segundo factor decidido en el servidor | FR-003 a FR-008 | plan §5, ADR-01 | T014–T021 | 🟡 Parcial: ruta TOTP completa; la ruta facial va en la spec 002 |
| D10 | Plantillas biométricas cifradas y LOPDP | — | — | — | ⏭️ Diferida (spec 002) |
| D11 | Límites de intentos | FR-020, FR-021 | plan §8 (`estado_bloqueo`) | T020, T028 | 🟡 Parcial: contraseña y TOTP; los contadores faciales (5 → 30 s, 50 → deshabilitar) van en la spec 002 |
| D12 | BD por servicio y auditoría con `correlation_id` | FR-024, FR-025, NFR-007 | plan §8, §10 | T007, T031 | ✅ Cubierta |

## 3. Cobertura de los hallazgos de Proyecto_LoginSWS (diagrama 9)

| Hallazgo | Severidad | Requisito que lo cierra | Tarea | Estado en la iteración 1 |
|---|---|---|---|---|
| #1 2FA solo en el cliente | Crítica | FR-003, FR-004, FR-007 | T016, T017, T020 | ✅ Cerrado para la ruta TOTP |
| #2 Fotos en GitHub | Crítica | — | — | ⏭️ Spec 002 |
| #3 Anti-spoofing incorrecto | Crítica | — | — | ⏭️ Spec 002 |
| #4 Liveness en el cliente | Crítica | — | — | ⏭️ Spec 002 |
| #5 Clave JWT por defecto | Crítica | NFR-004 | T005, T006 | ✅ Cerrado |
| #6 Enrolamiento sin autenticación | Alta | — | — | ⏭️ Spec 002 |
| #7 Cambio de contraseña sin la actual | Alta | FR-023 | T030 | ✅ Cerrado |
| #8 IDOR | Alta | FR-015 | T024 | ✅ Cerrado (en `admin-svc`; se replica en cada subgrafo) |
| #9 Sin rate limiting | Alta | FR-020, FR-021, FR-022 | T020, T028, T029 | ✅ Cerrado |
| #10 Oráculo de unicidad | Alta | — | — | ⏭️ Spec 002 |
| #11 HTTP plano | Media | NFR-001 | T013 | ✅ Cerrado |
| #12 JWT en `localStorage` | Media | FR-003, FR-009 | T016, T021, T032 | ✅ Cerrado |
| #13 Enumeración | Media | FR-002 | T014, T015 | ✅ Cerrado |
| #14 Fuga de detalles | Media | NFR-006 | T031 | ✅ Cerrado |
| #15 Path traversal | Baja | — | — | ⏭️ Spec 002 (sistema de archivos biométrico) |
| #16 Supply chain / Swagger | Baja | NFR-005, Constitución IX | T002, T003, T024 | 🟡 Parcial: Swagger e introspección off; SRI de MediaPipe en la spec 003 |

**Resumen:** de los 16 hallazgos, **9 se cierran**, **1 es parcial** y **6 se difieren** a la spec 002. Todos los diferidos son biométricos y dependen del spike S3, por lo que **ningún hallazgo queda sin destino**.

## 4. Trazabilidad requisito → criterio de aceptación → tarea de prueba

| Requisito | CA | Tarea de prueba | Requisito | CA | Tarea de prueba |
|---|---|---|---|---|---|
| FR-001 | CA-01 | T014 | FR-014 | CA-10, CA-11 | T010, T024 |
| FR-002 | CA-02 | T014 | FR-015 | CA-12 | T024 |
| FR-003 | CA-01 | T016 | FR-016 | CA-22 | T023 |
| FR-004 | CA-03 | T017 | FR-017 | CA-13 | T025 |
| FR-005 | CA-04 | T018 | FR-018 | CA-13 | T026, T032 |
| FR-006 | CA-05 | T018 | FR-019 | CA-14 | T012, T027 |
| FR-007 | CA-04 | T020 | FR-020 | CA-20 | T028 |
| FR-008 | CA-06 | T020 | FR-021 | CA-15 | T020 |
| FR-009 | CA-07 | T021 | FR-022 | CA-21 | T029 |
| FR-010 | CA-08 | T022 | FR-023 | CA-16 | T030 |
| FR-011 | CA-08 | T022 | FR-024 | CA-17 | T031 |
| FR-012 | CA-09 | T008, T023 | FR-025 | CA-17 | T031 |
| FR-013 | CA-19 | T009, T033 | | | |

| NFR | Verificación planificada | Tarea |
|---|---|---|
| NFR-001, NFR-002 | `curl -I` (cabeceras) | T013 |
| NFR-003 | Escaneo de puertos (CA-18) | T004, T033 |
| NFR-004 | Arranque sin secret → falla | T005, T006 |
| NFR-005 | `/docs` → 404; introspección deshabilitada | T003, T024 |
| NFR-006 | Captura de logs y respuestas de error | T031 |
| NFR-007 | Revisión de los `GRANT` por servicio | T004, T007 |
| NFR-008 | autocannon: p95 < 50 ms | T033 |
| NFR-009 | Reporte de cobertura por servicio | T034 |

## 5. Cobertura de los diagramas de la arquitectura

| Diagrama | Tratamiento | Dónde |
|---|---|---|
| 1. Contexto C4 | ✅ Usado (actores, frontera; SMTP como *stub*) | spec §1, plan §4 |
| 2. Contenedores C4 | ✅ Usado (subconjunto Z0/Z1/Z2/Z4) | plan §4 |
| 3. Login biométrico | ✅ Usado en su **variante TOTP** | plan §5 |
| 4. Propagación de sesión | ✅ Usado (con `admin-svc` como subgrafo) | plan §6 |
| 5. DFD / STRIDE | ✅ Usado (ver §6 de esta auditoría) | — |
| 6. Modelo de datos | ✅ Usado (subconjunto de `auth-db` y Redis) | plan §8 |
| 7. Enrolamiento biométrico | ⏭️ Diferido (spec 002) | — |
| 8. Ciclo de vida de la sesión | ✅ Usado (6 de 9 estados; los biométricos van en la spec 002) | spec FR-003, FR-004, FR-007, FR-019 |
| 9. Antes / después | ✅ Usado (§3 de esta auditoría) | — |
| 10. Despliegue | ✅ Usado (subconjunto de redes y servicios) | plan §10 |

## 6. Revisión STRIDE de los elementos en alcance (diagrama 5)

| Elemento / flujo | Amenaza | Control especificado | Req. | Residual |
|---|---|---|---|---|
| P3 `bff` | **S** robo de cookie | HttpOnly, Secure, SameSite=Strict, `__Host-`; hash del `sid` en Redis | FR-007, ADR-06 | XSS en el shell puede *usar* la sesión (no robarla) → CSP (NFR-002) |
| P3 `bff` | **T** CSRF | Token sincronizador + `Origin` + exigir JSON | FR-010, FR-011 | Bajo |
| P3 `bff` | **E** sesión pendiente usada como activa | Cookie y almacén separados; guard | FR-004, ADR-03 | Bajo |
| F5 `bff` → `auth-svc` | **I** intercepción interna | Red interna, `aud` único | NFR-003, FR-012 | **mTLS no cubierto** (declarado, REC-1) |
| A6 / P6 subgrafo | **S** reutilización lateral del token; **E** escalamiento | `aud` por servicio, ≤ 5 min, rol + propiedad | FR-012, FR-014, FR-015 | Bajo |
| P4 `auth-svc` | **D** fuerza bruta | Rate limit en el borde + contadores + bloqueo | FR-020 a FR-022 | DoS por bloqueo de cuentas legítimas (ver AUD-02) |
| P4 `auth-svc` | **I** enumeración | Respuesta uniforme + hash ficticio | FR-002, ADR-05 | Bajo |
| D6 secrets | **I** exposición de claves | Docker secrets; arranque fallido; rotación por `kid` | NFR-004, plan §7 | Bajo |
| D5 auditoría | **R** negación de acciones | `correlation_id`, tabla de solo inserción | FR-024 | Bajo |
| A9 secreto TOTP | **I** filtración de `auth-db` | AES-256-GCM con `key_id` | ADR-11 | Bajo |

## 7. Auditoría contra la Constitución

| Principio | Verificación documental | Resultado |
|---|---|---|
| I. Spec como fuente de verdad | Las tareas y ADR citan sus requisitos; las preguntas abiertas están registradas | ✅ |
| II. Ningún token en el navegador | FR-003, FR-009 y SC-001; prueba e2e T032 | ✅ |
| III. Mismo origen | Rutas en Caddy (T013) | ✅ *(AUD-03)* |
| IV. Zero Trust declarado | FR-012/FR-014 y NFR-003; mTLS declarado | ✅ |
| V. 2.º factor en el servidor | La transición a ACTIVA solo ocurre tras `auth-svc` (FR-007) | ✅ (ruta TOTP) |
| VI. Datos biométricos | — | N/A (spec 002) |
| VII. BD por servicio y auditoría | NFR-007, FR-024, FR-025 | ✅ |
| VIII. Errores genéricos | FR-002, NFR-006 | ✅ |
| IX. Secretos y supply chain | NFR-004, NFR-005, versiones fijadas (T002, T003) | ✅ |
| X. Pruebas trazables | Cada CA tiene su tarea de prueba; convención `[FR-xxx]` | ✅ (por ejecutar) |
| XI. Incrementos pequeños | 34 tareas, un commit por tarea | ✅ |

## 8. Revisión de antipatrones (guía SDD §12)

| Antipatrón | ¿Presente? | Evidencia |
|---|---|---|
| Deriva de la spec (*spec drift*) | ❌ No aplica todavía | No hay código; el registro de cambios está preparado (`implement.md` §8) |
| Sobre-especificación | ⚠️ Riesgo moderado | 34 tareas para un esqueleto; se justifica por ser la base de seguridad de toda la tesis |
| Spec que es código disfrazado | ❌ No | `spec.md` describe comportamiento; nombres de clases y librerías solo en `plan.md` |
| Aprobar sin leer | ⚠️ Pendiente | Las firmas del tutor en G1–G3 están en blanco y deben completarse antes de implementar |
| Falsa sensación de verificación | ❌ No | Se planifican e2e, escaneo de puertos y demostración manual (`implement.md` §6) |
| Waterfall encubierto | ❌ No | Solo se especifica la funcionalidad 001; 002–005 están en la hoja de ruta |
| Specs huérfanas | ❌ No | Una sola spec activa |

## 9. Hallazgos de la auditoría

| ID | Severidad | Descripción | Acción | Estado |
|---|---|---|---|---|
| AUD-01 | 🔴 Bloqueante para G5 | No hay implementación: no se pueden medir la cobertura de código ni la ejecución de los CA. | Ejecutar T001–T034 según `implement.md` | ⏳ Abierto |
| AUD-02 | 🟡 Menor | El umbral de bloqueo por contraseña (Q3) no está fijado en la arquitectura; un umbral bajo permite bloquear cuentas ajenas a propósito (DoS). | Que el tutor confirme el valor de 10; evaluar un desbloqueo temporal en lugar de manual | ⏳ Abierto (asignado) |
| AUD-03 | 🟡 Menor | La decisión D2 (mismo origen) no tiene un criterio de aceptación propio. | Agregar CA-23: "una petición con `Origin` de otro dominio a `/bff/*` no recibe cabeceras CORS" | ⏳ Abierto |
| AUD-04 | 🟡 Menor | Q1 (OIDC o aserción propietaria) sigue abierta; ADR-04 es provisional. | Decidir antes de S2; si se elige OIDC, enmendar el plan | ⏳ Abierto (asignado) |
| AUD-05 | 🟢 Observación | NFR-008 (< 50 ms p95) es una meta propuesta, sin línea base. | Medir una línea base en T033 y ajustar el valor si hace falta | Aceptado |
| AUD-06 | 🟢 Observación | SMTP es un *stub* en esta iteración: la notificación de bloqueo no llega a un correo real. | Integrar SMTP real en la spec 005 | Aceptado |

**Hallazgos críticos en la especificación: 0.** El único bloqueante (AUD-01) corresponde a la fase de implementación, no a la calidad de los documentos.

## 10. Historial de convergencia

| Ciclo | Fecha | Resultado | Motivo |
|---|---|---|---|
| 1 | 2026-10-22 | 🟡 Especificación CONVERGED · implementación no iniciada | Cobertura documental completa; quedan abiertos AUD-01 a AUD-04 |
| 2 | — | *(pendiente)* | Tras T034: cobertura de código, CA ejecutados y cierre de AUD-01 |

---

## ✅ Puerta G5 — Checklist antes de cerrar la funcionalidad

- [ ] Todos los criterios de aceptación se verificaron **ejecutándolos**. *(Pendiente: AUD-01)*
- [X] La spec refleja el comportamiento esperado y es coherente con la arquitectura (§2–§5).
- [ ] Las pruebas tienen nombres trazados a requisitos. *(Planificado con la convención `[FR-xxx]`; pendiente de ejecución)*
- [ ] La spec y el código se revisaron en el mismo PR. *(Pendiente: no hay código)*

**Dictamen:** la iteración 1 **no puede cerrarse** hasta ejecutar la implementación. La especificación queda **aprobada para implementar**.

**Auditor / elaborado por:** Kleber Enrique Chávez Oscullo · **Revisión del tutor:** ____________________, fecha: __________
