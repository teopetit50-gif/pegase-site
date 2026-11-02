"use client";

/* ══════════════════════════════════════════════════════════════════════
   TAVARO — la fiche d'un contrat (02/11/2026, refonte des pages métiers)

   La page d'un ticket de Linear, au 1:1 : relevé
   docs/refonte-metiers/releves/linear-ticket.md, styles ./tav-ticket.css
   (préfixe tav-t-). Servie en pleine page par /espace2/tavaro/contrats/[id]
   et, comme le ticket ouvert à droite de l'Inbox de Linear, dans le volet
   des Retours à facturer (mode « volet »).

   Le dossier de l'écran d'avant (components/espace/tavaro/DossierContrat)
   est réécrit dans les briques du ticket :
     · B11 en-tête → fil (numéro), titre (locataire — véhicule), description
       (dates, compteur, conditions, « Complété à la main », « À vérifier »),
       propriétés à droite (statut, proposition, agence, franchise…),
       étiquettes (Hors barème, Litige…) ; ses trois gestes (G01-G03) sont
       les boutons « Accept / Decline » de Linear et le menu « … » ;
     · B12 États des lieux, B13 chiffrage, B14 factures, B15 avoirs → des
       blocs « Sub-issues » (repli, compteur, « + »), une rangée par ligne ;
       une rangée de facture se déplie sur son détail et ses gestes
       (G04-G08, L3, L4) ;
     · B16 journal opposable → « Activity » (un événement par ligne) ; la
       demande devant l'agence (B13, L6) → une carte de commentaire ;
     · B10 « C'est fait » → un toast.
   Fenêtres F01-F07 : le code de DossierContrat, ligne pour ligne ; F08 : la
   fenêtre d'EtatsDesLieux (mode masqué) ; F09 : BoutonFactureElectronique.
   G12 « Lever la caution » écrivait au premier clic : il demande
   maintenant une confirmation (DECOUPAGES.md, règle 5).
   ══════════════════════════════════════════════════════════════════════ */

import { useMemo, useState } from "react";
import Link from "next/link";
import { BadgeEuro, CalendarClock, Pencil, RotateCcw, Scale, Send, ShieldCheck } from "lucide-react";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import { Avis, Def } from "@/components/espace/ui";
import { dateCourte, dateHeure, montant, nombreFr, relatif } from "@/components/espace/format";
import { AMENDEMENTS, AVERTISSEMENTS_CONTRAT, FAMILLES_LIGNE, MODES_REGLEMENT, POLITIQUES, STATUTS_AVOIR, STATUTS_CONTRAT, STATUTS_FACTURE, STATUTS_PROPOSITION, UNITES, famille, libelleAvertissement, nomLocataire, propositionVivante, resteDu } from "@/components/espace/tavaro/etats";
import type { Dossier, Facture } from "@/components/espace/tavaro/types";
import FormulaireRetour from "@/components/espace/tavaro/FormulaireRetour";
import EtatsDesLieux from "@/components/espace/tavaro/EtatsDesLieux";
import { BoutonFactureElectronique } from "@/components/espace/tavaro/FactureElectronique";
import { MODES_CAUTION, etatDe, libelleZone } from "@/components/espace/tavaro/edl";
import { useToast } from "../Toasts";
import { useTavaro } from "./donnees";
import { TavMenu } from "./TavCadre";
import { TavIcone, type NomTavIcone } from "./TavIcone";
import { BASE } from "./VueEnsemble";
import "./tav-ticket.css";

type Form =
  | { type: "completer" }
  | { type: "amender" }
  | { type: "retour" }
  | { type: "litige"; facture: Facture }
  | { type: "regler"; facture: Facture }
  | { type: "avoir"; facture: Facture }
  | { type: "relancer"; facture: Facture }
  | null;

export const ACTIONS_JOURNAL: Record<string, string> = {
  "tavaro.bareme_publie": "a publié le barème",
  "tavaro.bareme_retire": "a retiré le barème",
  "tavaro.proposition_calculee": "a chiffré le retour",
  "tavaro.demande_deposee": "a déposé la proposition devant l'agence",
  "tavaro.demande_annulee": "a annulé la demande (nouveau calcul)",
  "tavaro.demande_redeposee": "a redéposé la demande",
  "tavaro.proposition_validee": "a validé la proposition",
  "tavaro.proposition_refusee": "a refusé la proposition",
  "tavaro.proposition_expiree": "a laissé expirer la proposition",
  "tavaro.facture_emise": "a émis la facture",
  "tavaro.facture_envoi_prepare": "a préparé le courriel de la facture",
  "tavaro.facture_envoyee": "a envoyé la facture au locataire",
  "tavaro.facture_envoi_non_regle": "n'a pas envoyé le courriel : envoi non réglé",
  "tavaro.facture_envoi_sans_adresse": "n'a pas envoyé le courriel : pas d'adresse",
  "tavaro.facture_litige": "a passé la facture en litige",
  "tavaro.facture_reglee": "a marqué la facture réglée",
  "tavaro.facture_relancee": "a relancé la facture",
  "tavaro.avoir_demande": "a demandé un avoir",
  "tavaro.avoir_emis": "a émis l'avoir",
  "tavaro.avoir_refuse": "a refusé l'avoir (direction)",
  "tavaro.avoir_envoye": "a envoyé l'avoir au locataire",
  "tavaro.locataire_anonymise": "a anonymisé le locataire",
  "tavaro.regles_posees": "a posé les règles de validation",
};

/* l'icône de statut de Linear pour un état Tavaro : fait, en cours, à faire, à trier (orange), annulé */
type Etat = "fait" | "cours" | "afaire" | "tri" | "annule";
const ICONE_ETAT: Record<Etat, NomTavIcone> = { fait: "IssueStatusDone", cours: "IssueStatusStarted", afaire: "IssueStatusTodo", tri: "IssueStatusTriage", annule: "StatusCanceled" };
function Statut({ etat }: { etat: Etat }) {
  return (
    <span className="tav-t-statut" data-etat={etat}>
      <TavIcone nom={ICONE_ETAT[etat]} taille={14} />
    </span>
  );
}
const ETAT_FACTURE: Record<Facture["statut"], Etat> = { emise: "afaire", envoyee: "cours", reglee: "fait", litige: "tri", avoir: "annule" };

/* un bloc « Sub-issues » : bouton de repli, compteur, « + » à droite, rangées de 36 */
function Bloc({ titre, compte, ajout, children, ouvertDefaut = true }: { titre: string; compte?: string; ajout?: { libelle: string; action: () => void; actif: boolean } | null; children: React.ReactNode; ouvertDefaut?: boolean }) {
  const [ouvert, setOuvert] = useState(ouvertDefaut);
  return (
    <section className="tav-t-bloc" aria-label={titre}>
      <div className="tav-t-bloc-tete">
        <button type="button" className="tav-t-repli" aria-expanded={ouvert} onClick={() => setOuvert((o) => !o)}>
          <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden="true" style={{ transform: ouvert ? undefined : "rotate(-90deg)" }}>
            <path d="M1 2.5h6L4 6z" fill="currentColor" />
          </svg>
          <span>{titre}</span>
        </button>
        {compte ? <span className="tav-t-bloc-compte">{compte}</span> : null}
        <span className="tav-pousse" />
        {ajout ? (
          <button type="button" className="tav-rond tav-rond--plein" aria-label={ajout.libelle} title={ajout.libelle} disabled={!ajout.actif} onClick={ajout.action}>
            <TavIcone nom="Plus" />
          </button>
        ) : null}
      </div>
      {ouvert ? <ul className="tav-t-rangees">{children}</ul> : null}
    </section>
  );
}

function Rangee({ etat, icone, titre, droite, onClick, attention }: { etat?: Etat; icone?: NomTavIcone; titre: React.ReactNode; droite?: React.ReactNode; onClick?: () => void; attention?: boolean }) {
  const contenu = (
    <>
      <span className="tav-t-rangee-icone">{etat ? <Statut etat={etat} /> : icone ? <TavIcone nom={icone} taille={14} className={attention ? "tav-t-rouge" : undefined} /> : null}</span>
      <span className="tav-t-rangee-titre">{titre}</span>
      {droite !== undefined ? <span className="tav-t-rangee-droite">{droite}</span> : null}
    </>
  );
  return <li>{onClick ? <button type="button" className="tav-t-rangee" onClick={onClick}>{contenu}</button> : <div className="tav-t-rangee tav-t-rangee--fixe">{contenu}</div>}</li>;
}

function Pilule({ icone, etat, children, vide, onClick, titre }: { icone?: NomTavIcone; etat?: Etat; children: React.ReactNode; vide?: boolean; onClick?: () => void; titre?: string }) {
  const contenu = (
    <>
      {etat ? <Statut etat={etat} /> : icone ? <TavIcone nom={icone} taille={16} /> : null}
      <span>{children}</span>
    </>
  );
  return onClick ? (
    <button type="button" className="tav-t-pilule" data-vide={vide || undefined} title={titre} onClick={onClick}>
      {contenu}
    </button>
  ) : (
    <span className="tav-t-pilule" data-vide={vide || undefined} title={titre}>
      {contenu}
    </span>
  );
}

export default function FicheContrat({ dossier, volet = false, retour }: { dossier: Dossier; volet?: boolean; retour?: { libelle: string; href: string } }) {
  const { source, role, moiId: moi, monde, agences, nommer, gestes, gestesEtats } = useTavaro();
  const bareme = monde?.lignesBareme ?? [];
  const reglages = monde?.reglages ?? null;
  const toast = useToast();
  const { contrat: c, locataire, vehicule, categorie } = dossier;
  const [form, setForm] = useState<Form>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [motif, setMotif] = useState("");
  const [typeAm, setTypeAm] = useState("prolongation");
  const [dateAm, setDateAm] = useState("");
  const [modeReg, setModeReg] = useState("carte");
  const [dateReg, setDateReg] = useState("");
  const [montantAvoir, setMontantAvoir] = useState("");
  const [cond, setCond] = useState<Record<string, string>>({});
  /* le « maintenant » du rendu, posé une fois : le rendu reste pur */
  const [maintenantMs] = useState(() => Date.now());

  const p = propositionVivante(dossier.propositions);
  const lignes = p ? dossier.lignes.filter((l) => l.proposition_id === p.id).sort((a, b) => a.rang - b.rang) : [];
  const demande = p?.demande_id ? dossier.demandes.find((d) => d.id === p.demande_id) ?? null : null;
  const prolongation = dossier.amendements.filter((a) => a.retour_prevu_le).sort((a, b) => (b.retour_prevu_le ?? "").localeCompare(a.retour_prevu_le ?? ""))[0] ?? null;
  const retourPrevu = prolongation?.retour_prevu_le && prolongation.retour_prevu_le > c.retour_prevu_le ? prolongation.retour_prevu_le : c.retour_prevu_le;
  const agence = agences.find((a) => a.entite_id === c.entite_id);
  /* le retour chiffré porte l'heure de restitution (entrees.retour_reel_le) tant que l'export ne l'a pas écrite sur le contrat */
  const renduLe = c.retour_reel_le ?? (p && typeof p.entrees.retour_reel_le === "string" ? p.entrees.retour_reel_le : null);

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
  const setFait = (m: string | null) => {
    if (m) toast(`C'est fait. ${m}`, "vert");
  };
  const [ouverte, setOuverte] = useState<string | null>(null);
  const [demandeEtat, setDemandeEtat] = useState<{ moment: "depart" | "retour"; n: number } | null>(null);
  const faireEtat = (moment: "depart" | "retour") => setDemandeEtat((d) => ({ moment, n: (d?.n ?? 0) + 1 }));
  const [leverOuvert, setLeverOuvert] = useState(false);
  const [envoiLever, setEnvoiLever] = useState(false);
  const [erreurLever, setErreurLever] = useState<string | null>(null);

  const dep = etatDe(dossier.etats, "depart");
  const ret = etatDe(dossier.etats, "retour");
  const peutEtat = role === "gerant" || role === "admin" || role === "valideur" || role === "collaborateur";
  const du = dossier.factures.some((f) => f.statut === "emise" || f.statut === "envoyee" || f.statut === "litige");
  const fam = famille(c, dossier.propositions, dossier.factures);
  const etatContrat: Etat = c.statut === "annule" ? "annule" : renduLe ? (fam === "a_chiffrer" ? "tri" : fam === "reste" ? "fait" : "cours") : "afaire";
  const etiquettes = useMemo(() => {
    const l: { nom: string; couleur: string }[] = [];
    if (p?.hors_bareme) l.push({ nom: "Hors barème", couleur: "lch(66 80 48)" });
    if (dossier.factures.some((f) => f.statut === "litige")) l.push({ nom: "Litige", couleur: "lch(58% 73 29)" });
    if (dossier.factures.some((f) => f.statut === "reglee")) l.push({ nom: "Réglé", couleur: "rgb(76, 183, 130)" });
    if (fam === "bloquee" && !dossier.factures.some((f) => f.statut === "litige") && p?.statut !== "preuve_manquante") l.push({ nom: "Impayé", couleur: "lch(80 90 85)" });
    if (locataire?.type === "professionnel") l.push({ nom: "Professionnel", couleur: "lch(48 59.31 288.43)" });
    return l;
  }, [p, dossier.factures, fam, locataire]);

  const copier = (texte: string, quoi: string) => {
    void navigator.clipboard?.writeText(texte).then(
      () => toast(`${quoi} copié`),
      () => toast("La copie a échoué.", "rouge"),
    );
  };

  const lever = async () => {
    setEnvoiLever(true);
    setErreurLever(null);
    try {
      await gestesEtats.leverCaution(null);
      toast("C'est fait. La caution est levée.", "vert");
      setLeverOuvert(false);
    } catch (e) {
      setErreurLever(e instanceof Error ? e.message : "La base a refusé l'opération.");
    } finally {
      setEnvoiLever(false);
    }
  };

  const titre = `${nomLocataire(locataire)}${vehicule ? ` — ${vehicule.immatriculation}${vehicule.modele ? ` · ${vehicule.modele}` : ""}` : ""}`;
  const forfait = c.km_illimite ? "kilométrage illimité" : c.km_inclus !== null ? `forfait ${nombreFr(c.km_inclus)} km` : c.km_inclus_jour !== null ? `forfait ${nombreFr(c.km_inclus_jour)} km par jour` : "forfait kilométrique inconnu";
  const description = `Départ le ${dateHeure(c.depart_le)}, retour prévu le ${dateHeure(retourPrevu)}${prolongation ? ` (${AMENDEMENTS[prolongation.type].toLowerCase()})` : ""}, ${renduLe ? `rendu le ${dateHeure(renduLe)}` : "pas encore rendu"}. Compteur ${c.km_depart !== null ? `${nombreFr(c.km_depart)} km` : "inconnu"}${c.km_retour !== null ? ` → ${nombreFr(c.km_retour)} km` : ""}, ${forfait}, carburant ${c.politique_carburant ? POLITIQUES[c.politique_carburant].toLowerCase() : "inconnu"}${c.politique_carburant === "seuil" && c.seuil_charge_pct !== null ? ` (${c.seuil_charge_pct} %)` : ""}, ${montant(c.tarif_jour_eur)} par jour, dépôt ${montant(c.depot_eur)}.`;
  const resumeEtat = (e: typeof dep) =>
    e ? `${e.km !== null ? `${nombreFr(e.km)} km` : "compteur ?"} · ${e.carburant_8 !== null ? `carburant ${e.carburant_8}/8` : e.charge_pct !== null ? `charge ${e.charge_pct} %` : "niveau ?"} · ${e.photos.length} photo${e.photos.length > 1 ? "s" : ""} · ${e.dommages.length ? e.dommages.map((d) => libelleZone(d.zone)).join(", ") : "aucun dommage"}` : "pas encore fait";
  const signeEtat = (e: typeof dep) => (!e ? "" : e.statut === "signe" ? `signé par ${e.signataire_nom}` : e.statut === "refuse" ? "non signé" : "brouillon");
  const etatEdl = (e: typeof dep): Etat => (!e ? "afaire" : e.statut === "signe" ? "fait" : e.statut === "refuse" ? "tri" : "cours");

  return (
    <div className="tav-t" data-volet={volet || undefined}>
      <header className="tav-t-tete">
        <nav className="tav-t-fil" aria-label="Fil d'Ariane">
          {retour ? (
            <>
              <Link href={retour.href} className="tav-t-fil-lien">
                {retour.libelle}
              </Link>
              <span className="tav-t-fil-sep" aria-hidden="true">
                ›
              </span>
            </>
          ) : null}
          <Link href={`${BASE}/contrats/${encodeURIComponent(c.id)}`} className="tav-t-fil-ticket" aria-current={volet ? undefined : "page"}>
            <h2>
              <span className="tav-t-fil-id">{c.numero}</span>
              {titre}
            </h2>
          </Link>
        </nav>
        <TavMenu
          libelle="Actions sur le contrat"
          options={[
            { libelle: "Compléter les conditions", icone: "Write", action: () => ouvrir({ type: "completer" }) },
            { libelle: "Prolonger ou offrir le retard", icone: "Calendar", action: () => ouvrir({ type: "amender" }) },
            "sep",
            { libelle: "Ouvrir la file « À valider »", icone: "Inbox", href: "/espace2/validations" },
            { libelle: "Copier le numéro", icone: "Page", action: () => copier(c.numero, "Numéro") },
          ]}
        />
        <span className="tav-pousse" />
        <div className="tav-t-actions">
          <button type="button" className="tav-t-action" disabled={!peutChiffrer} title={p && ["a_valider", "validee", "facturee"].includes(p.statut) ? "Une proposition est devant l'agence ou facturée : une correction passe par un avoir" : undefined} onClick={() => ouvrir({ type: "retour" })}>
            <TavIcone nom="Calculator" taille={14} />
            <span>{p ? "Rechiffrer" : "Chiffrer le retour"}</span>
          </button>
          <button type="button" className="tav-t-action" disabled={!peutAmender || c.statut === "annule"} title={peutAmender ? undefined : "Le chef d'agence ou la direction amende un contrat"} onClick={() => ouvrir({ type: "amender" })}>
            <TavIcone nom="Calendar" taille={14} />
            <span>Prolonger</span>
          </button>
          <button type="button" className="tav-rond" aria-label="Compléter les conditions" title="Compléter les conditions" disabled={!peutAgir || c.statut === "annule"} onClick={() => ouvrir({ type: "completer" })}>
            <TavIcone nom="Write" />
          </button>
          <Link href="/espace2/validations" className="tav-rond" aria-label="Ouvrir la file « À valider »" title="Ouvrir la file « À valider »">
            <TavIcone nom="Inbox" />
          </Link>
        </div>
      </header>

      <div className="tav-t-defile">
        <div className="tav-t-outils">
          <button type="button" className="tav-rond tav-rond--plein" aria-label="Copier le lien du contrat" title="Copier le lien du contrat" onClick={() => copier(`${window.location.origin}${BASE}/contrats/${encodeURIComponent(c.id)}`, "Lien")}>
            <TavIcone nom="LienUrl" />
          </button>
          <button type="button" className="tav-rond tav-rond--plein" aria-label="Copier le numéro du contrat" title="Copier le numéro du contrat" onClick={() => copier(c.numero, "Numéro")}>
            <TavIcone nom="Page" />
          </button>
        </div>
        <div className="tav-t-corps">
          <div className="tav-t-principal">
            <h1 className="tav-t-titre">{titre}</h1>
            {/* les propriétés passent sous le titre à 1024 et moins (relevé, paliers) */}
            <div className="tav-t-replis">
              <Pilule etat={etatContrat}>{c.statut === "ouvert" && renduLe ? "Rendu" : STATUTS_CONTRAT[c.statut].libelle}</Pilule>
              {p ? <Pilule icone="Calculator">{STATUTS_PROPOSITION[p.statut].libelle}</Pilule> : null}
              <Pilule icone="Team">{agence?.nom ?? agence?.code ?? "Agence"}</Pilule>
              {etiquettes.map((e) => (
                <span key={e.nom} className="tav-t-etiquette">
                  <span className="tav-t-pastille" style={{ background: e.couleur }} />
                  {e.nom}
                </span>
              ))}
            </div>

            <div className="tav-t-description">
              <p>{description}</p>
              {Object.keys(c.saisies).length ? <p>Complété à la main : {Object.entries(c.saisies).map(([k, s]) => `${k.replace(/_/g, " ")} par ${nommer(s.par)} le ${dateCourte(s.le)}`).join(" · ")}.</p> : null}
              {c.avertissements.length ? (
                <p className="tav-t-attention">
                  À vérifier sur le contrat : {c.avertissements.map((a) => `${AVERTISSEMENTS_CONTRAT[a.code] ?? a.code}${a.champ ? ` (${a.champ.replace(/_/g, " ")})` : ""}`).join(" · ")}.
                </p>
              ) : null}
            </div>

            <div className="tav-t-petits">
              <button type="button" className="tav-rond tav-rond--plein" aria-label={!dep || dep.statut === "brouillon" ? "Faire l'état de départ" : "Faire l'état de retour"} title={!dep || dep.statut === "brouillon" ? "Faire l'état de départ" : "Faire l'état de retour"} disabled={!peutEtat || c.statut === "annule" || (!!dep && dep.statut !== "brouillon" && !!ret && ret.statut !== "brouillon")} onClick={() => faireEtat(!dep || dep.statut === "brouillon" ? "depart" : "retour")}>
                <TavIcone nom="Camera" />
              </button>
              <button type="button" className="tav-rond tav-rond--plein" aria-label="Chiffrer le retour avec ses photos" title="Chiffrer le retour avec ses photos" disabled={!peutChiffrer} onClick={() => ouvrir({ type: "retour" })}>
                <TavIcone nom="Attachment" />
              </button>
            </div>

            <Bloc
              titre="États des lieux"
              compte={`${[dep, ret].filter((e) => e && e.statut !== "brouillon").length}/2`}
              ajout={{ libelle: !dep || dep.statut === "brouillon" ? (dep ? "Reprendre le départ" : "Faire l'état de départ") : ret ? "Reprendre le retour" : "Faire l'état de retour", action: () => faireEtat(!dep || dep.statut === "brouillon" ? "depart" : "retour"), actif: peutEtat && c.statut !== "annule" && !(dep && dep.statut !== "brouillon" && ret && ret.statut !== "brouillon") }}
            >
              <Rangee etat={etatEdl(dep)} titre={<>Départ <span className="tav-t-gris">· {resumeEtat(dep)}</span></>} droite={signeEtat(dep)} onClick={peutEtat && (!dep || dep.statut === "brouillon") && c.statut !== "annule" ? () => faireEtat("depart") : undefined} />
              <Rangee etat={etatEdl(ret)} titre={<>Retour <span className="tav-t-gris">· {resumeEtat(ret)}</span></>} droite={signeEtat(ret)} onClick={peutEtat && dep && dep.statut !== "brouillon" && (!ret || ret.statut === "brouillon") ? () => faireEtat("retour") : undefined} />
              {dep && dep.caution_eur !== null && dep.caution_mode && dep.caution_mode !== "aucune" ? (
                <Rangee
                  icone="Shield"
                  titre={<>Caution {montant(dep.caution_eur)} <span className="tav-t-gris">· {MODES_CAUTION.find((m) => m.cle === dep.caution_mode)?.libelle}{dep.caution_reference ? ` · ${dep.caution_reference}` : ""}</span></>}
                  droite={dep.caution_statut === "levee" ? `levée le ${dateCourte(dep.caution_levee_le)}` : du ? "prise, une facture reste due" : "prise · lever"}
                  onClick={dep.caution_statut === "prise" && peutEtat && !du ? () => { setErreurLever(null); setLeverOuvert(true); } : undefined}
                />
              ) : null}
              {!dep ? <Rangee icone="Alert" titre={<span className="tav-t-gris">Sans état de départ signé, un dommage facturé au retour se conteste facilement.</span>} /> : null}
            </Bloc>

            <Bloc titre="Chiffrage du retour" compte={p ? `v${p.version} · ${montant(p.total_ttc)}` : undefined} ajout={{ libelle: p ? "Rechiffrer le retour" : "Chiffrer le retour", action: () => ouvrir({ type: "retour" }), actif: peutChiffrer }}>
              {!p ? (
                <Rangee icone="Clock" titre={<span className="tav-t-gris">{c.retour_reel_le ? "Le véhicule est rendu : le retour attend d'être chiffré." : "Le véhicule est en location : le chiffrage viendra au retour."}</span>} />
              ) : (
                <>
                  {p.avertissements.map((a, i) => (
                    <Rangee key={`av${i}`} icone="Alert" attention={a.bloquant} titre={<>{a.detail ?? libelleAvertissement(a.code)} <span className="tav-t-gris">· {a.poste}{a.bloquant ? " · bloquant" : ""}</span></>} />
                  ))}
                  {p.statut === "rien_a_facturer" ? <Rangee etat="fait" titre="Rien à facturer : rendu à l'heure, compteur dans le forfait, carburant au niveau, aucun dommage." /> : null}
                  {lignes.map((l) => (
                    <Rangee
                      key={l.id}
                      etat={l.statut === "chiffree" ? "fait" : l.statut === "preuve_manquante" ? "tri" : "afaire"}
                      titre={
                        <>
                          {l.libelle}{" "}
                          <span className="tav-t-gris">
                            · {FAMILLES_LIGNE[l.famille]} · {nombreFr(l.quantite)}
                            {l.unite ? ` ${UNITES[l.unite]}` : ""}
                            {l.prix_unitaire !== null ? ` × ${montant(l.prix_unitaire)}` : ""}
                            {l.hors_bareme ? " · hors barème" : ""}
                            {l.plafonnee ? " · plafonné à la franchise" : ""}
                            {l.statut === "preuve_manquante" ? " · preuve manquante" : ""}
                            {` · ${l.preuves.length} preuve${l.preuves.length > 1 ? "s" : ""}`}
                          </span>
                        </>
                      }
                      droite={montant(l.montant_ttc)}
                    />
                  ))}
                  <Rangee icone="Euro" titre={<>Total TTC <span className="tav-t-gris">· frais {montant(p.total_frais_ttc)} · dommages {montant(p.total_dommages_ttc)} · TVA {montant(p.total_tva)}</span></>} droite={<strong>{montant(p.total_ttc)}</strong>} />
                  <Rangee
                    icone="Clock"
                    titre={
                      <span className="tav-t-gris">
                        Retard : {p.calcul_retard && typeof p.calcul_retard.retard_min === "number" ? (p.calcul_retard.retard_min > 0 ? `${p.calcul_retard.retard_min} min${p.calcul_retard.jours ? `, ${p.calcul_retard.jours} jour(s) entamé(s)` : `, dans la tolérance de ${reglages?.tolerance_retard_min ?? 59} min`}` : "rendu à l'heure") : "—"} · kilomètres :{" "}
                        {p.calcul_km && typeof p.calcul_km.parcourus === "number" ? `${nombreFr(p.calcul_km.parcourus)} parcourus${typeof p.calcul_km.inclus === "number" ? `, ${nombreFr(p.calcul_km.inclus)} inclus` : ""}` : p.calcul_km?.motif === "illimite" ? "illimités" : "—"} · carburant :{" "}
                        {p.calcul_carburant && typeof p.calcul_carburant.manquant === "number" ? (p.calcul_carburant.manquant ? `${p.calcul_carburant.manquant}/8 manquant(s)` : "niveau rendu") : p.calcul_carburant?.motif === "prepaye" ? "prépayé" : "—"}
                      </span>
                    }
                  />
                  <Rangee icone="Policy" titre={<span className="tav-t-gris">Plafond des dommages {p.plafond_eur !== null ? montant(p.plafond_eur) : "inconnu"} · état des lieux {p.non_contradictoire ? "non signé par le client" : "signé au départ et au retour"} · barème {p.bareme_id ? "en vigueur à la date du départ" : "aucun"}</span>} />
                </>
              )}
            </Bloc>

            {dossier.factures.length ? (
              <Bloc titre="Factures" compte={`${dossier.factures.filter((f) => f.statut === "reglee").length}/${dossier.factures.length}`}>
                {dossier.factures.map((f) => {
                  const reste = resteDu(f, dossier.avoirs);
                  const lf = dossier.lignesFactures.filter((l) => l.facture_id === f.id).sort((a, b) => a.rang - b.rang);
                  const avoirEnAttente = dossier.avoirs.some((a) => a.facture_id === f.id && a.statut === "a_valider");
                  const enRetard = (f.statut === "emise" || f.statut === "envoyee") && new Date(f.echeance_le).getTime() + 86_400_000 < maintenantMs;
                  return (
                    <li key={f.id} className="tav-t-facture">
                      <button type="button" className="tav-t-rangee" aria-expanded={ouverte === f.id} onClick={() => setOuverte(ouverte === f.id ? null : f.id)}>
                        <span className="tav-t-rangee-icone">
                          <Statut etat={ETAT_FACTURE[f.statut]} />
                        </span>
                        <span className="tav-t-rangee-titre">
                          {f.reference}{" "}
                          <span className="tav-t-gris">
                            · {STATUTS_FACTURE[f.statut].libelle} · {f.nature === "frais" ? "frais" : "dommages"}
                            {f.relances ? ` · ${f.relances} relance${f.relances > 1 ? "s" : ""}` : ""}
                            {avoirEnAttente ? " · avoir devant la direction" : ""}
                          </span>
                        </span>
                        <span className="tav-t-rangee-droite">
                          {enRetard ? <TavIcone nom="CrossedOutCalendar" taille={14} className="tav-t-rouge" /> : null}
                          {montant(f.total_ttc)}
                        </span>
                      </button>
                      {ouverte === f.id ? (
                        <div className="tav-t-detail">
                          <dl className="esp-def esp-def--trois">
                            <Def etiquette="Émise le">{dateCourte(f.date_facture)}</Def>
                            <Def etiquette="Échéance">{new Date(f.echeance_le) <= new Date(f.date_facture) ? "à réception" : dateCourte(f.echeance_le)}</Def>
                            <Def etiquette="Reste dû" fort>{f.statut === "reglee" || f.statut === "avoir" ? montant(0) : montant(reste)}</Def>
                            <Def etiquette="Destinataire">{f.destinataire.raison_sociale || f.destinataire.nom || "inconnu"}{f.destinataire.email ? ` · ${f.destinataire.email}` : ""}</Def>
                            <Def etiquette="Courriel">{f.statut === "envoyee" || f.statut === "reglee" ? "parti" : f.envoi_id ? "préparé" : "à envoyer vous-même"}{f.pdf_piece_id ? " · PDF et photos datées joints" : f.statut === "emise" && !f.envoi_id ? " · PDF en préparation" : ""}</Def>
                            {f.regle_le ? <Def etiquette="Réglée">{dateCourte(f.regle_le)} · {MODES_REGLEMENT.find((m) => m.cle === f.mode_reglement)?.libelle ?? f.mode_reglement}</Def> : null}
                            {f.litige_motif ? <Def etiquette="Contestation">{f.litige_motif}</Def> : null}
                            {typeof f.mentions.tva === "string" ? <Def etiquette="TVA">{f.mentions.tva}</Def> : null}
                          </dl>
                          <ul className="tav-t-rangees">
                            {lf.map((l) => (
                              <Rangee key={l.id} icone="Page" titre={<>{l.libelle} <span className="tav-t-gris">· {nombreFr(l.quantite)}{l.unite ? ` ${UNITES[l.unite]}` : ""} · HT {montant(l.montant_ht)} · {l.preuves.length} preuve{l.preuves.length > 1 ? "s" : ""}</span></>} droite={montant(l.montant_ttc)} />
                            ))}
                          </ul>
                          <div className="tav-t-gestes">
                            <button type="button" className="tav-t-pilule" disabled={!peutAgir || !(f.statut === "emise" || f.statut === "envoyee")} onClick={() => ouvrir({ type: "litige", facture: f })}>
                              <TavIcone nom="Judge" taille={16} />
                              <span>Litige</span>
                            </button>
                            <button type="button" className="tav-t-pilule" disabled={!peutAgir || !(f.statut === "emise" || f.statut === "envoyee" || f.statut === "litige")} onClick={() => ouvrir({ type: "regler", facture: f })}>
                              <TavIcone nom="IssueStatusDone" taille={16} />
                              <span>Réglée</span>
                            </button>
                            <button type="button" className="tav-t-pilule" disabled={!peutAgir || f.statut === "avoir" || reste <= 0 || avoirEnAttente} onClick={() => ouvrir({ type: "avoir", facture: f })}>
                              <TavIcone nom="Refresh" taille={16} />
                              <span>Demander un avoir</span>
                            </button>
                            <button type="button" className="tav-t-pilule" disabled={!peutAgir || !(f.statut === "emise" || f.statut === "envoyee") || reste <= 0} onClick={() => ouvrir({ type: "relancer", facture: f })}>
                              <TavIcone nom="Send" taille={16} />
                              <span>Relancer</span>
                            </button>
                            <span className="tav-t-electronique">
                              <BoutonFactureElectronique piece={f.reference} charger={() => gestes.electronique(f)} completer={peutAgir && locataire && !locataire.anonymise_le ? (v) => gestes.completerClient(v) : null} />
                            </span>
                          </div>
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </Bloc>
            ) : null}

            {dossier.avoirs.length ? (
              <Bloc titre="Avoirs" compte={`${dossier.avoirs.filter((a) => a.statut === "emis").length}/${dossier.avoirs.length}`}>
                {dossier.avoirs.map((a) => (
                  <li key={a.id} className="tav-t-facture">
                    <div className="tav-t-rangee tav-t-rangee--fixe">
                      <span className="tav-t-rangee-icone">
                        <Statut etat={a.statut === "emis" ? "fait" : a.statut === "a_valider" ? "tri" : "annule"} />
                      </span>
                      <span className="tav-t-rangee-titre">
                        {a.reference ?? "Avoir en attente"}{" "}
                        <span className="tav-t-gris">
                          · {STATUTS_AVOIR[a.statut].libelle} · {a.total ? "annulation complète" : "partiel"} sur {a.facture_reference} · {a.motif} · demandé par {nommer(a.demande_par)} le {dateCourte(a.cree_le)} · {a.statut === "emis" ? `émis le ${dateCourte(a.date_avoir)}` : a.statut === "a_valider" ? "direction seule, sous 48 h" : STATUTS_AVOIR[a.statut].libelle}
                        </span>
                      </span>
                      <span className="tav-t-rangee-droite">{montant(a.montant_ttc)}</span>
                    </div>
                    {a.statut === "emis" && a.reference ? (
                      <div className="tav-t-gestes tav-t-electronique">
                        <BoutonFactureElectronique piece={a.reference} charger={() => gestes.electroniqueAvoir(a)} completer={null} />
                      </div>
                    ) : null}
                  </li>
                ))}
              </Bloc>
            ) : null}

            <hr className="tav-t-filet" />
            <div className="tav-t-activite-tete">
              <h3>Activité</h3>
              <span className="tav-t-gris tav-t-journal">journal opposable</span>
            </div>
            <ul className="tav-t-evenements">
              <li className="tav-t-evenement">
                <TavIcone nom="Created" taille={14} />
                <span className="tav-t-qui">{c.source === "export" ? "L'export du logiciel" : c.source === "pdf" ? "Le contrat PDF lu" : "Le comptoir"}</span>
                <span>a créé le contrat</span>
                <span aria-hidden="true">·</span>
                <span>{relatif(c.depart_le)}</span>
              </li>
              {dossier.journal.length === 0 ? (
                <li className="tav-t-evenement">
                  <TavIcone nom="Lock" taille={14} />
                  <span>{source === "reelle" ? "Rien au journal pour ce contrat, ou votre rôle ne le lit pas (la direction lit le journal)." : "Rien encore au journal."}</span>
                </li>
              ) : (
                dossier.journal.map((l) => (
                  <li key={String(l.id)} className="tav-t-evenement">
                    <TavIcone nom={/refuse|litige|non_regle|sans_adresse|expire/.test(l.action) ? "Alert" : "Updated"} taille={14} />
                    <span className="tav-t-qui">{nommer(typeof l.donnees.par === "string" ? l.donnees.par : typeof l.donnees.saisi_par === "string" ? l.donnees.saisi_par : null)}</span>
                    <span>
                      {ACTIONS_JOURNAL[l.action] ?? l.action}
                      {typeof l.donnees.reference === "string" ? ` ${l.donnees.reference}` : ""}
                      {typeof l.donnees.total_ttc === "number" ? ` · ${montant(l.donnees.total_ttc)}` : typeof l.donnees.montant_ttc === "number" ? ` · ${montant(l.donnees.montant_ttc)}` : typeof l.donnees.montant === "number" ? ` · ${montant(l.donnees.montant)}` : ""}
                      {typeof l.donnees.relance === "number" ? ` (n° ${l.donnees.relance})` : ""}
                      {Array.isArray(l.donnees.decideurs) ? ` · décidé par ${(l.donnees.decideurs as string[]).map(nommer).join(", ")}` : ""}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span title={dateHeure(l.survenu_le)}>{relatif(l.survenu_le)}</span>
                  </li>
                ))
              )}
            </ul>
            {demande ? (
              <article className="tav-t-commentaire">
                <div className="tav-t-commentaire-tete">
                  <span className="tav-t-commentaire-avatar" aria-hidden="true">
                    <TavIcone nom="Inbox" taille={12} />
                  </span>
                  <strong>À valider</strong>
                  <span className="tav-t-commentaire-date">{demande.statut === "en_attente" ? `échéance ${relatif(demande.echeance)}` : demande.statut}</span>
                </div>
                <p className="tav-t-commentaire-corps">
                  {demande.statut === "en_attente" ? (
                    <>
                      Devant l&apos;agence : {demande.approbations_requises} accord{demande.approbations_requises > 1 ? "s" : ""} requis ({demande.roles_autorises.join(", ")}).{" "}
                      {aiChiffre ? "Vous avez chiffré ce retour : une autre personne décide (séparation saisie / approbation). " : null}
                      <Link href="/espace2/validations" className="tav-t-lien">
                        Ouvrir la file « À valider »
                      </Link>
                    </>
                  ) : demande.statut === "rejetee" ? (
                    "Refusée par l'agence. Rechiffrez le retour si une facture reste due."
                  ) : (
                    `Décidée (${demande.statut === "executee" ? "exécutée" : demande.statut}).`
                  )}
                </p>
              </article>
            ) : null}
          </div>

          <aside className="tav-t-proprietes" aria-label="Propriétés du contrat">
            <h3 className="tav-t-prop-titre">Propriétés</h3>
            <div className="tav-t-prop-liste">
              <Pilule etat={etatContrat}>{c.statut === "ouvert" && renduLe ? "Rendu" : STATUTS_CONTRAT[c.statut].libelle}</Pilule>
              <Pilule icone="Calculator" vide={!p}>{p ? STATUTS_PROPOSITION[p.statut].libelle : "Pas de chiffrage"}</Pilule>
              <Pilule icone="Shield" vide={c.franchise_eur === null}>{c.franchise_eur !== null ? `Franchise ${montant(c.franchise_eur)}${c.rachat_franchise ? `, rachat (${montant(c.franchise_reduite_eur ?? 0)})` : c.franchise_reduite_eur !== null ? `, réduite ${montant(c.franchise_reduite_eur)}` : ""}` : "Franchise inconnue"}</Pilule>
              <Pilule icone="Euro">{`${montant(c.tarif_jour_eur)} par jour`}</Pilule>
              <Pilule icone="Speedometer" vide={!c.km_illimite && c.km_inclus === null && c.km_inclus_jour === null}>{forfait.charAt(0).toUpperCase() + forfait.slice(1)}</Pilule>
            </div>
            <h3 className="tav-t-prop-titre">Étiquettes</h3>
            <div className="tav-t-prop-etiquettes">
              {etiquettes.length ? (
                etiquettes.map((e) => (
                  <span key={e.nom} className="tav-t-etiquette">
                    <span className="tav-t-pastille" style={{ background: e.couleur }} />
                    {e.nom}
                  </span>
                ))
              ) : (
                <Pilule icone="Label" vide>
                  Aucune étiquette
                </Pilule>
              )}
            </div>
            <h3 className="tav-t-prop-titre">Agence</h3>
            <div className="tav-t-prop-liste">
              <Pilule icone="Team">{agence?.nom ?? agence?.code ?? "Agence"}</Pilule>
              <Pilule icone="Car" vide={!vehicule}>{vehicule ? `${vehicule.immatriculation}${categorie ? ` · cat. ${categorie.code}` : ""}` : "Véhicule inconnu"}</Pilule>
              <Pilule icone="Users" vide={!locataire?.email}>{locataire?.email ?? "Courriel inconnu"}</Pilule>
              <Pilule icone="Page">{`Source : ${c.source === "export" ? "export du logiciel" : c.source === "pdf" ? "contrat PDF lu" : c.source}`}</Pilule>
            </div>
          </aside>
        </div>
      </div>

      <EtatsDesLieux dossier={dossier} role={role} bareme={bareme} nommer={nommer} gestes={gestesEtats} onFait={(m) => toast(`C'est fait. ${m}`, "vert")} netteteMin={reglages?.nettete_min} masque demande={demandeEtat} />

      {/* ——— G12 : lever la caution, désormais confirmé ——— */}
      <Dialog open={leverOuvert} onOpenChange={(o) => !o && setLeverOuvert(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone>
              <ShieldCheck width={18} height={18} aria-hidden="true" />
            </DialogIcone>
            <DialogTitle>Lever la caution du contrat {c.numero}</DialogTitle>
            <DialogDescription>Aucune facture ne reste due sur ce contrat : la caution prise au départ est rendue au locataire. Le geste ne se reprend pas.</DialogDescription>
          </DialogHeader>
          <DialogBody>{erreurLever ? <Avis teinte="rouge" role="alert">{erreurLever}</Avis> : null}</DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={envoiLever} onClick={lever}>
              {envoiLever ? <Loader variant="spin" /> : null} Lever la caution
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
