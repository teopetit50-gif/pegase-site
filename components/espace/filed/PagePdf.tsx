"use client";

/* ══════════════════════════════════════════════════════════════════════
   Une page de PDF rendue dans la visionneuse (05/10/2026)

   pdf.js (pdfjs-dist) dessine la page n dans un <canvas> à la largeur du
   cadre, à la densité de l'écran. Le document est ouvert UNE fois par URL
   signée (cache de module, partagé par toutes les pages de la pièce), et
   la bibliothèque n'est chargée qu'au premier rendu (import dynamique) :
   l'exemple, qui dessine ses pages lui-même, ne la télécharge jamais.

   La BUILD « legacy » du paquet est prise, pas la moderne : pdf.js 6 s'écrit
   avec des API que les navigateurs d'il y a dix-huit mois n'ont pas
   (Map.getOrInsertComputed…) — la moderne lève « getOrInsertComputed is
   not a function » sur le Chromium de recette ; la legacy embarque ses
   polyfills et dessine la même chose.

   Le worker : pdf.js veut un fichier séparé. On lui donne l'adresse que le
   bundler attribue au worker du paquet (new URL(…, import.meta.url)) ; si
   le worker ne démarre pas, pdf.js retombe de lui-même sur le fil
   principal — plus lent, mais la page s'affiche. La CSP du site autorise
   worker-src 'self' blob:, et connect-src vers l'armoire Supabase, d'où
   vient le fichier signé.

   Les boîtes des valeurs lues restent posées en pourcentages par la
   visionneuse ; ici on ne rend que l'image. Le rapport largeur/hauteur
   réel de la page est remonté (onRapport) pour que le cadre ait la bonne
   forme même sans pieces_pages.
   ══════════════════════════════════════════════════════════════════════ */

import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist/legacy/build/pdf.mjs";

type Pdfjs = typeof import("pdfjs-dist/legacy/build/pdf.mjs");

let pdfjsPromesse: Promise<Pdfjs> | null = null;
function chargerPdfjs(): Promise<Pdfjs> {
  if (!pdfjsPromesse) {
    pdfjsPromesse = import("pdfjs-dist/legacy/build/pdf.mjs").then((m) => {
      try {
        m.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/legacy/build/pdf.worker.min.mjs", import.meta.url).toString();
      } catch {
        /* sans adresse de worker, pdf.js travaille sur le fil principal */
      }
      return m;
    });
  }
  return pdfjsPromesse;
}

/* Un document par clé : l'URL signée, ou un nom quand les octets sont
   fournis (le PDF est alors déjà en mémoire — essai, ou pièce téléchargée). */
const documents = new Map<string, Promise<PDFDocumentProxy>>();
function ouvrir(cle: string, donnees?: Uint8Array): Promise<PDFDocumentProxy> {
  let p = documents.get(cle);
  if (!p) {
    p = chargerPdfjs().then((pdfjs) => pdfjs.getDocument(donnees ? { data: donnees.slice() } : { url: cle, withCredentials: false }).promise);
    p.catch(() => documents.delete(cle));
    documents.set(cle, p);
  }
  return p;
}

/** Le nombre de pages d'un PDF, pour la visionneuse. */
export async function nombreDePages(cle: string, donnees?: Uint8Array): Promise<number> {
  const doc = await ouvrir(cle, donnees);
  return doc.numPages;
}

export default function PagePdf({ url, donnees, page, onRapport }: { url: string; donnees?: Uint8Array; page: number; onRapport?: (hauteurSurLargeur: number) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [etat, setEtat] = useState<"rendu" | "erreur" | "attente">("attente");
  const [largeur, setLargeur] = useState(0);

  /* la largeur du cadre, suivie au redimensionnement */
  useEffect(() => {
    const el = ref.current?.parentElement;
    if (!el) return;
    const obs = new ResizeObserver((entrees) => {
      const l = Math.round(entrees[0]?.contentRect.width ?? 0);
      if (l) setLargeur(l);
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!largeur) return;
    let actif = true;
    let tache: { cancel: () => void } | null = null;
    (async () => {
      try {
        const doc = await ouvrir(url, donnees);
        const p = await doc.getPage(page);
        const base = p.getViewport({ scale: 1 });
        onRapport?.(base.height / base.width);
        const densite = Math.min(window.devicePixelRatio || 1, 2);
        const vue = p.getViewport({ scale: (largeur / base.width) * densite });
        const canvas = ref.current;
        if (!canvas || !actif) return;
        canvas.width = Math.floor(vue.width);
        canvas.height = Math.floor(vue.height);
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        const rendu = p.render({ canvasContext: ctx, viewport: vue, canvas });
        tache = rendu;
        await rendu.promise;
        if (actif) setEtat("rendu");
      } catch (e) {
        if (e && typeof e === "object" && "name" in e && (e as { name: string }).name === "RenderingCancelledException") return;
        /* dit en console : c'est la seule trace d'un PDF qui ne se rend pas */
        console.error(`[espace] page ${page} du PDF non rendue :`, e);
        if (actif) setEtat("erreur");
      }
    })();
    return () => {
      actif = false;
      tache?.cancel();
    };
  }, [url, donnees, page, largeur, onRapport]);

  return (
    <>
      <canvas ref={ref} className="esp-page-canvas" aria-label={`Page ${page}`} />
      {etat === "attente" ? <div className="esp-page-attente">Rendu de la page {page}…</div> : null}
      {etat === "erreur" ? <div className="esp-page-attente">Cette page n&apos;a pas pu être rendue ; ouvrez le fichier.</div> : null}
    </>
  );
}
