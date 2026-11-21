// Bantuan untuk fitur kandidat, rekomendasi, dan perbandingan.
// Semua skor memakai mesin skoring yang sudah ada (utils/scoring.js), jadi hasilnya
// konsisten dengan halaman Allocation Analysis dan ikut berubah kalau scoringConfig.js diubah.
const { CAPACITY_HOURS } = require('../config');
const { scoreCandidate } = require('./scoring');
const { validateEmployee } = require('./validators');

const round1 = (n) => Math.round(n * 10) / 10;

// Satu employee + beban kerjanya (jumlah task dan total jam dari tabel allocations).
const EMPLOYEE_SQL = `SELECT to_jsonb(e) AS employee,
    COALESCE(w.task_count, 0) AS task_count,
    COALESCE(w.total_workload_hours, 0) AS total_workload_hours
  FROM employees e
  LEFT JOIN (
    SELECT a.employee_id, COUNT(*)::int AS task_count, SUM(t.workload_hours)::int AS total_workload_hours
    FROM allocations a JOIN tasks t ON t.id = a.task_id
    GROUP BY a.employee_id
  ) w ON w.employee_id = e.id`;

// db boleh berupa pool atau client transaksi. ids dikosongkan = semua employee.
async function loadEmployees(db, ids) {
  const result = ids
    ? await db.query(`${EMPLOYEE_SQL} WHERE e.id = ANY($1::int[]) ORDER BY e.id`, [ids])
    : await db.query(`${EMPLOYEE_SQL} ORDER BY e.id`);
  return result.rows.map((r) => ({
    ...r.employee,
    task_count: Number(r.task_count) || 0,
    total_workload_hours: Number(r.total_workload_hours) || 0,
  }));
}

const isValidEmployee = (e) => validateEmployee(e).length === 0;

// Field yang dikirim ke web (tanpa data yang tidak dibutuhkan).
function publicEmployee(e) {
  const total = Number(e.total_workload_hours) || 0;
  return {
    id: e.id,
    name: e.name ?? null,
    department: e.department,
    skill_level: e.skill_level,
    performance_rating: e.performance_rating,
    technical_skill_score: e.technical_skill_score,
    communication_score: e.communication_score,
    leadership_score: e.leadership_score,
    problem_solving_score: e.problem_solving_score,
    idle_time_hours: e.idle_time_hours,
    task_count: Number(e.task_count) || 0,
    total_workload_hours: total,
    capacity_hours: CAPACITY_HOURS,
    utilization_pct: round1((total / CAPACITY_HOURS) * 100),
  };
}

function publicTask(t) {
  return {
    id: t.id,
    source_task_id: t.source_task_id ?? null,
    task_name: t.task_name ?? null,
    description: t.description ?? null,
    task_complexity: t.task_complexity,
    required_skill_level: t.required_skill_level,
    deadline_days: t.deadline_days,
    workload_hours: t.workload_hours,
    task_priority: t.task_priority,
    team_size: t.team_size,
  };
}

// Skor satu pasangan employee-task dalam bentuk response. Melempar error kalau data tidak bisa dihitung.
function scoreEmployee(employee, task) {
  const r = scoreCandidate(employee, task);
  return {
    employee: publicEmployee(employee),
    candidate_score: r.candidate_score,
    status: r.status,
    thresholds: r.thresholds,
    factors: r.factors,
  };
}

// Urutkan semua employee untuk satu task. Skor sama -> idle time lebih besar -> id lebih kecil,
// supaya urutannya selalu sama untuk data yang sama.
function rankCandidates(employees, task, { excludeId, limit } = {}) {
  const ranked = [];
  for (const e of employees) {
    if (excludeId !== undefined && Number(e.id) === Number(excludeId)) continue;
    try {
      ranked.push({ e, r: scoreCandidate(e, task) });
    } catch (err) {
      // data employee tidak bisa dihitung -> dilewati
    }
  }
  ranked.sort((a, b) => b.r.candidate_score - a.r.candidate_score
    || Number(b.e.idle_time_hours) - Number(a.e.idle_time_hours)
    || Number(a.e.id) - Number(b.e.id));
  const top = limit ? ranked.slice(0, limit) : ranked;
  return top.map(({ e, r }) => ({
    employee: publicEmployee(e),
    candidate_score: r.candidate_score,
    status: r.status,
    thresholds: r.thresholds,
    factors: r.factors,
  }));
}

// Kode error PostgreSQL "tabel tidak ada".
const isMissingTable = (err) => Boolean(err) && err.code === '42P01';

module.exports = {
  loadEmployees, isValidEmployee, publicEmployee, publicTask, scoreEmployee, rankCandidates, isMissingTable, round1,
};