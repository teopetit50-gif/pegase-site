"use client";

/* ══════════════════════════════════════════════════════════════════════
   Questions sur le chantier (17/10/2026, session B6, b6_36)

   La fonction « questions » de toutes les formules : une question posée en
   français sur ce chantier, une réponse lue dans le seul chantier (marché,
   avenants, planning, contrôles, fil), avec ce qu'elle a lu. La réponse est
   préparée par l'ouvrier daliro-questions dans la minute ; l'écran la relit
   tant qu'une question attend. « À vérifier » quand un chiffre ne se lit
   pas dans le chantier. Chacun ne relit que ses questions. En exemple, les
   trois questions de la démonstration ont une réponse calculée ici.
   ══════════════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useState } from "react";
import { MessageCircleQuestionMark } from "lucide-react";
import { Bouton, Detail, Groupe, Ligne, Liste, Partie, Pilule, Point, Rangee, Rangees, Texte, Vide, jourCourt, useVolet } from "@/components/espace2/lin/Volet";
import { Loader } from "@/components/ui/loader";
import type { Source } from "../source";
import { dateCourte, dateHeure, montant } from "../format";
import { Avis, Pastille } from "../ui";
import { formuleQuiOuvre, ouverte } from "./fonctions";
import { poserQuestion, questionsDuChantier } from "./portes";
import type { QuestionChantier, Tableau } from "./types";

export const QUESTIONS_DEMO = ["Qu'est-ce qui n'est pas au devis ?", "Préparer la réunion de chantier", "Résumer la visite"];

const MOTIFS: [RegExp, string][] = [
  [/^PLAFOND_IA/, "Le plafond d'IA du jour est atteint pour votre entreprise : la question sera reprise demain."],
  [/^IA_NON_BRANCHEE/, "L'assistant n'est pas encore branché sur ce compte."],
  [/^FOURNISSEUR_INDISPONIBLE/, "Le service d'IA n'a pas répondu après plusieurs essais."],
];
const motifLisible = (m: string | null) => (m ? MOTIFS.find(([r]) => r.test(m))?.[1] ?? "La réponse n'a pas pu être préparée." : "La réponse n'a pas pu être préparée.");

/* En exemple : la réponse aux trois questions de la démonstration, lue dans le tableau d'exemple. */
export function reponseExemple(t: Tableau, question: string, aujourdhui: string): Omit<QuestionChantier, "id" | "cree_le"> {
  const q = question.toLowerCase();
  const base = { question, statut: "repondue" as const, motif: null, repondu_le: null };
  const prix = (m: number | null) => (t.voit_prix && m != null ? ` (${montant(m)} HT)` : "");
  if (/devis|en plus|suppl/.test(q)) {
    const av = t.avenants.filter((a) => a.statut !== "abandonne" && a.statut !== "refuse");
    if (!av.length) return { ...base, reponse: "Aucun avenant ni travail en plus sur ce chantier pour l'instant.", couverte: true, sources: ["avenants"], raison: null };
    const etat = (s: string) => (s === "signe" ? "signé" : s === "soumis" ? "soumis, en attente de signature" : "en brouillon");
    return { ...base, couverte: true, raison: null, sources: av.map((a) => `avenant n° ${a.numero}`),
             reponse: ["Hors devis sur ce chantier :", ...av.map((a) => `- Avenant n° ${a.numero}, ${a.objet}${prix(a.montant_ht)} : ${etat(a.statut)}.`)].join("\n") };
  }
  if (/réunion|reunion|ordre du jour/.test(q)) {
    const points: string[] = [];
    const sources = new Set<string>();
    for (const k of t.controles.filter((k) => k.gravite !== "info")) { points.push(`- ${k.gravite === "bloquant" ? "À traiter" : "À surveiller"} : ${k.message}`); sources.add("contrôles"); }
    for (const a of t.avenants.filter((a) => a.statut === "brouillon" || a.statut === "soumis")) { points.push(`- Avenant n° ${a.numero} à faire signer : ${a.objet}.`); sources.add(`avenant n° ${a.numero}`); }
    for (const p of t.passages.filter((p) => p.statut === "prevu" && p.debut >= aujourdhui && p.confirmation !== "confirmee").slice(0, 5)) {
      points.push(`- ${p.tache ?? "Passage"} (${p.intervenant_nom ?? "intervenant à préciser"}) le ${dateCourte(p.debut)} : présence pas encore confirmée.`); sources.add("planning");
    }
    for (const r of (t.reception?.reserves ?? []).filter((r) => r.statut !== "levee")) { points.push(`- Réserve non levée : ${r.description}.`); sources.add("réserves"); }
    return { ...base, couverte: true, raison: null, sources: [...sources],
             reponse: points.length ? ["Points à aborder, dans cet ordre :", ...points].join("\n") : "Rien d'ouvert : ni contrôle à traiter, ni avenant à signer, ni passage à confirmer." };
  }
  if (/visite|résum|resum|fil/.test(q)) {
    return { ...base, couverte: false, sources: [], raison: "En exemple, le fil n'est pas joint à l'assistant.",
             reponse: "En exemple, le fil du chantier n'est pas transmis à l'assistant. Avec vos données, il résume les derniers messages, photos et vocaux, datés." };
  }
  return { ...base, couverte: false, sources: [], raison: "En exemple, seules les trois questions proposées ont une réponse.",
           reponse: "En exemple, l'assistant répond aux trois questions proposées. Avec vos données, il répond à toute question sur ce chantier." };
}

type Props = { tableau: Tableau; source: Source; aujourdhui: string };

export default function QuestionsCarte({ tableau, source, aujourdhui }: Props) {
  const volet = useVolet();
  const c = tableau.chantier;
  const [texte, setTexte] = useState("");
  const [liste, setListe] = useState<QuestionChantier[]>([]);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const ferme = !ouverte(tableau, "questions");
  const attente = liste.some((q) => q.statut === "en_attente");

  const relire = useCallback(async () => {
    try { setListe(await questionsDuChantier(c.id)); }
    catch (e) { setErreur(e instanceof Error ? e.message : "La base n'a pas répondu."); }
  }, [c.id]);
  useEffect(() => {
    if (source !== "reelle" || ferme) return;
    const t = window.setTimeout(() => void relire(), 0);
    return () => window.clearTimeout(t);
  }, [source, ferme, relire]);
  // Tant qu'une question attend, on relit toutes les 5 secondes (la réponse arrive dans la minute).
  useEffect(() => {
    if (source !== "reelle" || !attente) return;
    const t = window.setInterval(() => void relire(), 5000);
    return () => window.clearInterval(t);
  }, [source, attente, relire]);

  async function poser(q: string) {
    const question = q.trim();
    if (question.length < 3) { setErreur("La question tient en 3 caractères au moins."); return; }
    setErreur(null);
    if (source !== "reelle") {
      const r = reponseExemple(tableau, question, aujourdhui);
      setListe((l) => [{ ...r, id: `exemple-${l.length + 1}`, cree_le: new Date().toISOString() }, ...l].slice(0, 20));
      setTexte("");
      return;
    }
    setEnvoi(true);
    try { await poserQuestion(c.id, question); setTexte(""); await relire(); }
    catch (e) { setErreur(e instanceof Error ? e.message : "La base n'a pas répondu."); }
    finally { setEnvoi(false); }
  }


  /* 30/10/2026 — dans la fiche de l'espace 2 : les questions proposées en pastilles, le champ, puis
     une question par ligne ; la réponse et ce qu'elle a lu dans le volet (../../espace2/lin/Volet.tsx) */
  if (volet) {
    const etat = (q: QuestionChantier) =>
      q.statut === "en_attente" ? { t: "bleu" as const, l: "Réponse dans la minute" }
      : q.statut === "echec" ? { t: "rouge" as const, l: "Sans réponse" }
      : q.couverte ? { t: "vert" as const, l: "Lu dans le chantier" }
      : { t: "jaune" as const, l: "À vérifier" };
    return (
      <Partie titre="Questions sur le chantier">
        {ferme ? (
          <Vide>L&apos;assistant est compris dans la formule {formuleQuiOuvre("questions")}.</Vide>
        ) : (
          <>
            <p className="lvp-resume">
              Une réponse lue dans ce chantier seulement : marché, avenants, planning, contrôles, fil{tableau.voit_prix ? "" : " (sans les prix : votre compte ne les voit pas)"}. Un chiffre qu&apos;elle ne trouve pas dans le chantier est marqué à vérifier.
            </p>
            <form className="lvp-question" onSubmit={(e) => { e.preventDefault(); void poser(texte); }}>
              <textarea className="lvp-question-champ" rows={2} maxLength={1000} aria-label="Votre question" value={texte} onChange={(e) => setTexte(e.target.value)} placeholder="Quand passe l'électricien ? Qu'est-ce qui reste à facturer ?" />
              <div className="lvp-question-pied">
                <div className="lvp-gestes lvp-gestes--gauche" role="group" aria-label="Questions proposées">
                  {QUESTIONS_DEMO.map((q) => (
                    <Bouton key={q} disabled={envoi} onClick={() => void poser(q)}>{q}</Bouton>
                  ))}
                </div>
                <Bouton fort type="submit" disabled={envoi || texte.trim().length < 3}>
                  {envoi ? <Loader variant="spin" /> : null} Demander
                </Bouton>
              </div>
            </form>
            {erreur ? <div className="lvp-avis"><Avis teinte="rouge" role="alert">{erreur}</Avis></div> : null}
            {liste.length ? (
              <Liste>
                <Groupe nom="Questions posées" compte={liste.length}>
                  {liste.map((q) => {
                    const e = etat(q);
                    return (
                      <Ligne key={q.id} cle={`question:${q.id}`} libelle={q.question} icone={<MessageCircleQuestionMark />} titre={q.question} second={q.statut === "repondue" ? q.reponse?.split("\n")[0] : null} droite={<Pilule teinte={e.t} icone={<Point teinte={e.t} />}>{e.l}</Pilule>} date={q.repondu_le ? jourCourt(q.repondu_le) : null} />
                    );
                  })}
                </Groupe>
              </Liste>
            ) : null}
            {liste.map((q) => {
              const e = etat(q);
              return (
                <Detail key={q.id} cle={`question:${q.id}`} titre={q.question} sous={q.repondu_le ? dateHeure(q.repondu_le) : source !== "reelle" ? "Exemple" : undefined}>
                  <Rangees>
                    <Rangee libelle="Réponse" teinte={e.t}>{e.l}</Rangee>
                  </Rangees>
                  {q.statut === "en_attente" ? (
                    <Texte>Daliro lit le chantier…</Texte>
                  ) : q.statut === "echec" ? (
                    <Texte>{motifLisible(q.motif)}</Texte>
                  ) : (
                    <>
                      <p className="lvp-texte lvp-texte--long">{q.reponse}</p>
                      {q.raison && !q.couverte ? <div className="lvp-note"><div>{q.raison}</div></div> : null}
                      <div className="lvp-note"><div>{q.sources.length ? `Lu : ${q.sources.join(" · ")}` : "Aucune source citée"}</div></div>
                    </>
                  )}
                </Detail>
              );
            })}
          </>
        )}
      </Partie>
    );
  }

  return (
    <section className="esp-carte" aria-label="Questions sur le chantier">
      <div className="esp-carte-tete">
        <div className="esp-section-titre" style={{ margin: 0 }}><MessageCircleQuestionMark width={16} height={16} aria-hidden="true" /> Questions sur le chantier</div>
      </div>
      {ferme ? <p className="esp-kpi-sous">L&apos;assistant est compris dans la formule {formuleQuiOuvre("questions")}.</p> : (
        <>
          <p className="esp-kpi-sous" style={{ marginTop: 0 }}>
            Une réponse lue dans ce chantier seulement — marché, avenants, planning, contrôles, fil{tableau.voit_prix ? "" : " (sans les prix : votre compte ne les voit pas)"}. Elle dit ce qu&apos;elle a lu ; un chiffre qu&apos;elle ne trouve pas dans le chantier est marqué à vérifier.
          </p>
          <div className="esp-actions" style={{ marginTop: 0 }} role="group" aria-label="Questions proposées">
            {QUESTIONS_DEMO.map((q) => (
              <button key={q} type="button" className="r-btn r-btn--fil r-btn--petit" disabled={envoi} onClick={() => void poser(q)}>{q}</button>
            ))}
          </div>
          <form className="esp-form" onSubmit={(e) => { e.preventDefault(); void poser(texte); }}>
            <label className="rv-libelle">Votre question
              <textarea className="rv-champ" rows={2} maxLength={1000} value={texte} onChange={(e) => setTexte(e.target.value)} placeholder="Quand passe l'électricien ? Qu'est-ce qui reste à facturer ?" />
            </label>
            <div className="esp-actions"><button type="submit" className="r-btn r-btn--noir r-btn--petit" disabled={envoi || texte.trim().length < 3}>{envoi ? <Loader variant="spin" /> : null} Demander</button></div>
          </form>
          {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
          {liste.length ? (
            <ul className="esp-fil" aria-live="polite">
              {liste.map((q) => (
                <li key={q.id}>
                  <span className="esp-fil-point" data-teinte={q.statut === "echec" ? "rouge" : q.statut === "repondue" && !q.couverte ? "ambre" : undefined} />
                  <div className="esp-fil-texte">
                  <div className="esp-item-haut">
                    <strong>{q.question}</strong>
                    {q.statut === "en_attente" ? <Pastille teinte="bleu">Réponse dans la minute</Pastille>
                      : q.statut === "echec" ? <Pastille teinte="rouge">Sans réponse</Pastille>
                      : q.couverte ? <Pastille teinte="vert">Lu dans le chantier</Pastille>
                      : <Pastille teinte="ambre">À vérifier</Pastille>}
                  </div>
                  {q.statut === "en_attente" ? <p className="esp-kpi-sous"><Loader variant="spin" /> Daliro lit le chantier…</p>
                    : q.statut === "echec" ? <p className="esp-kpi-sous">{motifLisible(q.motif)}</p>
                    : (
                      <>
                        <p style={{ whiteSpace: "pre-line", margin: "6px 0" }}>{q.reponse}</p>
                        {q.raison && !q.couverte ? <p className="esp-kpi-sous">{q.raison}</p> : null}
                        <p className="esp-kpi-sous">{q.sources.length ? `Lu : ${q.sources.join(" · ")}` : "Aucune source citée"}{q.repondu_le ? ` — ${dateHeure(q.repondu_le)}` : source !== "reelle" ? " — exemple" : ""}</p>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </>
      )}
    </section>
  );
}
