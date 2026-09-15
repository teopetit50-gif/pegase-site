import Link from "next/link";
import {
  CalendarDays,
  CreditCard,
  Globe,
  LogOut,
  ShieldCheck,
  Smartphone,
  UserRound,
} from "lucide-react";
import CompteTableau, {
  type LienRail,
  type SectionCompte,
  type TuileCompte,
} from "@/components/compte/CompteTableau";
import AbonnementCarte from "@/components/compte/AbonnementCarte";
import IdentiteCompte from "@/components/compte/IdentiteCompte";
import MotDePasseCarte from "@/components/compte/MotDePasseCarte";
import ProfilCarte from "@/components/compte/ProfilCarte";
import {
  etatAbonnement,
  libelleMoyenPaiement,
  paiementPertinent,
  postesTries,
  prixNombre,
  statutPaiement,
  type DemandeAbonnement,
  type DemandeCompte,
} from "@/lib/abonnement";
import {
  LIBELLES_PARCOURS,
  LIBELLES_STATUT,
  LIBELLES_STATUT_COURT,
  TEINTE_STATUT,
  TEINTE_STATUT_SITE,
  blocDateGp,
  dateHeureGp,
  dureeFormule,
  libelleFormule,
  nomAffiche,
  type Utilisateur,
} from "@/lib/compte";
import { MODELES } from "@/components/modeles/donnees";
import { POSTES, lirePeriodicite } from "@/lib/paliers";
import { LIBELLES_STATUT_SITE, dateGp, prixLisible, type LigneCommandeSite } from "@/lib/site-commande";
import { COCKPIT_URL } from "@/lib/supabase/config";

/* ══════════════════════════════════════════════════════════════════════
   CompteVue — la vue de « Mon compte », en RÉGLAGES (14/09/2026, soir)

   Demande Teo du 14/09 soir, capture à l'appui : « une fois connecté
   c'est ultra moche — ça fait un gros truc au milieu ; va chercher des
   composants sur 21st.dev et change complètement ». Le « gros truc » était
   la carte noire « Votre cockpit » posée au centre de la carte de verre
   du matin (trois colonnes, six panneaux à tuiles colorées). Teo a
   tranché entre trois formes : MENU LATÉRAL, comme les réglages
   Stripe/Vercel. La page se lit désormais de haut en bas :

     1. L'EN-TÊTE — identité (IdentiteCompte) à gauche ; à droite le badge
        d'état de l'espace client, le bouton PRINCIPAL selon l'état
        (« Ouvrir mon espace » + « Installer l'application » quand le
        compte est rattaché ; « Voir le fonctionnement » en préparation ;
        « Choisir mes postes » sans installation), et « Se déconnecter »
        en lien. C'est là que vivait le bloc noir : l'accès à l'espace est
        une ACTION, pas une section.
     2. UNE NOTE d'état, seulement quand l'espace n'est pas ouvert (en
        préparation, sans installation, ou panne de `comptes` — dite,
        jamais racontée « en préparation », revue n° 5).
     3. QUATRE TUILES de synthèse : abonnement (postes · prix, état),
        réunion d'installation (date · heure, statut), moyen de paiement,
        site catalogue. Chacune ouvre sa section.
     4. La BARRE à gauche et UNE section à droite — CompteTableau,
        composant client sur Radix Tabs, refait le 14/09 dans la nuit sur
        le « Dashboard Sidebar » que Teo a collé. Elle porte son propre
        en-tête (l'ENTREPRISE du client et sa formule, à la place du
        sélecteur d'espace de travail du modèle), deux groupes de
        sections, et un pied qui quitte la page.

        Répartition des actions, pour qu'aucune ne soit dite deux fois :
        l'en-tête de PAGE porte l'état de l'espace et le bouton principal
        qui en découle ; le PIED de la barre porte l'installation de
        l'application et la déconnexion. Le profil, lui, garde son bouton
        « Modifier le profil » dans sa propre section.

        Les sous-entrées de l'abonnement (Ma formule, Moyen de paiement,
        Mes demandes) visent trois id posés dans AbonnementCarte — et
        seulement quand le bloc visé existe : pas de moyen de paiement
        avant une réservation, pas de demandes tant qu'il n'y en a pas.

   Ce qui n'a PAS changé de contenu : l'abonnement (AbonnementCarte,
   inchangée), les rendez-vous, les commandes de site, le profil
   (ProfilCarte, inchangée : résumé replié, formulaire à la demande), le
   mot de passe (MotDePasseCarte). Les deux liens d'installation de
   l'application (app.omegaai.fr/installer, /application) vivent dans
   l'en-tête ET dans le bloc « Votre espace client » de la section
   Sécurité — la section porte aussi l'état quand l'en-tête ne montre
   qu'un bouton. La carte de verre (components/ui/glass-account-card.tsx)
   n'est plus appelée : gardée au dépôt, comme les autres orphelins.

   L'état de l'espace croise toujours deux faits (revue 02/09, n° 6) :
   une installation a-t-elle été demandée (une demande « reglage » non
   annulée), et le compte est-il rattaché (une ligne `comptes`) ? Trois
   états, plus la panne.

   AUCUNE HORLOGE ici : la tuile « réunion » montre la réunion la plus
   récente non annulée, avec son statut (confirmé, faite, reçue…), pas
   « la prochaine » — dire « prochaine » demanderait Date.now(), que ce
   rendu ne consulte pas (même règle que la carte d'abonnement). La seule
   comparaison à l'horloge (reunionDejaPassee) vient de la page, en prop.

   Composant serveur, SANS lecture de base : tout arrive en props depuis
   app/compte/page.tsx ; app/compte/apercu (développement seulement)
   rend la même vue sur un jeu fictif, pour la recette sans session.
   Les icônes du menu sont rendues ICI en éléments et passées au
   composant client : jamais une fonction (fonction-serveur-vers-
   composant-client).
   ══════════════════════════════════════════════════════════════════════ */

export type CompteVueProps = {
  utilisateur: Utilisateur;
  demandes: DemandeCompte[];
  panneDemandes: boolean;
  panneComptes: boolean;
  rattache: boolean;
  commandes: LigneCommandeSite[];
  panneCommandes: boolean;
  abonnement: DemandeCompte | null;
  demandesAbonnement: DemandeAbonnement[];
  panneDemandesAbonnement: boolean;
  reunionDejaPassee: boolean;
  /* 05/09 — le retour de Stripe : ok | plus-tard, sinon rien */
  retour: "ok" | "plus-tard" | null;
  enregistrementEnCours: boolean;
};

/* la pastille de statut — texte foncé sur fond doux, .cp-pastille
   [data-teinte] dans globals.css (bleu, vert, ambre, gris, rouge) */
function Pastille({ teinte, children }: { teinte: string; children: React.ReactNode }) {
  return (
    <span className="cp-pastille" data-teinte={teinte}>
      {children}
    </span>
  );
}

/* l'état de l'abonnement en un mot, pour la tuile (le libellé long
   d'etatAbonnement — « En service depuis le … » — reste dans la carte) */
const ETAT_COURT: Record<string, { teinte: string; texte: string }> = {
  reserve: { teinte: "bleu", texte: "Réservé" },
  en_service: { teinte: "vert", texte: "En service" },
  recu: { teinte: "ambre", texte: "Demande reçue" },
  annule: { teinte: "gris", texte: "Annulé" },
};

/* « jeu. 17 sept. » en heure de Guadeloupe — le jour court de la tuile */
function jourCourtGp(iso: string): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: "America/Guadeloupe",
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(d);
}

export default function CompteVue({
  utilisateur,
  demandes,
  panneDemandes,
  panneComptes,
  rattache,
  commandes,
  panneCommandes,
  abonnement,
  demandesAbonnement,
  panneDemandesAbonnement,
  reunionDejaPassee,
  retour,
  enregistrementEnCours,
}: CompteVueProps) {
  const aInstallation = demandes.some((d) => d.parcours === "reglage" && d.statut !== "annule");

  /* Mes rendez-vous : les réunions d'installation, la plus récente
     d'abord (ISO se trie en texte ; sans créneau → à la fin), puis les
     audits et devis dans l'ordre de la base */
  const reunions = demandes
    .filter((d) => d.parcours === "reglage")
    .sort((a, b) => (b.creneau_debut ?? "").localeCompare(a.creneau_debut ?? ""));
  const autres = demandes.filter((d) => d.parcours !== "reglage");
  const rendezVous = [...reunions, ...autres];

  const nomModele = (slug: string) => MODELES.find((m) => m.slug === slug)?.nom ?? slug;

  /* ——— l'état de l'espace client : badge, bouton principal, note ——— */
  const etatEspace: "panne" | "ouvert" | "preparation" | "sans" = panneComptes
    ? "panne"
    : rattache
      ? "ouvert"
      : aInstallation
        ? "preparation"
        : "sans";
  const badge = {
    panne: { teinte: "rouge", texte: "Accès indisponible" },
    ouvert: { teinte: "vert", texte: "Espace ouvert" },
    preparation: { teinte: "ambre", texte: "Installation en préparation" },
    sans: { teinte: "gris", texte: "Sans installation" },
  }[etatEspace];

  /* ——— les tuiles ——— */
  const postes = postesTries(abonnement?.modules);
  const etat = abonnement ? etatAbonnement(abonnement, rattache) : null;
  const mensuel = prixNombre(abonnement?.prix_mensuel_eur);
  const annuel = prixNombre(abonnement?.prix_annuel_eur);
  const periodicite = lirePeriodicite(abonnement?.periodicite);
  const prixCourt =
    mensuel == null
      ? null
      : periodicite === "annuel" && annuel != null
        ? `${Math.round(annuel)} €/an`
        : `${Math.round(mensuel)} €/mois`;
  const nomFormule =
    postes.length === POSTES.length
      ? "Tout Omega"
      : postes.length
        ? `${postes.length} poste${postes.length > 1 ? "s" : ""}`
        : "Réunion d'installation";

  const tuileAbonnement: TuileCompte =
    abonnement && etat
      ? {
          id: "abonnement",
          cible: "abonnement",
          kicker: "Abonnement",
          valeur: prixCourt ? `${nomFormule} · ${prixCourt}` : nomFormule,
          sous: (
            <>
              <Pastille teinte={ETAT_COURT[etat.code]?.teinte ?? "gris"}>
                {ETAT_COURT[etat.code]?.texte ?? etat.libelle}
              </Pastille>
              {prixCourt && periodicite === "mensuel" ? <span>sans engagement</span> : null}
            </>
          ),
        }
      : {
          id: "abonnement",
          cible: "abonnement",
          kicker: "Abonnement",
          valeur: "Aucun abonnement",
          vide: true,
          sous: "Choisissez vos postes sur la grille des tarifs",
        };

  const reunion = reunions.find((d) => d.statut !== "annule") ?? reunions[0] ?? null;
  const blocReunion = reunion?.creneau_debut ? blocDateGp(reunion.creneau_debut) : null;
  const jourReunion = reunion?.creneau_debut ? jourCourtGp(reunion.creneau_debut) : null;
  const dureeReunion = reunion ? dureeFormule(reunion.formule, reunion.duree_min) : null;
  const tuileReunion: TuileCompte = reunion
    ? {
        id: "reunion",
        cible: "rendez-vous",
        kicker: "Réunion d'installation",
        valeur:
          reunion.creneau_debut && blocReunion && jourReunion
            ? `${jourReunion} · ${blocReunion.heure}`
            : reunion.creneau_debut
              ? dateHeureGp(reunion.creneau_debut)
              : "Sans créneau",
        sous: (
          <>
            <Pastille teinte={TEINTE_STATUT[reunion.statut] ?? "gris"}>
              {LIBELLES_STATUT_COURT[reunion.statut] ?? reunion.statut}
            </Pastille>
            {reunion.creneau_debut ? (
              dureeReunion ? (
                <span>{dureeReunion}</span>
              ) : null
            ) : (
              <span>traitée par e-mail</span>
            )}
          </>
        ),
      }
    : {
        id: "reunion",
        cible: "rendez-vous",
        kicker: "Réunion d'installation",
        valeur: "Aucune réunion",
        vide: true,
        sous: "Se réserve depuis la grille des tarifs",
      };

  const paiementVisible = Boolean(abonnement && paiementPertinent(abonnement) && etat?.code !== "annule");
  const paiement = abonnement && paiementVisible ? statutPaiement(abonnement) : null;
  const moyen = abonnement?.moyen_paiement;
  const tuilePaiement: TuileCompte = !paiement
    ? {
        id: "paiement",
        cible: "abonnement",
        kicker: "Moyen de paiement",
        valeur: "—",
        vide: true,
        sous: "Après la réservation de l'installation",
      }
    : paiement === "a_enregistrer" && enregistrementEnCours
      ? {
          id: "paiement",
          cible: "abonnement",
          kicker: "Moyen de paiement",
          valeur: "Enregistrement en cours",
          sous: <Pastille teinte="ambre">Confirmation dans quelques secondes</Pastille>,
        }
      : paiement === "a_enregistrer"
        ? {
            id: "paiement",
            cible: "abonnement",
            kicker: "Moyen de paiement",
            valeur: "À enregistrer",
            sous: "Rien n'est débité avant la fin de l'installation",
          }
        : paiement === "enregistre"
          ? {
              id: "paiement",
              cible: "abonnement",
              kicker: "Moyen de paiement",
              valeur: libelleMoyenPaiement(moyen),
              sous: <Pastille teinte="vert">Enregistré</Pastille>,
            }
          : paiement === "preleve"
            ? {
                id: "paiement",
                cible: "abonnement",
                kicker: "Moyen de paiement",
                valeur: libelleMoyenPaiement(moyen),
                sous: <Pastille teinte="vert">Premier prélèvement effectué</Pastille>,
              }
            : {
                id: "paiement",
                cible: "abonnement",
                kicker: "Moyen de paiement",
                valeur: libelleMoyenPaiement(moyen),
                sous: <Pastille teinte="rouge">Paiement refusé</Pastille>,
              };

  const derniereCommande = commandes[0] ?? null;
  const tuileSite: TuileCompte = derniereCommande
    ? {
        id: "site",
        cible: "site",
        kicker: commandes.length > 1 ? "Commandes de site" : "Site catalogue",
        valeur: commandes.length > 1 ? `${commandes.length} commandes` : `Modèle ${nomModele(derniereCommande.modele)}`,
        sous: (
          <Pastille teinte={TEINTE_STATUT_SITE[derniereCommande.statut] ?? "gris"}>
            {LIBELLES_STATUT_SITE[derniereCommande.statut] ?? derniereCommande.statut}
          </Pastille>
        ),
      }
    : {
        id: "site",
        cible: "site",
        kicker: "Site catalogue",
        valeur: "Aucune commande",
        vide: true,
        sous: "990 € TTC, une fois, vingt et un modèles",
      };

  const tuiles: TuileCompte[] = [tuileAbonnement, tuileReunion, tuilePaiement, tuileSite];

  /* ——— le bloc « Votre espace client » de la section Sécurité ——— */
  const acces = {
    panne: {
      texte:
        "Impossible de vérifier votre rattachement pour le moment. Rechargez la page dans un instant. Le mode d'emploi de l'application, lui, reste lisible.",
      liens: [{ href: "/application", texte: "Voir comment ça marche", interne: true }],
    },
    ouvert: {
      texte:
        "Relances, demandes, factures : vos postes y apparaissent au fur et à mesure de leur mise en route, avec ce qui attend votre validation. Même adresse, même mot de passe.",
      liens: [
        { href: `${COCKPIT_URL}/espace`, texte: "Ouvrir mon espace", interne: false },
        { href: `${COCKPIT_URL}/installer`, texte: "Installer sur cet appareil", interne: false },
        { href: "/application", texte: "L'installer sur téléphone et ordinateur", interne: true },
      ],
    },
    preparation: {
      texte:
        "L'espace client s'ouvre dès la réunion faite : vos postes y apparaissent au fur et à mesure de leur mise en route. Il s'installera sur votre téléphone et votre ordinateur, comme une application.",
      liens: [{ href: "/application", texte: "Voir le fonctionnement", interne: true }],
    },
    sans: {
      texte:
        "Votre espace client s'ouvre après la réunion d'installation : choisissez vos postes, réservez la réunion. C'est elle qui met vos postes en route.",
      liens: [
        { href: "/tarifs", texte: "Choisir mes postes", interne: true },
        { href: "/application", texte: "Voir comment l'application s'installe", interne: true },
      ],
    },
  }[etatEspace];

  /* ——— le pied de la barre : ce qui quitte la page ———
     « Ouvrir mon espace » n'y est pas : c'est le bouton principal de
     l'en-tête, et le dire deux fois ferait une page qui se répète */
  const liens: LienRail[] = [
    ...(etatEspace === "ouvert"
      ? [
          {
            id: "installer",
            libelle: "Installer l'application",
            icone: <Smartphone size={16} strokeWidth={1.75} />,
            href: `${COCKPIT_URL}/installer`,
            externe: true,
          },
        ]
      : []),
    {
      id: "sortie",
      libelle: "Se déconnecter",
      icone: <LogOut size={16} strokeWidth={1.75} />,
      deconnexion: true,
    },
  ];

  /* l'en-tête de la barre : l'entreprise du client, sa formule.
     L'entreprise du profil d'abord, celle de la demande ensuite ; sans
     rien, le nom de la personne — le jeton doit toujours porter une
     lettre */
  const enseigne = utilisateur.entreprise || abonnement?.entreprise || nomAffiche(utilisateur);
  const formuleBarre = abonnement && prixCourt ? `${nomFormule} · ${prixCourt}` : "Sans abonnement";

  /* ——— les sections ——— */
  const sections: SectionCompte[] = [
    {
      id: "abonnement",
      libelle: "Abonnement",
      icone: <CreditCard size={16} strokeWidth={1.75} />,
      enfants: [
        ...(abonnement ? [{ id: "abo-formule", libelle: "Ma formule", ancre: "cp-abo-formule" }] : []),
        ...(paiementVisible
          ? [{ id: "abo-paiement", libelle: "Moyen de paiement", ancre: "cp-abo-paiement" }]
          : []),
        ...(demandesAbonnement.length
          ? [{ id: "abo-demandes", libelle: "Mes demandes", ancre: "cp-abo-demandes" }]
          : []),
      ],
      titre: "Mon abonnement",
      description: "Vos postes, votre formule et votre moyen de paiement.",
      contenu: (
        <>
          {/* 05/09 — le retour de Stripe, au-dessus de la carte */}
          {retour === "ok" ? (
            <p className="cp-ok mb-4" role="status">
              {enregistrementEnCours
                ? "Merci. L'enregistrement de votre moyen de paiement est en cours de confirmation. Rien ne sera débité avant la fin de l'installation."
                : "Moyen de paiement enregistré. Rien ne sera débité avant la fin de l'installation."}
            </p>
          ) : retour === "plus-tard" ? (
            <p className="cp-info mb-4" role="status">
              Vous pourrez enregistrer votre moyen de paiement plus tard, ici, depuis votre abonnement.
            </p>
          ) : null}
          {panneDemandes ? (
            <p className="rv-erreur">
              Votre abonnement ne répond pas pour le moment. Rechargez la page dans un instant.
            </p>
          ) : (
            <AbonnementCarte
              demande={abonnement}
              rattache={rattache}
              demandesAbonnement={demandesAbonnement}
              panneDemandesAbonnement={panneDemandesAbonnement}
              reunionPassee={reunionDejaPassee}
              enregistrementEnCours={enregistrementEnCours}
            />
          )}
        </>
      ),
    },
    {
      id: "rendez-vous",
      libelle: "Rendez-vous",
      icone: <CalendarDays size={16} strokeWidth={1.75} />,
      badge: rendezVous.length || undefined,
      titre: "Mes rendez-vous",
      description: "Heure de Guadeloupe.",
      contenu: panneDemandes ? (
        <p className="rv-erreur">
          Vos rendez-vous ne répondent pas pour le moment. Rechargez la page dans un instant.
        </p>
      ) : rendezVous.length === 0 ? (
        <>
          <p className="cp-texte">
            Aucun rendez-vous n&apos;est rattaché à cette adresse. La réunion d&apos;installation se
            réserve depuis la grille des tarifs&nbsp;: elle met vos postes en route et vous ouvre
            l&apos;espace client.
          </p>
          <div className="mt-4">
            <Link href="/tarifs" className="r-btn r-btn--noir">
              Réserver l&apos;installation
            </Link>
          </div>
        </>
      ) : (
        <ul>
          {rendezVous.map((d) => {
            const bloc = d.creneau_debut ? blocDateGp(d.creneau_debut) : null;
            const duree = dureeFormule(d.formule, d.duree_min);
            const court = LIBELLES_STATUT_COURT[d.statut] ?? d.statut;
            const long = LIBELLES_STATUT[d.statut];
            /* la phrase longue ne s'ajoute que si elle dit plus que le mot */
            const detail = long && long !== court ? long : null;
            return (
              <li key={d.id} className="cp-ligne cp-rdv">
                <div className={`cp-date${bloc ? "" : " cp-date--vide"}`} aria-hidden="true">
                  <div className="cp-date-jour">{bloc ? bloc.jour : "—"}</div>
                  <div className="cp-date-mois">{bloc ? bloc.mois : ""}</div>
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                    <span className="cp-secondaire cp-kicker-ligne">
                      {LIBELLES_PARCOURS[d.parcours] ?? d.parcours}
                    </span>
                    <Pastille teinte={TEINTE_STATUT[d.statut] ?? "gris"}>{court}</Pastille>
                  </div>
                  <div className="cp-texte cp-fort mt-0.5">{libelleFormule(d.formule)}</div>
                  <p className="num cp-secondaire mt-0.5">
                    {d.creneau_debut
                      ? `${dateHeureGp(d.creneau_debut)}${duree ? ` · ${duree}` : ""}`
                      : "Sans créneau, traitée par e-mail"}
                  </p>
                  {d.entreprise ? (
                    <p className="cp-secondaire mt-0.5">
                      Entreprise&nbsp;: <span className="cp-fort">{d.entreprise}</span>
                    </p>
                  ) : null}
                  {detail ? <p className="cp-secondaire mt-1">{detail}</p> : null}
                </div>
              </li>
            );
          })}
        </ul>
      ),
    },
    {
      id: "site",
      libelle: "Site",
      icone: <Globe size={16} strokeWidth={1.75} />,
      badge: commandes.length || undefined,
      titre: "Mes commandes de site",
      description: "Le site catalogue, commandé depuis la page Votre site.",
      contenu: panneCommandes ? (
        <p className="rv-erreur">
          Vos commandes ne répondent pas pour le moment. Rechargez la page dans un instant.
        </p>
      ) : commandes.length === 0 ? (
        <>
          <p className="cp-texte">
            Aucune commande de site pour l&apos;instant. Le site catalogue est à 990&nbsp;€ TTC, une
            fois&nbsp;: vingt et un modèles, contenu réécrit à votre métier.
          </p>
          <div className="mt-4">
            <Link href="/tarifs/site" className="r-btn r-btn--fil">
              Voir l&apos;offre site
            </Link>
          </div>
        </>
      ) : (
        <ul>
          {commandes.map((c) => (
            <li key={c.id} className="cp-ligne">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="cp-texte cp-fort">Modèle {nomModele(c.modele)}</div>
                  <p className="num cp-secondaire mt-0.5">Commandée le {dateGp(c.cree_le)}</p>
                  <p className="cp-secondaire mt-0.5">
                    Entreprise&nbsp;: <span className="cp-fort">{c.entreprise}</span>
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <span className="num cp-prix">
                    {prixLisible(c.prix_eur)}
                    <span className="cp-prix-unite"> TTC</span>
                  </span>
                  <Pastille teinte={TEINTE_STATUT_SITE[c.statut] ?? "gris"}>
                    {LIBELLES_STATUT_SITE[c.statut] ?? c.statut}
                  </Pastille>
                </div>
              </div>
              {c.statut === "a_payer" ? (
                /* le paiement en ligne n'existe pas encore : on le dit, on
                   n'invente pas de bouton */
                <p className="cp-secondaire mt-2">
                  Le paiement en ligne arrive&nbsp;: nous vous appelons pour régler et lancer la
                  production.
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      ),
    },
    {
      id: "profil",
      libelle: "Profil",
      icone: <UserRound size={16} strokeWidth={1.75} />,
      groupe: "Votre compte",
      titre: "Profil professionnel",
      description:
        "Il sert à vos factures et pré-remplit vos prochaines demandes. L'adresse e-mail reste l'identifiant de connexion.",
      contenu: <ProfilCarte utilisateur={utilisateur} />,
    },
    {
      id: "securite",
      libelle: "Sécurité",
      icone: <ShieldCheck size={16} strokeWidth={1.75} />,
      groupe: "Votre compte",
      titre: "Sécurité et accès",
      description: (
        <>
          Connecté avec <span className="cp-fort break-all">{utilisateur.email}</span>.
        </>
      ),
      contenu: (
        <>
          <div className="cpt-acces">
            <div className="cpt-acces-tete">
              <span className="cpt-acces-titre">Votre espace client</span>
              <Pastille teinte={badge.teinte}>{badge.texte}</Pastille>
            </div>
            <p className="cpt-acces-texte">{acces.texte}</p>
            <div className="cpt-acces-liens">
              {acces.liens.map((l) =>
                l.interne ? (
                  <Link key={l.href} href={l.href}>
                    {l.texte}
                  </Link>
                ) : (
                  <a key={l.href} href={l.href}>
                    {l.texte}
                  </a>
                ),
              )}
            </div>
          </div>
          <MotDePasseCarte email={utilisateur.email} mdpDefini={utilisateur.mdpDefini} />
          <p className="cp-secondaire mt-4">
            Ce que nous faisons de vos données, et comment les récupérer&nbsp;:{" "}
            <Link href="/vos-donnees" className="underline underline-offset-2">
              vos données
            </Link>
            .
          </p>
        </>
      ),
    },
  ];

  return (
    <div className="resa">
      <section data-monde="clair" className="r-wrap cpt-wrap" aria-labelledby="cpt-titre-page">
        {/* ——— 1. l'en-tête : identité | état + actions ——— */}
        <header className="cpt-tete" data-arrivee="titre">
          <IdentiteCompte utilisateur={utilisateur} />
          <div className="cpt-actions">
            <span className="cpt-pilule" data-teinte={badge.teinte}>
              {badge.texte}
            </span>
            {etatEspace === "ouvert" ? (
              <>
                <a href={`${COCKPIT_URL}/espace`} className="r-btn r-btn--noir">
                  Ouvrir mon espace
                </a>
                {/* 08/09 — droit sur la page d'installation de l'espace, sur
                    l'appareil où l'on est : c'est là que le bouton du
                    navigateur existe. Dès 1024 il vit dans le pied de la
                    barre ; ici il ne reste que pour la rangée mobile */}
                <a href={`${COCKPIT_URL}/installer`} className="r-btn r-btn--fil cpt-installer-mobile">
                  Installer l&apos;application
                </a>
              </>
            ) : etatEspace === "preparation" ? (
              <Link href="/application" className="r-btn r-btn--fil">
                Voir le fonctionnement
              </Link>
            ) : etatEspace === "sans" ? (
              <Link href="/tarifs" className="r-btn r-btn--noir">
                Choisir mes postes
              </Link>
            ) : null}
            {/* sous 1024 la barre n'a pas de pied : la déconnexion reste
                ici, où elle est la seule sortie de la page */}
            <form action="/auth/signout" method="post" className="cpt-sortie-forme">
              <button type="submit" className="cpt-sortie">
                Se déconnecter
              </button>
            </form>
          </div>
        </header>

        {/* ——— 2. la note d'état, seulement quand l'espace n'est pas ouvert ——— */}
        {etatEspace === "panne" ? (
          <p className="cpt-note" data-teinte="rouge" data-arrivee="chapo" role="status">
            <span>
              Votre accès à l&apos;espace client ne répond pas&nbsp;: impossible de vérifier votre
              rattachement pour le moment. Rechargez la page dans un instant.
            </span>
            <Link href="/application">Voir comment ça marche</Link>
          </p>
        ) : etatEspace === "preparation" ? (
          <p className="cpt-note" data-teinte="ambre" data-arrivee="chapo">
            <span>
              Votre installation est en préparation. L&apos;espace client s&apos;ouvre dès la réunion
              faite&nbsp;: vos postes y apparaissent au fur et à mesure de leur mise en route.
            </span>
            <Link href="/application">Voir le fonctionnement</Link>
          </p>
        ) : etatEspace === "sans" ? (
          <p className="cpt-note" data-teinte="gris" data-arrivee="chapo">
            <span>
              Votre espace client s&apos;ouvre après la réunion d&apos;installation&nbsp;: choisissez vos
              postes, réservez la réunion. C&apos;est elle qui met vos postes en route.
            </span>
            <Link href="/application">Voir comment l&apos;application s&apos;installe</Link>
          </p>
        ) : null}

        {/* ——— 3 et 4. les tuiles, puis menu | panneau ——— */}
        <CompteTableau
          sections={sections}
          tuiles={tuiles}
          liens={liens}
          enseigne={enseigne}
          formule={formuleBarre}
          defaut="abonnement"
        />
      </section>
    </div>
  );
}
