const pool = require('../db');
const { CAPACITY_HOURS } = require('../config');
const { summarizeWorkload } = require('../utils/workloadOverview');

// GET /analysis/overview   (hanya HR)
// Ringkasan beban kerja seluruh employee: overload, rata-rata, kapasitas tersisa, per departemen, dan 10 tertinggi.
async function workloadOverview(req, res) {
  try {
    const result = await pool.query(
      `SELECT e.id, e.department, COALESCE(w.hours, 0)::int AS hours
       FROM employees e
       LEFT JOIN (
         SELECT a.employee_id, SUM(t.workload_hours)::int AS hours
         FROM allocations a JOIN tasks t ON t.id = a.task_id
         GROUP BY a.employee_id
       ) w ON w.employee_id = e.id`
    );
    res.json(summarizeWorkload(result.rows, CAPACITY_HOURS));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal menghitung ringkasan beban kerja.' });
  }
}

module.exports = { workloadOverview };