import React, { useState, useEffect } from 'react';
import { api, setToken, setUnauthorizedHandler } from './api';

/* =========================================================
   CONSTANTS & UTILS
   Semua data berasal dari backend Allocalens (lihat src/api.js).
   ========================================================= */
const DEPARTMENTS = ['Finance', 'HR', 'IT', 'Marketing', 'Operations', 'R&D'];
const PRIORITIES = ['Critical', 'High', 'Medium', 'Low'];
const COMPLEXITIES = ['High', 'Medium', 'Low'];
const SKILL_LEVELS = ['Low', 'Medium', 'High', 'Expert'];

const initials = (n) => String(n || '?').split(/[\s#]+/).filter(Boolean).map((s) => s[0]).join('').slice(0, 2).toUpperCase();
const fmt = (n) => new Intl.NumberFormat('en-US').format(n ?? 0);
const emailOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const pad = (id) => String(id).padStart(4, '0');
const r1 = (n) => Math.round(n * 10) / 10;
const nowStr = () => new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

// Dataset belum punya nama employee/task, jadi dipakai label cadangan.
const empCode = (id) => `EMP-${pad(id)}`;
const taskCode = (id) => `TSK-${pad(id)}`;
const empLabel = (e) => (e && e.name) || `Employee ${e ? empCode(e.id) : ''}`.trim();
const taskLabel = (t) => (t && t.task_name) || `Unnamed task (source #${t ? t.source_task_id ?? t.id : ''})`;

// Level beban kerja employee: total jam task yang dialokasikan dibanding kapasitas (dihitung backend).
// Ini hanya gambaran beban kerja. Status alokasi resmi (Optimal/Suboptimal/Requires Reassignment) ada di halaman Allocation Analysis.
const workloadKey = (pct) => (pct > 110 ? 'reassign' : pct < 70 ? 'sub' : 'optimal');
const WL_LABEL = { optimal: 'Balanced', sub: 'Under-used', reassign: 'Overloaded' };
const WL_RANGE = { optimal: '70%–110% of capacity', sub: 'Below 70% of capacity', reassign: 'Above 110% of capacity' };

const STATUS_META = {
  optimal: { label: 'Optimal', cls: 'bg-emerald-50 text-emerald-800 border-emerald-300', icon: 'check', hex: '#059669', bar: 'bg-emerald-600' },
  sub: { label: 'Suboptimal', cls: 'bg-amber-50 text-amber-800 border-amber-300', icon: 'info', hex: '#d97706', bar: 'bg-amber-500' },
  reassign: { label: 'Requires Reassignment', cls: 'bg-red-50 text-red-800 border-red-300', icon: 'alert', hex: '#dc2626', bar: 'bg-red-600' },
};
// Nama status dari backend -> kunci STATUS_META
const STATUS_BY_NAME = { Optimal: 'optimal', Suboptimal: 'sub', 'Requires Reassignment': 'reassign' };
const PRIORITY_META = {
  Critical: 'bg-red-50 text-red-800 border-red-300',
  High: 'bg-orange-50 text-orange-800 border-orange-300',
  Medium: 'bg-sky-50 text-sky-800 border-sky-300',
  Low: 'bg-slate-100 text-slate-700 border-slate-300',
};
const FACTOR_LABEL = { skill: 'Skill match', workload: 'Workload / capacity', deadline: 'Deadline feasibility' };

/* =========================================================
   MENU & ROUTING
   Allocation Status, Recommendations, Compare Candidates (HR) dan Candidates (PM) memakai endpoint /allocations dan /tasks/:id/candidates.
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
const ROLE_NAME = { hr: 'HR Manager', pm: 'Project Manager' };
const findMenu = (role, page) => {
  for (const g of MENUS[role]) for (const it of g.items) if (it.id === page) return { group: g.group, item: it };
  return null;
};
const parseHash = () => window.location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
const navigate = (to) => { window.location.hash = '/' + to; };

/* =========================================================
   DATA HOOKS
   ========================================================= */
// Ambil data dari backend. Dijalankan ulang kalau isi deps berubah.
function useFetch(fn, deps) {
  const [state, setState] = useState({ data: null, loading: true, error: '' });
  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: '' }));
    fn()
      .then((data) => { if (alive) setState({ data, loading: false, error: '' }); })
      .catch((err) => { if (alive) setState({ data: null, loading: false, error: err.message }); });
    return () => { alive = false; };
  }, deps); // eslint-disable-line
  return state;
}

function useDebounced(value, ms = 350) {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
}

// Pagination dikelola server: UI hanya menyimpan nomor halaman dan ukuran halaman.
function usePageState(initialSize = 10) {
  const [page, setPage] = useState(1);
  const [pageSize, setSize] = useState(initialSize);
  return { page, setPage, pageSize, setPageSize: (n) => { setSize(n); setPage(1); } };
}

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
// inputBase tanpa lebar: dipakai kalau kolom butuh w-auto atau lebar tetap (w-full + w-auto bentrok, w-full yang menang).
const inputBase = 'border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-slate-800';
const inputCls = `w-full ${inputBase}`;

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

// parts = [{ key, value, bar (kelas warna), label }], total = jumlah seluruh bagian
const StackBar = ({ parts, total }) => (
  <div className="flex w-full h-2.5 rounded-full overflow-hidden bg-slate-100 border border-slate-200">
    {parts.map((p) => p.value > 0 && (
      <div key={p.key} className={p.bar} style={{ width: `${(p.value / (total || 1)) * 100}%` }} title={`${p.label}: ${fmt(p.value)}`} />
    ))}
  </div>
);

function Donut({ segments, total }) {
  const R = 15.9155;
  let offset = 0;
  return (
    <svg viewBox="0 0 36 36" className="w-36 h-36 -rotate-90" role="img" aria-label="Distribution chart">
      <circle cx="18" cy="18" r={R} fill="none" stroke="#e2e8f0" strokeWidth="4" />
      {segments.map((sg) => {
        const p = total ? (sg.value / total) * 100 : 0;
        const el = <circle key={sg.key} cx="18" cy="18" r={R} fill="none" stroke={sg.hex} strokeWidth="4" strokeDasharray={`${p} ${100 - p}`} strokeDashoffset={-offset} />;
        offset += p;
        return el;
      })}
    </svg>
  );
}

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

function Pager({ page, setPage, total, pageSize, setPageSize, label, sizes = [5, 10, 20, 50] }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-700">
      <div>Showing <b className="text-slate-900">{fmt(from)}–{fmt(to)}</b> of <b className="text-slate-900">{fmt(total)}</b> {label}</div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2">Rows
          <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className="border border-slate-300 rounded-md px-2 py-1 bg-white text-sm">
            {sizes.map((n) => <option key={n} value={n}>{n}</option>)}
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

/* ---------- Tambahan untuk data dari server ---------- */
const WorkloadBadge = ({ pct }) => {
  const k = workloadKey(pct);
  return <Badge cls={STATUS_META[k].cls} icon={STATUS_META[k].icon}>{WL_LABEL[k]}</Badge>;
};
const LevelBar = ({ pct }) => <Bar value={pct} max={150} mark={100} color={STATUS_META[workloadKey(pct)].bar} />;

const Loading = ({ text = 'Loading...' }) => (
  <div className="flex flex-col items-center py-10 gap-3 text-sm font-semibold text-slate-600">
    <div className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-slate-900 animate-spin" />{text}
  </div>
);
const ErrorBox = ({ msg }) => (
  <div role="alert" className="m-4 flex items-start gap-2 p-3 rounded-lg border border-red-300 bg-red-50 text-red-800 text-sm font-semibold">
    <Icon name="alert" className="w-5 h-5 shrink-0" /><span className="break-words">{msg}</span>
  </div>
);
const Field = ({ label, error, children }) => (
  <div><label className="block text-sm font-bold mb-1">{label}</label>{children}{error && <p className="text-xs font-semibold text-red-700 mt-1">{error}</p>}</div>
);

/* =========================================================
   LOGIN (memakai POST /auth/login; role ditentukan server dari akun)
   ========================================================= */
function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    const er = {};
    if (!email) er.email = 'Email is required.';
    else if (!emailOk(email)) er.email = 'Invalid email format.';
    if (!password) er.password = 'Password is required.';
    setErrors(er);
    setServerError('');
    if (Object.keys(er).length) return;
    setBusy(true);
    try {
      const { token, user } = await api.login(email.trim(), password);
      onLogin(token, user);
    } catch (err) {
      setServerError(err.message);
      setBusy(false);
    }
  };

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
          <p className="text-sm text-slate-600 text-center mt-1 mb-5">Your workspace (HR or Project Manager) is chosen automatically from your account</p>
          {serverError && <div role="alert" className="mb-4 flex items-start gap-2 p-3 rounded-lg border border-red-300 bg-red-50 text-red-800 text-sm font-semibold"><Icon name="alert" className="w-5 h-5 shrink-0" /><span>{serverError}</span></div>}
          <form className="space-y-4" onSubmit={submit} noValidate>
            <div>
              <label htmlFor="email" className="block text-sm font-bold text-slate-700 mb-1">Work Email Address</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-3 flex items-center text-slate-500"><Icon name="mail" /></span>
                <input id="email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} className={`${inputCls} pl-10`} />
              </div>
              {errors.email && <p className="text-xs font-semibold text-red-700 mt-1">{errors.email}</p>}
            </div>
            <div>
              <label htmlFor="pw" className="block text-sm font-bold text-slate-700 mb-1">Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-3 flex items-center text-slate-500"><Icon name="lock" /></span>
                <input id="pw" type={show ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className={`${inputCls} pl-10 pr-11`} />
                <button type="button" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'} className="absolute inset-y-0 right-3 flex items-center text-slate-500 hover:text-slate-900 cursor-pointer">
                  <Icon name={show ? 'eyeOff' : 'eye'} className="w-5 h-5" />
                </button>
              </div>
              {errors.password && <p className="text-xs font-semibold text-red-700 mt-1">{errors.password}</p>}
            </div>
            <button type="submit" disabled={busy} className={`${btn('primary')} w-full py-3`}>{busy ? 'Signing in...' : 'Sign In'}</button>
          </form>
        </div>
      </main>
    </div>
  );
}

/* =========================================================
   SIDEBAR
   ========================================================= */
function SidebarBody({ menus, page, go, compact, user, onProfile, onLogout, onToggle, showToggle }) {
  return (
    <div className="flex flex-col h-full">
      <div className={`px-4 pt-5 pb-4 flex items-center gap-2.5 ${compact ? 'justify-center' : ''}`}>
        <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center text-white shrink-0"><Icon name="layers" className="w-5 h-5" /></div>
        {!compact && <div><div className="text-white font-extrabold tracking-wider text-sm">ALLOCALENS</div><div className="text-[11px] text-slate-400 font-bold">RESOURCE ALLOCATION</div></div>}
      </div>
      <button onClick={onProfile} title="View profile" className={`mx-3 mb-4 p-2.5 rounded-xl bg-[#1e293b] border border-slate-700 flex items-center gap-3 text-left cursor-pointer hover:bg-slate-700/60 transition ${compact ? 'justify-center' : ''}`}>
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
   PAGES — HR
   ========================================================= */
/* =========================================================
   BAGIAN BERSAMA: keputusan reassignment, notifikasi, profil
   ========================================================= */
const timeStr = (iso) => (iso ? new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—');
const IMPACT_CLS = { High: 'bg-red-50 text-red-800 border-red-300', Medium: 'bg-amber-50 text-amber-800 border-amber-300', Low: 'bg-slate-100 text-slate-700 border-slate-300' };
const impactOf = (gain) => (gain === null || gain === undefined ? 'Low' : gain >= 20 ? 'High' : gain >= 10 ? 'Medium' : 'Low');

// Faktor skor paling lemah dari assignee saat ini = pemicu utama untuk ditinjau.
const weakest = (cur) => (cur && cur.factors && cur.factors.length ? cur.factors.reduce((a, b) => (b.score < a.score ? b : a)) : null);
const factorOf = (res, name) => (res && res.factors ? res.factors.find((f) => f.factor === name) : null);

function reasonFor(item) {
  const { current: c, proposed: p, gain } = item;
  if (!p) return 'No other employee could be scored for this task.';
  if (!c || c.candidate_score === null) return `${empLabel(p.employee)} scores ${p.candidate_score}. The current assignee could not be scored.`;
  const w = weakest(c);
  const base = `${empLabel(c.employee)} scores ${c.candidate_score}${w ? ` (weakest factor: ${FACTOR_LABEL[w.factor].toLowerCase()} at ${w.score})` : ''}. ${empLabel(p.employee)} scores ${p.candidate_score}`;
  return gain > 0 ? `${base}, a gain of ${gain} points.` : `${base}, which is not higher, so keeping the current assignee is reasonable.`;
}

const EmpChip = ({ e, sub }) => (
  <div className="flex items-center gap-2 min-w-0">
    <Avatar name={empLabel(e)} size="w-8 h-8" />
    <div className="min-w-0"><div className="font-bold text-slate-900 truncate">{empCode(e.id)}</div><div className="text-xs text-slate-600 truncate">{sub}</div></div>
  </div>
);

const FactorBars = ({ factors }) => (
  <div className="space-y-2.5">
    {factors.map((f) => (
      <div key={f.factor}>
        <div className="flex justify-between gap-2 text-xs font-bold text-slate-800 mb-1"><span>{FACTOR_LABEL[f.factor]} <span className="font-semibold text-slate-500">({Math.round(f.weight * 100)}%)</span></span><span className="tabular-nums">{f.score}</span></div>
        <Bar value={f.score} />
      </div>
    ))}
  </div>
);

// Approve / Keep Current untuk satu item antrean. onDone dipanggil setelah berhasil (muat ulang data).
function useReviewActions({ askConfirm, toast, refreshAlerts }, onDone) {
  const [busy, setBusy] = useState(false);
  const run = async (fn, okMsg) => {
    setBusy(true);
    try { await fn(); toast('success', okMsg); refreshAlerts(); onDone(); } catch (err) { toast('error', err.message); } finally { setBusy(false); }
  };
  const approve = (item) => askConfirm({
    title: 'Approve reassignment?',
    body: <p><b>{taskCode(item.task.id)}</b> will move from <b>{empCode(item.current.employee.id)}</b> to <b>{empCode(item.proposed.employee.id)}</b> (score {item.proposed.candidate_score}). The change is saved to the allocation and written to the decision log.</p>,
    confirmLabel: 'Approve',
    onConfirm: () => run(() => api.reassignAllocation(item.allocation_id, item.proposed.employee.id), `${taskCode(item.task.id)} reassigned to ${empCode(item.proposed.employee.id)}.`),
  });
  const keepCurrent = (item) => askConfirm({
    title: 'Keep current assignee?',
    body: <p><b>{empCode(item.current.employee.id)}</b> stays on <b>{taskCode(item.task.id)}</b>. The item leaves the review queue and is written to the decision log.</p>,
    confirmLabel: 'Keep Current',
    onConfirm: () => run(() => api.keepAllocation(item.allocation_id), `${empCode(item.current.employee.id)} kept on ${taskCode(item.task.id)}.`),
  });
  return { approve, keepCurrent, busy };
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
              </div>
              <button className={btn('secondary', 'sm')} onClick={() => { onClose(); n.onOpen(); }}>{n.actionLabel}</button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}

function ProfileModal({ user, onClose }) {
  return (
    <Modal title="My Profile" onClose={onClose} footer={<button className={btn('secondary')} onClick={onClose}>Close</button>}>
      <div className="flex items-center gap-3 mb-4">
        <Avatar name={user.name} size="w-12 h-12" />
        <div className="min-w-0"><div className="font-extrabold text-slate-900 break-words">{user.name}</div><div className="text-xs text-slate-600">{user.roleName}</div></div>
      </div>
      <dl className="grid grid-cols-[100px_1fr] gap-y-2 text-sm">
        <dt className="font-bold text-slate-600">Email</dt><dd className="break-all">{user.email}</dd>
        <dt className="font-bold text-slate-600">Role</dt><dd>{user.roleName}</dd>
        <dt className="font-bold text-slate-600">Account ID</dt><dd>{user.id}</dd>
      </dl>
      <p className="text-xs text-slate-500 mt-4">Editing the profile is not available yet. Account details come from the Allocalens server.</p>
    </Modal>
  );
}

function ValidationBlock({ title, block }) {
  if (!block) return null;
  if (block.error) return <Card className="p-5"><h3 className="font-extrabold text-slate-900">{title}</h3><p className="text-sm font-semibold text-red-700 mt-2">{block.error}</p></Card>;
  const share = block.total ? (block.valid / block.total) * 100 : 0;
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-extrabold text-slate-900">{title}</h3>
        <Badge cls={block.invalid === 0 ? STATUS_META.optimal.cls : STATUS_META.reassign.cls} icon={block.invalid === 0 ? 'check' : 'alert'}>{block.invalid === 0 ? 'All valid' : `${fmt(block.invalid)} invalid`}</Badge>
      </div>
      <p className="text-sm text-slate-600 mt-2"><b className="text-slate-900">{fmt(block.valid)}</b> of <b className="text-slate-900">{fmt(block.total)}</b> records pass validation.</p>
      <div className="mt-3"><Bar value={share} color={block.invalid === 0 ? 'bg-emerald-600' : 'bg-amber-500'} /></div>
      {block.invalid_samples && block.invalid_samples.length > 0 && (
        <div className="mt-4 border border-slate-200 rounded-lg overflow-hidden">
          <p className="px-3 py-2 bg-slate-100 text-xs font-extrabold text-slate-700 uppercase tracking-wider">Sample of invalid records</p>
          <ul className="divide-y divide-slate-200 max-h-64 overflow-y-auto">
            {block.invalid_samples.map((s) => (
              <li key={s.id} className="px-3 py-2 text-sm"><span className="font-extrabold text-slate-900">ID {s.id}</span>
                <ul className="list-disc pl-5 text-xs text-slate-600 mt-0.5">{s.errors.map((er, i) => <li key={i}>{er.message}</li>)}</ul></li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}

function HRDashboard({ ctx }) {
  const { navigate: go } = ctx;
  const [tick, setTick] = useState(0);
  const [idx, setIdx] = useState(0);
  const [detail, setDetail] = useState(null);
  const pg = usePageState(5);
  const sum = useFetch(() => api.allocationSummary(), [tick]);
  const val = useFetch(async () => ({ ...(await api.validateDataset()), checked_at: nowStr() }), [tick]);
  const flag = useFetch(() => api.flaggedAllocations({ page: pg.page, limit: pg.pageSize }), [pg.page, pg.pageSize, tick]);
  const act = useReviewActions(ctx, () => { setIdx(0); setTick((n) => n + 1); });

  const S = sum.data;
  const counts = S ? { optimal: S.by_status.Optimal, sub: S.by_status.Suboptimal, reassign: S.by_status['Requires Reassignment'] } : null;
  const share = (k) => Math.round((counts[k] / (S.total || 1)) * 100);
  const NOTE = { optimal: 'Score meets the optimal threshold', sub: 'Score is between the two thresholds', reassign: 'Score is below the suboptimal threshold' };
  const items = flag.data ? flag.data.data : [];
  const active = items.length ? items[Math.min(idx, items.length - 1)] : null;
  const canApprove = (it) => !!it.proposed && !!it.current && (it.gain === null || it.gain > 0);
  const V = val.data;

  return (
    <>
      <PageHeader title="Executive Dashboard & Decision Support"
        desc="Allocation status across all employees, the reassignment review queue, and whether the dataset is ready for analysis."
        actions={<>
          <button className={btn('secondary')} onClick={() => setTick(tick + 1)} disabled={sum.loading || val.loading}><Icon name="bolt" />Re-run Data Validation</button>
          <button className={btn('primary')} onClick={() => go('analysis')}><Icon name="chart" />Run Allocation Analysis</button>
        </>} />
      {sum.loading && !S && <Card><Loading text="Loading allocation summary..." /></Card>}
      {sum.error && <Card><ErrorBox msg={sum.error} /></Card>}
      {S && (
        <>
          <Card className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4 md:divide-x md:divide-slate-200">
            {[
              { icon: 'clock', label: 'Last Data Validation', value: V ? V.checked_at : '—' },
              { icon: V && V.ready_for_analysis ? 'check' : 'alert', label: 'Dataset Status', value: !V ? 'Checking...' : V.ready_for_analysis ? 'Ready for analysis' : 'Not ready' },
              { icon: 'bolt', label: 'Pending Reviews', value: `${fmt(S.pending_review)} allocations` },
            ].map((x, i) => (
              <div key={x.label} className={`flex items-center gap-3 min-w-0 ${i > 0 ? 'md:pl-4' : ''}`}>
                <span className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 shrink-0"><Icon name={x.icon} className="w-5 h-5" /></span>
                <div className="min-w-0"><div className="text-xs font-extrabold text-slate-600 uppercase tracking-wider">{x.label}</div><div className="font-bold text-slate-900 break-words">{x.value}</div></div>
              </div>
            ))}
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard label="Total Allocations" value={fmt(S.total)} unit="tasks" icon="tasks" note={<p>Employee-task pairs in the system</p>} />
            <StatCard label="Optimal" value={fmt(counts.optimal)} icon="check" note={<p>{share('optimal')}% of allocations</p>} />
            <StatCard label="Suboptimal" value={fmt(counts.sub)} icon="info" note={<p>{share('sub')}% of allocations</p>} />
            <StatCard label="Requires Reassignment" value={fmt(counts.reassign)} icon="alert" note={<p>{share('reassign')}% of allocations</p>} />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 items-stretch">
            <Card className="p-5 flex flex-col xl:col-span-2">
              <h2 className="text-base font-extrabold text-slate-900">Allocation Status Distribution</h2>
              <p className="text-sm text-slate-600 mt-0.5">Current allocation status of every employee-task pair.</p>
              <div className="flex flex-wrap items-center justify-center gap-6 py-5">
                <div className="relative">
                  <Donut total={S.total} segments={['optimal', 'sub', 'reassign'].map((k) => ({ key: k, value: counts[k], hex: STATUS_META[k].hex }))} />
                  <div className="absolute inset-0 flex flex-col items-center justify-center"><span className="text-2xl font-extrabold text-slate-900 tabular-nums">{fmt(S.total)}</span><span className="text-[10px] font-extrabold text-slate-600 uppercase">Allocations</span></div>
                </div>
                <ul className="space-y-3 text-sm min-w-0">
                  {['optimal', 'sub', 'reassign'].map((k) => (
                    <li key={k} className="flex items-start gap-2">
                      <span className="w-3 h-3 rounded-full mt-1 shrink-0" style={{ background: STATUS_META[k].hex }} />
                      <div><div className="font-bold text-slate-900">{STATUS_META[k].label}: {fmt(counts[k])} ({share(k)}%)</div><div className="text-xs text-slate-600">{NOTE[k]}</div></div>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="border-t border-slate-200 pt-4 flex-1">
                <p className="text-xs font-extrabold text-slate-600 uppercase tracking-wider mb-3">By department</p>
                <div className="space-y-4">
                  {S.by_department.map((d) => (
                    <div key={d.department}>
                      <div className="flex justify-between gap-2 text-sm font-bold text-slate-800 mb-1.5"><span>{d.department}</span><span className="text-slate-600 font-semibold tabular-nums">{fmt(d.total)} allocations</span></div>
                      <StackBar total={d.total} parts={[
                        { key: 'optimal', value: d.Optimal, bar: STATUS_META.optimal.bar, label: 'Optimal' },
                        { key: 'sub', value: d.Suboptimal, bar: STATUS_META.sub.bar, label: 'Suboptimal' },
                        { key: 'reassign', value: d['Requires Reassignment'], bar: STATUS_META.reassign.bar, label: 'Requires Reassignment' },
                      ]} />
                      <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1.5 text-xs text-slate-600 tabular-nums">
                        {[['optimal', d.Optimal, 'optimal'], ['sub', d.Suboptimal, 'suboptimal'], ['reassign', d['Requires Reassignment'], 'to reassign']].map(([k, n, label]) => (
                          <span key={k} className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: STATUS_META[k].hex }} />{fmt(n)} {label}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-slate-100 border border-slate-300 rounded-xl p-3 mt-5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-start gap-2 text-sm min-w-0"><Icon name="info" className="w-5 h-5 shrink-0 mt-0.5" />
                  <span>{S.decisions_ready ? <><b>Heads-up:</b> {fmt(S.pending_review)} {S.pending_review === 1 ? 'allocation needs' : 'allocations need'} a reassignment decision.</> : <><b>Setup needed:</b> the decision log table has not been created yet.</>}</span></div>
                <button className={btn('primary', 'sm')} onClick={() => go('recommendations')}>Open Recommendations</button>
              </div>
            </Card>

            <Card id="decision-panel" className="p-5 flex flex-col xl:col-span-3">
              {flag.loading && !flag.data ? <Loading text="Scoring candidates..." /> : flag.error ? <ErrorBox msg={flag.error} /> : active ? (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <div><h2 className="text-base font-extrabold text-slate-900">Reassignment Decision Panel</h2><p className="text-sm text-slate-600 mt-0.5">Review one flagged task at a time ({fmt(flag.data.total)} pending in total).</p></div>
                    <div className="flex items-center gap-1">
                      <button aria-label="Previous" disabled={idx <= 0} onClick={() => setIdx(Math.max(0, idx - 1))} className={btn('secondary', 'sm')}><Icon name="chevL" /></button>
                      <span className="text-sm font-bold px-1 tabular-nums">{Math.min(idx, items.length - 1) + 1} / {items.length}</span>
                      <button aria-label="Next" disabled={idx >= items.length - 1} onClick={() => setIdx(Math.min(items.length - 1, idx + 1))} className={btn('secondary', 'sm')}><Icon name="chevR" /></button>
                    </div>
                  </div>
                  <div className="mt-4 pb-4 border-b border-slate-200">
                    <div className="flex flex-wrap items-center gap-2"><Badge cls="bg-slate-100 text-slate-900 border-slate-300">{taskCode(active.task.id)}</Badge><PriorityBadge p={active.task.task_priority} />
                      <Badge cls="bg-red-50 text-red-800 border-red-300" icon="alert">{weakest(active.current) ? `Weak ${FACTOR_LABEL[weakest(active.current).factor].toLowerCase()}` : 'Flagged by dataset'}</Badge></div>
                    <h3 className="text-sm font-extrabold text-slate-900 mt-2">{taskLabel(active.task)}</h3>
                    <p className="text-xs text-slate-600">{active.task.workload_hours} h • deadline in {active.task.deadline_days} days • needs {active.task.required_skill_level} skill</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-3 my-4 items-stretch">
                    {[['Current Assignee', active.current, false], ['Proposed Candidate', active.proposed, true]].map(([title, r, hi], i) => (
                      <React.Fragment key={title}>
                        {i === 1 && <div className="hidden sm:flex items-center text-slate-400"><Icon name="chevR" className="w-6 h-6" /></div>}
                        <div className={`p-3 rounded-xl text-center ${hi ? 'border-2 border-slate-900 bg-slate-100' : 'border border-slate-300 bg-slate-50'}`}>
                          <div className="text-xs font-extrabold text-slate-600 uppercase mb-2">{title}</div>
                          {r ? (
                            <>
                              <div className="flex justify-center"><Avatar name={empLabel(r.employee)} dark={hi} size="w-10 h-10" /></div>
                              <div className="font-extrabold text-slate-900 text-sm mt-1">{empLabel(r.employee)}</div>
                              <div className="text-xs text-slate-600">{r.employee.department} • {r.employee.skill_level} skill</div>
                              <div className="mt-1.5 flex justify-center">{r.candidate_score === null ? <Badge cls="bg-slate-100 text-slate-700 border-slate-300">Not scored</Badge> : <Badge cls={STATUS_META[STATUS_BY_NAME[r.status]].cls} icon={STATUS_META[STATUS_BY_NAME[r.status]].icon}>Score {r.candidate_score}</Badge>}</div>
                              <div className="text-xs font-bold text-slate-700 mt-1">{r.employee.total_workload_hours}h / {r.employee.capacity_hours}h ({r.employee.utilization_pct}%) • {r.employee.idle_time_hours}h idle</div>
                            </>
                          ) : <p className="text-sm text-slate-500 py-6">No other candidate could be scored.</p>}
                        </div>
                      </React.Fragment>
                    ))}
                  </div>
                  {active.current && active.proposed && (
                    <div className="space-y-3 text-sm">
                      <p className="text-xs font-extrabold text-slate-600 uppercase tracking-wider">Comparison (current vs proposed)</p>
                      {['skill', 'workload', 'deadline'].map((f) => {
                        const a = factorOf(active.current, f); const b = factorOf(active.proposed, f);
                        return a && b ? (
                          <div key={f}><div className="flex justify-between flex-wrap gap-x-2 text-xs font-bold text-slate-800 mb-1"><span>{FACTOR_LABEL[f]}</span><span>{a.score} vs {b.score}</span></div><Bar value={b.score} /></div>
                        ) : null;
                      })}
                    </div>
                  )}
                  <div className="bg-slate-100 border border-slate-300 rounded-lg p-3 mt-4 text-sm text-slate-700"><b className="text-slate-900 block mb-1">Recommendation Rationale</b>{reasonFor(active)}</div>
                  <div className="mt-auto pt-4 flex flex-wrap gap-2">
                    <button className={`${btn('primary')} flex-1`} disabled={!canApprove(active) || act.busy} onClick={() => act.approve(active)}><Icon name="check" />Approve Reassignment</button>
                    <button className={`${btn('secondary')} flex-1`} disabled={act.busy} onClick={() => act.keepCurrent(active)}>Keep Current</button>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
                  <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-800 flex items-center justify-center mb-3"><Icon name="check" className="w-6 h-6" /></div>
                  <h3 className="font-extrabold text-slate-900">All Reassignments Cleared</h3>
                  <p className="text-sm text-slate-600 mt-1">There are no allocations waiting for a decision.</p>
                  <button className={`${btn('secondary')} mt-4`} onClick={() => go('status')}>View Decision Log</button>
                </div>
              )}
            </Card>
          </div>

          <Card id="triage-queue" className="overflow-hidden">
            <div className="p-5"><h2 className="text-base font-extrabold text-slate-900">Reassignment Triage Queue</h2><p className="text-sm text-slate-600">Critical and High priority tasks first. Scores come from the allocation scoring engine.</p></div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm min-w-[820px]">
                <thead><tr className="bg-slate-100 border-y border-slate-200 text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                  <th className="py-3 px-4">Task</th><th className="py-3 px-4">Primary Trigger</th><th className="py-3 px-4">Current Assignee</th><th className="py-3 px-4">Proposed</th><th className="py-3 px-4">Score Gain</th><th className="py-3 px-4 text-right">Action</th></tr></thead>
                <tbody className="divide-y divide-slate-200">
                  {flag.loading && !flag.data ? <tr><td colSpan="6"><Loading /></td></tr>
                    : items.length === 0 ? <tr><td colSpan="6"><Empty>No triage items in the queue.</Empty></td></tr>
                    : items.map((it) => (
                      <tr key={it.allocation_id} className="hover:bg-slate-50">
                        <td className="py-3 px-4"><div className="font-extrabold text-slate-900">{taskCode(it.task.id)}</div><div className="flex items-center gap-2 mt-0.5"><PriorityBadge p={it.task.task_priority} /></div></td>
                        <td className="py-3 px-4"><Badge cls="bg-red-50 text-red-800 border-red-300" icon="alert">{weakest(it.current) ? `Weak ${FACTOR_LABEL[weakest(it.current).factor].toLowerCase()}` : 'Flagged by dataset'}</Badge></td>
                        <td className="py-3 px-4">{it.current ? <EmpChip e={it.current.employee} sub={it.current.candidate_score === null ? 'Not scored' : `Score ${it.current.candidate_score}`} /> : '—'}</td>
                        <td className="py-3 px-4">{it.proposed ? <EmpChip e={it.proposed.employee} sub={`Score ${it.proposed.candidate_score}`} /> : '—'}</td>
                        <td className="py-3 px-4">{it.gain === null ? '—' : <Badge cls={it.gain > 0 ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-100 text-slate-700 border-slate-300'}>{it.gain > 0 ? '+' : ''}{it.gain}</Badge>}</td>
                        <td className="py-3 px-4 text-right"><div className="inline-flex gap-2"><button className={btn('primary', 'sm')} disabled={!canApprove(it) || act.busy} onClick={() => act.approve(it)}>Approve</button><button className={btn('secondary', 'sm')} onClick={() => setDetail(it)}>Details</button></div></td>
                      </tr>))}
                </tbody>
              </table>
            </div>
            {flag.data && <Pager page={pg.page} setPage={(n) => { pg.setPage(n); setIdx(0); }} total={flag.data.total} pageSize={pg.pageSize} setPageSize={pg.setPageSize} label="flagged allocations" sizes={[5, 10, 20]} />}
          </Card>

          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3"><h2 className="text-base font-extrabold text-slate-900">Dataset Validation</h2>{val.loading && <span className="text-xs font-semibold text-slate-500">Validating dataset...</span>}</div>
            {val.error && <Card><ErrorBox msg={val.error} /></Card>}
            {V && (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <ValidationBlock title="Employees data" block={V.employees} />
                <ValidationBlock title="Tasks data" block={V.tasks} />
              </div>
            )}
          </div>
        </>
      )}

      {detail && (
        <Modal size="lg" title={`${taskCode(detail.task.id)} — ${taskLabel(detail.task)}`} onClose={() => setDetail(null)} footer={<>
          <button className={btn('secondary')} onClick={() => setDetail(null)}>Close</button>
          <button className={btn('primary')} disabled={!canApprove(detail) || act.busy} onClick={() => { const d = detail; setDetail(null); act.approve(d); }}>Approve Reassignment</button></>}>
          <div className="bg-slate-100 border border-slate-300 rounded-xl p-3 mb-4"><div className="text-xs font-extrabold text-slate-600 uppercase mb-1">Triage analysis</div><p>{reasonFor(detail)}</p></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            {[['Current assignee', detail.current, false], ['Recommended candidate', detail.proposed, true]].map(([title, r, hi]) => (
              <div key={title} className={`p-3 rounded-xl ${hi ? 'border-2 border-slate-900 bg-slate-50' : 'border border-slate-300'}`}>
                <div className="text-xs font-bold text-slate-500 uppercase">{title}</div>
                {r ? (
                  <>
                    <div className="font-extrabold text-slate-900">{empLabel(r.employee)}</div>
                    <div>Score: {r.candidate_score === null ? 'not scored' : r.candidate_score} • Workload: {r.employee.total_workload_hours}h ({r.employee.utilization_pct}%)</div>
                    <button className="text-xs font-bold underline mt-2 cursor-pointer" onClick={() => { setDetail(null); go(`employees/${r.employee.id}`); }}>View {empCode(r.employee.id)} profile →</button>
                  </>
                ) : <div className="text-slate-500">None</div>}
              </div>
            ))}
          </div>
        </Modal>
      )}
    </>
  );
}

function EmployeesPage({ ctx }) {
  const { navigate: go } = ctx;
  const [q, setQ] = useState('');
  const [dept, setDept] = useState('all');
  const [level, setLevel] = useState('all');
  const dq = useDebounced(q);
  const pg = usePageState(10);
  const res = useFetch(() => api.listEmployees({
    page: pg.page, limit: pg.pageSize, search: dq.trim(),
    department: dept === 'all' ? '' : dept, level: level === 'all' ? '' : level,
  }), [pg.page, pg.pageSize, dq, dept, level]);
  const rows = res.data ? res.data.data : [];
  return (
    <>
      <PageHeader title="Employees" desc="List of employees with their workload and status. Workload is the total hours of tasks allocated to the employee compared with their capacity. Click a row or 'View' to see details." />
      <Card className="overflow-hidden">
        <div className="p-4 flex flex-wrap items-center gap-3 border-b border-slate-200 bg-slate-50">
          <div className="relative flex-1 min-w-[200px]"><span className="absolute inset-y-0 left-2.5 flex items-center text-slate-500"><Icon name="search" /></span>
            <input value={q} onChange={(e) => { setQ(e.target.value); pg.setPage(1); }} placeholder="Search ID, department, skill..." className={`${inputCls} pl-9`} /></div>
          <select value={dept} onChange={(e) => { setDept(e.target.value); pg.setPage(1); }} className={`${inputBase} w-auto`} aria-label="Filter by department"><option value="all">All departments</option>{DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}</select>
          <select value={level} onChange={(e) => { setLevel(e.target.value); pg.setPage(1); }} className={`${inputBase} w-auto`} aria-label="Filter by status"><option value="all">All statuses</option><option value="balanced">{WL_LABEL.optimal}</option><option value="under">{WL_LABEL.sub}</option><option value="over">{WL_LABEL.reassign}</option></select>
        </div>
        {res.error && <ErrorBox msg={res.error} />}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[720px]">
            <thead><tr className="bg-slate-100 border-b border-slate-200 text-xs font-extrabold text-slate-700 uppercase tracking-wider"><th className="py-3 px-4">Employee</th><th className="py-3 px-4">Department & Profile</th><th className="py-3 px-4">Workload</th><th className="py-3 px-4">Status</th><th className="py-3 px-4 text-right">Action</th></tr></thead>
            <tbody className="divide-y divide-slate-200">
              {res.loading ? <tr><td colSpan="5"><Loading /></td></tr>
                : rows.length === 0 ? <tr><td colSpan="5"><Empty>No employees match your search.</Empty></td></tr>
                : rows.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => go(`employees/${e.id}`)}>
                    <td className="py-3 px-4"><div className="flex items-center gap-3"><Avatar name={empLabel(e)} /><div className="min-w-0"><div className="font-extrabold text-slate-900">{e.name || empCode(e.id)}</div>{e.name && <div className="text-xs text-slate-500 font-mono">{empCode(e.id)}</div>}</div></div></td>
                    <td className="py-3 px-4"><div className="font-semibold text-slate-900">{e.department}</div><div className="text-xs text-slate-600">{e.skill_level} skill • {e.performance_rating} • {e.experience_years} yrs exp.</div></td>
                    <td className="py-3 px-4 w-52"><div className="text-xs font-bold text-slate-800 mb-1">{e.total_workload_hours}h / {e.capacity_hours}h ({e.utilization_pct}%)</div><LevelBar pct={e.utilization_pct} /><div className="text-[11px] text-slate-500 mt-1">{e.task_count} {e.task_count === 1 ? 'task' : 'tasks'}</div></td>
                    <td className="py-3 px-4"><WorkloadBadge pct={e.utilization_pct} /></td>
                    <td className="py-3 px-4 text-right"><button className={btn('secondary', 'sm')} onClick={(ev) => { ev.stopPropagation(); go(`employees/${e.id}`); }}>View</button></td>
                  </tr>))}
            </tbody>
          </table>
        </div>
        {res.data && <Pager page={pg.page} setPage={pg.setPage} total={res.data.total} pageSize={pg.pageSize} setPageSize={pg.setPageSize} label="employees" />}
      </Card>
    </>
  );
}

function EmployeeDetail({ ctx, id }) {
  const { navigate: go } = ctx;
  const res = useFetch(() => api.getEmployee(id), [id]);
  const back = <button className={btn('secondary')} onClick={() => go('employees')}><Icon name="chevL" />Back to Employees</button>;
  if (res.loading) return <Card><Loading /></Card>;
  if (res.error) return (<><PageHeader title="Employee not found" actions={back} /><Card><ErrorBox msg={res.error} /></Card></>);
  const e = res.data;
  const k = workloadKey(e.utilization_pct);
  const headroom = e.capacity_hours - e.total_workload_hours;
  const scores = [['Technical skill', e.technical_skill_score], ['Communication', e.communication_score], ['Leadership', e.leadership_score], ['Problem solving', e.problem_solving_score]];
  const rates = [['Attendance rate', e.attendance_rate], ['Previous task success rate', e.previous_task_success_rate], ['Conflict rate', e.conflict_rate]];
  return (
    <>
      <Card className="p-5 flex flex-wrap items-center justify-between gap-5">
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-16 h-16 rounded-2xl bg-slate-900 text-white font-extrabold text-xl flex items-center justify-center shrink-0">{initials(empLabel(e))}</div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2"><h1 className="text-xl md:text-2xl font-extrabold text-slate-900">{empLabel(e)}</h1><Badge cls="bg-slate-100 text-slate-800 border-slate-300">{empCode(e.id)}</Badge></div>
            <p className="text-sm font-bold text-slate-800 mt-0.5">{e.department} • {e.education_level}</p>
            <p className="text-xs text-slate-600 mt-1">{e.age} years old • {e.experience_years} yrs experience</p>
          </div>
        </div>
        <div className="flex flex-col items-start gap-1"><span className="text-xs font-extrabold text-slate-600 uppercase">Workload level</span><WorkloadBadge pct={e.utilization_pct} /></div>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Skill Level" value={e.skill_level} icon="chart" note={<p>Overall skill category</p>} />
        <StatCard label="Performance" value={e.performance_rating} icon="check" note={<p>Current rating</p>} />
        <StatCard label="Workload" value={e.total_workload_hours} unit={`/ ${e.capacity_hours} h (${e.utilization_pct}%)`} icon="clock" note={<><LevelBar pct={e.utilization_pct} /><p>{headroom >= 0 ? `${r1(headroom)} h headroom available` : `Over capacity by ${r1(-headroom)} h`}</p></>} />
        <StatCard label="Allocated Tasks" value={e.task_count} unit={e.task_count === 1 ? 'task' : 'tasks'} icon="tasks" note={<p>{WL_RANGE[k]}</p>} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card className="p-5">
          <h2 className="text-base font-extrabold text-slate-900">Competency Scores</h2>
          <p className="text-sm text-slate-600 mb-4">Score per competency (0–100).</p>
          <div className="space-y-3">{scores.map(([label, val]) => (
            <div key={label}><div className="flex justify-between text-sm font-bold text-slate-900 mb-1"><span>{label}</span><span>{val}</span></div><Bar value={val} /></div>))}</div>
        </Card>
        <Card className="p-5">
          <h2 className="text-base font-extrabold text-slate-900">Work Profile</h2>
          <p className="text-sm text-slate-600 mb-4">Reliability and availability indicators.</p>
          <div className="space-y-3">{rates.map(([label, val]) => (
            <div key={label}><div className="flex justify-between text-sm font-bold text-slate-900 mb-1"><span>{label}</span><span>{val}%</span></div><Bar value={val} color={label === 'Conflict rate' ? 'bg-amber-500' : 'bg-slate-800'} /></div>))}</div>
          <div className="mt-4 pt-4 border-t border-slate-200 text-sm flex justify-between gap-2"><span className="font-bold text-slate-800">Idle time</span><span className="font-extrabold text-slate-900">{e.idle_time_hours} h</span></div>
        </Card>
      </div>
      <div>{back}</div>
    </>
  );
}

const LEVEL_KEY = { under: 'sub', balanced: 'optimal', over: 'reassign' };

function AnalysisPage({ ctx }) {
  const { navigate: go } = ctx;
  const ov = useFetch(() => api.workloadOverview(), []);
  const O = ov.data;
  const [allocId, setAllocId] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const valid = /^\d+$/.test(allocId) && Number(allocId) >= 1;
  const run = async (mode) => {
    if (!valid) { setError('Allocation ID must be a positive whole number.'); return; }
    setBusy(mode); setError('');
    try {
      const out = mode === 'run' ? (await api.runAnalysis(Number(allocId))).analysis : await api.getAnalysis(Number(allocId));
      setResult(out);
    } catch (err) {
      setResult(null); setError(err.message);
    } finally { setBusy(''); }
  };

  const key = result ? STATUS_BY_NAME[result.status] : null;
  return (
    <>
      <PageHeader title="Allocation Analysis" desc="Workload and capacity risk across departments, based on current employee data. Use the form further down to score one allocation." />
      {ov.loading && <Card><Loading text="Calculating workload..." /></Card>}
      {ov.error && <Card><ErrorBox msg={ov.error} /></Card>}
      {O && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard label="Overloaded Staff" value={O.overloaded.pct} unit="%" icon="alert" note={<p>{fmt(O.overloaded.count)} of {fmt(O.total_employees)} employees are above {O.thresholds.over}% of capacity</p>} />
            <StatCard label="Average Workload" value={O.average_utilization_pct} unit="%" icon="chart" note={<p>Average against a capacity of {O.capacity_hours} h</p>} />
            <StatCard label="Unused Capacity" value={fmt(O.under_used.unused_hours)} unit="h" icon="clock" note={<p>{fmt(O.under_used.count)} under-used employees (below {O.thresholds.under}%) could take on more work</p>} />
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <Card className="p-5">
              <h2 className="text-base font-extrabold text-slate-900 mb-4">Workload by Department</h2>
              <div className="space-y-4">
                {O.by_department.map((d) => (
                  <div key={d.department}>
                    <div className="flex justify-between flex-wrap gap-2 text-sm font-bold text-slate-800 mb-1"><span>{d.department} ({fmt(d.employees)} people)</span><span>{d.avg_utilization_pct}% • {WL_LABEL[LEVEL_KEY[d.level]]}</span></div>
                    <LevelBar pct={d.avg_utilization_pct} />
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-3">The black line marks 100% capacity ({O.capacity_hours} hours).</p>
            </Card>
            <Card className="p-5">
              <h2 className="text-base font-extrabold text-slate-900 mb-4">Top 10 Highest Workloads</h2>
              <div className="space-y-3">
                {O.top_workloads.map((t) => (
                  <button key={t.id} className="block w-full text-left cursor-pointer group" onClick={() => go(`employees/${t.id}`)} title={`View ${empCode(t.id)}`}>
                    <div className="flex justify-between gap-2 text-sm font-bold text-slate-800 mb-1"><span className="truncate group-hover:underline">{empCode(t.id)} • {t.department}</span><span className="shrink-0">{t.hours}h ({t.utilization_pct}%)</span></div>
                    <LevelBar pct={t.utilization_pct} />
                  </button>
                ))}
              </div>
            </Card>
          </div>
        </>
      )}
      <Card className="p-5">
        <h2 className="text-base font-extrabold text-slate-900">Score One Allocation</h2>
        <p className="text-sm text-slate-600 mt-0.5 mb-4">Score how well an employee fits a task (skill, workload and deadline) and see the resulting allocation status.</p>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[220px] flex-1 max-w-xs">
            <label htmlFor="alloc" className="block text-sm font-bold mb-1">Allocation ID</label>
            <input id="alloc" inputMode="numeric" className={inputCls} value={allocId} placeholder="e.g. 1" onChange={(e) => setAllocId(e.target.value.trim())} onKeyDown={(e) => e.key === 'Enter' && run('run')} />
          </div>
          <button className={btn('primary')} disabled={!!busy} onClick={() => run('run')}><Icon name="bolt" />{busy === 'run' ? 'Running...' : 'Run Analysis'}</button>
          <button className={btn('secondary')} disabled={!!busy} onClick={() => run('latest')}>{busy === 'latest' ? 'Loading...' : 'View Latest Result'}</button>
        </div>
        <p className="text-xs text-slate-500 mt-2">Each allocation links one employee to one task. In the imported dataset the allocation ID follows the same running number as the employee and task.</p>
      </Card>
      {error && <Card><ErrorBox msg={error} /></Card>}
      {result && (
        <Card className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-xs font-extrabold text-slate-600 uppercase tracking-wider">Candidate score • Allocation #{result.allocation_id}</div>
              <div className="mt-1 text-4xl font-extrabold text-slate-900 tabular-nums">{result.candidate_score}<span className="text-lg text-slate-500"> / 100</span></div>
            </div>
            <div className="flex flex-col items-start gap-1">
              <span className="text-xs font-extrabold text-slate-600 uppercase">Allocation status</span>
              {key ? <StatusBadge s={key} /> : <Badge cls="bg-slate-100 text-slate-800 border-slate-300">{result.status}</Badge>}
              {result.thresholds && <span className="text-xs text-slate-600">Optimal ≥ {result.thresholds.optimal} • Suboptimal ≥ {result.thresholds.suboptimal}</span>}
            </div>
          </div>
          <div className="mt-5 space-y-4">
            {(result.factors || []).map((f) => (
              <div key={f.factor} className="border border-slate-200 rounded-xl p-4">
                <div className="flex flex-wrap justify-between gap-2 text-sm font-bold text-slate-900 mb-1.5">
                  <span>{FACTOR_LABEL[f.factor] || f.factor} <span className="font-semibold text-slate-500">(weight {Math.round(f.weight * 100)}%)</span></span>
                  <span className="tabular-nums">{f.score} <span className="font-semibold text-slate-500">→ contributes {f.contribution}</span></span>
                </div>
                <Bar value={f.score} />
                <p className="text-xs text-slate-600 mt-1.5">{f.detail}</p>
              </div>
            ))}
          </div>
          {result.created_at && <p className="text-xs text-slate-500 mt-4">Calculated {new Date(result.created_at).toLocaleString('en-GB')}</p>}
        </Card>
      )}
    </>
  );
}

/* =========================================================
   PAGES — TASKS (HR read-only, PM can add and edit)
   ========================================================= */
const EMPTY_TASK = { task_name: '', description: '', task_complexity: 'Medium', required_skill_level: 'Medium', task_priority: 'Medium', deadline_days: 14, workload_hours: 8, team_size: 1 };
const NUM_RULES = [['deadline_days', 'Deadline (days)', 1, 365], ['workload_hours', 'Workload (hours)', 1, 168], ['team_size', 'Team size', 1, 100]];

/* =========================================================
   PAGES — HR: Allocation Status, Recommendations, Compare
   ========================================================= */
const DecisionBadge = ({ d }) => (d === 'Reassigned'
  ? <Badge cls="bg-emerald-50 text-emerald-800 border-emerald-300" icon="check">Reassigned</Badge>
  : <Badge cls="bg-slate-100 text-slate-700 border-slate-300" icon="info">Kept</Badge>);

function DecisionTable({ rows }) {
  return (
    <div className="overflow-x-auto"><table className="w-full text-left text-sm min-w-[720px]">
      <thead><tr className="bg-slate-100 border-y border-slate-200 text-xs font-extrabold text-slate-700 uppercase"><th className="py-3 px-4">Time</th><th className="py-3 px-4">Task</th><th className="py-3 px-4">Decision</th><th className="py-3 px-4">From → To</th><th className="py-3 px-4">Score</th><th className="py-3 px-4">By</th></tr></thead>
      <tbody className="divide-y divide-slate-200">{rows.length === 0 ? <tr><td colSpan="6"><Empty>No decisions yet. Approving or keeping an assignee from the review queue will be logged here.</Empty></td></tr> : rows.map((h) => (
        <tr key={h.id}>
          <td className="py-3 px-4 whitespace-nowrap">{timeStr(h.created_at)}</td>
          <td className="py-3 px-4 font-bold">{taskCode(h.task_id)}</td>
          <td className="py-3 px-4"><DecisionBadge d={h.decision} /></td>
          <td className="py-3 px-4 whitespace-nowrap">{h.from_employee_id ? empCode(h.from_employee_id) : '—'} → {h.to_employee_id ? empCode(h.to_employee_id) : '—'}</td>
          <td className="py-3 px-4 tabular-nums">{h.from_score === null ? '—' : h.from_score}{h.to_score !== null && ` → ${h.to_score}`}</td>
          <td className="py-3 px-4">{h.decided_by_name || '—'}</td>
        </tr>))}</tbody></table></div>
  );
}

function StatusPage({ ctx }) {
  const { navigate: go } = ctx;
  const sum = useFetch(() => api.allocationSummary(), []);
  const pg = usePageState(5);
  const log = useFetch(() => api.allocationDecisions({ page: pg.page, limit: pg.pageSize }), [pg.page, pg.pageSize]);
  const S = sum.data;
  const NOTE = { optimal: 'Score meets the optimal threshold', sub: 'Score is between the two thresholds', reassign: 'Score is below the suboptimal threshold' };
  const KEY = { optimal: 'Optimal', sub: 'Suboptimal', reassign: 'Requires Reassignment' };
  return (
    <>
      <PageHeader title="Allocation Status Monitor" desc="Current allocation status of all employee-task pairs and the history of reassignment decisions." />
      {sum.loading && <Card><Loading /></Card>}
      {sum.error && <Card><ErrorBox msg={sum.error} /></Card>}
      {S && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {['optimal', 'sub', 'reassign'].map((k) => {
              const n = S.by_status[KEY[k]];
              const share = Math.round((n / (S.total || 1)) * 100);
              return (
                <Card key={k} className="p-5 flex flex-col">
                  <div className="flex flex-wrap items-center justify-between gap-2"><StatusBadge s={k} /><span className="text-xs font-bold text-slate-600">{share}% of allocations</span></div>
                  <div className="mt-3 text-3xl xl:text-4xl font-extrabold text-slate-900 tabular-nums break-all leading-tight">{fmt(n)}</div>
                  <div className="text-sm text-slate-600">of {fmt(S.total)} allocations</div>
                  <div className="mt-3"><Bar value={share} color={STATUS_META[k].bar} /></div>
                  <p className="text-xs text-slate-500 mt-2">{NOTE[k]}</p>
                </Card>
              );
            })}
          </div>
          <Card className="overflow-hidden">
            <div className="p-5 pb-3"><h2 className="text-base font-extrabold text-slate-900">Status by Department</h2></div>
            <div className="overflow-x-auto"><table className="w-full text-left text-sm min-w-[520px]">
              <thead><tr className="bg-slate-100 border-y border-slate-200 text-xs font-extrabold text-slate-700 uppercase"><th className="py-3 px-4">Department</th><th className="py-3 px-4">Total</th><th className="py-3 px-4">Optimal</th><th className="py-3 px-4">Suboptimal</th><th className="py-3 px-4">Requires Reassignment</th></tr></thead>
              <tbody className="divide-y divide-slate-200">{S.by_department.map((d) => (
                <tr key={d.department}><td className="py-3 px-4 font-bold">{d.department}</td><td className="py-3 px-4 tabular-nums">{fmt(d.total)}</td><td className="py-3 px-4 tabular-nums">{fmt(d.Optimal)}</td><td className="py-3 px-4 tabular-nums">{fmt(d.Suboptimal)}</td><td className="py-3 px-4 font-bold tabular-nums">{fmt(d['Requires Reassignment'])}</td></tr>))}</tbody></table></div>
          </Card>
        </>
      )}
      <Card className="overflow-hidden">
        <div className="p-5 pb-3 flex flex-wrap items-center justify-between gap-2"><h2 className="text-base font-extrabold text-slate-900">Decision Log</h2><button className={btn('secondary', 'sm')} onClick={() => go('recommendations')}>Open Review Queue</button></div>
        {log.error && <ErrorBox msg={log.error} />}
        {log.loading && !log.data ? <Loading /> : log.data && <DecisionTable rows={log.data.data} />}
        {log.data && <Pager page={pg.page} setPage={pg.setPage} total={log.data.total} pageSize={pg.pageSize} setPageSize={pg.setPageSize} label="decisions" />}
      </Card>
    </>
  );
}

function RecommendationsPage({ ctx }) {
  const { navigate: go, setCmp } = ctx;
  const [tab, setTab] = useState('Pending');
  const [tick, setTick] = useState(0);
  const pg = usePageState(5);
  const counts = useFetch(async () => {
    const zero = { total: 0 };
    const [s, a, k] = await Promise.all([
      api.allocationSummary(),
      api.allocationDecisions({ decision: 'Reassigned', limit: 1 }).catch(() => zero),
      api.allocationDecisions({ decision: 'Kept', limit: 1 }).catch(() => zero),
    ]);
    return { Pending: s.pending_review, Accepted: a.total, Kept: k.total };
  }, [tick]);
  const list = useFetch(() => (tab === 'Pending'
    ? api.flaggedAllocations({ page: pg.page, limit: pg.pageSize })
    : api.allocationDecisions({ decision: tab === 'Accepted' ? 'Reassigned' : 'Kept', page: pg.page, limit: pg.pageSize })),
  [tab, pg.page, pg.pageSize, tick]);
  const act = useReviewActions(ctx, () => setTick((n) => n + 1));
  const openCompare = (it) => { setCmp({ taskId: String(it.task.id), ids: [it.current.employee.id, it.proposed.employee.id] }); go('compare'); };
  const rows = list.data ? list.data.data : [];
  const hi = 'font-extrabold text-slate-900';

  return (
    <>
      <PageHeader title="Recommendations" desc="Suggested reassignments for allocations flagged as Requires Reassignment. Each suggestion compares the current assignee with the best-scoring candidate. Nothing is applied until HR accepts it." />
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter recommendations">{['Pending', 'Accepted', 'Kept'].map((f) => (
        <button key={f} onClick={() => { setTab(f); pg.setPage(1); }} aria-pressed={tab === f} className={btn(tab === f ? 'primary' : 'secondary', 'sm')}>{f} ({counts.data ? fmt(counts.data[f]) : '—'})</button>))}</div>
      {list.error && <Card><ErrorBox msg={list.error} /></Card>}
      {list.loading && !list.data && <Card><Loading text={tab === 'Pending' ? 'Scoring candidates...' : 'Loading...'} /></Card>}

      {list.data && tab !== 'Pending' && <Card className="overflow-hidden"><DecisionTable rows={rows} /></Card>}

      {list.data && tab === 'Pending' && (
        <div className="space-y-4">
          {rows.length === 0 ? <Card><Empty>No pending recommendations. All flagged allocations have been decided.</Empty></Card> : rows.map((it) => {
            const c = it.current; const p = it.proposed;
            const impact = impactOf(it.gain);
            const canApprove = !!p && !!c && (it.gain === null || it.gain > 0);
            return (
              <Card key={it.allocation_id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1 basis-72">
                    <div className="flex flex-wrap items-center gap-2"><Badge cls={IMPACT_CLS[impact]}>{impact.toUpperCase()} IMPACT</Badge><Badge cls="bg-slate-100 text-slate-800 border-slate-300">Reassignment</Badge><PriorityBadge p={it.task.task_priority} /></div>
                    <h3 className="text-sm font-extrabold text-slate-900 mt-2">{p && c ? `Reassign ${taskCode(it.task.id)} from ${empCode(c.employee.id)} to ${empCode(p.employee.id)}` : `${taskCode(it.task.id)}: no alternative candidate found`}</h3>
                    <p className="text-sm text-slate-600 mt-1">{taskLabel(it.task)} • {it.task.workload_hours} h • deadline in {it.task.deadline_days} days • needs {it.task.required_skill_level} skill</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {p && c && <button className={btn('secondary')} onClick={() => openCompare(it)}><Icon name="compare" />Compare in detail</button>}
                    <button className={btn('secondary')} disabled={act.busy} onClick={() => act.keepCurrent(it)}>Keep Current</button>
                    <button className={btn('primary')} disabled={!canApprove || act.busy} onClick={() => act.approve(it)}><Icon name="check" />Accept</button>
                  </div>
                </div>
                {p && c && (
                  <>
                    <div className="mt-4 overflow-x-auto border border-slate-200 rounded-lg">
                      <table className="w-full text-left text-sm min-w-[480px]">
                        <thead><tr className="bg-slate-100 border-b border-slate-200 text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                          <th className="py-2 px-3 w-44">Compared</th>
                          <th className="py-2 px-3"><span className="block normal-case font-semibold text-slate-500">Current assignee</span>{empCode(c.employee.id)}</th>
                          <th className="py-2 px-3 bg-slate-200/60"><span className="block normal-case font-semibold text-slate-500">Recommended</span>{empCode(p.employee.id)}</th></tr></thead>
                        <tbody className="divide-y divide-slate-200">
                          <tr><td className="py-2 px-3 font-bold">Candidate score</td><td className={`py-2 px-3 ${c.candidate_score !== null && c.candidate_score > p.candidate_score ? hi : ''}`}>{c.candidate_score === null ? 'not scored' : c.candidate_score}</td><td className={`py-2 px-3 bg-slate-50 ${c.candidate_score === null || p.candidate_score >= c.candidate_score ? hi : ''}`}>{p.candidate_score}</td></tr>
                          {['skill', 'workload', 'deadline'].map((f) => {
                            const a = factorOf(c, f); const b = factorOf(p, f);
                            return (<tr key={f}><td className="py-2 px-3 font-bold">{FACTOR_LABEL[f]}</td>
                              <td className={`py-2 px-3 ${a && b && a.score > b.score ? hi : ''}`}>{a ? a.score : '—'}</td>
                              <td className={`py-2 px-3 bg-slate-50 ${a && b && b.score >= a.score ? hi : ''}`}>{b ? b.score : '—'}</td></tr>);
                          })}
                          <tr><td className="py-2 px-3 font-bold">Idle time available</td><td className="py-2 px-3">{c.employee.idle_time_hours} h</td><td className="py-2 px-3 bg-slate-50">{p.employee.idle_time_hours} h</td></tr>
                          <tr><td className="py-2 px-3 font-bold">Current workload</td><td className="py-2 px-3">{c.employee.total_workload_hours}h ({c.employee.utilization_pct}%)</td><td className="py-2 px-3 bg-slate-50">{p.employee.total_workload_hours}h ({p.employee.utilization_pct}%)</td></tr>
                        </tbody>
                      </table>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">{reasonFor(it)} Bold = better value.</p>
                  </>
                )}
              </Card>
            );
          })}
        </div>
      )}
      {list.data && <Card className="overflow-hidden"><Pager page={pg.page} setPage={pg.setPage} total={list.data.total} pageSize={pg.pageSize} setPageSize={pg.setPageSize} label={tab === 'Pending' ? 'recommendations' : 'decisions'} sizes={tab === 'Pending' ? [5, 10, 20] : undefined} /></Card>}
    </>
  );
}

function ComparePage({ ctx }) {
  const { cmp, setCmp, navigate: go } = ctx;
  const taskId = cmp.taskId; const ids = cmp.ids;
  const [tq, setTq] = useState('');
  const dtq = useDebounced(tq.trim());
  const found = useFetch(() => (dtq ? api.listTasks({ search: dtq, limit: 6 }) : Promise.resolve({ data: [] })), [dtq]);
  const quick = useFetch(() => api.flaggedAllocations({ limit: 5 }).catch(() => ({ data: [] })), []);
  const top = useFetch(() => (taskId ? api.taskCandidates(taskId, 10) : Promise.resolve(null)), [taskId]);
  const res = useFetch(() => (taskId && ids.length >= 2 ? api.compareCandidates(taskId, ids) : Promise.resolve(null)), [taskId, ids.join(',')]);

  // Pilihan dropdown: 10 kandidat terbaik untuk task ini + employee yang sudah dipilih dari tempat lain.
  const options = (() => {
    const m = new Map();
    (top.data ? top.data.candidates : []).forEach((c) => m.set(c.employee.id, `${empCode(c.employee.id)} (${c.employee.department}) • score ${c.candidate_score}`));
    ids.forEach((id) => { if (!m.has(id)) m.set(id, empCode(id)); });
    return [...m.entries()];
  })();
  const slots = [0, 1, 2].map((i) => (ids[i] !== undefined ? ids[i] : ''));
  const setSlot = (i, v) => {
    const next = [...slots];
    next[i] = v === '' ? '' : Number(v);
    setCmp({ taskId, ids: next.filter((x) => x !== '') });
  };
  const setTask = (id) => { setCmp({ taskId: String(id), ids: [] }); setTq(''); };
  const useTop = () => { if (top.data) setCmp({ taskId, ids: top.data.candidates.slice(0, 3).map((c) => c.employee.id) }); };

  const results = res.data ? res.data.results : [];
  const best = results.length ? Math.max(...results.map((r) => r.candidate_score)) : 0;
  const maxOf = (fn) => Math.max(...results.map(fn));
  const rowCls = (v, m) => (v === m ? 'font-extrabold text-slate-900' : '');

  return (
    <>
      <PageHeader title="Compare Candidates" desc="Compare 2–3 candidates for one task by fit score, scoring factors and current workload." />
      <Card className="p-5 space-y-4">
        <div>
          <label className="block text-sm font-bold mb-1">Task</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-2.5 flex items-center text-slate-500"><Icon name="search" /></span>
            <input value={tq} onChange={(e) => setTq(e.target.value)} placeholder="Search task name or ID..." className={`${inputCls} pl-9`} />
            {tq.trim() && (
              <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-slate-300 rounded-xl shadow-xl z-20 overflow-hidden">
                {found.loading || tq.trim() !== dtq ? <div className="px-4 py-3 text-sm text-slate-500">Searching...</div>
                  : found.data && found.data.data.length === 0 ? <div className="px-4 py-3 text-sm text-slate-500">No tasks found.</div>
                  : found.data && found.data.data.map((t) => (
                    <button key={t.id} onClick={() => setTask(t.id)} className="w-full text-left px-4 py-2.5 hover:bg-slate-100 cursor-pointer"><div className="text-sm font-bold text-slate-900 truncate">{taskCode(t.id)} {taskLabel(t)}</div><div className="text-xs text-slate-600">{t.task_priority} • {t.workload_hours} h • needs {t.required_skill_level}</div></button>))}
              </div>
            )}
          </div>
          <p className="text-xs text-slate-600 mt-1.5">{taskId ? <>Selected task: <b className="text-slate-900">{taskCode(taskId)}</b></> : 'Search for a task, then choose the candidates to compare.'}</p>
        </div>
        {[0, 1, 2].map((i) => (
          <div key={i}>
            <label htmlFor={`cand-${i}`} className="block text-sm font-bold mb-1">Candidate {i + 1}{i === 2 ? ' (optional)' : ''}</label>
            <select id={`cand-${i}`} className={inputCls} value={slots[i]} disabled={!taskId} onChange={(e) => setSlot(i, e.target.value)}>
              <option value="">{taskId ? (top.loading ? 'Loading candidates...' : '— Select —') : 'Select a task first'}</option>
              {options.map(([id, label]) => <option key={id} value={id} disabled={ids.includes(id) && slots[i] !== id}>{label}</option>)}
            </select>
          </div>
        ))}
        <div className="flex flex-wrap items-center gap-3">
          <button className={btn('secondary')} disabled={!top.data} onClick={useTop}><Icon name="bolt" />Use top 3 candidates</button>
          <span className="text-xs text-slate-500">The dropdowns list the 10 best-scoring candidates for the selected task.</span>
        </div>
      </Card>
      {quick.data && quick.data.data.length > 0 && (
        <Card className="p-4">
          <p className="text-xs font-extrabold text-slate-600 uppercase tracking-wider mb-2">Quick load from pending recommendations</p>
          <div className="flex flex-wrap gap-2">
            {quick.data.data.filter((it) => it.current && it.proposed).map((it) => {
              const on = taskId === String(it.task.id) && ids.includes(it.current.employee.id) && ids.includes(it.proposed.employee.id);
              return (
                <button key={it.allocation_id} aria-pressed={on} className={btn(on ? 'primary' : 'secondary', 'sm')}
                  onClick={() => setCmp({ taskId: String(it.task.id), ids: [it.current.employee.id, it.proposed.employee.id] })}>
                  {taskCode(it.task.id)}: {empCode(it.current.employee.id)} vs {empCode(it.proposed.employee.id)}
                </button>);
            })}
          </div>
        </Card>
      )}
      {res.data && res.data.task && (
        <Card className="p-5"><div className="text-sm"><b className="text-slate-900">{taskCode(res.data.task.id)} {taskLabel(res.data.task)}</b> • {res.data.task.task_priority} priority • {res.data.task.workload_hours} h • deadline in {res.data.task.deadline_days} days • needs {res.data.task.required_skill_level} skill</div></Card>
      )}
      {res.error && <Card><ErrorBox msg={res.error} /></Card>}
      {res.loading && <Card><Loading text="Comparing candidates..." /></Card>}
      {!res.loading && !res.error && (!taskId || ids.length < 2) && <Card><Empty>Pick a task and at least 2 employees to compare.</Empty></Card>}
      {results.length >= 2 && !res.error && (
        <Card className="overflow-hidden"><div className="overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[600px]">
            <thead><tr className="bg-slate-100 border-b border-slate-200"><th className="py-3 px-4 w-44 text-xs font-extrabold text-slate-700 uppercase">Criteria</th>
              {results.map((r) => (
                <th key={r.employee.id} className="py-3 px-4 align-top"><div className="flex items-center gap-2"><Avatar name={empLabel(r.employee)} size="w-8 h-8" /><div><div className="font-extrabold text-slate-900">{empCode(r.employee.id)}</div><div className="text-xs font-normal text-slate-600">{r.employee.department}</div></div></div>
                  {r.candidate_score === best && <div className="mt-2"><Badge cls="bg-emerald-50 text-emerald-800 border-emerald-300" icon="check">Highest score</Badge></div>}</th>))}</tr></thead>
            <tbody className="divide-y divide-slate-200">
              <tr><td className="py-3 px-4 font-bold">Candidate score</td>{results.map((r) => <td key={r.employee.id} className="py-3 px-4"><span className="text-lg font-extrabold">{r.candidate_score}</span></td>)}</tr>
              <tr><td className="py-3 px-4 font-bold">Engine status</td>{results.map((r) => <td key={r.employee.id} className="py-3 px-4"><StatusBadge s={STATUS_BY_NAME[r.status]} /></td>)}</tr>
              {['skill', 'workload', 'deadline'].map((f) => {
                const m = maxOf((r) => factorOf(r, f).score);
                return (<tr key={f}><td className="py-3 px-4 font-bold">{FACTOR_LABEL[f]}</td>{results.map((r) => { const x = factorOf(r, f); return <td key={r.employee.id} className="py-3 px-4"><div className={`tabular-nums ${rowCls(x.score, m)}`}>{x.score}</div><Bar value={x.score} /></td>; })}</tr>);
              })}
              <tr><td className="py-3 px-4 font-bold">Skill level</td>{results.map((r) => <td key={r.employee.id} className="py-3 px-4">{r.employee.skill_level}</td>)}</tr>
              <tr><td className="py-3 px-4 font-bold">Idle time available</td>{results.map((r) => <td key={r.employee.id} className={`py-3 px-4 ${rowCls(r.employee.idle_time_hours, maxOf((x) => x.employee.idle_time_hours))}`}>{r.employee.idle_time_hours} h</td>)}</tr>
              <tr><td className="py-3 px-4 font-bold">Current workload</td>{results.map((r) => <td key={r.employee.id} className="py-3 px-4">{r.employee.total_workload_hours}h ({r.employee.utilization_pct}%)</td>)}</tr>
              <tr><td className="py-3 px-4 font-bold">Profile</td>{results.map((r) => <td key={r.employee.id} className="py-3 px-4"><button className={btn('secondary', 'sm')} onClick={() => go(`employees/${r.employee.id}`)}>View profile</button></td>)}</tr>
            </tbody></table></div></Card>
      )}
    </>
  );
}

function TaskFormModal({ task, onClose, onSaved }) {
  const editing = !!task;
  const [f, setF] = useState(editing ? {
    task_name: task.task_name || '', description: task.description || '', task_complexity: task.task_complexity, required_skill_level: task.required_skill_level,
    task_priority: task.task_priority, deadline_days: task.deadline_days, workload_hours: task.workload_hours, team_size: task.team_size,
  } : EMPTY_TASK);
  const [err, setErr] = useState({});
  const [serverError, setServerError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const er = {};
    if (!editing && !f.task_name.trim()) er.task_name = 'Task name is required.';
    if (f.task_name.length > 150) er.task_name = 'Maximum 150 characters.';
    if (f.description.length > 2000) er.description = 'Maximum 2000 characters.';
    NUM_RULES.forEach(([k, label, min, max]) => {
      const n = Number(f[k]);
      if (String(f[k]).trim() === '' || !Number.isInteger(n) || n < min || n > max) er[k] = `${label} must be a whole number from ${min} to ${max}.`;
    });
    setErr(er); setServerError('');
    if (Object.keys(er).length) return;

    const body = {
      task_complexity: f.task_complexity, required_skill_level: f.required_skill_level, task_priority: f.task_priority,
      deadline_days: Number(f.deadline_days), workload_hours: Number(f.workload_hours), team_size: Number(f.team_size),
    };
    if (f.task_name.trim()) body.task_name = f.task_name.trim();           // task impor dataset belum bernama; boleh dibiarkan kosong saat edit
    if (f.description.trim() || (editing && task.description)) body.description = f.description.trim();
    setBusy(true);
    try {
      const out = editing ? await api.updateTask(task.id, body) : await api.createTask(body);
      onSaved(out.task, editing);
    } catch (ex) {
      setServerError(ex.message); setBusy(false);
    }
  };
  const sel = (k, opts) => (<select value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} className={inputCls}>{opts.map((o) => <option key={o}>{o}</option>)}</select>);

  return (
    <Modal title={editing ? `Edit ${taskCode(task.id)}` : 'Add New Task'} onClose={onClose} size="lg">
      <form onSubmit={submit} className="space-y-4" noValidate>
        {serverError && <div role="alert" className="flex items-start gap-2 p-3 rounded-lg border border-red-300 bg-red-50 text-red-800 text-sm font-semibold"><Icon name="alert" className="w-5 h-5 shrink-0" /><span>{serverError}</span></div>}
        <Field label="Task Name" error={err.task_name}><input className={inputCls} value={f.task_name} placeholder="e.g. Redis Cluster Integration" onChange={(e) => setF({ ...f, task_name: e.target.value })} /></Field>
        <Field label="Description" error={err.description}><textarea rows="3" className={inputCls} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="Complexity">{sel('task_complexity', COMPLEXITIES)}</Field>
          <Field label="Required skill level">{sel('required_skill_level', SKILL_LEVELS)}</Field>
          <Field label="Priority">{sel('task_priority', PRIORITIES)}</Field>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {NUM_RULES.map(([k, label, min, max]) => (
            <Field key={k} label={label} error={err[k]}><input type="number" min={min} max={max} className={inputCls} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></Field>))}
        </div>
        <div className="flex justify-end gap-2 pt-2"><button type="button" className={btn('secondary')} onClick={onClose}>Cancel</button><button type="submit" disabled={busy} className={btn('primary')}>{busy ? 'Saving...' : editing ? 'Save Changes' : 'Create Task'}</button></div>
      </form>
    </Modal>
  );
}

// Jumlah task per priority (dipakai kartu ringkasan). Memakai limit=1 supaya ringan.
function usePriorityCounts(tick) {
  return useFetch(async () => {
    const [all, needs, ...byPriority] = await Promise.all([
      api.listTasks({ limit: 1 }),
      api.listTasks({ limit: 1, assigned: 'no' }),
      ...PRIORITIES.map((p) => api.listTasks({ limit: 1, priority: p })),
    ]);
    const out = { all: all.total, needs: needs.total };
    PRIORITIES.forEach((p, i) => { out[p.toLowerCase()] = byPriority[i].total; });
    return out;
  }, [tick]);
}

const TaskStatus = ({ assigned }) => (assigned
  ? <Badge cls="bg-emerald-50 text-emerald-800 border-emerald-300" icon="check">Assigned</Badge>
  : <Badge cls="bg-amber-50 text-amber-800 border-amber-300" icon="users">Needs Candidates</Badge>);

function TasksPage({ ctx }) {
  const { role, presetQ, setPresetQ, toast, navigate: go, setSelectedTaskId, refreshAlerts } = ctx;
  const [q, setQ] = useState(presetQ || '');
  const [view, setView] = useState('all');             // all | needs | Critical | High | Medium | Low
  const [complexity, setComplexity] = useState('all');
  const [modal, setModal] = useState(null);          // null | 'add' | task object (edit)
  const [tick, setTick] = useState(0);
  useEffect(() => { if (presetQ) setPresetQ(''); }, []); // eslint-disable-line
  const dq = useDebounced(q);
  const pg = usePageState(10);
  const res = useFetch(() => api.listTasks({
    page: pg.page, limit: pg.pageSize, sort: 'newest', search: dq.trim(),
    priority: PRIORITIES.includes(view) ? view : '', assigned: view === 'needs' ? 'no' : '', complexity: complexity === 'all' ? '' : complexity,
  }), [pg.page, pg.pageSize, dq, view, complexity, tick]);
  const counts = usePriorityCounts(tick);
  const rows = res.data ? res.data.data : [];
  const isPM = role === 'pm';
  const cols = isPM ? 9 : 8;
  const tabs = [['all', 'All', counts.data && counts.data.all], ['needs', 'Needs Candidates', counts.data && counts.data.needs], ...PRIORITIES.map((p) => [p, p, counts.data && counts.data[p.toLowerCase()]])];

  return (
    <>
      <PageHeader title={isPM ? 'Task Management' : 'Tasks Overview'} desc={isPM ? 'Create and update task specifications, then find candidates for tasks without an assignee.' : 'Monitor all tasks, their requirements, and who they are assigned to (read-only).'}
        actions={isPM && <>
          <button className={btn('secondary')} onClick={() => go('candidates')}><Icon name="users" />Find Candidates</button>
          <button className={btn('primary')} onClick={() => setModal('add')}><Icon name="plus" />Add New Task</button>
        </>} />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="All Tasks" value={counts.data ? fmt(counts.data.all) : '—'} unit="tasks" note={<p>Total in the system</p>} icon="tasks" />
        <StatCard label="Needs Candidates" value={counts.data ? fmt(counts.data.needs) : '—'} unit="tasks" note={<p>No assignee yet</p>} icon="users" />
        <StatCard label="Critical / High" value={counts.data ? fmt(counts.data.critical + counts.data.high) : '—'} unit="tasks" note={<p>Needs prompt attention</p>} icon="alert" />
      </div>
      <Card className="overflow-hidden">
        <div className="p-4 flex flex-wrap items-center gap-3 border-b border-slate-200 bg-slate-50">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter tasks">
            {tabs.map(([id, label, n]) => (
              <button key={id} onClick={() => { setView(id); pg.setPage(1); }} aria-pressed={view === id} className={btn(view === id ? 'primary' : 'secondary', 'sm')}>{label} ({n == null ? '—' : fmt(n)})</button>
            ))}
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-3">
            <select value={complexity} onChange={(e) => { setComplexity(e.target.value); pg.setPage(1); }} className={`${inputBase} w-auto`} aria-label="Filter by complexity"><option value="all">All complexity</option>{COMPLEXITIES.map((c) => <option key={c}>{c}</option>)}</select>
            <div className="relative"><span className="absolute inset-y-0 left-2.5 flex items-center text-slate-500"><Icon name="search" /></span>
              <input value={q} onChange={(e) => { setQ(e.target.value); pg.setPage(1); }} placeholder="Search task name or ID..." className={`${inputBase} pl-9 w-56 max-w-full`} /></div>
          </div>
        </div>
        {res.error && <ErrorBox msg={res.error} />}
        <div className="overflow-x-auto"><table className="w-full text-left text-sm min-w-[980px]">
          <thead><tr className="bg-slate-100 border-b border-slate-200 text-xs font-extrabold text-slate-700 uppercase tracking-wider"><th className="py-3 px-4">Task</th><th className="py-3 px-4">Complexity</th><th className="py-3 px-4">Required Skill</th><th className="py-3 px-4">Priority</th><th className="py-3 px-4">Workload</th><th className="py-3 px-4">Deadline</th><th className="py-3 px-4">Assigned To</th><th className="py-3 px-4">Status</th>{isPM && <th className="py-3 px-4 text-right">Action</th>}</tr></thead>
          <tbody className="divide-y divide-slate-200">
            {res.loading ? <tr><td colSpan={cols}><Loading /></td></tr>
              : rows.length === 0 ? <tr><td colSpan={cols}><Empty>No tasks match this filter.</Empty></td></tr>
              : rows.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 max-w-xs"><div className="font-extrabold text-slate-900 break-words">{taskCode(t.id)} • {taskLabel(t)}</div>{t.description && <div className="text-xs text-slate-600 break-words">{t.description}</div>}</td>
                  <td className="py-3 px-4">{t.task_complexity}</td>
                  <td className="py-3 px-4">{t.required_skill_level}</td>
                  <td className="py-3 px-4"><PriorityBadge p={t.task_priority} /></td>
                  <td className="py-3 px-4 whitespace-nowrap"><div className="font-bold">{t.workload_hours} h</div><div className="text-xs text-slate-600">team of {t.team_size}</div></td>
                  <td className="py-3 px-4 whitespace-nowrap">{t.deadline_days} days</td>
                  <td className="py-3 px-4 whitespace-nowrap">{t.assigned_employee_id ? (role === 'hr' ? <button className="font-bold underline cursor-pointer" onClick={() => go(`employees/${t.assigned_employee_id}`)}>{empCode(t.assigned_employee_id)}</button> : <span className="font-bold">{empCode(t.assigned_employee_id)}</span>) : '—'}</td>
                  <td className="py-3 px-4"><TaskStatus assigned={!!t.assigned_employee_id} /></td>
                  {isPM && <td className="py-3 px-4 text-right"><div className="inline-flex gap-2">
                    {!t.assigned_employee_id && <button className={btn('primary', 'sm')} onClick={() => { setSelectedTaskId(String(t.id)); go('candidates'); }}>Find Candidates</button>}
                    <button className={btn('secondary', 'sm')} onClick={() => setModal(t)}>Edit</button></div></td>}
                </tr>))}
          </tbody></table></div>
        {res.data && <Pager page={pg.page} setPage={pg.setPage} total={res.data.total} pageSize={pg.pageSize} setPageSize={pg.setPageSize} label="tasks" />}
      </Card>
      {modal && <TaskFormModal task={modal === 'add' ? null : modal} onClose={() => setModal(null)}
        onSaved={(t, editing) => { setModal(null); pg.setPage(1); setTick((n) => n + 1); refreshAlerts(); toast('success', `Task ${taskCode(t.id)} was ${editing ? 'updated' : 'added'}.`); }} />}
    </>
  );
}

/* =========================================================
   PAGES — PM
   ========================================================= */
function PMDashboard({ ctx }) {
  const { navigate: go, setSelectedTaskId } = ctx;
  const counts = usePriorityCounts(0);
  const needs = useFetch(() => api.listTasks({ assigned: 'no', sort: 'newest', limit: 10 }), []);
  const list = needs.data ? needs.data.data : [];
  return (
    <>
      <PageHeader title="Project Dashboard" desc="Overview of tasks and the tasks that still need a candidate."
        actions={<button className={btn('primary')} onClick={() => go('candidates')}><Icon name="users" />Find Candidates</button>} />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Active Tasks" value={counts.data ? fmt(counts.data.all) : '—'} unit="tasks" note={<p>All current tasks</p>} icon="tasks" />
        <StatCard label="High Priority Items" value={counts.data ? fmt(counts.data.critical + counts.data.high) : '—'} unit="Critical / High" note={<p>Needs prompt attention</p>} icon="alert" />
        <StatCard label="Needs Candidates" value={counts.data ? fmt(counts.data.needs) : '—'} unit="tasks" note={<p>No assignee yet</p>} icon="users" />
      </div>
      {counts.error && <Card><ErrorBox msg={counts.error} /></Card>}
      <Card className="overflow-hidden">
        <div className="p-5 pb-3"><h2 className="text-base font-extrabold text-slate-900">Tasks Needing Candidates</h2></div>
        {needs.error && <ErrorBox msg={needs.error} />}
        <div className="overflow-x-auto"><table className="w-full text-left text-sm min-w-[480px]">
          <thead><tr className="bg-slate-100 border-y border-slate-200 text-xs font-extrabold text-slate-700 uppercase"><th className="py-3 px-4">Task</th><th className="py-3 px-4">Priority</th><th className="py-3 px-4">Workload</th><th className="py-3 px-4 text-right">Action</th></tr></thead>
          <tbody className="divide-y divide-slate-200">{needs.loading ? <tr><td colSpan="4"><Loading /></td></tr>
            : list.length === 0 ? <tr><td colSpan="4"><Empty>All tasks have an assignee.</Empty></td></tr>
            : list.map((t) => (
              <tr key={t.id}><td className="py-3 px-4"><div className="font-extrabold">{taskCode(t.id)}</div><div className="text-xs text-slate-600">{taskLabel(t)}</div></td><td className="py-3 px-4"><PriorityBadge p={t.task_priority} /></td><td className="py-3 px-4 font-bold">{t.workload_hours} h</td>
                <td className="py-3 px-4 text-right"><button className={btn('secondary', 'sm')} onClick={() => { setSelectedTaskId(String(t.id)); go('candidates'); }}>Find Candidates</button></td></tr>))}</tbody></table></div>
      </Card>
    </>
  );
}

function CandidatesPage({ ctx }) {
  const { selectedTaskId, setSelectedTaskId, askConfirm, toast, refreshAlerts, navigate: go } = ctx;
  const [tick, setTick] = useState(0);
  const tasks = useFetch(() => api.listTasks({ assigned: 'no', sort: 'newest', limit: 50 }), [tick]);
  const list = tasks.data ? tasks.data.data : [];
  const task = list.find((t) => String(t.id) === String(selectedTaskId)) || list[0];
  const cand = useFetch(() => (task ? api.taskCandidates(task.id, 3) : Promise.resolve(null)), [task ? task.id : null, tick]);
  const cs = cand.data ? cand.data.candidates : [];
  const w = cs[0] ? Object.fromEntries(cs[0].factors.map((f) => [f.factor, Math.round(f.weight * 100)])) : null;

  const assign = (c, overload) => askConfirm({
    title: 'Assign candidate?',
    body: <p>Assign <b>{taskCode(task.id)}</b> to <b>{empLabel(c.employee)}</b> (match {c.candidate_score}%)?{overload && <> This employee has less idle time ({c.employee.idle_time_hours} h) than the task needs ({task.workload_hours} h).</>} This cannot be undone from this page.</p>,
    confirmLabel: overload ? 'Assign Anyway' : 'Assign',
    onConfirm: async () => {
      try {
        await api.assignTask(task.id, c.employee.id);
        toast('success', `${taskCode(task.id)} assigned to ${empCode(c.employee.id)}.`);
        refreshAlerts();
        setTick((n) => n + 1);
      } catch (err) { toast('error', err.message); }
    },
  });

  if (tasks.loading && !tasks.data) return (<><PageHeader title="Candidate Allocation" /><Card><Loading /></Card></>);
  if (tasks.error) return (<><PageHeader title="Candidate Allocation" /><Card><ErrorBox msg={tasks.error} /></Card></>);
  if (!task) return (
    <>
      <PageHeader title="Candidate Allocation" />
      <Card className="p-8 text-center"><div className="w-12 h-12 mx-auto rounded-full bg-emerald-50 border border-emerald-300 text-emerald-800 flex items-center justify-center mb-3"><Icon name="check" className="w-6 h-6" /></div>
        <h2 className="font-extrabold text-slate-900">All tasks have an assignee</h2><p className="text-sm text-slate-600 mt-1">New tasks you add will show up here until they get a candidate.</p>
        <button className={`${btn('primary')} mt-4`} onClick={() => go('tasks')}>Back to Tasks</button></Card>
    </>
  );

  return (
    <>
      <PageHeader title="Candidate Allocation" desc={w ? `Top three candidates ranked by skill match (${w.skill}%), workload/capacity (${w.workload}%) and deadline feasibility (${w.deadline}%).` : 'Top three candidates ranked by the allocation scoring engine.'} />
      <Card className="p-5">
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-[240px] flex-1"><label className="block text-sm font-bold mb-1">Task that needs a candidate</label>
            <select className={inputCls} value={task.id} onChange={(e) => setSelectedTaskId(e.target.value)}>{list.map((t) => <option key={t.id} value={t.id}>{taskCode(t.id)} — {taskLabel(t)}</option>)}</select></div>
          <div className="flex flex-wrap gap-2 items-center text-sm"><PriorityBadge p={task.task_priority} /><Badge cls="bg-slate-100 text-slate-800 border-slate-300">{task.workload_hours} h</Badge><Badge cls="bg-slate-100 text-slate-800 border-slate-300">Needs {task.required_skill_level} skill</Badge><Badge cls="bg-slate-100 text-slate-800 border-slate-300">Deadline {task.deadline_days} days</Badge></div>
        </div>
      </Card>
      {cand.loading && <Card><Loading text="Scoring candidates..." /></Card>}
      {cand.error && <Card><ErrorBox msg={cand.error} /></Card>}
      {!cand.loading && cs.length === 0 && !cand.error && <Card><Empty>No employee could be scored for this task.</Empty></Card>}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {cs.map((c, i) => {
          const free = c.employee.idle_time_hours; const need = task.workload_hours; const after = free - need;
          const label = after < 0 ? 'Not enough idle time' : after <= 2 ? 'Tight' : 'Available';
          return (
            <Card key={c.employee.id} className={`p-5 flex flex-col ${i === 0 ? 'border-2 border-slate-900' : ''}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0"><Avatar name={empLabel(c.employee)} size="w-10 h-10" /><div className="min-w-0"><h3 className="font-extrabold text-slate-900 truncate">{empLabel(c.employee)}</h3><p className="text-xs text-slate-600 truncate">{c.employee.department} • {c.employee.skill_level} skill</p></div></div>
                <div className="text-center bg-slate-100 border border-slate-300 rounded-xl px-2.5 py-1"><div className="text-sm font-extrabold">{c.candidate_score}%</div><div className="text-[9px] font-extrabold uppercase">Match</div></div>
              </div>
              {i === 0 && <div className="mt-2"><Badge cls="bg-emerald-50 text-emerald-800 border-emerald-300" icon="check">Best match</Badge></div>}
              <div className="mt-4"><div className="flex justify-between gap-2 text-xs font-bold text-slate-700 mb-1"><span>Availability buffer</span><span>{label} ({free}h idle)</span></div>
                <Bar value={Math.max(0, Math.min(100, (free / Math.max(need, 1)) * 100))} color={after < 0 ? 'bg-red-600' : after <= 2 ? 'bg-amber-500' : 'bg-emerald-600'} /></div>
              <div className="mt-4 flex-1"><p className="text-xs font-extrabold text-slate-600 uppercase tracking-wider mb-2">Score breakdown</p><FactorBars factors={c.factors} />
                <p className="text-xs text-slate-600 mt-3">Current workload: <b>{c.employee.total_workload_hours}h / {c.employee.capacity_hours}h ({c.employee.utilization_pct}%)</b></p></div>
              <button className={`${btn(i === 0 ? 'primary' : 'secondary')} mt-5 w-full`} onClick={() => assign(c, after < 0)}>{after < 0 ? 'Assign with Overload Notice' : 'Assign Candidate'}</button>
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
  const [toastState, setToastState] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [collapsed, setCollapsed] = useState(typeof window !== 'undefined' && window.innerWidth < 1280);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [gq, setGq] = useState('');
  const [presetQ, setPresetQ] = useState('');
  const [alerts, setAlerts] = useState([]);
  const [alertTick, setAlertTick] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [cmp, setCmp] = useState({ taskId: '', ids: [] });   // pilihan halaman Compare Candidates
  const [selectedTaskId, setSelectedTaskId] = useState(''); // task terpilih di halaman Candidates (PM)

  useEffect(() => {
    const on = () => setPath(parseHash());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
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
  const go = (to) => { setGq(''); navigate(to); };

  const login = (token, u) => {
    const r = String(u.role).toLowerCase();
    setToken(token);
    setUser({ id: u.id, role: r, roleName: ROLE_NAME[r] || u.role, name: u.name, email: u.email });
    navigate('dashboard');
    toast('success', `Signed in as ${ROLE_NAME[r] || u.role}.`);
  };
  const doLogout = (msg) => { setToken(null); setUser(null); setMobileOpen(false); navigate('login'); toast('info', msg); };
  const logout = () => askConfirm({ title: 'Log out?', body: <p>You will be signed out of this session.</p>, confirmLabel: 'Log out', onConfirm: () => doLogout('You have been logged out.') });

  // Token kedaluwarsa / tidak valid -> kembali ke login
  useEffect(() => {
    setUnauthorizedHandler(() => doLogout('Your session has expired. Please sign in again.'));
    return () => setUnauthorizedHandler(null);
  }, []); // eslint-disable-line

  // Pencarian global lewat API (employee untuk HR, task untuk HR dan PM)
  const dq = useDebounced(gq.trim());
  const [results, setResults] = useState([]);
  useEffect(() => {
    if (!user || !dq) { setResults([]); return undefined; }
    let alive = true;
    const none = { data: [] };
    Promise.all([
      user.role === 'hr' ? api.listEmployees({ search: dq, limit: 4 }).catch(() => none) : Promise.resolve(none),
      api.listTasks({ search: dq, limit: 4 }).catch(() => none),
    ]).then(([e, t]) => {
      if (!alive) return;
      setResults([
        ...e.data.map((x) => ({ key: `e${x.id}`, label: empLabel(x), sub: `${empCode(x.id)} • ${x.department}`, onClick: () => go(`employees/${x.id}`) })),
        ...t.data.map((x) => ({ key: `t${x.id}`, label: `${taskCode(x.id)} ${taskLabel(x)}`, sub: 'Task', onClick: () => { setPresetQ(String(x.id)); go('tasks'); } })),
      ]);
    });
    return () => { alive = false; };
  }, [dq, user]); // eslint-disable-line

  // Notifikasi: HR melihat antrean review, PM melihat task yang belum punya assignee.
  useEffect(() => {
    if (!user) { setAlerts([]); return undefined; }
    let alive = true;
    const load = user.role === 'hr'
      ? api.allocationSummary().then((x) => (x.pending_review > 0 ? [{ key: 'pending', count: x.pending_review, icon: 'alert', cls: 'bg-red-50 text-red-800 border-red-300', title: `${fmt(x.pending_review)} allocations need a decision`, desc: 'They are flagged as Requires Reassignment and are waiting for HR.', actionLabel: 'Open Recommendations', to: 'recommendations' }] : []))
      : api.listTasks({ assigned: 'no', limit: 1 }).then((t) => (t.total > 0 ? [{ key: 'unassigned', count: t.total, icon: 'users', cls: 'bg-sky-50 text-sky-800 border-sky-300', title: `${fmt(t.total)} tasks need a candidate`, desc: 'These tasks have no assignee yet.', actionLabel: 'Find Candidates', to: 'candidates' }] : []));
    load.then((items) => { if (alive) setAlerts(items); }).catch(() => { if (alive) setAlerts([]); });
    return () => { alive = false; };
  }, [user, alertTick]); // eslint-disable-line
  const alertCount = alerts.reduce((n, a) => n + a.count, 0);

  const ctx = {
    role, navigate: go, presetQ, setPresetQ, toast, askConfirm,
    refreshAlerts: () => setAlertTick((n) => n + 1), cmp, setCmp, selectedTaskId, setSelectedTaskId,
  };

  /* ---------- Not signed in ---------- */
  if (!user) {
    return (
      <>
        <Toast toast={toastState} onClose={() => setToastState(null)} />
        <LoginPage onLogin={login} />
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
    if (page === 'employees' && path[1]) crumbs.push({ label: /^\d+$/.test(path[1]) ? empCode(path[1]) : path[1] });
  }

  let content = null;
  if (page === 'dashboard') content = role === 'hr' ? <HRDashboard ctx={ctx} /> : <PMDashboard ctx={ctx} />;
  else if (page === 'employees') content = path[1] ? <EmployeeDetail ctx={ctx} id={path[1]} /> : <EmployeesPage ctx={ctx} />;
  else if (page === 'tasks') content = <TasksPage ctx={ctx} />;
  else if (page === 'analysis') content = <AnalysisPage ctx={ctx} />;
  else if (page === 'status') content = <StatusPage ctx={ctx} />;
  else if (page === 'recommendations') content = <RecommendationsPage ctx={ctx} />;
  else if (page === 'compare') content = <ComparePage ctx={ctx} />;
  else if (page === 'candidates') content = <CandidatesPage ctx={ctx} />;

  const sideProps = { menus: MENUS[role], page, user, onLogout: logout, onProfile: () => { setMobileOpen(false); setProfileOpen(true); } };

  return (
    <div className="h-screen flex bg-slate-50 text-slate-800 antialiased font-sans overflow-hidden">
      <Toast toast={toastState} onClose={() => setToastState(null)} />

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
            {gq.trim() && (
              <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-slate-300 rounded-xl shadow-xl z-30 overflow-hidden">
                {results.length === 0 ? <div className="px-4 py-3 text-sm text-slate-500">{gq.trim() === dq ? 'No results.' : 'Searching...'}</div> : results.map((r) => (
                  <button key={r.key} onClick={r.onClick} className="w-full text-left px-4 py-2.5 hover:bg-slate-100 cursor-pointer"><div className="text-sm font-bold text-slate-900 truncate">{r.label}</div><div className="text-xs text-slate-600 truncate">{r.sub}</div></button>))}
              </div>)}
          </div>
          <div className="ml-auto flex items-center gap-3 shrink-0">
            <span className="hidden xl:flex items-center gap-1.5 text-xs bg-slate-100 border border-slate-300 rounded-md px-3 py-1.5"><Icon name="clock" className="w-4 h-4 text-slate-600" /><Clock /></span>
            <button onClick={() => setNotifOpen(true)} aria-label={`Notifications (${alertCount})`} className="relative p-2 rounded-lg border border-slate-300 hover:bg-slate-100 cursor-pointer">
              <Icon name="bell" className="w-5 h-5" />
              {alertCount > 0 && <span className="absolute -top-1.5 -right-1.5 min-w-[1.1rem] h-[1.1rem] px-1 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center">{alertCount > 99 ? '99+' : alertCount}</span>}
            </button>
            <button onClick={() => setProfileOpen(true)} title="View profile" className="flex items-center gap-2 px-2 xl:px-2.5 py-1.5 rounded-lg border border-slate-300 text-left hover:bg-slate-100 cursor-pointer">
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

      {profileOpen && <ProfileModal user={user} onClose={() => setProfileOpen(false)} />}
      {notifOpen && <NotificationsModal items={alerts.map((a) => ({ ...a, onOpen: () => go(a.to) }))} onClose={() => setNotifOpen(false)} />}
      <ConfirmDialog cfg={confirm} onClose={() => setConfirm(null)} />
    </div>
  );
}