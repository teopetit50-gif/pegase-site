"use client";

/* ══════════════════════════════════════════════════════════════════════
   Les pièces jointes d'une demande (19/10/2026, C3, lot c3_14)

   Base réelle : la liste vient de reput_pieces (périmètre de la demande) ;
   « Ouvrir » passe par reput_ouvrir_piece (journalisée) puis un lien signé
   de 5 minutes. Une image s'affiche dans la page ; un PDF ou un texte
   s'ouvre dans un nouvel onglet ; le reste (SVG, HTML compris) se
   télécharge. Exemple : les noms seulement, aucun fichier.
   ══════════════════════════════════════════════════════════════════════ */

import { useEffect, useMemo, useState } from "react";
import { Loader } from "@/components/ui/loader";
import { Avis } from "../ui";
import { ouvrirPiece, piecesDemande, type PieceDemande } from "./portes";

const NATURES: Record<PieceDemande["nature"], string> = {
  image: "image", pdf: "PDF", texte: "texte", audio: "audio", video: "vidéo", autre: "fichier",
};

function taille(o: number | null): string {
  if (o == null) return "";
  if (o < 1024) return `${o} o`;
  if (o < 1024 * 1024) return `${Math.round(o / 1024)} Ko`;
  return `${(o / (1024 * 1024)).toFixed(1).replace(".", ",")} Mo`;
}

function natureLocale(nom: string): PieceDemande["nature"] {
  const n = nom.toLowerCase();
  if (/\.(jpe?g|png|gif|webp|heic|heif)$/.test(n)) return "image";
  if (n.endsWith(".pdf")) return "pdf";
  if (n.endsWith(".txt")) return "texte";
  return "autre";
}

type Ouverte = { url: string; nom: string; nature: PieceDemande["nature"]; affichable: boolean };

export default function PiecesJointes({ demande, pieces, source }: { demande: string; pieces: unknown[] | null; source: "exemple" | "reelle" }) {
  const brutes = useMemo(() => (Array.isArray(pieces) ? pieces : []), [pieces]);
  const exemple = useMemo<PieceDemande[] | null>(() => source !== "exemple" ? null : brutes.map((p, i) => {
    const nom = (p as { nom?: string })?.nom ?? `pièce ${i + 1}`;
    const nature = natureLocale(nom);
    return { rang: i + 1, nom, mime: "", taille: null, nature, affichable: nature === "image" || nature === "pdf" || nature === "texte", disponible: false };
  }), [brutes, source]);
  const [lue, setLue] = useState<{ pieces: PieceDemande[]; ignorees: string[] } | null>(null);
  const [ouvertes, setOuvertes] = useState<Record<number, Ouverte>>({});
  const [envoi, setEnvoi] = useState<number | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  /* le composant est remonté à chaque demande (key) : l'état repart de zéro */
  useEffect(() => {
    if (source === "exemple") return;
    let vivant = true;
    piecesDemande(demande).then((r) => {
      if (vivant) setLue({ pieces: r.pieces ?? [], ignorees: r.ignorees ?? [] });
    }).catch((e) => {
      if (!vivant) return;
      setLue({ pieces: [], ignorees: [] });
      setErreur(e instanceof Error ? e.message : "La base n'a pas répondu.");
    });
    return () => { vivant = false; };
  }, [demande, source]);

  const liste = exemple ?? lue?.pieces ?? null;
  const ignorees = lue?.ignorees ?? [];

  if (source === "reelle" && liste === null) return <p className="esp-kpi-sous" style={{ marginTop: 8 }}><Loader variant="spin" /> Pièces jointes…</p>;
  if (!liste?.length && !ignorees.length && !erreur) return null;

  const ouvrir = async (p: PieceDemande) => {
    setEnvoi(p.rang);
    setErreur(null);
    try {
      const o = await ouvrirPiece(demande, p.rang);
      setOuvertes((m) => ({ ...m, [p.rang]: o }));
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base n'a pas répondu.");
    } finally {
      setEnvoi(null);
    }
  };

  return (
    <div style={{ marginTop: 10 }} data-pieces-jointes>
      <div className="esp-kpi-sous" style={{ marginBottom: 6 }}>
        Pièces jointes conservées ({liste?.length ?? 0}){source === "exemple" ? " — exemple : les noms seulement, aucun fichier" : ""}
      </div>
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 8 }}>
        {(liste ?? []).map((p) => {
          const o = ouvertes[p.rang];
          return (
            <li key={p.rang} style={{ border: "1px solid var(--r-filet)", borderRadius: 8, padding: "8px 10px", minWidth: 0 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", justifyContent: "space-between" }}>
                <span style={{ overflowWrap: "anywhere", minWidth: 0 }}>
                  <strong>{p.nom}</strong>
                  <span className="esp-kpi-sous"> · {NATURES[p.nature]}{p.taille != null ? ` · ${taille(p.taille)}` : ""}</span>
                </span>
                {source === "reelle" && p.disponible ? (
                  o ? (
                    <a className="r-btn" href={o.url} target="_blank" rel="noopener noreferrer" download={o.affichable ? undefined : o.nom}>
                      {o.affichable ? "Ouvrir dans un onglet" : "Télécharger"}
                    </a>
                  ) : (
                    <button type="button" className="r-btn" disabled={envoi !== null} onClick={() => void ouvrir(p)}>
                      {envoi === p.rang ? <Loader variant="spin" /> : null} {p.affichable ? "Ouvrir" : "Préparer le téléchargement"}
                    </button>
                  )
                ) : source === "reelle" ? <span className="esp-kpi-sous">indisponible</span> : null}
              </div>
              {o && o.nature === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={o.url} alt={`Pièce jointe : ${o.nom}`} style={{ display: "block", marginTop: 8, maxWidth: "100%", maxHeight: 420, borderRadius: 6, objectFit: "contain" }} />
              ) : null}
              {o ? <div className="esp-kpi-sous" style={{ marginTop: 4 }}>Lien valable 5 minutes ; l&apos;ouverture est notée au journal.</div> : null}
            </li>
          );
        })}
      </ul>
      {ignorees.length ? (
        <p className="esp-kpi-sous" style={{ marginTop: 6, overflowWrap: "anywhere" }}>
          Non reçues (le message est arrivé sans elles) : {ignorees.join(", ")}
        </p>
      ) : null}
      {erreur ? <div style={{ marginTop: 6 }}><Avis teinte="rouge">{erreur}</Avis></div> : null}
    </div>
  );
}
