const express = require('express');
const { listEmployees, getEmployee } = require('../controllers/employeesController');

const router = express.Router();

router.get('/', listEmployees);
router.get('/:id', getEmployee);

module.exports = router;