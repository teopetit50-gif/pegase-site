"use client";

/* ══════════════════════════════════════════════════════════════════════
   DALIRO : déplacer un passage, l'étirer, lui poser des heures (30/10/2026)

   Partagé par les deux plannings (Chantiers et Équipes, ./Planning) et
   l'aperçu d'un passage (./ApercuFrise). En exemple : la règle de la base
   rejouée en mémoire (la suite qui en dépend part après, un passage déplacé
   ou ré-horé repart en confirmation J-2). En base réelle :
   btp_deplacer_passage (b6_82), qui fait de même et journalise.
   ══════════════════════════════════════════════════════════════════════ */

import { dateCourte } from "@/components/espace/format";
import { deplacerPassage } from "@/components/espace/daliro/portes";
import { appliquerLocal, recalageLocal } from "@/components/espace/daliro/recalage";
import type { Passage, Tableau } from "@/components/espace/daliro/types";
import { useToast } from "../Toasts";
import { useDaliro } from "./donnees";
import { quand } from "./enClair";

export function useDeplacer(aujourdhui: string) {
  const { source, tableau, onLocal, relireChantier } = useDaliro();
  const toast = useToast();
  const plusJours = (iso: string, n: number) => {
    const [a, m, j] = iso.slice(0, 10).split("-").map(Number);
    return new Date(Date.UTC(a, m - 1, j + n)).toISOString().slice(0, 10);
  };
  const poser = async (p: Passage, chantierId: string, debut: string, fin: string, hd: string | null, hf: string | null, quoi: string) => {
    const t = tableau(chantierId);
    if (!t) return;
    const nom = `« ${p.tache ?? "Passage"} »`;
    if (source === "reelle") {
      try {
        const r = await deplacerPassage(p.id, debut, fin, hd, hf, null);
        await relireChantier(chantierId);
        const suite = (r.recalage?.deplaces ?? []).filter((d) => d.passage_id !== p.id).length;
        toast(`${nom} ${quoi}${r.reconfirmer ? ", à reconfirmer à J-2" : ""}${suite ? ` ; ${suite} passage${suite > 1 ? "s" : ""} qui en dépendent suivent` : ""}.`, "vert");
      } catch (e) {
        toast(e instanceof Error ? e.message : "La base a refusé le déplacement.", "rouge");
      }
      return;
    }
    const sec = (h: string | null) => (h ? (h.length === 5 ? `${h}:00` : h) : null);
    const avant = { debut: p.debut, fin: p.fin, hd: p.heure_debut ?? null, hf: p.heure_fin ?? null };
    const bouge = debut !== avant.debut || fin !== avant.fin || sec(hd) !== avant.hd || sec(hf) !== avant.hf;
    const reconfirmer = bouge && p.confirmation !== "non_demandee";
    let t2: Tableau = { ...t, passages: t.passages.map((q) => (q.id === p.id ? { ...q, debut, fin, heure_debut: sec(hd), heure_fin: sec(hf), version: q.version + (bouge ? 1 : 0), confirmation: reconfirmer ? "non_demandee" : q.confirmation, confirmation_le: reconfirmer ? null : q.confirmation_le } : q)) };
    let suite = 0;
    if (fin > avant.fin) {
      try {
        const r = recalageLocal(t2, p.id, fin);
        suite = r.deplaces.filter((d) => d.passage_id !== p.id).length;
        t2 = appliquerLocal(t2, r);
      } catch {
        /* rien en aval */
      }
    }
    onLocal(t2);
    toast(`${nom} ${quoi}${reconfirmer ? ", à reconfirmer à J-2" : ""}${suite ? ` ; ${suite} passage${suite > 1 ? "s" : ""} qui en dépendent suivent` : ""}.`, "vert");
  };
  const changer = ({ passage: p, chantierId, mode, jours }: { passage: Passage; chantierId: string; mode: "deplacer" | "etirer"; jours: number }) => {
    const debut = mode === "deplacer" ? plusJours(p.debut, jours) : p.debut.slice(0, 10);
    const fin = plusJours(p.fin, jours);
    const quoi = mode === "etirer" ? `finit ${quand(fin, aujourdhui)}` : `déplacé ${debut === fin ? quand(debut, aujourdhui) : `du ${dateCourte(debut)} au ${dateCourte(fin)}`}`;
    void poser(p, chantierId, debut, fin, p.heure_debut?.slice(0, 5) ?? null, p.heure_fin?.slice(0, 5) ?? null, quoi);
  };
  const heures = (p: Passage, hd: string | null, hf: string | null) => {
    void poser(p, p.chantier_id, p.debut.slice(0, 10), p.fin.slice(0, 10), hd, hf, hd ? `de ${hd.replace(":", " h ")} à ${(hf ?? "").replace(":", " h ")}` : "sans heures");
  };
  return { changer, heures };
}
