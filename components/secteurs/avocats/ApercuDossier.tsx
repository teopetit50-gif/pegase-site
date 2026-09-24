"use client";
/* ══════════════════════════════════════════════════════════════════════
   Tamila (cabinets d'avocats) — ApercuDossier.tsx

   COPIÉ le 24/09/2026 à 13 h 37 de `OMEGA/cabinetos-site/src/components/
   apercu-dossier.tsx`. Même écran, même composition à 1611 × 1298 mise à
   l'échelle du cadre, mêmes données d'exemple. Seules les couleurs changent.

   MONDE BLANC — L'ÉCRAN PRODUIT PASSE EN THÈME CLAIR, en entier. Teo
   refuse une page claire où traîne une maquette noire. La source dessinait
   une application sombre (#0c0c0f, textes zinc, filets en blanc à 6-15 %) ;
   c'est ici la même application dans son thème clair. La règle suivie,
   pour que la hiérarchie tienne :
     fond #0c0c0f → #ffffff · filets et fonds « blanc à N % » → « noir à
     N % » (un cran de plus quand le blanc à N % découpait mieux : 7 → 8 %,
     6 → 7 %) · titres `text-white` et `zinc-100` → zinc-900 · `zinc-200` →
     800 · `zinc-300` → 700 (le texte courant) · `zinc-400` → 600 ·
     `zinc-500` reste 500 (le gris moyen se lit sur les deux fonds) ·
     `zinc-600` (le plus effacé) → 400.
   L'élément actif du menu s'ÉCLAIRCISSAIT sur le noir (blanc à 7 %) ; il
   fonce sur le blanc (noir à 5 %) : le geste, pas la valeur.
   Étiquettes : rose-300 / ambre-200 sur voile à 10 % (lisibles sur le
   noir, illisibles sur le blanc) → rose-600 / ambre-700 sur rose-50 /
   ambre-50, les teintes « étiquette » d'un thème clair.
   Courbe : le violet #9e77ed de la référence se garde (il tient sur les
   deux fonds) ; son chiffre d'accent #b692f6 → #7f56d9 (le 600 de la même
   gamme), la bulle #1c1c21 → blanche filetée, le cœur du point → blanc,
   les lignes de grille blanc 6 % → encre 7 %.
   Feux de la fenêtre : inchangés.

   AUTRES : `font-base` / `font-heading` (Inter, Satoshi) → classes
   `avocats-texte` / `avocats-titre` (polices du site, avocats.css) ;
   `rounded-lg` / `rounded-md` → 0,6 rem / 0,6 rem − 2 px (le `--radius`
   de la source) ; identifiants SVG `hachure`, `aire` préfixés `avocats-`
   (un identifiant est global au document, et cette page vit désormais
   dans un site de trente pages).
   ══════════════════════════════════════════════════════════════════════ */

import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle, BookOpen, CalendarDays, Clock, FileCheck2, FileText, Files, Filter, GitCompare,
  History, Inbox, LayoutDashboard, LifeBuoy, MoreVertical, Scale, Search, Settings, Users, ArrowDown, ArrowLeft, ArrowRight,
} from "lucide-react";
import { Glyphe } from "./marque";

/* L'écran produit du héros. La référence y pose une capture PNG d'un tableau de bord tiers (3222 × 2596) ;
   on ne recopie pas cet actif : l'écran est dessiné ici, à la même géométrie, avec le vrai produit.
   Il est composé à 1611 px de large (la moitié de la capture, sa densité 2) puis mis à l'échelle du cadre,
   comme une image : la composition ne se réarrange jamais, elle rétrécit. Données : un exemple. */

const L = 1611;
const H = 1298;

const menu = [
  { titre: "Cabinet", items: [
    { i: LayoutDashboard, t: "Point du matin", actif: true },
    { i: Files, t: "Dossiers", n: "42" },
    { i: Inbox, t: "Pièces du jour", n: "4" },
    { i: History, t: "Chronologies" },
    { i: GitCompare, t: "Contradictions", n: "2" },
    { i: FileCheck2, t: "Bordereaux" },
    { i: CalendarDays, t: "Audiences" },
  ] },
  { titre: "Gestion", items: [
    { i: Scale, t: "Forfaits" },
    { i: Clock, t: "Temps à saisir" },
    { i: Users, t: "Charge" },
  ] },
];

const pieces = [
  { p: "Rapport d'expertise", ref: "Pièce adverse n° 23", dossier: "Construction — lot 4", tags: ["Contradiction", "Nouvelle date"], recue: "23 sept. 2026", page: "p. 12" },
  { p: "Conclusions n° 3", ref: "Partie adverse", dossier: "Bail commercial", tags: ["Contradiction", "Sans pièce"], recue: "23 sept. 2026", page: "p. 7" },
  { p: "Procès-verbal de constat", ref: "Pièce n° 14", dossier: "Copropriété", tags: ["Nouvelle date"], recue: "23 sept. 2026", page: "p. 2" },
  { p: "Courriel du confrère", ref: "Messagerie", dossier: "Prud'hommes", tags: ["Délai cité"], recue: "22 sept. 2026", page: "—" },
  { p: "Contrat de bail", ref: "Pièce n° 7", dossier: "Bail commercial", tags: ["Citée 3 fois"], recue: "19 sept. 2026", page: "p. 4" },
  { p: "Attestation", ref: "Pièce n° 31", dossier: "Succession", tags: ["Jamais citée"], recue: "18 sept. 2026", page: "p. 1" },
];

const couleurTag: Record<string, string> = {
  Contradiction: "text-rose-600 border-rose-500/25 bg-rose-50",
  "Sans pièce": "text-amber-700 border-amber-500/30 bg-amber-50",
  "Jamais citée": "text-amber-700 border-amber-500/30 bg-amber-50",
};

/* la courbe « pièces lues », douze mois, même dessin que la référence (violet, aire hachurée) */
const valeurs = [118, 132, 126, 164, 150, 205, 238, 222, 268, 301, 286, 344];
const mois = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

function Courbe() {
  const w = 1180, h = 250, max = 380;
  const pts = valeurs.map((v, i) => [(i / (valeurs.length - 1)) * w, h - (v / max) * h] as const);
  const d = pts.reduce((acc, [x, y], i) => {
    if (i === 0) return `M${x},${y}`;
    const [px, py] = pts[i - 1];
    const cx = (px + x) / 2;
    return `${acc} C${cx},${py} ${cx},${y} ${x},${y}`;
  }, "");
  const [tx, ty] = pts[6];
  return (
    <svg viewBox={`0 0 ${w} ${h + 40}`} className="w-full" style={{ height: 290 }} aria-hidden="true">
      <defs>
        <pattern id="avocats-hachure" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="6" stroke="#9e77ed" strokeOpacity=".22" strokeWidth="1" />
        </pattern>
        <linearGradient id="avocats-aire" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#9e77ed" stopOpacity=".28" />
          <stop offset="1" stopColor="#9e77ed" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 1, 2, 3, 4].map((k) => (
        <line key={k} x1="0" x2={w} y1={(k / 4) * h} y2={(k / 4) * h} stroke="#18181b" strokeOpacity=".07" />
      ))}
      <path d={`${d} L${w},${h} L0,${h} Z`} fill="url(#avocats-aire)" />
      <path d={`${d} L${w},${h} L0,${h} Z`} fill="url(#avocats-hachure)" />
      <path d={d} fill="none" stroke="#9e77ed" strokeWidth="2.5" />
      <line x1={tx} x2={tx} y1={ty} y2={h} stroke="#9e77ed" strokeOpacity=".4" strokeDasharray="3 3" />
      <circle cx={tx} cy={ty} r="7" fill="#9e77ed" fillOpacity=".25" />
      <circle cx={tx} cy={ty} r="4" fill="#ffffff" stroke="#9e77ed" strokeWidth="2" />
      <g transform={`translate(${tx - 46} ${ty - 62})`}>
        <rect width="92" height="46" rx="8" fill="#ffffff" stroke="#18181b" strokeOpacity=".12" />
        <text x="12" y="20" fill="#18181b" fontSize="13" fontWeight="600">238 pièces</text>
        <text x="12" y="36" fill="#71717a" fontSize="11">juillet 2026</text>
      </g>
      {mois.map((m, i) => (
        <text key={m} x={(i / (mois.length - 1)) * (w - 30) + 4} y={h + 30} fill="#71717a" fontSize="12">{m}</text>
      ))}
    </svg>
  );
}

export default function ApercuDossier() {
  const boite = useRef<HTMLDivElement>(null);
  const [echelle, setEchelle] = useState(1132 / L);

  useEffect(() => {
    const el = boite.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setEchelle(e.contentRect.width / L));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={boite}
      className="relative w-full overflow-hidden rounded-[0.6rem] lg:rounded-[20px]"
      style={{ aspectRatio: `${L} / ${H}` }}
      role="img"
      aria-label="Écran du point du matin de Tamila : pièces lues sur douze mois et pièces du jour avec leurs constats (données d'exemple)"
    >
      <div
        className="absolute left-0 top-0 origin-top-left flex bg-[#ffffff] text-zinc-700 avocats-texte"
        style={{ width: L, height: H, transform: `scale(${echelle})` }}
      >
        {/* barre latérale */}
        <aside className="w-[300px] shrink-0 border-r border-black/[0.08] flex flex-col px-5 pt-5">
          <div className="flex gap-2 pb-6">
            <span className="size-3 rounded-full bg-[#ff5f57]" />
            <span className="size-3 rounded-full bg-[#febc2e]" />
            <span className="size-3 rounded-full bg-[#28c840]" />
          </div>
          <div className="flex items-center justify-between px-2 pb-7">
            <span className="flex items-center gap-2.5 text-[17px] font-semibold text-zinc-900 avocats-titre">
              <span className="grid size-8 place-items-center rounded-[0.6rem] bg-black/[0.04] ring-1 ring-black/10"><Glyphe className="size-5" /></span>
              Tamila
            </span>
            <Search className="size-[18px] text-zinc-500" />
          </div>
          {menu.map((g) => (
            <div key={g.titre} className="pb-5">
              <div className="flex items-center justify-between px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                {g.titre}
                <MoreVertical className="size-3.5" />
              </div>
              {g.items.map(({ i: I, t, actif, n }: { i: typeof Files; t: string; actif?: boolean; n?: string }) => (
                <div key={t} className={`flex items-center gap-3 rounded-[0.6rem] px-3 h-10 text-[14px] ${actif ? "bg-black/[0.05] text-zinc-900 font-medium" : "text-zinc-600"}`}>
                  <I className="size-[18px]" />
                  <span className="flex-1">{t}</span>
                  {n && <span className="rounded-full bg-black/[0.05] px-2 text-[11px] leading-5 text-zinc-600">{n}</span>}
                </div>
              ))}
            </div>
          ))}
          <div className="mt-auto pb-8 opacity-40">
            {[{ i: Settings, t: "Réglages" }, { i: BookOpen, t: "Méthode" }, { i: LifeBuoy, t: "Assistance" }].map(({ i: I, t }) => (
              <div key={t} className="flex items-center gap-3 px-3 h-10 text-[14px] text-zinc-600"><I className="size-[18px]" />{t}</div>
            ))}
          </div>
        </aside>

        {/* contenu */}
        <div className="flex-1 min-w-0 px-10 pt-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[13px] text-zinc-500">
              <span className="grid size-6 place-items-center rounded-[calc(0.6rem-2px)] bg-black/[0.05]"><Glyphe className="size-3.5 text-zinc-700" /></span>
              <span>Cabinet</span>
              <span className="text-zinc-400">/</span>
              <span className="rounded-[calc(0.6rem-2px)] bg-black/[0.05] px-2 py-0.5 text-zinc-800">Point du matin</span>
            </div>
            <span className="rounded-[calc(0.6rem-2px)] border border-black/10 px-2.5 py-1 text-[11px] uppercase tracking-wider text-zinc-500">Exemple</span>
          </div>

          <h3 className="mt-7 text-[26px] font-semibold text-zinc-900 avocats-titre">Point du matin, mardi 24 septembre</h3>
          <p className="mt-1.5 text-[14px] text-zinc-600">4 pièces reçues hier, 2 contradictions à vérifier, 1 bordereau à reprendre avant l&apos;audience du 14 octobre.</p>

          <div className="mt-8 flex items-center justify-between">
            <p className="text-[17px] font-semibold text-zinc-900">
              Pièces lues <span className="ml-1 text-[#7f56d9]">+38 cette semaine</span>
            </p>
            <div className="flex items-center gap-3">
              <div className="flex rounded-[0.6rem] border border-black/10 text-[13px]">
                {["12 mois", "30 jours", "7 jours", "24 heures"].map((t, i) => (
                  <span key={t} className={`px-3.5 h-9 grid place-items-center ${i ? "border-l border-black/10 text-zinc-500" : "bg-black/[0.05] text-zinc-900"}`}>{t}</span>
                ))}
              </div>
              <span className="flex items-center gap-2 rounded-[0.6rem] border border-black/10 px-3.5 h-9 text-[13px] text-zinc-700"><Filter className="size-4" />Filtres</span>
            </div>
          </div>
          <div className="mt-5"><Courbe /></div>

          <div className="mt-8 flex items-center justify-between">
            <p className="text-[17px] font-semibold text-zinc-900">Pièces du jour</p>
            <MoreVertical className="size-4 text-zinc-500" />
          </div>
          <div className="mt-4 overflow-hidden rounded-xl border border-black/[0.08]">
            <div className="grid grid-cols-[1.6fr_1.1fr_1.5fr_0.8fr_0.45fr_40px] items-center gap-4 bg-black/[0.02] px-5 h-11 text-[12px] font-medium text-zinc-500">
              <span className="flex items-center gap-3"><span className="size-4 rounded border border-black/15" />Pièce</span>
              <span>Dossier</span>
              <span>Constats</span>
              <span className="flex items-center gap-1">Reçue <ArrowDown className="size-3" /></span>
              <span>Page</span>
              <span />
            </div>
            {pieces.map((r, k) => (
              <div key={k} className={`grid grid-cols-[1.6fr_1.1fr_1.5fr_0.8fr_0.45fr_40px] items-center gap-4 border-t border-black/[0.07] px-5 h-[68px] text-[13px] ${k > 3 ? "opacity-50" : ""}`}>
                <span className="flex items-center gap-3 min-w-0">
                  <span className="size-4 shrink-0 rounded border border-black/15" />
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-black/[0.04] ring-1 ring-black/10">
                    {r.tags.includes("Contradiction") ? <AlertTriangle className="size-[18px] text-rose-500" /> : <FileText className="size-[18px] text-zinc-600" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-zinc-900">{r.p}</span>
                    <span className="block truncate text-zinc-500">{r.ref}</span>
                  </span>
                </span>
                <span className="truncate text-zinc-600">{r.dossier}</span>
                <span className="flex flex-wrap gap-1.5">
                  {r.tags.map((t) => (
                    <span key={t} className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] ${couleurTag[t] ?? "text-zinc-600 border-black/10 bg-black/[0.03]"}`}>
                      <span className="size-1.5 rounded-full bg-current" />{t}
                    </span>
                  ))}
                </span>
                <span className="text-zinc-600">{r.recue}</span>
                <span className="text-zinc-600">{r.page}</span>
                <MoreVertical className="size-4 text-zinc-400" />
              </div>
            ))}
          </div>
          <div className="mt-5 flex items-center justify-between text-[13px] text-zinc-500 opacity-40">
            <span className="flex items-center gap-2"><ArrowLeft className="size-4" />Précédent</span>
            <span className="flex gap-4">{[1, 2, 3, "…", 8, 9].map((n, i) => <span key={i}>{n}</span>)}</span>
            <span className="flex items-center gap-2">Suivant<ArrowRight className="size-4" /></span>
          </div>
        </div>
      </div>
    </div>
  );
}
