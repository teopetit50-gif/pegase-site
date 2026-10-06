"use client";

/* ══════════════════════════════════════════════════════════════════════
   Les réserves à émettre — VARELO (06/10/2026, B1)

   Une livraison reçue avec avarie ou manquant : le transport, les colis, le
   constat, et le compte à rebours de la protestation au transporteur
   (trois jours ouvrables en routier, C. com. art. L133-3 ; sept en CMR ;
   trois en maritime ; quatorze en aérien). Varelo prépare la lettre de
   protestation motivée ; on note son envoi, ou on classe sans suite.

   Portes : grp_enregistrer_reception (toute personne de la société, sauf
   lecteur), grp_lettre_reserve, grp_noter_protestation et
   grp_classer_reception (gérant, administrateur, direction des opérations
   ou juridique).
   ══════════════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useMemo, useState } from "react";
import { FileText, PackageX } from "lucide-react";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import type { Source } from "../source";
import { Avis, Chargement, Pastille, Vide } from "../ui";
import { dateCourte, montant } from "../format";
import { lireMontant } from "./encours";
import {
  LIBELLE_ETAT_RESERVE,
  LIBELLE_MOYEN,
  REGLES,
  RESERVES_EXEMPLE,
  aujourdhui,
  chargerReserves,
  classerReception,
  enregistrerReception,
  etatDe,
  lettreExemple,
  lettreReserve,
  noterProtestation,
  reserveExemple,
  type ChampsReception,
  type Mode,
  type Moyen,
  type Reserve,
} from "./reserves";
import type { Contexte, Objet, Societe } from "./types";

type Props = { source: Source; contexte: Contexte | null; client_id: string; societes: Societe[]; objets: Objet[]; onFait: (m: string) => void };
type Filtre = "a_examiner" | "traitees";
const nouvelId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);

export default function Reserves({ source, contexte, client_id, societes, objets, onFait }: Props) {
  const [locales, setLocales] = useState<Reserve[]>(RESERVES_EXEMPLE);
  const [reelles, setReelles] = useState<Reserve[] | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [filtre, setFiltre] = useState<Filtre>("a_examiner");

  const charger = useCallback(async () => {
    try {
      setReelles(await chargerReserves(client_id));
      setErreur(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base n'a pas répondu.");
      setReelles([]);
    }
  }, [client_id]);
  useEffect(() => {
    if (source !== "reelle" || !contexte) return;
    const t = window.setTimeout(() => void charger(), 0);
    return () => window.clearTimeout(t);
  }, [source, contexte, charger]);

  const toutes = useMemo(() => (source === "exemple" ? locales : (reelles ?? [])), [source, locales, reelles]);
  const liste = useMemo(() => toutes.filter((r) => (filtre === "a_examiner" ? r.statut === "a_examiner" : r.statut !== "a_examiner")).sort((a, b) => a.echeance.localeCompare(b.echeance)), [toutes, filtre]);
  const urgentes = toutes.filter((r) => r.statut === "a_examiner" && (r.etat === "aujourdhui" || r.etat === "demain")).length;
  const ouvertes = toutes.filter((r) => r.statut === "a_examiner").length;
  const enJeu = toutes.filter((r) => r.statut === "a_examiner").reduce((s, r) => s + (r.montant_estime ?? 0), 0);

  const role = contexte?.role;
  const peutSaisir = !!contexte && role !== "lecteur";
  const peutDecider = role === "gerant" || role === "admin" || (role === "valideur" && !!contexte?.equipes.some((e) => e === "direction_operations" || e === "direction_juridique"));

  const [ajout, setAjout] = useState(false);
  const [lettre, setLettre] = useState<{ r: Reserve; texte: string } | null>(null);
  const [suite, setSuite] = useState<Reserve | null>(null);

  const enregistrer = useCallback(
    async (entite_id: string, c: ChampsReception) => {
      if (source === "reelle") {
        const r = await enregistrerReception(client_id, entite_id, c);
        await charger();
        return { statut: r.statut, echeance: r.echeance };
      }
      await new Promise((x) => setTimeout(x, 300));
      const r = reserveExemple(nouvelId(), entite_id, c, c.objet_id ? (objets.find((o) => o.id === c.objet_id)?.nom_groupe ?? null) : null);
      setLocales((prev) => [...prev, r]);
      return { statut: r.statut, echeance: r.echeance };
    },
    [source, client_id, charger, objets],
  );
  const ouvrirLettre = async (r: Reserve) => {
    try {
      const texte = source === "reelle" ? await lettreReserve(r.id) : lettreExemple(r);
      setLettre({ r, texte });
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La lettre n'a pas pu être préparée.");
    }
  };
  const decider = useCallback(
    async (r: Reserve, choix: "protestee" | "sans_suite", date: string, moyen: Moyen, motif: string) => {
      if (source === "reelle") {
        let avert: string | null = null;
        if (choix === "protestee") avert = (await noterProtestation(r.id, date, moyen, motif.trim() || null)).avertissement;
        else await classerReception(r.id, motif.trim());
        await charger();
        return avert;
      }
      await new Promise((x) => setTimeout(x, 300));
      setLocales((prev) => prev.map((x) => {
        if (x.id !== r.id) return x;
        const n = choix === "protestee" ? { ...x, statut: "protestee" as const, protestation_le: date, protestation_moyen: moyen, motif: motif.trim() || null } : { ...x, statut: "sans_suite" as const, motif: motif.trim() };
        return { ...n, etat: etatDe(n) };
      }));
      return choix === "protestee" && (moyen === "courriel" || moyen === "portail") && r.mode === "routier" ? "L'art. L133-3 demande un acte extrajudiciaire ou une lettre recommandée : un courriel ou un portail ne suffit pas." : null;
    },
    [source, charger],
  );

  return (
    <section id="vrl-reserves" className="esp-carte" aria-label="Réserves à émettre" style={{ marginBottom: 16 }}>
      <div className="esp-carte-tete">
        <div>
          <h2 className="esp-carte-titre">Réserves à émettre</h2>
          <p className="esp-kpi-sous" style={{ margin: "2px 0 0" }}>
            Une livraison reçue avec avarie ou manquant : la date limite pour protester auprès du transporteur, la lettre de protestation motivée prête à partir en recommandé, et la suite donnée.
          </p>
        </div>
        {peutSaisir ? (
          <button type="button" className="r-btn r-btn--fil r-btn--petit" onClick={() => setAjout(true)}><PackageX width={14} height={14} aria-hidden="true" /> Enregistrer une livraison</button>
        ) : null}
      </div>
      {erreur ? <Avis teinte="rouge" role="alert"><strong>Les réserves n&apos;ont pas pu être lues.</strong> {erreur}</Avis> : null}
      {source === "reelle" && !reelles ? (
        <Chargement texte="Lecture des livraisons…" />
      ) : (
        <>
          <dl className="esp-def esp-def--trois" style={{ marginTop: 10 }}>
            <div><dt>À protester</dt><dd className="esp-def-fort">{ouvertes}</dd></div>
            <div><dt>Dernier jour ou demain</dt><dd className="esp-def-fort">{urgentes ? <Pastille teinte="rouge">{urgentes} livraison{urgentes > 1 ? "s" : ""}</Pastille> : "aucune"}</dd></div>
            <div><dt>Préjudice estimé en jeu</dt><dd>{montant(enJeu)}</dd></div>
          </dl>
          <div className="esp-filtres" role="group" aria-label="Quelles livraisons" style={{ margin: "12px 0 8px" }}>
            {([["a_examiner", "À protester"], ["traitees", "Protestées ou classées"]] as [Filtre, string][]).map(([k, l]) => (
              <button key={k} type="button" className="esp-filtre" aria-pressed={filtre === k} onClick={() => setFiltre(k)}>{l}</button>
            ))}
          </div>
          {liste.length ? (
            <div className="esp-tableau-cadre" tabIndex={0} role="region" aria-label="Livraisons avec réserves (tableau qui défile)">
              <table className="esp-tableau">
                <thead>
                  <tr>
                    <th>Protester avant le</th>
                    <th>Livraison</th>
                    <th>Société</th>
                    <th>Constat</th>
                    <th>État</th>
                    <th><span className="vrl-masque">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {liste.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <strong>{dateCourte(r.echeance)}</strong>
                        {r.statut === "a_examiner" ? <span className="vrl-paire-sous">{r.jours_restants < 0 ? `passé depuis ${-r.jours_restants} jour${r.jours_restants < -1 ? "s" : ""}` : r.jours_restants === 0 ? "aujourd'hui" : `dans ${r.jours_restants} jour${r.jours_restants > 1 ? "s" : ""}`}</span> : null}
                      </td>
                      <td>
                        <span className="vrl-balance-nom">{r.transporteur}</span>
                        <span className="vrl-paire-sous">reçue le {dateCourte(r.date_reception)} · {REGLES[r.mode].libelle}{r.document_transport ? ` · n° ${r.document_transport}` : ""}{r.expediteur ? ` · de ${r.expediteur}` : ""}</span>
                      </td>
                      <td>{r.societe}</td>
                      <td>
                        {r.avarie ? <Pastille teinte="ambre">Avarie</Pastille> : null} {r.manquant ? <Pastille teinte="ambre">Manquant</Pastille> : null}
                        <span className="vrl-paire-sous">{r.colis_attendus !== null && r.colis_recus !== null ? `${r.colis_recus}/${r.colis_attendus} colis · ` : ""}{r.constat ?? "conforme"}{r.montant_estime !== null ? ` · ${montant(r.montant_estime)}` : ""}</span>
                      </td>
                      <td>
                        <Pastille teinte={LIBELLE_ETAT_RESERVE[r.etat].teinte}>{LIBELLE_ETAT_RESERVE[r.etat].libelle}</Pastille>
                        {r.protestation_le ? <span className="vrl-paire-sous">le {dateCourte(r.protestation_le)}{r.protestation_moyen ? `, ${LIBELLE_MOYEN[r.protestation_moyen]}` : ""}</span> : r.statut === "sans_suite" && r.motif ? <span className="vrl-paire-sous">{r.motif}</span> : null}
                      </td>
                      <td>
                        <span className="esp-item-haut">
                          {r.statut === "a_examiner" ? (
                            <button type="button" className="r-btn r-btn--fil r-btn--petit" onClick={() => void ouvrirLettre(r)} aria-label={`Préparer la lettre de protestation à ${r.transporteur}, livraison du ${dateCourte(r.date_reception)}`}><FileText width={14} height={14} aria-hidden="true" /> Lettre</button>
                          ) : null}
                          {r.statut === "a_examiner" && peutDecider ? (
                            <button type="button" className="r-btn r-btn--noir r-btn--petit" onClick={() => setSuite(r)} aria-label={`Donner la suite de la livraison de ${r.transporteur} du ${dateCourte(r.date_reception)}`}>Suite…</button>
                          ) : null}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Vide titre={filtre === "a_examiner" ? "Aucune réserve à émettre" : "Rien de traité encore"}>{peutSaisir ? "Enregistrez une livraison reçue avec avarie ou manquant : la date limite de la protestation se calcule, et la lettre se prépare." : "Les livraisons avec avarie s'affichent ici."}</Vide>
          )}
        </>
      )}
      {ajout ? <DialogueReception societes={societes} objets={objets} onFermer={() => setAjout(false)} enregistrer={enregistrer} onFait={onFait} /> : null}
      {lettre ? <DialogueLettre r={lettre.r} texte={lettre.texte} onFermer={() => setLettre(null)} /> : null}
      {suite ? <DialogueSuite r={suite} onFermer={() => setSuite(null)} decider={decider} onFait={onFait} /> : null}
    </section>
  );
}

function DialogueReception({ societes, objets, onFermer, enregistrer, onFait }: {
  societes: Societe[];
  objets: Objet[];
  onFermer: () => void;
  enregistrer: (entite_id: string, c: ChampsReception) => Promise<{ statut: string; echeance: string }>;
  onFait: (m: string) => void;
}) {
  const fournisseurs = useMemo(() => objets.filter((o) => o.nature === "fournisseur" && o.statut === "actif" && !o.intragroupe), [objets]);
  const [entite, setEntite] = useState(societes[0]?.entite_id ?? "");
  const [date, setDate] = useState(aujourdhui());
  const [mode, setMode] = useState<Mode>("routier");
  const [transporteur, setTransporteur] = useState("");
  const [document, setDocument] = useState("");
  const [objet, setObjet] = useState("");
  const [expediteur, setExpediteur] = useState("");
  const [attendus, setAttendus] = useState("");
  const [recus, setRecus] = useState("");
  const [avarie, setAvarie] = useState(true);
  const [manquant, setManquant] = useState(false);
  const [constat, setConstat] = useState("");
  const [surBon, setSurBon] = useState("");
  const [montantTxt, setMontantTxt] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const nA = attendus.trim() ? Number(attendus) : null;
  const nR = recus.trim() ? Number(recus) : null;
  const m = lireMontant(montantTxt);
  const valide = !!entite && !!transporteur.trim() && !!date && date <= aujourdhui() && (!(avarie || manquant) || !!constat.trim())
    && (nA === null || (Number.isInteger(nA) && nA >= 0)) && (nR === null || (Number.isInteger(nR) && nR >= 0)) && (m === null || (!Number.isNaN(m) && m >= 0));
  const envoyer = async () => {
    setEnvoi(true);
    setErreur(null);
    try {
      const r = await enregistrer(entite, { date_reception: date, mode, transporteur: transporteur.trim(), document_transport: document.trim() || null, objet_id: objet || null, expediteur: objet ? null : expediteur.trim() || null, colis_attendus: nA, colis_recus: nR, avarie, manquant, constat: constat.trim() || null, reserves_sur_bon: surBon.trim() || null, montant_estime: m });
      onFait(r.statut === "sans_suite" ? "Livraison conforme enregistrée : rien à protester." : `Livraison enregistrée : la protestation à ${transporteur.trim()} doit partir avant le ${dateCourte(r.echeance)}. La lettre est prête.`);
      onFermer();
    } catch (x) {
      setErreur(x instanceof Error ? x.message : "La livraison n'a pas été enregistrée.");
    } finally {
      setEnvoi(false);
    }
  };
  return (
    <Dialog open onOpenChange={(o) => !o && !envoi && onFermer()}>
      <DialogContent>
        <DialogHeader>
          <DialogIcone><PackageX width={18} height={18} aria-hidden="true" /></DialogIcone>
          <DialogTitle>Enregistrer une livraison</DialogTitle>
          <DialogDescription>La date limite de la protestation dépend du mode de transport : {REGLES[mode].jours} jours{REGLES[mode].ouvrables ? " ouvrables" : ""} ({REGLES[mode].libelle.toLowerCase()}). « Sous réserve de déballage » sur le bon ne vaut pas réserve.</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <div className="esp-form">
            <div className="esp-form-ligne">
              <label className="rv-libelle">Société <span className="esp-obligatoire">(obligatoire)</span>
                <select className="rv-champ" value={entite} onChange={(x) => setEntite(x.target.value)}>
                  {societes.map((s) => <option key={s.entite_id} value={s.entite_id}>{s.nom}</option>)}
                </select>
              </label>
              <label className="rv-libelle">Reçue le <span className="esp-obligatoire">(obligatoire)</span>
                <input type="date" className="rv-champ" value={date} max={aujourdhui()} onChange={(x) => setDate(x.target.value)} />
              </label>
            </div>
            <div className="esp-form-ligne">
              <label className="rv-libelle">Transporteur <span className="esp-obligatoire">(obligatoire)</span>
                <input className="rv-champ" value={transporteur} maxLength={200} onChange={(x) => setTransporteur(x.target.value)} />
              </label>
              <label className="rv-libelle">Mode
                <select className="rv-champ" value={mode} onChange={(x) => setMode(x.target.value as Mode)}>
                  {(Object.keys(REGLES) as Mode[]).map((k) => <option key={k} value={k}>{REGLES[k].libelle}</option>)}
                </select>
              </label>
            </div>
            <div className="esp-form-ligne">
              <label className="rv-libelle">N° de lettre de voiture ou connaissement
                <input className="rv-champ" value={document} maxLength={80} onChange={(x) => setDocument(x.target.value)} />
              </label>
              <label className="rv-libelle">Expéditeur (référentiel)
                <select className="rv-champ" value={objet} onChange={(x) => setObjet(x.target.value)}>
                  <option value="">— hors référentiel —</option>
                  {fournisseurs.map((o) => <option key={o.id} value={o.id}>{o.code_groupe} · {o.nom_groupe}</option>)}
                </select>
              </label>
            </div>
            {!objet ? (
              <label className="rv-libelle">…ou son nom
                <input className="rv-champ" value={expediteur} maxLength={200} onChange={(x) => setExpediteur(x.target.value)} />
              </label>
            ) : null}
            <div className="esp-form-ligne">
              <label className="rv-libelle">Colis annoncés
                <input className="rv-champ" inputMode="numeric" value={attendus} onChange={(x) => setAttendus(x.target.value)} />
              </label>
              <label className="rv-libelle">Colis reçus
                <input className="rv-champ" inputMode="numeric" value={recus} onChange={(x) => setRecus(x.target.value)} />
              </label>
            </div>
            <div className="esp-form-ligne">
              <label className="rv-libelle vrl-case"><input type="checkbox" checked={avarie} onChange={(x) => setAvarie(x.target.checked)} /> Avarie</label>
              <label className="rv-libelle vrl-case"><input type="checkbox" checked={manquant} onChange={(x) => setManquant(x.target.checked)} /> Manquant</label>
            </div>
            <label className="rv-libelle">Constat {avarie || manquant ? <span className="esp-obligatoire">(obligatoire)</span> : null}
              <textarea className="rv-champ" value={constat} maxLength={2000} placeholder="ce qui est abîmé ou manque, précisément" onChange={(x) => setConstat(x.target.value)} />
            </label>
            <div className="esp-form-ligne">
              <label className="rv-libelle">Réserves portées sur le bon
                <input className="rv-champ" value={surBon} maxLength={1000} placeholder="si elles ont pu être écrites" onChange={(x) => setSurBon(x.target.value)} />
              </label>
              <label className="rv-libelle">Préjudice estimé (€)
                <input className="rv-champ" inputMode="decimal" value={montantTxt} onChange={(x) => setMontantTxt(x.target.value)} />
              </label>
            </div>
            {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
          </div>
        </DialogBody>
        <DialogFooter>
          <button type="button" className="r-btn r-btn--noir" disabled={!valide || envoi} onClick={envoyer}>{envoi ? <Loader variant="spin" /> : null} Enregistrer la livraison</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DialogueLettre({ r, texte, onFermer }: { r: Reserve; texte: string; onFermer: () => void }) {
  const [copie, setCopie] = useState(false);
  const copier = async () => {
    try {
      await navigator.clipboard.writeText(texte);
      setCopie(true);
    } catch {
      setCopie(false);
    }
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onFermer()}>
      <DialogContent>
        <DialogHeader>
          <DialogIcone><FileText width={18} height={18} aria-hidden="true" /></DialogIcone>
          <DialogTitle>Lettre de protestation — {r.transporteur}</DialogTitle>
          <DialogDescription>À envoyer en lettre recommandée avec accusé de réception (ou par acte de commissaire de justice) avant le {dateCourte(r.echeance)}. Relisez-la, complétez l&apos;adresse du transporteur, joignez les photos.</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <textarea className="rv-champ vrl-lettre" readOnly value={texte} aria-label="Texte de la lettre de protestation" />
          {copie ? <Avis teinte="vert" role="status">Le texte est copié.</Avis> : null}
        </DialogBody>
        <DialogFooter>
          <button type="button" className="r-btn r-btn--noir" onClick={copier}>Copier le texte</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DialogueSuite({ r, onFermer, decider, onFait }: { r: Reserve; onFermer: () => void; decider: (r: Reserve, c: "protestee" | "sans_suite", d: string, m: Moyen, motif: string) => Promise<string | null>; onFait: (m: string) => void }) {
  const [choix, setChoix] = useState<"protestee" | "sans_suite">("protestee");
  const [date, setDate] = useState(aujourdhui());
  const [moyen, setMoyen] = useState<Moyen>("lrar");
  const [motif, setMotif] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const valide = choix === "protestee" ? !!date && date <= aujourdhui() && date >= r.date_reception : !!motif.trim();
  const envoyer = async () => {
    setEnvoi(true);
    setErreur(null);
    try {
      const avert = await decider(r, choix, date, moyen, motif);
      onFait(choix === "protestee" ? `La protestation à ${r.transporteur} est notée, partie le ${dateCourte(date)}${date > r.echeance ? " (hors délai)" : ""}.${avert ? ` ${avert}` : ""}` : `La livraison de ${r.transporteur} est classée sans suite.`);
      onFermer();
    } catch (x) {
      setErreur(x instanceof Error ? x.message : "La suite n'a pas été notée.");
    } finally {
      setEnvoi(false);
    }
  };
  return (
    <Dialog open onOpenChange={(o) => !o && !envoi && onFermer()}>
      <DialogContent>
        <DialogHeader>
          <DialogIcone><PackageX width={18} height={18} aria-hidden="true" /></DialogIcone>
          <DialogTitle>La suite — {r.transporteur}, livraison du {dateCourte(r.date_reception)}</DialogTitle>
          <DialogDescription>Notez la protestation partie (date et moyen), ou classez la livraison sans suite en disant pourquoi. Tout est inscrit au journal.</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <div className="esp-form">
            <label className="rv-libelle">Suite
              <select className="rv-champ" value={choix} onChange={(x) => setChoix(x.target.value as "protestee" | "sans_suite")}>
                <option value="protestee">La protestation est partie</option>
                <option value="sans_suite">Classer sans suite</option>
              </select>
            </label>
            {choix === "protestee" ? (
              <div className="esp-form-ligne">
                <label className="rv-libelle">Partie le
                  <input type="date" className="rv-champ" value={date} min={r.date_reception} max={aujourdhui()} onChange={(x) => setDate(x.target.value)} />
                </label>
                <label className="rv-libelle">Par
                  <select className="rv-champ" value={moyen} onChange={(x) => setMoyen(x.target.value as Moyen)}>
                    {(Object.keys(LIBELLE_MOYEN) as Moyen[]).map((k) => <option key={k} value={k}>{LIBELLE_MOYEN[k]}</option>)}
                  </select>
                </label>
              </div>
            ) : null}
            <label className="rv-libelle">{choix === "sans_suite" ? <>Pourquoi <span className="esp-obligatoire">(obligatoire)</span></> : "Note"}
              <input className="rv-champ" value={motif} maxLength={500} onChange={(x) => setMotif(x.target.value)} />
            </label>
            {choix === "protestee" && (moyen === "courriel" || moyen === "portail") && r.mode === "routier" ? <Avis teinte="ambre">L&apos;article L133-3 demande un acte extrajudiciaire ou une lettre recommandée : un courriel ou un portail ne suffit pas.</Avis> : null}
            {choix === "protestee" && date > r.echeance ? <Avis teinte="ambre">Après la date limite du {dateCourte(r.echeance)} : la protestation sera notée hors délai.</Avis> : null}
            {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
          </div>
        </DialogBody>
        <DialogFooter>
          <button type="button" className="r-btn r-btn--noir" disabled={!valide || envoi} onClick={envoyer}>{envoi ? <Loader variant="spin" /> : null} Noter</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
