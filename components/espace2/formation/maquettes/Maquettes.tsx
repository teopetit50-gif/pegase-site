"use client";

/* ══════════════════════════════════════════════════════════════════════
   Maquettes du visuel de la Formation (03/11/2026, branche
   claude/formation-visuel, jamais mise en ligne).

   Deux directions à montrer à Teo à côté de la page actuelle (A,
   « Documentation », sur le Start Guide de Linear) :
   · B « Académie » : un accueil qui présente les parcours en cartes, puis
     chaque module comme une leçon : la liste des gestes à gauche, la vidéo
     et son texte à droite, « Geste suivant » en bas.
   · C « Pas à pas » : la page d'un module en lignes, une par geste,
     vignette vidéo à gauche, texte à droite ; la vidéo s'ouvre sur place.
   Mêmes données (pages.ts, videos.ts), mêmes jetons --v2-*.
   ══════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, Play } from "lucide-react";
import Lecteur from "../Lecteur";
import type { PageFormation } from "../pages";
import { gestesDe } from "./gestes";
import "./maquettes.css";

export type Carte = { cle: string; titre: string; resume: string; videos: number; minutes: number; icone: ReactNode };
export type Parcours = { titre: string; sousTitre: string; cartes: Carte[] };

const horloge = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;


/* ——— B · l'accueil de l'Académie ——— */
export function Accueil({ parcours, total }: { parcours: Parcours[]; total: { videos: number; minutes: number } }) {
  return (
    <div className="mq">
      <header className="mq-tete">
        <p className="mq-sur">Formation</p>
        <h1 className="mq-h1">Apprendre Omega, un geste à la fois</h1>
        <p className="mq-intro">
          Des vidéos courtes, une par geste, filmées sur l&apos;espace tel que vous le voyez. Commencez par « Bien démarrer », puis suivez vos systèmes et votre
          métier.
        </p>
        <p className="mq-chiffres">
          {total.videos} vidéos · {total.minutes} min au total
        </p>
      </header>
      {parcours.map((p) => (
        <section key={p.titre} className="mq-parcours">
          <div className="mq-parcours-tete">
            <h2>{p.titre}</h2>
            <p>{p.sousTitre}</p>
          </div>
          <div className="mq-grille">
            {p.cartes.map((c) => (
              <Link key={c.cle} href={`/espace2/formation/maquette/lecon?page=${c.cle}`} className="mq-carte">
                <span className="mq-carte-icone">{c.icone}</span>
                <span className="mq-carte-titre">{c.titre}</span>
                <span className="mq-carte-resume">{c.resume}</span>
                <span className="mq-carte-meta">
                  <Play width={12} height={12} aria-hidden="true" /> {c.videos} vidéo{c.videos > 1 ? "s" : ""} · {c.minutes} min
                </span>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

/* ——— B · un module en leçon ——— */
export function Lecon({ page, corps }: { page: PageFormation; corps: Record<string, ReactNode> }) {
  const gestes = gestesDe(page);
  const [rang, setRang] = useState(0);
  const g = gestes[rang];
  if (!g) return null;
  return (
    <div className="mq-lecon">
      <nav className="mq-liste" aria-label="Les gestes">
        <Link href="/espace2/formation/maquette/academie" className="mq-retour">
          <ArrowLeft width={14} height={14} aria-hidden="true" /> Formation
        </Link>
        <p className="mq-liste-titre">{page.titre}</p>
        <p className="mq-liste-meta">
          {gestes.length} gestes · {Math.round(gestes.reduce((t, x) => t + x.video.duree, 0) / 60)} min
        </p>
        <ol>
          {gestes.map((x, i) => (
            <li key={x.id}>
              <button type="button" className="mq-geste" data-actif={i === rang ? "" : undefined} aria-current={i === rang ? "step" : undefined} onClick={() => setRang(i)}>
                <span className="mq-geste-rang">{i + 1}</span>
                <span className="mq-geste-titre">{x.titre}</span>
                <span className="mq-geste-duree">{horloge(x.video.duree)}</span>
              </button>
            </li>
          ))}
        </ol>
      </nav>
      <article className="mq-scene">
        <p className="mq-sur">
          {page.titre} · geste {rang + 1} sur {gestes.length}
        </p>
        <h1 className="mq-h1 mq-h1--lecon">{g.titre}</h1>
        <Lecteur key={g.id} {...g.video} />
        <div className="mq-texte">{corps[g.id]}</div>
        <div className="mq-pied">
          <button type="button" className="v2-btn" disabled={rang === 0} onClick={() => setRang(rang - 1)}>
            <ArrowLeft width={14} height={14} aria-hidden="true" /> Geste précédent
          </button>
          <button type="button" className="v2-btn v2-btn--primaire" disabled={rang === gestes.length - 1} onClick={() => setRang(rang + 1)}>
            Geste suivant <ArrowRight width={14} height={14} aria-hidden="true" />
          </button>
        </div>
      </article>
    </div>
  );
}

/* ——— C · pas à pas ——— */
export function PasAPas({ page, corps, intro }: { page: PageFormation; corps: Record<string, ReactNode>; intro: ReactNode }) {
  const gestes = gestesDe(page);
  const [ouvert, setOuvert] = useState<string | null>(null);
  return (
    <div className="mq mq--etroit">
      <header className="mq-tete">
        <p className="mq-sur">Formation</p>
        <h1 className="mq-h1">{page.titre}</h1>
        <p className="mq-intro">{intro}</p>
        <p className="mq-chiffres">
          {gestes.length} gestes · {Math.round(gestes.reduce((t, x) => t + x.video.duree, 0) / 60)} min
        </p>
      </header>
      <ol className="mq-pas">
        {gestes.map((g, i) => (
          <li key={g.id} className="mq-pas-ligne" data-ouvert={ouvert === g.id ? "" : undefined}>
            {ouvert === g.id ? (
              <div className="mq-pas-lecteur">
                <Lecteur {...g.video} />
              </div>
            ) : (
              <button type="button" className="mq-vignette" onClick={() => setOuvert(g.id)} aria-label={`Lire « ${g.titre} »`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={g.video.affiche} alt="" />
                <span className="mq-vignette-lire">
                  <Play width={14} height={14} fill="currentColor" strokeWidth={0} aria-hidden="true" />
                </span>
                <span className="mq-vignette-duree">{horloge(g.video.duree)}</span>
              </button>
            )}
            <div className="mq-pas-texte">
              <p className="mq-pas-rang">Geste {i + 1}</p>
              <h2>{g.titre}</h2>
              {corps[g.id]}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
