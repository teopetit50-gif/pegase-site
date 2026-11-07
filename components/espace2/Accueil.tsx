"use client";

/* Vue d'ensemble (07/10/2026) — refaite sur la maquette donnée par Teo :
   quatre chiffres en tête, la courbe des factures reçues, les tâches du
   jour, les factures à payer en priorité, l'activité récente, et un
   bandeau qui ouvre l'assistant. Tout est lu dans les mêmes données que
   « À payer » et « Activité » (exemple ou base réelle) ; aucune variation
   inventée : un chiffre sans historique n'affiche pas de flèche.

   15/10/2026 — allégée sur le dessin du pilotage /omega (validé par Teo) :
   une ligne par élément, le titre à gauche, la date à droite ; plus
   d'icônes, de sous-lignes ni d'avatars ; la flèche au survol ; les
   échéances sans colonne « État » (une date dépassée passe au rouge) ; plus
   de bandeau de l'assistant, le bouton « Assistant » est en haut.
   17/10/2026 — décision de Teo : plus de salutation ni de rangée de quatre
   chiffres, comme la vue d'ensemble du pilotage.
   21/10/2026 — l'horloge est celle du navigateur (horloge.ts) : les cartes
   se rendent après le montage, en squelette avant. Le serveur, en UTC,
   n'écrit plus une heure ni un « Hier » que le visiteur en Guadeloupe
   recalculerait autrement (erreur d'hydratation #418 vue en production).
   07/11/2026 — même contenu, mêmes polices, mêmes couleurs ; la composition
   reprend celle des autres pages d'Espace 2 (À valider, Point du matin) :
   la période se choisit dans la barre de filtres en tête, à côté de la
   pastille « En direct / Exemple » ; chaque carte a un en-tête de 14 px
   dont le titre mène à la page, un filet, puis des lignes de 44 px ; le
   tableau « à payer » prend les en-têtes de colonne en capitales du
   tableau des agents. Habillage dans ./accueil.css. */

import { useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, ChevronDown, ChevronRight } from "lucide-react";
import { dateCourte, montant, relatif } from "@/components/espace/format";
import { A_PAYER, aPayer, groupeDe, jourDe, totaux } from "./filed/calculs";
import { useAujourdhui } from "./horloge";
import { Note, Squelette } from "./ui";
import { EnDirect } from "./vivant";
import { RACINE } from "./modules";
import { useDonnees } from "./donnees";
import { evenements } from "./evenements";
import { ecrireStockage, useStockage } from "./Collection";
import MiniCarte from "./carte/MiniCarte";
import "./habillage.css";
import "./accueil.css";

const CLE_TACHES = "espace2-collection-taches";
const PERIODES = [
  { jours: 7, libelle: "7 derniers jours" },
  { jours: 30, libelle: "30 derniers jours" },
  { jours: 90, libelle: "90 derniers jours" },
];

export default function Accueil() {
  const aujourdhui = useAujourdhui();
  const { donnees, erreur } = useDonnees();
  const [periode, setPeriode] = useState(30);

  const c = useMemo(() => {
    if (!donnees || aujourdhui === null) return null;
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
    let recus = 0, totalRecu = 0;
    for (const d of donnees.docs) {
      const jour = new Date(d.recu_le).setHours(0, 0, 0, 0);
      const i = Math.floor((jour - (debut - 6 * 86_400_000)) / 86_400_000);
      if (i >= 0 && i < parJour.length) parJour[i] += d.montant ?? 0;
      if (jour >= debut) { recus += 1; totalRecu += d.montant ?? 0; }
    }
    const courbe = Array.from({ length: periode }, (_, i) => parJour.slice(i, i + 7).reduce((a, b) => a + b, 0));
    /* aujourd'hui : ce qui demande une action — échéances proches, accords */
    const actions = [
      ...aRegler
        .filter((f) => ["retard", "semaine"].includes(groupeDe(f, aujourdhui)))
        .map((f) => ({ id: f.id, titre: `Payer ${nomFournisseur(f.fournisseur_id)}`, quand: f.echeance_lue ? dateCourte(f.echeance_lue) : "", retard: groupeDe(f, aujourdhui) === "retard", lien: `${RACINE}/filed/a-payer` })),
      ...donnees.demandes
        .filter((d) => d.statut === "en_attente")
        .map((d) => ({ id: d.id, titre: `Valider : ${d.resume}`, quand: d.montant !== null ? montant(d.montant, d.devise) : "", retard: false, lien: `${RACINE}/validations` })),
    ];
    return {
      aRegler,
      retard,
      priorite,
      courbe,
      debut,
      recus,
      totalRecu,
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
  const aFaire = (c?.actions.length ?? 0) + duJour.length;

  return (
    <div className="v2-page v2-arrivee v2-va v2-vivant oc-va-simple va2">
      <h1 className="v2-sr">Vue d&apos;ensemble</h1>

      {/* ——— la période en menu, la pastille « En direct / Exemple » à droite, comme À valider et le Point du matin ——— */}
      <div className="v2-val-filtres">
        <label className="v2-val-bouton">
          <CalendarDays width={16} height={16} aria-hidden="true" />
          <span>{PERIODES.find((p) => p.jours === periode)?.libelle}</span>
          <ChevronDown width={14} height={14} aria-hidden="true" className="v2-val-bouton-chevron" />
          <select value={periode} onChange={(e) => setPeriode(Number(e.target.value))} aria-label="Période">
            {PERIODES.map((p) => (
              <option key={p.jours} value={p.jours}>{p.libelle}</option>
            ))}
          </select>
        </label>
        <span className="v2-val-droite">
          <EnDirect />
        </span>
      </div>

      {erreur ? <Note teinte="rouge" role="alert">La base n&apos;a pas répondu : {erreur}</Note> : null}

      {/* 29/10/2026 — la Carte en miniature : les agents au travail, un clic l'ouvre */}
      <MiniCarte />

      <div className="v2-va-grille">
        <div className="v2-va-col">
          <Carte titre="Factures reçues" meta={c ? `${c.recus} ${c.recus > 1 ? "documents" : "document"} · ${montant(c.totalRecu)}` : undefined}>
            <div className="va2-courbe">
              {c ? <Courbe valeurs={c.courbe} debut={c.debut} /> : <Squelette largeur="100%" hauteur={220} />}
            </div>
          </Carte>

          <Carte titre="À payer en priorité" lien={`${RACINE}/filed/a-payer`} meta={c ? `${c.aRegler.length} ${c.aRegler.length > 1 ? "factures" : "facture"} · ${c.totalARegler}` : undefined}>
            {!c ? <div className="va2-courbe"><Squelette largeur="100%" hauteur={160} /></div> : c.priorite.length === 0 ? (
              <p className="va2-rien">Aucune facture à payer.</p>
            ) : (
              <table className="va2-table">
                <thead>
                  <tr><th>Fournisseur</th><th>Échéance</th><th>Reste à payer</th></tr>
                </thead>
                <tbody>
                  {c.priorite.map(({ f, nom, groupe, reste }) => (
                    <tr key={f.id}>
                      <td><Link href={`${RACINE}/filed/a-payer`}>{nom}</Link></td>
                      <td className="va2-date" data-retard={groupe === "retard" ? "" : undefined}>
                        {f.echeance_lue ? dateCourte(f.echeance_lue) : "—"}
                        {groupe === "retard" ? <span className="v2-sr"> (en retard)</span> : null}
                      </td>
                      <td>{montant(reste, f.devise)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Carte>
        </div>

        <div className="v2-va-col">
          <Carte titre="Aujourd'hui" lien={`${RACINE}/taches`} badge={`${aFaire} à faire`}>
            {!c ? <div className="va2-courbe"><Squelette largeur="100%" hauteur={160} /></div> : aFaire === 0 ? (
              <p className="va2-rien">
                Rien d&apos;urgent aujourd&apos;hui. <Link href={`${RACINE}/taches`} className="v2-va-lien">Ajouter une tâche</Link>
              </p>
            ) : (
              <ul className="va2-liste">
                {duJour.map((t) => (
                  <li key={t.id}>
                    <input type="checkbox" aria-label={`Marquer « ${t.titre} » comme faite`} onChange={() => cocher(t.id)} />
                    <span className="v2-va-texte">
                      <span>{t.titre}</span>
                    </span>
                    {t.echeance ? <span className="oc-meta" data-retard={aujourdhui !== null && jourDe(t.echeance) < aujourdhui ? "" : undefined}>{dateCourte(t.echeance)}</span> : null}
                    <Link href={`${RACINE}/taches`} aria-label="Ouvrir les tâches"><ChevronRight width={16} height={16} /></Link>
                  </li>
                ))}
                {c.actions.slice(0, Math.max(0, 5 - duJour.length)).map((x) => (
                  <li key={x.id}>
                    <span className="v2-va-texte">
                      <span>{x.titre}</span>
                    </span>
                    {x.quand ? <span className="oc-meta" data-retard={x.retard ? "" : undefined}>{x.quand}{x.retard ? <span className="v2-sr"> (en retard)</span> : null}</span> : null}
                    <Link href={x.lien} aria-label={`Ouvrir : ${x.titre}`}><ChevronRight width={16} height={16} /></Link>
                  </li>
                ))}
              </ul>
            )}
          </Carte>

          <Carte titre="Activité récente" lien={`${RACINE}/activite`}>
            {!c ? <div className="va2-courbe"><Squelette largeur="100%" hauteur={160} /></div> : c.activite.length === 0 ? (
              <p className="va2-rien">Rien pour l&apos;instant.</p>
            ) : (
              <ul className="va2-liste">
                {c.activite.map((e) => (
                  <li key={e.id}>
                    <span className="v2-va-texte">
                      <span>{e.quoi} : {e.detail}</span>
                    </span>
                    <span className="oc-meta" title={relatif(e.quand)}>{heureCourte(e.quand)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Carte>
        </div>
      </div>
    </div>
  );
}

/* la carte à en-tête des autres pages d'Espace 2 (Point du matin) : le
   titre mène à la page, une mention ou un badge à droite, un filet, le corps */
function Carte({ titre, lien, meta, badge, children }: { titre: string; lien?: string; meta?: string; badge?: string; children: React.ReactNode }) {
  return (
    <section className="v2-carte v2-pm-carte" aria-label={titre}>
      <div className="v2-pm-tete">
        <h2>
          {lien ? (
            <Link href={lien} className="oc-pm-titre">
              {titre} <ChevronRight width={14} height={14} aria-hidden="true" />
            </Link>
          ) : (
            titre
          )}
        </h2>
        {meta ? <span className="va2-meta">{meta}</span> : null}
        {badge ? <span className="v2-pm-badge">{badge}</span> : null}
      </div>
      <div className="v2-pm-corps">{children}</div>
    </section>
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
          <path d={ligne} pathLength={1} className="v2-trace" fill="none" stroke="var(--v2-blue-700)" strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        </svg>
        <div className="v2-va-axe">
          {reperes.map((r) => <span key={r.x} style={{ left: `${r.x}%` }}>{r.texte}</span>)}
        </div>
      </div>
    </figure>
  );
}
