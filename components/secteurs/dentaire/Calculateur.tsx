"use client";
/* ══════════════════════════════════════════════════════════════════════
   Calculateur — « Ce que coûtent vos créneaux perdus » (`C_pa`, `C_pr`
   et le nombre animé `pn` de la source). Trois curseurs (annulations
   tardives par semaine, durée d'un créneau, valeur d'une heure de
   fauteuil), et à droite les heures et la valeur perdues par mois.

     heures perdues / mois = annulations × durée × 4,33 semaines × 51 % / 60

   51 % est la part NON remplacée des annulations dentaires à moins de
   48 h (49 % remplacées : Doctolib, 2024 — vérifié dans l'étude du
   secteur). Ce n'est pas un prix : c'est ce que le cabinet perd, avec
   SES chiffres ; la page n'affiche aucun montant de Tiroma.

   Rhabillage du 24/09 : le panneau de droite n'est plus un dégradé bleu
   saturé au texte blanc, mais un vert d'eau très clair au texte foncé,
   filet à gauche (en haut sous `lg`) ; le bouton passe au vert d'eau
   soutenu.

   Écarts : le bouton du panneau de droite (« Voir ce que Tiroma reprendrait »,
   un <button> vers omegaai.fr/reserver) est un lien vers
   /reserver-un-audit ; la feuille de style injectée pour le pouce des
   curseurs (`.roi-range`) vit dans dentaire.css (`.dentaire-curseur`).
   ══════════════════════════════════════════════════════════════════════ */
import Link from "next/link";
import { ArrowRight, Clock, Sparkles, TrendingUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { RESERVER } from "./outils";

const LANGUE = "fr-FR";
const PART_NON_REMPLACEE = 0.51;
const SEMAINES_PAR_MOIS = 4.33;

/* `pn` : la valeur affichée rattrape la cible en 600 ms, courbe cubique. */
function useNombreAnime(cible: number, duree = 600) {
  const [valeur, setValeur] = useState(cible);
  const depart = useRef(cible);
  const image = useRef<number | null>(null);
  const debut = useRef<number | null>(null);

  useEffect(() => {
    const de = depart.current;
    if (de === cible) return;
    debut.current = null;
    const pas = (t: number) => {
      if (debut.current === null) debut.current = t;
      const avance = Math.min((t - debut.current) / duree, 1);
      setValeur(de + (cible - de) * (1 - Math.pow(1 - avance, 3)));
      if (avance < 1) image.current = requestAnimationFrame(pas);
      else depart.current = cible;
    };
    image.current = requestAnimationFrame(pas);
    return () => {
      if (image.current) cancelAnimationFrame(image.current);
      depart.current = cible;
    };
  }, [cible, duree]);

  return valeur;
}

type CurseurProps = {
  id: string;
  libelle: string;
  valeur: number;
  min: number;
  max: number;
  pas?: number;
  affichage: string;
  onChange: (v: number) => void;
};

function Curseur({ id, libelle, valeur, min, max, pas = 1, affichage, onChange }: CurseurProps) {
  const part = ((valeur - min) / (max - min)) * 100;
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <label htmlFor={id} className="text-sm font-medium text-slate-600">
          {libelle}
        </label>
        <span className="text-sm font-bold tabular-nums text-slate-900">{affichage}</span>
      </div>
      <input
        id={id}
        name={id}
        type="range"
        min={min}
        max={max}
        step={pas}
        value={valeur}
        onChange={(e) => onChange(Number(e.target.value))}
        className="dentaire-curseur h-2 w-full cursor-pointer appearance-none rounded-full"
        style={{
          background: `linear-gradient(to right, #3b7a6e 0%, #3b7a6e ${part}%, rgb(226 232 240) ${part}%, rgb(226 232 240) 100%)`,
        }}
      />
    </div>
  );
}

export default function Calculateur() {
  const [annulations, setAnnulations] = useState(6);
  const [duree, setDuree] = useState(45);
  const [valeurHeure, setValeurHeure] = useState(250);

  const heures = (annulations * duree * SEMAINES_PAR_MOIS * PART_NON_REMPLACEE) / 60;
  const heuresAnimees = useNombreAnime(heures);
  const valeurAnimee = useNombreAnime(heures * valeurHeure);

  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-900/5">
      <div className="grid lg:grid-cols-[1fr_0.9fr]">
        <div className="p-7 lg:p-10">
          <div className="mb-6 flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#e3f0ed] text-[#3b7a6e]">
              <Sparkles size={18} />
            </span>
            <span className="font-mono text-xs uppercase tracking-widest text-slate-400">
              Ce que coûtent vos créneaux perdus
            </span>
          </div>
          <div className="space-y-7">
            <Curseur
              id="tiroma-annulations"
              libelle="Annulations tardives par semaine"
              valeur={annulations}
              min={1}
              max={30}
              affichage={String(annulations)}
              onChange={setAnnulations}
            />
            <Curseur
              id="tiroma-duree"
              libelle="Durée moyenne d'un créneau"
              valeur={duree}
              min={15}
              max={120}
              pas={15}
              affichage={`${duree} min`}
              onChange={setDuree}
            />
            <Curseur
              id="tiroma-valeur-heure"
              libelle="Valeur d'une heure de fauteuil"
              valeur={valeurHeure}
              min={100}
              max={600}
              pas={10}
              affichage={`${valeurHeure} €`}
              onChange={setValeurHeure}
            />
          </div>
          <p className="mt-7 text-xs leading-relaxed text-slate-400">
            Estimation à partir de vos chiffres et de la part des annulations tardives qui ne sont pas remplacées
            (51 %, Doctolib 2024).
          </p>
        </div>
        <div className="relative flex flex-col justify-center gap-6 overflow-hidden border-t border-[#e3f0ed] bg-[#f3f8f7] p-7 text-slate-900 lg:border-l lg:border-t-0 lg:p-10">
          <div
            className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full"
            style={{ background: "radial-gradient(circle, rgba(114,176,164,0.18), transparent 70%)" }}
          />
          <div className="relative">
            <div className="mb-1 flex items-center gap-2 text-sm font-medium text-[#30635a]">
              <Clock size={16} />
              Heures de fauteuil perdues par mois
            </div>
            <div className="text-4xl font-black tabular-nums tracking-tight lg:text-5xl">
              {heuresAnimees.toLocaleString(LANGUE, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}{" "}
              <span className="text-2xl font-bold text-[#3b7a6e] lg:text-3xl">h</span>
            </div>
          </div>
          <div className="relative h-px bg-[#c7e1db]" />
          <div className="relative">
            <div className="mb-1 flex items-center gap-2 text-sm font-medium text-[#30635a]">
              <TrendingUp size={16} />
              Valeur perdue par mois
            </div>
            <div className="text-5xl font-black tabular-nums tracking-tight lg:text-6xl">
              {Math.round(valeurAnimee).toLocaleString(LANGUE)} <span className="text-3xl lg:text-4xl">€</span>
            </div>
            <div className="mt-1 text-sm font-medium text-[#30635a]">
              {"≈ "}
              {Math.round(12 * valeurAnimee).toLocaleString(LANGUE)}
              {" € par an"}
            </div>
          </div>
          <Link
            href={RESERVER}
            className="group relative mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-[#3b7a6e] px-6 py-3.5 font-semibold text-white transition-colors hover:bg-[#30635a]"
          >
            Voir ce que Tiroma reprendrait
            <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </div>
  );
}
