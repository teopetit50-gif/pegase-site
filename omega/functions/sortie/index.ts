// L'ouvrier SORTIE d'Omega : fonction Edge Deno (lot a4_33). Appelée chaque minute par le planificateur (POST sans
// corps, clé de service), elle prépare les dossiers de sortie de FILED en volumes ZIP. Appelée par l'application
// (POST {"sortie": "<id>"} avec le jeton de la personne), elle rend les liens signés des volumes d'un dossier prêt,
// valables une heure, si la base reconnaît un gérant ou un admin. Voir omega/NOTES-A4.md (a4_33).

import { journal, messageDe } from "@partage/journal.ts";
import { configSupabaseDepuisEnv } from "@partage/portes.ts";
import { passage } from "./passage.ts";
import { PortesSortieRpc, RefusLien } from "./portes.ts";
import { StockageSupabase } from "./stockage.ts";

const JSON_UTF8 = { "Content-Type": "application/json; charset=utf-8" };
const reponse = (corps: unknown, statut = 200) => new Response(JSON.stringify(corps), { status: statut, headers: JSON_UTF8 });

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return reponse({ erreur: "méthode non permise" }, 405);
  try {
    const cfg = configSupabaseDepuisEnv();
    const portes = new PortesSortieRpc(cfg, Deno.env.get("SUPABASE_ANON_KEY") ?? "");
    const stockage = new StockageSupabase(cfg, Deno.env.get("SORTIE_BUCKET") || undefined);
    const corps = await req.text();
    const demande = corps ? (JSON.parse(corps) as { sortie?: unknown }) : {};
    if (typeof demande.sortie === "string") {
      if (!/^[0-9a-f-]{36}$/.test(demande.sortie)) return reponse({ erreur: "dossier invalide" }, 400);
      const jeton = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
      if (!jeton || jeton === cfg.cleService) return reponse({ erreur: "connexion requise" }, 401);
      try {
        const l = await portes.lien(jeton, demande.sortie);
        const volumes = await Promise.all(l.volumes.map(async (v) => ({
          n: v.n,
          octets: v.octets,
          sha256: v.sha256,
          url: await stockage.signer(v.chemin, 3600, `omega-filed-sortie-${String(v.n).padStart(2, "0")}.zip`),
        })));
        return reponse({ sortie: l.sortie, expire_le: l.expire_le, volumes });
      } catch (e) {
        if (e instanceof RefusLien) return reponse({ erreur: e.message }, e.statut);
        throw e;
      }
    }
    const jeton = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    if (jeton !== cfg.cleService) return reponse({ erreur: "réservé au planificateur" }, 401);
    const budgetMs = Number(Deno.env.get("SORTIE_BUDGET_MS") ?? "100000");
    return reponse(await passage({ portes, stockage, maintenant: () => new Date(), budgetMs }));
  } catch (e) {
    const erreur = messageDe(e);
    journal("erreur", "sortie : appel impossible", { erreur });
    return reponse({ erreur }, 500);
  }
});
