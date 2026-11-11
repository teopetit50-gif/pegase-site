import Link from "next/link";
import { UserRound } from "lucide-react";
import { Vide } from "@/components/espace2/ui";
import DonneesTeo from "@/components/espace2/teo/donnees";
import { utilisateurCourant } from "@/lib/supabase/server";
import { estAdmin } from "@/lib/omega/donnees";
import "@/components/espace2/teo/teo.css";

/* ══════════════════════════════════════════════════════════════════════
   /espace2/teo — MON ESPACE, l'espace personnel de Teo (11/11/2026)

   Teo : « tu dois me faire mon espace à moi : copier le dashboard d'espace 2
   en 1:1, la page du BTP, sauf que tout le contenu doit être pour moi — mes
   clients, mon agenda, mes conversations WhatsApp, mon mail connecté ».

   La même coquille que l'espace client, le rail réduit à ce module (comme
   l'espace « DALIRO seul »), et cinq pages qui reprennent celles de DALIRO
   référence pour référence (docs/espace-teo/README.md) :
     Vue d'ensemble  ← Linear, accueil d'équipe (components/espace2/daliro/VueEnsemble)
     Clients         ← Attio, liste People et fiche (…/Annuaire)
     Agenda          ← Cal.com, Bookings (…/Equipes)
     WhatsApp        ← Linear, Inbox (…/Appels)
     Mails           ← Plain, fils et carte centrale (…/Mails)

   La porte est celle du pilotage /omega (omega_est_admin) :
     · personne de connecté → un mot, et le lien vers le pilotage pour se
       connecter (en développement, l'exemple s'ouvre pour la recette) ;
     · connecté mais pas gérant → un mot : quel compte est ouvert, et le
       bouton qui ferme la session pour ouvrir celle du gérant ;
     · gérant → l'espace, en « Base réelle » (Gmail, Google Agenda,
       omega_contacts, WhatsApp) ou en « Données d'exemple » (le menu de
       l'organisation, en haut). Jamais indexé (app/espace2/layout.tsx).
   ══════════════════════════════════════════════════════════════════════ */

export default async function LayoutTeo({ children }: { children: React.ReactNode }) {
  const [utilisateur, admin] = await Promise.all([utilisateurCourant(), estAdmin()]);
  if (!utilisateur) {
    if (process.env.NODE_ENV !== "development") {
      return (
        <div style={{ padding: "48px 16px", maxWidth: 640, margin: "0 auto" }}>
          <Vide
            icone={<UserRound width={20} height={20} />}
            titre="Mon espace est réservé au compte gérant d'Omega"
            action={
              <Link href="/omega" className="v2-btn v2-btn--primaire">
                Se connecter depuis le pilotage
              </Link>
            }
          >
            Connectez-vous depuis le pilotage, puis revenez ici : vos clients, votre agenda, vos conversations WhatsApp et votre boîte mail.
          </Vide>
        </div>
      );
    }
  } else if (!admin) {
    /* 11/11 (soir), capture de Teo : connecté avec un compte client (celui des essais d'Espace 2), il
       tombait sur la 404 du site vitrine, sans comprendre. On le dit : quel compte est ouvert, et
       comment ouvrir le bon (le pilotage ferme la session courante et en ouvre une autre). */
    return (
      <div style={{ padding: "48px 16px", maxWidth: 640, margin: "0 auto" }}>
        <Vide
          icone={<UserRound width={20} height={20} />}
          titre="Mon espace est réservé au compte gérant d'Omega"
          action={
            <form method="post" action="/auth/signout">
              <button type="submit" className="v2-btn v2-btn--primaire">
                Fermer cette session et ouvrir celle du gérant
              </button>
            </form>
          }
        >
          Vous êtes connecté avec {utilisateur.email}, qui n&apos;est pas le compte gérant. Fermez cette session, puis connectez-vous depuis le pilotage (/omega) avec le compte gérant et revenez ici.
        </Vide>
      </div>
    );
  }
  return <DonneesTeo gerant={!!utilisateur && admin}>{children}</DonneesTeo>;
}
