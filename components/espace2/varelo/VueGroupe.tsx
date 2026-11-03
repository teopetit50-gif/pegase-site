"use client";

/* ══════════════════════════════════════════════════════════════════════
   VARELO — « Groupe » (/espace2/varelo/groupe), 02/11/2026, refonte des
   pages métiers : Linear, liste des Initiatives, au 1:1. Relevé :
   docs/refonte-metiers/releves/linear-initiatives-liste.md ; styles
   ./var.css (en-tête) et ./var-init.css (liste).

   Ce qu'elle reprend de l'écran d'avant (bloc 5, « Le groupe sur une page »,
   et ses fenêtres 5.a, 5.b) :
     · une ligne par société (les initiatives) : nom, et en résumé ses
       ventes à date, son résultat et sa trésorerie ; État (statut :
       sous le plancher, sous l'objectif, dans l'objectif, sans objectif,
       sans balance) ; Urgence (priorité) ; Pôle (responsable) ; Balance
       (date cible : arrêtée au) ; Sur N-1 (compteur de projets : écart en
       %) ; Fraîcheur (santé : balance de moins de 35 jours) ; Trésorerie
       (santé des projets actifs : point et montant) ;
     · la première ligne est le groupe entier : les totaux d'avant (ventes
       du groupe, résultat cumulé, trésorerie, N sous le plancher) ;
     · « Sans balance générale : … » d'avant : ces sociétés ont leur ligne,
       à l'état « Sans balance » ;
     · « New initiative » = « Déposer une balance générale » (G13, 5.b) ;
       une ligne ouvre « Objectifs » (G14, 5.a) pour qui peut les régler ;
     · onglets Active · Planned · All initiatives = À surveiller · Avec
       objectif · Toutes les sociétés ; filtre = pôle ; affichage = colonnes ;
     · « ?societe=<entite_id> » et « ?depot=<id> » (repères grp_societes,
       grp_balances_depots) désignent la ligne de la société.
   ══════════════════════════════════════════════════════════════════════ */

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { dateCourte, montant } from "@/components/espace/format";
import { DialogueBalanceGenerale, DialogueObjectif, useGroupePage } from "@/components/espace/varelo/GroupePage";
import type { PageSociete } from "@/components/espace/varelo/groupe";
import { RACINE } from "../modules";
import { useVarelo } from "./donnees";
import { VarCarte } from "./VarCadre";
import { VarIcone, type NomVarIcone } from "./VarIcone";
import { exporterCsv, useFavoris } from "./local";
import "./var-board.css";
import "./var-init.css";

type Onglet = "surveiller" | "objectif" | "toutes";
type Colonne = "statut" | "urgence" | "resp" | "cible" | "projets" | "sante" | "actifs";

const kEur = (v: number) => (Math.abs(v) >= 1e6 ? `${(v / 1e6).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} M€` : Math.abs(v) >= 1e3 ? `${Math.round(v / 1e3).toLocaleString("fr-FR")} k€` : `${Math.round(v)} €`);
const pct = (v: number | null) => (v === null ? "–" : `${v > 0 ? "+" : ""}${v.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %`);

type Etat = { libelle: string; titre: string; icone: NomVarIcone; couleur: string };
function etatDe(l: PageSociete): Etat {
  if (l.sous_plancher) return { libelle: "Alerte", titre: "Trésorerie sous le plancher", icone: "IssueStatusTriage", couleur: "rgb(243, 127, 88)" };
  if (l.objectif_a_date !== null && l.objectif_a_date > 0 && l.ecart_objectif !== null) {
    return l.ecart_objectif < 0 ? { libelle: "En retard", titre: "Ventes sous l'objectif à date", icone: "IssueStatusStarted", couleur: "#f0bf00" } : { libelle: "À jour", titre: "Ventes dans l'objectif à date", icone: "IssueStatusDone", couleur: "lch(48 59.31 288.43)" };
  }
  return { libelle: "Sans cible", titre: "Aucun objectif de ventes pour l'exercice", icone: "IssueStatusBacklog", couleur: "var(--var-t3)" };
}
const aSurveiller = (l: PageSociete) => l.sous_plancher || (l.ecart_objectif !== null && l.objectif_a_date !== null && l.ecart_objectif < -0.1 * l.objectif_a_date) || l.age_jours > 35;

export default function VueGroupe() {
  const v = useVarelo();
  const params = useSearchParams();
  const societes = useMemo(() => v.donnees?.societes ?? [], [v.donnees]);
  const g = useGroupePage({ source: v.source, contexte: v.contexte, client_id: v.client_id });
  const [onglet, setOnglet] = useState<Onglet>("toutes");
  const [pole, setPole] = useState<string | null>(null);
  const [masquees, setMasquees] = useState<Colonne[]>([]);
  const [menu, setMenu] = useState<"filtre" | "affichage" | null>(null);
  /* 03/11/2026 — « Filtrer par pôle » et « Affichage » ne se fermaient ni par
     Échap ni par un clic dehors. */
  useEffect(() => {
    if (!menu) return;
    const dehors = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest(".var-i-ronds")) setMenu(null);
    };
    const echap = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenu(null);
    };
    document.addEventListener("mousedown", dehors);
    document.addEventListener("keydown", echap);
    return () => {
      document.removeEventListener("mousedown", dehors);
      document.removeEventListener("keydown", echap);
    };
  }, [menu]);
  /* cases à cocher : sélection multiple, puis actions groupées */
  const [selection, setSelection] = useState<string[]>([]);
  /* le troisième rond (« Open details ») : le volet des totaux des lignes affichées ou choisies */
  const [volet, setVolet] = useState(false);
  const favoris = useFavoris();
  /* « + » d'une section de Ce matin : ?nouveau=balance ouvre le dépôt d'une balance générale */
  const [nouveauVu, setNouveauVu] = useState(false);
  if (!nouveauVu && params.get("nouveau") === "balance" && g.peutDeposer) {
    setNouveauVu(true);
    g.setDepot(true);
  }
  const [tri, setTri] = useState<{ col: "nom" | "statut" | "urgence" | "cible" | "sante"; sens: 1 | -1 } | null>(null);

  const viseSociete = params.get("societe");
  const viseDepot = params.get("depot");
  const vise = (l: PageSociete) => l.entite_id === viseSociete || l.depot_id === viseDepot;

  const sansBalance = useMemo(() => societes.filter((s) => !g.lignes.some((l) => l.entite_id === s.entite_id)), [societes, g.lignes]);
  const lignes = useMemo(() => {
    let l = g.lignes.filter((x) => !pole || x.pole_id === pole);
    if (onglet === "surveiller") l = l.filter(aSurveiller);
    if (onglet === "objectif") l = l.filter((x) => x.ventes_objectif !== null);
    if (tri) {
      const val = (x: PageSociete): string | number => (tri.col === "nom" ? x.societe : tri.col === "statut" ? etatDe(x).libelle : tri.col === "urgence" ? (x.sous_plancher ? 0 : aSurveiller(x) ? 1 : 2) : tri.col === "cible" ? x.arrete_le : x.age_jours);
      l = [...l].sort((a, b) => (val(a) < val(b) ? -tri.sens : val(a) > val(b) ? tri.sens : 0));
    }
    return l;
  }, [g.lignes, pole, onglet, tri]);
  const poles = useMemo(() => Array.from(new Map(societes.filter((s) => s.pole_id).map((s) => [s.pole_id as string, s.pole ?? "Pôle"])).entries()), [societes]);
  const montre = (c: Colonne) => !masquees.includes(c);

  const enTete = (col: "nom" | "statut" | "urgence" | "cible" | "sante", libelle: string, premier = false) => (
    <button type="button" className="var-i-tri" style={premier ? { marginLeft: 0 } : undefined} onClick={() => setTri((t) => (t?.col === col ? (t.sens === 1 ? { col, sens: -1 } : null) : { col, sens: 1 }))}>
      {libelle}
      {tri?.col === col ? <VarIcone nom="Chevron" style={{ transform: `rotate(${tri.sens === 1 ? 90 : -90}deg)` }} /> : null}
    </button>
  );

  const ligne = (l: PageSociete) => {
    const e = etatDe(l);
    const urgence: NomVarIcone = l.sous_plancher ? "Priority1" : aSurveiller(l) ? "Priority2" : "Priority0";
    const fraiche = l.age_jours <= 35;
    const contenu = (
      <>
        <span />
        <span className="var-i-case" />
        <span className="var-i-titre">
          <span className="var-i-icone" style={{ color: e.couleur }}>
            <VarIcone nom="Initiative" />
          </span>
          <span className="var-i-textes">
            <span className="var-i-nom">{l.societe}</span>
            <span className="var-i-resume">
              Ventes de {montant(l.ventes)} au {dateCourte(l.arrete_le)}, résultat {montant(l.resultat)}, trésorerie {montant(l.tresorerie)}
              {l.tresorerie_plancher !== null ? ` (plancher ${montant(l.tresorerie_plancher)})` : ""}
              {l.objectif_a_date !== null && l.ecart_objectif !== null ? ` ; ${l.ecart_objectif >= 0 ? "+" : ""}${montant(l.ecart_objectif)} sur l'objectif à date` : ""}
            </span>
          </span>
        </span>
        {montre("statut") ? (
          <span className="var-i-c-statut">
            <span className="var-i-pilule" title={e.titre}>
              <VarIcone nom={e.icone} style={{ color: e.couleur }} />
              <span>{e.libelle}</span>
            </span>
          </span>
        ) : <span />}
        {montre("urgence") ? (
          <span className="var-i-c-urgence">
            <span className="var-i-rond" title={l.sous_plancher ? "Trésorerie sous le plancher" : aSurveiller(l) ? "À surveiller" : "Rien à signaler"}>
              <VarIcone nom={urgence} style={l.sous_plancher ? { color: "rgb(243, 127, 88)" } : undefined} />
            </span>
          </span>
        ) : <span />}
        {montre("resp") ? (
          <span className="var-i-c-resp">
            <span className="var-i-rond var-i-rond--resp" title={l.pole ?? "Sans pôle"}>
              {l.pole ? <span className="var-i-avatar">{l.pole.charAt(0).toUpperCase()}</span> : <VarIcone nom="Unassigned" taille={18} />}
            </span>
          </span>
        ) : <span />}
        {montre("cible") ? (
          <span className="var-i-c-cible">
            <span className="var-i-pilule var-i-cible" title={`Balance générale arrêtée au ${dateCourte(l.arrete_le)} (${l.age_jours} jours)`}>
              <span>{dateCourte(l.arrete_le)}</span>
            </span>
          </span>
        ) : <span />}
        {montre("projets") ? (
          <span className="var-i-c-projets">
            <span className="var-i-projets" title={l.ventes_n1 !== null ? `N-1 au ${dateCourte(l.arrete_n1)} : ${montant(l.ventes_n1)} (${l.ecart_n1 !== null && l.ecart_n1 >= 0 ? "+" : ""}${montant(l.ecart_n1)})` : "Pas de balance N-1"}>
              <VarIcone nom="Project" />
              <strong>{pct(l.ecart_n1_pct)}</strong>
            </span>
          </span>
        ) : <span />}
        {montre("sante") ? (
          <span className="var-i-c-sante">
            <span className="var-i-sante" title={fraiche ? `Balance à jour (${l.age_jours} jours)` : `Balance ancienne de ${l.age_jours} jours : à redéposer`}>
              <VarIcone nom={fraiche ? "IssueStatusDone" : "IssueStatusBacklog"} style={{ color: fraiche ? "#26a644" : "var(--var-t4)" }} />
            </span>
          </span>
        ) : <span />}
        {montre("actifs") ? (
          <span className="var-i-c-actifs">
            <span className="var-i-actifs">
              <span className="var-i-pastille" title={`Trésorerie ${montant(l.tresorerie)}`} style={{ ["--var-point" as string]: l.sous_plancher ? "lch(58% 73 29)" : "lch(60 64.37 141.95)" }}>
                <span className="var-i-point" />
                {kEur(l.tresorerie)}
              </span>
            </span>
          </span>
        ) : <span />}
        <span />
      </>
    );
    const coche = (
      <input
        type="checkbox"
        className="var-i-coche"
        aria-label={`Choisir ${l.societe}`}
        checked={selection.includes(l.entite_id)}
        data-visible={selection.length ? "" : undefined}
        onChange={(e) => setSelection((x) => (e.target.checked ? [...x, l.entite_id] : x.filter((y) => y !== l.entite_id)))}
      />
    );
    return g.peutObjectif ? (
      <li key={l.entite_id} className="var-i-li">
        {coche}
        <button type="button" className="var-i-ligne" data-vise={vise(l) ? "" : undefined} aria-label={`${l.societe} : régler ses objectifs`} onClick={() => g.setObjectif(l)}>
          {contenu}
        </button>
      </li>
    ) : (
      <li key={l.entite_id} className="var-i-li">
        {coche}
        <div className="var-i-ligne" data-vise={vise(l) ? "" : undefined}>
          {contenu}
        </div>
      </li>
    );
  };

  const t = g.total;
  const nombreSous = g.lignes.filter((l) => l.sous_plancher).length;

  return (
    <VarCarte>
      <h1 className="v2-sr">Le groupe sur une page</h1>
      <header className="var-tete">
        <div className="var-ligne1">
          <h2 className="var-fil" style={{ paddingLeft: 10 }}>
            Groupe
          </h2>
          <span className="var-pousse" />
          {g.peutDeposer ? (
            <button type="button" className="var-b-nouveau" onClick={() => g.setDepot(true)}>
              <VarIcone nom="Plus" />
              <span className="var-i-nouveau-texte">Déposer une balance générale</span>
            </button>
          ) : null}
        </div>
        <div className="var-ligne2 var-i-ligne2">
          <div className="var-i-onglets" role="tablist" aria-label="Vues">
            {(
              [
                ["surveiller", "À surveiller"],
                ["objectif", "Avec objectif"],
                ["toutes", "Toutes les sociétés"],
              ] as const
            ).map(([k, l]) => (
              <button key={k} type="button" role="tab" className="var-onglet" aria-selected={onglet === k} onClick={() => setOnglet(k)}>
                {l}
              </button>
            ))}
          </div>
          <div className="var-i-ronds">
            <span style={{ position: "relative" }}>
              <button type="button" className="var-rond" aria-label="Filtrer par pôle" title="Filtrer par pôle" aria-haspopup="menu" aria-expanded={menu === "filtre"} onClick={() => setMenu(menu === "filtre" ? null : "filtre")}>
                <VarIcone nom="Filtre" />
              </button>
              {menu === "filtre" ? (
                <div className="var-menu" role="menu" aria-label="Filtrer par pôle" style={{ top: 32, right: 0 }}>
                  {[[null, "Tous les pôles"] as const, ...poles].map(([id, nom]) => (
                    <button key={id ?? "tous"} type="button" role="menuitemradio" aria-checked={pole === id} className="var-menu-option" onClick={() => { setPole(id); setMenu(null); }}>
                      <VarIcone nom="Folder" />
                      <span>
                        {nom}
                        {pole === id ? " ✓" : ""}
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
            </span>
            <span style={{ position: "relative" }}>
              <button type="button" className="var-rond" aria-label="Affichage" title="Affichage" aria-haspopup="menu" aria-expanded={menu === "affichage"} onClick={() => setMenu(menu === "affichage" ? null : "affichage")}>
                <VarIcone nom="Affichage" />
              </button>
              {menu === "affichage" ? (
                <div className="var-menu" role="menu" aria-label="Colonnes" style={{ top: 32, right: 0 }}>
                  {(
                    [
                      ["statut", "État"],
                      ["urgence", "Urgence"],
                      ["resp", "Pôle"],
                      ["cible", "Balance"],
                      ["projets", "Sur N-1"],
                      ["sante", "Âge"],
                      ["actifs", "Trésorerie"],
                    ] as [Colonne, string][]
                  ).map(([c, nom]) => (
                    <button key={c} type="button" role="menuitemcheckbox" aria-checked={montre(c)} className="var-menu-option" onClick={() => setMasquees((m) => (m.includes(c) ? m.filter((x) => x !== c) : [...m, c]))}>
                      <span>
                        {nom}
                        {montre(c) ? " ✓" : ""}
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
            </span>
            <button type="button" className="var-rond" aria-pressed={volet} aria-label={volet ? "Fermer le volet des totaux" : "Ouvrir le volet des totaux"} title={volet ? "Fermer le volet des totaux" : "Totaux des sociétés affichées (ou choisies)"} onClick={() => setVolet((x) => !x)}>
              <VarIcone nom="Volet" />
            </button>
          </div>
        </div>
      </header>

      <div className="var-i-cadre">
      <div className="var-defile var-i-defile">
        <div className="var-i-tete" role="row">
          <span />
          <span />
          <span>{enTete("nom", "Société", true)}</span>
          <span>{montre("statut") ? enTete("statut", "État") : null}</span>
          <span>{montre("urgence") ? enTete("urgence", "Urgence") : null}</span>
          <span>{montre("resp") ? "Pôle" : null}</span>
          <span>{montre("cible") ? enTete("cible", "Balance") : null}</span>
          <span>{montre("projets") ? "Sur N-1" : null}</span>
          <span>{montre("sante") ? enTete("sante", "Âge") : null}</span>
          <span>{montre("actifs") ? "Trésorerie" : null}</span>
          <span />
        </div>
        {g.erreur ? (
          <p className="var-i-vide" role="alert">
            La page du groupe n&apos;a pas pu être lue. {g.erreur}
          </p>
        ) : v.source === "reelle" && !g.reelles ? (
          <p className="var-i-vide">Lecture des balances…</p>
        ) : (
          <ul className="var-i-lignes">
            {g.lignes.length ? (
              <li>
                <div className="var-i-ligne">
                  <span />
                  <span className="var-i-case" />
                  <span className="var-i-titre">
                    <span className="var-i-icone" style={{ color: "var(--var-equipe)" }}>
                      <VarIcone nom="Factory" />
                    </span>
                    <span className="var-i-textes">
                      <span className="var-i-nom">Tout le groupe</span>
                      <span className="var-i-resume">
                        Ventes de {montant(t.ventes)}, résultat cumulé {montant(t.resultat)}, trésorerie {montant(t.tresorerie)} ; chiffres sociaux des dernières balances générales
                      </span>
                    </span>
                  </span>
                  <span className="var-i-c-statut">
                    {montre("statut") ? (
                      <span className="var-i-pilule">
                        <VarIcone nom={nombreSous ? "IssueStatusTriage" : "IssueStatusDone"} style={{ color: nombreSous ? "rgb(243, 127, 88)" : "lch(48 59.31 288.43)" }} />
                        <span>{nombreSous ? `${nombreSous} alerte${nombreSous > 1 ? "s" : ""}` : "À jour"}</span>
                      </span>
                    ) : null}
                  </span>
                  <span className="var-i-c-urgence" />
                  <span className="var-i-c-resp" />
                  <span className="var-i-c-cible" />
                  <span className="var-i-c-projets">
                    {montre("projets") ? (
                      <span className="var-i-projets" title="Sociétés au-dessus de leur plancher, sur le nombre de sociétés">
                        <VarIcone nom="Project" />
                        {g.lignes.length - nombreSous} / <strong>{g.lignes.length}</strong>
                      </span>
                    ) : null}
                  </span>
                  <span className="var-i-c-sante" />
                  <span className="var-i-c-actifs">
                    {montre("actifs") ? (
                      <span className="var-i-actifs">
                        <span className="var-i-pastille" style={{ ["--var-point" as string]: "lch(60 64.37 141.95)" }} title="Sociétés au-dessus de leur plancher">
                          <span className="var-i-point" />
                          {g.lignes.length - nombreSous}
                        </span>
                        {nombreSous ? (
                          <span className="var-i-pastille" style={{ ["--var-point" as string]: "lch(58% 73 29)" }} title="Sociétés sous leur plancher">
                            <span className="var-i-point" />
                            {nombreSous}
                          </span>
                        ) : null}
                      </span>
                    ) : null}
                  </span>
                  <span />
                </div>
              </li>
            ) : null}
            {lignes.map(ligne)}
            {onglet === "toutes"
              ? sansBalance.filter((s) => !pole || s.pole_id === pole).map((s) => (
                  <li key={s.entite_id}>
                    <div className="var-i-ligne" data-vise={s.entite_id === viseSociete ? "" : undefined}>
                      <span />
                      <span className="var-i-case" />
                      <span className="var-i-titre">
                        <span className="var-i-icone" style={{ color: "var(--var-t4)" }}>
                          <VarIcone nom="Initiative" />
                        </span>
                        <span className="var-i-textes">
                          <span className="var-i-nom">{s.nom}</span>
                          <span className="var-i-resume">Sans balance générale : déposez-en une pour voir ses ventes, son résultat et sa trésorerie</span>
                        </span>
                      </span>
                      <span className="var-i-c-statut">
                        {montre("statut") ? (
                          <span className="var-i-pilule">
                            <VarIcone nom="IssueStatusTodo" style={{ color: "var(--var-t3)" }} />
                            <span>À déposer</span>
                          </span>
                        ) : null}
                      </span>
                      <span className="var-i-c-urgence" />
                      <span className="var-i-c-resp">
                        {montre("resp") ? (
                          <span className="var-i-rond var-i-rond--resp" title={s.pole ?? "Sans pôle"}>
                            {s.pole ? <span className="var-i-avatar">{s.pole.charAt(0).toUpperCase()}</span> : <VarIcone nom="Unassigned" taille={18} />}
                          </span>
                        ) : null}
                      </span>
                      <span className="var-i-c-cible" />
                      <span className="var-i-c-projets" />
                      <span className="var-i-c-sante" />
                      <span className="var-i-c-actifs" />
                      <span />
                    </div>
                  </li>
                ))
              : null}
            {lignes.length === 0 && onglet !== "toutes" ? <li className="var-i-vide">Aucune société dans cette vue.</li> : null}
          </ul>
        )}
      </div>

      {volet ? (() => {
        const base = selection.length ? g.lignes.filter((l) => selection.includes(l.entite_id)) : lignes;
        const somme = (f: (l: PageSociete) => number) => base.reduce((x, l) => x + f(l), 0);
        const champs: [string, string][] = [
          ["Sociétés", String(base.length)],
          ["Ventes à date", montant(somme((l) => l.ventes))],
          ["Résultat", montant(somme((l) => l.resultat))],
          ["Trésorerie", montant(somme((l) => l.tresorerie))],
          ["Sous le plancher", String(base.filter((l) => l.sous_plancher).length)],
          ["Écart sur l'objectif", montant(somme((l) => l.ecart_objectif ?? 0))],
          ["Balance la plus ancienne", base.length ? `${Math.max(...base.map((l) => l.age_jours))} jours` : "–"],
        ];
        return (
          <aside className="var-b-volet" aria-label="Totaux">
            <p className="var-b-volet-titre">{selection.length ? "Totaux des sociétés choisies" : "Totaux des sociétés affichées"}</p>
            <dl className="var-b-volet-champs">
              {champs.map(([k, x]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{x}</dd>
                </div>
              ))}
            </dl>
          </aside>
        );
      })() : null}
      </div>

      {selection.length ? (
        <div className="var-i-barre" role="toolbar" aria-label="Actions sur les sociétés choisies">
          <span>
            {selection.length} choisie{selection.length > 1 ? "s" : ""}
          </span>
          {selection.length === 1 && g.peutObjectif ? (
            <button type="button" className="var-menu-option" onClick={() => { const l = g.lignes.find((x) => x.entite_id === selection[0]); if (l) g.setObjectif(l); }}>
              <VarIcone nom="Write" />
              Objectifs…
            </button>
          ) : null}
          <button
            type="button"
            className="var-menu-option"
            onClick={() => {
              const ch = g.lignes.filter((l) => selection.includes(l.entite_id));
              const n = exporterCsv("groupe-societes", ["Société", "Pôle", "Balance au", "Ventes", "Résultat", "Trésorerie", "Plancher", "Objectif à date", "Écart sur l'objectif", "Écart N-1 (%)"], ch.map((l) => [l.societe, l.pole, l.arrete_le, l.ventes, l.resultat, l.tresorerie, l.tresorerie_plancher, l.objectif_a_date, l.ecart_objectif, l.ecart_n1_pct]));
              v.setFait(`${n} société${n > 1 ? "s" : ""} exportée${n > 1 ? "s" : ""} en CSV.`);
            }}
          >
            <VarIcone nom="Page" />
            Exporter en CSV
          </button>
          <button
            type="button"
            className="var-menu-option"
            onClick={() => {
              const n = favoris.ajouter(g.lignes.filter((x) => selection.includes(x.entite_id)).map((l) => ({ cle: `societe:${l.entite_id}`, libelle: l.societe, href: `${RACINE}/varelo/groupe?societe=${encodeURIComponent(l.entite_id)}`, genre: "société" })));
              v.setFait(n ? `${n} société${n > 1 ? "s" : ""} épinglée${n > 1 ? "s" : ""} dans Ce matin.` : "Ces sociétés sont déjà épinglées dans Ce matin.");
            }}
          >
            <VarIcone nom="Etoile" />
            Épingler dans Ce matin
          </button>
          <button type="button" className="var-menu-option" onClick={() => setSelection([])}>
            <VarIcone nom="Points" />
            Effacer la sélection
          </button>
        </div>
      ) : null}

      {g.objectif ? <DialogueObjectif l={g.objectif} onFermer={() => g.setObjectif(null)} regler={g.regler} onFait={v.setFait} /> : null}
      <DialogueBalanceGenerale ouvert={g.depot} onFermer={() => g.setDepot(false)} societes={societes} deposer={g.deposer} onFait={v.setFait} />
    </VarCarte>
  );
}
