import { Fragment } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import PageShell from "@/components/PageShell";
import PageMotion from "@/components/PageMotion";
import {
  BoutonReservation,
  EstimationRetenue,
  ModeleRetenu,
  SiteRetenu,
} from "@/components/reservation/ModeleUrl";
import { MODELES } from "@/components/modeles/donnees";
import { MENU } from "@/lib/menu";
import { POSTES } from "@/lib/paliers";
import {
  COMPARATIF,
  COURRIEL,
  FAQ,
  PROFILS,
  lienContact,
  type Point,
} from "@/lib/reservation";
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
   chapô, les trois formats et leurs listes, le comparatif, le périmètre
   (les quatre systèmes et le sur-mesure, lus dans lib/menu), le protocole
   d'audit, la FAQ (lue dans lib/reservation) et l'appel final.

   CE QUI CHANGE :
   · la citation de la carte n'est PAS une citation client : c'est le
     principe de l'audit, dit par nous (règle de regles-maison : aucune
     preuve sociale inventée) ;
   · les logos de la carte sont ceux d'Omega (systèmes et logiciels
     métiers), en grand, comme la référence. Pas de marques tierces : un
     logo de client ou d'outil se lit comme un partenariat ;
   · le formulaire reprend les champs de la référence (prénom, nom,
     entreprise, fonction, e-mail, pays, secteur, origine, format). Ses
     coordonnées passent à /reserver (lib/prereservation.ts) : le visiteur
     ne les retape pas dans le formulaire de réservation ;
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

/* Les outils de la carte : ceux que le code appelle vraiment. Logos officiels :
   Anthropic (pied de page d'anthropic.com), Next.js (nextjs.org), Resend (resend.com),
   Stripe (kit de logos Stripe), Vercel (triangle de la page Geist de Vercel).
   Claude et Supabase : leurs pages de marque ne donnent que le pictogramme
   (le logo Claude complet n'est pas proposé en fichier) ; ces deux signes
   viennent du paquet simple-icons déjà installé. Tailwind : logotype officiel
   de tailwindcss.com. `largeur` garde les
   proportions de chaque fichier, à hauteur égale de 36 px. Autorisés par Teo, qui
   précise : ils disent quels outils Omega utilise, pas une collaboration. */
const RANGEE_UN = [
  { nom: "Claude", fichier: "/logos/outils/claude.svg", largeur: 36 },
  { nom: "Anthropic", fichier: "/logos/outils/anthropic.svg", largeur: 52 },
  { nom: "Supabase", fichier: "/logos/outils/supabase.svg", largeur: 36 },
  { nom: "Vercel", fichier: "/logos/outils/vercel.svg", largeur: 36 },
];
const RANGEE_DEUX = [
  { nom: "Next.js", fichier: "/logos/outils/nextjs.svg", largeur: 179 },
  { nom: "Resend", fichier: "/logos/outils/resend.svg", largeur: 170 },
  { nom: "Stripe", fichier: "/logos/outils/stripe.svg", largeur: 86 },
];
/* Preuves dans le code : lib/visio.ts crée des salles Google Meet, GSAP est importé
   par des composants, Tailwind est dans globals.css, React est le framework. Pour
   React, GSAP et Google Meet, la page de marque ne donne pas de fichier : pictogramme
   du paquet simple-icons. */
const RANGEE_TROIS = [
  { nom: "Google Meet", fichier: "/logos/outils/googlemeet.svg", largeur: 36 },
  { nom: "Tailwind CSS", fichier: "/logos/outils/tailwind.svg", largeur: 286 },
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

/* Le protocole : texte repris au mot près de l'ancienne section. */
const ARTICLES: { intitule: string; texte: string }[] = [
  {
    intitule: "Chiffrage",
    texte:
      "Aucun audit ne se termine par une plaquette. Il se termine par un montant en euros ou en heures par mois, vérifiable dans vos propres documents.",
  },
  {
    intitule: "Recommandation",
    texte:
      "Si le calcul ne justifie pas de déployer un système, la recommandation est de ne rien installer. C'est une conclusion valable, et elle arrive.",
  },
  {
    intitule: "Confidentialité",
    texte:
      "Les chiffres que vous montrez pendant l'audit ne sortent pas de l'entretien. Ils ne servent ni d'exemple commercial, ni de référence auprès d'un autre client.",
  },
  {
    intitule: "Durée tenue",
    texte:
      "L'entretien se termine à l'heure annoncée. Si le sujet mérite davantage, c'est vous qui décidez de la suite.",
  },
  {
    intitule: "Réponse le jour même",
    texte: "Toute demande obtient une réponse le jour même, y compris pour dire non.",
  },
  {
    intitule: "Aucun engagement",
    texte:
      "La recommandation vous appartient, que vous installiez un système ou non. Sans suite de votre part, le dossier se ferme : aucune relance commerciale.",
  },
];

/* Les quatre systèmes et le sur-mesure : les entrées de « Nos offres » qui
   mènent à /offres/…, lues dans lib/menu. */
const OFFRES = (MENU.find((r) => r.label === "Nos offres")?.entrees ?? []).filter((e) =>
  e.href.startsWith("/offres/"),
);

/* Un point de liste avec son passage en gras (le `fort` de lib/reservation). */
function PointListe({ p }: { p: Point }) {
  const i = p.fort ? p.texte.indexOf(p.fort) : -1;
  if (!p.fort || i < 0) return <>{p.texte}</>;
  return (
    <>
      {p.texte.slice(0, i)}
      <strong>{p.fort}</strong>
      {p.texte.slice(i + p.fort.length)}
    </>
  );
}

export default function ReserverUnAuditPage() {
  /* PROFILS[1] est le seul profil affiché depuis le 28/08 : cette page ne
     parle qu'aux organisations. Ses trois formats sont dans l'ordre
     Cadrage, Audit process, Audit + atelier — celui des colonnes de
     COMPARATIF. */
  const formules = PROFILS[1].formules;

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

                <FormulaireFormat formules={formules} />
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

        {/* ═══ 2 — les trois formats ═══ */}
        <section id="formats" data-monde="clair" className="rdv-section">
          <div className="rdv-wrap">
            <div className="rdv-tete">
              <p className="rdv-mono">Les trois formats</p>
              <h2 className="rdv-h2">Chiffrer d&apos;abord, recommander ensuite</h2>
              <p className="rdv-lead">
                Du cadrage de 45 minutes à la journée dans vos locaux&nbsp;: ce qui change
                d&apos;un format à l&apos;autre, c&apos;est la profondeur de l&apos;entretien
                et l&apos;endroit où il se tient.
              </p>
            </div>

            <div className="rdv-formats">
              {formules.map((f) => (
                <article
                  key={f.id}
                  className={`rdv-format${f.phare ? " rdv-format--phare" : ""}`}
                >
                  <div className="rdv-format-tete">
                    <h3 className="rdv-format-nom">{f.nom}</h3>
                    {f.badge ? <span className="rdv-badge">{f.badge}</span> : null}
                  </div>
                  <p className="rdv-format-duree">{f.duree}</p>
                  <p className="rdv-format-meta">
                    {f.suffixe} · {f.conditions}
                  </p>
                  <p className="rdv-format-promesse">{f.promesse}</p>
                  <div className="rdv-format-liste">
                    <p className="rdv-mono">{f.enteteListe}</p>
                    <ul>
                      {f.points.map((p) => (
                        <li key={p.texte}>
                          <PointListe p={p} />
                        </li>
                      ))}
                    </ul>
                  </div>
                </article>
              ))}
            </div>

            <p className="rdv-mention">
              Cadrage et Audit process sont gratuits, sans engagement. Le format dans vos
              locaux est déduit de l&apos;installation si vous décidez d&apos;aller plus
              loin. L&apos;éligibilité au Chèque TIC est vérifiée pendant l&apos;audit,
              avant tout engagement.
            </p>
          </div>
        </section>

        {/* ═══ 3 — comparatif ═══ */}
        <section id="comparatif" data-monde="clair" className="rdv-section">
          <div className="rdv-wrap">
            <div className="rdv-tete">
              <p className="rdv-mono">Comparatif</p>
              <h2 className="rdv-h2">Ce qui change d&apos;un format à l&apos;autre</h2>
            </div>

            <div className="rdv-tableau-cadre">
              <table className="rdv-tableau">
                <caption className="rdv-sr">Comparatif des trois formats d&apos;audit</caption>
                <thead>
                  <tr>
                    <th scope="col">
                      <span className="rdv-sr">Critère</span>
                    </th>
                    {formules.map((f) => (
                      <th scope="col" key={f.id}>
                        {f.nom}
                        <span className="rdv-tableau-duree">{f.duree}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {COMPARATIF.map((famille) => (
                    <Fragment key={famille.titre}>
                      <tr className="rdv-famille">
                        <th scope="colgroup" colSpan={formules.length + 1}>
                          {famille.titre}
                        </th>
                      </tr>
                      {famille.lignes.map((l) => (
                        <tr key={l.libelle}>
                          <th scope="row">
                            {l.libelle}
                            {l.aide ? <span className="rdv-tableau-aide">{l.aide}</span> : null}
                          </th>
                          {l.valeurs.map((v, i) => (
                            <td key={i}>{v}</td>
                          ))}
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ═══ 4 — périmètre : tout se combine ═══ */}
        <section id="perimetre" data-monde="clair" className="rdv-section">
          <div className="rdv-wrap rdv-deux">
            <div className="rdv-tete">
              <p className="rdv-mono">Périmètre</p>
              <h2 className="rdv-h2">Tout se combine, sur un seul audit</h2>
              <p className="rdv-lead">
                Le même entretien passe en revue les quatre systèmes et ce qui n&apos;entre
                dans aucune case. Vous repartez avec une seule recommandation, dans l&apos;ordre
                où la déployer.
              </p>
            </div>

            <ul className="rdv-offres">
              {OFFRES.map((o) => (
                <li key={o.href}>
                  <Link href={o.href} className="rdv-offre">
                    <span className="rdv-offre-corps">
                      <span className="rdv-offre-nom">{o.label}</span>
                      {o.texte ? <span className="rdv-offre-texte">{o.texte}</span> : null}
                    </span>
                    <ArrowUpRight aria-hidden strokeWidth={1.6} className="rdv-offre-fleche" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ═══ 5 — protocole d'audit ═══ */}
        <section id="engagements" data-monde="clair" className="rdv-section">
          <div className="rdv-wrap">
            <div className="rdv-tete">
              <p className="rdv-mono">Protocole d&apos;audit</p>
              <h2 className="rdv-h2">Ce qui est écrit noir sur blanc</h2>
              <p className="rdv-lead">Six règles, appliquées à tous les formats, sans exception.</p>
            </div>

            <ol className="rdv-articles">
              {ARTICLES.map((a, i) => (
                <li key={a.intitule} className="rdv-article">
                  <span className="rdv-mono">{String(i + 1).padStart(2, "0")}</span>
                  <h3 className="rdv-article-titre">{a.intitule}</h3>
                  <p className="rdv-article-texte">{a.texte}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ═══ 6 — questions fréquentes ═══ */}
        <section id="faq" data-monde="clair" className="rdv-section">
          <div className="rdv-wrap rdv-deux">
            <div className="rdv-tete">
              <p className="rdv-mono">Questions fréquentes</p>
              <h2 className="rdv-h2">Avant de réserver</h2>
              <p className="rdv-lead">
                Une question qui manque&nbsp;?{" "}
                <Link href={lienContact("avant")} className="rdv-lien">
                  Écrivez-nous
                </Link>
                , nous répondons le jour même.
              </p>
            </div>

            <div className="rdv-faq">
              {FAQ.map((f) => (
                <details key={f.q} className="rdv-faq-item">
                  <summary>
                    <span>
                      <span className="rdv-mono">{f.theme}</span>
                      <span className="rdv-faq-q">{f.q}</span>
                    </span>
                  </summary>
                  <div className="rdv-faq-reponse">
                    {f.r.map((paragraphe) => (
                      <p key={paragraphe}>{paragraphe}</p>
                    ))}
                    {f.liens?.length ? (
                      <p className="rdv-faq-liens">
                        {f.liens.map((l) => (
                          <Link key={l.href} href={l.href}>
                            {l.label}
                          </Link>
                        ))}
                      </p>
                    ) : null}
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ 7 — appel final ═══ */}
        <section data-monde="clair" className="rdv-section">
          <div className="rdv-wrap">
            <div className="rdv-cta">
              <h2 className="rdv-h2">Réservez votre créneau en deux minutes</h2>
              <p className="rdv-lead">
                L&apos;agenda montre les créneaux réellement libres, en heure de Guadeloupe.
                Vous en choisissez un, il est bloqué à l&apos;instant même, et vous recevez la
                confirmation le jour même, avec le lien de la visioconférence.
              </p>
              <div className="rdv-boutons">
                <BoutonReservation formule="process" className="rdv-bouton">
                  Réserver l&apos;audit gratuit
                  <span aria-hidden className="rdv-bouton-icone">
                    <ArrowRight strokeWidth={1.8} size={18} />
                  </span>
                </BoutonReservation>
                <Link href="/tarifs" className="rdv-bouton rdv-bouton--fil">
                  Estimer votre prix
                </Link>
              </div>
              <p className="rdv-petit">
                Ou par e-mail&nbsp;: <span>{COURRIEL}</span>
              </p>
            </div>
          </div>
        </section>
      </div>
    </PageShell>
  );
}
