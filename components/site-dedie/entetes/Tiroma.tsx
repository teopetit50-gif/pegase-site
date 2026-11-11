"use client";
/* ══════════════════════════════════════════════════════════════════════
   La barre du site Tiroma — le « Header 01 » d'Eldora UI (11/11/2026)

   La première barre (fond blanc, filets en pointillé des jetons tir-*,
   bouton pilule) décalquait la page. Teo : « pour Tiroma j'aime pas du
   tout la barre du haut, change-la, trouve-en une autre ». Celle-ci est le
   port du bloc `eldoraui/header-01` de la bibliothèque (composants/
   navigation/eldoraui__header-01) : une barre FLOTTANTE, large de 70rem en
   haut de page, qui se resserre à 800px, prend un filet, un fond
   translucide et un flou dès qu'on a défilé de 10px ; au centre, les
   entrées dans une pilule dont le surligneur GLISSE sur la section visible
   (ressort motion) ; à droite le bouton ; sous md, un tiroir qui monte du
   bas de l'écran avec l'ombre d'un voile.

   Ce qui change : les entrées sont les sections de la page (démo,
   parcours, écrans, formules) + le bouton vers #audit ; le bouton cyan de
   la source devient le noir de la page (tir-foreground) ; la bascule de
   thème ne vient pas (la page n'a pas de sombre) ; le logo est le lockup
   seul (il porte déjà le signe : l'ancienne barre le doublait) ; jetons
   tir-* (globals.css) ; le défilement doux est celui de LienSection
   (communs.tsx), qui tient compte de /#id.
   ══════════════════════════════════════════════════════════════════════ */
import Link from "next/link";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { Menu, X } from "lucide-react";
import { AnimatePresence, motion, useScroll } from "motion/react";
import { Lockup, allerALaSection, type Entree } from "./communs";

const ENTREES: Entree[] = [
  { label: "La démo", id: "demo" },
  { label: "Le parcours", id: "workflow" },
  { label: "Les écrans", id: "screenshots" },
  { label: "Formules", id: "pricing" },
];
const CTA = { label: "Réserver un audit", id: "audit" };
const IDS = ENTREES.map((e) => e.id);

const LARGEUR_HAUT = "70rem";
const LARGEUR_DEFILE = "800px";

/* sans `inline-flex` : l'appelant pose l'affichage (caché sous md à droite de la barre, pleine largeur dans le tiroir) */
const BOUTON =
  "h-8 items-center justify-center rounded-full bg-tir-foreground px-4 text-sm font-medium text-tir-background transition-opacity hover:opacity-90";

function Accueil() {
  return (
    <Link
      href="/"
      aria-label="Tiroma, accueil"
      className="flex items-center text-tir-foreground"
    >
      <Lockup
        src="/logos/tiroma-lockup.png"
        ratio="1200 / 231"
        className="h-[22px]"
        label="Tiroma"
      />
    </Link>
  );
}

/* la section visible : celle dont le haut est passé sous la barre, la dernière en date */
function useSectionVisible(ids: string[]) {
  const [active, setActive] = useState(ids[0]);
  useEffect(() => {
    const lire = () => {
      let proche = ids[0];
      let distance = Infinity;
      for (const id of ids) {
        const el = document.getElementById(id);
        if (!el) continue;
        const d = Math.abs(el.getBoundingClientRect().top - 100);
        if (d < distance) {
          distance = d;
          proche = id;
        }
      }
      setActive(proche);
    };
    window.addEventListener("scroll", lire, { passive: true });
    lire();
    return () => window.removeEventListener("scroll", lire);
  }, [ids]);
  return [active, setActive] as const;
}

export default function BarreTiroma() {
  const { scrollY } = useScroll();
  const [defile, setDefile] = useState(false);
  const [ouvert, setOuvert] = useState(false);
  const [active, setActive] = useSectionVisible(IDS);

  useEffect(() => scrollY.on("change", (y) => setDefile(y > 10)), [scrollY]);

  /* le surligneur de la pilule : position et largeur de l'entrée active */
  const liste = useRef<HTMLUListElement>(null);
  const [surligneur, setSurligneur] = useState<{
    left: number;
    width: number;
  } | null>(null);
  useEffect(() => {
    const el = liste.current?.querySelector<HTMLElement>(
      `[data-id="${active}"]`,
    );
    if (el) setSurligneur({ left: el.offsetLeft, width: el.offsetWidth });
  }, [active, defile]);

  const aller = (e: MouseEvent<HTMLAnchorElement>, id: string) => {
    setActive(id);
    setOuvert(false);
    allerALaSection(e, id);
  };

  return (
    <>
      {/* la barre est fixée, pas collante : collante, elle gardait sa place en haut du flux, un bandeau du fond
          sombre du site au-dessus de la page blanche. Cette cale blanche rend au héros la hauteur de l'ancienne barre. */}
      <div aria-hidden className="h-[68px] w-full bg-tir-background" />
      <header
        className={`fixed inset-x-0 z-50 mx-4 flex justify-center transition-all duration-300 md:mx-0 ${defile ? "top-4" : "top-3 mx-0"}`}
        style={{ viewTransitionName: "site-header" }}
      >
        <motion.div
          initial={{ width: LARGEUR_HAUT }}
          animate={{ width: defile ? LARGEUR_DEFILE : LARGEUR_HAUT }}
          transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
          className="max-w-full"
        >
          <div
            className={`mx-auto max-w-7xl rounded-2xl transition-all duration-300 ${
              defile
                ? "border border-tir-border bg-tir-background/75 px-2 backdrop-blur-lg"
                : "px-2 md:px-7"
            }`}
          >
            <div className="flex h-14 items-center justify-between p-4">
              <Accueil />

              <nav aria-label="Principal" className="hidden md:block">
                <ul
                  ref={liste}
                  className="relative mx-auto flex h-11 w-fit items-center justify-center rounded-full px-2"
                >
                  {ENTREES.map((l) => (
                    <li
                      key={l.id}
                      data-id={l.id}
                      className={`z-10 flex h-full items-center justify-center px-4 py-2 text-sm font-medium tracking-tight transition-colors duration-200 ${
                        active === l.id
                          ? "text-tir-foreground"
                          : "text-tir-foreground/60 hover:text-tir-foreground"
                      }`}
                    >
                      <a href={`/#${l.id}`} onClick={(e) => aller(e, l.id)}>
                        {l.label}
                      </a>
                    </li>
                  ))}
                  {surligneur ? (
                    <motion.li
                      aria-hidden
                      animate={surligneur}
                      transition={{
                        type: "spring",
                        stiffness: 400,
                        damping: 30,
                      }}
                      className="absolute inset-0 my-1.5 rounded-full border border-tir-border bg-tir-muted/60"
                    />
                  ) : null}
                </ul>
              </nav>

              <div className="flex shrink-0 items-center gap-1 md:gap-3">
                <a
                  href={`/#${CTA.id}`}
                  onClick={(e) => aller(e, CTA.id)}
                  className={`${BOUTON} hidden md:inline-flex`}
                >
                  {CTA.label}
                </a>
                <button
                  type="button"
                  aria-label={ouvert ? "Fermer le menu" : "Ouvrir le menu"}
                  aria-expanded={ouvert}
                  className="flex size-8 items-center justify-center rounded-md border border-tir-border text-tir-foreground md:hidden"
                  onClick={() => setOuvert((o) => !o)}
                >
                  {ouvert ? (
                    <X className="size-5" />
                  ) : (
                    <Menu className="size-5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ——— le tiroir mobile, qui monte du bas ——— */}
        <AnimatePresence>
          {ouvert ? (
            <>
              <motion.div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={() => setOuvert(false)}
              />
              <motion.div
                className="fixed inset-x-0 bottom-3 mx-auto w-[95%] rounded-xl border border-tir-border bg-tir-background p-4 shadow-lg"
                initial={{ opacity: 0, y: 100 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  transition: { type: "spring", damping: 15, stiffness: 200 },
                }}
                exit={{ opacity: 0, y: 100, transition: { duration: 0.1 } }}
              >
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <Accueil />
                    <button
                      type="button"
                      aria-label="Fermer le menu"
                      onClick={() => setOuvert(false)}
                      className="rounded-md border border-tir-border p-1 text-tir-foreground"
                    >
                      <X className="size-5" />
                    </button>
                  </div>
                  <ul className="flex flex-col rounded-md border border-tir-border text-sm">
                    {ENTREES.map((l) => (
                      <li
                        key={l.id}
                        className="border-b border-tir-border p-2.5 last:border-b-0"
                      >
                        <a
                          href={`/#${l.id}`}
                          onClick={(e) => aller(e, l.id)}
                          className={`transition-colors ${active === l.id ? "font-medium text-tir-foreground" : "text-tir-foreground/60"}`}
                        >
                          {l.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                  <a
                    href={`/#${CTA.id}`}
                    onClick={(e) => aller(e, CTA.id)}
                    className={`${BOUTON} inline-flex w-full`}
                  >
                    {CTA.label}
                  </a>
                </div>
              </motion.div>
            </>
          ) : null}
        </AnimatePresence>
      </header>
    </>
  );
}
