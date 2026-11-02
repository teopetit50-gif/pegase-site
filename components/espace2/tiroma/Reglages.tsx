"use client";

/* ══════════════════════════════════════════════════════════════════════
   TIROMA — Réglages (02/11/2026, refonte des pages métiers)

   La page Settings › Team de Linear, au 1:1 : relevé
   docs/refonte-metiers/releves/linear-team-settings.md (branche refs-linear),
   styles ./tir.css et ./tir-reglages.css. Chaque rangée mène, comme chez
   Linear, à sa sous-page de réglages (?section=…), au même gabarit
   (lien retour, titre 24/500, cartes de rangées de 65).

   Ce qu'elle reprend de l'écran d'avant (inventaire docs/refonte-metiers/tiroma.md) :
     · B28 « Le cabinet » : 28.1 (Général : fiche, Brancher le logiciel G13,
       mode F14/G14, statut F15/G15 dans la zone « danger »), 28.2-28.3
       (Relevés), 28.4 (Praticiens et équipe, F12/G16), 28.5 (Fauteuils,
       F9/G17), 28.6 (Horaires, F10/G18, Retirer G19 avec confirmation),
       28.7 (Fermetures, F11/G20), 28.8 (Vocabulaire, F13/G21-G22), 28.9
       (Règles du cabinet, lecture) ;
     · B26 Règles communes (F8/G11), B27 Vos données (G12), B24 Rappels aux
       patients (mode, moyens de contact F5/G7, Retirer G8 avec
       confirmation, réponses, derniers rappels) ;
     · B7 Installer le cabinet (G1), en base réelle sans cabinet.
   ══════════════════════════════════════════════════════════════════════ */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CAPACITES, DOMAINES_CAPACITE, ETATS_CAPACITE, FAMILLES, JOURS, JOURS_COURTS, LOGICIELS, MODES_RELEVE, NATURES_FERMETURE, REPONSES_RAPPEL,
  STATUTS_CABINET, STATUTS_ENVOI, STATUTS_RELEVE, TYPES_RAPPEL, VERROUS_ENVOI, heureSansSecondes, libelleLogiciel,
} from "@/components/espace/tiroma/libelles";
import type { Capacite, ContactPatient, Dossier, Famille, Fermeture, Logiciel, PatientCourt, TypeRdv } from "@/components/espace/tiroma/types";
import { RACINE } from "../modules";
import { useTiroma, type Action } from "./donnees";
import { TirCarte } from "./TirCadre";
import { TirIcone, type NomTirIcone } from "./TirIcone";
import { PROFILS, actionEnClair, exempleAcces, lireJournalTiroma, lireProfils, roleEnClair, type EntreeJournal, type ProfilLu } from "./acces";
import { exporterCSV } from "./navigateur";
import "./tir-reglages.css";

const BASE = `${RACINE}/tiroma/reglages`;
const enDate = (iso: string) => new Date(iso.length === 10 ? `${iso}T12:00:00` : iso);
const complet = (iso: string | null | undefined) => (iso ? enDate(iso).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: iso.length === 10 ? undefined : "short" }) : "—");
const pct = (x: number | null | undefined) => (x === null || x === undefined ? "—" : `${Math.round(x * 100)} %`);
const SOURCES: Record<ContactPatient["source"], string> = { oral: "Accord oral, au cabinet", ecrit: "Accord écrit (fiche signée)", formulaire: "Formulaire" };

type Section =
  | "general" | "equipe" | "fauteuils" | "horaires" | "fermetures" | "vocabulaire" | "releves" | "regles" | "communes" | "rappels" | "donnees" | "installer" | "acces" | "journal";

/* ——— briques de la page (linear-team-settings.md) ——— */
function Rangee({ icone, titre, description, valeur, href, onClick, verrou, enfant }: { icone?: NomTirIcone; titre: string; description?: string; valeur?: React.ReactNode; href?: string; onClick?: () => void; verrou?: string; enfant?: React.ReactNode }) {
  const contenu = (
    <>
      {icone ? <span className="tir-rg-figure"><TirIcone nom={icone} /></span> : null}
      <span className="tir-rg-texte">
        <span className="tir-rg-titre">{titre}</span>
        {description ? <span className="tir-rg-desc">{description}</span> : null}
      </span>
      {enfant}
      {verrou ? <span className="tir-rg-verrou">{verrou}</span> : null}
      {valeur !== undefined || href || onClick ? (
        <span className="tir-rg-droite">
          {valeur !== undefined ? <span className="tir-rg-valeur">{valeur}</span> : null}
          {href || onClick ? <TirIcone nom="Chevron" className="tir-rg-chevron" /> : null}
        </span>
      ) : null}
    </>
  );
  if (href) return <Link href={href} className="tir-rg-rangee" data-lien="">{contenu}</Link>;
  if (onClick) return <button type="button" className="tir-rg-rangee" data-lien="" onClick={onClick}>{contenu}</button>;
  return <div className="tir-rg-rangee" data-verrou={verrou ? "" : undefined}>{contenu}</div>;
}

function Bloc({ titre, aide, children }: { titre?: string; aide?: React.ReactNode; children: React.ReactNode }) {
  return (
    <fieldset className="tir-rg-bloc">
      {titre ? <h3 className="tir-rg-h3">{titre}</h3> : null}
      {aide ? <p className="tir-rg-aide">{aide}</p> : null}
      <section className="tir-rg-carte">{children}</section>
    </fieldset>
  );
}

function Danger({ titre, description, bouton, onClick, disabled }: { titre: string; description: string; bouton: string; onClick: () => void; disabled?: boolean }) {
  return (
    <div className="tir-rg-rangee">
      <span className="tir-rg-texte">
        <span className="tir-rg-titre">{titre}</span>
        <span className="tir-rg-desc">{description}</span>
      </span>
      <button type="button" className="tir-rg-bouton" disabled={disabled} onClick={onClick}>{bouton}</button>
    </div>
  );
}

/* un formulaire en carte : les champs, puis le bouton ; confirmation quand le geste ne se défait pas */
function Formulaire({ titre, aide, children, bouton, pret, envoyer, confirmer }: { titre: string; aide?: string; children: React.ReactNode; bouton: string; pret: boolean; envoyer: () => Promise<string>; confirmer?: string }) {
  const [occupe, setOccupe] = useState(false);
  const [avis, setAvis] = useState<{ ok: boolean; texte: string } | null>(null);
  const [attente, setAttente] = useState(false);
  const go = async () => {
    if (confirmer && !attente) {
      setAttente(true);
      return;
    }
    setOccupe(true);
    setAvis(null);
    try {
      const t = await envoyer();
      setAvis({ ok: true, texte: t });
      setAttente(false);
    } catch (e) {
      setAvis({ ok: false, texte: e instanceof Error ? e.message : "La base n'a pas répondu." });
    } finally {
      setOccupe(false);
    }
  };
  return (
    <fieldset className="tir-rg-bloc">
      <h3 className="tir-rg-h3">{titre}</h3>
      {aide ? <p className="tir-rg-aide">{aide}</p> : null}
      <section className="tir-rg-carte tir-rg-form">
        {children}
        {attente && confirmer ? <p className="tir-rg-confirmer" role="alert">{confirmer}</p> : null}
        {avis ? <p className={avis.ok ? "tir-rg-ok" : "tir-rg-erreur"} role={avis.ok ? "status" : "alert"}>{avis.ok ? "C'est fait. " : ""}{avis.texte}</p> : null}
        <div className="tir-rg-form-pied">
          {attente ? <button type="button" className="tir-rg-bouton" onClick={() => setAttente(false)}>Annuler</button> : null}
          <button type="button" className="tir-rg-bouton tir-rg-bouton--plein" disabled={occupe || !pret} onClick={go}>{attente ? "Confirmer" : occupe ? "Un instant…" : bouton}</button>
        </div>
      </section>
    </fieldset>
  );
}

function Champ({ libelle, children }: { libelle: string; children: React.ReactNode }) {
  return (
    <label className="tir-rg-champ">
      <span>{libelle}</span>
      {children}
    </label>
  );
}

function RechercheP({ choisir, choisi }: { choisir: (p: PatientCourt | null) => void; choisi: PatientCourt | null }) {
  const t = useTiroma();
  const [texte, setTexte] = useState("");
  const [trouves, setTrouves] = useState<PatientCourt[]>([]);
  useEffect(() => {
    if (choisi || texte.trim().length < 2) return;
    const h = window.setTimeout(() => void t.chercher(texte).then(setTrouves).catch(() => setTrouves([])), 250);
    return () => window.clearTimeout(h);
  }, [texte, choisi, t]);
  return (
    <>
      <Champ libelle="Patient (obligatoire)">
        <input className="tir-rg-input" value={choisi ? [choisi.prenom, choisi.nom].filter(Boolean).join(" ") : texte} onChange={(e) => { choisir(null); setTexte(e.target.value); }} placeholder="Les premières lettres du nom" autoComplete="off" />
      </Champ>
      {!choisi && texte.trim().length >= 2 && trouves.length ? (
        <div className="tir-rg-trouves" role="listbox" aria-label="Patients trouvés">
          {trouves.map((p) => (
            <button key={p.id} type="button" role="option" aria-selected={false} disabled={p.ne_pas_contacter} onClick={() => choisir(p)}>
              {[p.prenom, p.nom].filter(Boolean).join(" ")}{p.ne_pas_contacter ? " — ne pas contacter" : ""}
            </button>
          ))}
        </div>
      ) : null}
    </>
  );
}

/* ——— les sous-pages ——— */
function SousPage({ section, d }: { section: Section; d: Dossier }) {
  const t = useTiroma();
  const titulaire = d.profil === "titulaire";
  const peutEcrire = d.profil !== null && d.profil !== "direction";
  const agir = async (a: Action, message: string) => {
    await t.agir(a);
    return message;
  };
  const { cabinet, fauteuils, praticiens, membres, horaires, fermetures, regles, releves, capacites, types } = d;

  /* formulaires */
  const [nomF, setNomF] = useState("");
  const [capsF, setCapsF] = useState<Capacite[]>(["soins"]);
  const [objF, setObjF] = useState("");
  const [jour, setJour] = useState(1);
  const [debut, setDebut] = useState("08:00");
  const [fin, setFin] = useState("12:00");
  const [fauteuilH, setFauteuilH] = useState("");
  const [fermD, setFermD] = useState("");
  const [fermF, setFermF] = useState("");
  const [fermN, setFermN] = useState<Fermeture["nature"]>("conge");
  const [fermQui, setFermQui] = useState("");
  const [nomP, setNomP] = useState("");
  const [metierP, setMetierP] = useState<"titulaire" | "collaborateur" | "salarie" | "orthodontiste" | "remplacant">("collaborateur");
  const [typeC, setTypeC] = useState<TypeRdv | null>(null);
  const [famille, setFamille] = useState<Famille>("controle");
  const [labo, setLabo] = useState(false);
  const [chir, setChir] = useState(false);
  const [assist, setAssist] = useState(true);
  const [duree, setDuree] = useState("");
  const [aRetirer, setARetirer] = useState<string | null>(null);
  const [patient, setPatient] = useState<PatientCourt | null>(null);
  const [adresse, setAdresse] = useState("");
  const [rappelsC, setRappelsC] = useState(true);
  const [relances, setRelances] = useState(true);
  const [source, setSource] = useState<ContactPatient["source"]>("oral");
  const [preuve, setPreuve] = useState("");
  const [contactRetire, setContactRetire] = useState<string | null>(null);
  const [avisLigne, setAvisLigne] = useState<string | null>(null);

  const classer = (ty: TypeRdv) => {
    setTypeC(ty);
    setFamille(ty.famille ?? "controle");
    setLabo(ty.necessite_labo);
    setChir(ty.chirurgie);
    setAssist(ty.exige_assistante);
    setDuree(ty.duree_defaut_min ? String(ty.duree_defaut_min) : "");
  };

  if (section === "acces" || section === "journal") return <AccesJournal section={section} d={d} />;

  if (section === "general") {
    const s = STATUTS_CABINET[cabinet.statut];
    return (
      <>
        <Bloc>
          <Rangee icone="Home" titre="Entité" description="Le territoire fixe les jours ouvrés, le fuseau l'heure du point du matin" valeur={cabinet.entite_nom ?? "—"} />
          <Rangee icone="Spreadsheet" titre="Logiciel" description="Les exports que Tiroma sait lire" valeur={`${libelleLogiciel(cabinet.logiciel)}${cabinet.logiciel_version ? ` ${cabinet.logiciel_version}` : ""}`} />
          <Rangee icone="Clock" titre="Point du matin" description="Remis à l'équipe avant le premier patient" valeur={heureSansSecondes(cabinet.heure_point)} />
          <Rangee icone="Refresh" titre="Dernier relevé" description={cabinet.releves_douteux_suite ? `${cabinet.releves_douteux_suite} relevé(s) douteux de suite` : "Dernier relevé sûr : " + complet(cabinet.dernier_releve_ok_le)} valeur={complet(cabinet.dernier_releve_le)} href={`${BASE}?section=releves`} />
          <Rangee icone="Users" titre="Partage" description="Qui voit les patients" valeur={cabinet.perimetre_partage === "cabinet" ? "Tout le cabinet" : "Chaque praticien, les siens"} />
          <Rangee icone="Shield" titre="État" description={cabinet.mode === "reel" ? "Mode réel : les mesures comptent" : "À blanc : on règle sans conséquence"} valeur={`${s?.libelle ?? cabinet.statut} · ${cabinet.mode === "reel" ? "Mode réel" : "À blanc"}`} />
        </Bloc>
        {titulaire && cabinet.statut === "installation" ? (
          <Formulaire titre="Brancher le logiciel" aide="Tiroma lit les exports du logiciel ; il n'y écrit jamais." bouton="Brancher le logiciel" pret envoyer={() => agir({ type: "brancher" }, "Le cabinet est branché : déposez le premier export du logiciel.")}>
            <p className="tir-rg-aide">Voie : exports du logiciel ({libelleLogiciel(cabinet.logiciel)}).</p>
          </Formulaire>
        ) : null}
        {titulaire && cabinet.statut !== "clos" ? (
          <Bloc titre="Zone sensible">
            <Danger
              titre={cabinet.mode === "reel" ? "Repasser à blanc" : "Passer en mode réel"}
              description={cabinet.mode === "reel" ? "Les mesures sont marquées « à blanc » : on règle sans conséquence" : "Les mesures comptent pour de vrai ; le point du matin est remis à l'équipe"}
              bouton={cabinet.mode === "reel" ? "Repasser à blanc…" : "Passer en mode réel…"}
              onClick={() => setAvisLigne(cabinet.mode === "reel" ? "mode:a_blanc" : "mode:reel")}
            />
            <Danger
              titre={cabinet.statut === "coupe" ? "Réactiver le cabinet" : "Couper le cabinet"}
              description={cabinet.statut === "coupe" ? "Le point du matin et les mesures reprennent" : "Plus de point du matin ni de mesures ; les données restent, il se réactive d'un clic"}
              bouton={cabinet.statut === "coupe" ? "Réactiver…" : "Couper…"}
              onClick={() => setAvisLigne(cabinet.statut === "coupe" ? "statut:actif" : "statut:coupe")}
            />
            <Danger titre="Clore le cabinet" description="Clos, le cabinet ne revient plus ; ses données restent consultables" bouton="Clore…" onClick={() => setAvisLigne("statut:clos")} />
          </Bloc>
        ) : null}
        {avisLigne ? (
          <Formulaire
            key={avisLigne}
            titre={avisLigne === "mode:reel" ? "Passer en mode réel" : avisLigne === "mode:a_blanc" ? "Repasser à blanc" : avisLigne === "statut:actif" ? "Réactiver le cabinet" : avisLigne === "statut:coupe" ? "Couper le cabinet" : "Clore le cabinet"}
            aide={avisLigne === "statut:clos" ? "Clos, le cabinet ne revient plus." : undefined}
            bouton="Confirmer"
            pret
            confirmer={avisLigne === "statut:clos" ? "Clore définitivement ? Le cabinet ne pourra pas être réactivé." : "Confirmez le changement."}
            envoyer={async () => {
              const [k, v] = avisLigne.split(":");
              if (k === "mode") return agir({ type: "mode", mode: v as "reel" | "a_blanc" }, v === "reel" ? "Le cabinet est en mode réel." : "Le cabinet est à blanc.");
              return agir({ type: "statut", statut: v as "actif" | "coupe" | "clos" }, v === "actif" ? "Le cabinet est réactivé." : v === "coupe" ? "Le cabinet est coupé." : "Le cabinet est clos.");
            }}
          >
            <p className="tir-rg-aide">{avisLigne.startsWith("mode") ? "Le changement de mode est noté au journal du cabinet." : "Le changement d'état est noté au journal du cabinet."}</p>
          </Formulaire>
        ) : null}
      </>
    );
  }

  if (section === "equipe") {
    return (
      <>
        <Bloc titre="Praticiens">
          {praticiens.length ? praticiens.map((p) => <Rangee key={p.id} icone="Creator" titre={p.nom_affiche} description={p.metier[0].toUpperCase() + p.metier.slice(1)} valeur={p.actif ? undefined : "Inactif"} />) : <Rangee titre="Aucun praticien" description="Les praticiens arrivent avec le premier relevé, ou se posent ici." />}
        </Bloc>
        <Bloc titre="Équipe">
          {membres.length ? membres.map((m) => <Rangee key={m.id} icone="Members" titre={m.prenom} description={`Assistante${m.fauteuil_habituel_id ? ` · ${fauteuils.find((f) => f.id === m.fauteuil_habituel_id)?.nom ?? ""}` : ""}`} valeur={m.actif ? undefined : "Inactive"} />) : <Rangee titre="Aucun membre" />}
        </Bloc>
        {titulaire ? (
          <Formulaire titre="Ajouter un praticien" aide="Le nom tel que l'agenda du logiciel l'écrit, pour que les rendez-vous lui soient rattachés." bouton="Ajouter" pret={!!nomP.trim()} envoyer={() => agir({ type: "praticien", nom_affiche: nomP.trim(), metier: metierP }, `${nomP.trim()} est ajouté.`)}>
            <Champ libelle="Nom affiché (obligatoire)"><input className="tir-rg-input" value={nomP} maxLength={120} onChange={(e) => setNomP(e.target.value)} /></Champ>
            <Champ libelle="Métier">
              <select className="tir-rg-input" value={metierP} onChange={(e) => setMetierP(e.target.value as typeof metierP)}>
                <option value="titulaire">Titulaire</option><option value="collaborateur">Collaborateur</option><option value="salarie">Salarié</option><option value="orthodontiste">Orthodontiste</option><option value="remplacant">Remplaçant</option>
              </select>
            </Champ>
          </Formulaire>
        ) : null}
      </>
    );
  }

  if (section === "fauteuils") {
    return (
      <>
        <Bloc>
          {fauteuils.length ? fauteuils.map((f) => <Rangee key={f.id} icone="Box" titre={f.nom} description={f.capacites.map((c) => CAPACITES[c] ?? c).join(", ")} valeur={`${f.objectif_occupation ? `objectif ${pct(f.objectif_occupation)}` : "sans objectif"}${f.actif ? "" : " · inactif"}`} />) : <Rangee titre="Aucun fauteuil" description="Les fauteuils arrivent avec l'agenda du logiciel (salles), ou se posent ici." />}
        </Bloc>
        {titulaire ? (
          <Formulaire titre="Ajouter un fauteuil" aide="Un fauteuil porte des capacités : Tiroma ne proposera un créneau de prothèse que sur un fauteuil qui la permet." bouton="Ajouter" pret={!!nomF.trim() && !!capsF.length} envoyer={() => agir({ type: "fauteuil", nom: nomF.trim(), capacites: capsF, objectif: objF ? Number(objF) / 100 : null }, `${nomF.trim()} est posé.`)}>
            <Champ libelle="Nom (obligatoire)"><input className="tir-rg-input" value={nomF} maxLength={60} onChange={(e) => setNomF(e.target.value)} /></Champ>
            <div className="tir-rg-cases">
              {(Object.keys(CAPACITES) as Capacite[]).map((c) => (
                <label key={c}><input type="checkbox" checked={capsF.includes(c)} onChange={(e) => setCapsF((p) => (e.target.checked ? [...p, c] : p.filter((x) => x !== c)))} /> {CAPACITES[c]}</label>
              ))}
            </div>
            <Champ libelle="Objectif d'occupation (%)"><input className="tir-rg-input" type="number" min={1} max={100} value={objF} onChange={(e) => setObjF(e.target.value)} /></Champ>
          </Formulaire>
        ) : null}
      </>
    );
  }

  if (section === "horaires") {
    const liste = horaires.filter((h) => !h.exceptionnel).sort((a, b) => a.jour - b.jour || a.debut.localeCompare(b.debut));
    return (
      <>
        <Bloc>
          {liste.length
            ? liste.map((h) => (
                <Rangee key={h.id} icone="Clock" titre={`${JOURS[h.jour]} ${heureSansSecondes(h.debut)}–${heureSansSecondes(h.fin)}`} description={h.fauteuil_id ? fauteuils.find((f) => f.id === h.fauteuil_id)?.nom ?? "Fauteuil" : "Tout le cabinet"}
                  enfant={titulaire ? (aRetirer === h.id ? (
                    <span className="tir-rg-confirme">
                      <button type="button" className="tir-rg-bouton" onClick={() => setARetirer(null)}>Annuler</button>
                      <button type="button" className="tir-rg-bouton tir-rg-bouton--plein" onClick={() => { setARetirer(null); void t.agir({ type: "retirer_horaire", id: h.id }).then(() => setAvisLigne("L'horaire est retiré.")).catch((e) => setAvisLigne(e instanceof Error ? e.message : "La base n'a pas répondu.")); }}>Retirer</button>
                    </span>
                  ) : <button type="button" className="tir-rg-bouton" onClick={() => setARetirer(h.id)}>Retirer…</button>) : undefined}
                />
              ))
            : <Rangee titre="Aucun horaire" description="Sans eux, Tiroma ne sait pas quand un fauteuil est ouvert." />}
        </Bloc>
        {avisLigne ? <p className="tir-rg-ok" role="status">{avisLigne}</p> : null}
        {titulaire ? (
          <Formulaire titre="Ajouter un horaire" aide="Une plage d'ouverture hebdomadaire, pour tout le cabinet ou pour un fauteuil." bouton="Ajouter" pret={!!debut && !!fin && debut < fin} envoyer={() => agir({ type: "horaire", jour, debut, fin, fauteuil_id: fauteuilH || null }, `${JOURS_COURTS[jour]} ${debut}–${fin} est posé.`)}>
            <Champ libelle="Jour"><select className="tir-rg-input" value={jour} onChange={(e) => setJour(Number(e.target.value))}>{[1, 2, 3, 4, 5, 6, 7].map((j) => <option key={j} value={j}>{JOURS[j]}</option>)}</select></Champ>
            <div className="tir-rg-deux">
              <Champ libelle="De"><input className="tir-rg-input" type="time" value={debut} onChange={(e) => setDebut(e.target.value)} /></Champ>
              <Champ libelle="À"><input className="tir-rg-input" type="time" value={fin} onChange={(e) => setFin(e.target.value)} /></Champ>
            </div>
            <Champ libelle="Pour"><select className="tir-rg-input" value={fauteuilH} onChange={(e) => setFauteuilH(e.target.value)}><option value="">Tout le cabinet</option>{fauteuils.map((f) => <option key={f.id} value={f.id}>{f.nom}</option>)}</select></Champ>
          </Formulaire>
        ) : null}
      </>
    );
  }

  if (section === "fermetures") {
    return (
      <>
        <Bloc>
          {fermetures.length
            ? fermetures.map((f) => <Rangee key={f.id} icone="CrossedOutCalendar" titre={NATURES_FERMETURE[f.nature] ?? f.nature} description={`Du ${complet(f.debut)} au ${complet(f.fin)}`} valeur={f.praticien_id ? praticiens.find((p) => p.id === f.praticien_id)?.nom_affiche ?? "Praticien" : f.fauteuil_id ? fauteuils.find((x) => x.id === f.fauteuil_id)?.nom ?? "Fauteuil" : "Tout le cabinet"} />)
            : <Rangee titre="Aucune fermeture à venir" />}
        </Bloc>
        {titulaire ? (
          <Formulaire titre="Ajouter une fermeture" aide="Congé d'un praticien, fermeture d'un fauteuil ou du cabinet, formation : la plage ouverte se réduit d'autant." bouton="Ajouter" pret={!!fermD && !!fermF && fermD < fermF}
            envoyer={() => agir({ type: "fermeture", debut: new Date(fermD).toISOString(), fin: new Date(fermF).toISOString(), nature: fermN, praticien_id: fermQui.startsWith("p:") ? fermQui.slice(2) : null, fauteuil_id: fermQui.startsWith("f:") ? fermQui.slice(2) : null }, "La fermeture est posée.")}>
            <Champ libelle="Nature"><select className="tir-rg-input" value={fermN} onChange={(e) => setFermN(e.target.value as Fermeture["nature"])}>{Object.entries(NATURES_FERMETURE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Champ>
            <div className="tir-rg-deux">
              <Champ libelle="Du"><input className="tir-rg-input" type="datetime-local" value={fermD} onChange={(e) => setFermD(e.target.value)} /></Champ>
              <Champ libelle="Au"><input className="tir-rg-input" type="datetime-local" value={fermF} onChange={(e) => setFermF(e.target.value)} /></Champ>
            </div>
            <Champ libelle="Qui"><select className="tir-rg-input" value={fermQui} onChange={(e) => setFermQui(e.target.value)}><option value="">Tout le cabinet</option>{praticiens.map((p) => <option key={p.id} value={`p:${p.id}`}>{p.nom_affiche}</option>)}{fauteuils.map((f) => <option key={f.id} value={`f:${f.id}`}>{f.nom}</option>)}</select></Champ>
          </Formulaire>
        ) : null}
      </>
    );
  }

  if (section === "vocabulaire") {
    return (
      <>
        <Bloc>
          {types.length
            ? types.map((ty) => (
                <Rangee key={ty.id} icone="Label" titre={ty.libelle_source} description={`${ty.categorie_source ? `${ty.categorie_source} · ` : ""}${ty.famille ? FAMILLES[ty.famille] : "sans famille"}${ty.necessite_labo ? " · labo" : ""}${ty.chirurgie ? " · chirurgie" : ""}${ty.duree_defaut_min ? ` · ${ty.duree_defaut_min} min` : ""}`}
                  valeur={ty.statut === "valide" ? "Validé" : ty.statut === "propose" ? `Proposé${ty.confiance ? ` (confiance ${ty.confiance})` : ""}` : "À classer"}
                  onClick={titulaire ? () => classer(ty) : undefined} />
              ))
            : <Rangee titre="Aucun type de rendez-vous" description="Ils arrivent avec le premier relevé ; Tiroma propose une famille, le titulaire confirme." />}
        </Bloc>
        {titulaire && typeC ? (
          <>
            <Formulaire key={`${typeC.id}-v`} titre={`Classer « ${typeC.libelle_source} »`} aide="La famille décide du fauteuil, de la durée et des vérifications (laboratoire, implant). Validé, le type ne bouge plus au prochain relevé." bouton="Valider" pret
              envoyer={() => agir({ type: "classer", typeRdv: typeC, famille, statut: "valide", necessite_labo: labo, chirurgie: chir, exige_assistante: assist, duree_defaut_min: duree ? Number(duree) : null }, "Le type est validé.")}>
              <Champ libelle="Famille"><select className="tir-rg-input" value={famille} onChange={(e) => setFamille(e.target.value as Famille)}>{(Object.keys(FAMILLES) as Famille[]).map((f) => <option key={f} value={f}>{FAMILLES[f]}</option>)}</select></Champ>
              <Champ libelle="Durée par défaut (min)"><input className="tir-rg-input" type="number" min={5} max={600} value={duree} onChange={(e) => setDuree(e.target.value)} /></Champ>
              <div className="tir-rg-cases">
                <label><input type="checkbox" checked={labo} onChange={(e) => setLabo(e.target.checked)} /> Travail de laboratoire</label>
                <label><input type="checkbox" checked={chir} onChange={(e) => setChir(e.target.checked)} /> Chirurgie</label>
                <label><input type="checkbox" checked={assist} onChange={(e) => setAssist(e.target.checked)} /> Exige une assistante</label>
              </div>
            </Formulaire>
            <div className="tir-rg-sous-action">
              <button type="button" className="tir-rg-bouton" onClick={() => void t.agir({ type: "classer", typeRdv: typeC, famille, statut: "propose", necessite_labo: labo, chirurgie: chir, exige_assistante: assist, duree_defaut_min: duree ? Number(duree) : null }).then(() => setAvisLigne("Le type est classé, à valider plus tard.")).catch((e) => setAvisLigne(e instanceof Error ? e.message : "La base n'a pas répondu."))}>Classer sans valider</button>
              {avisLigne ? <span className="tir-rg-ok">{avisLigne}</span> : null}
            </div>
          </>
        ) : null}
      </>
    );
  }

  if (section === "releves") {
    return (
      <>
        <Bloc titre="Relevés du logiciel">
          {releves.length
            ? releves.slice(0, 6).map((r) => {
                const c = r.compteurs ?? {};
                const total = Object.values(c).map((x) => Object.entries(x as Record<string, number>).map(([k, v]) => `${v} ${k}`).join(", ")).join(" · ");
                return <Rangee key={r.id} icone="Refresh" titre={`${complet(r.recu_le)} · ${STATUTS_RELEVE[r.statut]?.libelle ?? r.statut}`} description={r.raison ?? `${MODES_RELEVE[r.mode] ?? r.mode} · ${r.voie}${total ? ` · ${total}` : ""}`} />;
              })
            : <Rangee titre="Aucun relevé reçu" description={titulaire ? "Branchez le logiciel, puis déposez son premier export." : "Les relevés sont visibles du titulaire."} />}
        </Bloc>
        {capacites.length ? (
          <Bloc titre="Ce que le logiciel tient">
            {capacites.map((k) => <Rangee key={k.id} icone="Checklist" titre={DOMAINES_CAPACITE[k.domaine] ?? k.domaine} description={k.mesure ? Object.entries(k.mesure).map(([a, b]) => `${a} ${b}`).join(" · ") : undefined} valeur={ETATS_CAPACITE[k.etat]?.libelle ?? k.etat} />)}
          </Bloc>
        ) : null}
      </>
    );
  }

  if (section === "regles") {
    if (!regles) return <Bloc><Rangee titre="Règles non lues" description={titulaire ? "Les règles se fixent avec Omega à l'audit." : undefined} /></Bloc>;
    return (
      <Bloc aide={<>Les règles se fixent avec Omega à l&apos;audit ; le titulaire peut les ajuster ici (durée et préférences tenues : {regles.tenir_duree ? "oui" : "non"} / {regles.tenir_preferences ? "oui" : "non"}).</>}>
        <Rangee icone="Policy" titre="Ordre pour un créneau libéré" valeur={regles.ordre_priorite.map((o) => ({ plan: "plan", attente: "attente", controle: "contrôle" })[o] ?? o).join(" → ")} />
        <Rangee icone="Clock" titre="Créneau minimal et propositions" valeur={`${regles.creneau_min_minutes} min · ${regles.nb_propositions} patients`} />
        <Rangee icone="Calendar" titre="Horizon et délai d'appel" valeur={`${regles.horizon_creneaux_jours} j · ${regles.delai_min_appel_minutes} min`} />
        <Rangee icone="Refresh" titre="Contrôle dû et quota" valeur={`${regles.seuil_controle_mois} mois · ${regles.quota_controles_demi_journee} par demi-journée`} />
        <Rangee icone="Checklist" titre="Vérifications" valeur={`labo J-${regles.labo_verif_jours} · devis ${regles.alerte_devis_expire_jours} j · interruption ${regles.delai_interruption_jours} j`} />
        <Rangee icone="Box" titre="Seuil de demi-journée vide" valeur={pct(regles.seuil_demi_journee_vide)} />
      </Bloc>
    );
  }

  if (section === "communes") {
    const rc = d.reglesCommunes;
    if (!rc || rc.centres.length < 2) return <Bloc><Rangee titre="Un seul centre" description="Les règles communes se comparent dès deux centres." /></Bloc>;
    const ici = rc.centres.find((c) => c.entite_id === cabinet.entite_id);
    const cles = [...new Set(rc.centres.flatMap((c) => Object.keys(c.regles)))];
    const valeur = (v: unknown) => (Array.isArray(v) ? v.join(" → ") : typeof v === "boolean" ? (v ? "oui" : "non") : typeof v === "number" && v < 1 && v > 0 ? pct(v) : String(v ?? "—"));
    return (
      <>
        <Bloc titre={rc.ecarts.length ? `${rc.ecarts.length} écart${rc.ecarts.length > 1 ? "s" : ""}` : "Mêmes règles partout"} aide="Restent propres à chaque centre : la réserve d'urgences, les garde-fous d'import et l'objectif de production.">
          {cles.map((k) => <Rangee key={k} icone={rc.ecarts.includes(k) ? "Alert" : "Checklist"} titre={k} description={rc.centres.map((c) => `${c.nom.replace(/ \(exemple\)$/, "")} : ${valeur(c.regles[k])}`).join(" · ")} valeur={rc.ecarts.includes(k) ? "Écart" : "Identique"} />)}
        </Bloc>
        {rc.ecarts.length ? (
          <Formulaire titre={`Aligner sur ${ici?.nom ?? "ce centre"}`} aide={`Changeront dans les autres centres : ${rc.ecarts.join(", ")}.`} bouton="Aligner" pret confirmer="Les autres centres prendront les règles de celui-ci."
            envoyer={async () => { const n = await t.aligner(); const m = `${n} centre${n > 1 ? "s" : ""} aligné${n > 1 ? "s" : ""} sur ${ici?.nom ?? "ce centre"}.`; setAvisLigne(m); return m; }}>
            <p className="tir-rg-aide">Le changement est noté au journal de chaque centre.</p>
          </Formulaire>
        ) : avisLigne ? <p className="tir-rg-ok" role="status">C&apos;est fait. {avisLigne}</p> : null}
      </>
    );
  }

  if (section === "rappels") {
    const r = d.rappels;
    if (!r) return <Bloc><Rangee titre="Rappels aux patients" description="Visibles des profils titulaire, collaborateur et assistante." /></Bloc>;
    const mode = r.reglage?.mode ?? null;
    return (
      <>
        <Bloc aide={<>Deux jours avant chaque rendez-vous, Tiroma rappelle le patient qui l&apos;accepte. Il relance aussi un plan signé resté sans rendez-vous et un devis sans réponse. Un rappel dit qu&apos;on a rendez-vous chez le dentiste : c&apos;est une donnée de santé. Il ne part que par un prestataire agréé HDS ; d&apos;ici là, il est préparé puis retenu.{mode === "essai" ? " En essai, il ne part qu'à l'adresse d'essai, jamais au patient." : ""}</>}>
          <Rangee icone="Send" titre="Mode des rappels" description={r.reglage?.canaux?.length ? `Canaux : ${r.reglage.canaux.map((c) => (c === "email" ? "courriel" : c)).join(", ")}` : undefined} valeur={mode === "essai" ? "Essai" : mode === "reel" ? "En service" : mode === "coupe" ? "Coupés" : "Non réglés"} />
        </Bloc>
        <Bloc titre="Moyens de contact">
          {r.contacts.length
            ? r.contacts.map((c) => (
                <Rangee key={c.id} icone="Email" titre={c.patient_nom ?? "Patient"} description={`${c.adresse} · ${[c.rappels ? "rappels" : null, c.relances ? "relances" : null].filter(Boolean).join(" et ") || "aucun envoi"} · ${SOURCES[c.source]}, le ${complet(c.cree_le)}`}
                  enfant={peutEcrire ? (contactRetire === c.id ? (
                    <span className="tir-rg-confirme">
                      <button type="button" className="tir-rg-bouton" onClick={() => setContactRetire(null)}>Annuler</button>
                      <button type="button" className="tir-rg-bouton tir-rg-bouton--plein" onClick={() => { setContactRetire(null); void t.retirerContact(c).catch(() => undefined); }}>Retirer</button>
                    </span>
                  ) : <button type="button" className="tir-rg-bouton" onClick={() => setContactRetire(c.id)}>Retirer…</button>) : undefined} />
              ))
            : <Rangee titre="Aucun moyen de contact" description="Notez le courriel d'un patient, avec son accord, pour qu'il reçoive ses rappels." />}
        </Bloc>
        {peutEcrire ? (
          <Formulaire titre="Ajouter un moyen de contact" aide="Pas de SMS : aucun prestataire SMS n'est agréé pour les données de santé." bouton="Noter" pret={!!patient && /.+@.+\..+/.test(adresse.trim())}
            envoyer={async () => { if (!patient) return ""; await t.noterContact({ patient, canal: "email", adresse: adresse.trim(), rappels: rappelsC, relances, source, preuve: preuve.trim() || null }); const n = [patient.prenom, patient.nom].filter(Boolean).join(" "); setPatient(null); setAdresse(""); return `Le courriel de ${n} est noté, avec son accord.`; }}>
            <RechercheP choisi={patient} choisir={setPatient} />
            <Champ libelle="Courriel du patient"><input className="tir-rg-input" type="email" value={adresse} onChange={(e) => setAdresse(e.target.value)} /></Champ>
            <div className="tir-rg-cases">
              <label><input type="checkbox" checked={rappelsC} onChange={(e) => setRappelsC(e.target.checked)} /> Rappel deux jours avant le rendez-vous</label>
              <label><input type="checkbox" checked={relances} onChange={(e) => setRelances(e.target.checked)} /> Relance d&apos;un plan ou d&apos;un devis</label>
            </div>
            <Champ libelle="Son accord"><select className="tir-rg-input" value={source} onChange={(e) => setSource(e.target.value as ContactPatient["source"])}>{(Object.keys(SOURCES) as ContactPatient["source"][]).map((k) => <option key={k} value={k}>{SOURCES[k]}</option>)}</select></Champ>
            <Champ libelle="Preuve (facultatif)"><input className="tir-rg-input" value={preuve} maxLength={300} onChange={(e) => setPreuve(e.target.value)} placeholder="Fiche signée le…" /></Champ>
          </Formulaire>
        ) : null}
        <Bloc titre="Réponses reçues">
          {r.reponses.length ? r.reponses.map((x) => <Rangee key={x.id} icone="Comment" titre={`${x.patient_nom}${x.debut ? ` — rendez-vous ${complet(x.debut)}` : ""}`} description={x.reponse === "annule" ? "Libérez le créneau dans le logiciel du cabinet." : `Reçue le ${complet(x.recue_le)}`} valeur={REPONSES_RAPPEL[x.reponse]?.libelle ?? x.reponse} />) : <Rangee titre="Aucune réponse sur quinze jours" />}
        </Bloc>
        <Bloc titre="Derniers rappels">
          {r.envois.length ? r.envois.slice(0, 8).map((e) => <Rangee key={e.id} icone="Send" titre={`${e.patient_nom} · ${e.canal === "email" ? "Courriel" : e.canal}`} description={`${TYPES_RAPPEL[e.type as keyof typeof TYPES_RAPPEL] ?? e.type} · préparé le ${complet(e.cree_le)}${e.mode === "essai" ? " · essai" : ""}${e.verrou ? ` · ${VERROUS_ENVOI[e.verrou] ?? e.verrou}` : ""}`} valeur={STATUTS_ENVOI[e.statut] ?? e.statut} />) : <Rangee titre="Aucun rappel préparé" />}
        </Bloc>
      </>
    );
  }

  if (section === "donnees") {
    return (
      <Formulaire titre="Vos données" aide="Réservé au titulaire. Un fichier avec les fauteuils, les praticiens, l'équipe, les plans et la liste d'attente. Il contient des données de santé : gardez-le sur un poste du cabinet." bouton="Télécharger les données" pret={titulaire}
        envoyer={async () => {
          const donnees = await t.exporter();
          const blob = new Blob([JSON.stringify(donnees, null, 2)], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const lien = document.createElement("a");
          lien.href = url;
          lien.download = `tiroma-donnees-${new Date().toISOString().slice(0, 10)}.json`;
          lien.click();
          URL.revokeObjectURL(url);
          return "Fichier téléchargé. L'export est noté au journal du cabinet.";
        }}>
        <p className="tir-rg-aide">Format JSON, une table par clé.</p>
      </Formulaire>
    );
  }
  return null;
}

function Installer() {
  const t = useTiroma();
  const reel = t.reel;
  const i = t.installation;
  if (!reel?.compte) return null;
  if (reel.compte.role !== "gerant") {
    return <Bloc><Rangee icone="Lock" titre="Aucun cabinet installé" description="Un gérant de l'organisation installe le cabinet ; vous recevrez ensuite votre profil (titulaire, collaborateur, assistante ou direction)." /></Bloc>;
  }
  return (
    <Formulaire titre="Installer le cabinet" aide="Le cabinet se pose sur une entité de l'organisation ; son territoire fixe les jours ouvrés et son fuseau l'heure du point du matin. Le logiciel choisi décide des exports que Tiroma sait lire." bouton={`Installer ${libelleLogiciel(i.logiciel)}`} pret={!!i.entite && !i.enCours}
      envoyer={async () => { await i.installer(); return "Le cabinet est installé."; }}>
      <Champ libelle="Entité"><select className="tir-rg-input" value={i.entite} onChange={(e) => i.setEntite(e.target.value)}>{reel.compte.entites.map((en) => <option key={en.id} value={en.id}>{en.nom}{en.principale ? " (principale)" : ""}</option>)}</select></Champ>
      <Champ libelle="Logiciel de cabinet"><select className="tir-rg-input" value={i.logiciel} onChange={(e) => i.setLogiciel(e.target.value as Logiciel)}>{LOGICIELS.map((l) => <option key={l.cle} value={l.cle}>{l.libelle}</option>)}</select></Champ>
      <Champ libelle="Version du logiciel (facultatif)"><input className="tir-rg-input" value={i.version} maxLength={60} placeholder="2026.1" onChange={(e) => i.setVersion(e.target.value)} /></Champ>
      <Champ libelle="Qui voit les patients"><select className="tir-rg-input" value={i.perimetre} onChange={(e) => i.setPerimetre(e.target.value as "cabinet" | "praticien")}><option value="cabinet">Tout le cabinet</option><option value="praticien">Chaque praticien, les siens</option></select></Champ>
    </Formulaire>
  );
}

/* Accès et rôles · Journal des accès : lecture seule (./acces.ts) ; en exemple, des profils et un journal fictifs */
function useAcces(d: Dossier) {
  const t = useTiroma();
  const client = t.reel?.compte?.client_id ?? null;
  const [lu, setLu] = useState<{ profils: ProfilLu[]; journal: EntreeJournal[]; lisible: boolean; erreur: string | null } | null>(null);
  useEffect(() => {
    if (t.source !== "reelle" || !client) return;
    let actif = true;
    void Promise.all([lireProfils(client).catch((e: unknown) => ({ erreur: e instanceof Error ? e.message : "La base n'a pas répondu." })), lireJournalTiroma(client)]).then(([pr, jr]) => {
      if (!actif) return;
      setLu(Array.isArray(pr) ? { profils: pr, journal: jr.entrees, lisible: jr.lisible, erreur: null } : { profils: [], journal: jr.entrees, lisible: jr.lisible, erreur: pr.erreur });
    });
    return () => {
      actif = false;
    };
  }, [t.source, client]);
  if (t.source === "exemple") {
    const ex = exempleAcces(d.cabinet.entite_id, { praticiens: d.praticiens.map((p) => ({ id: p.id, nom: p.nom_affiche })), membres: d.membres.map((m) => ({ id: m.id, nom: m.prenom })) });
    return { ...ex, lisible: true, erreur: null, moi: ex.profils[0]?.user_id ?? null, gerant: true, charge: false };
  }
  return { profils: lu?.profils ?? [], journal: lu?.journal ?? [], lisible: lu?.lisible ?? false, erreur: lu?.erreur ?? null, moi: t.reel?.compte?.user_id ?? null, gerant: t.reel?.compte?.role === "gerant" || t.reel?.compte?.role === "admin", charge: !lu };
}

function AccesJournal({ section, d }: { section: "acces" | "journal"; d: Dossier }) {
  const t = useTiroma();
  const a = useAcces(d);
  const [cherche, setCherche] = useState("");
  const nomDe = (user_id: string | null, praticien_id?: string | null, membre_id?: string | null) => {
    if (user_id && user_id === a.moi && t.source === "reelle") return "Vous";
    const pr = praticien_id ? d.praticiens.find((x) => x.id === praticien_id)?.nom_affiche : null;
    const me = membre_id ? d.membres.find((x) => x.id === membre_id)?.prenom : null;
    const lie = a.profils.find((x) => x.user_id === user_id);
    const pr2 = lie?.praticien_id ? d.praticiens.find((x) => x.id === lie.praticien_id)?.nom_affiche : null;
    const me2 = lie?.membre_id ? d.membres.find((x) => x.id === lie.membre_id)?.prenom : null;
    return pr ?? me ?? pr2 ?? me2 ?? lie?.libelle ?? (user_id ? `Compte ${user_id.slice(0, 8)}` : "—");
  };
  const centre = (entite_id: string | null) => (entite_id ? (t.reel?.compte?.entites.find((e) => e.id === entite_id)?.nom ?? d.cabinet.entite_nom ?? "Centre") : "Organisation");
  if (a.charge) return <p className="tir-rg-aide">Lecture…</p>;

  if (section === "acces") {
    const parProfil = (Object.keys(PROFILS) as (keyof typeof PROFILS)[]).map((k) => ({ k, n: a.profils.filter((x) => x.profil === k).length }));
    return (
      <>
        {a.erreur ? <p className="tir-rg-erreur" role="alert">{a.erreur}</p> : null}
        <Bloc titre="Profils" aide={a.gerant ? "Chaque personne a un profil par centre ; il décide de ce qu'elle voit dans Tiroma." : "Vous voyez votre profil ; le gérant voit ceux de tout le cabinet."}>
          {a.profils.length
            ? a.profils.map((x) => (
                <Rangee key={x.id} icone={x.profil === "titulaire" ? "Creator" : x.profil === "direction" ? "Briefcase" : "Members"} titre={nomDe(x.user_id, x.praticien_id, x.membre_id)} description={`${centre(x.entite_id)} · ${roleEnClair(x.role_organisation)} de l'organisation · depuis le ${complet(x.cree_le)}`} valeur={PROFILS[x.profil].libelle} />
              ))
            : <Rangee titre="Aucun profil lisible" description="Sans profil Tiroma, une personne voit la liste d'attente en lecture seule." />}
        </Bloc>
        <Bloc titre="Droits par profil" aide="Les conditions sont celles de la base (RLS) et des portes : un profil ne reçoit que ce que la base lui donne.">
          {parProfil.map(({ k, n }) => <Rangee key={k} icone="Lock" titre={PROFILS[k].libelle} description={PROFILS[k].voit} valeur={`${n} personne${n > 1 ? "s" : ""}`} />)}
        </Bloc>
        <Bloc titre="Attribuer un profil">
          <Rangee icone="Lock" titre="Pas encore de geste dans l'espace" description="L'installation donne le profil titulaire au gérant ; les autres profils se posent avec Omega. Aucune porte d'attribution n'existe : rien n'est écrit d'ici." verrou="Avec Omega" />
        </Bloc>
      </>
    );
  }

  const filtres = a.journal.filter((e) => !cherche || `${actionEnClair(e)} ${e.acteur_libelle ?? ""} ${e.objet_type}`.toLowerCase().includes(cherche.toLowerCase()));
  return (
    <>
      {!a.lisible ? (
        <Bloc><Rangee icone="Lock" titre="Journal réservé" description="Le journal opposable est lisible des gérants et des administrateurs de l'organisation." verrou="Gérants et administrateurs" /></Bloc>
      ) : (
        <>
          <Bloc aide="Le journal opposable du socle : chaque entrée cite l'empreinte de la précédente et ne peut être ni modifiée ni effacée. Ici, ce qui touche Tiroma (300 dernières entrées).">
            <div className="tir-rg-rangee tir-rg-rangee--outils">
              <input className="tir-rg-input tir-rg-cherche" value={cherche} onChange={(e) => setCherche(e.target.value)} placeholder="Chercher une action, une personne…" aria-label="Chercher dans le journal" />
              <button type="button" className="tir-rg-bouton" disabled={!filtres.length} onClick={() => exporterCSV("tiroma-journal", ["n°", "survenu le", "acteur", "type d'acteur", "action", "action (code)", "objet", "objet_id", "centre"], filtres.map((e) => [e.id, e.survenu_le, e.acteur_libelle ?? nomDe(e.acteur_id), e.acteur_type, actionEnClair(e), e.action, e.objet_type, e.objet_id, centre(e.entite_id)]))}>Exporter en CSV</button>
            </div>
          </Bloc>
          <Bloc titre={`${filtres.length} entrée${filtres.length > 1 ? "s" : ""}`}>
            {filtres.length
              ? filtres.map((e) => (
                  <Rangee key={e.id} icone={e.acteur_type === "systeme" ? "Refresh" : "Creator"} titre={actionEnClair(e)} description={`${e.acteur_libelle ?? (e.acteur_type === "systeme" ? "Omega" : nomDe(e.acteur_id))} · ${e.objet_type}${e.objet_id ? ` ${e.objet_id.slice(0, 8)}` : ""} · ${centre(e.entite_id)}`} valeur={complet(e.survenu_le)} />
                ))
              : <Rangee titre="Aucune entrée" description={cherche ? "Rien ne correspond à cette recherche." : "Rien n'a encore été journalisé pour Tiroma."} />}
          </Bloc>
        </>
      )}
    </>
  );
}

const SECTIONS: Record<Section, { titre: string; sous: string }> = {
  general: { titre: "Général", sous: "Entité, logiciel, point du matin, mode et état" },
  equipe: { titre: "Praticiens et équipe", sous: "Les praticiens et les assistantes du cabinet" },
  fauteuils: { titre: "Fauteuils", sous: "Capacités et objectif d'occupation de chaque fauteuil" },
  horaires: { titre: "Horaires", sous: "Les plages d'ouverture hebdomadaires" },
  fermetures: { titre: "Fermetures et congés", sous: "Congés, fermetures, formations à venir" },
  vocabulaire: { titre: "Vocabulaire du logiciel", sous: "Les types de rendez-vous et leur famille de soin" },
  releves: { titre: "Relevés du logiciel", sous: "Les exports reçus et ce que le logiciel tient" },
  regles: { titre: "Règles du cabinet", sous: "Ordre d'appel, horizon, contrôles, vérifications" },
  communes: { titre: "Règles communes", sous: "Les mêmes règles dans tous vos centres" },
  rappels: { titre: "Rappels aux patients", sous: "Moyens de contact, réponses et derniers rappels" },
  donnees: { titre: "Vos données", sous: "Télécharger les données du cabinet" },
  installer: { titre: "Installer le cabinet", sous: "Le logiciel et l'entité du cabinet" },
  acces: { titre: "Accès et rôles", sous: "Qui a quel profil, et ce que chaque profil voit" },
  journal: { titre: "Journal des accès", sous: "Ce qui a été fait dans Tiroma, par qui et quand" },
};

export default function Reglages() {
  const t = useTiroma();
  const router = useRouter();
  const params = useSearchParams();
  const d = t.dossier;
  const section = (params.get("section") as Section | null) ?? null;
  const reel = t.reel;
  const sansCabinet = t.source === "reelle" && !!reel && !!reel.compte && !reel.cabinets.length;

  if (!d || sansCabinet || section) {
    const s = sansCabinet ? "installer" : section;
    return (
      <TirCarte className="tir-rg">
        <div className="tir-rg-defile">
          <div className="tir-rg-haut">
            <Link href={sansCabinet ? `${RACINE}/tiroma` : BASE} className="tir-rg-retour"><TirIcone nom="Chevron" taille={14} className="tir-rg-retour-chevron" />{sansCabinet ? "Cabinet" : "Le cabinet"}</Link>
          </div>
          <div className="tir-rg-colonne">
            <header className="tir-rg-entete">
              <h1 className="tir-rg-h1">{s ? SECTIONS[s].titre : "Réglages"}</h1>
              <div className="tir-rg-sous"><span>{s ? SECTIONS[s].sous : ""}</span></div>
            </header>
            <div className="tir-rg-blocs">
              {t.erreur ? <p className="tir-rg-erreur" role="alert">La base réelle n&apos;a pas répondu. {t.erreur}</p> : null}
              {sansCabinet ? <Installer /> : !d ? <p className="tir-rg-aide">{t.source === "reelle" && reel && !reel.compte ? "Cette session n'est rattachée à aucune organisation." : "Lecture du cabinet…"}</p> : s ? <SousPage section={s} d={d} /> : null}
            </div>
          </div>
        </div>
      </TirCarte>
    );
  }

  const titulaire = d.profil === "titulaire";
  const s = STATUTS_CABINET[d.cabinet.statut];
  const aClasser = d.types.filter((x) => x.statut !== "valide").length;
  const horaires = d.horaires.filter((h) => !h.exceptionnel).length;
  const verrou = (ok: boolean) => (ok ? undefined : "Réservé au titulaire");
  return (
    <TirCarte className="tir-rg">
      <div className="tir-rg-defile">
        <div className="tir-rg-haut">
          <Link href={`${RACINE}/tiroma`} className="tir-rg-retour"><TirIcone nom="Chevron" taille={14} className="tir-rg-retour-chevron" />Cabinet</Link>
        </div>
        <div className="tir-rg-colonne">
          <header className="tir-rg-entete">
            <h1 className="tir-rg-h1">{d.cabinet.entite_nom ?? "Le cabinet"}</h1>
            <div className="tir-rg-sous">
              <span>{libelleLogiciel(d.cabinet.logiciel)} · {s?.libelle ?? d.cabinet.statut} · {d.cabinet.mode === "reel" ? "mode réel" : "à blanc"}</span>
              <Link href={`${RACINE}/tiroma`} className="tir-rg-apercu">Aujourd&apos;hui<TirIcone nom="Chevron" taille={14} /></Link>
            </div>
          </header>
          {t.source === "reelle" && reel && reel.cabinets.length > 1 ? (
            <div className="tir-rg-choix">
              <select className="tir-rg-input" aria-label="Cabinet" value={reel.dossier?.cabinet.id ?? ""} onChange={(e) => t.choisirCabinet(e.target.value)}>
                {reel.cabinets.map((k) => <option key={k.id} value={k.id}>{k.entite_nom}</option>)}
              </select>
            </div>
          ) : null}
          <div className="tir-rg-blocs">
            <Bloc>
              <Rangee icone="Roue" titre="Général" description="Entité, logiciel, point du matin, mode et état du cabinet" valeur={s?.libelle} href={`${BASE}?section=general`} />
              <Rangee icone="Members" titre="Praticiens et équipe" description="Les praticiens et les assistantes du cabinet" valeur={`${d.praticiens.length} praticien${d.praticiens.length > 1 ? "s" : ""}`} href={`${BASE}?section=equipe`} />
              <Rangee icone="Box" titre="Fauteuils" description="Capacités et objectif d'occupation" valeur={`${d.fauteuils.length} fauteuil${d.fauteuils.length > 1 ? "s" : ""}`} href={`${BASE}?section=fauteuils`} />
            </Bloc>
            <Bloc titre="Agenda et logiciel">
              <Rangee icone="Clock" titre="Horaires" description="Les plages d'ouverture hebdomadaires" valeur={horaires ? `${horaires} plages` : "Aucun"} href={`${BASE}?section=horaires`} />
              <Rangee icone="CrossedOutCalendar" titre="Fermetures et congés" description="Congés, fermetures, formations à venir" valeur={d.fermetures.length ? String(d.fermetures.length) : "Aucune"} href={`${BASE}?section=fermetures`} />
              <Rangee icone="Label" titre="Vocabulaire du logiciel" description="Les types de rendez-vous et leur famille de soin" valeur={aClasser ? `${aClasser} à confirmer` : "À jour"} href={`${BASE}?section=vocabulaire`} />
              <Rangee icone="Refresh" titre="Relevés du logiciel" description="Les exports reçus et ce que le logiciel tient" valeur={d.cabinet.releves_douteux_suite ? `${d.cabinet.releves_douteux_suite} douteux` : d.releves.length ? "À jour" : "Aucun"} href={`${BASE}?section=releves`} />
            </Bloc>
            <Bloc titre="Règles">
              <Rangee icone="Policy" titre="Règles du cabinet" description="Ordre d'appel, horizon, contrôles, vérifications" valeur={d.regles ? `${d.regles.nb_propositions} propositions` : "Non lues"} href={`${BASE}?section=regles`} />
              <Rangee icone="Checklist" titre="Règles communes" description="Les mêmes règles dans tous vos centres" valeur={d.reglesCommunes && d.reglesCommunes.centres.length > 1 ? (d.reglesCommunes.ecarts.length ? `${d.reglesCommunes.ecarts.length} écarts` : "Identiques") : undefined} href={titulaire && (d.reglesCommunes?.centres.length ?? 0) > 1 ? `${BASE}?section=communes` : undefined} verrou={titulaire ? ((d.reglesCommunes?.centres.length ?? 0) > 1 ? undefined : "Dès deux centres") : verrou(false)} />
            </Bloc>
            <Bloc titre="Patients">
              <Rangee icone="Send" titre="Rappels aux patients" description="Moyens de contact, réponses et derniers rappels" valeur={d.rappels ? (d.rappels.reglage?.mode === "essai" ? "Essai" : d.rappels.reglage?.mode === "reel" ? "En service" : d.rappels.reglage?.mode === "coupe" ? "Coupés" : "Non réglés") : undefined} href={d.rappels ? `${BASE}?section=rappels` : undefined} verrou={d.rappels ? undefined : "Profils du cabinet"} />
              <Rangee icone="Email" titre="Moyens de contact" description="Les courriels notés avec l'accord des patients" valeur={d.rappels ? `${d.rappels.contacts.length} patient${d.rappels.contacts.length > 1 ? "s" : ""}` : undefined} href={d.rappels ? `${BASE}?section=rappels` : undefined} verrou={d.rappels ? undefined : "Profils du cabinet"} />
            </Bloc>
            <Bloc titre="Accès">
              <Rangee icone="Users" titre="Accès et rôles" description="Qui a quel profil, et ce que chaque profil voit" href={`${BASE}?section=acces`} />
              <Rangee icone="Policy" titre="Journal des accès" description="Ce qui a été fait dans Tiroma, par qui et quand" href={`${BASE}?section=journal`} />
            </Bloc>
            <Bloc titre="Données" aide={<>Tiroma lit l&apos;agenda, les plans et les devis du logiciel du cabinet, sans y écrire. <Link href={`${RACINE}/tiroma?ancien=1`} className="tir-rg-lien">Ancien écran</Link></>}>
              <Rangee icone="Spreadsheet" titre="Vos données" description="Télécharger les données du cabinet (fichier JSON)" href={titulaire ? `${BASE}?section=donnees` : undefined} verrou={verrou(titulaire)} />
            </Bloc>
            {titulaire && d.cabinet.statut !== "clos" ? (
              <Bloc titre="Zone sensible">
                <Danger titre={d.cabinet.mode === "reel" ? "Repasser à blanc" : "Passer en mode réel"} description="Mode des mesures du cabinet" bouton={d.cabinet.mode === "reel" ? "Repasser à blanc…" : "Passer en mode réel…"} onClick={() => router.push(`${BASE}?section=general`)} />
                <Danger titre={d.cabinet.statut === "coupe" ? "Réactiver le cabinet" : "Couper le cabinet"} description="Point du matin et mesures" bouton={d.cabinet.statut === "coupe" ? "Réactiver…" : "Couper…"} onClick={() => router.push(`${BASE}?section=general`)} />
              </Bloc>
            ) : null}
          </div>
        </div>
      </div>
    </TirCarte>
  );
}
