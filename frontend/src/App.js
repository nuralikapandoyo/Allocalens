import React, { useState, useEffect } from 'react';

function App() {
  // State Navigasi Utama:
  // 'login', 'pm', 'hr_dashboard', 'hr_employee_detail', 'hr_analysis', 'hr_status', 'hr_recommendations'
  const [view, setView] = useState('login');

  // State Sub-Tab PM Portal: 'all', 'tasks', 'candidates'
  const [pmTab, setPmTab] = useState('all');

  // State Jam Realtime
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString('id-ID'));

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('id-ID'));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // State Context User Logged In
  const [currentUser, setCurrentUser] = useState({
    name: 'Elena Rostova',
    email: 'elena.rostova@enterprise.allocalens.io',
    role: 'hr',
    roleName: 'HR Manager',
    avatar: 'ER'
  });

  // State Form Login
  const [loginEmail, setLoginEmail] = useState('elena.rostova@enterprise.allocalens.io');
  const [loginPassword, setLoginPassword] = useState('password123');
  const [selectedRoleWorkspace, setSelectedRoleWorkspace] = useState('hr');

  // State Data Master Tasks
  const [tasksList, setTasksList] = useState([
    { id: 'TSK-203', name: 'Nadia', desc: 'Project Manager', complexity: 'High', priority: 'High', workload: '20 hrs', status: 'Needs Candidates', assignedTo: 'Unassigned' },
    { id: 'TSK-802', name: 'Database System Migration', desc: 'Postgres 16, Distributed DB • Refactor schema & multi-region replication', complexity: 'High', priority: 'Critical', workload: '40 hrs', status: 'Needs Candidates', assignedTo: 'Unassigned' },
    { id: 'TSK-741', name: 'Enterprise Multi-Tenant Auth', desc: 'SAML 2.0, Go • Identity federation and SSO lifecycle hooks', complexity: 'High', priority: 'High', workload: '32 hrs', status: 'In Progress', assignedTo: 'Alex Rivera' },
    { id: 'TSK-689', name: 'Realtime Analytics Pipeline Webhook', desc: 'Apache Flink, Kafka • Connect streaming cluster to lakehouse', complexity: 'Medium', priority: 'Medium', workload: '24 hrs', status: 'Needs Candidates', assignedTo: 'Unassigned' },
    { id: 'TSK-650', name: 'GraphQL Gateway Schema Stitching', desc: 'Apollo, Node.js • Combine billing, auth, and user subgraphs', complexity: 'High', priority: 'High', workload: '45 hrs', status: 'In Progress', assignedTo: 'Marcus Chen' },
    { id: 'TSK-512', name: 'CI/CD Pipeline Cache Optimization', desc: 'eBPF, GitHub Actions • Distributed build runner caching', complexity: 'Low', priority: 'Low', workload: '16 hrs', status: 'In Progress', assignedTo: 'Lucas Moreau' },
    { id: 'TSK-403', name: 'Redis Cache Cluster Sharding', desc: 'Redis 7, Cluster Mode • Memory tuning and eviction policy', complexity: 'Medium', priority: 'Medium', workload: '20 hrs', status: 'Needs Candidates', assignedTo: 'Unassigned' },
  ]);

  // State Selected Task (PM Portal)
  const [selectedTaskId, setSelectedTaskId] = useState('TSK-203');
  const selectedTask = tasksList.find(t => t.id === selectedTaskId) || tasksList[0];

  // State Filter & Search
  const [taskFilter, setTaskFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sprintFilter, setSprintFilter] = useState('Sprint 42');
  const [triageFilter, setTriageFilter] = useState('');

  // State Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 3;

  // State Modals
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedTriageDetail, setSelectedTriageDetail] = useState(null);

  // State Form Task Baru
  const [newTaskData, setNewTaskData] = useState({
    name: '',
    desc: '',
    complexity: 'High',
    priority: 'Critical',
    workload: '20 hrs'
  });

  // Toast Notification
  const [notification, setNotification] = useState('');
  const showToast = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 3500);
  };

  // State Data Reassignment Queue (HR Dashboard)
  const [triageQueue, setTriageQueue] = useState([
    {
      id: 'TSK-802',
      name: 'Database System Migration',
      details: '40 hrs • High SLA Impact',
      trigger: 'Overcapacity (116%)',
      currentAssignee: 'David Kim',
      currentHours: '46.5h',
      proposedCandidate: 'Elena Vance',
      score: '92%',
      reason: 'David Kim berada pada kapasitas kritis (116%). Elena Vance memiliki ruang kerja 6.8 jam serta tingkat kecocokan keahlian PostgreSQL hingga 94%.'
    },
    {
      id: 'TSK-741',
      name: 'Enterprise Multi-Tenant Auth',
      details: '32 hrs • OAuth2 / SAML',
      trigger: 'Skill Gap (Auth Lead)',
      currentAssignee: 'Alex Rivera',
      currentHours: '38.0h',
      proposedCandidate: 'Marcus Chen',
      score: '88%',
      reason: 'Penugasan membutuhkan pengalaman mendalam pada modul SSO/SAML 2.0. Marcus Chen memiliki kecocokan domain keahlian tertinggi.'
    }
  ]);

  // Handler Assign Candidate pada PM Portal
  const handleAssignCandidate = (taskId, candidateName) => {
    setTasksList(prevList => prevList.map(t => {
      if (t.id === taskId) {
        return { ...t, assignedTo: candidateName, status: 'In Progress' };
      }
      return t;
    }));
    showToast(`${candidateName} berhasil ditugaskan untuk Task ${taskId}!`);
  };

  // Handler Login Submit
  const handleLogin = (e) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      showToast("Email dan Password tidak boleh kosong!");
      return;
    }
    if (selectedRoleWorkspace === 'hr') {
      setCurrentUser({
        name: 'Elena Rostova',
        email: loginEmail,
        role: 'hr',
        roleName: 'HR Manager',
        avatar: 'ER'
      });
      setView('hr_dashboard');
      showToast("Berhasil masuk sebagai HR Executive");
    } else {
      setCurrentUser({
        name: 'John Doe',
        email: loginEmail,
        role: 'pm',
        roleName: 'Project Manager (Eng Pod A)',
        avatar: 'JD'
      });
      setView('pm');
      showToast("Berhasil masuk ke PM Workspace");
    }
  };

  // Handler Tambah Task Baru
  const handleCreateTask = (e) => {
    e.preventDefault();
    const newId = `TSK-${Math.floor(100 + Math.random() * 900)}`;
    const taskObj = {
      id: newId,
      name: newTaskData.name,
      desc: newTaskData.desc || 'Deskripsi task default.',
      complexity: newTaskData.complexity,
      priority: newTaskData.priority,
      workload: newTaskData.workload,
      status: 'Needs Candidates',
      assignedTo: 'Unassigned'
    };

    setTasksList([taskObj, ...tasksList]);
    setSelectedTaskId(newId);
    setShowAddTaskModal(false);
    setNewTaskData({ name: '', desc: '', complexity: 'High', priority: 'Critical', workload: '20 hrs' });
    showToast(`Task ${newId} berhasil ditambahkan!`);
  };

  // Handler Reassignment HR
  const handleApproveReassignment = (taskId, candidateName) => {
    setTriageQueue(triageQueue.filter(item => item.id !== taskId));
    setTasksList(tasksList.map(t => t.id === taskId ? { ...t, assignedTo: candidateName, status: 'In Progress' } : t));
    setSelectedTriageDetail(null);
    showToast(`Reassignment untuk ${taskId} disetujui! Dialokasikan ke ${candidateName}.`);
  };

  // Filter Logic untuk Task PM
  const filteredTasks = tasksList.filter(t => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = t.id.toLowerCase().includes(query) || 
                          t.name.toLowerCase().includes(query) || 
                          t.desc.toLowerCase().includes(query);
    if (!matchesSearch) return false;
    if (taskFilter === 'needs_candidates') return t.status === 'Needs Candidates';
    if (taskFilter === 'high_priority') return t.priority === 'Critical' || t.priority === 'High';
    if (taskFilter === 'in_progress') return t.status === 'In Progress';
    return true;
  });

  // Logika Pagination Task PM
  const totalPages = Math.ceil(filteredTasks.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedTasks = filteredTasks.slice(startIndex, startIndex + itemsPerPage);

  useEffect(() => {
    if (paginatedTasks.length > 0) {
      const isStillInPage = paginatedTasks.some(t => t.id === selectedTaskId);
      if (!isStillInPage) {
        setSelectedTaskId(paginatedTasks[0].id);
      }
    }
  }, [currentPage, taskFilter, searchQuery]);

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(prev => prev + 1);
  };

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(prev => prev - 1);
  };

  // Filter Logic untuk Triage Queue HR
  const filteredTriageQueue = triageQueue.filter(item => {
    const q = (triageFilter || searchQuery).toLowerCase();
    return item.id.toLowerCase().includes(q) || 
           item.name.toLowerCase().includes(q) || 
           item.currentAssignee.toLowerCase().includes(q) || 
           item.proposedCandidate.toLowerCase().includes(q);
  });

  // Render Sidebar HR
  const renderHRSidebar = () => (
    <aside className="w-64 bg-[#0f172a] text-slate-300 flex flex-col justify-between p-4 shrink-0 shadow-lg border-r border-slate-800">
      <div>
        <div className="mb-6 px-2">
          <h1 className="text-white font-extrabold tracking-wider text-base uppercase">ALLOCALENS</h1>
          <p className="text-xs text-slate-400 font-semibold tracking-wide uppercase">ENTERPRISE AI</p>
        </div>

        <div 
          onClick={() => setShowProfileModal(true)}
          className="bg-[#1e293b] p-3 rounded-xl flex items-center justify-between gap-3 mb-6 border border-slate-700 cursor-pointer hover:bg-slate-800 transition"
        >
          <div className="overflow-hidden">
            <h2 className="text-sm font-bold text-white truncate">{currentUser.name}</h2>
            <p className="text-xs text-slate-300 font-medium truncate">{currentUser.roleName}</p>
          </div>
          <div className="w-2.5 h-2.5 rounded-full bg-slate-400"></div>
        </div>

        <div className="space-y-1.5 mb-6">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">CORE</p>
          
          <button 
            onClick={() => setView('hr_dashboard')} 
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold transition text-left cursor-pointer ${
              view === 'hr_dashboard' ? 'bg-slate-800 text-white border border-slate-600' : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
            }`}
          >
            <svg className="w-4 h-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            Dashboard
          </button>

          <button 
            onClick={() => setView('hr_employee_detail')} 
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold transition text-left cursor-pointer ${
              view === 'hr_employee_detail' ? 'bg-slate-800 text-white border border-slate-600' : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
            }`}
          >
            <svg className="w-4 h-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 1 0 3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            Employees
          </button>

          <button 
            onClick={() => { setView('pm'); setPmTab('all'); setTaskFilter('all'); showToast("Switched to Tasks Portal View"); }} 
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold transition text-left cursor-pointer ${
              view === 'pm' ? 'bg-slate-800 text-white border border-slate-600' : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
            }`}
          >
            <svg className="w-4 h-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
            Tasks Portal
          </button>
        </div>

        <div className="space-y-1.5">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">DECISION SUPPORT</p>

          <button 
            onClick={() => setView('hr_analysis')} 
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition cursor-pointer text-left ${
              view === 'hr_analysis' ? 'bg-slate-800 text-white border border-slate-600 font-bold' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg>
            Allocation Analysis
          </button>

          <button 
            onClick={() => setView('hr_status')} 
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition cursor-pointer text-left ${
              view === 'hr_status' ? 'bg-slate-800 text-white border border-slate-600 font-bold' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            Allocation Status
          </button>

          <button 
            onClick={() => setView('hr_recommendations')} 
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition cursor-pointer text-left ${
              view === 'hr_recommendations' ? 'bg-slate-800 text-white border border-slate-600 font-bold' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
            Recommendations
          </button>

          <button 
            onClick={() => setShowCompareModal(true)} 
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition cursor-pointer text-left"
          >
            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M16 3h5v5"/><path d="M8 3H3v5"/><path d="M21 3l-7 7"/><path d="M3 3l7 7"/><path d="M16 21h5v-5"/><path d="M8 21H3v-5"/><path d="M21 21l-7-7"/><path d="M3 21l7-7"/></svg>
            Compare Candidates
          </button>
        </div>
      </div>

      <div className="space-y-2 pt-4 border-t border-slate-800">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider px-3 mb-1">SYSTEM</p>
        <button onClick={() => setShowSettingsModal(true)} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition cursor-pointer text-left">
          <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          Settings
        </button>
        <button onClick={() => { setView('login'); showToast("Logged out successfully"); }} className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-bold text-slate-300 hover:bg-slate-800 hover:text-white transition cursor-pointer w-full text-left">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          Logout
        </button>
      </div>
    </aside>
  );

  // Toast Component
  const renderToast = () => notification && (
    <div className="fixed bottom-5 right-5 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-2xl z-50 flex items-center gap-3 border border-slate-700 animate-bounce">
      <div className="w-2.5 h-2.5 rounded-full bg-slate-400"></div>
      <span className="text-xs font-semibold">{notification}</span>
    </div>
  );

  // Profile Modal
  const renderProfileModal = () => showProfileModal && (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-300">
        <div className="flex justify-between items-center mb-4 border-b pb-3">
          <h2 className="text-base font-extrabold text-slate-900">User Profile</h2>
          <button onClick={() => setShowProfileModal(false)} className="text-slate-400 hover:text-slate-900 font-bold text-lg cursor-pointer">✕</button>
        </div>
        
        <div className="flex flex-col items-center text-center py-2">
          <div className="w-16 h-16 rounded-full bg-[#0f172a] text-white flex items-center justify-center font-extrabold text-xl shadow-md mb-3">
            {currentUser.avatar}
          </div>
          <h3 className="text-base font-extrabold text-slate-900">{currentUser.name}</h3>
          <p className="text-xs text-slate-500 font-semibold">{currentUser.roleName}</p>
          <p className="text-xs text-slate-400 mt-0.5">{currentUser.email}</p>
        </div>

        <div className="mt-6 space-y-2 border-t border-slate-200 pt-4">
          <button 
            onClick={() => {
              setShowProfileModal(false);
              setShowSettingsModal(true);
            }} 
            className="w-full py-2 bg-slate-100 text-slate-800 rounded-lg text-xs font-bold hover:bg-slate-200 cursor-pointer"
          >
            Account Settings
          </button>
          <button 
            onClick={() => {
              setShowProfileModal(false);
              setView('login');
              showToast("Logged out successfully");
            }} 
            className="w-full py-2 bg-red-50 text-red-600 rounded-lg text-xs font-bold hover:bg-red-100 cursor-pointer"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );

  // Settings Modal
  const renderSettingsModal = () => showSettingsModal && (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-300">
        <h2 className="text-base font-extrabold text-slate-900 mb-4">System Settings</h2>
        <div className="space-y-4 text-xs font-semibold text-slate-700">
          <div className="flex justify-between items-center pb-2 border-b">
            <span>AI Auto-Allocation Algorithm</span>
            <input type="checkbox" defaultChecked className="toggle cursor-pointer" />
          </div>
          <div className="flex justify-between items-center pb-2 border-b">
            <span>Overcapacity Alert Threshold</span>
            <span className="font-bold text-slate-900">110%</span>
          </div>
          <div className="flex justify-between items-center pb-2 border-b">
            <span>Email Notifications</span>
            <input type="checkbox" defaultChecked className="toggle cursor-pointer" />
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <button onClick={() => setShowSettingsModal(false)} className="px-4 py-2 bg-[#0f172a] text-white font-bold text-xs rounded-lg hover:bg-slate-800 cursor-pointer">
            Save & Close
          </button>
        </div>
      </div>
    </div>
  );

  // Compare Candidates Modal
  const renderCompareModal = () => showCompareModal && (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-300">
        <div className="flex justify-between items-center mb-4 border-b border-slate-200 pb-3">
          <h2 className="text-base font-extrabold text-slate-900">Compare Candidate Match Vector</h2>
          <button onClick={() => setShowCompareModal(false)} className="text-slate-500 hover:text-slate-900 font-bold text-lg cursor-pointer">✕</button>
        </div>
        <div className="grid grid-cols-2 gap-4 text-xs font-semibold">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-300">
            <h3 className="font-extrabold text-slate-900 text-sm mb-2">Elena Vance (94% Fit)</h3>
            <p className="text-slate-600 mb-2">Workload: 32h / 40h (6.8h buffer)</p>
            <p className="text-slate-600">Skill Match: Postgres (95%), Systems (96%)</p>
          </div>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-300">
            <h3 className="font-extrabold text-slate-900 text-sm mb-2">Marcus Chen (82% Fit)</h3>
            <p className="text-slate-600 mb-2">Workload: 38h / 40h (2.0h buffer)</p>
            <p className="text-slate-600">Skill Match: Postgres (98%), Replication (94%)</p>
          </div>
        </div>
        <div className="mt-5 flex justify-end">
          <button onClick={() => setShowCompareModal(false)} className="px-4 py-2 bg-[#0f172a] text-white font-bold text-xs rounded-lg hover:bg-slate-800 cursor-pointer">Close Comparison</button>
        </div>
      </div>
    </div>
  );

  // Modal Pop-Up Detail Triage
  const renderTriageDetailModal = () => selectedTriageDetail && (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-300">
        <div className="flex justify-between items-start border-b border-slate-200 pb-3 mb-4">
          <div>
            <span className="text-xs font-extrabold text-white bg-slate-900 px-2 py-0.5 rounded">
              {selectedTriageDetail.id}
            </span>
            <h2 className="text-base font-extrabold text-slate-900 mt-1">{selectedTriageDetail.name}</h2>
            <p className="text-xs text-slate-600 font-semibold">{selectedTriageDetail.details}</p>
          </div>
          <button onClick={() => setSelectedTriageDetail(null)} className="text-slate-400 hover:text-slate-900 font-bold text-lg cursor-pointer">✕</button>
        </div>

        <div className="space-y-4 text-xs font-semibold">
          <div className="bg-slate-100 p-3.5 rounded-xl border border-slate-300">
            <span className="text-slate-500 uppercase text-[10px] font-extrabold block mb-1">ANALISIS ALASAN TRIAGE</span>
            <p className="text-slate-800 text-xs leading-relaxed font-medium">{selectedTriageDetail.reason}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-300">
              <span className="text-slate-500 text-[10px] uppercase font-bold block mb-1">Petugas Saat Ini</span>
              <div className="font-extrabold text-slate-900">{selectedTriageDetail.currentAssignee}</div>
              <div className="text-slate-600 mt-0.5">Beban: {selectedTriageDetail.currentHours}</div>
            </div>

            <div className="p-3 bg-slate-100 rounded-xl border border-slate-400">
              <span className="text-slate-900 text-[10px] uppercase font-bold block mb-1">Kandidat Rekomendasi</span>
              <div className="font-extrabold text-slate-900">{selectedTriageDetail.proposedCandidate}</div>
              <div className="text-slate-700 mt-0.5">Skor Kecocokan: {selectedTriageDetail.score}</div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between gap-2 border-t border-slate-200 pt-4">
          <button 
            onClick={() => {
              setSelectedTriageDetail(null);
              setView('hr_employee_detail');
            }} 
            className="text-xs text-slate-800 font-bold hover:underline cursor-pointer"
          >
            ➔ Lihat Profil Lengkap Pegawai
          </button>

          <div className="flex gap-2">
            <button onClick={() => setSelectedTriageDetail(null)} className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer">
              Tutup
            </button>
            <button 
              onClick={() => handleApproveReassignment(selectedTriageDetail.id, selectedTriageDetail.proposedCandidate)}
              className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 cursor-pointer shadow-sm"
            >
              Approve Reassignment
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // ==========================================
  // 1. HALAMAN LOGIN
  // ==========================================
  if (view === 'login') {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col justify-between antialiased">
        {renderToast()}
        <header className="w-full px-8 py-5 flex justify-between items-center border-b border-slate-200 bg-white">
          <div className="flex items-center gap-2.5 font-bold tracking-tight text-lg">
            <div className="w-8 h-8 bg-[#0f172a] rounded-xl flex items-center justify-center text-white shadow-sm">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <span className="tracking-wider text-base font-extrabold text-slate-900">ALLOCALENS</span>
          </div>

          <div className="flex items-center gap-6 text-xs text-slate-600 font-semibold">
            <span className="flex items-center gap-2 bg-slate-100 px-3.5 py-1.5 rounded-full text-slate-800 font-bold border border-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-500"></span>
              Systems Operational
            </span>
            <button onClick={() => showToast("Navigating to Security Compliance")} className="hover:text-slate-900 transition cursor-pointer">Security Compliance</button>
            <button onClick={() => showToast("Opening SSO Help Documentation")} className="hover:text-slate-900 transition cursor-pointer">SSO Help</button>
          </div>
        </header>

        <main className="flex-1 flex flex-col justify-center items-center px-4 py-8 bg-slate-50">
          <div className="text-center mb-8">
            <div className="w-14 h-14 bg-[#0f172a] rounded-2xl flex items-center justify-center text-white mx-auto mb-4 shadow-md">
              <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">ALLOCALENS</h1>
            <p className="text-xs font-semibold text-slate-600 mt-2 max-w-sm leading-relaxed">
              Role-Based Resource Allocation & Decision Support System
            </p>
          </div>

          <div className="w-full max-w-[480px] bg-white rounded-3xl p-9 border border-slate-200 shadow-md">
            <div className="text-center mb-7">
              <h2 className="text-xl font-bold text-slate-900">Sign in to your account</h2>
              <p className="text-xs text-slate-600 font-medium mt-1 leading-relaxed">
                Enter your credentials or choose your assigned role
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2.5">
                SELECT ROLE WORKSPACE
              </label>
              <div className="grid grid-cols-2 gap-3 bg-slate-100 p-2 rounded-2xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setSelectedRoleWorkspace('hr')}
                  className={`p-3 rounded-xl text-left transition flex items-start gap-3 cursor-pointer ${
                    selectedRoleWorkspace === 'hr' ? 'bg-white shadow-sm border-2 border-slate-900' : 'bg-slate-50 border border-slate-300 hover:bg-white'
                  }`}
                >
                  <svg className="w-5 h-5 text-slate-900 mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 1 0 3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                  <div>
                    <div className="text-xs font-bold text-slate-900">HR / Manager</div>
                    <div className="text-xs text-slate-600 font-semibold mt-0.5">Executive View</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedRoleWorkspace('pm')}
                  className={`p-3 rounded-xl text-left transition flex items-start gap-3 cursor-pointer ${
                    selectedRoleWorkspace === 'pm' ? 'bg-white shadow-sm border-2 border-slate-900' : 'bg-slate-50 border border-slate-300 hover:bg-white'
                  }`}
                >
                  <svg className="w-5 h-5 text-slate-600 mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                    <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                    <path d="M9 14l2 2 4-4" />
                  </svg>
                  <div>
                    <div className="text-xs font-bold text-slate-800">Project Manager</div>
                    <div className="text-xs text-slate-600 font-medium mt-0.5">PM Portal</div>
                  </div>
                </button>
              </div>
            </div>

            <form className="space-y-4" onSubmit={handleLogin}>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Work Email Address</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500 font-bold text-sm">@</span>
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="w-full pl-9 pr-4 py-3 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0f172a]"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-bold text-slate-700">Password</label>
                  <button type="button" onClick={() => showToast("Password reset link sent to your email")} className="text-xs text-slate-900 font-bold hover:underline cursor-pointer">Forgot password?</button>
                </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </span>
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full pl-9 pr-10 py-3 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0f172a]"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-[#0f172a] hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-md mt-3 cursor-pointer"
              >
                <span>Sign In</span>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </button>
            </form>
          </div>
        </main>
      </div>
    );
  }

  // ==========================================
  // 2. HALAMAN PM PORTAL / WORKSPACE
  // ==========================================
  if (view === 'pm') {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 antialiased flex font-sans">
        {renderToast()}
        {renderSettingsModal()}
        {renderProfileModal()}

        {currentUser.role === 'hr' ? (
          renderHRSidebar()
        ) : (
          <aside className="w-64 bg-[#0f172a] text-slate-300 flex flex-col justify-between p-4 shrink-0 shadow-lg border-r border-slate-800">
            <div>
              <div className="mb-6 px-2">
                <h1 className="text-white font-extrabold tracking-wider text-base uppercase">ALLOCALENS</h1>
                <p className="text-xs text-slate-400 font-bold tracking-wide">PM PORTAL</p>
              </div>

              <div 
                onClick={() => setShowProfileModal(true)}
                className="bg-[#1e293b] p-3 rounded-xl flex items-center gap-3 mb-6 border border-slate-700 cursor-pointer hover:bg-slate-800 transition"
              >
                <div className="w-10 h-10 rounded-full bg-slate-800 text-white font-bold flex items-center justify-center border border-slate-600 text-xs shrink-0">
                  {currentUser.avatar}
                </div>
                <div className="overflow-hidden">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-white truncate">{currentUser.name}</h2>
                    <span className="text-[10px] bg-slate-700 text-slate-200 px-1.5 py-0.5 rounded font-extrabold">PM</span>
                  </div>
                  <p className="text-xs text-slate-300 font-medium truncate">{currentUser.roleName}</p>
                </div>
              </div>

              {/* NAVIGASI SIDEBAR PM DENGAN DUKUNGAN KLIK AKTIF */}
              <div className="space-y-1.5">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">PROJECT OPERATIONS</p>
                
                <button 
                  type="button"
                  onClick={() => {
                    setPmTab('all');
                    setTaskFilter('all');
                    setCurrentPage(1);
                    showToast("Dashboard View Active: Displaying All Tasks");
                  }} 
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold transition text-left cursor-pointer ${
                    pmTab === 'all' ? 'bg-slate-800 text-white border border-slate-600' : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                  }`}
                >
                  <svg className="w-4 h-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                  Dashboard
                </button>

                <button 
                  type="button"
                  onClick={() => {
                    setPmTab('tasks');
                    setTaskFilter('all');
                    setCurrentPage(1);
                    showToast("Tasks View Active: Viewing All Sprint Tasks");
                  }} 
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold transition text-left cursor-pointer ${
                    pmTab === 'tasks' ? 'bg-slate-800 text-white border border-slate-600' : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                  }`}
                >
                  <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                  Tasks
                </button>

                <button 
                  type="button"
                  onClick={() => {
                    setPmTab('candidates');
                    setTaskFilter('needs_candidates');
                    setCurrentPage(1);
                    showToast("Candidates View Active: Showing Unstaffed Tasks Needing Allocation");
                  }} 
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold transition text-left cursor-pointer ${
                    pmTab === 'candidates' ? 'bg-slate-800 text-white border border-slate-600' : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                  }`}
                >
                  <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 1 0 3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                  Candidates
                </button>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-slate-800">
              <div>
                <span className="text-xs bg-slate-800 text-slate-200 font-bold px-2.5 py-1 rounded border border-slate-700">RBAC: PM</span>
              </div>
              <button onClick={() => { setView('login'); showToast("Logged out successfully"); }} className="flex items-center gap-2 text-xs text-slate-300 hover:text-white font-bold px-1 cursor-pointer w-full text-left">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                Logout
              </button>
            </div>
          </aside>
        )}

        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between gap-4 shadow-sm">
            <div className="flex-1 max-w-2xl relative">
              <svg className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search project tasks, sprints, candidate matches..." 
                className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-10 pr-4 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-800 placeholder:text-slate-500"
              />
            </div>

            <div className="flex items-center gap-4">
              <div 
                onClick={() => setShowProfileModal(true)}
                className="flex items-center gap-1.5 text-xs text-slate-800 bg-slate-100 px-3 py-1.5 rounded-md font-bold border border-slate-300 cursor-pointer hover:bg-slate-200 transition"
              >
                <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>
                <span>Active User: <strong className="font-extrabold text-slate-900">{currentUser.name} ({currentUser.roleName})</strong></span>
              </div>

              <button onClick={() => showToast("No new notifications")} className="relative p-2 rounded-full text-slate-600 hover:bg-slate-100 border border-slate-200 cursor-pointer">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              </button>

              <div 
                onClick={() => setShowProfileModal(true)}
                className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs cursor-pointer hover:ring-2 hover:ring-slate-400 transition"
              >
                {currentUser.avatar}
              </div>
            </div>
          </header>

          <main className="flex-1 p-6 space-y-6 overflow-y-auto">
            <div>
              <div className="text-xs font-bold text-slate-600 flex items-center gap-1.5 mb-1">
                <span>Engineering & Infra Pod</span>
                <span>•</span>
                <span className="text-slate-900 font-extrabold">{sprintFilter}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Task Management & Candidate Allocation</h1>
                  <p className="text-xs font-semibold text-slate-600 mt-0.5">Manage sprint task specifications, deadlines, and review algorithmic candidate matches for unassigned work items.</p>
                </div>
                <button 
                  onClick={() => setShowAddTaskModal(true)}
                  className="bg-[#0f172a] hover:bg-slate-800 text-white px-4 py-2.5 rounded-lg text-xs font-bold flex items-center gap-2 shadow-md transition cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  Add New Task
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-xl border border-slate-300 shadow-sm relative">
                <div className="flex items-start justify-between">
                  <span className="text-xs font-extrabold text-slate-600 uppercase tracking-wider">ACTIVE POD TASKS</span>
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700 border border-slate-200">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="15" y2="16"/></svg>
                  </div>
                </div>
                <div className="mt-2">
                  <div className="text-3xl font-extrabold text-slate-900">{tasksList.length} Tasks</div>
                  <p className="text-xs font-semibold text-slate-600 mt-1">Across current 2-week sprint</p>
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-300 shadow-sm relative">
                <div className="flex items-start justify-between">
                  <span className="text-xs font-extrabold text-slate-600 uppercase tracking-wider">HIGH PRIORITY ITEMS</span>
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700 border border-slate-200">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  </div>
                </div>
                <div className="mt-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-slate-900">
                      {tasksList.filter(t => t.priority === 'Critical' || t.priority === 'High').length}
                    </span>
                    <span className="text-xs font-bold text-slate-600">Critical / High</span>
                  </div>
                  <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-900 text-xs font-extrabold rounded-md border border-slate-300">
                    <span className="w-2 h-2 rounded-full bg-slate-800"></span>
                    Urgent Attention Required
                  </div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-300 shadow-sm relative">
                <div className="flex items-start justify-between">
                  <span className="text-xs font-extrabold text-slate-600 uppercase tracking-wider">UNASSIGNED / NEEDS CANDIDATES</span>
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700 border border-slate-200">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
                  </div>
                </div>
                <div className="mt-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-slate-900">
                      {tasksList.filter(t => t.status === 'Needs Candidates').length} Tasks
                    </span>
                    <span className="text-xs font-bold text-slate-600">Unstaffed</span>
                  </div>
                  <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-900 text-xs font-extrabold rounded-md border border-slate-300">
                    <svg className="w-3.5 h-3.5 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M12 3l1.9 5.8a1 1 0 00.95.69h6.1l-4.94 3.6a1 1 0 00-.36 1.12l1.9 5.8-4.95-3.6a1 1 0 00-1.18 0l-4.95 3.6 1.9-5.8a1 1 0 00-.36-1.12L2.05 9.49h6.1a1 1 0 00.95-.69L12 3z"/></svg>
                    Requires matching
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-300 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 bg-slate-50">
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => { setTaskFilter('all'); setPmTab('tasks'); setCurrentPage(1); }}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold cursor-pointer transition ${taskFilter === 'all' ? 'bg-[#0f172a] text-white shadow-sm' : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'}`}
                  >
                    All Tasks ({tasksList.length})
                  </button>
                  <button 
                    onClick={() => { setTaskFilter('needs_candidates'); setPmTab('candidates'); setCurrentPage(1); }}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold cursor-pointer transition ${taskFilter === 'needs_candidates' ? 'bg-[#0f172a] text-white shadow-sm' : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'}`}
                  >
                    Needs Candidates ({tasksList.filter(t => t.status === 'Needs Candidates').length})
                  </button>
                  <button 
                    onClick={() => { setTaskFilter('high_priority'); setCurrentPage(1); }}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold cursor-pointer transition ${taskFilter === 'high_priority' ? 'bg-[#0f172a] text-white shadow-sm' : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'}`}
                  >
                    High Priority ({tasksList.filter(t => t.priority === 'Critical' || t.priority === 'High').length})
                  </button>
                  <button 
                    onClick={() => { setTaskFilter('in_progress'); setCurrentPage(1); }}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold cursor-pointer transition ${taskFilter === 'in_progress' ? 'bg-[#0f172a] text-white shadow-sm' : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'}`}
                  >
                    In Progress ({tasksList.filter(t => t.status === 'In Progress').length})
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <select 
                      value={sprintFilter} 
                      onChange={(e) => setSprintFilter(e.target.value)}
                      className="appearance-none bg-white border border-slate-300 rounded-md text-xs font-bold text-slate-800 py-1.5 pl-3 pr-8 focus:outline-none cursor-pointer shadow-sm"
                    >
                      <option value="Sprint 42">Current Sprint 42</option>
                      <option value="Sprint 41">Sprint 41 (Passed)</option>
                      <option value="Sprint 43">Sprint 43 (Upcoming)</option>
                    </select>
                    <svg className="w-3.5 h-3.5 text-slate-600 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
                  </div>
                </div>
              </div>

              {/* TABEL TASK */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs font-extrabold text-slate-700 uppercase tracking-wider bg-slate-100">
                      <th className="py-3 px-4">TASK ID</th>
                      <th className="py-3 px-4">TASK NAME & DESCRIPTION</th>
                      <th className="py-3 px-4">ASSIGNED TO</th>
                      <th className="py-3 px-4">COMPLEXITY</th>
                      <th className="py-3 px-4">PRIORITY</th>
                      <th className="py-3 px-4">WORKLOAD</th>
                      <th className="py-3 px-4 text-right">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-semibold text-slate-800">
                    {paginatedTasks.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="py-6 text-center text-slate-500 font-bold">
                          Tidak ada task yang cocok dengan pencarian atau filter.
                        </td>
                      </tr>
                    ) : paginatedTasks.map((t) => {
                      const isSelected = selectedTask && selectedTask.id === t.id;
                      return (
                        <tr 
                          key={t.id} 
                          onClick={() => { 
                            setSelectedTaskId(t.id); 
                            showToast(`Task ${t.id} dipilih`); 
                          }} 
                          className={`cursor-pointer transition-colors duration-150 ${
                            isSelected 
                              ? 'bg-slate-900 text-white shadow-inner' 
                              : 'hover:bg-slate-100 text-slate-800'
                          }`}
                        >
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-1 rounded text-xs font-extrabold ${isSelected ? 'bg-white text-slate-900' : 'bg-[#0f172a] text-white'}`}>
                                {t.id}
                              </span>
                              {isSelected && (
                                <span className="text-[10px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-700 text-white border border-slate-600">
                                  SELECTED
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className={`font-extrabold text-sm ${isSelected ? 'text-white' : 'text-slate-900'}`}>{t.name}</div>
                            <div className={`text-xs font-medium mt-0.5 ${isSelected ? 'text-slate-300' : 'text-slate-600'}`}>{t.desc}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`px-2.5 py-1 rounded border text-xs font-bold ${
                              isSelected 
                                ? 'bg-slate-800 text-slate-100 border-slate-700' 
                                : 'bg-slate-100 text-slate-900 border-slate-300'
                            }`}>
                              {t.assignedTo || 'Unassigned'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                              isSelected 
                                ? 'bg-slate-800 text-slate-100 border-slate-700' 
                                : 'bg-slate-100 text-slate-800 border-slate-300'
                            }`}>
                              {t.complexity}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${
                              isSelected 
                                ? 'bg-slate-800 text-white border-slate-700' 
                                : 'bg-slate-100 text-slate-900 border-slate-300'
                            }`}>
                              <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-white' : 'bg-slate-800'}`}></span>
                              {t.priority}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className={`font-bold text-xs ${isSelected ? 'text-slate-200' : 'text-slate-900'}`}>
                              {t.workload}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button 
                              type="button"
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                setSelectedTaskId(t.id); 
                                showToast(`Task ${t.id} dipilih`); 
                              }}
                              className={`px-3 py-1 border rounded font-bold transition text-xs cursor-pointer ${
                                isSelected 
                                  ? 'bg-white text-slate-900 border-white hover:bg-slate-200' 
                                  : 'bg-slate-100 border-slate-300 hover:bg-slate-900 hover:text-white text-slate-800'
                              }`}
                            >
                              {isSelected ? 'Active' : 'Select'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* PAGINATION REALTIME */}
              <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-between text-xs font-semibold text-slate-600 bg-slate-50">
                <div>
                  Showing <strong className="text-slate-900 font-bold">{paginatedTasks.length}</strong> of <strong className="text-slate-900 font-bold">{filteredTasks.length}</strong> project tasks
                </div>
                <div className="flex items-center gap-1.5">
                  <button 
                    type="button"
                    disabled={currentPage === 1}
                    onClick={handlePrevPage}
                    className={`px-3 py-1 border rounded font-bold transition ${currentPage === 1 ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-100 cursor-pointer'}`}
                  >
                    &lt; Prev
                  </button>

                  <span className="w-7 h-7 rounded bg-[#0f172a] text-white flex items-center justify-center font-bold">
                    {currentPage}
                  </span>

                  <button 
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={handleNextPage}
                    className={`px-3 py-1 border rounded font-bold transition ${currentPage >= totalPages ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-100 cursor-pointer'}`}
                  >
                    Next &gt;
                  </button>
                </div>
              </div>
            </div>

            {/* SELEKSI TASK AKTIF & REKOMENDASI KANDIDAT */}
            {selectedTask && (
              <div className="bg-white rounded-xl border border-slate-300 shadow-sm p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="bg-[#0f172a] text-white text-xs font-bold px-2.5 py-1 rounded tracking-wider">ACTIVE TASK SELECTION</span>
                    <span className="text-base font-extrabold text-slate-900">{selectedTask.id}: {selectedTask.name}</span>
                    <span className="text-slate-400">•</span>
                    <span className="text-xs text-slate-700 font-bold">{selectedTask.workload} Workload</span>
                    <span className="text-slate-400">•</span>
                    <span className="text-xs text-slate-700 font-bold">{selectedTask.priority} Priority</span>
                    <span className="text-slate-400">•</span>
                    <span className="text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
                      Assignee: {selectedTask.assignedTo || 'Unassigned'}
                    </span>
                  </div>
                  <span className="text-xs text-slate-700 font-extrabold bg-slate-100 px-3 py-1 rounded-full border border-slate-300">Top 3 Algorithmic Matches</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  {/* KANDIDAT 1: Elena Vance */}
                  <div className={`border-2 rounded-xl p-4 relative bg-white flex flex-col justify-between shadow-md transition-all ${
                    selectedTask.assignedTo === 'Elena Vance' ? 'border-slate-900 ring-1 ring-slate-900' : 'border-slate-200'
                  }`}>
                    <div>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-xs shadow-sm">EV</div>
                          <div>
                            <h3 className="font-extrabold text-slate-900 text-sm">Elena Vance</h3>
                            <p className="text-xs font-semibold text-slate-600">Senior Software Engineer</p>
                          </div>
                        </div>
                        <div className="bg-slate-100 text-slate-900 px-2.5 py-1 rounded-xl text-center border border-slate-300">
                          <div className="text-xs font-extrabold leading-tight">94%</div>
                          <div className="text-[9px] uppercase tracking-wider font-extrabold">Match</div>
                        </div>
                      </div>

                      <div className="mt-4">
                        <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                          <span>Availability Buffer</span>
                          <span className="text-slate-900 font-bold">Available (6.8h Buffer)</span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                          <div className="bg-slate-900 h-full w-[80%] rounded-full"></div>
                        </div>
                      </div>

                      <div className="mt-4">
                        <p className="text-xs font-extrabold text-slate-600 uppercase tracking-wider mb-2">VALIDATED SKILLS MATCH</p>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-800 font-semibold">
                          <div>Postgres <strong className="font-extrabold text-slate-900">95%</strong></div>
                          <div>Distributed Systems <strong className="font-extrabold text-slate-900">96%</strong></div>
                          <div>Architecture <strong className="font-extrabold text-slate-900">90%</strong></div>
                        </div>
                      </div>
                    </div>

                    <button 
                      type="button"
                      onClick={() => handleAssignCandidate(selectedTask.id, 'Elena Vance')}
                      className={`mt-5 w-full py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer shadow-sm active:scale-95 ${
                        selectedTask.assignedTo === 'Elena Vance'
                          ? 'bg-[#0f172a] text-white'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-300'
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
                      {selectedTask.assignedTo === 'Elena Vance' ? 'Assigned' : 'Assign Candidate'}
                    </button>
                  </div>

                  {/* KANDIDAT 2: Marcus Chen */}
                  <div className={`border rounded-xl p-4 bg-white flex flex-col justify-between shadow-sm transition-all ${
                    selectedTask.assignedTo === 'Marcus Chen' ? 'border-2 border-slate-900 ring-1 ring-slate-900' : 'border-slate-300 hover:border-slate-400'
                  }`}>
                    <div>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-800 font-bold flex items-center justify-center text-xs border border-slate-300">MC</div>
                          <div>
                            <h3 className="font-extrabold text-slate-900 text-sm">Marcus Chen</h3>
                            <p className="text-xs font-semibold text-slate-600">Staff Systems Architect</p>
                          </div>
                        </div>
                        <div className="bg-slate-100 text-slate-800 px-2.5 py-1 rounded-xl text-center border border-slate-300">
                          <div className="text-xs font-extrabold leading-tight">82%</div>
                          <div className="text-[9px] uppercase tracking-wider font-extrabold">Match</div>
                        </div>
                      </div>

                      <div className="mt-4">
                        <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                          <span>Availability Buffer</span>
                          <span className="text-slate-800">Tight (2.0h Buffer)</span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                          <div className="bg-slate-600 h-full w-[40%] rounded-full"></div>
                        </div>
                      </div>

                      <div className="mt-4">
                        <p className="text-xs font-extrabold text-slate-600 uppercase tracking-wider mb-2">VALIDATED SKILLS MATCH</p>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-800 font-semibold">
                          <div>Postgres <strong className="font-extrabold text-slate-900">98%</strong></div>
                          <div>Replication <strong className="font-extrabold text-slate-900">94%</strong></div>
                        </div>
                      </div>
                    </div>

                    <button 
                      type="button"
                      onClick={() => handleAssignCandidate(selectedTask.id, 'Marcus Chen')}
                      className={`mt-5 w-full py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer active:scale-95 ${
                        selectedTask.assignedTo === 'Marcus Chen'
                          ? 'bg-[#0f172a] text-white shadow-sm'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-300'
                      }`}
                    >
                      {selectedTask.assignedTo === 'Marcus Chen' ? 'Assigned' : 'Assign with Overload Notice'}
                    </button>
                  </div>

                  {/* KANDIDAT 3: Lucas Moreau */}
                  <div className={`border rounded-xl p-4 bg-white flex flex-col justify-between shadow-sm transition-all ${
                    selectedTask.assignedTo === 'Lucas Moreau' ? 'border-2 border-slate-900 ring-1 ring-slate-900' : 'border-slate-300 hover:border-slate-400'
                  }`}>
                    <div>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-800 font-bold flex items-center justify-center text-xs border border-slate-300">LM</div>
                          <div>
                            <h3 className="font-extrabold text-slate-900 text-sm">Lucas Moreau</h3>
                            <p className="text-xs font-semibold text-slate-600">Backend Engineer</p>
                          </div>
                        </div>
                        <div className="bg-slate-100 text-slate-800 px-2.5 py-1 rounded-xl text-center border border-slate-300">
                          <div className="text-xs font-extrabold leading-tight">76%</div>
                          <div className="text-[9px] uppercase tracking-wider font-extrabold">Match</div>
                        </div>
                      </div>

                      <div className="mt-4">
                        <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                          <span>Availability Buffer</span>
                          <span className="text-slate-800">Underutilized (21.0h Buffer)</span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                          <div className="bg-slate-800 h-full w-[95%] rounded-full"></div>
                        </div>
                      </div>

                      <div className="mt-4">
                        <p className="text-xs font-extrabold text-slate-600 uppercase tracking-wider mb-2">VALIDATED SKILLS MATCH</p>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-800 font-semibold">
                          <div>Postgres <strong className="font-extrabold text-slate-900">81%</strong></div>
                          <div>SQL Tuning <strong className="font-extrabold text-slate-900">78%</strong></div>
                        </div>
                      </div>
                    </div>

                    <button 
                      type="button"
                      onClick={() => handleAssignCandidate(selectedTask.id, 'Lucas Moreau')}
                      className={`mt-5 w-full py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer active:scale-95 ${
                        selectedTask.assignedTo === 'Lucas Moreau'
                          ? 'bg-[#0f172a] text-white shadow-sm'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-300'
                      }`}
                    >
                      {selectedTask.assignedTo === 'Lucas Moreau' ? 'Assigned' : 'Assign with Senior Support'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            <footer className="text-center text-xs text-slate-500 py-3 font-semibold border-t border-slate-200">
              © Allocalens Enterprise Workspace • Role Enforced: {currentUser.roleName}
            </footer>
          </main>
        </div>

        {/* Modal Add New Task */}
        {showAddTaskModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-300">
              <h2 className="text-lg font-extrabold text-slate-900 mb-4">Add New Task</h2>
              <form onSubmit={handleCreateTask} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Task Name</label>
                  <input 
                    required 
                    type="text" 
                    value={newTaskData.name}
                    onChange={(e) => setNewTaskData({ ...newTaskData, name: e.target.value })}
                    placeholder="e.g. Redis Cluster Integration" 
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-slate-800" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                  <input 
                    type="text" 
                    value={newTaskData.desc}
                    onChange={(e) => setNewTaskData({ ...newTaskData, desc: e.target.value })}
                    placeholder="Short description / technologies" 
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-slate-800" 
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Complexity</label>
                    <select 
                      value={newTaskData.complexity}
                      onChange={(e) => setNewTaskData({ ...newTaskData, complexity: e.target.value })}
                      className="w-full border border-slate-300 rounded-lg p-2 text-xs font-semibold"
                    >
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Priority</label>
                    <select 
                      value={newTaskData.priority}
                      onChange={(e) => setNewTaskData({ ...newTaskData, priority: e.target.value })}
                      className="w-full border border-slate-300 rounded-lg p-2 text-xs font-semibold"
                    >
                      <option value="Critical">Critical</option>
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Workload</label>
                    <input 
                      type="text" 
                      value={newTaskData.workload}
                      onChange={(e) => setNewTaskData({ ...newTaskData, workload: e.target.value })}
                      className="w-full border border-slate-300 rounded-lg p-2 text-xs font-semibold"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-3">
                  <button type="button" onClick={() => setShowAddTaskModal(false)} className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-[#0f172a] text-white rounded-lg text-xs font-bold hover:bg-slate-800 cursor-pointer">Create Task</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // 3. HALAMAN HR EXECUTIVE DASHBOARD
  // ==========================================
  if (view === 'hr_dashboard') {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 antialiased flex font-sans">
        {renderToast()}
        {renderHRSidebar()}
        {renderSettingsModal()}
        {renderCompareModal()}
        {renderTriageDetailModal()}
        {renderProfileModal()}

        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between gap-4 shadow-sm">
            <div className="flex-1 max-w-2xl relative">
              <svg className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search employees, tasks, departments, models..." 
                className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-10 pr-4 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-800 placeholder:text-slate-500"
              />
            </div>

            <div className="flex items-center gap-4">
              <span className="text-xs text-slate-600 font-extrabold">Analysis Engine</span>
              <div 
                onClick={() => setShowProfileModal(true)}
                className="flex items-center gap-1.5 text-xs text-slate-800 bg-slate-100 px-3 py-1.5 rounded-md font-bold border border-slate-300 cursor-pointer hover:bg-slate-200 transition"
              >
                <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>
                <span>{currentUser.name} ({currentUser.roleName})</span>
              </div>
              <div 
                onClick={() => setShowProfileModal(true)}
                className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs cursor-pointer hover:ring-2 hover:ring-slate-400 transition"
              >
                {currentUser.avatar}
              </div>
            </div>
          </header>

          <main className="flex-1 p-6 space-y-6 overflow-y-auto">
            <div>
              <div className="text-xs font-bold text-slate-600 flex items-center gap-1.5 mb-1">
                <span>Decision Support</span>
                <span>•</span>
                <span>Executive Overview</span>
                <span>•</span>
                <span className="text-slate-900 font-extrabold">Human-In-The-Loop Triage</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Executive Dashboard & Decision Support</h1>
                <button 
                  onClick={() => showToast(`System Allocation Check Completed. ${triageQueue.length} items currently require attention.`)}
                  className="bg-[#0f172a] hover:bg-slate-800 text-white px-4 py-2.5 rounded-lg text-xs font-bold flex items-center gap-2 shadow-md transition cursor-pointer"
                >
                  <svg className="w-4 h-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M12 3l1.9 5.8a1 1 0 00.95.69h6.1l-4.94 3.6a1 1 0 00-.36 1.12l1.9 5.8-4.95-3.6a1 1 0 00-1.18 0l-4.95 3.6 1.9-5.8a1 1 0 00-.36-1.12L2.05 9.49h6.1a1 1 0 00.95-.69L12 3z"/></svg>
                  Run System Allocation Check
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
              <div className="flex items-center gap-3 bg-white p-4 rounded-xl border border-slate-300 shadow-sm w-full">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 shrink-0 border border-slate-200">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/></svg>
                </div>
                <div>
                  <span className="text-xs text-slate-600 uppercase font-extrabold block">EVALUATION SPRINT</span>
                  <span className="font-extrabold text-slate-900 text-sm">Sprint 42 (Active Current Cycle)</span>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-white p-4 rounded-xl border border-slate-300 shadow-sm w-full">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 shrink-0 border border-slate-200">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                </div>
                <div>
                  <span className="text-xs text-slate-600 uppercase font-extrabold block">DEPARTMENT SCOPE</span>
                  <span className="font-extrabold text-slate-900 text-sm">All Pods (Engineering, Product, UX, Ops)</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-xl border border-slate-300 shadow-sm">
                <div className="flex items-center justify-between text-slate-600 mb-2">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700">TOTAL EMPLOYEES</span>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                </div>
                <div className="text-3xl font-extrabold text-slate-900">5,000</div>
                <p className="text-xs text-slate-600 font-semibold mt-1">4,850 active across pods</p>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-300 shadow-sm">
                <div className="flex items-center justify-between text-slate-600 mb-2">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700">TOTAL TASKS</span>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/></svg>
                </div>
                <div className="text-3xl font-extrabold text-slate-900">{tasksList.length}</div>
                <p className="text-xs text-slate-600 font-semibold mt-1">In-flight & queued | <strong className="text-slate-900">94% On-SLA</strong></p>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-300 shadow-sm">
                <div className="flex items-center justify-between text-slate-600 mb-2">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700">WORKLOAD UTILIZATION</span>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                </div>
                <div className="text-3xl font-extrabold text-slate-900">84.6% <span className="text-xs font-bold text-slate-600">/ 40h standard</span></div>
                <div className="w-full bg-slate-100 h-2 rounded-full mt-3 overflow-hidden border border-slate-200">
                  <div className="bg-slate-900 h-full w-[84%]"></div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-300 shadow-sm">
                <div className="flex items-center justify-between text-slate-600 mb-2">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700">FLAGGED BOTTLENECKS</span>
                  <svg className="w-4 h-4 text-slate-800" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>
                </div>
                <div className="text-3xl font-extrabold text-slate-900">{triageQueue.length} <span className="text-base font-bold text-slate-700">Queue Items</span></div>
                <p className="text-xs text-slate-600 font-semibold mt-1">Overallocated & Mismatches | <strong className="text-slate-900">Review Required</strong></p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl border border-slate-300 shadow-sm p-6 flex flex-col justify-between">
                <div>
                  <h2 className="text-base font-extrabold text-slate-900">Workforce Allocation Distribution</h2>
                  <p className="text-xs text-slate-600 font-semibold mt-0.5">Categorized headcount distribution across standard capacity thresholds and risk boundaries.</p>
                  
                  <div className="flex items-center justify-end gap-4 text-xs text-slate-700 font-bold my-4">
                    <span>Active Capacity Curve</span>
                    <span className="font-extrabold text-slate-900 border-b-2 border-slate-900 pb-0.5">Headcount</span>
                    <span>Hours</span>
                  </div>

                  <div className="flex items-center justify-around py-4">
                    <div className="relative w-36 h-36 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                        <path className="text-slate-200" strokeWidth="3.5" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                        <path className="text-slate-900" strokeDasharray="65, 100" strokeWidth="3.5" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                      </svg>
                      <div className="absolute text-center">
                        <span className="text-xl font-extrabold text-slate-900 block leading-tight">5,000</span>
                        <span className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">TOTAL STAFF</span>
                      </div>
                    </div>

                    <div className="space-y-3 text-xs">
                      <div className="flex items-center justify-between gap-8">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-slate-900"></span>
                          <span className="font-bold text-slate-800">Optimal Capacity</span>
                        </div>
                        <span className="font-extrabold text-slate-900">3,250 (65%)</span>
                      </div>
                      <p className="text-xs text-slate-600 font-medium pl-5">Standard 32h - 40h standard workload</p>

                      <div className="flex items-center justify-between gap-8 pt-1">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-slate-500"></span>
                          <span className="font-bold text-slate-800">Suboptimal / Variance</span>
                        </div>
                        <span className="font-extrabold text-slate-900">1,250 (25%)</span>
                      </div>
                      <p className="text-xs text-slate-600 font-medium pl-5">&lt;30h underutilized or approaching ceiling</p>

                      <div className="flex items-center justify-between gap-8 pt-1">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-slate-300 border border-slate-500"></span>
                          <span className="font-bold text-slate-800">Requires Reassignment</span>
                        </div>
                        <span className="font-extrabold text-slate-900">500 (10%)</span>
                      </div>
                      <p className="text-xs text-slate-600 font-medium pl-5">&gt;45h burnout risk or technical skill mismatch</p>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-100 border border-slate-300 rounded-xl p-3.5 flex items-center justify-between gap-3 mt-4">
                  <div className="flex items-center gap-2 text-xs">
                    <svg className="w-5 h-5 text-slate-800 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                    <div>
                      <span className="font-extrabold text-slate-900 block">WORKLOAD TELEMETRY INSIGHT</span>
                      <span className="text-slate-700 font-semibold">Platform Infrastructure pod operates at <strong className="text-slate-900 font-extrabold">94% aggregate capacity</strong>. 3 Senior ICs are sustained above 115% nominal workload.</span>
                    </div>
                  </div>
                  <button onClick={() => showToast("Filtering table for flagged staff")} className="bg-slate-900 text-white text-xs font-bold px-3 py-2 rounded-lg shrink-0 hover:bg-slate-800 transition cursor-pointer shadow-sm">
                    View Flagged Staff
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-300 shadow-sm p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-extrabold text-slate-900">Reassignment Decision Panel</h2>
                    <span className="text-xs text-slate-700 font-extrabold bg-slate-100 px-2.5 py-1 rounded border border-slate-300">
                      {triageQueue.length > 0 ? `1 / ${triageQueue.length}` : '0 Queue'}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-slate-600 mt-0.5">Urgent Reassignment Triage • TSK-802</p>

                  <div className="mt-4 border-b border-slate-200 pb-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-xs font-extrabold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-300">TSK-802</span>
                        <h3 className="text-sm font-extrabold text-slate-900 mt-1">Database System Migration (PostgreSQL to Aurora)</h3>
                      </div>
                      <span className="text-xs text-slate-900 font-bold bg-slate-100 px-2.5 py-1 rounded-md border border-slate-300">40h Scope • Due in 5 Days</span>
                    </div>
                    <p className="text-xs font-semibold text-slate-600 mt-1.5">Role: Senior IC Distributed Architecture • High SLA Severity</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 my-4">
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-300 text-center">
                      <span className="text-xs font-extrabold text-slate-600 uppercase tracking-wider block mb-2">CURRENT ASSIGNEE</span>
                      <div className="w-10 h-10 rounded-full bg-slate-200 mx-auto mb-2 flex items-center justify-center font-bold text-slate-800 text-xs border border-slate-300">DK</div>
                      <h4 className="text-xs font-extrabold text-slate-900">David Kim</h4>
                      <p className="text-xs text-slate-600 font-semibold">Lead Frontend IC</p>
                      <span className="inline-block mt-2 text-xs font-bold text-slate-900 bg-slate-200 px-2.5 py-0.5 rounded-full border border-slate-300">Overcapacity</span>
                      <p className="text-xs font-bold text-slate-700 mt-1">46.5 hrs / 116% cap</p>
                    </div>

                    <div 
                      className="bg-slate-100 p-3.5 rounded-xl border-2 border-slate-900 text-center relative cursor-pointer hover:bg-slate-200/60 transition" 
                      onClick={() => setView('hr_employee_detail')}
                    >
                      <span className="text-xs font-extrabold text-slate-900 uppercase tracking-wider block mb-2">PROPOSED CANDIDATE</span>
                      <div className="w-10 h-10 rounded-full bg-slate-900 text-white mx-auto mb-2 flex items-center justify-center font-bold text-xs shadow-sm">EV</div>
                      <h4 className="text-xs font-extrabold text-slate-900">Elena Vance</h4>
                      <p className="text-xs text-slate-600 font-semibold">Senior Software</p>
                      <span className="inline-block mt-2 text-xs font-bold text-slate-900 bg-slate-200 px-2.5 py-0.5 rounded-full border border-slate-300">Optimal Fit (83% cap)</span>
                      <p className="text-xs font-bold text-slate-800 mt-1">33.2 hrs (6.8h buffer)</p>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs">
                    <p className="text-xs font-extrabold text-slate-600 uppercase tracking-wider mb-1">DECISION VECTOR COMPARISON</p>
                    <div>
                      <div className="flex justify-between text-xs font-bold text-slate-800 mb-0.5">
                        <span>Skill & Competency</span>
                        <span>David 74% vs. Elena 94%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200">
                        <div className="bg-slate-900 h-full w-[94%]"></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-bold text-slate-800 mb-0.5">
                        <span>Workload Capacity</span>
                        <span>David 45% (Deficit) vs. Elena 88%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200">
                        <div className="bg-slate-900 h-full w-[88%]"></div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-100 p-3 rounded-lg border border-slate-300 mt-4 text-xs font-medium text-slate-700 leading-relaxed">
                    <span className="font-extrabold text-slate-900 block mb-1">Recommendation Rationale</span>
                    Reassignment relieves David Kim from 116% critical overcapacity burnout risk while deploying Elena Vance's proven PostgreSQL domain expertise and 6.8h idle headroom without schedule slippage.
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <button 
                    onClick={() => handleApproveReassignment('TSK-802', 'Elena Vance')}
                    className="w-full bg-[#0f172a] hover:bg-slate-800 text-white py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer shadow-md"
                  >
                    <svg className="w-4 h-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                    Approve Reassignment
                  </button>
                  <div className="flex gap-2 text-xs font-bold text-slate-700">
                    <button onClick={() => showToast("Allocation Confirmed")} className="flex-1 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 cursor-pointer text-center">Confirm Allocation</button>
                    <button onClick={() => showToast("Maintained Current Assignment")} className="flex-1 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 cursor-pointer text-center">Keep Current</button>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-300 shadow-sm overflow-hidden p-5">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <div>
                  <h2 className="text-base font-extrabold text-slate-900">Reassignment Triage Queue</h2>
                  <p className="text-xs font-semibold text-slate-600 mt-0.5">Automated candidate scoring prioritized by delivery risk, skill compatibility, and burnout triage.</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <svg className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    <input 
                      type="text" 
                      value={triageFilter}
                      onChange={(e) => setTriageFilter(e.target.value)}
                      placeholder="Filter tasks or engineers..." 
                      className="bg-slate-50 border border-slate-300 rounded-md text-xs font-semibold py-1.5 pl-8 pr-3 w-52 focus:outline-none" 
                    />
                  </div>
                  <button onClick={() => showToast(`Applied filters to queue. ${filteredTriageQueue.length} results.`)} className="flex items-center gap-1 bg-white border border-slate-300 text-slate-800 text-xs px-3 py-1.5 rounded-md font-bold cursor-pointer hover:bg-slate-100">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
                    Filter
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs font-extrabold text-slate-700 uppercase tracking-wider bg-slate-100">
                      <th className="py-3 px-4">TASK ID</th>
                      <th className="py-3 px-4">PRIMARY TRIGGER</th>
                      <th className="py-3 px-4">CURRENT ASSIGNEE</th>
                      <th className="py-3 px-4">PROPOSED CANDIDATE</th>
                      <th className="py-3 px-4">CANDIDATE SCORE</th>
                      <th className="py-3 px-4 text-right">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-semibold text-slate-800">
                    {filteredTriageQueue.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="py-6 text-center text-slate-500 font-bold">
                          Tidak ada item triage dalam antrean.
                        </td>
                      </tr>
                    ) : filteredTriageQueue.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50 transition">
                        <td className="py-3.5 px-4">
                          <div className="font-extrabold text-slate-900 text-xs">{item.id} {item.name}</div>
                          <div className="text-xs text-slate-600 font-medium">{item.details}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1 font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-300">
                            <svg className="w-3.5 h-3.5 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>
                            {item.trigger}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-slate-800 text-white flex items-center justify-center text-xs font-bold">
                              {item.currentAssignee.split(' ').map(n=>n[0]).join('')}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900">{item.currentAssignee}</div>
                              <div className="text-xs text-slate-600 font-medium">{item.currentHours}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold">
                              {item.proposedCandidate.split(' ').map(n=>n[0]).join('')}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900">{item.proposedCandidate}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="bg-slate-900 text-white px-2.5 py-1 rounded-full text-xs font-bold">Candidate Score {item.score}</span>
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-1">
                          <button 
                            onClick={() => handleApproveReassignment(item.id, item.proposedCandidate)}
                            className="bg-slate-900 hover:bg-slate-800 text-white text-xs px-2.5 py-1.5 rounded-md font-bold transition cursor-pointer shadow-sm"
                          >
                            Approve
                          </button>
                          <button 
                            onClick={() => setSelectedTriageDetail(item)} 
                            className="bg-slate-200 hover:bg-slate-300 text-slate-900 text-xs px-3 py-1.5 rounded-md font-bold transition cursor-pointer shadow-sm border border-slate-300"
                          >
                            Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-between text-xs font-semibold text-slate-600 mt-2 bg-slate-50">
                <div>Showing <strong className="text-slate-900 font-bold">{filteredTriageQueue.length}</strong> flagged reallocations</div>
                <div className="flex items-center gap-1.5">
                  <button className="px-2.5 py-1 bg-white border border-slate-300 rounded text-slate-400 font-bold" disabled>&lt; Prev</button>
                  <button className="w-7 h-7 rounded bg-[#0f172a] text-white flex items-center justify-center font-bold">1</button>
                  <button className="px-2.5 py-1 bg-white border border-slate-300 rounded text-slate-700 hover:bg-slate-100 font-bold cursor-pointer" onClick={() => showToast("Next page reached")}>Next &gt;</button>
                </div>
              </div>
            </div>

            <footer className="text-center text-xs text-slate-500 py-3 font-semibold border-t border-slate-200">
              © Allocalens Enterprise Workspace • Role Enforced: {currentUser.roleName}
            </footer>
          </main>
        </div>
      </div>
    );
  }

  // ==========================================
  // 4. HALAMAN HR - EMPLOYEE DETAIL PAGE
  // ==========================================
  if (view === 'hr_employee_detail') {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 antialiased flex font-sans">
        {renderToast()}
        {renderHRSidebar()}
        {renderSettingsModal()}
        {renderCompareModal()}
        {renderProfileModal()}

        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between gap-4 shadow-sm">
            <div className="flex-1 max-w-2xl relative">
              <svg className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input 
                type="text" 
                placeholder="Search employees, tasks, departments, models..." 
                className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-10 pr-4 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-800 placeholder:text-slate-500"
              />
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs text-slate-800 font-extrabold bg-slate-100 border border-slate-300 px-3 py-1.5 rounded-full">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-500 animate-pulse"></span>
                Algorithmic Engine: Active
              </div>
              <div 
                onClick={() => setShowProfileModal(true)}
                className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs cursor-pointer hover:ring-2 hover:ring-slate-400 transition"
              >
                {currentUser.avatar}
              </div>
            </div>
          </header>

          <main className="flex-1 p-6 space-y-6 overflow-y-auto">
            <div className="flex items-center justify-between text-xs text-slate-600">
              <div className="flex items-center gap-2 font-bold">
                <button onClick={() => setView('hr_dashboard')} className="hover:underline flex items-center gap-1 cursor-pointer text-slate-800">
                  Decision Support
                </button>
                <span>&gt;</span>
                <button onClick={() => setView('hr_dashboard')} className="hover:underline cursor-pointer text-slate-800">Employees</button>
                <span>&gt;</span>
                <strong className="text-slate-900 font-extrabold">Elena Vance</strong>
                <span className="bg-slate-200 text-slate-800 px-2 py-0.5 rounded font-mono text-xs font-bold">EMP-8842</span>
              </div>
              <div className="font-bold text-slate-700 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm flex items-center gap-2">
                <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                <span>Waktu System Realtime: <strong className="text-slate-900 font-mono font-extrabold">{currentTime} WIB</strong></span>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-300 shadow-sm p-6 flex flex-wrap items-center justify-between gap-6">
              <div className="flex items-center gap-5">
                <div className="w-20 h-20 rounded-2xl bg-slate-900 text-white font-extrabold text-2xl flex items-center justify-center relative shadow-md shrink-0">
                  EV
                  <span className="w-4 h-4 bg-slate-400 rounded-full border-2 border-white absolute bottom-1 right-1"></span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-extrabold text-slate-900">Elena Vance</h1>
                    <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded text-xs font-mono font-extrabold border border-slate-300">EMP-8842</span>
                    <span className="bg-slate-100 text-slate-800 px-2.5 py-0.5 rounded-md text-xs font-extrabold border border-slate-300">Sprint 42 Active</span>
                  </div>
                  <p className="text-sm font-extrabold text-slate-800 mt-1">Senior Software Engineer • Platform Infrastructure</p>
                  <div className="flex items-center gap-4 text-xs font-bold text-slate-600 mt-2">
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                      5 Yrs Tenured
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                      San Francisco (Remote)
                    </span>
                    <span>•</span>
                    <span className="text-slate-800 font-extrabold flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-slate-800"></span> Active Allocation Band
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-100 border border-slate-300 rounded-xl p-4 max-w-md w-full shadow-sm">
                <div className="flex items-center gap-2 text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                  <svg className="w-4 h-4 text-slate-800" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>
                  ALLOCATION STATUS: REQUIRES REASSIGNMENT
                </div>
                <p className="text-xs text-slate-800 mt-2 font-bold">
                  Triggered by critical system bottleneck triage: <button onClick={() => showToast("Opened TSK-944 details")} className="underline font-extrabold cursor-pointer">TSK-944 Global Failover</button>
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-300 shadow-sm relative">
                <div className="flex items-start justify-between">
                  <span className="text-xs font-extrabold text-slate-600 uppercase tracking-wider">SUITABILITY SCORE</span>
                  <span className="bg-slate-100 text-slate-900 text-xs font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-slate-300">
                    Top Match
                  </span>
                </div>
                <div className="mt-3">
                  <div className="text-3xl font-extrabold text-slate-900">92%</div>
                  <p className="text-xs text-slate-700 font-bold mt-1">+14% above squad baseline</p>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full mt-4 overflow-hidden border border-slate-200">
                  <div className="bg-slate-900 h-full w-[92%] rounded-full"></div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-300 shadow-sm">
                <div className="flex items-start justify-between">
                  <span className="text-xs font-extrabold text-slate-600 uppercase tracking-wider">WORKLOAD ALLOCATION</span>
                  <span className="text-xs font-extrabold text-slate-800 uppercase bg-slate-100 px-2 py-0.5 rounded">Optimal Band</span>
                </div>
                <div className="mt-3">
                  <div className="text-3xl font-extrabold text-slate-900">32 <span className="text-sm font-bold text-slate-600">/ 40 Hrs Wk</span></div>
                  <p className="text-xs text-slate-600 font-bold mt-1">(80% Utilized)</p>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full mt-4 overflow-hidden border border-slate-200">
                  <div className="bg-slate-900 h-full w-[80%] rounded-full"></div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-300 shadow-sm">
                <div className="flex items-start justify-between">
                  <span className="text-xs font-extrabold text-slate-600 uppercase tracking-wider">AVAILABLE IDLE HEADROOM</span>
                  <span className="bg-slate-100 text-slate-900 text-xs font-extrabold px-2.5 py-0.5 rounded-full border border-slate-300">
                    Deployable
                  </span>
                </div>
                <div className="mt-3">
                  <div className="text-3xl font-extrabold text-slate-900">8.0 <span className="text-sm font-bold text-slate-600">Hrs / Wk</span></div>
                  <p className="text-xs text-slate-700 font-bold mt-1 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-slate-800"></span> Deployable for TSK-944
                  </p>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-300 shadow-sm">
                <div className="flex items-start justify-between">
                  <span className="text-xs font-extrabold text-slate-600 uppercase tracking-wider">ACTIVE ASSIGNMENTS</span>
                  <span className="bg-slate-100 text-slate-900 text-xs font-extrabold px-2.5 py-0.5 rounded-full border border-slate-300">
                    1 Flagged
                  </span>
                </div>
                <div className="mt-3">
                  <div className="text-3xl font-extrabold text-slate-900">2 <span className="text-sm font-bold text-slate-600">Tasks</span></div>
                  <p className="text-xs text-slate-800 font-bold mt-1">➔ 1 task flagged for offloading</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl border border-slate-300 shadow-sm p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-base font-extrabold text-slate-900">Skill & Competency Breakdown</h2>
                      <p className="text-xs font-semibold text-slate-600 mt-0.5">Evaluated against task complexity requirements</p>
                    </div>
                    <span className="bg-slate-100 border border-slate-300 text-slate-900 text-xs font-extrabold px-3 py-1.5 rounded-full">
                      Senior Level Matched
                    </span>
                  </div>

                  <div className="space-y-4 mt-6">
                    <div>
                      <div className="flex justify-between text-xs font-extrabold text-slate-900 mb-1">
                        <span>Technical Skill Score</span>
                        <span>88%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200 mb-2">
                        <div className="bg-slate-900 h-full w-[88%] rounded-full"></div>
                      </div>
                      <div className="flex flex-wrap gap-1.5 text-xs font-bold">
                        <span className="bg-slate-100 text-slate-800 border border-slate-300 px-2.5 py-0.5 rounded-md">Postgres 16</span>
                        <span className="bg-slate-100 text-slate-800 border border-slate-300 px-2.5 py-0.5 rounded-md">Distributed Systems</span>
                        <span className="bg-slate-100 text-slate-800 border border-slate-300 px-2.5 py-0.5 rounded-md">Python</span>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-extrabold text-slate-900 mb-1">
                        <span>Problem Solving Score</span>
                        <span>90%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200 mb-2">
                        <div className="bg-slate-900 h-full w-[90%] rounded-full"></div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 mt-6 border-t border-slate-200 flex items-center justify-between text-xs font-bold">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-800"></span>
                    <span className="text-slate-600">Target Baseline:</span>
                    <strong className="text-slate-900 font-extrabold">75% Minimum Requirement</strong>
                  </div>
                  <span className="text-slate-900 font-extrabold">100% Target Met</span>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-300 shadow-sm p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-slate-800" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M12 3l1.9 5.8a1 1 0 00.95.69h6.1l-4.94 3.6a1 1 0 00-.36 1.12l1.9 5.8-4.95-3.6a1 1 0 00-1.18 0l-4.95 3.6 1.9-5.8a1 1 0 00-.36-1.12L2.05 9.49h6.1a1 1 0 00.95-.69L12 3z"/></svg>
                    <h2 className="text-base font-extrabold text-slate-900">Decision Support & Rationale</h2>
                  </div>
                  <p className="text-xs font-semibold text-slate-600 mt-0.5">Algorithmic recommendation engine analysis for reassignment</p>

                  <div className="bg-slate-50 border border-slate-300 rounded-xl p-4 mt-4">
                    <div className="flex items-center gap-2">
                      <span className="bg-slate-200 text-slate-900 font-extrabold text-xs px-2.5 py-0.5 rounded border border-slate-300 uppercase">Target Task</span>
                      <strong className="text-xs text-slate-900 font-extrabold">TSK-944 Global Failover Architecture (12 Hrs/Wk)</strong>
                    </div>
                    <p className="text-xs text-slate-700 font-medium mt-2 leading-relaxed">
                      PostgreSQL multi-region master election failure risk identified in Production Pod Beta. Elena Vance has the lowest friction transition score across 14 eligible senior engineers.
                    </p>
                  </div>
                </div>

                <div className="pt-6 flex items-center justify-between gap-3 border-t border-slate-200 mt-4">
                  <button onClick={() => setShowCompareModal(true)} className="flex items-center gap-1.5 text-xs text-slate-800 font-extrabold hover:text-black transition cursor-pointer">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M16 3h5v5"/><path d="M8 3H3v5"/><path d="M21 3l-7 7"/><path d="M3 3l7 7"/></svg>
                    Compare Candidates
                  </button>

                  <div className="flex items-center gap-2">
                    <button onClick={() => showToast("Confirmed current allocation")} className="bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-xs font-bold px-4 py-2 rounded-lg transition cursor-pointer">
                      Confirm Current
                    </button>
                    <button onClick={() => showToast("Reassignment Approved for Elena Vance!")} className="bg-[#0f172a] hover:bg-slate-800 text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 shadow-md transition cursor-pointer">
                      <svg className="w-4 h-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                      Approve Reassignment
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <footer className="text-center text-xs text-slate-500 py-3 font-semibold border-t border-slate-200">
              © Allocalens Enterprise Workspace • Role Enforced: {currentUser.roleName}
            </footer>
          </main>
        </div>
      </div>
    );
  }

  // ==========================================
  // 5. HALAMAN HR - ALLOCATION ANALYSIS
  // ==========================================
  if (view === 'hr_analysis') {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 antialiased flex font-sans">
        {renderToast()}
        {renderHRSidebar()}
        {renderSettingsModal()}
        {renderCompareModal()}
        {renderProfileModal()}

        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between gap-4 shadow-sm">
            <div className="flex-1 max-w-2xl relative">
              <svg className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input type="text" placeholder="Search analysis models, metrics..." className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-10 pr-4 py-2 text-xs font-semibold focus:outline-none" />
            </div>

            <div 
              onClick={() => setShowProfileModal(true)}
              className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs cursor-pointer hover:ring-2 hover:ring-slate-400 transition"
            >
              {currentUser.avatar}
            </div>
          </header>

          <main className="flex-1 p-6 space-y-6 overflow-y-auto">
            <div>
              <span className="text-xs font-bold text-slate-500">Decision Support • Analytics</span>
              <h1 className="text-2xl font-extrabold text-slate-900">Allocation Analysis Engine</h1>
              <p className="text-xs text-slate-600 font-semibold mt-1">Deep-dive predictive workload telemetry and capacity risk analytics across organizational pods.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-300 shadow-sm">
                <h3 className="text-sm font-extrabold text-slate-900 mb-2">Overcapacity Risk Variance</h3>
                <div className="text-3xl font-extrabold text-slate-900">12.4%</div>
                <p className="text-xs text-slate-600 mt-1">Engineering pods exceeding standard threshold limits.</p>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-300 shadow-sm">
                <h3 className="text-sm font-extrabold text-slate-900 mb-2">Average Skill Gap Index</h3>
                <div className="text-3xl font-extrabold text-slate-900">4.2 / 100</div>
                <p className="text-xs text-slate-600 mt-1">High compatibility rating across active sprint assignments.</p>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-300 shadow-sm">
                <h3 className="text-sm font-extrabold text-slate-900 mb-2">Efficiency Savings Potential</h3>
                <div className="text-3xl font-extrabold text-slate-900">320 hrs/sprint</div>
                <p className="text-xs text-slate-600 mt-1">Deploying AI reallocations reduces engineering burnout bottlenecks.</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-300 shadow-sm">
              <h3 className="text-base font-extrabold text-slate-900 mb-4">Pod Workload Health Distribution</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-800 mb-1">
                    <span>Engineering & Infra Pod</span>
                    <span>94% Capacity (High Risk)</span>
                  </div>
                  <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden border border-slate-200">
                    <div className="bg-slate-900 h-full w-[94%]"></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-800 mb-1">
                    <span>Product & Design Pod</span>
                    <span>72% Capacity (Optimal)</span>
                  </div>
                  <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden border border-slate-200">
                    <div className="bg-slate-600 h-full w-[72%]"></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-800 mb-1">
                    <span>Operations Pod</span>
                    <span>58% Capacity (Available Buffer)</span>
                  </div>
                  <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden border border-slate-200">
                    <div className="bg-slate-400 h-full w-[58%]"></div>
                  </div>
                </div>
              </div>
            </div>

            <footer className="text-center text-xs text-slate-500 py-3 font-semibold border-t border-slate-200">
              © Allocalens Enterprise Workspace • Role Enforced: {currentUser.roleName}
            </footer>
          </main>
        </div>
      </div>
    );
  }

  // ==========================================
  // 6. HALAMAN HR - ALLOCATION STATUS
  // ==========================================
  if (view === 'hr_status') {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 antialiased flex font-sans">
        {renderToast()}
        {renderHRSidebar()}
        {renderSettingsModal()}
        {renderCompareModal()}
        {renderProfileModal()}

        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between gap-4 shadow-sm">
            <div className="flex-1 max-w-2xl relative">
              <svg className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input type="text" placeholder="Search allocation statuses..." className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-10 pr-4 py-2 text-xs font-semibold focus:outline-none" />
            </div>

            <div 
              onClick={() => setShowProfileModal(true)}
              className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs cursor-pointer hover:ring-2 hover:ring-slate-400 transition"
            >
              {currentUser.avatar}
            </div>
          </header>

          <main className="flex-1 p-6 space-y-6 overflow-y-auto">
            <div>
              <span className="text-xs font-bold text-slate-500">Decision Support • Status</span>
              <h1 className="text-2xl font-extrabold text-slate-900">Allocation Status Monitor</h1>
              <p className="text-xs text-slate-600 font-semibold mt-1">Real-time status breakdown for all active resource assignments and staffing levels.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-300 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-300 text-slate-900 font-extrabold flex items-center justify-center text-lg">3,250</div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">Optimal Staffing</h3>
                  <p className="text-xs text-slate-600">65% of total organization workforce</p>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-300 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-300 text-slate-800 font-extrabold flex items-center justify-center text-lg">1,250</div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">Suboptimal / Variance</h3>
                  <p className="text-xs text-slate-600">Underutilized or approaching limit</p>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-300 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-slate-200 border border-slate-400 text-slate-900 font-extrabold flex items-center justify-center text-lg">500</div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">Requires Reassignment</h3>
                  <p className="text-xs text-slate-600">Flagged for immediate intervention</p>
                </div>
              </div>
            </div>

            <footer className="text-center text-xs text-slate-500 py-3 font-semibold border-t border-slate-200">
              © Allocalens Enterprise Workspace • Role Enforced: {currentUser.roleName}
            </footer>
          </main>
        </div>
      </div>
    );
  }

  // ==========================================
  // 7. HALAMAN HR - RECOMMENDATIONS PANEL
  // ==========================================
  if (view === 'hr_recommendations') {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 antialiased flex font-sans">
        {renderToast()}
        {renderHRSidebar()}
        {renderSettingsModal()}
        {renderCompareModal()}
        {renderProfileModal()}

        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between gap-4 shadow-sm">
            <div className="flex-1 max-w-2xl relative">
              <svg className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input type="text" placeholder="Search recommendations..." className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-10 pr-4 py-2 text-xs font-semibold focus:outline-none" />
            </div>

            <div 
              onClick={() => setShowProfileModal(true)}
              className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs cursor-pointer hover:ring-2 hover:ring-slate-400 transition"
            >
              {currentUser.avatar}
            </div>
          </header>

          <main className="flex-1 p-6 space-y-6 overflow-y-auto">
            <div>
              <span className="text-xs font-bold text-slate-500">Decision Support • Recommendations</span>
              <h1 className="text-2xl font-extrabold text-slate-900">AI Recommendations Feed</h1>
              <p className="text-xs text-slate-600 font-semibold mt-1">Prescriptive AI-generated allocation suggestions to optimize sprint velocity and staff health.</p>
            </div>

            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-slate-300 p-5 shadow-sm flex items-start justify-between gap-4">
                <div>
                  <span className="bg-[#0f172a] text-white text-[10px] font-extrabold px-2 py-0.5 rounded uppercase">HIGH IMPACT</span>
                  <h3 className="text-sm font-extrabold text-slate-900 mt-2">Reassign TSK-802 to Elena Vance</h3>
                  <p className="text-xs text-slate-600 mt-1">Reduces David Kim's workload from 116% to 84% capacity while matching 94% Postgres expertise.</p>
                </div>
                <button onClick={() => { setView('hr_dashboard'); showToast("Navigated to Triage Decision Panel"); }} className="bg-[#0f172a] hover:bg-slate-800 text-white text-xs font-bold px-4 py-2 rounded-lg cursor-pointer shrink-0">
                  Execute Triage
                </button>
              </div>

              <div className="bg-white rounded-2xl border border-slate-300 p-5 shadow-sm flex items-start justify-between gap-4">
                <div>
                  <span className="bg-slate-700 text-white text-[10px] font-extrabold px-2 py-0.5 rounded uppercase">MEDIUM IMPACT</span>
                  <h3 className="text-sm font-extrabold text-slate-900 mt-2">Pair Lucas Moreau with Senior Architect on TSK-689</h3>
                  <p className="text-xs text-slate-600 mt-1">Allows underutilized capacity (21h headroom) to be deployed safely on high-complexity task.</p>
                </div>
                <button onClick={() => showToast("Recommendation saved for Sprint 43")} className="bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-300 text-xs font-bold px-4 py-2 rounded-lg cursor-pointer shrink-0">
                  Queue for Sprint 43
                </button>
              </div>
            </div>

            <footer className="text-center text-xs text-slate-500 py-3 font-semibold border-t border-slate-200">
              © Allocalens Enterprise Workspace • Role Enforced: {currentUser.roleName}
            </footer>
          </main>
        </div>
      </div>
    );
  }

  return null;
}

export default App;