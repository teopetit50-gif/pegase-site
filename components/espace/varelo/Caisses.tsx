"use client";

/* ══════════════════════════════════════════════════════════════════════
   Les ventes des caisses — VARELO (11/10/2026, B1, migration b1_17)

   Le Z de caisse de chaque magasin, par jour : hier, le même jour de la
   semaine dernière, le mois en cours. Il arrive par l'export du logiciel
   de caisse (jeu « ventes_caisse », lu d'après les modèles Varelo) ou se
   dépose ici. Porte grp_deposer_ventes ; vue grp_ventes_magasins.
   ══════════════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Store, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import { AGENCE, SIEGE } from "../exemples/socle";
import type { Source } from "../source";
import { Avis, Pastille, Vide } from "../ui";
import { dateCourte, montant } from "../format";
import { lireTableau } from "./csv";
import { lireMontant } from "./encours";
import { ANNECY, SOCIETES_EXEMPLE } from "./exemples";
import type { Contexte, Societe } from "./types";

type Magasin = { entite_id: string; societe: string; magasin: string; hier_ttc: number | null; hier_tickets: number | null; semaine_derniere_ttc: number | null; mois_ttc: number | null; dernier_jour: string | null };
type Resultat = { lignes: number; retenues: number; rejetees: number; rejets: { ligne: number; motif: string }[] };

const SYNONYMES: Record<string, string[]> = {
  jour: ["date", "jour", "date de vente", "date du z", "journee", "journée"],
  magasin: ["magasin", "point de vente", "boutique", "etablissement", "établissement", "site", "caisse"],
  ca_ttc: ["ca ttc", "total ttc", "ventes ttc", "montant ttc", "chiffre d'affaires ttc"],
  ca_ht: ["ca ht", "total ht", "ventes ht", "montant ht"],
  tickets: ["tickets", "nombre de tickets", "nb tickets", "transactions", "couverts"],
};
const GABARIT = "Date;Magasin;CA TTC;CA HT;Tickets\n10/10/2026;Lyon Part-Dieu;12 480,00;10 400,00;512";

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const jourIlYa = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return iso(d);
};
const nomDe = (id: string) => SOCIETES_EXEMPLE.find((s) => s.entite_id === id)?.nom ?? "Société";
const EXEMPLE = (): Magasin[] => [
  { entite_id: SIEGE, societe: nomDe(SIEGE), magasin: "Lyon Part-Dieu", hier_ttc: 12480, hier_tickets: 512, semaine_derniere_ttc: 11900, mois_ttc: 118400, dernier_jour: jourIlYa(1) },
  { entite_id: AGENCE, societe: nomDe(AGENCE), magasin: "Grenoble Centre", hier_ttc: 4210, hier_tickets: 188, semaine_derniere_ttc: 6350, mois_ttc: 51200, dernier_jour: jourIlYa(1) },
  { entite_id: ANNECY, societe: nomDe(ANNECY), magasin: "Annecy Vieille Ville", hier_ttc: null, hier_tickets: null, semaine_derniere_ttc: 3900, mois_ttc: 30100, dernier_jour: jourIlYa(2) },
];

export default function Caisses({ source, contexte, client_id, societes, onFait }: { source: Source; contexte: Contexte | null; client_id: string; societes: Societe[]; onFait: (m: string) => void }) {
  const [locaux, setLocaux] = useState<Magasin[]>(EXEMPLE);
  const [reels, setReels] = useState<Magasin[] | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [fictives, setFictives] = useState(false);
  const charger = useCallback(async () => {
    const { data, error } = await createClient().from("grp_ventes_magasins").select("*").eq("client_id", client_id).limit(2000);
    // des Z inventés pour le banc portent « fictif » dans leur source (omega/banc/varelo_groupes_publics.py)
    const f = await createClient().from("grp_ventes_caisse").select("id", { count: "exact", head: true }).eq("client_id", client_id).ilike("source", "%fictif%");
    setFictives((f.count ?? 0) > 0);
    if (error) {
      setErreur(error.message);
      setReels([]);
      return;
    }
    setErreur(null);
    const n = (v: unknown) => (v === null || v === undefined ? null : Number(v));
    setReels(((data ?? []) as Magasin[]).map((m) => ({ ...m, hier_ttc: n(m.hier_ttc), hier_tickets: n(m.hier_tickets), semaine_derniere_ttc: n(m.semaine_derniere_ttc), mois_ttc: n(m.mois_ttc) })));
  }, [client_id]);
  useEffect(() => {
    if (source !== "reelle" || !contexte) return;
    const t = window.setTimeout(() => void charger(), 0);
    return () => window.clearTimeout(t);
  }, [source, contexte, charger]);

  const magasins = useMemo(() => [...((source === "exemple" ? locaux : reels) ?? [])].sort((a, b) => a.societe.localeCompare(b.societe) || a.magasin.localeCompare(b.magasin)), [source, locaux, reels]);
  const hier = magasins.reduce((s, m) => s + (m.hier_ttc ?? 0), 0);
  const avant = magasins.reduce((s, m) => s + (m.semaine_derniere_ttc ?? 0), 0);
  const muets = magasins.filter((m) => m.hier_ttc === null && (m.semaine_derniere_ttc ?? 0) > 0).length;
  const peutDeposer = !!contexte && contexte.role !== "lecteur";
  const [depot, setDepot] = useState(false);

  const deposer = async (entite_id: string, lignes: Record<string, string>[], src: string | null): Promise<Resultat> => {
    if (source === "reelle") {
      const { data, error } = await createClient().rpc("grp_deposer_ventes", { p_client: client_id, p_entite: entite_id, p_lignes: lignes, p_source: src });
      if (error) throw new Error(error.message);
      await charger();
      return data as Resultat;
    }
    await new Promise((x) => setTimeout(x, 300));
    const rejets: Resultat["rejets"] = [];
    const retenues: Record<string, string>[] = [];
    lignes.forEach((l, i) => {
      const ttc = lireMontant(l.ca_ttc ?? "");
      if (!l.magasin?.trim()) rejets.push({ ligne: i + 1, motif: "magasin absent" });
      else if (ttc === null || Number.isNaN(ttc)) rejets.push({ ligne: i + 1, motif: "CA TTC illisible" });
      else retenues.push(l);
    });
    const hierFr = jourIlYa(1).split("-").reverse().join("/");
    setLocaux((prev) => {
      const suite = [...prev];
      for (const l of retenues) {
        const estHier = l.jour === hierFr || l.jour === jourIlYa(1);
        const i = suite.findIndex((m) => m.entite_id === entite_id && m.magasin === l.magasin.trim());
        const ttc = lireMontant(l.ca_ttc) as number;
        if (i >= 0) suite[i] = { ...suite[i], hier_ttc: estHier ? ttc : suite[i].hier_ttc, hier_tickets: estHier && l.tickets ? Number(l.tickets) : suite[i].hier_tickets, dernier_jour: estHier ? jourIlYa(1) : suite[i].dernier_jour };
        else suite.push({ entite_id, societe: nomDe(entite_id), magasin: l.magasin.trim(), hier_ttc: estHier ? ttc : null, hier_tickets: estHier && l.tickets ? Number(l.tickets) : null, semaine_derniere_ttc: null, mois_ttc: ttc, dernier_jour: estHier ? jourIlYa(1) : null });
      }
      return suite;
    });
    return { lignes: lignes.length, retenues: retenues.length, rejetees: rejets.length, rejets };
  };

  return (
    <section id="vrl-caisses" className="esp-carte" aria-label="Ventes des caisses" style={{ marginTop: 16 }}>
      <div className="esp-carte-tete">
        <div>
          <h2 className="esp-carte-titre">Ventes des caisses</h2>
          <p className="esp-kpi-sous" style={{ margin: "2px 0 0" }}>Le Z de chaque magasin, lu dans l&apos;export du logiciel de caisse ou déposé ici : hier, le même jour de la semaine dernière, le mois en cours.</p>
        </div>
        {peutDeposer ? <button type="button" className="r-btn r-btn--fil r-btn--petit" onClick={() => setDepot(true)}><Upload width={14} height={14} aria-hidden="true" /> Déposer des ventes</button> : null}
      </div>
      {erreur ? <Avis teinte="rouge" role="alert"><strong>Les ventes n&apos;ont pas pu être lues.</strong> {erreur}</Avis> : null}
      {source === "reelle" && fictives ? <Avis teinte="ambre"><strong>Ventes de caisse fictives.</strong> Aucun logiciel de caisse réel n&apos;est branché sur ce groupe : ces Z sont inventés pour la démonstration, à la différence des balances.</Avis> : null}
      <dl className="esp-def esp-def--trois" style={{ marginTop: 10 }}>
        <div><dt>Hier, tout le groupe</dt><dd className="esp-def-fort">{montant(hier)}</dd></div>
        <div><dt>Même jour, semaine dernière</dt><dd>{avant ? `${montant(avant)} (${hier >= avant ? "+" : ""}${Math.round((100 * (hier - avant)) / avant)} %)` : "—"}</dd></div>
        <div><dt>Magasins muets hier</dt><dd>{muets ? <Pastille teinte="ambre">{muets}</Pastille> : "aucun"}</dd></div>
      </dl>
      {magasins.length ? (
        <div className="esp-tableau-cadre" tabIndex={0} role="region" aria-label="Ventes par magasin (tableau qui défile)" style={{ marginTop: 10 }}>
          <table className="esp-tableau">
            <thead>
              <tr><th>Magasin</th><th>Société</th><th className="esp-num">Hier</th><th className="esp-num">Semaine dernière</th><th className="esp-num">Mois en cours</th><th>État</th></tr>
            </thead>
            <tbody>
              {magasins.map((m) => {
                const baisse = m.hier_ttc !== null && m.semaine_derniere_ttc ? (m.hier_ttc - m.semaine_derniere_ttc) / m.semaine_derniere_ttc : null;
                return (
                  <tr key={`${m.entite_id}:${m.magasin}`}>
                    <td><span className="vrl-balance-nom">{m.magasin}</span>{m.hier_tickets !== null ? <span className="vrl-paire-sous">{m.hier_tickets} tickets hier</span> : null}</td>
                    <td>{m.societe}</td>
                    <td className="esp-num">{m.hier_ttc === null ? "—" : montant(m.hier_ttc)}</td>
                    <td className="esp-num">{m.semaine_derniere_ttc === null ? "—" : montant(m.semaine_derniere_ttc)}</td>
                    <td className="esp-num">{m.mois_ttc === null ? "—" : montant(m.mois_ttc)}</td>
                    <td>
                      {m.hier_ttc === null ? <Pastille teinte="ambre">Rien remonté hier{m.dernier_jour ? ` (dernier Z le ${dateCourte(m.dernier_jour)})` : ""}</Pastille>
                        : baisse !== null && baisse <= -0.2 ? <Pastille teinte="rouge">{Math.round(baisse * 100)} % sur une semaine</Pastille>
                        : <Pastille teinte="vert" contour>{baisse === null ? "à jour" : `${baisse >= 0 ? "+" : ""}${Math.round(baisse * 100)} %`}</Pastille>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <Vide titre="Aucune vente de caisse">Branchez le logiciel de caisse d&apos;une société (exports automatiques) ou déposez son Z : les ventes de chaque magasin s&apos;affichent ici.</Vide>
      )}
      {depot ? <DialogueVentes societes={societes} onFermer={() => setDepot(false)} deposer={deposer} onFait={onFait} /> : null}
    </section>
  );
}

function DialogueVentes({ societes, onFermer, deposer, onFait }: { societes: Societe[]; onFermer: () => void; deposer: (entite_id: string, lignes: Record<string, string>[], source: string | null) => Promise<Resultat>; onFait: (m: string) => void }) {
  const [entite, setEntite] = useState(societes[0]?.entite_id ?? "");
  const [texte, setTexte] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [resultat, setResultat] = useState<Resultat | null>(null);
  const lecture = useMemo(() => (texte.trim() ? lireTableau(texte, SYNONYMES, ["jour", "magasin", "ca_ttc"]) : null), [texte]);
  const pret = !!entite && !!lecture && lecture.lignes.length > 0 && lecture.manque.length === 0 && lecture.lignes.length <= 20000;
  const envoyer = async () => {
    if (!pret || !lecture) return;
    setEnvoi(true);
    setErreur(null);
    try {
      const r = await deposer(entite, lecture.lignes, "dépôt à la main");
      setResultat(r);
      onFait(`Ventes déposées : ${r.retenues} ligne${r.retenues > 1 ? "s" : ""} retenue${r.retenues > 1 ? "s" : ""}${r.rejetees ? `, ${r.rejetees} rejetée${r.rejetees > 1 ? "s" : ""}` : ""}.`);
    } catch (x) {
      setErreur(x instanceof Error ? x.message : "Le dépôt a échoué.");
    } finally {
      setEnvoi(false);
    }
  };
  return (
    <Dialog open onOpenChange={(o) => !o && !envoi && onFermer()}>
      <DialogContent>
        <DialogHeader>
          <DialogIcone><Store width={18} height={18} aria-hidden="true" /></DialogIcone>
          <DialogTitle>Déposer des ventes de caisse</DialogTitle>
          <DialogDescription>Le Z de chaque magasin, une ligne par magasin et par jour : date, magasin, CA TTC (CA HT et tickets si l&apos;export les donne). Un nouveau dépôt du même jour remplace le précédent.</DialogDescription>
        </DialogHeader>
        <DialogBody>
          {resultat ? (
            <div className="esp-form">
              <Avis teinte="vert" role="status"><strong>{resultat.retenues} ligne{resultat.retenues > 1 ? "s" : ""} retenue{resultat.retenues > 1 ? "s" : ""}</strong>{resultat.rejetees ? `, ${resultat.rejetees} rejetée${resultat.rejetees > 1 ? "s" : ""} : ${resultat.rejets.slice(0, 5).map((r) => `ligne ${r.ligne}, ${r.motif}`).join(" ; ")}` : ""}.</Avis>
            </div>
          ) : (
            <div className="esp-form">
              <label className="rv-libelle">Société <span className="esp-obligatoire">(obligatoire)</span>
                <select className="rv-champ" value={entite} onChange={(x) => setEntite(x.target.value)}>
                  {societes.map((s) => <option key={s.entite_id} value={s.entite_id}>{s.nom}</option>)}
                </select>
              </label>
              <label className="rv-libelle">Les lignes du Z <span className="esp-obligatoire">(obligatoire)</span>
                <textarea className="rv-champ" style={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: 12 }} value={texte} placeholder={GABARIT} onChange={(x) => setTexte(x.target.value)} />
              </label>
              {lecture ? (
                <div className="esp-item-haut">
                  <Pastille teinte={lecture.lignes.length ? "vert" : "rouge"}>{lecture.lignes.length} ligne{lecture.lignes.length > 1 ? "s" : ""}</Pastille>
                  {lecture.reconnues.map((r) => <Pastille key={r.cle} teinte="gris" contour title={`colonne « ${r.entete} »`}>{r.cle}</Pastille>)}
                  {lecture.manque.length ? <Pastille teinte="rouge">il manque : {lecture.manque.join(", ")}</Pastille> : null}
                </div>
              ) : null}
              {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
            </div>
          )}
        </DialogBody>
        <DialogFooter>
          {resultat ? <button type="button" className="r-btn r-btn--noir" onClick={onFermer}>Fermer</button> : (
            <button type="button" className="r-btn r-btn--noir" disabled={!pret || envoi} onClick={envoyer}>{envoi ? <Loader variant="spin" /> : null} Déposer</button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
