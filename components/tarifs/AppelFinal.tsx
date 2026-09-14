import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { lienContact } from "@/lib/reservation";

/* ══════════════════════════════════════════════════════════════════════
   AppelFinal — la carte sombre qui ferme /tarifs (14/09/2026)

   Reprise de `call-to-action` de @mokshithgujjeti (21st.dev) : une carte
   noire encadrée d'un filet blanc dilué, un trait structurel en tête, un
   titre serré, un chapô gris, deux boutons (plein blanc / filet), puis un
   petit bloc bordé en pied — chez l'auteur, une commande d'installation
   à copier.

   Remplace le bloc centré sans cadre (titre, paragraphe, bouton, deux
   notes) qui flottait sur le gris de la page : rien ne le tenait, et la
   voie WhatsApp comme la mention de l'autre porte se lisaient en 12 px.

   Écarts avec l'original :

   1. La SECTION n'est plus noire : seule la carte l'est. La page a déjà sa
      bande sombre (Chèque TIC) ; une seconde bande pleine largeur à 300 px
      d'écart ferait deux fois le même geste. La carte noire sur le gris de
      `.resa` garde le contraste sans doubler la bande.
   2. Le bloc « npm create … » à copier devient la mention de l'AUTRE PORTE
      (audit pour les structures où plusieurs services valident) — même
      gabarit, même filet, un lien à la place du bouton copier. Plus de
      `useState`, donc composant serveur.
   3. Les boutons sont ceux du site (`r-btn`), pas ceux du bloc : le plein
      blanc existe (`r-btn--blanc`), le filet blanc sur fond noir n'existait
      pas et est écrit en utilitaires ici — pas dans globals.css, que
      d'autres sessions éditent.
   4. `cn()` de `@/lib/utils` n'existe pas ici et n'était pas utilisé.
   5. (14/09) Le second bouton ouvrait WhatsApp, numéro affiché dès `sm`.
      WhatsApp n'est plus une porte du site (lib/reservation.ts) : il mène
      au formulaire du service client, sans numéro.

   Les textes sont ceux de la page (28/08, 05/09) — rien de réécrit.
   ══════════════════════════════════════════════════════════════════════ */

export default function AppelFinal() {
  return (
    <div className="r-wrap py-16 sm:py-20">
      <div
        data-reveal
        className="relative mx-auto flex w-full max-w-5xl flex-col items-center overflow-hidden rounded-2xl border border-white/[0.12] bg-[#050505] px-6 py-16 text-center sm:px-16 sm:py-24"
      >
        {/* le trait structurel en tête */}
        <div aria-hidden className="absolute left-0 top-0 h-px w-full bg-white/[0.15]" />

        <h2 className="max-w-2xl text-balance font-[family-name:var(--font-jakarta)] text-[34px] font-semibold leading-[1.1] tracking-[-0.03em] text-white sm:text-5xl md:text-[56px]">
          Réservez l&apos;installation en deux minutes
        </h2>

        <p className="mx-auto mt-6 max-w-xl text-balance text-[15px] leading-relaxed text-[#a1a1aa] sm:text-[17px]">
          Vous choisissez vos postes, vous réservez la réunion d&apos;installation en ligne,
          vous enregistrez votre moyen de paiement — et le système démarre sous votre œil.
          Rien n&apos;est débité avant la fin de l&apos;installation&nbsp;: le premier
          prélèvement part le jour où vos modules sont en service.
        </p>

        <div className="mt-10 flex w-full max-w-md flex-col gap-3 sm:w-auto sm:max-w-none sm:flex-row sm:items-center sm:justify-center">
          <a href="#grille" className="r-btn r-btn--blanc w-full sm:w-auto">
            Choisir mes postes
            <ArrowRight aria-hidden className="size-4" />
          </a>
          <a
            href={lienContact("avant")}
            className="r-btn w-full border border-white/[0.12] bg-transparent text-white transition-colors hover:bg-white/[0.06] sm:w-auto"
          >
            Nous écrire
          </a>
        </div>

        {/* la mention discrète de l'autre porte (28/08) : pour qui s'est
            trompé d'aiguillage, sans re-poser deux portes ici — symétrique
            de celle qui clôt /reserver-un-audit */}
        <div className="mt-12 flex w-full max-w-xl flex-col items-center gap-3 rounded-lg border border-white/[0.08] bg-black px-4 py-3 text-left transition-colors hover:border-white/[0.15] sm:flex-row sm:justify-between">
          <p className="text-[13px] leading-5 text-[#a1a1aa]">
            Plusieurs services se partagent le travail chez vous&nbsp;? Cette grille
            n&apos;est pas votre porte&nbsp;: votre prix sort d&apos;un audit.
          </p>
          <Link
            href="/reserver-un-audit"
            className="inline-flex shrink-0 items-center gap-1.5 text-[13px] font-medium text-white underline-offset-4 hover:underline"
          >
            Réserver un échange
            <ArrowRight aria-hidden className="size-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
