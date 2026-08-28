import Link from "next/link";
import PageShell from "@/components/PageShell";

export default function NotFound() {
  return (
    <PageShell>
      <section className="px-6 py-28 text-center sm:py-40">
        <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-ink/40">
          Erreur 404
        </p>
        <h1 className="mt-4 text-[32px] font-bold leading-[1.08] tracking-[-0.025em] sm:text-[44px]">
          Cette page n&apos;existe pas.
        </h1>
        <p className="mx-auto mt-4 max-w-[460px] text-base leading-relaxed opacity-70">
          L&apos;adresse a peut-être changé : le site a été réorganisé cet été.
          Tout ce qui existe se retrouve depuis l&apos;accueil.
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="rounded-[10px] bg-[#2e2e2e] px-[25px] py-[14px] text-[15px] leading-none text-white transition-colors hover:bg-[#3f3f46]"
          >
            Retour à l&apos;accueil
          </Link>
          <Link
            href="/tarifs"
            className="rounded-[10px] border border-black/15 px-[25px] py-[14px] text-[15px] leading-none transition-colors hover:bg-black/5"
          >
            Commencer
          </Link>
        </div>
      </section>
    </PageShell>
  );
}
