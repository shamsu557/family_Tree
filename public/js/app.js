/* ══════════════════════════════════════════════════════
   Liman Family Tree — app.js
══════════════════════════════════════════════════════ */

// ── State ─────────────────────────────────────────────
let M          = [];
let curAdmin   = null;
let navStack   = [];
let mtExpanded = false;
const MT_LIMIT = 20;

// ── Helpers ────────────────────────────────────────────
const byId   = id => M.find(m => m.id === id);
const kids   = pid => M.filter(m => m.parent_id === pid);
const full   = m => `${m.first_name}${m.nickname ? ' (' + m.nickname + ')' : ''} ${m.surname}`;
const imgSrc = m => m.photo ? `/uploads/${m.photo}` : '/img/default-profile.png';
const fmt    = d => {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); }
  catch { return d; }
};

// ── API wrapper ────────────────────────────────────────
async function api(method, url, data, isForm = false) {
  const opts = { method, credentials: 'include', headers: {} };
  if (data) {
    if (isForm) { opts.body = data; }
    else { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(data); }
  }
  const res  = await fetch(url, opts);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || 'Request failed');
  return json;
}

async function loadMembers() {
  try { M = await api('GET', '/api/members'); } catch { M = []; }
}

// ── Navigation ─────────────────────────────────────────
let cur = 'home';
async function go(id) {
  document.getElementById('page-' + cur)?.classList.remove('active');
  cur = id;
  document.getElementById('page-' + id)?.classList.add('active');
  window.scrollTo(0, 0);
  document.body.classList.toggle('admin-mode', id === 'admin-dashboard');
  ['home','search','relationship','history'].forEach(p => {
    document.getElementById('nav-' + p)?.classList.toggle('active', p === id);
  });
  if (id === 'home')             await initHome();
  if (id === 'search')           initSearch();
  if (id === 'relationship')     initRel();
  if (id === 'history')          initHist();
  if (id === 'admin-dashboard')  initDash();
}

function toggleMob() {
  const m = document.getElementById('mob-menu');
  m.style.display = m.style.display === 'block' ? 'none' : 'block';
}

// ── HOME ───────────────────────────────────────────────
async function initHome() {
  await loadMembers();
  const head = M.find(m => !m.parent_id);
  if (head) {
    const img = document.getElementById('anc-img');
    img.src = imgSrc(head);
    img.onerror = () => img.src = '/img/default-profile.png';
    document.getElementById('anc-name').textContent  = full(head);
    document.getElementById('anc-title').textContent = head.state || 'Family Patriarch';
  }
  const gens = M.length ? Math.max(...M.map(m => m.generation)) : 0;
  document.getElementById('stat-children').textContent = head ? kids(head.id).length : 0;
  document.getElementById('stat-gens').textContent     = gens || '—';
  document.getElementById('stat-total').textContent    = M.length;
}

// ── TREE ───────────────────────────────────────────────
async function enterTree(id) {
  if (id === null || id === undefined) return;
  await loadMembers();
  navStack.push(id);
  renderTree(byId(id));
  go('tree');
}
function renderTree(m) {
  if (!m) return;
  const bImg = document.getElementById('b-img');
  bImg.src = imgSrc(m);
  bImg.onerror = () => bImg.src = '/img/default-profile.png';
  document.getElementById('b-name').textContent = full(m);
  document.getElementById('b-sub').textContent =
    `${m.gender} · Gen ${m.generation}` + (m.dob ? ` · Born ${fmt(m.dob)}` : '');

  document.getElementById('bc').innerHTML = navStack.map((id, i) => {
    const mb = byId(id), isLast = i === navStack.length - 1;
    return `<span class="crumb${isLast ? ' last' : ''}" onclick="bcNav(${i})">${mb.first_name} ${mb.surname}</span>${!isLast ? '<span class="crumb-sep">›</span>' : ''}`;
  }).join('');

  const ch    = kids(m.id);
  const grid  = document.getElementById('cgrid');
  const nk    = document.getElementById('nokids');
  const trunk = document.getElementById('trunk');

  if (!ch.length) {
    grid.innerHTML = ''; nk.style.display = 'block'; trunk.style.display = 'none'; return;
  }
  nk.style.display = 'none'; trunk.style.display = 'block';

  const perRow = Math.min(5, ch.length);
  const rowHtml = rowKids => {
    const nodes = rowKids.map((c, i) => {
      const isFemale = c.gender === 'Female', hasK = kids(c.id).length;
      return `<div class="child-node">
        <div class="child-drop"></div>
        <div class="child-card" onclick="cardClick(${c.id})" style="animation:fadeUp .35s ${i * .07}s both;">
          <div class="photo-ring">
            <img class="c-photo${isFemale ? ' female' : ''}" src="${imgSrc(c)}" alt="${c.first_name}"
                 onerror="this.src='/img/default-profile.png'" loading="lazy"/>
            ${hasK ? `<span class="kids-count">${hasK} child${hasK > 1 ? 'ren' : ''}</span>` : ''}
          </div>
          <div class="c-name">${full(c)}</div>
          <div class="c-sub">${isFemale ? '♀' : '♂'} Gen ${c.generation}</div>
          <button class="prof-btn" onclick="event.stopPropagation();openProfile(${c.id})">Profile</button>
        </div>
      </div>`;
    }).join('');
    return `<div style="position:relative;margin-bottom:24px;">
      <div style="height:2px;background:linear-gradient(to right,transparent,var(--gl),transparent);position:absolute;top:20px;left:60px;right:60px;"></div>
      <div style="display:flex;justify-content:center;flex-wrap:wrap;gap:20px;">${nodes}</div>
    </div>`;
  };

  let html = '';
  for (let i = 0; i < ch.length; i += perRow) html += rowHtml(ch.slice(i, i + perRow));
  grid.innerHTML = html;
}

function cardClick(id) { kids(id).length ? enterTree(id) : openProfile(id); }
function goBack()   { if (navStack.length <= 1) { goHome(); return; } navStack.pop(); renderTree(byId(navStack[navStack.length - 1])); }
function goHome()   { navStack = []; go('home'); }
function bcNav(i)   { navStack = navStack.slice(0, i + 1); renderTree(byId(navStack[navStack.length - 1])); }

// ── PROFILE MODAL ──────────────────────────────────────
function openProfile(id) {
  const m = byId(id); if (!m) return;
  const par = m.parent_id ? byId(m.parent_id) : null;
  const ch = kids(m.id), isFemale = m.gender === 'Female';
  document.getElementById('mod-cont').innerHTML = `
    <div style="position:relative;height:140px;overflow:hidden;border-radius:20px 20px 0 0;">
      <img src="${imgSrc(m)}" style="width:100%;height:100%;object-fit:cover;object-position:center top;filter:blur(7px) brightness(.55);transform:scale(1.12);" onerror="this.src='/img/default-profile.png'"/>
    </div>
    <div style="text-align:center;margin-top:-50px;padding:0 20px 24px;position:relative;z-index:1;">
      <img src="${imgSrc(m)}" style="width:96px;height:96px;border-radius:50%;object-fit:cover;border:4px solid var(--white);box-shadow:0 6px 24px rgba(0,0,0,.18);margin-bottom:12px;display:block;margin-left:auto;margin-right:auto;" onerror="this.src='/img/default-profile.png'"/>
      <h3 style="font-family:var(--fd);font-size:1.1rem;color:var(--g);">${full(m)}</h3>
      <div style="display:flex;justify-content:center;gap:6px;margin:8px 0 18px;flex-wrap:wrap;">
        <span class="badge${isFemale ? ' badge-f' : ''}">${m.gender}</span>
        <span class="badge">Generation ${m.generation}</span>
        ${m.state ? `<span class="badge">${m.state}</span>` : ''}
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;text-align:left;margin-bottom:14px;">
        <div class="dp"><div class="lbl">Date of Birth</div><div class="val">${fmt(m.dob)}</div></div>
        <div class="dp"><div class="lbl">Children</div><div class="val">${ch.length}</div></div>
        ${m.address ? `<div class="dp" style="grid-column:span 2;"><div class="lbl">Address</div><div class="val">${m.address}</div></div>` : ''}
        ${par ? `<div class="dp" style="grid-column:span 2;"><div class="lbl">Parent</div><div class="val" style="color:var(--g);cursor:pointer;" onclick="closeModX();openProfile(${par.id})">${full(par)}</div></div>` : ''}
      </div>
      ${ch.length ? `
        <div style="text-align:left;margin-bottom:14px;">
          <p style="font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--mut);margin-bottom:8px;">Children</p>
          <div style="display:flex;flex-wrap:wrap;gap:6px;">${ch.map(c => `<span class="chip" onclick="closeModX();openProfile(${c.id})">${full(c)}</span>`).join('')}</div>
        </div>
        <button class="btn" style="width:100%;font-size:.85rem;" onclick="closeModX();enterTree(${m.id})">View Children in Tree →</button>` : ''}
    </div>`;
  document.getElementById('mod-bg').classList.add('open');
}
function closeMod(e) { if (e.target === document.getElementById('mod-bg')) closeModX(); }
function closeModX() { document.getElementById('mod-bg').classList.remove('open'); }

// ── SEARCH ─────────────────────────────────────────────
function initSearch() {
  document.getElementById('s-inp').value = '';
  document.getElementById('s-res').innerHTML = '';
  document.getElementById('s-empty').style.display = 'block';
}
function doSearch(q) {
  q = q.trim().toLowerCase();
  const res = document.getElementById('s-res'), emp = document.getElementById('s-empty');
  if (!q) { res.innerHTML = ''; emp.style.display = 'block'; return; }
  emp.style.display = 'none';
  const found = M.filter(m =>
    m.first_name.toLowerCase().includes(q) ||
    (m.middle_name || '').toLowerCase().includes(q) ||
    m.surname.toLowerCase().includes(q) ||
    (m.nickname || '').toLowerCase().includes(q)
  );
  if (!found.length) {
    res.innerHTML = `<div style="text-align:center;padding:36px 0;color:var(--mut);font-size:.9rem;">No members match "<strong>${q}</strong>"</div>`;
    return;
  }
  res.innerHTML = found.map(m => `
    <div class="s-row" onclick="openProfile(${m.id})">
      <img src="${imgSrc(m)}" class="s-photo" alt="${m.first_name}" onerror="this.src='/img/default-profile.png'"/>
      <div style="flex:1;min-width:0;">
        <p style="font-weight:700;font-size:.875rem;">${full(m)}</p>
        <p style="font-size:.75rem;color:var(--mut);margin-top:2px;">${m.gender} · Generation ${m.generation}${m.state ? ' · ' + m.state : ''}</p>
      </div>
      <span class="badge">Gen ${m.generation}</span>
    </div>`).join('');
}

// ── RELATIONSHIP ────────────────────────────────────────
function initRel() {
  ['rel-a', 'rel-b'].forEach(id => {
    const s = document.getElementById(id);
    s.innerHTML = '<option value="">Select a member…</option>';
    M.forEach(m => s.insertAdjacentHTML('beforeend',
      `<option value="${m.id}">${full(m)} (Gen ${m.generation})</option>`));
  });
  document.getElementById('rel-res').classList.remove('show');
}
function ancs(id) {
  const p = []; let m = byId(id);
  while (m) { p.unshift(m.id); m = m.parent_id ? byId(m.parent_id) : null; }
  return p;
}
function gLabel(m, male, female) { return m.gender === 'Female' ? female : male; }

function findRel() {
  const idA = parseInt(document.getElementById('rel-a').value);
  const idB = parseInt(document.getElementById('rel-b').value);
  const box = document.getElementById('rel-res');
  box.classList.add('show');
  if (!idA || !idB) { box.innerHTML = '<p style="color:var(--mut);font-size:.9rem;">Please select both members.</p>'; return; }
  if (idA === idB)  { box.innerHTML = `<p style="font-family:var(--fd);font-size:1.3rem;color:var(--g);">Same Person</p>`; return; }

  const mA = byId(idA), mB = byId(idB);
  const aA = ancs(idA), aB = ancs(idB), aBset = new Set(aB);
  let lcaId = null;
  for (let i = aA.length - 1; i >= 0; i--) { if (aBset.has(aA[i])) { lcaId = aA[i]; break; } }
  if (!lcaId) { box.innerHTML = '<p style="color:var(--mut);font-size:.9rem;">No common ancestor found.</p>'; return; }

  const lca = byId(lcaId);
  const dL = ancs(lcaId).length - 1;
  const distA = aA.length - 1 - dL, distB = aB.length - 1 - dL;
  let relAtoB = '', relBtoA = '', explanation = '';

  if (distA === 0 && distB > 0) {
    if (distB === 1)      { relAtoB = gLabel(mA,'Father','Mother')+' of '+mB.first_name;            relBtoA = gLabel(mB,'Son','Daughter')+' of '+mA.first_name; }
    else if (distB === 2) { relAtoB = gLabel(mA,'Grandfather','Grandmother')+' of '+mB.first_name;  relBtoA = gLabel(mB,'Grandson','Granddaughter')+' of '+mA.first_name; }
    else if (distB === 3) { relAtoB = gLabel(mA,'Great-Grandfather','Great-Grandmother')+' of '+mB.first_name; relBtoA = gLabel(mB,'Great-Grandson','Great-Granddaughter')+' of '+mA.first_name; }
    else { relAtoB = 'Ancestor of '+mB.first_name; relBtoA = 'Descendant of '+mA.first_name; }
  } else if (distB === 0 && distA > 0) {
    if (distA === 1)      { relBtoA = gLabel(mB,'Father','Mother')+' of '+mA.first_name;            relAtoB = gLabel(mA,'Son','Daughter')+' of '+mB.first_name; }
    else if (distA === 2) { relBtoA = gLabel(mB,'Grandfather','Grandmother')+' of '+mA.first_name;  relAtoB = gLabel(mA,'Grandson','Granddaughter')+' of '+mB.first_name; }
    else if (distA === 3) { relBtoA = gLabel(mB,'Great-Grandfather','Great-Grandmother')+' of '+mA.first_name; relAtoB = gLabel(mA,'Great-Grandson','Great-Granddaughter')+' of '+mB.first_name; }
    else { relBtoA = 'Ancestor of '+mA.first_name; relAtoB = 'Descendant of '+mB.first_name; }
  } else if (distA === 1 && distB === 1) {
    relAtoB = gLabel(mA,'Brother','Sister')+' of '+mB.first_name;
    relBtoA = gLabel(mB,'Brother','Sister')+' of '+mA.first_name;
    explanation = 'They share the same parent: ' + full(lca);
  } else if (distA === 1 && distB === 2) {
    relAtoB = gLabel(mA,'Uncle','Aunt')+' of '+mB.first_name;
    relBtoA = gLabel(mB,'Nephew','Niece')+' of '+mA.first_name;
  } else if (distA === 2 && distB === 1) {
    relBtoA = gLabel(mB,'Uncle','Aunt')+' of '+mA.first_name;
    relAtoB = gLabel(mA,'Nephew','Niece')+' of '+mB.first_name;
  } else if (distA === 1 && distB === 3) {
    relAtoB = gLabel(mA,'Great-Uncle','Great-Aunt')+' of '+mB.first_name;
    relBtoA = gLabel(mB,'Grand-Nephew','Grand-Niece')+' of '+mA.first_name;
  } else if (distA === 3 && distB === 1) {
    relBtoA = gLabel(mB,'Great-Uncle','Great-Aunt')+' of '+mA.first_name;
    relAtoB = gLabel(mA,'Grand-Nephew','Grand-Niece')+' of '+mB.first_name;
  } else if (distA === 2 && distB === 2) {
    relAtoB = 'First Cousin of '+mB.first_name; relBtoA = 'First Cousin of '+mA.first_name;
    explanation = 'Shared grandparent: ' + full(lca);
  } else if (distA === 3 && distB === 3) {
    relAtoB = 'Second Cousin of '+mB.first_name; relBtoA = 'Second Cousin of '+mA.first_name;
  } else if ((distA === 2 && distB === 3) || (distA === 3 && distB === 2)) {
    relAtoB = 'First Cousin Once Removed of '+mB.first_name;
    relBtoA = 'First Cousin Once Removed of '+mA.first_name;
  } else if (distA === 4 && distB === 4) {
    relAtoB = 'Third Cousin of '+mB.first_name; relBtoA = 'Third Cousin of '+mA.first_name;
  } else {
    relAtoB = `Distant Relative of ${mB.first_name} (${distA}+${distB} steps from common ancestor)`;
    relBtoA = `Distant Relative of ${mA.first_name}`;
  }

  box.innerHTML = `
    <div class="rel-avatars">
      <div class="rel-av"><img src="${imgSrc(mA)}" onerror="this.src='/img/default-profile.png'"/><span>${mA.first_name}</span></div>
      <span class="link-icon">🔗</span>
      <div class="rel-av"><img src="${imgSrc(mB)}" onerror="this.src='/img/default-profile.png'"/><span>${mB.first_name}</span></div>
    </div>
    <div style="background:var(--gp);border-radius:12px;padding:14px 18px;margin-bottom:12px;text-align:left;">
      <p style="font-size:.68rem;color:var(--mut);font-weight:700;text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px;">${mA.first_name}'s relationship to ${mB.first_name}</p>
      <p style="font-family:var(--fd);font-size:1.1rem;font-weight:700;color:var(--g);">${relAtoB}</p>
    </div>
    <div style="background:#fce7f3;border-radius:12px;padding:14px 18px;margin-bottom:14px;text-align:left;">
      <p style="font-size:.68rem;color:#9d174d;font-weight:700;text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px;">${mB.first_name}'s relationship to ${mA.first_name}</p>
      <p style="font-family:var(--fd);font-size:1.1rem;font-weight:700;color:#9d174d;">${relBtoA}</p>
    </div>
    <p style="font-size:.8rem;color:var(--mut);">Common ancestor: <strong style="color:var(--g);">${full(lca)}</strong> (Gen ${lca.generation})${explanation ? '<br><span style="margin-top:4px;display:block;">' + explanation + '</span>' : ''}</p>`;
}

// ── HISTORY ────────────────────────────────────────────
async function initHist() {
  const tl = document.getElementById('tl');
  try {
    const hist = await api('GET', '/api/history');
    tl.innerHTML = hist.map((e, i) => `
      <div class="tl-item" style="transition-delay:${i * .08}s;">
        <div class="tl-dot"></div>
        <div class="tl-body">
          <div class="tl-year">${e.year_label}</div>
          <div class="tl-title">${e.title}</div>
          <p>${e.body}</p>
        </div>
      </div>`).join('');
  } catch {
    tl.innerHTML = '<p style="color:var(--mut);padding:20px;">Could not load history.</p>';
  }
  const items = tl.querySelectorAll('.tl-item');
  items.forEach(el => el.classList.remove('visible'));
  const obs = new IntersectionObserver(entries => {
    entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add('visible'); obs.unobserve(en.target); } });
  }, { threshold: 0.1 });
  items.forEach(el => obs.observe(el));
  setTimeout(() => items.forEach(el => { if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add('visible'); }), 80);
}

// ── AUTH ────────────────────────────────────────────────
async function doLogin() {
  const username = document.getElementById('l-u').value.trim();
  const password = document.getElementById('l-p').value;
  const err = document.getElementById('l-err');
  err.style.display = 'none';
  const btn = document.getElementById('l-btn');
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>Signing in…';
  try {
    const res = await api('POST', '/api/auth/login', { username, password });
    curAdmin = { username: res.username, role: res.role };
    go('admin-dashboard');
  } catch (e) {
    err.textContent = e.message; err.style.display = 'block';
  } finally {
    btn.disabled = false; btn.textContent = 'Sign In →';
  }
}

async function doLogout() {
  try { await api('POST', '/api/auth/logout'); } catch {}
  curAdmin = null;
  document.body.classList.remove('admin-mode');
  go('home');
}

// ── ADMIN DASHBOARD ─────────────────────────────────────
async function initDash() {
  try {
    const me = await api('GET', '/api/auth/me');
    curAdmin = me;
  } catch { go('admin-login'); return; }

  document.getElementById('sb-u').textContent = curAdmin.username;
  document.getElementById('sb-r').textContent = curAdmin.role === 'superadmin' ? 'Super Administrator' : 'Administrator';
  const sa = document.getElementById('sb-adm');
  if (sa) sa.style.display = curAdmin.role === 'superadmin' ? '' : 'none';

  await loadDashStats();
  await loadMembers();
  renderMT();
}

async function loadDashStats() {
  try {
    const s = await api('GET', '/api/members/stats');
    document.getElementById('d-total').textContent  = s.total;
    document.getElementById('d-gens').textContent   = s.generations;
    document.getElementById('d-admins').textContent = s.admins;
    document.getElementById('d-hkids').textContent  = s.headChildren;
    document.getElementById('d-males').textContent  = s.males   || 0;
    document.getElementById('d-females').textContent= s.females || 0;

    // Animate progress bar for gender ratio
    const total = (s.males || 0) + (s.females || 0);
    const malePct = total ? Math.round((s.males / total) * 100) : 50;
    const bar = document.getElementById('gender-bar-male');
    if (bar) bar.style.width = malePct + '%';

    // Load recent members
    const recent = await api('GET', '/api/members/recent');
    const tbody = document.getElementById('recent-tbody');
    if (tbody) {
      tbody.innerHTML = recent.length ? recent.map(m => `
        <tr>
          <td><img src="${imgSrc(m)}" style="width:32px;height:32px;border-radius:50%;object-fit:cover;border:2px solid rgba(255,255,255,.2);" onerror="this.src='/img/default-profile.png'"/></td>
          <td style="font-weight:600;">${full(m)}</td>
          <td><span class="dash-badge">${m.gender === 'Female' ? '♀ Female' : '♂ Male'}</span></td>
          <td><span class="dash-badge gen-badge">Gen ${m.generation}</span></td>
        </tr>`).join('') :
        `<tr><td colspan="4" style="text-align:center;color:rgba(255,255,255,.5);padding:20px;font-size:.85rem;">No members yet</td></tr>`;
    }
  } catch {}
}

function showSec(name, el) {
  ['dashboard', 'members', 'admins'].forEach(s => {
    document.getElementById('sec-' + s).style.display = s === name ? '' : 'none';
  });
  document.querySelectorAll('.sb-link').forEach(l => l.classList.remove('on'));
  if (el) el.classList.add('on');
  document.getElementById('sec-ttl').textContent =
    name === 'dashboard' ? 'Dashboard' : name === 'members' ? 'Family Members' : 'Manage Admins';
  if (name === 'members') { loadMembers().then(renderMT); }
  if (name === 'admins')  loadAdmins();
  toggleSB(false);
}

function toggleSB(open) {
  document.getElementById('sb').classList.toggle('open', open);
  document.getElementById('sb-ov').classList.toggle('open', open);
}

// ── MEMBERS TABLE ──────────────────────────────────────
function renderMT() {
  const q = (document.getElementById('mt-search')?.value || '').trim().toLowerCase();
  let filtered = M.filter(m =>
    !q || m.first_name.toLowerCase().includes(q) ||
    m.surname.toLowerCase().includes(q) ||
    (m.nickname || '').toLowerCase().includes(q)
  );

  // Sort hierarchically
  const sorted = [];
  function addSorted(pid) {
    filtered.filter(m => m.parent_id === pid).sort((a,b) => a.id - b.id).forEach(m => {
      sorted.push(m); addSorted(m.id);
    });
  }
  const head = filtered.find(m => !m.parent_id);
  if (head) { sorted.push(head); addSorted(head.id); }
  filtered.filter(m => !sorted.includes(m)).forEach(m => sorted.push(m));

  const toShow      = mtExpanded ? sorted : sorted.slice(0, MT_LIMIT);
  const headExists  = M.some(m => !m.parent_id);
  const addHeadBtn  = document.getElementById('btn-add-head');
  if (addHeadBtn) addHeadBtn.style.display = headExists ? 'none' : '';

  document.getElementById('mtbody').innerHTML = toShow.map(m => {
    const isHead  = !m.parent_id;
    const par     = m.parent_id ? byId(m.parent_id) : null;
    const indent  = m.generation > 1 ? `padding-left:${(m.generation - 1) * 16}px` : '';
    const prefix  = isHead ? '👑 ' : ('└ ');
    const isFemale = m.gender === 'Female';

    // ── ACTION BUTTONS ──
    // FIX: Head NOW gets an "Add Child" button too, plus Edit (but no Delete)
    const actBtns = isHead
      ? `<button onclick="openAddChildModal(${m.id})" class="act-btn act-add" title="Add child under ${full(m)}">
           <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>
         </button>
         <button onclick="editM(${m.id})" class="act-btn act-edit" title="Edit">
           <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
         </button>`
      : `<button onclick="openAddChildModal(${m.id})" class="act-btn act-add" title="Add child under ${full(m)}">
           <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>
         </button>
         <button onclick="editM(${m.id})" class="act-btn act-edit" title="Edit">
           <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
         </button>
         <button onclick="delM(${m.id})" class="act-btn act-del" title="Delete">
           <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
         </button>`;

    return `<tr>
      <td><img src="${imgSrc(m)}" class="mt-photo" onerror="this.src='/img/default-profile.png'"/></td>
      <td style="font-weight:700;${indent}">${prefix}${full(m)}${isHead ? ' <span class="badge badge-gold" style="font-size:.58rem;vertical-align:middle;">Head</span>' : ''}</td>
      <td><span class="badge gen-col-${Math.min(m.generation,6)}">Gen ${m.generation}</span></td>
      <td><span class="gender-tag ${isFemale ? 'f' : 'm'}">${isFemale ? '♀ F' : '♂ M'}</span></td>
      <td style="color:var(--mut);font-size:.8rem;">${par ? full(par) : '—'}</td>
      <td style="white-space:nowrap;text-align:center;">${actBtns}</td>
    </tr>`;
  }).join('');

  const footer = document.getElementById('mt-footer');
  if (!footer) return;
  if (q) {
    footer.innerHTML = `<span style="font-size:.8rem;color:var(--mut);">${filtered.length} result${filtered.length !== 1 ? 's' : ''} for "<strong>${q}</strong>"</span>`;
  } else if (filtered.length <= MT_LIMIT) {
    footer.innerHTML = `<span style="font-size:.8rem;color:var(--mut);">${filtered.length} member${filtered.length !== 1 ? 's' : ''}</span>`;
  } else {
    footer.innerHTML = `<span style="font-size:.8rem;color:var(--mut);">Showing ${toShow.length} of ${filtered.length}</span>
      <button class="btn-o btn-sm" onclick="mtExpanded=!mtExpanded;renderMT();" style="margin-left:auto;">${mtExpanded ? 'View Less ▲' : 'View More ▼'}</button>`;
  }
}

// ── ADD / EDIT MEMBER MODAL ────────────────────────────
let editId = null, lockedParentId = null;

function openAddHead() {
  if (M.some(m => !m.parent_id)) { showToast('A family head already exists.', 'error'); return; }
  editId = null; lockedParentId = null;
  document.getElementById('add-ttl').textContent = '👑 Add Family Head';
  document.getElementById('add-parent-info').style.display = 'none';
  document.getElementById('fm-p-wrap').style.display = 'none';
  resetForm();
  document.getElementById('add-mod').classList.add('open');
}

function openAddChildModal(parentId) {
  const par = byId(parentId); if (!par) return;
  editId = null; lockedParentId = parentId;
  document.getElementById('add-ttl').textContent = 'Add Child';
  document.getElementById('add-parent-info').style.display = 'block';
  document.getElementById('add-parent-name').textContent = `${full(par)} — Generation ${par.generation}`;
  document.getElementById('fm-p-wrap').style.display = 'none';
  resetForm();
  document.getElementById('add-mod').classList.add('open');
}

function editM(id) {
  const m = byId(id); if (!m) return;
  editId = id; lockedParentId = null;
  document.getElementById('add-ttl').textContent = 'Edit — ' + full(m);
  document.getElementById('add-parent-info').style.display = 'none';
  document.getElementById('fm-p-wrap').style.display = 'block';
  document.getElementById('fm-fn').value = m.first_name;
  document.getElementById('fm-mn').value = m.middle_name || '';
  document.getElementById('fm-sn').value = m.surname;
  document.getElementById('fm-nk').value = m.nickname || '';
  document.getElementById('fm-g').value  = m.gender;
  document.getElementById('fm-d').value  = m.dob ? m.dob.substring(0, 10) : '';
  document.getElementById('fm-st').value = m.state   || '';
  document.getElementById('fm-lg').value = m.lga     || '';
  document.getElementById('fm-ad').value = m.address || '';
  const prev = document.getElementById('photo-preview');
  prev.src = imgSrc(m); prev.style.display = 'block';
  fillParent(m.parent_id);
  document.getElementById('add-mod').classList.add('open');
}

function resetForm() {
  ['fm-fn','fm-mn','fm-sn','fm-nk','fm-st','fm-lg','fm-ad'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  document.getElementById('fm-d').value  = '';
  document.getElementById('fm-g').value  = 'Male';
  const prev = document.getElementById('photo-preview');
  prev.src = ''; prev.style.display = 'none';
  const fi = document.getElementById('fm-photo'); if (fi) fi.value = '';
}

function fillParent(selectedPid) {
  const s = document.getElementById('fm-p'); if (!s) return;
  s.innerHTML = '<option value="">None (Head)</option>';
  M.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m.id;
    opt.textContent = `${full(m)} (Gen ${m.generation})`;
    if (m.id === selectedPid) opt.selected = true;
    s.appendChild(opt);
  });
}

function previewPhoto(input) {
  const file = input.files[0]; if (!file) return;
  const prev = document.getElementById('photo-preview');
  prev.src = URL.createObjectURL(file); prev.style.display = 'block';
}

function closeAdd()     { document.getElementById('add-mod').classList.remove('open'); lockedParentId = null; editId = null; }
function closeAddOut(e) { if (e.target === document.getElementById('add-mod')) closeAdd(); }

async function saveMember() {
  const fn = document.getElementById('fm-fn').value.trim();
  const sn = document.getElementById('fm-sn').value.trim();
  if (!fn || !sn) { showToast('First name and surname are required.', 'error'); return; }

  const fd = new FormData();
  fd.append('first_name',  fn);
  fd.append('middle_name', document.getElementById('fm-mn').value.trim());
  fd.append('surname',     sn);
  fd.append('nickname',    document.getElementById('fm-nk').value.trim());
  fd.append('gender',      document.getElementById('fm-g').value);
  fd.append('dob',         document.getElementById('fm-d').value);
  fd.append('state',       document.getElementById('fm-st').value.trim());
  fd.append('lga',         document.getElementById('fm-lg').value.trim());
  fd.append('address',     document.getElementById('fm-ad').value.trim());

  if (editId !== null) {
    const pidVal = document.getElementById('fm-p')?.value;
    fd.append('parent_id', pidVal ?? '');
  } else if (lockedParentId !== null) {
    fd.append('parent_id', lockedParentId);
  }

  const photoFile = document.getElementById('fm-photo')?.files[0];
  if (photoFile) fd.append('photo', photoFile);

  const btn = document.getElementById('save-btn');
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>Saving…';

  try {
    if (editId !== null) {
      await api('PUT', `/api/members/${editId}`, fd, true);
      showToast('Member updated successfully.');
    } else {
      await api('POST', '/api/members', fd, true);
      showToast('Member added successfully.');
    }
    closeAdd();
    await loadMembers();
    renderMT();
    await loadDashStats();
  } catch (e) {
    showToast(e.message, 'error');
  } finally {
    btn.disabled = false; btn.textContent = 'Save Member';
  }
}

async function delM(id) {
  const m = byId(id); if (!m) return;
  const chCount = kids(id).length;
  const msg = chCount > 0
    ? `Delete "${full(m)}"? Their ${chCount} child(ren) will be reassigned to ${full(m)}'s parent.`
    : `Delete "${full(m)}"?`;
  if (!confirm(msg)) return;
  try {
    await api('DELETE', `/api/members/${id}`);
    showToast('Member deleted.');
    await loadMembers();
    renderMT();
    await loadDashStats();
  } catch (e) { showToast(e.message, 'error'); }
}

// ── ADMINS MANAGEMENT ──────────────────────────────────
async function loadAdmins() {
  try {
    const admins = await api('GET', '/api/admins');
    document.getElementById('atbody').innerHTML = admins.map(a => `
      <tr>
        <td style="font-weight:600;">${a.username}</td>
        <td><span class="badge${a.role === 'superadmin' ? '-gold badge' : ''}">${a.role === 'superadmin' ? '⭐ Super Admin' : 'Admin'}</span></td>
        <td style="color:var(--mut);font-size:.8rem;">${fmt(a.created_at)}</td>
        <td>${a.role !== 'superadmin'
          ? `<button onclick="deleteAdmin(${a.id})" style="color:var(--red);font-size:.78rem;font-weight:700;border:none;background:none;cursor:pointer;">Delete</button>`
          : '<span style="color:var(--mut);font-size:.78rem;">—</span>'}</td>
      </tr>`).join('');
  } catch (e) { showToast(e.message, 'error'); }
}

function openCreateAdmin() {
  document.getElementById('new-adm-user').value = '';
  document.getElementById('new-adm-pass').value = '';
  document.getElementById('adm-err').style.display = 'none';
  document.getElementById('admin-modal').classList.add('open');
}
function closeAdminModal() { document.getElementById('admin-modal').classList.remove('open'); }

async function saveNewAdmin() {
  const username = document.getElementById('new-adm-user').value.trim();
  const password = document.getElementById('new-adm-pass').value;
  const err = document.getElementById('adm-err');
  err.style.display = 'none';
  if (!username || !password) { err.textContent = 'Both fields required.'; err.style.display = 'block'; return; }
  try {
    await api('POST', '/api/admins', { username, password });
    closeAdminModal();
    showToast('Admin created: ' + username);
    await loadAdmins();
  } catch (e) { err.textContent = e.message; err.style.display = 'block'; }
}

async function deleteAdmin(id) {
  if (!confirm('Delete this admin?')) return;
  try {
    await api('DELETE', `/api/admins/${id}`);
    showToast('Admin deleted.');
    await loadAdmins();
  } catch (e) { showToast(e.message, 'error'); }
}

// ── TOAST ───────────────────────────────────────────────
function showToast(msg, type = 'success') {
  let t = document.getElementById('toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'toast';
    t.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:9999;padding:12px 20px;border-radius:12px;font-size:.875rem;font-weight:600;box-shadow:0 8px 24px rgba(0,0,0,.18);transition:opacity .4s;max-width:320px;';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.background = type === 'error' ? '#fef2f2' : '#e8f5ed';
  t.style.color       = type === 'error' ? '#b91c1c' : '#1a5c3a';
  t.style.border      = type === 'error' ? '1px solid #fecaca' : '1px solid #c8ebd5';
  t.style.opacity = '1';
  clearTimeout(t._timer);
  t._timer = setTimeout(() => { t.style.opacity = '0'; }, 3500);
}

// ── INIT ───────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  try { const me = await api('GET', '/api/auth/me'); curAdmin = me; } catch {}
  await go('home');
});
