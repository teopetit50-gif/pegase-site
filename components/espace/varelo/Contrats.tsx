"use client";

/* ══════════════════════════════════════════════════════════════════════
   Les contrats du groupe à dénoncer — VARELO, vague 3 (06/10/2026, B1)

   Chaque société enregistre ses contrats (maintenance, location, licence,
   assurance…) avec leur échéance, leur reconduction et leur préavis ; le
   tiers est pris dans le référentiel du groupe, si bien qu'on voit d'un
   coup d'œil qu'un même prestataire a trois contrats dans trois sociétés.
   L'écran range les contrats par date limite de dénonciation ; la base
   lève une alerte 30 jours avant (critique à 7 jours) et la ferme quand la
   dénonciation est notée. Un contrat tacite non dénoncé à temps est
   reconduit (art. 1215 C. civ.) : son échéance avance, et il le dit.

   Portes : grp_enregistrer_contrat (toute personne de la société, sauf
   lecteur), grp_denoncer_contrat (gérant, administrateur, direction
   juridique ou financière), grp_archiver_contrat (gérant, administrateur).
   ══════════════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useMemo, useState } from "react";
import { FilePlus2, Send } from "lucide-react";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import { EXEMPLE_CLIENT_ID, EXEMPLE_MOI } from "../exemples/socle";
import type { Source } from "../source";
import { Avis, Chargement, Pastille, Vide } from "../ui";
import { dateCourte, montant } from "../format";
import {
  CATEGORIES,
  LIBELLE_DELAI,
  archiverContrat,
  aujourdhui,
  chargerContrats,
  contratsExemple,
  denoncerContrat,
  echeancier,
  enregistrerContrat,
  type ChampsContrat,
  type Contrat,
  type ContratBrut,
  type Reconduction,
  type UnitePreavis,
} from "./contrats";
import type { Contexte, Objet, Societe } from "./types";

type Props = {
  source: Source;
  contexte: Contexte | null;
  client_id: string;
  societes: Societe[];
  objets: Objet[];
  onOuvrir: (objet_id: string, nature: "fournisseur" | "client") => void;
  onFait: (message: string) => void;
};

type Filtre = "a_surveiller" | "denonces" | "tous";
const nouvelId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);

export default function Contrats({ source, contexte, client_id, societes, objets, onOuvrir, onFait }: Props) {
  const [bruts, setBruts] = useState<ContratBrut[]>(() => contratsExemple(objets));
  const [reels, setReels] = useState<Contrat[] | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [filtre, setFiltre] = useState<Filtre>("a_surveiller");

  const charger = useCallback(async () => {
    try {
      setReels(await chargerContrats(client_id));
      setErreur(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base n'a pas répondu.");
      setReels([]);
    }
  }, [client_id]);
  useEffect(() => {
    if (source !== "reelle" || !contexte) return;
    const t = window.setTimeout(() => void charger(), 0);
    return () => window.clearTimeout(t);
  }, [source, contexte, charger]);

  const exemple = useMemo(() => bruts.map((k) => echeancier(k, bruts)), [bruts]);
  const tous = source === "exemple" ? exemple : reels;

  const liste = useMemo(() => {
    const l = (tous ?? []).filter((c) => (filtre === "tous" ? c.statut !== "archive" : filtre === "denonces" ? c.statut === "denonce" : c.statut === "actif"));
    const rang = { depasse: 1, urgent: 0, bientot: 2, large: 3, sans_objet: 4 } as const;
    return [...l].sort((a, b) => rang[a.etat_delai] - rang[b.etat_delai] || a.date_limite.localeCompare(b.date_limite));
  }, [tous, filtre]);

  const compte = useMemo(() => {
    const actifs = (tous ?? []).filter((c) => c.statut === "actif" && c.reconduction !== "aucune");
    const sous90 = actifs.filter((c) => c.etat_delai === "urgent" || c.etat_delai === "bientot");
    return {
      urgent: actifs.filter((c) => c.etat_delai === "urgent").length,
      bientot: actifs.filter((c) => c.etat_delai === "bientot").length,
      reconduits: actifs.filter((c) => c.reconduit).length,
      enJeu: sous90.reduce((s, c) => s + (c.montant_annuel ?? 0), 0),
    };
  }, [tous]);

  const role = contexte?.role;
  const peutSaisir = !!contexte && role !== "lecteur";
  const peutDenoncer = role === "gerant" || role === "admin" || (role === "valideur" && !!contexte?.equipes.some((e) => e === "direction_juridique" || e === "direction_financiere"));
  const peutArchiver = role === "gerant" || role === "admin";

  /* ——— enregistrer ——— */
  const [edition, setEdition] = useState<Contrat | "nouveau" | null>(null);
  const enregistrer = useCallback(
    async (entite_id: string, champs: ChampsContrat, contrat: Contrat | null): Promise<void> => {
      if (source === "reelle") {
        await enregistrerContrat(client_id, entite_id, champs, contrat?.id ?? null);
        await charger();
        return;
      }
      await new Promise((x) => setTimeout(x, 300));
      const objet = champs.objet_id ? (objets.find((o) => o.id === champs.objet_id) ?? null) : null;
      const quand = new Date().toISOString();
      const base: ContratBrut = {
        id: contrat?.id ?? nouvelId(),
        client_id: EXEMPLE_CLIENT_ID,
        entite_id,
        societe: societes.find((s) => s.entite_id === entite_id)?.nom ?? "Société",
        nature: objet ? (objet.nature as "fournisseur" | "client") : null,
        objet_id: objet?.id ?? null,
        code_groupe: objet?.code_groupe ?? null,
        tiers: objet?.nom_groupe ?? champs.tiers ?? "",
        intitule: champs.intitule,
        reference: champs.reference,
        categorie: champs.categorie,
        date_debut: champs.date_debut,
        date_echeance: champs.date_echeance,
        reconduction: champs.reconduction,
        duree_reconduction_mois: champs.duree_reconduction_mois,
        preavis_valeur: champs.preavis_valeur,
        preavis_unite: champs.preavis_unite,
        montant_annuel: champs.montant_annuel,
        notes: champs.notes,
        statut: contrat?.statut ?? "actif",
        denonce_le: contrat?.denonce_le ?? null,
        denonce_par: contrat?.denonce_par ?? null,
        motif: contrat?.motif ?? null,
        cree_par: contrat?.cree_par ?? EXEMPLE_MOI,
        cree_le: contrat?.cree_le ?? quand,
        maj_le: quand,
      };
      setBruts((prev) => (contrat ? prev.map((k) => (k.id === contrat.id ? base : k)) : [base, ...prev]));
    },
    [source, client_id, charger, objets, societes],
  );

  /* ——— dénoncer, archiver ——— */
  const [denonce, setDenonce] = useState<Contrat | null>(null);
  const denoncer = useCallback(
    async (c: Contrat, date: string, motif: string): Promise<boolean> => {
      if (source === "reelle") {
        const r = await denoncerContrat(c.id, date, motif.trim() || null);
        await charger();
        return r.hors_delai;
      }
      await new Promise((x) => setTimeout(x, 300));
      setBruts((prev) => prev.map((k) => (k.id === c.id ? { ...k, statut: "denonce", denonce_le: date, denonce_par: EXEMPLE_MOI, motif: motif.trim() || null } : k)));
      return c.reconduction === "tacite" && date > c.date_limite;
    },
    [source, charger],
  );
  const archiver = useCallback(
    async (c: Contrat) => {
      try {
        if (source === "reelle") {
          await archiverContrat(c.id, null);
          await charger();
        } else setBruts((prev) => prev.map((k) => (k.id === c.id ? { ...k, statut: "archive" } : k)));
        onFait(`Le contrat « ${c.intitule} » est archivé : il n'est plus suivi.`);
      } catch (e) {
        setErreur(e instanceof Error ? e.message : "L'archivage a échoué.");
      }
    },
    [source, charger, onFait],
  );

  return (
    <section className="esp-carte" aria-label="Contrats du groupe à dénoncer" style={{ marginTop: 16 }}>
      <div className="esp-carte-tete">
        <div>
          <h2 className="esp-carte-titre">Contrats du groupe à dénoncer</h2>
          <p className="esp-kpi-sous" style={{ margin: "2px 0 0" }}>
            Les contrats de chaque société, rangés par date limite de dénonciation. Un contrat à reconduction tacite que personne ne dénonce à temps repart pour une période entière.
          </p>
        </div>
        {peutSaisir ? (
          <button type="button" className="r-btn r-btn--fil r-btn--petit" onClick={() => setEdition("nouveau")}><FilePlus2 width={14} height={14} aria-hidden="true" /> Ajouter un contrat</button>
        ) : null}
      </div>

      {erreur ? <Avis teinte="rouge" role="alert"><strong>Les contrats n&apos;ont pas pu être lus.</strong> {erreur}</Avis> : null}

      {source === "reelle" && !reels ? (
        <Chargement texte="Lecture des contrats…" />
      ) : (
        <>
          <dl className="esp-def esp-def--trois" style={{ marginTop: 10 }}>
            <div><dt>À dénoncer sous 30 jours</dt><dd className="esp-def-fort">{compte.urgent ? <Pastille teinte="rouge">{compte.urgent} contrat{compte.urgent > 1 ? "s" : ""}</Pastille> : "aucun"}</dd></div>
            <div><dt>Sous 90 jours</dt><dd className="esp-def-fort">{compte.bientot}</dd></div>
            <div><dt>Montant annuel en jeu (90 jours)</dt><dd className="esp-def-fort">{montant(compte.enJeu)}</dd></div>
            <div><dt>Reconduits faute de dénonciation</dt><dd>{compte.reconduits}</dd></div>
          </dl>

          <div className="esp-filtres" role="group" aria-label="Quels contrats" style={{ margin: "12px 0 8px" }}>
            {([["a_surveiller", "À surveiller"], ["denonces", "Dénoncés"], ["tous", "Tous"]] as [Filtre, string][]).map(([k, l]) => (
              <button key={k} type="button" className="esp-filtre" aria-pressed={filtre === k} onClick={() => setFiltre(k)}>{l}</button>
            ))}
          </div>

          {liste.length ? (
            <div className="esp-tableau-cadre" tabIndex={0} role="region" aria-label="Contrats du groupe (tableau qui défile)">
              <table className="esp-tableau">
                <thead>
                  <tr>
                    <th>Dénoncer avant le</th>
                    <th>Contrat</th>
                    <th>Société</th>
                    <th>Échéance</th>
                    <th className="esp-num">Montant annuel</th>
                    <th>État</th>
                    <th><span className="vrl-masque">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {liste.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <strong>{c.reconduction === "aucune" ? "—" : dateCourte(c.date_limite)}</strong>
                        {c.statut === "actif" && c.reconduction !== "aucune" ? (
                          <span className="vrl-paire-sous">{c.jours_restants >= 0 ? `dans ${c.jours_restants} jour${c.jours_restants > 1 ? "s" : ""}` : `il y a ${-c.jours_restants} jour${c.jours_restants < -1 ? "s" : ""}`}</span>
                        ) : null}
                      </td>
                      <td>
                        <span className="vrl-balance-nom">{c.intitule}</span>
                        <span className="vrl-paire-sous">
                          {c.objet_id && c.nature ? (
                            <button type="button" className="esp-lien-bouton" onClick={() => onOuvrir(c.objet_id as string, c.nature as "fournisseur" | "client")}><span className="esp-mono">{c.code_groupe}</span> {c.tiers}</button>
                          ) : c.tiers}
                          {" · "}{CATEGORIES.find((x) => x.cle === c.categorie)?.libelle ?? c.categorie}
                          {" · préavis "}{c.preavis_valeur} {c.preavis_unite === "mois" ? "mois" : `jour${c.preavis_valeur > 1 ? "s" : ""}`}
                        </span>
                        {c.contrats_du_tiers > 1 ? <Pastille teinte="bleu" contour title="Le même tiers du groupe a d'autres contrats actifs : une négociation à mener pour tout le groupe.">{c.contrats_du_tiers} contrats chez ce tiers, {c.societes_du_tiers} société{c.societes_du_tiers > 1 ? "s" : ""}</Pastille> : null}
                      </td>
                      <td>{c.societe}</td>
                      <td>
                        {dateCourte(c.echeance_courante)}
                        <span className="vrl-paire-sous">{c.reconduction === "tacite" ? `tacite, ${c.duree_reconduction_mois} mois` : c.reconduction === "expresse" ? "reconduction expresse" : "sans reconduction"}{c.reconduit ? ` · reconduit (échéance d'origine ${dateCourte(c.date_echeance)})` : ""}</span>
                      </td>
                      <td className="esp-num">{c.montant_annuel === null ? "—" : montant(c.montant_annuel)}</td>
                      <td>
                        <span className="esp-item-haut">
                          {c.statut === "denonce" ? <Pastille teinte="vert">Dénoncé le {dateCourte(c.denonce_le)}</Pastille> : c.statut === "archive" ? <Pastille teinte="gris">Archivé</Pastille> : <Pastille teinte={LIBELLE_DELAI[c.etat_delai].teinte}>{LIBELLE_DELAI[c.etat_delai].libelle}</Pastille>}
                        </span>
                      </td>
                      <td>
                        <span className="esp-item-haut">
                          {c.statut === "actif" && peutDenoncer && c.reconduction !== "aucune" ? (
                            <button type="button" className="r-btn r-btn--noir r-btn--petit" onClick={() => setDenonce(c)} aria-label={`Noter la dénonciation de « ${c.intitule} »`}>Dénoncé…</button>
                          ) : null}
                          {c.statut !== "archive" && peutSaisir ? (
                            <button type="button" className="r-btn r-btn--fil r-btn--petit" onClick={() => setEdition(c)} aria-label={`Corriger « ${c.intitule} »`}>Corriger</button>
                          ) : null}
                          {c.statut !== "archive" && peutArchiver ? (
                            <button type="button" className="esp-lien-bouton" onClick={() => void archiver(c)} aria-label={`Archiver « ${c.intitule} »`}>Archiver</button>
                          ) : null}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Vide titre={filtre === "denonces" ? "Aucun contrat dénoncé" : "Aucun contrat"}>
              {peutSaisir ? "Ajoutez les contrats de chaque société : leur date limite de dénonciation s'affiche ici, et une alerte vous prévient 30 jours avant." : "Les contrats du groupe s'affichent ici dès qu'une société les a enregistrés."}
            </Vide>
          )}
        </>
      )}

      {edition ? (
        <DialogueContrat
          contrat={edition === "nouveau" ? null : edition}
          societes={societes}
          objets={objets}
          onFermer={() => setEdition(null)}
          enregistrer={enregistrer}
          onFait={onFait}
        />
      ) : null}
      {denonce ? <DialogueDenonciation c={denonce} onFermer={() => setDenonce(null)} denoncer={denoncer} onFait={onFait} /> : null}
    </section>
  );
}

/* ——— ajouter ou corriger un contrat ——— */
function DialogueContrat({ contrat, societes, objets, onFermer, enregistrer, onFait }: {
  contrat: Contrat | null;
  societes: Societe[];
  objets: Objet[];
  onFermer: () => void;
  enregistrer: (entite_id: string, champs: ChampsContrat, contrat: Contrat | null) => Promise<void>;
  onFait: (m: string) => void;
}) {
  const tiersPossibles = useMemo(() => objets.filter((o) => (o.nature === "fournisseur" || o.nature === "client") && o.statut === "actif" && !o.intragroupe), [objets]);
  const [entite, setEntite] = useState(contrat?.entite_id ?? societes[0]?.entite_id ?? "");
  const [objet, setObjet] = useState(contrat?.objet_id ?? "");
  const [tiers, setTiers] = useState(contrat && !contrat.objet_id ? contrat.tiers : "");
  const [intitule, setIntitule] = useState(contrat?.intitule ?? "");
  const [reference, setReference] = useState(contrat?.reference ?? "");
  const [categorie, setCategorie] = useState(contrat?.categorie ?? "prestation");
  const [debut, setDebut] = useState(contrat?.date_debut ?? "");
  const [echeance, setEcheance] = useState(contrat?.date_echeance ?? "");
  const [reconduction, setReconduction] = useState<Reconduction>(contrat?.reconduction ?? "tacite");
  const [duree, setDuree] = useState(String(contrat?.duree_reconduction_mois ?? 12));
  const [preavis, setPreavis] = useState(String(contrat?.preavis_valeur ?? 3));
  const [unite, setUnite] = useState<UnitePreavis>(contrat?.preavis_unite ?? "mois");
  const [montantAn, setMontantAn] = useState(contrat?.montant_annuel != null ? String(contrat.montant_annuel).replace(".", ",") : "");
  const [notes, setNotes] = useState(contrat?.notes ?? "");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const nDuree = Number(duree);
  const nPreavis = Number(preavis);
  const nMontant = montantAn.trim() ? Number(montantAn.replace(/[\s  €]/g, "").replace(",", ".")) : null;
  const problemes = [
    !intitule.trim() && "l'intitulé",
    !objet && !tiers.trim() && "le tiers (du référentiel ou un nom)",
    !echeance && "l'échéance",
    (!Number.isInteger(nDuree) || nDuree < 1 || nDuree > 120) && "une durée de reconduction de 1 à 120 mois",
    (!Number.isInteger(nPreavis) || nPreavis < 0 || nPreavis > 730) && "un préavis de 0 à 730",
    nMontant !== null && (Number.isNaN(nMontant) || nMontant < 0) && "un montant annuel positif",
    !!debut && !!echeance && debut > echeance && "un début avant l'échéance",
  ].filter(Boolean) as string[];

  const envoyer = async () => {
    if (problemes.length) return;
    setEnvoi(true);
    setErreur(null);
    try {
      await enregistrer(entite, {
        intitule: intitule.trim(),
        objet_id: objet || null,
        tiers: objet ? null : tiers.trim(),
        reference: reference.trim() || null,
        categorie: categorie as ChampsContrat["categorie"],
        date_debut: debut || null,
        date_echeance: echeance,
        reconduction,
        duree_reconduction_mois: nDuree,
        preavis_valeur: nPreavis,
        preavis_unite: unite,
        montant_annuel: nMontant,
        notes: notes.trim() || null,
      }, contrat);
      onFait(contrat ? `Le contrat « ${intitule.trim()} » est corrigé.` : `Le contrat « ${intitule.trim()} » est enregistré : sa date limite de dénonciation est suivie.`);
      onFermer();
    } catch (x) {
      setErreur(x instanceof Error ? x.message : "Le contrat n'a pas été enregistré.");
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && !envoi && onFermer()}>
      <DialogContent>
        <DialogHeader>
          <DialogIcone><FilePlus2 width={18} height={18} aria-hidden="true" /></DialogIcone>
          <DialogTitle>{contrat ? "Corriger un contrat" : "Ajouter un contrat"}</DialogTitle>
          <DialogDescription>L&apos;échéance est la fin de la période en cours ; le préavis, le délai que le contrat impose pour le dénoncer avant elle. La date limite se calcule et une alerte prévient 30 jours avant.</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <div className="esp-form">
            <label className="rv-libelle">Intitulé <span className="esp-obligatoire">(obligatoire)</span>
              <input className="rv-champ" value={intitule} maxLength={200} placeholder="Maintenance des climatisations…" onChange={(x) => setIntitule(x.target.value)} />
            </label>
            <div className="esp-form-ligne">
              <label className="rv-libelle">Société <span className="esp-obligatoire">(obligatoire)</span>
                <select className="rv-champ" value={entite} onChange={(x) => setEntite(x.target.value)}>
                  {societes.map((s) => <option key={s.entite_id} value={s.entite_id}>{s.nom}</option>)}
                </select>
              </label>
              <label className="rv-libelle">Catégorie
                <select className="rv-champ" value={categorie} onChange={(x) => setCategorie(x.target.value as ChampsContrat["categorie"])}>
                  {CATEGORIES.map((c) => <option key={c.cle} value={c.cle}>{c.libelle}</option>)}
                </select>
              </label>
            </div>
            <div className="esp-form-ligne">
              <label className="rv-libelle">Tiers du référentiel
                <select className="rv-champ" value={objet} onChange={(x) => setObjet(x.target.value)}>
                  <option value="">— hors référentiel —</option>
                  {tiersPossibles.map((o) => <option key={o.id} value={o.id}>{o.code_groupe} · {o.nom_groupe}</option>)}
                </select>
              </label>
              <label className="rv-libelle">…ou son nom
                <input className="rv-champ" value={objet ? "" : tiers} disabled={!!objet} maxLength={200} placeholder="si le tiers n'est pas au référentiel" onChange={(x) => setTiers(x.target.value)} />
              </label>
            </div>
            <div className="esp-form-ligne">
              <label className="rv-libelle">Échéance <span className="esp-obligatoire">(obligatoire)</span>
                <input type="date" className="rv-champ" value={echeance} onChange={(x) => setEcheance(x.target.value)} />
              </label>
              <label className="rv-libelle">Début
                <input type="date" className="rv-champ" value={debut} onChange={(x) => setDebut(x.target.value)} />
              </label>
            </div>
            <div className="esp-form-ligne">
              <label className="rv-libelle">Reconduction
                <select className="rv-champ" value={reconduction} onChange={(x) => setReconduction(x.target.value as Reconduction)}>
                  <option value="tacite">Tacite</option>
                  <option value="expresse">Expresse</option>
                  <option value="aucune">Aucune</option>
                </select>
              </label>
              <label className="rv-libelle">Durée d&apos;une reconduction (mois)
                <input className="rv-champ" inputMode="numeric" value={duree} onChange={(x) => setDuree(x.target.value)} />
              </label>
            </div>
            <div className="esp-form-ligne">
              <label className="rv-libelle">Préavis
                <input className="rv-champ" inputMode="numeric" value={preavis} onChange={(x) => setPreavis(x.target.value)} />
              </label>
              <label className="rv-libelle">compté en
                <select className="rv-champ" value={unite} onChange={(x) => setUnite(x.target.value as UnitePreavis)}>
                  <option value="mois">mois</option>
                  <option value="jours">jours</option>
                </select>
              </label>
            </div>
            <div className="esp-form-ligne">
              <label className="rv-libelle">Montant annuel (€ HT)
                <input className="rv-champ" inputMode="decimal" value={montantAn} placeholder="facultatif" onChange={(x) => setMontantAn(x.target.value)} />
              </label>
              <label className="rv-libelle">Référence
                <input className="rv-champ" value={reference} maxLength={80} placeholder="n° de contrat" onChange={(x) => setReference(x.target.value)} />
              </label>
            </div>
            <label className="rv-libelle">Notes
              <textarea className="rv-champ" value={notes} maxLength={2000} onChange={(x) => setNotes(x.target.value)} />
            </label>
            {problemes.length && (intitule || echeance) ? <Avis teinte="ambre">Il manque {problemes.join(", ")}.</Avis> : null}
            {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
          </div>
        </DialogBody>
        <DialogFooter>
          <button type="button" className="r-btn r-btn--noir" disabled={problemes.length > 0 || envoi} onClick={envoyer}>{envoi ? <Loader variant="spin" /> : null} {contrat ? "Enregistrer la correction" : "Enregistrer le contrat"}</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ——— noter la dénonciation partie ——— */
function DialogueDenonciation({ c, onFermer, denoncer, onFait }: { c: Contrat; onFermer: () => void; denoncer: (c: Contrat, date: string, motif: string) => Promise<boolean>; onFait: (m: string) => void }) {
  const jour = aujourdhui();
  const [date, setDate] = useState(jour);
  const [motif, setMotif] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const envoyer = async () => {
    setEnvoi(true);
    setErreur(null);
    try {
      const hors = await denoncer(c, date, motif);
      onFait(`La dénonciation de « ${c.intitule} » est notée au ${dateCourte(date)}${hors ? ", après la date limite : vérifiez que le tiers l'accepte" : ", dans le délai"}. L'alerte est close.`);
      onFermer();
    } catch (x) {
      setErreur(x instanceof Error ? x.message : "La dénonciation n'a pas été notée.");
    } finally {
      setEnvoi(false);
    }
  };
  return (
    <Dialog open onOpenChange={(o) => !o && !envoi && onFermer()}>
      <DialogContent>
        <DialogHeader>
          <DialogIcone><Send width={18} height={18} aria-hidden="true" /></DialogIcone>
          <DialogTitle>Noter la dénonciation — {c.intitule}</DialogTitle>
          <DialogDescription>La dénonciation part de chez vous (lettre recommandée, courriel, portail du prestataire) ; ici, on note qu&apos;elle est partie et quand. Elle est inscrite au journal, et le contrat sort de la liste à surveiller.</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <div className="esp-form">
            <p className="esp-kpi-sous">{c.tiers} · {c.societe} · à dénoncer avant le <strong>{dateCourte(c.date_limite)}</strong> (échéance {dateCourte(c.echeance_courante)}).</p>
            <label className="rv-libelle">Partie le <span className="esp-obligatoire">(obligatoire)</span>
              <input type="date" className="rv-champ" value={date} max={jour} onChange={(x) => setDate(x.target.value)} />
            </label>
            <label className="rv-libelle">Motif
              <input className="rv-champ" value={motif} maxLength={500} placeholder="mise en concurrence, service rendu insuffisant…" onChange={(x) => setMotif(x.target.value)} />
            </label>
            {date > c.date_limite ? <Avis teinte="ambre">Cette date est après la date limite : la dénonciation sera notée hors délai.</Avis> : null}
            {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
          </div>
        </DialogBody>
        <DialogFooter>
          <button type="button" className="r-btn r-btn--noir" disabled={!date || date > jour || envoi} onClick={envoyer}>{envoi ? <Loader variant="spin" /> : null} Noter la dénonciation</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
