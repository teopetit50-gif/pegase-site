import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import Cadre from "@/components/charte/Cadre";
import Section from "@/components/charte/Section";
import EnTeteSection from "@/components/charte/EnTeteSection";
import Appel from "@/components/charte/Appel";
import Bouton from "@/components/charte/Bouton";
import Pastille from "@/components/charte/Pastille";
import { Scene } from "@/components/charte/Cartes";
import FormulaireContact from "@/components/contact/FormulaireContact";
import { AttendreContact, BesoinsContact } from "@/components/contact/VoiesContact";
import { COURRIEL, LIEN_TELEPHONE, TELEPHONE_AFFICHE, lienCourriel } from "@/lib/reservation";
import { EDITEUR, MARQUE_SITE, titreSite } from "@/components/espace2/portail";
import "@/components/charte/pages/contact.css";

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

   25/11/2026 — LA CHARTE DE L'ACCUEIL (docs/charte-accueil.md, § 4.2,
   ligne 4). La page passe dans <Cadre> ; l'étiquette « Service client »
   devient la pastille du h1 (EnTeteSection niveau 1). Le formulaire et les
   deux canaux directs sont deux cellules jointives, séparées par un filet ;
   les sections suivantes prennent l'en-tête de section de l'accueil, la
   bande blanche disparaît, « Selon votre besoin » prend la composition de
   la FAQ de l'accueil, et l'encart « Pas encore client ? » devient le
   bandeau d'appel (<Appel>). Tous les boutons sont les `ch-btn` blancs.
   Plus de PageMotion. Les textes sont ceux d'avant, mot pour mot ; seules
   les pastilles « Contact », « Réponse », « Tarifs » reprennent des mots
   déjà présents sur la page. Le dessin propre à la page :
   components/charte/pages/contact.css (règles sous `.charte .ct-page`).
   ══════════════════════════════════════════════════════════════════════ */

export const metadata: Metadata = {
  alternates: { canonical: "/contact" },
  /* 10/11/2026 — « | DALIRO » sur un site dédié à un logiciel (components/espace2/portail.ts) */
  title: titreSite("Service client"),
  description:
    "Une question sur votre installation, votre abonnement ou un agent en service ? Écrivez-nous ou appelez-nous.",
};

const ATTENDRE = [
  {
    n: "01",
    titre: "Sous deux jours ouvrés",
    texte:
      "Réponse sous deux jours ouvrés, souvent le jour même. Si une vérification est nécessaire, nous vous disons quand vous aurez la réponse.",
  },
  {
    n: "02",
    titre: "L'équipe qui a fait votre installation",
    texte:
      "Pas un centre d'appels. Les personnes qui ont fait votre installation vous répondent. Elles connaissent vos outils et vos réglages.",
  },
  {
    n: "03",
    titre: "Un suivi continu",
    texte:
      "Changement de formule, résiliation, moyen de paiement : écrivez-nous. Nous traitons la demande et vous le confirmons par e-mail.",
  },
];

const BESOINS = [
  /* 17/09 — les deux lignes « Mon espace client » (cockpit) et
     « Installer l'application » (/application) sont retirées : plus
     rien du site ne mène à un compte, à une connexion ni à
     l'installation de l'application. */
  /* 10/11/2026 — pas de page /tarifs sur un site dédié à un logiciel : la réunion d'installation se demande par l'audit (components/espace2/portail.ts) */
  ...(MARQUE_SITE ? [] : [{ q: "Réserver ma réunion d'installation", href: "/tarifs", lien: "Les tarifs" }]),
  { q: "Demander un audit pour mon entreprise", href: MARQUE_SITE ? "/#audit" : "/reserver-un-audit", lien: "Réserver un audit" },
  { q: "Savoir où vont mes données", href: "/vos-donnees", lien: "Vos données" },
];

export default function ContactPage() {
  const courriel = lienCourriel(`Service client ${EDITEUR}`);

  return (
    <PageShell>
      <Cadre>
        <div className="resa ct-page">
          {/* ═══ 1 — le titre de page, puis le formulaire et les deux
                 canaux directs, côte à côte, séparés par un filet ═══ */}
          <Section>
            <EnTeteSection
              niveau={1}
              haut
              pastille="Service client"
              titre="Parlez à notre équipe."
              chapo={
                <>
                  Une question sur votre installation, votre abonnement ou un agent qui ne fonctionne pas comme prévu&nbsp;? Écrivez-nous ci-dessous ou par e-mail. Une seule équipe vous répond.
                </>
              }
            />

            <div className="ct-corps">
              {/* ═══ 1 bis — le formulaire ═══ */}
              <div id="ecrire" className="ct-ecrire scroll-mt-24">
                <FormulaireContact />
              </div>

              {/* ═══ 2 — les deux canaux, ou directement ═══ */}
              <div className="ct-directement" data-gutter-guide="top">
                <div className="ct-directement-tete">
                  <Pastille>Contact</Pastille>
                  <h2 className="ch-titre">Ou directement</h2>
                </div>

                <article className="ct-voie">
                  <h3 className="ct-voie-titre">E-mail</h3>
                  <p className="ct-voie-sous">Pour les demandes détaillées</p>
                  <p className="ct-voie-texte">
                    Une pièce à joindre, une question sur une facture ou sur votre abonnement.
                  </p>
                  <Scene basse className="ct-voie-scene">
                    <p className="num ct-voie-valeur select-all">{COURRIEL}</p>
                    <Bouton href={courriel} className="w-full sm:w-auto">
                      Écrire à {COURRIEL}
                    </Bouton>
                  </Scene>
                </article>

                {/* 15/09/2026 — le téléphone revient. Il n'était plus affiché
                    qu'en mentions légales ; la page retirée, le site n'avait plus
                    aucun numéro. C'est un lien d'APPEL, pas une conversation :
                    WhatsApp n'est plus une porte du site (voir lib/reservation). */}
                <article className="ct-voie">
                  <h3 className="ct-voie-titre">Téléphone</h3>
                  <p className="ct-voie-sous">Pour aller plus vite</p>
                  <p className="ct-voie-texte">
                    Une question courte, une installation en cours, un point à caler. Aux heures ouvrées. En dehors, laissez un message : nous rappelons.
                  </p>
                  <Scene basse className="ct-voie-scene">
                    <p className="num ct-voie-valeur select-all">{TELEPHONE_AFFICHE}</p>
                    <Bouton href={LIEN_TELEPHONE} className="w-full sm:w-auto">
                      Appeler {TELEPHONE_AFFICHE}
                    </Bouton>
                  </Scene>
                </article>
              </div>
            </div>
          </Section>

          {/* ═══ 3 — ce que vous pouvez attendre ═══ */}
          <Section>
            <EnTeteSection pastille="Réponse" titre="Ce que vous pouvez attendre de nous" />
            <AttendreContact temps={ATTENDRE} />
          </Section>

          {/* ═══ 4 — selon votre besoin : le titre à gauche (collant), les
                 rangées à droite, comme la FAQ de l'accueil ═══ */}
          <section className="ch-section">
            <div className="ct-besoins" data-gutter-guide="bottom">
              <header className="ch-intro">
                <div className="ct-besoins-intro">
                  <Pastille>Service client</Pastille>
                  <h2 className="ch-titre">Selon votre besoin</h2>
                </div>
              </header>
              <BesoinsContact besoins={BESOINS} />
            </div>
          </section>

          {/* ═══ 5 — pas encore client : le bandeau d'appel de fin ═══ */}
          <Appel
            pastille="Tarifs"
            titre={<>Pas encore client&nbsp;?</>}
            chapo={
              <>
                Décrivez votre situation en deux lignes, par e-mail ou dans le formulaire&nbsp;: votre activité, ce qui vous prend le plus de temps, ce qui se perd. Nous vous répondons dans les deux jours ouvrés avec le palier adapté, et la réunion d&apos;installation se réserve en ligne.
              </>
            }
            actions={
              MARQUE_SITE ? (
                <Bouton href="/#audit" icone="calendrier">
                  Réserver un audit
                </Bouton>
              ) : (
                <Bouton href="/tarifs" icone="chevron">
                  Voir les tarifs
                </Bouton>
              )
            }
          />
        </div>
      </Cadre>
    </PageShell>
  );
}
