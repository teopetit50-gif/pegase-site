/* ══════════════════════════════════════════════════════════════════════
   Tamila sur le dessin Radius — le héros (11/11/2026)

   Classe pour classe, la première section du modèle : deux colonnes dès
   `lg` séparées d'un filet, hauteur 100vh − 4rem, à gauche l'annonce
   fléchée, le h1 (30 → 36 → 48 px, 600, −.025em), le chapô et le bouton
   noir ; à droite la fenêtre de 400 / 500 / 600 px : le fond passé en
   caractères, puis l'écran du logiciel décalé vers le bas et la droite,
   dans un cadre de verre (dégradé blanc, flou, ombre, anneau) à coin
   haut-gauche arrondi, un filet de lumière sur son bord haut.
   Les mots : HERO (textes.ts). L'écran : une VRAIE capture du tableau
   de bord client, thème clair, données d'exemple
   (public/secteurs-avocats/ecrans/tableau.png, voir page.tsx) — Teo veut
   de vraies captures à la place des faux écrans.
   ══════════════════════════════════════════════════════════════════════ */
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CONTACT, HERO } from "./textes";
import { Conteneur, FOND } from "./ui";

export default function Heros() {
  return (
    <section data-monde="clair" className="w-full border-b border-[#e5e7eb] bg-white">
      <Conteneur large>
        <div className="relative grid min-h-[calc(100vh-4rem)] grid-cols-1 items-center gap-8 py-12 lg:grid-cols-2 lg:gap-12 lg:py-0">
          <div className="absolute bottom-0 left-1/2 top-0 hidden w-px -translate-x-1/2 bg-[#e5e7eb] lg:block" aria-hidden="true" />
          <div className="flex max-w-xl flex-col justify-center lg:pr-8">
            <Link href={CONTACT.audit} className="group mb-6 inline-flex w-fit items-center gap-1 text-sm text-[#4a5565] transition-colors hover:text-[#101828]">
              {HERO.annonce}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </Link>
            <h1 className="mb-6 text-3xl font-semibold leading-[1.1] tracking-tight text-[#101828] sm:text-4xl lg:text-5xl">
              {HERO.titreAvant} {HERO.titreMot} {HERO.titreApres}
            </h1>
            <p className="mb-8 text-base leading-relaxed text-[#4a5565] sm:text-lg">{HERO.texte}</p>
            <div>
              <Link href={CONTACT.audit} className="inline-flex items-center justify-center rounded-lg bg-black px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-[#1e2939]">
                {HERO.bouton}
              </Link>
            </div>
          </div>
          <div className="relative h-[400px] w-full sm:h-[500px] lg:h-[600px] lg:pl-8">
            <div className="absolute inset-0 overflow-hidden lg:left-8">
              <Image alt="" fill priority sizes="(max-width: 1024px) 100vw, 640px" className="object-cover" src={FOND} />
            </div>
            <div className="absolute bottom-0 left-8 right-0 top-8 overflow-hidden rounded-tl-xl bg-gradient-to-br from-white/60 via-white/20 to-white/40 p-[1.5px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3),0_0_0_1px_rgba(255,255,255,0.4)_inset] ring-1 ring-white/40 backdrop-blur-xl sm:left-12 sm:top-12 lg:left-20">
              <div className="relative h-full w-full overflow-hidden rounded-tl-[10px] bg-white/10">
                <Image
                  alt="Le tableau de bord Tamila : les dossiers du cabinet, leurs délais à confirmer et les actes attendus sous quinze jours (exemple)"
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 640px"
                  className="object-cover object-left-top"
                  src="/secteurs-avocats/ecrans/tableau.png"
                />
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent" aria-hidden="true" />
              </div>
            </div>
          </div>
        </div>
      </Conteneur>
    </section>
  );
}
