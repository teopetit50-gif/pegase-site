"use client";

/* ══════════════════════════════════════════════════════════════════════
   Le dossier d'un contrat de location (06/10/2026, session B2)

   En tête : numéro, états, agence, locataire, véhicule. Puis le contrat
   (dates, compteurs, conditions — avec qui a complété quoi), le chiffrage
   du retour (lignes, calculs, avertissements, la demande de validation),
   les factures (litige, règlement, avoir, relance), les avoirs, le fil du
   journal opposable. Chaque geste passe par une porte (portes.ts) ; en
   exemple il est appliqué en mémoire pour que l'enchaînement se voie.
   Le rôle et le périmètre sont relus à l'écran pour griser avant le clic ;
   la base reste juge et son message est montré tel quel.
   ══════════════════════════════════════════════════════════════════════ */

import { useState } from "react";
import { BadgeEuro, Camera, CalendarClock, Pencil, RotateCcw, Scale, Send } from "lucide-react";
import Link from "next/link";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import type { Source } from "../source";
import { Avis, Def, Pastille } from "../ui";
import { dateCourte, dateHeure, montant, nombreFr, relatif } from "../format";
import { AMENDEMENTS, AVERTISSEMENTS_CONTRAT, FAMILLES_LIGNE, MODES_REGLEMENT, POLITIQUES, STATUTS_AVOIR, STATUTS_CONTRAT, STATUTS_FACTURE, STATUTS_PROPOSITION, UNITES, libelleAvertissement, nomLocataire, propositionVivante, resteDu } from "./etats";
import type { Dossier, Facture, LigneBareme, LigneProposition, Reglages, Retour, Role } from "./types";
import FormulaireRetour from "./FormulaireRetour";

export type Gestes = {
  completer: (valeurs: Record<string, unknown>) => Promise<void>;
  amender: (type: string, retour_prevu_le: string | null, motif: string) => Promise<void>;
  chiffrer: (retour: Retour, fichiers: Map<string, File[]>) => Promise<void>;
  litige: (facture: Facture, motif: string) => Promise<void>;
  regler: (facture: Facture, mode: string, le: string | null) => Promise<void>;
  avoir: (facture: Facture, motif: string, montant_ttc: number | null) => Promise<void>;
  relancer: (facture: Facture) => Promise<void>;
};

type Form =
  | { type: "completer" }
  | { type: "amender" }
  | { type: "retour" }
  | { type: "litige"; facture: Facture }
  | { type: "regler"; facture: Facture }
  | { type: "avoir"; facture: Facture }
  | { type: "relancer"; facture: Facture }
  | null;

const ACTIONS_JOURNAL: Record<string, string> = {
  "tavaro.bareme_publie": "Barème publié",
  "tavaro.bareme_retire": "Barème retiré",
  "tavaro.proposition_calculee": "Retour chiffré",
  "tavaro.demande_deposee": "Proposition déposée devant l'agence",
  "tavaro.demande_annulee": "Demande annulée (nouveau calcul)",
  "tavaro.demande_redeposee": "Demande redéposée",
  "tavaro.proposition_validee": "Proposition validée",
  "tavaro.proposition_refusee": "Proposition refusée",
  "tavaro.proposition_expiree": "Proposition expirée",
  "tavaro.facture_emise": "Facture émise",
  "tavaro.facture_envoi_prepare": "Courriel de la facture préparé",
  "tavaro.facture_envoyee": "Facture envoyée au locataire",
  "tavaro.facture_envoi_non_regle": "Courriel non parti : envoi non réglé",
  "tavaro.facture_envoi_sans_adresse": "Courriel non parti : pas d'adresse",
  "tavaro.facture_litige": "Facture en litige",
  "tavaro.facture_reglee": "Facture réglée",
  "tavaro.facture_relancee": "Facture relancée",
  "tavaro.avoir_demande": "Avoir demandé",
  "tavaro.avoir_emis": "Avoir émis",
  "tavaro.avoir_refuse": "Avoir refusé par la direction",
  "tavaro.avoir_envoye": "Avoir envoyé au locataire",
  "tavaro.locataire_anonymise": "Locataire anonymisé",
  "tavaro.regles_posees": "Règles de validation posées",
};

function teinteJournal(action: string): "vert" | "rouge" | "ambre" | "bleu" {
  if (/refuse|litige|non_regle|sans_adresse|echec|expire/.test(action)) return "rouge";
  if (/relance|demande|annule/.test(action)) return "ambre";
  if (/emis|reglee|validee|envoyee|publie/.test(action)) return "vert";
  return "bleu";
}

function Preuves({ preuves }: { preuves: LigneProposition["preuves"] }) {
  if (!preuves.length) return <span className="esp-kpi-sous">aucune</span>;
  return (
    <span className="tav-preuves">
      {preuves.map((p, i) => (
        <span key={i} className="tav-preuve" title={p.photo ?? p.chemin ?? p.note}>
          <Camera width={11} height={11} aria-hidden="true" /> {p.photo ? p.photo.split("/").pop() : p.chemin ? p.chemin.split("/").pop() : p.note ?? "preuve"}
        </span>
      ))}
    </span>
  );
}

export default function DossierContrat({ dossier, source, role, moi, bareme, reglages, agences, nommer, gestes }: {
  dossier: Dossier;
  source: Source;
  role: Role | null;
  moi: string;
  bareme: LigneBareme[];
  reglages: Reglages | null;
  agences: { entite_id: string; code: string; nom?: string }[];
  nommer: (id: string | null | undefined) => string;
  gestes: Gestes;
}) {
  const { contrat: c, locataire, vehicule, categorie } = dossier;
  const [form, setForm] = useState<Form>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [fait, setFait] = useState<string | null>(null);
  const [motif, setMotif] = useState("");
  const [typeAm, setTypeAm] = useState("prolongation");
  const [dateAm, setDateAm] = useState("");
  const [modeReg, setModeReg] = useState("carte");
  const [dateReg, setDateReg] = useState("");
  const [montantAvoir, setMontantAvoir] = useState("");
  const [cond, setCond] = useState<Record<string, string>>({});
  const [lignesOuvertes, setLignesOuvertes] = useState<string | null>(null);
  /* le « maintenant » du rendu, posé une fois : le rendu reste pur */
  const [maintenantMs] = useState(() => Date.now());

  const p = propositionVivante(dossier.propositions);
  const lignes = p ? dossier.lignes.filter((l) => l.proposition_id === p.id).sort((a, b) => a.rang - b.rang) : [];
  const demande = p?.demande_id ? dossier.demandes.find((d) => d.id === p.demande_id) ?? null : null;
  const prolongation = dossier.amendements.filter((a) => a.retour_prevu_le).sort((a, b) => (b.retour_prevu_le ?? "").localeCompare(a.retour_prevu_le ?? ""))[0] ?? null;
  const retourPrevu = prolongation?.retour_prevu_le && prolongation.retour_prevu_le > c.retour_prevu_le ? prolongation.retour_prevu_le : c.retour_prevu_le;
  const agence = agences.find((a) => a.entite_id === c.entite_id);

  const peutAgir = role !== null && role !== "lecteur";
  const peutAmender = role === "gerant" || role === "admin" || role === "valideur";
  const facture = c.statut !== "annule";
  const peutChiffrer = peutAgir && facture && (!p || !["a_valider", "validee", "facturee"].includes(p.statut));
  const aiChiffre = p?.calculee_par === moi;

  const ouvrir = (f: Form) => {
    setErreur(null);
    setFait(null);
    setMotif("");
    setMontantAvoir("");
    setDateAm("");
    setDateReg("");
    if (f?.type === "completer") setCond({ km_inclus: c.km_inclus?.toString() ?? "", km_inclus_jour: c.km_inclus_jour?.toString() ?? "", km_illimite: c.km_illimite ? "oui" : "non", politique_carburant: c.politique_carburant ?? "", seuil_charge_pct: c.seuil_charge_pct?.toString() ?? "", tarif_jour_eur: c.tarif_jour_eur?.toString() ?? "", franchise_eur: c.franchise_eur?.toString() ?? "", franchise_reduite_eur: c.franchise_reduite_eur?.toString() ?? "", rachat_franchise: c.rachat_franchise === null ? "" : c.rachat_franchise ? "oui" : "non", depot_eur: c.depot_eur?.toString() ?? "" });
    setForm(f);
  };

  async function envoyer(action: () => Promise<void>, message: string) {
    setEnvoi(true);
    setErreur(null);
    try {
      await action();
      setFait(message);
      setForm(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base a refusé l'opération.");
    } finally {
      setEnvoi(false);
    }
  }

  const motifOk = motif.trim().length >= 3;
  const nombre = (s: string) => (s.trim() === "" ? null : Number(s.replace(/\s/g, "").replace(",", ".")));

  const valeursCompletees = (): Record<string, unknown> => {
    const v: Record<string, unknown> = {};
    const champs: [string, (s: string) => unknown][] = [
      ["km_inclus", nombre], ["km_inclus_jour", nombre], ["km_illimite", (s) => (s === "oui" ? true : s === "non" ? false : null)],
      ["politique_carburant", (s) => s || null], ["seuil_charge_pct", nombre], ["tarif_jour_eur", nombre], ["franchise_eur", nombre],
      ["franchise_reduite_eur", nombre], ["rachat_franchise", (s) => (s === "oui" ? true : s === "non" ? false : null)], ["depot_eur", nombre],
    ];
    const avant: Record<string, unknown> = { km_inclus: c.km_inclus, km_inclus_jour: c.km_inclus_jour, km_illimite: c.km_illimite, politique_carburant: c.politique_carburant, seuil_charge_pct: c.seuil_charge_pct, tarif_jour_eur: c.tarif_jour_eur, franchise_eur: c.franchise_eur, franchise_reduite_eur: c.franchise_reduite_eur, rachat_franchise: c.rachat_franchise, depot_eur: c.depot_eur };
    for (const [k, lire] of champs) {
      const val = lire(cond[k] ?? "");
      if (val !== null && val !== avant[k]) v[k] = val;
    }
    return v;
  };

  const montantAvoirNombre = nombre(montantAvoir);

  return (
    <div className="esp-dossier" style={{ display: "grid", gap: 14 }}>
      {fait ? <Avis teinte="vert" role="status"><strong>C&apos;est fait.</strong> {fait}</Avis> : null}

      {/* ——— en-tête ——— */}
      <div className="esp-carte">
        <div className="esp-carte-tete">
          <div className="esp-item-haut">
            <span className="esp-mono" style={{ fontWeight: 700, fontSize: 15 }}>{c.numero}</span>
            <Pastille teinte={STATUTS_CONTRAT[c.statut].teinte}>{STATUTS_CONTRAT[c.statut].libelle}</Pastille>
            {p ? <Pastille teinte={STATUTS_PROPOSITION[p.statut].teinte}>{STATUTS_PROPOSITION[p.statut].libelle}</Pastille> : null}
            {p?.hors_bareme ? <Pastille teinte="ambre">Hors barème</Pastille> : null}
            {dossier.factures.some((f) => f.statut === "litige") ? <Pastille teinte="rouge">Litige</Pastille> : null}
            <Pastille contour>{agence?.nom ?? agence?.code ?? "Agence"}</Pastille>
          </div>
          <span className="esp-kpi-sous">Source : {c.source === "export" ? "export du logiciel" : c.source === "pdf" ? "contrat PDF lu" : c.source}</span>
        </div>
        <div className="esp-carte-corps">
          <dl className="esp-def esp-def--trois">
            <Def etiquette="Locataire" fort>{nomLocataire(locataire)}{locataire?.type === "professionnel" ? " (professionnel)" : ""}</Def>
            <Def etiquette="Courriel">{locataire?.email ?? "—"}</Def>
            <Def etiquette="Véhicule" fort>{vehicule ? `${vehicule.immatriculation}${vehicule.modele ? ` · ${vehicule.modele}` : ""}` : "—"}{categorie ? ` · cat. ${categorie.code}` : ""}</Def>
            <Def etiquette="Départ">{dateHeure(c.depart_le)}</Def>
            <Def etiquette="Retour prévu">{dateHeure(retourPrevu)}{prolongation ? <span className="esp-kpi-sous"> · {AMENDEMENTS[prolongation.type].toLowerCase()}</span> : null}</Def>
            <Def etiquette="Rendu le" fort>{c.retour_reel_le ? dateHeure(c.retour_reel_le) : "pas encore"}</Def>
            <Def etiquette="Compteur">{c.km_depart !== null ? `${nombreFr(c.km_depart)} km` : "—"}{c.km_retour !== null ? ` → ${nombreFr(c.km_retour)} km` : ""}</Def>
            <Def etiquette="Forfait km">{c.km_illimite ? "illimité" : c.km_inclus !== null ? `${nombreFr(c.km_inclus)} km` : c.km_inclus_jour !== null ? `${nombreFr(c.km_inclus_jour)} km / jour` : <span className="esp-obligatoire">inconnu</span>}</Def>
            <Def etiquette="Carburant">{c.politique_carburant ? POLITIQUES[c.politique_carburant] : <span className="esp-obligatoire">inconnue</span>}{c.politique_carburant === "seuil" && c.seuil_charge_pct !== null ? ` (${c.seuil_charge_pct} %)` : ""}</Def>
            <Def etiquette="Tarif / jour">{montant(c.tarif_jour_eur)}</Def>
            <Def etiquette="Franchise">{c.franchise_eur !== null ? montant(c.franchise_eur) : <span className="esp-obligatoire">inconnue</span>}{c.rachat_franchise ? ` · rachat (${montant(c.franchise_reduite_eur ?? 0)})` : c.franchise_reduite_eur !== null ? ` · réduite ${montant(c.franchise_reduite_eur)}` : ""}</Def>
            <Def etiquette="Dépôt de garantie">{montant(c.depot_eur)}</Def>
          </dl>
          {Object.keys(c.saisies).length ? (
            <p className="esp-kpi-sous" style={{ marginTop: 10 }}>
              Complété à la main : {Object.entries(c.saisies).map(([k, s]) => `${k.replace(/_/g, " ")} par ${nommer(s.par)} le ${dateCourte(s.le)}`).join(" · ")}
            </p>
          ) : null}
          {c.avertissements.length ? (
            <div style={{ marginTop: 10 }}>
              <Avis teinte="ambre">
                <strong>À vérifier sur le contrat.</strong> {c.avertissements.map((a) => `${AVERTISSEMENTS_CONTRAT[a.code] ?? a.code}${a.champ ? ` (${a.champ.replace(/_/g, " ")})` : ""}`).join(" · ")}
              </Avis>
            </div>
          ) : null}
          <div className="esp-actions" style={{ marginTop: 12 }}>
            <button type="button" className="r-btn r-btn--fil r-btn--petit" disabled={!peutAgir || c.statut === "annule"} onClick={() => ouvrir({ type: "completer" })}><Pencil width={14} height={14} aria-hidden="true" /> Compléter les conditions</button>
            <button type="button" className="r-btn r-btn--fil r-btn--petit" disabled={!peutAmender || c.statut === "annule"} title={peutAmender ? undefined : "Le chef d'agence ou la direction amende un contrat"} onClick={() => ouvrir({ type: "amender" })}><CalendarClock width={14} height={14} aria-hidden="true" /> Prolonger ou offrir le retard</button>
            <button type="button" className="r-btn r-btn--noir r-btn--petit" disabled={!peutChiffrer} title={p && ["a_valider", "validee", "facturee"].includes(p.statut) ? "Une proposition est devant l'agence ou facturée : une correction passe par un avoir" : undefined} onClick={() => ouvrir({ type: "retour" })}><Camera width={14} height={14} aria-hidden="true" /> {p ? "Rechiffrer le retour" : "Chiffrer le retour"}</button>
          </div>
        </div>
      </div>

      {/* ——— le chiffrage ——— */}
      <div className="esp-carte">
        <div className="esp-carte-tete">
          <h3 className="esp-carte-titre">Le chiffrage du retour</h3>
          {p ? <span className="esp-kpi-sous">v{p.version} · {dateHeure(p.calculee_le)} · par {nommer(p.calculee_par)}</span> : null}
        </div>
        <div className="esp-carte-corps">
          {!p ? (
            <Avis teinte={c.retour_reel_le ? "ambre" : "bleu"}>{c.retour_reel_le ? "Le véhicule est rendu : le retour attend d'être chiffré." : "Le véhicule est en location : le chiffrage viendra au retour."}</Avis>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {p.avertissements.length ? (
                <Avis teinte={p.avertissements.some((a) => a.bloquant) ? "rouge" : "ambre"}>
                  <ul className="tav-avert">
                    {p.avertissements.map((a, i) => <li key={i}><code>{a.poste}</code><span>{a.detail ?? libelleAvertissement(a.code)}{a.bloquant ? " — bloquant" : ""}</span></li>)}
                  </ul>
                </Avis>
              ) : null}
              {p.statut === "rien_a_facturer" ? <Avis teinte="vert"><strong>Rien à facturer.</strong> Rendu à l&apos;heure, compteur dans le forfait, carburant au niveau, aucun dommage.</Avis> : null}
              {demande ? (
                <Avis teinte={demande.statut === "en_attente" ? (aiChiffre ? "ambre" : "bleu") : demande.statut === "rejetee" ? "rouge" : "vert"}>
                  {demande.statut === "en_attente" ? (
                    <>
                      <strong>Devant l&apos;agence.</strong> {demande.approbations_requises} accord{demande.approbations_requises > 1 ? "s" : ""} requis ({demande.roles_autorises.join(", ")}), échéance {relatif(demande.echeance)}.{" "}
                      {aiChiffre ? "Vous avez chiffré ce retour : une autre personne décide (séparation saisie / approbation). " : null}
                      <Link href="/espace/validations" className="esp-lien-bouton">Ouvrir la file « À valider »</Link>
                    </>
                  ) : demande.statut === "rejetee" ? <><strong>Refusée par l&apos;agence.</strong> Rechiffrez le retour si une facture reste due.</> : <><strong>Décidée</strong> ({demande.statut === "executee" ? "exécutée" : demande.statut}).</>}
                </Avis>
              ) : null}
              <div className="tav-totaux">
                <div className="tav-total"><span>Frais TTC</span><span>{montant(p.total_frais_ttc)}</span></div>
                <div className="tav-total"><span>Dommages</span><span>{montant(p.total_dommages_ttc)}</span></div>
                <div className="tav-total"><span>TVA</span><span>{montant(p.total_tva)}</span></div>
                <div className="tav-total" data-fort="true"><span>Total TTC</span><span>{montant(p.total_ttc)}</span></div>
              </div>
              {lignes.length ? (
                <div className="esp-tableau-cadre">
                  <table className="esp-tableau">
                    <thead><tr><th>Poste</th><th className="esp-num">Quantité</th><th className="esp-num">HT</th><th className="esp-num">TVA</th><th className="esp-num">TTC</th><th>Preuves</th></tr></thead>
                    <tbody>
                      {lignes.map((l) => (
                        <tr key={l.id}>
                          <td>
                            <div><strong>{l.libelle}</strong> <span className="esp-kpi-sous">· {FAMILLES_LIGNE[l.famille]}{l.hors_bareme ? " · hors barème" : ""}</span></div>
                            {l.statut !== "chiffree" ? <Pastille teinte={l.statut === "preuve_manquante" ? "rouge" : "ambre"}>{l.statut === "preuve_manquante" ? "Preuve manquante" : "À chiffrer"}</Pastille> : null}
                            {l.plafonnee ? <Pastille teinte="bleu" title={`Barème ${montant(Number(l.calcul.montant_bareme_ttc))}, plafonné à la franchise`}>Plafonné à la franchise</Pastille> : null}
                          </td>
                          <td className="esp-num">{nombreFr(l.quantite)}{l.unite ? ` ${UNITES[l.unite]}` : ""}{l.prix_unitaire !== null ? <span className="esp-kpi-sous"> × {montant(l.prix_unitaire)}</span> : null}</td>
                          <td className="esp-num">{montant(l.montant_ht)}</td>
                          <td className="esp-num">{l.regime_tva === "hors_champ" ? <span className="esp-kpi-sous">hors champ</span> : montant(l.montant_tva)}</td>
                          <td className="esp-num"><strong>{montant(l.montant_ttc)}</strong></td>
                          <td><Preuves preuves={l.preuves} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
              <dl className="esp-def esp-def--trois">
                <Def etiquette="Retard">{p.calcul_retard && typeof p.calcul_retard.retard_min === "number" ? (p.calcul_retard.retard_min > 0 ? `${p.calcul_retard.retard_min} min${p.calcul_retard.jours ? ` · ${p.calcul_retard.jours} jour(s) entamé(s)` : ` · dans la tolérance de ${reglages?.tolerance_retard_min ?? 59} min`}` : "rendu à l'heure") : "—"}</Def>
                <Def etiquette="Kilomètres">{p.calcul_km && typeof p.calcul_km.parcourus === "number" ? `${nombreFr(p.calcul_km.parcourus)} parcourus${typeof p.calcul_km.inclus === "number" ? ` · ${nombreFr(p.calcul_km.inclus)} inclus` : ""}` : p.calcul_km?.motif === "illimite" ? "illimités" : "—"}</Def>
                <Def etiquette="Carburant">{p.calcul_carburant && typeof p.calcul_carburant.manquant === "number" ? (p.calcul_carburant.manquant ? `${p.calcul_carburant.manquant}/8 manquant(s)` : "niveau rendu") : p.calcul_carburant?.motif === "prepaye" ? "prépayé" : "—"}</Def>
                <Def etiquette="Plafond des dommages">{p.plafond_eur !== null ? montant(p.plafond_eur) : "inconnu"}</Def>
                <Def etiquette="État des lieux">{p.non_contradictoire ? "non signé par le client" : "signé au départ et au retour"}</Def>
                <Def etiquette="Barème">{p.bareme_id ? "en vigueur à la date du départ" : <span className="esp-obligatoire">aucun</span>}</Def>
              </dl>
            </div>
          )}
        </div>
      </div>

      {/* ——— les factures ——— */}
      {dossier.factures.length ? (
        <div className="esp-carte">
          <div className="esp-carte-tete"><h3 className="esp-carte-titre">Factures</h3><span className="esp-kpi-sous">{dossier.factures.length}</span></div>
          <div className="esp-carte-corps">
            {dossier.factures.map((f) => {
              const reste = resteDu(f, dossier.avoirs);
              const lf = dossier.lignesFactures.filter((l) => l.facture_id === f.id).sort((a, b) => a.rang - b.rang);
              const avoirEnAttente = dossier.avoirs.some((a) => a.facture_id === f.id && a.statut === "a_valider");
              const enRetard = (f.statut === "emise" || f.statut === "envoyee") && new Date(f.echeance_le).getTime() + 86_400_000 < maintenantMs;
              return (
                <div key={f.id} className="tav-facture">
                  <div className="esp-item-haut">
                    <span className="esp-mono" style={{ fontWeight: 600 }}>{f.reference}</span>
                    <Pastille teinte={STATUTS_FACTURE[f.statut].teinte}>{STATUTS_FACTURE[f.statut].libelle}</Pastille>
                    <Pastille contour>{f.nature === "frais" ? "Frais" : "Dommages"}</Pastille>
                    {enRetard ? <Pastille teinte="ambre">Échéance dépassée</Pastille> : null}
                    {f.relances ? <Pastille contour>{f.relances} relance{f.relances > 1 ? "s" : ""}</Pastille> : null}
                    {avoirEnAttente ? <Pastille teinte="ambre">Avoir devant la direction</Pastille> : null}
                    <span className="esp-item-montant" style={{ marginLeft: "auto" }}>{montant(f.total_ttc)}</span>
                  </div>
                  <dl className="esp-def esp-def--trois">
                    <Def etiquette="Émise le">{dateCourte(f.date_facture)}</Def>
                    <Def etiquette="Échéance">{new Date(f.echeance_le) <= new Date(f.date_facture) ? "à réception" : dateCourte(f.echeance_le)}</Def>
                    <Def etiquette="Reste dû" fort>{f.statut === "reglee" || f.statut === "avoir" ? montant(0) : montant(reste)}</Def>
                    <Def etiquette="Destinataire">{f.destinataire.raison_sociale || f.destinataire.nom || "inconnu"}{f.destinataire.email ? ` · ${f.destinataire.email}` : ""}</Def>
                    <Def etiquette="Courriel">{f.statut === "envoyee" || f.statut === "reglee" ? "parti" : f.envoi_id ? "préparé" : "à envoyer vous-même"}</Def>
                    {f.regle_le ? <Def etiquette="Réglée">{dateCourte(f.regle_le)} · {MODES_REGLEMENT.find((m) => m.cle === f.mode_reglement)?.libelle ?? f.mode_reglement}</Def> : null}
                    {f.litige_motif ? <Def etiquette="Contestation">{f.litige_motif}</Def> : null}
                    {typeof f.mentions.tva === "string" ? <Def etiquette="TVA">{f.mentions.tva}</Def> : null}
                  </dl>
                  <div>
                    <button type="button" className="esp-lien-bouton" onClick={() => setLignesOuvertes(lignesOuvertes === f.id ? null : f.id)}>{lignesOuvertes === f.id ? "Masquer les lignes" : `Voir les ${lf.length} ligne${lf.length > 1 ? "s" : ""}`}</button>
                    {lignesOuvertes === f.id ? (
                      <div className="esp-tableau-cadre" style={{ marginTop: 8 }}>
                        <table className="esp-tableau">
                          <thead><tr><th>Ligne</th><th className="esp-num">Quantité</th><th className="esp-num">HT</th><th className="esp-num">TTC</th><th>Preuves</th></tr></thead>
                          <tbody>{lf.map((l) => <tr key={l.id}><td>{l.libelle}</td><td className="esp-num">{nombreFr(l.quantite)}{l.unite ? ` ${UNITES[l.unite]}` : ""}</td><td className="esp-num">{montant(l.montant_ht)}</td><td className="esp-num">{montant(l.montant_ttc)}</td><td><Preuves preuves={l.preuves} /></td></tr>)}</tbody>
                        </table>
                      </div>
                    ) : null}
                  </div>
                  <div className="esp-actions">
                    <button type="button" className="r-btn r-btn--fil r-btn--petit" disabled={!peutAgir || !(f.statut === "emise" || f.statut === "envoyee")} onClick={() => ouvrir({ type: "litige", facture: f })}><Scale width={14} height={14} aria-hidden="true" /> Litige</button>
                    <button type="button" className="r-btn r-btn--vert r-btn--petit" disabled={!peutAgir || !(f.statut === "emise" || f.statut === "envoyee" || f.statut === "litige")} onClick={() => ouvrir({ type: "regler", facture: f })}><BadgeEuro width={14} height={14} aria-hidden="true" /> Réglée</button>
                    <button type="button" className="r-btn r-btn--fil r-btn--petit" disabled={!peutAgir || f.statut === "avoir" || reste <= 0 || avoirEnAttente} onClick={() => ouvrir({ type: "avoir", facture: f })}><RotateCcw width={14} height={14} aria-hidden="true" /> Demander un avoir</button>
                    <button type="button" className="r-btn r-btn--fil r-btn--petit" disabled={!peutAgir || !(f.statut === "emise" || f.statut === "envoyee") || reste <= 0} onClick={() => ouvrir({ type: "relancer", facture: f })}><Send width={14} height={14} aria-hidden="true" /> Relancer</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* ——— les avoirs ——— */}
      {dossier.avoirs.length ? (
        <div className="esp-carte">
          <div className="esp-carte-tete"><h3 className="esp-carte-titre">Avoirs</h3><span className="esp-kpi-sous">{dossier.avoirs.length}</span></div>
          <div className="esp-carte-corps">
            {dossier.avoirs.map((a) => (
              <div key={a.id} className="tav-facture">
                <div className="esp-item-haut">
                  <span className="esp-mono" style={{ fontWeight: 600 }}>{a.reference ?? "Avoir en attente"}</span>
                  <Pastille teinte={STATUTS_AVOIR[a.statut].teinte}>{STATUTS_AVOIR[a.statut].libelle}</Pastille>
                  <Pastille contour>{a.total ? "annulation complète" : "partiel"} · sur {a.facture_reference}</Pastille>
                  <span className="esp-item-montant" style={{ marginLeft: "auto" }}>{montant(a.montant_ttc)}</span>
                </div>
                <dl className="esp-def esp-def--trois">
                  <Def etiquette="Motif">{a.motif}</Def>
                  <Def etiquette="Demandé par">{nommer(a.demande_par)} le {dateCourte(a.cree_le)}</Def>
                  <Def etiquette={a.statut === "emis" ? "Émis le" : "Décision"}>{a.statut === "emis" ? dateCourte(a.date_avoir) : a.statut === "a_valider" ? "direction seule, sous 48 h" : STATUTS_AVOIR[a.statut].libelle}</Def>
                </dl>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* ——— le fil ——— */}
      <div className="esp-carte">
        <div className="esp-carte-tete"><h3 className="esp-carte-titre">Fil du dossier</h3><span className="esp-kpi-sous">journal opposable</span></div>
        <div className="esp-carte-corps">
          {dossier.journal.length === 0 ? (
            <p className="esp-kpi-sous">{source === "reelle" ? "Rien au journal pour ce contrat, ou votre rôle ne le lit pas (la direction lit le journal)." : "Rien encore."}</p>
          ) : (
            <ul className="esp-fil">
              {dossier.journal.map((l) => (
                <li key={String(l.id)}>
                  <span className="esp-fil-point" data-teinte={teinteJournal(l.action)} aria-hidden="true" />
                  <div>
                    <div className="esp-fil-texte">
                      {ACTIONS_JOURNAL[l.action] ?? l.action}
                      {typeof l.donnees.reference === "string" ? ` ${l.donnees.reference}` : ""}
                      {typeof l.donnees.total_ttc === "number" ? ` · ${montant(l.donnees.total_ttc)}` : typeof l.donnees.montant_ttc === "number" ? ` · ${montant(l.donnees.montant_ttc)}` : typeof l.donnees.montant === "number" ? ` · ${montant(l.donnees.montant)}` : ""}
                      {typeof l.donnees.relance === "number" ? ` (n° ${l.donnees.relance})` : ""}
                    </div>
                    <div className="esp-fil-meta">{dateHeure(l.survenu_le)}{typeof l.donnees.par === "string" ? ` · ${nommer(l.donnees.par)}` : typeof l.donnees.saisi_par === "string" ? ` · saisi par ${nommer(l.donnees.saisi_par)}` : Array.isArray(l.donnees.decideurs) ? ` · décidé par ${(l.donnees.decideurs as string[]).map(nommer).join(", ")}` : ""}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* ——— le retour ——— */}
      {form?.type === "retour" ? (
        <FormulaireRetour dossier={dossier} bareme={bareme} ouvert envoi={envoi} erreur={erreur} onFermer={() => setForm(null)}
          onSoumettre={(r, fichiers) => envoyer(() => gestes.chiffrer(r, fichiers), "Le retour est chiffré. Si une facture est due, la proposition est devant l'agence.")} />
      ) : null}

      {/* ——— compléter ——— */}
      <Dialog open={form?.type === "completer"} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><Pencil width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>Compléter les conditions du contrat {c.numero}</DialogTitle>
            <DialogDescription>Ce que l&apos;export ne portait pas, lu sur le contrat signé. Une saisie à la main n&apos;est jamais écrasée par le prochain relevé.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              <div className="esp-form-ligne">
                <label className="rv-libelle">Forfait kilométrique (km)<input className="rv-champ" inputMode="numeric" value={cond.km_inclus ?? ""} onChange={(e) => setCond({ ...cond, km_inclus: e.target.value })} /></label>
                <label className="rv-libelle">ou par jour (km)<input className="rv-champ" inputMode="numeric" value={cond.km_inclus_jour ?? ""} onChange={(e) => setCond({ ...cond, km_inclus_jour: e.target.value })} /></label>
              </div>
              <div className="esp-form-ligne">
                <label className="rv-libelle">Kilométrage illimité<select className="rv-champ" value={cond.km_illimite ?? "non"} onChange={(e) => setCond({ ...cond, km_illimite: e.target.value })}><option value="non">Non</option><option value="oui">Oui</option></select></label>
                <label className="rv-libelle">Politique carburant<select className="rv-champ" value={cond.politique_carburant ?? ""} onChange={(e) => setCond({ ...cond, politique_carburant: e.target.value })}><option value="">— inconnue —</option>{Object.entries(POLITIQUES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
              </div>
              {cond.politique_carburant === "seuil" ? <label className="rv-libelle">Seuil de charge (%)<input className="rv-champ" inputMode="numeric" value={cond.seuil_charge_pct ?? ""} onChange={(e) => setCond({ ...cond, seuil_charge_pct: e.target.value })} /></label> : null}
              <div className="esp-form-ligne">
                <label className="rv-libelle">Tarif journalier (€)<input className="rv-champ" inputMode="decimal" value={cond.tarif_jour_eur ?? ""} onChange={(e) => setCond({ ...cond, tarif_jour_eur: e.target.value })} /></label>
                <label className="rv-libelle">Dépôt de garantie (€)<input className="rv-champ" inputMode="decimal" value={cond.depot_eur ?? ""} onChange={(e) => setCond({ ...cond, depot_eur: e.target.value })} /></label>
              </div>
              <div className="esp-form-ligne">
                <label className="rv-libelle">Franchise (€)<input className="rv-champ" inputMode="decimal" value={cond.franchise_eur ?? ""} onChange={(e) => setCond({ ...cond, franchise_eur: e.target.value })} /></label>
                <label className="rv-libelle">Franchise réduite (€)<input className="rv-champ" inputMode="decimal" value={cond.franchise_reduite_eur ?? ""} onChange={(e) => setCond({ ...cond, franchise_reduite_eur: e.target.value })} /></label>
              </div>
              <label className="rv-libelle">Rachat de franchise souscrit<select className="rv-champ" value={cond.rachat_franchise ?? ""} onChange={(e) => setCond({ ...cond, rachat_franchise: e.target.value })}><option value="">— inconnu —</option><option value="non">Non</option><option value="oui">Oui</option></select></label>
              {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={envoi || Object.keys(valeursCompletees()).length === 0} onClick={() => envoyer(() => gestes.completer(valeursCompletees()), "Les conditions sont complétées et gardées avec votre nom.")}>{envoi ? <Loader variant="spin" /> : null} Enregistrer</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ——— amender ——— */}
      <Dialog open={form?.type === "amender"} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><CalendarClock width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>Amender le contrat {c.numero}</DialogTitle>
            <DialogDescription>Une prolongation déplace le retour prévu (le retard se compte à partir de là) ; une restitution décalée le déplace sans frais ; un retard offert n&apos;en déplace rien et annule le poste retard.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              <label className="rv-libelle">Nature<select className="rv-champ" value={typeAm} onChange={(e) => setTypeAm(e.target.value)}><option value="prolongation">Prolongation</option><option value="restitution_decalee">Restitution décalée, sans frais</option><option value="retard_offert">Retard offert</option></select></label>
              {typeAm !== "retard_offert" ? <label className="rv-libelle">Nouveau retour prévu <span className="esp-obligatoire">(obligatoire)</span><input type="datetime-local" className="rv-champ" value={dateAm} onChange={(e) => setDateAm(e.target.value)} /></label> : null}
              <label className="rv-libelle">Motif<textarea className="rv-champ" rows={2} value={motif} onChange={(e) => setMotif(e.target.value)} placeholder="Le client a demandé un jour de plus par téléphone." /></label>
              {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={envoi || (typeAm !== "retard_offert" && !dateAm)} onClick={() => envoyer(() => gestes.amender(typeAm, typeAm === "retard_offert" ? null : new Date(dateAm).toISOString(), motif.trim()), "L'amendement est enregistré avec votre nom.")}>{envoi ? <Loader variant="spin" /> : null} Enregistrer</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ——— litige ——— */}
      <Dialog open={form?.type === "litige"} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><Scale width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>Passer {form?.type === "litige" ? form.facture.reference : ""} en litige</DialogTitle>
            <DialogDescription>La contestation écrite du client suspend le recouvrement : elle est gardée avec la facture et au journal.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              <label className="rv-libelle">Contestation du client <span className="esp-obligatoire">(obligatoire)</span><textarea className="rv-champ" rows={3} value={motif} onChange={(e) => setMotif(e.target.value)} placeholder="Le client écrit que…" /></label>
              {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--rouge" disabled={envoi || !motifOk} onClick={() => form?.type === "litige" && envoyer(() => gestes.litige(form.facture, motif.trim()), "La facture est en litige ; le point du matin la compte.")}>{envoi ? <Loader variant="spin" /> : null} Mettre en litige</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ——— régler ——— */}
      <Dialog open={form?.type === "regler"} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><BadgeEuro width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>Marquer {form?.type === "regler" ? form.facture.reference : ""} réglée</DialogTitle>
            <DialogDescription>Le règlement est daté et son mode gardé ; la facture ne bouge plus ensuite.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              <label className="rv-libelle">Mode<select className="rv-champ" value={modeReg} onChange={(e) => setModeReg(e.target.value)}>{MODES_REGLEMENT.map((m) => <option key={m.cle} value={m.cle}>{m.libelle}</option>)}</select></label>
              <label className="rv-libelle">Réglée le<input type="datetime-local" className="rv-champ" value={dateReg} onChange={(e) => setDateReg(e.target.value)} /><span className="esp-kpi-sous">vide : maintenant</span></label>
              {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--vert" disabled={envoi} onClick={() => form?.type === "regler" && envoyer(() => gestes.regler(form.facture, modeReg, dateReg ? new Date(dateReg).toISOString() : null), "La facture est réglée.")}>{envoi ? <Loader variant="spin" /> : null} Confirmer le règlement</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ——— avoir ——— */}
      <Dialog open={form?.type === "avoir"} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><RotateCcw width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>Demander un avoir sur {form?.type === "avoir" ? form.facture.reference : ""}</DialogTitle>
            <DialogDescription>Une facture émise ne se modifie pas : l&apos;avoir la corrige. La direction seule le décide, sous 48 heures ; le courriel part à son émission.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              <label className="rv-libelle">Montant TTC (€)<input className="rv-champ" inputMode="decimal" value={montantAvoir} onChange={(e) => setMontantAvoir(e.target.value)} placeholder={form?.type === "avoir" ? `vide : tout ce qui reste (${montant(resteDu(form.facture, dossier.avoirs))})` : ""} /></label>
              <label className="rv-libelle">Ce que la facture avait de faux <span className="esp-obligatoire">(obligatoire)</span><textarea className="rv-champ" rows={3} value={motif} onChange={(e) => setMotif(e.target.value)} placeholder="La rayure de portière était signalée au départ (photo de départ)." /></label>
              {form?.type === "avoir" && montantAvoirNombre !== null && (Number.isNaN(montantAvoirNombre) || montantAvoirNombre <= 0 || montantAvoirNombre > resteDu(form.facture, dossier.avoirs)) ? <Avis teinte="rouge">Le montant est entre 0,01 € et {montant(resteDu(form.facture, dossier.avoirs))}, ce qui reste de la facture.</Avis> : null}
              {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={envoi || !motifOk || (form?.type === "avoir" && montantAvoirNombre !== null && (Number.isNaN(montantAvoirNombre) || montantAvoirNombre <= 0 || montantAvoirNombre > resteDu(form.facture, dossier.avoirs)))} onClick={() => form?.type === "avoir" && envoyer(() => gestes.avoir(form.facture, motif.trim(), montantAvoirNombre), "L'avoir est demandé : la direction décide sous 48 heures.")}>{envoi ? <Loader variant="spin" /> : null} Demander l&apos;avoir</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ——— relancer ——— */}
      <Dialog open={form?.type === "relancer"} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><Send width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>Relancer {form?.type === "relancer" ? form.facture.reference : ""}</DialogTitle>
            <DialogDescription>Un rappel est préparé pour le locataire, avec le reste dû ; comme tout courriel qui n&apos;est pas adossé à une décision déjà prise, il attend un accord dans « À valider » avant de partir. Sans geste de votre part, Tavaro prépare de lui-même une relance sept jours après l&apos;échéance, puis toutes les deux semaines, trois fois au plus avant le recouvrement.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            {form?.type === "relancer" ? (
              <dl className="esp-def">
                <Def etiquette="Reste dû" fort>{montant(resteDu(form.facture, dossier.avoirs))}</Def>
                <Def etiquette="Relances déjà parties">{form.facture.relances ?? 0}{form.facture.relance_le ? ` · dernière le ${dateCourte(form.facture.relance_le)}` : ""}</Def>
              </dl>
            ) : null}
            {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={envoi} onClick={() => form?.type === "relancer" && envoyer(() => gestes.relancer(form.facture), "La relance est préparée : elle part dès qu'une personne habilitée l'approuve dans « À valider ».")}>{envoi ? <Loader variant="spin" /> : null} Envoyer la relance</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
