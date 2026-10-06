"use client";

/* ══════════════════════════════════════════════════════════════════════
   /espace/offload — les clients qui décrochent (06/10/2026, session C4)

   En haut, quatre compteurs qui filtrent : à joindre avant la clôture,
   clients à risque (s'est tu, décroche, saison manquée, ralentit),
   messages de reprise à valider, appels à passer. À gauche, la liste des
   comptes à risque, par priorité (valeur attendue × score), chacun avec la
   première raison de son signal en clair ; en dessous, les messages qui
   attendent une validation. À droite, la fiche du compte ouvert
   (FicheCompte) : raisons, rythme, courbe, reprises, tâches, pièces.

   Deux sources : l'exemple (exemples.ts, modifié en mémoire par les
   gestes pour que l'enchaînement se voie) ou la base réelle (portes.ts :
   offload_tableau() d'abord, offload_fiche() à l'ouverture d'un compte).
   ══════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Loader } from "@/components/ui/loader";
import { useSource } from "../source";
import { useTempsReel } from "../tempsReel";
import { Avis, Chargement, Pastille, Ruban, Vide } from "../ui";
import { dateCourte, montant } from "../format";
import { A_RISQUE, NIVEAUX, STATUTS_REPRISE } from "./etats";
import { exempleOffload } from "./exemples";
import FicheCompte, { type Geste } from "./FicheCompte";
import { chargerFiche, chargerTableau, noterTache, ouvrirReprise, recalculer, saisirAchat } from "./portes";
import type { Compte, Fiche, Tableau } from "./types";

type Filtre = "cloture" | "risque" | "a_valider" | "appels" | "tous";

const KPIS: { cle: Exclude<Filtre, "tous">; libelle: string; sous: string; teinte: "rouge" | "ambre" | "bleu" }[] = [
  { cle: "cloture", libelle: "Avant la clôture", sous: "à joindre ce mois-ci", teinte: "rouge" },
  { cle: "risque", libelle: "Clients à risque", sous: "se sont tus, décrochent, ralentissent", teinte: "ambre" },
  { cle: "a_valider", libelle: "Messages à valider", sous: "rien ne part sans vous", teinte: "ambre" },
  { cle: "appels", libelle: "Appels à passer", sous: "tâches des commerciaux", teinte: "bleu" },
];

export default function EcranOffload() {
  const { source } = useSource();
  const [exemple, setExemple] = useState(() => exempleOffload());
  const [reel, setReel] = useState<{ tableau: Tableau | null; fiches: Record<string, Fiche> } | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [filtre, setFiltre] = useState<Filtre>("risque");
  const [choix, setChoix] = useState<string | null>(null);
  const [chargeFiche, setChargeFiche] = useState(false);
  const [recalcul, setRecalcul] = useState(false);

  const charger = useCallback(async () => {
    await Promise.resolve();
    setErreur(null);
    setReel(null);
    try {
      setReel({ tableau: await chargerTableau(), fiches: {} });
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base n'a pas répondu.");
      setReel({ tableau: null, fiches: {} });
    }
  }, []);

  useEffect(() => {
    if (source !== "reelle") return;
    const t = window.setTimeout(() => void charger(), 0);
    return () => window.clearTimeout(t);
  }, [source, charger]);

  const relire = useCallback(async () => {
    try {
      const tableau = await chargerTableau();
      setReel({ tableau, fiches: {} });
    } catch {
      /* la prochaine lecture à la main dira l'erreur */
    }
  }, []);
  useTempsReel(["offload_signaux", "offload_reprises", "offload_taches", "offload_achats"], source === "reelle", relire);

  const tableau: Tableau | null = source === "exemple" ? exemple.tableau : (reel?.tableau ?? null);
  const comptes = useMemo(() => tableau?.comptes ?? [], [tableau]);
  const visibles: Compte[] = useMemo(() => {
    const appels = new Set((tableau?.taches ?? []).filter((t) => t.type === "appel").map((t) => t.compte_id));
    const aValider = new Set((tableau?.a_valider ?? []).map((v) => v.compte_id));
    return comptes.filter((c) => {
      if (filtre === "tous") return true;
      if (filtre === "cloture") return !!c.signal?.avant_cloture;
      if (filtre === "risque") return !!c.signal && A_RISQUE.includes(c.signal.niveau) && c.statut === "suivi";
      if (filtre === "a_valider") return aValider.has(c.id);
      return appels.has(c.id);
    });
  }, [comptes, filtre, tableau]);

  const compteurs = tableau?.compteurs;
  const valeurKpi = (k: Exclude<Filtre, "tous">) =>
    !compteurs ? 0
      : k === "cloture" ? compteurs.avant_cloture
        : k === "risque" ? compteurs.eteint + compteurs.decroche + compteurs.saison + compteurs.ralentit
          : k === "a_valider" ? compteurs.a_valider : compteurs.appels;

  const choisi = choix && comptes.some((c) => c.id === choix) ? choix : (visibles[0]?.id ?? null);
  const fiche: Fiche | null = choisi ? (source === "exemple" ? exemple.fiches[choisi] ?? null : reel?.fiches[choisi] ?? null) : null;

  useEffect(() => {
    if (source !== "reelle" || !choisi || !reel || reel.fiches[choisi]) return;
    let actif = true;
    const t = window.setTimeout(async () => {
      setChargeFiche(true);
      try {
        const f = await chargerFiche(choisi);
        if (actif && f) setReel((prev) => (prev ? { ...prev, fiches: { ...prev.fiches, [choisi]: f } } : prev));
        if (actif && !f) setErreur("Ce compte n'est pas visible avec ce compte utilisateur.");
      } catch (e) {
        if (actif) setErreur(e instanceof Error ? e.message : "La fiche n'a pas pu être lue.");
      } finally {
        if (actif) setChargeFiche(false);
      }
    }, 0);
    return () => {
      actif = false;
      window.clearTimeout(t);
    };
  }, [source, choisi, reel]);

  /* Les gestes de la fiche : en base par les portes, sinon dans l'exemple en mémoire. */
  const agir = useCallback(async (g: Geste): Promise<string> => {
    if (source === "reelle") {
      if (g.type === "reprise") await ouvrirReprise(g.compte);
      else if (g.type === "tache") await noterTache(g.tache, g.statut, g.compteRendu);
      else await saisirAchat(g.compte, g.date, g.montant, g.reference, g.libelle, g.nature);
      const compte = g.type === "tache" ? reel?.tableau?.taches.find((t) => t.id === g.tache)?.compte_id ?? choisi : g.compte;
      const [tb, f] = await Promise.all([chargerTableau(), compte ? chargerFiche(compte) : Promise.resolve(null)]);
      setReel({ tableau: tb, fiches: f && compte ? { [compte]: f } : {} });
    } else {
      setExemple((prev) => {
        const suivant = structuredClone(prev);
        const t = suivant.tableau;
        if (g.type === "reprise") {
          const f = suivant.fiches[g.compte];
          const r = { id: crypto.randomUUID(), compte_id: g.compte, statut: "a_valider" as const, issue: null, motif: null, ouverte_par: "manuel" as const, envoye1_le: null, envoye2_le: null, repondu_le: null, close_le: null, cree_le: new Date().toISOString(), envoi1: { statut: "a_valider", mode: "essai", verrou: null, sujet: null }, envoi2: null };
          f.reprises.unshift(r);
          const c = t.comptes.find((x) => x.id === g.compte);
          if (c) c.reprise = r;
          t.a_valider.push({ reprise: r.id, compte_id: g.compte, compte_nom: f.compte.nom, statut: "a_valider", rang: 1, envoi: null, demande: null, mode: "essai", destinataire: f.compte.email, sujet: `Reprise de contact — ${f.compte.nom}`, corps: "Message rédigé à partir de la dernière commande du compte (exemple).", cree_le: r.cree_le });
          t.compteurs.a_valider = t.a_valider.length;
        } else if (g.type === "tache") {
          t.taches = t.taches.filter((x) => x.id !== g.tache);
          t.compteurs.appels = t.taches.filter((x) => x.type === "appel").length;
          for (const f of Object.values(suivant.fiches)) {
            const x = f.taches.find((y) => y.id === g.tache);
            if (x) Object.assign(x, { statut: g.statut, compte_rendu: g.compteRendu, faite_le: new Date().toISOString() });
          }
        } else {
          const f = suivant.fiches[g.compte];
          f.achats.unshift({ id: crypto.randomUUID(), compte_id: g.compte, date_achat: g.date, montant_ht: g.nature === "avoir" ? -Math.abs(g.montant) : g.montant, reference: g.reference, libelle: g.libelle, nature: g.nature as "facture", source: "saisie", annule_le: null, annule_motif: null });
          f.nb_achats += 1;
          const m = f.mois.find((x) => x.mois === g.date.slice(0, 7));
          if (m) { m.montant += g.nature === "avoir" ? -Math.abs(g.montant) : g.montant; m.pieces += 1; }
        }
        return suivant;
      });
    }
    return g.type === "reprise" ? "La reprise est préparée : le message attend votre validation dans « À valider », et l'appel est posé."
      : g.type === "tache" ? "C'est noté." : "La pièce est ajoutée ; la détection en tiendra compte à son prochain calcul.";
  }, [source, reel, choisi]);

  const lancerRecalcul = async () => {
    if (source !== "reelle" || !tableau?.client) return;
    setRecalcul(true);
    try {
      await recalculer(tableau.client);
      await relire();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Le calcul a échoué.");
    } finally {
      setRecalcul(false);
    }
  };

  const reglages = tableau?.reglages;

  return (
    <>
      <div className="esp-tete" data-arrivee="">
        <div>
          <h1 className="esp-titre">Clients qui décrochent</h1>
          <p className="esp-sous">
            OFFLOAD relit l&apos;historique de vos ventes chaque nuit, mesure le rythme de chaque client et vous montre celui qui
            s&apos;éteint avant la clôture, avec ses raisons en clair. Chaque message de reprise attend votre validation.
          </p>
        </div>
        <div className="esp-item-haut">
          {source === "reelle" ? (
            <button type="button" className="r-btn r-btn--fil r-btn--petit" onClick={lancerRecalcul} disabled={recalcul || !tableau?.client}>
              {recalcul ? <Loader variant="spin" /> : <RefreshCw width={14} height={14} aria-hidden="true" />} Recalculer
            </button>
          ) : null}
          {reglages ? <Pastille teinte={reglages.mode === "essai" ? "ambre" : "vert"} contour>{reglages.mode === "essai" ? "Mode essai" : "Mode réel"}</Pastille> : null}
          <Ruban source={source} />
        </div>
      </div>

      {erreur ? (
        <div style={{ marginBottom: 14 }}>
          <Avis teinte="rouge" role="alert"><strong>La base réelle n&apos;a pas répondu.</strong> {erreur}</Avis>
        </div>
      ) : null}
      {source === "reelle" && reel && !reel.tableau?.reglages && !erreur ? (
        <div style={{ marginBottom: 14 }}>
          <Avis teinte="bleu">OFFLOAD n&apos;est pas encore installé pour votre organisation : Omega l&apos;installe en mode essai, puis vos exports de ventes alimentent l&apos;historique.</Avis>
        </div>
      ) : null}

      <div className="esp-kpis" data-arrivee="">
        {KPIS.map((k) => (
          <button key={k.cle} type="button" className="esp-kpi" data-teinte={valeurKpi(k.cle) ? k.teinte : undefined} aria-pressed={filtre === k.cle}
            onClick={() => setFiltre(filtre === k.cle ? "tous" : k.cle)}>
            <span className="esp-kpi-etiquette">{k.libelle}</span>
            <span className="esp-kpi-valeur">{valeurKpi(k.cle)}</span>
            <span className="esp-kpi-sous">{k.sous}</span>
          </button>
        ))}
      </div>

      <div className="esp-grille esp-grille--large">
        <div style={{ display: "grid", gap: 16, alignContent: "start", minWidth: 0 }}>
          <section className="esp-carte" aria-label="Comptes">
            <div className="esp-carte-tete">
              <h2 className="esp-carte-titre">{filtre === "tous" ? "Tous les comptes" : KPIS.find((k) => k.cle === filtre)?.libelle}</h2>
              <button type="button" className="esp-lien-bouton" onClick={() => setFiltre(filtre === "tous" ? "risque" : "tous")}>
                {filtre === "tous" ? "Voir les comptes à risque" : `Tous les comptes (${compteurs?.comptes ?? 0})`}
              </button>
            </div>
            {source === "reelle" && !reel ? (
              <Chargement texte="Lecture des comptes…" />
            ) : visibles.length === 0 ? (
              <Vide titre={filtre === "risque" ? "Aucun client à risque" : "Rien ici"}>
                {comptes.length === 0 ? "L'historique est vide : importez l'export de votre logiciel de ventes (code client, date, montant HT)." : "Aucun compte dans ce filtre."}
              </Vide>
            ) : (
              <ul className="esp-liste" aria-label="Comptes">
                {visibles.map((c) => {
                  const n = c.signal ? NIVEAUX[c.signal.niveau] : null;
                  const r = c.reprise;
                  const raison = c.signal?.raisons.find((x) => x.code !== "avant_cloture") ?? c.signal?.raisons[0];
                  return (
                    <li key={c.id}>
                      <button type="button" aria-current={choisi === c.id ? "true" : undefined} className="esp-item"
                        onClick={() => {
                          setChoix(c.id);
                          if (window.innerWidth < 1024) document.getElementById("esp-dossier")?.scrollIntoView({ behavior: "smooth", block: "start" });
                        }}>
                        <span className="esp-item-haut">
                          <span style={{ fontWeight: 600 }}>{c.nom}</span>
                          {n ? <Pastille teinte={n.teinte}>{n.libelle}</Pastille> : null}
                          {c.signal?.avant_cloture ? <Pastille teinte="rouge" contour>Avant la clôture</Pastille> : null}
                          {r && r.statut !== "close" ? <Pastille teinte={STATUTS_REPRISE[r.statut].teinte} contour>{STATUTS_REPRISE[r.statut].libelle}</Pastille> : null}
                        </span>
                        <span className="esp-item-montant">{c.signal?.priorite ? montant(c.signal.priorite) : ""}</span>
                        <span className="esp-item-titre">{raison?.phrase ?? "—"}</span>
                        <span className="esp-item-bas">
                          <span>{c.signal ? `Score ${c.signal.score}` : "Pas encore évalué"}{c.signal?.dernier_achat ? ` · dernier achat le ${dateCourte(c.signal.dernier_achat)}` : ""}</span>
                          <span>{c.commercial ? `Suivi par ${c.commercial}` : "Sans commercial"}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="esp-carte" aria-label="Messages de reprise à valider">
            <div className="esp-carte-tete">
              <h2 className="esp-carte-titre">Messages à valider</h2>
              <Link className="esp-lien-bouton" href="/espace/validations">Ouvrir « À valider »</Link>
            </div>
            {(tableau?.a_valider ?? []).length === 0 ? (
              <Vide titre="Aucun message en attente">Les reprises préparées cette nuit apparaîtront ici avant de partir.</Vide>
            ) : (
              <div className="esp-carte-corps" style={{ display: "grid", gap: 8 }}>
              {(tableau?.a_valider ?? []).map((v) => (
                <details key={v.reprise} style={{ border: "1px solid var(--r-filet)", borderRadius: 12, padding: "10px 12px" }}>
                  <summary style={{ cursor: "pointer" }}>
                    <strong>{v.compte_nom}</strong> — {v.rang === 2 ? "relance" : "premier message"}
                    {v.mode === "essai" ? <> <Pastille teinte="ambre" contour>Essai</Pastille></> : null}
                    <div className="esp-kpi-sous">{v.sujet ?? "—"}{v.destinataire ? ` · à ${v.destinataire}` : ""}</div>
                  </summary>
                  <div style={{ whiteSpace: "pre-line", marginTop: 8, fontSize: 14 }}>{v.corps ?? "—"}</div>
                </details>
              ))}
              </div>
            )}
          </section>
        </div>

        <section id="esp-dossier" className="esp-detail-mobile" aria-label="Fiche du compte">
          {fiche ? (
            <FicheCompte key={fiche.compte.id} fiche={fiche} onAgir={agir} />
          ) : chargeFiche || (source === "reelle" && choisi) ? (
            <div className="esp-carte"><Chargement texte="Lecture de la fiche…" /></div>
          ) : (
            <div className="esp-carte"><Vide titre="Choisissez un compte">Ses raisons, sa courbe, ses reprises et ses pièces s&apos;affichent ici.</Vide></div>
          )}
        </section>
      </div>
    </>
  );
}
