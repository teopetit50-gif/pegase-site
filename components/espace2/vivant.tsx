"use client";

/* Ce qui rend les pages principales vivantes (08/10/2026, demande de Teo :
   « il est full blanc et blanc ») — sans changer le code couleur :
   · Chiffre : un montant ou un nombre qui défile jusqu'à sa valeur ;
   · EnDirect : la pastille qui pulse quand la base réelle est affichée ;
   · IconeModule : l'icône d'un module dans son petit carré de couleur,
     comme les objets d'Attio — la seule couleur, pour se repérer ;
   · Initiales : une personne ou un fournisseur, en pastille ronde.
   Le mouvement s'arrête net si l'appareil ou l'espace le demande
   (prefers-reduced-motion, « Réduire les animations »). */

import { useEffect, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { useSource } from "@/components/espace/source";

const calme = () =>
  typeof window === "undefined" ||
  window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
  document.documentElement.classList.contains("v2-calme");

/** « 2 834,20 € », « 8 », « 75 % » : le premier nombre défile, le reste ne bouge pas. */
export function Chiffre({ valeur, duree = 900 }: { valeur: string; duree?: number }) {
  const m = valeur.match(/-?\d[\d\s ]*(?:,\d+)?/);
  const cible = m ? Number(m[0].replace(/[\s ]/g, "").replace(",", ".")) : NaN;
  const decimales = m && m[0].includes(",") ? m[0].split(",")[1].length : 0;
  const [v, setV] = useState<number | null>(null);
  const deja = useRef<string | null>(null);

  useEffect(() => {
    if (Number.isNaN(cible) || deja.current === valeur || calme()) return;
    deja.current = valeur;
    let raf = 0;
    const debut = performance.now();
    const pas = (t: number) => {
      const p = Math.min(1, (t - debut) / duree);
      const e = 1 - Math.pow(1 - p, 3);
      setV(cible * e);
      if (p < 1) raf = requestAnimationFrame(pas);
      else setV(null);
    };
    raf = requestAnimationFrame(pas);
    return () => cancelAnimationFrame(raf);
  }, [valeur, cible, duree]);

  if (v === null || !m) return <>{valeur}</>;
  const texte = v.toLocaleString("fr-FR", { minimumFractionDigits: decimales, maximumFractionDigits: decimales });
  return (
    <span className="v2-chiffre" aria-label={valeur}>
      {valeur.slice(0, m.index)}
      {texte}
      {valeur.slice((m.index ?? 0) + m[0].length)}
    </span>
  );
}

/** « En direct » qui pulse sur la base réelle ; « Exemple » sinon — honnête. */
export function EnDirect() {
  const { source } = useSource();
  return source === "reelle" ? (
    <span className="v2-direct" title="Les nouveautés arrivent sans recharger la page">
      <i aria-hidden="true" /> En direct
    </span>
  ) : (
    <span className="v2-direct" data-exemple="" title="Données d'exemple">
      <i aria-hidden="true" /> Exemple
    </span>
  );
}

/* (gardé pour mémoire, plus affiché) */
export const TEINTES_MODULE: Record<string, string> = {
  filed: "#3b82f6",
  cashd: "#10b981",
  reput: "#8b5cf6",
  offload: "#f97316",
  daliro: "#eab308",
  tavaro: "#06b6d4",
  lorani: "#ec4899",
  tiroma: "#14b8a6",
  tamila: "#6366f1",
  varelo: "#64748b",
};

/* 08/10 — Teo n'a pas voulu des carrés de couleur : l'icône reste la
   ligne d'origine ; la seule couleur d'accent est le bleu de la courbe. */
export function IconeModule({ icone: Icone, taille = 18 }: { cle?: string | null; icone: LucideIcon; taille?: number }) {
  return <Icone width={taille} height={taille} aria-hidden="true" />;
}

/** « Sofia Carvalho » → « SC », dans une pastille ronde à peine teintée (trois gris). */
export function Initiales({ nom, taille = 28 }: { nom: string; taille?: number }) {
  const mots = nom
    .replace(/^(SCI|SARL|SAS|M\.|Mme|Mairie de|Hôtel des|Hôtel de la|Hôtel)\s+/i, "")
    .split(/[\s,·—-]+/)
    .filter(Boolean);
  const ini = (mots[0]?.[0] ?? "?") + (mots[1]?.[0] ?? "");
  const n = [...nom].reduce((s, c) => s + c.charCodeAt(0), 0) % 3;
  return (
    <span className="v2-initiales" data-n={n} style={{ width: taille, height: taille, fontSize: Math.round(taille * 0.38) }} aria-hidden="true">
      {ini.toUpperCase()}
    </span>
  );
}
