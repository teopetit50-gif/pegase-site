/* 26/11/2026 — LES QUATRE ENGAGEMENTS, en carte à liseré balayé (Teo :
   « Shine Border Security Card », shadcnspace/shine-border-02, via
   21st.dev). Remplace les quatre pastilles TLS / 30 J / UE / journal de la
   carte « Quatre engagements écrits » (SxSecurite).

   Le mécanisme (un dégradé masqué qui balaie le cadre de haut en bas) est
   celui du composant ; le contenu est le nôtre et ne dit que ce que la page
   dit déjà : Francfort et l'UE, le chiffrement TLS en transit et au repos,
   30 jours de rétention chez le fournisseur, aucun entraînement de modèle.
   Les trois couleurs du balayage sont celles des barres que la carte
   voisine portait (#2d00f7, #f06a00, #16a34a). Pas de shadcn Card / Badge /
   Avatar : du balisage simple, sur la palette de l'accueil. */

import { Fingerprint, Lock, Server, ShieldCheck, Ban } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const LIGNES: { Icone: LucideIcon; libelle: string; valeur: string }[] = [
  { Icone: Server, libelle: "Hébergement", valeur: "Francfort, UE" },
  { Icone: Lock, libelle: "Chiffrement", valeur: "TLS, transit et repos" },
  { Icone: Fingerprint, libelle: "Rétention fournisseur", valeur: "30 jours maxi" },
  { Icone: Ban, libelle: "Entraînement d'IA", valeur: "Jamais" },
];

export default function SecuriteEngagements() {
  return (
    <div
      className="sx-shine relative w-[min(100%,340px)] overflow-hidden rounded-2xl p-[2px]"
      style={{ background: "#e6e6e1" }}
    >
      <style>{`
        @keyframes sx-shine-scan {
          0% { mask-position: 0% -100%; -webkit-mask-position: 0% -100%; }
          100% { mask-position: 0% 200%; -webkit-mask-position: 0% 200%; }
        }
        .sx-shine-scan {
          mask-image: linear-gradient(to bottom, transparent 0%, black 15%, black 25%, transparent 40%);
          -webkit-mask-image: linear-gradient(to bottom, transparent 0%, black 15%, black 25%, transparent 40%);
          mask-size: 100% 300%;
          -webkit-mask-size: 100% 300%;
          animation: sx-shine-scan 3.2s linear infinite;
        }
        @media (prefers-reduced-motion: reduce) { .sx-shine-scan { animation: none; opacity: 0 } }
      `}</style>
      {/* le balayage, sous le contenu : seul le liseré de 2 px le laisse voir */}
      <div
        className="sx-shine-scan pointer-events-none absolute inset-0 opacity-90 blur-sm"
        style={{ background: "linear-gradient(to bottom, #2d00f7, #f06a00, #16a34a)" }}
      />

      <div className="relative z-10 flex flex-col gap-4 rounded-[14px] bg-white p-5 text-[#171717]">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-xl bg-[#f1f1ee]">
              <ShieldCheck className="size-[18px]" strokeWidth={1.8} aria-hidden="true" />
            </span>
            <span>
              <span className="block text-[13.5px] font-semibold leading-tight">Vos données</span>
              <span className="block text-[12px] text-[#84877f]">Quatre engagements écrits</span>
            </span>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#16a34a]/25 bg-[#16a34a]/[0.06] px-2.5 py-1 text-[11px] font-medium text-[#15803d]">
            <span className="size-1.5 animate-pulse rounded-full bg-[#16a34a]" />
            Protégées
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {LIGNES.map(({ Icone, libelle, valeur }) => (
            <div key={libelle} className="rounded-lg bg-[#f5f5f2] p-3">
              <span className="flex items-center gap-1.5 text-[11px] text-[#84877f]">
                <Icone className="size-3" strokeWidth={2} aria-hidden="true" />
                {libelle}
              </span>
              <span className="mt-1 block text-[13px] font-medium leading-tight">{valeur}</span>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 rounded-lg border border-[#e6e6e1] px-3.5 py-2.5">
          <ShieldCheck className="size-4 shrink-0 text-[#16a34a]" strokeWidth={2} aria-hidden="true" />
          <span className="text-[12.5px] font-medium">Aucune réplication hors de l&apos;Union européenne</span>
        </div>
      </div>
    </div>
  );
}
