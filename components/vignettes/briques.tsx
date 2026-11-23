/* ══════════════════════════════════════════════════════════════════════
   LES BRIQUES DES VIGNETTES (22/11/2026)

   Les pages de vente n'affichent plus de capture du tableau de bord ni
   d'image générée : leurs visuels sont des composants dessinés en code
   (Teo, 22/11 : « juste récupère des components pour remplacer les
   images »). Ces briques servent à toutes les pages. Deux règles, posées
   par Teo le même jour, valent pour toute vignette :
     1. un visuel différent par emplacement, jamais deux fois le même ;
     2. un grand cadre est rempli comme un écran de logiciel (chiffres,
        lignes, graphique), pas trois icônes dans du vide.

   Les couleurs sont écrites en clair (#0a0a0a, #fff, noir en
   transparence) pour rendre pareil sur toutes les pages : certaines
   repeignent text-white / bg-white (`.aa-clair` sur l'accueil). Aucun
   JavaScript côté navigateur. Les noms et les montants sont des exemples.
   ══════════════════════════════════════════════════════════════════════ */
import { Check, Clock, type LucideIcon } from "lucide-react";

export const ENCRE = "text-[#0a0a0a]";
export const SOURD = "text-black/55";
export const CARTE = "rounded-xl border border-black/[0.07] bg-[#fff]";
export const FILET = "border-t border-black/[0.06]";

export function Pastille({ children, pleine = false }: { children: React.ReactNode; pleine?: boolean }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-md px-1.5 py-0.5 text-[10px] font-medium ${
        pleine ? "bg-[#0a0a0a] text-[#fff]" : `bg-black/[0.05] ${ENCRE}`
      }`}
    >
      {children}
    </span>
  );
}

export function Bloc({
  I,
  titre,
  droite,
  children,
  className = "flex",
}: {
  I: LucideIcon;
  titre: string;
  droite?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`${CARTE} min-w-0 flex-col gap-2 p-3 xl:gap-2.5 xl:p-4 ${className}`}>
      <div className="flex items-center gap-2">
        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-black/[0.05] ${ENCRE}`}>
          <I className="h-3.5 w-3.5" strokeWidth={1.7} />
        </span>
        <span className={`truncate text-xs font-medium ${ENCRE}`}>{titre}</span>
        {droite ? <span className={`ml-auto shrink-0 text-[11px] ${SOURD}`}>{droite}</span> : null}
      </div>
      {children}
    </div>
  );
}

export function Ligne({ g, d, etat, pleine = false }: { g: string; d?: string; etat?: string; pleine?: boolean }) {
  return (
    <div className="flex items-center gap-2 text-[11px] leading-tight">
      <span className={`min-w-0 flex-1 truncate ${ENCRE}`}>{g}</span>
      {d ? <span className={`shrink-0 whitespace-nowrap tabular-nums ${SOURD}`}>{d}</span> : null}
      {etat ? <Pastille pleine={pleine}>{etat}</Pastille> : null}
    </div>
  );
}

export function Fait({ ok = true, children }: { ok?: boolean; children: React.ReactNode }) {
  return (
    <li className={`flex items-start gap-2 text-[11px] leading-snug ${ok ? ENCRE : SOURD}`}>
      {ok ? (
        <span className="mt-px flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-[#0a0a0a] text-[#fff]">
          <Check className="h-2 w-2" strokeWidth={3.5} />
        </span>
      ) : (
        <Clock className="mt-px h-3.5 w-3.5 shrink-0" strokeWidth={1.7} />
      )}
      <span className="min-w-0">{children}</span>
    </li>
  );
}

export function Bulle({ moi = false, children }: { moi?: boolean; children: React.ReactNode }) {
  return (
    <p
      className={`max-w-[88%] rounded-lg px-2.5 py-1.5 text-[11px] leading-snug ${
        moi ? "self-end bg-[#0a0a0a] text-[#fff]" : `self-start bg-black/[0.05] ${ENCRE}`
      }`}
    >
      {children}
    </p>
  );
}

/* un chiffre et son libellé */
export function Chiffre({ libelle, valeur, sous }: { libelle: string; valeur: string; sous?: string }) {
  return (
    <div className={`${CARTE} flex min-w-0 flex-col gap-0.5 p-3`}>
      <span className={`truncate text-[11px] ${SOURD}`}>{libelle}</span>
      <span className={`truncate text-base font-medium tracking-tight tabular-nums md:text-lg ${ENCRE}`}>{valeur}</span>
      {sous ? <span className={`truncate text-[10px] ${SOURD}`}>{sous}</span> : null}
    </div>
  );
}

/* une jauge horizontale, de 0 à 100 */
export function Jauge({ niveau }: { niveau: number }) {
  return (
    <span className="block h-1.5 w-full overflow-hidden rounded-full bg-black/[0.06]" aria-hidden="true">
      <span className="block h-full rounded-full bg-[#0a0a0a]" style={{ width: `${niveau}%` }} />
    </span>
  );
}
