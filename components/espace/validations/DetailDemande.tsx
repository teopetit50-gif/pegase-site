"use client";

/* Le détail d'une demande et ses quatre actions (05/10/2026).
   Voir l'en-tête de FileValidations.tsx. Les formulaires sont des Dialog
   (components/ui/dialog) ; chaque champ obligatoire l'est parce que la
   règle le dit (regles.ts → exigences()) et le bouton d'envoi reste gris
   tant que ce qu'elle exige n'est pas là. */

import { useId, useMemo, useState } from "react";
import { Check, FileText, Pencil, Users, X } from "lucide-react";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import type { Source } from "../source";
import { Avis, Def, Pastille } from "../ui";
import { dateCourte, dateHeure, libelleModule, montant, phrase, relatif } from "../format";
import type { Approbation, Delegation, Demande, Entite } from "../types";
import { MOTIFS_REFUS, STATUTS, compteApprobations, delegationsUtilisables, exigences, groupeDe, verdict, type Decideur } from "./regles";
import { decider, deleguer, joindrePiece, modifier } from "./portes";

type Props = {
  demande: Demande;
  approbations: Approbation[];
  delegations: Delegation[];
  moi: Decideur;
  source: Source;
  clientId: string;
  /* l'adresse de la personne connectée, expéditeur du dépôt d'une pièce */
  email: string | null;
  entites: Entite[];
  personnes: { id: string; libelle: string }[];
  nommer: (id: string | null | undefined) => string;
  nommerEntite: (id: string | null | undefined) => string;
  onDecisionLocale: (a: Approbation) => void;
  onDemandeLocale: (d: Demande, remplace: string) => void;
  onDelegationLocale: (g: Delegation) => void;
  recharger: () => Promise<void>;
};

type Formulaire = "approuver" | "refuser" | "modifier" | "deleguer" | null;

const uuidLocal = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;

export default function DetailDemande(p: Props) {
  const { demande: d, approbations, delegations, moi, source } = p;
  const [form, setForm] = useState<Formulaire>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [fait, setFait] = useState<string | null>(null);

  const ex = useMemo(() => exigences(d), [d]);
  const v = useMemo(() => verdict(d, moi, approbations, delegations), [d, moi, approbations, delegations]);
  const compte = useMemo(() => compteApprobations(d, approbations), [d, approbations]);
  const delegs = useMemo(() => delegationsUtilisables(d, moi, delegations), [d, moi, delegations]);
  const grp = groupeDe(d);

  /* ——— champs des formulaires ——— */
  const [commentaire, setCommentaire] = useState("");
  const [motif, setMotif] = useState("");
  const [motifLibre, setMotifLibre] = useState("");
  const [fichier, setFichier] = useState<File | null>(null);
  const [auNomDe, setAuNomDe] = useState<string>("");
  const [resume, setResume] = useState(d.resume);
  const [montantMod, setMontantMod] = useState(d.montant?.toString() ?? "");
  const [delegataire, setDelegataire] = useState("");
  const [delegModule, setDelegModule] = useState<string>(d.module);
  const [delegFin, setDelegFin] = useState("");
  const [delegMotif, setDelegMotif] = useState("");

  const ouvrir = (f: Formulaire) => {
    setErreur(null);
    setFait(null);
    setCommentaire("");
    setMotif("");
    setMotifLibre("");
    setFichier(null);
    setAuNomDe(v.peut && v.au_nom_de ? v.au_nom_de.id : "");
    setResume(d.resume);
    setMontantMod(d.montant?.toString() ?? "");
    setDelegataire("");
    setDelegModule(d.module);
    setDelegFin("");
    setDelegMotif("");
    setForm(f);
  };

  const motifComplet = motif === MOTIFS_REFUS[MOTIFS_REFUS.length - 1] || !motif ? motifLibre.trim() : `${motif}${motifLibre.trim() ? ` — ${motifLibre.trim()}` : ""}`;

  const pretApprouver = (!ex.commentaire || commentaire.trim().length >= 3) && (!ex.piece_jointe || !!fichier);
  const pretRefuser = (!ex.motif_refus || motifComplet.length >= 3) && (!ex.piece_jointe || !!fichier);
  const montantNum = montantMod.trim() === "" ? null : Number(montantMod.replace(/\s/g, "").replace(",", "."));
  const pretModifier = resume.trim().length >= 1 && resume.trim().length <= 500 && (montantNum === null || (Number.isFinite(montantNum) && montantNum >= 0)) && (resume.trim() !== d.resume || montantNum !== d.montant);
  const pretDeleguer = !!delegataire && delegataire !== moi.id;

  const delegChoisie = delegs.find((g) => g.id === auNomDe) ?? null;

  async function envoyer(action: () => Promise<void>, message: string) {
    setEnvoi(true);
    setErreur(null);
    try {
      await action();
      setFait(message);
      setForm(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base a refusé l'opération.");
    } finally {
      setEnvoi(false);
    }
  }

  const soumettreDecision = (decision: "approuve" | "rejete") =>
    envoyer(async () => {
      let texte = decision === "approuve" ? commentaire.trim() : [motifComplet, commentaire.trim()].filter(Boolean).join(" — ");
      let piece_id: string | null = null;
      if (fichier) {
        if (source === "reelle") {
          const jointe = await joindrePiece({ demande: d, client_id: p.clientId, entite_id: d.entite_id, fichier, expediteur: p.email });
          piece_id = jointe.piece_id;
          /* sans identifiant de pièce (module sans porte de dépôt), le chemin reste cité */
          if (!piece_id) texte = `${texte}${texte ? "\n" : ""}Pièce jointe : ${jointe.chemin}`;
        } else {
          texte = `${texte}${texte ? "\n" : ""}Pièce jointe : ${fichier.name}`;
        }
      }
      if (source === "reelle") {
        await decider({ demande: d, user_id: moi.id, decision, commentaire: texte || null, au_nom_de: delegChoisie, piece_id });
        await p.recharger();
      } else {
        await new Promise((r) => setTimeout(r, 350));
        p.onDecisionLocale({
          id: uuidLocal(),
          demande_id: d.id,
          client_id: d.client_id,
          user_id: moi.id,
          au_nom_de: delegChoisie?.delegant ?? null,
          delegation_id: delegChoisie?.id ?? null,
          decision,
          commentaire: texte || null,
          piece_id: null,
          decide_le: new Date().toISOString(),
        });
      }
    }, decision === "approuve" ? "Votre approbation est enregistrée." : "Votre refus est enregistré, avec son motif.");

  const soumettreModification = () =>
    envoyer(async () => {
      const payload = { ...d.payload, remplace: d.id };
      if (source === "reelle") {
        await modifier({ demande: d, resume: resume.trim(), montant: montantNum, payload });
        await p.recharger();
      } else {
        await new Promise((r) => setTimeout(r, 350));
        p.onDemandeLocale({ ...d, id: uuidLocal(), resume: resume.trim(), montant: montantNum, payload, cree_le: new Date().toISOString(), demandeur_id: moi.id, demandeur_type: "utilisateur" }, d.id);
      }
    }, "La demande modifiée remplace l'ancienne ; elle repart en validation — et comme vous l'avez saisie, c'est à quelqu'un d'autre de la décider.");

  const soumettreDelegation = () =>
    envoyer(async () => {
      const fin = delegFin ? new Date(`${delegFin}T23:59:59`).toISOString() : null;
      const mod = delegModule === "*" ? null : delegModule;
      if (source === "reelle") {
        await deleguer({ client_id: p.clientId, delegant: moi.id, delegataire, module: mod, entite_id: null, fin, motif: delegMotif.trim() || null });
        await p.recharger();
      } else {
        await new Promise((r) => setTimeout(r, 350));
        p.onDelegationLocale({ id: uuidLocal(), client_id: d.client_id, delegant: moi.id, delegataire, entite_id: null, module: mod, debut: new Date().toISOString(), fin, motif: delegMotif.trim() || null, revoquee_le: null });
      }
    }, "La délégation est posée : la personne désignée peut décider en votre nom.");

  const payloadVisible = Object.entries(d.payload ?? {}).filter(([k]) => k !== "exigences" && k !== "remplace");
  /* les clés de payload les plus courantes, en clair ; les autres passent par phrase() */
  const LIBELLES_PAYLOAD: Record<string, string> = {
    beneficiaire: "Bénéficiaire",
    iban: "IBAN",
    reference: "Référence",
    date_execution: "Date d'exécution",
    echeance_facture: "Échéance de la facture",
    fournisseur: "Fournisseur",
    creancier: "Créancier",
    mandat: "Mandat",
    periode: "Période",
    controles: "Contrôles",
    du: "Du",
    au: "Au",
    solde_restant: "Solde restant",
    remplacement: "Remplacement",
    lignes: "Lignes",
    livraison: "Livraison",
    banque: "Banque",
    jusqu_au: "Jusqu'au",
    motif: "Motif",
    controle: "Contrôle",
    ancien_iban: "Ancien IBAN",
    nouvel_iban: "Nouvel IBAN",
    locataire: "Locataire",
    etat_des_lieux: "État des lieux",
    restitution: "Restitution",
  };

  return (
    <div className="esp-carte">
      <div className="esp-carte-tete">
        <div className="esp-item-haut">
          <Pastille teinte="noir">{libelleModule(d.module)}</Pastille>
          <Pastille contour>{phrase(d.type_action)}</Pastille>
          <Pastille teinte={STATUTS[d.statut].teinte}>{STATUTS[d.statut].libelle}</Pastille>
        </div>
        <span className="esp-item-echeance esp-kpi-sous" data-retard={grp === "retard"} data-proche={grp === "aujourdhui"}>
          {d.echeance ? `Échéance ${relatif(d.echeance)} · ${dateHeure(d.echeance)}` : "Sans échéance"}
        </span>
      </div>

      <div className="esp-carte-corps" style={{ display: "grid", gap: 14 }}>
        <h2 className="esp-carte-titre" style={{ fontSize: 19, lineHeight: 1.3 }}>{d.resume}</h2>

        <dl className="esp-def esp-def--trois">
          <Def etiquette="Montant" fort>{d.montant !== null ? montant(d.montant, d.devise) : "—"}</Def>
          <Def etiquette="Entité">{p.nommerEntite(d.entite_id)}</Def>
          <Def etiquette="Demandé par">{p.nommer(d.demandeur_id)} · {dateCourte(d.cree_le)}</Def>
          {d.objet_type ? <Def etiquette="Objet">{phrase(d.objet_type)} {d.objet_id ? <span className="esp-mono">{d.objet_id}</span> : null}</Def> : null}
          <Def etiquette="Règle">
            {d.approbations_requises} approbation{d.approbations_requises > 1 ? "s" : ""} · rôles : {d.roles_autorises.join(", ")}
          </Def>
          <Def etiquette="Politique">{d.politique_id ? "Approuvée d'office par un accord permanent" : "Décidée par des personnes"}</Def>
        </dl>

        {payloadVisible.length ? (
          <div>
            <div className="esp-section-titre">Ce que porte la demande</div>
            <dl className="esp-def">
              {payloadVisible.map(([k, val]) => (
                <Def key={k} etiquette={LIBELLES_PAYLOAD[k] ?? phrase(k)}>{typeof val === "object" && val !== null ? JSON.stringify(val) : String(val)}</Def>
              ))}
            </dl>
          </div>
        ) : null}

        <div>
          <div className="esp-section-titre">
            Approbations — {compte.faites} sur {compte.requises}
            {compte.refus ? ` · ${compte.refus} refus` : ""}
          </div>
          <div className="esp-jauge" aria-hidden="true">
            {Array.from({ length: compte.requises }).map((_, i) => (
              <span key={i} data-fait={compte.refus && i === compte.faites ? "refus" : i < compte.faites ? "true" : "false"} />
            ))}
          </div>
          {compte.liste.length ? (
            <ul className="esp-fil" style={{ marginTop: 10 }}>
              {compte.liste.map((a) => (
                <li key={a.id}>
                  <span className="esp-fil-point" data-teinte={a.decision === "approuve" ? "vert" : "rouge"} />
                  <div>
                    <div className="esp-fil-texte">
                      <strong>{p.nommer(a.user_id)}</strong> {a.decision === "approuve" ? "a approuvé" : "a refusé"}
                      {a.au_nom_de ? <> au nom de <strong>{p.nommer(a.au_nom_de)}</strong></> : null}
                      {a.commentaire ? <> — {a.commentaire}</> : null}
                    </div>
                    <div className="esp-fil-meta">{dateHeure(a.decide_le)}</div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="esp-kpi-sous" style={{ marginTop: 8 }}>Aucune décision prise pour l&apos;instant.</p>
          )}
        </div>

        {(ex.commentaire || ex.piece_jointe || ex.motif_refus) && d.statut === "en_attente" ? (
          <Avis teinte="bleu">
            <strong>La règle exige :</strong>{" "}
            {[ex.commentaire && "un commentaire pour approuver", ex.piece_jointe && "une pièce jointe", ex.motif_refus && "un motif en cas de refus"].filter(Boolean).join(", ")}.
          </Avis>
        ) : null}

        {!v.peut && v.separation ? (
          <Avis teinte="ambre" role="status">
            <strong>Séparation saisie / approbation.</strong> {v.raison}
          </Avis>
        ) : !v.peut && d.statut === "en_attente" ? (
          <Avis teinte="gris">{v.raison}</Avis>
        ) : v.peut && v.au_nom_de ? (
          <Avis teinte="bleu">
            Vous décidez <strong>au nom de {p.nommer(v.au_nom_de.delegant)}</strong> (délégation jusqu&apos;au {v.au_nom_de.fin ? dateCourte(v.au_nom_de.fin) : "nouvel ordre"}).
          </Avis>
        ) : null}

        {fait ? <Avis teinte="vert" role="status"><strong>C&apos;est fait.</strong> {fait}</Avis> : null}
        {erreur && !form ? <Avis teinte="rouge" role="alert"><strong>Refusé par la base.</strong> {erreur}</Avis> : null}

        {d.statut === "en_attente" ? (
          <div className="esp-actions">
            <button type="button" className="r-btn r-btn--vert" disabled={!v.peut} onClick={() => ouvrir("approuver")}>
              <Check width={16} height={16} aria-hidden="true" /> Approuver
            </button>
            <button type="button" className="r-btn r-btn--rouge" disabled={!v.peut} onClick={() => ouvrir("refuser")}>
              <X width={16} height={16} aria-hidden="true" /> Refuser
            </button>
            <button type="button" className="r-btn r-btn--fil" onClick={() => ouvrir("modifier")}>
              <Pencil width={15} height={15} aria-hidden="true" /> Modifier
            </button>
            <button type="button" className="r-btn r-btn--fil" onClick={() => ouvrir("deleguer")}>
              <Users width={16} height={16} aria-hidden="true" /> Déléguer
            </button>
          </div>
        ) : null}
      </div>

      {/* ——— Approuver ——— */}
      <Dialog open={form === "approuver"} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><Check width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>Approuver</DialogTitle>
            <DialogDescription>{d.resume}{d.montant !== null ? ` — ${montant(d.montant, d.devise)}` : ""}</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              {delegs.length ? (
                <label className="rv-libelle">
                  Décider
                  <select className="rv-champ" value={auNomDe} onChange={(e) => setAuNomDe(e.target.value)}>
                    {moi.role && d.roles_autorises.includes(moi.role) ? <option value="">En mon nom</option> : null}
                    {delegs.map((g) => (
                      <option key={g.id} value={g.id}>Au nom de {p.nommer(g.delegant)}</option>
                    ))}
                  </select>
                </label>
              ) : null}
              <label className="rv-libelle">
                Commentaire {ex.commentaire ? <span className="esp-obligatoire">(obligatoire)</span> : <small>(facultatif)</small>}
                <textarea className="rv-champ" value={commentaire} onChange={(e) => setCommentaire(e.target.value)} maxLength={2000} placeholder="Ce que vous avez vérifié, ce qui justifie l'accord." />
              </label>
              <ChampFichier obligatoire={ex.piece_jointe} fichier={fichier} onChange={setFichier} />
              {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--vert" disabled={!pretApprouver || envoi} onClick={() => soumettreDecision("approuve")}>
              {envoi ? <Loader variant="spin" /> : null} Confirmer l&apos;approbation
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ——— Refuser ——— */}
      <Dialog open={form === "refuser"} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><X width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>Refuser</DialogTitle>
            <DialogDescription>Un refus clôt la demande ; le demandeur en reçoit le motif.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              {delegs.length ? (
                <label className="rv-libelle">
                  Décider
                  <select className="rv-champ" value={auNomDe} onChange={(e) => setAuNomDe(e.target.value)}>
                    {moi.role && d.roles_autorises.includes(moi.role) ? <option value="">En mon nom</option> : null}
                    {delegs.map((g) => (
                      <option key={g.id} value={g.id}>Au nom de {p.nommer(g.delegant)}</option>
                    ))}
                  </select>
                </label>
              ) : null}
              <label className="rv-libelle">
                Motif du refus {ex.motif_refus ? <span className="esp-obligatoire">(obligatoire)</span> : null}
                <select className="rv-champ" value={motif} onChange={(e) => setMotif(e.target.value)}>
                  <option value="">Choisir un motif…</option>
                  {MOTIFS_REFUS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </label>
              <label className="rv-libelle">
                Précision {motif === MOTIFS_REFUS[MOTIFS_REFUS.length - 1] || !motif ? <span className="esp-obligatoire">(obligatoire)</span> : <small>(facultatif)</small>}
                <textarea className="rv-champ" value={motifLibre} onChange={(e) => setMotifLibre(e.target.value)} maxLength={1500} placeholder="En une ou deux phrases, ce qui manque ou ce qui ne va pas." />
              </label>
              <ChampFichier obligatoire={ex.piece_jointe} fichier={fichier} onChange={setFichier} />
              {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--rouge" disabled={!pretRefuser || envoi} onClick={() => soumettreDecision("rejete")}>
              {envoi ? <Loader variant="spin" /> : null} Confirmer le refus
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ——— Modifier ——— */}
      <Dialog open={form === "modifier"} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><Pencil width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>Modifier la demande</DialogTitle>
            <DialogDescription>
              Une demande est figée après sa création : modifier crée une NOUVELLE demande qui remplace celle-ci, et repart au début de la validation.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              <label className="rv-libelle">
                Résumé
                <textarea className="rv-champ" value={resume} onChange={(e) => setResume(e.target.value)} maxLength={500} />
              </label>
              <label className="rv-libelle">
                Montant ({d.devise})
                <input className="rv-champ" inputMode="decimal" value={montantMod} onChange={(e) => setMontantMod(e.target.value)} placeholder="Laisser vide s'il n'y a pas de montant" />
              </label>
              <Avis teinte="ambre">La nouvelle demande sera saisie en votre nom : la séparation saisie / approbation vous empêchera de la décider.</Avis>
              {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={!pretModifier || envoi} onClick={soumettreModification}>
              {envoi ? <Loader variant="spin" /> : null} Créer la demande modifiée
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ——— Déléguer ——— */}
      <Dialog open={form === "deleguer"} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><Users width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>Déléguer ma décision</DialogTitle>
            <DialogDescription>La personne désignée décidera en votre nom, sur ce module ou sur tous, jusqu&apos;à la date choisie. Vous pouvez révoquer à tout moment.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              <label className="rv-libelle">
                À qui
                <select className="rv-champ" value={delegataire} onChange={(e) => setDelegataire(e.target.value)}>
                  <option value="">Choisir une personne…</option>
                  {p.personnes.map((x) => (
                    <option key={x.id} value={x.id}>{x.libelle}</option>
                  ))}
                </select>
              </label>
              <div className="esp-form-ligne">
                <label className="rv-libelle">
                  Portée
                  <select className="rv-champ" value={delegModule} onChange={(e) => setDelegModule(e.target.value)}>
                    <option value={d.module}>{libelleModule(d.module)} seulement</option>
                    <option value="*">Tous les modules</option>
                  </select>
                </label>
                <label className="rv-libelle">
                  Jusqu&apos;au <small>(facultatif)</small>
                  <input className="rv-champ" type="date" value={delegFin} onChange={(e) => setDelegFin(e.target.value)} min={new Date().toISOString().slice(0, 10)} />
                </label>
              </div>
              <label className="rv-libelle">
                Motif <small>(facultatif)</small>
                <input className="rv-champ" value={delegMotif} onChange={(e) => setDelegMotif(e.target.value)} maxLength={500} placeholder="Congés, déplacement…" />
              </label>
              {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={!pretDeleguer || envoi} onClick={soumettreDelegation}>
              {envoi ? <Loader variant="spin" /> : null} Poser la délégation
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* Le champ de pièce jointe : le contrôle natif est caché (son libellé est
   celui du navigateur, souvent en anglais) ; un bouton de la charte le
   déclenche et le nom du fichier choisi s'affiche à côté. */
function ChampFichier({ obligatoire, fichier, onChange }: { obligatoire: boolean; fichier: File | null; onChange: (f: File | null) => void }) {
  const id = useId();
  return (
    <div>
      <span className="rv-libelle">
        Pièce jointe {obligatoire ? <span className="esp-obligatoire">(obligatoire)</span> : <small>(facultatif)</small>}
      </span>
      <div className="esp-fichier">
        <input id={id} type="file" className="esp-fichier-natif" accept=".pdf,.png,.jpg,.jpeg,.xml,.csv,.xlsx" onChange={(e) => onChange(e.target.files?.[0] ?? null)} />
        <label htmlFor={id} className="r-btn r-btn--fil r-btn--petit" style={{ cursor: "pointer" }}>
          <FileText width={14} height={14} aria-hidden="true" /> {fichier ? "Changer de fichier" : "Choisir un fichier"}
        </label>
        {fichier ? (
          <span className="esp-kpi-sous">{fichier.name} · {Math.round(fichier.size / 1024)} Ko</span>
        ) : (
          <span className="esp-kpi-sous">PDF, image, XML, CSV ou tableur.</span>
        )}
      </div>
    </div>
  );
}
