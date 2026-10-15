/* ══════════════════════════════════════════════════════════════════════
   Réglages — vos données : le journal en CSV, l'export complet, la sortie
   (06/10/2026, A3 ; audit des promesses § 0)

   Journal : public.journal_opposable, lisible des gérants et admins (RLS),
   lu par pages de 1 000 lignes et écrit en CSV tel quel, empreintes de la
   chaîne comprises (chaque ligne cite l'empreinte de la précédente).

   Export complet : la fonction Edge export-complet (voir plus bas).
   Aperçu de l'effacement : la porte `apercu_effacement` (socle 19am, gérant
   ou admin), qui n'efface ni n'écrit rien.
   ══════════════════════════════════════════════════════════════════════ */

import { createClient } from "@/lib/supabase/client";

export type LigneJournal = {
  id: number;
  survenu_le: string;
  entite_id: string | null;
  acteur_type: string;
  acteur_id: string | null;
  acteur_libelle: string | null;
  action: string;
  objet_type: string;
  objet_id: string | null;
  donnees: Record<string, unknown>;
  hash_precedent: string | null;
  hash: string;
};

export class NonBranche extends Error {}

const PAGE = 1000;
const COLONNES = "id, survenu_le, entite_id, acteur_type, acteur_id, acteur_libelle, action, objet_type, objet_id, donnees, hash_precedent, hash";

export async function lireJournal(client: string, onProgres?: (n: number) => void): Promise<LigneJournal[]> {
  const supabase = createClient();
  const lignes: LigneJournal[] = [];
  for (let de = 0; ; de += PAGE) {
    const { data, error } = await supabase.from("journal_opposable").select(COLONNES).eq("client_id", client).order("id").range(de, de + PAGE - 1);
    if (error) throw new Error(error.message);
    lignes.push(...((data ?? []) as LigneJournal[]));
    onProgres?.(lignes.length);
    if ((data ?? []).length < PAGE) break;
  }
  return lignes;
}

/* bytea rendu par PostgREST : « \x0a1b… » → « 0a1b… » */
const hex = (v: string | null) => (v ? v.replace(/^\\x/, "") : "");
const cellule = (v: string) => (/[";\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

/* CSV pour un tableur français : séparateur « ; », UTF-8 avec BOM, fins de ligne CRLF */
export function journalEnCsv(lignes: LigneJournal[]): string {
  const tete = ["n°", "survenu_le", "acteur_type", "acteur", "acteur_id", "action", "objet_type", "objet_id", "entite_id", "donnees", "empreinte_precedente", "empreinte"];
  const corps = lignes.map((l) =>
    [String(l.id), l.survenu_le, l.acteur_type, l.acteur_libelle ?? "", l.acteur_id ?? "", l.action, l.objet_type, l.objet_id ?? "", l.entite_id ?? "", JSON.stringify(l.donnees ?? {}), hex(l.hash_precedent), hex(l.hash)].map(cellule).join(";"),
  );
  return "﻿" + [tete.join(";"), ...corps].join("\r\n") + "\r\n";
}

export function telechargerTexte(nom: string, contenu: string, type: string) {
  const url = URL.createObjectURL(new Blob([contenu], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nom;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* L'export complet : la fonction Edge `export-complet` (A5, socle 19aj), appelée
   avec le jeton de la personne (gérant ou admin, vérifié par
   public.demander_export_complet). Elle rend un zip chiffré AES-256 dans un
   bucket privé, un lien signé de 24 h et un mot de passe rendu UNE fois. */
export type ExportComplet = {
  export_id: string;
  lien: string;
  mot_de_passe: string;
  expire_le: string;
  nb_fichiers: number;
  fichiers_manquants: number;
  octets: number;
  sha256: string;
};
/* public.apercu_effacement (socle 19am, gérant ou admin) : ce qui serait effacé, sans rien effacer ni écrire */
export type ApercuEffacement = {
  client: string;
  lignes: number;
  comptes: number;
  tables: { table: string; ordre: number; lignes: number }[];
  fichiers: { liste: { bucket: string; nom: string; octets: number }[]; nombre: number; octets: number; liste_tronquee?: boolean };
  calcule_le: string;
  rien_n_est_efface: boolean;
};

export async function demanderExportComplet(client: string): Promise<ExportComplet> {
  const { data, error } = await createClient().functions.invoke("export-complet", { body: { client_id: client } });
  if (error) {
    const rep = (error as { context?: Response }).context;
    if (rep && typeof rep.json === "function") {
      const corps = (await rep.json().catch(() => null)) as { erreur?: string } | null;
      const statut = rep.status;
      if (statut === 403) throw new Error("Réservé au gérant ou à un administrateur de l'organisation.");
      if (statut === 409) throw new Error("Un export complet est déjà en cours pour votre organisation : réessayez dans quelques minutes.");
      if (statut === 401) throw new Error("Session expirée : rechargez la page.");
      if (statut === 404) throw new NonBranche("export-complet");
      throw new Error(corps?.erreur ?? `La fonction d'export a répondu ${statut}.`);
    }
    /* réseau, ou origine refusée par la fonction (EXPORT_ORIGINES) */
    throw new Error("La fonction d'export n'a pas répondu (réseau, ou cette adresse du site n'est pas autorisée par la fonction).");
  }
  return data as ExportComplet;
}

async function porte<T>(nom: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await createClient().rpc(nom, args);
  if (error) {
    /* PGRST202 : la fonction n'existe pas (pas encore posée) */
    if (error.code === "PGRST202" || /could not find the function/i.test(error.message)) throw new NonBranche(nom);
    throw new Error(error.message);
  }
  return data as T;
}

/* l'aperçu de ce qui serait effacé (socle 19am) */
export const apercuEffacement = (client: string) => porte<ApercuEffacement>("apercu_effacement", { p_client: client });

export function octets(n: number): string {
  if (n < 1024) return `${n} o`;
  if (n < 1024 ** 2) return `${Math.round(n / 1024)} ko`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} Mo`;
  return `${(n / 1024 ** 3).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} Go`;
}
