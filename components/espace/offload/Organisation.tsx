"use client";

/* ══════════════════════════════════════════════════════════════════════
   OFFLOAD — les réglages de l'organisation (27/10/2026, session C4)

   Trois réglages du gérant, sous les garde-fous :
   1. le vocabulaire du métier (c4_43) : les relances parlent la langue du
      secteur ; réglé, ou déduit de l'organisation ;
   2. les prospects qui n'ont pas abouti (c4_44) : OFFLOAD les reprend à la
      cadence de la vague, toujours relus, jamais sans leur accord ;
   3. la sortie (c4_42, c4_45) : OFFLOAD s'arrête, rien ne reste en suspens
      et la saisie s'arrête ; tout est restitué en fichiers pour un tableur ;
      puis le gérant efface OFFLOAD, et OFFLOAD seulement, en confirmant le
      nom de l'organisation : ses autres modules continuent.
   Écritures : offload_regler_secteur, offload_regler_prospects,
   offload_sortie (gérant, administrateur), offload_effacer_module (gérant),
   en base réelle seulement.
   ══════════════════════════════════════════════════════════════════════ */

import { useEffect, useState } from "react";
import type { Source } from "../source";
import { Avis } from "../ui";
import { chargerVocabulaire, effacerModule, reglerProspects, reglerSecteur, sortir } from "./portes";
import { telechargerFichier } from "./tableur";
import type { Reglages, Secteur, Sortie, Vocabulaire } from "./types";

const SECTEURS: { cle: Secteur; libelle: string; dernier: string; question: string }[] = [
  { cle: "general", libelle: "Général", dernier: "votre dernière commande chez nous", question: "Avez-vous de nouveaux besoins pour lesquels nous pourrions vous être utiles ?" },
  { cle: "negoce", libelle: "Négoce, distribution", dernier: "votre dernière commande chez nous", question: "Avez-vous de nouveaux besoins d'approvisionnement ? Nous pouvons préparer vos références habituelles." },
  { cle: "apres_vente", libelle: "Après-vente, garage, atelier", dernier: "votre dernier passage à l'atelier", question: "Souhaitez-vous que nous prévoyions votre prochain entretien ou une révision ?" },
  { cle: "maintenance", libelle: "Maintenance, climatisation, chauffage", dernier: "notre dernière intervention chez vous", question: "Souhaitez-vous que nous planifiions la prochaine visite d'entretien de vos installations ?" },
  { cle: "batiment", libelle: "Bâtiment, travaux", dernier: "votre dernier chantier avec nous", question: "Avez-vous un nouveau projet de travaux pour lequel nous pourrions vous accompagner ?" },
  { cle: "conseil", libelle: "Conseil, cabinet, architecte", dernier: "notre dernière mission pour vous", question: "Avez-vous un nouveau sujet sur lequel nous pourrions vous accompagner ?" },
  { cle: "immobilier", libelle: "Immobilier, agence, syndic", dernier: "notre dernier dossier ensemble", question: "Avez-vous un nouveau projet immobilier, achat, vente ou location, pour lequel nous pourrions vous accompagner ?" },
];

function lignes(csv: string) {
  return Math.max(0, csv.split("\n").filter((l) => l.trim() !== "").length - 1);
}

function Section({ titre, texte, children }: { titre: string; texte: string; children: React.ReactNode }) {
  return (
    <section className="sb-reglages-section" aria-label={titre}>
      <header>
        <h2>{titre}</h2>
        <p>{texte}</p>
      </header>
      <div className="esp-carte"><div className="esp-carte-corps" style={{ display: "grid", gap: 10 }}>{children}</div></div>
    </section>
  );
}

export default function Organisation({ source, client, reglages }: { source: Source; client: string | null; reglages: Reglages | null }) {
  const reel = source === "reelle";
  const [vocab, setVocab] = useState<Vocabulaire | null>(null);
  const [choix, setChoix] = useState<Secteur | "">("");
  const [prospects, setProspects] = useState<boolean>(false);
  const [motif, setMotif] = useState("");
  const [compris, setCompris] = useState(false);
  const [sortie, setSortie] = useState<Sortie | null>(null);
  const [nomConfirme, setNomConfirme] = useState("");
  const [efface, setEfface] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [fait, setFait] = useState<string | null>(null);

  useEffect(() => {
    if (!reel || !client) return;
    let actif = true;
    chargerVocabulaire(client)
      .then((v) => {
        if (!actif || !v) return;
        setVocab(v);
        setChoix(v.regle ? v.secteur : "");
      })
      .catch(() => {});
    return () => {
      actif = false;
    };
  }, [reel, client]);

  useEffect(() => {
    if (reglages?.prospects_actifs === undefined) return;
    const t = window.setTimeout(() => setProspects(reglages.prospects_actifs === true), 0);
    return () => window.clearTimeout(t);
  }, [reglages]);

  const apercu = SECTEURS.find((s) => s.cle === (choix || vocab?.secteur || "general")) ?? SECTEURS[0];

  async function agir(f: () => Promise<unknown>, ok: string) {
    setErreur(null);
    setFait(null);
    setEnCours(true);
    try {
      await f();
      setFait(ok);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base a refusé.");
    } finally {
      setEnCours(false);
    }
  }

  return (
    <div className="sb-reglages v2-arrivee">
      <h1 className="sb-titre">Organisation</h1>
      {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
      {fait ? <Avis teinte="vert" role="status">{fait}</Avis> : null}

      <Section titre="Le vocabulaire de votre métier"
        texte="Les relances parlent la langue de votre secteur. Sans réglage, OFFLOAD le déduit de votre organisation ; à défaut, le texte reste général.">
        <label className="esp-kpi-sous" htmlFor="offload-secteur">Votre secteur</label>
        <select id="offload-secteur" className="rv-champ" value={choix} disabled={!reel || enCours}
          onChange={(e) => setChoix(e.target.value as Secteur | "")}>
          <option value="">Déduit de votre organisation{vocab && !vocab.regle ? ` (${SECTEURS.find((s) => s.cle === vocab.secteur)?.libelle ?? "général"})` : ""}</option>
          {SECTEURS.map((s) => <option key={s.cle} value={s.cle}>{s.libelle}</option>)}
        </select>
        <blockquote style={{ margin: 0, padding: "8px 12px", borderLeft: "3px solid var(--r-filet)" }} aria-label="Aperçu du message">
          <span className="esp-kpi-sous">Aperçu :</span> « Je reprends votre dossier : {apercu.dernier} date du 18 août, il y a deux mois. {apercu.question} »
        </blockquote>
        {reel ? (
          <div>
            <button type="button" className="r-btn r-btn--noir r-btn--petit" disabled={!client || enCours}
              onClick={() => client && void agir(async () => setVocab(await reglerSecteur(client, choix || null)), "Le vocabulaire est réglé : les prochaines relances le suivent.")}>
              Enregistrer le secteur
            </button>
          </div>
        ) : null}
      </Section>

      <Section titre="Les prospects qui n'ont pas abouti"
        texte="Les contacts sans achat dont le dernier échange est ancien sont repris un par un, à la cadence de votre vague et dans votre plafond quotidien. Le message reprend la date et la nature de l'échange, jamais vos notes. Une personne le relit toujours, et sans accord enregistré pour son adresse, c'est un appel qui est proposé.">
        <p className="esp-kpi-sous" style={{ margin: 0 }}>
          {prospects ? "Allumée : OFFLOAD reprend vos prospects chaque matin de vague." : "Éteinte (par défaut) : vos prospects restent présentés à part, sans message. Vous l'allumez quand vous le décidez."}
        </p>
        {reel ? (
          <div>
            <button type="button" className="r-btn r-btn--fil r-btn--petit" disabled={!client || enCours}
              onClick={() => client && void agir(async () => {
                const r = await reglerProspects(client, !prospects);
                setProspects(r.prospects_actifs);
              }, prospects ? "La reprise des prospects est éteinte." : "La reprise des prospects est allumée.")}>
              {prospects ? "Éteindre la reprise des prospects" : "Allumer la reprise des prospects"}
            </button>
          </div>
        ) : null}
      </Section>

      <Section titre="Arrêter OFFLOAD et récupérer vos données"
        texte="OFFLOAD s'arrête : plus aucune vague, plus aucun message, plus aucune saisie ; ce qui attendait une validation, les tâches et les affaires en cours sont fermés, avec une trace. Toutes vos données OFFLOAD vous sont restituées en fichiers pour un tableur, avec l'empreinte de l'export. Ensuite seulement, vous effacez OFFLOAD en confirmant le nom de votre organisation : vos autres modules continuent, intacts.">
        {sortie ? (
          <>
            <Avis teinte="vert" role="status">
              OFFLOAD est arrêté : {sortie.reprises_closes} reprise(s) close(s), {sortie.envois_annules} message(s) annulé(s), {sortie.taches_abandonnees ?? 0} tâche(s) et {sortie.affaires_closes ?? 0} affaire(s) fermée(s). Empreinte de l&apos;export : <code style={{ overflowWrap: "anywhere" }}>{sortie.empreinte_sha256}</code>
            </Avis>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 6 }}>
              {Object.entries(sortie.tableur.fichiers).sort(([a], [b]) => a.localeCompare(b)).map(([nom, csv]) => (
                <li key={nom} style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 8, border: "1px solid var(--r-filet)", borderRadius: 8, padding: "8px 12px" }}>
                  <span style={{ overflowWrap: "anywhere" }}><strong>{nom}</strong> <span className="esp-kpi-sous">— {lignes(csv)} ligne(s)</span></span>
                  <button type="button" className="esp-lien-bouton" onClick={() => telechargerFichier(nom, csv)}>Télécharger</button>
                </li>
              ))}
            </ul>
            <p className="esp-kpi-sous" style={{ margin: 0 }}>{sortie.effacement.phrase}</p>
            {efface ? (
              <Avis teinte="vert" role="status">OFFLOAD est effacé. Vos autres modules continuent ; le journal garde la trace des actes, sans les données de vos comptes.</Avis>
            ) : (
              <>
                <label className="esp-kpi-sous" htmlFor="offload-effacer-nom">Pour effacer OFFLOAD, saisissez le nom exact de votre organisation : « {sortie.effacement.confirmation} »</label>
                <input id="offload-effacer-nom" className="rv-champ" value={nomConfirme} onChange={(e) => setNomConfirme(e.target.value)} disabled={enCours} autoComplete="off" />
                <div>
                  <button type="button" className="r-btn r-btn--noir r-btn--petit" disabled={!client || enCours || nomConfirme !== sortie.effacement.confirmation}
                    onClick={() => client && void agir(async () => { await effacerModule(client, nomConfirme); setEfface(true); }, "OFFLOAD est effacé, et seulement OFFLOAD.")}>
                    Effacer OFFLOAD
                  </button>
                </div>
              </>
            )}
          </>
        ) : (
          <>
            <label className="esp-kpi-sous" htmlFor="offload-sortie-motif">Pourquoi arrêter ?</label>
            <input id="offload-sortie-motif" className="rv-champ" value={motif} onChange={(e) => setMotif(e.target.value)} disabled={!reel || enCours}
              placeholder="Fin de contrat au 31 octobre." />
            <label style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
              <input type="checkbox" checked={compris} onChange={(e) => setCompris(e.target.checked)} disabled={!reel || enCours} />
              <span className="esp-kpi-sous">J&apos;ai compris : OFFLOAD s&apos;arrête dès maintenant et plus aucun message ne part.</span>
            </label>
            <div>
              <button type="button" className="r-btn r-btn--noir r-btn--petit" disabled={!reel || !client || !compris || !motif.trim() || enCours}
                onClick={() => client && void agir(async () => setSortie(await sortir(client, motif.trim())), "OFFLOAD est arrêté et vos données sont prêtes.")}>
                Arrêter OFFLOAD et préparer mes données
              </button>
            </div>
            {!reel ? <p className="esp-kpi-sous" style={{ margin: 0 }}>Données d&apos;exemple : rien ne s&apos;arrête ici.</p> : null}
          </>
        )}
      </Section>
    </div>
  );
}
