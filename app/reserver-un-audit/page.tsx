import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import PageMotion from "@/components/PageMotion";
import {
  EstimationRetenue,
  ModeleRetenu,
  SiteRetenu,
} from "@/components/reservation/ModeleUrl";
import { MODELES } from "@/components/modeles/donnees";
import { POSTES } from "@/lib/paliers";
import FormulaireFormat from "./FormulaireFormat";
import "./reserver.css";

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
   ══════════════════════════════════════════════════════════════════════ */

export const metadata: Metadata = {
  alternates: { canonical: "/reserver-un-audit" },
  title: "Réserver un audit | Omega.AI",
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
  POSTES.map((p) => [p.id, `${p.system} · ${p.nom}`]),
);

/* Les outils de la carte : six, les plus connus d'un dirigeant (Teo, 18/10 au
   soir : « il y a peut-être trop de logos, mets-en moins et les plus pro »).
   Partis : Claude (doublon d'Anthropic), Resend, Tailwind, React, GSAP, des
   outils de développeur. Logos officiels : Anthropic (pied de page
   d'anthropic.com), Stripe (kit de logos Stripe), Vercel (triangle de la page
   Geist), Next.js (nextjs.org), Supabase et Google Meet (pictogrammes du paquet
   simple-icons). `largeur` garde les proportions de chaque fichier, à hauteur
   égale de 36 px. Autorisés par Teo, qui précise : ils disent quels outils
   Omega utilise, pas une collaboration. Deux rangées de trois. */
const RANGEE_UN = [
  { nom: "Anthropic", fichier: "/logos/outils/anthropic.svg", largeur: 52 },
  { nom: "Stripe", fichier: "/logos/outils/stripe.svg", largeur: 86 },
  { nom: "Vercel", fichier: "/logos/outils/vercel.svg", largeur: 36 },
];
const RANGEE_DEUX = [
  { nom: "Next.js", fichier: "/logos/outils/nextjs.svg", largeur: 179 },
  { nom: "Supabase", fichier: "/logos/outils/supabase.svg", largeur: 36 },
  { nom: "Google Meet", fichier: "/logos/outils/googlemeet.svg", largeur: 36 },
];
const RANGEES = [RANGEE_UN, RANGEE_DEUX];

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
      {/* couche motion commune : lenis + reveals GSAP */}
      <PageMotion />

      <div className="rdv">
        {/* ═══ 1 — tête : titre, chapô, formulaire de format, carte ═══ */}
        <section data-monde="clair" className="rdv-hero">
          <div className="rdv-wrap">
            <div className="rdv-hero-grille">
              <div className="rdv-hero-gauche">
                <div className="rdv-entete">
                  <h1 className="rdv-h1">Un audit à la mesure de votre organisation</h1>
                  <p className="rdv-lead">
                    Plusieurs services, plusieurs validateurs&nbsp;: nous mesurons
                    d&apos;abord, et le devis est établi à partir de vos volumes. Trois
                    formats, du cadrage de 45 minutes à la journée dans vos locaux.
                  </p>
                </div>

                <div className="rdv-notes">
                  <ModeleRetenu noms={NOMS_MODELES} />
                  <SiteRetenu />
                  <EstimationRetenue noms={NOMS_POSTES} />
                </div>

                <FormulaireFormat />
              </div>

              <div className="rdv-carte">
                <blockquote className="rdv-citation">
                  <p>
                    Un système ne se justifie que si la difficulté qu&apos;il traite coûte
                    plus cher que lui. Nous chiffrons avant de recommander, jamais
                    l&apos;inverse.
                  </p>
                  <footer className="rdv-signature">
                    <span>Omega.AI</span>
                    <span>Le principe de l&apos;audit</span>
                  </footer>
                </blockquote>

                <hr className="rdv-filet" />

                <div className="rdv-logos-bloc">
                  <p className="rdv-mono rdv-centre">Nous travaillons avec</p>
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
              </div>
            </div>
          </div>
        </section>

        {/* ═══ 2 — bande de fin : la phrase, en très grand, blanc sur noir.
           C'est le pied de page de la référence (scale.com/demo) ramené à sa
           phrase ; Teo, 18/10 : « sur cette page seulement ». ═══ */}
        <section className="rdv-bande" aria-label="Le principe de l'audit, en une phrase">
          <div className="rdv-wrap">
            <p className="rdv-bande-phrase">Chiffrer d&apos;abord, recommander ensuite.</p>
          </div>
        </section>
      </div>
    </PageShell>
  );
}
