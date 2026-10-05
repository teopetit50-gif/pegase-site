"use client";

/* ══════════════════════════════════════════════════════════════════════
   Le dossier d'un document FILED (05/10/2026)

   À gauche : l'en-tête (numéro, état, fournisseur, dates, montants — chaque
   valeur cliquable surligne sa citation dans la pièce), les contrôles
   (échoués d'abord, puis levés, puis passés ; chaque contrôle avec sa
   preuve et le motif officiel DGFiP), les lignes et la TVA, le
   rapprochement, le fil. À droite : la pièce en regard.

   Les corrections passent par les portes (portes.ts) ; en exemple elles
   sont appliquées en mémoire pour que l'écran réagisse. Les formulaires
   sont des Dialog ; chaque porte demande un motif (≥ 3 caractères, comme
   la contrainte de filed_levees).
   ══════════════════════════════════════════════════════════════════════ */

import { useMemo, useState } from "react";
import { AlertTriangle, Ban, Check, CheckCircle2, ClipboardList, FolderInput, Landmark, Link2, Pencil, ShieldCheck, Unlock } from "lucide-react";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import type { Source } from "../source";
import { Avis, Def, Pastille } from "../ui";
import { dateCourte, dateHeure, masquerIban, montant, nombreFr, pourcent } from "../format";
import type { Commande, Controle, DossierFiled, Fournisseur, LigneCommande, LigneFacture, MotifRefus, NatureDocument } from "../types";
import { CHAMPS_CORRIGEABLES, CHAMP_PAR_COLONNE, ETATS, FAMILLES_CONTROLE, NATURES, STATUTS_FACTURE, grouperControles, libelleChamp } from "./etats";
import { apparierLigne, bloquerFournisseur, classerDocument, confirmerValeurs, corrigerFacture, leverAnomalie, proposerIban, rattacherCommande, rattacherFournisseur } from "./portes";
import VisionneusePiece from "./VisionneusePiece";

type Props = {
  dossier: DossierFiled;
  source: Source;
  motifs: MotifRefus[];
  fournisseurs: Fournisseur[];
  commandes: Commande[];
  lignesCommande: LigneCommande[];
  onLocal: (d: DossierFiled) => void;
  relire: () => Promise<void>;
};

type Form =
  | { type: "corriger"; champ?: string }
  | { type: "confirmer" }
  | { type: "lever"; controle: Controle }
  | { type: "classer" }
  | { type: "rattacher" }
  | { type: "iban" }
  | { type: "bloquer"; bloquer: boolean }
  | { type: "commande" }
  | { type: "apparier"; ligne: LigneFacture }
  | null;

const maintenant = () => new Date().toISOString();

export default function DossierVue({ dossier, source, motifs, fournisseurs, commandes, lignesCommande, onLocal, relire }: Props) {
  const { document: doc, facture, fournisseur } = dossier;
  const [actif, setActif] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [fait, setFait] = useState<string | null>(null);
  const [motif, setMotif] = useState("");
  const [champ, setChamp] = useState(CHAMPS_CORRIGEABLES[0].cle);
  const [valeur, setValeur] = useState("");
  const [nature, setNature] = useState<NatureDocument>("facture");
  const [fournisseurChoisi, setFournisseurChoisi] = useState("");
  const [iban, setIban] = useState("");
  const [commandeChoisie, setCommandeChoisie] = useState("");
  const [ligneCommandeChoisie, setLigneCommandeChoisie] = useState("");

  const groupes = useMemo(() => grouperControles(dossier.controles), [dossier.controles]);
  const motifOfficiel = (code: string | null) => (code ? motifs.find((m) => m.code === code) ?? { code, libelle: code.replace(/_/g, " ").toLowerCase(), description: null } : null);

  /* une valeur de l'en-tête → la boîte citée dans la pièce */
  const valeurDe = (champPiece: string) => dossier.valeurs.find((v) => v.champ === champPiece) ?? null;
  const citer = (champPiece: string) => {
    const v = valeurDe(champPiece);
    setActif((a) => (v && a !== v.id ? v.id : null));
  };
  const nonVerifiees = dossier.valeurs.filter((v) => !v.verifiee);

  const ouvrir = (f: Form) => {
    setErreur(null);
    setFait(null);
    setMotif("");
    setValeur("");
    setIban("");
    setFournisseurChoisi("");
    setCommandeChoisie(facture?.commande_id ?? "");
    setLigneCommandeChoisie("");
    if (f?.type === "corriger" && f.champ) setChamp(f.champ);
    if (f?.type === "classer") setNature(doc.nature ?? "facture");
    setForm(f);
  };

  const motifOk = motif.trim().length >= 3;

  async function envoyer(action: () => Promise<void>, local: () => DossierFiled, message: string) {
    setEnvoi(true);
    setErreur(null);
    try {
      if (source === "reelle") {
        await action();
        await relire();
      } else {
        await new Promise((r) => setTimeout(r, 350));
        onLocal(local());
      }
      setFait(message);
      setForm(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base a refusé l'opération.");
    } finally {
      setEnvoi(false);
    }
  }

  const ajouterFil = (d: DossierFiled, etape: string, message: string): DossierFiled => {
    const quand = maintenant();
    return {
      ...d,
      historique: [...d.historique, { id: `${etape}-${quand}`, etape, message, detail: {}, acteur_type: "utilisateur", acteur_libelle: "Vous", survenu_le: quand }],
    };
  };

  /* ——— les sept portes ——— */
  const soumettreCorrection = () => {
    if (!facture) return;
    const def = CHAMPS_CORRIGEABLES.find((c) => c.cle === champ)!;
    const brut = valeur.trim();
    const val: unknown = def.type === "montant" ? Number(brut.replace(/\s/g, "").replace(",", ".")) : brut;
    return envoyer(
      () => corrigerFacture(facture.id, { [champ]: val }, motif.trim()).then(() => undefined),
      () => {
        const f = { ...facture, [champ]: val, version: facture.version + 1, champs_douteux: facture.champs_douteux.filter((c) => c !== CHAMP_PAR_COLONNE[champ]) };
        const champPiece = CHAMP_PAR_COLONNE[champ];
        const valeurs = dossier.valeurs.map((v) => (v.champ === champPiece ? { ...v, texte: def.type === "montant" ? montant(val as number) : brut, valeur: val, source: "humain" as const, verifiee: true, confiance: 1 } : v));
        return ajouterFil({ ...dossier, facture: f, valeurs }, "correction", `${def.libelle} corrigé(e) : ${brut} — ${motif.trim()}`);
      },
      "La valeur est corrigée ; les contrôles vont être rejoués sur la nouvelle version.",
    );
  };

  const soumettreConfirmation = () => {
    if (!facture) return;
    const champs = nonVerifiees.map((v) => v.champ);
    return envoyer(
      () => confirmerValeurs(facture.id, champs).then(() => undefined),
      () => ajouterFil({ ...dossier, valeurs: dossier.valeurs.map((v) => ({ ...v, verifiee: true })) }, "confirmation", `${champs.length} valeurs lues confirmées.`),
      `${champs.length} valeur${champs.length > 1 ? "s" : ""} confirmée${champs.length > 1 ? "s" : ""}.`,
    );
  };

  const soumettreLevee = (c: Controle) => {
    if (!facture) return;
    return envoyer(
      () => leverAnomalie(facture.id, c.code, motif.trim()).then(() => undefined),
      () => {
        const leveeId = `levee-${Date.now()}`;
        const controles = dossier.controles.map((x) => (x.id === c.id ? { ...x, resultat: "levee" as const, levee_id: leveeId } : x));
        const restants = controles.filter((x) => x.resultat === "anomalie");
        const nb_bloquants = restants.filter((x) => x.gravite === "bloquant").length;
        const nb_attention = restants.filter((x) => x.gravite === "attention").length;
        const f = { ...facture, nb_bloquants, nb_attention, anomalies: restants.map((x) => x.code), statut: nb_bloquants ? ("bloquee" as const) : ("a_valider" as const) };
        return ajouterFil(
          { ...dossier, facture: f, controles, levees: [...dossier.levees, { id: leveeId, code: c.code, cle: c.cle, motif: motif.trim(), leve_par: null, leve_le: maintenant(), leve_par_nom: "Vous" }] },
          "levee",
          `Anomalie « ${c.code} » levée : ${motif.trim()}`,
        );
      },
      "L'anomalie est levée, avec son motif ; la facture avance.",
    );
  };

  const soumettreClassement = () =>
    envoyer(
      () => classerDocument(doc.id, nature, motif.trim()).then(() => undefined),
      () => ajouterFil({ ...dossier, document: { ...doc, nature, nature_source: "humain", etat: "classe", traite_le: maintenant(), motif: motif.trim() } }, "classement", `Classé « ${NATURES[nature]} » : ${motif.trim()}`),
      `Le document est classé comme ${NATURES[nature].toLowerCase()}.`,
    );

  const soumettreRattachement = () => {
    if (!facture) return;
    const f = fournisseurs.find((x) => x.id === fournisseurChoisi);
    return envoyer(
      () => rattacherFournisseur(facture.id, fournisseurChoisi, motif.trim()).then(() => undefined),
      () => ajouterFil({ ...dossier, fournisseur: f ?? dossier.fournisseur, facture: { ...facture, fournisseur_id: fournisseurChoisi, fournisseur_identification: "humain" } }, "rattachement", `Fournisseur rattaché : ${f?.nom ?? fournisseurChoisi} — ${motif.trim()}`),
      "Le fournisseur est rattaché à la facture.",
    );
  };

  const ibanPropre = iban.replace(/\s+/g, "").toUpperCase();
  const ibanOk = /^[A-Z]{2}[0-9]{2}[A-Z0-9]{10,30}$/.test(ibanPropre);
  const soumettreIban = () => {
    if (!fournisseur) return;
    return envoyer(
      () => proposerIban(fournisseur.id, ibanPropre, motif.trim()).then(() => undefined),
      () => ajouterFil({ ...dossier, ibans: [...dossier.ibans, { id: `iban-${Date.now()}`, fournisseur_id: fournisseur.id, iban_masque: masquerIban(ibanPropre), statut: "propose", propose_le: maintenant() }] }, "iban", `IBAN proposé pour ${fournisseur.nom} : ${masquerIban(ibanPropre)} — ${motif.trim()}`),
      "L'IBAN est proposé ; il sera validé par une personne habilitée.",
    );
  };

  /* la commande retenue et ses lignes — pour « rattacher » et « apparier » */
  const commandeDe = (id: string | null) => commandes.find((c) => c.id === id) ?? null;
  const commandeRetenue = commandeDe(facture?.commande_id ?? null);
  const lignesDeLaCommande = (id: string) => lignesCommande.filter((l) => l.commande_id === id);
  const ligneCommandeDe = (ligne: LigneFacture) => {
    const a = dossier.appariements.find((x) => x.facture_ligne_id === ligne.id);
    return a ? lignesCommande.find((l) => l.id === a.commande_ligne_id) ?? null : null;
  };

  const soumettreCommande = () => {
    if (!facture) return;
    const c = commandeDe(commandeChoisie);
    return envoyer(
      () => rattacherCommande(facture.id, commandeChoisie, motif.trim()).then(() => undefined),
      () => ajouterFil({ ...dossier, facture: { ...facture, commande_id: commandeChoisie }, rapprochement: dossier.rapprochement ? { ...dossier.rapprochement, commande_id: commandeChoisie } : { id: `rp-${Date.now()}`, commande_id: commandeChoisie, mode: "lignes", nb_lignes: dossier.lignes.length, nb_appariees: 0, nb_sans_commande: dossier.lignes.length, ecart_prix: 0, ecart_quantite: 0, deja_facture: 0, non_recu: 0, ecart_montant: null } }, "rattachement_commande", `Commande ${c?.numero ?? commandeChoisie} désignée — ${motif.trim()}`),
      "La commande est rattachée ; le rapprochement est rejoué sur ses lignes.",
    );
  };

  const soumettreAppariement = (ligne: LigneFacture) => {
    if (!facture) return;
    const lc = lignesCommande.find((l) => l.id === ligneCommandeChoisie);
    return envoyer(
      () => apparierLigne(facture.id, ligne.id, ligneCommandeChoisie, motif.trim()).then(() => undefined),
      () => {
        const appariements = [...dossier.appariements.filter((x) => x.facture_ligne_id !== ligne.id), { facture_ligne_id: ligne.id, commande_ligne_id: ligneCommandeChoisie }];
        const rapprochement = dossier.rapprochement ? { ...dossier.rapprochement, nb_appariees: appariements.length, nb_sans_commande: Math.max(0, dossier.lignes.length - appariements.length) } : dossier.rapprochement;
        return ajouterFil({ ...dossier, appariements, rapprochement }, "appariement", `Ligne ${ligne.rang} appariée à la ligne ${lc?.rang ?? "?"} de la commande — ${motif.trim()}`);
      },
      "La ligne est appariée à la commande.",
    );
  };

  const soumettreBlocage = (bloquer: boolean) => {
    if (!fournisseur) return;
    return envoyer(
      () => bloquerFournisseur(fournisseur.id, bloquer, motif.trim()).then(() => undefined),
      () => ajouterFil({ ...dossier, fournisseur: { ...fournisseur, statut: bloquer ? "bloque" : "actif" } }, bloquer ? "blocage_fournisseur" : "deblocage_fournisseur", `${fournisseur.nom} ${bloquer ? "bloqué" : "débloqué"} : ${motif.trim()}`),
      bloquer ? "Le fournisseur est bloqué : plus aucune facture ne sera payée sans déblocage." : "Le fournisseur est débloqué.",
    );
  };

  const e = ETATS[doc.etat];

  return (
    <div className="esp-dossier" style={{ display: "grid", gap: 14 }}>
      <div className="esp-carte">
        <div className="esp-carte-tete">
          <div className="esp-item-haut">
            <span className="esp-mono" style={{ fontWeight: 700, fontSize: 15 }}>{doc.reference}</span>
            <Pastille teinte={e.teinte}>{e.libelle}</Pastille>
            {facture ? <Pastille teinte={STATUTS_FACTURE[facture.statut].teinte}>{STATUTS_FACTURE[facture.statut].libelle}</Pastille> : null}
            {doc.nature ? <Pastille contour>{NATURES[doc.nature]}{doc.nature_source === "humain" ? " · classé à la main" : ""}</Pastille> : <Pastille teinte="ambre">Nature à classer</Pastille>}
            {facture ? <Pastille contour>version {facture.version}</Pastille> : null}
          </div>
          <span className="esp-kpi-sous">Reçu le {dateHeure(doc.recu_le)}{doc.expediteur ? ` · ${doc.expediteur}` : ""}</span>
        </div>

        <div className="esp-dossier-grille">
          {/* ——— colonne dossier ——— */}
          <div className="esp-carte-corps" style={{ display: "grid", gap: 16 }}>
            {doc.etat === "doublon" ? (
              <Avis teinte="gris"><strong>Doublon.</strong> {doc.motif ?? "Ce document a déjà été reçu."}</Avis>
            ) : null}
            {doc.etat === "a_classer" ? (
              <Avis teinte="ambre"><strong>À classer.</strong> {doc.motif ?? "Le lecteur n'a pas reconnu la nature du document."}</Avis>
            ) : null}
            {doc.etat === "en_lecture" ? (
              <Avis teinte="bleu"><strong>En lecture.</strong> Le document est en cours de lecture ; ses valeurs et ses contrôles arrivent dans quelques secondes.</Avis>
            ) : null}
            {fournisseur?.statut === "bloque" ? (
              <Avis teinte="rouge"><strong>Fournisseur bloqué.</strong> Aucune facture de {fournisseur.nom} ne sera payée tant qu&apos;il n&apos;est pas débloqué.</Avis>
            ) : null}

            {facture ? (
              <>
                <div>
                  <div className="esp-section-titre">Valeurs lues — cliquer pour voir la citation dans la pièce</div>
                  <div className="esp-valeurs">
                    <Valeur champ="fournisseur.nom" texte={fournisseur?.nom ?? String(facture.fournisseur_lu?.nom ?? "—")} v={valeurDe("fournisseur.nom")} actif={actif} onClick={() => citer("fournisseur.nom")} douteux={facture.champs_douteux.includes("fournisseur.nom")} />
                    <Valeur champ="facture.numero" texte={facture.numero ?? "—"} v={valeurDe("facture.numero")} actif={actif} onClick={() => citer("facture.numero")} douteux={facture.champs_douteux.includes("facture.numero")} />
                    <Valeur champ="facture.date_emission" texte={dateCourte(facture.date_emission)} v={valeurDe("facture.date_emission")} actif={actif} onClick={() => citer("facture.date_emission")} douteux={false} />
                    <Valeur champ="facture.echeance" texte={dateCourte(facture.echeance_lue)} v={valeurDe("facture.echeance")} actif={actif} onClick={() => citer("facture.echeance")} douteux={false} />
                    <Valeur champ="totaux.ht" texte={montant(facture.montant_ht, facture.devise)} v={valeurDe("totaux.ht")} actif={actif} onClick={() => citer("totaux.ht")} douteux={false} />
                    <Valeur champ="totaux.tva" texte={montant(facture.montant_tva, facture.devise)} v={valeurDe("totaux.tva")} actif={actif} onClick={() => citer("totaux.tva")} douteux={false} />
                    <Valeur champ="totaux.ttc" texte={montant(facture.montant_ttc, facture.devise)} v={valeurDe("totaux.ttc")} actif={actif} onClick={() => citer("totaux.ttc")} douteux={false} />
                    <Valeur champ="paiement.iban" texte={masquerIban(facture.iban)} v={valeurDe("paiement.iban")} actif={actif} onClick={() => citer("paiement.iban")} douteux={facture.champs_douteux.includes("paiement.iban")} />
                    <Valeur champ="fournisseur.siren" texte={fournisseur?.siren ?? String(facture.fournisseur_lu?.siren ?? "—")} v={valeurDe("fournisseur.siren")} actif={actif} onClick={() => citer("fournisseur.siren")} douteux={false} />
                  </div>
                  <div className="esp-actions" style={{ marginTop: 10 }}>
                    <button type="button" className="r-btn r-btn--fil r-btn--petit" onClick={() => ouvrir({ type: "corriger" })}><Pencil width={13} height={13} aria-hidden="true" /> Corriger une valeur</button>
                    <button type="button" className="r-btn r-btn--fil r-btn--petit" disabled={!nonVerifiees.length} onClick={() => ouvrir({ type: "confirmer" })}><ShieldCheck width={13} height={13} aria-hidden="true" /> Confirmer les {nonVerifiees.length || ""} valeurs non vérifiées</button>
                    <button type="button" className="r-btn r-btn--fil r-btn--petit" onClick={() => ouvrir({ type: "rattacher" })}><Link2 width={13} height={13} aria-hidden="true" /> Rattacher à un fournisseur</button>
                    <button type="button" className="r-btn r-btn--fil r-btn--petit" disabled={!commandes.length} onClick={() => ouvrir({ type: "commande" })}><ClipboardList width={13} height={13} aria-hidden="true" /> {commandeRetenue ? `Commande ${commandeRetenue.numero} · changer` : "Désigner une commande"}</button>
                    {fournisseur ? <button type="button" className="r-btn r-btn--fil r-btn--petit" onClick={() => ouvrir({ type: "iban" })}><Landmark width={13} height={13} aria-hidden="true" /> Proposer un IBAN</button> : null}
                    {fournisseur ? (
                      <button type="button" className="r-btn r-btn--fil r-btn--petit" onClick={() => ouvrir({ type: "bloquer", bloquer: fournisseur.statut !== "bloque" })}>
                        {fournisseur.statut === "bloque" ? <Unlock width={13} height={13} aria-hidden="true" /> : <Ban width={13} height={13} aria-hidden="true" />} {fournisseur.statut === "bloque" ? "Débloquer le fournisseur" : "Bloquer le fournisseur"}
                      </button>
                    ) : null}
                  </div>
                </div>

                <div>
                  <div className="esp-section-titre">
                    Contrôles — {groupes.passes.length} passé{groupes.passes.length > 1 ? "s" : ""}, {groupes.echoues.length} échoué{groupes.echoues.length > 1 ? "s" : ""}, {groupes.leves.length} levé{groupes.leves.length > 1 ? "s" : ""}
                  </div>
                  {[...groupes.echoues, ...groupes.leves, ...groupes.passes].map((c) => {
                    const m = motifOfficiel(c.motif_officiel);
                    const levee = c.levee_id ? dossier.levees.find((l) => l.id === c.levee_id) : null;
                    const preuve = Object.entries(c.preuve ?? {});
                    return (
                      <div key={c.id} className="esp-controle">
                        <span className="esp-controle-icone" data-resultat={c.resultat} data-gravite={c.gravite} aria-hidden="true">
                          {c.resultat === "ok" ? <Check width={13} height={13} /> : c.resultat === "levee" ? <Unlock width={12} height={12} /> : <AlertTriangle width={12} height={12} />}
                        </span>
                        <div>
                          <div className="esp-controle-haut">
                            <span className="esp-mono">{c.code}</span>
                            <Pastille contour>{FAMILLES_CONTROLE[c.famille] ?? c.famille}</Pastille>
                            <Pastille teinte={c.gravite === "bloquant" ? "rouge" : c.gravite === "attention" ? "ambre" : "gris"}>{c.gravite === "bloquant" ? "Bloquant" : c.gravite === "attention" ? "À vérifier" : "Information"}</Pastille>
                            {c.resultat === "levee" ? <Pastille teinte="bleu">Levé</Pastille> : null}
                          </div>
                          <div className="esp-controle-message">{c.message}</div>
                          {m ? (
                            <div className="esp-controle-motif">
                              Motif officiel : <b>{m.libelle}</b> <span className="esp-mono">({m.code})</span>
                              {m.description ? ` — ${m.description}` : ""}
                            </div>
                          ) : null}
                          {preuve.length ? (
                            <div className="esp-preuve">
                              {preuve.map(([k, val]) => (
                                <span key={k}><b>{k.replace(/_/g, " ")}</b> : {typeof val === "object" ? JSON.stringify(val) : String(val)}</span>
                              ))}
                            </div>
                          ) : null}
                          {levee ? <div className="esp-controle-motif">Levé par <b>{levee.leve_par_nom ?? "une personne habilitée"}</b> le {dateHeure(levee.leve_le)} : {levee.motif}</div> : null}
                          {c.resultat === "anomalie" ? (
                            <div className="esp-controle-actions">
                              <button type="button" className="r-btn r-btn--fil r-btn--petit" onClick={() => ouvrir({ type: "lever", controle: c })}><Unlock width={12} height={12} aria-hidden="true" /> Lever avec un motif</button>
                              {c.preuve?.champ ? <button type="button" className="r-btn r-btn--fil r-btn--petit" onClick={() => citer(String(c.preuve.champ))}>Voir dans la pièce</button> : null}
                              {c.code === "fournisseur.iban_connu" && fournisseur ? <button type="button" className="r-btn r-btn--fil r-btn--petit" onClick={() => ouvrir({ type: "iban" })}><Landmark width={12} height={12} aria-hidden="true" /> Proposer cet IBAN</button> : null}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                  {!dossier.controles.length ? <p className="esp-kpi-sous">Aucun contrôle pour cette version.</p> : null}
                </div>

                {dossier.lignes.length ? (
                  <div>
                    <div className="esp-section-titre">Lignes</div>
                    <div className="esp-tableau-cadre">
                      <table className="esp-tableau">
                        <thead>
                          <tr><th>#</th><th>Désignation</th><th className="esp-num">Qté</th><th className="esp-num">P.U. HT</th><th className="esp-num">Montant HT</th><th className="esp-num">TVA</th><th>Commande</th><th aria-label="Apparier" /></tr>
                        </thead>
                        <tbody>
                          {dossier.lignes.map((l) => (
                            <tr key={l.id}>
                              <td>{l.rang}</td>
                              <td>{l.designation}</td>
                              <td className="esp-num">{nombreFr(l.quantite)}{l.unite ? ` ${l.unite}` : ""}</td>
                              <td className="esp-num">{montant(l.prix_unitaire, facture.devise)}</td>
                              <td className="esp-num">{montant(l.montant_ht, facture.devise)}</td>
                              <td className="esp-num">{pourcent(l.taux_tva)}</td>
                              <td>
                                {(() => {
                                  const lc = ligneCommandeDe(l);
                                  if (lc) {
                                    const ecart = l.prix_unitaire !== null && lc.prix_unitaire !== null ? l.prix_unitaire - lc.prix_unitaire : 0;
                                    return (
                                      <span className="esp-item-haut">
                                        <span className="esp-mono">{commandeDe(lc.commande_id)?.numero ?? ""}/{lc.rang}</span>
                                        {ecart ? <Pastille teinte="ambre">{ecart > 0 ? "+" : ""}{montant(ecart, facture.devise)} / u.</Pastille> : <Pastille teinte="vert">conforme</Pastille>}
                                      </span>
                                    );
                                  }
                                  return <span className="esp-mono">{l.commande_ligne ?? "—"}</span>;
                                })()}
                              </td>
                              <td>
                                {commandeRetenue || commandes.length ? (
                                  <button type="button" className="esp-lien-bouton" onClick={() => { ouvrir({ type: "apparier", ligne: l }); if (commandeRetenue) setCommandeChoisie(commandeRetenue.id); }}>
                                    {ligneCommandeDe(l) ? "Changer" : "Apparier"}
                                  </button>
                                ) : null}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : null}

                {dossier.tva.length || dossier.rapprochement ? (
                  <dl className="esp-def">
                    {dossier.tva.length ? (
                      <Def etiquette="TVA par taux">
                        {dossier.tva.map((t) => (
                          <div key={t.id}>{pourcent(t.taux)} sur {montant(t.base, facture.devise)} → {montant(t.montant, facture.devise)}</div>
                        ))}
                      </Def>
                    ) : null}
                    {dossier.rapprochement ? (
                      <Def etiquette="Rapprochement commande">
                        {dossier.rapprochement.mode === "aucun"
                          ? "Aucune commande citée ni désignée."
                          : `${dossier.rapprochement.nb_appariees}/${dossier.rapprochement.nb_lignes} lignes appariées (mode ${dossier.rapprochement.mode})${dossier.rapprochement.ecart_prix ? ` · écart de prix ${montant(dossier.rapprochement.ecart_prix, facture.devise)}` : ""}${dossier.rapprochement.ecart_quantite ? ` · écart de quantité ${nombreFr(dossier.rapprochement.ecart_quantite)}` : ""}`}
                      </Def>
                    ) : null}
                    {dossier.ibans.length ? (
                      <Def etiquette="IBAN connus du fournisseur">
                        {dossier.ibans.map((i) => (
                          <div key={i.id} className="esp-item-haut">
                            <span className="esp-mono">{i.iban_masque}</span>
                            <Pastille teinte={i.statut === "valide" ? "vert" : i.statut === "propose" ? "ambre" : "gris"}>{i.statut === "valide" ? "Validé" : i.statut === "propose" ? "Proposé" : i.statut === "refuse" ? "Refusé" : "Révoqué"}</Pastille>
                          </div>
                        ))}
                      </Def>
                    ) : null}
                  </dl>
                ) : null}
              </>
            ) : (
              <div className="esp-actions">
                {doc.etat === "a_classer" || doc.etat === "illisible" ? (
                  <button type="button" className="r-btn r-btn--noir" onClick={() => ouvrir({ type: "classer" })}><FolderInput width={15} height={15} aria-hidden="true" /> Classer ce document</button>
                ) : null}
              </div>
            )}

            {fait ? <Avis teinte="vert" role="status"><strong>C&apos;est fait.</strong> {fait}</Avis> : null}
            {erreur && !form ? <Avis teinte="rouge" role="alert"><strong>Refusé par la base.</strong> {erreur}</Avis> : null}

            <div>
              <div className="esp-section-titre">Fil du document</div>
              <ul className="esp-fil">
                {dossier.historique.map((h) => (
                  <li key={String(h.id)}>
                    <span className="esp-fil-point" data-teinte={/levee|integration|classement|paiement|confirmation/.test(h.etape) ? "vert" : /blocage|doublon|litige/.test(h.etape) ? "rouge" : /demande|correction|iban|rattachement/.test(h.etape) ? "bleu" : undefined} />
                    <div>
                      <div className="esp-fil-texte">{h.message}</div>
                      <div className="esp-fil-meta">{dateHeure(h.survenu_le)}{h.acteur_libelle ? ` · ${h.acteur_libelle}` : h.acteur_type === "systeme" ? " · système" : ""}</div>
                    </div>
                  </li>
                ))}
                {!dossier.historique.length ? <li><span className="esp-fil-point" /><div className="esp-fil-meta">Aucun évènement.</div></li> : null}
              </ul>
            </div>
          </div>

          {/* ——— colonne pièce ——— */}
          <div className="esp-carte-corps">
            <VisionneusePiece dossier={dossier} source={source} actif={actif} onChoisir={setActif} />
          </div>
        </div>
      </div>

      {/* ——— dialogues ——— */}
      <Dialog open={form?.type === "corriger"} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><Pencil width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>Corriger une valeur</DialogTitle>
            <DialogDescription>La correction crée une nouvelle version de la facture ; les contrôles sont rejoués. La valeur lue reste dans le fil.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              <label className="rv-libelle">Champ
                <select className="rv-champ" value={champ} onChange={(e2) => setChamp(e2.target.value)}>
                  {CHAMPS_CORRIGEABLES.map((c) => <option key={c.cle} value={c.cle}>{c.libelle}</option>)}
                </select>
              </label>
              <label className="rv-libelle">Nouvelle valeur <span className="esp-obligatoire">(obligatoire)</span>
                <input className="rv-champ" type={CHAMPS_CORRIGEABLES.find((c) => c.cle === champ)?.type === "date" ? "date" : "text"} inputMode={CHAMPS_CORRIGEABLES.find((c) => c.cle === champ)?.type === "montant" ? "decimal" : undefined} value={valeur} onChange={(e2) => setValeur(e2.target.value)} />
              </label>
              <ChampMotif motif={motif} onChange={setMotif} />
              {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={!motifOk || !valeur.trim() || envoi} onClick={soumettreCorrection}>{envoi ? <Loader variant="spin" /> : null} Corriger</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={form?.type === "confirmer"} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><ShieldCheck width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>Confirmer les valeurs lues</DialogTitle>
            <DialogDescription>Vous attestez que ces {nonVerifiees.length} valeurs sont celles de la pièce. Elles passent « vérifiées » et ne seront plus signalées.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <ul className="esp-fil">
              {nonVerifiees.map((v) => (
                <li key={v.id}><span className="esp-fil-point" /><div><div className="esp-fil-texte"><strong>{libelleChamp(v.champ)}</strong> — {v.texte}</div><div className="esp-fil-meta">page {v.page ?? 1} · confiance {v.confiance !== null ? Math.round(v.confiance * 100) : "—"} %</div></div></li>
              ))}
            </ul>
            {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={envoi} onClick={soumettreConfirmation}>{envoi ? <Loader variant="spin" /> : null} Confirmer</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={form?.type === "lever"} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><Unlock width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>Lever l&apos;anomalie</DialogTitle>
            <DialogDescription>{form?.type === "lever" ? form.controle.message : ""}</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              {form?.type === "lever" && form.controle.gravite === "bloquant" ? <Avis teinte="rouge"><strong>Contrôle bloquant.</strong> Lever une anomalie bloquante engage votre responsabilité : le motif est conservé avec votre nom et l&apos;heure.</Avis> : null}
              <ChampMotif motif={motif} onChange={setMotif} aide="Ce que vous avez vérifié, et par quel canal (téléphone au numéro connu, courriel, bon de commande…)." />
              {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={!motifOk || envoi} onClick={() => form?.type === "lever" && soumettreLevee(form.controle)}>{envoi ? <Loader variant="spin" /> : null} Lever l&apos;anomalie</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={form?.type === "classer"} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><FolderInput width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>Classer le document</DialogTitle>
            <DialogDescription>Vous donnez la nature que le lecteur n&apos;a pas su reconnaître.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              <label className="rv-libelle">Nature
                <select className="rv-champ" value={nature} onChange={(e2) => setNature(e2.target.value as NatureDocument)}>
                  {(Object.keys(NATURES) as NatureDocument[]).map((n) => <option key={n} value={n}>{NATURES[n]}</option>)}
                </select>
              </label>
              <ChampMotif motif={motif} onChange={setMotif} />
              {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={!motifOk || envoi} onClick={soumettreClassement}>{envoi ? <Loader variant="spin" /> : null} Classer</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={form?.type === "rattacher"} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><Link2 width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>Rattacher à un fournisseur</DialogTitle>
            <DialogDescription>Le fournisseur désigné l&apos;emporte sur celui que le lecteur a identifié.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              <label className="rv-libelle">Fournisseur
                <select className="rv-champ" value={fournisseurChoisi} onChange={(e2) => setFournisseurChoisi(e2.target.value)}>
                  <option value="">Choisir…</option>
                  {fournisseurs.map((f) => <option key={f.id} value={f.id}>{f.nom}{f.siren ? ` — SIREN ${f.siren}` : ""}</option>)}
                </select>
              </label>
              <ChampMotif motif={motif} onChange={setMotif} />
              {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={!motifOk || !fournisseurChoisi || envoi} onClick={soumettreRattachement}>{envoi ? <Loader variant="spin" /> : null} Rattacher</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={form?.type === "iban"} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><Landmark width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>Proposer un IBAN</DialogTitle>
            <DialogDescription>Pour {fournisseur?.nom}. L&apos;IBAN proposé devra être validé par une personne habilitée avant tout paiement.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              <label className="rv-libelle">IBAN <span className="esp-obligatoire">(obligatoire)</span>
                <input className="rv-champ esp-mono" value={iban} onChange={(e2) => setIban(e2.target.value)} placeholder="FR76 …" autoComplete="off" />
              </label>
              {iban && !ibanOk ? <Avis teinte="ambre">Format attendu : deux lettres, deux chiffres, puis 10 à 30 caractères.</Avis> : null}
              <ChampMotif motif={motif} onChange={setMotif} aide="D'où vient cet IBAN et comment il a été vérifié (appel au numéro connu, courrier signé…)." />
              {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={!motifOk || !ibanOk || envoi} onClick={soumettreIban}>{envoi ? <Loader variant="spin" /> : null} Proposer</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={form?.type === "commande"} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><ClipboardList width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>Désigner la commande</DialogTitle>
            <DialogDescription>La commande que vous désignez l&apos;emporte sur celle que la facture cite ; le rapprochement est rejoué ligne à ligne.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              <label className="rv-libelle">Commande
                <select className="rv-champ" value={commandeChoisie} onChange={(e2) => setCommandeChoisie(e2.target.value)}>
                  <option value="">Choisir…</option>
                  {commandes.filter((c) => !fournisseur || !c.fournisseur_id || c.fournisseur_id === fournisseur.id).map((c) => <option key={c.id} value={c.id}>{c.numero}{c.date_commande ? ` — ${dateCourte(c.date_commande)}` : ""}{c.montant_ht !== null ? ` — ${montant(c.montant_ht, c.devise ?? "EUR")} HT` : ""}{c.reference_externe ? ` (${c.reference_externe})` : ""}</option>)}
                </select>
              </label>
              {commandeChoisie ? (
                <ul className="esp-fil">
                  {lignesDeLaCommande(commandeChoisie).map((l) => (
                    <li key={l.id}><span className="esp-fil-point" /><div><div className="esp-fil-texte">{l.rang}. {l.designation}</div><div className="esp-fil-meta">{nombreFr(l.quantite)}{l.unite ? ` ${l.unite}` : ""} × {montant(l.prix_unitaire)} = {montant(l.montant_ht)}</div></div></li>
                  ))}
                </ul>
              ) : null}
              <ChampMotif motif={motif} onChange={setMotif} />
              {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={!motifOk || !commandeChoisie || commandeChoisie === facture?.commande_id || envoi} onClick={soumettreCommande}>{envoi ? <Loader variant="spin" /> : null} Rattacher la commande</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={form?.type === "apparier"} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><ClipboardList width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>Apparier la ligne</DialogTitle>
            <DialogDescription>{form?.type === "apparier" ? `Ligne ${form.ligne.rang} — ${form.ligne.designation ?? ""} : ${montant(form.ligne.montant_ht, facture?.devise)}` : ""}</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              <label className="rv-libelle">Commande
                <select className="rv-champ" value={commandeChoisie} onChange={(e2) => { setCommandeChoisie(e2.target.value); setLigneCommandeChoisie(""); }}>
                  <option value="">Choisir…</option>
                  {commandes.map((c) => <option key={c.id} value={c.id}>{c.numero}</option>)}
                </select>
              </label>
              <label className="rv-libelle">Ligne de commande
                <select className="rv-champ" value={ligneCommandeChoisie} disabled={!commandeChoisie} onChange={(e2) => setLigneCommandeChoisie(e2.target.value)}>
                  <option value="">Choisir…</option>
                  {lignesDeLaCommande(commandeChoisie).map((l) => <option key={l.id} value={l.id}>{l.rang}. {l.designation} — {nombreFr(l.quantite)}{l.unite ? ` ${l.unite}` : ""} × {montant(l.prix_unitaire)}</option>)}
                </select>
              </label>
              <ChampMotif motif={motif} onChange={setMotif} />
              {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={!motifOk || !ligneCommandeChoisie || envoi} onClick={() => form?.type === "apparier" && soumettreAppariement(form.ligne)}>{envoi ? <Loader variant="spin" /> : null} Apparier</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={form?.type === "bloquer"} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone>{form?.type === "bloquer" && !form.bloquer ? <Unlock width={18} height={18} aria-hidden="true" /> : <Ban width={18} height={18} aria-hidden="true" />}</DialogIcone>
            <DialogTitle>{form?.type === "bloquer" && !form.bloquer ? "Débloquer le fournisseur" : "Bloquer le fournisseur"}</DialogTitle>
            <DialogDescription>{form?.type === "bloquer" && !form.bloquer ? `${fournisseur?.nom} pourra de nouveau être payé.` : `Plus aucune facture de ${fournisseur?.nom} ne sera payée tant que le blocage tient.`}</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              <ChampMotif motif={motif} onChange={setMotif} />
              {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className={`r-btn ${form?.type === "bloquer" && !form.bloquer ? "r-btn--noir" : "r-btn--rouge"}`} disabled={!motifOk || envoi} onClick={() => form?.type === "bloquer" && soumettreBlocage(form.bloquer)}>{envoi ? <Loader variant="spin" /> : null} {form?.type === "bloquer" && !form.bloquer ? "Débloquer" : "Bloquer"}</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Valeur({ champ, texte, v, actif, onClick, douteux }: { champ: string; texte: string; v: DossierFiled["valeurs"][number] | null; actif: string | null; onClick: () => void; douteux: boolean }) {
  return (
    <button type="button" className="esp-valeur" aria-pressed={!!v && actif === v.id} data-douteux={douteux} onClick={onClick} disabled={!v} title={v ? `Voir la citation, page ${v.page ?? 1}` : "Pas de citation dans la pièce"}>
      <span className="esp-valeur-champ">
        {libelleChamp(champ)}
        {v?.verifiee ? <span className="esp-coche" title="Vérifiée"><CheckCircle2 width={14} height={14} aria-label="vérifiée" /></span> : null}
      </span>
      <span className="esp-valeur-texte">{texte}</span>
      <span className="esp-valeur-cite">{v ? `p. ${v.page ?? 1} · ${v.source === "humain" ? "saisie" : v.source === "regle" ? "règle" : v.source.toUpperCase()}${v.confiance !== null && v.source !== "humain" ? ` · ${Math.round(v.confiance * 100)} %` : ""}` : douteux ? "douteux" : "non cité"}</span>
    </button>
  );
}

function ChampMotif({ motif, onChange, aide }: { motif: string; onChange: (s: string) => void; aide?: string }) {
  return (
    <label className="rv-libelle">
      Motif <span className="esp-obligatoire">(obligatoire, 3 caractères au moins)</span>
      <textarea className="rv-champ" value={motif} onChange={(e) => onChange(e.target.value)} maxLength={500} placeholder={aide ?? "Pourquoi, en une phrase."} />
    </label>
  );
}
