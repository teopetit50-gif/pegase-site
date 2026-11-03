"use client";

/* ══════════════════════════════════════════════════════════════════════
   Le visuel de la Formation (03/11/2026), choisi par Teo : « B + C ».
   · Accueil (direction B) : les parcours en cartes, chacune avec son
     nombre de vidéos et sa durée.
   · Page d'un module (direction C) : une ligne par geste, vignette et
     durée à gauche, titre et texte à droite ; la vidéo s'ouvre sur place.
     Les sections sans vidéo (écrans, garde-fous) se lisent comme du texte.
   Maquettes et captures des trois directions proposées : branche
   claude/formation-visuel, docs/formation/visuel/DIRECTIONS.md.
   ══════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Play } from "lucide-react";
import Lecteur from "../Lecteur";
import type { VideoFormation } from "../videos";
import "./vues.css";

export type Carte = { cle: string; titre: string; resume: string; videos: number; minutes: number; icone: ReactNode };
export type Parcours = { titre: string; sousTitre: string; cartes: Carte[] };

const horloge = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;
const minutes = (secondes: number) => Math.max(1, Math.round(secondes / 60));

/* ——— l'accueil ——— */
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
              <Link key={c.cle} href={`/espace2/formation/${c.cle}`} className="mq-carte">
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

/* ——— la page d'un module ——— */
export type Ligne = { id: string; titre: string; niveau: 2 | 3; rang?: number; video?: VideoFormation; corps: ReactNode };

function Vignette({ video, ouvrir }: { video: VideoFormation; ouvrir: () => void }) {
  return (
    <button type="button" className="mq-vignette" onClick={ouvrir} aria-label={`Lire « ${video.titre} »`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={video.affiche} alt="" />
      <span className="mq-vignette-lire">
        <Play width={14} height={14} fill="currentColor" strokeWidth={0} aria-hidden="true" />
      </span>
      <span className="mq-vignette-duree">{horloge(video.duree)}</span>
    </button>
  );
}

export function PageModule({
  titre,
  intro,
  video,
  lignes,
  suivant,
}: {
  titre: string;
  intro: ReactNode;
  video?: VideoFormation;
  lignes: Ligne[];
  suivant?: { titre: string; href: string };
}) {
  const [ouvert, setOuvert] = useState<string | null>(null);
  const gestes = lignes.filter((l) => l.video);
  const total = gestes.reduce((t, l) => t + (l.video?.duree ?? 0), 0) + (video?.duree ?? 0);
  return (
    <div className="mq mq--etroit">
      <header className="mq-tete">
        <p className="mq-sur">
          <Link href="/espace2/formation" className="mq-fil">
            Formation
          </Link>
        </p>
        <h1 className="mq-h1">{titre}</h1>
        <p className="mq-intro">{intro}</p>
        {gestes.length + (video ? 1 : 0) > 0 && (
          <p className="mq-chiffres">
            {gestes.length ? `${gestes.length} geste${gestes.length > 1 ? "s" : ""}` : "1 vidéo"} · {minutes(total)} min
          </p>
        )}
        {video && (
          <div className="mq-tete-video">
            <Lecteur {...video} />
          </div>
        )}
      </header>
      <div className="mq-pas">
        {lignes.map((l) =>
          l.video ? (
            <section key={l.id} id={l.id} className="mq-pas-ligne" data-ouvert={ouvert === l.id ? "" : undefined}>
              {ouvert === l.id ? (
                <div className="mq-pas-lecteur">
                  <Lecteur {...l.video} />
                </div>
              ) : (
                <Vignette video={l.video} ouvrir={() => setOuvert(l.id)} />
              )}
              <div className="mq-pas-texte">
                <p className="mq-pas-rang">Geste {l.rang}</p>
                <h2>{l.titre}</h2>
                {l.corps}
              </div>
            </section>
          ) : (
            <section key={l.id} id={l.id} className="mq-pas-section" data-niveau={l.niveau}>
              {l.niveau === 2 ? <h2>{l.titre}</h2> : <h3>{l.titre}</h3>}
              {l.corps}
            </section>
          ),
        )}
      </div>
      {suivant && (
        <Link href={suivant.href} className="mq-suivant">
          <span className="mq-suivant-sur">Suivant</span>
          <span className="mq-suivant-titre">{suivant.titre}</span>
        </Link>
      )}
    </div>
  );
}
