// Unit test untuk utils/scoring.js (FR-06 sampai FR-10, NFR-17, NFR-24).
// Jalankan: npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const { scoreCandidate, skillScore, workloadScore, deadlineScore, classify } = require('../utils/scoring');
const defaultConfig = require('../scoringConfig');

// Konfigurasi tetap untuk tes supaya hasilnya tidak berubah kalau tim mengubah angka di scoringConfig.js.
const cfg = {
  SKILL_SCALE: { Low: 1, Medium: 2, High: 3, Expert: 4 },
  WEIGHTS: { skill: 0.4, workload: 0.3, deadline: 0.3 },
  THRESHOLDS: { optimal: 80, suboptimal: 60 },
  HOURS_PER_DAY: 8,
  PRIORITY_STRICTNESS: { Low: 0, Medium: 0, High: 3, Critical: 5 },
};

const approx = (actual, expected, tol = 0.01) =>
  assert.ok(Math.abs(actual - expected) <= tol, `diharapkan sekitar ${expected}, hasilnya ${actual}`);

// ---------- Skill (FR-07) ----------
test('skill: level employee sama atau di atas kebutuhan memberi skor 100', () => {
  assert.equal(skillScore({ skill_level: 'Expert' }, { required_skill_level: 'Medium' }, cfg).score, 100);
  assert.equal(skillScore({ skill_level: 'High' }, { required_skill_level: 'High' }, cfg).score, 100);
});

test('skill: level di bawah kebutuhan dihitung proporsional', () => {
  approx(skillScore({ skill_level: 'Medium' }, { required_skill_level: 'High' }, cfg).score, 66.67);
  assert.equal(skillScore({ skill_level: 'Low' }, { required_skill_level: 'Expert' }, cfg).score, 25);
});

test('skill: detail menjelaskan hasilnya', () => {
  const ok = skillScore({ skill_level: 'Expert' }, { required_skill_level: 'Low' }, cfg);
  const low = skillScore({ skill_level: 'Low' }, { required_skill_level: 'Expert' }, cfg);
  assert.match(ok.detail, /memenuhi/);
  assert.match(low.detail, /di bawah/);
});

test('skill: level yang tidak dikenal melempar error', () => {
  assert.throws(() => skillScore({ skill_level: 'Master' }, { required_skill_level: 'High' }, cfg), /tidak dikenal/);
  assert.throws(() => skillScore({ skill_level: 'High' }, { required_skill_level: 'Aneh' }, cfg), /tidak dikenal/);
});

// ---------- Workload (FR-08) ----------
test('workload: kapasitas kosong dibanding jam kerja task', () => {
  assert.equal(workloadScore({ idle_time_hours: 4 }, { workload_hours: 5 }).score, 80);
  assert.equal(workloadScore({ idle_time_hours: 5 }, { workload_hours: 5 }).score, 100);
  assert.equal(workloadScore({ idle_time_hours: 0 }, { workload_hours: 5 }).score, 0);
});

test('workload: skor tidak melebihi 100 walau kapasitas kosong lebih besar dari kebutuhan', () => {
  assert.equal(workloadScore({ idle_time_hours: 20 }, { workload_hours: 2 }).score, 100);
});

// ---------- Deadline (FR-09) ----------
test('deadline: waktu cukup memberi skor 100', () => {
  assert.equal(deadlineScore({ deadline_days: 16, workload_hours: 5 }, cfg).score, 100);
});

test('deadline: waktu kurang dihitung proporsional', () => {
  approx(deadlineScore({ deadline_days: 1, workload_hours: 11 }, cfg).score, 72.73); // 8 jam / 11 jam
});

// ---------- Status dan priority (FR-10, FR-11, FR-12) ----------
test('classify: ambang Optimal dan Suboptimal untuk priority Low', () => {
  assert.equal(classify(80, 'Low', cfg).status, 'Optimal');
  assert.equal(classify(79.9, 'Low', cfg).status, 'Suboptimal');
  assert.equal(classify(60, 'Low', cfg).status, 'Suboptimal');
  assert.equal(classify(59.9, 'Low', cfg).status, 'Requires Reassignment');
});

test('classify: priority Critical memperketat ambang 5 poin', () => {
  const r = classify(84, 'Critical', cfg);
  assert.equal(r.status, 'Suboptimal'); // butuh 85 untuk Optimal
  assert.deepEqual([r.optimal_threshold, r.suboptimal_threshold], [85, 65]);
  assert.equal(classify(64, 'Critical', cfg).status, 'Requires Reassignment');
});

test('classify: priority yang tidak dikenal tidak mengubah ambang', () => {
  assert.equal(classify(80, 'Aneh', cfg).optimal_threshold, 80);
});

// ---------- Gabungan (FR-06, FR-15, FR-16) ----------
const allocation1 = { // employee 1 dan task 1 dari dataset
  skill_level: 'Low', idle_time_hours: 4,
  required_skill_level: 'Expert', workload_hours: 5, deadline_days: 16, task_priority: 'Critical',
};
const allocation2 = { // employee 2 dan task 2 dari dataset
  skill_level: 'Expert', idle_time_hours: 2,
  required_skill_level: 'Medium', workload_hours: 6, deadline_days: 12, task_priority: 'Low',
};

test('scoreCandidate: allocation 1 menghasilkan skor 64 dan Requires Reassignment', () => {
  const r = scoreCandidate(allocation1, allocation1, cfg);
  assert.equal(r.candidate_score, 64); // 0,4*25 + 0,3*80 + 0,3*100
  assert.equal(r.status, 'Requires Reassignment');
  assert.deepEqual(r.thresholds, { optimal: 85, suboptimal: 65 });
});

test('scoreCandidate: allocation 2 menghasilkan skor 80 dan Optimal', () => {
  const r = scoreCandidate(allocation2, allocation2, cfg);
  assert.equal(r.candidate_score, 80);
  assert.equal(r.status, 'Optimal');
});

test('scoreCandidate: setiap faktor punya skor, bobot, kontribusi, dan penjelasan (explainable)', () => {
  const r = scoreCandidate(allocation1, allocation1, cfg);
  assert.deepEqual(r.factors.map((f) => f.factor), ['skill', 'workload', 'deadline']);
  for (const f of r.factors) {
    assert.equal(typeof f.detail, 'string');
    assert.ok(f.detail.length > 0);
    approx(f.contribution, f.score * f.weight, 0.06);
  }
  const total = r.factors.reduce((s, f) => s + f.contribution, 0);
  approx(r.candidate_score, total, 0.2);
});

test('scoreCandidate: input yang sama selalu menghasilkan hasil yang sama (NFR-17)', () => {
  assert.deepEqual(scoreCandidate(allocation1, allocation1, cfg), scoreCandidate({ ...allocation1 }, { ...allocation1 }, cfg));
});

test('scoreCandidate: mengubah konfigurasi mengubah hasil tanpa mengubah kode (NFR-24)', () => {
  const noStrictness = { ...cfg, PRIORITY_STRICTNESS: { Low: 0, Medium: 0, High: 0, Critical: 0 } };
  assert.equal(scoreCandidate(allocation1, allocation1, cfg).status, 'Requires Reassignment');
  assert.equal(scoreCandidate(allocation1, allocation1, noStrictness).status, 'Suboptimal'); // 64 >= 60
});

test('scoreCandidate: skor selalu di rentang 0 sampai 100', () => {
  const worst = scoreCandidate(
    { skill_level: 'Low', idle_time_hours: 0, required_skill_level: 'Expert', workload_hours: 11, deadline_days: 1, task_priority: 'Critical' },
    { skill_level: 'Low', idle_time_hours: 0, required_skill_level: 'Expert', workload_hours: 11, deadline_days: 1, task_priority: 'Critical' },
    cfg
  );
  assert.ok(worst.candidate_score >= 0 && worst.candidate_score <= 100);
});

// ---------- Konfigurasi bawaan proyek ----------
test('scoringConfig: bobot candidate score berjumlah 1', () => {
  const sum = Object.values(defaultConfig.WEIGHTS).reduce((a, b) => a + b, 0);
  approx(sum, 1, 0.0001);
});

test('scoringConfig: ambang Optimal lebih tinggi dari Suboptimal', () => {
  assert.ok(defaultConfig.THRESHOLDS.optimal > defaultConfig.THRESHOLDS.suboptimal);
});