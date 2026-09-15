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
   ═══════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import {
  useCallback, useState, useSyncExternalStore, type ComponentType } from "react";
import NumberFlow, { type Format } from "@number-flow/react";
import { Boxes, Check, Layers, Plus, Sparkles, Star, X, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CallToAction4 } from "@/components/ui/call-to-action-4";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Comparator } from "@/components/ui/comparator-1";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/cn";
import { COURRIEL, lienContact } from "@/lib/reservation";
import Calculateur from "@/components/tarifs/Calculateur";

import {
  CALCULATEUR,
  PLANCHER_MENSUEL,
  TARIF_PIECE,
  CARTE_SUR_MESURE,
  COMPARATIF_PALIERS,
  GRANDE_STRUCTURE,
  MONDES,
  PALIERS,
  POSTES,
  REMISE_ANNUELLE,
  economieAnnuelle,
  equivalentMensuel,
  lireMonde,
  lirePeriodicite,
  piecesPourPostes,
  postesPourCarte,
  prixAnnuel,
  prixPourVolume,
  type Monde,
  type SaisieVolumes,
  type Palier,
  type Periodicite,
} from "@/lib/paliers";

const REMISE_PCT = Math.round(REMISE_ANNUELLE * 100);

/* le prix en euros, sans centimes — le format que NumberFlow anime */
const FORMAT_EURO: Format = {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
};

/* l'icône de tête de chaque carte — la référence en pose une par palier,
   en 32 px. Trois icônes neutres qui montent : un poste, trois postes,
   tout. Pas de logo de moteur (voir l'écart 5 de l'en-tête). */
type Icone = ComponentType<{ className?: string; strokeWidth?: number }>;
const ICONE_PALIER: Record<Palier["id"], Icone> = {
  un: Zap,
  trois: Layers,
  complet: Boxes,
};

/* ——— la périodicité venue de l'URL (`?periodicite=annuel`), côté
   navigateur seulement ; le serveur répond toujours « mensuel » ——— */
function souscrireUrl(rappel: () => void) {
  window.addEventListener("popstate", rappel);
  return () => window.removeEventListener("popstate", rappel);
}
function periodiciteDeLUrl(): Periodicite {
  return lirePeriodicite(new URLSearchParams(window.location.search).get("periodicite"));
}
function periodiciteServeur(): Periodicite {
  return "mensuel";
}
/* 15/09 — le monde se lit de la même façon (`?monde=structure`), pour qu'un
   lien puisse ouvrir la page directement du bon côté. Le serveur répond
   toujours « pme » : la page reste STATIQUE, prix dans le HTML servi. */
function mondeDeLUrl(): Monde {
  return lireMonde(new URLSearchParams(window.location.search).get("monde"));
}
function mondeServeur(): Monde {
  return "pme";
}

/* le lien de réservation d'un palier — « Tout Omega » n'a rien à choisir,
   il part droit sur /installation ; les deux autres renvoient aux cartes
   où le choix se fait */
function lienPalier(p: Palier, periodicite: Periodicite) {
  if (p.aChoisir !== null) return "#grille";
  const postes = POSTES.map((x) => x.id).join(",");
  return `/installation?postes=${postes}${periodicite === "annuel" ? "&periodicite=annuel" : ""}`;
}

/* 08/09 — le bouton d'un palier dans le comparatif :
   noir pour Trois postes ET Tout Omega, filet pour Un poste. */
function boutonPalier(p: Palier) {
  return p.id === "un" ? "r-btn--fil" : "r-btn--noir";
}

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
    "mr-3 mt-px grid size-[18px] flex-none place-content-center rounded-full transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#050505]";
  if (etat === "coche")
    return (
      <span aria-hidden className={cn(commun, "bg-[#050505] text-white")}>
        <Check className="size-3" strokeWidth={3} />
      </span>
    );
  if (etat === "non")
    return (
      <span aria-hidden className={cn(commun, "text-[#9a9a9a]")}>
        <X className="size-3.5" strokeWidth={2.5} />
      </span>
    );
  if (etat === "plus")
    return (
      <span aria-hidden className={cn(commun, "border border-[#050505] text-[#050505]")}>
        <Plus className="size-3" strokeWidth={2.5} />
      </span>
    );
  return <span aria-hidden className={cn(commun, "border border-[#c7c7c7] bg-white")} />;
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
    <Card
      className={cn(
        "relative flex h-full flex-col rounded-xl border-[#e3e3e3] shadow-none transition-all duration-300",
        "hover:border-[#050505]/30 hover:shadow-md",
        "md:row-span-4 md:grid md:grid-rows-subgrid",
      )}
    >
      <CardHeader className="items-center pt-8 text-center">
        <div className="mb-4 flex justify-center">
          <Sparkles className="size-8 text-[#050505]" strokeWidth={1.5} />
        </div>
        <CardTitle className="font-[family-name:var(--font-jakarta)] text-2xl">{c.nom}</CardTitle>
        <CardDescription className="text-[#616161]">{c.promesse}</CardDescription>
      </CardHeader>

      <div className="px-6">
        <div className="text-center">
          {/* même hauteur de bloc que le prix des voisines : le grand mot,
              puis la ligne qui remplace « par mois », puis la note */}
          <p className="text-4xl font-bold text-[#050505]">{c.prixTexte}</p>
          {/* côté grande structure, le prix sort du même diagnostic que
              celui des trois autres cartes : la ligne le dit pareil */}
          <p className="mt-1 text-sm text-[#616161]">
            {devis ? GRANDE_STRUCTURE.sousPrix : c.sousPrix}
          </p>
          <div className="mt-3">
            <p className="text-xs text-[#767676]">{c.note}</p>
          </div>
        </div>
      </div>

      <div className="px-6">
        <div className="border-t border-[#e3e3e3] pt-5 text-left text-sm">
          <h4 className="mb-3 font-semibold text-[#050505]">{c.casTitre}</h4>
          <ul className="space-y-2.5">
            {c.cas.map((t) => (
              <li key={t} className="flex items-start">
                <Marqueur etat="plus" />
                <span className="text-[#3d3d3d]">{t}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-6 text-left text-sm">
          <h4 className="mb-3 font-semibold text-[#050505]">{c.pointsTitre}</h4>
          <ul className="space-y-2.5">
            {c.points.map((t) => (
              <li key={t} className="flex items-start">
                <Marqueur etat="coche" />
                <span className="text-[#3d3d3d]">{t}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <CardFooter className="mt-auto flex-col items-stretch pt-6 md:mt-0">
        <Button asChild variant="outline" className="h-11 w-full text-[15px]">
          {devis ? (
            <Link href={GRANDE_STRUCTURE.href}>{GRANDE_STRUCTURE.cta}</Link>
          ) : (
            <a href={lienContact("avant")}>{c.cta}</a>
          )}
        </Button>
        <p className="mt-3 text-center text-xs text-[#767676]">
          <Link href={c.href} className="r-lien !text-xs">
            {c.enSavoirPlus}
          </Link>
        </p>
      </CardFooter>
    </Card>
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
  return (
    <div
      role="radiogroup"
      aria-label="À qui s'adresse la grille"
      className="inline-flex rounded-full border border-[#e3e3e3] bg-white p-1"
    >
      {MONDES.map((m) => {
        const actif = m.id === monde;
        return (
          <button
            key={m.id}
            type="button"
            role="radio"
            aria-checked={actif}
            onClick={() => choisir(m.id)}
            className={cn(
              "cursor-pointer rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              "outline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#050505]/70",
              actif ? "bg-[#050505] text-white" : "text-[#3d3d3d] hover:text-[#050505]",
            )}
          >
            {m.label}
          </button>
        );
      })}
    </div>
  );
}

/* « 1 200 » et non « 1200 » — même règle que le calculateur. */
const nombreFr = (n: number) => n.toLocaleString("fr-FR");

function CartePalier({
  p,
  choisis,
  bascule,
  periodicite,
  monde,
  volumes,
}: {
  p: Palier;
  /* la sélection vit dans Grille : vide dès qu'un AUTRE palier est actif */
  choisis: string[];
  bascule: (id: string) => void;
  periodicite: Periodicite;
  monde: Monde;
  /* les volumes saisis au calculateur — null tant qu'il n'a rien reçu. La
     carte en tire SON prix, sur les pièces de SES propres postes : deux
     cartes voisines affichent donc deux montants différents. */
  volumes: SaisieVolumes | null;
}) {
  /* 15/09 — LE PRIX DE CETTE CARTE. Il ne se lit plus dans PALIERS : il se
     calcule sur les pièces des postes que CETTE carte comprend. */
  const postesFactures = volumes ? postesPourCarte(volumes, p.aChoisir, choisis) : [];
  const piecesCarte = volumes ? piecesPourPostes(volumes, postesFactures) : 0;
  const prixCarte = volumes ? prixPourVolume(piecesCarte) : null;
  const prixVisible = prixCarte !== null;
  const auPlancher = prixCarte === PLANCHER_MENSUEL;
  const manque = p.aChoisir === null ? 0 : p.aChoisir - choisis.length;
  /* côté grande structure le bouton ne commande rien : il mène au
     diagnostic, le compte des postes ne le conditionne plus */
  const devis = monde === "structure";
  /* 15/09, correctif (Teo : « je n'avais pas encore mis de donnée dans le
     calculateur, il a inventé un chiffre ») — LE BOUTON ATTEND LES VOLUMES.
     La carte retenait son prix sans volumes, mais son bouton menait quand
     même à /installation, dont le récapitulatif affiche le montant du
     palier : le chiffre que la grille refusait de montrer sortait par la
     porte d'à côté, et sans avoir vérifié que le volume tient sous le
     plafond du palier. Même verrou que `prixVisible`, même raison. */
  const pret = devis || (manque <= 0 && prixVisible);
  const annuel = periodicite === "annuel" && !devis;
  const phare = Boolean(p.phare);
  /* 15/09 — LE LIEN PORTE LE VOLUME : sans lui, /installation puis la
     fonction SQL figeraient un autre prix que celui affiché ici. Le serveur
     RECALCULE sur ce nombre ; il ne reçoit jamais un montant, qui serait
     falsifiable depuis l'URL. */
  const href =
    `/installation?postes=${postesFactures.join(",")}` +
    (piecesCarte > 0 ? `&pieces=${piecesCarte}` : "") +
    (annuel ? "&periodicite=annuel" : "");
  /* L'écart « quatrième poste » se calcule lui aussi sur les volumes : il
     n'est plus une constante. Masqué s'il est nul (le plancher l'écrase). */
  const ecart = (() => {
    if (p.id !== "complet" || devis || !volumes || prixCarte === null) return null;
    const trois = prixPourVolume(piecesPourPostes(volumes, postesPourCarte(volumes, 3, [])));
    if (trois === null) return null;
    const d = prixCarte - trois;
    return d > 0 ? d : null;
  })();
  const Icone = ICONE_PALIER[p.id];

  return (
    <Card
      className={cn(
        "relative flex h-full flex-col rounded-xl border-[#e3e3e3] shadow-none transition-all duration-300",
        "hover:border-[#050505]/30 hover:shadow-md",
        /* dès md, la carte devient une SOUS-GRILLE de quatre rangées : tête,
           prix, listes, pied. Les cartes d'une même bande partagent donc
           les mêmes lignes — sans elle, la promesse de « Tout Omega » fait
           quatre lignes contre trois et son prix descend de 20 px */
        "md:row-span-4 md:grid md:grid-rows-subgrid",
        phare && "border-[#050505] shadow-md ring-1 ring-[#050505]/15",
      )}
    >
      {/* la pastille à cheval sur le filet, comme la référence */}
      {p.badge ? (
        <div
          className={cn(
            "absolute inset-x-0 -top-3 mx-auto w-fit rounded-full px-3 py-1 text-xs font-medium",
            phare
              ? "bg-[#050505] text-white"
              : "border border-[#e3e3e3] bg-white text-[#050505] shadow-sm",
          )}
        >
          <span className="inline-flex items-center gap-1.5">
            {phare ? <Star aria-hidden className="size-3 fill-current" /> : null}
            {p.badge}
          </span>
        </div>
      ) : null}

      <CardHeader className="items-center pt-8 text-center">
        <div className="mb-4 flex justify-center">
          <Icone className="size-8 text-[#050505]" strokeWidth={1.5} />
        </div>
        <CardTitle className="font-[family-name:var(--font-jakarta)] text-2xl">{p.nom}</CardTitle>
        <CardDescription className="text-[#616161]">{p.promesse}</CardDescription>
      </CardHeader>

      <div className="px-6">
        {/* le prix, centré. NumberFlow anime les chiffres à la bascule : il
            ne faut SURTOUT PAS le remonter par une clé ; seules les lignes
            qui l'entourent rejouent leur fondu */}
        <div className="text-center">
          {/* côté grande structure, le grand chiffre laisse la place au
              mot : pas de NumberFlow, rien à animer ni à remiser */}
          {devis ? (
            <>
              <p className="text-4xl font-bold text-[#050505]">{GRANDE_STRUCTURE.prixTexte}</p>
              <p className="mt-1 text-sm text-[#616161]">{GRANDE_STRUCTURE.sousPrix}</p>
              <div className="mt-3">
                <p className="text-xs text-[#767676]">{GRANDE_STRUCTURE.note}</p>
              </div>
            </>
          ) : !prixVisible ? (
            /* 15/09 — l'attente du chiffre. Elle occupe la MÊME place que le
               prix pour que la carte ne saute pas quand il arrive, et elle
               dit pourquoi elle est là plutôt que de laisser un tiret muet. */
            <>
              <p className="text-4xl font-bold text-[#c2c2c2]">{CALCULATEUR.avant.grand}</p>
              <p className="mt-1 text-sm text-[#616161]">{CALCULATEUR.avant.sous}</p>
              <div className="mt-3">
                <p className="text-xs text-[#767676]">{CALCULATEUR.avant.note}</p>
              </div>
            </>
          ) : (
          <>
          <div className="flex flex-wrap items-baseline justify-center gap-x-2">
            <NumberFlow
              aria-label={`${annuel ? equivalentMensuel(prixCarte!) : prixCarte!} euros par mois`}
              className="text-4xl font-bold tabular-nums text-[#050505]"
              format={FORMAT_EURO}
              locales="fr-FR"
              value={annuel ? equivalentMensuel(prixCarte!) : prixCarte!}
            />
            {annuel ? (
              <span key="barre" className="rv-fondu text-sm font-medium text-[#8a8a8a] line-through">
                <span className="sr-only">Au lieu de </span>
                {prixCarte!.toLocaleString("fr-FR")}&nbsp;€
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-[#616161]">par mois, estimé</p>
          {/* 15/09 — D'OÙ SORT LE CHIFFRE, ET CE QU'IL VAUT. Un montant nu
              redevient un montant qu'on a choisi : la carte dit sur quoi il
              est calculé, et rappelle que l'audit le fixe. */}
          <p className="mt-1 text-xs text-[#767676]">
            {auPlancher
              ? `Minimum mensuel — ${nombreFr(piecesCarte)} pièce${piecesCarte > 1 ? "s" : ""} seulement`
              : `${nombreFr(piecesCarte)} pièces × ${TARIF_PIECE} €`}
          </p>
          <p className="mt-2 text-xs text-[#767676]">Chiffré à l&apos;audit, sur vos vrais chiffres.</p>

          <div key={periodicite} className="rv-fondu mt-3">
            <p className="text-xs text-[#767676]">
              {annuel
                ? `Facturé ${prixAnnuel(prixCarte!).toLocaleString("fr-FR")} € par an, en une fois.`
                : "Facturé chaque mois, sans engagement."}
            </p>
            {annuel ? (
              <p className="mt-2 inline-block rounded-lg bg-[#e8f6ed] px-2.5 py-1 text-[13px] font-semibold text-[#15753a]">
                Vous économisez {economieAnnuelle(prixCarte!).toLocaleString("fr-FR")}&nbsp;€ par an
              </p>
            ) : null}
          </div>

          </>
          )}

          {ecart !== null ? (
            <p className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-[#050505]">
              <span aria-hidden className="size-1.5 rounded-full bg-[#050505]" />
              Le quatrième poste pour {ecart.toLocaleString("fr-FR")}&nbsp;€ de plus.
            </p>
          ) : null}
        </div>

      </div>

      <div className="px-6">
        {/* « Aperçu » de la référence : le choix des postes */}
        <div className="border-t border-[#e3e3e3] pt-5 text-left text-sm">
          {p.aChoisir !== null ? (
            /* min-w-0 : un fieldset a min-inline-size: min-content par
               défaut ; sans lui il dépasse de son bloc dans les cartes
               étroites */
            <fieldset className="min-w-0">
              <legend className="mb-3 font-semibold text-[#050505]">
                {p.aChoisir === 1 ? "Choisissez votre poste" : `Choisissez ${p.aChoisir} postes`}
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
                        <span className={plein ? "text-[#9a9a9a]" : "text-[#3d3d3d]"}>{x.nom}</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </fieldset>
          ) : (
            <div>
              <h4 className="mb-3 font-semibold text-[#050505]">Les quatre postes, en service</h4>
              <ul className="space-y-2.5">
                {POSTES.map((x) => (
                  <li key={x.id} className="flex items-start">
                    <Marqueur etat="coche" />
                    <span className="text-[#3d3d3d]">{x.nom}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* « Points forts » de la référence : ce que le palier comprend.
            Côté grande structure, les points du palier PME (réunion de
            45 min, satisfait ou remboursé, sans engagement) n'ont pas été
            promis : ce sont ceux du devis qui s'affichent. */}
        <div className="mt-6 text-left text-sm">
          <h4 className="mb-3 font-semibold text-[#050505]">
            {devis ? GRANDE_STRUCTURE.pointsTitre : "Compris dans le palier"}
          </h4>
          <ul className="space-y-2.5">
            {(devis ? GRANDE_STRUCTURE.points : p.points).map((t) => (
              <li key={t} className="flex items-start">
                <Marqueur etat="coche" />
                <span className="text-[#3d3d3d]">{t}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* le bouton en pied (écart 1) : les CTA tombent sur la même ligne,
          et la commande reste sous le choix qui l'active. `mt-auto`
          bottom-aligne le pied tant que la carte est une pile (mobile) ;
          dès la sous-grille il le DÉCALERAIT — 15/09 : la note d'une
          seule ligne de la carte sur-mesure faisait descendre son bouton
          de 16 px sous les trois autres — d'où `md:mt-0`, qui accroche
          tous les pieds au HAUT de la même rangée. */}
      <CardFooter className="mt-auto flex-col items-stretch pt-6 md:mt-0">
        {pret ? (
          <Button
            asChild
            variant={phare ? "default" : "outline"}
            className="h-11 w-full text-[15px]"
          >
            <Link href={devis ? GRANDE_STRUCTURE.href : href}>
              {devis ? GRANDE_STRUCTURE.cta : "Réserver l'installation"}
            </Link>
          </Button>
        ) : (
          <Button disabled variant="outline" className="h-11 w-full text-[15px]">
            {manque > 0
              ? manque === 1
                ? "Choisissez 1 poste"
                : `Choisissez encore ${manque} postes`
              : "Indiquez vos volumes"}
          </Button>
        )}
        {/* 05/09 — le moyen de paiement s'enregistre à la réservation,
            rien n'est débité avant la fin de l'installation */}
        <p className="mt-3 text-center text-xs text-[#767676]">
          {devis
            ? "Gratuit à partir de 30 minutes, sans engagement."
            : "Rien n'est débité avant la fin de l'installation."}
        </p>
      </CardFooter>
    </Card>
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
  const depuisUrl = useSyncExternalStore(souscrireUrl, periodiciteDeLUrl, periodiciteServeur);
  const [choixPeriodicite, setPeriodicite] = useState<Periodicite | null>(null);
  const periodicite = choixPeriodicite ?? depuisUrl;
  /* 15/09 — le monde, même mécanique que la périodicité. Elle n'est PAS
     remise à zéro quand on passe côté devis : on revient côté PME avec la
     formule qu'on y avait laissée. */
  const mondeUrl = useSyncExternalStore(souscrireUrl, mondeDeLUrl, mondeServeur);
  const [choixMonde, setMonde] = useState<Monde | null>(null);
  /* 15/09 (Teo) — « je veux pas que les prix s'affichent avant d'avoir
     rempli le truc, sinon on reste sur un truc inventé ». Tant que le
     calculateur n'a pas reçu un volume, les cartes montrent tout SAUF leur
     chiffre, et le comparatif — qui ne compare que des prix — attend. */
  const [volumes, setVolumes] = useState<SaisieVolumes | null>(null);
  const noterVolumes = useCallback((v: SaisieVolumes | null) => setVolumes(v), []);
  const monde = choixMonde ?? mondeUrl;
  const devis = monde === "structure";
  const annuel = periodicite === "annuel" && !devis;

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
      {/* ═══ 1. en-tête centré, interrupteur de périodicité, trois cartes
             cernées — le modèle « pricing-module » ═══ */}
      <section data-monde="clair" className="r-wrap pb-10 pt-12 sm:pb-14 sm:pt-16">
        <div className="mx-auto max-w-3xl text-center">
          {/* 15/09 — la pastille « Prix publics » RETIRÉE (Teo). Le titre
              porte déjà les deux mots ; l'objet partagé « kicker-tarifs »
              n'avait plus de partenaire monté côté /commencer. */}
          <h1 className="text-balance font-[family-name:var(--font-jakarta)] text-4xl font-semibold leading-[1.15] tracking-[-0.025em] text-[#050505] sm:text-5xl">
            {devis ? GRANDE_STRUCTURE.titre : "Des prix publics, gradués sur ce que vous traitez"}
          </h1>
          <p key={monde} className="rv-fondu mx-auto mt-4 max-w-2xl text-balance text-[#616161]">
            {devis ? (
              GRANDE_STRUCTURE.chapo
            ) : (
              <>
                Pour les indépendants, TPE et PME&nbsp;: vous choisissez vos postes, le prix suit
                le volume que le système traite pour vous, et l&apos;installation se chiffre à
                part, une seule fois. Sans engagement en mensuel, −{REMISE_PCT}&nbsp;% en annuel,
                satisfait ou remboursé trente jours.
              </>
            )}
          </p>
        </div>

        {/* la rangée de commandes : le sélecteur des deux mondes d'abord —
            il commande le reste, y compris la présence de l'interrupteur —
            puis la facturation. `flex-wrap` : sous ~560 px les deux
            passent l'un sous l'autre plutôt que de déborder. */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-4">
          <SelecteurMonde monde={monde} choisir={setMonde} />
          {devis ? null : (
            <Switch
              checked={annuel}
              onCheckedChange={(coche) => setPeriodicite(coche ? "annuel" : "mensuel")}
            >
              <span className="text-[#3d3d3d]">Facturation annuelle</span>
              <span className="rounded-full border border-[#e3e3e3] bg-white px-2 py-0.5 text-xs font-medium text-[#050505]">
                −{REMISE_PCT}&nbsp;%<span className="sr-only"> de remise</span>
              </span>
            </Switch>
          )}
        </div>

        {/* la grille. `pt-4` laisse passer les pastilles posées à -12 px.
            15/09 — QUATRE CARTES, DONC DEUX GABARITS (voir l'en-tête) :
            · de 768 à 1279 px, deux colonnes de deux, et un gabarit de
              HUIT rangées — chaque carte en occupe quatre, la seconde
              bande tombe donc sur les rangées 5 à 8 ; `gap-y-8` sépare
              les deux bandes, que `gap-y-0` annule quand tout revient
              sur une seule ligne ;
            · à partir de 1280 px, quatre colonnes et quatre rangées.
            Pourquoi pas quatre colonnes dès 1024 px : la colonne utile y
            vaut 928 px, soit 208 px par carte — deux mots par ligne. */}
        {/* ═══ LE CALCULATEUR — AVANT LES CARTES (15/09, Teo) ═══
            Il est passé DEVANT le 15/09 : « je veux pas que les prix
            s'affichent avant d'avoir rempli le truc, sinon on reste sur un
            truc inventé. » Les cartes en dépendent maintenant — tant qu'il
            n'a pas de volumes, elles montrent tout sauf leur chiffre. Le
            mettre après les cartes reviendrait à demander au visiteur de
            redescendre pour débloquer ce qu'il regarde.

            PAS DU CÔTÉ GRANDE STRUCTURE : là-bas il n'y a pas de palier à
            trouver, le prix sort de l'audit. Même raison que le comparatif.

            Il reçoit ce qui est déjà coché dans les cartes pour ne pas
            reposer la question ; questions, coefficients, durées et textes
            vivent tous dans lib/paliers.ts.

            15/09, seconde passe — `max-w-5xl` et non `4xl` : le calculateur
            est passé à deux panneaux (modèle pricing-12) et sa colonne de
            résultat en prend 400 px à partir de 1024 px.
            15/09, troisième passe — `lg:max-w-none` : le cadre prend toute la
            colonne de la page (1 184 px dans le `.r-wrap`) au lieu de 1 024.
            Ce n'est pas de la largeur pour de la largeur — c'est ce qui donne
            aux questions les 705 px où elles tiennent sur deux colonnes, et
            le cadre perd d'un coup la moitié de sa hauteur. */}
        {devis ? null : (
          <div className="mx-auto mt-10 max-w-5xl lg:max-w-none">
            <Calculateur
              postesChoisis={choix.postes}
              palierChoisi={choix.palier}
              onVerdict={noterVolumes}
            />
          </div>
        )}

        <div
          id="grille"
          className="mx-auto mt-12 grid max-w-md scroll-mt-32 gap-6 pt-4 md:max-w-3xl md:grid-cols-2 md:grid-rows-[auto_auto_1fr_auto_auto_auto_1fr_auto] md:gap-x-6 md:gap-y-10 lg:mt-16 xl:max-w-none xl:grid-cols-4 xl:grid-rows-[auto_auto_1fr_auto] xl:gap-x-6 xl:gap-y-0"
        >
          {PALIERS.map((p) => (
            <CartePalier
              key={p.id}
              p={p}
              choisis={choix.palier === p.id ? choix.postes : []}
              bascule={basculePour(p)}
              periodicite={periodicite}
              monde={monde}
              volumes={volumes}
            />
          ))}
          <CarteSurMesure monde={monde} />
        </div>

        {/* ce qui tourne chez tout le monde */}
        <p
          data-reveal
          className="mx-auto mt-12 max-w-[76ch] text-center text-[13px] leading-[21px] text-[#616161] lg:mt-20"
        >
          <span className="font-semibold text-[#050505]">Compris à tous les paliers.</span>{" "}
          Quatre postes s&apos;installent sur les outils que vous avez déjà&nbsp;: messagerie, tableur, WhatsApp. Quel que
          soit le palier, l&apos;état de l&apos;activité chaque matin et la garantie que rien ne part sans votre validation
          viennent avec&nbsp;: ce ne sont pas des options, et ils ne se facturent pas.
        </p>

        {devis ? (
          <p key="bas-devis" className="r-note rv-fondu mx-auto mt-8 max-w-3xl text-center">
            {GRANDE_STRUCTURE.bas}
          </p>
        ) : (
        <p data-reveal className="r-note mx-auto mt-8 max-w-3xl text-center">
          Prix TTC, grille en vigueur au 01/09/2026 — le prix affiché au moment de votre demande
          est celui qui vous est confirmé à l&apos;installation. L&apos;installation elle-même
          (mise en route sur vos outils, rodage sous votre contrôle) est comprise dans la réunion
          pour les quatre postes standard&nbsp;; un raccordement particulier est chiffré avant
          tout engagement. Le moyen de paiement — carte ou prélèvement SEPA — est enregistré à
          la réservation&nbsp;; rien n&apos;est débité avant la fin de l&apos;installation, le
          premier prélèvement part le jour de la mise en service. Formule mensuelle&nbsp;: sans
          engagement, résiliable à tout moment, le mois en cours va à son terme. Formule
          annuelle&nbsp;: {REMISE_PCT}&nbsp;% de remise, facturée en une fois le jour de la mise
          en service&nbsp;; le satisfait ou remboursé 30 jours s&apos;applique de la même façon.
        </p>
        )}
      </section>

      {/* ═══ 2. bandeau d'orientation — 14/09 : la carte à deux volets de
             Tailark (call-to-action-4). Les mots sont ceux du bandeau du
             28/08, réorganisés : la question en titre, les trois choses à
             décrire en liste à coches, « le jour même » en grande mention
             dans l'encart, l'e-mail dessous, le bouton inchangé. ═══ */}
      <section data-monde="clair" className="r-wrap pb-14 sm:pb-16">
        <CallToAction4
          className="mx-auto max-w-4xl"
          titre={devis ? GRANDE_STRUCTURE.bandeau.titre : "Vous ne savez pas quel palier choisir ?"}
          texte={
            devis
              ? GRANDE_STRUCTURE.bandeau.texte
              : "Décrivez votre situation en deux lignes. Nous vous répondons avec le palier adapté, et la réunion d'installation se réserve en ligne."
          }
          points={["Votre activité", "Ce qui vous prend le plus de temps", "Ce qui se perd"]}
          encart={{
            sur: "Une réponse",
            grand: "le jour même",
            sous: (
              <>
                {/* 15/09/2026 — l'adresse reste affichée, elle n'est plus
                    un lien `mailto:`. Plus rien sur le site n'ouvre un
                    client mail ; le bouton juste à côté mène au formulaire,
                    en faire un second lien vers la même page ne servirait
                    à rien.
                    Le `mailto:` ne subsiste que là où il est la bonne réponse : la carte « Écrire » de /contact, que le visiteur a choisie, et les voies de SECOURS (formulaire ou agenda en panne). */}
                Ou par e-mail&nbsp;: <span className="text-[#050505]">{COURRIEL}</span>
              </>
            ),
            bouton: { label: "Décrire ma situation", href: lienContact("avant") },
          }}
        />
      </section>

      {/* ═══ 3. comparatif — côté grande structure il ne s'affiche PAS
             (15/09) : ses quinze lignes comparent des prix mensuels, une
             réunion d'installation de 45 minutes et un satisfait ou
             remboursé qui n'ont pas été promis de ce côté-là ; les
             réécrire aurait été inventer. La note de bas de grille et le
             bandeau d'orientation portent la suite.

             14/09 : le « Comparator one » de Tailark, en
             carte à quatre colonnes (voir components/ui/comparator-1).
             Les deux en-têtes collants du 05/09 et le repli « Voir tous
             les points » partent avec lui : quinze lignes en trois
             familles se lisent d'un coup, et la tête de la carte porte
             déjà les prix — qui suivent la périodicité choisie plus haut. */}
      {/* 15/09 — le comparatif attend lui aussi les volumes : ses lignes
          « Mensuel », « Annuel », « Vous économisez » et « Installation » ne
          sont QUE des prix. L'afficher avant, ce serait donner par la porte
          de derrière les montants que les cartes retiennent. */}
      {devis || volumes === null ? null : (
      <section id="comparatif" data-monde="clair" className="r-blanc">
        <div className="r-wrap py-14 sm:py-20">
          <div className="text-center">
            <h2 className="r-h2 text-balance">Comparer les paliers</h2>
            <p className="mx-auto mt-4 max-w-md text-balance text-[#616161]">
              Chaque ligne redit ce que les cartes disent déjà, côte à côte.{" "}
              <a href={lienContact("avant")} className="r-lien">
                Demander conseil
              </a>
            </p>
          </div>
          <Comparator
            className="mx-auto mt-12 max-w-4xl"
            plans={PALIERS.map((p) => ({
              id: p.id,
              nom: p.nom,
              prix: `${annuel ? equivalentMensuel(p.prix) : p.prix}\u00A0€`,
              periode: annuel ? `par mois · ${prixAnnuel(p.prix)}\u00A0€ par an` : "par mois",
              href: lienPalier(p, periodicite),
              cta: p.aChoisir === null ? "Réserver l'installation" : "Choisir mes postes",
              bouton: boutonPalier(p),
              phare: p.phare,
            }))}
            familles={COMPARATIF_PALIERS.map((f) => ({
              titre: f.titre,
              lignes: f.lignes.map((l) => ({ libelle: l.libelle, aide: l.aide, valeurs: l.valeurs })),
            }))}
          />
        </div>
      </section>
      )}
    </>
  );
}
