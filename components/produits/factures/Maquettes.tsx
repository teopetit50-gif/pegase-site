"use client";

import { JaugeScan, PointVivant } from "@/components/produits/factures/Vivant";

/* Les deux vitrines d'application de la référence, reprises au cadre.

   Relevé du cadre extérieur (identique pour les deux) :
     aspect-[1.05] puis lg:aspect-video, rounded-xl, bord #37333b,
     fond radial rgba(94,73,86,.24) en haut sur #09090c, liseré intérieur
     haut et bas, et un masque qui éteint les 16 % du bas.
   Le flanc occupe 18 % de la largeur, le panneau (#101112 au relevé,
   rounded-lg, bord blanc 8 %) occupe le reste.

   ÉCART ASSUMÉ : sous lg, la référence remplace tout par une capture PNG.
   FILED n'a pas de capture — on affiche le panneau lui-même, sans le
   flanc. Rien n'est masqué derrière une image absente.

   Les données affichées sont des données d'exemple : la mention est portée
   dans le chrome de chaque panneau.

   ── PASSAGE EN CLAIR (11/09/2026) ────────────────────────────────────

   LE CADRE ET L'ÉCRAN NE SE TRANSPOSENT PAS DANS LE MÊME SENS. En
   sombre, la luminosité montait à chaque emboîtement : page 1 → cadre 9
   → écran 20. Transposée telle quelle, elle descendrait : page 255 →
   cadre 246 → écran 237, et l'écran d'une application serait GRIS. Sur
   du papier, un objet se détache de son décor en étant PLUS BLANC que
   lui : le cadre prend le gris du bureau (#f1f0f2, qui garde le soupçon
   de mauve relevé sur la référence), l'écran reste blanc et porte une
   ombre portée. C'est un choix, pas une transposition.

   LES DEUX LISERÉS INTÉRIEURS DU CADRE sont ÉCHANGÉS, pas recolorés. Ils
   simulent un creux éclairé par le haut : sur du noir, le rebord haut
   accroche la lumière (blanc) et le bas tombe dans l'ombre (noir). Sur
   du papier, un creux se lit dans l'autre sens — ombre en HAUT, lumière
   en BAS. Repeindre les deux en gardant l'ordre aurait retourné le
   relief et fait bomber le cadre.

   LES TROIS TONS D'ÉTAT sont assombris pour tenir sur blanc : le rouge
   du relevé (#e40014) tombait à 4,4:1 en texte de 11 px, l'ambre
   (#e0a458) à 2,1:1. Ils valent #c9000f (6,0:1) et #8f5e12 (5,9:1) en
   TEXTE ; les remplissages de jauge gardent un ton plus vif (#c07d1d),
   où le seuil de contraste des textes ne s'applique pas. */

const CADRE =
  "relative mx-0 mt-8 aspect-[1.05] w-full overflow-hidden rounded-xl border border-[#e2e0e6] bg-[radial-gradient(circle_at_50%_0%,rgba(94,73,86,0.10),transparent_68%),linear-gradient(#f1f0f2,#f1f0f2)] shadow-[inset_0_1px_0_rgba(23,23,23,0.07),inset_0_-1px_0_rgba(255,255,255,0.9)] lg:mx-5 lg:aspect-video lg:w-[calc(100%-2.5rem)]";

const PANNEAU =
  "relative flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-[#171717]/[0.17] bg-white text-[#171717] shadow-[0_18px_40px_-24px_rgba(23,23,23,0.42)]";

export function Vitrine({ children }: { children: React.ReactNode }) {
  return (
    <div className={CADRE}>
      <div className="flex h-full w-full p-3 lg:p-0">{children}</div>
      {/* L'évanouissement du bas est un DÉGRADÉ posé par-dessus, pas un
          `mask-image`. Un masque force le cadre entier dans sa propre
          couche de composition : tout le texte du panneau y perd le
          lissage sous-pixel et paraît crénelé. Le rendu est le même,
          le texte reste net. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[16%] bg-gradient-to-b from-transparent to-[#f1f0f2]"
      />
    </div>
  );
}

function Flanc() {
  const groupes = [
    { titre: null, items: ["Boîte", "Fournisseurs", "Historique", "Contrôles"] },
    { titre: "Espace", items: ["Factures", "Périodes", "Catégories"] },
    { titre: "Favoris", items: ["Ce mois", "À valider", "Pour le cabinet"] },
  ];
  return (
    <aside
      aria-hidden="true"
      className="sticky top-0 hidden h-full w-[18%] shrink-0 self-start overflow-hidden px-3 py-4 text-[#2b2b2b] lg:block lg:px-5 lg:py-5"
    >
      <div className="mb-6 flex items-center gap-2">
        <span className="inline-block h-4 w-4 rounded-[3px] border border-[#171717]/25 bg-[#171717]/[0.06]" />
        <span className="font-display text-[13px] tracking-[-0.01em] text-[#171717]">Factures</span>
      </div>
      {groupes.map((g, i) => (
        <div key={i} className="mb-5">
          {g.titre && (
            <div className="mb-2 font-mono text-[11px] uppercase tracking-[0.12em] text-[#5f5f5f]">
              {g.titre}
            </div>
          )}
          <ul className="space-y-1.5">
            {g.items.map((it, j) => (
              <li
                key={it}
                className={`truncate rounded-[3px] px-2 py-1 text-[13px] ${
                  i === 0 && j === 0 ? "bg-[#171717]/[0.07] text-[#171717]" : "text-[#4d4d4d]"
                }`}
              >
                {it}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </aside>
  );
}

function Chrome({ titre, note }: { titre: string; note: string }) {
  return (
    <div className="flex h-11 shrink-0 items-center justify-between gap-2 border-b border-[#171717]/[0.14] px-5">
      <div className="flex min-w-0 items-center gap-2">
        <span className="truncate text-[13px] text-[#171717]">{titre}</span>
        <span className="hidden font-mono text-[11px] uppercase tracking-[0.1em] text-[#4d4d4d] sm:inline">
          {note}
        </span>
      </div>
      <span className="shrink-0 font-mono text-[11px] uppercase tracking-[0.1em] text-[#5f5f5f]">
        données d&apos;exemple
      </span>
    </div>
  );
}


/* ── Panneau 1 — la file des pièces reçues ───────────────────────────── */

/* Une ligne = une pièce. `debut`/`fin` la placent sur la frise du mois,
   `avance` dit où elle en est de son parcours (0 → 1), `etat` donne le
   mot et la couleur.

   Les pastilles grises alignées ne disaient rien : toutes pareilles,
   elles ne se lisaient ni de loin ni de près. Une jauge pleine, dont le
   remplissage EST l'avancement, se lit d'un coup d'œil — c'est le
   vocabulaire de la référence, et il porte une information vraie. */
type Etat = "fait" | "attente" | "ecarte";

type Ligne = {
  nom: string;
  voie: string;
  debut: number;
  fin: number;
  avance: number;
  etat: Etat;
  mot: string;
};

const LIGNES: Ligne[] = [
  { nom: "Sogedis Matériel", voie: "Mail · 1 240,00 €", debut: 3, fin: 46, avance: 1, etat: "fait", mot: "Classée" },
  { nom: "Antilles Énergie", voie: "Mensuel · 386,40 €", debut: 11, fin: 58, avance: 1, etat: "fait", mot: "Classée" },
  { nom: "Loc'Outils 971", voie: "Scan · 912,00 €", debut: 21, fin: 62, avance: 0.42, etat: "attente", mot: "À valider" },
  { nom: "Transports Karukera", voie: "Mail · 148,20 €", debut: 33, fin: 74, avance: 0.66, etat: "fait", mot: "Recoupée" },
  { nom: "Papeterie du Port", voie: "Photo · 76,90 €", debut: 45, fin: 78, avance: 0.18, etat: "ecarte", mot: "Doublon écarté" },
  { nom: "Cabinet Mercier", voie: "Mensuel · 540,00 €", debut: 54, fin: 97, avance: 1, etat: "fait", mot: "Transmise" },
];

/* Trois états, trois couleurs, pas une de plus. Le rouge est le jeton
   `--destructive` relevé sur la référence, assombri pour tenir sur du
   blanc (voir l'en-tête) ; l'ambre est le seul ajout, parce qu'« en
   attente de vous » et « rangé » ne peuvent pas se dire dans la même
   valeur de gris. */
const TONS: Record<Etat, { barre: string; texte: string; piste: string }> = {
  fait: {
    barre: "linear-gradient(90deg, rgba(23,23,23,0.22), rgba(23,23,23,0.88))",
    texte: "text-[#171717]",
    piste: "bg-[#171717]/[0.07]",
  },
  attente: {
    barre: "linear-gradient(90deg, rgba(192,125,29,0.28), rgba(192,125,29,0.95))",
    texte: "text-[#8f5e12]",
    piste: "bg-[#c07d1d]/[0.14]",
  },
  ecarte: {
    barre: "linear-gradient(90deg, rgba(201,0,15,0.25), rgba(201,0,15,0.80))",
    texte: "text-[#c9000f]",
    piste: "bg-[#171717]/[0.05]",
  },
};

const JOURS = ["03", "10", "17", "24", "31", "07", "14"];

export function PanneauFile() {
  return (
    <>
      <Flanc />
      <section className={PANNEAU}>
        <Chrome titre="Boîte fournisseurs" note="6 pièces cette semaine" />

        <header className="relative z-10 hidden h-[70px] shrink-0 border-b border-[#171717]/[0.14] px-5 lg:block">
          <div className="flex h-[34px] items-end gap-6 font-mono text-[11px] uppercase tracking-[0.14em] text-[#4d4d4d]">
            <span>Août</span>
            <span className="text-[#4d4d4d]">Septembre</span>
          </div>
          <div className="flex h-[36px] items-center">
            <div className="w-[110px] shrink-0 lg:w-[160px]" />
            <div className="relative flex-1">
              {JOURS.map((j, i) => (
                <span
                  key={j + i}
                  className="absolute -translate-x-1/2 font-mono text-[11px] text-[#5f5f5f]"
                  style={{ left: `${(i / (JOURS.length - 1)) * 100}%` }}
                >
                  {j}
                </span>
              ))}
            </div>
          </div>
        </header>

        {/* Sous lg, la frise n'a pas la place de dire quoi que ce soit : les
            pastilles s'y coupent en plein mot. La référence sert une capture
            PNG à cet endroit ; on sert la même information en liste, qui se
            lit vraiment. */}
        <div className="flex min-h-0 flex-1 flex-col justify-around overflow-hidden px-5 py-2 lg:hidden">
          {LIGNES.map((l) => (
            <div key={l.nom} className="border-b border-[#171717]/[0.11] py-2 last:border-0">
              <div className="flex items-baseline justify-between gap-3">
                <span className="truncate text-[13px] text-[#171717]">{l.nom}</span>
                <span className={`shrink-0 font-mono text-[11px] uppercase tracking-[0.06em] ${TONS[l.etat].texte}`}>
                  {l.mot}
                </span>
              </div>
              <div className="mt-1.5 flex items-center gap-3">
                <span className={`h-1.5 flex-1 overflow-hidden rounded-full ${TONS[l.etat].piste}`}>
                  <span
                    className="block h-full rounded-full"
                    style={{ width: `${l.avance * 100}%`, background: TONS[l.etat].barre }}
                  />
                </span>
                <span className="shrink-0 font-mono text-[11px] uppercase tracking-[0.06em] text-[#4d4d4d]">
                  {l.voie}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="hidden min-h-0 flex-1 flex-col justify-between overflow-hidden px-5 py-3 lg:flex">
          {LIGNES.map((l) => (
            <div key={l.nom} className="flex items-center gap-4">
              <div className="w-[170px] shrink-0">
                <div className="truncate text-[13px] leading-tight text-[#171717]">{l.nom}</div>
                <div className="truncate font-mono text-[11px] uppercase tracking-[0.04em] text-[#4d4d4d]">
                  {l.voie}
                </div>
              </div>
              <div className="relative h-9 flex-1">
                <div
                  className="absolute top-1/2 flex -translate-y-1/2 items-center gap-3"
                  style={{ left: `${l.debut}%`, width: `${l.fin - l.debut}%` }}
                >
                  <span className={`h-2 flex-1 overflow-hidden rounded-full ${TONS[l.etat].piste}`}>
                    <span
                      className="block h-full rounded-full"
                      style={{ width: `${l.avance * 100}%`, background: TONS[l.etat].barre }}
                    />
                  </span>
                  <span
                    className={`shrink-0 font-mono text-[11px] uppercase tracking-[0.08em] ${TONS[l.etat].texte}`}
                  >
                    {l.mot}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

/* ── Panneau 2 — le suivi des dépenses ───────────────────────────────── */

const BARRES = [
  { c: "SG", v: 168 }, { c: "AE", v: 121 }, { c: "LO", v: 96 }, { c: "TK", v: 88 },
  { c: "PP", v: 74 }, { c: "CM", v: 66 }, { c: "BT", v: 61 }, { c: "GD", v: 54 },
  { c: "MR", v: 47 }, { c: "VD", v: 41 }, { c: "AL", v: 33 }, { c: "KF", v: 28 },
  { c: "ND", v: 19 }, { c: "ZP", v: 12 },
];

const TABLEAU = [
  { f: "Sogedis Matériel", p: 239, r: [81, 76, 82] },
  { f: "Antilles Énergie", p: 181, r: [25, 151, 5] },
  { f: "Loc'Outils 971", p: 95, r: [22, 44, 29] },
  { f: "Transports Karukera", p: 88, r: [0, 12, 76] },
  { f: "Papeterie du Port", p: 72, r: [59, 13, 0] },
];

export function PanneauTableau() {
  const max = 180;
  return (
    <>
      <Flanc />
      <section className={PANNEAU}>
        <Chrome titre="Dépenses fournisseurs" note="septembre 2026" />

        <div className="min-h-0 flex-1 overflow-hidden px-5 py-4 lg:py-5">
          {/* Trois colonnes à 390 donnaient des libellés sur deux lignes,
              serrés les uns contre les autres. On les met en ligne sous sm. */}
          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4 lg:mb-5">
            {[
              { l: "Pièces traitées", v: "1 284" },
              { l: "En attente de vous", v: "12" },
              { l: "Doublons écartés", v: "37" },
            ].map((s) => (
              <div key={s.l} className="flex items-baseline justify-between gap-3 sm:block">
                <div className="font-mono text-[11px] uppercase tracking-[0.1em] text-[#4d4d4d] sm:mb-1">
                  {s.l}
                </div>
                <div className="font-display text-[22px] leading-none tracking-[-0.02em] text-[#171717] lg:text-[26px]">
                  {s.v}
                </div>
              </div>
            ))}
          </div>

          <div className="mb-4 rounded-[4px] border border-[#171717]/[0.15] px-4 py-3 lg:mb-5">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-[#4d4d4d]">
                Engagé ce mois
              </span>
              <PointVivant libelle="à jour" />
            </div>
            <div className="mb-2 font-display text-[20px] leading-none tracking-[-0.02em] text-[#171717]">
              18 420 € <span className="text-[#4d4d4d]">/ 25 000 €</span>
            </div>
            <JaugeScan valeur={73.7} />
          </div>

          <div className="mb-4 lg:mb-5">
            <div className="mb-2 font-mono text-[11px] uppercase tracking-[0.1em] text-[#4d4d4d]">
              Pièces par fournisseur
            </div>
            <div className="flex h-[92px] items-end gap-[6px] lg:h-[104px]">
              {BARRES.map((b) => (
                <div key={b.c} className="flex flex-1 flex-col items-center gap-1.5">
                  <div
                    className="w-full rounded-t-[2px] bg-[#171717]/[0.30]"
                    style={{ height: `${(b.v / max) * 84}px` }}
                  />
                  <span className="font-mono text-[11px] text-[#5f5f5f]">{b.c}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="hidden lg:block">
            <div className="mb-2 grid grid-cols-[1fr_56px_1fr] gap-3 font-mono text-[11px] uppercase tracking-[0.1em] text-[#4d4d4d]">
              <span>Fournisseur</span>
              <span className="text-right">Pièces</span>
              <span>Lu · Recoupé · Classé</span>
            </div>
            {TABLEAU.map((t) => (
              <div
                key={t.f}
                className="grid grid-cols-[1fr_56px_1fr] items-center gap-3 border-t border-[#171717]/[0.12] py-[7px] text-[12px] text-[#2b2b2b]"
              >
                <span className="truncate">{t.f}</span>
                <span className="text-right font-mono text-[11px] text-[#4d4d4d]">{t.p}</span>
                <span className="flex h-1.5 overflow-hidden rounded-full bg-[#171717]/[0.06]">
                  {t.r.map((v, i) => (
                    <span
                      key={i}
                      style={{
                        width: `${(v / t.p) * 100}%`,
                        background: [
                          "rgba(23,23,23,.72)",
                          "rgba(23,23,23,.40)",
                          "rgba(23,23,23,.16)",
                        ][i],
                      }}
                    />
                  ))}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
