/* ══════════════════════════════════════════════════════════════════════
   Lorani (agences d'architecture) — Questions.tsx, « Questions fréquentes »

   COPIÉ le 24/09/2026 à 14 h 57 de `OMEGA/dossieros-site/src/components/
   faqs.tsx` (textes de la source, réécrits le 24/09 en registre
   professionnel ; rien n'est retouché). Ce qui change :

   · « Dans l&apos;Union européenne » était écrit AVEC l'entité dans une
     chaîne JavaScript : React l'affichait telle quelle, « l&apos;Union »,
     sur le site déployé. Ici une apostrophe simple.
   · Jetons clairs ; la planche d'architecte de la colonne vide passe des
     traits blancs aux traits d'encre (voir Fonctionnement.tsx).
   · L'accordéon (accordeon.tsx) ouvre et ferme par les keyframes
     `architectes-accordeon-*` d'architectes.css : `animate-accordion-*`
     venait de tw-animate-css, qui n'est pas installé ici.
   · Posée dans la marge de 30 px de la page (page.tsx).
   · REPORT du 24/09, 17 h 00 (seconde copie de la source) : une autre
     session a ajouté des fonctions au site source entre 16 h 00 et 16 h 32
     (Teo : « ajoute tout sur les sites »). Ici : huit questions de plus
     (adresse et PLU, suivi du permis, réponses des entreprises, métré,
     assurances, chantier et réception, honoraires, décennale). Dans la
     réponse sur les visas, « J-10 » porte un gluon (U+2060) après le tiret :
     il ne se coupe plus en fin de ligne (U+2011 n'existe pas dans General
     Sans, voir RAPATRIEMENT.md).
   ══════════════════════════════════════════════════════════════════════ */
/* eslint-disable @next/next/no-img-element -- planche décorative à 22 % d'opacité, masquée en CSS : pas d'optimiseur. */
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./accordeon";

const QUESTIONS = [
  {
    id: "pieces",
    q: "Quelles pièces Lorani lit-il ?",
    a: "Tout le dossier : plans, coupes, façades et nomenclatures en PDF, même scannés, ou en DWG ; CCTP, DPGF et offres des entreprises en Excel ou en PDF ; pièces du permis, fiches techniques, PV d'essais et situations de travaux. Il les rapproche ensuite entre elles.",
  },
  {
    id: "bim",
    q: "Faut-il une maquette BIM ?",
    a: "Non. Un jeu de plans en PDF suffit. Lorani ne vous demande ni de changer de logiciel ni de reprendre vos gabarits.",
  },
  {
    id: "faux",
    q: "Que se passe-t-il en cas d'erreur de lecture ?",
    a: "L'erreur se voit immédiatement, car chaque point porte l'extrait de la planche, les deux valeurs lues et l'article cité. Un point écarté ne revient pas à l'indice suivant.",
  },
  {
    id: "decide",
    q: "Qui porte la responsabilité ?",
    a: "L'architecte, comme aujourd'hui : Lorani assiste la relecture et ne certifie aucune conformité, si bien qu'un rapport sans point ne vaut pas avis favorable. Chaque contrôle est daté et conservé, ce qui documente le soin apporté au dossier.",
  },
  {
    id: "regles",
    q: "Quelles règles connaît-il ?",
    a: "Celles d'un dossier français : le règlement de la zone du PLU, les pièces PC1 à PC8, l'accessibilité, la sécurité incendie des ERP et de l'habitation, la RE2020, les DTU et le CCAG-Travaux. Vos propres checklists s'y ajoutent.",
  },
  {
    id: "adresse",
    q: "Faut-il téléverser le règlement du PLU ?",
    a: "Non. À partir de l'adresse du terrain, Lorani lit la zone du PLU et son règlement, les servitudes, les risques connus (inondation, argile, sismicité) et le périmètre des Monuments historiques, puis en déduit les pièces que le permis exigera.",
  },
  {
    id: "permis",
    q: "Lorani suit-il le permis après le dépôt ?",
    a: "Oui. Il suit le délai d'instruction, la demande de pièces complémentaires et la réponse à préparer, puis la date du permis tacite et la fin du délai de recours des tiers à partir de l'affichage. Vous savez quand le chantier peut démarrer.",
  },
  {
    id: "reponses",
    q: "Lorani suit-il les réponses des entreprises et du BET ?",
    a: "Oui. Chaque question posée garde sa date, et celle qui attend une réponse depuis plus de huit jours remonte le matin. La date butoir de chaque visa est calée sur le délai de commande de l'ouvrage : la fiche des menuiseries à dix semaines est signalée à J-\u206010.",
  },
  {
    id: "metre",
    q: "Lorani contrôle-t-il les quantités de la DPGF ?",
    a: "Oui. Il mesure les surfaces et les longueurs sur les plans, puis les compare aux quantités de la DPGF, lot par lot. Un poste sous-estimé ressort avant la consultation, là où il deviendrait sinon une plus-value de chantier.",
  },
  {
    id: "assurances",
    q: "Et les assurances des entreprises retenues ?",
    a: "Lorani lit chaque attestation décennale et vérifie que les activités couvertes correspondent au lot attribué, ainsi que les dates et le plafond. C'est un contrôle que l'architecte doit au maître d'ouvrage, et le registre en garde la date.",
  },
  {
    id: "chantier",
    q: "Lorani aide-t-il pendant le chantier et à la réception ?",
    a: "Il rédige le compte rendu de chantier à partir de vos notes et photos de visite, calcule l'incidence de chaque ordre de service sur le montant et le délai, puis suit chaque réserve jusqu'à sa levée et la fin de la garantie de parfait achèvement.",
  },
  {
    id: "honoraires",
    q: "Lorani suit-il les honoraires de l'agence ?",
    a: "Oui, phase par phase : le temps passé est rapporté aux honoraires de chaque élément de mission, de l'esquisse à la réception. Une phase qui consomme plus que prévu remonte avant la fin de la mission.",
  },
  {
    id: "decennale",
    q: "Que reste-t-il des contrôles des années plus tard ?",
    a: "Vous gardez un dossier daté, exportable en une fois : chaque point signalé, chaque visa rendu et chaque refus, avec la pièce et la date. S'il y a un sinistre des années après la réception, vous retrouvez ce que l'agence avait relevé et quand.",
  },
  {
    id: "indice",
    q: "Que se passe-t-il quand un indice change ?",
    a: "Lorani compare le nouvel indice au précédent, y compris les changements non signalés, puis ne remonte que les écarts nouveaux. Vous ne relisez pas ce qui a déjà été vu.",
  },
  {
    id: "fichiers",
    q: "Lorani modifie-t-il les fichiers de l'agence ?",
    a: "Non. Il lit vos fichiers et n'en écrit aucun. Le rapport, en PDF annoté et en Excel, est un document à part que vous gardez ou joignez au dossier.",
  },
  {
    id: "hebergement",
    q: "Où sont hébergés les dossiers ?",
    a: "Ils sont hébergés dans l'Union européenne et chiffrés pendant leur transfert comme pendant leur conservation. Ils ne servent à entraîner aucun modèle, et vous pouvez les retirer à tout moment, rapports compris.",
  },
  {
    id: "essai",
    q: "Comment l'essayer ?",
    a: "L'audit se fait sur un permis déjà instruit que vous connaissez. Vous comparez ce que Lorani relève à ce que l'instruction avait relevé, puis l'audit fixe la formule.",
  },
];

export default function Questions() {
  return (
    <div id="faqs" className="scroll-mt-24">
      <section className="py-16 md:py-20">
        <div className="relative isolate mx-auto grid max-w-7xl gap-12 px-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-20">
          {/* Planche d'architecte dans la colonne vide sous le titre (grand écran) — voir LISEZ-MOI, « touche agence ». */}
          <div
            aria-hidden="true"
            data-reveal="1"
            className="pointer-events-none absolute left-6 top-[200px] -z-10 hidden w-[min(36%,460px)] lg:block"
          >
            <img
              alt=""
              loading="lazy"
              decoding="async"
              width={1510}
              height={1090}
              src="/secteurs-architectes/plans/salles-ovales.webp"
              className="h-auto w-full select-none opacity-[0.22] [mask-image:radial-gradient(ellipse_68%_68%_at_50%_48%,black_38%,transparent_82%)]"
            />
          </div>
          <header className="max-w-md">
            <p className="text-sm text-[#0a0a0a]">Questions fréquentes</p>
            <h2 className="mt-2 text-4xl font-medium tracking-tight text-[#737373]">
              Ce que les agences demandent avant d&apos;essayer.
            </h2>
          </header>
          <Accordion type="single" collapsible defaultValue="pieces">
            {QUESTIONS.map((x) => (
              <AccordionItem key={x.id} value={x.id}>
                <AccordionTrigger>{x.q}</AccordionTrigger>
                <AccordionContent className="max-w-2xl">{x.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>
    </div>
  );
}
