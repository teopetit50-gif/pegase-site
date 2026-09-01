import Image from "next/image";
import Link from "next/link";

/* ══════════════════════════════════════════════════════════════════════
   <Cloture> — le dernier bloc de /modeles.

   Refaite le 03/08 (Teo : « cette section je la trouve pas top top »).
   Ce qui n'allait pas dans la version précédente, dans l'ordre
   d'importance —

   · UN PAVÉ DE QUATRE PHRASES. Une clôture se lit en trois secondes ou ne
     se lit pas. L'argument le plus fort du bloc — la Région peut financer
     jusqu'à 10 000 € — était noyé en fin de paragraphe, après une
     subordonnée. Il est maintenant sorti en chiffre, à côté des deux
     autres faits.

   · LE COLLAGE EN FOND. Il répétait le hero à l'identique, n'apportait
     rien à l'argument, et arrivait tronqué sur écran étroit : on voyait
     des bouts de vignettes coupés dans le coin. Un décor qui coupe mal
     vaut moins que pas de décor. Remplacé par une lueur, qui donne de la
     profondeur au noir sans rien raconter.

   · TOUT ALIGNÉ À GAUCHE, avec un grand vide en bas. Le bloc était haut
     et creux. Centré et resserré, il tient dans un regard.

   Les trois faits ne sont pas de la décoration : ce sont les trois
   objections qu'un patron de petite entreprise oppose à un rendez-vous — ça va me
   prendre la journée, ça va me coûter, et après on va me vendre quelque
   chose. Elles tombent avant d'être posées.
   ══════════════════════════════════════════════════════════════════════ */

const FAITS = [
  { fort: "30 minutes", doux: "en visio ou sur place" },
  { fort: "Gratuit", doux: "et sans engagement" },
  { fort: "Jusqu'à 10 000 €", doux: "financés par le Chèque TIC" },
];

export default function Cloture() {
  return (
    <div className="relative isolate overflow-hidden rounded-[16px] bg-[color:var(--m-sombre)] px-6 py-[clamp(3.5rem,7vw,5.5rem)] text-center sm:px-12">
      {/* ——— le fond ———
          03/08 (Teo) — le noir uni devient une photo. On reprend celle de
          la bibliothèque du site (Unsplash, crédit dans
          public/photos/CREDITS.txt) qui montre un poste de travail avec un
          café : c'est exactement la scène que le bloc vend, un entretien
          d'une demi-heure. Pas le collage de vitrines, qui répétait le hero
          et arrivait tronqué sur écran étroit.

          `object-cover` + `object-left` : le sujet est à gauche du cadre et
          la droite n'est que du bois. Sur un bloc large et bas, un cadrage
          centré aurait rogné la personne pour ne garder que la table. */}
      <Image
        src="/photos/brief.jpg"
        alt=""
        aria-hidden
        fill
        sizes="(max-width: 1248px) 100vw, 1200px"
        className="-z-10 object-cover object-left"
      />

      {/* Voile de lecture. Premier réglage trop dense (0,90 → 0,72) : la
          photo disparaissait complètement, le bloc redevenait le fond noir
          qu'on venait de quitter. Le voile est donc creusé — dense au
          CENTRE, là où le texte tombe, franchement plus léger sur les
          bords, où il n'y a rien à lire et où la photo peut vivre. C'est
          l'inverse d'un voile uniforme : on éteint là où on lit, on laisse
          voir là où on ne lit pas. */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(72% 66% at 50% 50%, rgba(8,9,11,0.86) 0%, rgba(8,9,11,0.74) 48%, rgba(8,9,11,0.44) 78%, rgba(8,9,11,0.30) 100%)",
        }}
      />

      {/* 28/08 — le titre promettait un audit à un public (les chercheurs
          de vitrine = des TPE) que le funnel n'y envoie plus : la voie TPE
          de /commencer mène aux prix publics. Reformulé sans promesse
          d'entretien — la phrase vise maintenant le démarrage. */}
      <h2 data-intertitre className="m-h2 mx-auto max-w-[17ch] text-white">
        Votre vitrine démarre en deux minutes
      </h2>

      <p className="mx-auto mt-5 max-w-[52ch] text-[clamp(0.95rem,1.3vw,1.1rem)] leading-relaxed text-white/70">
        Choisissez le modèle qui tient debout pour votre métier, et le poste qui
        récupère ce qui se perd entre un visiteur et un client payé.
      </p>

      {/* Les trois faits, séparés par des filets verticaux à partir de sm.
          En dessous ils s'empilent : trois colonnes de 110 px sur un
          téléphone donneraient des mots coupés. */}
      <div className="mx-auto mt-11 grid max-w-2xl gap-y-7 sm:grid-cols-3 sm:gap-y-0">
        {FAITS.map((f, i) => (
          <div
            key={f.fort}
            data-reveal
            className={
              i > 0 ? "sm:border-l sm:border-white/12 sm:px-4" : "sm:px-4"
            }
          >
            <p className="text-[clamp(1.05rem,1.6vw,1.35rem)] text-white">{f.fort}</p>
            <p className="mt-1.5 text-[13px] text-white/55">{f.doux}</p>
          </div>
        ))}
      </div>

      <div className="mt-11">
        <Link
          href="/commencer"
          className="m-btn-clair inline-flex items-center gap-2.5 py-3 pl-6 pr-2.5 text-[15px]"
        >
          Commencer
          <span className="m-chevron flex h-7 w-7 items-center justify-center rounded-full">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path
                d="M3 8h9M8.5 4.5 12 8l-3.5 3.5"
                stroke="#fff"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </Link>

        {/* 01/09 — le prix du site devient public (/tarifs/site) : la
            clôture le mentionne sans vendre — la règle de la page tient,
            le lien porte la transaction ailleurs. */}
        <p className="mt-6 text-[13px] text-white/55">
          Le prix est public&nbsp;:{" "}
          <Link
            href="/tarifs/site"
            className="text-white/80 underline underline-offset-4 hover:text-white"
          >
            990&nbsp;€ le site catalogue
          </Link>{" "}
          — souvent 198&nbsp;€ restant à charge avec le Chèque TIC.
        </p>
      </div>
    </div>
  );
}
