"use client";

/* ══════════════════════════════════════════════════════════════════════
   La pièce en regard — pages, boîtes, surlignage (05/10/2026)

   Chaque valeur lue (pieces_valeurs) porte sa page et sa boîte {x,y,l,h}
   en FRACTIONS de page : la boîte est posée en pourcentages sur la page,
   quelle que soit la largeur d'écran. Cliquer une valeur dans le dossier
   surligne sa boîte et fait défiler jusqu'à sa page ; survoler une boîte
   montre le champ.

   Ce qui tient lieu de page :
     · exemple — la facture est DESSINÉE à partir des valeurs
       (FactureDessinee) : ce qui est cité est ce qui est écrit ;
     · base réelle, image — l'image signée (URL de 10 min, action serveur) ;
     · base réelle, PDF — le texte de la page (pieces_pages.texte) posé
       sur une page blanche au bon rapport, et un lien pour ouvrir le PDF.
       Le rendu des pages de PDF (pdf.js) est noté pour demain.
   ══════════════════════════════════════════════════════════════════════ */

import { useEffect, useRef, useState } from "react";
import { ExternalLink } from "lucide-react";
import type { Source } from "../source";
import type { DossierFiled, ValeurPiece } from "../types";
import { urlSigneePiece } from "@/app/espace/filed/actions";
import { libelleChamp } from "./etats";
import FactureDessinee from "./FactureDessinee";

type Props = {
  dossier: DossierFiled;
  source: Source;
  actif: string | null;
  onChoisir: (id: string | null) => void;
};

export default function VisionneusePiece({ dossier, source, actif, onChoisir }: Props) {
  const { piece, pages, valeurs } = dossier;
  const [url, setUrl] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const refs = useRef(new Map<number, HTMLDivElement>());

  const nbPages = Math.max(piece?.nb_pages ?? 0, pages.length, ...valeurs.map((v) => v.page ?? 1), 1);
  const estImage = !!piece && piece.mime.startsWith("image/");

  useEffect(() => {
    if (source !== "reelle" || !piece) return;
    let actifEffet = true;
    const t = window.setTimeout(async () => {
      const r = await urlSigneePiece(piece.chemin);
      if (!actifEffet) return;
      if ("url" in r) setUrl(r.url);
      else setErreur(r.erreur);
    }, 0);
    return () => {
      actifEffet = false;
      window.clearTimeout(t);
    };
  }, [source, piece]);

  useEffect(() => {
    if (!actif) return;
    const v = valeurs.find((x) => x.id === actif);
    const el = refs.current.get(v?.page ?? 1);
    el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [actif, valeurs]);

  if (!piece) {
    return (
      <div className="esp-piece">
        <div className="esp-vide">
          <strong>Aucune pièce</strong>Ce document n&apos;a pas de fichier rattaché.
        </div>
      </div>
    );
  }

  return (
    <div className="esp-piece" aria-label="Pièce">
      <div className="esp-piece-barre">
        <span>
          <strong style={{ color: "var(--r-texte)", fontWeight: 600 }}>{piece.nom_fichier}</strong> · {nbPages} page{nbPages > 1 ? "s" : ""}
          {piece.methode ? ` · lecture ${piece.methode === "natif" ? "native" : piece.methode.toUpperCase()}` : ""}
        </span>
        {source === "reelle" && url ? (
          <a className="esp-lien-bouton" href={url} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            Ouvrir le fichier <ExternalLink width={13} height={13} aria-hidden="true" />
          </a>
        ) : source === "reelle" && erreur ? (
          <span style={{ color: "var(--esp-rouge)" }}>{erreur}</span>
        ) : source === "exemple" ? (
          <span>Facsimilé dessiné à partir des valeurs lues</span>
        ) : null}
      </div>

      {Array.from({ length: nbPages }).map((_, i) => {
        const n = i + 1;
        const page = pages.find((p) => p.n === n);
        const ratio = page?.largeur && page?.hauteur ? page.hauteur / page.largeur : 842 / 595;
        const boites = valeurs.filter((v) => (v.page ?? 1) === n && v.boite);
        return (
          <div
            key={n}
            ref={(el) => {
              if (el) refs.current.set(n, el);
            }}
            className="esp-page"
            style={{ aspectRatio: `1 / ${ratio}` }}
            onClick={() => onChoisir(null)}
          >
            {source === "exemple" ? (
              <FactureDessinee dossier={dossier} page={n} />
            ) : estImage && url ? (
              // eslint-disable-next-line @next/next/no-img-element -- URL signée, hôte privé, taille connue par la page
              <img src={url} alt={`${piece.nom_fichier}, page ${n}`} />
            ) : (
              <div className="esp-page-texte" aria-label={`Texte de la page ${n}`}>
                {page?.texte || (source === "reelle" && !url && !erreur ? "Chargement de la pièce…" : "Le texte de cette page n'est pas disponible.")}
              </div>
            )}
            {boites.map((v) => (
              <Boite key={v.id} v={v} actif={actif === v.id} onChoisir={onChoisir} />
            ))}
            <span className="esp-page-numero">{n} / {nbPages}</span>
          </div>
        );
      })}
    </div>
  );
}

function Boite({ v, actif, onChoisir }: { v: ValeurPiece; actif: boolean; onChoisir: (id: string | null) => void }) {
  const b = v.boite!;
  return (
    <button
      type="button"
      className="esp-boite"
      data-actif={actif}
      style={{ left: `${b.x * 100}%`, top: `${b.y * 100}%`, width: `${b.l * 100}%`, height: `${b.h * 100}%` }}
      title={`${libelleChamp(v.champ)} : ${v.texte ?? ""}`}
      aria-label={`${libelleChamp(v.champ)} : ${v.texte ?? ""}`}
      aria-pressed={actif}
      onClick={(e) => {
        e.stopPropagation();
        onChoisir(actif ? null : v.id);
      }}
    >
      {actif ? <span className="esp-boite-etiquette">{libelleChamp(v.champ)}</span> : null}
    </button>
  );
}
