const { MAX_LIMIT } = require('../config');

// Ubah teks query menjadi bilangan bulat positif, atau null kalau tidak valid.
function toPositiveInt(value) {
  if (!/^\d+$/.test(String(value))) return null;
  const n = Number(value);
  return n >= 1 ? n : null;
}

// Baca ?page= dan ?limit=
function parsePagination(query) {
  const page = query.page === undefined ? 1 : toPositiveInt(query.page);
  const limit = query.limit === undefined ? 10 : toPositiveInt(query.limit);
  if (page === null) return { error: 'Parameter page harus berupa angka bulat mulai dari 1.' };
  if (limit === null || limit > MAX_LIMIT) {
    return { error: `Parameter limit harus berupa angka bulat antara 1 dan ${MAX_LIMIT}.` };
  }
  return { page, limit };
}

module.exports = { toPositiveInt, parsePagination };