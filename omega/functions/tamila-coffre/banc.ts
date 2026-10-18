// Le banc de recette (omega/banc/lecture_coffre_reel.sql) : deux gestes au nom du serveur, pour prouver la lecture
// longue sur un dossier dont la clé est au VRAI coffre, sans session de personne. Ils n'existent que si le secret
// TAMILA_BANC_CLIENT est posé (recette seulement) et ne valent que pour CE cabinet.
//   · banc_semer : la clé d'un dossier fictif — l'identifiant et le journal viennent de la porte
//     tamila_coffre_pour_nouvelle_cle, appelée par le gérant — est tirée ici, enveloppée chez Scaleway ; la référence,
//     l'intitulé et le n° RG fictifs sont chiffrés ; quatre pièces fictives (PDF texte) sont chiffrées au format
//     Tamila et déposées au bucket. Rendu : ce que la porte tamila_creer_dossier et tamila_deposer_piece attendent,
//     jamais la clé.
//   · banc_lire : le résultat d'une analyse du dossier, déchiffré avec la clé que la porte tamila_coffre_pour_membre a
//     remise au gérant (journalisée), pour que le coordinateur relise les constats. Pièces et dossier sont fictifs.

import { chiffrer as chiffrerTamila, dechiffrer as dechiffrerTamila, LONGUEUR_CLE } from "./aesgcm.ts";
import type { Contexte, Demande, Reponse } from "./coffre.ts";
import { ErreurCoffre } from "./keymanager.ts";
import { depuisBase64, depuisHex, texte, versHex } from "./octets.ts";
import type { Remise } from "./portes.ts";

export interface Banc {
  /** le seul cabinet pour lequel le banc répond */
  client: string;
  deposer(chemin: string, octets: Uint8Array): Promise<void>;
  analyse(id: string): Promise<{ client_id: string; module: string; objet_id: string; type: string; statut: string; resultat_chiffre: string | null } | null>;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const refus = (statut: number, code: string, message: string): Reponse => ({ statut, corps: { erreur: code, message } });

/** Les pièces fictives : des dates qui se contredisent exprès (février / mars / avril 2023), des pièces citées. */
export const PIECES_FICTIVES: [string, string[]][] = [
  ["bail-commercial-2019.pdf", [
    "BAIL COMMERCIAL",
    "",
    "Entre la SCI du Moulin, bailleur, et la societe Bati-Sud, preneur.",
    "Le present bail commercial est signe le 14 juin 2019 pour neuf annees.",
    "Loyer annuel : 36 000 euros hors taxes, payable par trimestre.",
    "Article 8 : le bailleur garde a sa charge les grosses reparations (art. 606 C. civ.).",
  ]],
  ["constat-huissier-2023.pdf", [
    "PROCES-VERBAL DE CONSTAT",
    "",
    "Le 15 mars 2023, a la requete de la societe Bati-Sud,",
    "nous avons constate des infiltrations au plafond du local commercial.",
    "Le gerant declare que les premieres infiltrations datent de mars 2023.",
    "Trois seaux recueillent l eau en trois points de la reserve.",
  ]],
  ["conclusions-adverses.pdf", [
    "CONCLUSIONS D INTIME",
    "",
    "La societe Bati-Sud expose que des infiltrations sont apparues des le mois de fevrier 2023.",
    "Elle soutient que le bailleur, informe par courrier du 2 fevrier 2023 (piece n 7), n a rien fait.",
    "Elle produit le rapport d expertise amiable du 12 mai 2023 (piece n 12) et le constat du 15 mars 2023 (piece n 4).",
    "Elle demande 48 000 euros de dommages et interets pour perte d exploitation.",
    "Fondement : articles 1719 et 1720 du code civil.",
  ]],
  ["jugement-2026.pdf", [
    "TRIBUNAL JUDICIAIRE DE PARIS",
    "",
    "Jugement rendu le 3 mars 2026.",
    "Le tribunal retient que le preneur n a averti le bailleur que le 20 avril 2023.",
    "Il rejette la demande de dommages et interets de la societe Bati-Sud.",
    "Il condamne la societe Bati-Sud aux depens.",
  ]],
];

/** Windows-1252 (WinAnsiEncoding) : ce que Helvetica sait écrire ; le reste devient « ? ». */
const CP1252: Record<number, number> = {
  0x20ac: 0x80,
  0x201a: 0x82,
  0x0192: 0x83,
  0x201e: 0x84,
  0x2026: 0x85,
  0x2020: 0x86,
  0x2021: 0x87,
  0x02c6: 0x88,
  0x2030: 0x89,
  0x0160: 0x8a,
  0x2039: 0x8b,
  0x0152: 0x8c,
  0x017d: 0x8e,
  0x2018: 0x91,
  0x2019: 0x92,
  0x201c: 0x93,
  0x201d: 0x94,
  0x2022: 0x95,
  0x2013: 0x96,
  0x2014: 0x97,
  0x02dc: 0x98,
  0x2122: 0x99,
  0x0161: 0x9a,
  0x203a: 0x9b,
  0x0153: 0x9c,
  0x017e: 0x9e,
  0x0178: 0x9f,
};
const versAnsi = (s: string) =>
  Array.from(s, (c) => {
    const u = c.codePointAt(0)!;
    return String.fromCharCode(u < 0x80 || (u >= 0xa0 && u <= 0xff) ? u : CP1252[u] ?? 0x3f);
  }).join("");

/** Coupe un texte en lignes d'au plus `largeur` caractères (aux espaces). */
export function couper(texteBrut: string, largeur = 92): string[] {
  const lignes: string[] = [];
  for (const paragraphe of texteBrut.replace(/\r/g, "").split("\n")) {
    let l = "";
    for (const mot of paragraphe.split(/\s+/).filter(Boolean)) {
      if (l && l.length + 1 + mot.length > largeur) {
        lignes.push(l);
        l = "";
      }
      l = l ? `${l} ${mot}` : mot.slice(0, largeur);
    }
    lignes.push(l);
  }
  // pas plus d'une ligne vide de suite
  return lignes.filter((l, i) => l !== "" || lignes[i - 1] !== "");
}

/** Un PDF texte (Helvetica, WinAnsi), autant de pages qu'il faut (52 lignes par page), que le lecteur sait extraire. */
export function pdf(lignes: string[]): Uint8Array {
  const esc = (t: string) => versAnsi(t).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  const PAR_PAGE = 52;
  const pages: string[][] = [];
  for (let i = 0; i < Math.max(1, lignes.length); i += PAR_PAGE) pages.push(lignes.slice(i, i + PAR_PAGE));
  // 1 catalogue, 2 pages, 3 police, puis (page, contenu) par page
  const kids = pages.map((_, i) => `${4 + 2 * i} 0 R`).join(" ");
  const objets = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
  ];
  pages.forEach((p, i) => {
    const flux = `BT /F1 10 Tf 50 800 Td 14.5 TL ${p.map((l) => `(${esc(l)}) Tj T*`).join(" ")} ET`;
    objets.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${5 + 2 * i} 0 R >>`);
    objets.push(`<< /Length ${flux.length} >>\nstream\n${flux}\nendstream`);
  });
  let corps = "%PDF-1.4\n";
  const offs: number[] = [];
  objets.forEach((o, i) => {
    offs.push(corps.length);
    corps += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = corps.length;
  corps += `xref\n0 ${objets.length + 1}\n0000000000 65535 f \n${offs.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}`;
  corps += `trailer\n<< /Size ${objets.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Uint8Array.from(corps, (c) => c.charCodeAt(0) & 0xff);
}

async function sha256Hex(o: Uint8Array): Promise<string> {
  return versHex(new Uint8Array(await crypto.subtle.digest("SHA-256", o.slice().buffer as ArrayBuffer)));
}

function garde(ctx: Contexte, d: Demande): Reponse | Banc {
  if (!ctx.banc) return refus(404, "BANC_ABSENT", "le banc n'est pas ouvert sur cette base (TAMILA_BANC_CLIENT)");
  if (d.client !== ctx.banc.client) return refus(403, "BANC_AUTRE_CABINET", "le banc ne répond que pour son cabinet");
  return ctx.banc;
}

interface DemandeSemer extends Demande {
  nouvelle?: { dossier?: unknown; journal?: unknown; region?: unknown; cle_maitre?: unknown; reference?: unknown };
  reference?: unknown;
  intitule?: unknown;
  numero_rg?: unknown;
  /** des pièces à semer à la place des quatre fictives : [{nom, texte}] (6 au plus, 150 000 caractères chacune) */
  pieces?: unknown;
}

export async function bancSemer(ctx: Contexte, d: DemandeSemer): Promise<Reponse> {
  const b = garde(ctx, d);
  if ("statut" in b) return b;
  const n = d.nouvelle ?? {};
  const dossier = typeof n.dossier === "string" && UUID.test(n.dossier) ? n.dossier : null;
  const journal = Number(n.journal);
  const region = String(n.region ?? ""), cleMaitre = String(n.cle_maitre ?? "");
  if (!dossier || !Number.isInteger(journal) || n.reference !== `scaleway:${region}:${cleMaitre}`) {
    return refus(400, "NOUVELLE_ILLISIBLE", "nouvelle attendue : ce que rend tamila_coffre_pour_nouvelle_cle");
  }
  let aSemer: [string, string[]][] = PIECES_FICTIVES;
  if (d.pieces !== undefined) {
    const l = Array.isArray(d.pieces) ? d.pieces : [];
    const ok = l.length >= 1 && l.length <= 6 &&
      l.every((p) =>
        p && typeof p.nom === "string" && /^[\w.\-]{1,80}\.pdf$/.test(p.nom) && typeof p.texte === "string" && p.texte.length > 0 && p.texte.length <= 150_000
      );
    if (!ok) return refus(400, "PIECES_ILLISIBLES", "pièces attendues : 1 à 6 × {nom: « x.pdf », texte (≤ 150 000 caractères)}");
    aSemer = l.map((p: { nom: string; texte: string }) => [p.nom, couper(p.texte)]);
  }
  if (!ctx.km) throw new ErreurCoffre("KM_ABSENT", "coffre non configuré : SCALEWAY_SECRET_KEY et SCALEWAY_PROJECT_ID absentes");
  if (ctx.km.region !== region) throw new ErreurCoffre("KM_ABSENT", `la clé maître est en ${region}, le coffre est réglé sur ${ctx.km.region}`);
  const cle = crypto.getRandomValues(new Uint8Array(LONGUEUR_CLE));
  try {
    const enveloppe = await ctx.km.chiffrer(cleMaitre, cle, dossier);
    await ctx.portes.conclure(journal, "emise", { par: "banc" });
    const champ = async (v: unknown) => (typeof v === "string" && v.trim() ? `\\x${versHex(await chiffrerTamila(cle, texte(v.trim())))}` : null);
    const pieces = [];
    for (const [nom, lignes] of aSemer) {
      const chiffre = await chiffrerTamila(cle, pdf(lignes));
      const sha = await sha256Hex(chiffre);
      const chemin = `${b.client}/tamila_dossier/${dossier}/${nom}.${sha.slice(0, 12)}.chiffre`;
      await b.deposer(chemin, chiffre);
      pieces.push({ nom, mime: "application/pdf", octets: chiffre.length, sha256: sha, chemin });
    }
    ctx.journal("info", "banc : dossier fictif semé", { client: b.client, dossier, pieces: pieces.length });
    return {
      statut: 200,
      corps: {
        dossier,
        cle_fournisseur: "scaleway",
        cle_reference: n.reference,
        cle_enveloppe: `\\x${versHex(enveloppe)}`,
        reference: await champ(d.reference ?? "BANC-COFFRE-1"),
        intitule: await champ(d.intitule ?? "SCI du Moulin c/ Bati-Sud (fictif)"),
        numero_rg: await champ(d.numero_rg),
        pieces,
      },
    };
  } catch (e) {
    await ctx.portes.conclure(journal, "echec", { code: e instanceof ErreurCoffre ? e.code : "ERREUR_INTERNE" }).catch(() => {});
    throw e;
  } finally {
    cle.fill(0);
  }
}

/** La remise vient de la porte tamila_coffre_pour_membre, appelée par le gérant (bloc SQL sous son identité) :
 *  le banc ne fait que déballer l'enveloppe qu'on lui présente et conclure la remise au journal. */
export async function bancLire(
  ctx: Contexte,
  d: Demande & { analyse?: unknown; remise?: Remise },
  deballer: (r: Remise) => Promise<Uint8Array>,
): Promise<Reponse> {
  const b = garde(ctx, d);
  if ("statut" in b) return b;
  const id = typeof d.analyse === "string" && UUID.test(d.analyse) ? d.analyse : null;
  if (!id) return refus(400, "ANALYSE_ILLISIBLE", "analyse attendue (uuid)");
  const a = await b.analyse(id);
  if (!a || a.client_id !== b.client || a.module !== "tamila") return refus(404, "ANALYSE_INCONNUE", "analyse Tamila du banc introuvable");
  if (!a.resultat_chiffre) return { statut: 200, corps: { analyse: id, type: a.type, statut: a.statut, resultat: null } };
  const r = d.remise;
  if (!r || r.fournisseur !== "scaleway" || r.dossier !== a.objet_id) {
    return refus(400, "REMISE_ILLISIBLE", "remise attendue : ce que rend tamila_coffre_pour_membre pour le dossier de l'analyse");
  }
  const cle = await deballer(r);
  try {
    const brut = a.resultat_chiffre;
    const octets = brut.startsWith("\\x") ? depuisHex(brut) : depuisBase64(brut);
    const clair = new TextDecoder().decode(await dechiffrerTamila(cle, octets));
    let resultat: unknown = clair;
    try {
      resultat = JSON.parse(clair);
    } catch { /* rendu tel quel */ }
    return { statut: 200, corps: { analyse: id, dossier: a.objet_id, type: a.type, statut: a.statut, resultat } };
  } finally {
    cle.fill(0);
  }
}

/** Le banc branché sur Supabase (clé de service) : le bucket omega-clients et la table analyses. */
export function bancDepuisEnv(env: { get(n: string): string | undefined }, url: string, cleService: string, fetchFn: typeof fetch = fetch): Banc | null {
  const client = env.get("TAMILA_BANC_CLIENT");
  if (!client || !UUID.test(client)) return null;
  const base = url.replace(/\/+$/, "");
  const h = { Authorization: `Bearer ${cleService}`, apikey: cleService };
  return {
    client,
    async deposer(chemin, octets) {
      const r = await fetchFn(`${base}/storage/v1/object/omega-clients/${chemin.split("/").map(encodeURIComponent).join("/")}`, {
        method: "POST",
        headers: { ...h, "Content-Type": "application/octet-stream", "x-upsert": "false" },
        body: octets.slice().buffer as ArrayBuffer,
      });
      if (!r.ok) throw new Error(`bucket ${r.status} : ${(await r.text()).slice(0, 200)}`);
    },
    async analyse(id) {
      const r = await fetchFn(`${base}/rest/v1/analyses?id=eq.${id}&select=client_id,module,objet_id,type,statut,resultat_chiffre`, { headers: h });
      if (!r.ok) throw new Error(`analyses ${r.status} : ${(await r.text()).slice(0, 200)}`);
      const l = (await r.json()) as { client_id: string; module: string; objet_id: string; type: string; statut: string; resultat_chiffre: string | null }[];
      return l[0] ?? null;
    },
  };
}
