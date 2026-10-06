/* ══════════════════════════════════════════════════════════════════════
   Les contrats du groupe à dénoncer — VARELO, vague 3 (06/10/2026, B1)

   Formes décalquées de omega/modules/varelo/migrations/b1_05_contrats_groupe.sql :
   vue grp_contrats_echeancier ; portes grp_enregistrer_contrat,
   grp_denoncer_contrat, grp_archiver_contrat. Le calcul de l'exemple
   (echeancier) refait celui de la vue : échéance courante (reconduction
   tacite, art. 1215 C. civ.), date limite = échéance − préavis, état du délai.
   ══════════════════════════════════════════════════════════════════════ */

import { createClient } from "@/lib/supabase/client";
import { AGENCE, EXEMPLE_CLIENT_ID, SIEGE, ilYa } from "../exemples/socle";
import { ErreurPorte } from "./portes";
import { ANNECY, SOCIETES_EXEMPLE } from "./exemples";
import type { Objet } from "./types";

export type Reconduction = "tacite" | "expresse" | "aucune";
export type UnitePreavis = "jours" | "mois";
export type StatutContrat = "actif" | "denonce" | "archive";
export type EtatDelai = "depasse" | "urgent" | "bientot" | "large" | "sans_objet";
export type Categorie = "maintenance" | "location" | "assurance" | "abonnement" | "prestation" | "fourniture" | "bail" | "licence" | "autre";

export const CATEGORIES: { cle: Categorie; libelle: string }[] = [
  { cle: "prestation", libelle: "Prestation de services" },
  { cle: "maintenance", libelle: "Maintenance" },
  { cle: "location", libelle: "Location" },
  { cle: "abonnement", libelle: "Abonnement" },
  { cle: "licence", libelle: "Licence de logiciel" },
  { cle: "assurance", libelle: "Assurance" },
  { cle: "fourniture", libelle: "Fourniture" },
  { cle: "bail", libelle: "Bail" },
  { cle: "autre", libelle: "Autre" },
];

/* une ligne de grp_contrats_echeancier */
export type Contrat = {
  id: string;
  client_id: string;
  entite_id: string;
  societe: string;
  nature: "fournisseur" | "client" | null;
  objet_id: string | null;
  code_groupe: string | null;
  tiers: string;
  intitule: string;
  reference: string | null;
  categorie: Categorie;
  date_debut: string | null;
  date_echeance: string;
  echeance_courante: string;
  reconduit: boolean;
  reconduction: Reconduction;
  duree_reconduction_mois: number;
  preavis_valeur: number;
  preavis_unite: UnitePreavis;
  date_limite: string;
  jours_restants: number;
  etat_delai: EtatDelai;
  montant_annuel: number | null;
  notes: string | null;
  statut: StatutContrat;
  denonce_le: string | null;
  denonce_par: string | null;
  motif: string | null;
  cree_par: string | null;
  cree_le: string;
  maj_le: string;
  contrats_du_tiers: number;
  societes_du_tiers: number;
};

/* ce qu'on saisit (grp_enregistrer_contrat, p_champs) */
export type ChampsContrat = {
  intitule: string;
  objet_id: string | null;
  tiers: string | null;
  reference: string | null;
  categorie: Categorie;
  date_debut: string | null;
  date_echeance: string;
  reconduction: Reconduction;
  duree_reconduction_mois: number;
  preavis_valeur: number;
  preavis_unite: UnitePreavis;
  montant_annuel: number | null;
  notes: string | null;
};

export const LIBELLE_DELAI: Record<EtatDelai, { libelle: string; teinte: "rouge" | "ambre" | "bleu" | "gris" | "vert" }> = {
  depasse: { libelle: "Délai passé", teinte: "rouge" },
  urgent: { libelle: "Moins de 30 jours", teinte: "rouge" },
  bientot: { libelle: "Moins de 90 jours", teinte: "ambre" },
  large: { libelle: "Dans les temps", teinte: "vert" },
  sans_objet: { libelle: "Rien à dénoncer", teinte: "gris" },
};

/* ——— les dates, comme la vue ——— */
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const jourLocal = (s: string) => {
  const [a, m, j] = s.slice(0, 10).split("-").map(Number);
  return new Date(a, m - 1, j);
};
/* ajoute n mois comme Postgres (le 31 janvier + 1 mois = le 28 ou 29 février) */
function plusMois(s: string, n: number): string {
  const d = jourLocal(s);
  const cible = new Date(d.getFullYear(), d.getMonth() + n, 1);
  const dernier = new Date(cible.getFullYear(), cible.getMonth() + 1, 0).getDate();
  cible.setDate(Math.min(d.getDate(), dernier));
  return iso(cible);
}
const plusJours = (s: string, n: number) => {
  const d = jourLocal(s);
  d.setDate(d.getDate() + n);
  return iso(d);
};
const ecart = (a: string, b: string) => Math.round((jourLocal(a).getTime() - jourLocal(b).getTime()) / 86400000);
export const aujourdhui = () => iso(new Date());

export function echeancier(k: Omit<Contrat, "echeance_courante" | "reconduit" | "date_limite" | "jours_restants" | "etat_delai" | "contrats_du_tiers" | "societes_du_tiers">, tous: { objet_id: string | null; entite_id: string; statut: StatutContrat }[], jour = aujourdhui()): Contrat {
  let courante = k.date_echeance;
  if (k.reconduction === "tacite" && k.statut === "actif") {
    for (let n = 1; courante < jour && n <= 1200; n++) courante = plusMois(k.date_echeance, k.duree_reconduction_mois * n);
  }
  const limite = k.preavis_unite === "mois" ? plusMois(courante, -k.preavis_valeur) : plusJours(courante, -k.preavis_valeur);
  const reste = ecart(limite, jour);
  const etat: EtatDelai = k.statut !== "actif" || k.reconduction === "aucune" ? "sans_objet" : reste < 0 ? "depasse" : reste <= 30 ? "urgent" : reste <= 90 ? "bientot" : "large";
  const memes = k.objet_id ? tous.filter((x) => x.objet_id === k.objet_id && x.statut === "actif") : [];
  return { ...k, echeance_courante: courante, reconduit: courante > k.date_echeance, date_limite: limite, jours_restants: reste, etat_delai: etat, contrats_du_tiers: memes.length, societes_du_tiers: new Set(memes.map((x) => x.entite_id)).size };
}

/* ——— l'exemple : les contrats de l'atelier Bertin ——— */
const U = (fin: string) => `00000000-0000-4000-8000-0000000${fin}`;
const nomSoc = (id: string) => SOCIETES_EXEMPLE.find((s) => s.entite_id === id)?.nom ?? "Société";
const dans = (jours: number) => plusJours(aujourdhui(), jours);

export type ContratBrut = Omit<Contrat, "echeance_courante" | "reconduit" | "date_limite" | "jours_restants" | "etat_delai" | "contrats_du_tiers" | "societes_du_tiers">;

const B = (fin: string, entite: string, objet: Objet | null, tiers: string, champs: Partial<ContratBrut> & { intitule: string; date_echeance: string }): ContratBrut => ({
  id: U(fin),
  client_id: EXEMPLE_CLIENT_ID,
  entite_id: entite,
  societe: nomSoc(entite),
  nature: objet ? (objet.nature as "fournisseur" | "client") : null,
  objet_id: objet?.id ?? null,
  code_groupe: objet?.code_groupe ?? null,
  tiers: objet?.nom_groupe ?? tiers,
  reference: null,
  categorie: "prestation",
  date_debut: null,
  reconduction: "tacite",
  duree_reconduction_mois: 12,
  preavis_valeur: 3,
  preavis_unite: "mois",
  montant_annuel: null,
  notes: null,
  statut: "actif",
  denonce_le: null,
  denonce_par: null,
  motif: null,
  cree_par: null,
  cree_le: ilYa(60),
  maj_le: ilYa(60),
  ...champs,
});

export function contratsExemple(objets: Objet[]): ContratBrut[] {
  const o = (id: string) => objets.find((x) => x.id === U(id)) ?? null;
  return [
    /* le transporteur sous contrat dans deux sociétés : une négociation de groupe */
    B("0t01", SIEGE, o("0f06"), "Transports Deschamps", { intitule: "Livraisons régionales", reference: "TD-2023-04", date_echeance: dans(48), preavis_valeur: 1, montant_annuel: 36000 }),
    B("0t02", ANNECY, o("0f06"), "Transports Deschamps", { intitule: "Navettes Annecy – Lyon", date_echeance: dans(130), montant_annuel: 14400 }),
    B("0t03", AGENCE, null, "Bureau Contrôle Alpes", { intitule: "Vérifications électriques annuelles", categorie: "maintenance", date_debut: dans(-375), date_echeance: dans(-10), preavis_valeur: 2, montant_annuel: 2900 }),
    B("0t04", SIEGE, null, "Loc'Manut", { intitule: "Location de deux chariots élévateurs", categorie: "location", date_echeance: dans(12), preavis_valeur: 10, preavis_unite: "jours", montant_annuel: 7800 }),
    B("0t05", SIEGE, o("0f07"), "Papeterie du Rhône", { intitule: "Fournitures de bureau", categorie: "fourniture", date_echeance: dans(250), montant_annuel: 4200 }),
    B("0t06", AGENCE, null, "Éditeur de la paie", { intitule: "Licence du logiciel de paie", categorie: "licence", date_echeance: dans(70), reconduction: "aucune", montant_annuel: 3100 }),
    B("0t07", ANNECY, null, "Assurances du Lac", { intitule: "Flotte automobile", categorie: "assurance", date_echeance: dans(95), preavis_valeur: 2, montant_annuel: 9600, statut: "denonce", denonce_le: dans(-3), motif: "Mise en concurrence au niveau du groupe" }),
  ];
}

/* ——— base réelle ——— */
function message(e: unknown): string {
  if (e && typeof e === "object" && "message" in e && typeof (e as { message: unknown }).message === "string") return (e as { message: string }).message;
  return "La base n'a pas répondu.";
}

export async function chargerContrats(client_id: string): Promise<Contrat[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("grp_contrats_echeancier").select("*").eq("client_id", client_id).order("date_limite").limit(2000);
  if (error) throw new ErreurPorte(message(error));
  return ((data ?? []) as Contrat[]).map((c) => ({ ...c, montant_annuel: c.montant_annuel === null ? null : Number(c.montant_annuel) }));
}

async function rpc<T>(nom: string, args: Record<string, unknown>): Promise<T> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc(nom, args);
  if (error) throw new ErreurPorte(message(error));
  return data as T;
}

export const enregistrerContrat = (client_id: string, entite_id: string | null, champs: Partial<ChampsContrat>, contrat_id: string | null) =>
  rpc<string>("grp_enregistrer_contrat", { p_client: client_id, p_entite: entite_id, p_champs: champs, p_contrat: contrat_id });

export const denoncerContrat = (contrat_id: string, date: string, motif: string | null) =>
  rpc<{ hors_delai: boolean; date_limite: string }>("grp_denoncer_contrat", { p_contrat: contrat_id, p_date: date, p_motif: motif });

export const archiverContrat = (contrat_id: string, motif: string | null) => rpc<null>("grp_archiver_contrat", { p_contrat: contrat_id, p_motif: motif });
