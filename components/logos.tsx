/* Un logo par PAQUET Omega.
   ══════════════════════════════════════════════════════════════════════
   05/08/2026 — LES VRAIS LOGOS REMPLACENT LES LOGOS DE MARQUES IA.

   Jusqu'ici chaque tuile portait le logo officiel d'un éditeur d'IA tiers
   (Cursor, Anthropic, ElevenLabs, GitHub Copilot, Gemini, n8n) en guise
   d'identité de paquet. C'était un provisoire posé le 21/07, et c'était un
   provisoire à ne pas laisser vivre : afficher la marque d'Anthropic comme
   signe distinctif d'une offre Omega, sur un site commercial, se lit comme
   une marque empruntée. Les six logos livrés par Teo le 05/08 ferment ça.

   Format : chaque fichier de public/logos/ est un MASQUE ALPHA (pixels
   blancs, l'encre portée par le canal alpha), découpé des rendus source par
   `PEGASE/decouper-logos-paquets.py`. On les pose en `mask-image` et c'est
   `background` qui donne la couleur — donc le même fichier sert la tuile
   blanche du thème clair et n'importe quel fond futur, sans second export.

   Deux dérivés par logo :
     <nom>-mark.png    l'icône seule → les tuiles 44 px ci-dessous
     <nom>-lockup.png  icône + mot   → <SystemLockup>, pour les grands formats

   Ajouter un paquet : déposer les deux fichiers, ajouter la ligne dans
   LOGOS. Rien d'autre. */

type Logo = { mark: string; lockup: string };

/* Les six logos livrés le 05/08. AHEAD et COVERD sont présents et prêts,
   mais lib/content.ts ne les publie pas tant que les paquets sont vides —
   « rien de ce qui n'existe pas ne figure ici ». Leurs fichiers attendent
   ici pour que le jour où ils se remplissent, il n'y ait rien à refaire. */
const LOGOS: Record<string, Logo> = {
  CASHD: { mark: "/logos/cashd-mark.png", lockup: "/logos/cashd-lockup.png" },
  RELOAD: { mark: "/logos/reload-mark.png", lockup: "/logos/reload-lockup.png" },
  FRONTD: { mark: "/logos/frontd-mark.png", lockup: "/logos/frontd-lockup.png" },
  FILED: { mark: "/logos/filed-mark.png", lockup: "/logos/filed-lockup.png" },
  AHEAD: { mark: "/logos/ahead-mark.png", lockup: "/logos/ahead-lockup.png" },
  COVERD: { mark: "/logos/coverd-mark.png", lockup: "/logos/coverd-lockup.png" },
  /* 07/08/2026 — « Sur mesure » n'est pas un paquet catalogue mais il a sa
     carte et sa page, donc il lui faut un signe. Seule entrée en SVG : le
     motif fourni par Teo (anneau ouvert + trois curseurs) est géométrique,
     il se trace mieux qu'il ne se découpe. Pas de `lockup` dessiné à ce
     jour — SystemLockup retombe donc sur son repli textuel. */
  "SUR MESURE": {
    mark: "/logos/surmesure-mark.svg",
    lockup: "/logos/surmesure-mark.svg",
  },
};

/* PULSE et VAULT s'affichent (ils sont compris dans toutes les offres) mais
   n'ont pas encore de logo dessiné. Plutôt que de leur laisser un logo
   d'éditeur tiers — le défaut qu'on vient de corriger — ils prennent un
   monogramme sobre dans la même tuile. À remplacer dès que les deux rendus
   manquants existent : déposer les fichiers et ajouter la ligne dans LOGOS. */
const ENCRE = "#0f1013";

const TUILE =
  "grid h-11 w-11 shrink-0 place-items-center rounded-[13px] bg-white";
const OMBRE =
  "0 10px 22px -8px rgba(15, 16, 19, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.25), inset 0 0 0 1px rgba(15, 16, 19, 0.06)";

export function SystemLogo({ system }: { system: string }) {
  const logo = LOGOS[system];

  if (!logo) {
    /* Repli monogramme — voir le commentaire PULSE/VAULT ci-dessus. */
    return (
      <span className={TUILE} style={{ boxShadow: OMBRE }} aria-label={system}>
        <span
          className="text-[15px] font-semibold tracking-[-0.03em]"
          style={{ color: ENCRE }}
        >
          {system.slice(0, 1)}
        </span>
      </span>
    );
  }

  return (
    <span className={TUILE} style={{ boxShadow: OMBRE }} aria-label={`Logo ${system}`}>
      <span
        className="block h-[26px] w-[26px]"
        style={{
          backgroundColor: ENCRE,
          WebkitMaskImage: `url(${logo.mark})`,
          maskImage: `url(${logo.mark})`,
          WebkitMaskRepeat: "no-repeat",
          maskRepeat: "no-repeat",
          WebkitMaskPosition: "center",
          maskPosition: "center",
          WebkitMaskSize: "contain",
          maskSize: "contain",
        }}
      />
    </span>
  );
}

/* La marque en GRAND, en fond de carte — les trois cartes de la bande noire de
   /offres, qui portaient une photo jusqu'au 05/08. L'icône seule (pas le
   lockup : le nom est déjà écrit dans le lien juste en dessous), en blanc,
   posée dans la moitié haute du cadre pour ne pas passer sous le voile qui
   assombrit le bas et porte le titre.

   Le zoom au survol reprend exactement le geste qu'avaient les photos, pour
   que la carte réagisse pareil sous la souris. */
export function SystemMarque({ system }: { system: string }) {
  const logo = LOGOS[system];
  if (!logo) return null;
  return (
    <span aria-hidden className="o-marque-fond">
      <span
        className="o-marque-signe"
        style={{
          WebkitMaskImage: `url(${logo.mark})`,
          maskImage: `url(${logo.mark})`,
        }}
      />
    </span>
  );
}

/* Le lockup complet — icône + mot-marque — pour les emplacements larges où le
   nom n'est pas déjà écrit à côté. `couleur` par défaut suit le texte parent,
   donc il tient sur la bande nuit comme sur fond clair sans second fichier. */
export function SystemLockup({
  system,
  hauteur = 28,
  couleur = "currentColor",
}: {
  system: string;
  hauteur?: number;
  couleur?: string;
}) {
  const logo = LOGOS[system];
  if (!logo) return <span className="font-semibold">{system}</span>;
  return (
    <span
      role="img"
      aria-label={`Logo ${system}`}
      className="inline-block"
      style={{
        height: hauteur,
        width: hauteur * 3.6,
        backgroundColor: couleur,
        WebkitMaskImage: `url(${logo.lockup})`,
        maskImage: `url(${logo.lockup})`,
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "left center",
        maskPosition: "left center",
        WebkitMaskSize: "contain",
        maskSize: "contain",
      }}
    />
  );
}
