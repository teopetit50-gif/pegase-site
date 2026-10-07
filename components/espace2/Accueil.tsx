"use client";

/* Vue d'ensemble (07/10/2026) — refaite sur la maquette donnée par Teo :
   quatre chiffres en tête, la courbe des factures reçues, les tâches du
   jour, les factures à payer en priorité, l'activité récente, et un
   bandeau qui ouvre l'assistant. Tout est lu dans les mêmes données que
   « À payer » et « Activité » (exemple ou base réelle) ; aucune variation
   inventée : un chiffre sans historique n'affiche pas de flèche. */

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Building2, ChevronRight, Sparkles } from "lucide-react";
import { useSource } from "@/components/espace/source";
import { dateCourte, montant, relatif } from "@/components/espace/format";
import { A_PAYER, aPayer, groupeDe, minuit, totaux } from "./filed/calculs";
import { Badge, Squelette } from "./ui";
import { RACINE } from "./modules";
import { useDonnees } from "./donnees";
import { evenements } from "./evenements";
import { useOrganisation } from "./organisation";
import { ecrireStockage, useStockage } from "./Collection";
import "./habillage.css";

const JOURS = 30;
const CLE_TACHES = "espace2-collection-taches";

export default function Accueil() {
  const { source } = useSource();
  const { nom: organisation } = useOrganisation();
  const [aujourdhui] = useState(minuit);
  const { donnees, erreur } = useDonnees();

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
    /* la courbe : montant cumulé des documents reçus sur 30 jours */
    const debut = aujourdhui - (JOURS - 1) * 86_400_000;
    const parJour = Array.from({ length: JOURS }, () => 0);
    for (const d of donnees.docs) {
      const i = Math.floor((new Date(d.recu_le).setHours(0, 0, 0, 0) - debut) / 86_400_000);
      if (i >= 0 && i < JOURS) parJour[i] += d.montant ?? 0;
    }
    let cumul = 0;
    const courbe = parJour.map((v) => (cumul += v));
    return {
      aRegler,
      retard,
      priorite,
      courbe,
      debut,
      totalARegler: totaux(aRegler, etats),
      totalRetard: totaux(retard, etats),
      aValider: donnees.demandes.filter((d) => d.statut === "en_attente").length,
      aTraiter: donnees.docs.filter((d) => ["en_lecture", "a_classer", "a_traiter", "illisible"].includes(d.etat)).length,
      activite: evenements(donnees).slice(0, 5),
    };
  }, [donnees, aujourdhui]);

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
      <div className="v2-va-tete">
        <h1 className="v2-h2" style={{ fontSize: 20 }}>{organisation}</h1>
        <Badge moyen teinte={source === "reelle" ? "bleu" : "gris"}>
          {source === "reelle" ? "Base réelle" : "Données d'exemple"}
        </Badge>
      </div>
      {erreur ? <p className="v2-gris">La base n&apos;a pas répondu : {erreur}</p> : null}

      <section className="v2-carte v2-va-kpis" aria-label="Chiffres clés">
        {kpis.map((k) => (
          <Link key={k.libelle} href={k.lien} className="v2-va-kpi">
            <span className="v2-gris">{k.libelle}</span>
            {k.valeur === undefined ? <Squelette largeur={120} hauteur={32} /> : <strong data-alerte={k.alerte ? "" : undefined}>{k.valeur}</strong>}
            <small className="v2-gris">{k.sous}</small>
          </Link>
        ))}
      </section>

      <div className="v2-va-grille">
        <section className="v2-carte v2-carte-corps">
          <h2 className="v2-h2">Factures reçues</h2>
          <p className="v2-gris" style={{ margin: "2px 0 16px" }}>Montant cumulé des documents reçus sur les {JOURS} derniers jours</p>
          {c ? <Courbe valeurs={c.courbe} debut={c.debut} /> : <Squelette largeur="100%" hauteur={220} />}
        </section>

        <section className="v2-carte v2-carte-corps">
          <div className="v2-va-titre">
            <h2 className="v2-h2">Aujourd&apos;hui</h2>
            <span className="v2-gris">{duJour.length} tâche{duJour.length > 1 ? "s" : ""}</span>
          </div>
          {duJour.length ? (
            <ul className="v2-va-liste">
              {duJour.map((t) => (
                <li key={t.id}>
                  <input type="checkbox" aria-label={`Marquer « ${t.titre} » comme faite`} onChange={() => cocher(t.id)} />
                  <span className="v2-va-texte">
                    <span>{t.titre}</span>
                    <small className="v2-gris">{[t.qui, t.echeance ? dateCourte(t.echeance) : null].filter(Boolean).join(" · ") || "Sans échéance"}</small>
                  </span>
                  <Link href={`${RACINE}/taches`} aria-label="Ouvrir les tâches"><ChevronRight width={16} height={16} /></Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="v2-gris" style={{ margin: 0 }}>
              Aucune tâche ouverte. <Link href={`${RACINE}/taches`} className="v2-va-lien">Ajouter une tâche</Link>
            </p>
          )}
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
                  <small className="v2-gris v2-va-heure">{relatif(e.quand)}</small>
                  <span className="v2-va-texte">
                    <span>{e.quoi}</span>
                    <small className="v2-gris">{e.detail}</small>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
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

/* la courbe en aire, dessinée en SVG : pas de bibliothèque pour 30 points */
function Courbe({ valeurs, debut }: { valeurs: number[]; debut: number }) {
  const L = 600, H = 200, max = Math.max(1, ...valeurs);
  const pts = valeurs.map((v, i) => [(i / (valeurs.length - 1)) * L, H - (v / max) * (H - 10)] as const);
  const ligne = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const reperes = [0, 7, 14, 21, 29].map((i) => ({ x: (i / 29) * 100, texte: new Date(debut + i * 86_400_000).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) }));
  return (
    <figure style={{ margin: 0 }}>
      <svg viewBox={`0 0 ${L} ${H}`} preserveAspectRatio="none" style={{ width: "100%", height: 220, display: "block" }} role="img" aria-label={`Cumul sur ${valeurs.length} jours : ${montant(valeurs[valeurs.length - 1] ?? 0)}`}>
        <defs>
          <linearGradient id="v2-va-degrade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--v2-blue-700)" stopOpacity="0.35" />
            <stop offset="1" stopColor="var(--v2-blue-700)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((p) => <line key={p} x1="0" x2={L} y1={H * p} y2={H * p} stroke="var(--v2-a-400)" strokeWidth="1" vectorEffect="non-scaling-stroke" />)}
        <path d={`${ligne} L${L},${H} L0,${H} Z`} fill="url(#v2-va-degrade)" />
        <path d={ligne} fill="none" stroke="var(--v2-blue-700)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      </svg>
      <figcaption className="v2-va-axe">
        {reperes.map((r) => <span key={r.x} style={{ left: `${r.x}%` }}>{r.texte}</span>)}
      </figcaption>
    </figure>
  );
}
