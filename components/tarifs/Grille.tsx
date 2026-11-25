"use client";

/* ══════════════════════════════════════════════════════════════════════
   /tarifs v4 — la grille : trois paliers, choix des postes DANS la carte
   (28/08/2026)

   Chaque carte est autonome : « Un poste » se choisit comme une radio,
   « Trois postes » coche jusqu'à trois cases, « Tout Omega » n'a rien à
   choisir. Le bouton reste éteint tant que le compte n'y est pas — il
   affiche ce qui manque plutôt qu'un « continuer » grisé muet.

   Le CTA n'ouvre PAS WhatsApp et ne demande aucun paiement : il emmène
   vers /installation, la page de réservation de la réunion d'installation,
   avec les postes choisis dans l'URL. Le client enregistre carte ou mandat
   SEPA sur l'écran « Créneau réservé » de /installation (Stripe, rien de
   débité), et le premier prélèvement part quand l'agence finalise
   l'installation.

   02/09 — MENSUEL | ANNUEL (Teo : « un bouton en haut des cards pour
   switch, un pourcentage en moins pour l'annuel, met en évidence le prix
   économisé »). L'état est UN pour la grille — pas un par carte : on ne
   compare pas un palier mensuel à un palier annuel. En annuel, chaque
   carte montre le mensuel barré, le mensuel équivalent en grand, « facturé
   N € par an » et la ligne verte « Vous économisez … ». Le CTA porte
   `&periodicite=annuel` : /installation le lit et le récap le reprend,
   modifiable jusqu'au bout. Les montants sont DÉRIVÉS de lib/paliers.ts
   (prixAnnuel & co), jamais écrits ici.

   03/09 (relecture) — la périodicité fait aussi le chemin RETOUR :
   « Modifier mes postes » sur /installation renvoie `?periodicite=annuel`
   et la grille le relit dans l'URL. Lecture par useSyncExternalStore
   plutôt que useSearchParams : la page /tarifs reste STATIQUE (prix dans
   le HTML servi, pas de bascule client jusqu'au Suspense) et il n'y a ni
   effet qui pose un état, ni divergence d'hydratation — React rend
   d'abord l'instantané serveur (mensuel), puis celui du navigateur.

   ═══ 14/09/2026, SECONDE PASSE DU JOUR — LE MODÈLE « PRICING-MODULE »
   (Teo, composant de référence fourni : module de prix shadcn à cartes
   cernées, interrupteur de facturation annuelle, listes à coches). Le
   design change, la mécanique de vente non (sélection exclusive, URL,
   périodicité, prix animés).

   Ce que la référence impose, et qui est repris :
     · l'en-tête repasse AU CENTRE — pastille, titre, chapô — après une
       matinée où il vivait à gauche (modèle « pricing-section-3 ») ;
     · le sélecteur segmenté Mensuel | Annuel devient UN INTERRUPTEUR
       (components/ui/switch) suivi de son libellé « Facturation
       annuelle » et de la pastille de remise : c'est le geste de la
       référence, et un choix binaire n'a pas besoin de deux boutons ;
     · les trois cartes sont UNIFORMES — filet, coins 12, ombre au survol,
       tête centrée avec une icône de 32 px, le nom, la promesse ; plus de
       cadre gris commun, plus de carte noire ;
     · la carte phare se détache comme sur la référence : filet d'encre,
       halo d'un pixel, ombre posée et pastille pleine ;
     · les pastilles « Recommandé » / « Le plus complet » passent EN HAUT
       DE CARTE, à cheval sur le filet (`-top-3`), là où la référence pose
       la sienne ;
     · le bloc de prix est centré, gros chiffre puis « par mois » ;
     · les listes reprennent le couple Aperçu / Points forts de la
       référence : les postes d'abord, les points du palier ensuite, tous
       à coches.

   Écarts assumés :
     1. LE BOUTON EST EN PIED DE CARTE, pas au-dessus des listes comme
        chez la référence. Ici le bouton dépend d'un choix qui se fait
        DANS la carte : le placer avant la liste des postes mettrait la
        commande au-dessus de ce qui l'active. En pied, il aligne aussi
        les trois CTA sur une même ligne (`mt-auto`), ce que la grille de
        la référence ne garantit pas.
     2. UN POSTE QUE LE QUOTA INTERDIT prend la croix de la référence
        (`X`, gris) mais PAS son texte barré : barré, il se lirait « exclu
        du palier » alors qu'il s'agit d'un état passager — il suffit de
        décocher un autre poste.
     3. LE `scale-[1.03]` DE LA RÉFÉRENCE N'EST PAS REPRIS. Trois cartes
        claires alignées : 3 % d'échelle ne se lit pas comme une mise en
        avant, il se lit comme un défaut d'alignement — le prix, le début
        des listes et le bouton de la carte du milieu tombent 7 à 20 px
        plus bas que ceux de ses voisines. C'est déjà ce qui avait fait
        retirer le `scale-105` du 09/09. Le filet d'encre, le halo,
        l'ombre et la pastille à l'étoile suffisent. En échange, les trois
        cartes partagent leurs rangées (`grid-rows-subgrid` dès lg) : tête,
        prix, listes et bouton tombent exactement sur les mêmes lignes,
        ce que la grille de la référence ne fait pas.
     4. Les jetons shadcn de la référence (`bg-background`, `text-primary`,
        `border-muted`, `text-muted-foreground`) ne peignent rien sur ce
        site : les couleurs de `.resa` sont écrites en clair (#050505,
        #3d3d3d, #616161, filet #e3e3e3).
     5. Le prix garde NumberFlow : les chiffres roulent à la bascule
        mensuel / annuel. La référence se contente d'une transition d'un
        tiers de seconde ; l'animation existait déjà ici et c'est elle qui
        rend la remise lisible.
     6. L'icône de tête est une icône lucide neutre par palier (Zap,
        Layers, Boxes), pas un logo de moteur : Teo a écarté les logos des
        postes le 09/09 (« c'est censé être simple »).

   Ce qui part avec cette passe : le cadre au dégradé gris, la carte
   noire, le sélecteur segmenté (`SelecteurPeriodicite`), le titre en
   rideau (`VerticalCutReveal`) et la cascade floutée (`TimelineContent`)
   — un en-tête centré n'a pas de rideau mot à mot, et les entrées
   repassent au `data-reveal` du site. Les deux composants restent au
   dépôt, d'autres pages s'en servent.
   ═══ 15/09/2026 — UNE QUATRIÈME CARTE : SUR MESURE (Teo)
   La grille affichait trois paliers chiffrés, et le sur-mesure n'existait
   qu'en cinquième ligne de chaque carte (07/09). Il devient une carte à
   part entière, en quatrième colonne, avec « Sur devis » là où les autres
   portent un montant — la règle de la v3 qui interdit d'afficher un prix
   quand plusieurs services se partagent la validation (PORTES) reprend sa
   place, visible, au lieu d'être reléguée au bandeau du dessous.

   Trois conséquences, toutes assumées :
     a. LA LIGNE SUR-MESURE SORT DES TROIS CARTES. Elle disait la même
        chose que la nouvelle carte, en plus petit et quatre fois ; les
        cartes étaient déjà jugées denses, et une colonne entière porte
        désormais le message. `SUR_MESURE` continue de servir /offres et
        la page Mon compte ; seule la ligne dans la grille part.
     b. LE PALIER N'ENTRE PAS DANS `PALIERS` (voir lib/paliers.ts) : cette
        liste est le barème, et le comparatif, `prixPour` et la fonction
        SQL en dépendent. La carte est rendue à part, ici.
     c. LA GRILLE PASSE À QUATRE COLONNES, mais seulement à partir de
        1280 px — à 1024 px quatre colonnes tombaient à 208 px de large.
        Entre les deux, deux colonnes de deux : la sous-grille qui aligne
        têtes, prix, listes et boutons s'applique alors sur DEUX bandes de
        quatre rangées (d'où le gabarit de huit rangées à `md`).
   Le comparatif du bas reste à trois colonnes : le sur-mesure répondrait
   « ça dépend » sur chacune de ses quinze lignes.

   ═══ 15/09/2026, SECONDE PASSE — LES DEUX MONDES (Teo : « un autre bouton
   pour changer le truc, soit on est PME soit grosse structure, ce qui
   changerait du coup les prix »). Un sélecteur segmenté Indépendant & PME |
   Grande structure est posé À CÔTÉ de l'interrupteur de facturation, et il
   bascule toute la page entre les deux portes de `PORTES` (voir le bloc
   MONDES / GRANDE_STRUCTURE de lib/paliers.ts pour l'arbitrage).

   Ce qui bascule, ici :
     · le titre, la pastille et le chapô ;
     · le prix des quatre cartes → « Sur devis », et la rangée « Compris
       dans le palier » → les points du devis (aucune promesse de la
       grille PME n'est reprise sans avoir été posée pour ce monde) ;
     · le bouton → « Réserver un diagnostic », toujours actif : le choix
       des postes reste offert mais ne conditionne plus rien, puisqu'il
       n'y a plus de commande à passer ;
     · la note de bas de grille, et le bandeau d'orientation.
   Ce qui DISPARAÎT côté grande structure : l'interrupteur mensuel /
   annuel, « Le quatrième poste pour N € de plus », et le comparatif du
   bas — quinze lignes de prix, de réunion de 45 minutes et de satisfait
   ou remboursé qui n'ont pas été promis de ce côté-là.
   La périodicité, elle, n'est pas remise à zéro : on revient côté PME
   avec la formule qu'on y avait laissée.

   Ce qui reste : « Le quatrième poste pour N € de plus » sur Tout Omega,
   tous les textes de Teo, l'ancre #grille et le scroll-mt, la sélection
   exclusive entre paliers, et les sections 2 et 3 (bandeau d'orientation,
   comparatif) telles quelles.
   → 15/09, TROISIÈME PASSE : l'état du monde SORT de ce fichier pour
   components/tarifs/monde.tsx. Il ne commandait que la grille, alors que le
   Chèque TIC et l'appel final, plus bas sur le même écran, continuaient de
   dire « Réserver un audit ». Ici, rien d'autre ne change : même lecture par
   useSyncExternalStore, même instantané serveur « pme », même page statique.
   ═══ 15/09/2026, PASSE DE REGISTRE — LE VOCABULAIRE D'UNE PAGE DE PRIX
   (Teo : « les phrases de la page tarif sont trop amateur ; il faut du
   plus pro, genre Qonto, des vrais SaaS, des termes précis »). Aucun fait
   nouveau, aucune promesse de plus, aucun montant touché : seul le
   registre change, sur toute la page.

   Ce que la passe applique, et qu'il ne faut pas défaire :
     · LE VOCABULAIRE DE LA FACTURATION remplace celui du récit —
       tarification à l'usage, volumétrie, pièce traitée, échéance,
       périmètre, plafond, résiliation, réversibilité, mise en service.
       « Satisfait ou remboursé » devient « garantie de remboursement
       sous 30 jours », « le point du matin » garde son nom mais s'annonce
       comme « rapport quotidien » dans un libellé de tableau.
     · LES CHUTES APHORISTIQUES SAUTENT. « Ce qui est à vous reste à
       vous », « nous avons intérêt à relancer juste, pas à relancer
       fort », « un prix affiché ne veut plus rien dire » disaient un ton,
       pas un mécanisme (doctrine §12, règles 5 et 6).
     · LES VERBES D'ACTION REMPLACENT LES VERBES DE CHOIX dans les
       commandes : « Sélectionnez un poste », « Renseignez vos volumes ».
     · « ça », « on » et les fragments nominaux sortent de la prose rendue
       (ils restent dans ces commentaires, qui ne s'affichent pas).
   La charte est la partie III de OMEGA/DOCTRINE-TEXTES-SAAS.md.
   ═══════════════════════════════════════════════════════════════════════ */

/* ═══ 25/11/2026 — LA CHARTE DE L'ACCUEIL (docs/charte-accueil.md, § 4.2,
   ligne 5). Le dessin change, la mécanique non : sélection exclusive entre
   paliers, quotas, URL de l'audit, bascule des deux mondes, textes.
     · le héros centré (HeroSection) devient l'en-tête de page de l'accueil
       (EnTeteSection niveau 1, disposition « côte ») : pastille « Tarifs »,
       titre en deux tons, chapô à droite, bouton blanc ;
     · les trois prix publics et les quatre cartes d'agents deviennent des
       colonnes jointives séparées par des filets, sur le modèle de la
       grille de prix de l'accueil (nom en 22 / 450, description grise,
       pied à filet) — plus de cartes blanches espacées ni d'ombres ;
     · les pastilles de palier passent dans la rangée du nom (la sombre
       pour la carte phare), les icônes de tête partent ;
     · tous les boutons sont les `ch-btn` blancs du kit ; le sélecteur
       PME | Groupes prend la piste #eeeee8 de l'accueil, l'état actif en
       blanc. Le dessin vit dans components/charte/pages/tarifs.css. ═══ */

import Link from "next/link";
import { useState } from "react";
import { Check, Plus, Star, X } from "lucide-react";
import Section from "@/components/charte/Section";
import EnTeteSection from "@/components/charte/EnTeteSection";
import Bouton from "@/components/charte/Bouton";
import Pastille from "@/components/charte/Pastille";
import { cn } from "@/lib/cn";
import { lienAudit, lienContact } from "@/lib/reservation";
import { useChoisirMonde, useMonde } from "@/components/tarifs/monde";
import TroisPrix from "@/components/tarifs/TroisPrix";

import {
  CARTE_SUR_MESURE,
  GRANDE_STRUCTURE,
  MONDES,
  PALIERS,
  POSTES,
  type Monde,
  type Palier,
  cleUrlDuPoste,
} from "@/lib/paliers";

/* le prix en euros, sans centimes — le format que NumberFlow anime */

/* 25/11/2026 — les cartes se nomment par agents, plus par postes : « Tout
   Omega » se lisait comme un forfait unique, alors que chaque agent a son
   prix. Les noms de PALIERS restent ceux de /reserver et /installation. */
const NOM_AFFICHE: Record<Palier["id"], string> = {
  un: "Un agent",
  trois: "Trois agents",
  complet: "Les quatre agents",
};

/* 15/09, dernière passe — LA PÉRIODICITÉ NE PILOTE PLUS RIEN ICI. Elle
   ne servait qu'à remiser un montant affiché ; sans montant, sa lecture
   d'URL et son instantané serveur étaient du code qui ne produisait plus
   de pixel. Le paramètre `?periodicite=` continue d'exister pour
   /installation, qui le lit lui-même. */

/* 08/09 — l'argument de Tout Omega : ce que coûte le quatrième poste par
   rapport à Trois postes. CALCULÉ depuis PALIERS, jamais écrit en dur ;
   en annuel on compare les équivalents mensuels, pour que la phrase reste
   vraie sous les chiffres affichés. */
/* 15/09 — `ecartQuatriemePoste` a disparu : avec un prix continu, l'écart
   entre trois postes et quatre dépend des volumes. Calcul dans CartePalier. */

/* ——— le marqueur de ligne, le `Check` / `X` de la référence ———
   Quatre états : coché (encre), à cocher (cercle vide), interdit par le
   quota (croix grise, voir l'écart 2), et le « + » de la ligne sur-mesure.
   `peer-focus-visible` : le vrai <input> est en sr-only juste avant lui,
   le focus clavier se voit ici. */
function Marqueur({ etat }: { etat: "coche" | "vide" | "non" | "plus" }) {
  const commun =
    "mr-2.5 mt-px grid size-[18px] flex-none place-content-center rounded-full transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#202322]";
  if (etat === "coche")
    return (
      <span aria-hidden className={cn(commun, "bg-[#202322] text-white")}>
        <Check className="size-3" strokeWidth={3} />
      </span>
    );
  if (etat === "non")
    return (
      <span aria-hidden className={cn(commun, "text-[#a3a69e]")}>
        <X className="size-3.5" strokeWidth={2.5} />
      </span>
    );
  if (etat === "plus")
    return (
      <span aria-hidden className={cn(commun, "border border-[#202322] text-[#202322]")}>
        <Plus className="size-3" strokeWidth={2.5} />
      </span>
    );
  return <span aria-hidden className={cn(commun, "border border-[#c4c4bf] bg-white")} />;
}

/* ——— la quatrième carte : sur mesure (15/09/2026, voir l'en-tête) ———
   Même gabarit que les trois autres — mêmes rangées de sous-grille, même
   pied — pour qu'elle se lise comme un palier et non comme un encart. Ce
   qui change : « Sur devis » à la place du chiffre (donc pas de
   NumberFlow, et l'interrupteur mensuel / annuel ne la touche pas), les
   deux situations qui y mènent au « + » là où les autres cochent des
   postes, et un bouton qui ouvre le formulaire au lieu de réserver. */
function CarteSurMesure({ monde }: { monde: Monde }) {
  const c = CARTE_SUR_MESURE;
  /* côté grande structure, le sur-mesure passe lui aussi par le
     diagnostic : c'est la même porte, et le formulaire ne l'est plus */
  const devis = monde === "structure";

  return (
    <article className="tf-tier">
      <div className="tf-tier-tete">
        <div className="tf-tier-nom">
          <h3>{c.nom}</h3>
        </div>
        <p className="tf-tier-desc">{c.promesse}</p>
      </div>

      <div className="tf-tier-prix">
        {/* même hauteur de bloc que le prix des voisines : le grand mot,
            puis la ligne qui remplace « par mois », puis la note */}
        {/* le grand mot ne survit que côté PME, où cette carte est la
            SEULE à le porter — et c'est justement ce qui la distingue.
            Côté Groupes, les trois voisines viennent de le perdre : le
            garder ici en ferait la quatrième répétition du hero. */}
        {devis ? null : <p className="tf-tier-grand">{c.prixTexte}</p>}
        <p className={cn("tf-tier-ligne", devis ? "" : "mt-2")}>
          {devis ? GRANDE_STRUCTURE.sousPrix : c.sousPrix}
        </p>
        <p className="tf-tier-note">{c.note}</p>
      </div>

      <div className="tf-tier-liste">
        <h4 className="tf-tier-legende">{c.casTitre}</h4>
        <ul className="space-y-2.5">
          {c.cas.map((t) => (
            <li key={t} className="flex items-start">
              <Marqueur etat="plus" />
              <span>{t}</span>
            </li>
          ))}
        </ul>

        {/* 15/09, passe de compression — la seconde liste (« Inclus dans le
            devis ») part comme « Inclus dans le palier » sur les trois
            autres cartes. Les quatre partagent une sous-grille : la garder
            ici aurait gardé la rangée haute pour toutes, et le gain de
            place aurait été nul. Ce que la carte doit dire, elle le dit
            au-dessus — le périmètre concerné. */}
      </div>

      <div className="tf-tier-pied">
        <Bouton
          href={devis ? GRANDE_STRUCTURE.href : lienContact("avant")}
          plein
        >
          {devis ? GRANDE_STRUCTURE.cta : c.cta}
        </Bouton>
        <p className="tf-tier-plus">
          <Link href={c.href} className="ch-lien">
            {c.enSavoirPlus}
          </Link>
        </p>
      </div>
    </article>
  );
}

/* ——— le sélecteur des deux mondes (15/09) ———
   Deux boutons dans une piste, à la géométrie de l'interrupteur voisin
   (h-10, coins pleins) pour qu'ils se lisent comme une même rangée de
   commandes. `role="radiogroup"` plutôt qu'un second interrupteur : les
   deux états ont un NOM, et aucun n'est le « défaut allumé » de l'autre.
   Jetons shadcn inopérants ici, couleurs de `.resa` écrites en clair. */
function SelecteurMonde({
  monde,
  choisir,
}: {
  monde: Monde;
  choisir: (m: Monde) => void;
}) {
  /* 25/11/2026 — la piste de l'accueil (`.pr-billing`) : fond #eeeee8,
     l'état actif en blanc, plus de segment noir (tarifs.css, `.tf-monde`) */
  return (
    <div role="radiogroup" aria-label="À qui s'adresse la grille" className="tf-monde">
      {MONDES.map((m) => {
        const actif = m.id === monde;
        return (
          <button
            key={m.id}
            type="button"
            role="radio"
            aria-checked={actif}
            onClick={() => choisir(m.id)}
            className="tf-monde-btn"
          >
            {m.label}
          </button>
        );
      })}
    </div>
  );
}

/* « 1 200 » et non « 1200 » — même règle que le calculateur. */

function CartePalier({
  p,
  choisis,
  bascule,
  monde,
}: {
  p: Palier;
  /* la sélection vit dans Grille : vide dès qu'un AUTRE palier est actif */
  choisis: string[];
  bascule: (id: string) => void;
  monde: Monde;
}) {
  const manque = p.aChoisir === null ? 0 : p.aChoisir - choisis.length;
  /* côté grande structure le bouton ne commande rien : il mène au
     diagnostic, le compte des postes ne le conditionne plus */
  const devis = monde === "structure";
  /* 25/09 (Teo : « enlève la section comparateur ») — LE BOUTON N'ATTEND
     PLUS QUE LES POSTES. Il attendait le cas type du comparateur, qui
     fournissait les volumes ; sans lui, le choix des postes suffit, et le
     volume se relève à l'audit, comme le tarif. */
  const pret = devis || manque <= 0;
  const phare = Boolean(p.phare);
  /* 15/09, SECONDE PASSE (Teo) — LE BOUTON MÈNE À L'AUDIT, PAS À L'ACHAT.
     « C'est une estimation qui amène au bouton réserver un audit ; ça ne
     doit pas amener à un tarif à faire payer. » Il menait à /installation,
     où l'on bloque un créneau de mise en route et où l'on enregistre un
     moyen de paiement : le site vendait un abonnement au prix qu'il venait
     de calculer, sur des volumes déclarés de mémoire.

     Ce qui voyage : les postes et le volume, jamais le prix — il se
     recalcule à l'arrivée (voir app/reserver/page.tsx), et il n'y arrive
     que comme une phrase du message, pour que l'entretien parte des
     chiffres du visiteur. */
  const href = lienAudit((p.aChoisir === null ? POSTES.map((x) => x.id) : choisis).map(cleUrlDuPoste), 0);

  return (
    <article
      className={cn(
        "tf-tier",
        phare && "tf-tier--phare",
      )}
    >
      <div className="tf-tier-tete">
        <div className="tf-tier-nom">
          <h3>{NOM_AFFICHE[p.id]}</h3>
          {/* la pastille du palier, dans la rangée du nom (la grille de prix
              de l'accueil) : la sombre pour la carte phare */}
          {p.badge ? (
            <Pastille ton={phare ? "sombre" : "neutre"}>
              {phare ? <Star aria-hidden className="size-3 fill-current" /> : null}
              {p.badge}
            </Pastille>
          ) : null}
        </div>
        <p className="tf-tier-desc">{p.promesse}</p>
      </div>

      <div className="tf-tier-prix">
        {/* côté grande structure, le grand chiffre laisse la place au
            mot : pas de NumberFlow, rien à animer ni à remiser */}
        {devis ? (
          /* 15/09, dernière passe — CÔTÉ « GROUPES », PLUS DE GRAND
             « SUR DEVIS ». Les quatre cartes portaient le même mot en
             36 px, sous un hero qui venait de l'écrire : quatre
             répétitions d'une phrase déjà lue. Il ne reste que la ligne
             qui, elle, distingue — d'où sort le montant. */
          <>
            <p className="tf-tier-ligne">{GRANDE_STRUCTURE.sousPrix}</p>
            <p className="tf-tier-note">{GRANDE_STRUCTURE.note}</p>
          </>
        ) : (
          /* 25/09 — le comparateur parti, la carte n'a plus de cas dont
             tirer des heures : elle garde la seule ligne qui ne dépend
             que d'elle, son plafond. */
          /* 25/11/2026 — le plafond de pièces part : il dessinait un
             barème que le client ne voit plus. La carte dit la remise
             (−10 % dès 3 agents) ou que le prix sort de l'audit. */
          <p className="tf-tier-ligne">
            {p.aChoisir === 1 ? "Prix fixé à l'audit" : "−10 % sur chaque agent"}
          </p>
        )}
      </div>

      <div className="tf-tier-liste">
        {/* « Aperçu » de la référence : le choix des postes */}
        {p.aChoisir !== null ? (
          /* min-w-0 : un fieldset a min-inline-size: min-content par
             défaut ; sans lui il dépasse de son bloc dans les cartes
             étroites */
          <fieldset className="min-w-0">
            <legend className="tf-tier-legende">
              {p.aChoisir === 1 ? "Sélectionnez un poste" : `Sélectionnez ${p.aChoisir} postes`}
            </legend>
            <ul className="space-y-2.5">
              {POSTES.map((x) => {
                const actif = choisis.includes(x.id);
                const plein = !actif && p.aChoisir !== 1 && choisis.length >= (p.aChoisir ?? 0);
                return (
                  <li key={x.id}>
                    <label
                      className={cn(
                        "flex items-start",
                        plein ? "cursor-not-allowed" : "cursor-pointer",
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={actif}
                        disabled={plein}
                        onChange={() => bascule(x.id)}
                        className="peer sr-only"
                      />
                      <Marqueur etat={actif ? "coche" : plein ? "non" : "vide"} />
                      <span className={plein ? "tf-tier-eteint" : undefined}>{x.nom}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </fieldset>
        ) : (
          <div>
            <h4 className="tf-tier-legende">Les quatre postes inclus</h4>
            <ul className="space-y-2.5">
              {POSTES.map((x) => (
                <li key={x.id} className="flex items-start">
                  <Marqueur etat="coche" />
                  <span>{x.nom}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 15/09, passe de compression — LE BLOC « INCLUS DANS LE PALIER »
            EST PARTI. Ses trois points par carte disaient, dans l'ordre :
            le nombre de postes (déjà écrit au-dessus, dans le sélecteur),
            le plafond (remonté en une ligne sous le volume), et un
            avantage identique aux trois cartes — donc qui ne distingue
            rien et appartient à la page, pas à une carte. Le détail
            ligne à ligne vit dans le comparatif, juste en dessous.
            Retiré sur les QUATRE cartes, sur-mesure comprise : elles
            partagent une sous-grille, garder le bloc sur une seule
            aurait gardé la rangée haute pour toutes. */}
      </div>

      {/* le bouton en pied (écart 1) : les CTA tombent sur la même ligne,
          et la commande reste sous le choix qui l'active. Le bouton éteint
          garde le dessin blanc du kit, à opacité réduite. */}
      <div className="tf-tier-pied">
        {pret ? (
          <Bouton href={devis ? GRANDE_STRUCTURE.href : href} plein>
            {devis ? GRANDE_STRUCTURE.cta : "Réserver un audit"}
          </Bouton>
        ) : (
          <button type="button" disabled className="ch-btn ch-btn--plein tf-btn-eteint">
            {manque === 1 ? "Sélectionnez 1 poste" : `Sélectionnez encore ${manque} postes`}
          </button>
        )}
      </div>
    </article>
  );
}

export default function Grille() {
  /* 28/08 (Teo) — la sélection est EXCLUSIVE entre paliers : cocher un
     poste dans une carte efface la sélection de l'autre. */
  const [choix, setChoix] = useState<{ palier: string; postes: string[] }>({
    palier: "",
    postes: [],
  });
  /* 02/09 — la périodicité, UNE pour toute la grille (voir l'en-tête).
     03/09 : l'URL donne la valeur de départ (retour depuis /installation),
     le clic du visiteur prend ensuite le dessus. */
  /* 15/09, seconde passe — LE MONDE NE VIT PLUS ICI. Il est monté d'un
     cran (components/tarifs/monde.tsx, provider dans app/tarifs/page.tsx)
     parce que le Chèque TIC et l'appel final en dépendent eux aussi : tant
     qu'il était l'état privé de ce composant, ils disaient « Réserver un
     audit » sous une grille passée au « diagnostic ». La mécanique, elle,
     est inchangée — même useSyncExternalStore, même instantané serveur.
     La périodicité n'est PAS remise à zéro quand on passe côté devis : on
     revient côté PME avec la formule qu'on y avait laissée. */
  const monde = useMonde();
  const choisirMonde = useChoisirMonde();
  const devis = monde === "structure";

  const basculePour = (p: Palier) => (id: string) =>
    setChoix((prev) => {
      /* premier clic dans une autre carte : on repart de zéro chez elle */
      if (prev.palier !== p.id) return { palier: p.id, postes: [id] };
      if (prev.postes.includes(id))
        return { palier: p.id, postes: prev.postes.filter((x) => x !== id) };
      if (p.aChoisir === 1) return { palier: p.id, postes: [id] }; // radio
      if (p.aChoisir !== null && prev.postes.length >= p.aChoisir) return prev;
      return { palier: p.id, postes: [...prev.postes, id] };
    });

  return (
    <>
      {/* ═══ 1. le hero, puis le sélecteur des deux mondes ═══

             15/09, dernière passe (Teo : « et ça c'est trop compliqué,
             utilise ce composant pour expliquer qu'on chiffre à l'audit
             et pourquoi on peut pas mettre de prix directement »).

             CE QUI PART, et c'était le reproche : un titre, un chapô de
             six lignes, PUIS un encadré qui redisait la même chose en
             quatre lignes de plus. Trois blocs pour une seule idée, et
             l'encadré était né dix minutes plus tôt pour éviter de
             répéter « sur devis » — il avait créé sa propre répétition.

             CE QUI RESTE : une phrase qui dit quand le tarif est arrêté,
             une qui dit pourquoi il ne peut pas l'être avant, un bouton.
             Les conditions commerciales (mensuel, annuel, 30 jours) sont
             descendues d'un cran : elles vivent dans « Comment nous
             chiffrons », le comparatif et la FAQ, qui sont faits pour ça.
             ═══ */}
      {/* 25/11/2026 — LES PRIX DEVIENNENT PUBLICS (« Nos prix », v7). Le
          hero ne dépend plus du monde : le logiciel coûte le même prix à
          tous. Le sélecteur PME | Groupes descend au-dessus des agents,
          les seuls dont le chiffrage diffère d'un monde à l'autre.
          Même jour, charte de l'accueil : le héros est l'en-tête de page
          (h1 en deux tons), et les trois prix publics tombent dessous,
          dans la même section, en colonnes à filets. Disposition « pile »
          et non « côte » : en côte, la colonne du titre (≈ 860 px à 1440)
          coupait « 34,90 € par personne et par mois. » avant « mois ». */}
      <Section>
        <EnTeteSection
          niveau={1}
          haut
          disposition="pile"
          pastille="Tarifs"
          titre="Le logiciel de gestion coûte"
          suite={"34,90 € par personne et par mois."}
          chapo={"Ce prix comprend les six modules de gestion, des ventes à la comptabilité, et il s'applique dès la première personne. Les agents font le travail répétitif, et chacun a son propre prix, à partir de 69 € par mois. Prix hors taxes."}
          actions={
            <>
              <Bouton href="/reserver-un-audit" icone="calendrier">
                Réserver un audit
              </Bouton>
              <p className="tf-souscta">30 minutes, gratuit, sans engagement</p>
            </>
          }
        />
        <TroisPrix />
      </Section>

      {/* ═══ 2. les agents : en-tête de section, sélecteur, quatre colonnes ═══ */}
      <Section>
        <EnTeteSection
          pastille="Agents IA"
          titre="Choisissez vos agents"
          chapo={
            devis
              ? GRANDE_STRUCTURE.chapo
              : "Chaque agent prend en charge un poste. Son prix dépend du volume qu'il traite chaque mois, et il est écrit au devis avant que vous signiez."
          }
          actions={<SelecteurMonde monde={monde} choisir={choisirMonde} />}
        />

        {/* la grille. 15/09 — QUATRE CARTES, DONC DEUX GABARITS (voir
            l'en-tête) : de 768 à 1279 px, deux colonnes de deux, sur un
            gabarit de HUIT rangées (chaque carte en occupe quatre) ; à
            partir de 1280 px, quatre colonnes et quatre rangées.
            25/11 : les colonnes sont jointives, séparées par des filets
            (tarifs.css, `.tf-agents`). */}
        <div id="grille" className="tf-agents scroll-mt-32">
          {PALIERS.map((p) => (
            <CartePalier
              key={p.id}
              p={p}
              choisis={choix.palier === p.id ? choix.postes : []}
              bascule={basculePour(p)}
              monde={monde}
            />
          ))}
          <CarteSurMesure monde={monde} />
        </div>

        {/* 25/09 (Teo : « enlève la section comparateur ») — le comparateur
            de cas types (components/tarifs/Calculateur.tsx) ne se monte plus
            sous les cartes. Il fournissait les volumes dont vivaient les
            heures des cartes et le tableau « Comparer les paliers » : les
            cartes ne gardent que leur plafond, et le tableau, qui ne
            s'affichait qu'après le choix d'un cas, part avec lui. */}
      </Section>
    </>
  );
}
