"use client";

import { Mail } from "lucide-react";
import { COURRIEL, lienContact } from "@/lib/reservation";
import Faq from "@/components/charte/Faq";
import Bouton from "@/components/charte/Bouton";

/* ══════════════════════════════════════════════════════════════════════
   FaqTarifs — la FAQ des prix (14/09/2026)

   SECONDE PASSE DU JOUR — LE MODÈLE « FAQSECTION » (Teo, composant de
   référence fourni). La FAQ quitte la composition `faqs-02` du matin
   (colonne gauche collante : pastille, titre, carte « parler à un
   conseiller » ; accordéon à droite) pour celle de la référence :

     · un EN-TÊTE CENTRÉ — surtitre discret, titre, chapô, puis un bouton
       en pilule qui emmène vers la porte de contact ;
     · les questions en DEUX COLONNES d'accordéons, moitié / moitié, la
       moitié impaire allant à gauche.

   Ce qui reste du matin : la primitive Radix (clavier, ARIA, ouverture
   unique), les deux `@keyframes` de hauteur de `faq-tarifs.css`, les gris
   de `.resa`, et le fait que les questions ne sont PAS écrites ici —
   elles viennent de `FAQ_TARIFS` dans la page.

   Écarts avec la référence, assumés :

   1. La référence ouvre DEUX accordéons indépendants (`type="single"` par
      colonne) : une réponse peut donc rester ouverte de chaque côté. C'est
      gardé tel quel — deux colonnes, deux lectures.
   2. Le chevron vient de `@radix-ui/react-icons` chez la référence ; le
      paquet n'est pas installé et lucide l'est partout — `ChevronDown`,
      même geste, même rotation à l'ouverture. Le « + » des autres FAQ du
      site part donc ici, c'est le signe de ce composant.
   3. `Accordion` de shadcn est remplacé par la primitive Radix
      directement, et les `animate-accordion-*` de tailwindcss-animate (qui
      n'est installé nulle part sur le parc) par les deux keyframes de
      `faq-tarifs.css`, scopées sous `.tf-faq`.
   4. Les jetons shadcn (`border-border`, `text-muted-foreground`) sont
      remplacés par les gris de `.resa` (#e3e3e3, #616161, #3d3d3d) —
      Tailwind n'émet rien pour un jeton inconnu.
   5. Le bouton de la référence est décoratif (`onButtonClick`) ; ici il
      mène vraiment quelque part — la porte de contact — donc un `<a>`
      habillé par `Button asChild`. La ligne e-mail qui vivait dans la
      carte du matin le suit : c'est une voie de contact réelle, la perdre
      coûterait plus que la ressemblance.
   ══════════════════════════════════════════════════════════════════════ */

/* ══════════════════════════════════════════════════════════════════════
   25/11/2026 — CHARTE DE L'ACCUEIL (docs/charte-accueil.md, § 4.2,
   ligne 5) : la FAQ des prix passe au composant `Faq` du kit — l'intro à
   gauche (collante), les questions à droite, une seule réponse ouverte à
   la fois. Le surtitre « Questions fréquentes » devient la pastille, le
   chapô, le bouton « Nous écrire » (blanc, `ch-btn`) et la ligne e-mail
   vont dans l'aparté de l'intro. Les deux accordéons Radix et leur
   feuille (faq-tarifs.css, qui n'est plus importée) partent. Textes
   inchangés ; une réponse en plusieurs paragraphes garde ses paragraphes
   (des <span> en bloc : le kit rend la réponse dans un <p>).
   ══════════════════════════════════════════════════════════════════════ */

type Item = { q: string; r: string[] };

export default function FaqTarifs({ items }: { items: Item[] }) {
  return (
    <Faq
      pastille="Questions fréquentes"
      titre="Questions sur les prix"
      aparte={
        <>
          Une question qui n&apos;est pas ici&nbsp;? Écrivez-nous&nbsp;: un membre de l&apos;équipe vous répond sous deux jours ouvrés, souvent le jour même.
        </>
      }
      action={
        <>
          <Bouton href={lienContact("avant")} icone="chevron">
            Nous écrire
          </Bouton>
          <p className="tf-faq-mail">
            <Mail aria-hidden className="mr-1 inline size-3" />
            Ou par e-mail&nbsp;:{" "}
            {/* 15/09/2026 — l'adresse reste AFFICHÉE, elle n'est plus un lien.
                Un `mailto:` sort du site vers un client mail (et ne fait
                rien du tout sur un téléphone sans compte configuré) : c'est
                la dernière famille de portes sortantes après WhatsApp. En
                faire un second lien vers /contact ne servait à rien — le
                bouton juste au-dessus y mène déjà. Reste donc le texte, à
                copier par qui préfère écrire depuis sa propre boîte.
                Le `mailto:` ne subsiste que là où il est la bonne réponse : la carte « Écrire » de /contact, que le visiteur a choisie, et les voies de SECOURS (formulaire ou agenda en panne). */}
            <span className="tf-faq-adresse">{COURRIEL}</span>
          </p>
        </>
      }
      questions={items.map((f) => ({
        q: f.q,
        r: (
          <>
            {f.r.map((par, j) => (
              <span key={j} className="tf-faq-par">
                {par}
              </span>
            ))}
          </>
        ),
      }))}
    />
  );
}
