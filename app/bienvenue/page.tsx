import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { metierDepuisSecteur } from "./donnees";
import { bienvenueAFaire } from "./etat";
import { Bienvenue } from "./bienvenue";
import "./bienvenue.css";

/* ══════════════════════════════════════════════════════════════════════
   /bienvenue — le premier passage d'un client dans /espace2 (07/10/2026)

   Demande Teo, captures de l'onboarding d'Attio à l'appui : « je veux
   exactement la même chose », avec les quatre écrans — l'espace (logo,
   nom), l'usage (choix en cascade : un métier change les choix du
   dessous), la messagerie, l'équipe. Une carte à deux panneaux : le
   formulaire à gauche, et à droite un aperçu de l'espace qui réagit à
   chaque réponse.

   QUAND : le contrat signé, Omega envoie au client le lien de son tableau
   de bord (lien de connexion Supabase → /auth/confirm → /espace2). À sa
   première entrée, app/espace2/layout.tsx l'envoie ici tant que son compte
   n'a pas user_metadata.bienvenue_faite ; une fois les réponses
   enregistrées, il arrive sur /espace2 et ne revoit plus la page.
   Un visiteur sans session n'est jamais envoyé ici : il voit l'exemple.

   Construit d'abord sur le cockpit (app.omegaai.fr) le même jour, puis
   retiré : Teo, « le bon tableau de bord, c'est omegaai.fr/espace2 ».

   La police est Geist, celle de /espace2. Le relevé des couleurs et les
   écarts assumés sont en tête de bienvenue.css.
   ══════════════════════════════════════════════════════════════════════ */

const geist = Geist({ subsets: ["latin"], variable: "--font-geist", display: "swap" });

export const metadata: Metadata = {
  title: "Bienvenue | Espace client Omega",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function PageBienvenue() {
  /* sans session, ou déjà fait : rien à remplir ici */
  if (!(await bienvenueAFaire())) redirect("/espace2");

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const meta = (claims?.user_metadata ?? {}) as Record<string, unknown>;

  /* Préremplissage : la fiche de l'entreprise rattachée, quand Omega l'a
     déjà posée (nom, secteur, SIREN), sinon ce que le compte porte. */
  let fiche: { nom?: string | null; secteur?: string | null; siren?: string | null } = {};
  const { data: compte } = await supabase.from("comptes").select("client_id").limit(1).maybeSingle();
  if (compte?.client_id) {
    const { data: c } = await supabase
      .from("clients")
      .select("nom, secteur, siren")
      .eq("id", compte.client_id)
      .maybeSingle();
    if (c) fiche = c;
  }
  const texte = (v: unknown) => (typeof v === "string" ? v : "");

  return (
    <div className={geist.variable}>
      <Bienvenue
        suite="/espace2"
        email={texte(claims?.email)}
        depart={{
          entreprise: fiche.nom || texte(meta.entreprise),
          siren: fiche.siren || texte(meta.siret).slice(0, 11),
          metier: metierDepuisSecteur(fiche.secteur || texte(meta.secteur)),
        }}
      />
    </div>
  );
}
