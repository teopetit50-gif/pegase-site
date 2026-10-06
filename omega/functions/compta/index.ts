// L'ouvrier COMPTA d'Omega : fonction Edge Deno. Appelée chaque minute (POST), elle pousse les écritures de FILED
// dans le logiciel comptable de chaque société connectée (Pennylane, QuickBooks Online, Cegid Loop) ; appelée par le
// navigateur (GET), elle mène l'autorisation OAuth d'une connexion. Voir omega/NOTES-A4.md (a4_28) et
// omega/GUIDE-LOGICIELS-COMPTABLES.md.

import { journal, messageDe } from "@partage/journal.ts";
import { configSupabaseDepuisEnv } from "@partage/portes.ts";
import { traiterRetour, urlAutorisation } from "./autorisation.ts";
import { DepotStorageSigne } from "./depot.ts";
import { type Contexte, passage } from "./passage.ts";
import { PortesComptaRpc } from "./portes.ts";

export function contexteDepuisEnv(env: { get(n: string): string | undefined } = Deno.env): Contexte {
  const cfg = configSupabaseDepuisEnv(env);
  return {
    portes: new PortesComptaRpc(cfg),
    env,
    fetchFn: fetch,
    depot: new DepotStorageSigne(cfg, env.get("COMPTA_BUCKET") || undefined),
    maintenant: () => new Date(),
  };
}

function page(titre: string, texte: string, statut = 200): Response {
  const echap = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
  return new Response(
    `<!doctype html><meta charset="utf-8"><title>${echap(titre)}</title><body style="font-family:system-ui;max-width:36rem;margin:4rem auto"><h1>${
      echap(titre)
    }</h1><p>${echap(texte)}</p></body>`,
    { status: statut, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  const json = { "Content-Type": "application/json; charset=utf-8" };
  try {
    if (req.method === "GET" && url.searchParams.has("autoriser")) {
      const editeur = url.searchParams.get("editeur");
      const nonce = url.searchParams.get("autoriser") ?? "";
      if ((editeur !== "quickbooks" && editeur !== "pennylane") || !/^[0-9a-f]{64}$/.test(nonce)) {
        return page("Lien invalide", "Recommencez depuis Omega.", 400);
      }
      return Response.redirect(urlAutorisation(editeur, nonce, Deno.env), 302);
    }
    if (req.method === "GET" && (url.searchParams.has("code") || url.searchParams.has("error"))) {
      const r = await traiterRetour(url, configSupabaseDepuisEnv(), Deno.env, fetch);
      return page(r.ok ? "Connexion établie" : "Connexion non établie", r.message, r.ok ? 200 : 400);
    }
    if (req.method !== "POST") return new Response(JSON.stringify({ erreur: "méthode non permise" }), { status: 405, headers: json });
    const bilan = await passage(contexteDepuisEnv());
    return new Response(JSON.stringify(bilan), { status: 200, headers: json });
  } catch (e) {
    const erreur = messageDe(e);
    journal("erreur", "compta : appel impossible", { erreur });
    if (req.method === "GET") return page("Connexion non établie", erreur, 500);
    return new Response(JSON.stringify({ erreur }), { status: 200, headers: json });
  }
});
