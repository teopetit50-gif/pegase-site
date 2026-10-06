"use client";

/* ══════════════════════════════════════════════════════════════════════
   Les sujets autorisés d'avance (06/10/2026, session C3, c3_03)

   Par défaut, toute réponse attend votre validation. Sujet par sujet, le
   gérant ou un administrateur peut donner un accord permanent (une
   politique du socle, d'un an, révocable) : les réponses de ce sujet,
   quand elles sont entièrement tirées de la base, partent alors seules.
   L'accord s'active par un autre décideur dans « À valider » — ou par le
   gérant lui-même s'il est le seul décideur de l'organisation.
   Réclamations, urgences, demandes de parler à quelqu'un et hors sujet ne
   s'autorisent jamais : elles sont toujours relues.
   ══════════════════════════════════════════════════════════════════════ */

import { useState } from "react";
import { Loader } from "@/components/ui/loader";
import { dateCourte } from "../format";
import { Avis, Pastille, type Teinte } from "../ui";
import { activerAccordSeul, donnerAccord, fixerDelai, revoquerAccord } from "./portes";
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
          Par défaut, rien ne part sans votre validation. Sur un sujet que vous autorisez, une réponse entièrement tirée de votre base part seule, dans la minute ; une réponse hors base ou corrigée est toujours relue. L&apos;accord dure un an et se révoque à tout moment.
        </p>
        {fait ? <div style={{ marginTop: 10 }}><Avis teinte="vert" role="status">{fait}</Avis></div> : null}
        {erreur ? <div style={{ marginTop: 10 }}><Avis teinte="rouge" role="alert">{erreur}</Avis></div> : null}
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
                    const delai = monde.sujets.find((x) => x.code === a.sujet)?.delai_heures;
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
