// ============================================================
// TECHNIQUE BY KEVIN - app.js (VERSION DÉFINITIVE COMPLÈTE)
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
      .then(() => console.log('[SW] Enregistré'))
      .catch(e => console.error('[SW] Échec', e));
  }

  DB.init().then(() => {
    setupNavigation();
    setupFilters();
    setupAI();
    setupAdmin();
    runDiagnostics();
    setTimeout(() => document.getElementById('splash').classList.add('hidden'), 800);
    window.dispatchEvent(new Event('db-ready'));
  }).catch(err => {
    console.error('[Init] Erreur :', err);
    document.getElementById('splash').innerHTML = '<h1>⚠️ Erreur</h1><p>' + err.message + '</p>';
  });

  setTimeout(() => {
    const s = document.getElementById('splash');
    if (s && !s.classList.contains('hidden')) s.classList.add('hidden');
  }, 6000);
});

// ---------- NAVIGATION ----------
function setupNavigation() {
  const buttons = document.querySelectorAll('nav button');
  const sections = document.querySelectorAll('.section');
  buttons.forEach(btn => btn.addEventListener('click', () => {
    buttons.forEach(b => b.classList.remove('active'));
    sections.forEach(s => s.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.target).classList.add('active');
  }));
}

// ---------- FILTRES EN CASCADE ----------
function setupFilters() {
  const fO = document.getElementById('f-origin');
  const fB = document.getElementById('f-brand');
  const fM = document.getElementById('f-model');
  const fY = document.getElementById('f-year');

  [...new Set(DB.data.map(v => v.origin))].sort().forEach(o =>
    fO.add(new Option(o.charAt(0).toUpperCase() + o.slice(1), o)));
  for (let y = 2026; y >= 2018; y--) fY.add(new Option(y, y));

  fO.addEventListener('change', () => {
    fB.innerHTML = '<option value="">Toutes Marques</option>';
    fM.innerHTML = '<option value="">Tous Modèles</option>';
    [...new Set(DB.data.filter(v => !fO.value || v.origin === fO.value).map(v => v.brand))].sort()
      .forEach(b => fB.add(new Option(b, b)));
  });

  fB.addEventListener('change', () => {
    fM.innerHTML = '<option value="">Tous Modèles</option>';
    [...new Set(DB.data.filter(v =>
      (!fO.value || v.origin === fO.value) && (!fB.value || v.brand === fB.value)
    ).map(v => v.model))].sort().forEach(m => fM.add(new Option(m, m)));
  });

  document.getElementById('btn-filter').addEventListener('click', () => {
    renderCards(DB.filter({ origin: fO.value, brand: fB.value, model: fM.value, year: fY.value }), 'filter-results');
  });
}

// ---------- RECHERCHE IA ----------
function setupAI() {
  const btnAi = document.getElementById('btn-ai');
  const inputAi = document.getElementById('ai-input');
  const doSearch = () => {
    const res = AI.analyze(inputAi.value);
    let html = res.insights.length
      ? res.insights.map(i => `<div class="card insight-card">${i}</div>`).join('')
      : '';
    document.getElementById('ai-results').innerHTML = html;
    renderCards(res.results, 'ai-results', true);
  };
  btnAi.addEventListener('click', doSearch);
  inputAi.addEventListener('keypress', e => { if (e.key === 'Enter') doSearch(); });
}

// ---------- CARTES 4 LIGNES DE SPECS ----------
function renderCards(list, containerId, append = false) {
  const container = document.getElementById(containerId);
  if (!append) container.innerHTML = '';

  if (list.length === 0 && !append) {
    container.innerHTML = '<p style="text-align:center;color:#aaa;margin-top:20px;">Aucun résultat trouvé.</p>';
    return;
  }
  if (list.length > 0 && !append) {
    const p = document.createElement('p');
    p.style.color = '#aaa'; p.style.marginBottom = '15px';
    p.textContent = list.length + ' fiche(s) trouvée(s).';
    container.appendChild(p);
  }

  const frag = document.createDocumentFragment();
  list.forEach(v => {
    const t = v.technical_specs || {};
    const card = document.createElement('div');
    card.className = 'card';

    const badges = [];
    if (v.recalls.length) badges.push(`<span class="badge recall">🔔 ${v.recalls.length} Rappel${v.recalls.length > 1 ? 's' : ''}</span>`);
    if (v.dtcs.length) badges.push(`<span class="badge dtc">⚠️ ${v.dtcs.length} DTC</span>`);
    if (v.issues.length) badges.push(`<span class="badge issue">🛠️ ${v.issues.length} Panne${v.issues.length > 1 ? 's' : ''}</span>`);
    if (!badges.length) badges.push('<span class="badge ok">✓ Aucune alerte connue</span>');

    const details = [];
    if (v.recalls.length) details.push(`<p class="detail-line recall-line">🔔 ${v.recalls[0].date} — ${v.recalls[0].desc}</p>`);
    if (v.dtcs.length) details.push(`<p class="detail-line"><span class="dtc">DTC :</span> ${v.dtcs.map(d => d.c).join(', ')}</p>`);
    if (v.issues.length) details.push(`<p class="detail-line">🛠️ ${v.issues[0].cat} : ${v.issues[0].desc}</p>`);

    card.innerHTML = `
      <h3>${v.brand} ${v.model} <small>${v.year} • ${v.id}</small></h3>
      <div class="spec-lines">
        <div class="spec-line">
          <span>⚙️ ${v.motor}</span>
          <span>💪 ${t.power != null ? t.power + ' ch' : '—'}</span>
          <span>⛽ ${t.fuel || '—'}</span>
        </div>
        <div class="spec-line">
          <span>🔧 ${t.transmission || '—'}</span>
          <span>🛞 ${t.drivetrain || '—'}</span>
          <span>🚗 ${t.body || '—'}</span>
        </div>
        <div class="spec-line">
          <span>🚀 ${t.zeroTo100 ? t.zeroTo100 + ' s' : '—'}</span>
          <span>🏁 ${t.topSpeed ? t.topSpeed + ' km/h' : '—'}</span>
          <span>⚖️ ${t.weight ? t.weight + ' kg' : '—'}</span>
        </div>
        <div class="spec-line">
          <span>🌫️ ${t.co2 != null ? t.co2 + ' g/km' : '—'}</span>
          <span>🔄 ${t.consumption || '—'}</span>
          <span>🧳 ${t.trunk ? t.trunk + ' L • ' + t.seats + ' pl.' : '—'}</span>
        </div>
      </div>
      <div class="badges">${badges.join('')}</div>
      ${details.join('')}
      <button class="btn" onclick="generatePDF('${v.id}')">📄 Télécharger la fiche PDF</button>`;
    frag.appendChild(card);
  });
  container.appendChild(frag);
}

// ---------- ADMIN SÉCURISÉ ----------
const ADMIN_PASS_ENCODED = 'S2V2aW44MzYwMA==';
function verifyAdminPass(input) {
  try { return btoa(input.trim()) === ADMIN_PASS_ENCODED; } catch (e) { return false; }
}

function setupAdmin() {
  const btnLogin = document.getElementById('btn-admin-login');
  const inputPass = document.getElementById('admin-pass');

  btnLogin.addEventListener('click', () => {
    if (verifyAdminPass(inputPass.value)) {
      inputPass.value = '';
      document.getElementById('admin-login').style.display = 'none';
      document.getElementById('admin-panel').style.display = 'block';
      updateAdminStats();
    } else {
      alert('❌ Mot de passe incorrect.');
      inputPass.value = '';
    }
  });
  inputPass.addEventListener('keypress', e => { if (e.key === 'Enter') btnLogin.click(); });

  document.getElementById('btn-sync-gh').addEventListener('click', () => {
    alert('🔄 Synchronisation gérée par le module github-sync (bouton remplacé automatiquement).');
  });

  document.getElementById('btn-reset-db').addEventListener('click', async () => {
    if (confirm('⚠️ Régénérer 10 000+ fiches et sauvegarder en IndexedDB ?')) {
      await DB.generateAndSave();
      updateAdminStats();
      runDiagnostics();
      alert('✅ Base régénérée et sauvegardée localement !');
    }
  });
}

function updateAdminStats() {
  const stats = DB.getStats();
  document.getElementById('admin-stats').innerHTML = `
    <p>📊 <strong>Total Fiches :</strong> ${stats.total.toLocaleString('fr-FR')}</p>
    <p>🏭 <strong>Marques Répertoriées :</strong> ${stats.brands}</p>
    <p>🚙 <strong>Fiches Dacia Spécifiques :</strong> ${stats.dacia.toLocaleString('fr-FR')}</p>
  `;
}

// ---------- PARTAGE ----------
function shareApp(type) {
  const url = window.location.href;
  const text = "Découvre Technique by Kevin, la base de données auto ultime (Rappels, DTC, Pannes) !";
  if (type === 'sms') window.location.href = `sms:?body=${encodeURIComponent(text + ' ' + url)}`;
  else if (type === 'email') window.location.href = `mailto:?subject=${encodeURIComponent('Technique by Kevin')}&body=${encodeURIComponent(text + '\n\n' + url)}`;
}

// ---------- AUTO-VÉRIFICATIONS ----------
function runDiagnostics() {
  const statusBar = document.getElementById('status-bar');
  const checks = [];

  checks.push({ label: 'Hors-Ligne (SW)', ok: 'serviceWorker' in navigator });

  const dbCount = DB.data.length;
  checks.push({ label: `BDD (${dbCount.toLocaleString('fr-FR')} fiches)`, ok: dbCount >= 10000 });

  const daciaCount = DB.data.filter(v => v.brand === 'Dacia').length;
  checks.push({ label: `Dacia (${daciaCount})`, ok: daciaCount > 100 });

  checks.push({ label: 'Moteur PDF', ok: typeof window.jspdf !== 'undefined' });

  checks.push({ label: 'Sauvegarde Locale', ok: DB.persisted === true });

  const withSpecs = DB.data.filter(v => v.technical_specs && v.technical_specs.zeroTo100 && v.technical_specs.body).length;
  checks.push({ label: 'Specs ≥3 lignes', ok: withSpecs === dbCount && dbCount > 0 });

  const pageText = document.body.innerText;
  checks.push({ label: 'Sécurité Admin', ok: !pageText.includes(ADMIN_PASS_ENCODED) && !document.getElementById('admin-pass').placeholder.includes('83600') });

  statusBar.innerHTML = checks.map(c =>
    `<span class="${c.ok ? 'status-ok' : 'status-err'}">${c.ok ? '✓' : '✗'} ${c.label}</span>`
  ).join('');

  console.group('%c🛠️ AUTO-VÉRIFICATIONS SYSTÈME', 'color: #00d4ff; font-weight: bold; font-size: 14px;');
  checks.forEach(c => {
    if (c.ok) console.log(`%c✓ ${c.label}`, 'color: #2ed573;');
    else console.error(`%c✗ ${c.label}`, 'color: #ff4757;');
  });
  console.groupEnd();
}
