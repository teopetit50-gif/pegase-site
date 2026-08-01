/* « Qui est derrière » — calque de la grille équipe d'hyperstack.studio :
   carte blanche, portrait en haut (ratio 4/5), puis prénom en gras suivi du
   rôle sur la même ligne, puis la bio en petit.

   Différence assumée : hyperstack aligne dix fiches sur trois colonnes ; ici
   la grille s'adapte au nombre réel (1 à 3 → rangée centrée, 4+ → 3 colonnes)
   pour ne pas laisser une carte seule dans une grille vide. Contenu dans
   lib/equipe.ts ; section masquée si MEMBRES est vide. */

import { MEMBRES, EQUIPE_SURTITRE, EQUIPE_TITRE, EQUIPE_CHAPO } from "@/lib/equipe";

export default function Equipe() {
  if (MEMBRES.length === 0) return null;

  /* Une fiche seule dans une grille verticale donne une carte haute et isolée
     au milieu du vide. À un seul membre on bascule donc en carte HORIZONTALE
     (portrait à gauche, texte à droite) : même matière, silhouette tenable. */
  const solo = MEMBRES.length === 1;
  const colonnes =
    MEMBRES.length >= 4
      ? "lg:grid-cols-3"
      : MEMBRES.length === 3
        ? "sm:grid-cols-3"
        : MEMBRES.length === 2
          ? "sm:grid-cols-2"
          : "";
  const largeur = solo
    ? "max-w-[760px]"
    : MEMBRES.length === 2
      ? "max-w-[720px]"
      : "max-w-[1120px]";

  return (
    <section
      data-monde="clair"
      className="monde-clair px-6 pb-20 pt-4 sm:px-10 sm:pb-28"
    >
      <div className="mx-auto max-w-[1120px] text-center">
        <span
          data-reveal
          className="inline-block rounded-full border border-black/10 px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em]"
          style={{ color: "#8a6519" }}
        >
          {EQUIPE_SURTITRE}
        </span>
        <h2
          data-intertitre
          className="mx-auto mt-6 max-w-[18ch] text-[30px] font-bold leading-[1.06] tracking-[-0.03em] text-[#0f1013] sm:text-[52px]"
        >
          {EQUIPE_TITRE}
        </h2>
        <p
          data-reveal
          className="mx-auto mt-6 max-w-2xl text-[16px] leading-relaxed text-[#52555c] sm:text-[18px]"
        >
          {EQUIPE_CHAPO}
        </p>
      </div>

      <div
        className={`mx-auto mt-12 grid gap-5 sm:mt-14 sm:gap-6 ${largeur} ${colonnes}`}
      >
        {MEMBRES.map((m) => (
          <article
            key={m.cle}
            data-reveal
            className={`carte-claire h-full overflow-hidden rounded-[var(--radius-card)] ${
              solo
                ? "grid items-stretch sm:grid-cols-[minmax(0,240px)_1fr]"
                : "flex flex-col"
            }`}
          >
            <div
              className={`relative w-full overflow-hidden bg-black/[0.06] ${
                solo ? "aspect-[4/5] sm:aspect-auto sm:h-full" : "aspect-[4/5]"
              }`}
            >
              {m.photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={m.photo}
                  alt={`${m.prenom}, ${m.role}`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="absolute inset-0 grid place-items-center text-[44px] font-semibold text-black/15">
                  {m.prenom.slice(0, 2).toUpperCase()}
                </span>
              )}
            </div>
            <div
              className={`flex flex-1 flex-col p-6 sm:p-7 ${solo ? "justify-center" : ""}`}
            >
              <div className="flex flex-wrap items-baseline gap-x-2.5">
                <span className="text-[18px] font-semibold tracking-[-0.01em] text-[#0f1013]">
                  {m.prenom}
                </span>
                <span
                  className="text-[13px] font-medium"
                  style={{ color: "#8a6519" }}
                >
                  {m.role}
                </span>
              </div>
              <p className="mt-3 text-[14px] leading-[1.75] text-[#52555c]">
                {m.bio}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
