import Image from "next/image";
import Link from "next/link";
import { SystemLogo } from "@/components/logos";
import { Chevron, GrilleOutils } from "@/components/offres/MediaMoteurs";
import {
  BandeauAutresMoteurs,
  BandeauOutilsMoteur,
  DemoFiche,
  PastillesOutils,
} from "@/components/offres/MediaFiche";
import BlocFaq from "./BlocFaq";
import type { GabaritProps } from "./types";
import { NOMBRES } from "./types";
import "./GabaritFrise.css";

/* ══════════════════════════════════════════════════════════════════════
   Gabarit « frise » — la page des DEUX paquets compris (15/09/2026)

   ORIGINE. `timeline` d'Aceternity UI (aceternity/timeline,
   https://ui.aceternity.com) : des entrées empilées le long d'un rail
   vertical, chacune coiffée d'un repère qui RESTE en vue le temps qu'on lit
   son bloc (`position: sticky`), et un faisceau qui remplit le rail au fil
   du défilement.

   POURQUOI ICI. Cette route ne sert plus que PULSE (/offres/point-du-matin)
   et VAULT (/offres/securite) : les quatre autres paquets ont leur route
   statique. Or ces deux fiches sont des SUITES ORDONNÉES, et leur copie le
   dit mot pour mot — « Toujours le même ordre de lecture : la trésorerie,
   les relances, les décisions en attente, les 48 heures à venir » (PULSE),
   « Un envoi préparé, douze contrôles, votre décision » (VAULT). Le gabarit
   « home » les rendait en rangée de cartes horizontales à défilement, où
   l'ordre ne se voit pas ; la frise le montre. Le reste de la page reprend
   le contenu existant section pour section, dans le vocabulaire `.offres`.

   CE QUI EST JETÉ. Le gros titre de gauche de la source (`md:text-5xl`) :
   nos points n'ont pas de titre court, seulement une phrase, et en inventer
   un serait du contenu fabriqué — le repère ne porte que son ordinal. Le
   faisceau violet/bleu devient de l'encre zinc, les `dark:` partent (la
   variante suit l'OS ici, pas une classe). Et surtout sa mécanique : la
   source MESURE le rail en `useState` posé dans un `useEffect` — interdit
   ici, `react-hooks/set-state-in-effect` est en ERREUR — puis pilote sa
   hauteur en `useScroll`. Le rail est étiré par `top: 0; bottom: 0` : plus
   rien à mesurer, plus de JavaScript, et le remplissage passe en animation
   liée au défilement, en CSS.

   ÉCARTS ASSUMÉS. Monde CLAIR (`.offres` sans `--sombre`, comme les quatre
   pages produit rapatriées), là où les trois gabarits hérités sont en
   `offres--sombre`. Composant SERVEUR de bout en bout : aucun état, aucun
   hook. Le remplissage du rail n'est qu'un bonus — au repos le trait est
   PLEIN, et sans JavaScript, sans `animation-timeline` ou en mouvement
   réduit, il est déjà fini. Un chapô de section absent laisse le titre seul,
   jamais un bloc vide ni une formule interpolée générique ; les TITRES
   gardent le repli mot pour mot de GabaritHome. La pastille « SUR VOS
   OUTILS » perd son point vert et garde son texte.
   ══════════════════════════════════════════════════════════════════════ */

/* `role` arrive de la route AVEC son séparateur. `sansNom()` (app/offres/
   [system]/page.tsx) ampute « PULSE · le point du matin » du nom du paquet,
   puis nettoie le reste avec une expression dont la classe de caractères
   énumère l'espace, le deux-points, le tiret demi-cadratin et le trait
   d'union — mais PAS le point médian, qui est justement le séparateur des
   six titres de lib/content.ts. Elle mange donc l'espace de tête et laisse
   « · le point du matin ». Vérifié au nœud sur les trois formes.

   La route ne m'appartient pas et je n'y touche pas : on rattrape ici, et
   seulement à l'affichage. Le jour où la route est corrigée, ce nettoyage
   devient sans effet — il n'entre jamais en conflit avec elle. */
const SEPARATEURS = /^[\s·:–—-]+/;
const roleNet = (r: string) => r.replace(SEPARATEURS, "");

function EnTete({
  pastille,
  titre,
  chapo,
}: {
  pastille: string;
  titre: string;
  chapo?: string;
}) {
  return (
    <div className="gfr-entete">
      <div data-reveal>
        <span className="o-pill">{pastille}</span>
      </div>
      <h2 data-reveal className="o-h2 gfr-titre">
        {titre}
      </h2>
      {chapo ? (
        <p data-reveal className="o-lead gfr-chapo">
          {chapo}
        </p>
      ) : null}
    </div>
  );
}

export default function GabaritFrise({
  m,
  fiche,
  role,
  paragraphes,
  autres,
}: GabaritProps) {
  const sections = fiche.sections;

  return (
    <div className="offres gfr">
      {/* ════════ 1 · HERO ════════ */}
      <section data-monde="clair" className="o-gris gfr-hero">
        <div
          aria-hidden
          className="o-dots o-dots-fade gfr-dots"
        />
        <div className="o-wrap gfr-hero-inner">
          <div className="gfr-hero-grille">
            <div>
              <div data-reveal className="gfr-fil">
                <Link href="/offres" className="o-pill o-pill--xs">
                  ← Nos offres
                </Link>
                <span className="o-pill o-pill--xs">{m.famille.tag}</span>
              </div>

              <div data-reveal className="gfr-identite">
                <SystemLogo system={m.system} />
                <div>
                  <div className="gfr-nom">{m.system}</div>
                  <div className="o-small">{roleNet(role)}</div>
                </div>
              </div>

              {/* Le pitch tient le rôle du H1 : c'est la promesse du paquet. */}
              <h1 data-reveal className="o-h2 gfr-h1">
                {fiche.pitch}
              </h1>

              <p data-reveal className="o-lead gfr-lead">
                {paragraphes[0]}
              </p>

              <div data-reveal className="gfr-actions">
                <Link href="/commencer" className="o-btn o-btn--primary">
                  Demander un diagnostic
                </Link>
                <Link href="#fonctionnement" className="o-btn o-btn--ghost">
                  Voir le fonctionnement
                  <Chevron taille={13} />
                </Link>
              </div>

              {fiche.outils.length ? (
                <>
                  <div data-reveal className="gfr-pastilles">
                    <PastillesOutils outils={fiche.outils} />
                  </div>
                  <div data-reveal className="gfr-outils">
                    <span className="o-pill o-pill--xs">
                      <span aria-hidden className="gfr-point" />
                      SUR VOS OUTILS
                    </span>
                    <span className="o-small">{fiche.outils.join(" · ")}</span>
                  </div>
                </>
              ) : null}
            </div>

            <div data-reveal className="gfr-media">
              <DemoFiche demo={fiche.demo} />
              {sections?.situationChapo ? (
                <p className="gfr-legende">{sections.situationChapo}</p>
              ) : null}

              {/* VAULT n'a pas de photo et n'en a jamais eu : la colonne se
                  referme sur la maquette, sans cadre vide. */}
              {fiche.photo ? (
                <div className="o-photo gfr-photo">
                  <Image
                    src={fiche.photo}
                    alt={fiche.photoAlt ?? ""}
                    fill
                    sizes="(max-width: 1024px) 100vw, 404px"
                  />
                  <span className="o-pill o-pill--xs o-pill--verre gfr-etiquette">
                    {m.famille.tag}
                  </span>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {/* ════════ 2 · LA FRISE — l'objet repris d'aceternity/timeline ════════

          C'est ici que les deux fiches se ressemblent le plus : une suite
          dont l'ORDRE est le propos. Le rail et son faisceau tiennent la
          lecture, le repère numéroté reste en vue le temps du bloc. */}
      {fiche.points.length ? (
        <section
          id="fonctionnement"
          data-monde="clair"
          className="gfr-section scroll-mt-24"
        >
          <div className="o-wrap">
            <EnTete
              pastille="Périmètre"
              titre={sections?.pointsTitre ?? `${m.system} en quatre points.`}
              chapo={sections?.pointsChapo}
            />
            <div className="gfr-frise">
              <span aria-hidden className="gfr-rail">
                <span className="gfr-jauge" />
              </span>
              <ol className="gfr-liste">
                {fiche.points.map((pt, i) => (
                  <li key={pt} className="gfr-entree">
                    <div className="gfr-marque">
                      <span aria-hidden className="gfr-jeton">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                    </div>
                    <div data-reveal className="gfr-corps">
                      <p className="gfr-enonce">{pt}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>
      ) : null}

      {/* ════════ 3 · LE DÉTAIL ════════ */}
      <section data-monde="clair" className="gfr-section">
        <div className="o-wrap">
          <EnTete
            pastille="Le détail"
            titre="Le fonctionnement dans le détail."
            chapo={sections?.detailChapo}
          />
          <div className="gfr-prose">
            {paragraphes.map((para, i) => (
              <p key={i} data-reveal className="o-body gfr-para">
                {para}
              </p>
            ))}
          </div>
        </div>
      </section>

      {/* ════════ 4 · EN MARCHE ════════ */}
      <section data-monde="clair" className="gfr-section">
        <div className="o-wrap">
          <EnTete
            pastille="Fonctionnement"
            titre={
              sections?.marcheTitre ?? "Un déclencheur, une chaîne, votre validation."
            }
            chapo={sections?.marcheChapo}
          />
          <div className="gfr-grille gfr-decale">
            <div data-reveal className="gfr-bloc">
              <h3 className="o-h5">Vous gardez la main</h3>
              <p className="o-body gfr-bloc-texte">{fiche.controle}</p>
            </div>
            {sections?.outilsChapo ? (
              <div data-reveal className="gfr-bloc">
                <h3 className="o-h5">Sur vos outils</h3>
                <p className="o-body gfr-bloc-texte">{sections.outilsChapo}</p>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {/* ════════ 5 · INTÉGRATIONS ════════ */}
      {fiche.outils.length ? (
        <section data-monde="clair" className="gfr-section">
          <div className="o-wrap">
            <EnTete
              pastille="Intégrations"
              titre={sections?.integrationsTitre ?? "Intégré à votre environnement."}
              chapo={
                sections?.integrationsChapo ??
                "Messagerie, tableur, paiement, e-commerce, agenda : le système lit et écrit dans les outils où vos équipes travaillent déjà, sans compte à créer ni migration."
              }
            />
          </div>
          <div data-reveal className="gfr-bandeau">
            <BandeauOutilsMoteur outils={fiche.outils} />
          </div>
          <div data-reveal className="gfr-grilleoutils">
            <GrilleOutils />
          </div>
        </section>
      ) : null}

      {/* ════════ 6 · PENSÉ POUR ════════ */}
      {fiche.cible.length ? (
        <section data-monde="clair" className="gfr-section">
          <div className="o-wrap">
            <EnTete
              pastille="Pensé pour"
              titre="À qui ce système s'adresse."
              chapo={sections?.cibleChapo}
            />
            <div className="gfr-cibles">
              {fiche.cible.map((c) => (
                <div key={c} data-reveal className="gfr-cible">
                  <h3 className="o-h5">{c}</h3>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* ════════ 7 · CE QUI EST COMPRIS ════════
          Les quatre cartes sont reprises MOT POUR MOT de GabaritHome : ce
          sont des règles du desk, pas du contenu de fiche. */}
      <section data-monde="clair" className="gfr-section gfr-bande">
        <div className="o-wrap">
          <EnTete
            pastille="Inclus"
            titre="Ce qui vient avec le système."
            chapo={
              sections?.comprisChapo ??
              "Le système n'est que la partie visible. Ce qui suit est livré avec lui, sans supplément."
            }
          />
          <div className="gfr-grille gfr-decale">
            <div data-reveal className="gfr-bloc">
              <h3 className="o-h5">Une file de validation</h3>
              <p className="o-body gfr-bloc-texte">
                Tout ce qui doit partir y passe. Vos équipes approuvent, corrigent ou suspendent, aussi longtemps que vous le jugez utile.
              </p>
            </div>
            <div data-reveal className="gfr-bloc">
              <h3 className="o-h5">Un journal de tout ce qui est parti</h3>
              <p className="o-body gfr-bloc-texte">
                Chaque envoi est daté, archivé et consultable, ce qui vous donne la preuve le jour où un client conteste avoir été relancé.
              </p>
            </div>
            <div data-reveal className="gfr-bloc">
              <h3 className="o-h5">Vos données restent chez vous</h3>
              <p className="o-body gfr-bloc-texte">
                Chaque entreprise dispose d&apos;un espace chiffré et distinct, hébergé dans l&apos;Union européenne. Seul le strict nécessaire est transmis aux modèles, tâche par tâche.
              </p>
            </div>
            <div data-reveal className="gfr-bloc">
              <h3 className="o-h5">Le Chèque TIC vérifié</h3>
              <p className="o-body gfr-bloc-texte">
                Pour les entreprises immatriculées en Guadeloupe et éligibles, la Région finance une partie de l&apos;installation. L&apos;éligibilité est vérifiée pendant le diagnostic, avant tout engagement de votre part.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ════════ 8 · LES AUTRES SYSTÈMES ════════ */}
      {autres.length ? (
        <section data-monde="clair" className="gfr-section">
          <div className="o-wrap">
            <div data-reveal>
              <span className="o-pill">Catalogue</span>
            </div>
            <h2 data-reveal className="o-h2 gfr-titre">
              {NOMBRES[autres.length] ?? autres.length} autre
              {autres.length > 1 ? "s" : ""} système
              {autres.length > 1 ? "s" : ""}.
            </h2>
            {sections?.catalogueChapo ? (
              <p data-reveal className="o-lead gfr-chapo">
                {sections.catalogueChapo}
              </p>
            ) : null}
            <div data-reveal className="gfr-lien">
              <Link href="/offres" className="o-link">
                Voir toutes les offres
                <Chevron />
              </Link>
            </div>
          </div>
          <div data-reveal className="gfr-bandeau">
            <BandeauAutresMoteurs moteurs={autres} />
          </div>
        </section>
      ) : null}

      {/* ════════ 9 · FAQ ════════
          Bloc partagé avec les trois gabarits hérités : il porte déjà sa
          propre enveloppe de section (o-wrap + pb-[110px]). */}
      <BlocFaq faq={fiche.faq} chapo={sections?.faqChapo} />
    </div>
  );
}
