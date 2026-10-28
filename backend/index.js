const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const employeesRoutes = require('./routes/employees');
const tasksRoutes = require('./routes/tasks');
const validationRoutes = require('./routes/validation');
const analysisRoutes = require('./routes/analysis');
const { authenticate, authorize } = require('./middleware/auth');

// .env sudah terbaca saat db.js dimuat (lewat routes di atas), jadi aman dicek di sini.
if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET belum diatur di file .env. Server dihentikan.');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Allocalens API jalan' });
});

app.use('/auth', authRoutes);
// Data employee hanya untuk HR/Resource Manager (UC-01 sampai UC-03).
app.use('/employees', authenticate, authorize('HR'), employeesRoutes);
// Data task bisa dilihat HR (UC-04) dan PM (UC-14).
app.use('/tasks', authenticate, authorize('HR', 'PM'), tasksRoutes);
// Validasi dataset hanya untuk HR (UC-05).
app.use('/validation', authenticate, authorize('HR'), validationRoutes);
// Analisis alokasi hanya untuk HR (UC-06).
app.use('/analysis', authenticate, authorize('HR'), analysisRoutes);

// Alamat yang tidak ada
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint tidak ditemukan' });
});

// Error global: JSON rusak -> 400, error tak terduga -> 500
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed' || err instanceof SyntaxError) {
    return res.status(400).json({ error: 'Format JSON pada body request tidak valid.' });
  }
  console.error(err);
  res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
});

app.listen(PORT, () => {
  console.log(`Server nyala di http://localhost:${PORT}`);
});