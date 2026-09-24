/* ══════════════════════════════════════════════════════════════════════
   L'écran de Namolu, codé (24/09/2026)

   La référence (toolio.com) pose des CAPTURES de son application : un
   tableau de bord à quatre tuiles bleues, un graphique barres + courbe et
   un tableau. Namolu n'a pas encore d'application à photographier : cet
   écran en est la maquette, en balisage, à la même composition. Il est
   étiqueté « données d'exemple » (règles maison : un graphique qui ne
   montre pas les données d'un vrai client le dit).

   Largeur naturelle 940 px ; sous cette largeur il est mis à l'échelle
   par <Echelle>, jamais réorganisé — comme la capture qu'il remplace.
   ══════════════════════════════════════════════════════════════════════ */

export type Tuile = { libelle: string; valeur: string; detail: string };
export type Ligne = string[];

export type EcranProps = {
  titre: string;
  sousTitre: string;
  menu: string[];
  actif: number;
  tuiles: Tuile[];
  graphique: { titre: string; barres: number[]; courbe: number[]; legende: [string, string] };
  colonnes: string[];
  lignes: Ligne[];
};

function Graphique({ barres, courbe }: { barres: number[]; courbe: number[] }) {
  const L = 620;
  const H = 150;
  const pas = L / barres.length;
  const max = Math.max(...barres, ...courbe);
  const y = (v: number) => H - (v / max) * (H - 12);
  const points = courbe.map((v, i) => `${(i + 0.5) * pas},${y(v)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${L} ${H}`} className="nm-ecran__svg" aria-hidden>
      {[0.25, 0.5, 0.75].map((k) => (
        <line key={k} x1="0" x2={L} y1={H * k} y2={H * k} className="nm-ecran__grille" />
      ))}
      {barres.map((v, i) => (
        <rect
          key={i}
          x={i * pas + pas * 0.22}
          y={y(v)}
          width={pas * 0.56}
          height={H - y(v)}
          rx="1.5"
          className="nm-ecran__barre"
        />
      ))}
      <polyline points={points} className="nm-ecran__courbe" />
      {courbe.map((v, i) => (
        <circle key={i} cx={(i + 0.5) * pas} cy={y(v)} r="2.6" className="nm-ecran__point" />
      ))}
    </svg>
  );
}

export default function Ecran({
  titre,
  sousTitre,
  menu,
  actif,
  tuiles,
  graphique,
  colonnes,
  lignes,
}: EcranProps) {
  return (
    <div className="nm-ecran" aria-hidden>
      <div className="nm-ecran__barre-haut">
        <span className="nm-ecran__logo">
          <span className="nm-ecran__signe" />
          Namolu
        </span>
        <span className="nm-ecran__fil">{titre}</span>
        <span className="nm-ecran__exemple">Données d&apos;exemple</span>
        <span className="nm-ecran__avatars">
          <span>DA</span>
          <span>M2</span>
          <span>LG</span>
        </span>
      </div>
      <div className="nm-ecran__corps">
        <nav className="nm-ecran__menu">
          {menu.map((m, i) => (
            <span key={m} className={i === actif ? "is-actif" : undefined}>
              {m}
            </span>
          ))}
        </nav>
        <div className="nm-ecran__contenu">
          <p className="nm-ecran__sous-titre">{sousTitre}</p>
          <div className="nm-ecran__tuiles">
            {tuiles.map((t) => (
              <div key={t.libelle} className="nm-ecran__tuile">
                <span className="nm-ecran__tuile-libelle">{t.libelle}</span>
                <span className="nm-ecran__tuile-valeur">{t.valeur}</span>
                <span className="nm-ecran__tuile-detail">{t.detail}</span>
              </div>
            ))}
          </div>
          <div className="nm-ecran__carte">
            <div className="nm-ecran__carte-tete">
              <span>{graphique.titre}</span>
              <span className="nm-ecran__legende">
                <i className="nm-ecran__legende-barre" />
                {graphique.legende[0]}
                <i className="nm-ecran__legende-courbe" />
                {graphique.legende[1]}
              </span>
            </div>
            <Graphique barres={graphique.barres} courbe={graphique.courbe} />
          </div>
          <table className="nm-ecran__table">
            <thead>
              <tr>
                {colonnes.map((c) => (
                  <th key={c}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lignes.map((l, i) => (
                <tr key={i}>
                  {l.map((c, j) => (
                    <td key={j}>{j === 0 ? <span className="nm-ecran__decision">{c}</span> : c}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ── les jeux de données de la page ───────────────────────────────────
   Exemple : un groupe de quatre magasins sur deux îles. Les articles et
   les raisons sont ceux des rapports (bâches et groupes électrogènes de
   la saison cyclonique, articles du bouclier qualité-prix, dates courtes
   du frais importé). */

const MENU = ["Point du matin", "Conteneurs", "Avion", "Transferts", "Démarque", "Saison", "Sources"];

export const ECRAN_MATIN: EcranProps = {
  titre: "Point du matin",
  sousTitre: "Groupe · 4 magasins · 2 îles · jeudi 2 octobre, 7 h 00",
  menu: MENU,
  actif: 0,
  tuiles: [
    { libelle: "Prochain départ", valeur: "J-6", detail: "Le Havre → Fort-de-France" },
    { libelle: "Remplissage", valeur: "86 %", detail: "40 pieds · 3 fournisseurs" },
    { libelle: "Par avion", valeur: "12 réf.", detail: "rupture avant l'arrivée" },
    { libelle: "À transférer", valeur: "340 u.", detail: "d'une île à l'autre" },
  ],
  graphique: {
    titre: "Couverture du stock, en semaines",
    barres: [9, 8, 8, 7, 6, 6, 5, 4, 4, 3, 3, 2],
    courbe: [5, 5, 6, 6, 6, 7, 7, 7, 6, 6, 5, 5],
    legende: ["Stock", "Délai de mer"],
  },
  colonnes: ["Décision", "Article", "Magasin", "Raison", "Qté"],
  lignes: [
    ["Ajouter au conteneur", "Bâche 4 × 5 m", "Tous", "Rupture le 14/11", "+480"],
    ["Par avion", "Disjoncteur 20 A", "Magasin 2", "Bouclier qualité-prix", "60"],
    ["Transférer", "Ventilateur colonne", "Martinique → Guadeloupe", "22 semaines de stock", "140"],
  ],
};

export const ECRANS_MODULES: Record<string, EcranProps> = {
  bricolage: {
    titre: "Conteneurs",
    sousTitre: "Départ du 8 octobre · Le Havre → Fort-de-France · 40 pieds",
    menu: MENU,
    actif: 1,
    tuiles: [
      { libelle: "Remplissage", valeur: "86 %", detail: "cible 95 %" },
      { libelle: "Références", valeur: "214", detail: "3 fournisseurs" },
      { libelle: "Arrivée prévue", valeur: "3 nov.", detail: "mer + dédouanement" },
      { libelle: "Saison", valeur: "Vigilance", detail: "jusqu'au 30 novembre" },
    ],
    graphique: {
      titre: "Ventes et stock prévu, par semaine",
      barres: [12, 11, 10, 8, 7, 5, 4, 9, 12, 12, 11, 10],
      courbe: [8, 8, 9, 9, 10, 11, 11, 10, 9, 9, 8, 8],
      legende: ["Stock prévu", "Ventes"],
    },
    colonnes: ["Décision", "Article", "Fournisseur", "Raison", "Qté"],
    lignes: [
      ["Ajouter", "Contreplaqué 18 mm", "Fournisseur A", "Saison cyclonique", "+120"],
      ["Ajouter", "Groupe électrogène 3 kW", "Fournisseur B", "Rupture le 21/10", "+24"],
      ["Retirer", "Salon de jardin", "Fournisseur C", "31 semaines de stock", "−40"],
    ],
  },
  frais: {
    titre: "Frais",
    sousTitre: "Bateau du lundi · avion du mercredi · rayon crèmerie",
    menu: MENU,
    actif: 2,
    tuiles: [
      { libelle: "Par bateau", valeur: "118 réf.", detail: "traversée de 9 jours" },
      { libelle: "Par avion", valeur: "14 réf.", detail: "date limite trop courte" },
      { libelle: "Arrivage local", valeur: "6 prod.", detail: "annoncés cette semaine" },
      { libelle: "Dates courtes", valeur: "38 u.", detail: "à démarquer ce matin" },
    ],
    graphique: {
      titre: "Ventes du rayon et commande proposée",
      barres: [7, 8, 9, 8, 10, 12, 11, 8, 9, 9, 10, 12],
      courbe: [8, 8, 8, 9, 9, 10, 11, 10, 9, 9, 10, 11],
      legende: ["Commande", "Ventes"],
    },
    colonnes: ["Décision", "Article", "Transport", "Raison", "Qté"],
    lignes: [
      ["Commander", "Yaourt nature × 12", "Avion", "Date limite 21 jours", "96"],
      ["Réduire", "Tomate importée", "Bateau", "Arrivage local jeudi", "−30 %"],
      ["Démarquer", "Crème fraîche 20 cl", "Magasin 1", "Date courte, 3 jours", "38"],
    ],
  },
  specialise: {
    titre: "Temps forts",
    sousTitre: "Noël · conteneur du 12 septembre · répartition entre magasins",
    menu: MENU,
    actif: 3,
    tuiles: [
      { libelle: "Conteneur", valeur: "1 820 u.", detail: "arrivé au port" },
      { libelle: "Magasins", valeur: "4", detail: "sur 2 îles" },
      { libelle: "Retard navire", valeur: "+5 j", detail: "déjà compté" },
      { libelle: "Encombrant", valeur: "46 u.", detail: "livré du dépôt 2" },
    ],
    graphique: {
      titre: "Ventes attendues jusqu'à Noël, par semaine",
      barres: [3, 3, 4, 4, 5, 6, 7, 9, 11, 13, 12, 6],
      courbe: [4, 4, 4, 5, 5, 6, 7, 8, 10, 12, 12, 7],
      legende: ["Stock réparti", "Ventes attendues"],
    },
    colonnes: ["Décision", "Article", "Destination", "Raison", "Qté"],
    lignes: [
      ["Répartir", "Vélo enfant 16 pouces", "Magasin 3", "Ventes 2025 × 1,4", "36"],
      ["Garder au dépôt", "Canapé 3 places", "Dépôt 2", "Coût au volume", "12"],
      ["Transférer", "Trottinette", "Guadeloupe → Martinique", "Rupture le 18/12", "20"],
    ],
  },
};
