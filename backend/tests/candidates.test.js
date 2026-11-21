// Unit test untuk utils/candidates.js (pengurutan kandidat, tie-break, dan bentuk response).
// Jalankan: npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const { rankCandidates, publicEmployee, isValidEmployee, isMissingTable } = require('../utils/candidates');

const emp = (over = {}) => ({
  id: 1, name: null, age: 30, experience_years: 5, education_level: 'Bachelor', department: 'IT',
  skill_level: 'High', technical_skill_score: 70, communication_score: 70, leadership_score: 70,
  problem_solving_score: 70, attendance_rate: 90, performance_rating: 'Good', idle_time_hours: 6,
  conflict_rate: 2, previous_task_success_rate: 85, task_count: 1, total_workload_hours: 4, ...over,
});
const task = { required_skill_level: 'High', workload_hours: 6, deadline_days: 10, task_priority: 'Medium' };

test('kandidat diurutkan dari skor tertinggi', () => {
  const list = [
    emp({ id: 1, skill_level: 'Low' }),
    emp({ id: 2, skill_level: 'Expert' }),
    emp({ id: 3, skill_level: 'Medium' }),
  ];
  const ranked = rankCandidates(list, task);
  assert.deepEqual(ranked.map((r) => r.employee.id), [2, 3, 1]);
  assert.ok(ranked[0].candidate_score >= ranked[1].candidate_score);
  assert.ok(ranked[1].candidate_score >= ranked[2].candidate_score);
});

test('skor sama: idle time lebih besar menang, lalu id lebih kecil', () => {
  // idle_time_hours >= workload_hours (6) -> skor workload sama-sama 100, jadi skor total sama.
  const list = [emp({ id: 9, idle_time_hours: 8 }), emp({ id: 5, idle_time_hours: 10 }), emp({ id: 4, idle_time_hours: 8 })];
  const ranked = rankCandidates(list, task);
  assert.equal(new Set(ranked.map((r) => r.candidate_score)).size, 1);
  assert.deepEqual(ranked.map((r) => r.employee.id), [5, 4, 9]);
});

test('excludeId dan limit bekerja', () => {
  const list = [emp({ id: 1 }), emp({ id: 2 }), emp({ id: 3 })];
  assert.deepEqual(rankCandidates(list, task, { excludeId: 1 }).map((r) => r.employee.id), [2, 3]);
  assert.equal(rankCandidates(list, task, { limit: 2 }).length, 2);
});

test('employee yang skornya tidak bisa dihitung dilewati', () => {
  const list = [emp({ id: 1, skill_level: 'Aneh' }), emp({ id: 2 })];
  assert.deepEqual(rankCandidates(list, task).map((r) => r.employee.id), [2]);
});

test('response employee memuat kapasitas dan utilisasi', () => {
  const p = publicEmployee(emp({ total_workload_hours: 6 }));
  assert.equal(p.capacity_hours, 8);
  assert.equal(p.utilization_pct, 75);
  assert.equal(p.name, null);
});

test('isValidEmployee menolak data yang melanggar aturan', () => {
  assert.equal(isValidEmployee(emp()), true);
  assert.equal(isValidEmployee(emp({ age: 5 })), false);
});

test('isMissingTable mengenali kode error 42P01', () => {
  assert.equal(isMissingTable({ code: '42P01' }), true);
  assert.equal(isMissingTable({ code: '23505' }), false);
  assert.equal(isMissingTable(null), false);
});