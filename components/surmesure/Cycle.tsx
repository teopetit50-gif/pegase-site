/* ══════════════════════════════════════════════════════════════════════
   /offres/sur-mesure — le cycle de vie d'un système (16/09/2026)

   Teo, capture contre capture : « cette section n'est pas la même que sur
   le modèle de base, refais exactement la même ».

   Ce que la référence pose là est un schéma en boucle, sur un panneau
   gris : une entrée à gauche, quatre étapes qui tournent (deux sur l'axe,
   une au-dessus, une en dessous), une sortie à droite, et un retour en
   pointillés qui rentre dans la boucle par le bas. Les boîtes sont
   blanches, à coins arrondis, avec un titre et une légende grise ; les
   flèches sont des traits fins, droites sur l'axe et courbes autour de la
   boucle.

   C'est une IMAGE chez eux, et elle décrit LEUR métier (pré-entraînement,
   SFT, RLHF, red teaming, déploiement). On ne recopie pas l'actif
   d'autrui et on ne parle pas de leur sujet : la géométrie est reprise
   au nœud près, le contenu est le nôtre — ce qui se passe quand un
   système sur mesure est en service.

   La correspondance, poste pour poste :
     Pre-Training        → Cadrage            (avant la boucle)
     SFT                 → Règles             (gauche de la boucle)
     Red Teaming         → Contrôles          (haut de la boucle)
     RLHF                → Validation         (droite de la boucle)
     Model Evaluation    → Mesure             (bas de la boucle)
     Deployment          → Mise en service    (après la boucle)
     User reported issues→ Retours des équipes (le retour en pointillés)

   RLHF tombe sur « Validation » et ce n'est pas un hasard : leur étape
   est littéralement l'apprentissage par retour HUMAIN. C'est le même
   endroit du schéma et la même idée.

   ── POURQUOI CE N'EST PAS UN SVG ─────────────────────────────────────
   Le panneau fait 1392 px de large sur ordinateur et 342 sur téléphone.
   Un SVG à viewBox y descendrait le texte à 3 px. Les BOÎTES sont donc du
   balisage qui se recompose, et les LIAISONS sont des filets CSS : traits
   droits pour l'axe, cadre à coins arrondis pour la boucle. Sous 1024 le
   schéma s'empile et les liaisons deviennent verticales — c'est le seul
   endroit où on s'écarte de la référence, qui ne prévoit rien pour le
   téléphone parce que son schéma est une image.

   Aucun état, aucun effet : rendu sur le serveur.
   ══════════════════════════════════════════════════════════════════════ */

type Boite = { titre: string; texte?: string };

const ENTREE: Boite = { titre: "Cadrage" };
const SORTIE: Boite = { titre: "Mise en service" };

const REGLES: Boite = {
  titre: "Règles",
  texte: "Les règles de gestion sont écrites avec vos équipes, puis ajustées.",
};
const CONTROLES: Boite = {
  titre: "Contrôles",
  texte: "Vérifications de cohérence et alertes sur seuils, avant toute écriture.",
};
const VALIDATION: Boite = {
  titre: "Validation",
  texte: "Ce qui doit être approuvé attend votre décision avant de partir.",
};
const MESURE: Boite = {
  titre: "Mesure",
  texte: "L'effet est mesuré sur le périmètre en service, pour décider de l'élargir.",
};
const RETOURS: Boite = { titre: "Retours de vos équipes" };

function Carte({ boite, compact = false }: { boite: Boite; compact?: boolean }) {
  return (
    <div className={compact ? "smd-cy-carte smd-cy-carte--plate" : "smd-cy-carte"}>
      <p className="smd-cy-titre">{boite.titre}</p>
      {boite.texte && <p className="smd-cy-texte">{boite.texte}</p>}
    </div>
  );
}

export default function Cycle() {
  return (
    <div className="smd-cy">
      {/* ——— l'entrée ——— */}
      <div className="smd-cy-entree">
        <Carte boite={ENTREE} compact />
        <span aria-hidden className="smd-cy-fleche smd-cy-fleche--droite" />
      </div>

      {/* ——— la boucle ——— */}
      <div className="smd-cy-boucle">
        <span aria-hidden className="smd-cy-anneau" />
        <div className="smd-cy-case smd-cy-case--haut">
          <Carte boite={CONTROLES} />
        </div>
        <div className="smd-cy-case smd-cy-case--gauche">
          <Carte boite={REGLES} />
        </div>
        <div className="smd-cy-case smd-cy-case--droite">
          <Carte boite={VALIDATION} />
        </div>
        <div className="smd-cy-case smd-cy-case--bas">
          <Carte boite={MESURE} />
        </div>
        <span aria-hidden className="smd-cy-axe" />
      </div>

      {/* ——— la sortie, et le retour en pointillés ———
          Les deux cartes sont calées sur les RANGÉES de la boucle : « Mise
          en service » sur la rangée de Validation, « Retours » sur celle de
          Mesure. C'est ce qui aligne le retour en pointillés avec le bas du
          cycle, comme sur la référence. */}
      <div className="smd-cy-sortie">
        <div className="smd-cy-sortie-haut">
          <span aria-hidden className="smd-cy-fleche smd-cy-fleche--droite" />
          <Carte boite={SORTIE} compact />
        </div>
        <span aria-hidden className="smd-cy-descente" />
        <div className="smd-cy-sortie-bas">
          <span aria-hidden className="smd-cy-retour" />
          <Carte boite={RETOURS} compact />
        </div>
      </div>
    </div>
  );
}
