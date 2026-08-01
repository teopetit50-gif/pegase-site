"use client";

/* ══════════════════════════════════════════════════════════════════════
   /reserver-un-audit — simulateur (26/07/2026)

   Équivalent du simulateur de rémunération de la page de référence, même
   place et même découpe (colonne de réglages à gauche, panneau de résultat
   à droite). Le sujet change : on n'estime pas un gain versé par Omega,
   on estime ce que la situation actuelle coûte sur douze mois.

   Toutes les hypothèses de calcul sont AFFICHÉES sous le résultat. Un
   simulateur qui cache sa formule est une promesse déguisée ; celui-ci
   n'est qu'une mise en ordre des chiffres que le dirigeant connaît déjà,
   et l'audit est justement ce qui les remplace par des chiffres relevés.
   ══════════════════════════════════════════════════════════════════════ */

import { useState } from "react";
import { lienReservation } from "@/lib/reservation";

/* 46 semaines travaillées : 52 moins congés et jours fériés — l'hypothèse
   est basse à dessein, un chiffrage qui gonfle ne sert personne. */
const SEMAINES = 46;
/* part des devis sans réponse qui se seraient conclus s'ils avaient été
   relancés. Volontairement prudente, et affichée. */
const CONVERSION = 0.25;

type Profil = {
  id: string;
  label: string;
  echues: number;
  devis: number;
  heures: number;
  taux: number;
};

const PROFILS: Profil[] = [
  { id: "artisan", label: "Artisan / BTP", echues: 12000, devis: 8000, heures: 6, taux: 45 },
  { id: "commerce", label: "Commerce / restauration", echues: 3000, devis: 1500, heures: 8, taux: 38 },
  { id: "services", label: "Services / libéral", echues: 6000, devis: 4000, heures: 5, taux: 60 },
];

const euros = (n: number) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(Math.max(0, Math.round(n)));

function Champ({
  label,
  valeur,
  onChange,
  suffixe,
  pas = 500,
}: {
  label: string;
  valeur: number;
  onChange: (n: number) => void;
  suffixe: string;
  pas?: number;
}) {
  return (
    <label className="block">
      <span className="text-[14px] font-semibold leading-[20px] text-[#050505]">{label}</span>
      <span className="mt-2 flex items-center gap-2">
        <input
          type="number"
          min={0}
          step={pas}
          value={valeur}
          onChange={(e) => onChange(Number(e.target.value))}
          className="r-champ"
        />
        <span className="shrink-0 text-[14px] text-[#616161]">{suffixe}</span>
      </span>
    </label>
  );
}

export default function Simulateur() {
  const [profil, setProfil] = useState(0);
  const [echues, setEchues] = useState(PROFILS[0].echues);
  const [devis, setDevis] = useState(PROFILS[0].devis);
  const [heures, setHeures] = useState(PROFILS[0].heures);
  const [taux, setTaux] = useState(PROFILS[0].taux);

  const choisirProfil = (i: number) => {
    const p = PROFILS[i];
    setProfil(i);
    setEchues(p.echues);
    setDevis(p.devis);
    setHeures(p.heures);
    setTaux(p.taux);
  };

  const coutAdmin = heures * SEMAINES * taux;
  const caAttente = devis * 12 * CONVERSION;
  const total = coutAdmin + caAttente;

  return (
    <section id="simulateur" data-monde="clair" className="r-wrap py-14 sm:py-20">
      <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
        {/* ——— colonne de réglages ——— */}
        <div>
          <h2 className="r-h3 max-w-[18ch]">Estimez ce que votre situation vous coûte</h2>
          <p className="r-lead mt-5 max-w-[52ch]">
            Trois chiffres que vous connaissez de tête suffisent à poser un ordre de
            grandeur. C&apos;est le calcul que l&apos;audit refait sur vos documents
            réels, en trente minutes.
          </p>

          <div className="mt-8">
            <div className="text-[14px] font-semibold leading-[20px] text-[#050505]">
              Partir d&apos;un profil
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {PROFILS.map((p, i) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => choisirProfil(i)}
                  data-actif={profil === i}
                  className="r-seg-btn border border-[#e3e3e3] bg-white data-[actif=true]:border-[#050505]"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            <Champ
              label="Factures échues aujourd'hui"
              valeur={echues}
              onChange={setEchues}
              suffixe="€"
            />
            <Champ
              label="Devis sans réponse le mois dernier"
              valeur={devis}
              onChange={setDevis}
              suffixe="€"
            />
            <Champ
              label="Heures d'administratif par semaine"
              valeur={heures}
              onChange={setHeures}
              suffixe="h"
              pas={1}
            />
            <Champ
              label="Valeur d'une heure de dirigeant"
              valeur={taux}
              onChange={setTaux}
              suffixe="€"
              pas={5}
            />
          </div>
        </div>

        {/* ——— panneau de résultat ——— */}
        <div className="rounded-2xl bg-white p-7 sm:p-9">
          <div className="text-[14px] font-semibold leading-[20px] text-[#050505]">
            Sur douze mois
          </div>
          <div className="num mt-2 text-[44px] font-semibold leading-[52px] text-[#050505] sm:text-[56px] sm:leading-[64px]">
            {euros(total)}
          </div>
          <p className="mt-2 text-[14px] leading-[22px] text-[#3d3d3d]">
            Ce que la situation actuelle consomme, avant même de parler
            d&apos;automatisation.
          </p>

          <dl className="mt-7 space-y-4 border-t border-[#e3e3e3] pt-6">
            <div className="flex items-baseline justify-between gap-6">
              <dt className="text-[14px] leading-[22px] text-[#3d3d3d]">
                Temps administratif
                <span className="block text-[12px] leading-[18px] text-[#616161]">
                  {heures} h × {SEMAINES} semaines × {euros(taux)}
                </span>
              </dt>
              <dd className="num shrink-0 text-[17px] font-semibold leading-[24px] text-[#050505]">
                {euros(coutAdmin)}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-6">
              <dt className="text-[14px] leading-[22px] text-[#3d3d3d]">
                Chiffre d&apos;affaires en attente
                <span className="block text-[12px] leading-[18px] text-[#616161]">
                  {euros(devis)} × 12 mois × {Math.round(CONVERSION * 100)} % de
                  conversion
                </span>
              </dt>
              <dd className="num shrink-0 text-[17px] font-semibold leading-[24px] text-[#050505]">
                {euros(caAttente)}
              </dd>
            </div>
          </dl>

          <div className="mt-6 rounded-lg bg-[#f5f5f5] px-4 py-3.5">
            <div className="flex items-baseline justify-between gap-6">
              <span className="text-[14px] leading-[22px] text-[#3d3d3d]">
                Trésorerie immobilisée aujourd&apos;hui
              </span>
              <span className="num shrink-0 text-[17px] font-semibold leading-[24px] text-[#050505]">
                {euros(echues)}
              </span>
            </div>
            <p className="mt-1 text-[12px] leading-[18px] text-[#616161]">
              Comptée à part : cet argent n&apos;est pas perdu, il est chez vos clients.
            </p>
          </div>

          <a
            href={lienReservation("Audit complet (90 min)")}
            className="r-btn r-btn--noir mt-7 w-full"
          >
            Faire chiffrer mes vrais chiffres
          </a>
          <p className="r-note mt-2 text-center">Gratuit — réponse le jour même</p>
        </div>
      </div>

      <p className="r-note mt-8 max-w-4xl">
        Simulation indicative, fondée sur les seules valeurs que vous saisissez et sur
        deux hypothèses affichées ci-dessus ({SEMAINES} semaines travaillées,{" "}
        {Math.round(CONVERSION * 100)} % des devis sans réponse convertibles après
        relance). Elle ne constitue ni un engagement, ni un conseil, ni une promesse de
        résultat : l&apos;audit remplace ces hypothèses par vos chiffres relevés.
      </p>
    </section>
  );
}
