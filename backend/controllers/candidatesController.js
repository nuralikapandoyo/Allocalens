const pool = require('../db');
const { toPositiveInt } = require('../utils/query');
const { validateEmployee, validateTask } = require('../utils/validators');
const { scoreCandidate } = require('../utils/scoring');
const {
  loadEmployees, isValidEmployee, publicTask, scoreEmployee, rankCandidates,
} = require('../utils/candidates');

async function loadTask(db, id) {
  const r = await db.query('SELECT to_jsonb(t) AS task FROM tasks t WHERE t.id = $1', [id]);
  return r.rows.length ? r.rows[0].task : null;
}

function taskInvalid(res, task) {
  const errors = validateTask(task);
  if (errors.length === 0) return false;
  res.status(422).json({ error: 'Data task tidak valid, kandidat tidak bisa dihitung.', details: errors });
  return true;
}

// GET /tasks/:id/candidates?limit=3   (HR dan PM)
// Kandidat terbaik dari seluruh employee, diurutkan dengan mesin skoring yang sama dengan Allocation Analysis.
async function getCandidates(req, res) {
  const id = toPositiveInt(req.params.id);
  if (id === null) return res.status(400).json({ error: 'ID task harus berupa angka bulat positif.' });
  const limit = req.query.limit === undefined ? 3 : toPositiveInt(req.query.limit);
  if (limit === null || limit > 10) return res.status(400).json({ error: 'Parameter limit harus berupa angka bulat antara 1 dan 10.' });

  try {
    const task = await loadTask(pool, id);
    if (!task) return res.status(404).json({ error: `Task dengan id ${id} tidak ditemukan.` });
    if (taskInvalid(res, task)) return undefined;

    const assigned = await pool.query('SELECT employee_id FROM allocations WHERE task_id = $1 ORDER BY id LIMIT 1', [id]);
    const employees = (await loadEmployees(pool)).filter(isValidEmployee);

    res.json({
      task: publicTask(task),
      assigned_employee_id: assigned.rows.length ? assigned.rows[0].employee_id : null,
      candidates: rankCandidates(employees, task, { limit }),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal menghitung kandidat.' });
  }
}

// GET /tasks/:id/compare?employee_ids=1,2,3   (hanya HR)
async function compareCandidates(req, res) {
  const id = toPositiveInt(req.params.id);
  if (id === null) return res.status(400).json({ error: 'ID task harus berupa angka bulat positif.' });

  const ids = String(req.query.employee_ids || '').split(',').map((s) => s.trim()).filter(Boolean).map(toPositiveInt);
  if (ids.length < 2 || ids.length > 4 || ids.some((n) => n === null) || new Set(ids).size !== ids.length) {
    return res.status(400).json({ error: 'employee_ids harus berisi 2 sampai 4 id employee berbeda, dipisah koma. Contoh: 1,2,3' });
  }

  try {
    const task = await loadTask(pool, id);
    if (!task) return res.status(404).json({ error: `Task dengan id ${id} tidak ditemukan.` });
    if (taskInvalid(res, task)) return undefined;

    const found = await loadEmployees(pool, ids);
    const byId = new Map(found.map((e) => [Number(e.id), e]));
    const missing = ids.filter((n) => !byId.has(n));
    if (missing.length > 0) return res.status(404).json({ error: `Employee tidak ditemukan: ${missing.join(', ')}.` });

    const bad = ids.filter((n) => validateEmployee(byId.get(n)).length > 0);
    if (bad.length > 0) return res.status(422).json({ error: `Data employee tidak valid, tidak bisa dibandingkan: ${bad.join(', ')}.` });

    res.json({ task: publicTask(task), results: ids.map((n) => scoreEmployee(byId.get(n), task)) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal membandingkan kandidat.' });
  }
}

// POST /tasks/:id/assign  body: { "employee_id": 12 }   (hanya PM)
// Menempatkan employee ke task yang belum punya assignee (membuat baris di tabel allocations).
async function assignTask(req, res) {
  const id = toPositiveInt(req.params.id);
  if (id === null) return res.status(400).json({ error: 'ID task harus berupa angka bulat positif.' });
  const employeeId = toPositiveInt((req.body || {}).employee_id);
  if (employeeId === null) return res.status(400).json({ error: 'employee_id wajib diisi dan berupa angka bulat positif.' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Kunci baris task supaya dua permintaan bersamaan tidak membuat dua assignee.
    const locked = await client.query('SELECT id FROM tasks WHERE id = $1 FOR UPDATE', [id]);
    if (locked.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: `Task dengan id ${id} tidak ditemukan.` });
    }
    const existing = await client.query('SELECT 1 FROM allocations WHERE task_id = $1 LIMIT 1', [id]);
    if (existing.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Task ini sudah punya assignee.' });
    }

    const task = await loadTask(client, id);
    const [employee] = await loadEmployees(client, [employeeId]);
    if (!employee) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: `Employee dengan id ${employeeId} tidak ditemukan.` });
    }
    const errors = [...validateTask(task), ...validateEmployee(employee)];
    if (errors.length > 0) {
      await client.query('ROLLBACK');
      return res.status(422).json({ error: 'Data task atau employee tidak valid, penugasan dibatalkan.', details: errors });
    }

    const scored = scoreCandidate(employee, task);
    const inserted = await client.query(
      `INSERT INTO allocations (employee_id, task_id, allocation_status) VALUES ($1, $2, $3)
       RETURNING id, employee_id, task_id, allocation_status`,
      [employeeId, id, scored.status]
    );
    await client.query('COMMIT');
    res.status(201).json({
      message: 'Task berhasil ditugaskan.',
      allocation: { ...inserted.rows[0], candidate_score: scored.candidate_score },
    });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error(err);
    res.status(500).json({ error: 'Gagal menugaskan task.' });
  } finally {
    client.release();
  }
}

module.exports = { getCandidates, compareCandidates, assignTask };