"use client";

/* ══════════════════════════════════════════════════════════════════════
   DALIRO › Chantiers : le planning, sur le « Schedule » de Float
   (30/10/2026)

   Teo : « j'aime bien celui de Float, examine de A à Z, je veux exactement
   le même ». Relevé : les captures du produit publiées sur
   float.com/product/scheduling (2 400 px, densité 2), couleurs lues au
   pixel ; l'application elle-même est derrière une connexion, donc aucune
   valeur calculée — les mesures sont ramenées des captures (÷ 2). Le
   relevé est en tête de ../lin/float-planning.css.

   Ce que Float montre, et ce que c'est ici :
     personne (avatar, nom, rôle, étiquette de bureau)
         → intervenant : nos équipes, les sous-traitants de l'annuaire, et
           ceux que le planning nomme sans les avoir rapprochés (le losange
           de Float pour un « Freelancer ») ; étiquette : sa commune
     jours en colonnes, n° de semaine, mois, week-end hachuré
         → les mêmes, en français
     bloc plein à la couleur du projet, trois lignes, pastille en bas à droite
         → un passage, à la couleur de son chantier : tâche / chantier / lot ;
           la pastille dit la réponse (« confirmé », « sans réponse »…)
     bloc « Tentative » (contour seul)
         → passage pas encore confirmé (à prévenir, demandé, sans réponse) ;
           un refus garde le contour, en rouge
     jour en surcharge (fond rose pâle)
         → deux passages le même jour pour le même intervenant
   Un clic sur un bloc ouvre l'aperçu de Chantiers (?passage=).

   30/10/2026 (« je veux pouvoir le déplacer ») : comme dans Float, un bloc
   prévu se fait glisser (il change de jours) et se tire par son bord droit
   (il s'allonge ou se raccourcit), au jour près ; pendant le geste, le bloc
   suit la souris et dit ses nouvelles dates. Au lâcher, la page décide
   (onChanger) : en exemple, tout s'applique en mémoire ; en base réelle,
   seul le bord droit a une porte (btp_recaler, avec sa fenêtre de
   confirmation) — la base ne sait pas encore déplacer le début d'un passage.
   Les heures (b6_82, facultatives) s'affichent en tête du bloc ; elles se
   posent dans l'aperçu du passage.

   Les absences d'un sous-traitant (page Équipes, btp_disponibilites) : une
   bande hachurée sur toute la hauteur de sa ligne, comme le « Time off » de
   Float ; un jour où un passage tombe pendant une absence passe en
   surcharge (fond rose). Un clic sur la bande : onAbsence.
   ══════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, Diamond, UserPlus } from "lucide-react";
import type { Chantier, Confirmation, Passage, Tableau } from "@/components/espace/daliro/types";
import { RACINE } from "../modules";
import { Menu } from "../lin/Lin";
import { qui } from "./enClair";
import "../lin/lin.css";
import "../lin/float-planning.css";

const JOUR = 86_400_000;
const JOURS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const MOIS = ["Janv.", "Févr.", "Mars", "Avr.", "Mai", "Juin", "Juil.", "Août", "Sept.", "Oct.", "Nov.", "Déc."];
/* les couleurs de projet des captures de Float, dans l'ordre où elles y paraissent */
const COULEURS = ["#2a0362", "#f9448f", "#304869", "#4dd3fe", "#155ff1", "#7b5cfa", "#1f9d74", "#f28c28"];
const CLAIRES = new Set(["#4dd3fe"]);

export type Densite = "semaines" | "mois";
export const estDensite = (v: string | null): v is Densite => v === "semaines" || v === "mois";
const LARGEUR: Record<Densite, number> = { semaines: 96, mois: 40 };
const NB_JOURS: Record<Densite, number> = { semaines: 28, mois: 63 };

const num = (iso: string) => {
  const [a, m, j] = iso.slice(0, 10).split("-").map(Number);
  return Math.floor(Date.UTC(a, (m || 1) - 1, j || 1) / JOUR);
};
const iso = (n: number) => new Date(n * JOUR).toISOString().slice(0, 10);
export const lundiDe = (jour: string) => {
  const n = num(jour);
  return iso(n - ((n + 3) % 7));
};
export const decaler = (lundi: string, semaines: number) => iso(num(lundi) + semaines * 7);
/* le numéro de semaine ISO */
const semaineIso = (n: number) => {
  const d = new Date(n * JOUR);
  const jeudi = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 3 - ((d.getUTCDay() + 6) % 7)));
  const debut = new Date(Date.UTC(jeudi.getUTCFullYear(), 0, 4));
  return 1 + Math.round(((jeudi.getTime() - debut.getTime()) / JOUR - 3 + ((debut.getUTCDay() + 6) % 7)) / 7);
};
const initiales = (nom: string) =>
  nom
    .replace(/[^\p{L}\s-]/gu, " ")
    .trim()
    .split(/\s+/)
    .filter((m) => m.length > 1 || /\p{Lu}/u.test(m))
    .slice(0, 2)
    .map((m) => m[0]?.toUpperCase() ?? "")
    .join("");

const REPONSE: Record<Confirmation, string> = {
  confirmee: "confirmé",
  demandee: "demandé",
  sans_reponse: "sans réponse",
  declinee: "a dit non",
  non_demandee: "à prévenir",
};

type Genre = "equipe" | "tiers" | "inconnu";
type Bloc = { p: Passage; chantier: Chantier; couleur: string; a: number; b: number; voie: number };
type Personne = { cle: string; nom: string; genre: Genre; role: string; etiquette: string | null; tiersId: string | null; blocs: Bloc[]; voies: number; surcharge: Set<number> };
const RANG: Record<Genre, number> = { equipe: 0, tiers: 1, inconnu: 2 };

export default function Planning({
  lundi,
  aujourdhui,
  densite,
  type,
  chantiers,
  tous,
  tableau,
  passageChoisi,
  onSemaine,
  onDensite,
  onType,
  onPassage,
  onChanger,
  absences,
  onAbsence,
}: {
  lundi: string;
  aujourdhui: string;
  densite: Densite;
  type: "equipes" | "sous-traitants" | null;
  /* les chantiers dont on montre les passages (filtres de la page) */
  chantiers: Chantier[];
  /* tous les chantiers : leurs couleurs ne bougent pas quand on filtre */
  tous: Chantier[];
  tableau: (id: string) => Tableau | null;
  passageChoisi: string | null;
  onSemaine: (lundi: string | null) => void;
  onDensite: (d: Densite) => void;
  onType: (t: "equipes" | "sous-traitants" | null) => void;
  onPassage: (id: string) => void;
  /* un bloc glissé (« deplacer », de `jours`) ou tiré par son bord droit (« etirer », fin + `jours`) */
  onChanger: (c: { passage: Passage; chantierId: string; mode: "deplacer" | "etirer"; jours: number }) => void;
  /* les absences notées, par sous-traitant (identifiant de l'annuaire) */
  absences?: Record<string, { id: string; du: string; au: string; motif: string | null }[]>;
  onAbsence?: (tiersId: string, absenceId: string) => void;
}) {
  const l0 = num(lundi);
  const n = NB_JOURS[densite];
  const W = LARGEUR[densite];
  const auj = num(aujourdhui);
  const jours = Array.from({ length: n }, (_, i) => l0 + i);

  const couleurDe = useMemo(() => {
    const m = new Map<string, string>();
    tous.forEach((c, i) => m.set(c.id, COULEURS[i % COULEURS.length]));
    return m;
  }, [tous]);

  /* les personnes : tout l'annuaire utile (une ligne vide dit « libre », comme chez Float), puis leurs blocs */
  const personnes = useMemo(() => {
    const m = new Map<string, Personne>();
    const ajouter = (cle: string, nom: string, genre: Genre, role: string, etiquette: string | null, tiersId: string | null) => {
      if (!m.has(cle)) m.set(cle, { cle, nom, genre, role, etiquette, tiersId, blocs: [], voies: 1, surcharge: new Set() });
      return m.get(cle)!;
    };
    const tabs = tous.map((c) => tableau(c.id)).filter((t): t is Tableau => !!t);
    for (const t of tabs) {
      for (const e of t.equipes) ajouter(`e:${e.id}`, e.nom, "equipe", "Nos équipes", "Équipe interne", null);
      for (const x of t.tiers) if (x.actif && x.roles.includes("sous_traitant")) ajouter(`t:${x.id}`, x.nom, "tiers", x.corps_etat?.length ? `Sous-traitant · ${x.corps_etat.join(", ")}` : "Sous-traitant", x.commune ?? null, x.id);
    }
    const visibles = new Set(chantiers.map((c) => c.id));
    for (const c of tous) {
      if (!visibles.has(c.id)) continue;
      for (const p of tableau(c.id)?.passages ?? []) {
        if (p.statut === "annule") continue;
        const a = num(p.debut);
        const b = num(p.fin);
        if (b < l0 || a > l0 + n - 1) continue;
        const nom = qui(p);
        const pers = p.tiers_id ? ajouter(`t:${p.tiers_id}`, nom, "tiers", "Sous-traitant", null, p.tiers_id) : p.equipe_id ? ajouter(`e:${p.equipe_id}`, nom, "equipe", "Nos équipes", "Équipe interne", null) : ajouter(`n:${nom.toLocaleLowerCase("fr")}`, nom, "inconnu", "Pas encore dans l'annuaire", null, null);
        pers.blocs.push({ p, chantier: c, couleur: couleurDe.get(c.id) ?? COULEURS[0], a, b, voie: 0 });
      }
    }
    for (const pers of m.values()) {
      pers.blocs.sort((x, y) => x.a - y.a || y.b - y.a - (x.b - x.a));
      const fins: number[] = [];
      for (const bl of pers.blocs) {
        let v = fins.findIndex((f) => bl.a > f);
        if (v < 0) {
          v = fins.length;
          fins.push(0);
        }
        fins[v] = bl.b;
        bl.voie = v;
      }
      pers.voies = Math.max(1, fins.length);
      const compte = new Map<number, number>();
      for (const bl of pers.blocs) for (let d = Math.max(bl.a, l0); d <= Math.min(bl.b, l0 + n - 1); d++) compte.set(d, (compte.get(d) ?? 0) + 1);
      for (const [d, k] of compte) if (k > 1) pers.surcharge.add(d);
      /* un passage pendant une absence : le jour est en surcharge */
      for (const ab of pers.tiersId ? (absences?.[pers.tiersId] ?? []) : [])
        for (let d = Math.max(num(ab.du), l0); d <= Math.min(num(ab.au), l0 + n - 1); d++) if (compte.has(d)) pers.surcharge.add(d);
    }
    return [...m.values()].filter((x) => !type || (type === "equipes" ? x.genre === "equipe" : x.genre !== "equipe")).sort((x, y) => RANG[x.genre] - RANG[y.genre] || x.nom.localeCompare(y.nom, "fr"));
  }, [tous, chantiers, tableau, couleurDe, l0, n, type, absences]);

  const fin = new Date((l0 + n - 1) * JOUR);
  const debut = new Date(l0 * JOUR);
  const titre = `${debut.getUTCDate()} ${MOIS[debut.getUTCMonth()].toLowerCase()} – ${fin.getUTCDate()} ${MOIS[fin.getUTCMonth()].toLowerCase()} ${fin.getUTCFullYear()}`;
  /* le geste en cours : quel bloc, quel mode, combien de jours ; `bouge` dès 4 px, pour distinguer d'un clic */
  const [geste, setGeste] = useState<{ id: string; mode: "deplacer" | "etirer"; jours: number } | null>(null);
  /* le geste vit aussi dans une référence : au lâcher, l'état n'est pas forcément déjà rendu */
  const depart = useRef<{ x: number; id: string; mode: "deplacer" | "etirer"; bouge: boolean; jours: number } | null>(null);
  const apresGeste = useRef(false);
  const dateCourte = (d: number) => {
    const x = new Date(d * JOUR);
    return `${JOURS[(d + 3) % 7].toLowerCase()} ${x.getUTCDate()} ${MOIS[x.getUTCMonth()].toLowerCase()}`;
  };
  const HAUT = 80;
  const PAS = 86;
  const TYPES = [
    { cle: null, libelle: "Tous les intervenants" },
    { cle: "equipes" as const, libelle: "Nos équipes" },
    { cle: "sous-traitants" as const, libelle: "Sous-traitants" },
  ];

  return (
    <div className="fpl" style={{ "--fpl-jour": `${W}px` } as React.CSSProperties} data-densite={densite}>
      <div className="fpl-barre">
        <span className="fpl-titre">{titre}</span>
        <div className="fpl-barre-droite">
          <button type="button" className="fpl-icone" aria-label="Semaine précédente" title="Semaine précédente" onClick={() => onSemaine(decaler(lundi, -1))}>
            <ChevronLeft aria-hidden="true" />
          </button>
          <button type="button" className="fpl-icone" aria-label="Semaine suivante" title="Semaine suivante" onClick={() => onSemaine(decaler(lundi, 1))}>
            <ChevronRight aria-hidden="true" />
          </button>
          <button type="button" className="fpl-bouton" onClick={() => onSemaine(null)}>
            Aujourd&apos;hui
          </button>
          <Menu
            largeur={160}
            bouton={(ouvert, basculer) => (
              <button type="button" className="fpl-bouton" aria-haspopup="menu" aria-expanded={ouvert} onClick={basculer}>
                {densite === "semaines" ? "Semaines" : "Mois"}
                <ChevronDown aria-hidden="true" />
              </button>
            )}
          >
            {(fermer) => (
              <div role="menu" aria-label="Échelle du planning">
                {(["semaines", "mois"] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    role="menuitemradio"
                    aria-checked={d === densite}
                    className="lin-menu-option"
                    onClick={() => {
                      fermer();
                      onDensite(d);
                    }}
                  >
                    {d === "semaines" ? "Semaines (4 semaines)" : "Mois (9 semaines)"}
                  </button>
                ))}
              </div>
            )}
          </Menu>
        </div>
      </div>

      <div className="fpl-zone" role="region" aria-label={`Planning des intervenants, ${titre}`} tabIndex={0}>
        <div className="fpl-toile" style={{ width: `calc(var(--fpl-gauche) + ${n * W}px)` }}>
          {/* les têtes : le coin (ajouter, intervenants), puis semaine et mois, puis les jours */}
          <div className="fpl-tetes">
            <div className="fpl-coin">
              <Link href={`${RACINE}/daliro/annuaire`} className="fpl-icone" aria-label="Ajouter un intervenant, dans l'annuaire" title="Ajouter un intervenant (annuaire)">
                <UserPlus aria-hidden="true" />
              </Link>
              <Menu
                largeur={200}
                bouton={(ouvert, basculer) => (
                  <button type="button" className="fpl-bouton fpl-bouton--coin" aria-haspopup="menu" aria-expanded={ouvert} onClick={basculer}>
                    {TYPES.find((t) => t.cle === type)?.libelle}
                    <ChevronDown aria-hidden="true" />
                  </button>
                )}
              >
                {(fermer) => (
                  <div role="menu" aria-label="Intervenants montrés">
                    {TYPES.map((t) => (
                      <button
                        key={t.libelle}
                        type="button"
                        role="menuitemradio"
                        aria-checked={t.cle === type}
                        className="lin-menu-option"
                        onClick={() => {
                          fermer();
                          onType(t.cle);
                        }}
                      >
                        {t.libelle}
                      </button>
                    ))}
                  </div>
                )}
              </Menu>
            </div>
            <div className="fpl-jours" aria-hidden="true">
              {jours.map((d, i) => {
                const date = new Date(d * JOUR);
                const lundiIci = (d + 3) % 7 === 0;
                const premierDuMois = date.getUTCDate() === 1 || i === 0;
                return (
                  <div key={d} className="fpl-jour" data-auj={d === auj ? "" : undefined} data-we={i % 7 >= 5 ? "" : undefined}>
                    <span className="fpl-jour-haut">
                      {lundiIci ? <span className="fpl-semaine">{semaineIso(d)}</span> : null}
                      {premierDuMois ? <span className="fpl-mois">{MOIS[date.getUTCMonth()]}</span> : null}
                    </span>
                    <span className="fpl-jour-nom">
                      {densite === "mois" ? date.getUTCDate() : `${JOURS[(d + 3) % 7]} ${date.getUTCDate()}`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {personnes.length ? null : <p className="fpl-vide">Aucun intervenant : ajoutez vos équipes et vos sous-traitants dans l&apos;annuaire.</p>}
          {personnes.map((pers) => (
            <div key={pers.cle} className="fpl-ligne" style={{ height: Math.max(112, 14 + pers.voies * PAS) }}>
              <div className="fpl-personne">
                <span className="fpl-avatar" data-genre={pers.genre} aria-hidden="true">
                  {pers.genre === "inconnu" ? <Diamond /> : initiales(pers.nom) || "?"}
                </span>
                <span className="fpl-personne-texte">
                  {pers.tiersId ? (
                    <Link href={`${RACINE}/daliro/annuaire?entreprise=${encodeURIComponent(pers.tiersId)}`} className="fpl-nom">
                      {pers.nom}
                    </Link>
                  ) : (
                    <span className="fpl-nom">{pers.nom}</span>
                  )}
                  <span className="fpl-role">{pers.role}</span>
                  {pers.etiquette ? <span className="fpl-etiquette">{pers.etiquette}</span> : null}
                </span>
              </div>
              <div className="fpl-piste" style={{ width: n * W }}>
                {jours.map((d, i) => (
                  <span key={d} className="fpl-case" style={{ left: i * W, width: W }} data-we={i % 7 >= 5 ? "" : undefined} data-surcharge={pers.surcharge.has(d) ? "" : undefined} aria-hidden="true" />
                ))}
                {auj >= l0 && auj < l0 + n ? <span className="fpl-aujourdhui" style={{ left: (auj - l0) * W }} aria-hidden="true" /> : null}
                {(pers.tiersId ? (absences?.[pers.tiersId] ?? []) : []).map((ab) => {
                  const a = Math.max(num(ab.du), l0) - l0;
                  const b = Math.min(num(ab.au), l0 + n - 1) - l0;
                  if (b < 0 || a > n - 1) return null;
                  const titre = `${pers.nom} absent du ${dateCourte(num(ab.du))} au ${dateCourte(num(ab.au))}${ab.motif ? ` (${ab.motif})` : ""}${onAbsence ? " — cliquez pour l'annuler" : ""}`;
                  return (
                    <button key={ab.id} type="button" className="fpl-absence" style={{ left: a * W, width: (b - a + 1) * W }} title={titre} aria-label={titre} disabled={!onAbsence} onClick={() => pers.tiersId && onAbsence?.(pers.tiersId, ab.id)}>
                      <span>Absent{ab.motif ? ` · ${ab.motif}` : ""}</span>
                    </button>
                  );
                })}
                {pers.blocs.map((bl) => {
                  const { p } = bl;
                  const g = geste?.id === p.id ? geste : null;
                  const da = g?.mode === "deplacer" ? g.jours : 0;
                  const db = g ? (g.mode === "deplacer" ? g.jours : Math.max(bl.a - bl.b, g.jours)) : 0;
                  const a = Math.max(bl.a + da, l0) - l0;
                  const b = Math.min(bl.b + db, l0 + n - 1) - l0;
                  const fait = p.statut === "fait";
                  const mobile = p.statut === "prevu";
                  const provisoire = !fait && p.confirmation !== "confirmee";
                  const lot = p.lot_libelle ? `${p.lot_code ? `${p.lot_code} · ` : ""}${p.lot_libelle}` : null;
                  const commencer = (e: React.PointerEvent, mode: "deplacer" | "etirer") => {
                    if (!mobile || e.button !== 0) return;
                    e.stopPropagation();
                    depart.current = { x: e.clientX, id: p.id, mode, bouge: false, jours: 0 };
                    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                  };
                  const bouger = (e: React.PointerEvent) => {
                    const d = depart.current;
                    if (!d || d.id !== p.id) return;
                    const dx = e.clientX - d.x;
                    if (!d.bouge && Math.abs(dx) < 4) return;
                    d.bouge = true;
                    const jours = Math.round(dx / W);
                    d.jours = jours;
                    if (!geste || geste.jours !== jours || geste.id !== p.id || geste.mode !== d.mode) setGeste({ id: p.id, mode: d.mode, jours });
                  };
                  const lacher = () => {
                    const d = depart.current;
                    depart.current = null;
                    if (!d || d.id !== p.id || !d.bouge) return;
                    apresGeste.current = true;
                    const jours = d.jours;
                    setGeste(null);
                    if (jours !== 0) onChanger({ passage: p, chantierId: bl.chantier.id, mode: d.mode, jours: d.mode === "etirer" ? Math.max(bl.a - bl.b, jours) : jours });
                  };
                  return (
                    <button
                      key={p.id}
                      type="button"
                      className="fpl-bloc"
                      style={{ left: a * W + 3, width: Math.max(1, b - a + 1) * W - 6, top: 6 + bl.voie * PAS, height: HAUT, "--fpl-c": bl.couleur } as React.CSSProperties}
                      data-provisoire={provisoire ? "" : undefined}
                      data-refus={p.confirmation === "declinee" && !fait ? "" : undefined}
                      data-fait={fait ? "" : undefined}
                      data-clair={CLAIRES.has(bl.couleur) ? "" : undefined}
                      data-choisi={passageChoisi === p.id ? "" : undefined}
                      data-coupe={bl.a + da < l0 ? "avant" : bl.b + db > l0 + n - 1 ? "apres" : undefined}
                      data-mobile={mobile ? "" : undefined}
                      data-geste={g ? g.mode : undefined}
                      aria-pressed={passageChoisi === p.id}
                      title={`${p.tache ?? "Passage"} · ${bl.chantier.nom}${lot ? ` · ${lot}` : ""} · ${pers.nom} · ${fait ? "fait" : REPONSE[p.confirmation]}${mobile ? " — glissez pour changer les jours, tirez le bord droit pour la durée" : ""}`}
                      onPointerDown={(e) => commencer(e, "deplacer")}
                      onPointerMove={bouger}
                      onPointerUp={lacher}
                      onPointerCancel={() => {
                        depart.current = null;
                        setGeste(null);
                      }}
                      onClick={() => {
                        if (apresGeste.current) {
                          apresGeste.current = false;
                          return;
                        }
                        onPassage(p.id);
                      }}
                    >
                      <span className="fpl-bloc-ligne fpl-bloc-ligne--1">
                        {p.heure_debut ? <span className="fpl-heures">{`${p.heure_debut.slice(0, 5).replace(":", "h")}–${(p.heure_fin ?? "").slice(0, 5).replace(":", "h")}`}</span> : null}
                        {p.tache ?? lot ?? "Passage"}
                      </span>
                      <span className="fpl-bloc-ligne">{bl.chantier.nom}</span>
                      {lot && p.tache ? <span className="fpl-bloc-ligne">{lot}</span> : null}
                      <span className="fpl-pastille">{fait ? "fait" : REPONSE[p.confirmation]}</span>
                      {g && g.jours !== 0 ? (
                        <span className="fpl-bloc-dates" aria-live="polite">
                          {bl.a + da === bl.b + db ? dateCourte(bl.a + da) : `${dateCourte(bl.a + da)} → ${dateCourte(bl.b + db)}`}
                        </span>
                      ) : null}
                      {mobile ? <span className="fpl-poignee" aria-hidden="true" onPointerDown={(e) => commencer(e, "etirer")} onPointerMove={bouger} onPointerUp={lacher} /> : null}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
