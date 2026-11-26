import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import Cadre from "@/components/charte/Cadre";
import Section from "@/components/charte/Section";
import EnTeteSection from "@/components/charte/EnTeteSection";
import Appel from "@/components/charte/Appel";
import Pastille from "@/components/charte/Pastille";
import { Scene } from "@/components/charte/Cartes";
import {
  EstimationRetenue,
  ModeleRetenu,
  SiteRetenu,
} from "@/components/reservation/ModeleUrl";
import { MODELES } from "@/components/modeles/donnees";
import { POSTES } from "@/lib/paliers";
import FormulaireFormat from "./FormulaireFormat";
import { NOM_SITE, titreSite } from "@/components/espace2/portail";
import "./reserver.css";
import "@/components/charte/pages/reserver-un-audit.css";

/* ══════════════════════════════════════════════════════════════════════
   /reserver-un-audit — « Réserver un audit » (refonte du 18/10/2026)

   Teo : « change-la complètement, fais-la comme scale.com/demo, mêmes
   finitions ». Le modèle est la page de démo de Scale : un titre, un
   chapô et un formulaire à gauche ; une carte gris bleu à droite, avec la
   citation, un filet et une étiquette de bas de carte. Le relevé des
   valeurs est dans reserver.css (en-tête), pris au getComputedStyle à
   390, 768, 1024, 1440 et 1700 px.

   CE QUI EST GARDÉ, mot pour mot, de la version d'avant : le titre et le
   chapô. Teo, 18/10 au soir : « enlève toutes les sections à part celle du
   haut » — comme la référence, la page tient en une seule section (titre,
   chapô, formulaire, carte) suivie du pied de page. Les trois formats, le
   comparatif, le périmètre, le protocole, la FAQ et l'appel final ont été
   retirés d'ici ; leurs textes restent dans lib/reservation (PROFILS,
   COMPARATIF, FAQ) et dans l'historique git de ce fichier.

   CE QUI CHANGE :
   · la citation de la carte n'est PAS une citation client : c'est le
     principe de l'audit, dit par nous (règle de regles-maison : aucune
     preuve sociale inventée) ;
   · les logos de la carte sont ceux d'Omega (systèmes et logiciels
     métiers), en grand, comme la référence. Pas de marques tierces : un
     logo de client ou d'outil se lit comme un partenariat ;
   · le formulaire reprend les champs de la référence (prénom, nom,
     entreprise, fonction, e-mail, pays, secteur, origine, format). Il est la
     dernière page avant le mail : il envoie la demande (/api/audit/demande),
     et le visiteur reçoit une confirmation avec le lien pour choisir son
     créneau ;
   · la recherche dans la FAQ et le simulateur ont disparu avec le reste
     de l'ancienne mise en page — la FAQ tient en neuf questions, en
     accordéon.

   LES COMPOSANTS D'AVANT (FormulesGrille, TableauFormats, UnSeulAudit,
   Protocole, AppelCreneau, FaqAudit, GarantiesAudit et leurs CSS) ne sont
   plus importés ici. Ils restent dans components/reservation/ jusqu'à
   décision de les retirer.

   LES RAPPELS (modèle, formule de site, estimation) restent en tête du
   formulaire : ils viennent de l'URL et portent le choix fait ailleurs.

   25/11/2026 — LA CHARTE DE L'ACCUEIL (docs/charte-accueil.md, § 4.2,
   ligne 3). La page passe dans <Cadre> : fond #f5f5f2, Google Sans, marges
   hachurées. Le titre prend le h1 de l'accueil (EnTeteSection niveau 1),
   avec la pastille « Audit » ; le formulaire et la carte deviennent deux
   cellules jointives séparées par un filet, la carte gris bleu devient une
   scène #eeeee8 ; la bande noire de fin devient le bandeau d'appel centré
   (<Appel>), même phrase. Plus de cascade d'entrée mot à mot (MotsReveles,
   o-bloc-apparait) ni de PageMotion : la charte est calme. Les textes sont
   ceux d'avant, mot pour mot. Le dessin propre à la page vit dans
   components/charte/pages/reserver-un-audit.css (règles sous `.charte`).
   ══════════════════════════════════════════════════════════════════════ */

export const metadata: Metadata = {
  alternates: { canonical: "/reserver-un-audit" },
  /* 10/11/2026 — « | DALIRO » sur un site dédié à un logiciel (components/espace2/portail.ts) */
  title: titreSite("Réserver un audit"),
  description:
    "Trois formats d'audit, gratuits à partir du cadrage de 45 minutes, pour mesurer ce que votre processus le plus coûteux représente. Sans engagement.",
};

/* Les noms des modèles et des postes sont fournis par le serveur aux
   rappels : la vérification du slug se fait côté client, mais la table des
   noms n'a pas à entrer dans le paquet d'une page d'entrée. */
const NOMS_MODELES: Record<string, string> = Object.fromEntries(
  MODELES.map((m) => [m.slug, m.nom]),
);

const NOMS_POSTES: Record<string, string> = Object.fromEntries(
  POSTES.map((p) => [p.slug, p.nom]),
);

/* Les outils de la carte : la liste des onze de ce matin, moins les quatre
   que Teo a retirés le 18/10 au soir (« enlève Google Meet, Stripe, Supabase,
   Vercel »). Restent Claude, Anthropic, Next.js, Resend, Tailwind CSS, React
   et GSAP. Logos officiels : Anthropic (pied de page d'anthropic.com), Next.js
   (nextjs.org), Resend (resend.com), Tailwind (logotype de tailwindcss.com) ;
   Claude, React et GSAP viennent du paquet simple-icons déjà installé.
   `largeur` garde les proportions de chaque fichier, à hauteur égale de 36 px.
   Autorisés par Teo : ils disent quels outils Omega utilise, pas une
   collaboration. Trois rangées (3, 2, 2) pour que le logotype Tailwind, le
   plus large, ne casse pas la ligne dans la carte. */
const RANGEE_UN = [
  { nom: "Claude", fichier: "/logos/outils/claude.svg", largeur: 36 },
  { nom: "Anthropic", fichier: "/logos/outils/anthropic.svg", largeur: 52 },
  { nom: "Next.js", fichier: "/logos/outils/nextjs.svg", largeur: 179 },
];
const RANGEE_DEUX = [
  { nom: "Resend", fichier: "/logos/outils/resend.svg", largeur: 170 },
  { nom: "Tailwind CSS", fichier: "/logos/outils/tailwind.svg", largeur: 286 },
];
const RANGEE_TROIS = [
  { nom: "React", fichier: "/logos/outils/react.svg", largeur: 36 },
  { nom: "GSAP", fichier: "/logos/outils/gsap.svg", largeur: 36 },
];
const RANGEES = [RANGEE_UN, RANGEE_DEUX, RANGEE_TROIS];

/* Un logo en masque : le PNG est transparent, la couleur vient du CSS. */
function Marque({ nom, fichier, largeur }: { nom: string; fichier: string; largeur: number }) {
  return (
    <span className="rdv-marque-bloc">
      <span
        role="img"
        aria-label={nom}
        className="rdv-marque"
        style={{ width: largeur, WebkitMaskImage: `url(${fichier})`, maskImage: `url(${fichier})` }}
      />
      <span className="rdv-marque-nom">{nom}</span>
    </span>
  );
}

export default function ReserverUnAuditPage() {
  return (
    <PageShell>
      <Cadre>
        <div className="rdv">
          {/* ═══ 1 — tête : le titre de page, puis le formulaire et la carte,
                 deux cellules jointives séparées par un filet ═══ */}
          <Section>
            <EnTeteSection
              niveau={1}
              haut
              pastille="Audit"
              titre="Un audit à votre mesure."
              chapo={
                <>
                  Plusieurs services, plusieurs validateurs&nbsp;: nous mesurons d&apos;abord, puis le devis part de vos volumes. Trois formats, de 45 minutes à une journée dans vos locaux.
                </>
              }
            />

            <div className="rdv-corps">
              <div className="rdv-corps-form">
                <div className="rdv-notes">
                  <ModeleRetenu noms={NOMS_MODELES} />
                  <SiteRetenu />
                  <EstimationRetenue noms={NOMS_POSTES} />
                </div>

                <FormulaireFormat />
              </div>

              <div className="rdv-corps-carte" data-gutter-guide="top">
                <Scene className="rdv-scene">
                  <blockquote className="rdv-citation">
                    <p>
                      Un agent ne se justifie que s&apos;il coûte moins cher que le problème qu&apos;il règle. Nous chiffrons avant de recommander. Jamais l&apos;inverse.
                    </p>
                    <footer className="rdv-signature">
                      <span>{NOM_SITE}</span>
                      <span>Le principe de l&apos;audit</span>
                    </footer>
                  </blockquote>

                  <hr className="rdv-filet" />

                  <div className="rdv-logos-bloc">
                    <Pastille>Nous travaillons avec</Pastille>
                    {RANGEES.map((rangee, n) => (
                      <ul key={n} className="rdv-logos">
                        {rangee.map((m) => (
                          <li key={m.nom}>
                            <Marque nom={m.nom} fichier={m.fichier} largeur={m.largeur} />
                          </li>
                        ))}
                      </ul>
                    ))}
                  </div>
                </Scene>
              </div>
            </div>
          </Section>

          {/* ═══ 2 — la phrase de fin, en bandeau d'appel centré (elle était
                 blanche sur une bande noire, « sur cette page seulement ») ═══ */}
          <Appel pastille="Le principe de l'audit" titre="Chiffrer d'abord, recommander ensuite." />
        </div>
      </Cadre>
    </PageShell>
  );
}
