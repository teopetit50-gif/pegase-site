import Link from "next/link";
import "./compte.css";
import AbonnementCarte from "@/components/compte/AbonnementCarte";
import MotDePasseCarte from "@/components/compte/MotDePasseCarte";
import ProfilCarte from "@/components/compte/ProfilCarte";
import type { DemandeAbonnement, DemandeCompte } from "@/lib/abonnement";
import {
  LIBELLES_PARCOURS,
  LIBELLES_STATUT,
  LIBELLES_STATUT_COURT,
  TEINTE_STATUT,
  TEINTE_STATUT_SITE,
  blocDateGp,
  dateHeureGp,
  dureeFormule,
  initiales,
  libelleFormule,
  nomAffiche,
  type Utilisateur,
} from "@/lib/compte";
import { MODELES } from "@/components/modeles/donnees";
import { LIBELLES_STATUT_SITE, dateGp, prixLisible, type LigneCommandeSite } from "@/lib/site-commande";
import { COCKPIT_URL } from "@/lib/supabase/config";

/* ══════════════════════════════════════════════════════════════════════
   CompteVue — « Mon compte », UNE page (15/09/2026)

   Teo, après cinq formes en deux jours : « j'aime pas, y a 100 fois trop
   de trucs. Qu'est-ce qu'il faut qu'on affiche et qu'est-ce qu'il faut
   pas afficher ? car en vrai le vrai truc c'est le dashboard. »

   LA RÉPONSE, ET C'EST ELLE QUI TIENT CE FICHIER : le tableau de bord,
   c'est l'ESPACE CLIENT (app.omegaai.fr). Cette page-ci ne doit pas en
   être un second. Elle ne porte que la relation commerciale — ce qu'on
   paie, quand on est installé, qui on est — et la porte vers l'espace.
   Teo a tranché entre trois formes : UNE PAGE, SANS MENU.

   Quatre blocs, dans l'ordre de ce qu'un client vient réellement faire :

     1. L'ACCÈS. Neuf visites sur dix s'arrêtent là : l'état de l'espace
        en une phrase, et le bouton qui l'ouvre. C'est le SEUL endroit
        où cet état est dit — il l'était trois fois avant (pastille de
        l'en-tête, note d'état, bloc « Votre espace client » de la
        section Sécurité).
     2. MON ABONNEMENT (AbonnementCarte, inchangée) : postes, prix,
        moyen de paiement, changer, résilier.
     3. MES RENDEZ-VOUS, seulement s'il y en a — l'installation n'a lieu
        qu'une fois, un bloc vide n'apprendrait rien.
     4. VOTRE COMPTE : profil, mot de passe, commandes de site, données.
        Quatre choses qu'on corrige deux fois par an, donc en bas.

   CE QUI A ÉTÉ RETIRÉ le 15/09, et pourquoi — à ne pas remettre sans
   une raison qui ait changé :
   · les QUATRE TUILES de synthèse : elles répétaient mot pour mot la
     section qui se trouvait trois centimètres dessous ;
   · le MENU LATÉRAL à cinq entrées : trois de ses sections tenaient en
     trois lignes, elles n'avaient pas besoin d'une page chacune ;
   · le FIL D'ARIANE (un seul niveau), le BOUTON DE REPLI (pour une
     barre de cinq lignes) et les SIX SOUS-ENTRÉES dépliables (pour
     sauter dans une page qui tient déjà sur un écran) ;
   · le cadre pleine page et sa peau sombre : ils faisaient de cette
     page une application, ce qu'elle n'est pas.
   `CompteTableau.tsx` (le menu, les tuiles, la barre du haut) et
   `IdentiteCompte.tsx` ont été SUPPRIMÉS : laissés au dépôt, ils
   auraient importé une feuille dont leurs classes `.cpt-*` ont disparu.
   L'historique git les garde si l'une de ces formes doit revenir.

   Composant serveur, SANS lecture de base : tout arrive en props depuis
   app/compte/page.tsx, ce qui permet à app/compte/apercu (mode
   développement seulement) de rendre la même vue sur un jeu fictif.
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

/* la pastille de statut — monochrome depuis le 15/09 (Teo : « j'aime pas
   les couleurs verte et jaune ») : le poids de l'encre et un point plein
   disent l'état, la teinte ne sert plus qu'au rouge */
function Pastille({ teinte, children }: { teinte: string; children: React.ReactNode }) {
  return (
    <span className="cp-pastille" data-teinte={teinte}>
      {children}
    </span>
  );
}

/* une ligne de rendez-vous — installation, audit ou devis. Extraite le
   15/09 : elle sert au bloc « Mes rendez-vous » ET au bloc « Mon audit »
   (voir plus bas), et la dupliquer aurait fait diverger les deux. */
function LigneRdv({ d }: { d: DemandeCompte }) {
  const bloc = d.creneau_debut ? blocDateGp(d.creneau_debut) : null;
  const duree = dureeFormule(d.formule, d.duree_min);
  const court = LIBELLES_STATUT_COURT[d.statut] ?? d.statut;
  const long = LIBELLES_STATUT[d.statut];
  /* la phrase longue ne s'ajoute que si elle dit plus que le mot */
  const detail = long && long !== court ? long : null;
  return (
    <li className="cp-ligne cp-rdv">
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
        {detail ? <p className="cp-secondaire mt-1">{detail}</p> : null}
      </div>
    </li>
  );
}

/* un bloc de la page : une carte blanche à filet, un titre, un corps */
function Bloc({
  titre,
  sous,
  children,
}: {
  titre: string;
  sous?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="cp-bloc" data-arrivee="bloc">
      <header className="cp-bloc-tete">
        <h2 className="cp-bloc-titre">{titre}</h2>
        {sous ? <p className="cp-bloc-sous">{sous}</p> : null}
      </header>
      <div className="cp-bloc-corps">{children}</div>
    </section>
  );
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

  /* les réunions d'installation, la plus récente en tête (ISO se trie en
     texte ; sans créneau → à la fin) */
  const reunions = demandes
    .filter((d) => d.parcours === "reglage")
    .sort((a, b) => (b.creneau_debut ?? "").localeCompare(a.creneau_debut ?? ""));
  /* les audits et les devis, même tri */
  const audits = demandes
    .filter((d) => d.parcours !== "reglage")
    .sort((a, b) => (b.creneau_debut ?? "").localeCompare(a.creneau_debut ?? ""));

  /* ——— 15/09 : SANS ABONNEMENT, LA PAGE PARLE DE L'AUDIT ———
     Teo : « plus d'inscription libre, tout mène à l'audit — le compte
     affichera l'audit, ou un récap. » Avant, un compte sans installation
     ouvrait sur un bloc « Mon abonnement » vide et un « Choisissez vos
     postes » : le vocabulaire du prix public, servi à une direction qui
     vient seulement de faire mesurer son processus. Le deuxième bloc de
     la page devient donc « Mon audit » tant qu'il n'y a pas
     d'abonnement, et le bloc « Mes rendez-vous » ne reprend pas les
     audits qui y sont déjà (on ne répète pas — c'est ce qui a coûté les
     quatre tuiles le 15/09 au matin). */
  const blocAudit = abonnement == null;
  const rendezVous = blocAudit ? reunions : [...reunions, ...audits];

  const nomModele = (slug: string) => MODELES.find((m) => m.slug === slug)?.nom ?? slug;

  /* ——— l'état de l'espace : deux faits croisés (revue 02/09, n° 6) ———
     une installation a-t-elle été demandée, et le compte est-il rattaché ?
     Trois états, plus la panne — dite, jamais racontée « en préparation »
     (revue n° 5). C'est le SEUL endroit de la page où il est dit. */
  const etatEspace: "panne" | "ouvert" | "preparation" | "audit" | "sans" = panneComptes
    ? "panne"
    : rattache
      ? "ouvert"
      : aInstallation
        ? "preparation"
        : audits.length
          ? "audit"
          : "sans";

  const acces = {
    panne: {
      titre: "Votre accès à l'espace client ne répond pas.",
      texte:
        "Impossible de vérifier votre rattachement pour le moment. Rechargez la page dans un instant.",
    },
    ouvert: {
      titre: "Votre espace client est ouvert.",
      texte:
        "Relances, demandes, factures : vos postes y apparaissent au fur et à mesure de leur mise en route, avec ce qui attend votre validation. Même adresse, même mot de passe.",
    },
    preparation: {
      titre: "Votre installation est en préparation.",
      texte:
        "L'espace client s'ouvre dès la réunion faite : vos postes y apparaissent au fur et à mesure de leur mise en route.",
    },
    /* 15/09 — « sans » se dédouble : avec un audit au dossier, on ne
       renvoie pas quelqu'un sur la grille des postes comme s'il n'avait
       rien fait ; sans audit, c'est LUI la première marche, pas les
       tarifs. */
    audit: {
      titre: "Votre espace client s'ouvre après l'installation.",
      texte:
        "Votre audit est ci-dessous. C'est lui qui dit ce qu'il y a à mettre en route ; l'installation suit, et c'est elle qui ouvre votre espace.",
    },
    sans: {
      titre: "Votre compte est ouvert, et il n'y a encore rien dedans.",
      texte:
        "L'audit est la première marche : trente minutes pour mesurer ce que votre processus le plus coûteux vous coûte vraiment. Il est gratuit et sans engagement.",
    },
  }[etatEspace];

  const nom = nomAffiche(utilisateur);
  const aNom = nom !== utilisateur.email;

  return (
    <div className="resa">
      <section data-monde="clair" className="r-wrap cp-page" aria-labelledby="cp-titre-page">
        {/* ——— l'en-tête : qui je suis, et la sortie ——— */}
        <header className="cp-tete" data-arrivee="titre">
          <span className="cp-avatar" aria-hidden="true">
            {initiales(utilisateur)}
          </span>
          <div className="min-w-0 flex-1">
            <h1 id="cp-titre-page" className="cp-titre-page">
              Mon compte
            </h1>
            <p className="cp-tete-detail">
              {aNom ? nom : "Profil à compléter"}
              {utilisateur.entreprise ? (
                <>
                  <span aria-hidden="true"> · </span>
                  {utilisateur.entreprise}
                </>
              ) : null}
              <span aria-hidden="true"> · </span>
              <span className="break-all">{utilisateur.email}</span>
            </p>
          </div>
          <form action="/auth/signout" method="post" className="shrink-0">
            <button type="submit" className="cp-sortie">
              Se déconnecter
            </button>
          </form>
        </header>

        {/* ——— 1. l'accès : la raison d'être de la page ——— */}
        <section className="cp-acces" data-arrivee="bloc">
          <h2 className="cp-acces-titre">{acces.titre}</h2>
          <p className="cp-acces-texte">{acces.texte}</p>
          <div className="cp-acces-actions">
            {etatEspace === "ouvert" ? (
              <>
                <a href={`${COCKPIT_URL}/espace`} className="r-btn r-btn--noir">
                  Ouvrir mon espace
                </a>
                {/* 08/09 — droit sur la page d'installation de l'espace, sur
                    l'appareil où l'on est : c'est là que le bouton du
                    navigateur existe */}
                <a href={`${COCKPIT_URL}/installer`} className="r-btn r-btn--fil">
                  Installer l&apos;application
                </a>
              </>
            ) : etatEspace === "sans" ? (
              /* 15/09 — c'était « Choisir mes postes » → /tarifs. La grille
                 reste accessible (elle est dans le bloc « Mon audit » juste
                 dessous) ; la porte principale, elle, est l'audit. */
              <>
                <Link href="/reserver-un-audit" className="r-btn r-btn--noir">
                  Réserver mon audit
                </Link>
                {/* la grille reste à un clic : elle ne disparaît pas du
                    compte, elle passe seulement après l'audit */}
                <Link href="/tarifs" className="r-btn r-btn--fil">
                  Voir les postes et les tarifs
                </Link>
              </>
            ) : null}
            <Link href="/application" className="cp-lien">
              {etatEspace === "ouvert"
                ? "L'installer sur téléphone et ordinateur"
                : "Voir le fonctionnement"}
            </Link>
          </div>
        </section>

        {/* ——— 2 bis. mon audit — tant qu'il n'y a pas d'abonnement ———
            15/09 : c'est LE bloc que voit un compte neuf, à la place d'une
            carte d'abonnement vide (voir `blocAudit` plus haut). Sans
            aucun rendez-vous il ne s'affiche PAS : le bloc d'accès, trois
            centimètres au-dessus, porte déjà la même phrase et le même
            bouton — même règle que « Mes rendez-vous ». */}
        {blocAudit && audits.length ? (
          <Bloc
            titre="Mon audit"
            sous="Ce qui a été réservé, et ce qui suit. Heure de Guadeloupe."
          >
            {panneDemandes ? (
              <p className="rv-erreur">
                Vos rendez-vous ne répondent pas pour le moment. Rechargez la page dans un
                instant.
              </p>
            ) : (
              <>
                <ul>
                  {audits.map((d) => (
                    <LigneRdv key={d.id} d={d} />
                  ))}
                </ul>
                {/* ce qui vient APRÈS l'audit : la seule question que se
                    pose quelqu'un qui revient ici entre les deux */}
                <p className="cp-secondaire mt-4 max-w-[62ch]">
                  À l&apos;issue de l&apos;audit, vous recevez ce qui a été mesuré et ce
                  qu&apos;il y a à mettre en route. L&apos;installation se réserve ensuite, et
                  c&apos;est elle qui ouvre votre espace client.
                </p>
                <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
                  <Link href="/tarifs" className="r-btn r-btn--fil">
                    Voir les postes et les tarifs
                  </Link>
                  <Link href="/reserver-un-audit" className="cp-lien">
                    Réserver un autre format
                  </Link>
                </div>
              </>
            )}
          </Bloc>
        ) : null}

        {/* ——— 2. mon abonnement — dès qu'il y en a un ——— */}
        {blocAudit ? null : (
        <Bloc titre="Mon abonnement" sous="Vos postes, votre formule et votre moyen de paiement.">
          {/* 05/09 — le retour de Stripe, au-dessus de la carte */}
          {retour === "ok" ? (
            <p className="cp-ok mb-4" role="status">
              {enregistrementEnCours
                ? "Merci. L'enregistrement de votre moyen de paiement est en cours de confirmation. Rien ne sera débité avant la fin de l'installation."
                : "Moyen de paiement enregistré. Rien ne sera débité avant la fin de l'installation."}
            </p>
          ) : retour === "plus-tard" ? (
            <p className="cp-info mb-4" role="status">
              Vous pourrez enregistrer votre moyen de paiement plus tard, ici, depuis votre
              abonnement.
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
        </Bloc>
        )}

        {/* ——— 3. mes rendez-vous, seulement s'il y en a ———
            l'installation n'a lieu qu'une fois : un bloc « aucun rendez-vous »
            n'apprendrait rien, et la porte vers la réservation est déjà dans
            le bloc d'accès et dans la carte d'abonnement.
            15/09 — sans abonnement, les audits sont déjà dans le bloc
            « Mon audit » : cette liste ne porte alors que les installations
            (une annulée, par exemple), et disparaît le plus souvent. */}
        {!panneDemandes && rendezVous.length ? (
          <Bloc titre="Mes rendez-vous" sous="Heure de Guadeloupe.">
            <ul>
              {rendezVous.map((d) => (
                <LigneRdv key={d.id} d={d} />
              ))}
            </ul>
          </Bloc>
        ) : null}

        {/* ——— 4. votre compte : ce qu'on corrige deux fois par an ——— */}
        <Bloc titre="Votre compte" sous="Vos coordonnées, votre mot de passe et vos commandes.">
          <div className="cp-sous-bloc">
            <h3 className="cp-sous-titre">Profil professionnel</h3>
            <ProfilCarte utilisateur={utilisateur} />
          </div>

          <div className="cp-sous-bloc">
            <h3 className="cp-sous-titre">Mot de passe</h3>
            <MotDePasseCarte email={utilisateur.email} mdpDefini={utilisateur.mdpDefini} />
          </div>

          <div className="cp-sous-bloc">
            <h3 className="cp-sous-titre">Commandes de site</h3>
            {panneCommandes ? (
              <p className="rv-erreur">
                Vos commandes ne répondent pas pour le moment. Rechargez la page dans un instant.
              </p>
            ) : commandes.length === 0 ? (
              <p className="cp-secondaire">
                Aucune commande. Le site catalogue est à 990&nbsp;€ TTC, une fois&nbsp;:{" "}
                <Link href="/tarifs/site" className="cp-lien-inline">
                  voir l&apos;offre
                </Link>
                .
              </p>
            ) : (
              <ul>
                {commandes.map((c) => (
                  <li key={c.id} className="cp-ligne">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="cp-texte cp-fort">Modèle {nomModele(c.modele)}</div>
                        <p className="num cp-secondaire mt-0.5">Commandée le {dateGp(c.cree_le)}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
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
                      /* le paiement en ligne n'existe pas encore : on le dit,
                         on n'invente pas de bouton */
                      <p className="cp-secondaire mt-2">
                        Le paiement en ligne arrive&nbsp;: nous vous appelons pour régler et lancer
                        la production.
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="cp-sous-bloc">
            <h3 className="cp-sous-titre">Vos données</h3>
            <p className="cp-secondaire">
              Ce que nous faisons de vos données, et comment les récupérer&nbsp;:{" "}
              <Link href="/vos-donnees" className="cp-lien-inline">
                vos données
              </Link>
              .
            </p>
          </div>
        </Bloc>
      </section>
    </div>
  );
}
