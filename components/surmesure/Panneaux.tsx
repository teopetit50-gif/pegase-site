/* ══════════════════════════════════════════════════════════════════════
   /offres/sur-mesure — les pièces dessinées (16/09/2026)

   La référence (scale.com/generative-ai-data-engine) remplit trois
   emplacements par des captures de son produit. On ne recopie pas l'actif
   d'autrui, et nos écrans montrent les systèmes DU CATALOGUE, pas un
   système sur mesure : deux emplacements sont donc composés ici, le
   troisième porte notre vraie capture de l'espace client.

   ── POURQUOI DU BALISAGE ET PAS UN SVG À VIEWBOX ─────────────────────
   Une image — bitmap ou SVG à viewBox — se met à l'échelle d'un bloc. Le
   panneau de la référence fait 1392 de large sur ordinateur et 342 sur
   téléphone : un texte posé à 14 px dedans y tombe à 3,4 px. Ces deux
   pièces sont donc du balisage qui se recompose (quatre colonnes ≥ 768,
   empilé en dessous) — même emprise, même poids visuel, et lisible aux
   cinq largeurs. C'est l'écart nº 5 du bloc `.smd`.

   Aucun état, aucun effet : ces composants sont rendus sur le serveur.
   ══════════════════════════════════════════════════════════════════════ */

import type { ReactNode } from "react";

/* ─────────────────────────────────────────────────────────────────────
   1 · DU BESOIN AU SYSTÈME — la grande pièce, sous l'aperçu

   Le bandeau du haut est le point de départ (votre processus), les
   quatre colonnes sont les étapes de `FICHE.etapes`, le bandeau du bas
   est ce qui reste sous décision humaine pendant tout le trajet.
   ───────────────────────────────────────────────────────────────────── */

type Etape = { rang: string; titre: string; texte: string };

export function PanneauMethode({ etapes }: { etapes: Etape[] }) {
  return (
    <div className="p-6 md:p-10">
      {/* le point de départ */}
      <div className="rounded-xl border border-dashed border-black/20 px-5 py-4 text-center">
        <p className="smd-body !text-black/70">
          Le processus tel qu&apos;il se déroule aujourd&apos;hui, chez vous
        </p>
      </div>

      {/* les quatre étapes */}
      <div className="mt-6 grid gap-4 md:mt-8 md:grid-cols-4 md:gap-5">
        {etapes.map((e, i) => (
          <div
            key={e.rang}
            className="relative rounded-xl border border-black/10 bg-white p-5 md:p-6"
          >
            {/* la flèche qui mène à l'étape suivante : sous la carte en
                colonne, entre les cartes en rangée */}
            {i < etapes.length - 1 && (
              <span
                aria-hidden
                className="absolute left-1/2 top-full z-10 -translate-x-1/2 text-black/25 md:left-full md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="md:hidden"
                >
                  <path d="M12 5v14m0 0-5-5m5 5 5-5" />
                </svg>
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="hidden md:block"
                >
                  <path d="M5 12h14m0 0-5-5m5 5-5 5" />
                </svg>
              </span>
            )}
            <span
              className="font-medium"
              style={{
                fontFamily: "var(--font-dm-mono), ui-monospace, monospace",
                fontSize: "12px",
                letterSpacing: "1px",
                color: "var(--smd-etiquette)",
              }}
            >
              {e.rang}
            </span>
            <h5 className="smd-h4 mt-3 !text-[1.125rem] !leading-[1.35]">{e.titre}</h5>
            <p className="smd-body mt-2 !text-[0.875rem] !leading-[1.5]">{e.texte}</p>
          </div>
        ))}
      </div>

      {/* ce qui reste sous décision, du premier au dernier jour */}
      <div className="mt-6 rounded-xl px-5 py-5 md:mt-8 md:px-8" style={{ background: "var(--smd-evergreen)" }}>
        <p
          className="text-white/70"
          style={{
            fontFamily: "var(--font-dm-mono), ui-monospace, monospace",
            fontSize: "12px",
            lineHeight: "1.5rem",
            letterSpacing: "1px",
            textTransform: "uppercase",
          }}
        >
          Sous votre décision, règle par règle
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {["Ce qui s'exécute seul", "Ce qui attend une validation", "Ce qui ne part jamais sans un accord"].map(
            (t) => (
              <span
                key={t}
                className="rounded-md bg-white/10 px-3 py-1.5 text-white"
                style={{ fontSize: "0.875rem", lineHeight: 1.5 }}
              >
                {t}
              </span>
            )
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   2 · RÈGLE PAR RÈGLE — la pièce de droite du bloc à deux colonnes

   Trois niveaux d'autonomie, dans l'ordre où une direction les décide.
   Les trois phrases sortent de `FICHE.controle`, sans réécriture.
   ───────────────────────────────────────────────────────────────────── */

const NIVEAUX: { point: string; titre: string; texte: string }[] = [
  {
    point: "#16a34a",
    titre: "S'exécute seul",
    texte: "La règle est écrite, le résultat est vérifiable\u00A0: le système la joue sans vous prévenir.",
  },
  {
    point: "#d97706",
    titre: "Attend une validation",
    texte: "Le système prépare, vos équipes approuvent, corrigent ou suspendent avant que ça parte.",
  },
  {
    point: "#525252",
    titre: "Ne part jamais sans un accord",
    texte: "Rien ne quitte votre organisation sans un accord explicite, quel que soit le volume.",
  },
];

export function PanneauReglages() {
  return (
    <div className="flex h-full flex-col justify-center gap-4 p-6 md:p-8">
      <p className="smd-etiquette !mb-0">Niveau d&apos;autonomie</p>
      {NIVEAUX.map((n) => (
        <div key={n.titre} className="rounded-xl border border-black/10 bg-white p-4 md:p-5">
          <div className="flex items-center gap-2.5">
            <span
              aria-hidden
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ background: n.point }}
            />
            <span className="smd-h4 !text-[1rem] !leading-[1.4]">{n.titre}</span>
          </div>
          <p className="smd-body mt-2 !text-[0.875rem] !leading-[1.5]">{n.texte}</p>
        </div>
      ))}
      <p className="smd-body !text-[0.8125rem] !leading-[1.5]">
        Rien n&apos;est figé&nbsp;: un réglage se modifie en cours d&apos;exploitation.
      </p>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   3 · CROQUIS DES EXEMPLES — les trois vignettes 16/9

   La référence pose là trois vignettes de vidéo de démonstration. Nous
   n'en avons pas, et un lecteur vide serait un mensonge d'interface : ce
   sont trois croquis au trait, un par nature de besoin, dans le même
   cadre et le même rapport. Pas de bouton « lecture », rien à cliquer.
   ───────────────────────────────────────────────────────────────────── */

const TRAIT = { fill: "none", stroke: "currentColor", strokeWidth: 1.25 } as const;

function Cadre({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 320 180" className="h-full w-full text-black/45" aria-hidden>
      {children}
    </svg>
  );
}

export function CroquisPont() {
  return (
    <Cadre>
      <rect x="28" y="60" width="86" height="60" rx="8" {...TRAIT} />
      <rect x="206" y="60" width="86" height="60" rx="8" {...TRAIT} />
      <path d="M118 80h84m0 0-10-7m10 7-10 7" {...TRAIT} />
      <path d="M202 100h-84m0 0 10-7m-10 7 10 7" {...TRAIT} />
      <path d="M42 76h40M42 88h58M42 100h34" {...TRAIT} opacity="0.55" />
      <path d="M220 76h40M220 88h58M220 100h34" {...TRAIT} opacity="0.55" />
    </Cadre>
  );
}

export function CroquisDocument() {
  return (
    <Cadre>
      <path d="M112 34h62l34 34v78a8 8 0 0 1-8 8h-88a8 8 0 0 1-8-8V42a8 8 0 0 1 8-8Z" {...TRAIT} />
      <path d="M174 34v34h34" {...TRAIT} />
      <path d="M128 86h64M128 100h64M128 114h40" {...TRAIT} opacity="0.55" />
      <circle cx="196" cy="126" r="18" {...TRAIT} />
      <path d="m188 126 6 6 11-12" {...TRAIT} />
    </Cadre>
  );
}

export function CroquisSuivi() {
  return (
    <Cadre>
      <rect x="52" y="38" width="216" height="104" rx="8" {...TRAIT} />
      <path d="M52 62h216" {...TRAIT} />
      <path d="M70 84h60M70 104h60M70 124h60" {...TRAIT} opacity="0.55" />
      <path d="M160 84h74M160 104h48M160 124h62" {...TRAIT} opacity="0.35" />
      <circle cx="248" cy="84" r="5" {...TRAIT} />
      <path d="M248 50v1" {...TRAIT} />
    </Cadre>
  );
}
