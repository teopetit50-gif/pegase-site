"use client";

/* ══════════════════════════════════════════════════════════════════════
   « Appels » sur la page d'un fil de Plain, au 1:1 — 28/10/2026 (nuit)

   Teo : « reproduis-les à l'identique ». Modèle : la page d'un fil de
   Plain (app.plain.com) — à gauche la colonne des fils, au milieu le fil
   (messages, notes, événements, bandeaux) et son composeur « Reply · Add
   note · More », à droite le panneau « Thread details » aux sections
   repliables. Mesures : ./plain-fil.css (relevé scratchpad/releve-plain-fil.md).

   Les appels sont ceux de l'ancienne page (Collection « appels ») : même
   clé du localStorage (espace2-collection-appels), mêmes champs (avec qui,
   date, ce qui a été dit), gardés sur cet appareil — la page le dit encore.
   Chaque ancien geste est là :
     · rechercher        → le menu « Affichage » (V) de la colonne, et ?q=
     · ajouter un appel  → « Nouvel appel » (A) en tête de colonne, le formulaire au milieu
     · ouvrir une fiche  → la ligne de la colonne ; ?id= (replace)
     · supprimer         → « Plus… » du composeur et « … » de la tête
     · le total          → le pied de la colonne
   Et ce que le modèle apporte : des notes sur un appel (N), un suivi
   (date de rappel, orange quand elle est passée), clos / rouvert, une
   priorité ; tout dans le même enregistrement.
   ══════════════════════════════════════════════════════════════════════ */

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useId, useMemo, useRef, useState, type FormEvent } from "react";
import { AlignJustify, CalendarDays, Check, ChevronDown, ChevronLeft, EyeOff, MoreHorizontal, PanelLeft, PanelRight, Phone, Plus, Rows3, StickyNote, Trash2, X } from "lucide-react";
import { ecrireStockage, useStockage } from "../Collection";
import { useToast } from "../Toasts";
import { RACINE } from "../modules";
import { BoutonPlain, IconeAffichage, IconeAnneau, IconeBulle, IconeCoche, IconeHorloge, IconePrioriteFil, PRIORITES, couleurDe, initialesDe, type Priorite } from "./ListeFils";
import "./lin.css";
import "./plain-fil.css";

/* ——— les données : la fiche de l'ancienne page, enrichie ——— */
type Note = { id: string; texte: string; cree: string };
type Appel = {
  id: string;
  cree: string;
  avec?: string;
  date?: string;
  resume?: string;
  /* l'ancien drapeau des collections (« fait ») : posé quand l'appel est clos, pour le compteur de la barre */
  fait?: boolean;
  clos?: string;
  suivi?: string;
  priorite?: Priorite;
  notes?: Note[];
  modifie?: string;
};

const CLE = "espace2-collection-appels";
const CHEMIN = `${RACINE}/appels`;

function lire(brut: string | null): Appel[] | null {
  if (brut === null) return null;
  try {
    const v = JSON.parse(brut || "[]");
    return Array.isArray(v) ? (v as Appel[]) : [];
  } catch {
    return [];
  }
}

/* ——— dates ——— */
const JOUR = 86400000;
const estJour = (x: string) => /^\d{4}-\d{2}-\d{2}$/.test(x);
const dateFr = (iso: string, opt: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("fr-FR", { ...opt, timeZone: estJour(iso) ? "UTC" : undefined });
};
const heureFr = (iso: string) => new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
const minuitLocal = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
const jourDe = (x: string) => {
  if (estJour(x)) {
    const [a, m, j] = x.split("-").map(Number);
    return new Date(a, m - 1, j).getTime();
  }
  return minuitLocal(new Date(x));
};
/* « il y a 2 h », « hier », « 12 oct. » — l'heure relative des fils de Plain */
function relatif(iso: string, maintenant: number) {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return iso;
  const d = Math.max(0, maintenant - t);
  if (d < 60000) return "à l'instant";
  if (d < 3600000) return `il y a ${Math.floor(d / 60000)} min`;
  if (d < JOUR) return `il y a ${Math.floor(d / 3600000)} h`;
  if (d < 2 * JOUR) return "hier";
  if (d < 7 * JOUR) return `il y a ${Math.floor(d / JOUR)} j`;
  return dateFr(iso, { day: "numeric", month: "short" });
}
/* le libellé du séparateur de jour (« Today » chez Plain) */
function libelleJour(jour: number, aujourdhui: number) {
  if (jour === aujourdhui) return "Aujourd'hui";
  if (jour === aujourdhui - JOUR) return "Hier";
  return new Date(jour).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: jour < aujourdhui - 300 * JOUR ? "numeric" : undefined });
}
function useMaintenant() {
  const [t, setT] = useState(() => Date.now());
  useEffect(() => {
    const i = window.setInterval(() => setT(Date.now()), 60000);
    return () => window.clearInterval(i);
  }, []);
  return t;
}

/* ——— les menus : s'ouvrent au clic, se ferment dehors et à Échap ——— */
function MenuPt({
  bouton,
  libelle,
  haut,
  gauche,
  children,
}: {
  bouton: (ouvert: boolean, basculer: () => void, ref: React.Ref<HTMLButtonElement>) => React.ReactNode;
  libelle: string;
  haut?: boolean;
  gauche?: boolean;
  children: (fermer: () => void) => React.ReactNode;
}) {
  const [ouvert, setOuvert] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const declencheur = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!ouvert) return;
    const clic = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOuvert(false);
    };
    const touche = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOuvert(false);
        declencheur.current?.focus();
      }
    };
    document.addEventListener("mousedown", clic);
    document.addEventListener("keydown", touche, true);
    return () => {
      document.removeEventListener("mousedown", clic);
      document.removeEventListener("keydown", touche, true);
    };
  }, [ouvert]);
  return (
    <div className="pt-ancre" ref={ref}>
      {bouton(ouvert, () => setOuvert((v) => !v), declencheur)}
      {ouvert ? (
        <div className="pt-menu" role="menu" aria-label={libelle} data-haut={haut ? "" : undefined} data-gauche={gauche ? "" : undefined}>
          {children(() => setOuvert(false))}
        </div>
      ) : null}
    </div>
  );
}

function OptionPt({ icone, children, n, actif, onClick, teinte }: { icone?: React.ReactNode; children: React.ReactNode; n?: number; actif?: boolean; onClick: () => void; teinte?: "orange" }) {
  return (
    <button type="button" className="pt-option" role={actif === undefined ? "menuitem" : "menuitemcheckbox"} aria-checked={actif} data-teinte={teinte} onClick={onClick}>
      {icone ? <span className="pt-option-icone">{icone}</span> : null}
      <span className="pt-option-libelle">{children}</span>
      {n !== undefined ? <span className="pt-option-n">{n}</span> : null}
      {actif ? <Check className="pt-option-coche" aria-hidden="true" /> : null}
    </button>
  );
}

/* une section repliable du panneau de droite (« Thread details ») */
function Section({ titre, children, droite }: { titre: string; children: React.ReactNode; droite?: React.ReactNode }) {
  const [replie, setReplie] = useState(false);
  const id = useId();
  return (
    <section className="pt-section" data-replie={replie ? "" : undefined} aria-labelledby={id}>
      <div className="pt-section-tete">
        <button type="button" className="pt-section-titre" id={id} aria-expanded={!replie} onClick={() => setReplie((v) => !v)}>
          {titre}
          <ChevronDown aria-hidden="true" />
        </button>
        {droite}
      </div>
      <div className="pt-section-corps">{children}</div>
    </section>
  );
}

/* ——— les vues de la colonne (dans l'adresse) ——— */
type Etat = "tous" | "ouverts" | "clos";
const ETATS: { cle: Etat; libelle: string }[] = [
  { cle: "tous", libelle: "Tous" },
  { cle: "ouverts", libelle: "Ouverts" },
  { cle: "clos", libelle: "Clos" },
];
type Tri = "recent" | "ancien" | "nom";
const TRIS: { cle: Tri; libelle: string }[] = [
  { cle: "recent", libelle: "Plus récents d'abord" },
  { cle: "ancien", libelle: "Plus anciens d'abord" },
  { cle: "nom", libelle: "Par interlocuteur" },
];

const sansAccents = (x: string) => x.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? "s" : ""}`;

export default function FilAppels() {
  const routeur = useRouter();
  const params = useSearchParams();
  const toast = useToast();
  const maintenant = useMaintenant();
  const aujourdhui = minuitLocal(new Date(maintenant));

  const brut = useStockage(CLE);
  const appels = useMemo(() => lire(brut), [brut]);
  const ecrire = useCallback((liste: Appel[]) => ecrireStockage(CLE, JSON.stringify(liste)), []);
  const modifier = useCallback(
    (id: string, maj: (a: Appel) => Appel) => {
      ecrire((lire(localStorage.getItem(CLE)) ?? []).map((a) => (a.id === id ? { ...maj(a), modifie: new Date().toISOString() } : a)));
    },
    [ecrire],
  );

  /* l'adresse : ?id= (l'appel ouvert), ?q= (recherche), ?etat=, ?tri=, ?nouveau=1, ?vue=notes */
  const idOuvert = params.get("id");
  const q = params.get("q") ?? "";
  const etat = (ETATS.some((e) => e.cle === params.get("etat")) ? params.get("etat") : "tous") as Etat;
  const tri = (TRIS.some((t) => t.cle === params.get("tri")) ? params.get("tri") : "recent") as Tri;
  const nouveau = params.get("nouveau") === "1";
  const vueNotes = params.get("vue") === "notes";
  const adresse = useCallback(
    (modif: (p: URLSearchParams) => void) => {
      const p = new URLSearchParams(params.toString());
      modif(p);
      const qs = p.toString();
      return qs ? `${CHEMIN}?${qs}` : CHEMIN;
    },
    [params],
  );
  const aller = useCallback((href: string) => routeur.replace(href, { scroll: false }), [routeur]);
  const poser = (cle: string, valeur: string | null) =>
    aller(
      adresse((p) => {
        if (valeur) p.set(cle, valeur);
        else p.delete(cle);
      }),
    );
  const ouvrir = (id: string | null) =>
    aller(
      adresse((p) => {
        if (id) p.set("id", id);
        else p.delete("id");
        p.delete("nouveau");
      }),
    );

  /* la liste : recherche, état, tri */
  const visibles = useMemo(() => {
    const liste = (appels ?? []).filter((a) => {
      if (etat === "ouverts" && a.clos) return false;
      if (etat === "clos" && !a.clos) return false;
      if (!q) return true;
      const r = sansAccents(q);
      return sansAccents(`${a.avec ?? ""} ${a.resume ?? ""} ${(a.notes ?? []).map((n) => n.texte).join(" ")}`).includes(r);
    });
    const instant = (a: Appel) => new Date(a.date && !estJour(a.date) ? a.date : a.cree).getTime();
    return [...liste].sort((a, b) => (tri === "nom" ? (a.avec ?? "").localeCompare(b.avec ?? "", "fr") : tri === "ancien" ? instant(a) - instant(b) : instant(b) - instant(a)));
  }, [appels, q, etat, tri]);
  const nOuverts = (appels ?? []).filter((a) => !a.clos).length;
  const nClos = (appels ?? []).length - nOuverts;
  const appel = (appels ?? []).find((a) => a.id === idOuvert) ?? null;
  const numero = (a: Appel) => `A-${(appels ?? []).length - (appels ?? []).findIndex((x) => x.id === a.id)}`;

  /* un suivi passé et l'appel encore ouvert : hors délai */
  const enRetard = (a: Appel) => !!a.suivi && !a.clos && jourDe(a.suivi) < aujourdhui;

  /* ——— les gestes ——— */
  const [colonne, setColonne] = useState(true);
  const [details, setDetails] = useState(true);
  /* l'éditeur de note est ouvert pour un appel donné : changer d'appel le referme */
  const [editeurPour, setEditeurPour] = useState<string | null>(null);
  const editeur = !!idOuvert && editeurPour === idOuvert;
  const setEditeur = (v: boolean) => setEditeurPour(v ? idOuvert : null);
  const zone = useRef<HTMLTextAreaElement>(null);

  const ajouterNote = (id: string, texte: string) => {
    const t = texte.trim();
    if (!t) return;
    modifier(id, (a) => ({ ...a, notes: [...(a.notes ?? []), { id: crypto.randomUUID(), texte: t, cree: new Date().toISOString() }] }));
    setEditeur(false);
    toast("Note ajoutée", "vert");
  };
  const supprimerNote = (id: string, note: string) => {
    modifier(id, (a) => ({ ...a, notes: (a.notes ?? []).filter((n) => n.id !== note) }));
    toast("Note supprimée");
  };
  const clore = (id: string, oui: boolean) => {
    modifier(id, (a) => ({ ...a, clos: oui ? new Date().toISOString() : undefined, fait: oui }));
    toast(oui ? "Appel clos" : "Appel rouvert", "vert");
  };
  const poserSuivi = (id: string, jour: string | null) => {
    modifier(id, (a) => ({ ...a, suivi: jour ?? undefined }));
    toast(jour ? `Suivi prévu le ${dateFr(jour)}` : "Suivi retiré");
  };
  const poserPriorite = (id: string, p: Priorite) => modifier(id, (a) => ({ ...a, priorite: p }));
  const supprimer = (id: string) => {
    ecrire((appels ?? []).filter((a) => a.id !== id));
    if (idOuvert === id) ouvrir(null);
    toast("Supprimé");
  };
  const idForm = useId();
  const ajouter = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    const fiche: Appel = {
      id: crypto.randomUUID(),
      cree: new Date().toISOString(),
      avec: d.get("avec")?.toString().trim() ?? "",
      date: d.get("date")?.toString().trim() ?? "",
      resume: d.get("resume")?.toString().trim() ?? "",
    };
    ecrire([fiche, ...(appels ?? [])]);
    toast("Enregistré", "vert");
    ouvrir(fiche.id);
  };

  /* ↑/↓ dans la colonne, N ouvre l'éditeur de note, A un nouvel appel, V le menu Affichage, Échap referme */
  useEffect(() => {
    const touche = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
      const c = e.target as HTMLElement | null;
      if (c && (c.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(c.tagName))) return;
      if (document.querySelector(".pt-menu, .v2-voile")) return;
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        if (!visibles.length) return;
        e.preventDefault();
        let i = visibles.findIndex((a) => a.id === idOuvert);
        if (i < 0) i = e.key === "ArrowDown" ? 0 : visibles.length - 1;
        else i = e.key === "ArrowDown" ? Math.min(visibles.length - 1, i + 1) : Math.max(0, i - 1);
        ouvrir(visibles[i].id);
        document.querySelector<HTMLElement>(`[data-appel="${CSS.escape(visibles[i].id)}"]`)?.focus();
      } else if (e.key.toLowerCase() === "n" && appel && !nouveau) {
        e.preventDefault();
        setEditeur(true);
      } else if (e.key.toLowerCase() === "a" && !nouveau) {
        e.preventDefault();
        aller(adresse((p) => p.set("nouveau", "1")));
      } else if (e.key === "Escape") {
        if (editeur) setEditeur(false);
        else if (nouveau) poser("nouveau", null);
        else if (idOuvert) ouvrir(null);
      }
    };
    window.addEventListener("keydown", touche);
    return () => window.removeEventListener("keydown", touche);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibles.map((a) => a.id).join("|"), idOuvert, appel?.id, nouveau, editeur, adresse, aller]);
  useEffect(() => {
    if (editeur) zone.current?.focus();
  }, [editeur]);

  /* ——— le fil d'un appel : l'appel, ses notes, les événements, par jour ——— */
  type Element = {
    cle: string;
    quand: string;
    genre: "appel" | "note" | "systeme" | "bandeau";
    note?: Note;
    systeme?: React.ReactNode;
    bandeau?: { teinte?: "orange" | "gris"; texte: React.ReactNode; icone: React.ReactNode };
  };
  const elements = useMemo<Element[]>(() => {
    if (!appel) return [];
    const quandAppel = appel.date ? (estJour(appel.date) ? `${appel.date}T12:00:00` : appel.date) : appel.cree;
    const l: Element[] = [
      { cle: "appel", quand: quandAppel, genre: "appel" },
      {
        cle: "cree",
        quand: appel.cree,
        genre: "systeme",
        systeme: (
          <>
            Appel enregistré{" "}
            <span>
              le {dateFr(appel.cree)} à {heureFr(appel.cree)}, sur cet appareil
            </span>
          </>
        ),
      },
      ...(appel.notes ?? []).map((n) => ({ cle: n.id, quand: n.cree, genre: "note" as const, note: n })),
    ];
    if (appel.clos)
      l.push({
        cle: "clos",
        quand: appel.clos,
        genre: "bandeau",
        bandeau: {
          teinte: "gris",
          icone: <IconeCoche />,
          texte: (
            <>
              Appel <b>clos</b> le {dateFr(appel.clos)} à {heureFr(appel.clos)}
            </>
          ),
        },
      });
    else if (appel.suivi)
      l.push({
        cle: "suivi",
        quand: new Date(maintenant).toISOString(),
        genre: "bandeau",
        bandeau: enRetard(appel)
          ? {
              teinte: "orange",
              icone: <IconeHorloge />,
              texte: (
                <>
                  <b>Suivi en retard</b> : il était prévu le {dateFr(appel.suivi)}
                </>
              ),
            }
          : {
              icone: <CalendarDays />,
              texte: (
                <>
                  <b>Suivi prévu</b> le {dateFr(appel.suivi)}
                </>
              ),
            },
      });
    else if (!(appel.notes ?? []).length)
      l.push({
        cle: "attente",
        quand: new Date(maintenant).toISOString(),
        genre: "bandeau",
        bandeau: {
          icone: <IconeAnneau />,
          texte: (
            <>
              <b>{appel.avec || "Cet appel"}</b> attend un suivi : une note, une date de rappel, ou le clore
            </>
          ),
        },
      });
    /* les bandeaux « maintenant » passent après tout le reste, même un appel enregistré à l'instant */
    const dernier = Math.max(maintenant, ...l.filter((e) => e.genre !== "bandeau").map((e) => new Date(e.quand).getTime()));
    for (const e of l) if (e.genre === "bandeau" && e.cle !== "clos") e.quand = new Date(dernier + 1).toISOString();
    const r = l.sort((a, b) => new Date(a.quand).getTime() - new Date(b.quand).getTime());
    return vueNotes ? r.filter((e) => e.genre === "appel" || e.genre === "note") : r;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appel, vueNotes, maintenant]);

  const couleur = (a: Appel) => couleurDe(a.avec || a.id);
  const lettre = (a: Appel) => initialesDe(a.avec || "?");

  /* ——— rendu ——— */
  const ouvert = !!appel || nouveau;
  const vide = appels !== null && appels.length === 0;
  return (
    <div className="lin pt" data-sans-colonne={!colonne && ouvert ? "" : undefined} data-ouvert={ouvert ? "" : undefined}>
      {/* ——— la colonne des appels ——— */}
      <aside className="pt-panneau pt-colonne" aria-label="Appels">
        <div className="pt-col-tete">
          <div className="pt-col-titre">
            <h1>Appels</h1>
            <span className="pt-col-vue">{ETATS.find((e) => e.cle === etat)?.libelle}</span>
            <span className="pt-col-n">{appels === null ? "" : visibles.length}</span>
          </div>
          <div className="pt-col-actions">
            <BoutonPlain icone={<Plus aria-hidden="true" />} raccourci="A" href={adresse((p) => p.set("nouveau", "1"))} libelle="Nouvel appel (A)">
              Nouvel appel
            </BoutonPlain>
            <MenuPt
              libelle="Affichage"
              bouton={(o, basculer, ref) => (
                <BoutonPlain boutonRef={ref} icone={<IconeAffichage />} raccourci="V" ouvert={o} onClick={basculer} actif={!!q || etat !== "tous"} libelle="Affichage (V)">
                  Affichage
                </BoutonPlain>
              )}
            >
              {() => (
                <>
                  <div className="pt-menu-groupe">
                    <input
                      className="pt-menu-champ"
                      type="search"
                      placeholder="Rechercher un appel…"
                      aria-label="Rechercher : Appels"
                      defaultValue={q}
                      autoFocus
                      onChange={(e) => poser("q", e.target.value.trim() || null)}
                    />
                  </div>
                  <div className="pt-menu-groupe">
                    <p className="pt-menu-titre">État</p>
                    {ETATS.map((e) => (
                      <OptionPt key={e.cle} actif={etat === e.cle} n={e.cle === "tous" ? (appels ?? []).length : e.cle === "ouverts" ? nOuverts : nClos} onClick={() => poser("etat", e.cle === "tous" ? null : e.cle)}>
                        {e.libelle}
                      </OptionPt>
                    ))}
                  </div>
                  <div className="pt-menu-groupe">
                    <p className="pt-menu-titre">Tri</p>
                    {TRIS.map((t) => (
                      <OptionPt key={t.cle} actif={tri === t.cle} onClick={() => poser("tri", t.cle === "recent" ? null : t.cle)}>
                        {t.libelle}
                      </OptionPt>
                    ))}
                  </div>
                </>
              )}
            </MenuPt>
          </div>
        </div>
        <div className="pt-col-corps">
          {appels === null ? null : visibles.length === 0 ? (
            <div className="pt-vide">
              <strong>{q || etat !== "tous" ? "Rien ne correspond" : "Aucun appel noté pour l'instant"}</strong>
              <p>{q || etat !== "tous" ? "Aucun appel ne correspond à cette recherche." : "Le journal des appels : avec qui, quand, et ce qui a été dit."}</p>
            </div>
          ) : (
            <div role="group" aria-label="Liste des appels">
              {visibles.map((a) => {
                const retard = enRetard(a);
                const n = (a.notes ?? []).length;
                return (
                  <button
                    key={a.id}
                    type="button"
                    className="pt-ligne"
                    data-appel={a.id}
                    data-actif={a.id === idOuvert ? "" : undefined}
                    aria-pressed={a.id === idOuvert}
                    onClick={() => ouvrir(a.id === idOuvert ? null : a.id)}
                  >
                    <span className="pt-ligne-etat" data-teinte={a.clos ? undefined : retard ? "orange" : "bleu"}>
                      {a.clos ? <IconeCoche titre="Clos" /> : retard ? <IconeHorloge titre="Suivi en retard" /> : <IconeAnneau titre="Ouvert" />}
                    </span>
                    <span className="pt-ligne-qui">
                      <span className="pt-avatar-24" style={{ "--pt-avatar": couleur(a) } as React.CSSProperties} aria-hidden="true">
                        {lettre(a)}
                      </span>
                      <b>{a.avec || "—"}</b>
                    </span>
                    <span className="pt-ligne-heure" data-urgence={retard ? "" : undefined}>
                      {a.date ? <CalendarDays aria-hidden="true" /> : <IconeBulle />}
                      <time dateTime={a.date || a.cree}>{a.date ? dateFr(a.date, { day: "numeric", month: "short" }) : relatif(a.cree, maintenant)}</time>
                    </span>
                    <span className="pt-ligne-apercu">
                      <span className="pt-ligne-ref">{numero(a)}</span>
                      <span>{a.resume || "Aucun résumé"}</span>
                      {n ? <span className="pt-ligne-n">· {pluriel(n, "note")}</span> : null}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        {appels !== null ? <div className="pt-col-pied">{`Total : ${pluriel(visibles.length, "appel")} · gardés sur cet appareil, vos collègues ne les voient pas encore`}</div> : null}
      </aside>

      {/* ——— le panneau du fil ——— */}
      <div className="pt-panneau pt-fil" data-sans-details={!details || nouveau || !appel ? "" : undefined}>
        {nouveau ? (
          <>
            <header className="pt-tete">
              <div className="pt-tete-gauche">
                <button type="button" className="pt-ico pt-ico--24" aria-label="Retour à la liste" onClick={() => poser("nouveau", null)}>
                  <ChevronLeft aria-hidden="true" />
                </button>
                <span className="pt-tete-etat" data-teinte="bleu">
                  <IconeAnneau />
                </span>
                <h2>Nouvel appel</h2>
              </div>
              <div className="pt-tete-droite">
                <button type="button" className="pt-ico" aria-label="Fermer" onClick={() => poser("nouveau", null)}>
                  <X aria-hidden="true" />
                </button>
              </div>
            </header>
            <div className="pt-centre">
              <div className="pt-defile" style={{ paddingBottom: 24 }}>
                <div className="pt-element">
                  <span className="pt-avatar-40" aria-hidden="true">
                    <Phone width={18} height={18} />
                  </span>
                  <form id={idForm} className="pt-carte pt-form" onSubmit={ajouter}>
                    <label>
                      Avec qui
                      <input className="pt-champ" name="avec" required autoFocus autoComplete="off" />
                    </label>
                    <label>
                      Date
                      <input className="pt-champ" name="date" type="date" />
                    </label>
                    <label>
                      Ce qui a été dit
                      <textarea className="pt-champ pt-champ--long" name="resume" rows={4} />
                    </label>
                    <p className="pt-form-note">Enregistré sur cet appareil.</p>
                    <div className="pt-form-pied">
                      <button type="button" className="pt-btn" onClick={() => poser("nouveau", null)}>
                        Annuler
                      </button>
                      <button type="submit" className="pt-btn pt-btn--primaire">
                        Enregistrer
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </>
        ) : !appel ? (
          <>
            <header className="pt-tete">
              <div className="pt-tete-gauche">
                <h2>{vide ? "Aucun appel" : "Aucun appel ouvert"}</h2>
              </div>
            </header>
            <div className="pt-centre">
              <div className="pt-defile">
                <div className="pt-vide">
                  <strong>{vide ? "Aucun appel noté pour l'instant" : "Choisissez un appel"}</strong>
                  <p>{vide ? "Le journal des appels : avec qui, quand, et ce qui a été dit." : "Son fil s'affiche ici : l'appel, vos notes, le suivi."}</p>
                  <button type="button" className="pt-btn" onClick={() => aller(adresse((p) => p.set("nouveau", "1")))}>
                    <Plus aria-hidden="true" />
                    Nouvel appel
                    <kbd className="pt-kbd">A</kbd>
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <header className="pt-tete">
              <div className="pt-tete-gauche">
                <button
                  type="button"
                  className="pt-ico pt-ico--24 pt-tete-colonne"
                  aria-label={colonne ? "Masquer la liste des appels" : "Afficher la liste des appels"}
                  aria-pressed={colonne}
                  onClick={() => setColonne((v) => !v)}
                >
                  <PanelLeft aria-hidden="true" />
                </button>
                <button type="button" className="pt-ico pt-ico--24 pt-tete-retour" aria-label="Retour à la liste" onClick={() => ouvrir(null)}>
                  <ChevronLeft aria-hidden="true" />
                </button>
                {appel.clos ? (
                  <span className="pt-badge">Clos</span>
                ) : enRetard(appel) ? (
                  <span className="pt-badge" data-teinte="orange">
                    En retard
                  </span>
                ) : null}
                <span className="pt-tete-etat" data-teinte={appel.clos ? undefined : enRetard(appel) ? "orange" : "bleu"}>
                  {appel.clos ? <IconeCoche titre="Clos" /> : enRetard(appel) ? <IconeHorloge titre="Suivi en retard" /> : <IconeAnneau titre="Ouvert" />}
                </span>
                <span className="pt-tete-ref">{numero(appel)}</span>
                <h2>{appel.avec || "—"}</h2>
                <span className="pt-tete-heure">
                  <IconeBulle />
                  <time dateTime={appel.modifie ?? appel.cree}>{relatif(appel.modifie ?? appel.cree, maintenant)}</time>
                </span>
              </div>
              <div className="pt-tete-droite">
                <div className="pt-seg" role="group" aria-label="Contenu du fil">
                  <button type="button" aria-label="Tout le fil" aria-pressed={!vueNotes} onClick={() => poser("vue", null)}>
                    <Rows3 aria-hidden="true" />
                  </button>
                  <button type="button" aria-label="L'appel et les notes seulement" aria-pressed={vueNotes} onClick={() => poser("vue", "notes")}>
                    <AlignJustify aria-hidden="true" />
                  </button>
                </div>
                <MenuPt
                  libelle="Autres gestes"
                  bouton={(o, basculer, ref) => (
                    <button ref={ref} type="button" className="pt-ico" aria-label="Autres gestes" aria-haspopup="menu" aria-expanded={o} onClick={basculer}>
                      <MoreHorizontal aria-hidden="true" />
                    </button>
                  )}
                >
                  {(fermer) => (
                    <div className="pt-menu-groupe">
                      <OptionPt
                        icone={appel.clos ? <IconeAnneau /> : <IconeCoche />}
                        onClick={() => {
                          fermer();
                          clore(appel.id, !appel.clos);
                        }}
                      >
                        {appel.clos ? "Rouvrir l'appel" : "Marquer comme clos"}
                      </OptionPt>
                      <OptionPt
                        icone={<Trash2 />}
                        teinte="orange"
                        onClick={() => {
                          fermer();
                          supprimer(appel.id);
                        }}
                      >
                        Supprimer l&rsquo;appel
                      </OptionPt>
                    </div>
                  )}
                </MenuPt>
                <button type="button" className="pt-ico pt-tete-details" aria-label={details ? "Masquer les détails" : "Afficher les détails"} aria-pressed={details} onClick={() => setDetails((v) => !v)}>
                  <PanelRight aria-hidden="true" />
                </button>
              </div>
            </header>

            {/* le fil */}
            <div className="pt-centre">
              <div className="pt-defile">
                {(() => {
                  const rendu: React.ReactNode[] = [];
                  let jourCourant: number | null = null;
                  for (const e of elements) {
                    const j = jourDe(e.quand);
                    if (j !== jourCourant) {
                      jourCourant = j;
                      rendu.push(
                        <div key={`jour-${j}`} className="pt-element pt-jour-element">
                          <div className="pt-jour">{libelleJour(j, aujourdhui)}</div>
                        </div>,
                      );
                    }
                    if (e.genre === "appel")
                      rendu.push(
                        <article key={e.cle} className="pt-element" aria-label={`Appel avec ${appel.avec || "—"}`}>
                          <span className="pt-avatar-40" style={{ "--pt-avatar": couleur(appel) } as React.CSSProperties} aria-hidden="true">
                            {lettre(appel)}
                          </span>
                          <div className="pt-carte">
                            <div className="pt-carte-tete">
                              <span className="pt-carte-qui">
                                <b>{appel.avec || "—"}</b>
                                <span className="pt-carte-heure">{appel.date ? `appel du ${dateFr(appel.date)}` : relatif(appel.cree, maintenant)}</span>
                              </span>
                              <span className="pt-carte-menu">
                                <MenuPt
                                  libelle="Gestes sur l'appel"
                                  bouton={(o, basculer, ref) => (
                                    <button ref={ref} type="button" className="pt-ico pt-ico--24" aria-label="Gestes sur l'appel" aria-haspopup="menu" aria-expanded={o} onClick={basculer}>
                                      <MoreHorizontal aria-hidden="true" />
                                    </button>
                                  )}
                                >
                                  {(fermer) => (
                                    <div className="pt-menu-groupe">
                                      <OptionPt
                                        icone={<Trash2 />}
                                        teinte="orange"
                                        onClick={() => {
                                          fermer();
                                          supprimer(appel.id);
                                        }}
                                      >
                                        Supprimer l&rsquo;appel
                                      </OptionPt>
                                    </div>
                                  )}
                                </MenuPt>
                              </span>
                            </div>
                            <div className="pt-carte-corps" data-vide={appel.resume ? undefined : ""}>
                              {appel.resume ? appel.resume.split(/\n{2,}/).map((p, i) => <p key={i}>{p}</p>) : <p>Rien n&rsquo;a été noté sur ce qui a été dit.</p>}
                            </div>
                          </div>
                        </article>,
                      );
                    else if (e.genre === "note" && e.note)
                      rendu.push(
                        <article key={e.cle} className="pt-element" aria-label="Note">
                          <span aria-hidden="true" />
                          <div className="pt-carte pt-carte--note">
                            <div className="pt-carte-tete">
                              <StickyNote aria-hidden="true" />
                              <span className="pt-carte-qui">
                                <span>
                                  <b>Vous</b> avez ajouté une note
                                </span>
                                <time dateTime={e.note.cree}>{relatif(e.note.cree, maintenant)}</time>
                              </span>
                              <span className="pt-carte-menu">
                                <MenuPt
                                  libelle="Gestes sur la note"
                                  bouton={(o, basculer, ref) => (
                                    <button ref={ref} type="button" className="pt-ico pt-ico--24" aria-label="Gestes sur la note" aria-haspopup="menu" aria-expanded={o} onClick={basculer}>
                                      <MoreHorizontal aria-hidden="true" />
                                    </button>
                                  )}
                                >
                                  {(fermer) => (
                                    <div className="pt-menu-groupe">
                                      <OptionPt
                                        icone={<Trash2 />}
                                        teinte="orange"
                                        onClick={() => {
                                          fermer();
                                          supprimerNote(appel.id, e.note!.id);
                                        }}
                                      >
                                        Supprimer la note
                                      </OptionPt>
                                    </div>
                                  )}
                                </MenuPt>
                              </span>
                            </div>
                            <div className="pt-carte-corps">
                              {e.note.texte.split(/\n{2,}/).map((p, i) => (
                                <p key={i}>{p}</p>
                              ))}
                            </div>
                            <div className="pt-carte-pied">
                              <EyeOff aria-hidden="true" />
                              Visible sur cet appareil seulement
                            </div>
                          </div>
                        </article>,
                      );
                    else if (e.genre === "systeme")
                      rendu.push(
                        <div key={e.cle} className="pt-element" data-systeme="">
                          <span aria-hidden="true" />
                          <div className="pt-systeme">
                            <Phone aria-hidden="true" />
                            <div>{e.systeme}</div>
                          </div>
                        </div>,
                      );
                    else if (e.genre === "bandeau" && e.bandeau)
                      rendu.push(
                        <div key={e.cle} className="pt-element" data-systeme="">
                          <span aria-hidden="true" />
                          <div className="pt-bandeau" data-teinte={e.bandeau.teinte} role="status">
                            {e.bandeau.icone}
                            <div>{e.bandeau.texte}</div>
                          </div>
                        </div>,
                      );
                  }
                  return rendu;
                })()}
              </div>

              {/* le composeur : Ajouter une note (N) · Suivi · Plus… */}
              <div className="pt-composeur">
                {editeur ? (
                  <form
                    className="pt-editeur"
                    onSubmit={(e) => {
                      e.preventDefault();
                      ajouterNote(appel.id, zone.current?.value ?? "");
                    }}
                  >
                    <div className="pt-editeur-tete">
                      <StickyNote aria-hidden="true" />
                      <span>
                        <b>Vous</b> ajoutez une note sur l&rsquo;appel avec {appel.avec || "—"}
                      </span>
                    </div>
                    <textarea
                      ref={zone}
                      aria-label="Votre note"
                      placeholder="Ce qu'il faut retenir, ce qu'il reste à faire…"
                      rows={3}
                      onKeyDown={(e) => {
                        if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                          e.preventDefault();
                          ajouterNote(appel.id, e.currentTarget.value);
                        }
                        if (e.key === "Escape") {
                          e.stopPropagation();
                          setEditeur(false);
                        }
                      }}
                    />
                    <div className="pt-editeur-pied">
                      <button type="button" className="pt-btn" onClick={() => setEditeur(false)}>
                        Annuler
                        <kbd className="pt-kbd">⎋</kbd>
                      </button>
                      <button type="submit" className="pt-btn pt-btn--primaire">
                        Enregistrer la note
                        <kbd className="pt-kbd">↵</kbd>
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="pt-groupe">
                    <button type="button" className="pt-btn" onClick={() => setEditeur(true)}>
                      <span className="pt-btn-icone">
                        <StickyNote aria-hidden="true" />
                      </span>
                      Ajouter une note
                      <kbd className="pt-kbd">N</kbd>
                    </button>
                    <MenuPt
                      libelle="Suivi"
                      haut
                      bouton={(o, basculer, ref) => (
                        <button ref={ref} type="button" className="pt-btn" aria-haspopup="menu" aria-expanded={o} onClick={basculer}>
                          <span className="pt-btn-icone">
                            <CalendarDays aria-hidden="true" />
                          </span>
                          Suivi
                          {appel.suivi ? <small>{dateFr(appel.suivi, { day: "numeric", month: "short" })}</small> : null}
                        </button>
                      )}
                    >
                      {(fermer) => (
                        <>
                          <div className="pt-menu-groupe">
                            <p className="pt-menu-titre">Rappeler le</p>
                            <input
                              className="pt-champ"
                              type="date"
                              aria-label="Date du suivi"
                              defaultValue={appel.suivi ?? ""}
                              autoFocus
                              onChange={(e) => {
                                if (e.target.value) {
                                  poserSuivi(appel.id, e.target.value);
                                  fermer();
                                }
                              }}
                            />
                          </div>
                          <div className="pt-menu-groupe">
                            {[1, 7].map((j) => {
                              const d = new Date(aujourdhui + j * JOUR);
                              const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
                              return (
                                <OptionPt
                                  key={j}
                                  icone={<CalendarDays />}
                                  onClick={() => {
                                    fermer();
                                    poserSuivi(appel.id, iso);
                                  }}
                                >
                                  {j === 1 ? "Demain" : "Dans une semaine"}
                                </OptionPt>
                              );
                            })}
                            {appel.suivi ? (
                              <OptionPt
                                icone={<X />}
                                onClick={() => {
                                  fermer();
                                  poserSuivi(appel.id, null);
                                }}
                              >
                                Retirer le suivi
                              </OptionPt>
                            ) : null}
                          </div>
                        </>
                      )}
                    </MenuPt>
                    <MenuPt
                      libelle="Plus"
                      haut
                      bouton={(o, basculer, ref) => (
                        <button ref={ref} type="button" className="pt-btn" aria-haspopup="menu" aria-expanded={o} onClick={basculer}>
                          <MoreHorizontal aria-hidden="true" />
                          Plus
                        </button>
                      )}
                    >
                      {(fermer) => (
                        <div className="pt-menu-groupe">
                          <OptionPt
                            icone={appel.clos ? <IconeAnneau /> : <IconeCoche />}
                            onClick={() => {
                              fermer();
                              clore(appel.id, !appel.clos);
                            }}
                          >
                            {appel.clos ? "Rouvrir l'appel" : "Marquer comme clos"}
                          </OptionPt>
                          <OptionPt
                            icone={<Trash2 />}
                            teinte="orange"
                            onClick={() => {
                              fermer();
                              supprimer(appel.id);
                            }}
                          >
                            Supprimer l&rsquo;appel
                          </OptionPt>
                        </div>
                      )}
                    </MenuPt>
                  </div>
                )}
              </div>
            </div>

            {/* le panneau de droite */}
            <aside className="pt-details" aria-label="Détails de l'appel">
              <Section
                titre="Détails de l'appel"
                droite={
                  <button type="button" className="pt-ico pt-ico--28 pt-tete-details" aria-label="Masquer les détails" onClick={() => setDetails(false)}>
                    <PanelRight aria-hidden="true" />
                  </button>
                }
              >
                <h3 className="pt-det-titre">{appel.avec || "—"}</h3>
                <div className="pt-props">
                  <div className="pt-prop">
                    <span className="pt-prop-etiquette">Interlocuteur</span>
                    <span className="pt-prop-valeur">
                      <span className="pt-avatar-18" style={{ "--pt-avatar": couleur(appel) } as React.CSSProperties} aria-hidden="true">
                        {lettre(appel)}
                      </span>
                      <b>{appel.avec || "—"}</b>
                    </span>
                  </div>
                  <div className="pt-prop">
                    <span className="pt-prop-etiquette">État</span>
                    <span className="pt-prop-valeur">
                      <MenuPt
                        libelle="Changer l'état"
                        gauche
                        bouton={(o, basculer, ref) => (
                          <button ref={ref} type="button" className="pt-pastille" data-teinte={appel.clos ? undefined : enRetard(appel) ? "orange" : "bleu"} aria-haspopup="menu" aria-expanded={o} onClick={basculer}>
                            <span className="pt-pastille-icone">{appel.clos ? <IconeCoche /> : enRetard(appel) ? <IconeHorloge /> : <IconeAnneau />}</span>
                            {appel.clos ? "Clos" : enRetard(appel) ? "Suivi en retard" : (appel.notes ?? []).length || appel.suivi ? "En cours" : "Attend un suivi"}
                            <ChevronDown className="pt-pastille-chevron" aria-hidden="true" />
                          </button>
                        )}
                      >
                        {(fermer) => (
                          <div className="pt-menu-groupe">
                            <OptionPt
                              icone={<IconeAnneau />}
                              actif={!appel.clos}
                              onClick={() => {
                                fermer();
                                if (appel.clos) clore(appel.id, false);
                              }}
                            >
                              Ouvert
                            </OptionPt>
                            <OptionPt
                              icone={<IconeCoche />}
                              actif={!!appel.clos}
                              onClick={() => {
                                fermer();
                                if (!appel.clos) clore(appel.id, true);
                              }}
                            >
                              Clos
                            </OptionPt>
                          </div>
                        )}
                      </MenuPt>
                    </span>
                  </div>
                  <div className="pt-prop">
                    <span className="pt-prop-etiquette">Date de l&rsquo;appel</span>
                    <span className="pt-prop-valeur">
                      <span className="pt-pastille" data-vide={appel.date ? undefined : ""} style={{ cursor: "default" }}>
                        <CalendarDays aria-hidden="true" />
                        {appel.date ? dateFr(appel.date) : "Non renseignée"}
                      </span>
                    </span>
                  </div>
                  <div className="pt-prop">
                    <span className="pt-prop-etiquette">Suivi</span>
                    <span className="pt-prop-valeur">
                      <MenuPt
                        libelle="Suivi"
                        gauche
                        bouton={(o, basculer, ref) => (
                          <button
                            ref={ref}
                            type="button"
                            className="pt-pastille"
                            data-vide={appel.suivi ? undefined : ""}
                            data-teinte={enRetard(appel) ? "orange" : undefined}
                            aria-haspopup="menu"
                            aria-expanded={o}
                            onClick={basculer}
                          >
                            {enRetard(appel) ? <IconeHorloge /> : <CalendarDays aria-hidden="true" />}
                            {appel.suivi ? dateFr(appel.suivi) : "Non défini"}
                            <ChevronDown className="pt-pastille-chevron" aria-hidden="true" />
                          </button>
                        )}
                      >
                        {(fermer) => (
                          <div className="pt-menu-groupe">
                            <p className="pt-menu-titre">Rappeler le</p>
                            <input
                              className="pt-champ"
                              type="date"
                              aria-label="Date du suivi"
                              defaultValue={appel.suivi ?? ""}
                              autoFocus
                              onChange={(e) => {
                                if (e.target.value) {
                                  poserSuivi(appel.id, e.target.value);
                                  fermer();
                                }
                              }}
                            />
                            {appel.suivi ? (
                              <OptionPt
                                icone={<X />}
                                onClick={() => {
                                  fermer();
                                  poserSuivi(appel.id, null);
                                }}
                              >
                                Retirer le suivi
                              </OptionPt>
                            ) : null}
                          </div>
                        )}
                      </MenuPt>
                    </span>
                  </div>
                  <div className="pt-prop">
                    <span className="pt-prop-etiquette">Priorité</span>
                    <span className="pt-prop-valeur">
                      <MenuPt
                        libelle="Priorité"
                        gauche
                        bouton={(o, basculer, ref) => (
                          <button ref={ref} type="button" className="pt-pastille" aria-haspopup="menu" aria-expanded={o} onClick={basculer}>
                            <span className="pt-pastille-icone">
                              <IconePrioriteFil niveau={appel.priorite ?? 0} />
                            </span>
                            {PRIORITES[appel.priorite ?? 0]}
                            <ChevronDown className="pt-pastille-chevron" aria-hidden="true" />
                          </button>
                        )}
                      >
                        {(fermer) => (
                          <div className="pt-menu-groupe">
                            {([0, 1, 2, 3, 4] as Priorite[]).map((p) => (
                              <OptionPt
                                key={p}
                                icone={<IconePrioriteFil niveau={p} />}
                                actif={(appel.priorite ?? 0) === p}
                                onClick={() => {
                                  fermer();
                                  poserPriorite(appel.id, p);
                                }}
                              >
                                {PRIORITES[p]}
                              </OptionPt>
                            ))}
                          </div>
                        )}
                      </MenuPt>
                    </span>
                  </div>
                  <div className="pt-prop">
                    <span className="pt-prop-etiquette">Notes</span>
                    <span className="pt-prop-valeur">{(appel.notes ?? []).length ? pluriel((appel.notes ?? []).length, "note") : <span className="pt-prop-vide">Aucune</span>}</span>
                  </div>
                </div>
              </Section>
              <Section titre="Détails du contact">
                <div className="pt-contact">
                  <span className="pt-avatar-24" style={{ "--pt-avatar": couleur(appel) } as React.CSSProperties} aria-hidden="true">
                    {lettre(appel)}
                  </span>
                  <b>{appel.avec || "—"}</b>
                </div>
                <div className="pt-props">
                  <div className="pt-prop">
                    <span className="pt-prop-etiquette">Enregistré le</span>
                    <span className="pt-prop-valeur">
                      <time dateTime={appel.cree}>{dateFr(appel.cree)}</time>
                    </span>
                  </div>
                  <div className="pt-prop">
                    <span className="pt-prop-etiquette">Modifié le</span>
                    <span className="pt-prop-valeur">
                      <time dateTime={appel.modifie ?? appel.cree}>{relatif(appel.modifie ?? appel.cree, maintenant)}</time>
                    </span>
                  </div>
                  <div className="pt-prop">
                    <span className="pt-prop-etiquette">Appels</span>
                    <span className="pt-prop-valeur">{pluriel((appels ?? []).filter((a) => sansAccents(a.avec ?? "") === sansAccents(appel.avec ?? "")).length, "appel")}</span>
                  </div>
                </div>
              </Section>
              <Section titre="Sur cet appareil">
                <div className="pt-section-vide">
                  <span className="pt-section-ico">
                    <EyeOff aria-hidden="true" />
                  </span>
                  <strong>Gardé sur cet appareil</strong>
                  <span>Vos collègues ne voient pas encore cet appel ni ses notes.</span>
                </div>
              </Section>
            </aside>
          </>
        )}
      </div>
    </div>
  );
}
