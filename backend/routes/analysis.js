const express = require('express');
const { runAnalysis, getAnalysis } = require('../controllers/analysisController');

const router = express.Router();

router.post('/run', runAnalysis);
router.get('/:allocation_id', getAnalysis);

module.exports = router;