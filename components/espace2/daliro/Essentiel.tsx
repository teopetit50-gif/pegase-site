"use client";

/* ══════════════════════════════════════════════════════════════════════
   DALIRO › fiche d'un chantier : « l'essentiel » en tête des onglets
   Terrain et Argent (30/10/2026)

   Ces onglets montent l'écran d'avant (ChantierVue) : six cartes l'une
   sous l'autre, 3 700 px pour Argent. La fiche n'en montre plus qu'une à
   la fois (les pastilles de FicheChantier) ; ce bandeau dit, avant elles,
   ce qu'il faut retenir :
     · Terrain : ce qui demande un geste (points bloquants, intervenants à
       relancer, d'après ./enClair) et le prochain passage ;
     · Argent : quatre chiffres (marché, avenants signés, situations
       validées, reste à facturer), seulement pour qui voit les prix, puis
       les avenants et situations qui attendent quelqu'un.
   Lecture seule, sur le tableau déjà lu.
   ══════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { montant } from "@/components/espace/format";
import type { Tableau } from "@/components/espace/daliro/types";
import { CONFIRMATION_CLAIRE, ecartJours, phrasesChantier, qui, quand, type Phrase } from "./enClair";

/* 30/10/2026 : les parties de la fiche sont des listes ; Argent ne garde que ses quatre chiffres
   (phrases={false}), Terrain plus rien (ses listes disent déjà ce qui attend) */
export default function Essentiel({ t, onglet, auj, phrases: avecPhrases = true }: { t: Tableau; onglet: "terrain" | "argent"; auj: string; phrases?: boolean }) {
  const c = t.chantier;
  const toutes = phrasesChantier(c, t, auj);

  if (onglet === "terrain") {
    const phrases = toutes.filter((p) => p.cle.startsWith("k-") || p.cle.startsWith("p-"));
    const attention = t.controles.filter((k) => k.gravite === "attention").length;
    const prochain = t.passages.filter((p) => p.statut === "prevu" && ecartJours(p.fin, auj) >= 0).sort((a, b) => a.debut.localeCompare(b.debut))[0];
    return (
      <section className="lit-essentiel" aria-label="L'essentiel du terrain">
        <div className="lit-essentiel-chiffres">
          <Chiffre libelle="Prochain passage" valeur={prochain ? maj(quand(prochain.debut, auj)) : "Aucun"} sous={prochain ? `${qui(prochain)} · ${CONFIRMATION_CLAIRE[prochain.confirmation].court}` : "rien de prévu"} />
          <Chiffre libelle="Passages à venir" valeur={String(t.passages.filter((p) => p.statut === "prevu" && ecartJours(p.fin, auj) >= 0).length)} sous="sur le planning" />
          <Chiffre libelle="Points à voir" valeur={String(attention)} sous={attention ? "dans « Points à régler »" : "rien à signaler"} />
        </div>
        <Phrases phrases={phrases} vide="Rien ne coince sur le terrain." />
      </section>
    );
  }

  const marche = t.marches.reduce((s, m) => s + (m.total_ht_lignes ?? m.montant_ht_declare ?? 0), 0);
  const avenants = t.avenants.filter((a) => a.statut === "signe").reduce((s, a) => s + (a.montant_ht ?? 0), 0);
  const derniere = [...(t.situations ?? [])].filter((x) => x.statut === "validee").sort((a, b) => b.numero - a.numero)[0];
  const facture = derniere?.cumul_ht ?? 0;
  const total = marche + avenants;
  const phrases: Phrase[] = [
    ...toutes.filter((p) => p.cle.startsWith("a-")),
    ...(t.situations ?? [])
      .filter((x) => x.statut === "brouillon" || x.statut === "soumise")
      .map((x): Phrase => ({ cle: `s-${x.id}`, teinte: x.statut === "soumise" ? "ambre" : "gris", texte: x.statut === "soumise" ? `Situation n° ${x.numero} soumise, à faire valider.` : `Situation n° ${x.numero} en préparation, à soumettre.` })),
  ];
  return (
    <section className="lit-essentiel" aria-label="L'essentiel de l'argent">
      {t.voit_prix ? (
        <div className="lit-essentiel-chiffres">
          <Chiffre libelle="Marché" valeur={montant(marche)} sous="HT, signé" />
          <Chiffre libelle="Avenants signés" valeur={`${avenants >= 0 ? "+ " : ""}${montant(avenants)}`} sous={signes(t.avenants.filter((a) => a.statut === "signe").length)} />
          <Chiffre libelle="Facturé" valeur={montant(facture)} sous={derniere ? `jusqu'à la situation n° ${derniere.numero}` : "aucune situation validée"} />
          <Chiffre libelle="Reste à facturer" valeur={montant(total - facture)} sous={total ? `${Math.round((facture / total) * 100)} % facturé` : "—"} fort />
        </div>
      ) : (
        <p className="lit-essentiel-note">Les montants sont réservés aux comptes qui voient les prix.</p>
      )}
      {avecPhrases ? <Phrases phrases={phrases} vide="Aucun avenant ni aucune situation n'attend quelqu'un." /> : null}
    </section>
  );
}

const signes = (n: number) => (n === 0 ? "aucun signé pour l'instant" : n === 1 ? "1 avenant" : `${n} avenants`);
const maj = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function Chiffre({ libelle, valeur, sous, fort }: { libelle: string; valeur: string; sous: string; fort?: boolean }) {
  return (
    <div className="lit-essentiel-chiffre" data-fort={fort ? "" : undefined}>
      <span>{libelle}</span>
      <strong>{valeur}</strong>
      <span>{sous}</span>
    </div>
  );
}

function Phrases({ phrases, vide }: { phrases: Phrase[]; vide: string }) {
  if (!phrases.length) return <p className="lit-essentiel-note">{vide}</p>;
  return (
    <ul className="lit-essentiel-phrases">
      {phrases.map((p) => (
        <li key={p.cle}>
          {p.href ? (
            <Link href={p.href} className="lit-essentiel-phrase" data-teinte={p.teinte}>
              <span>{p.texte}</span>
              <ArrowRight aria-hidden="true" />
            </Link>
          ) : (
            <span className="lit-essentiel-phrase" data-teinte={p.teinte}>
              <span>{p.texte}</span>
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
