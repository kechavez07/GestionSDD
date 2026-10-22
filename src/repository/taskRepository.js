'use strict';

const fs = require('node:fs');
const path = require('node:path');

/**
 * Repositorio de tareas (plan.md – Capa de persistencia).
 * Mantiene los datos en memoria y, si se indica filePath, los persiste en un archivo JSON.
 */
class TaskRepository {
  constructor({ filePath = null } = {}) {
    this.filePath = filePath;
    this.tasks = new Map();
    this.load();
  }

  load() {
    if (!this.filePath || !fs.existsSync(this.filePath)) return;
    const raw = fs.readFileSync(this.filePath, 'utf8');
    const list = raw.trim() === '' ? [] : JSON.parse(raw);
    for (const task of list) this.tasks.set(task.id, task);
  }

  persist() {
    if (!this.filePath) return;
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    const tmp = `${this.filePath}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify([...this.tasks.values()], null, 2));
    fs.renameSync(tmp, this.filePath);
  }

  findAll() {
    return [...this.tasks.values()].map((task) => ({ ...task }));
  }

  findById(id) {
    const task = this.tasks.get(id);
    return task ? { ...task } : null;
  }

  save(task) {
    this.tasks.set(task.id, { ...task });
    this.persist();
    return { ...task };
  }

  delete(id) {
    const existed = this.tasks.delete(id);
    if (existed) this.persist();
    return existed;
  }
}

module.exports = { TaskRepository };
