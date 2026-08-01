"use client";

/* « Le parcours, étape par étape » — carrousel façon Qonto (25/07, Teo :
   « la sorte de barre qui avance et passe au prochain slide, que quand on
   slide ça passe de 1 à 2 puis à 3 »).

   Ce que reprend le geste Qonto : des cartes qui défilent horizontalement,
   une rangée d'indicateurs sous le rail où l'actif est une JAUGE qui se
   remplit, et un bouton pause/lecture à droite. Quand la jauge est pleine,
   on passe à la carte suivante.

   Trois partis pris de fabrication :

   — LE DÉFILEMENT EST NATIF (scroll-snap), pas un translateX piloté au
     doigt. On hérite gratuitement du swipe tactile, de l'inertie système,
     du trackpad et de la molette horizontale — et le composant reste juste
     si JS tombe : les cartes restent lisibles et scrollables.

   — L'AVANCE AUTOMATIQUE EST PORTÉE PAR L'ANIMATION CSS de la jauge, pas
     par un setInterval. La barre visible EST le minuteur : impossible que
     l'une avance sans l'autre. Pause = animation-play-state, donc la reprise
     repart d'où on s'est arrêté, sans compteur à tenir à jour.

   — UNE CALE EN FIN DE RAIL, mesurée en JS. Sans elle, la dernière carte ne
     peut jamais s'aligner à gauche (le rail bute avant), l'indicateur reste
     bloqué sur l'avant-dernier et le carrousel a l'air cassé. Sa largeur
     dépend de celle des cartes, donc du point de rupture : elle est mesurée
     au montage et à chaque redimensionnement plutôt qu'écrite en dur.

   PAS de [data-reveal] ici — comme le reste de ServiceDetail, le bloc est
   injecté au changement d'onglet et ScrollTrigger ne le capterait pas : il
   resterait invisible. Le contenu est opaque d'emblée. */

import { useCallback, useEffect, useRef, useState } from "react";

type Etape = { t: string; d: string };

/* Durée d'une carte à l'écran. 6,5 s : le temps de lire 3 lignes sans avoir
   à courir, mais assez court pour qu'on voie la jauge bouger. */
const DUREE = 6500;

export default function ParcoursSlider({ etapes }: { etapes: Etape[] }) {
  const rail = useRef<HTMLOListElement>(null);
  const racine = useRef<HTMLDivElement>(null);
  /* index visé par un défilement programmé : tant qu'il n'est pas atteint,
     les positions intermédiaires du scroll fluide ne pilotent pas l'état
     (sinon la jauge se relancerait à chaque frame du trajet) */
  const vise = useRef<number | null>(null);
  const raf = useRef(0);

  const [i, setI] = useState(0);
  const [lecture, setLecture] = useState(true);
  const [survol, setSurvol] = useState(false);
  const [visible, setVisible] = useState(true);
  const [motion, setMotion] = useState(true);
  const [cale, setCale] = useState(0);

  const total = etapes.length;
  const enCours = lecture && !survol && visible && motion;

  /* mouvement réduit : ni défilement fluide, ni avance automatique */
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const lire = () => {
      setMotion(!mq.matches);
      if (mq.matches) setLecture(false);
    };
    lire();
    mq.addEventListener("change", lire);
    return () => mq.removeEventListener("change", lire);
  }, []);

  /* le carrousel ne tourne pas hors écran */
  useEffect(() => {
    const el = racine.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([e]) => setVisible(e.isIntersecting),
      { threshold: 0.25 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  /* largeur de la cale = ce qui manque à la dernière carte pour venir
     s'aligner à gauche du rail */
  useEffect(() => {
    const p = rail.current;
    if (!p) return;
    const mesurer = () => {
      const cartes = p.querySelectorAll<HTMLElement>("[data-carte]");
      const last = cartes[cartes.length - 1];
      if (!last) return;
      const pl = parseFloat(getComputedStyle(p).paddingLeft) || 0;
      const pr = parseFloat(getComputedStyle(p).paddingRight) || 0;
      const dispo = p.clientWidth - pl - pr;
      setCale(Math.max(0, Math.round(dispo - last.offsetWidth)));
    };
    mesurer();
    const ro = new ResizeObserver(mesurer);
    ro.observe(p);
    return () => ro.disconnect();
  }, [total]);

  const allerA = useCallback(
    (n: number) => {
      const p = rail.current;
      if (!p) return;
      const el = p.querySelectorAll<HTMLElement>("[data-carte]")[n];
      if (!el) return;
      const pl = parseFloat(getComputedStyle(p).paddingLeft) || 0;
      const dx =
        el.getBoundingClientRect().left - (p.getBoundingClientRect().left + pl);
      vise.current = n;
      window.setTimeout(() => {
        if (vise.current === n) vise.current = null;
      }, 1200);
      p.scrollTo({ left: p.scrollLeft + dx, behavior: motion ? "smooth" : "auto" });
    },
    [motion]
  );

  const versEtape = useCallback(
    (n: number) => {
      setI(n);
      allerA(n);
    },
    [allerA]
  );

  /* index déduit de la position réelle du rail — c'est ce qui fait que le
     swipe manuel déplace bien l'indicateur */
  const onScroll = useCallback(() => {
    if (raf.current) return;
    raf.current = requestAnimationFrame(() => {
      raf.current = 0;
      const p = rail.current;
      if (!p) return;
      const cartes = Array.from(p.querySelectorAll<HTMLElement>("[data-carte]"));
      if (!cartes.length) return;
      const pl = parseFloat(getComputedStyle(p).paddingLeft) || 0;
      const ref = p.getBoundingClientRect().left + pl;
      let best = 0;
      let ecart = Infinity;
      cartes.forEach((c, n) => {
        const d = Math.abs(c.getBoundingClientRect().left - ref);
        if (d < ecart) {
          ecart = d;
          best = n;
        }
      });
      /* bout de course : la dernière carte peut rester à droite de la
         référence, on la déclare active dès qu'on ne peut plus avancer */
      if (p.scrollLeft >= p.scrollWidth - p.clientWidth - 2) best = cartes.length - 1;
      if (vise.current !== null && best !== vise.current) return;
      vise.current = null;
      setI((prev) => (prev === best ? prev : best));
    });
  }, []);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const suivante = () => versEtape((i + 1) % total);

  return (
    <div ref={racine} className="mt-10">
      {/* ——— rail ———
          Débordé jusqu'aux bords de la colonne (-mx) pour que les cartes
          entrent et sortent du champ au lieu de s'arrêter dans une marge,
          puis re-padé (px) pour que la carte active reste alignée sur le
          texte de la section. */}
      <ol
        ref={rail}
        onScroll={onScroll}
        onPointerEnter={() => setSurvol(true)}
        onPointerLeave={() => setSurvol(false)}
        aria-label="Les étapes du parcours"
        className="-mx-6 flex snap-x snap-mandatory items-stretch gap-4 overflow-x-auto scroll-smooth px-6 pb-2 [-ms-overflow-style:none] [scrollbar-width:none] sm:-mx-10 sm:gap-6 sm:px-10 [&::-webkit-scrollbar]:hidden"
      >
        {etapes.map((e, n) => (
          <li
            key={e.t}
            data-carte
            aria-label={`Étape ${n + 1} sur ${total}`}
            className="carte-claire relative flex w-[86%] shrink-0 snap-start flex-col overflow-hidden rounded-[var(--radius-card)] p-7 sm:w-[64%] sm:p-9 lg:w-[46%] xl:w-[42%]"
          >
            {/* chiffre fantôme : de la texture, pas de l'information —
                l'ordre reste porté par la pastille et par « Étape n sur N » */}
            <span
              aria-hidden
              className="pointer-events-none absolute -bottom-10 -right-2 select-none text-[160px] font-bold leading-none tracking-[-0.06em] text-[rgba(15,16,19,0.045)]"
            >
              {String(n + 1).padStart(2, "0")}
            </span>

            <div className="relative flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#0f1013] text-[14px] font-semibold tabular-nums text-white">
                {String(n + 1).padStart(2, "0")}
              </span>
              <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-black/45">
                Étape {n + 1} sur {total}
              </span>
            </div>

            <h4 className="relative mt-6 text-[20px] font-semibold tracking-[-0.02em] text-[#0f1013] sm:text-[23px]">
              {e.t}
            </h4>
            <p className="relative mt-3 text-[15px] leading-[1.8] text-[#52555c] sm:text-[16px]">
              {e.d}
            </p>
          </li>
        ))}
        {/* cale de fin — voir en-tête */}
        <li aria-hidden className="shrink-0" style={{ width: cale }} />
      </ol>

      {/* ——— indicateurs + pause (le bandeau de commande Qonto) ——— */}
      <div className="mt-8 flex items-center justify-center gap-1">
        {etapes.map((e, n) => {
          const actif = n === i;
          return (
            <button
              key={e.t}
              type="button"
              onClick={() => versEtape(n)}
              aria-label={`Aller à l'étape ${n + 1} : ${e.t}`}
              aria-current={actif}
              className="group p-2"
            >
              {actif ? (
                <span className="block h-1.5 w-14 overflow-hidden rounded-full bg-[rgba(15,16,19,0.14)]">
                  {/* La jauge EST le minuteur : sa fin déclenche la carte
                      suivante. key={i} pour qu'elle reparte de zéro à chaque
                      changement, y compris quand il vient d'un swipe. */}
                  <span
                    key={i}
                    onAnimationEnd={suivante}
                    className="block h-full w-full origin-left rounded-full bg-[#0f1013]"
                    style={
                      motion
                        ? {
                            animation: `jauge-carrousel ${DUREE}ms linear forwards`,
                            animationPlayState: enCours ? "running" : "paused",
                          }
                        : undefined
                    }
                  />
                </span>
              ) : (
                <span className="block h-1.5 w-1.5 rounded-full bg-[rgba(15,16,19,0.22)] transition group-hover:bg-[rgba(15,16,19,0.5)]" />
              )}
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => setLecture((v) => !v)}
          aria-label={lecture ? "Mettre le défilement en pause" : "Lancer le défilement"}
          className="ml-3 grid h-9 w-9 place-items-center rounded-full border border-black/10 bg-white text-[#0f1013] transition hover:border-black/30"
        >
          {lecture ? (
            <svg width="11" height="12" viewBox="0 0 11 12" aria-hidden>
              <rect x="0" y="0" width="3.5" height="12" rx="1.2" fill="currentColor" />
              <rect x="7.5" y="0" width="3.5" height="12" rx="1.2" fill="currentColor" />
            </svg>
          ) : (
            <svg width="11" height="12" viewBox="0 0 11 12" aria-hidden>
              <path d="M1 0.8 L10.4 6 L1 11.2 Z" fill="currentColor" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
