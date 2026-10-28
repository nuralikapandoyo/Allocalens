// Penghubung antara web (React) dan backend Allocalens.
// Semua permintaan ke backend lewat file ini, supaya alamat server dan token cukup diatur di satu tempat.

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

// Token disimpan di memori. Kalau halaman di-refresh, pengguna perlu login lagi.
let token = null;

export function setToken(newToken) {
  token = newToken;
}

// Ubah objek { page: 1, limit: 10 } menjadi teks "?page=1&limit=10". Nilai kosong dilewati.
function toQuery(params = {}) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') q.append(key, value);
  });
  const text = q.toString();
  return text ? `?${text}` : '';
}

async function request(path, { method = 'GET', body } = {}) {
  let res;
  try {
    res = await fetch(BASE_URL + path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    throw new Error('Tidak bisa terhubung ke server. Pastikan backend sudah dinyalakan (node index.js).');
  }

  let data = null;
  try {
    data = await res.json();
  } catch (err) {
    data = null;
  }

  if (!res.ok) {
    let message = (data && data.error) || `Permintaan gagal (kode ${res.status}).`;
    // Kalau ada rincian per field (data tidak valid), gabungkan supaya kelihatan field mana yang salah.
    if (data && Array.isArray(data.details)) {
      message += ' ' + data.details.map((d) => d.message).join(' ');
    }
    const error = new Error(message);
    error.status = res.status;
    throw error;
  }
  return data;
}

export const api = {
  login: (email, password) => request('/auth/login', { method: 'POST', body: { email, password } }),

  listEmployees: (params) => request(`/employees${toQuery(params)}`),
  getEmployee: (id) => request(`/employees/${id}`),

  listTasks: (params) => request(`/tasks${toQuery(params)}`),
  getTask: (id) => request(`/tasks/${id}`),
  createTask: (data) => request('/tasks', { method: 'POST', body: data }),
  updateTask: (id, data) => request(`/tasks/${id}`, { method: 'PUT', body: data }),

  validateDataset: () => request('/validation'),

  runAnalysis: (allocationId) => request('/analysis/run', { method: 'POST', body: { allocation_id: allocationId } }),
  getAnalysis: (allocationId) => request(`/analysis/${allocationId}`),
};