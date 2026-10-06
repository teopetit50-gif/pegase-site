"use client";

/* ══════════════════════════════════════════════════════════════════════
   Les sociétés du groupe par pôle (05/10/2026, B1) : nom, SIREN,
   territoire et fuseau, logiciel de gestion, nomenclature, état du
   branchement. Le gérant ou l'administrateur (la DSI) crée un pôle
   (INSERT grp_poles, la politique le veut direct) et inscrit une société
   (grp_ajouter_societe : le territoire est obligatoire — on ne suppose
   jamais la métropole — et le fuseau en découle).
   ══════════════════════════════════════════════════════════════════════ */

import { useMemo, useState } from "react";
import { Building2, FolderPlus } from "lucide-react";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import { EXEMPLE_CLIENT_ID } from "../exemples/socle";
import { Avis, Pastille, Vide } from "../ui";
import type { Actions, Donnees } from "./EcranVarelo";
import { ajouterSociete, creerPole } from "./portes";
import { LIBELLE_BRANCHEMENT, type Pole, type Societe } from "./types";

/* les territoires que le socle sait lire (territoire_calendrier) et leur fuseau */
export const TERRITOIRES: { code: string; libelle: string; fuseau: string }[] = [
  { code: "FR", libelle: "Métropole", fuseau: "Europe/Paris" },
  { code: "GP", libelle: "Guadeloupe", fuseau: "America/Guadeloupe" },
  { code: "MQ", libelle: "Martinique", fuseau: "America/Martinique" },
  { code: "GF", libelle: "Guyane", fuseau: "America/Cayenne" },
  { code: "RE", libelle: "La Réunion", fuseau: "Indian/Reunion" },
  { code: "YT", libelle: "Mayotte", fuseau: "Indian/Mayotte" },
  { code: "PM", libelle: "Saint-Pierre-et-Miquelon", fuseau: "America/Miquelon" },
  { code: "BL", libelle: "Saint-Barthélemy", fuseau: "America/St_Barthelemy" },
  { code: "MF", libelle: "Saint-Martin", fuseau: "America/Marigot" },
  { code: "NC", libelle: "Nouvelle-Calédonie", fuseau: "Pacific/Noumea" },
  { code: "PF", libelle: "Polynésie française", fuseau: "Pacific/Tahiti" },
  { code: "WF", libelle: "Wallis-et-Futuna", fuseau: "Pacific/Wallis" },
];

const cleDe = (nom: string) =>
  nom
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^[^a-z]+/, "")
    .replace(/_+$/, "")
    .slice(0, 40) || "pole";

export default function Societes({ donnees, actions, majLocal, onDepot }: { donnees: Donnees; actions: Actions; majLocal: (f: (d: Donnees) => Donnees) => void; onDepot: () => void }) {
  const parPole = useMemo(() => {
    const groupes: { pole: Pole | null; societes: Societe[] }[] = donnees.poles.map((p) => ({ pole: p, societes: donnees.societes.filter((s) => s.pole_id === p.id) }));
    const sans = donnees.societes.filter((s) => !s.pole_id || !donnees.poles.some((p) => p.id === s.pole_id));
    if (sans.length) groupes.push({ pole: null, societes: sans });
    return groupes;
  }, [donnees.poles, donnees.societes]);
  const codesParSociete = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of donnees.codes) m.set(c.entite_id, (m.get(c.entite_id) ?? 0) + 1);
    return m;
  }, [donnees.codes]);

  const [dialogue, setDialogue] = useState<"pole" | "societe" | null>(null);
  const [nomPole, setNomPole] = useState("");
  const [nom, setNom] = useState("");
  const [siren, setSiren] = useState("");
  const [territoire, setTerritoire] = useState("FR");
  const [pole, setPole] = useState("");
  const [logiciel, setLogiciel] = useState("");
  const [nomenclature, setNomenclature] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [fait, setFait] = useState<string | null>(null);

  const ouvrir = (d: "pole" | "societe") => {
    setErreur(null);
    setNomPole("");
    setNom("");
    setSiren("");
    setTerritoire("FR");
    setPole(donnees.poles[0]?.id ?? "");
    setLogiciel("");
    setNomenclature("");
    setDialogue(d);
  };
  const sirenPropre = siren.replace(/[\s.\-]/g, "");
  const sirenOk = sirenPropre === "" || /^\d{9}$/.test(sirenPropre);
  const pret = dialogue === "pole" ? nomPole.trim().length > 0 : nom.trim().length > 0 && !!territoire && sirenOk;

  const envoyer = async () => {
    if (!dialogue || !pret) return;
    setEnvoi(true);
    setErreur(null);
    try {
      const client_id = actions.contexte?.client_id ?? EXEMPLE_CLIENT_ID;
      if (dialogue === "pole") {
        const cle = cleDe(nomPole);
        if (actions.source === "reelle") {
          await creerPole(client_id, cle, nomPole.trim(), donnees.poles.length + 1);
          await actions.recharger();
        } else {
          await new Promise((r) => setTimeout(r, 300));
          if (donnees.poles.some((p) => p.cle === cle)) throw new Error("Deux pôles ne portent pas la même clé.");
          majLocal((d) => ({ ...d, poles: [...d.poles, { id: `${Date.now()}`, client_id, cle, nom: nomPole.trim(), ordre: d.poles.length + 1, cree_le: new Date().toISOString() }] }));
        }
        setFait(`Le pôle « ${nomPole.trim()} » est créé.`);
      } else {
        const t = TERRITOIRES.find((x) => x.code === territoire)!;
        if (actions.source === "reelle") {
          await ajouterSociete({ client_id, nom: nom.trim(), siren: sirenPropre || null, territoire, pole_id: pole || null, logiciel: logiciel.trim() || null, nomenclature: nomenclature.trim() || null });
          await actions.recharger();
        } else {
          await new Promise((r) => setTimeout(r, 300));
          const id = `${Date.now()}-s`;
          const p = donnees.poles.find((x) => x.id === pole) ?? null;
          majLocal((d) => ({ ...d, societes: [...d.societes, { entite_id: id, client_id, nom: nom.trim(), siren: sirenPropre || null, parent_id: d.societes.find((s) => s.principale)?.entite_id ?? null, principale: false, pole_id: p?.id ?? null, pole: p?.nom ?? null, territoire_iso: territoire, territoire: t.libelle.toLowerCase(), territoire_libelle: t.libelle, fuseau: t.fuseau, logiciel: logiciel.trim() || null, nomenclature: nomenclature.trim() || null, statut_branchement: "a_brancher" }] }));
        }
        setFait(`« ${nom.trim()} » est inscrite au groupe (${t.libelle}, ${t.fuseau}) : il reste à déposer son premier export.`);
      }
      setDialogue(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base a refusé.");
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <section className="esp-carte" aria-label="Sociétés et pôles">
      <div className="esp-carte-tete">
        <h2 className="esp-carte-titre">Sociétés et pôles</h2>
        <span className="esp-kpi-sous">{donnees.societes.length} société{donnees.societes.length > 1 ? "s" : ""} · {donnees.poles.length} pôle{donnees.poles.length > 1 ? "s" : ""}</span>
      </div>
      {fait ? <div style={{ padding: "0 16px 10px" }}><Avis teinte="vert" role="status"><strong>C&apos;est fait.</strong> {fait}</Avis></div> : null}
      {donnees.societes.length === 0 ? (
        <Vide titre="Aucune société inscrite">Le groupe commence par une société : inscrivez-la avec son territoire, puis déposez son export.</Vide>
      ) : (
        parPole.map(({ pole: p, societes }) => (
          <div key={p?.id ?? "sans"}>
            <div className="vrl-pole">{p ? p.nom : "Sans pôle"}</div>
            {societes.length === 0 ? <div className="vrl-societe"><span className="esp-kpi-sous">Aucune société dans ce pôle.</span></div> : null}
            {societes.map((s) => {
              const b = LIBELLE_BRANCHEMENT[s.statut_branchement] ?? LIBELLE_BRANCHEMENT.a_brancher;
              const n = codesParSociete.get(s.entite_id) ?? 0;
              return (
                <div key={s.entite_id} className="vrl-societe">
                  <div>
                    <div style={{ fontWeight: 600 }}>{s.nom}{s.principale ? <span className="vrl-paire-sous" style={{ display: "inline", marginLeft: 6 }}>entité principale</span> : null}</div>
                    <div className="vrl-societe-sous">
                      {s.siren ? <span>SIREN {s.siren}</span> : <span>SIREN non renseigné</span>}
                      <span>{s.territoire_libelle ?? s.territoire_iso ?? "territoire ?"}{s.fuseau ? ` · ${s.fuseau}` : ""}</span>
                      {s.logiciel ? <span>{s.logiciel}</span> : null}
                      {s.nomenclature ? <span>{s.nomenclature}</span> : null}
                      <span>{n} code{n > 1 ? "s" : ""} déposé{n > 1 ? "s" : ""}</span>
                    </div>
                  </div>
                  <Pastille teinte={b.teinte}>{b.libelle}</Pastille>
                </div>
              );
            })}
          </div>
        ))
      )}
      {actions.peutGerer ? (
        <div className="esp-carte-corps" style={{ borderTop: "1px solid var(--r-filet)" }}>
          <div className="esp-actions">
            <button type="button" className="r-btn r-btn--noir r-btn--petit" onClick={() => ouvrir("societe")}><Building2 width={14} height={14} aria-hidden="true" /> Inscrire une société</button>
            <button type="button" className="r-btn r-btn--fil r-btn--petit" onClick={() => ouvrir("pole")}><FolderPlus width={14} height={14} aria-hidden="true" /> Créer un pôle</button>
            <button type="button" className="r-btn r-btn--fil r-btn--petit" onClick={onDepot}>Déposer un export</button>
          </div>
          <p className="esp-kpi-sous" style={{ marginTop: 10 }}>Chaque source se branche en lecture seule, avec l&apos;accord de la DSI, et se débranche de la même façon.</p>
        </div>
      ) : null}

      <Dialog open={!!dialogue} onOpenChange={(o) => !o && !envoi && setDialogue(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone>{dialogue === "pole" ? <FolderPlus width={18} height={18} aria-hidden="true" /> : <Building2 width={18} height={18} aria-hidden="true" />}</DialogIcone>
            <DialogTitle>{dialogue === "pole" ? "Créer un pôle" : "Inscrire une société au groupe"}</DialogTitle>
            <DialogDescription>{dialogue === "pole" ? "Un pôle range des sociétés (distribution, logistique, services…) ; il n'a pas d'effet sur le calcul." : "La société devient une entité du groupe. Son territoire fixe son fuseau et ses délais ; on ne suppose jamais la métropole."}</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              {dialogue === "pole" ? (
                <label className="rv-libelle">Nom du pôle <span className="esp-obligatoire">(obligatoire)</span>
                  <input className="rv-champ" value={nomPole} maxLength={120} onChange={(e) => setNomPole(e.target.value)} />
                  {nomPole.trim() ? <span className="vrl-paire-sous">clé : {cleDe(nomPole)}</span> : null}
                </label>
              ) : (
                <>
                  <label className="rv-libelle">Nom de la société <span className="esp-obligatoire">(obligatoire)</span>
                    <input className="rv-champ" value={nom} maxLength={200} onChange={(e) => setNom(e.target.value)} />
                  </label>
                  <div className="esp-form-ligne">
                    <label className="rv-libelle">SIREN
                      <input className="rv-champ" value={siren} inputMode="numeric" placeholder="9 chiffres" onChange={(e) => setSiren(e.target.value)} aria-invalid={!sirenOk} />
                      {!sirenOk ? <span className="vrl-paire-sous" style={{ color: "var(--esp-rouge)" }}>Un SIREN a neuf chiffres.</span> : null}
                    </label>
                    <label className="rv-libelle">Territoire <span className="esp-obligatoire">(obligatoire)</span>
                      <select className="rv-champ" value={territoire} onChange={(e) => setTerritoire(e.target.value)}>
                        {TERRITOIRES.map((t) => <option key={t.code} value={t.code}>{t.libelle} ({t.fuseau})</option>)}
                      </select>
                    </label>
                  </div>
                  <div className="esp-form-ligne">
                    <label className="rv-libelle">Pôle
                      <select className="rv-champ" value={pole} onChange={(e) => setPole(e.target.value)}>
                        <option value="">Sans pôle</option>
                        {donnees.poles.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}
                      </select>
                    </label>
                    <label className="rv-libelle">Logiciel de gestion
                      <input className="rv-champ" value={logiciel} maxLength={120} placeholder="Sage, EBP, Cegid, tableur…" onChange={(e) => setLogiciel(e.target.value)} />
                    </label>
                  </div>
                  <label className="rv-libelle">Nomenclature des codes
                    <input className="rv-champ" value={nomenclature} maxLength={200} placeholder="Ce que veulent dire ses codes (plan 2019, trois lettres…)" onChange={(e) => setNomenclature(e.target.value)} />
                  </label>
                </>
              )}
              {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={!pret || envoi} onClick={envoyer}>{envoi ? <Loader variant="spin" /> : null} {dialogue === "pole" ? "Créer le pôle" : "Inscrire la société"}</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
