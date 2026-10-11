"use client";

/* ══════════════════════════════════════════════════════════════════════
   Tâches — le plan sur 90 jours (10/10/2026)

   D'après la maquette envoyée par Teo (faite avec ChatGPT) : « le même
   contenu, sur ce design, en mieux fini ». Repris : l'avancement en trois
   phases, les filtres par statut avec leurs compteurs, la liste par
   semaine (les terminées repliées), la fiche à droite. Écarts assumés :
   les couleurs et boutons sont ceux du tableau de bord (jetons --v2-*,
   bouton principal plein neutre, ligne choisie grisée) et non les bleus
   de la maquette ; pas de « Ajouter une pièce » ni « Ouvrir la tâche » —
   rien ne les porte en base, un bouton sans effet serait un faux bouton.

   Les données sont celles de omega_lignes (tableaux « plan » et
   « ajouts ») ; tout se modifie sur place et s'enregistre aussitôt.
   « À préparer » et « Note » sont deux clés de plus dans `donnees`.
   ══════════════════════════════════════════════════════════════════════ */

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CalendarDays, Check, ChevronDown, ChevronRight, Columns3, List, ListFilter, Plus, Rows3, Search, Tag, Trash2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Choix from "./Choix";
import type { Ligne } from "./Tableaux";

const I = { width: 16, height: 16, strokeWidth: 1.6, "aria-hidden": true } as const;
const STATUTS = ["À faire", "En cours", "Bloqué", "Fait"];
const CATEGORIES = ["Fondations", "Prospection", "Contenu", "Audits", "Clients", "Pilotage", "Pub"];
const MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const MOIS_LONGS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const teinte = (s?: string) => (s === "Fait" ? "vert" : s === "En cours" ? "bleu" : s === "Bloqué" ? "rouge" : "gris");

/* ——— le calendrier du plan : S0 = du 9 au 11 octobre, puis des semaines lundi → dimanche ——— */
const debut = (n: number) => (n === 0 ? new Date(2026, 9, 9) : new Date(2026, 9, 12 + 7 * (n - 1)));
const fin = (n: number) => (n === 0 ? new Date(2026, 9, 11) : new Date(2026, 9, 18 + 7 * (n - 1)));
const BLOCS: [number, number][] = [[0, 0], [1, 1], [2, 2], [3, 3], [4, 4], [5, 6], [7, 8], [9, 10], [11, 13]];
const PHASES = [
  { num: "01", nom: "Fondations", sous: "5 clients pilotes · Mois 1", de: 0, a: 4 },
  { num: "02", nom: "Déploiement", sous: "12 clients · Mois 2", de: 5, a: 8 },
  { num: "03", nom: "Accélération", sous: "20 clients · Mois 3", de: 9, a: 13 },
];

const premiereSemaine = (s?: string) => Number(s?.match(/S(\d+)/)?.[1] ?? 99);
const blocDe = (s?: string) => {
  const n = premiereSemaine(s);
  const i = BLOCS.findIndex(([a, b]) => n >= a && n <= b);
  return i === -1 ? BLOCS.length - 1 : i;
};
const libelleBloc = ([a, b]: [number, number]) => (a === b ? `Semaine ${a}` : b === a + 1 ? `Semaines ${a} et ${b}` : `Semaines ${a} à ${b}`);
const datesBloc = ([a, b]: [number, number]) => {
  const d = debut(a);
  const f = fin(b);
  return d.getMonth() === f.getMonth() ? `${d.getDate()} — ${f.getDate()} ${MOIS[f.getMonth()]}` : `${d.getDate()} ${MOIS[d.getMonth()]} — ${f.getDate()} ${MOIS[f.getMonth()]}`;
};
function echeance(t?: string): Date | null {
  const m = t?.match(/(\d{1,2})\/(\d{1,2})/);
  if (!m) return null;
  const mois = Number(m[2]);
  return new Date(mois >= 10 ? 2026 : 2027, mois - 1, Number(m[1]), 23, 59);
}
const dateCourte = (t?: string) => {
  const d = echeance(t);
  return d ? `${d.getDate()} ${MOIS[d.getMonth()]}` : "—";
};
const dateLongue = (t?: string) => {
  const d = echeance(t);
  return d ? `${d.getDate()} ${MOIS_LONGS[d.getMonth()]}` : "";
};

/* « Préparer 3 captures réelles (brief, relance, réponse) » → titre + précision */
function decouper(t = ""): { titre: string; sous: string } {
  const p = t.match(/^(.+?)\s*\((.+)\)\s*$/);
  if (p) return { titre: p[1], sous: p[2].charAt(0).toUpperCase() + p[2].slice(1) };
  const d = t.match(/^(.+?)\s+:\s+(.+)$/);
  if (d && d[1].length <= 48) return { titre: d[1], sous: d[2].charAt(0).toUpperCase() + d[2].slice(1) };
  return { titre: t, sous: "" };
}
const numero = (n?: string) => (n && /^\d+$/.test(n) ? n.padStart(2, "0") : n ?? "");

type Filtre = "toutes" | "a_faire" | "bloquees" | "terminees";
const ouverte = (l: Ligne) => l.donnees["Statut"] !== "Fait";

export default function PlanTaches({ lignes: initiales, selecteur }: { lignes: Ligne[]; selecteur: React.ReactNode }) {
  const [lignes, setLignes] = useState(() => initiales.filter((l) => l.tableau === "plan" || l.tableau === "ajouts"));
  const [maintenant] = useState(() => Date.now());
  const [filtre, setFiltre] = useState<Filtre>("toutes");
  const [categorie, setCategorie] = useState("");
  const [recherche, setRecherche] = useState("");
  const [vue, setVue] = useState<"liste" | "colonnes">("liste");
  const [choix, setChoix] = useState<string | null>(null);
  const [ficheOuverte, setFicheOuverte] = useState(false);
  const [replies, setReplies] = useState<number[]>([]);
  const [faitesOuvertes, setFaitesOuvertes] = useState<number[]>([]);
  const [tout, setTout] = useState(false);
  const [etat, setEtat] = useState("");

  async function maj(id: string, cle: string, valeur: string) {
    const avant = lignes.find((l) => l.id === id);
    if (!avant || (avant.donnees[cle] ?? "") === valeur) return;
    const donnees = { ...avant.donnees, [cle]: valeur };
    const quand = new Date().toISOString();
    setLignes((ls) => ls.map((l) => (l.id === id ? { ...l, donnees, maj: quand } : l)));
    const { error } = await createClient().from("omega_lignes").update({ donnees, maj: quand }).eq("id", id);
    setEtat(error ? "Échec de l'enregistrement : vérifiez votre connexion." : "");
  }

  const blocCourant = Math.max(0, BLOCS.findIndex(([a, b]) => maintenant >= debut(a).getTime() && maintenant <= fin(b).getTime() + 86_399_999));

  async function ajouter() {
    const ajouts = lignes.filter((l) => l.tableau === "ajouts");
    const ordre = Math.max(0, ...ajouts.map((l) => l.ordre)) + 1;
    const n = Math.max(0, ...ajouts.map((l) => Number(l.donnees["N°"]?.replace(/\D/g, "")) || 0)) + 1;
    const [a] = BLOCS[blocCourant];
    const donnees = { "N°": `A${n}`, Tâche: "", Statut: "À faire", Catégorie: "Pilotage", Semaine: `S${a}`, Échéance: "" };
    const { data, error } = await createClient().from("omega_lignes").insert({ tableau: "ajouts", ordre, donnees }).select("id, tableau, ordre, donnees, maj").single();
    if (error || !data) return setEtat("Échec de l'ajout : vérifiez votre connexion.");
    setLignes((ls) => [...ls, data as Ligne]);
    setFiltre("toutes");
    setChoix((data as Ligne).id);
    setFicheOuverte(true);
  }

  async function supprimer(l: Ligne) {
    if (!window.confirm(`Supprimer la tâche « ${l.donnees["Tâche"] || "sans titre"} » ?`)) return;
    const { error } = await createClient().from("omega_lignes").delete().eq("id", l.id);
    if (error) return setEtat("Échec de la suppression.");
    setLignes((ls) => ls.filter((x) => x.id !== l.id));
    setChoix(null);
    setFicheOuverte(false);
  }

  /* « Nouveau… → Tâche » de la barre du haut arrive en /omega/taches?ajouter=plan */
  const params = useSearchParams();
  const demande = params.get("ajouter");
  useEffect(() => {
    if (demande !== "plan" && demande !== "ajouts") return;
    window.history.replaceState(null, "", window.location.pathname);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- l'ajout vient d'un lien externe à l'écran, une seule fois
    void ajouter();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- une seule fois par demande
  }, [demande]);

  const compte = {
    toutes: lignes.length,
    a_faire: lignes.filter((l) => !["Fait", "Bloqué"].includes(l.donnees["Statut"])).length,
    bloquees: lignes.filter((l) => l.donnees["Statut"] === "Bloqué").length,
    terminees: lignes.filter((l) => l.donnees["Statut"] === "Fait").length,
  };

  const visibles = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    return lignes
      .filter((l) => (filtre === "a_faire" ? !["Fait", "Bloqué"].includes(l.donnees["Statut"]) : filtre === "bloquees" ? l.donnees["Statut"] === "Bloqué" : filtre === "terminees" ? l.donnees["Statut"] === "Fait" : true))
      .filter((l) => !categorie || l.donnees["Catégorie"] === categorie)
      .filter((l) => !q || `${l.donnees["Tâche"] ?? ""} ${l.donnees["N°"] ?? ""}`.toLowerCase().includes(q))
      .sort((a, b) => (echeance(a.donnees["Échéance"])?.getTime() ?? 9e15) - (echeance(b.donnees["Échéance"])?.getTime() ?? 9e15) || (a.tableau === b.tableau ? a.ordre - b.ordre : a.tableau === "plan" ? -1 : 1));
  }, [lignes, filtre, categorie, recherche]);

  const filtrage = filtre !== "toutes" || !!categorie || !!recherche.trim();
  const blocs = BLOCS.map((b, i) => ({ i, b, liste: visibles.filter((l) => blocDe(l.donnees["Semaine"]) === i) })).filter((x) => x.liste.length);
  const blocsAffiches = tout || filtrage ? blocs : blocs.filter((x) => x.i <= blocCourant + 1);
  const restants = blocs.length - blocsAffiches.length;
  const choisie = lignes.find((l) => l.id === choix) ?? visibles.find(ouverte) ?? null;
  const ouvrir = (id: string) => {
    setChoix(id);
    setFicheOuverte(true);
  };

  const faites = compte.terminees;
  const total = lignes.length;
  const phaseActive = PHASES.findIndex((p) => blocCourant >= blocDe(`S${p.de}`) && blocCourant <= blocDe(`S${p.a}`));

  return (
    <div className="v2-page v2-arrivee om-page om-page--large om-pt">
      <div className="v2-tete om-pt-tete">
        <div>
          <h1>Tâches</h1>
          <p>Les bonnes actions, dans le bon ordre.</p>
        </div>
        <div className="v2-actions">
          {selecteur}
          <button type="button" className="v2-btn v2-btn--petit v2-btn--primaire om-pt-nouvelle" onClick={ajouter}>
            <Plus {...I} />
            Nouvelle tâche
          </button>
        </div>
      </div>

      {/* ——— l'avancement : trois phases sur 90 jours ——— */}
      <section className="v2-carte om-pt-avancement" aria-label="Avancement du plan">
        <div className="om-pt-avancement-tete">
          <h2>Du 9 octobre au 10 janvier</h2>
          <p>
            <strong>{faites}</strong> / <strong>{total}</strong> tâches terminées
          </p>
        </div>
        <div className="om-pt-phases" style={{ "--om-pt-avance": `${total ? (faites / total) * 100 : 0}%` } as React.CSSProperties}>
          <span className="om-pt-rail" aria-hidden="true">
            <span />
          </span>
          <ol>
            {PHASES.map((p, i) => (
              <li key={p.num} data-etat={i < phaseActive ? "passee" : i === phaseActive ? "active" : "a-venir"} aria-current={i === phaseActive ? "step" : undefined}>
                <span className="om-pt-jalon" aria-hidden="true" />
                <span className="om-pt-phase-nom">
                  <b>{p.num}</b> {p.nom}
                </span>
                <span className="om-pt-phase-sous">{p.sous}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ——— la barre : statuts, recherche, catégorie, affichage ——— */}
      <div className="om-pt-barre">
        <div className="om-pt-segments" role="group" aria-label="Filtrer par statut">
          {(
            [
              ["toutes", "Toutes", ""],
              ["a_faire", "À faire", "gris"],
              ["bloquees", "Bloquées", "rouge"],
              ["terminees", "Terminées", "vert"],
            ] as [Filtre, string, string][]
          ).map(([cle, libelle, t]) => (
            <button key={cle} type="button" className="om-pt-segment" aria-pressed={filtre === cle} onClick={() => setFiltre(cle)}>
              {t ? <span className="om-pt-point" data-teinte={t} aria-hidden="true" /> : null}
              {libelle}
              <span className="om-pt-compte">{compte[cle]}</span>
            </button>
          ))}
        </div>
        <div className="om-pt-outils">
          <label className="om-pt-recherche">
            <Search {...I} />
            <input value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Rechercher une tâche" aria-label="Rechercher une tâche" />
            {recherche ? (
              <button type="button" aria-label="Effacer la recherche" onClick={() => setRecherche("")}>
                <X width={14} height={14} aria-hidden="true" />
              </button>
            ) : null}
          </label>
          <Choix forme="bouton" etiquette="Catégorie" icone={<ListFilter {...I} />} valeur={categorie} onChange={setCategorie} vide="Filtres" options={CATEGORIES.filter((c) => lignes.some((l) => l.donnees["Catégorie"] === c))} actif={!!categorie} />
          <div className="om-pt-affichage" role="group" aria-label="Affichage">
            <button type="button" aria-pressed={vue === "liste"} aria-label="En liste" onClick={() => setVue("liste")}>
              <List {...I} />
            </button>
            <button type="button" aria-pressed={vue === "colonnes"} aria-label="En colonnes par statut" onClick={() => setVue("colonnes")}>
              <Columns3 {...I} />
            </button>
          </div>
        </div>
      </div>
      <p className="om-etat" role="status">
        {etat}
      </p>

      <div className="om-pt-grille" data-colonnes={vue === "colonnes" ? "" : undefined}>
        <div className="om-pt-principal">
          {vue === "colonnes" ? (
            <div className="om-pt-tableau">
              {STATUTS.map((s) => {
                const liste = visibles.filter((l) => (l.donnees["Statut"] ?? "À faire") === s);
                return (
                  <section key={s} className="v2-carte om-pt-colonne" aria-label={s}>
                    <h2>
                      <span className="om-pt-point" data-teinte={teinte(s)} aria-hidden="true" />
                      {s}
                      <span className="om-pt-compte">{liste.length}</span>
                    </h2>
                    <ul>
                      {liste.map((l) => {
                        const { titre } = decouper(l.donnees["Tâche"]);
                        return (
                          <li key={l.id}>
                            <button type="button" className="om-pt-tuile" aria-current={choisie?.id === l.id ? "true" : undefined} onClick={() => ouvrir(l.id)}>
                              <span className="om-pt-tuile-titre">{titre || "Nouvelle tâche"}</span>
                              <span className="om-pt-tuile-sous">
                                {l.donnees["Catégorie"]} · {dateCourte(l.donnees["Échéance"])}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                );
              })}
            </div>
          ) : blocsAffiches.length === 0 ? (
            <div className="v2-carte om-pt-vide">Aucune tâche ne correspond à ces filtres.</div>
          ) : (
            <>
              {blocsAffiches.map(({ i, b, liste }) => {
                const replie = replies.includes(i);
                const ouvertes = filtre === "terminees" ? liste : liste.filter(ouverte);
                const terminees = filtre === "terminees" ? [] : liste.filter((l) => !ouverte(l));
                const montrerFaites = faitesOuvertes.includes(i);
                const dominante = Object.entries(liste.reduce<Record<string, number>>((acc, l) => ({ ...acc, [l.donnees["Catégorie"]]: (acc[l.donnees["Catégorie"]] ?? 0) + 1 }), {})).sort((x, y) => y[1] - x[1])[0]?.[0];
                return (
                  <section key={i} className="v2-carte om-pt-semaine" aria-label={libelleBloc(b)}>
                    <button type="button" className="om-pt-semaine-tete" aria-expanded={!replie} onClick={() => setReplies((r) => (replie ? r.filter((x) => x !== i) : [...r, i]))}>
                      <ChevronDown {...I} className="om-pt-chevron" />
                      <span className="om-pt-semaine-nom">{libelleBloc(b)}</span>
                      {dominante ? <span className="om-pt-semaine-theme">{dominante}</span> : null}
                      {i === blocCourant ? <span className="om-pt-maintenant">Cette semaine</span> : null}
                      <span className="om-pt-semaine-dates">{datesBloc(b)}</span>
                    </button>
                    {replie ? null : (
                      <ul className="om-pt-liste">
                        {[...ouvertes, ...(montrerFaites ? terminees : [])].map((l) => (
                          <LigneTache key={l.id} l={l} choisie={choisie?.id === l.id} maintenant={maintenant} ouvrir={() => ouvrir(l.id)} cocher={(fait) => maj(l.id, "Statut", fait ? "Fait" : "À faire")} />
                        ))}
                        {terminees.length ? (
                          <li className="om-pt-terminees">
                            <button type="button" aria-expanded={montrerFaites} onClick={() => setFaitesOuvertes((f) => (montrerFaites ? f.filter((x) => x !== i) : [...f, i]))}>
                              <span className="om-pt-case-pleine" aria-hidden="true">
                                <Check width={12} height={12} strokeWidth={2.5} />
                              </span>
                              {montrerFaites ? "Masquer" : ""} {terminees.length} tâche{terminees.length > 1 ? "s" : ""} terminée{terminees.length > 1 ? "s" : ""}
                              <ChevronDown {...I} className="om-pt-chevron" />
                            </button>
                          </li>
                        ) : null}
                      </ul>
                    )}
                  </section>
                );
              })}
              <div className="om-pt-pied">
                <button type="button" className="v2-btn v2-btn--petit v2-btn--fantome" onClick={ajouter}>
                  <Plus {...I} />
                  Ajouter une tâche
                </button>
                {restants > 0 || (tout && !filtrage && blocs.length > blocCourant + 2) ? (
                  <button type="button" className="v2-btn v2-btn--petit v2-btn--fantome om-pt-suivantes" aria-expanded={tout} onClick={() => setTout((t) => !t)}>
                    {tout ? "Masquer les semaines suivantes" : `Afficher les semaines suivantes (${restants})`}
                    <ChevronDown {...I} className="om-pt-chevron" />
                  </button>
                ) : null}
              </div>
            </>
          )}
        </div>

        <aside className="om-pt-fiche-zone" data-ouverte={ficheOuverte ? "" : undefined} aria-label="La tâche choisie">
          <button type="button" className="om-pt-voile" aria-label="Fermer la tâche" onClick={() => setFicheOuverte(false)} />
          {choisie ? (
            <Fiche key={choisie.id} l={choisie} maj={maj} supprimer={supprimer} fermer={() => { setFicheOuverte(false); setChoix(null); }} />
          ) : (
            <div className="v2-carte om-pt-fiche om-pt-fiche--vide">Choisis une tâche pour la voir en détail.</div>
          )}
        </aside>
      </div>
    </div>
  );
}

function LigneTache({ l, choisie, maintenant, ouvrir, cocher }: { l: Ligne; choisie: boolean; maintenant: number; ouvrir: () => void; cocher: (fait: boolean) => void }) {
  const { titre, sous } = decouper(l.donnees["Tâche"]);
  const statut = l.donnees["Statut"] ?? "À faire";
  const e = echeance(l.donnees["Échéance"]);
  const retard = statut !== "Fait" && e !== null && e.getTime() < maintenant;
  return (
    <li className="om-pt-ligne" aria-current={choisie ? "true" : undefined} data-fait={statut === "Fait" ? "" : undefined}>
      <span className="v2-val-case om-pt-case">
        <input type="checkbox" checked={statut === "Fait"} aria-label={`${statut === "Fait" ? "Rouvrir" : "Marquer faite"} : ${titre}`} onChange={(ev) => cocher(ev.target.checked)} />
      </span>
      <button type="button" className="om-pt-corps" onClick={ouvrir}>
        <span className="om-pt-texte">
          <span className="om-pt-titre">{titre || "Nouvelle tâche"}</span>
          {sous ? <span className="om-pt-sous">{sous}</span> : null}
          <span className="om-pt-sous om-pt-sous--etroit">
            {l.donnees["Catégorie"]} · {dateCourte(l.donnees["Échéance"])}
          </span>
        </span>
        <span className="om-pt-etiquette">{l.donnees["Catégorie"]}</span>
        <span className="om-pt-date" data-retard={retard ? "" : undefined}>
          {dateCourte(l.donnees["Échéance"])}
        </span>
        <span className="om-pt-statut">
          <span className="om-pt-point" data-teinte={teinte(statut)} aria-hidden="true" />
          {statut}
        </span>
        <ChevronRight {...I} className="om-pt-fleche" />
      </button>
    </li>
  );
}

/* ——— la fiche : tout se modifie ici ——— */
function Fiche({ l, maj, supprimer, fermer }: { l: Ligne; maj: (id: string, cle: string, v: string) => Promise<void>; supprimer: (l: Ligne) => void; fermer: () => void }) {
  const [titre, setTitre] = useState(l.donnees["Tâche"] ?? "");
  const [ech, setEch] = useState(l.donnees["Échéance"] ?? "");
  const [note, setNote] = useState(l.donnees["Note"] ?? "");
  const [nouvel, setNouvel] = useState("");
  const zone = useRef<HTMLTextAreaElement>(null);
  const idEch = useId();
  const statut = l.donnees["Statut"] ?? "À faire";
  const items = (l.donnees["À préparer"] ?? "")
    .split("\n")
    .filter((x) => x.trim())
    .map((x) => ({ fait: x.startsWith("[x] "), texte: x.replace(/^\[[ x]\] /, "") }));
  const ecrireItems = (liste: { fait: boolean; texte: string }[]) => maj(l.id, "À préparer", liste.map((x) => `${x.fait ? "[x]" : "[ ]"} ${x.texte}`).join("\n"));
  const ajuster = (el: HTMLTextAreaElement | null) => {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };
  const semaines = ["S0", "S1", "S2", "S3", "S4", "S5-6", "S7-8", "S9-10", "S11-13"];
  const blur = (e: React.KeyboardEvent<HTMLElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      (e.target as HTMLElement).blur();
    }
  };

  return (
    <div className="v2-carte om-pt-fiche">
      <div className="om-pt-fiche-haut">
        <span className="om-pt-fiche-num">Tâche {numero(l.donnees["N°"])}</span>
        <button type="button" className="v2-btn v2-btn--petit v2-btn--icone v2-btn--fantome" aria-label="Fermer la fiche" onClick={fermer}>
          <X {...I} />
        </button>
      </div>
      <textarea
        ref={(el) => {
          zone.current = el;
          ajuster(el);
        }}
        className="om-pt-fiche-titre"
        value={titre}
        rows={1}
        placeholder="Nom de la tâche"
        aria-label="Nom de la tâche"
        autoFocus={!titre}
        onChange={(e) => {
          setTitre(e.target.value);
          ajuster(e.target);
        }}
        onBlur={() => maj(l.id, "Tâche", titre.trim())}
        onKeyDown={blur}
      />
      <Choix forme="pastille" etiquette="Statut" teinte={teinte(statut)} valeur={statut} onChange={(v) => maj(l.id, "Statut", v)} options={STATUTS} classe="om-pt-fiche-statut" />

      <dl className="om-pt-infos">
        <div>
          <dt>
            <CalendarDays {...I} /> Échéance
          </dt>
          <dd>
            <input id={idEch} className="om-pt-champ" value={ech} placeholder="jj/mm" aria-label="Échéance (jj/mm)" onChange={(e) => setEch(e.target.value)} onBlur={() => maj(l.id, "Échéance", ech.trim())} onKeyDown={blur} />
            {dateLongue(ech) ? (
              <label htmlFor={idEch} className="om-pt-champ-aide">
                {dateLongue(ech)}
              </label>
            ) : null}
          </dd>
        </div>
        <div>
          <dt>
            <Tag {...I} /> Catégorie
          </dt>
          <dd>
            <Choix forme="fiche" etiquette="Catégorie" valeur={l.donnees["Catégorie"] ?? ""} onChange={(v) => maj(l.id, "Catégorie", v)} options={CATEGORIES} classe="om-pt-choix" />
          </dd>
        </div>
        <div>
          <dt>
            <Rows3 {...I} /> Semaine
          </dt>
          <dd>
            <Choix forme="fiche" etiquette="Semaine" valeur={l.donnees["Semaine"] ?? ""} onChange={(v) => maj(l.id, "Semaine", v)} options={Array.from(new Set([...semaines, l.donnees["Semaine"]].filter(Boolean)))} classe="om-pt-choix" />
          </dd>
        </div>
      </dl>

      <div className="om-pt-fiche-bloc">
        <h3>À préparer</h3>
        {items.length ? (
          <ul className="om-pt-prep">
            {items.map((x, i) => (
              <li key={i}>
                <label className="v2-val-case om-pt-case">
                  <input type="checkbox" checked={x.fait} onChange={() => ecrireItems(items.map((y, j) => (j === i ? { ...y, fait: !y.fait } : y)))} />
                </label>
                <span data-fait={x.fait ? "" : undefined}>{x.texte}</span>
                <button type="button" className="om-pt-retirer" aria-label={`Retirer : ${x.texte}`} onClick={() => ecrireItems(items.filter((_, j) => j !== i))}>
                  <X width={14} height={14} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <label className="om-pt-ajout">
          <Plus width={14} height={14} aria-hidden="true" />
          <input
            value={nouvel}
            placeholder="Ajouter un élément"
            aria-label="Ajouter un élément à préparer"
            onChange={(e) => setNouvel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && nouvel.trim()) {
                e.preventDefault();
                void ecrireItems([...items, { fait: false, texte: nouvel.trim() }]);
                setNouvel("");
              }
            }}
          />
        </label>
      </div>

      <div className="om-pt-fiche-bloc">
        <h3>Note</h3>
        <textarea
          ref={ajuster}
          className="om-pt-note-champ"
          value={note}
          rows={2}
          placeholder="Une précision, un nom, un lien…"
          aria-label="Note"
          onChange={(e) => {
            setNote(e.target.value);
            ajuster(e.target);
          }}
          onBlur={() => maj(l.id, "Note", note.trim())}
        />
      </div>

      <div className="om-pt-fiche-pied">
        <button type="button" className="v2-btn v2-btn--petit v2-btn--fantome om-pt-supprimer" onClick={() => supprimer(l)}>
          <Trash2 {...I} />
          Supprimer
        </button>
        {statut === "Fait" ? (
          <button type="button" className="v2-btn v2-btn--petit" onClick={() => maj(l.id, "Statut", "À faire")}>
            Rouvrir
          </button>
        ) : (
          <button type="button" className="v2-btn v2-btn--petit v2-btn--primaire" onClick={() => maj(l.id, "Statut", "Fait")}>
            <Check {...I} />
            Marquer faite
          </button>
        )}
      </div>
    </div>
  );
}
