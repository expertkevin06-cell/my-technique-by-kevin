// ============================================================
// ADMIN-TOOLS : Panneau d'ajout temps réel (se greffe SANS modifier app.js)
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  enhanceAdminPanel();
  replaceSyncButton();
  startSync();
});

async function startSync() {
  const n = await GithubSync.autoPull();
  if (typeof runDiagnostics === 'function') runDiagnostics();
  const bar = document.getElementById('status-bar');
  const s = document.createElement('span');
  if (n >= 0) { s.className = 'status-ok'; s.textContent = `✓ Sync GitHub (${n} appliqué)`; }
  else { s.className = 'status-err'; s.textContent = '✗ Sync GitHub (hors-ligne/non configuré)'; }
  bar.appendChild(s);
}

// Remplace l'ancien bouton "simulé" par le vrai sync (clone = supprime anciens listeners)
function replaceSyncButton() {
  const oldBtn = document.getElementById('btn-sync-gh');
  if (!oldBtn) return;
  const newBtn = oldBtn.cloneNode(true);
  oldBtn.replaceWith(newBtn);
  newBtn.addEventListener('click', async () => {
    const n = await GithubSync.autoPull();
    alert(n >= 0 ? `✅ Synchronisation réussie : ${n} élément(s) appliqué(s).` : '⚠️ GitHub injoignable (hors-ligne ou config manquante).');
    if (typeof runDiagnostics === 'function') runDiagnostics();
  });
}

function enhanceAdminPanel() {
  const panel = document.getElementById('admin-panel');
  if (!panel) return;

  const div = document.createElement('div');
  div.innerHTML = `
    <h3 style="margin:20px 0 10px; color:#00d4ff;">➕ Ajout temps réel (diffusé à tous les APK)</h3>
    <select id="at-brand"><option value="">Marque</option></select>
    <select id="at-model"><option value="">Modèle</option></select>
    <input type="number" id="at-year" placeholder="Année (optionnel, ex: 2021)" min="2018" max="2026">
    <select id="at-type">
      <option value="recall">Rappel constructeur</option>
      <option value="dtc">Code DTC</option>
      <option value="issue">Panne connue</option>
    </select>
    <input type="text" id="at-date" placeholder="Date (AAAA-MM-JJ) - si rappel">
    <input type="text" id="at-code" placeholder="Code DTC (ex: P0087) - si DTC" style="display:none;">
    <input type="text" id="at-cat" placeholder="Catégorie (Moteur, Électrique...) - si panne" style="display:none;">
    <input type="text" id="at-desc" placeholder="Description technique">
    <button class="btn" id="btn-at-add">➕ Ajouter à la base locale</button>
    <button class="btn btn-primary" id="btn-at-push">🚀 Pousser sur GitHub (temps réel)</button>
    <button class="btn" id="btn-at-export">💾 Télécharger overrides.json</button>
  `;
  panel.appendChild(div);

  const bSel = div.querySelector('#at-brand');
  const mSel = div.querySelector('#at-model');
  [...new Set(DB.data.map(v => v.brand))].sort().forEach(b => bSel.add(new Option(b, b)));
  bSel.addEventListener('change', () => {
    mSel.innerHTML = '<option value="">Modèle</option>';
    [...new Set(DB.data.filter(v => v.brand === bSel.value).map(v => v.model))].sort().forEach(m => mSel.add(new Option(m, m)));
  });

  div.querySelector('#at-type').addEventListener('change', (e) => {
    div.querySelector('#at-code').style.display = e.target.value === 'dtc' ? 'block' : 'none';
    div.querySelector('#at-cat').style.display = e.target.value === 'issue' ? 'block' : 'none';
    div.querySelector('#at-date').style.display = e.target.value === 'recall' ? 'block' : 'none';
  });

  div.querySelector('#btn-at-add').addEventListener('click', () => {
    const brand = bSel.value, model = mSel.value;
    const year = div.querySelector('#at-year').value || null;
    const type = div.querySelector('#at-type').value;
    const desc = div.querySelector('#at-desc').value.trim();
    if (!brand || !model || !desc) { alert('❌ Marque, modèle et description obligatoires.'); return; }

    const o = GithubSync.getLocalOverrides();
    const uid = 'OV-' + Date.now();

    if (type === 'recall') {
      o.recalls.push({ uid, brand, model, year, date: div.querySelector('#at-date').value || new Date().toISOString().slice(0, 10), desc });
    } else if (type === 'dtc') {
      const code = div.querySelector('#at-code').value.trim().toUpperCase();
      if (!code) { alert('❌ Code DTC requis.'); return; }
      o.dtcs.push({ uid, brand, model, year, code, desc });
    } else {
      o.issues.push({ uid, brand, model, year, cat: div.querySelector('#at-cat').value || 'Général', desc });
    }

    GithubSync.saveLocalOverrides(o);
    GithubSync.applyToDB(o);
    DB.save();
    if (typeof updateAdminStats === 'function') updateAdminStats();
    alert('✅ Ajouté localement.\nCliquez maintenant sur "Pousser sur GitHub" pour diffuser à tous les APK.');
  });

  div.querySelector('#btn-at-push').addEventListener('click', async () => {
    try {
      await GithubSync.push();
      alert('✅ Push réussi !\nToutes les installations recevront la mise à jour au prochain lancement.');
    } catch (e) { alert('❌ Échec du push : ' + e.message); }
  });

  div.querySelector('#btn-at-export').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(GithubSync.getLocalOverrides(), null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'overrides.json';
    a.click();
  });
}
