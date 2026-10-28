const express = require('express');
const { listTasks, getTask, createTask, updateTask } = require('../controllers/tasksController');
const { authorize } = require('../middleware/auth');

const router = express.Router();

// Lihat task: HR dan PM (sudah dibatasi di index.js).
router.get('/', listTasks);
router.get('/:id', getTask);

// Tambah dan ubah task: hanya PM (aturan bisnis SRS).
router.post('/', authorize('PM'), createTask);
router.put('/:id', authorize('PM'), updateTask);

module.exports = router;