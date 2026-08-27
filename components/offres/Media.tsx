/* Visuels de /offres — 25/07/2026.

   La page de référence pose des captures produit dans ses cartes. Omega n'a
   pas de produit à capturer : ces maquettes sont donc dessinées en HTML/CSS,
   au même format et à la même place (largeur pleine de la carte, arrimées au
   bord bas, écrêtées par l'overflow de .o-card). Aucun asset externe, aucun
   JS — tout est rendu côté serveur.

   Règle : ces maquettes n'inventent AUCUN chiffre client. Les montants et
   dates affichés sont des exemples visuels génériques, jamais présentés comme
   des résultats mesurés. */

import Link from "next/link";
import type { ReactNode } from "react";
import {
  LogoDrive,
  LogoExcel,
  LogoGmail,
  LogoOutlook,
  LogoSheets,
  LogoWhatsApp,
} from "./logos-outils";

/* ——————————————————————————————————————————————————————————
   Primitives partagées
   —————————————————————————————————————————————————————————— */

/* Fenêtre applicative : cadre clair, filet 1 px, ombre courte. C'est le
   contenant qui fait « capture d'écran » plutôt que « bloc de site ». */
function Fenetre({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    /* `o-demo` : la fenêtre lit ses couleurs dans les variables --demo-*
       héritées, donc elle suivrait automatiquement un conteneur sombre */
    <div className={`o-demo !rounded-[10px] ${className}`}>{children}</div>
  );
}

function BarreFenetre({ titre }: { titre: string }) {
  return (
    <div className="o-demo-tete flex items-center gap-2 px-3.5 py-2.5">
      <span className="h-2 w-2 rounded-full bg-[var(--demo-filet)]" />
      <span className="h-2 w-2 rounded-full bg-[var(--demo-filet)]" />
      <span className="h-2 w-2 rounded-full bg-[var(--demo-filet)]" />
      <span className="o-demo-faible ml-1.5 text-[11px] font-medium tracking-[0.02em]">
        {titre}
      </span>
    </div>
  );
}

function Puce({
  couleur,
  children,
}: {
  couleur: "vert" | "ambre" | "gris" | "noir";
  children: ReactNode;
}) {
  const tons = {
    vert: "o-demo-jeton--ok",
    ambre: "o-demo-jeton--warn",
    gris: "o-demo-jeton--off",
    noir: "o-demo-jalon",
  };
  return (
    <span
      className={`inline-flex items-center rounded-[6px] px-2 py-[3px] text-[10px] font-semibold tracking-[0.02em] ${tons[couleur]}`}
    >
      {children}
    </span>
  );
}

/* ——————————————————————————————————————————————————————————
   Icônes des quatre colonnes — trait 1,7 px, 44 px, style de la référence
   —————————————————————————————————————————————————————————— */

const traitIcone = {
  width: 44,
  height: 44,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function IconePrise() {
  return (
    <svg {...traitIcone} aria-hidden>
      <path d="M9 2v6" />
      <path d="M15 2v6" />
      <path d="M5 8h14v3a7 7 0 0 1-7 7 7 7 0 0 1-7-7V8Z" />
      <path d="M12 18v4" />
    </svg>
  );
}

export function IconeValidation() {
  return (
    <svg {...traitIcone} aria-hidden>
      <path d="M20 6 9 17l-5-5" />
      <path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h8" />
    </svg>
  );
}

export function IconeCoffre() {
  return (
    <svg {...traitIcone} aria-hidden>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="12" cy="12" r="3.4" />
      <path d="M12 8.6V7" />
      <path d="M7 20v1.5" />
      <path d="M17 20v1.5" />
    </svg>
  );
}

export function IconeAide() {
  return (
    <svg {...traitIcone} aria-hidden>
      <path d="M12 2.5 3.5 6v6c0 5 3.6 8.6 8.5 9.5 4.9-.9 8.5-4.5 8.5-9.5V6L12 2.5Z" />
      <path d="M9.2 12.2 11 14l4-4.2" />
    </svg>
  );
}

export function IconeFleche({ taille = 15 }: { taille?: number }) {
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

export function IconeFlecheDroite({ taille = 15 }: { taille?: number }) {
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
      <path d="M5 12h13" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

export function IconeLecture({ taille = 15 }: { taille?: number }) {
  return (
    <svg width={taille} height={taille} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M8 5.5v13l11-6.5-11-6.5Z" />
    </svg>
  );
}

/* ——————————————————————————————————————————————————————————
   Collage du hero — trois panneaux en profondeur, comme la référence
   —————————————————————————————————————————————————————————— */

const RELANCES = [
  { client: "Garage Lémard", piece: "FA-2418", montant: "1 240 €", jour: "J+7", etat: "vert" as const, libelle: "Payée" },
  { client: "SARL Bertine", piece: "FA-2402", montant: "3 780 €", jour: "J+21", etat: "ambre" as const, libelle: "Relancée" },
  { client: "Ti Punch Traiteur", piece: "DV-0891", montant: "860 €", jour: "J+3", etat: "gris" as const, libelle: "En attente" },
  { client: "Ébénisterie Nadeau", piece: "FA-2431", montant: "2 150 €", jour: "J+3", etat: "gris" as const, libelle: "En attente" },
];

/* Collage du hero — scène de 900 × 560 sur grand écran, comme la capture de
   la référence : un panneau central et deux panneaux plus petits posés en
   avant, décalés. Les trois sont positionnés en absolu DANS une scène de
   hauteur fixe, sinon les panneaux flottants débordent sur la section
   suivante (ils ne comptent pas dans le flux). Sous 1024 px la scène retombe
   en flux et les deux panneaux latéraux disparaissent : à cette largeur ils
   se chevaucheraient au lieu de se décaler. */
export function HeroCollage() {
  return (
    <div className="relative mx-auto w-full max-w-[900px] lg:h-[590px]">
      {/* panneau principal — le tableau de bord */}
      <Fenetre className="!relative z-10 mx-auto w-full max-w-[660px] lg:!absolute lg:left-1/2 lg:top-0 lg:w-[640px] lg:-translate-x-1/2">
        <BarreFenetre titre="Omega.AI : tableau de bord" />
        <div className="px-5 pb-6 pt-5">
          {/* en-tête : une seule ligne dès 480 px, empilée en dessous — à
              375 px la ligne unique cassait « 12 480 € » et « Tout valider »
              en deux morceaux */}
          <div className="flex flex-col gap-3 min-[480px]:flex-row min-[480px]:items-center min-[480px]:justify-between">
            <div className="flex items-end gap-4 min-[560px]:gap-6">
              <div>
                <div className="text-[11px] font-medium tracking-[0.04em] text-[#a1a1aa]">
                  EN ATTENTE DE RÈGLEMENT
                </div>
                <div
                  className="mt-1 whitespace-nowrap text-[26px] font-semibold tracking-[-0.03em] text-[#09090b]"
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  12 480 €
                </div>
              </div>
              <div className="hidden pb-1 min-[560px]:block">
                <Puce couleur="vert">3 relances parties ce matin</Puce>
              </div>
            </div>
            <span className="w-fit shrink-0 whitespace-nowrap rounded-[7px] bg-[#18181b] px-3 py-1.5 text-[11px] font-semibold text-white">
              Tout valider
            </span>
          </div>

          <div className="mt-5 space-y-1.5">
            {RELANCES.map((r) => (
              <div
                key={r.piece}
                className="o-demo-ligne flex items-center gap-3 rounded-[8px] px-3 py-2.5"
              >
                <span className="h-7 w-7 shrink-0 rounded-full bg-[#f4f4f5]" />
                <div className="min-w-0 flex-1">
                  <div className="o-demo-fort truncate text-[12px] font-semibold">
                    {r.client}
                  </div>
                  <div className="o-demo-faible text-[11px]">
                    {r.piece} · relance {r.jour}
                  </div>
                </div>
                <div
                  className="o-demo-fort text-[12px] font-semibold"
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {r.montant}
                </div>
                <Puce couleur={r.etat}>{r.libelle}</Puce>
              </div>
            ))}
          </div>
        </div>
      </Fenetre>

      {/* panneau gauche — le brouillon de relance en attente de validation */}
      <Fenetre className="!absolute -left-[14px] top-[348px] z-20 hidden w-[292px] lg:block">
        <div className="border-b border-black/[0.06] px-3.5 py-2.5 text-[11px] font-semibold tracking-[0.02em] text-[#52525b]">
          Relance : à valider
        </div>
        <div className="px-3.5 py-3">
          <p className="text-[11.5px] leading-[1.7] text-[#52525b]">
            Bonjour Madame Bertine, votre facture FA-2402 arrive à échéance.
            Souhaitez-vous que je vous renvoie le lien de paiement ?
          </p>
          <div className="mt-3 flex gap-2">
            <span className="rounded-[6px] bg-[#18181b] px-2.5 py-1 text-[10px] font-semibold text-white">
              Envoyer
            </span>
            <span className="rounded-[6px] border border-black/10 px-2.5 py-1 text-[10px] font-semibold text-[#52525b]">
              Corriger
            </span>
          </div>
        </div>
      </Fenetre>

      {/* panneau droit — la conversation WhatsApp traitée pendant la nuit */}
      <Fenetre className="!absolute -right-[14px] top-[246px] z-20 hidden w-[300px] lg:block">
        <div className="flex items-center gap-2 border-b border-black/[0.06] px-3.5 py-2.5">
          <span className="h-5 w-5 rounded-full bg-[#25d366]/15" />
          <span className="text-[11px] font-semibold text-[#52525b]">
            WhatsApp · 21 h 46
          </span>
        </div>
        <div className="space-y-2 px-3.5 py-3">
          <div className="max-w-[86%] rounded-[10px] rounded-tl-[3px] bg-[#f4f4f5] px-2.5 py-2 text-[11px] leading-[1.6] text-[#3f3f46]">
            Vous ouvrez demain matin ?
          </div>
          <div className="ml-auto max-w-[90%] rounded-[10px] rounded-tr-[3px] bg-[#18181b] px-2.5 py-2 text-[11px] leading-[1.6] text-white">
            Oui, dès 7 h 30. Je vous réserve un créneau ?
          </div>
          <div className="pt-0.5 text-right text-[10px] text-[#a1a1aa]">
            Répondu en 40 s
          </div>
        </div>
      </Fenetre>
    </div>
  );
}

/* ——————————————————————————————————————————————————————————
   Médias des cartes bento — arrimés au bord bas, écrêtés par la carte
   —————————————————————————————————————————————————————————— */

export function MediaPayd() {
  return (
    <Fenetre className="w-full">
      <BarreFenetre titre="PAYD · file de relance" />
      <div className="space-y-1.5 px-4 py-4">
        {[
          { t: "Devis DV-0891 · Ti Punch Traiteur", s: "Relance J+3 programmée", p: "gris" as const, l: "Demain" },
          { t: "Facture FA-2402 · SARL Bertine", s: "2ᵉ relance envoyée", p: "ambre" as const, l: "J+21" },
          { t: "Facture FA-2418 · Garage Lémard", s: "Réglée après relance", p: "vert" as const, l: "Soldée" },
        ].map((r) => (
          <div
            key={r.t}
            className="o-demo-ligne flex items-center gap-3 rounded-[8px] px-3 py-2.5"
          >
            <div className="min-w-0 flex-1">
              <div className="o-demo-fort truncate text-[12px] font-semibold">{r.t}</div>
              <div className="o-demo-faible text-[11px]">{r.s}</div>
            </div>
            <Puce couleur={r.p}>{r.l}</Puce>
          </div>
        ))}
      </div>
    </Fenetre>
  );
}

export function MediaAnswr() {
  return (
    <Fenetre className="w-full">
      <div className="o-demo-tete flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="h-7 w-7 rounded-full bg-[#25d366]/15" />
          <div>
            <div className="o-demo-fort text-[12px] font-semibold">Nouveau client</div>
            <div className="o-demo-faible text-[10.5px]">WhatsApp · dimanche 21 h 46</div>
          </div>
        </div>
        <Puce couleur="vert">Répondu</Puce>
      </div>
      <div className="space-y-2.5 px-4 py-4">
        <div className="o-demo-recu max-w-[78%] rounded-[12px] rounded-tl-[4px] px-3 py-2.5 text-[12px] leading-[1.65]">
          Bonsoir, vous faites les vidanges le samedi ?
        </div>
        <div className="o-demo-envoi ml-auto max-w-[86%] rounded-[12px] rounded-tr-[4px] px-3 py-2.5 text-[12px] leading-[1.65]">
          Bonsoir ! Oui, de 8 h à 13 h. Il me reste deux créneaux samedi
          prochain : je vous en réserve un ?
        </div>
        <div className="o-demo-faible text-right text-[10.5px]">
          Envoyé 40 s après la question
        </div>
      </div>
    </Fenetre>
  );
}

export function MediaOffload() {
  return (
    <Fenetre className="w-full">
      <BarreFenetre titre="OFFLOAD · dossier de juillet" />
      <div className="px-4 py-4">
        <div className="mb-2.5 flex items-center justify-between">
          <span className="o-demo-doux text-[11px] font-semibold tracking-[0.02em]">
            18 pièces classées
          </span>
          <Puce couleur="vert">Prêt pour le cabinet</Puce>
        </div>
        <div className="space-y-1.5">
          {[
            { f: "EDF_2026-07-04.pdf", m: "312,40 €", t: "TVA 8,5 %" },
            { f: "Sodexo-Restauration_0712.pdf", m: "1 084,00 €", t: "TVA 8,5 %" },
            { f: "Loyer-atelier_juillet.pdf", m: "950,00 €", t: "Exonéré" },
          ].map((r) => (
            <div
              key={r.f}
              className="o-demo-ligne flex items-center gap-3 rounded-[8px] px-3 py-2.5"
            >
              <span className="o-demo-ligne o-demo-faible grid h-7 w-7 shrink-0 place-items-center rounded-[6px] text-[9px] font-bold">
                PDF
              </span>
              <div className="min-w-0 flex-1">
                <div className="o-demo-fort truncate text-[12px] font-medium">{r.f}</div>
                <div className="o-demo-faible text-[11px]">{r.t}</div>
              </div>
              <div
                className="o-demo-fort text-[12px] font-semibold"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {r.m}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Fenetre>
  );
}

/* Grille de pastilles du catalogue — deux colonnes décalées, comme la
   référence : la colonne de droite est descendue d'une demi-ligne.

   05/08/2026 — le slug est porté explicitement plutôt que déduit du nom en
   minuscules : depuis que les pages sont celles des PAQUETS, l'URL est
   descriptive (`/offres/relances-impayes`) et `cashd` mène à un 404. */
const CATALOGUE: { nom: string; slug: string; icone: ReactNode }[] = [
  { nom: "CASHD", slug: "relances-impayes", icone: <IconeGlyphe d="M6 3h12v18l-3-2-3 2-3-2-3 2V3ZM9 8h6M9 12h6" /> },
  { nom: "RELOAD", slug: "nouvelles-affaires", icone: <IconeGlyphe d="M3 12a9 9 0 1 0 3-6.7M3 4v5h5" /> },
  { nom: "FRONTD", slug: "demandes-clients", icone: <IconeGlyphe d="M4 4h16v12H7l-3 4V4Z" /> },
  { nom: "FILED", slug: "factures-fournisseurs", icone: <IconeGlyphe d="M3 7h6l2 2h10v10H3V7Z" /> },
  { nom: "PULSE", slug: "point-du-matin", icone: <IconeGlyphe d="M4 5h16M4 12h16M4 19h10" /> },
  { nom: "VAULT", slug: "securite", icone: <IconeGlyphe d="M6 11h12v9H6v-9ZM9 11V7a3 3 0 0 1 6 0v4" /> },
];

function IconeGlyphe({ d }: { d: string }) {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={d} />
    </svg>
  );
}

export function MediaCatalogue() {
  const gauche = CATALOGUE.filter((_, i) => i % 2 === 0);
  const droite = CATALOGUE.filter((_, i) => i % 2 === 1);
  return (
    <div className="grid w-full grid-cols-2 gap-x-4 gap-y-3">
      <div className="space-y-3">
        {gauche.map((m) => (
          <PastilleMoteur key={m.nom} {...m} />
        ))}
      </div>
      <div className="space-y-3 pt-6">
        {droite.map((m) => (
          <PastilleMoteur key={m.nom} {...m} />
        ))}
      </div>
    </div>
  );
}

function PastilleMoteur({
  nom,
  slug,
  icone,
}: {
  nom: string;
  slug: string;
  icone: ReactNode;
}) {
  return (
    <Link
      href={`/offres/${slug}`}
      className="flex items-center gap-2 rounded-full bg-white px-3.5 py-2.5 text-[13px] font-semibold tracking-[0.01em] text-[#09090b] transition-transform duration-300 hover:-translate-y-0.5"
      style={{
        boxShadow:
          "0 1px 2px rgba(9,9,11,0.06), 0 8px 18px -10px rgba(9,9,11,0.18), 0 0 0 1px rgba(9,9,11,0.05)",
      }}
    >
      <span className="text-[#09090b]">{icone}</span>
      {nom}
    </Link>
  );
}

/* ——————————————————————————————————————————————————————————
   Médias du bloc « mise en place »
   —————————————————————————————————————————————————————————— */

/* 26/07 (Teo) — les six pastilles portaient un carré de couleur, pas une
   marque : six jetons interchangeables qui ne disaient pas « on se branche sur
   VOS outils ». Elles portent désormais les vrais logos (components/offres/
   logos-outils.tsx). Le libellé reste court (« Sheets », « Drive ») parce que
   c'est le nom d'usage ; le logo, lui, est la marque complète. */
export function MediaOutils() {
  const outils = [
    { nom: "Gmail", logo: <LogoGmail /> },
    { nom: "Sheets", logo: <LogoSheets /> },
    { nom: "WhatsApp", logo: <LogoWhatsApp /> },
    { nom: "Outlook", logo: <LogoOutlook /> },
    { nom: "Excel", logo: <LogoExcel /> },
    { nom: "Drive", logo: <LogoDrive /> },
  ];
  return (
    <div className="flex flex-wrap gap-2.5">
      {outils.map((o) => (
        <span
          key={o.nom}
          className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-2 text-[13px] font-medium text-[#09090b]"
          style={{
            boxShadow:
              "0 1px 2px rgba(9,9,11,0.06), 0 8px 18px -12px rgba(9,9,11,0.2), 0 0 0 1px rgba(9,9,11,0.05)",
          }}
        >
          {o.logo}
          {o.nom}
        </span>
      ))}
    </div>
  );
}

export function MediaValidation() {
  return (
    <Fenetre className="w-full">
      <div className="border-b border-black/[0.06] bg-[#fbfbfb] px-4 py-2.5 text-[11px] font-semibold tracking-[0.02em] text-[#52525b]">
        File de validation : 3 messages en attente
      </div>
      <div className="space-y-1.5 px-4 py-3.5">
        {[
          { t: "Relance FA-2402 · SARL Bertine", e: "attente" as const },
          { t: "Réponse WhatsApp · devis toiture", e: "valide" as const },
          { t: "Relance DV-0891 · Ti Punch", e: "suspendu" as const },
        ].map((r) => (
          <div
            key={r.t}
            className="o-demo-ligne flex items-center gap-3 rounded-[8px] px-3 py-2.5"
          >
            <span
              className={`grid h-5 w-5 shrink-0 place-items-center rounded-full ${
                r.e === "valide"
                  ? "bg-[#18181b] text-white"
                  : r.e === "suspendu"
                    ? "bg-[#f4f4f5] text-[#a1a1aa]"
                    : "border border-black/10 bg-white"
              }`}
            >
              {r.e === "valide" ? (
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              ) : r.e === "suspendu" ? (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <rect x="6" y="4" width="4" height="16" rx="1" />
                  <rect x="14" y="4" width="4" height="16" rx="1" />
                </svg>
              ) : null}
            </span>
            <span className="o-demo-fort min-w-0 flex-1 truncate text-[12px] font-medium">
              {r.t}
            </span>
            <span className="o-demo-faible text-[11px]">
              {r.e === "valide" ? "Envoyé" : r.e === "suspendu" ? "Suspendu" : "À valider"}
            </span>
          </div>
        ))}
      </div>
    </Fenetre>
  );
}

export function MediaLocal() {
  return (
    <div className="flex flex-wrap gap-2.5">
      {["Hébergé UE", "RGPD", "Chiffré au repos", "Export à tout moment", "Journal d'accès"].map(
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

export function MediaEtapes() {
  const etapes = [
    { n: "01", t: "Audit, 30 min", d: "Votre problème n°1, chiffré." },
    { n: "02", t: "Raccordement", d: "Une demi-journée sur vos outils." },
    { n: "03", t: "Cycle supervisé", d: "Vous validez, on cale les réglages." },
  ];
  return (
    <div className="space-y-2.5">
      {etapes.map((e) => (
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
