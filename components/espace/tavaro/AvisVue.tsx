"use client";

/* ══════════════════════════════════════════════════════════════════════
   Les avis de contravention — désigner le conducteur sous 45 jours
   (06/10/2026, session B2, vague 3, migration b2_03)

   Chaque avis (radar, feu rouge, stationnement) arrive chez le loueur,
   titulaire de la carte grise. Son représentant légal a 45 jours après
   l'envoi de l'avis pour désigner le conducteur ; au-delà, 675 €
   d'amende de non-désignation. L'agence saisit l'avis reçu ; la base le
   rapproche du contrat (plaque + heure), compte l'échéance et prévient à
   J-10, J-3 et au dépassement. Ici : la liste à traiter par échéance,
   l'avis à saisir, le rattachement à la main, la désignation (direction
   et valideurs) recopiée du dossier du locataire, le classement motivé
   (direction seule). Tavaro consigne la désignation ; elle se fait sur le
   site de l'ANTAI ou par lettre recommandée.
   ══════════════════════════════════════════════════════════════════════ */

import { useMemo, useState } from "react";
import { FileWarning, Plus } from "lucide-react";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import { Avis, Pastille, Vide, type Teinte } from "../ui";
import { dateCourte, dateHeure, montant } from "../format";
import { nomLocataire } from "./etats";
import type { AvisContravention, Dossier, Role } from "./types";

export type GestesAvis = {
  enregistrer: (valeurs: Record<string, unknown>) => Promise<Record<string, unknown>>;
  rattacher: (avis: AvisContravention, contrat_id: string) => Promise<void>;
  designer: (avis: AvisContravention, designation: Record<string, unknown>, mode: string, reference: string | null) => Promise<void>;
  classer: (avis: AvisContravention, motif: string) => Promise<void>;
};

const STATUTS: Record<AvisContravention["statut"], { libelle: string; teinte: Teinte }> = {
  a_rapprocher: { libelle: "À rattacher", teinte: "ambre" },
  a_designer: { libelle: "Conducteur à désigner", teinte: "bleu" },
  designe: { libelle: "Désigné", teinte: "vert" },
  classe: { libelle: "Classé", teinte: "gris" },
};

const jourLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const joursAvant = (echeance: string) => Math.round((Date.parse(echeance + "T12:00:00Z") - Date.parse(jourLocal() + "T12:00:00Z")) / 86_400_000);

function Echeance({ a }: { a: AvisContravention }) {
  if (a.statut === "designe") return <Pastille teinte={a.hors_delai ? "rouge" : "vert"}>{a.hors_delai ? "désigné hors délai" : "dans le délai"}</Pastille>;
  if (a.statut === "classe") return <Pastille teinte="gris">classé</Pastille>;
  const n = joursAvant(a.echeance_le);
  if (n < 0) return <Pastille teinte="rouge">délai dépassé de {-n} j</Pastille>;
  return <Pastille teinte={n <= 3 ? "rouge" : n <= 10 ? "ambre" : "gris"}>{n === 0 ? "dernier jour" : `${n} j pour désigner`}</Pastille>;
}

type Champs = Record<string, string>;
const VIDE_AVIS: Champs = { numero_avis: "", immatriculation: "", jour: "", heure: "", lieu: "", nature: "", montant_eur: "", avis_envoye_le: "", recu_le: "" };

export default function AvisVue({ avis, dossiers, role, nommer, nomAgence, gestes }: {
  avis: AvisContravention[];
  dossiers: Dossier[];
  role: Role | null;
  nommer: (id: string | null | undefined) => string;
  nomAgence: (entite_id: string) => string;
  gestes: GestesAvis;
}) {
  const [vue, setVue] = useState<"a_traiter" | "traites">("a_traiter");
  const [saisie, setSaisie] = useState<Champs | null>(null);
  const [rattache, setRattache] = useState<AvisContravention | null>(null);
  const [contratChoisi, setContratChoisi] = useState("");
  const [designe, setDesigne] = useState<AvisContravention | null>(null);
  const [designation, setDesignation] = useState<Champs>({});
  const [classe, setClasse] = useState<AvisContravention | null>(null);
  const [motif, setMotif] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [fait, setFait] = useState<string | null>(null);

  const direction = role === "gerant" || role === "admin";
  const peutDesigner = direction || role === "valideur";
  const peutSaisir = peutDesigner || role === "collaborateur";

  const aTraiter = useMemo(() => avis.filter((a) => a.statut === "a_rapprocher" || a.statut === "a_designer").sort((x, y) => x.echeance_le.localeCompare(y.echeance_le)), [avis]);
  const traites = useMemo(() => avis.filter((a) => a.statut === "designe" || a.statut === "classe").sort((x, y) => (y.designe_le ?? y.classe_le ?? "").localeCompare(x.designe_le ?? x.classe_le ?? "")), [avis]);
  const urgents = aTraiter.filter((a) => joursAvant(a.echeance_le) <= 3).length;
  const montres = vue === "a_traiter" ? aTraiter : traites;
  const dossierDe = (a: AvisContravention) => dossiers.find((d) => d.contrat.id === a.contrat_id) ?? null;

  async function envoyer(action: () => Promise<string>) {
    setEnvoi(true);
    setErreur(null);
    try {
      const m = await action();
      setFait(m);
      setSaisie(null);
      setRattache(null);
      setDesigne(null);
      setClasse(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base a refusé l'opération.");
    } finally {
      setEnvoi(false);
    }
  }

  /* ——— la saisie d'un avis ——— */
  const ouvrirSaisie = () => { setErreur(null); setFait(null); setSaisie({ ...VIDE_AVIS, recu_le: jourLocal() }); };
  const saisieComplete = !!saisie && !!saisie.numero_avis.trim() && !!saisie.immatriculation.trim() && !!saisie.jour && !!saisie.heure && !!saisie.avis_envoye_le;
  const enregistrer = () => saisie && envoyer(async () => {
    const decalage = -new Date(`${saisie.jour}T${saisie.heure}:00`).getTimezoneOffset();
    const signe = decalage >= 0 ? "+" : "-";
    const tz = `${signe}${String(Math.floor(Math.abs(decalage) / 60)).padStart(2, "0")}:${String(Math.abs(decalage) % 60).padStart(2, "0")}`;
    const valeurs: Record<string, unknown> = {
      numero_avis: saisie.numero_avis.trim(), immatriculation: saisie.immatriculation.trim(), infraction_le: `${saisie.jour}T${saisie.heure}:00${tz}`,
      avis_envoye_le: saisie.avis_envoye_le, recu_le: saisie.recu_le || undefined,
      lieu: saisie.lieu.trim() || undefined, nature: saisie.nature.trim() || undefined,
      montant_eur: saisie.montant_eur.trim() ? Number(saisie.montant_eur.replace(",", ".")) : undefined,
    };
    const r = await gestes.enregistrer(valeurs);
    setVue("a_traiter");
    if (r.deja) return "Cet avis était déjà enregistré : rien n'a changé.";
    const d = dossiers.find((x) => x.contrat.id === r.contrat);
    return r.statut === "a_designer" && d
      ? `Avis enregistré et rapproché du contrat ${d.contrat.numero} (${nomLocataire(d.locataire)}). Conducteur à désigner avant le ${dateCourte(String(r.echeance_le))}.`
      : `Avis enregistré. ${Number(r.candidats ?? 0) > 1 ? "Plusieurs contrats sont possibles" : "Aucun contrat n'était en cours à cette heure"} : rattachez-le avant le ${dateCourte(String(r.echeance_le))}.`;
  });

  /* ——— le rattachement : les contrats de la même plaque d'abord, les plus proches de l'heure de l'infraction ——— */
  const candidats = useMemo(() => {
    if (!rattache) return [];
    const t = Date.parse(rattache.infraction_le);
    return [...dossiers].filter((d) => d.contrat.statut !== "annule").sort((x, y) => {
      const px = x.vehicule?.immatriculation === rattache.immatriculation ? 0 : 1;
      const py = y.vehicule?.immatriculation === rattache.immatriculation ? 0 : 1;
      if (px !== py) return px - py;
      return Math.abs(Date.parse(x.contrat.depart_le) - t) - Math.abs(Date.parse(y.contrat.depart_le) - t);
    }).slice(0, 40);
  }, [rattache, dossiers]);
  const ouvrirRattache = (a: AvisContravention) => { setErreur(null); setFait(null); setContratChoisi(""); setRattache(a); };

  /* ——— la désignation, préremplie depuis le locataire du contrat ——— */
  const ouvrirDesigne = (a: AvisContravention) => {
    const d = dossierDe(a);
    const l = d?.locataire;
    const societe = l?.type === "professionnel";
    setErreur(null);
    setFait(null);
    setDesignation({
      type: societe ? "societe" : "personne", mode: "antai_en_ligne", reference: "",
      nom: l?.nom ?? "", prenom: l?.prenom ?? "", adresse: l?.adresse ?? "", raison_sociale: l?.raison_sociale ?? "", siren: "",
      date_naissance: "", lieu_naissance: "", permis_numero: "", permis_delivre_le: "", permis_lieu: "",
    });
    setDesigne(a);
  };
  const personne = designation.type !== "societe";
  const manque = personne
    ? (["nom", "prenom", "date_naissance", "lieu_naissance", "adresse", "permis_numero"] as const).filter((k) => !designation[k]?.trim())
    : (["raison_sociale", "siren", "adresse"] as const).filter((k) => !designation[k]?.trim());
  const designer = () => designe && envoyer(async () => {
    const champs = personne
      ? ["nom", "prenom", "date_naissance", "lieu_naissance", "adresse", "permis_numero", "permis_delivre_le", "permis_lieu"]
      : ["raison_sociale", "siren", "adresse"];
    const corps: Record<string, unknown> = { type: personne ? "personne" : "societe" };
    for (const k of champs) if (designation[k]?.trim()) corps[k] = designation[k].trim();
    await gestes.designer(designe, corps, designation.mode, designation.reference.trim() || null);
    return `La désignation de l'avis ${designe.numero_avis} est consignée (${designation.mode === "lrar" ? "lettre recommandée" : "en ligne, ANTAI"}).`;
  });
  const champ = (k: string, libelle: string, o: { type?: string; obligatoire?: boolean; placeholder?: string; auto?: string } = {}) => (
    <label className="rv-libelle">{libelle}{o.obligatoire ? <span className="esp-obligatoire"> (obligatoire)</span> : null}
      <input className="rv-champ" type={o.type ?? "text"} value={designation[k] ?? ""} placeholder={o.placeholder} autoComplete={o.auto ?? "off"}
        onChange={(e) => setDesignation((x) => ({ ...x, [k]: e.target.value }))} />
    </label>
  );

  return (
    <section className="esp-carte" aria-label="Avis de contravention">
      <div className="esp-carte-tete">
        <div className="tav-bareme-tete" style={{ width: "100%" }}>
          <div className="esp-item-haut">
            <h2 className="esp-carte-titre">Avis de contravention</h2>
            {aTraiter.length ? <Pastille teinte={urgents ? "rouge" : "ambre"}>{aTraiter.length} à traiter{urgents ? ` · ${urgents} urgent${urgents > 1 ? "s" : ""}` : ""}</Pastille> : <Pastille teinte="vert">rien à traiter</Pastille>}
          </div>
          <div className="esp-actions" style={{ marginTop: 0 }}>
            <div className="esp-filtres" role="group" aria-label="Avis à traiter ou traités">
              <button type="button" className="esp-filtre" aria-pressed={vue === "a_traiter"} onClick={() => setVue("a_traiter")}>À traiter ({aTraiter.length})</button>
              <button type="button" className="esp-filtre" aria-pressed={vue === "traites"} onClick={() => setVue("traites")}>Traités ({traites.length})</button>
            </div>
            <button type="button" className="r-btn r-btn--noir r-btn--petit" disabled={!peutSaisir} title={peutSaisir ? undefined : "Votre rôle ne permet pas d'enregistrer un avis"} onClick={ouvrirSaisie}>
              <Plus width={14} height={14} aria-hidden="true" /> Enregistrer un avis
            </button>
          </div>
        </div>
      </div>
      <div className="esp-carte-corps">
        <p className="esp-kpi-sous" style={{ marginBottom: 10 }}>
          Le représentant légal désigne le conducteur dans les 45 jours qui suivent l&apos;envoi de l&apos;avis ; sinon l&apos;entreprise paie en plus 675 € d&apos;amende de non-désignation.
          Tavaro retrouve le contrat par la plaque et l&apos;heure, et prévient à dix jours, à trois jours et au dépassement.
        </p>
        {fait ? <div style={{ marginBottom: 10 }}><Avis teinte="vert" role="status"><strong>C&apos;est fait.</strong> {fait}</Avis></div> : null}
        {montres.length === 0 ? (
          <Vide titre={vue === "a_traiter" ? "Aucun avis à traiter" : "Aucun avis traité"}>{vue === "a_traiter" ? "Les avis reçus par courrier s'enregistrent ici dès leur arrivée : le délai court depuis leur date d'envoi." : "Les avis désignés et classés restent ici, avec la trace de qui a fait quoi."}</Vide>
        ) : (
          <ul className="tav-avis-liste" aria-label={vue === "a_traiter" ? "Avis à traiter, par échéance" : "Avis traités"}>
            {montres.map((a) => {
              const d = dossierDe(a);
              const g = a.designation;
              const nom = !g ? null : "effacee_le" in g ? `identité effacée le ${dateCourte(g.effacee_le)} (gardée un an)` : g.type === "societe" ? g.raison_sociale : `${g.prenom} ${g.nom}`;
              return (
                <li key={a.id} className="tav-avis">
                  <div className="esp-item-haut">
                    <span className="esp-mono" style={{ fontWeight: 600 }}>{a.immatriculation}</span>
                    <Pastille teinte={STATUTS[a.statut].teinte}>{STATUTS[a.statut].libelle}</Pastille>
                    <Echeance a={a} />
                    {a.montant_eur !== null ? <span className="esp-item-montant">{montant(a.montant_eur)}</span> : null}
                  </div>
                  <p className="tav-avis-titre">{a.nature ?? "Infraction"}{a.lieu ? ` — ${a.lieu}` : ""}</p>
                  <p className="esp-kpi-sous">
                    Le {dateHeure(a.infraction_le)} · avis n° <span className="esp-mono">{a.numero_avis}</span> envoyé le {dateCourte(a.avis_envoye_le)} · à désigner avant le {dateCourte(a.echeance_le)}
                    {a.entite_id ? ` · ${nomAgence(a.entite_id)}` : ""}
                  </p>
                  <p className="esp-kpi-sous">
                    {d ? <>Contrat <span className="esp-mono">{d.contrat.numero}</span> ({nomLocataire(d.locataire)}, {dateCourte(d.contrat.depart_le)} → {dateCourte(d.contrat.retour_reel_le ?? d.contrat.retour_prevu_le)}){a.rapprochement === "manuel" ? " · rattaché à la main" : " · retrouvé par la plaque et l'heure"}</>
                      : a.contrat_id ? "Contrat hors de votre périmètre."
                      : a.candidats > 1 ? `${a.candidats} contrats possibles : choisissez le bon.` : "Aucun contrat en cours à cette heure : véhicule au parc, convoyage, ou plaque mal lue."}
                  </p>
                  {a.statut === "designe" ? (
                    <p className="esp-kpi-sous">Désigné : <strong>{nom}</strong> · le {dateCourte(a.designe_le)} par {nommer(a.designe_par)} · {a.mode_designation === "lrar" ? "lettre recommandée" : "en ligne, ANTAI"}{a.reference_designation ? ` · réf. ${a.reference_designation}` : ""}</p>
                  ) : null}
                  {a.statut === "classe" ? <p className="esp-kpi-sous">Classé le {dateCourte(a.classe_le)} par {nommer(a.classe_par)} : {a.motif_classement}</p> : null}
                  {a.statut === "a_rapprocher" || a.statut === "a_designer" ? (
                    <div className="esp-actions">
                      <button type="button" className="r-btn r-btn--noir r-btn--petit" disabled={!peutDesigner} title={peutDesigner ? undefined : "La désignation engage le représentant légal : la direction ou un valideur la fait"} onClick={() => ouvrirDesigne(a)}>Désigner le conducteur</button>
                      <button type="button" className="r-btn r-btn--fil r-btn--petit" disabled={!peutSaisir} onClick={() => ouvrirRattache(a)}>{a.contrat_id ? "Changer de contrat" : "Rattacher à un contrat"}</button>
                      <button type="button" className="r-btn r-btn--fil r-btn--petit" disabled={!direction} title={direction ? undefined : "Seule la direction classe un avis"} onClick={() => { setErreur(null); setFait(null); setMotif(""); setClasse(a); }}>Classer</button>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <Dialog open={!!saisie} onOpenChange={(o) => !o && setSaisie(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><FileWarning width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>Enregistrer un avis de contravention</DialogTitle>
            <DialogDescription>Recopiez l&apos;avis reçu. L&apos;heure de l&apos;infraction désigne le contrat ; la date d&apos;envoi fait courir les 45 jours.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            {saisie ? (
              <div className="esp-form">
                <div className="esp-form-ligne">
                  <label className="rv-libelle">Numéro de l&apos;avis <span className="esp-obligatoire">(obligatoire)</span><input className="rv-champ esp-mono" value={saisie.numero_avis} onChange={(e) => setSaisie({ ...saisie, numero_avis: e.target.value })} placeholder="2026 0917 1023 88" autoComplete="off" /></label>
                  <label className="rv-libelle">Immatriculation <span className="esp-obligatoire">(obligatoire)</span><input className="rv-champ esp-mono" value={saisie.immatriculation} onChange={(e) => setSaisie({ ...saisie, immatriculation: e.target.value })} placeholder="GA-123-BC" autoComplete="off" /></label>
                </div>
                <div className="esp-form-ligne">
                  <label className="rv-libelle">Jour de l&apos;infraction <span className="esp-obligatoire">(obligatoire)</span><input type="date" className="rv-champ" value={saisie.jour} max={jourLocal()} onChange={(e) => setSaisie({ ...saisie, jour: e.target.value })} /></label>
                  <label className="rv-libelle">Heure <span className="esp-obligatoire">(obligatoire)</span><input className="rv-champ" inputMode="numeric" pattern="[0-2][0-9]:[0-5][0-9]" value={saisie.heure} onChange={(e) => setSaisie({ ...saisie, heure: e.target.value })} placeholder="14:12" /></label>
                </div>
                <label className="rv-libelle">Nature<input className="rv-champ" value={saisie.nature} onChange={(e) => setSaisie({ ...saisie, nature: e.target.value })} placeholder="Excès de vitesse inférieur à 20 km/h" /></label>
                <div className="esp-form-ligne">
                  <label className="rv-libelle">Lieu<input className="rv-champ" value={saisie.lieu} onChange={(e) => setSaisie({ ...saisie, lieu: e.target.value })} placeholder="A6, Auxerre" /></label>
                  <label className="rv-libelle">Montant (€)<input className="rv-champ" inputMode="decimal" value={saisie.montant_eur} onChange={(e) => setSaisie({ ...saisie, montant_eur: e.target.value })} placeholder="135" /></label>
                </div>
                <div className="esp-form-ligne">
                  <label className="rv-libelle">Date d&apos;envoi de l&apos;avis <span className="esp-obligatoire">(obligatoire)</span><input type="date" className="rv-champ" value={saisie.avis_envoye_le} max={jourLocal()} onChange={(e) => setSaisie({ ...saisie, avis_envoye_le: e.target.value })} /></label>
                  <label className="rv-libelle">Reçu le<input type="date" className="rv-champ" value={saisie.recu_le} max={jourLocal()} onChange={(e) => setSaisie({ ...saisie, recu_le: e.target.value })} /></label>
                </div>
                {saisie.heure && !/^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(saisie.heure) ? <Avis teinte="ambre">L&apos;heure s&apos;écrit sur 24 heures, par exemple 14:12.</Avis> : null}
                {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
              </div>
            ) : null}
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={envoi || !saisieComplete || !/^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(saisie?.heure ?? "")} onClick={enregistrer}>{envoi ? <Loader variant="spin" /> : null} Enregistrer</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!rattache} onOpenChange={(o) => !o && setRattache(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><FileWarning width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>Rattacher l&apos;avis {rattache?.numero_avis}</DialogTitle>
            <DialogDescription>Infraction le {dateHeure(rattache?.infraction_le)} avec {rattache?.immatriculation}. Les contrats de ce véhicule viennent en premier ; une plaque différente reste possible (avis mal lu), le journal le dira.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              <label className="rv-libelle">Contrat
                <select className="rv-champ" value={contratChoisi} onChange={(e) => setContratChoisi(e.target.value)}>
                  <option value="">Choisir…</option>
                  {candidats.map((d) => <option key={d.contrat.id} value={d.contrat.id}>{d.contrat.numero} · {d.vehicule?.immatriculation ?? "?"} · {dateCourte(d.contrat.depart_le)} → {dateCourte(d.contrat.retour_reel_le ?? d.contrat.retour_prevu_le)} · {nomLocataire(d.locataire)}</option>)}
                </select>
              </label>
              {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={envoi || !contratChoisi} onClick={() => rattache && envoyer(async () => { await gestes.rattacher(rattache, contratChoisi); return `L'avis ${rattache.numero_avis} est rattaché au contrat ${dossiers.find((d) => d.contrat.id === contratChoisi)?.contrat.numero ?? ""}.`; })}>{envoi ? <Loader variant="spin" /> : null} Rattacher</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!designe} onOpenChange={(o) => !o && setDesigne(null)}>
        <DialogContent className="tav-dialogue-large">
          <DialogHeader>
            <DialogIcone><FileWarning width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>Désigner le conducteur — avis {designe?.numero_avis}</DialogTitle>
            <DialogDescription>
              Faites la désignation sur antai.gouv.fr (ou par lettre recommandée), puis consignez ici ce qui a été envoyé : Tavaro garde la preuve et arrête les alertes.
              Un locataire professionnel se désigne comme société : elle désignera elle-même son conducteur.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              <div className="esp-filtres" role="group" aria-label="Qui désigner">
                <button type="button" className="esp-filtre" aria-pressed={personne} onClick={() => setDesignation((x) => ({ ...x, type: "personne" }))}>Une personne</button>
                <button type="button" className="esp-filtre" aria-pressed={!personne} disabled={!designe?.contrat_id} onClick={() => setDesignation((x) => ({ ...x, type: "societe" }))}>La société locataire</button>
              </div>
              {personne ? (
                <>
                  <div className="esp-form-ligne">{champ("nom", "Nom", { obligatoire: true })}{champ("prenom", "Prénom", { obligatoire: true })}</div>
                  <div className="esp-form-ligne">{champ("date_naissance", "Date de naissance", { type: "date", obligatoire: true })}{champ("lieu_naissance", "Lieu de naissance", { obligatoire: true })}</div>
                  {champ("adresse", "Adresse", { obligatoire: true })}
                  <div className="esp-form-ligne">{champ("permis_numero", "Numéro du permis", { obligatoire: true })}{champ("permis_delivre_le", "Permis délivré le", { type: "date" })}</div>
                  {champ("permis_lieu", "Permis délivré par (préfecture ou pays)")}
                  {!designe?.contrat_id ? <Avis teinte="ambre">Sans contrat, c&apos;est en général un salarié de l&apos;agence qui conduisait : désignez-le comme une personne.</Avis> : null}
                </>
              ) : (
                <>
                  <div className="esp-form-ligne">{champ("raison_sociale", "Raison sociale", { obligatoire: true })}{champ("siren", "SIREN", { obligatoire: true, placeholder: "9 chiffres" })}</div>
                  {champ("adresse", "Adresse", { obligatoire: true })}
                </>
              )}
              <div className="esp-form-ligne">
                <label className="rv-libelle">Mode
                  <select className="rv-champ" value={designation.mode ?? "antai_en_ligne"} onChange={(e) => setDesignation((x) => ({ ...x, mode: e.target.value }))}>
                    <option value="antai_en_ligne">En ligne, sur le site de l&apos;ANTAI</option>
                    <option value="lrar">Lettre recommandée avec accusé de réception</option>
                  </select>
                </label>
                {champ("reference", "Référence (n° de désignation ou de recommandé)")}
              </div>
              {designe && joursAvant(designe.echeance_le) < 0 ? <Avis teinte="rouge">Le délai est dépassé depuis le {dateCourte(designe.echeance_le)} : la désignation reste utile, elle sera notée hors délai.</Avis> : null}
              {manque.length ? <p className="esp-kpi-sous">Il manque : {manque.map((k) => k.replace("_", " ")).join(", ")}.</p> : null}
              {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={envoi || manque.length > 0} onClick={designer}>{envoi ? <Loader variant="spin" /> : null} Consigner la désignation</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!classe} onOpenChange={(o) => !o && setClasse(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><FileWarning width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>Classer l&apos;avis {classe?.numero_avis} sans désigner</DialogTitle>
            <DialogDescription>Pour un avis contesté : usurpation de plaque, vol déclaré, véhicule cédé. Payer l&apos;avis sans désigner n&apos;éteint pas l&apos;amende de non-désignation : si un salarié conduisait, désignez-le. Le motif reste au journal.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              <label className="rv-libelle">Motif <span className="esp-obligatoire">(au moins dix caractères)</span><textarea className="rv-champ" rows={3} value={motif} onChange={(e) => setMotif(e.target.value)} /></label>
              {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--rouge" disabled={envoi || motif.trim().length < 10} onClick={() => classe && envoyer(async () => { await gestes.classer(classe, motif.trim()); return `L'avis ${classe.numero_avis} est classé.`; })}>{envoi ? <Loader variant="spin" /> : null} Classer</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
