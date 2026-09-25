"use client";
/* ══════════════════════════════════════════════════════════════════════
   « Essayez sur votre matinée » (#demo) — la démo de la source : trois
   champs (cabinet, annulation, contexte), un bouton, et le point du matin
   que Tiroma préparerait. Tout se passe DANS LE NAVIGATEUR : une attente
   de 900 ms, puis un point du matin d'exemple. Rien n'est envoyé nulle
   part, et le résultat le dit (« Données d'exemple, aucun vrai patient »,
   « Exemple préparé dans votre navigateur »).

   24/09/2026 (soir) — LE POINT DU MATIN EST COMPLET. Teo : « le plan du
   matin, qu'il soit énormément plus complet, là c'est juste ». La source
   ne rendait qu'un créneau et trois patients. Il rend maintenant ce qu'un
   titulaire lit vraiment à 7 h :
     1. la journée en quatre chiffres (rendez-vous, créneaux libérés,
        plans signés sans rendez-vous, contrôles dus) ;
     2. le créneau saisi, avec quatre candidats classés, leur acte, la
        durée qui tient dans le créneau, et ce qu'il faut savoir ;
     3. les plans signés sans rendez-vous : acte et dent (numérotation
        FDI), séances, montant, reste à charge, accord de mutuelle, et
        l'action proposée ;
     4. la charge de chaque fauteuil et ses creux ;
     5. ce qu'il faut vérifier avant les rendez-vous (labo, mutuelle,
        questionnaire médical) ;
     6. la liste d'appels de l'assistante, dans l'ordre, et les rappels
        de contrôle prêts, qui ne partent pas sans validation.
   Aucune radiographie, aucune lecture d'image : Tiroma lit l'agenda, les
   plans et les devis, rien d'autre (dispositif médical exclu). Montants
   plausibles pour la France (céramo-métallique sur une première
   prémolaire = panier 100 % Santé, 500 € au plafond).

   Le point s'affiche D'EMBLÉE (le visiteur voit le résultat sans cliquer) ;
   le bouton le prépare de nouveau avec le cabinet et le créneau saisis. La
   date est fixe (« jeudi 25 septembre ») : une date calculée diffère entre
   le serveur et le navigateur et casse l'hydratation.

   Écarts de la source toujours valables : « Réserver une démo » → « Réserver
   un audit » (/reserver-un-audit) ; champs nommés (`aria-label`). Les
   émojis de l'attente deviennent des pictogrammes, comme sur les autres
   pages de secteur. Plus de police à chasse fixe dans les cellules : elle
   décalait les colonnes ; les chiffres sont en `tabular-nums`.
   ══════════════════════════════════════════════════════════════════════ */
import Link from "next/link";
import {
  Armchair,
  BellRing,
  Bot,
  CalendarClock,
  ChevronRight,
  CircleCheck,
  ClipboardList,
  Clock,
  FlaskConical,
  ListChecks,
  LoaderCircle,
  Phone,
  ShieldCheck,
  Stethoscope,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import Apparition from "./Apparition";
import { RESERVER } from "./outils";
import { Surtitre } from "./Surtitre";

const VERT = "#3b7a6e";

type Saisie = { cabinet: string; annulation: string; contexte: string };

/* ── les données d'exemple ─────────────────────────────────────────────── */

const CHIFFRES = [
  { valeur: "34", libelle: "rendez-vous aujourd'hui", detail: "sur 3 fauteuils" },
  { valeur: "2", libelle: "créneaux libérés", detail: "1 h 15 à reprendre" },
  { valeur: "12", libelle: "plans signés sans rendez-vous", detail: "dont 3 depuis plus de 30 jours" },
  { valeur: "41", libelle: "contrôles dus", detail: "18 rappels prêts" },
];

type Candidat = { rang: number; patient: string; acte: string; motif: string; duree: string; note: string };
const CANDIDATS: Candidat[] = [
  {
    rang: 1,
    patient: "Mme R.",
    acte: "Couronne 26, plan signé il y a 41 jours",
    motif: "Plan accepté",
    duree: "45 min prévues",
    note: "Préfère le matin",
  },
  {
    rang: 2,
    patient: "M. D.",
    acte: "Couronne céramo-métallique 14, accord de mutuelle reçu hier",
    motif: "Plan accepté",
    duree: "45 min prévues",
    note: "Reste à charge 0 €",
  },
  {
    rang: 3,
    patient: "M. P.",
    acte: "Détartrage et contrôle, en liste d'attente depuis 9 jours",
    motif: "Liste d'attente",
    duree: "40 min demandées",
    note: "Disponible sous 1 h",
  },
  {
    rang: 4,
    patient: "Mme A.",
    acte: "Contrôle annuel dû depuis 14 mois",
    motif: "Contrôle dû",
    duree: "30 min",
    note: "Habite à 5 min",
  },
];

type Etat = "ok" | "attente" | "alerte";
type Plan = {
  patient: string;
  acte: string;
  seances: string;
  montant: string;
  reste: string;
  mutuelle: { texte: string; etat: Etat };
  signe: string;
  action: string;
};
const PLANS: Plan[] = [
  {
    patient: "Mme R.",
    acte: "Couronne 26",
    seances: "1 séance",
    montant: "540 €",
    reste: "120 €",
    mutuelle: { texte: "non requise", etat: "ok" },
    signe: "il y a 41 jours",
    action: "Proposée pour le créneau libéré",
  },
  {
    patient: "M. L.",
    acte: "Implant 24 et couronne",
    seances: "3 séances",
    montant: "1 850 €",
    reste: "1 120 €",
    mutuelle: { texte: "en attente, 12 jours", etat: "alerte" },
    signe: "il y a 34 jours",
    action: "Relancer la mutuelle",
  },
  {
    patient: "Mme B.",
    acte: "Bridge 45-47",
    seances: "2 séances",
    montant: "1 280 €",
    reste: "410 €",
    mutuelle: { texte: "accord reçu", etat: "ok" },
    signe: "il y a 31 jours",
    action: "Planifier 2 × 60 min, fauteuil 1",
  },
  {
    patient: "M. D.",
    acte: "Couronne céramo-métallique 14",
    seances: "1 séance",
    montant: "500 €",
    reste: "0 €, panier 100 % Santé",
    mutuelle: { texte: "accord reçu hier", etat: "ok" },
    signe: "il y a 19 jours",
    action: "Proposée en rang 2",
  },
];

const FAUTEUILS = [
  { nom: "Fauteuil 1", praticien: "Dr Martin", taux: 92, creux: "Complet jusqu'à 18 h" },
  { nom: "Fauteuil 2", praticien: "Dr Lebrun", taux: 74, creux: "Creux de 11 h 30 à 12 h 15" },
  { nom: "Fauteuil 3", praticien: "Collaborateur", taux: 51, creux: "Après-midi sans assistante : 2 h 30 vides" },
];

const VERIFICATIONS: { icone: LucideIcon; etat: Etat; titre: string; detail: string; geste: string }[] = [
  {
    icone: FlaskConical,
    etat: "alerte",
    titre: "Couronne 46 de M. L., rendez-vous à 14 h",
    detail: "La pièce n'est pas encore revenue du laboratoire.",
    geste: "Appeler le labo avant 9 h",
  },
  {
    icone: ShieldCheck,
    etat: "ok",
    titre: "Accord de mutuelle reçu pour Mme B.",
    detail: "Bridge 45-47 : le plan peut entrer à l'agenda.",
    geste: "Planifier les deux séances",
  },
  {
    icone: Stethoscope,
    etat: "attente",
    titre: "2 patients de l'après-midi",
    detail: "Questionnaire médical de plus d'un an.",
    geste: "À faire remplir à l'accueil",
  },
];

const APPELS = [
  { heure: "8 h 05", geste: "Appeler Mme R. pour le créneau libéré (rang 1)" },
  { heure: "8 h 15", geste: "Appeler le laboratoire pour la couronne 46" },
  { heure: "8 h 25", geste: "Relancer la mutuelle de M. L. (implant 24)" },
  { heure: "8 h 35", geste: "Planifier le bridge de Mme B., accord reçu" },
  { heure: "8 h 45", geste: "Relire et valider les 18 rappels de contrôle" },
];

/* ── la page ───────────────────────────────────────────────────────────── */

const CHAMP =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-[#4f9587]";

const DEPART: Saisie = {
  cabinet: "Cabinet des Tilleuls",
  annulation: "Demain 10 h 30, fauteuil 2, 45 min",
  contexte: "12 plans signés sans rendez-vous, 9 patients en liste d'attente",
};

export default function Demo() {
  const [saisie, setSaisie] = useState<Saisie>(DEPART);
  const [enCours, setEnCours] = useState(false);
  const [point, setPoint] = useState<Saisie>(DEPART);

  const preparer = async () => {
    setEnCours(true);
    await new Promise((r) => setTimeout(r, 900));
    setPoint(saisie);
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
          <div className="grid items-start gap-8 lg:grid-cols-5">
            <div className="lg:sticky lg:top-28 lg:col-span-2">
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
                <p className="text-center text-xs text-slate-400">
                  Lecture seule de l&apos;agenda, des plans et des devis. Aucun message ne part sans votre accord.
                </p>
              </div>
            </div>
            <div className="lg:col-span-3">
              {enCours ? <Attente /> : <Resultat point={point} />}
            </div>
          </div>
        </Apparition>
      </div>
    </section>
  );
}

function Attente() {
  const etapes: [LucideIcon, string][] = [
    [CalendarClock, "Lecture de l'agenda des trois fauteuils…"],
    [ClipboardList, "Rapprochement des plans signés et des devis…"],
    [ShieldCheck, "Point sur les accords de mutuelle…"],
    [ListChecks, "Classement des patients et des appels…"],
  ];
  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/5">
      <p className="mb-2 text-xs font-medium uppercase tracking-widest text-[#3b7a6e]">
        Tiroma prépare votre point du matin…
      </p>
      {etapes.map(([Icone, etape], i) => (
        <div
          key={etape}
          className="flex animate-pulse items-center gap-2 text-sm text-slate-600"
          style={{ animationDelay: `${0.3 * i}s` }}
        >
          <Icone size={15} className="shrink-0 text-slate-400" />
          <span>{etape}</span>
        </div>
      ))}
    </div>
  );
}

/* ── le point du matin ─────────────────────────────────────────────────── */

function Bloc({
  icone: Icone,
  titre,
  compte,
  children,
}: {
  icone: LucideIcon;
  titre: string;
  compte?: string;
  children: ReactNode;
}) {
  return (
    <div className="border-t border-slate-100 px-5 py-5 sm:px-6 lg:px-8">
      <div className="mb-3 flex items-center gap-2">
        <Icone size={16} className="shrink-0" style={{ color: VERT }} />
        <p className="text-[15px] text-slate-900">{titre}</p>
        {compte ? <span className="ml-auto hidden text-xs text-slate-500 sm:inline">{compte}</span> : null}
      </div>
      {children}
    </div>
  );
}

const PASTILLE: Record<Etat, string> = {
  ok: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  attente: "bg-slate-100 text-slate-600 ring-slate-200",
  alerte: "bg-amber-50 text-amber-800 ring-amber-200",
};

function Pastille({ etat, children }: { etat: Etat; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] ring-1 ring-inset ${PASTILLE[etat]}`}>
      {children}
    </span>
  );
}

function Resultat({ point }: { point: Saisie }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-900/5">
      {/* en-tête */}
      <div className="px-5 pb-5 pt-6 sm:px-6 lg:px-8 lg:pt-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-lg text-slate-900">{point.cabinet || "Votre cabinet"}</p>
            <p className="text-sm text-slate-600">Point du matin préparé par Tiroma, jeudi 25 septembre, 7 h 00</p>
            <p className="mt-1 text-xs text-slate-500">
              Lecture seule de l&apos;agenda, des plans et des devis · Données d&apos;exemple, aucun vrai patient
            </p>
          </div>
          <span
            className="rounded-full px-3 py-1 text-xs uppercase tracking-widest ring-1 ring-inset ring-[#3b7a6e]/30"
            style={{ color: VERT }}
          >
            Exemple
          </span>
        </div>
        {/* la journée en quatre chiffres */}
        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {CHIFFRES.map((c) => (
            <div key={c.libelle} className="rounded-lg bg-slate-50 px-3 py-3">
              <p className="text-2xl tabular-nums text-slate-900">{c.valeur}</p>
              <p className="text-xs leading-snug text-slate-600">{c.libelle}</p>
              <p className="mt-0.5 text-[11px] leading-snug text-slate-400">{c.detail}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 1. le créneau libéré */}
      <Bloc icone={CalendarClock} titre="Créneau libéré" compte={point.annulation || "Créneau saisi"}>
        <p className="mb-3 text-sm leading-relaxed text-slate-600">
          Tiroma classe d&apos;abord les plans acceptés, puis la liste d&apos;attente, puis les contrôles dus, et ne
          retient que les soins qui tiennent dans le créneau.
        </p>
        <ol className="divide-y divide-slate-100 rounded-lg ring-1 ring-slate-200">
          {CANDIDATS.map((c) => (
            <li key={c.rang} className="grid grid-cols-[28px_1fr] gap-x-3 px-3 py-3 sm:grid-cols-[28px_1fr_auto]">
              <span
                className={`grid size-6 place-items-center rounded-full text-xs tabular-nums ${
                  c.rang === 1 ? "text-white" : "bg-slate-100 text-slate-500"
                }`}
                style={c.rang === 1 ? { backgroundColor: VERT } : undefined}
              >
                {c.rang}
              </span>
              <div className="min-w-0">
                <p className="text-sm text-slate-900">
                  {c.patient} <span className="text-slate-500">· {c.acte}</span>
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {c.duree} · {c.note}
                </p>
              </div>
              <div className="col-start-2 mt-2 sm:col-start-3 sm:mt-0 sm:self-center">
                <Pastille etat={c.rang <= 2 ? "ok" : "attente"}>{c.motif}</Pastille>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-xs text-slate-500">
          Second créneau libéré : aujourd&apos;hui 16 h, fauteuil 3, 30 min. Premier proposé : M. T., contrôle dû.
        </p>
      </Bloc>

      {/* 2. les plans signés sans rendez-vous */}
      <Bloc icone={ClipboardList} titre="Plans signés sans rendez-vous" compte="4 sur 12, du plus ancien">
        <div className="space-y-2">
          {PLANS.map((p) => (
            <div key={p.patient + p.acte} className="rounded-lg px-3 py-3 ring-1 ring-slate-200">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <p className="text-sm text-slate-900">
                  {p.patient} <span className="text-slate-500">· {p.acte}</span>
                </p>
                <p className="text-xs text-slate-500">Signé {p.signe}</p>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-4">
                <p className="text-slate-500">
                  Devis <span className="tabular-nums text-slate-900">{p.montant}</span>
                </p>
                <p className="text-slate-500">
                  Reste à charge <span className="tabular-nums text-slate-900">{p.reste}</span>
                </p>
                <p className="text-slate-500">{p.seances}</p>
                <div>
                  <Pastille etat={p.mutuelle.etat}>Mutuelle : {p.mutuelle.texte}</Pastille>
                </div>
              </div>
              <p className="mt-2 flex items-center gap-1 text-xs" style={{ color: VERT }}>
                <ChevronRight size={12} /> {p.action}
              </p>
            </div>
          ))}
        </div>
      </Bloc>

      {/* 3. les fauteuils */}
      <Bloc icone={Armchair} titre="Fauteuils aujourd'hui" compte="Taux d'occupation">
        <div className="space-y-3">
          {FAUTEUILS.map((f) => (
            <div key={f.nom}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
                <p className="text-slate-900">
                  {f.nom} <span className="text-slate-500">· {f.praticien}</span>
                </p>
                <p className="tabular-nums text-slate-900">{f.taux} %</p>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${f.taux}%`, backgroundColor: f.taux < 60 ? "#d97706" : VERT, opacity: 0.85 }}
                />
              </div>
              <p className="mt-1 text-xs text-slate-500">{f.creux}</p>
            </div>
          ))}
        </div>
      </Bloc>

      {/* 4. avant les rendez-vous */}
      <Bloc icone={TriangleAlert} titre="À vérifier avant les rendez-vous" compte="3 points">
        <div className="space-y-2">
          {VERIFICATIONS.map((v) => (
            <div key={v.titre} className="flex gap-3 rounded-lg px-3 py-3 ring-1 ring-slate-200">
              <span
                className={`grid size-8 shrink-0 place-items-center rounded-lg ${
                  v.etat === "alerte" ? "bg-amber-50 text-amber-700" : v.etat === "ok" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                }`}
              >
                <v.icone size={16} />
              </span>
              <div className="min-w-0">
                <p className="text-sm text-slate-900">{v.titre}</p>
                <p className="text-xs text-slate-500">{v.detail}</p>
                <p className="mt-1 text-xs" style={{ color: VERT }}>
                  {v.geste}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Bloc>

      {/* 5. l'ordre des appels */}
      <Bloc icone={Phone} titre="À faire ce matin, dans l'ordre" compte="Pour l'assistante">
        <ol className="space-y-2">
          {APPELS.map((a, i) => (
            <li key={a.geste} className="flex items-start gap-3 text-sm">
              <CircleCheck size={16} className={`mt-0.5 shrink-0 ${i === 0 ? "" : "text-slate-300"}`} style={i === 0 ? { color: VERT } : undefined} />
              <span className="w-12 shrink-0 tabular-nums text-slate-500">{a.heure}</span>
              <span className="text-slate-800">{a.geste}</span>
            </li>
          ))}
        </ol>
        <div className="mt-4 flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-3 text-xs text-slate-600">
          <BellRing size={14} className="mt-0.5 shrink-0 text-slate-400" />
          <span>
            18 rappels de contrôle sont rédigés et attendent votre validation. Aucun message ne part sans votre accord.
          </span>
        </div>
      </Bloc>

      {/* pied */}
      <div className="flex flex-col items-center justify-between gap-4 border-t border-slate-200 bg-slate-50 px-5 py-5 sm:flex-row sm:px-6 lg:px-8">
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
