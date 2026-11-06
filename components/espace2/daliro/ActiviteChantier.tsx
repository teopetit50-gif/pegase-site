"use client";

/* ══════════════════════════════════════════════════════════════════════
   DALIRO › fiche d'un chantier : l'onglet Activité, copie de l'onglet
   « Activity » d'une Initiative de Linear (02/11/2026, relevé
   linear-initiative.md § Onglet Activity ; styles ./dal-ini.css).

   Colonne de 813 centrée ; regroupement par mois (« Novembre ») ; chaque
   message du terrain (fil du chantier, origine d'un avenant) est une carte
   de mise à jour (pastille, avatar, auteur, date, texte, actions) ; les
   autres faits (confirmations, signatures, ouverture, création) sont des
   lignes d'événement (icône 16, 12/450/16.8, auteur en 500, « · date »).

   Le composeur « Comment | Update » de Linear (02/11, décision de Teo : une
   utilité à chaque bouton) : « Question » pose la question à Daliro, l'IA
   branchée sur l'API Claude (06/11, /api/daliro/question) : la réponse
   s'écrit en direct sous le composeur, à partir des données du chantier
   (./contexteChantier.ts) ; elle peut ensuite être envoyée au chef d'équipe
   (poserQuestion, réponse dans Terrain › Questions) ; « Avenant » ouvre la
   fenêtre « Ouvrir un avenant » de ChantierVue, l'objet pré-rempli ; le
   trombone rattache une facture. Le fil, lui, se remplit par WhatsApp et
   courriel. Les gestes d'un message (ouvrir un avenant, écarter) et ses fenêtres
   restent ceux de FilCarte (prop rendu).
   ══════════════════════════════════════════════════════════════════════ */

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import FilCarte, { type FilRendu } from "@/components/espace/daliro/FilCarte";
import type { Source } from "@/components/espace/source";
import type { MessageChantier, Tableau } from "@/components/espace/daliro/types";
import { dateHeure } from "@/components/espace/format";
import { Avis } from "@/components/espace/ui";
import { DalIcone } from "./DalIcone";
import { chronique, initiales, type Nouvelle } from "./ApercuChantier";
import { contexteChantier } from "./contexteChantier";
import "./dal-ini.css";

const MOIS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
const MOIS_COURT = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const CANAL: Record<string, string> = { whatsapp: "WhatsApp", sms: "SMS", email: "Courriel", courriel: "Courriel" };

/* « Oct 29 » de Linear : « 29 oct. » */
const jourMois = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : `${d.getDate()} ${MOIS_COURT[d.getMonth()]}`;
};
const cleMois = (iso: string) => iso.slice(0, 7);
const nomMois = (cle: string) => {
  const [a, m] = cle.split("-").map(Number);
  return `${MOIS[m - 1]}${a !== new Date().getFullYear() ? ` ${a}` : ""}`;
};

type Element = { cle: string; quand: string } & ({ genre: "message"; m: MessageChantier } | { genre: "origine"; n: Nouvelle } | { genre: "evenement"; n: Nouvelle });

type Actions = { question: (texte: string) => void; avenant: (objet: string) => void; facture: () => void; avenantPossible: boolean };

/* une question posée à Daliro et sa réponse, écrite en direct */
type Echange = { id: number; question: string; reponse: string; enCours: boolean; quand: string };

export function ActiviteChantier({ t, source, relire, ici, actions }: { t: Tableau; source: Source; relire: () => Promise<void>; ici: string; actions: Actions }) {
  const faits = useMemo(() => chronique(t, ici), [t, ici]);
  const [echanges, setEchanges] = useState<Echange[]>([]);
  const majEchange = (id: number, f: (e: Echange) => Echange) => setEchanges((xs) => xs.map((e) => (e.id === id ? f(e) : e)));

  const demander = async (question: string, messages: MessageChantier[]) => {
    const id = Date.now();
    const historique = echanges.filter((e) => !e.enCours).slice(0, 6).reverse().map((e) => ({ question: e.question, reponse: e.reponse }));
    setEchanges((xs) => [{ id, question, reponse: "", enCours: true, quand: new Date().toISOString() }, ...xs]);
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
        majEchange(id, (e) => ({ ...e, reponse: e.reponse + morceau }));
      }
    } catch (e) {
      majEchange(id, (x) => ({ ...x, reponse: x.reponse || (e instanceof Error ? e.message : "Daliro n'a pas pu répondre. Réessayez.") }));
    } finally {
      majEchange(id, (x) => ({ ...x, enCours: false }));
    }
  };

  return (
    <FilCarte
      tableau={t}
      source={source}
      relire={relire}
      rendu={(f) => (
        <div className="dal-ini-activite">
          <Composeur actions={actions} demander={(q) => void demander(q, f.messages)} />
          {echanges.length ? (
            <section className="dal-ini-mois dal-ini-questions" aria-label="Vos questions à Daliro" aria-live="polite">
              <h3 className="dal-ini-mois-titre">Vos questions</h3>
              {echanges.map((e) => (
                <CarteEchange key={e.id} e={e} envoyer={() => actions.question(e.question)} />
              ))}
            </section>
          ) : null}
          <Activite f={f} faits={faits} ici={ici} />
        </div>
      )}
    />
  );
}

/* la question (« Vous ») puis la réponse de Daliro, dans la carte de mise à jour du fil */
function CarteEchange({ e, envoyer }: { e: Echange; envoyer: () => void }) {
  const [copie, setCopie] = useState(false);
  return (
    <article className="dal-ini-maj dal-ini-maj--fil dal-ini-echange" aria-label={`Question : ${e.question}`}>
      <div className="dal-ini-meta">
        <span className="dal-ini-canal">
          <DalIcone nom="Chat" />
          Question
        </span>
        <span className="dal-ini-avatar">V</span>
        <span className="dal-ini-auteur">Vous</span>
        <span className="dal-ini-quand" title={dateHeure(e.quand)}>
          {jourMois(e.quand)}
        </span>
      </div>
      <p className="dal-ini-texte">{e.question}</p>
      <div className="dal-ini-meta dal-ini-echange-tete">
        <span className="dal-ini-canal" data-teinte="on">
          <DalIcone nom="Crane" />
          Daliro
        </span>
        <span className="dal-ini-quand">{e.enCours ? (e.reponse ? "écrit…" : "lit le chantier…") : "réponse"}</span>
      </div>
      <p className="dal-ini-texte dal-ini-reponse" data-attente={e.enCours && !e.reponse ? "" : undefined}>
        {e.reponse || "…"}
      </p>
      {!e.enCours ? (
        <div className="dal-ini-actions">
          <button
            type="button"
            className="dal-ini-reaction"
            aria-label="Copier la réponse"
            title={copie ? "Copiée" : "Copier la réponse"}
            onClick={() => {
              void navigator.clipboard?.writeText(e.reponse);
              setCopie(true);
            }}
          >
            <DalIcone nom={copie ? "IssueStatusDone" : "Page"} taille={14} />
          </button>
          <button type="button" className="dal-ini-lien" onClick={envoyer}>
            Poser aussi au chef d&apos;équipe
          </button>
        </div>
      ) : null}
    </article>
  );
}

/* le composeur, façon champ de commentaire de Linear (05/11, « plus propre et compréhensible ») :
   le champ d'abord (une ligne, il grandit avec le texte), puis un pied avec les deux usages à
   gauche (icône + mot), une ligne qui dit ce qui va se passer, le trombone et l'envoi rond à
   droite, bleu dès que le texte suffit. */
const MODES = {
  question: {
    icone: "Chat",
    libelle: "Question",
    placeholder: "Posez une question sur ce chantier… (qui vient lundi ? qu'est-ce qui bloque ?)",
    aide: "Daliro répond à partir des données du chantier",
    envoi: "Demander à Daliro",
  },
  avenant: {
    icone: "Signature",
    libelle: "Avenant",
    placeholder: "Décrivez ce qui est demandé en plus du marché…",
    aide: "Prépare un avenant à partir de ce texte",
    envoi: "Préparer l'avenant",
  },
} as const;

function Composeur({ actions, demander }: { actions: Actions; demander: (question: string) => void }) {
  const [mode, setMode] = useState<"question" | "avenant">("question");
  const [texte, setTexte] = useState("");
  const champ = useRef<HTMLTextAreaElement>(null);
  const m = MODES[mode];
  const bloque = mode === "avenant" && !actions.avenantPossible;
  const pret = texte.trim().length >= 3 && !bloque;
  const ajuster = () => {
    const el = champ.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };
  const envoyer = () => {
    if (!pret) return;
    if (mode === "question") demander(texte.trim());
    else actions.avenant(texte.trim());
    setTexte("");
    requestAnimationFrame(ajuster);
  };
  const choisir = (suivant: "question" | "avenant") => {
    setMode(suivant);
    champ.current?.focus();
  };
  return (
    <div className="dal-ini-composeur" onClick={(e) => e.target === e.currentTarget && champ.current?.focus()}>
      <textarea
        ref={champ}
        rows={1}
        className="dal-ini-composeur-champ"
        aria-label={mode === "question" ? "Votre question sur le chantier" : "Ce qui est demandé en plus du marché"}
        placeholder={m.placeholder}
        value={texte}
        onChange={(e) => {
          setTexte(e.target.value);
          ajuster();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            envoyer();
          }
        }}
      />
      <div className="dal-ini-composeur-pied">
        <div className="dal-ini-composeur-modes" role="radiogroup" aria-label="Ce que vous écrivez">
          {(["question", "avenant"] as const).map((cle) => (
            <button key={cle} type="button" role="radio" aria-checked={mode === cle} className="dal-ini-composeur-mode" onClick={() => choisir(cle)}>
              <DalIcone nom={MODES[cle].icone} taille={14} />
              {MODES[cle].libelle}
            </button>
          ))}
        </div>
        <span className="dal-ini-composeur-aide">{bloque ? "Un avenant se prépare sur un chantier ouvert" : m.aide}</span>
        <button type="button" className="dal-ini-composeur-icone" aria-label="Rattacher une facture" title="Rattacher une facture" onClick={actions.facture}>
          <DalIcone nom="Attachment" taille={16} />
        </button>
        <button type="button" className="dal-ini-composeur-envoi" disabled={!pret} onClick={envoyer} aria-label={m.envoi} title={`${m.envoi} (⌘ Entrée)`}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M8 13V3.5M3.75 7.5 8 3.25l4.25 4.25" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function Activite({ f, faits, ici }: { f: FilRendu; faits: Nouvelle[]; ici: string }) {
  const elements: Element[] = [
    ...f.messages.map((m) => ({ cle: `f-${m.id}`, quand: m.recu_le, genre: "message" as const, m })),
    ...faits.map((n) => ({ cle: n.cle, quand: n.quand, genre: n.genre === "message" ? ("origine" as const) : ("evenement" as const), n })),
  ].sort((a, b) => b.quand.localeCompare(a.quand));
  const mois = [...new Set(elements.map((e) => cleMois(e.quand)))];

  return (
    <>
      {f.fait ? <Avis teinte="vert" role="status">{f.fait}</Avis> : null}
      {f.erreur ? <Avis teinte="rouge" role="alert">{f.erreur}</Avis> : null}
      {f.chargement ? <p className="dal-ini-aide">Lecture du fil…</p> : null}
      {mois.map((cle) => (
        <section key={cle} className="dal-ini-mois" aria-label={nomMois(cle)}>
          <h3 className="dal-ini-mois-titre">{nomMois(cle)}</h3>
          {elements
            .filter((e) => cleMois(e.quand) === cle)
            .map((e) =>
              e.genre === "message" ? (
                <CarteMessage key={e.cle} m={e.m} f={f} />
              ) : e.genre === "origine" ? (
                <CarteOrigine key={e.cle} n={e.n} ici={ici} />
              ) : (
                <div key={e.cle} className="dal-ini-evenement dal-ini-evenement--fil">
                  <DalIcone nom={e.n.genre === "confirmation" ? "Calendar" : e.n.cle === "cree" ? "Created" : e.n.etat === "Signé" ? "Signature" : "Crane"} />
                  <span>
                    {e.n.auteur ? <strong>{e.n.auteur}</strong> : null} {e.n.auteur ? e.n.texte : e.n.texte.charAt(0).toUpperCase() + e.n.texte.slice(1)}
                    <span title={dateHeure(e.n.quand)}> · {jourMois(e.n.quand)}</span>
                  </span>
                </div>
              ),
            )}
        </section>
      ))}
      {!f.chargement && !elements.length ? <p className="dal-ini-aide">Rien encore : les photos, vocaux et messages que le chef d&apos;équipe envoie au numéro WhatsApp de l&apos;entreprise s&apos;affichent ici.</p> : null}
      {f.fenetres}
    </>
  );
}

function CarteMessage({ m, f }: { m: MessageChantier; f: FilRendu }) {
  const auteur = m.de_nom ?? m.de_adresse ?? "Expéditeur inconnu";
  const recu = dateHeure(m.recu_le);
  const demandes = m.lecture?.demandes ?? [];
  const transcriptions = (m.lecture?.medias ?? []).filter((x) => x.transcription);
  const aConfirmer = demandes.filter((d) => !d.verifiee).length;
  return (
    <article className="dal-ini-maj dal-ini-maj--fil" aria-label={`Message de ${auteur}, ${recu}`}>
      <div className="dal-ini-meta">
        <span className="dal-ini-canal" data-teinte={aConfirmer ? "risk" : m.avenant_id ? "on" : undefined}>
          <DalIcone nom={m.pieces.some((p) => p.vocal) ? "Mic" : m.pieces.length ? "Image" : "Chat"} />
          {CANAL[m.canal] ?? "Message"}
        </span>
        <span className="dal-ini-avatar">{initiales(auteur) || "?"}</span>
        <span className="dal-ini-auteur">{auteur}</span>
        <span className="dal-ini-quand" title={recu}>
          {jourMois(m.recu_le)}
        </span>
      </div>
      {m.texte ? <p className="dal-ini-texte">« {m.texte} »</p> : null}
      {transcriptions.map((x) => (
        <p key={x.n} className="dal-ini-texte">
          Vocal{x.duree_s ? ` (${x.duree_s} s)` : ""} : « {x.transcription} »
        </p>
      ))}
      {m.lecture?.resume ? <p className="dal-ini-texte dal-ini-texte--lu">Lu par Daliro : {m.lecture.resume}</p> : null}
      {demandes.length ? (
        <ul className="dal-ini-demandes">
          {demandes.map((d, k) => (
            <li key={k}>
              {d.nature === "avancement"
                ? `Avancement${d.lot_code ? ` (lot ${d.lot_code})` : ""} : ${d.ouvrage ?? d.texte ?? "ouvrage non nommé"}${d.pourcentage != null ? `, ${d.pourcentage} %` : ""}`
                : `${d.nature === "travail_supplementaire" ? "Travail supplémentaire" : d.nature === "probleme" ? "Problème" : d.nature === "question" ? "Question" : "Information"} : ${d.texte ?? ""}${d.quantite != null ? `, ${d.quantite} ${d.unite ?? ""}`.trimEnd() : ""}`}
              <span className="dal-ini-demande-etat"> · {d.verifiee ? "vérifié" : "à confirmer"}</span>
              {d.nature === "travail_supplementaire" && !d.verifiee && !m.avenant_id ? (
                <>
                  {" "}
                  <button type="button" className="dal-ini-lien" disabled={f.envoi} onClick={() => f.ouvrirAvenant(m, `${d.texte ?? ""}${d.quantite != null ? ` — ${d.quantite} ${d.unite ?? ""}`.trimEnd() : ""}`)}>
                    Ouvrir l&apos;avenant
                  </button>
                </>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      {m.pieces.length ? <div className="dal-ini-medias">{m.pieces.map((x) => <span key={x.chemin}>{f.media(x, auteur, recu)}</span>)}</div> : null}
      <div className="dal-ini-actions">
        {!m.avenant_id ? (
          <button type="button" className="dal-ini-commentaires" disabled={f.envoi} aria-label="Ouvrir un avenant depuis ce message" title="Ouvrir un avenant depuis ce message" onClick={() => f.ouvrirAvenant(m)}>
            <DalIcone nom="Signature" />
          </button>
        ) : (
          <span className="dal-ini-commentaires" title="Un avenant est ouvert depuis ce message">
            <DalIcone nom="Signature" />
          </span>
        )}
        <button type="button" className="dal-ini-reaction" disabled={f.envoi} aria-label="Écarter ce message du fil" title="Écarter ce message du fil" onClick={() => f.ecarter(m)}>
          <DalIcone nom="Archive" taille={14} />
        </button>
      </div>
    </article>
  );
}

/* un message du terrain à l'origine d'un avenant (tiré de l'avenant) */
function CarteOrigine({ n, ici }: { n: Nouvelle; ici: string }) {
  return (
    <article className="dal-ini-maj dal-ini-maj--fil" aria-label={`Message de ${n.auteur ?? "l'expéditeur"}`}>
      <div className="dal-ini-meta">
        <span className="dal-ini-canal" data-teinte="on">
          <DalIcone nom="Chat" />
          {n.etat}
        </span>
        {n.auteur ? (
          <>
            <span className="dal-ini-avatar">{initiales(n.auteur) || "?"}</span>
            <span className="dal-ini-auteur">{n.auteur}</span>
          </>
        ) : null}
        <span className="dal-ini-quand" title={dateHeure(n.quand)}>
          {jourMois(n.quand)}
        </span>
      </div>
      <p className="dal-ini-texte">« {n.texte} »</p>
      <div className="dal-ini-actions">
        <Link href={n.lien === ici ? ici : n.lien} className="dal-ini-commentaires" aria-label={n.lienLibelle} title={n.lienLibelle}>
          <DalIcone nom="Signature" />
        </Link>
      </div>
    </article>
  );
}
