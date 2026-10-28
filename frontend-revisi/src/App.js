import React, { useState, useEffect, useMemo, useRef } from 'react';

/* =========================================================
   CONSTANTS, UTILS, DATA
   ========================================================= */
const CAP = 40;
const r1 = (n) => Math.round(n * 10) / 10;
const pct = (h) => Math.round((h / CAP) * 100);
const util = (e) => pct(e.hours);
const initials = (n) => n.split(' ').filter(Boolean).map((s) => s[0]).join('').slice(0, 2).toUpperCase();
const fmt = (n) => new Intl.NumberFormat('en-US').format(n);
const nowStr = () => new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const emailOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

const allocStatusP = (u) => (u > 110 ? 'reassign' : u < 70 ? 'sub' : 'optimal');
const allocStatus = (e) => allocStatusP(util(e));

const STATUS_META = {
  optimal: { label: 'Optimal', cls: 'bg-emerald-50 text-emerald-800 border-emerald-300', icon: 'check', hex: '#059669', bar: 'bg-emerald-600', range: '70%–110% of weekly capacity' },
  sub: { label: 'Suboptimal', cls: 'bg-amber-50 text-amber-800 border-amber-300', icon: 'info', hex: '#d97706', bar: 'bg-amber-500', range: 'Below 70% of weekly capacity (under-used)' },
  reassign: { label: 'Requires Reassignment', cls: 'bg-red-50 text-red-800 border-red-300', icon: 'alert', hex: '#dc2626', bar: 'bg-red-600', range: 'Above 110% of weekly capacity (burnout risk)' },
};
const PRIORITY_META = {
  Critical: 'bg-red-50 text-red-800 border-red-300',
  High: 'bg-orange-50 text-orange-800 border-orange-300',
  Medium: 'bg-sky-50 text-sky-800 border-sky-300',
  Low: 'bg-slate-100 text-slate-700 border-slate-300',
};
const TASK_STATUS_META = {
  'Needs Candidates': 'bg-amber-50 text-amber-800 border-amber-300',
  'In Progress': 'bg-blue-50 text-blue-800 border-blue-300',
};
const REC_STATUS_META = {
  Pending: 'bg-sky-50 text-sky-800 border-sky-300',
  Accepted: 'bg-emerald-50 text-emerald-800 border-emerald-300',
  Dismissed: 'bg-slate-100 text-slate-700 border-slate-300',
  Superseded: 'bg-slate-100 text-slate-700 border-slate-300',
};

const initialEmployees = [
  { id: 'EMP-8842', name: 'Elena Vance', title: 'Senior Software Engineer', dept: 'Engineering', pod: 'Platform Infrastructure', location: 'San Francisco (Remote)', tenure: 5, hours: 32, skills: { Postgres: 95, 'Distributed Systems': 96, Architecture: 90, Python: 88, Kafka: 70 } },
  { id: 'EMP-7710', name: 'Marcus Chen', title: 'Staff Systems Architect', dept: 'Engineering', pod: 'Platform Infrastructure', location: 'Singapore', tenure: 8, hours: 38, skills: { Postgres: 98, Replication: 94, SAML: 92, Go: 85, Apollo: 80, Architecture: 91, 'Node.js': 78 } },
  { id: 'EMP-6403', name: 'Lucas Moreau', title: 'Backend Engineer', dept: 'Engineering', pod: 'Core Services', location: 'Paris', tenure: 3, hours: 19, skills: { Postgres: 81, 'SQL Tuning': 78, 'Node.js': 74, 'GitHub Actions': 70, Redis: 72 } },
  { id: 'EMP-5521', name: 'David Kim', title: 'Lead Frontend Engineer', dept: 'Engineering', pod: 'Platform Infrastructure', location: 'Seoul', tenure: 6, hours: 46.5, skills: { Postgres: 74, React: 90, 'Node.js': 82, Apollo: 78, 'Distributed Systems': 60 } },
  { id: 'EMP-5102', name: 'Alex Rivera', title: 'Software Engineer', dept: 'Engineering', pod: 'Identity', location: 'Austin', tenure: 4, hours: 38, skills: { Go: 80, SAML: 60, 'Node.js': 85, OAuth2: 70 } },
  { id: 'EMP-3302', name: 'Omar Haddad', title: 'Backend Engineer', dept: 'Engineering', pod: 'Billing', location: 'Dubai', tenure: 4, hours: 45, skills: { Go: 88, Postgres: 70, Kafka: 85, Flink: 78, Apollo: 65, 'SQL Tuning': 62 } },
  { id: 'EMP-4890', name: 'Priya Nair', title: 'Product Manager', dept: 'Product', pod: 'Growth', location: 'Bengaluru', tenure: 5, hours: 35, skills: { Roadmapping: 90, Analytics: 85, 'SQL Tuning': 60 } },
  { id: 'EMP-2985', name: 'Julia Becker', title: 'Product Analyst', dept: 'Product', pod: 'Growth', location: 'Berlin', tenure: 2, hours: 30, skills: { Analytics: 90, 'SQL Tuning': 82, Postgres: 60, React: 55 } },
  { id: 'EMP-4377', name: 'Sofia Almeida', title: 'UX Designer', dept: 'UX', pod: 'Design Systems', location: 'Lisbon', tenure: 3, hours: 28, skills: { Figma: 94, Research: 88, React: 50 } },
  { id: 'EMP-3664', name: 'Hana Tanaka', title: 'UX Researcher', dept: 'UX', pod: 'Design Systems', location: 'Tokyo', tenure: 2, hours: 24, skills: { Research: 92, Figma: 80, React: 60 } },
  { id: 'EMP-3921', name: 'Rahmat Hidayat', title: 'DevOps Engineer', dept: 'Operations', pod: 'Reliability', location: 'Jakarta', tenure: 5, hours: 41, skills: { eBPF: 85, 'GitHub Actions': 90, Redis: 88, Kubernetes: 86 } },
  { id: 'EMP-2610', name: 'Ben Okafor', title: 'Site Reliability Engineer', dept: 'Operations', pod: 'Reliability', location: 'Lagos', tenure: 4, hours: 36, skills: { Redis: 90, Kubernetes: 80, eBPF: 70, 'GitHub Actions': 85 } },
];
const DEPTS = ['Engineering', 'Product', 'UX', 'Operations'];

const initialTasks = [
  { id: 'TSK-203', name: 'Project Planning Dashboard', desc: 'React, Analytics • Planning dashboard for PMs', skills: ['React', 'Analytics'], complexity: 'High', priority: 'High', hours: 20, weekly: 5, status: 'Needs Candidates', assignedId: null },
  { id: 'TSK-802', name: 'Database System Migration', desc: 'Postgres 16, Distributed DB • Refactor schema & multi-region replication', skills: ['Postgres', 'Distributed Systems'], complexity: 'High', priority: 'Critical', hours: 40, weekly: 6, status: 'In Progress', assignedId: 'EMP-5521' },
  { id: 'TSK-741', name: 'Enterprise Multi-Tenant Auth', desc: 'SAML 2.0, Go • Identity federation and SSO lifecycle hooks', skills: ['SAML', 'Go'], complexity: 'High', priority: 'High', hours: 32, weekly: 2, status: 'In Progress', assignedId: 'EMP-5102' },
  { id: 'TSK-689', name: 'Realtime Analytics Pipeline Webhook', desc: 'Apache Flink, Kafka • Connect streaming cluster to lakehouse', skills: ['Kafka', 'Flink'], complexity: 'Medium', priority: 'Medium', hours: 24, weekly: 6, status: 'Needs Candidates', assignedId: null },
  { id: 'TSK-650', name: 'GraphQL Gateway Schema Stitching', desc: 'Apollo, Node.js • Combine billing, auth, and user subgraphs', skills: ['Apollo', 'Node.js'], complexity: 'High', priority: 'High', hours: 45, weekly: 8, status: 'In Progress', assignedId: 'EMP-7710' },
  { id: 'TSK-512', name: 'CI/CD Pipeline Cache Optimization', desc: 'eBPF, GitHub Actions • Distributed build runner caching', skills: ['eBPF', 'GitHub Actions'], complexity: 'Low', priority: 'Low', hours: 16, weekly: 4, status: 'In Progress', assignedId: 'EMP-6403' },
  { id: 'TSK-715', name: 'Billing Service Hardening', desc: 'Postgres, SQL Tuning • Index review & query plan stabilization', skills: ['Postgres', 'SQL Tuning'], complexity: 'High', priority: 'High', hours: 36, weekly: 8, status: 'In Progress', assignedId: 'EMP-3302' },
  { id: 'TSK-403', name: 'Redis Cache Cluster Sharding', desc: 'Redis 7, Cluster Mode • Memory tuning and eviction policy', skills: ['Redis', 'Kubernetes'], complexity: 'Medium', priority: 'Medium', hours: 20, weekly: 5, status: 'Needs Candidates', assignedId: null },
  { id: 'TSK-330', name: 'Notification Service Refactor', desc: 'Go, Kafka • Split email/push channels into separate workers', skills: ['Go', 'Kafka'], complexity: 'Medium', priority: 'Medium', hours: 28, weekly: 6, status: 'Needs Candidates', assignedId: null },
];

const initialTriage = [
  { taskId: 'TSK-802', kind: 'overcapacity', currentId: 'EMP-5521', proposedId: 'EMP-8842', reason: 'The current assignee is at critical capacity. The proposed candidate has enough free hours and a strong match in PostgreSQL and Distributed Systems.' },
  { taskId: 'TSK-741', kind: 'skillgap', currentId: 'EMP-5102', proposedId: 'EMP-7710', reason: 'This task needs deep experience with SSO/SAML 2.0 modules. The proposed candidate has the strongest match in this domain.' },
  { taskId: 'TSK-715', kind: 'overcapacity', currentId: 'EMP-3302', proposedId: 'EMP-6403', reason: 'The current assignee is above the workload threshold. The proposed candidate is under-used and has solid Postgres and SQL Tuning skills.' },
];

const initialRecs = [
  { id: 'REC-1', impact: 'High', type: 'Reassignment', taskId: 'TSK-802', toId: 'EMP-8842', status: 'Pending' },
  { id: 'REC-2', impact: 'High', type: 'Reassignment', taskId: 'TSK-741', toId: 'EMP-7710', status: 'Pending' },
  { id: 'REC-3', impact: 'Medium', type: 'Reassignment', taskId: 'TSK-715', toId: 'EMP-6403', status: 'Pending' },
  { id: 'REC-4', impact: 'Low', type: 'Staffing', taskId: 'TSK-403', toId: 'EMP-2610', status: 'Pending' },
];

const skillOf = (e, s) => e.skills[s] ?? 30;
const skillAvg = (e, task) => Math.round(task.skills.reduce((a, s) => a + skillOf(e, s), 0) / (task.skills.length || 1));
const matchScore = (task, emp) => {
  const buf = CAP - emp.hours;
  const avail = Math.max(0, Math.min(1, buf / task.weekly)) * 100;
  return Math.round(skillAvg(emp, task) * 0.6 + avail * 0.4);
};
// Who a recommended candidate is compared against:
// the current assignee, or (if the task has none) the next best candidate.
const baselineFor = (task, toId, employees) => {
  const cur = employees.find((e) => e.id === task.assignedId);
  if (cur && cur.id !== toId) return cur;
  return employees
    .filter((e) => e.id !== toId)
    .map((e) => ({ e, s: matchScore(task, e) }))
    .sort((a, b) => b.s - a.s)[0]?.e;
};
const triageView = (item, employees, tasks) => {
  const task = tasks.find((t) => t.id === item.taskId);
  const cur = employees.find((e) => e.id === item.currentId);
  const prop = employees.find((e) => e.id === item.proposedId);
  if (!task || !cur || !prop) return null;
  return {
    task, cur, prop,
    score: matchScore(task, prop),
    curSkill: skillAvg(cur, task),
    propSkill: skillAvg(prop, task),
    trigger: item.kind === 'overcapacity' ? `Overcapacity (${util(cur)}%)` : `Skill Gap (${task.skills.join(', ')})`,
  };
};

/* =========================================================
   MENU & ROUTING
   ========================================================= */
const MENUS = {
  hr: [
    { group: 'CORE', items: [
      { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
      { id: 'employees', label: 'Employees', icon: 'users' },
      { id: 'tasks', label: 'Tasks', icon: 'tasks' },
    ] },
    { group: 'DECISION SUPPORT', items: [
      { id: 'analysis', label: 'Allocation Analysis', icon: 'chart' },
      { id: 'status', label: 'Allocation Status', icon: 'clock' },
      { id: 'recommendations', label: 'Recommendations', icon: 'bolt' },
      { id: 'compare', label: 'Compare Candidates', icon: 'compare' },
    ] },
  ],
  pm: [
    { group: 'PROJECT OPERATIONS', items: [
      { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
      { id: 'tasks', label: 'Tasks', icon: 'tasks' },
      { id: 'candidates', label: 'Candidates', icon: 'users' },
    ] },
  ],
};
const findMenu = (role, page) => {
  for (const g of MENUS[role]) for (const it of g.items) if (it.id === page) return { group: g.group, item: it };
  return null;
};
const parseHash = () => window.location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
const navigate = (to) => { window.location.hash = '/' + to; };

/* =========================================================
   UI KIT
   ========================================================= */
const ICONS = {
  dashboard: <><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></>,
  users: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>,
  tasks: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></>,
  chart: <><path d="M18 20V10" /><path d="M12 20V4" /><path d="M6 20v-6" /></>,
  clock: <><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></>,
  bolt: <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />,
  compare: <><path d="M16 3h5v5" /><path d="M8 3H3v5" /><path d="M21 3l-7 7" /><path d="M3 3l7 7" /><path d="M16 21h5v-5" /><path d="M8 21H3v-5" /><path d="M21 21l-7-7" /><path d="M3 21l7-7" /></>,
  logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></>,
  search: <><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></>,
  bell: <><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></>,
  menu: <><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></>,
  eye: <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></>,
  eyeOff: <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></>,
  check: <polyline points="20 6 9 17 4 12" />,
  alert: <><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></>,
  info: <><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></>,
  x: <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>,
  plus: <><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>,
  chevL: <polyline points="15 18 9 12 15 6" />,
  chevR: <polyline points="9 18 15 12 9 6" />,
  mail: <><path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" /><polyline points="22,6 12,13 2,6" /></>,
  lock: <><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></>,
  layers: <><path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" /></>,
};
const Icon = ({ name, className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICONS[name]}</svg>
);

const btn = (kind = 'primary', size = 'md') =>
  `inline-flex items-center justify-center gap-2 rounded-lg font-bold transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap ${size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm'} ${{
    primary: 'bg-slate-900 text-white hover:bg-slate-700',
    secondary: 'bg-white text-slate-800 border border-slate-300 hover:bg-slate-100',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    ghost: 'text-slate-700 hover:bg-slate-100',
  }[kind]}`;
const inputCls = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-slate-800';

const Card = ({ className = '', id, children }) => (
  <div id={id} className={`bg-white rounded-xl border border-slate-300 shadow-sm min-w-0 ${className}`}>{children}</div>
);

const Badge = ({ cls, icon, children }) => (
  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border whitespace-nowrap ${cls}`}>
    {icon && <Icon name={icon} className="w-3.5 h-3.5" />}{children}
  </span>
);
const StatusBadge = ({ s }) => <Badge cls={STATUS_META[s].cls} icon={STATUS_META[s].icon}>{STATUS_META[s].label}</Badge>;
const PriorityBadge = ({ p }) => <Badge cls={PRIORITY_META[p]}>{p === 'Critical' ? '▲▲ ' : p === 'High' ? '▲ ' : p === 'Low' ? '▼ ' : '● '}{p}</Badge>;

// max = value treated as 100% of the bar width, mark = position of the reference line (same unit as value)
const Bar = ({ value, max = 100, color = 'bg-slate-800', mark }) => (
  <div className="relative w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200" role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin="0" aria-valuemax={max}>
    <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.max(0, Math.min(100, (value / max) * 100))}%` }} />
    {mark != null && <div className="absolute top-0 bottom-0 w-0.5 bg-slate-900" style={{ left: `${(mark / max) * 100}%` }} />}
  </div>
);
const UtilBar = ({ value, status }) => <Bar value={value} max={130} mark={100} color={STATUS_META[status].bar} />;

const StackBar = ({ parts, total }) => (
  <div className="flex w-full h-2.5 rounded-full overflow-hidden bg-slate-100 border border-slate-200">
    {parts.map((p) => p.value > 0 && (
      <div key={p.key} className={STATUS_META[p.key].bar} style={{ width: `${(p.value / (total || 1)) * 100}%` }} title={`${STATUS_META[p.key].label}: ${fmt(p.value)}`} />
    ))}
  </div>
);

const Avatar = ({ name, size = 'w-9 h-9', dark = true }) => (
  <div className={`${size} rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${dark ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-800 border border-slate-300'}`}>{initials(name)}</div>
);

const PageHeader = ({ title, desc, actions }) => (
  <div className="flex flex-wrap items-start justify-between gap-3">
    <div className="min-w-0">
      <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 break-words">{title}</h1>
      {desc && <p className="text-sm text-slate-600 mt-1 max-w-3xl">{desc}</p>}
    </div>
    {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
  </div>
);

const StatCard = ({ label, value, unit, note, icon }) => (
  <Card className="p-4 flex flex-col">
    <div className="flex items-start justify-between gap-2">
      <span className="text-xs font-extrabold text-slate-600 uppercase tracking-wider">{label}</span>
      <span className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 shrink-0"><Icon name={icon} /></span>
    </div>
    <div className="mt-2 flex items-baseline gap-2 flex-wrap">
      <span className="text-2xl xl:text-3xl font-extrabold text-slate-900 tabular-nums break-all">{value}</span>
      {unit && <span className="text-sm font-bold text-slate-600">{unit}</span>}
    </div>
    {note && <div className="text-xs text-slate-600 font-medium mt-1.5 space-y-1.5">{note}</div>}
  </Card>
);

const Empty = ({ children }) => <div className="py-10 px-4 text-center text-sm font-semibold text-slate-500">{children}</div>;

function usePaged(items, initialSize = 5, label = 'items') {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialSize);
  const pages = Math.max(1, Math.ceil(items.length / pageSize));
  const cur = Math.min(page, pages);
  return {
    slice: items.slice((cur - 1) * pageSize, cur * pageSize),
    reset: () => setPage(1),
    pagerProps: { page: cur, setPage, total: items.length, pageSize, setPageSize: (n) => { setPageSize(n); setPage(1); }, label },
  };
}
function Pager({ page, setPage, total, pageSize, setPageSize, label }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-700">
      <div>Showing <b className="text-slate-900">{fmt(from)}–{fmt(to)}</b> of <b className="text-slate-900">{fmt(total)}</b> {label}</div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2">Rows
          <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className="border border-slate-300 rounded-md px-2 py-1 bg-white text-sm">
            {[5, 10, 20, 50].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <div className="flex items-center gap-1.5">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)} className={btn('secondary', 'sm')}><Icon name="chevL" />Prev</button>
          <span className="px-2 font-bold text-slate-900">{fmt(page)} / {fmt(pages)}</span>
          <button disabled={page >= pages} onClick={() => setPage(page + 1)} className={btn('secondary', 'sm')}>Next<Icon name="chevR" /></button>
        </div>
      </div>
    </div>
  );
}

function Modal({ title, onClose, children, footer, size = 'md', z = 'z-50' }) {
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
  const w = { md: 'max-w-md', lg: 'max-w-2xl', xl: 'max-w-4xl' }[size];
  return (
    <div className={`fixed inset-0 ${z} bg-slate-900/60 flex items-center justify-center p-4`} onMouseDown={onClose}>
      <div role="dialog" aria-modal="true" className={`bg-white rounded-2xl w-full ${w} max-h-[90vh] flex flex-col shadow-2xl border border-slate-300`} onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-200">
          <h2 className="text-base font-extrabold text-slate-900">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="text-slate-500 hover:text-slate-900 cursor-pointer"><Icon name="x" className="w-5 h-5" /></button>
        </div>
        <div className="p-5 overflow-y-auto text-sm text-slate-700">{children}</div>
        {footer && <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 rounded-b-2xl flex flex-wrap justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}

function ConfirmDialog({ cfg, onClose }) {
  if (!cfg) return null;
  return (
    <Modal z="z-[70]" title={cfg.title} onClose={onClose} footer={<>
      {!cfg.hideCancel && <button className={btn('secondary')} onClick={onClose}>Cancel</button>}
      <button className={btn(cfg.tone === 'danger' ? 'danger' : 'primary')} onClick={() => { onClose(); cfg.onConfirm && cfg.onConfirm(); }}>{cfg.confirmLabel || 'OK'}</button>
    </>}>
      {cfg.body}
    </Modal>
  );
}

function NotificationsModal({ items, onClose }) {
  return (
    <Modal title="Notifications" onClose={onClose} footer={<button className={btn('secondary')} onClick={onClose}>Close</button>}>
      {items.length === 0 ? <Empty>No new notifications.</Empty> : (
        <ul className="divide-y divide-slate-200 -my-2">
          {items.map((n) => (
            <li key={n.key} className="py-3 flex items-start gap-3">
              <span className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${n.cls}`}><Icon name={n.icon} /></span>
              <div className="min-w-0 flex-1">
                <div className="font-bold text-slate-900 break-words">{n.title}</div>
                <div className="text-xs text-slate-600 break-words">{n.desc}</div>
                {n.time && <div className="text-xs text-slate-400 mt-0.5">{n.time}</div>}
              </div>
              {n.onOpen && <button className={btn('secondary', 'sm')} onClick={() => { onClose(); n.onOpen(); }}>{n.actionLabel}</button>}
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}

function Toast({ toast, onClose }) {
  if (!toast) return null;
  const m = {
    success: { cls: 'bg-emerald-50 border-emerald-500 text-emerald-900', icon: 'check' },
    error: { cls: 'bg-red-50 border-red-500 text-red-900', icon: 'alert' },
    info: { cls: 'bg-sky-50 border-sky-500 text-sky-900', icon: 'info' },
  }[toast.type];
  return (
    <div className="fixed top-4 inset-x-0 z-[100] flex justify-center px-4 pointer-events-none">
      <div role="status" className={`pointer-events-auto flex items-start gap-3 w-full max-w-lg px-5 py-4 rounded-xl border-2 shadow-2xl ${m.cls}`}>
        <Icon name={m.icon} className="w-5 h-5 mt-0.5 shrink-0" />
        <p className="flex-1 text-sm font-semibold break-words">{toast.msg}</p>
        <button onClick={onClose} aria-label="Dismiss notification" className="cursor-pointer"><Icon name="x" /></button>
      </div>
    </div>
  );
}

// Shows hours and minutes only (no seconds)
function Clock() {
  const [t, setT] = useState(new Date());
  useEffect(() => { const i = setInterval(() => setT(new Date()), 15000); return () => clearInterval(i); }, []);
  return <span className="font-mono font-bold text-slate-900">{t.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} WIB</span>;
}

function Donut({ segments, total }) {
  const R = 15.9155;
  let offset = 0;
  return (
    <svg viewBox="0 0 36 36" className="w-36 h-36 -rotate-90" role="img" aria-label="Allocation distribution">
      <circle cx="18" cy="18" r={R} fill="none" stroke="#e2e8f0" strokeWidth="4" />
      {segments.map((s) => {
        const p = total ? (s.value / total) * 100 : 0;
        const el = <circle key={s.key} cx="18" cy="18" r={R} fill="none" stroke={s.hex} strokeWidth="4" strokeDasharray={`${p} ${100 - p}`} strokeDashoffset={-offset} />;
        offset += p;
        return el;
      })}
    </svg>
  );
}

/* =========================================================
   LOGIN
   ========================================================= */
function LoginPage({ onLogin, onForgot }) {
  const [role, setRole] = useState('hr');
  const [email, setEmail] = useState('elena.rostova@enterprise.allocalens.io');
  const [password, setPassword] = useState('password123');
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState({});

  const submit = (e) => {
    e.preventDefault();
    const er = {};
    if (!email) er.email = 'Email is required.';
    else if (!emailOk(email)) er.email = 'Invalid email format.';
    if (!password) er.password = 'Password is required.';
    else if (password.length < 6) er.password = 'Password must be at least 6 characters.';
    setErrors(er);
    if (Object.keys(er).length) return;
    onLogin(role, email);
  };

  const RoleBtn = ({ id, title, sub }) => (
    <button type="button" onClick={() => setRole(id)} aria-pressed={role === id}
      className={`p-3 rounded-xl text-left transition cursor-pointer border-2 ${role === id ? 'bg-white border-slate-900 shadow-sm' : 'bg-slate-50 border-slate-300 hover:bg-white'}`}>
      <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
        <Icon name={id === 'hr' ? 'users' : 'tasks'} className="w-4 h-4" />{title}
        {role === id && <Icon name="check" className="w-4 h-4 ml-auto" />}
      </div>
      <div className="text-xs text-slate-600 font-semibold mt-0.5">{sub}</div>
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="px-6 py-4 bg-white border-b border-slate-200 flex items-center gap-2.5">
        <div className="w-8 h-8 bg-slate-900 rounded-xl flex items-center justify-center text-white"><Icon name="layers" className="w-5 h-5" /></div>
        <span className="font-extrabold tracking-wider text-slate-900">ALLOCALENS</span>
      </header>
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-extrabold text-slate-900">ALLOCALENS</h1>
          <p className="text-sm text-slate-600 mt-1">Role-Based Resource Allocation & Decision Support System</p>
        </div>
        <div className="w-full max-w-md bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-md">
          <h2 className="text-xl font-bold text-slate-900 text-center">Sign in to your account</h2>
          <p className="text-sm text-slate-600 text-center mt-1 mb-5">Choose your role, then enter your credentials</p>

          <p className="text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2">Select role workspace</p>
          <div className="grid grid-cols-2 gap-3 mb-5">
            <RoleBtn id="hr" title="HR / Manager" sub="Executive View" />
            <RoleBtn id="pm" title="Project Manager" sub="PM Portal" />
          </div>

          <form className="space-y-4" onSubmit={submit} noValidate>
            <div>
              <label htmlFor="email" className="block text-sm font-bold text-slate-700 mb-1">Work Email Address</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-3 flex items-center text-slate-500"><Icon name="mail" /></span>
                <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={`${inputCls} pl-10`} />
              </div>
              {errors.email && <p className="text-xs font-semibold text-red-700 mt-1">{errors.email}</p>}
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="pw" className="text-sm font-bold text-slate-700">Password</label>
                <button type="button" onClick={() => onForgot(email)} className="text-xs font-bold text-slate-900 hover:underline cursor-pointer">Forgot password?</button>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-3 flex items-center text-slate-500"><Icon name="lock" /></span>
                <input id="pw" type={show ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} className={`${inputCls} pl-10 pr-11`} />
                <button type="button" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'} className="absolute inset-y-0 right-3 flex items-center text-slate-500 hover:text-slate-900 cursor-pointer">
                  <Icon name={show ? 'eyeOff' : 'eye'} className="w-5 h-5" />
                </button>
              </div>
              {errors.password && <p className="text-xs font-semibold text-red-700 mt-1">{errors.password}</p>}
            </div>
            <button type="submit" className={`${btn('primary')} w-full py-3`}>Sign In</button>
          </form>
        </div>
      </main>
    </div>
  );
}

/* =========================================================
   LAYOUT: SIDEBAR
   ========================================================= */
function SidebarBody({ menus, page, go, compact, user, onProfile, onLogout, onToggle, showToggle }) {
  return (
    <div className="flex flex-col h-full">
      <div className={`px-4 pt-5 pb-4 flex items-center gap-2.5 ${compact ? 'justify-center' : ''}`}>
        <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center text-white shrink-0"><Icon name="layers" className="w-5 h-5" /></div>
        {!compact && <div><div className="text-white font-extrabold tracking-wider text-sm">ALLOCALENS</div><div className="text-[11px] text-slate-400 font-bold">RESOURCE ALLOCATION</div></div>}
      </div>
      <button onClick={onProfile} title="Edit profile" className={`mx-3 mb-4 p-2.5 rounded-xl bg-[#1e293b] border border-slate-700 hover:bg-slate-800 flex items-center gap-3 cursor-pointer text-left ${compact ? 'justify-center' : ''}`}>
        <Avatar name={user.name} dark={false} />
        {!compact && <div className="min-w-0"><div className="text-sm font-bold text-white truncate">{user.name}</div><div className="text-xs text-slate-300 truncate">{user.roleName}</div></div>}
      </button>
      <nav className="flex-1 overflow-y-auto px-3 space-y-5" aria-label="Main menu">
        {menus.map((g) => (
          <div key={g.group}>
            {!compact && <p className="px-3 mb-2 text-[11px] font-bold tracking-wider text-slate-400">{g.group}</p>}
            <div className="space-y-1">
              {g.items.map((it) => {
                const active = page === it.id;
                return (
                  <button key={it.id} onClick={() => go(it.id)} title={it.label} aria-current={active ? 'page' : undefined}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-bold transition cursor-pointer text-left ${compact ? 'justify-center' : ''} ${active ? 'bg-white text-slate-900' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}>
                    <Icon name={it.icon} className="w-5 h-5 shrink-0" />
                    {!compact && <span className="truncate">{it.label}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="p-3 border-t border-slate-800 space-y-1">
        {showToggle && (
          <button onClick={onToggle} title={compact ? 'Expand sidebar' : 'Collapse sidebar'} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold text-slate-300 hover:bg-slate-800 hover:text-white cursor-pointer ${compact ? 'justify-center' : ''}`}>
            <Icon name={compact ? 'chevR' : 'chevL'} className="w-5 h-5" />{!compact && 'Collapse'}
          </button>
        )}
        <button onClick={onLogout} title="Logout" className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-bold text-slate-300 hover:bg-slate-800 hover:text-white cursor-pointer ${compact ? 'justify-center' : ''}`}>
          <Icon name="logout" className="w-5 h-5" />{!compact && 'Logout'}
        </button>
      </div>
    </div>
  );
}

/* =========================================================
   MODALS: PROFILE, ADD TASK
   ========================================================= */
function ProfileModal({ user, onClose, onSave }) {
  const [f, setF] = useState({ name: user.name, email: user.email, phone: user.phone || '' });
  const [err, setErr] = useState({});
  const save = () => {
    const e = {};
    if (!f.name.trim()) e.name = 'Name is required.';
    if (!emailOk(f.email)) e.email = 'Invalid email format.';
    setErr(e);
    if (!Object.keys(e).length) onSave(f);
  };
  return (
    <Modal title="Edit Profile" onClose={onClose} footer={<><button className={btn('secondary')} onClick={onClose}>Cancel</button><button className={btn('primary')} onClick={save}>Save Changes</button></>}>
      <div className="flex items-center gap-4 mb-5">
        <div className="w-14 h-14 rounded-full bg-slate-900 text-white flex items-center justify-center font-extrabold text-lg">{initials(f.name || user.name)}</div>
        <div><div className="font-extrabold text-slate-900">{user.roleName}</div><div className="text-xs text-slate-500">Role cannot be changed by the user</div></div>
      </div>
      <div className="space-y-4">
        <div><label className="block text-sm font-bold mb-1">Full Name</label><input className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />{err.name && <p className="text-xs font-semibold text-red-700 mt-1">{err.name}</p>}</div>
        <div><label className="block text-sm font-bold mb-1">Email</label><input className={inputCls} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />{err.email && <p className="text-xs font-semibold text-red-700 mt-1">{err.email}</p>}</div>
        <div><label className="block text-sm font-bold mb-1">Phone Number</label><input className={inputCls} value={f.phone} placeholder="+62 ..." onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
      </div>
    </Modal>
  );
}

function AddTaskModal({ onClose, onCreate }) {
  const [f, setF] = useState({ name: '', desc: '', skills: '', complexity: 'High', priority: 'High', hours: 20, weekly: 5 });
  const [err, setErr] = useState({});
  const submit = (e) => {
    e.preventDefault();
    const er = {};
    if (!f.name.trim()) er.name = 'Task name is required.';
    if (!(Number(f.hours) > 0)) er.hours = 'Must be greater than 0.';
    if (!(Number(f.weekly) > 0)) er.weekly = 'Must be greater than 0.';
    setErr(er);
    if (Object.keys(er).length) return;
    onCreate({ ...f, hours: Number(f.hours), weekly: Number(f.weekly), skills: f.skills.split(',').map((s) => s.trim()).filter(Boolean) });
  };
  const sel = (k, opts) => (
    <select value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} className={inputCls}>{opts.map((o) => <option key={o}>{o}</option>)}</select>
  );
  return (
    <Modal title="Add New Task" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <div><label className="block text-sm font-bold mb-1">Task Name</label><input className={inputCls} value={f.name} placeholder="e.g. Redis Cluster Integration" onChange={(e) => setF({ ...f, name: e.target.value })} />{err.name && <p className="text-xs font-semibold text-red-700 mt-1">{err.name}</p>}</div>
        <div><label className="block text-sm font-bold mb-1">Description</label><input className={inputCls} value={f.desc} onChange={(e) => setF({ ...f, desc: e.target.value })} /></div>
        <div><label className="block text-sm font-bold mb-1">Required Skills <span className="font-normal text-slate-500">(comma-separated)</span></label><input className={inputCls} value={f.skills} placeholder="Postgres, Go" onChange={(e) => setF({ ...f, skills: e.target.value })} /></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><label className="block text-sm font-bold mb-1">Complexity</label>{sel('complexity', ['High', 'Medium', 'Low'])}</div>
          <div><label className="block text-sm font-bold mb-1">Priority</label>{sel('priority', ['Critical', 'High', 'Medium', 'Low'])}</div>
          <div><label className="block text-sm font-bold mb-1">Total (hours)</label><input type="number" min="1" className={inputCls} value={f.hours} onChange={(e) => setF({ ...f, hours: e.target.value })} />{err.hours && <p className="text-xs font-semibold text-red-700 mt-1">{err.hours}</p>}</div>
          <div><label className="block text-sm font-bold mb-1">Weekly load (h/week)</label><input type="number" min="1" className={inputCls} value={f.weekly} onChange={(e) => setF({ ...f, weekly: e.target.value })} />{err.weekly && <p className="text-xs font-semibold text-red-700 mt-1">{err.weekly}</p>}</div>
        </div>
        <div className="flex justify-end gap-2 pt-2"><button type="button" className={btn('secondary')} onClick={onClose}>Cancel</button><button type="submit" className={btn('primary')}>Create Task</button></div>
      </form>
    </Modal>
  );
}

/* =========================================================
   PAGES — HR
   ========================================================= */
function HRDashboard({ ctx }) {
  const { employees, tasks, triage, history, navigate: go, requestApprove, requestKeep, runCheck, lastCheck, setEmpPreset, focusTaskId, setFocusTaskId } = ctx;
  const [idx, setIdx] = useState(0);
  const [q, setQ] = useState('');
  const [detail, setDetail] = useState(null);

  const total = employees.length;
  const st = useMemo(() => {
    const counts = { optimal: 0, sub: 0, reassign: 0 };
    const dep = {};
    DEPTS.forEach((d) => { dep[d] = { n: 0, optimal: 0, sub: 0, reassign: 0 }; });
    let sum = 0;
    employees.forEach((e) => { const k = allocStatus(e); counts[k]++; dep[e.dept].n++; dep[e.dept][k]++; sum += e.hours; });
    return { counts, dep, avgHours: r1(sum / (employees.length || 1)), avgUtil: Math.round((sum / (employees.length || 1) / CAP) * 100) };
  }, [employees]);
  const avgStatus = allocStatusP(st.avgUtil);
  const avgWord = { optimal: 'a healthy range', sub: 'under-used', reassign: 'overloaded' }[avgStatus];

  const views = triage.map((i) => ({ item: i, v: triageView(i, employees, tasks) })).filter((x) => x.v);
  const rows = views.filter(({ item, v }) => {
    const s = q.toLowerCase();
    return !s || [item.taskId, v.task.name, v.cur.name, v.prop.name].some((x) => x.toLowerCase().includes(s));
  });
  const pg = usePaged(rows, 5, 'flagged reallocations');
  const active = views[Math.min(idx, Math.max(0, views.length - 1))];

  // Opened from a notification: jump to the decision panel and select that task
  useEffect(() => {
    if (!focusTaskId) return;
    const i = views.findIndex((x) => x.item.taskId === focusTaskId);
    if (i >= 0) setIdx(i);
    setTimeout(() => document.getElementById('decision-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
    setFocusTaskId(null);
  }, [focusTaskId]); // eslint-disable-line

  const ctxItems = [
    { icon: 'clock', label: 'Weekly Capacity', value: `${CAP} hours per employee` },
    { icon: 'users', label: 'Departments Covered', value: DEPTS.join(', ') },
    { icon: 'bolt', label: 'Last Allocation Check', value: lastCheck || 'Not run yet' },
  ];

  return (
    <>
      <PageHeader title="Executive Dashboard & Decision Support"
        desc="Overview of resource allocation and the queue of reassignment decisions waiting for your approval."
        actions={<button className={btn('primary')} onClick={runCheck}><Icon name="bolt" />Run System Allocation Check</button>} />

      <Card className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4 md:divide-x md:divide-slate-200">
        {ctxItems.map((x, i) => (
          <div key={x.label} className={`flex items-center gap-3 min-w-0 ${i > 0 ? 'md:pl-4' : ''}`}>
            <span className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 shrink-0"><Icon name={x.icon} className="w-5 h-5" /></span>
            <div className="min-w-0"><div className="text-xs font-extrabold text-slate-600 uppercase tracking-wider">{x.label}</div><div className="font-bold text-slate-900 break-words">{x.value}</div></div>
          </div>
        ))}
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Total Employees" value={fmt(total)} unit="people" icon="users"
          note={<p>{fmt(st.counts.optimal)} optimal • {fmt(st.counts.sub)} under-used • {fmt(st.counts.reassign)} overloaded</p>} />
        <StatCard label="Total Tasks" value={fmt(tasks.length)} unit="tasks" icon="tasks"
          note={<p>{fmt(tasks.filter((t) => !t.assignedId).length)} still without an assignee</p>} />
        <StatCard label="Average Workload" value={st.avgUtil} unit="% of a 40-hour week" icon="clock"
          note={<><UtilBar value={st.avgUtil} status={avgStatus} /><p>On average each person is booked {st.avgHours} of {CAP} hours per week, which is {avgWord}.</p></>} />
        <StatCard label="Pending Reassignments" value={fmt(triage.length)} unit="to review" icon="alert"
          note={<p>Tasks where the assignee is overloaded or lacks a required skill. Approve a change or keep the current assignee.</p>} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 items-stretch">
        <Card className="p-5 flex flex-col xl:col-span-2">
          <h2 className="text-base font-extrabold text-slate-900">Workforce Allocation Distribution</h2>
          <p className="text-sm text-slate-600 mt-0.5">How employees are spread across workload levels (based on a 40-hour week).</p>

          <div className="flex flex-wrap items-center justify-center gap-6 py-5">
            <div className="relative">
              <Donut total={total} segments={['optimal', 'sub', 'reassign'].map((k) => ({ key: k, value: st.counts[k], hex: STATUS_META[k].hex }))} />
              <div className="absolute inset-0 flex flex-col items-center justify-center"><span className="text-2xl font-extrabold text-slate-900 tabular-nums">{fmt(total)}</span><span className="text-[10px] font-extrabold text-slate-600 uppercase">Total Staff</span></div>
            </div>
            <ul className="space-y-3 text-sm min-w-0">
              {['optimal', 'sub', 'reassign'].map((k) => (
                <li key={k} className="flex items-start gap-2">
                  <span className="w-3 h-3 rounded-full mt-1 shrink-0" style={{ background: STATUS_META[k].hex }} />
                  <div><div className="font-bold text-slate-900">{STATUS_META[k].label}: {fmt(st.counts[k])} ({Math.round((st.counts[k] / (total || 1)) * 100)}%)</div>
                    <div className="text-xs text-slate-600">{STATUS_META[k].range}</div></div>
                </li>
              ))}
            </ul>
          </div>

          <div className="border-t border-slate-200 pt-4 flex-1">
            <p className="text-xs font-extrabold text-slate-600 uppercase tracking-wider mb-3">By department</p>
            <div className="space-y-4">
              {DEPTS.map((d) => (
                <div key={d}>
                  <div className="flex justify-between gap-2 text-sm font-bold text-slate-800 mb-1.5"><span>{d}</span><span className="text-slate-600 font-semibold tabular-nums">{fmt(st.dep[d].n)} people</span></div>
                  <StackBar total={st.dep[d].n} parts={['optimal', 'sub', 'reassign'].map((k) => ({ key: k, value: st.dep[d][k] }))} />
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1.5 text-xs text-slate-600 tabular-nums">
                    {['optimal', 'sub', 'reassign'].map((k) => (<span key={k} className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: STATUS_META[k].hex }} />{fmt(st.dep[d][k])} {k === 'optimal' ? 'optimal' : k === 'sub' ? 'under-used' : 'overloaded'}</span>))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-100 border border-slate-300 rounded-xl p-3 mt-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-start gap-2 text-sm min-w-0"><Icon name="info" className="w-5 h-5 shrink-0 mt-0.5" /><span><b>Heads-up:</b> {fmt(st.counts.reassign)} {st.counts.reassign === 1 ? 'person is' : 'people are'} above 110% of weekly capacity.</span></div>
            <button className={btn('primary', 'sm')} onClick={() => { setEmpPreset('reassign'); go('employees'); }}>View Overloaded Staff</button>
          </div>
        </Card>

        <Card id="decision-panel" className="p-5 flex flex-col xl:col-span-3">
          {active ? (
            <>
              <div className="flex items-center justify-between gap-2">
                <div><h2 className="text-base font-extrabold text-slate-900">Reassignment Decision Panel</h2><p className="text-sm text-slate-600 mt-0.5">Review one flagged task at a time.</p></div>
                <div className="flex items-center gap-1">
                  <button aria-label="Previous" disabled={idx <= 0} onClick={() => setIdx(Math.max(0, idx - 1))} className={btn('secondary', 'sm')}><Icon name="chevL" /></button>
                  <span className="text-sm font-bold px-1 tabular-nums">{Math.min(idx, views.length - 1) + 1} / {views.length}</span>
                  <button aria-label="Next" disabled={idx >= views.length - 1} onClick={() => setIdx(Math.min(views.length - 1, idx + 1))} className={btn('secondary', 'sm')}><Icon name="chevR" /></button>
                </div>
              </div>
              <div className="mt-4 pb-4 border-b border-slate-200">
                <div className="flex flex-wrap items-center gap-2"><Badge cls="bg-slate-100 text-slate-900 border-slate-300">{active.v.task.id}</Badge><PriorityBadge p={active.v.task.priority} /><Badge cls="bg-red-50 text-red-800 border-red-300" icon="alert">{active.v.trigger}</Badge></div>
                <h3 className="text-sm font-extrabold text-slate-900 mt-2">{active.v.task.name}</h3>
                <p className="text-xs text-slate-600">{active.v.task.hours} h total • {active.v.task.weekly} h/week</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-3 my-4 items-stretch">
                <div className="p-3 rounded-xl border border-slate-300 bg-slate-50 text-center">
                  <div className="text-xs font-extrabold text-slate-600 uppercase mb-2">Current Assignee</div>
                  <div className="flex justify-center"><Avatar name={active.v.cur.name} dark={false} size="w-10 h-10" /></div>
                  <div className="font-extrabold text-slate-900 text-sm mt-1">{active.v.cur.name}</div>
                  <div className="text-xs text-slate-600">{active.v.cur.title}</div>
                  <div className="mt-1.5"><StatusBadge s={allocStatus(active.v.cur)} /></div>
                  <div className="text-xs font-bold text-slate-700 mt-1">{active.v.cur.hours}h / {CAP}h ({util(active.v.cur)}%)</div>
                </div>
                <div className="hidden sm:flex items-center text-slate-400"><Icon name="chevR" className="w-6 h-6" /></div>
                <div className="p-3 rounded-xl border-2 border-slate-900 bg-slate-100 text-center">
                  <div className="text-xs font-extrabold text-slate-900 uppercase mb-2">Proposed Candidate</div>
                  <div className="flex justify-center"><Avatar name={active.v.prop.name} size="w-10 h-10" /></div>
                  <div className="font-extrabold text-slate-900 text-sm mt-1">{active.v.prop.name}</div>
                  <div className="text-xs text-slate-600">{active.v.prop.title}</div>
                  <div className="mt-1.5"><Badge cls="bg-emerald-50 text-emerald-800 border-emerald-300" icon="check">Fit {active.v.score}%</Badge></div>
                  <div className="text-xs font-bold text-slate-700 mt-1">{active.v.prop.hours}h / {CAP}h ({util(active.v.prop)}%)</div>
                </div>
              </div>
              <div className="space-y-3 text-sm">
                <p className="text-xs font-extrabold text-slate-600 uppercase tracking-wider">Comparison</p>
                <div><div className="flex justify-between flex-wrap gap-x-2 text-xs font-bold text-slate-800 mb-1"><span>Skill match for this task</span><span>{active.v.cur.name.split(' ')[0]} {active.v.curSkill}% vs {active.v.prop.name.split(' ')[0]} {active.v.propSkill}%</span></div><Bar value={active.v.propSkill} /></div>
                <div><div className="flex justify-between flex-wrap gap-x-2 text-xs font-bold text-slate-800 mb-1"><span>Candidate's current workload (line = 100%)</span><span>{util(active.v.cur)}% vs {util(active.v.prop)}%</span></div><UtilBar value={util(active.v.prop)} status={allocStatus(active.v.prop)} /></div>
              </div>
              <div className="bg-slate-100 border border-slate-300 rounded-lg p-3 mt-4 text-sm text-slate-700"><b className="text-slate-900 block mb-1">Recommendation Rationale</b>{active.item.reason}</div>
              <div className="mt-auto pt-4 flex flex-wrap gap-2">
                <button className={`${btn('primary')} flex-1`} onClick={() => requestApprove(active.item.taskId, active.item.proposedId)}><Icon name="check" />Approve Reassignment</button>
                <button className={`${btn('secondary')} flex-1`} onClick={() => requestKeep(active.item.taskId)}>Keep Current</button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
              <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-800 flex items-center justify-center mb-3"><Icon name="check" className="w-6 h-6" /></div>
              <h3 className="font-extrabold text-slate-900">All Reassignments Cleared</h3>
              <p className="text-sm text-slate-600 mt-1">There are no triage items that need action right now.</p>
              <button className={`${btn('secondary')} mt-4`} onClick={() => go('status')}>View Decision Log ({history.length})</button>
            </div>
          )}
        </Card>
      </div>

      <Card id="triage-queue" className="overflow-hidden">
        <div className="p-5 flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="text-base font-extrabold text-slate-900">Reassignment Triage Queue</h2><p className="text-sm text-slate-600">Candidate scores based on delivery risk, skill match, and workload.</p></div>
          <div className="relative"><span className="absolute inset-y-0 left-2.5 flex items-center text-slate-500"><Icon name="search" /></span>
            <input value={q} onChange={(e) => { setQ(e.target.value); pg.reset(); }} placeholder="Filter tasks or engineers..." className={`${inputCls} pl-9 w-60 max-w-full`} /></div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[760px]">
            <thead><tr className="bg-slate-100 border-y border-slate-200 text-xs font-extrabold text-slate-700 uppercase tracking-wider">
              <th className="py-3 px-4">Task</th><th className="py-3 px-4">Primary Trigger</th><th className="py-3 px-4">Current Assignee</th><th className="py-3 px-4">Proposed</th><th className="py-3 px-4">Score</th><th className="py-3 px-4 text-right">Action</th></tr></thead>
            <tbody className="divide-y divide-slate-200">
              {pg.slice.length === 0 ? <tr><td colSpan="6"><Empty>No triage items in the queue.</Empty></td></tr> : pg.slice.map(({ item, v }) => (
                <tr key={item.taskId} className="hover:bg-slate-50">
                  <td className="py-3 px-4"><div className="font-extrabold text-slate-900">{item.taskId}</div><div className="text-xs text-slate-600">{v.task.name}</div></td>
                  <td className="py-3 px-4"><Badge cls="bg-red-50 text-red-800 border-red-300" icon="alert">{v.trigger}</Badge></td>
                  <td className="py-3 px-4"><div className="flex items-center gap-2"><Avatar name={v.cur.name} size="w-8 h-8" /><div><div className="font-bold text-slate-900">{v.cur.name}</div><div className="text-xs text-slate-600">{v.cur.hours}h ({util(v.cur)}%)</div></div></div></td>
                  <td className="py-3 px-4"><div className="flex items-center gap-2"><Avatar name={v.prop.name} size="w-8 h-8" /><div><div className="font-bold text-slate-900">{v.prop.name}</div><div className="text-xs text-slate-600">{v.prop.hours}h ({util(v.prop)}%)</div></div></div></td>
                  <td className="py-3 px-4"><Badge cls="bg-slate-900 text-white border-slate-900">{v.score}%</Badge></td>
                  <td className="py-3 px-4 text-right"><div className="inline-flex gap-2"><button className={btn('primary', 'sm')} onClick={() => requestApprove(item.taskId, item.proposedId)}>Approve</button><button className={btn('secondary', 'sm')} onClick={() => setDetail({ item, v })}>Details</button></div></td>
                </tr>))}
            </tbody>
          </table>
        </div>
        <Pager {...pg.pagerProps} />
      </Card>

      {detail && (
        <Modal size="lg" title={`${detail.item.taskId} — ${detail.v.task.name}`} onClose={() => setDetail(null)} footer={<>
          <button className={btn('secondary')} onClick={() => setDetail(null)}>Close</button>
          <button className={btn('primary')} onClick={() => { const d = detail; setDetail(null); requestApprove(d.item.taskId, d.item.proposedId); }}>Approve Reassignment</button></>}>
          <div className="bg-slate-100 border border-slate-300 rounded-xl p-3 mb-4"><div className="text-xs font-extrabold text-slate-600 uppercase mb-1">Triage analysis</div><p>{detail.item.reason}</p></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <div className="p-3 border border-slate-300 rounded-xl"><div className="text-xs font-bold text-slate-500 uppercase">Current assignee</div><div className="font-extrabold text-slate-900">{detail.v.cur.name}</div><div>Workload: {detail.v.cur.hours}h ({util(detail.v.cur)}%)</div>
              <button className="text-xs font-bold underline mt-2 cursor-pointer" onClick={() => { setDetail(null); go(`employees/${detail.v.cur.id}`); }}>View {detail.v.cur.name}'s profile →</button></div>
            <div className="p-3 border-2 border-slate-900 rounded-xl bg-slate-50"><div className="text-xs font-bold text-slate-900 uppercase">Recommended candidate</div><div className="font-extrabold text-slate-900">{detail.v.prop.name}</div><div>Fit: {detail.v.score}% • Workload: {detail.v.prop.hours}h ({util(detail.v.prop)}%)</div>
              <button className="text-xs font-bold underline mt-2 cursor-pointer" onClick={() => { setDetail(null); go(`employees/${detail.v.prop.id}`); }}>View {detail.v.prop.name}'s profile →</button></div>
          </div>
        </Modal>
      )}
    </>
  );
}

function EmployeesPage({ ctx }) {
  const { employees, navigate: go, empPreset, setEmpPreset } = ctx;
  const [q, setQ] = useState('');
  const [dept, setDept] = useState('all');
  const [st, setSt] = useState(empPreset || 'all');
  useEffect(() => { setEmpPreset('all'); }, []); // eslint-disable-line
  const rows = employees.filter((e) => {
    const s = q.toLowerCase();
    return (!s || [e.name, e.id, e.title, e.pod].some((x) => x.toLowerCase().includes(s))) && (dept === 'all' || e.dept === dept) && (st === 'all' || allocStatus(e) === st);
  });
  const pg = usePaged(rows, 10, 'employees');
  return (
    <>
      <PageHeader title="Employees" desc="List of employees with their workload and allocation status. Click a row or 'View' to see details." />
      <Card className="overflow-hidden">
        <div className="p-4 flex flex-wrap items-center gap-3 border-b border-slate-200 bg-slate-50">
          <div className="relative flex-1 min-w-[200px]"><span className="absolute inset-y-0 left-2.5 flex items-center text-slate-500"><Icon name="search" /></span>
            <input value={q} onChange={(e) => { setQ(e.target.value); pg.reset(); }} placeholder="Search name, ID, title, pod..." className={`${inputCls} pl-9`} /></div>
          <select value={dept} onChange={(e) => { setDept(e.target.value); pg.reset(); }} className={`${inputCls} w-auto`} aria-label="Filter by department"><option value="all">All departments</option>{DEPTS.map((d) => <option key={d}>{d}</option>)}</select>
          <select value={st} onChange={(e) => { setSt(e.target.value); pg.reset(); }} className={`${inputCls} w-auto`} aria-label="Filter by status"><option value="all">All statuses</option>{Object.keys(STATUS_META).map((k) => <option key={k} value={k}>{STATUS_META[k].label}</option>)}</select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[720px]">
            <thead><tr className="bg-slate-100 border-b border-slate-200 text-xs font-extrabold text-slate-700 uppercase tracking-wider"><th className="py-3 px-4">Employee</th><th className="py-3 px-4">Role & Dept</th><th className="py-3 px-4">Workload</th><th className="py-3 px-4">Status</th><th className="py-3 px-4 text-right">Action</th></tr></thead>
            <tbody className="divide-y divide-slate-200">
              {pg.slice.length === 0 ? <tr><td colSpan="5"><Empty>No employees match your search.</Empty></td></tr> : pg.slice.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => go(`employees/${e.id}`)}>
                  <td className="py-3 px-4"><div className="flex items-center gap-3"><Avatar name={e.name} /><div className="min-w-0"><div className="font-extrabold text-slate-900">{e.name}</div><div className="text-xs text-slate-500 font-mono">{e.id}</div></div></div></td>
                  <td className="py-3 px-4"><div className="font-semibold text-slate-900">{e.title}</div><div className="text-xs text-slate-600">{e.dept} • {e.pod}</div></td>
                  <td className="py-3 px-4 w-52"><div className="text-xs font-bold text-slate-800 mb-1">{e.hours}h / {CAP}h ({util(e)}%)</div><UtilBar value={util(e)} status={allocStatus(e)} /></td>
                  <td className="py-3 px-4"><StatusBadge s={allocStatus(e)} /></td>
                  <td className="py-3 px-4 text-right"><button className={btn('secondary', 'sm')} onClick={(ev) => { ev.stopPropagation(); go(`employees/${e.id}`); }}>View</button></td>
                </tr>))}
            </tbody>
          </table>
        </div>
        <Pager {...pg.pagerProps} />
      </Card>
    </>
  );
}

function EmployeeDetail({ ctx, id }) {
  const { employees, tasks, triage, navigate: go, requestApprove, requestKeep, setCompareIds, setCompareTaskId } = ctx;
  const emp = employees.find((e) => e.id === id);
  if (!emp) return (<><PageHeader title="Employee not found" /><Card className="p-6"><p className="mb-3">No employee with ID <b>{id}</b> exists.</p><button className={btn('primary')} onClick={() => go('employees')}>Back to Employees</button></Card></>);
  const s = allocStatus(emp);
  const myTasks = tasks.filter((t) => t.assignedId === emp.id);
  const item = triage.find((i) => i.proposedId === emp.id || i.currentId === emp.id);
  const v = item && triageView(item, employees, tasks);
  const isProposed = item && item.proposedId === emp.id;
  const topScore = Math.max(...Object.values(emp.skills));
  const goCompare = () => {
    const otherId = item ? (isProposed ? item.currentId : item.proposedId) : employees.find((e) => e.id !== emp.id).id;
    setCompareIds([emp.id, otherId]);
    if (item) setCompareTaskId(item.taskId);
    go('compare');
  };
  return (
    <>
      <Card className="p-5 flex flex-wrap items-center justify-between gap-5">
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-16 h-16 rounded-2xl bg-slate-900 text-white font-extrabold text-xl flex items-center justify-center shrink-0">{initials(emp.name)}</div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2"><h1 className="text-xl md:text-2xl font-extrabold text-slate-900">{emp.name}</h1><Badge cls="bg-slate-100 text-slate-800 border-slate-300">{emp.id}</Badge></div>
            <p className="text-sm font-bold text-slate-800 mt-0.5">{emp.title} • {emp.pod}</p>
            <p className="text-xs text-slate-600 mt-1">{emp.dept} • {emp.tenure} yrs tenure • {emp.location}</p>
          </div>
        </div>
        <div className="flex flex-col items-start gap-1"><span className="text-xs font-extrabold text-slate-600 uppercase">Allocation status</span><StatusBadge s={s} /></div>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Top Skill Score" value={topScore} unit="%" note={<p>Highest validated skill</p>} icon="chart" />
        <StatCard label="Workload" value={emp.hours} unit={`/ ${CAP} h (${util(emp)}%)`} note={<UtilBar value={util(emp)} status={s} />} icon="clock" />
        <StatCard label="Available Headroom" value={r1(Math.max(0, CAP - emp.hours))} unit="h/week" note={<p>{emp.hours > CAP ? `Over capacity by ${r1(emp.hours - CAP)} h` : 'Available for allocation'}</p>} icon="plus" />
        <StatCard label="Active Assignments" value={myTasks.length} unit="tasks" note={<p>{item ? '1 task flagged for triage' : 'None flagged'}</p>} icon="tasks" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card className="p-5">
          <h2 className="text-base font-extrabold text-slate-900">Skill & Competency Breakdown</h2>
          <p className="text-sm text-slate-600 mb-4">Validated score per competency.</p>
          <div className="space-y-3">{Object.entries(emp.skills).sort((a, b) => b[1] - a[1]).map(([k, val]) => (
            <div key={k}><div className="flex justify-between text-sm font-bold text-slate-900 mb-1"><span>{k}</span><span>{val}%</span></div><Bar value={val} /></div>))}</div>
        </Card>
        <Card className="p-5 flex flex-col">
          <h2 className="text-base font-extrabold text-slate-900">Decision Support & Rationale</h2>
          {v ? (
            <>
              <div className="bg-slate-50 border border-slate-300 rounded-xl p-4 mt-3">
                <Badge cls="bg-slate-200 text-slate-900 border-slate-300">{isProposed ? 'Recommended candidate' : 'Current assignee'}</Badge>
                <p className="font-extrabold text-slate-900 mt-2">{v.task.id} {v.task.name}</p>
                <p className="text-sm mt-1">{item.reason}</p>
                <p className="text-sm mt-2 font-semibold">{v.cur.name} ({util(v.cur)}%) → {v.prop.name} ({util(v.prop)}%) • Fit {v.score}%</p>
              </div>
              <div className="mt-auto pt-4 flex flex-wrap gap-2 justify-between">
                <button className={btn('secondary')} onClick={goCompare}><Icon name="compare" />Compare Candidates</button>
                <div className="flex flex-wrap gap-2"><button className={btn('secondary')} onClick={() => requestKeep(item.taskId)}>Keep Current</button><button className={btn('primary')} onClick={() => requestApprove(item.taskId, item.proposedId)}><Icon name="check" />Approve Reassignment</button></div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col justify-center"><p className="text-sm text-slate-600 mt-3">No active recommendation for this employee.</p>
              <div className="mt-4"><button className={btn('secondary')} onClick={goCompare}><Icon name="compare" />Compare Candidates</button></div></div>
          )}
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="p-5 pb-3"><h2 className="text-base font-extrabold text-slate-900">Active Assignments</h2></div>
        <div className="overflow-x-auto"><table className="w-full text-left text-sm min-w-[560px]">
          <thead><tr className="bg-slate-100 border-y border-slate-200 text-xs font-extrabold text-slate-700 uppercase"><th className="py-3 px-4">Task</th><th className="py-3 px-4">Priority</th><th className="py-3 px-4">Weekly Load</th><th className="py-3 px-4">Status</th></tr></thead>
          <tbody className="divide-y divide-slate-200">{myTasks.length === 0 ? <tr><td colSpan="4"><Empty>No tasks assigned yet.</Empty></td></tr> : myTasks.map((t) => (
            <tr key={t.id}><td className="py-3 px-4"><div className="font-extrabold">{t.id}</div><div className="text-xs text-slate-600">{t.name}</div></td><td className="py-3 px-4"><PriorityBadge p={t.priority} /></td><td className="py-3 px-4 font-bold">{t.weekly} h/week</td>
              <td className="py-3 px-4"><div className="flex flex-wrap gap-1"><Badge cls={TASK_STATUS_META[t.status]}>{t.status}</Badge>{item && item.taskId === t.id && <Badge cls="bg-red-50 text-red-800 border-red-300" icon="alert">Flagged</Badge>}</div></td></tr>))}</tbody></table></div>
      </Card>
    </>
  );
}

function AnalysisPage({ ctx }) {
  const { employees } = ctx;
  const total = employees.length;
  const over = employees.filter((e) => allocStatus(e) === 'reassign').length;
  const subs = employees.filter((e) => allocStatus(e) === 'sub');
  const idleHours = r1(subs.reduce((a, e) => a + (CAP - e.hours), 0));
  const avg = Math.round(employees.reduce((a, e) => a + util(e), 0) / (total || 1));
  const byDept = DEPTS.map((d) => { const l = employees.filter((e) => e.dept === d); return { d, n: l.length, avg: l.length ? Math.round(l.reduce((a, e) => a + util(e), 0) / l.length) : 0 }; });
  const ranked = [...employees].sort((a, b) => util(b) - util(a)).slice(0, 10);
  return (
    <>
      <PageHeader title="Allocation Analysis" desc="Workload and capacity risk across departments, based on current employee data." />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Overloaded Staff" value={Math.round((over / (total || 1)) * 100)} unit="%" note={<p>{fmt(over)} of {fmt(total)} employees are above 110% of capacity</p>} icon="alert" />
        <StatCard label="Average Workload" value={avg} unit="%" note={<p>Average against a 40-hour week</p>} icon="chart" />
        <StatCard label="Unused Capacity" value={fmt(idleHours)} unit="h/week" note={<p>{fmt(subs.length)} under-used employees could take on more work</p>} icon="clock" />
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card className="p-5">
          <h2 className="text-base font-extrabold text-slate-900 mb-4">Workload by Department</h2>
          <div className="space-y-4">{byDept.map((x) => { const k = allocStatusP(x.avg); return (
            <div key={x.d}><div className="flex justify-between flex-wrap gap-2 text-sm font-bold text-slate-800 mb-1"><span>{x.d} ({fmt(x.n)} people)</span><span>{x.avg}% • {STATUS_META[k].label}</span></div><UtilBar value={x.avg} status={k} /></div>); })}</div>
          <p className="text-xs text-slate-500 mt-3">The black line marks 100% capacity (40 hours).</p>
        </Card>
        <Card className="p-5">
          <h2 className="text-base font-extrabold text-slate-900 mb-4">Top 10 Highest Workloads</h2>
          <div className="space-y-3">{ranked.map((e) => (
            <div key={e.id}><div className="flex justify-between gap-2 text-sm font-bold text-slate-800 mb-1"><span className="truncate">{e.name}</span><span className="shrink-0">{e.hours}h ({util(e)}%)</span></div><UtilBar value={util(e)} status={allocStatus(e)} /></div>))}</div>
        </Card>
      </div>
    </>
  );
}

function StatusPage({ ctx }) {
  const { employees, history, navigate: go } = ctx;
  const total = employees.length;
  const counts = { optimal: 0, sub: 0, reassign: 0 };
  employees.forEach((e) => { counts[allocStatus(e)]++; });
  const pg = usePaged(history, 5, 'decisions');
  return (
    <>
      <PageHeader title="Allocation Status Monitor" desc="Current allocation status of all employees and the history of reassignment decisions." />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {['optimal', 'sub', 'reassign'].map((k) => {
          const share = Math.round((counts[k] / (total || 1)) * 100);
          return (
            <Card key={k} className="p-5 flex flex-col">
              <div className="flex flex-wrap items-center justify-between gap-2"><StatusBadge s={k} /><span className="text-xs font-bold text-slate-600">{share}% of staff</span></div>
              <div className="mt-3 text-3xl xl:text-4xl font-extrabold text-slate-900 tabular-nums break-all leading-tight">{fmt(counts[k])}</div>
              <div className="text-sm text-slate-600">of {fmt(total)} employees</div>
              <div className="mt-3"><Bar value={share} color={STATUS_META[k].bar} /></div>
              <p className="text-xs text-slate-500 mt-2">{STATUS_META[k].range}</p>
            </Card>
          );
        })}
      </div>
      <Card className="overflow-hidden">
        <div className="p-5 pb-3"><h2 className="text-base font-extrabold text-slate-900">Status by Department</h2></div>
        <div className="overflow-x-auto"><table className="w-full text-left text-sm min-w-[520px]">
          <thead><tr className="bg-slate-100 border-y border-slate-200 text-xs font-extrabold text-slate-700 uppercase"><th className="py-3 px-4">Department</th><th className="py-3 px-4">Total</th><th className="py-3 px-4">Optimal</th><th className="py-3 px-4">Suboptimal</th><th className="py-3 px-4">Requires Reassignment</th></tr></thead>
          <tbody className="divide-y divide-slate-200">{DEPTS.map((d) => { const l = employees.filter((e) => e.dept === d); const c = (k) => l.filter((e) => allocStatus(e) === k).length; return (
            <tr key={d}><td className="py-3 px-4 font-bold">{d}</td><td className="py-3 px-4 tabular-nums">{fmt(l.length)}</td><td className="py-3 px-4 tabular-nums">{fmt(c('optimal'))}</td><td className="py-3 px-4 tabular-nums">{fmt(c('sub'))}</td><td className="py-3 px-4 font-bold tabular-nums">{fmt(c('reassign'))}</td></tr>); })}</tbody></table></div>
      </Card>
      <Card className="overflow-hidden">
        <div className="p-5 pb-3 flex flex-wrap items-center justify-between gap-2"><h2 className="text-base font-extrabold text-slate-900">Decision Log</h2><button className={btn('secondary', 'sm')} onClick={() => go('dashboard')}>Open Triage Queue</button></div>
        <div className="overflow-x-auto"><table className="w-full text-left text-sm min-w-[640px]">
          <thead><tr className="bg-slate-100 border-y border-slate-200 text-xs font-extrabold text-slate-700 uppercase"><th className="py-3 px-4">Time</th><th className="py-3 px-4">Task</th><th className="py-3 px-4">Decision</th><th className="py-3 px-4">From → To</th><th className="py-3 px-4">By</th></tr></thead>
          <tbody className="divide-y divide-slate-200">{pg.slice.length === 0 ? <tr><td colSpan="5"><Empty>No decisions yet. Approving or keeping an assignee from the Triage Queue will be logged here.</Empty></td></tr> : pg.slice.map((h) => (
            <tr key={h.id}><td className="py-3 px-4 whitespace-nowrap">{h.time}</td><td className="py-3 px-4 font-bold">{h.taskId}</td><td className="py-3 px-4"><Badge cls={h.action === 'Approved' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-slate-100 text-slate-700 border-slate-300'} icon={h.action === 'Approved' ? 'check' : 'info'}>{h.action}</Badge></td><td className="py-3 px-4">{h.from || '—'} → {h.to || '—'}</td><td className="py-3 px-4">{h.by}</td></tr>))}</tbody></table></div>
        <Pager {...pg.pagerProps} />
      </Card>
    </>
  );
}

function RecommendationsPage({ ctx }) {
  const { recs, tasks, employees, requestApprove, askConfirm, setRecs, toast, setCompareIds, setCompareTaskId, navigate: go } = ctx;
  const [filter, setFilter] = useState('Pending');
  const list = recs.filter((r) => filter === 'All' || r.status === filter);
  const pg = usePaged(list, 5, 'recommendations');
  const IMPACT = { High: 'bg-red-50 text-red-800 border-red-300', Medium: 'bg-amber-50 text-amber-800 border-amber-300', Low: 'bg-slate-100 text-slate-700 border-slate-300' };
  const openCompare = (task, base, to) => { setCompareTaskId(task.id); setCompareIds([base.id, to.id]); go('compare'); };

  return (
    <>
      <PageHeader title="Recommendations" desc="Suggested allocation changes based on workload and skill match. Each suggestion shows who is being compared. Nothing is applied until HR accepts it, and any suggestion can be dismissed." />
      <div className="flex flex-wrap gap-2">{['Pending', 'Accepted', 'Dismissed', 'All'].map((f) => (
        <button key={f} onClick={() => { setFilter(f); pg.reset(); }} aria-pressed={filter === f} className={btn(filter === f ? 'primary' : 'secondary', 'sm')}>{f} ({f === 'All' ? recs.length : recs.filter((r) => r.status === f).length})</button>))}</div>
      <div className="space-y-4">
        {pg.slice.length === 0 ? <Card><Empty>No recommendations match this filter.</Empty></Card> : pg.slice.map((r) => {
          const task = tasks.find((t) => t.id === r.taskId);
          const to = employees.find((e) => e.id === r.toId);
          if (!task || !to) return null;
          const base = baselineFor(task, to.id, employees);
          if (!base) return null;
          const hasCurrent = !!task.assignedId && task.assignedId !== to.id;
          const afterBase = hasCurrent ? r1(base.hours - task.weekly) : r1(base.hours + task.weekly);
          const afterTo = r1(to.hours + task.weekly);
          const sBase = matchScore(task, base);
          const sTo = matchScore(task, to);
          const baseLabel = hasCurrent ? 'Current assignee' : 'Next best candidate';
          const hi = 'font-extrabold text-slate-900';
          return (
            <Card key={r.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1 basis-72">
                  <div className="flex flex-wrap items-center gap-2"><Badge cls={IMPACT[r.impact]}>{r.impact.toUpperCase()} IMPACT</Badge><Badge cls="bg-slate-100 text-slate-800 border-slate-300">{r.type}</Badge><Badge cls={REC_STATUS_META[r.status]}>{r.status}</Badge></div>
                  <h3 className="text-sm font-extrabold text-slate-900 mt-2">{hasCurrent ? `Reassign ${task.id} from ${base.name} to ${to.name}` : `Assign ${task.id} to ${to.name}`}</h3>
                  <p className="text-sm text-slate-600 mt-1">{task.name} • {task.weekly} h/week • Required skills: {task.skills.join(', ')}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button className={btn('secondary')} onClick={() => openCompare(task, base, to)}><Icon name="compare" />Compare in detail</button>
                  {r.status === 'Pending' && (<>
                    <button className={btn('secondary')} onClick={() => askConfirm({ title: 'Dismiss recommendation?', body: <p>The recommendation for <b>{task.id}</b> will be marked as Dismissed and will not be applied.</p>, confirmLabel: 'Dismiss', tone: 'danger', onConfirm: () => { setRecs((p) => p.map((x) => (x.id === r.id ? { ...x, status: 'Dismissed' } : x))); toast('info', `Recommendation ${r.id} dismissed.`); } })}>Dismiss</button>
                    <button className={btn('primary')} onClick={() => requestApprove(r.taskId, r.toId)}><Icon name="check" />Accept</button>
                  </>)}
                </div>
              </div>

              {r.status === 'Pending' && (
                <>
                  <div className="mt-4 overflow-x-auto border border-slate-200 rounded-lg">
                    <table className="w-full text-left text-sm min-w-[480px]">
                      <thead>
                        <tr className="bg-slate-100 border-b border-slate-200 text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                          <th className="py-2 px-3 w-40">Compared</th>
                          <th className="py-2 px-3"><span className="block normal-case font-semibold text-slate-500">{baseLabel}</span>{base.name}</th>
                          <th className="py-2 px-3 bg-slate-200/60"><span className="block normal-case font-semibold text-slate-500">Recommended</span>{to.name}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        <tr><td className="py-2 px-3 font-bold">Fit score</td><td className={`py-2 px-3 ${sBase > sTo ? hi : ''}`}>{sBase}%</td><td className={`py-2 px-3 bg-slate-50 ${sTo >= sBase ? hi : ''}`}>{sTo}%</td></tr>
                        <tr><td className="py-2 px-3 font-bold">Workload (now → after)</td>
                          <td className="py-2 px-3">{base.hours}h ({util(base)}%) → {afterBase}h ({pct(afterBase)}%)</td>
                          <td className="py-2 px-3 bg-slate-50">{to.hours}h ({util(to)}%) → {afterTo}h ({pct(afterTo)}%)</td></tr>
                        {task.skills.map((s) => (
                          <tr key={s}><td className="py-2 px-3 font-bold">Skill: {s}</td>
                            <td className={`py-2 px-3 ${skillOf(base, s) > skillOf(to, s) ? hi : ''}`}>{skillOf(base, s)}%</td>
                            <td className={`py-2 px-3 bg-slate-50 ${skillOf(to, s) >= skillOf(base, s) ? hi : ''}`}>{skillOf(to, s)}%</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">{hasCurrent ? `"After" for ${base.name} is their workload once the task is moved away.` : '"After" shows each person\'s workload if they were given this task.'} Bold = better value.</p>
                </>
              )}
            </Card>);
        })}
      </div>
      <Card className="overflow-hidden"><Pager {...pg.pagerProps} /></Card>
    </>
  );
}

function ComparePage({ ctx }) {
  const { employees, tasks, recs, compareIds, setCompareIds, compareTaskId, setCompareTaskId, navigate: go } = ctx;
  const task = tasks.find((t) => t.id === compareTaskId) || tasks[0];
  const slots = [0, 1, 2].map((i) => compareIds[i] || '');
  const setSlot = (i, v) => { const n = [...slots]; n[i] = v; setCompareIds(n.filter(Boolean)); };
  const cands = slots.map((id) => employees.find((e) => e.id === id)).filter(Boolean);
  const data = cands.map((e) => ({ e, score: matchScore(task, e), after: e.hours + task.weekly }));
  const best = data.length ? Math.max(...data.map((d) => d.score)) : 0;
  return (
    <>
      <PageHeader title="Compare Candidates" desc="Compare 2–3 candidates for one task by fit score, workload, and required skills." />
      <Card className="p-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div><label className="block text-sm font-bold mb-1">Task</label><select className={inputCls} value={task.id} onChange={(e) => setCompareTaskId(e.target.value)}>{tasks.map((t) => <option key={t.id} value={t.id}>{t.id} — {t.name}</option>)}</select></div>
        {slots.map((id, i) => (
          <div key={i}><label className="block text-sm font-bold mb-1">Candidate {i + 1}{i === 2 ? ' (optional)' : ''}</label>
            <select className={inputCls} value={id} onChange={(e) => setSlot(i, e.target.value)}>
              <option value="">— Select —</option>
              {employees.filter((e) => e.id === id || !slots.includes(e.id)).map((e) => <option key={e.id} value={e.id}>{e.name} ({e.dept})</option>)}
            </select></div>))}
      </Card>
      {recs.some((r) => r.status === 'Pending') && (
        <Card className="p-4">
          <p className="text-xs font-extrabold text-slate-600 uppercase tracking-wider mb-2">Quick load from pending recommendations</p>
          <div className="flex flex-wrap gap-2">
            {recs.filter((r) => r.status === 'Pending').map((r) => {
              const t = tasks.find((x) => x.id === r.taskId);
              const to = employees.find((e) => e.id === r.toId);
              const base = t && to && baselineFor(t, to.id, employees);
              if (!t || !to || !base) return null;
              const on = compareTaskId === t.id && compareIds.includes(to.id) && compareIds.includes(base.id);
              return (
                <button key={r.id} aria-pressed={on} className={btn(on ? 'primary' : 'secondary', 'sm')}
                  onClick={() => { setCompareTaskId(t.id); setCompareIds([base.id, to.id]); }}>
                  {t.id}: {base.name.split(' ')[0]} vs {to.name.split(' ')[0]}
                </button>
              );
            })}
          </div>
        </Card>
      )}
      <Card className="p-5"><div className="text-sm"><b className="text-slate-900">{task.id} {task.name}</b> • {task.weekly} h/week • Skills: {task.skills.join(', ')}</div></Card>
      {data.length < 2 ? <Card><Empty>Select at least 2 candidates to compare.</Empty></Card> : (
        <Card className="overflow-hidden"><div className="overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[600px]">
            <thead><tr className="bg-slate-100 border-b border-slate-200"><th className="py-3 px-4 w-44 text-xs font-extrabold text-slate-700 uppercase">Criteria</th>
              {data.map((d) => (<th key={d.e.id} className="py-3 px-4 align-top"><div className="flex items-center gap-2"><Avatar name={d.e.name} size="w-8 h-8" /><div><div className="font-extrabold text-slate-900">{d.e.name}</div><div className="text-xs font-normal text-slate-600">{d.e.title}</div></div></div>{d.score === best && <div className="mt-2"><Badge cls="bg-emerald-50 text-emerald-800 border-emerald-300" icon="check">Highest score</Badge></div>}</th>))}</tr></thead>
            <tbody className="divide-y divide-slate-200">
              <tr><td className="py-3 px-4 font-bold">Fit score</td>{data.map((d) => <td key={d.e.id} className="py-3 px-4"><span className="text-lg font-extrabold">{d.score}%</span></td>)}</tr>
              <tr><td className="py-3 px-4 font-bold">Current workload</td>{data.map((d) => <td key={d.e.id} className="py-3 px-4">{d.e.hours}h ({util(d.e)}%)</td>)}</tr>
              <tr><td className="py-3 px-4 font-bold">Workload after assignment</td>{data.map((d) => <td key={d.e.id} className="py-3 px-4"><div className="font-semibold">{r1(d.after)}h ({pct(d.after)}%)</div><div className="mt-1"><StatusBadge s={allocStatusP(pct(d.after))} /></div></td>)}</tr>
              <tr><td className="py-3 px-4 font-bold">Remaining buffer</td>{data.map((d) => <td key={d.e.id} className="py-3 px-4">{r1(CAP - d.after)} h</td>)}</tr>
              {task.skills.map((s) => (<tr key={s}><td className="py-3 px-4 font-bold">Skill: {s}</td>{data.map((d) => <td key={d.e.id} className="py-3 px-4"><div className="font-semibold">{skillOf(d.e, s)}%{d.e.skills[s] == null && <span className="text-xs text-slate-500"> (not validated)</span>}</div><Bar value={skillOf(d.e, s)} /></td>)}</tr>))}
              <tr><td className="py-3 px-4 font-bold">Profile</td>{data.map((d) => <td key={d.e.id} className="py-3 px-4"><button className={btn('secondary', 'sm')} onClick={() => go(`employees/${d.e.id}`)}>View profile</button></td>)}</tr>
            </tbody></table></div></Card>)}
    </>
  );
}

/* =========================================================
   PAGES — PM & SHARED
   ========================================================= */
function PMDashboard({ ctx }) {
  const { tasks, navigate: go, setSelectedTaskId } = ctx;
  const hi = tasks.filter((t) => t.priority === 'Critical' || t.priority === 'High');
  const un = tasks.filter((t) => !t.assignedId);
  return (
    <>
      <PageHeader title="Project Dashboard" desc="Overview of Engineering & Infra pod tasks and the tasks that still need a candidate."
        actions={<button className={btn('primary')} onClick={() => go('candidates')}><Icon name="users" />Find Candidates</button>} />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Active Pod Tasks" value={tasks.length} unit="tasks" note={<p>All current tasks</p>} icon="tasks" />
        <StatCard label="High Priority Items" value={hi.length} unit="Critical / High" note={<p>Needs prompt attention</p>} icon="alert" />
        <StatCard label="Needs Candidates" value={un.length} unit="tasks" note={<p>No assignee yet</p>} icon="users" />
      </div>
      <Card className="overflow-hidden">
        <div className="p-5 pb-3"><h2 className="text-base font-extrabold text-slate-900">Tasks Needing Candidates</h2></div>
        <div className="overflow-x-auto"><table className="w-full text-left text-sm min-w-[480px]">
          <thead><tr className="bg-slate-100 border-y border-slate-200 text-xs font-extrabold text-slate-700 uppercase"><th className="py-3 px-4">Task</th><th className="py-3 px-4">Priority</th><th className="py-3 px-4 text-right">Action</th></tr></thead>
          <tbody className="divide-y divide-slate-200">{un.length === 0 ? <tr><td colSpan="3"><Empty>All tasks have an assignee.</Empty></td></tr> : un.map((t) => (
            <tr key={t.id}><td className="py-3 px-4"><div className="font-extrabold">{t.id}</div><div className="text-xs text-slate-600">{t.name}</div></td><td className="py-3 px-4"><PriorityBadge p={t.priority} /></td>
              <td className="py-3 px-4 text-right"><button className={btn('secondary', 'sm')} onClick={() => { setSelectedTaskId(t.id); go('candidates'); }}>Find Candidates</button></td></tr>))}</tbody></table></div>
      </Card>
    </>
  );
}

function TasksPage({ ctx }) {
  const { tasks, empById, role, selectedTaskId, setSelectedTaskId, navigate: go, openAddTask } = ctx;
  const [filter, setFilter] = useState('all');
  const [q, setQ] = useState('');
  const cnt = { all: tasks.length, needs: tasks.filter((t) => !t.assignedId).length, high: tasks.filter((t) => t.priority === 'Critical' || t.priority === 'High').length, prog: tasks.filter((t) => t.status === 'In Progress').length };
  const rows = tasks.filter((t) => {
    const s = q.toLowerCase();
    if (s && ![t.id, t.name, t.desc].some((x) => x.toLowerCase().includes(s))) return false;
    if (filter === 'needs') return !t.assignedId;
    if (filter === 'high') return t.priority === 'Critical' || t.priority === 'High';
    if (filter === 'prog') return t.status === 'In Progress';
    return true;
  });
  const pg = usePaged(rows, 5, 'tasks');
  const Tab = ({ id, label, n }) => <button onClick={() => { setFilter(id); pg.reset(); }} aria-pressed={filter === id} className={btn(filter === id ? 'primary' : 'secondary', 'sm')}>{label} ({n})</button>;
  return (
    <>
      <PageHeader title={role === 'pm' ? 'Task Management' : 'Tasks Overview'} desc={role === 'pm' ? 'Manage task specifications and find candidates for tasks that need them.' : 'Monitor all tasks and their assignees (read-only).'}
        actions={role === 'pm' && <button className={btn('primary')} onClick={openAddTask}><Icon name="plus" />Add New Task</button>} />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Active Tasks" value={cnt.all} unit="tasks" note={<p>All current tasks</p>} icon="tasks" />
        <StatCard label="High Priority" value={cnt.high} unit="Critical / High" icon="alert" />
        <StatCard label="Unstaffed" value={cnt.needs} unit="tasks" note={<p>No assignee yet</p>} icon="users" />
      </div>
      <Card className="overflow-hidden">
        <div className="p-4 flex flex-wrap items-center gap-3 border-b border-slate-200 bg-slate-50">
          <div className="flex flex-wrap gap-2"><Tab id="all" label="All" n={cnt.all} /><Tab id="needs" label="Needs Candidates" n={cnt.needs} /><Tab id="high" label="High Priority" n={cnt.high} /><Tab id="prog" label="In Progress" n={cnt.prog} /></div>
          <div className="ml-auto">
            <div className="relative"><span className="absolute inset-y-0 left-2.5 flex items-center text-slate-500"><Icon name="search" /></span><input value={q} onChange={(e) => { setQ(e.target.value); pg.reset(); }} placeholder="Search tasks..." className={`${inputCls} pl-9 w-52`} /></div>
          </div>
        </div>
        <div className="overflow-x-auto"><table className="w-full text-left text-sm min-w-[720px]">
          <thead><tr className="bg-slate-100 border-b border-slate-200 text-xs font-extrabold text-slate-700 uppercase tracking-wider"><th className="py-3 px-4">Task</th><th className="py-3 px-4">Assigned To</th><th className="py-3 px-4 hidden xl:table-cell">Complexity</th><th className="py-3 px-4">Priority</th><th className="py-3 px-4">Workload</th><th className="py-3 px-4">Status</th>{role === 'pm' && <th className="py-3 px-4 text-right">Action</th>}</tr></thead>
          <tbody className="divide-y divide-slate-200">{pg.slice.length === 0 ? <tr><td colSpan="7"><Empty>No tasks match this filter.</Empty></td></tr> : pg.slice.map((t) => (
            <tr key={t.id} className={selectedTaskId === t.id ? 'bg-slate-100' : 'hover:bg-slate-50'}>
              <td className="py-3 px-4 max-w-xs"><div className="font-extrabold text-slate-900">{t.id} • {t.name}</div><div className="text-xs text-slate-600 break-words">{t.desc}</div></td>
              <td className="py-3 px-4">{t.assignedId ? <span className="font-bold">{empById(t.assignedId)?.name}</span> : <Badge cls="bg-amber-50 text-amber-800 border-amber-300" icon="info">Unassigned</Badge>}</td>
              <td className="py-3 px-4 hidden xl:table-cell">{t.complexity}</td><td className="py-3 px-4"><PriorityBadge p={t.priority} /></td>
              <td className="py-3 px-4 whitespace-nowrap"><div className="font-bold">{t.hours} h total</div><div className="text-xs text-slate-600">{t.weekly} h/week</div></td>
              <td className="py-3 px-4"><Badge cls={TASK_STATUS_META[t.status]}>{t.status}</Badge></td>
              {role === 'pm' && <td className="py-3 px-4 text-right">{!t.assignedId ? <button className={btn('primary', 'sm')} onClick={() => { setSelectedTaskId(t.id); go('candidates'); }}>Find Candidates</button> : <span className="text-xs text-slate-500">—</span>}</td>}
            </tr>))}</tbody></table></div>
        <Pager {...pg.pagerProps} />
      </Card>
    </>
  );
}

function CandidatesPage({ ctx }) {
  const { tasks, employees, selectedTaskId, setSelectedTaskId, requestApprove, navigate: go } = ctx;
  const unassigned = tasks.filter((t) => !t.assignedId);
  const task = unassigned.find((t) => t.id === selectedTaskId) || unassigned[0];
  if (!task) return (<><PageHeader title="Candidate Allocation" /><Card className="p-8 text-center"><div className="w-12 h-12 mx-auto rounded-full bg-emerald-50 border border-emerald-300 text-emerald-800 flex items-center justify-center mb-3"><Icon name="check" className="w-6 h-6" /></div><h2 className="font-extrabold text-slate-900">All tasks have an assignee</h2><button className={`${btn('primary')} mt-4`} onClick={() => go('tasks')}>Back to Tasks</button></Card></>);
  const top = employees.map((e) => ({ e, score: matchScore(task, e) })).sort((a, b) => b.score - a.score).slice(0, 3);
  return (
    <>
      <PageHeader title="Candidate Allocation" desc="Top three candidates based on skill match (60%) and available hours (40%)." />
      <Card className="p-5">
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-[240px] flex-1"><label className="block text-sm font-bold mb-1">Task that needs a candidate</label>
            <select className={inputCls} value={task.id} onChange={(e) => setSelectedTaskId(e.target.value)}>{unassigned.map((t) => <option key={t.id} value={t.id}>{t.id} — {t.name}</option>)}</select></div>
          <div className="flex flex-wrap gap-2 items-center text-sm"><PriorityBadge p={task.priority} /><Badge cls="bg-slate-100 text-slate-800 border-slate-300">{task.weekly} h/week</Badge><Badge cls="bg-slate-100 text-slate-800 border-slate-300">{task.skills.join(', ')}</Badge></div>
        </div>
      </Card>
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {top.map(({ e, score }, i) => {
          const buf = CAP - e.hours; const after = buf - task.weekly;
          const label = after < 0 ? 'Overload' : after <= 2 ? 'Tight' : buf >= 15 ? 'Underutilized' : 'Available';
          return (
            <Card key={e.id} className={`p-5 flex flex-col ${i === 0 ? 'border-2 border-slate-900' : ''}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0"><Avatar name={e.name} size="w-10 h-10" /><div className="min-w-0"><h3 className="font-extrabold text-slate-900 truncate">{e.name}</h3><p className="text-xs text-slate-600 truncate">{e.title}</p></div></div>
                <div className="text-center bg-slate-100 border border-slate-300 rounded-xl px-2.5 py-1"><div className="text-sm font-extrabold">{score}%</div><div className="text-[9px] font-extrabold uppercase">Match</div></div>
              </div>
              {i === 0 && <div className="mt-2"><Badge cls="bg-emerald-50 text-emerald-800 border-emerald-300" icon="check">Best match</Badge></div>}
              <div className="mt-4"><div className="flex justify-between gap-2 text-xs font-bold text-slate-700 mb-1"><span>Availability buffer</span><span>{label} ({r1(buf)}h)</span></div><Bar value={Math.max(0, Math.min(100, (buf / CAP) * 100))} color={after < 0 ? 'bg-red-600' : after <= 2 ? 'bg-amber-500' : 'bg-emerald-600'} /></div>
              <div className="mt-4 flex-1"><p className="text-xs font-extrabold text-slate-600 uppercase tracking-wider mb-2">Validated skills match</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">{task.skills.map((s) => <div key={s}>{s} <b>{skillOf(e, s)}%</b></div>)}</div></div>
              <button className={`${btn(i === 0 ? 'primary' : 'secondary')} mt-5 w-full`} onClick={() => requestApprove(task.id, e.id)}>{after < 0 ? 'Assign with Overload Notice' : 'Assign Candidate'}</button>
            </Card>);
        })}
      </div>
    </>
  );
}

/* =========================================================
   APP
   ========================================================= */
export default function App() {
  const [user, setUser] = useState(null);
  const [path, setPath] = useState(parseHash());
  const [employees, setEmployees] = useState(initialEmployees);
  const [tasks, setTasks] = useState(initialTasks);
  const [triage, setTriage] = useState(initialTriage);
  const [recs, setRecs] = useState(initialRecs);
  const [history, setHistory] = useState([]);
  const [selectedTaskId, setSelectedTaskId] = useState('TSK-203');
  const [compareIds, setCompareIds] = useState(['EMP-8842', 'EMP-7710']);
  const [compareTaskId, setCompareTaskId] = useState('TSK-802');
  const [empPreset, setEmpPreset] = useState('all');
  const [lastCheck, setLastCheck] = useState('');
  const [toastState, setToastState] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [check, setCheck] = useState(null);
  const [collapsed, setCollapsed] = useState(typeof window !== 'undefined' && window.innerWidth < 1280);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [gq, setGq] = useState('');
  const [bellOpen, setBellOpen] = useState(false);
  const [focusTaskId, setFocusTaskId] = useState(null);
  const empRef = useRef(employees);
  empRef.current = employees;

  useEffect(() => {
    const on = () => setPath(parseHash());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  // Half-view / zoomed layouts: auto-collapse the sidebar to an icon rail below 1280px
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1279px)');
    const on = () => setCollapsed(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  useEffect(() => {
    if (!toastState) return undefined;
    const t = setTimeout(() => setToastState(null), 4500);
    return () => clearTimeout(t);
  }, [toastState]);

  const role = user ? user.role : null;
  const page = path[0] || 'dashboard';
  const allowed = role ? MENUS[role].flatMap((g) => g.items.map((i) => i.id)) : [];

  useEffect(() => {
    if (!user) { if (path[0] !== 'login') navigate('login'); return; }
    if (path[0] === 'login' || !path[0] || !allowed.includes(path[0])) navigate('dashboard');
  }, [user, path]); // eslint-disable-line

  const toast = (type, msg) => setToastState({ type, msg, k: Date.now() });
  const askConfirm = (cfg) => setConfirm(cfg);
  const empById = (id) => employees.find((e) => e.id === id);
  const go = (to) => { setBellOpen(false); setGq(''); navigate(to); };

  const login = (r, email) => {
    setUser(r === 'hr'
      ? { role: 'hr', roleName: 'HR Manager', name: 'Elena Rostova', email, phone: '' }
      : { role: 'pm', roleName: 'Project Manager (Eng Pod A)', name: 'John Doe', email, phone: '' });
    navigate('dashboard');
    toast('success', r === 'hr' ? 'Signed in as HR Manager.' : 'Signed in to the PM workspace.');
  };
  const logout = () => {
    askConfirm({ title: 'Log out?', body: <p>You will be signed out of this session.</p>, confirmLabel: 'Log out', onConfirm: () => { setUser(null); setMobileOpen(false); navigate('login'); toast('info', 'You have been logged out.'); } });
  };

  const addHistory = (e) => setHistory((p) => [{ id: Date.now() + Math.random(), time: nowStr(), by: user.name, ...e }, ...p]);

  const impactBody = (task, to) => {
    const from = empById(task.assignedId);
    return (
      <div className="space-y-3">
        <p>{from ? <>Move <b>{task.id} {task.name}</b> from <b>{from.name}</b> to <b>{to.name}</b>?</> : <>Assign <b>{task.id} {task.name}</b> to <b>{to.name}</b>?</>}</p>
        <ul className="list-disc pl-5 space-y-1">
          {from && <li>{from.name}: {from.hours}h ({util(from)}%) → {r1(from.hours - task.weekly)}h ({pct(from.hours - task.weekly)}%)</li>}
          <li>{to.name}: {to.hours}h ({util(to)}%) → {r1(to.hours + task.weekly)}h ({pct(to.hours + task.weekly)}%)</li>
        </ul>
        {pct(to.hours + task.weekly) > 100 && <p className="text-red-700 font-semibold flex items-start gap-1"><Icon name="alert" className="w-4 h-4 mt-0.5 shrink-0" />This candidate's workload will exceed 100% of capacity.</p>}
      </div>
    );
  };

  const applyAssignment = (taskId, toId) => {
    const task = tasks.find((t) => t.id === taskId);
    const to = empById(toId);
    const from = empById(task.assignedId);
    setEmployees((p) => p.map((e) => (e.id === from?.id ? { ...e, hours: r1(e.hours - task.weekly) } : e.id === toId ? { ...e, hours: r1(e.hours + task.weekly) } : e)));
    setTasks((p) => p.map((t) => (t.id === taskId ? { ...t, assignedId: toId, status: 'In Progress' } : t)));
    setTriage((p) => p.filter((i) => i.taskId !== taskId));
    setRecs((p) => p.map((r) => (r.taskId === taskId && r.status === 'Pending' ? { ...r, status: r.toId === toId ? 'Accepted' : 'Superseded' } : r)));
    addHistory({ taskId, action: 'Approved', from: from?.name, to: to.name });
    toast('success', `${task.id} was successfully ${from ? 'moved' : 'assigned'} to ${to.name}.`);
  };
  const requestApprove = (taskId, toId) => {
    const task = tasks.find((t) => t.id === taskId);
    const to = empById(toId);
    if (!task || !to) return;
    askConfirm({ title: 'Confirm approval', body: impactBody(task, to), confirmLabel: 'Yes, Approve', onConfirm: () => applyAssignment(taskId, toId) });
  };
  const requestKeep = (taskId) => {
    const task = tasks.find((t) => t.id === taskId);
    const from = empById(task.assignedId);
    askConfirm({ title: 'Keep the current assignee?', body: <p>The recommendation for <b>{task.id}</b> will be dismissed and <b>{from?.name}</b> remains the assignee.</p>, confirmLabel: 'Yes, Keep Current', onConfirm: () => {
      setTriage((p) => p.filter((i) => i.taskId !== taskId));
      setRecs((p) => p.map((r) => (r.taskId === taskId && r.status === 'Pending' ? { ...r, status: 'Dismissed' } : r)));
      addHistory({ taskId, action: 'Kept', from: from?.name, to: from?.name });
      toast('info', `${task.id} stays with ${from?.name}.`);
    } });
  };

  const runCheck = () => {
    setCheck({ phase: 'running' });
    setTimeout(() => {
      const list = empRef.current;
      const c = { reassign: 0, sub: 0, optimal: 0 };
      list.forEach((e) => { c[allocStatus(e)]++; });
      setLastCheck(nowStr());
      setCheck({ phase: 'done', result: c, total: list.length });
    }, 1500);
  };

  const createTask = (f) => {
    let n = tasks.length + 1; let id = `TSK-${900 + n}`;
    while (tasks.some((t) => t.id === id)) { n++; id = `TSK-${900 + n}`; }
    setTasks((p) => [{ id, name: f.name, desc: f.desc || 'No description.', skills: f.skills, complexity: f.complexity, priority: f.priority, hours: f.hours, weekly: f.weekly, status: 'Needs Candidates', assignedId: null }, ...p]);
    setSelectedTaskId(id); setShowAdd(false);
    toast('success', `Task ${id} was added.`);
  };

  const ctx = { role, employees, tasks, triage, recs, history, empById, navigate: go, requestApprove, requestKeep, runCheck, lastCheck, selectedTaskId, setSelectedTaskId, compareIds, setCompareIds, compareTaskId, setCompareTaskId, empPreset, setEmpPreset, focusTaskId, setFocusTaskId, openAddTask: () => setShowAdd(true), askConfirm, setRecs, toast };

  /* ---------- Not signed in ---------- */
  if (!user) {
    return (
      <>
        <Toast toast={toastState} onClose={() => setToastState(null)} />
        <LoginPage onLogin={login} onForgot={(email) => askConfirm({ title: 'Reset Password', hideCancel: true, confirmLabel: 'OK',
          body: <p>{emailOk(email) ? 'If this account exists, password reset instructions have been sent to the registered email address. Please check your inbox.' : 'Please enter a valid work email address first.'}</p> })} />
        <ConfirmDialog cfg={confirm} onClose={() => setConfirm(null)} />
      </>
    );
  }

  /* ---------- Breadcrumb ---------- */
  const menu = findMenu(role, page);
  const crumbs = [{ label: 'Home', to: 'dashboard' }];
  if (menu) {
    if (page !== 'dashboard') crumbs.push({ label: menu.group.charAt(0) + menu.group.slice(1).toLowerCase() });
    crumbs.push({ label: menu.item.label, to: path[1] ? page : undefined });
    if (page === 'employees' && path[1]) crumbs.push({ label: empById(path[1])?.name || path[1] });
  }

  /* ---------- Global search ---------- */
  const s = gq.trim().toLowerCase();
  const results = s ? [
    ...(role === 'hr' ? employees.filter((e) => [e.name, e.id, e.title].some((x) => x.toLowerCase().includes(s))).map((e) => ({ key: e.id, label: e.name, sub: `${e.id} • ${e.title}`, onClick: () => go(`employees/${e.id}`) })) : []),
    ...tasks.filter((t) => [t.id, t.name].some((x) => x.toLowerCase().includes(s))).map((t) => ({ key: t.id, label: `${t.id} ${t.name}`, sub: 'Task', onClick: () => { setSelectedTaskId(t.id); go('tasks'); } })),
  ].slice(0, 6) : [];

  /* ---------- Notifications ---------- */
  const unassigned = tasks.filter((t) => !t.assignedId);
  const notifications = [
    ...(role === 'hr' ? triage.map((i) => {
      const v = triageView(i, employees, tasks);
      if (!v) return null;
      return {
        key: `tri-${i.taskId}`, icon: 'alert', cls: STATUS_META.reassign.cls,
        title: `${i.taskId} needs a decision`,
        desc: `${v.task.name} • ${v.trigger} • Proposed: ${v.prop.name}`,
        actionLabel: 'Review',
        onOpen: () => { setFocusTaskId(i.taskId); go('dashboard'); },
      };
    }).filter(Boolean) : []),
    ...(role === 'pm' && unassigned.length > 0 ? [{
      key: 'pm-unassigned', icon: 'users', cls: STATUS_META.sub.cls,
      title: `${unassigned.length} ${unassigned.length === 1 ? 'task needs' : 'tasks need'} a candidate`,
      desc: unassigned.slice(0, 3).map((t) => t.id).join(', ') + (unassigned.length > 3 ? ', ...' : ''),
      actionLabel: 'Find candidates',
      onOpen: () => go('candidates'),
    }] : []),
    ...history.slice(0, 5).map((h) => ({
      key: `h-${h.id}`,
      icon: h.action === 'Approved' ? 'check' : 'info',
      cls: h.action === 'Approved' ? STATUS_META.optimal.cls : 'bg-slate-100 text-slate-700 border-slate-300',
      title: h.action === 'Approved' ? `${h.taskId} reassignment approved` : `${h.taskId} kept with current assignee`,
      desc: `${h.from || '—'} → ${h.to || '—'}`,
      time: h.time,
      ...(role === 'hr' ? { actionLabel: 'View log', onOpen: () => go('status') } : {}),
    })),
  ];
  const badgeCount = role === 'hr' ? triage.length : unassigned.length;

  let content = null;
  if (page === 'dashboard') content = role === 'hr' ? <HRDashboard ctx={ctx} /> : <PMDashboard ctx={ctx} />;
  else if (page === 'employees') content = path[1] ? <EmployeeDetail ctx={ctx} id={path[1]} /> : <EmployeesPage ctx={ctx} />;
  else if (page === 'tasks') content = <TasksPage ctx={ctx} />;
  else if (page === 'candidates') content = <CandidatesPage ctx={ctx} />;
  else if (page === 'analysis') content = <AnalysisPage ctx={ctx} />;
  else if (page === 'status') content = <StatusPage ctx={ctx} />;
  else if (page === 'recommendations') content = <RecommendationsPage ctx={ctx} />;
  else if (page === 'compare') content = <ComparePage ctx={ctx} />;

  const sideProps = { menus: MENUS[role], page, user, onProfile: () => { setShowProfile(true); setMobileOpen(false); }, onLogout: logout };

  return (
    <div className="h-screen flex bg-slate-50 text-slate-800 antialiased font-sans overflow-hidden">
      <Toast toast={toastState} onClose={() => setToastState(null)} />

      {/* Sidebar: icon rail from 768px, full width from 1280px, drawer below 768px */}
      <aside className={`hidden md:flex shrink-0 bg-[#0f172a] text-slate-300 border-r border-slate-800 transition-all duration-200 ${collapsed ? 'w-20' : 'w-64'}`}>
        <div className="w-full"><SidebarBody {...sideProps} go={go} compact={collapsed} showToggle onToggle={() => setCollapsed(!collapsed)} /></div>
      </aside>
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="w-72 max-w-[85vw] bg-[#0f172a] text-slate-300 shadow-2xl"><SidebarBody {...sideProps} go={(p) => { go(p); setMobileOpen(false); }} compact={false} showToggle={false} /></div>
          <div className="flex-1 bg-slate-900/60" onClick={() => setMobileOpen(false)} />
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-slate-200 px-3 sm:px-4 md:px-6 py-3 flex items-center gap-3 shadow-sm">
          <button className="md:hidden p-2 rounded-lg border border-slate-300 cursor-pointer" aria-label="Open menu" onClick={() => setMobileOpen(true)}><Icon name="menu" className="w-5 h-5" /></button>
          <div className="relative flex-1 min-w-0 max-w-xl">
            <span className="absolute inset-y-0 left-3 flex items-center text-slate-500"><Icon name="search" /></span>
            <input value={gq} onChange={(e) => setGq(e.target.value)} placeholder={role === 'hr' ? 'Search employees or tasks...' : 'Search tasks...'} className={`${inputCls} pl-10`} />
            {s && (
              <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-slate-300 rounded-xl shadow-xl z-30 overflow-hidden">
                {results.length === 0 ? <div className="px-4 py-3 text-sm text-slate-500">No results.</div> : results.map((r) => (
                  <button key={r.key} onClick={r.onClick} className="w-full text-left px-4 py-2.5 hover:bg-slate-100 cursor-pointer"><div className="text-sm font-bold text-slate-900 truncate">{r.label}</div><div className="text-xs text-slate-600 truncate">{r.sub}</div></button>))}
              </div>)}
          </div>
          <div className="ml-auto flex items-center gap-3 shrink-0">
            <span className="hidden xl:flex items-center gap-1.5 text-xs bg-slate-100 border border-slate-300 rounded-md px-3 py-1.5"><Icon name="clock" className="w-4 h-4 text-slate-600" /><Clock /></span>
            <button onClick={() => setBellOpen(true)} aria-label="Notifications" className="relative p-2 rounded-full border border-slate-300 hover:bg-slate-100 cursor-pointer">
              <Icon name="bell" className="w-5 h-5" />
              {badgeCount > 0 && <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center">{badgeCount}</span>}
            </button>
            <button onClick={() => setShowProfile(true)} title="Edit profile" className="flex items-center gap-2 px-2 xl:px-2.5 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 cursor-pointer text-left">
              <Avatar name={user.name} size="w-7 h-7" /><div className="hidden xl:block leading-tight max-w-[160px]"><div className="text-xs font-extrabold text-slate-900 truncate">{user.name}</div><div className="text-[11px] text-slate-600 truncate">{user.roleName}</div></div>
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-6 space-y-6 max-w-[1600px] mx-auto">
            <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-slate-600">
              {crumbs.map((c, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <span aria-hidden="true">/</span>}
                  {c.to && i < crumbs.length - 1 ? <button onClick={() => go(c.to)} className="hover:underline text-slate-800 cursor-pointer">{c.label}</button> : <span className={i === crumbs.length - 1 ? 'text-slate-900 font-extrabold' : ''}>{c.label}</span>}
                </React.Fragment>))}
            </nav>
            {content}
          </div>
        </main>

        <footer className="bg-white border-t border-slate-200 px-4 md:px-6 py-2.5 text-xs font-semibold text-slate-600 flex flex-wrap items-center justify-between gap-2">
          <span>© Allocalens Enterprise Workspace</span><span>Role: {user.roleName}</span>
        </footer>
      </div>

      {bellOpen && <NotificationsModal items={notifications} onClose={() => setBellOpen(false)} />}
      {showProfile && <ProfileModal user={user} onClose={() => setShowProfile(false)} onSave={(f) => { setUser({ ...user, ...f, name: f.name.trim() }); setShowProfile(false); toast('success', 'Profile updated.'); }} />}
      {showAdd && <AddTaskModal onClose={() => setShowAdd(false)} onCreate={createTask} />}
      {check && (
        <Modal z="z-[60]" title="System Allocation Check" onClose={() => check.phase === 'done' && setCheck(null)}
          footer={check.phase === 'done' && <><button className={btn('secondary')} onClick={() => setCheck(null)}>Close</button><button className={btn('primary')} onClick={() => { setCheck(null); go('analysis'); }}>View Analysis</button></>}>
          {check.phase === 'running' ? (
            <div className="flex flex-col items-center py-6 gap-3"><div className="w-10 h-10 rounded-full border-4 border-slate-200 border-t-slate-900 animate-spin" /><p className="font-semibold">Analyzing {fmt(employees.length)} employees and {tasks.length} tasks...</p></div>
          ) : (
            <div className="space-y-3">
              <p className="font-semibold text-slate-900">Check completed on {lastCheck}.</p>
              <ul className="space-y-2">{['optimal', 'sub', 'reassign'].map((k) => <li key={k} className="flex items-center justify-between gap-2"><StatusBadge s={k} /><b>{fmt(check.result[k])} employees</b></li>)}</ul>
              <p className="text-sm">The triage queue currently has <b>{triage.length}</b> {triage.length === 1 ? 'item' : 'items'} waiting for a decision.</p>
            </div>)}
        </Modal>
      )}
      <ConfirmDialog cfg={confirm} onClose={() => setConfirm(null)} />
    </div>
  );
}