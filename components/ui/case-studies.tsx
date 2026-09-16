"use client";

import dynamic from "next/dynamic";
import { useSyncExternalStore, type ReactNode } from "react";

/* Chargé côté client seulement : react-countup lit le défilement au montage
   et ferait diverger le rendu serveur du rendu client. */
const CountUp = dynamic(() => import("react-countup"), { ssr: false });

/* ══════════════════════════════════════════════════════════════════════
   Casestudies — repris de 21st.dev le 16/09/2026 à la demande de Teo.

   La fiche d'origine est un bloc d'ÉTUDES DE CAS : par ligne, le portrait
   d'une personne nommée, sa citation, son poste, et deux compteurs de
   performance animés (« 40 % Faster Delivery », « 95 % Developer
   Satisfaction »).

   RIEN DE TOUT ÇA NE PEUT PARTIR EN LIGNE CHEZ NOUS. Le site n'a pas de
   client à nommer, et un avis nominatif inventé sur un site commercial est
   une pratique commerciale trompeuse (Code de la consommation L.121-2,
   directive Omnibus) — c'est écrit en capitales en tête de
   lib/temoignages.ts, et c'est pour cette raison que les trois tableaux y
   sont vides. Les compteurs tombent sous la même règle : la maison
   n'affiche aucun chiffre de traction inventé.

   Le composant est donc recopié TEL QUEL dans sa mécanique — grille,
   alternance gauche/droite, filets, compteurs animés, respect de
   `prefers-reduced-motion` — avec DEUX ajouts :

   · `cas` : les lignes deviennent une propriété. Sans elle, le composant
     rend les trois études de la fiche, à l'identique ; avec elle, il rend
     les nôtres. Aucune page publique ne doit utiliser la valeur par
     défaut.
   · `visuel` : à la place du portrait, n'importe quel nœud React. Chez
     nous ce sont les croquis au trait de la page, pas une personne.

   Et `parseMetricValue` a une porte de sortie utile qu'on exploite : une
   valeur non numérique (« Jours », « Tous ») est rendue telle quelle, sans
   compteur. Les faits qui ne sont pas des quantités n'ont donc pas à être
   travestis en chiffres.
   ══════════════════════════════════════════════════════════════════════ */

/** Respecte la préférence de mouvement réduit.
 *  La fiche d'origine tenait ça dans un `useState` + `useEffect` qui
 *  appelait `setState` dès le montage ; le compilateur React du dépôt le
 *  refuse (« cascading renders »). `useSyncExternalStore` dit la même
 *  chose sans rendu supplémentaire, et rend `false` au serveur — donc pas
 *  de divergence d'hydratation. */
const mqReduit = () =>
  typeof window !== "undefined" && "matchMedia" in window
    ? window.matchMedia("(prefers-reduced-motion: reduce)")
    : null;

function usePrefersReducedMotion() {
  return useSyncExternalStore(
    (onChange) => {
      const mq = mqReduit();
      mq?.addEventListener?.("change", onChange);
      return () => mq?.removeEventListener?.("change", onChange);
    },
    () => mqReduit()?.matches ?? false,
    () => false,
  );
}

/** Découpe une mesure du type « 98% », « 3.8x », « 1 200+ », « €23.4k ».
 *  Ce qui ne correspond pas est rendu tel quel, sans compteur. */
function parseMetricValue(raw: string) {
  const value = (raw ?? "").toString().trim();
  const m = value.match(/^([^\d\-+]*?)\s*([\-+]?\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*([^\d\s]*)$/);
  if (!m) {
    return { prefix: "", end: 0, suffix: value, decimals: 0, brut: true };
  }
  const [, prefix, num, suffix] = m;
  const normalized = num.replace(/,/g, "");
  const end = parseFloat(normalized);
  const decimals = normalized.split(".")[1]?.length ?? 0;
  return {
    prefix: prefix ?? "",
    end: isNaN(end) ? 0 : end,
    suffix: suffix ?? "",
    decimals,
    brut: false,
  };
}

export type Mesure = { value: string; label: string; sub?: string };

export type Cas = {
  id: string | number;
  /** le visuel de gauche — chez nous un croquis, chez eux un portrait */
  visuel: ReactNode;
  /** l'intitulé en gras au-dessus du texte */
  titre: string;
  /** le corps, en gris sous l'intitulé */
  texte: string;
  /** la légende sous le bloc : chez nous une NATURE, jamais une personne */
  legende: string;
  sousLegende?: string;
  mesures: Mesure[];
};

/** Une mesure animée. */
function MetricStat({
  value,
  label,
  sub,
  duration = 1.6,
}: Mesure & { duration?: number }) {
  const reduceMotion = usePrefersReducedMotion();
  const { prefix, end, suffix, decimals, brut } = parseMetricValue(value);

  /* SEUIL D'ANIMATION — ajout du 16/09, après l'avoir vu à l'écran.
     `enableScrollSpy` laisse le compteur à ZÉRO tant que le bloc n'est pas
     entré dans la fenêtre. Sur les grands nombres de la fiche d'origine
     (40 %, 95 %) ça ne se remarque pas ; sur les nôtres, « 1 Application »
     s'affichait « 0 Application » — un chiffre FAUX, pas une animation en
     attente. Et compter de 0 à 2 en 1,6 s n'apporte rien de toute façon.
     En dessous de dix, la valeur est donc écrite, point. */
  const anime = !brut && !reduceMotion && end >= 10;

  return (
    <div className="cs-mesure">
      <p className="cs-mesure__valeur" aria-label={`${label} ${value}`}>
        {prefix}
        {!anime ? (
          <span>
            {brut
              ? suffix
              : end.toLocaleString(undefined, {
                  minimumFractionDigits: decimals,
                  maximumFractionDigits: decimals,
                })}
          </span>
        ) : (
          <>
            <CountUp
              end={end}
              decimals={decimals}
              duration={duration}
              separator=" "
              enableScrollSpy
              scrollSpyOnce
            />
            {suffix}
          </>
        )}
      </p>
      <p className="cs-mesure__label">{label}</p>
      {sub ? <p className="cs-mesure__sous">{sub}</p> : null}
    </div>
  );
}

export default function Casestudies({ cas }: { cas: Cas[] }) {
  return (
    <div className="cs-lignes">
      {cas.map((c, idx) => {
        const inverse = idx % 2 === 1;
        return (
          <div key={c.id} className={`cs-ligne${inverse ? " cs-ligne--inverse" : ""}`}>
            <div className="cs-ligne__gauche">
              <div className="cs-visuel">{c.visuel}</div>
              <figure className="cs-propos">
                <div className="cs-propos__texte">
                  <h4 className="cs-titre">{c.titre}</h4>
                  <p className="cs-corps">{c.texte}</p>
                </div>
                <figcaption className="cs-legende">
                  <span className="cs-legende__nom">{c.legende}</span>
                  {c.sousLegende ? (
                    <span className="cs-legende__role">{c.sousLegende}</span>
                  ) : null}
                </figcaption>
              </figure>
            </div>

            <div className="cs-mesures">
              {c.mesures.map((m, i) => (
                <MetricStat key={`${c.id}-${i}`} {...m} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
