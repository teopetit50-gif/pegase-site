import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDays, CreditCard, Globe, LayoutDashboard, ShieldCheck, UserRound } from "lucide-react";
import PageShell from "@/components/PageShell";
import PageMotion from "@/components/PageMotion";
import AbonnementCarte from "@/components/compte/AbonnementCarte";
import IdentiteCompte from "@/components/compte/IdentiteCompte";
import MotDePasseCarte from "@/components/compte/MotDePasseCarte";
import ProfilCarte from "@/components/compte/ProfilCarte";
import SectionCompte from "@/components/compte/SectionCompte";
import {
  abonnementCourant,
  reunionPassee,
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
} from "@/lib/compte";
import { MODELES } from "@/components/modeles/donnees";
import {
  LIBELLES_STATUT_SITE,
  dateGp,
  prixLisible,
  type LigneCommandeSite,
} from "@/lib/site-commande";
import { COCKPIT_URL } from "@/lib/supabase/config";
import { createClient, utilisateurCourant } from "@/lib/supabase/server";

/* ══════════════════════════════════════════════════════════════════════
   /compte — « Mon compte » (02/09/2026, repensée le 03/09)

   Ce qu'un client connecté voit sur le SITE : son abonnement, ses
   rendez-vous, ses commandes de site, son profil professionnel, son mot
   de passe — et l'accès à son cockpit.

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
     2. Mes rendez-vous (bleu) — les réunions d'installation, en cartes
        condensées (bloc-date en heure de Guadeloupe, durée, pastille de
        statut), puis les audits/devis s'il y en a un jour ;
     3. Mes commandes de site (bordeaux-or, comme la carte de /commencer) ;
     4. Profil professionnel (violet) — ProfilCarte, le formulaire ;
     5. Sécurité et accès (gris) — MotDePasseCarte, inchangée.
   En tête : « Mon compte », la ligne d'identité (IdentiteCompte) et
   « Se déconnecter ». À droite, collée en desktop : « Votre cockpit ».

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

/* la pastille de statut des rendez-vous et des commandes — texte foncé
   sur fond doux, .cp-pastille[data-teinte] dans globals.css */
function Pastille({ teinte, children }: { teinte: string; children: React.ReactNode }) {
  return (
    <span className="cp-pastille" data-teinte={teinte}>
      {children}
    </span>
  );
}

/* le petit compteur à droite d'un en-tête de section */
function Compteur({ n }: { n: number }) {
  return n > 0 ? <span className="cp-compteur">{n}</span> : null;
}

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
  const aInstallation = demandes.some((d) => d.parcours === "reglage" && d.statut !== "annule");
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

  /* Mes rendez-vous : les réunions d'installation, la plus proche du
     présent d'abord (ISO se trie en texte ; sans créneau → à la fin),
     puis les audits et devis dans l'ordre de la base */
  const reunions = demandes
    .filter((d) => d.parcours === "reglage")
    .sort((a, b) => (b.creneau_debut ?? "").localeCompare(a.creneau_debut ?? ""));
  const autres = demandes.filter((d) => d.parcours !== "reglage");
  const rendezVous = [...reunions, ...autres];

  const nomModele = (slug: string) => MODELES.find((m) => m.slug === slug)?.nom ?? slug;

  return (
    <PageShell>
      <PageMotion />
      <div className="resa">
        <section data-monde="clair" className="r-wrap pb-16 pt-12 sm:pb-24 sm:pt-14">
          {/* ——— en tête : le titre, l'identité, la sortie ——— */}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="r-h2 max-w-[20ch]">Mon compte</h1>
              <IdentiteCompte utilisateur={utilisateur} />
            </div>
            <form action="/auth/signout" method="post" className="shrink-0">
              <button type="submit" className="r-btn r-btn--fil">
                Se déconnecter
              </button>
            </form>
          </div>

          <div className="mt-10 grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
            <div className="order-2 space-y-5 lg:order-1">
              {/* ——— 1. Mon abonnement ——— */}
              <SectionCompte id="abonnement" teinte="orange" icone={CreditCard} kicker="Abonnement" titre="Mon abonnement">
                {/* 05/09 — le retour de Stripe, au-dessus de la carte */}
                {retour === "ok" ? (
                  <p className="cp-ok mb-5" role="status">
                    {enregistrementEnCours
                      ? "Merci — l'enregistrement de votre moyen de paiement est en cours de confirmation, quelques secondes. Rien ne sera débité avant la fin de l'installation."
                      : "Moyen de paiement enregistré — rien ne sera débité avant la fin de l'installation."}
                  </p>
                ) : retour === "plus-tard" ? (
                  <p className="cp-info mb-5" role="status">
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
              </SectionCompte>

              {/* ——— 2. Mes rendez-vous ——— */}
              <SectionCompte
                id="rendez-vous"
                teinte="bleu"
                icone={CalendarDays}
                kicker="Rendez-vous"
                titre="Mes rendez-vous"
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
                    <div className="mt-5">
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
                            <div className="cp-secondaire cp-kicker-ligne">
                              {LIBELLES_PARCOURS[d.parcours] ?? d.parcours}
                            </div>
                            <div className="cp-texte cp-fort">{libelleFormule(d.formule)}</div>
                            <p className="num cp-secondaire mt-0.5">
                              {d.creneau_debut
                                ? `${dateHeureGp(d.creneau_debut)}${duree ? ` · ${duree}` : ""} · heure de Guadeloupe`
                                : "Sans créneau — traitée par e-mail"}
                            </p>
                            {d.entreprise ? (
                              <p className="cp-secondaire mt-0.5">
                                Entreprise&nbsp;: <span className="cp-fort">{d.entreprise}</span>
                              </p>
                            ) : null}
                            {detail ? <p className="cp-secondaire mt-1.5">{detail}</p> : null}
                          </div>
                          <div className="cp-rdv-statut">
                            <Pastille teinte={TEINTE_STATUT[d.statut] ?? "gris"}>{court}</Pastille>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </SectionCompte>

              {/* ——— 3. Mes commandes de site ——— */}
              <SectionCompte
                id="site"
                teinte="bordeaux"
                icone={Globe}
                kicker="Site catalogue"
                titre="Mes commandes de site"
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
                    <div className="mt-5">
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
                          <p className="cp-secondaire mt-3">
                            Le paiement en ligne arrive&nbsp;: on vous appelle pour régler et lancer la
                            production.
                          </p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </SectionCompte>

              {/* ——— 4. Profil professionnel ——— */}
              <SectionCompte id="profil" teinte="violet" icone={UserRound} kicker="Profil" titre="Profil professionnel">
                <p className="cp-texte mb-5">
                  Ce que nous savons de votre entreprise&nbsp;: ces informations servent à vos factures et
                  pré-remplissent vos prochaines demandes.
                </p>
                <ProfilCarte utilisateur={utilisateur} />
              </SectionCompte>

              {/* ——— 5. Sécurité et accès ——— */}
              <SectionCompte id="securite" teinte="neutre" icone={ShieldCheck} kicker="Sécurité" titre="Sécurité et accès">
                <p className="cp-texte">
                  Connecté avec <span className="cp-fort break-all">{utilisateur.email}</span>. Cette adresse
                  et ce mot de passe ouvrent votre compte sur le site comme sur le cockpit.
                </p>
                <MotDePasseCarte email={utilisateur.email} mdpDefini={utilisateur.mdpDefini} />
                <p className="cp-secondaire mt-4">
                  Ce que nous faisons de vos données, et comment les récupérer&nbsp;:{" "}
                  <Link href="/vos-donnees" className="underline underline-offset-2">
                    vos données
                  </Link>
                  .
                </p>
              </SectionCompte>
            </div>

            {/* ——— l'accès au cockpit, ou son attente ——— */}
            <aside className="cp-cockpit order-1 lg:sticky lg:top-[88px] lg:order-2">
              <div className="cp-kicker flex items-center gap-2">
                <LayoutDashboard size={16} strokeWidth={2} aria-hidden="true" />
                Votre cockpit
              </div>
              {panneComptes ? (
                <>
                  <h2 className="r-h4 mt-3">Votre accès cockpit ne répond pas.</h2>
                  <p className="mt-2 text-[15px] leading-[23px]">
                    Impossible de vérifier votre rattachement pour le moment. Rechargez la page dans un
                    instant.
                  </p>
                </>
              ) : rattache ? (
                <>
                  <h2 className="r-h4 mt-3">Votre cockpit est ouvert.</h2>
                  <p className="mt-2 text-[15px] leading-[23px]">
                    Relances, demandes, factures&nbsp;: vos postes y apparaissent au fur et à mesure de
                    leur mise en route, avec ce qui attend votre validation. Même adresse, même mot de
                    passe.
                  </p>
                  <a href={`${COCKPIT_URL}/espace`} className="r-btn r-btn--blanc mt-5 w-full sm:w-auto">
                    Ouvrir mon cockpit
                  </a>
                </>
              ) : aInstallation ? (
                <>
                  <h2 className="r-h4 mt-3">Votre installation est en préparation.</h2>
                  <p className="mt-2 text-[15px] leading-[23px]">
                    On vous ouvre le cockpit dès la réunion faite&nbsp;: vos postes y apparaissent au fur
                    et à mesure de leur mise en route.
                  </p>
                </>
              ) : (
                <>
                  <h2 className="r-h4 mt-3">Votre cockpit s&apos;ouvre après la réunion d&apos;installation.</h2>
                  <p className="mt-2 text-[15px] leading-[23px]">
                    Choisissez vos postes, réservez la réunion&nbsp;: c&apos;est elle qui met vos postes en
                    route et vous ouvre le cockpit.
                  </p>
                  <Link href="/tarifs" className="r-btn r-btn--blanc mt-5 w-full sm:w-auto">
                    Choisir mes postes
                  </Link>
                </>
              )}
            </aside>
          </div>
        </section>
      </div>
    </PageShell>
  );
}
