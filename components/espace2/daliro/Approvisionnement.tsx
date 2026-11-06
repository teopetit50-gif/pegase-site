"use client";

/* ══════════════════════════════════════════════════════════════════════
   DALIRO — Approvisionnement (02/11/2026) : copie 1:1 des « Tasks » de
   Plain (releves/plain-tasks.md, plain-commun.md). Seul le contenu change.

   Ce que le site promet (« Liste cadencée depuis le devis », « Livraisons
   calées sur la pose », « Suivi des retours », « Bons de livraison
   rapprochés », « livraisons à caler ») pour toute l'entreprise : jusqu'ici
   une carte par chantier dans la fiche. Une commande = une tâche.

   My tasks · Todo · Done → À commander · À livrer · Reçu (les annulées,
   comme les tâches CANCELLED de Plain, ne sont dans aucun onglet).
   TASK-n → la phrase d'échéance (« En retard depuis le 30 oct. ») ; titre
   → l'objet ; pastille du compte → le chantier (un clic filtre la page sur
   lui, ?chantier=) ; avatar carré → le fournisseur. « Last updated ·
   Priority » → Échéance · Urgence, plus « Exporter la liste (CSV) ».
   « Add new task T » → « Nouvelle commande T » (et, dans la fenêtre,
   « Préparer la liste depuis le devis »).

   Commande ouverte (?commande=) : liste à deux étages, volet de 360.
   Case « To do » → l'étape suivante (Noter commandée, Noter reçue, Noter
   rendu) ; « Assigned to me » → le fournisseur (choisi dans l'annuaire) ;
   « Handle with Agent » → « Copier pour l'assistant » ; titre et
   description → l'objet et la note, modifiables tant que la commande n'est
   pas livrée ; Account · Threads · Knowledge gap → Chantier, Passage,
   Quantité, échéances, bons de livraison, retour. Menu « ⋯ » : reporter la
   livraison, reporter le retour, la fiche du chantier, copier le lien,
   annuler la commande (avec son motif, confirmé).

   Portes : chargerAppro (btp_appro_chantier) pour chaque chantier,
   preparerListe, ecrireCommande, noterCommande, noterLivraison, recevoir,
   noterRetour, annulerCommande — inchangées. Sur l'exemple, les mêmes
   règles en mémoire (./approvisionnement).
   ══════════════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Dialog, Heading, Modal, ModalOverlay } from "react-aria-components";
import { aujourdHui } from "@/components/espace/exemples/socle";
import { ouverte as fonctionOuverte } from "@/components/espace/daliro/fonctions";
import { annulerCommande, chargerAppro, ecrireCommande, noterCommande, noterLivraison, noterRetour, preparerListe, recevoir } from "@/components/espace/daliro/portes";
import type { Commande, Tableau } from "@/components/espace/daliro/types";
import { Note } from "../ui";
import { useToast } from "../Toasts";
import { RACINE } from "../modules";
import { useDaliro } from "./donnees";
import { DalIcone } from "./DalIcone";
import { PlainIcone } from "./DalPlainIcone";
import { LIBELLES, UNITES, echeance, echeances, exemple, jour, ongletDe, qte, resteAFaire, versCsv, type CommandeBrute, type Onglet } from "./approvisionnement-donnees";
import "./dalp.css";

const ICI = `${RACINE}/daliro/approvisionnement`;
const EN_COURS = ["preparation", "ouvert", "suspendu"];
type Tri = "echeance" | "urgence";
type Fenetre =
  | { type: "nouvelle" }
  | { type: "commandee"; k: Commande }
  | { type: "recue"; k: Commande }
  | { type: "rendu"; k: Commande }
  | { type: "reporter"; k: Commande }
  | { type: "retour"; k: Commande }
  | { type: "annuler"; k: Commande }
  | null;

/* la couleur d'un avatar carré (r 4) : teinte tirée du nom */
const teinte = (nom: string) => `lch(62 42 ${[...nom].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 360, 0)})`;
const initiales = (nom: string) =>
  nom
    .split(/[\s-]+/)
    .filter((m) => /^[A-Za-zÀ-ÿ]/.test(m) && !/^(de|du|des|la|le|les|et|&)$/i.test(m))
    .slice(0, 2)
    .map((m) => m[0]!.toUpperCase())
    .join("");

function useOuvert<T extends HTMLElement>() {
  const [ouvert, setOuvert] = useState(false);
  const boite = useRef<T>(null);
  useEffect(() => {
    if (!ouvert) return;
    const dehors = (e: MouseEvent) => {
      if (!boite.current?.contains(e.target as Node)) setOuvert(false);
    };
    const echap = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOuvert(false);
    };
    document.addEventListener("mousedown", dehors);
    document.addEventListener("keydown", echap);
    return () => {
      document.removeEventListener("mousedown", dehors);
      document.removeEventListener("keydown", echap);
    };
  }, [ouvert]);
  return { ouvert, setOuvert, boite };
}

export default function Approvisionnement() {
  const d = useDaliro();
  const params = useSearchParams();
  const router = useRouter();
  const toast = useToast();
  const auj = aujourdHui();
  const ouverteId = params.get("commande");
  const filtre = params.get("chantier");
  const onglet = (["livrer", "recu"].includes(params.get("onglet") ?? "") ? params.get("onglet") : "commander") as Onglet;
  const [tri, setTri] = useState<Tri>("echeance");
  const { ouvert: triOuvert, setOuvert: ouvrirTri, boite: boiteTri } = useOuvert<HTMLDivElement>();
  const { ouvert: segOuvert, setOuvert: ouvrirSeg, boite: boiteSeg } = useOuvert<HTMLDivElement>();
  const { ouvert: plusOuvert, setOuvert: ouvrirPlus, boite: boitePlus } = useOuvert<HTMLDivElement>();
  const { ouvert: fourOuvert, setOuvert: ouvrirFour, boite: boiteFour } = useOuvert<HTMLDivElement>();

  /* ——— les données ——— */
  const { demanderTous, source, pret } = d;
  useEffect(() => demanderTous(), [demanderTous]);
  const chantiers = useMemo(() => d.liste.filter((c) => [...EN_COURS, "receptionne"].includes(c.statut)), [d.liste]);
  const tableaux = useMemo(() => d.liste.map((c) => d.tableau(c.id)).filter((t): t is Tableau => !!t), [d]);
  const [local, setLocal] = useState<CommandeBrute[] | null>(null);
  useEffect(() => {
    if (source !== "exemple" || local || !tableaux.length) return;
    const t = window.setTimeout(() => setLocal(exemple(tableaux)), 0);
    return () => window.clearTimeout(t);
  }, [source, local, tableaux]);
  const [reel, setReel] = useState<Record<string, Commande[]> | null>(null);
  const [fournisseursReels, setFournisseursReels] = useState<{ id: string; nom: string }[]>([]);
  const idsReels = chantiers.map((c) => c.id).join(",");
  const lire = useCallback(async () => {
    const ids = idsReels ? idsReels.split(",") : [];
    const lus = await Promise.all(ids.map(async (id) => [id, await chargerAppro(id).catch(() => null)] as const));
    setReel(Object.fromEntries(lus.map(([id, a]) => [id, a?.commandes ?? []])));
    const f = new Map<string, string>();
    for (const [, a] of lus) for (const x of a?.fournisseurs ?? []) f.set(x.id, x.nom);
    setFournisseursReels([...f].map(([id, nom]) => ({ id, nom })));
  }, [idsReels]);
  useEffect(() => {
    if (source !== "reelle" || !pret) return;
    const t = window.setTimeout(() => void lire(), 0);
    return () => window.clearTimeout(t);
  }, [source, pret, lire]);

  const commandes: Commande[] = useMemo(() => {
    if (source === "reelle") return Object.values(reel ?? {}).flat();
    return (local ?? []).map((k) => ({ ...k, echeances: echeances(k, d.tableau(k.chantier_id), auj) }));
  }, [source, reel, local, d, auj]);
  const fournisseurs = useMemo(
    () =>
      source === "reelle"
        ? fournisseursReels
        : (d.premier?.tiers ?? []).filter((t) => t.actif && t.roles.some((r) => r === "fournisseur" || r === "loueur" || r === "sous_traitant")).map((t) => ({ id: t.id, nom: t.nom })),
    [source, fournisseursReels, d.premier],
  );
  const nomChantier = useCallback((id: string) => d.liste.find((c) => c.id === id)?.nom ?? "Chantier", [d.liste]);

  const visibles = commandes.filter((k) => !filtre || k.chantier_id === filtre);
  const par = (o: Onglet) => visibles.filter((k) => ongletDe(k) === o);
  const liste = par(onglet)
    .map((k) => ({ k, e: echeance(k, auj) }))
    .sort((a, b) => (tri === "urgence" ? a.e.rang - b.e.rang || a.e.date.localeCompare(b.e.date) : a.e.date.localeCompare(b.e.date) || a.e.rang - b.e.rang));
  const ouverte = commandes.find((k) => k.id === ouverteId) ?? null;

  const ONGLETS: { cle: Onglet; libelle: string; nb: number; faite?: boolean }[] = [
    { cle: "commander", libelle: "À commander", nb: par("commander").length },
    { cle: "livrer", libelle: "À livrer", nb: par("livrer").length },
    { cle: "recu", libelle: "Reçu", nb: par("recu").length, faite: true },
  ];
  const courant = ONGLETS.find((o) => o.cle === onglet)!;

  const adresse = (o: Onglet, commande: string | null = null, chantier: string | null = filtre) => {
    const q = new URLSearchParams();
    if (o !== "commander") q.set("onglet", o);
    if (chantier) q.set("chantier", chantier);
    if (commande) q.set("commande", commande);
    return `${ICI}${q.size ? `?${q}` : ""}`;
  };
  const aller = (o: Onglet, commande: string | null = null, chantier: string | null = filtre) => router.replace(adresse(o, commande, chantier), { scroll: false });

  /* ——— les gestes ——— */
  const [fenetre, setFenetre] = useState<Fenetre>(null);
  const [champs, setChamps] = useState<Record<string, string>>({});
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const ch = (k: string) => champs[k] ?? "";
  const pose = (k: string, v: string) => setChamps((p) => ({ ...p, [k]: v }));
  const ouvrir = (f: Fenetre, init: Record<string, string> = {}) => {
    setErreur(null);
    setChamps(init);
    setFenetre(f);
  };
  const tableauDe = (id: string) => d.tableau(id);
  const bonsOuverts = (id: string) => {
    const t = tableauDe(id);
    return !!t && fonctionOuverte(t, "bons_livraison");
  };
  const changer = (id: string, f: (k: CommandeBrute) => CommandeBrute) => setLocal((l) => (l ?? []).map((x) => (x.id === id ? f(x) : x)));

  const agir = async (enBase: () => Promise<unknown>, enMemoire: () => void, message: string, garder = false) => {
    setEnvoi(true);
    setErreur(null);
    try {
      if (source === "reelle") {
        await enBase();
        await lire();
      } else enMemoire();
      toast(message, "vert");
      if (!garder) setFenetre(null);
      return true;
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base a refusé l'action.");
      return false;
    } finally {
      setEnvoi(false);
    }
  };
  /* une modification de l'objet, de la note ou du fournisseur, hors fenêtre (le toast dit l'erreur) */
  const modifier = async (k: Commande, valeurs: Record<string, unknown>, enMemoire: (x: CommandeBrute) => CommandeBrute, message: string) => {
    try {
      if (source === "reelle") {
        await ecrireCommande(k.id, k.chantier_id, valeurs);
        await lire();
      } else changer(k.id, enMemoire);
      toast(message, "vert");
    } catch (e) {
      toast(e instanceof Error ? e.message : "La base a refusé la modification.", "rouge");
    }
  };

  const nouvelle = () => {
    const chantier = ch("chantier");
    const t = tableauDe(chantier);
    const delai = Number(ch("delai") || "5");
    const passage = t?.passages.find((p) => p.id === ch("passage")) ?? null;
    const four = fournisseurs.find((f) => f.id === ch("fournisseur")) ?? null;
    const aRendre = ch("a_rendre") === "oui";
    return agir(
      () =>
        ecrireCommande(null, chantier, {
          objet: ch("objet"), quantite_texte: ch("quantite") || null, fournisseur_id: four?.id ?? null, fournisseur_libelle: four ? null : ch("fournisseur_libre") || null,
          delai_jours: delai, passage_id: passage?.id ?? null, besoin_le: passage ? null : ch("besoin") || null, a_retourner: aRendre,
        }),
      () => {
        if (!chantier) throw new Error("Choisissez le chantier de la commande.");
        if (!ch("objet").trim()) throw new Error("Dites ce qui est commandé.");
        if (Number.isNaN(delai) || delai < 0 || delai > 120) throw new Error("Le délai du fournisseur va de 0 à 120 jours ouvrés.");
        setLocal((l) => [
          ...(l ?? []),
          {
            id: crypto.randomUUID(), chantier_id: chantier, lot_id: passage?.lot_id ?? null, lot_code: passage?.lot_code ?? null, passage_id: passage?.id ?? null, passage_tache: passage?.tache ?? null,
            fournisseur_id: four?.id ?? null, fournisseur_nom: four?.nom ?? (ch("fournisseur_libre").trim() || null), objet: ch("objet").trim(), quantite_texte: ch("quantite").trim() || null,
            reference: null, delai_jours: delai, besoin_le: passage ? null : ch("besoin") || null, statut: "a_commander", commandee_le: null, livraison_prevue: null, livree_le: null,
            note: null, motif: null, a_retourner: aRendre, retour_prevu: null, retourne_le: null, livraisons: [],
          },
        ]);
      },
      `« ${ch("objet").trim()} » ajouté à l'approvisionnement de ${nomChantier(chantier)}.`,
    );
  };

  const preparer = () => {
    const chantier = ch("chantier");
    const t = tableauDe(chantier);
    return agir(
      async () => {
        const r = await preparerListe(chantier);
        toast(`${r.creees} ligne${r.creees > 1 ? "s" : ""} ajoutée${r.creees > 1 ? "s" : ""}${r.deja ? `, ${r.deja} déjà dans la liste` : ""}.`, "neutre");
      },
      () => {
        if (!t) throw new Error("Choisissez le chantier dont le devis sert de liste.");
        const verifies = t.marches.filter((m) => m.statut === "verifie");
        if (!verifies.length) throw new Error("La liste se prépare depuis le marché vérifié : vérifiez d'abord le marché.");
        const lotsClient = new Set(t.lots.filter((l) => l.execution === "client").map((l) => l.id));
        const deja = (local ?? []).filter((k) => k.chantier_id === chantier && k.statut !== "annulee").map((k) => k.ligne_marche_id);
        const lignes = verifies
          .flatMap((m) => m.lignes)
          .filter((l) => l.lot_id && lotsClient.has(l.lot_id) && (l.nature === "ouvrage" || l.nature === "fourniture") && l.quantite && l.quantite > 0 && ["u", "ml", "m2", "m3", "kg", "t", "l"].includes(l.unite ?? "") && !deja.includes(l.id));
        setLocal((x) => [
          ...(x ?? []),
          ...lignes.map((l): CommandeBrute => {
            const p = t.passages.filter((y) => y.lot_id === l.lot_id && y.statut === "prevu").sort((a, b) => a.debut.localeCompare(b.debut))[0];
            return {
              id: crypto.randomUUID(), chantier_id: chantier, lot_id: l.lot_id, lot_code: t.lots.find((y) => y.id === l.lot_id)?.code ?? null, passage_id: p?.id ?? null, passage_tache: p?.tache ?? null,
              ligne_marche_id: l.id, fournisseur_id: null, fournisseur_nom: null, objet: l.designation.slice(0, 300), quantite: l.quantite, unite: l.unite, quantite_texte: qte(l.quantite, l.unite),
              reference: null, delai_jours: 5, besoin_le: null, statut: "a_commander", commandee_le: null, livraison_prevue: null, livree_le: null, note: null, motif: null,
              a_retourner: false, retour_prevu: null, retourne_le: null, livraisons: [],
            };
          }),
        ]);
      },
      "La liste est préparée depuis le devis : choisissez les fournisseurs, Daliro dit quand commander.",
    );
  };

  const commandee = (k: Commande) => {
    const four = fournisseurs.find((f) => f.id === ch("fournisseur")) ?? null;
    const libre = ch("fournisseur_libre").trim();
    const sans = !k.fournisseur_nom;
    return agir(
      async () => {
        if (sans && (four || libre)) await ecrireCommande(k.id, k.chantier_id, four ? { fournisseur_id: four.id } : { fournisseur_libelle: libre });
        return noterCommande(k.id, ch("promise"), ch("le") || auj, ch("reference") || null);
      },
      () => {
        if (sans && !four && !libre) throw new Error("Choisissez le fournisseur avant de commander.");
        if ((ch("le") || auj) > auj) throw new Error("Une commande se note passée au plus tard aujourd'hui.");
        if (!ch("promise") || ch("promise") < (ch("le") || auj)) throw new Error("La livraison promise est au plus tôt le jour de la commande.");
        changer(k.id, (x) => ({ ...x, statut: "commandee", commandee_le: ch("le") || auj, livraison_prevue: ch("promise"), reference: ch("reference") || x.reference, fournisseur_id: four?.id ?? x.fournisseur_id, fournisseur_nom: x.fournisseur_nom ?? four?.nom ?? libre }));
      },
      `« ${k.objet} » commandé, livraison promise le ${jour(ch("promise"))}.`,
    );
  };

  const reporter = (k: Commande) =>
    agir(
      () => noterCommande(k.id, ch("promise"), k.commandee_le ?? auj, k.reference),
      () => {
        if (!ch("promise") || ch("promise") < (k.commandee_le ?? auj)) throw new Error("La livraison promise est au plus tôt le jour de la commande.");
        changer(k.id, (x) => ({ ...x, livraison_prevue: ch("promise") }));
      },
      `Livraison de « ${k.objet} » reportée au ${jour(ch("promise"))}.`,
    );

  const recue = (k: Commande) => {
    const q = ch("qte").trim() ? Number(ch("qte").replace(",", ".")) : null;
    const bons = bonsOuverts(k.chantier_id);
    return agir(
      () => (bons ? recevoir(k.id, ch("le") || auj, q, ch("bon") || null, ch("note") || null) : noterLivraison(k.id, ch("le") || auj, ch("complete") !== "non", ch("note") || null)),
      () => {
        if ((ch("le") || auj) > auj) throw new Error("Une livraison ne se note pas dans le futur.");
        if (q !== null && (Number.isNaN(q) || q <= 0)) throw new Error("La quantité reçue est positive.");
        changer(k.id, (x) => {
          const livraisons = [...(x.livraisons ?? []), { id: crypto.randomUUID(), livree_le: ch("le") || auj, quantite: q, bon_reference: ch("bon") || null, piece_id: null, note: ch("note") || null }];
          const cumul = livraisons.reduce((t, y) => t + (y.quantite ?? 0), 0);
          const complete = x.quantite != null && livraisons.some((y) => y.quantite !== null) ? cumul >= x.quantite : ch("complete") !== "non";
          return { ...x, livraisons, statut: complete ? "livree" : "livree_partielle", livree_le: ch("le") || auj };
        });
      },
      `Réception de « ${k.objet} » notée${ch("bon") ? ` (bon ${ch("bon")})` : ""}.`,
    );
  };

  const rendu = (k: Commande) =>
    agir(
      () => noterRetour(k.id, ch("le") || auj, null),
      () => {
        if ((ch("le") || auj) > auj) throw new Error("Un retour ne se note pas dans le futur.");
        if (k.livree_le && (ch("le") || auj) < k.livree_le) throw new Error("Le retour est entre la livraison et aujourd'hui.");
        changer(k.id, (x) => ({ ...x, retourne_le: ch("le") || auj }));
      },
      `« ${k.objet} » rendu.`,
    );

  const retour = (k: Commande) =>
    agir(
      () => noterRetour(k.id, null, ch("prevu")),
      () => {
        if (!ch("prevu")) throw new Error("Donnez la date à laquelle le rendre.");
        changer(k.id, (x) => ({ ...x, retour_prevu: ch("prevu") }));
      },
      `Retour de « ${k.objet} » prévu le ${jour(ch("prevu"))}.`,
    );

  const annuler = (k: Commande) =>
    agir(
      () => annulerCommande(k.id, ch("motif")),
      () => {
        if (!ch("motif").trim()) throw new Error("Une annulation se fait avec son motif.");
        changer(k.id, (x) => ({ ...x, statut: "annulee", motif: ch("motif").trim() }));
      },
      `« ${k.objet} » annulé.`,
    ).then((ok) => ok && aller(onglet));

  /* l'étape suivante d'une commande (la case « To do » de Plain) */
  const etape = (k: Commande): { libelle: string; jouer: () => void } | null => {
    if (k.statut === "a_commander") return { libelle: "Noter commandée", jouer: () => ouvrir({ type: "commandee", k }, { le: auj, promise: k.echeances.livrer_avant && k.echeances.livrer_avant >= auj ? k.echeances.livrer_avant : "" }) };
    if (k.statut === "commandee" || k.statut === "livree_partielle") return { libelle: "Noter reçue", jouer: () => ouvrir({ type: "recue", k }, { le: auj, complete: "oui" }) };
    if (k.a_retourner && !k.retourne_le) return { libelle: "Noter rendu", jouer: () => ouvrir({ type: "rendu", k }, { le: auj }) };
    return null;
  };

  const copier = (texte: string, message: string) =>
    navigator.clipboard.writeText(texte).then(
      () => toast(message, "vert"),
      () => toast("Le texte n'a pas pu être copié.", "rouge"),
    );
  const pourAssistant = (k: Commande) =>
    [
      `Commande du chantier « ${nomChantier(k.chantier_id)} » : ${k.objet}${k.quantite_texte ? ` (${k.quantite_texte})` : ""}.`,
      `Fournisseur : ${k.fournisseur_nom ?? "à choisir"}. État : ${LIBELLES[k.echeances.etat]} — ${echeance(k, auj).phrase}.`,
      k.passage_tache ? `Pour le passage « ${k.passage_tache} » (besoin le ${jour(k.echeances.besoin_le)}).` : k.echeances.besoin_le ? `Besoin le ${jour(k.echeances.besoin_le)}.` : "",
      `Commander avant le ${jour(k.echeances.commander_avant)}, livrer avant le ${jour(k.echeances.livrer_avant)}${k.livraison_prevue ? `, livraison promise le ${jour(k.livraison_prevue)}` : ""}.`,
      k.note ? `Note : ${k.note}` : "",
      "Que faire maintenant (commander, relancer le fournisseur, recaler le passage) ?",
    ]
      .filter(Boolean)
      .join("\n");

  const exporter = () => {
    const lignes = visibles
      .filter((k) => k.statut !== "annulee")
      .map((k) => ({ k, chantier: nomChantier(k.chantier_id), phrase: echeance(k, auj).phrase }));
    const url = URL.createObjectURL(new Blob([versCsv(lignes)], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `approvisionnement-${auj}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast(`${lignes.length} commande${lignes.length > 1 ? "s" : ""} exportée${lignes.length > 1 ? "s" : ""}.`, "vert");
  };

  /* T : nouvelle commande ; Échap : refermer le volet */
  useEffect(() => {
    const touche = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || (e.target as HTMLElement).closest("input, textarea, select, [role=dialog]")) return;
      if (e.key === "t" || e.key === "T") {
        e.preventDefault();
        setErreur(null);
        setChamps({ chantier: filtre ?? "", delai: "5" });
        setFenetre({ type: "nouvelle" });
      }
      if (e.key === "Escape" && ouverteId) {
        const q = new URLSearchParams();
        if (onglet !== "commander") q.set("onglet", onglet);
        if (filtre) q.set("chantier", filtre);
        router.replace(`${ICI}${q.size ? `?${q}` : ""}`, { scroll: false });
      }
    };
    document.addEventListener("keydown", touche);
    return () => document.removeEventListener("keydown", touche);
  }, [filtre, onglet, ouverteId, router]);

  const avatar = (nom: string | null) => (
    <span className="dalp-carre" style={{ background: nom ? teinte(nom) : "var(--p-icone-2)" }} title={nom ?? "Fournisseur à choisir"}>
      {nom ? initiales(nom) : "?"}
    </span>
  );
  const pastille = (id: string, lien = true) => {
    const corps = (
      <>
        <span className="dalp-vignette">
          <DalIcone nom="Crane" taille={14} />
        </span>
        {nomChantier(id)}
      </>
    );
    return lien ? (
      <Link className="dalp-pastille" href={`${RACINE}/daliro/chantiers/${encodeURIComponent(id)}?onglet=terrain&partie=appro`}>
        {corps}
      </Link>
    ) : (
      <span className="dalp-pastille">{corps}</span>
    );
  };
  const enLecture = source === "reelle" && reel === null;
  const modifiable = (k: Commande) => k.statut === "a_commander" || k.statut === "commandee";
  const pourNouvelle = chantiers.filter((c) => EN_COURS.includes(c.statut));
  const tNouvelle = tableauDe(ch("chantier"));
  const listeOuverte = !!tNouvelle && fonctionOuverte(tNouvelle, "liste_cadencee");

  const etapeOuverte = ouverte ? etape(ouverte) : null;
  const eOuverte = ouverte ? echeance(ouverte, auj) : null;

  return (
    <div className="dalp">
      <main className="dalp-carte">
        <div className="dalp-taches" data-ouvert={!!ouverte}>
          <div className="dalp-tliste">
            <header className="dalp-ttete">
              <h1 className="dalp-titre">Approvisionnement</h1>
              {/* 06/11 — la finition des autres pages de DALIRO : « Nouvelle commande » en haut à droite, comme « Nouvelle tâche » d'À faire */}
              <button type="button" className="dalp-ajout" onClick={() => ouvrir({ type: "nouvelle" }, { chantier: filtre ?? "", delai: "5" })} aria-keyshortcuts="T" title="Nouvelle commande (T)">
                <DalIcone nom="Plus" taille={14} />
                <span>Nouvelle commande</span>
              </button>
              {ouverte ? (
                <button type="button" className="dalp-icone" aria-label="Masquer le volet" title="Masquer le volet" onClick={() => aller(onglet)}>
                  <PlainIcone nom="Ecran" />
                </button>
              ) : null}
            </header>
            <section aria-label="Commandes de toute l'entreprise">
              <div className="dalp-onglets">
                {ouverte ? null : (
                  <div className="dalp-segments" role="tablist">
                    {ONGLETS.map((o) => (
                      <button key={o.cle} type="button" role="tab" aria-selected={onglet === o.cle} className="dalp-segment" onClick={() => aller(o.cle)}>
                        <PlainIcone nom={o.faite ? "Faite" : "AFaire"} className={o.faite ? "dalp-faite" : "dalp-afaire"} />
                        {o.libelle} <small>{o.nb}</small>
                      </button>
                    ))}
                  </div>
                )}
                <div ref={boiteSeg} className={ouverte ? undefined : "dalp-menu-segments"} style={{ position: "relative" }}>
                  <button type="button" className="dalp-fantome" style={{ marginLeft: 0 }} aria-haspopup="menu" aria-expanded={segOuvert} onClick={() => ouvrirSeg((o) => !o)}>
                    <PlainIcone nom={courant.faite ? "Faite" : "AFaire"} className={courant.faite ? "dalp-faite" : "dalp-afaire"} />
                    {courant.libelle} <small>{courant.nb}</small>
                    <DalIcone nom="Chevron" taille={14} style={{ transform: "rotate(90deg)" }} />
                  </button>
                  {segOuvert ? (
                    <div className="dalp-menu" role="menu" style={{ top: 38, left: 0, width: 180 }}>
                      {ONGLETS.map((o) => (
                        <button key={o.cle} type="button" role="menuitemradio" aria-checked={onglet === o.cle} className="dalp-menu-option dalp-menu-option--grand" onClick={() => (aller(o.cle, ouverteId), ouvrirSeg(false))}>
                          <PlainIcone nom={o.faite ? "Faite" : "AFaire"} taille={14} />
                          <span style={{ flex: 1 }}>{o.libelle}</span>
                          <small>{o.nb}</small>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
                {filtre ? (
                  <button type="button" className="dalp-pastille dalp-filtre" title="Voir tous les chantiers" onClick={() => aller(onglet, ouverteId, null)}>
                    <span className="dalp-vignette">
                      <PlainIcone nom="Batiment" taille={12} />
                    </span>
                    {nomChantier(filtre)}
                    <PlainIcone nom="Croix" taille={12} />
                  </button>
                ) : null}
                <div ref={boiteTri} style={{ position: "relative", marginLeft: "auto" }}>
                  <button type="button" className="dalp-fantome" aria-haspopup="menu" aria-expanded={triOuvert} onClick={() => ouvrirTri((o) => !o)}>
                    <PlainIcone nom="Tri" />
                    {tri === "echeance" ? "Échéance" : "Urgence"}
                    <DalIcone nom="Chevron" taille={14} style={{ transform: "rotate(90deg)" }} />
                  </button>
                  {triOuvert ? (
                    <div className="dalp-menu" role="menu" style={{ top: 38, right: 0, width: 200 }}>
                      {(
                        [
                          ["echeance", "Échéance"],
                          ["urgence", "Urgence"],
                        ] as [Tri, string][]
                      ).map(([k, l]) => (
                        <button key={k} type="button" role="menuitemradio" aria-checked={tri === k} className="dalp-menu-option dalp-menu-option--grand" onClick={() => (setTri(k), ouvrirTri(false))}>
                          <span style={{ flex: 1 }}>{l}</span>
                          {tri === k ? "✓" : ""}
                        </button>
                      ))}
                      <div className="dalp-menu-sep" role="separator" />
                      <button type="button" role="menuitem" className="dalp-menu-option dalp-menu-option--grand" onClick={() => (exporter(), ouvrirTri(false))}>
                        <span style={{ flex: 1 }}>Exporter la liste (CSV)</span>
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
              <ul>
                {enLecture ? <li className="dalp-tvide">Lecture de l&apos;approvisionnement des chantiers…</li> : null}
                {liste.map(({ k, e }) => {
                  const faite = onglet === "recu" && !resteAFaire(k);
                  return (
                    <li key={k.id} className="dalp-tache" aria-current={k.id === ouverteId} data-faite={faite ? "" : undefined}>
                      <Link className="dalp-tligne" href={adresse(onglet, k.id)} replace scroll={false}>
                        <span className="dalp-tcase">
                          <PlainIcone nom={faite ? "Faite" : "AFaire"} className={faite ? "dalp-faite" : "dalp-afaire"} />
                        </span>
                        <span className="dalp-ttitre">
                          <span className="dalp-tid">{e.phrase}</span>
                          <b>{k.objet}</b>
                        </span>
                        <span className="dalp-tcompte">{pastille(k.chantier_id, false)}</span>
                        <span className="dalp-assigne">{avatar(k.fournisseur_nom)}</span>
                      </Link>
                    </li>
                  );
                })}
                {!enLecture && !liste.length ? (
                  <li className="dalp-tvide">{onglet === "commander" ? "Rien à commander : chaque besoin des passages est commandé." : onglet === "livrer" ? "Aucune livraison attendue." : "Rien de reçu pour l'instant."}</li>
                ) : null}
              </ul>
            </section>
          </div>

          {ouverte && eOuverte ? (
            <aside className="dalp-tvolet" aria-label={ouverte.objet}>
              <div className="dalp-tvolet-tete">
                <span>{ouverte.reference ?? (ouverte.lot_code ? `Lot ${ouverte.lot_code}` : "Commande")}</span>
                <span style={{ display: "flex" }}>
                  <div ref={boitePlus} style={{ position: "relative" }}>
                    <button type="button" className="dalp-icone" aria-label="Actions de la commande" title="Actions de la commande" aria-haspopup="menu" aria-expanded={plusOuvert} onClick={() => ouvrirPlus((o) => !o)}>
                      <PlainIcone nom="Points" />
                    </button>
                    {plusOuvert ? (
                      <div className="dalp-menu" role="menu" style={{ top: 36, right: 0, width: 230 }}>
                        {ouverte.statut === "commandee" ? (
                          <button type="button" role="menuitem" className="dalp-menu-option" onClick={() => (ouvrirPlus(false), ouvrir({ type: "reporter", k: ouverte }, { promise: ouverte.livraison_prevue ?? "" }))}>
                            <DalIcone nom="Calendar" taille={14} /> Reporter la livraison
                          </button>
                        ) : null}
                        {ouverte.a_retourner && !ouverte.retourne_le && (ouverte.statut === "livree" || ouverte.statut === "livree_partielle") ? (
                          <button type="button" role="menuitem" className="dalp-menu-option" onClick={() => (ouvrirPlus(false), ouvrir({ type: "retour", k: ouverte }, { prevu: ouverte.echeances.retour_prevu ?? "" }))}>
                            <DalIcone nom="Calendar" taille={14} /> Reporter le retour
                          </button>
                        ) : null}
                        <Link role="menuitem" className="dalp-menu-option" href={`${RACINE}/daliro/chantiers/${encodeURIComponent(ouverte.chantier_id)}?onglet=terrain&partie=appro`} onClick={() => ouvrirPlus(false)}>
                          <DalIcone nom="Project" taille={14} /> Ouvrir la fiche du chantier
                        </Link>
                        <button type="button" role="menuitem" className="dalp-menu-option" onClick={() => (ouvrirPlus(false), void copier(`${window.location.origin}${adresse(onglet, ouverte.id)}`, "Lien copié."))}>
                          <DalIcone nom="Link" taille={14} /> Copier le lien
                        </button>
                        {ouverte.statut !== "livree" && ouverte.statut !== "annulee" ? (
                          <>
                            <div className="dalp-menu-sep" role="separator" />
                            <button type="button" role="menuitem" className="dalp-menu-option" onClick={() => (ouvrirPlus(false), ouvrir({ type: "annuler", k: ouverte }))}>
                              <DalIcone nom="StatusCanceled" taille={14} /> Annuler la commande…
                            </button>
                          </>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                  <button type="button" className="dalp-icone" aria-label="Fermer" title="Fermer" onClick={() => aller(onglet)}>
                    <PlainIcone nom="Croix" />
                  </button>
                </span>
              </div>
              <div className="dalp-tactions">
                {etapeOuverte ? (
                  <button type="button" className="dalp-tstatut" title={etapeOuverte.libelle} onClick={etapeOuverte.jouer}>
                    <PlainIcone nom="AFaire" className="dalp-afaire" />
                    {LIBELLES[ouverte.echeances.etat]}
                  </button>
                ) : (
                  <span className="dalp-tstatut">
                    <PlainIcone nom="Faite" className="dalp-faite" />
                    {ouverte.echeances.retour === "rendu" ? "Rendue" : LIBELLES[ouverte.echeances.etat]}
                  </span>
                )}
                <div ref={boiteFour} style={{ position: "relative" }}>
                  {modifiable(ouverte) ? (
                    <button type="button" className="dalp-tbouton" aria-haspopup="menu" aria-expanded={fourOuvert} onClick={() => ouvrirFour((o) => !o)}>
                      {avatar(ouverte.fournisseur_nom)}
                      {ouverte.fournisseur_nom ?? "Choisir le fournisseur"}
                    </button>
                  ) : (
                    <span className="dalp-tbouton">
                      {avatar(ouverte.fournisseur_nom)}
                      {ouverte.fournisseur_nom ?? "Sans fournisseur"}
                    </span>
                  )}
                  {fourOuvert ? (
                    <div className="dalp-menu" role="menu" style={{ top: 38, left: 0, width: 240 }}>
                      {fournisseurs.length ? (
                        fournisseurs.map((f) => (
                          <button
                            key={f.id}
                            type="button"
                            role="menuitemradio"
                            aria-checked={ouverte.fournisseur_id === f.id}
                            className="dalp-menu-option"
                            onClick={() => {
                              ouvrirFour(false);
                              void modifier(ouverte, { fournisseur_id: f.id }, (x) => ({ ...x, fournisseur_id: f.id, fournisseur_nom: f.nom }), `Fournisseur de « ${ouverte.objet} » : ${f.nom}.`);
                            }}
                          >
                            {avatar(f.nom)}
                            <span style={{ flex: 1 }}>{f.nom}</span>
                            {ouverte.fournisseur_id === f.id ? "✓" : ""}
                          </button>
                        ))
                      ) : (
                        <p className="dalp-menu-option" style={{ color: "var(--p-texte-2)", whiteSpace: "normal" }}>
                          Aucun fournisseur dans l&apos;annuaire.
                        </p>
                      )}
                      <div className="dalp-menu-sep" role="separator" />
                      <Link role="menuitem" className="dalp-menu-option" href={`${RACINE}/daliro/annuaire`} onClick={() => ouvrirFour(false)}>
                        <DalIcone nom="Users" taille={14} /> Voir l&apos;annuaire
                      </Link>
                    </div>
                  ) : null}
                </div>
                <button type="button" className="dalp-tbouton dalp-tbouton--agent" onClick={() => void copier(pourAssistant(ouverte), "Copié : collez-le dans l'assistant.")}>
                  <DalIcone nom="Agent" taille={18} />
                  Copier pour l&apos;assistant
                </button>
              </div>
              <ChampVolet
                key={`objet-${ouverte.id}-${ouverte.objet}`}
                className="dalp-tgrand"
                valeur={ouverte.objet}
                lecture={!modifiable(ouverte)}
                indication="Ce qui est commandé"
                obligatoire
                enregistrer={(v) => modifier(ouverte, { objet: v }, (x) => ({ ...x, objet: v }), "Objet de la commande modifié.")}
              />
              <p className="dalp-tcree">
                {ouverte.statut === "a_commander"
                  ? `À commander avant le ${jour(ouverte.echeances.commander_avant)}`
                  : ouverte.statut === "livree"
                    ? `Reçue le ${jour(ouverte.livree_le)}`
                    : ouverte.statut === "annulee"
                      ? `Annulée : ${ouverte.motif ?? ""}`
                      : `Commandée le ${jour(ouverte.commandee_le)}`}
              </p>
              <ChampVolet
                key={`note-${ouverte.id}-${ouverte.note ?? ""}`}
                className="dalp-tdesc dalp-tnote"
                valeur={ouverte.note ?? ""}
                lecture={!modifiable(ouverte)}
                indication={modifiable(ouverte) ? "Ajouter une note (bon, manquants, consignes de livraison)" : "Sans note"}
                enregistrer={(v) => modifier(ouverte, { note: v }, (x) => ({ ...x, note: v || null }), "Note enregistrée.")}
              />
              <hr />
              <dl className="dalp-tdl">
                <dt>Chantier</dt>
                <dd>{pastille(ouverte.chantier_id)}</dd>
                <dt>Passage</dt>
                <dd>{ouverte.passage_tache ? `${ouverte.lot_code ? `Lot ${ouverte.lot_code} · ` : ""}${ouverte.passage_tache}, le ${jour(ouverte.echeances.besoin_le)}` : ouverte.echeances.besoin_le ? `Besoin le ${jour(ouverte.echeances.besoin_le)}` : "Aucun passage rattaché"}</dd>
                <dt>Quantité</dt>
                <dd>{ouverte.quantite_texte ?? (qte(ouverte.quantite, ouverte.unite) || "—")}</dd>
                <dt>Échéance</dt>
                <dd>{eOuverte.phrase}</dd>
                <dt>Commander</dt>
                <dd>
                  avant le {jour(ouverte.echeances.commander_avant)} · délai {ouverte.delai_jours} j ouvrés
                </dd>
                <dt>Livrer</dt>
                <dd>
                  avant le {jour(ouverte.echeances.livrer_avant)}
                  {ouverte.livraison_prevue ? ` · promise le ${jour(ouverte.livraison_prevue)}` : ""}
                </dd>
                <dt>Livraisons</dt>
                <dd style={{ flexDirection: "column", alignItems: "flex-start", justifyContent: "center", gap: 2 }}>
                  {(ouverte.livraisons ?? []).length
                    ? (ouverte.livraisons ?? []).map((l) => (
                        <span key={l.id}>
                          {jour(l.livree_le)}
                          {l.bon_reference ? ` · bon ${l.bon_reference}` : ""}
                          {l.quantite != null ? ` · ${qte(l.quantite, ouverte.unite)}` : ""}
                          {l.note ? ` · ${l.note}` : ""}
                        </span>
                      ))
                    : "Rien de reçu"}
                  {ouverte.echeances.ecart != null && ouverte.echeances.ecart !== 0 ? <span>{ouverte.echeances.ecart < 0 ? `Manque ${qte(-ouverte.echeances.ecart, ouverte.unite)}` : `Excédent de ${qte(ouverte.echeances.ecart, ouverte.unite)}`}</span> : null}
                </dd>
                {ouverte.a_retourner ? (
                  <>
                    <dt>Retour</dt>
                    <dd>{ouverte.retourne_le ? `Rendu le ${jour(ouverte.retourne_le)}` : `À rendre le ${jour(ouverte.echeances.retour_prevu)}`}</dd>
                  </>
                ) : null}
              </dl>
            </aside>
          ) : null}
        </div>
      </main>

      <ModalOverlay isOpen={fenetre !== null} onOpenChange={(o) => !o && !envoi && setFenetre(null)} isDismissable={!envoi} className="v2-jetons v2-voile">
        <Modal className="v2-modale">
          <Dialog className="v2-modale-dialogue">
            {fenetre ? (
              <FenetreCommande
                fenetre={fenetre}
                ch={ch}
                pose={pose}
                auj={auj}
                erreur={erreur}
                envoi={envoi}
                fournisseurs={fournisseurs}
                chantiers={pourNouvelle}
                tableau={tNouvelle}
                listeOuverte={listeOuverte}
                bons={fenetre.type === "recue" && bonsOuverts(fenetre.k.chantier_id)}
                preparer={() => void preparer()}
                valider={() =>
                  void (fenetre.type === "nouvelle"
                    ? nouvelle()
                    : fenetre.type === "commandee"
                      ? commandee(fenetre.k)
                      : fenetre.type === "recue"
                        ? recue(fenetre.k)
                        : fenetre.type === "rendu"
                          ? rendu(fenetre.k)
                          : fenetre.type === "reporter"
                            ? reporter(fenetre.k)
                            : fenetre.type === "retour"
                              ? retour(fenetre.k)
                              : annuler(fenetre.k))
                }
              />
            ) : null}
          </Dialog>
        </Modal>
      </ModalOverlay>
    </div>
  );
}

/* Le titre et la description du volet : des zones de texte sans bordure (Plain), enregistrées en quittant le champ. */
function ChampVolet({ valeur, lecture, indication, className, obligatoire, enregistrer }: { valeur: string; lecture: boolean; indication: string; className: string; obligatoire?: boolean; enregistrer: (v: string) => void }) {
  const [v, setV] = useState(valeur);
  const zone = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const z = zone.current;
    if (!z) return;
    z.style.height = "auto";
    z.style.height = `${z.scrollHeight}px`;
  }, [v]);
  return (
    <textarea
      ref={zone}
      className={`dalp-tzone ${className}`}
      rows={1}
      value={v}
      readOnly={lecture}
      placeholder={indication}
      aria-label={indication}
      maxLength={obligatoire ? 300 : 500}
      onChange={(e) => setV(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && obligatoire) {
          e.preventDefault();
          e.currentTarget.blur();
        }
        if (e.key === "Escape") {
          setV(valeur);
          e.currentTarget.blur();
        }
      }}
      onBlur={() => {
        const n = v.trim();
        if (n === valeur.trim()) return;
        if (obligatoire && !n) return setV(valeur);
        enregistrer(n);
      }}
    />
  );
}

function FenetreCommande({
  fenetre, ch, pose, auj, erreur, envoi, fournisseurs, chantiers, tableau, listeOuverte, bons, preparer, valider,
}: {
  fenetre: NonNullable<Fenetre>;
  ch: (k: string) => string;
  pose: (k: string, v: string) => void;
  auj: string;
  erreur: string | null;
  envoi: boolean;
  fournisseurs: { id: string; nom: string }[];
  chantiers: { id: string; nom: string }[];
  tableau: Tableau | null;
  listeOuverte: boolean;
  bons: boolean;
  preparer: () => void;
  valider: () => void;
}) {
  const k = fenetre.type === "nouvelle" ? null : fenetre.k;
  const titre =
    fenetre.type === "nouvelle" ? "Nouvelle commande"
    : fenetre.type === "commandee" ? `Commandé : ${k!.objet}`
    : fenetre.type === "recue" ? `Reçu : ${k!.objet}`
    : fenetre.type === "rendu" ? `Rendu : ${k!.objet}`
    : fenetre.type === "reporter" ? `Reporter la livraison : ${k!.objet}`
    : fenetre.type === "retour" ? `Reporter le retour : ${k!.objet}`
    : `Annuler la commande « ${k!.objet} » ?`;
  const texte =
    fenetre.type === "nouvelle" ? "Rattachée au passage qui en a besoin, elle se recale avec lui ; le délai du fournisseur se compte en jours ouvrés."
    : fenetre.type === "commandee" ? `À livrer avant le ${jour(k!.echeances.livrer_avant)}.`
    : fenetre.type === "recue" ? (bons ? (k!.quantite != null ? `Commandé : ${qte(k!.quantite, k!.unite)}. La quantité du bon est comparée à la commande ; ce qui manque reste attendu.` : "Une livraison partielle laisse la commande ouverte pour le reste.") : "La livraison est notée ; le rapprochement du bon avec la commande est compris dans la formule Entreprise.")
    : fenetre.type === "rendu" ? "Le matériel quitte le chantier : la location s'arrête."
    : fenetre.type === "reporter" ? `Le fournisseur promet une autre date. Il la faut au plus tard le ${jour(k!.echeances.livrer_avant)} ; après, la commande passe « trop tardive » et le passage est à recaler.`
    : fenetre.type === "retour" ? "La location continue jusqu'à la nouvelle date : chaque jour se paie."
    : "La commande reste visible dans la fiche du chantier, marquée annulée, avec son motif. Elle ne se rouvre pas.";
  const bouton =
    fenetre.type === "nouvelle" ? "Ajouter la commande"
    : fenetre.type === "commandee" ? "Noter commandée"
    : fenetre.type === "recue" ? "Noter reçue"
    : fenetre.type === "rendu" ? "Noter rendu"
    : fenetre.type === "reporter" ? "Reporter la livraison"
    : fenetre.type === "retour" ? "Reporter le retour"
    : "Annuler la commande";
  const champFournisseur = (
    <>
      <label className="v2-libelle">
        Fournisseur de l&apos;annuaire
        <span className="v2-champ">
          <select value={ch("fournisseur")} onChange={(e) => pose("fournisseur", e.target.value)}>
            <option value="">— en clair —</option>
            {fournisseurs.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nom}
              </option>
            ))}
          </select>
        </span>
      </label>
      {!ch("fournisseur") ? (
        <label className="v2-libelle">
          Fournisseur (en clair)
          <span className="v2-champ">
            <input maxLength={120} value={ch("fournisseur_libre")} onChange={(e) => pose("fournisseur_libre", e.target.value)} placeholder="Point P Lyon 3" />
          </span>
        </label>
      ) : null}
    </>
  );
  const date = (cle: string, libelle: string, max?: string) => (
    <label className="v2-libelle">
      {libelle}
      <span className="v2-champ">
        <input type="date" max={max} value={ch(cle)} onChange={(e) => pose(cle, e.target.value)} />
      </span>
    </label>
  );
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        valider();
      }}
    >
      <div className="v2-modale-corps">
        <Heading slot="title">{titre}</Heading>
        <p>{texte}</p>
        <div className="v2-grille-champs" style={{ gridTemplateColumns: "minmax(0, 1fr)" }}>
          {fenetre.type === "nouvelle" ? (
            <>
              <label className="v2-libelle">
                Chantier
                <span className="v2-champ">
                  <select value={ch("chantier")} onChange={(e) => (pose("chantier", e.target.value), pose("passage", ""))} required>
                    <option value="">Choisir le chantier</option>
                    {chantiers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nom}
                      </option>
                    ))}
                  </select>
                </span>
              </label>
              <label className="v2-libelle">
                Quoi
                <span className="v2-champ">
                  <input maxLength={300} value={ch("objet")} onChange={(e) => pose("objet", e.target.value)} placeholder="Fenêtres PVC sur mesure" />
                </span>
              </label>
              <label className="v2-libelle">
                Quantité
                <span className="v2-champ">
                  <input maxLength={120} value={ch("quantite")} onChange={(e) => pose("quantite", e.target.value)} placeholder="14 châssis" />
                </span>
              </label>
              <label className="v2-libelle">
                Délai du fournisseur (jours ouvrés)
                <span className="v2-champ">
                  <input inputMode="numeric" value={ch("delai")} onChange={(e) => pose("delai", e.target.value)} />
                </span>
              </label>
              {champFournisseur}
              <label className="v2-libelle">
                Pour le passage
                <span className="v2-champ">
                  <select value={ch("passage")} onChange={(e) => pose("passage", e.target.value)} disabled={!tableau}>
                    <option value="">— une date de besoin —</option>
                    {(tableau?.passages ?? [])
                      .filter((p) => p.statut === "prevu")
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.tache ?? "Passage"} ({jour(p.debut)})
                        </option>
                      ))}
                  </select>
                </span>
              </label>
              {!ch("passage") ? date("besoin", "Besoin le") : null}
              <label className="v2-libelle" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <input type="checkbox" checked={ch("a_rendre") === "oui"} onChange={(e) => pose("a_rendre", e.target.checked ? "oui" : "")} /> Matériel à rendre (location, consigne)
              </label>
            </>
          ) : null}
          {fenetre.type === "commandee" ? (
            <>
              {!k!.fournisseur_nom ? champFournisseur : null}
              {date("le", "Commandé le", auj)}
              {date("promise", "Livraison promise")}
              <label className="v2-libelle">
                N° de commande
                <span className="v2-champ">
                  <input maxLength={60} value={ch("reference")} onChange={(e) => pose("reference", e.target.value)} />
                </span>
              </label>
            </>
          ) : null}
          {fenetre.type === "recue" ? (
            <>
              {date("le", "Reçu le", auj)}
              {bons && k!.quantite != null ? (
                <label className="v2-libelle">
                  Quantité reçue ({k!.unite ? (UNITES[k!.unite] ?? k!.unite) : "u"})
                  <span className="v2-champ">
                    <input inputMode="decimal" value={ch("qte")} onChange={(e) => pose("qte", e.target.value)} />
                  </span>
                </label>
              ) : (
                <label className="v2-libelle">
                  Livraison
                  <span className="v2-champ">
                    <select value={ch("complete")} onChange={(e) => pose("complete", e.target.value)}>
                      <option value="oui">Complète</option>
                      <option value="non">En partie (le reste est attendu)</option>
                    </select>
                  </span>
                </label>
              )}
              {bons ? (
                <label className="v2-libelle">
                  N° du bon de livraison
                  <span className="v2-champ">
                    <input maxLength={60} value={ch("bon")} onChange={(e) => pose("bon", e.target.value)} placeholder="BL-5531" />
                  </span>
                </label>
              ) : null}
              <label className="v2-libelle">
                Note (bon de livraison, manquants)
                <span className="v2-champ">
                  <input maxLength={500} value={ch("note")} onChange={(e) => pose("note", e.target.value)} placeholder="10 châssis sur 14" />
                </span>
              </label>
            </>
          ) : null}
          {fenetre.type === "rendu" ? date("le", "Rendu le", auj) : null}
          {fenetre.type === "reporter" ? date("promise", "Nouvelle livraison promise") : null}
          {fenetre.type === "retour" ? date("prevu", "À rendre le") : null}
          {fenetre.type === "annuler" ? (
            <label className="v2-libelle">
              Motif (obligatoire)
              <span className="v2-champ">
                <textarea rows={3} maxLength={300} value={ch("motif")} onChange={(e) => pose("motif", e.target.value)} placeholder="Pris au dépôt" />
              </span>
            </label>
          ) : null}
        </div>
        {erreur ? (
          <Note teinte="rouge" role="alert">
            <strong>Refusé.</strong> {erreur}
          </Note>
        ) : null}
      </div>
      <div className="v2-modale-pied">
        {fenetre.type === "nouvelle" && listeOuverte ? (
          <button type="button" className="v2-btn v2-btn--petit" style={{ marginRight: "auto" }} disabled={envoi || !ch("chantier")} onClick={preparer}>
            Préparer la liste depuis le devis
          </button>
        ) : null}
        <Button className="v2-btn v2-btn--petit" slot="close" isDisabled={envoi}>
          {fenetre.type === "annuler" ? "Garder la commande" : "Fermer"}
        </Button>
        <button type="submit" className="v2-btn v2-btn--petit v2-btn--primaire" disabled={envoi}>
          {envoi ? "Enregistrement…" : bouton}
        </button>
      </div>
    </form>
  );
}
