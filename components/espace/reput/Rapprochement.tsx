"use client";

/* ══════════════════════════════════════════════════════════════════════
   Une même personne sur deux canaux (19/10/2026, C3, lot c3_15)

   Même nom, autre canal, dans les 48 h, sans clé commune : la base
   PROPOSE le rapprochement, elle ne fusionne jamais seule (deux homonymes
   ne recevraient pas la réponse de l'autre). Une personne qui traite les
   demandes rapproche (un dossier, une réponse), écarte la proposition, ou
   sépare une demande rangée à tort dans un dossier.
   ══════════════════════════════════════════════════════════════════════ */

import { useState } from "react";
import { Loader } from "@/components/ui/loader";
import { Avis } from "../ui";
import { relatif } from "../format";
import { ecarterRapprochement, rapprocher, separer } from "./portes";
import type { Demande, Monde } from "./types";

const CANAUX: Record<string, string> = { email: "courriel", whatsapp: "WhatsApp", sms: "SMS", formulaire: "formulaire du site", appel: "appel manqué" };

export default function Rapprochement({ demande, monde, traite, source, relire, modifierLocal }: {
  demande: Demande; monde: Monde; traite: boolean; source: "exemple" | "reelle";
  relire: () => Promise<void>; modifierLocal: (f: (m: Monde) => Monde) => void;
}) {
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const autre = demande.rapprochement_propose ? monde.demandes.find((x) => x.id === demande.rapprochement_propose) : undefined;
  const dossier = demande.dossier_id ?? demande.id;
  const enDossier = monde.demandes.filter((x) => (x.dossier_id ?? x.id) === dossier).length > 1;
  if (!autre && !(enDossier && traite)) return null;

  const agir = async (quoi: "rapprocher" | "ecarter" | "separer") => {
    setEnvoi(true);
    setErreur(null);
    try {
      if (source === "reelle") {
        if (quoi === "rapprocher" && autre) await rapprocher(demande.id, autre.id);
        else if (quoi === "ecarter") await ecarterRapprochement(demande.id);
        else if (quoi === "separer") await separer(demande.id);
        await relire();
      } else {
        modifierLocal((m) => ({
          ...m,
          demandes: m.demandes.map((d) => {
            if (quoi === "rapprocher" && autre && (d.id === demande.id || d.id === autre.id)) {
              return { ...d, dossier_id: autre.dossier_id ?? autre.id, rapprochement_propose: d.id === demande.id ? null : d.rapprochement_propose };
            }
            if (d.id !== demande.id) return d;
            return quoi === "ecarter" ? { ...d, rapprochement_propose: null } : quoi === "separer" ? { ...d, dossier_id: d.id } : d;
          }),
        }));
      }
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base n'a pas répondu.");
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <div style={{ marginBottom: 10 }} data-rapprochement>
      {autre ? (
        <Avis teinte="bleu">
          Peut-être la même personne que <strong>{autre.de_nom || "un autre client"}</strong> ({CANAUX[autre.canal] ?? autre.canal}, {relatif(autre.recu_le)}) :
          même nom, sans adresse ni numéro en commun. Rien n&apos;est regroupé sans vous.
        </Avis>
      ) : null}
      {traite ? (
        <div className="esp-actions" style={{ marginTop: 8, flexWrap: "wrap" }}>
          {autre ? (
            <>
              <button type="button" className="r-btn r-btn--noir" disabled={envoi} onClick={() => void agir("rapprocher")}>
                {envoi ? <Loader variant="spin" /> : null} Un seul dossier
              </button>
              <button type="button" className="r-btn" disabled={envoi} onClick={() => void agir("ecarter")}>Ce n&apos;est pas la même personne</button>
            </>
          ) : null}
          {enDossier ? (
            <button type="button" className="r-btn" disabled={envoi} onClick={() => void agir("separer")}>Sortir cette demande du dossier</button>
          ) : null}
        </div>
      ) : null}
      {erreur ? <div style={{ marginTop: 6 }}><Avis teinte="rouge">{erreur}</Avis></div> : null}
    </div>
  );
}
