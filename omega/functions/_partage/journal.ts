// Journal des ouvriers : une ligne JSON par événement, jamais de secret dedans.

export type Niveau = "info" | "alerte" | "erreur";

export function journal(niveau: Niveau, message: string, detail: Record<string, unknown> = {}): void {
  const ligne = JSON.stringify({ t: new Date().toISOString(), niveau, message, ...detail });
  if (niveau === "erreur") console.error(ligne);
  else if (niveau === "alerte") console.warn(ligne);
  else console.log(ligne);
}

/** Le message d'une erreur quelconque, borné, sans pile ni secret. */
export function messageDe(e: unknown, max = 500): string {
  const m = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
  return m.length > max ? m.slice(0, max - 1) + "…" : m;
}
