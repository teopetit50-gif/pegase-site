import { Boxes, FileSignature, Gauge, UserCheck } from "lucide-react";
import type { ComponentType } from "react";
import Section from "@/components/charte/Section";
import EnTeteSection from "@/components/charte/EnTeteSection";
import Pastille from "@/components/charte/Pastille";
import { GrilleCartes, Scene } from "@/components/charte/Cartes";

/* ══════════════════════════════════════════════════════════════════════
   ReglesFacturation — « Ce que nous ne facturons jamais » (14/09/2026)

   LE MODÈLE « HOW-IT-WORKS » (Teo, composant de référence fourni). La
   section quittait quatre cartes blanches plates, surmontées d'une note et
   d'un H2 alignés à gauche, pour la composition de la référence :

     · en-tête CENTRÉ, titre puis chapô en 18 px ;
     · un RAIL de pastilles numérotées, reliées par un filet, aligné sur
       les colonnes des cartes ;
     · des cartes à coins 16, tuile d'icône de 48 px, titre, texte, puis
       une liste de points à puce ronde cerclée.

   Écarts assumés :

   1. La référence décrit un PROCÉDÉ en trois étapes ; ici il y a QUATRE
      règles, et elles ne s'enchaînent pas. La grille passe donc à quatre
      colonnes (filet à 12,5 % sur 75 % de large, pour tomber au centre de
      la première et de la dernière pastille), et les numéros ne disent
      plus un ordre : ils reprennent les « Règle 1 … Règle 4 » que les
      cartes portaient déjà depuis le 28/08.
   2. Les points de chaque carte ne sont PAS de nouvelles promesses : ils
      redécoupent des phrases déjà écrites sur la page — le texte de la
      règle lui-même, la réponse « Puis-je changer de palier ensuite ? »
      de la FAQ, et la note légale sous la grille. Aucune affirmation
      nouvelle, c'est la règle maison.
   3. `hover:scale-105` de la référence est réduit à `hover:-translate-y-1`
      + ombre : quatre cartes côte à côte qui grossissent au survol
      empiètent sur leurs voisines à 1024 px, où la gouttière tombe à
      24 px.
   4. Les jetons shadcn (`bg-card`, `bg-muted`, `text-primary`,
      `ring-background`) ne peignent rien ici : les couleurs de `.resa`
      sont écrites (#ffffff, #f5f5f5, #050505, filet #e3e3e3).
   ══════════════════════════════════════════════════════════════════════ */

export type Regle = {
  titre: string;
  texte: string;
  points: string[];
};

type Icone = ComponentType<{ className?: string; strokeWidth?: number }>;

/* 15/09 — LA SECTION CHANGE DE CONTENU, PAS DE FORME (Teo : « sa section
   doit être remplacée par comment nous chiffrons, et là tu expliques
   comment on chiffre »). « Ce que nous ne facturons jamais » énonçait
   quatre interdits ; depuis que la page n'affiche plus de montant, la
   question que le visiteur se pose n'est plus « que me facturez-vous en
   plus ? » mais « sur quoi allez-vous me chiffrer ? ». Les deux règles
   qui répondaient vraiment à ça (ni par utilisateur, ni au résultat)
   sont devenues les points de la première étape ; les deux autres
   (engagement, réversibilité) vivent déjà dans le comparatif et la FAQ.
   Les numéros disent maintenant un ORDRE, ce que le rail suggérait déjà. */
const ICONES: Icone[] = [Boxes, Gauge, UserCheck, FileSignature];

/* 25/11/2026 — CHARTE DE L'ACCUEIL (docs/charte-accueil.md, § 4.2,
   ligne 5). L'en-tête centré devient l'en-tête de section de l'accueil
   (pastille, h2 en 450, chapô gris à droite, filet dessous) ; les quatre
   cartes blanches deviennent une grille de cartes jointives (GrilleCartes
   du kit) : une scène #eeeee8 qui porte l'icône, puis « Règle N » en
   pastille, le titre, le texte et les points. Le rail de pastilles
   numérotées et le survol qui soulève la carte partent (le calme de
   l'accueil). Textes inchangés. */
export default function ReglesFacturation({
  id,
  titre,
  chapo,
  regles,
}: {
  id?: string;
  titre: string;
  chapo: string;
  regles: Regle[];
}) {
  return (
    <Section id={id}>
      <EnTeteSection pastille="Facturation" titre={titre} chapo={chapo} />
      <GrilleCartes colonnes={4}>
        {regles.map((r, i) => {
          const Icone = ICONES[i % ICONES.length];
          return (
            <article key={r.titre} className="ch-carte tf-regle">
              <Scene basse className="tf-regle-scene">
                <Icone className="size-7" strokeWidth={1.5} />
              </Scene>
              <div className="ch-carte-texte">
                <Pastille>Règle {i + 1}</Pastille>
                <h3>{r.titre}</h3>
                <p>{r.texte}</p>
                <ul className="tf-regle-points">
                  {r.points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              </div>
            </article>
          );
        })}
      </GrilleCartes>
    </Section>
  );
}
