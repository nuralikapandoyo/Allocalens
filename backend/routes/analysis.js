const express = require('express');
const { runAnalysis, getAnalysis } = require('../controllers/analysisController');
const { workloadOverview } = require('../controllers/overviewController');

const router = express.Router();

// Harus di atas '/:allocation_id' supaya kata 'overview' tidak dianggap sebagai id.
router.get('/overview', workloadOverview);
router.post('/run', runAnalysis);
router.get('/:allocation_id', getAnalysis);

module.exports = router;