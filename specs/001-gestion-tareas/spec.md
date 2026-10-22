# Especificación de Funcionalidad: Gestión de Tareas Académicas

> **Comando SDD:** `/speckit-specify`
> **Rama de la funcionalidad:** `001-gestion-tareas`
> **Creado:** 2026-10-21 | **Estado:** Aprobado para la iteración 1
> **Entrada (intención humana):** "Necesito una aplicación donde los estudiantes registren sus tareas de cada materia, con fecha de entrega y prioridad, puedan ver qué tienen pendiente ordenado por lo más urgente, marcar su avance y eliminar lo que ya no sirve."

---

## 1. Contexto y problema (el *por qué*)

Los estudiantes llevan varias materias a la vez y anotan sus entregas en lugares dispersos (cuadernos, chats, calendarios). Por eso se les olvidan fechas y no saben qué tarea atender primero. **TaskFlow** centraliza las tareas académicas y las ordena por urgencia.

### Objetivos del producto

- **O1:** Reducir las entregas olvidadas con un registro único de tareas.
- **O2:** Ayudar a priorizar con una vista ordenada por fecha de entrega y prioridad.
- **O3:** Permitir seguir el avance de cada tarea (pendiente → en progreso → completada).

### Alcance de la iteración 1

| Incluido | Excluido (iteraciones futuras) |
|---|---|
| CRUD de tareas | Usuarios, registro e inicio de sesión |
| Filtros por estado, materia y prioridad | Notificaciones y recordatorios |
| Flujo de estados con reglas | Interfaz gráfica web/móvil |
| Persistencia local en archivo | Base de datos relacional |

---

## 2. Escenarios de usuario y pruebas (el *qué*)

### US1 – Registrar una tarea (Prioridad: P1) 🎯 MVP

**Como** estudiante, **quiero** registrar una tarea con su título, materia, fecha de entrega, prioridad y descripción opcional **para** no olvidar ninguna entrega.

**Por qué esta prioridad:** sin tareas registradas, ninguna otra función tiene valor.

**Prueba independiente:** enviar una tarea válida y verificar que se devuelve con identificador, estado `pendiente` y prioridad por defecto `media`.

**Escenarios de aceptación:**

1. **Dado** que envío título, materia y fecha válidos, **cuando** registro la tarea, **entonces** el sistema la guarda con estado `pendiente`, un `id` único y responde **201**.
2. **Dado** que no envío la prioridad, **cuando** registro la tarea, **entonces** queda con prioridad `media`.
3. **Dado** que omito el título o envío una fecha inexistente (p. ej. `2026-02-30`), **cuando** registro la tarea, **entonces** el sistema responde **400** con la lista de errores.
4. **Dado** que envío un JSON mal formado, **entonces** el sistema responde **400** con "JSON mal formado".

---

### US2 – Consultar tareas ordenadas y filtradas (Prioridad: P1) 🎯 MVP

**Como** estudiante, **quiero** ver mis tareas ordenadas por fecha de entrega y prioridad, y filtrarlas por estado, materia o prioridad, **para** saber qué hacer primero.

**Prueba independiente:** registrar varias tareas con fechas y prioridades distintas y comprobar el orden y los filtros.

**Escenarios de aceptación:**

1. **Dado** que hay tareas con distintas fechas, **cuando** consulto la lista, **entonces** aparecen de la fecha más próxima a la más lejana.
2. **Dado** que dos tareas tienen la misma fecha, **entonces** aparece primero la de prioridad `alta`, luego `media` y luego `baja`.
3. **Dado** que filtro por `subject=redes`, **entonces** veo solo las tareas de "Redes", sin importar mayúsculas o minúsculas.
4. **Dado** que filtro por un estado o prioridad inexistente, **entonces** el sistema responde **400**.
5. **Dado** el `id` de una tarea, **cuando** la consulto, **entonces** obtengo su detalle; si no existe, **404**.

---

### US3 – Editar una tarea y cambiar su estado (Prioridad: P2)

**Como** estudiante, **quiero** corregir los datos de una tarea y marcar su avance **para** mantener mi lista al día.

**Prueba independiente:** editar la prioridad de una tarea y moverla por el flujo de estados.

**Escenarios de aceptación:**

1. **Dado** que una tarea existe, **cuando** edito solo su prioridad, **entonces** los demás campos no cambian y `updatedAt` se actualiza.
2. **Dado** que una tarea está `pendiente`, **cuando** la paso a `en_progreso` o a `completada`, **entonces** el cambio se acepta.
3. **Dado** que una tarea está `completada`, **cuando** intento devolverla a otro estado, **entonces** el sistema responde **409 Conflicto**.
4. **Dado** que intento cambiar el estado desde la edición general, **entonces** el sistema responde **400** e indica usar el endpoint de estado.

---

### US4 – Eliminar una tarea (Prioridad: P3)

**Como** estudiante, **quiero** eliminar tareas que ya no aplican **para** mantener mi lista limpia.

**Escenarios de aceptación:**

1. **Dado** que una tarea existe, **cuando** la elimino, **entonces** el sistema responde **204** y la tarea deja de aparecer.
2. **Dado** que la tarea no existe, **cuando** intento eliminarla, **entonces** el sistema responde **404**.

---

### Casos límite

- Título con espacios a los lados: se recortan; un título solo con espacios es inválido.
- Título > 100 caracteres o descripción > 500 caracteres: **400**.
- Cuerpo de la petición > 10 KB: **413**.
- Ruta o método no soportado: **404** / **405**.
- Error inesperado del servidor: **500** sin exponer detalles internos.
- Archivo de datos vacío al arrancar: el sistema inicia con la lista vacía.

---

## 3. Requisitos

### Requisitos funcionales

| ID | Requisito | Historia |
|---|---|---|
| **FR-001** | El sistema DEBE permitir registrar tareas con `title` (1–100 car.), `subject` (obligatorio), `dueDate` (YYYY-MM-DD válida), `priority` y `description` (≤ 500 car., opcional). | US1 |
| **FR-002** | El sistema DEBE asignar a cada tarea un identificador único (UUID), estado inicial `pendiente` y marcas de tiempo `createdAt`/`updatedAt`. | US1 |
| **FR-003** | La prioridad DEBE ser `baja`, `media` o `alta` (por defecto `media`). | US1 |
| **FR-004** | El sistema DEBE rechazar datos inválidos con **400** y una lista de mensajes de error. | US1, US3 |
| **FR-005** | El sistema DEBE listar las tareas ordenadas por `dueDate` ascendente y, en caso de empate, por prioridad (`alta` > `media` > `baja`). | US2 |
| **FR-006** | El sistema DEBE permitir filtrar por `status`, `priority` y `subject` (sin distinguir mayúsculas). | US2 |
| **FR-007** | Los estados válidos son `pendiente`, `en_progreso` y `completada`. Una tarea `completada` NO puede cambiar de estado (**409**). | US3 |
| **FR-008** | El sistema DEBE permitir editar parcialmente `title`, `description`, `subject`, `dueDate` y `priority`. | US3 |
| **FR-009** | El sistema DEBE permitir eliminar una tarea por su `id`. | US4 |
| **FR-010** | Las tareas DEBEN conservarse entre reinicios del servidor. | Todas |
| **FR-011** | Un `id` inexistente DEBE producir **404**. | US2–US4 |

### Requisitos no funcionales

| ID | Requisito |
|---|---|
| **NFR-001** | Respuestas en formato JSON UTF-8. |
| **NFR-002** | Tiempo de respuesta < 200 ms con 1 000 tareas en un equipo de desarrollo. |
| **NFR-003** | Cobertura de pruebas según la Constitución (líneas ≥ 90 %, ramas ≥ 85 %). |
| **NFR-004** | Seguridad: límite de cuerpo de 10 KB, sin filtrar errores internos y cabecera `nosniff`. |
| **NFR-005** | Sin dependencias externas en tiempo de ejecución. |

### Entidad clave: **Tarea**

| Atributo | Tipo | Regla |
|---|---|---|
| `id` | UUID | Generado por el sistema |
| `title` | texto | Obligatorio, 1–100 caracteres |
| `description` | texto | Opcional, ≤ 500 caracteres |
| `subject` | texto | Obligatorio (materia) |
| `dueDate` | fecha `YYYY-MM-DD` | Obligatoria y válida en el calendario |
| `priority` | enum | `baja` \| `media` \| `alta` |
| `status` | enum | `pendiente` \| `en_progreso` \| `completada` |
| `createdAt`, `updatedAt` | ISO-8601 | Generados por el sistema |

---

## 4. Criterios de éxito (medibles)

- **SC-001:** Un estudiante registra una tarea con una sola petición, y la API responde en menos de 200 ms.
- **SC-002:** El 100 % de los escenarios de aceptación de US1–US4 tienen una prueba automatizada que pasa.
- **SC-003:** Ninguna petición inválida produce un error 500 (todas se responden con 4xx).
- **SC-004:** Los datos siguen disponibles después de reiniciar el servidor.

## 5. Supuestos y aclaraciones

- En la iteración 1 hay un solo usuario implícito; la multiusuario se deja para la iteración 2.
- Una fecha de entrega ya pasada se acepta, porque el estudiante puede registrar tareas atrasadas.
- `completada` es un estado final. Para "reabrir" una tarea se crea una nueva. *(Aclaración aprobada por el Product Owner.)*
