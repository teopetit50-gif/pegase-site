import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Ecosysteme from "@/components/espace3/base/ecosysteme/Ecosysteme";
import { utilisateurCourant } from "@/lib/supabase/server";
import { estAdmin } from "@/lib/omega/donnees";
import "@/components/espace3/base/ecosysteme/ecosysteme.css";

/* ══════════════════════════════════════════════════════════════════════
   /espace3/ecosysteme — l'écosystème, pour le compte gérant d'Omega
   (18/10/2026)

   Quelle promesse du site est tenue par quel mécanisme, à quel niveau de
   preuve, et ce qui manque sinon : moteur par moteur, puis le socle. Les
   données sont dans lib/ecosysteme.ts, rien n'est lu en base.

   La porte est celle du pilotage /omega (omega_est_admin) :
     · personne de connecté → un mot, et le lien vers le pilotage ;
     · connecté mais pas admin → page introuvable ;
     · admin → la page.
   En développement seulement, sans personne de connecté, la page s'ouvre
   pour la recette (outils/recette-ecosysteme.mjs). Jamais indexée.
   ══════════════════════════════════════════════════════════════════════ */

export const metadata: Metadata = {
  title: "Écosystème",
  description: "Quelle promesse du site est tenue par quel mécanisme, à quel niveau de preuve, et ce qui manque.",
  robots: { index: false, follow: false },
};

export default async function PageEcosysteme() {
  const [utilisateur, admin] = await Promise.all([utilisateurCourant(), estAdmin()]);
  if (!utilisateur) {
    if (process.env.NODE_ENV === "development") return <Ecosysteme />;
    return (
      <div className="v2-page v2-arrivee eco">
        <h1 className="v2-sr">Écosystème</h1>
        <div className="eco-carte eco-porte">
          <strong>Cette page est réservée au compte gérant d&apos;Omega.</strong>
          <p>Connectez-vous depuis le pilotage, puis revenez ici.</p>
          <Link href="/omega" className="v2-btn v2-btn--petit">
            Ouvrir le pilotage
          </Link>
        </div>
      </div>
    );
  }
  if (!admin) notFound();
  return <Ecosysteme />;
}
