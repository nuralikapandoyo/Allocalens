const pool = require('../db');
const { validateEmployee, validateTask } = require('../utils/validators');
const { toPositiveInt } = require('../utils/query');

// Satu tabel yang gagal dibaca tidak menggagalkan tabel lain.
async function checkTable(table, validator, sampleLimit) {
  try {
    const { rows } = await pool.query(`SELECT * FROM ${table} ORDER BY id`);
    const invalid = [];
    let invalidCount = 0;
    for (const row of rows) {
      const errors = validator(row);
      if (errors.length > 0) {
        invalidCount += 1;
        if (invalid.length < sampleLimit) invalid.push({ id: row.id, errors });
      }
    }
    return {
      total: rows.length,
      valid: rows.length - invalidCount,
      invalid: invalidCount,
      invalid_samples: invalid,
    };
  } catch (err) {
    console.error(err);
    return { error: `Gagal memeriksa tabel ${table}.` };
  }
}

// GET /validation?sample=20
async function runValidation(req, res) {
  const sample = req.query.sample === undefined ? 20 : toPositiveInt(req.query.sample);
  if (sample === null || sample > 100) {
    return res.status(400).json({ error: 'Parameter sample harus berupa angka bulat antara 1 dan 100.' });
  }

  const [employees, tasks] = await Promise.all([
    checkTable('employees', validateEmployee, sample),
    checkTable('tasks', validateTask, sample),
  ]);

  const ready = !employees.error && !tasks.error && employees.invalid === 0 && tasks.invalid === 0;
  res.json({ ready_for_analysis: ready, employees, tasks });
}

module.exports = { runValidation };