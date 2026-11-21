const pool = require('../db');
const { toPositiveInt, parsePagination } = require('../utils/query');
const { validateEmployee, validateTask } = require('../utils/validators');
const { scoreCandidate } = require('../utils/scoring');
const {
  loadEmployees, isValidEmployee, publicEmployee, publicTask, scoreEmployee, rankCandidates, isMissingTable, round1,
} = require('../utils/candidates');

const STATUSES = ['Optimal', 'Suboptimal', 'Requires Reassignment'];
const MISSING_TABLE = 'Tabel allocation_decisions belum dibuat. Jalankan file backend/sql/allocation_decisions.sql di database.';

// Alokasi yang menunggu keputusan HR: berstatus Requires Reassignment dan belum punya keputusan.
const PENDING_WHERE = `a.allocation_status = 'Requires Reassignment'
  AND NOT EXISTS (SELECT 1 FROM allocation_decisions d WHERE d.allocation_id = a.id)`;

// GET /allocations/summary   (hanya HR)
// Jumlah alokasi per status (seluruhnya dan per departemen) untuk dashboard dan halaman Allocation Status.
async function summary(req, res) {
  try {
    const byStatusRows = await pool.query(
      'SELECT allocation_status AS status, COUNT(*)::int AS n FROM allocations GROUP BY allocation_status');
    const byDeptRows = await pool.query(
      `SELECT e.department, a.allocation_status AS status, COUNT(*)::int AS n
       FROM allocations a JOIN employees e ON e.id = a.employee_id
       GROUP BY e.department, a.allocation_status ORDER BY e.department`);

    const byStatus = Object.fromEntries(STATUSES.map((s) => [s, 0]));
    byStatusRows.rows.forEach((r) => { if (r.status in byStatus) byStatus[r.status] = r.n; });

    const depts = new Map();
    byDeptRows.rows.forEach((r) => {
      if (!depts.has(r.department)) depts.set(r.department, { department: r.department, total: 0, ...Object.fromEntries(STATUSES.map((s) => [s, 0])) });
      const d = depts.get(r.department);
      if (r.status in d) d[r.status] = r.n;
      d.total += r.n;
    });

    let pending = byStatus['Requires Reassignment'];
    let decisionsReady = true;
    try {
      pending = (await pool.query(`SELECT COUNT(*)::int AS n FROM allocations a WHERE ${PENDING_WHERE}`)).rows[0].n;
    } catch (err) {
      if (!isMissingTable(err)) throw err;
      decisionsReady = false;
    }

    res.json({
      total: STATUSES.reduce((sum, s) => sum + byStatus[s], 0),
      by_status: byStatus,
      by_department: [...depts.values()],
      pending_review: pending,
      decisions_ready: decisionsReady,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal mengambil ringkasan alokasi.' });
  }
}

// Satu baris review: alokasi saat ini, kandidat usulan terbaik, dan selisih skornya.
function buildReviewItem(row, byId, valid) {
  const task = row.task;
  const curRaw = byId.get(Number(row.employee_id));
  let current = null;
  if (curRaw) {
    try {
      current = scoreEmployee(curRaw, task);
    } catch (err) {
      current = { employee: publicEmployee(curRaw), candidate_score: null, status: null, thresholds: null, factors: [] };
    }
  }
  const [proposed] = rankCandidates(valid, task, { excludeId: row.employee_id, limit: 1 });
  const gain = proposed && current && current.candidate_score !== null
    ? round1(proposed.candidate_score - current.candidate_score) : null;
  return { allocation_id: row.allocation_id, task: publicTask(task), current, proposed: proposed || null, gain };
}

// GET /allocations/flagged?page=1&limit=10   (hanya HR)
// Antrean alokasi yang perlu ditinjau, Critical dan High lebih dulu.
async function listFlagged(req, res) {
  const pg = parsePagination(req.query);
  if (pg.error) return res.status(400).json({ error: pg.error });
  if (pg.limit > 20) return res.status(400).json({ error: 'Parameter limit untuk antrean review maksimal 20.' });
  const { page, limit } = pg;

  try {
    const total = (await pool.query(`SELECT COUNT(*)::int AS n FROM allocations a WHERE ${PENDING_WHERE}`)).rows[0].n;
    const rows = (await pool.query(
      `SELECT a.id AS allocation_id, a.employee_id, to_jsonb(t) AS task
       FROM allocations a JOIN tasks t ON t.id = a.task_id
       WHERE ${PENDING_WHERE}
       ORDER BY CASE t.task_priority WHEN 'Critical' THEN 0 WHEN 'High' THEN 1 WHEN 'Medium' THEN 2 ELSE 3 END, a.id
       LIMIT $1 OFFSET $2`,
      [limit, (page - 1) * limit]
    )).rows;

    let data = [];
    if (rows.length > 0) {
      const all = await loadEmployees(pool);
      const byId = new Map(all.map((e) => [Number(e.id), e]));
      const valid = all.filter(isValidEmployee);
      data = rows.map((row) => buildReviewItem(row, byId, valid));
    }
    res.json({ data, page, limit, total });
  } catch (err) {
    if (isMissingTable(err)) return res.status(503).json({ error: MISSING_TABLE });
    console.error(err);
    res.status(500).json({ error: 'Gagal mengambil antrean review.' });
  }
}

// GET /allocations/decisions?page=1&limit=10&decision=Reassigned|Kept   (hanya HR)
async function listDecisions(req, res) {
  const pg = parsePagination(req.query);
  if (pg.error) return res.status(400).json({ error: pg.error });
  const { page, limit } = pg;

  const decision = req.query.decision;
  if (decision !== undefined && decision !== '' && !['Reassigned', 'Kept'].includes(decision)) {
    return res.status(400).json({ error: 'Parameter decision harus Reassigned atau Kept.' });
  }
  const params = [];
  let where = '';
  if (decision) { params.push(decision); where = 'WHERE d.decision = $1'; }

  try {
    const total = (await pool.query(`SELECT COUNT(*)::int AS n FROM allocation_decisions d ${where}`, params)).rows[0].n;
    const rows = (await pool.query(
      `SELECT d.id, d.allocation_id, a.task_id, d.decision, d.from_employee_id, d.to_employee_id,
              d.from_score, d.to_score, d.created_at, u.name AS decided_by_name
       FROM allocation_decisions d
       JOIN allocations a ON a.id = d.allocation_id
       LEFT JOIN users u ON u.id::text = d.decided_by
       ${where}
       ORDER BY d.id DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, (page - 1) * limit]
    )).rows;
    res.json({
      data: rows.map((r) => ({
        ...r,
        from_score: r.from_score === null ? null : Number(r.from_score),
        to_score: r.to_score === null ? null : Number(r.to_score),
      })),
      page, limit, total,
    });
  } catch (err) {
    if (isMissingTable(err)) return res.status(503).json({ error: MISSING_TABLE });
    console.error(err);
    res.status(500).json({ error: 'Gagal mengambil log keputusan.' });
  }
}

// Kunci satu alokasi yang masih menunggu keputusan. Mengembalikan { row } atau { status, error }.
async function lockPending(client, id) {
  const found = await client.query(
    `SELECT a.id, a.employee_id, a.allocation_status, to_jsonb(t) AS task
     FROM allocations a JOIN tasks t ON t.id = a.task_id
     WHERE a.id = $1 FOR UPDATE OF a`, [id]);
  if (found.rows.length === 0) return { status: 404, error: `Alokasi dengan id ${id} tidak ditemukan.` };
  const row = found.rows[0];
  if (row.allocation_status !== 'Requires Reassignment') {
    return { status: 409, error: 'Alokasi ini tidak berstatus Requires Reassignment.' };
  }
  const decided = await client.query('SELECT 1 FROM allocation_decisions WHERE allocation_id = $1 LIMIT 1', [id]);
  if (decided.rows.length > 0) return { status: 409, error: 'Alokasi ini sudah pernah diputuskan.' };
  return { row };
}

function safeScore(employee, task) {
  if (!employee || !isValidEmployee(employee)) return null;
  try { return scoreCandidate(employee, task).candidate_score; } catch (err) { return null; }
}

// POST /allocations/:id/reassign  body: { "employee_id": 7 }   (hanya HR)
async function reassign(req, res) {
  const id = toPositiveInt(req.params.id);
  if (id === null) return res.status(400).json({ error: 'ID alokasi harus berupa angka bulat positif.' });
  const newId = toPositiveInt((req.body || {}).employee_id);
  if (newId === null) return res.status(400).json({ error: 'employee_id wajib diisi dan berupa angka bulat positif.' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const lock = await lockPending(client, id);
    if (lock.error) {
      await client.query('ROLLBACK');
      return res.status(lock.status).json({ error: lock.error });
    }
    const { row } = lock;
    if (Number(row.employee_id) === newId) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Task ini sudah dipegang employee tersebut.' });
    }

    const emps = await loadEmployees(client, [Number(row.employee_id), newId]);
    const byId = new Map(emps.map((e) => [Number(e.id), e]));
    const target = byId.get(newId);
    if (!target) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: `Employee dengan id ${newId} tidak ditemukan.` });
    }
    const errors = [...validateTask(row.task), ...validateEmployee(target)];
    if (errors.length > 0) {
      await client.query('ROLLBACK');
      return res.status(422).json({ error: 'Data task atau employee tidak valid, reassign dibatalkan.', details: errors });
    }

    const fromScore = safeScore(byId.get(Number(row.employee_id)), row.task);
    const to = scoreCandidate(target, row.task);

    await client.query('UPDATE allocations SET employee_id = $1, allocation_status = $2 WHERE id = $3', [newId, to.status, id]);
    await client.query(
      `INSERT INTO allocation_decisions (allocation_id, decision, from_employee_id, to_employee_id, from_score, to_score, decided_by)
       VALUES ($1, 'Reassigned', $2, $3, $4, $5, $6)`,
      [id, row.employee_id, newId, fromScore, to.candidate_score, String(req.user.id)]
    );
    await client.query('COMMIT');
    res.json({
      message: 'Reassignment berhasil disimpan.',
      allocation: { id, employee_id: newId, allocation_status: to.status, candidate_score: to.candidate_score },
    });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    if (isMissingTable(err)) return res.status(503).json({ error: MISSING_TABLE });
    console.error(err);
    res.status(500).json({ error: 'Gagal menyimpan reassignment.' });
  } finally {
    client.release();
  }
}

// POST /allocations/:id/keep   (hanya HR). Assignee saat ini dipertahankan dan item keluar dari antrean.
async function keep(req, res) {
  const id = toPositiveInt(req.params.id);
  if (id === null) return res.status(400).json({ error: 'ID alokasi harus berupa angka bulat positif.' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const lock = await lockPending(client, id);
    if (lock.error) {
      await client.query('ROLLBACK');
      return res.status(lock.status).json({ error: lock.error });
    }
    const { row } = lock;
    const [current] = await loadEmployees(client, [Number(row.employee_id)]);
    await client.query(
      `INSERT INTO allocation_decisions (allocation_id, decision, from_employee_id, to_employee_id, from_score, to_score, decided_by)
       VALUES ($1, 'Kept', $2, NULL, $3, NULL, $4)`,
      [id, row.employee_id, safeScore(current, row.task), String(req.user.id)]
    );
    await client.query('COMMIT');
    res.json({ message: 'Assignee saat ini dipertahankan.' });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    if (isMissingTable(err)) return res.status(503).json({ error: MISSING_TABLE });
    console.error(err);
    res.status(500).json({ error: 'Gagal menyimpan keputusan.' });
  } finally {
    client.release();
  }
}

module.exports = { summary, listFlagged, listDecisions, reassign, keep };