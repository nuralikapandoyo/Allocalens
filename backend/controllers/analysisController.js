const pool = require('../db');
const config = require('../scoringConfig');
const { toPositiveInt } = require('../utils/query');
const { validateEmployee, validateTask } = require('../utils/validators');
const { scoreCandidate } = require('../utils/scoring');

// Ubah baris tabel allocation_analysis menjadi bentuk response (angka NUMERIC dari pg berupa teks).
function toResponse(row) {
  return {
    id: row.id,
    allocation_id: row.allocation_id,
    candidate_score: Number(row.candidate_score),
    status: row.system_status,
    factors: row.factors,
    thresholds: row.thresholds,
    created_at: row.created_at,
  };
}

// POST /analysis/run  body: { "allocation_id": 1 }   (UC-06, hanya HR)
async function runAnalysis(req, res) {
  const body = req.body || {};
  const allocationId = toPositiveInt(body.allocation_id);
  if (allocationId === null) {
    return res.status(400).json({ error: 'allocation_id wajib diisi dan berupa angka bulat positif.' });
  }

  try {
    const found = await pool.query(
      `SELECT a.id AS allocation_id, to_jsonb(e) AS employee, to_jsonb(t) AS task
       FROM allocations a
       JOIN employees e ON e.id = a.employee_id
       JOIN tasks t ON t.id = a.task_id
       WHERE a.id = $1`,
      [allocationId]
    );
    if (found.rows.length === 0) {
      return res.status(404).json({ error: `Alokasi dengan id ${allocationId} tidak ditemukan.` });
    }
    const { employee, task } = found.rows[0];

    // Data tidak valid tidak boleh dianalisis (NFR-15, alur alternatif UC-06).
    const errors = [
      ...validateEmployee(employee).map((e) => ({ source: 'employee', ...e })),
      ...validateTask(task).map((e) => ({ source: 'task', ...e })),
    ];
    if (errors.length > 0) {
      return res.status(422).json({ error: 'Analisis dibatalkan karena data employee atau task tidak valid.', details: errors });
    }

    const result = scoreCandidate(employee, task);
    const byName = Object.fromEntries(result.factors.map((f) => [f.factor, f.score]));

    const saved = await pool.query(
      `INSERT INTO allocation_analysis
         (allocation_id, skill_score, workload_score, deadline_score, candidate_score,
          system_status, factors, thresholds, config_snapshot, run_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, allocation_id, candidate_score, system_status, factors, thresholds, created_at`,
      [allocationId, byName.skill, byName.workload, byName.deadline, result.candidate_score,
        result.status, JSON.stringify(result.factors), JSON.stringify(result.thresholds),
        JSON.stringify({ WEIGHTS: config.WEIGHTS, THRESHOLDS: config.THRESHOLDS, HOURS_PER_DAY: config.HOURS_PER_DAY, PRIORITY_STRICTNESS: config.PRIORITY_STRICTNESS }),
        req.user.id]
    );

    res.status(201).json({ message: 'Analisis alokasi berhasil dijalankan.', analysis: toResponse(saved.rows[0]) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal menjalankan analisis.' });
  }
}

// GET /analysis/:allocation_id  -> hasil analisis terbaru untuk alokasi itu
async function getAnalysis(req, res) {
  const allocationId = toPositiveInt(req.params.allocation_id);
  if (allocationId === null) {
    return res.status(400).json({ error: 'allocation_id harus berupa angka bulat positif.' });
  }

  try {
    const result = await pool.query(
      `SELECT id, allocation_id, candidate_score, system_status, factors, thresholds, created_at
       FROM allocation_analysis WHERE allocation_id = $1
       ORDER BY created_at DESC, id DESC LIMIT 1`,
      [allocationId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: `Belum ada hasil analisis untuk alokasi ${allocationId}. Jalankan analisis dulu.` });
    }
    res.json(toResponse(result.rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal mengambil hasil analisis.' });
  }
}

module.exports = { runAnalysis, getAnalysis };