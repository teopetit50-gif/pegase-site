"use client";

/* ══════════════════════════════════════════════════════════════════════
   MON ESPACE — Agenda (11/11/2026)

   La copie 1:1 des Équipes de DALIRO (../daliro/Equipes : « Bookings » de
   Cal.com, relevé calcom-bookings.md, styles ../daliro/dal-bookings.css,
   préfixe dal-bk-, police Cal Sans). Seul le contenu change, c'est
   l'agenda Google de Teo :
     une réservation          → un rendez-vous (date, heures, agenda,
                                titre, lieu, invités et leurs réponses)
     Upcoming                 → « À venir », groupes « Aujourd'hui » / « À suivre »
     Unconfirmed              → « Non confirmés » : provisoires, ou un
                                invité n'a pas répondu
     Recurring                → « Plusieurs jours » (journées entières de
                                plusieurs jours : salons, déplacements)
     Past · Canceled          → « Passés » · « Annulés »
     Filter                   → genre (?genre= : audit, installation, bilan,
                                visio, autre), invité (?invite=)
     liste / calendrier       → ?vue=calendrier : jour, semaine, mois
     détail (?uid=)           → ?rdv= : panneau flottant ; le menu ⋯ ouvre
                                Google Agenda, la visio, écrit aux invités,
                                copie, télécharge l'.ics
     case à cocher            → une sélection à copier ou à mettre au calendrier
   Lecture seule : l'agenda se modifie dans Google Agenda (le lien de
   chaque rendez-vous y mène). Les données : ./donnees (exemple, ou
   l'agenda lu par app/espace2/teo/agenda/page.tsx).
   ══════════════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Calendar, Check, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, ChevronsUpDown, Copy, Ellipsis, ExternalLink, Info, ListFilter, Mail, MapPin, Menu, Search, Tag, UserPlus, Video, X } from "lucide-react";
import type { EtatGoogle, EtatTableau, RendezVous } from "@/lib/teo/types";
import { RACINE } from "../modules";
import { useToast } from "../Toasts";
import { copier } from "../daliro/navigateur";
import { useTeo } from "./donnees";
import { AGENDA_EXEMPLE } from "./exemples";
import { aujourdhuiIso, heureLocale, initiales, jourLocal } from "./navigateur";
import "@/components/espace/espace.css";
import "../daliro/dal-bookings.css";

const BASE = `${RACINE}/teo`;

export type ReelAgenda = { etat: EtatGoogle; detail: string | null; tableau: EtatTableau; detailTableau: string | null; compteTableau: string | null; rendezVous: RendezVous[] };

type Onglet = "a-venir" | "non-confirmes" | "plusieurs-jours" | "passes" | "annules";
type Genre = "audit" | "installation" | "bilan" | "visio" | "autre";
type Filtre = { genre: Genre | null; invite: string | null };
const ONGLETS: { cle: Onglet; libelle: string }[] = [
  { cle: "a-venir", libelle: "À venir" },
  { cle: "non-confirmes", libelle: "Non confirmés" },
  { cle: "plusieurs-jours", libelle: "Plusieurs jours" },
  { cle: "passes", libelle: "Passés" },
  { cle: "annules", libelle: "Annulés" },
];
const VIDES: Record<Onglet, [string, string]> = {
  "a-venir": ["Aucun rendez-vous à venir", "Vous n'avez aucun rendez-vous à venir. Dès qu'un rendez-vous est posé dans votre agenda Google, il s'affiche ici."],
  "non-confirmes": ["Aucun rendez-vous non confirmé", "Vous n'avez aucun rendez-vous non confirmé. Les rendez-vous provisoires, ou dont un invité n'a pas répondu, s'afficheront ici."],
  "plusieurs-jours": ["Aucun rendez-vous sur plusieurs jours", "Vous n'avez aucun rendez-vous sur plusieurs jours. Dès qu'une journée entière dure plus d'un jour, elle s'affiche ici."],
  passes: ["Aucun rendez-vous passé", "Vous n'avez aucun rendez-vous passé. Vos rendez-vous passés s'afficheront ici."],
  annules: ["Aucun rendez-vous annulé", "Vous n'avez aucun rendez-vous annulé. Vos rendez-vous annulés s'afficheront ici."],
};
const GENRES: { cle: Genre; libelle: string }[] = [
  { cle: "audit", libelle: "Audits" },
  { cle: "installation", libelle: "Installations" },
  { cle: "bilan", libelle: "Bilans et revues" },
  { cle: "visio", libelle: "En visio" },
  { cle: "autre", libelle: "Autres" },
];
const genreDe = (r: RendezVous): Genre => (/audit/i.test(r.titre) ? "audit" : /install/i.test(r.titre) ? "installation" : /bilan|revue|point/i.test(r.titre) ? "bilan" : r.visio ? "visio" : "autre");
const libGenre = (g: Genre) => GENRES.find((x) => x.cle === g)?.libelle ?? "Autres";

const JOUR = 86_400_000;
const JOURS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];
const JOURS_COURTS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const MOIS_COURTS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const num = (iso: string) => {
  const [a, m, j] = iso.slice(0, 10).split("-").map(Number);
  return Math.floor(Date.UTC(a, (m || 1) - 1, j || 1) / JOUR);
};
const iso = (n: number) => new Date(n * JOUR).toISOString().slice(0, 10);
const plusJours = (jour: string, n: number) => iso(num(jour) + n);
const rangJour = (jour: string) => (num(jour) + 3) % 7;
const lundiDe = (jour: string) => iso(num(jour) - rangJour(jour));
const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? "s" : ""}`;
const morceaux = (jour: string) => {
  const [a, m, j] = jour.split("-").map(Number);
  return { a, j, m: m - 1, r: rangJour(jour) };
};
function jours(debut: string, fin: string): string {
  const a = morceaux(debut);
  const b = morceaux(fin);
  if (debut === fin) return `${JOURS_COURTS[a.r]} ${a.j} ${MOIS_COURTS[a.m]}`;
  if (a.m === b.m) return `${JOURS_COURTS[a.r]} ${a.j} - ${JOURS_COURTS[b.r]} ${b.j} ${MOIS_COURTS[b.m]}`;
  return `${JOURS_COURTS[a.r]} ${a.j} ${MOIS_COURTS[a.m]} - ${JOURS_COURTS[b.r]} ${b.j} ${MOIS_COURTS[b.m]}`;
}
const dateLongue = (jour: string) => {
  const a = morceaux(jour);
  return `${a.j} ${MOIS[a.m]} ${a.a}`;
};
const dateEntiere = (jour: string) => {
  const a = morceaux(jour);
  return `${JOURS[a.r].charAt(0).toUpperCase()}${JOURS[a.r].slice(1)} ${a.j} ${MOIS[a.m]} ${a.a}`;
};
function plage(r: RendezVous): string {
  if (r.journee) return "Toute la journée";
  const hd = heureLocale(r.debut);
  const hf = heureLocale(r.fin);
  if (hf <= "13:00") return `Matin, ${hd} - ${hf}`;
  if (hd >= "12:00") return `Après-midi, ${hd} - ${hf}`;
  return `${hd} - ${hf}`;
}
const debutDe = (r: RendezVous) => jourLocal(r.debut);
const finDe = (r: RendezVous) => jourLocal(r.fin);
const nonConfirme = (r: RendezVous) => r.statut === "provisoire" || r.invites.some((i) => i.reponse === "attente" || i.reponse === "peut-etre");
const PASTILLE: Record<string, { texte: string; teinte: "vert" | "ambre" | "rouge" | "gris" }> = {
  confirme: { texte: "Confirmé", teinte: "vert" },
  provisoire: { texte: "Provisoire", teinte: "ambre" },
  attente: { texte: "Sans réponse", teinte: "ambre" },
  annule: { texte: "Annulé", teinte: "rouge" },
};
const pastilleDe = (r: RendezVous) => (r.statut === "annule" ? PASTILLE.annule : r.statut === "provisoire" ? PASTILLE.provisoire : r.invites.some((i) => i.reponse === "attente" || i.reponse === "peut-etre") ? PASTILLE.attente : PASTILLE.confirme);
const REPONSE: Record<RendezVous["invites"][number]["reponse"], string> = { oui: "a accepté", non: "a décliné", "peut-etre": "peut-être", attente: "n'a pas répondu" };
const nomInvite = (i: RendezVous["invites"][number]) => i.nom ?? i.email;

/* ——— en clair, et en .ics ——— */
const enClair = (r: RendezVous) => `- ${jours(debutDe(r), finDe(r))}, ${plage(r).toLowerCase()} : ${r.titre}${r.lieu ? ` (${r.lieu})` : ""}${r.visio ? ` · ${r.visio}` : ""}`;
function ics(lignes: RendezVous[]): string {
  const echap = (s: string) => s.replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\n/g, "\\n");
  const d = (j: string) => j.replace(/-/g, "");
  const t = (x: string) => new Date(x).toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
  const ev = lignes.map((r) =>
    [
      "BEGIN:VEVENT",
      `UID:${r.id}@omega-teo`,
      `DTSTAMP:${t(new Date().toISOString())}`,
      ...(r.journee ? [`DTSTART;VALUE=DATE:${d(r.debut)}`, `DTEND;VALUE=DATE:${d(plusJours(r.fin, 1))}`] : [`DTSTART:${t(r.debut)}`, `DTEND:${t(r.fin)}`]),
      `SUMMARY:${echap(r.titre)}`,
      ...(r.lieu ? [`LOCATION:${echap(r.lieu)}`] : []),
      ...(r.description || r.visio ? [`DESCRIPTION:${echap([r.description, r.visio].filter(Boolean).join("\n"))}`] : []),
      "END:VEVENT",
    ].join("\r\n"),
  );
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Omega//Mon espace//FR", ...ev, "END:VCALENDAR"].join("\r\n");
}
function telecharger(nom: string, texte: string) {
  const url = URL.createObjectURL(new Blob([texte], { type: "text/calendar;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nom;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function Agenda({ reel }: { reel: ReelAgenda | null }) {
  const { reel: enReel } = useTeo();
  const params = useSearchParams();
  const routeur = useRouter();
  const chemin = usePathname();
  const toast = useToast();
  const du = useMemo(() => aujourdhuiIso(), []);
  const toutes = useMemo(() => (enReel && reel ? reel.rendezVous : AGENDA_EXEMPLE), [enReel, reel]);
  const etat: EtatGoogle = enReel && reel ? reel.etat : "ok";

  const lien = (modif: Record<string, string | null>) => {
    const p = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(modif)) {
      if (v === null) p.delete(k);
      else p.set(k, v);
    }
    const s = p.toString();
    return `${chemin}${s ? `?${s}` : ""}`;
  };
  const aller = (modif: Record<string, string | null>) => routeur.replace(lien(modif), { scroll: false });
  const ongletParam = params.get("onglet");
  const onglet: Onglet = ONGLETS.some((o) => o.cle === ongletParam) ? (ongletParam as Onglet) : "a-venir";
  const genreParam = params.get("genre");
  const filtre: Filtre = { genre: GENRES.some((g) => g.cle === genreParam) ? (genreParam as Genre) : null, invite: params.get("invite") };
  const filtreActif = !!(filtre.genre || filtre.invite);
  const vue = params.get("vue") === "calendrier" ? "calendrier" : "liste";

  const invites = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of toutes) for (const i of r.invites) if (!m.has(i.email)) m.set(i.email, nomInvite(i));
    return [...m.entries()].map(([email, nom]) => ({ email, nom })).sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
  }, [toutes]);
  const garde = (r: RendezVous) => (!filtre.genre || genreDe(r) === filtre.genre) && (!filtre.invite || r.invites.some((i) => i.email === filtre.invite));
  const filtrees = toutes.filter(garde);
  const parDate = (a: RendezVous, b: RendezVous) => a.debut.localeCompare(b.debut) || a.titre.localeCompare(b.titre, "fr");
  const dansOnglet = (o: Onglet) =>
    filtrees
      .filter((r) => {
        if (o === "annules") return r.statut === "annule";
        if (r.statut === "annule") return false;
        if (o === "passes") return finDe(r) < du || (!r.journee && Date.parse(r.fin) < Date.now() && finDe(r) <= du);
        if (finDe(r) < du) return false;
        if (o === "non-confirmes") return nonConfirme(r);
        if (o === "plusieurs-jours") return debutDe(r) < finDe(r);
        return true;
      })
      .sort((a, b) => (o === "passes" || o === "annules" ? -parDate(a, b) : parDate(a, b)));
  const lignes = dansOnglet(onglet);
  const nbNonConfirmes = toutes.filter((r) => r.statut !== "annule" && nonConfirme(r) && finDe(r) >= du).length;
  const ouverte = toutes.find((r) => params.get("rdv") === r.id) ?? null;
  const ouvrir = (r: RendezVous | null) => aller({ rdv: r?.id ?? null });

  const [choisis, setChoisis] = useState<string[]>([]);
  const vusChoisis = lignes.filter((r) => choisis.includes(r.id));

  const copierLignes = async (ls: RendezVous[], titre: string) => {
    const ok = await copier([titre, ...ls.map(enClair)].join("\n"));
    toast(ok ? `${pluriel(ls.length, "ligne")} copiée${ls.length > 1 ? "s" : ""}.` : "Le presse-papier n'a pas répondu.", ok ? "vert" : "rouge");
  };
  const agenda = (ls: RendezVous[], nom: string) => {
    telecharger(`${nom}.ics`, ics(ls));
    toast(`${pluriel(ls.length, "rendez-vous")} au format agenda (.ics).`, "vert");
  };
  const nomFiltre = (f: Filtre) => [f.genre ? libGenre(f.genre) : null, f.invite ? (invites.find((i) => i.email === f.invite)?.nom ?? f.invite) : null].filter(Boolean).join(" · ");

  const optionsRdv = (r: RendezVous): Option[] => {
    const o: Option[] = [{ titre: "Le rendez-vous" }];
    if (r.lien) o.push({ libelle: r.origine === "tableau" ? "Ouvrir dans le tableau des associés" : "Ouvrir dans Google Agenda", icone: ico(ExternalLink), href: r.lien });
    if (r.visio) o.push({ libelle: "Rejoindre la visio", icone: ico(Video), href: r.visio });
    if (r.invites.length) o.push({ libelle: "Écrire aux invités", icone: ico(Mail), href: `mailto:${r.invites.map((i) => i.email).join(",")}?subject=${encodeURIComponent(r.titre)}` });
    if (r.lieu) o.push({ libelle: "Voir le lieu sur une carte", icone: ico(MapPin), href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(r.lieu)}` });
    o.push("sep", { libelle: "Ajouter au calendrier", icone: ico(Calendar), sous: [{ libelle: "Télécharger (.ics)", action: () => agenda([r], `rdv-${debutDe(r)}`) }, { libelle: "Copier en texte", action: () => void copierLignes([r], r.titre) }] }, "sep");
    o.push({ titre: "Dans Mon espace" });
    o.push({ libelle: "Chercher dans les clients", icone: ico(UserPlus), href: `${BASE}/clients?q=${encodeURIComponent(r.titre.replace(/^(audit|installation|bilan( j30)?|revue( mensuelle)?|appel|rappel|tournage)\s*(de|du|chez|témoignage)?\s*/i, "").trim())}` });
    return o;
  };

  /* ce que la page dit de ses deux sources : le tableau des associés d'abord (c'est là que
     vivent les rendez-vous de Teo), Google ensuite — un mot seulement s'il manque quelque chose */
  const tableau: EtatTableau = enReel && reel ? reel.tableau : "ok";
  const note =
    enReel && reel && (tableau !== "ok" || etat !== "ok") ? (
      <p className="teo-note" data-teinte={tableau === "erreur" || etat === "erreur" ? "rouge" : undefined} role="status">
        <Info width={16} height={16} aria-hidden="true" />
        <span>
          {tableau === "absent" ? (
            <>
              <b>Le tableau des associés n&apos;est pas branché.</b> Vos rendez-vous y sont : <Link href={`${BASE}?brancher=tableau`}>connectez votre compte du tableau</Link> depuis la vue d&apos;ensemble, une fois.
            </>
          ) : tableau === "erreur" ? (
            <>
              <b>Le tableau des associés n&apos;a pas répondu.</b> {reel.detailTableau}
            </>
          ) : etat === "absent" ? (
            <>Rendez-vous du tableau des associés ({reel.compteTableau}). Google Agenda n&apos;est pas branché : <code>node outils/jeton-google.mjs</code> puis GOOGLE_OAUTH_* sur Vercel (docs/espace-teo/README.md).</>
          ) : etat === "portee" ? (
            <>
              <b>Le jeton Google ne porte pas l&apos;agenda.</b> Relancez <code>node outils/jeton-google.mjs</code> et reposez GOOGLE_OAUTH_REFRESH_TOKEN.
            </>
          ) : (
            <>
              <b>Google Agenda n&apos;a pas répondu.</b> {reel.detail}
            </>
          )}
        </span>
      </p>
    ) : null;
  const ivFiltre = filtre.invite ? (invites.find((i) => i.email === filtre.invite) ?? null) : null;

  return (
    <div className="dal-bk">
      <main className="dal-bk-main">
        <h1 className="v2-sr">Agenda</h1>
        <div className="dal-bk-barre">
          <nav className="dal-bk-segment" aria-label="Rendez-vous">
            {ONGLETS.map((o) => (
              <Link key={o.cle} href={lien({ onglet: o.cle === "a-venir" ? null : o.cle, page: null })} scroll={false} aria-current={onglet === o.cle ? "page" : undefined}>
                {o.libelle}
              </Link>
            ))}
          </nav>
          <div className="dal-bk-filtres">
            <MenuFiltre filtre={filtre} invites={invites} aller={aller} />
            {filtre.genre ? <Puce libelle={libGenre(filtre.genre)} retirer={() => aller({ genre: null })} /> : null}
            {filtre.invite ? <Puce libelle={`Invité : ${ivFiltre?.nom ?? filtre.invite}`} retirer={() => aller({ invite: null })} /> : null}
          </div>
          <div className="dal-bk-droite">
            <MenuPlus
              actif={filtreActif}
              copierAffiche={() => void copierLignes(lignes, `Agenda — ${ONGLETS.find((o) => o.cle === onglet)?.libelle}${filtreActif ? ` (${nomFiltre(filtre)})` : ""}`)}
              agendaAffiche={() => agenda(lignes, "agenda")}
              nbAffiches={lignes.length}
              relire={() => routeur.refresh()}
            />
            <div className="dal-bk-vues" role="radiogroup" aria-label="Affichage">
              <button type="button" role="radio" aria-checked={vue === "liste"} aria-label="Liste" title="Liste" onClick={() => aller({ vue: null })}>
                <Menu width={16} height={16} aria-hidden="true" />
              </button>
              <button type="button" role="radio" aria-checked={vue === "calendrier"} aria-label="Calendrier" title="Calendrier" onClick={() => aller({ vue: "calendrier" })}>
                <Calendar width={16} height={16} aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
        {note}

        {vue === "calendrier" ? (
          <Calendrier lignes={filtrees.filter((r) => r.statut !== "annule")} du={du} ouverte={ouverte} ouvrir={ouvrir} quand={params.get("jour")} echelle={params.get("echelle")} aller={aller} />
        ) : !lignes.length ? (
          <div className="dal-bk-vide">
            <span className="dal-bk-vide-icone">
              <Calendar width={16} height={16} aria-hidden="true" />
            </span>
            <p className="dal-bk-vide-titre">{VIDES[onglet][0]}</p>
            <p className="dal-bk-vide-texte">{filtreActif ? `Rien pour ce filtre (${nomFiltre(filtre)}). ` : VIDES[onglet][1]}</p>
          </div>
        ) : (
          <Liste onglet={onglet} lignes={lignes} du={du} ouverte={ouverte} ouvrir={ouvrir} choisis={choisis} setChoisis={setChoisis} page={Math.max(1, Number(params.get("page")) || 1)} parPage={[10, 25, 50].includes(Number(params.get("n"))) ? Number(params.get("n")) : 10} aller={aller} filtrer={(email) => aller({ invite: email, page: null })} optionsRdv={optionsRdv} />
        )}

        {vusChoisis.length ? (
          <div className="dal-bk-selection" role="region" aria-label="Sélection">
            <span>{pluriel(vusChoisis.length, "ligne")} sélectionnée{vusChoisis.length > 1 ? "s" : ""}</span>
            <button type="button" className="dal-bk-bouton" onClick={() => void copierLignes(vusChoisis, "Agenda — sélection")}>
              <Copy width={16} height={16} aria-hidden="true" />
              Copier
            </button>
            <button type="button" className="dal-bk-bouton" onClick={() => agenda(vusChoisis, "rendez-vous")}>
              <Calendar width={16} height={16} aria-hidden="true" />
              Ajouter au calendrier
            </button>
            <button type="button" className="dal-bk-carre dal-bk-carre--28" aria-label="Tout désélectionner" title="Tout désélectionner" onClick={() => setChoisis([])}>
              <X width={16} height={16} aria-hidden="true" />
            </button>
          </div>
        ) : null}

        {ouverte ? (
          <Detail
            r={ouverte}
            du={du}
            fermer={() => ouvrir(null)}
            precedente={(() => {
              const i = lignes.findIndex((x) => x.id === ouverte.id);
              return i > 0 ? () => ouvrir(lignes[i - 1]) : null;
            })()}
            suivante={(() => {
              const i = lignes.findIndex((x) => x.id === ouverte.id);
              return i >= 0 && i < lignes.length - 1 ? () => ouvrir(lignes[i + 1]) : null;
            })()}
            options={optionsRdv(ouverte)}
            copierLigne={() => void copierLignes([ouverte], ouverte.titre)}
            filtrer={(email) => aller({ invite: email, page: null })}
          />
        ) : null}
        {nbNonConfirmes ? <span className="v2-sr">{pluriel(nbNonConfirmes, "rendez-vous")} non confirmé{nbNonConfirmes > 1 ? "s" : ""}</span> : null}
      </main>
    </div>
  );
}

/* ——— petits morceaux ——— */
const ico = (I: typeof Calendar) => <I width={16} height={16} aria-hidden="true" />;
type Option = { libelle: string; icone: React.ReactNode; action?: () => void; href?: string; rouge?: boolean; sous?: { libelle: string; action: () => void }[] } | { titre: string } | "sep";

function useFermeture(ouvert: boolean, fermer: () => void) {
  const boite = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ouvert) return;
    const dehors = (e: MouseEvent) => {
      if (!boite.current?.contains(e.target as Node)) fermer();
    };
    const echap = (e: KeyboardEvent) => {
      if (e.key === "Escape") fermer();
    };
    document.addEventListener("mousedown", dehors);
    document.addEventListener("keydown", echap);
    return () => {
      document.removeEventListener("mousedown", dehors);
      document.removeEventListener("keydown", echap);
    };
  }, [ouvert, fermer]);
  return boite;
}

function MenuPoints({ libelle, options, haut }: { libelle: string; options: Option[]; haut?: boolean }) {
  const [ouvert, setOuvert] = useState(false);
  const [versHaut, setVersHaut] = useState(false);
  const [sous, setSous] = useState<number | null>(null);
  const fermer = useCallback(() => {
    setOuvert(false);
    setSous(null);
  }, []);
  const boite = useFermeture(ouvert, fermer);
  const propres = options.filter((o, i, t) => {
    if (o === "sep") return i > 0 && i < t.length - 1 && t[i - 1] !== "sep";
    if (typeof o === "object" && "titre" in o) return t[i + 1] !== undefined && t[i + 1] !== "sep" && !(typeof t[i + 1] === "object" && "titre" in (t[i + 1] as object));
    return true;
  });
  const externe = (href: string) => /^https?:/.test(href);
  return (
    <div className="dal-bk-menu-boite" ref={boite}>
      <button
        type="button"
        className="dal-bk-carre"
        aria-label={libelle}
        title={libelle}
        aria-haspopup="menu"
        aria-expanded={ouvert}
        onClick={(e) => {
          e.stopPropagation();
          setVersHaut(!!haut || e.currentTarget.getBoundingClientRect().bottom > window.innerHeight - 420);
          setOuvert((o) => !o);
        }}
      >
        <Ellipsis width={16} height={16} aria-hidden="true" />
      </button>
      {ouvert ? (
        <div className={`dal-bk-menu${versHaut ? " dal-bk-menu--haut" : ""}`} role="menu" aria-label={libelle} onClick={(e) => e.stopPropagation()}>
          {propres.map((o, i) =>
            o === "sep" ? (
              <div key={i} className="dal-bk-menu-sep" role="separator" />
            ) : "titre" in o ? (
              <div key={i} className="dal-bk-menu-titre">
                {o.titre}
              </div>
            ) : o.href ? (
              externe(o.href) || o.href.startsWith("mailto:") ? (
                <a key={i} href={o.href} target={externe(o.href) ? "_blank" : undefined} rel="noreferrer" role="menuitem" className="dal-bk-menu-option" onClick={fermer}>
                  {o.icone}
                  {o.libelle}
                </a>
              ) : (
                <Link key={i} href={o.href} role="menuitem" className="dal-bk-menu-option" onClick={fermer}>
                  {o.icone}
                  {o.libelle}
                </Link>
              )
            ) : (
              <div key={i} className="dal-bk-menu-ligne">
                <button
                  type="button"
                  role="menuitem"
                  aria-haspopup={o.sous ? "menu" : undefined}
                  aria-expanded={o.sous ? sous === i : undefined}
                  className={`dal-bk-menu-option${o.rouge ? " dal-bk-menu-option--rouge" : ""}`}
                  onClick={() => {
                    if (o.sous) return setSous((s) => (s === i ? null : i));
                    fermer();
                    o.action?.();
                  }}
                >
                  {o.icone}
                  {o.libelle}
                  {o.sous ? <ChevronRight className="dal-bk-menu-fleche" width={16} height={16} aria-hidden="true" /> : null}
                </button>
                {o.sous && sous === i ? (
                  <div className="dal-bk-sous-menu" role="menu">
                    {o.sous.map((s) => (
                      <button
                        key={s.libelle}
                        type="button"
                        role="menuitem"
                        className="dal-bk-menu-option"
                        onClick={() => {
                          fermer();
                          s.action();
                        }}
                      >
                        {s.libelle}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ),
          )}
        </div>
      ) : null}
    </div>
  );
}

function Puce({ libelle, retirer }: { libelle: string; retirer: () => void }) {
  return (
    <span className="dal-bk-bouton dal-bk-puce">
      {libelle}
      <button type="button" aria-label={`Retirer le filtre ${libelle}`} title="Retirer ce filtre" onClick={retirer}>
        <X width={14} height={14} aria-hidden="true" />
      </button>
    </span>
  );
}

function MenuFiltre({ filtre, invites, aller }: { filtre: Filtre; invites: { email: string; nom: string }[]; aller: (m: Record<string, string | null>) => void }) {
  const [ouvert, setOuvert] = useState(false);
  const [etape, setEtape] = useState<"genre" | "invite" | null>(null);
  const [cherche, setCherche] = useState("");
  const fermer = useCallback(() => {
    setOuvert(false);
    setEtape(null);
    setCherche("");
  }, []);
  const boite = useFermeture(ouvert, fermer);
  const q = cherche.trim().toLocaleLowerCase("fr");
  const familles = [
    { cle: "genre" as const, libelle: "Genre de rendez-vous", icone: Tag },
    { cle: "invite" as const, libelle: "Invité", icone: UserPlus },
  ];
  const valeurs = etape === "genre" ? GENRES.map((g) => ({ id: g.cle, nom: g.libelle, sous: null as string | null, actif: filtre.genre === g.cle })) : etape === "invite" ? invites.map((i) => ({ id: i.email, nom: i.nom, sous: i.nom === i.email ? null : i.email, actif: filtre.invite === i.email })) : [];
  return (
    <div className="dal-bk-menu-boite" ref={boite}>
      <button type="button" className="dal-bk-bouton" aria-haspopup="dialog" aria-expanded={ouvert} onClick={() => (ouvert ? fermer() : setOuvert(true))}>
        <ListFilter width={16} height={16} aria-hidden="true" />
        Filtrer
      </button>
      {ouvert ? (
        <div className="dal-bk-menu dal-bk-menu--gauche dal-bk-filtre" role="dialog" aria-label="Filtrer">
          <label className="dal-bk-cherche">
            <Search width={16} height={16} aria-hidden="true" />
            <input autoFocus value={cherche} onChange={(e) => setCherche(e.target.value)} placeholder={etape ? "Chercher…" : "Chercher un filtre…"} aria-label="Chercher" />
          </label>
          <div className="dal-bk-menu-sep" role="separator" />
          <div className="dal-bk-filtre-liste">
            {etape ? (
              <>
                <button type="button" className="dal-bk-menu-option" onClick={() => (setEtape(null), setCherche(""))}>
                  <ChevronLeft width={16} height={16} aria-hidden="true" />
                  {familles.find((f) => f.cle === etape)?.libelle}
                </button>
                {valeurs
                  .filter((v) => !q || v.nom.toLocaleLowerCase("fr").includes(q))
                  .map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      className="dal-bk-menu-option"
                      aria-pressed={v.actif}
                      onClick={() => {
                        aller({ [etape]: v.actif ? null : v.id, page: null });
                        fermer();
                      }}
                    >
                      <span className="dal-bk-coche">{v.actif ? <Check width={14} height={14} aria-hidden="true" /> : null}</span>
                      <span className="dal-bk-menu-texte">
                        {v.nom}
                        {v.sous ? <span className="dal-bk-menu-sous"> · {v.sous}</span> : null}
                      </span>
                    </button>
                  ))}
              </>
            ) : (
              familles
                .filter((f) => !q || f.libelle.toLocaleLowerCase("fr").includes(q))
                .map((f) => (
                  <button key={f.cle} type="button" className="dal-bk-menu-option" onClick={() => (setEtape(f.cle), setCherche(""))}>
                    <f.icone width={16} height={16} aria-hidden="true" />
                    {f.libelle}
                  </button>
                ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* « Saved filters » de Cal.com : ici, ce qu'on peut faire de l'agenda affiché */
function MenuPlus(props: { actif: boolean; copierAffiche: () => void; agendaAffiche: () => void; nbAffiches: number; relire: () => void }) {
  const [ouvert, setOuvert] = useState(false);
  const fermer = useCallback(() => setOuvert(false), []);
  const boite = useFermeture(ouvert, fermer);
  const agir = (f: () => void) => () => {
    fermer();
    f();
  };
  return (
    <div className="dal-bk-menu-boite" ref={boite}>
      <button type="button" className="dal-bk-bouton dal-bk-bouton--choix" aria-haspopup="menu" aria-expanded={ouvert} onClick={() => setOuvert((o) => !o)}>
        Agenda affiché
        <ChevronsUpDown width={16} height={16} aria-hidden="true" />
      </button>
      {ouvert ? (
        <div className="dal-bk-menu" role="menu" aria-label="Agenda affiché">
          <div className="dal-bk-menu-titre">Agenda affiché</div>
          {props.nbAffiches ? (
            <>
              <button type="button" role="menuitem" className="dal-bk-menu-option" onClick={agir(props.copierAffiche)}>
                <Copy width={16} height={16} aria-hidden="true" />
                Copier l&apos;agenda affiché
              </button>
              <button type="button" role="menuitem" className="dal-bk-menu-option" onClick={agir(props.agendaAffiche)}>
                <Calendar width={16} height={16} aria-hidden="true" />
                Télécharger (.ics)
              </button>
            </>
          ) : (
            <p className="dal-bk-menu-vide">Rien d&apos;affiché.</p>
          )}
          <div className="dal-bk-menu-sep" role="separator" />
          <a href="https://calendar.google.com/" target="_blank" rel="noreferrer" role="menuitem" className="dal-bk-menu-option" onClick={fermer}>
            <ExternalLink width={16} height={16} aria-hidden="true" />
            Ouvrir Google Agenda
          </a>
          <button type="button" role="menuitem" className="dal-bk-menu-option" onClick={agir(props.relire)}>
            <Check width={16} height={16} aria-hidden="true" />
            Relire l&apos;agenda
          </button>
        </div>
      ) : null}
    </div>
  );
}

/* ——— la liste : groupes (À venir), lignes, pied de pagination ——— */
function Liste(props: { onglet: Onglet; lignes: RendezVous[]; du: string; ouverte: RendezVous | null; ouvrir: (r: RendezVous) => void; choisis: string[]; setChoisis: (f: (c: string[]) => string[]) => void; page: number; parPage: number; aller: (m: Record<string, string | null>) => void; filtrer: (email: string) => void; optionsRdv: (r: RendezVous) => Option[] }) {
  const { onglet, lignes, du, page, parPage } = props;
  const pagine = onglet !== "a-venir";
  const nbPages = Math.max(1, Math.ceil(lignes.length / parPage));
  const p = Math.min(page, nbPages);
  const vues = pagine ? lignes.slice((p - 1) * parPage, p * parPage) : lignes;
  const groupes: { titre: string | null; lignes: RendezVous[] }[] =
    onglet === "a-venir"
      ? [
          { titre: "Aujourd'hui", lignes: vues.filter((r) => debutDe(r) <= du) },
          { titre: "À suivre", lignes: vues.filter((r) => debutDe(r) > du) },
        ].filter((g) => g.lignes.length)
      : [{ titre: null, lignes: vues }];
  return (
    <div className="dal-bk-carte">
      {groupes.map((g) => (
        <div key={g.titre ?? "tout"} className="dal-bk-groupe">
          {g.titre ? <div className="dal-bk-groupe-tete">{g.titre}</div> : null}
          <ul className="dal-bk-panneau">
            {g.lignes.map((r) => (
              <LigneVue key={r.id} {...props} r={r} />
            ))}
          </ul>
        </div>
      ))}
      {pagine ? (
        <div className="dal-bk-pied">
          <label className="dal-bk-par-page">
            <span className="dal-bk-select">
              <select value={parPage} aria-label="Lignes par page" onChange={(e) => props.aller({ n: e.target.value === "10" ? null : e.target.value, page: null })}>
                {[10, 25, 50].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              <ChevronsUpDown width={14} height={14} aria-hidden="true" />
            </span>
            lignes par page
          </label>
          <span className="dal-bk-pages">
            {(p - 1) * parPage + 1}-{Math.min(p * parPage, lignes.length)} sur {lignes.length}
            <button type="button" className="dal-bk-carre dal-bk-carre--28" aria-label="Page précédente" disabled={p <= 1} onClick={() => props.aller({ page: p - 1 > 1 ? String(p - 1) : null })}>
              <ChevronLeft width={16} height={16} aria-hidden="true" />
            </button>
            <button type="button" className="dal-bk-carre dal-bk-carre--28" aria-label="Page suivante" disabled={p >= nbPages} onClick={() => props.aller({ page: String(p + 1) })}>
              <ChevronRight width={16} height={16} aria-hidden="true" />
            </button>
          </span>
        </div>
      ) : null}
    </div>
  );
}

function LigneVue({ r, onglet, du, ouverte, ouvrir, choisis, setChoisis, filtrer, optionsRdv }: Parameters<typeof Liste>[0] & { r: RendezVous }) {
  const passe = onglet === "passes";
  const debut = debutDe(r);
  const fin = finDe(r);
  const date = passe ? (fin === debut ? dateLongue(debut) : `${jours(debut, fin)} ${morceaux(fin).a}`) : jours(debut, fin);
  const choisi = choisis.includes(r.id);
  const surClic = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("a,button,input,select,[role=menu]")) return;
    ouvrir(r);
  };
  const restant = num(fin) - Math.max(num(debut), num(du)) + 1;
  const mention = r.statut === "annule" || fin < du ? null : debut <= du ? (fin > du ? `En cours, jusqu'au ${jours(fin, fin)}` : "Aujourd'hui") : debut === plusJours(du, 1) ? "Demain" : null;
  const pastille = nonConfirme(r) && r.statut !== "annule" ? pastilleDe(r) : null;
  const premier = r.invites[0];
  return (
    <li className="dal-bk-ligne" data-ouverte={ouverte?.id === r.id ? "" : undefined} onClick={surClic}>
      <input type="checkbox" className="dal-bk-case" checked={choisi} aria-label={`Sélectionner : ${r.titre}`} onClick={(e) => e.stopPropagation()} onChange={() => setChoisis((c) => (choisi ? c.filter((x) => x !== r.id) : [...c, r.id]))} />
      <div className="dal-bk-quand">
        <p className="dal-bk-date">{date}</p>
        <p className="dal-bk-heure">{plage(r)}</p>
        {r.visio ? (
          <a href={r.visio} target="_blank" rel="noreferrer" className="dal-bk-video" title="Rejoindre la visio">
            <span className="dal-bk-logo teo-agenda-logo" aria-hidden="true">
              <Video width={10} height={10} />
            </span>
            <span className="dal-bk-video-texte">Google Meet</span>
          </a>
        ) : r.lieu ? (
          <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(r.lieu)}`} target="_blank" rel="noreferrer" className="dal-bk-video" title={r.lieu}>
            <span className="dal-bk-logo" aria-hidden="true">
              <MapPin width={10} height={10} />
            </span>
            <span className="dal-bk-video-texte">{r.lieu}</span>
          </a>
        ) : null}
      </div>
      <div className="dal-bk-quoi">
        <button type="button" className="dal-bk-titre" data-barre={r.statut === "annule" ? "" : undefined} onClick={() => ouvrir(r)}>
          {r.titre}
        </button>
        <p className="dal-bk-gris">
          {libGenre(genreDe(r))}
          {premier ? (
            <>
              {" · "}
              <button type="button" className="dal-bk-nom" title={`Filtrer sur ${nomInvite(premier)}`} onClick={() => filtrer(premier.email)}>
                {nomInvite(premier)}
              </button>
              {r.invites.length > 1 ? ` et ${pluriel(r.invites.length - 1, "autre")}` : ""}
            </>
          ) : null}
        </p>
        {mention ? <p className="dal-bk-bientot">{mention}</p> : null}
        {r.description ? <p className="dal-bk-gris">&quot;{r.description.length > 120 ? `${r.description.slice(0, 120)}…` : r.description}&quot;</p> : null}
        {onglet === "plusieurs-jours" ? (
          <p className="dal-bk-recurrent">
            <Calendar width={16} height={16} aria-hidden="true" />
            {pluriel(restant, "jour")} restant{restant > 1 ? "s" : ""}
          </p>
        ) : null}
        {pastille ? (
          <span className="dal-bk-pastille" data-teinte={pastille.teinte}>
            {pastille.texte}
          </span>
        ) : null}
      </div>
      <div className="dal-bk-actions">
        {onglet === "non-confirmes" && r.lien ? (
          <a className="dal-bk-petit dal-bk-petit--plein" href={r.lien} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
            Dans Google Agenda
          </a>
        ) : null}
        <MenuPoints libelle={`Actions : ${r.titre}`} options={optionsRdv(r)} />
      </div>
    </li>
  );
}

/* ——— le détail d'un rendez-vous (?rdv=) : panneau flottant, sans voile ——— */
function Detail({ r, du, fermer, precedente, suivante, options, copierLigne, filtrer }: { r: RendezVous; du: string; fermer: () => void; precedente: (() => void) | null; suivante: (() => void) | null; options: Option[]; copierLigne: () => void; filtrer: (email: string) => void }) {
  useEffect(() => {
    const echap = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !document.querySelector("[role=dialog][data-state=open]")) fermer();
    };
    document.addEventListener("keydown", echap);
    return () => document.removeEventListener("keydown", echap);
  }, [fermer]);
  const debut = debutDe(r);
  const fin = finDe(r);
  const pastille = r.statut !== "annule" && fin < du ? { texte: "Passé", teinte: "gris" as const } : pastilleDe(r);
  return (
    <aside className="dal-bk-detail" aria-label={r.titre}>
      <div className="dal-bk-detail-tete">
        <span className="dal-bk-pastille" data-teinte={pastille.teinte}>
          {pastille.texte}
        </span>
        <span className="dal-bk-detail-nav">
          <button type="button" className="dal-bk-carre dal-bk-carre--28 dal-bk-carre--nu" aria-label="Ligne précédente" disabled={!precedente} onClick={() => precedente?.()}>
            <ChevronUp width={16} height={16} aria-hidden="true" />
          </button>
          <button type="button" className="dal-bk-carre dal-bk-carre--28 dal-bk-carre--nu" aria-label="Ligne suivante" disabled={!suivante} onClick={() => suivante?.()}>
            <ChevronDown width={16} height={16} aria-hidden="true" />
          </button>
          <button type="button" className="dal-bk-carre dal-bk-carre--28 dal-bk-carre--nu" aria-label="Fermer" onClick={fermer}>
            <X width={16} height={16} aria-hidden="true" />
          </button>
        </span>
      </div>
      <div className="dal-bk-detail-corps">
        <h2 className="dal-bk-detail-titre">{r.titre}</h2>
        <section>
          <h3>Quand</h3>
          <p className="dal-bk-fort">{debut === fin ? dateEntiere(debut) : `${dateEntiere(debut)} - ${dateEntiere(fin).toLowerCase()}`}</p>
          <p>{r.journee ? (debut !== fin ? `Toute la journée, ${num(fin) - num(debut) + 1} jours` : "Toute la journée") : plage(r)}</p>
        </section>
        <section>
          <h3>Qui</h3>
          <div className="dal-bk-personne">
            <span className="dal-bk-avatar dal-bk-avatar--plein" aria-hidden="true">
              TP
            </span>
            <div>
              <p className="dal-bk-fort">
                Vous <span className="dal-bk-hote">Organisateur</span>
              </p>
              <p className="dal-bk-gris">Agenda {r.agenda}</p>
            </div>
          </div>
        </section>
        {r.invites.length ? (
          <section>
            <h3>Invités</h3>
            {r.invites.map((i) => (
              <div key={i.email} className="dal-bk-personne">
                <span className="dal-bk-avatar" aria-hidden="true">
                  {initiales(nomInvite(i))}
                </span>
                <div>
                  <p className="dal-bk-fort">
                    <button type="button" className="dal-bk-nom" title={`Filtrer sur ${nomInvite(i)}`} onClick={() => filtrer(i.email)}>
                      {nomInvite(i)}
                    </button>
                  </p>
                  {i.nom ? <p className="dal-bk-gris">{i.email}</p> : null}
                  <p className="dal-bk-gris">{REPONSE[i.reponse]}</p>
                </div>
              </div>
            ))}
          </section>
        ) : null}
        <section>
          <h3>Où</h3>
          {r.visio ? (
            <p className="dal-bk-ligne-icone">
              <Video width={16} height={16} aria-hidden="true" />
              <a className="dal-bk-lien" href={r.visio} target="_blank" rel="noreferrer">
                Rejoindre la visio
              </a>
            </p>
          ) : null}
          {r.lieu ? (
            <p className="dal-bk-ligne-icone">
              <MapPin width={16} height={16} aria-hidden="true" />
              <a className="dal-bk-lien" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(r.lieu)}`} target="_blank" rel="noreferrer">
                {r.lieu}
              </a>
            </p>
          ) : null}
          {!r.visio && !r.lieu ? <p className="dal-bk-gris">Aucun lieu noté.</p> : null}
        </section>
        <section>
          <h3>Notes</h3>
          <p style={{ whiteSpace: "pre-wrap" }}>{r.description ?? "Aucune note dans l'événement."}</p>
        </section>
      </div>
      <div className="dal-bk-detail-pied">
        <span className="dal-bk-groupe-bouton">
          {r.lien ? (
            <a href={r.lien} target="_blank" rel="noreferrer" className="dal-bk-bouton">
              <span className="dal-bk-logo teo-agenda-logo" aria-hidden="true">
                <Calendar width={10} height={10} />
              </span>
              {r.origine === "tableau" ? "Ouvrir dans le tableau des associés" : "Ouvrir dans Google Agenda"}
            </a>
          ) : null}
          <button type="button" className="dal-bk-bouton dal-bk-bouton--icone" aria-label="Copier" title="Copier en texte" onClick={copierLigne}>
            <Copy width={16} height={16} aria-hidden="true" />
          </button>
        </span>
        <MenuPoints libelle={`Actions : ${r.titre}`} options={options} haut />
      </div>
    </aside>
  );
}

/* ——— la vue calendrier (?vue=calendrier) : jour, semaine (64 px par heure), mois ——— */
function Calendrier({ lignes, du, ouverte, ouvrir, quand, echelle, aller }: { lignes: RendezVous[]; du: string; ouverte: RendezVous | null; ouvrir: (r: RendezVous) => void; quand: string | null; echelle: string | null; aller: (m: Record<string, string | null>) => void }) {
  const ech: "jour" | "semaine" | "mois" = echelle === "jour" || echelle === "mois" ? echelle : "semaine";
  const repere = quand && /^\d{4}-\d{2}-\d{2}$/.test(quand) ? quand : du;
  const grille = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (grille.current) grille.current.scrollTop = 7 * 64;
  }, [ech]);
  const m = morceaux(repere);
  const premierDuMois = `${m.a}-${`${m.m + 1}`.padStart(2, "0")}-01`;
  const decaler = (sens: number) => {
    if (ech === "mois") {
      const d = new Date(Date.UTC(m.a, m.m + sens, 1));
      return aller({ jour: d.toISOString().slice(0, 10) });
    }
    aller({ jour: plusJours(repere, sens * (ech === "jour" ? 1 : 7)) });
  };
  const joursVus = ech === "jour" ? [repere] : Array.from({ length: 7 }, (_, i) => plusJours(lundiDe(repere), i));
  const ce = (j: string) => lignes.filter((r) => debutDe(r) <= j && finDe(r) >= j);
  const bloc = (r: RendezVous, style?: React.CSSProperties) => (
    <button key={r.id} type="button" className="dal-bk-evt" data-genre={r.journee ? "absence" : "passage"} data-ouverte={ouverte?.id === r.id ? "" : undefined} data-teinte={nonConfirme(r) ? "ambre" : undefined} style={style} title={r.titre} onClick={() => ouvrir(r)}>
      <span className="dal-bk-evt-titre">{r.titre}</span>
      {!r.journee ? <span className="dal-bk-evt-sous">{`${heureLocale(r.debut)} - ${heureLocale(r.fin)}${r.lieu ? ` · ${r.lieu}` : r.visio ? " · visio" : ""}`}</span> : null}
    </button>
  );
  const [ici, setIci] = useState<{ min: number; fuseau: string } | null>(null);
  useEffect(() => {
    const lire = () => {
      const d = new Date();
      const nom = new Intl.DateTimeFormat("fr-FR", { timeZoneName: "short" }).formatToParts(d).find((x) => x.type === "timeZoneName")?.value ?? "";
      setIci({ min: d.getHours() * 60 + d.getMinutes(), fuseau: nom });
    };
    const t = window.setTimeout(lire, 0);
    const i = window.setInterval(lire, 60_000);
    return () => {
      window.clearTimeout(t);
      window.clearInterval(i);
    };
  }, []);
  const minutes = (x: string) => {
    const d = new Date(x);
    return d.getHours() * 60 + d.getMinutes();
  };
  return (
    <div className="dal-bk-cal">
      <div className="dal-bk-cal-barre">
        <button type="button" className="dal-bk-carre dal-bk-carre--28" aria-label="Précédent" onClick={() => decaler(-1)}>
          <ChevronLeft width={16} height={16} aria-hidden="true" />
        </button>
        <button type="button" className="dal-bk-carre dal-bk-carre--28" aria-label="Suivant" onClick={() => decaler(1)}>
          <ChevronRight width={16} height={16} aria-hidden="true" />
        </button>
        <button type="button" className="dal-bk-bouton" onClick={() => aller({ jour: null })}>
          Aujourd&apos;hui
        </button>
        <span className="dal-bk-cal-mois">
          {MOIS[m.m].charAt(0).toUpperCase() + MOIS[m.m].slice(1)} {m.a}
        </span>
        <nav className="dal-bk-segment dal-bk-segment--droite" aria-label="Échelle">
          {(["jour", "semaine", "mois"] as const).map((e) => (
            <button key={e} type="button" aria-current={ech === e ? "page" : undefined} onClick={() => aller({ echelle: e === "semaine" ? null : e })}>
              {e === "jour" ? "Jour" : e === "semaine" ? "Semaine" : "Mois"}
            </button>
          ))}
        </nav>
      </div>
      {ech === "mois" ? (
        <div className="dal-bk-mois">
          {JOURS_COURTS.map((j) => (
            <div key={j} className="dal-bk-mois-tete">
              {j}
            </div>
          ))}
          {Array.from({ length: 42 }, (_, i) => plusJours(lundiDe(premierDuMois), i)).map((j) => {
            const la = ce(j);
            return (
              <div key={j} className="dal-bk-mois-case" data-dehors={morceaux(j).m !== m.m ? "" : undefined}>
                <span className="dal-bk-num" data-aujourdhui={j === du ? "" : undefined}>
                  {morceaux(j).j}
                </span>
                {la.slice(0, 3).map((r) => bloc(r))}
                {la.length > 3 ? (
                  <button type="button" className="dal-bk-plus" onClick={() => aller({ echelle: "jour", jour: j })}>
                    + {la.length - 3}
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="dal-bk-semaine" style={{ ["--dal-bk-cols" as string]: joursVus.length }}>
          <div className="dal-bk-sem-tete">
            <span className="dal-bk-fuseau">{ici?.fuseau}</span>
            {joursVus.map((j) => (
              <button key={j} type="button" className="dal-bk-sem-jour" onClick={() => aller({ echelle: "jour", jour: j })}>
                {JOURS_COURTS[morceaux(j).r]}
                <span className="dal-bk-num" data-aujourdhui={j === du ? "" : undefined}>
                  {morceaux(j).j}
                </span>
              </button>
            ))}
          </div>
          <div className="dal-bk-sem-journee">
            <span className="dal-bk-heure-col">Journée</span>
            {joursVus.map((j) => (
              <div key={j} className="dal-bk-sem-cellule">
                {ce(j)
                  .filter((r) => r.journee)
                  .map((r) => bloc(r))}
              </div>
            ))}
          </div>
          <div className="dal-bk-sem-grille" ref={grille}>
            <div className="dal-bk-heures">
              {Array.from({ length: 24 }, (_, h) => (
                <span key={h} style={{ top: h * 64 - 8 }}>
                  {h ? `${h} h` : ""}
                </span>
              ))}
            </div>
            {joursVus.map((j) => (
              <div key={j} className="dal-bk-sem-col">
                {ce(j)
                  .filter((r) => !r.journee)
                  .map((r) => bloc(r, { top: (minutes(r.debut) * 64) / 60, height: Math.max(20, ((minutes(r.fin) - minutes(r.debut)) * 64) / 60) }))}
                {j === du && ici ? <span className="dal-bk-maintenant" style={{ top: (ici.min * 64) / 60 }} aria-hidden="true" /> : null}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
