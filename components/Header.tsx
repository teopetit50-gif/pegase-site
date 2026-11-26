"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { googleSansAccueil } from "@/app/_polices/google-sans-accueil";
import "./charte/charte.css";
import { GROUPES, NB_RANGEES, enColonnes, type Entree } from "@/lib/menu";

/* 22/07 — le pégase (SVG d'après l'icône « pegasus » de Skoll, game-icons.net,
   CC BY 3.0) est retiré du header ET du footer à la demande de Teo. Le crédit
   aux mentions légales n'a plus lieu d'être si l'icône ne réapparaît nulle
   part : à vérifier avant de la réintroduire. La marque ne vit plus que par
   le mot « Omega ». */

/* 11/09/2026 — la liste plate `NAV` (sept liens, sept blocs de commentaire
   datés) a déménagé dans lib/menu.ts et s'y est structurée en cinq
   rubriques. Les arbitrages de juillet et août l'ont suivie mot pour mot :
   ils expliquent POURQUOI chaque entrée est là, et ils valent autant pour
   le bandeau que pour ce panneau. Les deux surfaces lisent désormais la
   même source, elles ne peuvent plus diverger. */

/* 25/11/2026 — LA BARRE DE L'ACCUEIL, SUR TOUTE LA VITRINE (Teo : « que les
   autres pages soient semblables à l'accueil » ; docs/charte-accueil.md,
   décision 2). Elle prend les cotes de la barre de l'accueil (.sx-navbar) :
   64 px, puis 52 dès 32 px de défilement ; 1920 px au plus ; marges
   32 / 48 / 74,5 ; fond #f5f5f2 et filet bas #dcdcda ; Google Sans ; le
   logo de 17 px et « Omega » en 20 px ; deux boutons blancs de 46 px.
   Les menus déroulants (MenuPrincipal) et le panneau du téléphone restent.
   Le « caméléon » qui prélevait la couleur sous la barre (charte v2,
   juillet–septembre) part avec : la barre est opaque et claire partout,
   comme sur l'accueil. Ses fonctions sont dans l'historique git (9e9ebda5). */

/* 25/11/2026 — l'accueil est un décalque 1:1 d'une référence qui porte sa
   propre barre (components/accueil-sx/gen/SxNav.tsx). L'en-tête du site ne
   s'y monte donc pas : deux barres se superposeraient. Le test vit dans
   cette enveloppe, AVANT le composant, pour ne pas poser un `return`
   au milieu de ses hooks. Rétablir l'en-tête du site sur l'accueil =
   supprimer la ligne `if`, et retirer <SxNav /> d'app/page.tsx. */
/* les quatre liens de la barre de l'accueil (SxNav.tsx), dans le même ordre */
const LIENS_BARRE: [string, string][] = [
  ["Logiciel", "/offres"],
  ["Agents", "/offres#catalogue"],
  ["Intégrations", "/integrations"],
  ["Tarifs", "/tarifs"],
];

export default function Header() {
  const chemin = usePathname();
  if (chemin === "/") return null;
  return <HeaderDuSite />;
}

function HeaderDuSite() {
  const [open, setOpen] = useState(false);
  const barre = useRef<HTMLElement | null>(null);
  const pathname = usePathname();
  /* la barre est claire partout depuis le 25/11 ; `clairEff` reste le nom
     auquel s'accrochent le menu et le burger */
  const clairEff = true;
  /* resserrée dès 32 px de défilement, comme la barre de l'accueil ; jamais
     quand le panneau du téléphone est ouvert (il se cale sous ses 64 px) */
  const [defile, setDefile] = useState(false);
  useEffect(() => {
    const maj = () => setDefile(window.scrollY > 32);
    const t = requestAnimationFrame(maj);
    window.addEventListener("scroll", maj, { passive: true });
    return () => {
      cancelAnimationFrame(t);
      window.removeEventListener("scroll", maj);
    };
  }, []);
  const compact = defile && !open;


  /* Panneau ouvert : plus de scroll derrière, et Échap referme.
     `overflow: hidden` seul ne suffit pas ici — lenis pilote un scroll
     virtuel et continue de faire défiler la page sous le panneau. On pose
     donc aussi data-menu-open sur <html>, que PageMotion observe pour
     mettre lenis en pause (voir components/PageMotion.tsx). */
  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    const prev = root.style.overflow;
    root.style.overflow = "hidden";
    root.dataset.menuOpen = "true";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      root.style.overflow = prev;
      delete root.dataset.menuOpen;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  /* ═══ 16/09/2026 — LE CTA DE LA BARRE NE DOUBLE PLUS CELUI DU HERO ═══

     Demande de l'associé : « fais en sorte que le Commencer en haut à
     droite n'apparaisse qu'une fois qu'on scrolle assez, et que le bouton
     du hero ne soit plus visible ». Sur l'accueil, les deux disaient le
     même mot et menaient au même endroit, à trente centimètres l'un de
     l'autre : une hésitation offerte au visiteur, et deux fois moins de
     poids pour chacun.

     L'accueil marque son bouton `data-cta-hero` ; on l'observe, et celui
     de la barre n'apparaît qu'une fois l'autre sorti de l'écran.

     L'ÉTAT INITIAL SE DÉDUIT DU CHEMIN, il n'est pas deviné. `pathname`
     est connu au rendu serveur : sur « / » on part caché (le hero est à
     l'écran), partout ailleurs visible. Sans ça, ou bien le bouton
     clignote au premier rendu de l'accueil, ou bien il manque une image
     sur toutes les autres pages — et dans les deux cas l'hydratation
     diverge.

     La marge haute vaut la hauteur de la barre (64 px depuis le 25/11) :
     sans elle, le bouton du hero compte comme « à l'écran » alors qu'il
     est déjà passé DERRIÈRE la barre, et le relais se ferait trop tard.

     Repère absent (toutes les pages sauf l'accueil, ou accueil modifié) :
     on montre le bouton. Le défaut est le comportement d'avant.

     ⚠ PAS D'IntersectionObserver ICI, ET CE N'EST PAS UN OUBLI. Première
     version, le 16/09 : un observateur avec `rootMargin: -72px`. Il
     relayait bien à la descente et NE REPASSAIT PAS à la remontée —
     recette Playwright, transitions neutralisées : bouton encore visible
     une fois revenu à scrollY 0. Le défilement du site est piloté par
     Lenis (components/PageMotion.tsx) et l'observateur ne voyait pas
     toutes les traversées.

     On mesure donc le rectangle, dans la MÊME mécanique que la sonde de
     couleur juste au-dessus : mêmes écouteurs `scroll` / `resize`, même
     rAF, une lecture de layout de plus par image. Un seul dispositif à
     comprendre, et un seuil qu'on lit en clair — le bouton du hero est
     passé sous la barre quand son bas franchit sa hauteur. */
  const [ctaBarre, setCtaBarre] = useState(pathname !== "/");
  useEffect(() => {
    const cible = document.querySelector("[data-cta-hero]");
    /* la hauteur de la barre : h-16 sur téléphone, 72 dès `sm` */
    const hauteurBarre = () => 64;
    let brut = 0;
    const mesure = () => {
      brut = 0;
      setCtaBarre(
        !cible || cible.getBoundingClientRect().bottom <= hauteurBarre(),
      );
    };
    const surDefilement = () => {
      if (!brut) brut = requestAnimationFrame(mesure);
    };
    /* La première mesure passe par une image d'animation, jamais par un
       appel direct : un setState synchrone dans le corps d'un effet
       déclenche un rendu en cascade, et la règle
       `react-hooks/set-state-in-effect` du projet le refuse. Le décalage
       d'une image ne se voit pas — l'état de départ est déjà le bon,
       déduit du chemin. */
    surDefilement();
    /* Pas de repère sur la page : la mesure ci-dessus a déjà posé
       « visible », il n'y a rien à écouter. */
    if (!cible) {
      return () => {
        if (brut) cancelAnimationFrame(brut);
      };
    }
    window.addEventListener("scroll", surDefilement, { passive: true });
    window.addEventListener("resize", surDefilement, { passive: true });
    return () => {
      if (brut) cancelAnimationFrame(brut);
      window.removeEventListener("scroll", surDefilement);
      window.removeEventListener("resize", surDefilement);
    };
  }, [pathname]);

  /* changement de page depuis le panneau : on referme (le composant n'est pas
     démonté par la navigation client, le panneau resterait ouvert) */
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  /* 11/09/2026 — quelle rubrique est dépliée dans le panneau du téléphone.
     Pas d'effet pour la remettre à zéro quand le panneau se ferme : on la
     DÉRIVE. Le panneau se referme par quatre chemins (burger, Échap,
     changement de route, clic sur un lien) et un effet de remise à zéro
     aurait été un `setState` de plus dans un effet — ce que la règle
     react-hooks de ce dépôt refuse, à raison. */
  const [deplie, setDeplie] = useState<string | null>(null);
  const deplieEff = open ? deplie : null;

  /* La cascade d'entrée des rangées, posée une fois. L'opacité n'y est
     JAMAIS transitionnée (voir le commentaire du panneau) : elle bascule
     d'un coup, seule la montée est animée. */
  const cascade = (rang: number) => ({
    transition: "transform 0.32s cubic-bezier(0.16,1,0.3,1)",
    transitionDelay: open ? `${60 + rang * 55}ms` : "0ms",
    opacity: open ? 1 : 0,
    transform: open ? "none" : "translateY(14px)",
  });

  return (
    <header
      ref={barre}
      data-compact={compact}
      className={`ch-barre sticky top-0 z-50 ${googleSansAccueil.variable}`}
      style={{
        backgroundColor: open ? "#ffffff" : "#f5f5f2",
        viewTransitionName: "site-header",
      }}
    >
      <div className="ch-barre-rangee flex items-center justify-between gap-2">
        <Link href="/" aria-label="Accueil Omega" className="ch-barre-marque flex shrink-0 items-center gap-[8px] py-3">
          {/* 31/07 — la marque de Teo, détourée depuis son fichier. Deux
              variantes plutôt qu'un SVG recolorable : le tracé est un
              entrelacs, pas une forme pleine, et le reconstruire à la main
              donnait un damier symétrique qui n'était pas le bon dessin.
              La variante suit le caméléon du header.
              23/09 — nouveau dessin (deux anneaux entrelacés), livré en
              silhouette plate blanc sur noir : la luminance de l'image est
              directement l'alpha, la marque est unie (#0f1013, la couleur
              du mot-symbole ; blanc pour la variante). Les cinq fichiers
              sortent de outils/logo-omega.py ; icône, apple-icon (sur
              plaque blanche : iOS peint le transparent en noir) et favicon
              suivent. */}
          <Image
            src="/logo-pegase.png"
            alt=""
            width={96}
            height={96}
            priority
            className="block shrink-0"
          />
          <span>Omega</span>
        </Link>

        {/* 26/11/2026 (Teo : « la barre du haut des pages doit être la même
            que celle de l'accueil ») — la barre des pages intérieures est
            maintenant celle de l'accueil, mot pour mot : quatre liens à plat
            (Logiciel, Agents, Intégrations, Tarifs), puis « Parler à
            l'équipe » et « Commencer » en liens à chevron, le tout à partir
            de 1280 px (`desktop-sm`) ; en dessous, le burger. Les classes
            sont celles de components/accueil-sx/gen/SxNav.tsx : pour changer
            la barre, changer les deux. Les menus déroulants (MenuPrincipal)
            ne sont plus montés ici. */}
        <div className="flex items-center gap-2 sm:gap-4 desktop-sm:gap-[52px]">
          <ul className="hidden items-center gap-[24px] desktop-sm:flex">
            {LIENS_BARRE.map(([libelle, href]) => (
              <li key={href}>
                <Link
                  href={href}
                  className="inline-flex min-h-11 cursor-pointer items-center font-tight text-[17px] leading-[25.5px] tracking-[-0.34px] whitespace-nowrap text-black transition-[opacity,transform] duration-200 ease-out [-webkit-tap-highlight-color:transparent] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#121212] [@media(hover:hover)_and_(pointer:fine)]:hover:opacity-60"
                >
                  {libelle}
                </Link>
              </li>
            ))}
          </ul>
          {/* 30/07 — recalibré sur les boutons de la page (.o-btn : rayon 8,
              14 px medium, 34 px de haut). Le header portait du rayon 12 en
              15 px semibold : plus gros et plus rond que TOUT ce qu'il
              surplombe, d'où l'effet pastille. On garde 36 px de haut — deux
              pixels de plus que .o-btn — pour que la barre respire, et le
              rayon 10 fait la jonction entre les deux mondes. */}
          {/* 03/08 (Teo) — le CTA passe du plein au CONTOUR. Il prend la
              couleur du monde qu'il survole : trait noir et texte noir
              au-dessus d'une section claire, trait blanc et texte blanc
              au-dessus d'une section sombre — fond transparent dans les deux
              cas. Le remplissage ne revient qu'au survol, en très léger, pour
              que le bouton reste vivant sans redevenir une pastille. */}
          {/* 22/11 (Teo, « le site est trop fouillis ») — le bouton garde son
              mot, « Commencer », mais mène droit à l'audit : la page
              /commencer aiguillait entre plusieurs offres, et il n'y a plus
              qu'un produit. /commencer redirige vers la même page
              (next.config.ts). */}
          {/* 26/11/2026 — les deux boutons de la barre de l'accueil : des
              liens à chevron (Button « link »), plus les boutons blancs. */}
          <div className="hidden items-center gap-3 desktop-sm:flex">
            <Button asChild variant="link">
              <Link href="/contact">
                Parler à l&apos;équipe
                <ChevronRight className="ms-1 opacity-60" size={16} strokeWidth={2} aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild variant="link">
              <Link
                href="/reserver-un-audit"
                aria-hidden={!ctaBarre}
                tabIndex={ctaBarre ? undefined : -1}
                className={ctaBarre ? undefined : "pointer-events-none opacity-0"}
              >
                Commencer
                <ChevronRight className="ms-1 opacity-60" size={16} strokeWidth={2} aria-hidden="true" />
              </Link>
            </Button>
          </div>
          {/* 15/09/2026 — L'ICÔNE COMPTE EST RETIRÉE. Teo : « plus rien sur
              le site ne doit renvoyer à une page de connexion ». Elle était
              d'abord conditionnée à la présence du cookie de session (même
              jour, plus tôt) ; ce n'était pas assez — un client connecté la
              voyait encore. Le site ne propose plus qu'un geste, réserver un
              audit. Les clients entrent par app.omegaai.fr, ou par le lien
              de leurs e-mails. */}
          {/* burger 2 barres — se croise en X à l'ouverture */}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="menu-principal"
            aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
            /* 06/08 — panneau ouvert, la croix vit dans un carré arrondi à
               filet clair, comme dans la référence. Le filet était blanc sur
               noir ; il devient noir très dilué sur blanc. */
            className={`group -mr-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-md transition-colors duration-200 md:h-9 md:w-9 desktop-sm:hidden ${
              open
                ? "border border-black/15 hover:bg-black/[0.04]"
                : "hover:bg-black/[0.06]"
            }`}
          >
            {/* Deux barres, la seconde plus courte — c'est la forme de la
                référence, pas trois traits égaux (25/07, Teo). À l'ouverture
                elles se croisent en X, et la barre courte s'allonge pour que
                la croix soit symétrique.

                30/07 — affinées : 3 px d'épaisseur sur 22 de long donnaient un
                signe « égal » massif, hors de proportion avec le texte de la
                barre. On passe à 2 px sur 20, écart resserré à 6, et la barre
                courte file jusqu'au bout au survol — le geste annonce le
                panneau au lieu de le subir. */}
            <span className="relative block h-[10px] w-[20px]">
              {[0, 1].map((i) => (
                <span
                  key={i}
                  aria-hidden
                  className={`absolute left-0 block h-[2px] rounded-full transition-all duration-300 ${
                    clairEff ? "bg-[#0f1013]" : "bg-white"
                  } ${
                    open
                      ? "w-full"
                      : i === 0
                        ? "w-full"
                        : "w-[65%] group-hover:w-full"
                  } ${
                    i === 0
                      ? open
                        ? "top-1/2 -translate-y-1/2 rotate-45"
                        : "top-0"
                      : open
                        ? "top-1/2 -translate-y-1/2 -rotate-45"
                        : "bottom-0"
                  }`}
                />
              ))}
            </span>
          </button>
        </div>
      </div>

      {/* Panneau plein écran.
          22/07 — correctif superposition : le fond ne doit JAMAIS être animé
          en opacité. Un fondu sur un panneau plein écran laisse voir la page
          derrière pendant toute la transition, et les deux textes se
          superposent (bug signalé par Teo). Le fond apparaît donc d'un coup,
          opaque dès la première frame ; seul le CONTENU (liens) monte et
          s'estompe, en cascade. */}
      <div
        id="menu-principal"
        aria-hidden={!open}
        /* 25/07 — panneau toujours SOMBRE, quelle que soit la page derrière.
           06/08 (Teo) — il passe au BLANC sur la référence « Flux » : fond
           blanc pur, texte noir, et la barre du header bascule avec lui
           (voir `clairEff`). Le panneau n'est toujours pas caméléon : il ne
           dépend pas de la page qu'il recouvre, il impose sa surface. */
        /* `desktop-sm:hidden` : au-delà de 1280 px c'est la barre qui navigue, et
           le burger est caché. Sans cette classe, un panneau resté ouvert
           pendant qu'on élargit la fenêtre recouvrirait la page entière
           sans qu'aucun bouton ne permette de le refermer. */
        className={`fixed inset-x-0 bottom-0 top-[64px] z-40 bg-white desktop-sm:hidden ${
          open ? "visible" : "invisible"
        }`}
      >
        {/* 26/07 — panneau calé sur ocoya.com : rangées serrées, texte de
            corps, boutons rectangulaires à rayon 8 empilés sous les liens.
            06/08 — nouvelle référence, autre grammaire, trois écarts nets :
            les liens montent d'un cran (18/19 px au lieu de 16/17, pas de
            rangée à 48 px), les deux boutons quittent la pile des liens pour
            un PIED de panneau ancré en bas derrière un filet pleine largeur,
            et ils passent en pilule pleine (rayon = hauteur/2) au lieu du
            rayon 8. Le pied est en `mt-auto` : quel que soit le nombre
            de rangées, les CTA restent collés au bas de l'écran, ce
            que la pile précédente ne savait pas faire. */}
        <nav className="mx-auto flex h-full max-w-[1920px] flex-col px-[32px] ipad:px-[48px]">
          <div className="min-h-0 flex-1 overflow-y-auto pt-7 sm:pt-9">
            {/* 11/09/2026 — le panneau rend les CINQ rubriques, pas les
                onze destinations : les groupes se déplient au doigt.

                Première version : la liste à plat, onze rangées sous trois
                intitulés de groupe. Teo, en la voyant : « sur la version
                mobile c'est pas des trucs déroulants […] du coup c'est
                gênant, trop chargé ». Le panneau était passé de sept
                rangées à quatorze et débordait de l'écran — on avait payé
                l'accès aux pages produit par un mur de liens. Replié, il
                fait cinq rangées et tient sans défilement, exactement comme
                avant ce chantier.

                ⚠ LE DÉPLI N'EST PAS ANIMÉ, et c'est délibéré. Une hauteur
                ou une opacité qui part de zéro laisse le contenu INVISIBLE
                dès que le navigateur cesse de produire des images — le
                défaut qu'on vient de retirer du panneau déroulant du
                bandeau (voir menu-principal.css), et celui que le bloc de
                style ci-dessous évite depuis juillet. Le contenu apparaît
                donc d'un coup ; seul le chevron pivote, et un chevron figé
                ne cache rien.

                Une seule rubrique ouverte à la fois : c'est ce qui garantit
                que le panneau ne redevienne jamais le mur qu'il était. */}
            {GROUPES.map((g) => {
              const ouvert = deplieEff === g.titre;

              /* rubrique simple : la rangée-lien d'avant, au pixel près */
              if (g.seul)
                return (
                  <Link
                    key={g.titre}
                    href={g.href!}
                    onClick={() => setOpen(false)}
                    tabIndex={open ? undefined : -1}
                    style={cascade(g.rang)}
                    className="flex h-12 items-center text-[18px] font-normal leading-[1.3] tracking-[-0.015em] text-[#0f1013] transition-colors hover:text-[#0f1013]/55 sm:text-[19px]"
                  >
                    {g.titre}
                  </Link>
                );

              return (
                <div key={g.titre}>
                  <button
                    type="button"
                    onClick={() =>
                      setDeplie((d) => (d === g.titre ? null : g.titre))
                    }
                    aria-expanded={ouvert}
                    aria-controls={`menu-groupe-${g.rang}`}
                    tabIndex={open ? undefined : -1}
                    style={cascade(g.rang)}
                    /* Même rangée que les liens — 48 px, 18/19 px, graisse
                       normale : à l'œil rien ne distingue une rubrique qui
                       s'ouvre d'une qui navigue, sauf le chevron. */
                    className="flex h-12 w-full items-center justify-between text-[18px] font-normal leading-[1.3] tracking-[-0.015em] text-[#0f1013] transition-colors hover:text-[#0f1013]/55 sm:text-[19px]"
                  >
                    {g.titre}
                    <svg
                      aria-hidden
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className={`shrink-0 text-[#0f1013]/40 transition-transform duration-300 ${
                        ouvert ? "rotate-180" : ""
                      }`}
                    >
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </button>

                  {/* ⚠ Ce conteneur ne porte AUCUNE classe d'affichage. Un
                      `block` ou un `flex` ici rendrait l'attribut `hidden`
                      sans effet — l'utilitaire bat la feuille du navigateur
                      — et le sous-menu resterait déplié en permanence, sans
                      un bruit. La marge basse seule. */}
                  <div
                    id={`menu-groupe-${g.rang}`}
                    hidden={!ouvert}
                    className="pb-2"
                  >
                    {/* 25/09 (Teo : « ça se déplie mal ») — « Nos offres »
                        range ses entrées en deux familles titrées. Empilées,
                        elles faisaient treize rangées : le dépli mesurait
                        516 px et poussait les quatre autres rubriques sous
                        le bas de l'écran, même sur le plus grand iPhone. Au
                        doigt comme au bandeau, les deux familles se posent
                        donc CÔTE À CÔTE ; la vedette (« Toutes les offres »)
                        garde sa rangée pleine au-dessus. Hauteur tactile
                        inchangée (44 px) : c'est la pile qui raccourcit. */}
                    {(() => {
                      const lien = (
                        e: Entree,
                        retrait: boolean,
                        vedette = false,
                      ) => (
                        <Link
                          key={e.href}
                          href={e.href}
                          onClick={() => setOpen(false)}
                          tabIndex={ouvert && open ? undefined : -1}
                          /* Un cran en dessous de la rubrique : retrait, corps
                           plus petit, encre diluée. C'est ce qui fait lire la
                           pile comme un dépli et non comme dix liens de même
                           poids. Hauteur 44 px — le minimum tactile. */
                          className={`flex min-h-11 items-center gap-1.5 py-1 text-[16px] font-normal leading-[1.25] tracking-[-0.012em] transition-colors sm:text-[17px] ${
                            vedette
                              ? "text-[#0f1013] hover:text-[#0f1013]/55"
                              : "text-[#0f1013]/65 hover:text-[#0f1013]"
                          } ${retrait ? "pl-3.5" : ""}`}
                        >
                          {e.label}
                          {vedette && (
                            <span aria-hidden className="text-[#0f1013]/40">
                              →
                            </span>
                          )}
                        </Link>
                      );
                      const colonnes = enColonnes(
                        g.entrees.filter((e) => e.colonne),
                      );
                      const libres = g.entrees.filter((e) => !e.colonne);
                      if (!colonnes) return libres.map((e) => lien(e, true));

                      /* La vedette prend la case vide sous la colonne la
                         plus courte (5 offres face à 6 métiers) : une
                         rangée pleine de moins. Colonnes à égalité, elle
                         garde sa rangée au-dessus. Placement explicite par
                         case : l'ordre du DOM reste colonne par colonne,
                         celui qu'on lit, et les intertitres partagent la
                         même rangée même quand l'un passe à la ligne. */
                      const haut = Math.max(
                        ...colonnes.map((c) => c.entrees.length),
                      );
                      const hote = colonnes.findIndex(
                        (c) => c.entrees.length + libres.length <= haut,
                      );
                      return (
                        <>
                          {hote < 0 && libres.map((e) => lien(e, true))}
                          <div className="grid grid-cols-2 gap-x-4 pl-3.5">
                            {colonnes.flatMap((c, ci) => [
                              /* le titre de colonne du bandeau, en
                                 intertitre : pas un lien, pas une cible
                                 tactile */
                              <p
                                key={c.titre}
                                style={{ gridColumn: ci + 1, gridRow: 1 }}
                                className="self-end pt-3 pb-1 text-[12px] font-medium leading-[1.3] tracking-[0.01em] text-[#0f1013]/45"
                              >
                                {c.titre}
                              </p>,
                              ...[
                                ...c.entrees.map((e) => ({ e, v: false })),
                                ...(ci === hote
                                  ? libres.map((e) => ({ e, v: true }))
                                  : []),
                              ].map(({ e, v }, ri) => (
                                <div
                                  key={e.href}
                                  style={{ gridColumn: ci + 1, gridRow: ri + 2 }}
                                >
                                  {lien(e, false, v)}
                                </div>
                              )),
                            ])}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              );
            })}
          </div>
          {/* Pied ancré. Le filet part d'un bord à l'autre — d'où les marges
              négatives qui annulent la gouttière de <nav> — tandis que les
              boutons, eux, restent dans la gouttière. C'est ce décalage qui
              fait la séparation nette de la référence. Le padding bas suit
              la barre d'accueil iOS (`env(safe-area-inset-bottom)`) sans
              jamais descendre sous 16 px. */}
          {/* Le filet reste pleine largeur, mais la colonne de boutons est
              bridée à 420 px au-delà du mobile. La référence est un panneau
              étroit : à 1440 px, deux pilules pleine largeur ne sont plus des
              boutons, ce sont des bandeaux. Sur téléphone la contrainte ne
              s'applique pas et les boutons occupent bien toute la gouttière,
              exactement comme le screen. */}
          <div className="-mx-[32px] mt-auto border-t border-black/[0.08] px-[32px] pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 ipad:-mx-[48px] ipad:px-[48px] [&>a]:sm:max-w-[420px]">
            {/* La référence empile secondaire PUIS primaire : le bouton noir
                est le dernier de la colonne, au plus près du pouce. Omega
                n'avait pas de compte utilisateur, donc la paire Sign in / Get
                started était devenue « Nous contacter » (WhatsApp) puis
                « Commencer » (/tarifs, 28/08).
                15/09 — la pilule de compte est RETIRÉE, comme l'icône de la
                barre : le panneau ne propose plus que « Nous contacter » et
                « Commencer ». */}
            {/* 14/09 — était un <a> brut : le seul du menu, donc le seul
                bouton qui rechargeait tout le site au lieu de changer de
                page. Il rejoint ses voisins en <Link>. */}
            <Link
              href="/contact"
              onClick={() => setOpen(false)}
              tabIndex={open ? undefined : -1}
              style={{
                transition: "transform 0.32s cubic-bezier(0.16,1,0.3,1)",
                transitionDelay: open
                  ? `${60 + (NB_RANGEES + 1) * 55}ms`
                  : "0ms",
                opacity: open ? 1 : 0,
                transform: open ? "none" : "translateY(14px)",
              }}
              className="mt-2.5 flex h-[52px] w-full items-center justify-center rounded-[10px] border border-black/10 bg-white text-[16px] font-bold tracking-[-0.03em] text-[#121212] transition-opacity hover:opacity-90"
            >
              Nous contacter
            </Link>
            <Link
              href="/reserver-un-audit"
              onClick={() => setOpen(false)}
              tabIndex={open ? undefined : -1}
              style={{
                transition: "transform 0.32s cubic-bezier(0.16,1,0.3,1)",
                transitionDelay: open
                  ? `${60 + (NB_RANGEES + 2) * 55}ms`
                  : "0ms",
                opacity: open ? 1 : 0,
                transform: open ? "none" : "translateY(14px)",
              }}
              className="mt-2.5 flex h-[52px] w-full items-center justify-center rounded-[10px] border border-black/10 bg-white text-[16px] font-bold tracking-[-0.03em] text-[#121212] transition-opacity hover:opacity-90"
            >
              Commencer
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}
