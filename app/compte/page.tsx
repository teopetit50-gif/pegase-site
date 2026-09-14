import type { Metadata } from "next";
import { redirect } from "next/navigation";
import PageShell from "@/components/PageShell";
import PageMotion from "@/components/PageMotion";
import CompteVue from "@/components/compte/CompteVue";
import {
  abonnementCourant,
  reunionPassee,
  statutPaiement,
  type DemandeAbonnement,
  type DemandeCompte,
} from "@/lib/abonnement";
import type { LigneCommandeSite } from "@/lib/site-commande";
import { createClient, utilisateurCourant } from "@/lib/supabase/server";

/* ══════════════════════════════════════════════════════════════════════
   /compte — « Mon compte » (02/09/2026, repensée le 03/09)

   Ce qu'un client connecté voit sur le SITE : son abonnement, ses
   rendez-vous, ses commandes de site, son profil professionnel, son mot
   de passe — et l'accès à son cockpit.

   14/09 — TOUT SUR UN ÉCRAN (demande Teo : « elle n'est utilisable que
   quand on défile, je veux que tout soit sur une page, en largeur »).
   Cette page ne fait plus que LIRE : la session, les quatre lectures,
   la comparaison à l'horloge, le retour de Stripe — et passe tout en
   props à components/compte/CompteVue.tsx, qui porte la mise en page :
   une carte de verre (components/ui/glass-account-card.tsx) organisée
   en colonnes, trois dès 1280 px. La description des sections ci-dessous
   (03/09) reste vraie pour le CONTENU ; l'ordre et la disposition sont
   dans CompteVue. La section « L'application Omega » (08/09) n'est plus
   un panneau : ses deux liens vivent dans la carte cockpit. Séparer la
   lecture de la vue permet aussi /compte/apercu (mode développement
   seulement) : la même vue sur un jeu fictif, pour la recette sans
   session.

   03/09 — REFONTE, demande Teo (« rend plus pro, ajoute de la couleur,
   sépare les segments un par un, permet de gérer l'abonnement, modif de
   profil pro ») : la page est découpée en SECTIONS SÉPARÉES, chacune une
   carte blanche à en-tête coloré (SectionCompte — une teinte par
   segment), dans cet ordre :
     1. Mon abonnement (orange, la couleur charte) — AbonnementCarte :
        l'abonnement, c'est la demande d'installation la plus pertinente
        (abonnementCourant, lib/abonnement) ; le client la modifie ou
        l'annule lui-même tant qu'elle n'est pas finalisée, et DEMANDE un
        changement ou une résiliation ensuite (Teo traite dans le cockpit,
        le paiement n'est pas encore automatisé) ;
     2. L'application Omega (vert) — 08/09, demande des associés
        (« une page pour télécharger l'application, dans l'espace client
        et après l'achat ») : l'espace client s'installe sur l'écran
        d'accueil du téléphone depuis le 07/09 (manifeste du cockpit), et
        sur l'ordinateur (Chrome, Edge). L'installation ne se fait QUE
        depuis app.omegaai.fr — et depuis le 08/09 (seconde passe,
        décision des associés : « télécharger le cockpit sur son bureau
        ou son téléphone »), le cockpit a une page publique /installer
        avec UN bouton « Installer Omega » quand le navigateur le permet,
        les gestes Safari sinon. Rattaché : le bouton « Installer sur cet
        appareil » (→ /installer) + le lien « voir comment ça marche »
        (/application, le mode d'emploi : Android, iPhone, ordinateur) ;
        sinon on dit que ça viendra avec l'installation, et on montre déjà
        comment ; sur une panne de `comptes`, on le dit (revue n° 5) et on
        garde le lien vers le mode d'emploi ;
     3. Mes rendez-vous (bleu) — les réunions d'installation, en cartes
        condensées (bloc-date en heure de Guadeloupe, durée, pastille de
        statut), puis les audits/devis s'il y en a un jour ;
     4. Mes commandes de site (bordeaux-or, comme la carte de /commencer) ;
     5. Profil professionnel (violet) — ProfilCarte, le formulaire ;
     6. Sécurité et accès (gris) — MotDePasseCarte, inchangée.
   En tête : « Mon compte », la ligne d'identité (IdentiteCompte) et
   « Se déconnecter ». À droite, collée en desktop : « Votre cockpit » —
   qui porte aussi, depuis le 08/09 et pour un compte rattaché, le lien
   « Installer l'application » sous « Ouvrir mon cockpit » — droit sur
   app.omegaai.fr/installer, la page d'installation du cockpit (seconde
   passe du 08/09 ; un temps vers /application).

   Ce n'est PAS le cockpit — le cockpit vit sur pegase-dashboard, et il ne
   s'ouvre que lorsque Teo a cliqué « Installation finalisée » (RPC
   finaliser_installation) : c'est ce clic qui crée la ligne dans
   `comptes`. La carte de droite croise deux faits (revue 02/09, n° 6) :
   une installation a-t-elle été demandée (une demande « reglage » non
   annulée), et le compte est-il rattaché (une ligne `comptes`) ? Trois
   états : rien de demandé → « le cockpit s'ouvre après la réunion » +
   /tarifs ; demandé sans rattachement → « en préparation » ; rattaché →
   « votre cockpit est ouvert » (sans affirmer que des postes tournent :
   un gérant invité par Teo peut être rattaché sans moteur en service).

   Sources : rpc mes_demandes() (demandes où utilisateur_id = auth.uid()),
   la table comptes (RLS : ses propres rattachements), rpc
   mes_commandes_site(), et depuis le 03/09 rpc mes_demandes_abonnement()
   (table demandes_abonnement, 2026-09-03-compte-abonnement.sql). Tout
   est lu avec la session du visiteur — rien n'est lisible d'un autre
   compte. Une lecture qui échoue (grant, RLS, base indisponible) se DIT —
   on ne raconte pas « en préparation » sur une panne (revue n° 5). Seule
   tolérance : mes_demandes_abonnement absente (site déployé avant la
   migration) donne une liste vide ET le drapeau de panne à la carte, qui
   choisit quoi en dire.

   Libellés (revue n° 8) : la page s'appelle « Mon compte », comme
   l'icône du header qui y mène ; « Se déconnecter » partout.

   Server Component, force-dynamic : la page dépend des cookies et ne doit
   jamais être mise en cache. Sans session : /connexion?suite=/compte (le
   proxy fait déjà ce renvoi ; on le refait ici — le proxy n'est pas une
   garantie, voir proxy.md). Aucune date n'est calculée « maintenant » dans
   un rendu partagé serveur/navigateur : tout se formate depuis les
   instants ISO de la base. La seule comparaison à l'horloge
   (reunionPassee, ci-dessous) se fait ICI, côté serveur, et passe en prop
   à la carte d'abonnement — le serveur et le navigateur rendent la même
   chose.

   « Mes commandes de site » (02/09) : les commandes passées par le
   tunnel /site/commande. Modèle (nom du catalogue — un slug qui n'y
   serait plus s'affiche tel quel plutôt que de planter la page),
   entreprise, prix, date, et le statut du point de vue du client :
   « a_payer » se lit « Enregistrée — règlement à venir », pas « payez »
   (pas de paiement en ligne encore, Teo appelle).

   05/09 — LE MOYEN DE PAIEMENT DE L'ABONNEMENT (demande des associés).
   La carte d'abonnement porte une ligne « Moyen de paiement » (voir
   AbonnementCarte) ; Stripe ramène ici après l'enregistrement, avec
   ?paiement=ok (bandeau vert : « enregistré — rien ne sera débité avant
   la fin de l'installation ») ou ?paiement=plus-tard (bandeau neutre :
   « vous pourrez l'enregistrer plus tard ici »). Honnêteté : c'est le
   webhook du COCKPIT qui écrit paiement_statut, quelques secondes après
   le retour — si ?paiement=ok arrive avant lui, la page dit
   « enregistrement en cours » et la carte reçoit `enregistrementEnCours`
   plutôt que d'afficher « À enregistrer » à quelqu'un qui vient de le
   faire. Le paramètre est lu par searchParams (la page est déjà dynamique).
   ══════════════════════════════════════════════════════════════════════ */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Mon compte | Omega.AI",
  description:
    "Votre abonnement, vos rendez-vous, vos commandes de site, votre profil professionnel et l'accès à votre cockpit.",
  robots: { index: false, follow: false },
};

export default async function ComptePage({
  searchParams,
}: {
  searchParams: Promise<{ paiement?: string }>;
}) {
  const utilisateur = await utilisateurCourant();
  if (!utilisateur) redirect("/connexion?suite=%2Fcompte");

  /* 05/09 — le retour de Stripe : ok | plus-tard, tout autre valeur ignorée */
  const { paiement: retourPaiement } = await searchParams;
  const retour = retourPaiement === "ok" ? "ok" : retourPaiement === "plus-tard" ? "plus-tard" : null;

  const supabase = await createClient();
  const [demandesRes, comptesRes, commandesRes, abonnementRes] = await Promise.all([
    supabase.rpc("mes_demandes"),
    supabase.from("comptes").select("client_id"),
    supabase.rpc("mes_commandes_site"),
    supabase.rpc("mes_demandes_abonnement"),
  ]);
  const demandes = ((demandesRes.data ?? []) as DemandeCompte[]).slice();
  const panneDemandes = Boolean(demandesRes.error);
  const panneComptes = Boolean(comptesRes.error);
  const rattache = !panneComptes && (comptesRes.data?.length ?? 0) > 0;
  const commandes = ((commandesRes.data ?? []) as LigneCommandeSite[]).slice();
  const panneCommandes = Boolean(commandesRes.error);
  /* tolérance : voir l'en-tête — liste vide + drapeau, la carte décide */
  const demandesAbonnement = ((abonnementRes.data ?? []) as DemandeAbonnement[]).slice();
  /* PGRST202 = la fonction n'existe pas encore (site déployé avant la
     migration du 03/09) : liste vide et silence, pas un bandeau rouge
     pour tout le monde ; toute autre erreur est une vraie panne, dite */
  const panneDemandesAbonnement = Boolean(abonnementRes.error) && abonnementRes.error?.code !== "PGRST202";

  const abonnement = abonnementCourant(demandes);
  /* la seule comparaison à l'horloge de la page, ICI côté serveur (dans
     lib, comme lib/creneaux) : la carte (composant client) la reçoit en
     prop et ne consulte jamais l'heure au rendu — même garde que
     annuler_demande / modifier_installation : une réunion passée ne se
     modifie plus en ligne */
  const reunionDejaPassee = reunionPassee(abonnement);
  /* 05/09 — ?paiement=ok mais la base dit encore « à enregistrer » : le
     webhook du cockpit n'a pas fini d'écrire (quelques secondes) */
  const enregistrementEnCours =
    retour === "ok" && abonnement != null && statutPaiement(abonnement) === "a_enregistrer";

  return (
    <PageShell>
      <PageMotion />
      <CompteVue
        utilisateur={utilisateur}
        demandes={demandes}
        panneDemandes={panneDemandes}
        panneComptes={panneComptes}
        rattache={rattache}
        commandes={commandes}
        panneCommandes={panneCommandes}
        abonnement={abonnement}
        demandesAbonnement={demandesAbonnement}
        panneDemandesAbonnement={panneDemandesAbonnement}
        reunionDejaPassee={reunionDejaPassee}
        retour={retour}
        enregistrementEnCours={enregistrementEnCours}
      />
    </PageShell>
  );
}
