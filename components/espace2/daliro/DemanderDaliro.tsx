"use client";

/* ══════════════════════════════════════════════════════════════════════
   DALIRO — « Demander à Daliro » (05/11/2026)

   La promesse du site : « Interrogez vos chantiers en français : posez une
   question comme « qui vient lundi à Jules-Ferry ? », Daliro répond à partir
   des messages, du planning et des devis de vos chantiers ». Jusqu'ici elle
   ne se posait que dans la fiche d'un chantier ; ici, pour toute l'entreprise.

   Référence validée par Teo : Attio, panneau « Ask Attio » (relevé et écarts
   dans ./dal-ask.css). Les réponses sont CALCULÉES sur les tableaux des
   chantiers (useDaliro) : passages, confirmations, avenants, lots. Une
   question que ce calcul ne sait pas traiter reçoit une réponse qui le dit,
   jamais une réponse inventée.
   ══════════════════════════════════════════════════════════════════════ */

import { useMemo, useState } from "react";
import Link from "next/link";
import { montant } from "@/components/espace/format";
import type { Tableau } from "@/components/espace/daliro/types";
import { RACINE } from "../modules";
import { copierEtDire } from "../Toasts";
import { DalIcone } from "./DalIcone";
import { useDaliro } from "./donnees";
import "./dal-ask.css";

const BASE = `${RACINE}/daliro`;
type Source = { titre: string; sous: string; href: string };
type Reponse = { paragraphes: string[]; puces?: string[]; fin?: string; sources: Source[] };
type Echange = { question: string; reponse: Reponse };

const JOURS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const jourFr = (s: string) => new Date(`${s}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
const sansAccents = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/* le chantier nommé dans la question : le plus de mots du nom retrouvés */
function chantierDe(q: string, tableaux: Tableau[]): Tableau | null {
  const mots = sansAccents(q).split(/[^a-z0-9]+/).filter((m) => m.length > 2);
  let meilleur: Tableau | null = null;
  let score = 0;
  for (const t of tableaux) {
    const nom = sansAccents(`${t.chantier.nom} ${t.chantier.commune} ${t.chantier.maitre_ouvrage_nom ?? ""}`);
    const s = mots.filter((m) => nom.includes(m)).length;
    if (s > score) {
      score = s;
      meilleur = t;
    }
  }
  return meilleur;
}

/* le jour visé : « lundi » = le prochain lundi (aujourd'hui compris), « demain », sinon aujourd'hui */
function jourDe(q: string): string {
  const s = sansAccents(q);
  const d = new Date();
  if (s.includes("demain")) {
    d.setDate(d.getDate() + 1);
    return iso(d);
  }
  const i = JOURS.findIndex((j) => s.includes(j));
  if (i >= 0) d.setDate(d.getDate() + ((i - d.getDay() + 7) % 7));
  return iso(d);
}

function repondre(q: string, tableaux: Tableau[]): Reponse {
  const s = sansAccents(q);
  const lien = (t: Tableau, suite = "") => `${BASE}/chantiers/${t.chantier.id}${suite}`;

  /* qui vient … ? → le planning du chantier ce jour-là */
  if (/qui vient|qui passe|qui est (la|prevu)|qui intervient/.test(s)) {
    const t = chantierDe(q, tableaux);
    const jour = jourDe(q);
    if (!t) return { paragraphes: ["Je n'ai pas reconnu le chantier dans votre question. Nommez-le, par exemple « qui vient lundi à Jean-Moulin ? »."], sources: [] };
    const la = t.passages.filter((p) => p.statut !== "annule" && p.debut <= jour && p.fin >= jour);
    if (!la.length) {
      const prochain = t.passages.filter((p) => p.statut !== "annule" && p.debut > jour).sort((a, b) => a.debut.localeCompare(b.debut))[0];
      return {
        paragraphes: [`Personne n'est prévu ${jourFr(jour)} sur ${t.chantier.nom}.`],
        fin: prochain ? `Le prochain passage : ${prochain.intervenant_nom ?? "un intervenant"} pour « ${prochain.tache ?? "un passage"} », à partir du ${jourFr(prochain.debut)}.` : undefined,
        sources: [{ titre: t.chantier.nom, sous: "Planning du chantier", href: lien(t, "?onglet=terrain#planning") }],
      };
    }
    const conf: Record<string, string> = { confirmee: "a confirmé", demandee: "demande de confirmation envoyée, pas encore de réponse", sans_reponse: "n'a pas répondu", declinee: "a décliné", non_demandee: "confirmation pas encore demandée" };
    return {
      paragraphes: [`${jourFr(jour).replace(/^./, (c) => c.toUpperCase())}, sur ${t.chantier.nom} (${t.chantier.commune}) :`],
      puces: la.map((p) => `${p.intervenant_nom ?? p.intervenant_lu ?? "Intervenant"} — ${p.tache ?? "passage"}${p.lot_libelle ? ` (lot ${p.lot_code} ${p.lot_libelle})` : ""}${p.heure_debut ? `, à partir de ${p.heure_debut.slice(0, 5).replace(":", " h ")}` : ""} : ${conf[p.confirmation] ?? p.confirmation}.`),
      fin: la.some((p) => p.confirmation === "sans_reponse" || p.confirmation === "declinee") ? "Un intervenant n'a pas confirmé : des remplaçants de votre annuaire sont proposés dans le planning." : "Tout le monde a reçu sa demande de confirmation à J-2.",
      sources: [{ titre: t.chantier.nom, sous: "Planning du chantier", href: lien(t, "?onglet=terrain#planning") }],
    };
  }

  /* hors devis / avenants d'un chantier */
  if (/pas au devis|hors devis|hors-devis|supplementaire|avenant/.test(s)) {
    const t = /tous|entreprise|chantiers/.test(s) ? null : chantierDe(q, tableaux);
    const cibles = t ? [t] : tableaux;
    const avs = cibles.flatMap((x) => x.avenants.filter((a) => a.statut !== "refuse" && a.statut !== "abandonne").map((a) => ({ t: x, a })));
    if (!avs.length) return { paragraphes: [t ? `Rien hors devis sur ${t.chantier.nom} : aucun avenant ouvert.` : "Aucun avenant ouvert sur vos chantiers."], sources: [] };
    const etat: Record<string, string> = { brouillon: "à chiffrer ou à soumettre", soumis: "en attente de signature", signe: "signé" };
    const total = avs.reduce((x, { a }) => x + (a.montant_ht ?? 0), 0);
    const nonSignes = avs.filter(({ a }) => a.statut !== "signe");
    return {
      paragraphes: [t ? `Hors devis sur ${t.chantier.nom} : ${avs.length} avenant${avs.length > 1 ? "s" : ""}, ${montant(total)} HT en tout.` : `Sur l'ensemble de vos chantiers : ${avs.length} avenants ouverts, ${montant(total)} HT.`],
      puces: avs.slice(0, 8).map(({ t: x, a }) => `${t ? "" : `${x.chantier.nom} — `}n° ${a.numero} ${a.objet} : ${montant(a.montant_ht ?? 0)} HT, ${etat[a.statut] ?? a.statut}.`),
      fin: nonSignes.length ? `${nonSignes.length} ne ${nonSignes.length > 1 ? "sont" : "est"} pas encore signé${nonSignes.length > 1 ? "s" : ""} : à faire signer avant que l'ouvrage soit refermé.` : "Tout est signé.",
      sources: (t ? [t] : [...new Set(avs.map(({ t: x }) => x))].slice(0, 3)).map((x) => ({ titre: x.chantier.nom, sous: "Avenants du chantier", href: `${BASE}/avenants` })),
    };
  }

  /* sous-traitants sans réponse */
  if (/pas repondu|sans reponse|pas confirme|n.ont pas|relancer|sous-traitant|sous traitant/.test(s)) {
    const auj = iso(new Date());
    const l = tableaux.flatMap((t) => t.passages.filter((p) => p.statut === "prevu" && p.fin >= auj && (p.confirmation === "sans_reponse" || p.confirmation === "declinee" || p.confirmation === "demandee")).map((p) => ({ t, p })));
    if (!l.length) return { paragraphes: ["Tous les intervenants des prochains jours ont confirmé leur passage."], sources: [] };
    const lib: Record<string, string> = { sans_reponse: "n'a pas répondu", declinee: "a décliné", demandee: "attend encore la réponse" };
    l.sort((a, b) => a.p.debut.localeCompare(b.p.debut));
    return {
      paragraphes: [`${l.length} passage${l.length > 1 ? "s" : ""} à venir sans confirmation ferme :`],
      puces: l.slice(0, 8).map(({ t, p }) => `${p.intervenant_nom ?? "Intervenant"}, ${jourFr(p.debut)} sur ${t.chantier.nom} (${p.tache ?? "passage"}) : ${lib[p.confirmation]}.`),
      fin: "Les relances sont dans À faire ; pour un refus, le planning propose des remplaçants de votre annuaire.",
      sources: [{ titre: "À faire", sous: "Confirmations J-2 à relancer", href: `${BASE}/a-faire` }],
    };
  }

  /* lots en dépassement / budget */
  if (/depass|budget|deborse|marge|perd/.test(s)) {
    const l = tableaux.flatMap((t) => t.debourse.filter((d) => (d.reste_ht ?? 0) < 0).map((d) => ({ t, d })));
    if (!l.length) return { paragraphes: ["Aucun lot ne dépasse son budget."], sources: [] };
    return {
      paragraphes: [`${l.length} lot${l.length > 1 ? "s dépassent" : " dépasse"} ce qui était engagé :`],
      puces: l.map(({ t, d }) => `${t.chantier.nom} — lot ${d.code} ${d.libelle} : dépassé de ${montant(-(d.reste_ht ?? 0))} HT.`),
      fin: "Si le dépassement vient d'un travail demandé par le client, il se rattrape par un avenant.",
      sources: l.slice(0, 3).map(({ t }) => ({ titre: t.chantier.nom, sous: "Lots et déboursé", href: lien(t) })),
    };
  }

  return {
    paragraphes: ["Je ne sais pas encore répondre à cette question à partir de vos chantiers. Je réponds sur le planning (« qui vient lundi à Jean-Moulin ? »), le hors devis (« qu'est-ce qui n'est pas au devis chez les Duret ? »), les sous-traitants qui n'ont pas confirmé et les lots qui dépassent leur budget."],
    sources: [],
  };
}

const PREMIERES = ["Qui vient lundi à Jean-Moulin ?", "Qu'est-ce qui n'est pas au devis chez les Duret ?", "Quels sous-traitants n'ont pas répondu ?"];
const SUITES = ["Quels lots dépassent leur budget ?", "Qu'est-ce qui n'est pas au devis sur tous les chantiers ?", "Qui vient demain à la boulangerie Ma Mie ?"];

export default function DemanderDaliro() {
  const { liste, tableau, demanderTous } = useDaliro();
  const [ouvert, setOuvert] = useState(false);
  const [historique, setHistorique] = useState(false);
  const [courante, setCourante] = useState(0);
  const [ajouts, setAjouts] = useState<Record<number, Echange[]>>({});
  const [saisie, setSaisie] = useState("");
  const tableaux = useMemo(() => liste.map((c) => tableau(c.id)).filter((t): t is Tableau => !!t), [liste, tableau]);
  const conversations = useMemo(() => PREMIERES.map((q) => [{ question: q, reponse: repondre(q, tableaux) }]), [tableaux]);
  const fil = [...(conversations[courante] ?? []), ...(ajouts[courante] ?? [])];

  const poser = (q: string) => {
    const t = q.trim();
    if (!t) return;
    setAjouts((a) => ({ ...a, [courante]: [...(a[courante] ?? []), { question: t, reponse: repondre(t, tableaux) }] }));
    setSaisie("");
  };

  return (
    <>
      <button
        type="button"
        className="dal-ask-ouvrir"
        onClick={() => {
          demanderTous();
          setOuvert((o) => !o);
        }}
        aria-expanded={ouvert}
      >
        <DalIcone nom="Chat" />
        <span>Demander à Daliro</span>
      </button>
      {ouvert ? (
        <aside className="dal-ask" aria-label="Demander à Daliro">
          <header className="dal-ask-tete">
            <button type="button" className="dal-ask-titre" onClick={() => setHistorique((h) => !h)} title="Conversations">
              {PREMIERES[courante]}
            </button>
            <button type="button" className="dal-ask-rond" aria-label="Nouvelle question" title="Nouvelle question" onClick={() => document.getElementById("dal-ask-saisie")?.focus()}>
              <DalIcone nom="Plus" taille={16} />
            </button>
            <button type="button" className="dal-ask-rond" aria-label="Conversations" title="Conversations" aria-expanded={historique} onClick={() => setHistorique((h) => !h)}>
              <DalIcone nom="Clock" taille={16} />
            </button>
            <button type="button" className="dal-ask-rond" aria-label="Fermer" title="Fermer" onClick={() => setOuvert(false)}>
              <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
                <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
            {historique ? (
              <div className="dal-ask-historique" role="menu">
                {PREMIERES.map((q, i) => (
                  <button
                    key={q}
                    type="button"
                    role="menuitem"
                    aria-current={i === courante ? "true" : undefined}
                    onClick={() => {
                      setCourante(i);
                      setHistorique(false);
                    }}
                  >
                    <DalIcone nom="Chat" taille={14} />
                    <span>{q}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </header>

          <div className="dal-ask-fil">
            {fil.map((e, i) => (
              <div key={i}>
                <div className="dal-ask-question">
                  <div className="dal-ask-bulle">
                    <span>{e.question}</span>
                  </div>
                  <div className="dal-ask-actions">
                    <button type="button" className="dal-ask-rond" aria-label="Copier la question" title="Copier la question" onClick={() => copierEtDire(e.question, "Question copiée.")}>
                      <DalIcone nom="Page" taille={16} />
                    </button>
                  </div>
                </div>
                <div className="dal-ask-reponse">
                  {e.reponse.paragraphes.map((p, j) => (
                    <p key={j}>{p}</p>
                  ))}
                  {e.reponse.puces ? (
                    <ul>
                      {e.reponse.puces.map((p, j) => (
                        <li key={j}>{p}</li>
                      ))}
                    </ul>
                  ) : null}
                  {e.reponse.sources.map((s) => (
                    <div key={s.href + s.titre} className="dal-ask-source">
                      <div className="dal-ask-source-texte">
                        <span className="dal-ask-source-titre">{s.titre}</span>
                        <span className="dal-ask-source-sous">{s.sous}</span>
                      </div>
                      <Link href={s.href} className="dal-ask-source-lien">
                        Ouvrir
                      </Link>
                    </div>
                  ))}
                  {e.reponse.fin ? <p>{e.reponse.fin}</p> : null}
                  <div className="dal-ask-actions">
                    <button
                      type="button"
                      className="dal-ask-rond"
                      aria-label="Copier la réponse"
                      title="Copier la réponse"
                      onClick={() => copierEtDire([...e.reponse.paragraphes, ...(e.reponse.puces ?? []).map((x) => `- ${x}`), e.reponse.fin ?? ""].join("\n"), "Réponse copiée.")}
                    >
                      <DalIcone nom="Page" taille={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            <div className="dal-ask-suites">
              {SUITES.map((q) => (
                <button key={q} type="button" className="dal-ask-suite" onClick={() => poser(q)}>
                  <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
                    <path d="M4 3v5a2 2 0 0 0 2 2h6M9.5 7.5 12 10l-2.5 2.5" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span>{q}</span>
                </button>
              ))}
            </div>
          </div>

          <form
            className="dal-ask-saisie"
            onSubmit={(e) => {
              e.preventDefault();
              poser(saisie);
            }}
          >
            <textarea
              id="dal-ask-saisie"
              value={saisie}
              placeholder="Posez une question sur vos chantiers…"
              onChange={(e) => setSaisie(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  poser(saisie);
                }
              }}
            />
            <div className="dal-ask-boutons">
              <span className="dal-ask-auto">Auto</span>
              <button type="submit" className="dal-ask-envoyer" aria-label="Envoyer" disabled={!saisie.trim()}>
                <DalIcone nom="Send" taille={14} />
              </button>
            </div>
          </form>
        </aside>
      ) : null}
    </>
  );
}
