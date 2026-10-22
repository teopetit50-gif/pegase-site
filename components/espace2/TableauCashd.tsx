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
import { Download, Info, ListChecks } from "lucide-react";
import { useSource } from "@/components/espace/source";
import { montant } from "@/components/espace/format";
import { tableauDe, jourParis } from "@/components/espace/cashd/calcul";
import { exporterBalance } from "@/components/espace/cashd/tableur";
import { DERNIER_IMPORT_EXEMPLE, FICHES_EXEMPLE, REGLAGES_EXEMPLE, RELANCES_EXEMPLE, SANS_COMPTE_EXEMPLE } from "@/components/espace/cashd/exemples";
import * as portes from "@/components/espace/cashd/portes";
import type { Balance, Relance, Tableau } from "@/components/espace/cashd/types";
import { libellePalier } from "@/components/espace/cashd/etats";
import { RACINE } from "./modules";
import "./sb/sb.css";

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

  if (erreur) return <div className="sb-obs"><p className="sb-texte">La base réelle n&apos;a pas répondu : {erreur}</p></div>;
  if (!calc || !d) return <div className="sb-obs"><p className="sb-texte">Lecture des impayés…</p></div>;

  const { totaux, comptes, tranches, etapes, aValider } = calc;
  const partEchue = totaux.encours > 0 ? (totaux.echu / totaux.encours) * 100 : 0;
  const nbComptes = comptes.length;

  /* ——— le grand graphique : un débiteur par colonne, échu en foncé, non échu en clair ——— */
  const valeur = (b: Balance) => (vue === "echu" ? b.echu : vue === "non_echu" ? b.non_echu : b.encours);
  const colonnes = comptes.slice().sort((a, b) => valeur(b) - valeur(a));
  const choisi = colonnes.find((b) => b.compte_id === survol) ?? colonnes[0] ?? null;

  /* ——— la tranche la plus lourde parmi l'échu ——— */

  const trancheMax = tranches.slice(1).reduce((m, t) => (t.montant > m.montant ? t : m), tranches[1]);

  /* 22/10 — la page Observability › Overview de Supabase, au 1:1 : titre et
     actions, une rangée de tuiles, puis l'état de l'encours en une carte de
     cellules (histogramme par débiteur sur toute la largeur, tranches
     d'ancienneté, séquence des relances, relances à valider, plus gros
     débiteurs). Remplace la maquette du 07/10. Gabarit : ./sb/sb.css. */
  const maxEncours = Math.max(1, ...colonnes.map((b) => valeur(b)));
  const tuiles = [
    { cle: "encours", libelle: "Encours total", valeur: montant(totaux.encours), lien: `${RACINE}/cashd/balance` },
    { cle: "echu", libelle: "Échu", valeur: montant(totaux.echu), lien: `${RACINE}/cashd/balance`, teinte: totaux.echu ? "ambre" : undefined },
    { cle: "part", libelle: "Part échue", valeur: pct(partEchue), lien: `${RACINE}/cashd/balance` },
    { cle: "retard", libelle: "Comptes en retard", valeur: `${totaux.comptes_en_retard} / ${nbComptes}`, lien: `${RACINE}/cashd/suivi?vue=debiteurs`, teinte: totaux.comptes_en_retard ? "rouge" : undefined },
    { cle: "relances", libelle: "Relances à valider", valeur: String(aValider.length), lien: `${RACINE}/validations`, teinte: aValider.length ? "ambre" : undefined },
    { cle: "litige", libelle: "En litige", valeur: montant(totaux.en_litige), lien: `${RACINE}/cashd/litiges` },
  ];
  return (
    <div className="sb-obs v2-arrivee">
      <div className="sb-tete-ligne">
        <h1 className="sb-titre">Relances</h1>
        <div className="sb-actions">
          <button type="button" className="v2-btn" onClick={() => exporterBalance(comptes, jourParis())}>
            <Download width={14} height={14} aria-hidden="true" /> Exporter
          </button>
          <Link href={`${RACINE}/cashd/suivi?vue=debiteurs`} className="v2-btn">
            <ListChecks width={14} height={14} aria-hidden="true" /> Débiteurs et relances
          </Link>
        </div>
      </div>

      <section className="sb-obs-section" aria-labelledby="cd-chiffres">
        <h2 id="cd-chiffres">L&apos;encours</h2>
        <div className="sb-tuiles">
          {tuiles.map((t) => (
            <Link key={t.cle} href={t.lien} className="sb-tuile">
              <span className="sb-tuile-etiquette">
                {t.libelle}
                <Info width={14} height={14} strokeWidth={1.5} aria-hidden="true" />
              </span>
              <span className="sb-tuile-valeur" data-teinte={t.teinte}>
                {t.valeur}
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="sb-obs-section" aria-labelledby="cd-sante">
        <h2 id="cd-sante">L&apos;état des relances</h2>
        <div className="sb-sante">
          <div className="sb-sante-grille">
            <div className="sb-cellule sb-cellule--large">
              <div className="sb-cellule-tete">
                <Link href={`${RACINE}/cashd/balance`}>Encours par débiteur</Link>
                <span className="sb-cellule-compte" style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
                  {(
                    [
                      ["tous", "Tout"],
                      ["echu", "Échu"],
                      ["non_echu", "Non échu"],
                    ] as const
                  ).map(([cle, lib]) => (
                    <button key={cle} type="button" className="v2-btn v2-btn--petit v2-btn--fantome" aria-pressed={vue === cle} onClick={() => setVue(cle)} style={vue === cle ? { background: "var(--v2-a-300)" } : undefined}>
                      {lib}
                    </button>
                  ))}
                </span>
              </div>
              <div className="sb-mini-histo" role="img" aria-label={`Encours par débiteur : ${colonnes.map((b) => `${b.nom} ${montant(valeur(b))}`).join(", ")}`}>
                {colonnes.map((b) => (
                  <span key={b.compte_id} title={`${b.nom} : ${montant(valeur(b))}`} data-vide={valeur(b) ? undefined : ""} style={{ height: valeur(b) ? `${Math.max(8, (valeur(b) / maxEncours) * 100)}%` : "2px" }} onMouseEnter={() => setSurvol(b.compte_id)} />
                ))}
              </div>
              <p className="sb-mini-vide">{choisi ? `${choisi.nom} · ${montant(valeur(choisi))} · retard le plus ancien ${choisi.retard_max_jours} j` : "Aucun débiteur"}</p>
            </div>

            <div className="sb-cellule">
              <div className="sb-cellule-tete">
                <Link href={`${RACINE}/cashd/balance`}>Échu par ancienneté</Link>
                <span className="sb-cellule-compte">la plus lourde : {trancheMax.libelle.toLowerCase()}</span>
              </div>
              <ul className="sb-mini-liste">
                {tranches.map((t) => (
                  <li key={t.cle}>
                    <span>{t.libelle}</span>
                    <span className="sb-meta">{montant(t.montant)}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="sb-cellule">
              <div className="sb-cellule-tete">
                <Link href={`${RACINE}/cashd/suivi?vue=relances`}>Séquence des relances</Link>
                <span className="sb-cellule-compte">{etapes[0].n ? `${pct((etapes[1].n / etapes[0].n) * 100)} relancées` : "—"}</span>
              </div>
              <ul className="sb-mini-liste">
                {etapes.map((e) => (
                  <li key={e.libelle}>
                    <span>{e.libelle}</span>
                    <span className="sb-meta">{e.n}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="sb-cellule">
              <div className="sb-cellule-tete">
                <Link href={`${RACINE}/validations`}>Relances à valider</Link>
                <span className="sb-cellule-compte">{aValider.length}</span>
              </div>
              {aValider.length ? (
                <ul className="sb-mini-liste">
                  {aValider.slice(0, 5).map((r) => (
                    <li key={r.id}>
                      <Link href={`${RACINE}/validations`}>{r.compte}</Link>
                      <span className="sb-meta">{libellePalier(r.palier)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="sb-mini-vide">Les relances sont écrites chaque matin ; aucune ne part sans votre accord.</p>
              )}
            </div>

            <div className="sb-cellule">
              <div className="sb-cellule-tete">
                <Link href={`${RACINE}/cashd/suivi?vue=debiteurs`}>Plus gros débiteurs</Link>
                <span className="sb-cellule-compte">encours</span>
              </div>
              <ul className="sb-mini-liste">
                {comptes
                  .slice()
                  .sort((a, b) => b.encours - a.encours)
                  .slice(0, 5)
                  .map((b) => (
                    <li key={b.compte_id}>
                      <Link href={`${RACINE}/cashd/suivi?vue=debiteurs&compte=${encodeURIComponent(b.compte_id)}`}>{b.nom}</Link>
                      <span className="sb-meta">{court(b.encours)}</span>
                    </li>
                  ))}
              </ul>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
