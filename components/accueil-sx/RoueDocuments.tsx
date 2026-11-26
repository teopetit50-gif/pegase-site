"use client";

/* 26/11/2026 — LA ROUE DES DOCUMENTS (Teo : « lui à la place du phone »).
   Remplace la maquette de téléphone de la carte « Réglez votre marque une
   fois » (SxMarque). Le mécanisme est celui du composant « Radial Orbital
   Timeline » de 21st.dev : cinq nœuds sur un cercle qui tourne, un clic
   arrête la roue et ouvre la fiche du nœud. Adapté au site : pas de
   shadcn Card/Badge, textes français, le centre prend la couleur de la
   marque (`--wl-brand`) et les nœuds sont les cinq documents qui partent
   sous l'en-tête de la société. La roue ne tourne pas si le visiteur a
   demandé moins d'animations. */

import { useEffect, useRef, useState } from "react";
import { Bell, FileCheck, FileText, Package, Receipt } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Noeud = { id: number; titre: string; texte: string; Icone: LucideIcon };

const NOEUDS: Noeud[] = [
  { id: 1, titre: "Devis", texte: "L'en-tête et les mentions légales de la société choisie.", Icone: FileText },
  { id: 2, titre: "Commande", texte: "Une numérotation propre à chaque société.", Icone: Package },
  { id: 3, titre: "Facture", texte: "Son nom, son logo et ses couleurs sur chaque page.", Icone: Receipt },
  { id: 4, titre: "Relance", texte: "Elle part sous le nom de la société, après votre validation.", Icone: Bell },
  { id: 5, titre: "Avoir", texte: "Même en-tête, même numérotation que la facture.", Icone: FileCheck },
];

const RAYON = 118;

export default function RoueDocuments() {
  const [angle, setAngle] = useState(0);
  const [ouvert, setOuvert] = useState<number | null>(null);
  const [calme, setCalme] = useState(false);
  const roue = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    const maj = () => setCalme(m.matches);
    const t = requestAnimationFrame(maj);
    m.addEventListener("change", maj);
    return () => {
      cancelAnimationFrame(t);
      m.removeEventListener("change", maj);
    };
  }, []);

  useEffect(() => {
    if (ouvert !== null || calme) return;
    const t = setInterval(() => setAngle((a) => (a + 0.3) % 360), 50);
    return () => clearInterval(t);
  }, [ouvert, calme]);

  const choisir = (id: number) => {
    if (ouvert === id) {
      setOuvert(null);
      return;
    }
    const rang = NOEUDS.findIndex((n) => n.id === id);
    setAngle(270 - (rang / NOEUDS.length) * 360);
    setOuvert(id);
  };

  const actif = NOEUDS.find((n) => n.id === ouvert) ?? null;

  return (
    <div
      ref={roue}
      className="wl-roue relative z-[1] flex-none overflow-hidden rounded-[28px] bg-[#0b0b0c] text-white"
      style={{
        /* largeur FIXE, comme le téléphone (236 px) qu'elle remplace : en
           pourcentage, la colonne « auto » de la grille se calait sur la
           roue seule et le devis débordait sur la liste des sociétés */
        width: "300px",
        height: "324px",
        boxShadow:
          "inset 0 0 0 1px #ffffff1a, 0 30px 50px -28px #00000073, 0 4px 10px #00000014",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) setOuvert(null);
      }}
    >
      <div className="absolute inset-0 flex items-center justify-center" style={{ transform: "translateY(-6%)" }}>
        {/* le cercle et le cœur, aux couleurs de la marque */}
        <div className="absolute size-[236px] rounded-full border border-white/10" />
        <div
          className="absolute z-10 flex size-[46px] items-center justify-center rounded-full"
          style={{ background: "var(--wl-brand)" }}
        >
          <div className="size-[18px] rounded-full bg-white/85" />
        </div>

        {NOEUDS.map((n, i) => {
          const rad = (((i / NOEUDS.length) * 360 + angle) % 360) * (Math.PI / 180);
          const x = RAYON * Math.cos(rad);
          const y = RAYON * Math.sin(rad);
          const ici = ouvert === n.id;
          const Icone = n.Icone;
          return (
            <div
              key={n.id}
              className="absolute cursor-pointer transition-[opacity] duration-300"
              style={{
                transform: `translate(${x}px, ${y}px)`,
                zIndex: ici ? 200 : Math.round(100 + 50 * Math.cos(rad)),
                opacity: ici ? 1 : Math.max(0.45, 0.45 + 0.55 * ((1 + Math.sin(rad)) / 2)),
              }}
              onClick={(e) => {
                e.stopPropagation();
                choisir(n.id);
              }}
            >
              <div
                className={`flex size-[34px] items-center justify-center rounded-full border-2 transition-transform duration-300 ${
                  ici ? "scale-125 border-white bg-white text-black" : "border-white/40 bg-black text-white"
                }`}
              >
                <Icone size={15} strokeWidth={2} aria-hidden="true" />
              </div>
              <div
                className={`absolute left-1/2 top-[40px] -translate-x-1/2 whitespace-nowrap text-[11px] font-semibold tracking-wider ${
                  ici ? "text-white" : "text-white/70"
                }`}
              >
                {n.titre}
              </div>
            </div>
          );
        })}
      </div>

      {/* la fiche du nœud ouvert, en pied de roue */}
      <div
        className={`absolute inset-x-4 bottom-4 rounded-xl border border-white/20 bg-black/90 px-3.5 py-3 transition-[opacity,transform] duration-300 ${
          actif ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0"
        }`}
        style={{ zIndex: 300 }}
      >
        <p className="text-[12px] font-semibold">{actif?.titre ?? " "}</p>
        <p className="mt-0.5 text-[11.5px] leading-[1.4] text-white/75">{actif?.texte ?? " "}</p>
      </div>
    </div>
  );
}
