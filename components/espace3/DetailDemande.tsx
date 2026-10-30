"use client";

/* ══════════════════════════════════════════════════════════════════════
   La carte de décision d'une demande de validation (Espace 2, 23/10/2026)

   Une carte au milieu de l'écran, en deux colonnes : à gauche le document
   qu'on valide (les pages de la facture, lues depuis le seau ; dans
   l'exemple, une feuille dessinée avec les valeurs de la pièce), à droite
   la décision (le montant, l'échéance, ce que porte la demande, qui a
   déjà décidé, ce que la règle exige, les actions). Les formulaires
   d'approbation, de refus, de modification et de délégation remplacent la
   colonne de droite le temps de la saisie : pas de fenêtre dans la
   fenêtre. Les flèches de l'en-tête passent à la demande précédente ou
   suivante de la file sans fermer la carte.

   La logique est celle de components/espace/validations/DetailDemande.tsx,
   à l'identique : mêmes règles (regles.ts), mêmes portes (portes.ts).
   ══════════════════════════════════════════════════════════════════════ */

import { useEffect, useId, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Ban, Check, ChevronLeft, ChevronRight, CircleCheck, CircleDashed, CircleX, Clock, FileSearch, FileText, OctagonAlert, Pencil, TriangleAlert, Users, X, type LucideIcon } from "lucide-react";
import { Loader } from "@/components/ui/loader";
import { createClient } from "@/lib/supabase/client";
import type { Source } from "@/components/espace3/base/source";
import { dateCourte, dateHeure, libelleModule, montant, phrase, relatif } from "@/components/espace3/base/format";
import type { Approbation, Delegation, Demande, Entite, EquipesContexte, StatutFacture } from "@/components/espace3/base/types";
import { MOTIFS_REFUS, STATUTS, compteApprobations, delegationsUtilisables, exigences, groupeDe, verdict, type Decideur } from "@/components/espace3/base/validations/regles";
import { annuler, decider, deleguer, joindrePiece, modifier } from "@/components/espace3/base/validations/portes";
import { DOSSIERS_EXEMPLE } from "@/components/espace3/base/exemples/filed";
import { statutFacture } from "@/components/espace3/base/filed/etats";
import { lienDossierFiled } from "@/components/espace3/base/filed/lien";
import { lienPiece } from "@/components/espace3/base/filed/receptions";
import PagePdf, { nombreDePages } from "@/components/espace3/base/filed/PagePdf";
import { aiguiller, moduleDeObjet } from "./aiguillage";
import { Note } from "./ui";
import { Initiales } from "./vivant";
import "./detail-demande.css";

type Props = {
  demande: Demande;
  approbations: Approbation[];
  delegations: Delegation[];
  equipes: EquipesContexte;
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
  onAnnulationLocale: (id: string) => void;
  onDelegationLocale: (g: Delegation) => void;
  recharger: () => Promise<void>;
  /* en base réelle, la file se relit après une décision et la demande
     décidée quitte la vue : le message de succès remonte à la file */
  onFait?: (message: string) => void;
  /* la carte : fermer, et passer d'une demande à l'autre dans la file */
  fermer?: () => void;
  naviguer?: { precedente: (() => void) | null; suivante: (() => void) | null; position: number; total: number };
};

type Formulaire = "approuver" | "refuser" | "modifier" | "deleguer" | "annuler" | null;

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

/* les clés qui se lisent en chiffres : police à chasse fixe, groupes de quatre pour un IBAN */
const CLES_MONO = new Set(["iban", "ancien_iban", "nouvel_iban", "reference", "mandat"]);

/* ce que désigne la demande, et les rôles, en français plutôt qu'en code */
const NATURE_OBJET: Record<string, string> = { filed_facture: "Facture fournisseur" };
const LIBELLES_ROLE: Record<string, string> = { gerant: "gérant", admin: "administrateur", valideur: "valideur", comptable: "comptable", collaborateur: "collaborateur", lecteur: "lecteur" };
const libelleRole = (r: string) => LIBELLES_ROLE[r] ?? phrase(r).toLowerCase();

/* Une valeur de payload, lisible : une liste longue se résume à son compte
   et à ses trois premiers éléments ; un objet se montre clé par clé ; une
   date ISO devient une date courte ; le reste tel quel. */
function valeurLisible(cle: string, val: unknown): string {
  if (val === null || val === undefined) return "—";
  if (Array.isArray(val)) {
    const n = val.length;
    if (n === 0) return "aucun";
    const extrait = val.slice(0, 3).map((x) => (typeof x === "object" && x !== null ? JSON.stringify(x) : String(x))).join(", ");
    return n > 3 ? `${n} éléments — ${extrait}…` : extrait;
  }
  if (typeof val === "object") {
    return Object.entries(val as Record<string, unknown>)
      .map(([k, v]) => `${phrase(k)} : ${typeof v === "object" && v !== null ? JSON.stringify(v) : String(v)}`)
      .join(" · ");
  }
  const texte = String(val);
  if (/^\d{4}-\d{2}-\d{2}/.test(texte)) return dateCourte(texte);
  if (cle === "iban" || cle === "ancien_iban" || cle === "nouvel_iban") return texte.replace(/\s+/g, "").replace(/(.{4})/g, "$1 ").trim();
  return texte;
}

/* Les états se lisent en texte et en icône monochrome, comme le circuit
   d'approbation de la page : aucune pastille de couleur. */
const ICONES_STATUT: Record<Demande["statut"], LucideIcon> = {
  en_attente: CircleDashed,
  approuvee: CircleCheck,
  executee: CircleCheck,
  rejetee: CircleX,
  annulee: Ban,
  expiree: Clock,
  echec_execution: TriangleAlert,
};
const ICONES_TEINTE: Record<string, LucideIcon> = { rouge: OctagonAlert, ambre: TriangleAlert, vert: CircleCheck, bleu: CircleDashed, gris: CircleDashed };
const RANGS = ["Première", "Seconde", "Troisième", "Quatrième", "Cinquième"];

function IconeStatut({ statut }: { statut: Demande["statut"] }) {
  const Icone = ICONES_STATUT[statut] ?? CircleDashed;
  return <Icone width={14} height={14} aria-hidden="true" />;
}

function IconeTeinte({ teinte }: { teinte: string }) {
  const Icone = ICONES_TEINTE[teinte] ?? CircleDashed;
  return <Icone width={14} height={14} aria-hidden="true" />;
}

function uuidLocal(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/* ——— le dossier FILED : ce qu'on valide, lu sous RLS en vrai, dans les exemples sinon ——— */
type ResumeDossier = {
  reference: string | null;
  numero: string | null;
  fournisseur: string | null;
  ttc: number | null;
  devise: string;
  statut: StatutFacture;
  bloquants: number;
  attention: number;
  levees: number;
  /* le fichier de la pièce : chemin dans le seau omega-clients et type */
  piece: { chemin: string; mime: string } | null;
};

async function lireDossierReel(factureId: string): Promise<ResumeDossier | null> {
  const supabase = createClient();
  const { data: f } = await supabase
    .from("filed_factures")
    .select("id, numero, statut, montant_ttc, devise, nb_bloquants, nb_attention, fournisseur_id, document_id")
    .eq("id", factureId)
    .maybeSingle();
  if (!f) return null;
  const [doc, four, lev] = await Promise.all([
    supabase.from("filed_documents").select("reference, piece_id").eq("id", f.document_id).maybeSingle(),
    f.fournisseur_id ? supabase.from("filed_fournisseurs").select("nom").eq("id", f.fournisseur_id).maybeSingle() : null,
    supabase.from("filed_levees").select("id", { count: "exact", head: true }).eq("facture_id", f.id),
  ]);
  const document = doc.data as { reference?: string; piece_id?: string | null } | null;
  const piece = document?.piece_id ? await supabase.from("pieces").select("chemin, mime").eq("id", document.piece_id).maybeSingle() : null;
  const fichier = piece?.data as { chemin?: string; mime?: string } | null | undefined;
  return {
    reference: document?.reference ?? null,
    numero: f.numero,
    fournisseur: (four?.data as { nom?: string } | null)?.nom ?? null,
    ttc: f.montant_ttc,
    devise: f.devise ?? "EUR",
    statut: f.statut,
    bloquants: f.nb_bloquants ?? 0,
    attention: f.nb_attention ?? 0,
    levees: lev.count ?? 0,
    piece: fichier?.chemin ? { chemin: fichier.chemin, mime: fichier.mime ?? "application/pdf" } : null,
  };
}

function lireDossierExemple(objetId: string): ResumeDossier | null {
  const d = DOSSIERS_EXEMPLE.find((x) => x.facture && (x.facture.id === objetId || x.document.reference === objetId));
  if (!d?.facture) return null;
  return {
    reference: d.document.reference,
    numero: d.facture.numero,
    fournisseur: d.fournisseur?.nom ?? null,
    ttc: d.facture.montant_ttc,
    devise: d.facture.devise,
    statut: d.facture.statut,
    bloquants: d.facture.nb_bloquants,
    attention: d.facture.nb_attention,
    levees: d.levees.length,
    piece: d.piece ? { chemin: d.piece.chemin, mime: d.piece.mime } : null,
  };
}

/* La page de l'exemple : aucun fichier n'existe pour les dossiers d'exemple,
   on dessine une feuille avec les vraies valeurs de la pièce. */
function FeuilleExemple({ fournisseur, numero, ttc }: { fournisseur: string | null; numero: string | null; ttc: string | null }) {
  return (
    <div className="v2-det-page v2-det-feuille" aria-hidden="true">
      <div className="v2-det-feuille-tete">
        <div className="v2-det-feuille-titre">FACTURE</div>
        <div className="v2-det-feuille-sous">{numero ? `N° ${numero}` : ""}</div>
      </div>
      <div className="v2-det-feuille-fournisseur">
        <div className="v2-det-feuille-nom">{fournisseur ?? "—"}</div>
        <div className="v2-det-feuille-trait" data-court="" />
        <div className="v2-det-feuille-trait" data-court="" />
      </div>
      <div className="v2-det-feuille-lignes">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="v2-det-feuille-ligne">
            <div className="v2-det-feuille-trait" data-court={i % 2 ? "" : undefined} />
            <div className="v2-det-feuille-trait" />
          </div>
        ))}
      </div>
      <div className="v2-det-feuille-total">
        <span>Total TTC</span>
        <span>{ttc ?? ""}</span>
      </div>
    </div>
  );
}

/* La colonne de gauche : les pages du document, puis le résumé du dossier. */
function Document({ demande: d, source }: { demande: Demande; source: Source }) {
  const lien = lienDossierFiled(d.objet_type, d.objet_id, d.payload);
  const facture = d.objet_type === "filed_facture" && d.objet_id ? d.objet_id : null;
  const [reel, setReel] = useState<{ pour: string; resume: ResumeDossier | null } | null>(null);

  useEffect(() => {
    if (source !== "reelle" || !facture) return;
    let actif = true;
    lireDossierReel(facture)
      .then((r) => actif && setReel({ pour: facture, resume: r }))
      .catch(() => actif && setReel({ pour: facture, resume: null }));
    return () => {
      actif = false;
    };
  }, [source, facture]);

  const r = !facture ? null : source === "exemple" ? lireDossierExemple(facture) : reel?.pour === facture ? reel.resume : null;
  const chemin = source === "reelle" ? (r?.piece?.chemin ?? null) : null;
  const mime = r?.piece?.mime ?? "";

  /* en vrai, le fichier se lit par une URL signée (dix minutes), et on compte ses pages */
  const [fichier, setFichier] = useState<{ pour: string; url: string | null; pages: number } | null>(null);
  useEffect(() => {
    if (!chemin) return;
    let actif = true;
    (async () => {
      try {
        const url = await lienPiece(chemin);
        const pages = mime === "application/pdf" ? await nombreDePages(url) : 1;
        if (actif) setFichier({ pour: chemin, url, pages: Math.min(pages, 20) });
      } catch {
        if (actif) setFichier({ pour: chemin, url: null, pages: 0 });
      }
    })();
    return () => {
      actif = false;
    };
  }, [chemin, mime]);

  const url = chemin && fichier?.pour === chemin ? fichier.url : null;
  const s = r ? statutFacture(r.statut) : null;
  const ttcTexte = r && r.ttc !== null ? montant(r.ttc, r.devise) : null;

  return (
    <aside className="v2-det-document" aria-label="Le document">
      <div className="v2-det-document-pages">
        <div className="v2-det-liasse">
          {url && mime === "application/pdf" && fichier ? (
            Array.from({ length: fichier.pages }).map((_, i) => (
              <div key={i} className="v2-det-page">
                <PagePdf url={url} page={i + 1} />
              </div>
            ))
          ) : url && mime.startsWith("image/") ? (
            <div className="v2-det-page">
              {/* eslint-disable-next-line @next/next/no-img-element -- fichier signé du seau, pas une image du site */}
              <img src={url} alt="" />
            </div>
          ) : r ? (
            <FeuilleExemple fournisseur={r.fournisseur} numero={r.numero} ttc={ttcTexte} />
          ) : chemin ? (
            <div className="v2-det-document-vide">Lecture du document…</div>
          ) : (
            <div className="v2-det-document-vide">
              <FileText width={22} height={22} aria-hidden="true" />
              {lien ? "Le document se lit dans le dossier." : "Cette demande ne porte pas de document."}
            </div>
          )}
        </div>
      </div>
      {r && s ? (
        <footer className="v2-det-document-pied">
          <div className="v2-det-document-ligne">
            {r.reference ? <span className="v2-det-mono">{r.reference}</span> : null}
            <span className="v2-det-controles">
              <IconeTeinte teinte={s.teinte} />
              {[
                s.libelle,
                r.bloquants ? `${r.bloquants} contrôle${r.bloquants > 1 ? "s" : ""} bloquant${r.bloquants > 1 ? "s" : ""}` : null,
                r.attention ? `${r.attention} à vérifier` : null,
                r.levees ? `${r.levees} levé${r.levees > 1 ? "s" : ""}` : null,
                !r.bloquants && !r.attention ? "contrôles passés" : null,
              ].filter(Boolean).join(" · ")}
            </span>
          </div>
          <div className="v2-det-document-ligne">
            <span className="v2-det-sous">
              {r.numero ? `Facture ${r.numero}` : "Facture"}
              {r.fournisseur ? ` · ${r.fournisseur}` : ""}
              {ttcTexte ? ` · ${ttcTexte} TTC` : ""}
            </span>
            {lien ? (
              <Link href={lien} className="v2-btn v2-btn--petit v2-btn--fantome v2-det-document-ouvrir">
                <FileSearch width={14} height={14} aria-hidden="true" /> Ouvrir le dossier
              </Link>
            ) : null}
          </div>
        </footer>
      ) : lien && !facture ? (
        <footer className="v2-det-document-pied">
          <div className="v2-det-document-ligne">
            <span className="v2-det-sous">{d.objet_id}</span>
            <Link href={lien} className="v2-btn v2-btn--petit v2-btn--fantome v2-det-document-ouvrir">
              <FileSearch width={14} height={14} aria-hidden="true" /> Ouvrir le dossier
            </Link>
          </div>
        </footer>
      ) : null}
    </aside>
  );
}

export default function DetailDemande(p: Props) {
  const { demande: d, approbations, delegations, equipes, moi, source } = p;
  const [form, setForm] = useState<Formulaire>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [fait, setFait] = useState<string | null>(null);

  const ex = useMemo(() => exigences(d), [d]);
  const v = useMemo(() => verdict(d, moi, approbations, delegations, new Date(), equipes), [d, moi, approbations, delegations, equipes]);
  const compte = useMemo(() => compteApprobations(d, approbations), [d, approbations]);
  const restantes = d.statut === "en_attente" ? Math.max(0, compte.requises - compte.faites) : 0;
  const delegs = useMemo(() => delegationsUtilisables(d, moi, delegations), [d, moi, delegations]);
  const grp = groupeDe(d);
  /* l'objet d'une demande hors FILED (qui a son « Ouvrir le dossier ») mène à sa page (aiguillage.ts) */
  const pageObjet = d.objet_type && d.objet_id && !d.objet_type.startsWith("filed_") ? aiguiller({ module: d.module, objet_type: d.objet_type, objet_id: d.objet_id, payload: d.payload }) : null;

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

  /* une autre demande dans la carte : la file remonte le composant avec
     key={demande.id}, l'état des formulaires repart donc de zéro */

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
    setDelegFin(new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10));
    setDelegMotif("");
    setForm(f);
  };

  const motifComplet = motif === MOTIFS_REFUS[MOTIFS_REFUS.length - 1] || !motif ? motifLibre.trim() : `${motif}${motifLibre.trim() ? ` — ${motifLibre.trim()}` : ""}`;

  const pretApprouver = (!ex.commentaire || commentaire.trim().length >= 3) && (!ex.piece_jointe || !!fichier);
  const pretRefuser = (!ex.motif_refus || motifComplet.length >= 3) && (!ex.piece_jointe || !!fichier);
  const montantNum = montantMod.trim() === "" ? null : Number(montantMod.replace(/\s/g, "").replace(",", "."));
  const pretModifier =
    resume.trim().length >= 1 && resume.trim().length <= 500 && (montantNum === null || (Number.isFinite(montantNum) && montantNum >= 0)) && (resume.trim() !== d.resume || montantNum !== d.montant);
  const pretDeleguer = !!delegataire && delegataire !== moi.id && !!delegFin;

  const delegChoisie = delegs.find((g) => g.id === auNomDe) ?? null;

  async function envoyer(action: () => Promise<void>, message: string) {
    setEnvoi(true);
    setErreur(null);
    try {
      await action();
      setFait(message);
      p.onFait?.(message);
      setForm(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base a refusé l'opération.");
    } finally {
      setEnvoi(false);
    }
  }

  const soumettreDecision = (decision: "approuve" | "rejete") =>
    envoyer(
      async () => {
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
      },
      decision === "approuve" ? "Votre approbation est enregistrée." : "Votre refus est enregistré, avec son motif.",
    );

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

  /* annuler SA demande en attente : la seule écriture directe sur
     demandes_validation que la policy ouvre, et seulement au demandeur */
  const estMaDemande = d.demandeur_type === "utilisateur" && d.demandeur_id === moi.id && d.statut === "en_attente";
  const soumettreAnnulation = () =>
    envoyer(async () => {
      if (source === "reelle") {
        await annuler(d);
        await p.recharger();
      } else {
        await new Promise((r) => setTimeout(r, 350));
        p.onAnnulationLocale(d.id);
      }
    }, "Votre demande est annulée ; elle quitte la file.");

  const soumettreDelegation = () =>
    envoyer(async () => {
      /* la base exige un terme (delegations.fin NOT NULL) : fin de journée du jour choisi */
      const fin = new Date(`${delegFin}T23:59:59`).toISOString();
      const mod = delegModule === "*" ? null : delegModule;
      if (source === "reelle") {
        await deleguer({ client_id: p.clientId, delegant: moi.id, delegataire, module: mod, entite_id: null, fin, motif: delegMotif.trim() || null });
        await p.recharger();
      } else {
        await new Promise((r) => setTimeout(r, 350));
        p.onDelegationLocale({ id: uuidLocal(), client_id: d.client_id, delegant: moi.id, delegataire, entite_id: null, module: mod, debut: new Date().toISOString(), fin, motif: delegMotif.trim() || null, revoquee_le: null });
      }
    }, "La délégation est posée : la personne désignée peut décider en votre nom.");

  /* les flèches du clavier passent d'une demande à l'autre, hors saisie */
  const nav = p.naviguer;
  useEffect(() => {
    if (!nav) return;
    const ecouter = (e: KeyboardEvent) => {
      const cible = e.target as HTMLElement | null;
      if (cible && /^(INPUT|TEXTAREA|SELECT)$/.test(cible.tagName)) return;
      if (e.key === "ArrowLeft" && nav.precedente) nav.precedente();
      if (e.key === "ArrowRight" && nav.suivante) nav.suivante();
    };
    window.addEventListener("keydown", ecouter);
    return () => window.removeEventListener("keydown", ecouter);
  }, [nav]);

  const payloadVisible = Object.entries(d.payload ?? {}).filter(([k]) => k !== "exigences" && k !== "remplace");
  const statut = STATUTS[d.statut];
  const enAttente = d.statut === "en_attente";
  const notesEtat = (
    <>
      {!v.peut && v.separation && enAttente ? (
        <Note teinte="ambre" role="status">
          <strong>Séparation saisie / approbation.</strong> {v.raison}
        </Note>
      ) : !v.peut && v.equipe && enAttente ? (
        <Note teinte="ambre" role="status">
          <strong>Réservée à l&apos;équipe « {v.equipe} ».</strong> {v.raison}
        </Note>
      ) : !v.peut && enAttente ? (
        <Note>{v.raison}</Note>
      ) : v.peut && v.au_nom_de && enAttente ? (
        <Note teinte="bleu">
          Vous décidez <strong>au nom de {p.nommer(v.au_nom_de.delegant)}</strong> (délégation jusqu&apos;au {v.au_nom_de.fin ? dateCourte(v.au_nom_de.fin) : "nouvel ordre"}).
        </Note>
      ) : null}
      {fait ? <Note teinte="vert" role="status"><strong>C&apos;est fait.</strong> {fait}</Note> : null}
      {erreur && !form ? <Note teinte="rouge" role="alert"><strong>Refusé par la base.</strong> {erreur}</Note> : null}
    </>
  );

  return (
    <div className="v2-det" data-form={form ?? undefined}>
      {/* ——— l'en-tête de la carte : où on est, où aller, fermer ——— */}
      <header className="v2-det-carte-tete">
        <div className="v2-det-ou">
          <span className="v2-det-sur">{libelleModule(d.module)} · {phrase(d.type_action)}</span>
          <span className="v2-det-statut">
            <IconeStatut statut={d.statut} />
            {statut.libelle}
          </span>
        </div>
        <div className="v2-det-carte-outils">
          {nav ? (
            <>
              <span className="v2-det-position" aria-live="polite">{nav.position} sur {nav.total}</span>
              <button type="button" className="v2-btn v2-btn--petit v2-btn--icone v2-btn--fantome" aria-label="Demande précédente" disabled={!nav.precedente} onClick={() => nav.precedente?.()}>
                <ChevronLeft width={16} height={16} aria-hidden="true" />
              </button>
              <button type="button" className="v2-btn v2-btn--petit v2-btn--icone v2-btn--fantome" aria-label="Demande suivante" disabled={!nav.suivante} onClick={() => nav.suivante?.()}>
                <ChevronRight width={16} height={16} aria-hidden="true" />
              </button>
            </>
          ) : null}
          {p.fermer ? (
            <button type="button" className="v2-btn v2-btn--petit v2-btn--icone v2-btn--fantome" aria-label="Fermer" onClick={p.fermer}>
              <X width={16} height={16} aria-hidden="true" />
            </button>
          ) : null}
        </div>
      </header>

      <div className="v2-det-carte-corps">
        <Document demande={d} source={source} />

        {/* ——— la colonne de droite : la décision, ou le formulaire en cours ——— */}
        <section className="v2-det-decision" aria-label="La décision">
          {form === null ? (
            <>
              <div className="v2-det-decision-corps">
                <h2 className="v2-det-titre">{d.resume}</h2>
                <div className="v2-det-chiffre">
                  {d.montant !== null ? <span className="v2-det-montant">{montant(d.montant, d.devise)}</span> : null}
                  <span className="v2-det-echeance" data-urgence={grp === "retard" ? "retard" : grp === "aujourdhui" ? "aujourdhui" : undefined}>
                    <Clock width={14} height={14} aria-hidden="true" />
                    {d.echeance ? `Échéance ${relatif(d.echeance)} · ${dateHeure(d.echeance)}` : "Sans échéance"}
                  </span>
                </div>

                <dl className="v2-det-fiche">
                  <dt>Entité</dt>
                  <dd>{p.nommerEntite(d.entite_id)}</dd>
                  <dt>Demandé par</dt>
                  <dd>
                    {p.nommer(d.demandeur_id)} <span className="v2-det-sous">· {dateCourte(d.cree_le)}</span>
                  </dd>
                  {d.objet_type ? (
                    <>
                      <dt>Objet</dt>
                      <dd>
                        {NATURE_OBJET[d.objet_type] ?? phrase(d.objet_type)} {d.objet_id ? <span className="v2-det-mono">{d.objet_id}</span> : null}
                        {pageObjet ? (
                          <>
                            {" "}
                            <Link href={pageObjet} className="v2-det-objet-lien">
                              Ouvrir dans {libelleModule(moduleDeObjet(d.objet_type) ?? d.module)}
                            </Link>
                          </>
                        ) : null}
                      </dd>
                    </>
                  ) : null}
                  <dt>Règle</dt>
                  <dd>
                    {d.approbations_requises} approbation{d.approbations_requises > 1 ? "s" : ""} <span className="v2-det-sous">· {d.roles_autorises.map(libelleRole).join(", ")}</span>
                    {d.equipe_id ? <span className="v2-det-sous"> · équipe {equipes.noms[d.equipe_id] ?? "réservée"}</span> : null}
                  </dd>
                  <dt>Politique</dt>
                  <dd>{d.politique_id ? "Approuvée d'office par un accord permanent" : "Décidée par des personnes"}</dd>
                </dl>

                {payloadVisible.length ? (
                  <div className="v2-det-bloc">
                    <h3 className="v2-det-section-titre">Ce que porte la demande</h3>
                    <dl className="v2-det-fiche">
                      {payloadVisible.map(([k, val]) => (
                        <div key={k} style={{ display: "contents" }}>
                          <dt>{LIBELLES_PAYLOAD[k] ?? phrase(k)}</dt>
                          <dd className={CLES_MONO.has(k) ? "v2-det-mono" : undefined}>{valeurLisible(k, val)}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                ) : null}

                <div className="v2-det-bloc">
                  <h3 className="v2-det-section-titre">
                    Approbations
                    <small>
                      {compte.faites} sur {compte.requises}
                      {compte.refus ? ` · ${compte.refus} refus` : ""}
                    </small>
                  </h3>
                  <div className="v2-det-jauge" role="progressbar" aria-label="Approbations obtenues" aria-valuemin={0} aria-valuemax={compte.requises} aria-valuenow={compte.faites}>
                    <span style={{ width: `${Math.min(100, (compte.faites / Math.max(1, compte.requises)) * 100)}%` }} />
                  </div>
                  {compte.liste.length || restantes ? (
                    <ol className="v2-det-fil">
                      {compte.liste.map((a) => (
                        <li key={a.id}>
                          <span className="v2-det-fil-avatar" aria-hidden="true">
                            <Initiales nom={p.nommer(a.user_id)} taille={22} />
                            <i>{a.decision === "rejete" ? <CircleX width={11} height={11} /> : <CircleCheck width={11} height={11} />}</i>
                          </span>
                          <div>
                            <div className="v2-det-fil-texte">
                              <strong>{p.nommer(a.user_id)}</strong>
                              <span>
                                {a.decision === "approuve" ? "a approuvé" : "a refusé"}
                                {a.au_nom_de ? ` au nom de ${p.nommer(a.au_nom_de)}` : ""} · <time dateTime={a.decide_le}>{dateHeure(a.decide_le)}</time>
                              </span>
                            </div>
                            {a.commentaire ? <p className="v2-det-fil-commentaire">{a.commentaire}</p> : null}
                          </div>
                        </li>
                      ))}
                      {Array.from({ length: restantes }, (_, i) => (
                        <li key={`attente-${i}`} data-attente="">
                          <span className="v2-det-fil-avatar" aria-hidden="true">
                            <CircleDashed width={18} height={18} />
                          </span>
                          <div className="v2-det-fil-texte">
                            <strong>{RANGS[compte.faites + i] ?? `${compte.faites + i + 1}e`} approbation</strong>
                            <span>En attente</span>
                          </div>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="v2-det-vide">Aucune décision prise pour l&apos;instant.</p>
                  )}
                </div>
              </div>
              <div className="v2-det-fondu" aria-hidden="true" />

              {/* ——— ce qui conditionne l'action, contre les boutons : jamais dessous ——— */}
              <div className="v2-det-notes">
                {(ex.commentaire || ex.piece_jointe || ex.motif_refus) && enAttente ? (
                  <Note teinte="bleu">
                    <strong>La règle exige</strong>{" "}
                    {[ex.commentaire && "un commentaire pour approuver", ex.piece_jointe && "une pièce jointe", ex.motif_refus && "un motif en cas de refus"].filter(Boolean).join(", ")}.
                  </Note>
                ) : null}
                {notesEtat}
              </div>

              {enAttente ? (
                <div className="v2-det-actions">
                  <button type="button" className="v2-btn v2-btn--primaire" disabled={!v.peut} onClick={() => ouvrir("approuver")}>
                    <Check width={16} height={16} aria-hidden="true" /> Approuver
                  </button>
                  <button type="button" className="v2-btn v2-det-btn-danger" disabled={!v.peut} onClick={() => ouvrir("refuser")}>
                    <X width={16} height={16} aria-hidden="true" /> Refuser
                  </button>
                  <button type="button" className="v2-btn v2-btn--fantome" onClick={() => ouvrir("modifier")}>
                    <Pencil width={15} height={15} aria-hidden="true" /> Modifier
                  </button>
                  <button type="button" className="v2-btn v2-btn--fantome" onClick={() => ouvrir("deleguer")}>
                    <Users width={16} height={16} aria-hidden="true" /> Déléguer
                  </button>
                  {estMaDemande ? (
                    <button type="button" className="v2-btn v2-btn--fantome" onClick={() => ouvrir("annuler")}>
                      <Ban width={15} height={15} aria-hidden="true" /> Annuler ma demande
                    </button>
                  ) : null}
                </div>
              ) : null}
            </>
          ) : (
            <Formulaire
              quel={form}
              titre={{ approuver: "Approuver", refuser: "Refuser", modifier: "Modifier la demande", deleguer: "Déléguer ma décision", annuler: "Annuler ma demande" }[form]}
              retour={() => {
                setForm(null);
                setErreur(null);
              }}
              envoi={envoi}
              erreur={erreur}
              pied={
                form === "approuver" ? (
                  <button type="button" className="v2-btn v2-btn--primaire" disabled={!pretApprouver || envoi} onClick={() => soumettreDecision("approuve")}>
                    {envoi ? <Loader variant="spin" /> : <Check width={16} height={16} aria-hidden="true" />} Confirmer l&apos;approbation
                  </button>
                ) : form === "refuser" ? (
                  <button type="button" className="v2-btn v2-det-btn-danger v2-det-btn-danger--plein" disabled={!pretRefuser || envoi} onClick={() => soumettreDecision("rejete")}>
                    {envoi ? <Loader variant="spin" /> : <X width={16} height={16} aria-hidden="true" />} Confirmer le refus
                  </button>
                ) : form === "modifier" ? (
                  <button type="button" className="v2-btn v2-btn--primaire" disabled={!pretModifier || envoi} onClick={soumettreModification}>
                    {envoi ? <Loader variant="spin" /> : null} Créer la demande modifiée
                  </button>
                ) : form === "deleguer" ? (
                  <button type="button" className="v2-btn v2-btn--primaire" disabled={!pretDeleguer || envoi} onClick={soumettreDelegation}>
                    {envoi ? <Loader variant="spin" /> : null} Poser la délégation
                  </button>
                ) : (
                  <button type="button" className="v2-btn v2-det-btn-danger v2-det-btn-danger--plein" disabled={envoi} onClick={soumettreAnnulation}>
                    {envoi ? <Loader variant="spin" /> : null} Annuler la demande
                  </button>
                )
              }
            >
              {form === "approuver" ? (
                <>
                  <p className="v2-det-form-sous">{resumeAvecMontant(d.resume, d.montant !== null ? montant(d.montant, d.devise) : null)}</p>
                  {delegs.length ? (
                    <label className="v2-libelle">
                      Décider
                      <select className="v2-det-champ" value={auNomDe} onChange={(e) => setAuNomDe(e.target.value)}>
                        {moi.role && d.roles_autorises.includes(moi.role) ? <option value="">En mon nom</option> : null}
                        {delegs.map((g) => (
                          <option key={g.id} value={g.id}>Au nom de {p.nommer(g.delegant)}</option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                  <label className="v2-libelle">
                    <span>Commentaire {ex.commentaire ? <em className="v2-det-obligatoire">obligatoire</em> : <em className="v2-det-facultatif">facultatif</em>}</span>
                    <textarea className="v2-det-champ v2-det-champ--multi" value={commentaire} onChange={(e) => setCommentaire(e.target.value)} maxLength={2000} placeholder="Ce que vous avez vérifié, ce qui justifie l'accord." autoFocus />
                  </label>
                  <ChampFichier obligatoire={ex.piece_jointe} fichier={fichier} onChange={setFichier} />
                </>
              ) : form === "refuser" ? (
                <>
                  <p className="v2-det-form-sous">Un refus clôt la demande ; le demandeur en reçoit le motif.</p>
                  {delegs.length ? (
                    <label className="v2-libelle">
                      Décider
                      <select className="v2-det-champ" value={auNomDe} onChange={(e) => setAuNomDe(e.target.value)}>
                        {moi.role && d.roles_autorises.includes(moi.role) ? <option value="">En mon nom</option> : null}
                        {delegs.map((g) => (
                          <option key={g.id} value={g.id}>Au nom de {p.nommer(g.delegant)}</option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                  <label className="v2-libelle">
                    <span>Motif du refus {ex.motif_refus ? <em className="v2-det-obligatoire">obligatoire</em> : null}</span>
                    <select className="v2-det-champ" value={motif} onChange={(e) => setMotif(e.target.value)} autoFocus>
                      <option value="">Choisir un motif…</option>
                      {MOTIFS_REFUS.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </label>
                  <label className="v2-libelle">
                    <span>Précision {motif === MOTIFS_REFUS[MOTIFS_REFUS.length - 1] || !motif ? <em className="v2-det-obligatoire">obligatoire</em> : <em className="v2-det-facultatif">facultatif</em>}</span>
                    <textarea className="v2-det-champ v2-det-champ--multi" value={motifLibre} onChange={(e) => setMotifLibre(e.target.value)} maxLength={1500} placeholder="En une ou deux phrases, ce qui manque ou ce qui ne va pas." />
                  </label>
                  <ChampFichier obligatoire={ex.piece_jointe} fichier={fichier} onChange={setFichier} />
                </>
              ) : form === "modifier" ? (
                <>
                  <p className="v2-det-form-sous">Une demande est figée après sa création : modifier crée une nouvelle demande qui remplace celle-ci, et repart au début de la validation.</p>
                  <label className="v2-libelle">
                    Résumé
                    <textarea className="v2-det-champ v2-det-champ--multi" value={resume} onChange={(e) => setResume(e.target.value)} maxLength={500} autoFocus />
                  </label>
                  <label className="v2-libelle">
                    Montant ({d.devise})
                    <input className="v2-det-champ" inputMode="decimal" value={montantMod} onChange={(e) => setMontantMod(e.target.value)} placeholder="Laisser vide s'il n'y a pas de montant" />
                  </label>
                  <Note teinte="ambre">La nouvelle demande sera saisie en votre nom : la séparation saisie / approbation vous empêchera de la décider.</Note>
                </>
              ) : form === "deleguer" ? (
                <>
                  <p className="v2-det-form-sous">La personne désignée décidera en votre nom, sur ce module ou sur tous, jusqu&apos;à la date choisie. Vous pouvez révoquer à tout moment.</p>
                  <label className="v2-libelle">
                    À qui
                    <select className="v2-det-champ" value={delegataire} onChange={(e) => setDelegataire(e.target.value)} autoFocus>
                      <option value="">Choisir une personne…</option>
                      {p.personnes.map((x) => (
                        <option key={x.id} value={x.id}>{x.libelle}</option>
                      ))}
                    </select>
                  </label>
                  <div className="v2-det-form-ligne">
                    <label className="v2-libelle">
                      Portée
                      <select className="v2-det-champ" value={delegModule} onChange={(e) => setDelegModule(e.target.value)}>
                        <option value={d.module}>{libelleModule(d.module)} seulement</option>
                        <option value="*">Tous les modules</option>
                      </select>
                    </label>
                    <label className="v2-libelle">
                      <span>Jusqu&apos;au <em className="v2-det-facultatif">facultatif</em></span>
                      <input className="v2-det-champ" type="date" value={delegFin} onChange={(e) => setDelegFin(e.target.value)} min={new Date().toISOString().slice(0, 10)} />
                    </label>
                  </div>
                  <label className="v2-libelle">
                    <span>Motif <em className="v2-det-facultatif">facultatif</em></span>
                    <input className="v2-det-champ" value={delegMotif} onChange={(e) => setDelegMotif(e.target.value)} maxLength={500} placeholder="Congés, déplacement…" />
                  </label>
                </>
              ) : (
                <>
                  <p className="v2-det-form-sous">{d.resume}</p>
                  <Note teinte="ambre">Une demande annulée ne se rouvre pas : pour la représenter, il faudra en saisir une nouvelle. Les décisions déjà prises restent dans le journal.</Note>
                </>
              )}
            </Formulaire>
          )}
        </section>
      </div>
    </div>
  );
}

/* Un formulaire dans la colonne de droite : un retour, un titre, les
   champs, l'erreur éventuelle, et le bouton d'envoi en bas. */
function Formulaire({ quel, titre, retour, envoi, erreur, pied, children }: { quel: Exclude<Formulaire, null>; titre: string; retour: () => void; envoi: boolean; erreur: string | null; pied: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="v2-det-form" data-quel={quel}>
      <div className="v2-det-form-tete">
        <button type="button" className="v2-btn v2-btn--petit v2-btn--fantome" onClick={retour} disabled={envoi}>
          <ArrowLeft width={15} height={15} aria-hidden="true" /> Retour
        </button>
        <h2 className="v2-det-form-titre">{titre}</h2>
      </div>
      <div className="v2-det-form-corps">
        {children}
        {erreur ? <Note teinte="rouge" role="alert"><strong>Refusé par la base.</strong> {erreur}</Note> : null}
      </div>
      <div className="v2-det-fondu" aria-hidden="true" />
      <div className="v2-det-actions">{pied}</div>
    </div>
  );
}

/* Le résumé d'une demande porte souvent déjà son montant : on ne le répète
   pas. Les espaces de milliers deviennent insécables. */
function resumeAvecMontant(resume: string, montantTexte: string | null): string {
  const insecable = (t: string) => t.replace(/(\d)[   ](?=\d{3}(?:\D|$))/g, "$1 ");
  const r = insecable(resume);
  if (!montantTexte) return r;
  const m = insecable(montantTexte);
  const chiffres = (t: string) => t.replace(/\D/g, "");
  return chiffres(r).includes(chiffres(m)) ? r : `${r} — ${m}`;
}

/* Le champ de pièce jointe : le contrôle natif est caché ; un bouton de la
   charte le déclenche et le nom du fichier choisi s'affiche à côté. */
function ChampFichier({ obligatoire, fichier, onChange }: { obligatoire: boolean; fichier: File | null; onChange: (f: File | null) => void }) {
  const id = useId();
  return (
    <div className="v2-libelle">
      <span>Pièce jointe {obligatoire ? <em className="v2-det-obligatoire">obligatoire</em> : <em className="v2-det-facultatif">facultatif</em>}</span>
      <div className="v2-det-fichier">
        <input id={id} type="file" className="v2-det-fichier-natif" accept=".pdf,.png,.jpg,.jpeg,.xml,.csv,.xlsx" onChange={(e) => onChange(e.target.files?.[0] ?? null)} />
        <label htmlFor={id} className="v2-btn v2-btn--petit">
          <FileText width={14} height={14} aria-hidden="true" /> {fichier ? "Changer de fichier" : "Choisir un fichier"}
        </label>
        <span className="v2-det-sous">{fichier ? `${fichier.name} · ${Math.round(fichier.size / 1024)} Ko` : "PDF, image, XML, CSV ou tableur."}</span>
      </div>
    </div>
  );
}
