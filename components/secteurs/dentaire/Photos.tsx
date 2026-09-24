/* ══════════════════════════════════════════════════════════════════════
   Photos — les vraies photos de cabinet et les cartes d'interface posées
   dessus (rhabillage « cabinet dentaire » de la source, 24/09 après-midi :
   Teo trouvait que Tiroma « ne fait pas assez site dentaire » ; modèle :
   Dentally et Masterdoc, une photo du cabinet et des cartes du produit
   par-dessus).

   Les quatre photos viennent d'Unsplash, bibliothèque GRATUITE (jamais
   Unsplash+, jamais générées), vérifiées en plein cadre : aucun filigrane,
   aucune radiographie à l'écran. Crédits :
   public/secteurs-dentaire/photos/CREDITS.txt.

   Les cartes montrent des DONNÉES D'EXEMPLE (initiales, montants de
   devis) : ce sont des maquettes du produit, pas des clients.
   ══════════════════════════════════════════════════════════════════════ */
import Image from "next/image";
import { CalendarX, CircleCheck } from "lucide-react";
import type { ReactNode } from "react";
import SchemaDentaire from "./SchemaDentaire";

export const PHOTOS = "/secteurs-dentaire/photos";

/* Une carte d'interface : blanche, filet fin, ombre douce. */
function Carte({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-slate-200/80 bg-white/95 p-4 text-left shadow-xl shadow-slate-900/10 backdrop-blur ${className}`}
    >
      {children}
    </div>
  );
}

function CarteCreneau({ className = "" }: { className?: string }) {
  return (
    <Carte className={`w-[260px] ${className}`}>
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#e3f0ed] text-[#30635a]">
          <CalendarX size={18} />
        </span>
        <div>
          <div className="text-sm font-semibold text-slate-900">Créneau libéré · 10 h 30</div>
          <div className="text-xs text-slate-500">Fauteuil 2 · annulé hier à 19 h 04</div>
        </div>
      </div>
      <div className="mt-3 space-y-1">
        {[
          ["MR", "Mme R.", "plan accepté"],
          ["PL", "M. P.", "liste d'attente"],
          ["AN", "Mme A.", "contrôle dû"],
        ].map(([initiales, nom, motif], k) => (
          <div
            key={initiales}
            className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs ${k === 0 ? "bg-[#f3f8f7] ring-1 ring-[#c7e1db]" : ""}`}
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#e3f0ed] text-[10px] font-semibold text-[#29514a]">
              {initiales}
            </span>
            <span className="font-medium text-slate-800">{nom}</span>
            <span className="ml-auto text-slate-500">{motif}</span>
          </div>
        ))}
      </div>
    </Carte>
  );
}

function CartePlan({ className = "" }: { className?: string }) {
  return (
    <Carte className={`w-[330px] ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="whitespace-nowrap text-sm font-semibold text-slate-900">Plan de traitement · M. C.</span>
        <span className="whitespace-nowrap rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
          sans rendez-vous
        </span>
      </div>
      <SchemaDentaire dents={{ 46: "plan", 36: "plan", 24: "absente", 16: "fait", 26: "fait" }} className="mt-3 block w-full" />
      <div className="mt-3 space-y-1 text-xs">
        <div className="flex justify-between px-1 text-[10px] uppercase tracking-wide text-slate-400">
          <span>Acte</span>
          <span>Reste à charge</span>
        </div>
        {[
          ["46", "Couronne céramique 46", "220 €"],
          ["36", "Inlay-onlay 36", "245 €"],
          ["24", "Implant 24", "1 380 €"],
        ].map(([dent, acte, reste]) => (
          <div key={dent} className="flex items-center gap-2 rounded-lg bg-slate-50 px-2 py-1.5">
            <span className="rounded-md bg-[#e3f0ed] px-1.5 font-mono text-[10px] font-semibold text-[#30635a]">{dent}</span>
            <span className="text-slate-700">{acte}</span>
            <span className="ml-auto font-mono text-slate-900">{reste}</span>
          </div>
        ))}
      </div>
      <div className="mt-2 text-[11px] text-slate-500">Devis signé il y a 23 jours · accord de la mutuelle reçu</div>
    </Carte>
  );
}

export function CarteAnnulation() {
  return (
    <Carte className="w-[250px] sm:w-[280px]">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
          <CalendarX size={15} />
        </span>
        Annulation reçue · la veille, 19 h 04
      </div>
      <div className="mt-2 text-sm font-semibold text-slate-900">10 h 30, fauteuil 2 : trois patients peuvent venir</div>
      <div className="mt-2 flex items-center gap-2 text-xs text-[#30635a]">
        <CircleCheck size={14} /> Mme R. rappelée par l&apos;assistante à 8 h 12
      </div>
    </Carte>
  );
}

export function CarteFauteuil() {
  return (
    <Carte className="w-[230px]">
      <div className="text-xs text-slate-500">Fauteuil 3 · cet après-midi</div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-2xl font-semibold text-slate-900">41 %</span>
        <span className="text-xs text-rose-600">sans assistante à 14 h</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full w-[41%] rounded-full bg-[#4f9587]" />
      </div>
      <div className="mt-2 text-xs text-slate-600">Deux soins à basculer sur le fauteuil 1</div>
    </Carte>
  );
}

/* Une photo de cabinet, une carte d'interface posée dans un coin. */
export function PhotoCarte({
  src,
  alt,
  position = "50% 50%",
  carte,
  placeCarte,
}: {
  src: string;
  alt: string;
  position?: string;
  carte: ReactNode;
  placeCarte: string;
}) {
  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-slate-200 shadow-xl shadow-slate-900/5 sm:aspect-[16/10]">
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(min-width: 1024px) 50vw, 100vw"
        className="object-cover"
        style={{ objectPosition: position }}
      />
      <div className={`absolute ${placeCarte}`}>{carte}</div>
    </div>
  );
}

/* Le héros : le praticien au fauteuil, deux cartes de Tiroma posées sur la
   photo. Sur téléphone, la carte du créneau passe SOUS la photo (en
   recouvrement) et celle du plan est masquée : elles cacheraient la scène. */
export function PhotoHeros() {
  return (
    <div className="relative mx-auto w-full max-w-5xl">
      <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-slate-200 shadow-2xl shadow-slate-900/10 sm:aspect-[16/9]">
        <Image
          src={`${PHOTOS}/praticien-au-fauteuil.jpg`}
          alt="Au fauteuil, un praticien en blouse montre à sa patiente le soin prévu"
          fill
          priority
          sizes="(min-width: 1024px) 1024px, 100vw"
          className="object-cover"
          style={{ objectPosition: "55% 40%" }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/10 via-transparent to-transparent" />
      </div>
      <CarteCreneau className="relative mx-auto -mt-16 sm:absolute sm:left-4 sm:top-6 sm:mx-0 sm:mt-0 lg:-left-10 lg:top-10" />
      <CartePlan className="hidden sm:absolute sm:bottom-6 sm:right-4 sm:block lg:-right-10 lg:bottom-10" />
    </div>
  );
}
