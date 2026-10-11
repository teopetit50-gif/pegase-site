"use client";

/* ══════════════════════════════════════════════════════════════════════
   /espace/filed/a-payer — les factures validées, à payer (06/10/2026)

   Ce qu'un gérant regarde après « validée » : les factures validées ou
   comptabilisées, par échéance (en retard, cette semaine, ce mois-ci, plus
   tard, sans échéance), le montant à payer (net à payer, sinon TTC ; un
   avoir vient en déduction), et ce qui empêcherait de payer : pas d'IBAN
   validé, fournisseur bloqué. Un total par groupe et par devise.

   Le paiement (a4_15, 06/10) : « Noter un paiement » → filed_noter_paiement
   (date, montant — vide = le reste —, moyen, référence ; gérant, admin,
   valideur) ; l'état de chaque facture vient de filed_etat_paiement (dû,
   réglé, reste, a_payer | partielle | payee). Le montant à payer est le
   reste ; une facture payée sort de la liste (on peut l'y revoir).
   ══════════════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Building2, Banknote, FileText } from "lucide-react";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import { useSource } from "../source";
import { useTempsReel } from "../tempsReel";
import { Avis, Chargement, Pastille, Ruban, Vide } from "../ui";
import { dateCourte, masquerIban, montant } from "../format";
import { statutFacture } from "./etats";
import { vueExemple } from "./EcranFournisseurs";
import { MOYENS_PAIEMENT, chargerVueFournisseurs, etatPaiement, noterPaiement, type EtatPaiement, type FactureDuFournisseur, type MoyenPaiement, type VueFournisseurs } from "./portes";

const LIBELLES_MOYEN: Record<MoyenPaiement, string> = { virement: "Virement", prelevement: "Prélèvement", cheque: "Chèque", carte: "Carte", especes: "Espèces", compensation: "Compensation", autre: "Autre" };
const aujourdhuiIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

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

/* le dû : le net à payer s'il est lu, sinon le TTC ; un avoir se déduit */
const du = (f: FactureDuFournisseur) => {
  const m = f.net_a_payer ?? f.montant_ttc ?? 0;
  return f.nature === "avoir" ? -Math.abs(m) : m;
};
type Etats = Record<string, EtatPaiement>;
/* le montant à payer : le reste selon filed_etat_paiement, sinon le dû */
const aPayer = (f: FactureDuFournisseur, etats: Etats) => (f.nature !== "avoir" && etats[f.id] ? etats[f.id].reste : du(f));

function totaux(lignes: FactureDuFournisseur[], etats: Etats): string {
  const parDevise = new Map<string, number>();
  for (const l of lignes) parDevise.set(l.devise, (parDevise.get(l.devise) ?? 0) + aPayer(l, etats));
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
  /* l'état de paiement de chaque facture : en exemple, un règlement partiel sur la facture en retard */
  const [etatsExemple, setEtatsExemple] = useState<Etats>(() => {
    const e: Etats = {};
    for (const f of exemple.factures) {
      if (!A_PAYER.has(f.statut) || f.nature === "avoir") continue;
      const d = du(f);
      const regle = f.reference === "R2026-000018" ? 1000 : 0;
      e[f.id] = { du: d, regle, reste: Math.round((d - regle) * 100) / 100, etat: regle ? "partielle" : "a_payer", dernier_le: regle ? new Date(aujourdhui - 2 * JOUR).toISOString() : null, nb_reglements: regle ? 1 : 0 };
    }
    return e;
  });
  const [etatsReels, setEtatsReels] = useState<Etats>({});
  const [montrerPayees, setMontrerPayees] = useState(false);
  /* « Noter un paiement » */
  const [aNoter, setANoter] = useState<FactureDuFournisseur | null>(null);
  const [date, setDate] = useState(aujourdhuiIso);
  const [montantSaisi, setMontantSaisi] = useState("");
  const [moyen, setMoyen] = useState<MoyenPaiement>("virement");
  const [referenceSaisie, setReferenceSaisie] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreurPaiement, setErreurPaiement] = useState<string | null>(null);
  const [fait, setFait] = useState<string | null>(null);

  const charger = useCallback(async () => {
    await Promise.resolve();
    setErreur(null);
    try {
      const v = await chargerVueFournisseurs();
      const aLire = v.factures.filter((f) => A_PAYER.has(f.statut) && f.nature !== "avoir");
      const lus = await Promise.all(aLire.map((f) => etatPaiement(f.id).then((e) => [f.id, e] as const).catch(() => [f.id, null] as const)));
      setEtatsReels(Object.fromEntries(lus.filter((x): x is readonly [string, EtatPaiement] => !!x[1])));
      setReel(v);
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
  const etats = source === "exemple" ? etatsExemple : etatsReels;
  const payee = (f: FactureDuFournisseur) => etats[f.id]?.etat === "payee";
  const fournisseur = (id: string | null) => vue?.fournisseurs.find((f) => f.id === id) ?? null;
  const ibanValide = (id: string | null) => vue?.ibans.find((i) => i.fournisseur_id === id && i.statut === "valide") ?? null;
  const ibanPropose = (id: string | null) => vue?.ibans.some((i) => i.fournisseur_id === id && i.statut === "propose") ?? false;

  const validees = useMemo(() => (vue?.factures ?? []).filter((f) => A_PAYER.has(f.statut)), [vue]);
  const nbPayees = validees.filter((f) => etats[f.id]?.etat === "payee").length;
  const lignes = useMemo(
    () =>
      validees
        .filter((f) => montrerPayees || etats[f.id]?.etat !== "payee")
        .sort((a, b) => (a.echeance_lue ?? "9999").localeCompare(b.echeance_lue ?? "9999") || aPayer(b, etats) - aPayer(a, etats)),
    [validees, etats, montrerPayees],
  );
  const parGroupe = useMemo(() => {
    const g: Record<Groupe, FactureDuFournisseur[]> = { retard: [], semaine: [], mois: [], plus_tard: [], sans: [] };
    for (const l of lignes) g[groupeDe(l, aujourdhui)].push(l);
    return g;
  }, [lignes, aujourdhui]);
  const sansIban = lignes.filter((l) => l.nature !== "avoir" && !payee(l) && !ibanValide(l.fournisseur_id)).length;

  const ouvrirPaiement = (f: FactureDuFournisseur) => {
    setErreurPaiement(null);
    setFait(null);
    setDate(aujourdhuiIso());
    setMontantSaisi(String(aPayer(f, etats)).replace(".", ","));
    setMoyen(ibanValide(f.fournisseur_id) ? "virement" : "autre");
    setReferenceSaisie("");
    setANoter(f);
  };
  const montantNet = Number(montantSaisi.replace(/\s/g, "").replace(",", "."));
  const resteANoter = aNoter ? aPayer(aNoter, etats) : 0;
  const montantOk = !montantSaisi.trim() || (Number.isFinite(montantNet) && montantNet > 0 && montantNet <= resteANoter + 0.001);
  const dateOk = !!date && date <= aujourdhuiIso();
  async function soumettrePaiement() {
    if (!aNoter) return;
    const f = aNoter;
    const m = montantSaisi.trim() ? Math.round(montantNet * 100) / 100 : null;
    setEnvoi(true);
    setErreurPaiement(null);
    try {
      if (source === "reelle") {
        await noterPaiement({ facture: f.id, date, montant: m, moyen, reference: referenceSaisie.trim() || null });
        await charger();
      } else {
        await new Promise((r) => setTimeout(r, 300));
        setEtatsExemple((e) => {
          const avant = e[f.id] ?? { du: du(f), regle: 0, reste: du(f), etat: "a_payer" as const, dernier_le: null, nb_reglements: 0 };
          const regle = Math.round((avant.regle + (m ?? avant.reste)) * 100) / 100;
          const reste = Math.round((avant.du - regle) * 100) / 100;
          return { ...e, [f.id]: { ...avant, regle, reste, etat: reste <= 0 ? "payee" : "partielle", dernier_le: new Date(date).toISOString(), nb_reglements: avant.nb_reglements + 1 } };
        });
      }
      const reste = resteANoter - (m ?? resteANoter);
      setFait(`${montant(m ?? resteANoter, f.devise)} notés sur ${f.reference ?? "la facture"} (${LIBELLES_MOYEN[moyen].toLowerCase()})${reste > 0.004 ? ` ; reste ${montant(Math.round(reste * 100) / 100, f.devise)}.` : " : la facture est payée."}`);
      setANoter(null);
    } catch (e) {
      setErreurPaiement(e instanceof Error ? e.message : "La base a refusé le paiement.");
    } finally {
      setEnvoi(false);
    }
  }

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
            <span className="esp-kpi-sous">{parGroupe[g.cle].length ? totaux(parGroupe[g.cle], etats) : g.sous}</span>
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gap: 10, marginBottom: 14 }}>
        {fait ? <Avis teinte="vert" role="status"><strong>C&apos;est fait.</strong> {fait}</Avis> : null}
        <div className="esp-item-haut">
          <span className="esp-kpi-sous">Un paiement se note facture par facture ; le montant affiché est le reste à payer. Une facture payée sort de la liste.</span>
          {nbPayees ? (
            <button type="button" className="esp-filtre" aria-pressed={montrerPayees} onClick={() => setMontrerPayees((v) => !v)}>
              {montrerPayees ? "Masquer" : "Afficher"} les payées ({nbPayees})
            </button>
          ) : null}
        </div>
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
                <span className="esp-kpi-sous">{parGroupe[g.cle].length} facture{parGroupe[g.cle].length > 1 ? "s" : ""} · {totaux(parGroupe[g.cle], etats)}</span>
              </div>
              {/* un cadre qui défile se rejoint au clavier (axe : scrollable-region-focusable) */}
              <div className="esp-tableau-cadre" tabIndex={0} role="region" aria-label={`Factures à payer — ${g.libelle.toLowerCase()}`}>
                <table className="esp-tableau esp-a-payer" style={{ tableLayout: "fixed", minWidth: 860 }}>
                  {/* mêmes largeurs d'un groupe à l'autre : les colonnes s'alignent */}
                  <colgroup>
                    <col style={{ width: "11%" }} />
                    <col style={{ width: "21%" }} />
                    <col style={{ width: "15%" }} />
                    <col style={{ width: "14%" }} />
                    <col style={{ width: "17%" }} />
                    <col style={{ width: "22%" }} />
                  </colgroup>
                  <thead>
                    <tr><th>Échéance</th><th>Fournisseur</th><th>Document</th><th className="esp-num">À payer</th><th>IBAN</th><th>Paiement</th></tr>
                  </thead>
                  <tbody>
                    {parGroupe[g.cle].map((l) => {
                      const four = fournisseur(l.fournisseur_id);
                      const ib = ibanValide(l.fournisseur_id);
                      const st = statutFacture(l.statut);
                      const ep = etats[l.id];
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
                          <td className="esp-num">
                            {montant(aPayer(l, etats), l.devise)}
                            {ep && ep.regle > 0 ? <div className="esp-kpi-sous">sur {montant(ep.du, l.devise)} · {montant(ep.regle, l.devise)} réglés</div> : null}
                          </td>
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
                          <td>
                            <span className="esp-item-haut">
                              {ep?.etat === "payee" ? <Pastille teinte="vert">Payée</Pastille> : ep?.etat === "partielle" ? <Pastille teinte="ambre">Payée en partie</Pastille> : <Pastille teinte={st.teinte}>{st.libelle}</Pastille>}
                              {l.nature !== "avoir" && ep?.etat !== "payee" ? (
                                <button type="button" className="r-btn r-btn--fil r-btn--petit" onClick={() => ouvrirPaiement(l)}><Banknote width={12} height={12} aria-hidden="true" /> Noter un paiement</button>
                              ) : null}
                            </span>
                            {ep?.dernier_le ? <div className="esp-kpi-sous">dernier règlement le {dateCourte(ep.dernier_le)}{ep.nb_reglements > 1 ? ` (${ep.nb_reglements})` : ""}</div> : null}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
          <p className="esp-kpi-sous" style={{ textAlign: "right" }}>Reste à payer : <b>{totaux(lignes.filter((l) => !payee(l)), etats)}</b></p>
        </div>
      )}

      <Dialog open={!!aNoter} onOpenChange={(o) => !o && !envoi && setANoter(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><Banknote width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>Noter un paiement</DialogTitle>
            <DialogDescription>
              {aNoter ? `${fournisseur(aNoter.fournisseur_id)?.nom ?? "Fournisseur"} — ${aNoter.reference ?? ""}${aNoter.numero ? ` (n° ${aNoter.numero})` : ""}. Reste à payer : ${montant(resteANoter, aNoter.devise)}.` : ""} Le paiement est noté, pas exécuté : faites le virement dans votre banque.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              <div className="esp-form-ligne">
                <label className="rv-libelle">Date du paiement
                  <input className="rv-champ" type="date" value={date} max={aujourdhuiIso()} onChange={(e) => setDate(e.target.value)} />
                </label>
                <label className="rv-libelle">Montant
                  <input className="rv-champ" inputMode="decimal" value={montantSaisi} onChange={(e) => setMontantSaisi(e.target.value)} placeholder="vide = tout le reste" />
                </label>
              </div>
              {!dateOk ? <Avis teinte="ambre">La date ne peut pas être dans le futur.</Avis> : null}
              {!montantOk ? <Avis teinte="ambre">Le montant doit être positif et ne pas dépasser le reste à payer ({aNoter ? montant(resteANoter, aNoter.devise) : ""}).</Avis> : null}
              <div className="esp-form-ligne">
                <label className="rv-libelle">Moyen
                  <select className="rv-champ" value={moyen} onChange={(e) => setMoyen(e.target.value as MoyenPaiement)}>
                    {MOYENS_PAIEMENT.map((m) => <option key={m} value={m}>{LIBELLES_MOYEN[m]}</option>)}
                  </select>
                </label>
                <label className="rv-libelle">Référence <span className="esp-kpi-sous">(facultatif)</span>
                  <input className="rv-champ" value={referenceSaisie} onChange={(e) => setReferenceSaisie(e.target.value)} maxLength={120} placeholder="libellé du virement, n° de chèque…" />
                </label>
              </div>
              <p className="esp-kpi-sous" style={{ margin: 0 }}>La même référence sur la même facture ne compte qu&apos;une fois. Réservé au gérant, à l&apos;administrateur et au valideur.</p>
              {erreurPaiement ? <Avis teinte="rouge" role="alert"><strong>Refusé par la base.</strong> {erreurPaiement}</Avis> : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={!montantOk || !dateOk || envoi} onClick={() => void soumettrePaiement()}>{envoi ? <Loader variant="spin" /> : null} Noter le paiement</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
