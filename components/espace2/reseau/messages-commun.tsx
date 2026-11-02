"use client";

/* Réseau › Messages — les petites briques partagées par la liste, les
   conversations récentes et la conversation ouverte : l'avatar (rond, aux
   couleurs et aux initiales du kit des moteurs, ../lin/ListeFils), le
   point de présence, le texte d'un message avec ses mentions, les dates. */

import Link from "next/link";
import { Fragment } from "react";
import { Hash, Megaphone } from "lucide-react";
import { couleurDe, initialesDe } from "../lin/ListeFils";
import { MEMBRES } from "./membres";
import { VOUS, membre, presenceDe, type Message, type Salon } from "./messages-donnees";

export const RACINE_MESSAGES = "/espace2/reseau/messages";
export const ficheDe = (slug: string) => `/espace2/reseau/membres/${slug}`;
export const nomDe = (slug: string, nomVous: string) => (slug === VOUS ? nomVous : (membre(slug)?.nom ?? slug));

/* ——— l'avatar : rond comme ceux des boîtes des moteurs ; « vous » en neutre ——— */
export function Avatar({ slug, nomVous, taille = 32, presence }: { slug: string; nomVous: string; taille?: 18 | 24 | 32 | 40; presence?: boolean }) {
  const vous = slug === VOUS;
  return (
    <span className="ms-avatar" data-taille={taille} data-vous={vous ? "" : undefined} style={vous ? undefined : ({ "--ms-teinte": couleurDe(slug) } as React.CSSProperties)} aria-hidden="true">
      {initialesDe(nomDe(slug, nomVous))}
      {presence && !vous ? <span className="ms-presence" data-etat={presenceDe(slug)} /> : null}
    </span>
  );
}

/* l'icône d'un salon dans un rond teinté, comme l'avatar d'une ligne de boîte */
export function IconeSalon({ salon, taille = 32 }: { salon: Pick<Salon, "id" | "genre">; taille?: 18 | 24 | 32 }) {
  const I = salon.genre === "reseau" ? Megaphone : Hash;
  return (
    <span className="ms-avatar ms-avatar--salon" data-taille={taille} style={{ "--ms-teinte": couleurDe(salon.id) } as React.CSSProperties} aria-hidden="true">
      <I strokeWidth={1.8} />
    </span>
  );
}

export const libellePresence = (slug: string) => (presenceDe(slug) === "en-ligne" ? "en ligne" : "absent");

/* ——— le texte d'un message : `@slug` mène à la fiche du membre, `@vous` désigne l'organisation connectée ——— */
export function TexteMessage({ texte, nomVous }: { texte: string; nomVous: string }) {
  return (
    <>
      {texte.split(/(@[a-z0-9-]+)/g).map((x, i) => {
        if (!x.startsWith("@")) return <Fragment key={i}>{x}</Fragment>;
        const slug = x.slice(1);
        if (slug === VOUS)
          return (
            <span key={i} className="ms-mention" data-vous="">
              @{nomVous}
            </span>
          );
        const m = MEMBRES.find((y) => y.slug === slug);
        return m ? (
          <Link key={i} href={ficheDe(slug)} className="ms-mention">
            @{m.nom}
          </Link>
        ) : (
          <Fragment key={i}>{x}</Fragment>
        );
      })}
    </>
  );
}

export const mentionneVous = (texte: string) => /@vous\b/.test(texte);
/** le texte sans la syntaxe des mentions, pour un aperçu d'une ligne */
export const apercu = (texte: string, nomVous: string) => texte.replace(/@([a-z0-9-]+)/g, (_, s: string) => `@${s === VOUS ? nomVous : (membre(s)?.nom ?? s)}`);

/* ——— les dates : posées sur minuit local du navigateur (useAujourdhui) ——— */
const JOUR = 86_400_000;
export function libelleJour(jour: number, minuit: number) {
  if (jour === 0) return "Aujourd'hui";
  if (jour === 1) return "Hier";
  const t = new Date(minuit - jour * JOUR + JOUR / 2).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  return t.charAt(0).toUpperCase() + t.slice(1);
}
export const heureCourte = (heure: string) => heure.replace(":", " h ");
/** « 09 h 31 » aujourd'hui, « Hier », « 28 oct. » au-delà : l'heure d'une ligne, comme dans les boîtes */
export function heureLigne(x: Pick<Message, "jour" | "heure">, minuit: number) {
  if (x.jour === 0) return heureCourte(x.heure);
  if (x.jour === 1) return "Hier";
  return new Date(minuit - x.jour * JOUR + JOUR / 2).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}
export function quand(x: Pick<Message, "jour" | "heure">, minuit: number) {
  const h = heureCourte(x.heure);
  if (x.jour === 0) return `aujourd'hui à ${h}`;
  if (x.jour === 1) return `hier à ${h}`;
  return `${libelleJour(x.jour, minuit).toLowerCase()} à ${h}`;
}
/** l'heure d'un nouveau message, prise au moment de l'envoi */
export const heureMaintenant = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};
/** minutes depuis minuit (négatives avant aujourd'hui) : pour trier et regrouper */
export const minutes = (x: Pick<Message, "jour" | "heure">) => {
  const [h, mn] = x.heure.split(":").map(Number);
  return -x.jour * 1440 + h * 60 + mn;
};
