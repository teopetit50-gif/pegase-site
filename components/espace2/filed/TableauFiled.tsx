"use client";

/* ══════════════════════════════════════════════════════════════════════
   FILED — la première page, sur la page « Projects » de Linear (28/10/2026)

   Même modèle que CASHD (../cashd/Debiteurs.tsx), demande de Teo : la
   première page de chaque SaaS refaite sur Linear, au 1:1. Un document
   reçu est un projet.

     · le tableau de bord (/espace2/filed) : la page d'un projet, FILED
       étant le projet — ce qui est à payer et ce qui est en retard, ce qui
       attend une action aujourd'hui, le dû par échéance, les plus grosses
       factures, et à droite les cartes Propriétés, Parcours, À payer et
       Activité ;
     · la liste (?vue=documents) : le tableau des projets — un document par
       ligne, sa famille (bloquée, en litige, en attente, traitée) en santé,
       l'urgence de l'échéance en priorité, le montant, l'échéance, les
       points de contrôle, la part payée en anneau ;
     · un document (?objet=document:<id>, et les liens ?objet=facture: ou
       ?objet=fournisseur: des autres écrans) : la page d'un projet, et
       l'onglet « Dossier », l'écran du dossier de toujours (DossierVue),
       où se font les corrections, par les portes FILED.

   Les chiffres passent par les mêmes portes que l'ancien écran
   (components/espace/filed/EcranFiled.tsx) : l'exemple (DOSSIERS_EXEMPLE,
   modifié en mémoire par les corrections et les dépôts), ou la base
   réelle (chargerListe, puis le dossier à l'ouverture) ; le reste à payer
   par filed_etat_paiement, comme « À payer » (./calculs.ts).
   Gabarit : ../lin/lin.css.
   ══════════════════════════════════════════════════════════════════════ */

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, CheckCheck, Copy, ExternalLink, FileText, Inbox, ListFilter, MessageSquare, PanelRight, SlidersHorizontal, Upload } from "lucide-react";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import { useSource } from "@/components/espace/source";
import { useTempsReel } from "@/components/espace/tempsReel";
import { Avis } from "@/components/espace/ui";
import { montant } from "@/components/espace/format";
import { COMMANDES_EXEMPLE, DOSSIERS_EXEMPLE, FOURNISSEURS_EXEMPLE, LIGNES_COMMANDE_EXEMPLE, MOTIFS_EXEMPLE } from "@/components/espace/exemples/filed";
import { ENTITES, EXEMPLE_CLIENT_ID, EXEMPLE_MOI, SIEGE } from "@/components/espace/exemples/socle";
import type { Commande, DossierFiled, Fournisseur, LigneCommande, MotifRefus } from "@/components/espace/types";
import { FAMILLES, FAMILLES_CONTROLE, NATURES, SOURCES, etatDocument, famille, grouperControles, statutFacture, type Famille } from "@/components/espace/filed/etats";
import { chargerCommandes, chargerDossier, chargerFournisseurs, chargerListe, deposerDocument, etatPaiement, monClient, type Apercu, type EtatPaiement, type FactureDuFournisseur } from "@/components/espace/filed/portes";
import { lireCible, trouverCible } from "@/components/espace/filed/lien";
import { HabilleSb } from "../Habille";
import { useToast } from "../Toasts";
import { useAujourdhui, useMonte } from "../horloge";
import { A_PAYER, GROUPES, aPayer, du, etatsExemple, groupeDe, minuit, totaux, type Etats, type Groupe } from "./calculs";
import { CarteDroite, Choix, GraphiqueProgres, IconePriorite, Menu, MenuActions, MenuOptions, type Option } from "../lin/Lin";
import { IconeCalendrier, IconeDiese, IconeDocument, IconeEnveloppe, IconeGroupe, IconeImport, IconeJauge, IconeStatutProjet, type EtatProjet } from "../lin/icones";
import { RACINE } from "../modules";
import "./tableau-filed.css";

/* l'écran du dossier (pièce en regard, lecteur PDF) ne se charge qu'à l'ouverture de l'onglet « Dossier » */
const DossierVue = dynamic(() => import("@/components/espace/filed/DossierVue"), { ssr: false, loading: () => <p className="lin-vide">Ouverture du dossier…</p> });

type Reel = {
  apercus: Apercu[];
  motifs: MotifRefus[];
  fournisseurs: Fournisseur[];
  commandes: Commande[];
  lignesCommande: LigneCommande[];
  dossiers: Record<string, DossierFiled>;
  moi: string | null;
  etats: Etats;
};
type Tri = "rang" | "echeance" | "montant" | "recu";

/* un document, sous la forme que lisent les trois vues */
type Ligne = {
  a: Apercu;
  id: string;
  sante: Famille;
  /* la facture, sous la forme de « À payer » (calculs.ts) */
  f: FactureDuFournisseur | null;
  nom: string;
  groupe: Groupe | null;
  /* validée ou comptabilisée, pas encore payée : dans « À payer » */
  payable: boolean;
  payee: boolean;
  /* un dû encore à tenir : ni avoir, ni payée, ni refusée, ni écartée */
  enJeu: boolean;
  /* le reste à payer (filed_etat_paiement), sinon le dû */
  reste: number;
  points: number;
};

/* la santé d'un document : sa famille (etats.ts → famille()), dans l'ordre des onglets — ce qui bloque d'abord */
const ORDRE_SANTES: Famille[] = ["bloquee", "litige", "attente", "reste"];
const SANTES: Record<Famille, { libelle: string; teinte: "vert" | "jaune" | "rouge" | "gris" }> = {
  bloquee: { libelle: "Bloquée", teinte: "rouge" },
  litige: { libelle: "En litige", teinte: "jaune" },
  attente: { libelle: "En attente", teinte: "gris" },
  reste: { libelle: "Traitée", teinte: "vert" },
};
const familleDe = (f: Famille) => FAMILLES.find((x) => x.cle === f)!;
const ORDRE_GROUPES: Groupe[] = ["retard", "semaine", "mois", "plus_tard", "sans"];
const groupeLibelle = (g: Groupe) => GROUPES.find((x) => x.cle === g)!.libelle;
const NIVEAUX: Record<Groupe, 0 | 1 | 2 | 3 | 4> = { retard: 4, semaine: 3, mois: 2, plus_tard: 1, sans: 0 };
/* les étapes d'une facture, de la lecture à la comptabilité : les jalons du tableau de bord */
const ETAPES: { cle: string; libelle: string; test: (l: Ligne) => boolean; page: { libelle: string; href: string } }[] = [
  {
    cle: "lecture",
    libelle: "En lecture ou à classer",
    test: (l) => l.a.document.etat === "en_lecture" || l.a.document.etat === "a_classer",
    page: { libelle: "Boîte de réception", href: `${RACINE}/filed/boite` },
  },
  { cle: "a_completer", libelle: "À compléter", test: (l) => l.f?.statut === "a_completer", page: { libelle: "Contrôles et fraude", href: `${RACINE}/filed/controles` } },
  { cle: "bloquee", libelle: "Bloquées", test: (l) => l.f?.statut === "bloquee", page: { libelle: "Contrôles et fraude", href: `${RACINE}/filed/controles` } },
  { cle: "a_valider", libelle: "À valider", test: (l) => l.f?.statut === "a_valider", page: { libelle: "Circuit de validation", href: `${RACINE}/filed/circuit` } },
  { cle: "validee", libelle: "Validées", test: (l) => l.f?.statut === "validee", page: { libelle: "À payer", href: `${RACINE}/filed/a-payer` } },
  { cle: "comptabilisee", libelle: "Comptabilisées", test: (l) => l.f?.statut === "comptabilisee", page: { libelle: "Comptabilité", href: `${RACINE}/filed/comptabilite` } },
  { cle: "refusee", libelle: "Refusées", test: (l) => l.f?.statut === "refusee", page: { libelle: "Refusées", href: `${RACINE}/filed/refusees` } },
];
/* les couleurs d'icône de projet de Linear, une par fournisseur */
const COULEURS = ["#26b5ce", "#5e6ad2", "#4cb782", "#f2994a", "#eb5757", "#bb87fc", "#f2c94c", "#95a2b3"];

const LISTE = `${RACINE}/filed?vue=documents`;
const ficheDe = (id: string) => `${RACINE}/filed?objet=document:${encodeURIComponent(id)}`;
const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? "s" : ""}`;
/* une date calendaire (AAAA-MM-JJ) se lit en UTC, un instant à l'heure du visiteur (rendu après le montage, horloge.ts) */
const dateCourte = (iso: string | null | undefined) =>
  iso
    ? new Date(iso).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "short",
        timeZone: iso.length === 10 ? "UTC" : undefined,
      })
    : "—";
const couleurDe = (id: string) => COULEURS[[...id].reduce((t, c) => t + c.charCodeAt(0), 0) % COULEURS.length];
const somme = (v: number[]) => v.reduce((a, b) => a + b, 0);
const cumul = (v: number[]) => v.map((_, i) => Math.max(0, somme(v.slice(0, i + 1))));
const arrondi = (v: number) => Math.round(v * 100) / 100;
/* une phrase finie par un point, sans en doubler un (« 26 nov. ») */
const phrase = (t: string) => (t.endsWith(".") ? t : `${t}.`);
const nomDe = (a: Apercu) => a.fournisseur?.nom ?? a.document.expediteur ?? a.document.nom_fichier;
const copier = (texte: string) => navigator.clipboard?.writeText(texte);

/* la facture d'un aperçu, sous la forme de « À payer » (comme vueExemple, EcranFournisseurs) */
const versFacture = (a: Apercu): FactureDuFournisseur | null =>
  a.facture
    ? {
        id: a.facture.id,
        numero: a.facture.numero,
        statut: a.facture.statut,
        nature: a.facture.nature,
        montant_ttc: a.facture.montant_ttc,
        net_a_payer: a.facture.net_a_payer,
        devise: a.facture.devise,
        date_emission: a.facture.date_emission,
        echeance_lue: a.facture.echeance_lue,
        iban: a.facture.iban,
        fournisseur_id: a.facture.fournisseur_id,
        reference: a.document.reference,
      }
    : null;

/* l'état de paiement de chaque facture validée (filed_etat_paiement), comme « À payer » */
async function lireEtats(apercus: Apercu[]): Promise<Etats> {
  const aLire = apercus.map((a) => a.facture).filter((f): f is NonNullable<Apercu["facture"]> => !!f && A_PAYER.has(f.statut) && f.nature !== "avoir");
  const lus = await Promise.all(
    aLire.map((f) =>
      etatPaiement(f.id)
        .then((e) => [f.id, e] as const)
        .catch(() => [f.id, null] as const),
    ),
  );
  return Object.fromEntries(lus.filter((x): x is readonly [string, EtatPaiement] => !!x[1]));
}

/* la santé d'un projet : un disque à 25 % et son signe, 16 px (repris de CASHD) */
function IconeSante({ sante }: { sante: Famille }) {
  const t = SANTES[sante].teinte;
  if (t === "gris")
    return (
      <svg className="lin-sante" data-teinte={t} viewBox="0 0 16 16" aria-hidden="true">
        <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="1.6 1.6" />
      </svg>
    );
  return (
    <svg className="lin-sante" data-teinte={t} viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8" r="8" fill="currentColor" opacity="0.25" />
      {t === "vert" ? <path d="M4.8 8.3 7 10.4l4.2-4.6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /> : null}
      {t === "jaune" ? <path d="M5 10.8 7.4 8.3l1.6 1.4L11.2 6M9 6h2.2v2.2" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /> : null}
      {t === "rouge" ? <path d="M5 5.6 7.4 8l1.6-1.4 2.2 3.6M9 10.2h2.2V8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /> : null}
    </svg>
  );
}

/* la famille d'un document, en hexagone de projet (pastilles, cartes, menus) ; le cercle de
   santé reste là où Linear met la santé : la ligne d'auteur et la colonne Santé */
const ETAT_PROJET: Record<Famille, EtatProjet> = { bloquee: "annule", litige: "en-cours", attente: "planifie", reste: "fait" };
function IconeStatut({ sante }: { sante: Famille }) {
  return <IconeStatutProjet etat={ETAT_PROJET[sante]} titre={SANTES[sante].libelle} />;
}

/* l'anneau d'avancement d'un projet, 16 px : ici la part payée */
function Anneau({ part, sante }: { part: number; sante: Famille }) {
  const c = 2 * Math.PI * 5;
  return (
    <svg className="lin-anneau" data-teinte={SANTES[sante].teinte} viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8" r="6.25" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.35" />
      <circle cx="8" cy="8" r="2.5" fill="none" stroke="currentColor" strokeWidth="5" strokeDasharray={`${(part / 100) * c} ${c}`} transform="rotate(-90 8 8)" />
    </svg>
  );
}

/* le losange d'un jalon : contour seul, jaune une fois l'étape atteinte */
function Losange({ atteint }: { atteint: boolean }) {
  return (
    <svg className="lin-losange" data-atteint={atteint ? "" : undefined} viewBox="0 0 16 16" aria-hidden="true">
      <path d="M8 1.8 12.9 8 8 14.2 3.1 8z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeOpacity={atteint ? 0.4 : 1} />
    </svg>
  );
}

function IconeDocumentRecu({ l, grand }: { l: Ligne; grand?: boolean }) {
  const couleur = couleurDe(l.a.fournisseur?.id ?? l.nom);
  if (grand)
    return (
      <span
        className="lin-tuile"
        style={{
          background: `color-mix(in srgb, ${couleur} 18%, transparent)`,
          color: couleur,
        }}
      >
        <FileText width={24} height={24} strokeWidth={1.6} aria-hidden="true" />
      </span>
    );
  return <FileText className="lin-icone-projet" width={16} height={16} strokeWidth={1.8} style={{ color: couleur }} aria-hidden="true" />;
}

const urgenceDe = (l: Ligne): 0 | 1 | 2 | 3 | 4 => (l.enJeu && l.groupe ? NIVEAUX[l.groupe] : 0);
const urgenceTitre = (l: Ligne) => (l.enJeu && l.groupe ? groupeLibelle(l.groupe) : l.payee ? "Payée" : "Pas d'échéance à tenir");
const partPayee = (l: Ligne, etats: Etats) => {
  const e = l.f ? etats[l.f.id] : undefined;
  return e && e.du > 0 ? Math.min(100, Math.round((e.regle / e.du) * 100)) : null;
};

/* la carte « Échéances » : la carte « Progress » de Linear. Trois chiffres, le graphique
   par échéance (cumulé de « échu » à « sans date »), puis la répartition. Le dû
   se partage entre les factures validées (le reste à payer) et celles qui
   attendent encore leur validation : une décision prise dans « À valider »
   fait passer le montant de la courbe jaune à la courbe bleue. */
function CarteAPayer({ lignes, titre, fournisseurs }: { lignes: Ligne[]; titre: string; fournisseurs?: boolean }) {
  const [onglet, setOnglet] = useState<"echeances" | "fournisseurs">("echeances");
  const valide = (l: Ligne) => l.payable;
  const enValidation = (l: Ligne) => l.f?.statut === "a_valider";
  const parGroupe = (test: (l: Ligne) => boolean) => ORDRE_GROUPES.map((g) => arrondi(somme(lignes.filter((l) => l.groupe === g && test(l)).map((l) => l.reste))));
  const valides = parGroupe(valide);
  const aValider = parGroupe(enValidation);
  const total = valides.map((v, i) => arrondi(v + aValider[i]));
  const dans = lignes.filter((l) => valide(l) || enValidation(l));
  const repartition =
    onglet === "echeances"
      ? GROUPES.filter((g, i) => g.cle !== "sans" || total[i]).map((g) => ({
          cle: g.cle,
          libelle: g.libelle,
          valeur: montant(total[ORDRE_GROUPES.indexOf(g.cle)]),
        }))
      : [...new Set(dans.map((l) => l.nom))]
          .map((nom) => ({ cle: nom, libelle: nom, n: somme(dans.filter((l) => l.nom === nom).map((l) => l.reste)) }))
          .sort((a, b) => b.n - a.n)
          .map((x) => ({ cle: x.cle, libelle: x.libelle, valeur: montant(arrondi(x.n)) }));
  return (
    <CarteDroite titre={titre}>
      <dl className="lin-kpis lin-kpis--trois">
        <div data-teinte="gris">
          <dt>
            <span className="lin-carre" style={{ background: "var(--lin-graph-gris)" }} />
            Dû
          </dt>
          <dd>{montant(arrondi(somme(total)))}</dd>
        </div>
        <div data-teinte="jaune">
          <dt>
            <span className="lin-carre" style={{ background: "var(--lin-graph-jaune)" }} />À valider
          </dt>
          <dd>{montant(arrondi(somme(aValider)))}</dd>
        </div>
        <div data-teinte="bleu">
          <dt>
            <span className="lin-carre" style={{ background: "var(--lin-graph-bleu)" }} />
            Validé
          </dt>
          <dd>{montant(arrondi(somme(valides)))}</dd>
        </div>
      </dl>
      {!dans.length ? (
        <p className="lin-activite-vide" style={{ marginTop: 12 }}>
          Rien à payer ni à valider.
        </p>
      ) : null}
      {dans.length ? (
        <GraphiqueProgres
          libelle={`Dû cumulé par échéance : ${montant(arrondi(somme(total)))}, dont ${montant(arrondi(somme(valides)))} validés et ${montant(arrondi(somme(aValider)))} à valider`}
          etiquettes={["Échu", "7 j", "30 j", "+30 j", "Sans date"]}
          series={[
            { cle: "du", teinte: "gris", valeurs: cumul(total) },
            { cle: "a-valider", teinte: "jaune", valeurs: cumul(aValider) },
            { cle: "valide", teinte: "bleu", valeurs: cumul(valides), aire: true },
          ]}
        />
      ) : null}
      {fournisseurs ? (
        <div className="lin-segment-carte" role="tablist">
          {(
            [
              ["echeances", "Échéances"],
              ["fournisseurs", "Fournisseurs"],
            ] as const
          ).map(([cle, lib]) => (
            <button key={cle} type="button" role="tab" className="lin-details-onglet" aria-selected={onglet === cle} onClick={() => setOnglet(cle)}>
              {lib}
            </button>
          ))}
        </div>
      ) : null}
      {dans.length && repartition.length ? (
        <ul className="lin-repartition">
          {repartition.map((l) => (
            <li key={l.cle}>
              <span>{l.libelle}</span>
              <span>{l.valeur}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </CarteDroite>
  );
}

export default function TableauFiled() {
  const { source } = useSource();
  const routeur = useRouter();
  const params = useSearchParams();
  const toast = useToast();
  const monte = useMonte();
  /* 21/10 — l'horloge du navigateur (horloge.ts) : null au rendu serveur, la page attend le montage */
  const aujourdhui = useAujourdhui();
  const [local, setLocal] = useState<DossierFiled[]>(DOSSIERS_EXEMPLE);
  const [reel, setReel] = useState<Reel | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [erreurDossier, setErreurDossier] = useState<string | null>(null);
  const [tri, setTri] = useState<Tri>("rang");
  const [details, setDetails] = useState(false);
  const [ongletDetails, setOngletDetails] = useState<"familles" | "echeances" | "fournisseurs">("familles");
  const [filtre, setFiltre] = useState("");
  const [ongletFiche, setOngletFiche] = useState<"apercu" | "dossier">("apercu");

  /* ——— la base réelle : les mêmes portes que l'ancien écran ——— */
  const lire = useCallback(async (): Promise<Reel> => {
    const [liste, fournisseurs, cmd, compte] = await Promise.all([
      chargerListe(),
      chargerFournisseurs().catch(() => [] as Fournisseur[]),
      chargerCommandes().catch(() => ({ commandes: [] as Commande[], lignes: [] as LigneCommande[] })),
      monClient().catch(() => null),
    ]);
    const etats = await lireEtats(liste.apercus);
    return { ...liste, fournisseurs, commandes: cmd.commandes, lignesCommande: cmd.lignes, dossiers: {}, moi: compte?.user_id ?? null, etats };
  }, []);

  useEffect(() => {
    if (source !== "reelle") return;
    let actif = true;
    const t = window.setTimeout(async () => {
      setErreur(null);
      setReel(null);
      try {
        const r = await lire();
        if (actif) setReel(r);
      } catch (e) {
        if (actif) setErreur(e instanceof Error ? e.message : "La base n'a pas répondu.");
      }
    }, 0);
    return () => {
      actif = false;
      window.clearTimeout(t);
    };
  }, [source, lire]);

  /* un document reçu, une facture qui change d'état, un contrôle rejoué :
     la liste se relit, et le dossier ouvert avec elle (son cache est vidé) */
  const relire = useCallback(async () => {
    try {
      const liste = await chargerListe();
      const etats = await lireEtats(liste.apercus);
      setReel((prev) => (prev ? { ...prev, apercus: liste.apercus, motifs: liste.motifs, etats, dossiers: {} } : prev));
    } catch {
      /* la prochaine lecture à la main dira l'erreur */
    }
  }, []);
  useTempsReel(["filed_documents", "filed_factures", "filed_controles", "filed_historique", "filed_fournisseurs"], source === "reelle", relire);

  /* ——— l'exemple : daté à l'heure du visiteur, rien avant le montage (horloge.ts) ——— */
  const etatsEx = useMemo(
    () =>
      etatsExemple(
        local.map((d) => versFacture(d)).filter((f): f is FactureDuFournisseur => !!f),
        minuit(),
      ),
    [local],
  );
  const apercus: Apercu[] = useMemo(() => {
    if (source === "exemple") return monte ? local.map((d) => ({ document: d.document, facture: d.facture, fournisseur: d.fournisseur })) : [];
    return reel?.apercus ?? [];
  }, [source, local, reel, monte]);
  const etats = useMemo<Etats>(() => (source === "exemple" ? etatsEx : (reel?.etats ?? {})), [source, etatsEx, reel]);
  const pret = aujourdhui !== null && (source === "exemple" ? monte : !!reel);

  const lignes: Ligne[] = useMemo(() => {
    if (aujourdhui === null) return [];
    return apercus.map((a) => {
      const f = versFacture(a);
      const payee = !!f && etats[f.id]?.etat === "payee";
      return {
        a,
        id: a.document.id,
        sante: famille(a.document, a.facture),
        f,
        nom: nomDe(a),
        groupe: f ? groupeDe(f, aujourdhui) : null,
        payable: !!f && A_PAYER.has(f.statut) && !payee,
        payee,
        enJeu: !!f && f.nature !== "avoir" && !payee && f.statut !== "refusee" && f.statut !== "ecartee",
        reste: f ? aPayer(f, etats) : 0,
        points: (a.facture?.nb_bloquants ?? 0) + (a.facture?.nb_attention ?? 0),
      };
    });
  }, [apercus, etats, aujourdhui]);

  /* le document ouvert : ?objet=document:<id> (ou facture:, fournisseur:, comme les liens des autres écrans) */
  const cible = useMemo(() => lireCible(params.toString()), [params]);
  const apercuOuvert = useMemo(() => (cible ? trouverCible(apercus, cible) : null), [cible, apercus]);
  const vue = params.get("vue");
  const onglet = (params.get("sante") as Famille | null) ?? "tous";
  const echeanceFiltre = params.get("echeance") as Groupe | null;
  const etapeFiltre = params.get("etape");

  /* le dossier complet du document ouvert : en mémoire sur l'exemple, lu à l'ouverture sur la base réelle */
  const dossier: DossierFiled | null = !apercuOuvert ? null : source === "exemple" ? (local.find((x) => x.document.id === apercuOuvert.document.id) ?? null) : (reel?.dossiers[apercuOuvert.document.id] ?? null);
  useEffect(() => {
    if (source !== "reelle" || !reel || !apercuOuvert || reel.dossiers[apercuOuvert.document.id]) return;
    let actif = true;
    const t = window.setTimeout(async () => {
      setErreurDossier(null);
      try {
        const d = await chargerDossier(apercuOuvert);
        if (actif) setReel((prev) => (prev ? { ...prev, dossiers: { ...prev.dossiers, [d.document.id]: d } } : prev));
      } catch (e) {
        if (actif) setErreurDossier(e instanceof Error ? e.message : "Le dossier n'a pas pu être lu.");
      }
    }, 0);
    return () => {
      actif = false;
      window.clearTimeout(t);
    };
  }, [source, reel, apercuOuvert]);

  /* en mode exemple, une correction remplace le dossier en mémoire ; en base réelle, on relit la liste et le dossier après la porte */
  const remplacerLocal = useCallback((d: DossierFiled) => setLocal((prev) => prev.map((x) => (x.document.id === d.document.id ? d : x))), []);
  const relireReel = useCallback(async (a: Apercu) => {
    const liste = await chargerListe();
    const frais = liste.apercus.find((x) => x.document.id === a.document.id) ?? a;
    const [d, etatsFrais] = await Promise.all([chargerDossier(frais), lireEtats(liste.apercus)]);
    setReel((prev) => (prev ? { ...prev, apercus: liste.apercus, motifs: liste.motifs, etats: etatsFrais, dossiers: { ...prev.dossiers, [d.document.id]: d } } : prev));
  }, []);

  /* Échap referme un document ouvert (pas quand une fenêtre ou un menu l'a déjà pris) */
  useEffect(() => {
    if (!cible) return;
    const touche = (e: KeyboardEvent) => {
      const c = e.target as HTMLElement | null;
      if (e.key !== "Escape" || e.defaultPrevented || (c && /^(INPUT|TEXTAREA|SELECT)$/.test(c.tagName)) || document.querySelector(".dlg-panneau")) return;
      routeur.push(LISTE, { scroll: false });
    };
    window.addEventListener("keydown", touche);
    return () => window.removeEventListener("keydown", touche);
  }, [cible, routeur]);

  /* ——— déposer un document (le même dépôt que l'ancien écran : filed_deposer_piece) ——— */
  const [depot, setDepot] = useState(false);
  const [fichier, setFichier] = useState<File | null>(null);
  const [entiteDepot, setEntiteDepot] = useState<string>("");
  const [envoiDepot, setEnvoiDepot] = useState(false);
  const [erreurDepot, setErreurDepot] = useState<string | null>(null);
  const [entitesReelles, setEntitesReelles] = useState<{ id: string; nom: string }[]>([]);
  const ouvrirDepot = async () => {
    setErreurDepot(null);
    setFichier(null);
    setEntiteDepot(source === "exemple" ? SIEGE : "");
    setDepot(true);
    if (source === "reelle" && !entitesReelles.length) {
      const c = await monClient().catch(() => null);
      if (c) {
        setEntitesReelles(c.entites);
        setEntiteDepot(c.entites[0]?.id ?? "");
      }
    }
  };
  const soumettreDepot = async () => {
    if (!fichier) return;
    setEnvoiDepot(true);
    setErreurDepot(null);
    try {
      let message = `${fichier.name} est déposé : il reçoit son numéro et part en lecture.`;
      let ouvert: string;
      if (source === "reelle") {
        const c = await monClient();
        if (!c) throw new Error("Aucun compte rattaché à cette session.");
        const depose = await deposerDocument({ client_id: c.client_id, entite_id: entiteDepot || null, fichier, expediteur: c.email });
        if (depose.doublon_de) message = `${fichier.name} était déjà reçu : il est marqué doublon${depose.reference ? ` (${depose.reference})` : ""}.`;
        else if (depose.reference) message = `${fichier.name} est déposé sous le numéro ${depose.reference} et part en lecture.`;
        setReel(await lire());
        ouvert = depose.document_id;
      } else {
        await new Promise((r) => setTimeout(r, 400));
        const id = crypto.randomUUID();
        const quand = new Date().toISOString();
        const numero = Math.max(0, ...local.map((d) => Number(d.document.reference.slice(-6)) || 0)) + 1;
        setLocal((prev) => [
          {
            document: {
              id,
              client_id: EXEMPLE_CLIENT_ID,
              entite_id: entiteDepot || null,
              reference: `R${new Date().getFullYear()}-${String(numero).padStart(6, "0")}`,
              piece_id: `${id}-p`,
              source: "depot",
              expediteur: null,
              nom_fichier: fichier.name,
              recu_le: quand,
              etat: "en_lecture",
              nature: null,
              nature_source: null,
              doublon_de: null,
              motif: null,
              lu_le: null,
              traite_le: null,
            },
            facture: null,
            lignes: [],
            tva: [],
            controles: [],
            levees: [],
            fournisseur: null,
            ibans: [],
            appariements: [],
            rapprochement: null,
            piece: {
              id: `${id}-p`,
              nom_fichier: fichier.name,
              mime: fichier.type || "application/octet-stream",
              chemin: `${EXEMPLE_CLIENT_ID}/filed_document/${id}/${fichier.name}`,
              nb_pages: null,
              statut: "recue",
              type_piece: null,
              methode: null,
            },
            pages: [],
            valeurs: [],
            historique: [
              { id: `depot-${quand}`, etape: "reception", message: "Déposé depuis l'espace par vous.", detail: {}, acteur_type: "utilisateur", acteur_libelle: "Vous", survenu_le: quand },
              { id: `lecture-${quand}`, etape: "lecture", message: "Lecture en cours…", detail: {}, acteur_type: "systeme", acteur_libelle: null, survenu_le: quand },
            ],
          },
          ...prev,
        ]);
        ouvert = id;
      }
      setDepot(false);
      toast(`C'est fait. ${message}`, "vert");
      routeur.push(ficheDe(ouvert), { scroll: false });
    } catch (e) {
      setErreurDepot(e instanceof Error ? e.message : "Le dépôt a échoué.");
    } finally {
      setEnvoiDepot(false);
    }
  };
  const entitesDepot = source === "exemple" ? ENTITES : entitesReelles;
  const fenetreDepot = (
    <Dialog open={depot} onOpenChange={(o) => !o && setDepot(false)}>
      <DialogContent>
        <DialogHeader>
          <DialogIcone>
            <Upload width={18} height={18} aria-hidden="true" />
          </DialogIcone>
          <DialogTitle>Déposer un document</DialogTitle>
          <DialogDescription>Le fichier reçoit un numéro, est lu par le lecteur, puis contrôlé comme tout document reçu.</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <div className="esp-form">
            <div>
              <span className="rv-libelle">
                Fichier <span className="esp-obligatoire">(obligatoire)</span>
              </span>
              <div className="esp-fichier">
                <input id="filed-depot-fichier" type="file" className="esp-fichier-natif" accept=".pdf,.png,.jpg,.jpeg,.xml,.csv,.xlsx" onChange={(e) => setFichier(e.target.files?.[0] ?? null)} />
                <label htmlFor="filed-depot-fichier" className="r-btn r-btn--fil r-btn--petit" style={{ cursor: "pointer" }}>
                  {fichier ? "Changer de fichier" : "Choisir un fichier"}
                </label>
                <span className="esp-kpi-sous">{fichier ? `${fichier.name} · ${Math.round(fichier.size / 1024)} Ko` : "PDF, image, Factur-X (XML), CSV ou tableur."}</span>
              </div>
            </div>
            {entitesDepot.length > 1 ? (
              <label className="rv-libelle">
                Entité
                <select className="rv-champ" value={entiteDepot} onChange={(e) => setEntiteDepot(e.target.value)}>
                  {entitesDepot.map((en) => (
                    <option key={en.id} value={en.id}>
                      {en.nom}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            {erreurDepot ? (
              <Avis teinte="rouge" role="alert">
                {erreurDepot}
              </Avis>
            ) : null}
          </div>
        </DialogBody>
        <DialogFooter>
          <button type="button" className="r-btn r-btn--noir" disabled={!fichier || envoiDepot} onClick={soumettreDepot}>
            {envoiDepot ? <Loader variant="spin" /> : null} Déposer
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
  const boutonDepot = (
    <button type="button" className="v2-btn v2-btn--petit" onClick={ouvrirDepot}>
      <Upload width={14} height={14} aria-hidden="true" />
      <span>Déposer un document</span>
    </button>
  );

  const vide = (texte: string, retour?: boolean) => (
    <div className="lin">
      <h1 className="v2-sr">Documents reçus</h1>
      <header className="lin-tete">
        <span className="lin-tete-titre">Documents reçus</span>
      </header>
      <div className="lin-vide filed-vide">
        <p style={{ margin: 0 }}>{texte}</p>
        {retour ? (
          <Link href={LISTE} className="filed-lien-retour">
            Voir tous les documents
          </Link>
        ) : null}
      </div>
    </div>
  );
  if (source === "reelle" && erreur && !reel) return vide(`La base réelle n'a pas répondu : ${erreur}`);
  if (!pret) return vide("Lecture des documents…");

  const motifs = source === "exemple" ? MOTIFS_EXEMPLE : (reel?.motifs ?? []);
  const fournisseursListe = source === "exemple" ? FOURNISSEURS_EXEMPLE : (reel?.fournisseurs ?? []);
  const commandes = source === "exemple" ? COMMANDES_EXEMPLE : (reel?.commandes ?? []);
  const lignesCommande = source === "exemple" ? LIGNES_COMMANDE_EXEMPLE : (reel?.lignesCommande ?? []);
  const rang: Record<Famille, number> = { bloquee: 0, litige: 1, attente: 2, reste: 3 };
  const valeurTri = (x: Ligne, y: Ligne) =>
    tri === "echeance"
      ? (x.f?.echeance_lue ?? "9999").localeCompare(y.f?.echeance_lue ?? "9999")
      : tri === "montant"
        ? (y.f ? du(y.f) : 0) - (x.f ? du(x.f) : 0)
        : tri === "recu"
          ? y.a.document.recu_le.localeCompare(x.a.document.recu_le)
          : rang[x.sante] - rang[y.sante] || y.a.document.recu_le.localeCompare(x.a.document.recu_le);
  const ordonnes = lignes.slice().sort((x, y) => valeurTri(x, y) || x.nom.localeCompare(y.nom, "fr"));
  const aPayerL = lignes.filter((l) => l.payable).sort((x, y) => (x.f?.echeance_lue ?? "9999").localeCompare(y.f?.echeance_lue ?? "9999"));
  const totalGroupe = (g: Groupe) => arrondi(somme(aPayerL.filter((l) => l.groupe === g).map((l) => l.reste)));
  const optionsGroupes = (coche?: Groupe | null): Option[] =>
    GROUPES.map((g) => ({
      cle: g.cle,
      libelle: g.libelle,
      meta: montant(totalGroupe(g.cle)),
      icone: <IconePriorite niveau={NIVEAUX[g.cle]} titre={g.libelle} />,
      coche: coche === g.cle,
      href: `${LISTE}&echeance=${g.cle}`,
    }));
  const optionsFamilles = (coche?: Famille): Option[] =>
    ORDRE_SANTES.map((x) => {
      const n = lignes.filter((l) => l.sante === x).length;
      return {
        cle: x,
        libelle: familleDe(x).libelle,
        meta: pluriel(n, "document"),
        icone: <IconeStatut sante={x} />,
        coche: coche === x,
        href: `${LISTE}&sante=${x}`,
      };
    });

  /* ——— un document ouvert : la page d'un projet ——— */
  if (cible) {
    const l = apercuOuvert ? lignes.find((x) => x.id === apercuOuvert.document.id) : undefined;
    if (!l) return vide(`Document introuvable : le document que désigne ce lien n'est pas dans cette liste${source === "exemple" ? " (vous regardez les données d'exemple)" : ""}.`, true);
    const s = l.sante;
    const doc = l.a.document;
    const fac = l.a.facture;
    const e = l.f ? etats[l.f.id] : undefined;
    const statut = fac ? statutFacture(fac.statut) : etatDocument(doc.etat);
    const historique = (dossier?.historique ?? [])
      .slice()
      .reverse()
      .sort((x, y) => y.survenu_le.localeCompare(x.survenu_le));
    const dernier = historique[0];
    const controles = dossier ? grouperControles(dossier.controles) : null;
    const memeFournisseur = lignes.filter((x) => (l.a.fournisseur ? x.a.fournisseur?.id === l.a.fournisseur.id || (!!x.f && x.f.fournisseur_id === l.a.fournisseur.id) : x.id === l.id));
    const nature = doc.nature ? NATURES[doc.nature] : "Document";
    const resume = fac
      ? `${phrase(`${nature}${fac.numero ? ` n° ${fac.numero}` : ""}${fac.date_emission ? ` du ${dateCourte(fac.date_emission)}` : ""} : ${montant(fac.montant_ttc, fac.devise)} TTC${fac.echeance_lue ? `, échéance le ${dateCourte(fac.echeance_lue)}` : ""}`)}${l.payee ? " Elle est payée." : l.payable ? ` Il reste ${montant(arrondi(l.reste), fac.devise)} à payer.` : ""}`
      : `${nature} reçu le ${dateCourte(doc.recu_le)} : ${etatDocument(doc.etat).libelle.toLowerCase()}.${doc.motif ? ` ${doc.motif}` : ""}`;
    const pointsTexte = fac
      ? fac.nb_bloquants || fac.nb_attention
        ? [fac.nb_bloquants ? pluriel(fac.nb_bloquants, "bloquant") : null, fac.nb_attention ? `${fac.nb_attention} à vérifier` : null].filter(Boolean).join(" · ")
        : "aucun point"
      : "—";
    const versDossier = () => setOngletFiche("dossier");
    const optionsSante: Option[] = [
      { cle: "dossier", libelle: "Corriger dans le dossier", icone: <IconeDocument />, action: versDossier },
      ...(fac?.statut === "a_valider" ? [{ cle: "valider", libelle: "Décider dans À valider", icone: <CheckCheck width={16} height={16} />, href: `${RACINE}/validations` }] : []),
      { cle: "controles", libelle: "Contrôles et fraude", icone: <ExternalLink width={16} height={16} />, href: `${RACINE}/filed/controles` },
      { cle: "famille", libelle: `Documents : ${familleDe(s).libelle.toLowerCase()}`, icone: <IconeStatut sante={s} />, href: `${LISTE}&sante=${s}` },
    ];
    const optionsStatut: Option[] = [
      ...(fac?.statut === "a_valider" ? [{ cle: "valider", libelle: "Décider dans À valider", icone: <CheckCheck width={16} height={16} />, href: `${RACINE}/validations` }] : []),
      { cle: "circuit", libelle: "Circuit de validation", icone: <ExternalLink width={16} height={16} />, href: `${RACINE}/filed/circuit` },
      ...(l.payable || l.payee ? [{ cle: "payer", libelle: "À payer", icone: <IconeJauge />, href: `${RACINE}/filed/a-payer` }] : []),
      ...(fac?.statut === "refusee" ? [{ cle: "refusees", libelle: "Refusées", icone: <IconeStatut sante="bloquee" />, href: `${RACINE}/filed/refusees` }] : []),
      { cle: "compta", libelle: "Comptabilité", icone: <ExternalLink width={16} height={16} />, href: `${RACINE}/filed/comptabilite` },
    ];
    const optionsEcheance: Option[] = [
      { cle: "payer", libelle: "À payer", icone: <IconeJauge />, href: `${RACINE}/filed/a-payer` },
      ...(l.groupe ? [{ cle: "groupe", libelle: `Factures : ${groupeLibelle(l.groupe).toLowerCase()}`, icone: <IconeCalendrier />, href: `${LISTE}&echeance=${l.groupe}` }] : []),
    ];
    const optionsFournisseur: Option[] = [
      ...memeFournisseur.map((x): Option => ({
        cle: x.id,
        libelle: x.a.document.reference,
        meta: x.f ? montant(x.f.montant_ttc, x.f.devise) : etatDocument(x.a.document.etat).libelle,
        icone: <IconeDocumentRecu l={x} />,
        coche: x.id === l.id,
        href: ficheDe(x.id),
      })),
      { cle: "fournisseurs", libelle: "Fournisseurs", icone: <ExternalLink width={16} height={16} />, href: `${RACINE}/filed/fournisseurs` },
    ];
    const jalons: { cle: string; libelle: string; atteint: boolean; meta: string }[] = [
      { cle: "recu", libelle: "Reçu", atteint: true, meta: dateCourte(doc.recu_le) },
      { cle: "lu", libelle: "Lu", atteint: !!doc.lu_le, meta: doc.lu_le ? dateCourte(doc.lu_le) : "pas encore" },
      { cle: "controle", libelle: "Contrôlé", atteint: !!fac?.controle_le, meta: fac?.controle_le ? dateCourte(fac.controle_le) : "pas encore" },
      {
        cle: "valide",
        libelle: "Validé",
        atteint: fac?.statut === "validee" || fac?.statut === "comptabilisee",
        meta: fac?.statut === "validee" || fac?.statut === "comptabilisee" ? "fait" : fac?.statut === "refusee" ? "refusé" : fac?.statut === "ecartee" ? "écarté" : "pas encore",
      },
      { cle: "comptabilise", libelle: "Comptabilisé", atteint: fac?.statut === "comptabilisee", meta: fac?.statut === "comptabilisee" ? "fait" : "pas encore" },
      { cle: "paye", libelle: "Payé", atteint: l.payee, meta: e?.etat === "payee" ? dateCourte(e.dernier_le) : e?.etat === "partielle" ? `en partie · ${montant(e.regle, fac?.devise)}` : "pas encore" },
    ];
    const pageDuJalon: Record<string, { libelle: string; href: string }> = {
      recu: { libelle: "Boîte de réception", href: `${RACINE}/filed/boite` },
      lu: { libelle: "Boîte de réception", href: `${RACINE}/filed/boite` },
      controle: { libelle: "Contrôles et fraude", href: `${RACINE}/filed/controles` },
      valide: { libelle: "Circuit de validation", href: `${RACINE}/filed/circuit` },
      comptabilise: { libelle: "Comptabilité", href: `${RACINE}/filed/comptabilite` },
      paye: { libelle: "À payer", href: `${RACINE}/filed/a-payer` },
    };
    const acteur = (h: DossierFiled["historique"][number]) => h.acteur_libelle ?? (h.acteur_type === "systeme" ? "FILED" : "Une personne");
    return (
      <div className="lin">
        <h1 className="v2-sr">Documents reçus</h1>
        <header className="lin-tete">
          <nav className="lin-fil" aria-label="Fil d'Ariane">
            <Link href={LISTE} className="lin-fil-equipe">
              Documents
            </Link>
            <span className="lin-fil-sep" aria-hidden="true">
              ›
            </span>
            <span className="lin-fil-ici lin-fil-projet" aria-current="page">
              <IconeDocumentRecu l={l} />
              {doc.reference}
            </span>
          </nav>
          <div className="lin-tete-droite">
            <button type="button" className="v2-btn v2-btn--petit v2-btn--icone" aria-label="Copier la référence" title="Copier la référence" onClick={() => copier(doc.reference)}>
              <Copy width={14} height={14} aria-hidden="true" />
            </button>
            {boutonDepot}
          </div>
        </header>
        <div className="lin-outils">
          <nav className="lin-onglets" aria-label="Vues du document">
            <button type="button" className="v2-btn v2-btn--petit" data-actif={ongletFiche === "apercu" ? "" : undefined} aria-pressed={ongletFiche === "apercu"} onClick={() => setOngletFiche("apercu")}>
              Aperçu
            </button>
            <button type="button" className="v2-btn v2-btn--petit" data-actif={ongletFiche === "dossier" ? "" : undefined} aria-pressed={ongletFiche === "dossier"} onClick={() => setOngletFiche("dossier")}>
              Dossier
            </button>
          </nav>
        </div>

        {ongletFiche === "dossier" ? (
          <div className="filed-dossier">
            {/* l'écran du dossier de toujours, dans le monde .resa .esp qu'il attend : contrôles, pièce, corrections par les portes FILED */}
            <HabilleSb>
              {dossier ? (
                <DossierVue
                  key={dossier.document.id}
                  dossier={dossier}
                  source={source}
                  motifs={motifs}
                  fournisseurs={fournisseursListe}
                  commandes={commandes}
                  lignesCommande={lignesCommande}
                  onLocal={remplacerLocal}
                  relire={() => relireReel(l.a)}
                  moi={source === "exemple" ? EXEMPLE_MOI : (reel?.moi ?? null)}
                />
              ) : (
                <p className="lin-vide">{erreurDossier ? `Le dossier n'a pas pu être lu : ${erreurDossier}` : "Lecture du dossier…"}</p>
              )}
            </HabilleSb>
          </div>
        ) : (
          <div className="lin-projet">
            <article className="lin-projet-texte">
              <IconeDocumentRecu l={l} grand />
              <h2 className="lin-projet-h1">{l.nom}</h2>
              <p className="lin-projet-resume">{resume}</p>
              <div className="lin-projet-ligne">
                <span className="lin-projet-etiquette">Propriétés</span>
                <MenuOptions
                  raccourci="s"
                  titre="Agir sur ce document…"
                  teinte={SANTES[s].teinte}
                  declencheur={
                    <>
                      <IconeStatut sante={s} />
                      {SANTES[s].libelle}
                    </>
                  }
                  options={optionsSante}
                  largeur={300}
                />
                {fac ? (
                  <MenuOptions
                    raccourci="r"
                    titre="À payer par échéance…"
                    declencheur={
                      <>
                        <IconePriorite niveau={urgenceDe(l)} titre={urgenceTitre(l)} />
                        {urgenceTitre(l)}
                      </>
                    }
                    options={optionsGroupes(l.groupe)}
                  />
                ) : null}
                {fac ? (
                  <MenuOptions
                    raccourci="e"
                    titre="Aller à…"
                    declencheur={
                      <>
                        <IconeCalendrier passe={l.enJeu && l.groupe === "retard"} />
                        {fac.echeance_lue ? dateCourte(fac.echeance_lue) : "Sans échéance"}
                      </>
                    }
                    options={optionsEcheance}
                  />
                ) : null}
                <MenuOptions
                  titre="Documents du fournisseur…"
                  declencheur={
                    <>
                      <IconeGroupe />
                      {l.a.fournisseur?.nom ?? "Fournisseur inconnu"}
                    </>
                  }
                  options={optionsFournisseur}
                  largeur={320}
                />
              </div>
              <div className="lin-projet-ligne">
                <span className="lin-projet-etiquette">Pièce</span>
                <MenuOptions
                  raccourci="d"
                  titre="Pièce…"
                  declencheur={
                    <>
                      <IconeDocument />
                      {doc.nom_fichier}
                    </>
                  }
                  options={[
                    { cle: "voir", libelle: "Voir la pièce et le dossier", icone: <IconeDocument />, action: versDossier },
                    { cle: "copier", libelle: "Copier le nom du fichier", icone: <Copy width={16} height={16} />, action: () => copier(doc.nom_fichier) },
                  ]}
                />
                {doc.expediteur ? (
                  <MenuOptions
                    titre="Expéditeur…"
                    declencheur={
                      <>
                        <IconeEnveloppe />
                        {doc.expediteur}
                      </>
                    }
                    options={[
                      { cle: "ecrire", libelle: "Écrire un e-mail", icone: <IconeEnveloppe />, action: () => window.open(`mailto:${doc.expediteur}`) },
                      { cle: "copier", libelle: "Copier l'adresse", icone: <Copy width={16} height={16} />, action: () => copier(doc.expediteur ?? "") },
                    ]}
                  />
                ) : null}
              </div>

              <details className="lin-maj" open aria-label="Dernier événement">
                <summary className="lin-maj-tete">
                  <span className="lin-maj-titre">
                    Dernier événement
                    <svg className="lin-maj-fleche" viewBox="0 0 16 16" aria-hidden="true">
                      <path d="M5.2 6.4h5.6L8 9.6z" fill="currentColor" />
                    </svg>
                  </span>
                  <button type="button" className="lin-maj-lien" onClick={versDossier}>
                    <ExternalLink width={14} height={14} aria-hidden="true" /> Dossier
                  </button>
                </summary>
                {dernier ? (
                  <>
                    <p className="lin-maj-auteur">
                      <IconeSante sante={s} />
                      <span data-teinte={SANTES[s].teinte}>{SANTES[s].libelle}</span>
                      <span className="lin-avatar-auteur" aria-hidden="true">
                        <FileText width={11} height={11} />
                      </span>
                      <span className="lin-maj-gris">{acteur(dernier)}</span>
                      <span className="lin-maj-gris">{dateCourte(dernier.survenu_le)}</span>
                    </p>
                    <p className="lin-maj-texte">{dernier.message}</p>
                  </>
                ) : (
                  <p className="lin-maj-texte lin-maj-gris">{dossier ? "Aucun événement noté pour ce document." : erreurDossier ? `Le dossier n'a pas pu être lu : ${erreurDossier}` : "Lecture du dossier…"}</p>
                )}
                <dl className="lin-maj-citation">
                  <div>
                    <dt>Statut</dt>
                    <dd>{statut.libelle}</dd>
                  </div>
                  <div>
                    <dt>Montant</dt>
                    <dd>{fac ? montant(fac.montant_ttc, fac.devise) : "—"}</dd>
                  </div>
                  <div>
                    <dt>Contrôles</dt>
                    <dd>{pointsTexte}</dd>
                  </div>
                </dl>
                <footer className="lin-maj-pied">
                  <button type="button" className="lin-maj-pied-btn" aria-label="Ouvrir le dossier" title="Ouvrir le dossier" onClick={versDossier}>
                    <MessageSquare width={16} height={16} aria-hidden="true" />
                  </button>
                  <Link href={`${RACINE}/validations`} className="lin-maj-pied-rond" aria-label="Décider" title="Décider">
                    <CheckCheck width={16} height={16} aria-hidden="true" />
                  </Link>
                </footer>
              </details>

              {fac ? (
                <>
                  <h3 className="lin-projet-h2">Montants</h3>
                  <ul className="lin-projet-liste">
                    {(
                      [
                        ["Total HT", fac.montant_ht],
                        ["TVA", fac.montant_tva],
                        ["Total TTC", fac.montant_ttc],
                        ["Net à payer", fac.net_a_payer],
                        ...(e
                          ? [
                              ["Réglé", e.regle],
                              ["Reste à payer", e.reste],
                            ]
                          : []),
                      ] as [string, number | null][]
                    ).map(([lib, v]) => (
                      <li key={lib}>
                        <span>{lib}</span>
                        <span className="lin-meta">{montant(v, fac.devise)}</span>
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}

              <h3 className="lin-projet-h2">Contrôles</h3>
              {!fac ? (
                <p className="lin-maj-texte lin-maj-gris">Pas encore de facture lue sur ce document : les contrôles passent après la lecture.</p>
              ) : !controles ? (
                <p className="lin-maj-texte lin-maj-gris">{erreurDossier ? `Le dossier n'a pas pu être lu : ${erreurDossier}` : "Lecture du dossier…"}</p>
              ) : (
                <ul className="lin-projet-liste">
                  {controles.echoues.map((c) => (
                    <li key={c.id}>
                      <Losange atteint={false} />
                      <span>{c.message}</span>
                      <span className="lin-meta">{c.gravite === "bloquant" ? "bloquant" : c.gravite === "attention" ? "à vérifier" : "information"}</span>
                    </li>
                  ))}
                  {controles.leves.map((c) => (
                    <li key={c.id}>
                      <Losange atteint />
                      <span>{c.message}</span>
                      <span className="lin-meta">levé</span>
                    </li>
                  ))}
                  <li>
                    <Losange atteint />
                    <span>{controles.passes.length ? `${pluriel(controles.passes.length, "contrôle")} sans anomalie` : "Aucun contrôle passé sans anomalie"}</span>
                    <span className="lin-meta">{[...new Set(controles.passes.map((c) => FAMILLES_CONTROLE[c.famille] ?? c.famille))].slice(0, 3).join(", ")}</span>
                  </li>
                </ul>
              )}
            </article>

            <aside className="lin-cartes-droite" aria-label="Propriétés du document">
              <CarteDroite titre="Propriétés">
                <dl className="lin-props">
                  <div>
                    <dt>Santé</dt>
                    <dd data-teinte={SANTES[s].teinte}>
                      <MenuOptions
                        plat
                        titre="Agir sur ce document…"
                        declencheur={
                          <>
                            <IconeStatut sante={s} />
                            {SANTES[s].libelle}
                          </>
                        }
                        options={optionsSante}
                        largeur={300}
                      />
                    </dd>
                  </div>
                  <div>
                    <dt>Statut</dt>
                    <dd>
                      <MenuOptions
                        plat
                        titre="Aller à…"
                        declencheur={
                          <>
                            <IconeDocument />
                            {statut.libelle}
                          </>
                        }
                        options={optionsStatut}
                      />
                    </dd>
                  </div>
                  <div>
                    <dt>Échéance</dt>
                    <dd className={fac?.echeance_lue ? undefined : "lin-props-vide"}>
                      <MenuOptions
                        plat
                        titre="Aller à…"
                        declencheur={
                          <>
                            <IconeCalendrier passe={l.enJeu && l.groupe === "retard"} />
                            {fac?.echeance_lue ? dateCourte(fac.echeance_lue) : "Sans échéance"}
                          </>
                        }
                        options={optionsEcheance}
                      />
                    </dd>
                  </div>
                  <div>
                    <dt>Urgence</dt>
                    <dd>
                      <MenuOptions
                        plat
                        titre="À payer par échéance…"
                        declencheur={
                          <>
                            <IconePriorite niveau={urgenceDe(l)} titre={urgenceTitre(l)} />
                            {urgenceTitre(l)}
                          </>
                        }
                        options={optionsGroupes(l.groupe)}
                      />
                    </dd>
                  </div>
                  <div>
                    <dt>Référence</dt>
                    <dd>
                      <MenuOptions
                        plat
                        titre="Référence…"
                        declencheur={
                          <>
                            <IconeDiese />
                            {doc.reference}
                          </>
                        }
                        options={[{ cle: "copier", libelle: "Copier la référence", icone: <Copy width={16} height={16} />, action: () => copier(doc.reference) }]}
                      />
                    </dd>
                  </div>
                  <div>
                    <dt>N° de facture</dt>
                    <dd className={fac?.numero ? undefined : "lin-props-vide"}>
                      <MenuOptions
                        plat
                        titre="Numéro…"
                        declencheur={
                          <>
                            <IconeDiese />
                            {fac?.numero ?? "Non lu"}
                          </>
                        }
                        options={
                          fac?.numero
                            ? [{ cle: "copier", libelle: "Copier le numéro", icone: <Copy width={16} height={16} />, action: () => copier(fac.numero ?? "") }]
                            : [{ cle: "dossier", libelle: "Corriger dans le dossier", icone: <IconeDocument />, action: versDossier }]
                        }
                      />
                    </dd>
                  </div>
                  <div>
                    <dt>Fournisseur</dt>
                    <dd className={l.a.fournisseur ? undefined : "lin-props-vide"}>
                      <MenuOptions
                        plat
                        titre="Documents du fournisseur…"
                        declencheur={
                          <>
                            <IconeGroupe />
                            {l.a.fournisseur?.nom ?? "Inconnu"}
                          </>
                        }
                        options={optionsFournisseur}
                        largeur={320}
                      />
                    </dd>
                  </div>
                  <div>
                    <dt>Montant</dt>
                    <dd className={fac ? undefined : "lin-props-vide"}>
                      <MenuOptions
                        plat
                        titre="Aller à…"
                        declencheur={
                          <>
                            <IconeJauge />
                            {fac ? montant(fac.montant_ttc, fac.devise) : "Non lu"}
                          </>
                        }
                        options={[
                          { cle: "payer", libelle: "À payer", icone: <IconeJauge />, href: `${RACINE}/filed/a-payer` },
                          { cle: "dossier", libelle: "Corriger dans le dossier", icone: <IconeDocument />, action: versDossier },
                        ]}
                      />
                    </dd>
                  </div>
                  <div>
                    <dt>Reçu</dt>
                    <dd>
                      <MenuOptions
                        plat
                        titre="Aller à…"
                        declencheur={
                          <>
                            <IconeImport />
                            {dateCourte(doc.recu_le)} · {SOURCES[doc.source] ?? doc.source}
                          </>
                        }
                        options={[{ cle: "boite", libelle: "Boîte de réception", icone: <Inbox width={16} height={16} />, href: `${RACINE}/filed/boite` }]}
                      />
                    </dd>
                  </div>
                </dl>
              </CarteDroite>

              <CarteDroite titre="Parcours">
                <ul className="lin-jalons">
                  {jalons.map((j) => (
                    <li key={j.cle}>
                      <Losange atteint={j.atteint} />
                      <span className="lin-jalon-nom">{j.libelle}</span>
                      <span className="lin-meta">{j.meta}</span>
                      <MenuActions
                        titre={`${j.libelle}…`}
                        options={[
                          { cle: "dossier", libelle: "Voir dans le dossier", icone: <IconeDocument />, action: versDossier },
                          { cle: "page", libelle: pageDuJalon[j.cle].libelle, icone: <ExternalLink width={16} height={16} />, href: pageDuJalon[j.cle].href },
                        ]}
                      />
                    </li>
                  ))}
                </ul>
              </CarteDroite>

              <CarteAPayer lignes={memeFournisseur} titre={l.a.fournisseur ? "Dû à ce fournisseur" : "Dû"} />

              <CarteDroite
                titre="Activité"
                action={
                  <button type="button" className="lin-carte-lien" onClick={versDossier}>
                    Tout voir
                  </button>
                }
              >
                {historique.length ? (
                  <ul className="lin-activite">
                    {historique.slice(0, 3).map((h) => (
                      <li key={h.id}>
                        <Losange atteint={h.acteur_type !== "systeme"} />
                        <span>
                          <b>{acteur(h)}</b> · {h.message} · {dateCourte(h.survenu_le)}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="lin-activite-vide">{dossier ? "Aucun événement pour l'instant." : "Lecture du dossier…"}</p>
                )}
              </CarteDroite>
            </aside>
          </div>
        )}
        {fenetreDepot}
      </div>
    );
  }

  /* ——— le tableau de bord : la page d'un projet, FILED étant le projet ———
     Les briques relevées sur la page d'un projet de Linear (titre,
     propriétés, « Latest update », jalons, cartes de droite, carte Progress
     avec ses chiffres et ses répartitions), comme CASHD. */
  if (vue !== "documents") {
    const parSante = (x: Famille) => lignes.filter((l) => l.sante === x);
    const sante: Famille = ORDRE_SANTES.find((x) => x !== "reste" && parSante(x).length) ?? "reste";
    const aValider = lignes.filter((l) => l.f?.statut === "a_valider");
    const enRetard = aPayerL.filter((l) => l.groupe === "retard");
    const plusAncienne =
      enRetard
        .map((l) => l.f?.echeance_lue)
        .filter((x): x is string => !!x)
        .sort()[0] ?? null;
    const dernierRecu =
      apercus
        .map((a) => a.document.recu_le)
        .sort()
        .reverse()[0] ?? null;
    const aAgir = lignes.filter((l) => l.sante !== "reste").length;
    const aFaire = [...parSante("bloquee").map((l) => ({ l, quoi: "Bloquée" })), ...aValider.map((l) => ({ l, quoi: "À valider" })), ...enRetard.map((l) => ({ l, quoi: "À payer, en retard" }))];
    const maxGroupe = Math.max(1, ...ORDRE_GROUPES.map(totalGroupe));
    const plusGrosses = aPayerL.slice().sort((x, y) => y.reste - x.reste);
    const fournisseursVus = new Map<string, Fournisseur>();
    for (const a of apercus) if (a.fournisseur) fournisseursVus.set(a.fournisseur.id, a.fournisseur);
    const aConfirmer = [...fournisseursVus.values()].filter((f) => f.statut === "a_confirmer").length;
    const avecPoints = lignes.filter((l) => l.points > 0 && l.sante !== "reste");
    const refusees = lignes.filter((l) => l.f?.statut === "refusee");
    const recents = lignes
      .slice()
      .sort((x, y) => y.a.document.recu_le.localeCompare(x.a.document.recu_le))
      .slice(0, 3);
    const resume = aPayerL.length
      ? `${totaux(
          aPayerL.map((l) => l.f!),
          etats,
        )} à payer sur ${pluriel(aPayerL.length, "facture")}${enRetard.length ? `, dont ${montant(totalGroupe("retard"))} en retard` : ""}.`
      : "Aucune facture validée n'attend de paiement.";
    return (
      <div className="lin">
        <h1 className="v2-sr">Documents reçus</h1>
        <header className="lin-tete">
          <span className="lin-tete-titre">Tableau de bord</span>
          <div className="lin-tete-droite">{boutonDepot}</div>
        </header>
        <div className="lin-outils">
          <nav className="lin-onglets" aria-label="Vues de FILED">
            <span className="v2-btn v2-btn--petit" data-actif="" aria-current="page">
              Aperçu
            </span>
            <Link href={LISTE} className="v2-btn v2-btn--petit">
              Documents
            </Link>
            <Link href={`${RACINE}/filed/a-payer`} className="v2-btn v2-btn--petit">
              À payer
            </Link>
            <Link href={`${RACINE}/validations`} className="v2-btn v2-btn--petit">
              À valider
            </Link>
          </nav>
        </div>

        <div className="lin-projet">
          <article className="lin-projet-texte">
            <span
              className="lin-tuile"
              style={{
                background: "color-mix(in srgb, #26b5ce 18%, transparent)",
                color: "#26b5ce",
              }}
            >
              <FileText width={24} height={24} strokeWidth={1.6} aria-hidden="true" />
            </span>
            <h2 className="lin-projet-h1">Documents reçus</h2>
            <p className="lin-projet-resume">
              {resume} {aAgir ? `${pluriel(aAgir, "document")} ${aAgir > 1 ? "demandent" : "demande"} une action.` : "Aucun document n'attend d'action."}
            </p>
            <div className="lin-projet-ligne">
              <span className="lin-projet-etiquette">Propriétés</span>
              <MenuOptions
                raccourci="s"
                titre="Voir les documents…"
                teinte={SANTES[sante].teinte}
                declencheur={
                  <>
                    <IconeStatut sante={sante} />
                    {sante === "reste" ? "Tout est traité" : `${pluriel(parSante(sante).length, "document")} : ${familleDe(sante).libelle.toLowerCase()}`}
                  </>
                }
                options={optionsFamilles(sante)}
                largeur={280}
              />
              <MenuOptions
                raccourci="v"
                titre="Factures à valider…"
                declencheur={
                  <>
                    <Losange atteint={aValider.length > 0} />
                    {aValider.length} à valider
                  </>
                }
                options={[
                  ...aValider.map((l): Option => ({
                    cle: l.id,
                    libelle: l.nom,
                    meta: `${l.a.document.reference} · ${montant(l.f?.montant_ttc, l.f?.devise)}`,
                    icone: <IconeDocumentRecu l={l} />,
                    href: ficheDe(l.id),
                  })),
                  { cle: "tout", libelle: "Tout voir dans Décisions", icone: <ExternalLink width={16} height={16} />, href: `${RACINE}/validations` },
                ]}
                largeur={360}
              />
              <MenuOptions
                raccourci="e"
                titre="Échéances passées…"
                declencheur={
                  <>
                    <IconeCalendrier passe={!!plusAncienne} />
                    {plusAncienne ? `En retard depuis le ${dateCourte(plusAncienne)}` : "Aucune échéance passée"}
                  </>
                }
                options={[
                  ...enRetard.map((l): Option => ({
                    cle: l.id,
                    libelle: l.nom,
                    meta: `${dateCourte(l.f?.echeance_lue)} · ${montant(arrondi(l.reste), l.f?.devise)}`,
                    icone: <IconeDocumentRecu l={l} />,
                    href: ficheDe(l.id),
                  })),
                  { cle: "payer", libelle: "À payer", icone: <ExternalLink width={16} height={16} />, href: `${RACINE}/filed/a-payer` },
                ]}
                largeur={340}
              />
            </div>
            <div className="lin-projet-ligne">
              <span className="lin-projet-etiquette">Réception</span>
              <MenuOptions
                raccourci="d"
                titre="Documents reçus…"
                declencheur={
                  <>
                    <IconeImport />
                    {dernierRecu ? `Dernier reçu le ${dateCourte(dernierRecu)}` : "Aucun document reçu"}
                  </>
                }
                options={[
                  { cle: "deposer", libelle: "Déposer un document", icone: <Upload width={16} height={16} />, action: () => void ouvrirDepot() },
                  { cle: "boite", libelle: "Boîte de réception", icone: <Inbox width={16} height={16} />, href: `${RACINE}/filed/boite` },
                  { cle: "compta", libelle: "Comptabilité", icone: <ExternalLink width={16} height={16} />, href: `${RACINE}/filed/comptabilite` },
                ]}
              />
            </div>

            <details className="lin-maj" open aria-label="À faire aujourd'hui">
              <summary className="lin-maj-tete">
                <span className="lin-maj-titre">
                  À faire aujourd&apos;hui
                  <svg className="lin-maj-fleche" viewBox="0 0 16 16" aria-hidden="true">
                    <path d="M5.2 6.4h5.6L8 9.6z" fill="currentColor" />
                  </svg>
                </span>
                <Link href={`${RACINE}/validations`} className="lin-maj-lien">
                  <ExternalLink width={14} height={14} aria-hidden="true" /> Valider
                </Link>
              </summary>
              <p className="lin-maj-auteur">
                <IconeSante sante={aFaire.length ? (parSante("bloquee").length ? "bloquee" : "litige") : "reste"} />
                <span data-teinte={aFaire.length ? (parSante("bloquee").length ? "rouge" : "jaune") : "vert"}>{aFaire.length ? `${pluriel(aFaire.length, "facture")} à reprendre` : "Rien à reprendre"}</span>
                <span className="lin-avatar-auteur" aria-hidden="true">
                  <FileText width={11} height={11} />
                </span>
                <span className="lin-maj-gris">FILED</span>
                <span className="lin-maj-gris">aujourd&apos;hui</span>
              </p>
              <p className="lin-maj-texte">Chaque document reçu est lu puis contrôlé : ce qui bloque, ce qui attend votre validation et ce qui est payable en retard est ici.</p>
              {aFaire.length ? (
                <dl className="lin-maj-citation">
                  {aFaire.slice(0, 5).map(({ l, quoi }) => (
                    <div key={`${quoi}-${l.id}`}>
                      <dt>{l.nom}</dt>
                      <dd>
                        {quoi} · {l.f ? montant(quoi === "À payer, en retard" ? arrondi(l.reste) : l.f.montant_ttc, l.f.devise) : l.a.document.reference}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : null}
              <footer className="lin-maj-pied">
                <Link href={`${LISTE}&sante=bloquee`} className="lin-maj-pied-btn" aria-label="Voir les documents bloqués" title="Voir les documents bloqués">
                  <MessageSquare width={16} height={16} aria-hidden="true" />
                </Link>
                <Link href={`${RACINE}/validations`} className="lin-maj-pied-rond" aria-label="Valider" title="Valider">
                  <CheckCheck width={16} height={16} aria-hidden="true" />
                </Link>
              </footer>
            </details>

            <h3 className="lin-projet-h2">À payer par échéance</h3>
            <ul className="lin-projet-liste">
              {GROUPES.filter((g) => g.cle !== "sans" || totalGroupe("sans")).map((g) => (
                <li key={g.cle}>
                  <span className="lin-tranche-nom">{g.libelle}</span>
                  <span className="lin-tranche-barre" aria-hidden="true">
                    <span style={{ width: `${(Math.max(0, totalGroupe(g.cle)) / maxGroupe) * 100}%` }} />
                  </span>
                  <span className="lin-meta">{montant(totalGroupe(g.cle))}</span>
                </li>
              ))}
            </ul>

            <h3 className="lin-projet-h2">Plus grosses factures à payer</h3>
            {plusGrosses.length ? (
              <ul className="lin-projet-liste">
                {plusGrosses.slice(0, 5).map((l) => (
                  <li key={l.id}>
                    <Link href={ficheDe(l.id)} className="lin-projet-lien">
                      <IconeDocumentRecu l={l} />
                      <span>{l.nom}</span>
                      <IconePriorite niveau={urgenceDe(l)} titre={urgenceTitre(l)} />
                      <span className="lin-meta">{montant(arrondi(l.reste), l.f?.devise)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="lin-maj-texte lin-maj-gris">Aucune facture à payer.</p>
            )}
            <Link href={LISTE} className="lin-voir-tout">
              Voir tous les documents <ArrowRight width={14} height={14} aria-hidden="true" />
            </Link>
          </article>

          <aside className="lin-cartes-droite" aria-label="Les chiffres">
            {/* l'ordre des cartes de Linear : Properties, Milestones, Progress, Activity */}
            <CarteDroite titre="Propriétés">
              <dl className="lin-props">
                <div>
                  <dt>Documents</dt>
                  <dd>
                    <MenuOptions
                      plat
                      titre="Voir les documents…"
                      declencheur={
                        <>
                          <IconeDocument />
                          {lignes.length}
                        </>
                      }
                      options={optionsFamilles()}
                    />
                  </dd>
                </div>
                <div>
                  <dt>À payer</dt>
                  <dd>
                    <MenuOptions
                      plat
                      titre="À payer…"
                      declencheur={
                        <>
                          <IconeJauge />
                          {aPayerL.length}
                        </>
                      }
                      options={[
                        {
                          cle: "payer",
                          libelle: "À payer",
                          meta: aPayerL.length
                            ? totaux(
                                aPayerL.map((l) => l.f!),
                                etats,
                              )
                            : undefined,
                          icone: <IconeJauge />,
                          href: `${RACINE}/filed/a-payer`,
                        },
                        { cle: "compta", libelle: "Comptabilité", icone: <ExternalLink width={16} height={16} />, href: `${RACINE}/filed/comptabilite` },
                      ]}
                    />
                  </dd>
                </div>
                <div>
                  <dt>À valider</dt>
                  <dd>
                    <MenuOptions
                      plat
                      titre="À valider…"
                      declencheur={
                        <>
                          <CheckCheck width={16} height={16} aria-hidden="true" className="lin-ic" />
                          {aValider.length}
                        </>
                      }
                      options={[
                        { cle: "decisions", libelle: "Décisions", icone: <CheckCheck width={16} height={16} />, href: `${RACINE}/validations` },
                        { cle: "circuit", libelle: "Circuit de validation", icone: <ExternalLink width={16} height={16} />, href: `${RACINE}/filed/circuit` },
                      ]}
                    />
                  </dd>
                </div>
                <div>
                  <dt>Points de contrôle</dt>
                  <dd>
                    <MenuOptions
                      plat
                      titre="Points de contrôle…"
                      declencheur={
                        <>
                          <IconeStatut sante={avecPoints.length ? "bloquee" : "reste"} />
                          {avecPoints.length}
                        </>
                      }
                      options={[
                        ...avecPoints.map((l): Option => ({
                          cle: l.id,
                          libelle: l.nom,
                          meta: `${l.a.document.reference} · ${pluriel(l.points, "point")}`,
                          icone: <IconeDocumentRecu l={l} />,
                          href: ficheDe(l.id),
                        })),
                        { cle: "controles", libelle: "Contrôles et fraude", icone: <ExternalLink width={16} height={16} />, href: `${RACINE}/filed/controles` },
                      ]}
                      largeur={320}
                    />
                  </dd>
                </div>
                <div>
                  <dt>Refusées</dt>
                  <dd>
                    <MenuOptions
                      plat
                      titre="Refusées…"
                      declencheur={
                        <>
                          <IconeStatut sante="bloquee" />
                          {refusees.length}
                        </>
                      }
                      options={[{ cle: "refusees", libelle: "Refusées", icone: <ExternalLink width={16} height={16} />, href: `${RACINE}/filed/refusees` }]}
                    />
                  </dd>
                </div>
                <div>
                  <dt>Fournisseurs</dt>
                  <dd>
                    <MenuOptions
                      plat
                      titre="Fournisseurs…"
                      declencheur={
                        <>
                          <IconeGroupe />
                          {fournisseursVus.size}
                          {aConfirmer ? ` · ${aConfirmer} à confirmer` : ""}
                        </>
                      }
                      options={[{ cle: "fournisseurs", libelle: "Fournisseurs", meta: aConfirmer ? `${aConfirmer} à confirmer` : undefined, icone: <IconeGroupe />, href: `${RACINE}/filed/fournisseurs` }]}
                    />
                  </dd>
                </div>
                <div>
                  <dt>Dernier reçu</dt>
                  <dd className={dernierRecu ? undefined : "lin-props-vide"}>
                    <MenuOptions
                      plat
                      titre="Documents reçus…"
                      declencheur={
                        <>
                          <IconeImport />
                          {dernierRecu ? dateCourte(dernierRecu) : "Aucun"}
                        </>
                      }
                      options={[
                        { cle: "deposer", libelle: "Déposer un document", icone: <Upload width={16} height={16} />, action: () => void ouvrirDepot() },
                        { cle: "boite", libelle: "Boîte de réception", icone: <Inbox width={16} height={16} />, href: `${RACINE}/filed/boite` },
                      ]}
                    />
                  </dd>
                </div>
              </dl>
            </CarteDroite>

            <CarteDroite titre="Parcours des factures">
              <ul className="lin-jalons">
                {ETAPES.map((x) => {
                  const n = lignes.filter(x.test).length;
                  return (
                    <li key={x.cle}>
                      <Losange atteint={n > 0} />
                      <span className="lin-jalon-nom">{x.libelle}</span>
                      <span className="lin-meta">{pluriel(n, "document")}</span>
                      <MenuActions
                        titre={`${x.libelle}…`}
                        options={[
                          { cle: "documents", libelle: "Documents à cette étape", icone: <Losange atteint />, href: `${LISTE}&etape=${x.cle}` },
                          { cle: "page", libelle: x.page.libelle, icone: <ExternalLink width={16} height={16} />, href: x.page.href },
                        ]}
                      />
                    </li>
                  );
                })}
              </ul>
            </CarteDroite>

            <CarteAPayer lignes={lignes} titre="Échéances" fournisseurs />

            <CarteDroite
              titre="Activité"
              action={
                <Link href={`${RACINE}/filed/boite`} className="lin-carte-lien">
                  Tout voir
                </Link>
              }
            >
              {recents.length ? (
                <ul className="lin-activite">
                  {recents.map((l) => (
                    <li key={l.id}>
                      <Losange atteint={l.sante === "reste"} />
                      <span>
                        <b>{l.nom}</b> · {l.a.document.reference} · {dateCourte(l.a.document.recu_le)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="lin-activite-vide">Aucun document reçu pour l&apos;instant.</p>
              )}
            </CarteDroite>
          </aside>
        </div>
        {fenetreDepot}
      </div>
    );
  }

  /* ——— la liste : le tableau des projets (« Voir tous les documents ») ——— */
  const q = filtre.trim().toLowerCase();
  const etape = ETAPES.find((x) => x.cle === etapeFiltre) ?? null;
  const filtres = ordonnes.filter(
    (l) =>
      (onglet === "tous" || l.sante === onglet) &&
      (!echeanceFiltre || (l.payable && l.groupe === echeanceFiltre)) &&
      (!etape || etape.test(l)) &&
      (!q || `${l.nom} ${l.a.document.reference} ${l.f?.numero ?? ""} ${l.a.document.nom_fichier}`.toLowerCase().includes(q)),
  );
  const presentes = ORDRE_SANTES.filter((x) => lignes.some((l) => l.sante === x));
  const suiteFiltres = `${echeanceFiltre ? `&echeance=${echeanceFiltre}` : ""}${etape ? `&etape=${etape.cle}` : ""}`;
  const ongletLien = (x: Famille | "tous") => `${LISTE}${x === "tous" ? "" : `&sante=${x}`}${suiteFiltres}`;
  const sansFiltre = (retire: "echeance" | "etape") =>
    `${LISTE}${onglet === "tous" ? "" : `&sante=${onglet}`}${retire !== "echeance" && echeanceFiltre ? `&echeance=${echeanceFiltre}` : ""}${retire !== "etape" && etape ? `&etape=${etape.cle}` : ""}`;
  const dansAPayer = lignes.filter((l) => l.payable);
  const lignesDetails =
    ongletDetails === "familles"
      ? FAMILLES.map((x) => ({ cle: x.cle, libelle: x.libelle, valeur: String(lignes.filter((l) => l.sante === x.cle).length) }))
      : ongletDetails === "echeances"
        ? GROUPES.map((g) => ({ cle: g.cle, libelle: g.libelle, valeur: montant(totalGroupe(g.cle)) }))
        : [...new Set(dansAPayer.map((l) => l.nom))]
            .map((nom) => ({ cle: nom, libelle: nom, n: somme(dansAPayer.filter((l) => l.nom === nom).map((l) => l.reste)) }))
            .sort((x, y) => y.n - x.n)
            .map((x) => ({ cle: x.cle, libelle: x.libelle, valeur: montant(arrondi(x.n)) }));

  return (
    <div className="lin">
      <h1 className="v2-sr">Documents reçus</h1>
      <header className="lin-tete">
        <nav className="lin-fil" aria-label="Fil d'Ariane">
          <Link href={`${RACINE}/filed`} className="lin-fil-equipe">
            Tableau de bord
          </Link>
          <span className="lin-fil-sep" aria-hidden="true">
            ›
          </span>
          <span className="lin-fil-ici" aria-current="page">
            Documents
          </span>
        </nav>
        <div className="lin-tete-droite">{boutonDepot}</div>
      </header>

      <div className="lin-outils">
        <nav className="lin-onglets" aria-label="Santé">
          <Link href={ongletLien("tous")} className="v2-btn v2-btn--petit" data-actif={onglet === "tous" ? "" : undefined} aria-current={onglet === "tous" ? "page" : undefined} scroll={false}>
            Tous les documents
          </Link>
          {presentes.map((x) => (
            <Link key={x} href={ongletLien(x)} className="v2-btn v2-btn--petit" data-actif={onglet === x ? "" : undefined} aria-current={onglet === x ? "page" : undefined} scroll={false}>
              {familleDe(x).libelle}
            </Link>
          ))}
          {echeanceFiltre && GROUPES.some((g) => g.cle === echeanceFiltre) ? (
            <Link href={sansFiltre("echeance")} className="v2-btn v2-btn--petit lin-filtre-actif" data-actif="" title="Retirer ce filtre" scroll={false}>
              <IconePriorite niveau={NIVEAUX[echeanceFiltre]} titre={groupeLibelle(echeanceFiltre)} />À payer : {groupeLibelle(echeanceFiltre).toLowerCase()} ✕
            </Link>
          ) : null}
          {etape ? (
            <Link href={sansFiltre("etape")} className="v2-btn v2-btn--petit lin-filtre-actif" data-actif="" title="Retirer ce filtre" scroll={false}>
              <Losange atteint />
              {etape.libelle} ✕
            </Link>
          ) : null}
        </nav>
        <div className="lin-outils-droite">
          <Menu
            largeur={260}
            bouton={(ouvert, basculer) => (
              <button type="button" className="v2-btn v2-btn--petit v2-btn--icone" aria-label="Filtrer" title="Filtrer" aria-expanded={ouvert} aria-pressed={!!filtre} onClick={basculer}>
                <ListFilter width={14} height={14} aria-hidden="true" />
              </button>
            )}
          >
            {(fermer) => (
              <input
                className="lin-menu-champ"
                autoFocus
                placeholder="Filtrer par fournisseur, référence ou numéro…"
                aria-label="Filtrer les documents"
                value={filtre}
                onChange={(e) => setFiltre(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fermer()}
              />
            )}
          </Menu>
          <Menu
            bouton={(ouvert, basculer) => (
              <button type="button" className="v2-btn v2-btn--petit v2-btn--icone" aria-label="Options d'affichage" title="Options d'affichage" aria-expanded={ouvert} onClick={basculer}>
                <SlidersHorizontal width={14} height={14} aria-hidden="true" />
              </button>
            )}
          >
            {() => (
              <div className="lin-menu-section">
                <label className="lin-reglage">
                  Tri
                  <Choix<Tri>
                    libelle="Tri"
                    valeur={tri}
                    onChange={setTri}
                    options={[
                      { cle: "rang", libelle: "Ce qui bloque d'abord" },
                      { cle: "echeance", libelle: "Échéance" },
                      { cle: "montant", libelle: "Montant" },
                      { cle: "recu", libelle: "Reçu le" },
                    ]}
                  />
                </label>
              </div>
            )}
          </Menu>
          <button type="button" className="v2-btn v2-btn--petit v2-btn--icone" aria-label="Détails" title="Détails" aria-pressed={details} onClick={() => setDetails((v) => !v)}>
            <PanelRight width={14} height={14} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="lin-corps" data-details={details ? "" : undefined}>
        <div className="lin-liste">
          <div className="lin-table" role="table" aria-label="Documents reçus">
            <div className="lin-table-tete" role="row">
              <span role="columnheader" aria-hidden="true" />
              <span role="columnheader">Fournisseur</span>
              <span role="columnheader">Santé</span>
              <span role="columnheader">Urgence</span>
              <span role="columnheader" className="lin-num">
                Montant
              </span>
              <span role="columnheader">Échéance</span>
              <span role="columnheader" className="lin-num">
                Points
              </span>
              <span role="columnheader">Payé</span>
            </div>
            {filtres.length === 0 ? (
              <p className="lin-vide">{lignes.length ? "Aucun document ne correspond." : "Aucun document reçu pour l'instant."}</p>
            ) : (
              filtres.map((l) => {
                const part = partPayee(l, etats);
                const statut = l.a.facture ? statutFacture(l.a.facture.statut) : etatDocument(l.a.document.etat);
                return (
                  <Link key={l.id} href={ficheDe(l.id)} className="lin-table-ligne" role="row" scroll={false}>
                    <span className="lin-case" aria-hidden="true" />
                    <span className="lin-table-nom" role="cell">
                      <IconeDocumentRecu l={l} />
                      <span className="lin-table-titre">{l.nom}</span>
                      <span className="lin-jalon-puce">
                        <Losange atteint={l.sante === "reste"} />
                        {l.a.document.reference} · {statut.libelle}
                      </span>
                    </span>
                    <span className="lin-table-sante" role="cell" data-teinte={SANTES[l.sante].teinte}>
                      <IconeSante sante={l.sante} />
                      <span>{SANTES[l.sante].libelle}</span>
                    </span>
                    <span role="cell">
                      <IconePriorite niveau={urgenceDe(l)} titre={urgenceTitre(l)} />
                    </span>
                    <span role="cell" className="lin-num lin-table-valeur">
                      {l.f?.montant_ttc !== null && l.f?.montant_ttc !== undefined ? montant(l.f.montant_ttc, l.f.devise) : "—"}
                    </span>
                    <span role="cell" className="lin-table-date">
                      <IconeCalendrier passe={l.enJeu && l.groupe === "retard"} />
                      {dateCourte(l.f?.echeance_lue)}
                    </span>
                    <span role="cell" className="lin-num lin-table-chiffre">
                      {l.f ? l.points : "—"}
                    </span>
                    <span role="cell" className="lin-table-statut">
                      {part !== null ? (
                        <>
                          <Anneau part={part} sante={l.sante} />
                          {part}%
                        </>
                      ) : (
                        "—"
                      )}
                    </span>
                  </Link>
                );
              })
            )}
          </div>
        </div>

        {details ? (
          <aside className="lin-details" aria-label="Détails">
            <div className="lin-details-onglets" role="tablist">
              {(
                [
                  ["familles", "Familles"],
                  ["echeances", "À payer"],
                  ["fournisseurs", "Fournisseurs"],
                ] as const
              ).map(([cle, lib]) => (
                <button key={cle} type="button" role="tab" className="lin-details-onglet" aria-selected={ongletDetails === cle} onClick={() => setOngletDetails(cle)}>
                  {lib}
                </button>
              ))}
            </div>
            <ul className="lin-details-lignes">
              {lignesDetails.length ? (
                lignesDetails.map((x) => (
                  <li key={x.cle}>
                    <span>{x.libelle}</span>
                    <span className="lin-details-valeur">{x.valeur}</span>
                  </li>
                ))
              ) : (
                <li>
                  <span>Aucune facture à payer.</span>
                </li>
              )}
            </ul>
          </aside>
        ) : null}
      </div>
      {fenetreDepot}
    </div>
  );
}
