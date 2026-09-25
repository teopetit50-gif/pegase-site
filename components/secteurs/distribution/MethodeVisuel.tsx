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
   la phrase est ce que Namolu lit, calcule ou propose ; le rond porte le
   code du magasin ; les lignes mono, le magasin, le rayon et l'échéance.
   Données d'exemple. Un jeu de cartes par onglet (Lire, Calculer,
   Proposer). */

type Carte = { phrase: string; code: string; g1: string; g2: string; d1: string; d2: string };

const JEUX: Carte[][] = [
  [
    { phrase: "« 214 références dans le conteneur du 8 octobre, trois fournisseurs. »", code: "AG", g1: "Achats groupe", g2: "ERP", d1: "40 pieds", d2: "J-6" },
    { phrase: "« 38 ventilateurs vendus hier, 22 semaines de stock au magasin 1. »", code: "M1", g1: "Magasin 1", g2: "Caisses", d1: "Rayon 12", d2: "7 h" },
    { phrase: "« Le navire du 8 octobre arrive le 3 novembre, dédouanement compris. »", code: "TR", g1: "Transitaire", g2: "Arrivée", d1: "26 j", d2: "Mer" },
    { phrase: "« Vigilance orange au sud de l'île. Bâches et contreplaqué en tête. »", code: "MF", g1: "Météo", g2: "Cyclones", d1: "Orange", d2: "Sud" },
  ],
  [
    { phrase: "« Bâche 4 × 5 m : rupture le 14 novembre si rien n'est ajouté. »", code: "M2", g1: "Magasin 2", g2: "3 semaines", d1: "−480", d2: "14/11" },
    { phrase: "« Le conteneur est rempli à 86 %. Il reste la place de 480 bâches. »", code: "40", g1: "Conteneur", g2: "Le Havre", d1: "86 %", d2: "J-6" },
    { phrase: "« 60 disjoncteurs arriveraient après la rupture : l'avion s'impose. »", code: "AV", g1: "Avion", g2: "Bouclier", d1: "60 u.", d2: "Lundi" },
    { phrase: "« Magasin 1 : 22 semaines de stock. Magasin 3 : trois. Écart à combler. »", code: "M3", g1: "Deux îles", g2: "Caboteur", d1: "140 u.", d2: "8/10" },
  ],
  [
    { phrase: "« Ajouter 480 bâches au conteneur du 8 octobre. »", code: "1", g1: "Décision 1/3", g2: "Achats", d1: "À valider", d2: "7 h" },
    { phrase: "« Faire venir 60 disjoncteurs par avion avant lundi. »", code: "2", g1: "Décision 2/3", g2: "Avion", d1: "À valider", d2: "7 h" },
    { phrase: "« Transférer 140 ventilateurs par le caboteur du 8 octobre. »", code: "3", g1: "Décision 3/3", g2: "Transfert", d1: "À valider", d2: "7 h" },
    { phrase: "« Trois décisions validées. Le journal garde la trace de chacune. »", code: "✓", g1: "Journal", g2: "Achats", d1: "Validé", d2: "7 h 12" },
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
