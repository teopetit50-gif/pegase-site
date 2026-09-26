import { DECISIONS } from "./textes";

/* ══ le visuel du hero ═════════════════════════════════════════════════
   Chez concurrence.com : une VIDÉO (landing-hero-desktop.webm, 1344 × 638)
   — un portrait très flou dans l'ombre, et devant lui une colonne de
   « workflows » en serif qui défile, la ligne du milieu en blanc, reliée
   par des fils à deux pastilles à gauche (« Your platform », « Concurrence
   AI ») et à une pastille à droite (« Patient »). La vidéo est à eux : on
   la redessine en balisage, même composition, avec nos objets.
   • le fond : une photo de port la nuit (Unsplash, crédits dans
     public/secteurs-groupes/CREDITS.txt), floutée à 26 px ;
   • la colonne : les décisions d'un matin (données d'exemple), en deux
     calques synchrones — terne partout, blanc dans la bande du milieu ;
   • les pastilles : « Vos sociétés » → « Varelo » → la colonne →
     « Directions » (« Chaque direction » sur téléphone).
   Positions relevées sur la vidéo à 1440 : pastilles à 5 % et 30 % de la
   largeur, colonne de 54 % à 80 %, pastille de droite à 86 %. */

function Colonne({ taille, ligne, duree }: { taille: number; ligne: number; duree: number }) {
  const liste = [...DECISIONS, ...DECISIONS];
  const vars = { "--nm-taille": `${taille}px`, "--nm-ligne": `${ligne}px`, "--nm-duree": `${duree}s` } as React.CSSProperties;
  return (
    <div className="nm-hv__liste h-full" style={vars}>
      <div className="nm-hv__calque--terne nm-hv__piste">
        {liste.map((d, i) => (
          <p key={i}>{d}</p>
        ))}
      </div>
      <div className="nm-hv__calque--vif" aria-hidden>
        <div className="nm-hv__piste">
          {liste.map((d, i) => (
            <p key={i}>{d}</p>
          ))}
        </div>
      </div>
    </div>
  );
}

function Puce({ children, signe = false }: { children: React.ReactNode; signe?: boolean }) {
  return (
    <span className="nm-hv__puce">
      <span className="nm-hv__pastille">
        {signe ? (
          <span
            className="block h-[11px] w-[11px] bg-[#0a0a0a]"
            style={{ WebkitMask: "url(/logos/varelo-mark.png) center / contain no-repeat", mask: "url(/logos/varelo-mark.png) center / contain no-repeat" }}
          />
        ) : (
          <span className="block h-[7px] w-[7px] rounded-full bg-[#0a0a0a]" />
        )}
      </span>
      {children}
    </span>
  );
}

export function HerosVisuelLarge() {
  return (
    <div className="nm-hv" aria-hidden>
      <div className="nm-hv__fond" style={{ backgroundImage: "url(/secteurs-groupes/heros-port.jpg)" }} />
      <div className="nm-hv__grain" />
      <div className="absolute inset-0 flex items-center">
        <div className="absolute left-[5%] top-1/2 -translate-y-1/2">
          <Puce>Vos sociétés</Puce>
        </div>
        <div className="nm-hv__fil absolute left-[17%] right-[73%] top-1/2" />
        <div className="absolute left-[30%] top-1/2 -translate-y-1/2">
          <Puce signe>Varelo</Puce>
        </div>
        <div className="nm-hv__fil absolute left-[42%] right-[50%] top-1/2" />
        {/* 31 % et non 27 % : nos lignes sont plus longues que les leurs */}
        <div className="absolute bottom-0 left-[51.5%] top-0 w-[31%]">
          <Colonne taille={15} ligne={21} duree={38} />
        </div>
        <div className="nm-hv__fil absolute left-[83%] right-[12.5%] top-1/2" />
        <div className="absolute left-[87.5%] top-1/2 -translate-y-1/2">
          <Puce>Directions</Puce>
        </div>
      </div>
    </div>
  );
}

export function HerosVisuelEtroit() {
  return (
    <div className="nm-hv" aria-hidden>
      <div className="nm-hv__fond" style={{ backgroundImage: "url(/secteurs-groupes/heros-port.jpg)" }} />
      <div className="nm-hv__grain" />
      <div className="absolute left-[7%] top-[7%] flex items-center gap-2">
        <Puce>Vos sociétés</Puce>
        <span className="nm-hv__fil block w-6" />
        <Puce signe>Varelo</Puce>
      </div>
      <div className="absolute inset-x-[7%] bottom-[16%] top-[18%]">
        <Colonne taille={17} ligne={25} duree={40} />
      </div>
      <div className="absolute bottom-[7%] left-[7%]">
        <Puce>Chaque direction</Puce>
      </div>
    </div>
  );
}
