"use client";

/* ══════════════════════════════════════════════════════════════════════
   CASHD — la fiche d'un compte client (06/10/2026, session C2)

   Le compte (contact de facturation, plafond, statut), sa balance âgée,
   chaque pièce avec son reste dû, son retard, le palier atteint et le
   palier suivant (vue cashd_suivi), ses règlements. Trois gestes :
   noter un règlement, mettre le compte en pause (ou le reprendre, avec
   un motif : une décision, jamais un délai), mettre une facture en
   litige. Chacun passe par sa porte et reste au journal.
   ══════════════════════════════════════════════════════════════════════ */

import { useState } from "react";
import { Banknote, CalendarRange, FileDown, Gauge, PauseCircle, PlayCircle, Scale } from "lucide-react";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import { Avis, Def, Pastille, Vide } from "../ui";
import { dateCourte, montant } from "../format";
import { libellePalier, libelleSequence, STATUTS_COMPTE } from "./etats";
import { etatPiece, jourParis } from "./calcul";
import type { Fiche, Piece, StatutCompte } from "./types";

type Geste =
  | { type: "reglement"; facture: Piece | null }
  | { type: "statut"; vers: StatutCompte }
  | { type: "litige"; facture: Piece; ouvrir: boolean }
  | { type: "echeancier"; facture: Piece }
  | { type: "conteste"; facture: Piece }
  | { type: "plafond"; propose: number | null; base: string };

export type Actions = {
  noterReglement: (o: { montant: number; date: string; reference: string | null; mode: string | null; facture: string | null }) => Promise<string>;
  changerStatut: (statut: StatutCompte, motif: string) => Promise<string>;
  litige: (facture: string, ouvrir: boolean, motif: string) => Promise<string>;
  echeancier: (facture: string, echeances: { echeance: string; montant: number }[], motif: string) => Promise<string>;
  contester: (facture: string, montant: number, motif: string) => Promise<string>;
  dossier: () => Promise<void>;
  proposerPlafond: () => Promise<{ propose: number | null; base: string }>;
  fixerPlafond: (plafond: number | null, motif: string) => Promise<string>;
};

function nombre(t: string): number {
  return Number(t.replace(/[\s\u00a0\u202f€]/g, "").replace(",", "."));
}

/* Un échéancier proposé : le reste dû en n mensualités, la première dans 7 jours. */
function echeancesProposees(reste: number, n: number): { echeance: string; montant: string }[] {
  const base = Math.floor((reste / n) * 100) / 100;
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(`${jourParis()}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + 7);
    d.setUTCMonth(d.getUTCMonth() + i);
    const montant = i === n - 1 ? Math.round((reste - base * (n - 1)) * 100) / 100 : base;
    return { echeance: d.toISOString().slice(0, 10), montant: montant.toFixed(2).replace(".", ",") };
  });
}

const MODES = [
  { cle: "virement", libelle: "Virement" },
  { cle: "cheque", libelle: "Chèque" },
  { cle: "prelevement", libelle: "Prélèvement" },
  { cle: "carte", libelle: "Carte" },
  { cle: "especes", libelle: "Espèces" },
  { cle: "autre", libelle: "Autre" },
];

export default function FicheCompte({ fiche, actions }: { fiche: Fiche; actions: Actions }) {
  const c = fiche.compte;
  const b = fiche.balance;
  const statut = STATUTS_COMPTE[c.statut];
  const pieces = fiche.pieces.map((p) => etatPiece(p)).sort((x, y) => Number(y.reste_du > 0) - Number(x.reste_du > 0) || (x.echeance ?? "").localeCompare(y.echeance ?? ""));
  const suivi = (id: string) => fiche.suivi.find((s) => s.facture_id === id);

  const [geste, setGeste] = useState<Geste | null>(null);
  const [motif, setMotif] = useState("");
  const [f, setF] = useState({ montant: "", date: jourParis(), reference: "", mode: "virement" });
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [fait, setFait] = useState<string | null>(null);
  const [lignesEch, setLignesEch] = useState<{ echeance: string; montant: string }[]>([]);
  const [plafond, setPlafond] = useState("");
  const [telecharge, setTelecharge] = useState(false);

  const ouvrir = (g: Geste) => {
    setErreur(null);
    setMotif("");
    setF({ montant: g.type === "reglement" && g.facture ? String(g.facture.reste_du) : "", date: jourParis(), reference: "", mode: "virement" });
    if (g.type === "echeancier") setLignesEch(echeancesProposees(g.facture.reste_du, 3));
    if (g.type === "plafond") setPlafond(g.propose !== null ? String(g.propose) : c.plafond_encours !== null ? String(c.plafond_encours) : "");
    setGeste(g);
  };
  const ouvrirPlafond = async () => {
    setErreur(null);
    try {
      const p = await actions.proposerPlafond();
      ouvrir({ type: "plafond", propose: p.propose, base: p.base });
    } catch (e) {
      setFait(null);
      setErreur(e instanceof Error ? e.message : "La proposition n'a pas pu être lue.");
    }
  };
  const telecharger = async () => {
    setTelecharge(true);
    try {
      await actions.dossier();
    } finally {
      setTelecharge(false);
    }
  };
  const totalEch = Math.round(lignesEch.reduce((t, l) => t + (nombre(l.montant) || 0), 0) * 100) / 100;

  const valeurMontant = Number(f.montant.replace(/\s/g, "").replace(",", "."));
  const pret =
    geste?.type === "reglement"
      ? Number.isFinite(valeurMontant) && valeurMontant > 0 && f.date <= jourParis()
      : geste?.type === "echeancier"
        ? motif.trim().length > 2 && lignesEch.length > 0 && Math.abs(totalEch - geste.facture.reste_du) < 0.005 && lignesEch.every((l, i) => l.echeance && (i === 0 || l.echeance > lignesEch[i - 1].echeance))
        : geste?.type === "conteste"
          ? motif.trim().length > 2 && valeurMontant > 0 && valeurMontant < geste.facture.reste_du
          : geste?.type === "plafond"
            ? motif.trim().length > 2 && (plafond.trim() === "" || nombre(plafond) >= 0)
            : motif.trim().length > 2;

  const valider = async () => {
    if (!geste) return;
    setEnvoi(true);
    setErreur(null);
    try {
      let msg = "";
      if (geste.type === "reglement") {
        msg = await actions.noterReglement({ montant: valeurMontant, date: f.date, reference: f.reference.trim() || null, mode: f.mode, facture: geste.facture?.id ?? null });
      } else if (geste.type === "statut") {
        msg = await actions.changerStatut(geste.vers, motif.trim());
      } else if (geste.type === "echeancier") {
        msg = await actions.echeancier(geste.facture.id, lignesEch.map((l) => ({ echeance: l.echeance, montant: nombre(l.montant) })), motif.trim());
      } else if (geste.type === "conteste") {
        msg = await actions.contester(geste.facture.id, valeurMontant, motif.trim());
      } else if (geste.type === "plafond") {
        msg = await actions.fixerPlafond(plafond.trim() === "" ? null : nombre(plafond), motif.trim());
      } else {
        msg = await actions.litige(geste.facture.id, geste.ouvrir, motif.trim());
      }
      setFait(msg);
      setGeste(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base a refusé.");
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <div className="esp-carte">
      <div className="esp-carte-tete">
        <h2 className="esp-carte-titre">{c.nom}</h2>
        <Pastille teinte={statut.teinte}>{statut.libelle}</Pastille>
      </div>
      <div className="esp-carte-corps">
        {c.statut !== "actif" && c.statut_motif ? (
          <div style={{ marginBottom: 12 }}>
            <Avis teinte="ambre">
              <strong>{statut.libelle}{c.statut_le ? ` depuis le ${dateCourte(c.statut_le)}` : ""}.</strong> {c.statut_motif} Aucune relance ne part tant que vous ne le reprenez pas.
            </Avis>
          </div>
        ) : null}
        <dl className="esp-def esp-def--trois">
          <Def etiquette="Référence">{c.reference}{c.secteur ? ` · ${c.secteur}` : ""}</Def>
          <Def etiquette="Facturation">{c.contact_facturation_email ? `${c.contact_facturation_nom ? `${c.contact_facturation_nom} — ` : ""}${c.contact_facturation_email}` : "Aucune adresse : la relance ne peut pas partir"}</Def>
          <Def etiquette="Plafond d'encours">{c.plafond_encours !== null ? montant(c.plafond_encours) : "—"}</Def>
          <Def etiquette="Échu" fort>{montant(b?.echu ?? 0)}</Def>
          <Def etiquette="Encours">{montant(b?.encours ?? 0)}{b?.depasse_plafond || (c.plafond_encours !== null && (b?.encours ?? 0) > c.plafond_encours) ? " — au-dessus du plafond" : ""}</Def>
          <Def etiquette="Crédits à déduire">{montant(b?.credits ?? 0)}</Def>
        </dl>
        <div className="esp-actions" style={{ marginTop: 12 }}>
          <button type="button" className="r-btn r-btn--noir" onClick={() => ouvrir({ type: "reglement", facture: null })}>
            <Banknote width={15} height={15} aria-hidden="true" /> Noter un règlement
          </button>
          <button type="button" className="r-btn" onClick={() => void ouvrirPlafond()}>
            <Gauge width={15} height={15} aria-hidden="true" /> Plafond
          </button>
          <button type="button" className="r-btn" disabled={telecharge} onClick={() => void telecharger()}>
            {telecharge ? <Loader variant="spin" /> : <FileDown width={15} height={15} aria-hidden="true" />} Dossier
          </button>
          {c.statut === "actif" ? (
            <button type="button" className="r-btn" onClick={() => ouvrir({ type: "statut", vers: "pause" })}>
              <PauseCircle width={15} height={15} aria-hidden="true" /> Mettre en pause
            </button>
          ) : (
            <button type="button" className="r-btn" onClick={() => ouvrir({ type: "statut", vers: "actif" })}>
              <PlayCircle width={15} height={15} aria-hidden="true" /> Reprendre les relances
            </button>
          )}
        </div>
        {fait ? <div style={{ marginTop: 12 }}><Avis teinte="vert" role="status"><strong>C&apos;est fait.</strong> {fait}</Avis></div> : null}
      </div>

      <div className="esp-carte-corps">
        <h3 className="esp-section-titre">Pièces et relances</h3>
        {pieces.length === 0 ? (
          <Vide titre="Aucune pièce">Les factures du compte arrivent avec l&apos;export du facturier.</Vide>
        ) : (
          <div className="esp-tableau-cadre">
            <table className="esp-tableau c2-pieces">
              <thead>
                <tr>
                  <th scope="col">Pièce</th>
                  <th scope="col">Échéance</th>
                  <th scope="col" className="esp-num">Reste dû</th>
                  <th scope="col">Relance</th>
                  <th scope="col"><span className="c2-masque">Gestes</span></th>
                </tr>
              </thead>
              <tbody>
                {pieces.map((p) => {
                  const s = suivi(p.id);
                  const facture = p.nature === "facture" || p.nature === "acompte";
                  return (
                    <tr key={p.id} data-solde={p.reste_du <= 0 && p.nature !== "devis" ? "" : undefined}>
                      <td>
                        <strong>{p.numero}</strong>
                        <span className="c2-sous">{p.nature === "devis" ? `Devis du ${dateCourte(p.date_emission)} · ${p.jours_ecoules} j sans réponse` : p.nature === "avoir" ? `Avoir du ${dateCourte(p.date_emission)}` : `Du ${dateCourte(p.date_emission)} · ${montant(p.montant_ttc)} TTC`}</span>
                      </td>
                      <td>
                        {p.echeance ? dateCourte(p.echeance) : "—"}
                        {p.retard_jours > 0 ? <span className="c2-sous c2-retard">{p.retard_jours} j de retard</span> : null}
                        {p.echeance_origine ? <span className="c2-sous">échéancier (au lieu du {dateCourte(p.echeance_origine)})</span> : null}
                      </td>
                      <td className="esp-num">
                        {p.nature === "devis" ? montant(p.montant_ttc) : p.statut === "soldee" ? <Pastille teinte="vert">Soldée</Pastille> : montant(p.reste_du, p.devise ?? "EUR")}
                        {p.montant_conteste ? <span className="c2-sous">dont {montant(p.montant_conteste)} contestés</span> : null}
                        {p.devise && p.devise !== "EUR" && p.reste_du_eur !== null && p.reste_du_eur !== undefined ? <span className="c2-sous">soit {montant(p.reste_du_eur)}</span> : null}
                      </td>
                      <td>
                        {p.statut === "litige" ? <Pastille teinte="rouge">En litige</Pastille> : s ? (
                          <>
                            <span>{libelleSequence(s)}</span>
                            {s.palier_suivant ? <span className="c2-sous">Suivant : {libellePalier(s.palier_suivant).toLowerCase()} le {dateCourte(s.palier_suivant_le)}</span> : null}
                          </>
                        ) : <span className="c2-sous">—</span>}
                      </td>
                      <td>
                        {facture && p.statut === "ouverte" && p.reste_du > 0 ? (
                          <span className="c2-gestes">
                            <button type="button" className="esp-lien-bouton" onClick={() => ouvrir({ type: "reglement", facture: p })}>Règlement</button>
                            <button type="button" className="esp-lien-bouton" onClick={() => ouvrir({ type: "echeancier", facture: p })}>Échéancier</button>
                            <button type="button" className="esp-lien-bouton" onClick={() => ouvrir({ type: "conteste", facture: p })}>Contestation partielle</button>
                            <button type="button" className="esp-lien-bouton" onClick={() => ouvrir({ type: "litige", facture: p, ouvrir: true })}>Litige</button>
                          </span>
                        ) : facture && p.statut === "litige" ? (
                          <button type="button" className="esp-lien-bouton" onClick={() => ouvrir({ type: "litige", facture: p, ouvrir: false })}>Clore le litige</button>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {fiche.reglements.length ? (
        <div className="esp-carte-corps">
          <h3 className="esp-section-titre">Règlements</h3>
          <ul className="c2-reglements">
            {fiche.reglements.map((r) => (
              <li key={r.id}>
                <span>{dateCourte(r.recu_le)} · {r.reference ?? r.libelle ?? r.mode ?? "sans référence"}</span>
                <span className="esp-num">{montant(r.montant)}</span>
                {r.statut === "annule" ? <Pastille teinte="gris">Annulé</Pastille> : r.a_imputer > 0 ? <Pastille teinte="ambre">{montant(r.a_imputer)} à rapprocher</Pastille> : <Pastille teinte="vert">Lettré</Pastille>}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <Dialog open={!!geste} onOpenChange={(o) => !o && setGeste(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone>
              {geste?.type === "reglement" ? <Banknote width={18} height={18} aria-hidden="true" /> : geste?.type === "litige" || geste?.type === "conteste" ? <Scale width={18} height={18} aria-hidden="true" /> : geste?.type === "echeancier" ? <CalendarRange width={18} height={18} aria-hidden="true" /> : geste?.type === "plafond" ? <Gauge width={18} height={18} aria-hidden="true" /> : <PauseCircle width={18} height={18} aria-hidden="true" />}
            </DialogIcone>
            <DialogTitle>
              {geste?.type === "reglement" ? "Noter un règlement" : geste?.type === "statut" ? (geste.vers === "actif" ? "Reprendre les relances" : "Mettre le compte en pause") : geste?.type === "echeancier" ? `Échéancier de ${geste.facture.numero}` : geste?.type === "conteste" ? `Contestation partielle de ${geste.facture.numero}` : geste?.type === "plafond" ? "Plafond d'encours" : geste?.type === "litige" && geste.ouvrir ? `Mettre ${geste.facture.numero} en litige` : "Clore le litige"}
            </DialogTitle>
            <DialogDescription>
              {geste?.type === "reglement"
                ? geste.facture
                  ? `Le règlement est imputé sur ${geste.facture.numero}. La relance prête de cette facture est coupée avant l'envoi.`
                  : "Sans facture désignée, CASHD le lettre seul s'il cite un numéro de facture, ou s'il a exactement le montant d'une facture ouverte ; sinon il reste à rapprocher."
                : geste?.type === "echeancier"
                  ? `L'échéancier remplace l'échéance d'origine : seule une échéance manquée relance le cycle. Les échéances doivent totaliser le reste dû (${montant(geste.facture.reste_du)}).`
                  : geste?.type === "conteste"
                    ? "La part contestée sort du cycle et le commercial du compte est prévenu ; le reste continue d'être relancé."
                    : geste?.type === "plafond"
                      ? geste.base
                      : geste?.type === "statut"
                  ? geste.vers === "actif"
                    ? "La reprise est une décision : dites pourquoi. Les relances reprennent au palier où elles en étaient."
                    : "Toute relance en attente de ce compte est coupée, y compris celle qui est déjà écrite. Le compte n'y revient que sur votre décision."
                  : "La facture sort du cycle de relance ; le motif reste au journal."}
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              {geste?.type === "reglement" ? (
                <>
                  <div className="esp-form-ligne">
                    <label className="rv-libelle">Montant reçu (€) <span className="esp-obligatoire">(obligatoire)</span>
                      <input className="rv-champ" inputMode="decimal" value={f.montant} onChange={(e) => setF({ ...f, montant: e.target.value })} placeholder="1 250,00" />
                    </label>
                    <label className="rv-libelle">Reçu le
                      <input className="rv-champ" type="date" max={jourParis()} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
                    </label>
                  </div>
                  <div className="esp-form-ligne">
                    <label className="rv-libelle">Référence
                      <input className="rv-champ" value={f.reference} onChange={(e) => setF({ ...f, reference: e.target.value })} placeholder="VIR SEPA … ou n° de chèque" />
                    </label>
                    <label className="rv-libelle">Moyen
                      <select className="rv-champ" value={f.mode} onChange={(e) => setF({ ...f, mode: e.target.value })}>
                        {MODES.map((m) => <option key={m.cle} value={m.cle}>{m.libelle}</option>)}
                      </select>
                    </label>
                  </div>
                </>
              ) : geste?.type === "echeancier" ? (
                <>
                  {lignesEch.map((l, i) => (
                    <div className="esp-form-ligne" key={i}>
                      <label className="rv-libelle">Échéance {i + 1}
                        <input className="rv-champ" type="date" value={l.echeance} onChange={(e) => setLignesEch(lignesEch.map((x, k) => (k === i ? { ...x, echeance: e.target.value } : x)))} />
                      </label>
                      <label className="rv-libelle">Montant (€)
                        <input className="rv-champ" inputMode="decimal" value={l.montant} onChange={(e) => setLignesEch(lignesEch.map((x, k) => (k === i ? { ...x, montant: e.target.value } : x)))} />
                      </label>
                    </div>
                  ))}
                  <div className="esp-actions">
                    {[2, 3, 4, 6].map((n) => (
                      <button key={n} type="button" className="esp-lien-bouton" onClick={() => geste.type === "echeancier" && setLignesEch(echeancesProposees(geste.facture.reste_du, n))}>{n} mensualités</button>
                    ))}
                  </div>
                  <p className="c2-sous">Total : {montant(totalEch)}{Math.abs(totalEch - geste.facture.reste_du) >= 0.005 ? ` — il doit faire ${montant(geste.facture.reste_du)}` : ""}</p>
                  <label className="rv-libelle">Motif (l&apos;accord du client) <span className="esp-obligatoire">(obligatoire)</span>
                    <textarea className="rv-champ" rows={2} value={motif} onChange={(e) => setMotif(e.target.value)} placeholder="Accord par téléphone avec la comptable, confirmé par courriel" />
                  </label>
                </>
              ) : geste?.type === "conteste" || geste?.type === "plafond" ? (
                <>
                  <label className="rv-libelle">{geste.type === "conteste" ? "Montant contesté (€)" : "Plafond (€, vide : aucun)"}
                    {geste.type === "conteste" ? (
                      <input className="rv-champ" inputMode="decimal" value={f.montant} onChange={(e) => setF({ ...f, montant: e.target.value })} placeholder="1 000,00" />
                    ) : (
                      <input className="rv-champ" inputMode="decimal" value={plafond} onChange={(e) => setPlafond(e.target.value)} placeholder="20 000" />
                    )}
                  </label>
                  <label className="rv-libelle">Motif <span className="esp-obligatoire">(obligatoire)</span>
                    <textarea className="rv-champ" rows={2} value={motif} onChange={(e) => setMotif(e.target.value)} placeholder={geste.type === "conteste" ? "Le client conteste la ligne « pose » (courriel du …)" : "Proposé par CASHD depuis l'historique"} />
                  </label>
                </>
              ) : (
                <label className="rv-libelle">Motif <span className="esp-obligatoire">(obligatoire)</span>
                  <textarea className="rv-champ" rows={3} value={motif} onChange={(e) => setMotif(e.target.value)} placeholder={geste?.type === "litige" ? "Le client conteste la quantité livrée (courriel du …)" : "Paiement promis pour vendredi par le gérant"} />
                </label>
              )}
              {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={!pret || envoi} onClick={valider}>{envoi ? <Loader variant="spin" /> : null} Valider</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
