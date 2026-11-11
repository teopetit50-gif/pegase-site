"use client";

import { useEffect, useMemo, useState, type SyntheticEvent } from "react";
import { format as formaterDate } from "date-fns";
import { fr } from "date-fns/locale";
import { ArrowRight, CalendarDays, Check, Clock3, MapPin } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/cn";
import { NOM_SITE } from "@/components/espace2/portail";
import {
  DUREES_RDV,
  ERREURS,
  aujourdhuiGp,
  chargerAgenda,
  creneauxDuJour,
  heureGp,
  horizonGp,
  jourGpLabel,
  reserver,
  type Agenda,
  type Demande,
} from "@/lib/creneaux";
import { E_MAIL, FORMATS } from "@/lib/demande-audit";

/* ══════════════════════════════════════════════════════════════════════
   <FormulaireAudit> — la prise de rendez-vous de la section #audit d'un
   site dédié (11/11/2026)

   Teo, 11/11 : « pour la partie réserver un audit, c'est toujours la même
   chose… ça renvoie toujours vers le même composant qu'avant. Alors que ça,
   c'était à changer. Pour tous les SaaS. » Le formulaire de la page d'audit
   d'Omega (FormulaireFormat : dix champs, trois menus, le jour et l'horaire
   en listes) est remplacé par le dessin « book a demo » des sites SaaS : le
   format choisi en trois cartes, le CALENDRIER et les heures du jour à
   gauche (le planificateur ruixen de /reserver, components/ui/calendar),
   quatre champs et le bouton dans une carte à droite.

   Ce qui part : fonction, pays, « comment nous avez-vous connus », le menu
   du secteur — le site dédié connaît son métier (prop `secteur`, la valeur
   de lib/creneaux SECTEURS). Ce qui reste : la même mécanique que partout
   ailleurs, reserver() de lib/creneaux (la fonction SQL valide tout), puis
   l'accusé de réception par /api/reservation/confirmation. Un format sur
   devis (Audit + atelier) n'a pas d'horaire : la demande part telle quelle.

   Sans JavaScript, rien ne part : le texte sous le bouton donne l'adresse.
   ══════════════════════════════════════════════════════════════════════ */

type Props = {
  /** la valeur de SECTEURS (lib/creneaux) du métier du site : btp, archi, avocats… */
  secteur: string;
};

type Champ = "prenom" | "nom" | "email" | "entreprise" | "creneau";

const INK = "text-[#0a0a0a]";
const GRIS = "text-[#616161]";

export default function FormulaireAudit({ secteur }: Props) {
  /* ——— le format ——— */
  const [format, setFormat] = useState(FORMATS[0].id);
  const dureeMin = DUREES_RDV[format] ?? null;
  const avecCreneau = dureeMin !== null;
  const formatChoisi = FORMATS.find((f) => f.id === format) ?? FORMATS[0];

  /* ——— l'agenda ——— */
  const [agenda, setAgenda] = useState<Agenda | null>(null);
  const [agendaErreur, setAgendaErreur] = useState(false);
  const lireAgenda = () =>
    chargerAgenda()
      .then((a) => {
        setAgenda(a);
        setAgendaErreur(false);
      })
      .catch(() => setAgendaErreur(true));
  useEffect(() => {
    void lireAgenda(); // au montage seulement
  }, []);

  const [vue, setVue] = useState(() => {
    const a = aujourdhuiGp();
    return { annee: a.annee, mois: a.mois };
  });
  const [jour, setJour] = useState<number | null>(null);
  const [creneau, setCreneau] = useState<number | null>(null);

  /* les créneaux libres de chaque jour du mois affiché, pour la durée du format */
  const joursDuMois = useMemo(() => {
    const m = new Map<number, number[]>();
    if (!agenda || !dureeMin) return m;
    const nb = new Date(Date.UTC(vue.annee, vue.mois, 0)).getUTCDate();
    for (let j = 1; j <= nb; j++) {
      const libres = creneauxDuJour(agenda, vue.annee, vue.mois, j, dureeMin);
      if (libres.length) m.set(j, libres);
    }
    return m;
  }, [agenda, vue, dureeMin]);

  const auj = aujourdhuiGp();
  const fin = horizonGp();
  const jourLibre = (d: Date) =>
    d.getFullYear() === vue.annee && d.getMonth() === vue.mois - 1 && joursDuMois.has(d.getDate());
  const heures = jour === null ? [] : (joursDuMois.get(jour) ?? []);

  const choisirFormat = (id: string) => {
    setFormat(id);
    setJour(null);
    setCreneau(null);
    setManquants((m) => m.filter((c) => c !== "creneau"));
  };

  /* ——— l'envoi ——— */
  const [manquants, setManquants] = useState<Champ[]>([]);
  const [mailFaux, setMailFaux] = useState(false);
  const [envoi, setEnvoi] = useState<"repos" | "envoi" | "ok" | "erreur">("repos");
  const [motif, setMotif] = useState("");
  const [confirmation, setConfirmation] = useState<{ email: string; quand: string } | null>(null);

  async function envoyer(e: SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (envoi === "envoi" || envoi === "ok") return;
    const brut = Object.fromEntries(new FormData(e.currentTarget).entries());
    const lire = (c: string) => String(brut[c] ?? "").trim();
    const prenom = lire("prenom");
    const nom = lire("nom");
    const email = lire("email");
    const entreprise = lire("entreprise");
    const message = lire("message");

    const champs: Champ[] = [];
    if (!prenom) champs.push("prenom");
    if (!nom) champs.push("nom");
    if (!email || !E_MAIL.test(email)) champs.push("email");
    if (!entreprise) champs.push("entreprise");
    if (avecCreneau && creneau === null) champs.push("creneau");
    setManquants(champs);
    setMailFaux(!!email && !E_MAIL.test(email));
    if (champs.length) return;

    setEnvoi("envoi");
    const demande: Demande = {
      parcours: avecCreneau ? "audit" : "devis",
      formule: format,
      profil: "equipe",
      nom,
      prenom,
      email,
      entreprise,
      secteur,
      message: [`Demande depuis le site ${NOM_SITE}`, message].filter(Boolean).join("\n\n"),
      creneau: avecCreneau && creneau !== null ? creneau : undefined,
    };
    try {
      const rep = await reserver(demande);
      if (rep.ok) {
        /* l'accusé de réception part après coup : la réservation est déjà faite */
        void fetch("/api/reservation/confirmation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: rep.id }),
          keepalive: true,
        }).catch(() => {});
        setConfirmation({
          email,
          quand: avecCreneau && jour !== null && creneau !== null ? `${jourGpLabel(vue.annee, vue.mois, jour)} à ${heureGp(creneau)}` : "",
        });
        setEnvoi("ok");
        return;
      }
      setMotif(rep.erreur);
      setEnvoi("erreur");
      /* un créneau refusé : la grille se remet à jour et le choix repart */
      if (rep.erreur.startsWith("creneau") || rep.erreur === "hors_horaires") {
        setCreneau(null);
        void lireAgenda();
      }
    } catch {
      setMotif("reseau");
      setEnvoi("erreur");
    }
  }

  const erreur = (c: Champ) => manquants.includes(c);
  const bloque = envoi === "envoi" || envoi === "ok";
  const resume =
    avecCreneau && jour !== null && creneau !== null
      ? `${formatChoisi.nom} · ${jourGpLabel(vue.annee, vue.mois, jour)} à ${heureGp(creneau)} (Guadeloupe)`
      : avecCreneau
        ? `${formatChoisi.nom} · choisissez un jour et une heure`
        : `${formatChoisi.nom} · ${formatChoisi.conditions.toLowerCase()}`;

  return (
    <div className="mt-10 lg:mt-14">
      {/* ——— 1. le format, trois cartes ——— */}
      <div role="radiogroup" aria-label="Format d'audit" className="grid gap-3 sm:grid-cols-3">
        {FORMATS.map((f) => {
          const actif = f.id === format;
          return (
            <button
              key={f.id}
              type="button"
              role="radio"
              aria-checked={actif}
              onClick={() => choisirFormat(f.id)}
              disabled={bloque}
              className={cn(
                "group relative flex flex-col gap-2 rounded-xl border bg-white p-5 text-left transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0a0a0a] focus-visible:ring-offset-2",
                actif ? "border-[#0a0a0a] shadow-[0_12px_40px_-28px_rgba(0,0,0,0.6)]" : "border-[#e3e3e3] hover:border-[#bdbdbd]",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "absolute right-4 top-4 flex size-5 items-center justify-center rounded-full border",
                  actif ? "border-[#0a0a0a] bg-[#0a0a0a] text-white" : "border-[#d4d4d4] bg-white",
                )}
              >
                {actif ? <Check size={12} strokeWidth={3} /> : null}
              </span>
              <span className={cn("pr-8 text-[17px] font-medium leading-tight", INK)}>{f.nom}</span>
              <span className={cn("flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]", GRIS)}>
                <span className="inline-flex items-center gap-1">
                  <Clock3 size={13} strokeWidth={1.8} aria-hidden /> {f.duree}
                </span>
                {f.suffixe ? (
                  <span className="inline-flex items-center gap-1">
                    <MapPin size={13} strokeWidth={1.8} aria-hidden /> {f.suffixe}
                  </span>
                ) : null}
              </span>
              <span className={cn("text-[13px]", f.conditions.startsWith("Gratuit") ? "text-[#1f7a3f]" : GRIS)}>{f.conditions}</span>
            </button>
          );
        })}
      </div>
      <p className={cn("mt-4 max-w-3xl text-[15px] leading-[1.55]", GRIS)}>{formatChoisi.promesse}</p>

      {/* ——— 2. le créneau à gauche, les coordonnées à droite ——— */}
      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.9fr)] lg:gap-8">
        <div className="min-w-0">
          {avecCreneau ? (
            <>
              <p className={cn("mb-3 inline-flex items-center gap-2 text-[13px] font-medium uppercase tracking-[0.14em]", GRIS)}>
                <CalendarDays size={14} strokeWidth={1.8} aria-hidden /> Jour et heure
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="flex flex-1 justify-center rounded-xl border border-[#e3e3e3] bg-white p-2">
                  <Calendar
                    mode="single"
                    locale={fr}
                    weekStartsOn={1}
                    month={new Date(vue.annee, vue.mois - 1, 1)}
                    onMonthChange={(m) => {
                      setVue({ annee: m.getFullYear(), mois: m.getMonth() + 1 });
                      setJour(null);
                      setCreneau(null);
                    }}
                    startMonth={new Date(auj.annee, auj.mois - 1, 1)}
                    endMonth={new Date(fin.annee, fin.mois - 1, 1)}
                    today={new Date(auj.annee, auj.mois - 1, auj.jour)}
                    selected={jour === null ? undefined : new Date(vue.annee, vue.mois - 1, jour)}
                    onSelect={(d) => {
                      setJour(d ? d.getDate() : null);
                      setCreneau(null);
                    }}
                    disabled={(d) => !jourLibre(d)}
                    showOutsideDays={false}
                    formatters={{
                      formatWeekdayName: (d) => formaterDate(d, "EEEEE", { locale: fr }).toUpperCase(),
                      formatCaption: (d) => {
                        const m = formaterDate(d, "LLLL yyyy", { locale: fr });
                        return m.charAt(0).toUpperCase() + m.slice(1);
                      },
                    }}
                    className="rounded-md"
                  />
                </div>
                <div className="max-h-[320px] flex-1 overflow-y-auto rounded-xl border border-[#e3e3e3] bg-white p-3">
                  <p className={cn("mb-2 text-sm font-medium first-letter:uppercase", GRIS)}>
                    {jour === null ? "Choisissez une heure" : jourGpLabel(vue.annee, vue.mois, jour)}
                  </p>
                  {agendaErreur ? (
                    <p className={cn("text-sm leading-[1.5]", GRIS)}>
                      L&apos;agenda ne répond pas pour l&apos;instant. Réessayez dans un moment.
                    </p>
                  ) : !agenda ? (
                    <p className={cn("text-sm", GRIS)}>Chargement de l&apos;agenda…</p>
                  ) : heures.length === 0 ? (
                    <p className={cn("text-sm leading-[1.5]", GRIS)}>
                      {jour === null
                        ? "Choisissez un jour dans le calendrier : les jours grisés sont complets ou fermés."
                        : "Plus aucun créneau ce jour-là."}
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {heures.map((h) => {
                        const actif = creneau === h;
                        return (
                          <button
                            key={h}
                            type="button"
                            aria-pressed={actif}
                            onClick={() => {
                              setCreneau(h);
                              setManquants((m) => m.filter((c) => c !== "creneau"));
                            }}
                            disabled={bloque}
                            className={cn(
                              "h-9 rounded-md border text-sm tabular-nums transition-colors",
                              actif ? "border-[#0a0a0a] bg-[#0a0a0a] text-white" : "border-[#e3e3e3] bg-white text-[#0a0a0a] hover:bg-[#f5f5f5]",
                            )}
                          >
                            {heureGp(h)}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
              <p className={cn("mt-3 text-[13px]", erreur("creneau") ? "text-[#b42318]" : GRIS)}>
                {erreur("creneau") ? "Choisissez un jour et une heure avant d'envoyer." : "Heures en Guadeloupe. Seuls les créneaux libres sont proposés."}
              </p>
            </>
          ) : (
            <div className="rounded-xl border border-dashed border-[#d4d4d4] bg-[#fafafa] p-6">
              <p className={cn("text-[15px] font-medium", INK)}>Une journée dans vos locaux, sur devis</p>
              <p className={cn("mt-2 text-[15px] leading-[1.55]", GRIS)}>
                Pas d&apos;horaire à choisir : nous revenons vers vous sous un jour ouvré avec le déroulé de la journée et le devis, déduit de
                l&apos;installation si vous poursuivez.
              </p>
            </div>
          )}
        </div>

        {/* ——— la carte des coordonnées ——— */}
        <form
          noValidate
          onSubmit={envoyer}
          className="min-w-0 rounded-2xl border border-[#e3e3e3] bg-white p-5 shadow-[0_18px_60px_-50px_rgba(0,0,0,0.45)] sm:p-6"
        >
          <p className={cn("rounded-lg bg-[#f5f5f5] px-3 py-2 text-[13px] leading-[1.5]", INK)}>{resume}</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Saisie nom="prenom" libelle="Prénom" autoComplete="given-name" erreur={erreur("prenom")} />
            <Saisie nom="nom" libelle="Nom" autoComplete="family-name" erreur={erreur("nom")} />
            <Saisie
              nom="email"
              libelle="E-mail professionnel"
              type="email"
              autoComplete="email"
              pleine
              erreur={erreur("email")}
              messageErreur={mailFaux ? "Adresse e-mail invalide." : undefined}
            />
            <Saisie nom="entreprise" libelle="Entreprise" autoComplete="organization" pleine erreur={erreur("entreprise")} />
            <div className="sm:col-span-2">
              <label htmlFor="audit-message" className={cn("mb-1.5 block text-[13px] font-medium", INK)}>
                Ce que vous voulez mesurer <span className={cn("font-normal", GRIS)}>(facultatif)</span>
              </label>
              <textarea
                id="audit-message"
                name="message"
                rows={3}
                maxLength={1000}
                placeholder="Le processus qui vous coûte le plus, en une ou deux phrases."
                className={cn(
                  "w-full resize-y rounded-md border border-[#e3e3e3] bg-white px-3 py-2 text-[15px] placeholder:text-[#9a9a9a]",
                  "focus:border-[#0a0a0a] focus:outline-none focus:ring-2 focus:ring-[#0a0a0a]/10",
                  INK,
                )}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={bloque}
            className={cn(
              "mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#0a0a0a] px-5 text-[15px] font-medium text-white transition-colors",
              "hover:bg-[#262626] disabled:cursor-not-allowed disabled:opacity-60",
            )}
          >
            {envoi === "envoi" ? "Réservation en cours…" : envoi === "ok" ? "Demande envoyée" : avecCreneau ? "Réserver ce créneau" : "Envoyer la demande"}
            {envoi === "repos" || envoi === "erreur" ? <ArrowRight size={18} strokeWidth={1.8} aria-hidden /> : null}
          </button>

          {envoi === "ok" && confirmation ? (
            <p role="status" className="mt-4 rounded-lg bg-[#e8f5ec] px-3 py-2 text-[14px] leading-[1.5] text-[#1f5a33]">
              {confirmation.quand ? `Votre créneau est réservé : ${confirmation.quand}. ` : "Votre demande est enregistrée. "}
              Un mail de confirmation part à <strong>{confirmation.email}</strong>.
            </p>
          ) : null}
          {envoi === "erreur" ? (
            <p role="alert" className="mt-4 rounded-lg bg-[#fdecea] px-3 py-2 text-[14px] leading-[1.5] text-[#b42318]">
              {ERREURS[motif] ?? "Nous n'avons pas pu enregistrer votre demande. Réessayez dans un moment."}
            </p>
          ) : null}
          <p className={cn("mt-4 text-[12px] leading-[1.5]", GRIS)}>
            Gratuit et sans engagement pour les formats en visio. Réponse sous un jour ouvré.
          </p>
        </form>
      </div>
    </div>
  );
}

/* Un champ : libellé au-dessus, bord noir au focus, message rouge sous le champ en erreur. */
function Saisie({
  nom,
  libelle,
  type = "text",
  autoComplete,
  pleine,
  erreur,
  messageErreur,
}: {
  nom: string;
  libelle: string;
  type?: "text" | "email";
  autoComplete?: string;
  pleine?: boolean;
  erreur?: boolean;
  messageErreur?: string;
}) {
  return (
    <div className={pleine ? "sm:col-span-2" : undefined}>
      <label htmlFor={`audit-${nom}`} className={cn("mb-1.5 block text-[13px] font-medium", INK)}>
        {libelle}
      </label>
      <input
        id={`audit-${nom}`}
        name={nom}
        type={type}
        required
        maxLength={nom === "email" ? 254 : 80}
        autoComplete={autoComplete}
        aria-invalid={erreur ? true : undefined}
        className={cn(
          "h-10 w-full rounded-md border bg-white px-3 text-[15px] placeholder:text-[#9a9a9a]",
          "focus:border-[#0a0a0a] focus:outline-none focus:ring-2 focus:ring-[#0a0a0a]/10",
          erreur ? "border-[#b42318]" : "border-[#e3e3e3]",
          INK,
        )}
      />
      {erreur ? <p className="mt-1 text-[12px] text-[#b42318]">{messageErreur ?? "Ce champ est obligatoire."}</p> : null}
    </div>
  );
}
