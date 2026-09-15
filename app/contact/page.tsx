import { COCKPIT_URL } from "@/lib/supabase/config";
import type { Metadata } from "next";
import Link from "next/link";
import PageShell from "@/components/PageShell";
import PageMotion from "@/components/PageMotion";
import FormulaireContact from "@/components/contact/FormulaireContact";
import { AttendreContact, BesoinsContact } from "@/components/contact/VoiesContact";
import { COURRIEL, LIEN_TELEPHONE, TELEPHONE_AFFICHE, lienCourriel } from "@/lib/reservation";

/* ══════════════════════════════════════════════════════════════════════
   /contact — le service client (08/09/2026)

   14/09/2026 — WhatsApp n'est plus une porte du site (lib/reservation.ts) :
   la carte « Ouvrir la conversation » est partie, la page donne le
   formulaire et l'adresse e-mail. Le texte ci-dessous date du 08/09.

   Demande de l'associé : « change les mentions nous contacter sur le site
   et mets en place un vrai service client avec le bon e-mail ». Jusqu'ici
   le site n'affichait AUCUNE adresse e-mail : tous les boutons de contact
   ouvraient WhatsApp (arbitrage Teo du 30/07, qui tient toujours pour la
   vitesse), et la seule adresse du code, contact@pegase.gp, était un
   repli sur un domaine qui n'a jamais existé. L'adresse
   contact@omegaai.fr existe depuis le 08/09 (redirection OVH vers les
   boîtes des associés) : elle devient le courriel du service client,
   celui que porte aussi le « répondre à » de l'e-mail de bienvenue du
   cockpit.

   La page donne les DEUX canaux et dit à quoi chacun sert — WhatsApp
   pour le court et l'urgent, l'e-mail pour ce qui mérite d'être écrit —
   puis ce qu'un client peut attendre, et où se font les gestes qui n'ont
   pas besoin de nous (Mon compte, l'application). Aucune promesse
   nouvelle : « le jour même » est celle de /tarifs et de la réservation,
   le traitement des demandes d'abonnement depuis Mon compte est celui
   du 03/09.

   08/09 (troisième passe, demande de l'associé) : plus de « le jour même »
   sur cette page — « on ne pourra sans doute pas répondre tout le temps
   sous 24 h ». La promesse devient « dans les deux jours ouvrés, souvent
   le jour même » ; le titre ne promet plus de délai.

   08/09 (seconde passe, demande de l'associé) : un FORMULAIRE en tête,
   comme celui de l'audit — coordonnées, sujet, et un grand champ pour
   écrire (components/contact/FormulaireContact.tsx → POST /api/contact,
   qui envoie le message à contact@omegaai.fr). WhatsApp et l'adresse
   restent en dessous, « ou directement ».

   Monde clair .resa, mêmes classes que /application (.ap-*, globals.css).
   Qui mène ici : le pied de page (« Service client »), les mentions
   légales, le bandeau d'orientation de /tarifs.
   ══════════════════════════════════════════════════════════════════════ */

export const metadata: Metadata = {
  title: "Service client | Omega.AI",
  description:
    "Une question sur votre installation, votre abonnement ou un poste en service : WhatsApp pour le court et l'urgent, contact@omegaai.fr pour le reste. Réponse dans les deux jours ouvrés.",
};

const ATTENDRE = [
  {
    n: "01",
    titre: "Sous deux jours ouvrés",
    texte:
      "Vous recevez une réponse dans les deux jours ouvrés, souvent le jour même. Si votre question demande une vérification, nous vous indiquons quand vous aurez la réponse.",
  },
  {
    n: "02",
    titre: "Les personnes qui ont installé vos postes",
    texte:
      "Les personnes qui ont réalisé votre installation vous répondent, pas un centre d'appels. Elles connaissent vos outils et vos réglages.",
  },
  {
    n: "03",
    titre: "Un suivi continu",
    texte:
      "Changement de formule, résiliation, moyen de paiement : la demande se fait depuis votre espace client, et vous y suivez son traitement.",
  },
];

const BESOINS = [
  /* 15/09 — « Mon compte » a quitté le site : la ligne pointe l'espace
     client, où l'abonnement et le moyen de paiement vivent désormais. */
  { q: "Mon abonnement, mes rendez-vous, mon moyen de paiement", href: `${COCKPIT_URL}/compte`, lien: "Mon espace client" },
  { q: "Installer l'application sur mon téléphone ou mon ordinateur", href: "/application", lien: "L'application" },
  { q: "Réserver ma réunion d'installation", href: "/tarifs", lien: "Les tarifs" },
  { q: "Demander un audit pour mon entreprise", href: "/reserver-un-audit", lien: "Réserver un audit" },
  { q: "Savoir où vont mes données", href: "/vos-donnees", lien: "Vos données" },
];

export default function ContactPage() {
  const courriel = lienCourriel("Service client Omega");

  return (
    <PageShell>
      <PageMotion />
      <div className="resa">
        {/* ═══ 1 — premier écran ═══ */}
        <section data-monde="clair" className="r-wrap pb-14 pt-14 sm:pb-20 sm:pt-20">
          <div data-arrivee="titre">
            <p className="ap-kicker">Service client</p>
            <h1 className="r-h1 mt-4 max-w-[16ch]">Écrivez-nous, nous vous répondons.</h1>
          </div>
          <p data-arrivee="chapo" className="r-lead mt-5 max-w-[52ch]">
            Une question sur votre installation, votre abonnement ou un poste qui ne fonctionne pas comme prévu&nbsp;? Écrivez-nous ci-dessous ou par e-mail&nbsp;: une seule équipe vous répond.
          </p>
        </section>

        {/* ═══ 1 bis — le formulaire ═══ */}
        <section id="ecrire" data-monde="clair" className="r-wrap scroll-mt-24 pb-16 sm:pb-24">
          <div data-arrivee="bloc" className="max-w-[760px]">
            <FormulaireContact />
          </div>
        </section>

        {/* ═══ 2 — les deux canaux, ou directement ═══ */}
        <section data-monde="clair" className="r-wrap pb-16 sm:pb-24">
          <h2 data-reveal className="r-h3 max-w-[18ch]">
            Ou directement
          </h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            <article data-reveal className="ap-carte">
              <h3 className="r-h4">E-mail</h3>
              <p className="ap-sous">Pour ce qui mérite d&apos;être écrit</p>
              <p className="mt-3 text-[15px] leading-[24px] text-[#3d3d3d]">
                Une demande détaillée, une pièce à joindre, une question sur une facture ou sur
                votre abonnement.
              </p>
              <p className="num mt-4 select-all text-[17px] font-semibold text-[#050505]">{COURRIEL}</p>
              <div className="mt-4">
                <a href={courriel} className="r-btn r-btn--fil w-full sm:w-auto">
                  Écrire à {COURRIEL}
                </a>
              </div>
            </article>

            {/* 15/09/2026 — le téléphone revient. Il n'était plus affiché
                qu'en mentions légales ; la page retirée, le site n'avait plus
                aucun numéro. C'est un lien d'APPEL, pas une conversation :
                WhatsApp n'est plus une porte du site (voir lib/reservation). */}
            <article data-reveal className="ap-carte">
              <h3 className="r-h4">Téléphone</h3>
              <p className="ap-sous">Pour ce qui va plus vite de vive voix</p>
              <p className="mt-3 text-[15px] leading-[24px] text-[#3d3d3d]">
                Une question courte, une installation en cours, un point à caler. Aux heures
                ouvrées ; en dehors, laissez un message et nous rappelons.
              </p>
              <p className="num mt-4 select-all text-[17px] font-semibold text-[#050505]">
                {TELEPHONE_AFFICHE}
              </p>
              <div className="mt-4">
                <a href={LIEN_TELEPHONE} className="r-btn r-btn--fil w-full sm:w-auto">
                  Appeler {TELEPHONE_AFFICHE}
                </a>
              </div>
            </article>
          </div>
        </section>

        {/* ═══ 3 — ce que vous pouvez attendre ═══ */}
        <div className="r-blanc">
          <section data-monde="clair" className="r-wrap py-14 sm:py-20">
            <h2 data-reveal className="r-h3 max-w-[18ch]">
              Ce que vous pouvez attendre
            </h2>
            <AttendreContact temps={ATTENDRE} className="mt-10" />
          </section>
        </div>

        {/* ═══ 4 — selon votre besoin ═══ */}
        <section data-monde="clair" className="r-wrap py-14 sm:py-20">
          <div className="grid gap-8 lg:grid-cols-[379px_1fr] lg:gap-16">
            <h2 data-reveal className="r-h3 lg:sticky lg:top-28 lg:self-start">
              Selon votre besoin
            </h2>
            <BesoinsContact besoins={BESOINS} />
          </div>
          <div data-reveal className="ap-encart mt-12">
            <h2 className="r-h4">Pas encore client&nbsp;?</h2>
            <p className="mt-3 max-w-[60ch] text-[15px] leading-[24px] text-[#3d3d3d]">
              Décrivez votre situation en deux lignes, par e-mail ou dans le formulaire ci-dessus&nbsp;: votre
              activité, ce qui vous prend le plus de temps, ce qui se perd. Nous vous répondons dans les deux jours ouvrés avec le palier adapté, et la réunion d&apos;installation se réserve en ligne.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/tarifs" className="r-btn r-btn--fil">
                Voir les tarifs
              </Link>
            </div>
          </div>
        </section>
      </div>
    </PageShell>
  );
}
