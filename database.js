const DB = {
  data: [],
  STORAGE_KEY: 'tk_db_v6_full', // Nouvelle clé = régénération auto sur tous les appareils

  init() {
    const cached = localStorage.getItem(this.STORAGE_KEY);
    if (cached) {
      try {
        this.data = JSON.parse(cached);
        console.log(`[DB] Chargée depuis LocalStorage: ${this.data.length} fiches.`);
      } catch (e) {
        console.error("[DB] Erreur parsing, régénération...", e);
        this.generateAndSave();
      }
    } else {
      this.generateAndSave();
    }
  },

  generateAndSave() {
    this.generate();
    this.save();
  },

  // ---------- OUTILS SPECS TECHNIQUES ----------
  detectFuel(motor) {
    const m = motor.toLowerCase();
    if (m.includes('electric') || m.includes('électrique')) return 'Électrique';
    if (m.includes('e-tech') || m.includes('hybrid') || m.includes('hybride')) return 'Hybride';
    if (m.includes('gpl') || m.includes('eco-g')) return 'GPL';
    if (m.includes('dci') || m.includes('tdi') || m.includes('bluehdi') || m.includes('diesel')) return 'Diesel';
    return 'Essence';
  },

  extractPower(motor) {
    const m = motor.match(/(\d+)\s*ch/i);
    return m ? parseInt(m[1], 10) : 100;
  },

  detectBodyType(model) {
    const m = model.toLowerCase();
    const vans = ['dokker', 'lodgy', 'jogger', 'berlingo', 'spacetourer', 'logan mcv', 'kangoo', 'combo', 'trafic', 'rifter', 'caddy'];
    const suv = ['duster', 'bigster', 'captur', '2008', '3008', '5008', 'c5 aircross', 'c3 aircross', 'austral', 'koleos', 'rafale', 'arkana', 'tiguan', 't-roc', 't-cross', 'taigo', 'id.4', 'id.3', 'x1', 'x3', 'x5', 'glc', 'gla', 'gle', 'xc40', 'xc60', 'xc90', 'ex30', 'ex90', 'rav4', 'c-hr', 'yaris cross', 'tucson', 'sportage', 'ev6', 'niro', 'kona', 'cx-5', 'cx-30', 'cx-60', 'ioniq 5', 'mach-e', 'kuga', 'compass', 'renegade', 'avenger', 'wrangler', 'grand cherokee', 'model y', 'model x', 'e-tron', 'q3', 'q5', 'q2', '500x'];
    const city = ['clio', '208', '108', 'yaris', 'i10', 'i20', 'picanto', 'rio', 'fiesta', 'polo', 'c3', 'c1', 'twingo', 'spring', 'ami', '500', 'panda', 'micra', 'sandero', 'aygo', 'swift', 'corsa', 'jazz', 'mazda 2', 'up'];
    if (vans.some(k => m.includes(k))) return 'Ludospace';
    if (suv.some(k => m.includes(k))) return 'SUV/Crossover';
    if (city.some(k => m.includes(k))) return 'Citadine';
    return 'Berline';
  },

  buildSpecs(model, motor) {
    const fuel = this.detectFuel(motor);
    const power = this.extractPower(motor);
    const body = this.detectBodyType(model);

    let torque;
    if (fuel === 'Électrique') torque = Math.round(100 + power * 0.6);
    else if (fuel === 'Hybride') torque = Math.round(power * 1.6);
    else if (fuel === 'Diesel') torque = Math.round(power * 2.3);
    else torque = Math.round(power * 1.8);

    let consumption;
    if (fuel === 'Électrique') consumption = (12 + power / 25).toFixed(1) + ' kWh/100km';
    else if (fuel === 'Hybride') consumption = (4.0 + power / 200).toFixed(1) + ' L/100km';
    else if (fuel === 'Diesel') consumption = (4.2 + power / 90).toFixed(1) + ' L/100km';
    else if (fuel === 'GPL') consumption = (6.2 + power / 80).toFixed(1) + ' L GPL/100km';
    else consumption = (5.2 + power / 80).toFixed(1) + ' L/100km';

    let co2 = 0;
    if (fuel !== 'Électrique') {
      co2 = Math.round(parseFloat(consumption) * (fuel === 'Diesel' ? 26.4 : 23.5));
    }

    let transmission;
    if (fuel === 'Électrique') transmission = 'Directe';
    else if (fuel === 'Hybride') transmission = 'AMT E-Tech';
    else {
      const boxes = power > 180 ? ['BVA8', 'DCT7', 'BVA6'] : ['BVM5', 'BVM6', 'BVA6', 'DCT7'];
      transmission = boxes[Math.floor(Math.random() * boxes.length)];
    }

    const fourWD = ['Duster', 'Bigster', 'Koleos', 'Austral', 'Tiguan', 'X3', 'GLC', 'Q5', 'RAV4', 'CR-V', 'CX-5', 'Sportage', 'Wrangler', 'Compass', 'Renegade', 'Outlander', 'Forester'];
    let drivetrain = 'Traction';
    if (fourWD.includes(model) && Math.random() > 0.4) drivetrain = '4x4';
    else if (power >= 250 && Math.random() > 0.5) drivetrain = 'Quattro/AWD';

    let z = 1200 / power + 2;
    if (fuel === 'Électrique') z -= 1.5;
    if (fuel === 'Hybride') z -= 0.5;
    z = Math.min(16, Math.max(3.2, z));
    const zeroTo100 = z.toFixed(1);

    let ts = 105 + power * 0.7;
    if (fuel === 'Électrique') ts = Math.min(ts, 180);
    const topSpeed = Math.round(Math.min(290, Math.max(120, ts)));

    const baseWeight = { 'Citadine': 1050, 'Berline': 1300, 'SUV/Crossover': 1450, 'Ludospace': 1500 };
    let weight = baseWeight[body] + power * 2;
    if (fuel === 'Électrique') weight += 250;
    weight = Math.round(weight / 10) * 10;

    const baseTrunk = { 'Citadine': 300, 'Berline': 480, 'SUV/Crossover': 470, 'Ludospace': 650 };
    const trunk = baseTrunk[body] + Math.floor(Math.random() * 60);
    const seats = ['Jogger', 'Lodgy', 'Dokker', 'Berlingo', 'SpaceTourer'].includes(model) ? 7 : 5;

    return { power, torque, fuel, transmission, drivetrain, consumption, co2, body, zeroTo100, topSpeed, weight, trunk, seats };
  },

  // ---------- GÉNÉRATION DÉTERMINISTE ≥ 10 000 FICHES ----------
  generate() {
    console.time('[DB] Génération');

    const brandsData = {
      francaise: {
        'Renault': ['Clio', 'Megane', 'Captur', 'Austral', 'Zoe', 'Arkana', 'Twingo', 'Kangoo'],
        'Peugeot': ['208', '308', '3008', '508', '408', '2008', 'Rifter', '108'],
        'Citroen': ['C3', 'C4', 'C5 Aircross', 'Ami', 'Berlingo', 'C3 Aircross', 'C1'],
        'DS': ['DS3 Crossback', 'DS4', 'DS7 Crossback', 'DS9'],
        'Dacia': ['Sandero', 'Sandero Stepway', 'Logan', 'Logan MCV', 'Duster', 'Jogger', 'Spring', 'Dokker', 'Lodgy', 'Bigster'],
        'Alpine': ['A110']
      },
      europeenne: {
        'Volkswagen': ['Golf', 'Polo', 'Tiguan', 'T-Roc', 'ID.3', 'ID.4', 'Passat', 'Up', 'Caddy'],
        'Audi': ['A1', 'A3', 'A4', 'Q3', 'Q5', 'e-tron'],
        'BMW': ['Serie 1', 'Serie 3', 'X1', 'X3', 'i4'],
        'Mercedes': ['Classe A', 'Classe C', 'GLA', 'GLC', 'EQS'],
        'Fiat': ['500', 'Panda', 'Tipo', '500X'],
        'Volvo': ['XC40', 'XC60', 'EX30', 'V60']
      },
      americaine: {
        'Ford': ['Fiesta', 'Focus', 'Mustang', 'Mach-E', 'Kuga'],
        'Tesla': ['Model 3', 'Model Y', 'Model S', 'Model X'],
        'Jeep': ['Renegade', 'Compass', 'Wrangler', 'Avenger'],
        'Chevrolet': ['Camaro', 'Corvette', 'Bolt EV']
      },
      asiatique: {
        'Toyota': ['Yaris', 'Corolla', 'C-HR', 'RAV4', 'Yaris Cross', 'Aygo X'],
        'Honda': ['Civic', 'CR-V', 'Jazz', 'HR-V'],
        'Hyundai': ['i10', 'i20', 'Tucson', 'Ioniq 5', 'Kona', 'i30'],
        'Kia': ['Picanto', 'Ceed', 'Sportage', 'EV6', 'Niro'],
        'Mazda': ['Mazda 2', 'Mazda 3', 'CX-5', 'MX-5']
      }
    };

    // Motorisations complètes par gamme (TOUTES assignées = 10 000+ garanti)
    const motorsGeneric = [
      '1.0 TSI 95ch', '1.0 TSI 110ch', '1.5 TSI 150ch', '2.0 TSI 190ch',
      '1.6 TDI 95ch', '2.0 TDI 150ch', '1.5 BlueHDi 130ch', '2.0 BlueHDi 180ch',
      'Hybride Rechargeable 225ch', '100% Électrique 136ch', '100% Électrique 204ch', 'V6 3.0 340ch'
    ];

    const motorsDacia = [
      'SCe 65 1.0 65ch', 'TCe 90 1.0 90ch', 'TCe 100 1.0 100ch', 'TCe 130 1.3 130ch',
      'Blue dCi 95 1.5 95ch', 'Blue dCi 115 1.5 115ch', 'ECO-G 100 1.0 GPL 100ch',
      'E-Tech Hybrid 140ch'
    ];

    const motorsElectric = [
      '100% Électrique 136ch', '100% Électrique 156ch', '100% Électrique 204ch', '100% Électrique 286ch'
    ];

    const motorsSpring = ['Spring Electric 45ch (33kW)', 'Spring Electric 65ch (48kW)'];

    // Modèles 100% électriques (reçoivent uniquement les motorisations électriques)
    const electricOnly = ['Zoe', 'Ami', 'ID.3', 'ID.4', 'e-tron', 'Model 3', 'Model Y', 'Model S', 'Model X', 'Mach-E', 'Bolt EV', 'Ioniq 5', 'EV6', 'EX30', 'i4', 'EQS'];

    const globalDTCs = [
      {c:'P0300', d:'Ratés d\'allumage aléatoires'}, {c:'P0420', d:'Efficacité catalyseur faible'},
      {c:'P0171', d:'Mélange air/carburant trop pauvre'}, {c:'P0700', d:'Défaut système commande transmission'},
      {c:'B1020', d:'Défaut calculateur airbag'}, {c:'U1000', d:'Perte communication CAN Bus'}
    ];

    const daciaDTCs = [
      {c:'P0087', d:'Pression rail common rail trop basse (1.5 dCi)'},
      {c:'P2002', d:'FAP colmaté / Efficacité particules faible'},
      {c:'P0A80', d:'Remplacement batterie hybride requis (E-Tech)'},
      {c:'P0A1F', d:'Défaut module batterie traction (Spring)'}
    ];

    const globalIssues = [
      {cat:'Moteur', desc:'Consommation d\'huile anormale'}, {cat:'Transmission', desc:'À-coups boîte auto à froid'},
      {cat:'Électrique', desc:'Décharge batterie 12V prématurée'}, {cat:'Carrosserie', desc:'Infiltration eau habitacle'}
    ];

    const daciaIssues = [
      {cat:'Moteur', desc:'Fuite huile joint spi boîte (Duster dCi)'}, {cat:'Moteur', desc:'Chaîne distribution détendue (TCe)'},
      {cat:'Électrique', desc:'Défaut capteur TPMS pression pneus'}, {cat:'Multimédia', desc:'Écran Media Nav noir après MAJ'},
      {cat:'Électrique', desc:'Borne charge Type 2 intermittente (Spring)'}
    ];

    const recallsPool = [
      {date:'2023-05-12', desc:'Campagne rappel airbag passager'}, {date:'2024-01-20', desc:'Rappel faisceau électrique moteur'},
      {date:'2022-11-05', desc:'Mise à jour logicielle calculateur'}, {date:'2023-09-18', desc:'Contrôle fixation ceintures'}
    ];

    const daciaRecalls = [
      {date:'2024-03-22', desc:'Rappel Dacia: Câblage hayon (Sandero/Logan)'},
      {date:'2023-11-10', desc:'Rappel Spring: Module charge batterie HV'},
      {date:'2024-06-15', desc:'Rappel Duster/Jogger: Fixation siège conducteur'}
    ];

    let tempData = [];
    let idCounter = 1;

    for (let origin in brandsData) {
      for (let brand in brandsData[origin]) {
        const isDacia = (brand === 'Dacia');
        const models = brandsData[origin][brand];
        const availableDTCs = isDacia ? [...globalDTCs, ...daciaDTCs] : globalDTCs;
        const availableIssues = isDacia ? [...globalIssues, ...daciaIssues] : globalIssues;
        const availableRecalls = isDacia ? [...recallsPool, ...daciaRecalls] : recallsPool;

        for (let model of models) {
          for (let year = 2018; year <= 2026; year++) {

            // Cohérence des années de commercialisation
            if ((model === 'Spring' || model === 'EX30') && year < 2021) continue;
            if (model === 'Bigster' && year < 2025) continue;
            if (model === 'Dokker' && year > 2021) continue;

            // Choix déterministe de la gamme de motorisations
            let motors;
            if (isDacia && model === 'Spring') motors = motorsSpring;
            else if (isDacia) motors = motorsDacia;
            else if (electricOnly.includes(model)) motors = motorsElectric;
            else motors = motorsGeneric;

            // TOUTES les motorisations de la gamme = volume garanti
            for (let motor of motors) {

              const hasRecall = Math.random() > 0.8;
              const hasDTC = Math.random() > 0.6;
              const hasIssue = Math.random() > 0.5;

              tempData.push({
                id: `TK-${String(idCounter++).padStart(5, '0')}`,
                origin: origin,
                brand: brand,
                model: model,
                year: year,
                motor: motor,
                technical_specs: this.buildSpecs(model, motor),
                recalls: hasRecall ? [availableRecalls[Math.floor(Math.random() * availableRecalls.length)]] : [],
                dtcs: hasDTC ? [availableDTCs[Math.floor(Math.random() * availableDTCs.length)], availableDTCs[Math.floor(Math.random() * availableDTCs.length)]] : [],
                issues: hasIssue ? [availableIssues[Math.floor(Math.random() * availableIssues.length)]] : []
              });
            }
          }
        }
      }
    }

    this.data = tempData;
    console.timeEnd('[DB] Génération');
    console.log(`[DB] Généré: ${this.data.length} fiches (objectif ≥ 10 000).`);
  },

  save() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.data));
      console.log("[DB] Sauvegardée dans LocalStorage.");
    } catch (e) {
      console.error("[DB] Quota LocalStorage dépassé !", e);
    }
  },

  filter(criteria) {
    return this.data.filter(v =>
      (!criteria.origin || v.origin === criteria.origin) &&
      (!criteria.brand || v.brand === criteria.brand) &&
      (!criteria.model || v.model === criteria.model) &&
      (!criteria.year || v.year == criteria.year)
    );
  },

  search(query) {
    const q = query.toLowerCase().trim();
    if (!q) return [];
    return this.data.filter(v =>
      v.brand.toLowerCase().includes(q) ||
      v.model.toLowerCase().includes(q) ||
      v.motor.toLowerCase().includes(q) ||
      v.id.toLowerCase().includes(q)
    );
  },

  getStats() {
    const daciaCount = this.data.filter(v => v.brand === 'Dacia').length;
    const brandsCount = new Set(this.data.map(v => v.brand)).size;
    return { total: this.data.length, brands: brandsCount, dacia: daciaCount };
  }
};
