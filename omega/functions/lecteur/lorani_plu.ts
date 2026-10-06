// Lorani (B5, b5_17) : la zone PLU du terrain est connue avant la lecture du règlement (public.lorani_plu, une ligne
// par projet, trouvée au Géoportail de l'urbanisme). Un règlement de PLUi couvre toutes les zones : le modèle reçoit
// la zone du terrain et ne rend que ses règles ; une zone lue qui n'est pas celle du terrain envoie la pièce « à vérifier ».
// Sans ligne lorani_plu (ou si la base ne répond pas), rien ne change : la zone se lit sur la pièce.

import type { ConfigSupabase, Piece, ResultatLecture } from "@partage/portes.ts";
import { journal, messageDe } from "@partage/journal.ts";

export interface SourcePlu {
  /** Les zones du terrain du projet (la principale d'abord), ou null si la base n'en sait rien. */
  zonesDuProjet(client: string, projet: string): Promise<string[] | null>;
}

/** Lecture de public.lorani_plu par PostgREST, avec la clé de service (aucune porte n'est nécessaire). */
export class SourcePluRest implements SourcePlu {
  constructor(private readonly cfg: ConfigSupabase, private readonly fetchFn: typeof fetch = fetch) {}
  async zonesDuProjet(client: string, projet: string): Promise<string[] | null> {
    const url = `${this.cfg.url}/rest/v1/lorani_plu?select=zone,zones&client_id=eq.${encodeURIComponent(client)}&projet_id=eq.${encodeURIComponent(projet)}&limit=1`;
    const rep = await this.fetchFn(url, { headers: { apikey: this.cfg.cleService, Authorization: `Bearer ${this.cfg.cleService}` } });
    if (!rep.ok) {
      await rep.body?.cancel();
      return null;
    }
    const lignes = await rep.json() as { zone?: string | null; zones?: unknown }[];
    return lignes.length > 0 ? zonesDe(lignes[0]) : null;
  }
}

/** zone (la principale) puis les libellés de zones [{libelle, …}], sans doublon. */
export function zonesDe(l: { zone?: string | null; zones?: unknown }): string[] | null {
  const toutes: string[] = [];
  if (typeof l.zone === "string" && l.zone.trim() !== "") toutes.push(l.zone.trim());
  if (Array.isArray(l.zones)) {
    for (const z of l.zones) {
      const libelle = typeof z === "string" ? z : z && typeof z === "object" ? (z as { libelle?: unknown }).libelle : null;
      if (typeof libelle === "string" && libelle.trim() !== "") toutes.push(libelle.trim());
    }
  }
  const uniques = [...new Map(toutes.map((z) => [normaliserZone(z), z])).values()];
  return uniques.length > 0 ? uniques : null;
}

export function normaliserZone(z: string): string {
  return z.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[\s.\-_]/g, "").toUpperCase();
}

/** L'indication donnée au modèle pour une pièce d'un projet dont la zone est connue. */
export function indicationPlu(zones: string[]): string {
  const liste = zones.map((z) => `« ${z} »`).join(", ");
  return zones.length === 1
    ? `le terrain du projet est en zone ${liste} du PLU. Si ce document est un règlement de PLU ou de PLUi qui couvre plusieurs zones, ne rends que les règles de la zone ${liste}, et zone = ${liste}.`
    : `le terrain du projet touche les zones ${liste} du PLU. Si ce document est un règlement de PLU ou de PLUi qui couvre plusieurs zones, ne rends que les règles de la zone ${zones[0] ? `« ${zones[0]} »` : ""} (la principale), et zone = cette zone.`;
}

/** Les zones connues pour une pièce Lorani rattachée à un projet ; null sinon, ou si la base ne répond pas. */
export async function zonesPourPiece(source: SourcePlu | null | undefined, piece: Pick<Piece, "id" | "client_id" | "module" | "objet_type" | "objet_id">): Promise<string[] | null> {
  if (!source || piece.module !== "lorani" || piece.objet_type !== "lorani_projet" || !piece.objet_id) return null;
  try {
    return await source.zonesDuProjet(piece.client_id, piece.objet_id);
  } catch (e) {
    journal("alerte", "zone PLU du projet illisible : le règlement se lit sans elle", { piece: piece.id, erreur: messageDe(e, 200) });
    return null;
  }
}

/** Un règlement dont la zone lue n'est pas une zone du terrain : la pièce part « à vérifier », motif dit. */
export function controlerZone(r: ResultatLecture, zones: string[] | null): ResultatLecture {
  if (!zones || r.type_piece !== "lorani_plu_reglement" || !["lue", "a_verifier"].includes(r.statut)) return r;
  const lue = r.valeurs.find((v) => v.champ === "zone" && typeof v.valeur === "string");
  if (!lue) return r;
  const connues = new Set(zones.map(normaliserZone));
  if (connues.has(normaliserZone(lue.valeur as string))) return r;
  const motif = `Zone lue « ${lue.valeur} » : le terrain est en ${zones.map((z) => `« ${z} »`).join(", ")} ; les règles rendues sont à vérifier.`;
  return { ...r, statut: "a_verifier", motif: (r.motif ? `${r.motif} ${motif}` : motif).slice(0, 500) };
}

// ─── Les objets déjà nommés par les pièces sœurs du même contrôle (porte lorani_objets_controle de B5) ───
// Deux pièces qui mesurent la même chose doivent rendre le même <objet> : c'est la clé du croisement. Le modèle
// reçoit donc les objets déjà rendus par les autres pièces du contrôle. Porte absente (pas encore posée) : rien.

export interface SourceObjets {
  /** Les {grandeur, objet} déjà rendus par les autres pièces du même contrôle ; null si la porte n'existe pas. */
  objetsSoeurs(piece: string): Promise<{ grandeur: string; objet: string }[] | null>;
}

export class SourceObjetsRpc implements SourceObjets {
  constructor(private readonly cfg: ConfigSupabase, private readonly fetchFn: typeof fetch = fetch) {}
  async objetsSoeurs(piece: string) {
    const rep = await this.fetchFn(`${this.cfg.url}/rest/v1/rpc/lorani_objets_controle`, {
      method: "POST",
      headers: { apikey: this.cfg.cleService, Authorization: `Bearer ${this.cfg.cleService}`, "Content-Type": "application/json" },
      body: JSON.stringify({ p_piece: piece }),
    });
    if (!rep.ok) {
      await rep.body?.cancel();
      return null;
    }
    const l = await rep.json();
    return Array.isArray(l)
      ? l.filter((x) => x && typeof x.grandeur === "string" && typeof x.objet === "string").slice(0, 200).map((x) => ({ grandeur: x.grandeur, objet: x.objet }))
      : null;
  }
}

export async function objetsPourPiece(source: SourceObjets | null | undefined, piece: Pick<Piece, "id" | "module" | "objet_type">): Promise<{ grandeur: string; objet: string }[] | null> {
  if (!source || piece.module !== "lorani" || piece.objet_type !== "lorani_projet") return null;
  try {
    const l = await source.objetsSoeurs(piece.id);
    return l && l.length > 0 ? l : null;
  } catch (e) {
    journal("alerte", "objets du contrôle illisibles : la pièce se lit sans eux", { piece: piece.id, erreur: messageDe(e, 200) });
    return null;
  }
}

export function indicationObjets(objets: { grandeur: string; objet: string }[]): string {
  const parGrandeur = new Map<string, Set<string>>();
  for (const o of objets) parGrandeur.set(o.grandeur, (parGrandeur.get(o.grandeur) ?? new Set()).add(o.objet));
  const liste = [...parGrandeur].map(([g, os]) => `${g} : ${[...os].join(", ")}`).join(" ; ");
  return `les autres pièces de ce contrôle ont déjà nommé ces objets (grandeur : objets) — ${liste}. Quand ta mesure porte sur la même chose, reprends exactement le même objet.`;
}
