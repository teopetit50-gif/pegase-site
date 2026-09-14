import Link from "next/link";
import { CalendarDays, CreditCard, Globe, LayoutDashboard, ShieldCheck, UserRound } from "lucide-react";
import { GlassAccountCard, GlassPanel } from "@/components/ui/glass-account-card";
import AbonnementCarte from "@/components/compte/AbonnementCarte";
import IdentiteCompte from "@/components/compte/IdentiteCompte";
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
  libelleFormule,
  type Utilisateur,
} from "@/lib/compte";
import { MODELES } from "@/components/modeles/donnees";
import { LIBELLES_STATUT_SITE, dateGp, prixLisible, type LigneCommandeSite } from "@/lib/site-commande";
import { COCKPIT_URL } from "@/lib/supabase/config";

/* ══════════════════════════════════════════════════════════════════════
   CompteVue — la vue de « Mon compte », toute sur un écran (14/09/2026)

   Demande Teo du 14/09 : « refais toute la section Mon compte, elle n'est
   utilisable que quand on défile ; je veux que tout soit sur une page,
   donc en largeur ». Jusqu'ici la page empilait six cartes à en-tête
   coloré sur une colonne, avec le cockpit collé à droite : 2 300 px de
   haut, tout se lisait en défilant. Elle tient désormais dans UNE carte
   de verre (components/ui/glass-account-card.tsx, d'après la « Glass
   Account Settings Card » collée par Teo) qui s'organise en colonnes :

     ≥ 1280 px — le profil en BANDEAU sur toute la largeur (résumé sur
        une ligne, bouton Modifier ; le formulaire se déplie dedans),
        puis trois colonnes (1,7 · 1 · 1), aires de grille :
        abonnement | cockpit  | rendez-vous
        abonnement | sécurité | commandes de site
        — mesuré le 14/09 sur le jeu d'aperçu : les trois colonnes font
        chacune ~720 px, rien ne tire la carte vers le bas. Quatre
        colonnes avaient été essayées : à 248 px de large, rendez-vous
        et profil doublaient de hauteur, la carte était PLUS haute.
     1024 – 1279 — bandeau, puis deux colonnes (abonnement | cockpit /
        sécurité, puis rendez-vous | commandes) ;
     640 – 1023 — bandeau, puis deux colonnes, cockpit et abonnement en
        pleine largeur ;
     < 640 — une colonne, dans l'ordre du DOM : cockpit, abonnement,
        rendez-vous, commandes, sécurité, profil (le cockpit d'abord sur
        téléphone, comme avant ; le profil, qu'on corrige deux fois par
        an, en dernier).
   La colonne de contenu s'élargit à 1440 px (.cp-wrap) : c'est la
   largeur de <main>, la page n'a plus de raison de se brider à 1280.

   Ce qui a changé de contenu : la section « L'application Omega »
   (08/09) disparaît en tant que panneau — elle disait la même chose que
   le lien « Installer l'application » de la carte cockpit, qui porte
   maintenant les deux boutons (ouvrir, installer) et le lien vers le
   mode d'emploi /application ; le bouton « Installer sur cet appareil »
   (→ app.omegaai.fr/installer) est le même lien. Rien d'autre n'est
   retiré : abonnement (AbonnementCarte, inchangée), rendez-vous,
   commandes de site, profil (ProfilCarte, champs resserrés), sécurité
   (MotDePasseCarte, à plat — plus de carte dans la carte).

   La carte de droite (cockpit) croise toujours deux faits (revue 02/09,
   n° 6) : une installation a-t-elle été demandée, et le compte est-il
   rattaché ? Trois états, plus la panne — dite, jamais racontée « en
   préparation » (revue n° 5). Le badge de l'en-tête (cp-pilule) résume
   le même état en deux mots.

   Composant serveur, SANS lecture de base : tout arrive en props depuis
   app/compte/page.tsx (la session, les quatre lectures, la comparaison à
   l'horloge). C'est ce qui permet à app/compte/apercu (mode
   développement seulement) de rendre la même vue sur un jeu fictif, pour
   la recette de la mise en page sans session.
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

/* la pastille de statut des rendez-vous et des commandes — texte foncé
   sur fond doux, .cp-pastille[data-teinte] dans globals.css */
function Pastille({ teinte, children }: { teinte: string; children: React.ReactNode }) {
  return (
    <span className="cp-pastille" data-teinte={teinte}>
      {children}
    </span>
  );
}

/* le petit compteur à droite d'un en-tête de panneau */
function Compteur({ n }: { n: number }) {
  return n > 0 ? <span className="cp-compteur">{n}</span> : null;
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

  /* Mes rendez-vous : les réunions d'installation, la plus proche du
     présent d'abord (ISO se trie en texte ; sans créneau → à la fin),
     puis les audits et devis dans l'ordre de la base */
  const reunions = demandes
    .filter((d) => d.parcours === "reglage")
    .sort((a, b) => (b.creneau_debut ?? "").localeCompare(a.creneau_debut ?? ""));
  const autres = demandes.filter((d) => d.parcours !== "reglage");
  const rendezVous = [...reunions, ...autres];

  const nomModele = (slug: string) => MODELES.find((m) => m.slug === slug)?.nom ?? slug;

  /* le badge de l'en-tête : l'état du cockpit en deux mots */
  const badge: { teinte: string; texte: string } = panneComptes
    ? { teinte: "rouge", texte: "Accès indisponible" }
    : rattache
      ? { teinte: "vert", texte: "Cockpit ouvert" }
      : aInstallation
        ? { teinte: "ambre", texte: "Installation en préparation" }
        : { teinte: "gris", texte: "Sans installation" };

  return (
    <div className="resa">
      <section data-monde="clair" className="r-wrap cp-wrap pb-10 pt-4 sm:pb-12 sm:pt-5">
        <GlassAccountCard
          identite={<IdentiteCompte utilisateur={utilisateur} />}
          droite={
            <>
              <span className="cp-pilule" data-teinte={badge.teinte}>
                {badge.texte}
              </span>
              <form action="/auth/signout" method="post" className="shrink-0">
                <button type="submit" className="r-btn r-btn--fil">
                  Se déconnecter
                </button>
              </form>
            </>
          }
        >
          <div className="cp-grille">
            {/* ——— le cockpit : l'accès, ou son attente — et l'application ——— */}
            <section className="cp-cockpit" data-zone="cockpit" aria-labelledby="cp-cockpit-titre">
              <div className="cp-kicker flex items-center gap-2">
                <LayoutDashboard size={16} strokeWidth={2} aria-hidden="true" />
                Votre cockpit
              </div>
              {panneComptes ? (
                <>
                  <h2 id="cp-cockpit-titre" className="r-h4 mt-3">
                    Votre accès cockpit ne répond pas.
                  </h2>
                  <p className="cp-cockpit-texte">
                    Impossible de vérifier votre rattachement pour le moment. Rechargez la page dans un
                    instant. Le mode d&apos;emploi de l&apos;application, lui, reste lisible&nbsp;:{" "}
                    <Link href="/application" className="cp-cockpit-lien cp-cockpit-lien--inline">
                      voir comment ça marche
                    </Link>
                    .
                  </p>
                </>
              ) : rattache ? (
                <>
                  <h2 id="cp-cockpit-titre" className="r-h4 mt-3">
                    Votre cockpit est ouvert.
                  </h2>
                  <p className="cp-cockpit-texte">
                    Relances, demandes, factures&nbsp;: vos postes y apparaissent au fur et à mesure de
                    leur mise en route, avec ce qui attend votre validation. Même adresse, même mot de
                    passe.
                  </p>
                  <div className="mt-5 flex flex-wrap items-center gap-2.5">
                    <a href={`${COCKPIT_URL}/espace`} className="r-btn r-btn--blanc">
                      Ouvrir mon cockpit
                    </a>
                    {/* 08/09 — droit sur la page d'installation du cockpit, sur
                        l'appareil où l'on est : c'est là que le bouton du
                        navigateur existe */}
                    <a href={`${COCKPIT_URL}/installer`} className="r-btn r-btn--fil">
                      Installer l&apos;application
                    </a>
                  </div>
                  <div>
                    <Link href="/application" className="cp-cockpit-lien">
                      L&apos;installer sur téléphone et ordinateur
                    </Link>
                  </div>
                </>
              ) : aInstallation ? (
                <>
                  <h2 id="cp-cockpit-titre" className="r-h4 mt-3">
                    Votre installation est en préparation.
                  </h2>
                  <p className="cp-cockpit-texte">
                    On vous ouvre le cockpit dès la réunion faite&nbsp;: vos postes y apparaissent au fur
                    et à mesure de leur mise en route. Il s&apos;installera sur votre téléphone et votre
                    ordinateur, comme une application.
                  </p>
                  <div>
                    <Link href="/application" className="cp-cockpit-lien">
                      Voir comment ça marche
                    </Link>
                  </div>
                </>
              ) : (
                <>
                  <h2 id="cp-cockpit-titre" className="r-h4 mt-3">
                    Votre cockpit s&apos;ouvre après la réunion d&apos;installation.
                  </h2>
                  <p className="cp-cockpit-texte">
                    Choisissez vos postes, réservez la réunion&nbsp;: c&apos;est elle qui met vos postes en
                    route et vous ouvre le cockpit.
                  </p>
                  <div className="mt-5">
                    <Link href="/tarifs" className="r-btn r-btn--blanc">
                      Choisir mes postes
                    </Link>
                  </div>
                  <div>
                    <Link href="/application" className="cp-cockpit-lien">
                      Voir comment l&apos;application s&apos;installe
                    </Link>
                  </div>
                </>
              )}
            </section>

            {/* ——— Mon abonnement ——— */}
            <GlassPanel
              zone="abo"
              teinte="orange"
              icone={CreditCard}
              titre="Mon abonnement"
              sous="Vos postes, votre formule et votre moyen de paiement."
            >
              {/* 05/09 — le retour de Stripe, au-dessus de la carte */}
              {retour === "ok" ? (
                <p className="cp-ok mb-4" role="status">
                  {enregistrementEnCours
                    ? "Merci — l'enregistrement de votre moyen de paiement est en cours de confirmation, quelques secondes. Rien ne sera débité avant la fin de l'installation."
                    : "Moyen de paiement enregistré — rien ne sera débité avant la fin de l'installation."}
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
            </GlassPanel>

            {/* ——— Mes rendez-vous ——— */}
            <GlassPanel
              zone="rdv"
              teinte="bleu"
              icone={CalendarDays}
              titre="Mes rendez-vous"
              sous="Heure de Guadeloupe."
              droite={<Compteur n={rendezVous.length} />}
            >
              {panneDemandes ? (
                <p className="rv-erreur">
                  Vos rendez-vous ne répondent pas pour le moment. Rechargez la page dans un instant.
                </p>
              ) : rendezVous.length === 0 ? (
                <>
                  <p className="cp-texte">
                    Aucun rendez-vous n&apos;est rattaché à cette adresse. La réunion d&apos;installation se
                    réserve depuis la grille des tarifs&nbsp;: elle met vos postes en route et vous ouvre le
                    cockpit.
                  </p>
                  <div className="mt-4">
                    <Link href="/tarifs" className="r-btn r-btn--noir">
                      Réserver mon installation
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
                          {/* la pastille vit dans le flux, à côté du kicker : le
                              panneau est étroit dès trois colonnes, une
                              troisième colonne de grille la ferait déborder */}
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
                              : "Sans créneau — traitée par e-mail"}
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
              )}
            </GlassPanel>

            {/* ——— Mes commandes de site ——— */}
            <GlassPanel
              zone="cmd"
              teinte="bordeaux"
              icone={Globe}
              titre="Mes commandes de site"
              sous="Le site catalogue, commandé depuis /site."
              droite={<Compteur n={commandes.length} />}
            >
              {panneCommandes ? (
                <p className="rv-erreur">
                  Vos commandes ne répondent pas pour le moment. Rechargez la page dans un instant.
                </p>
              ) : commandes.length === 0 ? (
                <>
                  <p className="cp-texte">
                    Aucune commande de site pour l&apos;instant. Le site catalogue est à 990&nbsp;€ TTC, une
                    fois — vingt et un modèles, contenu réécrit à votre métier.
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
                        /* le paiement en ligne n'existe pas encore : on le
                           dit, on n'invente pas de bouton */
                        <p className="cp-secondaire mt-2">
                          Le paiement en ligne arrive&nbsp;: on vous appelle pour régler et lancer la
                          production.
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </GlassPanel>

            {/* ——— Sécurité et accès ——— */}
            <GlassPanel
              zone="secu"
              teinte="neutre"
              icone={ShieldCheck}
              titre="Sécurité et accès"
              sous={
                <>
                  Connecté avec <span className="cp-fort break-all">{utilisateur.email}</span>
                </>
              }
            >
              <MotDePasseCarte email={utilisateur.email} mdpDefini={utilisateur.mdpDefini} />
              <p className="cp-secondaire mt-4">
                Ce que nous faisons de vos données, et comment les récupérer&nbsp;:{" "}
                <Link href="/vos-donnees" className="underline underline-offset-2">
                  vos données
                </Link>
                .
              </p>
            </GlassPanel>
            {/* ——— Profil professionnel ——— */}
            {/* en bandeau : une ligne sous l'en-tête dès 640 px (aires de
                .cp-grille), le formulaire se déplie dedans */}
            <GlassPanel zone="profil" teinte="violet" icone={UserRound} titre="Profil professionnel" bande>
              <ProfilCarte utilisateur={utilisateur} />
            </GlassPanel>

          </div>
        </GlassAccountCard>
      </section>
    </div>
  );
}
