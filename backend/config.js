// Pengaturan yang bisa diubah lewat .env tanpa mengubah kode.
// workload_hours di dataset bernilai 2-11, jadi diasumsikan jam per hari kerja.
const parsed = Number(process.env.EMPLOYEE_CAPACITY_HOURS);

module.exports = {
  CAPACITY_HOURS: Number.isFinite(parsed) && parsed > 0 ? parsed : 8,
  MAX_LIMIT: 100,
};