/* Visuels de /offres/moteurs — 25/07/2026.

   Seconde page de référence (la home ocoya.com) : mêmes objets, contenu
   Omega. Comme pour /offres, aucune capture produit n'est empruntée — les
   maquettes sont dessinées en HTML/CSS. Les marques d'outils viennent de
   `simple-icons` (paths et couleurs officiels), déjà utilisé par
   components/logos.tsx pour les logos moteurs.

   Règle inchangée : aucun chiffre client inventé. Les montants, dates et
   volumes affichés sont des exemples visuels, jamais des résultats mesurés. */

import type { ReactNode } from "react";
import {
  siAirtable,
  siAsana,
  siCalendly,
  siDropbox,
  siFacebook,
  siGmail,
  siGooglecalendar,
  siGoogledrive,
  siGoogleforms,
  siGooglemeet,
  siGooglesheets,
  siHubspot,
  siInstagram,
  siMailchimp,
  siN8n,
  siNotion,
  siPaypal,
  siQuickbooks,
  siSage,
  siShopify,
  siStripe,
  siTelegram,
  siTrello,
  siTypeform,
  siWhatsapp,
  siWoocommerce,
  siWordpress,
  siZapier,
  siZoom,
} from "simple-icons";

type Marque = { path: string; title: string; hex: string };

/* ——————————————————————————————————————————————————————————
   Marques d'outils
   —————————————————————————————————————————————————————————— */

/* Les 29 outils sur lesquels un moteur peut se brancher. L'ordre mélange
   volontairement les familles (messagerie, tableur, paiement, e-commerce)
   pour que le bandeau ne donne pas l'impression d'une seule catégorie. */
export const OUTILS: Marque[] = [
  siGmail, siGooglesheets, siWhatsapp, siGoogledrive, siStripe, siShopify,
  siNotion, siGooglecalendar, siTelegram, siQuickbooks, siWoocommerce, siAirtable,
  siDropbox, siPaypal, siZapier, siN8n, siTrello, siHubspot,
  siMailchimp, siCalendly, siTypeform, siAsana, siWordpress, siSage,
  siGoogleforms, siGooglemeet, siZoom, siFacebook, siInstagram,
];

export function Pastille({ marque }: { marque: Marque }) {
  return (
    <span className="o-chip" title={marque.title}>
      <svg viewBox="0 0 24 24" role="img" aria-label={marque.title} fill={`#${marque.hex}`}>
        <path d={marque.path} />
      </svg>
    </span>
  );
}

/* Grille d'outils : trois rangées défilantes, celle du milieu à contresens.
   Chaque piste contient deux fois la même série — c'est ce doublon qui rend
   la boucle invisible au moment où translateX atteint -50 %. */
export function GrilleOutils() {
  const rangees = [
    { items: OUTILS.slice(0, 10), inverse: false, lent: false },
    { items: OUTILS.slice(10, 20), inverse: true, lent: true },
    { items: OUTILS.slice(19, 29), inverse: false, lent: false },
  ];
  return (
    <div className="flex flex-col gap-5">
      {rangees.map((r, i) => (
        <div key={i} className="o-marquee">
          <div
            className={`o-marquee-piste gap-5 ${r.inverse ? "o-marquee-piste--inverse" : ""} ${
              r.lent ? "o-marquee-piste--lent" : ""
            }`}
          >
            {[...r.items, ...r.items].map((m, j) => (
              <Pastille key={`${m.title}-${j}`} marque={m} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* Pile du hero — cinq pastilles qui se chevauchent, comme la rangée
   d'avatars de la référence. Chevauchement de 20 px sur 60, anneau blanc
   pour détacher chaque disque du précédent. */
export function PileOutils() {
  const cinq = [siGmail, siGooglesheets, siWhatsapp, siStripe, siQuickbooks];
  return (
    <div className="flex items-center">
      {cinq.map((m, i) => (
        <span
          key={m.title}
          className="o-chip ring-4 ring-[color:var(--chip-anneau)]"
          style={{ marginLeft: i === 0 ? 0 : -20, zIndex: cinq.length - i }}
          title={m.title}
        >
          <svg viewBox="0 0 24 24" role="img" aria-label={m.title} fill={`#${m.hex}`}>
            <path d={m.path} />
          </svg>
        </span>
      ))}
    </div>
  );
}

/* Bandeau de confiance — section propre sous le hero, comme la référence.
   Gris et désaturé : c'est une preuve, pas une accroche. */
export function BandeauOutils() {
  const dix = OUTILS.slice(0, 10);
  return (
    <div className="o-marquee">
      <div className="o-marquee-piste o-marquee-piste--lent items-center gap-16">
        {[...dix, ...dix].map((m, i) => (
          <span
            key={`${m.title}-${i}`}
            className="flex shrink-0 items-center gap-2.5 opacity-40"
            title={m.title}
          >
            <svg viewBox="0 0 24 24" width="26" height="26" fill="#3f3f46" role="img" aria-label={m.title}>
              <path d={m.path} />
            </svg>
            <span className="whitespace-nowrap text-[19px] font-semibold tracking-[-0.02em] text-[#3f3f46]">
              {m.title}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ——————————————————————————————————————————————————————————
   Primitives
   —————————————————————————————————————————————————————————— */

function Carte({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`overflow-hidden rounded-[16px] border border-black/[0.06] bg-white ${className}`}
      style={{ boxShadow: "0 1px 2px rgba(9,9,11,0.05), 0 16px 34px -18px rgba(9,9,11,0.2)" }}
    >
      {children}
    </div>
  );
}

function Etiquette({ ton, children }: { ton: "vert" | "ambre" | "gris"; children: ReactNode }) {
  const tons = {
    vert: "bg-[#ecfdf5] text-[#047857]",
    ambre: "bg-[#fffbeb] text-[#b45309]",
    gris: "bg-[#f4f4f5] text-[#52525b]",
  };
  return (
    <span
      className={`inline-flex items-center rounded-[6px] px-2 py-[3px] text-[10.5px] font-semibold ${tons[ton]}`}
    >
      {children}
    </span>
  );
}

export function Chevron({ taille = 15 }: { taille?: number }) {
  return (
    <svg
      width={taille}
      height={taille}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

export function Eclair({ taille = 15 }: { taille?: number }) {
  return (
    <svg width={taille} height={taille} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M13 2 4.5 13.5H11l-1 8.5 8.5-11.5H12l1-8.5Z" />
    </svg>
  );
}

/* ——————————————————————————————————————————————————————————
   Hero — pile de trois cartes, colonne de droite
   —————————————————————————————————————————————————————————— */

export function HeroPile() {
  return (
    <div className="flex w-full flex-col gap-5">
      {/* 1 — une relance sortie du moteur, prête à valider */}
      <Carte>
        <div className="border-b border-black/[0.06] bg-[#fbfbfb] px-5 py-3.5">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-semibold text-[#52525b]">
              PAYD · relance à valider
            </span>
            <Etiquette ton="ambre">J+21</Etiquette>
          </div>
        </div>
        <div className="px-5 py-4">
          <div className="text-[15px] font-semibold tracking-[-0.01em] text-[#09090b]">
            Facture FA-2402 · SARL Bertine
          </div>
          <p className="mt-2 text-[14px] leading-[1.7] text-[#71717a]">
            Bonjour Madame Bertine, votre facture FA-2402 arrive à échéance.
            Souhaitez-vous que je vous renvoie le lien de paiement ?
          </p>
          <div className="mt-4 flex items-center gap-2">
            <span className="rounded-[7px] bg-[#18181b] px-3 py-1.5 text-[12px] font-semibold text-white">
              Envoyer
            </span>
            <span className="rounded-[7px] border border-black/10 px-3 py-1.5 text-[12px] font-semibold text-[#52525b]">
              Corriger
            </span>
            <span className="ml-auto text-[12px] text-[#a1a1aa]">3 780 €</span>
          </div>
        </div>
      </Carte>

      {/* 2 — la carte « capacité », icône + titre + une ligne */}
      <Carte>
        <div className="px-6 py-6">
          <span className="text-[#09090b]">
            <svg
              width="36"
              height="36"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.7}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M13 2 4.5 13.5H11l-1 8.5 8.5-11.5H12l1-8.5Z" />
            </svg>
          </span>
          <div className="mt-5 text-[20px] font-semibold tracking-[-0.02em] text-[#09090b]" style={{ fontFamily: "var(--font-jakarta)" }}>
            Douze moteurs, un catalogue
          </div>
          <p className="mt-2 text-[15px] leading-[1.7] text-[#71717a]">
            Défensifs, offensifs, sectoriels. On installe celui qui a le
            meilleur retour chez vous — jamais les douze.
          </p>
        </div>
      </Carte>

      {/* 3 — la conversation traitée pendant la nuit */}
      <Carte>
        <div className="flex items-center justify-between border-b border-black/[0.06] bg-[#fbfbfb] px-5 py-3.5">
          <span className="flex items-center gap-2.5">
            <span className="h-6 w-6 rounded-full bg-[#25d366]/15" />
            <span className="text-[12px] font-semibold text-[#52525b]">
              ANSWR · dimanche 21 h 46
            </span>
          </span>
          <Etiquette ton="vert">Répondu</Etiquette>
        </div>
        <div className="space-y-2.5 px-5 py-4">
          <div className="max-w-[80%] rounded-[12px] rounded-tl-[4px] bg-[#f4f4f5] px-3 py-2.5 text-[13px] leading-[1.6] text-[#3f3f46]">
            Bonsoir, vous faites les vidanges le samedi ?
          </div>
          <div className="ml-auto max-w-[88%] rounded-[12px] rounded-tr-[4px] bg-[#18181b] px-3 py-2.5 text-[13px] leading-[1.6] text-white">
            Bonsoir ! Oui, de 8 h à 13 h. Il me reste deux créneaux samedi
            prochain — je vous en réserve un ?
          </div>
        </div>
      </Carte>
    </div>
  );
}

/* ——————————————————————————————————————————————————————————
   Illustrations des cartes moteurs (rangée de trois)
   —————————————————————————————————————————————————————————— */

export function IllustrationPayd() {
  return (
    <Carte className="w-full">
      <div className="space-y-1.5 px-4 py-4">
        {[
          { t: "Devis DV-0891", s: "Relance J+3 programmée", e: "gris" as const, l: "Demain" },
          { t: "Facture FA-2402", s: "2ᵉ relance envoyée", e: "ambre" as const, l: "J+21" },
          { t: "Facture FA-2418", s: "Réglée après relance", e: "vert" as const, l: "Soldée" },
        ].map((r) => (
          <div
            key={r.t}
            className="flex items-center gap-3 rounded-[9px] border border-black/[0.05] bg-[#fcfcfc] px-3 py-2.5"
          >
            <div className="min-w-0 flex-1">
              <div className="truncate text-[12.5px] font-semibold text-[#09090b]">{r.t}</div>
              <div className="text-[11px] text-[#a1a1aa]">{r.s}</div>
            </div>
            <Etiquette ton={r.e}>{r.l}</Etiquette>
          </div>
        ))}
      </div>
    </Carte>
  );
}

export function IllustrationAnswr() {
  return (
    <Carte className="w-full">
      <div className="space-y-2.5 px-4 py-5">
        <div className="max-w-[80%] rounded-[12px] rounded-tl-[4px] bg-[#f4f4f5] px-3 py-2.5 text-[12.5px] leading-[1.6] text-[#3f3f46]">
          Vous êtes ouverts demain matin ?
        </div>
        <div className="ml-auto max-w-[88%] rounded-[12px] rounded-tr-[4px] bg-[#18181b] px-3 py-2.5 text-[12.5px] leading-[1.6] text-white">
          Oui, dès 7 h 30. Je vous réserve un créneau ?
        </div>
        <div className="text-right text-[11px] text-[#a1a1aa]">Répondu en 40 s</div>
      </div>
    </Carte>
  );
}

export function IllustrationOffload() {
  return (
    <Carte className="w-full">
      <div className="px-4 py-4">
        <div className="mb-2.5 flex items-center justify-between">
          <span className="text-[11.5px] font-semibold text-[#52525b]">18 pièces classées</span>
          <Etiquette ton="vert">Prêt cabinet</Etiquette>
        </div>
        <div className="space-y-1.5">
          {[
            { f: "EDF_2026-07-04.pdf", m: "312,40 €" },
            { f: "Sodexo-Antilles.pdf", m: "1 084,00 €" },
            { f: "Loyer-atelier.pdf", m: "950,00 €" },
          ].map((r) => (
            <div
              key={r.f}
              className="flex items-center gap-3 rounded-[9px] border border-black/[0.05] bg-[#fcfcfc] px-3 py-2.5"
            >
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-[6px] bg-[#f4f4f5] text-[9px] font-bold text-[#a1a1aa]">
                PDF
              </span>
              <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-[#09090b]">
                {r.f}
              </span>
              <span
                className="text-[12px] font-semibold text-[#09090b]"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {r.m}
              </span>
            </div>
          ))}
        </div>
      </div>
    </Carte>
  );
}

/* ——————————————————————————————————————————————————————————
   Chaînes de workflow — comment un moteur s'enclenche
   —————————————————————————————————————————————————————————— */

type Noeud = { label: string; ton: string; icone: string; source?: boolean; decale?: boolean };

function GlypheNoeud({ d }: { d: string }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={d} />
    </svg>
  );
}

export function ChaineWorkflow({ noeuds }: { noeuds: Noeud[] }) {
  return (
    <div className="relative py-2">
      {/* rail vertical — il passe DERRIÈRE les nœuds, d'où le z-0/z-10 */}
      <div aria-hidden className="absolute bottom-6 left-1/2 top-6 z-0 w-px -translate-x-1/2 bg-black/[0.09]" />
      <div className="relative z-10 flex flex-col gap-3">
        {noeuds.map((n, i) => (
          <div
            key={n.label + i}
            className={`flex ${n.decale ? "justify-end pr-2" : "justify-start pl-2"}`}
          >
            <span className={`o-noeud ${n.source ? "o-noeud--source" : ""}`}>
              <span className="o-noeud-icone" style={{ background: n.ton }}>
                <GlypheNoeud d={n.icone} />
              </span>
              {n.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const I = {
  horloge: "M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  mail: "M3 7l9 6 9-6M3 5h18v14H3V5Z",
  plume: "M4 20 20 4M14 4h6v6M9 15l-4 4",
  check: "M20 6 9 17l-5-5",
  doc: "M14 3H6v18h12V7l-4-4ZM14 3v4h4",
  robot: "M9 3h6M12 3v3M5 6h14v12H5V6ZM9 11h.01M15 11h.01M9 15h6",
  flux: "M4 6h10M4 12h16M4 18h8",
  carte: "M2 8h20M2 6h20v12H2V6Z",
};

export const CHAINES: Record<string, Noeud[]> = {
  facture: [
    { label: "Facture émise", ton: "#f4f4f5", icone: I.doc, source: true },
    { label: "Attendre l'échéance", ton: "#18181b", icone: I.horloge },
    { label: "Rédiger la relance", ton: "#18181b", icone: I.plume, decale: true },
    { label: "Vous validez, ça part", ton: "#2563eb", icone: I.check },
  ],
  message: [
    { label: "Message WhatsApp reçu", ton: "#f4f4f5", icone: I.mail, source: true, decale: true },
    { label: "Chercher dans votre base", ton: "#18181b", icone: I.robot },
    { label: "Répondre ou transférer", ton: "#2563eb", icone: I.check, decale: true },
  ],
  piece: [
    { label: "Pièce reçue par mail", ton: "#f4f4f5", icone: I.mail, source: true },
    { label: "Extraire et contrôler", ton: "#18181b", icone: I.doc },
    { label: "Classer et horodater", ton: "#dc2626", icone: I.flux, decale: true },
    { label: "Transmettre au cabinet", ton: "#2563eb", icone: I.check },
  ],
};

/* ——————————————————————————————————————————————————————————
   Bandeau des messages réellement produits par les moteurs
   —————————————————————————————————————————————————————————— */

const MESSAGES = [
  {
    moteur: "PAYD",
    canal: "E-mail",
    teinte: "#18181b",
    texte:
      "Bonjour Monsieur Lémard, votre facture FA-2418 est arrivée à échéance vendredi. Je vous remets le lien de paiement — dites-moi si un échelonnement vous arrange.",
  },
  {
    moteur: "ANSWR",
    canal: "WhatsApp",
    teinte: "#25d366",
    texte:
      "Bonsoir ! Oui, nous sommes ouverts samedi de 8 h à 13 h. Il me reste deux créneaux — je vous en réserve un à votre nom ?",
  },
  {
    moteur: "REVIVE",
    canal: "E-mail",
    teinte: "#7c3aed",
    texte:
      "Bonjour Madame Nadeau, cela fait huit mois depuis votre dernière commande. Nous avons rentré la finition que vous cherchiez — je vous mets de côté un échantillon ?",
  },
  {
    moteur: "BRIEF",
    canal: "Message du matin",
    teinte: "#0ea5e9",
    texte:
      "7 h. Encaissé hier : 2 140 €. Trois relances parties. Un retard critique : SARL Bertine, 3 780 €, J+21. Deux clients à rappeler.",
  },
  {
    moteur: "REACH",
    canal: "E-mail",
    teinte: "#f59e0b",
    texte:
      "Bonjour, je vois que vous équipez les cuisines professionnelles sur Grande-Terre. Nous fournissons la pièce détachée en 48 h depuis Jarry — cela vous intéresse d'en parler ?",
  },
];

export function BandeauMessages() {
  const doubles = [...MESSAGES, ...MESSAGES];
  return (
    <div className="o-marquee">
      <div className="o-marquee-piste o-marquee-piste--lent gap-6">
        {doubles.map((m, i) => (
          <div key={`${m.moteur}-${i}`} className="w-[400px] shrink-0">
            <Carte>
              <div className="px-5 py-5">
                <div className="flex items-center gap-3">
                  <span
                    className="grid h-10 w-10 place-items-center rounded-full text-[11px] font-bold text-white"
                    style={{ background: m.teinte }}
                  >
                    {m.moteur.slice(0, 2)}
                  </span>
                  <div>
                    <div className="text-[14px] font-semibold tracking-[-0.01em] text-[#09090b]">
                      {m.moteur}
                    </div>
                    <div className="text-[12.5px] text-[#a1a1aa]">{m.canal}</div>
                  </div>
                </div>
                <p className="mt-4 text-[14px] leading-[1.75] text-[#52525b]">{m.texte}</p>
                <div className="mt-4 flex items-center gap-2 border-t border-black/[0.06] pt-3">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#22c55e]" />
                  <span className="text-[12px] text-[#a1a1aa]">Validé avant envoi</span>
                </div>
              </div>
            </Carte>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ——————————————————————————————————————————————————————————
   Maquettes du bento « Ce qui est compris »
   —————————————————————————————————————————————————————————— */

export function MaqValidation() {
  return (
    <Carte className="w-full">
      <div className="border-b border-black/[0.06] bg-[#fbfbfb] px-4 py-2.5 text-[11.5px] font-semibold text-[#52525b]">
        File de validation — 3 messages en attente
      </div>
      <div className="space-y-1.5 px-4 py-3.5">
        {[
          { t: "Relance FA-2402 · SARL Bertine", e: "À valider" },
          { t: "Réponse WhatsApp · devis toiture", e: "Envoyé" },
          { t: "Relance DV-0891 · Ti Punch", e: "Suspendu" },
        ].map((r) => (
          <div
            key={r.t}
            className="flex items-center gap-3 rounded-[9px] border border-black/[0.05] bg-[#fcfcfc] px-3 py-2.5"
          >
            <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-[#09090b]">
              {r.t}
            </span>
            <span className="shrink-0 text-[11.5px] text-[#a1a1aa]">{r.e}</span>
          </div>
        ))}
      </div>
    </Carte>
  );
}

export function MaqJournal() {
  return (
    <Carte className="w-full">
      <div className="px-4 py-4">
        <div className="mb-3 text-[11.5px] font-semibold text-[#52525b]">
          Journal — tout ce qui est parti
        </div>
        <div className="space-y-2">
          {[
            { h: "07:02", t: "Brief du matin envoyé" },
            { h: "09:14", t: "Relance FA-2418 · Garage Lémard" },
            { h: "11:38", t: "Réponse WhatsApp · horaires samedi" },
            { h: "16:20", t: "3 pièces classées → cabinet" },
          ].map((r) => (
            <div key={r.h} className="flex items-center gap-3 text-[12.5px]">
              <span
                className="w-11 shrink-0 font-semibold text-[#a1a1aa]"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {r.h}
              </span>
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#d4d4d8]" />
              <span className="truncate text-[#3f3f46]">{r.t}</span>
            </div>
          ))}
        </div>
      </div>
    </Carte>
  );
}

export function MaqLocal() {
  return (
    <div className="flex flex-wrap gap-2.5">
      {["Espace dédié par client", "Hébergé UE", "RGPD", "Chiffré au repos", "Export à tout moment", "Journal d'accès"].map(
        (b) => (
          <span
            key={b}
            className="inline-flex items-center gap-1.5 rounded-full border border-black/[0.08] bg-white px-3 py-1.5 text-[12.5px] font-medium text-[#3f3f46]"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M20 6 9 17l-5-5" />
            </svg>
            {b}
          </span>
        )
      )}
    </div>
  );
}

export function MaqOutils() {
  const six = [siGmail, siGooglesheets, siWhatsapp, siStripe, siShopify, siQuickbooks];
  return (
    <div className="flex flex-wrap gap-2.5">
      {six.map((m) => (
        <span
          key={m.title}
          className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-2 text-[13px] font-medium text-[#09090b]"
          style={{
            boxShadow:
              "0 1px 2px rgba(9,9,11,0.06), 0 8px 18px -12px rgba(9,9,11,0.2), 0 0 0 1px rgba(9,9,11,0.05)",
          }}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill={`#${m.hex}`} role="img" aria-label={m.title}>
            <path d={m.path} />
          </svg>
          {m.title}
        </span>
      ))}
    </div>
  );
}

export function MaqEtapes() {
  return (
    <div className="space-y-2.5">
      {[
        { n: "01", t: "Audit — 30 min", d: "Votre problème n°1, chiffré." },
        { n: "02", t: "Raccordement", d: "Une demi-journée sur vos outils." },
        { n: "03", t: "Cycle supervisé", d: "Vous validez, on cale les réglages." },
      ].map((e) => (
        <div
          key={e.n}
          className="flex items-start gap-3 rounded-[10px] border border-black/[0.06] bg-white px-3.5 py-3"
        >
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#18181b] text-[10px] font-bold text-white">
            {e.n}
          </span>
          <div>
            <div className="text-[13px] font-semibold text-[#09090b]">{e.t}</div>
            <div className="text-[12px] leading-[1.6] text-[#71717a]">{e.d}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function MaqCheque() {
  return (
    <Carte className="w-full">
      <div className="px-4 py-4">
        <div className="flex items-baseline justify-between">
          <span className="text-[11.5px] font-semibold text-[#52525b]">Chèque TIC</span>
          <span className="text-[11.5px] text-[#a1a1aa]">TPE Guadeloupe</span>
        </div>
        <div
          className="mt-2 text-[30px] font-semibold tracking-[-0.03em] text-[#09090b]"
          style={{ fontFamily: "var(--font-jakarta)" }}
        >
          jusqu&apos;à 10 000 €
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[#f4f4f5]">
          <div className="h-full w-[80%] rounded-full bg-[#18181b]" />
        </div>
        <p className="mt-3 text-[12.5px] leading-[1.6] text-[#71717a]">
          Part de l&apos;installation finançable pour les entreprises
          éligibles. L&apos;éligibilité se vérifie pendant l&apos;audit, avant
          tout engagement.
        </p>
      </div>
    </Carte>
  );
}
