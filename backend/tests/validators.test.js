// Unit test untuk utils/validators.js (FR-05, NFR-14, NFR-15).
const test = require('node:test');
const assert = require('node:assert/strict');
const { validate, validateEmployee, validateTask, validateTaskText, EMPLOYEE_RULES } = require('../utils/validators');

const employee1 = { // employee 1 dari dataset
  age: 50, experience_years: 10, education_level: 'Master', department: 'Marketing', skill_level: 'Low',
  technical_skill_score: 73, communication_score: 64, leadership_score: 84, problem_solving_score: 46,
  attendance_rate: 72, performance_rating: 'Average', idle_time_hours: 4, conflict_rate: 3,
  previous_task_success_rate: 88,
};
const task1 = { // task 1 dari dataset
  task_complexity: 'Medium', required_skill_level: 'Expert', deadline_days: 16,
  workload_hours: 5, task_priority: 'Critical', team_size: 5,
};
const fields = (errors) => errors.map((e) => e.field);

// ---------- Employee ----------
test('employee: data lengkap dan benar lolos', () => {
  assert.deepEqual(validateEmployee(employee1), []);
});

test('employee: kolom wajib yang kosong ditolak', () => {
  const e = validateEmployee({ ...employee1, department: null, age: undefined, skill_level: '   ' });
  assert.deepEqual(fields(e).sort(), ['age', 'department', 'skill_level']);
  assert.match(e[0].message, /wajib diisi/);
});

test('employee: angka di luar rentang ditolak', () => {
  assert.deepEqual(fields(validateEmployee({ ...employee1, age: 16 })), ['age']);
  assert.deepEqual(fields(validateEmployee({ ...employee1, technical_skill_score: 101 })), ['technical_skill_score']);
  assert.deepEqual(fields(validateEmployee({ ...employee1, conflict_rate: -1 })), ['conflict_rate']);
});

test('employee: angka berbentuk teks diterima, desimal ditolak', () => {
  assert.deepEqual(validateEmployee({ ...employee1, age: '50' }), []);
  const e = validateEmployee({ ...employee1, age: 50.5 });
  assert.deepEqual(fields(e), ['age']);
  assert.match(e[0].message, /angka bulat/);
});

test('employee: nilai pilihan yang tidak dikenal ditolak dan pesannya menyebut daftar yang benar', () => {
  const e = validateEmployee({ ...employee1, department: 'Legal' });
  assert.deepEqual(fields(e), ['department']);
  assert.match(e[0].message, /Finance/);
});

test('employee: pengalaman kerja tidak boleh lebih besar dari usia', () => {
  const e = validateEmployee({ ...employee1, age: 30, experience_years: 35 });
  assert.deepEqual(fields(e), ['experience_years']);
  assert.match(e[0].message, /lebih besar dari age/);
  assert.deepEqual(validateEmployee({ ...employee1, age: 30, experience_years: 30 }), []);
});

test('employee: banyak masalah dilaporkan sekaligus', () => {
  const e = validateEmployee({ ...employee1, age: 10, department: 'Legal', attendance_rate: 200 });
  assert.equal(e.length, 3);
});

// ---------- Task ----------
test('task: data lengkap dan benar lolos', () => {
  assert.deepEqual(validateTask(task1), []);
});

test('task: deadline, workload, dan team_size harus dalam rentang', () => {
  assert.deepEqual(fields(validateTask({ ...task1, deadline_days: 0 })), ['deadline_days']);
  assert.deepEqual(fields(validateTask({ ...task1, workload_hours: 169 })), ['workload_hours']);
  assert.deepEqual(fields(validateTask({ ...task1, team_size: 0 })), ['team_size']);
});

test('task: kompleksitas, skill, dan prioritas hanya menerima nilai resmi', () => {
  assert.deepEqual(fields(validateTask({ ...task1, task_complexity: 'Sulit' })), ['task_complexity']);
  assert.deepEqual(fields(validateTask({ ...task1, task_priority: 'Urgent' })), ['task_priority']);
  assert.deepEqual(fields(validateTask({ ...task1, required_skill_level: 'Master' })), ['required_skill_level']);
});

test('task: baris kosong atau null ditolak tanpa membuat error', () => {
  assert.equal(validateTask({}).length, 6);
  assert.equal(validate(null, EMPLOYEE_RULES).length, EMPLOYEE_RULES.length);
});

// ---------- Teks task (nama dan deskripsi) ----------
test('teks task: nama tidak wajib untuk task dari dataset', () => {
  assert.deepEqual(validateTaskText({}), []);
});

test('teks task: nama wajib saat PM membuat task baru', () => {
  const e = validateTaskText({}, { requireName: true });
  assert.deepEqual(fields(e), ['task_name']);
});

test('teks task: nama kosong atau terlalu panjang ditolak', () => {
  assert.deepEqual(fields(validateTaskText({ task_name: '   ' })), ['task_name']);
  assert.deepEqual(fields(validateTaskText({ task_name: 'a'.repeat(151) })), ['task_name']);
  assert.deepEqual(validateTaskText({ task_name: 'a'.repeat(150) }), []);
});

test('teks task: deskripsi harus teks dan maksimal 2000 karakter', () => {
  assert.deepEqual(fields(validateTaskText({ description: 123 })), ['description']);
  assert.deepEqual(fields(validateTaskText({ description: 'x'.repeat(2001) })), ['description']);
  assert.deepEqual(validateTaskText({ description: null }), []);
});