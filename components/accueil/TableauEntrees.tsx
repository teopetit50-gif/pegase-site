import Link from "next/link";
import { Check, Minus } from "lucide-react";
import { Chevron } from "@/components/offres/MediaMoteurs";

/* ══════════════════════════════════════════════════════════════════════
   « Laquelle pour moi ? » — le tableau des trois entrées (11/09/2026)

   ORIGINE. `comparison-02` de @hirael (Mohammad Shehadeh, MIT) —
   https://21st.dev/@hirael/components/comparison-02, code pris sur
   `21st.dev/r/hirael/comparison-02`. Un vrai `<table>` sémantique —
   `<caption>` en lecteur d'écran, `scope="col"` et `scope="row"` posés,
   une colonne mise en avant par un cadre et non par une couleur, et les
   oui/non doublés d'un `<span class="sr-only">` parce qu'une coche seule
   ne se lit pas à la voix. C'est le rare composant de comparaison de
   catalogue qui ne soit pas une grille de `<div>`.

   POURQUOI ICI. La section précédente pose trois portes côte à côte, et
   s'arrête là. Un visiteur qui arrive du pied de page d'une des quatre
   vitrines produit a une question de plus, et une seule : laquelle est la
   mienne. Trois cartes qui se ressemblent n'y répondent pas ; un tableau
   ligne à ligne, si.

   LA COLONNE MISE EN AVANT EST « LE SUR-MESURE », et ce n'est pas un
   hasard de mise en page : c'est la seule des trois qui ne se vende pas
   sans nous, donc la seule que cette page ait à défendre — les systèmes
   prêts ont chacun leur propre vitrine, qui argumente mieux, et les
   modèles se visitent tout seuls.

   CE QUI EST JETÉ.
   · Ses `<Badge>` et `<Button>` shadcn : la charte a `.o-pill` et
     `.o-btn`, et ce dépôt n'installe pas de primitives pour trois
     éléments.
   · Son `cn()` (pas de `lib/utils` ici) et ses jetons `bg-background`,
     `text-muted-foreground`, `border-border` : ce site n'a pas de jetons
     shadcn, il a `--o-line`, `--o-soft`, `.o-small`.
   · Sa `font-serif` sur le titre : la page n'a pas de police à empattement.
   · Son en-tête de section : la page a déjà son `EnTete`.

   D'OÙ SORT CHAQUE VALEUR. Aucune n'est écrite pour la circonstance :
   · les trois intitulés et leurs résumés viennent de `PORTES`, la section
     juste au-dessus ;
   · « 59 à 119 € par mois » : `PALIERS` de `lib/paliers.ts` (59 / 89 / 119) ;
   · « 990 € » : `PRIX_SITE_EUR` de `lib/site-commande.ts` ;
   · l'audit nécessaire au sur-mesure : c'est la seule offre du site qui
     exige le cadrage avant d'écrire, comme dit sur /offres/sur-mesure.
   Si l'une d'elles cesse d'être vraie, elle sort d'ici avant de devenir
   un argument — même règle que la section « hébergement ».

   DEUX RENDUS, UN SEUL JEU DE DONNÉES (11/09/2026, Teo : « sur téléphone
   cette section s'affiche mal, trouve un autre composant pour mobile ; sur
   ordi ça reste la même »).

   Le tableau demande 660 px au minimum. Relevé des largeurs disponibles
   dans `.o-wrap` :

       390 px d'écran → 342 px dispo · 318 px de tableau hors champ
       430 px         → 382 px       · 278 px hors champ
       640 px         → 590 px       ·  70 px hors champ
       768 px         → 718 px       ·  tient
      1024 px         → 974 px       ·  tient au large

   La version précédente gardait le tableau partout et tentait trois
   rustines : colonne des libellés figée, dégradé au bord droit, ligne
   « faites glisser ». Elles ne suffisent pas — et elles cachaient un défaut
   PIRE que celui qu'on voyait : le dégradé et l'invite étaient posés en
   `sm:hidden`, donc ils disparaissaient à 640 px alors que le tableau, lui,
   ne tient qu'à partir de 768. Entre les deux, la troisième offre était
   coupée SANS le moindre signal qu'elle existait.

   Sous `lg`, le tableau laisse donc la place à TROIS CARTES empilées :
   même contenu, même ordre, chaque ligne du tableau devenant un couple
   libellé / valeur en deux colonnes. On perd la comparaison d'un œil —
   c'est le prix, et il est mérité : une comparaison qu'on ne peut pas lire
   ne compare rien. À partir de `lg` le tableau revient, intact.

   Deux détails qui ne sont pas des détails :
   · Sur les cartes, un oui/non s'écrit en TOUTES LETTRES à côté de sa
     coche. Dans le tableau, l'en-tête de colonne désambiguïse une coche
     isolée ; dans une carte, elle flotte au milieu d'une cellule large.
   · La carte mise en avant se marque au TRAIT plein (`#18181b`), pas au
     fond. Un fond `#fafafa` sur une page blanche ne se voit pas sur un
     écran de téléphone en plein jour.

   La colonne figée du tableau reste, bien qu'elle ne puisse plus se
   déclencher : elle ne coûte rien et rattraperait un changement de
   gouttière de `.o-wrap`.

   LES TROIS PORTES DISPARAISSENT AUSSI SOUS `lg` (11/09/2026, 2ᵉ passe —
   Teo : « la section d'avant doit rester affichée sur PC, mais sur mobile
   c'est elle qui change »). Une fois les cartes posées, le téléphone
   enchaînait SIX cartes pour trois offres : les trois portes de
   `PortesHover`, puis les trois cartes d'ici, avec les mêmes noms, les mêmes
   résumés et les mêmes liens. 2 808 px de section à 390, contre 1 200 à
   1 440 — presque trois écrans de téléphone pour se répéter. Sur ordinateur
   le doublon ne se voit pas : une RANGÉE puis un TABLEAU sont deux formes
   différentes, et la première introduit la seconde. Empilées, ce sont deux
   fois la même chose.

   Le masquage se fait au point d'appel, dans `app/page.tsx`, pas dans
   `PortesHover` : le composant n'a aucune raison de connaître la page qui
   l'emploie. Et la phrase de chaque porte, elle, n'est PAS perdue — elle
   descend dans la carte par la prop `textes` ci-dessous. C'est la seule
   chose que les portes disaient de plus, il aurait été absurde de la jeter
   avec la forme.

   ══════════════════════════════════════════════════════════════════════ */

type Cellule = boolean | string;

const COLONNES: {
  nom: string;
  resume: string;
  vedette?: boolean;
  lien: { label: string; href: string };
}[] = [
  {
    nom: "Les systèmes prêts",
    resume: "Quatre postes déjà outillés",
    lien: { label: "Voir les quatre", href: "/offres" },
  },
  {
    nom: "Le sur-mesure",
    resume: "Ce qui n'existe pas encore",
    vedette: true,
    lien: { label: "Comment se fait le cadrage", href: "/offres/sur-mesure" },
  },
  {
    nom: "Votre site",
    resume: "Une vitrine qui tient debout",
    lien: { label: "Voir les modèles", href: "/modeles" },
  },
];

const LIGNES: { label: string; cellules: [Cellule, Cellule, Cellule] }[] = [
  {
    label: "Ce qui est déjà écrit",
    cellules: [
      "Les quatre systèmes, installés en l'état",
      "Rien : tout part de vos règles",
      "Vingt et un modèles, tous visitables",
    ],
  },
  {
    label: "Ce qu'on écrit avec vous",
    cellules: [
      "La cadence, les plafonds, les verrous d'envoi",
      "Le besoin, cadré et chiffré avant la première ligne",
      "Le contenu, réécrit à votre métier",
    ],
  },
  {
    label: "Un cadrage avant de commencer",
    cellules: ["Facultatif", true, false],
  },
  {
    label: "Le prix est public",
    cellules: [true, false, true],
  },
  {
    label: "Combien",
    cellules: ["59 à 119 € par mois", "Chiffré après le cadrage", "990 €"],
  },
];

/* `mot` : écrire « Oui » / « Non » en clair à côté de la coche. Vrai sur
   les cartes, faux dans le tableau — voir l'en-tête. */
function Valeur({ valeur, mot }: { valeur: Cellule; mot?: boolean }) {
  if (typeof valeur === "string") {
    return <span className="o-small !text-[14px] !leading-[22px]">{valeur}</span>;
  }
  const icone = valeur ? (
    <Check aria-hidden className="h-4 w-4 shrink-0 text-[#18181b]" />
  ) : (
    <Minus aria-hidden className="h-4 w-4 shrink-0 text-[#a1a1aa]" />
  );
  if (!mot) {
    return (
      <>
        {icone}
        <span className="sr-only">{valeur ? "Oui" : "Non"}</span>
      </>
    );
  }
  return (
    <span className="inline-flex items-center gap-2">
      {icone}
      <span
        className={
          "text-[14px] leading-[22px] " +
          (valeur ? "font-medium text-[#18181b]" : "text-[#a1a1aa]")
        }
      >
        {valeur ? "Oui" : "Non"}
      </span>
    </span>
  );
}

/* ——— sous `lg` : les trois entrées en cartes empilées ———
   `textes` porte la phrase de chaque porte, celle que `PortesHover` affiche
   sur ordinateur. Elle est passée par la page plutôt que recopiée ici :
   `PORTES` reste la seule source, et un texte réécrit là-bas suit tout seul.
   Clé = le nom de l'entrée ; s'il ne correspond à rien, la carte se rend
   simplement sans la phrase, elle ne casse pas. */
function CartesEntrees({ textes }: { textes?: Record<string, string> }) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:hidden">
      {COLONNES.map((c, col) => (
        <div
          key={c.nom}
          className={
            "rounded-[14px] border bg-white p-6 " +
            (c.vedette ? "border-[#18181b]" : "border-[#e4e4e7]")
          }
        >
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[18px] font-semibold tracking-[-0.02em] text-[#09090b]">
              {c.nom}
            </h3>
            {c.vedette ? (
              <span className="o-pill o-pill--xs">Le cœur du métier</span>
            ) : null}
          </div>
          <p className="o-small mt-1 !text-[14px] !leading-[22px]">{c.resume}</p>
          {textes?.[c.nom] ? (
            <p className="o-body mt-3 !text-[15px] !leading-[24px]">
              {textes[c.nom]}
            </p>
          ) : null}

          <dl className="mt-5 border-t border-[#e4e4e7]">
            {LIGNES.map((l) => (
              <div
                key={l.label}
                className="grid grid-cols-[minmax(0,7.5rem)_minmax(0,1fr)] gap-4 border-b border-[#f4f4f5] py-3 sm:grid-cols-[minmax(0,11rem)_minmax(0,1fr)]"
              >
                <dt className="o-small !text-[13px] !leading-[20px]">
                  {l.label}
                </dt>
                <dd className="text-[14px] leading-[22px] text-[#18181b]">
                  <Valeur valeur={l.cellules[col]} mot />
                </dd>
              </div>
            ))}
          </dl>

          <Link href={c.lien.href} className="o-link mt-5 !text-[14px]">
            {c.lien.label}
            <Chevron taille={12} />
          </Link>
        </div>
      ))}
    </div>
  );
}

export default function TableauEntrees({
  textes,
}: {
  textes?: Record<string, string>;
}) {
  return (
    <div data-reveal className="mt-14">
      <CartesEntrees textes={textes} />

      {/* le tableau ne paraît qu'à partir de `lg`, la seule largeur où il
          tient sans être coupé — voir le relevé en tête de fichier. */}
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full min-w-[660px] border-collapse text-left">
        <caption className="sr-only">
          Comparaison des trois façons de commencer avec Omega.AI : les
          systèmes prêts, le sur-mesure, et la fabrication de votre site.
        </caption>
        <thead>
          <tr>
            <th
              scope="col"
              className="sticky left-0 z-20 w-[26%] bg-white p-4 align-bottom"
            >
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#a1a1aa]">
                Par quoi on commence
              </span>
            </th>
            {COLONNES.map((c) => (
              <th
                key={c.nom}
                scope="col"
                className={
                  "p-4 align-bottom" +
                  (c.vedette
                    ? " rounded-t-[12px] border border-b-0 border-[#e4e4e7] bg-[#fafafa]"
                    : "")
                }
              >
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-[16px] font-semibold tracking-[-0.02em] text-[#09090b]">
                    {c.nom}
                  </span>
                  {c.vedette ? (
                    <span className="o-pill o-pill--xs">Le cœur du métier</span>
                  ) : null}
                </span>
                <span className="o-small mt-1 block !text-[14px] !leading-[22px] font-normal">
                  {c.resume}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {LIGNES.map((l) => (
            <tr key={l.label} className="border-t border-[#e4e4e7]">
              <th
                scope="row"
                className="sticky left-0 z-20 bg-white p-4 align-top text-[15px] font-medium leading-[23px] text-[#18181b]"
              >
                {l.label}
              </th>
              {l.cellules.map((valeur, i) => (
                <td
                  key={COLONNES[i].nom}
                  className={
                    "p-4 align-top" +
                    (COLONNES[i].vedette
                      ? " border-x border-[#e4e4e7] bg-[#fafafa]"
                      : "")
                  }
                >
                  <span className="flex h-full items-start">
                    <Valeur valeur={valeur} />
                  </span>
                </td>
              ))}
            </tr>
          ))}
          <tr className="border-t border-[#e4e4e7]">
            <td className="sticky left-0 z-20 bg-white" />
            {COLONNES.map((c) => (
              <td
                key={c.nom}
                className={
                  "p-4 align-top" +
                  (c.vedette
                    ? " rounded-b-[12px] border-x border-b border-[#e4e4e7] bg-[#fafafa]"
                    : "")
                }
              >
                <Link href={c.lien.href} className="o-link !text-[14px]">
                  {c.lien.label}
                  <Chevron taille={12} />
                </Link>
              </td>
            ))}
          </tr>
        </tbody>
        </table>
      </div>
    </div>
  );
}
