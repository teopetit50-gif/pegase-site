"use client";

/* Maquettes produit haute-fidélité des quatre moteurs (23/07, Teo — d'après
   les captures Qonto de refs-qonto/).

   Ce qu'on reprend de la référence : la maquette d'interface qui FLOTTE sur
   un fond en dégradé doux, la profondeur obtenue par superposition de cartes
   qui débordent les unes sur les autres, les grandes ombres portées très
   douces, les détails d'UI crédibles (cadre de téléphone, ticks de lecture,
   pastilles de statut, chips d'accent), un seul accent de couleur par visuel
   et beaucoup de vide autour.

   Ce qu'on ne reprend pas : aucun visuel, logo ou capture de Qonto. Tout est
   redessiné en HTML/CSS/SVG avec le contenu Pegase. Règle
   refs-qonto/NOTES-DESIGN.md.

   Les scènes sombres réintroduisent volontairement du noir sur la page
   claire : c'est le geste Qonto (leurs sections e-invoicing et comptabilité
   sont noires), pas un oubli de la passe « tout clair » du 23/07 au matin.

   Les données affichées (noms, montants, dates) sont des exemples, validés
   comme tels par Teo. */

import type { ReactNode } from "react";

/* ——————————————————————————————————————————————————————————
   Primitives partagées
   —————————————————————————————————————————————————————————— */

/* Ombre « produit » : une passe large et très diffuse pour décoller l'objet
   du fond, une passe courte pour poser le contact. C'est ce double étage qui
   fait la différence entre une carte à plat et une carte qui flotte. */
const OMBRE_XL = "0 50px 90px -35px rgba(15,16,19,0.38), 0 10px 26px -10px rgba(15,16,19,0.16)";
const OMBRE_MD = "0 22px 44px -20px rgba(15,16,19,0.32), 0 4px 12px -4px rgba(15,16,19,0.12)";
const OMBRE_SM = "0 12px 26px -12px rgba(15,16,19,0.30), 0 2px 6px -2px rgba(15,16,19,0.10)";

function SceneClaire({ children }: { children: ReactNode }) {
  return (
    <div
      className="relative isolate flex min-h-[420px] items-center justify-center overflow-hidden rounded-[26px] px-4 py-12 sm:min-h-[520px] sm:px-10 sm:py-16"
      style={{
        background:
          "radial-gradient(120% 90% at 50% 0%, #ffffff 0%, #f4f4f3 52%, #e9e9e7 100%)",
      }}
    >
      {children}
    </div>
  );
}

/* 23/07 (Teo, 3e passe) : trois tons, du plus foncé au plus clair —
   la SECTION « En situation » est NOIRE (bande pleine largeur, voir
   ServiceDetail + MOCKUP_SOMBRE) ; la SCÈNE ici est un panneau GRIS à
   dégradé ; les WIDGETS (CarteSombre) sont NOIRS par-dessus. Le contraste
   du widget vient de ce panneau gris, jamais du noir de la section. */
function SceneSombre({ children }: { children: ReactNode }) {
  return (
    <div
      className="relative isolate flex min-h-[360px] items-center justify-center overflow-hidden rounded-[24px] px-4 py-12 sm:min-h-[440px] sm:px-10 sm:py-16"
      style={{
        background:
          "radial-gradient(125% 95% at 50% 16%, #35363b 0%, #2a2b2f 50%, #202124 100%)",
      }}
    >
      {children}
    </div>
  );
}

/* Les services dont la maquette est sombre : leur section « En situation »
   bascule en bande grisée pleine largeur, texte clair. */
export const MOCKUP_SOMBRE = new Set(["PAYD", "OFFLOAD"]);

/* Pastille de statut — point coloré + libellé, sur clair ou sur sombre */
function Pastille({
  children,
  accent,
  sombre = false,
}: {
  children: ReactNode;
  accent: string;
  sombre?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${
        sombre ? "bg-white/[0.08] text-white/85" : "bg-black/[0.05] text-[#0f1013]"
      }`}
    >
      <span
        aria-hidden
        className="h-[6px] w-[6px] rounded-full"
        style={{ background: accent }}
      />
      {children}
    </span>
  );
}

/* Double tick de lecture, façon messagerie */
function Ticks({ couleur }: { couleur: string }) {
  return (
    <svg width="16" height="11" viewBox="0 0 16 11" fill="none" aria-hidden>
      <path
        d="M1 6.2 3.4 8.6 8.6 2.4"
        stroke={couleur}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6.6 6.4 8.6 8.6 14.6 2.4"
        stroke={couleur}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Check({ couleur, taille = 14 }: { couleur: string; taille?: number }) {
  return (
    <svg width={taille} height={taille} viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="8" cy="8" r="8" fill={couleur} />
      <path
        d="M4.6 8.2 6.9 10.5 11.4 5.8"
        stroke="#fff"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* Cadre de téléphone — bezel sombre, écran clair, haut-parleur */
function Telephone({ children }: { children: ReactNode }) {
  return (
    <div
      className="relative w-[270px] shrink-0 rounded-[38px] p-[9px] sm:w-[300px] sm:rounded-[42px]"
      style={{
        background: "linear-gradient(160deg, #34373d 0%, #101216 45%, #26292e 100%)",
        boxShadow: OMBRE_XL,
      }}
    >
      <div className="relative overflow-hidden rounded-[30px] bg-white sm:rounded-[34px]">
        <span
          aria-hidden
          className="absolute left-1/2 top-[7px] z-20 h-[5px] w-[52px] -translate-x-1/2 rounded-full bg-black/25"
        />
        {children}
      </div>
    </div>
  );
}

/* ——————————————————————————————————————————————————————————
   ANSWR — conversation dans un téléphone, sur fond clair
   Accent : bleu (ticks de lecture)
   —————————————————————————————————————————————————————————— */

/* 23/07 (Teo, 2e passe) : couleurs PRO, pas WhatsApp. Bulles entrantes gris
   clair, bulles sortantes charbon (blanc dessus) — monochrome. Conversation
   raccourcie pour un widget compact, pas un téléphone qui s'étire. Carte
   « Rendez-vous confirmé » supprimée. */
const CONVERSATION = [
  { de: "client", t: "Bonsoir, vous faites des devis pour une rénovation de salle de bain ?", h: "23:04" },
  { de: "bot", t: "Oui — sur place, après une visite de 30 min. Jeudi 14 h ou vendredi 9 h ?", h: "23:04" },
  { de: "client", t: "Jeudi 14 h, parfait.", h: "23:09" },
  { de: "bot", t: "C'est noté. Rappel envoyé la veille.", h: "23:09" },
] as const;

function MockANSWR() {
  return (
    <SceneClaire>
      <div className="relative">
        <Telephone>
          {/* en-tête de conversation */}
          <div className="flex items-center gap-3 border-b border-black/[0.07] bg-white px-4 pb-3 pt-6">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0f1013] text-[14px] font-semibold text-white">
              A
            </span>
            <div className="min-w-0">
              <div className="text-[14px] font-semibold leading-tight text-[#0f1013]">ANSWR</div>
              <div className="flex items-center gap-1.5">
                <span aria-hidden className="h-[6px] w-[6px] rounded-full bg-[#22c55e]" />
                <span className="text-[11px] text-[#6d7178]">en ligne</span>
              </div>
            </div>
          </div>

          {/* fil de messages */}
          <div className="space-y-2 bg-[#f6f6f5] px-3 py-4">
            {CONVERSATION.map((m, i) => {
              const sortant = m.de === "bot";
              return (
                <div key={i} className={`flex ${sortant ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[86%] rounded-[16px] px-3 py-2 ${
                      sortant ? "bg-[#1e1f22]" : "bg-white"
                    }`}
                    style={{ boxShadow: sortant ? "none" : "0 1px 1px rgba(15,16,19,0.08)" }}
                  >
                    <p
                      className={`text-[12px] leading-[1.45] ${
                        sortant ? "text-white" : "text-[#0f1013]"
                      }`}
                    >
                      {m.t}
                    </p>
                    <div className="mt-1 flex items-center justify-end gap-1">
                      <span className={`text-[10px] ${sortant ? "text-white/45" : "text-[#8b8e95]"}`}>
                        {m.h}
                      </span>
                      {sortant && <Ticks couleur="rgba(255,255,255,0.6)" />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* barre de saisie */}
          <div className="flex items-center gap-2 border-t border-black/[0.07] bg-white px-3 py-2.5">
            <div className="flex-1 rounded-full bg-[#f0f0ee] px-3 py-2 text-[12px] text-[#8b8e95]">
              Message
            </div>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1e1f22]">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
                <path
                  d="M2 8h11M8.5 3.5 13 8l-4.5 4.5"
                  stroke="#fff"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </div>
        </Telephone>

        {/* pastille flottante — le temps de réponse (seul élément qui déborde) */}
        <div
          className="absolute -bottom-5 left-0 rounded-full bg-white px-3.5 py-2 sm:-left-32 sm:bottom-20"
          style={{ boxShadow: OMBRE_SM }}
        >
          <div className="flex items-baseline gap-2">
            <span className="text-[15px] font-bold tracking-[-0.02em] text-[#0f1013]">&lt; 1 min</span>
            <span className="text-[11px] text-[#6d7178]">temps de réponse</span>
          </div>
        </div>
      </div>
    </SceneClaire>
  );
}

/* ——————————————————————————————————————————————————————————
   OFFLOAD — cartes sombres empilées, le flux d'une facture
   Accent : turquoise (statut « À jour »)
   —————————————————————————————————————————————————————————— */

const TURQUOISE = "#2dd4bf";

function CarteSombre({
  children,
  className = "",
  ombre = OMBRE_MD,
}: {
  children: ReactNode;
  className?: string;
  ombre?: string;
}) {
  return (
    <div
      className={`rounded-[20px] border border-white/[0.06] ${className}`}
      style={{
        /* 23/07 (Teo, 2e passe) : les widgets doivent être NOIRS et le fond
           de la scène GRISÉ — l'inverse de la 1re passe. Le contraste vient
           du fond gris derrière, pas d'un widget gris. */
        background: "linear-gradient(180deg, #141518 0%, #0b0c0e 100%)",
        boxShadow: ombre,
      }}
    >
      {children}
    </div>
  );
}

/* 23/07 (Teo, 2e passe) : UNE seule carte noire au centre, plus de pile de
   cartes superposées, mêmes polices sans que Qonto, sur le fond grisé de la
   section. */
function MockOFFLOAD() {
  return (
    <SceneSombre>
      <CarteSombre className="w-full max-w-[380px] p-5" ombre={OMBRE_XL}>
        <div className="flex items-center justify-between gap-4">
          <span className="text-[15px] font-semibold text-white">Caraïbe Pièces Auto</span>
          <ChipStatut couleur={TURQUOISE} check>
            À jour
          </ChipStatut>
        </div>
        <div className="mt-4 space-y-2.5">
          <Ligne k="Montant HT" v="1 240,00 €" />
          <Ligne k="TVA 8,5 %" v="105,40 €" />
          <Ligne k="Montant TTC" v="1 345,40 €" fort />
        </div>
        <div className="mt-4 flex items-center gap-3 border-t border-white/[0.08] pt-4">
          <IconeRecu />
          <div className="min-w-0 flex-1">
            <div className="text-[13.5px] font-semibold text-white">Dossier de juillet</div>
            <div className="mt-0.5 text-[12px] text-white/45">classée · prête pour le comptable</div>
          </div>
        </div>
      </CarteSombre>
    </SceneSombre>
  );
}

/* ——————————————————————————————————————————————————————————
   PAYD — deux cartes grises qui se chevauchent sur fond noir
   Construction reprise de la réf. Qonto « Simplify your accounting » :
   en-tête (entité + chip de statut à check plein), lignes « label : valeur »
   en sans, ligne à icône reçu. Tout en Inter (plus de mono, 23/07 Teo).
   Le bouton vert « Payée » est retiré : le paiement se lit comme un chip
   discret dans l'en-tête, façon chip « Active » de Qonto.
   Accent : vert (uniquement le check du chip payé)
   —————————————————————————————————————————————————————————— */

const VERT = "#22c55e";

/* Chip de statut façon Qonto : pilule grise, texte blanc, rondelle colorée
   (check plein si résolu, simple point sinon). */
function ChipStatut({
  children,
  couleur,
  check = false,
}: {
  children: ReactNode;
  couleur: string;
  check?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.09] px-2.5 py-1 text-[12.5px] font-medium text-white">
      {check ? (
        <Check couleur={couleur} taille={14} />
      ) : (
        <span className="h-[7px] w-[7px] rounded-full" style={{ background: couleur }} />
      )}
      {children}
    </span>
  );
}

/* Ligne « label : valeur » inline, alignée à gauche comme chez Qonto
   (« Start date: Apr 17 »). */
function Ligne({ k, v, fort = false }: { k: string; v: string; fort?: boolean }) {
  return (
    <div className="text-[13.5px] leading-snug">
      <span className="text-white/45">{k} : </span>
      <span
        className={
          fort
            ? "font-semibold tabular-nums text-white"
            : "font-medium tabular-nums text-white/90"
        }
      >
        {v}
      </span>
    </div>
  );
}

function IconeRecu() {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/[0.08]">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
        <path
          d="M3.5 2h9v12l-1.5-1-1.5 1-1.5-1-1.5 1-1.5-1z"
          stroke="rgba(255,255,255,0.72)"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        <path
          d="M5.6 5.4h4.8M5.6 8h4.8"
          stroke="rgba(255,255,255,0.72)"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}

function MockPAYD() {
  return (
    <SceneSombre>
      <div className="relative w-full max-w-[430px]">
        {/* carte arrière — une autre facture du pipeline, partiellement masquée */}
        <CarteSombre className="w-[84%] p-5">
          <div className="flex items-center justify-between gap-4">
            <span className="text-[15px] font-semibold text-white">Ébénisterie Nadège</span>
            <ChipStatut couleur="#f59e0b">Échue</ChipStatut>
          </div>
          <div className="mt-4 space-y-2.5">
            <Ligne k="Facture" v="FAC-2026-0187" />
            <Ligne k="Relance" v="J+3 · envoyée" />
          </div>
        </CarteSombre>

        {/* carte avant — la facture résolue, décalée en diagonale. Pas de
            translate-x : le panneau gris est overflow-hidden, un décalage
            latéral rognerait la carte. Le chevauchement vient de ml-auto
            (droite) + -mt-6 (remontée) sur la carte arrière alignée à gauche. */}
        <CarteSombre className="relative z-10 -mt-6 ml-auto w-[90%] p-5" ombre={OMBRE_XL}>
          <div className="flex items-center justify-between gap-4">
            <span className="text-[15px] font-semibold text-white">SARL Corbin &amp; Fils</span>
            <ChipStatut couleur={VERT} check>
              Payée
            </ChipStatut>
          </div>
          <div className="mt-4 space-y-2.5">
            <Ligne k="Facture" v="FAC-2026-0182" />
            <Ligne k="Montant" v="1 250,00 €" fort />
          </div>
          <div className="mt-4 flex items-center gap-3 border-t border-white/[0.08] pt-4">
            <IconeRecu />
            <div className="min-w-0 flex-1">
              <div className="text-[13.5px] font-semibold text-white">
                Réglée après relance J+10
              </div>
              <div className="mt-0.5 text-[12px] text-white/45">encaissée le 18/07 · 1 250 €</div>
            </div>
          </div>
        </CarteSombre>
      </div>
    </SceneSombre>
  );
}

/* ——————————————————————————————————————————————————————————
   REVIVE — le fichier client dormant, sur fond clair
   Accent : or (la charte Pegase)
   —————————————————————————————————————————————————————————— */

const OR = "#b7861f";

function MockREVIVE() {
  const dormants = [
    { i: "ML", n: "Mme Larcher", d: "dernier achat il y a 14 mois", v: "1 240 €" },
    { i: "JP", n: "M. Prudent", d: "dernier achat il y a 9 mois", v: "870 €" },
    { i: "SR", n: "Mme Sainte-Rose", d: "dernier achat il y a 11 mois", v: "1 610 €" },
  ];

  return (
    <SceneClaire>
      <div className="relative w-full max-w-[430px]">
        {/* la carte principale */}
        <div
          className="relative z-10 rounded-2xl bg-white p-5"
          style={{ boxShadow: OMBRE_XL }}
        >
          <div className="flex items-center justify-between gap-4">
            <span className="text-[14px] font-semibold text-[#0f1013]">
              Clients dormants détectés
            </span>
            <Pastille accent={OR}>3 sur 148</Pastille>
          </div>

          <ul className="mt-4 divide-y divide-black/[0.06]">
            {dormants.map((c) => (
              <li key={c.i} className="flex items-center gap-3 py-3">
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold"
                  style={{ background: "rgba(183,134,31,0.12)", color: OR }}
                >
                  {c.i}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-medium text-[#0f1013]">{c.n}</div>
                  <div className="mt-0.5 truncate text-[11.5px] text-[#6d7178]">{c.d}</div>
                </div>
                <span className="shrink-0 text-[13px] font-semibold tabular-nums text-[#0f1013]">
                  {c.v}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* carte flottante — le message de réactivation */}
        <div
          className="relative z-20 -mt-5 ml-auto w-[88%] translate-x-1 rounded-2xl bg-white p-4 sm:translate-x-8"
          style={{ boxShadow: OMBRE_MD }}
        >
          <div className="flex items-center justify-between gap-3">
            <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#8b8e95]">
              Message de réactivation
            </span>
            <Ticks couleur="#9a9da3" />
          </div>
          <p className="mt-2.5 text-[12.5px] leading-[1.55] text-[#3f4248]">
            « Bonjour Mme Larcher, ici Beauté Kréol. Votre créneau du samedi matin est à nouveau
            disponible ce mois-ci. On vous le réserve ? »
          </p>
        </div>

        {/* pastille flottante — l'état des vagues */}
        <div
          className="absolute -left-3 -bottom-7 rounded-full bg-white px-3.5 py-2 sm:-left-10"
          style={{ boxShadow: OMBRE_SM }}
        >
          <div className="flex items-center gap-2">
            <Check couleur={OR} taille={14} />
            <span className="text-[12px] font-medium text-[#0f1013]">Vague 1 envoyée</span>
            <span aria-hidden className="h-3 w-px bg-black/12" />
            <span className="text-[11.5px] text-[#6d7178]">vague 2 à J+7</span>
          </div>
        </div>
      </div>
    </SceneClaire>
  );
}

/* ——————————————————————————————————————————————————————————
   Aiguillage
   —————————————————————————————————————————————————————————— */

export default function ServiceMockup({ service }: { service: string }) {
  if (service === "ANSWR") return <MockANSWR />;
  if (service === "OFFLOAD") return <MockOFFLOAD />;
  if (service === "PAYD") return <MockPAYD />;
  if (service === "REVIVE") return <MockREVIVE />;
  return null;
}
