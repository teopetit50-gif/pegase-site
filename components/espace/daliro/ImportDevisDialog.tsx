"use client";

/* ══════════════════════════════════════════════════════════════════════
   Importer le devis d'un coup (11/10/2026, session B6, b6_28)

   Le tableau collé depuis Excel, ou le CSV exporté du logiciel de devis :
   lu dans le navigateur (devis.ts), montré en aperçu, puis écrit ligne à
   ligne par la base (btp_importer_lignes → btp_ecrire_ligne), qui fait
   les mêmes contrôles qu'une saisie à la main. Le marché reste à vérifier.
   ══════════════════════════════════════════════════════════════════════ */

import { useEffect, useMemo, useState } from "react";
import { FileUp } from "lucide-react";
import { DialogBody, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import type { Source } from "../source";
import { montant, nombreFr } from "../format";
import { Avis } from "../ui";
import { champsPorte, lireDevis, type DevisLu as DevisColle, type LigneLue } from "./devis";
import { deposerDevis, devisLu, importerLignes, type LigneDevisLue } from "./portes";
import type { LigneMarche, Lot, Marche } from "./types";

const UNITE: Record<string, string> = { "m²": "m2", m2: "m2", "m³": "m3", m3: "m3", ml: "ml", m: "ml", u: "u", un: "u", "pce": "u", ens: "ens", ft: "forfait", fft: "forfait", forfait: "forfait", kg: "kg", t: "t", l: "l", h: "h", j: "j" };
const uniteCle = (u: string | null) => (u ? UNITE[u.toLowerCase().replace(/\s/g, "")] ?? null : null);
const nid = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);

/* Les lignes rendues par le lecteur (CHAMPS-LECTURE.md, § Daliro), dans la forme de l'aperçu. Le « lot » lu est un
   code de lot du chantier, sinon un titre de section. */
function depuisLecteur(lignes: LigneDevisLue[], lots: Lot[]): DevisColle {
  const sortie: LigneLue[] = lignes.filter((l) => (l.designation ?? "").trim()).map((l, k) => {
    const lot = l.lot && lots.some((x) => x.code === l.lot) ? l.lot : null;
    const forfait = l.quantite == null && l.prix_unitaire == null;
    return { rang: k + 1, numero: l.numero ?? null, section: lot ? null : l.lot ?? null, designation: (l.designation ?? "").trim().slice(0, 2000),
             unite: l.unite ?? (forfait ? "forfait" : null), quantite: forfait ? null : l.quantite ?? null, pu: forfait ? null : l.prix_unitaire ?? null,
             montant: l.montant ?? (l.quantite != null && l.prix_unitaire != null ? Math.round(l.quantite * l.prix_unitaire * 100) / 100 : null),
             lot, nature: forfait ? "forfait" : "ouvrage" };
  });
  return { colonnes: { designation: 0 }, lignes: sortie, ignorees: lignes.length - sortie.length, erreur: sortie.length ? null : "Le lecteur n'a trouvé aucune ligne chiffrée dans ce PDF." };
}

type Props = {
  client: string;
  marche: Marche;
  lots: Lot[];
  source: Source;
  /* base réelle : relire puis dire ; exemple : ajouter les lignes en mémoire */
  apresReel: (message: string) => Promise<void>;
  appliquerLocal: (lignes: LigneMarche[], message: string) => void;
  fermer: () => void;
};

export default function ImportDevisDialog({ client, marche, lots, source, apresReel, appliquerLocal, fermer }: Props) {
  const [texte, setTexte] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [refus, setRefus] = useState<{ rang: number; designation: string | null; message: string }[]>([]);
  const [pdf, setPdf] = useState<{ etat: "envoi" | "lecture" | "lu" | "echec"; nom: string; lu?: DevisColle; message?: string } | null>(null);
  const lu = useMemo(() => (pdf?.lu ? pdf.lu : texte.trim() ? lireDevis(texte) : null), [texte, pdf]);

  // Le lecteur lit le PDF en quelques dizaines de secondes : on relit toutes les 4 s, trois minutes au plus.
  useEffect(() => {
    if (pdf?.etat !== "lecture") return;
    let tours = 0;
    const t = window.setInterval(() => {
      tours++;
      void devisLu(marche.id).then((d) => {
        if (d.lignes && d.lignes.length) { setPdf((p) => (p ? { ...p, etat: "lu", lu: depuisLecteur(d.lignes ?? [], lots) } : p)); }
        else if (d.statut === "echec" || d.statut === "rejetee" || d.statut === "a_classer" || tours > 45) {
          setPdf((p) => (p ? { ...p, etat: "echec", message: tours > 45 ? "Le lecteur n'a pas encore rendu ce devis : revenez dans quelques minutes, ou collez le tableau." : "Le lecteur n'a pas su lire ce PDF en lignes : collez le tableau ou exportez-le en CSV." } : p));
        }
      }).catch(() => undefined);
    }, 4000);
    return () => window.clearInterval(t);
  }, [pdf?.etat, marche.id, lots]);

  const choisirPdf = async (f: File) => {
    setErreur(null);
    if (source !== "reelle") { setPdf({ etat: "echec", nom: f.name, message: "En exemple, le PDF n'est pas envoyé au lecteur : collez le tableau du devis." }); return; }
    setPdf({ etat: "envoi", nom: f.name });
    try { await deposerDevis(client, marche.id, f); setPdf({ etat: "lecture", nom: f.name }); }
    catch (e) { setPdf({ etat: "echec", nom: f.name, message: e instanceof Error ? e.message : "Le dépôt a échoué." }); }
  };
  const lotDe = (l: LigneLue) => (l.lot ? lots.find((x) => x.code === l.lot || x.libelle.toLowerCase() === l.lot!.toLowerCase())?.id ?? null : null);
  const lotsInconnus = lu ? [...new Set(lu.lignes.filter((l) => l.lot && !lotDe(l)).map((l) => l.lot as string))] : [];
  const total = lu ? Math.round(lu.lignes.reduce((t, l) => t + (l.montant ?? 0), 0) * 100) / 100 : 0;

  const lireFichier = async (f: File) => {
    const brut = await f.arrayBuffer();
    let t = new TextDecoder("utf-8").decode(brut);
    if (t.includes("�")) t = new TextDecoder("windows-1252").decode(brut); // exports Excel « CSV (séparateur : point-virgule) »
    setTexte(t);
  };

  const importer = async () => {
    if (!lu || !lu.lignes.length) return;
    setEnvoi(true);
    setErreur(null);
    setRefus([]);
    try {
      if (source === "reelle") {
        const r = await importerLignes(marche.id, lu.lignes.map((l) => champsPorte(l, lotDe(l))));
        // Les rangs rendus par la base sont ceux de la liste envoyée : on les ramène aux lignes du tableau collé.
        const rf = r.refus.map((x) => ({ ...x, rang: lu.lignes[x.rang - 1]?.rang ?? x.rang }));
        setRefus(rf);
        await apresReel(`${r.creees} ligne${r.creees > 1 ? "s" : ""} importée${r.creees > 1 ? "s" : ""}${rf.length ? `, ${rf.length} refusée${rf.length > 1 ? "s" : ""} (voir la fenêtre)` : ""} : vérifiez le marché ligne à ligne.`);
        if (!rf.length) fermer();
      } else {
        const depart = Math.max(0, ...marche.lignes.map((x) => x.ordre));
        const lignes: LigneMarche[] = lu.lignes.map((l, k) => {
          const unite = l.nature === "forfait" ? "forfait" : uniteCle(l.unite);
          const calc = l.quantite !== null && l.pu !== null ? Math.round(l.quantite * l.pu * 100) / 100 : null;
          const controle: LigneMarche["controle"] = l.nature === "forfait" ? (l.montant === null ? "incomplet" : "ok")
            : l.quantite === null || l.pu === null || l.montant === null || !unite ? "incomplet" : Math.abs((calc ?? 0) - l.montant) > 0.01 ? "montant_faux" : "ok";
          return { id: nid(), marche_id: marche.id, lot_id: lotDe(l), ordre: depart + k + 1, numero: l.numero, section: l.section, designation: l.designation,
                   unite, quantite: l.quantite, nature: l.nature, controle, ecart_accepte: false, ecart_motif: null, corrigee: false,
                   prix_unitaire_ht: l.pu, montant_ht: l.montant, ecart: calc !== null && l.montant !== null ? Math.round((l.montant - calc) * 100) / 100 : null };
        });
        appliquerLocal(lignes, `${lignes.length} lignes importées (exemple) : vérifiez le marché ligne à ligne.`);
        fermer();
      }
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base a refusé l'import.");
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogIcone><FileUp width={18} height={18} aria-hidden="true" /></DialogIcone>
        <DialogTitle>Importer le devis</DialogTitle>
        <DialogDescription>
          Copiez le tableau du devis dans Excel (en-tête compris) et collez-le ici, ou choisissez le fichier CSV exporté de votre logiciel de devis.
          Chaque ligne passe par les mêmes contrôles qu&apos;une saisie ; le marché reste à vérifier.
        </DialogDescription>
      </DialogHeader>
      <DialogBody>
        <div className="esp-form" style={{ gridTemplateColumns: "minmax(0, 1fr)" }}>
          <label className="rv-libelle">Tableau collé
            <textarea className="rv-champ" rows={5} value={texte} onChange={(e) => { setPdf(null); setTexte(e.target.value); }}
                      placeholder={"N°\tDésignation\tU\tQté\tP.U. HT\tMontant HT\tLot\n1.1\tChape ciment\tm²\t38\t48,00\t1 824,00\t02"} />
          </label>
          <label className="rv-libelle">Ou un fichier CSV
            <input className="rv-champ" type="file" accept=".csv,.txt,.tsv,text/csv,text/plain" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setPdf(null); void lireFichier(f); } }} />
          </label>
          <label className="rv-libelle">Ou le devis en PDF (lu par Daliro)
            <input className="rv-champ" type="file" accept=".pdf,application/pdf" onChange={(e) => { const f = e.target.files?.[0]; if (f) void choisirPdf(f); }} />
          </label>
          {pdf && pdf.etat !== "lu" ? (
            <Avis teinte={pdf.etat === "echec" ? "ambre" : "bleu"} role="status">
              {pdf.etat === "envoi" ? `Envoi de « ${pdf.nom} »…` : pdf.etat === "lecture" ? `« ${pdf.nom} » est en lecture : les lignes apparaissent ici dès qu'elles sont lues.` : pdf.message}
            </Avis>
          ) : null}
          {pdf?.etat === "lu" ? <p className="esp-kpi-sous" style={{ margin: 0 }}>Lignes lues dans « {pdf.nom} » : relisez-les avant d&apos;importer.</p> : null}
          {lu?.erreur ? <Avis teinte="ambre" role="status">{lu.erreur}</Avis> : null}
          {lu && lu.lignes.length ? (
            <>
              <p className="esp-kpi-sous" style={{ margin: 0 }}>
                {lu.lignes.length} ligne{lu.lignes.length > 1 ? "s" : ""} lue{lu.lignes.length > 1 ? "s" : ""}, {montant(total)} HT
                {marche.montant_ht_declare !== null ? ` (devis : ${montant(marche.montant_ht_declare)})` : ""}
                {lu.ignorees ? ` ; ${lu.ignorees} ligne${lu.ignorees > 1 ? "s" : ""} de total ou vide${lu.ignorees > 1 ? "s" : ""} ignorée${lu.ignorees > 1 ? "s" : ""}` : ""}.
                {lu.colonnes.unite === undefined ? " Pas de colonne Unité : à compléter à la vérification." : ""}
              </p>
              {lotsInconnus.length ? <Avis teinte="ambre">Lot{lotsInconnus.length > 1 ? "s" : ""} inconnu{lotsInconnus.length > 1 ? "s" : ""} sur ce chantier : {lotsInconnus.join(", ")}. Ces lignes arrivent sans lot ; rattachez-les ensuite.</Avis> : null}
              <div className="esp-tableau-cadre" tabIndex={0} role="region" aria-label="Aperçu des lignes lues (tableau qui défile)">
                <table className="esp-tableau">
                  <thead><tr><th>N°</th><th>Désignation</th><th>Lot</th><th className="esp-num">Qté</th><th>U</th><th className="esp-num">PU HT</th><th className="esp-num">Montant HT</th></tr></thead>
                  <tbody>
                    {lu.lignes.slice(0, 8).map((l) => (
                      <tr key={l.rang}>
                        <td><span className="esp-mono">{l.numero ?? "—"}</span></td>
                        <td>{l.designation}{l.section ? <span className="esp-kpi-sous"> · {l.section}</span> : null}</td>
                        <td><span className="esp-mono">{l.lot ?? "—"}</span></td>
                        <td className="esp-num">{l.quantite === null ? "—" : nombreFr(l.quantite)}</td>
                        <td>{l.unite ?? "—"}</td>
                        <td className="esp-num">{l.pu === null ? "—" : montant(l.pu)}</td>
                        <td className="esp-num">{l.montant === null ? "—" : montant(l.montant)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {lu.lignes.length > 8 ? <p className="esp-kpi-sous" style={{ margin: 0 }}>… et {lu.lignes.length - 8} autres lignes.</p> : null}
            </>
          ) : null}
          {refus.length ? (
            <Avis teinte="rouge" role="alert">
              Refusées par la base : {refus.slice(0, 5).map((x) => `ligne ${x.rang} (${x.designation ?? "sans désignation"}) : ${x.message}`).join(" ; ")}{refus.length > 5 ? ` ; et ${refus.length - 5} autres` : ""}.
            </Avis>
          ) : null}
          {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
        </div>
      </DialogBody>
      <DialogFooter>
        <button type="button" className="r-btn r-btn--noir" onClick={() => void importer()} disabled={envoi || !lu || !lu.lignes.length}>
          {envoi ? <Loader variant="spin" /> : null} Importer {lu?.lignes.length ? `${lu.lignes.length} ligne${lu.lignes.length > 1 ? "s" : ""}` : ""}
        </button>
      </DialogFooter>
    </>
  );
}
