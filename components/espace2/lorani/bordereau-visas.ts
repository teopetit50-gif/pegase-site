/* ══════════════════════════════════════════════════════════════════════
   LORANI — le bordereau des visas, imprimable (02/11/2026)

   Promesse de la page des architectes : « Registre daté des visas »,
   bordereau VSO · VAO · refus. Un PDF fabriqué dans le navigateur avec
   l'outil des rapports (components/espace/lorani/rapport.ts : Mise,
   ecrirePdf), à partir des visas déjà lus (lorani_visas) : rien n'est
   écrit, aucune porte nouvelle.

   Trois rubriques dans l'ordre du bordereau : visés sans observation
   (VSO), visés avec observations (VAO), refusés (REF) ; puis les documents
   encore à viser, avec leur date limite. Dans chaque rubrique, par lot,
   puis par date de visa.
   ══════════════════════════════════════════════════════════════════════ */

import { Mise, ecrirePdf } from "@/components/espace/lorani/rapport";
import type { Dossier, Projet, Visa } from "@/components/espace/lorani/types";

const jour = (d: string | null | undefined) => (d ? new Date(d.length === 10 ? `${d}T12:00:00` : d).toLocaleDateString("fr-FR") : "—");

const RUBRIQUES: { avis: Visa["avis"]; titre: string }[] = [
  { avis: "vso", titre: "Visés sans observation (VSO)" },
  { avis: "vao", titre: "Visés avec observations (VAO)" },
  { avis: "ref", titre: "Refusés (REF)" },
  { avis: "a_viser", titre: "Encore à viser" },
];

export function bordereauVisas(projet: Projet, dossier: Dossier): { nom: string; octets: Uint8Array; nombre: number } {
  const visas = dossier.visas.filter((v) => v.projet_id === projet.id);
  const lot = (id: string | null) => (id ? dossier.lots.find((l) => l.id === id) : undefined);
  const cle = (v: Visa) => `${lot(v.lot_id)?.numero ?? "zz"}|${v.vise_le ?? v.a_viser_avant ?? v.recu_le}`;
  const titre = `Bordereau des visas — ${projet.nom}`;
  const aujourdhui = new Date();
  const m = new Mise(`${projet.nom} · bordereau des visas édité le ${aujourdhui.toLocaleDateString("fr-FR")} · Lorani`);
  m.texte(titre, { taille: 16, gras: true, apres: 2 });
  m.texte([projet.reference, projet.adresse, [projet.code_postal, projet.commune].filter(Boolean).join(" ")].filter(Boolean).join(" · "), { gris: true });
  m.texte(
    `${visas.length} document(s) d'exécution : ${RUBRIQUES.map((r) => `${visas.filter((v) => v.avis === r.avis).length} ${r.avis === "a_viser" ? "à viser" : r.avis.toUpperCase()}`).join(", ")}. Les dates sont celles enregistrées au moment du visa.`,
    { gris: true, apres: 8 },
  );
  for (const r of RUBRIQUES) {
    const liste = visas.filter((v) => v.avis === r.avis).sort((a, b) => cle(a).localeCompare(cle(b)));
    if (!liste.length) continue;
    if (m.reste() < 120) m.saut();
    m.filet();
    m.texte(`${r.titre} · ${liste.length}`, { gras: true, taille: 12, apres: 2 });
    for (const v of liste) {
      if (m.reste() < 70) m.saut();
      const l = lot(v.lot_id);
      m.texte(`${l ? `Lot ${l.numero} ${l.intitule} · ` : ""}${v.document}, indice ${v.indice}`, { taille: 9 });
      m.texte(
        `Reçu le ${jour(v.recu_le)}${v.vise_le ? ` · visé le ${jour(v.vise_le)}` : v.a_viser_avant ? ` · à viser avant le ${jour(v.a_viser_avant)}` : ""}${v.commande_le ? ` · commande de l'ouvrage le ${jour(v.commande_le)}` : ""}${v.observation ? ` · ${v.observation}` : ""}`,
        { taille: 9, retrait: 14, gris: r.avis !== "ref", rouge: r.avis === "ref", apres: 2 },
      );
    }
  }
  if (!visas.length) m.texte("Aucun document d'exécution reçu sur ce projet.", { gris: true });
  m.fin();
  const date = aujourdhui.toISOString().slice(0, 10);
  const base = `bordereau-visas-${(projet.reference ?? projet.nom).replace(/[^\p{L}\p{N}]+/gu, "-")}-${date}`.toLowerCase();
  return { nom: `${base}.pdf`, octets: ecrirePdf(m.pages, titre), nombre: visas.length };
}
