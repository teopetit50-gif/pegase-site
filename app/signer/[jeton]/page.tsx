import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import SignatureSurPlace from "@/components/espace/daliro/SignatureSurPlace";
import "@/components/espace/espace.css";

/* ══════════════════════════════════════════════════════════════════════
   /signer/<jeton> — la signature d'un avenant sur le téléphone du chef
   d'équipe (06/10/2026, session B6, b6_20)

   Page sans compte, hors index, sans referrer (le jeton est dans l'adresse) :
   le lien est préparé par le bureau (public.btp_preparer_signature), à usage
   unique. Tout se passe dans components/espace/daliro/SignatureSurPlace.tsx.
   ══════════════════════════════════════════════════════════════════════ */

export const metadata: Metadata = {
  title: "Signature d'un avenant | Omega.AI",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function PageSigner({ params }: { params: Promise<{ jeton: string }> }) {
  const { jeton } = await params;
  return (
    <PageShell>
      <div className="resa esp">
        <div className="esp-corps">
          <SignatureSurPlace jeton={jeton} />
        </div>
      </div>
    </PageShell>
  );
}
