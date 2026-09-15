import type { CSSProperties } from "react";
import Apparition from "@/components/donnees/Apparition";
import {
  MaquetteBase,
  MaquetteMoteur,
  MaquetteOutil,
} from "@/components/donnees/Media";
import "./CarteLieux.css";

/* ══════════════════════════════════════════════════════════════════════
   <CarteLieux> — les trois lieux de /vos-donnees, en chaîne (14/09/2026)

   ORIGINE. La commande était `magicui/dotted-map` : une carte du monde
   dessinée en points, sur laquelle on pose des marqueurs à des coordonnées.
   Elle n'est pas reprise, et le nom du fichier reste `CarteLieux` au sens
   de « cartes », pas de « cartographie ».

   POURQUOI PAS DE CARTE — c'est la décision de fond de ce composant.
   Une carte affirme une latitude et une longitude pour chaque marqueur.
   Or des trois lieux de cette section, UN SEUL a une position connue :
     • « Votre outil » n'a pas de lieu. C'est la messagerie du client, chez
       l'hébergeur qu'il avait déjà, différent d'un client à l'autre et
       souvent hors d'Europe. Lui donner un point, c'est l'inventer.
     • « Le système » n'a pas de lieu RELEVÉ. L'en-tête de page.tsx le dit
       noir sur blanc dans « CE QUI DOIT ÊTRE VALIDÉ PAR TEO » : la région
       de l'instance qui fait tourner les moteurs « n'a pas pu être
       relevée ». Le poser sur une carte d'Europe, c'est répondre à la
       place de Teo à la seule question que la page laisse ouverte.
     • « La base » en a un, vérifié le 07/08 : Francfort, eu-central-1.
   Une carte d'Europe portant trois marqueurs dirait donc deux choses
   fausses, et une carte à un seul marqueur répondrait à une question que
   la section ne pose pas : son titre compte des ÉTAPES (« les trois seuls
   endroits »), son chapô nie un quatrième lieu. C'est une chaîne, pas une
   géographie.

   POURQUOI CETTE FORME-LÀ. La forme dit ce que le texte dit : trois
   maillons numérotés, reliés par un trait qui va de l'un à l'autre, et
   qui s'arrête au troisième — il n'y a pas de quatrième lieu. Le seul
   endroit où une géographie est affirmée reste celui où elle est vraie,
   dans le sous-titre exact de la troisième carte.

   CE QUI EST JETÉ. Tout `dotted-map` : `createMap`/`addMarkers` de
   `svg-dotted-map` (paquet non installé, et le brief interdit d'en ajouter
   un), les ~5 000 `<circle>` d'échantillonnage, le décalage de rangée, le
   `markerColor` orange #FF6900, les deux cercles de pulsation animés à
   l'infini, `renderMarkerOverlay`, et le `cn("text-gray-500 dark:…")` dont
   la variante `dark:` suivrait l'OS. Jeté aussi le lien survol/focus
   marqueur ↔ légende : sans carte, il n'y a plus deux objets à apparier,
   et rendre une carte non cliquable focusable serait un faux affordance.

   ÉCARTS ASSUMÉS. Composant SERVEUR : aucun état, aucun hook, pas une
   ligne de JavaScript à lui. Les textes sont ceux de la page, au
   caractère près, et la constante LIEUX déménage ici sans être retouchée.
   L'apparition reste celle de la page — `<Apparition>` pose `data-vu`,
   `.vd-monte` fait monter chaque étape, `--d` cadence les lignes des
   maquettes : aucune seconde mécanique, aucun @keyframes nouveau. Les
   numéros sont `aria-hidden` parce que le `<ol>` porte déjà le rang.
   ══════════════════════════════════════════════════════════════════════ */

/* ——— les trois lieux de passage ———
   Reprise à l'identique de la constante LIEUX de app/vos-donnees/page.tsx :
   mêmes maquettes, mêmes titres, mêmes sous-titres, apostrophe droite
   comprise. Rien n'est reformulé — la page dit déjà exactement ce qui se
   passe, et sur ce sujet c'est ce texte qui commande. */
const LIEUX = [
  {
    maquette: MaquetteOutil,
    titre: "Votre outil",
    soustitre: "Vos données restent dans l'outil qui les contient",
  },
  {
    maquette: MaquetteMoteur,
    titre: "Le système",
    soustitre: "Il traite la donnée sans en conserver de copie",
  },
  {
    maquette: MaquetteBase,
    titre: "La base",
    soustitre: "Francfort, région eu-central-1",
  },
];

export default function CarteLieux() {
  return (
    <Apparition className="chn">
      {/* `role="list"` : Safari retire la sémantique de liste dès que
          `list-style` vaut `none`, et c'est le rang des étapes qui se perd. */}
      <ol className="chn-rail" role="list">
        {LIEUX.map((l, i) => {
          const Maquette = l.maquette;
          /* `--i` décale la montée d'une étape à l'autre, `--d` retarde les
             lignes internes de sa maquette : les deux variables de la page,
             aux mêmes valeurs qu'aujourd'hui. */
          return (
            <li
              key={l.titre}
              style={{ "--i": i, "--d": `${i * 110}ms` } as CSSProperties}
              className="chn-etape vd-monte"
            >
              <span className="chn-jalon" aria-hidden="true">
                {i + 1}
              </span>
              <div className="chn-carte">
                <Maquette />
                <h3 className="vd-h3 chn-titre">{l.titre}</h3>
                <p className="vd-small chn-soustitre">{l.soustitre}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </Apparition>
  );
}
