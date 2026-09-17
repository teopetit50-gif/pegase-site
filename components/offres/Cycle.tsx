/* ══════════════════════════════════════════════════════════════════════
   /offres — le cycle, refait sur la mécanique de /offres/sur-mesure
   16/09/2026, quatrième passe

   Teo, les deux captures côte à côte : « c'est toujours pas exactement
   comme sur la page sur mesure, regarde bien la diff, c'est pas la même
   chose ».

   Il a raison, et le rétrécissement n'était que la moitié du sujet. Les
   deux schémas décrivent la MÊME topologie — une entrée, quatre étapes
   qui tournent, une sortie, un retour en pointillés — mais ils n'étaient
   pas dessinés pareil :

     ce qu'il y avait ici          ce qu'il y a sur sur-mesure
     ───────────────────────────   ─────────────────────────────────────
     un SVG à viewBox              du balisage, mis à l'échelle par
                                   `Ajuste`
     cartes à ombre portée         cartes plates
     rayon 14                      rayon 12
     titres 22, corps 15           titres 15, corps 12
     traits #8a8a8a à 1,6          filets rgba(0,0,0,.22) à 1
     pointes pleines (triangles)   pointes fines (deux bords à 45°)
     quatre crochets de Bézier     UN anneau continu

   C'est le dernier point qui saute aux yeux : chez eux la boucle est un
   cercle que les cartes coupent, ici c'était quatre courbes séparées.

   Ce composant est donc le décalque de `components/surmesure/Cycle.tsx`,
   poste pour poste, avec notre contenu :

     Cadrage             → Réception*        (avant la boucle)
     Règles              → Qualification     (gauche de la boucle)
     Contrôles           → Règles            (haut de la boucle)
     Validation          → Rédaction         (droite de la boucle)
     Mesure              → Journal           (bas de la boucle)
     Mise en service     → Envoi*            (après la boucle)
     Retours des équipes → Vos corrections   (le retour en pointillés)

   La seule chose que la version sur-mesure n'a pas : nos deux cartes
   d'axe portent un sous-titre entre parenthèses. Il est posé dans le
   titre, en gris, comme dans le SVG qu'il remplace.

   Aucun état, aucun effet : rendu sur le serveur. C'est l'enveloppe
   `Ajuste` qui est cliente, et elle ne fait que mesurer.
   ══════════════════════════════════════════════════════════════════════ */

type Boite = { titre: string; sous?: string; texte?: string };

const ENTREE: Boite = { titre: "Réception*" };
const SORTIE: Boite = { titre: "Envoi*" };

const QUALIFICATION: Boite = {
  titre: "Qualification",
  sous: "(compréhension)",
  texte: "La demande est comprise et rattachée au bon dossier.",
};
const REGLES: Boite = {
  titre: "Règles",
  texte: "Ce que le système a le droit de faire, défini avec vous.",
};
const REDACTION: Boite = {
  titre: "Rédaction",
  sous: "(au cas par cas)",
  texte: "Le message est écrit depuis vos règles, pas d'un modèle figé.",
};
const JOURNAL: Boite = {
  titre: "Journal",
  texte: "Tout ce qui est parti, et qui l'a validé.",
};
const RETOUR: Boite = { titre: "Vos corrections" };

function Carte({ boite, compact = false }: { boite: Boite; compact?: boolean }) {
  return (
    <div className={compact ? "ofd-cy-carte ofd-cy-carte--plate" : "ofd-cy-carte"}>
      <p className="ofd-cy-titre">
        {boite.titre}
        {boite.sous && <span className="ofd-cy-sous"> {boite.sous}</span>}
      </p>
      {boite.texte && <p className="ofd-cy-texte">{boite.texte}</p>}
    </div>
  );
}

export default function Cycle() {
  return (
    <div className="ofd-cy">
      {/* ——— l'entrée ——— */}
      <div className="ofd-cy-entree">
        <Carte boite={ENTREE} compact />
        <span aria-hidden className="ofd-cy-fleche ofd-cy-fleche--droite" />
      </div>

      {/* ——— la boucle ——— */}
      <div className="ofd-cy-boucle">
        <span aria-hidden className="ofd-cy-anneau" />
        <div className="ofd-cy-case ofd-cy-case--haut">
          <Carte boite={REGLES} />
        </div>
        <div className="ofd-cy-case ofd-cy-case--gauche">
          <Carte boite={QUALIFICATION} />
        </div>
        <div className="ofd-cy-case ofd-cy-case--droite">
          <Carte boite={REDACTION} />
        </div>
        <div className="ofd-cy-case ofd-cy-case--bas">
          <Carte boite={JOURNAL} />
        </div>
        <span aria-hidden className="ofd-cy-axe" />
      </div>

      {/* ——— la sortie, et le retour en pointillés ———
          Les deux cartes sont calées sur les RANGÉES de la boucle :
          « Envoi » sur la rangée de Rédaction, « Vos corrections » sur
          celle du Journal. C'est ce qui aligne le retour en pointillés
          avec le bas du cycle. */}
      <div className="ofd-cy-sortie">
        <div className="ofd-cy-sortie-haut">
          <span aria-hidden className="ofd-cy-fleche ofd-cy-fleche--droite" />
          <Carte boite={SORTIE} compact />
        </div>
        <span aria-hidden className="ofd-cy-descente" />
        <div className="ofd-cy-sortie-bas">
          <span aria-hidden className="ofd-cy-retour" />
          <Carte boite={RETOUR} compact />
        </div>
      </div>
    </div>
  );
}
