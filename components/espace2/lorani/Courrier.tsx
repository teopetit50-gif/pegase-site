"use client";

/* ══════════════════════════════════════════════════════════════════════
   LORANI « Courrier à ranger » (refait le 02/11/2026)

   L'Inbox de Linear, au 1:1 : relevé docs/refonte-metiers/releves/
   linear-inbox.md (01/11), styles dans ./lor-inbox.css (préfixe lor-ib-),
   jetons dans ./lor.css. Une notification de Linear = un courrier qui
   attend un membre, tous permis confondus :

     · les dates lues sur un courrier et rattachées à un permis (B10) et
       les décisions implicites nées du silence de la mairie (B9) :
       « à confirmer » (statut Triage) ;
     · les dates lues sans permis (« Permis à choisir », O8) et les
       courriers que le lecteur n'a pas reconnus, n'a pas pu lire, ou dont
       la lecture est à vérifier sans date sortie (B17) : « à ranger ».
   Non lu = à traiter ; les dates déjà confirmées ou écartées sont les
   notifications lues (bouton d'archives, ou Affichage). Le filtre (À
   confirmer, À ranger, Tous) est dans l'adresse (?onglet=), le courrier
   ouvert aussi (?choix=) : il s'ouvre à droite, comme un ticket dans
   l'Inbox, avec Confirmer / Écarter à la place d'Accept / Decline.

   Les gestes sont ceux de l'écran du permis (PermisVue), mêmes portes :
   F7 (confirmer, valeurs corrigeables, permis visé) → confirmerDateLue ;
   F8 (écarter, motif obligatoire) → ecarterDateLue ; F9 (décision
   implicite) → confirmerDecisionImplicite. Un courrier non reconnu se
   saisit à la main sur la page du permis ; « … » mène au dépôt d'un
   courrier sur un projet (B19).

   Ce que le dossier ne contient pas n'est pas montré : les courriels du
   guichet à ranger (E10, E11), le sursis à statuer (E4) et les situations
   lues à ranger (E18) ne sont lus nulle part par chargerDossier.
   ══════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Gavel, XCircle } from "lucide-react";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import { Avis } from "@/components/espace/ui";
import { dateCourte } from "@/components/espace/format";
import { DECISIONS, NATURES_DATE_LUE, TYPES, TYPES_CONTROLE, libelleTypePiece, prochaineDate, titrePermis } from "@/components/espace/lorani/etats";
import { confirmerDateLue, confirmerDecisionImplicite, ecarterDateLue } from "@/components/espace/lorani/portes";
import type { DateLue, Dossier, NatureDateLue, Permis, PieceProjet, Projet } from "@/components/espace/lorani/types";
import { RACINE } from "../modules";
import { useToast } from "../Toasts";
import { useLorani } from "./donnees";
import { chargerBoite, marquerReception, type Reception } from "@/components/espace/filed/receptions";
import { useMarques, useReports } from "./lor-local";
import { BoutonReporter } from "./lor-selection";
import { IconeAffichage, IconeArchive, IconeCalendrierLor, IconeFiltre, IconeLin, IconePoints, IconePrioriteLor, IconeSansResponsable, IconeSprite, IconeStatutTicket, type StatutTicket } from "./lor-icones";
import type { NomIcone } from "./lor-sprite";
import "@/components/espace/espace.css";
import "./lor.css";
import "./lor-inbox.css";

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

const initiales = (nom: string) =>
  nom
    .split(/\s+/)
    .filter((x) => /\p{L}/u.test(x))
    .slice(0, 2)
    .map((x) => x[0])
    .join("");

/* l'avatar d'une ligne : l'icône du sprite de Linear selon la nature de la date lue */
const ICONE_NATURE: Record<NatureDateLue, NomIcone> = {
  depot: "Calendar",
  delai_notifie: "Hourglass",
  demande_pieces: "Page",
  decision: "Judge",
  decision_tacite: "Judge",
  affichage: "Sign",
};
type Vue = { id: string; titre: string; sous: string; icone: NomIcone; statut: StatutTicket; libelleStatut: string };

/* « il y a 46 min », « 4 j » : l'heure relative de l'Inbox (« 46min », « 4d ») */
function depuis(iso: string): string {
  if (!iso) return "";
  const t = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? Date.parse(`${iso}T12:00:00`) : Date.parse(iso);
  const s = Math.max(0, (Date.now() - t) / 1000);
  if (s < 60) return "à l'instant";
  if (s < 3600) return `${Math.floor(s / 60)} min`;
  if (s < 86_400) return `${Math.floor(s / 3600)} h`;
  if (s < 30 * 86_400) return `${Math.floor(s / 86_400)} j`;
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(new Date(t));
}

/* les courriels du guichet de l'exemple (fictifs, adresses en example.com) : un sans dossier reconnu (E10), un sans pièce jointe (E11) */
/* une date d'exemple stable entre le serveur et le navigateur : le jour J − j, à une heure fixe (pas la milliseconde) */
const ilYa = (j: number, h = 0) => {
  const d = new Date();
  d.setHours(9 - h, 0, 0, 0);
  d.setDate(d.getDate() - j);
  return d.toISOString();
};
const GUICHET_EXEMPLE: Reception[] = [
  { id: -1, entite_id: null, module: "lorani", canal: "email", boite: "lorani@example.com", identifiant_externe: "exemple-1", de_adresse: "urbanisme@mairie-nantes.example.com", de_nom: "Service urbanisme", sujet: "Votre demande — pièces complémentaires", corps: "Madame, Monsieur,\n\nVotre dossier déposé le 2 octobre est incomplet. Merci de nous adresser les pièces PC6 et PC7 sous trois mois.\n\nLe service urbanisme", pieces: [], detail: {}, statut: "nouvelle", recu_le: ilYa(1, 3) },
  { id: -2, entite_id: null, module: "lorani", canal: "email", boite: "lorani@example.com", identifiant_externe: "exemple-2", de_adresse: "guichet@vaulx-en-velin.example.com", de_nom: "Guichet unique", sujet: "PC 069 256 26 V0011 — accusé de réception de vos pièces", corps: "Nous accusons réception des pièces complémentaires de votre dossier PC 069 256 26 V0011. L'instruction reprend à cette date.", pieces: [], detail: {}, statut: "nouvelle", recu_le: ilYa(0, 5) },
];

/* un menu de Linear qui se ferme au clic dehors et sur Échap */
function useMenu() {
  const [ouvert, setOuvert] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ouvert) return;
    const dehors = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOuvert(false);
    };
    const echap = (e: KeyboardEvent) => e.key === "Escape" && setOuvert(false);
    document.addEventListener("mousedown", dehors);
    document.addEventListener("keydown", echap);
    return () => {
      document.removeEventListener("mousedown", dehors);
      document.removeEventListener("keydown", echap);
    };
  }, [ouvert]);
  return [ouvert, setOuvert, ref] as const;
}

type Form = { type: "confirmer"; date: DateLue } | { type: "ecarter"; date: DateLue } | { type: "implicite"; permis: Permis } | null;

export default function Courrier() {
  const { source, pret, erreur: erreurLecture, dossier, peutEcrire, agir, nommer } = useLorani();
  const params = useSearchParams();
  const toast = useToast();
  const [ouvertPoints, setOuvertPoints, menuPointsRef] = useMenu();
  const [ouvertFiltre, setOuvertFiltre, menuFiltreRef] = useMenu();
  const [ouvertAff, setOuvertAff, menuAffRef] = useMenu();
  const [ouvertDeposer, setOuvertDeposer, menuDeposerRef] = useMenu();
  const suivis = useMarques("suivis");
  const reports = useReports();
  /* les courriels du guichet à ranger (b5_11 : E10 sans dossier reconnu, E11 sans pièce jointe) : la boîte de réception,
     lue par la porte du module FILED (chargerBoite, toutes les boîtes) et filtrée sur Lorani ; marquerReception pour les ranger */
  const [guichetReel, setGuichetReel] = useState<Reception[] | null>(null);
  const [guichetLocal, setGuichetLocal] = useState<Reception[]>(GUICHET_EXEMPLE);
  const [aEcarter, setAEcarter] = useState<Reception | null>(null);
  useEffect(() => {
    if (source !== "reelle") return;
    let vivant = true;
    chargerBoite("toutes")
      .then((v) => vivant && setGuichetReel(v.receptions.filter((r) => r.module === "lorani" && r.canal === "email")))
      .catch(() => vivant && setGuichetReel([]));
    return () => {
      vivant = false;
    };
  }, [source]);
  const guichet = (source === "reelle" ? (guichetReel ?? []) : guichetLocal).filter((r) => r.statut === "nouvelle" || r.statut === "lue");
  const ranger = async (r: Reception, statut: "lue" | "ecartee") => {
    try {
      if (source === "reelle") {
        const nouveau = await marquerReception(r.id, statut);
        setGuichetReel((l) => (l ?? []).map((x) => (x.id === r.id ? { ...x, statut: nouveau } : x)));
      } else {
        setGuichetLocal((l) => l.map((x) => (x.id === r.id ? { ...x, statut: statut === "lue" ? "lue" : "ignoree" } : x)));
      }
      toast(statut === "lue" ? "Courriel marqué lu." : "Courriel écarté : il quitte le courrier à ranger.", "vert");
    } catch (e) {
      toast(e instanceof Error ? e.message : "La base n'a pas répondu.", "rouge");
    }
  };
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
      /* une situation de travaux lue mais pas rangée (b5_14, E18) se saisit sur le chantier du projet (F25) */
      const situation = x.type_piece === "lorani_situation_travaux";
      n.push({ cle: `p:${x.id}`, onglet: "a-ranger", projet, permis: null, piece: x, quand: x.cree_le ?? "", lien: situation ? `${RACINE}/lorani/projets/${encodeURIComponent(projet.id)}?partie=chantier` : lienDuProjet(projet.id) });
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

  /* ——— une ligne : le titre, sa sous-ligne, son statut ——— */
  const titreImplicite = (p: Permis) => {
    const impl = p.calcul.decision_implicite!;
    const dp = p.type_autorisation === "dp";
    return `${impl.nature === "tacite" ? (dp ? "Non-opposition tacite née" : "Permis tacite né") : dp ? "Opposition tacite" : "Rejet implicite"} le ${dateCourte(`${impl.date}T12:00:00`)}`;
  };
  const vue = (e: Element): Vue => {
    const id = e.permis ? (e.permis.numero ?? TYPES[e.permis.type_autorisation].court) : e.piece ? (e.piece.source === "courriel" ? "Guichet" : "Dépôt") : "Projet";
    if (e.date) {
      const d = e.date;
      const nature = NATURES_DATE_LUE[d.nature];
      return {
        id,
        titre: `${nature.libelle} : ${valeursEnClair(d.nature, d.proposition) || "valeur à saisir"}`,
        sous: e.permis ? `Lue sur le ${nature.piece}, à confirmer` : "Lue sur un courrier, permis à choisir",
        icone: ICONE_NATURE[d.nature],
        statut: e.permis ? "triage" : "backlog",
        libelleStatut: e.permis ? "À confirmer" : "À ranger : permis à choisir",
      };
    }
    if (e.implicite) return { id, titre: titreImplicite(e.implicite), sous: "Le silence de la mairie vaut décision, à confirmer", icone: "AlarmClock", statut: "triage", libelleStatut: "À confirmer" };
    const x = e.piece!;
    if (x.type_piece === "lorani_situation_travaux")
      return {
        id: "Situation",
        titre: `Situation de travaux à ranger : ${x.nom_fichier}`,
        sous: x.motif ? `« ${x.motif} »` : "Marché non reconnu ou cumul illisible : saisissez-la sur le chantier",
        icone: "Spreadsheet",
        statut: "backlog",
        libelleStatut: "Situation à ranger",
      };
    return {
      id,
      titre: `${x.statut === "echec" ? "Courrier illisible" : x.statut === "a_verifier" ? "Lecture à vérifier" : "Courrier non reconnu"} : ${x.nom_fichier}`,
      sous: x.motif ? `« ${x.motif} »` : "Aucune date n'en est proposée : saisissez-la à la main",
      icone: "PdfFile",
      statut: x.statut === "echec" ? "annule" : x.statut === "a_verifier" ? "encours" : "backlog",
      libelleStatut: x.statut === "echec" ? "Illisible" : x.statut === "a_verifier" ? "Lecture à vérifier" : "À ranger",
    };
  };
  /* l'urgence d'une ligne : celle de la prochaine date de son permis (l'icône de priorité de Linear) */
  const auj = new Date().toISOString().slice(0, 10);
  const urgence = (p: Permis | null): 0 | 1 | 2 => {
    const pd = p ? prochaineDate(p) : null;
    if (!pd) return 0;
    const j = Math.round((Date.parse(`${pd}T12:00:00Z`) - Date.parse(`${auj}T12:00:00Z`)) / 86_400_000);
    return j < 0 ? 1 : j <= 7 ? 2 : 0;
  };

  /* ce qui est déjà traité : les dates lues confirmées ou écartées, les plus récentes (les notifications lues) */
  const traites = dossier.datesLues
    .filter((d) => d.statut !== "proposee")
    .sort((a, b) => (b.decide_le ?? b.maj_le).localeCompare(a.decide_le ?? a.maj_le))
    .slice(0, 12)
    .map((d) => ({ d, projet: dossier.projets.find((p) => p.id === d.projet_id), permis: d.permis_id ? (dossier.permis.find((p) => p.id === d.permis_id) ?? null) : null }))
    .filter((t): t is { d: DateLue; projet: Projet; permis: Permis | null } => !!t.projet);

  /* 02/11 : la cloche (Suivre) d'un permis ou d'un projet fait passer ses courriers en tête, marqués « suivi » ;
     Snooze (Reporter) retire un courrier de la liste jusqu'à sa date — ./lor-local.ts */
  const suiviDe = (e: Element) => suivis.a(`projet:${e.projet.id}`) || (!!e.permis && suivis.a(`permis:${e.permis.id}`));
  const toutes = groupes.flatMap((g) => g.lignes);
  const voirReportes = params.get("reportes") === "1";
  const nombreReportes = toutes.filter((e) => reports.jusqua(`courrier:${e.cle}`)).length;
  const visibles = toutes
    .filter((e) => voirReportes || !reports.jusqua(`courrier:${e.cle}`))
    .sort((a, b) => Number(suiviDe(b)) - Number(suiviDe(a)) || b.quand.localeCompare(a.quand));
  const choix = params.get("choix");
  const choisi = visibles.find((e) => e.cle === choix) ?? null;
  const traiteChoisi = choix?.startsWith("t:") ? (traites.find((t) => `t:${t.d.id}` === choix) ?? null) : null;
  const lienChoix = (cle: string | null) => {
    const q = new URLSearchParams(params.toString());
    if (cle) q.set("choix", cle);
    else q.delete("choix");
    const s = q.toString();
    return s ? `${CHEMIN}?${s}` : CHEMIN;
  };
  const lienFiltre = (cle: CleOnglet) => {
    const q = new URLSearchParams(params.toString());
    if (cle === "a-confirmer") q.delete("onglet");
    else q.set("onglet", cle);
    q.delete("choix");
    const s = q.toString();
    return s ? `${CHEMIN}?${s}` : CHEMIN;
  };
  const voirTraites = params.get("traites") === "1";
  const lienTraites = () => {
    const q = new URLSearchParams(params.toString());
    if (voirTraites) q.delete("traites");
    else q.set("traites", "1");
    const s = q.toString();
    return s ? `${CHEMIN}?${s}` : CHEMIN;
  };

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

  /* ——— le courrier ouvert, à droite : la page d'un ticket, sans sa colonne de propriétés ——— */
  const detail = (() => {
    if (traiteChoisi) {
      const { d, projet, permis } = traiteChoisi;
      const nature = NATURES_DATE_LUE[d.nature];
      const piece = dossier.pieces.find((x) => x.id === d.piece_id);
      return {
        id: permis?.numero ?? (permis ? TYPES[permis.type_autorisation].court : "Projet"),
        titre: `${nature.libelle} : ${valeursEnClair(d.nature, d.confirme ?? d.proposition) || "—"}`,
        lien: permis ? lienPermis(permis.id) : lienProjet(projet.id),
        pilules: [
          { cle: "statut", icone: <IconeStatutTicket statut={d.statut === "confirmee" ? "fait" : "annule"} />, texte: d.statut === "confirmee" ? "Confirmée" : "Écartée" },
          { cle: "qui", icone: <IconeSprite nom="Creator" />, texte: nommer(d.decide_par) },
          { cle: "projet", icone: <IconeSprite nom="Project" />, texte: projet.nom, href: lienProjet(projet.id) },
          ...(permis ? [{ cle: "permis", icone: <IconeSprite nom="Page" />, texte: titrePermis(permis, projet.nom), href: lienPermis(permis.id) }] : []),
        ],
        corps: (
          <>
            <p>
              Lue sur le {nature.piece}
              {piece ? ` (${piece.nom_fichier})` : ""}, {d.statut === "confirmee" ? "confirmée" : "écartée"} par {nommer(d.decide_par)}
              {d.decide_le ? ` le ${dateCourte(d.decide_le)}` : ""}.{d.motif ? ` Motif : « ${d.motif} ».` : ""}
            </p>
            {d.citations.filter((c) => c.texte).slice(0, 3).map((c, i) => (
              <p key={i} className="lor-ib-citation">
                « {c.texte} »{c.page ? ` (p. ${c.page})` : ""}
              </p>
            ))}
          </>
        ),
        gestes: null as React.ReactNode,
      };
    }
    const g = choix?.startsWith("g:") ? guichet.find((r) => `g:${r.id}` === choix) : undefined;
    if (g) {
      const projetsChoix = dossier.projets;
      return {
        id: "Guichet",
        titre: g.sujet?.trim() || "Courriel sans objet",
        lien: CHEMIN,
        pilules: [
          { cle: "statut", icone: <IconeStatutTicket statut={g.statut === "lue" ? "encours" : "backlog"} />, texte: g.statut === "lue" ? "Lu, à ranger" : "À ranger" },
          { cle: "de", icone: <IconeSprite nom="Email" />, texte: g.de_nom ? `${g.de_nom} · ${g.de_adresse ?? ""}` : (g.de_adresse ?? "Expéditeur inconnu") },
          { cle: "recu", icone: <IconeCalendrierLor />, texte: `Reçu le ${dateCourte(g.recu_le)}` },
          ...(g.pieces.length ? [{ cle: "pj", icone: <IconeSprite nom="Attachment" />, texte: `${g.pieces.length} pièce${g.pieces.length > 1 ? "s" : ""} jointe${g.pieces.length > 1 ? "s" : ""}` }] : []),
        ] as { cle: string; icone: React.ReactNode; texte: string; href?: string }[],
        corps: (
          <>
            <p>Courriel du guichet que Lorani n&apos;a pas rangé : il ne cite aucun numéro de dossier connu, en cite plusieurs, ou n&apos;a pas de pièce jointe à lire. Lisez-le, puis déposez sa pièce sur le bon projet, ou écartez-le.</p>
            {g.corps ? <p className="lor-ib-citation lor-ib-corps">{g.corps.slice(0, 1600)}</p> : null}
            {g.pieces.length ? <p className="lor-ib-sourd">Pièces : {g.pieces.map((x) => x.nom).join(", ")}</p> : null}
          </>
        ),
        gestes: peutEcrire ? (
          <>
            <div className="lor-ib-ancre" ref={menuDeposerRef}>
              <button type="button" className="lor-texte-btn lor-ib-texte" aria-expanded={ouvertDeposer} onClick={() => setOuvertDeposer((o) => !o)} title="Déposer la pièce sur un projet">
                <IconeLin nom="accepter" />
                <span>Déposer sur un projet</span>
              </button>
              {ouvertDeposer ? (
                <div className="lor-menu lor-ib-menu" role="menu" style={{ right: 0, top: 34 }}>
                  <div className="lor-menu-liste">
                    {projetsChoix.map((p) => (
                      <Link key={p.id} role="menuitem" href={`${lienProjet(p.id)}&deposer=1`} className="lor-option" onClick={() => { setOuvertDeposer(false); void ranger(g, "lue"); }}>
                        <span className="lor-option-libelle">{p.nom}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
            <button type="button" className="lor-texte-btn lor-ib-texte" onClick={() => setAEcarter(g)} title="Écarter ce courriel">
              <IconeLin nom="refuser" />
              <span>Écarter</span>
            </button>
          </>
        ) : null,
      };
    }
    if (!choisi) return null;
    const v = vue(choisi);
    const nomPermis = choisi.permis ? titrePermis(choisi.permis, choisi.projet.nom) : null;
    const chef = dossier.membres.find((m) => m.projet_id === choisi.projet.id && m.role_projet === "chef_projet");
    const pilules: { cle: string; icone: React.ReactNode; texte: string; href?: string }[] = [
      { cle: "statut", icone: <IconeStatutTicket statut={v.statut} />, texte: v.libelleStatut },
      { cle: "chef", icone: chef ? <span className="lor-ib-avatar-petit">{initiales(nommer(chef.user_id))}</span> : <IconeSansResponsable />, texte: chef ? nommer(chef.user_id) : "Aucun chef de projet" },
      { cle: "projet", icone: <IconeSprite nom="Project" />, texte: choisi.projet.nom, href: lienProjet(choisi.projet.id) },
      ...(nomPermis && choisi.permis ? [{ cle: "permis", icone: <IconeSprite nom="Page" />, texte: nomPermis, href: lienPermis(choisi.permis.id) }] : []),
    ];
    let corps: React.ReactNode = null;
    let gestes: React.ReactNode = null;
    if (choisi.date) {
      const d = choisi.date;
      const nature = NATURES_DATE_LUE[d.nature];
      const piece = dossier.pieces.find((x) => x.id === d.piece_id);
      pilules.push({ cle: "lu", icone: <IconeCalendrierLor />, texte: `Lu le ${dateCourte(d.cree_le)}` });
      corps = (
        <>
          <p>
            {nature.libelle} lue sur le {nature.piece}
            {piece ? ` (${piece.nom_fichier})` : ""} : {valeursEnClair(d.nature, d.proposition) || "valeur à saisir"}.{" "}
            {d.verifiee ? "La citation a été retrouvée sur le courrier." : "La citation n'a pas été retrouvée sur le courrier : vérifiez avant de confirmer."}
            {choisi.permis ? "" : " Aucun permis n'a été reconnu sur ce courrier : choisissez-le en confirmant."}
          </p>
          {d.citations.filter((c) => c.texte).slice(0, 3).map((c, i) => (
            <p key={i} className="lor-ib-citation">
              « {c.texte} »{c.page ? ` (p. ${c.page})` : ""}
            </p>
          ))}
          <p className="lor-ib-sourd">Confirmée, la valeur est recalculée dans le calendrier du permis ; écartée, le permis n&apos;en garde rien et le motif reste au journal.</p>
        </>
      );
      gestes = peutEcrire ? (
        <>
          <button type="button" className="lor-texte-btn lor-ib-texte" disabled={gris} onClick={() => ouvrirConfirmation(d)} title="Confirmer cette date">
            <IconeLin nom="accepter" />
            <span>Confirmer</span>
          </button>
          <button type="button" className="lor-texte-btn lor-ib-texte" disabled={gris} onClick={() => ouvrirEcart(d)} title="Écarter cette lecture">
            <IconeLin nom="refuser" />
            <span>Écarter</span>
          </button>
        </>
      ) : null;
    } else if (choisi.implicite) {
      const p = choisi.implicite;
      corps = (
        <>
          <p>{p.calcul.decision_implicite!.motif}</p>
          <p className="lor-ib-sourd">Si aucune décision ne vous a été notifiée, confirmez-la : le permis est accordé ou rejeté à cette date. Si un arrêté est arrivé, saisissez-le sur la page du permis.</p>
        </>
      );
      gestes = peutEcrire ? (
        <>
          <button
            type="button"
            className="lor-texte-btn lor-ib-texte"
            disabled={gris}
            onClick={() => {
              setErreur(null);
              setForm({ type: "implicite", permis: p });
            }}
            title="Confirmer la décision implicite"
          >
            <IconeLin nom="accepter" />
            <span>Confirmer</span>
          </button>
          <Link href={lienPermis(p.id)} className="lor-texte-btn lor-ib-texte" title="Saisir la décision reçue sur la page du permis">
            <IconeLin nom="refuser" />
            <span>Saisir la décision</span>
          </Link>
        </>
      ) : null;
    } else if (choisi.piece && choisi.piece.type_piece === "lorani_situation_travaux") {
      const x = choisi.piece;
      pilules.push({ cle: "recu", icone: <IconeCalendrierLor />, texte: x.cree_le ? `${x.source === "courriel" ? "Reçue" : "Déposée"} le ${dateCourte(x.cree_le)}` : "Sans date" });
      corps = (
        <p>
          Situation de travaux lue sur {x.nom_fichier}
          {x.source === "courriel" ? ", reçue par courriel" : ""}, mais pas rangée : le marché n&apos;a pas été reconnu, ou le cumul n&apos;a pas pu être lu.{x.motif ? ` Le lecteur dit : « ${x.motif} ».` : ""} Saisissez-la sur le chantier du projet (« Situation reçue ») : elle prend alors sa place dans le contrôle des cumuls et le visa.
        </p>
      );
      gestes = (
        <Link href={choisi.lien} className="lor-texte-btn lor-ib-texte" title="Saisir la situation sur le chantier du projet">
          <IconeLin nom="accepter" />
          <span>Saisir la situation</span>
        </Link>
      );
    } else if (choisi.piece) {
      const x = choisi.piece;
      pilules.push({ cle: "recu", icone: <IconeCalendrierLor />, texte: x.cree_le ? `${x.source === "courriel" ? "Reçu" : "Déposé"} le ${dateCourte(x.cree_le)}` : "Sans date" });
      corps = (
        <>
          <p>
            {x.nom_fichier} ({libelleTypePiece(x.type_piece).toLowerCase()}){x.source === "courriel" ? ", reçu par courriel du guichet" : ", déposé dans le dossier"}.{x.motif ? ` Le lecteur dit : « ${x.motif} ».` : ""} Aucune date n&apos;en est proposée : saisissez-la à la main sur la page du permis.
          </p>
        </>
      );
      gestes = (
        <Link href={choisi.lien} className="lor-texte-btn lor-ib-texte" title="Saisir à la main sur la page du permis ou du projet">
          <IconeLin nom="accepter" />
          <span>Saisir à la main</span>
        </Link>
      );
    }
    return { id: v.id, titre: v.titre, lien: choisi.lien, pilules, corps, gestes };
  })();

  const ligne = (e: Element) => {
    const v = vue(e);
    const u = urgence(e.permis);
    return (
      <li key={e.cle}>
        <Link href={lienChoix(e.cle)} scroll={false} className="lor-ib-ligne" data-choisie={choix === e.cle ? "" : undefined} aria-current={choix === e.cle ? "true" : undefined}>
          <span className="lor-ib-avatar" aria-hidden="true">
            <IconeSprite nom={v.icone} />
          </span>
          <span className="lor-ib-textes">
            <span className="lor-ib-l1">
              <span className="lor-ib-point" aria-label="À traiter" />
              {suiviDe(e) ? <span className="lor-marque" title="Permis ou projet suivi (la cloche de sa page)">suivi</span> : null}
              <span className="lor-ib-id">{v.id}</span>
              <span className="lor-ib-titre">{v.titre}</span>
              <IconeStatutTicket statut={v.statut} titre={v.libelleStatut} />
            </span>
            <span className="lor-ib-l2">
              <span className="lor-ib-sous">{v.sous}</span>
              {u ? <IconePrioriteLor niveau={u} titre={u === 1 ? "Date du permis passée" : "Date du permis dans la semaine"} /> : null}
              <time className="lor-ib-quand" dateTime={e.quand} title={e.quand ? dateCourte(e.quand.length <= 10 ? `${e.quand}T12:00:00` : e.quand) : undefined}>
                {depuis(e.quand)}
              </time>
            </span>
          </span>
        </Link>
      </li>
    );
  };

  return (
    <div className="lor lor-ib" data-ouvert={detail ? "" : undefined}>
      <h1 className="v2-sr">Courrier à ranger</h1>
      <section className="lor-ib-liste" aria-label="Courrier à ranger">
        <header className="lor-ib-tete">
          <div className="lor-ib-tete-gauche">
            <h2>Courrier</h2>
            <div className="lor-ib-ancre" ref={menuPointsRef}>
              <button type="button" className="lor-rond" aria-label="Options du courrier" title="Options du courrier" aria-expanded={ouvertPoints} onClick={() => setOuvertPoints((o) => !o)}>
                <IconePoints />
              </button>
              {ouvertPoints ? (
                <div className="lor-menu lor-ib-menu" role="menu" aria-label="Options du courrier" style={{ left: 0, top: 34 }}>
                  <div className="lor-menu-liste">
                    {dossier.projets.map((p) => (
                      <Link key={p.id} role="menuitem" href={`${lienProjet(p.id)}&deposer=1`} className="lor-option" onClick={() => setOuvertPoints(false)}>
                        <IconeSprite nom="Attachment" />
                        <span className="lor-option-libelle">Déposer un courrier sur {p.nom}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
          <div className="lor-ib-tete-droite">
            <Link href={lienTraites()} scroll={false} className="lor-rond" aria-pressed={voirTraites} aria-label={voirTraites ? "Masquer les courriers traités" : "Afficher les courriers traités"} title={voirTraites ? "Masquer les courriers traités" : "Afficher les courriers traités"}>
              <IconeArchive />
            </Link>
            <div className="lor-ib-ancre" ref={menuFiltreRef}>
              <button type="button" className="lor-rond" aria-label="Filtrer" title="Filtrer" aria-expanded={ouvertFiltre} onClick={() => setOuvertFiltre((o) => !o)}>
                <IconeFiltre />
              </button>
              {ouvertFiltre ? (
                <div className="lor-menu lor-ib-menu" role="menu" aria-label="Filtrer" style={{ right: 0, top: 34 }}>
                  <div className="lor-menu-liste">
                    {ONGLETS.map((x) => (
                      <Link key={x.cle} role="menuitemradio" aria-checked={onglet === x.cle} href={lienFiltre(x.cle)} scroll={false} className="lor-option" data-actif={onglet === x.cle ? "" : undefined} onClick={() => setOuvertFiltre(false)}>
                        <span className="lor-option-libelle">{x.libelle}</span>
                        <span className="lor-option-droite">{comptes[x.cle]}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
            <div className="lor-ib-ancre" ref={menuAffRef}>
              <button type="button" className="lor-rond" aria-label="Affichage" title="Affichage" aria-expanded={ouvertAff} onClick={() => setOuvertAff((o) => !o)}>
                <IconeAffichage />
              </button>
              {ouvertAff ? (
                <div className="lor-menu lor-ib-menu" role="dialog" aria-label="Affichage" style={{ right: 0, top: 34 }}>
                  <div className="lor-menu-liste">
                    <Link href={lienTraites()} scroll={false} className="lor-option" onClick={() => setOuvertAff(false)}>
                      <span className="lor-option-libelle">{voirTraites ? "Masquer les courriers traités" : "Afficher les courriers traités"}</span>
                    </Link>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </header>
        {!peutEcrire && pret ? <p className="lor-ib-note">Lecture seule : vous voyez le courrier sans pouvoir le traiter.</p> : null}
        {chargement ? (
          <p className="lor-ib-note" role="status">
            Lecture du dossier…
          </p>
        ) : erreurLecture ? (
          <p className="lor-ib-note" role="alert">
            Le dossier n&apos;a pas pu être lu. {erreurLecture}
          </p>
        ) : (
          <ul className="lor-ib-lignes">
            {visibles.map(ligne)}
            {voirTraites
              ? traites.map((t) => {
                  const nature = NATURES_DATE_LUE[t.d.nature];
                  const cle = `t:${t.d.id}`;
                  return (
                    <li key={cle}>
                      <Link href={lienChoix(cle)} scroll={false} className="lor-ib-ligne" data-lu="" data-choisie={choix === cle ? "" : undefined}>
                        <span className="lor-ib-avatar" aria-hidden="true">
                          <IconeSprite nom={ICONE_NATURE[t.d.nature]} />
                        </span>
                        <span className="lor-ib-textes">
                          <span className="lor-ib-l1">
                            <span className="lor-ib-id">{t.permis?.numero ?? (t.permis ? TYPES[t.permis.type_autorisation].court : "Projet")}</span>
                            <span className="lor-ib-titre">
                              {nature.libelle} : {valeursEnClair(t.d.nature, t.d.confirme ?? t.d.proposition) || "—"}
                            </span>
                            <IconeStatutTicket statut={t.d.statut === "confirmee" ? "fait" : "annule"} titre={t.d.statut === "confirmee" ? "Confirmée" : "Écartée"} />
                          </span>
                          <span className="lor-ib-l2">
                            <span className="lor-ib-sous">
                              {t.d.statut === "confirmee" ? "Confirmée" : "Écartée"} par {nommer(t.d.decide_par)}
                            </span>
                            <time className="lor-ib-quand">{depuis(t.d.decide_le ?? t.d.maj_le)}</time>
                          </span>
                        </span>
                      </Link>
                    </li>
                  );
                })
              : null}
            {guichet.length && onglet !== "a-confirmer" ? (
              <>
                <li className="lor-groupe-epingles" aria-hidden="true">
                  Courriels du guichet · {guichet.length}
                </li>
                {guichet.map((r) => (
                  <li key={`g:${r.id}`}>
                    <Link href={lienChoix(`g:${r.id}`)} scroll={false} className="lor-ib-ligne" data-choisie={choix === `g:${r.id}` ? "" : undefined} data-lu={r.statut === "lue" ? "" : undefined}>
                      <span className="lor-ib-avatar" aria-hidden="true">
                        <IconeSprite nom="Email" />
                      </span>
                      <span className="lor-ib-textes">
                        <span className="lor-ib-l1">
                          {r.statut === "nouvelle" ? <span className="lor-ib-point" aria-label="Non lu" /> : null}
                          <span className="lor-ib-id">Guichet</span>
                          <span className="lor-ib-titre">{r.sujet?.trim() || "Courriel sans objet"}</span>
                          <IconeStatutTicket statut={r.statut === "lue" ? "encours" : "backlog"} titre="À ranger" />
                        </span>
                        <span className="lor-ib-l2">
                          <span className="lor-ib-sous">{r.de_nom ?? r.de_adresse ?? "Expéditeur inconnu"}{r.pieces.length ? "" : " · sans pièce jointe"}</span>
                          <time className="lor-ib-quand" dateTime={r.recu_le}>{depuis(r.recu_le)}</time>
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </>
            ) : null}
            {nombreReportes ? (
              <li className="lor-ib-note">
                <Link href={`${CHEMIN}?${new URLSearchParams({ ...Object.fromEntries(params.entries()), reportes: voirReportes ? "0" : "1" }).toString()}`} scroll={false}>
                  {voirReportes ? `Masquer les ${nombreReportes} reportés` : `${nombreReportes} reporté${nombreReportes > 1 ? "s" : ""} jusqu'à une date : les afficher`}
                </Link>
              </li>
            ) : null}
            {!visibles.length && !voirTraites ? (
              <li className="lor-ib-note">
                {vide.titre}. {vide.aide}
              </li>
            ) : null}
          </ul>
        )}
      </section>

      <section className="lor-ib-droite" aria-label={detail ? "Courrier ouvert" : "Aucun courrier ouvert"}>
        {detail ? (
          <>
            <header className="lor-ib-d-tete">
              <div className="lor-ib-d-fil">
                <Link href={lienChoix(null)} scroll={false} className="lor-rond lor-ib-retour" aria-label="Revenir à la liste" title="Revenir à la liste">
                  <IconeLin nom="chevronBas" className="lor-ib-retour-icone" />
                </Link>
                <Link href={detail.lien} className="lor-ib-d-courant">
                  <h2>
                    <span className="lor-ib-d-id">{detail.id}</span>
                    {detail.titre}
                  </h2>
                </Link>
              </div>
              <div className="lor-ib-d-gestes">
                {choisi ? (
                  <>
                    <button
                      type="button"
                      className="lor-rond"
                      aria-pressed={suiviDe(choisi)}
                      aria-label={suiviDe(choisi) ? "Ne plus suivre" : "Suivre"}
                      title={suiviDe(choisi) ? `Ne plus suivre ${choisi.permis ? "ce permis" : "ce projet"}` : `Suivre ${choisi.permis ? "ce permis" : "ce projet"} : ses courriers passent en tête, marqués « suivi » (gardé dans ce navigateur)`}
                      onClick={() => suivis.basculer(choisi.permis ? `permis:${choisi.permis.id}` : `projet:${choisi.projet.id}`)}
                    >
                      <IconeSprite nom="Subscribe" />
                    </button>
                    <BoutonReporter cle={`courrier:${choisi.cle}`} nom="ce courrier">
                      <IconeSprite nom="ClockOutline" />
                    </BoutonReporter>
                  </>
                ) : null}
                {detail.gestes}
              </div>
            </header>
            <div className="lor-ib-d-corps">
              <h2 className="lor-ib-d-titre">{detail.titre}</h2>
              <div className="lor-ib-d-pilules">
                {detail.pilules.map((x) =>
                  x.href ? (
                    <Link key={x.cle} href={x.href} className="lor-ib-pilule">
                      {x.icone}
                      <span>{x.texte}</span>
                    </Link>
                  ) : (
                    <span key={x.cle} className="lor-ib-pilule">
                      {x.icone}
                      <span>{x.texte}</span>
                    </span>
                  ),
                )}
              </div>
              <div className="lor-ib-d-texte">{detail.corps}</div>
            </div>
          </>
        ) : (
          <div className="lor-ib-vide">
            <svg viewBox="0 0 78 80" fill="none" width="105" height="100" aria-hidden="true">
              <path stroke="var(--lor-t3)" strokeWidth="1.5" d="M10.4 9.11A10 10 0 0 1 20.22 1h37.56a10 10 0 0 1 9.82 8.11l8.11 42.2a10 10 0 0 1-9.82 11.9H54.7a6.36 6.36 0 0 0-5.65 3.45 6.36 6.36 0 0 1-5.66 3.45H34.6a6.36 6.36 0 0 1-5.66-3.45 6.36 6.36 0 0 0-5.65-3.46H12.1a10 10 0 0 1-9.8-11.89l8.11-42.2Z" />
              <path stroke="var(--lor-t2)" strokeWidth="1.5" d="M14.3 9.03a5 5 0 0 1 4.91-4.08H58.8a5 5 0 0 1 4.91 4.08l8.07 43.22a6 6 0 0 1-5.9 7.1H52.76a5.72 5.72 0 0 0-5.24 3.41 5.72 5.72 0 0 1-5.23 3.42h-6.58a5.72 5.72 0 0 1-5.23-3.42 5.72 5.72 0 0 0-5.24-3.4h-13.1a6 6 0 0 1-5.9-7.1L14.3 9.02Z" />
              <path stroke="var(--lor-t3)" strokeWidth="1.5" d="m2.36 55.6 3.2 14.06A12 12 0 0 0 17.26 79h43.48a12 12 0 0 0 11.7-9.34l3.2-14.06" />
            </svg>
            <p>{visibles.length ? `${visibles.length} courrier${visibles.length > 1 ? "s" : ""} à traiter` : "Aucun courrier ouvert"}</p>
          </div>
        )}
      </section>
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
      {/* écarter un courriel du guichet le retire du courrier à ranger : confirmation */}
      <Dialog open={!!aEcarter} onOpenChange={(o) => !o && setAEcarter(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Écarter ce courriel ?</DialogTitle>
            <DialogDescription>« {aEcarter?.sujet?.trim() || "Courriel sans objet"} » quitte le courrier à ranger. Il reste dans la boîte de réception (marqué écarté), où il peut être remis à lire.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              type="button"
              className="r-btn r-btn--noir"
              onClick={() => {
                if (aEcarter) void ranger(aEcarter, "ecartee");
                setAEcarter(null);
              }}
            >
              Écarter
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
