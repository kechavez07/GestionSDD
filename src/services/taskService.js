'use strict';

const {
  STATUSES,
  PRIORITIES,
  ValidationError,
  validateTaskInput,
  createTask,
  canTransition,
} = require('../domain/task');

class NotFoundError extends Error {
  constructor(id) {
    super(`Tarea ${id} no encontrada`);
    this.name = 'NotFoundError';
  }
}

class TransitionError extends Error {
  constructor(from, to) {
    super(`Transición de estado no permitida: ${from} → ${to}`);
    this.name = 'TransitionError';
  }
}

const PRIORITY_WEIGHT = { alta: 0, media: 1, baja: 2 };

/**
 * Casos de uso de la iteración 1 (spec.md – US1..US4).
 */
class TaskService {
  constructor(repository, clock = () => new Date()) {
    this.repository = repository;
    this.clock = clock;
  }

  // US1 – Registrar tarea
  create(input) {
    return this.repository.save(createTask(input, this.clock()));
  }

  // US2 – Consultar tareas con filtros, ordenadas por fecha de entrega y prioridad
  list(filters = {}) {
    const errors = [];
    if (filters.status && !STATUSES.includes(filters.status)) {
      errors.push(`status debe ser uno de: ${STATUSES.join(', ')}`);
    }
    if (filters.priority && !PRIORITIES.includes(filters.priority)) {
      errors.push(`priority debe ser uno de: ${PRIORITIES.join(', ')}`);
    }
    if (errors.length > 0) throw new ValidationError(errors);

    return this.repository
      .findAll()
      .filter((t) => !filters.status || t.status === filters.status)
      .filter((t) => !filters.priority || t.priority === filters.priority)
      .filter(
        (t) => !filters.subject || t.subject.toLowerCase() === filters.subject.toLowerCase(),
      )
      .sort(
        (a, b) =>
          a.dueDate.localeCompare(b.dueDate) ||
          PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority],
      );
  }

  get(id) {
    const task = this.repository.findById(id);
    if (!task) throw new NotFoundError(id);
    return task;
  }

  // US3 – Editar datos de la tarea
  update(id, changes) {
    const task = this.get(id);
    const errors = validateTaskInput(changes, { partial: true });
    if (errors.length > 0) throw new ValidationError(errors);

    const updated = { ...task, updatedAt: this.clock().toISOString() };
    for (const key of ['title', 'description', 'subject', 'dueDate', 'priority']) {
      if (changes[key] !== undefined) {
        updated[key] = changes[key].trim(); // todos los campos editables son texto validado
      }
    }
    return this.repository.save(updated);
  }

  // US3 – Cambiar estado
  changeStatus(id, status) {
    if (!STATUSES.includes(status)) {
      throw new ValidationError([`status debe ser uno de: ${STATUSES.join(', ')}`]);
    }
    const task = this.get(id);
    if (!canTransition(task.status, status)) throw new TransitionError(task.status, status);
    return this.repository.save({ ...task, status, updatedAt: this.clock().toISOString() });
  }

  // US4 – Eliminar tarea
  remove(id) {
    if (!this.repository.delete(id)) throw new NotFoundError(id);
  }
}

module.exports = { TaskService, NotFoundError, TransitionError };
