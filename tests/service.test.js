'use strict';

const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { TaskRepository } = require('../src/repository/taskRepository');
const { TaskService, NotFoundError, TransitionError } = require('../src/services/taskService');
const { ValidationError } = require('../src/domain/task');

const base = { title: 'Tarea', subject: 'Gestión', dueDate: '2026-11-15' };

describe('Servicio de tareas', () => {
  let service;
  beforeEach(() => {
    service = new TaskService(new TaskRepository(), () => new Date('2026-10-21T10:00:00Z'));
  });

  test('US1: crea y recupera una tarea', () => {
    const created = service.create(base);
    assert.deepEqual(service.get(created.id), created);
  });

  test('US2: lista ordenada por fecha de entrega y prioridad', () => {
    service.create({ ...base, title: 'C', dueDate: '2026-12-01' });
    service.create({ ...base, title: 'B', dueDate: '2026-11-01', priority: 'baja' });
    service.create({ ...base, title: 'A', dueDate: '2026-11-01', priority: 'alta' });
    assert.deepEqual(service.list().map((t) => t.title), ['A', 'B', 'C']);
  });

  test('US2: filtra por estado, prioridad y materia (sin distinguir mayúsculas)', () => {
    const a = service.create({ ...base, subject: 'Redes', priority: 'alta' });
    service.create({ ...base, subject: 'Gestión' });
    service.changeStatus(a.id, 'en_progreso');
    assert.equal(service.list({ status: 'en_progreso' }).length, 1);
    assert.equal(service.list({ priority: 'alta' }).length, 1);
    assert.equal(service.list({ subject: 'redes' }).length, 1);
    assert.equal(service.list({ subject: 'Física' }).length, 0);
  });

  test('US2: rechaza filtros inválidos', () => {
    assert.throws(() => service.list({ status: 'x', priority: 'y' }), (err) => {
      assert.ok(err instanceof ValidationError);
      assert.equal(err.details.length, 2);
      return true;
    });
  });

  test('US3: edita campos y actualiza updatedAt', () => {
    let tick = 0;
    service.clock = () => new Date(Date.UTC(2026, 9, 21, 10, tick++));
    const t = service.create(base);
    const updated = service.update(t.id, { title: '  Nuevo  ', priority: 'alta' });
    assert.equal(updated.title, 'Nuevo');
    assert.equal(updated.priority, 'alta');
    assert.equal(updated.subject, base.subject);
    assert.notEqual(updated.updatedAt, t.updatedAt);
  });

  test('US3: rechaza edición inválida', () => {
    const t = service.create(base);
    assert.throws(() => service.update(t.id, { dueDate: 'mañana' }), ValidationError);
  });

  test('US3: cambia estado respetando transiciones', () => {
    const t = service.create(base);
    assert.equal(service.changeStatus(t.id, 'completada').status, 'completada');
    assert.throws(() => service.changeStatus(t.id, 'pendiente'), TransitionError);
    assert.throws(() => service.changeStatus(t.id, 'archivada'), ValidationError);
  });

  test('US4: elimina tarea y luego no existe', () => {
    const t = service.create(base);
    service.remove(t.id);
    assert.throws(() => service.get(t.id), NotFoundError);
    assert.throws(() => service.remove(t.id), NotFoundError);
  });

  test('los objetos devueltos no permiten mutar el repositorio', () => {
    const t = service.create(base);
    t.title = 'hackeado';
    assert.equal(service.get(t.id).title, 'Tarea');
  });
});

describe('Repositorio con persistencia JSON (FR-010)', () => {
  test('persiste y recarga tareas desde disco', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'taskflow-'));
    const filePath = path.join(dir, 'sub', 'tasks.json');
    try {
      const service = new TaskService(new TaskRepository({ filePath }));
      const t = service.create(base);
      const reloaded = new TaskRepository({ filePath });
      assert.equal(reloaded.findById(t.id).title, 'Tarea');
      reloaded.delete(t.id);
      assert.equal(new TaskRepository({ filePath }).findAll().length, 0);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test('tolera un archivo vacío', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'taskflow-'));
    const filePath = path.join(dir, 'tasks.json');
    try {
      fs.writeFileSync(filePath, '');
      assert.equal(new TaskRepository({ filePath }).findAll().length, 0);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
