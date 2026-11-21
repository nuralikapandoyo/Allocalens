const express = require('express');
const { listTasks, getTask, createTask, updateTask } = require('../controllers/tasksController');
const { getCandidates, compareCandidates, assignTask } = require('../controllers/candidatesController');
const { authorize } = require('../middleware/auth');

const router = express.Router();

// Lihat task: HR dan PM (sudah dibatasi di index.js).
router.get('/', listTasks);
router.get('/:id', getTask);

// Kandidat terbaik untuk task: HR dan PM. Perbandingan kandidat: hanya HR.
router.get('/:id/candidates', getCandidates);
router.get('/:id/compare', authorize('HR'), compareCandidates);

// Tambah dan ubah task: hanya PM (aturan bisnis SRS).
router.post('/', authorize('PM'), createTask);
router.put('/:id', authorize('PM'), updateTask);

// Menugaskan employee ke task yang belum punya assignee: hanya PM.
router.post('/:id/assign', authorize('PM'), assignTask);

module.exports = router;