import Link from "next/link";
import PageShell from "@/components/PageShell";
import PageMotion from "@/components/PageMotion";
import { SystemLogo } from "@/components/logos";
import {
  BandeauOutils,
  Chevron,
  MaqCheque,
  MaqJournal,
  MaqLocal,
  MaqValidation,
} from "@/components/offres/MediaMoteurs";
import { FAMILLES, POSTS } from "@/lib/content";

/* ══════════════════════════════════════════════════════════════════════
   / — la page d'accueil (30/07/2026)

   4ᵉ page de référence : ocoya.com/affiliates. Teo voulait une home qui ne
   ressemble à aucune autre page du site — or les trois références déjà
   prises (la home, features/create, features/publish, integrations/[marque])
   sont intégralement blanches, et la fiche /offres/payd rendait exactement
   les dix mêmes sections que la version précédente de ce fichier.

   /affiliates est la seule des références restantes à ALTERNER un monde
   noir et un monde clair. C'est ce contraste qu'on reprend, et lui seul
   rend la home reconnaissable au premier coup d'œil.

   Relevé au pixel sur viewport 1440 :
     hero noir #09090b, tout centré — pastille, H1 60/72 ls −1,8 sur 700 de
     large, chapô 18/28,8, deux boutons r8 en 9/15, puis une rangée de faits
     en 24 semibold qui défile ; halo circulaire de 1306 px à 5 % et filets
     de vitesse horizontaux derrière le texte.
     Sections claires : pastille 12/14,4 → H2 48/67,2 centré sur 600 →
     chapô 18/28,8 sur 650 → contenu.

   Écart assumé, demandé par Teo : « en plus développé ». La référence tient
   en 7 sections, celle-ci en compte 10 — le bandeau d'outils, le catalogue
   des douze moteurs et les articles n'existent pas chez elle.

   30/07 — les deux boutons « Audit gratuit » pointaient sur /audit, hérité
   du code restauré. Or /audit est le DÉROULÉ du protocole, pas la page de
   réservation : le header, lui, envoie sur /reserver-un-audit. Deux boutons
   du même nom menaient donc à deux endroits différents (Teo). Repointés.

   Aucun chiffre inventé : la rangée du hero ne porte que des faits
   vérifiables (le catalogue, l'échéance légale, le taux du Chèque TIC,
   l'hébergement). Omega ne publie ni nombre de clients ni euros récupérés
   tant qu'ils ne sont pas sourcés.
   ══════════════════════════════════════════════════════════════════════ */

const HERO = {
  pastille: "Agence d'automatisation · Guadeloupe",
  titre: "Ce qui se répète n'a plus à passer par vous.",
  chapo:
    "Omega installe des moteurs d'automatisation chez les TPE des Antilles : relance des impayés, réponses clients, factures fournisseurs, prospection. Ils tournent sur les outils que vous avez déjà et ne font rien partir sans votre accord.",
};

/* Faits, pas statistiques maison : chacun est vérifiable ailleurs sur le
   site (articles) ou dans le catalogue lui-même. */
const FAITS = [
  "12 moteurs au catalogue",
  "Chèque TIC — jusqu'à 80 % financé",
  "Audit gratuit de 30 minutes",
  "Vos données restent dans vos outils",
  "Facture électronique — 1ᵉʳ septembre 2026",
];

/* Filets de vitesse du hero — positions figées (jamais d'aléatoire au
   rendu, ça casserait l'hydratation). left/top en %.

   30/07 — les largeurs étaient en PIXELS relevés sur viewport 1440. Sur un
   téléphone de 390 px, un filet de 420 px traversait donc l'écran de bord à
   bord : on ne lisait plus des stries mais des barres horizontales en
   travers du titre (Teo). Elles sont désormais exprimées en vw — même
   largeur qu'avant à 1440 (1 vw = 14,4 px), et de courtes stries partout
   ailleurs. L'opacité, elle, est divisée sur petit écran (voir .o-trait). */
/* 30/07 — RÈGLE FINALE (Teo) : un filet ne touche RIEN. Ni la pastille, ni
   les boutons, ni le titre, ni le chapô, ni le bandeau défilant.

   Ça impose une position par palier, parce que les deux tailles n'ont ni la
   même hauteur de hero ni les mêmes bandes libres, et que `t` est un
   pourcentage :

     desktop 764 px → libre 0–120 · 148–172 · 316–340 · 455–491 · 528–618 · 654–764
     mobile  717 px → libre 0–70  ·  98–122 · 259–283 · 456–492 · 528–598 · 627–717

   Sur grand écran le texte ne prend pas toute la largeur (le titre tient
   entre 340 et 1100 sur 1440), donc un filet peut aussi passer À CÔTÉ :
   c'est pourquoi `t` reste étalé sur toute la hauteur et que trois filets
   sont seulement décalés horizontalement. Sur téléphone la colonne va d'un
   bord à l'autre — aucune échappatoire latérale, les douze `tm` sont donc
   tous logés dans les six bandes libres.

   `t` = position en grand écran, `tm` = position sous 768 px. */
const TRAITS = [
  { l: 2, t: 7, tm: 2.8, w: 18.1, o: 0.5 },
  { l: 58, t: 20.7, tm: 5.6, w: 26.4, o: 0.35 },
  { l: 8, t: 27, tm: 7.8, w: 12.5, o: 0.28 },
  { l: 78, t: 33, tm: 15.3, w: 16.7, o: 0.5 },
  { l: -4, t: 42.9, tm: 37.8, w: 29.2, o: 0.4 },
  { l: 74, t: 45, tm: 65, w: 10.4, o: 0.25 },
  { l: 6, t: 52, tm: 67.2, w: 20.8, o: 0.45 },
  { l: 76, t: 58, tm: 75.3, w: 22.9, o: 0.3 },
  { l: 20, t: 65, tm: 78.4, w: 13.9, o: 0.22 },
  { l: 70, t: 76, tm: 81.5, w: 18.8, o: 0.38 },
  { l: 0, t: 79, tm: 90.4, w: 24.3, o: 0.3 },
  { l: 46, t: 89, tm: 95.1, w: 13.2, o: 0.2 },
];

const BENEFICES = [
  {
    label: "Trésorerie",
    titre: "L'argent rentre plus vite.",
    texte:
      "Aux Antilles, les délais de paiement dépassent structurellement les moyennes nationales et l'encours d'impayés des entreprises guadeloupéennes se chiffre en centaines de millions d'euros. Un devis sans réponse, une facture échue jamais rappelée : ce n'est pas du chiffre perdu d'un coup, c'est du chiffre qui s'évapore ligne par ligne. Une relance régulière change le rang auquel vos clients vous placent quand ils règlent.",
    maquette: <MaqValidation />,
  },
  {
    label: "Charge",
    titre: "La journée se dégage.",
    texte:
      "Relancer demande de retrouver le dossier, vérifier ce qui a été dit, choisir le ton. Classer les factures fournisseurs demande de ne rien perdre entre l'atelier et le cabinet. Répondre à une demande de 21 h demande d'être là à 21 h. Ces trois corvées ne valorisent pas votre métier — elles occupent seulement le temps que vous ne lui consacrez pas.",
    maquette: <MaqJournal />,
  },
];

const ETAPES = [
  {
    n: "01",
    titre: "Audit de trente minutes",
    texte:
      "On regarde ce qui vous coûte du temps et du cash, et on vérifie votre éligibilité au Chèque TIC. Gratuit, sans engagement.",
  },
  {
    n: "02",
    titre: "Un seul moteur",
    texte:
      "Celui qui a le meilleur retour chez vous. Jamais les douze : un chantier mené jusqu'au bout vaut mieux que six à moitié.",
  },
  {
    n: "03",
    titre: "Installation sur vos outils",
    texte:
      "Votre messagerie, votre tableur, votre WhatsApp. Ni compte à créer, ni migration, ni logiciel à apprendre.",
  },
  {
    n: "04",
    titre: "Vous gardez la main",
    texte:
      "Chaque envoi passe par votre file de validation. Le moteur prépare, vous décidez — et vous corrigez avant que ça parte.",
  },
  {
    n: "05",
    titre: "On mesure, on ajuste",
    texte:
      "Ce qui est parti, ce qui a été réglé, ce qui a répondu. Les réglages se corrigent sur du réel, pas sur une démo.",
  },
];

const GARANTIES = [
  {
    label: "Financement",
    titre: "Le Chèque TIC couvre jusqu'à 80 %",
    texte:
      "La Région Guadeloupe subventionne la transformation numérique des TPE, et une installation Omega entre dans le champ du dispositif. On vérifie votre éligibilité pendant l'audit, avant tout engagement, puis on monte le dossier avec vous — description technique, devis au format attendu, suivi jusqu'à la décision.",
    lien: {
      label: "Lire le détail du dispositif",
      href: "/blog/cheque-tic-financement",
    },
    maquette: <MaqCheque />,
  },
  {
    label: "Données",
    titre: "Vos fichiers ne partent nulle part",
    texte:
      "Vos données restent dans vos outils — messagerie, tableur, agenda — et le moteur vient les lire là où elles sont, au moment de la tâche, au lieu de les recopier dans une base à lui. Le jour où vous arrêtez un moteur, il n'y a rien à rapatrier : vos fichiers n'ont jamais bougé de vos outils.",
    lien: { label: "Pourquoi ce choix", href: "/blog/rgpd-donnees-locales" },
    maquette: <MaqLocal />,
  },
];

const FAQ = [
  {
    q: "Il faut changer de logiciel ?",
    a: "Non. Les moteurs se branchent sur ce que vous utilisez déjà — messagerie, tableur, WhatsApp, agenda, outil de facturation. Il n'y a ni compte à créer, ni données à migrer, ni interface à apprendre.",
  },
  {
    q: "Qu'est-ce qui part sans que je le voie ?",
    a: "Rien, sauf si vous le décidez explicitement. Par défaut chaque message est préparé par le moteur puis posé dans une file de validation : vous envoyez, vous corrigez, ou vous laissez tomber.",
  },
  {
    q: "On commence par combien de moteurs ?",
    a: "Un. Le catalogue en compte douze, mais on installe celui qui a le meilleur retour chez vous et on le mène jusqu'au bout. Les autres viennent après, s'ils se justifient.",
  },
  {
    q: "Combien ça coûte ?",
    a: "Le chiffrage sort de l'audit, parce qu'il dépend de vos outils, de votre volume et du moteur retenu. Un prix affiché ici ne voudrait pas dire grand-chose. Ce qui est certain, c'est que le Chèque TIC peut en couvrir jusqu'à 80 % si vous êtes éligible.",
  },
  {
    q: "Où sont hébergées mes données ?",
    a: "Vos fichiers restent stockés dans vos outils actuels — c'est là que les moteurs viennent les lire, tâche par tâche, sans les recopier dans une base à eux. Les modèles d'intelligence artificielle utilisés reçoivent le strict nécessaire à chaque tâche, jamais l'intégralité d'un fichier.",
  },
  {
    q: "Je suis concerné par la facture électronique ?",
    a: "Au 1ᵉʳ septembre 2026, toutes les entreprises établies en France doivent être en mesure de recevoir des factures au format structuré. L'émission suit au 1ᵉʳ septembre 2027 pour les TPE et PME. Le moteur BILLD prend le chantier dans l'ordre : audit du fichier client, conversion Factur-X, raccordement au portail public.",
  },
];

/* 30/07 (Teo) — la vitrine ne montre que les quatre moteurs les plus
   installés. C'est la reconduction de l'arbitrage du 21/07 sur la home de
   charte v2 (« trop de services », conseil externe) : les huit autres
   restent servis par URL et listés en entier sur /offres. Douze cartes
   coûtaient aussi douze ombres à peindre au défilement. */
const VEDETTES = ["PAYD", "ANSWR", "OFFLOAD", "REVIVE"];

const MOTEURS = FAMILLES.flatMap((f) => f.moteurs)
  .filter((m) => VEDETTES.includes(m.system))
  .sort((a, b) => VEDETTES.indexOf(a.system) - VEDETTES.indexOf(b.system));

/* ——— en-tête de section, commun à toutes les sections claires ——— */
function EnTete({
  pastille,
  titre,
  chapo,
}: {
  pastille: string;
  titre: string;
  chapo: string;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <div data-reveal>
        <span className="o-pill o-pill--xs">{pastille}</span>
      </div>
      <h2 data-reveal className="o-h2 mt-4 max-w-[600px]">
        {titre}
      </h2>
      <p data-reveal className="o-lead mt-4 max-w-[650px]">
        {chapo}
      </p>
    </div>
  );
}

export default function Home() {
  return (
    <PageShell>
      <PageMotion />

      <div className="offres">
        {/* ════════ 1 · HERO NUIT — tout centré ════════ */}
        <section className="o-nuit relative pb-[90px] pt-[70px] sm:pb-[110px] sm:pt-[120px]">
          {/* tout le décor sur UN calque composité (voir .o-deco) : sans lui
              le dégradé du halo se repeint à chaque image de défilement */}
          <div aria-hidden className="o-deco">
            <div className="o-halo" />
            {TRAITS.map((t, i) => (
              <span
                key={i}
                className="o-trait"
                style={
                  {
                    left: `${t.l}%`,
                    "--trait-t": t.t,
                    "--trait-tm": t.tm,
                    "--trait-w": t.w,
                    "--trait-op": t.o,
                  } as React.CSSProperties
                }
              />
            ))}
          </div>

          <div className="o-wrap relative flex flex-col items-center text-center">
            <div data-reveal>
              <span className="o-pill o-pill--xs">{HERO.pastille}</span>
            </div>
            <h1 data-reveal className="o-h1 mt-6 max-w-[760px]">
              {HERO.titre}
            </h1>
            <p data-reveal className="o-lead mt-6 max-w-[640px]">
              {HERO.chapo}
            </p>
            <div data-reveal className="mt-9 flex flex-wrap justify-center gap-3">
              <Link href="/reserver-un-audit" className="o-btn o-btn--primary">
                Audit gratuit
              </Link>
              <Link href="#catalogue" className="o-btn o-btn--ghost">
                Voir les moteurs
                <Chevron taille={13} />
              </Link>
            </div>
          </div>

          {/* rangée de faits — défilante, comme la référence */}
          <div data-reveal className="o-marquee relative mt-[70px] sm:mt-[90px]">
            <div className="o-marquee-piste o-marquee-piste--lent items-center gap-14">
              {[...FAITS, ...FAITS].map((f, i) => (
                <span
                  key={`${f}-${i}`}
                  className="flex shrink-0 items-center gap-14 whitespace-nowrap text-[19px] font-semibold tracking-[-0.02em] text-white/70 sm:text-[24px]"
                >
                  {f}
                  <span aria-hidden className="h-1 w-1 rounded-full bg-white/25" />
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ════════ 2 · LES OUTILS ════════ */}
        <section data-monde="clair" className="pb-[50px] pt-[70px]">
          <div className="o-wrap">
            <p data-reveal className="o-small text-center">
              Branché sur les outils que vous tenez déjà
            </p>
          </div>
          <div data-reveal className="mt-8">
            <BandeauOutils />
          </div>
        </section>

        {/* ════════ 3 · CE QUE ÇA CHANGE — deux colonnes symétriques ════════ */}
        <section data-monde="clair" className="py-[110px]">
          <div className="o-wrap">
            <EnTete
              pastille="CE QUE ÇA CHANGE"
              titre="Deux choses reviennent : du cash, et du temps."
              chapo="Un moteur ne fait pas de miracle et n'invente pas de clients. Il reprend une corvée, l'exécute tous les jours à la même heure, et ne l'oublie jamais — c'est exactement là que se joue la différence."
            />
            <div className="mt-16 grid grid-cols-1 gap-14 lg:grid-cols-2 lg:gap-20">
              {BENEFICES.map((b) => (
                <div key={b.label} data-reveal className="flex flex-col">
                  <div className="o-card overflow-hidden">{b.maquette}</div>
                  <p className="o-small mt-8 !text-[14px] uppercase tracking-[0.08em]">
                    {b.label}
                  </p>
                  <h3 className="o-h4 mt-2">{b.titre}</h3>
                  <p className="o-body mt-4">{b.texte}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ════════ 4 · COMMENT ÇA MARCHE — frise de cinq étapes ════════ */}
        <section data-monde="clair" className="pb-[110px]">
          <div className="o-wrap">
            <EnTete
              pastille="LE DÉROULÉ"
              titre="Comment ça se passe, dans l'ordre."
              chapo="Cinq étapes, aucune surprise entre elles. Vous savez à chaque instant ce qui a été installé, ce qui tourne et ce qui attend votre feu vert."
            />
            <div className="mt-16 grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-5 lg:gap-6">
              {ETAPES.map((e, i) => (
                <div key={e.n} data-reveal className="relative flex flex-col">
                  {/* le filet ne se dessine qu'entre deux étapes, jamais après
                      la dernière — sinon il pointe dans le vide */}
                  {i < ETAPES.length - 1 && (
                    <span
                      aria-hidden
                      className="absolute left-9 right-0 top-[15px] hidden h-px bg-[#e4e4e7] lg:block"
                    />
                  )}
                  <span className="relative z-10 inline-flex h-[30px] w-[30px] items-center justify-center rounded-full bg-[#09090b] text-[12px] font-semibold text-white">
                    {e.n}
                  </span>
                  <h3 className="o-h5 mt-5">{e.titre}</h3>
                  <p className="o-small mt-2.5 !text-[15px] !leading-[24px]">
                    {e.texte}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ════════ 5 · LE CATALOGUE — douze cartes compactes ════════ */}
        <section
          id="catalogue"
          data-monde="clair"
          className="scroll-mt-24 pb-[110px]"
        >
          <div className="o-wrap">
            <EnTete
              pastille="LE CATALOGUE"
              titre="Les quatre moteurs les plus installés."
              chapo="Le catalogue en compte douze — défensifs, offensifs, sectoriels. On n'en installe qu'un au départ, celui qui a le meilleur retour chez vous, et c'est presque toujours l'un de ces quatre."
            />
            <div className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {MOTEURS.map((m) => (
                <Link
                  key={m.system}
                  href={`/offres/${m.system.toLowerCase()}`}
                  data-reveal
                  className="o-card-soft flex flex-col p-7 transition-colors duration-200 hover:bg-white"
                >
                  <div className="flex items-center gap-3">
                    <SystemLogo system={m.system} />
                    <span className="text-[16px] font-semibold tracking-[-0.02em] text-[#09090b]">
                      {m.system}
                    </span>
                  </div>
                  <p className="o-small mt-4 !text-[15px] !leading-[23px] !text-[#52525b]">
                    {m.benefit}
                  </p>
                  <span className="o-link mt-6 !text-[14px]">
                    Voir la fiche
                    <Chevron taille={12} />
                  </span>
                </Link>
              ))}
            </div>
            {/* les huit autres ne sont pas cachés : ils vivent sur /offres */}
            <div data-reveal className="mt-10 flex justify-center">
              <Link href="/offres" className="o-btn o-btn--ghost">
                Voir les douze moteurs
                <Chevron taille={13} />
              </Link>
            </div>
          </div>
        </section>

        {/* ════════ 6 · CE QUI RESTE CHEZ VOUS — deux cartes larges ════════ */}
        <section data-monde="clair" className="pb-[110px]">
          <div className="o-wrap">
            <EnTete
              pastille="LES GARANTIES"
              titre="Ce qui reste chez vous, et ce qu'on prend en charge."
              chapo="Deux questions reviennent à chaque audit : combien ça coûte vraiment, et où vont mes données. Voilà les deux réponses, sans détour."
            />
            <div className="mt-16 grid grid-cols-1 gap-10 lg:grid-cols-2">
              {GARANTIES.map((g) => (
                <div
                  key={g.label}
                  data-reveal
                  className="o-card flex flex-col overflow-hidden"
                >
                  <div className="border-b border-[#f4f4f5]">{g.maquette}</div>
                  <div className="flex flex-1 flex-col p-8 sm:p-10">
                    <p className="o-small !text-[14px] uppercase tracking-[0.08em]">
                      {g.label}
                    </p>
                    <h3 className="o-h5 mt-2">{g.titre}</h3>
                    <p className="o-body mt-4 flex-1">{g.texte}</p>
                    <Link href={g.lien.href} className="o-link mt-6 !text-[15px]">
                      {g.lien.label}
                      <Chevron taille={12} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ════════ 7 · L'ÉCHÉANCE — retour au noir ════════ */}
        <section className="o-nuit relative py-[110px]">
          <div aria-hidden className="o-deco">
            <div className="o-halo" />
          </div>
          <div className="o-wrap relative">
            <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-20">
              <div>
                <div data-reveal>
                  <span className="o-pill o-pill--xs">ÉCHÉANCE LÉGALE</span>
                </div>
                <h2 data-reveal className="o-h2 mt-4">
                  1ᵉʳ septembre 2026.
                </h2>
                <p data-reveal className="o-lead mt-5">
                  À cette date, toutes les entreprises établies en France doivent
                  être en mesure de recevoir des factures électroniques au format
                  structuré. Pas un PDF par mail : un fichier qui transite par une
                  plateforme agréée.
                </p>
                <div data-reveal className="mt-8 flex flex-wrap gap-3">
                  <Link href="/offres/billd" className="o-btn o-btn--primary">
                    Le moteur BILLD
                  </Link>
                  <Link
                    href="/blog/facturation-electronique-2026"
                    className="o-btn o-btn--ghost"
                  >
                    Ce que la loi impose
                    <Chevron taille={13} />
                  </Link>
                </div>
              </div>
              <div data-reveal className="o-carte-nuit p-8 sm:p-10">
                <p className="o-body">
                  Le blocage ne vient presque jamais du logiciel. Il vient de la
                  qualité des données : fichiers clients sans SIREN, adresses
                  incomplètes, taux de TVA approximatifs. Chaque anomalie devient
                  une facture rejetée par la plateforme.
                </p>
                <p className="o-body mt-5">
                  Nettoyer sa base à froid coûte quelques heures. Le faire en
                  urgence, facture rejetée par facture rejetée, coûte des
                  semaines.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ════════ 8 · FAQ ════════ */}
        <section data-monde="clair" className="py-[110px]">
          <div className="o-wrap">
            <EnTete
              pastille="QUESTIONS"
              titre="Ce qu'on nous demande avant de signer."
              chapo="Les six questions qui reviennent à chaque premier rendez-vous, avec les réponses qu'on donne en vrai."
            />
            <div className="mx-auto mt-12 max-w-[800px]">
              {FAQ.map((f) => (
                <details key={f.q} className="o-faq-item">
                  <summary>
                    {f.q}
                    <span className="o-faq-croix" aria-hidden>
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={1.8}
                        strokeLinecap="round"
                      >
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                    </span>
                  </summary>
                  <p className="o-body pb-6 pr-10">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ════════ 9 · ARTICLES ════════ */}
        <section data-monde="clair" className="pb-[110px]">
          <div className="o-wrap">
            <EnTete
              pastille="À LIRE"
              titre="Le fond, pas la brochure."
              chapo="Conformité, financement, données, impayés : quatre sujets traités pour ce qu'ils sont, avec le calendrier et les chiffres qui vont avec."
            />
            <div className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {POSTS.map((p) => (
                <Link
                  key={p.slug}
                  href={`/blog/${p.slug}`}
                  data-reveal
                  className="o-card-soft flex flex-col p-8 transition-colors duration-200 hover:bg-white"
                >
                  <div className="flex items-center gap-3">
                    <span className="o-pill o-pill--xs">{p.cat}</span>
                    <span className="o-small !text-[13px]">{p.date}</span>
                  </div>
                  <h3 className="o-h5 mt-5 !text-[21px] !leading-[29px]">
                    {p.title}
                  </h3>
                  <p className="o-small mt-3 !text-[15px] !leading-[23px] !text-[#52525b]">
                    {p.excerpt}
                  </p>
                  <span className="o-link mt-6 !text-[14px]">
                    Lire
                    <Chevron taille={12} />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ════════ 10 · CTA — clôture au noir ════════ */}
        <section className="o-nuit relative py-[120px]">
          <div aria-hidden className="o-deco">
            <div className="o-halo" />
          </div>
          <div className="o-wrap relative flex flex-col items-center text-center">
            <h2 data-reveal className="o-h2 max-w-[620px]">
              On commence par regarder.
            </h2>
            <p data-reveal className="o-lead mt-5 max-w-[600px]">
              Trente minutes pour identifier ce qui vous coûte le plus, vérifier
              votre éligibilité au Chèque TIC, et dire franchement s&apos;il y a
              quelque chose à automatiser chez vous. Si la réponse est non, on le
              dit.
            </p>
            <div data-reveal className="mt-9 flex flex-wrap justify-center gap-3">
              <Link href="/reserver-un-audit" className="o-btn o-btn--primary">
                Réserver l&apos;audit gratuit
              </Link>
              <Link href="/reserver-un-audit" className="o-btn o-btn--ghost">
                Nous joindre
              </Link>
            </div>
          </div>
        </section>
      </div>
    </PageShell>
  );
}
