const pool = require('../db');
const { CAPACITY_HOURS } = require('../config');
const { toPositiveInt, parsePagination } = require('../utils/query');

const COLUMNS = ['id', 'name', 'age', 'experience_years', 'education_level', 'department', 'skill_level',
  'technical_skill_score', 'communication_score', 'leadership_score', 'problem_solving_score',
  'attendance_rate', 'performance_rating', 'idle_time_hours', 'conflict_rate', 'previous_task_success_rate']
  .map((c) => `e.${c}`).join(', ');

// Beban kerja = total workload_hours dari task yang dialokasikan ke employee (FR-03).
const WORKLOAD_SELECT = `COALESCE(w.task_count, 0) AS task_count,
  COALESCE(w.total_workload_hours, 0) AS total_workload_hours`;
const WORKLOAD_JOIN = `LEFT JOIN (
    SELECT a.employee_id, COUNT(*)::int AS task_count, SUM(t.workload_hours)::int AS total_workload_hours
    FROM allocations a JOIN tasks t ON t.id = a.task_id
    GROUP BY a.employee_id
  ) w ON w.employee_id = e.id`;

// Tambahkan capacity dan utilisasi ke hasil query.
function withCapacity(row) {
  const total = Number(row.total_workload_hours) || 0;
  return {
    ...row,
    task_count: Number(row.task_count) || 0,
    total_workload_hours: total,
    capacity_hours: CAPACITY_HOURS,
    utilization_pct: Math.round((total / CAPACITY_HOURS) * 1000) / 10,
  };
}

// GET /employees?page=1&limit=10&search=...&department=...
async function listEmployees(req, res) {
  const { search, department } = req.query;

  const pg = parsePagination(req.query);
  if (pg.error) return res.status(400).json({ error: pg.error });
  const { page, limit } = pg;

  const conditions = [];
  const params = [];

  if (typeof search === 'string' && search.trim() !== '') {
    params.push(`%${search.trim()}%`);
    const like = `$${params.length}`;
    params.push(search.trim());
    const exact = `$${params.length}`;
    conditions.push(
      `(e.department ILIKE ${like} OR e.skill_level ILIKE ${like} OR e.education_level ILIKE ${like}
        OR e.performance_rating ILIKE ${like} OR e.id::text = ${exact})`
    );
  }
  if (typeof department === 'string' && department.trim() !== '') {
    params.push(department.trim());
    conditions.push(`LOWER(e.department) = LOWER($${params.length})`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const countResult = await pool.query(`SELECT COUNT(*)::int AS total FROM employees e ${where}`, params);
    const total = countResult.rows[0].total;

    const dataParams = [...params, limit, (page - 1) * limit];
    const dataResult = await pool.query(
      `SELECT ${COLUMNS}, ${WORKLOAD_SELECT} FROM employees e ${WORKLOAD_JOIN} ${where}
       ORDER BY e.id
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      dataParams
    );

    res.json({ data: dataResult.rows.map(withCapacity), page, limit, total });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal ambil data employee' });
  }
}

// GET /employees/:id
async function getEmployee(req, res) {
  const id = toPositiveInt(req.params.id);
  if (id === null) {
    return res.status(400).json({ error: 'ID employee harus berupa angka bulat positif.' });
  }

  try {
    const result = await pool.query(
      `SELECT ${COLUMNS}, ${WORKLOAD_SELECT} FROM employees e ${WORKLOAD_JOIN} WHERE e.id = $1`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: `Employee dengan id ${id} tidak ditemukan.` });
    }
    res.json(withCapacity(result.rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal ambil data employee' });
  }
}

module.exports = { listEmployees, getEmployee, withCapacity };