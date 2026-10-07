"use client";

/* Vue d'ensemble (07/10/2026) — refaite sur la maquette donnée par Teo :
   quatre chiffres en tête, la courbe des factures reçues, les tâches du
   jour, les factures à payer en priorité, l'activité récente, et un
   bandeau qui ouvre l'assistant. Tout est lu dans les mêmes données que
   « À payer » et « Activité » (exemple ou base réelle) ; aucune variation
   inventée : un chiffre sans historique n'affiche pas de flèche. */

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Banknote, Building2, CheckCheck, ChevronRight, FileText, ListChecks, Sparkles } from "lucide-react";
import { dateCourte, montant, relatif } from "@/components/espace/format";
import { A_PAYER, aPayer, groupeDe, minuit, totaux } from "./filed/calculs";
import { Badge, Squelette } from "./ui";
import { RACINE } from "./modules";
import { useDonnees } from "./donnees";
import { evenements } from "./evenements";
import { ecrireStockage, useStockage } from "./Collection";
import "./habillage.css";

const CLE_TACHES = "espace2-collection-taches";

export default function Accueil() {
  const [aujourdhui] = useState(minuit);
  const { donnees, erreur } = useDonnees();
  const [periode, setPeriode] = useState(30);

  const c = useMemo(() => {
    if (!donnees) return null;
    const etats = donnees.etats;
    const aRegler = donnees.vue.factures.filter((f) => A_PAYER.has(f.statut) && f.nature !== "avoir" && etats[f.id]?.etat !== "payee");
    const retard = aRegler.filter((f) => groupeDe(f, aujourdhui) === "retard");
    const nomFournisseur = (id: string | null) => donnees.vue.fournisseurs.find((x) => x.id === id)?.nom ?? "Fournisseur inconnu";
    const priorite = aRegler
      .slice()
      .sort((a, b) => (a.echeance_lue ?? "9999").localeCompare(b.echeance_lue ?? "9999"))
      .slice(0, 5)
      .map((f) => ({ f, nom: nomFournisseur(f.fournisseur_id), groupe: groupeDe(f, aujourdhui), reste: aPayer(f, etats) }));
    /* la courbe : montant des documents reçus, en somme glissante sur 7
       jours (une courbe lisible, pas des marches) */
    const debut = aujourdhui - (periode - 1) * 86_400_000;
    const parJour = Array.from({ length: periode + 6 }, () => 0);
    for (const d of donnees.docs) {
      const i = Math.floor((new Date(d.recu_le).setHours(0, 0, 0, 0) - (debut - 6 * 86_400_000)) / 86_400_000);
      if (i >= 0 && i < parJour.length) parJour[i] += d.montant ?? 0;
    }
    const courbe = Array.from({ length: periode }, (_, i) => parJour.slice(i, i + 7).reduce((a, b) => a + b, 0));
    /* aujourd'hui : ce qui demande une action — échéances proches, accords */
    const actions = [
      ...aRegler
        .filter((f) => ["retard", "semaine"].includes(groupeDe(f, aujourdhui)))
        .map((f) => ({ id: f.id, titre: `Payer ${nomFournisseur(f.fournisseur_id)}`, sous: `${groupeDe(f, aujourdhui) === "retard" ? "En retard" : "Échéance"} · ${f.echeance_lue ? dateCourte(f.echeance_lue) : ""}`, lien: `${RACINE}/filed/a-payer` })),
      ...donnees.demandes
        .filter((d) => d.statut === "en_attente")
        .map((d) => ({ id: d.id, titre: `Valider : ${d.resume}`, sous: d.montant !== null ? `À valider · ${montant(d.montant, d.devise)}` : "À valider", lien: `${RACINE}/validations` })),
    ];
    return {
      aRegler,
      retard,
      priorite,
      courbe,
      debut,
      actions,
      totalARegler: totaux(aRegler, etats),
      totalRetard: totaux(retard, etats),
      aValider: donnees.demandes.filter((d) => d.statut === "en_attente").length,
      aTraiter: donnees.docs.filter((d) => ["en_lecture", "a_classer", "a_traiter", "illisible"].includes(d.etat)).length,
      activite: evenements(donnees).slice(0, 5),
    };
  }, [donnees, aujourdhui, periode]);

  /* les tâches de l'équipe (page Tâches, gardées sur l'appareil) */
  const brut = useStockage(CLE_TACHES);
  const taches = useMemo(() => {
    try {
      const v = JSON.parse(brut || "[]");
      return Array.isArray(v) ? (v as { id: string; titre?: string; echeance?: string; qui?: string; fait?: boolean }[]) : [];
    } catch {
      return [];
    }
  }, [brut]);
  const duJour = taches.filter((t) => !t.fait).slice(0, 4);
  const cocher = (id: string) => ecrireStockage(CLE_TACHES, JSON.stringify(taches.map((t) => (t.id === id ? { ...t, fait: true } : t))));
  const enRetard = taches.filter((t) => !t.fait && t.echeance && new Date(t.echeance).getTime() < aujourdhui).length;

  const kpis = [
    { libelle: "Reste à payer", valeur: c?.totalARegler, sous: c ? `${c.aRegler.length} facture${c.aRegler.length > 1 ? "s" : ""} validée${c.aRegler.length > 1 ? "s" : ""}` : "", lien: `${RACINE}/filed/a-payer` },
    { libelle: "En retard", valeur: c?.totalRetard, sous: c ? `${c.retard.length} échéance${c.retard.length > 1 ? "s" : ""} dépassée${c.retard.length > 1 ? "s" : ""}` : "", lien: `${RACINE}/filed/a-payer`, alerte: !!c?.retard.length },
    { libelle: "À valider", valeur: c ? String(c.aValider) : undefined, sous: "demandes en attente de votre accord", lien: `${RACINE}/validations` },
    { libelle: "Tâches en retard", valeur: String(enRetard), sous: `${duJour.length} tâche${duJour.length > 1 ? "s" : ""} ouverte${duJour.length > 1 ? "s" : ""}`, lien: `${RACINE}/taches` },
  ];

  return (
    <div className="v2-page v2-arrivee v2-va">
      <h1 className="v2-sr">Vue d&apos;ensemble</h1>
      {erreur ? <p className="v2-gris">La base n&apos;a pas répondu : {erreur}</p> : null}

      <section className="v2-va-kpis" aria-label="Chiffres clés">
        {kpis.map((k) => (
          <Link key={k.libelle} href={k.lien} className="v2-va-kpi" data-alerte={k.alerte ? "" : undefined}>
            <span className="v2-va-kpi-libelle">{k.libelle}</span>
            {k.valeur === undefined ? <Squelette largeur={120} hauteur={32} /> : <strong data-alerte={k.alerte ? "" : undefined}>{k.valeur}</strong>}
            <small className="v2-gris v2-va-kpi-sous">{k.sous}</small>
          </Link>
        ))}
      </section>

      <div className="v2-va-grille">
        <div className="v2-va-col">
        <section className="v2-carte v2-carte-corps">
          <div className="v2-va-titre" style={{ marginBottom: 16 }}>
            <div>
              <h2 className="v2-h2">Factures reçues</h2>
              <p className="v2-gris v2-va-sous">Montant reçu sur 7 jours glissants</p>
            </div>
            <span className="v2-champ v2-va-periode">
              <select value={periode} onChange={(e) => setPeriode(Number(e.target.value))} aria-label="Période">
                <option value={7}>7 derniers jours</option>
                <option value={30}>30 derniers jours</option>
                <option value={90}>90 derniers jours</option>
              </select>
            </span>
          </div>
          {c ? <Courbe valeurs={c.courbe} debut={c.debut} /> : <Squelette largeur="100%" hauteur={220} />}
        </section>

        <section className="v2-carte v2-carte-corps">
          <div className="v2-va-titre">
            <h2 className="v2-h2">À payer en priorité</h2>
            <Link href={`${RACINE}/filed/a-payer`} className="v2-va-lien">Voir tout <ArrowRight width={14} height={14} /></Link>
          </div>
          {!c ? <Squelette largeur="100%" hauteur={200} /> : c.priorite.length === 0 ? (
            <p className="v2-gris" style={{ margin: 0 }}>Aucune facture à payer.</p>
          ) : (
            <div className="v2-tableau-cadre">
              <table className="v2-va-table">
                <thead>
                  <tr><th>Fournisseur</th><th>Échéance</th><th>État</th><th style={{ textAlign: "right" }}>Reste à payer</th><th aria-hidden="true" /></tr>
                </thead>
                <tbody>
                  {c.priorite.map(({ f, nom, groupe, reste }) => (
                    <tr key={f.id}>
                      <td><span className="v2-va-fournisseur"><Building2 width={18} height={18} aria-hidden="true" />{nom}</span></td>
                      <td className="v2-gris">{f.echeance_lue ? dateCourte(f.echeance_lue) : "—"}</td>
                      <td><Badge teinte={groupe === "retard" ? "rouge" : groupe === "semaine" ? "ambre" : "gris"}>{groupe === "retard" ? "En retard" : groupe === "semaine" ? "Cette semaine" : "À venir"}</Badge></td>
                      <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{montant(reste, f.devise)}</td>
                      <td><Link href={`${RACINE}/filed/a-payer`} aria-label={`Ouvrir la facture de ${nom}`}><ChevronRight width={16} height={16} /></Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        </div>
        <div className="v2-va-col">
        <section className="v2-carte v2-carte-corps">
          <div className="v2-va-titre">
            <h2 className="v2-h2">Aujourd&apos;hui</h2>
            <span className="v2-gris">{(c?.actions.length ?? 0) + duJour.length} à faire</span>
          </div>
          {!c ? <Squelette largeur="100%" hauteur={200} /> : c.actions.length + duJour.length === 0 ? (
            <p className="v2-gris" style={{ margin: 0 }}>
              Rien d&apos;urgent aujourd&apos;hui. <Link href={`${RACINE}/taches`} className="v2-va-lien">Ajouter une tâche</Link>
            </p>
          ) : (
            <ul className="v2-va-liste">
              {duJour.map((t) => (
                <li key={t.id}>
                  <input type="checkbox" aria-label={`Marquer « ${t.titre} » comme faite`} onChange={() => cocher(t.id)} />
                  <span className="v2-va-texte">
                    <span>{t.titre}</span>
                    <small className="v2-gris">{["Tâche", t.qui, t.echeance ? dateCourte(t.echeance) : null].filter(Boolean).join(" · ")}</small>
                  </span>
                  <Link href={`${RACINE}/taches`} aria-label="Ouvrir les tâches"><ChevronRight width={16} height={16} /></Link>
                </li>
              ))}
              {c.actions.slice(0, Math.max(0, 5 - duJour.length)).map((x) => (
                <li key={x.id}>
                  <span className="v2-va-pastille" aria-hidden="true">{x.titre.startsWith("Payer") ? <Banknote width={14} height={14} /> : <CheckCheck width={14} height={14} />}</span>
                  <span className="v2-va-texte">
                    <span>{x.titre}</span>
                    <small className="v2-gris">{x.sous}</small>
                  </span>
                  <Link href={x.lien} aria-label={`Ouvrir : ${x.titre}`}><ChevronRight width={16} height={16} /></Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="v2-carte v2-carte-corps">
          <div className="v2-va-titre">
            <h2 className="v2-h2">Activité récente</h2>
            <Link href={`${RACINE}/activite`} className="v2-va-lien">Voir tout</Link>
          </div>
          {!c ? <Squelette largeur="100%" hauteur={200} /> : c.activite.length === 0 ? (
            <p className="v2-gris" style={{ margin: 0 }}>Rien pour l&apos;instant.</p>
          ) : (
            <ul className="v2-va-liste">
              {c.activite.map((e) => (
                <li key={e.id}>
                  <span className="v2-va-pastille" aria-hidden="true">{e.quoi === "Document reçu" ? <FileText width={14} height={14} /> : e.quoi === "Décision" ? <ListChecks width={14} height={14} /> : <CheckCheck width={14} height={14} />}</span>
                  <small className="v2-gris v2-va-heure" title={relatif(e.quand)}>{heureCourte(e.quand)}</small>
                  <span className="v2-va-texte">
                    <span>{e.quoi}</span>
                    <small className="v2-gris">{e.detail}{e.par ? ` · par ${e.par}` : ""}</small>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
        </div>
      </div>

      <section className="v2-carte v2-carte-corps v2-va-ia">
        <div>
          <p className="v2-va-ia-marque"><Sparkles width={14} height={14} aria-hidden="true" /> Assistant Omega</p>
          <h2 className="v2-h2">Demandez à l&apos;assistant de préparer votre journée.</h2>
          <p className="v2-gris" style={{ margin: 0 }}>Rédiger une relance, résumer un document, organiser vos tâches : posez la question, il répond en quelques secondes.</p>
        </div>
        <button type="button" className="v2-btn v2-btn--primaire" onClick={() => window.dispatchEvent(new Event("espace2-assistant"))}>
          Ouvrir l&apos;assistant <ArrowRight width={16} height={16} aria-hidden="true" />
        </button>
      </section>
    </div>
  );
}

/* « 10:24 », « Hier 16:12 », sinon « 3 oct. » */
function heureCourte(iso: string): string {
  const d = new Date(iso);
  const j = new Date();
  const h = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  if (d.toDateString() === j.toDateString()) return h;
  j.setDate(j.getDate() - 1);
  if (d.toDateString() === j.toDateString()) return `Hier ${h}`;
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

const kEuros = (v: number) => (v >= 1000 ? `${Math.round(v / 100) / 10} k€` : `${Math.round(v)} €`);

/* la courbe en aire, dessinée en SVG (lissée, axe des montants à gauche) */
function Courbe({ valeurs, debut }: { valeurs: number[]; debut: number }) {
  const L = 600, H = 200, n = valeurs.length;
  const brut = Math.max(1, ...valeurs);
  const pas = Math.pow(10, Math.floor(Math.log10(brut)));
  const max = Math.ceil(brut / pas) * pas;
  const pts = valeurs.map((v, i) => [(i / Math.max(1, n - 1)) * L, H - (v / max) * H] as const);
  /* Catmull-Rom → Bézier : une courbe douce qui passe par chaque point */
  let ligne = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] ?? p2;
    const c1y = Math.min(H, p1[1] + (p2[1] - p0[1]) / 6), c2y = Math.min(H, p2[1] - (p3[1] - p1[1]) / 6);
    ligne += ` C${p1[0] + (p2[0] - p0[0]) / 6},${c1y} ${p2[0] - (p3[0] - p1[0]) / 6},${c2y} ${p2[0]},${p2[1]}`;
  }
  const reperes = [0, 0.25, 0.5, 0.75, 1].map((p) => {
    const i = Math.round(p * (n - 1));
    return { x: p * 100, texte: new Date(debut + i * 86_400_000).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) };
  });
  return (
    <figure className="v2-va-courbe">
      <div className="v2-va-axe-y" aria-hidden="true">
        {[1, 0.75, 0.5, 0.25, 0].map((p) => <span key={p}>{kEuros(max * p)}</span>)}
      </div>
      <div style={{ minWidth: 0 }}>
        <svg viewBox={`0 0 ${L} ${H}`} preserveAspectRatio="none" style={{ width: "100%", height: 200, display: "block", overflow: "visible" }} role="img" aria-label={`Montant reçu sur 7 jours glissants, dernier point : ${montant(valeurs[n - 1] ?? 0)}`}>
          <defs>
            <linearGradient id="v2-va-degrade" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="var(--v2-blue-700)" stopOpacity="0.4" />
              <stop offset="1" stopColor="var(--v2-blue-700)" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          {[0, 0.25, 0.5, 0.75, 1].map((p) => <line key={p} x1="0" x2={L} y1={H * p} y2={H * p} stroke="var(--v2-a-300, var(--v2-a-400))" strokeWidth="1" vectorEffect="non-scaling-stroke" />)}
          <path d={`${ligne} L${L},${H} L0,${H} Z`} fill="url(#v2-va-degrade)" />
          <path d={ligne} fill="none" stroke="var(--v2-blue-700)" strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        </svg>
        <div className="v2-va-axe">
          {reperes.map((r) => <span key={r.x} style={{ left: `${r.x}%` }}>{r.texte}</span>)}
        </div>
      </div>
    </figure>
  );
}
