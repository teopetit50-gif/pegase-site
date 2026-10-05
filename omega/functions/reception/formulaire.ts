// (c) Formulaire du site (POST signé par le site Next.js, côté serveur).
//   X-Omega-Horodatage : secondes Unix ; X-Omega-Signature : hex HMAC-SHA256(FORMULAIRE_SECRET,
//   "<horodatage>.<corps brut>"). Rejeté au-delà de 5 minutes d'écart (rejeu).
// Corps JSON : {"identifiant": uuid généré par le site, "formulaire": "audit"|"contact"|…,
//   "nom", "email", "telephone", "societe", "message", "page", "consentement": bool, "champs": {…}}.
// La boîte est fixe : FORMULAIRE_BOITE (défaut site:omegaai.fr), résolue par resoudre_boite.

import type { Portes, Reception } from "./portes.ts";
import {
  hmacSha256Hex,
  type Journal,
  memeSecret,
  normaliserAdresse,
  recevoir,
  reponseJson,
  type Stockage,
} from "./commun.ts";

export const BOITE_PAR_DEFAUT = "site:omegaai.fr";
export const TOLERANCE_SECONDES = 300;

export type Dependances = {
  portes: Portes;
  stockage: Stockage;
  journal: Journal;
  /** FORMULAIRE_SECRET ; null → 503. */
  secret: string | null;
  boite?: string;
  maintenant?: () => Date;
};

type Objet = Record<string, unknown>;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function texte(o: Objet, cle: string, max = 500): string | null {
  const v = o[cle];
  return typeof v === "string" && v.trim() !== ""
    ? v.trim().slice(0, max)
    : null;
}

export type Soumission = {
  identifiant: string;
  formulaire: string;
  nom: string | null;
  email: string | null;
  telephone: string | null;
  societe: string | null;
  message: string;
  page: string | null;
  consentement: boolean;
  champs: Record<string, unknown>;
};

export function lireSoumission(
  corps: unknown,
): { soumission: Soumission } | { erreur: string } {
  if (!corps || typeof corps !== "object") return { erreur: "corps absent" };
  const o = corps as Objet;
  const identifiant = texte(o, "identifiant", 64);
  if (!identifiant || !UUID.test(identifiant)) {
    return { erreur: "identifiant absent ou non uuid" };
  }
  const formulaire = texte(o, "formulaire", 60) ?? "contact";
  const email = texte(o, "email", 254);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { erreur: "email invalide" };
  }
  const champs =
    o.champs && typeof o.champs === "object" && !Array.isArray(o.champs)
      ? o.champs as Objet
      : {};
  return {
    soumission: {
      identifiant: identifiant.toLowerCase(),
      formulaire,
      nom: texte(o, "nom", 200),
      email: email ? normaliserAdresse(email) : null,
      telephone: texte(o, "telephone", 40),
      societe: texte(o, "societe", 200),
      message: texte(o, "message", 20000) ?? "",
      page: texte(o, "page", 500),
      consentement: o.consentement === true,
      champs,
    },
  };
}

/** Corps lisible : le message, puis les champs libres du formulaire. */
export function composerCorps(s: Soumission): string {
  const lignes: string[] = [];
  if (s.message) lignes.push(s.message, "");
  const entrees = Object.entries(s.champs).filter(([, v]) =>
    v !== null && v !== undefined && v !== ""
  );
  for (const [k, v] of entrees) {
    lignes.push(
      `${k} : ${
        Array.isArray(v)
          ? v.join(", ")
          : typeof v === "object"
          ? JSON.stringify(v)
          : String(v)
      }`,
    );
  }
  return lignes.join("\n").trim();
}

export async function traiterFormulaire(
  req: Request,
  deps: Dependances,
): Promise<Response> {
  if (req.method !== "POST") {
    return reponseJson(405, { erreur: "méthode non autorisée" });
  }
  if (!deps.secret) {
    deps.journal.erreur(
      "FORMULAIRE_SECRET absent : formulaire refusé tant qu'il n'est pas posé",
    );
    return reponseJson(503, { erreur: "formulaire non configuré" });
  }
  const horodatage = req.headers.get("x-omega-horodatage") ?? "";
  const signature = (req.headers.get("x-omega-signature") ?? "").toLowerCase();
  const brut = await req.text();
  const ts = Number(horodatage);
  const maintenant = Math.floor(
    (deps.maintenant?.() ?? new Date()).getTime() / 1000,
  );
  if (
    !/^\d{9,11}$/.test(horodatage) ||
    Math.abs(maintenant - ts) > TOLERANCE_SECONDES
  ) {
    return reponseJson(401, { erreur: "horodatage absent ou trop ancien" });
  }
  const attendu = await hmacSha256Hex(deps.secret, `${horodatage}.${brut}`);
  if (!signature || !memeSecret(signature, attendu)) {
    deps.journal.erreur("signature du formulaire invalide");
    return reponseJson(401, { erreur: "signature invalide" });
  }
  let corps: unknown;
  try {
    corps = JSON.parse(brut);
  } catch {
    return reponseJson(400, { erreur: "corps JSON illisible" });
  }
  const lu = lireSoumission(corps);
  if ("erreur" in lu) return reponseJson(400, { erreur: lu.erreur });
  const s = lu.soumission;
  const boite = deps.boite ?? BOITE_PAR_DEFAUT;
  const recuLe = (deps.maintenant?.() ?? new Date()).toISOString();

  const issue = await recevoir(
    deps,
    "formulaire",
    [boite],
    s.identifiant,
    [],
    (client, boiteResolue): Reception => ({
      client,
      canal: "formulaire",
      boite: boiteResolue,
      identifiant: s.identifiant,
      de: s.email,
      deNom: s.nom,
      sujet: `Formulaire ${s.formulaire}${s.nom ? ` — ${s.nom}` : ""}${
        s.societe ? ` (${s.societe})` : ""
      }`,
      corps: composerCorps(s),
      corpsHtml: null,
      pieces: [],
      detail: {
        source: "site",
        formulaire: s.formulaire,
        page: s.page,
        telephone: s.telephone,
        societe: s.societe,
        consentement: s.consentement,
        champs: s.champs,
      },
      recuLe,
    }),
  );
  if (issue.sortie === "boite_inconnue") {
    return reponseJson(500, { erreur: "boîte du site inconnue du socle" });
  }
  if (issue.sortie === "erreur") {
    return reponseJson(500, { erreur: issue.erreur });
  }
  return reponseJson(issue.sortie === "nouvelle" ? 201 : 200, {
    id: issue.id,
    nouvelle: issue.sortie === "nouvelle",
  });
}
