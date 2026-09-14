import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CompteVue from "@/components/compte/CompteVue";
import PageShell from "@/components/PageShell";
import PageMotion from "@/components/PageMotion";
import { abonnementCourant, type DemandeCompte } from "@/lib/abonnement";
import type { LigneCommandeSite } from "@/lib/site-commande";

/* ══════════════════════════════════════════════════════════════════════
   /compte/apercu — la vue « Mon compte » sur un jeu FICTIF, en mode
   développement seulement (14/09/2026)

   Pourquoi : la page réelle exige une session, et la recette de la mise
   en page (une carte de verre qui doit tenir sur un écran, aux cinq
   largeurs) se rejoue sans se connecter. Cette route rend CompteVue avec
   des données inventées — personne, entreprise et dates de fiction, rien
   lu en base, rien d'écrit. Les actions de la carte d'abonnement et du
   profil tapent sur Supabase avec la session du visiteur : sans session,
   elles répondent « connexion requise », en français, et rien ne part.

   En production la route n'existe pas : notFound() dès que NODE_ENV vaut
   « production » — `next start` comme Vercel rendent un 404. Trois états
   par ?etat= : rattache (défaut — cockpit ouvert, abonnement en service),
   attente (réservé, cockpit en préparation), vide (rien de demandé).
   ══════════════════════════════════════════════════════════════════════ */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Aperçu du compte | Omega.AI",
  robots: { index: false, follow: false },
};

const ENTREPRISE = "Karayib Rénov (fiction)";

function installation(etat: "rattache" | "attente"): DemandeCompte {
  const enService = etat === "rattache";
  return {
    id: "apercu-installation",
    parcours: "reglage",
    formule: "reglage",
    statut: enService ? "honore" : "confirme",
    creneau_debut: enService ? "2026-09-03T13:00:00.000Z" : "2026-09-24T14:00:00.000Z",
    duree_min: 60,
    entreprise: ENTREPRISE,
    modules: ["cashd", "frontd", "reload"],
    prix_mensuel_eur: 89,
    periodicite: "mensuel",
    prix_annuel_eur: 890,
    client_id: enService ? "apercu-client" : null,
    cree_le: "2026-08-28T10:00:00.000Z",
    paiement_statut: "a_enregistrer",
    moyen_paiement: null,
  };
}

const AUDIT: DemandeCompte = {
  id: "apercu-audit",
  parcours: "audit",
  formule: "audit",
  statut: "a_traiter",
  creneau_debut: "2026-09-22T14:30:00.000Z",
  duree_min: 30,
  entreprise: ENTREPRISE,
  modules: null,
  prix_mensuel_eur: null,
  client_id: null,
  cree_le: "2026-09-10T08:00:00.000Z",
};

const COMMANDE: LigneCommandeSite = {
  id: "apercu-commande",
  modele: "proactiv",
  entreprise: ENTREPRISE,
  prix_eur: 990,
  statut: "a_payer",
  cree_le: "2026-09-05T15:20:00.000Z",
};

export default async function ApercuComptePage({
  searchParams,
}: {
  searchParams: Promise<{ etat?: string }>;
}) {
  if (process.env.NODE_ENV === "production") notFound();
  const { etat: brut } = await searchParams;
  const etat = brut === "attente" ? "attente" : brut === "vide" ? "vide" : "rattache";

  const demandes = etat === "vide" ? [] : [installation(etat), AUDIT];
  const rattache = etat === "rattache";

  return (
    <PageShell>
      <PageMotion />
      <CompteVue
        utilisateur={{
          id: "apercu",
          email: "marcel@karayib-renov.example",
          prenom: "Marcel",
          nom: "Bologne",
          entreprise: ENTREPRISE,
          telephone: "0690 00 00 00",
          secteur: "btp",
          commune: "Baie-Mahault",
          siret: "12345678900012",
          mdpDefini: true,
        }}
        demandes={demandes}
        panneDemandes={false}
        panneComptes={false}
        rattache={rattache}
        commandes={etat === "vide" ? [] : [COMMANDE]}
        panneCommandes={false}
        abonnement={abonnementCourant(demandes)}
        demandesAbonnement={[]}
        panneDemandesAbonnement={false}
        reunionDejaPassee={rattache}
        retour={null}
        enregistrementEnCours={false}
      />
    </PageShell>
  );
}
