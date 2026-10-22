'use strict';

const crypto = require('node:crypto');

// Valores permitidos (spec.md – FR-002, FR-003)
const STATUSES = Object.freeze(['pendiente', 'en_progreso', 'completada']);
const PRIORITIES = Object.freeze(['baja', 'media', 'alta']);

// Transiciones válidas de estado (spec.md – FR-007)
const TRANSITIONS = Object.freeze({
  pendiente: ['en_progreso', 'completada'],
  en_progreso: ['pendiente', 'completada'],
  completada: [],
});

const TITLE_MAX = 100;
const DESCRIPTION_MAX = 500;

class ValidationError extends Error {
  constructor(details) {
    super('Datos de la tarea inválidos');
    this.name = 'ValidationError';
    this.details = details;
  }
}

function isValidDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

/**
 * Valida los datos de entrada de una tarea.
 * @param {object} input
 * @param {{partial?: boolean}} options partial=true para actualizaciones (PATCH)
 * @returns {string[]} lista de errores (vacía si es válida)
 */
function validateTaskInput(input, { partial = false } = {}) {
  const errors = [];
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    return ['El cuerpo de la petición debe ser un objeto JSON'];
  }

  const has = (key) => Object.prototype.hasOwnProperty.call(input, key);

  if (!partial || has('title')) {
    if (typeof input.title !== 'string' || input.title.trim() === '') {
      errors.push('title es obligatorio');
    } else if (input.title.trim().length > TITLE_MAX) {
      errors.push(`title no puede superar ${TITLE_MAX} caracteres`);
    }
  }

  if (!partial || has('subject')) {
    if (typeof input.subject !== 'string' || input.subject.trim() === '') {
      errors.push('subject es obligatorio');
    }
  }

  if (!partial || has('dueDate')) {
    if (!isValidDate(input.dueDate)) {
      errors.push('dueDate debe tener formato YYYY-MM-DD');
    }
  }

  if (has('description') && input.description !== undefined) {
    if (typeof input.description !== 'string') {
      errors.push('description debe ser texto');
    } else if (input.description.length > DESCRIPTION_MAX) {
      errors.push(`description no puede superar ${DESCRIPTION_MAX} caracteres`);
    }
  }

  if (has('priority') && !PRIORITIES.includes(input.priority)) {
    errors.push(`priority debe ser uno de: ${PRIORITIES.join(', ')}`);
  }

  if (has('status')) {
    errors.push('status no se modifica aquí; use PATCH /tasks/:id/status');
  }

  return errors;
}

function createTask(input, now = new Date()) {
  const errors = validateTaskInput(input);
  if (errors.length > 0) throw new ValidationError(errors);

  const timestamp = now.toISOString();
  return {
    id: crypto.randomUUID(),
    title: input.title.trim(),
    description: (input.description || '').trim(),
    subject: input.subject.trim(),
    dueDate: input.dueDate,
    priority: input.priority || 'media',
    status: 'pendiente',
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function canTransition(from, to) {
  return Boolean(TRANSITIONS[from]) && TRANSITIONS[from].includes(to);
}

module.exports = {
  STATUSES,
  PRIORITIES,
  TRANSITIONS,
  ValidationError,
  isValidDate,
  validateTaskInput,
  createTask,
  canTransition,
};
