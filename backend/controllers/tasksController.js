const pool = require('../db');
const { toPositiveInt, parsePagination } = require('../utils/query');
const { ENUMS, TASK_RULES, validateTask, validateTaskText } = require('../utils/validators');

const COLUMNS = `id, source_task_id, task_name, description, task_complexity, required_skill_level,
  deadline_days, workload_hours, task_priority, team_size, created_by`;

// nama query -> kolom database
const ENUM_FILTERS = {
  priority: 'task_priority',
  complexity: 'task_complexity',
  required_skill_level: 'required_skill_level',
};

// Kolom yang boleh diisi PM lewat POST/PUT. Selain ini ditolak.
const EDITABLE = [...TASK_RULES.map((r) => r.field), 'task_name', 'description'];

// GET /tasks?page=1&limit=10&priority=High&complexity=Low&search=...
async function listTasks(req, res) {
  const pg = parsePagination(req.query);
  if (pg.error) return res.status(400).json({ error: pg.error });
  const { page, limit } = pg;

    // sort=newest -> task terbaru dulu (dipakai web supaya task buatan PM langsung terlihat)
  const sort = req.query.sort === undefined ? 'oldest' : req.query.sort;
  if (!['oldest', 'newest'].includes(sort)) {
    return res.status(400).json({ error: 'Parameter sort harus oldest atau newest.' });
  }
  const direction = sort === 'newest' ? 'DESC' : 'ASC';

  const conditions = [];
  const params = [];

  for (const [queryName, column] of Object.entries(ENUM_FILTERS)) {
    const raw = req.query[queryName];
    if (raw === undefined || raw === '') continue;
    const allowed = ENUMS[column];
    const match = typeof raw === 'string'
      ? allowed.find((v) => v.toLowerCase() === raw.trim().toLowerCase())
      : undefined;
    if (!match) {
      return res.status(400).json({ error: `Parameter ${queryName} harus salah satu dari: ${allowed.join(', ')}.` });
    }
    params.push(match);
    conditions.push(`${column} = $${params.length}`);
  }

  const { search } = req.query;
  if (typeof search === 'string' && search.trim() !== '') {
    params.push(`%${search.trim()}%`);
    const like = `$${params.length}`;
    params.push(search.trim());
    const exact = `$${params.length}`;
    conditions.push(`(task_name ILIKE ${like} OR id::text = ${exact} OR source_task_id::text = ${exact})`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const countResult = await pool.query(`SELECT COUNT(*)::int AS total FROM tasks ${where}`, params);
    const total = countResult.rows[0].total;

    const dataResult = await pool.query(
      `SELECT ${COLUMNS} FROM tasks ${where}
      ORDER BY id ${direction}
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, (page - 1) * limit]
    );

    res.json({ data: dataResult.rows, page, limit, total });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal ambil data task' });
  }
}

// GET /tasks/:id
async function getTask(req, res) {
  const id = toPositiveInt(req.params.id);
  if (id === null) {
    return res.status(400).json({ error: 'ID task harus berupa angka bulat positif.' });
  }

  try {
    const result = await pool.query(`SELECT ${COLUMNS} FROM tasks WHERE id = $1`, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: `Task dengan id ${id} tidak ditemukan.` });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal ambil data task' });
  }
}

// Rapikan input: enum dicocokkan tanpa peduli huruf besar/kecil, angka dari teks diubah jadi angka.
function normalizeInput(body) {
  const out = {};
  for (const rule of TASK_RULES) {
    if (!(rule.field in body)) continue;
    let v = body[rule.field];
    if (rule.type === 'enum' && typeof v === 'string') {
      const m = rule.values.find((x) => x.toLowerCase() === v.trim().toLowerCase());
      if (m) v = m;
    } else if (rule.type === 'int' && typeof v === 'string' && v.trim() !== '' && Number.isInteger(Number(v))) {
      v = Number(v);
    }
    out[rule.field] = v;
  }
  for (const f of ['task_name', 'description']) {
    if (f in body) out[f] = typeof body[f] === 'string' ? body[f].trim() : body[f];
  }
  return out;
}

// Cek bentuk body. Mengembalikan pesan error, atau null kalau bentuknya benar.
function checkBody(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return 'Body request harus berupa objek JSON.';
  }
  const unknown = Object.keys(body).filter((k) => !EDITABLE.includes(k));
  if (unknown.length > 0) {
    return `Field tidak dikenal: ${unknown.join(', ')}. Field yang boleh: ${EDITABLE.join(', ')}.`;
  }
  return null;
}

// POST /tasks  (hanya PM)
async function createTask(req, res) {
  const bodyError = checkBody(req.body);
  if (bodyError) return res.status(400).json({ error: bodyError });

  const data = normalizeInput(req.body);
  const errors = [...validateTask(data), ...validateTaskText(data, { requireName: true })];
  if (errors.length > 0) {
    return res.status(400).json({ error: 'Data task tidak valid.', details: errors });
  }

  try {
    const result = await pool.query(
      `INSERT INTO tasks (task_name, description, task_complexity, required_skill_level,
         deadline_days, workload_hours, task_priority, team_size, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING ${COLUMNS}`,
      [data.task_name, data.description ?? null, data.task_complexity, data.required_skill_level,
        data.deadline_days, data.workload_hours, data.task_priority, data.team_size, req.user.id]
    );
    res.status(201).json({ message: 'Task berhasil ditambahkan.', task: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal menyimpan task.' });
  }
}

// PUT /tasks/:id  (hanya PM). Cukup kirim field yang mau diubah.
async function updateTask(req, res) {
  const id = toPositiveInt(req.params.id);
  if (id === null) {
    return res.status(400).json({ error: 'ID task harus berupa angka bulat positif.' });
  }

  const bodyError = checkBody(req.body);
  if (bodyError) return res.status(400).json({ error: bodyError });

  const data = normalizeInput(req.body);
  const fields = Object.keys(data);
  if (fields.length === 0) {
    return res.status(400).json({ error: 'Tidak ada field yang diubah.' });
  }

  try {
    const existing = await pool.query(`SELECT ${COLUMNS} FROM tasks WHERE id = $1`, [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: `Task dengan id ${id} tidak ditemukan.` });
    }

    // Validasi data gabungan (lama + perubahan), tapi hanya laporkan error pada field yang diubah.
    const merged = { ...existing.rows[0], ...data };
    const errors = [...validateTask(merged), ...validateTaskText(merged)].filter((e) => fields.includes(e.field));
    if (errors.length > 0) {
      return res.status(400).json({ error: 'Data task tidak valid.', details: errors });
    }

    // Nama kolom berasal dari daftar EDITABLE (bukan input mentah), jadi aman dari SQL injection.
    const sets = fields.map((f, i) => `${f} = $${i + 1}`).join(', ');
    const result = await pool.query(
      `UPDATE tasks SET ${sets} WHERE id = $${fields.length + 1} RETURNING ${COLUMNS}`,
      [...fields.map((f) => data[f]), id]
    );
    res.json({ message: 'Task berhasil diubah.', task: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal mengubah task.' });
  }
}

module.exports = { listTasks, getTask, createTask, updateTask };