"use client";

/* ══════════════════════════════════════════════════════════════════════
   Les avis RPVA reçus par courriel, à rattacher (06/10/2026, session B4,
   b4_10)

   Le cabinet fait suivre ses notifications e-barreau vers l'adresse de
   réception d'Omega ; chaque courriel entre dans cette file. Ici, et ici
   seulement, il se lit en clair : le n° RG qu'il cite est comparé aux
   n° RG des dossiers que ce navigateur sait déchiffrer, pour PROPOSER
   le dossier. L'avocat choisit ; chaque pièce jointe est chiffrée avec
   la clé du dossier et déposée ; la copie en clair est alors effacée
   (réception vidée, fichiers effacés par l'ouvrier tamila-purge). Sans
   rattachement, elle l'est au bout de sept jours.
   ══════════════════════════════════════════════════════════════════════ */

import { useEffect, useMemo, useState } from "react";
import { Inbox, Link2 } from "lucide-react";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import type { Source } from "../source";
import { Avis, Pastille } from "../ui";
import { dateCourte } from "../format";
import { chiffrerOctets, empreinte } from "./chiffrement";
import * as portes from "./portes";
import { TYPES_AVIS } from "./regles";
import type { Clair, Dossier } from "./types";

type Props = {
  source: Source;
  clientId: string;
  /* les dossiers où l'on peut rattacher, avec leur clair s'il est connu */
  dossiers: { dossier: Dossier; clair: Clair | null }[];
  /* la clé d'un dossier : trousseau, coffre ou phrase (EcranTamila) */
  cleDe: (dossier: string) => Promise<CryptoKey | null>;
  /* un avocat du cabinet : il peut écarter un avis */
  avocat: boolean;
  onRattache: (dossier: string) => void;
};

const MOTIFS_ECART: Record<string, string> = { pas_un_avis: "Ce n'est pas un avis RPVA", doublon: "Doublon d'un avis déjà rattaché", autre_cabinet: "Destiné à un autre cabinet", deja_saisi: "Déjà saisi à la main" };

/** Le n° RG cité par un courriel e-barreau : « RG 26/01234 », « N° RG : 26/01234 », ou un motif AA/NNNNN isolé. */
export function rgCite(texte: string | null | undefined): string | null {
  if (!texte) return null;
  const m = texte.match(/R\.?\s?G\.?\s*(?:n[°o]\s*)?:?\s*(\d{2}\s?\/\s?\d{3,6})/i) ?? texte.match(/(?:^|[^\d/])(\d{2}\/\d{4,6})(?![\d/])/);
  return m ? m[1].replace(/\s/g, "") : null;
}
const normaliserRg = (rg: string) => rg.replace(/[^0-9/]/g, "");

/* En exemple : deux avis en attente, l'un cite le RG du dossier 2026-0412. */
const EXEMPLE: portes.AvisEntrant[] = [
  {
    id: "00000000-0000-4000-8000-0000000000e1", reception_id: 1, recu_le: new Date(Date.now() - 2 * 3600_000).toISOString(), type_suppose: "rpva_avis_fixation", nb_pieces: 1, statut: "a_rattacher",
    expire_le: new Date(Date.now() + 7 * 86_400_000).toISOString(),
    reception: { sujet: "Cour d'appel de Paris — Avis de fixation à bref délai — RG 26/01234", corps: "Avis de fixation de l'affaire à l'audience du 04/02/2027.", de_nom: "e-barreau", de_adresse: "notification@e-barreau.fr", pieces: [{ nom: "avis-fixation.pdf", mime: "application/pdf", taille: 48_211, chemin: "exemple" }] },
  },
  {
    id: "00000000-0000-4000-8000-0000000000e2", reception_id: 2, recu_le: new Date(Date.now() - 26 * 3600_000).toISOString(), type_suppose: "rpva_conclusions", nb_pieces: 1, statut: "a_rattacher",
    expire_le: new Date(Date.now() + 6 * 86_400_000).toISOString(),
    reception: { sujet: "Notification de conclusions", corps: "Vous trouverez ci-joint les conclusions notifiées par le confrère.", de_nom: "e-barreau", de_adresse: "notification@e-barreau.fr", pieces: [{ nom: "conclusions.pdf", mime: "application/pdf", taille: 211_008, chemin: "exemple" }] },
  },
];

export default function AvisEntrantsTamila({ source, clientId, dossiers, cleDe, avocat, onRattache }: Props) {
  /* undefined : lecture ; null : la base n'a pas b4_10 */
  const [avis, setAvis] = useState<portes.AvisEntrant[] | null | undefined>(() => (source === "exemple" ? EXEMPLE : undefined));
  const [ouvert, setOuvert] = useState<{ type: "rattacher" | "ecarter"; avis: portes.AvisEntrant } | null>(null);
  const [choix, setChoix] = useState<Record<string, string>>({});
  const [envoi, setEnvoi] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [fait, setFait] = useState<string | null>(null);

  useEffect(() => {
    if (source !== "reelle") return;
    let actif = true;
    const t = window.setTimeout(async () => {
      const a = await portes.chargerAvisEntrants();
      if (actif) setAvis(a);
    }, 0);
    return () => {
      actif = false;
      window.clearTimeout(t);
    };
  }, [source]);

  /* le dossier proposé : celui dont le n° RG, déchiffré ici, est celui que cite le courriel */
  const proposes = useMemo(() => {
    const p: Record<string, string> = {};
    for (const a of avis ?? []) {
      const rg = rgCite(`${a.reception?.sujet ?? ""} ${a.reception?.corps ?? ""}`);
      if (!rg) continue;
      const d = dossiers.find((x) => x.clair?.numero_rg && normaliserRg(x.clair.numero_rg) === normaliserRg(rg));
      if (d) p[a.id] = d.dossier.id;
    }
    return p;
  }, [avis, dossiers]);

  if (!avis || avis.length === 0) return null;

  const refDe = (id: string) => dossiers.find((x) => x.dossier.id === id)?.clair?.reference ?? "dossier chiffré";
  const ouvrir = (type: "rattacher" | "ecarter", a: portes.AvisEntrant) => {
    setErreur(null);
    setFait(null);
    setChoix({ dossier: proposes[a.id] ?? "", type: a.type_suppose ?? "", motif: "pas_un_avis" });
    setOuvert({ type, avis: a });
  };

  const rattacher = async (a: portes.AvisEntrant) => {
    const dossier = choix.dossier;
    if (!dossier) return setErreur("Choisissez le dossier.");
    setEnvoi(a.id);
    setErreur(null);
    try {
      if (source === "reelle") {
        const cle = await cleDe(dossier);
        if (!cle) throw new Error("La clé de ce dossier n'est pas ouverte (phrase du cabinet ou coffre) : la pièce ne peut pas être chiffrée.");
        const pieces: string[] = [];
        for (const p of a.reception?.pieces ?? []) {
          const clair = await portes.telecharger(p.chemin);
          const chiffre = await chiffrerOctets(cle, clair);
          clair.fill(0);
          const sha = await empreinte(chiffre);
          const chemin = `${clientId}/tamila_dossier/${dossier}/${p.nom}.${sha.slice(0, 12)}.chiffre`;
          await portes.televerser(chemin, chiffre);
          const r = await portes.deposerPiece(dossier, p.nom, p.mime || "application/octet-stream", chiffre.length, sha, chemin, choix.type || null);
          pieces.push(r.piece_id);
        }
        if (!pieces.length) throw new Error("Ce courriel n'a pas de pièce jointe à rattacher : écartez-le, et saisissez l'avis à la main dans le dossier.");
        await portes.rattacherAvis(a.id, dossier, pieces);
      } else {
        await new Promise((r) => setTimeout(r, 400));
      }
      setAvis((x) => (x ? x.filter((y) => y.id !== a.id) : x));
      setOuvert(null);
      setFait(`Avis rattaché au dossier ${refDe(dossier)} : la pièce y est chiffrée, la copie reçue par courriel est effacée.`);
      onRattache(dossier);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Le rattachement a échoué.");
    } finally {
      setEnvoi(null);
    }
  };

  const ecarter = async (a: portes.AvisEntrant) => {
    setEnvoi(a.id);
    setErreur(null);
    try {
      if (source === "reelle") await portes.ecarterAvis(a.id, choix.motif || "pas_un_avis");
      else await new Promise((r) => setTimeout(r, 300));
      setAvis((x) => (x ? x.filter((y) => y.id !== a.id) : x));
      setOuvert(null);
      setFait("Avis écarté : sa copie reçue par courriel est effacée.");
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base a refusé.");
    } finally {
      setEnvoi(null);
    }
  };

  const a = ouvert?.avis ?? null;

  return (
    <section className="esp-carte tam-entrants" aria-label="Avis RPVA à rattacher">
      <div className="esp-carte-tete">
        <h2 className="esp-carte-titre"><Inbox width={16} height={16} aria-hidden="true" /> Avis RPVA à rattacher</h2>
        <Pastille teinte="ambre">{avis.length}</Pastille>
      </div>
      <div className="esp-carte-corps">
        {fait ? <Avis teinte="vert" role="status">{fait}</Avis> : null}
        <p className="esp-kpi-sous tam-notice">L&apos;avis transite en clair chez le prestataire de courriel et dans sa réception le temps du rattachement, sept jours au plus ; dès qu&apos;il est rattaché (ou écarté), cette copie est effacée.</p>
        {avis.map((x) => {
          const rg = rgCite(`${x.reception?.sujet ?? ""} ${x.reception?.corps ?? ""}`);
          return (
            <div key={x.id} className="tam-ligne">
              <div className="tam-ligne-haut">
                <span className="tam-ligne-titre">{x.reception?.sujet ?? "Avis reçu par courriel"}</span>
                {x.type_suppose ? <Pastille teinte="gris" contour>{TYPES_AVIS[x.type_suppose as keyof typeof TYPES_AVIS] ?? x.type_suppose}</Pastille> : null}
                {proposes[x.id] ? <Pastille teinte="vert">Dossier {refDe(proposes[x.id])} (même n° RG)</Pastille> : rg ? <Pastille teinte="ambre">RG {rg} : aucun dossier lisible</Pastille> : null}
              </div>
              <div className="tam-ligne-meta">
                <span>Reçu le {dateCourte(x.recu_le)}</span>
                <span>{x.nb_pieces} pièce{x.nb_pieces > 1 ? "s" : ""} jointe{x.nb_pieces > 1 ? "s" : ""}</span>
                <span>effacé le {dateCourte(x.expire_le)} s&apos;il n&apos;est pas rattaché</span>
                <button type="button" className="esp-lien-bouton" onClick={() => ouvrir("rattacher", x)}>Rattacher</button>
                {avocat ? <button type="button" className="esp-lien-bouton" onClick={() => ouvrir("ecarter", x)}>Écarter</button> : null}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={!!ouvert} onOpenChange={(o) => !o && !envoi && setOuvert(null)}>
        <DialogContent>
          {a && ouvert ? (
            <>
              <DialogHeader>
                <DialogIcone>{ouvert.type === "rattacher" ? <Link2 width={18} height={18} aria-hidden="true" /> : <Inbox width={18} height={18} aria-hidden="true" />}</DialogIcone>
                <DialogTitle>{ouvert.type === "rattacher" ? "Rattacher l'avis à son dossier" : "Écarter l'avis"}</DialogTitle>
                <DialogDescription>{a.reception?.sujet ?? "Avis reçu par courriel"}</DialogDescription>
              </DialogHeader>
              <DialogBody>
                <div className="esp-form">
                  {a.reception?.corps ? <blockquote className="tam-citation" tabIndex={0} role="region" aria-label="Texte du courriel reçu">{a.reception.corps.slice(0, 600)}</blockquote> : null}
                  {ouvert.type === "rattacher" ? (
                    <>
                      <label className="rv-libelle">Dossier<select className="rv-champ" value={choix.dossier ?? ""} onChange={(e) => setChoix((c) => ({ ...c, dossier: e.target.value }))}>
                        <option value="">— choisir —</option>
                        {dossiers.map((d) => <option key={d.dossier.id} value={d.dossier.id}>{d.clair ? `${d.clair.reference} — ${d.clair.intitule}` : `Dossier chiffré (${d.dossier.id.slice(0, 8)})`}{proposes[a.id] === d.dossier.id ? " · proposé" : ""}</option>)}
                      </select></label>
                      <label className="rv-libelle">Type d&apos;avis<select className="rv-champ" value={choix.type ?? ""} onChange={(e) => setChoix((c) => ({ ...c, type: e.target.value }))}>
                        <option value="">— à lire par le lecteur —</option>
                        {(Object.keys(TYPES_AVIS) as (keyof typeof TYPES_AVIS)[]).map((t) => <option key={t} value={t}>{TYPES_AVIS[t]}</option>)}
                      </select></label>
                      <Avis teinte="bleu">Chaque pièce jointe ({a.nb_pieces}) est chiffrée dans votre navigateur avec la clé du dossier, puis déposée ; le lecteur la lira et posera les délais. La copie reçue en clair est ensuite effacée.</Avis>
                    </>
                  ) : (
                    <label className="rv-libelle">Motif<select className="rv-champ" value={choix.motif ?? "pas_un_avis"} onChange={(e) => setChoix((c) => ({ ...c, motif: e.target.value }))}>{Object.entries(MOTIFS_ECART).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
                  )}
                  {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
                </div>
              </DialogBody>
              <DialogFooter>
                <button type="button" className="r-btn r-btn--fil" disabled={!!envoi} onClick={() => setOuvert(null)}>Fermer</button>
                <button type="button" className={`r-btn ${ouvert.type === "ecarter" ? "r-btn--rouge" : "r-btn--noir"}`} disabled={!!envoi} onClick={() => (ouvert.type === "rattacher" ? void rattacher(a) : void ecarter(a))}>
                  {envoi ? <Loader variant="spin" /> : null} {ouvert.type === "rattacher" ? "Chiffrer et rattacher" : "Écarter"}
                </button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </section>
  );
}
