"use client";

/* ══════════════════════════════════════════════════════════════════════
   /espace/filed/comptabilite — le FEC des achats et les comptes de FILED
   (06/10/2026, fiche d'A4 §§ 7 et 8).

   L'export : un exercice (filed_exercices) ou une période (par défaut
   l'année civile en cours), une société ; filed_exporter_fec rend le
   fichier, téléchargé TEL QUEL (UTF-8, tabulations, fins de ligne CRLF)
   sous son nom <SIREN>FEC<AAAAMMJJ>.txt ; le bilan (lignes, écritures,
   débit = crédit) et l'alerte si une écriture est déséquilibrée. Bouton
   masqué pour le collaborateur (la base le refuse aussi).
   Les comptes : les cinq rôles, le numéro et le libellé en place (ou la
   valeur par défaut du plan comptable), modifiables par le gérant ou
   l'administrateur (filed_regler_compte_systeme).
   ══════════════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Download, FileText, Pencil, Wallet } from "lucide-react";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import { createClient } from "@/lib/supabase/client";
import { EXEMPLE_CLIENT_ID, ENTITES } from "../exemples/socle";
import { useSource } from "../source";
import { Avis, Chargement, Pastille, Ruban } from "../ui";
import { montant } from "../format";
import { COMPTES_SYSTEME, SOUS_TITRE_FEC, exporterFec, quand, reglerCompte, telecharger, type ExportFec, type RoleCompte } from "./factureElectronique";
import { monClient } from "./portes";

type Exercice = { id: string; libelle: string; debut: string; fin: string; statut: string; entite_id: string | null };
type Compte = { role: RoleCompte; numero: string; libelle: string; regle: boolean };
type Contexte = { client: string; role: string | null; entites: { id: string; nom: string; siren?: string | null }[]; exercices: Exercice[]; comptes: Compte[] };

const annee = new Date().getFullYear();
const EXERCICES_EXEMPLE: Exercice[] = [{ id: "ex-2026", libelle: `Exercice ${annee}`, debut: `${annee}-01-01`, fin: `${annee}-12-31`, statut: "ouvert", entite_id: null }];
const comptesDefaut = (): Compte[] => COMPTES_SYSTEME.map((c) => ({ role: c.role, numero: c.numero, libelle: c.defaut, regle: false }));

/* l'exemple : un FEC fabriqué à partir des écritures d'exemple, au format exact (tabulations, CRLF) */
function fecExemple(du: string, au: string): ExportFec {
  const entete = ["JournalCode", "JournalLib", "EcritureNum", "EcritureDate", "CompteNum", "CompteLib", "CompAuxNum", "CompAuxLib", "PieceRef", "PieceDate", "EcritureLib", "Debit", "Credit", "EcritureLet", "DateLet", "ValidDate", "Montantdevise", "Idevise"];
  const d = (iso: string) => iso.replace(/-/g, "");
  const m = (n: number) => n.toFixed(2).replace(".", ",");
  const lignes = [
    ["HA", "Achats", "41", d(au), "6241", "Transports sur achats", "", "", "R2026-000018", d(au), "TR-2026-0712 Transports Rivière", m(1840), m(0), "", "", d(au), "", ""],
    ["HA", "Achats", "41", d(au), "44566", "TVA déductible sur autres biens et services", "", "", "R2026-000018", d(au), "TR-2026-0712 Transports Rivière", m(368), m(0), "", "", d(au), "", ""],
    ["HA", "Achats", "41", d(au), "401", "Fournisseurs", "RIVIERE", "Transports Rivière", "R2026-000018", d(au), "TR-2026-0712 Transports Rivière", m(0), m(2208), "", "", d(au), "", ""],
  ];
  const contenu = [entete, ...lignes].map((l) => l.join("\t")).join("\r\n") + "\r\n";
  return { nom_fichier: `123456789FEC${d(au)}.txt`, encodage: "UTF-8", separateur: "tabulation", contenu, lignes: lignes.length, ecritures: 1, total_debit: 2208, total_credit: 2208, equilibre: true, ecritures_desequilibrees: 0, du, au, empreinte: "exemple" };
}

export default function EcranComptabilite() {
  const { source } = useSource();
  const [reel, setReel] = useState<Contexte | null>(null);
  const [comptesExemple, setComptesExemple] = useState<Compte[]>(comptesDefaut);
  const [erreurLecture, setErreurLecture] = useState<string | null>(null);

  const charger = useCallback(async () => {
    await Promise.resolve();
    setErreurLecture(null);
    try {
      const moi = await monClient();
      if (!moi) throw new Error("Aucun compte rattaché à cette session.");
      const supabase = createClient();
      const [ex, cs] = await Promise.all([
        supabase.from("filed_exercices").select("id, libelle, debut, fin, statut, entite_id").eq("client_id", moi.client_id).order("debut", { ascending: false }),
        supabase.from("filed_comptes_systeme").select("role, numero, libelle").eq("client_id", moi.client_id),
      ]);
      const regles = new Map(((cs.data ?? []) as { role: RoleCompte; numero: string; libelle: string }[]).map((c) => [c.role, c]));
      setReel({
        client: moi.client_id,
        role: moi.role,
        entites: moi.entites,
        exercices: (ex.data ?? []) as Exercice[],
        comptes: COMPTES_SYSTEME.map((c) => { const r = regles.get(c.role); return r ? { role: c.role, numero: r.numero, libelle: r.libelle, regle: true } : { role: c.role, numero: c.numero, libelle: c.defaut, regle: false }; }),
      });
    } catch (e) {
      setErreurLecture(e instanceof Error ? e.message : "La base n'a pas répondu.");
      setReel({ client: "", role: null, entites: [], exercices: [], comptes: comptesDefaut() });
    }
  }, []);
  useEffect(() => {
    if (source !== "reelle") return;
    const t = window.setTimeout(() => void charger(), 0);
    return () => window.clearTimeout(t);
  }, [source, charger]);

  const ctx: Contexte | null = useMemo(
    () => (source === "exemple" ? { client: EXEMPLE_CLIENT_ID, role: "gerant", entites: ENTITES.map((e) => ({ id: e.id, nom: e.nom, siren: "123456789" })), exercices: EXERCICES_EXEMPLE, comptes: comptesExemple } : reel),
    [source, reel, comptesExemple],
  );
  const peutExporter = !!ctx && ctx.role !== "collaborateur";
  const peutRegler = !!ctx && (ctx.role === "gerant" || ctx.role === "admin");

  /* ——— l'export ——— */
  const [entite, setEntite] = useState("");
  const [mode, setMode] = useState<"exercice" | "periode">("periode");
  const [exercice, setExercice] = useState("");
  const [du, setDu] = useState(`${annee}-01-01`);
  const [au, setAu] = useState(`${annee}-12-31`);
  const [envoi, setEnvoi] = useState(false);
  const [resultat, setResultat] = useState<(ExportFec & { le: string }) | null>(null);
  const [erreurExport, setErreurExport] = useState<{ message: string; code: string | null } | null>(null);
  const entiteChoisie = entite || ctx?.entites[0]?.id || "";

  async function exporter() {
    if (!ctx || !entiteChoisie) return;
    setEnvoi(true);
    setErreurExport(null);
    setResultat(null);
    try {
      const r = source === "reelle"
        ? await exporterFec({ client: ctx.client, entite: entiteChoisie, exercice: mode === "exercice" ? exercice || null : null, du: mode === "periode" ? du : null, au: mode === "periode" ? au : null })
        : (await new Promise((res) => setTimeout(res, 300)), fecExemple(du, au));
      telecharger(r.nom_fichier, r.contenu);
      setResultat({ ...r, le: new Date().toISOString() });
    } catch (e) {
      const o = e as { message?: string; code?: string | null };
      setErreurExport({ message: o.message ?? "La base a refusé l'export.", code: o.code ?? null });
    } finally {
      setEnvoi(false);
    }
  }

  /* ——— les comptes ——— */
  const [edition, setEdition] = useState<Compte | null>(null);
  const [numero, setNumero] = useState("");
  const [libelle, setLibelle] = useState("");
  const [erreurCompte, setErreurCompte] = useState<string | null>(null);
  const [faitCompte, setFaitCompte] = useState<string | null>(null);
  const numeroOk = /^[0-9]{3,12}$/.test(numero.trim());
  async function enregistrerCompte() {
    if (!ctx || !edition) return;
    setEnvoi(true);
    setErreurCompte(null);
    try {
      if (source === "reelle") {
        await reglerCompte({ client: ctx.client, role: edition.role, numero: numero.trim(), libelle: libelle.trim() });
        await charger();
      } else {
        await new Promise((r) => setTimeout(r, 250));
        setComptesExemple((cs) => cs.map((c) => (c.role === edition.role ? { ...c, numero: numero.trim(), libelle: libelle.trim(), regle: true } : c)));
      }
      setFaitCompte(`${COMPTES_SYSTEME.find((c) => c.role === edition.role)?.libelle} : ${numero.trim()} ${libelle.trim()}.`);
      setEdition(null);
    } catch (e) {
      setErreurCompte(e instanceof Error ? e.message : "La base a refusé le compte.");
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <>
      <div className="esp-tete" data-arrivee="">
        <div>
          <h1 className="esp-titre">Comptabilité</h1>
          <p className="esp-sous">Le fichier des écritures d&apos;achats tenues par FILED, et les comptes qu&apos;il emploie.</p>
        </div>
        <div className="esp-item-haut">
          <Link href="/espace/filed" className="r-btn r-btn--fil"><FileText width={15} height={15} aria-hidden="true" /> Documents reçus</Link>
          <Link href="/espace/filed/a-payer" className="r-btn r-btn--fil"><Wallet width={15} height={15} aria-hidden="true" /> À payer</Link>
          <Ruban source={source} />
        </div>
      </div>

      {erreurLecture ? <div style={{ marginBottom: 14 }}><Avis teinte="rouge" role="alert"><strong>La base réelle n&apos;a pas répondu.</strong> {erreurLecture}</Avis></div> : null}

      {!ctx ? (
        <div className="esp-carte"><Chargement texte="Lecture…" /></div>
      ) : (
        <div style={{ display: "grid", gap: 14, gridTemplateColumns: "minmax(0, 1fr)" }}>
          <section className="esp-carte" aria-labelledby="titre-fec">
            <div className="esp-carte-tete">
              <h2 className="esp-carte-titre" id="titre-fec">Fichier des écritures comptables (FEC) — achats</h2>
            </div>
            <div className="esp-carte-corps" style={{ display: "grid", gap: 12 }}>
              <p className="esp-sous" style={{ margin: 0 }}>{SOUS_TITRE_FEC}</p>
              {peutExporter ? (
                <>
                  <div className="esp-form">
                    <div className="esp-form-ligne">
                      <label className="rv-libelle">Société
                        <select className="rv-champ" value={entiteChoisie} onChange={(e) => setEntite(e.target.value)}>
                          {ctx.entites.map((e) => <option key={e.id} value={e.id}>{e.nom}</option>)}
                        </select>
                      </label>
                      <label className="rv-libelle">Période
                        <select className="rv-champ" value={mode} onChange={(e) => setMode(e.target.value as "exercice" | "periode")}>
                          <option value="periode">Des dates</option>
                          <option value="exercice" disabled={!ctx.exercices.length}>Un exercice{ctx.exercices.length ? "" : " (aucun ouvert)"}</option>
                        </select>
                      </label>
                    </div>
                    {mode === "exercice" ? (
                      <label className="rv-libelle">Exercice
                        <select className="rv-champ" value={exercice} onChange={(e) => setExercice(e.target.value)}>
                          <option value="">Choisir…</option>
                          {ctx.exercices.map((x) => <option key={x.id} value={x.id}>{x.libelle}{x.statut === "cloture" ? " (clôturé)" : ""}</option>)}
                        </select>
                      </label>
                    ) : (
                      <div className="esp-form-ligne">
                        <label className="rv-libelle">Du<input className="rv-champ" type="date" value={du} onChange={(e) => setDu(e.target.value)} /></label>
                        <label className="rv-libelle">Au<input className="rv-champ" type="date" value={au} onChange={(e) => setAu(e.target.value)} /></label>
                      </div>
                    )}
                  </div>
                  <div className="esp-actions">
                    <button type="button" className="r-btn r-btn--noir" disabled={envoi || !entiteChoisie || (mode === "exercice" ? !exercice : !du || !au || du > au)} onClick={() => void exporter()}>
                      {envoi ? <Loader variant="spin" /> : <Download width={15} height={15} aria-hidden="true" />} Exporter le FEC
                    </button>
                  </div>
                </>
              ) : (
                <Avis teinte="gris">L&apos;export du FEC est réservé au gérant, à l&apos;administrateur et au valideur.</Avis>
              )}
              {resultat ? (
                <div role="status" style={{ display: "grid", gap: 8 }}>
                  <Avis teinte={resultat.equilibre ? "vert" : "rouge"}>
                    <strong>{resultat.nom_fichier}</strong> téléchargé : {resultat.lignes} ligne{resultat.lignes > 1 ? "s" : ""}, {resultat.ecritures} écriture{resultat.ecritures > 1 ? "s" : ""}, débit {montant(resultat.total_debit)} = crédit {montant(resultat.total_credit)}.
                    {!resultat.equilibre ? ` Attention : ${resultat.ecritures_desequilibrees} écriture(s) déséquilibrée(s). Ne transmettez pas ce fichier ; signalez-le.` : ""}
                  </Avis>
                  <span className="esp-kpi-sous">Export enregistré au journal le {quand(resultat.le)}{resultat.empreinte && resultat.empreinte !== "exemple" ? ` · empreinte ${resultat.empreinte.slice(0, 12)}…` : ""}.</span>
                </div>
              ) : null}
              {erreurExport ? (
                <Avis teinte="rouge" role="alert">
                  <strong>Refusé par la base.</strong> {erreurExport.message}
                  {/SIREN/.test(erreurExport.message) ? " Le SIREN se renseigne sur la fiche de la société, dans les réglages de l'organisation." : ""}
                </Avis>
              ) : null}
            </div>
          </section>

          <section className="esp-carte" aria-labelledby="titre-comptes">
            <div className="esp-carte-tete">
              <h2 className="esp-carte-titre" id="titre-comptes">Les comptes de FILED</h2>
              <span className="esp-kpi-sous">hors plan de charges</span>
            </div>
            <div className="esp-carte-corps" style={{ display: "grid", gap: 10 }}>
              {faitCompte ? <Avis teinte="vert" role="status"><strong>C&apos;est fait.</strong> {faitCompte}</Avis> : null}
              <div className="esp-tableau-cadre" tabIndex={0} role="region" aria-label="Les comptes de FILED">
                <table className="esp-tableau">
                  <thead><tr><th>Rôle</th><th>Compte</th><th>Libellé</th><th aria-label="Modifier" /></tr></thead>
                  <tbody>
                    {ctx.comptes.map((c) => (
                      <tr key={c.role}>
                        <td>{COMPTES_SYSTEME.find((x) => x.role === c.role)?.libelle}</td>
                        <td className="esp-mono">{c.numero}</td>
                        <td>{c.libelle} {c.regle ? null : <Pastille contour title="Valeur du plan comptable général, en l'absence de réglage">par défaut</Pastille>}</td>
                        <td>
                          {peutRegler ? (
                            <button type="button" className="r-btn r-btn--fil r-btn--petit" aria-label={`Modifier le compte : ${COMPTES_SYSTEME.find((x) => x.role === c.role)?.libelle}`} onClick={() => { setEdition(c); setNumero(c.numero); setLibelle(c.libelle); setErreurCompte(null); setFaitCompte(null); }}>
                              <Pencil width={12} height={12} aria-hidden="true" /> Modifier
                            </button>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!peutRegler ? <p className="esp-kpi-sous" style={{ margin: 0 }}>Les comptes se règlent par le gérant ou l&apos;administrateur.</p> : null}
            </div>
          </section>
        </div>
      )}

      <Dialog open={!!edition} onOpenChange={(o) => !o && !envoi && setEdition(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><Pencil width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>Modifier le compte</DialogTitle>
            <DialogDescription>{edition ? COMPTES_SYSTEME.find((x) => x.role === edition.role)?.libelle : ""} — employé dans les écritures que FILED passera à partir de maintenant ; les écritures passées ne changent pas.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              <label className="rv-libelle">Numéro de compte
                <input className="rv-champ esp-mono" inputMode="numeric" value={numero} onChange={(e) => setNumero(e.target.value)} />
              </label>
              {numero && !numeroOk ? <Avis teinte="ambre">Numéro de compte : de 3 à 12 chiffres.</Avis> : null}
              <label className="rv-libelle">Libellé
                <input className="rv-champ" value={libelle} onChange={(e) => setLibelle(e.target.value)} maxLength={200} />
              </label>
              {erreurCompte ? <Avis teinte="rouge" role="alert">{erreurCompte}</Avis> : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={!numeroOk || !libelle.trim() || envoi} onClick={() => void enregistrerCompte()}>{envoi ? <Loader variant="spin" /> : null} Enregistrer</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
