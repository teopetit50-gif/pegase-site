"use client";

/* ══════════════════════════════════════════════════════════════════════
   OFFLOAD — envoi automatique et données (c4_17 à c4_19, 19/10/2026,
   session C4)

   1. L'envoi automatique (c4_18, décision de Teo du 18/10) : allumé par
      défaut, il couvre les sujets choisis. Un message part sans
      validation quand l'accord permanent d'OFFLOAD est actif au socle :
      le gérant le donne ici, une autre personne l'active dans « À
      valider ». Un message douteux (compte à vérifier, adresse
      générique, historique trop court) ou d'un sujet non autorisé est
      retenu : une personne le lit dans « À valider ». Un message par
      compte et par trimestre, toujours.
   2. La restitution (c4_17) : toutes les données OFFLOAD de
      l'organisation, en un fichier JSON.
   3. Dans la fiche : l'effacement des données d'une personne (c4_19).
   Lectures : offload_envoi_auto ; écritures : offload_regler,
   offload_donner_accord_auto, offload_revoquer_accord_auto,
   offload_effacer_compte ; offload_restitution (en base réelle seulement).
   ══════════════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useState } from "react";
import { dateCourte, nombreFr } from "../format";
import type { Source } from "../source";
import { Avis, Chargement, Pastille, type Teinte } from "../ui";
import { chargerEnvoiAuto, donnerAccordAuto, effacerCompte, reglerEnvoiAuto, restituer, revoquerAccordAuto } from "./portes";
import type { Compte, EnvoiAuto as Etat, SujetAuto } from "./types";

const SUJETS: { code: SujetAuto; libelle: string }[] = [
  { code: "reprise", libelle: "Reprise d'un compte silencieux" },
  { code: "echeance", libelle: "Échéance qui revient" },
  { code: "affaire", libelle: "Commande en attente de retrait" },
];

const ACCORDS: Record<Etat["accord"], { libelle: string; teinte: Teinte }> = {
  actif: { libelle: "Accord actif", teinte: "vert" },
  a_valider: { libelle: "Accord à activer", teinte: "ambre" },
  absent: { libelle: "Pas d'accord", teinte: "gris" },
};

const EXEMPLE: Etat = {
  envoi_auto: true,
  sujets_auto: ["affaire", "echeance", "reprise"],
  accord: "actif",
  politiques: [{ id: "p1", statut: "active", nombre_mensuel: 620, debut: "2026-10-18", fin: "2027-10-18", donne_par: null, demande: null }],
  retenus_en_attente: 2,
};

export default function EnvoiAuto({ source, client }: { source: Source; client: string | null }) {
  const [reel, setReel] = useState<Etat | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [fait, setFait] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  const charger = useCallback(async () => {
    if (!client) return;
    try {
      setReel(await chargerEnvoiAuto(client));
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base n'a pas répondu.");
    }
  }, [client]);

  useEffect(() => {
    if (source !== "reelle") return;
    const t = window.setTimeout(() => void charger(), 0);
    return () => window.clearTimeout(t);
  }, [source, charger]);

  const etat = source === "exemple" ? EXEMPLE : reel;

  const agir = async (f: () => Promise<unknown>, apres: string) => {
    setErreur(null);
    setFait(null);
    if (source !== "reelle" || !client) {
      setFait("Exemple : rien n'est enregistré. En base réelle, le réglage est noté et c'est au journal.");
      return;
    }
    setEnvoi(true);
    try {
      await f();
      setFait(apres);
      await charger();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base a refusé.");
    } finally {
      setEnvoi(false);
    }
  };

  const telecharger = async () => {
    setErreur(null);
    if (source !== "reelle" || !client) {
      setFait("Exemple : en base réelle, le fichier contient toutes les données OFFLOAD de votre organisation.");
      return;
    }
    setEnvoi(true);
    try {
      const d = await restituer(client);
      const url = URL.createObjectURL(new Blob([JSON.stringify(d, null, 2)], { type: "application/json" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `offload-donnees-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setFait("Fichier préparé ; la restitution est au journal.");
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base a refusé.");
    } finally {
      setEnvoi(false);
    }
  };

  if (!etat) return source === "reelle" && !erreur ? <Chargement texte="Lecture de l'envoi automatique…" /> : null;
  const accord = ACCORDS[etat.accord];
  const actif = etat.politiques.find((p) => p.statut === "active");

  return (
    <section className="esp-carte" aria-label="Envoi automatique et données">
      <div className="esp-carte-tete">
        <h2 className="esp-carte-titre">Envoi automatique et données</h2>
        <span className="esp-kpi-sous">un message par compte et par trimestre ; au moindre doute, une personne le lit</span>
      </div>
      <div className="esp-carte-corps" style={{ display: "grid", gap: 10 }}>
        {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
        {fait ? <Avis teinte="vert" role="status">{fait}</Avis> : null}

        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "4px 8px" }}>
          <strong>{etat.envoi_auto ? "Envoi automatique allumé" : "Envoi automatique éteint"}</strong>
          <Pastille teinte={accord.teinte}>{accord.libelle}</Pastille>
          {etat.retenus_en_attente ? (
            <span className="esp-kpi-sous">{nombreFr(etat.retenus_en_attente)} message{etat.retenus_en_attente > 1 ? "s" : ""} retenu{etat.retenus_en_attente > 1 ? "s" : ""} dans « À valider »</span>
          ) : null}
        </div>
        <p className="esp-kpi-sous" style={{ margin: 0 }}>
          {!etat.envoi_auto ? "Chaque message attend la validation d'une personne."
            : etat.accord === "actif" ? `Les messages partent seuls jusqu'au ${dateCourte(actif?.fin ?? null)}${actif?.nombre_mensuel ? `, ${nombreFr(actif.nombre_mensuel)} au plus par mois` : ""}.`
            : etat.accord === "a_valider" ? "L'accord est donné : une autre personne qui décide l'active dans « À valider ». D'ici là, chaque message attend une validation."
            : "Tant que le gérant n'a pas donné l'accord, chaque message attend une validation."}
        </p>

        <fieldset style={{ border: 0, padding: 0, margin: 0, display: "grid", gap: 4 }} disabled={envoi || !etat.envoi_auto}>
          <legend className="esp-section-titre">Sujets envoyés sans validation</legend>
          {SUJETS.map((s) => (
            <label key={s.code} className="esp-coche">
              <input type="checkbox" checked={etat.sujets_auto.includes(s.code)}
                onChange={(e) => {
                  const sujets = e.target.checked ? [...etat.sujets_auto, s.code] : etat.sujets_auto.filter((x) => x !== s.code);
                  void agir(() => reglerEnvoiAuto(client ?? "", { sujets_auto: sujets }), "Sujets notés.");
                }} /> {s.libelle}
            </label>
          ))}
        </fieldset>

        <div className="esp-actions">
          {etat.envoi_auto && etat.accord === "absent" ? (
            <button type="button" className="r-btn r-btn--noir r-btn--petit" disabled={envoi}
              onClick={() => void agir(() => donnerAccordAuto(client ?? ""), "Accord donné : il attend son activation dans « À valider ».")}>
              Donner l&apos;accord (gérant)
            </button>
          ) : null}
          {etat.accord !== "absent" ? (
            <button type="button" className="r-btn r-btn--fil r-btn--petit" disabled={envoi}
              onClick={() => void agir(() => revoquerAccordAuto(client ?? "", null), "Accord révoqué : chaque message attend une validation.")}>
              Révoquer l&apos;accord
            </button>
          ) : null}
          <button type="button" className="r-btn r-btn--fil r-btn--petit" disabled={envoi}
            onClick={() => void agir(() => reglerEnvoiAuto(client ?? "", { envoi_auto: !etat.envoi_auto }),
              etat.envoi_auto ? "Envoi automatique éteint ; l'accord est révoqué." : "Envoi automatique rallumé ; donnez l'accord pour qu'il prenne effet.")}>
            {etat.envoi_auto ? "Éteindre l'envoi automatique" : "Rallumer l'envoi automatique"}
          </button>
        </div>

        <div className="esp-section-titre" style={{ marginTop: 4 }}>Vos données</div>
        <p className="esp-kpi-sous" style={{ margin: 0 }}>
          Toutes les données OFFLOAD de votre organisation (comptes, achats, reprises, parc, affaires, règles, arrêtés, journal), en un fichier.
        </p>
        <div className="esp-actions">
          <button type="button" className="r-btn r-btn--fil r-btn--petit" disabled={envoi} onClick={() => void telecharger()}>
            Télécharger les données (JSON)
          </button>
        </div>
      </div>
    </section>
  );
}

/** Dans la fiche : effacer les données d'une personne, à sa demande (gérant ou admin). */
export function Effacement({ compte, source, onFait }: { compte: Compte; source: Source; onFait?: () => void }) {
  const [ouvert, setOuvert] = useState(false);
  const [motif, setMotif] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [fait, setFait] = useState(false);
  if (source !== "reelle") return null;
  if (fait) return <Avis teinte="vert" role="status">Données de la personne effacées ; le compte sort du cycle. C&apos;est au journal.</Avis>;
  const effacer = async () => {
    setErreur(null);
    try {
      await effacerCompte(compte.id, motif.trim());
      setFait(true);
      onFait?.();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base a refusé.");
    }
  };
  return ouvert ? (
    <div className="esp-form">
      <p className="esp-kpi-sous" style={{ margin: 0 }}>
        Le nom, l&apos;interlocuteur, le courriel, le téléphone et la ville sont effacés ; l&apos;historique d&apos;achats reste, sans nom. Un import ne les réécrira pas.
      </p>
      <label className="rv-libelle">D&apos;où vient la demande <span className="esp-obligatoire">(obligatoire)</span>
        <input className="rv-champ" value={motif} onChange={(e) => setMotif(e.target.value)} placeholder="Courriel de la personne du 19/10." />
      </label>
      <div className="esp-actions">
        <button type="button" className="r-btn r-btn--noir r-btn--petit" disabled={!motif.trim()} onClick={() => void effacer()}>Effacer définitivement</button>
        <button type="button" className="r-btn r-btn--fil r-btn--petit" onClick={() => setOuvert(false)}>Annuler</button>
      </div>
      {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
    </div>
  ) : (
    <button type="button" className="esp-lien-bouton" onClick={() => setOuvert(true)}>Effacer les données de cette personne (à sa demande)</button>
  );
}
