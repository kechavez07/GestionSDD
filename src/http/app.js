'use strict';

const http = require('node:http');
const { ValidationError } = require('../domain/task');
const { NotFoundError, TransitionError } = require('../services/taskService');

const MAX_BODY_BYTES = 10 * 1024; // constitution.md – Principio V (seguridad)

class BadRequestError extends Error {}
class PayloadTooLargeError extends Error {}

function send(res, status, payload) {
  const body = payload === undefined ? '' : JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(body);
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    let tooLarge = false;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      // Se descarta el resto del cuerpo sin cortar el socket para poder responder 413
      if (size > MAX_BODY_BYTES) tooLarge = true;
      if (!tooLarge) chunks.push(chunk);
    });
    req.on('end', () => {
      if (tooLarge) {
        return reject(new PayloadTooLargeError('El cuerpo supera el tamaño máximo permitido'));
      }
      const raw = Buffer.concat(chunks).toString('utf8');
      if (raw.trim() === '') return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new BadRequestError('JSON mal formado'));
      }
    });
    req.on('error', reject);
  });
}

function errorResponse(res, err) {
  if (err instanceof ValidationError) {
    return send(res, 400, { error: err.message, details: err.details });
  }
  if (err instanceof BadRequestError) return send(res, 400, { error: err.message });
  if (err instanceof NotFoundError) return send(res, 404, { error: err.message });
  if (err instanceof TransitionError) return send(res, 409, { error: err.message });
  if (err instanceof PayloadTooLargeError) return send(res, 413, { error: err.message });
  // No se exponen detalles internos al cliente (constitution.md – Principio V)
  return send(res, 500, { error: 'Error interno del servidor' });
}

/**
 * Crea el servidor HTTP con las rutas de la API v1 (plan.md – Contrato de API).
 */
function createApp(service) {
  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      const parts = url.pathname.split('/').filter(Boolean);

      if (parts[0] === 'health' && parts.length === 1 && req.method === 'GET') {
        return send(res, 200, { status: 'ok' });
      }

      if (parts[0] !== 'tasks' || parts.length > 3) {
        return send(res, 404, { error: 'Ruta no encontrada' });
      }

      const [, id, sub] = parts;

      if (!id) {
        if (req.method === 'GET') {
          const filters = Object.fromEntries(url.searchParams);
          return send(res, 200, service.list(filters));
        }
        if (req.method === 'POST') {
          return send(res, 201, service.create(await readJson(req)));
        }
      } else if (!sub) {
        if (req.method === 'GET') return send(res, 200, service.get(id));
        if (req.method === 'PATCH') return send(res, 200, service.update(id, await readJson(req)));
        if (req.method === 'DELETE') {
          service.remove(id);
          return send(res, 204);
        }
      } else if (sub === 'status' && req.method === 'PATCH') {
        const body = await readJson(req);
        return send(res, 200, service.changeStatus(id, body.status));
      } else {
        return send(res, 404, { error: 'Ruta no encontrada' });
      }

      return send(res, 405, { error: 'Método no permitido' });
    } catch (err) {
      return errorResponse(res, err);
    }
  });
}

module.exports = { createApp, MAX_BODY_BYTES };
