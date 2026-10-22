'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const {
  validateTaskInput,
  createTask,
  canTransition,
  isValidDate,
  ValidationError,
} = require('../src/domain/task');

const valid = { title: 'Informe SDD', subject: 'Gestión', dueDate: '2026-11-15' };

describe('Dominio: validación de tareas (FR-001..FR-004)', () => {
  test('[FR-001] acepta una tarea válida mínima', () => {
    assert.deepEqual(validateTaskInput(valid), []);
  });

  test('[FR-004] rechaza cuerpo que no es objeto', () => {
    assert.equal(validateTaskInput(null).length, 1);
    assert.equal(validateTaskInput([]).length, 1);
    assert.equal(validateTaskInput('x').length, 1);
  });

  test('[FR-001] exige title, subject y dueDate', () => {
    const errors = validateTaskInput({});
    assert.equal(errors.length, 3);
  });

  test('[FR-001] rechaza title vacío o demasiado largo', () => {
    assert.match(validateTaskInput({ ...valid, title: '   ' })[0], /title/);
    assert.match(validateTaskInput({ ...valid, title: 'a'.repeat(101) })[0], /100/);
  });

  test('[FR-001] rechaza description no textual o demasiado larga', () => {
    assert.match(validateTaskInput({ ...valid, description: 5 })[0], /texto/);
    assert.match(validateTaskInput({ ...valid, description: 'a'.repeat(501) })[0], /500/);
  });

  test('[FR-003] rechaza prioridad inválida', () => {
    assert.match(validateTaskInput({ ...valid, priority: 'urgente' })[0], /priority/);
  });

  test('[FR-008] no permite fijar status al crear/editar', () => {
    assert.match(validateTaskInput({ ...valid, status: 'completada' })[0], /status/);
  });

  test('[FR-008] en modo parcial solo valida los campos presentes', () => {
    assert.deepEqual(validateTaskInput({ priority: 'alta' }, { partial: true }), []);
    assert.equal(validateTaskInput({ title: '' }, { partial: true }).length, 1);
  });
});

describe('Dominio: fechas', () => {
  test('[FR-001] acepta fechas ISO válidas', () => {
    assert.equal(isValidDate('2026-02-28'), true);
  });
  test('[FR-001] rechaza fechas inexistentes o mal formadas', () => {
    assert.equal(isValidDate('2026-02-30'), false);
    assert.equal(isValidDate('15/11/2026'), false);
    assert.equal(isValidDate(20261115), false);
  });
});

describe('Dominio: creación de tarea', () => {
  test('[FR-002][FR-003] asigna id, valores por defecto y timestamps', () => {
    const now = new Date('2026-10-21T10:00:00Z');
    const task = createTask({ ...valid, title: '  Informe SDD  ' }, now);
    assert.match(task.id, /^[0-9a-f-]{36}$/);
    assert.equal(task.title, 'Informe SDD');
    assert.equal(task.priority, 'media');
    assert.equal(task.status, 'pendiente');
    assert.equal(task.description, '');
    assert.equal(task.createdAt, now.toISOString());
  });

  test('[FR-004] lanza ValidationError con detalles', () => {
    assert.throws(() => createTask({}), (err) => {
      assert.ok(err instanceof ValidationError);
      assert.equal(err.details.length, 3);
      return true;
    });
  });
});

describe('Dominio: transiciones de estado (FR-007)', () => {
  test('[FR-007] permite transiciones válidas', () => {
    assert.equal(canTransition('pendiente', 'en_progreso'), true);
    assert.equal(canTransition('en_progreso', 'completada'), true);
    assert.equal(canTransition('en_progreso', 'pendiente'), true);
  });
  test('[FR-007] bloquea transiciones desde completada o estados desconocidos', () => {
    assert.equal(canTransition('completada', 'pendiente'), false);
    assert.equal(canTransition('inexistente', 'pendiente'), false);
  });
});
