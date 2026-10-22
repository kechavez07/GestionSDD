'use strict';

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { TaskRepository } = require('../src/repository/taskRepository');
const { TaskService } = require('../src/services/taskService');
const { createApp, MAX_BODY_BYTES } = require('../src/http/app');

let server;
let baseUrl;

async function call(method, path, body, rawBody) {
  const res = await fetch(baseUrl + path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: rawBody !== undefined ? rawBody : body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, headers: res.headers, body: text ? JSON.parse(text) : null };
}

const base = { title: 'Ensayo', subject: 'Gestión', dueDate: '2026-11-15' };

before(async () => {
  const service = new TaskService(new TaskRepository());
  // Servicio con fallo forzado para verificar el manejo de errores 500
  service.get = function get(id) {
    if (id === 'boom') throw new Error('detalle interno secreto');
    return TaskService.prototype.get.call(this, id);
  };
  server = createApp(service);
  await new Promise((resolve) => server.listen(0, resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(() => new Promise((resolve) => server.close(resolve)));

describe('API REST /tasks (contrato plan.md)', () => {
  test('GET /health responde ok', async () => {
    const res = await call('GET', '/health');
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
  });

  test('flujo completo: crear → listar → editar → cambiar estado → eliminar', async () => {
    const created = await call('POST', '/tasks', base);
    assert.equal(created.status, 201);
    const { id } = created.body;

    const list = await call('GET', '/tasks?status=pendiente');
    assert.equal(list.status, 200);
    assert.ok(list.body.some((t) => t.id === id));

    const got = await call('GET', `/tasks/${id}`);
    assert.equal(got.body.title, 'Ensayo');

    const patched = await call('PATCH', `/tasks/${id}`, { priority: 'alta' });
    assert.equal(patched.status, 200);
    assert.equal(patched.body.priority, 'alta');

    const status = await call('PATCH', `/tasks/${id}/status`, { status: 'en_progreso' });
    assert.equal(status.body.status, 'en_progreso');

    const del = await call('DELETE', `/tasks/${id}`);
    assert.equal(del.status, 204);
    assert.equal((await call('GET', `/tasks/${id}`)).status, 404);
  });

  test('400 con detalles al crear tarea inválida', async () => {
    const res = await call('POST', '/tasks', { title: '' });
    assert.equal(res.status, 400);
    assert.ok(Array.isArray(res.body.details));
  });

  test('400 con JSON mal formado', async () => {
    const res = await call('POST', '/tasks', undefined, '{"title":');
    assert.equal(res.status, 400);
    assert.equal(res.body.error, 'JSON mal formado');
  });

  test('400 con filtro inválido', async () => {
    assert.equal((await call('GET', '/tasks?priority=urgente')).status, 400);
  });

  test('409 ante transición de estado no permitida', async () => {
    const { body } = await call('POST', '/tasks', base);
    await call('PATCH', `/tasks/${body.id}/status`, { status: 'completada' });
    const res = await call('PATCH', `/tasks/${body.id}/status`, { status: 'pendiente' });
    assert.equal(res.status, 409);
  });

  test('POST sin cuerpo devuelve 400', async () => {
    assert.equal((await call('POST', '/tasks')).status, 400);
  });

  test('413 si el cuerpo excede el límite', async () => {
    const res = await call('POST', '/tasks', { ...base, description: 'x'.repeat(MAX_BODY_BYTES) });
    assert.equal(res.status, 413);
  });

  test('404 en rutas desconocidas y 405 en métodos no soportados', async () => {
    assert.equal((await call('GET', '/usuarios')).status, 404);
    assert.equal((await call('GET', '/tasks/a/b/c')).status, 404);
    assert.equal((await call('GET', '/tasks/a/otra')).status, 404);
    assert.equal((await call('PUT', '/tasks')).status, 405);
    assert.equal((await call('POST', '/tasks/abc')).status, 405);
  });

  test('500 genérico sin filtrar detalles internos', async () => {
    const res = await call('GET', '/tasks/boom');
    assert.equal(res.status, 500);
    assert.equal(res.body.error, 'Error interno del servidor');
    assert.ok(!JSON.stringify(res.body).includes('secreto'));
  });
});
