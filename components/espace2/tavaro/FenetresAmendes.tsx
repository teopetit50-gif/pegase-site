"use client";

/* ══════════════════════════════════════════════════════════════════════
   TAVARO — les fenêtres des amendes et des contestations (02/11/2026)

   Les fenêtres de l'écran d'avant (components/espace/tavaro/AvisVue :
   F19 à F22 ; ContestationsVue : F23 à F25), leur état et leurs gestes,
   repris ligne pour ligne, sans la carte qui les portait : la page
   Amendes, péages, contestations (copie du Triage de Linear) les ouvre
   par une demande (quoi, objet, n). Le message « C'est fait » remonte
   par onFait (un toast).
   ══════════════════════════════════════════════════════════════════════ */

import { useEffect, useMemo, useRef, useState } from "react";
import { FileWarning, Landmark, Send } from "lucide-react";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import { Avis, Pastille, type Teinte } from "@/components/espace/ui";
import { dateCourte, dateHeure, montant } from "@/components/espace/format";
import { nomLocataire } from "@/components/espace/tavaro/etats";
import { forcesLocales, jourLocal as jourContestation, joursAvant as joursContestation, plusJours } from "@/components/espace/tavaro/contestations";
import type { AvisContravention, Contestation, StatutContestation } from "@/components/espace/tavaro/types";
import { useTavaro } from "./donnees";

/* ——— les avis de contravention : F19 à F22, le code d'AvisVue ligne pour ligne ——— */
export type DemandeAvis = { quoi: "saisie" | "rattacher" | "designer" | "classer"; avis?: AvisContravention; n: number } | null;


export const STATUTS_AVIS: Record<AvisContravention["statut"], { libelle: string; teinte: Teinte }> = {
  a_rapprocher: { libelle: "À rattacher", teinte: "ambre" },
  a_designer: { libelle: "Conducteur à désigner", teinte: "bleu" },
  designe: { libelle: "Désigné", teinte: "vert" },
  classe: { libelle: "Classé", teinte: "gris" },
};

const jourLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export const joursAvant = (echeance: string) => Math.round((Date.parse(echeance + "T12:00:00Z") - Date.parse(jourLocal() + "T12:00:00Z")) / 86_400_000);

export function EcheanceAvis({ a }: { a: AvisContravention }) {
  if (a.statut === "designe") return <Pastille teinte={a.hors_delai ? "rouge" : "vert"}>{a.hors_delai ? "désigné hors délai" : "dans le délai"}</Pastille>;
  if (a.statut === "classe") return <Pastille teinte="gris">classé</Pastille>;
  const n = joursAvant(a.echeance_le);
  if (n < 0) return <Pastille teinte="rouge">délai dépassé de {-n} j</Pastille>;
  return <Pastille teinte={n <= 3 ? "rouge" : n <= 10 ? "ambre" : "gris"}>{n === 0 ? "dernier jour" : `${n} j pour désigner`}</Pastille>;
}

type Champs = Record<string, string>;
const VIDE_AVIS: Champs = { numero_avis: "", immatriculation: "", jour: "", heure: "", lieu: "", nature: "", montant_eur: "", avis_envoye_le: "", recu_le: "" };

export function FenetresAvis({ demande, onFait }: { demande: DemandeAvis; onFait: (m: string) => void }) {
  const { tous: dossiers, gestesAvis: gestes } = useTavaro();
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

  useEffect(() => {
    if (fait) {
      onFait(fait);
      const t = window.setTimeout(() => setFait(null), 0);
      return () => window.clearTimeout(t);
    }
  }, [fait, onFait]);
  const vu = useRef(0);
  useEffect(() => {
    if (!demande || demande.n === vu.current) return;
    vu.current = demande.n;
    const t = window.setTimeout(() => {
      if (demande.quoi === "saisie") ouvrirSaisie();
      else if (demande.avis && demande.quoi === "rattacher") ouvrirRattache(demande.avis);
      else if (demande.avis && demande.quoi === "designer") ouvrirDesigne(demande.avis);
      else if (demande.avis && demande.quoi === "classer") { setErreur(null); setFait(null); setMotif(""); setClasse(demande.avis); }
    }, 0);
    return () => window.clearTimeout(t);
  });
  return (
    <>
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
    </>
  );
}

/* ——— les contestations bancaires : F23 à F25, le code de ContestationsVue ligne pour ligne ——— */
export type DemandeContestation = { quoi: "saisie" | "envoyer" | "issue"; k?: Contestation; issue?: "gagnee" | "perdue" | "abandonnee"; n: number } | null;


export const STATUTS_CONTESTATION: Record<StatutContestation, { libelle: string; teinte: Teinte }> = {
  ouverte: { libelle: "Dossier en préparation", teinte: "ambre" },
  dossier_pret: { libelle: "Dossier prêt", teinte: "bleu" },
  envoyee: { libelle: "Envoyé à la banque", teinte: "bleu" },
  gagnee: { libelle: "Gagnée", teinte: "vert" },
  perdue: { libelle: "Perdue", teinte: "rouge" },
  abandonnee: { libelle: "Abandonnée", teinte: "gris" },
};
const ISSUES = { gagnee: "gagnée", perdue: "perdue", abandonnee: "abandonnée" } as const;
export const ouverte = (k: Contestation) => k.statut === "ouverte" || k.statut === "dossier_pret" || k.statut === "envoyee";
const adresseValide = (a: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(a.trim());

export function DelaiContestation({ k }: { k: Contestation }) {
  if (k.statut === "envoyee" || !ouverte(k)) return null;
  const n = joursContestation(k.repondre_avant);
  if (n < 0) return <Pastille teinte="rouge">délai dépassé de {-n} j</Pastille>;
  return <Pastille teinte={n <= 2 ? "rouge" : "ambre"}>{n === 0 ? "dernier jour" : `${n} j pour répondre`}</Pastille>;
}

type ChampsContestation = { facture: string; reference_banque: string; motif_banque: string; montant_eur: string; recue_le: string; repondre_avant: string; adresse_banque: string; notes: string };

export function FenetresContestations({ demande, onFait }: { demande: DemandeContestation; onFait: (m: string) => void }) {
  const { monde, tous: dossiers, gestesContestations: gestes } = useTavaro();
  const reglages = monde?.reglages ?? null;
  const [saisie, setSaisie] = useState<ChampsContestation | null>(null);
  const [aEnvoyer, setAEnvoyer] = useState<Contestation | null>(null);
  const [adresse, setAdresse] = useState("");
  const [issue, setIssue] = useState<{ k: Contestation; issue: "gagnee" | "perdue" | "abandonnee" } | null>(null);
  const [note, setNote] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [fait, setFait] = useState<string | null>(null);

  const delai = reglages?.contestation_delai_jours ?? 7;

  /* les factures qu'on peut défendre : émises, envoyées, réglées ou en litige — pas celles annulées par un avoir */
  const facturesOuvrables = useMemo(() => dossiers.flatMap((d) => d.factures.filter((f) => f.statut !== "avoir").map((f) => ({ d, f })))
    .sort((x, y) => y.f.date_facture.localeCompare(x.f.date_facture)), [dossiers]);
  const choisie = saisie ? facturesOuvrables.find((x) => x.f.id === saisie.facture) ?? null : null;
  const apercu = choisie ? forcesLocales(choisie.d, choisie.f) : null;

  async function agir(action: () => Promise<string>) {
    setEnvoi(true);
    setErreur(null);
    try {
      const m = await action();
      setFait(m);
      setSaisie(null);
      setAEnvoyer(null);
      setIssue(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base a refusé l'opération.");
    } finally {
      setEnvoi(false);
    }
  }

  const ouvrirSaisie = () => {
    setErreur(null);
    setFait(null);
    const auj = jourContestation();
    setSaisie({ facture: "", reference_banque: "", motif_banque: "", montant_eur: "", recue_le: auj, repondre_avant: plusJours(auj, delai), adresse_banque: reglages?.contestation_adresse ?? "", notes: "" });
  };
  const montantSaisi = saisie?.montant_eur.trim() ? Number(saisie.montant_eur.replace(",", ".")) : null;
  const montantFaux = !!choisie && montantSaisi !== null && (!(montantSaisi > 0) || montantSaisi > choisie.f.total_ttc);
  const saisieComplete = !!saisie && !!choisie && !!saisie.reference_banque.trim() && !!saisie.motif_banque.trim() && !montantFaux
    && (!saisie.adresse_banque.trim() || adresseValide(saisie.adresse_banque)) && !!saisie.recue_le && !!saisie.repondre_avant && saisie.repondre_avant >= saisie.recue_le;
  const ouvrir = () => saisie && choisie && agir(async () => {
    const valeurs: Record<string, unknown> = {
      reference_banque: saisie.reference_banque.trim(), motif_banque: saisie.motif_banque.trim(), recue_le: saisie.recue_le, repondre_avant: saisie.repondre_avant,
      montant_eur: montantSaisi ?? undefined, adresse_banque: saisie.adresse_banque.trim() || undefined, notes: saisie.notes.trim() || undefined,
    };
    const r = await gestes.ouvrir(choisie.f, valeurs);
    if (r.deja) return `Cette contestation était déjà ouverte (référence ${saisie.reference_banque.trim()}) : rien n'a changé.`;
    return `Contestation ${saisie.reference_banque.trim()} ouverte sur la facture ${choisie.f.reference}. Le dossier se compose (une minute environ) ; envoyez-le avant le ${dateCourte(saisie.repondre_avant)}.`;
  });

  const ouvrirEnvoi = (k: Contestation) => {
    setErreur(null);
    setFait(null);
    setAdresse(k.adresse_banque ?? reglages?.contestation_adresse ?? "");
    setAEnvoyer(k);
  };

  useEffect(() => {
    if (fait) {
      onFait(fait);
      const t = window.setTimeout(() => setFait(null), 0);
      return () => window.clearTimeout(t);
    }
  }, [fait, onFait]);
  const vu = useRef(0);
  useEffect(() => {
    if (!demande || demande.n === vu.current) return;
    vu.current = demande.n;
    const t = window.setTimeout(() => {
      if (demande.quoi === "saisie") ouvrirSaisie();
      else if (demande.k && demande.quoi === "envoyer") ouvrirEnvoi(demande.k);
      else if (demande.k && demande.quoi === "issue" && demande.issue) { setErreur(null); setFait(null); setNote(""); setIssue({ k: demande.k, issue: demande.issue }); }
    }, 0);
    return () => window.clearTimeout(t);
  });
  return (
    <>
      <Dialog open={!!saisie} onOpenChange={(o) => !o && setSaisie(null)}>
        <DialogContent className="tav-dialogue-large">
          <DialogHeader>
            <DialogIcone><Landmark width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>Ouvrir une contestation bancaire</DialogTitle>
            <DialogDescription>Recopiez la notification de votre banque ou de votre prestataire de paiement : sa référence, son motif, la date limite qu&apos;elle donne.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            {saisie ? (
              <div className="esp-form">
                <label className="rv-libelle">Facture contestée <span className="esp-obligatoire">(obligatoire)</span>
                  <select className="rv-champ" value={saisie.facture} onChange={(e) => setSaisie({ ...saisie, facture: e.target.value })}>
                    <option value="">Choisir…</option>
                    {facturesOuvrables.map(({ d, f }) => <option key={f.id} value={f.id}>{f.reference} · {montant(f.total_ttc)} · {nomLocataire(d.locataire)} · contrat {d.contrat.numero}{f.regle_le ? " · réglée" : ""}</option>)}
                  </select>
                </label>
                <div className="esp-form-ligne">
                  <label className="rv-libelle">Référence de la banque <span className="esp-obligatoire">(obligatoire)</span><input className="rv-champ esp-mono" value={saisie.reference_banque} onChange={(e) => setSaisie({ ...saisie, reference_banque: e.target.value })} placeholder="CB-2026-88412" autoComplete="off" /></label>
                  <label className="rv-libelle">Montant contesté (€)<input className="rv-champ" inputMode="decimal" value={saisie.montant_eur} onChange={(e) => setSaisie({ ...saisie, montant_eur: e.target.value })} placeholder={choisie ? String(choisie.f.total_ttc).replace(".", ",") : "toute la facture"} /></label>
                </div>
                <label className="rv-libelle">Motif donné par la banque <span className="esp-obligatoire">(obligatoire)</span><input className="rv-champ" value={saisie.motif_banque} onChange={(e) => setSaisie({ ...saisie, motif_banque: e.target.value })} placeholder="13.1 — Prestation non conforme" /></label>
                <div className="esp-form-ligne">
                  <label className="rv-libelle">Reçue le<input type="date" className="rv-champ" value={saisie.recue_le} max={jourContestation()} onChange={(e) => setSaisie({ ...saisie, recue_le: e.target.value, repondre_avant: plusJours(e.target.value || jourContestation(), delai) })} /></label>
                  <label className="rv-libelle">À répondre avant le<input type="date" className="rv-champ" value={saisie.repondre_avant} min={saisie.recue_le} onChange={(e) => setSaisie({ ...saisie, repondre_avant: e.target.value })} /></label>
                </div>
                <label className="rv-libelle">Adresse du service des contestations<input className="rv-champ" type="email" value={saisie.adresse_banque} onChange={(e) => setSaisie({ ...saisie, adresse_banque: e.target.value })} placeholder="contestations@votre-banque.fr" autoComplete="off" /></label>
                <label className="rv-libelle">Note pour l&apos;agence<textarea className="rv-champ" rows={2} value={saisie.notes} onChange={(e) => setSaisie({ ...saisie, notes: e.target.value })} /></label>
                {montantFaux ? <Avis teinte="ambre">Le montant contesté est positif et ne dépasse pas la facture ({montant(choisie!.f.total_ttc)}).</Avis> : null}
                {saisie.adresse_banque.trim() && !adresseValide(saisie.adresse_banque) ? <Avis teinte="ambre">L&apos;adresse de la banque n&apos;est pas une adresse de courriel.</Avis> : null}
                {apercu ? (
                  <div>
                    <p className="esp-kpi-sous" style={{ marginBottom: 4 }}>Ce que le dossier contiendra :</p>
                    <ul className="tav-preparation">
                      {apercu.map((x) => <li key={x.code} data-ok={x.ok ? "oui" : "non"}><span aria-hidden="true">{x.ok ? "✓" : "!"}</span> {x.libelle}</li>)}
                    </ul>
                  </div>
                ) : null}
                {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
              </div>
            ) : null}
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={envoi || !saisieComplete} onClick={ouvrir}>{envoi ? <Loader variant="spin" /> : null} Ouvrir et composer le dossier</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!aEnvoyer} onOpenChange={(o) => !o && setAEnvoyer(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><Send width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>Envoyer le dossier {aEnvoyer?.reference_banque}</DialogTitle>
            <DialogDescription>Le courriel part à la banque avec le dossier, le PDF de la facture et le contrat signé s&apos;il est numérisé. Il passe par la validation de vos envois, comme tout courriel.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              <label className="rv-libelle">Adresse du service des contestations <span className="esp-obligatoire">(obligatoire)</span><input className="rv-champ" type="email" value={adresse} onChange={(e) => setAdresse(e.target.value)} autoComplete="off" /></label>
              {aEnvoyer && joursContestation(aEnvoyer.repondre_avant) < 0 ? <Avis teinte="rouge">La date limite était le {dateCourte(aEnvoyer.repondre_avant)} : envoyez quand même, et appelez la banque.</Avis> : null}
              {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={envoi || !adresseValide(adresse)}
              onClick={() => aEnvoyer && agir(async () => { const r = await gestes.envoyer(aEnvoyer, adresse.trim()); return r.deja ? "Ce dossier était déjà remis à l'envoi : rien ne part deux fois." : `Le dossier ${aEnvoyer.reference_banque} part à ${adresse.trim()} (${Number(r.pieces_jointes ?? 1)} pièce${Number(r.pieces_jointes ?? 1) > 1 ? "s" : ""} jointe${Number(r.pieces_jointes ?? 1) > 1 ? "s" : ""}), après validation.`; })}>
              {envoi ? <Loader variant="spin" /> : null} Envoyer à la banque
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!issue} onOpenChange={(o) => !o && setIssue(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><Landmark width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>Contestation {issue?.k.reference_banque} {issue ? ISSUES[issue.issue] : ""}</DialogTitle>
            <DialogDescription>
              {issue?.issue === "abandonnee" ? "Vous ne défendez pas ce débit : la banque le rendra au client. Dites pourquoi, pour le journal."
                : issue?.issue === "perdue" ? "La banque a donné raison au client : le débit est repris. La facture reste due ; un recouvrement reste possible."
                : "La banque a confirmé le débit. Notez la date ou la référence de sa décision."}
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              <label className="rv-libelle">Note<textarea className="rv-champ" rows={2} value={note} onChange={(e) => setNote(e.target.value)} /></label>
              {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className={issue?.issue === "gagnee" ? "r-btn r-btn--noir" : "r-btn r-btn--rouge"} disabled={envoi}
              onClick={() => issue && agir(async () => { await gestes.issue(issue.k, issue.issue, note.trim() || null); return `La contestation ${issue.k.reference_banque} est close : ${ISSUES[issue.issue]}.`; })}>
              {envoi ? <Loader variant="spin" /> : null} Consigner
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
