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
   13/10/2026 (2) — encore plus épurée, retour de Teo (« pas assez épuré,
   regarde Attio ») : la page Notes / Attio telle quelle — onglets, barre
   fine, puis la liste posée à plat sur la page, sans cadre ; en-têtes de
   groupe discrets, lignes séparées d'un filet pleine largeur, catégorie
   en pastille, un seul bouton bleu. Styles tk- dans taches.css.
   13/10/2026 — refaite à la manière d'Attio / Vercel, retour de Teo
   (« trop long, les sections paraissent amateur, regarde comment font
   Vercel et Attio ») : une seule barre (statut | recherche, vue,
   « Nouvelle tâche »), puis UNE liste dans un cadre fin qui tient dans
   l'écran, groupée par échéance comme la vue Tâches d'Attio (En retard
   en rouge, Aujourd'hui, Cette semaine en orange, Plus tard et Terminées
   repliés) ; une ligne de 40 px par tâche (case ronde, titre, catégorie,
   date). Plus de semaines en cartes ni de frise ; la fiche s'ouvre au
   clic, en tiroir. Styles dans taches.css (préfixe tp-).
   11/10/2026 (2) — allégée sur les principes de la page Notes, même
   dessin : une ligne par tâche (titre, date, statut seulement s'il n'est
   pas « À faire »), plus d'étiquette de catégorie ni de sous-ligne, plus
   de thème à côté de la semaine, plus de bouton « Filtres » ; la fiche
   n'apparaît à droite qu'au clic sur une tâche (sinon la liste prend
   toute la largeur).
   11/10/2026 — allégée à la demande de Teo, même dessin : plus de
   sous-titre ni de frise des trois phases au-dessus de la liste.
   ══════════════════════════════════════════════════════════════════════ */

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CalendarDays, Check, ChevronDown, Plus, Rows3, Search, Tag, Trash2, X } from "lucide-react";
import { Dialog, Modal, ModalOverlay } from "react-aria-components";
import "@/components/espace2/notes.css";
import "./taches.css";
import { createClient } from "@/lib/supabase/client";
import Choix from "./Choix";
import type { Ligne } from "./Tableaux";

const I = { width: 16, height: 16, strokeWidth: 1.6, "aria-hidden": true } as const;
const STATUTS = ["À faire", "En cours", "Bloqué", "Fait"];
const CATEGORIES = ["Fondations", "Prospection", "Contenu", "Audits", "Clients", "Pilotage", "Pub"];
const MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const MOIS_LONGS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
/* que du noir/blanc et du bleu (Teo, 10/10) : la forme du point dit le statut — vide = à faire, bleu = en cours, plein = bloqué, gris = fait */
const teinte = (s?: string) => (s === "Fait" ? "gris" : s === "En cours" ? "bleu" : s === "Bloqué" ? "fort" : "vide");

/* ——— le calendrier du plan : S0 = du 9 au 11 octobre, puis des semaines lundi → dimanche ——— */
const debut = (n: number) => (n === 0 ? new Date(2026, 9, 9) : new Date(2026, 9, 12 + 7 * (n - 1)));
const fin = (n: number) => (n === 0 ? new Date(2026, 9, 11) : new Date(2026, 9, 18 + 7 * (n - 1)));
const BLOCS: [number, number][] = [[0, 0], [1, 1], [2, 2], [3, 3], [4, 4], [5, 6], [7, 8], [9, 10], [11, 13]];

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

/* les groupes d'échéance, comme la vue Tâches d'Attio groupée par date */
type Groupe = "retard" | "aujourdhui" | "semaine" | "plus_tard" | "sans" | "terminees";
const GROUPES: { cle: Groupe; libelle: string }[] = [
  { cle: "retard", libelle: "En retard" },
  { cle: "aujourdhui", libelle: "Aujourd'hui" },
  { cle: "semaine", libelle: "Cette semaine" },
  { cle: "plus_tard", libelle: "Plus tard" },
  { cle: "sans", libelle: "Sans échéance" },
  { cle: "terminees", libelle: "Terminées" },
];

export default function PlanTaches({ lignes: initiales, selecteur }: { lignes: Ligne[]; selecteur: React.ReactNode }) {
  const [lignes, setLignes] = useState(() => initiales.filter((l) => l.tableau === "plan" || l.tableau === "ajouts"));
  const [maintenant] = useState(() => Date.now());
  const [filtre, setFiltre] = useState<Filtre>("a_faire");
  const [recherche, setRecherche] = useState("");
  const [choix, setChoix] = useState<string | null>(null);
  /* « Plus tard » et « Terminées » repliés au départ : la liste tient dans l'écran */
  const [replies, setReplies] = useState<Groupe[]>(["plus_tard", "terminees"]);
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
    setChoix((data as Ligne).id);
  }

  async function supprimer(l: Ligne) {
    if (!window.confirm(`Supprimer la tâche « ${l.donnees["Tâche"] || "sans titre"} » ?`)) return;
    const { error } = await createClient().from("omega_lignes").delete().eq("id", l.id);
    if (error) return setEtat("Échec de la suppression.");
    setLignes((ls) => ls.filter((x) => x.id !== l.id));
    setChoix(null);
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
    a_faire: lignes.filter((l) => !["Fait", "Bloqué"].includes(l.donnees["Statut"])).length,
    bloquees: lignes.filter((l) => l.donnees["Statut"] === "Bloqué").length,
    terminees: lignes.filter((l) => l.donnees["Statut"] === "Fait").length,
    toutes: lignes.length,
  };

  const jour0 = new Date(maintenant);
  jour0.setHours(0, 0, 0, 0);
  const groupeDe = (l: Ligne): Groupe => {
    if (l.donnees["Statut"] === "Fait") return "terminees";
    const e = echeance(l.donnees["Échéance"])?.getTime();
    if (e === undefined) return "sans";
    if (e < jour0.getTime()) return "retard";
    if (e < jour0.getTime() + 86_400_000) return "aujourdhui";
    if (e < jour0.getTime() + 7 * 86_400_000) return "semaine";
    return "plus_tard";
  };

  const visibles = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    return lignes
      .filter((l) => (filtre === "a_faire" ? !["Fait", "Bloqué"].includes(l.donnees["Statut"]) : filtre === "bloquees" ? l.donnees["Statut"] === "Bloqué" : filtre === "terminees" ? l.donnees["Statut"] === "Fait" : true))
      .filter((l) => !q || `${l.donnees["Tâche"] ?? ""} ${l.donnees["N°"] ?? ""}`.toLowerCase().includes(q))
      .sort((a, b) => (echeance(a.donnees["Échéance"])?.getTime() ?? 9e15) - (echeance(b.donnees["Échéance"])?.getTime() ?? 9e15) || (a.tableau === b.tableau ? a.ordre - b.ordre : a.tableau === "plan" ? -1 : 1));
  }, [lignes, filtre, recherche]);

  const choisie = choix ? lignes.find((l) => l.id === choix) ?? null : null;
  const cherche = !!recherche.trim();

  return (
    <div className="no-page om-pt tk-page v2-arrivee">
      <h1 className="v2-sr">Tâches</h1>

      {/* les onglets, comme Notes · Modèles */}
      <div className="no-onglets" role="tablist" aria-label="Filtrer par statut">
        {(
          [
            ["a_faire", "À faire"],
            ["bloquees", "Bloquées"],
            ["terminees", "Terminées"],
            ["toutes", "Toutes"],
          ] as [Filtre, string][]
        ).map(([cle, libelle]) => (
          <button key={cle} type="button" role="tab" aria-selected={filtre === cle} className="no-onglet" onClick={() => setFiltre(cle)}>
            {libelle}
            <span className="no-compte">{compte[cle]}</span>
          </button>
        ))}
      </div>

      {/* la barre : le tri et la vue | la recherche et « Nouvelle tâche » */}
      <div className="no-barre">
        <div className="tk-barre-gauche">
          <span className="no-bouton tk-tri">
            <CalendarDays {...I} width={14} height={14} />
            <span className="tk-gris">Groupé par</span> Échéance
          </span>
          {selecteur}
        </div>
        <div className="no-barre-droite">
          <label className="tk-recherche">
            <Search {...I} width={14} height={14} />
            <span className="v2-sr">Rechercher une tâche</span>
            <input type="search" value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Rechercher" onKeyDown={(e) => e.key === "Escape" && setRecherche("")} />
          </label>
          <button type="button" className="no-principal" onClick={ajouter}>
            <Plus {...I} width={14} height={14} />
            Nouvelle tâche
          </button>
        </div>
      </div>
      {etat ? (
        <p className="tk-etat" role="status">
          {etat}
        </p>
      ) : (
        <p className="v2-sr" role="status" />
      )}

      {/* la liste, à plat, groupée par échéance (vue Tâches d'Attio) */}
      {visibles.length === 0 ? (
        <p className="tk-vide">Aucune tâche ne correspond.</p>
      ) : (
        <div className="tk-liste">
          {GROUPES.map((g) => {
            const liste = visibles.filter((l) => groupeDe(l) === g.cle);
            if (!liste.length) return null;
            const replie = replies.includes(g.cle) && !cherche && filtre !== "terminees";
            return (
              <section key={g.cle} className="tk-groupe" data-groupe={g.cle} aria-label={g.libelle}>
                <h2>
                  <button type="button" aria-expanded={!replie} onClick={() => setReplies((r) => (replie ? r.filter((x) => x !== g.cle) : [...r, g.cle]))}>
                    <ChevronDown {...I} width={12} height={12} className="tk-chevron" />
                    {g.libelle}
                    <span className="tk-nombre">{liste.length}</span>
                  </button>
                </h2>
                {replie ? null : (
                  <ul>
                    {liste.map((l) => (
                      <LigneTache key={l.id} l={l} groupe={g.cle} choisie={choisie?.id === l.id} ouvrir={() => setChoix(l.id)} cocher={(fait) => maj(l.id, "Statut", fait ? "Fait" : "À faire")} />
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}

      {/* la fiche : au clic sur une tâche, en tiroir sur le côté */}
      <ModalOverlay isOpen={!!choisie} onOpenChange={(o) => !o && setChoix(null)} isDismissable className="v2-jetons tp-voile">
        <Modal className="tp-tiroir">
          <Dialog className="tp-tiroir-dialogue" aria-label="La tâche">
            {choisie ? <Fiche key={choisie.id} l={choisie} maj={maj} supprimer={supprimer} fermer={() => setChoix(null)} /> : null}
          </Dialog>
        </Modal>
      </ModalOverlay>
    </div>
  );
}

function LigneTache({ l, groupe, choisie, ouvrir, cocher }: { l: Ligne; groupe: Groupe; choisie: boolean; ouvrir: () => void; cocher: (fait: boolean) => void }) {
  const { titre, sous } = decouper(l.donnees["Tâche"]);
  const statut = l.donnees["Statut"] ?? "À faire";
  const fait = statut === "Fait";
  return (
    <li className="tk-ligne" aria-current={choisie ? "true" : undefined} data-fait={fait ? "" : undefined}>
      <button type="button" role="checkbox" aria-checked={fait} aria-label={`${fait ? "Rouvrir" : "Marquer faite"} : ${titre}`} className="tk-case" onClick={() => cocher(!fait)}>
        <Check width={10} height={10} strokeWidth={3} aria-hidden="true" />
      </button>
      <button type="button" className="tk-corps" onClick={ouvrir} title={sous || undefined}>
        <span className="tk-titre">{titre || "Nouvelle tâche"}</span>
        {statut === "Bloqué" || statut === "En cours" ? <span className="tk-pastille" data-statut={statut}>{statut}</span> : null}
        <span className="tk-pastille tk-categorie">{l.donnees["Catégorie"]}</span>
        <span className="tk-date" data-groupe={groupe}>
          {dateCourte(l.donnees["Échéance"])}
        </span>
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
