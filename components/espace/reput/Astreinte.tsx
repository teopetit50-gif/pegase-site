"use client";

/* ══════════════════════════════════════════════════════════════════════
   L'astreinte d'une urgence (19/10/2026, C3, lot c3_22)

   Une demande urgente non prise : le membre de garde est appelé (rang 1,
   puis 2… sans prise au délai). Ici : où en est l'astreinte, et « Je
   prends l'urgence » pour qui traite les demandes (porte
   reput_prendre_urgence). Les numéros de garde ne s'affichent jamais ici.
   ══════════════════════════════════════════════════════════════════════ */

import { useEffect, useState } from "react";
import { Loader } from "@/components/ui/loader";
import { relatif } from "../format";
import { Avis, Pastille } from "../ui";
import { chargerAppels, prendreUrgence, type AppelAstreinte } from "./portes";
import type { Demande } from "./types";

const ISSUES: Record<string, string> = {
  a_appeler: "appel en préparation", en_cours: "appel en cours", sonne: "a sonné, attend la touche 1", pris: "pris",
  sans_reponse: "sans réponse", echec: "appel impossible", clos: "clos", sans_garde: "aucune garde en cours",
  non_passe: "appel non passé, aucun téléphone n’a sonné : appelez la garde vous-même",
};

export default function Astreinte({ demande, traite, source }: { demande: Demande; traite: boolean; source: "exemple" | "reelle" }) {
  const [appels, setAppels] = useState<AppelAstreinte[] | null>(source === "exemple"
    ? [{ id: "x1", rang: 1, statut: "sans_reponse", cree_le: demande.recu_le, issue_le: demande.recu_le },
       { id: "x2", rang: 2, statut: "sonne", cree_le: demande.recu_le, issue_le: null }]
    : null);
  const [prise, setPrise] = useState<string | null>(demande.urgence_prise_le ?? null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    if (source === "exemple" || !demande.urgence) return;
    let vivant = true;
    chargerAppels(demande.id).then((x) => { if (vivant) setAppels(x); }).catch(() => { if (vivant) setAppels([]); });
    return () => { vivant = false; };
  }, [source, demande.id, demande.urgence]);

  if (!demande.urgence) return null;
  const dernier = appels?.length ? appels[appels.length - 1] : null;

  const prendre = async () => {
    setEnvoi(true);
    setErreur(null);
    try {
      if (source === "reelle") await prendreUrgence(demande.id);
      setPrise(new Date().toISOString());
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base n'a pas répondu.");
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <div style={{ marginBottom: 10 }} data-astreinte>
      {prise ? (
        <Avis teinte="vert">Urgence prise {relatif(prise)} : les appels d&apos;astreinte sont arrêtés.</Avis>
      ) : demande.astreinte_epuisee_le ? (
        <Avis teinte="rouge">Astreinte épuisée : personne de garde n&apos;a pris l&apos;urgence. À prendre maintenant.</Avis>
      ) : (
        <Avis teinte="rouge">
          Urgence : {appels === null ? <Loader variant="spin" /> : dernier
            ? <>astreinte appelée (rang {dernier.rang}) — {ISSUES[dernier.statut] ?? dernier.statut}.</>
            : <>l&apos;astreinte va être appelée dans la minute (si elle est activée).</>}
        </Avis>
      )}
      {appels && appels.length > 1 ? (
        <p style={{ marginTop: 6, display: "flex", gap: 6, flexWrap: "wrap" }}>
          {appels.map((a) => <Pastille key={a.id} contour>Rang {a.rang} : {ISSUES[a.statut] ?? a.statut}</Pastille>)}
        </p>
      ) : null}
      {traite && !prise ? (
        <div className="esp-actions" style={{ marginTop: 8 }}>
          <button type="button" className="r-btn r-btn--noir" disabled={envoi} onClick={() => void prendre()}>
            {envoi ? <Loader variant="spin" /> : null} Je prends l&apos;urgence
          </button>
        </div>
      ) : null}
      {erreur ? <div style={{ marginTop: 6 }}><Avis teinte="rouge">{erreur}</Avis></div> : null}
    </div>
  );
}
