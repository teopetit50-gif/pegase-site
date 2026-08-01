"use client";

/* « Le principe » — calque de qonto.com/en/customers § « Customer story
   spotlight » : une grande citation en avant, l'attribution dessous, et une
   pagination « 1 sur 3 » qui fait défiler.

   Chez Qonto les trois citations sont des clients nommés. Omega n'en a pas à
   montrer, et refs-qonto/NOTES-DESIGN.md interdit d'en fabriquer : les trois
   énoncés ci-dessous sont les règles du desk, dans les mots déjà employés sur
   les fiches moteurs, attribuées au desk lui-même. Rien d'inventé, rien mis
   dans la bouche de personne.

   Robustesse : le changement ne joue sur aucune opacité, et rien ici ne porte
   [data-reveal] hormis le conteneur monté au premier rendu. */

import { useState } from "react";

type Principe = { cle: string; titre: string; citation: string; glose: string };

const PRINCIPES: Principe[] = [
  {
    cle: "main",
    titre: "Vous gardez la main",
    citation:
      "Vous fixez la frontière : ce que le moteur traite seul, ce qui vous est transmis. Toutes les conversations sont archivées et consultables à tout moment.",
    glose:
      "Cette règle ne se négocie pas à l'installation — elle est la condition de fonctionnement du moteur. Les premières semaines, tout vous est soumis avant envoi ; ensuite vous choisissez ce qui part seul et ce qui attend votre accord.",
  },
  {
    cle: "chiffre",
    titre: "On chiffre avant de vendre",
    citation:
      "L'audit dure trente minutes et se termine par un chiffre : ce que votre difficulté principale vous coûte réellement, et la marche à suivre — avec ou sans nous.",
    glose:
      "Un moteur qui ne rembourse pas son installation n'a pas à être installé. C'est pour cela que l'audit précède toujours le devis, qu'il est gratuit, et qu'il peut parfaitement conclure qu'aucun moteur n'est justifié.",
  },
  {
    cle: "outils",
    titre: "On se branche sur vos outils",
    citation:
      "Aucun logiciel à adopter, aucune migration : le raccordement se fait sur votre boîte mail, votre tableur et WhatsApp. Vos numéros et vos adresses ne changent pas.",
    glose:
      "Vos clients ne voient aucune différence, sinon qu'on leur répond plus vite. Et si vous arrêtez un moteur, vous récupérez vos outils exactement dans l'état où ils étaient — il n'y a rien à désinstaller.",
  },
];

export default function Principes() {
  const [i, setI] = useState(0);
  const p = PRINCIPES[i];

  return (
    <section
      data-monde="clair"
      className="monde-clair px-6 pb-20 sm:px-10 sm:pb-28"
    >
      <div className="mx-auto max-w-[1120px]">
        <h2
          data-intertitre
          className="text-[24px] font-bold tracking-[-0.025em] text-[#0f1013] sm:text-[34px]"
        >
          Ce sur quoi on ne bouge pas
        </h2>

        <div
          data-reveal
          className="carte-claire mt-8 rounded-[var(--radius-card)] p-8 sm:mt-10 sm:p-14"
        >
          {/* pagination — « 1 sur 3 » chez Qonto */}
          <div className="flex items-center justify-between gap-6">
            <span className="num font-mono text-[12px] uppercase tracking-[0.16em] text-black/45">
              {i + 1} sur {PRINCIPES.length}
            </span>
            <div className="flex items-center gap-2">
              {PRINCIPES.map((x, j) => (
                <button
                  key={x.cle}
                  type="button"
                  onClick={() => setI(j)}
                  aria-label={`Principe ${j + 1} : ${x.titre}`}
                  aria-current={j === i}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    j === i
                      ? "w-7 bg-[#0f1013]"
                      : "w-2 bg-black/20 hover:bg-black/40"
                  }`}
                />
              ))}
            </div>
          </div>

          <blockquote className="mt-8 text-[22px] font-medium leading-[1.35] tracking-[-0.02em] text-[#0f1013] sm:mt-10 sm:text-[34px]">
            <span aria-hidden style={{ color: "#8a6519" }}>
              «{" "}
            </span>
            {p.citation}
            <span aria-hidden style={{ color: "#8a6519" }}>
              {" "}
              »
            </span>
          </blockquote>

          <p className="mt-7 max-w-3xl text-[15px] leading-[1.85] text-[#52555c] sm:text-[16px]">
            {p.glose}
          </p>

          {/* attribution — le desk, jamais un client */}
          <div className="mt-10 flex items-center gap-3 border-t border-black/[0.08] pt-7">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-black/[0.06] text-[13px] font-semibold text-[#0f1013]">
              P
            </span>
            <div>
              <div className="text-[15px] font-semibold text-[#0f1013]">
                {p.titre}
              </div>
              <div className="text-[13px] text-black/50">
                Règle du desk Omega — Guadeloupe
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
