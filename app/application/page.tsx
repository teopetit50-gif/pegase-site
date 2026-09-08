import type { Metadata } from "next";
import Link from "next/link";
import PageShell from "@/components/PageShell";
import PageMotion from "@/components/PageMotion";
import { COCKPIT_URL } from "@/lib/supabase/config";

/* ══════════════════════════════════════════════════════════════════════
   /application — « Omega dans votre poche » (08/09/2026, seconde passe
   le même jour)

   Demande des associés : « une page pour télécharger l'application, dans
   l'espace client et après l'achat ». Le 07/09, Teo a rendu l'espace
   client installable sur l'écran d'accueil du téléphone (manifeste,
   service worker, bandeau d'invitation sur /espace et carte « Sur votre
   téléphone » dans /espace/profil du cockpit). Mais l'installation ne
   peut se faire QUE depuis app.omegaai.fr — c'est ce domaine qui porte le
   manifeste. Le site ne peut donc que GUIDER, puis renvoyer : c'est le
   rôle de cette page.

   Seconde passe (08/09) — décision des associés : le client doit pouvoir
   « télécharger le cockpit sur son bureau ou son téléphone » depuis une
   page. Le cockpit a donc désormais une page PUBLIQUE,
   app.omegaai.fr/installer, avec UN bouton « Installer Omega » quand le
   navigateur le permet (Chrome et Edge — Android, Windows, Mac) et les
   gestes Safari sinon. Cette page s'aligne dessus :
     · le bouton principal « Installer sur cet appareil » mène à
       /installer ; « Ouvrir mon espace » passe en lien, et « Mon compte »
       quitte le premier écran (il est dans l'en-tête et le pied) ;
     · le QR (public/qr-application.svg, régénéré) pointe sur /installer :
       scanné depuis un ordinateur, il ouvre la page d'installation sur le
       téléphone — un bouton sur Android, les trois gestes sur iPhone ;
     · l'ordinateur est couvert : une troisième carte (Windows et Mac,
       Chrome ou Edge), le chapô, l'item 04 de la frise et la question
       « Et sur un ordinateur ? » le disent.

   Ce qu'elle dit, dans l'ordre :
     1. le premier écran — l'idée en une phrase, « Installer sur cet
        appareil » (la page d'installation du cockpit), « Ouvrir mon
        espace », et un QR pour qui lit cette page sur un ordinateur :
        l'appareil photo du téléphone l'ouvre sur app.omegaai.fr/installer ;
     2. selon votre appareil — trois cartes jumelles : Android (Chrome : le
        bouton « Installer Omega », ou le menu ⋮), iPhone / iPad (Safari :
        Partager, « Sur l'écran d'accueil », Ajouter) et ordinateur (Chrome
        ou Edge : le bouton, ou l'icône d'installation de la barre
        d'adresse ; Omega s'ouvre dans sa fenêtre, icône dans le menu
        Démarrer et la barre des tâches, le Dock sur Mac). Les textes iPhone
        reprennent les trois gestes, dans le même ordre, de
        components/espace/invite-installation.tsx du cockpit — la
        formulation est adaptée : ici on ne sait pas sur quel appareil on
        est lu, et le bouton Partager n'est pas au même endroit sur iPhone
        et sur iPad (revue 08/09). Sous la grille, deux notes : Safari sur
        iPhone (un lien ouvert depuis WhatsApp ou un e-mail s'ouvre
        ailleurs : passer par Safari), et la première ouverture — sur
        iPhone, l'application installée a son propre stockage, le client
        ressaisit une fois son mot de passe (ou un code reçu par e-mail),
        puis la session est gardée ; Firefox sur ordinateur n'installe pas ;
     3. ce que ça change — quatre points, en frise sobre (celle de
        /tarifs/site) ;
     4. avant d'installer — l'application ouvre l'espace client : sans
        compte ni installation faite, tout commence par /tarifs ;
     5. quatre questions qu'on nous pose (hors réseau, changement
        d'appareil, ordinateur, retirer l'application).

   Face au client on dit « application », jamais le nom de la technique.
   Chrome, Edge, Safari et Firefox sont nommés : ce sont SES outils, et le
   geste dépend d'eux.

   Qui mène ici : la section « L'application Omega » de /compte, l'écran
   « Créneau réservé » de /installation, l'e-mail de bienvenue (cockpit),
   et le pied de page — la seule entrée où un client la recherche
   spontanément. Le lien « Installer l'application » de la carte cockpit
   de /compte, lui, va droit sur /installer.

   Composant serveur, sans état : la page ne sait pas sur quel appareil
   elle est lue (c'est /installer, côté cockpit, qui détecte et propose le
   bon geste), elle montre les trois. Le QR (public/qr-application.svg)
   porte déjà ses 4 modules de zone de repos — les modules vont de 4 à 33
   sur une grille de 37 ; le cadre blanc de 16 px, bordé d'un filet,
   l'élargit (≈ 35 px à 176 px) et pose le code dans la carte. Les styles
   sont préfixés .ap- dans globals.css, sous .resa comme tout le monde
   clair ; la grille des trois cartes est en Tailwind (une colonne, puis
   deux + une dès 640 px, trois dès 1024 px).

   Relecture (08/09, après la seconde passe) — six retouches de justesse,
   aucune de forme : la description meta tient sous 160 caractères (Google
   coupait la fin) ; la carte QR ne promet plus « un bouton et c'est fait »
   — scanné par un iPhone, le code ouvre Safari, qui n'a pas de bouton ;
   l'étape 2 Android nomme les deux libellés du menu ⋮ de Chrome (« Ajouter
   à l'écran d'accueil » ou « Installer l'application »), comme le cockpit ;
   « Safari sur Mac ne le propose pas » était faux depuis macOS 14 (Fichier
   → « Ajouter au Dock ») : on conseille Chrome ou Edge sans l'affirmer ;
   « Firefox n'installe pas » vaut sur ordinateur (Firefox pour Android
   installe) ; et l'application « n'en garde aucun » (de vos chiffres) sur
   l'appareil — elle garde bien la session, la note d'à côté le dit.

   Une règle d'écriture (revue 08/09) : quand un texte JSX s'étend sur
   plusieurs lignes ET contient une entité (&nbsp;, &apos;), le
   compilateur perd l'espace qui suit la balise précédente — « Installer
   »dans le bandeau. On écrit donc {" "} après la balise, partout où du
   texte suit une balise en changeant de ligne.
   ══════════════════════════════════════════════════════════════════════ */

export const metadata: Metadata = {
  title: "L'application Omega sur votre téléphone et votre ordinateur | Omega.AI",
  description:
    "Votre espace Omega s'installe comme une application sur téléphone, PC ou Mac, sans boutique : un bouton sur Android et sur ordinateur, trois gestes sur iPhone.",
};

/* les trois gestes, dans l'ordre où on nous les demande : le téléphone
   d'abord (Android, puis iPhone), l'ordinateur ensuite (08/09, seconde
   passe). Chacun commence sur app.omegaai.fr/installer — la page
   d'installation du cockpit, publique, qui montre le bouton quand le
   navigateur le permet. */
const GESTES = [
  {
    id: "android",
    titre: "Android",
    sousTitre: "Chrome, Samsung Internet ou Edge",
    etapes: [
      <>Ouvrez app.omegaai.fr/installer dans Chrome.</>,
      <>
        Touchez <strong>«&nbsp;Installer Omega&nbsp;»</strong>. S&apos;il n&apos;y a pas de
        bouton&nbsp;: menu <strong>⋮</strong>{" "}en haut à droite, puis{" "}
        <strong>«&nbsp;Ajouter à l&apos;écran d&apos;accueil&nbsp;»</strong>{" "}
        (ou <strong>«&nbsp;Installer l&apos;application&nbsp;»</strong>).
      </>,
      <>Confirmez. L&apos;icône Omega est sur votre écran d&apos;accueil.</>,
    ],
  },
  {
    id: "iphone",
    titre: "iPhone / iPad",
    sousTitre: "Safari",
    etapes: [
      <>Ouvrez app.omegaai.fr/installer dans Safari.</>,
      <>
        Touchez le bouton <strong>Partager</strong>{" "}
        (le carré avec une flèche&nbsp;: en bas au milieu sur iPhone, en haut à droite sur iPad),
        puis <strong>«&nbsp;Sur l&apos;écran d&apos;accueil&nbsp;»</strong>.
      </>,
      <>
        Touchez <strong>«&nbsp;Ajouter&nbsp;»</strong>, en haut à droite. Omega apparaît parmi vos
        applications.
      </>,
    ],
  },
  {
    id: "ordinateur",
    titre: "Ordinateur",
    sousTitre: "Windows et Mac — Chrome ou Edge",
    etapes: [
      <>Ouvrez app.omegaai.fr/installer dans Chrome ou Edge.</>,
      <>
        Cliquez <strong>«&nbsp;Installer Omega&nbsp;»</strong>{" "}
        (ou la petite icône d&apos;installation à droite de la barre d&apos;adresse).
      </>,
      <>
        Confirmez. Omega s&apos;ouvre dans sa fenêtre, avec son icône dans le menu Démarrer et la
        barre des tâches — le Dock sur Mac.
      </>,
    ],
  },
];

/* les espaces insécables ( ) sont écrites en dur dans les chaînes :
   ces textes ne passent pas par du JSX */
const CHANGE = [
  {
    n: "01",
    titre: "Un toucher",
    texte: "L'icône ouvre directement votre espace, sans navigateur ni adresse à retaper.",
  },
  {
    n: "02",
    titre: "Plein écran",
    texte: "Plus de barre d'adresse : votre espace occupe tout l'écran, comme une application.",
  },
  {
    n: "03",
    titre: "Toujours à jour",
    texte: "Rien à mettre à jour, jamais : vous ouvrez, vous avez la dernière version.",
  },
  {
    n: "04",
    titre: "Compris dans l'abonnement",
    texte: "Rien de plus à payer, et presque rien à stocker sur votre téléphone ou votre ordinateur.",
  },
];

const QUESTIONS = [
  {
    q: "Ça marche sans réseau ?",
    r: "Non : vos chiffres sont vivants, l'application va les chercher à chaque ouverture. Elle n'en garde aucun sur l'appareil, y compris pour votre sécurité.",
  },
  {
    q: "Je change de téléphone ou d'ordinateur ?",
    r: "Recommencez depuis cette page, ou depuis « Mon profil » dans votre espace. Vos données ne sont pas sur l'appareil, rien n'est perdu.",
  },
  {
    q: "Et sur un ordinateur ?",
    r: "Oui, avec Chrome ou Edge : Omega s'ouvre dans sa propre fenêtre, comme un logiciel, avec une icône dans le menu Démarrer (ou le Dock). Firefox ne le propose pas, et sur Mac le plus simple reste Chrome ou Edge : sinon, le site fait très bien l'affaire.",
  },
  {
    q: "Comment la retirer ?",
    r: "Comme n'importe quelle application : un appui long sur l'icône du téléphone, un clic droit sur celle de l'ordinateur. Votre espace reste ouvert sur le site.",
  },
];

export default function ApplicationPage() {
  const installer = `${COCKPIT_URL}/installer`;
  const espace = `${COCKPIT_URL}/espace`;

  return (
    <PageShell>
      <PageMotion />
      <div className="resa">
        {/* ═══ 1 — premier écran : l'idée, le bouton, le QR ═══ */}
        <section data-monde="clair" className="r-wrap pb-14 pt-14 sm:pb-20 sm:pt-20">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-center lg:gap-16">
            <div>
              <div data-arrivee="titre">
                <p className="ap-kicker">Votre espace client</p>
                <h1 className="r-h1 mt-4 max-w-[14ch]">Omega dans votre poche.</h1>
              </div>
              <p data-arrivee="chapo" className="r-lead mt-5 max-w-[46ch]">
                Votre espace client s&apos;installe sur l&apos;écran d&apos;accueil de votre
                téléphone, et sur votre ordinateur, comme une application&nbsp;: une icône, un
                toucher, votre entreprise. Rien à télécharger sur une boutique.
              </p>
              {/* 08/09, seconde passe — le bouton mène à la page d'installation
                  du cockpit, publique : « Installer Omega » quand le navigateur
                  le permet, les gestes Safari sinon. « Mon compte » a quitté ce
                  bloc : il est dans l'en-tête et le pied. */}
              <div data-arrivee="bloc" className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
                <a href={installer} className="r-btn r-btn--noir">
                  Installer sur cet appareil
                </a>
                <a href={espace} className="r-lien">
                  Ouvrir mon espace
                </a>
              </div>
            </div>

            {/* la carte QR — pour qui lit sur un ordinateur : l'appareil
                photo du téléphone ouvre la page d'installation du cockpit —
                un bouton sur Android, trois gestes sur iPhone (Safari n'a
                pas de bouton). Le SVG porte déjà sa zone de repos
                (4 modules) ; le cadre blanc de 16 px l'élargit et pose le
                code dans la carte. */}
            <div data-arrivee="colonne" className="ap-carte ap-qr">
              <div className="ap-qr-cadre">
                {/* eslint-disable-next-line @next/next/no-img-element -- un SVG statique, rien à optimiser */}
                <img src="/qr-application.svg" alt="" width={176} height={176} />
              </div>
              <p className="ap-qr-texte">
                Sur un ordinateur&nbsp;? Scannez ce code avec l&apos;appareil photo de votre
                téléphone&nbsp;: il ouvre la page d&apos;installation — un bouton sur Android,
                trois gestes sur iPhone.
              </p>
              <p className="num ap-qr-adresse">app.omegaai.fr/installer</p>
            </div>
          </div>
        </section>

        {/* ═══ 2 — selon votre appareil : Android, iPhone, ordinateur ═══ */}
        <section id="gestes" data-monde="clair" className="r-wrap scroll-mt-24 pb-16 sm:pb-24">
          <h2 data-reveal className="r-h3 max-w-[20ch]">
            Selon votre appareil
          </h2>
          <p data-reveal className="r-body mt-4 max-w-[58ch]">
            Pas de boutique, pas de téléchargement&nbsp;: c&apos;est votre navigateur qui pose
            l&apos;icône. Un bouton sur Android et sur ordinateur, trois gestes sur iPhone — une
            seule fois.
          </p>

          {/* trois cartes jumelles, enfants directs de la grille : elles
              prennent la même hauteur. Une colonne sur téléphone, deux + une
              dès 640 px, trois dès 1024 px (08/09, seconde passe : la carte
              ordinateur). Les notes sont posées SOUS la grille, pleine
              largeur — un temps sous la seule carte iPhone, la note Safari
              décalait les bords inférieurs des cartes (revue 08/09). */}
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {GESTES.map((g) => (
              <article key={g.id} data-reveal className="ap-carte">
                <h3 className="r-h4">{g.titre}</h3>
                <p className="ap-sous">{g.sousTitre}</p>
                <ol className="ap-etapes">
                  {g.etapes.map((e, i) => (
                    <li key={i} className="ap-etape">
                      <span className="ap-num" aria-hidden="true">
                        {i + 1}
                      </span>
                      <span>{e}</span>
                    </li>
                  ))}
                </ol>
              </article>
            ))}
          </div>
          <p data-reveal className="ap-note mt-4">
            Sur iPhone et iPad, le plus simple est Safari&nbsp;: c&apos;est lui qui propose
            «&nbsp;Sur l&apos;écran d&apos;accueil&nbsp;». Si vous avez ouvert ce lien depuis WhatsApp
            ou un e-mail, ouvrez d&apos;abord la page dans Safari.
          </p>
          <p data-reveal className="ap-note mt-3">
            À la première ouverture, l&apos;application vous demande une fois votre mot de passe
            (ou un code reçu par e-mail), puis garde votre session. Sur ordinateur, Firefox
            n&apos;installe pas les applications&nbsp;: passez par Chrome ou Edge.
          </p>
        </section>

        {/* ═══ 3 et 4 — ce que ça change, puis avant d'installer : une bande
               blanche, la frise de /tarifs/site puis l'encart gris ═══ */}
        <div className="r-blanc">
          <section data-monde="clair" className="r-wrap pt-14 sm:pt-20">
            <h2 data-reveal className="r-h3 max-w-[16ch]">
              Ce que ça change
            </h2>
            <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
              {CHANGE.map((c) => (
                <div key={c.n} data-reveal className="ap-frise">
                  <span aria-hidden className="ap-frise-filet" />
                  <span className="ap-frise-num">{c.n}</span>
                  <h3 className="ap-frise-titre">{c.titre}</h3>
                  <p className="ap-frise-texte">{c.texte}</p>
                </div>
              ))}
            </div>
          </section>

          <section data-monde="clair" className="r-wrap pb-14 pt-14 sm:pb-20 sm:pt-16">
            <div data-reveal className="ap-encart">
              <h2 className="r-h4">Avant d&apos;installer</h2>
              <p className="mt-3 max-w-[60ch] text-[15px] leading-[24px] text-[#3d3d3d]">
                L&apos;application ouvre votre espace client&nbsp;: il faut un compte Omega et une
                installation faite. Si vous n&apos;avez pas encore réservé votre réunion
                d&apos;installation, tout commence par la grille des tarifs.
              </p>
              <div className="mt-5">
                <Link href="/tarifs" className="r-btn r-btn--fil">
                  Choisir mes postes
                </Link>
              </div>
            </div>
          </section>
        </div>

        {/* ═══ 5 — les questions ═══ */}
        <section id="questions" data-monde="clair" className="r-wrap py-14 sm:py-20">
          <div className="grid gap-8 lg:grid-cols-[379px_1fr] lg:gap-16">
            <h2 data-reveal className="r-h3 lg:sticky lg:top-28 lg:self-start">
              Questions
            </h2>
            <dl>
              {QUESTIONS.map((q) => (
                <div key={q.q} data-reveal className="ap-question">
                  <dt>{q.q}</dt>
                  <dd>{q.r}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
      </div>
    </PageShell>
  );
}
