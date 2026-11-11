import { readFile } from "node:fs/promises";
import path from "node:path";
import { MARQUE_SITE } from "@/components/espace2/portail";

/* ══════════════════════════════════════════════════════════════════════
   L'icône de l'onglet (11/11/2026)

   Teo, sur capture de daliro.omegaai.fr : « je veux que ce logo soit
   blanc, pourquoi il est noir ». L'icône statique app/icon.png (celle
   d'Omega, noire) servait à tous les sites dédiés : noire sur la barre
   d'onglets sombre, et surtout pas la leur. Cette route la remplace :
   sur un site dédié (components/espace2/portail.ts), le signe du
   logiciel en BLANC sur une tuile noire arrondie, comme l'icône
   « pilotage » de l'espace client (demande de Teo du 09/10) ; sur
   omegaai.fr, l'icône d'Omega, inchangée, déplacée dans public/icones/.
   Les tuiles sont fabriquées une fois (public/icones/<cle>-onglet.png,
   64 px ; -apple.png, 180 px) à partir des masques public/logos/.
   ══════════════════════════════════════════════════════════════════════ */
const CLE = MARQUE_SITE?.cle ?? "omega";

export const contentType = "image/png";
export const size = MARQUE_SITE ? { width: 64, height: 64 } : { width: 512, height: 512 };

export default async function Icon() {
  const png = await readFile(path.join(process.cwd(), "public", "icones", `${CLE}-onglet.png`));
  return new Response(new Uint8Array(png), { headers: { "Content-Type": contentType } });
}
