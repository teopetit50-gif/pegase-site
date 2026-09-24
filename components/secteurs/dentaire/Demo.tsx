"use client";
/* ══════════════════════════════════════════════════════════════════════
   « Essayez sur votre matinée » (#demo) — la démo de la source : trois
   champs (cabinet, annulation, contexte), un bouton, et le point du matin
   que Tiroma préparerait. Tout se passe DANS LE NAVIGATEUR : une attente
   de 900 ms, puis trois patients d'exemple classés (plan accepté, liste
   d'attente, contrôle dû). Rien n'est envoyé nulle part, et le résultat
   le dit (« Données d'exemple, aucun vrai patient », « Exemple préparé
   dans votre navigateur »).

   Écarts : « Réserver une démo » (omegaai.fr/reserver) → « Réserver un
   audit », lien vers /reserver-un-audit ; le `try / catch` autour d'une
   attente qui ne peut pas échouer, et son message d'erreur, sont retirés.
   Les champs reçoivent un nom accessible (`aria-label`, le libellé de
   leur exemple) : la source n'en avait que le texte indicatif.
   ══════════════════════════════════════════════════════════════════════ */
import Link from "next/link";
import { Bot, ChevronRight, Clock, LoaderCircle } from "lucide-react";
import { useState } from "react";
import Apparition from "./Apparition";
import { RESERVER } from "./outils";
import { Surtitre } from "./Surtitre";

type Proposition = { rang: number; patient: string; motif: string; note: string };
type Point = { cabinet: string; creneau: string; propositions: Proposition[]; date: string; lettre: string };

const PROPOSITIONS: Proposition[] = [
  { rang: 1, patient: "Mme R. · couronne 26, plan signé il y a 41 jours", motif: "Plan accepté", note: "préfère le matin" },
  { rang: 2, patient: "M. P. · en liste d'attente depuis 9 jours", motif: "Liste d'attente", note: "45 min demandées" },
  { rang: 3, patient: "Mme A. · contrôle dû depuis 14 mois", motif: "Contrôle dû", note: "habite à 5 min" },
];

const CHAMP =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-[#4f9587]";

export default function Demo() {
  const [saisie, setSaisie] = useState({
    cabinet: "Cabinet des Tilleuls",
    annulation: "Demain 10 h 30, fauteuil 2, 45 min",
    contexte: "12 plans signés sans rendez-vous, 9 patients en liste d'attente",
  });
  const [enCours, setEnCours] = useState(false);
  const [point, setPoint] = useState<Point | null>(null);

  const preparer = async () => {
    setEnCours(true);
    await new Promise((r) => setTimeout(r, 900));
    setPoint({
      cabinet: saisie.cabinet,
      creneau: saisie.annulation,
      propositions: PROPOSITIONS,
      date: new Date().toLocaleDateString("fr-FR"),
      lettre:
        "Voici qui peut reprendre ce créneau. Tiroma classe d'abord les plans acceptés, puis la liste d'attente, puis les contrôles dus : l'assistante n'a plus qu'à appeler, dans l'ordre.",
    });
    setEnCours(false);
  };

  return (
    <section id="demo" data-monde="clair" className="bg-white py-24 lg:py-32">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-12">
        <Apparition className="mx-auto mb-16 max-w-3xl text-center">
          <Surtitre>Démo en direct</Surtitre>
          <h2 className="mb-6 text-3xl text-slate-900 lg:text-5xl">Essayez sur votre matinée</h2>
          <p className="text-lg text-slate-600">
            Décrivez une annulation : voici le point du matin que Tiroma préparerait
          </p>
        </Apparition>
        <Apparition delay={150}>
          <div className="grid gap-8 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/5 lg:p-8">
                <input
                  className={CHAMP}
                  aria-label="Cabinet"
                  placeholder="Cabinet (ex. Cabinet des Tilleuls)"
                  value={saisie.cabinet}
                  onChange={(e) => setSaisie({ ...saisie, cabinet: e.target.value })}
                />
                <input
                  className={CHAMP}
                  aria-label="Annulation"
                  placeholder="Annulation (ex. demain 10 h 30, fauteuil 2)"
                  value={saisie.annulation}
                  onChange={(e) => setSaisie({ ...saisie, annulation: e.target.value })}
                />
                <textarea
                  className={`${CHAMP} resize-none`}
                  aria-label="Ce que vous savez"
                  rows={4}
                  placeholder="Ce que vous savez (ex. 12 plans signés, 9 en liste d’attente)"
                  value={saisie.contexte}
                  onChange={(e) => setSaisie({ ...saisie, contexte: e.target.value })}
                />
                <button
                  type="button"
                  onClick={preparer}
                  disabled={enCours}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#3b7a6e] py-4 text-white transition-all hover:bg-[#30635a] active:scale-[0.98] disabled:opacity-70"
                >
                  {enCours ? <LoaderCircle className="animate-spin" size={18} /> : <Bot size={18} />}
                  Préparer le point du matin
                </button>
              </div>
            </div>
            <div className="flex flex-col justify-center lg:col-span-3">
              {enCours ? (
                <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/5">
                  <p className="mb-2 text-xs font-medium uppercase tracking-widest text-[#3b7a6e]">
                    🦷 Tiroma prépare votre point du matin…
                  </p>
                  {["📅 Lecture de l'agenda…", "📋 Rapprochement des plans signés…", "🧑‍⚕️ Classement des patients…"].map(
                    (etape, i) => (
                      <div
                        key={etape}
                        className="flex animate-pulse items-center gap-2 text-sm text-slate-600"
                        style={{ animationDelay: `${0.4 * i}s` }}
                      >
                        <span>{etape}</span>
                      </div>
                    ),
                  )}
                </div>
              ) : point ? (
                <Resultat point={point} />
              ) : (
                <div className="space-y-3 rounded-xl border-2 border-dashed border-slate-200 p-10 text-center text-slate-400">
                  <Bot size={40} className="mx-auto opacity-20" />
                  <p className="text-sm">Décrivez une annulation et préparez le point du matin</p>
                  <p className="text-xs opacity-60">Annulation → point du matin</p>
                </div>
              )}
            </div>
          </div>
        </Apparition>
      </div>
    </section>
  );
}

function Resultat({ point }: { point: Point }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-900/5">
      <div className="border-b border-slate-100 px-6 pb-4 pt-6 lg:px-8 lg:pt-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-lg text-slate-900">{point.cabinet}</p>
            <p className="text-sm text-slate-600">Point du matin préparé par Tiroma</p>
            <p className="text-sm text-slate-600">Lecture seule de l&apos;agenda et des plans</p>
            <p className="mt-1 text-sm text-slate-600">Données d&apos;exemple, aucun vrai patient</p>
          </div>
          <div className="shrink-0 text-right">
            <h3 className="text-xl uppercase tracking-tight text-[#3b7a6e]">Point du matin</h3>
            <p className="mt-1 text-sm text-slate-500">EXEMPLE</p>
            <p className="text-sm text-slate-500">{point.date}</p>
          </div>
        </div>
      </div>
      <div className="px-6 py-4 lg:px-8">
        <p className="text-slate-900">Créneau libéré</p>
        <p className="text-sm text-slate-600">{point.creneau}</p>
      </div>
      <div className="border-t border-slate-100 px-6 py-4 lg:px-8">
        <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">{point.lettre}</p>
      </div>
      <div className="border-t border-slate-100 px-6 py-4 lg:px-8">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="w-12 py-2 text-left text-slate-500">Rang</th>
              <th className="py-2 text-left text-slate-500">Patient proposé</th>
              <th className="w-32 py-2 text-right text-slate-500">Motif</th>
              <th className="w-36 py-2 text-right text-slate-500">À savoir</th>
            </tr>
          </thead>
          <tbody>
            {point.propositions.map((p) => (
              <tr key={p.rang} className="border-b border-slate-100">
                <td className="py-2.5 text-slate-400">{p.rang}</td>
                <td className="py-2.5 text-slate-800">{p.patient}</td>
                <td className="py-2.5 text-right text-slate-500">{p.motif}</td>
                <td className="py-2.5 text-right font-mono text-slate-900">{p.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="border-t border-slate-200 bg-slate-50 px-6 py-5 lg:px-8">
        <div className="flex justify-between text-sm text-slate-600">
          <span>Créneau</span>
          <span className="font-mono">{point.creneau}</span>
        </div>
        <div className="mt-1 flex justify-between text-sm text-slate-600">
          <span>Patients proposés</span>
          <span className="font-mono">{point.propositions.length}</span>
        </div>
        <div className="mt-2 flex justify-between border-t border-slate-200 pt-2 text-lg text-slate-900">
          <span>À appeler en premier</span>
          <span className="font-mono text-[#3b7a6e]">Rang 1</span>
        </div>
      </div>
      <div className="flex flex-col items-center justify-between gap-4 border-t border-slate-200 px-6 py-5 sm:flex-row lg:px-8">
        <span className="flex items-center gap-1 text-xs text-slate-400">
          <Clock size={12} /> Exemple préparé dans votre navigateur
        </span>
        <Link
          href={RESERVER}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#3b7a6e] px-6 py-3 text-sm text-white transition-all hover:bg-[#30635a] sm:w-auto"
        >
          Réserver un audit <ChevronRight size={14} />
        </Link>
      </div>
    </div>
  );
}
