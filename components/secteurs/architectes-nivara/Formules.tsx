/* ══════════════════════════════════════════════════════════════════════
   Lorani sur le gabarit Nivara — Formules.tsx (09/11/2026)
   La section « Where we build » de la référence, seconde du bloc
   `theme-dark` : grille de douze (h2 `font-display text-h3` sur 6, chapô
   `max-w-[44ch] text-graphite` sur 5 à partir de la 8e), puis au-delà
   de 1200 px la carte à points (`mt-16 py-24`, tracé SVG 1000 × 160
   d'une ligne sinueuse — y = 80 + 26 sin(2πx/660), relevée point par
   point —, un point par lieu, libellés `w-40 text-small` posés dessus
   ou dessous en alternance : nom `font-display text-lead`, légende
   `text-graphite`, lien `.link`). En dessous : la liste filetée
   (`border-t border-ink`, rangs `border-b border-rule py-3`).
   Textes : « 06 — Formules ». Les quatre formules sont les quatre
   lieux de la carte (nom, public, prix), et leurs lignes — qui n'ont
   pas de place sur une carte — suivent dans quatre colonnes filetées
   (`l:grid-cols-4`, une utilitaire de la référence), chacune fermée par
   le lien « Réserver un audit » de la page actuelle.
   ══════════════════════════════════════════════════════════════════════ */
import Apparition, { GroupeApparition, MotsApparition } from "@/components/accueil/Apparition";
import { Lien } from "./Bouton";
import { CONTACT, FORMULES } from "./textes";

const Y = (x: number) => 80 + 26 * Math.sin((2 * Math.PI * x) / 660);
const TRACE = Array.from({ length: 101 }, (_, i) => `${i ? "L" : "M"}${(i * 10).toFixed(1)} ${Y(i * 10).toFixed(1)}`).join(" ");
const POINTS = [20, 398.18, 601.82, 980];

export default function Formules() {
  return (
    <section
      id="formules"
      aria-labelledby="formules-title"
      className="mx-auto w-full max-w-[1600px] px-4 pt-28 min-[810px]:px-8 min-[810px]:pt-40"
    >
      <GroupeApparition retard={1000} className="grid gap-6 min-[810px]:grid-cols-12">
        <h2 id="formules-title" className="font-display text-h3 min-[810px]:col-span-6">
          <MotsApparition texte={FORMULES.titre} />
        </h2>
        <Apparition as="p" delai={300} className="max-w-[44ch] text-graphite min-[810px]:col-span-5 min-[810px]:col-start-8">
          {FORMULES.sourcil}
        </Apparition>
      </GroupeApparition>
      <div className="relative mt-16 hidden py-24 min-[1200px]:block">
        <svg viewBox="0 0 1000 160" className="block h-auto w-full overflow-visible" aria-hidden="true">
          <path d={TRACE} fill="none" stroke="currentColor" strokeWidth="1.2" />
          {POINTS.map((x, i) => (
            <circle key={x} cx={x} cy={Y(x)} r={i ? 4 : 6} fill="currentColor" />
          ))}
        </svg>
        <ol className="absolute inset-x-0 inset-y-24">
          {FORMULES.formules.map((f, i) => {
            const x = POINTS[i];
            const dessus = i % 2 === 0;
            const align = i === 0 ? "text-left" : i === POINTS.length - 1 ? "text-right" : "text-center";
            const tx = i === 0 ? "0%" : i === POINTS.length - 1 ? "-100%" : "-50%";
            return (
              <li
                key={f.titre}
                className={`absolute w-40 text-small ${align}`}
                style={{
                  left: `${x / 10}%`,
                  top: `${(Y(x) / 160) * 100}%`,
                  transform: `translate(${tx}, ${dessus ? "calc(-100% - 1.25rem)" : "1.25rem"})`,
                }}
              >
                <Apparition delai={120 * i}>
                  <p className="font-display text-lead">{f.titre}</p>
                  <p className="text-graphite">{f.pour}</p>
                  <Lien href={CONTACT.audit}>{f.prix}</Lien>
                </Apparition>
              </li>
            );
          })}
        </ol>
      </div>
      <div className="mt-10 grid gap-12 min-[810px]:grid-cols-2 min-[810px]:gap-8 min-[1200px]:mt-16 min-[1200px]:grid-cols-4 min-[1200px]:gap-12">
        {FORMULES.formules.map((f, i) => (
          <Apparition key={f.titre} delai={90 * i}>
            <h3 className="font-display text-h4">{f.titre}</h3>
            <p className="mt-2 text-small text-graphite">{f.pour}</p>
            <p className="mt-1 text-small">{f.prix}</p>
            <ul className="mt-6 border-t border-ink">
              {f.lignes.map((l) => (
                <li key={l} className="border-b border-rule py-3 text-small">
                  {l}
                </li>
              ))}
            </ul>
            <Lien href={CONTACT.audit} className="mt-6 inline-block text-small">
              {FORMULES.audit}
            </Lien>
          </Apparition>
        ))}
      </div>
    </section>
  );
}
