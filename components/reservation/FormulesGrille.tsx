import { BoutonReservation } from "./ModeleUrl";
import { Check } from "lucide-react";
import Partage from "@/components/Partage";
import { ICONES_FORMAT, ICONE_DEFAUT } from "./icones";
import {
  PROFILS,
  type Formule,
  type Point,
} from "@/lib/reservation";
import "./FormulesGrille.css";

/* ══════════════════════════════════════════════════════════════════════
   <FormulesGrille> — le haut de /reserver-un-audit : titre, trois formats
   en cartes, financement, note de bas de section. (15/09/2026)

   ORIGINE. `pricing-module` (21st.dev), apporté par Teo : un en-tête
   CENTRÉ (titre + chapô), puis une rangée de cartes qui portent chacune
   un pictogramme, un nom, une description, le grand chiffre, un bouton
   pleine largeur, et deux listes à puces cochées sous des intitulés
   (« Overview », « Highlights »). La carte recommandée se détache par une
   pastille flottante posée à cheval sur son bord haut.

   CE QUI EST REPRIS : la composition centrée, le pictogramme en tête de
   carte, la pastille flottante, le bouton pleine largeur, les points
   cochés plutôt que pointés, le relief au survol.

   CE QUI EST JETÉ, et pourquoi —

   · L'INTERRUPTEUR mensuel/annuel. Il n'y a rien à basculer : un audit
     n'a pas de période de facturation, et les deux formats gratuits le
     resteraient dans les deux positions. Un interrupteur qui ne change
     rien se lit comme une panne. (Ne pas le confondre avec le sélecteur
     Indépendant/Équipes, retiré le 28/08 pour une autre raison : cette
     page ne parle plus qu'aux organisations.)

   · LES PRIX. Le grand chiffre de la source est un montant ; ici c'est
     une DURÉE, comme depuis le 26/07 — les formules d'audit restent sans
     prix (lib/reservation.ts). Aucun « $ » n'a de place ici.

   · LES CROIX. La source barre les lignes non comprises. Nos trois listes
     sont cumulatives (« Tout le Cadrage, plus : ») : il n'y a aucune ligne
     absente à barrer, donc aucune croix. Le comparatif, plus bas, est
     l'endroit où se lit ce qu'un format n'a pas.

   · LA MISE À L'ÉCHELLE de la carte phare (`scale-[1.03]`). Deux raisons :
     elle casse l'alignement en sous-grille des trois cartes, et
     `transform` appartient au reveal GSAP de la page, qui l'écrit en style
     EN LIGNE sur [data-arrivee] — la règle CSS perdrait de toute façon.
     Le relief se fait donc au filet doré et à l'ombre.

   CE QUI EST CONSERVÉ DE LA VERSION D'AVANT : tous les textes au mot
   près, la teinte or de la carte phare (.r-carte--phare de globals.css),
   le surlignage du premier point, la promesse fantôme (Teo, 02/08 : « la
   phrase disparaît, l'espace reste »), la pastille « Sur mesure » qui
   VOYAGE depuis /commencer (Partage), et les rôles d'arrivée
   (data-arrivee) qui cadencent la cascade du premier écran.

   La colonne de gauche de l'ancienne grille (« Gratuit, sans engagement »
   + Chèque TIC) n'a pas d'équivalent dans une composition centrée : ses
   deux blocs descendent sous les cartes, en bandeau, sans perdre un mot.
   ══════════════════════════════════════════════════════════════════════ */

/* Le libellé d'un point comporte une portion en gras (`fort`) — la
   référence met en gras le mot qui porte la différence, jamais la phrase
   entière. On coupe autour de la première occurrence. */
function Libelle({ point }: { point: Point }) {
  if (!point.fort || !point.texte.includes(point.fort)) return <>{point.texte}</>;
  const [avant, ...reste] = point.texte.split(point.fort);
  return (
    <>
      {avant}
      <span className="fg-fort">{point.fort}</span>
      {reste.join(point.fort)}
    </>
  );
}

function Carte({ f }: { f: Formule }) {
  /* trait fin (1,4) : la graisse des pictogrammes dessinés à la main
     du reste du site */
  const Icone = ICONES_FORMAT[f.id] ?? ICONE_DEFAUT;

  return (
    <article
      data-arrivee="colonne"
      className={`r-carte r-carte--alignee fg-carte ${f.phare ? "r-carte--phare fg-carte--phare" : ""}`}
    >
      {/* la pastille est posée en absolu SUR le bord haut de la carte
          (.fg-carte est en `position: relative`) : la carte n'a pas
          d'`overflow: hidden`, elle peut donc déborder vers le haut */}
      <div className="r-carte-tete fg-tete">
        {f.badge ? <span className="r-badge fg-pastille">{f.badge}</span> : null}

        <span aria-hidden className="fg-icone">
          <Icone strokeWidth={1.4} />
        </span>

        <h3 className="fg-nom">{f.nom}</h3>

        <div className="fg-chiffre">
          <span className="num fg-duree">{f.duree}</span>
          <span className="fg-suffixe">{f.suffixe}</span>
        </div>
        <div className="fg-conditions">{f.conditions}</div>

        {/* promesseFantome : le texte occupe sa place — même hauteur de
            tête, même repli de lignes — mais reste invisible */}
        {f.promesse ? (
          <p
            aria-hidden={f.promesseFantome || undefined}
            className={`fg-promesse ${f.promesseFantome ? "fg-promesse--fantome" : ""}`}
          >
            {f.promesse}
          </p>
        ) : null}
      </div>

      <div className="fg-action">
        {/* 15/09 — <BoutonReservation> et pas <Link> : il emporte le
            modèle de site choisi sur /modeles, lu dans l'URL au montage.
            C'est ce qui permet à cette page de rester statique. */}
        <BoutonReservation
          formule={f.id}
          className={`r-btn w-full ${f.phare ? "r-btn--noir" : "r-btn--fil"}`}
        >
          {f.cta}
        </BoutonReservation>
        <p className="r-note fg-souscta">{f.souscta}</p>
      </div>

      <div className="fg-liste">
        <p className="fg-entete">{f.enteteListe}</p>
        <ul className="fg-points">
          {f.points.map((p) => (
            <li key={p.texte} className={`fg-point ${p.surligne ? "fg-point--fort" : ""}`}>
              <Check aria-hidden className="fg-check" strokeWidth={2} />
              <span>
                <Libelle point={p} />
              </span>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}

export default function FormulesGrille() {
  /* 28/08 — le sélecteur Indépendant/Équipes a disparu : cette page ne
     parle plus qu'aux organisations. PROFILS[1] est donc le seul profil
     affiché, et le tableau reste à deux entrées pour /tarifs. */
  const p = PROFILS[1];

  return (
    <section data-monde="clair" className="r-wrap fg pb-10 pt-12 sm:pb-14 sm:pt-14">
      <div className="fg-entete-section">
        {/* 01/09 — transitions : la pastille « Sur mesure » ARRIVE de la
            carte « Organisations & équipes » de /commencer (objet
            partagé), titre puis chapô puis colonnes entrent en cascade. */}
        <Partage
          nom="kicker-audit"
          share="voyage-audit"
          className="cm-kicker cm-kicker--violet cm-kicker--page"
        >
          Sur mesure
        </Partage>
        <h1 data-arrivee="titre" className="r-h1 fg-titre">
          Un audit à la mesure de votre organisation
        </h1>
        <p data-arrivee="chapo" className="r-lead fg-chapo">
          Plusieurs services, plusieurs validateurs&nbsp;: nous mesurons d&apos;abord, et le devis est établi à partir de vos volumes. Trois formats, du cadrage de 45 minutes à la journée dans vos locaux.
        </p>
      </div>

      <div className="fg-grille">
        {p.formules.map((f) => (
          <Carte key={f.id} f={f} />
        ))}
      </div>

      {/* les deux faits qui décident réellement — c'est gratuit, et c'est
          financé. Ils tenaient la colonne de gauche de l'ancienne grille,
          où la référence loge sa preuve sociale (que nous n'avons pas). */}
      <div data-arrivee="colonne" className="fg-socle">
        <p className="fg-socle-fort">
          Gratuit, sans engagement.
          <br />
          Toute installation commence par cet audit.
        </p>
        <div className="fg-socle-aide">
          <div className="fg-socle-titre">Chèque TIC</div>
          <p className="fg-socle-texte">
            Jusqu&apos;à 10 000 € d&apos;une installation financés par la Région Guadeloupe
            pour les entreprises éligibles. Votre éligibilité est vérifiée pendant
            l&apos;audit, avant tout engagement.
          </p>
        </div>
      </div>

      <p data-arrivee="colonne" className="r-note fg-note">
        *Créneaux du lundi au vendredi, 9 h – 17 h (heure Guadeloupe). Les durées
        annoncées sont tenues : l&apos;entretien se termine à l&apos;heure. Le format dans
        vos locaux est facturé sur devis et déduit de l&apos;installation si vous décidez
        d&apos;aller plus loin.
      </p>
    </section>
  );
}
