"use client";

/* Ce que l'assistant voit de l'espace (30/10/2026, demande de Teo : « qu'il
   puisse répondre à toutes les questions qu'on lui pose »).

   Monté seulement quand le panneau est ouvert, il lit les mêmes données que
   les écrans — l'exemple ou la base réelle selon l'interrupteur, sous la
   session de la personne (RLS) — et en tire un résumé texte : factures FILED
   et leur reste à payer, file des validations, balance âgée CASHD. Le
   résumé part avec chaque question ; la route le plafonne.

   30/10/2026 (Teo : « qui sont les contacts que j'ai à appeler ajd »,
   l'assistant répondait sur CASHD) : il lit aussi l'annuaire (Entreprises,
   Contacts), les Tâches et les Appels, gardés dans ce navigateur. Ces blocs
   passent avant FILED, plus long, pour ne pas tomber sous le plafond. */

import { useEffect, useMemo, type RefObject } from "react";
import { useSource } from "@/components/espace/source";
import { useDonnees, type Donnees } from "./donnees";
import { useTableauCashd } from "./cashd/donnees";
import type { Tableau } from "@/components/espace/cashd/types";
import { useStockage } from "./Collection";
import { analyser, useFiches, type Fiche } from "./lin/annuaire";

const eur = (n: number | null | undefined, devise = "EUR") =>
  n == null ? "?" : `${n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${devise === "EUR" ? "€" : devise}`;

function filed(d: Donnees): string {
  const noms = new Map(d.vue.fournisseurs.map((f) => [f.id, f.nom]));
  const lignes = d.vue.factures.slice(0, 300).map((f) => {
    const e = d.etats[f.id];
    const paiement = e ? ` | paiement : ${e.etat}, réglé ${eur(e.regle, f.devise)}, reste ${eur(e.reste, f.devise)}` : "";
    return `- ${f.numero ?? f.reference ?? "sans numéro"} | ${noms.get(f.fournisseur_id ?? "") ?? "fournisseur inconnu"} | ${f.nature} | statut ${f.statut} | ${eur(f.net_a_payer ?? f.montant_ttc, f.devise)} TTC | émise ${f.date_emission ?? "?"} | échéance ${f.echeance_lue ?? "?"}${paiement}`;
  });
  const docs = d.docs.slice(0, 100).map((x) => `- ${x.reference} | ${x.fournisseur ?? "?"} | reçu ${x.recu_le.slice(0, 10)} | état ${x.etat} | ${eur(x.montant, x.devise)}`);
  return [
    `## FILED — factures fournisseurs (${d.vue.factures.length}, ${d.vue.fournisseurs.length} fournisseurs)`,
    "Statuts : « validee » et « comptabilisee » = à payer ; l'état de paiement (a_payer, partielle, payee) dit ce qui reste dû.",
    ...lignes,
    `## FILED — documents reçus (${d.docs.length})`,
    ...docs,
  ].join("\n");
}

function validations(d: Donnees): string {
  return [
    `## Validations — demandes (${d.demandes.length})`,
    ...d.demandes.slice(0, 150).map((v) => `- ${v.module} | ${v.resume} | ${v.montant != null ? eur(v.montant, v.devise) : "sans montant"} | statut ${v.statut} | créée ${v.cree_le.slice(0, 10)}${v.echeance ? ` | échéance ${v.echeance.slice(0, 10)}` : ""}`),
  ].join("\n");
}

function cashd(t: Tableau): string {
  const x = t.totaux;
  return [
    `## CASHD — créances clients (balance âgée${t.dernier_import ? `, dernier import ${t.dernier_import.slice(0, 10)}` : ""})`,
    `Totaux : encours ${eur(x.encours)}, échu ${eur(x.echu)} (1-30 j ${eur(x.echu_1_30)}, 31-60 j ${eur(x.echu_31_60)}, 61-90 j ${eur(x.echu_61_90)}, +90 j ${eur(x.echu_plus_90)}), non échu ${eur(x.non_echu)}, en litige ${eur(x.en_litige)}, ${x.comptes_en_retard} comptes en retard, ${x.factures_echues} factures échues, ${x.au_dessus_du_plafond} au-dessus du plafond.`,
    ...t.comptes.slice(0, 200).map((c) => `- ${c.nom} (${c.reference}) | ${c.statut} | échu ${eur(c.echu, c.devise)} (+90 j ${eur(c.echu_plus_90, c.devise)}) | non échu ${eur(c.non_echu, c.devise)} | litige ${eur(c.en_litige, c.devise)}${c.plafond_encours != null ? ` | plafond ${eur(c.plafond_encours, c.devise)}` : ""}`),
    `Devis sans réponse (${t.devis_en_attente.length}) :`,
    ...t.devis_en_attente.slice(0, 50).map((v) => `- ${v.numero} | ${v.compte} | ${eur(v.montant_ttc)} | ${v.jours_ecoules} jours`),
    `Règlements à imputer (${t.a_imputer.length}) :`,
    ...t.a_imputer.slice(0, 50).map((r) => `- ${r.recu_le.slice(0, 10)} | ${r.compte ?? "compte inconnu"} | ${eur(r.montant)} | reste à imputer ${eur(r.a_imputer)}`),
  ].join("\n");
}

/* un champ libre sur une ligne : les retours à la ligne des notes deviennent des « / » */
const champ = (v: unknown, max = 300) => (typeof v === "string" ? v.trim().replace(/\s*\n+\s*/g, " / ").slice(0, max) : "");
const ligne = (morceaux: [string, unknown][]) =>
  "- " +
  morceaux
    .map(([nom, v]) => [nom, champ(v)] as const)
    .filter(([, v]) => v)
    .map(([nom, v]) => (nom ? `${nom} ${v}` : v))
    .join(" | ");

function annuaire(entreprises: Fiche[], contacts: Fiche[]): string {
  return [
    `## Entreprises — annuaire de la page Entreprises (${entreprises.length})`,
    ...entreprises.slice(0, 300).map((e) => ligne([["", e.nom], ["type", e.type], ["commune", e.ville], ["tél.", e.telephone], ["e-mail", e.email], ["notes", e.notes]])),
    `## Contacts — page Contacts (${contacts.length})`,
    ...contacts.slice(0, 400).map((c) => ligne([["", c.nom], ["entreprise", c.entreprise], ["tél.", c.telephone], ["e-mail", c.email], ["notes", c.notes]])),
  ].join("\n");
}

const PRIORITE = ["aucune", "urgente", "haute", "moyenne", "basse"];
function taches(liste: Fiche[]): string {
  const ouvertes = liste.filter((t) => !t.fait && t.statut !== "fait" && t.statut !== "annule");
  return [
    `## Tâches — page Tâches (${ouvertes.length} à faire, ${liste.length - ouvertes.length} faites ou annulées)`,
    ...ouvertes.slice(0, 200).map((t) => ligne([["", t.titre], ["échéance", t.echeance], ["statut", t.statut], ["priorité", PRIORITE[Number(t.priorite) || 0]], ["pour", t.qui], ["étiquettes", t.etiquettes], ["détail", t.description]])),
  ].join("\n");
}

function appels(liste: Fiche[]): string {
  return [
    `## Appels — page Appels (${liste.length})`,
    ...liste.slice(0, 150).map((a) => ligne([["avec", a.avec], ["le", a.date], ["dit", a.resume], ["rappel prévu", a.suivi], ["", a.clos ? "clos" : "ouvert"]])),
  ].join("\n");
}

/* une donnée mal formée ne doit jamais faire tomber l'assistant : le bloc dit seulement qu'il manque */
function sur(resumer: () => string, module: string): string {
  try {
    return resumer();
  } catch {
    return `## ${module} — indisponible`;
  }
}

export default function LecteurContexte({ cibleRef }: { cibleRef: RefObject<string> }) {
  const { source } = useSource();
  const { donnees } = useDonnees();
  const { tableau } = useTableauCashd();
  const [entreprises] = useFiches("entreprises");
  const [contacts] = useFiches("contacts");
  const brutTaches = useStockage("espace2-collection-taches");
  const brutAppels = useStockage("espace2-collection-appels");
  const listeTaches = useMemo(() => analyser(brutTaches), [brutTaches]);
  const listeAppels = useMemo(() => analyser(brutAppels), [brutAppels]);

  useEffect(() => {
    const maintenant = new Date();
    cibleRef.current = [
      `Date du jour : ${maintenant.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}, ${maintenant.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })} (heure de l'appareil).`,
      source === "exemple"
        ? "L'espace affiche les DONNÉES D'EXEMPLE (démonstration, interrupteur en haut de l'écran) : réponds sur ces données et précise une fois que ce sont des données d'exemple."
        : "L'espace affiche la BASE RÉELLE de l'entreprise.",
      entreprises && contacts ? sur(() => annuaire(entreprises, contacts), "Entreprises et Contacts") : "",
      listeTaches ? sur(() => taches(listeTaches), "Tâches") : "",
      listeAppels?.length ? sur(() => appels(listeAppels), "Appels") : "",
      donnees ? sur(() => filed(donnees), "FILED") : "## FILED — en cours de lecture ou indisponible",
      donnees ? sur(() => validations(donnees), "Validations") : "",
      tableau ? sur(() => cashd(tableau), "CASHD") : "## CASHD — en cours de lecture ou indisponible",
    ]
      .filter(Boolean)
      .join("\n\n");
  }, [cibleRef, source, donnees, tableau, entreprises, contacts, listeTaches, listeAppels]);

  return null;
}
