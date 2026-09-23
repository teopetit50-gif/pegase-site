"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import MenuPrincipal from "./MenuPrincipal";
import { GROUPES, NB_RANGEES } from "@/lib/menu";

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

/* Header caméléon (charte v2) : il survole les deux mondes. Au-dessus d'une
   section claire ([data-monde="clair"]), il passe en verre clair — fond
   #f4f1ec/85 + blur, texte noir — via un check rAF léger de la section sous
   le header ; transition douce dans les deux sens. Navigation 22/07 : plus de
   liens inline — un burger 3 barres à tous les breakpoints (façon Qonto) qui
   ouvre un panneau plein écran ; tap ≥ 44px.

   11/09/2026 — « à tous les breakpoints » n'est plus vrai : à partir de `lg`
   la barre porte un bandeau de cinq rubriques (MenuPrincipal) et le burger
   disparaît. Le panneau plein écran, lui, n'a pas bougé d'un pixel — il reste
   la navigation du téléphone et de la tablette. Le caméléon vaut pour les
   deux : les intitulés du bandeau prennent l'encre du monde survolé, mais
   leurs panneaux déroulants imposent leur blanc, comme le panneau plein écran
   depuis le 06/08. */
/* 11/09 — getComputedStyle ne rend pas toujours du `rgb()`. Dès que la
   couleur est déclarée dans un espace moderne (oklch, lab…), le navigateur
   la sérialise TELLE QUELLE : `lab(96.52 -0.00003 0.00001)`, qui est un
   blanc. L'ancienne version cherchait trois nombres et les divisait par
   255 — elle lisait donc 96.52/255 = 0,38 et déclarait ce blanc « sombre ».
   L'entête de FRONTD sortait en texte clair sur fond clair, illisible,
   alors que la sonde avait parfaitement trouvé le bon élément.

   Plutôt que d'énumérer les espaces de couleur (il en arrivera d'autres),
   on fait PEINDRE la couleur au navigateur et on relit le pixel : quel que
   soit l'espace d'origine, on récupère du sRGB en 0–255. Mesuré sur ce
   moteur : `lab(96.52 …)` et `oklch(.97 0 0)` rendent bien 245,245,245.

   ⚠ Ne pas remplacer par la lecture de `fillStyle` après affectation, qui
   semble plus simple : ce navigateur relit la chaîne TELLE QUELLE
   (`lab(…)` reste `lab(…)`), donc la conversion n'a pas lieu. Essayé le
   11/09, ça ne convertit rien. Il faut le `fillRect` + `getImageData`.

   Mémorisé : une seule peinture par couleur distincte, quel que soit le
   nombre d'images de défilement. */
const enRgb = new Map<string, number[] | null>();
let toile: CanvasRenderingContext2D | null = null;

function versRgb(couleur: string): number[] | null {
  if (enRgb.has(couleur)) return enRgb.get(couleur) ?? null;
  if (typeof document === "undefined") return null;
  if (!toile) {
    const cv = document.createElement("canvas");
    cv.width = cv.height = 1;
    toile = cv.getContext("2d", { willReadFrequently: true });
  }
  let rgb: number[] | null = null;
  if (toile) {
    /* Deux affectations : si la seconde est invalide, `fillStyle` garde
       silencieusement la précédente — on veut alors un repli connu. */
    toile.fillStyle = "#000000";
    toile.fillStyle = couleur;
    toile.fillRect(0, 0, 1, 1);
    const d = toile.getImageData(0, 0, 1, 1).data;
    rgb = [d[0], d[1], d[2]];
  }
  enRgb.set(couleur, rgb);
  return rgb;
}

/* Luminance relative, pour décider de la couleur du texte à partir du fond
   échantillonné. Seuil à 0,5 : au-dessus le fond est clair, texte noir. */
function estClair(couleur: string) {
  const canaux = versRgb(couleur);
  if (!canaux) return false;
  const [r, v, b] = canaux.map((n) => n / 255);
  return 0.2126 * r + 0.7152 * v + 0.0722 * b > 0.5;
}

export default function Header() {
  /* 30/07 — la barre ne DEVINE plus sa couleur, elle la PRÉLÈVE.
     Elle portait deux couleurs codées en dur : #f6f6f5 en clair et le noir
     de bg-panel sinon. Or le monde .offres est en #ffffff pur et ses bandes
     nuit en #09090b : dans les deux cas on voyait une démarcation nette
     entre la barre et la section qu'elle surplombe (Teo). On échantillonne
     désormais le fond réel sous le header, quel qu'il soit — blanc, gris,
     #09090b, crème de la charte v2 — et la barre le reprend à l'identique. */
  const [fond, setFond] = useState("");
  const [open, setOpen] = useState(false);
  const raf = useRef(0);
  const barre = useRef<HTMLElement | null>(null);
  /* la sonde, rendue appelable hors de son effet (re-sondage par route) */
  const checkRef = useRef<() => void>(() => {});
  const pathname = usePathname();
  const clair = fond ? estClair(fond) : false;
  /* 06/08 (Teo) — le panneau passe du NOIR au BLANC, sur la référence
     « Flux » qu'il a collée. Conséquence directe : la barre du header doit
     basculer en clair avec lui, sinon on retrouve exactement le défaut de
     25/07 dans l'autre sens — une bande sombre posée sur un panneau clair.
     `clairEff` est donc la couleur EFFECTIVE de la barre : celle prélevée
     sous elle en temps normal, forcée en clair dès que le panneau est
     ouvert. Logo, marque, CTA et burger s'y accrochent tous. */
  const clairEff = open || clair;


  useEffect(() => {
    const check = () => {
      raf.current = 0;
      /* 23/07 — la sonde était posée au CENTRE du header (y = 36). Or le
         header est `sticky`, pas `fixed` : en haut de page il occupe sa
         place dans le flux et AUCUNE section ne couvre ce point — le header
         restait donc noir au-dessus d'un hero clair (bug /solutions signalé
         par Teo). On sonde désormais juste SOUS le bord bas du header : au
         chargement c'est la première section, au défilement c'est celle que
         le header recouvre.

         30/07 — l'abscisse est calée à 4 px du bord gauche, hors de la
         colonne de contenu : à cet endroit la pile ne contient que des
         sections et des habillages, jamais une carte dont on prélèverait la
         couleur par erreur. On remonte la pile jusqu'au premier fond opaque,
         ce qui traverse naturellement les sections transparentes (leur
         couleur vient alors de .offres ou de .o-nuit).

         Cette sonde remplace aussi le balayage de TOUTES les sections
         [data-monde="clair"] avec un getBoundingClientRect chacune, qui
         lisait le layout N fois par image de défilement. */
      const y = (barre.current?.getBoundingClientRect().bottom ?? 72) + 1;
      /* 11/09 — on prélevait à x = 4, c'est-à-dire à 4 px du bord de la
         FENÊTRE. Or <main> est plafonné à 1440 px et centré : au-delà, ce
         point tombe dans la gouttière, sur le bg-panel noir du site, et la
         barre repassait en verre sombre au-dessus d'une page claire. Le
         défaut existait depuis juillet sur .monde-clair et .resa ; les
         quatre pages produit rapatriées, entièrement claires, le rendaient
         criant.

         On prélève donc à 4 px du bord de <main>, pas de la fenêtre.
         L'intention d'origine est intacte — rester sur le bord de la
         colonne, là où il n'y a que des fonds de section, jamais une carte
         dont on prélèverait la couleur par erreur — et en dessous de 1440
         la valeur est la même qu'avant, à un pixel près.

         Une seule lecture de layout de plus par image, à côté de celle de
         la barre qui était déjà là. */
      const colonne = document.querySelector("main")?.getBoundingClientRect();
      const x = colonne ? colonne.left + 4 : 4;
      const pile = document.elementsFromPoint(x, y) as HTMLElement[];
      let trouve = "";
      for (const el of pile) {
        if (el === barre.current || barre.current?.contains(el)) continue;
        const c = getComputedStyle(el).backgroundColor;
        /* On ne saute QUE le transparent, c'est-à-dire un rgba dont l'alpha
           vaut 0. Le test précédent (`/,\s*0\)$/`) était faux : `rgb(0,0,0)`
           se termine lui aussi par « , 0) », donc le NOIR PUR était pris pour
           du transparent et la barre prélevait le fond blanc situé dessous
           (bug visible sur le hero de /contact, 30/07). */
        if (c && c !== "transparent" && !/^rgba\(.*?,\s*0(\.0+)?\)$/.test(c)) {
          trouve = c;
          break;
        }
      }
      if (trouve) setFond(trouve);
    };
    checkRef.current = check;
    const onScroll = () => {
      if (!raf.current) raf.current = requestAnimationFrame(check);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    check();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, []);

  /* 01/09 — le header vit dans le layout racine et ne remonte plus à chaque
     page : il re-sonde la couleur sous lui au changement de route, en phase
     layout (dans le même cycle que la transition, avant la première image
     de la nouvelle page), puis une fois la transition finie. */
  useLayoutEffect(() => {
    checkRef.current();
  }, [pathname]);
  useEffect(() => {
    const t = window.setTimeout(() => checkRef.current(), 600);
    return () => window.clearTimeout(t);
  }, [pathname]);

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

     La marge haute de −72 px vaut la hauteur de la barre (h-16 / sm:72) :
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
    const hauteurBarre = () => (window.innerWidth >= 640 ? 72 : 64);
    let brut = 0;
    const mesure = () => {
      brut = 0;
      setCtaBarre(!cible || cible.getBoundingClientRect().bottom <= hauteurBarre());
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
      className={`sticky top-0 z-50 transition-colors duration-300 ${
        /* OPAQUE (23/07) : le #f6f6f5/85 + blur virait gris en haut de page.
           À cet endroit le header ne surplombe encore aucune section — son
           arrière-plan est le noir de la page — et 15 % de noir suffisaient
           à salir le clair, dessinant une barre séparée au-dessus du hero
           /solutions là où la surface doit être continue. */
        /* 25/07 — panneau ouvert : la barre suit le panneau et passe au noir.
           Sinon on avait une barre claire au-dessus d'un panneau sombre.
           06/08 — le panneau est blanc : la barre le suit en BLANC, même
           raison, sens inverse. La surface header + panneau doit se lire
           d'un seul tenant, sans démarcation. */
        /* 30/07 — la couleur vient désormais du fond prélevé (style ci-
           dessous). `bg-panel` ne sert plus que de repli pour la toute
           première image, avant que la sonde ait tourné. */
        open || fond ? "" : "bg-panel"
      }`}
      /* viewTransitionName : pendant une transition de page, le header est
         ÉPINGLÉ — capturé sous son propre nom, posé au-dessus de la page
         qui sort, jamais animé (règles ::view-transition-*(site-header)). */
      style={{ backgroundColor: open ? "#ffffff" : fond || undefined, viewTransitionName: "site-header" }}
    >
      <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-2 px-3 sm:h-[72px] sm:px-10">
        <Link href="/" className="flex shrink-0 items-center gap-2.5 py-3">
          {/* 31/07 — la marque de Teo, détourée depuis son fichier. Deux
              variantes plutôt qu'un SVG recolorable : le tracé est un
              entrelacs, pas une forme pleine, et le reconstruire à la main
              donnait un damier symétrique qui n'était pas le bon dessin.
              La variante suit le caméléon du header.
              23/09 — nouveau dessin (deux anneaux entrelacés, chants
              argentés) : les mêmes cinq fichiers ont été régénérés depuis
              l'image livrée par Teo, la variante blanche par inversion de
              luminance. Icône, apple-icon et favicon suivent. */}
          <Image
            src={clairEff ? "/logo-pegase.png" : "/logo-pegase-blanc.png"}
            alt=""
            width={96}
            height={96}
            priority
            className="h-[26px] w-[26px] shrink-0"
          />
          <span
            className={`text-[17px] font-semibold tracking-tight transition-colors duration-300 sm:text-[19px] ${
              clairEff ? "text-[#0f1013]" : "text-white"
            }`}
          >
            Omega.AI
          </span>
        </Link>

        {/* 11/09/2026 — le bandeau de navigation. Il vit à partir de `lg`
            seulement ; sous ce seuil la barre reste ce qu'elle était depuis
            le 22/07, un burger et rien d'autre. `clairEff` et non `clair` :
            panneau ouvert, la barre est forcée en clair et les intitulés
            doivent basculer avec elle — même si, le burger étant caché à
            partir de `lg`, les deux valeurs s'y confondent en pratique. */}
        <MenuPrincipal clair={clairEff} pathname={pathname} />

        <div className="flex items-center gap-2 sm:gap-4">
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
          <Link
            href="/commencer"
            /* Caché, il reste dans le DOM : le démonter ferait sauter la
               largeur de la barre à chaque passage, et les intitulés du
               menu glisseraient à droite. Il perd sa prise au clavier et
               son annonce aux lecteurs d'écran tant qu'il est invisible —
               un bouton qu'on ne voit pas ne doit pas se tabuler. */
            aria-hidden={!ctaBarre}
            tabIndex={ctaBarre ? undefined : -1}
            className={`hidden h-9 items-center rounded-[10px] border px-4 text-[14px] font-medium leading-none tracking-[-0.01em] transition-[background-color,border-color,transform,opacity] duration-200 active:scale-[0.97] md:inline-flex ${
              ctaBarre ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-1 opacity-0"
            } ${
              clairEff
                ? "border-[#09090b]/25 text-[#09090b] hover:border-[#09090b]/60 hover:bg-black/[0.05]"
                : "border-white/35 text-white hover:border-white/70 hover:bg-white/10"
            }`}
          >
            Commencer
          </Link>
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
            className={`group -mr-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] transition-colors duration-200 md:h-9 md:w-9 lg:hidden ${
              open
                ? "border border-black/15 hover:bg-black/[0.04]"
                : clair
                  ? "hover:bg-black/[0.06]"
                  : "hover:bg-white/10"
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
        /* `lg:hidden` : au-delà du seuil c'est le bandeau qui navigue, et
           le burger est caché. Sans cette classe, un panneau resté ouvert
           pendant qu'on élargit la fenêtre recouvrirait la page entière
           sans qu'aucun bouton ne permette de le refermer. */
        className={`fixed inset-x-0 bottom-0 top-16 z-40 bg-white sm:top-[72px] lg:hidden ${
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
        <nav className="mx-auto flex h-full max-w-[1440px] flex-col px-3 sm:px-10">
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
                    onClick={() => setDeplie((d) => (d === g.titre ? null : g.titre))}
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
                  <div id={`menu-groupe-${g.rang}`} hidden={!ouvert} className="pb-2">
                    {g.entrees.map((e) => (
                      <Link
                        key={e.href}
                        href={e.href}
                        onClick={() => setOpen(false)}
                        tabIndex={ouvert && open ? undefined : -1}
                        /* Un cran en dessous de la rubrique : retrait, corps
                           plus petit, encre diluée. C'est ce qui fait lire la
                           pile comme un dépli et non comme dix liens de même
                           poids. Hauteur 44 px — le minimum tactile. */
                        className="flex h-11 items-center pl-3.5 text-[16px] font-normal leading-[1.3] tracking-[-0.012em] text-[#0f1013]/65 transition-colors hover:text-[#0f1013] sm:text-[17px]"
                      >
                        {e.label}
                      </Link>
                    ))}
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
          <div className="-mx-3 mt-auto border-t border-black/[0.08] px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 sm:-mx-10 sm:px-10 [&>a]:sm:max-w-[420px]">
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
                transitionDelay: open ? `${60 + (NB_RANGEES + 1) * 55}ms` : "0ms",
                opacity: open ? 1 : 0,
                transform: open ? "none" : "translateY(14px)",
              }}
              className="mt-2.5 flex h-[52px] w-full items-center justify-center rounded-full border border-black/[0.07] bg-[#f5f5f4] text-[15px] font-medium tracking-[-0.01em] text-[#0f1013] transition-colors hover:bg-[#ebebe9]"
            >
              Nous contacter
            </Link>
            <Link
              href="/commencer"
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
              className="mt-2.5 flex h-[52px] w-full items-center justify-center rounded-full bg-[#0f1013] text-[15px] font-medium tracking-[-0.01em] text-white transition-colors hover:bg-[#26272b]"
            >
              Commencer
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}
