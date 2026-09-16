"use client";

import * as React from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/feature-11-utils/tabs";

/* ══════════════════════════════════════════════════════════════════════
   Feature11 — repris de la fiche 21st.dev « feature-11 » (Hirael, MIT,
   Mohammad Shehadeh) le 16/09/2026 à la demande de Teo, pour la section
   « Le catalogue » de /offres/sur-mesure.

   CE QU'ON GARDE, c'est-à-dire tout ce qui fait le composant : une
   colonne d'onglets verticaux à gauche — chacun avec son icône, son
   intitulé et son résumé — et le panneau correspondant à droite, qui
   change au clic. Les onglets passent à l'horizontale sous `lg`.

   CE QU'ON JETTE, et il n'y avait pas le choix :
   · le contenu. La fiche montre une boîte de réception partagée avec des
     conversations nommées — Nadia Rahman, Tomas Lang, Grace Okafor — et
     leurs sujets. Des personnes inventées sur une page commerciale, même
     en figuration, tombent sous la même règle que les faux avis.
   · `Avatar` de shadcn, qui ne servait qu'à afficher les initiales de ces
     personnes. Une dépendance de moins.
   · `bg-warm`, un jeton qui n'existe nulle part dans ce dépôt.
   · toutes les classes de thème (`text-muted-foreground`, `bg-card/40`,
     `border-border`) : ici elles ne peignent RIEN, en silence. Le
     composant porte des classes `f11-*` nues, habillées par le CSS de la
     page — c'est aussi ce qui lui donne sa police.

   Et la fiche codait ses trois entrées en dur. Elles deviennent une
   propriété : c'est ce qui permet de lui donner nos quatre systèmes,
   dont le texte sort de leur fiche à chacun.
   ══════════════════════════════════════════════════════════════════════ */

export type Volet = {
  /** la clé de l'onglet */
  valeur: string;
  /* ⚠ UN ÉLÉMENT, PAS UN COMPOSANT. `icone: LucideIcon` passait la
     FONCTION du composant serveur vers ce composant client : React ne sait
     pas la sérialiser et le build casse au prérendu avec « Functions
     cannot be passed directly to Client Components » — une erreur
     invisible pour `tsc` comme pour eslint, et qui ne se voit qu'au
     `next build` ([[fonction-serveur-vers-composant-client]]).
     L'appelant passe donc `<Bell size={16} />`, déjà rendu. */
  icone: React.ReactNode;
  titre: string;
  /** le résumé sous l'intitulé, dans l'onglet */
  resume: string;
  /** ce que le panneau affiche */
  panneau: React.ReactNode;
};

export default function Feature11({ volets }: { volets: Volet[] }) {
  if (volets.length === 0) return null;

  return (
    <Tabs defaultValue={volets[0].valeur} orientation="vertical" className="f11">
      <TabsList variant="line">
        {volets.map((v) => (
          <TabsTrigger key={v.valeur} value={v.valeur}>
            <span className="f11-onglet__titre">
              <span aria-hidden className="f11-onglet__icone">
                {v.icone}
              </span>
              {v.titre}
            </span>
            <span className="f11-onglet__resume">{v.resume}</span>
          </TabsTrigger>
        ))}
      </TabsList>

      {volets.map((v) => (
        <TabsContent key={v.valeur} value={v.valeur}>
          {v.panneau}
        </TabsContent>
      ))}
    </Tabs>
  );
}
