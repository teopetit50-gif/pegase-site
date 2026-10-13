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
   13/10/2026 (3) — « encore trop de trucs, regarde Notes et Activité » :
   comme la page Activité. Une barre fine (statut ⌄, échéance ⌄ | recherche,
   « Nouvelle tâche »), puis UNE liste encadrée, une tâche par ligne
   (titre et catégorie | statut | date | « Dans 3 j »). « Cette semaine »
   au départ, retards compris : la liste reste courte. Plus d'onglets, de
   groupes ni de cases ; on coche « Marquer faite » dans la fiche.
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
import { CalendarDays, Check, ChevronDown, ChevronRight, ListChecks, Plus, Rows3, Search, Tag, Trash2, X } from "lucide-react";
import { ItemMenu, MenuDeroulant } from "@/components/espace2/ui";
import { Dialog, Modal, ModalOverlay } from "react-aria-components";
import "@/components/espace2/notes.css";
import "./activite.css";
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

const FILTRES: { cle: Filtre; libelle: string }[] = [
  { cle: "a_faire", libelle: "À faire" },
  { cle: "bloquees", libelle: "Bloquées" },
  { cle: "terminees", libelle: "Terminées" },
  { cle: "toutes", libelle: "Toutes" },
];
type Periode = "semaine" | "mois" | "tout";
const PERIODES: { cle: Periode; libelle: string }[] = [
  { cle: "semaine", libelle: "Cette semaine" },
  { cle: "mois", libelle: "30 prochains jours" },
  { cle: "tout", libelle: "Toutes les dates" },
];
const TEINTES: Record<string, string> = { "En cours": "bleu", Bloqué: "rouge", Fait: "vert" };

export default function PlanTaches({ lignes: initiales, selecteur }: { lignes: Ligne[]; selecteur: React.ReactNode }) {
  const [lignes, setLignes] = useState(() => initiales.filter((l) => l.tableau === "plan" || l.tableau === "ajouts"));
  const [maintenant] = useState(() => Date.now());
  const [filtre, setFiltre] = useState<Filtre>("a_faire");
  const [recherche, setRecherche] = useState("");
  const [choix, setChoix] = useState<string | null>(null);
  /* « Cette semaine » au départ (retards compris) : la liste reste courte */
  const [periode, setPeriode] = useState<Periode>("semaine");
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

  const jour0 = new Date(maintenant).setHours(0, 0, 0, 0);
  const visibles = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    return lignes
      .filter((l) => (filtre === "a_faire" ? !["Fait", "Bloqué"].includes(l.donnees["Statut"]) : filtre === "bloquees" ? l.donnees["Statut"] === "Bloqué" : filtre === "terminees" ? l.donnees["Statut"] === "Fait" : true))
      .filter((l) => !q || `${l.donnees["Tâche"] ?? ""} ${l.donnees["N°"] ?? ""}`.toLowerCase().includes(q))
      /* la période ne s'applique qu'aux tâches ouvertes : un retard reste toujours visible */
      .filter((l) => {
        if (periode === "tout" || q || filtre === "terminees") return true;
        const e = echeance(l.donnees["Échéance"])?.getTime();
        return e !== undefined && e < jour0 + (periode === "semaine" ? 7 : 30) * 86_400_000;
      })
      .sort((a, b) => (echeance(a.donnees["Échéance"])?.getTime() ?? 9e15) - (echeance(b.donnees["Échéance"])?.getTime() ?? 9e15) || (a.tableau === b.tableau ? a.ordre - b.ordre : a.tableau === "plan" ? -1 : 1));
  }, [lignes, filtre, recherche, periode, jour0]);

  const choisie = choix ? lignes.find((l) => l.id === choix) ?? null : null;
  const FILTRE = FILTRES.find((f) => f.cle === filtre)!;
  const coche = (oui: boolean) => (oui ? <Check width={14} height={14} aria-label="choisi" /> : null);

  return (
    <div className="no-page tk-page v2-arrivee">
      <h1 className="v2-sr">Tâches</h1>

      {/* la barre, comme Activité : le statut et la période | la recherche et « Nouvelle tâche » */}
      <div className="no-barre ao-barre">
        <div className="ao-groupe">
          <MenuDeroulant
            etiquette={`Statut : ${FILTRE.libelle}`}
            classe="no-bouton"
            placement="bottom start"
            largeur={220}
            declencheur={
              <>
                <ListChecks {...I} width={14} height={14} />
                {FILTRE.libelle}
                <ChevronDown {...I} width={14} height={14} />
              </>
            }
          >
            {FILTRES.map((f) => (
              <ItemMenu key={f.cle} id={f.cle} textValue={f.libelle} onAction={() => setFiltre(f.cle)} suffixe={filtre === f.cle ? coche(true) : <span className="v2-gris">{compte[f.cle]}</span>}>
                {f.libelle}
              </ItemMenu>
            ))}
          </MenuDeroulant>
          <MenuDeroulant
            etiquette="Échéance"
            classe="no-bouton"
            placement="bottom start"
            largeur={220}
            declencheur={
              <>
                <CalendarDays {...I} width={14} height={14} />
                {PERIODES.find((x) => x.cle === periode)?.libelle}
                <ChevronDown {...I} width={14} height={14} />
              </>
            }
          >
            {PERIODES.map((x) => (
              <ItemMenu key={x.cle} id={x.cle} textValue={x.libelle} onAction={() => setPeriode(x.cle)} suffixe={coche(periode === x.cle)}>
                {x.libelle}
              </ItemMenu>
            ))}
          </MenuDeroulant>
          {selecteur}
        </div>
        <div className="ao-groupe ao-groupe--droite">
          <label className="ao-recherche">
            <Search {...I} width={14} height={14} />
            <span className="v2-sr">Rechercher une tâche</span>
            <input type="search" value={recherche} placeholder="Rechercher" autoComplete="off" spellCheck={false} onChange={(e) => setRecherche(e.target.value)} onKeyDown={(e) => e.key === "Escape" && setRecherche("")} />
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

      {/* la liste encadrée d'Activité, une tâche par ligne, triée par échéance */}
      {visibles.length ? (
        <ul className="ao-liste tk-liste">
          {visibles.map((l) => {
            const statut = l.donnees["Statut"] || "À faire";
            const { titre } = decouper(l.donnees["Tâche"]);
            const quand = relatif(l.donnees["Échéance"], jour0, statut);
            return (
              <li key={l.id} className="ao-ligne">
                <button type="button" onClick={() => setChoix(l.id)}>
                  <span className="ao-ligne-titre">
                    <strong data-vide={titre ? undefined : ""}>{titre || "Tâche sans titre"}</strong>
                    <span>{l.donnees["Catégorie"]}</span>
                  </span>
                  <span className="ao-statut">
                    <span className="ao-point" data-teinte={TEINTES[statut]} aria-hidden="true" />
                    {statut}
                  </span>
                  <span className="ao-ligne-date">{dateCourte(l.donnees["Échéance"])}</span>
                  <span className="tk-quand" data-retard={quand === "En retard" ? "" : undefined}>
                    {quand}
                  </span>
                  <ChevronRight {...I} width={14} height={14} className="ao-chevron" />
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="ao-vide ao-vide--liste">{recherche.trim() ? "Aucune tâche ne correspond." : periode === "tout" ? "Aucune tâche ici." : "Rien d'autre à faire sur cette période."}</p>
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

/* « En retard », « Aujourd'hui », « Demain », « Dans 4 j » */
function relatif(t: string | undefined, jour0: number, statut: string): string {
  const e = echeance(t)?.getTime();
  if (e === undefined || statut === "Fait") return "";
  if (e < jour0) return "En retard";
  const n = Math.floor((e - jour0) / 86_400_000);
  return n === 0 ? "Aujourd'hui" : n === 1 ? "Demain" : `Dans ${n} j`;
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
