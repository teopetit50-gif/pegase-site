"use client";

import { useId } from "react";
import { PenLine, MessagesSquare } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

/* ══════════════════════════════════════════════════════════════════════
   <HeroBento> — le visuel du hero de /offres (15/09/2026)

   REMPLACE <HeroCollage> (components/offres/Media.tsx), le collage de trois
   fenêtres flottantes : un tableau de bord au centre, un brouillon de
   relance posé en bas à gauche, une conversation en bas à droite. Ce qu'il
   coûtait : une scène en position absolue de 590 px de haut, dont les deux
   panneaux latéraux DISPARAISSAIENT sous 1024 px (ils se seraient
   chevauchés) — la moitié du propos tombait sur téléphone, là où passe la
   moitié du trafic.

   ORIGINE. Deux composants demandés par Teo, tressés :
   • `bento-02` de @ln-dev7 (lndev-ui, 21st.dev) pour la figure : une tuile
     large qui ouvre, deux tuiles égales dessous, même rayon, même filet.
     C'est déjà le vocabulaire de la section « moteurs » plus bas dans la
     page (components/ui/bento-02.tsx) : le hero et le corps de page
     parlent enfin la même langue.
   • le `public-stats` / `StatsChart` (carte + aire recharts) pour la tuile
     large : la courbe dit en un coup d'œil ce que quatre lignes de tableau
     disaient en quatre lectures.

   CE QUI EST JETÉ des sources :
   • `Card`/`CardHeader`/`ChartContainer` de shadcn, et avec eux `bg-card`,
     `bg-muted`, `text-muted-foreground`, `border-border` : sous `.offres`
     ces jetons tombent sur le fond de page — une carte invisible, sans
     erreur. Les tuiles prennent `--o-line` / `--o-soft`, la maquette prend
     les `--demo-*` (donc elle suivrait un conteneur `.offres--sombre`).
   • le lavis indigo `rgba(99,102,241,.15)` de bento-02 : encre diluée, la
     charte du site est monochrome.
   • le tirage USGS de public-stats (`fetch`, `ai`, `zod`, l'outil serveur) :
     aucun appel réseau dans un hero. La série est une constante ici.
   • `ChartLegend`/`ChartTooltipContent` : une seule série, la légende tient
     en une ligne et l'infobulle en trois lignes écrites à la main.
   • les points (`dot`) sur chaque semaine : douze pastilles sur 900 px font
     une guirlande ; seul le point survolé se montre.

   LA RÈGLE DE Media.tsx TIENT TOUJOURS : ces maquettes n'inventent aucun
   chiffre CLIENT. Sogexal, Novasud, Métalco, Vallier sont l'univers de
   démonstration du site (le même que l'espace client et /modeles), les
   montants sont des exemples visuels, et le pied de la tuile le dit en
   toutes lettres. Rien ici n'est présenté comme un résultat mesuré : la
   courbe monte et redescend, elle ne raconte pas une victoire.

   ÉCARTS ASSUMÉS.
   • Composant CLIENT (recharts mesure son conteneur). Le reste du hero
     reste rendu au serveur ; seule cette tuile s'hydrate.
   • Hauteur de courbe FIXE (180 px, 240 px au-delà de sm) : recharts ne
     peint rien avant d'avoir mesuré, une hauteur libre ferait sauter la
     page au premier rendu.
   • L'identifiant du dégradé passe par `useId()` débarrassé de ses
     deux-points : deux exemplaires du même dégradé sur une page et le
     second peint dans le vide.
   • `data-reveal` n'est PAS posé ici : la page le porte déjà sur le bloc
     qui contient le composant, et deux révélations imbriquées se
     disputeraient le même transform.
   ══════════════════════════════════════════════════════════════════════ */

/* ——— la série : douze semaines d'encours suivi (démonstration) ———
   Le dernier point vaut le chiffre affiché en grand : la courbe et le KPI
   ne peuvent pas se contredire. */
const SEMAINES: { semaine: string; encours: number }[] = [
  { semaine: "24 juin", encours: 61200 },
  { semaine: "1 juil.", encours: 68400 },
  { semaine: "8 juil.", encours: 64100 },
  { semaine: "15 juil.", encours: 79300 },
  { semaine: "22 juil.", encours: 74600 },
  { semaine: "29 juil.", encours: 82100 },
  { semaine: "5 août", encours: 71800 },
  { semaine: "12 août", encours: 66500 },
  { semaine: "19 août", encours: 77200 },
  { semaine: "26 août", encours: 69400 },
  { semaine: "2 sept.", encours: 63100 },
  { semaine: "9 sept.", encours: 58850 },
];

const euros = (v: number) => `${v.toLocaleString("fr-FR")} €`;

function Infobulle({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value?: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-[8px] border border-[rgba(9,9,11,0.08)] bg-white px-2.5 py-2 shadow-[0_8px_20px_-12px_rgba(9,9,11,0.35)]">
      <div className="text-[10px] font-medium uppercase tracking-[0.06em] text-[#a1a1aa]">
        Semaine du {label}
      </div>
      <div
        className="mt-1 text-[13px] font-semibold text-[#09090b]"
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        {euros(Number(payload[0]?.value ?? 0))}
      </div>
      <div className="text-[10.5px] text-[#71717a]">en attente de règlement</div>
    </div>
  );
}

export function HeroBento() {
  const brut = useId();
  const dg = `hb-aire-${brut.replace(/:/g, "")}`;

  return (
    <div className="mx-auto grid w-full max-w-[900px] grid-cols-1 items-start gap-4 sm:grid-cols-2">
      {/* ═══════════ tuile large — l'encours et sa courbe ═══════════ */}
      <div className="relative z-0 overflow-hidden rounded-[20px] border border-[var(--o-line)] bg-[var(--o-soft)] p-5 sm:col-span-2 sm:p-7 lg:pb-[132px]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 60% 90% at 78% 30%, rgba(9,9,11,0.06), transparent)",
          }}
        />

        <div className="relative">
          {/* en-tête : le chiffre à gauche, la validation à droite — comme
              dans le tableau de bord qu'elle remplace. Une seule ligne dès
              480 px, empilée en dessous. */}
          <div className="flex flex-col gap-3 min-[480px]:flex-row min-[480px]:items-start min-[480px]:justify-between">
            <div>
              <div className="text-[11px] font-medium uppercase tracking-[0.06em] text-[#a1a1aa]">
                En attente de règlement
              </div>
              <div
                className="mt-1 whitespace-nowrap text-[30px] font-semibold leading-none tracking-[-0.03em] text-[#09090b] sm:text-[34px]"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                58 850 €
              </div>
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <span className="o-demo-jeton--ok inline-flex items-center rounded-[6px] px-2 py-[3px] text-[10.5px] font-semibold tracking-[0.02em]">
                  3 relances parties ce matin
                </span>
                <span className="o-demo-jeton--warn inline-flex items-center rounded-[6px] px-2 py-[3px] text-[10.5px] font-semibold tracking-[0.02em]">
                  2 en attente de votre accord
                </span>
              </div>
            </div>

            <span className="w-fit shrink-0 whitespace-nowrap rounded-[8px] bg-[#18181b] px-3.5 py-2 text-[11.5px] font-semibold text-white">
              Tout valider
            </span>
          </div>

          {/* la courbe */}
          <div className="mt-6 h-[180px] w-full sm:h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={SEMAINES}
                /* marge gauche à ZÉRO, pas négative : à 375 px la marge
                   négative sortait le premier chiffre des graduations hors
                   du viewBox — « 40 k€ » se lisait « 0 k€ ». Invisible sur
                   grand écran, où l'axe a de la place. */
                margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
              >
                <defs>
                  <linearGradient id={dg} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#09090b" stopOpacity={0.16} />
                    <stop offset="100%" stopColor="#09090b" stopOpacity={0} />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  vertical={false}
                  strokeDasharray="3 3"
                  stroke="rgba(9,9,11,0.07)"
                />
                <XAxis
                  dataKey="semaine"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={10}
                  minTickGap={28}
                  tick={{ fontSize: 11, fill: "#a1a1aa" }}
                />
                {/* domaine CADRÉ (40–90 k) et non [0, auto] : à partir de
                    zéro, douze valeurs entre 58 et 82 k s'écrasent dans le
                    tiers haut et l'aire devient un pavé gris. L'axe ne part
                    pas de zéro — c'est une maquette de tableau de bord, pas
                    une figure de comparaison. */}
                <YAxis
                  /* 52 et non 44 : à 375 px « 40 k€ » se cassait en deux
                     lignes dans une gouttière trop étroite. */
                  width={52}
                  domain={[40000, 90000]}
                  ticks={[40000, 60000, 80000]}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={6}
                  tick={{ fontSize: 11, fill: "#a1a1aa" }}
                  tickFormatter={(v: number) => `${Math.round(v / 1000)} k€`}
                />
                <Tooltip
                  content={<Infobulle />}
                  cursor={{ stroke: "rgba(9,9,11,0.18)", strokeDasharray: "3 3" }}
                />
                <Area
                  type="monotone"
                  dataKey="encours"
                  stroke="#09090b"
                  strokeWidth={1.6}
                  fill={`url(#${dg})`}
                  dot={false}
                  activeDot={{ r: 3.5, fill: "#09090b", stroke: "#ffffff", strokeWidth: 2 }}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* légende + mention : une série, donc une ligne */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 border-t border-[var(--o-line)] pt-3.5">
            <span className="inline-flex items-center gap-2 text-[11.5px] font-medium text-[#52525b]">
              <span className="h-2 w-2 rounded-[2px] bg-[#09090b]" />
              Encours suivi, semaine par semaine
            </span>
            <span className="text-[11px] text-[#a1a1aa]">
              Démonstration · 12 dernières semaines
            </span>
          </div>
        </div>
      </div>

      {/* ═══════════ tuile — le brouillon à valider ═══════════ */}
      <Tuile
        /* 15/09 (Teo) — « celle en bas à gauche, mets-la plus à gauche ».
           Le décalage se fait en TRANSLATION, pas en marge : une marge
           négative de plus élargirait la tuile (elle est étirée par la
           grille) et les deux tuiles n'auraient plus la même largeur. La
           translation la déplace à largeur constante. Et elle n'arrive
           qu'à xl : à 1024 px, la gouttière entre la scène de 900 et le
           bord de l'écran ne fait que 62 px — décalée de 56 de plus, la
           tuile frôlerait le bord de l'écran, ce qui se lit comme un bug
           et non comme une intention. Entre lg et xl elle garde le débord
           de 18 px, symétrique de celui de droite. */
        pose="lg:-ml-[18px] lg:-mt-[104px] xl:-translate-x-[56px]"
        icone={PenLine}
        titre="Rien ne part sans vous"
        texte="Le texte est préparé, calé sur l’échéance et posé dans votre file. Vous envoyez, vous corrigez, ou vous ne faites rien."
      >
        <div className="o-demo !rounded-[12px] !shadow-none">
          <div className="o-demo-sep px-3.5 py-2.5 text-[11px] font-semibold tracking-[0.02em] text-[#52525b]">
            Relance : à valider
          </div>
          <div className="px-3.5 py-3">
            <p className="text-[11.5px] leading-[1.7] text-[#52525b]">
              Bonjour, la facture FA-2402 arrive à échéance vendredi.
              Souhaitez-vous que je vous renvoie le lien de paiement&nbsp;?
            </p>
            <div className="mt-3 flex gap-2">
              <span className="rounded-[6px] bg-[#18181b] px-2.5 py-1 text-[10px] font-semibold text-white">
                Envoyer
              </span>
              <span className="rounded-[6px] border border-[rgba(9,9,11,0.1)] px-2.5 py-1 text-[10px] font-semibold text-[#52525b]">
                Corriger
              </span>
            </div>
          </div>
        </div>
      </Tuile>

      {/* ═══════════ tuile — la demande entrée la nuit ═══════════ */}
      <Tuile
        pose="lg:-mr-[18px] lg:-mt-[152px]"
        icone={MessagesSquare}
        titre="Répondu pendant la nuit"
        texte="Une demande entre à 21 h 46. La réponse part dans la minute, la pièce chiffrée attend votre accord au matin."
      >
        <div className="o-demo !rounded-[12px] !shadow-none">
          <div className="o-demo-sep flex items-center justify-between gap-2 px-3.5 py-2.5">
            <span className="text-[11px] font-semibold text-[#52525b]">
              Demande entrante · 21 h 46
            </span>
            <span className="o-demo-jeton--ok inline-flex items-center rounded-[6px] px-2 py-[2px] text-[10px] font-semibold">
              Traitée
            </span>
          </div>
          <div className="space-y-2 px-3.5 py-3">
            <div className="o-demo-recu max-w-[86%] rounded-[10px] rounded-tl-[3px] px-2.5 py-2 text-[11px] leading-[1.6]">
              Vous pouvez chiffrer 40 unités&nbsp;?
            </div>
            <div className="o-demo-envoi ml-auto max-w-[90%] rounded-[10px] rounded-tr-[3px] px-2.5 py-2 text-[11px] leading-[1.6]">
              Oui. Je vous envoie le devis demain matin.
            </div>
            <div className="pt-0.5 text-right text-[10px] text-[#a1a1aa]">
              Répondu en 40 s
            </div>
          </div>
        </div>
      </Tuile>
    </div>
  );
}

/* ——— une tuile basse : pastille d'icône, titre, texte, maquette arrimée en
   bas (`mt-auto` — sans lui, la maquette de la tuile la plus courte
   flotterait au milieu de sa hauteur).

   `pose` — LA SUPERPOSITION, à partir de lg seulement (15/09, Teo : « faut
   qu'il se superpose sur ordi »). C'est ce que faisait le collage
   d'avant : deux panneaux posés EN AVANT du tableau de bord, décalés,
   l'un plus haut que l'autre. Ici la remontée se fait à la marge
   (`-mt`) plutôt qu'en position absolue : les tuiles restent dans le
   flux, donc elles gardent leur hauteur propre, la section garde la
   sienne, et rien ne déborde sur la bande noire qui suit — c'était le
   défaut de la scène en absolu, qui imposait une hauteur en dur.
   Le débord latéral (`-ml`/`-mr` de 18 px) les fait dépasser des 900 px
   de la scène, comme les -14 px du collage.
   Sous lg : tout retombe en grille, aucune de ces classes ne s'applique.

   Trois choses vont ensemble et ne se séparent pas : le `z-10` (sans lui
   la tuile passe DERRIÈRE la grande, qui est peinte après dans l'ordre du
   DOM), le fond BLANC (sur le gris de la grande tuile, un fond gris
   identique ne se verrait pas — la superposition ne se lirait plus), et
   l'ombre portée, qui est ce qui dit « posé au-dessus ». ——— */
function Tuile({
  icone: Icone,
  titre,
  texte,
  pose = "",
  children,
}: {
  icone: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  titre: string;
  texte: string;
  pose?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`relative z-10 flex flex-col rounded-[20px] border border-[var(--o-line)] bg-[var(--o-soft)] p-5 sm:p-6 lg:bg-white lg:shadow-[0_2px_4px_rgba(9,9,11,0.04),0_22px_44px_-26px_rgba(9,9,11,0.38)] ${pose}`}
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[var(--o-line)] bg-white">
        <Icone className="h-[18px] w-[18px]" strokeWidth={1.6} />
      </span>
      <h3 className="o-h5 mt-4 !text-[18px]">{titre}</h3>
      <p className="o-small mt-1.5">{texte}</p>
      <div className="mt-auto w-full pt-5">{children}</div>
    </div>
  );
}

export default HeroBento;
