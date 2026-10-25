"use client";

/* ══════════════════════════════════════════════════════════════════════
   L'approvisionnement du chantier (06/10/2026, session B6, b6_22)

   Chaque commande est rattachée au passage qui en a besoin : « livrer
   avant » = le jour ouvré qui précède son début, « commander avant » =
   moins le délai du fournisseur (jours ouvrés). Un passage recalé déplace
   ces dates. À commander vite, commande en retard, livraison prévue trop
   tard, livraison attendue : la base le dit, l'écran le montre. En
   exemple, les mêmes règles en mémoire.

   b6_23 : la liste se prépare depuis le devis vérifié (quantités du
   marché, passages du planning) ; chaque bon de livraison est comparé à
   la quantité commandée (manquant, excédent) ; le matériel loué porte sa
   date de retour.

   b6_60 : la livraison est proposée le jour de la pose, le jour où elle
   sert ; promise avant, elle est « trop tôt » (stockage sur site).

   b6_61 à b6_63 (DAL-09, 25/10/2026) : sous chaque commande, la demande au
   fournisseur de livrer le jour de la pose (préparée, à valider, partie,
   réponse à lire, acceptée, refusée, sans canal) et le bon de livraison lu
   sur sa photo (en lecture, à confirmer, à vérifier, écarté). Le bureau
   demande la livraison, note la réponse reçue autrement, dépose la photo du
   bon, confirme ou écarte ce qui a été lu. L'écran ne montre que ce que
   btp_appro_chantier rend ; rien n'est noté reçu sans une personne.
   ══════════════════════════════════════════════════════════════════════ */

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { Camera, ListChecks, PackageCheck, Plus, Truck } from "lucide-react";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import { aujourdHui } from "../exemples/socle";
import type { Source } from "../source";
import { dateCourte, dateHeure } from "../format";
import { Avis, Pastille, type Teinte } from "../ui";
import { annulerCommande, chargerAppro, confirmerBon, demanderLivraison, deposerBon, ecarterBon, ecrireCommande, MIMES_BON, mimeBon, noterCommande, noterLivraison,
         noterReponseFournisseur, noterRetour, preparerListe, recevoir } from "./portes";
import { APPRO_EXEMPLE } from "./exemples";
import { formuleQuiOuvre, ouverte } from "./fonctions";
import { jourOuvre } from "./recalage";
import type { Appro, BonLu, Commande, DemandeLivraison, EtatCommande, Tableau } from "./types";

const ETATS: Record<EtatCommande, { libelle: string; teinte: Teinte }> = {
  a_commander: { libelle: "À commander", teinte: "gris" },
  a_commander_vite: { libelle: "À commander vite", teinte: "ambre" },
  commande_en_retard: { libelle: "Commande en retard", teinte: "rouge" },
  commandee: { libelle: "Commandée", teinte: "bleu" },
  livraison_tardive: { libelle: "Livraison tardive", teinte: "rouge" },
  livraison_trop_tot: { libelle: "Trop tôt : stockage", teinte: "ambre" },
  livraison_attendue: { libelle: "Livraison attendue", teinte: "ambre" },
  livree_partielle: { libelle: "Livrée en partie", teinte: "ambre" },
  livree: { libelle: "Livrée", teinte: "vert" },
  annulee: { libelle: "Annulée", teinte: "gris" },
};

const plus = (iso: string, n: number) => { const [a, m, j] = iso.split("-").map(Number); const d = new Date(a, m - 1, j + n); return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, "0")}-${`${d.getDate()}`.padStart(2, "0")}`; };
function decalerOuvres(iso: string, n: number): string {
  let v = iso;
  let reste = Math.abs(n);
  const pas = n < 0 ? -1 : 1;
  while (reste > 0) { v = plus(v, pas); if (jourOuvre(v)) reste--; }
  return v;
}
const joursEntre = (de: string, a: string) => { const j = (iso: string) => { const [x, m, d] = iso.split("-").map(Number); return Date.UTC(x, m - 1, d); }; return Math.round((j(a) - j(de)) / 86400000); };

/* Les échéances, comme private.btp_echeances_commande (b6_60). */
function echeances(k: Omit<Commande, "echeances">, tableau: Tableau, jour: string): Commande["echeances"] {
  const p = k.passage_id ? tableau.passages.find((x) => x.id === k.passage_id && x.statut !== "annule") : null;
  const besoin = p?.debut ?? k.besoin_le;
  const livrer = besoin ?? null;
  const commander = livrer ? decalerOuvres(livrer, -k.delai_jours) : null;
  const recus = (k.livraisons ?? []).filter((l) => l.quantite !== null);
  const livre = recus.length ? recus.reduce((t, l) => t + (l.quantite ?? 0), 0) : null;
  const etat: EtatCommande =
    k.statut === "livree" || k.statut === "annulee" ? k.statut
    : k.statut === "a_commander" && commander && commander < jour ? "commande_en_retard"
    : k.statut === "a_commander" && commander && commander <= decalerOuvres(jour, 2) ? "a_commander_vite"
    : k.statut === "a_commander" ? "a_commander"
    : k.statut === "livree_partielle" ? "livree_partielle"
    : k.livraison_prevue && k.livraison_prevue < jour ? "livraison_attendue"
    : livrer && k.livraison_prevue && k.livraison_prevue > livrer ? "livraison_tardive"
    : livrer && k.livraison_prevue && k.livraison_prevue < livrer ? "livraison_trop_tot"
    : k.statut;
  const retourPrevu = k.a_retourner ? k.retour_prevu ?? (p ? decalerOuvres(p.fin, 1) : null) : null;
  const retour = !k.a_retourner ? null : k.retourne_le ? "rendu" : k.statut !== "livree" && k.statut !== "livree_partielle" ? null : retourPrevu && retourPrevu < jour ? "a_rendre" : "sur_chantier";
  return { besoin_le: besoin, livrer_avant: livrer, livrer_le: livrer, commander_avant: commander, etat,
           livraison_calee: livrer && k.livraison_prevue ? k.livraison_prevue === livrer : null,
           stockage_jours: livrer && k.livraison_prevue && k.livraison_prevue < livrer && k.statut === "commandee" ? joursEntre(k.livraison_prevue, livrer) : null,
           quantite_commandee: k.quantite ?? null, quantite_livree: livre, ecart: k.quantite != null && livre !== null ? livre - k.quantite : null,
           retour_prevu: retourPrevu, retour };
}

const UNITES: Record<string, string> = { m2: "m²", m3: "m³", ml: "m" };
const qte = (v: number | null | undefined, u: string | null | undefined) => (v == null ? "" : `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 3 }).format(v)} ${u ? UNITES[u] ?? u : ""}`.trim());

/* La liste cadencée, comme public.btp_preparer_liste : lignes du marché vérifié, lots de l'entreprise, matières. */
function listeLocale(tableau: Tableau, deja: Omit<Commande, "echeances">[]): Omit<Commande, "echeances">[] {
  const lotsClient = new Set(tableau.lots.filter((l) => l.execution === "client").map((l) => l.id));
  const lignes = tableau.marches.filter((m) => m.statut === "verifie").flatMap((m) => m.lignes)
    .filter((l) => l.lot_id && lotsClient.has(l.lot_id) && (l.nature === "ouvrage" || l.nature === "fourniture") && l.quantite && l.quantite > 0
                   && ["u", "ml", "m2", "m3", "kg", "t", "l"].includes(l.unite ?? ""));
  return lignes.filter((l) => !deja.some((k) => k.ligne_marche_id === l.id && k.statut !== "annulee")).map((l) => {
    const p = tableau.passages.filter((x) => x.lot_id === l.lot_id && x.statut === "prevu").sort((a, b) => a.debut.localeCompare(b.debut))[0];
    return { id: nid(), chantier_id: tableau.chantier.id, lot_id: l.lot_id, lot_code: tableau.lots.find((x) => x.id === l.lot_id)?.code ?? null,
             passage_id: p?.id ?? null, passage_tache: p?.tache ?? null, ligne_marche_id: l.id, fournisseur_id: null, fournisseur_nom: null,
             objet: l.designation.slice(0, 300), quantite: l.quantite, unite: l.unite, quantite_texte: qte(l.quantite, l.unite), reference: null, delai_jours: 5,
             besoin_le: null, statut: "a_commander" as const, commandee_le: null, livraison_prevue: null, livree_le: null, note: null, motif: null,
             a_retourner: false, retour_prevu: null, retourne_le: null, livraisons: [] };
  });
}

const nid = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);

const CANAUX: Record<string, string> = { email: "par courriel", whatsapp: "par WhatsApp", sms: "par SMS" };
const ENVOI_ARRETE: Record<string, string> = { bloque: "bloqué", refuse: "refusé à la validation", annule: "annulé", expire: "expiré", echec: "en échec", brouillon_depose: "laissé en brouillon" };

/* La dernière demande au fournisseur, en une pastille et une phrase (b6_61, b6_63) ; « à noter » : le bureau peut noter sa réponse. */
function suiviDemande(d: DemandeLivraison): { libelle: string; teinte: Teinte; texte: string; aNoter: boolean } {
  const le = dateCourte(d.date_demandee);
  const essai = d.envoi_mode === "essai" ? " (mode essai : il part à l'adresse d'essai)" : "";
  const pourquoi = d.motif === "recalage" ? "La pose a bougé. " : "";
  const repondu = d.reponse ? ` Réponse : « ${d.reponse} ».` : "";
  if (d.statut === "acceptee") return { libelle: "Acceptée", teinte: "vert", aNoter: false,
    texte: `Le fournisseur a accepté de livrer le ${le}, jour de la pose${d.ancienne_date ? ` (au lieu du ${dateCourte(d.ancienne_date)})` : ""} ; ${d.lu === "humain" ? "noté par le bureau" : "réponse lue"} le ${dateCourte(d.repondu_le)}.${repondu}` };
  if (d.statut === "refusee") return { libelle: "Refusée", teinte: "rouge", aNoter: false,
    texte: `Le fournisseur ne peut pas livrer le ${le} : demandez une autre date ou recalez la pose.${repondu}` };
  if (d.statut === "sans_canal") return { libelle: "Sans canal", teinte: "ambre", aNoter: true,
    texte: `Ni courriel ni téléphone dans l'annuaire : prévenez le fournisseur vous-même (livrer le ${le}, jour de la pose), puis notez sa réponse.` };
  if (d.reponse_a_lire) return { libelle: "Réponse à lire", teinte: "ambre", aNoter: true,
    texte: `Le fournisseur a répondu, ni OUI ni NON${d.reponse ? ` : « ${d.reponse} »` : ""}. Lisez sa réponse, puis notez-la.` };
  if (d.envoi_statut === "a_valider") return { libelle: "À valider", teinte: "bleu", aNoter: true,
    texte: `${pourquoi}Demande de livraison le ${le}, jour de la pose : le message au fournisseur attend dans « À valider »${essai}.` };
  if (d.envoi_statut === "envoye") return { libelle: "Partie", teinte: "bleu", aNoter: true,
    texte: `${pourquoi}Demande partie ${CANAUX[d.canal ?? ""] ?? ""}${d.envoye_le ? ` le ${dateHeure(d.envoye_le)}` : ""}${essai} : livrer le ${le}, jour de la pose. Réponse attendue (OUI ou NON).` };
  if (d.envoi_statut && ENVOI_ARRETE[d.envoi_statut]) return { libelle: "Non partie", teinte: "rouge", aNoter: true,
    texte: `Le message au fournisseur n'est pas parti (${ENVOI_ARRETE[d.envoi_statut]}) : prévenez-le vous-même (livrer le ${le}), puis notez sa réponse.` };
  return { libelle: "En partance", teinte: "bleu", aNoter: true, texte: `${pourquoi}Demande de livraison le ${le}, jour de la pose : le message part${essai}.` };
}

const RAPPROCHEMENTS: Record<NonNullable<BonLu["rapprochement"]>, Teinte> = { manquant: "ambre", conforme: "vert", excedent: "ambre", sans_quantite: "gris" };

/* Un bon lu sur photo, en une pastille et une phrase (b6_62, b6_63). */
function suiviBon(b: BonLu, k: Commande): { libelle: string; teinte: Teinte; texte: string; rappro: string | null } {
  const lu = `Bon ${b.numero_bon ?? "sans numéro lu"}${b.date_livraison ? ` du ${dateCourte(b.date_livraison)}` : ""}${b.quantite_lue != null ? ` : ${qte(b.quantite_lue, b.unite_lue)}` : ""}${b.designation_lue ? ` « ${b.designation_lue} »` : ""}.`;
  const rappro = b.rapprochement === "manquant" && b.ecart != null ? `manque ${qte(-b.ecart, k.unite)}`
    : b.rapprochement === "excedent" && b.ecart != null ? `${qte(b.ecart, k.unite)} en trop`
    : b.rapprochement === "conforme" ? "conforme à la commande"
    : b.rapprochement === "sans_quantite" ? "commande sans quantité chiffrée" : null;
  if (b.statut === "en_lecture") return { libelle: "En lecture", teinte: "gris", rappro: null,
    texte: `${b.nom_fichier ?? "Photo du bon"}, déposée le ${dateHeure(b.cree_le)} : Daliro lit le bon, puis le compare à la commande.` };
  if (b.statut === "a_confirmer") return { libelle: "Lu, à confirmer", teinte: "bleu", rappro, texte: `${lu} Rien n'est noté reçu avant votre confirmation.` };
  if (b.statut === "a_verifier") return { libelle: "À vérifier", teinte: "ambre", rappro, texte: `${lu} À vérifier : ${b.motifs.join(" ; ") || "lecture incomplète"}.` };
  if (b.statut === "ecarte") return { libelle: "Écarté", teinte: "gris", rappro: null,
    texte: `${b.nom_fichier ?? "Bon"} écarté${b.decide_le ? ` le ${dateCourte(b.decide_le)}` : ""}${b.motif ? ` : ${b.motif}` : ""}.` };
  return { libelle: "Confirmé", teinte: "vert", rappro, texte: lu };
}

const derniereDemande = (k: Commande) => (k.demandes_livraison ?? []).find((d) => d.statut !== "caduque") ?? null;
const passee = (k: Commande) => k.statut === "commandee" || k.statut === "livree_partielle";

type Form = { type: "nouvelle" } | { type: "commandee"; k: Commande } | { type: "recue"; k: Commande } | { type: "rendu"; k: Commande } | { type: "annuler"; k: Commande }
  | { type: "demander"; k: Commande } | { type: "reponse"; k: Commande; d: DemandeLivraison } | { type: "bon"; k: Commande }
  | { type: "confirmer_bon"; k: Commande; b: BonLu } | { type: "ecarter_bon"; k: Commande; b: BonLu } | null;

export default function ApproCarte({ tableau, source }: { tableau: Tableau; source: Source }) {
  const bons = ouverte(tableau, "bons_livraison");
  const retours = ouverte(tableau, "retours");
  const listeOuverte = ouverte(tableau, "liste_cadencee");
  const calees = ouverte(tableau, "livraisons_calees");
  const c = tableau.chantier;
  const [reel, setReel] = useState<Appro | null>(null);
  const [local, setLocal] = useState<Omit<Commande, "echeances">[]>(() => APPRO_EXEMPLE[tableau.chantier.id] ?? []);
  const [chargement, setChargement] = useState(source === "reelle");
  const [form, setForm] = useState<Form>(null);
  const [champs, setChamps] = useState<Record<string, string>>({});
  const [fichier, setFichier] = useState<File | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [fait, setFait] = useState<string | null>(null);
  const auj = aujourdHui();
  const ch = (k: string) => champs[k] ?? "";
  const pose = (k: string, v: string) => setChamps((p) => ({ ...p, [k]: v }));

  const lire = useCallback(async () => {
    try {
      setReel(await chargerAppro(c.id));
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base n'a pas répondu.");
    } finally {
      setChargement(false);
    }
  }, [c.id]);

  useEffect(() => {
    if (source !== "reelle") return;
    const t = window.setTimeout(() => void lire(), 0);
    return () => window.clearTimeout(t);
  }, [source, lire]);

  /* Une demande préparée part dans la minute (ouvrier daliro-appro), un bon déposé se lit : on relit une minute plus tard. */
  const enAttente = source === "reelle" && (reel?.commandes ?? []).some((k) => (k.demandes_preparees ?? []).length > 0 || (k.bons_lus ?? []).some((b) => b.statut === "en_lecture"));
  useEffect(() => {
    if (!enAttente) return;
    const t = window.setTimeout(() => void lire(), 60000);
    return () => window.clearTimeout(t);
  }, [enAttente, reel, lire]);

  const a: Appro | null = useMemo(
    () => (source === "reelle" ? reel : { commandes: local.map((k) => ({ ...k, echeances: echeances(k, tableau, auj) })), fournisseurs: tableau.tiers.filter((t) => t.actif && t.roles.some((r) => r === "fournisseur" || r === "loueur" || r === "sous_traitant")).map((t) => ({ id: t.id, nom: t.nom })) }),
    [source, reel, local, tableau, auj],
  );

  const ouvrir = (f: Form, init: Record<string, string> = {}) => { setErreur(null); setChamps(init); setFichier(null); setForm(f); };
  const changer = (id: string, f: (x: Omit<Commande, "echeances">) => Omit<Commande, "echeances">) => setLocal((l) => l.map((x) => (x.id === id ? f(x) : x)));

  const agir = async (reelle: () => Promise<unknown>, locale: () => void, message: string) => {
    setEnvoi(true);
    setErreur(null);
    try {
      if (source === "reelle") { await reelle(); await lire(); } else { locale(); }
      setFait(message);
      setForm(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base a refusé l'action.");
    } finally {
      setEnvoi(false);
    }
  };

  const nouvelle = () => {
    const delai = Number(ch("delai") || "5");
    const passage = tableau.passages.find((p) => p.id === ch("passage")) ?? null;
    const four = a?.fournisseurs.find((f) => f.id === ch("fournisseur")) ?? null;
    const aRendre = ch("a_rendre") === "oui";
    return agir(
      () => ecrireCommande(null, c.id, { objet: ch("objet"), quantite_texte: ch("quantite") || null, fournisseur_id: four?.id ?? null,
                                         fournisseur_libelle: four ? null : ch("fournisseur_libre") || null, delai_jours: delai,
                                         passage_id: passage?.id ?? null, besoin_le: passage ? null : ch("besoin") || null, a_retourner: aRendre }),
      () => {
        if (!ch("objet").trim()) throw new Error("Dites ce qui est commandé.");
        if (Number.isNaN(delai) || delai < 0 || delai > 120) throw new Error("Le délai du fournisseur va de 0 à 120 jours ouvrés.");
        setLocal((l) => [...l, { id: nid(), chantier_id: c.id, lot_id: passage?.lot_id ?? null, lot_code: passage?.lot_code ?? null, passage_id: passage?.id ?? null,
          passage_tache: passage?.tache ?? null, fournisseur_id: four?.id ?? null, fournisseur_nom: four?.nom ?? (ch("fournisseur_libre").trim() || null), objet: ch("objet").trim(),
          quantite_texte: ch("quantite").trim() || null, reference: null, delai_jours: delai, besoin_le: passage ? null : ch("besoin") || null, statut: "a_commander",
          commandee_le: null, livraison_prevue: null, livree_le: null, note: null, motif: null, a_retourner: aRendre, retour_prevu: null, retourne_le: null, livraisons: [] }]);
      },
      `« ${ch("objet").trim()} » ajouté à l'approvisionnement.`,
    );
  };

  const liste = () => agir(
    async () => { const r = await preparerListe(c.id); setFait(null); return r; },
    () => {
      if (!tableau.marches.some((m) => m.statut === "verifie")) throw new Error("La liste se prépare depuis le marché vérifié : vérifiez d'abord le marché.");
      setLocal((l) => [...l, ...listeLocale(tableau, l)]);
    },
    "La liste est préparée depuis le devis : choisissez les fournisseurs, Daliro dit quand commander.",
  );

  const commandee = (k: Commande) => {
    const four = a?.fournisseurs.find((f) => f.id === ch("fournisseur")) ?? null;
    const libre = ch("fournisseur_libre").trim();
    const sansFournisseur = !k.fournisseur_nom;
    return agir(
      async () => {
        if (sansFournisseur && (four || libre)) await ecrireCommande(k.id, c.id, four ? { fournisseur_id: four.id } : { fournisseur_libelle: libre });
        return noterCommande(k.id, ch("promise"), ch("le") || auj, ch("reference") || null);
      },
      () => {
        if (sansFournisseur && !four && !libre) throw new Error("Choisissez le fournisseur avant de commander.");
        if (!ch("promise") || ch("promise") < (ch("le") || auj)) throw new Error("La livraison promise est au plus tôt le jour de la commande.");
        setLocal((l) => l.map((x) => (x.id === k.id ? { ...x, statut: "commandee", commandee_le: ch("le") || auj, livraison_prevue: ch("promise"), reference: ch("reference") || x.reference,
                                                        fournisseur_id: four?.id ?? x.fournisseur_id, fournisseur_nom: x.fournisseur_nom ?? four?.nom ?? libre } : x)));
      },
      `« ${k.objet} » commandé, livraison promise le ${dateCourte(ch("promise"))}.`,
    );
  };

  const recue = (k: Commande) => {
    const q = ch("qte").trim() ? Number(ch("qte").replace(",", ".")) : null;
    return agir(
      () => (bons ? recevoir(k.id, ch("le") || auj, q, ch("bon") || null, ch("note") || null)
                  : noterLivraison(k.id, ch("le") || auj, ch("complete") !== "non", ch("note") || null)),
      () => {
        if ((ch("le") || auj) > auj) throw new Error("Une livraison ne se note pas dans le futur.");
        if (q !== null && (Number.isNaN(q) || q <= 0)) throw new Error("La quantité reçue est positive.");
        setLocal((l) => l.map((x) => {
          if (x.id !== k.id) return x;
          const livraisons = [...(x.livraisons ?? []), { id: nid(), livree_le: ch("le") || auj, quantite: q, bon_reference: ch("bon") || null, piece_id: null, note: ch("note") || null }];
          const cumul = livraisons.reduce((t, y) => t + (y.quantite ?? 0), 0);
          const complete = x.quantite != null && livraisons.some((y) => y.quantite !== null) ? cumul >= x.quantite : ch("complete") !== "non";
          return { ...x, livraisons, statut: complete ? "livree" : "livree_partielle", livree_le: ch("le") || auj };
        }));
      },
      `Réception de « ${k.objet} » notée${ch("bon") ? ` (bon ${ch("bon")})` : ""}.`,
    );
  };

  const rendu = (k: Commande) => agir(
    () => noterRetour(k.id, ch("le") || auj, null),
    () => {
      if ((ch("le") || auj) > auj) throw new Error("Un retour ne se note pas dans le futur.");
      setLocal((l) => l.map((x) => (x.id === k.id ? { ...x, retourne_le: ch("le") || auj } : x)));
    },
    `« ${k.objet} » rendu.`,
  );

  const annuler = (k: Commande) => agir(
    () => annulerCommande(k.id, ch("motif")),
    () => {
      if (!ch("motif").trim()) throw new Error("Une annulation se fait avec son motif.");
      setLocal((l) => l.map((x) => (x.id === k.id ? { ...x, statut: "annulee", motif: ch("motif").trim() } : x)));
    },
    `« ${k.objet} » annulé.`,
  );

  /* b6_61 : demander la livraison au fournisseur, le jour de la pose par défaut. */
  const demander = (k: Commande) => {
    const date = ch("date") || null;
    return agir(
      () => demanderLivraison(k.id, date),
      () => {
        if (!passee(k)) throw new Error("Seule une commande passée, pas encore reçue, se recale chez le fournisseur.");
        if (!k.fournisseur_id) throw new Error("Le fournisseur n'est pas dans l'annuaire : prévenez-le vous-même, ou choisissez-le dans l'annuaire.");
        const voulu = date ?? k.echeances.livrer_le ?? null;
        if (!voulu) throw new Error("Donnez la date de livraison voulue : la commande n'est rattachée à aucun passage.");
        if (voulu < auj) throw new Error("La date de livraison demandée est au plus tôt aujourd'hui.");
        if (voulu === k.livraison_prevue) throw new Error("Le fournisseur a déjà promis la livraison ce jour-là.");
        changer(k.id, (x) => ({ ...x, demandes_preparees: [{ travail: Date.now(), date_demandee: voulu, ancienne_date: x.livraison_prevue, motif: "calage", etat: "a_faire", cree_le: new Date().toISOString() }, ...(x.demandes_preparees ?? [])] }));
      },
      `Demande préparée : Daliro écrit à ${k.fournisseur_nom ?? "le fournisseur"} dans la minute ; sans accord permanent, le message attendra dans « À valider ».`,
    );
  };

  /* b6_61 : la réponse reçue autrement (téléphone, comptoir), notée par le bureau. */
  const reponse = (k: Commande, d: DemandeLivraison) => {
    const acceptee = ch("reponse") === "oui";
    return agir(
      () => noterReponseFournisseur(d.id, acceptee, ch("note").trim() || null),
      () => {
        if (ch("reponse") !== "oui" && ch("reponse") !== "non") throw new Error("Le fournisseur accepte ou refuse.");
        changer(k.id, (x) => ({ ...x, livraison_prevue: acceptee && passee(k) ? d.date_demandee : x.livraison_prevue,
          demandes_livraison: (x.demandes_livraison ?? []).map((y) => (y.id === d.id ? { ...y, statut: acceptee ? "acceptee" : "refusee", lu: "humain", reponse: ch("note").trim() || y.reponse,
                                                                                         repondu_le: new Date().toISOString(), reponse_a_lire: false } : y)) }));
      },
      acceptee ? `Réponse notée : livraison de « ${k.objet} » le ${dateCourte(d.date_demandee)}, jour de la pose.` : `Réponse notée : le fournisseur ne livre pas « ${k.objet} » le ${dateCourte(d.date_demandee)}.`,
    );
  };

  /* b6_62 : la photo du bon, déposée sur la commande, puis lue et comparée. */
  const bon = (k: Commande) => {
    const f = fichier;
    return agir(
      async () => {
        if (!f) throw new Error("Choisissez la photo ou le PDF du bon.");
        if (!k.client_id) throw new Error("L'organisation de la commande n'est pas lue : rechargez la page.");
        return deposerBon(k.client_id, k.id, f);
      },
      () => {
        if (!f) throw new Error("Choisissez la photo ou le PDF du bon.");
        if (!MIMES_BON.includes(mimeBon(f))) throw new Error("Le bon se dépose en photo (JPEG, PNG, HEIC, WebP) ou en PDF.");
        if (f.size <= 0 || f.size > 25 * 1024 * 1024) throw new Error("Le fichier doit faire entre 1 octet et 25 Mo.");
        changer(k.id, (x) => ({ ...x, bons_lus: [{ id: nid(), statut: "en_lecture", piece_id: nid(), numero_bon: null, date_livraison: null, quantite_lue: null, unite_lue: null,
          designation_lue: null, rapprochement: null, ecart: null, motifs: [], cree_le: new Date().toISOString(), nom_fichier: f.name.slice(0, 200) }, ...(x.bons_lus ?? [])] }));
      },
      `Bon de « ${k.objet} » déposé : Daliro le lit, puis le compare à la commande.`,
    );
  };

  /* b6_62 : la personne confirme (et corrige au besoin) ce qui a été lu ; la réception passe par btp_recevoir. */
  const confirmer = (k: Commande, b: BonLu) => {
    const q = ch("qte").trim() ? Number(ch("qte").replace(",", ".")) : null;
    const le = ch("le") || null;
    return agir(
      () => confirmerBon(b.id, q, le),
      () => {
        if (q !== null && (Number.isNaN(q) || q <= 0)) throw new Error("La quantité reçue est positive.");
        if (b.statut === "a_verifier" && q === null) throw new Error("Bon à vérifier : donnez vous-même la quantité reçue.");
        const jour = le ?? b.date_livraison ?? auj;
        if (jour > auj) throw new Error("Une livraison ne se note pas dans le futur.");
        const quantite = q ?? b.quantite_lue;
        changer(k.id, (x) => {
          const livraisons = [...(x.livraisons ?? []), { id: nid(), livree_le: jour, quantite, bon_reference: b.numero_bon, piece_id: b.piece_id,
                                                         note: q !== null && q !== b.quantite_lue ? `Bon lu sur photo, quantité corrigée (${b.quantite_lue ?? "aucune"} lue)` : "Bon lu sur photo" }];
          const cumul = livraisons.reduce((t, y) => t + (y.quantite ?? 0), 0);
          const complete = x.quantite != null ? cumul >= x.quantite : true;
          return { ...x, livraisons, statut: complete ? "livree" : "livree_partielle", livree_le: jour,
                   bons_lus: (x.bons_lus ?? []).map((y) => (y.id === b.id ? { ...y, statut: "confirme", decide_le: new Date().toISOString() } : y)) };
        });
      },
      `${b.numero_bon ? `Bon ${b.numero_bon}` : "Bon"} confirmé : réception de « ${k.objet} » notée.`,
    );
  };

  const ecarter = (k: Commande, b: BonLu) => agir(
    () => ecarterBon(b.id, ch("motif")),
    () => {
      if (!ch("motif").trim()) throw new Error("Un bon s'écarte avec son motif.");
      changer(k.id, (x) => ({ ...x, bons_lus: (x.bons_lus ?? []).map((y) => (y.id === b.id ? { ...y, statut: "ecarte", motif: ch("motif").trim(), decide_le: new Date().toISOString() } : y)) }));
    },
    `Bon de « ${k.objet} » écarté.`,
  );

  const enCours = c.statut === "preparation" || c.statut === "ouvert" || c.statut === "suspendu";
  const commandes = a?.commandes ?? [];
  const aSurveiller = commandes.filter((k) => ["a_commander_vite", "commande_en_retard", "livraison_tardive", "livraison_trop_tot", "livraison_attendue"].includes(k.echeances.etat) || k.echeances.retour === "a_rendre"
    || (k.bons_lus ?? []).some((b) => b.statut === "a_confirmer" || b.statut === "a_verifier")
    || ((d) => !!d && (d.statut === "refusee" || d.statut === "sans_canal" || !!d.reponse_a_lire))(derniereDemande(k))).length;
  const devisVerifie = a?.devis_verifie ?? tableau.marches.some((m) => m.statut === "verifie");

  return (
    <section className="esp-carte" aria-label="Approvisionnement">
      <div className="esp-carte-tete">
        <div className="esp-section-titre" style={{ margin: 0 }}>
          Approvisionnement — {commandes.filter((k) => k.statut !== "annulee").length} commande{commandes.filter((k) => k.statut !== "annulee").length > 1 ? "s" : ""}{aSurveiller ? `, ${aSurveiller} à surveiller` : ""}
        </div>
        <div className="esp-actions" style={{ marginTop: 0 }}>
          <button type="button" className="r-btn r-btn--fil r-btn--petit" disabled={envoi || !enCours || !devisVerifie || !listeOuverte} onClick={() => void liste()}
                  title={!listeOuverte ? `Comprise dans la formule ${formuleQuiOuvre("liste_cadencee")}` : !devisVerifie ? "La liste se prépare depuis le marché vérifié" : undefined}>
            <ListChecks width={14} height={14} aria-hidden="true" /> Préparer la liste depuis le devis
          </button>
          <button type="button" className="r-btn r-btn--fil r-btn--petit" disabled={envoi || !enCours} onClick={() => ouvrir({ type: "nouvelle" }, { delai: "5" })}>
            <Plus width={14} height={14} aria-hidden="true" /> Nouvelle commande
          </button>
        </div>
      </div>
      {fait ? <div style={{ marginBottom: 10 }}><Avis teinte="vert" role="status">{fait}</Avis></div> : null}
      {erreur && !form ? <div style={{ marginBottom: 10 }}><Avis teinte="rouge" role="alert">{erreur}</Avis></div> : null}
      {chargement ? <Loader variant="spin" /> : commandes.length ? (
        <div className="esp-tableau-cadre" tabIndex={0} role="region" aria-label="Commandes du chantier (tableau qui défile)">
          <table className="esp-tableau">
            <thead><tr><th>Quoi</th><th>Fournisseur</th><th>Pour</th><th>Commander avant</th><th>Livraison</th><th>État</th><th></th></tr></thead>
            <tbody>
              {commandes.map((k) => {
                const preparee = (k.demandes_preparees ?? [])[0] ?? null;
                const d = derniereDemande(k);
                const sd = d ? suiviDemande(d) : null;
                const bonsVus = (k.bons_lus ?? []).filter((b) => b.statut !== "confirme");
                const suivi = !!preparee || !!d || bonsVus.length > 0;
                const sansTrait = suivi ? { borderBottomWidth: 0 } : undefined;
                const refuseeCeJour = d?.statut === "refusee" && d.date_demandee === k.echeances.livrer_le;
                const peutDemander = calees && passee(k) && !!k.echeances.livrer_le && k.livraison_prevue !== k.echeances.livrer_le && !preparee
                                     && !(d && (d.statut === "en_attente" || d.statut === "sans_canal"));
                return (
                  <Fragment key={k.id}>
                    <tr>
                      <td style={sansTrait}>{k.objet}{k.quantite_texte ? <div className="esp-kpi-sous">{k.quantite_texte}{k.ligne_marche_id ? " · du devis" : ""}</div> : null}
                        {k.a_retourner ? <div className="esp-kpi-sous">{k.echeances.retour === "rendu" ? `rendu le ${dateCourte(k.retourne_le)}` : `à rendre le ${dateCourte(k.echeances.retour_prevu)}`}</div> : null}</td>
                      <td style={sansTrait}>{k.fournisseur_nom ?? <span className="esp-obligatoire">à choisir</span>}<div className="esp-kpi-sous">délai {k.delai_jours} j ouvrés{k.reference ? ` · ${k.reference}` : ""}</div></td>
                      <td style={sansTrait}>{k.passage_tache ? <>« {k.passage_tache} »</> : "—"}{k.echeances.besoin_le ? <div className="esp-kpi-sous">besoin le {dateCourte(k.echeances.besoin_le)}</div> : null}</td>
                      <td style={sansTrait}>{k.statut === "a_commander" ? dateCourte(k.echeances.commander_avant) : k.commandee_le ? <span className="esp-kpi-sous">commandé le {dateCourte(k.commandee_le)}</span> : "—"}</td>
                      <td style={sansTrait}>{k.livree_le ? `reçue le ${dateCourte(k.livree_le)}` : k.livraison_prevue ? `promise le ${dateCourte(k.livraison_prevue)}` : "—"}
                        {k.echeances.livrer_le && k.statut !== "livree" && k.statut !== "annulee" ? <div className="esp-kpi-sous">livrer le {dateCourte(k.echeances.livrer_le)}{k.passage_id ? ", jour de la pose" : ""}</div> : null}
                        {k.echeances.etat === "livraison_trop_tot" && k.echeances.stockage_jours ? <div className="esp-kpi-sous">trop tôt : {k.echeances.stockage_jours} jour{k.echeances.stockage_jours > 1 ? "s" : ""} de stockage</div> : null}
                        {k.echeances.livraison_calee && k.statut === "commandee" && k.passage_id ? <div className="esp-kpi-sous">calée sur la pose</div> : null}
                        {k.echeances.quantite_livree != null ? <div className="esp-kpi-sous">reçu {qte(k.echeances.quantite_livree, k.unite)}{k.quantite != null ? ` sur ${qte(k.quantite, k.unite)}` : ""}
                          {k.echeances.ecart ? <> · <Pastille teinte="ambre" contour>{k.echeances.ecart < 0 ? `manque ${qte(-k.echeances.ecart, k.unite)}` : `${qte(k.echeances.ecart, k.unite)} en trop`}</Pastille></> : null}</div> : null}
                        {(k.livraisons ?? []).filter((l) => l.bon_reference).length ? <div className="esp-kpi-sous">bon{(k.livraisons ?? []).filter((l) => l.bon_reference).length > 1 ? "s" : ""} {(k.livraisons ?? []).map((l) => l.bon_reference).filter(Boolean).join(", ")}</div> : null}</td>
                      <td style={sansTrait}><Pastille teinte={ETATS[k.echeances.etat].teinte}>{ETATS[k.echeances.etat].libelle}</Pastille>{k.echeances.retour === "a_rendre" ? <div><Pastille teinte="rouge" contour>À rendre</Pastille></div> : null}{k.motif ? <div className="esp-kpi-sous">{k.motif}</div> : null}</td>
                      <td style={sansTrait}>
                        {k.statut === "a_commander" || k.statut === "commandee" ? <div><button type="button" className="esp-lien-bouton" onClick={() => ouvrir({ type: "commandee", k }, { le: k.commandee_le ?? auj, promise: k.livraison_prevue ?? k.echeances.livrer_le ?? "", reference: k.reference ?? "" })}>{k.statut === "a_commander" ? "Noter commandée" : "Changer la date promise"}</button></div> : null}
                        {peutDemander ? <div><button type="button" className="esp-lien-bouton" disabled={!k.fournisseur_id} title={!k.fournisseur_id ? "Le fournisseur n'est pas dans l'annuaire : prévenez-le vous-même" : undefined}
                                                     onClick={() => ouvrir({ type: "demander", k }, { date: refuseeCeJour ? "" : k.echeances.livrer_le ?? "" })}>{refuseeCeJour ? "Demander une autre date" : "Demander la livraison le jour de la pose"}</button></div> : null}
                        {k.statut === "commandee" || k.statut === "livree_partielle" ? <div><button type="button" className="esp-lien-bouton" onClick={() => ouvrir({ type: "recue", k }, { le: auj, complete: "oui" })}>Noter reçue</button></div> : null}
                        {bons && passee(k) ? <div><button type="button" className="esp-lien-bouton" onClick={() => ouvrir({ type: "bon", k })}>Déposer la photo du bon</button></div> : null}
                        {retours && k.a_retourner && !k.retourne_le && (k.statut === "livree" || k.statut === "livree_partielle") ? <div><button type="button" className="esp-lien-bouton" onClick={() => ouvrir({ type: "rendu", k }, { le: auj })}>Noter rendu</button></div> : null}
                        {k.statut !== "livree" && k.statut !== "annulee" ? <div><button type="button" className="esp-lien-bouton" onClick={() => ouvrir({ type: "annuler", k })}>Annuler</button></div> : null}
                      </td>
                    </tr>
                    {suivi ? (
                      <tr>
                        <td colSpan={7} style={{ paddingTop: 0 }}>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 24px" }}>
                            {preparee || (d && sd) ? (
                              <div style={{ flex: "1 1 320px", minWidth: 0 }}>
                                <div className="esp-kpi-sous" style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}><Truck width={14} height={14} aria-hidden="true" /> Fournisseur{" "}
                                  {preparee ? <Pastille teinte="bleu" contour>Demande préparée</Pastille> : sd ? <Pastille teinte={sd.teinte} contour>{sd.libelle}</Pastille> : null}</div>
                                <div className="esp-kpi-sous">{preparee
                                  ? `Livraison demandée le ${dateCourte(preparee.date_demandee)}, jour de la pose${preparee.ancienne_date ? ` (promise le ${dateCourte(preparee.ancienne_date)})` : ""}, le ${dateHeure(preparee.cree_le)} : Daliro écrit au fournisseur dans la minute ; sans accord permanent, le message attendra dans « À valider ».`
                                  : sd?.texte}</div>
                                {!preparee && d && sd?.aNoter ? <div><button type="button" className="esp-lien-bouton" onClick={() => ouvrir({ type: "reponse", k, d }, { reponse: "", note: "" })}>Noter la réponse</button></div> : null}
                              </div>
                            ) : null}
                            {bonsVus.map((b) => {
                              const sb = suiviBon(b, k);
                              return (
                                <div key={b.id} style={{ flex: "1 1 320px", minWidth: 0 }}>
                                  <div className="esp-kpi-sous" style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}><Camera width={14} height={14} aria-hidden="true" /> Bon de livraison{" "}
                                    <Pastille teinte={sb.teinte} contour>{sb.libelle}</Pastille>{sb.rappro && b.rapprochement ? <Pastille teinte={RAPPROCHEMENTS[b.rapprochement]}>{sb.rappro}</Pastille> : null}</div>
                                  <div className="esp-kpi-sous">{sb.texte}</div>
                                  {b.statut === "a_confirmer" || b.statut === "a_verifier" ? <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                                    <button type="button" className="esp-lien-bouton" onClick={() => ouvrir({ type: "confirmer_bon", k, b }, { qte: b.statut === "a_confirmer" && b.quantite_lue != null ? String(b.quantite_lue) : "", le: b.date_livraison ?? auj })}>{b.statut === "a_confirmer" ? "Confirmer la réception" : "Vérifier et confirmer"}</button>
                                    <button type="button" className="esp-lien-bouton" onClick={() => ouvrir({ type: "ecarter_bon", k, b })}>Écarter</button>
                                  </div> : null}
                                </div>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : <p className="esp-kpi-sous">Aucune commande : ajoutez ce qu&apos;il faut commander pour chaque passage, avec le délai du fournisseur ; Daliro dit quand commander.</p>}

      <Dialog open={form !== null} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><PackageCheck width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>{form?.type === "nouvelle" ? "Nouvelle commande" : form?.type === "commandee" ? `Commandé : ${form.k.objet}` : form?.type === "recue" ? `Reçu : ${form.k.objet}` : form?.type === "rendu" ? `Rendu : ${form.k.objet}` : form?.type === "annuler" ? `Annuler : ${form.k.objet}`
              : form?.type === "demander" ? `Demander la livraison : ${form.k.objet}` : form?.type === "reponse" ? `Réponse du fournisseur : ${form.k.objet}` : form?.type === "bon" ? `Bon de livraison : ${form.k.objet}`
              : form?.type === "confirmer_bon" ? `Confirmer le bon : ${form.k.objet}` : form?.type === "ecarter_bon" ? `Écarter le bon : ${form.k.objet}` : ""}</DialogTitle>
            <DialogDescription>
              {form?.type === "nouvelle" ? "Rattachée au passage qui en a besoin, elle se recale avec lui ; le délai du fournisseur se compte en jours ouvrés."
                : form?.type === "commandee" ? `À livrer le ${dateCourte(form.k.echeances.livrer_le ?? form.k.echeances.livrer_avant)}, jour de la pose.`
                : form?.type === "recue" && !bons ? `La livraison est notée ; le rapprochement du bon avec la commande est compris dans la formule ${formuleQuiOuvre("bons_livraison")}.`
                : form?.type === "recue" ? (form.k.quantite != null ? `Commandé : ${qte(form.k.quantite, form.k.unite)}. La quantité du bon est comparée à la commande ; ce qui manque reste attendu.` : "Une livraison partielle laisse la commande ouverte pour le reste.")
                : form?.type === "rendu" ? "Le matériel quitte le chantier : la location s'arrête."
                : form?.type === "demander" ? `Daliro écrit à ${form.k.fournisseur_nom ?? "le fournisseur"} (courriel d'abord, téléphone sinon) : « Pouvez-vous livrer le …, jour de la pose ? Répondez OUI ou NON. » Sans accord permanent, le message attend dans « À valider ». Sa réponse est lue ; acceptée, la date promise change.`
                : form?.type === "reponse" ? `Livrer le ${dateCourte(form.d.date_demandee)}, jour de la pose : ce que le fournisseur a répondu (téléphone, comptoir, message à lire). Acceptée, la date promise devient le ${dateCourte(form.d.date_demandee)}.`
                : form?.type === "bon" ? (bons ? "La photo (ou le PDF) du bon est lue, puis comparée à la commande : n° de commande, date, ligne, quantité, unité. Rien n'est noté reçu sans vous." : `Le bon lu sur photo est compris dans la formule ${formuleQuiOuvre("bons_livraison")}.`)
                : form?.type === "confirmer_bon" ? (form.b.statut === "a_verifier" ? "Le bon n'a pas pu être rapproché seul : donnez vous-même la quantité reçue. La réception est notée avec le n° du bon et sa photo." : `${form.k.quantite != null ? `Commandé : ${qte(form.k.quantite, form.k.unite)}. ` : ""}La réception est notée avec le n° du bon et sa photo ; corrigez la quantité si le bon dit autre chose.`)
                : form?.type === "ecarter_bon" ? "Le bon reste visible, marqué écarté ; rien n'est noté reçu."
                : "La commande reste visible, marquée annulée."}
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              {form?.type === "nouvelle" ? <>
                <label className="rv-libelle">Quoi <span className="esp-obligatoire">(obligatoire)</span><input className="rv-champ" maxLength={300} value={ch("objet")} onChange={(e) => pose("objet", e.target.value)} placeholder="Fenêtres PVC sur mesure" /></label>
                <div className="esp-form-ligne">
                  <label className="rv-libelle">Quantité<input className="rv-champ" maxLength={120} value={ch("quantite")} onChange={(e) => pose("quantite", e.target.value)} placeholder="14 châssis" /></label>
                  <label className="rv-libelle">Délai du fournisseur (jours ouvrés)<input className="rv-champ" inputMode="numeric" value={ch("delai")} onChange={(e) => pose("delai", e.target.value)} /></label>
                </div>
                <div className="esp-form-ligne">
                  <label className="rv-libelle">Fournisseur de l&apos;annuaire<select className="rv-champ" value={ch("fournisseur")} onChange={(e) => pose("fournisseur", e.target.value)}><option value="">— en clair —</option>{(a?.fournisseurs ?? []).map((f) => <option key={f.id} value={f.id}>{f.nom}</option>)}</select></label>
                  {!ch("fournisseur") ? <label className="rv-libelle">Fournisseur (en clair)<input className="rv-champ" maxLength={120} value={ch("fournisseur_libre")} onChange={(e) => pose("fournisseur_libre", e.target.value)} placeholder="Point P Lyon 3" /></label> : null}
                </div>
                <label className="rv-libelle" style={{ display: "flex", gap: 8, alignItems: "center" }}><input type="checkbox" checked={ch("a_rendre") === "oui"} onChange={(e) => pose("a_rendre", e.target.checked ? "oui" : "")} /> Matériel à rendre (location, consigne)</label>
                <div className="esp-form-ligne">
                  <label className="rv-libelle">Pour le passage<select className="rv-champ" value={ch("passage")} onChange={(e) => pose("passage", e.target.value)}><option value="">— une date de besoin —</option>{tableau.passages.filter((p) => p.statut === "prevu").map((p) => <option key={p.id} value={p.id}>{p.tache ?? "Passage"} ({dateCourte(p.debut)})</option>)}</select></label>
                  {!ch("passage") ? <label className="rv-libelle">Besoin le<input className="rv-champ" type="date" value={ch("besoin")} onChange={(e) => pose("besoin", e.target.value)} /></label> : null}
                </div>
              </> : null}
              {form?.type === "commandee" && !form.k.fournisseur_nom ? <div className="esp-form-ligne">
                <label className="rv-libelle">Fournisseur de l&apos;annuaire<select className="rv-champ" value={ch("fournisseur")} onChange={(e) => pose("fournisseur", e.target.value)}><option value="">— en clair —</option>{(a?.fournisseurs ?? []).map((f) => <option key={f.id} value={f.id}>{f.nom}</option>)}</select></label>
                {!ch("fournisseur") ? <label className="rv-libelle">Fournisseur (en clair)<input className="rv-champ" maxLength={120} value={ch("fournisseur_libre")} onChange={(e) => pose("fournisseur_libre", e.target.value)} placeholder="Point P Lyon 3" /></label> : null}
              </div> : null}
              {form?.type === "commandee" ? <div className="esp-form-ligne">
                <label className="rv-libelle">Commandé le<input className="rv-champ" type="date" max={auj} value={ch("le")} onChange={(e) => pose("le", e.target.value)} /></label>
                <label className="rv-libelle">Livraison promise <span className="esp-obligatoire">(obligatoire)</span><input className="rv-champ" type="date" value={ch("promise")} onChange={(e) => pose("promise", e.target.value)} /></label>
                <label className="rv-libelle">N° de commande<input className="rv-champ" maxLength={60} value={ch("reference")} onChange={(e) => pose("reference", e.target.value)} /></label>
              </div> : null}
              {form?.type === "recue" ? <>
                <div className="esp-form-ligne">
                  <label className="rv-libelle">Reçu le<input className="rv-champ" type="date" max={auj} value={ch("le")} onChange={(e) => pose("le", e.target.value)} /></label>
                  {bons && form.k.quantite != null
                    ? <label className="rv-libelle">Quantité reçue ({form.k.unite ? UNITES[form.k.unite] ?? form.k.unite : "u"})<input className="rv-champ" inputMode="decimal" value={ch("qte")} onChange={(e) => pose("qte", e.target.value)} /></label>
                    : <label className="rv-libelle">Livraison<select className="rv-champ" value={ch("complete")} onChange={(e) => pose("complete", e.target.value)}><option value="oui">Complète</option><option value="non">En partie (le reste est attendu)</option></select></label>}
                </div>
                {bons ? <label className="rv-libelle">N° du bon de livraison<input className="rv-champ" maxLength={60} value={ch("bon")} onChange={(e) => pose("bon", e.target.value)} placeholder="BL-5531" /></label> : null}
                <label className="rv-libelle">Note (bon de livraison, manquants)<input className="rv-champ" maxLength={500} value={ch("note")} onChange={(e) => pose("note", e.target.value)} placeholder="10 châssis sur 14" /></label>
              </> : null}
              {form?.type === "rendu" ? <label className="rv-libelle">Rendu le<input className="rv-champ" type="date" max={auj} value={ch("le")} onChange={(e) => pose("le", e.target.value)} /></label> : null}
              {form?.type === "annuler" ? <label className="rv-libelle">Motif <span className="esp-obligatoire">(obligatoire)</span><input className="rv-champ" maxLength={300} value={ch("motif")} onChange={(e) => pose("motif", e.target.value)} placeholder="Pris au dépôt" /></label> : null}
              {form?.type === "demander" ? <>
                <div className="esp-form-ligne">
                  <label className="rv-libelle">Livraison demandée le <span className="esp-obligatoire">(obligatoire)</span><input className="rv-champ" type="date" min={auj} value={ch("date")} onChange={(e) => pose("date", e.target.value)} /></label>
                  <div className="rv-libelle">Promise aujourd&apos;hui<div className="esp-kpi-sous" style={{ marginTop: 6 }}>{dateCourte(form.k.livraison_prevue)}{form.k.echeances.livrer_le ? ` · pose le ${dateCourte(form.k.echeances.livrer_le)}` : ""}</div></div>
                </div>
                {derniereDemande(form.k)?.statut === "refusee" ? <Avis teinte="ambre">Le fournisseur a refusé le {dateCourte(derniereDemande(form.k)?.date_demandee)} : demandez une autre date.</Avis> : null}
              </> : null}
              {form?.type === "reponse" ? <>
                <label className="rv-libelle">Le fournisseur<select className="rv-champ" value={ch("reponse")} onChange={(e) => pose("reponse", e.target.value)}><option value="">— sa réponse —</option><option value="oui">Accepte de livrer le {dateCourte(form.d.date_demandee)}</option><option value="non">Ne peut pas livrer ce jour-là</option></select></label>
                {form.d.reponse ? <div className="esp-kpi-sous">Reçu : « {form.d.reponse} »</div> : null}
                <label className="rv-libelle">Note<input className="rv-champ" maxLength={300} value={ch("note")} onChange={(e) => pose("note", e.target.value)} placeholder="Confirmé au téléphone" /></label>
              </> : null}
              {form?.type === "bon" && bons ? <label className="rv-libelle">Photo ou PDF du bon <span className="esp-obligatoire">(obligatoire)</span>
                <input className="rv-champ" type="file" accept={MIMES_BON.join(",")} onChange={(e) => setFichier(e.target.files?.[0] ?? null)} /></label> : null}
              {form?.type === "confirmer_bon" ? <div className="esp-form-ligne">
                <label className="rv-libelle">Quantité reçue ({form.k.unite ? UNITES[form.k.unite] ?? form.k.unite : "u"}){form.b.statut === "a_verifier" ? <span className="esp-obligatoire"> (obligatoire)</span> : null}<input className="rv-champ" inputMode="decimal" value={ch("qte")} onChange={(e) => pose("qte", e.target.value)} /></label>
                <label className="rv-libelle">Reçu le<input className="rv-champ" type="date" max={auj} value={ch("le")} onChange={(e) => pose("le", e.target.value)} /></label>
              </div> : null}
              {form?.type === "ecarter_bon" ? <label className="rv-libelle">Motif <span className="esp-obligatoire">(obligatoire)</span><input className="rv-champ" maxLength={300} value={ch("motif")} onChange={(e) => pose("motif", e.target.value)} placeholder="Photo floue" /></label> : null}
              {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={envoi || (form?.type === "bon" && (!bons || !fichier)) || (form?.type === "demander" && !ch("date")) || (form?.type === "reponse" && !ch("reponse"))}
                    onClick={() => void (form?.type === "nouvelle" ? nouvelle() : form?.type === "commandee" ? commandee(form.k) : form?.type === "recue" ? recue(form.k) : form?.type === "rendu" ? rendu(form.k) : form?.type === "annuler" ? annuler(form.k)
                      : form?.type === "demander" ? demander(form.k) : form?.type === "reponse" ? reponse(form.k, form.d) : form?.type === "bon" ? bon(form.k)
                      : form?.type === "confirmer_bon" ? confirmer(form.k, form.b) : form?.type === "ecarter_bon" ? ecarter(form.k, form.b) : Promise.resolve())}>
              {envoi ? <Loader variant="spin" /> : null} {form?.type === "nouvelle" ? "Ajouter la commande" : form?.type === "commandee" ? "Noter commandée" : form?.type === "recue" ? "Noter reçue" : form?.type === "rendu" ? "Noter rendu"
                : form?.type === "demander" ? "Demander au fournisseur" : form?.type === "reponse" ? "Noter la réponse" : form?.type === "bon" ? "Déposer le bon" : form?.type === "confirmer_bon" ? "Confirmer la réception" : form?.type === "ecarter_bon" ? "Écarter le bon" : "Annuler la commande"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
