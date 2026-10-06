/* ══════════════════════════════════════════════════════════════════════
   Les réserves à émettre — VARELO (06/10/2026, B1)

   Formes décalquées de omega/modules/varelo/migrations/b1_11_reserves.sql :
   vue grp_reserves ; portes grp_enregistrer_reception, grp_lettre_reserve,
   grp_noter_protestation, grp_classer_reception ; et b1_12_photos.sql :
   les photos du constat (colonne photos, porte grp_joindre_photo). En base réelle, la date
   limite vient du moteur de délais du socle (public.echeance_de, fériés du
   territoire de la société) ; l'exemple la calcule sans les fériés.
   ══════════════════════════════════════════════════════════════════════ */

import { createClient } from "@/lib/supabase/client";
import { EXEMPLE_CLIENT_ID, SIEGE } from "../exemples/socle";
import { ErreurPorte } from "./portes";
import { ANNECY, SOCIETES_EXEMPLE } from "./exemples";

export type Mode = "routier" | "cmr" | "maritime" | "aerien";
export type EtatReserve = "depasse" | "aujourdhui" | "demain" | "a_venir" | "protestee" | "protestee_hors_delai" | "sans_suite";
export type Moyen = "lrar" | "acte" | "lre" | "courriel" | "portail";
/* une photo du constat : son chemin dans le bucket omega-clients (base réelle) ou une adresse locale (exemple) */
export type Photo = { chemin: string; nom: string; octets: number | null; type: string; depose_le: string; url?: string };

/* une ligne de grp_reserves */
export type Reserve = {
  id: string;
  client_id: string;
  entite_id: string;
  societe: string;
  date_reception: string;
  mode: Mode;
  transporteur: string;
  document_transport: string | null;
  objet_id: string | null;
  code_groupe: string | null;
  expediteur: string | null;
  colis_attendus: number | null;
  colis_recus: number | null;
  avarie: boolean;
  manquant: boolean;
  constat: string | null;
  reserves_sur_bon: string | null;
  montant_estime: number | null;
  regle_code: string | null;
  regle_libelle: string | null;
  regle_source: string | null;
  echeance: string;
  jours_restants: number;
  calcul_detail: string | null;
  statut: "a_examiner" | "protestee" | "sans_suite";
  protestation_le: string | null;
  protestation_moyen: Moyen | null;
  motif: string | null;
  etat: EtatReserve;
  photos: Photo[];
};

export const REGLES: Record<Mode, { libelle: string; jours: number; ouvrables: boolean; source: string }> = {
  routier: { libelle: "Routier national", jours: 3, ouvrables: true, source: "C. com., art. L133-3 : protestation motivée par acte extrajudiciaire ou lettre recommandée dans les trois jours, non compris les jours fériés, qui suivent la réception." },
  cmr: { libelle: "Routier international (CMR)", jours: 7, ouvrables: true, source: "Convention CMR, art. 30 : réserves écrites dans les sept jours à dater de la livraison, dimanches et jours fériés non compris, pour les pertes ou avaries non apparentes." },
  maritime: { libelle: "Maritime", jours: 3, ouvrables: false, source: "Règles de La Haye-Visby, art. 3, § 6 : avis écrit dans les trois jours de la délivrance quand la perte ou le dommage n'est pas apparent." },
  aerien: { libelle: "Aérien", jours: 14, ouvrables: false, source: "Convention de Montréal, art. 31, § 2 : protestation au plus tard dans les quatorze jours de la réception de la marchandise en cas d'avarie." },
};
export const LIBELLE_MOYEN: Record<Moyen, string> = { lrar: "lettre recommandée avec accusé de réception", acte: "acte extrajudiciaire (commissaire de justice)", lre: "lettre recommandée électronique", courriel: "courriel", portail: "portail du transporteur" };
export const LIBELLE_ETAT_RESERVE: Record<EtatReserve, { libelle: string; teinte: "rouge" | "ambre" | "gris" | "vert" | "bleu" }> = {
  depasse: { libelle: "Délai passé", teinte: "rouge" },
  aujourdhui: { libelle: "Dernier jour", teinte: "rouge" },
  demain: { libelle: "Demain", teinte: "rouge" },
  a_venir: { libelle: "À protester", teinte: "ambre" },
  protestee: { libelle: "Protestation partie", teinte: "vert" },
  protestee_hors_delai: { libelle: "Partie hors délai", teinte: "ambre" },
  sans_suite: { libelle: "Sans suite", teinte: "gris" },
};

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const jourLocal = (s: string) => {
  const [a, m, j] = s.slice(0, 10).split("-").map(Number);
  return new Date(a, m - 1, j);
};
export const aujourdhui = () => iso(new Date());
export const ilYa = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return iso(d);
};
const ecart = (a: string, b: string) => Math.round((jourLocal(a).getTime() - jourLocal(b).getTime()) / 86400000);

/* l'exemple seulement : sans les fériés (la base réelle passe par le moteur du socle) */
export function echeanceExemple(mode: Mode, depart: string): string {
  const r = REGLES[mode];
  const d = jourLocal(depart);
  if (!r.ouvrables) {
    d.setDate(d.getDate() + r.jours);
    return iso(d);
  }
  let n = 0;
  while (n < r.jours) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0) n++;
  }
  return iso(d);
}

export function etatDe(r: Pick<Reserve, "statut" | "echeance" | "protestation_le">): EtatReserve {
  if (r.statut === "sans_suite") return "sans_suite";
  if (r.statut === "protestee") return r.protestation_le && r.protestation_le > r.echeance ? "protestee_hors_delai" : "protestee";
  const reste = ecart(r.echeance, aujourdhui());
  return reste < 0 ? "depasse" : reste === 0 ? "aujourdhui" : reste === 1 ? "demain" : "a_venir";
}

export type ChampsReception = {
  date_reception: string;
  mode: Mode;
  transporteur: string;
  document_transport: string | null;
  objet_id: string | null;
  expediteur: string | null;
  colis_attendus: number | null;
  colis_recus: number | null;
  avarie: boolean;
  manquant: boolean;
  constat: string | null;
  reserves_sur_bon: string | null;
  montant_estime: number | null;
};

export function reserveExemple(id: string, entite_id: string, c: ChampsReception, objetNom: string | null): Reserve {
  const ech = echeanceExemple(c.mode, c.date_reception);
  const statut: Reserve["statut"] = c.avarie || c.manquant ? "a_examiner" : "sans_suite";
  const base = { statut, echeance: ech, protestation_le: null };
  return {
    id, client_id: EXEMPLE_CLIENT_ID, entite_id, societe: SOCIETES_EXEMPLE.find((s) => s.entite_id === entite_id)?.nom ?? "Société",
    date_reception: c.date_reception, mode: c.mode, transporteur: c.transporteur, document_transport: c.document_transport, objet_id: c.objet_id, code_groupe: null,
    expediteur: objetNom ?? c.expediteur, colis_attendus: c.colis_attendus, colis_recus: c.colis_recus, avarie: c.avarie, manquant: c.manquant, constat: c.constat,
    reserves_sur_bon: c.reserves_sur_bon, montant_estime: c.montant_estime, regle_code: `varelo.reserves.${c.mode}`, regle_libelle: REGLES[c.mode].libelle,
    regle_source: REGLES[c.mode].source, echeance: ech, jours_restants: ecart(ech, aujourdhui()),
    calcul_detail: `${REGLES[c.mode].jours} jours${REGLES[c.mode].ouvrables ? " ouvrables" : ""} à compter du ${c.date_reception.split("-").reverse().join("/")} (exemple : sans les jours fériés)`,
    statut, protestation_le: null, protestation_moyen: null, motif: statut === "sans_suite" ? "livraison conforme : ni avarie ni manquant" : null, etat: etatDe(base),
    photos: [],
  };
}

const U = (fin: string) => `00000000-0000-4000-8000-0000000${fin}`;
export const RESERVES_EXEMPLE = (): Reserve[] => [
  reserveExemple(U("0v01"), SIEGE, { date_reception: ilYa(1), mode: "routier", transporteur: "Transports Deschamps", document_transport: "LV-2026-0457", objet_id: null, expediteur: "Scieries du Jura",
    colis_attendus: 12, colis_recus: 11, avarie: true, manquant: true, constat: "Une palette de panneaux MDF aux angles écrasés ; un colis de quincaillerie manquant.", reserves_sur_bon: "Palette abîmée, un colis manquant", montant_estime: 1840 }, null),
  reserveExemple(U("0v02"), ANNECY, { date_reception: ilYa(2), mode: "maritime", transporteur: "CMA CGM", document_transport: "BL-LEH-55120", objet_id: null, expediteur: "Vernis Lacroix",
    colis_attendus: null, colis_recus: null, avarie: true, manquant: false, constat: "Fûts de vernis cabossés, un fût fuyant.", reserves_sur_bon: null, montant_estime: 2600 }, null),
];

/* le texte de la protestation, pour l'exemple (même gabarit que private.grp_lettre_reserve) */
export function lettreExemple(r: Reserve): string {
  const dr = r.date_reception.split("-").reverse().join("/");
  const nature = r.avarie && r.manquant ? "avarie et perte partielle" : r.manquant ? "perte partielle" : "avarie";
  return [
    r.societe, "", `À l'attention de ${r.transporteur}`, "", `Objet : protestation motivée — livraison du ${dr}${r.document_transport ? `, document de transport n° ${r.document_transport}` : ""}`, "",
    "Madame, Monsieur,", "",
    `Nous avons reçu le ${dr} la livraison${r.expediteur ? ` expédiée par ${r.expediteur}` : ""}${r.colis_attendus !== null && r.colis_recus !== null ? ` : ${r.colis_attendus} colis annoncés, ${r.colis_recus} reçus` : ""}. ${r.reserves_sur_bon ? `Les réserves suivantes ont été portées sur le bon de livraison : « ${r.reserves_sur_bon} ».` : "Aucune réserve n'a pu être portée sur le bon au moment de la livraison."}`, "",
    `Constat : ${r.constat ?? "—"}`,
    ...(r.montant_estime !== null ? [`Préjudice estimé à ce jour : ${r.montant_estime.toLocaleString("fr-FR")} €.`] : []),
    r.photos.length === 0 ? "Les photographies du constat sont tenues à votre disposition." : r.photos.length === 1 ? "Une photographie du constat est jointe à la présente." : `${r.photos.length} photographies du constat sont jointes à la présente.`, "",
    `Nous vous adressons, par la présente, notre protestation motivée pour ${nature}, et réservons tous nos droits à indemnisation${r.montant_estime !== null ? ", à hauteur du préjudice subi" : ""}.`, "",
    `Cette protestation vous est notifiée dans le délai prévu : ${r.regle_source ?? ""} (${r.calcul_detail ?? ""}).`, "",
    "Veuillez agréer, Madame, Monsieur, nos salutations distinguées.", "", r.societe,
  ].join("\n");
}

/* ——— base réelle ——— */
function message(e: unknown): string {
  if (e && typeof e === "object" && "message" in e && typeof (e as { message: unknown }).message === "string") return (e as { message: string }).message;
  return "La base n'a pas répondu.";
}
export async function chargerReserves(client_id: string): Promise<Reserve[]> {
  const { data, error } = await createClient().from("grp_reserves").select("*").eq("client_id", client_id).order("echeance").limit(1000);
  if (error) throw new ErreurPorte(message(error));
  return ((data ?? []) as Reserve[]).map((r) => ({ ...r, montant_estime: r.montant_estime === null ? null : Number(r.montant_estime), photos: Array.isArray(r.photos) ? r.photos : [] }));
}
async function rpc<T>(nom: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await createClient().rpc(nom, args);
  if (error) throw new ErreurPorte(message(error));
  return data as T;
}
export const enregistrerReception = (client_id: string, entite_id: string, champs: ChampsReception) =>
  rpc<{ reception: string; statut: string; echeance: string; detail: string }>("grp_enregistrer_reception", { p_client: client_id, p_entite: entite_id, p_champs: champs });
export const lettreReserve = (id: string) => rpc<string>("grp_lettre_reserve", { p_reception: id });
export const noterProtestation = (id: string, date: string, moyen: Moyen, motif: string | null) =>
  rpc<{ hors_delai: boolean; avertissement: string | null }>("grp_noter_protestation", { p_reception: id, p_date: date, p_moyen: moyen, p_motif: motif });
export const classerReception = (id: string, motif: string) => rpc<null>("grp_classer_reception", { p_reception: id, p_motif: motif });

/* Une photo du constat : le fichier part dans le bucket omega-clients sous
   <client>/grp_receptions/<livraison>/… (politique Storage INSERT du socle,
   lot 19o), puis la porte grp_joindre_photo vérifie et l'inscrit. */
export const PHOTO_MAX_OCTETS = 15 * 1024 * 1024;
export async function joindrePhoto(client_id: string, reception_id: string, fichier: File): Promise<number> {
  const supabase = createClient();
  const nom = fichier.name.replace(/[^\w.\-]+/g, "_").slice(0, 120) || "photo";
  const chemin = `${client_id}/grp_receptions/${reception_id}/${Date.now()}-${nom}`;
  const envoi = await supabase.storage.from("omega-clients").upload(chemin, fichier, { upsert: false, contentType: fichier.type || "application/octet-stream" });
  if (envoi.error) throw new ErreurPorte(message(envoi.error));
  const r = await rpc<{ photos: number }>("grp_joindre_photo", { p_reception: reception_id, p_chemin: chemin, p_nom: fichier.name.slice(0, 200) });
  return r.photos;
}
export async function adressePhoto(chemin: string): Promise<string> {
  const { data, error } = await createClient().storage.from("omega-clients").createSignedUrl(chemin, 600);
  if (error || !data) throw new ErreurPorte(error ? message(error) : "La photo n'a pas pu être lue.");
  return data.signedUrl;
}
export const photoExemple = (f: File): Photo => ({ chemin: `exemple/${Date.now()}-${f.name}`, nom: f.name, octets: f.size, type: f.type, depose_le: new Date().toISOString(), url: URL.createObjectURL(f) });
