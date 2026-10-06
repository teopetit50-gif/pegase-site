// Le travail « lecteur.media » : les photos et vocaux reçus sur le numéro WhatsApp professionnel (ou par courriel),
// rangés par la fonction reception (A2) sous <client>/receptions/<identifiant>/<nom>. Promesse de Daliro : un vocal
// du chef d'équipe ou une photo de chantier qui signale un travail en plus, un problème ou une question devient une
// demande, que le module transforme en avenant (origine vocal / photo, auteur, date, texte).
//
// Charge déposée par le module (Daliro, B6) : {reception, pieces: [{chemin, mime, nom?, vocal?}], texte?, de_nom?,
// contexte?, retour?}. Le lecteur transcrit les vocaux (media/transcription.ts), regarde les photos (Claude, vision),
// rend un résumé et des demandes citées ; une demande tirée d'un vocal ou du texte du message n'est « vérifiée » que
// si son extrait se retrouve dans la transcription ou le texte ; une demande tirée d'une photo reste à confirmer.
// La lecture est rendue au module par sa porte (retour, avec la clé de service) et toujours gardée dans le résultat
// du travail. Rien n'est inventé : un vocal sans service de transcription est dit « non transcrit ».

import { base64, type BlocContenu, type ClientClaude, coutEur } from "@partage/claude.ts";
import type { Depot } from "@partage/depot.ts";
import { ErreurOuvrier } from "@partage/erreurs.ts";
import { journal, messageDe } from "@partage/journal.ts";
import type { Portes, Travail } from "@partage/portes.ts";
import { retrouver } from "@partage/texte.ts";
import { detecter } from "../detecter.ts";
import { LIMITE_IMAGE_OCTETS } from "../ia.ts";
import { controlerPlafond } from "../plafond.ts";
import type { Transcripteur } from "./transcription.ts";

export const GENRE_MEDIA = "lecteur.media";
export const MAX_MEDIAS = 6;
export const LIMITE_AUDIO_OCTETS = 25_000_000;
export const NATURES_DEMANDE = ["travail_supplementaire", "probleme", "question", "information", "avancement"] as const;

export interface PieceMedia {
  chemin: string;
  mime: string;
  nom?: string;
  vocal?: boolean;
}

export interface ChargeMedia {
  reception: string | number;
  pieces: PieceMedia[];
  texte?: string;
  de_nom?: string;
  contexte?: string;
  retour?: string;
}

export interface MediaLu {
  n: number;
  chemin: string;
  nature: "vocal" | "photo" | "autre";
  statut: "lu" | "non_transcrit" | "absent" | "trop_lourd" | "ignore";
  transcription?: string;
  duree_s?: number;
}

export interface Demande {
  nature: (typeof NATURES_DEMANDE)[number];
  texte: string;
  quantite?: number;
  unite?: string;
  lieu?: string;
  /** Avancement (b6_25) : l'ouvrage vu ou dit, le code du lot s'il est dit, le pourcentage fait (0 à 100). */
  ouvrage?: string;
  lot_code?: string;
  pourcentage?: number;
  /** D'où elle vient : 0 = le texte du message, n ≥ 1 = le média n. */
  source: { media: number; extrait: string };
  verifiee: boolean;
  controle: string;
}

export interface LectureMedia {
  reception: string | number;
  de_nom?: string;
  medias: MediaLu[];
  resume: string;
  demandes: Demande[];
  cout_eur: number;
  appels_ia: number;
  modele: string | null;
  version: string;
}

export interface ContexteMedia {
  portes: Pick<Portes, "finirTravail" | "echouerTravail" | "consommationIaDuJour" | "lireParametre">;
  depot: Depot;
  claude: ClientClaude | null;
  transcripteur: Transcripteur | null;
  env: { get(n: string): string | undefined };
  maintenant: () => Date;
  /** Rend la lecture au module (porte retour, clé de service) ; absent = gardée dans le résultat du travail seulement. */
  rendre?: (porte: string, reception: string | number, lecture: LectureMedia) => Promise<unknown>;
}

const PORTE = /^[a-z][a-z0-9_]{2,62}$/;

/** La charge, validée : chemins sous <client>/receptions/, au plus MAX_MEDIAS pièces, porte de retour bien nommée. */
export function chargeMedia(travail: Travail): ChargeMedia | string {
  const c = travail.charge as Partial<ChargeMedia> | null;
  if (!c || (typeof c.reception !== "string" && typeof c.reception !== "number")) return "charge sans réception";
  const prefixe = `${travail.client_id}/receptions/`;
  const pieces = (Array.isArray(c.pieces) ? c.pieces : []).filter((p): p is PieceMedia =>
    !!p && typeof p.chemin === "string" && typeof p.mime === "string"
  );
  if (pieces.some((p) => !p.chemin.startsWith(prefixe) || p.chemin.includes(".."))) return "pièce hors des réceptions de ce client";
  if (c.retour !== undefined && (typeof c.retour !== "string" || !PORTE.test(c.retour))) return "porte de retour mal nommée";
  return {
    reception: c.reception,
    pieces: pieces.slice(0, MAX_MEDIAS),
    texte: typeof c.texte === "string" ? c.texte.slice(0, 4000) : undefined,
    de_nom: typeof c.de_nom === "string" ? c.de_nom.slice(0, 200) : undefined,
    contexte: typeof c.contexte === "string" ? c.contexte.slice(0, 2000) : undefined,
    retour: c.retour,
  };
}

const CONSIGNE = `Tu es le lecteur d'Omega pour une entreprise du bâtiment. Tu reçois un message envoyé sur le numéro WhatsApp professionnel (ou par courriel) par un client, un chef d'équipe ou un ouvrier : son texte, la transcription de ses vocaux, ses photos.
Tu rends l'outil lire_media :
1. resume : ce que dit le message, en une ou deux phrases neutres, sans rien ajouter.
2. demandes : chaque chose à traiter, une par ligne — travail_supplementaire (un ouvrage demandé en plus du marché : « il veut aussi des garde-corps au R+3 »), probleme (un dommage, un retard, un manque, un défaut visible), question, information utile au chantier, avancement (où en est un ouvrage : « les cloisons du R+1 sont finies », une photo qui montre un ouvrage posé — ouvrage, lot_code s'il est dit, pourcentage fait de 0 à 100 seulement s'il est dit ou évident). Pour chacune : texte (court, factuel), quantite et unite si elles sont dites (« douze mètres » → 12, ml), lieu si dit, et source : media = 0 pour le texte du message, sinon le numéro du média (1, 2…), extrait = les mots EXACTS de la transcription ou du texte qui la portent (pour une photo : ce qu'on y voit, en quelques mots).
3. N'invente rien : pas de demande sans source ; un vocal marqué « non transcrit » ne se devine pas ; une photo ne prouve qu'elle-même.`;

const SCHEMA_OUTIL = {
  type: "object",
  properties: {
    resume: { type: "string" },
    demandes: {
      type: "array",
      items: {
        type: "object",
        properties: {
          nature: { type: "string", enum: [...NATURES_DEMANDE] },
          texte: { type: "string" },
          quantite: { type: "number" },
          unite: { type: "string" },
          lieu: { type: "string" },
          ouvrage: { type: "string" },
          lot_code: { type: "string" },
          pourcentage: { type: "number" },
          source: { type: "object", properties: { media: { type: "integer" }, extrait: { type: "string" } }, required: ["media", "extrait"] },
        },
        required: ["nature", "texte", "source"],
      },
    },
  },
  required: ["resume", "demandes"],
};

function natureDe(p: PieceMedia): "vocal" | "photo" | "autre" {
  const m = p.mime.toLowerCase();
  if (m.startsWith("audio/")) return "vocal";
  if (m.startsWith("image/")) return "photo";
  return "autre";
}

export function versionMedia(maintenant: Date, modele: string | null): string {
  const court = (modele ?? "sans-ia").replace(/^(eu|us|global)\./, "").replace(/^anthropic\./, "").replace(/-\d{8}-v\d+:\d+$/, "");
  return `media/${maintenant.toISOString().slice(0, 10)}/${court}`.slice(0, 40);
}

/** Les demandes rendues par le modèle, vérifiées contre les textes (message, transcriptions). */
export function verifierDemandes(brut: unknown, textes: Map<number, string>, photos: Set<number>): Demande[] {
  const liste = Array.isArray((brut as { demandes?: unknown })?.demandes) ? (brut as { demandes: unknown[] }).demandes : [];
  const demandes: Demande[] = [];
  for (const d of liste.slice(0, 30)) {
    if (!d || typeof d !== "object") continue;
    const x = d as Record<string, unknown>;
    const nature = NATURES_DEMANDE.find((n) => n === x.nature);
    const texte = typeof x.texte === "string" ? x.texte.trim().slice(0, 500) : "";
    const src = (x.source ?? {}) as { media?: unknown; extrait?: unknown };
    const media = Number.isInteger(src.media) ? (src.media as number) : -1;
    const extrait = typeof src.extrait === "string" ? src.extrait.trim().slice(0, 500) : "";
    if (!nature || texte === "" || extrait === "") continue;
    if (nature === "avancement" && !(typeof x.ouvrage === "string" && x.ouvrage.trim())) continue;
    let verifiee = false;
    let controle: string;
    if (textes.has(media)) {
      verifiee = retrouver(extrait, textes.get(media)!).trouve;
      controle = verifiee
        ? (media === 0 ? "extrait retrouvé dans le texte du message" : `extrait retrouvé dans la transcription du média ${media}`)
        : (media === 0 ? "extrait introuvable dans le texte du message" : `extrait introuvable dans la transcription du média ${media}`);
    } else if (photos.has(media)) {
      controle = `vu sur la photo ${media} : à confirmer`;
    } else {
      controle = "source inconnue";
      continue;
    }
    const q = typeof x.quantite === "number" && Number.isFinite(x.quantite) && x.quantite >= 0 ? x.quantite : undefined;
    demandes.push({
      nature,
      texte,
      ...(q !== undefined ? { quantite: q } : {}),
      ...(typeof x.unite === "string" && x.unite.trim() ? { unite: x.unite.trim().slice(0, 20) } : {}),
      ...(typeof x.lieu === "string" && x.lieu.trim() ? { lieu: x.lieu.trim().slice(0, 200) } : {}),
      ...(typeof x.ouvrage === "string" && x.ouvrage.trim() ? { ouvrage: x.ouvrage.trim().slice(0, 200) } : {}),
      ...(typeof x.lot_code === "string" && x.lot_code.trim() ? { lot_code: x.lot_code.trim().slice(0, 20) } : {}),
      ...(typeof x.pourcentage === "number" && Number.isFinite(x.pourcentage) && x.pourcentage >= 0 && x.pourcentage <= 100
        ? { pourcentage: Math.round(x.pourcentage * 10) / 10 }
        : {}),
      source: { media, extrait },
      verifiee,
      controle,
    });
  }
  return demandes;
}

export async function lireMedia(ctx: ContexteMedia, travail: Travail): Promise<"lu" | "ignore" | "repris" | "abandon" | "erreur"> {
  const trace = { travail: travail.id, client: travail.client_id };
  try {
    const c = chargeMedia(travail);
    if (typeof c === "string") {
      await ctx.portes.finirTravail(travail.id, { ignore: c });
      return "ignore";
    }
    const client = travail.client_id ?? "";
    const medias: MediaLu[] = [];
    const textes = new Map<number, string>();
    const photos = new Set<number>();
    const images: BlocContenu[] = [];
    let coutTranscription = 0;
    if (c.texte && c.texte.trim()) textes.set(0, c.texte.trim());

    for (const [i, p] of c.pieces.entries()) {
      const n = i + 1;
      const nature = natureDe(p);
      if (nature === "autre") {
        medias.push({ n, chemin: p.chemin, nature, statut: "ignore" });
        continue;
      }
      if (nature === "vocal" && !ctx.transcripteur) {
        medias.push({ n, chemin: p.chemin, nature, statut: "non_transcrit" });
        continue;
      }
      const t = await ctx.depot.telecharger(p.chemin);
      if (!t.present) {
        medias.push({ n, chemin: p.chemin, nature, statut: "absent" });
        continue;
      }
      if (nature === "vocal") {
        if (t.octets.length > LIMITE_AUDIO_OCTETS) {
          medias.push({ n, chemin: p.chemin, nature, statut: "trop_lourd" });
          continue;
        }
        const tr = await ctx.transcripteur!.transcrire(t.octets, p.mime, p.nom ?? "vocal.ogg");
        coutTranscription += tr.cout_eur;
        medias.push({ n, chemin: p.chemin, nature, statut: "lu", transcription: tr.texte.slice(0, 20_000), duree_s: tr.duree_s });
        if (tr.texte.trim()) textes.set(n, tr.texte);
      } else {
        const det = detecter(t.octets, p.mime, p.nom ?? p.chemin);
        if (det.famille !== "image" || !det.formatImage || t.octets.length > LIMITE_IMAGE_OCTETS) {
          medias.push({ n, chemin: p.chemin, nature, statut: t.octets.length > LIMITE_IMAGE_OCTETS ? "trop_lourd" : "ignore" });
          continue;
        }
        images.push({ text: `Photo ${n} :` });
        images.push({ image: { format: det.formatImage === "jpeg" ? "jpeg" : det.formatImage, source: { bytes: base64(t.octets) } } });
        photos.add(n);
        medias.push({ n, chemin: p.chemin, nature, statut: "lu" });
      }
    }

    const version = versionMedia(ctx.maintenant(), ctx.claude?.modele ?? null);
    let lecture: LectureMedia;
    if (textes.size === 0 && photos.size === 0) {
      lecture = { reception: c.reception, de_nom: c.de_nom, medias, resume: "", demandes: [], cout_eur: coutTranscription, appels_ia: 0, modele: null, version };
    } else {
      if (!ctx.claude) throw new ErreurOuvrier("IA_NON_BRANCHEE", "aucune IA branchée pour lire les photos et vocaux", true);
      const estimation = coutEur(ctx.claude.prix, { tokens_entree: 2000 + photos.size * 1600 + [...textes.values()].join("").length / 3.5, tokens_sortie: 1500 });
      await controlerPlafond(ctx.portes as Portes, ctx.env, client, estimation);
      const lignes = [
        c.de_nom ? `De : ${c.de_nom}` : "",
        c.contexte ? `Contexte connu : ${c.contexte}` : "",
        textes.has(0) ? `Texte du message (média 0) :\n${textes.get(0)}` : "Pas de texte dans le message.",
        ...medias.filter((m) => m.nature === "vocal").map((m) =>
          m.statut === "lu" ? `Vocal ${m.n} (transcription) :\n${m.transcription || "(vide)"}` : `Vocal ${m.n} : non transcrit.`
        ),
        photos.size > 0 ? `Photos : ${[...photos].join(", ")} (ci-dessus).` : "",
      ].filter((l) => l !== "");
      const rep = await ctx.claude.converse({
        system: CONSIGNE,
        contenu: [...images, { text: lignes.join("\n\n") }],
        outil: { name: "lire_media", description: "Rend le résumé du message et ses demandes, chacune citée.", schema: SCHEMA_OUTIL },
        maxTokens: 4000,
      });
      const resume = typeof (rep.entree as { resume?: unknown })?.resume === "string" ? ((rep.entree as { resume: string }).resume).slice(0, 1000) : "";
      lecture = {
        reception: c.reception,
        de_nom: c.de_nom,
        medias,
        resume,
        demandes: verifierDemandes(rep.entree, textes, photos),
        cout_eur: Math.round((coutTranscription + coutEur(ctx.claude.prix, rep.usage)) * 1e6) / 1e6,
        appels_ia: 1,
        modele: ctx.claude.modele,
        version,
      };
    }

    // Rendre au module ; un échec ne défait pas la lecture, gardée dans le résultat du travail.
    let retour: "pose" | "sans_porte" | "erreur" = "sans_porte";
    let retourErreur: string | undefined;
    if (c.retour && ctx.rendre) {
      try {
        await ctx.rendre(c.retour, c.reception, lecture);
        retour = "pose";
      } catch (e) {
        retour = "erreur";
        retourErreur = (e instanceof ErreurOuvrier ? `${e.code} : ` : "") + messageDe(e, 200);
        journal("alerte", "photos et vocaux lus mais non rendus au module : lecture gardée dans le résultat", { ...trace, porte: c.retour });
      }
    }
    await ctx.portes.finirTravail(travail.id, { lecture, retour, ...(retourErreur ? { retour_erreur: retourErreur } : {}) });
    journal("info", "photos et vocaux lus", { ...trace, medias: medias.length, demandes: lecture.demandes.length, cout_eur: lecture.cout_eur, retour });
    return "lu";
  } catch (e) {
    const erreur = e instanceof ErreurOuvrier ? e : new ErreurOuvrier("ERREUR_INTERNE", messageDe(e), true);
    journal(erreur.code === "ERREUR_INTERNE" ? "erreur" : "alerte", `lecture des médias interrompue : ${erreur.code}`, { ...trace, motif: erreur.message.slice(0, 300) });
    try {
      return (await ctx.portes.echouerTravail(travail.id, erreur.motif, erreur.reprendre)) === "repris" ? "repris" : "abandon";
    } catch {
      return "erreur";
    }
  }
}
