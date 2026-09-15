import Link from "next/link";
import "./compte.css";
import AbonnementCarte from "@/components/compte/AbonnementCarte";
import CompteCoque, { type OngletCompte } from "@/components/compte/CompteCoque";
import MotDePasseCarte from "@/components/compte/MotDePasseCarte";
import ProfilCarte from "@/components/compte/ProfilCarte";
import { statutPaiement, type DemandeAbonnement, type DemandeCompte } from "@/lib/abonnement";
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
   CompteVue — ce que « Mon compte » affiche (15/09/2026, troisième forme)

   L'HISTOIRE, parce qu'elle explique la forme actuelle et évite d'en
   refaire un tour :
     · 14/09 — une carte de verre, tout sur un écran, en largeur.
     · 15/09 matin — Teo : « y a 100 fois trop de trucs, le vrai truc
       c'est le dashboard » → une page sans menu, quatre blocs empilés.
       Le tableau de bord, c'est l'ESPACE CLIENT ; cette page ne porte que
       la relation commerciale. ÇA N'A PAS CHANGÉ.
     · 15/09 midi — « en large, pas long » → deux colonnes.
     · 15/09 après-midi — « c'est toujours aussi long, c'est toujours pas
       pleine page, c'est encore amateur — utilise de vrais composants. »

   D'où la forme d'aujourd'hui : un ÉCRAN, pas une page. La coque
   (CompteCoque) est le gabarit `dashboard-with-collapsible-sidebar` de
   21st.dev ; ce fichier-ci ne décide plus que du CONTENU, et le distribue
   en quatre onglets — un seul panneau à l'écran, donc plus rien à
   défiler :

     1. APERÇU — quatre tuiles de faits (l'espace, l'abonnement, le
        prochain rendez-vous, le règlement), puis l'accès à l'espace et
        les rendez-vous. Neuf visites sur dix s'arrêtent là.
     2. MON ABONNEMENT — ou MON AUDIT tant qu'il n'y a pas d'abonnement :
        sans lui, la carte d'abonnement est un cadre vide et un
        « choisissez vos postes » servi à quelqu'un qui vient de faire
        mesurer son processus.
     3. PROFIL — ProfilCarte (résumé + modale).
     4. SÉCURITÉ ET COMMANDES — mot de passe, commandes de site, données.

   LES QUATRE TUILES NE PORTENT AUCUN CHIFFRE INVENTÉ. Le gabarit affiche
   des « +12 % ce mois-ci » ; ici chaque valeur vient de la base (postes,
   prix, créneau, statut de paiement) ou dit « Aucun ». Un chiffre
   décoratif sur le compte d'un client est un mensonge.

   Composant SERVEUR, sans lecture de base : tout arrive en props depuis
   app/compte/page.tsx, ce qui permet à app/compte/apercu (mode
   développement seulement) de rendre le même écran sur un jeu fictif.
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

/* une ligne de rendez-vous — installation, audit ou devis */
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

/* un panneau de l'écran : carte blanche à filet, un titre, un corps */
function Panneau({
  titre,
  sous,
  children,
}: {
  titre: string;
  sous?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="cpt-panneau">
      <header className="cpt-panneau-tete">
        <h2 className="cpt-panneau-titre">{titre}</h2>
        {sous ? <p className="cpt-panneau-sous">{sous}</p> : null}
      </header>
      <div className="cpt-panneau-corps">{children}</div>
    </section>
  );
}

/* une tuile de fait : icône, étiquette, valeur, une ligne de détail */
function Tuile({
  etiquette,
  valeur,
  detail,
  icone,
}: {
  etiquette: string;
  valeur: string;
  detail: string;
  icone: React.ReactNode;
}) {
  return (
    <div className="cpt-tuile">
      <div className="cpt-tuile-tete">
        <span className="cpt-tuile-icone" aria-hidden="true">
          {icone}
        </span>
      </div>
      <p className="cpt-tuile-etiquette">{etiquette}</p>
      <p className="cpt-tuile-valeur">{valeur}</p>
      <p className="cpt-tuile-detail">{detail}</p>
    </div>
  );
}

/* Les quatre icônes des tuiles, en SVG écrit ici : ce fichier est un
   composant SERVEUR, et lucide-react y importerait 400 ko de modules pour
   quatre traits. La coque, elle, est cliente et les prend de lucide. */
const IC = {
  espace: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  ),
  postes: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  ),
  rdv: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M8 2v4M16 2v4M3 10h18" />
    </svg>
  ),
  reglement: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
    </svg>
  ),
} as const;

const LIBELLES_PAIEMENT: Record<string, string> = {
  a_enregistrer: "À enregistrer",
  enregistre: "Enregistré",
  preleve: "Prélevé",
  echec: "Refusé",
};

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
  const rendezVous = [...reunions, ...audits];
  /* Le rendez-vous montré en tuile est le plus RÉCENT qui ait un créneau,
     pas « le prochain » : la page ne consulte l'horloge qu'une seule fois,
     côté serveur (reunionDejaPassee), et un « prochain » calculé au rendu
     donnerait deux réponses différentes sur le serveur et dans le
     navigateur. Le statut de la ligne dit le reste. */
  const dernierCreneau = rendezVous.find((d) => d.creneau_debut) ?? null;

  /* sans abonnement, l'écran parle d'audit — décision du 15/09 */
  const modeAudit = abonnement == null;

  /* ——— l'état de l'espace : deux faits croisés (revue 02/09, n° 6) ——— */
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
      tuile: "Ne répond pas",
      tuileDetail: "Rechargez la page",
    },
    ouvert: {
      titre: "Votre espace client est ouvert.",
      texte:
        "Relances, demandes, factures : vos postes y apparaissent au fur et à mesure de leur mise en route, avec ce qui attend votre validation. Même adresse, même mot de passe.",
      tuile: "Ouvert",
      tuileDetail: "Même adresse, même mot de passe",
    },
    preparation: {
      titre: "Votre installation est en préparation.",
      texte:
        "L'espace client s'ouvre dès la réunion faite : vos postes y apparaissent au fur et à mesure de leur mise en route.",
      tuile: "En préparation",
      tuileDetail: "Ouvert dès la réunion faite",
    },
    audit: {
      titre: "Votre espace client s'ouvre après l'installation.",
      texte:
        "Votre audit est enregistré. C'est lui qui dit ce qu'il y a à mettre en route ; l'installation suit, et c'est elle qui ouvre votre espace.",
      tuile: "Après l'installation",
      tuileDetail: "L'audit d'abord, l'installation ensuite",
    },
    sans: {
      titre: "Votre compte est ouvert, et il n'y a encore rien dedans.",
      texte:
        "L'audit est la première marche : trente minutes pour mesurer ce que votre processus le plus coûteux vous coûte vraiment. Il est gratuit et sans engagement.",
      tuile: "Pas encore",
      tuileDetail: "Il s'ouvre après l'installation",
    },
  }[etatEspace];

  const nom = nomAffiche(utilisateur);
  const aNom = nom !== utilisateur.email;

  /* ——— les quatre tuiles ——— */
  const nbPostes = abonnement?.modules?.length ?? 0;
  const prix = abonnement?.prix_mensuel_eur ?? null;
  const blocDernier = dernierCreneau?.creneau_debut
    ? blocDateGp(dernierCreneau.creneau_debut)
    : null;
  const paiement = abonnement ? statutPaiement(abonnement) : null;

  const tuiles = (
    <div className="cpt-tuiles">
      <Tuile
        icone={IC.espace}
        etiquette="Espace client"
        valeur={acces.tuile}
        detail={acces.tuileDetail}
      />
      <Tuile
        icone={IC.postes}
        etiquette="Abonnement"
        valeur={
          panneDemandes
            ? "—"
            : abonnement
              ? `${nbPostes || 1} poste${(nbPostes || 1) > 1 ? "s" : ""}`
              : "Aucun"
        }
        detail={
          panneDemandes
            ? "Ne répond pas pour le moment"
            : abonnement
              ? prix
                ? `${prix} € par mois, sans engagement`
                : "Formule en cours de calcul"
              : "Les postes se choisissent sur la grille"
        }
      />
      <Tuile
        icone={IC.rdv}
        etiquette="Rendez-vous"
        valeur={blocDernier ? `${blocDernier.jour} ${blocDernier.mois.toLowerCase()}` : "Aucun"}
        detail={
          dernierCreneau?.creneau_debut
            ? `${libelleFormule(dernierCreneau.formule)} · heure de Guadeloupe`
            : "Aucun créneau réservé"
        }
      />
      <Tuile
        icone={IC.reglement}
        etiquette={abonnement ? "Règlement" : "Commandes de site"}
        valeur={
          abonnement
            ? enregistrementEnCours
              ? "En cours"
              : (LIBELLES_PAIEMENT[paiement ?? ""] ?? "—")
            : panneCommandes
              ? "—"
              : String(commandes.length)
        }
        detail={
          abonnement
            ? "Carte ou prélèvement SEPA, rien avant l'installation"
            : commandes.length
              ? "Site vitrine, réglé une fois"
              : "Aucune commande de site"
        }
      />
    </div>
  );

  /* ——— le panneau des commandes, appelé par l'onglet Sécurité ——— */
  const panneauCommandes = (
    <Panneau titre="Commandes de site" sous="Vos commandes de site vitrine, et vos données.">
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
                  <div className="cp-texte cp-fort">
                    Modèle {MODELES.find((m) => m.slug === c.modele)?.nom ?? c.modele}
                  </div>
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
      )}
      <p className="cp-secondaire mt-5 border-t border-[var(--r-filet)] pt-4">
        Ce que nous faisons de vos données, et comment les récupérer&nbsp;:{" "}
        <Link href="/vos-donnees" className="cp-lien-inline">
          vos données
        </Link>
        .
      </p>
    </Panneau>
  );

  const onglets: OngletCompte[] = [
    {
      cle: "apercu",
      libelle: "Aperçu",
      titre: utilisateur.prenom ? `Bonjour ${utilisateur.prenom}` : "Mon compte",
      sous: "Votre accès, votre abonnement et vos rendez-vous — d'un seul coup d'œil.",
      actions:
        etatEspace === "ouvert" ? (
          <>
            <a href={`${COCKPIT_URL}/espace`} className="r-btn r-btn--noir">
              Ouvrir mon espace
            </a>
            <a href={`${COCKPIT_URL}/installer`} className="r-btn r-btn--fil">
              Installer l&apos;application
            </a>
          </>
        ) : etatEspace === "sans" ? (
          <>
            <Link href="/reserver-un-audit" className="r-btn r-btn--noir">
              Réserver mon audit
            </Link>
            <Link href="/tarifs" className="r-btn r-btn--fil">
              Voir les postes et les tarifs
            </Link>
          </>
        ) : null,
      contenu: (
        <>
          {tuiles}
          <div className="cpt-panneaux" data-colonnes="deux">
            <Panneau titre="Votre accès" sous="Le seul endroit où cet état est dit.">
              <p className="cp-texte cp-fort">{acces.titre}</p>
              <p className="cp-secondaire mt-2 max-w-[68ch]">{acces.texte}</p>
              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3">
                {etatEspace === "ouvert" ? (
                  <a href={`${COCKPIT_URL}/espace`} className="r-btn r-btn--noir">
                    Ouvrir mon espace
                  </a>
                ) : null}
                <Link href="/application" className="cp-lien">
                  {etatEspace === "ouvert"
                    ? "L'installer sur téléphone et ordinateur"
                    : "Voir le fonctionnement"}
                </Link>
              </div>
            </Panneau>

            <Panneau
              titre={rendezVous.length ? "Vos rendez-vous" : "Aucun rendez-vous"}
              sous={rendezVous.length ? "Heure de Guadeloupe." : "Rien de réservé sur ce compte."}
            >
              {panneDemandes ? (
                <p className="rv-erreur">
                  Vos rendez-vous ne répondent pas pour le moment. Rechargez la page dans un
                  instant.
                </p>
              ) : rendezVous.length ? (
                <ul>
                  {rendezVous.slice(0, 3).map((d) => (
                    <LigneRdv key={d.id} d={d} />
                  ))}
                </ul>
              ) : (
                <>
                  <p className="cp-secondaire">
                    L&apos;audit mesure votre processus le plus coûteux — impayés, demandes
                    perdues, heures de saisie. Gratuit à partir de trente minutes.
                  </p>
                  <div className="mt-4">
                    <Link href="/reserver-un-audit" className="r-btn r-btn--fil">
                      Réserver un audit
                    </Link>
                  </div>
                </>
              )}
            </Panneau>
          </div>
        </>
      ),
    },
    {
      cle: "abonnement",
      libelle: modeAudit ? "Mon audit" : "Abonnement",
      titre: modeAudit ? "Mon audit" : "Mon abonnement",
      sous: modeAudit
        ? "Ce qui a été réservé, et ce qui suit."
        : "Vos postes, votre formule et votre moyen de paiement.",
      actions: modeAudit ? (
        <>
          <Link href="/reserver-un-audit" className="r-btn r-btn--noir">
            {audits.length ? "Réserver un autre format" : "Réserver mon audit"}
          </Link>
          <Link href="/tarifs" className="r-btn r-btn--fil">
            Voir les postes et les tarifs
          </Link>
        </>
      ) : null,
      contenu: (
        <div className="cpt-panneaux">
          {/* 05/09 — le retour de Stripe, au-dessus du panneau */}
          {retour === "ok" ? (
            <p className="cp-ok" role="status">
              {enregistrementEnCours
                ? "Merci. L'enregistrement de votre moyen de paiement est en cours de confirmation. Rien ne sera débité avant la fin de l'installation."
                : "Moyen de paiement enregistré. Rien ne sera débité avant la fin de l'installation."}
            </p>
          ) : retour === "plus-tard" ? (
            <p className="cp-info" role="status">
              Vous pourrez enregistrer votre moyen de paiement plus tard, ici, depuis votre
              abonnement.
            </p>
          ) : null}

          {modeAudit ? (
            <Panneau
              titre={audits.length ? "Votre audit" : "L'audit, la première marche"}
              sous={
                audits.length
                  ? "Heure de Guadeloupe."
                  : "Mesurer avant d'installer — gratuit, sans engagement."
              }
            >
              {panneDemandes ? (
                <p className="rv-erreur">
                  Vos rendez-vous ne répondent pas pour le moment. Rechargez la page dans un
                  instant.
                </p>
              ) : audits.length ? (
                <>
                  <ul>
                    {audits.map((d) => (
                      <LigneRdv key={d.id} d={d} />
                    ))}
                  </ul>
                  <p className="cp-secondaire mt-4 max-w-[68ch]">
                    À l&apos;issue de l&apos;audit, vous recevez ce qui a été mesuré et ce
                    qu&apos;il y a à mettre en route. L&apos;installation se réserve ensuite, et
                    c&apos;est elle qui ouvre votre espace client.
                  </p>
                </>
              ) : (
                <p className="cp-secondaire max-w-[68ch]">
                  Aucun rendez-vous sur ce compte. L&apos;audit mesure votre processus le plus
                  coûteux — impayés, demandes perdues, heures de saisie — et dit ce qu&apos;il y a
                  à mettre en route, s&apos;il y a quelque chose.
                </p>
              )}
            </Panneau>
          ) : (
            <Panneau titre="Votre formule" sous="Postes, prix et moyen de paiement.">
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
            </Panneau>
          )}

          {/* les installations, quand il y en a mais qu'aucune ne fait
              abonnement (une annulée, par exemple) : elles n'ouvrent pas
              un onglet pour elles seules */}
          {!panneDemandes && modeAudit && reunions.length ? (
            <Panneau titre="Vos installations" sous="Heure de Guadeloupe.">
              <ul>
                {reunions.map((d) => (
                  <LigneRdv key={d.id} d={d} />
                ))}
              </ul>
            </Panneau>
          ) : null}
        </div>
      ),
    },
    {
      cle: "profil",
      libelle: "Profil",
      titre: "Profil professionnel",
      sous: "Ce que nous savons de votre entreprise : ces informations figurent sur vos factures et pré-remplissent vos demandes.",
      contenu: (
        <div className="cpt-panneaux">
          <Panneau titre="Vos informations" sous="Modifiables à tout moment.">
            <ProfilCarte utilisateur={utilisateur} />
          </Panneau>
        </div>
      ),
    },
    {
      cle: "securite",
      libelle: "Sécurité",
      titre: "Sécurité et commandes",
      sous: "Votre mot de passe, vos commandes de site et vos données.",
      contenu: (
        <div className="cpt-panneaux" data-colonnes="deux">
          <Panneau titre="Mot de passe" sous={`Compte ouvert avec ${utilisateur.email}.`}>
            <MotDePasseCarte email={utilisateur.email} mdpDefini={utilisateur.mdpDefini} />
          </Panneau>
          {panneauCommandes}
        </div>
      ),
    },
  ];

  return (
    <CompteCoque
      initiales={initiales(utilisateur)}
      nom={aNom ? nom : "Profil à compléter"}
      sous={utilisateur.entreprise ?? utilisateur.email}
      onglets={onglets}
      espaceHref={`${COCKPIT_URL}/espace`}
      espaceLibelle="Mon espace client"
    />
  );
}
