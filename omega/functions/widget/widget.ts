// Fonction Edge `widget` (verify_jwt false) : la messagerie instantanée du site d'un client (REPUT).
//   GET     /widget/<clé>/widget.js   le script à insérer dans le site (voir script.ts)
//   OPTIONS /widget/<clé>/message     pré-vol CORS : seulement pour une origine autorisée du widget
//   POST    /widget/<clé>/message     un message du visiteur → widget_deposer → réception (canal formulaire)
// Rien de secret côté navigateur : la clé est publique. Ce qui protège : l'origine du navigateur (liste du widget),
// les plafonds de la porte, le champ piège et le temps de saisie (robots écartés sans le leur dire), l'adresse IP
// gardée seulement en empreinte salée du jour.

import { sha256Hex } from "../reception/commun.ts";
import type { Apparence, Portes } from "./portes.ts";
import { scriptWidget } from "./script.ts";

export type Dependances = {
  portes: Portes;
  /** URL publique de la fonction, sans barre finale : https://<projet>.supabase.co/functions/v1/widget */
  base: string;
  /** Sel de l'empreinte des adresses IP (WIDGET_SEL) ; à défaut un sel fixe : l'empreinte reste du jour. */
  sel: string;
  journal: { erreur(message: string, detail?: Record<string, unknown>): void };
  maintenant?: () => Date;
};

export const DELAI_MINIMAL_MS = 2500;
const TAILLE_MAX = 20_000;
const CLE = /^w_[a-z0-9]{20,40}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Objet = Record<string, unknown>;

function json(
  statut: number,
  corps: unknown,
  entetes: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(corps), {
    status: statut,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...entetes,
    },
  });
}

function texte(o: Objet, cle: string, max: number): string | null {
  const v = o[cle];
  return typeof v === "string" && v.trim() !== ""
    ? v.trim().slice(0, max)
    : null;
}

export function creerWidget(
  deps: Dependances,
): (req: Request) => Promise<Response> {
  const base = deps.base.replace(/\/+$/, "");
  const apparences = new Map<
    string,
    { a: Apparence | null; jusqu_a: number }
  >();

  async function apparence(cle: string): Promise<Apparence | null> {
    const t = Date.now();
    const deja = apparences.get(cle);
    if (deja && deja.jusqu_a > t) return deja.a;
    const a = await deps.portes.apparence(cle);
    if (apparences.size > 500) apparences.clear();
    apparences.set(cle, { a, jusqu_a: t + 60_000 });
    return a;
  }

  const cors = (origine: string) => ({
    "Access-Control-Allow-Origin": origine,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "600",
    Vary: "Origin",
  });

  return async (req) => {
    const url = new URL(req.url);
    const m = url.pathname.match(
      /\/widget\/(w_[a-z0-9]{20,40})\/(widget\.js|message)$/,
    );
    if (!m || !CLE.test(m[1])) return json(404, { erreur: "introuvable" });
    const [, cle, route] = m;
    const origine = (req.headers.get("origin") ?? "").toLowerCase().replace(
      /\/+$/,
      "",
    );

    try {
      if (route === "widget.js") {
        if (req.method !== "GET" && req.method !== "HEAD") {
          return json(405, { erreur: "méthode non autorisée" });
        }
        const a = await apparence(cle);
        const corps = a
          ? scriptWidget({
            cle,
            envoi: `${base}/${cle}/message`,
            libelle: a.libelle,
            couleur: a.couleur,
            accueil: a.accueil,
          })
          : "/* Messagerie du site Omega : clé inconnue ou désactivée. */\n";
        return new Response(req.method === "HEAD" ? null : corps, {
          status: a ? 200 : 404,
          headers: {
            "Content-Type": "application/javascript; charset=utf-8",
            "Cache-Control": "public, max-age=300",
            "X-Content-Type-Options": "nosniff",
          },
        });
      }

      // route === "message"
      if (req.method === "OPTIONS") {
        const a = await apparence(cle);
        if (!a || !origine || !a.origines.includes(origine)) {
          return new Response(null, { status: 403 });
        }
        return new Response(null, { status: 204, headers: cors(origine) });
      }
      if (req.method !== "POST") {
        return json(405, { erreur: "méthode non autorisée" });
      }
      if (!origine) return json(403, { erreur: "origine absente" });
      const annonce = Number(req.headers.get("content-length") ?? "0");
      if (annonce > TAILLE_MAX) {
        return json(413, { erreur: "message trop long" });
      }
      const brut = await req.text();
      if (brut.length > TAILLE_MAX) {
        return json(413, { erreur: "message trop long" });
      }
      let o: Objet;
      try {
        const v = JSON.parse(brut);
        if (!v || typeof v !== "object" || Array.isArray(v)) throw new Error();
        o = v as Objet;
      } catch {
        return json(400, { erreur: "corps illisible" });
      }

      // Les robots : champ piège rempli ou envoi trop rapide. On leur répond comme si tout allait bien.
      const delai = typeof o.delai_ms === "number" ? o.delai_ms : 0;
      if (texte(o, "site_web", 200) || delai < DELAI_MINIMAL_MS) {
        const a = await apparence(cle);
        return json(
          202,
          { ok: true },
          a && a.origines.includes(origine) ? cors(origine) : {},
        );
      }

      const conversation = texte(o, "conversation", 64);
      const message = texte(o, "message", 64);
      const corps = texte(o, "texte", 5000);
      const email = texte(o, "email", 254)?.toLowerCase() ?? null;
      const telephone = texte(o, "telephone", 40);
      if (
        !conversation || !UUID.test(conversation) || !message ||
        !UUID.test(message) || !corps
      ) {
        return json(400, { erreur: "message incomplet" });
      }
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return json(400, { erreur: "e-mail invalide" });
      }
      if (telephone && !/^[+0-9 ().-]{6,40}$/.test(telephone)) {
        return json(400, { erreur: "téléphone invalide" });
      }
      if (o.consentement !== true) {
        return json(400, { erreur: "accord absent" });
      }

      const ip =
        (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() ||
        "inconnue";
      const jour = (deps.maintenant?.() ?? new Date()).toISOString().slice(
        0,
        10,
      );
      const issue = await deps.portes.deposer({
        cle,
        origine,
        ipEmpreinte: await sha256Hex(`${deps.sel}|${jour}|${ip}`),
        conversation: conversation.toLowerCase(),
        message: message.toLowerCase(),
        texte: corps,
        nom: texte(o, "nom", 200),
        email,
        telephone,
        page: texte(o, "page", 500),
        consentement: true,
      });
      if (issue.statut === "recu") {
        return json(201, { ok: true }, cors(origine));
      }
      switch (issue.motif) {
        case "origine":
          return json(403, { erreur: "origine non autorisée" });
        case "cle":
          return json(404, { erreur: "introuvable" });
        case "plafond":
          return json(429, { erreur: "trop de messages" }, {
            ...cors(origine),
            "Retry-After": "600",
          });
        default:
          return json(400, { erreur: issue.motif }, cors(origine));
      }
    } catch (e) {
      deps.journal.erreur("messagerie du site en panne", {
        cle,
        erreur: String((e as Error)?.message ?? e).slice(0, 300),
      });
      return json(
        503,
        { erreur: "indisponible" },
        origine
          ? { "Access-Control-Allow-Origin": origine, Vary: "Origin" }
          : {},
      );
    }
  };
}
