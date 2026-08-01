"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

/* 22/07 — le pégase (SVG d'après l'icône « pegasus » de Skoll, game-icons.net,
   CC BY 3.0) est retiré du header ET du footer à la demande de Teo. Le crédit
   aux mentions légales n'a plus lieu d'être si l'icône ne réapparaît nulle
   part : à vérifier avant de la réintroduire. La marque ne vit plus que par
   le mot « Omega ». */

/* 25/07 — « Solutions » retiré : la page liste ET les fiches moteurs vivent
   désormais sous /offres (/offres, /offres/payd…). Les anciennes URL
   /solutions et /solutions/[moteur] sont redirigées en 308 par
   next.config.ts, donc aucun lien externe ne casse. */
const NAV = [
  { href: "/offres", label: "Nos offres" },
  { href: "/integrations", label: "Intégrations" },
  /* 30/07 — « Articles » devient « Blog » : la page est refaite sur la
     référence blog.ocoya.com et vit désormais sous /blog (redirection 308
     depuis /articles dans next.config.ts). */
  { href: "/blog", label: "Blog" },
  /* 30/07 — l'entrée « À propos » saute : Teo ne voulait pas de la page
     (reproduction qonto.com/en/about jugée non conforme). La route /contact
     est supprimée et redirigée par next.config.ts. */
];

/* Header caméléon (charte v2) : il survole les deux mondes. Au-dessus d'une
   section claire ([data-monde="clair"]), il passe en verre clair — fond
   #f4f1ec/85 + blur, texte noir — via un check rAF léger de la section sous
   le header ; transition douce dans les deux sens. Navigation 22/07 : plus de
   liens inline — un burger 3 barres à tous les breakpoints (façon Qonto) qui
   ouvre un panneau plein écran ; tap ≥ 44px. */
/* Luminance relative, pour décider de la couleur du texte à partir du fond
   échantillonné. Seuil à 0,5 : au-dessus le fond est clair, texte noir. */
function estClair(rgb: string) {
  const m = rgb.match(/\d+(\.\d+)?/g);
  if (!m || m.length < 3) return false;
  const [r, v, b] = m.slice(0, 3).map((n) => parseFloat(n) / 255);
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
  const pathname = usePathname();
  const clair = fond ? estClair(fond) : false;

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
      const pile = document.elementsFromPoint(4, y) as HTMLElement[];
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

  /* changement de page depuis le panneau : on referme (le composant n'est pas
     démonté par la navigation client, le panneau resterait ouvert) */
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

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
           Sinon on avait une barre claire au-dessus d'un panneau sombre. */
        /* 30/07 — la couleur vient désormais du fond prélevé (style ci-
           dessous). `bg-panel` ne sert plus que de repli pour la toute
           première image, avant que la sonde ait tourné. */
        open || fond ? "" : "bg-panel"
      }`}
      style={{ backgroundColor: open ? "#09090b" : fond || undefined }}
    >
      <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-2 px-3 sm:h-[72px] sm:px-10">
        <Link href="/" className="flex shrink-0 items-center gap-2.5 py-3">
          {/* 31/07 — la marque de Teo, détourée depuis son fichier. Deux
              variantes plutôt qu'un SVG recolorable : le tracé est un
              entrelacs, pas une forme pleine, et le reconstruire à la main
              donnait un damier symétrique qui n'était pas le bon dessin.
              La variante suit le caméléon du header. */}
          <Image
            src={clair && !open ? "/logo-pegase.png" : "/logo-pegase-blanc.png"}
            alt=""
            width={96}
            height={96}
            priority
            className="h-[26px] w-[26px] shrink-0"
          />
          <span
            className={`text-[17px] font-semibold tracking-tight transition-colors duration-300 sm:text-[19px] ${
              clair && !open ? "text-[#0f1013]" : "text-white"
            }`}
          >
            Omega
          </span>
        </Link>
        <div className="flex items-center gap-2 sm:gap-4">
          {/* 30/07 — recalibré sur les boutons de la page (.o-btn : rayon 8,
              14 px medium, 34 px de haut). Le header portait du rayon 12 en
              15 px semibold : plus gros et plus rond que TOUT ce qu'il
              surplombe, d'où l'effet pastille. On garde 36 px de haut — deux
              pixels de plus que .o-btn — pour que la barre respire, et le
              rayon 10 fait la jonction entre les deux mondes. */}
          <Link
            href="/reserver-un-audit"
            className={`hidden h-9 items-center rounded-[10px] px-4 text-[14px] font-medium leading-none tracking-[-0.01em] transition-[background-color,transform] duration-200 active:scale-[0.97] md:inline-flex ${
              clair
                ? "bg-[#09090b] text-white hover:bg-[#27272a]"
                : "bg-white text-[#09090b] hover:bg-[#e4e4e7]"
            }`}
          >
            Audit gratuit
          </Link>
          {/* burger 2 barres — se croise en X à l'ouverture */}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="menu-principal"
            aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
            className={`group -mr-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] transition-colors duration-200 md:h-9 md:w-9 ${
              open
                ? "border border-white/25"
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
                    clair && !open ? "bg-[#0f1013]" : "bg-white"
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
        /* Toujours SOMBRE, quelle que soit la page derrière (25/07, Teo :
           « fais la même que le screen noir »). Le panneau n'est plus
           caméléon — seule la barre du header l'est encore, et elle bascule
           avec lui à l'ouverture. */
        className={`fixed inset-x-0 bottom-0 top-16 z-40 bg-[#09090b] sm:top-[72px] ${
          open ? "visible" : "invisible"
        }`}
      >
        {/* 26/07 — panneau recalibré sur la référence, relevée au pixel sur
            ocoya.com à 414 px de large : rangées de 46 px de pas, texte de
            corps (pas de titre), boutons de 35 px à rayon 8, 10 px entre les
            deux. Omega gardait un panneau nettement plus gros et plus gras
            (Teo, « regarde la taille des écritures, regarde la grosseur »).
            Seul écart assumé : 44 px de hauteur utile au lieu de 35/36 — la
            référence passe sous la cible tactile, pas nous. */}
        <nav className="mx-auto flex h-full max-w-[1440px] flex-col justify-start px-3 pt-4 sm:px-10 sm:pt-6">
          {NAV.map((l, i) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              tabIndex={open ? undefined : -1}
              /* L'opacité n'est JAMAIS animée à l'ouverture : si la
                 transition ne s'exécute pas (onglet en arrière-plan, rAF
                 throttlé), un lien resté à 0 serait un menu vide sur fond
                 opaque. Seule la montée est animée — figée, elle laisse un
                 décalage de 14 px, jamais du texte invisible. */
              style={{
                transition: "transform 0.32s cubic-bezier(0.16,1,0.3,1)",
                transitionDelay: open ? `${60 + i * 55}ms` : "0ms",
                opacity: open ? 1 : 0,
                transform: open ? "none" : "translateY(14px)",
              }}
              /* 16/17 px en graisse normale, et non 19/20 en medium : dans la
                 référence les entrées sont du texte courant, pas des titres.
                 La respiration vient du pas des rangées, jamais du corps. */
              className="flex h-11 items-center text-[16px] font-normal leading-[1.35] tracking-[-0.01em] text-white transition-colors hover:text-white/60 sm:text-[17px]"
            >
              {l.label}
            </Link>
          ))}
          <Link
            href="/reserver-un-audit"
            onClick={() => setOpen(false)}
            tabIndex={open ? undefined : -1}
            style={{
              transition: "transform 0.32s cubic-bezier(0.16,1,0.3,1)",
              transitionDelay: open ? `${60 + NAV.length * 55}ms` : "0ms",
              opacity: open ? 1 : 0,
              transform: open ? "none" : "translateY(14px)",
            }}
            className="mt-2.5 flex h-11 w-full items-center justify-center rounded-[8px] bg-white text-[15px] font-medium text-[#09090b] transition-colors hover:bg-neutral-200"
          >
            Audit gratuit
          </Link>
          {/* Second bouton, gris — la référence en a deux (Login / Try free).
              Omega n'a pas de compte utilisateur : la paire devient
              « Audit gratuit » (l'action principale) et « Nous contacter ».
              #27272a est le gris exact du « Try free » de la référence. */}
          <Link
            href="/reserver-un-audit"
            onClick={() => setOpen(false)}
            tabIndex={open ? undefined : -1}
            style={{
              transition: "transform 0.32s cubic-bezier(0.16,1,0.3,1)",
              transitionDelay: open ? `${60 + (NAV.length + 1) * 55}ms` : "0ms",
              opacity: open ? 1 : 0,
              transform: open ? "none" : "translateY(14px)",
            }}
            className="mt-2.5 flex h-11 w-full items-center justify-center rounded-[8px] bg-[#27272a] text-[15px] font-medium text-white transition-colors hover:bg-[#3f3f46]"
          >
            Nous contacter
          </Link>
        </nav>
      </div>
    </header>
  );
}
