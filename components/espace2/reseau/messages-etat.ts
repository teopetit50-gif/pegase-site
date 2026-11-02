"use client";

/* Réseau › Messages — l'état de la messagerie pendant la visite, en
   données d'exemple : ce qui a été lu, envoyé, réagi, les sujets ouverts
   et les messages privés commencés. Rien n'est écrit en base (le réseau
   n'a pas encore de table) ; le jour où elles existent, seules ces
   fonctions changent (schema-messages.sql : reseau_envoyer,
   reseau_ouvrir_prive, reseau_reagir, reseau_marquer_lu). */

import { useCallback, useMemo, useState } from "react";
import { MEMBRES } from "./membres";
import { PRIVES, SALONS, VOUS, mentionsVous, type Message, type Salon } from "./messages-donnees";
import { heureMaintenant, minutes } from "./messages-commun";

/** une conversation : un sujet d'un salon (« t:salon/sujet ») ou un message privé (« p:slug ») */
export const cleSujet = (salon: string, sujet: string) => `t:${salon}/${sujet}`;
export const clePrive = (slug: string) => `p:${slug}`;

export type SujetVu = { cle: string; salon: Salon; id: string; titre: string; messages: Message[]; nonLus: number; mentions: number; dernier?: Message; participants: string[] };
export type PriveVu = { cle: string; slug: string; messages: Message[]; nonLus: number; dernier?: Message };

const derniersD = (l: Message[]) => l[l.length - 1];
const plusRecent = (a?: Message, b?: Message) => (b ? minutes(b) : -Infinity) - (a ? minutes(a) : -Infinity);
/* les participants, du plus récent au plus ancien (comme la colonne « Participants » de Zulip) */
const participantsDe = (l: Message[]) => [...new Set([...l].reverse().map((x) => x.auteur))];

const DEPART_NON_LUS = new Map<string, number>([
  ...SALONS.flatMap((s) => s.sujets.map((t) => [cleSujet(s.id, t.id), t.nonLus] as const)),
  ...PRIVES.map((p) => [clePrive(p.slug), p.nonLus] as const),
]);

export function useMessagerie() {
  const [messages, setMessages] = useState<Record<string, Message[]>>(() => ({
    ...Object.fromEntries(SALONS.flatMap((s) => s.sujets.map((t) => [cleSujet(s.id, t.id), t.messages]))),
    ...Object.fromEntries(PRIVES.map((p) => [clePrive(p.slug), p.messages])),
  }));
  const [crees, setCrees] = useState<Record<string, { id: string; titre: string }[]>>({});
  const [lus, setLus] = useState<Record<string, true>>({});
  const [privesOuverts, setPrivesOuverts] = useState<string[]>([]);

  const nonLus = useCallback((cle: string) => (lus[cle] ? 0 : (DEPART_NON_LUS.get(cle) ?? 0)), [lus]);

  const sujets = useCallback(
    (salon: Salon): SujetVu[] =>
      [...salon.sujets.map((t) => ({ id: t.id, titre: t.titre })), ...(crees[salon.id] ?? [])]
        .map((t) => {
          const cle = cleSujet(salon.id, t.id);
          const l = messages[cle] ?? [];
          const n = nonLus(cle);
          return { cle, salon, id: t.id, titre: t.titre, messages: l, nonLus: n, mentions: mentionsVous(l, n), dernier: derniersD(l), participants: participantsDe(l) };
        })
        .sort((a, b) => plusRecent(a.dernier, b.dernier)),
    [crees, messages, nonLus],
  );

  const tousLesSujets = useMemo(() => SALONS.flatMap((s) => sujets(s)).sort((a, b) => plusRecent(a.dernier, b.dernier)), [sujets]);

  const prives = useMemo((): PriveVu[] => {
    const slugs = [...privesOuverts, ...PRIVES.map((p) => p.slug)].filter((x, i, t) => t.indexOf(x) === i && MEMBRES.some((y) => y.slug === x));
    return slugs
      .map((slug) => {
        const cle = clePrive(slug);
        const l = messages[cle] ?? [];
        return { cle, slug, messages: l, nonLus: nonLus(cle), dernier: derniersD(l) };
      })
      .sort((a, b) => (!a.dernier || !b.dernier ? Number(!!a.dernier) - Number(!!b.dernier) : plusRecent(a.dernier, b.dernier)));
  }, [privesOuverts, messages, nonLus]);

  const nouveau = (texte: string): Message => ({ id: `n${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, auteur: VOUS, jour: 0, heure: heureMaintenant(), texte });

  return {
    sujets,
    tousLesSujets,
    prives,
    nonLus,
    messagesDe: (cle: string) => messages[cle] ?? [],
    marquerLu: (cle: string) => setLus((l) => (l[cle] ? l : { ...l, [cle]: true })),
    ouvrirPrive: (slug: string) => setPrivesOuverts((x) => (x.includes(slug) ? x : [slug, ...x])),
    envoyer: (cle: string, texte: string) => setMessages((t) => ({ ...t, [cle]: [...(t[cle] ?? []), nouveau(texte)] })),
    /** ouvre un sujet dans un salon (son premier message) ; rend son identifiant */
    creerSujet: (salon: string, titre: string, texte: string) => {
      const base =
        titre
          .normalize("NFD")
          .replace(/\p{M}/gu, "")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "")
          .slice(0, 48) || "sujet";
      const id = `${base}-${Date.now().toString(36).slice(-4)}`;
      setCrees((c) => ({ ...c, [salon]: [...(c[salon] ?? []), { id, titre }] }));
      setMessages((t) => ({ ...t, [cleSujet(salon, id)]: [nouveau(texte)] }));
      return id;
    },
    reagir: (cle: string, id: string, emoji: string) =>
      setMessages((t) => ({
        ...t,
        [cle]: (t[cle] ?? []).map((x) => {
          if (x.id !== id) return x;
          const rs = x.reactions ?? [];
          const r = rs.find((y) => y.emoji === emoji);
          const suivantes = !r
            ? [...rs, { emoji, qui: [VOUS] }]
            : rs.map((y) => (y.emoji !== emoji ? y : { ...y, qui: y.qui.includes(VOUS) ? y.qui.filter((q) => q !== VOUS) : [...y.qui, VOUS] })).filter((y) => y.qui.length);
          return { ...x, reactions: suivantes };
        }),
      })),
  };
}

export type Messagerie = ReturnType<typeof useMessagerie>;

/** l'état d'un salon dans la liste : ses non-lus, ses mentions et son dernier message */
export function etatSalon(sujets: SujetVu[]) {
  const dernier = sujets.reduce<Message | undefined>((d, t) => (plusRecent(d, t.dernier) > 0 ? t.dernier : d), undefined);
  const sujet = sujets.find((t) => t.dernier === dernier);
  return { nonLus: sujets.reduce((n, t) => n + t.nonLus, 0), mentions: sujets.reduce((n, t) => n + t.mentions, 0), dernier, sujet };
}
