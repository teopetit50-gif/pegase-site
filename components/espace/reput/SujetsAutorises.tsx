"use client";

/* ══════════════════════════════════════════════════════════════════════
   Les sujets autorisés d'avance (06/10/2026, session C3, c3_03)

   Modèle 2 (c3_13, 18/10) : l'envoi automatique est voulu par défaut ; un
   geste du gérant donne l'accord permanent (politique du socle, d'un an,
   révocable) de tous les sujets autorisables, et les réponses entièrement
   tirées de la base y partent seules. Sujet par sujet reste possible.
   L'accord s'active par un autre décideur dans « À valider » — ou par le
   gérant lui-même s'il est le seul décideur de l'organisation.
   Réclamations, urgences, demandes de parler à quelqu'un et hors sujet ne
   s'autorisent jamais : elles sont toujours relues.
   ══════════════════════════════════════════════════════════════════════ */

import { useState } from "react";
import { Loader } from "@/components/ui/loader";
import { dateCourte } from "../format";
import { Avis, Pastille, type Teinte } from "../ui";
import { activerAccordSeul, donnerAccord, envoiAutomatique, fixerDelai, revoquerAccord, routerSujet } from "./portes";
import type { AccordSujet, Client, Monde } from "./types";

const ETATS: Record<AccordSujet["statut"], { libelle: string; teinte: Teinte }> = {
  aucun: { libelle: "Toujours relu", teinte: "gris" },
  a_valider: { libelle: "Accord à activer", teinte: "ambre" },
  active: { libelle: "Part seul", teinte: "vert" },
  refusee: { libelle: "Accord refusé", teinte: "gris" },
  revoquee: { libelle: "Accord révoqué", teinte: "gris" },
  expire: { libelle: "Accord expiré", teinte: "ambre" },
};

export default function SujetsAutorises({ monde, source, client, role, relire, modifierLocal }: {
  monde: Monde; source: "exemple" | "reelle"; client: Client | null; role: string;
  relire: () => Promise<void>; modifierLocal: (f: (m: Monde) => Monde) => void;
}) {
  const [envoi, setEnvoi] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [fait, setFait] = useState<string | null>(null);
  const dirige = source === "exemple" ? true : monde.accords.peut_donner && (role === "gerant" || role === "admin");

  const changer = (sujet: string, statut: AccordSujet["statut"]) =>
    modifierLocal((m) => ({ ...m, accords: { ...m.accords, sujets: m.accords.sujets.map((s) => (s.sujet === sujet ? { ...s, statut } : s)) } }));

  const agir = async (a: AccordSujet, quoi: "donner" | "revoquer" | "activer") => {
    let motif = "";
    if (quoi === "revoquer") {
      motif = window.prompt(`Pourquoi révoquer l'accord « ${a.libelle} » ? Les réponses suivantes de ce sujet attendront votre validation.`) ?? "";
      if (!motif.trim()) return;
    }
    setEnvoi(a.sujet);
    setErreur(null);
    try {
      if (source === "reelle" && client) {
        if (quoi === "donner") await donnerAccord(client.client_id, a.sujet);
        else if (quoi === "revoquer") await revoquerAccord(client.client_id, a.sujet, motif.trim());
        else await activerAccordSeul(client.client_id, a.sujet);
        await relire();
      } else changer(a.sujet, quoi === "donner" ? "a_valider" : quoi === "revoquer" ? "revoquee" : "active");
      setFait(quoi === "donner" ? `Accord proposé pour « ${a.libelle} » : un autre décideur l'active dans « À valider ».`
        : quoi === "revoquer" ? `Accord révoqué : les réponses « ${a.libelle} » attendent de nouveau votre validation.`
          : `Accord activé : les réponses « ${a.libelle} » tirées de votre base partent seules.`);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base n'a pas répondu.");
    } finally {
      setEnvoi(null);
    }
  };

  const router = async (sujet: string, equipe: string | null) => {
    setEnvoi(sujet);
    setErreur(null);
    try {
      if (source === "reelle" && client) {
        await routerSujet(client.client_id, sujet, equipe);
        await relire();
      } else modifierLocal((m) => ({ ...m, sujets: m.sujets.map((x) => (x.code === sujet ? { ...x, equipe_id: equipe } : x)) }));
      setFait(equipe ? "Ce sujet va désormais au service choisi : seuls ses membres valident ses réponses." : "Ce sujet est de nouveau décidé par tous les décideurs.");
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base n'a pas répondu.");
    } finally {
      setEnvoi(null);
    }
  };

  const auto = monde.reglages?.envoi_auto ?? true;
  const basculerAuto = async (actif: boolean) => {
    let motif = "";
    if (!actif) {
      motif = window.prompt("Pourquoi couper l'envoi automatique ? Toutes les réponses attendront de nouveau votre validation.") ?? "";
      if (!motif.trim()) return;
    }
    setEnvoi("__auto__");
    setErreur(null);
    try {
      if (source === "reelle" && client) {
        const r = await envoiAutomatique(client.client_id, actif, motif.trim() || undefined);
        await relire();
        setFait(!actif ? `Envoi automatique coupé : ${r.revoques} accord${r.revoques > 1 ? "s" : ""} révoqué${r.revoques > 1 ? "s" : ""}, tout est de nouveau relu.`
          : r.a_activer_par_un_autre ? `Envoi automatique demandé sur ${r.proposes} sujet${r.proposes > 1 ? "s" : ""} : un autre décideur l'active dans « À valider ».`
            : "Envoi automatique activé : les réponses tirées de votre base partent seules, sauf retenue.");
      } else {
        modifierLocal((m) => ({
          ...m,
          reglages: m.reglages ? { ...m.reglages, envoi_auto: actif } : m.reglages,
          accords: { ...m.accords, sujets: m.accords.sujets.map((a) => (a.autorisable && a.genre !== "message"
            ? { ...a, statut: actif ? "active" : "revoquee", fin: actif ? new Date(Date.now() + 365 * 86_400_000).toISOString() : a.fin } : a)) },
        }));
        setFait(actif ? "Envoi automatique activé : les réponses tirées de votre base partent seules, sauf retenue." : "Envoi automatique coupé : tout est de nouveau relu.");
      }
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base n'a pas répondu.");
    } finally {
      setEnvoi(null);
    }
  };

  const changerDelai = async (sujet: string, actuel: number) => {
    const saisi = window.prompt("Délai de traitement en heures (1 à 720) : passé ce délai, la demande remonte au responsable.", String(actuel));
    const heures = Number(saisi);
    if (!saisi || !Number.isInteger(heures) || heures < 1 || heures > 720) return;
    setEnvoi(sujet);
    setErreur(null);
    try {
      if (source === "reelle" && client) {
        await fixerDelai(client.client_id, sujet, heures);
        await relire();
      } else modifierLocal((m) => ({ ...m, sujets: m.sujets.map((x) => (x.code === sujet ? { ...x, delai_heures: heures } : x)) }));
      setFait(`Délai de traitement fixé à ${heures} h.`);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base n'a pas répondu.");
    } finally {
      setEnvoi(null);
    }
  };

  return (
    <section className="esp-carte" aria-label="Sujets autorisés">
      <div className="esp-carte-tete">
        <h2 className="esp-carte-titre">Sujets autorisés d&apos;avance</h2>
      </div>
      <div className="esp-carte-corps">
        <p className="esp-kpi-sous">
          Une réponse entièrement tirée de votre base part seule, dans la minute, sur chaque sujet dont l&apos;accord est actif ; une réponse hors base, urgente ou corrigée est toujours relue. L&apos;accord dure un an et se révoque à tout moment, sujet par sujet ou d&apos;un coup.
        </p>
        {fait ? <div style={{ marginTop: 10 }}><Avis teinte="vert" role="status">{fait}</Avis></div> : null}
        {erreur ? <div style={{ marginTop: 10 }}><Avis teinte="rouge" role="alert">{erreur}</Avis></div> : null}
      </div>
      <div className="esp-carte-corps" aria-label="Envoi automatique">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ display: "grid", gap: 4, minWidth: 0 }}>
            <span className="esp-item-haut">
              <strong>Envoi automatique</strong>
              {auto ? <Pastille teinte="vert">Voulu</Pastille> : <Pastille teinte="gris">Coupé</Pastille>}
            </span>
            <span className="esp-kpi-sous">
              Une réponse tirée de votre base part seule sur les sujets autorisés. Elle est retenue pour une personne quand l&apos;IA doute (hors base, chiffre absent de vos fiches), quand le message est urgent, ou quand le sujet est toujours relu.
            </span>
          </span>
          {dirige ? (
            <button type="button" className={auto ? "r-btn" : "r-btn r-btn--noir"} disabled={envoi !== null} onClick={() => void basculerAuto(!auto)}>
              {envoi === "__auto__" ? <Loader variant="spin" /> : null} {auto ? "Couper l'envoi automatique" : "Activer l'envoi automatique"}
            </button>
          ) : null}
        </div>
        {auto && dirige ? (
          <p className="esp-kpi-sous" style={{ marginTop: 8 }}>
            Pour qu&apos;il s&apos;applique, chaque sujet autorisable doit avoir son accord actif : <button type="button" className="esp-lien-bouton" disabled={envoi !== null} onClick={() => void basculerAuto(true)}>tout autoriser d&apos;un coup</button>.
          </p>
        ) : null}
      </div>
      <div className="esp-carte-corps">
        <ul style={{ display: "grid", gap: 12 }}>
          {monde.accords.sujets.filter((a) => a.actif).map((a) => {
            const e = ETATS[a.statut];
            return (
              <li key={a.sujet} style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ display: "grid", gap: 2, minWidth: 0 }}>
                  <span className="esp-item-haut">
                    <strong>{a.libelle}</strong>
                    {a.autorisable ? <Pastille teinte={e.teinte}>{e.libelle}</Pastille> : <Pastille contour>Toujours relu, par principe</Pastille>}
                  </span>
                  {(() => {
                    const sujet = a.genre === "message" ? undefined : monde.sujets.find((x) => x.code === a.sujet);
                    const equipes = monde.equipes ?? [];
                    if (!sujet || equipes.length === 0) return null;
                    return (
                      <label className="esp-kpi-sous" style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                        Service qui décide :
                        <select className="rv-champ" style={{ width: "auto", minWidth: 220, padding: "4px 30px 4px 8px" }} disabled={!dirige || envoi !== null} value={sujet.equipe_id ?? ""}
                          onChange={(e) => void router(sujet.code, e.target.value || null)}>
                          <option value="">Tous les décideurs</option>
                          {equipes.map((q) => <option key={q.id} value={q.id}>{q.nom}</option>)}
                        </select>
                      </label>
                    );
                  })()}
                  {(() => {
                    const delai = a.genre === "message" ? null : monde.sujets.find((x) => x.code === a.sujet)?.delai_heures;
                    return delai ? (
                      <span className="esp-kpi-sous">
                        Délai de traitement : {delai} h{dirige ? (
                          <> · <button type="button" className="esp-lien-bouton" disabled={envoi !== null} onClick={() => void changerDelai(a.sujet, delai)}>changer</button></>
                        ) : null}
                      </span>
                    ) : null;
                  })()}
                  {a.statut === "active" ? (
                    <span className="esp-kpi-sous">
                      Jusqu&apos;au {dateCourte(a.fin)}{a.donne_par_libelle ? ` · donné par ${a.donne_par_libelle}` : ""} · {a.envoyees_seules_mois} réponse{a.envoyees_seules_mois > 1 ? "s" : ""} partie{a.envoyees_seules_mois > 1 ? "s" : ""} seule{a.envoyees_seules_mois > 1 ? "s" : ""} ce mois-ci
                    </span>
                  ) : null}
                </span>
                {dirige && a.autorisable ? (
                  <span className="esp-actions">
                    {a.statut === "active" || a.statut === "a_valider" ? (
                      <button type="button" className="r-btn" disabled={envoi !== null} onClick={() => agir(a, "revoquer")}>{envoi === a.sujet ? <Loader variant="spin" /> : null} Révoquer</button>
                    ) : (
                      <button type="button" className="r-btn r-btn--noir" disabled={envoi !== null} onClick={() => agir(a, "donner")}>{envoi === a.sujet ? <Loader variant="spin" /> : null} Autoriser l&apos;envoi seul</button>
                    )}
                    {a.statut === "a_valider" && monde.accords.seul_decideur ? (
                      <button type="button" className="r-btn r-btn--noir" disabled={envoi !== null} onClick={() => agir(a, "activer")}>Activer moi-même (seul décideur)</button>
                    ) : null}
                  </span>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
