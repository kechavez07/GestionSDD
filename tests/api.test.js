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
  test('[NFR-001][NFR-004] GET /health responde ok con cabeceras seguras', async () => {
    const res = await call('GET', '/health');
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
  });

  test('[US1-US4] flujo completo: crear → listar → editar → cambiar estado → eliminar', async () => {
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

  test('[FR-004] 400 con detalles al crear tarea inválida', async () => {
    const res = await call('POST', '/tasks', { title: '' });
    assert.equal(res.status, 400);
    assert.ok(Array.isArray(res.body.details));
  });

  test('[FR-004] 400 con JSON mal formado', async () => {
    const res = await call('POST', '/tasks', undefined, '{"title":');
    assert.equal(res.status, 400);
    assert.equal(res.body.error, 'JSON mal formado');
  });

  test('[FR-006] 400 con filtro inválido', async () => {
    assert.equal((await call('GET', '/tasks?priority=urgente')).status, 400);
  });

  test('[FR-007] 409 ante transición de estado no permitida', async () => {
    const { body } = await call('POST', '/tasks', base);
    await call('PATCH', `/tasks/${body.id}/status`, { status: 'completada' });
    const res = await call('PATCH', `/tasks/${body.id}/status`, { status: 'pendiente' });
    assert.equal(res.status, 409);
  });

  test('[FR-004] POST sin cuerpo devuelve 400', async () => {
    assert.equal((await call('POST', '/tasks')).status, 400);
  });

  test('[NFR-004] 413 si el cuerpo excede el límite', async () => {
    const res = await call('POST', '/tasks', { ...base, description: 'x'.repeat(MAX_BODY_BYTES) });
    assert.equal(res.status, 413);
  });

  test('[FR-012] 404 en rutas desconocidas y 405 en métodos no soportados', async () => {
    assert.equal((await call('GET', '/usuarios')).status, 404);
    assert.equal((await call('GET', '/tasks/a/b/c')).status, 404);
    assert.equal((await call('GET', '/tasks/a/otra')).status, 404);
    assert.equal((await call('PUT', '/tasks')).status, 405);
    assert.equal((await call('POST', '/tasks/abc')).status, 405);
  });

  test('[NFR-004] 500 genérico sin filtrar detalles internos', async () => {
    const res = await call('GET', '/tasks/boom');
    assert.equal(res.status, 500);
    assert.equal(res.body.error, 'Error interno del servidor');
    assert.ok(!JSON.stringify(res.body).includes('secreto'));
  });
});

describe('Rendimiento (NFR-002)', () => {
  test('[NFR-002] lista 1 000 tareas filtradas en < 200 ms (p95)', async () => {
    const service = new TaskService(new TaskRepository());
    for (let i = 0; i < 1000; i++) {
      const month = String(1 + (i % 12)).padStart(2, '0');
      const day = String(1 + (i % 28)).padStart(2, '0');
      service.create({ ...base, title: `T${i}`, subject: i % 2 ? 'Redes' : 'Gestión', dueDate: `2026-${month}-${day}` });
    }
    const perfServer = createApp(service);
    await new Promise((resolve) => perfServer.listen(0, resolve));
    try {
      const url = `http://127.0.0.1:${perfServer.address().port}/tasks?subject=redes`;
      const times = [];
      for (let i = 0; i < 20; i++) {
        const start = performance.now();
        const res = await fetch(url);
        assert.equal((await res.json()).length, 500);
        times.push(performance.now() - start);
      }
      times.sort((a, b) => a - b);
      assert.ok(times[18] < 200, `p95 = ${times[18].toFixed(1)} ms`);
    } finally {
      await new Promise((resolve) => perfServer.close(resolve));
    }
  });
});
