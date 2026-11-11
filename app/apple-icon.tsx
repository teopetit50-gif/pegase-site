import { readFile } from "node:fs/promises";
import path from "node:path";
import { MARQUE_SITE } from "@/components/espace2/portail";

/* L'icône d'écran d'accueil (iOS) : même règle que app/icon.tsx — le signe du
   logiciel en blanc sur tuile noire sur un site dédié, l'icône d'Omega sinon. */
const CLE = MARQUE_SITE?.cle ?? "omega";

export const contentType = "image/png";
export const size = { width: 180, height: 180 };

export default async function AppleIcon() {
  const png = await readFile(path.join(process.cwd(), "public", "icones", `${CLE}-apple.png`));
  return new Response(new Uint8Array(png), { headers: { "Content-Type": contentType } });
}
