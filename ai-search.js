const AI = {
  analyze(query) {
    const q = query.toLowerCase().trim();
    if (!q) return { results: [], insights: [] };

    // 1. Recherche textuelle dans la base
    let results = DB.search(q);

    // 2. Analyse sémantique et détection DTC
    let insights = [];

    // Regex pour détecter un code DTC (P, B, C, U suivis de 4 chiffres)
    const dtcMatch = q.match(/\b[pbcu]\d{4}\b/i);
    if (dtcMatch) {
      const code = dtcMatch[0].toUpperCase();
      // Chercher ce code dans toute la base
      const foundDTC = DB.data.flatMap(v => v.dtcs).find(d => d.c === code);
      if (foundDTC) {
        insights.push(`🔍 <strong>Code ${code} identifié :</strong> ${foundDTC.d}`);
      } else {
        insights.push(`🔍 <strong>Code ${code} :</strong> Non répertorié dans la base locale, consultez un professionnel.`);
      }
    }

    // Mots-clés techniques
    if (q.includes('diesel') || q.includes('dci') || q.includes('tdi') || q.includes('bluehdi')) {
      insights.push("⚠️ <strong>Motorisation Diesel :</strong> Surveillez l'encrassement de la vanne EGR, le colmatage du FAP (filtre à particules) et l'usure des injecteurs haute pression.");
    }
    if (q.includes('hybride') || q.includes('e-tech') || q.includes('phev')) {
      insights.push("🔋 <strong>Motorisation Hybride :</strong> Vérifiez l'état de la batterie haute tension (HV) et le bon fonctionnement du système de refroidissement de l'onduleur.");
    }
    if (q.includes('électrique') || q.includes('electrique') || q.includes('spring') || q.includes('ev')) {
      insights.push("⚡ <strong>Motorisation Électrique :</strong> Évitez les charges rapides systématiques au-delà de 80%. Contrôlez régulièrement la connectique de la borne Type 2.");
    }
    if (q.includes('dacia')) {
      insights.push("🛠️ <strong>Spécificités Dacia :</strong> Attention aux fuites d'huile sur joint spi de boîte (Duster dCi) et à la durée de vie de la chaîne de distribution sur les moteurs TCe récents.");
    }

    // Limiter les résultats pour ne pas faire planter le DOM
    return { results: results.slice(0, 50), insights: insights };
  }
};
