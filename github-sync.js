// ============================================================
// GITHUB SYNC : Pull au lancement + Push admin (temps réel)
// ============================================================
const GithubSync = {
  tokenKey: 'tk_gh_token',
  overridesKey: 'tk_overrides_local',

  rawUrl() {
    return `https://raw.githubusercontent.com/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/${GITHUB_CONFIG.branch}/${GITHUB_CONFIG.overridesPath}`;
  },
  apiUrl() {
    return `https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${GITHUB_CONFIG.overridesPath}`;
  },
  headers() {
    return {
      'Authorization': 'token ' + localStorage.getItem(this.tokenKey),
      'Accept': 'application/vnd.github+json'
    };
  },

  getLocalOverrides() {
    try {
      return JSON.parse(localStorage.getItem(this.overridesKey)) || { recalls: [], dtcs: [], issues: [] };
    } catch (e) {
      return { recalls: [], dtcs: [], issues: [] };
    }
  },

  saveLocalOverrides(o) {
    localStorage.setItem(this.overridesKey, JSON.stringify(o));
  },

  // Fusion sans doublons (par uid)
  mergeOverrides(a, b) {
    const out = { recalls: [...(a.recalls || [])], dtcs: [...(a.dtcs || [])], issues: [...(a.issues || [])] };
    const addArr = (arr, items) => (items || []).forEach(it => { if (it.uid && !arr.some(x => x.uid === it.uid)) arr.push(it); });
    addArr(out.recalls, b.recalls);
    addArr(out.dtcs, b.dtcs);
    addArr(out.issues, b.issues);
    return out;
  },

  // Application IDEMPOTENTE (aucun doublon même après 10 lancements)
  applyToDB(o) {
    let count = 0;
    const match = (v, e) => v.brand === e.brand && v.model === e.model && (!e.year || String(v.year) === String(e.year));

    (o.recalls || []).forEach(e => DB.data.forEach(v => {
      if (match(v, e) && !v.recalls.some(x => x.uid === e.uid)) { v.recalls.push({ uid: e.uid, date: e.date, desc: e.desc }); count++; }
    }));
    (o.dtcs || []).forEach(e => DB.data.forEach(v => {
      if (match(v, e) && !v.dtcs.some(x => x.uid === e.uid)) { v.dtcs.push({ uid: e.uid, c: e.code, d: e.desc }); count++; }
    }));
    (o.issues || []).forEach(e => DB.data.forEach(v => {
      if (match(v, e) && !v.issues.some(x => x.uid === e.uid)) { v.issues.push({ uid: e.uid, cat: e.cat, desc: e.desc }); count++; }
    }));
    return count;
  },

  // PULL automatique à chaque lancement (actualisation des données)
  async autoPull() {
    try {
      if (GITHUB_CONFIG.owner.includes('VOTRE_PSEUDO')) return -1; // Non configuré
      const res = await fetch(this.rawUrl() + '?t=' + Date.now(), { cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const remote = await res.json();
      const merged = this.mergeOverrides(this.getLocalOverrides(), remote);
      this.saveLocalOverrides(merged);
      const n = this.applyToDB(merged);
      DB.save();
      console.log(`[Sync] ${n} élément(s) distant(s) appliqué(s).`);
      return n;
    } catch (e) {
      console.warn('[Sync] Pull impossible (hors-ligne ou fichier absent) :', e.message);
      return -1;
    }
  },

  // PUSH admin vers GitHub (propagation temps réel vers tous les APK)
  async push() {
    let token = localStorage.getItem(this.tokenKey);
    if (!token) {
      token = prompt('Entrez votre Token GitHub (scope: repo) :\n(Créez-le sur github.com → Settings → Developer settings → Tokens)');
      if (!token) throw new Error('Token requis');
      localStorage.setItem(this.tokenKey, token);
    }

    const toBase64 = (str) => {
      const bytes = new TextEncoder().encode(str);
      let bin = '';
      bytes.forEach(b => bin += String.fromCharCode(b));
      return btoa(bin);
    };

    const body = {
      message: 'Mise à jour temps réel - Admin Technique by Kevin',
      content: toBase64(JSON.stringify(this.getLocalOverrides(), null, 2))
    };

    // Récupérer le sha actuel (fichier existant)
    const getRes = await fetch(this.apiUrl(), { headers: this.headers() });
    if (getRes.ok) {
      const cur = await getRes.json();
      body.sha = cur.sha;
    }

    const putRes = await fetch(this.apiUrl(), {
      method: 'PUT',
      headers: this.headers(),
      body: JSON.stringify(body)
    });
    if (!putRes.ok) throw new Error('HTTP ' + putRes.status);
    return true;
  }
};
