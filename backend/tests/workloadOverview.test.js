// Unit test untuk utils/workloadOverview.js. Jalankan: npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const { summarizeWorkload, levelOf } = require('../utils/workloadOverview');

test('levelOf memakai batas 70% dan 110%', () => {
  assert.equal(levelOf(69.9), 'under');
  assert.equal(levelOf(70), 'balanced');
  assert.equal(levelOf(110), 'balanced');
  assert.equal(levelOf(110.1), 'over');
});

test('ringkasan: overload, rata-rata, kapasitas tersisa', () => {
  // kapasitas 8 jam: 4 jam = 50% (under), 8 jam = 100% (balanced), 10 jam = 125% (over), 0 jam = 0% (under)
  const rows = [
    { id: 1, department: 'IT', hours: 4 }, { id: 2, department: 'IT', hours: 8 },
    { id: 3, department: 'HR', hours: 10 }, { id: 4, department: 'HR', hours: 0 },
  ];
  const s = summarizeWorkload(rows, 8);
  assert.equal(s.total_employees, 4);
  assert.deepEqual(s.overloaded, { count: 1, pct: 25 });
  assert.deepEqual(s.under_used, { count: 2, unused_hours: 12 }); // (8-4) + (8-0)
  assert.equal(s.average_utilization_pct, 69); // 22 jam / 4 / 8 = 68.75%
});

test('per departemen diurutkan nama dan diberi level', () => {
  const rows = [
    { id: 1, department: 'IT', hours: 4 }, { id: 2, department: 'IT', hours: 8 },
    { id: 3, department: 'HR', hours: 10 }, { id: 4, department: 'HR', hours: 10 },
  ];
  const s = summarizeWorkload(rows, 8);
  assert.deepEqual(s.by_department.map((d) => d.department), ['HR', 'IT']);
  assert.equal(s.by_department[0].avg_utilization_pct, 125);
  assert.equal(s.by_department[0].level, 'over');
  assert.equal(s.by_department[1].avg_utilization_pct, 75);
  assert.equal(s.by_department[1].level, 'balanced');
});

test('10 beban tertinggi: jam terbesar dulu, seri -> id kecil', () => {
  const rows = Array.from({ length: 15 }, (_, i) => ({ id: i + 1, department: 'IT', hours: i % 5 }));
  const s = summarizeWorkload(rows, 8);
  assert.equal(s.top_workloads.length, 10);
  assert.deepEqual(s.top_workloads.slice(0, 3).map((x) => x.id), [5, 10, 15]); // semua 4 jam, id kecil dulu
  assert.equal(s.top_workloads[0].utilization_pct, 50);
});

test('data kosong tidak error', () => {
  const s = summarizeWorkload([], 8);
  assert.equal(s.total_employees, 0);
  assert.equal(s.average_utilization_pct, 0);
  assert.deepEqual(s.by_department, []);
});