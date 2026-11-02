"use client";

/* ══════════════════════════════════════════════════════════════════════
   TAMILA — le dossier de faits (02/11/2026, pages manquantes : docs/refonte-
   metiers/PAGES-MANQUANTES.md) : copie 1:1 de la page d'un ticket de Linear
   en plein écran (releves/linear-ticket.md, OME-19). Seul le contenu change.

   Promesses couvertes : « Chronologie sourcée », « Dossier de faits daté et
   sourcé », « Contradictions relevées… côte à côte », « Dossier de plaidoirie
   et renvois cliquables », « L'ensemble de la pré-lecture ».

   Correspondance :
   fil « Initiatives › OME-19 titre » → « Dossiers › référence · Dossier de
   faits » ; étoile → ouvrir ce dossier de faits sur cette lecture (gardé dans
   ce navigateur) ; « … » → exporter, copier, redemander, revenir au dossier ;
   Accept · Decline · Duplicate · Snooze → Word · Imprimer ou PDF · Redemander
   cette lecture (confirmation) · Lectures du dossier (menu) ; barre d'outils
   Copy URL · Copy ID · Copy branch · Copy as prompt | Choose → copier
   l'adresse · la référence · les renvois · « Copier pour l'assistant » | choix
   du format ; titre → la lecture et l'intitulé ; description → le résumé du
   lecteur ; réaction · pièce jointe → copier le résumé · les pièces lues
   (ouvertes déchiffrées) ; Sub-issues → les faits (jauge : sources vérifiées ;
   filtre ; « + » : demander une lecture, confirmation) ; Activity → Sources
   (« Unsubscribe » : replier / déplier les cartes ; rond : les acteurs) ; un
   commentaire → un fait : son texte, et dans le pied (« Leave a reply… ») le
   renvoi pièce · page · lignes, cliquable, la pièce ouverte déchiffrée à la
   page ; contradictions : les deux pieds côte à côte ; pièces citées
   absentes : « Réclamer au confrère » (confirmation). Properties → Lecture
   (type, état, pièces, date) ; Labels → Acteurs (filtre) ; Project → Dossier.

   Données : les lectures `analyses` (b4_15, portes.chargerAnalyses), et leur
   résultat déchiffré exactement comme la fenêtre « Lire » de l'écran d'avant
   (AnalysesTamila.tsx : lireResultat(dechiffrer(cle, resultat_chiffre))).
   La clé vient du trousseau du layout (useTamila().cle), ouvert par la page
   du dossier (useTamila().ouvrir : consultation tracée, comme la fiche).
   ══════════════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { STATUTS_LECTURE } from "@/components/espace/tamila/AnalysesTamila";
import { TYPES_ANALYSE, estPieceCitee, etatPieceCitee, htmlAnalyse, libelleCode, libelleType, lignesDe, lireResultat, objetReclamation, resumeDonnees, type Citation, type Constat, type ResultatAnalyse } from "@/components/espace/tamila/analyses";
import { chiffrer, dechiffrer, dechiffrerOctets } from "@/components/espace/tamila/chiffrement";
import { ATTENTES_OBJETS_EXEMPLE, attentesExemple } from "@/components/espace/tamila/exemples";
import * as portes from "@/components/espace/tamila/portes";
import { ecritDossier, estAvocat } from "@/components/espace/tamila/regles";
import type { DossierComplet } from "@/components/espace/tamila/types";
import { RACINE } from "@/components/espace2/modules";
import { Avatar, TamCarte, TamMenu, type OptionMenu } from "./TamCadre";
import { TamIcone, type NomTamIcone } from "./TamIcone";
import { TamFenetre } from "./TamFenetre";
import { dateCourte, dateLongue } from "./echeances";
import { useTamila } from "./donnees";
import { faitsExemple } from "./faitsExemple";
import "./tam-initiative.css";
import "./tam-triage.css";
import "./tam-ticket.css";

type Lu = { resultat: ResultatAnalyse | null; erreur: string | null };
type Confirmation = { titre: string; texte: string; bouton: string; faire: () => Promise<void> | void };
type Filtre = "tous" | "a_verifier" | "doute" | `acteur:${string}`;
type Format = "markdown" | "texte" | "renvois";

const ACTEURS: Record<string, string> = { client: "Client", adverse: "Partie adverse", juge: "Juridiction", expert: "Expert", tiers: "Tiers" };
/* les pastilles d'étiquette de Linear (9×9) : vert relevé (« Client ») ; les autres, couleurs d'étiquettes du sprite de Linear */
const TEINTES: Record<string, string> = { client: "rgb(76, 183, 130)", adverse: "rgb(235, 87, 87)", juge: "rgb(94, 106, 210)", expert: "rgb(242, 153, 74)", tiers: "rgb(149, 162, 179)" };
const EPINGLE = "omega.tamila.faits.lecture";

const lireEpingle = (dossier: string): string | null => {
  try {
    return (JSON.parse(localStorage.getItem(EPINGLE) ?? "{}") as Record<string, string>)[dossier] ?? null;
  } catch {
    return null;
  }
};
const poserEpingle = (dossier: string, lecture: string | null) => {
  try {
    const m = JSON.parse(localStorage.getItem(EPINGLE) ?? "{}") as Record<string, string>;
    if (lecture) m[dossier] = lecture;
    else delete m[dossier];
    localStorage.setItem(EPINGLE, JSON.stringify(m));
  } catch {
    /* navigation privée : rien n'est gardé */
  }
};

/* « il y a 3 h », comme les dates relatives de Linear (« 3d ago ») */
function ilYa(iso: string | null): string {
  if (!iso) return "";
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (m < 1) return "à l'instant";
  if (m < 60) return `il y a ${m} min`;
  if (m < 60 * 24) return `il y a ${Math.round(m / 60)} h`;
  return `il y a ${Math.round(m / 1440)} j`;
}

const dateDuFait = (c: Constat): string | null => {
  const d = c.donnees ?? {};
  if (typeof d.date !== "string" || !/^\d{4}-\d{2}-\d{2}/.test(d.date)) return d.numero !== undefined && d.numero !== null && String(d.numero) !== "" ? `n° ${d.numero}` : null;
  const [a, m, j] = d.date.slice(0, 10).split("-");
  return d.precision === "annee" ? a : d.precision === "mois" ? `${m}/${a}` : `${j}/${m}/${a}`;
};
const acteurDe = (c: Constat): string | null => {
  const d = c.donnees ?? {};
  const a = d.acteur ?? d.partie ?? d.citee_par;
  return typeof a === "string" && a ? a : null;
};
const graviteDe = (c: Constat): "info" | "attention" | "critique" | "doute" => (c.gravite !== "info" ? c.gravite : c.citations.some((x) => !x.verifiee) ? "doute" : "info");
/* une icône teintée selon la gravité (bleu-violet « fait », orange « triage », rouge relevé) */
function Ic({ nom, taille = 16, g }: { nom: NomTamIcone; taille?: number; g?: string }) {
  return (
    <span data-g={g} style={{ display: "inline-flex", flex: "none" }}>
      <TamIcone nom={nom} taille={taille} />
    </span>
  );
}
const ICONE_GRAVITE: Record<ReturnType<typeof graviteDe>, NomTamIcone> = { info: "IssueStatusDone", attention: "Alert", critique: "Alert", doute: "IssueStatusTriage" };

export default function DossierFaits({ id }: { id: string }) {
  const t = useTamila();
  const { ouvrir } = t;
  useEffect(() => {
    ouvrir(id);
  }, [id, ouvrir]);
  const ligne = t.lignes.find((x) => x.dossier.id === id) ?? null;
  const complet = t.complet(id);
  if (!complet) {
    return (
      <TamCarte className="tk">
        <div className="tam-tete tk-tete">
          <div className="tam-ligne1">
            <nav className="tam-ini-fil" aria-label="Fil">
              <Link href={`${RACINE}/tamila/dossiers/${id}`}>{ligne?.clair?.reference ?? "Dossier"}</Link>
              <span className="tam-ini-sep">›</span>
              <span className="tam-ini-nom">
                <h2>Dossier de faits</h2>
              </span>
            </nav>
          </div>
        </div>
        <p className="tk-vide" style={{ padding: "64px 48px" }}>
          {t.pret && !ligne ? "Ce dossier n'existe pas ou n'est pas dans votre vue." : t.erreur ?? "Lecture du dossier (la consultation est tracée au journal des accès)…"}
        </p>
      </TamCarte>
    );
  }
  return <Faits key={complet.dossier.id} complet={complet} cle={t.cle(id)} />;
}

function Faits({ complet, cle }: { complet: DossierComplet; cle: CryptoKey | null }) {
  const t = useTamila();
  const router = useRouter();
  const chemin = usePathname();
  const params = useSearchParams();
  const d = complet.dossier;
  const clair = complet.clair;
  const ex = useMemo(() => (t.source === "exemple" ? faitsExemple(d.id) : null), [t.source, d.id]);

  /* undefined : lecture en cours ; null : la base n'a pas les analyses */
  const [lectures, setLectures] = useState<portes.Analyse[] | null | undefined>(() => ex?.lectures);
  const [lus, setLus] = useState<Record<string, Lu>>({});
  const [epingle, setEpingle] = useState<string | null>(null);
  const [filtre, setFiltre] = useState<Filtre>("tous");
  const [replie, setReplie] = useState(false);
  const [cartesRepliees, setCartesRepliees] = useState(false);
  const [actif, setActif] = useState<number | null>(null);
  const [confirme, setConfirme] = useState<Confirmation | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [message, setMessage] = useState<{ texte: string; erreur?: boolean } | null>(null);
  const [attendues, setAttendues] = useState<string[]>([]);
  const [reclamees, setReclamees] = useState<Set<string>>(new Set());
  const [format, setFormat] = useState<Format>("markdown");
  const cadre = useRef<HTMLIFrameElement>(null);

  const relire = useCallback(async () => setLectures(await portes.chargerAnalyses(d.id)), [d.id]);
  useEffect(() => {
    const t0 = window.setTimeout(() => {
      setEpingle(lireEpingle(d.id));
      if (t.source === "reelle") void relire();
    }, 0);
    return () => window.clearTimeout(t0);
  }, [t.source, d.id, relire]);

  const prets = useMemo(() => (lectures ?? []).filter((a) => a.statut === "finie" || a.statut === "partielle"), [lectures]);
  const demandee = params.get("lecture");
  const choisie =
    prets.find((a) => a.id === demandee) ??
    prets.find((a) => a.id === epingle) ??
    prets.find((a) => a.type.endsWith("chronologie")) ??
    prets[0] ??
    null;

  /* le déchiffrement : celui de la fenêtre « Lire » (AnalysesTamila.tsx), rien d'autre */
  useEffect(() => {
    if (!choisie || lus[choisie.id]) return;
    let vivant = true;
    void (async () => {
      let lu: Lu;
      if (t.source === "exemple") {
        const r = ex?.resultats[choisie.id] ?? null;
        lu = { resultat: r, erreur: r ? null : "Résultat d'exemple absent." };
      } else if (!cle) {
        lu = { resultat: null, erreur: "La clé du dossier n'est pas ouverte dans ce navigateur : le résultat reste chiffré." };
      } else {
        const r = lireResultat(await dechiffrer(cle, choisie.resultat_chiffre));
        lu = { resultat: r, erreur: r ? null : "Le résultat ne se déchiffre pas avec la clé de ce dossier." };
      }
      if (vivant) setLus((x) => ({ ...x, [choisie.id]: lu }));
    })();
    return () => {
      vivant = false;
    };
  }, [choisie, lus, t.source, ex, cle]);
  const lu = choisie ? lus[choisie.id] : undefined;
  const r = lu?.resultat ?? null;
  const type = r?.type.replace(/^tamila\./, "") ?? null;

  /* les pièces citées : comparées aux pièces attendues déjà posées, en clair (comme la fenêtre « Lire ») */
  useEffect(() => {
    if (type !== "pieces_citees") return;
    let vivant = true;
    void (async () => {
      let objets: string[] = [];
      if (t.source === "exemple") objets = attentesExemple(d.id).filter((x) => x.statut === "attendue").map((x) => ATTENTES_OBJETS_EXEMPLE[x.id] ?? "");
      else if (cle) {
        const at = (await portes.chargerAttentes(d.id)) ?? [];
        objets = (await Promise.all(at.filter((x) => x.statut === "attendue").map((x) => dechiffrer(cle, x.objet_chiffre)))).filter((x): x is string => !!x);
      }
      if (vivant) setAttendues(objets);
    })();
    return () => {
      vivant = false;
    };
  }, [type, t.source, cle, d.id]);

  const vivantDossier = ["attente", "ouvert", "audit"].includes(d.statut);
  const peutDemander = ecritDossier(t.moi, d, complet.membres, complet.murailles) && estAvocat(t.moi);
  const auCoffre = complet.cle?.fournisseur === "scaleway";
  const demandeOuverte = !envoi && peutDemander && vivantDossier && (t.source === "exemple" || auCoffre);
  const raisonDemande = !peutDemander ? "Réservé aux avocats qui écrivent dans ce dossier" : !vivantDossier ? "Le dossier est clos" : t.source === "reelle" && !auCoffre ? "La clé de ce dossier est sous la phrase du cabinet : les lectures longues demandent le coffre à clés" : undefined;

  const nomPiece = (pid: string) => complet.pieces.find((p) => p.id === pid)?.nom_fichier ?? "pièce";
  const nomActeur = (a: string | null): string => {
    if (!a) return "Le lecteur";
    if (a === "client" || a === "adverse") {
      const p = complet.parties.find((x) => x.qualite === a);
      if (p && complet.partiesClair[p.id]?.nom) return complet.partiesClair[p.id]!.nom;
    }
    if (a === "juge" && d.juridiction) return d.juridiction;
    return ACTEURS[a] ?? a;
  };
  const renvoiTexte = (x: Citation) => `${nomPiece(x.piece)}, p. ${x.page}${lignesDe(x) ? `, ${lignesDe(x)}` : ""}`;
  const pieceLisible = (pid: string) => t.source === "reelle" && !!cle && complet.pieces.some((p) => p.id === pid);

  const dire = (texte: string, erreur = false) => setMessage({ texte, erreur });
  const copier = async (texte: string, quoi: string) => {
    try {
      await navigator.clipboard.writeText(texte);
      dire(`${quoi} copié${quoi.endsWith("s") ? "s" : ""} dans le presse-papiers.`);
    } catch {
      dire("Le navigateur refuse l'accès au presse-papiers.", true);
    }
  };

  /* le renvoi cliquable : la pièce déchiffrée dans le navigateur, ouverte à la page citée (AnalysesTamila.tsx) */
  const ouvrirPiece = async (pid: string, page = 1) => {
    const p = complet.pieces.find((x) => x.id === pid);
    if (t.source === "exemple") return dire(`En exemple, les pièces ne s'ouvrent pas : en réel, ${p?.nom_fichier ?? "la pièce"} s'ouvre déchiffrée à la page ${page}.`);
    if (!p || !cle) return dire("La clé du dossier n'est pas ouverte dans ce navigateur.", true);
    try {
      const octets = await dechiffrerOctets(cle, await portes.telecharger(p.chemin));
      if (!octets) throw new Error("La clé de ce dossier n'ouvre pas cette pièce.");
      const url = URL.createObjectURL(new Blob([octets.slice()], { type: p.mime || "application/pdf" }));
      window.open(`${url}#page=${page}`, "_blank", "noopener");
      window.setTimeout(() => URL.revokeObjectURL(url), 120_000);
    } catch (e) {
      dire(e instanceof Error ? e.message : "La pièce ne s'ouvre pas.", true);
    }
  };

  const demander = (tp: portes.TypeAnalyse) =>
    setConfirme({
      titre: `Demander : ${TYPES_ANALYSE[tp].libelle.toLowerCase()}`,
      texte: `${TYPES_ANALYSE[tp].aide}. Le lecteur lit les ${complet.pieces.length} pièce(s) du dossier au coffre ; la lecture est facturée au cabinet et le résultat revient chiffré sous la clé du dossier.`,
      bouton: "Demander la lecture",
      faire: async () => {
        setEnvoi(true);
        try {
          if (t.source === "reelle") {
            await portes.demanderAnalyse(d.id, tp);
            await relire();
          } else {
            setLectures((l) => [{ id: crypto.randomUUID(), type: `tamila.${tp}`, statut: "demandee", comptes: null, sans_source: null, pieces: complet.pieces.map((p) => p.id), pieces_lues: null, pieces_non_lues: null, cout_eur: null, motif: null, demandee_le: new Date().toISOString(), finie_le: null, resultat_chiffre: null }, ...(l ?? [])]);
          }
          dire(`${TYPES_ANALYSE[tp].libelle} demandée : le lecteur lit les pièces au coffre ; elle apparaîtra dans « Lectures du dossier ».`);
        } catch (e) {
          dire(e instanceof Error ? e.message : "La base a refusé la demande.", true);
        } finally {
          setEnvoi(false);
        }
      },
    });

  const reclamer = (cleC: string, c: Constat) =>
    setConfirme({
      titre: "Réclamer au confrère",
      texte: `« ${objetReclamation(c)} » devient une pièce attendue du confrère, relancée dans sept jours.`,
      bouton: "Réclamer",
      faire: async () => {
        try {
          if (t.source === "reelle") {
            if (!cle) throw new Error("La clé du dossier est nécessaire pour chiffrer l'objet.");
            await portes.poserAttente(d.id, "confrere", await chiffrer(cle, objetReclamation(c)), null);
          }
          setReclamees((x) => new Set(x).add(cleC));
          dire("Pièce ajoutée aux pièces attendues du dossier.");
        } catch (e) {
          dire(e instanceof Error ? e.message : "La base a refusé la pièce attendue.", true);
        }
      },
    });

  const choisir = (a: portes.Analyse) => {
    setActif(null);
    setFiltre("tous");
    router.replace(`${chemin}?lecture=${encodeURIComponent(a.id)}`, { scroll: false });
  };

  const constats = useMemo(() => r?.constats ?? [], [r]);
  const visibles = constats
    .map((c, i) => ({ c, i }))
    .filter(({ c }) => (filtre === "tous" ? true : filtre === "a_verifier" ? c.gravite !== "info" : filtre === "doute" ? c.citations.some((x) => !x.verifiee) : acteurDe(c) === filtre.slice(7)));
  const acteurs = [...new Set(constats.map(acteurDe).filter((x): x is string => !!x))];
  const sources = constats.filter((c) => c.citations.length && c.citations.every((x) => x.verifiee)).length;

  const titreLecture = choisie ? libelleType(choisie.type) : "Dossier de faits";
  const titre = `Dossier de faits · ${titreLecture.toLowerCase()} : ${clair?.intitule ?? "intitulé chiffré"}${clair?.numero_rg ? ` (RG ${clair.numero_rg})` : ""}`;
  const doc = r ? htmlAnalyse(r, nomPiece, clair, dateCourte(choisie?.finie_le ?? choisie?.demandee_le ?? null)) : "";
  const exporterWord = () => {
    if (!r) return;
    const url = URL.createObjectURL(new Blob(["﻿" + doc], { type: "application/msword" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${libelleType(r.type).toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${(clair?.reference ?? "dossier").replace(/[^A-Za-z0-9-]+/g, "-")}.doc`;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const imprimer = () => cadre.current?.contentWindow?.print();
  const pourAssistant = (f: Format): string => {
    if (!r) return "";
    const renvois = (c: Constat) => c.citations.map((x) => `${renvoiTexte(x)}${x.verifiee ? "" : " (non retrouvée dans la pièce : ne vaut pas preuve)"}`);
    if (f === "renvois") return constats.map((c) => `${dateDuFait(c) ? `${dateDuFait(c)} — ` : ""}${c.titre} : ${renvois(c).join(" ; ")}`).join("\n");
    const md = f === "markdown";
    const lignes = [
      md ? `# ${titre}` : titre,
      `Dossier ${clair?.reference ?? ""} · ${libelleType(r.type)} lue le ${dateCourte(choisie?.finie_le ?? null)} · ${r.pieces_lues ?? 0} pièce(s), ${constats.length} constat(s)`,
      "",
      r.resume ?? "",
      "",
      ...constats.flatMap((c) => [
        `${md ? "## " : ""}${dateDuFait(c) ? `${dateDuFait(c)} — ` : ""}${c.titre}${c.gravite !== "info" ? ` (${c.gravite === "critique" ? "critique" : "à vérifier"})` : ""}`,
        ...(resumeDonnees(r.type, c.donnees) ? [resumeDonnees(r.type, c.donnees)!] : []),
        ...(c.texte ? [c.texte] : []),
        ...c.citations.map((x) => `${md ? "- " : "  "}« ${x.extrait} » — ${renvoiTexte(x)}${x.verifiee ? "" : " (non retrouvée dans la pièce : ne vaut pas preuve)"}`),
        "",
      ]),
      "Lecture assistée : chaque constat renvoie à la pièce, à la page et aux lignes ; l'avocat vérifie avant tout usage.",
    ];
    return lignes.join("\n");
  };
  const FORMATS: Record<Format, string> = { markdown: "Markdown (titres et listes)", texte: "Texte brut", renvois: "Renvois seuls (pièce, page, lignes)" };

  const voirFait = (i: number) => {
    setActif(i);
    setCartesRepliees(false);
    window.setTimeout(() => document.getElementById(`tk-fait-${i}`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  };

  const menuLectures: OptionMenu[] = [
    ...(lectures ?? []).map((a) => ({
      libelle: `${libelleType(a.type)} · ${STATUTS_LECTURE[a.statut].libelle.toLowerCase()} · ${dateCourte(a.finie_le ?? a.demandee_le)}`,
      icone: (a.id === choisie?.id ? "IssueStatusDone" : a.statut === "finie" || a.statut === "partielle" ? "Book" : "Hourglass") as NomTamIcone,
      action: () => choisir(a),
      desactive: !(a.statut === "finie" || a.statut === "partielle"),
    })),
    ...(lectures?.length ? (["sep"] as OptionMenu[]) : []),
    { libelle: "Toutes les lectures dans la fiche du dossier", icone: "Briefcase", href: `${RACINE}/tamila/dossiers/${d.id}?onglet=pieces` },
  ];
  const menuDemander: OptionMenu[] = (Object.keys(TYPES_ANALYSE) as portes.TypeAnalyse[]).map((tp) => ({ libelle: `${TYPES_ANALYSE[tp].libelle}…`, icone: "Book" as NomTamIcone, action: () => demander(tp), desactive: !demandeOuverte }));
  const menuPieces: OptionMenu[] = choisie
    ? choisie.pieces.map((pid) => ({ libelle: `${nomPiece(pid)}${choisie.pieces_non_lues?.includes(pid) ? " (non lue)" : ""}`, icone: "PdfFile" as NomTamIcone, action: () => void ouvrirPiece(pid), desactive: t.source === "reelle" && !pieceLisible(pid) }))
    : [];
  const menuActions: OptionMenu[] = [
    { libelle: "Exporter en Word", icone: "Page", action: exporterWord, desactive: !r },
    { libelle: "Imprimer ou PDF", icone: "PdfFile", action: imprimer, desactive: !r },
    "sep",
    { libelle: "Copier pour l'assistant", icone: "Agent", action: () => void copier(pourAssistant(format), "Dossier de faits"), desactive: !r },
    { libelle: "Copier les renvois", icone: "Link", action: () => void copier(pourAssistant("renvois"), "Renvois"), desactive: !r },
    "sep",
    { libelle: choisie ? `Redemander : ${libelleType(choisie.type).toLowerCase()}…` : "Demander une chronologie…", icone: "Refresh", action: () => demander((choisie?.type.replace(/^tamila\./, "") ?? "chronologie") as portes.TypeAnalyse), desactive: !demandeOuverte },
    { libelle: "Ouvrir la fiche du dossier", icone: "Briefcase", href: `${RACINE}/tamila/dossiers/${d.id}` },
  ];
  const menuFiltre: OptionMenu[] = [
    { libelle: `Tous les faits (${constats.length})`, icone: filtre === "tous" ? "IssueStatusDone" : "IssueStatusTodo", action: () => setFiltre("tous") },
    { libelle: `À vérifier (${constats.filter((c) => c.gravite !== "info").length})`, icone: filtre === "a_verifier" ? "IssueStatusDone" : "Alert", action: () => setFiltre("a_verifier") },
    { libelle: `Citation non retrouvée (${constats.filter((c) => c.citations.some((x) => !x.verifiee)).length})`, icone: filtre === "doute" ? "IssueStatusDone" : "IssueStatusTriage", action: () => setFiltre("doute") },
    ...(acteurs.length ? (["sep"] as OptionMenu[]) : []),
    ...acteurs.map((a) => ({ libelle: nomActeur(a), icone: (filtre === `acteur:${a}` ? "IssueStatusDone" : "Users") as NomTamIcone, action: () => setFiltre(`acteur:${a}`) })),
  ];
  const menuFormat: OptionMenu[] = (Object.keys(FORMATS) as Format[]).map((f) => ({ libelle: FORMATS[f], icone: (f === format ? "IssueStatusDone" : "IssueStatusTodo") as NomTamIcone, action: () => { setFormat(f); void copier(pourAssistant(f), "Dossier de faits"); } }));
  const menuActeurs: OptionMenu[] = acteurs.length
    ? acteurs.map((a) => ({ libelle: `${nomActeur(a)} (${constats.filter((c) => acteurDe(c) === a).length})`, icone: (filtre === `acteur:${a}` ? "IssueStatusDone" : "Users") as NomTamIcone, action: () => setFiltre(filtre === `acteur:${a}` ? "tous" : `acteur:${a}`) }))
    : [{ libelle: "Aucun acteur nommé", icone: "Users", desactive: true }];

  const statut = choisie ? STATUTS_LECTURE[choisie.statut] : null;
  const epinglee = !!choisie && epingle === choisie.id;
  const proprietes = (ligneMince: boolean) => (
    <>
      {ligneMince ? null : <h3>Lecture</h3>}
      <div className={ligneMince ? "tk-pilules-ligne" : "tk-props"}>
        <TamMenu libelle="Lectures du dossier" options={menuLectures} classe="tk-prop" enfants={<><TamIcone nom="Book" taille={14} /><span>{choisie ? libelleType(choisie.type) : "Aucune lecture prête"}</span></>} />
        {statut ? (
          <span className="tk-prop">
            <TamIcone nom={choisie?.statut === "finie" ? "IssueStatusDone" : "Alert"} taille={14} style={{ color: choisie?.statut === "finie" ? "var(--tam-fait)" : "var(--tam-triage)" }} />
            <span>{statut.libelle}</span>
          </span>
        ) : null}
        <TamMenu libelle="Pièces lues" options={menuPieces.length ? menuPieces : [{ libelle: "Aucune pièce", icone: "PdfFile", desactive: true }]} classe="tk-prop" enfants={<><TamIcone nom="PdfFile" taille={14} /><span>{choisie ? `${r?.pieces_lues ?? choisie.pieces_lues ?? choisie.pieces.length} pièce(s)${r?.pages_lues ? ` · ${r.pages_lues} pages` : ""}` : "Pièces"}</span></>} />
        <span className="tk-prop" data-vide={choisie?.finie_le ? undefined : ""}>
          <TamIcone nom="Calendar" taille={14} />
          <span>{choisie?.finie_le ? `Lue le ${dateCourte(choisie.finie_le)}` : "Pas encore lue"}</span>
        </span>
        {ligneMince ? (
          <Link className="tk-prop" href={`${RACINE}/tamila/dossiers/${d.id}`}>
            <TamIcone nom="Briefcase" taille={14} />
            <span>{clair?.reference ?? "Dossier"}</span>
          </Link>
        ) : null}
      </div>
      {ligneMince ? null : (
        <>
          <h3>Acteurs</h3>
          {acteurs.length ? (
            <div className="tk-etiquettes">
              {acteurs.map((a) => (
                <button key={a} type="button" className="tk-etiquette" aria-pressed={filtre === `acteur:${a}`} title={`Ne montrer que les faits de : ${nomActeur(a)}`} onClick={() => setFiltre(filtre === `acteur:${a}` ? "tous" : `acteur:${a}`)}>
                  <i style={{ background: TEINTES[a] ?? TEINTES.tiers }} />
                  {nomActeur(a)}
                </button>
              ))}
            </div>
          ) : (
            <div className="tk-props">
              <span className="tk-prop" data-vide="">
                <TamIcone nom="Label" taille={14} />
                <span>Aucun acteur</span>
              </span>
            </div>
          )}
          <h3>Dossier</h3>
          <div className="tk-props">
            <Link className="tk-prop" href={`${RACINE}/tamila/dossiers/${d.id}`} title="Ouvrir la fiche du dossier">
              <TamIcone nom="Briefcase" taille={14} style={{ color: "var(--tam-bleu)" }} />
              <span>{clair ? `${clair.reference} · ${clair.intitule}` : "Dossier chiffré"}</span>
            </Link>
          </div>
        </>
      )}
    </>
  );

  const description = !lectures && lectures !== undefined
    ? "Les lectures longues ne sont pas installées sur cette base."
    : lectures === undefined
      ? "Lecture des analyses du dossier…"
      : !choisie
        ? "Aucune lecture prête pour ce dossier. Demandez une chronologie, les contradictions ou la pré-lecture (« + » ci-dessous) : le lecteur lit les pièces au coffre, chaque fait renvoie à sa pièce, sa page et ses lignes."
        : lu?.erreur ?? r?.resume ?? (lu ? "Le lecteur n'a pas rendu de résumé." : "Déchiffrement dans votre navigateur…");

  return (
    <TamCarte className="tk">
      <div className="tam-tete tk-tete">
        <div className="tam-ligne1">
          <nav className="tam-ini-fil" aria-label="Fil">
            <Link href={`${RACINE}/tamila/dossiers/${d.id}`}>Dossiers</Link>
            <span className="tam-ini-sep" aria-hidden="true">
              ›
            </span>
            <span className="tam-ini-nom">
              <h2>
                <span className="tam-tri-id" style={{ marginRight: 5.6 }}>{clair?.reference ?? "Dossier"}</span> Dossier de faits
              </h2>
            </span>
          </nav>
          <button
            type="button"
            className="tam-rond"
            aria-pressed={epinglee}
            disabled={!choisie}
            title={epinglee ? "Ne plus ouvrir d'office sur cette lecture" : "Ouvrir d'office sur cette lecture (gardé dans ce navigateur)"}
            aria-label={epinglee ? "Ne plus ouvrir d'office sur cette lecture" : "Ouvrir d'office sur cette lecture"}
            onClick={() => {
              const v = epinglee ? null : (choisie?.id ?? null);
              poserEpingle(d.id, v);
              setEpingle(v);
            }}
          >
            <TamIcone nom={epinglee ? "Favorite" : "Etoile"} />
          </button>
          <TamMenu libelle="Actions du dossier de faits" options={menuActions} />
          <div className="tk-tete-droite">
            <button type="button" className="tk-bouton" disabled={!r} onClick={exporterWord} title="Exporter en Word">
              <TamIcone nom="Page" />
              <span>Word</span>
            </button>
            <button type="button" className="tk-bouton" disabled={!r} onClick={imprimer} title="Imprimer ou enregistrer en PDF">
              <TamIcone nom="PdfFile" />
              <span>PDF</span>
            </button>
            <button type="button" className="tam-rond" disabled={!choisie || !demandeOuverte} title={raisonDemande ?? "Redemander cette lecture (pièces ajoutées depuis)"} aria-label="Redemander cette lecture" onClick={() => choisie && demander(choisie.type.replace(/^tamila\./, "") as portes.TypeAnalyse)}>
              <TamIcone nom="Refresh" />
            </button>
            <TamMenu libelle="Lectures du dossier" icone="Book" alignement="droite" options={menuLectures} />
          </div>
        </div>
      </div>
      <div className="tk-corps">
        <div className="tk-outils">
          <button type="button" className="tam-rond" title="Copier l'adresse de la page" aria-label="Copier l'adresse de la page" onClick={() => void copier(window.location.href, "Lien")}>
            <TamIcone nom="LienUrl" />
          </button>
          <button type="button" className="tam-rond" title="Copier la référence du dossier" aria-label="Copier la référence du dossier" disabled={!clair} onClick={() => void copier(clair?.reference ?? "", "Référence")}>
            <TamIcone nom="Page" />
          </button>
          <button type="button" className="tam-rond" title="Copier les renvois (pièce, page, lignes)" aria-label="Copier les renvois" disabled={!r} onClick={() => void copier(pourAssistant("renvois"), "Renvois")}>
            <TamIcone nom="Link" />
          </button>
          <div className="tk-double">
            <button type="button" title={`Copier pour l'assistant (${FORMATS[format].toLowerCase()})`} aria-label="Copier pour l'assistant" disabled={!r} onClick={() => void copier(pourAssistant(format), "Dossier de faits")}>
              <TamIcone nom="Agent" />
            </button>
            <TamMenu libelle="Choisir le format" options={menuFormat} alignement="droite" classe="" enfants={<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M4.5 6.5h7L8 10.5z" /></svg>} />
          </div>
        </div>
        <div className="tk-cols">
          <div className="tk-principal">
            <h1 className="tk-titre">{titre}</h1>
            {proprietes(true)}
            <div className="tk-description">
              {description}
              {choisie?.statut === "partielle" ? <small>Lecture partielle : le plafond de coût est atteint, {choisie.pieces_non_lues?.length ?? 0} pièce(s) n&apos;ont pas été lues.</small> : null}
            </div>
            <div className="tk-reactions">
              <button type="button" className="tam-rond" title="Copier le résumé" aria-label="Copier le résumé" disabled={!r?.resume} onClick={() => void copier(r?.resume ?? "", "Résumé")}>
                <TamIcone nom="Comment" />
              </button>
              <TamMenu libelle="Pièces lues (ouvertes déchiffrées)" icone="Attachment" options={menuPieces.length ? menuPieces : [{ libelle: "Aucune pièce", icone: "PdfFile", desactive: true }]} />
            </div>

            <section className="tk-sous" aria-label="Faits">
              <div className="tk-sous-tete">
                <button type="button" className="tk-replier" aria-expanded={!replie} onClick={() => setReplie(!replie)}>
                  <svg viewBox="0 0 8 8" fill="currentColor" aria-hidden="true">
                    <path d="M0.5 2h7L4 6.5z" />
                  </svg>
                  {type === "pieces_citees" ? "Pièces citées" : type === "contradictions" ? "Contradictions" : "Faits"}
                </button>
                <span className="tk-jauge" title="Faits dont toutes les citations sont retrouvées dans la pièce">
                  <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
                    <circle cx="8" cy="8" r="6" fill="none" stroke="var(--tam-t4)" strokeWidth="1.5" />
                    {constats.length ? <circle cx="8" cy="8" r="6" fill="none" stroke="var(--tam-fait)" strokeWidth="1.5" strokeDasharray={`${(sources / constats.length) * 37.7} 37.7`} transform="rotate(-90 8 8)" /> : null}
                  </svg>
                  {sources}/{constats.length}
                </span>
                <div className="tam-pousse" />
                <TamMenu libelle="Filtrer les faits" icone="Filtre" alignement="droite" options={menuFiltre} classe={`tam-rond tam-rond--plein${filtre !== "tous" ? " tk-filtre-actif" : ""}`} />
                <TamMenu libelle="Demander une lecture" icone="Plus" alignement="droite" options={menuDemander} classe="tam-rond tam-rond--plein" />
              </div>
              {replie ? null : (
                <div className="tk-lignes">
                  {visibles.length ? (
                    visibles.map(({ c, i }) => {
                      const g = graviteDe(c);
                      const a = acteurDe(c);
                      return (
                        <button key={i} type="button" className="tk-ligne" aria-current={actif === i} onClick={() => voirFait(i)} title={libelleCode(c.code)}>
                          <Ic nom={ICONE_GRAVITE[g]} taille={14} g={g} />
                          <span className="tk-ligne-date">{dateDuFait(c) ?? ""}</span>
                          <span className="tk-ligne-titre">{c.titre}</span>
                          <Avatar nom={a ? nomActeur(a) : null} taille={16} />
                        </button>
                      );
                    })
                  ) : (
                    <p className="tk-vide">{constats.length ? "Aucun fait pour ce filtre." : choisie ? "Aucun constat dans cette lecture." : "Aucun fait : aucune lecture prête."}</p>
                  )}
                </div>
              )}
            </section>

            <div className="tk-filet" />
            <div className="tk-activite-tete">
              <h3>Sources</h3>
              <button type="button" className="tk-suivre" disabled={!constats.length} onClick={() => setCartesRepliees(!cartesRepliees)}>
                {cartesRepliees ? "Déplier les sources" : "Replier les sources"}
              </button>
              <TamMenu libelle="Acteurs des faits" options={menuActeurs} alignement="droite" classe="tam-rond tk-rond32" enfants={<Avatar nom={acteurs[0] ? nomActeur(acteurs[0]) : null} taille={16} />} />
            </div>
            {choisie ? (
              <>
                <p className="tk-evenement" title={`Demandée le ${dateLongue(choisie.demandee_le)}`}>
                  <TamIcone nom="Book" />
                  <span>
                    {choisie.finie_le ? (
                      <>
                        <b>Le lecteur</b> a rendu {constats.length} constat(s) sur {r?.pieces_lues ?? choisie.pieces_lues ?? 0} pièce(s) · {ilYa(choisie.finie_le)}
                      </>
                    ) : (
                      <>
                        <b>Le cabinet</b> a demandé la lecture · {ilYa(choisie.demandee_le)}
                      </>
                    )}
                  </span>
                </p>
              </>
            ) : null}
            <div className="tk-cartes">
              {visibles.map(({ c, i }) => {
                const a = acteurDe(c);
                const meta = r && type !== "chronologie" ? resumeDonnees(r.type, c.donnees) : null;
                const cote = type === "contradictions" && c.citations.length >= 2;
                const cleC = `${choisie?.id}:${i}`;
                const etat = r && estPieceCitee(r.type, c) ? (reclamees.has(cleC) ? { etat: "attendue" as const } : etatPieceCitee(c, complet.pieces, attendues)) : null;
                return (
                  <article key={i} id={`tk-fait-${i}`} className="tk-carte" data-actif={actif === i ? "" : undefined} aria-label={c.titre}>
                    <div className="tk-carte-haut">
                      <div className="tk-carte-tete">
                        <Avatar nom={a ? nomActeur(a) : null} taille={20} />
                        <span>{a ? nomActeur(a) : libelleCode(c.code)}</span>
                        {dateDuFait(c) ? <time>{dateDuFait(c)}</time> : null}
                        <div className="tk-carte-gestes">
                          <button type="button" className="tam-rond" title="Copier ce fait et ses renvois" aria-label="Copier ce fait et ses renvois" onClick={() => void copier(`${dateDuFait(c) ? `${dateDuFait(c)} — ` : ""}${c.titre}\n${c.citations.map((x) => `« ${x.extrait} » — ${renvoiTexte(x)}`).join("\n")}`, "Fait")}>
                            <TamIcone nom="Page" />
                          </button>
                          <TamMenu
                            libelle="Gestes du fait"
                            alignement="droite"
                            options={[
                              ...c.citations.map((x) => ({ libelle: `Ouvrir ${renvoiTexte(x)}`, icone: "PdfFile" as NomTamIcone, action: () => void ouvrirPiece(x.piece, x.page), desactive: t.source === "reelle" && !pieceLisible(x.piece) })),
                              "sep" as const,
                              ...(etat?.etat === "absente" ? [{ libelle: "Réclamer au confrère…", icone: "Email" as NomTamIcone, action: () => reclamer(cleC, c), desactive: !peutDemander || !vivantDossier || (t.source === "reelle" && !cle) }] : []),
                              { libelle: "Ne montrer que cet acteur", icone: "Users" as NomTamIcone, action: () => a && setFiltre(`acteur:${a}`), desactive: !a },
                            ]}
                          />
                        </div>
                      </div>
                      {cartesRepliees ? null : (
                        <>
                          <p className="tk-carte-texte">{c.titre}</p>
                          {c.texte || meta ? <p className="tk-carte-texte">{[meta, c.texte].filter(Boolean).join(" — ")}</p> : null}
                          {etat || c.gravite !== "info" ? (
                            <div className="tk-carte-etat">
                              {c.gravite !== "info" ? <span className="tam-pilule" data-valeur=""><Ic nom="Alert" taille={14} g={c.gravite} /><span>{c.gravite === "critique" ? "Critique" : "À vérifier"}</span></span> : null}
                              {etat ? (
                                <span className="tam-pilule" data-valeur="">
                                  <Ic nom={etat.etat === "absente" ? "IssueStatusTriage" : "IssueStatusDone"} taille={14} g={etat.etat === "absente" ? "doute" : "info"} />
                                  <span>{etat.etat === "nous" ? "Produite par votre client" : etat.etat === "retrouvee" ? `Retrouvée : ${etat.nom}` : etat.etat === "attendue" ? "Déjà dans les pièces attendues" : "Absente des pièces du dossier"}</span>
                                </span>
                              ) : null}
                              {etat?.etat === "absente" ? (
                                <button type="button" className="tam-pilule" disabled={!peutDemander || !vivantDossier || (t.source === "reelle" && !cle)} onClick={() => reclamer(cleC, c)}>
                                  <TamIcone nom="Email" taille={14} />
                                  Réclamer au confrère
                                </button>
                              ) : null}
                            </div>
                          ) : null}
                        </>
                      )}
                    </div>
                    {cartesRepliees ? null : (
                      <div className={cote ? "tk-pieds--cote" : undefined}>
                        {c.citations.map((x, j) => (
                          <div key={j} className="tk-pied" title={x.verifiee ? "Citation retrouvée dans la pièce" : "Non retrouvée dans la pièce : ne vaut pas preuve"}>
                            <Ic nom={x.verifiee ? "PdfFile" : "IssueStatusTriage"} g={x.verifiee ? undefined : "doute"} />
                            <button type="button" className="tk-renvoi" onClick={() => void ouvrirPiece(x.piece, x.page)} disabled={t.source === "reelle" && !pieceLisible(x.piece)}>
                              <q>{x.extrait}</q> — {renvoiTexte(x)}
                              {x.verifiee ? "" : " · non retrouvée"}
                            </button>
                            <button type="button" className="tk-petit" title="Ouvrir la pièce à cette page (déchiffrée ici)" aria-label="Ouvrir la pièce à cette page" disabled={t.source === "reelle" && !pieceLisible(x.piece)} onClick={() => void ouvrirPiece(x.piece, x.page)}>
                              <TamIcone nom="Attachment" />
                            </button>
                            <button type="button" className="tk-petit tk-petit--plein" title="Copier le renvoi" aria-label="Copier le renvoi" onClick={() => void copier(`« ${x.extrait} » — ${renvoiTexte(x)}`, "Renvoi")}>
                              <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                                <path d="M8 2.5a.75.75 0 0 1 .53.22l4 4a.75.75 0 1 1-1.06 1.06L8.75 5.06v7.69a.75.75 0 0 1-1.5 0V5.06L4.53 7.78a.75.75 0 0 1-1.06-1.06l4-4A.75.75 0 0 1 8 2.5" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
            {message ? (
              <p className="tam-note" role={message.erreur ? "alert" : "status"} data-teinte={message.erreur ? "rouge" : undefined} style={{ marginTop: 16 }}>
                {message.texte}
              </p>
            ) : null}
            {r ? <iframe ref={cadre} className="tk-impression" title="Document à imprimer" srcDoc={doc} sandbox="allow-modals allow-same-origin" tabIndex={-1} aria-hidden="true" /> : null}
          </div>
          <aside className="tk-proprietes" aria-label="Propriétés">
            {proprietes(false)}
          </aside>
        </div>
      </div>
      <TamFenetre
        titre={confirme?.titre ?? ""}
        sous={confirme?.texte}
        ouverte={!!confirme}
        fermer={() => setConfirme(null)}
        pied={
          <button
            type="button"
            className="tam-bouton tam-bouton--principal"
            disabled={envoi}
            onClick={() => {
              const c = confirme;
              setConfirme(null);
              void c?.faire();
            }}
          >
            {confirme?.bouton}
          </button>
        }
      >
        <p className="tam-note">Rien n&apos;est envoyé ni écrit avant que vous confirmiez. {clair ? `Dossier ${clair.reference}, ${dateLongue(new Date().toISOString())}.` : ""}</p>
      </TamFenetre>
    </TamCarte>
  );
}
