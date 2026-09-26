"use client";

import { useEffect, useState } from "react";

/* ══ le carré de la méthode : un carrousel de cartes de verre ═════════
   Chez eux (residency/virtual-patients.webm, décomposée image par image
   le 24/09) : des cartes de VERRE dépoli en portrait, en perspective
   comme un coverflow. Celle de face est nette ; deux autres attendent de
   biais, à gauche et à droite, plus petites, floues et plus sombres.
   Toutes les 3,6 s environ, la carte de face pivote et part en arrière à
   gauche pendant que celle de droite vient de face. Sur chaque carte :
   une grande phrase entre guillemets (blanc, sans-serif), un rond en bas
   à gauche (leur portrait), deux lignes mono en bas à gauche (nom, rôle),
   deux à droite (âge, sexe).
   Ici, même carte et même mouvement ; pas de personne (règles maison) :
   la phrase est ce que Varelo lit, calcule ou propose ; le rond porte le
   code du pôle ; les lignes mono, le pôle, la source et l'échéance.
   Données d'exemple. Un jeu de cartes par onglet (Lire, Calculer,
   Proposer). */

type Carte = { phrase: string; code: string; g1: string; g2: string; d1: string; d2: string };

const JEUX: Carte[][] = [
  [
    { phrase: "« 38 sociétés, 4 ERP et 212 tableurs partagés, lus chaque nuit. »", code: "GR", g1: "Groupe", g2: "Inventaire", d1: "38", d2: "7 h" },
    { phrase: "« Galerie 2 : 64 baux, dont 9 loyers à réviser cette année. »", code: "IM", g1: "Immobilier", g2: "Baux", d1: "64", d2: "2026" },
    { phrase: "« Plateforme froid : deux attestations de camion expirent en novembre. »", code: "LG", g1: "Logistique", g2: "Flotte", d1: "2", d2: "Nov." },
    { phrase: "« Le même client porte trois noms dans trois sociétés. »", code: "RF", g1: "Référentiel", g2: "Clients", d1: "3 noms", d2: "1 fiche" },
  ],
  [
    { phrase: "« Contrat de maintenance : dénonciation possible jusqu'au 30 septembre. »", code: "CT", g1: "Juridique", g2: "Contrats", d1: "J-5", d2: "30/09" },
    { phrase: "« Livraison du 23 : avarie constatée, réserve à envoyer avant le 26. »", code: "RS", g1: "Réception", g2: "Transport", d1: "3 j", d2: "26/09" },
    { phrase: "« 42 factures rapprochées de leurs livraisons : trois écarts à voir. »", code: "FR", g1: "Fournisseurs", g2: "Livraisons", d1: "3 écarts", d2: "7 h" },
    { phrase: "« Sinistre de la plateforme 2 : l'expert n'a pas répondu depuis 18 jours. »", code: "SN", g1: "Sinistres", g2: "Assureur", d1: "18 j", d2: "Relance" },
  ],
  [
    { phrase: "« Dénoncer le contrat de maintenance avant le 30 septembre. »", code: "1", g1: "Décision 1/3", g2: "Juridique", d1: "À valider", d2: "7 h" },
    { phrase: "« Envoyer la réserve au transporteur avant le 26. »", code: "2", g1: "Décision 2/3", g2: "Opérations", d1: "À valider", d2: "7 h" },
    { phrase: "« Relancer l'expert du sinistre de la plateforme 2. »", code: "3", g1: "Décision 3/3", g2: "Finance", d1: "À valider", d2: "7 h" },
    { phrase: "« Trois décisions validées. Le journal garde la trace de chacune. »", code: "✓", g1: "Journal", g2: "Directions", d1: "Validé", d2: "7 h 12" },
  ],
];

/* position relative à la carte de face : −1 à gauche, 0 de face, 1 à
   droite, 2 cachée derrière (elle revient par la droite) */
const POSE: Record<number, React.CSSProperties> = {
  [-1]: { transform: "translate3d(-58%, 0, -260px) rotateY(38deg)", filter: "blur(5px) brightness(0.55)", opacity: 0.9, zIndex: 1 },
  0: { transform: "translate3d(0, 0, 0) rotateY(0deg)", filter: "blur(0px) brightness(1)", opacity: 1, zIndex: 3 },
  1: { transform: "translate3d(58%, 0, -260px) rotateY(-38deg)", filter: "blur(5px) brightness(0.55)", opacity: 0.9, zIndex: 2 },
  2: { transform: "translate3d(0, 0, -520px) rotateY(0deg)", filter: "blur(8px) brightness(0.4)", opacity: 0, zIndex: 0 },
};

function CarteVerre({ c, pose }: { c: Carte; pose: number }) {
  return (
    <div className="nm-verre" style={POSE[pose]}>
      <p className="nm-verre__phrase">{c.phrase}</p>
      <div className="nm-verre__pied">
        <span className="nm-verre__rond">{c.code}</span>
        <div className="nm-verre__lignes">
          <span>
            {c.g1}
            <br />
            {c.g2}
          </span>
          <span className="text-right">
            {c.d1}
            <br />
            {c.d2}
          </span>
        </div>
      </div>
    </div>
  );
}

export function VisuelVerre({ jeu }: { jeu: number }) {
  const cartes = JEUX[jeu];
  const [face, setFace] = useState(0);
  /* le composant est remonté à chaque onglet (key) : il repart de la
     première carte sans remise à zéro ici */
  useEffect(() => {
    const id = window.setInterval(() => setFace((f) => (f + 1) % cartes.length), 3600);
    return () => window.clearInterval(id);
  }, [cartes.length]);
  const n = cartes.length;
  return (
    <div className="nm-coverflow" aria-hidden>
      {cartes.map((c, i) => {
        let pose = (i - face + n) % n; // 0 face, 1 droite, 2 derrière, 3 = gauche
        if (pose === n - 1) pose = -1;
        return <CarteVerre key={i} c={c} pose={pose} />;
      })}
    </div>
  );
}
