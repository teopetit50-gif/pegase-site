/* ══════════════════════════════════════════════════════════════════════
   Tamila sur le dessin Radius — « Secret professionnel » (11/11/2026)

   La section « Model workspace » du modèle : tête (amorce, titre, chapô
   à 36rem), puis une grille de six cellules filetées (1 → 2 → 3
   colonnes, les filets intérieurs tenus par des variantes nth-child),
   chacune avec son carré d'icône, un titre et un texte. Les six cellules
   sont les six engagements de SECRET (textes.ts) ; la tête, son titre
   et son texte. Le filet haut de la section manque dans le modèle (elle
   suit directement « why ») : même chose ici.
   ══════════════════════════════════════════════════════════════════════ */
import { Eraser, EyeOff, FolderLock, Lock, MapPin, ScrollText } from "lucide-react";
import { AMORCES } from "./radius";
import { SECRET } from "./textes";
import { Amorce, Chapo, Conteneur, Pastille, Titre } from "./ui";

const ICONES = [FolderLock, EyeOff, Eraser, MapPin, ScrollText, Lock];

export default function Engagements() {
  return (
    <section id="secret" data-monde="clair" className="scroll-mt-16 bg-[#fafaf9] py-16 sm:scroll-mt-[72px] sm:py-20 md:py-24 lg:py-28" aria-labelledby="secret-professionnel">
      <Conteneur>
        <header className="mb-10 flex flex-col gap-4 sm:mb-12 md:mb-16">
          <Amorce>{AMORCES.secret}</Amorce>
          <Titre id="secret-professionnel">
            {SECRET.titreAvant}
            <br />
            {SECRET.titreMot}
          </Titre>
          <Chapo className="max-w-xl">{SECRET.texte}</Chapo>
        </header>
        <div className="grid grid-cols-1 overflow-hidden rounded-md border border-[#e5e5e3] bg-white sm:grid-cols-2 lg:grid-cols-3 [&>*]:border-b [&>*]:border-r [&>*]:border-[#e5e5e3] [&>*:last-child]:border-b-0 sm:[&>*:nth-child(2n)]:border-r-0 sm:[&>*:nth-last-child(-n+2)]:border-b-0 lg:[&>*:nth-child(2n)]:border-r lg:[&>*:nth-child(3n)]:border-r-0 lg:[&>*:nth-last-child(-n+3)]:border-b-0">
          {SECRET.engagements.map((e, i) => {
            const Icone = ICONES[i];
            return (
              <article key={e.titre} className="flex flex-col gap-6 p-6 sm:p-7 md:p-8">
                <Pastille>
                  <Icone className="h-4 w-4 sm:h-[18px] sm:w-[18px]" strokeWidth={1.75} aria-hidden="true" />
                </Pastille>
                <div className="flex flex-col gap-2 sm:gap-3">
                  <h3 className="text-base font-medium leading-[1.3] text-[#0f0e0d] sm:text-lg">{e.titre}</h3>
                  <p className="text-sm leading-relaxed text-[#524f49]">{e.texte}</p>
                </div>
              </article>
            );
          })}
        </div>
      </Conteneur>
    </section>
  );
}
