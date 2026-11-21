// Ringkasan beban kerja untuk halaman Allocation Analysis.
// Batas level sama dengan badge di web: di bawah 70% = under, di atas 110% = over, sisanya balanced.
const UNDER_PCT = 70;
const OVER_PCT = 110;

const levelOf = (pct) => (pct > OVER_PCT ? 'over' : pct < UNDER_PCT ? 'under' : 'balanced');
const round1 = (n) => Math.round(n * 10) / 10;

// rows = [{ id, department, hours }] satu baris per employee, capacity = jam kapasitas per employee.
function summarizeWorkload(rows, capacity) {
  const total = rows.length;
  const items = rows.map((r) => {
    const hours = Number(r.hours) || 0;
    return { id: r.id, department: r.department, hours, pct: (hours / capacity) * 100 };
  });

  const over = items.filter((i) => levelOf(i.pct) === 'over');
  const under = items.filter((i) => levelOf(i.pct) === 'under');
  const hoursSum = items.reduce((sum, i) => sum + i.hours, 0);

  const byDept = new Map();
  items.forEach((i) => {
    if (!byDept.has(i.department)) byDept.set(i.department, { department: i.department, employees: 0, hours: 0 });
    const d = byDept.get(i.department);
    d.employees += 1;
    d.hours += i.hours;
  });

  const by_department = [...byDept.values()]
    .map((d) => {
      const avg = Math.round((d.hours / d.employees / capacity) * 100);
      return { department: d.department, employees: d.employees, avg_utilization_pct: avg, level: levelOf(avg) };
    })
    .sort((a, b) => String(a.department).localeCompare(String(b.department)));

  const top_workloads = [...items]
    .sort((a, b) => b.hours - a.hours || a.id - b.id)
    .slice(0, 10)
    .map((i) => ({ id: i.id, department: i.department, hours: i.hours, utilization_pct: round1(i.pct), level: levelOf(i.pct) }));

  return {
    capacity_hours: capacity,
    thresholds: { under: UNDER_PCT, over: OVER_PCT },
    total_employees: total,
    overloaded: { count: over.length, pct: total ? Math.round((over.length / total) * 100) : 0 },
    under_used: { count: under.length, unused_hours: round1(under.reduce((sum, i) => sum + (capacity - i.hours), 0)) },
    average_utilization_pct: total ? Math.round((hoursSum / total / capacity) * 100) : 0,
    by_department,
    top_workloads,
  };
}

module.exports = { UNDER_PCT, OVER_PCT, levelOf, summarizeWorkload };