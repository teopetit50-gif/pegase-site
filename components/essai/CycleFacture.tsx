"use client";

/* ══════════════════════════════════════════════════════════════════════
   CycleFacture — le cycle d'une relance, de l'accord à l'encaissement

   ORIGINE. `shadcn-studio-bento-cards-72` de Shadcn Studio (@clevision,
   21st.dev, relevé le 23/11/2026 sur le registre) : une facture qui passe
   seule de « brouillon » à « payée » sur une boucle de 12 s — pastille
   d'état, jalons qui se cochent, bouton qui s'enfonce, tampon, total
   encaissé qui monte, et la ligne vivante de la liste qui suit.

   CE QUI EST REPRIS TEL QUEL : la boucle et ses instants (1,5 s l'appui,
   1,7 / 4 / 6,4 / 7,6 s les étapes, 7,6 → 8,6 s le compteur, fondu de
   0,3 s aux deux bouts), la géométrie de la carte (en-tête 44 px, pied
   46 px, jalons 16 px, corps de 11 à 12 px, montant en 30 px) et le
   panneau latéral de 260 px.

   CE QUI CHANGE, et pourquoi :
   1. L'HISTOIRE EST CELLE DE CASHD. La source envoie une facture ; ici
      l'agent a rédigé une relance et c'est VOUS qui l'envoyez : la
      première étape est « À valider », le premier bouton « Valider
      l'envoi ». C'est la promesse du site, rien ne part sans accord.
   2. LES TONS PORTENT UN SENS (règle du 21/09) : ambre = attend votre
      accord, vert = encaissé, rouge = échu, encre sinon. La source
      colorait chaque étape (bleu, ambre, vert).
   3. PAS DE MESURE EN JAVASCRIPT. La source mesure son emplacement
      (ResizeObserver) et calcule quinze dimensions ; ici deux mises en
      page en CSS suffisent : côte à côte dès 768 px (hauteur 380 px, le
      cas « large et haut » de la source), empilées en dessous.
   4. PAS DE PORTRAITS. La source charge des photos sur le CDN de Shadcn
      Studio ; ici des initiales sur un voile, sans couleur par personne.
   5. Les noms et les montants sont des EXEMPLES, et le bloc le dit.
   ══════════════════════════════════════════════════════════════════════ */

import { useEffect, useRef, useState } from "react";
import { CalendarDays, Check, Clock, FileText, Receipt, Send } from "lucide-react";
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
  { ton: "ambre", etiquette: "À valider", pied: "Relance rédigée · en attente de votre accord" },
  { ton: "encre", etiquette: "Envoyée", pied: "Envoyée à la comptabilité du client" },
  { ton: "encre", etiquette: "Lue", pied: "Lue par le client à l'instant" },
  { ton: "encre", etiquette: "Paiement…", pied: "Virement reçu, rapprochement en cours…" },
  { ton: "vert", etiquette: "Encaissée", pied: "Rapprochée avec votre relevé bancaire" },
];

const LIGNES_FACTURE: [string, string][] = [
  ["Fourniture et pose", "1 600,00 €"],
  ["Finitions", "680,00 €"],
  ["Déplacement", "200,00 €"],
];

type Recente = { nom: string; date: string; montant: string; etat: string; ton: Ton };

const RECENTES: Recente[] = [
  { nom: "Garage du Port", date: "2 nov.", montant: "1 200 €", etat: "Encaissée", ton: "vert" },
  { nom: "Bâti Sud", date: "21 oct.", montant: "860 €", etat: "Échue", ton: "rouge" },
  { nom: "Cabinet Lenoir", date: "12 oct.", montant: "3 400 €", etat: "Encaissée", ton: "vert" },
];

/* ── la boucle, en secondes ── */
const CYCLE = 12;
const FONDU = CYCLE - 0.8;
const APPUI = [1.5, 1.7];
const COMPTE = [7.6, 8.6];
const ENCAISSE = [12480, 14960];

const adoucir = (x: number) => {
  const k = Math.max(0, Math.min(1, x));
  return k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
};
const avancement = (x: number, de: number, a: number) => Math.max(0, Math.min(1, (x - de) / (a - de)));
const etapeA = (t: number) => (t >= 7.6 ? 4 : t >= 6.4 ? 3 : t >= 4 ? 2 : t >= 1.7 ? 1 : 0);

type Phase = { etape: number; appuye: boolean; encaisse: number };

const phaseA = (t: number): Phase => ({
  etape: etapeA(t),
  appuye: t >= APPUI[0] && t < APPUI[1],
  encaisse: Math.round(
    ENCAISSE[0] + (ENCAISSE[1] - ENCAISSE[0]) * adoucir(avancement(t, COMPTE[0], COMPTE[1])),
  ),
});

/* séparateur de milliers écrit à la main : `toLocaleString` ne rend pas
   la même espace côté serveur et côté navigateur */
const euros = (n: number) => `${String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ")} €`;

const initiales = (nom: string) =>
  nom
    .split(" ")
    .filter((mot) => /^[A-ZÀ-Ý]/.test(mot))
    .slice(0, 2)
    .map((mot) => mot[0])
    .join("");

function Pastille({ nom, taille }: { nom: string; taille: number }) {
  return (
    <span
      className="eb-voile eb-texte inline-grid shrink-0 place-items-center rounded-full leading-none font-semibold"
      style={{ width: taille, height: taille, fontSize: Math.round(taille * 0.38) }}
    >
      {initiales(nom)}
    </span>
  );
}

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

function LigneFacture({
  nom,
  date,
  montant,
  etat,
  ton,
  vive,
  apresVive,
  cachee,
}: Recente & { vive?: boolean; apresVive?: boolean; cachee?: boolean }) {
  const filet = vive
    ? "eb-voile -mx-2 rounded-[10px] border-transparent px-2"
    : apresVive
      ? "border-transparent"
      : "eb-trait";
  return (
    <div
      className={`min-h-[40px] min-w-0 flex-1 items-center gap-2.25 border-t text-xs ${cachee ? "hidden md:flex" : "flex"} ${TON[ton]} ${filet}`}
    >
      <Pastille nom={nom} taille={24} />
      <div className="flex min-w-0 flex-1 flex-col leading-[1.25]">
        <b className="truncate font-semibold">{nom}</b>
        <small className="eb-doux text-[10.5px] whitespace-nowrap">
          {date} · {montant}
        </small>
      </div>
      <span className="eb-puce shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-semibold whitespace-nowrap">
        {etat}
      </span>
    </div>
  );
}

export default function CycleFacture() {
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
      /* mouvement réduit : la facture encaissée, total final, sans boucle */
      const u = reduit ? 10 : ((maintenant - depart) / 1000) % CYCLE;
      if (enVue) {
        const fond = u >= FONDU;
        const t = fond ? FONDU - 0.01 : u;
        el.style.opacity = String(fond ? Math.max(0, 1 - (u - FONDU) / 0.3) : Math.min(1, u / 0.3));
        const suivante = phaseA(t);
        setPhase((p) =>
          p.etape === suivante.etape && p.appuye === suivante.appuye && p.encaisse === suivante.encaisse
            ? p
            : suivante,
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

  const { etape: i, appuye, encaisse } = phase;
  const etape = ETAPES[i];
  const payee = i === 4;

  return (
    <div className="eb w-full">
      <p className="sr-only">
        Exemple animé : une relance rédigée par l&apos;agent attend votre accord, part, est lue par le
        client, puis la facture de 2 480 euros est encaissée et rapprochée.
      </p>
      <div
        ref={cadre}
        aria-hidden="true"
        className="mx-auto flex w-full max-w-[940px] flex-col gap-3 leading-[1.3] md:h-[380px] md:flex-row"
      >
        {/* ── la facture ── */}
        <div
          className={`eb-blanc eb-trait flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border shadow-xs ${TON[etape.ton]}`}
        >
          <div className="eb-trait flex h-11 min-w-0 shrink-0 items-center gap-2 border-b px-3.5 text-xs font-semibold">
            <FileText size={15} strokeWidth={1.8} className="eb-doux shrink-0" />
            <b className="font-semibold whitespace-nowrap">Facture</b>
            <em className="eb-doux font-medium whitespace-nowrap not-italic">F-2041</em>
            <span className="eb-puce ml-auto flex h-6 shrink-0 items-center gap-1.5 rounded-full pr-2.5 pl-2.25 text-[11px] font-semibold whitespace-nowrap">
              <i className="eb-ton-fond size-1.75 shrink-0 rounded-full" />
              {etape.etiquette}
            </span>
          </div>

          <div className="flex min-h-0 flex-1 flex-col justify-between gap-3 px-3.5 py-2.5">
            <div className="flex h-7.5 min-w-0 shrink-0 items-center gap-2.5">
              <Pastille nom="Julien Costa" taille={30} />
              <div className="flex min-w-0 flex-col leading-[1.25]">
                <b className="truncate text-xs font-semibold">Julien Costa</b>
                <span className="eb-doux truncate text-[11px]">Menuiserie Costa</span>
              </div>
              <span className="eb-doux ml-auto flex shrink-0 items-center gap-1.25 text-[11px] whitespace-nowrap">
                <CalendarDays size={12} strokeWidth={1.8} />
                Échue le 30 sept.
              </span>
            </div>

            <div className="relative flex shrink-0 flex-col gap-0.5">
              <b className="text-3xl leading-[1.1] font-[650] tracking-[-0.02em] whitespace-nowrap tabular-nums">2 480,00 €</b>
              <span
                className={`truncate text-xs transition-colors duration-300 ${payee ? "eb-ton-texte font-[550]" : "eb-doux"}`}
              >
                {payee ? "Réglée en totalité · virement du 24 sept." : "Travaux d'agencement · septembre"}
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
              {LIGNES_FACTURE.map(([libelle, valeur]) => (
                <div
                  key={libelle}
                  className="eb-trait flex h-[30px] items-center gap-2 border-t text-xs first:border-t-0"
                >
                  <span className="min-w-0 flex-1 truncate">{libelle}</span>
                  <em className="eb-doux not-italic tabular-nums">{valeur}</em>
                </div>
              ))}
            </div>

            <div className="flex h-8 shrink-0 items-center gap-1.5">
              <Jalon nom="Envoyée" ton="encre" etat={i >= 1 ? "fait" : ""} />
              <Trait plein={i >= 2} ton="encre" />
              <Jalon nom="Lue" ton="encre" etat={i >= 2 ? "fait" : ""} />
              <Trait plein={i >= 4} ton="vert" />
              <Jalon nom="Encaissée" ton="vert" etat={payee ? "fait" : i === 3 ? "cours" : ""} />
            </div>
          </div>

          <div className="eb-trait flex h-11.5 shrink-0 items-center gap-2.5 border-t px-3.5">
            <span className="eb-doux min-w-0 flex-1 truncate text-xs">{etape.pied}</span>
            <span
              className={`flex h-7.5 shrink-0 items-center gap-1.5 rounded-[9px] border px-3 text-xs font-semibold whitespace-nowrap transition-[background-color,color,border-color,scale] duration-300 ${
                i === 0 ? "eb-bouton-plein" : payee ? "eb-bouton-vert" : "eb-bouton-clair"
              } ${appuye ? "scale-93" : ""}`}
            >
              {i === 0 ? <Send size={13} /> : payee ? <Receipt size={13} /> : <Clock size={13} />}
              {i === 0 ? "Valider l'envoi" : payee ? "Reçu" : "Relancer"}
            </span>
          </div>
        </div>

        {/* ── le panneau : encaissements et dernières factures ── */}
        <div className="eb-blanc eb-trait flex shrink-0 flex-col gap-2.5 overflow-hidden rounded-2xl border p-3.5 shadow-xs md:w-[260px]">
          <div className="hidden shrink-0 flex-col gap-2.5 md:flex">
            <EnTetePanneau titre="Encaissements" note="Ce mois" />
            <div className="flex gap-2">
              <div className="eb-voile eb-doux flex min-w-0 flex-1 flex-col rounded-[10px] px-2.5 py-2 text-[10.5px] whitespace-nowrap">
                Encaissé
                <b className="eb-encre text-base font-[650] tabular-nums">{euros(encaisse)}</b>
              </div>
              <div className="eb-voile eb-doux flex min-w-0 flex-1 flex-col rounded-[10px] px-2.5 py-2 text-[10.5px] whitespace-nowrap">
                Reste dû
                <b className="eb-encre text-base font-[650] tabular-nums">{payee ? "4 060 €" : "6 540 €"}</b>
              </div>
            </div>
          </div>
          <EnTetePanneau titre="Dernières factures" note="Exemple" />
          <div className="flex min-h-0 flex-1 flex-col">
            <LigneFacture
              nom="Menuiserie Costa"
              date="Aujourd'hui"
              montant="2 480 €"
              etat={etape.etiquette === "Paiement…" ? "Paiement" : etape.etiquette}
              ton={etape.ton}
              vive
            />
            {RECENTES.map((ligne, k) => (
              <LigneFacture key={ligne.nom} {...ligne} apresVive={k === 0} cachee={k === RECENTES.length - 1} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
