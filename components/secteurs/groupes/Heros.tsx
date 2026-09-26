import CarteBlanche from "./CarteBlanche";
import Apparait, { Filet } from "./Apparait";
import { InfiniteSlider } from "./Defilant";
import { HerosVisuelEtroit, HerosVisuelLarge } from "./HerosVisuel";
import { AUDIT, HEROS, METIERS } from "./textes";

/* ══ 1 · HERO — balisage de la référence (DOM hydraté, 24/09) ═════════
   Écart unique : leur entête est `fixed` (72 px) et la page pose
   `pt-[112px] min-[1440px]:pt-[72px]` pour passer dessous. La nôtre est
   `sticky`, dans le flux : 72 px de moins, soit `pt-[40px]` puis 0. */

/* le bandeau : leurs cellules de logo font 259 × 120 ; nos métiers sont
   des mots, la cellule prend la largeur du mot plus 80 px, même hauteur */
function Bandeau() {
  return (
    <div style={{ marginLeft: "calc(var(--space-edge) * -1)", marginRight: "calc(var(--space-edge) * -1)" }}>
      <div className="w-full">
        <div className="overflow-hidden border-t border-b border-[var(--nm-g2)]">
          <InfiniteSlider gap={0} duration={60}>
            {METIERS.map((m) => (
              <div key={m} className="flex h-[120px] shrink-0 items-center justify-center overflow-hidden px-10">
                <span className="nm-mot text-[22px] text-[var(--nm-g4)]">{m}</span>
              </div>
            ))}
          </InfiniteSlider>
        </div>
      </div>
    </div>
  );
}

function BoutonAudit() {
  return (
    <a href={AUDIT} className="nm-btn nm-btn--plein nm-btn--md nm-type-btn">
      {HEROS.bouton}
    </a>
  );
}

export default function Heros() {
  return (
    <CarteBlanche className="rounded-b-[24px] pb-[80px] -mb-[24px] nm-px-edge">
      <div className="pt-[40px] min-[1440px]:pt-0">
        <div className="h-10 md:h-20 lg:h-[9vw]" />
      </div>
      <div className="relative flex flex-col nm-gap-fluid-xl lg:gap-[5.5vw] nm-px-edge">
        <Filet cote="gauche" couleur="var(--nm-g2)" />
        <Filet cote="droite" couleur="var(--nm-g2)" />

        {/* téléphone et tablette */}
        <div className="lg:hidden flex flex-col nm-gap-fluid-lg">
          <div>
            <p className="nm-type-caption text-[var(--nm-g5)] mb-4">
              <a className="underline underline-offset-4 hover:text-[var(--nm-noir)]" href="/secteurs">
                {HEROS.surtitre}
              </a>
            </p>
            <h1 className="nm-serif nm-text-h1-mobile md:text-[52px] leading-[1.02] md:leading-[1.05] tracking-[-0.01em] md:tracking-[-0.02em] text-[var(--nm-noir)] [text-wrap:balance]">
              {HEROS.titre}
            </h1>
          </div>
          <div className="flex flex-col gap-8 items-start">
            <p className="nm-serif nm-text-subtitle-mobile md:text-[20px] leading-[1.41] tracking-[-0.01em] text-[var(--nm-noir)] md:max-w-[520px] [text-wrap:pretty]">
              {HEROS.chapo}
            </p>
            <BoutonAudit />
          </div>
        </div>

        {/* ordinateur */}
        <div className="hidden lg:grid lg:gap-12 lg:items-center" style={{ gridTemplateColumns: "2fr 4fr" }}>
          <div className="flex flex-col gap-16">
            <div>
              <p className="nm-type-caption text-[var(--nm-g5)] mb-4">
                <a className="underline underline-offset-4 hover:text-[var(--nm-noir)]" href="/secteurs">
                  {HEROS.surtitre}
                </a>
              </p>
              <h1
                className="nm-serif leading-[1.08] tracking-[-0.03em] text-[var(--nm-noir)]"
                style={{ fontSize: "clamp(38px, 4.2vw, 60px)" }}
              >
                {HEROS.titre}
              </h1>
            </div>
            <Apparait>
              <div className="relative pl-6 flex flex-col gap-10 items-start">
                <Filet cote="gauche" couleur="var(--nm-g2)" />
                <div className="absolute left-0 top-0 w-[5px] h-[24px] bg-[var(--nm-g2)] -translate-x-1/2" />
                <p
                  className="nm-serif leading-[1.2] tracking-[-0.01em] text-[var(--nm-noir)] max-w-[480px] [text-wrap:pretty]"
                  style={{ fontSize: "clamp(16px, 1.5vw, 26px)" }}
                >
                  {HEROS.chapo}
                </p>
                <BoutonAudit />
              </div>
            </Apparait>
          </div>
          <div className="w-full rounded-[24px] overflow-hidden relative" style={{ aspectRatio: "1344 / 638" }}>
            <HerosVisuelLarge />
          </div>
        </div>
        <div className="lg:hidden w-full rounded-[30px] md:rounded-[24px] overflow-hidden relative" style={{ aspectRatio: "676 / 960" }}>
          <HerosVisuelEtroit />
        </div>

        <Apparait className="flex flex-col gap-6 md:gap-8 lg:gap-10">
          <p className="nm-type-mono text-[var(--nm-noir)]">{HEROS.bandeau}</p>
          <Bandeau />
        </Apparait>
      </div>
    </CarteBlanche>
  );
}
