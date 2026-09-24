/* ══════════════════════════════════════════════════════════════════════
   Tamila (cabinets d'avocats) — Secret.tsx

   COPIÉ le 24/09/2026 à 13 h 37 de `OMEGA/cabinetos-site/src/components/
   secret.tsx` (la section « Secret professionnel », ajoutée à la source le
   24/09). Géométrie, textes et références juridiques inchangés.

   CONVERSIONS (règle 3, jetons CLAIRS) : `border-foreground/10`,
   `divide-foreground/10`, `bg-foreground/10` (les filets d'un pixel de la
   grille), `from-foreground/10`, `ring-foreground/10` → `#171717` à la même
   opacité · `bg-background` → `bg-[#ffffff]` · `text-foreground`,
   `text-accent-foreground` → `text-[#171717]` · `text-muted-foreground` →
   `text-[#737373]` · `.link` → `.avocats-lien` (avocats.css) ·
   `font-subheading italic` → `avocats-accent italic`.

   MONDE BLANC :
   · La lueur `bg-blue-600` au-dessus du cadre → `bg-blue-300` : même
     place, même flou, elle éclaire le haut du cadre sans le tacher.
   · Le drapeau du badge portait `ring-white/20` et une ombre noire à 40 %
     (invisible sur le noir). Le liseré est désormais DANS le dessin
     (drapeau.tsx, celui du site) ; l'ombre, qui apparaît sur le blanc,
     tombe à 8 %.
   · Le filigrane (même drapeau à 4 %) est gardé tel quel.

   LIEN (règle 6) : « Recevoir le projet de contrat lors de l'audit » →
   /reserver-un-audit (textes.ts), en <Link>. Ancre : `scroll-mt-16` →
   `scroll-mt-16 sm:scroll-mt-[72px]` (l'entête d'Omega).
   ══════════════════════════════════════════════════════════════════════ */
import Image from "next/image";
import Link from "next/link";
import { Ban, EyeOff, FileLock2, FolderLock, History, Trash2 } from "lucide-react";
import AnimationContainer from "./apparition";
import { Drapeau, Tricolore } from "./drapeau";
import { CONTACT, SECRET } from "./textes";

/* Section ajoutée le 24/09 à la demande de Teo : pour un cabinet d'avocats, la fuite d'une pièce est le pire
   risque, il faut une réponse précise et visible. Placée avant les formules (la preuve précède le prix).
   Composée dans l'idiome de la référence : en-tête centré à mot en italique, puis un grand cadre
   rounded-3xl liseré de foreground/10 avec une lueur bleue, comme les formules et l'appel final.
   Le drapeau aux teintes officielles (#000091, #E1000F), repris de filed-site/components/ui/drapeau.tsx.
   Hébergement et lecture en France : décision de Teo du 24/09 (hébergeur français pour Tamila).
   24/09 au soir (registre d'un cabinet, avocats.css) : la tache bleue floue du cadre est retirée ; la colonne
   de gauche s'ouvre sur la grille du Palais de justice de Paris, « Liberté · Fraternité » et les écussons RF
   (Nathan Cima, Unsplash) — le droit français en image, à côté du drapeau et de la mention des textes. */

const icones = [FolderLock, EyeOff, Trash2, FileLock2, History, Ban];

export default function Secret() {
  return (
    <div id="secret" className="relative flex flex-col items-center justify-center max-w-6xl py-20 mx-auto scroll-mt-16 sm:scroll-mt-[72px]">
      <AnimationContainer>
        <div className="flex flex-col items-center text-center max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-4xl lg:text-5xl font-medium leading-[1.15]! mt-6">
            {SECRET.titreAvant} <br className="hidden md:block" /> <span className="avocats-accent italic">{SECRET.titreMot}</span>
          </h2>
          <p className="text-base md:text-lg text-center text-[#171717]/80 mt-6 max-w-2xl">{SECRET.texte}</p>
        </div>
      </AnimationContainer>

      <AnimationContainer delay={0.2} className="mt-12">
        <div className="relative grid lg:grid-cols-5 rounded-2xl lg:rounded-3xl border border-[#171717]/10 bg-[#ffffff]/20 overflow-hidden">
          {/* Le filigrane du drapeau dans l'angle (opacité 4 %) est retiré le 24/09 au soir : positionné, il se
              peignait PAR-DESSUS les deux dernières cartes et se lisait comme une tache bleue et rose. */}

          <div className="lg:col-span-2 flex flex-col gap-8 p-6 md:p-10 border-b lg:border-b-0 lg:border-r border-[#171717]/10">
            <figure className="relative -mx-6 -mt-6 md:-mx-10 md:-mt-10 aspect-[16/9] overflow-hidden border-b border-[#171717]/10">
              <Image
                src="/photos/avocats-palais-grille.jpg"
                alt="La grille du Palais de justice de Paris, sous les mots Liberté et Fraternité gravés dans la pierre"
                fill
                sizes="(min-width: 1024px) 460px, 100vw"
                className="object-cover object-[50%_35%]"
              />
            </figure>
            <div className="flex items-center gap-4">
              <Drapeau className="h-10 w-auto rounded-[3px] shadow-lg shadow-black/[0.08]" />
              <div>
                <p className="text-sm font-medium tracking-wide uppercase text-[#171717]">{SECRET.badge}</p>
                <Tricolore className="mt-2 h-[2px] w-16" />
              </div>
            </div>
            <p className="text-xl md:text-2xl font-medium leading-snug">{SECRET.accroche}</p>
            <dl className="divide-y divide-[#171717]/10 border-y border-[#171717]/10">
              {SECRET.faits.map(([cle, valeur]) => (
                <div key={cle} className="flex items-baseline justify-between gap-4 py-3">
                  <dt className="text-sm text-[#6f6a62]">{cle}</dt>
                  <dd className="text-right text-sm md:text-base font-medium">{valeur}</dd>
                </div>
              ))}
            </dl>
            <Link href={CONTACT.audit} className="text-sm text-[#6f6a62] avocats-lien w-fit hover:text-[#171717] transition-colors">
              Recevoir le projet de contrat lors de l&apos;audit
            </Link>
          </div>

          <ul className="lg:col-span-3 grid sm:grid-cols-2 gap-px bg-[#171717]/10">
            {SECRET.engagements.map((e, i) => {
              const I = icones[i];
              return (
                <li key={e.titre} className="flex flex-col gap-3 bg-[#ffffff] p-6 md:p-8">
                  <span className="grid size-10 place-items-center rounded-full bg-linear-to-b from-[#171717]/10 to-transparent ring-1 ring-[#171717]/10">
                    <I className="size-5" aria-hidden="true" />
                  </span>
                  <h3 className="text-base font-semibold">{e.titre}</h3>
                  <p className="text-sm text-[#6f6a62] leading-relaxed">{e.texte}</p>
                </li>
              );
            })}
          </ul>

          <p className="lg:col-span-5 flex items-center justify-center gap-3 border-t border-[#171717]/10 px-6 py-4 text-xs text-[#6f6a62] text-center">
            <Tricolore className="h-2.5 w-4 shrink-0 rounded-[1px]" />
            {SECRET.mention}
          </p>
        </div>
      </AnimationContainer>
    </div>
  );
}
