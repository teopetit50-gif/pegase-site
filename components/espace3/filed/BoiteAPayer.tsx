"use client";

/* ══════════════════════════════════════════════════════════════════════
   FILED « À payer », sur la boîte de réception de Linear (28/10/2026)

   Demande de Teo : la seconde page de chaque SaaS refaite sur l'Inbox de
   Linear — la liste à gauche, la page de l'élément choisi à droite, dans
   la langue des premières pages (./TableauFiled.tsx). Une facture à payer
   est un élément de la boîte :

     · la liste : une ligne par facture validée ou comptabilisée, dans
       l'ordre de l'écran d'avant (l'échéance la plus proche d'abord, puis
       le plus gros reste) ; l'avatar à la couleur du fournisseur, la
       référence et le fournisseur, le reste à payer et son groupe
       d'échéance, l'hexagone de l'état de paiement et la date d'échéance.
       « Non lu » = à traiter : en retard ou due cette semaine, pas payée.
       Les payées restent masquées, comme avant, sauf à les afficher.
     · la facture choisie (?id=<facture>) : la page d'un ticket — le
       fournisseur, une phrase, les autres factures dues, le parcours en
       fil d'activité ; à droite paiement, urgence, échéance, IBAN, statut,
       et « Noter un paiement » (la même fenêtre, la même porte noterPaiement).
     · rien de choisi : le chiffre à traiter et les groupes d'échéance (les
       compteurs de l'écran d'avant), comme l'Inbox vide de Linear.

   ↑/↓ changent de facture, Échap referme. Les filtres (échéance,
   fournisseur, état de paiement, IBAN) sont dans l'adresse
   (?filtre=dimension:valeur), en pastilles ✕ sous la tête de la liste.

   Les chiffres passent par les mêmes portes que l'écran d'avant
   (./APayer.tsx) : vueExemple sur l'exemple (règlements notés en
   mémoire), chargerVueFournisseurs puis filed_etat_paiement sur la base
   réelle, relue en temps réel ; les règles sont celles de ./calculs.ts.
   Gabarit : ../lin/lin.css ; réglages propres : ./boite-a-payer.css.
   ══════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Banknote, Bell, Check, ChevronDown, ChevronUp, Clock, Copy, ExternalLink, FileText, ListFilter, SlidersHorizontal, Star } from "lucide-react";
import { Button, Dialog, Heading, Modal, ModalOverlay } from "react-aria-components";
import { useSource } from "@/components/espace3/base/source";
import { useTempsReel } from "@/components/espace3/base/tempsReel";
import { masquerIban, montant } from "@/components/espace3/base/format";
import { statutFacture } from "@/components/espace3/base/filed/etats";
import { vueExemple } from "@/components/espace3/base/filed/EcranFournisseurs";
import { MOYENS_PAIEMENT, chargerVueFournisseurs, etatPaiement, noterPaiement, type EtatPaiement, type FactureDuFournisseur, type MoyenPaiement, type VueFournisseurs } from "@/components/espace3/base/filed/portes";
import type { Fournisseur } from "@/components/espace3/base/types";
import { A_PAYER, GROUPES, JOUR, aPayer, du, etatsExemple, groupeDe, jourDe, minuit, totaux, type Etats, type Groupe } from "./calculs";
import { Choix, IconePriorite, Menu, MenuActions, MenuOptions, Surlignage, useEpingles, type Option } from "../lin/Lin";
import { IconeBoiteX, IconeCalendrier, IconeDiese, IconeDocument, IconeGroupe, IconeJauge, IconeNonLus, IconeSante, IconeStatutProjet, type EtatProjet } from "../lin/icones";
import { Note } from "../ui";
import { useToast } from "../Toasts";
import { useAujourdhui } from "../horloge";
import { RACINE } from "../modules";
import "./boite-a-payer.css";

const CHEMIN = `${RACINE}/filed/a-payer`;
const LIBELLES_MOYEN: Record<MoyenPaiement, string> = { virement: "Virement", prelevement: "Prélèvement", cheque: "Chèque", carte: "Carte", especes: "Espèces", compensation: "Compensation", autre: "Autre" };
const aujourdhuiIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const sansAccents = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
/* une date calendaire (AAAA-MM-JJ) se lit en UTC, un instant à l'heure du visiteur (rendu après le montage, horloge.ts) */
const dateCourte = (iso: string | null | undefined) =>
  iso
    ? new Date(iso).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "short",
        timeZone: iso.length === 10 ? "UTC" : undefined,
      })
    : "—";
const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? "s" : ""}`;
/* les couleurs d'icône de projet de Linear, une par fournisseur (les mêmes que la première page) */
const COULEURS = ["#26b5ce", "#5e6ad2", "#4cb782", "#f2994a", "#eb5757", "#bb87fc", "#f2c94c", "#95a2b3"];
const couleurDe = (id: string) => COULEURS[[...id].reduce((t, c) => t + c.charCodeAt(0), 0) % COULEURS.length];
const ORDRE_GROUPES: Groupe[] = ["retard", "semaine", "mois", "plus_tard", "sans"];
const groupeLibelle = (g: Groupe) => GROUPES.find((x) => x.cle === g)!.libelle;
const NIVEAUX: Record<Groupe, 0 | 1 | 2 | 3 | 4> = { retard: 4, semaine: 3, mois: 2, plus_tard: 1, sans: 0 };

/* l'état de paiement d'une ligne (filed_etat_paiement) ; un avoir ne se paie pas, il se déduit */
type Paiement = "a_payer" | "partielle" | "payee" | "avoir";
const PAIEMENTS: { cle: Paiement; libelle: string; etat: EtatProjet }[] = [
  { cle: "a_payer", libelle: "À payer", etat: "planifie" },
  { cle: "partielle", libelle: "Payée en partie", etat: "en-cours" },
  { cle: "payee", libelle: "Payée", etat: "fait" },
  { cle: "avoir", libelle: "Avoir, en déduction", etat: "planifie" },
];
const paiementLibelle = (p: Paiement) => PAIEMENTS.find((x) => x.cle === p)!.libelle;
/* l'IBAN du fournisseur, comme la colonne IBAN de l'écran d'avant */
type EtatIban = "valide" | "a_valider" | "manquant" | "deduction";
const IBANS: { cle: EtatIban; libelle: string }[] = [
  { cle: "valide", libelle: "IBAN validé" },
  { cle: "a_valider", libelle: "IBAN à valider" },
  { cle: "manquant", libelle: "IBAN manquant" },
  { cle: "deduction", libelle: "Sans IBAN (avoir)" },
];
const ibanLibelle = (i: EtatIban) => IBANS.find((x) => x.cle === i)!.libelle;

/* une facture, sous la forme que lisent la liste et la page */
type Ligne = {
  f: FactureDuFournisseur;
  id: string;
  four: Fournisseur | null;
  nom: string;
  groupe: Groupe;
  /* les jours jusqu'à l'échéance (négatif : de retard) */
  jours: number | null;
  paiement: Paiement;
  ep: EtatPaiement | undefined;
  iban: EtatIban;
  ibanMasque: string | null;
  reste: number;
  bloque: boolean;
  /* à traiter (« non lu ») : en retard ou due cette semaine, pas payée */
  aTraiter: boolean;
  couleur: string;
};

/* ——— les filtres (règle de Teo, 28/10 : une option ne quitte pas la page, elle filtre) ———
   ?filtre=echeance:retard&filtre=fournisseur:<id>&filtre=paiement:partielle&filtre=iban:manquant,
   une valeur par dimension ; rechoisir l'option cochée retire le filtre. */
type Dimension = "echeance" | "fournisseur" | "paiement" | "iban";
type Filtre = { dim: Dimension; val: string };
const DIMENSIONS: Dimension[] = ["echeance", "fournisseur", "paiement", "iban"];
const VALABLES: Record<Dimension, (val: string) => boolean> = {
  echeance: (v) => ORDRE_GROUPES.includes(v as Groupe),
  fournisseur: (v) => !!v,
  paiement: (v) => PAIEMENTS.some((x) => x.cle === v),
  iban: (v) => IBANS.some((x) => x.cle === v),
};
const GARDES: Record<Dimension, (l: Ligne, val: string) => boolean> = {
  echeance: (l, v) => l.groupe === v,
  fournisseur: (l, v) => (l.f.fournisseur_id ?? "") === v,
  paiement: (l, v) => l.paiement === v,
  iban: (l, v) => l.iban === v,
};
function lireFiltres(params: { getAll: (cle: string) => string[] }): Filtre[] {
  const vus = new Map<Dimension, string>();
  for (const brut of params.getAll("filtre")) {
    const i = brut.indexOf(":");
    const dim = brut.slice(0, i) as Dimension;
    const val = brut.slice(i + 1);
    if (i > 0 && DIMENSIONS.includes(dim) && !vus.has(dim) && VALABLES[dim](val)) vus.set(dim, val);
  }
  return DIMENSIONS.filter((d) => vus.has(d)).map((d) => ({ dim: d, val: vus.get(d)! }));
}

type Tri = "echeance" | "montant" | "fournisseur";

/* le losange d'un jalon : contour seul, jaune une fois l'étape atteinte (comme la première page) */
function Losange({ atteint }: { atteint: boolean }) {
  return (
    <svg className="lin-losange" data-atteint={atteint ? "" : undefined} viewBox="0 0 16 16" aria-hidden="true">
      <path d="M8 1.8 12.9 8 8 14.2 3.1 8z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeOpacity={atteint ? 0.4 : 1} />
    </svg>
  );
}

/* l'hexagone de l'état de paiement ; un fournisseur bloqué passe devant (« ne pas payer ») */
const etatProjetDe = (l: Ligne): EtatProjet => (l.bloque && l.paiement !== "payee" ? "annule" : PAIEMENTS.find((x) => x.cle === l.paiement)!.etat);
const etatTitre = (l: Ligne) => (l.bloque && l.paiement !== "payee" ? "Fournisseur bloqué : ne pas payer" : paiementLibelle(l.paiement));
function IconeEtat({ l }: { l: Ligne }) {
  return <IconeStatutProjet etat={etatProjetDe(l)} titre={etatTitre(l)} />;
}

/* « en retard de 3 j », « dans 5 j », « aujourd'hui » */
const delai = (l: Ligne) => {
  if (l.jours === null) return "sans échéance";
  if (l.jours < 0) return `en retard de ${-l.jours} j`;
  if (l.jours === 0) return "aujourd'hui";
  return `dans ${l.jours} j`;
};

export default function BoiteAPayer() {
  const { source } = useSource();
  const routeur = useRouter();
  const params = useSearchParams();
  const toast = useToast();
  /* l'horloge du navigateur (horloge.ts) : null au rendu serveur, la page attend le montage */
  const aujourdhui = useAujourdhui();
  const exemple = useMemo(() => vueExemple(), []);
  const [etatsEx, setEtatsEx] = useState<Etats>(() => etatsExemple(exemple.factures, minuit()));
  const [reel, setReel] = useState<VueFournisseurs | null>(null);
  const [etatsReels, setEtatsReels] = useState<Etats>({});
  const [erreur, setErreur] = useState<string | null>(null);
  const [recherche, setRecherche] = useState("");
  const [tri, setTri] = useState<Tri>("echeance");
  const [montrerPayees, setMontrerPayees] = useState(false);
  /* « Noter un paiement » : la fenêtre de l'écran d'avant, à l'identique */
  const [aNoter, setANoter] = useState<FactureDuFournisseur | null>(null);
  const [date, setDate] = useState(aujourdhuiIso);
  const [montantSaisi, setMontantSaisi] = useState("");
  const [moyen, setMoyen] = useState<MoyenPaiement>("virement");
  const [referenceSaisie, setReferenceSaisie] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreurPaiement, setErreurPaiement] = useState<string | null>(null);
  /* le message de l'écran d'avant, gardé à l'identique : « C'est fait. … », sur la facture notée */
  const [fait, setFait] = useState<{ id: string; texte: string } | null>(null);
  const listeRef = useRef<HTMLUListElement>(null);
  /* la section Activité de la facture ouverte : la cloche de la tête y fait défiler */
  const activiteRef = useRef<HTMLDivElement>(null);
  /* l'étoile de la tête du détail : les factures épinglées passent en tête de la liste (propre à ce navigateur) */
  const [epingles, basculerEpingle] = useEpingles("filed-a-payer");

  /* ——— la base réelle : les mêmes portes que l'écran d'avant ——— */
  const charger = useCallback(async () => {
    await Promise.resolve();
    setErreur(null);
    try {
      const v = await chargerVueFournisseurs();
      const aLire = v.factures.filter((f) => A_PAYER.has(f.statut) && f.nature !== "avoir");
      const lus = await Promise.all(
        aLire.map((f) =>
          etatPaiement(f.id)
            .then((e) => [f.id, e] as const)
            .catch(() => [f.id, null] as const),
        ),
      );
      setEtatsReels(Object.fromEntries(lus.filter((x): x is readonly [string, EtatPaiement] => !!x[1])));
      setReel(v);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base n'a pas répondu.");
      setReel({ fournisseurs: [], ibans: [], factures: [], deposants: {} });
    }
  }, []);
  useEffect(() => {
    if (source !== "reelle") return;
    const t = window.setTimeout(() => void charger(), 0);
    return () => window.clearTimeout(t);
  }, [source, charger]);
  useTempsReel(["filed_factures", "filed_fournisseurs", "filed_fournisseurs_ibans"], source === "reelle", charger);

  const vue = source === "exemple" ? exemple : reel;
  const etats = source === "exemple" ? etatsEx : etatsReels;
  const chargement = (source === "reelle" && !reel) || aujourdhui === null;

  /* toutes les factures validées ou comptabilisées, sous forme de lignes */
  const base: Ligne[] = useMemo(() => {
    if (!vue || aujourdhui === null) return [];
    return vue.factures
      .filter((f) => A_PAYER.has(f.statut))
      .map((f) => {
        const four = vue.fournisseurs.find((x) => x.id === f.fournisseur_id) ?? null;
        const ep = etats[f.id];
        const avoir = f.nature === "avoir";
        const ib = vue.ibans.find((i) => i.fournisseur_id === f.fournisseur_id && i.statut === "valide") ?? null;
        const propose = vue.ibans.some((i) => i.fournisseur_id === f.fournisseur_id && i.statut === "propose");
        const groupe = groupeDe(f, aujourdhui);
        const paiement: Paiement = avoir ? "avoir" : ep?.etat === "payee" ? "payee" : ep?.etat === "partielle" ? "partielle" : "a_payer";
        return {
          f,
          id: f.id,
          four,
          nom: four?.nom ?? "Fournisseur inconnu",
          groupe,
          jours: f.echeance_lue ? Math.round((jourDe(f.echeance_lue) - aujourdhui) / JOUR) : null,
          paiement,
          ep: avoir ? undefined : ep,
          iban: avoir ? "deduction" : ib ? "valide" : propose ? "a_valider" : "manquant",
          ibanMasque: ib?.iban_masque ?? null,
          reste: aPayer(f, etats),
          bloque: four?.statut === "bloque",
          aTraiter: !avoir && paiement !== "payee" && (groupe === "retard" || groupe === "semaine"),
          couleur: couleurDe(f.fournisseur_id ?? four?.nom ?? f.id),
        };
      });
  }, [vue, etats, aujourdhui]);

  /* ——— l'adresse : la facture choisie (?id=) et les filtres (?filtre=) ——— */
  const id = params.get("id");
  /* « Seulement ce qui est à traiter » (le « Show unreads only » de Linear) : ?traiter=1 */
  const traiter = params.get("traiter") === "1";
  const filtresActifs = lireFiltres(params);
  const adresse = useCallback(
    (modif: (p: URLSearchParams) => void) => {
      const p = new URLSearchParams(params.toString());
      modif(p);
      const qs = p.toString().replace(/%3A/gi, ":");
      return qs ? `${CHEMIN}?${qs}` : CHEMIN;
    },
    [params],
  );
  const lienId = useCallback((x: string | null) => adresse((p) => (x ? p.set("id", x) : p.delete("id"))), [adresse]);
  const lienFiltres = (fs: Filtre[]) =>
    adresse((p) => {
      p.delete("filtre");
      for (const d of DIMENSIONS) for (const f of fs.filter((x) => x.dim === d)) p.append("filtre", `${f.dim}:${f.val}`);
    });
  const lienSansFiltres = adresse((p) => {
    p.delete("filtre");
    p.delete("traiter");
  });
  const basculerTraiter = () =>
    routeur.replace(
      adresse((p) => (traiter ? p.delete("traiter") : p.set("traiter", "1"))),
      { scroll: false },
    );
  const filtreDe = (dim: Dimension) => filtresActifs.find((f) => f.dim === dim)?.val ?? null;
  const estActif = (dim: Dimension, val: string) => filtreDe(dim) === val;
  const basculer = (dim: Dimension, val: string) => lienFiltres([...filtresActifs.filter((f) => f.dim !== dim), ...(estActif(dim, val) ? [] : [{ dim, val }])]);

  /* les payées restent masquées comme avant, sauf à les afficher ou à filtrer sur « Payée » */
  const voirPayees = montrerPayees || filtreDe("paiement") === "payee";
  const q = sansAccents(recherche.trim());
  const correspond = (l: Ligne) => !q || [l.four?.nom, l.f.reference, l.f.numero].some((x) => x && sansAccents(x).includes(q));
  const dansLaPortee = (l: Ligne, sauf?: Dimension) => (voirPayees || l.paiement !== "payee") && (!traiter || l.aTraiter) && correspond(l) && filtresActifs.every((f) => f.dim === sauf || GARDES[f.dim](l, f.val));
  const cleFiltres = filtresActifs.map((f) => `${f.dim}:${f.val}`).join("|");
  const visibles = useMemo(() => {
    const ordre = (a: Ligne, b: Ligne) =>
      tri === "montant"
        ? b.reste - a.reste
        : tri === "fournisseur"
          ? a.nom.localeCompare(b.nom, "fr") || (a.f.echeance_lue ?? "9999").localeCompare(b.f.echeance_lue ?? "9999")
          : (a.f.echeance_lue ?? "9999").localeCompare(b.f.echeance_lue ?? "9999") || aPayer(b.f, etats) - aPayer(a.f, etats);
    const tries = base.filter((l) => dansLaPortee(l)).sort(ordre);
    /* les épinglées d'abord, chacune des deux parts dans l'ordre courant */
    return [...tries.filter((l) => epingles.has(l.id)), ...tries.filter((l) => !epingles.has(l.id))];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base, tri, voirPayees, traiter, q, cleFiltres, etats, epingles]);
  const choisie = id ? (base.find((l) => l.id === id) ?? null) : null;
  const rang = choisie ? visibles.findIndex((l) => l.id === choisie.id) : -1;

  /* ↑/↓ changent de facture, Échap referme (pas quand un menu, un champ ou la fenêtre de paiement a la main) */
  useEffect(() => {
    const touche = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || aNoter) return;
      const c = e.target as HTMLElement | null;
      if (c && (c.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(c.tagName))) return;
      if (document.querySelector(".lin-menu")) return;
      if (e.key === "Escape" && id) {
        e.preventDefault();
        routeur.replace(lienId(null), { scroll: false });
      } else if ((e.key === "ArrowDown" || e.key === "ArrowUp") && visibles.length) {
        e.preventDefault();
        const i = visibles.findIndex((l) => l.id === id);
        const j = e.key === "ArrowDown" ? (i < 0 ? 0 : Math.min(visibles.length - 1, i + 1)) : i < 0 ? visibles.length - 1 : Math.max(0, i - 1);
        routeur.replace(lienId(visibles[j].id), { scroll: false });
      }
    };
    window.addEventListener("keydown", touche);
    return () => window.removeEventListener("keydown", touche);
  }, [aNoter, id, visibles, routeur, lienId]);
  /* la ligne choisie reste à l'écran quand on la change au clavier */
  useEffect(() => {
    listeRef.current?.querySelector("[data-actif]")?.scrollIntoView({ block: "nearest" });
  }, [id]);

  /* ——— noter un paiement : la même fenêtre, la même porte que l'écran d'avant ——— */
  const ouvrirPaiement = (l: Ligne) => {
    setErreurPaiement(null);
    setFait(null);
    setDate(aujourdhuiIso());
    setMontantSaisi(String(aPayer(l.f, etats)).replace(".", ","));
    setMoyen(l.iban === "valide" ? "virement" : "autre");
    setReferenceSaisie("");
    setANoter(l.f);
  };
  const montantNet = Number(montantSaisi.replace(/\s/g, "").replace(",", "."));
  const resteANoter = aNoter ? aPayer(aNoter, etats) : 0;
  const montantOk = !montantSaisi.trim() || (Number.isFinite(montantNet) && montantNet > 0 && montantNet <= resteANoter + 0.001);
  const dateOk = !!date && date <= aujourdhuiIso();
  const nomDe = (f: FactureDuFournisseur) => vue?.fournisseurs.find((x) => x.id === f.fournisseur_id)?.nom ?? null;

  async function soumettrePaiement() {
    if (!aNoter) return;
    const f = aNoter;
    const m = montantSaisi.trim() ? Math.round(montantNet * 100) / 100 : null;
    setEnvoi(true);
    setErreurPaiement(null);
    try {
      if (source === "reelle") {
        await noterPaiement({ facture: f.id, date, montant: m, moyen, reference: referenceSaisie.trim() || null });
        await charger();
      } else {
        await new Promise((r) => setTimeout(r, 300));
        setEtatsEx((e) => {
          const avant = e[f.id] ?? { du: du(f), regle: 0, reste: du(f), etat: "a_payer" as const, dernier_le: null, nb_reglements: 0 };
          const regle = Math.round((avant.regle + (m ?? avant.reste)) * 100) / 100;
          const reste = Math.round((avant.du - regle) * 100) / 100;
          return { ...e, [f.id]: { ...avant, regle, reste, etat: reste <= 0 ? "payee" : "partielle", dernier_le: new Date(date).toISOString(), nb_reglements: avant.nb_reglements + 1 } };
        });
      }
      const reste = resteANoter - (m ?? resteANoter);
      setFait({
        id: f.id,
        texte: `${montant(m ?? resteANoter, f.devise)} notés sur ${f.reference ?? "la facture"} (${LIBELLES_MOYEN[moyen].toLowerCase()})${reste > 0.004 ? ` ; reste ${montant(Math.round(reste * 100) / 100, f.devise)}.` : " : la facture est payée."}`,
      });
      toast(`Paiement noté : ${montant(m ?? resteANoter, f.devise)} sur ${f.reference ?? "la facture"}${reste > 0.004 ? `, reste ${montant(Math.round(reste * 100) / 100, f.devise)}` : ", facture payée"}`, "vert");
      setANoter(null);
    } catch (e) {
      setErreurPaiement(e instanceof Error ? e.message : "La base a refusé le paiement.");
    } finally {
      setEnvoi(false);
    }
  }

  const copier = (texte: string, quoi = "Référence copiée") =>
    navigator.clipboard?.writeText(texte).then(
      () => toast(quoi, "vert"),
      () => toast("Impossible de copier. Réessayez.", "rouge"),
    );

  /* ——— les chiffres de l'écran d'avant ——— */
  const aPayerVisibles = visibles.filter((l) => l.paiement !== "payee");
  const nbATraiter = visibles.filter((l) => l.aTraiter).length;
  const nbPayees = base.filter((l) => l.paiement === "payee").length;
  const sansIban = base.filter((l) => l.paiement !== "avoir" && l.paiement !== "payee" && l.iban !== "valide").length;
  const parGroupe = (g: Groupe) => base.filter((l) => l.groupe === g && l.paiement !== "payee");

  /* une option de filtre : son chiffre est compté sous les autres filtres posés */
  const nombreSauf = (dim: Dimension, test: (l: Ligne) => boolean) => base.filter((l) => dansLaPortee(l, dim) && test(l)).length;
  const fournisseursPresents = [...new Map(base.filter((l) => l.f.fournisseur_id).map((l) => [l.f.fournisseur_id!, l] as const)).values()].sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
  const nomFournisseur = (fid: string) => base.find((l) => l.f.fournisseur_id === fid)?.nom ?? vue?.fournisseurs.find((x) => x.id === fid)?.nom ?? "Fournisseur";
  const puce = (f: Filtre): { icone: React.ReactNode; libelle: string } => {
    if (f.dim === "echeance") return { icone: <IconePriorite niveau={NIVEAUX[f.val as Groupe]} titre={groupeLibelle(f.val as Groupe)} />, libelle: `Échéance : ${groupeLibelle(f.val as Groupe).toLowerCase()}` };
    if (f.dim === "fournisseur") return { icone: <IconeGroupe />, libelle: nomFournisseur(f.val) };
    if (f.dim === "paiement") return { icone: <IconeStatutProjet etat={PAIEMENTS.find((x) => x.cle === f.val)!.etat} />, libelle: paiementLibelle(f.val as Paiement) };
    return { icone: <IconeJauge />, libelle: ibanLibelle(f.val as EtatIban) };
  };
  const sectionsFiltre: { titre: string; dim: Dimension; options: { val: string; libelle: string; icone: React.ReactNode; n: number }[] }[] = [
    {
      titre: "Échéance",
      dim: "echeance",
      options: GROUPES.map((g) => ({ val: g.cle, libelle: g.libelle, icone: <IconePriorite niveau={NIVEAUX[g.cle]} titre={g.libelle} />, n: nombreSauf("echeance", (l) => l.groupe === g.cle) })),
    },
    {
      titre: "État de paiement",
      dim: "paiement",
      options: PAIEMENTS.filter((p) => p.cle !== "avoir" || base.some((l) => l.paiement === "avoir")).map((p) => ({
        val: p.cle,
        libelle: p.libelle,
        icone: <IconeStatutProjet etat={p.etat} />,
        n: p.cle === "payee" ? base.filter((l) => dansLaPortee({ ...l, paiement: "a_payer" }, "paiement") && l.paiement === "payee").length : nombreSauf("paiement", (l) => l.paiement === p.cle),
      })),
    },
    {
      titre: "IBAN",
      dim: "iban",
      options: IBANS.filter((i) => i.cle !== "deduction" || base.some((l) => l.iban === "deduction")).map((i) => ({
        val: i.cle,
        libelle: i.libelle,
        icone: <IconeJauge />,
        n: nombreSauf("iban", (l) => l.iban === i.cle),
      })),
    },
    {
      titre: "Fournisseur",
      dim: "fournisseur",
      options: fournisseursPresents.map((l) => ({
        val: l.f.fournisseur_id!,
        libelle: l.nom,
        icone: <FileText width={16} height={16} style={{ color: l.couleur }} aria-hidden="true" />,
        n: nombreSauf("fournisseur", (x) => x.f.fournisseur_id === l.f.fournisseur_id),
      })),
    },
  ];

  /* le « ··· » de la tête de liste (« Notification actions » de Linear) : les gestes sur toute la liste */
  const premiereATraiter = visibles.find((l) => l.aTraiter) ?? null;
  const optionsListe: Option[] = [
    ...(premiereATraiter
      ? [
          {
            cle: "premiere",
            libelle: "Ouvrir la première à traiter",
            meta: premiereATraiter.f.reference ?? undefined,
            icone: <IconeNonLus />,
            action: () => routeur.replace(lienId(premiereATraiter.id), { scroll: false }),
          },
        ]
      : []),
    ...(nbPayees
      ? [{ cle: "payees", libelle: montrerPayees ? "Masquer les payées" : "Afficher les payées", meta: String(nbPayees), icone: <IconeStatutProjet etat="fait" />, action: () => setMontrerPayees((v) => !v) }]
      : []),
    ...(filtresActifs.length || recherche || traiter
      ? [
          {
            cle: "effacer",
            libelle: "Effacer les filtres",
            icone: <ListFilter width={16} height={16} />,
            action: () => {
              setRecherche("");
              routeur.replace(lienSansFiltres, { scroll: false });
            },
          },
        ]
      : []),
    ...(aPayerVisibles.length
      ? [
          {
            cle: "total",
            libelle: "Copier le reste à payer",
            meta: totaux(
              aPayerVisibles.map((l) => l.f),
              etats,
            ),
            icone: <Copy width={16} height={16} />,
            action: () =>
              void copier(
                totaux(
                  aPayerVisibles.map((l) => l.f),
                  etats,
                ),
                "Reste à payer copié",
              ),
          },
        ]
      : []),
    { cle: "fournisseurs", libelle: "Voir les fournisseurs", icone: <IconeGroupe />, href: `${RACINE}/filed/fournisseurs` },
  ];

  /* ——— la colonne de liste ——— */
  const liste = (
    <section className="lin-boite-liste" aria-label="Factures à payer">
      <header className="lin-tete">
        <span className="lin-tete-titre">À payer</span>
        <MenuActions rond aGauche titre="Actions de la liste" options={optionsListe} />
        <div className="lin-tete-ronds">
          <button type="button" className="lin-rond" aria-pressed={traiter} aria-label="Seulement ce qui est à traiter" title="Seulement ce qui est à traiter" onClick={basculerTraiter}>
            <IconeNonLus />
          </button>
          <Menu
            largeur={300}
            bouton={(ouvert, basculerMenu) => (
              <button type="button" className="lin-rond" aria-label="Filtrer" title="Filtrer" aria-expanded={ouvert} data-actif={recherche || filtresActifs.length ? "" : undefined} onClick={basculerMenu}>
                <ListFilter width={14} height={14} aria-hidden="true" />
              </button>
            )}
          >
            {(fermer) => (
              <div className="apayer-menu">
                <input
                  className="lin-menu-champ"
                  autoFocus
                  placeholder="Rechercher un fournisseur, une référence, un numéro…"
                  aria-label="Rechercher une facture"
                  value={recherche}
                  onChange={(e) => setRecherche(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && fermer()}
                />
                {sectionsFiltre
                  .filter((s) => s.options.length)
                  .map((s) => (
                    <div key={s.dim} role="group" aria-label={s.titre}>
                      <p className="apayer-menu-titre">{s.titre}</p>
                      {s.options.map((o) => (
                        <button
                          key={o.val}
                          type="button"
                          className="lin-menu-option"
                          aria-pressed={estActif(s.dim, o.val)}
                          onClick={() => {
                            fermer();
                            routeur.replace(basculer(s.dim, o.val), { scroll: false });
                          }}
                        >
                          {o.icone}
                          <span>{o.libelle}</span>
                          <span className="lin-meta">{o.n}</span>
                          {estActif(s.dim, o.val) ? <Check className="lin-option-coche" aria-label="filtre posé" /> : null}
                        </button>
                      ))}
                    </div>
                  ))}
              </div>
            )}
          </Menu>
          <Menu
            largeur={280}
            bouton={(ouvert, basculerMenu) => (
              <button type="button" className="lin-rond" aria-label="Options d'affichage" title="Options d'affichage" aria-expanded={ouvert} onClick={basculerMenu}>
                <SlidersHorizontal width={14} height={14} aria-hidden="true" />
              </button>
            )}
          >
            {() => (
              <>
                <div className="lin-menu-section">
                  <label className="lin-reglage">
                    Tri
                    <Choix<Tri>
                      libelle="Tri"
                      valeur={tri}
                      onChange={setTri}
                      options={[
                        { cle: "echeance", libelle: "Échéance" },
                        { cle: "montant", libelle: "Reste à payer" },
                        { cle: "fournisseur", libelle: "Fournisseur" },
                      ]}
                    />
                  </label>
                </div>
                <div className="lin-menu-section">
                  <label className="lin-reglage">
                    Afficher les payées{nbPayees ? ` (${nbPayees})` : ""}
                    <span className="apayer-bascule">
                      <input type="checkbox" checked={montrerPayees} disabled={!nbPayees} onChange={(e) => setMontrerPayees(e.target.checked)} />
                    </span>
                  </label>
                </div>
              </>
            )}
          </Menu>
        </div>
      </header>
      {filtresActifs.length || recherche ? (
        <div className="lin-outils apayer-outils">
          {recherche ? (
            <button type="button" className="v2-btn v2-btn--petit lin-filtre-actif" data-actif="" title="Effacer la recherche" onClick={() => setRecherche("")}>
              « {recherche} » ✕
            </button>
          ) : null}
          {filtresActifs.map((f) => {
            const p = puce(f);
            return (
              <Link key={f.dim} href={lienFiltres(filtresActifs.filter((x) => x !== f))} className="v2-btn v2-btn--petit lin-filtre-actif" data-actif="" title="Retirer ce filtre" scroll={false} replace>
                {p.icone}
                {p.libelle} ✕
              </Link>
            );
          })}
        </div>
      ) : null}
      {chargement ? (
        <p className="lin-vide">{erreur ? `La base réelle n'a pas répondu : ${erreur}` : "Lecture des factures…"}</p>
      ) : !base.length ? (
        <p className="lin-vide">{erreur ? `La base réelle n'a pas répondu : ${erreur}` : "Rien à payer. Aucune facture validée pour l'instant : elles arrivent ici après leur validation dans « À valider »."}</p>
      ) : !visibles.length ? (
        <div className="lin-vide">
          <p style={{ margin: "0 0 12px" }}>{filtresActifs.length || q ? "Aucune facture ne correspond." : traiter ? "Rien à traiter : ni retard, ni échéance cette semaine." : "Toutes les factures sont payées."}</p>
          {filtresActifs.length || q || traiter ? (
            <Link
              href={lienSansFiltres}
              className="v2-btn v2-btn--petit"
              scroll={false}
              replace
              onClick={() => {
                setRecherche("");
              }}
            >
              Effacer les filtres
            </Link>
          ) : nbPayees ? (
            <button type="button" className="v2-btn v2-btn--petit" onClick={() => setMontrerPayees(true)}>
              Afficher les payées ({nbPayees})
            </button>
          ) : null}
        </div>
      ) : (
        <ul className="lin-boite-lignes" ref={listeRef}>
          {visibles.map((l) => (
            <li key={l.id}>
              <Link href={lienId(l.id)} className="lin-boite-ligne" data-actif={l.id === id ? "" : undefined} data-non-lu={l.aTraiter ? "" : undefined} aria-current={l.id === id ? "true" : undefined} scroll={false}>
                <span className="lin-boite-sante" aria-hidden="true">
                  <IconeSante etat={l.paiement === "payee" || l.paiement === "avoir" ? "bien" : l.groupe === "retard" ? "hors" : l.groupe === "semaine" ? "risque" : "bien"} />
                </span>
                <span className="lin-boite-texte">
                  <span className="lin-boite-l1">
                    {l.aTraiter ? <span className="lin-boite-point" aria-label="à traiter" /> : null}
                    <b>{l.f.reference ?? "dossier"}</b>
                    <span>{l.nom}</span>
                  </span>
                  <span className="lin-boite-l2">
                    {l.paiement === "avoir"
                      ? `${montant(l.reste, l.f.devise)} en déduction`
                      : l.paiement === "payee"
                        ? `${montant(l.ep?.du ?? du(l.f), l.f.devise)} · payée`
                        : `${montant(l.reste, l.f.devise)}${l.paiement === "partielle" ? " restants" : ""} · ${l.groupe === "sans" ? "sans échéance" : `${groupeLibelle(l.groupe).toLowerCase()}, ${delai(l)}`}`}
                  </span>
                </span>
                <span className="lin-boite-droite">
                  <IconeEtat l={l} />
                  <span className="lin-boite-heure">{l.f.echeance_lue ? dateCourte(l.f.echeance_lue) : "—"}</span>
                </span>
              </Link>
            </li>
          ))}
          <Surlignage />
        </ul>
      )}
    </section>
  );

  /* ——— rien de choisi : l'Inbox vide de Linear, avec les compteurs de l'écran d'avant ——— */
  const vide = (
    <section className="lin-boite-detail" aria-label="Aucune facture choisie">
      {/* la tête reste là, vide, pour que sa ligne traverse toute la largeur (comme l'Inbox de Linear) */}
      <header className="lin-tete" />
      <div className="lin-boite-vide apayer-vide">
        <Banknote strokeWidth={1.2} aria-hidden="true" />
        {chargement ? (
          <p className="apayer-vide-sous">Lecture des factures…</p>
        ) : id && !choisie ? (
          <>
            <p className="apayer-vide-titre">Facture introuvable</p>
            <p className="apayer-vide-sous">
              La facture que désigne ce lien n&apos;est pas dans « À payer »{source === "exemple" ? " (vous regardez les données d'exemple)" : ""}.{" "}
              <Link href={lienId(null)} scroll={false} replace>
                Revenir à la liste
              </Link>
            </p>
          </>
        ) : (
          <>
            <p className="apayer-vide-titre">{nbATraiter ? `${pluriel(nbATraiter, "facture")} à traiter` : aPayerVisibles.length ? `${pluriel(aPayerVisibles.length, "facture")} à payer` : "Rien à payer"}</p>
            <p className="apayer-vide-sous">
              Les factures validées, par échéance : le retard d&apos;abord, le reste à payer, et ce qui empêcherait de payer. Reste à payer :{" "}
              <strong>
                {totaux(
                  base.filter((l) => l.paiement !== "payee").map((l) => l.f),
                  etats,
                )}
              </strong>
              .
            </p>
            <ul className="apayer-compteurs" aria-label="Filtrer par échéance">
              {GROUPES.filter((g) => g.cle !== "sans" || parGroupe("sans").length).map((g) => {
                const lignes = parGroupe(g.cle);
                return (
                  <li key={g.cle}>
                    <Link
                      href={basculer("echeance", g.cle)}
                      className="v2-btn v2-btn--petit"
                      data-actif={estActif("echeance", g.cle) ? "" : undefined}
                      aria-pressed={estActif("echeance", g.cle)}
                      scroll={false}
                      replace
                      title={g.sous}
                    >
                      <IconePriorite niveau={NIVEAUX[g.cle]} titre={g.libelle} />
                      {g.libelle}
                      <span className="lin-meta">
                        {lignes.length
                          ? `${lignes.length} · ${totaux(
                              lignes.map((l) => l.f),
                              etats,
                            )}`
                          : "0"}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
            {sansIban ? (
              <p className="apayer-vide-sous">
                <strong className="apayer-alerte">
                  {sansIban} facture{sansIban > 1 ? "s" : ""} sans IBAN validé.
                </strong>{" "}
                Le virement attend qu&apos;un IBAN du fournisseur soit validé dans « À valider », ou passera par un autre moyen.
              </p>
            ) : null}
            {erreur ? (
              <p className="apayer-vide-sous apayer-rouge" role="alert">
                La base réelle n&apos;a pas répondu. {erreur}
              </p>
            ) : null}
            {visibles.length ? <p className="apayer-vide-sous">↑ ↓ pour parcourir les factures, Échap pour refermer.</p> : null}
          </>
        )}
      </div>
    </section>
  );

  return (
    <div className="lin">
      <h1 className="v2-sr">À payer</h1>
      <div className="lin-boite">
        {liste}
        {choisie ? detail(choisie) : vide}
      </div>
      {fenetrePaiement()}
    </div>
  );

  /* ——— la facture choisie : la page d'un ticket de Linear (Teo, 28/10 : « trop d'informations », pas de sections grises) ———
     le fournisseur en titre, une phrase (numéro, ce qui reste à payer, l'échéance), trois gestes en icônes,
     les autres factures dues au même fournisseur, puis le parcours en fil d'activité ; à droite, sans cadre,
     Propriétés (paiement, urgence, échéance), Étiquettes (IBAN, statut) et le fournisseur avec la prochaine étape. */
  function detail(l: Ligne) {
    const f = l.f;
    const ep = l.ep;
    const st = statutFacture(f.statut);
    const peutPayer = l.paiement !== "avoir" && l.paiement !== "payee";
    const lienDossier = `${RACINE}/filed?objet=facture:${encodeURIComponent(f.id)}`;
    const memeFournisseur = base.filter((x) => (f.fournisseur_id ? x.f.fournisseur_id === f.fournisseur_id : x.id === l.id));
    /* les éléments liés : les autres factures encore dues à ce fournisseur, l'échéance la plus proche d'abord */
    const autres = memeFournisseur.filter((x) => x.id !== l.id && x.paiement !== "payee").sort((a, b) => (a.f.echeance_lue ?? "9999").localeCompare(b.f.echeance_lue ?? "9999"));
    const numero = f.numero ? ` n° ${f.numero}` : "";
    /* la description : une phrase, et le seul endroit de la page où paraît le montant de cette facture */
    const description =
      l.paiement === "avoir"
        ? `Avoir${numero} : ${montant(Math.abs(l.reste), f.devise)} en déduction de ce que vous devez à ${l.nom}.`
        : l.paiement === "payee"
          ? `Facture${numero} de ${montant(ep?.du ?? du(f), f.devise)}, payée.`
          : `Facture${numero} : ${l.paiement === "partielle" ? "reste " : ""}${montant(l.reste, f.devise)} à payer, ${f.echeance_lue ? `échéance le ${dateCourte(f.echeance_lue)} (${delai(l)})` : "sans échéance lue"}.`;

    /* les options des pastilles : une action réelle (noter un paiement, copier), ou un filtre de la liste */
    const optionsEtat: Option[] = [
      ...(peutPayer ? [{ cle: "payer", libelle: "Noter un paiement…", icone: <Banknote width={16} height={16} />, action: () => ouvrirPaiement(l) }] : []),
      ...PAIEMENTS.filter((p) => p.cle !== "avoir" || l.paiement === "avoir").map((p): Option => ({
        cle: `filtre-${p.cle}`,
        libelle: `Factures : ${p.libelle.toLowerCase()}`,
        icone: <IconeStatutProjet etat={p.etat} />,
        coche: estActif("paiement", p.cle),
        href: basculer("paiement", p.cle),
      })),
    ];
    const optionsGroupes: Option[] = GROUPES.map((g) => ({
      cle: g.cle,
      libelle: `Factures : ${g.libelle.toLowerCase()}`,
      meta: totaux(
        parGroupe(g.cle).map((x) => x.f),
        etats,
      ),
      icone: <IconePriorite niveau={NIVEAUX[g.cle]} titre={g.libelle} />,
      coche: estActif("echeance", g.cle),
      href: basculer("echeance", g.cle),
    }));
    const optionsEcheance: Option[] = [
      { cle: "groupe", libelle: `Factures : ${groupeLibelle(l.groupe).toLowerCase()}`, icone: <IconeCalendrier />, coche: estActif("echeance", l.groupe), href: basculer("echeance", l.groupe) },
      ...(f.echeance_lue ? [{ cle: "copier", libelle: "Copier la date d'échéance", icone: <Copy width={16} height={16} />, action: () => void copier(dateCourte(f.echeance_lue), "Date copiée") }] : []),
    ];
    const optionsFournisseur: Option[] = [
      ...memeFournisseur.map((x): Option => ({
        cle: x.id,
        libelle: x.f.reference ?? "dossier",
        meta: x.paiement === "payee" ? "payée" : montant(x.reste, x.f.devise),
        icone: <IconeEtat l={x} />,
        coche: x.id === l.id,
        href: lienId(x.id),
      })),
      ...(f.fournisseur_id
        ? [{ cle: "filtre", libelle: "Filtrer la liste sur ce fournisseur", icone: <IconeGroupe />, coche: estActif("fournisseur", f.fournisseur_id), href: basculer("fournisseur", f.fournisseur_id) }]
        : []),
    ];
    const optionsIban: Option[] = [
      { cle: "filtre", libelle: `Factures : ${ibanLibelle(l.iban)}`, icone: <IconeJauge />, coche: estActif("iban", l.iban), href: basculer("iban", l.iban) },
      ...(f.iban && l.iban !== "valide" && l.paiement !== "avoir"
        ? [{ cle: "lu", libelle: "Copier l'IBAN lu (masqué)", meta: masquerIban(f.iban), icone: <Copy width={16} height={16} />, action: () => void copier(masquerIban(f.iban), "IBAN copié") }]
        : []),
    ];
    /* le menu ··· de la tête : ce qui n'a plus de place dans la page (copier le montant, ex-pastille « Montant ») */
    const optionsActions: Option[] = [
      ...(peutPayer ? [{ cle: "payer", libelle: "Noter un paiement…", icone: <Banknote width={16} height={16} />, action: () => ouvrirPaiement(l) }] : []),
      { cle: "ref", libelle: "Copier la référence", icone: <Copy width={16} height={16} />, action: () => void copier(f.reference ?? f.id) },
      ...(f.numero ? [{ cle: "numero", libelle: "Copier le numéro de facture", icone: <IconeDiese />, action: () => void copier(f.numero ?? "", "Numéro copié") }] : []),
      { cle: "montant", libelle: "Copier le montant", icone: <Banknote width={16} height={16} />, action: () => void copier(String(Math.abs(l.reste)).replace(".", ","), "Montant copié") },
      ...(f.fournisseur_id
        ? [{ cle: "fournisseur", libelle: "Filtrer la liste sur ce fournisseur", icone: <IconeGroupe />, coche: estActif("fournisseur", f.fournisseur_id), href: basculer("fournisseur", f.fournisseur_id) }]
        : []),
    ];

    /* le fil d'activité : le parcours de l'écran d'avant (validée, comptabilisée, échéance, règlements, payée), dans l'ordre du temps */
    type Entree = { cle: string; quand: string; icone: React.ReactNode; texte: React.ReactNode };
    const datees: Entree[] = [];
    if (f.echeance_lue) {
      const passee = l.jours !== null && l.jours < 0;
      datees.push({
        cle: "echeance",
        quand: f.echeance_lue,
        icone: <IconeCalendrier passe={passee && peutPayer} />,
        texte: (
          <>
            <b>Échéance</b> · {l.paiement === "payee" || l.paiement === "avoir" ? (passee ? "passée" : "à venir") : delai(l)} · {dateCourte(f.echeance_lue)}
          </>
        ),
      });
    }
    if (ep && ep.regle > 0) {
      const fois = ep.nb_reglements > 1 ? ` en ${ep.nb_reglements} règlements` : "";
      datees.push({
        cle: "reglement",
        quand: ep.dernier_le ?? "9999",
        icone: <IconeStatutProjet etat={l.paiement === "payee" ? "fait" : "en-cours"} />,
        texte: (
          <>
            <b>Paiement noté</b>
            {l.paiement === "payee" ? `${fois} : la facture est payée` : ` : ${montant(ep.regle, f.devise)} réglés${fois}`}
            {ep.dernier_le ? ` · ${dateCourte(ep.dernier_le)}` : ""}
          </>
        ),
      });
    }
    datees.sort((a, b) => a.quand.localeCompare(b.quand));
    const fil: Entree[] = [
      ...(f.date_emission
        ? [
            {
              cle: "emise",
              quand: f.date_emission,
              icone: <IconeDocument />,
              texte: (
                <>
                  <b>{l.nom}</b> · {f.nature === "avoir" ? "avoir émis" : "facture émise"} · {dateCourte(f.date_emission)}
                </>
              ),
            },
          ]
        : []),
      {
        cle: "validee",
        quand: "",
        icone: <Losange atteint />,
        texte: (
          <>
            <b>Validée</b> dans « À valider »
          </>
        ),
      },
      ...(f.statut === "comptabilisee"
        ? [
            {
              cle: "comptabilisee",
              quand: "",
              icone: <Losange atteint />,
              texte: (
                <>
                  <b>Comptabilisée</b>
                </>
              ),
            },
          ]
        : []),
      ...datees,
    ];

    /* la prochaine étape, sous le fournisseur : ce qui empêche de payer d'abord, puis le geste */
    const etape: { texte: string; teinte?: string; payer?: boolean } =
      l.bloque && l.paiement !== "payee"
        ? { texte: "Ne pas payer : fournisseur bloqué", teinte: "rouge" }
        : l.paiement === "avoir"
          ? { texte: "Rien à payer : vient en déduction" }
          : l.paiement === "payee"
            ? { texte: "Rien à faire : facture payée" }
            : l.iban === "manquant"
              ? { texte: "Obtenir un IBAN, ou payer autrement", teinte: "rouge" }
              : l.iban === "a_valider"
                ? { texte: "Valider l'IBAN dans « À valider »", teinte: "jaune" }
                : { texte: "Faire le virement, puis le noter", payer: true };
    const ibanTexte = l.iban === "valide" ? (l.ibanMasque ?? "IBAN validé") : ibanLibelle(l.iban);
    const precedente = rang > 0 ? visibles[rang - 1] : null;
    const suivante = rang >= 0 && rang < visibles.length - 1 ? visibles[rang + 1] : null;
    const epinglee = epingles.has(l.id);
    const refermer = () => routeur.replace(lienId(null), { scroll: false });
    /* le « ··· » de la tête : les gestes de l'ancienne tête (précédente, suivante, payer, copier, ouvrir) puis l'ancien ··· */
    const optionsTete: Option[] = [
      ...(precedente
        ? [
            {
              cle: "precedente",
              libelle: "Facture précédente",
              meta: `↑ · ${rang} / ${visibles.length}`,
              icone: <ChevronUp width={16} height={16} />,
              action: () => routeur.replace(lienId(precedente.id), { scroll: false }),
            },
          ]
        : []),
      ...(suivante
        ? [
            {
              cle: "suivante",
              libelle: "Facture suivante",
              meta: `↓ · ${rang + 2} / ${visibles.length}`,
              icone: <ChevronDown width={16} height={16} />,
              action: () => routeur.replace(lienId(suivante.id), { scroll: false }),
            },
          ]
        : []),
      ...optionsActions.filter((o) => o.cle !== "fournisseur"),
      { cle: "dossier", libelle: "Ouvrir le dossier", icone: <ExternalLink width={16} height={16} />, href: lienDossier },
      ...optionsActions.filter((o) => o.cle === "fournisseur"),
    ];

    return (
      <section className="lin-boite-detail" aria-label={`Facture ${f.reference ?? ""}`}>
        {/* la tête de l'élément ouvert de l'Inbox de Linear : référence, titre, étoile, ···, puis cloche, horloge, bac-croix */}
        <header className="lin-tete">
          <span className="lin-tete-ref">{f.reference ?? "dossier"}</span>
          <span className="lin-tete-nom">{l.nom}</span>
          <button
            type="button"
            className="lin-rond"
            aria-pressed={epinglee}
            aria-label={epinglee ? "Désépingler" : "Épingler en haut de la liste"}
            title={epinglee ? "Désépingler" : "Épingler en haut de la liste"}
            onClick={() => basculerEpingle(l.id)}
          >
            <Star fill={epinglee ? "currentColor" : "none"} aria-hidden="true" />
          </button>
          <MenuActions rond aGauche titre="Actions" options={optionsTete} />
          <div className="lin-tete-ronds">
            <button type="button" className="lin-rond" aria-label="Voir l'activité" title="Voir l'activité" onClick={() => activiteRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}>
              <Bell aria-hidden="true" />
            </button>
            <MenuOptions rond aDroite libelle="Dates" titre="Échéance…" declencheur={<Clock aria-hidden="true" />} options={optionsEcheance} />
            <button type="button" className="lin-rond" aria-label="Fermer (Échap)" title="Fermer (Échap)" onClick={refermer}>
              <IconeBoiteX />
            </button>
          </div>
        </header>

        <div className="lin-ticket">
          <article className="lin-ticket-corps">
            <h2 className="lin-ticket-titre">{l.nom}</h2>
            <p className="lin-ticket-desc">{description}</p>
            <div className="lin-ticket-icones">
              {peutPayer ? (
                <button type="button" className="lin-ticket-icone" aria-label="Noter un paiement" title="Noter un paiement" onClick={() => ouvrirPaiement(l)}>
                  <Banknote aria-hidden="true" />
                </button>
              ) : null}
              <Link href={lienDossier} className="lin-ticket-icone" aria-label="Ouvrir le document" title="Ouvrir le document">
                <FileText aria-hidden="true" />
              </Link>
              <button type="button" className="lin-ticket-icone" aria-label="Copier la référence" title="Copier la référence" onClick={() => void copier(f.reference ?? f.id)}>
                <Copy aria-hidden="true" />
              </button>
            </div>
            {autres.length ? (
              <ul className="lin-ticket-sous" aria-label={`Autres factures dues à ${l.nom}`}>
                {autres.slice(0, 5).map((x) => (
                  <li key={x.id}>
                    <Link href={lienId(x.id)} className="lin-ticket-sous-ligne" scroll={false}>
                      <IconeEtat l={x} />
                      <span className="lin-ticket-sous-ref">{x.f.reference ?? "dossier"}</span>
                      <span className="lin-ticket-sous-nom">{x.paiement === "avoir" ? "avoir, en déduction" : x.f.echeance_lue ? `échéance ${dateCourte(x.f.echeance_lue)}, ${delai(x)}` : "sans échéance"}</span>
                      <span className="lin-ticket-sous-meta">{montant(Math.abs(x.reste), x.f.devise)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
            {autres.length > 5 && f.fournisseur_id ? (
              <Link href={basculer("fournisseur", f.fournisseur_id)} className="lin-ticket-sous-appel" scroll={false} replace>
                <IconeGroupe /> Voir les {autres.length + 1} factures de {l.nom}
              </Link>
            ) : null}
            <hr className="lin-ticket-trait" />
            <div className="lin-ticket-activite-tete" ref={activiteRef}>
              <h3>Activité</h3>
            </div>
            <ul className="lin-ticket-fil">
              {fil.map((a) => (
                <li key={a.cle}>
                  {a.icone}
                  <span>{a.texte}</span>
                </li>
              ))}
              {fait && fait.id === f.id ? (
                <li role="status">
                  <IconeStatutProjet etat="fait" />
                  <span className="lin-ticket-fil-texte apayer-fait">
                    <strong>C&apos;est fait.</strong> {fait.texte}
                  </span>
                </li>
              ) : null}
            </ul>
          </article>

          <aside className="lin-ticket-cote" aria-label="Propriétés de la facture">
            <section className="lin-ticket-section">
              <h3>Propriétés</h3>
              <div className="lin-ticket-pilules">
                <MenuOptions
                  raccourci="s"
                  titre="État de paiement…"
                  teinte={l.bloque && l.paiement !== "payee" ? "rouge" : undefined}
                  declencheur={
                    <>
                      <IconeEtat l={l} />
                      {etatTitre(l)}
                    </>
                  }
                  options={optionsEtat}
                  largeur={300}
                />
                <MenuOptions
                  raccourci="r"
                  titre="À payer par échéance…"
                  declencheur={
                    <>
                      <IconePriorite niveau={l.paiement === "payee" ? 0 : NIVEAUX[l.groupe]} titre={groupeLibelle(l.groupe)} />
                      {l.paiement === "payee" ? "Payée" : groupeLibelle(l.groupe)}
                    </>
                  }
                  options={optionsGroupes}
                  largeur={320}
                />
                <MenuOptions
                  raccourci="e"
                  titre="Échéance…"
                  teinte={f.echeance_lue ? undefined : "gris"}
                  declencheur={
                    <>
                      <IconeCalendrier passe={l.paiement !== "payee" && l.groupe === "retard"} />
                      {f.echeance_lue ? dateCourte(f.echeance_lue) : "Sans échéance"}
                    </>
                  }
                  options={optionsEcheance}
                />
              </div>
            </section>
            <section className="lin-ticket-section">
              <h3>Étiquettes</h3>
              <div className="lin-ticket-pilules">
                <MenuOptions
                  raccourci="i"
                  titre="IBAN…"
                  teinte={l.iban === "manquant" ? "rouge" : l.iban === "a_valider" ? "jaune" : undefined}
                  declencheur={
                    <>
                      <IconeJauge />
                      {ibanTexte}
                    </>
                  }
                  options={optionsIban}
                  largeur={300}
                />
                <span className="lin-ticket-pilule" title="Statut de la facture">
                  <IconeDocument />
                  {st.libelle}
                </span>
              </div>
            </section>
            <section className="lin-ticket-section">
              <h3>Fournisseur</h3>
              <div className="lin-ticket-pilules">
                <MenuOptions
                  raccourci="f"
                  titre="Factures du fournisseur…"
                  teinte={l.four ? undefined : "gris"}
                  declencheur={
                    <>
                      <IconeGroupe />
                      {l.nom}
                    </>
                  }
                  options={optionsFournisseur}
                  largeur={320}
                />
                {etape.payer ? (
                  <button type="button" className="lin-ticket-pilule lin-ticket-sous-pilule" title="Noter un paiement" onClick={() => ouvrirPaiement(l)}>
                    <Banknote aria-hidden="true" />
                    {etape.texte}
                  </button>
                ) : (
                  <span className="lin-ticket-pilule lin-ticket-sous-pilule" data-teinte={etape.teinte}>
                    <IconeStatutProjet etat={etatProjetDe(l)} />
                    {etape.texte}
                  </span>
                )}
              </div>
            </section>
          </aside>
        </div>
      </section>
    );
  }

  /* ——— la fenêtre « Noter un paiement » de l'écran d'avant, à l'identique ——— */
  function fenetrePaiement() {
    return (
      <ModalOverlay isOpen={!!aNoter} onOpenChange={(o) => !o && !envoi && setANoter(null)} isDismissable={!envoi} className="v2-jetons v2-voile">
        <Modal className="v2-modale">
          <Dialog className="v2-modale-dialogue">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (montantOk && dateOk && !envoi) void soumettrePaiement();
              }}
            >
              <div className="v2-modale-corps">
                <Heading slot="title">Noter un paiement</Heading>
                <p>
                  {aNoter ? `${nomDe(aNoter) ?? "Fournisseur"} — ${aNoter.reference ?? ""}${aNoter.numero ? ` (n° ${aNoter.numero})` : ""}. Reste à payer : ${montant(resteANoter, aNoter.devise)}.` : ""} Le paiement est
                  noté, pas exécuté : faites le virement dans votre banque.
                </p>
                <div className="v2-grille-champs">
                  <label className="v2-libelle">
                    Date du paiement
                    <span className={`v2-champ${dateOk ? "" : " v2-champ--erreur"}`}>
                      <input type="date" value={date} max={aujourdhuiIso()} onChange={(e) => setDate(e.target.value)} aria-invalid={!dateOk} />
                    </span>
                    {!dateOk ? <span className="v2-aide v2-aide--erreur">La date ne peut pas être dans le futur.</span> : null}
                  </label>
                  <label className="v2-libelle">
                    Montant
                    <span className={`v2-champ${montantOk ? "" : " v2-champ--erreur"}`}>
                      <input inputMode="decimal" value={montantSaisi} onChange={(e) => setMontantSaisi(e.target.value)} placeholder="vide = tout le reste" aria-invalid={!montantOk} />
                      <span aria-hidden="true">{aNoter?.devise === "EUR" || !aNoter ? "€" : aNoter.devise}</span>
                    </span>
                    {!montantOk ? <span className="v2-aide v2-aide--erreur">Positif, et pas plus que le reste ({aNoter ? montant(resteANoter, aNoter.devise) : ""}).</span> : null}
                  </label>
                  <label className="v2-libelle">
                    Moyen
                    <span className="v2-champ">
                      <select value={moyen} onChange={(e) => setMoyen(e.target.value as MoyenPaiement)}>
                        {MOYENS_PAIEMENT.map((m) => (
                          <option key={m} value={m}>
                            {LIBELLES_MOYEN[m]}
                          </option>
                        ))}
                      </select>
                      <ChevronDown width={16} height={16} aria-hidden="true" style={{ pointerEvents: "none" }} />
                    </span>
                  </label>
                  <label className="v2-libelle">
                    Référence (facultatif)
                    <span className="v2-champ">
                      <input value={referenceSaisie} onChange={(e) => setReferenceSaisie(e.target.value)} maxLength={120} placeholder="libellé du virement, n° de chèque…" />
                    </span>
                  </label>
                </div>
                <p className="v2-aide" style={{ margin: 0 }}>
                  La même référence sur la même facture ne compte qu&apos;une fois. Réservé au gérant, à l&apos;administrateur et au valideur.
                </p>
                {erreurPaiement ? (
                  <Note teinte="rouge" role="alert">
                    <strong>Refusé par la base.</strong> {erreurPaiement}
                  </Note>
                ) : null}
              </div>
              <div className="v2-modale-pied">
                <Button className="v2-btn v2-btn--petit" slot="close" isDisabled={envoi}>
                  Annuler
                </Button>
                <button type="submit" className="v2-btn v2-btn--petit v2-btn--primaire" disabled={!montantOk || !dateOk || envoi}>
                  {envoi ? "Enregistrement…" : "Noter le paiement"}
                </button>
              </div>
            </form>
          </Dialog>
        </Modal>
      </ModalOverlay>
    );
  }
}
