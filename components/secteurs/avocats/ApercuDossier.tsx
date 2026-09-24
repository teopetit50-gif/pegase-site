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

   24/09 (SOIR) — L'ÉCRAN MONTRE UN ACTE, PLUS UN TABLEAU DE BORD
   Teo : « on ne voit pas assez que ça fait avocat ». La courbe violette
   « pièces lues » et le tableau de pièces étaient l'écran de n'importe
   quel SaaS. L'écran montre maintenant ce que l'avocat reçoit, dans les
   mots du Palais (relevé de douze sites du métier, avocats.css) :
   · à gauche, le DOSSIER DE FAITS d'une affaire de bail commercial —
     chaque fait daté renvoie à sa pièce et à sa page ; un fait contredit
     par une autre pièce est signalé ;
   · à droite, les CONCLUSIONS RÉCAPITULATIVES elles-mêmes, en serif,
     paragraphes numérotés, un passage surligné, un passage souligné de
     rouge, et en marge, comme les commentaires d'un traitement de texte,
     la pièce qui fonde chaque passage ;
   · en tête, la juridiction et la chambre, le n° RG, l'avocat en charge
     et la date de l'audience de plaidoirie.
   Composé à 1611 × 1000 (la largeur de l'ancien écran, pour garder la
   même échelle dans le cadre) ; la feuille est coupée par le bas, comme
   une page qu'on fait défiler. Les parties, le n° RG et Me Aubert sont
   inventés : l'écran est étiqueté « Exemple ». Faits cohérents entre les
   deux colonnes (dates, numéros de pièces).
   Teintes : le vert de Tamila #193a29 (fait sélectionné, renvois
   conformes), le rose pour la contradiction (celui de l'ancien écran), le
   jaune du surligneur #fbe9a3.
   ══════════════════════════════════════════════════════════════════════ */

import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle, BookOpen, CalendarDays, Check, Download, FileCheck2, FileText, Files, FolderOpen, Gavel, GitCompare,
  History, Inbox, LayoutDashboard, LifeBuoy, MoreVertical, Scale, Search, Settings, UserRound,
} from "lucide-react";
import { Glyphe } from "./marque";

const L = 1611;
const H = 1000;

const menu = [
  { titre: "Cabinet", items: [
    { i: LayoutDashboard, t: "Point du matin" },
    { i: Files, t: "Dossiers", n: "42" },
    { i: Inbox, t: "Pièces du jour", n: "4" },
    { i: CalendarDays, t: "Audiences", n: "3" },
  ] },
  { titre: "Ce dossier", items: [
    { i: History, t: "Dossier de faits", actif: true },
    { i: FileText, t: "Conclusions" },
    { i: FileCheck2, t: "Bordereau" },
    { i: GitCompare, t: "Contradictions", n: "1" },
    { i: FolderOpen, t: "Pièces", n: "31" },
  ] },
];

type Fait = { d: string; t: string; s: string; actif?: boolean; contredit?: string };
const faits: Fait[] = [
  { d: "03/03/2021", t: "Bail commercial conclu, loyer annuel de 36 000 € HT", s: "Pièce n° 7, p. 1" },
  { d: "01/04/2021", t: "Prise d'effet du bail", s: "Pièce n° 7, p. 4", actif: true },
  { d: "30/09/2023", t: "Départ des lieux allégué par les preneurs", s: "Pièce adverse n° 23, p. 1", contredit: "Contredit par la pièce n° 14, p. 2" },
  { d: "12/10/2023", t: "Constat : le mobilier des preneurs est encore dans les lieux", s: "Pièce n° 14, p. 2" },
  { d: "05/01/2024", t: "Premier loyer impayé", s: "Pièces n° 12 et 13" },
  { d: "18/03/2024", t: "Commandement de payer visant la clause résolutoire", s: "Pièce n° 15, p. 1 à 3" },
];

/* Un commentaire de marge, aligné sur son paragraphe (grille de la feuille). */
function Note({ ton, titre, children }: { ton: "vert" | "rose"; titre: string; children: React.ReactNode }) {
  const vert = ton === "vert";
  return (
    <div className={`rounded-lg border px-3.5 py-3 text-[12.5px] leading-[1.45] ${vert ? "border-[#193a29]/20 bg-[#eef3ef]" : "border-rose-200 bg-rose-50"}`}>
      <p className={`flex items-center gap-1.5 font-semibold ${vert ? "text-[#193a29]" : "text-rose-700"}`}>
        {vert ? <Check className="size-3.5" strokeWidth={2.6} /> : <AlertTriangle className="size-3.5" />}
        {titre}
      </p>
      <div className="mt-1 text-zinc-600">{children}</div>
    </div>
  );
}

export default function ApercuDossier() {
  const boite = useRef<HTMLDivElement>(null);
  const [echelle, setEchelle] = useState(1024 / L);

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
      className="relative w-full overflow-hidden"
      style={{ aspectRatio: `${L} / ${H}` }}
      role="img"
      aria-label="Écran de Tamila sur un dossier de bail commercial (exemple) : le dossier de faits, chaque fait daté renvoyé à sa pièce et à sa page, et les conclusions récapitulatives annotées en marge, un passage conforme au bail, un passage contredit par un constat"
    >
      <div
        className="absolute left-0 top-0 origin-top-left flex bg-[#ffffff] text-zinc-700 avocats-texte"
        style={{ width: L, height: H, transform: `scale(${echelle})` }}
      >
        {/* barre latérale */}
        <aside className="w-[268px] shrink-0 border-r border-black/[0.08] flex flex-col px-5 pt-5 bg-[#fcfbf9]">
          <div className="flex gap-2 pb-6">
            <span className="size-3 rounded-full bg-[#ff5f57]" />
            <span className="size-3 rounded-full bg-[#febc2e]" />
            <span className="size-3 rounded-full bg-[#28c840]" />
          </div>
          <div className="flex items-center justify-between px-2 pb-7">
            <span className="flex items-center gap-2.5 text-[17px] font-semibold text-zinc-900 avocats-titre">
              <span className="grid size-8 place-items-center rounded-[0.6rem] bg-[#193a29] text-white"><Glyphe className="size-5" /></span>
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
                <div key={t} className={`flex items-center gap-3 rounded-[0.6rem] px-3 h-10 text-[14px] ${actif ? "bg-[#193a29]/[0.07] text-[#193a29] font-medium" : "text-zinc-600"}`}>
                  <I className="size-[18px]" />
                  <span className="flex-1">{t}</span>
                  {n && <span className={`rounded-full px-2 text-[11px] leading-5 ${t === "Contradictions" ? "bg-rose-50 text-rose-700" : "bg-black/[0.05] text-zinc-600"}`}>{n}</span>}
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
        <div className="flex-1 min-w-0 flex flex-col px-10 pt-7">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[13px] text-zinc-500">
              <Files className="size-4" />
              <span>Dossiers</span>
              <span className="text-zinc-400">/</span>
              <span className="rounded-[calc(0.6rem-2px)] bg-black/[0.05] px-2 py-0.5 text-zinc-800">SCI Les Tilleuls c/ Roche</span>
            </div>
            <span className="rounded-[calc(0.6rem-2px)] border border-black/10 px-2.5 py-1 text-[11px] uppercase tracking-wider text-zinc-500">Exemple</span>
          </div>

          <p className="mt-6 text-[27px] font-semibold text-zinc-900 avocats-titre">SCI Les Tilleuls c/ M. et Mme Roche</p>
          <div className="mt-3 flex items-center gap-5 text-[13.5px] text-zinc-600">
            <span className="flex items-center gap-1.5"><Scale className="size-4 text-zinc-500" />Tribunal judiciaire de Paris, 18e chambre</span>
            <span className="text-zinc-300">|</span>
            <span>RG n° 24/03817</span>
            <span className="text-zinc-300">|</span>
            <span className="flex items-center gap-1.5"><UserRound className="size-4 text-zinc-500" />Me Claire Aubert</span>
            <span className="ml-auto flex items-center gap-1.5 rounded-full border border-[#193a29]/20 bg-[#eef3ef] px-3 py-1 text-[13px] font-medium text-[#193a29]">
              <Gavel className="size-3.5" />Plaidoirie le 14 octobre 2026
            </span>
          </div>

          <div className="mt-7 flex min-h-0 flex-1 gap-8">
            {/* dossier de faits */}
            <div className="w-[500px] shrink-0">
              <div className="flex items-baseline justify-between">
                <p className="text-[17px] font-semibold text-zinc-900">Dossier de faits</p>
                <p className="text-[12.5px] text-zinc-500">6 faits, 31 pièces lues</p>
              </div>
              <div className="mt-3 flex gap-2 text-[12px]">
                <span className="rounded-full bg-zinc-900 px-3 py-1 text-white">Tous</span>
                <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-rose-700">Contredits (1)</span>
                <span className="rounded-full border border-black/10 px-3 py-1 text-zinc-500">Sans pièce (0)</span>
              </div>
              <div className="mt-4 overflow-hidden rounded-xl border border-black/[0.08]">
                {faits.map((f, k) => (
                  <div
                    key={f.d}
                    className={`grid grid-cols-[96px_1fr] gap-3 px-4 py-3.5 ${k ? "border-t border-black/[0.07]" : ""} ${f.actif ? "bg-[#193a29]/[0.05] shadow-[inset_3px_0_0_#193a29]" : ""}`}
                  >
                    <span className="pt-px font-mono text-[12.5px] text-zinc-500">{f.d}</span>
                    <span className="min-w-0">
                      <span className="block text-[14px] leading-snug text-zinc-900">{f.t}</span>
                      <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11.5px] ${f.actif ? "border-[#193a29]/25 bg-white text-[#193a29]" : "border-black/10 text-zinc-600"}`}>
                          <FileText className="size-3" />{f.s}
                        </span>
                        {f.contredit && (
                          <span className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11.5px] text-rose-700">
                            <AlertTriangle className="size-3" />{f.contredit}
                          </span>
                        )}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* les conclusions, annotées en marge */}
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex items-center justify-between">
                <p className="flex items-center gap-2 text-[14px] font-medium text-zinc-900">
                  <FileText className="size-4 text-zinc-500" />Conclusions récapitulatives n° 3
                  <span className="font-normal text-zinc-500">· p. 4 sur 18</span>
                </p>
                <div className="flex gap-2 text-[12.5px]">
                  <span className="flex items-center gap-1.5 rounded-[0.6rem] border border-black/10 px-3 h-8 text-zinc-700"><FileCheck2 className="size-3.5" />Bordereau</span>
                  <span className="flex items-center gap-1.5 rounded-[0.6rem] border border-black/10 px-3 h-8 text-zinc-700"><Download className="size-3.5" />Word</span>
                </div>
              </div>
              <div className="relative mt-4 min-h-0 flex-1 overflow-hidden rounded-t-xl bg-[#f3f1ec] px-6 pt-6">
                <div className="grid grid-cols-[1fr_214px] gap-x-6 rounded-t-[4px] bg-white px-9 pt-8 pb-10 shadow-[0_1px_3px_rgba(30,22,10,0.10),0_8px_24px_-8px_rgba(30,22,10,0.12)] avocats-serif text-[15px] leading-[1.6] text-zinc-800">
                  <div className="col-start-1 pb-5">
                    <p className="text-right text-[12px] tracking-wide text-zinc-500">RG n° 24/03817</p>
                    <p className="mt-2 whitespace-nowrap text-center text-[15px] font-semibold tracking-[0.07em] text-zinc-900">CONCLUSIONS RÉCAPITULATIVES N° 3</p>
                    <p className="mt-3 text-[13px] leading-[1.5]"><span className="font-semibold">POUR :</span> la SCI Les Tilleuls, demanderesse, ayant pour avocat Me Claire Aubert</p>
                    <p className="text-[13px] leading-[1.5]"><span className="font-semibold">CONTRE :</span> M. et Mme Roche, défendeurs</p>
                    <p className="mt-4 text-center text-[13px] tracking-[0.2em] text-zinc-900">PLAISE AU TRIBUNAL</p>
                    <p className="mt-4 text-[13px] font-semibold tracking-[0.06em] text-zinc-900">I. — FAITS ET PROCÉDURE</p>
                  </div>
                  <div />

                  <p className="col-start-1 pb-4">
                    <span className="font-semibold">12.</span> Par acte sous seing privé du 3 mars 2021, la SCI Les Tilleuls a donné à bail commercial à
                    M. et Mme Roche des locaux situés à Paris 11e, <span className="rounded-[2px] bg-[#fbe9a3] px-0.5">à effet du 1er avril 2021</span> (pièce n° 7).
                  </p>
                  <div className="pb-4">
                    <Note ton="vert" titre="Pièce n° 7, p. 4">Article 3 du bail : prise d&apos;effet au 1er avril 2021. Conforme.</Note>
                  </div>

                  <p className="col-start-1 pb-4">
                    <span className="font-semibold">13.</span> Les défendeurs soutiennent avoir quitté les lieux le 30 septembre 2023 (pièce adverse n° 23).{" "}
                    <span className="underline decoration-rose-500 decoration-wavy decoration-[1.5px] underline-offset-[5px]">Le procès-verbal de constat du 12 octobre 2023 relève pourtant la présence de leur mobilier</span> (pièce n° 14).
                  </p>
                  <div className="pb-4">
                    <Note ton="rose" titre="Contradiction">Pièce adverse n° 23, p. 1 : départ le 30 sept. 2023. Pièce n° 14, p. 2 : mobilier présent le 12 oct. 2023.</Note>
                  </div>

                  <p className="col-start-1 pb-4">
                    <span className="font-semibold">14.</span> Les loyers ne sont plus réglés depuis le 5 janvier 2024 (pièces n° 12 et 13). Par acte du
                    18 mars 2024, un commandement de payer visant la clause résolutoire leur a été délivré (pièce n° 15).
                  </p>
                  <div className="pb-4">
                    <Note ton="vert" titre="Pièces n° 12, 13 et 15">Relevé de compte et commandement de payer : dates concordantes.</Note>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
