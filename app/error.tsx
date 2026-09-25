"use client";

import Link from "next/link";
import { useEffect } from "react";

/* ══════════════════════════════════════════════════════════════════════
   Page d'erreur du site (25/09/2026)

   Audit sécurité du 25/09 : le site n'avait qu'une page 404. Une panne
   pendant l'affichage d'une page (base injoignable, bug) montrait l'écran
   générique de Next, en anglais et sans lien. Ici : une phrase en
   français, « Réessayer » (retry() recharge le segment en redemandant ses
   données — convention de cette version de Next, voir
   node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/error.md)
   et le retour à l'accueil. Même habillage que app/not-found.tsx.

   La référence affichée (error.digest) est celle des journaux Vercel :
   un client qui nous l'envoie nous mène droit à l'erreur. Le message
   technique, lui, n'est jamais montré — Next le masque déjà pour les
   erreurs venues du serveur.

   Cette page couvre tout ce qui est SOUS la mise en page racine. Une
   panne de la mise en page elle-même passe par app/global-error.tsx.
   ══════════════════════════════════════════════════════════════════════ */

export default function ErreurPage({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error("[page] erreur d'affichage", error.digest ?? error.message);
  }, [error]);

  return (
    <section className="px-6 py-28 text-center sm:py-40">
      <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-ink/40">
        Incident
      </p>
      <h1 className="mt-4 text-[32px] font-bold leading-[1.08] tracking-[-0.025em] sm:text-[44px]">
        Cette page n&apos;a pas pu s&apos;afficher.
      </h1>
      <p className="mx-auto mt-4 max-w-[460px] text-base leading-relaxed opacity-70">
        L&apos;incident vient de chez nous, pas de chez vous. Réessayez : le plus
        souvent, cela suffit. Sinon, écrivez-nous à contact@omegaai.fr.
      </p>
      <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => retry()}
          className="rounded-[10px] bg-[#2e2e2e] px-[25px] py-[14px] text-[15px] leading-none text-white transition-colors hover:bg-[#3f3f46]"
        >
          Réessayer
        </button>
        <Link
          href="/"
          className="rounded-[10px] border border-white/25 px-[25px] py-[14px] text-[15px] leading-none text-white transition-colors hover:bg-white/10"
        >
          Retour à l&apos;accueil
        </Link>
      </div>
      {error.digest ? (
        <p className="mt-10 font-mono text-[12px] text-ink/40">Référence : {error.digest}</p>
      ) : null}
    </section>
  );
}
