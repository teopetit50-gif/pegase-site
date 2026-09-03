import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import PageShell from "@/components/PageShell";
import PageMotion from "@/components/PageMotion";
import MotDePasseCarte from "@/components/compte/MotDePasseCarte";
import {
  LIBELLES_PARCOURS,
  LIBELLES_STATUT,
  dateHeureGp,
  dureeFormule,
  libelleFormule,
} from "@/lib/compte";
import { POSTES } from "@/lib/paliers";
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
   /compte — « Mon compte » (02/09/2026)

   Ce qu'un client connecté voit sur le SITE : ses demandes d'installation
   (aujourd'hui seules celles-là sont rattachées au compte — l'audit et le
   devis partent sans jeton, décision Teo du 02/09), le créneau de chacune
   en heure de Guadeloupe, son statut ; et son mot de passe (carte « Mon
   mot de passe », changement par updateUser).

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

   Sources : rpc mes_demandes() (demandes où utilisateur_id = auth.uid())
   et la table comptes (RLS : ses propres rattachements). Tout est lu avec
   la session du visiteur — rien n'est lisible d'un autre compte. Une
   lecture qui échoue (grant, RLS, base indisponible) se DIT — on ne
   raconte pas « en préparation » sur une panne (revue n° 5).

   Libellés (revue n° 8) : la page s'appelle « Mon compte », comme
   l'icône du header qui y mène ; « Se déconnecter » partout.

   Server Component, force-dynamic : la page dépend des cookies et ne doit
   jamais être mise en cache. Sans session : /connexion?suite=/compte (le
   proxy fait déjà ce renvoi ; on le refait ici — le proxy n'est pas une
   garantie, voir proxy.md).

   02/09 (même jour) — « Mes commandes de site » : les commandes passées
   par le tunnel /site/commande (rpc mes_commandes_site, celles où
   utilisateur_id = auth.uid()). Modèle (nom du catalogue — un slug qui
   n'y serait plus s'affiche tel quel plutôt que de planter la page),
   entreprise, prix, date, et le statut du point de vue du client :
   « a_payer » se lit « Enregistrée — règlement à venir », pas « payez »
   (pas de paiement en ligne encore, Teo appelle). Même règle de panne :
   une lecture qui échoue se dit.
   ══════════════════════════════════════════════════════════════════════ */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Mon compte | Omega.AI",
  description:
    "Vos demandes d'installation, vos commandes de site, votre mot de passe et l'accès à votre cockpit.",
  robots: { index: false, follow: false },
};

/* les colonnes de demandes_audit que la page lit — la fonction renvoie la
   ligne entière, on ne type que ce qu'on affiche */
type Demande = {
  id: string;
  parcours: string;
  formule: string;
  entreprise: string | null;
  creneau_debut: string | null;
  duree_min: number | null;
  statut: string;
  modules: string[] | null;
  prix_mensuel_eur: number | null;
  /* 02/09 — formule annuelle : `periodicite` vaut 'mensuel' ou 'annuel',
     `prix_annuel_eur` n'est renseigné que pour l'annuel (instantané SQL).
     Optionnels : une base pas encore migrée ne casse pas la page. */
  periodicite?: string | null;
  prix_annuel_eur?: number | null;
  cree_le: string;
};

export default async function ComptePage() {
  const utilisateur = await utilisateurCourant();
  if (!utilisateur) redirect("/connexion?suite=%2Fcompte");

  const supabase = await createClient();
  const [demandesRes, comptesRes, commandesRes] = await Promise.all([
    supabase.rpc("mes_demandes"),
    supabase.from("comptes").select("client_id"),
    supabase.rpc("mes_commandes_site"),
  ]);
  const demandes = ((demandesRes.data ?? []) as Demande[]).slice();
  const panneDemandes = Boolean(demandesRes.error);
  const panneComptes = Boolean(comptesRes.error);
  const rattache = !panneComptes && (comptesRes.data?.length ?? 0) > 0;
  const aInstallation = demandes.some((d) => d.parcours === "reglage" && d.statut !== "annule");
  const commandes = ((commandesRes.data ?? []) as LigneCommandeSite[]).slice();
  const panneCommandes = Boolean(commandesRes.error);

  const nomPoste = (id: string) => POSTES.find((p) => p.id === id)?.nom ?? id;
  const nomModele = (slug: string) => MODELES.find((m) => m.slug === slug)?.nom ?? slug;

  return (
    <PageShell>
      <PageMotion />
      <div className="resa">
        <section data-monde="clair" className="r-wrap pb-16 pt-12 sm:pb-24 sm:pt-14">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="r-h2 max-w-[20ch]">Mon compte</h1>
              <p className="r-lead mt-3">
                Connecté avec <span className="font-medium text-[#050505]">{utilisateur.email}</span>
              </p>
            </div>
            <form action="/auth/signout" method="post" className="shrink-0">
              <button type="submit" className="r-btn r-btn--fil">
                Se déconnecter
              </button>
            </form>
          </div>

          {/* ——— l'accès au cockpit, ou son attente ——— */}
          <div className="mt-10 grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
            <div className="order-2 lg:order-1">
              <h2 className="r-h4">Vos demandes d&apos;installation</h2>
              {panneDemandes ? (
                <p className="rv-erreur mt-4">
                  Vos demandes ne répondent pas pour le moment. Rechargez la page dans un instant.
                </p>
              ) : demandes.length === 0 ? (
                <div className="r-carte mt-4 !p-7">
                  <p className="text-[15px] leading-[24px] text-[#3d3d3d]">
                    Aucune demande n&apos;est encore rattachée à cette adresse. Pour réserver votre
                    installation, choisissez vos postes sur la grille.
                  </p>
                  <div className="mt-5">
                    <Link href="/tarifs" className="r-btn r-btn--noir">
                      Voir les tarifs
                    </Link>
                  </div>
                </div>
              ) : (
                <ul className="mt-4 space-y-4">
                  {demandes.map((d) => {
                    const duree = dureeFormule(d.formule, d.duree_min);
                    const postes = d.modules ?? [];
                    return (
                      <li key={d.id} className="r-carte !p-7">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#616161]">
                          {LIBELLES_PARCOURS[d.parcours] ?? d.parcours}
                        </div>
                        <h3 className="r-h4 mt-2">{libelleFormule(d.formule)}</h3>
                        <p className="num mt-1 text-[14px] leading-[22px] text-[#3d3d3d]">
                          {d.creneau_debut
                            ? `${dateHeureGp(d.creneau_debut)} (heure de Guadeloupe)${duree ? ` · ${duree}` : ""}`
                            : "Sans créneau — traitée par e-mail"}
                        </p>
                        <p className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[#fdf3dd] px-3 py-1.5 text-[13px] font-medium text-[#050505]">
                          {LIBELLES_STATUT[d.statut] ?? d.statut}
                        </p>
                        {d.entreprise ? (
                          <p className="mt-3 text-[14px] leading-[22px] text-[#3d3d3d]">
                            Entreprise&nbsp;: <span className="font-medium text-[#050505]">{d.entreprise}</span>
                          </p>
                        ) : null}
                        {postes.length ? (
                          <div className="mt-4 border-t border-[#e3e3e3] pt-4">
                            <div className="text-[14px] font-semibold text-[#050505]">
                              {postes.length === POSTES.length
                                ? "Tout Omega — les quatre postes"
                                : `Vos postes (${postes.length})`}
                            </div>
                            <ul className="mt-2 space-y-1.5">
                              {postes.map((m) => (
                                <li key={m} className="text-[14px] leading-[21px] text-[#3d3d3d]">
                                  {nomPoste(m)}
                                </li>
                              ))}
                            </ul>
                            {d.periodicite === "annuel" && d.prix_annuel_eur != null ? (
                              /* 02/09 — l'annuel : le montant facturé en
                                 une fois, et son équivalent mensuel */
                              <div className="mt-3 flex items-baseline justify-between gap-3">
                                <span className="text-[14px] text-[#3d3d3d]">Abonnement</span>
                                <span className="num text-right text-[20px] font-semibold text-[#050505]">
                                  {Math.round(d.prix_annuel_eur)} €
                                  <span className="text-[13px] font-normal text-[#616161]"> /an</span>
                                  <span className="block text-[13px] font-normal text-[#616161]">
                                    soit {Math.round(d.prix_annuel_eur / 12)} €/mois
                                  </span>
                                </span>
                              </div>
                            ) : d.prix_mensuel_eur != null ? (
                              <div className="mt-3 flex items-baseline justify-between">
                                <span className="text-[14px] text-[#3d3d3d]">Abonnement</span>
                                <span className="num text-[20px] font-semibold text-[#050505]">
                                  {d.prix_mensuel_eur} €
                                  <span className="text-[13px] font-normal text-[#616161]"> /mois</span>
                                </span>
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              )}

              {/* ——— les commandes de site (02/09) ——— */}
              <h2 className="r-h4 mt-10">Mes commandes de site</h2>
              {panneCommandes ? (
                <p className="rv-erreur mt-4">
                  Vos commandes ne répondent pas pour le moment. Rechargez la page dans un instant.
                </p>
              ) : commandes.length === 0 ? (
                <div className="r-carte mt-4 !p-7">
                  <p className="text-[15px] leading-[24px] text-[#3d3d3d]">
                    Aucune commande de site pour l&apos;instant. Le site catalogue est à
                    990&nbsp;€ TTC, une fois — vingt et un modèles, contenu réécrit à votre métier.
                  </p>
                  <div className="mt-5">
                    <Link href="/tarifs/site" className="r-btn r-btn--fil">
                      Voir l&apos;offre site
                    </Link>
                  </div>
                </div>
              ) : (
                <ul className="mt-4 space-y-4">
                  {commandes.map((c) => (
                    <li key={c.id} className="r-carte !p-7">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#616161]">
                        Site catalogue
                      </div>
                      <h3 className="r-h4 mt-2">Modèle {nomModele(c.modele)}</h3>
                      <p className="num mt-1 text-[14px] leading-[22px] text-[#3d3d3d]">
                        Commandée le {dateGp(c.cree_le)}
                      </p>
                      <p className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[#fdf3dd] px-3 py-1.5 text-[13px] font-medium text-[#050505]">
                        {LIBELLES_STATUT_SITE[c.statut] ?? c.statut}
                      </p>
                      <p className="mt-3 text-[14px] leading-[22px] text-[#3d3d3d]">
                        Entreprise&nbsp;: <span className="font-medium text-[#050505]">{c.entreprise}</span>
                      </p>
                      <div className="mt-4 flex items-baseline justify-between border-t border-[#e3e3e3] pt-4">
                        <span className="text-[14px] text-[#3d3d3d]">Prix</span>
                        <span className="num text-[20px] font-semibold text-[#050505]">
                          {prixLisible(c.prix_eur)}
                          <span className="text-[13px] font-normal text-[#616161]"> TTC</span>
                        </span>
                      </div>
                      {c.statut === "a_payer" ? (
                        <p className="r-note mt-3">
                          Le paiement en ligne arrive&nbsp;: on vous appelle pour régler et lancer la
                          production.
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}

              <h2 className="r-h4 mt-10">Votre accès</h2>
              <MotDePasseCarte email={utilisateur.email} mdpDefini={utilisateur.mdpDefini} />
            </div>

            <aside className="order-1 r-carte !p-7 lg:order-2">
              <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#616161]">
                Votre cockpit
              </div>
              {panneComptes ? (
                <>
                  <h2 className="r-h4 mt-2">Votre accès cockpit ne répond pas.</h2>
                  <p className="mt-2 text-[15px] leading-[23px] text-[#3d3d3d]">
                    Impossible de vérifier votre rattachement pour le moment. Rechargez la page dans
                    un instant.
                  </p>
                </>
              ) : rattache ? (
                <>
                  <h2 className="r-h4 mt-2">Votre cockpit est ouvert.</h2>
                  <p className="mt-2 text-[15px] leading-[23px] text-[#3d3d3d]">
                    Relances, demandes, factures&nbsp;: vos postes y apparaissent au fur et à mesure
                    de leur mise en route, avec ce qui attend votre validation. Même adresse, même
                    mot de passe.
                  </p>
                  <a href={`${COCKPIT_URL}/espace`} className="r-btn r-btn--noir mt-5 w-full sm:w-auto">
                    Ouvrir mon cockpit
                  </a>
                </>
              ) : aInstallation ? (
                <>
                  <h2 className="r-h4 mt-2">Votre installation est en préparation.</h2>
                  <p className="mt-2 text-[15px] leading-[23px] text-[#3d3d3d]">
                    On vous ouvre le cockpit dès la réunion faite&nbsp;: vos postes y apparaissent au
                    fur et à mesure de leur mise en route.
                  </p>
                </>
              ) : (
                <>
                  <h2 className="r-h4 mt-2">Votre cockpit s&apos;ouvre après la réunion d&apos;installation.</h2>
                  <p className="mt-2 text-[15px] leading-[23px] text-[#3d3d3d]">
                    Choisissez vos postes, réservez la réunion&nbsp;: c&apos;est elle qui met vos
                    postes en route et vous ouvre le cockpit.
                  </p>
                  <Link href="/tarifs" className="r-btn r-btn--fil mt-5 w-full sm:w-auto">
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
