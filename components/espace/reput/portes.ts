/* ══════════════════════════════════════════════════════════════════════
   Les portes REPUT — côté navigateur, sous RLS (06/10/2026, session C3)

   Lecture : les tables reput_demandes, reput_reponses, reput_connaissances,
   reput_sujets (SELECT sous RLS, périmètre d'entité), la réception par
   public.receptions (RLS du socle), l'état des accords par reput_accords.
   Écriture : UNIQUEMENT par les portes publiques — reput_decider,
   reput_corriger (c3_03), reput_ecrire_connaissance,
   reput_valider_connaissance, reput_retirer_connaissance (c3_01),
   reput_donner_accord, reput_revoquer_accord, reput_activer_accord_seul
   (c3_03). Si la base répond autrement, l'écran montre son message.
   ══════════════════════════════════════════════════════════════════════ */

import { createClient } from "@/lib/supabase/client";
import type { Accords, Avis, Client, Demande, Equipe, Fiche, Indicateurs, Monde, Reception, Reglages, Reponse, Sujet } from "./types";

export class ErreurPorte extends Error {}

function message(e: unknown): string {
  if (e && typeof e === "object" && "message" in e && typeof (e as { message: unknown }).message === "string") return (e as { message: string }).message;
  return "La base n'a pas répondu.";
}

async function rpc<T = unknown>(nom: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await createClient().rpc(nom, args);
  if (error) throw new ErreurPorte(message(error));
  return data as T;
}

export async function monClient(): Promise<Client | null> {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data } = await supabase.from("comptes").select("client_id, role").eq("user_id", auth.user.id).limit(1);
  const c = (data ?? [])[0] as { client_id: string; role: string } | undefined;
  return c ? { client_id: c.client_id, role: c.role, user_id: auth.user.id } : null;
}

export async function chargerMonde(client: Client): Promise<Monde> {
  const supabase = createClient();
  const depuis = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);
  const [g, av, ind, eq] = await Promise.all([
    supabase.from("reput_reglages").select("*").eq("client_id", client.client_id).is("entite_id", null).maybeSingle(),
    supabase.from("reput_avis").select("*").eq("client_id", client.client_id).order("cree_le", { ascending: false }).limit(100),
    supabase.from("reput_indicateurs").select("recues, repondues, parties_seules, hors_base, delai_median_minutes").eq("client_id", client.client_id).gte("jour", depuis),
    supabase.from("equipes").select("id, nom").eq("client_id", client.client_id).order("nom"),
  ]);
  for (const r of [g, av, ind]) if (r.error) throw new ErreurPorte(message(r.error));
  const lignes = (ind.data ?? []) as Indicateurs[];
  const delais = lignes.map((x) => x.delai_median_minutes).filter((x): x is number => x !== null).map(Number).sort((a, b) => a - b);
  const indicateurs: Indicateurs = {
    recues: lignes.reduce((n, x) => n + Number(x.recues), 0),
    repondues: lignes.reduce((n, x) => n + Number(x.repondues), 0),
    parties_seules: lignes.reduce((n, x) => n + Number(x.parties_seules), 0),
    hors_base: lignes.reduce((n, x) => n + Number(x.hors_base), 0),
    delai_median_minutes: delais.length ? delais[Math.floor(delais.length / 2)] : null,
  };
  const [d, f, s, a] = await Promise.all([
    supabase.from("reput_demandes").select("*").eq("client_id", client.client_id).order("recu_le", { ascending: false }).limit(200),
    supabase.from("reput_connaissances").select("*").eq("client_id", client.client_id).in("statut", ["brouillon", "validee"]).order("sujet").order("titre"),
    supabase.from("reput_sujets").select("*").eq("client_id", client.client_id).order("ordre"),
    rpc<Accords>("reput_accords", { p_client: client.client_id }),
  ]);
  for (const r of [d, f, s]) if (r.error) throw new ErreurPorte(message(r.error));
  const demandes = (d.data ?? []) as Demande[];
  const ids = demandes.map((x) => x.id);
  const recIds = demandes.map((x) => x.reception_id);
  const [p, r] = await Promise.all([
    ids.length ? supabase.from("reput_reponses").select("*").in("demande_id", ids).order("version", { ascending: false }) : Promise.resolve({ data: [], error: null }),
    recIds.length ? supabase.from("receptions").select("id, canal, de_nom, de_adresse, sujet, corps, recu_le, pieces").in("id", recIds) : Promise.resolve({ data: [], error: null }),
  ]);
  if (p.error) throw new ErreurPorte(message(p.error));
  if (r.error) throw new ErreurPorte(message(r.error));
  const receptions: Record<number, Reception> = {};
  for (const x of (r.data ?? []) as Reception[]) receptions[x.id] = x;
  return {
    equipes: (eq.error ? [] : (eq.data ?? [])) as Equipe[],
    reglages: (g.data ?? null) as Reglages | null,
    avis: (av.data ?? []) as Avis[],
    indicateurs,
    demandes,
    receptions,
    reponses: ((p.data ?? []) as Reponse[]).map((x) => ({ ...x, cout_eur: Number(x.cout_eur ?? 0) })),
    fiches: (f.data ?? []) as Fiche[],
    sujets: (s.data ?? []) as Sujet[],
    accords: a ?? { sujets: [], peut_donner: false, seul_decideur: false },
  };
}

export const decider = (reponse: string, decision: "valider" | "refuser", motif?: string) =>
  rpc("reput_decider", { p_reponse: reponse, p_decision: decision, p_motif: motif ?? null });

export const corriger = (reponse: string, corps: string, objet?: string | null) =>
  rpc("reput_corriger", { p_reponse: reponse, p_corps: corps, p_objet: objet ?? null });

export const ecrireFiche = (id: string | null, client: string, fiche: Partial<Fiche>) =>
  rpc<Fiche & { statut: Fiche["statut"] }>("reput_ecrire_connaissance", { p_id: id, p_client: client, p_fiche: fiche });

export const validerFiche = (id: string) => rpc("reput_valider_connaissance", { p_id: id });
export const retirerFiche = (id: string, motif: string) => rpc("reput_retirer_connaissance", { p_id: id, p_motif: motif });

export const donnerAccord = (client: string, sujet: string) => rpc("reput_donner_accord", { p_client: client, p_sujet: sujet });
export const revoquerAccord = (client: string, sujet: string, motif: string) =>
  rpc("reput_revoquer_accord", { p_client: client, p_sujet: sujet, p_motif: motif });
export type ResultatEnvoiAuto = { actif: boolean; proposes: number; actives: number; revoques: number; a_activer_par_un_autre: boolean };
export const envoiAutomatique = (client: string, actif: boolean, motif?: string) =>
  rpc<ResultatEnvoiAuto>("reput_envoi_automatique", { p_client: client, p_actif: actif, p_motif: motif ?? null });
export const activerAccordSeul = (client: string, sujet: string) => rpc("reput_activer_accord_seul", { p_client: client, p_sujet: sujet });

export const regler = (client: string, reglages: Partial<Reglages>) =>
  rpc<Reglages>("reput_regler", { p_client: client, p_entite: null, p_reglages: reglages });
export const programmerAvis = (client: string, canal: string, adresse: string, nom: string | null, reference: string | null, regleLe: string | null) =>
  rpc<{ avis: string; statut: string; motif: string | null }>("reput_programmer_avis", {
    p_client: client, p_canal: canal, p_adresse: adresse, p_nom: nom, p_reference: reference, p_regle_le: regleLe, p_entite: null,
  });
export const avisRecu = (avis: string) => rpc("reput_avis_recu", { p_avis: avis });
export const fixerDelai = (client: string, sujet: string, heures: number) => rpc("reput_fixer_delai", { p_client: client, p_sujet: sujet, p_heures: heures });
export const routerSujet = (client: string, sujet: string, equipe: string | null) =>
  rpc("reput_router_sujet", { p_client: client, p_sujet: sujet, p_equipe: equipe });

/* Les pièces jointes d'une demande (c3_14) : la liste, puis l'ouverture — la base
   journalise et rend le chemin, le navigateur signe un lien de 5 minutes. */
export type PieceDemande = { rang: number; nom: string; mime: string; taille: number | null; nature: "image" | "pdf" | "texte" | "audio" | "video" | "autre"; affichable: boolean; disponible: boolean };
export const piecesDemande = (demande: string) =>
  rpc<{ pieces: PieceDemande[]; ignorees: string[] }>("reput_pieces", { p_demande: demande });
export async function ouvrirPiece(demande: string, rang: number): Promise<{ url: string; nom: string; nature: PieceDemande["nature"]; affichable: boolean }> {
  const o = await rpc<{ bucket: string; chemin: string; duree: number; nom: string; nature: PieceDemande["nature"]; affichable: boolean }>(
    "reput_ouvrir_piece", { p_demande: demande, p_rang: rang });
  const { data, error } = await createClient().storage.from(o.bucket).createSignedUrl(o.chemin, o.duree, o.affichable ? undefined : { download: o.nom });
  if (error || !data?.signedUrl) throw new ErreurPorte("Le fichier n'est pas dans le stockage : il n'a peut-être pas été reçu.");
  return { url: data.signedUrl, nom: o.nom, nature: o.nature, affichable: o.affichable };
}

/* Une même personne sur deux canaux (c3_15) : une personne rapproche, écarte la proposition, ou sépare. */
export const rapprocher = (demande: string, avec: string) => rpc("reput_rapprocher", { p_demande: demande, p_avec: avec });
export const ecarterRapprochement = (demande: string) => rpc("reput_ecarter_rapprochement", { p_demande: demande });
export const separer = (demande: string) => rpc("reput_separer", { p_demande: demande });

/* Le second sujet d'une demande (c3_16) : le second service est prévenu s'il en a un autre. */
export const noterSujetSecondaire = (demande: string, sujet: string | null) =>
  rpc<{ prevenus?: number }>("reput_noter_sujet_secondaire", { p_demande: demande, p_sujet: sujet });

/* Les réglages par site (c3_17) : la vue au périmètre, régler un site, le ramener à l'organisation. */
export type ReglageSite = { entite_id: string; nom: string; type: string; principale: boolean; source: "organisation" | "propres";
  signature: string; ton: "vouvoiement" | "tutoiement"; formule_appel: string; formule_politesse: string };
export async function chargerSites(client: string): Promise<ReglageSite[]> {
  const { data, error } = await createClient().from("reput_reglages_sites")
    .select("entite_id, nom, type, principale, source, signature, ton, formule_appel, formule_politesse").eq("client_id", client).order("nom");
  if (error) throw new ErreurPorte(message(error));
  return (data ?? []) as ReglageSite[];
}
export const reglerSite = (client: string, entite: string, champs: Pick<ReglageSite, "signature" | "ton" | "formule_appel" | "formule_politesse">) =>
  rpc("reput_regler", { p_client: client, p_entite: entite, p_reglages: champs });
export const suivreOrganisation = (client: string, entite: string) => rpc("reput_suivre_organisation", { p_client: client, p_entite: entite });

/* L'export à date fixe (c3_19) : le programme, les fichiers fabriqués (sans leur contenu), puis un fichier à la demande. */
export type ProgrammeExport = { id: string; entite_id: string | null; frequence: "hebdomadaire" | "mensuel"; jour: number; actif: boolean };
export type ExportFait = { id: string; entite_id: string | null; periode_du: string; periode_au: string; lignes: number; nom_fichier: string; cree_le: string };
export async function chargerExports(client: string): Promise<{ programmes: ProgrammeExport[]; exports: ExportFait[] }> {
  const supabase = createClient();
  const [p, e] = await Promise.all([
    supabase.from("reput_exports_programmes").select("id, entite_id, frequence, jour, actif").eq("client_id", client),
    supabase.from("reput_exports").select("id, entite_id, periode_du, periode_au, lignes, nom_fichier, cree_le").eq("client_id", client)
      .order("cree_le", { ascending: false }).limit(24),
  ]);
  if (p.error) throw new ErreurPorte(message(p.error));
  if (e.error) throw new ErreurPorte(message(e.error));
  return { programmes: (p.data ?? []) as ProgrammeExport[], exports: (e.data ?? []) as ExportFait[] };
}
export async function contenuExport(id: string): Promise<string> {
  const { data, error } = await createClient().from("reput_exports").select("contenu").eq("id", id).single();
  if (error) throw new ErreurPorte(message(error));
  return (data as { contenu: string }).contenu;
}
export const programmerExport = (client: string, frequence: ProgrammeExport["frequence"], jour: number, actif: boolean) =>
  rpc("reput_programmer_export", { p_client: client, p_frequence: frequence, p_jour: jour, p_entite: null, p_destinataires: null, p_actif: actif });

/* Les rendez-vous côté base (c3_21) : types, créneaux libres, poser — sans agenda externe. */
export type TypeRdv = { code: string; libelle: string; duree_minutes: number; actif: boolean };
export type Creneau = { debut: string; fin: string };
export type Rdv = { id: string; type_code: string; debut: string; fin: string; statut: string; demande_id: string | null };
export async function chargerRdv(client: string, demande: string): Promise<{ types: TypeRdv[]; rdv: Rdv[] }> {
  const supabase = createClient();
  const [t, r] = await Promise.all([
    supabase.from("reput_rdv_types").select("code, libelle, duree_minutes, actif").eq("client_id", client).eq("actif", true).order("libelle"),
    supabase.from("reput_rdv").select("id, type_code, debut, fin, statut, demande_id").eq("demande_id", demande).order("debut"),
  ]);
  if (t.error) throw new ErreurPorte(message(t.error));
  if (r.error) throw new ErreurPorte(message(r.error));
  return { types: (t.data ?? []) as TypeRdv[], rdv: (r.data ?? []) as Rdv[] };
}
export const creneauxLibres = (client: string, entite: string | null, type: string) =>
  rpc<{ creneaux: Creneau[] }>("reput_creneaux_libres", { p_client: client, p_entite: entite, p_type: type, p_du: null, p_nombre: 6 });
export const poserRdv = (client: string, entite: string | null, type: string, debut: string, demande: string) =>
  rpc<{ pose: boolean; rdv?: string; motif?: string; suivants?: Creneau[] }>("reput_poser_rdv",
    { p_client: client, p_entite: entite, p_type: type, p_debut: debut, p_demande: demande, p_nom: null });
