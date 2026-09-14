"use client";

import { useEffect, useState } from "react";
import { AnimatedPath } from "@/components/produits/factures/ui/animated-path";

/* ══════════════════════════════════════════════════════════════════════
   La grille de `#fonctionnement`, relevée sur l'IMPLÉMENTATION de la
   référence (HTML rendu + feuille compilée), pas sur son apparence.

   Ce que le relevé a corrigé, et qui expliquait le « ça ne fait pas
   pro » :

   · Ce n'est PAS quatre cartes flottantes. C'est UN bloc encadré
     (`rounded-xl border-[#171717]/[0.16]`, fond radial + dégradé) divisé en
     quatre `<article>` par des filets INTERNES. Un objet, pas quatre.
   · Les articles font `min-h-[620px]` avec `lg:p-10`. Les miens
     faisaient 300 px avec 24 px de marge : tout était à l'étroit.
   · Les titres sont en `text-2xl lg:text-3xl font-medium` — 24 puis
     30 px, dans la police de texte, pas la police d'affichage. Les
     miens étaient à 17 px.
   · La maquette est emboîtée deux fois : un cadre `rounded-[14px]
     p-[5px]` qui porte le masque d'évanouissement, et dedans une fenêtre
     `rounded-[8px]` au fond `linear-gradient(145deg, #131315, #070708)`
     — passé en clair à `linear-gradient(145deg, #ffffff, #efeef0)`.
     C'est ce dégradé à 145° qui donne le relief — un aplat ne l'a pas.
   · Les jauges sont des dégradés de COULEUR
     (`from-cyan-600/80 via-cyan-400 to-cyan-200`, retournés en clair). La référence est
     monochrome partout ailleurs et se réserve la couleur ici. C'est
     exactement ce qui fait ressortir la carte.
   · Chaque article porte un filet qui se déploie au survol
     (`w-0 → group-hover:w-full`).

   ── PASSAGE EN CLAIR (11/09/2026) — DEUX GESTES REPENSÉS ─────────────

   1. LE RELIEF. Le bloc et chaque fenêtre tenaient leur volume d'une
      LUEUR venue du haut (radial blanc sur le bloc, dégradé à 145° du
      gris clair vers le noir dans la fenêtre). Une lueur ne se transpose
      pas sur du papier : elle y ferait une tache grise. Ce qui se
      transpose, c'est la DIRECTION de la lumière — elle vient toujours
      du haut. Le bloc et les fenêtres passent donc d'un dégradé qui
      ÉCLAIRE le haut à un dégradé qui OMBRE le bas : `#ffffff → #f2f2f3`
      pour le bloc, `145deg #ffffff → #efeef0` pour la fenêtre. Même
      volume, même source, matière opposée.

   2. LES TROIS JAUGES DE COULEUR — la seule couleur de la page, et ce
      qui fait ressortir la carte « Cette semaine ». Leurs dégradés
      allaient du saturé vers le PÂLE, parce que sur du noir le pâle EST
      la lumière. Sur du papier, le pâle est l'absence d'encre : suivis à
      la lettre, ils s'éteindraient en allant vers la droite. Les trois
      sont donc RETOURNÉS — `from-*-200 via-*-400 to-*-600` — et le
      dégradé s'appuie en avançant, ce qui est exactement ce que faisait
      l'original.

   3. LA PASTILLE ACTIVE d'une étape était `bg-white text-black`, c'est-
      à-dire l'inverse de sa surface. Elle le reste : `bg-[#171717]
      text-white`. Un état actif se marque en s'opposant à son fond, pas
      en reprenant une couleur.
   ══════════════════════════════════════════════════════════════════════ */

function mouvementReduit() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function Article({
  titre,
  texte,
  court,
  children,
  className = "",
}: {
  titre: string;
  texte: string;
  /* Version mobile. La maquette au-dessus montre déjà ce que la phrase
     longue décrit : au téléphone elle fait doublon et allonge la page. */
  court: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <article
      className={`group relative flex min-h-[400px] flex-col overflow-hidden px-[15px] py-6 sm:min-h-[520px] sm:py-8 lg:min-h-[620px] lg:p-10 ${className}`}
    >
      <div className="flex flex-1 items-center">{children}</div>
      <div className="mt-auto pt-6 sm:pt-8 lg:-translate-y-5">
        <h3 className="text-[21px] font-medium tracking-tight text-[#171717] sm:text-2xl lg:text-3xl">{titre}</h3>
        <p className="mt-2.5 max-w-md text-[15px] leading-relaxed text-[#4d4d4d] sm:hidden">
          {court}
        </p>
        <p className="mt-3 hidden max-w-md text-base leading-relaxed text-[#4d4d4d] sm:block">
          {texte}
        </p>
      </div>
      <span
        aria-hidden="true"
        className="absolute bottom-0 left-0 h-px w-0 bg-gradient-to-r from-[#171717]/0 via-[#171717]/45 to-[#171717]/0 transition-all duration-500 group-hover:w-full"
      />
    </article>
  );
}

/* Le double emboîtement de la référence : cadre masqué, puis fenêtre. */
function Fenetre({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative w-full overflow-hidden rounded-[14px] border border-[#171717]/[0.12] p-[5px] [-webkit-mask-image:linear-gradient(to_bottom,#000_0%,#000_76%,transparent_100%)] [mask-image:linear-gradient(to_bottom,#000_0%,#000_76%,transparent_100%)]">
      <div className="mx-auto w-full max-w-[620px] overflow-hidden rounded-[8px] border border-[#171717]/[0.12] bg-[linear-gradient(145deg,#ffffff,#efeef0)] font-sans">
        {children}
      </div>
    </div>
  );
}

function EnTete({
  gauche,
  droite,
  point = false,
}: {
  gauche: string;
  droite: string;
  point?: boolean;
}) {
  return (
    <div className="flex items-center justify-between border-b border-[#171717]/[0.08] px-[18px] py-[11px]">
      <div className="flex items-center gap-[7px]">
        {point && <span className="inline-block size-[6px] rounded-full bg-emerald-500" />}
        <span className="font-mono text-[10px] leading-tight tracking-[0.1em] text-[#737373]">
          {gauche}
        </span>
      </div>
      <span className="shrink-0 whitespace-nowrap font-mono text-[10px] text-[#8f8f8f]">
        {droite}
      </span>
    </div>
  );
}

/* ── 1. Le parcours d'une pièce ───────────────────────────────────────── */

const ETAPES: [string, string][] = [
  ["Reçue", "pièce jointe d'un mail fournisseur"],
  ["Lue", "HT, TVA, TTC, date, numéro, fournisseur"],
  ["Recoupée", "les trois montants tombent juste"],
  ["Classée", "sous Sogedis Matériel, septembre"],
  ["Transmise", "dans le dossier comptable"],
];

function CartePercours() {
  const [actif, setActif] = useState(0);

  useEffect(() => {
    if (mouvementReduit()) return;
    const t = setInterval(() => {
      if (document.hidden) return;
      setActif((n) => (n + 1) % ETAPES.length);
    }, 1700);
    return () => clearInterval(t);
  }, []);

  return (
    <Fenetre>
      <EnTete gauche="PARCOURS D'UNE PIÈCE · EN DIRECT" droite="5 étapes · 0 perdue" point />
      <div className="relative p-5">
        <svg
          className="pointer-events-none absolute left-[30px] top-6 h-[calc(100%-3rem)] w-3"
          viewBox="0 0 12 240"
          preserveAspectRatio="none"
          fill="none"
          aria-hidden="true"
        >
          <AnimatedPath d="M 6 0 V 240" id="filed-parcours" duree={3.4} />
        </svg>

        <ol className="relative flex flex-col gap-2">
          {ETAPES.map(([t, d], i) => {
            const est = i === actif;
            return (
              <li
                key={t}
                className={`flex items-center gap-3 rounded-[6px] border px-3 py-2.5 transition-colors duration-500 ${
                  est ? "border-[#171717]/[0.19] bg-[#171717]/[0.065]" : "border-[#171717]/[0.08] bg-[#171717]/[0.03]"
                }`}
              >
                <span
                  className={`flex size-5 shrink-0 items-center justify-center rounded-full font-mono text-[10px] transition-colors duration-500 ${
                    est ? "bg-[#171717] text-white" : "bg-[#171717]/[0.07] text-[#5f5f5f]"
                  }`}
                >
                  {i + 1}
                </span>
                <span
                  className={`w-[84px] shrink-0 font-mono text-[10px] uppercase tracking-[0.1em] transition-colors duration-500 ${
                    est ? "text-[#171717]" : "text-[#4d4d4d]"
                  }`}
                >
                  {t}
                </span>
                <span className="truncate text-xs text-[#5f5f5f]">{d}</span>
              </li>
            );
          })}
        </ol>
      </div>
    </Fenetre>
  );
}

/* ── 2. La semaine ────────────────────────────────────────────────────
   Décalque de leur carte « Schedule » : grille de sept colonnes en
   filets, libellés des jours, et une jauge de couleur par pièce, posée
   sur la semaine (`left` + `width`). */

const JOURS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

const PIECES = [
  {
    nom: "Sogedis Matériel",
    voie: "MAIL · 1 240,00 €",
    etat: "CLASSÉE",
    gauche: 8,
    large: 43,
    degrade: "from-cyan-200 via-cyan-400 to-cyan-600/80",
  },
  {
    nom: "Antilles Énergie",
    voie: "MENSUEL · 386,40 €",
    etat: "TRANSMISE",
    gauche: 28,
    large: 27,
    degrade: "from-emerald-200 via-emerald-400 to-emerald-600/80",
  },
  {
    nom: "Loc'Outils 971",
    voie: "SCAN · 912,00 €",
    etat: "À VALIDER",
    gauche: 54,
    large: 31,
    degrade: "from-violet-200 via-violet-400 to-violet-600/80",
  },
];

function CarteSemaine() {
  return (
    <Fenetre>
      <div className="flex min-h-16 items-center justify-between gap-3 px-5 py-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="shrink-0 whitespace-nowrap text-base font-medium text-[#171717]">
            Cette semaine
          </div>
          {/* Le sous-titre disparaît sous sm : à 390 il cassait le titre
              en deux lignes et le libellé lui-même en « 7 DERNIERS /
              JOURS ». */}
          <span className="hidden whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.16em] text-[#737373] sm:inline">
            7 derniers jours
          </span>
        </div>
        <span className="shrink-0 whitespace-nowrap rounded-full border border-[#171717]/[0.14] bg-[#171717]/[0.05] px-2 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-[#5f5f5f]">
          6 pièces
        </span>
      </div>
      <div className="h-px w-full bg-[#171717]/[0.07]" />

      <div className="relative p-5">
        <div aria-hidden="true" className="absolute inset-x-5 bottom-5 top-5 grid grid-cols-7">
          {JOURS.map((j) => (
            <span key={j} className="border-l border-[#171717]/[0.08] first:border-l-0" />
          ))}
        </div>

        <div className="relative flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.12em] text-[#737373]">
          {JOURS.map((j) => (
            <span key={j}>{j}</span>
          ))}
        </div>

        <div className="relative mt-5 flex flex-col gap-4">
          {PIECES.map((p) => (
            <div key={p.nom} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-2">
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-[#171717]">{p.nom}</p>
                <p className="mt-0.5 font-mono text-[9px] tracking-[0.08em] text-[#737373]">
                  {p.voie}
                </p>
              </div>
              <span className="font-mono text-[9px] text-[#737373]">{p.etat}</span>
              <div className="relative col-span-2 h-2 overflow-hidden rounded-full bg-[#171717]/[0.055]">
                <span
                  className={`absolute inset-y-0 rounded-full bg-gradient-to-r ${p.degrade}`}
                  style={{ left: `${p.gauche}%`, width: `${p.large}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="relative mt-5 flex items-center justify-between border-t border-[#171717]/[0.10] pt-3 font-mono text-[9px] tracking-[0.08em] text-[#737373]">
          <span>3 canaux d&apos;arrivée</span>
          <span>0 pièce ressaisie</span>
        </div>
      </div>
    </Fenetre>
  );
}

/* ── 3. Les garde-fous ────────────────────────────────────────────────── */

const REFUS: [string, string][] = [
  ["Pièce déjà reçue", "Écartée"],
  ["Montants qui ne tombent pas juste", "Mise de côté"],
  ["Fournisseur inconnu", "Validation"],
  ["Doublon de numéro", "Écartée"],
  ["Devise inattendue", "Validation"],
];

function CarteGardeFous() {
  return (
    <Fenetre>
      {/* « verrous » était le mot de la base, pas celui du lecteur —
          aligné sur la tuile « Contrôles avant classement ». */}
      <EnTete gauche="CE QUI NE PASSE PAS" droite="12 contrôles" />
      <div className="p-5">
        <ul className="flex flex-col">
          {REFUS.map(([r, e]) => (
            <li
              key={r}
              className="flex items-center justify-between gap-3 border-b border-[#171717]/[0.07] py-3 last:border-0"
            >
              {/* Pas de `truncate` : à 390, « Montants qui ne tombent pas
                  juste » se coupait en « …ne tombent p… ». On laisse le
                  texte passer à la ligne. */}
              <span className="text-xs leading-snug text-[#2b2b2b]">{r}</span>
              <span className="shrink-0 rounded-full border border-[#171717]/[0.14] bg-[#171717]/[0.05] px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-[#5f5f5f]">
                {e}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </Fenetre>
  );
}

/* ── 4. Ce qui remonte ────────────────────────────────────────────────── */

const FILE: [string, string, string][] = [
  ["Une validation vous attend", "Loc'Outils 971 — fournisseur jamais vu", "8 min"],
  ["Montant à vérifier", "Papeterie du Port — TVA incohérente", "1 h"],
  ["Dossier prêt", "Août transmis à la comptabilité, 214 pièces", "3 h"],
  ["Doublon écarté", "Sogedis — facture déjà reçue le 02/09", "1 j"],
];

function CarteFile() {
  const [actif, setActif] = useState(0);

  useEffect(() => {
    if (mouvementReduit()) return;
    const t = setInterval(() => {
      if (document.hidden) return;
      setActif((n) => (n + 1) % FILE.length);
    }, 2100);
    return () => clearInterval(t);
  }, []);

  return (
    <Fenetre>
      <EnTete gauche="FILE DE VALIDATION · EN DIRECT" droite="4 en attente" point />
      <div className="flex flex-col gap-2 p-5">
        {FILE.map(([t, d, q], i) => (
          <div
            key={t}
            className={`flex items-center gap-3 rounded-[6px] border px-3 py-2.5 transition-colors duration-500 ${
              i === actif ? "border-[#171717]/[0.19] bg-[#171717]/[0.065]" : "border-[#171717]/[0.08] bg-[#171717]/[0.03]"
            }`}
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-medium text-[#171717]">{t}</span>
              <span className="mt-0.5 block truncate text-[11px] text-[#5f5f5f]">{d}</span>
            </span>
            <span className="shrink-0 font-mono text-[9px] text-[#737373]">{q}</span>
          </div>
        ))}
      </div>
    </Fenetre>
  );
}

/* ── Le bloc ──────────────────────────────────────────────────────────── */

export default function Bento() {
  return (
    <div className="mx-0 mt-8 grid overflow-hidden rounded-xl border border-[#171717]/[0.16] bg-[linear-gradient(#ffffff,#f2f2f3)] md:grid-cols-2 lg:mx-5">
      <Article
        titre="Aucune pièce ne se perd"
        court="Cinq étapes, toujours les mêmes."
        texte="Cinq étapes, toujours les mêmes, avec l'état de chacune visible à tout moment."
        className="border-b border-[#171717]/[0.16] md:border-r md:border-[#171717]/[0.16]"
      >
        <CartePercours />
      </Article>

      <Article
        titre="Votre semaine, sans y toucher"
        court="Ce qui est arrivé, et où chaque pièce en est."
        texte="Ce qui est arrivé, par quel canal, et où chaque pièce en est. Le format ne vous concerne plus."
        className="border-b border-[#171717]/[0.16]"
      >
        <CarteSemaine />
      </Article>

      {/* « Les garde-fous » était une étiquette de notice, et elle
          portait le même nom que la section #garde-fous. Le titre prend
          l'affirmation qui dormait dans `court`. */}
      <Article
        titre="Rien n'est classé en silence"
        court="Doublon écarté, montant douteux mis de côté."
        texte="Doublon écarté, montant douteux mis de côté, fournisseur inconnu soumis à validation."
        className="border-b border-[#171717]/[0.16] md:border-b-0 md:border-r md:border-[#171717]/[0.16]"
      >
        <CarteGardeFous />
      </Article>

      <Article
        titre="Ce qui remonte vers vous"
        court="Une seule file, courte."
        texte="Une seule file, courte, avec uniquement ce qui a besoin de vous. Le reste est déjà rangé."
      >
        <CarteFile />
      </Article>
    </div>
  );
}
