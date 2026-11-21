/* ═══════════════════════════════════════════
   EXPENSE TRACKER v3 — app.js (Complete)
   Features: Auth, CRUD, Charts, Dark/AMOLED,
   Accent themes, Goals, Notifications, Heatmap,
   Sparklines, Confetti, Context menu, CSV export,
   Number counter animation, Password strength,
   Onboarding, Budget alerts, Profile editing
   ═══════════════════════════════════════════ */

/* ────── CATEGORY META ────── */
const CAT = {
  'Food & Dining': { icon:'🍽️', cls:'food',   color:'#F59E0B', bg:'#FEF3C7' },
  'Utilities':     { icon:'📶', cls:'util',   color:'#2563EB', bg:'#DBEAFE' },
  'Education':     { icon:'🎓', cls:'edu',    color:'#7C3AED', bg:'#EDE9FE' },
  'Health':        { icon:'💊', cls:'health', color:'#059669', bg:'#D1FAE5' },
  'Entertainment': { icon:'🎬', cls:'ent',    color:'#DB2777', bg:'#FCE7F3' },
  'Transport':     { icon:'🚗', cls:'trans',  color:'#CA8A04', bg:'#FEF9C3' },
  'Shopping':      { icon:'🛍️', cls:'food',   color:'#D97706', bg:'#FEF3C7' },
  'Other':         { icon:'📦', cls:'edu',    color:'#6B7280', bg:'#F3F4F6' }
};

/* ────── STATE ────── */
let S = {
  user: null, expenses: [], budget: 20000,
  goals: [], notifications: [], dark: 'light',
  accent: 'blue', onboarded: false,
  editId: null, deleteId: null,
  ctxId: null, goalEditId: null
};

let barChart = null, pieChart = null;
let obStep = 0;
const OB_STEPS = [
  { icon:'💳', title:'Welcome to Expense Tracker', sub:'Track every rupee, manage budgets, and build a brighter financial future — all in one place.' },
  { icon:'📊', title:'Smart Insights at a Glance', sub:'See your spending heatmap, category breakdown and 6-month trends powered by beautiful charts.' },
  { icon:'🎯', title:'Set Goals & Budget', sub:'Define your monthly budget, set savings goals, and get notified before you overspend.' }
];

/* ════════════════════════════
   INIT
════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  loadState();
  applyTheme();
  applyAccent();
  if (S.user) { enterApp(); }
  else { showPage('page-signup'); }
  setupForms();
  setTodayDate();
  setupContextMenu();
});

/* ════════════════════════════
   PERSISTENCE
════════════════════════════ */
function loadState() {
  try {
    const raw = localStorage.getItem('et_v3');
    if (raw) S = { ...S, ...JSON.parse(raw) };
  } catch(e) {}
}
function save() {
  const { user, expenses, budget, goals, notifications, dark, accent, onboarded } = S;
  localStorage.setItem('et_v3', JSON.stringify({ user, expenses, budget, goals, notifications, dark, accent, onboarded }));
}

/* ════════════════════════════
   PAGE / NAV ROUTING
════════════════════════════ */
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => { p.classList.remove('active'); p.style.display = ''; });
  const pg = document.getElementById(id);
  if (!pg) return;
  pg.classList.add('active');
  pg.style.display = id === 'page-app' ? 'flex' : 'flex';
}

function enterApp() {
  showPage('page-app');
  updateSidebarUser();
  syncThemeRadios();
  // Show onboarding on first login
  if (!S.onboarded) { setTimeout(showOnboarding, 600); }
  navTo('dashboard');
}

function logout() {
  S.user = null; save();
  if (barChart) { barChart.destroy(); barChart = null; }
  if (pieChart) { pieChart.destroy(); pieChart = null; }
  showPage('page-signup');
}

const SEC_MAP = {
  dashboard:'sec-dashboard', expenses:'sec-expenses',
  'add-expense':'sec-add-expense', categories:'sec-categories',
  budget:'sec-budget', goals:'sec-goals', reports:'sec-reports', profile:'sec-profile'
};
const SEC_LABEL = {
  dashboard:'WORKSPACE', expenses:'MAIN NAVIGATION', 'add-expense':'MAIN NAVIGATION',
  categories:'MAIN NAVIGATION', budget:'MAIN NAVIGATION', goals:'MAIN NAVIGATION',
  reports:'MAIN NAVIGATION', profile:'MAIN NAVIGATION'
};

function navTo(section) {
  document.querySelectorAll('.app-section').forEach(s => s.style.display = 'none');
  document.querySelectorAll('#sidebar-nav a').forEach(a => a.classList.toggle('active', a.dataset.nav === section));
  const el = document.getElementById(SEC_MAP[section]);
  if (el) el.style.display = 'block';
  const lbl = document.getElementById('sidebar-section-label');
  if (lbl) lbl.textContent = SEC_LABEL[section] || 'WORKSPACE';
  document.getElementById('sidebar')?.classList.remove('open');
  // Render
  if (section === 'dashboard')    renderDashboard();
  if (section === 'expenses')     renderExpenses();
  if (section === 'categories')   renderCategories();
  if (section === 'budget')       renderBudget();
  if (section === 'goals')        renderGoals();
  if (section === 'reports')      renderReports();
  if (section === 'profile')      renderProfile();
  if (section === 'add-expense' && !S.editId) resetAddForm();
  // Update FAB visibility
  const fab = document.querySelector('.fab');
  if (fab) fab.style.display = ['dashboard','expenses','categories','budget','goals','reports','profile'].includes(section) ? 'flex' : 'none';
}

function toggleSidebar() {
  document.getElementById('sidebar')?.classList.toggle('open');
}

/* ════════════════════════════
   THEME / ACCENT
════════════════════════════ */
function applyTheme() {
  document.documentElement.setAttribute('data-theme', S.dark || 'light');
  const sw = document.getElementById('dark-switch');
  const lbl = document.getElementById('dark-label');
  const isDark = S.dark !== 'light';
  if (sw) sw.classList.toggle('on', isDark);
  if (lbl) {
    if (S.dark === 'dark')   lbl.textContent = '☀️ Light Mode';
    else if (S.dark === 'amoled') lbl.textContent = '⚫ AMOLED';
    else                     lbl.textContent = '🌙 Dark Mode';
  }
}
function cycleDark() {
  const modes = ['light','dark','amoled'];
  S.dark = modes[(modes.indexOf(S.dark) + 1) % modes.length];
  applyTheme(); syncThemeRadios(); save();
  if (isSecVisible('sec-reports')) renderReports();
}
function setTheme(t) { S.dark = t; applyTheme(); save(); if (isSecVisible('sec-reports')) renderReports(); }
function syncThemeRadios() {
  document.querySelectorAll('input[name="theme"]').forEach(r => { r.checked = r.value === S.dark; });
}
function applyAccent() {
  document.documentElement.setAttribute('data-accent', S.accent || 'blue');
  document.querySelectorAll('.theme-dot').forEach(d => d.classList.toggle('active', d.dataset.accent === S.accent));
}
function setAccent(a) {
  S.accent = a; applyAccent(); save();
  if (isSecVisible('sec-reports')) renderReports();
}
function isSecVisible(id) {
  const el = document.getElementById(id);
  return el && el.style.display !== 'none';
}

/* ════════════════════════════
   AUTH FORMS
════════════════════════════ */
function setupForms() {
  document.getElementById('signup-form').addEventListener('submit', e => {
    e.preventDefault();
    const name = v('su-name'), email = v('su-email'), pass = v('su-pass');
    let ok = true;
    if (!name)           { se('su-name-err','su-name'); ok=false; } else he('su-name-err','su-name');
    if (!isEmail(email)) { se('su-email-err','su-email'); ok=false; } else he('su-email-err','su-email');
    if (pass.length < 8) { se('su-pass-err','su-pass'); ok=false; } else he('su-pass-err','su-pass');
    if (!ok) return;
    S.user = { name, email, password: pass };
    if (!S.expenses.length) seedDemo();
    S.notifications = [
      { id: uid(), icon:'🎉', title:'Welcome!', text:'Account created successfully.', time: now(), unread: true },
      { id: uid(), icon:'💡', title:'Tip', text:'Set your monthly budget to track spending.', time: now(), unread: true }
    ];
    save();
    showToast('Welcome, ' + name + '! 🎉', 'success');
    enterApp();
  });

  document.getElementById('login-form').addEventListener('submit', e => {
    e.preventDefault();
    const email = v('li-email'), pass = v('li-pass');
    const alertEl = document.getElementById('login-alert');
    let ok = true;
    if (!isEmail(email)) { se('li-email-err','li-email'); ok=false; } else he('li-email-err','li-email');
    if (!pass)           { se('li-pass-err','li-pass');   ok=false; } else he('li-pass-err','li-pass');
    if (!ok) return;
    if (S.user && S.user.email === email && S.user.password === pass) {
      alertEl.classList.add('hidden');
      showToast('Welcome back, ' + S.user.name + '! 👋', 'success');
      enterApp();
    } else {
      alertEl.classList.remove('hidden');
      alertEl.textContent = '⚠ Invalid email or password';
    }
  });

  document.getElementById('add-exp-form').addEventListener('submit', e => { e.preventDefault(); submitExpense(); });
  document.getElementById('profile-form')?.addEventListener('submit', e => { e.preventDefault(); saveProfile(); });
}

// Password strength
function checkStrength(p) {
  const fill  = document.getElementById('strength-fill');
  const label = document.getElementById('strength-label');
  if (!fill || !label) return;
  let score = 0;
  if (p.length >= 8)  score++;
  if (p.length >= 12) score++;
  if (/[A-Z]/.test(p)) score++;
  if (/[0-9]/.test(p)) score++;
  if (/[^A-Za-z0-9]/.test(p)) score++;
  const map = [
    { w:'0%',   color:'var(--border)',  lbl:'' },
    { w:'25%',  color:'var(--red)',     lbl:'Weak 😟' },
    { w:'50%',  color:'var(--orange)',  lbl:'Fair 😐' },
    { w:'75%',  color:'var(--blue)',    lbl:'Good 👍' },
    { w:'100%', color:'var(--green)',   lbl:'Strong 💪' }
  ];
  const m = map[Math.min(score, 4)];
  fill.style.width    = m.w;
  fill.style.background = m.color;
  label.textContent   = m.lbl;
  label.style.color   = m.color;
}

function togglePwd(id, btn) {
  const inp = document.getElementById(id);
  if (!inp) return;
  inp.type = inp.type === 'password' ? 'text' : 'password';
  btn.textContent = inp.type === 'password' ? '👁' : '🙈';
}

/* ════════════════════════════
   SEED DEMO
════════════════════════════ */
function seedDemo() {
  const d = (mo, day) => new Date(new Date().getFullYear(), new Date().getMonth() + mo, day).toISOString().split('T')[0];
  S.expenses = [
    { id:uid(), date:d(0,27),  desc:'Grocery shopping',   category:'Food & Dining', amount:1250, payment:'Cash',        status:'Paid',    notes:'' },
    { id:uid(), date:d(0,28),  desc:'Internet bill',       category:'Utilities',     amount:999,  payment:'UPI',         status:'Paid',    notes:'' },
    { id:uid(), date:d(0,29),  desc:'College supplies',    category:'Education',     amount:650,  payment:'Debit Card',  status:'Pending', notes:'' },
    { id:uid(), date:d(0,20),  desc:'Movie tickets',       category:'Entertainment', amount:480,  payment:'UPI',         status:'Paid',    notes:'' },
    { id:uid(), date:d(0,15),  desc:'Gym membership',      category:'Health',        amount:1500, payment:'Credit Card', status:'Paid',    notes:'' },
    { id:uid(), date:d(0,10),  desc:'Uber ride',           category:'Transport',     amount:340,  payment:'UPI',         status:'Paid',    notes:'' },
    { id:uid(), date:d(0,5),   desc:'Amazon order',        category:'Shopping',      amount:3231, payment:'Credit Card', status:'Paid',    notes:'' },
    { id:uid(), date:d(0,1),   desc:'Electricity bill',    category:'Utilities',     amount:2100, payment:'Net Banking', status:'Paid',    notes:'' },
    { id:uid(), date:d(0,3),   desc:'Restaurant dinner',   category:'Food & Dining', amount:900,  payment:'Cash',        status:'Paid',    notes:'' },
    { id:uid(), date:d(0,8),   desc:'Doctor visit',        category:'Health',        amount:1000, payment:'Cash',        status:'Paid',    notes:'' },
    { id:uid(), date:d(-1,22), desc:'Pizza party',         category:'Food & Dining', amount:780,  payment:'UPI',         status:'Paid',    notes:'' },
    { id:uid(), date:d(-1,10), desc:'Mobile recharge',     category:'Utilities',     amount:299,  payment:'UPI',         status:'Paid',    notes:'' },
    { id:uid(), date:d(-2,15), desc:'Bus pass',            category:'Transport',     amount:500,  payment:'Cash',        status:'Paid',    notes:'' },
    { id:uid(), date:d(-2,5),  desc:'Books',               category:'Education',     amount:1200, payment:'Debit Card',  status:'Paid',    notes:'' },
    { id:uid(), date:d(-3,25), desc:'Gym registration',    category:'Health',        amount:3000, payment:'Credit Card', status:'Paid',    notes:'' },
    { id:uid(), date:d(-3,18), desc:'Concert tickets',     category:'Entertainment', amount:1500, payment:'Credit Card', status:'Paid',    notes:'' },
  ];
  S.goals = [
    { id:uid(), name:'New Phone',   icon:'📱', target:50000, saved:18000 },
    { id:uid(), name:'Vacation',    icon:'✈️',  target:80000, saved:25000 },
    { id:uid(), name:'Emergency Fund', icon:'🏦', target:100000, saved:40000 },
  ];
}

/* ════════════════════════════
   ONBOARDING
════════════════════════════ */
function showOnboarding() {
  obStep = 0;
  updateOnboardStep();
  document.getElementById('onboard-overlay')?.classList.remove('hidden');
}
function updateOnboardStep() {
  const step = OB_STEPS[obStep];
  const steps = document.getElementById('onboard-steps');
  document.getElementById('ob-icon').textContent  = step.icon;
  document.getElementById('ob-title').textContent = step.title;
  document.getElementById('ob-sub').textContent   = step.sub;
  if (steps) {
    steps.querySelectorAll('.onboard-step').forEach((s,i) => s.classList.toggle('active', i === obStep));
  }
  const btn = document.getElementById('ob-btn');
  if (btn) btn.textContent = obStep === OB_STEPS.length - 1 ? 'Let\'s Go! 🚀' : 'Next →';
}
function onboardNext() {
  obStep++;
  if (obStep >= OB_STEPS.length) { skipOnboard(); return; }
  updateOnboardStep();
}
function skipOnboard() {
  document.getElementById('onboard-overlay')?.classList.add('hidden');
  S.onboarded = true; save();
}

/* ════════════════════════════
   NOTIFICATIONS
════════════════════════════ */
function toggleNotif() {
  const panel = document.getElementById('notif-panel');
  panel?.classList.toggle('hidden');
  renderNotifs();
}
function renderNotifs() {
  const list = document.getElementById('notif-list');
  if (!list) return;
  if (!S.notifications.length) {
    list.innerHTML = '<div style="text-align:center;padding:24px;color:var(--t-gray);font-size:13px">🎉 All caught up!</div>';
    return;
  }
  list.innerHTML = S.notifications.map(n => `
    <div class="notif-item ${n.unread?'unread':''}">
      <div class="notif-icon" style="background:var(--blue-soft)">${n.icon}</div>
      <div class="notif-text">
        <strong>${n.title}</strong>
        <span>${n.text}</span>
        <div class="notif-time">${relTime(n.time)}</div>
      </div>
    </div>`).join('');
  // Mark read
  S.notifications.forEach(n => n.unread = false);
  updateNotifDot();
}
function clearNotifs() {
  S.notifications = []; save();
  renderNotifs(); updateNotifDot();
}
function addNotif(icon, title, text) {
  S.notifications.unshift({ id:uid(), icon, title, text, time:now(), unread:true });
  if (S.notifications.length > 20) S.notifications.pop();
  updateNotifDot(); save();
}
function updateNotifDot() {
  const dot  = document.getElementById('notif-dot');
  const unread = S.notifications.filter(n => n.unread).length;
  if (dot) dot.style.display = unread > 0 ? 'block' : 'none';
}
// Close notif panel on outside click
document.addEventListener('click', e => {
  const panel = document.getElementById('notif-panel');
  const btn   = document.getElementById('notif-btn');
  if (panel && !panel.classList.contains('hidden') && !panel.contains(e.target) && !btn?.contains(e.target)) {
    panel.classList.add('hidden');
  }
});

/* ════════════════════════════
   DASHBOARD
════════════════════════════ */
function renderDashboard() {
  const now2 = new Date();
  const DAYS = ['SUNDAY','MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY'];
  const MONS = ['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE','JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'];
  setTxt('dash-date', `${DAYS[now2.getDay()]}, ${MONS[now2.getMonth()]} ${now2.getDate()}`);
  const hr = now2.getHours();
  const greet = hr<12?'Good morning':hr<17?'Good afternoon':'Good evening';
  const name  = S.user?.name?.split(' ')[0] || 'User';
  setTxt('dash-greeting', `${greet}, ${name}!`);

  const thisM   = getThisMonth();
  const total   = sum(thisM);
  const budget  = S.budget;
  const pct     = budget>0 ? Math.min(100, Math.round((total/budget)*100)) : 0;
  const rem     = Math.max(0, budget-total);
  const cats    = [...new Set(thisM.map(e=>e.category))].length;

  // Animated counters
  animCount('dash-total-amount', total, '₹ ');
  animCount('dash-te', total, '₹ ');
  setTxt('dash-cats', cats);
  setTxt('dash-budget-disp', '₹ ' + fmt(budget));
  const barEl = document.getElementById('dash-budget-bar');
  if (barEl) setTimeout(() => barEl.style.width = pct+'%', 100);
  setTxt('dash-budget-lbl', pct+'% used');

  // Donut
  setTxt('donut-pct', pct+'%');
  animCount('donut-spent', total, '₹ ', true);
  animCount('donut-rem', rem, '₹ ', true);
  const df = document.getElementById('donut-fill');
  if (df) setTimeout(() => df.setAttribute('stroke-dasharray', `${pct} ${100-pct}`), 200);

  // Tip
  const tipEl = document.getElementById('dash-tip');
  if (tipEl) {
    if (pct>=100)     tipEl.textContent = '🚨 Budget exceeded! Consider reducing expenses.';
    else if (pct>=80) tipEl.textContent = '⚠️ You\'re close to your budget limit! Be careful.';
    else if (total>0) tipEl.textContent = '📍 You\'re on track! Keep managing your expenses wisely.';
    else              tipEl.textContent = '📍 Add your first expense to get started!';
  }

  // Top spending badge
  const badge = document.getElementById('top-spend-badge');
  if (badge) {
    const catTot = {};
    thisM.forEach(e => catTot[e.category]=(catTot[e.category]||0)+e.amount);
    const top = Object.entries(catTot).sort((a,b)=>b[1]-a[1])[0];
    if (top) {
      const meta = CAT[top[0]]||CAT['Other'];
      badge.innerHTML = `${meta.icon} This month you spent most on <strong>${top[0]}</strong> — ₹${fmt(top[1])}`;
      badge.style.display = 'inline-flex';
    } else { badge.style.display = 'none'; }
  }

  // Sparklines (last 7 days per day amount)
  renderSparkline('spark-expenses', thisM);
  renderSparkline('spark-cats', thisM);

  // Heatmap
  renderHeatmap();

  // Notification dot
  updateNotifDot();

  // Recent Transactions
  const recent = [...S.expenses].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,5);
  const tbody  = document.getElementById('dash-recent-tbody');
  const empty  = document.getElementById('dash-empty');
  if (tbody) {
    tbody.innerHTML = '';
    if (!recent.length) { empty?.classList.remove('hidden'); }
    else { empty?.classList.add('hidden'); recent.forEach(e => tbody.insertAdjacentHTML('beforeend', rowHtml(e, false))); }
  }
}

function renderSparkline(id, expenses) {
  const el = document.getElementById(id);
  if (!el) return;
  const now2 = new Date();
  const days = Array.from({length:7}, (_,i) => {
    const d = new Date(now2); d.setDate(now2.getDate()-6+i);
    return expenses.filter(e => new Date(e.date).toDateString()===d.toDateString()).reduce((s,e)=>s+e.amount,0);
  });
  const max = Math.max(...days, 1);
  const accent = getComputedStyle(document.documentElement).getPropertyValue('--blue').trim() || '#3557FF';
  el.innerHTML = days.map((val,i) => `<div class="spark-bar" style="height:${Math.max(4,Math.round((val/max)*28))}px;background:${i===6?accent:`color-mix(in srgb,${accent} 35%,transparent)`}"></div>`).join('');
}

function renderHeatmap() {
  const grid = document.getElementById('heatmap-grid');
  if (!grid) return;
  const now2 = new Date();
  const daysInMonth = new Date(now2.getFullYear(), now2.getMonth()+1, 0).getDate();
  const byDay = {};
  S.expenses.forEach(e => {
    const d = new Date(e.date);
    if (d.getMonth()===now2.getMonth() && d.getFullYear()===now2.getFullYear()) {
      byDay[d.getDate()] = (byDay[d.getDate()]||0) + e.amount;
    }
  });
  const maxAmt = Math.max(...Object.values(byDay), 1);
  const accent = getComputedStyle(document.documentElement).getPropertyValue('--blue').trim() || '#3557FF';
  grid.innerHTML = Array.from({length:daysInMonth}, (_,i) => {
    const day = i+1;
    const amt = byDay[day] || 0;
    const intensity = amt>0 ? Math.max(0.15, amt/maxAmt) : 0;
    const bg = amt>0 ? `color-mix(in srgb,${accent} ${Math.round(intensity*100)}%,transparent)` : 'var(--border-l)';
    const isToday = day === now2.getDate();
    return `<div class="hm-cell" style="background:${bg};outline:${isToday?`2px solid ${accent}`:'none'};outline-offset:1px" title="${day} Oct — ₹${fmt(amt)}"></div>`;
  }).join('');
}

/* ════════════════════════════
   EXPENSES
════════════════════════════ */
function renderExpenses() {
  const search = v('exp-search').toLowerCase();
  const catF   = document.getElementById('exp-cat-filter')?.value||'';
  const dateF  = document.getElementById('exp-date-filter')?.value||'';
  const statF  = document.getElementById('exp-status-filter')?.value||'';
  const sortV  = document.getElementById('exp-sort')?.value||'date-desc';
  const n      = new Date();

  let list = [...S.expenses];
  if (search) list = list.filter(e => (e.desc+e.category).toLowerCase().includes(search));
  if (catF)   list = list.filter(e => e.category===catF);
  if (statF)  list = list.filter(e => e.status===statF);
  if (dateF)  list = list.filter(e => {
    const d=new Date(e.date);
    if (dateF==='today') return d.toDateString()===n.toDateString();
    if (dateF==='week')  { const w=new Date(n); w.setDate(n.getDate()-7); return d>=w; }
    if (dateF==='month') return d.getMonth()===n.getMonth()&&d.getFullYear()===n.getFullYear();
    return true;
  });
  list.sort((a,b)=>{
    if (sortV==='date-desc')   return new Date(b.date)-new Date(a.date);
    if (sortV==='date-asc')    return new Date(a.date)-new Date(b.date);
    if (sortV==='amount-desc') return b.amount-a.amount;
    if (sortV==='amount-asc')  return a.amount-b.amount;
  });

  const badge = document.getElementById('exp-count-badge');
  if (badge) badge.textContent = `${list.length} expense${list.length!==1?'s':''}`;
  const tbody = document.getElementById('exp-tbody');
  const empty = document.getElementById('exp-empty');
  if (!tbody) return;
  tbody.innerHTML = '';
  if (!list.length) { empty?.classList.remove('hidden'); }
  else { empty?.classList.add('hidden'); list.forEach(e => tbody.insertAdjacentHTML('beforeend', rowHtml(e, true))); }
}

function rowHtml(exp, showActions) {
  const meta = CAT[exp.category]||CAT['Other'];
  const dStr = new Date(exp.date).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'});
  const stCls = exp.status==='Paid'?'paid':exp.status==='Pending'?'pending':'failed';
  const stIco = exp.status==='Paid'?'✓':exp.status==='Pending'?'⏳':'✕';
  const actions = showActions ? `<td><div class="action-btns">
    <button class="action-btn edit" onclick="editExpense('${exp.id}')" title="Edit">✏️</button>
    <button class="action-btn del"  onclick="openDelModal('${exp.id}')" title="Delete">🗑️</button>
  </div></td>` : '<td></td>';
  return `<tr oncontextmenu="openCtx(event,'${exp.id}');return false;">
    <td style="color:var(--t-gray);font-size:13px">${dStr}</td>
    <td style="font-weight:600">${esc(exp.desc||'—')}</td>
    <td><div class="cat-badge"><div class="cat-dot ${meta.cls}" style="background:${meta.bg};color:${meta.color}">${meta.icon}</div>${esc(exp.category)}</div></td>
    <td style="font-weight:700">₹${fmt(exp.amount)}</td>
    <td><span class="status-badge ${stCls}" onclick="cycleStatus('${exp.id}')" title="Click to change">${stIco} ${exp.status}</span></td>
    ${actions}
  </tr>`;
}

// Inline status cycle on click
function cycleStatus(id) {
  const exp = S.expenses.find(e=>e.id===id);
  if (!exp) return;
  const cycle = ['Paid','Pending','Failed'];
  exp.status = cycle[(cycle.indexOf(exp.status)+1)%cycle.length];
  save(); renderExpenses();
  showToast(`Status → ${exp.status}`, 'info');
}

/* ════════════════════════════
   ADD / EDIT EXPENSE
════════════════════════════ */
function resetAddForm() {
  S.editId = null;
  document.getElementById('edit-id').value = '';
  setTxt('add-exp-title','Add New Expense');
  const btn = document.getElementById('add-exp-submit-btn');
  if (btn) btn.textContent = '➕ Add Expense';
  document.getElementById('add-exp-form')?.reset();
  document.getElementById('receipt-name').textContent = '';
  setTodayDate();
}
function editExpense(id) {
  const exp = S.expenses.find(e=>e.id===id);
  if (!exp) return;
  S.editId = id;
  document.getElementById('edit-id').value   = id;
  setTxt('add-exp-title','Edit Expense');
  const btn = document.getElementById('add-exp-submit-btn');
  if (btn) btn.textContent = '💾 Save Changes';
  document.getElementById('f-amount').value   = exp.amount;
  document.getElementById('f-category').value = exp.category;
  document.getElementById('f-desc').value     = exp.desc;
  document.getElementById('f-payment').value  = exp.payment;
  document.getElementById('f-date').value     = exp.date;
  document.getElementById('f-notes').value    = exp.notes||'';
  document.getElementById('f-status').value   = exp.status;
  navTo('add-expense');
}
function submitExpense() {
  const amount   = parseFloat(document.getElementById('f-amount').value);
  const category = document.getElementById('f-category').value;
  const desc     = document.getElementById('f-desc').value.trim();
  const payment  = document.getElementById('f-payment').value;
  const date     = document.getElementById('f-date').value;
  const notes    = document.getElementById('f-notes').value.trim();
  const status   = document.getElementById('f-status').value;
  const editId   = document.getElementById('edit-id').value;

  if (!amount||amount<=0) { showToast('Please enter a valid amount','error'); return; }
  if (!category)          { showToast('Please select a category','error');   return; }
  if (!date)              { showToast('Please select a date','error');       return; }

  if (editId) {
    const idx = S.expenses.findIndex(e=>e.id===editId);
    if (idx!==-1) S.expenses[idx] = {...S.expenses[idx], amount, category, desc, payment, date, notes, status};
    showToast('Expense updated! ✅','success'); S.editId = null;
  } else {
    S.expenses.push({ id:uid(), amount, category, desc, payment, date, notes, status });
    showToast('Expense added! ✅','success');
    // Budget alerts
    const total = sum(getThisMonth());
    const pct   = S.budget>0 ? (total/S.budget)*100 : 0;
    if (pct>=100) { showToast('🚨 Budget exceeded this month!','error'); addNotif('🚨','Budget Alert','You have exceeded your monthly budget!'); }
    else if (pct>=80 && pct<100) { showToast('⚠️ 80% budget used!','warn'); addNotif('⚠️','Budget Warning','You\'ve used 80% of your budget.'); }
    // Confetti on first expense
    if (S.expenses.length===1) spawnConfetti();
  }
  save(); navTo('expenses');
}
function showReceiptName(input) {
  const el = document.getElementById('receipt-name');
  if (el && input.files[0]) el.textContent = '📎 ' + input.files[0].name;
}

/* ════════════════════════════
   DELETE
════════════════════════════ */
function openDelModal(id) { S.deleteId=id; document.getElementById('del-modal').classList.add('open'); }
function closeDelModal()  { S.deleteId=null; document.getElementById('del-modal').classList.remove('open'); }
function confirmDelete() {
  if (!S.deleteId) return;
  S.expenses = S.expenses.filter(e=>e.id!==S.deleteId);
  save(); closeDelModal();
  showToast('Expense deleted.','error');
  renderExpenses(); renderDashboard();
}

/* ════════════════════════════
   CONTEXT MENU
════════════════════════════ */
function setupContextMenu() {
  document.addEventListener('click', () => document.getElementById('ctx-menu')?.classList.add('hidden'));
}
function openCtx(e, id) {
  S.ctxId = id;
  const menu = document.getElementById('ctx-menu');
  if (!menu) return;
  menu.classList.remove('hidden');
  menu.style.left = e.clientX + 'px';
  menu.style.top  = e.clientY + 'px';
}
function ctxEdit()   { editExpense(S.ctxId); document.getElementById('ctx-menu')?.classList.add('hidden'); }
function ctxDelete() { openDelModal(S.ctxId); document.getElementById('ctx-menu')?.classList.add('hidden'); }
function ctxCopy() {
  const exp = S.expenses.find(e=>e.id===S.ctxId);
  if (exp) { navigator.clipboard?.writeText(exp.desc||exp.category); showToast('Copied to clipboard!','info'); }
  document.getElementById('ctx-menu')?.classList.add('hidden');
}

/* ════════════════════════════
   CATEGORIES
════════════════════════════ */
function renderCategories() {
  const grid  = document.getElementById('cat-grid');
  if (!grid) return;
  const thisM = getThisMonth();
  const total = sum(thisM);
  const catTot={}, catCnt={};
  thisM.forEach(e=>{ catTot[e.category]=(catTot[e.category]||0)+e.amount; catCnt[e.category]=(catCnt[e.category]||0)+1; });
  grid.innerHTML = '';
  Object.keys(CAT).forEach((cat,i)=>{
    const meta=CAT[cat], amt=catTot[cat]||0, cnt=catCnt[cat]||0;
    const pct=total>0?Math.round((amt/total)*100):0;
    grid.insertAdjacentHTML('beforeend',`
      <div class="cat-card" style="animation-delay:${i*.06}s">
        <div class="cat-card-top">
          <div class="cat-card-icon" style="background:${meta.bg};color:${meta.color}">${meta.icon}</div>
          <div><div class="cat-card-name">${cat}</div><div class="cat-card-count">${cnt} expense${cnt!==1?'s':''}</div></div>
        </div>
        <div class="cat-card-amount">₹ ${fmt(amt)}</div>
        <div class="cat-card-bar"><div class="fill" style="width:0%;background:${meta.color}" data-w="${pct}"></div></div>
        <div style="font-size:11.5px;color:var(--t-light)">${pct}% of this month</div>
      </div>`);
  });
  // Animate bars after render
  setTimeout(()=>{
    grid.querySelectorAll('.cat-card-bar .fill').forEach(el=>{
      el.style.width = el.dataset.w+'%';
    });
  }, 100);
}

/* ════════════════════════════
   BUDGET
════════════════════════════ */
function openBudgetModal()  { document.getElementById('budget-input').value=S.budget; document.getElementById('budget-modal').classList.add('open'); }
function closeBudgetModal() { document.getElementById('budget-modal').classList.remove('open'); }
function saveBudget() {
  const val = parseFloat(document.getElementById('budget-input').value);
  if (!val||val<=0) { showToast('Enter a valid budget','error'); return; }
  S.budget=val; save(); closeBudgetModal();
  showToast('Budget updated! 🎯','success'); spawnConfetti();
  addNotif('🎯','Budget Set',`Monthly budget set to ₹${fmt(val)}`);
  renderBudget(); renderDashboard();
}
function renderBudget() {
  const spent=sum(getThisMonth()), budget=S.budget, rem=Math.max(0,budget-spent);
  const pct=budget>0?Math.min(100,Math.round((spent/budget)*100)):0;
  setTxt('bud-total-disp','₹ '+fmt(budget));
  setTxt('bud-spent-disp','₹ '+fmt(spent));
  setTxt('bud-rem-disp',  '₹ '+fmt(rem));
  const barEl=document.getElementById('bud-bar');
  if (barEl) { setTimeout(()=>barEl.style.width=pct+'%',100); barEl.className='fill '+(pct>=90?'red':pct>=75?'orange':'blue'); }
  setTxt('bud-pct-lbl',pct+'% of budget used');
  document.getElementById('budget-warn')?.classList.toggle('hidden',pct<80);

  const list=document.getElementById('budget-cat-list');
  if (!list) return;
  list.innerHTML='';
  const catTot={};
  getThisMonth().forEach(e=>{catTot[e.category]=(catTot[e.category]||0)+e.amount;});
  if (!Object.keys(catTot).length){list.innerHTML='<div class="empty-state"><span class="empty-icon">🎯</span><p>No spending this month yet.</p></div>';return;}
  Object.entries(catTot).sort((a,b)=>b[1]-a[1]).forEach(([cat,amt])=>{
    const meta=CAT[cat]||CAT['Other'];
    const cpct=budget>0?Math.min(100,Math.round((amt/budget)*100)):0;
    const fc=cpct>=90?'red':cpct>=75?'orange':'blue';
    list.insertAdjacentHTML('beforeend',`
      <div class="budget-card">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
          <div style="display:flex;align-items:center;gap:12px">
            <div style="width:40px;height:40px;border-radius:10px;background:${meta.bg};color:${meta.color};display:flex;align-items:center;justify-content:center;font-size:19px">${meta.icon}</div>
            <div><div style="font-size:15px;font-weight:700;color:var(--t-dark)">${cat}</div><div style="font-size:12px;color:var(--t-gray)">₹${fmt(amt)} spent</div></div>
          </div>
          <div style="text-align:right"><div style="font-size:17px;font-weight:900;color:${meta.color}">${cpct}%</div><div style="font-size:11.5px;color:var(--t-gray)">of budget</div></div>
        </div>
        <div class="budget-bar"><div class="fill ${fc}" style="width:0%;background:${meta.color}" data-w="${cpct}"></div></div>
      </div>`);
  });
  setTimeout(()=>{ list.querySelectorAll('.budget-bar .fill').forEach(el=>el.style.width=el.dataset.w+'%'); },100);
}

/* ════════════════════════════
   SAVINGS GOALS
════════════════════════════ */
function openGoalModal(id) {
  const modal = document.getElementById('goal-modal');
  if (!modal) return;
  document.getElementById('goal-edit-id').value = id||'';
  setTxt('goal-modal-title', id ? 'Edit Goal' : 'Add Savings Goal');
  if (id) {
    const g = S.goals.find(g=>g.id===id);
    if (g) { document.getElementById('g-name').value=g.name; document.getElementById('g-target').value=g.target; document.getElementById('g-saved').value=g.saved; document.getElementById('g-icon').value=g.icon; }
  } else { ['g-name','g-target','g-saved'].forEach(i=>document.getElementById(i).value=''); document.getElementById('g-icon').value='🎯'; }
  modal.classList.add('open');
}
function closeGoalModal() { document.getElementById('goal-modal')?.classList.remove('open'); }
function saveGoal() {
  const name   = document.getElementById('g-name').value.trim();
  const target = parseFloat(document.getElementById('g-target').value);
  const saved  = parseFloat(document.getElementById('g-saved').value)||0;
  const icon   = document.getElementById('g-icon').value.trim()||'🎯';
  const editId = document.getElementById('goal-edit-id').value;
  if (!name||!target||target<=0) { showToast('Please enter name and target amount','error'); return; }
  if (editId) {
    const idx=S.goals.findIndex(g=>g.id===editId);
    if (idx!==-1) S.goals[idx]={...S.goals[idx],name,target,saved,icon};
  } else {
    S.goals.push({id:uid(),name,target,saved,icon});
    addNotif('⭐','New Goal Added',`Goal "${name}" — ₹${fmt(target)}`);
  }
  if (saved>=target) { showToast('🎉 Goal achieved! Congratulations!','success'); spawnConfetti(); }
  save(); closeGoalModal(); renderGoals();
  showToast('Goal saved! ⭐','success');
}
function deleteGoal(id) {
  S.goals=S.goals.filter(g=>g.id!==id); save(); renderGoals();
  showToast('Goal removed.','error');
}
function contributeGoal(id) {
  const g=S.goals.find(g=>g.id===id); if(!g) return;
  const amt=parseFloat(prompt('Add amount to savings (₹):')||'0');
  if (amt>0) { g.saved=Math.min(g.target,g.saved+amt); save(); renderGoals(); showToast(`+₹${fmt(amt)} added to ${g.name}!`,'success'); if(g.saved>=g.target){spawnConfetti();showToast('🎉 Goal Achieved!','success');} }
}
function renderGoals() {
  const grid=document.getElementById('goals-grid');
  if (!grid) return;
  if (!S.goals.length) {
    grid.innerHTML='<div class="empty-state" style="grid-column:1/-1"><span class="empty-icon">⭐</span><p>No goals yet. Set your first savings goal!</p></div>';
    return;
  }
  grid.innerHTML=S.goals.map((g,i)=>{
    const pct=g.target>0?Math.min(100,Math.round((g.saved/g.target)*100)):0;
    const color=pct>=100?'var(--green)':pct>=60?'var(--blue)':'var(--orange)';
    const done=pct>=100;
    return `<div class="goal-card" style="animation-delay:${i*.07}s">
      <div class="goal-top">
        <div class="goal-icon" style="background:${done?'var(--green-bg)':'var(--blue-soft)'}">${g.icon}</div>
        <div>${done?'<span style="font-size:20px">🎉</span>':''}</div>
      </div>
      <div class="goal-name">${esc(g.name)}</div>
      <div class="goal-amounts">₹${fmt(g.saved)} of ₹${fmt(g.target)}</div>
      <div class="goal-big" style="color:${color}">₹${fmt(g.target)}</div>
      <div class="goal-bar"><div class="fill" style="width:0%;background:${color}" data-w="${pct}"></div></div>
      <div class="goal-pct">${pct}% complete${done?' — 🎉 Achieved!':''}</div>
      <div class="goal-actions">
        <button class="goal-btn primary" onclick="contributeGoal('${g.id}')">+ Add Money</button>
        <button class="goal-btn secondary" onclick="openGoalModal('${g.id}')">✏️ Edit</button>
        <button class="goal-btn secondary" onclick="deleteGoal('${g.id}')" style="flex:0;padding:8px 12px;color:var(--red)">🗑️</button>
      </div>
    </div>`;
  }).join('');
  setTimeout(()=>{ grid.querySelectorAll('.goal-bar .fill').forEach(el=>el.style.width=el.dataset.w+'%'); },100);
}

/* ════════════════════════════
   REPORTS (Chart.js)
════════════════════════════ */
function renderReports() {
  const all=[ ...S.expenses].sort((a,b)=>new Date(b.date)-new Date(a.date));
  const tbody=document.getElementById('rep-tbody'), empty=document.getElementById('rep-empty');
  if (tbody) { tbody.innerHTML=''; if(!all.length){empty?.classList.remove('hidden');}else{empty?.classList.add('hidden');all.forEach(e=>tbody.insertAdjacentHTML('beforeend',rowHtml(e,false)));} }
  setTxt('rep-total-lbl','Total: ₹'+fmt(all.reduce((s,e)=>s+e.amount,0)));

  const n=new Date(), isDark=S.dark!=='light';
  const textCol=isDark?'#94A3B8':'#9CA3AF', gridCol=isDark?'rgba(255,255,255,.06)':'rgba(0,0,0,.05)';
  const cardBg=isDark?'#1E2640':'#ffffff', borderCol=isDark?'#2D3748':'#E5E7EB';

  // ── Bar chart ──
  const months=[],labels=[],totals=[];
  for(let i=5;i>=0;i--){
    const d=new Date(n.getFullYear(),n.getMonth()-i,1);
    labels.push(d.toLocaleString('default',{month:'short'})+" '"+d.getFullYear().toString().slice(2));
    totals.push(S.expenses.filter(e=>{const ed=new Date(e.date);return ed.getMonth()===d.getMonth()&&ed.getFullYear()===d.getFullYear();}).reduce((s,e)=>s+e.amount,0));
  }
  const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--blue').trim()||'#3557FF';
  const barCanvas=document.getElementById('bar-chart-canvas');
  if(barCanvas){
    if(barChart){barChart.destroy(); barChart=null;}
    barChart=new Chart(barCanvas,{
      type:'bar',
      data:{labels,datasets:[{label:'Expenses (₹)',data:totals,backgroundColor:totals.map((_,i)=>i===5?accentColor:`color-mix(in srgb,${accentColor} 28%,transparent)`),borderRadius:9,borderSkipped:false,hoverBackgroundColor:accentColor}]},
      options:{responsive:true,maintainAspectRatio:true,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>'₹ '+fmt(c.parsed.y)},backgroundColor:cardBg,titleColor:isDark?'#F1F5F9':'#111827',bodyColor:textCol,borderColor:borderCol,borderWidth:1}},scales:{x:{grid:{display:false},ticks:{color:textCol,font:{size:11}}},y:{grid:{color:gridCol},ticks:{color:textCol,font:{size:11},callback:v=>'₹'+fmt(v)},beginAtZero:true}}}
    });
  }

  // ── Doughnut chart ──
  const catTot={};
  getThisMonth().forEach(e=>{catTot[e.category]=(catTot[e.category]||0)+e.amount;});
  const cats=Object.keys(catTot), vals=cats.map(c=>catTot[c]);
  const colors=cats.map(c=>{const m=CAT[c]||CAT['Other'];return m.color;});
  const pieCanvas=document.getElementById('pie-chart-canvas');
  if(pieCanvas){
    if(pieChart){pieChart.destroy();pieChart=null;}
    pieChart=new Chart(pieCanvas,{
      type:'doughnut',
      data:{labels:cats.length?cats:['No data'],datasets:[{data:cats.length?vals:[1],backgroundColor:cats.length?colors:['#E5E7EB'],borderWidth:2,borderColor:isDark?'#1E2640':'#fff',hoverOffset:8}]},
      options:{responsive:true,maintainAspectRatio:true,cutout:'66%',plugins:{legend:{position:'right',labels:{color:isDark?'#CBD5E1':'#374151',font:{size:12},padding:12,usePointStyle:true}},tooltip:{callbacks:{label:c=>`${c.label}: ₹${fmt(c.parsed)}`},backgroundColor:cardBg,titleColor:isDark?'#F1F5F9':'#111827',bodyColor:textCol,borderColor:borderCol,borderWidth:1}}}
    });
  }
}

/* ════════════════════════════
   PROFILE
════════════════════════════ */
function renderProfile() {
  const u=S.user; if(!u) return;
  setTxt('prof-name-disp', u.name);
  setTxt('prof-email-disp', u.email);
  const ni=document.getElementById('prof-name-inp'),ei=document.getElementById('prof-email-inp');
  if(ni) ni.value=u.name; if(ei) ei.value=u.email;
  syncThemeRadios();
  const stats=document.getElementById('profile-stats');
  if(!stats) return;
  const total=S.expenses.reduce((s,e)=>s+e.amount,0);
  const thisT=sum(getThisMonth());
  [
    {icon:'💳',lbl:'Total Expenses',    val:'₹'+fmt(total),  color:'var(--blue)'},
    {icon:'📅',lbl:'This Month',        val:'₹'+fmt(thisT),  color:'var(--orange)'},
    {icon:'📊',lbl:'Transactions',      val:S.expenses.length,color:'var(--purple)'},
    {icon:'🎯',lbl:'Monthly Budget',    val:'₹'+fmt(S.budget),color:'var(--green)'},
    {icon:'⭐',lbl:'Active Goals',      val:S.goals.length,   color:'var(--blue)'},
  ].forEach(r=>{
    stats.insertAdjacentHTML('beforeend',`<div style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px;background:var(--bg);border-radius:10px;border:1px solid var(--border-l)">
      <div style="display:flex;align-items:center;gap:10px"><span style="font-size:20px">${r.icon}</span><span style="font-size:13.5px;color:var(--t-gray);font-weight:500">${r.lbl}</span></div>
      <span style="font-size:15px;font-weight:800;color:${r.color}">${r.val}</span>
    </div>`);
  });
}
function saveProfile() {
  const name=v('prof-name-inp'), email=v('prof-email-inp'), pass=v('prof-pass-inp');
  if(!name||!isEmail(email)){showToast('Valid name and email required','error');return;}
  S.user.name=name; S.user.email=email;
  if(pass.length>=8) S.user.password=pass;
  else if(pass.length>0){showToast('Password must be at least 8 chars','error');return;}
  save(); renderProfile(); updateSidebarUser();
  showToast('Profile saved! ✅','success');
}

/* ════════════════════════════
   EXPORT CSV
════════════════════════════ */
function exportCSV() {
  if(!S.expenses.length){showToast('No expenses to export','error');return;}
  const header=['Date','Description','Category','Amount','Payment','Status','Notes'];
  const rows=S.expenses.map(e=>[e.date,`"${(e.desc||'').replace(/"/g,'""')}"`,e.category,e.amount,e.payment||'',e.status,`"${(e.notes||'').replace(/"/g,'""')}"`]);
  const csv=[header,...rows].map(r=>r.join(',')).join('\n');
  const a=Object.assign(document.createElement('a'),{href:URL.createObjectURL(new Blob([csv],{type:'text/csv'})),download:'expenses_'+new Date().toISOString().split('T')[0]+'.csv'});
  a.click(); URL.revokeObjectURL(a.href);
  showToast('CSV exported! 📥','success');
}

/* ════════════════════════════
   CONFETTI
════════════════════════════ */
function spawnConfetti() {
  const canvas=document.getElementById('confetti-canvas');
  if(!canvas) return;
  canvas.width=window.innerWidth; canvas.height=window.innerHeight;
  const ctx=canvas.getContext('2d');
  const pieces=Array.from({length:120},()=>({
    x:Math.random()*canvas.width, y:-10-Math.random()*40,
    w:Math.random()*10+5, h:Math.random()*6+4,
    rot:Math.random()*360, rotV:Math.random()*4-2,
    vy:Math.random()*3+2, vx:Math.random()*2-1,
    color:['#3557FF','#F59E0B','#10B981','#EF4444','#8B5CF6','#06B6D4'][Math.floor(Math.random()*6)]
  }));
  let frame=0;
  function draw(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    pieces.forEach(p=>{
      ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.rot*Math.PI/180);
      ctx.fillStyle=p.color; ctx.globalAlpha=Math.max(0,(1-frame/120));
      ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h); ctx.restore();
      p.y+=p.vy; p.x+=p.vx; p.rot+=p.rotV;
    });
    frame++;
    if(frame<140) requestAnimationFrame(draw);
    else ctx.clearRect(0,0,canvas.width,canvas.height);
  }
  draw();
}

/* ════════════════════════════
   NUMBER COUNTER ANIMATION
════════════════════════════ */
function animCount(id, target, prefix='', doFmt=true) {
  const el=document.getElementById(id); if(!el) return;
  const start=0, dur=700, startTime=performance.now();
  function step(ts){
    const p=Math.min((ts-startTime)/dur,1);
    const ease=1-Math.pow(1-p,3);
    const val=Math.round(start+(target-start)*ease);
    el.textContent=prefix+(doFmt?fmt(val):val);
    if(p<1) requestAnimationFrame(step);
    else el.textContent=prefix+fmt(target);
  }
  requestAnimationFrame(step);
}

/* ════════════════════════════
   TOAST
════════════════════════════ */
function showToast(msg, type='') {
  const c=document.getElementById('toast-container');
  if(!c) return;
  const t=document.createElement('div');
  t.className='toast'+(type?' '+type:'');
  const icons={success:'✅',error:'❌',info:'ℹ️',warn:'⚠️'};
  t.innerHTML=`<span>${icons[type]||'💬'}</span>${msg}`;
  c.appendChild(t);
  setTimeout(()=>{ t.style.opacity='0'; t.style.transform='translateX(50px)'; t.style.transition='all .3s'; setTimeout(()=>t.remove(),310); },3000);
}

/* ════════════════════════════
   MODAL HELPERS
════════════════════════════ */
document.addEventListener('click', e => {
  if(e.target.id==='del-modal')    closeDelModal();
  if(e.target.id==='budget-modal') closeBudgetModal();
  if(e.target.id==='goal-modal')   closeGoalModal();
});

/* ════════════════════════════
   UTILS
════════════════════════════ */
function getThisMonth() {
  const n=new Date();
  return S.expenses.filter(e=>{const d=new Date(e.date);return d.getMonth()===n.getMonth()&&d.getFullYear()===n.getFullYear();});
}
function sum(arr) { return arr.reduce((s,e)=>s+e.amount,0); }
function uid()    { return Math.random().toString(36).slice(2)+Date.now().toString(36); }
function fmt(n)   { return Number(n).toLocaleString('en-IN'); }
function esc(s)   { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function setTxt(id,txt)  { const el=document.getElementById(id); if(el) el.textContent=txt; }
function v(id)           { return (document.getElementById(id)?.value||'').trim(); }
function isEmail(val)    { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val); }
function setTodayDate()  { const d=document.getElementById('f-date'); if(d) d.value=new Date().toISOString().split('T')[0]; }
function now()           { return new Date().toISOString(); }
function relTime(iso)    { const d=Math.round((Date.now()-new Date(iso))/60000); if(d<1)return'Just now'; if(d<60)return d+'m ago'; if(d<1440)return Math.round(d/60)+'h ago'; return Math.round(d/1440)+'d ago'; }
function se(eid,iid)     { document.getElementById(eid)?.classList.remove('hidden'); document.getElementById(iid)?.classList.add('error'); }
function he(eid,iid)     { document.getElementById(eid)?.classList.add('hidden');    document.getElementById(iid)?.classList.remove('error'); }
function updateSidebarUser() {
  if(!S.user) return;
  setTxt('sidebar-name',  S.user.name.split(' ')[0]);
  setTxt('sidebar-email', S.user.email);
}
