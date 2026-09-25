/* ══════════════════════════════════════════════════════════════════════
   POST /api/csp — les rapports de la politique de contenu (25/09/2026)

   Audit sécurité du 25/09 : la politique de contenu (next.config.ts) tourne
   en MODE RAPPORT depuis le 10/09, mais n'avait aucune adresse où envoyer
   ses rapports — rien n'était donc relevé, et elle ne pouvait pas être
   durcie. Les navigateurs postent ici chaque ressource qu'une politique
   appliquée aurait bloquée ; on en écrit une ligne dans les journaux
   Vercel (« [csp] violation … »), rien d'autre : pas de base, pas d'envoi.

   Deux formats arrivent :
   · l'ancien (report-uri, Firefox et Safari) : { "csp-report": { … } } ;
   · le nouveau (report-to, Chrome et Edge) : [ { type, body: { … } } ].

   Garde-fous : corps lu jusqu'à 16 Ko, 10 rapports au plus par envoi,
   champs tronqués. L'adresse de la page est réduite à son chemin — une
   URL peut porter des paramètres personnels, ils ne vont pas au journal.
   Réponse 204 toujours : un rapport illisible ne mérite pas d'erreur.
   ══════════════════════════════════════════════════════════════════════ */

export const runtime = "nodejs";

const TAILLE_MAX = 16_000;

type Rapport = Record<string, unknown>;

function chemin(v: unknown): string {
  if (typeof v !== "string") return "?";
  try {
    const u = new URL(v);
    return `${u.origin}${u.pathname}`.slice(0, 200);
  } catch {
    return v.slice(0, 80);
  }
}

function champ(r: Rapport, ...cles: string[]): unknown {
  for (const c of cles) if (r[c] !== undefined) return r[c];
  return undefined;
}

export async function POST(req: Request) {
  try {
    const brut = (await req.text()).slice(0, TAILLE_MAX);
    const donnees: unknown = JSON.parse(brut);
    const rapports: Rapport[] = Array.isArray(donnees)
      ? donnees.map((d) => ((d as Rapport)?.body ?? d) as Rapport)
      : [(((donnees as Rapport)?.["csp-report"] ?? donnees) as Rapport)];
    for (const r of rapports.slice(0, 10)) {
      if (!r || typeof r !== "object") continue;
      const directive = String(champ(r, "effectiveDirective", "effective-directive", "violated-directive") ?? "?");
      console.warn(
        "[csp] violation",
        JSON.stringify({
          directive: directive.slice(0, 80),
          bloque: chemin(champ(r, "blockedURL", "blocked-uri")),
          page: chemin(champ(r, "documentURL", "document-uri")),
        }),
      );
    }
  } catch {
    /* rapport illisible : ignoré */
  }
  return new Response(null, { status: 204 });
}
