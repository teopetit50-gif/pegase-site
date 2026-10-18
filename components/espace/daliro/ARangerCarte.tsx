"use client";

/* ══════════════════════════════════════════════════════════════════════
   Les messages du terrain à ranger (06/10/2026, session B6, b6_24)

   Un message que la base n'a pas su rattacher à un chantier : expéditeur
   inconnu de l'annuaire, aucun chantier nommé, ou plusieurs chantiers en
   cours pour lui. Le bureau choisit le chantier, ou l'écarte. Rien ne
   s'affiche quand il n'y a rien à ranger.
   ══════════════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useState } from "react";
import { Inbox } from "lucide-react";
import { ilYa } from "../exemples/socle";
import type { Source } from "../source";
import { dateHeure } from "../format";
import { Avis } from "../ui";
import { ecarterMessage, messagesARanger, rangerMessage } from "./portes";
import type { Chantier, MessageChantier } from "./types";

type Props = { source: Source; client: string | null; chantiers: Chantier[]; relire: () => Promise<void> };

function exemple(): MessageChantier[] {
  return [{
    id: "00000000-0000-4000-8000-00000000f101", reception_id: 9, chantier_id: null, canal: "whatsapp", de_nom: null, de_adresse: "33 6 •• •• •• 41",
    intervenant_id: null, tiers_id: null, texte: "Bonjour, la benne est pleine, on la fait enlever quand ?", rangement: null, statut: "a_ranger", avenant_id: null,
    recu_le: ilYa(0, 8), pieces: [{ nom: "image.jpg", mime: "image/jpeg", taille: 64000, chemin: "exemple/benne", vocal: false }],
  }];
}

export default function ARangerCarte({ source, client, chantiers, relire }: Props) {
  const [reel, setReel] = useState<MessageChantier[]>([]);
  const [local, setLocal] = useState<MessageChantier[]>(exemple);
  const [choix, setChoix] = useState<Record<string, string>>({});
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [fait, setFait] = useState<string | null>(null);

  const lire = useCallback(async () => {
    if (!client) return;
    try {
      setReel(await messagesARanger(client));
    } catch {
      setReel([]);
    }
  }, [client]);

  useEffect(() => {
    if (source !== "reelle") return;
    const t = window.setTimeout(() => void lire(), 0);
    return () => window.clearTimeout(t);
  }, [source, lire]);

  const messages = source === "reelle" ? reel : local;
  const ouverts = chantiers.filter((c) => c.statut !== "clos" && c.statut !== "annule");
  if (!messages.length && !fait) return null;

  const agir = async (reelle: () => Promise<unknown>, locale: () => void, message: string) => {
    setEnvoi(true);
    setErreur(null);
    try {
      if (source === "reelle") { await reelle(); await lire(); await relire(); } else { locale(); }
      setFait(message);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base a refusé l'action.");
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <section className="esp-carte" aria-label="Messages à ranger">
      <div className="esp-section-titre"><Inbox width={14} height={14} aria-hidden="true" style={{ verticalAlign: "-2px" }} /> Messages du terrain à ranger{messages.length ? ` (${messages.length})` : ""}</div>
      {fait ? <div style={{ marginBottom: 10 }}><Avis teinte="vert" role="status">{fait}</Avis></div> : null}
      {erreur ? <div style={{ marginBottom: 10 }}><Avis teinte="rouge" role="alert">{erreur}</Avis></div> : null}
      <ul className="esp-fil">
        {messages.map((m) => {
          const chantier = choix[m.id] ?? "";
          const nom = ouverts.find((c) => c.id === chantier)?.nom ?? "";
          return (
            <li key={m.id}>
              <span className="esp-fil-point" data-teinte="ambre" />
              <div style={{ minWidth: 0 }}>
                <div className="esp-fil-texte"><strong>{m.de_nom ?? m.de_adresse ?? "Expéditeur inconnu"}</strong>{m.texte ? ` — ${m.texte}` : ""}</div>
                <div className="esp-fil-meta">{dateHeure(m.recu_le)} · {m.pieces.length ? `${m.pieces.length} pièce${m.pieces.length > 1 ? "s" : ""} (${m.pieces.some((p) => p.vocal) ? "vocal" : "photo"})` : "texte seul"}</div>
                <div className="esp-actions" style={{ marginTop: 6, alignItems: "center" }}>
                  <label className="rv-libelle" style={{ margin: 0 }}>
                    <span className="esp-visuellement-cache" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>Chantier de ce message</span>
                    <select className="rv-champ" value={chantier} onChange={(e) => setChoix((p) => ({ ...p, [m.id]: e.target.value }))} style={{ width: "auto" }}>
                      <option value="">— choisir le chantier —</option>
                      {ouverts.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
                    </select>
                  </label>
                  <button type="button" className="r-btn r-btn--fil r-btn--petit" disabled={envoi || !chantier}
                          onClick={() => void agir(() => rangerMessage(m.id, chantier), () => setLocal((l) => l.filter((x) => x.id !== m.id)), `Message rangé au chantier « ${nom} ».`)}>Ranger</button>
                  <button type="button" className="esp-lien-bouton" disabled={envoi}
                          onClick={() => void agir(() => ecarterMessage(m.id, null), () => setLocal((l) => l.filter((x) => x.id !== m.id)), "Message écarté.")}>Écarter</button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
