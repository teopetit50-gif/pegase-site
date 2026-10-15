"use client";

/* ══════════════════════════════════════════════════════════════════════
   /espace/filed/a-payer — les factures validées, à payer (06/10/2026)

   Ce qu'un gérant regarde après « validée » : les factures validées ou
   comptabilisées, par échéance (en retard, cette semaine, ce mois-ci, plus
   tard, sans échéance), le montant à payer (net à payer, sinon TTC ; un
   avoir vient en déduction), et ce qui empêcherait de payer : pas d'IBAN
   validé, fournisseur bloqué. Un total par groupe et par devise.

   Lecture seule. FILED ne suit pas encore le paiement lui-même (aucune
   porte de paiement, aucun statut « payée ») : une facture payée reste ici
   tant que le paiement n'est pas tracé — l'écran le dit.
   ══════════════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Building2, FileText } from "lucide-react";
import { useSource } from "../source";
import { useTempsReel } from "../tempsReel";
import { Avis, Chargement, Pastille, Ruban, Vide } from "../ui";
import { dateCourte, masquerIban, montant } from "../format";
import { statutFacture } from "./etats";
import { vueExemple } from "./EcranFournisseurs";
import { chargerVueFournisseurs, type FactureDuFournisseur, type VueFournisseurs } from "./portes";

type Groupe = "retard" | "semaine" | "mois" | "plus_tard" | "sans";
const GROUPES: { cle: Groupe; libelle: string; sous: string; teinte: "rouge" | "ambre" | "bleu" | "gris" }[] = [
  { cle: "retard", libelle: "En retard", sous: "échéance dépassée", teinte: "rouge" },
  { cle: "semaine", libelle: "Cette semaine", sous: "dans les 7 jours", teinte: "ambre" },
  { cle: "mois", libelle: "Ce mois-ci", sous: "dans les 30 jours", teinte: "bleu" },
  { cle: "plus_tard", libelle: "Plus tard", sous: "au-delà de 30 jours", teinte: "gris" },
  { cle: "sans", libelle: "Sans échéance", sous: "aucune échéance lue", teinte: "gris" },
];
const A_PAYER = new Set(["validee", "comptabilisee"]);
const JOUR = 86_400_000;

/* minuit local, pour compter des jours entiers */
const jourDe = (iso: string) => {
  const [a, m, j] = iso.slice(0, 10).split("-").map(Number);
  return new Date(a, m - 1, j).getTime();
};

function groupeDe(f: FactureDuFournisseur, aujourdhui: number): Groupe {
  if (!f.echeance_lue) return "sans";
  const jours = Math.round((jourDe(f.echeance_lue) - aujourdhui) / JOUR);
  if (jours < 0) return "retard";
  if (jours <= 7) return "semaine";
  if (jours <= 30) return "mois";
  return "plus_tard";
}

/* le montant à payer : le net à payer s'il est lu, sinon le TTC ; un avoir se déduit */
const aPayer = (f: FactureDuFournisseur) => {
  const m = f.net_a_payer ?? f.montant_ttc ?? 0;
  return f.nature === "avoir" ? -Math.abs(m) : m;
};

function totaux(lignes: FactureDuFournisseur[]): string {
  const parDevise = new Map<string, number>();
  for (const l of lignes) parDevise.set(l.devise, (parDevise.get(l.devise) ?? 0) + aPayer(l));
  return Array.from(parDevise.entries()).map(([d, t]) => montant(Math.round(t * 100) / 100, d)).join(" + ") || montant(0);
}

export default function EcranAPayer() {
  const { source } = useSource();
  const [reel, setReel] = useState<VueFournisseurs | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [filtre, setFiltre] = useState<Groupe | null>(null);
  const [aujourdhui] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  });
  const exemple = useMemo(() => vueExemple(), []);

  const charger = useCallback(async () => {
    await Promise.resolve();
    setErreur(null);
    try {
      setReel(await chargerVueFournisseurs());
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base n'a pas répondu.");
      setReel({ fournisseurs: [], ibans: [], factures: [], deposants: {} });
    }
  }, []);
  useEffect(() => {
    if (source !== "reelle") return;
    const t = window.setTimeout(() => void charger(), 0);
    return () => window.clearTimeout(t);
  }, [source, charger]);
  useTempsReel(["filed_factures", "filed_fournisseurs", "filed_fournisseurs_ibans"], source === "reelle", charger);

  const vue = source === "exemple" ? exemple : reel;
  const fournisseur = (id: string | null) => vue?.fournisseurs.find((f) => f.id === id) ?? null;
  const ibanValide = (id: string | null) => vue?.ibans.find((i) => i.fournisseur_id === id && i.statut === "valide") ?? null;
  const ibanPropose = (id: string | null) => vue?.ibans.some((i) => i.fournisseur_id === id && i.statut === "propose") ?? false;

  const lignes = useMemo(
    () =>
      (vue?.factures ?? [])
        .filter((f) => A_PAYER.has(f.statut))
        .sort((a, b) => (a.echeance_lue ?? "9999").localeCompare(b.echeance_lue ?? "9999") || aPayer(b) - aPayer(a)),
    [vue],
  );
  const parGroupe = useMemo(() => {
    const g: Record<Groupe, FactureDuFournisseur[]> = { retard: [], semaine: [], mois: [], plus_tard: [], sans: [] };
    for (const l of lignes) g[groupeDe(l, aujourdhui)].push(l);
    return g;
  }, [lignes, aujourdhui]);
  const sansIban = lignes.filter((l) => l.nature !== "avoir" && !ibanValide(l.fournisseur_id)).length;

  return (
    <>
      <div className="esp-tete" data-arrivee="">
        <div>
          <h1 className="esp-titre">À payer</h1>
          <p className="esp-sous">
            Les factures validées, par échéance : ce qui est en retard d&apos;abord, le montant à payer, et ce qui empêcherait de payer (IBAN non validé, fournisseur bloqué).
          </p>
        </div>
        <div className="esp-item-haut">
          <Link href="/espace/filed" className="r-btn r-btn--fil"><FileText width={15} height={15} aria-hidden="true" /> Documents reçus</Link>
          <Link href="/espace/filed/fournisseurs" className="r-btn r-btn--fil"><Building2 width={15} height={15} aria-hidden="true" /> Fournisseurs</Link>
          <Ruban source={source} />
        </div>
      </div>

      <div className="esp-kpis" data-arrivee="">
        {GROUPES.filter((g) => g.cle !== "sans" || parGroupe.sans.length).map((g) => (
          <button key={g.cle} type="button" className="esp-kpi" data-teinte={parGroupe[g.cle].length && g.cle !== "plus_tard" && g.cle !== "sans" ? g.teinte : undefined} aria-pressed={filtre === g.cle} onClick={() => setFiltre(filtre === g.cle ? null : g.cle)}>
            <span className="esp-kpi-etiquette">{g.libelle}</span>
            <span className="esp-kpi-valeur">{parGroupe[g.cle].length}</span>
            <span className="esp-kpi-sous">{parGroupe[g.cle].length ? totaux(parGroupe[g.cle]) : g.sous}</span>
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gap: 10, marginBottom: 14 }}>
        <Avis teinte="gris">Le paiement lui-même n&apos;est pas encore suivi par FILED : une facture déjà payée reste dans cette liste tant que son paiement n&apos;est pas tracé.</Avis>
        {sansIban ? <Avis teinte="ambre"><strong>{sansIban} facture{sansIban > 1 ? "s" : ""} sans IBAN validé.</strong> Le virement attend qu&apos;un IBAN du fournisseur soit validé dans la file « À valider », ou passera par un autre moyen.</Avis> : null}
        {erreur ? <Avis teinte="rouge" role="alert"><strong>La base réelle n&apos;a pas répondu.</strong> {erreur}</Avis> : null}
      </div>

      {source === "reelle" && !reel ? (
        <div className="esp-carte"><Chargement texte="Lecture des factures validées…" /></div>
      ) : !lignes.length ? (
        <div className="esp-carte"><Vide titre="Rien à payer">Aucune facture validée pour l&apos;instant : elles arrivent ici après leur validation dans la file « À valider ».</Vide></div>
      ) : (
        <div style={{ display: "grid", gap: 14, gridTemplateColumns: "minmax(0, 1fr)" }}>
          {GROUPES.filter((g) => (!filtre || filtre === g.cle) && parGroupe[g.cle].length).map((g) => (
            <section key={g.cle} className="esp-carte" aria-label={g.libelle}>
              <div className="esp-carte-tete">
                <h2 className="esp-carte-titre">{g.libelle}</h2>
                <span className="esp-kpi-sous">{parGroupe[g.cle].length} facture{parGroupe[g.cle].length > 1 ? "s" : ""} · {totaux(parGroupe[g.cle])}</span>
              </div>
              <div className="esp-tableau-cadre">
                <table className="esp-tableau esp-a-payer" style={{ tableLayout: "fixed", minWidth: 760 }}>
                  {/* mêmes largeurs d'un groupe à l'autre : les colonnes s'alignent */}
                  <colgroup>
                    <col style={{ width: "13%" }} />
                    <col style={{ width: "25%" }} />
                    <col style={{ width: "18%" }} />
                    <col style={{ width: "13%" }} />
                    <col style={{ width: "20%" }} />
                    <col style={{ width: "11%" }} />
                  </colgroup>
                  <thead>
                    <tr><th>Échéance</th><th>Fournisseur</th><th>Document</th><th className="esp-num">À payer</th><th>IBAN</th><th>Statut</th></tr>
                  </thead>
                  <tbody>
                    {parGroupe[g.cle].map((l) => {
                      const four = fournisseur(l.fournisseur_id);
                      const ib = ibanValide(l.fournisseur_id);
                      const st = statutFacture(l.statut);
                      const jours = l.echeance_lue ? Math.round((jourDe(l.echeance_lue) - aujourdhui) / JOUR) : null;
                      return (
                        <tr key={l.id}>
                          <td>
                            {l.echeance_lue ? dateCourte(l.echeance_lue) : "—"}
                            {jours !== null ? <div className="esp-kpi-sous">{jours < 0 ? `${-jours} j de retard` : jours === 0 ? "aujourd'hui" : `dans ${jours} j`}</div> : null}
                          </td>
                          <td>
                            {four?.nom ?? "Fournisseur inconnu"}
                            {four?.statut === "bloque" ? <div><Pastille teinte="rouge">Fournisseur bloqué : ne pas payer</Pastille></div> : null}
                          </td>
                          <td>
                            <Link href={`/espace/filed?objet=facture:${encodeURIComponent(l.id)}`} className="esp-mono">{l.reference ?? "dossier"}</Link>
                            <div className="esp-kpi-sous">{l.nature === "avoir" ? "Avoir" : "Facture"}{l.numero ? ` n° ${l.numero}` : ""}</div>
                          </td>
                          <td className="esp-num">{montant(aPayer(l), l.devise)}</td>
                          <td>
                            {l.nature === "avoir" ? (
                              <span className="esp-kpi-sous">en déduction</span>
                            ) : ib ? (
                              <span className="esp-mono">{ib.iban_masque}</span>
                            ) : ibanPropose(l.fournisseur_id) ? (
                              <Pastille teinte="ambre">IBAN à valider</Pastille>
                            ) : (
                              <Pastille teinte="rouge">IBAN manquant</Pastille>
                            )}
                            {!ib && l.iban && l.nature !== "avoir" ? <div className="esp-kpi-sous">lu sur la facture : {masquerIban(l.iban)}</div> : null}
                          </td>
                          <td><Pastille teinte={st.teinte}>{st.libelle}</Pastille></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
          <p className="esp-kpi-sous" style={{ textAlign: "right" }}>Total à payer : <b>{totaux(lignes)}</b></p>
        </div>
      )}
    </>
  );
}
