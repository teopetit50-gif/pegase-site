import { assertEquals } from "@std/assert";
import { configurationBacRecette, estRecette } from "./garde.ts";
import { REGLAGES_RECETTE } from "../pa-bac-a-sable/garde.ts";

Deno.test("garde : seul l'hôte exact de la recette passe", () => {
  assertEquals(estRecette("https://ygwbgpowzlbdaajlsqkn.supabase.co"), true);
  assertEquals(estRecette("https://ygwbgpowzlbdaajlsqkn.supabase.co/"), true);
  for (
    const u of [
      "https://autreprojet.supabase.co",
      "https://ygwbgpowzlbdaajlsqkn.supabase.co.attaquant.fr",
      "https://x.ygwbgpowzlbdaajlsqkn.supabase.co",
      "http://kong:8000",
      "",
      undefined,
    ]
  ) assertEquals(estRecette(u), false, String(u));
  assertEquals(configurationBacRecette("https://prod.supabase.co"), null);
});

Deno.test("recette : echange-pa parle au bac avec les identifiants du bac", () => {
  const c = configurationBacRecette(
    "https://ygwbgpowzlbdaajlsqkn.supabase.co",
  )!;
  assertEquals(
    c.racine,
    "https://ygwbgpowzlbdaajlsqkn.supabase.co/functions/v1/pa-bac-a-sable/flow/v1",
  );
  assertEquals(
    c.jetonUrl,
    "https://ygwbgpowzlbdaajlsqkn.supabase.co/functions/v1/pa-bac-a-sable/oauth/token",
  );
  assertEquals(c.clientId, REGLAGES_RECETTE.clientId);
  assertEquals(c.clientSecret, REGLAGES_RECETTE.clientSecret);
});
