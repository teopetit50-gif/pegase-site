"use client";

/* ══════════════════════════════════════════════════════════════════════
   Les règles du groupe — VARELO (11/10/2026, B1, migration b1_16)

   Une règle s'écrit une fois pour le groupe et s'applique dans chaque
   société : préavis par défaut des contrats, délai de proposition de la
   dénonciation, plafond d'encours par défaut, délai interne de réserve.
   Porte grp_regler_groupe (gérant, administrateur) ; table grp_reglages.
   ══════════════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useState } from "react";
import { Scale } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import type { Source } from "../source";
import { Avis } from "../ui";
import { montant } from "../format";
import { lireMontant } from "./encours";
import type { Contexte } from "./types";

type Regles = { preavis_valeur: number | null; preavis_unite: "jours" | "mois" | null; contrat_jours_decision: number; plafond_defaut: number | null; reserve_jours: number | null };
const EXEMPLE: Regles = { preavis_valeur: 3, preavis_unite: "mois", contrat_jours_decision: 15, plafond_defaut: null, reserve_jours: null };
const VIDE: Regles = { preavis_valeur: null, preavis_unite: null, contrat_jours_decision: 15, plafond_defaut: null, reserve_jours: null };

export default function ReglesGroupe({ source, contexte, client_id, onFait }: { source: Source; contexte: Contexte | null; client_id: string; onFait: (m: string) => void }) {
  const [locales, setLocales] = useState<Regles>(EXEMPLE);
  const [reelles, setReelles] = useState<Regles | null>(null);
  const charger = useCallback(async () => {
    const { data } = await createClient().from("grp_reglages").select("preavis_valeur, preavis_unite, contrat_jours_decision, plafond_defaut, reserve_jours").eq("client_id", client_id).maybeSingle();
    setReelles(data ? { ...(data as Regles), plafond_defaut: data.plafond_defaut === null ? null : Number(data.plafond_defaut) } : VIDE);
  }, [client_id]);
  useEffect(() => {
    if (source !== "reelle" || !contexte) return;
    const t = window.setTimeout(() => void charger(), 0);
    return () => window.clearTimeout(t);
  }, [source, contexte, charger]);

  const r = source === "exemple" ? locales : reelles;
  const peutRegler = contexte?.role === "gerant" || contexte?.role === "admin";
  const [ouvert, setOuvert] = useState(false);

  const regler = async (n: Regles) => {
    if (source === "reelle") {
      const { error } = await createClient().rpc("grp_regler_groupe", { p_client: client_id, p_champs: { preavis_valeur: n.preavis_valeur, preavis_unite: n.preavis_unite, contrat_jours_decision: n.contrat_jours_decision, plafond_defaut: n.plafond_defaut, reserve_jours: n.reserve_jours } });
      if (error) throw new Error(error.message);
      await charger();
    } else {
      await new Promise((x) => setTimeout(x, 300));
      setLocales(n);
    }
    onFait("Les règles du groupe sont posées : elles s'appliquent dans chaque société, et le changement est inscrit au journal.");
  };

  return (
    <section id="vrl-regles" className="esp-carte" aria-label="Règles du groupe" style={{ marginTop: 16 }}>
      <div className="esp-carte-tete">
        <div>
          <h2 className="esp-carte-titre">Règles du groupe</h2>
          <p className="esp-kpi-sous" style={{ margin: "2px 0 0" }}>Écrites une fois, appliquées dans chaque société : un contrat, une livraison ou un client qui n&apos;a pas sa propre règle prend celle du groupe.</p>
        </div>
        {peutRegler && r ? <button type="button" className="r-btn r-btn--fil r-btn--petit" onClick={() => setOuvert(true)}><Scale width={14} height={14} aria-hidden="true" /> Modifier les règles</button> : null}
      </div>
      {r ? (
        <dl className="esp-def esp-def--trois" style={{ marginTop: 10 }}>
          <div><dt>Préavis d&apos;un contrat</dt><dd>{r.preavis_valeur !== null && r.preavis_unite ? `${r.preavis_valeur} ${r.preavis_unite}` : "3 mois (par défaut)"}</dd></div>
          <div><dt>Dénonciation proposée</dt><dd>{r.contrat_jours_decision} jours avant la date limite</dd></div>
          <div><dt>Plafond d&apos;encours d&apos;un client</dt><dd>{r.plafond_defaut !== null ? montant(r.plafond_defaut) : "aucun par défaut"}</dd></div>
          <div><dt>Réserve au transporteur</dt><dd>{r.reserve_jours !== null ? `au plus ${r.reserve_jours} jour${r.reserve_jours > 1 ? "s" : ""} après la livraison` : "le délai légal seul"}</dd></div>
        </dl>
      ) : null}
      {ouvert && r ? <DialogueRegles r={r} onFermer={() => setOuvert(false)} regler={regler} /> : null}
    </section>
  );
}

function DialogueRegles({ r, onFermer, regler }: { r: Regles; onFermer: () => void; regler: (n: Regles) => Promise<void> }) {
  const [preavis, setPreavis] = useState(r.preavis_valeur !== null ? String(r.preavis_valeur) : "");
  const [unite, setUnite] = useState<"jours" | "mois">(r.preavis_unite ?? "mois");
  const [jours, setJours] = useState(String(r.contrat_jours_decision));
  const [plafond, setPlafond] = useState(r.plafond_defaut !== null ? String(r.plafond_defaut).replace(".", ",") : "");
  const [reserve, setReserve] = useState(r.reserve_jours !== null ? String(r.reserve_jours) : "");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const entier = (t: string) => (t.trim() === "" ? null : /^\d+$/.test(t.trim()) ? Number(t.trim()) : NaN);
  const p = entier(preavis), j = entier(jours), res = entier(reserve), m = lireMontant(plafond);
  const valide = (p === null || (!Number.isNaN(p) && p <= 730)) && j !== null && !Number.isNaN(j) && j >= 1 && j <= 120
    && (res === null || (!Number.isNaN(res) && res >= 1 && res <= 30)) && (m === null || (!Number.isNaN(m) && m > 0));
  const envoyer = async () => {
    setEnvoi(true);
    setErreur(null);
    try {
      await regler({ preavis_valeur: p, preavis_unite: p === null ? null : unite, contrat_jours_decision: j as number, plafond_defaut: m, reserve_jours: res });
      onFermer();
    } catch (x) {
      setErreur(x instanceof Error ? x.message : "Les règles n'ont pas été posées.");
    } finally {
      setEnvoi(false);
    }
  };
  return (
    <Dialog open onOpenChange={(o) => !o && !envoi && onFermer()}>
      <DialogContent>
        <DialogHeader>
          <DialogIcone><Scale width={18} height={18} aria-hidden="true" /></DialogIcone>
          <DialogTitle>Règles du groupe</DialogTitle>
          <DialogDescription>Elles s&apos;appliquent dans chaque société. Ce qu&apos;un contrat ou un client porte lui-même (son préavis, son plafond) l&apos;emporte ; une règle de réserve plus courte que la loi avance la date limite, jamais l&apos;inverse.</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <div className="esp-form">
            <div className="esp-form-ligne">
              <label className="rv-libelle">Préavis par défaut d&apos;un contrat
                <input className="rv-champ" inputMode="numeric" value={preavis} placeholder="3" onChange={(x) => setPreavis(x.target.value)} />
              </label>
              <label className="rv-libelle">Unité
                <select className="rv-champ" value={unite} onChange={(x) => setUnite(x.target.value as "jours" | "mois")}>
                  <option value="mois">mois</option>
                  <option value="jours">jours</option>
                </select>
              </label>
            </div>
            <label className="rv-libelle">Proposer la dénonciation, jours avant la date limite <span className="esp-obligatoire">(obligatoire)</span>
              <input className="rv-champ" inputMode="numeric" value={jours} onChange={(x) => setJours(x.target.value)} />
            </label>
            <div className="esp-form-ligne">
              <label className="rv-libelle">Plafond d&apos;encours par défaut (€)
                <input className="rv-champ" inputMode="decimal" value={plafond} placeholder="aucun" onChange={(x) => setPlafond(x.target.value)} />
              </label>
              <label className="rv-libelle">Réserve au plus tard, jours après la livraison
                <input className="rv-champ" inputMode="numeric" value={reserve} placeholder="délai légal" onChange={(x) => setReserve(x.target.value)} />
              </label>
            </div>
            {!valide ? <Avis teinte="ambre">Préavis de 0 à 730, dénonciation de 1 à 120 jours, réserve de 1 à 30 jours, plafond positif ; un champ vide laisse la règle par défaut.</Avis> : null}
            {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
          </div>
        </DialogBody>
        <DialogFooter>
          <button type="button" className="r-btn r-btn--noir" disabled={!valide || envoi} onClick={envoyer}>{envoi ? <Loader variant="spin" /> : null} Enregistrer les règles</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
