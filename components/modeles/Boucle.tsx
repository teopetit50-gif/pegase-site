/* ══════════════════════════════════════════════════════════════════════
   <Boucle> — le trajet d'une demande, du premier clic à l'avis Google.

   Réécrite le 03/08 (Teo : « c'est encore trop amateur »). La première
   version était cinq boîtes blanches contenant du texte, alignées sur une
   grille de cinq — donc deux colonnes dès qu'on rétrécissait, avec la
   cinquième carte orpheline et un trou béant à côté. Trois défauts :

   · Aucun dessin. Le sujet de la section EST une mécanique, et on la
     racontait en paragraphes. La référence (scale.com, section « Improve
     Your Models ») ne fait jamais ça : elle dessine un schéma.
   · Aucune progression lisible. Le numéro était un « 1 » gris de 11 px ;
     rien ne disait qu'on lisait une séquence.
   · La boucle ne bouclait pas. L'argument fort — l'avis ramène la demande
     suivante — se terminait en cul-de-sac sur la cinquième carte.

   Ce qui remplace : une chaîne. Un rail traverse les cinq jalons, chaque
   jalon porte sa pastille numérotée et son pictogramme, et le rail se
   referme en bas par une flèche de retour qui revient au début. Le lecteur
   voit le cycle avant même de lire un mot.

   Le rail est en `::before` sur le conteneur des jalons plutôt qu'en SVG :
   il doit s'arrêter net au premier et au dernier jalon, ce qu'un simple
   `inset-x` gère mieux qu'un tracé à recalculer à chaque point de rupture.
   Sur mobile la grille passe en colonne unique et le rail bascule à la
   verticale, sans rien changer au balisage.
   ══════════════════════════════════════════════════════════════════════ */

const TRAIT = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.4,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/* Pictogrammes : traits fins, même chasse, même grille de 24. Ils ne
   décorent pas — chacun nomme l'objet de l'étape (un formulaire, une
   réponse, un devis relancé, une facture réglée, un avis). */
const ICONES = {
  formulaire: (
    <svg viewBox="0 0 24 24" {...TRAIT} aria-hidden>
      <rect x="3.5" y="4" width="17" height="13" rx="2" />
      <path d="M7 8.5h7M7 12h4.5" />
      <path d="M14.5 15.5l2.6 2.6 1.4-1.4-2.6-2.6z" />
    </svg>
  ),
  reponse: (
    <svg viewBox="0 0 24 24" {...TRAIT} aria-hidden>
      <path d="M20 12.5a7 7 0 0 1-7 7H8l-4 2.5V12.5a7 7 0 0 1 7-7h2a7 7 0 0 1 7 7z" />
      <path d="M9.5 12.5h5" />
    </svg>
  ),
  devis: (
    <svg viewBox="0 0 24 24" {...TRAIT} aria-hidden>
      <path d="M14 3.5H7a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-8z" />
      <path d="M14 3.5V10h5" />
      <path d="M8.5 16.5a3 3 0 1 0 .9-2.1" />
      <path d="M8.4 12.2v2.4h2.4" />
    </svg>
  ),
  facture: (
    <svg viewBox="0 0 24 24" {...TRAIT} aria-hidden>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M3 10h18" />
      <path d="M7 14.5h3.5" />
    </svg>
  ),
  avis: (
    <svg viewBox="0 0 24 24" {...TRAIT} aria-hidden>
      <path d="M12 4.5l2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4-3.9-3.8 5.4-.8z" />
    </svg>
  ),
};

const ETAPES = [
  {
    n: "1",
    icone: ICONES.formulaire,
    titre: "La demande arrive",
    texte:
      "Le formulaire ne part pas dans une boîte mail où il se perdra : la demande devient une ligne dans votre espace, horodatée, avec la page d'où elle vient.",
  },
  {
    n: "2",
    icone: ICONES.reponse,
    titre: "Le prospect est rappelé",
    texte:
      "Un accusé de réception part en deux minutes, sous votre signature. Il ne va pas voir ailleurs pendant que vous êtes sur un chantier.",
  },
  {
    n: "3",
    icone: ICONES.devis,
    titre: "Le devis se relance seul",
    texte:
      "Relancé à J+3 puis à J+7 sans réponse. Chaque message vous est soumis avant de partir : vous validez, corrigez ou suspendez d'un clic.",
  },
  {
    n: "4",
    icone: ICONES.facture,
    titre: "La facture aussi",
    texte:
      "Le devis accepté devient une facture, et l'impayé entre dans la même mécanique. C'est le moteur qui court après l'argent, plus vous.",
  },
  {
    n: "5",
    icone: ICONES.avis,
    titre: "L'avis est demandé",
    texte:
      "Prestation terminée, la demande d'avis part quand le client est encore content : au moment exact où il dira oui.",
  },
];

export default function Boucle() {
  return (
    <div className="m-panneau mt-12 p-5 sm:p-8 lg:p-10">
      {/* ——— le rail + les cinq jalons ———
          Le rail horizontal est fait de SEGMENTS posés sur chaque jalon
          (`after:`), pas d'une seule barre tirée sur le conteneur. Premier
          essai avec une barre unique en `left-[10%] right-[10%]` : les
          pastilles étant calées à gauche de leur colonne et non centrées,
          le trait dépassait franchement après le jalon 5, dans le vide.
          Un segment par jalon s'arrête forcément au bon endroit, quel que
          soit le nombre d'étapes — et `last:after:hidden` supprime celui
          qui partirait du dernier.

          En dessous de lg la liste passe en colonne et c'est `before:` sur
          le conteneur qui porte le rail, vertical cette fois. */}
      <ol
        className="relative grid gap-8 sm:grid-cols-2 sm:gap-x-6 lg:grid-cols-5 lg:gap-6
                   before:absolute before:bg-black/12 before:content-['']
                   before:left-[19px] before:top-2 before:h-[calc(100%-1rem)] before:w-px
                   sm:before:hidden"
      >
        {ETAPES.map((e) => (
          <li
            key={e.n}
            data-reveal
            className="relative flex gap-4 lg:block
                       lg:after:absolute lg:after:left-[48px] lg:after:-right-6
                       lg:after:top-[19px] lg:after:h-px lg:after:bg-black/12
                       lg:after:content-[''] lg:last:after:hidden"
          >
            {/* pastille : posée SUR le rail, d'où le fond opaque du panneau
                qui vient masquer le trait derrière elle */}
            <span
              className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full
                         bg-[color:var(--m-panneau)] text-[13px] font-medium ring-1 ring-black/12"
            >
              {e.n}
            </span>

            <div className="min-w-0 pt-1 lg:pt-0">
              <span className="mt-0 block text-[color:var(--m-doux)] lg:mt-6 [&>svg]:h-[22px] [&>svg]:w-[22px]">
                {e.icone}
              </span>
              <h3 className="mt-3.5 text-[15px] leading-snug">{e.titre}</h3>
              <p className="mt-2 text-[13.5px] leading-relaxed text-[color:var(--m-doux)]">
                {e.texte}
              </p>
            </div>
          </li>
        ))}
      </ol>

      {/* ——— la boucle se referme ———
          C'est l'argument de toute la section : l'avis ne clôt pas le
          trajet, il en relance un. Sans ce retour, la chaîne finissait en
          cul-de-sac sur la cinquième carte. */}
      <div
        data-reveal
        className="mt-9 flex items-center gap-3 border-t border-black/10 pt-6 text-[13.5px] text-[color:var(--m-doux)]"
      >
        <svg
          viewBox="0 0 24 24"
          {...TRAIT}
          aria-hidden
          className="h-[18px] w-[18px] shrink-0 text-[color:var(--m-encre)]"
        >
          <path d="M20 11.5a8 8 0 1 1-2.4-5.7" />
          <path d="M20.5 3.5V8h-4.5" />
        </svg>
        {/* {" "} explicite : JSX supprime le saut de ligne et l'indentation
            entre la balise fermante et le texte suivant, ce qui collait
            « recommence.Un client ». */}
        <p>
          <span className="text-[color:var(--m-encre)]">Et ça recommence.</span>{" "}
          Un client content laisse un avis, l&apos;avis fait remonter votre fiche, et la
          demande suivante arrive sur le même site : sans que vous ayez rien relancé à la
          main.
        </p>
      </div>
    </div>
  );
}
