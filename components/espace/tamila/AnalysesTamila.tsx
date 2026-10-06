"use client";

/* ══════════════════════════════════════════════════════════════════════
   Les lectures longues du dossier (06/10/2026, session B4, carnet n° 4)

   Un avocat demande une pré-lecture, une chronologie, les contradictions
   ou le bordereau (tamila_demander_analyse, b4_15) ; le lecteur d'A1 lit
   les pièces au coffre et rend un résultat chiffré sous la clé du
   dossier. Ici il se déchiffre et se lit : chaque constat renvoie à la
   pièce, la page et les lignes ; une citation non vérifiée est marquée.
   Export Word et impression (PDF) composés dans le navigateur.
   ══════════════════════════════════════════════════════════════════════ */

import { useEffect, useMemo, useRef, useState } from "react";
import { FileDown, Printer, ScrollText } from "lucide-react";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import type { Source } from "../source";
import { Avis, Pastille } from "../ui";
import { dateCourte } from "../format";
import { TYPES_ANALYSE, htmlAnalyse, libelleCode, libelleType, lignesDe, lireResultat, resumeDonnees, type ResultatAnalyse } from "./analyses";
import { dechiffrer } from "./chiffrement";
import { DOSSIERS_EXEMPLE } from "./exemples";
import * as portes from "./portes";
import type { Clair, Dossier, Piece } from "./types";

type Props = {
  dossier: Dossier;
  source: Source;
  cle: CryptoKey | null;
  pieces: Piece[];
  clair: Clair | null;
  /* un avocat qui écrit dans le dossier */
  peutDemander: boolean;
  /* la clé du dossier est au coffre Scaleway (le serveur peut lire et chiffrer) */
  auCoffre: boolean;
};

const STATUTS: Record<portes.Analyse["statut"], { libelle: string; teinte: "bleu" | "vert" | "ambre" | "rouge" | "gris" }> = {
  demandee: { libelle: "Demandée", teinte: "gris" }, en_cours: { libelle: "En lecture", teinte: "bleu" }, finie: { libelle: "Prête", teinte: "vert" },
  partielle: { libelle: "Partielle", teinte: "ambre" }, echec: { libelle: "Échec", teinte: "rouge" },
};

/* En exemple : une chronologie prête sur le dossier 2026-0412 (résultat en mémoire, non chiffré). */
function exemple(d: Dossier): { analyses: portes.Analyse[]; resultats: Record<string, ResultatAnalyse> } {
  if (DOSSIERS_EXEMPLE.find((c) => c.clair?.reference === "2026-0412")?.dossier.id !== d.id) return { analyses: [], resultats: {} };
  const id = `${d.id}-an1`;
  const p1 = `${d.id}-pc2`;
  const p2 = `${d.id}-pc3`;
  const resultat: ResultatAnalyse = {
    type: "tamila.chronologie", statut: "finie", pieces_lues: 2, pages_lues: 9, sans_source: 0,
    resume: "Le bail commercial est signé en 2019 ; les désordres apparaissent en 2023 ; le jugement de première instance rejette la demande en mars 2026 ; appel interjeté en avril.",
    constats: [
      { code: "evenement", titre: "Signature du bail commercial", gravite: "info", donnees: { date: "2019-06-14", precision: "jour", evenement: "Signature du bail", acteur: "client", nature: "acte" },
        citations: [{ piece: p1, page: 2, lignes: [4, 5], extrait: "bail commercial signé le 14 juin 2019", verifiee: true }] },
      { code: "evenement", titre: "Premières infiltrations constatées", gravite: "attention", texte: "La date diffère d'un mois entre les conclusions adverses et le constat d'huissier.",
        donnees: { date: "2023-02-01", precision: "mois", evenement: "Infiltrations", acteur: "adverse", nature: "fait" },
        citations: [{ piece: p1, page: 5, lignes: [12, 14], extrait: "dès le mois de février 2023, des infiltrations", verifiee: true }, { piece: p2, page: 1, lignes: [8, 8], extrait: "constaté en mars 2023", verifiee: false }] },
      { code: "evenement", titre: "Jugement du tribunal judiciaire", gravite: "info", donnees: { date: "2026-03-03", precision: "jour", evenement: "Jugement", acteur: "juge", nature: "procedure" },
        citations: [{ piece: p2, page: 1, lignes: [2, 3], extrait: "jugement rendu le 3 mars 2026", verifiee: true }] },
    ],
  };
  return {
    analyses: [{ id, type: "tamila.chronologie", statut: "finie", comptes: { info: 2, attention: 1, critique: 0 }, sans_source: 0, pieces: [p1, p2], pieces_lues: 2, pieces_non_lues: [], cout_eur: 0.42, motif: null, demandee_le: new Date(Date.now() - 3 * 3600_000).toISOString(), finie_le: new Date(Date.now() - 2 * 3600_000).toISOString(), resultat_chiffre: null }],
    resultats: { [id]: resultat },
  };
}

export default function AnalysesTamila({ dossier: d, source, cle, pieces, clair, peutDemander, auCoffre }: Props) {
  const ex = useMemo(() => (source === "exemple" ? exemple(d) : null), [source, d]);
  /* undefined : lecture ; null : la base n'a pas les analyses */
  const [liste, setListe] = useState<portes.Analyse[] | null | undefined>(() => ex?.analyses);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [fait, setFait] = useState<string | null>(null);
  const [ouverte, setOuverte] = useState<{ analyse: portes.Analyse; resultat: ResultatAnalyse | null; erreur: string | null } | null>(null);
  const cadre = useRef<HTMLIFrameElement>(null);

  const relire = async () => setListe(await portes.chargerAnalyses(d.id));
  useEffect(() => {
    if (source !== "reelle") return;
    let actif = true;
    const t = window.setTimeout(async () => {
      const x = await portes.chargerAnalyses(d.id);
      if (actif) setListe(x);
    }, 0);
    return () => {
      actif = false;
      window.clearTimeout(t);
    };
  }, [source, d.id]);

  if (liste === null) return null;

  const nomPiece = (id: string) => pieces.find((p) => p.id === id)?.nom_fichier ?? "pièce";
  const vivant = ["attente", "ouvert", "audit"].includes(d.statut);

  const demander = async (type: portes.TypeAnalyse) => {
    setEnvoi(true);
    setErreur(null);
    setFait(null);
    try {
      if (source === "reelle") {
        await portes.demanderAnalyse(d.id, type);
        await relire();
      } else {
        await new Promise((r) => setTimeout(r, 300));
        setListe((l) => [{ id: crypto.randomUUID(), type: `tamila.${type}`, statut: "demandee", comptes: null, sans_source: null, pieces: pieces.map((p) => p.id), pieces_lues: null, pieces_non_lues: null, cout_eur: null, motif: null, demandee_le: new Date().toISOString(), finie_le: null, resultat_chiffre: null }, ...(l ?? [])]);
      }
      setFait(`${TYPES_ANALYSE[type].libelle} demandée : le lecteur lit les pièces au coffre ; le résultat arrive chiffré sous la clé du dossier.`);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base a refusé la demande.");
    } finally {
      setEnvoi(false);
    }
  };

  const ouvrir = async (a: portes.Analyse) => {
    if (source === "exemple") return setOuverte({ analyse: a, resultat: ex?.resultats[a.id] ?? null, erreur: ex?.resultats[a.id] ? null : "Résultat d'exemple absent." });
    if (!cle) return setOuverte({ analyse: a, resultat: null, erreur: "La clé du dossier n'est pas ouverte dans ce navigateur : le résultat reste chiffré." });
    const r = lireResultat(await dechiffrer(cle, a.resultat_chiffre));
    setOuverte({ analyse: a, resultat: r, erreur: r ? null : "Le résultat ne se déchiffre pas avec la clé de ce dossier." });
  };

  const doc = ouverte?.resultat ? htmlAnalyse(ouverte.resultat, nomPiece, clair, dateCourte(ouverte.analyse.finie_le ?? ouverte.analyse.demandee_le)) : "";
  const exporterWord = () => {
    if (!ouverte?.resultat) return;
    const url = URL.createObjectURL(new Blob(["﻿" + doc], { type: "application/msword" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${libelleType(ouverte.resultat.type).toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${(clair?.reference ?? "dossier").replace(/[^A-Za-z0-9-]+/g, "-")}.doc`;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const r = ouverte?.resultat ?? null;
  return (
    <section className="esp-carte" aria-label="Lectures du dossier">
      <div className="esp-carte-tete">
        <h2 className="esp-carte-titre">Lectures du dossier</h2>
        <div className="esp-actions">
          {(Object.keys(TYPES_ANALYSE) as portes.TypeAnalyse[]).map((t) => (
            <button key={t} type="button" className="r-btn r-btn--fil r-btn--petit" title={TYPES_ANALYSE[t].aide}
              disabled={envoi || !peutDemander || !vivant || (source === "reelle" && !auCoffre)} onClick={() => void demander(t)}>
              {TYPES_ANALYSE[t].libelle}
            </button>
          ))}
        </div>
      </div>
      <div className="esp-carte-corps">
        {fait ? <Avis teinte="vert" role="status">{fait}</Avis> : null}
        {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
        {source === "reelle" && !auCoffre ? <Avis teinte="gris">La clé de ce dossier est sous la phrase du cabinet : le lecteur ne peut pas lire ses pièces. Les lectures longues demandent le coffre à clés.</Avis> : null}
        <p className="esp-kpi-sous tam-notice">Le lecteur lit les pièces chiffrées au coffre ; le résultat revient chiffré sous la clé du dossier et ne se lit qu&apos;ici. Chaque constat renvoie à la pièce, à la page et aux lignes : vérifiez avant tout usage.</p>
        {liste === undefined ? <p className="esp-kpi-sous"><Loader variant="spin" /> Lecture…</p> : liste.length === 0 ? <p className="esp-kpi-sous">Aucune lecture demandée.</p> : liste.map((a) => {
          const st = STATUTS[a.statut];
          return (
            <div key={a.id} className="tam-ligne">
              <div className="tam-ligne-haut">
                <span className="tam-ligne-titre">{libelleType(a.type)}</span>
                <Pastille teinte={st.teinte}>{st.libelle}</Pastille>
                {a.comptes?.critique ? <Pastille teinte="rouge">{a.comptes.critique} critique{a.comptes.critique > 1 ? "s" : ""}</Pastille> : null}
                {a.comptes?.attention ? <Pastille teinte="ambre">{a.comptes.attention} à vérifier</Pastille> : null}
              </div>
              <div className="tam-ligne-meta">
                <span>Demandée le {dateCourte(a.demandee_le)}</span>
                <span>{a.pieces.length} pièce{a.pieces.length > 1 ? "s" : ""}{a.pieces_non_lues?.length ? `, ${a.pieces_non_lues.length} non lue${a.pieces_non_lues.length > 1 ? "s" : ""}` : ""}</span>
                {a.motif ? <span>{a.motif}</span> : null}
                {a.statut === "finie" || a.statut === "partielle" ? <button type="button" className="esp-lien-bouton" onClick={() => void ouvrir(a)}>Lire</button> : null}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={!!ouverte} onOpenChange={(o) => !o && setOuverte(null)}>
        <DialogContent className="tam-cabinet-dialogue">
          {ouverte ? (
            <>
              <DialogHeader>
                <DialogIcone><ScrollText width={18} height={18} aria-hidden="true" /></DialogIcone>
                <DialogTitle>{libelleType(ouverte.analyse.type)}{clair ? ` — ${clair.reference}` : ""}</DialogTitle>
                <DialogDescription>{r ? `${r.pieces_lues ?? ouverte.analyse.pieces.length} pièce(s) lue(s), ${r.constats.length} constat(s). Déchiffré dans votre navigateur.` : "Le résultat n'est pas lisible."}</DialogDescription>
              </DialogHeader>
              <DialogBody>
                <div className="esp-form">
                  {ouverte.erreur ? <Avis teinte="ambre">{ouverte.erreur}</Avis> : null}
                  {ouverte.analyse.statut === "partielle" ? <Avis teinte="ambre">Lecture partielle : le plafond de coût est atteint, {ouverte.analyse.pieces_non_lues?.length ?? 0} pièce(s) n&apos;ont pas été lues.</Avis> : null}
                  {r?.resume ? <p className="tam-analyse-resume">{r.resume}</p> : null}
                  {r?.constats.map((c, i) => {
                    const meta = resumeDonnees(r.type, c.donnees);
                    return (
                      <div key={i} className="tam-ligne tam-constat">
                        <div className="tam-ligne-haut">
                          <span className="tam-ligne-titre">{c.titre}</span>
                          <Pastille teinte="gris" contour>{libelleCode(c.code)}</Pastille>
                          {c.gravite !== "info" ? <Pastille teinte={c.gravite === "critique" ? "rouge" : "ambre"}>{c.gravite === "critique" ? "Critique" : "À vérifier"}</Pastille> : null}
                        </div>
                        {meta ? <div className="tam-ligne-meta"><span>{meta}</span></div> : null}
                        {c.texte ? <p className="tam-constat-texte">{c.texte}</p> : null}
                        <ul className="tam-citations">
                          {c.citations.map((x, j) => (
                            <li key={j}>
                              <span className="esp-mono">{nomPiece(x.piece)}, p. {x.page}{lignesDe(x) ? `, ${lignesDe(x)}` : ""}</span> — « {x.extrait} »{" "}
                              {x.verifiee ? <Pastille teinte="vert">Vérifiée</Pastille> : <Pastille teinte="ambre">Non vérifiée</Pastille>}
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                  {r ? <iframe ref={cadre} className="tam-analyse-impression" title="Document à imprimer" srcDoc={doc} sandbox="allow-modals allow-same-origin" tabIndex={-1} aria-hidden="true" /> : null}
                </div>
              </DialogBody>
              <DialogFooter>
                <button type="button" className="r-btn r-btn--fil" onClick={() => setOuverte(null)}>Fermer</button>
                <button type="button" className="r-btn r-btn--fil" disabled={!r} onClick={exporterWord}><FileDown width={15} height={15} aria-hidden="true" /> Word</button>
                <button type="button" className="r-btn r-btn--noir" disabled={!r} onClick={() => cadre.current?.contentWindow?.print()}><Printer width={15} height={15} aria-hidden="true" /> Imprimer ou PDF</button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </section>
  );
}
