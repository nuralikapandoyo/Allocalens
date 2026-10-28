// Skrip import dataset Allocalens (WBS 1.4.1)
// Membaca data/hr_allocation_dataset.csv lalu mengisi tabel employees, tasks, dan allocations.
// Pemakaian:
//   node import.js --dry   -> hanya cek isi CSV, tidak menyentuh database
//   node import.js         -> import sungguhan (semua dalam satu transaksi)

const fs = require('fs');
const path = require('path');

const CSV_PATH = path.join(__dirname, 'data', 'hr_allocation_dataset.csv');
const DRY = process.argv.includes('--dry');
const CHUNK = 500;

const EXPECTED_COLUMNS = [
  'employee_id', 'age', 'experience_years', 'education_level', 'department', 'skill_level',
  'technical_skill_score', 'communication_score', 'leadership_score', 'problem_solving_score',
  'task_id', 'task_complexity', 'required_skill_level', 'deadline_days', 'workload_hours',
  'task_priority', 'team_size', 'previous_task_success_rate', 'attendance_rate',
  'performance_rating', 'idle_time_hours', 'conflict_rate', 'allocation_status',
];

const NUMERIC = [
  'employee_id', 'age', 'experience_years', 'technical_skill_score', 'communication_score',
  'leadership_score', 'problem_solving_score', 'task_id', 'deadline_days', 'workload_hours',
  'team_size', 'previous_task_success_rate', 'attendance_rate', 'idle_time_hours', 'conflict_rate',
];

// Di dataset nilai ketiga bernama "Reassignment Required"; di sistem dipakai "Requires Reassignment" (sesuai laporan).
const STATUS_MAP = {
  'Optimal': 'Optimal',
  'Suboptimal': 'Suboptimal',
  'Reassignment Required': 'Requires Reassignment',
};

function readCsv() {
  if (!fs.existsSync(CSV_PATH)) {
    throw new Error(`File CSV tidak ditemukan di: ${CSV_PATH}\nTaruh hr_allocation_dataset.csv di folder backend/data/`);
  }
  const text = fs.readFileSync(CSV_PATH, 'utf8').replace(/^\uFEFF/, '');
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '');
  const header = lines[0].split(',').map((h) => h.trim());
  if (header.join(',') !== EXPECTED_COLUMNS.join(',')) {
    throw new Error('Header CSV tidak sesuai dengan 23 kolom yang diharapkan.');
  }

  return lines.slice(1).map((line, i) => {
    const lineNo = i + 2;
    const cells = line.split(',').map((c) => c.trim());
    if (cells.length !== header.length) {
      throw new Error(`Baris ${lineNo}: ada ${cells.length} kolom, seharusnya ${header.length}.`);
    }
    const row = {};
    header.forEach((h, idx) => {
      if (cells[idx] === '') throw new Error(`Baris ${lineNo}: kolom ${h} kosong.`);
      row[h] = cells[idx];
    });
    NUMERIC.forEach((h) => {
      const n = Number(row[h]);
      if (!Number.isInteger(n)) throw new Error(`Baris ${lineNo}: kolom ${h} bukan angka bulat (${row[h]}).`);
      row[h] = n;
    });
    if (!(row.allocation_status in STATUS_MAP)) {
      throw new Error(`Baris ${lineNo}: allocation_status tidak dikenal (${row.allocation_status}).`);
    }
    row.allocation_status = STATUS_MAP[row.allocation_status];
    return row;
  });
}

function countBy(rows, key) {
  return rows.reduce((acc, r) => ((acc[r[key]] = (acc[r[key]] || 0) + 1), acc), {});
}

async function bulkInsert(client, table, columns, rows) {
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const params = [];
    const tuples = chunk.map((row, ri) => {
      const ph = row.map((v, ci) => {
        params.push(v);
        return `$${ri * columns.length + ci + 1}`;
      });
      return `(${ph.join(',')})`;
    });
    await client.query(`INSERT INTO ${table} (${columns.join(',')}) VALUES ${tuples.join(',')}`, params);
  }
}

async function main() {
  const rows = readCsv();
  console.log(`CSV terbaca: ${rows.length} baris, ${EXPECTED_COLUMNS.length} kolom.`);
  console.log('Distribusi status (setelah dipetakan):', countBy(rows, 'allocation_status'));

  if (rows.length !== 5000) {
    throw new Error(`Jumlah baris ${rows.length}, seharusnya 5000. Import dibatalkan.`);
  }
  const ids = new Set(rows.map((r) => r.employee_id));
  if (ids.size !== rows.length) throw new Error('employee_id tidak unik. Import dibatalkan.');

  if (DRY) {
    console.log('Mode --dry: CSV valid, database tidak disentuh.');
    return;
  }

  // Satu baris CSV = satu employee + satu task + satu allocation.
  // task_id di CSV tidak unik (atribut berbeda tiap baris), jadi id task dibuat sendiri
  // dan task_id asli disimpan di source_task_id.
  const employees = rows.map((r) => [
    r.employee_id, null, r.age, r.experience_years, r.education_level, r.department, r.skill_level,
    r.technical_skill_score, r.communication_score, r.leadership_score, r.problem_solving_score,
    r.attendance_rate, r.performance_rating, r.idle_time_hours, r.conflict_rate,
    r.previous_task_success_rate,
  ]);
  const tasks = rows.map((r, i) => [
    i + 1, r.task_id, r.task_complexity, r.required_skill_level, r.deadline_days,
    r.workload_hours, r.task_priority, r.team_size,
  ]);
  const allocations = rows.map((r, i) => [i + 1, r.employee_id, i + 1, r.allocation_status]);

  const pool = require('./db');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const t of ['employees', 'tasks', 'allocations']) {
      const { rows: [c] } = await client.query(`SELECT COUNT(*)::int AS n FROM ${t}`);
      if (c.n > 0) {
        throw new Error(`Tabel ${t} sudah berisi ${c.n} baris. Import dibatalkan supaya data tidak dobel.`);
      }
    }

    await bulkInsert(client, 'employees',
      ['id', 'name', 'age', 'experience_years', 'education_level', 'department', 'skill_level',
        'technical_skill_score', 'communication_score', 'leadership_score', 'problem_solving_score',
        'attendance_rate', 'performance_rating', 'idle_time_hours', 'conflict_rate',
        'previous_task_success_rate'], employees);
    await bulkInsert(client, 'tasks',
      ['id', 'source_task_id', 'task_complexity', 'required_skill_level', 'deadline_days',
        'workload_hours', 'task_priority', 'team_size'], tasks);
    await bulkInsert(client, 'allocations',
      ['id', 'employee_id', 'task_id', 'allocation_status'], allocations);

    // Samakan penghitung id otomatis dengan id terbesar, supaya insert berikutnya tidak bentrok.
    for (const t of ['employees', 'tasks', 'allocations']) {
      const { rows: [s] } = await client.query(`SELECT pg_get_serial_sequence('${t}', 'id') AS seq`);
      if (s.seq) await client.query(`SELECT setval('${s.seq}', (SELECT MAX(id) FROM ${t}))`);
    }

    // Verifikasi sebelum disimpan permanen.
    for (const t of ['employees', 'tasks', 'allocations']) {
      const { rows: [c] } = await client.query(`SELECT COUNT(*)::int AS n FROM ${t}`);
      if (c.n !== 5000) throw new Error(`Verifikasi gagal: ${t} berisi ${c.n} baris, seharusnya 5000.`);
      console.log(`${t}: ${c.n} baris`);
    }
    const { rows: dist } = await client.query(
      'SELECT allocation_status, COUNT(*)::int AS n FROM allocations GROUP BY allocation_status ORDER BY allocation_status');
    console.log('Distribusi status di database:', dist);

    await client.query('COMMIT');
    console.log('Import selesai dan tersimpan.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Import gagal, semua perubahan dibatalkan (ROLLBACK).');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});