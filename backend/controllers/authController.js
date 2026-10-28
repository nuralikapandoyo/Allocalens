const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');

// POST /auth/login
async function login(req, res) {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';

  if (!email || !password) {
    return res.status(400).json({ error: 'Email dan password wajib diisi.' });
  }

  try {
    const result = await pool.query(
      'SELECT id, name, email, password, role FROM users WHERE LOWER(email) = $1',
      [email]
    );
    const user = result.rows[0];
    const valid = user ? await bcrypt.compare(password, user.password) : false;

    // Pesan sama untuk email salah maupun password salah, supaya tidak membocorkan akun mana yang ada.
    if (!valid) {
      return res.status(401).json({ error: 'Email atau password salah.' });
    }

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '8h',
    });

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal memproses login.' });
  }
}

// GET /auth/me
async function me(req, res) {
  try {
    const result = await pool.query('SELECT id, name, email, role FROM users WHERE id = $1', [req.user.id]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Akun tidak ditemukan. Silakan login ulang.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal mengambil data user.' });
  }
}

module.exports = { login, me };