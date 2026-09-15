"use client";

import * as React from "react";
import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ArrowRight } from "lucide-react";

import Lien from "@/components/Lien";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import {
  DUREES_RDV,
  aujourdhuiGp,
  chargerAgenda,
  creneauxDuJour,
  heureGp,
  horizonGp,
  jourGpLabel,
  type Agenda,
} from "@/lib/creneaux";
import { lienContact } from "@/lib/reservation";

/* ══════════════════════════════════════════════════════════════════════
   AppelFinal — la clôture de /tarifs (15/09/2026)

   Reprise de `calendar-with-localisation` (21st.dev, démo « Calendar12 ») :
   une carte shadcn, un en-tête bordé qui porte titre et chapô, et le
   calendrier react-day-picker posé nu dans le corps.

   Remplace la carte noire `call-to-action` du 14/09 (titre, chapô, deux
   boutons, mention de l'audit en pied). Le geste change : la section ne
   dit plus qu'on peut réserver, elle MONTRE l'agenda — les jours où un
   audit tient encore, lus sur l'armoire, pas dessinés.

   Écarts avec la démo, tous voulus :

   1. PAS DE SÉLECTEUR DE LANGUE. La démo bascule es/en avec un
      `shadcn/select` posé en absolu dans l'en-tête ; le site est en
      français et ne propose aucune autre langue. `@radix-ui/react-select`
      n'est donc pas installé et `components/ui/select` n'existe pas : le
      seul composant qu'exigeait la démo est celui qui n'a pas de raison
      d'être ici. La localisation, elle, est faite — locale date-fns `fr`,
      semaine au lundi, en-têtes L M M J V S D, légende capitalisée,
      comme dans calendar-scheduler (/reserver).
   2. `card-shadcn` de la démo, c'est notre `components/ui/card` (posé le
      14/09, couleurs écrites faute de jetons shadcn ici).
   3. `mode="single"`, pas `range` : on regarde UN jour, pas un séjour.
   4. Les dates ne sont pas en dur (la démo ouvrait sur le 9→17 septembre
      2025). Les jours libres sortent de `agenda_public` via
      `creneauxDuJour`, durée `diagnostic` (30 min) — la même règle que
      /reserver-un-audit. Un jour grisé est complet ou fermé, pour de vrai.
   5. LE CALENDRIER NE RÉSERVE PAS ICI, et c'est volontaire : le tunnel
      d'audit ouvre un compte et recueille la situation avant de bloquer
      un créneau. On ne transporte donc pas le jour choisi ; la section
      montre les disponibilités et le bouton emmène au tunnel. Le jour
      cliqué affiche ses heures libres — une information vraie — jamais un
      bouton qui prétend bloquer.
   6. L'agenda muet ne casse pas la section : le calendrier disparaît, le
      chapô et les deux boutons restent (c'est l'ancienne carte, en clair).
   7. Deux mois côte à côte comme la démo, un seul sous 640 px — empilés,
      ils font deux écrans de haut sur téléphone.

   Les textes sont ceux de la page (28/08, 05/09) : rien de réécrit.
   ══════════════════════════════════════════════════════════════════════ */

/* 15/09/2026 — l'agenda montrait les créneaux d'INSTALLATION (45 min) et
   son bouton disait « Choisir mes postes » : la page finissait par
   proposer d'acheter, alors que ses cartes venaient d'annoncer que le
   prix sort de l'audit. Il montre désormais les créneaux d'AUDIT (30 min,
   parcours `diagnostic`), la porte que /tarifs ouvre vraiment. Celle de
   l'installation reste en pied de carte, pour qui a déjà fait l'audit. */
const DUREE = DUREES_RDV.diagnostic ?? 30;

const clef = (annee: number, mois: number, jour: number) => `${annee}-${mois}-${jour}`;

export default function AppelFinal() {
  const [agenda, setAgenda] = React.useState<Agenda | null>(null);
  const [chargement, setChargement] = React.useState(true);

  /* le mois affiché, borné du mois courant à l'horizon de dix semaines —
     mêmes bornes que la prise de créneau : un jour montré libre ici doit
     l'être encore là-bas */
  const auj = React.useMemo(() => aujourdhuiGp(), []);
  const fin = React.useMemo(() => horizonGp(), []);
  const [mois, setMois] = React.useState(() => new Date(auj.annee, auj.mois - 1, 1));
  const [jour, setJour] = React.useState<Date | undefined>(undefined);

  /* un seul mois sous 640 px (le calendrier empile ses mois sous `sm`) */
  const [nbMois, setNbMois] = React.useState(1);
  React.useEffect(() => {
    const mq = window.matchMedia("(min-width: 640px)");
    const applique = () => setNbMois(mq.matches ? 2 : 1);
    applique();
    mq.addEventListener("change", applique);
    return () => mq.removeEventListener("change", applique);
  }, []);

  React.useEffect(() => {
    let vivant = true;
    chargerAgenda()
      .then((a) => vivant && setAgenda(a))
      .catch(() => vivant && setAgenda(null))
      .finally(() => vivant && setChargement(false));
    return () => {
      vivant = false;
    };
  }, []);

  /* les jours libres des mois affichés, calculés une fois par mois affiché
     plutôt qu'à chaque case rendue (react-day-picker appelle `disabled`
     pour chacune des ~70 cases, à chaque rendu) */
  const libres = React.useMemo(() => {
    const set = new Set<string>();
    if (!agenda) return set;
    for (let i = 0; i < nbMois; i++) {
      const d = new Date(mois.getFullYear(), mois.getMonth() + i, 1);
      const annee = d.getFullYear();
      const m = d.getMonth() + 1;
      const dernier = new Date(annee, m, 0).getDate();
      for (let j = 1; j <= dernier; j++) {
        if (creneauxDuJour(agenda, annee, m, j, DUREE).length) set.add(clef(annee, m, j));
      }
    }
    return set;
  }, [agenda, mois, nbMois]);

  const creneaux = React.useMemo(() => {
    if (!agenda || !jour) return [];
    return creneauxDuJour(agenda, jour.getFullYear(), jour.getMonth() + 1, jour.getDate(), DUREE);
  }, [agenda, jour]);

  const calendrierVisible = !chargement && agenda !== null;

  return (
    <div className="r-wrap py-16 sm:py-20">
      <Card data-reveal className="mx-auto w-full max-w-4xl overflow-hidden">
        <CardHeader className="border-b border-neutral-200 p-6 sm:p-8">
          <h2 className="font-[family-name:var(--font-jakarta)] text-[26px] font-semibold leading-[1.15] tracking-[-0.02em] text-[#050505] sm:text-[32px]">
            Votre prix se fixe en trente minutes
          </h2>
          <CardDescription className="max-w-[62ch] text-[15px] leading-relaxed text-[#616161]">
            L&apos;audit mesure vos volumes réels sur vos propres exports&nbsp;: ce qui passe
            chaque mois, ce qui revient à quelqu&apos;un, ce qui se perd sans être compté. Vous en
            repartez avec le périmètre, le prix et ce qu&apos;il y a à mettre en route — écrits,
            avant tout engagement. Il est gratuit, et rien ne s&apos;enregistre ici.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6 pt-6 sm:p-8">
          {chargement ? (
            <div className="flex h-[320px] items-center justify-center rounded-md border border-[#e3e3e3] text-[15px] text-[#616161]">
              Chargement de l&apos;agenda…
            </div>
          ) : calendrierVisible ? (
            <>
              <div className="flex justify-center rounded-md border border-[#e3e3e3] bg-white p-2 sm:p-4">
                <Calendar
                  mode="single"
                  locale={fr}
                  weekStartsOn={1}
                  numberOfMonths={nbMois}
                  month={mois}
                  onMonthChange={setMois}
                  startMonth={new Date(auj.annee, auj.mois - 1, 1)}
                  endMonth={new Date(fin.annee, fin.mois - 1, 1)}
                  today={new Date(auj.annee, auj.mois - 1, auj.jour)}
                  selected={jour}
                  onSelect={setJour}
                  disabled={(d) =>
                    !libres.has(clef(d.getFullYear(), d.getMonth() + 1, d.getDate()))
                  }
                  showOutsideDays={false}
                  formatters={{
                    formatWeekdayName: (d) => format(d, "EEEEE", { locale: fr }).toUpperCase(),
                    formatCaption: (d) => {
                      const m = format(d, "LLLL yyyy", { locale: fr });
                      return m.charAt(0).toUpperCase() + m.slice(1);
                    },
                  }}
                  className="bg-transparent p-0"
                  /* les deux mois sont centrés ENSEMBLE et ne s'étirent plus :
                     `month: w-full` (le défaut du composant) laissait chaque
                     grille collée à droite de sa moitié, avec un vide à gauche */
                  classNames={{ months: "justify-center gap-4 sm:gap-10", month: "w-fit" }}
                />
              </div>

              {/* ce que dit le jour cliqué — une information, pas un bouton :
                  le créneau se bloque sur /installation, postes choisis */}
              <p className="mt-4 text-[15px] leading-relaxed text-[#616161] first-letter:uppercase">
                {jour === undefined ? (
                  <>
                    Les jours en clair sont ouverts pour un audit&nbsp;; les jours grisés sont
                    complets ou fermés.
                  </>
                ) : creneaux.length === 0 ? (
                  <>Plus aucun créneau ce jour-là.</>
                ) : (
                  <>
                    <span className="font-medium text-[#050505]">
                      {jourGpLabel(jour.getFullYear(), jour.getMonth() + 1, jour.getDate())}
                    </span>{" "}
                    — {creneaux.length} créneau{creneaux.length > 1 ? "x" : ""} libre
                    {creneaux.length > 1 ? "s" : ""}, de{" "}
                    <span className="num">{heureGp(creneaux[0])}</span> à{" "}
                    <span className="num">{heureGp(creneaux[creneaux.length - 1])}</span>, heure de
                    Guadeloupe. Réservez votre audit pour en bloquer un.
                  </>
                )}
              </p>
            </>
          ) : (
            <p className="text-[15px] leading-relaxed text-[#616161]">
              L&apos;agenda ne répond pas pour le moment. Ouvrez la réservation&nbsp;: les
              créneaux s&apos;affichent à l&apos;étape suivante.
            </p>
          )}

          <div className="mt-6 flex w-full flex-col gap-3 sm:flex-row sm:items-center">
            <Link href="/reserver-un-audit" className="r-btn r-btn--noir w-full sm:w-auto">
              Réserver mon audit
              <ArrowRight aria-hidden className="size-4" />
            </Link>
            <Lien href={lienContact("avant")} className="r-btn r-btn--fil w-full sm:w-auto">
              Nous écrire
            </Lien>
          </div>
        </CardContent>

        {/* la mention discrète de l'autre porte (28/08, retournée le 15/09) :
            la carte ouvre l'audit, le pied garde l'installation pour qui l'a
            déjà fait — l'ordre des deux portes suit celui du parcours */}
        <CardFooter className="flex flex-col items-start gap-3 border-t border-neutral-200 bg-[#fafafa] p-6 pt-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <p className="text-[13px] leading-5 text-[#616161]">
            Votre audit est déjà fait et votre prix arrêté&nbsp;? La réunion d&apos;installation
            se réserve directement, postes choisis.
          </p>
          <Link
            href="/installation"
            className="inline-flex shrink-0 items-center gap-1.5 text-[13px] font-medium text-[#050505] underline-offset-4 hover:underline"
          >
            Réserver l&apos;installation
            <ArrowRight aria-hidden className="size-3.5" />
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
