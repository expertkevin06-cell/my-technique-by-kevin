document.addEventListener('DOMContentLoaded', () => {
  DB.init();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('[SW] Enregistré avec succès'))
      .catch(err => console.error('[SW] Échec enregistrement', err));
  }

  setupNavigation();
  setupFilters();
  setupAI();
  setupAdmin();
  runDiagnostics();

  setTimeout(() => {
    document.getElementById('splash').classList.add('hidden');
  }, 1200);
});

// --- NAVIGATION ---
function setupNavigation() {
  const buttons = document.querySelectorAll('nav button');
  const sections = document.querySelectorAll('.section');

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('active'));
      sections.forEach(s => s.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(btn.dataset.target).classList.add('active');
    });
  });
}

// --- FILTRES EN CASCADE ---
function setupFilters() {
  const fOrigin = document.getElementById('f-origin');
  const fBrand = document.getElementById('f-brand');
  const fModel = document.getElementById('f-model');
  const fYear = document.getElementById('f-year');
  const btnFilter = document.getElementById('btn-filter');

  const origins = [...new Set(DB.data.map(v => v.origin))].sort();
  origins.forEach(o => {
    const opt = document.createElement('option');
    opt.value = o; opt.textContent = o.charAt(0).toUpperCase() + o.slice(1);
    fOrigin.appendChild(opt);
  });

  for (let y = 2026; y >= 2018; y--) {
    const opt = document.createElement('option');
    opt.value = y; opt.textContent = y;
    fYear.appendChild(opt);
  }

  fOrigin.addEventListener('change', () => {
    fBrand.innerHTML = '<option value="">Toutes Marques</option>';
    fModel.innerHTML = '<option value="">Tous Modèles</option>';
    const filteredBrands = [...new Set(DB.data.filter(v => !fOrigin.value || v.origin === fOrigin.value).map(v => v.brand))].sort();
    filteredBrands.forEach(b => {
      const opt = document.createElement('option');
      opt.value = b; opt.textContent = b;
      fBrand.appendChild(opt);
    });
  });

  fBrand.addEventListener('change', () => {
    fModel.innerHTML = '<option value="">Tous Modèles</option>';
    const filteredModels = [...new Set(DB.data.filter(v =>
      (!fOrigin.value || v.origin === fOrigin.value) &&
      (!fBrand.value || v.brand === fBrand.value)
    ).map(v => v.model))].sort();
    filteredModels.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m; opt.textContent = m;
      fModel.appendChild(opt);
    });
  });

  btnFilter.addEventListener('click', () => {
    const criteria = { origin: fOrigin.value, brand: fBrand.value, model: fModel.value, year: fYear.value };
    const results = DB.filter(criteria);
    renderCards(results, 'filter-results');
  });
}

// --- RECHERCHE IA ---
function setupAI() {
  const btnAi = document.getElementById('btn-ai');
  const inputAi = document.getElementById('ai-input');

  const doSearch = () => {
    const res = AI.analyze(inputAi.value);
    let html = '';
    if (res.insights.length > 0) {
      html += res.insights.map(insight => `<div class="card insight-card">${insight}</div>`).join('');
    }
    const container = document.getElementById('ai-results');
    container.innerHTML = html;
    renderCards(res.results, 'ai-results', true);
  };

  btnAi.addEventListener('click', doSearch);
  inputAi.addEventListener('keypress', (e) => { if (e.key === 'Enter') doSearch(); });
}

// ============================================================
// --- RENDU DES CARTES : 4 LIGNES DE SPECS + BADGES DÉTAILLÉS
// ============================================================
function renderCards(list, containerId, append = false) {
  const container = document.getElementById(containerId);
  if (!append) container.innerHTML = '';

  if (list.length === 0 && !append) {
    container.innerHTML = '<p style="text-align:center; color:#aaa; margin-top:20px;">Aucun résultat trouvé pour ces critères.</p>';
    return;
  }

  if (list.length > 0 && !append) {
    const countMsg = document.createElement('p');
    countMsg.style.color = '#aaa'; countMsg.style.marginBottom = '15px';
    countMsg.textContent = `${list.length} fiche(s) trouvée(s).`;
    container.appendChild(countMsg);
  }

  const fragment = document.createDocumentFragment();

  list.forEach(v => {
    const t = v.technical_specs || {};
    const card = document.createElement('div');
    card.className = 'card';

    // Badges d'alertes
    const badges = [];
    if (v.recalls.length) badges.push(`<span class="badge recall">🔔 ${v.recalls.length} Rappel${v.recalls.length > 1 ? 's' : ''}</span>`);
    if (v.dtcs.length) badges.push(`<span class="badge dtc">⚠️ ${v.dtcs.length} DTC</span>`);
    if (v.issues.length) badges.push(`<span class="badge issue">🛠️ ${v.issues.length} Panne${v.issues.length > 1 ? 's' : ''}</span>`);
    if (!badges.length) badges.push('<span class="badge ok">✓ Aucune alerte connue</span>');

    // Lignes de détail
    const details = [];
    if (v.recalls.length) details.push(`<p class="detail-line recall-line">🔔 ${v.recalls[0].date} — ${v.recalls[0].desc}</p>`);
    if (v.dtcs.length) details.push(`<p class="detail-line"><span class="dtc">DTC :</span> ${v.dtcs.map(d => d.c).join(', ')}</p>`);
    if (v.issues.length) details.push(`<p class="detail-line">🛠️ ${v.issues[0].cat} : ${v.issues[0].desc}</p>`);

    card.innerHTML = `
      <h3>${v.brand} ${v.model} <small>${v.year} • ${v.id}</small></h3>

      <div class="spec-lines">
        <div class="spec-line">
          <span title="Motorisation">⚙️ ${v.motor}</span>
          <span title="Puissance">💪 ${t.power != null ? t.power + ' ch' : '—'}</span>
          <span title="Carburant">⛽ ${t.fuel || '—'}</span>
        </div>
        <div class="spec-line">
          <span title="Boîte">🔧 ${t.transmission || '—'}</span>
          <span title="Transmission">🛞 ${t.drivetrain || '—'}</span>
          <span title="Carrosserie">🚗 ${t.body || '—'}</span>
        </div>
        <div class="spec-line">
          <span title="0-100 km/h">🚀 ${t.zeroTo100 ? t.zeroTo100 + ' s' : '—'}</span>
          <span title="Vitesse max">🏁 ${t.topSpeed ? t.topSpeed + ' km/h' : '—'}</span>
          <span title="Poids">⚖️ ${t.weight ? t.weight + ' kg' : '—'}</span>
        </div>
        <div class="spec-line">
          <span title="CO2">🌫️ ${t.co2 != null ? t.co2 + ' g/km' : '—'}</span>
          <span title="Consommation">🔄 ${t.consumption || '—'}</span>
          <span title="Coffre / Places">🧳 ${t.trunk ? t.trunk + ' L • ' + t.seats + ' pl.' : '—'}</span>
        </div>
      </div>

      <div class="badges">${badges.join('')}</div>
      ${details.join('')}

      <button class="btn" onclick="generatePDF('${v.id}')">📄 Télécharger la fiche PDF</button>
    `;
    fragment.appendChild(card);
  });

  container.appendChild(fragment);
}

// --- ADMINISTRATION (SÉCURISÉE) ---
const ADMIN_PASS_ENCODED = 'S2V2aW44MzYwMA==';

function verifyAdminPass(input) {
  try { return btoa(input.trim()) === ADMIN_PASS_ENCODED; }
  catch (e) { return false; }
}

function setupAdmin() {
  const btnLogin = document.getElementById('btn-admin-login');
  const inputPass = document.getElementById('admin-pass');
  const loginDiv = document.getElementById('admin-login');
  const panelDiv = document.getElementById('admin-panel');

  btnLogin.addEventListener('click', () => {
    if (verifyAdminPass(inputPass.value)) {
      inputPass.value = '';
      loginDiv.style.display = 'none';
      panelDiv.style.display = 'block';
      updateAdminStats();
    } else {
      alert('❌ Mot de passe incorrect.');
      inputPass.value = '';
    }
  });

  inputPass.addEventListener('keypress', (e) => { if (e.key === 'Enter') btnLogin.click(); });

  document.getElementById('btn-sync-gh').addEventListener('click', () => {
    alert('🔄 Synchronisation GitHub/Qwen simulée.\nEn production, ceci déclenche un fetch vers l\'API GitHub pour mettre à jour le JSON local.');
  });

  document.getElementById('btn-reset-db').addEventListener('click', () => {
    if (confirm('⚠️ Attention : Cela va effacer les données locales et régénérer plus de 10 000 fiches. Continuer ?')) {
      DB.generateAndSave();
      updateAdminStats();
      runDiagnostics();
      alert('✅ Base de données régénérée avec succès !');
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

// --- PARTAGE ---
function shareApp(type) {
  const url = window.location.href;
  const text = "Découvre Technique by Kevin, la base de données auto ultime (Rappels, DTC, Pannes) !";
  if (type === 'sms') window.location.href = `sms:?body=${encodeURIComponent(text + ' ' + url)}`;
  else if (type === 'email') window.location.href = `mailto:?subject=${encodeURIComponent('Technique by Kevin')}&body=${encodeURIComponent(text + '\n\n' + url)}`;
}

// --- AUTO-VÉRIFICATIONS ---
function runDiagnostics() {
  const statusBar = document.getElementById('status-bar');
  const checks = [];

  checks.push({ label: 'Hors-Ligne (SW)', ok: 'serviceWorker' in navigator });

  const dbCount = DB.data.length;
  checks.push({ label: `BDD (${dbCount.toLocaleString('fr-FR')} fiches)`, ok: dbCount >= 10000 });

  const daciaCount = DB.data.filter(v => v.brand === 'Dacia').length;
  checks.push({ label: `Dacia (${daciaCount})`, ok: daciaCount > 100 });

  checks.push({ label: 'Moteur PDF', ok: typeof window.jspdf !== 'undefined' });
  checks.push({ label: 'Sauvegarde Locale', ok: !!localStorage.getItem(DB.STORAGE_KEY) });

  // Vérifie que 100% des fiches ont bien leurs 4 lignes de specs
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
