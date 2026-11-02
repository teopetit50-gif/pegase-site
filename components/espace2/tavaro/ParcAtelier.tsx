"use client";

/* ══════════════════════════════════════════════════════════════════════
   TAVARO — Parc et atelier (02/11/2026, refonte des pages métiers)

   Le Board de Linear (« All issues » en vue Board), au 1:1 : relevé
   docs/refonte-metiers/releves/linear-board.md, styles ./tav-board.css
   (préfixe tav-b-). Une colonne par état du véhicule, une carte par objet :
     · À remettre en location (B20) : délai avant l'heure limite, étapes
       Inspection / Nettoyage / Carburant (G14, bascules), personne à qui
       la remise est confiée (G15), anomalies (G16 / F10, G17) ;
     · Immobilisés (B21) : motif, retour prévu ou dépassé (G19 / F12) ;
     · Entretien à planifier, Entretien planifié (B22) : échéance, créneau
       (G21 / F14), fait (G22 / F15) ;
     · Rappels du constructeur (B25) : G23 (« + »), G24 (confirmé) ;
     · Crit'Air et contrôle technique (B26) : G25.
   Les chiffres du parc (B18) sont les compteurs des colonnes et le menu
   « … » de la première ; « Immobiliser un véhicule » (F11), « Prévoir un
   entretien » (F13) et le contrôle avant de donner les clés (B24, L7) sont
   le bouton « New issue » et le menu « … » de l'en-tête. Le responsable
   des remises par agence (B19) est dans les Réglages.
   Fenêtres F10-F15 : le code de ParcVue, ligne pour ligne ; F16 : la
   fenêtre générique des opérations (./operations).
   ══════════════════════════════════════════════════════════════════════ */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CalendarClock, ClipboardCheck, TriangleAlert, Wrench } from "lucide-react";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import { Avis, Pastille } from "@/components/espace/ui";
import { dateCourte, dateHeure, montant } from "@/components/espace/format";
import { CRITAIR } from "@/components/espace/tavaro/operations";
import type { AnomalieRetour, Creneau, EtapeRemise, Entretien, Immobilisation, MotifImmobilisation, NatureEntretien, Remise, TypeAnomalie } from "@/components/espace/tavaro/types";
import { useToast } from "../Toasts";
import { useTavaro } from "./donnees";
import { FenetreOperations, NIVEAUX } from "./operations";
import { TavCarte, TavMenu, type OptionMenu } from "./TavCadre";
import { TavIcone, type NomTavIcone } from "./TavIcone";
import { BASE } from "./VueEnsemble";
import "./tav-board.css";

const MOTIFS: Record<MotifImmobilisation, string> = {
  preparation: "Préparation", entretien: "Entretien", carrosserie: "Carrosserie", controle_technique: "Contrôle technique", sinistre: "Sinistre",
  attente_pieces: "Attente de pièces", rappel_constructeur: "Rappel du constructeur", autre: "Autre",
};
const ANOMALIES: Record<TypeAnomalie, string> = {
  voyant: "Voyant allumé", dommage: "Dommage", proprete: "Propreté", objet_oublie: "Objet oublié", pneu: "Pneu", cle_papiers: "Clé ou papiers", equipement: "Équipement manquant", autre: "Autre",
};
const NATURES: Record<NatureEntretien, string> = {
  revision: "Révision", vidange: "Vidange", controle_technique: "Contrôle technique", pneus: "Pneus", freins: "Freins", climatisation: "Climatisation", autre: "Autre",
};
const ETAPES: EtapeRemise[] = ["inspection", "nettoyage", "energie"];

const duree = (min: number) => (min >= 60 ? `${Math.floor(min / 60)} h ${String(Math.round(min % 60)).padStart(2, "0")}` : `${Math.round(min)} min`);
const minutesAvant = (iso: string | null) => (iso ? Math.round((Date.parse(iso) - Date.now()) / 60_000) : null);
const libelleEnergie = (energie: string | null | undefined) =>
  energie === "electrique" ? "Recharge" : energie === "hybride_rechargeable" ? "Plein et recharge" : "Plein";
const nombre = (s: string) => (s.trim() ? Number(s.replace(",", ".").replace(/\s/g, "")) : null);


type Etat = "fait" | "cours" | "afaire" | "tri" | "attente";
const ICONE: Record<Etat, NomTavIcone> = { fait: "IssueStatusDone", cours: "IssueStatusStarted", afaire: "IssueStatusTodo", tri: "IssueStatusTriage", attente: "IssueStatusBacklog" };

export function Statut({ etat }: { etat: Etat }) {
  return (
    <span className="tav-b-statut" data-etat={etat}>
      <TavIcone nom={ICONE[etat]} taille={14} />
    </span>
  );
}

/* une puce de carte : 24 de haut, rayon 48, bord 0.5, 12/450 tertiaire */
export function Puce({ icone, children, rouge, onClick, presse, titre }: { icone?: NomTavIcone; children?: React.ReactNode; rouge?: boolean; onClick?: () => void; presse?: boolean; titre?: string }) {
  const contenu = (
    <>
      {icone ? <TavIcone nom={icone} taille={14} className={rouge ? "tav-b-rouge" : undefined} /> : null}
      {children !== undefined ? <span>{children}</span> : null}
    </>
  );
  return onClick ? (
    <button
      type="button"
      className="tav-b-puce"
      aria-pressed={presse}
      title={titre}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      {contenu}
    </button>
  ) : (
    <span className="tav-b-puce" title={titre}>
      {contenu}
    </span>
  );
}

export function Carte({ id, droite, etat, titre, puces, pied, onClick, libelle, objet, vise }: { id: string; droite?: React.ReactNode; etat: Etat; titre: React.ReactNode; puces?: React.ReactNode; pied?: React.ReactNode; onClick?: () => void; libelle?: string; objet?: string; vise?: boolean }) {
  return (
    <li>
      <div
        className="tav-b-carte"
        data-objet={objet}
        data-vise={vise ? "" : undefined}
        role={onClick ? "button" : undefined}
        tabIndex={onClick ? 0 : undefined}
        aria-label={libelle}
        data-cliquable={onClick ? "" : undefined}
        onClick={onClick}
        onKeyDown={(e) => {
          if (onClick && (e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) {
            e.preventDefault();
            onClick();
          }
        }}
      >
        <div className="tav-b-l1">
          <span className="tav-b-id">{id}</span>
          {droite ?? null}
        </div>
        <div className="tav-b-l2">
          <Statut etat={etat} />
          <span className="tav-b-titre">{titre}</span>
        </div>
        {puces ? <div className="tav-b-puces">{puces}</div> : null}
        {pied ? <div className="tav-b-pied">{pied}</div> : null}
      </div>
    </li>
  );
}

export function Colonne({ etat, nom, compte, menu, ajout, children, vide }: { etat: Etat; nom: string; compte: number; menu?: OptionMenu[]; ajout?: { libelle: string; action: () => void; actif: boolean } | null; children: React.ReactNode; vide?: string }) {
  return (
    <section className="tav-b-colonne" aria-label={nom}>
      <header className="tav-b-col-tete">
        <Statut etat={etat} />
        <h2 className="tav-b-col-nom">{nom}</h2>
        <span className="tav-b-col-compte">{compte}</span>
        <span className="tav-pousse" />
        {menu ? <TavMenu libelle={`Actions sur « ${nom} »`} options={menu} alignement="droite" /> : null}
        {ajout ? (
          <button type="button" className="tav-rond" aria-label={ajout.libelle} title={ajout.libelle} disabled={!ajout.actif} onClick={ajout.action}>
            <TavIcone nom="Plus" />
          </button>
        ) : null}
      </header>
      <ul className="tav-b-cartes">{children}</ul>
      {compte === 0 && vide ? <p className="tav-b-vide">{vide}</p> : null}
    </section>
  );
}

const initiales = (nom: string) =>
  nom
    .split(/\s+/)
    .map((x) => x[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

export default function ParcAtelier() {
  const t = useTavaro();
  const { monde, tous, role, moiId: moi, nommer, nomAgenceDe: nomAgence, gestesParc: gestes, agence: agenceFiltre, agences, setAgence, operations: o } = t;
  const toast = useToast();
  const dossiers = tous;
  const dureeMin = monde?.reglages?.remise_duree_min ?? 90;
  const params = useSearchParams();
  const vue = params.get("vue") === "remises" ? "remises" : params.get("vue") === "atelier" ? "atelier" : "tout";
  /* le filtre d'agence vaut pour toute la page (§ 8.3-5) */
  const parc = useMemo(() => {
    const p = monde?.parc ?? { vehicules: [], remises: [], anomalies: [], immobilisations: [], entretiens: [], membres: [] };
    if (!agenceFiltre) return p;
    const de = (e: string | null | undefined) => e === agenceFiltre;
    return { ...p, vehicules: p.vehicules.filter((v) => de(v.entite_id)), remises: p.remises.filter((r) => de(r.entite_id)), immobilisations: p.immobilisations.filter((i) => de(i.entite_id)), entretiens: p.entretiens.filter((e) => de(e.entite_id)) };
  }, [monde, agenceFiltre]);
  const [envoi, setEnvoi] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [fait, setFait] = useState<string | null>(null);
  const [anomalie, setAnomalie] = useState<{ r: Remise; type: TypeAnomalie; description: string; responsable: string } | null>(null);
  const [immo, setImmo] = useState<{ vehicule: string; motif: MotifImmobilisation; fin: string; prestataire: string; notes: string } | null>(null);
  const [retour, setRetour] = useState<{ i: Immobilisation; cout: string } | null>(null);
  const [prevision, setPrevision] = useState<{ vehicule: string; nature: NatureEntretien; libelle: string; echeance_le: string; echeance_km: string; duree_h: string } | null>(null);
  const [plan, setPlan] = useState<{ e: Entretien; creneaux: Creneau[] | null; choix: string; atelier: string; adresse: string } | null>(null);
  const [cloture, setCloture] = useState<{ e: Entretien; km: string; cout: string } | null>(null);

  /* les délais dépendent de l'heure : la carte s'affiche une fois montée (le rendu serveur ne connaît pas l'heure du
     visiteur), puis se rafraîchit chaque minute */
  const [monte, setMonte] = useState(0);
  useEffect(() => {
    const t0 = window.setTimeout(() => setMonte((n) => n + 1), 0);
    const t = window.setInterval(() => setMonte((n) => n + 1), 60_000);
    return () => { window.clearTimeout(t0); window.clearInterval(t); };
  }, []);

  const direction = role === "gerant" || role === "admin" || role === "valideur";
  const agence = direction || role === "collaborateur";
  const vehicule = (id: string) => parc.vehicules.find((v) => v.id === id) ?? dossiers.find((d) => d.vehicule?.id === id)?.vehicule ?? null;
  const contrat = (id: string | null) => (id ? dossiers.find((d) => d.contrat.id === id)?.contrat ?? null : null);

  const enCours = useMemo(() => parc.remises.filter((r) => r.statut === "a_faire" || r.statut === "en_cours")
    .sort((x, y) => (x.limite_le ?? "9999").localeCompare(y.limite_le ?? "9999")), [parc.remises]);
  const finies = useMemo(() => parc.remises.filter((r) => r.statut === "prete" && r.prete_le), [parc.remises]);
  const mediane = useMemo(() => {
    const d = finies.map((r) => (Date.parse(r.prete_le!) - Date.parse(r.retour_le)) / 60_000).sort((a, b) => a - b);
    return d.length ? d[Math.floor((d.length - 1) / 2)] : null;
  }, [finies]);
  const aTemps = finies.filter((r) => !r.limite_le || r.prete_le! <= r.limite_le).length;
  const risques = enCours.filter((r) => { const m = minutesAvant(r.limite_le); return m !== null && m < (dureeMin * ETAPES.filter((e) => !r[`${e}_le`]).length) / 3; }).length;
  const immobilises = parc.immobilisations.filter((i) => !i.fin_le && i.motif !== "preparation");
  const entretiens = parc.entretiens.filter((e) => e.statut === "a_planifier" || e.statut === "planifie")
    .sort((x, y) => (x.statut === y.statut ? (x.debut_le ?? x.echeance_le ?? "9").localeCompare(y.debut_le ?? y.echeance_le ?? "9") : x.statut === "a_planifier" ? -1 : 1));
  const anomaliesDe = (r: Remise) => parc.anomalies.filter((a) => a.remise_id === r.id);
  const louables = parc.vehicules.filter((v) => v.statut !== "sorti");

  async function agir(cle: string, action: () => Promise<string | null>) {
    setEnvoi(cle);
    setErreur(null);
    try {
      const m = await action();
      if (m) setFait(m);
      setAnomalie(null);
      setImmo(null);
      setRetour(null);
      setPrevision(null);
      setPlan(null);
      setCloture(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base a refusé l'opération.");
    } finally {
      setEnvoi(null);
    }
  }
  const ouvrirPlan = async (e: Entretien) => {
    setErreur(null);
    setFait(null);
    setPlan({ e, creneaux: null, choix: "", atelier: e.atelier_nom ?? "", adresse: e.atelier_adresse ?? "" });
    try {
      const c = await gestes.creneaux(e);
      setPlan((p) => (p && p.e.id === e.id ? { ...p, creneaux: c, choix: c[0]?.debut ?? "" } : p));
    } catch (x) {
      setErreur(x instanceof Error ? x.message : "Les créneaux n'ont pas pu être lus.");
      setPlan((p) => (p ? { ...p, creneaux: [] } : p));
    }
  };
  const adresseOk = (a: string) => !a.trim() || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(a.trim());
  useEffect(() => {
    if (fait) {
      toast(`C'est fait. ${fait}`, "vert");
      const x = window.setTimeout(() => setFait(null), 0);
      return () => window.clearTimeout(x);
    }
  }, [fait, toast]);
  useEffect(() => {
    if (o.fait) {
      toast(`C'est fait. ${o.fait}`, "vert");
      const x = window.setTimeout(() => o.setFait(null), 0);
      return () => window.clearTimeout(x);
    }
  }, [o, toast]);

  /* une remise ouverte (Confiée à, anomalies) ; un rappel à confirmer ; le contrôle au départ */
  const [remiseOuverte, setRemiseOuverte] = useState<string | null>(null);
  const remise = parc.remises.find((r) => r.id === remiseOuverte) ?? null;
  const [rappelAConfirmer, setRappelAConfirmer] = useState<string | null>(null);
  const [controleOuvert, setControleOuvert] = useState(false);

  const deLAgence = (vehicule_id: string) => !agenceFiltre || parc.vehicules.some((v) => v.id === vehicule_id);
  const rappels = o.rappelsOuverts.filter((rv) => deLAgence(rv.vehicule_id));
  const conformes = parc.vehicules.filter((v) => v.statut !== "sorti");
  const aPlanifier = entretiens.filter((e) => e.statut === "a_planifier");
  const planifies = entretiens.filter((e) => e.statut === "planifie");
  const montrer = (c: "remises" | "atelier") => vue === "tout" || vue === c;
  /* un repère du point du matin (aiguillage.ts) : ?remise=, ?immobilisation=, ?entretien=, ?rappel=, ?vehicule= */
  const vise = params.get("remise") ?? params.get("immobilisation") ?? params.get("entretien") ?? params.get("rappel") ?? params.get("vehicule");
  useEffect(() => {
    if (!vise || !monte) return;
    const x = window.setTimeout(() => document.querySelector(`[data-objet="${CSS.escape(vise)}"]`)?.scrollIntoView({ block: "center", inline: "center" }), 0);
    return () => window.clearTimeout(x);
  }, [vise, monte]);

  const nouveau: OptionMenu[] = [
    { libelle: "Immobiliser un véhicule", icone: "Alert", action: () => { setErreur(null); setFait(null); setImmo({ vehicule: "", motif: "carrosserie", fin: "", prestataire: "", notes: "" }); } },
    { libelle: "Prévoir un entretien", icone: "Wrench", action: () => { setErreur(null); setFait(null); setPrevision({ vehicule: "", nature: "revision", libelle: "", echeance_le: "", echeance_km: "", duree_h: "4" }); } },
    { libelle: "Enregistrer un rappel", icone: "Flag", action: o.nouveauRappel },
    "sep",
    { libelle: "Contrôle avant de donner les clés", icone: "Shield", action: () => setControleOuvert(true) },
    { libelle: "Responsables des remises", icone: "Roue", href: `${BASE}/reglages` },
  ];
  const optionsAgence: OptionMenu[] = [
    { libelle: "Toutes les agences", icone: agenceFiltre === null ? "IssueStatusDone" : "Team", action: () => setAgence(null) },
    ...agences.map((a) => ({ libelle: (a.nom ?? a.code).split(" — ").pop() ?? a.code, icone: (agenceFiltre === a.entite_id ? "IssueStatusDone" : "Team") as NomTavIcone, action: () => setAgence(a.entite_id) })),
  ];

  return (
    <TavCarte>
      <h1 className="v2-sr">Parc et atelier</h1>
      <header className="tav-tete">
        <div className="tav-ligne1 tav-b-ligne1">
          <Link href={BASE} className="tav-fil">
            <TavIcone nom="Car" style={{ color: "var(--tav-equipe)" }} />
            <span>Location</span>
          </Link>
          <span className="tav-b-sep" aria-hidden="true">
            ›
          </span>
          <span className="tav-b-page">Parc et atelier</span>
          <TavMenu libelle="Actions sur le parc" options={nouveau} />
          <span className="tav-pousse" />
          <Link href={`${BASE}/amendes`} className="tav-rond" aria-label="Amendes, péages, contestations" title="Amendes, péages, contestations">
            <TavIcone nom="Inbox" />
          </Link>
          <button type="button" className="tav-b-nouveau" disabled={!agence} onClick={() => { setErreur(null); setFait(null); setPrevision({ vehicule: "", nature: "revision", libelle: "", echeance_le: "", echeance_km: "", duree_h: "4" }); }}>
            <TavIcone nom="Plus" taille={14} />
            <span>Prévoir un entretien</span>
          </button>
        </div>
        <nav className="tav-ligne2 tav-b-ligne2" aria-label="Vues">
          <Link href={`${BASE}/parc?vue=remises`} scroll={false} className="tav-onglet" aria-current={vue === "remises" ? "page" : undefined}>
            Remises
          </Link>
          <Link href={`${BASE}/parc?vue=atelier`} scroll={false} className="tav-onglet" aria-current={vue === "atelier" ? "page" : undefined}>
            Atelier
          </Link>
          <Link href={`${BASE}/parc`} scroll={false} className="tav-onglet" aria-current={vue === "tout" ? "page" : undefined}>
            Tout le parc
          </Link>
          <span className="tav-pousse" />
          {agences.length > 1 ? <TavMenu libelle="Filtrer par agence" icone="Filtre" alignement="droite" options={optionsAgence} /> : null}
          <button type="button" className="tav-rond tav-b-cadre" aria-label="Contrôle avant de donner les clés" title="Contrôle avant de donner les clés" onClick={() => setControleOuvert(true)}>
            <TavIcone nom="Shield" />
          </button>
        </nav>
      </header>

      <div className="tav-b-tableau">
        {!monte ? <p className="tav-b-vide">Lecture du parc…</p> : null}
        {monte && montrer("remises") ? (
          <Colonne
            etat="cours"
            nom="À remettre en location"
            compte={enCours.length}
            vide="Dès qu'un véhicule rentre, sa remise en location apparaît ici, avec l'heure du prochain départ."
            menu={[
              { libelle: `Médiane sur 30 jours : ${mediane !== null ? duree(mediane) : "—"} (${finies.length} retour${finies.length > 1 ? "s" : ""})`, icone: "Clock", action: () => undefined },
              { libelle: `Prêtes à temps : ${finies.length ? `${aTemps} / ${finies.length}` : "—"}`, icone: "IssueStatusDone", action: () => undefined },
              { libelle: risques ? `${risques} en risque de manquer le départ` : "Aucune en risque", icone: "Alert", action: () => undefined },
            ]}
          >
            {enCours.map((r) => {
              const v = vehicule(r.vehicule_id);
              const c = contrat(r.contrat_id);
              const m = minutesAvant(r.limite_le);
              const reste = (dureeMin * ETAPES.filter((e) => !r[`${e}_le`]).length) / 3;
              const risque = m !== null && (m < 0 || m < reste);
              const ano = anomaliesDe(r).filter((a) => a.statut === "ouverte");
              return (
                <Carte
                  key={r.id}
                  objet={r.id}
                  vise={vise === r.id}
                  id={v?.immatriculation ?? "—"}
                  libelle={`Remise de ${v?.immatriculation ?? "ce véhicule"}`}
                  droite={r.responsable ? <span className="tav-b-avatar" title={`Confiée à ${nommer(r.responsable)}`}>{initiales(nommer(r.responsable))}</span> : <span className="tav-b-sans" title="Confiée à personne en particulier"><TavIcone nom="UnassignedCircle" taille={18} /></span>}
                  etat={r.statut === "en_cours" ? "cours" : "afaire"}
                  titre={r.prochain_depart_le ? `${v?.modele ?? "Véhicule"} — prochain départ le ${dateHeure(r.prochain_depart_le)}` : `${v?.modele ?? "Véhicule"} — aucun départ prévu`}
                  onClick={() => setRemiseOuverte(r.id)}
                  puces={
                    <>
                      {r.limite_le ? <Puce icone={risque ? "CrossedOutCalendar" : "Calendar"} rouge={risque}>{m !== null && m < 0 ? "heure limite passée" : `prête avant ${dateHeure(r.limite_le).split(" à ")[1] ?? dateHeure(r.limite_le)}`}</Puce> : null}
                      {ETAPES.map((e) => {
                        const le = r[`${e}_le`];
                        const libelle = e === "inspection" ? "Inspection" : e === "nettoyage" ? "Nettoyage" : libelleEnergie(v?.energie);
                        return (
                          <Puce key={e} icone={le ? "IssueStatusDone" : "IssueStatusTodo"} presse={!!le} titre={le ? `${libelle} : ${nommer(r[`${e}_par`])}, ${dateHeure(le)}` : `${libelle} : à faire`} onClick={!agence || envoi !== null ? undefined : () => agir(`${r.id}:${e}`, async () => { await gestes.etape(r, e, !le); return null; })}>
                            {libelle}
                          </Puce>
                        );
                      })}
                      {ano.map((a) => (
                        <Puce key={a.id} icone="Alert" rouge>{ANOMALIES[a.type]}</Puce>
                      ))}
                    </>
                  }
                  pied={`Rendu le ${dateHeure(r.retour_le)}${c ? ` · ${c.numero}` : ""} · ${nomAgence(r.entite_id).split(" — ").pop()}`}
                />
              );
            })}
          </Colonne>
        ) : null}

        {monte && montrer("atelier") ? (
          <>
            <Colonne etat="attente" nom="Immobilisés" compte={immobilises.length} vide="Un véhicule chez le carrossier, au garage ou sous rappel du constructeur s'inscrit ici avec sa date de retour." ajout={{ libelle: "Immobiliser un véhicule", actif: agence, action: () => { setErreur(null); setFait(null); setImmo({ vehicule: "", motif: "carrosserie", fin: "", prestataire: "", notes: "" }); } }}>
              {immobilises.map((i) => {
                const depasse = (minutesAvant(i.fin_prevue_le) ?? 1) < 0;
                const v = vehicule(i.vehicule_id);
                return (
                  <Carte
                    key={i.id}
                    objet={i.id}
                    vise={vise === i.id}
                    id={v?.immatriculation ?? "—"}
                    libelle={`${v?.immatriculation ?? "Véhicule"} immobilisé : le véhicule est revenu`}
                    etat="attente"
                    titre={`${MOTIFS[i.motif]}${i.prestataire ? ` chez ${i.prestataire}` : ""}${v?.modele ? ` — ${v.modele}` : ""}`}
                    onClick={agence ? () => { setErreur(null); setFait(null); setRetour({ i, cout: i.cout_eur !== null ? String(i.cout_eur) : "" }); } : undefined}
                    puces={
                      <>
                        {i.fin_prevue_le ? <Puce icone={depasse ? "CrossedOutCalendar" : "Calendar"} rouge={depasse}>{depasse ? `devait revenir le ${dateCourte(i.fin_prevue_le)}` : `retour le ${dateCourte(i.fin_prevue_le)}`}</Puce> : null}
                        {i.cout_eur ? <Puce icone="Euro">{montant(i.cout_eur)}</Puce> : null}
                        {i.notes ? <Puce icone="NotePad">{i.notes}</Puce> : null}
                      </>
                    }
                    pied={`Depuis le ${dateHeure(i.debut_le)}`}
                  />
                );
              })}
            </Colonne>

            {[
              { cle: "a_planifier", nom: "Entretien à planifier", etat: "afaire" as const, liste: aPlanifier },
              { cle: "planifie", nom: "Entretien planifié", etat: "cours" as const, liste: planifies },
            ].map((col) => (
              <Colonne
                key={col.cle}
                etat={col.etat}
                nom={col.nom}
                compte={col.liste.length}
                vide={col.cle === "a_planifier" ? "Révisions, contrôles techniques et pneus s'inscrivent ici avec leur échéance ; Tavaro propose les creux du planning." : "Aucun entretien planifié."}
                ajout={col.cle === "a_planifier" ? { libelle: "Prévoir un entretien", actif: agence, action: () => { setErreur(null); setFait(null); setPrevision({ vehicule: "", nature: "revision", libelle: "", echeance_le: "", echeance_km: "", duree_h: "4" }); } } : null}
              >
                {col.liste.map((e) => {
                  const v = vehicule(e.vehicule_id);
                  const kmProche = e.echeance_km !== null && v?.km_dernier !== null && v?.km_dernier !== undefined && v.km_dernier >= e.echeance_km - 1000;
                  const enRetard = !!e.echeance_le && e.echeance_le < new Date().toISOString().slice(0, 10) && e.statut === "a_planifier";
                  return (
                    <Carte
                      key={e.id}
                      objet={e.id}
                      vise={vise === e.id}
                      id={v?.immatriculation ?? "—"}
                      libelle={`${e.libelle ?? NATURES[e.nature]} sur ${v?.immatriculation ?? "ce véhicule"} : ${e.statut === "planifie" ? "déplacer" : "trouver un créneau"}`}
                      etat={col.etat}
                      titre={e.libelle ?? NATURES[e.nature]}
                      onClick={agence ? () => void ouvrirPlan(e) : undefined}
                      puces={
                        <>
                          {e.echeance_le ? <Puce icone={enRetard ? "CrossedOutCalendar" : "Calendar"} rouge={enRetard}>{dateCourte(e.echeance_le)}</Puce> : null}
                          {e.echeance_km !== null ? <Puce icone="Speedometer" rouge={kmProche}>{`${e.echeance_km.toLocaleString("fr-FR")} km`}</Puce> : null}
                          <Puce icone="Clock">{`${e.duree_h} h d'atelier`}</Puce>
                          {e.statut === "planifie" && e.debut_le ? <Puce icone="Garage">{`dépôt le ${dateHeure(e.debut_le)}${e.atelier_nom ? `, ${e.atelier_nom}` : ""}`}</Puce> : null}
                          {e.envoi_id ? <Puce icone="Email">atelier prévenu</Puce> : null}
                          <Puce icone="Wrench" onClick={agence ? () => { setErreur(null); setFait(null); setCloture({ e, km: v?.km_dernier ? String(v.km_dernier) : "", cout: "" }); } : undefined} titre="L'entretien est fait">
                            Fait
                          </Puce>
                        </>
                      }
                      pied={v?.km_dernier ? `${v.km_dernier.toLocaleString("fr-FR")} km au dernier relevé` : undefined}
                    />
                  );
                })}
              </Colonne>
            ))}

            <Colonne etat="tri" nom="Rappels du constructeur" compte={rappels.length} vide="Aucun rappel à faire." ajout={{ libelle: "Enregistrer un rappel", actif: o.direction, action: o.nouveauRappel }}>
              {rappels.map((rv) => {
                const r = o.ops.rappels.find((x) => x.id === rv.rappel_id);
                return (
                  <Carte
                    key={rv.id}
                    objet={rv.id}
                    vise={vise === rv.id}
                    id={o.immat(rv.vehicule_id)}
                    libelle={`Rappel ${r?.reference ?? ""} sur ${o.immat(rv.vehicule_id)} : fait`}
                    etat="tri"
                    titre={r ? `${r.libelle}` : "Rappel"}
                    onClick={o.agence && !o.envoi ? () => setRappelAConfirmer(rv.id) : undefined}
                    puces={
                      <>
                        {r ? <Puce icone="Flag">{`${r.reference}${r.constructeur ? ` · ${r.constructeur}` : ""}`}</Puce> : null}
                        <Puce icone={r?.gravite === "immobilisant" ? "Alert" : "Calendar"} rouge={r?.gravite === "immobilisant"}>{r?.gravite === "immobilisant" ? "immobilisant" : "à planifier"}</Puce>
                      </>
                    }
                  />
                );
              })}
            </Colonne>

            <Colonne etat="fait" nom="Crit'Air et contrôle technique" compte={conformes.length}>
              {conformes.map((v) => {
                const x = o.ops.conformite.find((c) => c.vehicule_id === v.id);
                const ct = x?.ct_valide_jusqu_au ?? null;
                const jours = ct ? Math.round((new Date(ct).getTime() - o.maintenant) / 86_400_000) : null;
                return (
                  <Carte
                    key={v.id}
                    objet={v.id}
                    vise={vise === v.id}
                    id={v.immatriculation}
                    libelle={`Saisir la conformité de ${v.immatriculation}`}
                    etat={x?.critair && ct && jours !== null && jours > 30 ? "fait" : jours !== null && jours < 0 ? "tri" : "afaire"}
                    titre={v.modele ?? v.immatriculation}
                    onClick={o.agence ? () => o.saisirConformite(v.id) : undefined}
                    puces={
                      <>
                        <Puce icone="Sign">{x?.critair ? CRITAIR[x.critair] : "Crit'Air à vérifier"}</Puce>
                        {ct ? <Puce icone={jours !== null && jours < 0 ? "CrossedOutCalendar" : "Calendar"} rouge={jours !== null && jours < 0}>{jours !== null && jours < 0 ? `CT expiré le ${dateCourte(ct)}` : `CT jusqu'au ${dateCourte(ct)}`}</Puce> : <Puce icone="Calendar">CT à saisir</Puce>}
                      </>
                    }
                  />
                );
              })}
            </Colonne>
          </>
        ) : null}
      </div>

      {/* ——— une remise ouverte : confiée à (G15), anomalies (G16, G17) ——— */}
      <Dialog open={!!remise} onOpenChange={(x) => !x && setRemiseOuverte(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone>
              <ClipboardCheck width={18} height={18} aria-hidden="true" />
            </DialogIcone>
            <DialogTitle>Remise en location de {remise ? vehicule(remise.vehicule_id)?.immatriculation : ""}</DialogTitle>
            <DialogDescription>
              {remise ? (remise.prochain_depart_le ? `Prochain départ le ${dateHeure(remise.prochain_depart_le)}${remise.prochain_depart_ref ? ` (${remise.prochain_depart_ref}${remise.prochain_depart_source === "categorie" ? ", même catégorie" : ""})` : ""} : prête avant ${dateHeure(remise.limite_le)}.` : "Aucun départ prévu pour ce véhicule.") : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            {remise ? (
              <div className="esp-form">
                <label className="rv-libelle">
                  Confiée à
                  <select
                    className="rv-champ"
                    value={remise.responsable ?? ""}
                    disabled={!agence || envoi !== null}
                    onChange={(ev) => agir(`${remise.id}:resp`, async () => { await gestes.assigner(remise, ev.target.value || null); return `La remise de ${vehicule(remise.vehicule_id)?.immatriculation ?? ""} est confiée à ${ev.target.value ? nommer(ev.target.value) : "personne en particulier"}.`; })}
                  >
                    <option value="">Personne en particulier</option>
                    {parc.membres.map((m) => (
                      <option key={m.user_id} value={m.user_id}>
                        {nommer(m.user_id)}
                      </option>
                    ))}
                  </select>
                </label>
                {anomaliesDe(remise).length ? (
                  <ul className="esp-liste" aria-label="Anomalies de ce retour">
                    {anomaliesDe(remise).map((a: AnomalieRetour) => (
                      <li key={a.id} className="esp-item" style={{ cursor: "default" }}>
                        <span className="esp-item-haut">
                          <Pastille teinte={a.statut === "ouverte" ? "ambre" : "vert"}>{a.statut === "ouverte" ? ANOMALIES[a.type] : "traitée"}</Pastille>
                          <span>
                            {a.description} — confiée à <strong>{nommer(a.responsable)}</strong>
                            {a.traitee_le ? `, traitée le ${dateCourte(a.traitee_le)}${a.note ? ` : ${a.note}` : ""}` : ""}
                          </span>
                          {a.statut === "ouverte" ? (
                            <button type="button" className="r-btn r-btn--fil r-btn--petit" disabled={envoi !== null || !(a.responsable === moi || direction)} title={a.responsable === moi || direction ? undefined : "La personne nommée, ou la direction, clôt l'anomalie"} onClick={() => agir(`${a.id}`, async () => { await gestes.traiter(a, null); return `L'anomalie « ${a.description} » est traitée.`; })}>
                              Traitée
                            </button>
                          ) : null}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="esp-kpi-sous">Aucune anomalie signalée sur ce retour.</p>
                )}
                {erreur ? (
                  <Avis teinte="rouge" role="alert">
                    {erreur}
                  </Avis>
                ) : null}
              </div>
            ) : null}
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={!agence || !remise} onClick={() => { if (!remise) return; setErreur(null); setFait(null); setRemiseOuverte(null); setAnomalie({ r: remise, type: "voyant", description: "", responsable: "" }); }}>
              <TriangleAlert width={14} height={14} aria-hidden="true" /> Signaler une anomalie
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ——— G24 : un rappel fait, désormais confirmé ——— */}
      <Dialog open={!!rappelAConfirmer} onOpenChange={(x) => !x && setRappelAConfirmer(null)}>
        <DialogContent>
          {(() => {
            const rv = o.ops.rappelsVehicules.find((x) => x.id === rappelAConfirmer);
            const r = rv ? o.ops.rappels.find((x) => x.id === rv.rappel_id) : null;
            return (
              <>
                <DialogHeader>
                  <DialogIcone>
                    <Wrench width={18} height={18} aria-hidden="true" />
                  </DialogIcone>
                  <DialogTitle>Rappel {r?.reference ?? ""} fait sur {rv ? o.immat(rv.vehicule_id) : ""}</DialogTitle>
                  <DialogDescription>{r?.gravite === "immobilisant" ? "Le véhicule revient en location dès que le rappel est noté fait." : "Le rappel est noté fait sur ce véhicule."} Le geste ne se reprend pas.</DialogDescription>
                </DialogHeader>
                <DialogBody>{o.erreur ? <Avis teinte="rouge" role="alert">{o.erreur}</Avis> : null}</DialogBody>
                <DialogFooter>
                  <button type="button" className="r-btn r-btn--noir" disabled={o.envoi || !rv} onClick={() => { if (rv) void o.rappelFaitSur(rv).then(() => setRappelAConfirmer(null)); }}>
                    {o.envoi ? <Loader variant="spin" /> : null} C&apos;est fait
                  </button>
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ——— B24 / L7 : le contrôle avant de donner les clés ——— */}
      <Dialog open={controleOuvert} onOpenChange={setControleOuvert}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone>
              <ClipboardCheck width={18} height={18} aria-hidden="true" />
            </DialogIcone>
            <DialogTitle>Contrôle avant de donner les clés</DialogTitle>
            <DialogDescription>Ce que le comptoir vérifie et dit au client : conformité du véhicule, rappels, contrôle technique.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              <label className="rv-libelle">
                Contrat
                <select className="rv-champ" value={o.contratControle} onChange={(e) => void o.controler(e.target.value)}>
                  <option value="">Choisir un contrat ouvert…</option>
                  {o.optionsContrats(o.ouverts).map((x) => (
                    <option key={x.valeur} value={x.valeur}>
                      {x.libelle}
                    </option>
                  ))}
                </select>
              </label>
              {o.points ? (
                o.points.length ? (
                  <ul className="esp-liste" aria-label="Points à vérifier au départ">
                    {o.points.map((p, n) => (
                      <li key={n} className="esp-item" style={{ cursor: "default" }}>
                        <span className="esp-item-haut">
                          <Pastille teinte={NIVEAUX[p.niveau].teinte}>{NIVEAUX[p.niveau].libelle}</Pastille>
                          <span>{p.message}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <Avis teinte="vert">Rien à signaler : le véhicule peut partir.</Avis>
                )
              ) : null}
            </div>
          </DialogBody>
        </DialogContent>
      </Dialog>

      <FenetreOperations o={o} />
      <Dialog open={!!anomalie} onOpenChange={(o) => !o && setAnomalie(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><TriangleAlert width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>Anomalie au retour de {anomalie ? vehicule(anomalie.r.vehicule_id)?.immatriculation : ""}</DialogTitle>
            <DialogDescription>Chaque anomalie va à une personne nommée, qui est prévenue et la clôt une fois traitée.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            {anomalie ? (
              <div className="esp-form">
                <label className="rv-libelle">Type
                  <select className="rv-champ" value={anomalie.type} onChange={(e) => setAnomalie({ ...anomalie, type: e.target.value as TypeAnomalie })}>
                    {Object.entries(ANOMALIES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                  </select>
                </label>
                <label className="rv-libelle">Ce qui a été constaté <span className="esp-obligatoire">(obligatoire)</span><textarea className="rv-champ" rows={3} value={anomalie.description} onChange={(e) => setAnomalie({ ...anomalie, description: e.target.value })} /></label>
                <label className="rv-libelle">Confiée à <span className="esp-obligatoire">(obligatoire)</span>
                  <select className="rv-champ" value={anomalie.responsable} onChange={(e) => setAnomalie({ ...anomalie, responsable: e.target.value })}>
                    <option value="">Choisir une personne…</option>
                    {parc.membres.map((m) => <option key={m.user_id} value={m.user_id}>{nommer(m.user_id)}</option>)}
                  </select>
                </label>
                {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
              </div>
            ) : null}
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={envoi !== null || !anomalie || anomalie.description.trim().length < 3 || !anomalie.responsable}
              onClick={() => anomalie && agir("anomalie", async () => { await gestes.signaler(anomalie.r, anomalie.type, anomalie.description.trim(), anomalie.responsable); return `L'anomalie est confiée à ${nommer(anomalie.responsable)}, qui est prévenue.`; })}>
              {envoi === "anomalie" ? <Loader variant="spin" /> : null} Signaler
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!immo} onOpenChange={(o) => !o && setImmo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><TriangleAlert width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>Immobiliser un véhicule</DialogTitle>
            <DialogDescription>Le véhicule garde sa date de retour ; ses réservations sur la période sont à réaffecter, Tavaro les liste.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            {immo ? (
              <div className="esp-form">
                <label className="rv-libelle">Véhicule <span className="esp-obligatoire">(obligatoire)</span>
                  <select className="rv-champ" value={immo.vehicule} onChange={(e) => setImmo({ ...immo, vehicule: e.target.value })}>
                    <option value="">Choisir…</option>
                    {louables.map((v) => <option key={v.id} value={v.id}>{v.immatriculation}{v.modele ? ` · ${v.modele}` : ""}</option>)}
                  </select>
                </label>
                <div className="esp-form-ligne">
                  <label className="rv-libelle">Motif
                    <select className="rv-champ" value={immo.motif} onChange={(e) => setImmo({ ...immo, motif: e.target.value as MotifImmobilisation })}>
                      {(Object.keys(MOTIFS) as MotifImmobilisation[]).filter((m) => m !== "preparation").map((m) => <option key={m} value={m}>{MOTIFS[m]}</option>)}
                    </select>
                  </label>
                  <label className="rv-libelle">Retour prévu{immo.motif !== "sinistre" && immo.motif !== "autre" ? <span className="esp-obligatoire"> (obligatoire)</span> : null}<input type="datetime-local" className="rv-champ" value={immo.fin} onChange={(e) => setImmo({ ...immo, fin: e.target.value })} /></label>
                </div>
                <label className="rv-libelle">Prestataire<input className="rv-champ" value={immo.prestataire} onChange={(e) => setImmo({ ...immo, prestataire: e.target.value })} placeholder="Carrosserie du Parc" /></label>
                <label className="rv-libelle">Note<input className="rv-champ" value={immo.notes} onChange={(e) => setImmo({ ...immo, notes: e.target.value })} /></label>
                {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
              </div>
            ) : null}
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={envoi !== null || !immo?.vehicule || (!immo.fin && immo.motif !== "sinistre" && immo.motif !== "autre")}
              onClick={() => immo && agir("immo", async () => {
                const r = await gestes.immobiliser(immo.vehicule, { motif: immo.motif, fin_prevue_le: immo.fin ? new Date(immo.fin).toISOString() : undefined, prestataire: immo.prestataire.trim() || undefined, notes: immo.notes.trim() || undefined });
                const a = Array.isArray(r.a_reaffecter) ? (r.a_reaffecter as { ref: string }[]) : [];
                return `${vehicule(immo.vehicule)?.immatriculation ?? "Le véhicule"} est immobilisé (${MOTIFS[immo.motif].toLowerCase()}).${a.length ? ` À réaffecter sur un autre véhicule : ${a.map((x) => x.ref).join(", ")}.` : " Aucune réservation à réaffecter."}`;
              })}>
              {envoi === "immo" ? <Loader variant="spin" /> : null} Immobiliser
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!retour} onOpenChange={(o) => !o && setRetour(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><Wrench width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>{retour ? vehicule(retour.i.vehicule_id)?.immatriculation : ""} est revenu</DialogTitle>
            <DialogDescription>Le véhicule redevient louable. Le coût réel nourrit sa fiche économique.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            {retour ? (
              <div className="esp-form">
                <label className="rv-libelle">Coût (€)<input className="rv-champ" inputMode="decimal" value={retour.cout} onChange={(e) => setRetour({ ...retour, cout: e.target.value })} /></label>
                {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
              </div>
            ) : null}
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={envoi !== null || (!!retour?.cout.trim() && !Number.isFinite(nombre(retour.cout)))}
              onClick={() => retour && agir("retour", async () => { await gestes.lever(retour.i, nombre(retour.cout), null); return `${vehicule(retour.i.vehicule_id)?.immatriculation ?? "Le véhicule"} est de nouveau louable.`; })}>
              {envoi === "retour" ? <Loader variant="spin" /> : null} Confirmer le retour
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!prevision} onOpenChange={(o) => !o && setPrevision(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><Wrench width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>Prévoir un entretien</DialogTitle>
            <DialogDescription>Une échéance en date, en kilomètres, ou les deux : Tavaro prévient avant, et propose les creux du planning.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            {prevision ? (
              <div className="esp-form">
                <label className="rv-libelle">Véhicule <span className="esp-obligatoire">(obligatoire)</span>
                  <select className="rv-champ" value={prevision.vehicule} onChange={(e) => setPrevision({ ...prevision, vehicule: e.target.value })}>
                    <option value="">Choisir…</option>
                    {louables.map((v) => <option key={v.id} value={v.id}>{v.immatriculation}{v.modele ? ` · ${v.modele}` : ""}{v.km_dernier ? ` · ${v.km_dernier.toLocaleString("fr-FR")} km` : ""}</option>)}
                  </select>
                </label>
                <div className="esp-form-ligne">
                  <label className="rv-libelle">Nature
                    <select className="rv-champ" value={prevision.nature} onChange={(e) => setPrevision({ ...prevision, nature: e.target.value as NatureEntretien })}>
                      {Object.entries(NATURES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                    </select>
                  </label>
                  <label className="rv-libelle">Durée d&apos;atelier (h)<input className="rv-champ" inputMode="numeric" value={prevision.duree_h} onChange={(e) => setPrevision({ ...prevision, duree_h: e.target.value })} /></label>
                </div>
                <label className="rv-libelle">Libellé<input className="rv-champ" value={prevision.libelle} onChange={(e) => setPrevision({ ...prevision, libelle: e.target.value })} placeholder="Révision 60 000 km" /></label>
                <div className="esp-form-ligne">
                  <label className="rv-libelle">Échéance (date)<input type="date" className="rv-champ" value={prevision.echeance_le} onChange={(e) => setPrevision({ ...prevision, echeance_le: e.target.value })} /></label>
                  <label className="rv-libelle">Échéance (km)<input className="rv-champ" inputMode="numeric" value={prevision.echeance_km} onChange={(e) => setPrevision({ ...prevision, echeance_km: e.target.value })} /></label>
                </div>
                {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
              </div>
            ) : null}
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={envoi !== null || !prevision?.vehicule || (!prevision.echeance_le && !prevision.echeance_km.trim())}
              onClick={() => prevision && agir("prevision", async () => {
                await gestes.prevoir(prevision.vehicule, { nature: prevision.nature, libelle: prevision.libelle.trim() || undefined, echeance_le: prevision.echeance_le || undefined,
                  echeance_km: nombre(prevision.echeance_km) ?? undefined, duree_h: nombre(prevision.duree_h) ?? 4 });
                return `${prevision.libelle.trim() || NATURES[prevision.nature]} prévu pour ${vehicule(prevision.vehicule)?.immatriculation ?? "le véhicule"}.`;
              })}>
              {envoi === "prevision" ? <Loader variant="spin" /> : null} Prévoir
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!plan} onOpenChange={(o) => !o && setPlan(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><CalendarClock width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>{plan ? `${plan.e.libelle ?? NATURES[plan.e.nature]} — ${vehicule(plan.e.vehicule_id)?.immatriculation ?? ""}` : ""}</DialogTitle>
            <DialogDescription>Les creux du planning : aucun ne touche un contrat, une réservation de ce véhicule ou une autre immobilisation.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            {plan ? (
              <div className="esp-form">
                {plan.creneaux === null ? <Loader variant="spin" /> : plan.creneaux.length === 0 ? (
                  <Avis teinte="ambre">Aucun creux de {plan.e.duree_h} h dans les soixante prochains jours : le véhicule est loué ou réservé tout le temps.</Avis>
                ) : (
                  <fieldset className="tav-creneaux">
                    <legend className="rv-libelle">Créneau</legend>
                    {plan.creneaux.map((c) => (
                      <label key={c.debut} className="tav-creneau">
                        <input type="radio" name="creneau" value={c.debut} checked={plan.choix === c.debut} onChange={() => setPlan({ ...plan, choix: c.debut })} />
                        <span>{dateHeure(c.debut)} → {dateHeure(c.fin).split(" à ")[1] ?? dateHeure(c.fin)}{c.avant_echeance ? "" : " · après l'échéance"}</span>
                      </label>
                    ))}
                  </fieldset>
                )}
                <div className="esp-form-ligne">
                  <label className="rv-libelle">Atelier<input className="rv-champ" value={plan.atelier} onChange={(e) => setPlan({ ...plan, atelier: e.target.value })} placeholder="Garage Lumière" /></label>
                  <label className="rv-libelle">Courriel de l&apos;atelier<input type="email" className="rv-champ" value={plan.adresse} onChange={(e) => setPlan({ ...plan, adresse: e.target.value })} placeholder="atelier@garage.fr" autoComplete="off" /></label>
                </div>
                {!adresseOk(plan.adresse) ? <Avis teinte="ambre">Le courriel de l&apos;atelier n&apos;est pas une adresse valide.</Avis> : null}
                {plan.adresse.trim() && adresseOk(plan.adresse) ? <p className="esp-kpi-sous">L&apos;atelier reçoit le créneau par courriel, après validation de vos envois.</p> : null}
                {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
              </div>
            ) : null}
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={envoi !== null || !plan?.choix || !adresseOk(plan.adresse)}
              onClick={() => plan && agir("plan", async () => {
                const r = await gestes.planifier(plan.e, plan.choix, plan.atelier.trim() || null, plan.adresse.trim() || null);
                return `${plan.e.libelle ?? NATURES[plan.e.nature]} planifié le ${dateHeure(plan.choix)}${r.atelier_prevenu ? " ; l'atelier est prévenu" : ""}.`;
              })}>
              {envoi === "plan" ? <Loader variant="spin" /> : null} Planifier
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!cloture} onOpenChange={(o) => !o && setCloture(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><Wrench width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>{cloture ? `${cloture.e.libelle ?? NATURES[cloture.e.nature]} fait` : ""}</DialogTitle>
            <DialogDescription>Le kilométrage et le coût restent dans l&apos;historique du véhicule.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            {cloture ? (
              <div className="esp-form">
                <div className="esp-form-ligne">
                  <label className="rv-libelle">Kilométrage<input className="rv-champ" inputMode="numeric" value={cloture.km} onChange={(e) => setCloture({ ...cloture, km: e.target.value })} /></label>
                  <label className="rv-libelle">Coût (€)<input className="rv-champ" inputMode="decimal" value={cloture.cout} onChange={(e) => setCloture({ ...cloture, cout: e.target.value })} /></label>
                </div>
                {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
              </div>
            ) : null}
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={envoi !== null}
              onClick={() => cloture && agir("cloture", async () => { await gestes.fait(cloture.e, nombre(cloture.km), nombre(cloture.cout)); return `${cloture.e.libelle ?? NATURES[cloture.e.nature]} est fait.`; })}>
              {envoi === "cloture" ? <Loader variant="spin" /> : null} Enregistrer
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TavCarte>
  );
}
