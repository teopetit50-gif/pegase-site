/* ══ le carré de la méthode ════════════════════════════════════════════
   Chez eux, trois VIDÉOS carrées (virtual-patients.webm…) : des cartes de
   verre gris qui flottent sur le bleu de la bande, avec une bulle de
   texte et un portrait. Même matière ici (verre blanc à 8-14 %, filet
   à 16 %, flou), en balisage, avec nos trois temps : lire, calculer,
   proposer. Données d'exemple. */
function Verre({ className = "", style, children }: { className?: string; style?: React.CSSProperties; children: React.ReactNode }) {
  return (
    <div
      style={style}
      className={`absolute rounded-[14px] border border-white/15 bg-white/[0.09] p-4 text-white backdrop-blur-md shadow-[0_30px_60px_-30px_rgba(0,0,0,0.6)] ${className}`}
    >
      {children}
    </div>
  );
}

const mono = "font-[family-name:var(--nm-mono)] text-[9px] uppercase tracking-[0.08em] text-white/60";

export function VisuelLire() {
  return (
    <div className="absolute inset-0">
      {[
        ["ERP", "Ventes et stocks · 4 magasins", "left-[12%] top-[16%] w-[62%]", "0s"],
        ["Caisses", "Tickets d'hier, 7 h 00", "left-[24%] top-[40%] w-[60%]", "-2s"],
        ["Transitaire", "Conteneur 40 pieds · départ 8/10", "left-[16%] top-[64%] w-[66%]", "-4s"],
      ].map(([t, s, pos, d]) => (
        <Verre key={t} className={`nm-flotte ${pos}`} style={{ animationDelay: d }}>
          <div className="flex items-center gap-3">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/90 text-[11px] font-semibold text-[#0a0a0a]">{t[0]}</span>
            <span className="flex flex-col">
              <span className="text-[13px] font-semibold">{t}</span>
              <span className={mono}>{s}</span>
            </span>
          </div>
        </Verre>
      ))}
    </div>
  );
}

export function VisuelCalculer() {
  const barres = [9, 8, 8, 7, 6, 6, 5, 4, 4, 3, 3, 2];
  return (
    <div className="absolute inset-0">
      <Verre className="nm-flotte left-[10%] top-[18%] w-[80%]">
        <p className={mono}>Couverture du stock · semaines</p>
        <div className="mt-4 flex h-[120px] items-end gap-[6px]">
          {barres.map((b, i) => (
            <span key={i} className={`flex-1 rounded-[2px] ${b < 4 ? "bg-white" : "bg-white/35"}`} style={{ height: `${b * 11}%` }} />
          ))}
        </div>
        <div className="mt-3 flex justify-between text-[11px] text-white/70">
          <span>Délai de mer : 26 jours</span>
          <span>Départ J-6</span>
        </div>
      </Verre>
      <Verre className="nm-flotte left-[36%] top-[66%] w-[54%] !py-3">
        <p className="text-[13px] font-semibold">Rupture le 14/11</p>
        <p className={mono}>Bâche 4 × 5 m · tous magasins</p>
      </Verre>
    </div>
  );
}

export function VisuelProposer() {
  return (
    <div className="absolute inset-0">
      <Verre className="nm-flotte left-[9%] top-[14%] w-[82%]">
        <div className="flex items-center justify-between border-b border-white/15 pb-3">
          <span className="text-[13px] font-semibold">Point du matin</span>
          <span className={mono}>7 h 00</span>
        </div>
        {["Ajouter 480 bâches au conteneur", "60 disjoncteurs par avion", "Transférer 140 ventilateurs"].map((d, i) => (
          <div key={d} className="flex items-center gap-3 border-b border-white/10 py-3 last:border-0">
            <span className="h-2 w-2 shrink-0 rounded-full bg-white" style={{ opacity: 1 - i * 0.3 }} />
            <span className="text-[13px]">{d}</span>
          </div>
        ))}
      </Verre>
      <div className="nm-flotte absolute left-[48%] top-[72%] rounded-full bg-white px-4 py-2 text-[12px] font-semibold text-[#0a0a0a]">
        Valider les trois
      </div>
    </div>
  );
}

export const VISUELS_METHODE = [VisuelLire, VisuelCalculer, VisuelProposer];
