"use client";

/* ══════════════════════════════════════════════════════════════════════
   Décider en lot (06/10/2026)

   Plusieurs demandes cochées dans la file, une décision et un commentaire.
   Rien de neuf côté base : une approbation par demande (INSERT dans
   public.approbations, comme à l'unité), dans l'ordre de la file.

   Avant le clic, chaque demande repasse par les mêmes garde-fous qu'à
   l'unité (regles.ts → verdict : séparation saisie / approbation, déjà
   décidé, équipe, rôle, délégation) et par ses exigences : une demande qui
   exige une pièce jointe se décide une par une (la pièce lui est propre) ;
   le commentaire et le motif de refus sont exigés dès qu'une demande du
   lot les exige. Celles qui ne passent pas sont écartées, avec leur raison.
   Après, un bilan ligne à ligne : décidée, ou refusée par la base avec
   son message tel quel.
   ══════════════════════════════════════════════════════════════════════ */

import { useState } from "react";
import { Check, ListChecks, X } from "lucide-react";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import type { Source } from "../source";
import { Avis } from "../ui";
import { montant } from "../format";
import type { Approbation, Delegation, Demande, EquipesContexte } from "../types";
import { MOTIFS_REFUS, exigences, verdict, type Decideur } from "./regles";
import { decider } from "./portes";

export type Eligibilite = { demande: Demande; ok: true; au_nom_de: Delegation | null } | { demande: Demande; ok: false; raison: string };

/* ce qui se décide en lot, et pourquoi pas */
export function eligibilite(d: Demande, moi: Decideur, approbations: Approbation[], delegations: Delegation[], equipes: EquipesContexte): Eligibilite {
  const v = verdict(d, moi, approbations, delegations, new Date(), equipes);
  if (!v.peut) return { demande: d, ok: false, raison: v.raison };
  if (exigences(d).piece_jointe) return { demande: d, ok: false, raison: "La règle exige une pièce jointe propre à cette demande : décidez-la une par une." };
  return { demande: d, ok: true, au_nom_de: v.au_nom_de };
}

type Ligne = { demande: Demande; ok: boolean; message: string };

export default function DecisionLot({
  ouvert,
  decision,
  choisies,
  moi,
  source,
  approbations,
  delegations,
  equipes,
  nommer,
  onDecisionLocale,
  recharger,
  onFermer,
}: {
  ouvert: boolean;
  decision: "approuve" | "rejete";
  choisies: Demande[];
  moi: Decideur;
  source: Source;
  approbations: Approbation[];
  delegations: Delegation[];
  equipes: EquipesContexte;
  nommer: (id: string | null | undefined) => string;
  onDecisionLocale: (a: Approbation) => void;
  recharger: () => Promise<void>;
  onFermer: (bilan: Ligne[] | null) => void;
}) {
  const [commentaire, setCommentaire] = useState("");
  const [motif, setMotif] = useState("");
  const [motifLibre, setMotifLibre] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [bilan, setBilan] = useState<Ligne[] | null>(null);

  /* figé à l'ouverture (le dialogue est monté à chaque ouverture) : la
     file se relit pendant l'envoi, et une demande décidée deviendrait
     « déjà décidée » au milieu du bilan */
  const [lot] = useState(() => choisies.map((d) => eligibilite(d, moi, approbations, delegations, equipes)));
  const retenues = lot.filter((e): e is Extract<Eligibilite, { ok: true }> => e.ok);
  const ecartees = lot.filter((e): e is Extract<Eligibilite, { ok: false }> => !e.ok);

  const exigeCommentaire = retenues.some((e) => exigences(e.demande).commentaire);
  const exigeMotif = decision === "rejete";
  const motifComplet = motif === MOTIFS_REFUS[MOTIFS_REFUS.length - 1] || !motif ? motifLibre.trim() : `${motif}${motifLibre.trim() ? ` — ${motifLibre.trim()}` : ""}`;
  const pret = retenues.length > 0 && (!exigeCommentaire || commentaire.trim().length >= 3) && (!exigeMotif || motifComplet.length >= 3);
  const total = retenues.reduce((s, e) => s + (e.demande.montant ?? 0), 0);

  async function envoyer() {
    setEnvoi(true);
    const lignes: Ligne[] = [];
    const texte = decision === "approuve" ? commentaire.trim() : [motifComplet, commentaire.trim()].filter(Boolean).join(" — ");
    for (const e of retenues) {
      try {
        if (source === "reelle") {
          await decider({ demande: e.demande, user_id: moi.id, decision, commentaire: texte || null, au_nom_de: e.au_nom_de });
        } else {
          await new Promise((r) => setTimeout(r, 120));
          onDecisionLocale({
            id: crypto.randomUUID(),
            demande_id: e.demande.id,
            client_id: e.demande.client_id,
            user_id: moi.id,
            au_nom_de: e.au_nom_de?.delegant ?? null,
            delegation_id: e.au_nom_de?.id ?? null,
            decision,
            commentaire: texte || null,
            piece_id: null,
            decide_le: new Date().toISOString(),
          });
        }
        lignes.push({ demande: e.demande, ok: true, message: e.au_nom_de ? `${decision === "approuve" ? "Approuvée" : "Refusée"} au nom de ${nommer(e.au_nom_de.delegant)}` : decision === "approuve" ? "Approuvée" : "Refusée" });
      } catch (err) {
        lignes.push({ demande: e.demande, ok: false, message: err instanceof Error ? err.message : "La base a refusé la décision." });
      }
      setBilan([...lignes]);
    }
    if (source === "reelle") await recharger().catch(() => undefined);
    setEnvoi(false);
  }

  const reussies = bilan?.filter((l) => l.ok).length ?? 0;

  return (
    <Dialog open={ouvert} onOpenChange={(o) => !o && !envoi && onFermer(bilan)}>
      <DialogContent>
        <DialogHeader>
          <DialogIcone>{decision === "approuve" ? <ListChecks width={18} height={18} aria-hidden="true" /> : <X width={18} height={18} aria-hidden="true" />}</DialogIcone>
          <DialogTitle>{decision === "approuve" ? "Approuver en lot" : "Refuser en lot"}</DialogTitle>
          <DialogDescription>
            {bilan
              ? `${reussies} sur ${retenues.length} décidée${reussies > 1 ? "s" : ""}.`
              : `${retenues.length} demande${retenues.length > 1 ? "s" : ""} retenue${retenues.length > 1 ? "s" : ""}${total ? ` · ${montant(total)}` : ""}. Une décision est enregistrée pour chacune, en votre nom, avec le même ${decision === "approuve" ? "commentaire" : "motif"}.`}
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <div className="esp-form">
            {bilan ? (
              <ul className="esp-fil esp-lot-bilan" aria-live="polite">
                {bilan.map((l) => (
                  <li key={l.demande.id}>
                    <span className="esp-fil-point" data-teinte={l.ok ? "vert" : "rouge"} />
                    <div>
                      <div className="esp-fil-texte">{l.demande.resume}</div>
                      <div className="esp-fil-meta">{l.ok ? <><Check width={12} height={12} aria-hidden="true" /> {l.message}</> : <>Refusé par la base : {l.message}</>}</div>
                    </div>
                  </li>
                ))}
                {envoi ? <li><span className="esp-fil-point" /><div className="esp-fil-meta"><Loader variant="spin" /> {retenues.length - bilan.length} en cours…</div></li> : null}
              </ul>
            ) : (
              <>
                <ul className="esp-fil esp-lot-retenues">
                  {retenues.map((e) => (
                    <li key={e.demande.id}>
                      <span className="esp-fil-point" data-teinte="bleu" />
                      <div>
                        <div className="esp-fil-texte">{e.demande.resume}</div>
                        <div className="esp-fil-meta">
                          {e.demande.montant !== null ? montant(e.demande.montant, e.demande.devise) : "sans montant"}
                          {e.au_nom_de ? ` · au nom de ${nommer(e.au_nom_de.delegant)}` : ""}
                          {exigences(e.demande).commentaire ? " · commentaire exigé" : ""}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
                {ecartees.length ? (
                  <Avis teinte="ambre">
                    <strong>{ecartees.length} demande{ecartees.length > 1 ? "s" : ""} écartée{ecartees.length > 1 ? "s" : ""} du lot.</strong>
                    <ul className="esp-lot-ecartees">
                      {ecartees.map((e) => (
                        <li key={e.demande.id}><b>{e.demande.resume}</b> — {e.raison}</li>
                      ))}
                    </ul>
                  </Avis>
                ) : null}
                {decision === "rejete" ? (
                  <>
                    <label className="rv-libelle">Motif du refus <span className="esp-obligatoire">(obligatoire)</span>
                      <select className="rv-champ" value={motif} onChange={(e) => setMotif(e.target.value)}>
                        <option value="">Choisir un motif…</option>
                        {MOTIFS_REFUS.map((m) => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </label>
                    <label className="rv-libelle">Précision
                      <input className="rv-champ" value={motifLibre} onChange={(e) => setMotifLibre(e.target.value)} maxLength={300} />
                    </label>
                  </>
                ) : null}
                <label className="rv-libelle">
                  Commentaire {exigeCommentaire ? <span className="esp-obligatoire">(obligatoire : une demande du lot l&apos;exige)</span> : <span className="esp-kpi-sous">(facultatif)</span>}
                  <textarea className="rv-champ" value={commentaire} onChange={(e) => setCommentaire(e.target.value)} maxLength={2000} placeholder={decision === "approuve" ? "Ce que vous avez vérifié, valable pour tout le lot." : "Précisions sur le refus."} />
                </label>
              </>
            )}
            {bilan && !envoi && bilan.some((l) => !l.ok) ? <Avis teinte="rouge" role="alert">Les demandes refusées par la base restent dans la file : ouvrez-les une par une pour voir pourquoi.</Avis> : null}
          </div>
        </DialogBody>
        <DialogFooter>
          {bilan ? (
            <button type="button" className="r-btn r-btn--noir" disabled={envoi} onClick={() => onFermer(bilan)}>Fermer</button>
          ) : (
            <button type="button" className={`r-btn ${decision === "approuve" ? "r-btn--vert" : "r-btn--rouge"}`} disabled={!pret || envoi} onClick={() => void envoyer()}>
              {envoi ? <Loader variant="spin" /> : null} {decision === "approuve" ? `Approuver ${retenues.length} demande${retenues.length > 1 ? "s" : ""}` : `Refuser ${retenues.length} demande${retenues.length > 1 ? "s" : ""}`}
            </button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function Coche({ coche, onChange, libelle, desactive }: { coche: boolean; onChange: (v: boolean) => void; libelle: string; desactive?: boolean }) {
  return (
    <label className="esp-item-coche" title={libelle}>
      <input type="checkbox" checked={coche} disabled={desactive} onChange={(e) => onChange(e.target.checked)} aria-label={libelle} />
    </label>
  );
}
