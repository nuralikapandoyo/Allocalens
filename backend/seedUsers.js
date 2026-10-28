// Membuat dua akun contoh (HR dan PM) di tabel users. Aman dijalankan ulang: akun yang sudah ada dilewati.
// Password disimpan dalam bentuk hash (bcrypt), bukan teks biasa.
// Ini hanya akun demo untuk pengembangan; ganti passwordnya kalau sistem dipakai sungguhan.
const bcrypt = require('bcryptjs');
const pool = require('./db');

const USERS = [
  { name: 'HR Demo', email: 'hr@allocalens.test', password: 'password123', role: 'HR' },
  { name: 'PM Demo', email: 'pm@allocalens.test', password: 'password123', role: 'PM' },
];

async function main() {
  for (const u of USERS) {
    const exists = await pool.query('SELECT id FROM users WHERE LOWER(email) = $1', [u.email]);
    if (exists.rows.length > 0) {
      console.log(`${u.email} sudah ada, dilewati.`);
      continue;
    }
    const hash = await bcrypt.hash(u.password, 10);
    await pool.query('INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4)', [
      u.name, u.email, hash, u.role,
    ]);
    console.log(`Akun dibuat: ${u.email} (${u.role})`);
  }
}

main()
  .catch((err) => {
    console.error('Gagal membuat akun:', err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());