"use client";

/* ══════════════════════════════════════════════════════════════════════
   DALIRO › fiche d'un chantier : poser une question à Daliro, l'IA
   (06/11/2026, demandes de Teo : « que l'API soit branchée derrière et que
   je puisse poser vraiment une question », puis pour Terrain : « je veux
   que ce soit comme Claude »).

   useDaliro : la conversation d'un chantier, partagée par le composeur de
   l'onglet Activité et la conversation de Terrain. La question part à
   /api/daliro/question avec le chantier mis en texte (./contexteChantier)
   et les échanges précédents ; la réponse arrive en flux, mot à mot.

   ConversationDaliro : le volet de droite de Terrain quand rien n'est
   choisi, dessiné comme une conversation de Claude : un accueil (« Que
   voulez-vous savoir sur ce chantier ? ») et quatre suggestions ; puis la
   question en bulle à droite, la réponse en texte libre à gauche, écrite
   en direct ; le champ arrondi en bas, Entrée envoie, Maj + Entrée va à la
   ligne. Remplace l'ancienne carte « Questions sur le chantier » (la
   question partait dans une liste « posée » et rien ne revenait).
   ══════════════════════════════════════════════════════════════════════ */

import { useEffect, useRef, useState } from "react";
import type { MessageChantier, Tableau } from "@/components/espace/daliro/types";
import { contexteChantier } from "./contexteChantier";
import { DalIcone } from "./DalIcone";

export type Echange = { id: number; question: string; reponse: string; enCours: boolean; quand: string };

export function useDaliro(t: Tableau) {
  /* du plus ancien au plus récent */
  const [echanges, setEchanges] = useState<Echange[]>([]);
  const maj = (id: number, f: (e: Echange) => Echange) => setEchanges((xs) => xs.map((e) => (e.id === id ? f(e) : e)));

  const demander = async (question: string, messages: MessageChantier[] = []) => {
    const id = Date.now();
    const historique = echanges.filter((e) => !e.enCours && e.reponse).slice(-6).map((e) => ({ question: e.question, reponse: e.reponse }));
    setEchanges((xs) => [...xs, { id, question, reponse: "", enCours: true, quand: new Date().toISOString() }]);
    try {
      const r = await fetch("/api/daliro/question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, contexte: contexteChantier(t, messages), historique }),
      });
      if (!r.ok || !r.body) {
        const corps = (await r.json().catch(() => null)) as { erreur?: string } | null;
        throw new Error(corps?.erreur ?? "Daliro n'a pas pu répondre. Réessayez.");
      }
      const lecteur = r.body.getReader();
      const decodeur = new TextDecoder();
      for (;;) {
        const { done, value } = await lecteur.read();
        if (done) break;
        const morceau = decodeur.decode(value, { stream: true });
        maj(id, (e) => ({ ...e, reponse: e.reponse + morceau }));
      }
    } catch (e) {
      maj(id, (x) => ({ ...x, reponse: x.reponse || (e instanceof Error ? e.message : "Daliro n'a pas pu répondre. Réessayez.") }));
    } finally {
      maj(id, (x) => ({ ...x, enCours: false }));
    }
  };

  return { echanges, demander, vider: () => setEchanges([]), enCours: echanges.some((e) => e.enCours) };
}

const SUGGESTIONS = ["Qui vient sur le chantier cette semaine ?", "Qu'est-ce qui bloque en ce moment ?", "Combien reste-t-il à facturer ?", "Résume-moi le chantier pour la réunion de demain"];

function Copier({ texte }: { texte: string }) {
  const [fait, setFait] = useState(false);
  return (
    <button
      type="button"
      className="dal-cv-outil"
      aria-label="Copier la réponse"
      title={fait ? "Copiée" : "Copier la réponse"}
      onClick={() => {
        void navigator.clipboard?.writeText(texte);
        setFait(true);
        window.setTimeout(() => setFait(false), 1500);
      }}
    >
      <DalIcone nom={fait ? "IssueStatusDone" : "Page"} taille={14} />
      {fait ? "Copiée" : "Copier"}
    </button>
  );
}

/* 06/11/2026 — la question préparée quand on choisit un élément de Terrain : la clé dit ce qu'il est
   (« passage:… », « commande:… », « risque:… »…), le libellé de sa ligne dit lequel. */
export function preQuestion(cle: string, libelle: string): string {
  const quoi = libelle.trim().replace(/\s+/g, " ").replace(/[.\s]+$/, "");
  const genre = cle.split(":")[0];
  /* « Pose des fenêtres, Pose A, 10 → 17 nov. » : le nom, puis ses précisions entre parenthèses */
  const [tete, ...reste] = quoi.split(", ");
  const precision = reste.length ? ` (${reste.join(", ").replace(/^./, (c) => c.toLowerCase())})` : "";
  if (genre === "passage") return `Où en est « ${tete} »${precision} ? Est-ce confirmé, et qu'est-ce qui pourrait le retarder ?`;
  if (genre === "commande") {
    const etat = reste.length ? reste[reste.length - 1].toLowerCase() : "";
    const objet = reste.length ? [tete, ...reste.slice(0, -1)].join(", ") : tete;
    return `Fais-moi le point sur la commande « ${objet} »${etat ? ` (${etat})` : ""} : pour quelle intervention, et y a-t-il quelque chose à prévoir ?`;
  }
  if (genre === "dependance") return `Que faire pour cet enchaînement : ${quoi} ?`;
  if (genre === "risque" || genre === "echange") return `La météo menace ce passage : ${quoi}. Que proposes-tu ?`;
  if (genre === "question") return quoi;
  /* un point à régler : « À voir : … » ou « Bloquant : … » — le message seul */
  const point = quoi.replace(/^[^:«]{1,20} : /, "");
  return `Comment régler ce point : ${point} ? Qui doit faire quoi, et pour quand ?`;
}

export function ConversationDaliro({ t, resume, amorce }: { t: Tableau; resume?: string; amorce?: { texte: string; n: number } | null }) {
  const { echanges, demander, vider, enCours } = useDaliro(t);
  const [texte, setTexte] = useState(amorce?.texte ?? "");
  const champ = useRef<HTMLTextAreaElement>(null);
  const fin = useRef<HTMLDivElement>(null);
  const dernier = echanges[echanges.length - 1];

  /* une question préparée (un élément de Terrain choisi) remplace ce qui était tapé ; on l'envoie ou on la reprend */
  const [amorceVue, setAmorceVue] = useState(amorce?.n ?? null);
  if (amorce && amorce.n !== amorceVue) {
    setAmorceVue(amorce.n);
    setTexte(amorce.texte);
  }
  useEffect(() => {
    if (!amorce) return;
    const el = champ.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
    el.focus({ preventScroll: true });
    el.setSelectionRange(el.value.length, el.value.length);
    el.closest(".dal-cv-bas")?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [amorce]);

  /* la conversation suit la réponse qui s'écrit */
  useEffect(() => {
    if (dernier) fin.current?.scrollIntoView({ block: "end" });
  }, [dernier?.id, dernier?.reponse.length, dernier]);

  const ajuster = () => {
    const el = champ.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  };
  const envoyer = (q: string) => {
    const question = q.trim();
    if (question.length < 3 || enCours) return;
    void demander(question);
    setTexte("");
    requestAnimationFrame(ajuster);
    champ.current?.focus();
  };

  return (
    <div className="dal-cv">
      {echanges.length ? (
        <div className="dal-cv-tete">
          <span>
            <DalIcone nom="Crane" taille={14} /> Daliro · {t.chantier.nom}
          </span>
          <button type="button" className="dal-cv-outil" onClick={vider} disabled={enCours}>
            <DalIcone nom="Write" taille={14} /> Nouvelle conversation
          </button>
        </div>
      ) : null}

      <div className="dal-cv-fil" aria-live="polite">
        {echanges.length ? (
          echanges.map((e) => (
            <div key={e.id} className="dal-cv-echange">
              <p className="dal-cv-question">{e.question}</p>
              <div className="dal-cv-reponse">
                <span className="dal-cv-marque" aria-hidden="true" data-actif={e.enCours ? "" : undefined}>
                  <DalIcone nom="Crane" taille={14} />
                </span>
                <div className="dal-cv-reponse-corps">
                  {e.reponse ? (
                    <p className="dal-cv-texte">
                      {e.reponse}
                      {e.enCours ? <span className="dal-cv-curseur" aria-hidden="true" /> : null}
                    </p>
                  ) : (
                    <p className="dal-cv-attente">Daliro lit le chantier…</p>
                  )}
                  {!e.enCours && e.reponse ? (
                    <div className="dal-cv-outils">
                      <Copier texte={e.reponse} />
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="dal-cv-accueil">
            <span className="dal-cv-logo" aria-hidden="true">
              <DalIcone nom="Crane" taille={22} />
            </span>
            <h3 className="dal-cv-titre">Que voulez-vous savoir sur ce chantier ?</h3>
            <p className="dal-cv-sous">Daliro lit le planning, les lots, l&apos;argent, la réception et le fil de {t.chantier.nom}.{resume ? ` En ce moment : ${resume.charAt(0).toLowerCase()}${resume.slice(1)}.` : ""}</p>
            <div className="dal-cv-suggestions">
              {SUGGESTIONS.map((s) => (
                <button key={s} type="button" className="dal-cv-suggestion" onClick={() => envoyer(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        <div ref={fin} />
      </div>

      <div className="dal-cv-bas">
        <div className="dal-cv-saisie" onClick={(e) => e.target === e.currentTarget && champ.current?.focus()}>
          <textarea
            ref={champ}
            rows={1}
            className="dal-cv-champ"
            aria-label="Votre question à Daliro sur ce chantier"
            placeholder={echanges.length ? "Répondre à Daliro…" : "Posez votre question sur ce chantier…"}
            value={texte}
            onChange={(e) => {
              setTexte(e.target.value);
              ajuster();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                envoyer(texte);
              }
            }}
          />
          <button type="button" className="dal-cv-envoi" disabled={texte.trim().length < 3 || enCours} onClick={() => envoyer(texte)} aria-label="Envoyer la question" title="Envoyer (Entrée)">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M8 13V3.5M3.75 7.5 8 3.25l4.25 4.25" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
        <p className="dal-cv-mention">Daliro répond à partir des données du chantier et peut se tromper : vérifiez les chiffres importants.</p>
      </div>
    </div>
  );
}
