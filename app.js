document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialisation Base de Données
  DB.init();

  // 2. Enregistrement Service Worker (Mode hors-ligne)
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('[SW] Enregistré avec succès'))
      .catch(err => console.error('[SW] Échec enregistrement', err));
  }

  // 3. Setup Interface
  setupNavigation();
  setupFilters();
  setupAI();
  setupAdmin();

  // 4. Lancement des Auto-vérifications
  runDiagnostics();

  // 5. Disparition Splash Screen
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
      // Retirer active partout
      buttons.forEach(b => b.classList.remove('active'));
      sections.forEach(s => s.classList.remove('active'));
      
      // Ajouter active au cliqué
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

  // Remplissage Origines
  const origins = [...new Set(DB.data.map(v => v.origin))].sort();
  origins.forEach(o => {
    const opt = document.createElement('option');
    opt.value = o; opt.textContent = o.charAt(0).toUpperCase() + o.slice(1);
    fOrigin.appendChild(opt);
  });

  // Remplissage Années
  for (let y = 2026; y >= 2018; y--) {
    const opt = document.createElement('option');
    opt.value = y; opt.textContent = y;
    fYear.appendChild(opt);
  }

  // Cascade Origine -> Marque
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

  // Cascade Marque -> Modèle
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

  // Action Rechercher
  btnFilter.addEventListener('click', () => {
    const criteria = {
      origin: fOrigin.value,
      brand: fBrand.value,
      model: fModel.value,
      year: fYear.value
    };
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
    
    // Afficher les insights (conseils IA)
    if (res.insights.length > 0) {
      html += res.insights.map(insight => `<div class="card insight-card">${insight}</div>`).join('');
    }
    
    // Afficher les véhicules trouvés
    const container = document.getElementById('ai-results');
    container.innerHTML = html;
    renderCards(res.results, 'ai-results', true); // true = append
  };

  btnAi.addEventListener('click', doSearch);
  inputAi.addEventListener('keypress', (e) => { if (e.key === 'Enter') doSearch(); });
}

// --- RENDU DES CARTES ---
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
    const card = document.createElement('div');
    card.className = 'card';
    
    let recallsHtml = v.recalls.length ? `<p class="recall">⚠️ Rappel : ${v.recalls[0].desc}</p>` : '';
    let dtcsHtml = v.dtcs.length ? `<p><span class="dtc">DTC :</span> ${v.dtcs.map(d => d.c).join(', ')}</p>` : '';
    let issuesHtml = v.issues.length ? `<p>🛠️ Panne connue : ${v.issues[0].desc}</p>` : '';

    card.innerHTML = `
      <h3>${v.brand} ${v.model} <small>${v.year}</small></h3>
      <p><strong>Moteur :</strong> ${v.motor}</p>
      ${recallsHtml}
      ${dtcsHtml}
      ${issuesHtml}
      <button class="btn" onclick="generatePDF('${v.id}')">📄 Télécharger la fiche PDF</button>
    `;
    fragment.appendChild(card);
  });

  container.appendChild(fragment);
}

// --- ADMINISTRATION ---
function setupAdmin() {
  const btnLogin = document.getElementById('btn-admin-login');
  const inputPass = document.getElementById('admin-pass');
  const loginDiv = document.getElementById('admin-login');
  const panelDiv = document.getElementById('admin-panel');

  btnLogin.addEventListener('click', () => {
    if (inputPass.value === 'Kevin83600') {
      loginDiv.style.display = 'none';
      panelDiv.style.display = 'block';
      updateAdminStats();
    } else {
      alert('❌ Mot de passe incorrect.');
      inputPass.value = '';
    }
  });

  document.getElementById('btn-sync-gh').addEventListener('click', () => {
    alert('🔄 Synchronisation GitHub/Qwen simulée.\nEn production, ceci déclenche un fetch vers l\'API GitHub pour mettre à jour le JSON local.');
  });

  document.getElementById('btn-reset-db').addEventListener('click', () => {
    if(confirm('⚠️ Attention : Cela va effacer les données locales et régénérer plus de 10 000 fiches. Continuer ?')) {
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
  
  if (type === 'sms') {
    window.location.href = `sms:?body=${encodeURIComponent(text + ' ' + url)}`;
  } else if (type === 'email') {
    window.location.href = `mailto:?subject=${encodeURIComponent('Technique by Kevin')}&body=${encodeURIComponent(text + '\n\n' + url)}`;
  }
}

// --- AUTO-VÉRIFICATIONS (Sans Bug) ---
function runDiagnostics() {
  const statusBar = document.getElementById('status-bar');
  const checks = [];

  // 1. Check Service Worker
  checks.push({ label: 'Hors-Ligne (SW)', ok: 'serviceWorker' in navigator });

  // 2. Check Volume BDD (> 10000)
  const dbCount = DB.data.length;
  checks.push({ label: `BDD (${dbCount.toLocaleString('fr-FR')} fiches)`, ok: dbCount >= 10000 });

  // 3. Check Dacia
  const daciaCount = DB.data.filter(v => v.brand === 'Dacia').length;
  checks.push({ label: `Dacia (${daciaCount})`, ok: daciaCount > 100 });

  // 4. Check jsPDF
  checks.push({ label: 'Moteur PDF', ok: typeof window.jspdf !== 'undefined' });

  // 5. Check LocalStorage
  checks.push({ label: 'Sauvegarde Locale', ok: !!localStorage.getItem(DB.STORAGE_KEY) });

  // Rendu HTML
  statusBar.innerHTML = checks.map(c => 
    `<span class="${c.ok ? 'status-ok' : 'status-err'}">${c.ok ? '✓' : '✗'} ${c.label}</span>`
  ).join('');

  // Log console pour debug
  console.group('%c🛠️ AUTO-VÉRIFICATIONS SYSTÈME', 'color: #00d4ff; font-weight: bold; font-size: 14px;');
  checks.forEach(c => {
    if(c.ok) console.log(`%c✓ ${c.label}`, 'color: #2ed573;');
    else console.error(`%c✗ ${c.label}`, 'color: #ff4757;');
  });
  console.groupEnd();
}
