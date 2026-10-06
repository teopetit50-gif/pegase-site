// Origines autorisées (CORS) et sujet du jeton : petites fonctions pures, testées à part.

const ORIGINE = /^https?:\/\/[^/\s,]+$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Réunit des listes « a, b » d'origines (variable d'environnement, réglage) ; ignore ce qui n'est pas une origine. */
export function listeOrigines(...sources: (string | null | undefined)[]): string[] {
  const vues = new Set<string>();
  for (const s of sources) {
    for (const o of (s ?? "").split(",").map((x) => x.trim().replace(/\/$/, ""))) {
      if (ORIGINE.test(o)) vues.add(o);
    }
  }
  return [...vues];
}

/** Le sujet (identifiant de l'utilisateur) d'un jeton déjà vérifié par la passerelle (verify_jwt = true) ; null sinon. */
export function sujetDuJeton(jeton: string): string | null {
  const partie = jeton.split(".")[1];
  if (!partie) return null;
  try {
    const b64 = partie.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(partie.length / 4) * 4, "=");
    const sub = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)))).sub;
    return typeof sub === "string" && UUID.test(sub) ? sub : null;
  } catch {
    return null;
  }
}
