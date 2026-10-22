'use strict';

const path = require('node:path');
const { TaskRepository } = require('./repository/taskRepository');
const { TaskService } = require('./services/taskService');
const { createApp } = require('./http/app');

const PORT = Number(process.env.PORT) || 3000;
const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, '..', 'data', 'tasks.json');

const repository = new TaskRepository({ filePath: DATA_FILE });
const service = new TaskService(repository);

createApp(service).listen(PORT, () => {
  console.log(`TaskFlow API escuchando en http://localhost:${PORT}`);
});
