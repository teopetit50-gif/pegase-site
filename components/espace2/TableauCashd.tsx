"use client";

/* ══════════════════════════════════════════════════════════════════════
   CASHD — le tableau de bord (07/10/2026)

   Le dessin est celui de la maquette donnée par Teo (cartes à coins
   marqués, barres en pastilles, colonnes en pointillés, entonnoir,
   camembert hachuré, liste à pointillés, carte de relances, carte de
   chaleur, raccourcis), en gris uniquement.

   Les chiffres sont ceux de CASHD, par les mêmes portes que l'écran de
   travail (components/espace/cashd) : l'exemple (tableauDe sur
   FICHES_EXEMPLE) ou la base réelle (cashd_tableau, cashd_relances_du_jour,
   cashd_reponses). Aucune variation « vs mois dernier » n'est affichée :
   l'historique n'est pas encore assez long pour la calculer honnêtement.
   Il remplace l'écran de travail repris de /espace/cashd (décision de
   Teo, 07/10/2026).
   ══════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AlertCircle, ChevronRight, Clock, Download, Euro, Hourglass, ListChecks, Mail, PieChart, Settings, Users, Zap } from "lucide-react";
import { useSource } from "@/components/espace/source";
import { montant } from "@/components/espace/format";
import { tableauDe, jourParis } from "@/components/espace/cashd/calcul";
import { exporterBalance } from "@/components/espace/cashd/tableur";
import { DERNIER_IMPORT_EXEMPLE, FICHES_EXEMPLE, REGLAGES_EXEMPLE, RELANCES_EXEMPLE, SANS_COMPTE_EXEMPLE } from "@/components/espace/cashd/exemples";
import * as portes from "@/components/espace/cashd/portes";
import type { Balance, Relance, Tableau } from "@/components/espace/cashd/types";
import { RACINE } from "./modules";

const TRANCHES = [
  { cle: "non_echu", libelle: "Non échu", court: "Non échu" },
  { cle: "echu_1_30", libelle: "1 à 30 jours", court: "1–30 j" },
  { cle: "echu_31_60", libelle: "31 à 60 jours", court: "31–60 j" },
  { cle: "echu_61_90", libelle: "61 à 90 jours", court: "61–90 j" },
  { cle: "echu_plus_90", libelle: "Plus de 90 jours", court: "+90 j" },
] as const;
type CleTranche = (typeof TRANCHES)[number]["cle"];

/* 12 480 → « 12,5 k€ » */
const court = (v: number) => (Math.abs(v) >= 1000 ? `${(v / 1000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} k€` : `${Math.round(v).toLocaleString("fr-FR")} €`);
const pct = (v: number) => `${v.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %`;
const initiales = (nom: string) =>
  nom
    .replace(/^(SCI|SARL|SAS|Mairie de|Hôtel des|Hôtel)\s+/i, "")
    .split(/\s+/)
    .slice(0, 2)
    .map((m) => m.charAt(0).toUpperCase())
    .join("");

type Donnees = { tableau: Tableau; relances: Relance[]; reponses: portes.Reponse[]; paliers: { rappel: number; relance: number; mise_en_demeure: number } | null };

export default function TableauCashd() {
  const { source } = useSource();
  const [reel, setReel] = useState<Donnees | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [vue, setVue] = useState<"tous" | "echu" | "non_echu">("tous");
  const [survol, setSurvol] = useState<string | null>(null);

  useEffect(() => {
    if (source !== "reelle") return;
    let actif = true;
    const t = window.setTimeout(async () => {
      setErreur(null);
      setReel(null);
      try {
        const c = await portes.monClient();
        if (!c) throw new Error("Aucun compte rattaché à cette session.");
        const [tableau, relances, pilotage] = await Promise.all([
          portes.chargerTableau(c.client_id),
          portes.chargerRelances(c.client_id).catch(() => []),
          portes.chargerPilotage(c.client_id).catch(() => ({ reponses: [], arretes: [] })),
        ]);
        if (actif) setReel({ tableau, relances, reponses: pilotage.reponses, paliers: null });
      } catch (e) {
        if (actif) setErreur(e instanceof Error ? e.message : "La base n'a pas répondu.");
      }
    }, 0);
    return () => {
      actif = false;
      window.clearTimeout(t);
    };
  }, [source]);

  const exemple = useMemo<Donnees>(() => {
    const tableau = tableauDe(FICHES_EXEMPLE, { reglages: REGLAGES_EXEMPLE, dernier_import: DERNIER_IMPORT_EXEMPLE }, SANS_COMPTE_EXEMPLE);
    /* les paliers atteints par les factures, lus dans le suivi de l'exemple */
    const suivis = FICHES_EXEMPLE.flatMap((f) => f.suivi.filter((s) => f.pieces.some((p) => p.id === s.facture_id && p.nature === "facture")));
    const a = (ps: string[]) => suivis.filter((s) => s.palier_atteint && ps.includes(s.palier_atteint)).length;
    return { tableau, relances: RELANCES_EXEMPLE, reponses: [], paliers: { rappel: a(["rappel", "relance", "mise_en_demeure"]), relance: a(["relance", "mise_en_demeure"]), mise_en_demeure: a(["mise_en_demeure"]) } };
  }, []);

  const d = source === "exemple" ? exemple : reel;

  const calc = useMemo(() => {
    if (!d) return null;
    const { totaux } = d.tableau;
    const comptes = d.tableau.comptes.filter((b) => b.encours > 0);
    const tranches = TRANCHES.map((t) => ({ ...t, montant: totaux[t.cle as CleTranche] ?? 0 }));
    const echues = totaux.factures_echues;
    /* l'entonnoir des relances : base réelle = envois par palier ; exemple = paliers atteints */
    const envois = (p: string) => d.reponses.find((r) => r.palier === p)?.envoyees ?? 0;
    const etapes = [
      { libelle: "Factures échues", n: echues },
      { libelle: "Rappel", n: d.paliers ? d.paliers.rappel : envois("rappel") },
      { libelle: "Relance", n: d.paliers ? d.paliers.relance : envois("relance") },
      { libelle: "Mise en demeure", n: d.paliers ? d.paliers.mise_en_demeure : envois("mise_en_demeure") },
    ];
    const aValider = d.relances.filter((r) => r.etat === "a_valider");
    return { totaux, comptes, tranches, etapes, aValider };
  }, [d]);

  if (erreur) return <div className="v2-cd-carte v2-cd-vide">La base réelle n&apos;a pas répondu : {erreur}</div>;
  if (!calc || !d) return <div className="v2-cd-carte v2-cd-vide">Lecture des impayés…</div>;

  const { totaux, comptes, tranches, etapes, aValider } = calc;
  const partEchue = totaux.encours > 0 ? (totaux.echu / totaux.encours) * 100 : 0;
  const nbComptes = comptes.length;

  /* ——— le grand graphique : un débiteur par colonne, échu en foncé, non échu en clair ——— */
  const valeur = (b: Balance) => (vue === "echu" ? b.echu : vue === "non_echu" ? b.non_echu : b.encours);
  const colonnes = comptes.slice().sort((a, b) => valeur(b) - valeur(a));
  const choisi = colonnes.find((b) => b.compte_id === survol) ?? colonnes[0] ?? null;

  /* ——— la tranche la plus lourde parmi l'échu ——— */
  const trancheMax = tranches.slice(1).reduce((m, t) => (t.montant > m.montant ? t : m), tranches[1]);

  return (
    <div className="v2-cd">
      {/* ——— quatre chiffres ——— */}
      <div className="v2-cd-kpis">
        <Kpi icone={Euro} libelle="Encours total" valeur={montant(totaux.encours)} sous={`${nbComptes} débiteur${nbComptes > 1 ? "s" : ""}`} barres={comptes.map((b) => b.encours)} />
        <Kpi icone={AlertCircle} libelle="Échu" valeur={montant(totaux.echu)} sous={`${totaux.factures_echues} facture${totaux.factures_echues > 1 ? "s" : ""} échue${totaux.factures_echues > 1 ? "s" : ""}`} barres={comptes.map((b) => b.echu)} />
        <Kpi icone={Users} libelle="Comptes en retard" valeur={String(totaux.comptes_en_retard)} sous={`sur ${nbComptes} débiteur${nbComptes > 1 ? "s" : ""}`} barres={comptes.map((b) => b.retard_max_jours)} />
        <Kpi icone={PieChart} libelle="Part échue" valeur={pct(partEchue)} sous="de l'encours total" barres={tranches.map((t) => t.montant)} />
      </div>

      {/* ——— l'encours par débiteur, et les tranches ——— */}
      <div className="v2-cd-ligne v2-cd-ligne--2-1">
        <section className="v2-cd-carte" aria-label="Encours par débiteur">
          <div className="v2-cd-tete">
            <div>
              <p className="v2-cd-grand">{choisi ? court(valeur(choisi)) : "—"}</p>
              <p className="v2-cd-sous">{choisi ? `${choisi.nom} · retard le plus ancien ${choisi.retard_max_jours} j` : "Aucun débiteur"}</p>
              <p className="v2-cd-legende">
                <span data-teinte="fonce" /> Échu <span data-teinte="clair" /> Non échu
              </p>
            </div>
            <div className="v2-cd-droite">
              <div className="v2-cd-bascule" role="radiogroup" aria-label="Montant affiché">
                {(
                  [
                    ["tous", "Tout"],
                    ["echu", "Échu"],
                    ["non_echu", "Non échu"],
                  ] as const
                ).map(([cle, lib]) => (
                  <button key={cle} type="button" role="radio" aria-checked={vue === cle} onClick={() => setVue(cle)}>
                    {lib}
                  </button>
                ))}
              </div>
              <p className="v2-cd-sous">{pct(partEchue)} de l&apos;encours est échu</p>
            </div>
          </div>
          <BarresPastilles colonnes={colonnes} vue={vue} choisi={choisi?.compte_id ?? null} survoler={setSurvol} />
        </section>

        <section className="v2-cd-carte" aria-label="Échu par ancienneté">
          <div className="v2-cd-tete">
            <div>
              <p className="v2-cd-grand">{court(trancheMax.montant)}</p>
              <p className="v2-cd-sous">Échu depuis {trancheMax.libelle.toLowerCase()}, la tranche la plus lourde</p>
            </div>
          </div>
          <ColonnesPointillees tranches={tranches} active={trancheMax.cle} />
        </section>
      </div>

      {/* ——— la séquence des relances, la répartition ——— */}
      <div className="v2-cd-ligne v2-cd-ligne--1-1">
        <section className="v2-cd-carte" aria-label="Séquence des relances">
          <div className="v2-cd-tete">
            <div>
              <p className="v2-cd-grand">{etapes[0].n ? pct((etapes[1].n / etapes[0].n) * 100) : "—"}</p>
              <p className="v2-cd-sous">
                des factures échues ont reçu au moins un rappel · {etapes[1].n} sur {etapes[0].n}
              </p>
            </div>
          </div>
          <Entonnoir etapes={etapes} />
        </section>

        <section className="v2-cd-carte" aria-label="Répartition de l'encours">
          <div className="v2-cd-tete">
            <div>
              <p className="v2-cd-grand">{montant(totaux.encours)}</p>
              <p className="v2-cd-sous">Encours total, réparti par ancienneté</p>
            </div>
          </div>
          <Camembert tranches={tranches} total={totaux.encours} />
        </section>
      </div>

      {/* ——— quatre petites cartes ——— */}
      <div className="v2-cd-ligne v2-cd-ligne--4">
        <section className="v2-cd-carte" aria-label="Plus gros débiteurs">
          <p className="v2-cd-etiquette">
            <Users width={14} height={14} aria-hidden="true" /> Plus gros débiteurs <span>encours</span>
          </p>
          <ul className="v2-cd-pointilles">
            {comptes
              .slice()
              .sort((a, b) => b.encours - a.encours)
              .slice(0, 5)
              .map((b) => {
                const max = Math.max(...comptes.map((x) => x.encours), 1);
                const plein = Math.round((b.encours / max) * 36);
                return (
                  <li key={b.compte_id}>
                    <span className="v2-cd-pointilles-tete">
                      <span>{b.nom}</span>
                      <span>{court(b.encours)}</span>
                    </span>
                    <span className="v2-cd-pointilles-barre" aria-hidden="true">
                      {Array.from({ length: 36 }, (_, i) => (
                        <i key={i} data-plein={i < plein ? "" : undefined} />
                      ))}
                    </span>
                  </li>
                );
              })}
          </ul>
        </section>

        <section className="v2-cd-carte v2-cd-centre" aria-label="Relances du jour">
          <p className="v2-cd-etiquette">
            <Mail width={14} height={14} aria-hidden="true" /> Relances du jour
          </p>
          <div className="v2-cd-pile" aria-hidden="true">
            {Array.from(new Set((aValider.length ? aValider : d.relances).map((r) => r.compte)))
              .slice(0, 3)
              .map((nom) => (
                <span key={nom} title={nom}>
                  {initiales(nom)}
                </span>
              ))}
          </div>
          <p className="v2-cd-centre-titre">{aValider.length ? `${aValider.length} relance${aValider.length > 1 ? "s" : ""} à valider` : "Aucune relance à valider"}</p>
          <p className="v2-cd-centre-texte">{aValider.length ? "Écrites ce matin. Aucune ne part sans votre accord." : "Les relances sont écrites chaque matin, avant votre arrivée."}</p>
          <Link href={`${RACINE}/validations`} className="v2-val-bouton">
            <ListChecks width={16} height={16} aria-hidden="true" /> Voir les relances
          </Link>
        </section>

        <section className="v2-cd-carte" aria-label="Ancienneté par débiteur">
          <Chaleur comptes={comptes} />
        </section>

        <section className="v2-cd-carte" aria-label="Raccourcis">
          <p className="v2-cd-etiquette">
            <Zap width={14} height={14} aria-hidden="true" /> Raccourcis
          </p>
          <ul className="v2-cd-raccourcis">
            <li>
              <Link href={`${RACINE}/validations`}>
                <Mail width={18} height={18} aria-hidden="true" />
                <span>
                  <span>Relances du jour</span>
                  <small>Relire et valider les messages.</small>
                </span>
                <ChevronRight width={16} height={16} aria-hidden="true" />
              </Link>
            </li>
            <li>
              <Link href={`${RACINE}/validations`}>
                <Hourglass width={18} height={18} aria-hidden="true" />
                <span>
                  <span>Décisions en attente</span>
                  <small>Échéanciers, litiges, plafonds.</small>
                </span>
                <ChevronRight width={16} height={16} aria-hidden="true" />
              </Link>
            </li>
            <li>
              <Link href={`${RACINE}/reglages`}>
                <Settings width={18} height={18} aria-hidden="true" />
                <span>
                  <span>Réglages des relances</span>
                  <small>Délais, seuils, heure d&apos;envoi.</small>
                </span>
                <ChevronRight width={16} height={16} aria-hidden="true" />
              </Link>
            </li>
            <li>
              <button type="button" onClick={() => exporterBalance(d.tableau.comptes, jourParis())}>
                <Download width={18} height={18} aria-hidden="true" />
                <span>
                  <span>Exporter la balance</span>
                  <small>CSV pour votre comptable.</small>
                </span>
                <ChevronRight width={16} height={16} aria-hidden="true" />
              </button>
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}

/* ——— une carte chiffre, avec sa petite série de colonnes ——— */
function Kpi({ icone: Icone, libelle, valeur, sous, barres }: { icone: typeof Euro; libelle: string; valeur: string; sous: string; barres: number[] }) {
  const max = Math.max(...barres, 1);
  const iMax = barres.indexOf(Math.max(...barres));
  const serie = barres.length ? barres.slice(0, 9) : [0];
  return (
    <section className="v2-cd-carte v2-cd-kpi" aria-label={libelle}>
      <div>
        <p className="v2-cd-etiquette">
          <Icone width={14} height={14} aria-hidden="true" /> {libelle}
        </p>
        <p className="v2-cd-kpi-valeur">{valeur}</p>
        <p className="v2-cd-sous">{sous}</p>
      </div>
      <span className="v2-cd-mini" aria-hidden="true">
        {serie.map((v, i) => {
          const n = Math.max(1, Math.round((v / max) * 6));
          return (
            <span key={i} data-fort={i === iMax ? "" : undefined}>
              {Array.from({ length: 6 }, (_, k) => (
                <i key={k} data-plein={k >= 6 - n ? "" : undefined} />
              ))}
            </span>
          );
        })}
      </span>
    </section>
  );
}

/* ——— les colonnes en pastilles empilées ——— */
function BarresPastilles({ colonnes, vue, choisi, survoler }: { colonnes: Balance[]; vue: "tous" | "echu" | "non_echu"; choisi: string | null; survoler: (id: string | null) => void }) {
  const PAS = 24;
  const total = (b: Balance) => (vue === "echu" ? b.echu : vue === "non_echu" ? b.non_echu : b.encours);
  const max = Math.max(...colonnes.map(total), 1);
  const graduations = [1, 0.75, 0.5, 0.25, 0].map((p) => court(max * p));
  return (
    <div className="v2-cd-barres">
      <div className="v2-cd-axe-y" aria-hidden="true">
        {graduations.map((g, i) => (
          <span key={i}>{g}</span>
        ))}
      </div>
      <div className="v2-cd-barres-zone">
        <div className="v2-cd-barres-cols" onMouseLeave={() => survoler(null)}>
          {colonnes.map((b) => {
            const t = total(b);
            const n = Math.max(t > 0 ? 1 : 0, Math.round((t / max) * PAS));
            const fonce = vue === "non_echu" ? 0 : vue === "echu" ? n : Math.round((b.echu / Math.max(t, 1)) * n);
            return (
              <button
                key={b.compte_id}
                type="button"
                className="v2-cd-col"
                data-choisi={choisi === b.compte_id ? "" : undefined}
                onMouseEnter={() => survoler(b.compte_id)}
                onFocus={() => survoler(b.compte_id)}
                aria-label={`${b.nom} : ${montant(t)}`}
              >
                <span className="v2-cd-col-pile">
                  {Array.from({ length: n }, (_, k) => (
                    <i key={k} data-fonce={k >= n - fonce ? "" : undefined} />
                  ))}
                </span>
              </button>
            );
          })}
        </div>
        <div className="v2-cd-axe-x" aria-hidden="true">
          {colonnes.map((b) => (
            <span key={b.compte_id}>{b.nom.length > 14 ? `${b.nom.slice(0, 13)}…` : b.nom}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ——— les tranches en colonnes pointillées, la plus lourde pleine ——— */
function ColonnesPointillees({ tranches, active }: { tranches: { cle: string; court: string; montant: number }[]; active: string }) {
  const max = Math.max(...tranches.map((t) => t.montant), 1);
  return (
    <div className="v2-cd-pointillees">
      <div className="v2-cd-pointillees-cols">
        {tranches.map((t) => {
          const h = Math.max(2, (t.montant / max) * 100);
          return (
            <span key={t.cle} className="v2-cd-pcol" data-active={t.cle === active ? "" : undefined} aria-label={`${t.court} : ${montant(t.montant)}`}>
              {t.cle === active ? <em>{court(t.montant)}</em> : null}
              <span style={{ height: `${h}%` }} />
            </span>
          );
        })}
      </div>
      <div className="v2-cd-pointillees-x" aria-hidden="true">
        {tranches.map((t) => (
          <span key={t.cle}>{t.court}</span>
        ))}
      </div>
    </div>
  );
}

/* ——— l'entonnoir : quatre étapes, des rubans qui se resserrent ——— */
function Entonnoir({ etapes }: { etapes: { libelle: string; n: number }[] }) {
  const base = Math.max(etapes[0]?.n ?? 0, 1);
  const H = 240;
  const haut = (n: number) => Math.max(10, (n / base) * (H - 40));
  return (
    <div className="v2-cd-entonnoir">
      {etapes.map((e, i) => {
        const h1 = haut(e.n);
        const h2 = haut(etapes[i + 1]?.n ?? e.n);
        const y1 = (H - h1) / 2;
        const y2 = (H - h2) / 2;
        const teinte = ["var(--v2-a-300, var(--v2-a-400))", "var(--v2-a-500, var(--v2-a-400))", "var(--v2-gray-700)", "var(--v2-gray-900)"][i] ?? "var(--v2-gray-900)";
        return (
          <div key={e.libelle} className="v2-cd-etape">
            <strong>{e.n.toLocaleString("fr-FR")}</strong>
            <svg viewBox={`0 0 100 ${H}`} preserveAspectRatio="none" aria-hidden="true">
              <path d={`M0,${y1} C50,${y1} 50,${y2} 100,${y2} L100,${y2 + h2} C50,${y2 + h2} 50,${y1 + h1} 0,${y1 + h1} Z`} fill={teinte} opacity="0.35" />
              <path d={`M0,${y1 + h1 * 0.12} C50,${y1 + h1 * 0.12} 50,${y2 + h2 * 0.12} 100,${y2 + h2 * 0.12} L100,${y2 + h2 * 0.88} C50,${y2 + h2 * 0.88} 50,${y1 + h1 * 0.88} 0,${y1 + h1 * 0.88} Z`} fill={teinte} />
            </svg>
            <span className="v2-cd-etape-pct">{pct(Math.round((e.n / base) * 100))}</span>
            <small>{e.libelle}</small>
          </div>
        );
      })}
    </div>
  );
}

/* ——— le camembert hachuré ——— */
function Camembert({ tranches, total }: { tranches: { cle: string; libelle: string; montant: number }[]; total: number }) {
  const R = 100;
  /* l'angle de départ de chaque part : la somme des parts précédentes */
  const angleDe = (n: number) => -Math.PI / 2 + (total > 0 ? (tranches.slice(0, n).reduce((s, t) => s + t.montant, 0) / total) * Math.PI * 2 : 0);
  const parts = tranches.map((t, i) => ({ ...t, i, debut: angleDe(i), fin: angleDe(i + 1), part: total > 0 ? (t.montant / total) * 100 : 0 }));
  const arc = (d: number, f: number) => {
    if (f - d >= Math.PI * 2 - 1e-6) return `M${R},0 A${R},${R} 0 1 1 ${R - 0.01},0 Z`;
    const x1 = R + R * Math.cos(d), y1 = R + R * Math.sin(d), x2 = R + R * Math.cos(f), y2 = R + R * Math.sin(f);
    return `M${R},${R} L${x1},${y1} A${R},${R} 0 ${f - d > Math.PI ? 1 : 0} 1 ${x2},${y2} Z`;
  };
  return (
    <div className="v2-cd-camembert">
      <svg viewBox="0 0 200 200" aria-hidden="true">
        <defs>
          <pattern id="cd-h0" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" stroke="var(--v2-gray-700)" strokeWidth="1" /></pattern>
          <pattern id="cd-h1" width="5" height="5" patternUnits="userSpaceOnUse"><line x1="0" y1="2.5" x2="5" y2="2.5" stroke="var(--v2-gray-900)" strokeWidth="1" /></pattern>
          <pattern id="cd-h2" width="5" height="5" patternUnits="userSpaceOnUse"><line x1="2.5" y1="0" x2="2.5" y2="5" stroke="var(--v2-gray-900)" strokeWidth="1" /></pattern>
          <pattern id="cd-h3" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)"><line x1="0" y1="0" x2="0" y2="5" stroke="var(--v2-gray-1000)" strokeWidth="1.2" /></pattern>
          <pattern id="cd-h4" width="5" height="5" patternUnits="userSpaceOnUse"><path d="M0,2.5 H5 M2.5,0 V5" stroke="var(--v2-gray-1000)" strokeWidth="1" /></pattern>
        </defs>
        {total > 0 ? parts.filter((p) => p.montant > 0).map((p) => <path key={p.cle} d={arc(p.debut, p.fin)} fill={`url(#cd-h${p.i})`} stroke="var(--v2-bg-100)" strokeWidth="1.5" />) : <circle cx="100" cy="100" r="100" fill="url(#cd-h0)" />}
      </svg>
      <ul className="v2-cd-camembert-legende">
        {parts.map((p) => (
          <li key={p.cle}>
            <span className="v2-cd-carre" data-i={p.i} aria-hidden="true" />
            <span>{p.libelle}</span>
            <span>{pct(Math.round(p.part * 10) / 10)}</span>
            <span>{court(p.montant)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ——— la carte de chaleur : débiteurs × tranches ——— */
function Chaleur({ comptes }: { comptes: Balance[] }) {
  const lignes = comptes.slice().sort((a, b) => b.encours - a.encours).slice(0, 7);
  const cles: CleTranche[] = ["non_echu", "echu_1_30", "echu_31_60", "echu_61_90", "echu_plus_90"];
  let max = 0;
  let pic: { nom: string; tranche: string; v: number } | null = null;
  for (const b of lignes)
    for (const c of cles) {
      const v = b[c] ?? 0;
      if (v > max) {
        max = v;
        pic = { nom: b.nom, tranche: TRANCHES.find((t) => t.cle === c)?.court ?? c, v };
      }
    }
  const moyenne = lignes.length ? lignes.reduce((s, b) => s + b.encours, 0) / lignes.length : 0;
  const niveau = (v: number) => (v <= 0 ? 0 : Math.min(5, Math.ceil((v / Math.max(max, 1)) * 5)));
  return (
    <>
      <p className="v2-cd-etiquette">
        <Clock width={14} height={14} aria-hidden="true" /> Ancienneté par débiteur <span>aujourd&apos;hui</span>
      </p>
      <div className="v2-cd-chaleur-tete">
        <div>
          <p className="v2-cd-grand v2-cd-grand--moyen">{pic ? court(pic.v) : "—"}</p>
          <p className="v2-cd-sous">{pic ? `Pic · ${pic.nom.length > 18 ? `${pic.nom.slice(0, 17)}…` : pic.nom}, ${pic.tranche}` : "Aucun encours"}</p>
        </div>
        <div style={{ textAlign: "right" }}>
          <p className="v2-cd-moyen">{court(moyenne)}</p>
          <p className="v2-cd-sous">Moy. / débiteur</p>
        </div>
      </div>
      <div className="v2-cd-chaleur">
        {lignes.map((b) => (
          <div key={b.compte_id} className="v2-cd-chaleur-ligne">
            <span>{initiales(b.nom)}</span>
            {cles.map((c) => (
              <i key={c} data-n={niveau(b[c] ?? 0)} title={`${b.nom} · ${TRANCHES.find((t) => t.cle === c)?.court} : ${montant(b[c] ?? 0)}`} />
            ))}
          </div>
        ))}
        <div className="v2-cd-chaleur-ligne v2-cd-chaleur-x" aria-hidden="true">
          <span />
          {["Non éch.", "1–30", "31–60", "61–90", "+90"].map((x) => (
            <small key={x}>{x}</small>
          ))}
        </div>
      </div>
      <p className="v2-cd-echelle" aria-hidden="true">
        Plus faible {[1, 2, 3, 4, 5].map((n) => <i key={n} data-n={n} />)} Plus fort
      </p>
    </>
  );
}

