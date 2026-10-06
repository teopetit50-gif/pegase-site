"use client";

/* ══════════════════════════════════════════════════════════════════════
   Les lots à valider (05/10/2026, B1) : les propositions du calcul,
   groupées par demande de validation — la paire (code local → objet du
   groupe), la preuve (SIREN, TVA, IBAN, GTIN, nom et code postal,
   similarité) et son score. Le référent écarte une paire ici
   (grp_ecarter_proposition : le code repart seul) et décide du lot dans
   /espace/validations (écran d'A3). Une correction humaine se décide par
   sa demande, jamais ici. Dessous, les dernières décisions.
   ══════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useMemo, useState } from "react";
import { XCircle } from "lucide-react";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import { Avis, Pastille, Vide } from "../ui";
import { dateHeure, relatif } from "../format";
import type { Actions, Donnees } from "./EcranVarelo";
import { LIBELLE_TYPE_ACTION, type DemandeRef, type Proposition, type TypeActionRef } from "./types";

const TEINTE_DEMANDE: Record<string, "ambre" | "vert" | "rouge" | "gris" | "bleu"> = { en_attente: "ambre", approuvee: "bleu", executee: "vert", rejetee: "rouge", annulee: "gris", expiree: "gris", echec_execution: "rouge" };
const LIBELLE_STATUT: Record<string, string> = { en_attente: "En attente", approuvee: "Approuvée", executee: "Exécutée", rejetee: "Refusée", annulee: "Annulée", expiree: "Expirée", echec_execution: "Échec" };
const LIBELLE_PROP: Record<string, string> = { a_valider: "à valider", ecartee: "écartée", executee: "appliquée", rejetee: "refusée", perimee: "périmée" };

function raisonTexte(p: Proposition): string {
  const r = (p.raisons ?? []) as Record<string, unknown>[];
  const parts: string[] = [];
  for (const x of r) {
    const critere = String(x.critere ?? "");
    if (critere === "siren") parts.push(`même SIREN ${x.valeur ?? ""}`.trim());
    else if (critere === "tva") parts.push(`même n° de TVA ${x.valeur ?? ""}`.trim());
    else if (critere === "iban") parts.push(x.egal === false ? "IBAN différents" : "même IBAN");
    else if (critere === "gtin") parts.push(`même GTIN ${x.valeur ?? ""}`.trim());
    else if (critere === "ref_fournisseur") parts.push(`même référence fournisseur ${x.valeur ?? ""}`.trim());
    else if (critere === "nom_cp") parts.push(`même nom et code postal (${x.valeur ?? ""})`);
    else if (critere === "similarite") parts.push(`noms proches${typeof x.score === "number" ? ` (${Math.round((x.score as number) * 100)} %)` : ""}${Array.isArray(x.jetons_communs) ? ` : ${(x.jetons_communs as string[]).join(", ")}` : ""}`);
    else if (critere === "humain") parts.push(x.raison ? `raison : ${x.raison}` : "proposé par une personne");
    else if (critere) parts.push(`${critere}${x.valeur ? ` ${x.valeur}` : ""}${x.egal === false ? " (se contredisent)" : ""}`);
  }
  return parts.join(" · ") || (p.regle ? p.regle : "—");
}

export default function Lots({ donnees, actions }: { donnees: Donnees; actions: Actions }) {
  const codesParId = useMemo(() => new Map(donnees.codes.map((c) => [c.code_id, c])), [donnees.codes]);
  const objetsParId = useMemo(() => new Map(donnees.objets.map((o) => [o.id, o])), [donnees.objets]);
  const lots = useMemo(() => {
    const ouvertes = donnees.propositions.filter((p) => p.statut === "a_valider");
    const m = new Map<string, Proposition[]>();
    for (const p of ouvertes) m.set(p.demande_id ?? "sans", [...(m.get(p.demande_id ?? "sans") ?? []), p]);
    return Array.from(m.entries())
      .map(([id, props]) => ({ demande: donnees.demandes.find((d) => d.id === id) ?? null, props }))
      .sort((a, b) => new Date(a.demande?.cree_le ?? 0).getTime() - new Date(b.demande?.cree_le ?? 0).getTime());
  }, [donnees]);
  const recentes = useMemo(() => donnees.propositions.filter((p) => p.statut !== "a_valider").sort((a, b) => new Date(b.traite_le ?? b.cree_le).getTime() - new Date(a.traite_le ?? a.cree_le).getTime()).slice(0, 6), [donnees.propositions]);

  const equipeDe = (d: DemandeRef | null) => (d?.equipe_id ? actions.contexte?.noms_equipes[d.equipe_id] : undefined);
  const peutEcarter = (d: DemandeRef | null) => {
    if (!actions.contexte || !d) return false;
    const eq = equipeDe(d);
    return actions.contexte.role === "gerant" || actions.contexte.role === "admin" || !eq || actions.contexte.equipes.includes(eq.cle);
  };

  const [aEcarter, setAEcarter] = useState<Proposition | null>(null);
  const [motif, setMotif] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [fait, setFait] = useState<string | null>(null);
  const confirmer = async () => {
    if (!aEcarter) return;
    setEnvoi(true);
    setErreur(null);
    try {
      await actions.ecarter(aEcarter, motif);
      setFait("La paire est écartée : le code repart seul sur son propre objet, le lot continue sans elle.");
      setAEcarter(null);
      setMotif("");
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La paire n'a pas pu être écartée.");
    } finally {
      setEnvoi(false);
    }
  };

  const decrire = (p: Proposition) => {
    const code = p.code_id ? codesParId.get(p.code_id) : null;
    const cible = objetsParId.get(p.objet_cible);
    const source = p.objet_source ? objetsParId.get(p.objet_source) : null;
    const gauche = code
      ? { titre: `${code.code_local} · ${code.nom_local}`, sous: code.societe }
      : p.genre === "fusionner" && source
        ? { titre: `${source.code_groupe} · ${source.nom_groupe}`, sous: `${donnees.codes.filter((c) => c.objet_id === source.id).length} code(s)` }
        : p.genre === "scinder"
          ? { titre: `${p.codes?.length ?? 0} code(s) de ${cible?.code_groupe ?? ""}`, sous: "vers un nouvel objet" }
          : p.genre === "renommer"
            ? { titre: cible?.nom_groupe ?? "", sous: "nom actuel" }
            : { titre: "—", sous: "" };
    const droite = p.genre === "renommer"
      ? { titre: p.nom ?? "", sous: "nom proposé" }
      : p.genre === "detacher"
        ? { titre: "son propre objet", sous: `quitte ${cible?.code_groupe ?? ""}` }
        : { titre: cible ? `${cible.code_groupe} · ${cible.nom_groupe}` : "—", sous: cible ? `${donnees.codes.filter((c) => c.objet_id === cible.id && c.code_id !== p.code_id).length} code(s) déjà là` : "" };
    return { gauche, droite };
  };

  return (
    <section className="esp-carte" aria-label="Lots à valider">
      <div className="esp-carte-tete">
        <h2 className="esp-carte-titre">Lots à valider</h2>
        <span className="esp-kpi-sous">{lots.reduce((n, l) => n + l.props.length, 0)} paire{lots.reduce((n, l) => n + l.props.length, 0) > 1 ? "s" : ""} dans {lots.length} lot{lots.length > 1 ? "s" : ""}</span>
      </div>
      {fait ? <div style={{ padding: "0 16px 10px" }}><Avis teinte="vert" role="status">{fait}</Avis></div> : null}
      {lots.length === 0 ? (
        <Vide titre="Rien à valider">Le prochain passage proposera les paires qu&apos;il trouve ; les lots arrivent aussi dans la file de validation.</Vide>
      ) : (
        lots.map(({ demande, props }) => {
          const eq = equipeDe(demande);
          return (
            <div key={demande?.id ?? "sans"}>
              <div className="esp-groupe-titre" style={{ textTransform: "none", letterSpacing: 0, fontSize: 13, alignItems: "flex-start", gap: 8 }}>
                <span style={{ fontWeight: 600, color: "var(--r-texte)" }}>
                  {demande ? LIBELLE_TYPE_ACTION[demande.type_action as TypeActionRef] ?? demande.type_action : "Propositions sans lot (prochain passage)"}
                  <span className="vrl-paire-sous" style={{ fontWeight: 400 }}>
                    {demande ? `${demande.resume} ${eq ? `· ${eq.nom}` : ""} · ${demande.approbations_requises} approbation${demande.approbations_requises > 1 ? "s" : ""} · ${relatif(demande.cree_le)}` : "Les lots se forment à la fin de chaque passage."}
                  </span>
                </span>
                {demande ? (
                  <span className="esp-item-haut">
                    <Pastille teinte={TEINTE_DEMANDE[demande.statut] ?? "gris"}>{LIBELLE_STATUT[demande.statut] ?? demande.statut}</Pastille>
                    <Link href="/espace/validations" className="r-btn r-btn--fil r-btn--petit">Décider dans la file</Link>
                  </span>
                ) : null}
              </div>
              {props.map((p) => {
                const { gauche, droite } = decrire(p);
                return (
                  <div key={p.id} className="vrl-paire">
                    <div className="vrl-paire-code"><strong>{gauche.titre}</strong><span className="vrl-paire-sous">{gauche.sous}</span></div>
                    <div className="vrl-fleche" aria-hidden="true">→</div>
                    <div className="vrl-paire-code"><strong>{droite.titre}</strong><span className="vrl-paire-sous">{droite.sous}</span></div>
                    <div className="vrl-paire-actions">
                      <Pastille teinte={p.preuve === "sure" ? "vert" : p.preuve === "probable" ? "ambre" : "bleu"} title={raisonTexte(p)}>
                        {p.preuve === "sure" ? "Preuve sûre" : p.preuve === "probable" ? `Probable${p.score !== null ? ` ${Math.round((p.score ?? 0) * 100)} %` : ""}` : "Proposé par une personne"}
                      </Pastille>
                      <span className="vrl-paire-sous" style={{ flexBasis: "100%", textAlign: "right" }}>{raisonTexte(p)}</span>
                      {p.preuve !== "humaine" && peutEcarter(demande) ? (
                        <button type="button" className="r-btn r-btn--fil r-btn--petit" onClick={() => { setErreur(null); setMotif(""); setAEcarter(p); }}>Écarter cette paire</button>
                      ) : p.preuve === "humaine" ? (
                        <span className="vrl-paire-sous">se décide par sa demande</span>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })
      )}

      {recentes.length ? (
        <div className="esp-carte-corps" style={{ borderTop: "1px solid var(--r-filet)" }}>
          <h3 className="esp-section-titre">Dernières décisions</h3>
          <ul className="esp-fil">
            {recentes.map((p) => {
              const { gauche, droite } = decrire(p);
              return (
                <li key={p.id}>
                  <span className="esp-fil-point" data-teinte={p.statut === "executee" ? "vert" : p.statut === "rejetee" ? "rouge" : "gris"} aria-hidden="true" />
                  <div>
                    <div className="esp-fil-texte">{gauche.titre} → {droite.titre} : <strong>{LIBELLE_PROP[p.statut] ?? p.statut}</strong>{p.motif ? ` — ${p.motif}` : ""}</div>
                    <div className="esp-fil-meta">{dateHeure(p.traite_le ?? p.cree_le)} · {raisonTexte(p)}</div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      <Dialog open={!!aEcarter} onOpenChange={(o) => !o && !envoi && setAEcarter(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><XCircle width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>Écarter cette paire</DialogTitle>
            <DialogDescription>Le code repart seul sur son propre objet et ne sera pas reproposé ; le reste du lot continue. La décision est inscrite au journal à votre nom.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              {aEcarter ? <p className="esp-kpi-sous">{decrire(aEcarter).gauche.titre} → {decrire(aEcarter).droite.titre} · {raisonTexte(aEcarter)}</p> : null}
              <label className="rv-libelle">Motif
                <textarea className="rv-champ" value={motif} maxLength={500} placeholder="Deux homonymes, un fournisseur repris, la société elle-même…" onChange={(e) => setMotif(e.target.value)} />
              </label>
              {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={envoi} onClick={confirmer}>{envoi ? <Loader variant="spin" /> : null} Écarter</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
