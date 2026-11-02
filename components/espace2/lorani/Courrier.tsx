"use client";

/* ══════════════════════════════════════════════════════════════════════
   LORANI « Courrier à ranger », sur « My issues » de Linear (29/10/2026)

   Ce que la lecture des courriers de la mairie laisse à traiter, tous
   permis confondus, au lieu d'être noyé sous chaque permis (inventaire
   docs/refonte-metiers/lorani.md, § 8.3 O3 et O8) :

     · À confirmer : les dates lues sur un courrier et rattachées à un
       permis (B10), et les décisions implicites nées du silence de la
       mairie (B9) ;
     · À ranger : les dates lues sans permis (« Permis à choisir », O8,
       jusqu'ici comptées nulle part) et les courriers que le lecteur n'a
       pas reconnus, n'a pas pu lire, ou dont la lecture est à vérifier
       sans qu'aucune date n'en soit sortie (B17) ;
     · Tous : les deux.
   L'onglet est dans l'adresse (?onglet=a-ranger | tous), les lignes sont
   groupées par projet, le plus récent d'abord.

   Les gestes sont ceux de l'écran du permis (components/espace/lorani/
   PermisVue.tsx), mêmes portes : cocher la case ou « Confirmer… » ouvre
   la fenêtre F7 (valeurs corrigeables, permis visé quand il y en a
   plusieurs ou aucun) → confirmerDateLue ; « Écarter… » ouvre F8 (motif
   obligatoire) → ecarterDateLue ; une décision implicite se confirme par
   F9 → confirmerDecisionImplicite. Un courrier non reconnu n'a pas de
   geste ici : la ligne mène au permis (ou au projet), où il se saisit à
   la main, et le « + » d'un groupe mène au dépôt d'un courrier (B19).

   Ce que le dossier ne contient pas n'est pas montré : les courriels du
   guichet à ranger (E10, E11), le sursis à statuer (E4) et les situations
   lues à ranger (E18) ne sont lus nulle part par chargerDossier.
   Gabarit : ../lin/lin.css ; mesures propres : ../lin/linear-my-issues.css.
   ══════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Check, ChevronDown, FileCheck2, FileInput, FileQuestionMark, FileWarning, Folder, Gavel, Hourglass, Plus, Quote, Signpost, UserRound, XCircle } from "lucide-react";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import { Avis } from "@/components/espace/ui";
import { dateCourte } from "@/components/espace/format";
import { DECISIONS, NATURES_DATE_LUE, TYPES, TYPES_CONTROLE, libelleTypePiece, titrePermis } from "@/components/espace/lorani/etats";
import { confirmerDateLue, confirmerDecisionImplicite, ecarterDateLue } from "@/components/espace/lorani/portes";
import type { DateLue, Dossier, NatureDateLue, Permis, PieceProjet, Projet } from "@/components/espace/lorani/types";
import { Menu, MenuActions, type Option } from "../lin/Lin";
import { RACINE } from "../modules";
import { useToast } from "../Toasts";
import { useLorani } from "./donnees";
import "@/components/espace/espace.css";
import "../lin/lin.css";
import "../lin/linear-my-issues.css";

const CHEMIN = `${RACINE}/lorani/courrier`;
const lienPermis = (id: string) => `${RACINE}/lorani/permis/${encodeURIComponent(id)}`;
const lienProjet = (id: string) => `${RACINE}/lorani/projets/${encodeURIComponent(id)}?partie=projet`;

type CleOnglet = "a-confirmer" | "a-ranger" | "tous";
const ONGLETS: { cle: CleOnglet; libelle: string }[] = [
  { cle: "a-confirmer", libelle: "À confirmer" },
  { cle: "a-ranger", libelle: "À ranger" },
  { cle: "tous", libelle: "Tous" },
];
const estOnglet = (x: string | null): x is CleOnglet => ONGLETS.some((o) => o.cle === x);
const lienOnglet = (cle: CleOnglet) => (cle === "a-confirmer" ? CHEMIN : `${CHEMIN}?onglet=${cle}`);

/* une ligne de la file */
type Element = {
  cle: string;
  onglet: "a-confirmer" | "a-ranger";
  projet: Projet;
  permis: Permis | null;
  date?: DateLue;
  piece?: PieceProjet;
  implicite?: Permis;
  /* pour trier : la lecture, le dépôt, ou la date de la décision née */
  quand: string;
  lien: string;
};

/* ——— repris de PermisVue (F7) : la lettre de demande de pièces, appliquée comme le socle, pour l'exemple ——— */
const decouperCodes = (brut: string) => brut.split(/[,;]+|\s+(?=[A-Za-z])/).map((c) => c.replace(/\s/g, "").toUpperCase()).filter(Boolean);
const unionPieces = (a: { code: string }[], b: { code: string }[]) => [...a, ...b.filter((x) => !a.some((y) => y.code === x.code))];
function appliquerDemande(p: Permis, date: string, pieces: { code: string }[]): Partial<Permis> {
  const hist = [...(p.demandes_pieces ?? (p.date_demande_pieces ? [{ date: p.date_demande_pieces, pieces: p.pieces_demandees }] : [])).filter((h) => h.date !== date), { date, pieces }].sort((x, y) => x.date.localeCompare(y.date));
  if (!p.date_demande_pieces || p.date_demande_pieces === date) return { date_demande_pieces: date, pieces_demandees: pieces, demandes_pieces: hist, etat: "pieces_demandees" };
  if (p.date_pieces_fournies) return { demandes_pieces: hist };
  const premiere = date < p.date_demande_pieces;
  return { date_demande_pieces: premiere ? date : p.date_demande_pieces, pieces_demandees: premiere ? unionPieces(pieces, p.pieces_demandees) : unionPieces(p.pieces_demandees, pieces), demandes_pieces: hist, etat: "pieces_demandees" };
}
const majPermis = (d: Dossier, id: string, patch: Partial<Permis>): Dossier => ({ ...d, permis: d.permis.map((x) => (x.id === id ? { ...x, ...patch, maj_le: new Date().toISOString() } : x)) });

/* la proposition d'une date lue, en clair (comme B10) */
function valeursEnClair(nature: NatureDateLue, v: Record<string, unknown>): string {
  return NATURES_DATE_LUE[nature].champs
    .filter((c) => v[c.cle] !== undefined && v[c.cle] !== null)
    .map((c) => {
      const x = v[c.cle];
      if (c.type === "date") return dateCourte(`${x}T12:00:00`);
      if (c.type === "decision") return DECISIONS[x as keyof typeof DECISIONS] ?? String(x);
      if (c.type === "pieces") return Array.isArray(x) ? (x as { code: string }[]).map((p) => p.code).join(", ") || "aucune pièce" : String(x);
      if (c.type === "entier") return `${x} mois`;
      return String(x);
    })
    .join(" · ");
}

/* « 28 oct. », comme le « Oct 28 » de Linear */
const jourCourt = (iso: string) => {
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T12:00:00` : iso);
  return Number.isNaN(d.getTime()) ? "" : new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(d);
};
const initiales = (nom: string) =>
  nom
    .split(/\s+/)
    .filter((x) => /\p{L}/u.test(x))
    .slice(0, 2)
    .map((x) => x[0])
    .join("");
const COULEURS = ["#26b5ce", "#5e6ad2", "#4cb782", "#f2994a", "#eb5757", "#bb87fc", "#f2c94c", "#95a2b3"];
const couleurDe = (s: string) => COULEURS[[...s].reduce((t, c) => t + c.charCodeAt(0), 0) % COULEURS.length];

const ICONES_NATURE: Record<NatureDateLue, typeof FileInput> = {
  depot: FileInput,
  delai_notifie: Hourglass,
  demande_pieces: FileQuestionMark,
  decision: Gavel,
  decision_tacite: FileCheck2,
  affichage: Signpost,
};

/* le statut de la ligne, 14 px, aux formes de Linear */
type Statut = "confirmer" | "ranger" | "verifier" | "illisible";
const LIBELLES_STATUT: Record<Statut, string> = { confirmer: "À confirmer", ranger: "À ranger", verifier: "Lecture à vérifier", illisible: "Illisible" };
function IconeStatut({ statut }: { statut: Statut }) {
  return (
    <span className="lmi-statut" data-statut={statut} title={LIBELLES_STATUT[statut]}>
      <svg viewBox="0 0 14 14" role="img" aria-label={LIBELLES_STATUT[statut]}>
        {statut === "confirmer" ? (
          <>
            <circle cx="7" cy="7" r="6" fill="currentColor" />
            <path d="M4 5.4h5.6M8.2 4l1.4 1.4-1.4 1.4M10 8.6H4.4M5.8 7.2 4.4 8.6 5.8 10" fill="none" stroke="var(--lin-fond)" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
          </>
        ) : statut === "ranger" ? (
          <circle cx="7" cy="7" r="5.75" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="1.4 1.65" />
        ) : statut === "verifier" ? (
          <>
            <circle cx="7" cy="7" r="5.75" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <path d="M7 3.5a3.5 3.5 0 0 1 0 7z" fill="currentColor" />
          </>
        ) : (
          <>
            <circle cx="7" cy="7" r="6" fill="currentColor" />
            <path d="m4.9 4.9 4.2 4.2m0-4.2-4.2 4.2" stroke="var(--lin-fond)" strokeWidth="1.3" strokeLinecap="round" />
          </>
        )}
      </svg>
    </span>
  );
}

function Avatar({ nom }: { nom: string | null }) {
  const ini = nom ? initiales(nom) : "";
  if (!nom || !ini) {
    return (
      <span className="lmi-avatar lmi-avatar--vide" title="Aucun chef de projet nommé">
        <UserRound aria-hidden="true" />
      </span>
    );
  }
  return (
    <span className="lmi-avatar" title={`Chef de projet : ${nom}`} style={{ "--lmi-teinte": couleurDe(nom) } as React.CSSProperties} aria-hidden="true">
      {ini}
    </span>
  );
}

type Form = { type: "confirmer"; date: DateLue } | { type: "ecarter"; date: DateLue } | { type: "implicite"; permis: Permis } | null;

export default function Courrier() {
  const { source, pret, erreur: erreurLecture, dossier, peutEcrire, agir, nommer } = useLorani();
  const params = useSearchParams();
  const toast = useToast();
  const o = params.get("onglet");
  const onglet: CleOnglet = estOnglet(o) ? o : "a-confirmer";
  const chargement = source === "reelle" && !pret;

  /* ——— la file : ce que le dossier contient, rien de plus ——— */
  const elements = useMemo<Element[]>(() => {
    const projets = new Map(dossier.projets.map((p) => [p.id, p]));
    const permisDe = new Map(dossier.permis.map((p) => [p.id, p]));
    const actifsDe = (projet: string) => dossier.permis.filter((x) => x.projet_id === projet && x.actif);
    /* sans permis visé : le seul permis actif du projet, sinon la partie Projet */
    const lienDuProjet = (projet: string) => {
      const actifs = actifsDe(projet);
      return actifs.length === 1 ? lienPermis(actifs[0].id) : lienProjet(projet);
    };
    const n: Element[] = [];
    for (const d of dossier.datesLues) {
      if (d.statut !== "proposee") continue;
      const projet = projets.get(d.projet_id);
      if (!projet) continue;
      const permis = d.permis_id ? (permisDe.get(d.permis_id) ?? null) : null;
      n.push({ cle: `d:${d.id}`, onglet: permis ? "a-confirmer" : "a-ranger", projet, permis, date: d, quand: d.cree_le, lien: permis ? lienPermis(permis.id) : lienDuProjet(projet.id) });
    }
    for (const p of dossier.permis) {
      if (p.etat !== "decision_a_confirmer" || !p.calcul?.decision_implicite) continue;
      const projet = projets.get(p.projet_id);
      if (!projet) continue;
      n.push({ cle: `i:${p.id}`, onglet: "a-confirmer", projet, permis: p, implicite: p, quand: p.calcul.decision_implicite.date, lien: lienPermis(p.id) });
    }
    for (const x of dossier.pieces) {
      if (TYPES_CONTROLE.includes(x.type_piece ?? "")) continue;
      const aRanger = x.statut === "a_classer" || x.statut === "echec" || (x.statut === "a_verifier" && !dossier.datesLues.some((d) => d.piece_id === x.id));
      if (!aRanger) continue;
      const projet = projets.get(x.objet_id);
      if (!projet) continue;
      n.push({ cle: `p:${x.id}`, onglet: "a-ranger", projet, permis: null, piece: x, quand: x.cree_le ?? "", lien: lienDuProjet(projet.id) });
    }
    return n;
  }, [dossier]);

  const comptes = useMemo(() => ({ "a-confirmer": elements.filter((e) => e.onglet === "a-confirmer").length, "a-ranger": elements.filter((e) => e.onglet === "a-ranger").length, tous: elements.length }), [elements]);

  /* groupés par projet, le plus récent d'abord ; « Tous » : à confirmer avant à ranger */
  const groupes = useMemo(() => {
    const visibles = elements.filter((e) => onglet === "tous" || e.onglet === onglet);
    const m = new Map<string, { projet: Projet; lignes: Element[] }>();
    for (const e of visibles) {
      const g = m.get(e.projet.id) ?? { projet: e.projet, lignes: [] };
      g.lignes.push(e);
      m.set(e.projet.id, g);
    }
    const liste = [...m.values()];
    for (const g of liste) g.lignes.sort((a, b) => (a.onglet === b.onglet ? b.quand.localeCompare(a.quand) : a.onglet === "a-confirmer" ? -1 : 1));
    const recent = (g: { lignes: Element[] }) => g.lignes.reduce((r, e) => (e.quand > r ? e.quand : r), "");
    return liste.sort((a, b) => recent(b).localeCompare(recent(a)));
  }, [elements, onglet]);

  const [replies, setReplies] = useState<Set<string>>(() => new Set());
  const basculer = (id: string) =>
    setReplies((avant) => {
      const apres = new Set(avant);
      if (apres.has(id)) apres.delete(id);
      else apres.add(id);
      return apres;
    });

  /* ——— les gestes : les fenêtres F7, F8, F9 de PermisVue, mêmes portes ——— */
  const [form, setForm] = useState<Form>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [valeurs, setValeurs] = useState<Record<string, string>>({});
  const [permisVise, setPermisVise] = useState("");
  const [motif, setMotif] = useState("");
  const gris = !peutEcrire || envoi;

  const appliquer = async (reel: () => Promise<void>, local: () => Dossier, message: string) => {
    setEnvoi(true);
    setErreur(null);
    try {
      await agir(reel, local);
      setForm(null);
      toast(message, "vert");
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base n'a pas répondu.");
    } finally {
      setEnvoi(false);
    }
  };

  const actifsDuProjet = (projet: string) => dossier.permis.filter((x) => x.projet_id === projet && x.actif);
  const ouvrirConfirmation = (d: DateLue) => {
    const v: Record<string, string> = {};
    for (const ch of NATURES_DATE_LUE[d.nature].champs) {
      const x = d.proposition[ch.cle];
      v[ch.cle] = ch.type === "pieces" ? (Array.isArray(x) ? (x as { code: string }[]).map((q) => q.code).join(", ") : "") : x === undefined || x === null ? "" : String(x);
    }
    setValeurs(v);
    setPermisVise(d.permis_id ?? dossier.permis.find((x) => x.projet_id === d.projet_id && x.actif)?.id ?? "");
    setErreur(null);
    setForm({ type: "confirmer", date: d });
  };
  const ouvrirEcart = (d: DateLue) => {
    setMotif("");
    setErreur(null);
    setForm({ type: "ecarter", date: d });
  };
  const confirmationComplete = form?.type === "confirmer" && NATURES_DATE_LUE[form.date.nature].champs.every((ch) => ch.cle === "numero" || ch.cle === "date_notification_delai" || (valeurs[ch.cle] ?? "").trim() !== "") && !!permisVise;
  const motifOk = motif.trim().length >= 3 && motif.trim().length <= 300;

  const soumettreConfirmation = async () => {
    if (form?.type !== "confirmer") return;
    const d = form.date;
    const v: Record<string, unknown> = {};
    let corrige = false;
    for (const ch of NATURES_DATE_LUE[d.nature].champs) {
      const brut = (valeurs[ch.cle] ?? "").trim();
      let x: unknown;
      if (ch.type === "pieces") x = brut ? decouperCodes(brut).map((code) => ({ code })) : [];
      else if (ch.type === "entier") x = brut ? Number(brut) : null;
      else x = brut || null;
      if (JSON.stringify(x) !== JSON.stringify(d.proposition[ch.cle] ?? null)) corrige = true;
      if (x !== null) v[ch.cle] = x;
    }
    const cible = dossier.permis.find((x) => x.id === permisVise);
    const patch: Partial<Permis> = {};
    if (d.nature === "depot") Object.assign(patch, { date_depot: v.date_depot as string, numero: (v.numero as string) ?? null, etat: "instruction" as const });
    if (d.nature === "delai_notifie")
      Object.assign(patch, {
        delai_notifie_mois: v.delai_notifie_mois as number,
        date_notification_delai: (v.date_notification_delai as string) ?? null,
        /* en exemple, le régime du calcul dit le délai notifié ; en base réelle, le système le recalcule */
        calcul: cible ? { ...cible.calcul, regime: cible.calcul.regime ? { ...cible.calcul.regime, delai_notifie_mois: v.delai_notifie_mois as number } : undefined } : undefined,
      });
    if (d.nature === "demande_pieces" && cible) Object.assign(patch, appliquerDemande(cible, v.date_demande_pieces as string, (v.pieces as { code: string }[]) ?? []));
    if (d.nature === "decision") Object.assign(patch, { decision: v.decision as Permis["decision"], date_decision: v.date_decision as string, etat: v.decision === "favorable" ? ("accorde" as const) : ("refuse" as const) });
    if (d.nature === "decision_tacite") Object.assign(patch, { decision: "tacite" as const, date_decision: v.date_decision as string, etat: "accorde" as const });
    if (d.nature === "affichage") Object.assign(patch, { date_affichage: v.date_affichage as string });
    await appliquer(
      () => confirmerDateLue(d.id, corrige ? v : null, permisVise !== d.permis_id ? permisVise : null).then(() => undefined),
      () => {
        const d2 = majPermis(dossier, permisVise, patch);
        return { ...d2, datesLues: d2.datesLues.map((x) => (x.id === d.id ? { ...x, statut: "confirmee" as const, permis_id: permisVise, confirme: v, decide_par: dossier.moi?.user_id ?? null, decide_le: new Date().toISOString() } : x)) };
      },
      corrige ? "Date confirmée avec vos corrections : le calendrier est recalculé." : "Date confirmée : le calendrier est recalculé.",
    );
  };

  const soumettreEcart = async () => {
    if (form?.type !== "ecarter") return;
    const d = form.date;
    await appliquer(
      () => ecarterDateLue(d.id, motif.trim()),
      () => ({ ...dossier, datesLues: dossier.datesLues.map((x) => (x.id === d.id ? { ...x, statut: "ecartee" as const, motif: motif.trim(), decide_par: dossier.moi?.user_id ?? null, decide_le: new Date().toISOString() } : x)) }),
      "Lecture écartée : le permis n'en garde rien, le motif reste au journal.",
    );
  };

  const soumettreImplicite = async () => {
    if (form?.type !== "implicite") return;
    const p = form.permis;
    const c = p.calcul;
    const impl = c.decision_implicite;
    if (!impl) return;
    const dp = p.type_autorisation === "dp";
    await appliquer(
      () => confirmerDecisionImplicite(p.id).then(() => undefined),
      () => majPermis(dossier, p.id, { decision: impl.nature, date_decision: impl.date, etat: impl.nature === "tacite" ? "accorde" : "rejete", calcul: { ...c, etat: impl.nature === "tacite" ? "accorde" : "rejete", decision_implicite: undefined, etapes: c.etapes.map((e) => (e.nature === "decision" ? { ...e, statut: "fait" as const, libelle: impl.nature === "tacite" ? (dp ? "Non-opposition tacite, confirmée" : "Permis tacite, confirmé") : dp ? "Opposition tacite, confirmée" : "Rejet implicite, confirmé" } : e)) } }),
      impl.nature === "tacite" ? "Décision tacite confirmée, datée par le système. Affichez le permis sur le terrain, puis saisissez le premier jour." : "Rejet implicite confirmé.",
    );
  };

  /* ——— une ligne ——— */
  const titreImplicite = (p: Permis) => {
    const impl = p.calcul.decision_implicite!;
    const dp = p.type_autorisation === "dp";
    return `${impl.nature === "tacite" ? (dp ? "Non-opposition tacite née" : "Permis tacite né") : dp ? "Opposition tacite" : "Rejet implicite"} le ${dateCourte(`${impl.date}T12:00:00`)}`;
  };

  function ligne(e: Element) {
    const nomPermis = e.permis ? titrePermis(e.permis, e.projet.nom) : "";
    const chef = dossier.membres.find((m) => m.projet_id === e.projet.id && m.role_projet === "chef_projet");
    const nomChef = chef ? nommer(chef.user_id) : null;
    const ouvrir: Option = { cle: "ouvrir", libelle: e.permis ? `Ouvrir ${nomPermis}` : "Ouvrir le projet", icone: <Folder width={16} height={16} aria-hidden="true" />, href: e.lien };

    if (e.date) {
      const d = e.date;
      const nature = NATURES_DATE_LUE[d.nature];
      const Icone = ICONES_NATURE[d.nature];
      const piece = dossier.pieces.find((x) => x.id === d.piece_id);
      const titre = `${nature.libelle} : ${valeursEnClair(d.nature, d.proposition) || "valeur à saisir"}`;
      const options: Option[] = [
        { cle: "confirmer", libelle: "Confirmer…", icone: <Check width={16} height={16} aria-hidden="true" />, action: () => ouvrirConfirmation(d) },
        { cle: "ecarter", libelle: "Écarter…", icone: <XCircle width={16} height={16} aria-hidden="true" />, action: () => ouvrirEcart(d) },
        ouvrir,
      ];
      return (
        <li key={e.cle} className="lmi-ligne">
          <Link className="lmi-ligne-lien" href={e.lien} aria-label={`${titre}, ${e.permis ? nomPermis : "permis à choisir"}`} />
          <button type="button" className="lmi-case" aria-label={`Confirmer : ${titre}`} title="Confirmer" disabled={gris} onClick={() => ouvrirConfirmation(d)} />
          <span className="lmi-icone" title={nature.libelle}>
            <Icone aria-hidden="true" />
          </span>
          <span className="lmi-id">{e.permis ? TYPES[e.permis.type_autorisation].court : "Projet"}</span>
          <IconeStatut statut={e.permis ? "confirmer" : "ranger"} />
          <span className="lmi-titre">
            <span className="lmi-titre-texte">{titre}</span>
            <span className="lmi-titre-second">{piece?.nom_fichier ?? libelleTypePiece(d.type_piece)}</span>
          </span>
          <span className="lmi-droite">
            {e.permis ? null : (
              <span className="lmi-pilule" title="Aucun permis n'a été reconnu sur ce courrier : choisissez-le en confirmant.">
                Permis à choisir
              </span>
            )}
            <span className="lmi-pilule" data-teinte={d.verifiee ? "vert" : "jaune"} title={d.verifiee ? "Citation retrouvée sur le courrier" : "Citation non retrouvée sur le courrier"}>
              <Quote aria-hidden="true" />
              {d.citations?.length ?? 0}
            </span>
            <Avatar nom={nomChef} />
            {peutEcrire ? (
              <span className="lmi-actions">
                <MenuActions rond titre="Actions sur cette date lue" options={options} />
              </span>
            ) : null}
          </span>
          <span className="lmi-date" title={`Lu le ${dateCourte(d.cree_le)}`}>
            {jourCourt(d.cree_le)}
          </span>
        </li>
      );
    }

    if (e.implicite) {
      const p = e.implicite;
      const titre = titreImplicite(p);
      const options: Option[] = [{ cle: "confirmer", libelle: "Confirmer la décision…", icone: <Gavel width={16} height={16} aria-hidden="true" />, action: () => { setErreur(null); setForm({ type: "implicite", permis: p }); } }, ouvrir];
      return (
        <li key={e.cle} className="lmi-ligne">
          <Link className="lmi-ligne-lien" href={e.lien} aria-label={`${titre}, ${nomPermis}`} />
          <button type="button" className="lmi-case" aria-label={`Confirmer : ${titre}`} title="Confirmer" disabled={gris} onClick={() => { setErreur(null); setForm({ type: "implicite", permis: p }); }} />
          <span className="lmi-icone" title="Décision implicite">
            <Gavel aria-hidden="true" />
          </span>
          <span className="lmi-id">{TYPES[p.type_autorisation].court}</span>
          <IconeStatut statut="confirmer" />
          <span className="lmi-titre">
            <span className="lmi-titre-texte">{titre}</span>
            <span className="lmi-titre-second">{nomPermis}</span>
          </span>
          <span className="lmi-droite">
            <Avatar nom={nomChef} />
            {peutEcrire ? (
              <span className="lmi-actions">
                <MenuActions rond titre="Actions sur cette décision" options={options} />
              </span>
            ) : null}
          </span>
          <span className="lmi-date" title={`Née le ${dateCourte(`${p.calcul.decision_implicite!.date}T12:00:00`)}`}>
            {jourCourt(p.calcul.decision_implicite!.date)}
          </span>
        </li>
      );
    }

    const x = e.piece!;
    const statut: Statut = x.statut === "echec" ? "illisible" : x.statut === "a_verifier" ? "verifier" : "ranger";
    const titre = x.statut === "echec" ? "Courrier illisible" : x.statut === "a_verifier" ? "Lecture à vérifier" : "Courrier non reconnu";
    return (
      <li key={e.cle} className="lmi-ligne">
        <Link className="lmi-ligne-lien" href={e.lien} aria-label={`${titre} : ${x.nom_fichier}`} />
        <span className="lmi-icone" title={libelleTypePiece(x.type_piece)}>
          <FileWarning aria-hidden="true" />
        </span>
        <span className="lmi-id">{x.source === "courriel" ? "Guichet" : "Dépôt"}</span>
        <IconeStatut statut={statut} />
        <span className="lmi-titre">
          <span className="lmi-titre-texte">
            {titre} : {x.nom_fichier}
          </span>
          <span className="lmi-titre-second">{x.motif ? `« ${x.motif} »` : "aucune date n'en est proposée, saisissez-la à la main"}</span>
        </span>
        <span className="lmi-droite">
          <Avatar nom={nomChef} />
          <span className="lmi-actions">
            <MenuActions rond titre="Actions sur ce courrier" options={[ouvrir]} />
          </span>
        </span>
        <span className="lmi-date" title={x.cree_le ? `${x.source === "courriel" ? "Reçu" : "Déposé"} le ${dateCourte(x.cree_le)}` : undefined}>
          {x.cree_le ? jourCourt(x.cree_le) : ""}
        </span>
      </li>
    );
  }

  const vide =
    onglet === "a-confirmer"
      ? { titre: "Rien à confirmer", aide: "Les dates lues sur les courriers de la mairie et les décisions nées de son silence arrivent ici." }
      : onglet === "a-ranger"
        ? { titre: "Rien à ranger", aide: "Les dates lues sans permis reconnu et les courriers que le lecteur n'a pas su lire arrivent ici." }
        : { titre: "Aucun courrier en attente", aide: "Chaque courrier déposé ou reçu du guichet a été traité." };

  const formDate = form?.type === "confirmer" || form?.type === "ecarter" ? form.date : null;
  const projetForm = formDate ? dossier.projets.find((p) => p.id === formDate.projet_id) : null;
  const actifsForm = formDate ? actifsDuProjet(formDate.projet_id) : [];
  const dpForm = actifsForm.find((x) => x.id === permisVise)?.type_autorisation === "dp";
  const implicite = form?.type === "implicite" ? form.permis : null;

  return (
    <div className="lin lmi">
      <h1 className="v2-sr">Courrier à ranger</h1>

      <header className="lmi-tete">
        <h2 className="lmi-h2">Courrier à ranger</h2>
        {comptes.tous ? <span className="lmi-tete-compte">{comptes.tous} en attente</span> : null}
      </header>

      <div className="lmi-barre">
        <nav className="lmi-onglets" aria-label="Vues du courrier">
          {ONGLETS.map((x, i) => (
            <Link key={x.cle} href={lienOnglet(x.cle)} scroll={false} className="lmi-onglet" aria-current={onglet === x.cle ? "page" : undefined} data-replie={i >= 2 && onglet !== x.cle ? "" : undefined}>
              {x.libelle}
            </Link>
          ))}
          {/* en étroit : les onglets en trop dans « N de plus ▾ » (ici : Tous, sauf quand il est l'onglet courant) */}
          {onglet !== "tous" ? (
            <div className="lmi-plus">
              <Menu
                largeur={180}
                bouton={(ouvert, basculerMenu) => (
                  <button type="button" className="lmi-onglet" aria-expanded={ouvert} aria-haspopup="menu" onClick={basculerMenu}>
                    1 de plus
                    <svg viewBox="0 0 9 8" aria-hidden="true">
                      <path d="M1 2.5 4.5 6 8 2.5" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                )}
              >
                {(fermer) =>
                  ONGLETS.slice(2).map((x) => (
                    <Link key={x.cle} href={lienOnglet(x.cle)} scroll={false} className="lin-menu-option" onClick={fermer}>
                      {x.libelle}
                      <span className="lin-meta">{comptes[x.cle]}</span>
                    </Link>
                  ))
                }
              </Menu>
            </div>
          ) : null}
        </nav>
        {!peutEcrire && pret ? <span className="lmi-lecture-seule">Lecture seule</span> : null}
      </div>

      {chargement ? (
        <ul className="lmi-lignes" aria-busy="true" aria-label="Lecture du dossier">
          {[0, 1, 2, 3].map((i) => (
            <li key={i} className="lmi-ligne" aria-hidden="true">
              <span className="lmi-titre">
                <span className="lmi-squelette" style={{ width: `${70 - i * 12}%` }} />
              </span>
            </li>
          ))}
        </ul>
      ) : erreurLecture ? (
        <p className="lmi-vide" role="alert">
          <strong>Le dossier n&apos;a pas pu être lu.</strong>
          {erreurLecture}
        </p>
      ) : groupes.length ? (
        <ul className="lmi-liste">
          {groupes.map((g) => {
            const replie = replies.has(g.projet.id);
            const precision = [g.projet.reference, g.projet.commune].filter(Boolean).join(" · ");
            return (
              <li key={g.projet.id} className="lmi-groupe">
                <div className="lmi-groupe-tete">
                  <button type="button" className="lmi-groupe-replier" aria-expanded={!replie} aria-label={replie ? `Déplier ${g.projet.nom}` : `Replier ${g.projet.nom}`} onClick={() => basculer(g.projet.id)}>
                    <ChevronDown aria-hidden="true" />
                  </button>
                  <Folder className="lmi-groupe-icone" aria-hidden="true" />
                  <Link className="lmi-groupe-nom" href={lienProjet(g.projet.id)}>
                    {g.projet.nom}
                  </Link>
                  <span className="lmi-groupe-compte">{g.lignes.length}</span>
                  {precision ? <span className="lmi-groupe-precision">{precision}</span> : null}
                  <Link className="lmi-rond" href={lienProjet(g.projet.id)} aria-label={`Déposer un courrier sur ${g.projet.nom}`} title="Déposer un courrier">
                    <Plus aria-hidden="true" />
                  </Link>
                </div>
                {replie ? null : <ul className="lmi-lignes">{g.lignes.map(ligne)}</ul>}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="lmi-vide">
          <strong>{vide.titre}</strong>
          {vide.aide}
        </p>
      )}

      {/* F7 — confirmer une date lue (le permis visé se choisit quand il y en a plusieurs, ou aucun) */}
      <Dialog open={form?.type === "confirmer"} onOpenChange={(ouvert) => !ouvert && !envoi && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone>
              <Check width={18} height={18} aria-hidden="true" />
            </DialogIcone>
            <DialogTitle>Confirmer {form?.type === "confirmer" ? NATURES_DATE_LUE[form.date.nature].libelle.toLowerCase() : ""}</DialogTitle>
            <DialogDescription>
              Lu sur {form?.type === "confirmer" ? `le ${NATURES_DATE_LUE[form.date.nature].piece}` : "le courrier"}
              {projetForm ? ` de « ${projetForm.nom} »` : ""}. Corrigez si le courrier dit autre chose : la valeur confirmée est celle qui compte, et le calendrier est recalculé.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            {form?.type === "confirmer" ? (
              <div className="esp-form">
                {actifsForm.length > 1 || !form.date.permis_id ? (
                  <label className="rv-libelle">
                    Permis visé <span className="esp-obligatoire">(obligatoire)</span>
                    <select className="rv-champ" value={permisVise} onChange={(e) => setPermisVise(e.target.value)}>
                      <option value="">Choisir…</option>
                      {actifsForm.map((x) => (
                        <option key={x.id} value={x.id}>
                          {titrePermis(x, projetForm?.nom ?? "")}
                          {x.numero ? ` · ${x.numero}` : ""}
                        </option>
                      ))}
                    </select>
                    {!actifsForm.length ? <span className="esp-kpi-sous">Ce projet n&apos;a aucun permis en cours : ouvrez-le depuis le projet, puis revenez confirmer.</span> : null}
                  </label>
                ) : null}
                {NATURES_DATE_LUE[form.date.nature].champs.map((ch) => (
                  <label key={ch.cle} className="rv-libelle">
                    {ch.libelle}
                    {ch.cle === "numero" || ch.cle === "date_notification_delai" ? null : (
                      <>
                        {" "}
                        <span className="esp-obligatoire">(obligatoire)</span>
                      </>
                    )}
                    {ch.type === "decision" ? (
                      <select className="rv-champ" value={valeurs[ch.cle] ?? ""} onChange={(e) => setValeurs((v) => ({ ...v, [ch.cle]: e.target.value }))}>
                        <option value="favorable">{dpForm ? "Non-opposition" : "Accordé"}</option>
                        <option value="defavorable">{dpForm ? "Opposition" : "Refusé"}</option>
                      </select>
                    ) : (
                      <input className="rv-champ" type={ch.type === "date" ? "date" : "text"} inputMode={ch.type === "entier" ? "numeric" : undefined} value={valeurs[ch.cle] ?? ""} onChange={(e) => setValeurs((v) => ({ ...v, [ch.cle]: e.target.value }))} placeholder={ch.type === "pieces" ? "PC5, PC8" : undefined} />
                    )}
                  </label>
                ))}
                {form.date.citations?.length ? (
                  <div className="esp-kpi-sous">
                    {form.date.citations.slice(0, 3).map((ci, i) => (
                      <div key={i}>
                        « {ci.texte} »{ci.page ? ` (page ${ci.page})` : ""}
                      </div>
                    ))}
                  </div>
                ) : null}
                {erreur ? (
                  <Avis teinte="rouge" role="alert">
                    {erreur}
                  </Avis>
                ) : null}
              </div>
            ) : null}
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={!confirmationComplete || gris} onClick={soumettreConfirmation}>
              {envoi ? <Loader variant="spin" /> : null} Confirmer
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* F8 — écarter une lecture : motif obligatoire, inscrit au journal */}
      <Dialog open={form?.type === "ecarter"} onOpenChange={(ouvert) => !ouvert && !envoi && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone>
              <XCircle width={18} height={18} aria-hidden="true" />
            </DialogIcone>
            <DialogTitle>Écarter cette lecture</DialogTitle>
            <DialogDescription>Le permis n&apos;en gardera rien. Le motif est inscrit au journal, avec votre nom.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              {formDate ? (
                <p className="esp-kpi-sous">
                  {NATURES_DATE_LUE[formDate.nature].libelle} : {valeursEnClair(formDate.nature, formDate.proposition) || "aucune valeur lue"}
                </p>
              ) : null}
              <label className="rv-libelle">
                Motif <span className="esp-obligatoire">(obligatoire, une phrase)</span>
                <textarea className="rv-champ" value={motif} onChange={(e) => setMotif(e.target.value)} maxLength={300} placeholder="La lettre vise un autre dossier ; la date lue est celle de l'accusé, pas du dépôt…" />
              </label>
              {erreur ? (
                <Avis teinte="rouge" role="alert">
                  {erreur}
                </Avis>
              ) : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={!motifOk || gris} onClick={soumettreEcart}>
              {envoi ? <Loader variant="spin" /> : null} Écarter
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* F9 — confirmer la décision implicite : datée par le système, jamais saisie à la main */}
      <Dialog open={form?.type === "implicite"} onOpenChange={(ouvert) => !ouvert && !envoi && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone>
              <Gavel width={18} height={18} aria-hidden="true" />
            </DialogIcone>
            <DialogTitle>Confirmer la décision implicite</DialogTitle>
            <DialogDescription>
              {implicite?.calcul.decision_implicite?.motif} Le système date la décision du {implicite?.calcul.decision_implicite ? dateCourte(`${implicite.calcul.decision_implicite.date}T12:00:00`) : ""} ; elle ne se saisit pas à la main.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <Avis teinte="ambre">
              <strong>Avant de confirmer</strong>, vérifiez qu&apos;aucun arrêté ni aucune lettre de la mairie n&apos;est arrivé pendant le délai. Si un arrêté est arrivé, saisissez-le depuis le permis.{" "}
              {implicite?.calcul.decision_implicite?.nature === "tacite" ? "Vous pourrez demander un certificat de permis tacite à la mairie (art. R*424-13)." : ""}
            </Avis>
            {erreur ? (
              <div style={{ marginTop: 10 }}>
                <Avis teinte="rouge" role="alert">
                  {erreur}
                </Avis>
              </div>
            ) : null}
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={gris} onClick={soumettreImplicite}>
              {envoi ? <Loader variant="spin" /> : null} Confirmer
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
