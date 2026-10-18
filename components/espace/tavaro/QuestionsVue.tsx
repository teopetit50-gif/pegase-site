"use client";

/* ══════════════════════════════════════════════════════════════════════
   Les Questions (17/10/2026, session B2, module 06, migration b2_20)

   On pose une question en français ; l'ouvrier tavaro-questions choisit
   des lectures dans un catalogue fermé (jamais d'écriture), puis répond
   chiffres à l'appui, avec la cause de l'écart et la décision proposée.
   Les réponses arrivent en général en moins d'une minute : l'écran relit
   tant qu'une question attend. En exemple, aucune IA n'est appelée.
   ══════════════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useState } from "react";
import { Loader } from "@/components/ui/loader";
import { Avis, Chargement, Pastille, Vide } from "../ui";
import { dateHeure } from "../format";
import { chargerQuestions, poserQuestion, type Question } from "./portes";
import type { Role } from "./types";

const EXEMPLES: Question[] = [
  { id: "q-ex-1", entite_id: null, question: "Pourquoi a-t-on facturé moins de dommages ce mois-ci ?", statut: "repondue", posee_par: null, posee_le: "2026-10-16T08:12:00Z", repondue_le: "2026-10-16T08:12:40Z", erreur: null,
    reponse: { reponse: "Ce mois-ci, 2 retours sur 7 ne sont pas encore facturés : leur chiffrage attend une photo. Les dommages facturés baissent d'autant.",
      chiffres: [{ libelle: "Retours rendus", valeur: "7" }, { libelle: "Retours sans facture", valeur: "2" }, { libelle: "Facturé pour 100 retours", valeur: "5 214,29 €" }],
      cause: "Deux chiffrages sont en « preuve manquante » depuis plus de cinq jours.", decision: "Ajouter les photos des retours C-2026-0398 et C-2026-0377, puis les faire valider." } },
  { id: "q-ex-2", entite_id: null, question: "Combien de péages restent à payer ?", statut: "repondue", posee_par: null, posee_le: "2026-10-15T17:40:00Z", repondue_le: "2026-10-15T17:40:31Z", erreur: null,
    reponse: { reponse: "Un passage reste à payer chez l'opérateur, dans le délai de 72 heures.", chiffres: [{ libelle: "À payer", valeur: "1" }, { libelle: "Montant", valeur: "4,80 €" }],
      cause: null, decision: "Payer le passage APRR-77120 avant demain 16 h, puis le refacturer avec le contrat C-2026-0430." } },
];
const STATUTS: Record<Question["statut"], { libelle: string; teinte: "ambre" | "vert" | "rouge" | "bleu" }> = {
  a_traiter: { libelle: "en attente", teinte: "ambre" }, en_cours: { libelle: "en cours", teinte: "bleu" }, repondue: { libelle: "répondue", teinte: "vert" }, echec: { libelle: "sans réponse", teinte: "rouge" },
};

export default function QuestionsVue({ source, role }: { source: "exemple" | "reelle"; role: Role | null }) {
  const [monte, setMonte] = useState(false);
  const [liste, setListe] = useState<Question[] | null>(null);
  const [texte, setTexte] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [fait, setFait] = useState<string | null>(null);
  const peut = role !== null && role !== "lecteur";

  const relire = useCallback(async () => { try { setListe((await chargerQuestions()) ?? []); } catch { setListe([]); } }, []);
  useEffect(() => {
    const t = window.setTimeout(() => { setMonte(true); if (source === "exemple") setListe(EXEMPLES); else void relire(); }, 0);
    return () => window.clearTimeout(t);
  }, [source, relire]);
  /* tant qu'une question attend, on relit toutes les cinq secondes */
  const attente = (liste ?? []).some((q) => q.statut === "a_traiter" || q.statut === "en_cours");
  useEffect(() => {
    if (source !== "reelle" || !attente) return;
    const t = window.setInterval(() => void relire(), 5000);
    return () => window.clearInterval(t);
  }, [source, attente, relire]);

  if (!monte || (source === "reelle" && liste === null && peut)) {
    return <section className="esp-carte" aria-label="Questions"><div className="esp-carte-corps"><Chargement texte="Lecture des questions…" /></div></section>;
  }

  async function poser() {
    const q = texte.trim().replace(/\s+/g, " ");
    if (q.length < 5 || q.length > 500) { setErreur("Une question tient en 5 à 500 caractères."); return; }
    setEnvoi(true);
    setErreur(null);
    setFait(null);
    try {
      if (source === "reelle") {
        await poserQuestion(q);
        await relire();
        setFait("La question est posée : la réponse arrive en général en moins d'une minute.");
      } else {
        setListe((l) => [{ id: crypto.randomUUID(), entite_id: null, question: q, statut: "a_traiter", reponse: null, erreur: null, posee_par: null, posee_le: new Date().toISOString(), repondue_le: null }, ...(l ?? [])]);
        setFait("En exemple, la question n'est pas envoyée : aucune IA n'est appelée. Les deux réponses ci-dessous montrent la forme d'une réponse.");
      }
      setTexte("");
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base a refusé.");
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <section className="esp-carte" aria-label="Questions">
      <div className="esp-carte-tete">
        <h2 className="esp-carte-titre">Questions</h2>
        <span className="esp-kpi-sous">réponses tirées de vos chiffres, jamais d&apos;écriture</span>
      </div>
      <div className="esp-carte-corps">
        <div className="esp-form">
          <label className="rv-libelle">Votre question, en français
            <textarea className="rv-champ" rows={2} maxLength={500} value={texte} disabled={!peut} placeholder="Par exemple : combien de retours ne sont pas encore facturés ?" onChange={(e) => setTexte(e.target.value)} />
          </label>
          <div className="esp-actions" style={{ marginTop: 0 }}>
            <button type="button" className="r-btn r-btn--noir r-btn--petit" disabled={!peut || envoi || texte.trim().length < 5} onClick={() => void poser()}>
              {envoi ? <Loader variant="spin" /> : null} Poser la question
            </button>
          </div>
        </div>
        {fait ? <div style={{ margin: "10px 0" }}><Avis teinte="vert" role="status">{fait}</Avis></div> : null}
        {erreur ? <div style={{ margin: "10px 0" }}><Avis teinte="rouge" role="alert">{erreur}</Avis></div> : null}
        {!liste?.length ? <Vide titre="Aucune question">Vos questions et leurs réponses s&apos;affichent ici.</Vide> : (
          <ul className="tav-avis-liste" aria-label="Questions posées">
            {liste.map((q) => (
              <li key={q.id} className="tav-avis">
                <div className="esp-item-haut">
                  <Pastille teinte={STATUTS[q.statut].teinte}>{STATUTS[q.statut].libelle}</Pastille>
                  <span className="esp-kpi-sous">{dateHeure(q.posee_le)}</span>
                </div>
                <p className="tav-avis-titre">{q.question}</p>
                {q.reponse ? (
                  <>
                    <p>{q.reponse.reponse}</p>
                    {q.reponse.chiffres.length ? (
                      <dl className="tav-chiffres-reponse">
                        {q.reponse.chiffres.map((c, i) => <div key={i}><dt className="esp-kpi-sous">{c.libelle}</dt><dd>{c.valeur}</dd></div>)}
                      </dl>
                    ) : null}
                    {q.reponse.cause ? <p className="esp-kpi-sous"><strong>Cause :</strong> {q.reponse.cause}</p> : null}
                    {q.reponse.decision ? <p className="esp-kpi-sous"><strong>Décision proposée :</strong> {q.reponse.decision}</p> : null}
                  </>
                ) : q.statut === "echec" ? <p className="esp-kpi-sous">Pas de réponse : {q.erreur?.split(" : ")[0] === "PLAFOND_IA" ? "le plafond d'IA du jour est atteint, reposez-la demain." : "reposez la question autrement."}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
