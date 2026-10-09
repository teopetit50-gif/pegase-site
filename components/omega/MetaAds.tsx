"use client";

/* ══════════════════════════════════════════════════════════════════════
   Le tableau Meta Ads (09/10/2026) — « faire des recherches sur comment
   ça marche et créer une page pour tracker ça ».

   Une ligne de omega_lignes (tableau « meta ») = les chiffres d'UNE
   publicité sur UNE semaine, recopiés du Gestionnaire de publicités le
   lundi : dépensé, impressions, portée, clics sur le lien, prospects
   (formulaires), puis ce qui ne se voit que chez nous : audits calés,
   clients signés. Tout le reste se calcule ici :
     CPM = dépensé / impressions × 1000 ; CTR = clics / impressions ;
     CPC = dépensé / clics ; fréquence = impressions / portée ;
     coût par prospect, par audit, par client.
   Le diagnostic applique les règles du guide « Comment marche Meta Ads »
   (même page, sélecteur ⌃⌄) : apprentissage, fatigue, accroche, page
   d'atterrissage, rappel des prospects, couper ou augmenter. Le coût
   maximum accepté par audit se règle ici (tableau « meta-seuils »).

   Un écran, sans section ajoutée sous la page : la campagne et la
   période se choisissent avec ⌃⌄.
   ══════════════════════════════════════════════════════════════════════ */

import { useState } from "react";
import { CalendarRange, ChevronsUpDown, LayoutGrid, Megaphone, Plus, Trash2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ItemMenu, MenuDeroulant, SectionMenu } from "@/components/espace2/ui";
import type { Ligne } from "./Tableaux";
import { Colonnes, Mesure } from "./Mesures";

const I = { width: 16, height: 16, strokeWidth: 1.6, "aria-hidden": true } as const;
const CHAMPS = ["Dépensé (€)", "Impressions", "Portée", "Clics sur le lien", "Prospects", "Audits calés", "Clients signés"] as const;
type Champ = (typeof CHAMPS)[number];
const nb = (v: string | undefined) => Number((v ?? "").replace(/\s/g, "").replace(",", ".").replace(/[^\d.-]/g, "")) || 0;
const euros = (n: number | null, dec = 0) => (n === null || !isFinite(n) ? "—" : `${n.toLocaleString("fr-FR", { maximumFractionDigits: dec, minimumFractionDigits: dec })} €`);
const pct = (n: number | null) => (n === null || !isFinite(n) ? "—" : `${(n * 100).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} %`);
const div = (a: number, b: number) => (b ? a / b : null);

type Totaux = Record<Champ, number>;
const vide = (): Totaux => Object.fromEntries(CHAMPS.map((c) => [c, 0])) as Totaux;
function cumul(ls: Ligne[]): Totaux {
  const t = vide();
  for (const l of ls) for (const c of CHAMPS) t[c] += nb(l.donnees[c]);
  return t;
}
const mesures = (t: Totaux) => ({
  cpm: div(t["Dépensé (€)"] * 1000, t["Impressions"]),
  ctr: div(t["Clics sur le lien"], t["Impressions"]),
  cpc: div(t["Dépensé (€)"], t["Clics sur le lien"]),
  freq: div(t["Impressions"], t["Portée"]),
  cpp: div(t["Dépensé (€)"], t["Prospects"]),
  cpa: div(t["Dépensé (€)"], t["Audits calés"]),
  cpcl: div(t["Dépensé (€)"], t["Clients signés"]),
  clicVersProspect: div(t["Prospects"], t["Clics sur le lien"]),
  prospectVersAudit: div(t["Audits calés"], t["Prospects"]),
});

type Verdict = { ton: "vert" | "bleu" | "rouge" | "gris"; titre: string; detail: string };

/* les règles du guide, de la plus urgente à la plus douce, sur les semaines d'une publicité (la plus récente en dernier) */
function diagnostic(semaines: Ligne[], coutMax: number): Verdict {
  const t = cumul(semaines);
  const m = mesures(t);
  const derniere = semaines[semaines.length - 1];
  const md = mesures(cumul([derniere]));
  const premiere = mesures(cumul([semaines[0]]));
  const cpaSemaine = (l: Ligne) => div(nb(l.donnees["Dépensé (€)"]), nb(l.donnees["Audits calés"]));
  if (semaines.length < 2 && t["Dépensé (€)"] < coutMax * 2)
    return { ton: "gris", titre: "Trop tôt : ne touche à rien", detail: "Meta apprend encore. Toute modification (budget, audience, visuel) relance l'apprentissage. Juge après 7 jours pleins et au moins deux fois le coût max d'un audit dépensé." };
  const deuxDernieres = semaines.slice(-2);
  if (deuxDernieres.length === 2 && deuxDernieres.every((l) => { const c = cpaSemaine(l); return c === null ? nb(l.donnees["Dépensé (€)"]) > coutMax : c > coutMax; }))
    return { ton: "rouge", titre: "Couper", detail: `Deux semaines de suite au-dessus de ${euros(coutMax)} par audit calé (ou sans audit). Coupe, garde l'argent pour une nouvelle accroche.` };
  if ((md.freq ?? 0) > 3 && premiere.ctr && md.ctr !== null && md.ctr < premiere.ctr * 0.8)
    return { ton: "rouge", titre: "Fatigue : change le visuel", detail: `Fréquence ${md.freq?.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} et taux de clic en baisse de plus de 20 % depuis la première semaine. Les mêmes personnes voient la pub trop souvent : nouvelle accroche ou nouveau visuel, même offre.` };
  if (m.ctr !== null && t["Impressions"] > 2000 && m.ctr < 0.008)
    return { ton: "rouge", titre: "L'accroche n'arrête pas le pouce", detail: `Taux de clic de ${pct(m.ctr)} (sous 0,8 %). Le problème est dans les 3 premières secondes : refais l'ouverture de la vidéo ou l'image, pas l'audience.` };
  if (m.clicVersProspect !== null && t["Clics sur le lien"] >= 30 && m.clicVersProspect < 0.05)
    return { ton: "bleu", titre: "La page perd les gens", detail: `Seuls ${pct(m.clicVersProspect)} des clics laissent leurs coordonnées. La pub fait son travail ; raccourcis la page d'atterrissage (un seul bouton) ou passe au formulaire Meta.` };
  if (m.prospectVersAudit !== null && t["Prospects"] >= 5 && m.prospectVersAudit < 0.2)
    return { ton: "bleu", titre: "Les prospects ne calent pas d'audit", detail: `${pct(m.prospectVersAudit)} des prospects calent un audit. Rappelle chaque prospect dans l'heure : passé ce délai, il a oublié la pub.` };
  if (m.cpa !== null && m.cpa <= coutMax * 0.7 && semaines.length >= 2)
    return { ton: "vert", titre: "Augmenter doucement", detail: `${euros(m.cpa)} par audit, bien sous ton plafond. Monte le budget de 20 % au plus, tous les 3 à 4 jours, pour ne pas relancer l'apprentissage.` };
  return { ton: "vert", titre: "Garder", detail: "Dans les clous. Relève les chiffres lundi prochain et prépare déjà deux visuels de rechange." };
}

export default function MetaAds({ lignes: initiales, selecteur }: { lignes: Ligne[]; selecteur: React.ReactNode }) {
  const [lignes, setLignes] = useState(initiales);
  const [campagne, setCampagne] = useState<string | null>(null);
  const [periode, setPeriode] = useState<number>(4);
  const [saisie, setSaisie] = useState(false);
  const [etat, setEtat] = useState("");
  const [aujourdhui] = useState(() => new Date());

  const releves = lignes.filter((l) => l.tableau === "meta").sort((a, b) => (a.donnees["Semaine"] ?? "").localeCompare(b.donnees["Semaine"] ?? ""));
  const seuils = lignes.find((l) => l.tableau === "meta-seuils");
  const coutMax = nb(seuils?.donnees["Coût max par audit (€)"]) || 60;
  const campagnes = [...new Set([...lignes.filter((l) => l.tableau === "pubs").map((l) => l.donnees["Campagne"]), ...releves.map((l) => l.donnees["Campagne"])].filter(Boolean))] as string[];

  const limite = periode ? new Date(aujourdhui.getTime() - periode * 7 * 86400000).toISOString().slice(0, 10) : "";
  const visibles = releves.filter((l) => (!campagne || l.donnees["Campagne"] === campagne) && (!limite || (l.donnees["Semaine"] ?? "") >= limite));
  const t = cumul(visibles);
  const m = mesures(t);

  /* une publicité = campagne + publicité ; son diagnostic porte sur toutes ses semaines */
  const pubs = [...new Set(visibles.map((l) => `${l.donnees["Campagne"]}\u0000${l.donnees["Publicité"] ?? ""}`))].map((cle) => {
    const [c, p] = cle.split("\u0000");
    const semaines = releves.filter((l) => l.donnees["Campagne"] === c && (l.donnees["Publicité"] ?? "") === p);
    return { c, p, semaines, verdict: diagnostic(semaines, coutMax), cpa: mesures(cumul(semaines)).cpa };
  });

  async function enregistrerSeuil(v: string) {
    const donnees = { "Coût max par audit (€)": v };
    const sb = createClient().from("omega_lignes");
    const r = seuils ? await sb.update({ donnees, maj: new Date().toISOString() }).eq("id", seuils.id).select("id, tableau, ordre, donnees").single() : await sb.insert({ tableau: "meta-seuils", ordre: 1, donnees }).select("id, tableau, ordre, donnees").single();
    if (r.error || !r.data) return setEtat("Échec de l'enregistrement du plafond.");
    setLignes((ls) => [...ls.filter((l) => l.tableau !== "meta-seuils"), r.data as Ligne]);
    setEtat(`Plafond : ${v} € par audit`);
  }

  async function ajouter(donnees: Record<string, string>) {
    const ordre = Math.max(0, ...releves.map((l) => l.ordre)) + 1;
    const { data, error } = await createClient().from("omega_lignes").insert({ tableau: "meta", ordre, donnees }).select("id, tableau, ordre, donnees").single();
    if (error || !data) return setEtat("Échec de l'ajout : vérifiez votre connexion.");
    setLignes((ls) => [...ls, data as Ligne]);
    setSaisie(false);
    setEtat("Semaine relevée");
  }

  async function supprimer(id: string) {
    if (!window.confirm("Supprimer ce relevé ?")) return;
    const { error } = await createClient().from("omega_lignes").delete().eq("id", id);
    if (error) return setEtat("Échec de la suppression.");
    setLignes((ls) => ls.filter((l) => l.id !== id));
  }

  const PERIODES: [number, string][] = [[4, "4 dernières semaines"], [12, "12 dernières semaines"], [0, "Depuis le début"]];

  return (
    <div className="v2-page v2-arrivee v2-val om-meta">
      <h1 className="v2-sr">Tableau Meta Ads</h1>

      <div className="v2-val-filtres">
        {selecteur}
        <MenuDeroulant
          etiquette={`Campagne : ${campagne ?? "Toutes les campagnes"}. Changer de campagne`}
          classe="v2-portee om-portee-secteur"
          placement="bottom start"
          largeur={320}
          declencheur={
            <>
              {campagne ? <Megaphone {...I} /> : <LayoutGrid {...I} />}
              <span className="v2-portee-nom">{campagne ?? "Toutes les campagnes"}</span>
              <ChevronsUpDown width={14} height={14} aria-hidden="true" />
            </>
          }
        >
          <ItemMenu id="toutes" textValue="Toutes les campagnes" icone={<LayoutGrid {...I} />} onAction={() => setCampagne(null)}>
            Toutes les campagnes
          </ItemMenu>
          <SectionMenu titre="Campagnes">
            {campagnes.map((c) => (
              <ItemMenu key={c} id={c} textValue={c} icone={<Megaphone {...I} />} onAction={() => setCampagne(c)}>
                {c}
              </ItemMenu>
            ))}
          </SectionMenu>
        </MenuDeroulant>
        <MenuDeroulant
          etiquette="Changer de période"
          classe="v2-portee om-portee-secteur"
          placement="bottom start"
          largeur={240}
          declencheur={
            <>
              <CalendarRange {...I} />
              <span className="v2-portee-nom">{PERIODES.find(([n]) => n === periode)?.[1]}</span>
              <ChevronsUpDown width={14} height={14} aria-hidden="true" />
            </>
          }
        >
          {PERIODES.map(([n, l]) => (
            <ItemMenu key={n} id={`p${n}`} textValue={l} onAction={() => setPeriode(n)}>
              {l}
            </ItemMenu>
          ))}
        </MenuDeroulant>
        <label className="om-meta-seuil v2-gris">
          Coût max par audit
          <input key={coutMax} className="om-formation-champ" inputMode="numeric" defaultValue={String(coutMax)} aria-label="Coût maximum accepté par audit calé, en euros" onBlur={(e) => e.target.value.trim() && e.target.value.trim() !== String(coutMax) && enregistrerSeuil(e.target.value.trim())} />€
        </label>
        <button type="button" className="v2-val-bouton om-pousse" onClick={() => setSaisie((s) => !s)}>
          {saisie ? <X width={14} height={14} aria-hidden="true" /> : <Plus width={14} height={14} aria-hidden="true" />}
          {saisie ? "Fermer" : "Relever une semaine"}
        </button>
      </div>

      <p className="om-etat" role="status">
        {etat}
      </p>

      <section className="v2-carte om-meta-haut">
        <div className="om-mesures">
          <Mesure libelle="Dépensé" valeur={euros(t["Dépensé (€)"])} ratio={null} pied={<span className="v2-gris">{t["Impressions"].toLocaleString("fr-FR")} impressions · CPM {euros(m.cpm, 2)}</span>} />
          <Mesure libelle="Coût par audit calé" valeur={euros(m.cpa)} ratio={m.cpa ? coutMax / m.cpa : null} pied={<span className="v2-gris">{t["Audits calés"]} audits · plafond {euros(coutMax)}</span>} />
          <Mesure libelle="Taux de clic (lien)" valeur={pct(m.ctr)} ratio={m.ctr === null ? null : m.ctr / 0.01} pied={<span className="v2-gris">{t["Clics sur le lien"]} clics · CPC {euros(m.cpc, 2)}</span>} />
          <Mesure libelle="Fréquence" valeur={m.freq === null ? "—" : m.freq.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} ratio={m.freq ? 3 / m.freq : null} pied={<span className="v2-gris">{t["Portée"].toLocaleString("fr-FR")} personnes touchées</span>} />
        </div>
        <Colonnes
          colonnes={[
            { ton: "rouge", titre: "À couper", vide: "Aucune pub à couper.", elements: pubs.filter((x) => x.verdict.ton === "rouge").map((x) => ({ nom: x.p || x.c, chiffre: x.cpa === null ? "0 audit" : `${euros(x.cpa)} / audit`, detail: x.verdict.titre })) },
            { ton: "orange", titre: "À corriger", vide: "Rien à corriger.", elements: pubs.filter((x) => x.verdict.ton === "bleu").map((x) => ({ nom: x.p || x.c, chiffre: x.cpa === null ? "0 audit" : `${euros(x.cpa)} / audit`, detail: x.verdict.titre })) },
            { ton: "vert", titre: "Bon ou en apprentissage", vide: "Le diagnostic apparaît dès le premier relevé.", elements: pubs.filter((x) => x.verdict.ton === "vert" || x.verdict.ton === "gris").map((x) => ({ nom: x.p || x.c, chiffre: x.cpa === null ? "—" : `${euros(x.cpa)} / audit`, detail: x.verdict.titre })) },
          ]}
        />
      </section>

      <div className="om-meta-grille">
        <section className="v2-carte om-section om-meta-releves">
          {saisie ? <Saisie campagnes={campagnes} campagne={campagne} onValider={ajouter} /> : null}
          <div className="v2-tableau-cadre om-tableau-cadre">
            <table className="v2-tableau om-grille om-semaine-grille">
              <thead>
                <tr>
                  <th>Semaine</th>
                  <th>Publicité</th>
                  <th>Dépensé</th>
                  <th>CTR</th>
                  <th>Fréq.</th>
                  <th>Prospects</th>
                  <th>Audits</th>
                  <th>€ / audit</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {visibles.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="v2-gris">
                      Aucun relevé sur la période. Chaque lundi : Gestionnaire de publicités → colonnes « Performance et clics » → « Relever une semaine ».
                    </td>
                  </tr>
                ) : (
                  [...visibles].reverse().map((l) => {
                    const x = mesures(cumul([l]));
                    return (
                      <tr key={l.id}>
                        <td>{l.donnees["Semaine"] ? new Date(l.donnees["Semaine"]).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) : "—"}</td>
                        <td>
                          {l.donnees["Publicité"] || "—"}
                          {campagne ? null : <small className="v2-gris om-meta-campagne">{l.donnees["Campagne"]}</small>}
                        </td>
                        <td>{euros(nb(l.donnees["Dépensé (€)"]))}</td>
                        <td>{pct(x.ctr)}</td>
                        <td>{x.freq === null ? "—" : x.freq.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}</td>
                        <td>{nb(l.donnees["Prospects"])}</td>
                        <td>{nb(l.donnees["Audits calés"])}</td>
                        <td>{euros(x.cpa)}</td>
                        <td>
                          <button type="button" className="v2-btn v2-btn--petit v2-btn--icone v2-btn--fantome" aria-label="Supprimer le relevé" onClick={() => supprimer(l.id)}>
                            <Trash2 width={14} height={14} aria-hidden="true" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="v2-carte om-meta-diag" aria-label="Diagnostic">
          <div className="om-section-tete">
            <h2 className="v2-val-groupe">Que faire de chaque pub</h2>
          </div>
          <Entonnoir t={t} />
          <ul>
            {pubs.length === 0 ? <li className="v2-gris">Le diagnostic apparaît dès le premier relevé.</li> : null}
            {pubs.map((x) => (
              <li key={`${x.c}${x.p}`}>
                <span className="om-etape" data-teinte={x.verdict.ton}>
                  {x.verdict.titre}
                </span>
                <strong>{x.p || x.c}</strong>
                <p>{x.verdict.detail}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

/* impressions → clics → prospects → audits → clients, avec le passage d'une marche à l'autre */
function Entonnoir({ t }: { t: Totaux }) {
  const marches: [string, number][] = [["Impressions", t["Impressions"]], ["Clics", t["Clics sur le lien"]], ["Prospects", t["Prospects"]], ["Audits", t["Audits calés"]], ["Clients", t["Clients signés"]]];
  return (
    <ol className="om-entonnoir">
      {marches.map(([l, v], i) => (
        <li key={l}>
          <strong>{v.toLocaleString("fr-FR")}</strong>
          <span>{l}</span>
          {i ? <small className="v2-gris">{pct(div(v, marches[i - 1][1]))}</small> : <small className="v2-gris">&nbsp;</small>}
        </li>
      ))}
    </ol>
  );
}

function Saisie({ campagnes, campagne, onValider }: { campagnes: string[]; campagne: string | null; onValider: (d: Record<string, string>) => void }) {
  const [semaine] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7) - 7);
    return d.toISOString().slice(0, 10);
  });
  return (
    <form
      className="om-meta-saisie"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        onValider(Object.fromEntries([...f.entries()].map(([k, v]) => [k, String(v).trim()])));
      }}
    >
      <label>
        <span>Semaine du</span>
        <input className="om-formation-champ" type="date" name="Semaine" defaultValue={semaine} required />
      </label>
      <label>
        <span>Campagne</span>
        <input className="om-formation-champ" name="Campagne" list="om-meta-campagnes" defaultValue={campagne ?? campagnes[0] ?? ""} required />
        <datalist id="om-meta-campagnes">
          {campagnes.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </label>
      <label>
        <span>Publicité</span>
        <input className="om-formation-champ" name="Publicité" placeholder="ex. Vidéo calcul impayés" />
      </label>
      {CHAMPS.map((c) => (
        <label key={c}>
          <span>{c}</span>
          <input className="om-formation-champ" name={c} inputMode="decimal" defaultValue="0" />
        </label>
      ))}
      <button type="submit" className="v2-btn v2-btn--primaire v2-btn--petit">
        Enregistrer
      </button>
    </form>
  );
}
