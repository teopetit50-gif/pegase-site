"use client";

/* Le contrôle du dossier (b5_16) : les planches croisées entre elles et contre le CCTP, la DPGF et le règlement du PLU.
   Chaque constat cite la pièce, la page et le texte lu, l'article du règlement, et propose une correction ; le chef de
   projet le décide (corrigé, accepté, écarté avec motif). À l'indice suivant, un nouveau contrôle relié au précédent :
   ce qui ne se retrouve plus passe « corrigé à l'indice B », ce qui reste garde la décision prise. Base réelle :
   lorani_controles, lorani_controle_pieces, lorani_constats sous la RLS ; le croisement tourne dans la base
   (private.lorani_controler, porte lorani_lancer_controle), et seul quand la dernière pièce est lue. Exemple : les
   saisies s'appliquent en mémoire, sans croisement (les constats du contrôle précédent sont reconduits). */

import { useMemo, useState } from "react";
import { FileDown, ScanSearch, ShieldCheck } from "lucide-react";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import { Avis, Pastille } from "../ui";
import { dateCourte } from "../format";
import { deciderConstat, lancerControle, octetsPiece, preparerControle } from "./portes";
import { excelControle, pdfControle, telecharger, type DonneesRapport } from "./rapport";
import type { Constat, Controle as ControleT, ControlePiece, Dossier, PieceProjet, Projet, RolePieceControle } from "./types";

const ROLES: Record<RolePieceControle, string> = { planche: "Planche", cctp: "CCTP", dpgf: "DPGF", plu: "Règlement du PLU", metre: "Métré", cerfa: "Cerfa de la demande", re2020: "Attestation RE2020", bet: "Fond de plan BET", notice: "Notice", autre: "Autre pièce" };
const ROLE_DU_TYPE: Record<string, RolePieceControle> = { lorani_planche: "planche", lorani_cctp: "cctp", lorani_dpgf: "dpgf", lorani_plu_reglement: "plu", lorani_metre: "metre", lorani_cerfa: "cerfa", lorani_attestation_re2020: "re2020", lorani_plan_bet: "bet", lorani_notice: "notice" };
const GRAVITES: Record<Constat["gravite"], { libelle: string; teinte: "rouge" | "ambre" | "gris"; rang: number }> = {
  bloquant: { libelle: "Bloquant", teinte: "rouge", rang: 0 },
  majeur: { libelle: "Majeur", teinte: "ambre", rang: 1 },
  mineur: { libelle: "Mineur", teinte: "gris", rang: 2 },
};
const NATURES: Record<Constat["nature"], string> = { incoherence: "Entre les pièces", plu: "Contre le PLU", cctp_dpgf: "CCTP et DPGF", metre_dpgf: "Métré et DPGF", re2020: "RE2020", accessibilite: "Accessibilité", securite_incendie: "Sécurité incendie" };
const DECISIONS: Record<Exclude<Constat["statut"], "ouvert">, { libelle: string; verbe: string; teinte: "vert" | "bleu" | "gris" }> = {
  corrige: { libelle: "Corrigé", verbe: "Marquer corrigé", teinte: "vert" },
  accepte: { libelle: "Accepté", verbe: "Accepter", teinte: "bleu" },
  ecarte: { libelle: "Écarté", verbe: "Écarter", teinte: "gris" },
};
const STATUTS: Record<ControleT["statut"], { libelle: string; teinte: "gris" | "bleu" | "vert" }> = {
  en_lecture: { libelle: "Pièces en lecture", teinte: "gris" },
  controle: { libelle: "Contrôlé", teinte: "bleu" },
  clos: { libelle: "Clos", teinte: "vert" },
};
/* comme le socle : une pièce reçue, en lecture ou à rattacher n'est pas encore lue */
const EN_LECTURE = ["recue", "en_lecture", "a_rattacher", "en_attente_expediteur"];
const lue = (p: PieceProjet | undefined) => !!p && !EN_LECTURE.includes(p.statut);
const jour = (d: string | null) => (d ? dateCourte(d.length === 10 ? `${d}T12:00:00` : d) : "—");
const indiceSuivant = (i: string) => (/^[A-Y]$/.test(i) ? String.fromCharCode(i.charCodeAt(0) + 1) : /^\d+$/.test(i) ? String(Number(i) + 1) : "");
/* l'unité d'une grandeur du contrat de lecture, d'après son suffixe (hauteur_faitage_m, emprise_sol_m2, espaces_verts_pct…) */
const unite = (g: string | null) => (!g ? "" : g.endsWith("_m2") ? " m²" : g === "cote_altimetrique_m" ? " m NGF" : g.endsWith("_m") ? " m" : g.endsWith("_pct") ? " %" : "");
const pluriel = (n: number, s: string) => `${n} ${s}${n > 1 ? "s" : ""}`;

type Choix = { piece_id: string; role: RolePieceControle; reference: string };
type Form =
  | { type: "nouveau"; precedent: ControleT | null }
  | { type: "decider"; constat: Constat; statut: Exclude<Constat["statut"], "ouvert"> }
  | null;

export default function Controle({ projet, dossier, nommer, peutEcrire, agir }: {
  projet: Projet;
  dossier: Dossier;
  nommer: (id: string | null | undefined) => string;
  peutEcrire: boolean;
  agir: (reel: () => Promise<void>, local: () => Dossier) => Promise<void>;
}) {
  const controles = useMemo(() => dossier.controles.filter((c) => c.projet_id === projet.id).sort((a, b) => b.cree_le.localeCompare(a.cree_le)), [dossier.controles, projet.id]);
  const piecesProjet = useMemo(() => dossier.pieces.filter((p) => p.objet_id === projet.id), [dossier.pieces, projet.id]);
  const [choisi, setChoisi] = useState<string | null>(null);
  const c = controles.find((x) => x.id === choisi) ?? controles[0] ?? null;
  const precedent = c?.precedent_id ? dossier.controles.find((x) => x.id === c.precedent_id) ?? null : null;
  const pieces = useMemo(() => (c ? dossier.controlePieces.filter((x) => x.controle_id === c.id) : []), [dossier.controlePieces, c]);
  const constats = useMemo(() => (c ? dossier.constats.filter((x) => x.controle_id === c.id) : []), [dossier.constats, c]);
  const ouverts = constats.filter((x) => x.statut === "ouvert").sort((a, b) => GRAVITES[a.gravite].rang - GRAVITES[b.gravite].rang || a.titre.localeCompare(b.titre));
  const decides = constats.filter((x) => x.statut !== "ouvert");
  const corrigesIci = c ? dossier.constats.filter((x) => x.corrige_au_controle === c.id) : [];
  const bloquants = ouverts.filter((x) => x.gravite === "bloquant").length;
  const pieceDe = (id: string | undefined) => dossier.pieces.find((p) => p.id === id);

  const [form, setForm] = useState<Form>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [nc, setNc] = useState({ intitule: "", indice: "A" });
  const [choix, setChoix] = useState<Choix[]>([]);
  const [motif, setMotif] = useState("");
  const clientId = dossier.moi?.client_id ?? "";

  const lancer = async (reel: () => Promise<void>, local: () => Dossier) => {
    setEnvoi(true);
    setErreur(null);
    try {
      await agir(reel, local);
      setForm(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base n'a pas répondu.");
    } finally {
      setEnvoi(false);
    }
  };

  const ouvrirNouveau = (prec: ControleT | null) => {
    setErreur(null);
    setNc({ intitule: prec?.intitule ?? "Dossier de permis", indice: prec ? indiceSuivant(prec.indice) : "A" });
    /* à l'indice suivant, les mêmes pièces et les mêmes rôles ; sinon les pièces que leur nature désigne */
    const reprises = prec ? dossier.controlePieces.filter((x) => x.controle_id === prec.id) : [];
    setChoix(prec
      ? reprises.map((x) => ({ piece_id: x.piece_id, role: x.role, reference: x.reference ?? "" }))
      : piecesProjet.filter((p) => ROLE_DU_TYPE[p.type_piece ?? ""]).map((p) => ({ piece_id: p.id, role: ROLE_DU_TYPE[p.type_piece ?? ""], reference: "" })));
    setForm({ type: "nouveau", precedent: prec });
  };
  const basculer = (p: PieceProjet, oui: boolean) =>
    setChoix((l) => (oui ? [...l, { piece_id: p.id, role: ROLE_DU_TYPE[p.type_piece ?? ""] ?? "autre", reference: "" }] : l.filter((x) => x.piece_id !== p.id)));
  const changerChoix = (id: string, v: Partial<Choix>) => setChoix((l) => l.map((x) => (x.piece_id === id ? { ...x, ...v } : x)));

  const soumettreNouveau = () => {
    if (form?.type !== "nouveau") return;
    const v = { client_id: clientId, projet_id: projet.id, intitule: nc.intitule.trim().replace(/\s+/g, " "), indice: nc.indice.trim().toUpperCase(), precedent_id: form.precedent?.id ?? null };
    const lignes = choix.map((x) => ({ piece_id: x.piece_id, role: x.role, reference: x.reference.trim() || null }));
    return lancer(
      () => preparerControle(v, lignes).then((id) => {
        setChoisi(id);
        /* toutes les pièces déjà lues : on lance tout de suite ; sinon la dernière lecture le lancera */
        if (lignes.every((l) => lue(pieceDe(l.piece_id)))) return lancerControle(id).then(() => undefined);
      }),
      () => {
        const id = `local-controle-${Date.now()}`;
        setChoisi(id);
        const nouveau: ControleT = { id, projet_id: projet.id, intitule: v.intitule, indice: v.indice, precedent_id: v.precedent_id, statut: "en_lecture", lance_le: null, constats_nb: 0, cree_le: new Date().toISOString() };
        const cp: ControlePiece[] = lignes.map((l, i) => ({ id: `${id}-p${i}`, controle_id: id, ...l }));
        return { ...dossier, controles: [nouveau, ...dossier.controles], controlePieces: [...dossier.controlePieces, ...cp] };
      },
    );
  };

  const relancer = () => {
    if (!c) return;
    return lancer(
      () => lancerControle(c.id).then(() => undefined),
      () => {
        /* exemple : pas de croisement en mémoire ; les constats encore valables de l'indice précédent sont reconduits */
        const deja = new Set(constats.map((x) => x.precedent_id));
        const repris: Constat[] = precedent
          ? dossier.constats.filter((x) => x.controle_id === precedent.id && x.statut !== "corrige" && !deja.has(x.id))
              .map((x) => ({ ...x, id: `${x.id}-${c.indice}`, controle_id: c.id, precedent_id: x.id }))
          : [];
        const tous = [...constats, ...repris];
        return {
          ...dossier,
          constats: [...dossier.constats, ...repris],
          controles: dossier.controles.map((x) => (x.id === c.id ? { ...x, statut: x.statut === "clos" ? ("clos" as const) : ("controle" as const), lance_le: new Date().toISOString(), constats_nb: tous.filter((k) => k.statut === "ouvert").length } : x)),
        };
      },
    );
  };

  const ouvrirDecision = (k: Constat, statut: Exclude<Constat["statut"], "ouvert">) => {
    setErreur(null);
    setMotif("");
    setForm({ type: "decider", constat: k, statut });
  };
  const soumettreDecision = () => {
    if (form?.type !== "decider") return;
    const v = { statut: form.statut, motif: motif.trim() || null };
    const k = form.constat;
    return lancer(() => deciderConstat(k.id, v), () => ({ ...dossier, constats: dossier.constats.map((x) => (x.id === k.id ? { ...x, ...v, decide_par: dossier.moi?.user_id ?? null, decide_le: new Date().toISOString() } : x)) }));
  };
  /* le rapport : PDF annoté (pages citées, boîtes lues) et Excel */
  const [rapport, setRapport] = useState<"pdf" | "xlsx" | null>(null);
  const donnees = (): DonneesRapport | null => (c ? {
    projet, controle: c, precedent, pieces, constats, corriges: corrigesIci, pieceDe, nommer,
    octets: (p) => (p.chemin ? octetsPiece(p.chemin) : Promise.resolve(null)),
  } : null);
  const exporter = async (format: "pdf" | "xlsx") => {
    const d = donnees();
    if (!d) return;
    setRapport(format);
    setErreur(null);
    try {
      const r = format === "pdf" ? await pdfControle(d) : excelControle(d);
      telecharger(r.nom, r.octets, format === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Le rapport n'a pas pu être fabriqué.");
    } finally {
      setRapport(null);
    }
  };

  const rouvrir = (k: Constat) => lancer(() => deciderConstat(k.id, { statut: "ouvert", motif: null }), () => ({ ...dossier, constats: dossier.constats.map((x) => (x.id === k.id ? { ...x, statut: "ouvert", motif: null } : x)) }));

  const nouveauOk = form?.type === "nouveau" && nc.intitule.trim().length >= 1 && nc.intitule.trim().length <= 160 && /^[0-9A-Za-z.-]{1,6}$/.test(nc.indice.trim())
    && choix.length >= 2 && !controles.some((x) => x.intitule === nc.intitule.trim().replace(/\s+/g, " ") && x.indice === nc.indice.trim().toUpperCase());
  const decisionOk = form?.type === "decider" && (form.statut === "corrige" || motif.trim().length >= 3);

  /* une valeur citée : « PC5, p. 2 : « +10,20 » » */
  const citation = (v: Constat["valeurs"][number], g: string | null) => {
    const ref = v.reference ?? pieceDe(v.piece)?.nom_fichier ?? "pièce";
    if (v.regle) return `Règle : ${v.borne === "max" ? "au plus" : "au moins"} ${String(v.valeur ?? "").replace(".", ",")}${unite(g)}${v.article ? `, article ${v.article}` : ""} (${ref}${v.page ? `, p. ${v.page}` : ""})`;
    return `${ref}${v.page ? `, p. ${v.page}` : ""}${v.texte ? ` : « ${v.texte} »` : ""}`;
  };

  return (
    <div className="esp-carte-corps">
      <div className="esp-section-titre">
        <span>Contrôle du dossier</span>
        <span className="esp-item-haut">
          {c ? <button type="button" className="esp-lien-bouton" disabled={!peutEcrire || envoi} onClick={() => ouvrirNouveau(c)}>Revérifier à l’indice suivant</button> : null}
          <button type="button" className="esp-lien-bouton" disabled={!peutEcrire || envoi || piecesProjet.length < 2} onClick={() => ouvrirNouveau(null)}>Nouveau contrôle</button>
        </span>
      </div>

      {!c ? (
        <div className="lor-tableau-vide">
          {piecesProjet.length < 2
            ? "Déposez les planches, le CCTP, la DPGF ou le règlement du PLU : Lorani les lit, puis croise cotes, surfaces, reculs et postes d’une pièce à l’autre."
            : "Aucun contrôle : choisissez les pièces à croiser (planches entre elles, contre le règlement du PLU, CCTP contre DPGF)."}
        </div>
      ) : (
        <>
          {controles.length > 1 ? (
            <div className="esp-filtres lor-controles" role="group" aria-label="Contrôles du projet">
              {controles.map((x) => (
                <button key={x.id} type="button" className="esp-filtre" aria-pressed={x.id === c.id} onClick={() => setChoisi(x.id)}>
                  {x.intitule} · indice {x.indice}
                </button>
              ))}
            </div>
          ) : null}

          <div className="lor-controle-tete">
            <strong>{c.intitule} · indice {c.indice}</strong>
            <Pastille teinte={STATUTS[c.statut].teinte}>{STATUTS[c.statut].libelle}</Pastille>
            <span className="esp-kpi-sous">
              {c.lance_le ? `passé le ${jour(c.lance_le)}` : "en attente de la lecture des pièces"}
              {precedent ? ` · revérifie l’indice ${precedent.indice}` : ""}
            </span>
            <button type="button" className="esp-lien-bouton" disabled={!peutEcrire || envoi || c.statut === "clos"} onClick={relancer}>{envoi ? <Loader variant="spin" /> : null} {c.lance_le ? "Relancer" : "Lancer"}</button>
          </div>
          {c.lance_le ? (
            <p className="lor-sous" role="status">
              {ouverts.length ? `${pluriel(ouverts.length, "constat")} ouvert${ouverts.length > 1 ? "s" : ""}, dont ${pluriel(bloquants, "bloquant")}.` : "Aucun constat ouvert."}
              {precedent ? ` ${pluriel(corrigesIci.length, "constat")} de l’indice ${precedent.indice} corrigé${corrigesIci.length > 1 ? "s" : ""}.` : ""}
            </p>
          ) : null}
          {c.lance_le ? (
            <div className="esp-actions lor-rapport">
              <button type="button" className="r-btn r-btn--fil r-btn--petit" disabled={!!rapport} onClick={() => void exporter("pdf")}>{rapport === "pdf" ? <Loader variant="spin" /> : <FileDown width={15} height={15} aria-hidden="true" />} Rapport PDF annoté</button>
              <button type="button" className="r-btn r-btn--fil r-btn--petit" disabled={!!rapport} onClick={() => void exporter("xlsx")}>{rapport === "xlsx" ? <Loader variant="spin" /> : <FileDown width={15} height={15} aria-hidden="true" />} Tableau Excel</button>
            </div>
          ) : null}
          {erreur && !form ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}

          <ul className="lor-controle-pieces" aria-label="Pièces croisées">
            {pieces.map((x) => {
              const p = pieceDe(x.piece_id);
              return (
                <li key={x.id}>
                  <strong>{x.reference ?? ROLES[x.role]}</strong> <span className="esp-kpi-sous">{ROLES[x.role]} · {p?.nom_fichier ?? "pièce"}{p && !lue(p) ? " · en lecture" : ""}</span>
                </li>
              );
            })}
          </ul>

          {ouverts.map((k) => (
            <div key={k.id} className="lor-constat" data-gravite={k.gravite}>
              <div className="lor-situation-tete">
                <Pastille teinte={GRAVITES[k.gravite].teinte}>{GRAVITES[k.gravite].libelle}</Pastille>
                <span className="esp-kpi-sous">{NATURES[k.nature]}{k.precedent_id ? ` · relevé depuis l’indice ${precedent?.indice ?? "précédent"}` : ""}</span>
              </div>
              <div>{k.titre}</div>
              {k.correction ? <div className="lor-sous"><strong>Correction proposée :</strong> {k.correction}</div> : null}
              {k.valeurs.length ? (
                <ul className="lor-citations" aria-label="Valeurs lues">
                  {k.valeurs.map((v, i) => <li key={i}>{citation(v, k.grandeur)}</li>)}
                </ul>
              ) : null}
              <div className="esp-actions">
                <button type="button" className="r-btn r-btn--noir r-btn--petit" disabled={!peutEcrire || envoi} onClick={() => ouvrirDecision(k, "corrige")}>Corrigé</button>
                <button type="button" className="r-btn r-btn--fil r-btn--petit" disabled={!peutEcrire || envoi} onClick={() => ouvrirDecision(k, "accepte")}>Accepter</button>
                <button type="button" className="r-btn r-btn--fil r-btn--petit" disabled={!peutEcrire || envoi} onClick={() => ouvrirDecision(k, "ecarte")}>Écarter</button>
              </div>
            </div>
          ))}

          {corrigesIci.length ? (
            <details className="lor-temps-recents">
              <summary>Corrigés depuis l’indice {precedent?.indice ?? "précédent"} ({corrigesIci.length})</summary>
              <ul className="lor-liste">
                {corrigesIci.map((k) => <li key={k.id}><Pastille teinte="vert">Corrigé à l’indice {c.indice}</Pastille> {k.titre}</li>)}
              </ul>
            </details>
          ) : null}
          {decides.length ? (
            <details className="lor-temps-recents">
              <summary>Décidés ({decides.length})</summary>
              <ul className="lor-liste">
                {decides.map((k) => {
                  const d = DECISIONS[k.statut as Exclude<Constat["statut"], "ouvert">];
                  return (
                    <li key={k.id}>
                      <Pastille teinte={d.teinte}>{d.libelle}</Pastille> {k.titre}
                      <span className="lor-sous"> {k.motif ? `Motif : ${k.motif}` : ""}{k.decide_par ? ` · ${nommer(k.decide_par)}, le ${jour(k.decide_le)}` : ""}</span>{" "}
                      <button type="button" className="esp-lien-bouton" disabled={!peutEcrire || envoi} onClick={() => void rouvrir(k)}>Rouvrir</button>
                    </li>
                  );
                })}
              </ul>
            </details>
          ) : null}
        </>
      )}

      {/* ——— nouveau contrôle, ou revérification à l'indice suivant ——— */}
      <Dialog open={form?.type === "nouveau"} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><ScanSearch width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>{form?.type === "nouveau" && form.precedent ? `Revérifier à l’indice suivant` : "Nouveau contrôle du dossier"}</DialogTitle>
            <DialogDescription>
              {form?.type === "nouveau" && form.precedent
                ? `Remplacez les planches qui ont changé d’indice. Ce qui ne se retrouve plus passera « corrigé » sur l’indice ${form.precedent.indice} ; ce qui reste gardera la décision prise.`
                : "Les pièces à croiser : les planches entre elles, contre le règlement du PLU, le CCTP et le métré contre la DPGF. Le contrôle se lance quand toutes sont lues."}
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              <div className="esp-form-ligne">
                <label className="rv-libelle">Intitulé <span className="esp-obligatoire">(obligatoire)</span>
                  <input className="rv-champ" value={nc.intitule} maxLength={160} onChange={(e) => setNc((s) => ({ ...s, intitule: e.target.value }))} placeholder="Dossier de permis" />
                </label>
                <label className="rv-libelle">Indice
                  <input className="rv-champ" value={nc.indice} maxLength={6} onChange={(e) => setNc((s) => ({ ...s, indice: e.target.value }))} />
                </label>
              </div>
              <fieldset className="lor-choix-pieces">
                <legend className="rv-libelle">Pièces croisées <span className="esp-obligatoire">(deux au moins)</span></legend>
                {piecesProjet.map((p) => {
                  const x = choix.find((y) => y.piece_id === p.id);
                  return (
                    <div key={p.id} className="lor-choix-piece">
                      <label className="lor-choix-case">
                        <input type="checkbox" checked={!!x} onChange={(e) => basculer(p, e.target.checked)} /> <span>{p.nom_fichier}</span>
                      </label>
                      {x ? (
                        <span className="lor-choix-role">
                          <select className="rv-champ" aria-label={`Rôle de ${p.nom_fichier}`} value={x.role} onChange={(e) => changerChoix(p.id, { role: e.target.value as RolePieceControle })}>
                            {(Object.keys(ROLES) as RolePieceControle[]).map((r) => <option key={r} value={r}>{ROLES[r]}</option>)}
                          </select>
                          <input className="rv-champ" aria-label={`Référence de ${p.nom_fichier}`} value={x.reference} maxLength={40} placeholder="PC2" onChange={(e) => changerChoix(p.id, { reference: e.target.value })} />
                        </span>
                      ) : null}
                    </div>
                  );
                })}
              </fieldset>
              {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={!nouveauOk || envoi} onClick={soumettreNouveau}>{envoi ? <Loader variant="spin" /> : null} Préparer le contrôle</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ——— décider un constat ——— */}
      <Dialog open={form?.type === "decider"} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><ShieldCheck width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>{form?.type === "decider" ? DECISIONS[form.statut].verbe : ""}</DialogTitle>
            <DialogDescription>
              {form?.type === "decider" ? form.constat.titre : ""}{" "}
              {form?.type === "decider" && form.statut !== "corrige" ? "Le motif est obligatoire ; il suit le constat aux indices suivants." : "Le prochain indice le confirmera : un constat qui se retrouve rouvre."}
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              <label className="rv-libelle">Motif {form?.type === "decider" && form.statut !== "corrige" ? <span className="esp-obligatoire">(obligatoire)</span> : null}
                <textarea className="rv-champ" rows={3} maxLength={500} value={motif} onChange={(e) => setMotif(e.target.value)} placeholder={form?.type === "decider" && form.statut === "ecarte" ? "Dérogation accordée par la mairie le 12/09" : "Planche PC5 reprise"} />
              </label>
              {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={!decisionOk || envoi} onClick={soumettreDecision}>{envoi ? <Loader variant="spin" /> : null} {form?.type === "decider" ? DECISIONS[form.statut].verbe : ""}</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
