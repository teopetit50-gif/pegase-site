"use client";

/* La section « Demi-journées vides » (06/10/2026, session B3, b3_19) : sur
   les quatorze prochains jours, les demi-journées où un praticien consulte
   mais dont l'agenda reste sous le seuil d'occupation du cabinet. Elle donne
   les heures libres et les patients de la liste d'attente qui pourraient les
   remplir. Le titulaire voit tous les praticiens ; un collaborateur ne voit
   que son propre agenda. On ne regarde que l'avenir : c'est un agenda à
   remplir, pas une note. */

import { Pastille, Vide } from "../ui";
import type { DemiJournees as DemiJourneesT, DemiJourneeVide } from "./types";

function duree(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${String(m).padStart(2, "0")}` : `${h} h`;
}

function jourEnClair(jour: string): string {
  const d = new Date(`${jour}T12:00:00`);
  if (Number.isNaN(d.getTime())) return jour;
  return new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" }).format(d);
}

function proche(jour: string, du: string): "aujourd'hui" | "demain" | null {
  if (jour === du) return "aujourd'hui";
  const d = new Date(`${du}T12:00:00`);
  d.setDate(d.getDate() + 1);
  return jour === d.toISOString().slice(0, 10) ? "demain" : null;
}

export default function DemiJournees({ demiJournees, titulaire }: { demiJournees: DemiJourneesT | null; titulaire: boolean }) {
  if (!demiJournees) return null;
  const liste: DemiJourneeVide[] = demiJournees.demi_journees;
  const libres = liste.reduce((n, x) => n + x.libre_min, 0);
  return (
    <section id="tiroma-demi-journees" className="esp-carte" aria-label="Demi-journées vides">
      <div className="esp-carte-tete">
        <h2 className="esp-carte-titre">Demi-journées vides</h2>
        <span className="esp-kpi-sous">
          {liste.length ? `${liste.length} demi-journée${liste.length > 1 ? "s" : ""} à remplir, ${duree(libres)} libres sur quatorze jours` : "Rien à remplir sur quatorze jours"}
        </span>
      </div>
      <div className="esp-carte-corps" style={{ display: "grid", gap: 14 }}>
        {!liste.length ? (
          <Vide titre="Aucune demi-journée vide">Une demi-journée remonte ici quand un praticien consulte mais que son agenda reste sous le seuil d&apos;occupation du cabinet.</Vide>
        ) : (
          <ul className="esp-liste" aria-label="Demi-journées à remplir">
            {liste.map((x) => {
              const quand = proche(x.jour, demiJournees.du);
              return (
                <li key={`${x.praticien_id}-${x.jour}-${x.moment}`} className="esp-item" style={{ cursor: "default" }}>
                  <span className="esp-item-haut">
                    {quand ? <Pastille teinte="ambre">{quand === "demain" ? "Demain" : "Aujourd'hui"}</Pastille> : null}
                    <Pastille teinte={x.prevu_min === 0 ? "rouge" : "gris"}>{x.prevu_min === 0 ? "Aucun rendez-vous" : `Occupée à ${Math.round(x.taux * 100)} %`}</Pastille>
                  </span>
                  <span className="esp-item-titre">{titulaire ? `${x.praticien} — ` : ""}{jourEnClair(x.jour)}, {x.moment === "matin" ? "matin" : "après-midi"}</span>
                  <span className="esp-item-bas">
                    <span>{duree(x.libre_min)} libres sur {duree(x.ouvert_min)}</span>
                    <span>{x.attente ? `${x.attente} patient${x.attente > 1 ? "s" : ""} en liste d'attente pourrai${x.attente > 1 ? "ent" : "t"} la remplir` : "Personne en liste d'attente pour ce créneau"}</span>
                    {x.source === "habitude" ? <span>D&apos;après ses demi-journées habituelles</span> : null}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        <p className="esp-fil-meta">
          {titulaire
            ? "Vous seul voyez l'agenda de chaque praticien ; un collaborateur ne voit que le sien. Le point du matin vous les signale sept jours à l'avance."
            : "Votre agenda seulement : vos collègues ne voient pas le vôtre."}
        </p>
      </div>
    </section>
  );
}
