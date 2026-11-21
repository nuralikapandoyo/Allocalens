// Penghubung antara web (React) dan backend Allocalens.
// Semua permintaan ke backend lewat file ini, supaya alamat server dan token cukup diatur di satu tempat.

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

// Token disimpan di memori. Kalau halaman di-refresh, pengguna perlu login lagi.
let token = null;

export function setToken(newToken) {
  token = newToken;
}

// Dipanggil kalau server membalas 401 saat sudah login (token kedaluwarsa), supaya UI kembali ke halaman login.
let onUnauthorized = null;
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
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

  if (res.status === 401 && token && onUnauthorized) onUnauthorized();

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

  // Kandidat dan penugasan task (PM dan HR)
  taskCandidates: (id, limit) => request(`/tasks/${id}/candidates${toQuery({ limit })}`),
  compareCandidates: (taskId, employeeIds) => request(`/tasks/${taskId}/compare${toQuery({ employee_ids: employeeIds.join(',') })}`),
  assignTask: (taskId, employeeId) => request(`/tasks/${taskId}/assign`, { method: 'POST', body: { employee_id: employeeId } }),

  // Ringkasan beban kerja untuk halaman Allocation Analysis (HR)
  workloadOverview: () => request('/analysis/overview'),

  // Status alokasi, antrean review, dan keputusan reassignment (HR)
  allocationSummary: () => request('/allocations/summary'),
  flaggedAllocations: (params) => request(`/allocations/flagged${toQuery(params)}`),
  allocationDecisions: (params) => request(`/allocations/decisions${toQuery(params)}`),
  reassignAllocation: (id, employeeId) => request(`/allocations/${id}/reassign`, { method: 'POST', body: { employee_id: employeeId } }),
  keepAllocation: (id) => request(`/allocations/${id}/keep`, { method: 'POST', body: {} }),
};