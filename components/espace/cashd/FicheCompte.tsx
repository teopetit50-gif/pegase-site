"use client";

/* ══════════════════════════════════════════════════════════════════════
   CASHD — la fiche d'un compte client (06/10/2026, session C2)

   Le compte (contact de facturation, plafond, statut), sa balance âgée,
   chaque pièce avec son reste dû, son retard, le palier atteint et le
   palier suivant (vue cashd_suivi), ses règlements. Trois gestes :
   noter un règlement, mettre le compte en pause (ou le reprendre, avec
   un motif : une décision, jamais un délai), mettre une facture en
   litige. Chacun passe par sa porte et reste au journal.
   c2_04 : une facture attend un bon de commande (la relance va au service
   qui l'émet), un petit solde se décide (abandonné ou réclamé), un devis
   accepté de vive voix se consigne.
   c2_05 : les réponses reçues, lues et classées (contestation, contact
   parti, promesse), se tranchent ici — rien ne bascule seul ; les pièces
   (PDF de la facture, bon de livraison…) se joignent pour le dossier.
   ══════════════════════════════════════════════════════════════════════ */

import { useState } from "react";
import { Banknote, CalendarRange, ClipboardList, FileDown, Gauge, Handshake, Paperclip, PauseCircle, PlayCircle, Scale, Scissors } from "lucide-react";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import { Avis, Def, Pastille, Vide } from "../ui";
import { dateCourte, montant } from "../format";
import { libellePalier, libelleSequence, STATUTS_COMPTE } from "./etats";
import { etatPiece, jourParis } from "./calcul";
import type { Fiche, NaturePiece, Piece, ReponseLue, StatutCompte } from "./types";
import { CanalCompte } from "@/components/espace2/cashd/Raccords";

type Geste =
  | { type: "reglement"; facture: Piece | null }
  | { type: "statut"; vers: StatutCompte }
  | { type: "litige"; facture: Piece; ouvrir: boolean }
  | { type: "echeancier"; facture: Piece }
  | { type: "conteste"; facture: Piece }
  | { type: "plafond"; propose: number | null; base: string }
  | { type: "commande"; facture: Piece }
  | { type: "bon_recu"; facture: Piece }
  | { type: "solde"; facture: Piece }
  | { type: "accord"; devis: Piece }
  | { type: "piece" };

export type Actions = {
  noterReglement: (o: { montant: number; date: string; reference: string | null; mode: string | null; facture: string | null }) => Promise<string>;
  changerStatut: (statut: StatutCompte, motif: string) => Promise<string>;
  litige: (facture: string, ouvrir: boolean, motif: string) => Promise<string>;
  echeancier: (facture: string, echeances: { echeance: string; montant: number }[], motif: string) => Promise<string>;
  contester: (facture: string, montant: number, motif: string) => Promise<string>;
  dossier: (motif?: "litige" | "assurance_credit") => Promise<void>;
  proposerPlafond: () => Promise<{ propose: number | null; base: string }>;
  fixerPlafond: (plafond: number | null, motif: string) => Promise<string>;
  attendreCommande: (facture: string, email: string | null, nom: string | null, motif: string | null) => Promise<string>;
  deciderSolde: (facture: string, decision: "abandonne" | "reclame" | null, motif: string) => Promise<string>;
  consignerAccord: (devis: string, note: string, le: string) => Promise<string>;
  trancherReponse: (reponse: ReponseLue, accepter: boolean) => Promise<string>;
  joindrePiece: (facture: string, nature: NaturePiece, fichier: File) => Promise<string>;
};

const LECTURES: Record<ReponseLue["lecture"], string> = { contestation: "Contestation", absence: "Contact parti", promesse: "Règlement annoncé", autre: "Réponse" };
const PROPOSITIONS: Record<ReponseLue["proposition"], string> = {
  litige: "mettre les factures de la relance en litige",
  attente_contact: "mettre le compte en attente d'un nouveau contact",
  pause: "mettre le compte en pause le temps du règlement",
  aucune: "rien : lisez-la",
};
const NATURES: { cle: NaturePiece; libelle: string }[] = [
  { cle: "facture_pdf", libelle: "PDF de la facture" },
  { cle: "bon_livraison", libelle: "Bon de livraison" },
  { cle: "bon_commande", libelle: "Bon de commande" },
  { cle: "contrat", libelle: "Contrat" },
  { cle: "autre", libelle: "Autre pièce" },
];

const ADRESSE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

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
  const [service, setService] = useState({ email: "", nom: "" });
  const [decision, setDecision] = useState<"abandonne" | "reclame" | "">("abandonne");
  const [accordLe, setAccordLe] = useState(jourParis());
  const [jointe, setJointe] = useState<{ facture: string; nature: NaturePiece; fichier: File | null }>({ facture: "", nature: "facture_pdf", fichier: null });
  const [tranche, setTranche] = useState<string | null>(null);
  const facturesJoignables = fiche.pieces.filter((p) => p.nature === "facture" || p.nature === "acompte");
  const numero = (id: string) => fiche.pieces.find((p) => p.id === id)?.numero ?? "—";
  const trancher = async (x: ReponseLue, accepter: boolean) => {
    setTranche(x.id);
    setErreur(null);
    try {
      setFait(await actions.trancherReponse(x, accepter));
    } catch (e) {
      setFait(null);
      setErreur(e instanceof Error ? e.message : "La base a refusé.");
    } finally {
      setTranche(null);
    }
  };

  const ouvrir = (g: Geste) => {
    setErreur(null);
    setMotif("");
    setF({ montant: g.type === "reglement" && g.facture ? String(g.facture.reste_du) : "", date: jourParis(), reference: "", mode: "virement" });
    if (g.type === "echeancier") setLignesEch(echeancesProposees(g.facture.reste_du, 3));
    if (g.type === "plafond") setPlafond(g.propose !== null ? String(g.propose) : c.plafond_encours !== null ? String(c.plafond_encours) : "");
    if (g.type === "commande") setService({ email: g.facture.attente_commande_email ?? "", nom: g.facture.attente_commande_nom ?? "" });
    if (g.type === "solde") setDecision(g.facture.solde_decision === "abandonne" ? "reclame" : "abandonne");
    if (g.type === "accord") setAccordLe(jourParis());
    if (g.type === "piece") setJointe({ facture: facturesJoignables[0]?.id ?? "", nature: "facture_pdf", fichier: null });
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
  const telecharger = async (motif: "litige" | "assurance_credit" = "litige") => {
    setTelecharge(true);
    try {
      await actions.dossier(motif);
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
            : geste?.type === "commande"
              ? ADRESSE.test(service.email.trim()) && motif.trim().length > 2
              : geste?.type === "bon_recu"
                ? true
                : geste?.type === "piece"
                  ? !!jointe.facture && !!jointe.fichier
                : geste?.type === "accord"
                  ? motif.trim().length > 2 && accordLe >= geste.devis.date_emission && accordLe <= jourParis()
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
      } else if (geste.type === "commande") {
        msg = await actions.attendreCommande(geste.facture.id, service.email.trim(), service.nom.trim() || null, motif.trim());
      } else if (geste.type === "bon_recu") {
        msg = await actions.attendreCommande(geste.facture.id, null, null, null);
      } else if (geste.type === "solde") {
        msg = await actions.deciderSolde(geste.facture.id, decision || null, motif.trim());
      } else if (geste.type === "piece") {
        if (!jointe.fichier) return;
        msg = await actions.joindrePiece(jointe.facture, jointe.nature, jointe.fichier);
      } else if (geste.type === "accord") {
        msg = await actions.consignerAccord(geste.devis.id, motif.trim(), accordLe);
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
        {/* c2_51 : courriel ou WhatsApp pour ses rappels et relances */}
        <CanalCompte key={c.id} compte={c.id} canal={c.canal_relance ?? "email"} telephone={c.contact_facturation_telephone} />
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
          <button type="button" className="r-btn" disabled={telecharge} onClick={() => void telecharger("assurance_credit")}>
            <FileDown width={15} height={15} aria-hidden="true" /> Assurance-crédit
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
        {erreur && !geste ? <div style={{ marginTop: 12 }}><Avis teinte="rouge" role="alert">{erreur}</Avis></div> : null}
      </div>

      {(fiche.reponses_lues ?? []).length ? (
        <div className="esp-carte-corps" role="region" aria-label="Réponses à trancher">
          <h3 className="esp-section-titre">Réponses à trancher</h3>
          <ul className="c2-reponses">
            {(fiche.reponses_lues ?? []).map((x) => (
              <li key={x.id}>
                <span className="esp-item-haut">
                  <Pastille teinte={x.lecture === "contestation" ? "rouge" : x.lecture === "promesse" ? "vert" : "ambre"}>{LECTURES[x.lecture]}</Pastille>
                  <span className="c2-sous">reçue le {dateCourte(x.cree_le)}{x.indice ? ` · « ${x.indice} »` : ""}</span>
                </span>
                <span>Proposé : {PROPOSITIONS[x.proposition]}.</span>
                <span className="c2-gestes">
                  {x.proposition !== "aucune" ? (
                    <button type="button" className="r-btn r-btn--noir" disabled={tranche === x.id} onClick={() => void trancher(x, true)}>{tranche === x.id ? <Loader variant="spin" /> : null} Accepter</button>
                  ) : null}
                  <button type="button" className="r-btn" disabled={tranche === x.id} onClick={() => void trancher(x, false)}>{x.proposition === "aucune" ? "Lue" : "Écarter"}</button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

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
                        <span className="c2-sous">{p.nature === "devis" ? `Devis du ${dateCourte(p.date_emission)} · ${p.jours_ecoules} j sans réponse` : p.nature === "avoir" ? `Avoir du ${dateCourte(p.date_emission)}${p.facture_visee ? ` · sur ${p.facture_visee}` : ""}` : `Du ${dateCourte(p.date_emission)} · ${montant(p.montant_ttc)} TTC`}</span>
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
                        {p.relance_suspendue ? (
                          <>
                            <Pastille teinte="ambre">Relance suspendue</Pastille>
                            <span className="c2-sous">{p.relance_suspendue}</span>
                          </>
                        ) : p.attente_commande_le ? (
                          <>
                            <Pastille teinte="ambre">Attend un bon de commande</Pastille>
                            <span className="c2-sous">depuis le {dateCourte(p.attente_commande_le)} · relance à {p.attente_commande_nom ?? p.attente_commande_email}</span>
                          </>
                        ) : p.solde_decision ? (
                          <Pastille teinte={p.solde_decision === "abandonne" ? "gris" : "bleu"}>{p.solde_decision === "abandonne" ? "Solde abandonné" : "Solde réclamé"}</Pastille>
                        ) : p.accord_oral_le ? (
                          <>
                            <Pastille teinte="vert">Accepté de vive voix</Pastille>
                            <span className="c2-sous">le {dateCourte(p.accord_oral_le)}</span>
                          </>
                        ) : p.statut === "litige" ? <Pastille teinte="rouge">En litige</Pastille> : s ? (
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
                            {p.attente_commande_le ? (
                              <button type="button" className="esp-lien-bouton" onClick={() => ouvrir({ type: "bon_recu", facture: p })}>Bon reçu</button>
                            ) : (
                              <button type="button" className="esp-lien-bouton" onClick={() => ouvrir({ type: "commande", facture: p })}>Bon de commande</button>
                            )}
                            <button type="button" className="esp-lien-bouton" onClick={() => ouvrir({ type: "solde", facture: p })}>Solde</button>
                          </span>
                        ) : p.nature === "devis" && p.statut === "en_attente" ? (
                          <button type="button" className="esp-lien-bouton" onClick={() => ouvrir({ type: "accord", devis: p })}>Accord oral</button>
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

      <div className="esp-carte-corps" role="region" aria-label="Pièces du dossier">
        <div className="c2-tete-droite c2-tete-gauche">
          <h3 className="esp-section-titre">Pièces du dossier</h3>
          {facturesJoignables.length ? (
            <button type="button" className="esp-lien-bouton" onClick={() => ouvrir({ type: "piece" })}><Paperclip width={14} height={14} aria-hidden="true" /> Joindre une pièce</button>
          ) : null}
        </div>
        {(fiche.pieces_jointes ?? []).length ? (
          <ul className="c2-reglements">
            {(fiche.pieces_jointes ?? []).map((x) => (
              <li key={x.id}>
                <span>{numero(x.facture_id)} · {NATURES.find((n) => n.cle === x.nature)?.libelle}</span>
                <span className="c2-sous">{x.nom}</span>
              </li>
            ))}
          </ul>
        ) : <p className="c2-sous">Aucune pièce jointe : le dossier d&apos;assurance-crédit nommera les factures à qui manque leur PDF.</p>}
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
              {geste?.type === "piece" ? <Paperclip width={18} height={18} aria-hidden="true" /> : geste?.type === "commande" || geste?.type === "bon_recu" ? <ClipboardList width={18} height={18} aria-hidden="true" /> : geste?.type === "solde" ? <Scissors width={18} height={18} aria-hidden="true" /> : geste?.type === "accord" ? <Handshake width={18} height={18} aria-hidden="true" /> : geste?.type === "reglement" ? <Banknote width={18} height={18} aria-hidden="true" /> : geste?.type === "litige" || geste?.type === "conteste" ? <Scale width={18} height={18} aria-hidden="true" /> : geste?.type === "echeancier" ? <CalendarRange width={18} height={18} aria-hidden="true" /> : geste?.type === "plafond" ? <Gauge width={18} height={18} aria-hidden="true" /> : <PauseCircle width={18} height={18} aria-hidden="true" />}
            </DialogIcone>
            <DialogTitle>
              {geste?.type === "piece" ? "Joindre une pièce" : geste?.type === "commande" ? `${geste.facture.numero} attend un bon de commande` : geste?.type === "bon_recu" ? `Le bon de commande de ${geste.facture.numero} est arrivé` : geste?.type === "solde" ? `Le solde de ${geste.facture.numero}` : geste?.type === "accord" ? `Accord de vive voix sur ${geste.devis.numero}` : geste?.type === "reglement" ? "Noter un règlement" : geste?.type === "statut" ? (geste.vers === "actif" ? "Reprendre les relances" : "Mettre le compte en pause") : geste?.type === "echeancier" ? `Échéancier de ${geste.facture.numero}` : geste?.type === "conteste" ? `Contestation partielle de ${geste.facture.numero}` : geste?.type === "plafond" ? "Plafond d'encours" : geste?.type === "litige" && geste.ouvrir ? `Mettre ${geste.facture.numero} en litige` : "Clore le litige"}
            </DialogTitle>
            <DialogDescription>
              {geste?.type === "piece"
                ? "Le fichier est déposé dans l'espace de stockage de votre organisation et rattaché à la facture ; il rejoint le dossier de litige, d'assurance-crédit ou de recouvrement."
                : geste?.type === "commande"
                ? "La facture sort de la relance adressée à la comptabilité ; le service qui doit émettre le bon reçoit sa propre relance, par la file de validation, tous les sept jours. Le retard continue de courir."
                : geste?.type === "bon_recu"
                  ? "La relance du service tombe, et la facture reprend son cycle au palier où elle en était."
                  : geste?.type === "solde"
                    ? `Reste dû : ${montant(geste.facture.reste_du)}. Abandonné, il sort de toute relance et reste lisible dans l'encours ; réclamé, il est relancé même sous le seuil. La décision reste au journal.`
                    : geste?.type === "accord"
                      ? "Le devis passe en accepté et sa cadence s'arrête, y compris la relance déjà écrite. Le point du matin vous signalera l'accord s'il n'a donné aucune facture au bout de quinze jours."
                      : geste?.type === "reglement"
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
              ) : geste?.type === "commande" ? (
                <>
                  <div className="esp-form-ligne">
                    <label className="rv-libelle">Adresse du service <span className="esp-obligatoire">(obligatoire)</span>
                      <input className="rv-champ" type="email" value={service.email} onChange={(e) => setService({ ...service, email: e.target.value })} placeholder="achats@client.fr" />
                    </label>
                    <label className="rv-libelle">Nom du service ou de la personne
                      <input className="rv-champ" value={service.nom} onChange={(e) => setService({ ...service, nom: e.target.value })} placeholder="Service des achats" />
                    </label>
                  </div>
                  <label className="rv-libelle">Motif du blocage <span className="esp-obligatoire">(obligatoire)</span>
                    <textarea className="rv-champ" rows={2} value={motif} onChange={(e) => setMotif(e.target.value)} placeholder="Bon de commande attendu du service des achats avant mise en paiement" />
                  </label>
                </>
              ) : geste?.type === "piece" ? (
                <>
                  <div className="esp-form-ligne">
                    <label className="rv-libelle">Facture
                      <select className="rv-champ" value={jointe.facture} onChange={(e) => setJointe({ ...jointe, facture: e.target.value })}>
                        {facturesJoignables.map((p) => <option key={p.id} value={p.id}>{p.numero}</option>)}
                      </select>
                    </label>
                    <label className="rv-libelle">Nature
                      <select className="rv-champ" value={jointe.nature} onChange={(e) => setJointe({ ...jointe, nature: e.target.value as NaturePiece })}>
                        {NATURES.map((n) => <option key={n.cle} value={n.cle}>{n.libelle}</option>)}
                      </select>
                    </label>
                  </div>
                  <label className="rv-libelle">Fichier (PDF ou image)
                    <input className="rv-champ" type="file" accept=".pdf,image/*" onChange={(e) => setJointe({ ...jointe, fichier: e.target.files?.[0] ?? null })} />
                  </label>
                </>
              ) : geste?.type === "bon_recu" ? null : geste?.type === "solde" ? (
                <>
                  <label className="rv-libelle">Décision
                    <select className="rv-champ" value={decision} onChange={(e) => setDecision(e.target.value as typeof decision)}>
                      <option value="abandonne">Abandonner le solde</option>
                      <option value="reclame">Le réclamer malgré le seuil</option>
                      <option value="">Revenir à la règle du seuil</option>
                    </select>
                  </label>
                  <label className="rv-libelle">Motif <span className="esp-obligatoire">(obligatoire)</span>
                    <textarea className="rv-champ" rows={2} value={motif} onChange={(e) => setMotif(e.target.value)} placeholder="Écart de règlement de quelques euros, accepté" />
                  </label>
                </>
              ) : geste?.type === "accord" ? (
                <>
                  <label className="rv-libelle">Accepté le
                    <input className="rv-champ" type="date" min={geste.devis.date_emission} max={jourParis()} value={accordLe} onChange={(e) => setAccordLe(e.target.value)} />
                  </label>
                  <label className="rv-libelle">Qui, comment <span className="esp-obligatoire">(obligatoire)</span>
                    <textarea className="rv-champ" rows={2} value={motif} onChange={(e) => setMotif(e.target.value)} placeholder="Accord de M. Lefèvre au téléphone, chantier en novembre" />
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
