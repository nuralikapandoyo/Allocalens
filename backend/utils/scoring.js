// Mesin skoring kecocokan employee-task (FR-06 s.d. FR-10, FR-15, FR-16).
// Fungsi murni: tidak menyentuh database, jadi mudah diuji dan hasilnya selalu sama untuk input sama (NFR-17).
const defaultConfig = require('../scoringConfig');

const round1 = (n) => Math.round(n * 10) / 10;
const clamp100 = (n) => Math.max(0, Math.min(100, n));

function level(config, value, label) {
  const n = config.SKILL_SCALE[value];
  if (n === undefined) throw new Error(`${label} tidak dikenal: ${value}`);
  return n;
}

// Skill match: 100 kalau employee >= kebutuhan, selain itu proporsional (contoh Medium vs High = 2/3 = 66,7).
function skillScore(employee, task, config) {
  const have = level(config, employee.skill_level, 'skill_level');
  const need = level(config, task.required_skill_level, 'required_skill_level');
  const score = clamp100(Math.min(1, have / need) * 100);
  return {
    score,
    detail: have >= need
      ? `Skill ${employee.skill_level} memenuhi kebutuhan task (${task.required_skill_level}).`
      : `Skill ${employee.skill_level} berada di bawah kebutuhan task (${task.required_skill_level}).`,
  };
}

// Workload/capacity (SEMENTARA): kapasitas kosong employee (idle_time_hours) dibanding jam kerja task.
function workloadScore(employee, task) {
  const idle = Number(employee.idle_time_hours);
  const hours = Number(task.workload_hours);
  const score = clamp100(Math.min(1, idle / hours) * 100);
  return {
    score,
    detail: `Kapasitas kosong ${idle} jam dibanding kebutuhan task ${hours} jam.`,
  };
}

// Deadline feasibility (SEMENTARA): jam tersedia sampai deadline dibanding jam kerja task.
function deadlineScore(task, config) {
  const available = Number(task.deadline_days) * config.HOURS_PER_DAY;
  const hours = Number(task.workload_hours);
  const score = clamp100(Math.min(1, available / hours) * 100);
  return {
    score,
    detail: `Tersedia ${available} jam kerja sampai deadline (${task.deadline_days} hari), task butuh ${hours} jam.`,
  };
}

// Status dari skor. Priority memperketat ambang, bukan menambah skor.
function classify(score, priority, config) {
  const extra = config.PRIORITY_STRICTNESS[priority] || 0;
  const optimal = config.THRESHOLDS.optimal + extra;
  const suboptimal = config.THRESHOLDS.suboptimal + extra;
  const status = score >= optimal ? 'Optimal' : score >= suboptimal ? 'Suboptimal' : 'Requires Reassignment';
  return { status, optimal_threshold: optimal, suboptimal_threshold: suboptimal };
}

// Hitung skor satu pasangan employee-task. Data harus sudah lolos validasi (utils/validators.js).
function scoreCandidate(employee, task, config = defaultConfig) {
  const parts = {
    skill: skillScore(employee, task, config),
    workload: workloadScore(employee, task),
    deadline: deadlineScore(task, config),
  };

  const factors = Object.entries(parts).map(([name, p]) => {
    const weight = config.WEIGHTS[name];
    return {
      factor: name,
      score: round1(p.score),
      weight,
      contribution: round1(p.score * weight),
      detail: p.detail,
    };
  });

  const candidateScore = round1(factors.reduce((sum, f) => sum + f.score * f.weight, 0));
  const cls = classify(candidateScore, task.task_priority, config);

  return {
    candidate_score: candidateScore,
    status: cls.status,
    thresholds: { optimal: cls.optimal_threshold, suboptimal: cls.suboptimal_threshold },
    task_priority: task.task_priority,
    factors,
  };
}

module.exports = { scoreCandidate, skillScore, workloadScore, deadlineScore, classify };