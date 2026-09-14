"use client";

import { useState } from "react";
import { Check, Sprout, Hammer, Building2, Briefcase } from "lucide-react";
import * as PricingCard from "@/components/produits/factures/ui/pricing-card";
import { StarButton, Chevrons } from "@/components/produits/factures/ui/star-button";
import { PALIERS } from "@/lib/produits/factures";

/* Les tarifs, sur la primitive `pricing-card` (Efferd UI, 21st.dev).

   POURQUOI UN SÉLECTEUR AU MOBILE : quatre cartes empilées faisaient
   2,3 écrans de texte — la plus grosse poche de la page. Un palier à la
   fois, choisi par un sélecteur, ramène la section sous un écran sans
   rien retirer : les quatre restent atteignables.

   À partir de `lg`, les quatre sont côte à côte : sur grand écran la
   comparaison vaut mieux que la sélection.

   Les prix affichent « à définir » tant que `PALIERS[].prix` vaut
   `null`. Ne pas inventer de montant. */

const ICONES = [Sprout, Hammer, Building2, Briefcase];

/* RÈGLE 6 du rapatriement — réaiguillage. Les quatre boutons pointaient
   sur `/commencer`, la porte d'entrée du site SaaS, qui ne vient pas.
   Trois d'entre eux disent « Commencer » : ils vont sur /reserver-un-audit,
   la porte de conversion du site. Le quatrième dit « Nous écrire » —
   l'envoyer sur une page de réservation de créneau serait un lien qui ment,
   il va sur /contact (les deux routes sont dans la table de réaiguillage). */
function lienPalier(cta: string) {
  return cta.toLowerCase().includes("écrire") ? "/contact" : "/reserver-un-audit";
}

function Carte({ p, i }: { p: (typeof PALIERS)[number]; i: number }) {
  const Icone = ICONES[i] ?? Sprout;
  return (
    <PricingCard.Card className="h-full">
      <PricingCard.Header>
        <PricingCard.Plan>
          <PricingCard.PlanName>
            <Icone aria-hidden="true" />
            {p.nom}
          </PricingCard.PlanName>
          {p.prix === null && <PricingCard.Badge>à définir</PricingCard.Badge>}
        </PricingCard.Plan>
        <PricingCard.Price>
          <PricingCard.MainPrice>{p.prix ?? "—"}</PricingCard.MainPrice>
          {p.prix && p.periode && <PricingCard.Period>{p.periode}</PricingCard.Period>}
        </PricingCard.Price>
        <PricingCard.Description className="mb-4">{p.pitch}</PricingCard.Description>
        <StarButton href={lienPalier(p.cta)} className="w-full">
          {p.cta}
          <Chevrons />
        </StarButton>
      </PricingCard.Header>

      <PricingCard.Body>
        {p.entete && <PricingCard.Separator>{p.entete}</PricingCard.Separator>}
        <PricingCard.List>
          {p.lignes.map((l) => (
            <PricingCard.ListItem key={l}>
              <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-[#171717]/55" />
              <span>{l}</span>
            </PricingCard.ListItem>
          ))}
        </PricingCard.List>
      </PricingCard.Body>
    </PricingCard.Card>
  );
}

export default function Paliers() {
  const [choisi, setChoisi] = useState(1);

  return (
    <div className="mx-0 lg:mx-5">
      {/* Sous lg : un sélecteur, un palier. */}
      <div className="lg:hidden">
        <div
          role="tablist"
          aria-label="Choisir un palier"
          className="mb-6 grid grid-cols-4 gap-1 rounded-full border border-[#171717]/[0.16] bg-[#171717]/[0.04] p-1"
        >
          {PALIERS.map((p, i) => (
            <button
              key={p.nom}
              role="tab"
              type="button"
              aria-selected={i === choisi}
              onClick={() => setChoisi(i)}
              className={`min-h-9 rounded-full px-1 font-mono text-[10px] uppercase tracking-[0.08em] transition-colors ${
                i === choisi ? "bg-[#171717] text-white" : "text-[#737373] hover:text-[#171717]"
              }`}
            >
              {p.nom}
            </button>
          ))}
        </div>
        <Carte p={PALIERS[choisi]} i={choisi} />
      </div>

      {/* À partir de lg : les quatre, pour comparer. */}
      <div className="hidden gap-4 lg:grid lg:grid-cols-4">
        {PALIERS.map((p, i) => (
          <Carte key={p.nom} p={p} i={i} />
        ))}
      </div>
    </div>
  );
}
