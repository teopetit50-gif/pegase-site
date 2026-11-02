"use client";

/* Réseau › Messages — les petites briques partagées par la liste, la
   conversation et le fil : l'avatar (initiales, teinte du système d'Espace
   2), le texte d'un message avec ses mentions, les dates. */

import Link from "next/link";
import { Fragment } from "react";
import { MEMBRES } from "./membres";
import { VOUS, membre, presenceDe, type Message } from "./messages-donnees";

export const RACINE_RESEAU = "/espace2/reseau";
export const ficheDe = (slug: string) => `${RACINE_RESEAU}/membres/${slug}`;

/* ——— l'avatar : un carré à 6 px, comme les avatars de Slack, en initiales
   sur une teinte du système (jamais une couleur venue d'ailleurs) ——— */
const TEINTES = ["bleu", "vert", "ambre", "rouge", "gris"] as const;
const teinteDe = (slug: string) => TEINTES[[...slug].reduce((s, c) => s + c.charCodeAt(0), 0) % TEINTES.length];
export const initiales = (nom: string) =>
  nom
    .replace(/[^\p{L}\p{N} ]/gu, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((x) => x.charAt(0).toUpperCase())
    .join("");

export function Avatar({ slug, nomVous, taille = 36, presence }: { slug: string; nomVous: string; taille?: 16 | 20 | 24 | 36 | 72; presence?: boolean }) {
  const vous = slug === VOUS;
  const nom = vous ? nomVous : (membre(slug)?.nom ?? slug);
  const etat = !vous && presence ? presenceDe(slug) : null;
  return (
    <span className="ms-avatar" data-taille={taille} data-teinte={vous ? "vous" : teinteDe(slug)} aria-hidden="true">
      {initiales(nom)}
      {etat ? <span className="ms-presence" data-etat={etat} /> : null}
    </span>
  );
}

export function PointPresence({ slug }: { slug: string }) {
  const etat = presenceDe(slug);
  return <span className="ms-presence ms-presence--seule" data-etat={etat} aria-label={etat === "en-ligne" ? "en ligne" : "absent"} role="img" />;
}

export const nomDe = (slug: string, nomVous: string) => (slug === VOUS ? nomVous : (membre(slug)?.nom ?? slug));

/* ——— le texte d'un message : les sauts de ligne gardés, `@slug` mène à la
   fiche du membre, `@vous` désigne l'organisation connectée ——— */
export function TexteMessage({ texte, nomVous }: { texte: string; nomVous: string }) {
  const morceaux = texte.split(/(@[a-z0-9-]+)/g);
  return (
    <>
      {morceaux.map((x, i) => {
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

/* ——— les dates : posées sur minuit local du navigateur (useAujourdhui) ——— */
const JOURS = 86_400_000;
export function libelleJour(jour: number, minuit: number) {
  if (jour === 0) return "Aujourd'hui";
  if (jour === 1) return "Hier";
  const d = new Date(minuit - jour * JOURS + JOURS / 2);
  const t = d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  return t.charAt(0).toUpperCase() + t.slice(1);
}
export function quand(x: Pick<Message, "jour" | "heure">, minuit: number) {
  const h = x.heure.replace(":", " h ");
  if (x.jour === 0) return `aujourd'hui à ${h}`;
  if (x.jour === 1) return `hier à ${h}`;
  return `${libelleJour(x.jour, minuit).toLowerCase()} à ${h}`;
}
/** l'heure d'un nouveau message, prise au moment de l'envoi */
export const heureMaintenant = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};
/** minutes depuis minuit, pour regrouper les messages proches d'un même auteur */
export const minutes = (x: Pick<Message, "jour" | "heure">) => {
  const [h, mn] = x.heure.split(":").map(Number);
  return -x.jour * 1440 + h * 60 + mn;
};
