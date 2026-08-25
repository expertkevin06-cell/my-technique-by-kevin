async function generatePDF(vehicleId) {
  if (typeof window.jspdf === 'undefined') {
    alert("Erreur : La librairie PDF n'est pas chargée. Vérifiez votre connexion internet.");
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  
  const v = DB.data.find(x => x.id === vehicleId);
  if (!v) {
    alert("Véhicule introuvable dans la base.");
    return;
  }

  // --- EN-TÊTE ---
  doc.setFillColor(5, 5, 5);
  doc.rect(0, 0, 210, 40, 'F');
  
  doc.setTextColor(0, 212, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text('Technique by Kevin', 105, 20, { align: 'center' });
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text('Fiche Technique & Diagnostic Constructeur', 105, 30, { align: 'center' });

  let y = 55;

  // --- INFOS GÉNÉRALES ---
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(`${v.brand} ${v.model}`, 20, y);
  
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  y += 10;
  doc.text(`Année : ${v.year}  |  ID Fiche : ${v.id}`, 20, y);
  y += 7;
  doc.text(`Motorisation : ${v.motor}`, 20, y);
  y += 7;
  doc.text(`Origine : ${v.origin.charAt(0).toUpperCase() + v.origin.slice(1)}`, 20, y);
  y += 15;

  // Fonction utilitaire pour ajouter des sections avec saut de page automatique
  const addSection = (title, colorRGB, itemsArray) => {
    if (!itemsArray || itemsArray.length === 0) return;

    // Vérifier s'il faut sauter la page
    if (y > 260) {
      doc.addPage();
      y = 20;
    }

    doc.setDrawColor(colorRGB[0], colorRGB[1], colorRGB[2]);
    doc.setLineWidth(0.5);
    doc.line(20, y, 190, y);
    y += 8;

    doc.setTextColor(colorRGB[0], colorRGB[1], colorRGB[2]);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(title, 20, y);
    y += 8;

    doc.setTextColor(50, 50, 50);
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");

    itemsArray.forEach(item => {
      if (y > 280) {
        doc.addPage();
        y = 20;
      }
      
      let text = "";
      if (item.c) { // C'est un DTC
        text = `[${item.c}] ${item.d}`;
      } else if (item.cat) { // C'est une panne
        text = `[${item.cat}] ${item.desc}`;
      } else if (item.date) { // C'est un rappel
        text = `(${item.date}) - ${item.desc}`;
      } else {
        text = String(item);
      }

      // Split text pour éviter les débordements horizontaux
      const splitText = doc.splitTextToSize(`• ${text}`, 170);
      doc.text(splitText, 20, y);
      y += (splitText.length * 6) + 2;
    });

    y += 10;
  };

  // --- SECTIONS ---
  addSection('CAMPAGNES DE RAPPEL CONSTRUCTEUR', [255, 165, 2], v.recalls);
  addSection('CODES DTC & DÉFAUTS CALCULATEUR', [255, 71, 87], v.dtcs);
  addSection('PANNES & DYSFONCTIONNEMENTS CONNUS', [150, 0, 200], v.issues);

  // --- PIED DE PAGE ---
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Technique by Kevin - Généré le ${new Date().toLocaleDateString('fr-FR')} - Page ${i}/${pageCount}`, 105, 290, { align: 'center' });
  }

  // Sauvegarde du fichier
  doc.save(`TechKevin_${v.brand}_${v.model}_${v.year}.pdf`);
}
