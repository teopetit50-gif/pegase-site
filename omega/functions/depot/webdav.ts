// Dépôt par lot (FILED) : un « dossier réseau » WebDAV servi par la fonction Edge `depot` (verify_jwt false,
// authentification Basic par dépôt, en HTTPS seulement). Le cabinet le monte comme un lecteur dans l'Explorateur
// Windows ou le Finder, ou l'alimente par WinSCP, rclone ou Cyberduck (dépôts planifiés). Chaque fichier déposé
// devient une pièce FILED (filed_deposer_piece, source « connecteur ») : numéro de réception, doublon reconnu à
// l'empreinte, lecture par le socle.
//
// Ce que le dépôt accepte : PDF, PNG, JPEG, TIFF, WebP, HEIC, XML (Factur-X, UBL, CII), 25 Mo au plus par fichier,
// des sous-dossiers (un lot glissé tel quel). Il ne rend jamais un fichier (pas de GET) et n'efface rien (pas de
// DELETE) : ce qui est déposé est reçu, comme un courrier. Il montre ce qui a été déposé depuis 30 jours.
//
// Compatibilité (RFC 4918, et les habitudes des clients) :
//   · l'Explorateur Windows crée d'abord un fichier vide (PUT de 0 octet), le verrouille (LOCK), envoie le contenu,
//     pose ses dates (PROPPATCH) et déverrouille : le fichier vide est « réservé », pas importé ;
//   · « Nouveau dossier » puis renommage : MOVE d'un dossier vide ;
//   · le Finder dépose ._*, .DS_Store ; Windows Thumbs.db, desktop.ini ; Office ~$… : acceptés et ignorés ;
//   · les verrous sont fictifs (un seul déposant à la fois par fichier n'a pas de sens ici) mais bien formés.

import { nomSur, sha256Hex, type Stockage } from "../reception/commun.ts";
import type { DepotOuvert, Element, Portes } from "./portes.ts";

export const TAILLE_MAX = 25 * 1024 * 1024;

export const TYPES: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  tif: "image/tiff",
  tiff: "image/tiff",
  webp: "image/webp",
  heic: "image/heic",
  xml: "application/xml",
};

const IGNORES = /^(\..*|thumbs\.db|desktop\.ini|~\$.*|.*\.tmp)$/i;

export type Journal = {
  info(message: string, detail?: Record<string, unknown>): void;
  erreur(message: string, detail?: Record<string, unknown>): void;
};

export type Dependances = {
  portes: Portes;
  stockage: Stockage;
  /** Chemin public de la fonction, sans barre finale : /functions/v1/depot */
  base: string;
  journal: Journal;
  maintenant?: () => Date;
};

class Refus extends Error {
  constructor(public readonly statut: number, message: string) {
    super(message);
  }
}

const XML_ENTETE = '<?xml version="1.0" encoding="utf-8"?>';

function echapper(v: string): string {
  return v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function texte(
  statut: number,
  message: string,
  entetes: Record<string, string> = {},
): Response {
  return new Response(message ? message + "\n" : null, {
    status: statut,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      ...entetes,
    },
  });
}

function xml(
  statut: number,
  corps: string,
  entetes: Record<string, string> = {},
): Response {
  return new Response(XML_ENTETE + corps, {
    status: statut,
    headers: {
      "Content-Type": 'application/xml; charset="utf-8"',
      "Cache-Control": "no-store",
      ...entetes,
    },
  });
}

/** Chemin relatif au dépôt (« » pour la racine), segments décodés et vérifiés. */
export function cheminRelatif(pathname: string): string[] {
  // Le chemin doit passer par /depot : un « .. » encodé que l'analyseur d'URL a déjà résolu en sort, il est refusé.
  const m = pathname.match(/^.*?\/depot(\/.*)?$/);
  if (!m) throw new Refus(400, "Chemin hors du dépôt.");
  const rel = m[1] ?? "";
  const segments = rel.split("/").filter((s) => s !== "");
  if (segments.length > 6) {
    throw new Refus(403, "Pas plus de six niveaux de dossiers.");
  }
  return segments.map((s) => {
    let d: string;
    try {
      d = decodeURIComponent(s);
    } catch {
      throw new Refus(400, "Chemin illisible.");
    }
    const controle = [...d].some((c) =>
      c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127
    );
    if (
      d === "." || d === ".." || controle || d.includes("\\") || d.length > 200
    ) {
      throw new Refus(400, "Nom de fichier ou de dossier refusé.");
    }
    return d;
  });
}

function extension(nom: string): string {
  return (nom.match(/\.([A-Za-z0-9]+)$/)?.[1] ?? "").toLowerCase();
}

async function lireCorps(
  req: Request,
  max: number,
): Promise<Uint8Array<ArrayBuffer>> {
  const annonce = Number(req.headers.get("content-length") ?? "");
  if (Number.isFinite(annonce) && annonce > max) {
    await req.body?.cancel();
    throw new Refus(
      413,
      `Fichier trop gros : ${Math.round(max / 1024 / 1024)} Mo au plus.`,
    );
  }
  if (!req.body) return new Uint8Array(0);
  const morceaux: Uint8Array[] = [];
  let total = 0;
  const lecteur = req.body.getReader();
  while (true) {
    const { done, value } = await lecteur.read();
    if (done) break;
    total += value.length;
    if (total > max) {
      await lecteur.cancel();
      throw new Refus(
        413,
        `Fichier trop gros : ${Math.round(max / 1024 / 1024)} Mo au plus.`,
      );
    }
    morceaux.push(value);
  }
  const tout = new Uint8Array(total);
  let pos = 0;
  for (const m of morceaux) {
    tout.set(m, pos);
    pos += m.length;
  }
  return tout;
}

type Noeud = {
  chemin: string;
  dossier: boolean;
  octets: number;
  date: string;
  etat: string;
  reference: string | null;
};

/** Les dossiers et fichiers connus, dossiers implicites compris (un fichier « a/b.pdf » fait exister « a »). */
function arbre(elements: Element[]): Map<string, Noeud> {
  const m = new Map<string, Noeud>();
  for (const e of elements) {
    const parties = e.chemin.split("/");
    for (let i = 1; i < parties.length; i++) {
      const d = parties.slice(0, i).join("/");
      if (!m.has(d)) {
        m.set(d, {
          chemin: d,
          dossier: true,
          octets: 0,
          date: e.recu_le,
          etat: "dossier",
          reference: null,
        });
      }
    }
    m.set(e.chemin, {
      chemin: e.chemin,
      dossier: e.dossier,
      octets: e.octets,
      date: e.recu_le,
      etat: e.etat,
      reference: e.reference,
    });
  }
  return m;
}

export function creerDepot(
  deps: Dependances,
): (req: Request) => Promise<Response> {
  const base = deps.base.replace(/\/+$/, "");
  const ouverts = new Map<string, { depot: DepotOuvert; jusqu_a: number }>();
  const maintenant = () => deps.maintenant?.() ?? new Date();

  const href = (segments: string[], dossier: boolean) =>
    base + "/" + segments.map(encodeURIComponent).join("/") +
    (dossier && segments.length ? "/" : "");

  async function authentifier(req: Request): Promise<DepotOuvert | null> {
    const a = req.headers.get("authorization") ?? "";
    if (!/^Basic\s+/i.test(a)) return null;
    const cle = await sha256Hex(a);
    const t = Date.now();
    const deja = ouverts.get(cle);
    if (deja && deja.jusqu_a > t) return deja.depot;
    let decode: string;
    try {
      decode = new TextDecoder().decode(
        Uint8Array.from(
          atob(a.replace(/^Basic\s+/i, "").trim()),
          (c) => c.charCodeAt(0),
        ),
      );
    } catch {
      return null;
    }
    const i = decode.indexOf(":");
    if (i <= 0) return null;
    const identifiant = decode.slice(0, i).trim().toLowerCase();
    const motDePasse = decode.slice(i + 1);
    if (
      !/^depot-[a-z0-9]{6,40}$/.test(identifiant) || motDePasse.length < 16 ||
      motDePasse.length > 200
    ) return null;
    const ip =
      (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || null;
    const d = await deps.portes.ouvrir(
      identifiant,
      await sha256Hex(motDePasse),
      ip,
    );
    if (d) {
      if (ouverts.size > 500) ouverts.clear();
      ouverts.set(cle, { depot: d, jusqu_a: t + 60_000 });
    }
    return d;
  }

  function reponse(segments: string[], n: Noeud | null): string {
    const dossier = n === null || n.dossier;
    const nom = segments.length ? segments[segments.length - 1] : "Dépôt Omega";
    const date = new Date(n?.date ?? maintenant().toISOString());
    const type = dossier
      ? ""
      : TYPES[extension(nom)] ?? "application/octet-stream";
    return `<D:response><D:href>${
      echapper(href(segments, dossier))
    }</D:href><D:propstat><D:prop>` +
      `<D:displayname>${echapper(nom)}</D:displayname>` +
      (dossier
        ? "<D:resourcetype><D:collection/></D:resourcetype>"
        : "<D:resourcetype/>") +
      (dossier
        ? ""
        : `<D:getcontentlength>${n?.octets ?? 0}</D:getcontentlength>`) +
      (dossier ? "" : `<D:getcontenttype>${type}</D:getcontenttype>`) +
      `<D:getlastmodified>${date.toUTCString()}</D:getlastmodified>` +
      `<D:creationdate>${date.toISOString()}</D:creationdate>` +
      (dossier ? "" : `<D:getetag>"${
        echapper(
          (n?.etat ?? "") + "-" + (n?.octets ?? 0) + "-" + date.getTime(),
        )
      }"</D:getetag>`) +
      `<D:supportedlock><D:lockentry><D:lockscope><D:exclusive/></D:lockscope><D:locktype><D:write/></D:locktype></D:lockentry></D:supportedlock>` +
      `</D:prop><D:status>HTTP/1.1 200 OK</D:status></D:propstat></D:response>`;
  }

  async function propfind(
    req: Request,
    depot: DepotOuvert,
    segments: string[],
  ): Promise<Response> {
    await req.body?.cancel();
    const noeuds = arbre(await deps.portes.lister(depot.depot));
    const chemin = segments.join("/");
    const ici = chemin === "" ? null : noeuds.get(chemin);
    if (chemin !== "" && !ici) return texte(404, "Introuvable.");
    const profondeur = (req.headers.get("depth") ?? "infinity").trim();
    const parties = [reponse(segments, ici ?? null)];
    if ((ici === null || ici?.dossier) && profondeur !== "0") {
      for (const n of noeuds.values()) {
        const parent = n.chemin.includes("/")
          ? n.chemin.slice(0, n.chemin.lastIndexOf("/"))
          : "";
        if (parent === chemin) parties.push(reponse(n.chemin.split("/"), n));
      }
    }
    return xml(
      207,
      `<D:multistatus xmlns:D="DAV:">${parties.join("")}</D:multistatus>`,
    );
  }

  async function put(
    req: Request,
    depot: DepotOuvert,
    segments: string[],
  ): Promise<Response> {
    if (!segments.length) {
      await req.body?.cancel();
      return texte(
        405,
        "Déposez des fichiers dans le dossier, pas à sa place.",
      );
    }
    const chemin = segments.join("/");
    const nom = segments[segments.length - 1];
    const existant = arbre(await deps.portes.lister(depot.depot)).get(chemin);
    if (existant?.dossier) {
      await req.body?.cancel();
      return texte(409, "Un dossier porte déjà ce nom.");
    }
    const code = existant ? 204 : 201;
    if (IGNORES.test(nom)) {
      const o = await lireCorps(req, TAILLE_MAX);
      await deps.portes.noter(depot.depot, {
        chemin,
        dossier: false,
        octets: o.length,
        sha256: null,
        etat: "ignore",
        document: null,
        reference: null,
        motif: "fichier système, ignoré",
      });
      return new Response(null, { status: code });
    }
    const octets = await lireCorps(req, TAILLE_MAX);
    if (octets.length === 0) {
      // L'Explorateur réserve le nom avant d'envoyer le contenu : rien à importer.
      if (!existant || existant.etat === "vide") {
        await deps.portes.noter(depot.depot, {
          chemin,
          dossier: false,
          octets: 0,
          sha256: null,
          etat: "vide",
          document: null,
          reference: null,
          motif: null,
        });
      }
      return new Response(null, { status: code });
    }
    const mime = TYPES[extension(nom)];
    if (!mime) {
      await deps.portes.noter(depot.depot, {
        chemin,
        dossier: false,
        octets: octets.length,
        sha256: null,
        etat: "refuse",
        document: null,
        reference: null,
        motif: "type de fichier non accepté",
      });
      return texte(
        415,
        "Type de fichier non accepté : PDF, PNG, JPEG, TIFF, WebP, HEIC ou XML (Factur-X, UBL, CII).",
      );
    }
    if (depot.module !== "filed") {
      return texte(
        501,
        `Le dépôt par lot n'est pas encore branché pour le module ${depot.module}.`,
      );
    }
    const empreinte = await sha256Hex(octets);
    const document = crypto.randomUUID();
    const cheminStockage = `${depot.client_id}/filed_document/${document}/${
      nomSur(nom, "piece." + extension(nom))
    }`;
    await deps.stockage.deposer(cheminStockage, octets, mime);
    let r: { document: string; reference: string | null; etat: string };
    try {
      r = await deps.portes.deposerFiled({
        depot: depot.depot,
        client: depot.client_id,
        entite: depot.entite_id,
        document,
        nom: nomSur(nom, "piece"),
        mime,
        octets: octets.length,
        sha256: empreinte,
        chemin: cheminStockage,
        expediteur: `Dépôt « ${depot.libelle} » : ${chemin}`.slice(0, 300),
      });
    } catch (e) {
      const message = String((e as Error)?.message ?? e);
      deps.journal.erreur("dépôt FILED refusé", {
        depot: depot.depot,
        erreur: message.slice(0, 300),
      });
      await deps.portes.noter(depot.depot, {
        chemin,
        dossier: false,
        octets: octets.length,
        sha256: empreinte,
        etat: "refuse",
        document: null,
        reference: null,
        motif: message.slice(0, 300),
      }).catch(() => {});
      if (/55000|n'est pas installé/.test(message)) {
        return texte(
          409,
          "FILED n'est pas installé pour cette organisation : le fichier n'a pas été reçu.",
        );
      }
      return texte(
        503,
        "Le fichier n'a pas pu être enregistré. Réessayez dans un instant.",
        { "Retry-After": "60" },
      );
    }
    await deps.portes.noter(depot.depot, {
      chemin,
      dossier: false,
      octets: octets.length,
      sha256: empreinte,
      etat: r.etat === "doublon" ? "doublon" : "importe",
      document: r.document,
      reference: r.reference,
      motif: null,
    });
    deps.journal.info("pièce déposée", {
      depot: depot.depot,
      reference: r.reference,
      etat: r.etat,
    });
    return new Response(null, { status: code });
  }

  async function lock(segments: string[], req: Request): Promise<Response> {
    const corps = await req.text();
    const jeton = `opaquelocktoken:${crypto.randomUUID()}`;
    // Le propriétaire est rendu en texte seul (pas de balisage recopié du client).
    const owner =
      (corps.match(/<(?:[\w.-]+:)?owner[^>]*>([\s\S]*?)<\/(?:[\w.-]+:)?owner>/i)
        ?.[1] ?? "")
        .replace(/<[^>]*>/g, "").trim().slice(0, 200);
    return xml(
      200,
      `<D:prop xmlns:D="DAV:"><D:lockdiscovery><D:activelock><D:locktype><D:write/></D:locktype>` +
        `<D:lockscope><D:exclusive/></D:lockscope><D:depth>0</D:depth>` +
        `<D:owner>${echapper(owner)}</D:owner>` +
        `<D:timeout>Second-3600</D:timeout><D:locktoken><D:href>${jeton}</D:href></D:locktoken>` +
        `<D:lockroot><D:href>${
          echapper(href(segments, false))
        }</D:href></D:lockroot>` +
        `</D:activelock></D:lockdiscovery></D:prop>`,
      { "Lock-Token": `<${jeton}>` },
    );
  }

  async function proppatch(
    req: Request,
    segments: string[],
  ): Promise<Response> {
    const corps = await req.text();
    const espaces = new Map<string, string>();
    for (const m of corps.matchAll(/xmlns:([\w.-]+)="([^"]*)"/g)) {
      espaces.set(m[1], m[2]);
    }
    const noms = new Set<string>();
    for (
      const bloc of corps.matchAll(
        /<(?:[\w.-]+:)?prop>([\s\S]*?)<\/(?:[\w.-]+:)?prop>/g,
      )
    ) {
      for (const m of bloc[1].matchAll(/<([\w.-]+:)?([\w.-]+)[\s>/]/g)) {
        const prefixe = (m[1] ?? "").replace(/:$/, "");
        const uri = prefixe ? espaces.get(prefixe) : "DAV:";
        if (uri !== undefined) noms.add(`${uri}\u0000${m[2]}`);
      }
    }
    const props = [...noms].map((n, i) => {
      const [uri, local] = n.split("\u0000");
      return `<p${i}:${local} xmlns:p${i}="${echapper(uri)}"/>`;
    }).join("");
    return xml(
      207,
      `<D:multistatus xmlns:D="DAV:"><D:response><D:href>${
        echapper(href(segments, false))
      }</D:href>` +
        `<D:propstat><D:prop>${props}</D:prop><D:status>HTTP/1.1 200 OK</D:status></D:propstat>` +
        `</D:response></D:multistatus>`,
    );
  }

  return async (req) => {
    const url = new URL(req.url);
    const methode = req.method.toUpperCase();
    const entetesDav = {
      DAV: "1, 2",
      "MS-Author-Via": "DAV",
      Allow:
        "OPTIONS, PROPFIND, PROPPATCH, PUT, MKCOL, MOVE, LOCK, UNLOCK, HEAD, GET",
    };
    if (methode === "OPTIONS") {
      return new Response(null, { status: 200, headers: entetesDav });
    }

    let segments: string[];
    try {
      segments = cheminRelatif(url.pathname);
    } catch (e) {
      await req.body?.cancel();
      return e instanceof Refus
        ? texte(e.statut, e.message)
        : texte(400, "Chemin refusé.");
    }

    const depot = await authentifier(req).catch((e) => {
      deps.journal.erreur("depot_ouvrir en panne", {
        erreur: String(e).slice(0, 300),
      });
      return undefined;
    });
    if (depot === undefined) {
      await req.body?.cancel();
      return texte(503, "Service momentanément indisponible.", {
        "Retry-After": "60",
      });
    }
    if (!depot) {
      await req.body?.cancel();
      return texte(401, "Identifiant ou mot de passe du dépôt incorrect.", {
        "WWW-Authenticate": 'Basic realm="Omega - depot", charset="UTF-8"',
      });
    }

    try {
      switch (methode) {
        case "PROPFIND":
          return await propfind(req, depot, segments);
        case "PUT":
          return await put(req, depot, segments);
        case "MKCOL": {
          await req.body?.cancel();
          if (!segments.length) return texte(405, "Le dossier existe déjà.");
          const chemin = segments.join("/");
          const noeuds = arbre(await deps.portes.lister(depot.depot));
          if (noeuds.has(chemin)) return texte(405, "Ce nom existe déjà.");
          await deps.portes.noter(depot.depot, {
            chemin,
            dossier: true,
            octets: 0,
            sha256: null,
            etat: "dossier",
            document: null,
            reference: null,
            motif: null,
          });
          return new Response(null, { status: 201 });
        }
        case "MOVE": {
          await req.body?.cancel();
          const destination = req.headers.get("destination");
          if (!destination || !segments.length) {
            return texte(400, "Destination absente.");
          }
          let vers: string[];
          try {
            vers = cheminRelatif(new URL(destination, url).pathname);
          } catch (e) {
            return e instanceof Refus
              ? texte(e.statut, e.message)
              : texte(400, "Destination refusée.");
          }
          if (!vers.length) return texte(403, "Destination refusée.");
          const ok = await deps.portes.renommer(
            depot.depot,
            segments.join("/"),
            vers.join("/"),
          );
          return ok ? new Response(null, { status: 201 }) : texte(
            403,
            "Une pièce déposée ne se déplace plus : elle est déjà reçue. Seuls un dossier vide ou un fichier en cours de copie se renomment.",
          );
        }
        case "LOCK":
          return await lock(segments, req);
        case "UNLOCK":
          await req.body?.cancel();
          return new Response(null, { status: 204 });
        case "PROPPATCH":
          return await proppatch(req, segments);
        case "GET":
        case "HEAD":
          if (!segments.length) {
            return texte(
              200,
              methode === "HEAD"
                ? ""
                : `Dépôt Omega « ${depot.libelle} » : déposez vos pièces ici.`,
            );
          }
          return texte(
            403,
            "Le dépôt reçoit les pièces ; il ne les rend pas. Retrouvez-les dans FILED.",
          );
        case "DELETE":
          return texte(
            403,
            "Une pièce déposée ne s'efface pas : elle est reçue. Écartez-la dans FILED si besoin.",
          );
        case "COPY":
          return texte(403, "Copie non prise en charge : déposez le fichier.");
        default:
          await req.body?.cancel();
          return texte(405, "Méthode non prise en charge.", entetesDav);
      }
    } catch (e) {
      if (e instanceof Refus) return texte(e.statut, e.message);
      deps.journal.erreur("dépôt en panne", {
        methode,
        erreur: String((e as Error)?.message ?? e).slice(0, 300),
      });
      return texte(
        503,
        "Le dépôt est momentanément indisponible. Réessayez dans un instant.",
        { "Retry-After": "60" },
      );
    }
  };
}
