"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { EVENEMENT_SESSION } from "@/lib/compte";
import { lienContact } from "@/lib/reservation";
import { sessionCookiePresente } from "@/lib/supabase/config";

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
  /* 03/08 — la galerie de vitrines sectorielles. Placée juste après les
     offres : c'est l'entrée que comprend un patron de petite entreprise qui ne sait pas
     encore ce qu'est un « moteur », et elle ramène vers l'audit. */
  { href: "/modeles", label: "Modèles de sites" },
  { href: "/integrations", label: "Intégrations" },
  /* 05/08 — la grille tarifaire. Placée après les intégrations : un patron
     qui a compris ce qu'est un paquet cherche le prix juste après, et
     jusqu'ici la seule réponse du site était « sur devis ». */
  { href: "/tarifs", label: "Tarifs" },
  /* 30/07 — « Articles » devient « Blog » : la page est refaite sur la
     référence blog.ocoya.com et vit désormais sous /blog (redirection 308
     depuis /articles dans next.config.ts). */
  { href: "/blog", label: "Blog" },
  /* 07/08 — « Où vont vos données ». En dernier, après le blog : ce n'est
     pas une étape du parcours commercial, c'est la page qu'on ouvre quand on
     est déjà convaincu et qu'il reste l'objection « et mes données ? ». Elle
     n'était qu'au pied de page — donc invisible au moment précis où cette
     objection se pose (Teo, 07/08 : « bah nan elle est pas dans la liste »). */
  { href: "/vos-donnees", label: "Où vont vos données" },
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

  /* 02/09 — le compte client. L'icône « personne » mène à /compte si une
     session est ouverte, à /connexion sinon.

     Revue 02/09 (n° 4) : la première version importait supabase-js ici —
     dans le layout racine, donc sur TOUTES les pages statiques (+252 ko,
     66 ko gzip, pour la home et le blog). Le header n'a pas besoin d'un
     jeton vérifié pour choisir un lien : il lit la PRÉSENCE du cookie de
     session (sb-<ref>-auth-token) dans document.cookie, sans bibliothèque.
     /connexion renvoie de toute façon vers /compte si la session est
     valide, et /compte vers /connexion si elle ne l'est pas — jamais
     d'impasse. Relecture : au changement de route, quand l'onglet revient
     au premier plan (une autre fenêtre a pu se connecter) et sur
     l'événement EVENEMENT_SESSION envoyé par le module de connexion
     inline (parcours installation) — la seule connexion sans navigation.
     Avant la première lecture on suppose « pas connecté ». */
  const [connecte, setConnecte] = useState(false);
  useEffect(() => {
    const relire = () => setConnecte(sessionCookiePresente());
    relire();
    window.addEventListener(EVENEMENT_SESSION, relire);
    window.addEventListener("focus", relire);
    document.addEventListener("visibilitychange", relire);
    return () => {
      window.removeEventListener(EVENEMENT_SESSION, relire);
      window.removeEventListener("focus", relire);
      document.removeEventListener("visibilitychange", relire);
    };
  }, [pathname]);
  const hrefCompte = connecte ? "/compte" : "/connexion";
  /* 02/09 (Teo) — « se connecter » seul laissait croire qu'il fallait déjà
     un compte : on nomme les deux. Connecté : « Mon compte », le nom de la
     page ouverte (revue n° 8 : un seul nom pour le même objet). */
  const libelleCompte = connecte ? "Mon compte" : "Se connecter ou créer un compte";

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
              La variante suit le caméléon du header. */}
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
            className={`hidden h-9 items-center rounded-[10px] border px-4 text-[14px] font-medium leading-none tracking-[-0.01em] transition-[background-color,border-color,transform] duration-200 active:scale-[0.97] md:inline-flex ${
              clairEff
                ? "border-[#09090b]/25 text-[#09090b] hover:border-[#09090b]/60 hover:bg-black/[0.05]"
                : "border-white/35 text-white hover:border-white/70 hover:bg-white/10"
            }`}
          >
            Commencer
          </Link>
          {/* 02/09 — l'icône compte : une personne dans un cercle, trait en
              currentColor, 20 px. Même gabarit de tap que le burger (44 px
              mobile, 36 desktop) et même caméléon : noir au-dessus d'une
              section claire ou du panneau ouvert, blanc sinon. */}
          <Link
            href={hrefCompte}
            aria-label={libelleCompte}
            title={libelleCompte}
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] transition-colors duration-200 md:h-9 md:w-9 ${
              clairEff ? "text-[#0f1013] hover:bg-black/[0.06]" : "text-white hover:bg-white/10"
            }`}
          >
            <svg
              aria-hidden
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="10" r="3.2" />
              <path d="M5.8 19.2c1.3-2.6 3.6-4 6.2-4s4.9 1.4 6.2 4" />
            </svg>
          </Link>
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
            className={`group -mr-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] transition-colors duration-200 md:h-9 md:w-9 ${
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
        className={`fixed inset-x-0 bottom-0 top-16 z-40 bg-white sm:top-[72px] ${
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
            d'entrées de NAV, les CTA restent collés au bas de l'écran, ce
            que la pile précédente ne savait pas faire. */}
        <nav className="mx-auto flex h-full max-w-[1440px] flex-col px-3 sm:px-10">
          <div className="min-h-0 flex-1 overflow-y-auto pt-7 sm:pt-9">
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
                /* Texte courant, jamais un titre : la référence garde une
                   graisse normale et fait respirer par le PAS des rangées
                   (48 px pour 18 px de corps), pas par le gras. */
                className="flex h-12 items-center text-[18px] font-normal leading-[1.3] tracking-[-0.015em] text-[#0f1013] transition-colors hover:text-[#0f1013]/55 sm:text-[19px]"
              >
                {l.label}
              </Link>
            ))}
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
                02/09 — le compte existe : « Se connecter ou créer un
                compte » / « Mon compte » revient en tête de pile, en pilule
                grise comme le contact. */}
            <Link
              href={hrefCompte}
              onClick={() => setOpen(false)}
              tabIndex={open ? undefined : -1}
              style={{
                transition: "transform 0.32s cubic-bezier(0.16,1,0.3,1)",
                transitionDelay: open ? `${60 + NAV.length * 55}ms` : "0ms",
                opacity: open ? 1 : 0,
                transform: open ? "none" : "translateY(14px)",
              }}
              className="flex h-[52px] w-full items-center justify-center rounded-full border border-black/[0.07] bg-[#f5f5f4] text-[15px] font-medium tracking-[-0.01em] text-[#0f1013] transition-colors hover:bg-[#ebebe9]"
            >
              {libelleCompte}
            </Link>
            <a
              href={lienContact("Bonjour Omega — je vous écris depuis le site.")}
              onClick={() => setOpen(false)}
              tabIndex={open ? undefined : -1}
              style={{
                transition: "transform 0.32s cubic-bezier(0.16,1,0.3,1)",
                transitionDelay: open ? `${60 + (NAV.length + 1) * 55}ms` : "0ms",
                opacity: open ? 1 : 0,
                transform: open ? "none" : "translateY(14px)",
              }}
              className="mt-2.5 flex h-[52px] w-full items-center justify-center rounded-full border border-black/[0.07] bg-[#f5f5f4] text-[15px] font-medium tracking-[-0.01em] text-[#0f1013] transition-colors hover:bg-[#ebebe9]"
            >
              Nous contacter
            </a>
            <Link
              href="/commencer"
              onClick={() => setOpen(false)}
              tabIndex={open ? undefined : -1}
              style={{
                transition: "transform 0.32s cubic-bezier(0.16,1,0.3,1)",
                transitionDelay: open
                  ? `${60 + (NAV.length + 2) * 55}ms`
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
