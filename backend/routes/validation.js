const express = require('express');
const { runValidation } = require('../controllers/validationController');

const router = express.Router();

router.get('/', runValidation);

module.exports = router;