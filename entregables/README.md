# Plataforma Universitaria con Microfrontends y SSO Biométrico Facial: SDD, Iteración 1

**Autor:** Kleber Enrique Chávez Oscullo

> 📁 Carpeta de entregables: aquí están los 6 documentos SDD en Markdown y el documento completo. Repositorio: https://github.com/kechavez07/GestionSDD

Este repositorio aplica **Spec-Driven Development (SDD)** con el flujo de **GitHub Spec Kit** a la arquitectura de la tesis: un shell con cuatro microfrontends (React, Next.js y Angular), un BFF con cookie de sesión, tokens internos ES256 por servicio, GraphQL y autenticación de dos factores (contraseña + rostro, o TOTP como alternativa).

> *Decidir qué código debe existir es el trabajo real; escribirlo es cada vez más automatizable.*

| Iteración | Funcionalidad | Especificación | Implementación |
|---|---|---|---|
| **1** | `001-nucleo-sesion-segura`: contraseña + TOTP, BFF, token interno y un subgrafo | ✅ **CONVERGED (documental)** | ⏳ **No iniciada** (esta entrega es solo documental) |

| Requisitos | Criterios de aceptación | Tareas | Decisiones D1–D12 | Hallazgos de LoginSWS cerrados |
|---|---|---|---|---|
| 25 FR + 9 NFR (EARS) | 22 (Gherkin) | 34 | 7 cubiertas · 3 parciales · 2 diferidas | 9 de 16 (los 6 biométricos van en la spec 002) |

---

## 📦 Entregables SDD

| # | Fase SDD | Comando Spec Kit | En el repositorio (GitHub) | En esta carpeta | Puerta |
|---|---|---|---|---|---|
| 1 | **Constitución**: principios globales (D1–D12) | `/speckit-constitution` | [`constitution.md`](https://github.com/kechavez07/GestionSDD/blob/main/.specify/memory/constitution.md) | [01_Constitucion](./01_Constitucion_speckit-constitution.md) | G0 ✅ |
| 2 | **Especificación**: qué y por qué | `/speckit-specify` | [`spec.md`](https://github.com/kechavez07/GestionSDD/blob/main/specs/001-nucleo-sesion-segura/spec.md) | [02_Especificacion](./02_Especificacion_speckit-specify.md) | G1 ✅ |
| 3 | **Planificación**: cómo (diseño) | `/speckit-plan` | [`plan.md`](https://github.com/kechavez07/GestionSDD/blob/main/specs/001-nucleo-sesion-segura/plan.md) | [03_Planificacion](./03_Planificacion_speckit-plan.md) | G2 ✅ |
| 4 | **Tareas**: pasos pequeños | `/speckit-tasks` | [`tasks.md`](https://github.com/kechavez07/GestionSDD/blob/main/specs/001-nucleo-sesion-segura/tasks.md) | [04_Tareas](./04_Tareas_speckit-tasks.md) | G3 ✅ |
| 5 | **Implementación** de la iteración | `/speckit-implement` | [`implement.md`](https://github.com/kechavez07/GestionSDD/blob/main/specs/001-nucleo-sesion-segura/implement.md) | [05_Implementacion](./05_Implementacion_speckit-implement.md) | G4 ⏳ |
| 6 | **Auditoría**: cobertura y convergencia | `/speckit-converge` (*coverage*) | [`coverage-audit.md`](https://github.com/kechavez07/GestionSDD/blob/main/specs/001-nucleo-sesion-segura/coverage-audit.md) | [06_Auditoria](./06_Auditoria_speckit-coverage.md) | G5 ⏳ |
| ★ | **Documento completo** (las 6 fases) | — | — | [00_Documentacion_SDD_Completa](./00_Documentacion_SDD_Completa.md) | — |

Instrucciones para el agente de IA: [`AGENTS.md`](https://github.com/kechavez07/GestionSDD/blob/main/AGENTS.md) · [`CLAUDE.md`](https://github.com/kechavez07/GestionSDD/blob/main/CLAUDE.md)

---

## 🔄 Flujo aplicado

```
 ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
 │0. Constitución│→│1. Especificar│→│2. Planificar │→│ 3. Tareas    │→│4. Implementar│→│5. Auditar /  │
 │  G0 ✅        │ │  G1 ✅       │ │  G2 ✅       │ │  G3 ✅       │ │  G4 ⏳       │ │ Converger G5⏳│
 └──────────────┘  └──────┬───────┘  └──────────────┘  └──────────────┘  └──────────────┘  └──────┬───────┘
                          ▲                                                                       │
                          └─────────── si algo cambia, se actualiza primero la spec ◄─────────────┘
```

---

## 📋 Resumen de cada entregable

### 1. Constitución
- **Stack obligatorio** según la nomenclatura de la arquitectura (`shell`, `mf-*`, `edge-proxy`, `bff`, `auth-svc`, `bio-svc`, subgrafos, Redis y PostgreSQL).
- **11 principios** derivados de D1–D12. Entre ellos: *ningún token en el navegador*, *el segundo factor se decide en el servidor*, *Zero Trust reducido y declarado*, *LOPDP*, *una BD por servicio* y *errores genéricos*.
- Lista de **prohibiciones**, **spikes S1–S3** con su regla go/no-go, **puertas G0–G5** y **hoja de ruta 001–005**.

### 2. Especificación: `001-nucleo-sesion-segura`
- **Problema:** los hallazgos de Proyecto_LoginSWS (JWT antes del rostro, `localStorage`, HTTP plano, sin rate limiting, IDOR…).
- **7 historias de usuario**, **25 requisitos funcionales EARS**, **9 no funcionales** y **22 criterios de aceptación**.
- **Fuera de alcance** (biometría, MFE reales, supergrafo) con su spec destino, y **preguntas abiertas** (OIDC o aserción; umbral de bloqueo).

### 3. Planificación
- Recorte de los **10 diagramas** a la iteración: contenedores por zonas Z0–Z4, secuencia de login con la **variante TOTP**, propagación de sesión, **contrato del token interno**, modelo de datos (`auth-db` + Redis), API y despliegue con redes `internal`.
- **11 decisiones ADR** con sus alternativas descartadas, por ejemplo: iniciar por TOTP, el plan B de D7, una cookie separada para la sesión pendiente, y ES256 frente a HS256.

### 4. Tareas
- **34 tareas** en 10 fases, cada una con "Hecho cuando…", requisitos y dependencias; grafo y **matriz requisito → tarea**.

### 5. Implementación
- **Guía de ejecución** (todavía sin ejecutar): reglas, prompt para el agente, estructura de código, verificación por fase, demostración manual por historia y **bitácora** lista para llenar.

### 6. Auditoría
- Cobertura de **D1–D12**, de los **hallazgos #1–#16**, de los **10 diagramas** y de la trazabilidad FR → CA → tarea.
- Revisión **STRIDE** de los elementos en alcance y de los **antipatrones SDD**.
- **Dictamen:** especificación CONVERGED; iteración **NOT CONVERGED** mientras no exista la implementación (AUD-01).

---

## 🗂️ Estructura

```
.
├── README.md                              ← este resumen
├── AGENTS.md / CLAUDE.md                  ← instrucciones para el agente de IA
├── .specify/memory/constitution.md        ← 1. Constitución
├── specs/001-nucleo-sesion-segura/
│   ├── spec.md                            ← 2. Especificación
│   ├── plan.md                            ← 3. Planificación
│   ├── tasks.md                           ← 4. Tareas
│   ├── implement.md                       ← 5. Implementación (guía + bitácora)
│   └── coverage-audit.md                  ← 6. Auditoría
└── entregables/                           ← copias numeradas, documento completo y README
```

## 🔭 Hoja de ruta

| Spec | Funcionalidad | Depende de |
|---|---|---|
| **001** | Núcleo de sesión segura | — |
| 002 | Segundo factor biométrico (`bio-svc`, liveness, PAD, ArcFace, enrolamiento, LOPDP) | 001, spike S3 |
| 003 | Shell + microfrontends React, Next.js y Angular | 001, spike S2 |
| 004 | Subgrafos académico y biblioteca + supergrafo GraphQL | 001, spike S1 |
| 005 | Administración (usuarios, roles, revocación, reenrolamiento) | 001, 002 |
