import Image from "next/image";
import Link from "next/link";
import "./ClotureAppel.css";

/* ══════════════════════════════════════════════════════════════════════
   <ClotureAppel> — la carte d'appel qui ferme /modeles (14/09/2026)

   ORIGINE. `cta10` de shadcnblocks (bloc gratuit, registre shadcn) : une
   carte arrondie sur fond `bg-accent`, titre + description à gauche,
   deux boutons à droite qui passent sous le texte en dessous de `lg` et
   en colonne sous `sm`. Le `cta11` (image latérale + icône dans un carré
   gris) a été regardé et écarté : la clôture n'a ni image latérale ni
   icône à justifier.

   POURQUOI ICI. La Cloture précédente centrait tout dans un bloc haut :
   titre → phrase → faits → bouton → prix, cinq paliers. Les deux colonnes
   de cta10 mettent l'argument et l'action à la même hauteur ; les trois
   faits passent en rangée de pied, sous un filet, où ils ferment le bloc
   au lieu de le couper en deux.

   CE QUI EST JETÉ de la source, et pourquoi :
   · `container` et `bg-accent` / `text-muted-foreground` : ces jetons
     n'existent pas ici. La colonne est celle de `.m-wrap` (posée par la
     section appelante), la carte est `--m-sombre`, les gris sont des
     blancs atténués.
   · `<Button>` de shadcn (`@/components/ui/button`) : absent du dossier.
     Les deux boutons sont ceux du hero de la page (page.tsx) : le
     principal est `.m-btn-clair` + `.m-chevron` — le CONTOUR blanc que
     Teo a choisi le 03/08 pour « le hero et la clôture » à la place du
     blanc plein (globals.css, commentaire au-dessus de `.m-btn-clair`) ;
     le second reprend le contour léger du « Voir les N modèles ». Un
     bouton plein avait été écrit ici, il est retiré : il renversait cette
     décision. `.o-btn` a été vérifié : sa règle vit sous `.offres`, elle
     ne s'applique pas sous `.modeles`.
   · Les props `heading` / `description` / `buttons` et leurs défauts
     anglais : aucune prop, les textes sont ceux de la page. L'ordre
     secondaire → principal de la source est inversé, comme dans le hero.

   CE QUI EST GARDÉ de la Cloture précédente :
   · La photo `/photos/brief.jpg` (03/08, Teo : « le noir uni devient une
     photo ») et son voile. Le voile est RE-CREUSÉ pour cette mise en page :
     la Cloture lisait au centre, ici on lit à GAUCHE (titre, phrase) et
     les boutons tombent à droite à partir de lg. Dense à gauche, plus
     léger vers la droite où la photo n'est que du bois — même principe
     qu'avant (éteindre où on lit, laisser voir où on ne lit pas), axe
     tourné. Plancher à 0,50 sur le bord droit : les boutons à contour et
     le troisième fait y restent lisibles. La lueur passe AU-DESSUS du
     voile, très faible ; à valider à l'écran, avec la photo.

   ÉCARTS ASSUMÉS.
   · La Cloture précédente n'avait qu'UN bouton ; son second lien était
     inline dans la phrase de prix (« 990 € le site catalogue »). Ce lien
     devient le second bouton, libellé et href intacts ; le reste de la
     phrase reste en note sous les boutons. La note nomme de nouveau le
     montant de base (« Sur 990 € ») : sans lui, « 198 € restant » ne
     disait plus restant sur quoi — la phrase est réécrite, pas ses
     chiffres.
   · Pas de sur-titre : la Cloture n'en avait pas, et un texte ajouté
     n'est pas un texte conservé.
   ══════════════════════════════════════════════════════════════════════ */

/* Les trois objections à un premier rendez-vous, tombées avant d'être
   posées : le temps, le coût, l'échelle. 15/09 : le Chèque TIC laisse la
   place au multi-enseignes — il reste traité en pleine page sur
   /tarifs/site, mais en tête de clôture il signait « aide aux TPE ». */
const FAITS = [
  { fort: "30 minutes", doux: "en visio ou sur place" },
  { fort: "Gratuit", doux: "et sans engagement" },
  { fort: "Plusieurs sites", doux: "un socle commun, un interlocuteur" },
];

export default function ClotureAppel() {
  return (
    <div className="ca-carte relative isolate overflow-hidden rounded-[18px] border border-white/10 bg-[color:var(--m-sombre)] text-white">
      {/* ——— le fond : photo, voile, lueur — dans cet ordre, tous en
          z-index -1 sous la carte `isolate`, donc peints dans l'ordre du
          DOM et jamais derrière la section. `object-left` : sur téléphone
          la carte est haute et étroite, la photo (3:2) se rogne en largeur
          et c'est le sujet, à gauche, qu'il faut garder. */}
      <Image
        src="/photos/brief.jpg"
        alt=""
        aria-hidden
        fill
        sizes="(max-width: 1248px) 100vw, 1200px"
        className="-z-10 object-cover object-left"
      />
      <div aria-hidden className="ca-voile" />
      <div aria-hidden className="ca-lueur" />

      {/* ——— haut de carte : argument à gauche, action à droite ——— */}
      <div className="flex flex-col gap-10 lg:flex-row lg:items-center lg:justify-between lg:gap-16">
        <div className="max-w-[46ch]">
          {/* 28/08 — pas de promesse d'entretien : la phrase vise le démarrage.
              24ch : « Votre vitrine démarre en / deux minutes » en deux lignes
              à partir de lg ; trois sur téléphone, où la colonne fait 286 px. */}
          <h2 data-intertitre className="m-h2 max-w-[24ch] text-white">
            Mettez votre vitrine en service
          </h2>
          {/* Cinq lignes à 390 : hérité de la Cloture, où la phrase faisait
              déjà cinq lignes ; le texte est conservé tel quel. */}
          <p className="mt-5 max-w-[52ch] text-[clamp(0.95rem,1.3vw,1.1rem)] leading-relaxed text-white/70">
            Choisissez un modèle, nous écrivons tout le contenu. Le poste qui va avec récupère ce qui se perd aujourd&apos;hui entre un visiteur et un client qui règle.
          </p>
        </div>

        {/* Sous sm : colonne pleine largeur. De sm à lg : les deux côte à
            côte sous le texte. À partir de lg : colonne à droite, les deux
            boutons étirés à la même largeur (items-stretch). */}
        <div className="flex w-full shrink-0 flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap lg:flex-col lg:flex-nowrap lg:items-stretch">
          {/* 02/09 (Teo) : comme le « Commencer » du hero, direct vers l'offre
              site — pas l'aiguillage à trois cartes.
              `justify-between` : quand le bouton est plein largeur (sous sm),
              la pastille reste calée au bord droit comme dans le hero au lieu
              de suivre le texte au centre — avec `pl-6 pr-2.5`, un centrage
              aurait décalé le groupe de 7 px vers la droite. */}
          <Link
            href="/tarifs/site"
            className="ca-btn ca-btn--principal m-btn-clair w-full justify-between py-3 pl-6 pr-2.5 sm:w-auto"
          >
            Commencer
            <span className="m-chevron flex h-7 w-7 shrink-0 items-center justify-center rounded-full">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden>
                <path
                  d="M3 8h9M8.5 4.5 12 8l-3.5 3.5"
                  stroke="#fff"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </Link>

          {/* 01/09 — le prix du site est public (/tarifs/site) : la clôture
              le mentionne sans vendre, le lien porte la transaction ailleurs.
              Contour léger du second bouton du hero (« Voir les N modèles »),
              pour que les deux contours ne pèsent pas le même poids. */}
          <Link
            href="/tarifs/site"
            className="ca-btn w-full justify-center border border-white/25 px-6 py-3 text-white/90 transition-colors hover:border-white/45 hover:text-white sm:w-auto"
          >
            990&nbsp;€ le site catalogue
          </Link>

          <p className="text-[13px] leading-relaxed text-white/55 sm:basis-full lg:max-w-[30ch] lg:basis-auto">
            Prix public, le même pour tout le monde. Plusieurs enseignes ou un besoin
            hors catalogue&nbsp;: sur devis, après diagnostic.
          </p>
        </div>
      </div>

      {/* ——— pied de carte : les trois faits ———
          Filet au-dessus, puis trois colonnes séparées par des filets
          verticaux à partir de sm. En dessous ils s'empilent : trois
          colonnes de 90 px sur un téléphone donneraient des mots coupés.
          Poids 400 sur les chiffres, comme la Cloture et le bandeau de
          faits de la page : tout .modeles tient au 400, la hiérarchie se
          fait par la taille. */}
      <ul className="mt-12 grid list-none grid-cols-1 gap-y-6 border-t border-white/10 p-0 pt-8 sm:grid-cols-3 sm:gap-y-0">
        {FAITS.map((f, i) => (
          <li
            key={f.fort}
            data-reveal
            className={
              i > 0
                ? "sm:border-l sm:border-white/10 sm:pl-6"
                : "sm:pr-6"
            }
          >
            <p className="text-[clamp(1.25rem,1.7vw,1.5rem)] leading-tight text-white">
              {f.fort}
            </p>
            <p className="mt-1.5 text-[13.5px] text-white/70">{f.doux}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
