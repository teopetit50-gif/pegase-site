// La passerelle « avis RPVA lu → délais » côté lecteur (b4_08) : ce qui sort du lecteur, la concordance du RG,
// les appels aux deux portes. Aucun appel réseau.

import { assertEquals, assertRejects } from "@std/assert";
import { avisDepuisLecture, dossierPourLecteur, ErreurCleCoffre, normaliserRg, poserAvisLu, rgConcorde, type ValeurLecture } from "../lecteur.ts";

const v = (champ: string, valeur: unknown, source = "ia", verifiee = true): ValeurLecture => ({ champ, valeur, source, verifiee });

Deno.test("avisDepuisLecture : seules les clés de tamila_avis_lu, vérifiées, sortent ; jamais un nom", () => {
  const a = avisDepuisLecture("rpva_avis_audience", [
    v("date_avis", "2026-10-02"),
    v("date_audience", "2027-02-04T09:30"),
    v("numero_rg", "N° RG 26/04512"),
    v("partie_adverse", "Bâti-Sud SAS"),
    v("date_limite", "2026-12-15", "ia", false),
  ]);
  assertEquals(a?.valeurs, { date_avis: "2026-10-02", date_audience: "2027-02-04T09:30" });
  assertEquals(a?.confiance, "modele");
  assertEquals(a?.numeroRg, "N° RG 26/04512");
});

Deno.test("avisDepuisLecture : pas d'avis sans date, ni pour une pièce qui n'est pas un avis ; un accusé de dépôt porte son dépôt", () => {
  assertEquals(avisDepuisLecture("rpva_avis_audience", [v("date_audience", "2027-02-04")]), null);
  assertEquals(avisDepuisLecture("tamila_piece_autre", [v("date_avis", "2026-10-02")]), null);
  assertEquals(avisDepuisLecture("rpva_accuse_depot", [v("date_avis", "2026-10-02")]), null);
  assertEquals(
    avisDepuisLecture("rpva_accuse_depot", [v("date_avis", "2026-10-02"), v("depose_le", "2026-10-02T17:41")])?.valeurs.depose_le,
    "2026-10-02T17:41",
  );
});

Deno.test("avisDepuisLecture : confiance gabarit quand tout vient d'une règle ; rang et partie bornés", () => {
  const a = avisDepuisLecture("rpva_conclusions", [v("date_avis", "2026-10-02", "regle"), v("rang", "1", "regle"), v("partie_visee", "appelant", "regle")]);
  assertEquals(a?.confiance, "gabarit");
  assertEquals(a?.valeurs, { date_avis: "2026-10-02", rang: 1, partie_visee: "appelant" });
  const b = avisDepuisLecture("rpva_conclusions", [v("date_avis", "2026-10-02"), v("rang", "120"), v("partie_visee", "le client")]);
  assertEquals(b?.valeurs, { date_avis: "2026-10-02" });
});

Deno.test("rgConcorde : même RG quelle que soit l'écriture ; différent ; inconnu", () => {
  assertEquals(normaliserRg("RG n° 26/04512"), "26/04512");
  assertEquals(rgConcorde("N° RG 26/04512", "26/04512"), true);
  assertEquals(rgConcorde("26/04513", "26/04512"), false);
  assertEquals(rgConcorde(null, "26/04512"), null);
  assertEquals(rgConcorde("26/04512", null), null);
});

Deno.test("les portes : la clé de service, la pièce et l'avis ; un refus 409 ne se reprend pas", async () => {
  const appels: { url: string; corps: Record<string, unknown>; auth: string }[] = [];
  const f = ((url: string | URL | Request, init?: RequestInit) => {
    const corps = JSON.parse(String(init?.body));
    appels.push({ url: String(url), corps, auth: (init?.headers as Record<string, string>).Authorization });
    if (String(url).endsWith("tamila_dossier_pour_lecteur")) {
      return Promise.resolve(
        new Response(JSON.stringify({ piece: corps.p_piece, dossier: "d", client: "c", statut: "ouvert", numero_rg: "01ab", avis_deja: false })),
      );
    }
    return Promise.resolve(new Response(JSON.stringify({ code: "55000", message: "Cette pièce n'a pas été lue" }), { status: 409 }));
  }) as typeof fetch;
  const cfg = { url: "https://x.supabase.co", cleService: "cle-service" };
  const d = await dossierPourLecteur(cfg, "p1", f);
  assertEquals([d.dossier, d.numero_rg, appels[0].auth], ["d", "01ab", "Bearer cle-service"]);
  const avis = avisDepuisLecture("rpva_avis_audience", [v("date_avis", "2026-10-02")])!;
  const e = await assertRejects(() => poserAvisLu(cfg, "p1", avis, true, f), ErreurCleCoffre);
  assertEquals([e.statut, e.reprendre], [409, false]);
  assertEquals(appels[1].corps, {
    p_piece: "p1",
    p_type: "rpva_avis_audience",
    p_valeurs: { date_avis: "2026-10-02" },
    p_confiance: "modele",
    p_rg_concorde: true,
  });
});
