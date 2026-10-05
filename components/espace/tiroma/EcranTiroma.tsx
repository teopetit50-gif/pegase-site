"use client";

/* ══════════════════════════════════════════════════════════════════════
   /espace/tiroma — le cabinet, lu en une page (05/10/2026, session B3)

   En haut, quatre compteurs qui mènent à leur carte : créneaux à sauver,
   plans sans rendez-vous, vérifications avant les rendez-vous, demi-journées
   vides (titulaire). Puis les cartes, et la carte « Le cabinet » (état,
   relevés, équipe, horaires, vocabulaire, règles).

   Deux sources, comme les écrans d'A3 : l'exemple (exemple.ts, un cabinet
   fictif, modifié en mémoire par les actions) ou la base réelle (portes.ts :
   le compte, ses cabinets, puis le dossier ; sans cabinet installé, le
   gérant l'installe ici par la porte tiroma_installer_cabinet).
   ══════════════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader } from "@/components/ui/loader";
import { useSource } from "../source";
import { useTempsReel } from "../tempsReel";
import { Avis, Chargement, Ruban, Vide } from "../ui";
import AvantRendezVous from "./AvantRendezVous";
import Cabinet, { type Action } from "./Cabinet";
import ChargeFauteuils from "./ChargeFauteuils";
import Creneaux from "./Creneaux";
import Plans, { type Mutuelle } from "./Plans";
import { DOSSIER_EXEMPLE } from "./exemple";
import { LOGICIELS, libelleLogiciel } from "./libelles";
import {
  ajouterFauteuil, ajouterFermeture, ajouterHoraire, ajouterPraticien, brancherCabinet, changerMode, changerStatut, chargerDossier,
  classerType, installerCabinet, listerCabinets, monCompte, noterMutuelle, retirerHoraire, type Compte,
} from "./portes";
import type { Cabinet as CabinetT, Dossier, Logiciel } from "./types";

type Reel = { compte: Compte | null; cabinets: CabinetT[]; dossier: Dossier | null; avis: string[] };

function appliquerExemple(d: Dossier, a: Action): Dossier {
  const id = () => `00000000-0000-4000-8000-${Date.now().toString(16).slice(-12).padStart(12, "0")}`;
  switch (a.type) {
    case "brancher":
      return { ...d, cabinet: { ...d.cabinet, statut: "actif" } };
    case "mode":
      return { ...d, cabinet: { ...d.cabinet, mode: a.mode, mode_depuis: new Date().toISOString() } };
    case "statut":
      return { ...d, cabinet: { ...d.cabinet, statut: a.statut } };
    case "fauteuil":
      return { ...d, fauteuils: [...d.fauteuils, { id: id(), entite_id: d.cabinet.entite_id, nom: a.nom, capacites: a.capacites, objectif_occupation: a.objectif, actif: true }] };
    case "horaire":
      return { ...d, horaires: [...d.horaires, { id: id(), entite_id: d.cabinet.entite_id, praticien_id: null, fauteuil_id: a.fauteuil_id, jour: a.jour, debut: `${a.debut}:00`, fin: `${a.fin}:00`, valide_du: null, valide_au: null, exceptionnel: false, source: "saisie" }] };
    case "retirer_horaire":
      return { ...d, horaires: d.horaires.filter((h) => h.id !== a.id) };
    case "fermeture":
      return { ...d, fermetures: [...d.fermetures, { id: id(), entite_id: d.cabinet.entite_id, praticien_id: a.praticien_id, fauteuil_id: a.fauteuil_id, debut: a.debut, fin: a.fin, nature: a.nature, source: "saisie" }] };
    case "praticien":
      return { ...d, praticiens: [...d.praticiens, { id: id(), entite_id: d.cabinet.entite_id, nom_affiche: a.nom_affiche, metier: a.metier, actif: true }] };
    case "classer":
      return { ...d, types: d.types.map((t) => (t.id === a.typeRdv.id ? { ...t, famille: a.famille, statut: a.statut, necessite_labo: a.necessite_labo, chirurgie: a.chirurgie, exige_assistante: a.exige_assistante, duree_defaut_min: a.duree_defaut_min, classe_par: "humain", confiance: null } : t)) };
  }
}

export default function EcranTiroma() {
  const { source } = useSource();
  const [local, setLocal] = useState<Dossier>(DOSSIER_EXEMPLE);
  const [reel, setReel] = useState<Reel | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [choix, setChoix] = useState<string | null>(null);

  /* installation (base réelle, sans cabinet) */
  const [entiteInst, setEntiteInst] = useState("");
  const [logicielInst, setLogicielInst] = useState<Logiciel>("logosw");
  const [perimetreInst, setPerimetreInst] = useState<"cabinet" | "praticien">("cabinet");
  const [versionInst, setVersionInst] = useState("");
  const [installe, setInstalle] = useState(false);

  const charger = useCallback(async (cabinetVoulu?: string | null) => {
    await Promise.resolve();
    setErreur(null);
    try {
      const compte = await monCompte();
      if (!compte) {
        setReel({ compte: null, cabinets: [], dossier: null, avis: [] });
        return;
      }
      const cabinets = await listerCabinets(compte);
      const k = cabinets.find((c) => c.id === (cabinetVoulu ?? choix)) ?? cabinets[0] ?? null;
      if (!k) {
        setReel({ compte, cabinets, dossier: null, avis: [] });
        setEntiteInst((e) => e || compte.entites[0]?.id || "");
        return;
      }
      setReel({ compte, cabinets, dossier: null, avis: [] });
      const { dossier, avis } = await chargerDossier(k, compte);
      setReel({ compte, cabinets, dossier, avis });
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base n'a pas répondu.");
      setReel((prev) => prev ?? { compte: null, cabinets: [], dossier: null, avis: [] });
    }
  }, [choix]);

  useEffect(() => {
    if (source !== "reelle") return;
    const t = window.setTimeout(() => void charger(), 0);
    return () => window.clearTimeout(t);
  }, [source, charger]);

  const relire = useCallback(async () => {
    try {
      await charger();
    } catch {
      /* la prochaine lecture à la main dira l'erreur */
    }
  }, [charger]);
  useTempsReel(["tiroma_cabinets", "tiroma_releves", "tiroma_evenements_agenda", "tiroma_rendez_vous", "tiroma_plans"], source === "reelle", relire);

  const dossier: Dossier | null = source === "exemple" ? local : (reel?.dossier ?? null);

  const agir = useCallback(async (a: Action) => {
    if (source === "exemple") {
      await new Promise((r) => setTimeout(r, 250));
      setLocal((prev) => appliquerExemple(prev, a));
      return;
    }
    const d = reel?.dossier;
    if (!d) throw new Error("Aucun cabinet ouvert.");
    switch (a.type) {
      case "brancher": await brancherCabinet(d.cabinet); break;
      case "mode": await changerMode(d.cabinet, a.mode); break;
      case "statut": await changerStatut(d.cabinet, a.statut); break;
      case "fauteuil": await ajouterFauteuil(d.cabinet, { nom: a.nom, capacites: a.capacites, objectif: a.objectif }); break;
      case "horaire": await ajouterHoraire(d.cabinet, { jour: a.jour, debut: a.debut, fin: a.fin, fauteuil_id: a.fauteuil_id, praticien_id: null }); break;
      case "retirer_horaire": await retirerHoraire(a.id); break;
      case "fermeture": await ajouterFermeture(d.cabinet, { debut: a.debut, fin: a.fin, nature: a.nature, fauteuil_id: a.fauteuil_id, praticien_id: a.praticien_id }); break;
      case "praticien": await ajouterPraticien(d.cabinet, { nom_affiche: a.nom_affiche, metier: a.metier }); break;
      case "classer": await classerType(a.typeRdv, { famille: a.famille, statut: a.statut, necessite_labo: a.necessite_labo, chirurgie: a.chirurgie, exige_assistante: a.exige_assistante, duree_defaut_min: a.duree_defaut_min }); break;
    }
    await charger(d.cabinet.id);
  }, [source, reel, charger]);

  /* b3_07 : la mutuelle, notée sur un plan ; en exemple, la ligne change en mémoire */
  const noter = useCallback(async (m: Mutuelle) => {
    if (source === "exemple") {
      await new Promise((r) => setTimeout(r, 250));
      setLocal((prev) => ({
        ...prev,
        plans: prev.plans.map((p) => (p.plan_id === m.plan.plan_id ? { ...p, mutuelle_statut: m.statut, mutuelle_reponse_le: m.statut === "accord" || m.statut === "refus" ? m.le : null, mutuelle_accord_sans_rdv: m.statut === "accord" } : p)),
      }));
      return;
    }
    await noterMutuelle(m.plan.plan_id, m.statut, m.le, m.motif);
    await charger(reel?.dossier?.cabinet.id);
  }, [source, reel, charger]);

  const installer = async () => {
    if (!reel?.compte || !entiteInst) return;
    setInstalle(true);
    setErreur(null);
    try {
      await installerCabinet({ client_id: reel.compte.client_id, entite_id: entiteInst, logiciel: logicielInst, perimetre: perimetreInst, version: versionInst.trim() || null, user_id: reel.compte.user_id });
      await charger();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "L'installation a échoué.");
    } finally {
      setInstalle(false);
    }
  };

  /* ——— compteurs ——— */
  const compteurs = useMemo(() => {
    const creneaux = dossier?.creneaux.filter((c) => c.libre).length ?? 0;
    const plans = dossier?.plans.length ?? 0;
    const critiques = dossier?.verifications.filter((v) => v.gravite === "critique").length ?? 0;
    const verifs = dossier?.verifications.filter((v) => v.gravite !== "info").length ?? 0;
    const vides = dossier?.charge?.demi_journees_vides ?? 0;
    return { creneaux, plans, critiques, verifs, vides };
  }, [dossier]);

  const aller = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  const titulaire = dossier?.profil === "titulaire";

  return (
    <>
      <div className="esp-tete" data-arrivee="">
        <div>
          <h1 className="esp-titre">Cabinet dentaire</h1>
          <p className="esp-sous">
            Tiroma lit l&apos;agenda, les plans et les devis du logiciel du cabinet, sans y écrire. Chaque créneau libéré arrive avec les patients qui peuvent le reprendre, les plans signés sans rendez-vous remontent, et deux jours avant chaque pose le retour du laboratoire est vérifié.
          </p>
        </div>
        <div className="esp-item-haut">
          {source === "reelle" && reel && reel.cabinets.length > 1 ? (
            <select className="rv-champ" aria-label="Cabinet" value={reel.dossier?.cabinet.id ?? ""} onChange={(e) => { setChoix(e.target.value); void charger(e.target.value); }}>
              {reel.cabinets.map((k) => <option key={k.id} value={k.id}>{k.entite_nom}</option>)}
            </select>
          ) : null}
          <Ruban source={source} />
        </div>
      </div>

      {dossier ? (
        <div className="esp-kpis" data-arrivee="">
          <button type="button" className="esp-kpi" data-teinte={compteurs.creneaux ? "ambre" : undefined} onClick={() => aller("tiroma-creneaux")}>
            <span className="esp-kpi-etiquette">Créneaux à sauver</span>
            <span className="esp-kpi-valeur">{compteurs.creneaux}</span>
            <span className="esp-kpi-sous">libérés, encore libres</span>
          </button>
          <button type="button" className="esp-kpi" data-teinte={compteurs.plans ? "bleu" : undefined} onClick={() => aller("tiroma-plans")}>
            <span className="esp-kpi-etiquette">Plans sans rendez-vous</span>
            <span className="esp-kpi-valeur">{compteurs.plans}</span>
            <span className="esp-kpi-sous">devis signés, séance à poser</span>
          </button>
          <button type="button" className="esp-kpi" data-teinte={compteurs.critiques ? "rouge" : compteurs.verifs ? "ambre" : undefined} onClick={() => aller("tiroma-avant")}>
            <span className="esp-kpi-etiquette">Avant les rendez-vous</span>
            <span className="esp-kpi-valeur">{compteurs.verifs}</span>
            <span className="esp-kpi-sous">{compteurs.critiques ? `${compteurs.critiques} critique${compteurs.critiques > 1 ? "s" : ""}` : "à vérifier à J-2"}</span>
          </button>
          <button type="button" className="esp-kpi" data-teinte={compteurs.vides ? "ambre" : undefined} onClick={() => aller("tiroma-charge")}>
            <span className="esp-kpi-etiquette">Demi-journées vides</span>
            <span className="esp-kpi-valeur">{titulaire ? compteurs.vides : "—"}</span>
            <span className="esp-kpi-sous">{titulaire ? "aujourd'hui, par fauteuil" : "réservé au titulaire"}</span>
          </button>
        </div>
      ) : null}

      {erreur ? <div style={{ marginBottom: 14 }}><Avis teinte="rouge" role="alert"><strong>La base réelle n&apos;a pas répondu.</strong> {erreur}</Avis></div> : null}
      {reel?.avis.length ? <div style={{ marginBottom: 14 }}><Avis teinte="ambre"><strong>Lecture partielle.</strong> {reel.avis.join(" · ")}</Avis></div> : null}

      {source === "reelle" && !reel ? (
        <div className="esp-carte"><Chargement texte="Lecture de votre cabinet…" /></div>
      ) : source === "reelle" && reel && !reel.compte ? (
        <div className="esp-carte"><Vide titre="Aucun compte rattaché">Cette session n&apos;est rattachée à aucune organisation.</Vide></div>
      ) : source === "reelle" && reel && !reel.cabinets.length ? (
        <section className="esp-carte" aria-label="Installer le cabinet">
          <div className="esp-carte-tete"><h2 className="esp-carte-titre">Installer le cabinet</h2></div>
          <div className="esp-carte-corps">
            {reel.compte?.role !== "gerant" ? (
              <Vide titre="Aucun cabinet installé">Un gérant de l&apos;organisation installe le cabinet ; vous recevrez ensuite votre profil (titulaire, collaborateur, assistante ou direction).</Vide>
            ) : (
              <div className="esp-form" style={{ maxWidth: 520 }}>
                <p className="esp-fil-meta">Le cabinet se pose sur une entité de l&apos;organisation ; son territoire fixe les jours ouvrés et son fuseau l&apos;heure du point du matin. Le logiciel choisi décide des exports que Tiroma sait lire.</p>
                <label className="rv-libelle">Entité
                  <select className="rv-champ" value={entiteInst} onChange={(e) => setEntiteInst(e.target.value)}>
                    {reel.compte.entites.map((en) => <option key={en.id} value={en.id}>{en.nom}{en.principale ? " (principale)" : ""}</option>)}
                  </select>
                </label>
                <label className="rv-libelle">Logiciel de cabinet
                  <select className="rv-champ" value={logicielInst} onChange={(e) => setLogicielInst(e.target.value as Logiciel)}>
                    {LOGICIELS.map((l) => <option key={l.cle} value={l.cle}>{l.libelle}</option>)}
                  </select>
                </label>
                <label className="rv-libelle">Version du logiciel (facultatif)
                  <input className="rv-champ" value={versionInst} onChange={(e) => setVersionInst(e.target.value)} maxLength={60} placeholder="2026.1" />
                </label>
                <label className="rv-libelle">Qui voit les patients
                  <select className="rv-champ" value={perimetreInst} onChange={(e) => setPerimetreInst(e.target.value as "cabinet" | "praticien")}>
                    <option value="cabinet">Tout le cabinet</option>
                    <option value="praticien">Chaque praticien, les siens</option>
                  </select>
                </label>
                <div className="esp-actions">
                  <button type="button" className="r-btn r-btn--noir" disabled={installe || !entiteInst} onClick={installer}>{installe ? <Loader variant="spin" /> : null} Installer {libelleLogiciel(logicielInst)}</button>
                </div>
              </div>
            )}
          </div>
        </section>
      ) : !dossier ? (
        <div className="esp-carte"><Chargement texte="Lecture du cabinet…" /></div>
      ) : (
        <div style={{ display: "grid", gap: 14 }}>
          <div className="esp-grille">
            <Creneaux creneaux={dossier.creneaux} horizon={dossier.regles?.horizon_creneaux_jours ?? 2} />
            <Plans plans={dossier.plans} noterMutuelle={noter} />
          </div>
          <div className="esp-grille">
            <AvantRendezVous verifications={dossier.verifications} jours={dossier.regles?.labo_verif_jours ?? 2} />
            <ChargeFauteuils charge={dossier.charge} titulaire={titulaire} />
          </div>
          <Cabinet dossier={dossier} agir={agir} />
        </div>
      )}
    </>
  );
}
