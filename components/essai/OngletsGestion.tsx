"use client";

/* ══════════════════════════════════════════════════════════════════════
   OngletsGestion — un onglet par pan du logiciel, et son écran qui se
   remplit

   ORIGINE. `tabs-illustration-vercel` de Cult UI (@cult-ui, 21st.dev,
   relevé le 23/11/2026 sur le registre) : à gauche un titre et des
   onglets empilés, dont l'actif porte une ligne qui se vide en 6 s puis
   passe au suivant ; à droite, séparée par un filet, une bulle où
   l'illustration de l'onglet se joue.

   CE QUI EST REPRIS TEL QUEL : le cycle de 6 s, la ligne de 2 px qui se
   vide, la description qui se déplie (350 ms) sous l'onglet actif, les
   animations `panelIn` et `descIn`, la bulle (rayon 24, carré d'icône de
   32 px, ombre fine), les marges (48 / 40 px à gauche, 40 px à droite),
   le fond #fafafa et la hauteur minimale de 380 px.

   CE QUI CHANGE, et pourquoi :
   1. LES ONGLETS SONT LES MODULES DU LOGICIEL DE GESTION (repris le
      23/11 : la première version montrait les quatre agents par leur
      nom de code). Titres et phrases viennent de MODULES dans
      components/gestion/textes : une seule source de vérité avec
      /gestion. Chaque écran est une liste qui se remplit, sur les
      données d'exemple de /gestion (le négoce électrique, Atelier
      Bertin, Sté Électra, le devis D-0314). La source montrait un
      texte, un globe et une onde aux couleurs de l'arc-en-ciel.
   2. TOUTES LES BULLES ONT LA MÊME HAUTEUR (236 px). La source les tient
      en 16/9 : à 390 px une liste de cinq lignes n'y entre pas, et la
      colonne sauterait d'un onglet à l'autre.
   3. LA LISTE FINIT AVANT L'ONGLET. La barre de la source dure 8 s dans
      un onglet de 6 s : elle ne se remplit jamais. Ici 4,5 s.
   4. ELLE S'ARRÊTE QUAND ON LA REGARDE. Pointeur ou clavier sur le bloc :
      le cycle attend. Mouvement réduit : pas de défilement automatique,
      les listes s'affichent finies.
   5. DES BOUTONS, PAS `all: unset`. La source efface l'anneau de focus ;
      ici de vrais boutons, `aria-expanded`, et l'illustration est
      décorative (`aria-hidden`), la phrase de l'onglet disant l'essentiel.
   6. EMPILÉ SOUS 768 px (la source reste en ligne et déborde), et les
      marges de 40 px ne s'appliquent qu'à partir de 1024 px.
   ══════════════════════════════════════════════════════════════════════ */

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, Landmark, Package, Receipt, Truck } from "lucide-react";
import { MODULES } from "@/components/gestion/textes";
import "./essai.css";

const CYCLE_MS = 6000;
const LISTE_MS = 4500;

type Rang = { gauche: string; droite: string; seuil: number };
type Ecran = {
  titre: string;
  icone: ReactNode;
  rangs: Rang[];
  fin: { texte: string; puce: string; ton: "ambre" | "vert" };
};

/* un écran par onglet de MODULES (même identifiant) */
const ECRANS: Record<string, Ecran> = {
  ventes: {
    titre: "Devis D-0314 · Atelier Bertin",
    icone: <Receipt />,
    rangs: [
      { gauche: "Câble 2,5 mm², couronne 100 m", droite: "1 240,00 €", seuil: 8 },
      { gauche: "Disjoncteur 16 A", droite: "480,00 €", seuil: 26 },
      { gauche: "Gaine ICTA 20, couronne 100 m", droite: "360,00 €", seuil: 44 },
      { gauche: "Total TTC, TVA 20 %", droite: "2 496,00 €", seuil: 62 },
    ],
    fin: { texte: "Préparé par l'IA", puce: "À valider", ton: "ambre" },
  },
  achats: {
    titre: "Facture reçue · Sté Électra",
    icone: <Truck />,
    rangs: [
      { gauche: "Commande", droite: "BC-0119", seuil: 8 },
      { gauche: "Montant HT", droite: "1 153,60 €", seuil: 26 },
      { gauche: "TVA 20 %", droite: "230,72 €", seuil: 44 },
      { gauche: "Total TTC", droite: "1 384,32 €", seuil: 62 },
    ],
    fin: { texte: "Rapprochée avec la réception", puce: "À valider", ton: "ambre" },
  },
  stock: {
    titre: "Mouvements · dépôt nord",
    icone: <Package />,
    rangs: [
      { gauche: "Câble 2,5 mm², couronne 100 m", droite: "− 10", seuil: 8 },
      { gauche: "Disjoncteur 16 A", droite: "− 80", seuil: 26 },
      { gauche: "Gaine ICTA 20, couronne 100 m", droite: "− 9", seuil: 44 },
      { gauche: "Prise 2P+T", droite: "+ 200", seuil: 62 },
    ],
    fin: { texte: "1 article sous son seuil", puce: "Commande proposée", ton: "ambre" },
  },
  banque: {
    titre: "Relevé de novembre",
    icone: <Landmark />,
    rangs: [
      { gauche: "VIR ATELIER BERTIN", droite: "+ 2 496,00 €", seuil: 8 },
      { gauche: "411000 · Clients", droite: "2 496,00", seuil: 28 },
      { gauche: "707000 · Ventes de marchandises", droite: "2 080,00", seuil: 46 },
      { gauche: "445710 · TVA collectée", droite: "416,00", seuil: 64 },
    ],
    fin: { texte: "Rapproché avec F-2053", puce: "Écriture passée", ton: "vert" },
  },
};

const mouvementReduit = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ── une avancée de 0 à 100 ── */
function useAvancee(duree: number) {
  const [p, setP] = useState(0);

  useEffect(() => {
    const reduit = mouvementReduit();
    const t0 = performance.now();
    let raf = 0;
    const pas = (t: number) => {
      const v = reduit ? 100 : Math.min(100, Math.round(((t - t0) / duree) * 100));
      setP((avant) => (avant === v ? avant : v));
      if (v < 100) raf = requestAnimationFrame(pas);
    };
    raf = requestAnimationFrame(pas);
    return () => cancelAnimationFrame(raf);
  }, [duree]);

  return p;
}

/* ── la bulle et son écran ── */
function EcranModule({ ecran }: { ecran: Ecran }) {
  const p = useAvancee(LISTE_MS);
  return (
    <div className="flex w-full items-end gap-3">
      <div className="eb-blanc eb-ombre eb-texte flex size-8 shrink-0 items-center justify-center rounded-lg [&>svg]:size-4">
        {ecran.icone}
      </div>
      <div className="relative min-w-0 flex-1">
        <span aria-hidden="true" className="eb-queue" />
        <div className="eb-blanc eb-ombre relative h-[236px] overflow-hidden rounded-3xl">
          <div className="flex h-full flex-col px-4 pt-3.5 pb-6">
            <div className="eb-doux mb-1.5 flex shrink-0 justify-between gap-3 text-[11px] font-semibold tracking-[0.05em] uppercase">
              <span className="truncate">{ecran.titre}</span>
              <span>Exemple</span>
            </div>
            <div className="flex min-h-0 flex-1 flex-col">
              {ecran.rangs
                .filter((rang) => p >= rang.seuil)
                .map((rang) => (
                  <div
                    key={rang.gauche}
                    className="eb-anim-ligne eb-trait flex h-[29px] shrink-0 items-center gap-3 border-t text-[13px] first:border-t-0"
                  >
                    <span className="eb-texte min-w-0 flex-1 truncate">{rang.gauche}</span>
                    <b className="font-medium whitespace-nowrap tabular-nums">{rang.droite}</b>
                  </div>
                ))}
              {p >= 84 && (
                <div className="eb-anim-ligne eb-trait flex h-[33px] shrink-0 items-center gap-2 border-t text-xs">
                  <Check size={13} strokeWidth={2.4} className="eb-texte shrink-0" />
                  <span className="eb-texte min-w-0 flex-1 truncate">{ecran.fin.texte}</span>
                  <span
                    className={`eb-puce shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap ${ecran.fin.ton === "vert" ? "eb-ton-vert" : "eb-ton-ambre"}`}
                  >
                    {ecran.fin.puce}
                  </span>
                </div>
              )}
            </div>
            <div className="absolute right-3 bottom-2.5 left-3">
              <div className="eb-piste h-1 overflow-hidden rounded-full">
                <div className="eb-remplit h-full rounded-full" style={{ width: `${p}%` }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OngletsGestion() {
  const onglets = MODULES.onglets;
  const [actif, setActif] = useState(0);
  const barres = useRef<(HTMLSpanElement | null)[]>([]);
  const pause = useRef(false);
  const nombre = onglets.length;

  useEffect(() => {
    const barre = barres.current[actif];
    if (mouvementReduit()) {
      if (barre) barre.style.width = "100%";
      return () => {
        if (barre) barre.style.width = "0%";
      };
    }
    let ecoule = 0;
    let dernier = performance.now();
    let raf = 0;
    const pas = (t: number) => {
      if (!pause.current) ecoule += t - dernier;
      dernier = t;
      const reste = Math.max(1 - ecoule / CYCLE_MS, 0);
      if (barre) barre.style.width = `${reste * 100}%`;
      if (reste <= 0) {
        setActif((i) => (i + 1) % nombre);
        return;
      }
      raf = requestAnimationFrame(pas);
    };
    raf = requestAnimationFrame(pas);
    return () => {
      cancelAnimationFrame(raf);
      if (barre) barre.style.width = "0%";
    };
  }, [actif, nombre]);

  return (
    <div
      className="eb flex w-full flex-col overflow-hidden bg-[#fafafa] md:min-h-[380px] md:flex-row"
      onPointerEnter={() => {
        pause.current = true;
      }}
      onPointerLeave={() => {
        pause.current = false;
      }}
      onFocus={() => {
        pause.current = true;
      }}
      onBlur={() => {
        pause.current = false;
      }}
    >
      {/* à gauche : les modules et leur phrase */}
      <div className="flex flex-1 flex-col justify-center px-6 py-8 lg:px-10 lg:py-12">
        <h3 className="m-0 mb-6 text-2xl leading-[1.2] font-medium tracking-[-0.03em] md:mb-9">
          {MODULES.titre.join(" ")}
        </h3>
        <div className="flex flex-col">
          {onglets.map((onglet, index) => {
            const ouvert = index === actif;
            return (
              <div key={onglet.id}>
                <button
                  type="button"
                  aria-expanded={ouvert}
                  aria-controls={`eb-module-${onglet.id}`}
                  onClick={() => setActif(index)}
                  className="block w-full cursor-pointer border-0 bg-transparent p-0 py-2.5 text-left select-none"
                >
                  <span
                    className={`block text-base font-semibold tracking-[-0.01em] transition-colors duration-200 ${ouvert ? "eb-encre" : "eb-doux"}`}
                  >
                    {onglet.titre}
                  </span>
                  <span
                    className={`mt-1 block h-0.5 overflow-hidden rounded-full transition-colors duration-200 ${ouvert ? "eb-piste" : ""}`}
                  >
                    <span
                      ref={(el) => {
                        barres.current[index] = el;
                      }}
                      className="eb-remplit block h-full rounded-full"
                      style={{ width: "0%" }}
                    />
                  </span>
                </button>
                <div
                  id={`eb-module-${onglet.id}`}
                  className="eb-deplie overflow-hidden"
                  style={{ maxHeight: ouvert ? 150 : 0, opacity: ouvert ? 1 : 0 }}
                >
                  <p
                    key={ouvert ? "ouvert" : "ferme"}
                    className={`eb-doux m-0 mb-4 max-w-[400px] text-[15px] leading-[1.6] ${ouvert ? "eb-anim-desc" : ""}`}
                  >
                    {onglet.texte}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="eb-piste h-px w-full shrink-0 md:h-auto md:w-px md:self-stretch" />

      {/* à droite : l'écran du module */}
      <div aria-hidden="true" className="flex flex-1 flex-col items-start justify-end p-6 lg:p-10">
        <div key={actif} className="eb-anim-panneau w-full">
          <EcranModule ecran={ECRANS[onglets[actif].id] ?? ECRANS.ventes} />
        </div>
      </div>
    </div>
  );
}
