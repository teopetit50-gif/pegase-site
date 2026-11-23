"use client";

/* ══════════════════════════════════════════════════════════════════════
   CycleVente — une vente validée, et tout le logiciel qui se met à jour

   ORIGINE. `shadcn-studio-bento-cards-72` de Shadcn Studio (@clevision,
   21st.dev, relevé le 23/11/2026 sur le registre) : une facture qui passe
   seule de « brouillon » à « payée » sur une boucle de 12 s — pastille
   d'état, jalons qui se cochent, bouton qui s'enfonce, tampon, total qui
   monte, et la ligne vivante de la liste qui suit.

   CE QUI EST REPRIS TEL QUEL : la boucle et ses instants (1,5 s l'appui,
   1,7 / 4 / 6,4 / 7,6 s les étapes, 7,6 → 8,6 s le compteur, fondu de
   0,3 s aux deux bouts), la géométrie de la carte (en-tête 44 px, pied
   46 px, jalons 16 px, corps de 11 à 12 px, montant en 30 px) et le
   panneau latéral de 260 px.

   CE QUI CHANGE, et pourquoi :
   1. L'HISTOIRE EST CELLE DU LOGICIEL DE GESTION (repris le 23/11 : la
      première version racontait une relance, soit l'ancien centre de
      l'offre). Un devis préparé par l'IA attend votre accord, part,
      devient facture ; et le panneau de droite montre ce que dit
      /gestion : « une vente validée met à jour le stock et la
      comptabilité ». Stock, banque et comptabilité changent d'état sans
      que personne ne ressaisisse rien.
   2. LES DONNÉES D'EXEMPLE SONT CELLES DE /gestion (components/gestion/
      visuels.tsx) : le négoce électrique, Atelier Bertin, le devis
      D-0314 de 2 080,00 € HT, la facture F-2053, TVA 20 %.
   3. LES TONS PORTENT UN SENS (règle du 21/09) : ambre = attend votre
      accord, vert = encaissé ou passé en comptabilité, encre sinon.
   4. PAS DE MESURE EN JAVASCRIPT : deux mises en page en CSS, côte à
      côte dès 768 px (hauteur 380 px), empilées en dessous.
   5. PAS DE PORTRAITS : des initiales et des pictogrammes sur un voile.
   ══════════════════════════════════════════════════════════════════════ */

import { useEffect, useRef, useState, type ReactNode } from "react";
import { BookOpen, CalendarDays, Check, FileText, Landmark, Package, Receipt, Send } from "lucide-react";
import "./essai.css";

type Ton = "neutre" | "encre" | "ambre" | "vert" | "rouge";

const TON: Record<Ton, string> = {
  neutre: "eb-ton-neutre",
  encre: "eb-ton-encre",
  ambre: "eb-ton-ambre",
  vert: "eb-ton-vert",
  rouge: "eb-ton-rouge",
};

const ETAPES: { ton: Ton; etiquette: string; pied: string }[] = [
  { ton: "ambre", etiquette: "À valider", pied: "Devis préparé par l'IA · en attente de votre accord" },
  { ton: "encre", etiquette: "Envoyé", pied: "Devis envoyé à Atelier Bertin" },
  { ton: "encre", etiquette: "Facturé", pied: "Devis accepté · facture émise, stock mis à jour" },
  { ton: "encre", etiquette: "Paiement…", pied: "Virement reçu, rapprochement en cours…" },
  { ton: "vert", etiquette: "Encaissé", pied: "Rapproché · écriture passée en comptabilité" },
];

const LIGNES: [string, string][] = [
  ["Câble 2,5 mm², couronne 100 m", "1 240,00 €"],
  ["Disjoncteur 16 A", "480,00 €"],
  ["Gaine ICTA 20, couronne 100 m", "360,00 €"],
];

type Suivi = { nom: string; detail: string; etat: string; ton: Ton; icone: ReactNode };

/* ce que la vente change ailleurs, étape par étape */
const suivis = (i: number): Suivi[] => [
  {
    nom: "Stock",
    detail: "3 articles du dépôt nord",
    etat: i >= 2 ? "Sorti" : "En stock",
    ton: i >= 2 ? "encre" : "neutre",
    icone: <Package />,
  },
  {
    nom: "Banque",
    detail: "VIR ATELIER BERTIN",
    etat: i >= 4 ? "Rapproché" : i === 3 ? "Reçu" : "Attendu",
    ton: i >= 4 ? "vert" : i === 3 ? "encre" : "neutre",
    icone: <Landmark />,
  },
  {
    nom: "Comptabilité",
    detail: "Journal des ventes",
    etat: i >= 4 ? "Passée" : i >= 2 ? "Écriture prête" : "En attente",
    ton: i >= 4 ? "vert" : i >= 2 ? "encre" : "neutre",
    icone: <BookOpen />,
  },
];

/* ── la boucle, en secondes ── */
const CYCLE = 12;
const FONDU = CYCLE - 0.8;
const APPUI = [1.5, 1.7];
const COMPTE = [7.6, 8.6];
const EN_BANQUE = [54210, 56706];

const adoucir = (x: number) => {
  const k = Math.max(0, Math.min(1, x));
  return k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
};
const avancement = (x: number, de: number, a: number) => Math.max(0, Math.min(1, (x - de) / (a - de)));
const etapeA = (t: number) => (t >= 7.6 ? 4 : t >= 6.4 ? 3 : t >= 4 ? 2 : t >= 1.7 ? 1 : 0);

type Phase = { etape: number; appuye: boolean; banque: number };

const phaseA = (t: number): Phase => ({
  etape: etapeA(t),
  appuye: t >= APPUI[0] && t < APPUI[1],
  banque: Math.round(
    EN_BANQUE[0] + (EN_BANQUE[1] - EN_BANQUE[0]) * adoucir(avancement(t, COMPTE[0], COMPTE[1])),
  ),
});

/* séparateur de milliers écrit à la main : `toLocaleString` ne rend pas
   la même espace côté serveur et côté navigateur */
const euros = (n: number) => `${String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ")} €`;

function Jalon({ nom, ton, etat }: { nom: string; ton: Ton; etat: "" | "fait" | "cours" }) {
  return (
    <span
      className={`flex shrink-0 items-center gap-1.5 text-[11px] font-semibold whitespace-nowrap transition-colors duration-300 ${TON[ton]} ${etat === "cours" ? "eb-encre" : "eb-doux"}`}
    >
      <i
        className={`grid size-4 shrink-0 place-items-center rounded-full border-2 transition-[background-color,border-color] duration-300 ${
          etat === "fait" ? "eb-jalon-fait" : etat === "cours" ? "eb-roue" : "eb-trait-fort"
        }`}
      >
        <Check size={9} strokeWidth={3.6} className={etat === "fait" ? "opacity-100" : "opacity-0"} />
      </i>
      {nom}
    </span>
  );
}

function Trait({ plein, ton }: { plein: boolean; ton: Ton }) {
  return (
    <span className={`eb-piste relative h-0.5 min-w-2 flex-1 overflow-hidden rounded-xs ${TON[ton]}`}>
      <u
        className={`eb-ton-fond absolute inset-0 origin-left transition-transform duration-500 ${plein ? "scale-x-100" : "scale-x-0"}`}
      />
    </span>
  );
}

function EnTetePanneau({ titre, note }: { titre: string; note: string }) {
  return (
    <h5 className="eb-doux m-0 flex shrink-0 justify-between text-[11px] font-semibold tracking-[0.05em] uppercase">
      {titre}
      <span>{note}</span>
    </h5>
  );
}

function LigneModule({ nom, detail, etat, ton, icone, vive, apresVive }: Suivi & { vive?: boolean; apresVive?: boolean }) {
  const filet = vive
    ? "eb-voile -mx-2 rounded-[10px] border-transparent px-2"
    : apresVive
      ? "border-transparent"
      : "eb-trait";
  return (
    <div className={`flex min-h-[40px] min-w-0 flex-1 items-center gap-2.25 border-t text-xs ${TON[ton]} ${filet}`}>
      <span className="eb-voile eb-texte inline-grid size-6 shrink-0 place-items-center rounded-full [&>svg]:size-3.5">
        {icone}
      </span>
      <div className="flex min-w-0 flex-1 flex-col leading-[1.25]">
        <b className="truncate font-semibold">{nom}</b>
        <small className="eb-doux truncate text-[10.5px]">{detail}</small>
      </div>
      <span className="eb-puce shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-semibold whitespace-nowrap">
        {etat}
      </span>
    </div>
  );
}

export default function CycleVente() {
  const [phase, setPhase] = useState<Phase>(() => phaseA(0));
  const cadre = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = cadre.current;
    if (!el) return;
    const reduit = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const depart = performance.now();
    let raf = 0;
    let enVue = true;

    const pas = (maintenant: number) => {
      /* mouvement réduit : la vente encaissée et comptabilisée, sans boucle */
      const u = reduit ? 10 : ((maintenant - depart) / 1000) % CYCLE;
      if (enVue) {
        const fond = u >= FONDU;
        const t = fond ? FONDU - 0.01 : u;
        el.style.opacity = String(fond ? Math.max(0, 1 - (u - FONDU) / 0.3) : Math.min(1, u / 0.3));
        const suivante = phaseA(t);
        setPhase((p) =>
          p.etape === suivante.etape && p.appuye === suivante.appuye && p.banque === suivante.banque ? p : suivante,
        );
      }
      if (!reduit) raf = requestAnimationFrame(pas);
    };

    /* hors de la fenêtre, la boucle tourne à vide : rien n'est redessiné */
    const io = new IntersectionObserver(([entree]) => {
      enVue = entree.isIntersecting;
    });
    io.observe(el);
    raf = requestAnimationFrame(pas);

    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);

  const { etape: i, appuye, banque } = phase;
  const etape = ETAPES[i];
  const payee = i === 4;
  const facture = i >= 2;

  return (
    <div className="eb w-full">
      <p className="sr-only">
        Exemple animé : un devis préparé par l&apos;IA attend votre accord, part chez le client, devient facture ;
        le stock sort, le virement est rapproché en banque et l&apos;écriture passe en comptabilité, sans
        ressaisie.
      </p>
      <div
        ref={cadre}
        aria-hidden="true"
        className="mx-auto flex w-full max-w-[940px] flex-col gap-3 leading-[1.3] md:h-[380px] md:flex-row"
      >
        {/* ── la pièce de vente : devis, puis facture ── */}
        <div
          className={`eb-blanc eb-trait flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border shadow-xs ${TON[etape.ton]}`}
        >
          <div className="eb-trait flex h-11 min-w-0 shrink-0 items-center gap-2 border-b px-3.5 text-xs font-semibold">
            <FileText size={15} strokeWidth={1.8} className="eb-doux shrink-0" />
            <b className="font-semibold whitespace-nowrap">{facture ? "Facture" : "Devis"}</b>
            <em className="eb-doux font-medium whitespace-nowrap not-italic">{facture ? "F-2053" : "D-0314"}</em>
            <span className="eb-puce ml-auto flex h-6 shrink-0 items-center gap-1.5 rounded-full pr-2.5 pl-2.25 text-[11px] font-semibold whitespace-nowrap">
              <i className="eb-ton-fond size-1.75 shrink-0 rounded-full" />
              {etape.etiquette}
            </span>
          </div>

          <div className="flex min-h-0 flex-1 flex-col justify-between gap-3 px-3.5 py-2.5">
            <div className="flex h-7.5 min-w-0 shrink-0 items-center gap-2.5">
              <span className="eb-voile eb-texte inline-grid size-[30px] shrink-0 place-items-center rounded-full text-[11px] leading-none font-semibold">
                AB
              </span>
              <div className="flex min-w-0 flex-col leading-[1.25]">
                <b className="truncate text-xs font-semibold">Atelier Bertin</b>
                <span className="eb-doux truncate text-[11px]">Claire Morel</span>
              </div>
              <span className="eb-doux ml-auto flex shrink-0 items-center gap-1.25 text-[11px] whitespace-nowrap">
                <CalendarDays size={12} strokeWidth={1.8} />
                {facture ? "Échéance 20 déc." : "Valable 30 jours"}
              </span>
            </div>

            <div className="relative flex shrink-0 flex-col gap-0.5">
              <b className="text-3xl leading-[1.1] font-[650] tracking-[-0.02em] whitespace-nowrap tabular-nums">
                2 496,00 €
              </b>
              <span
                className={`truncate text-xs transition-colors duration-300 ${payee ? "eb-ton-texte font-[550]" : "eb-doux"}`}
              >
                {payee ? "Réglée en totalité · virement du 24 nov." : "2 080,00 € HT · TVA 20 %"}
              </span>
              <span
                className={`eb-tampon absolute top-0.5 right-0.5 -rotate-9 rounded-lg border-2 px-2.5 py-0.5 text-base font-extrabold tracking-[0.12em] transition-[opacity,scale] duration-300 ease-[cubic-bezier(.3,1.5,.5,1)] ${
                  payee ? "scale-100 opacity-90" : "scale-150 opacity-0"
                }`}
              >
                PAYÉE
              </span>
            </div>

            <div className="flex shrink-0 flex-col">
              {LIGNES.map(([libelle, valeur]) => (
                <div
                  key={libelle}
                  className="eb-trait flex h-[30px] items-center gap-2 border-t text-xs first:border-t-0"
                >
                  <span className="min-w-0 flex-1 truncate">{libelle}</span>
                  <em className="eb-doux whitespace-nowrap not-italic tabular-nums">{valeur}</em>
                </div>
              ))}
            </div>

            <div className="flex h-8 shrink-0 items-center gap-1.5">
              <Jalon nom="Envoyé" ton="encre" etat={i >= 1 ? "fait" : ""} />
              <Trait plein={i >= 2} ton="encre" />
              <Jalon nom="Facturé" ton="encre" etat={i >= 2 ? "fait" : ""} />
              <Trait plein={i >= 4} ton="vert" />
              <Jalon nom="Encaissé" ton="vert" etat={payee ? "fait" : i === 3 ? "cours" : ""} />
            </div>
          </div>

          <div className="eb-trait flex h-11.5 shrink-0 items-center gap-2.5 border-t px-3.5">
            <span className="eb-doux min-w-0 flex-1 truncate text-xs">{etape.pied}</span>
            <span
              className={`flex h-7.5 shrink-0 items-center gap-1.5 rounded-[9px] border px-3 text-xs font-semibold whitespace-nowrap transition-[background-color,color,border-color,scale] duration-300 ${
                i === 0 ? "eb-bouton-plein" : payee ? "eb-bouton-vert" : "eb-bouton-clair"
              } ${appuye ? "scale-93" : ""}`}
            >
              {i === 0 ? <Send size={13} /> : payee ? <BookOpen size={13} /> : <FileText size={13} />}
              {i === 0 ? "Valider le devis" : payee ? "Voir l'écriture" : "Voir la pièce"}
            </span>
          </div>
        </div>

        {/* ── le panneau : ce que la vente met à jour ailleurs ── */}
        <div className="eb-blanc eb-trait flex shrink-0 flex-col gap-2.5 overflow-hidden rounded-2xl border p-3.5 shadow-xs md:w-[260px]">
          <div className="hidden shrink-0 flex-col gap-2.5 md:flex">
            <EnTetePanneau titre="Trésorerie" note="Novembre" />
            <div className="flex gap-2">
              <div className="eb-voile eb-doux flex min-w-0 flex-1 flex-col rounded-[10px] px-2.5 py-2 text-[10.5px] whitespace-nowrap">
                En banque
                <b className="eb-encre text-base font-[650] tabular-nums">{euros(banque)}</b>
              </div>
              <div className="eb-voile eb-doux flex min-w-0 flex-1 flex-col rounded-[10px] px-2.5 py-2 text-[10.5px] whitespace-nowrap">
                À encaisser
                <b className="eb-encre text-base font-[650] tabular-nums">
                  {facture && !payee ? "17 366 €" : "14 870 €"}
                </b>
              </div>
            </div>
          </div>
          <EnTetePanneau titre="À jour partout" note="Exemple" />
          <div className="flex min-h-0 flex-1 flex-col">
            <LigneModule
              nom="Ventes"
              detail={`${facture ? "F-2053" : "D-0314"} · Atelier Bertin`}
              etat={etape.etiquette === "Paiement…" ? "Paiement" : etape.etiquette}
              ton={etape.ton}
              icone={<Receipt />}
              vive
            />
            {suivis(i).map((ligne, k) => (
              <LigneModule key={ligne.nom} {...ligne} apresVive={k === 0} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
