/* Un écran du pilotage (09/10/2026) : la page de /espace2 à la même place,
   ses onglets, et le contenu d'Omega — un document modifiable, un ou
   plusieurs tableaux, ou un écran à part (À valider, Point du matin). */

import Link from "next/link";
import Document from "./Document";
import Tableaux from "./Tableaux";
import Journee from "./Journee";
import type { DefPage, OngletPage } from "./pages";
import { lireLignes, lirePage } from "@/lib/omega/donnees";

export default async function EcranOmega({ page, def, actif }: { page: string; def: DefPage; actif: OngletPage }) {
  const base = `/omega/${page}`;
  return (
    <div className={`v2-page om-page${actif.tableaux || actif.special ? " om-page--large" : ""}`}>
      <div className="v2-tete">
        <h1>{def.titre}</h1>
      </div>
      {def.onglets.length > 1 ? (
        <nav className="om-onglets" aria-label={`Sections de ${def.titre}`}>
          {def.onglets.map((o) => (
            <Link key={o.cle} href={o.cle ? `${base}/${o.cle}` : base} className="om-onglet" aria-current={o.cle === actif.cle ? "page" : undefined}>
              {o.libelle}
            </Link>
          ))}
        </nav>
      ) : null}
      <Contenu actif={actif} />
    </div>
  );
}

async function Contenu({ actif }: { actif: OngletPage }) {
  if (actif.doc) {
    const p = await lirePage(actif.doc);
    return <Document key={actif.doc} slug={actif.doc} titre={p?.titre ?? actif.libelle} contenu={p?.contenu ?? ""} />;
  }
  const lignes = await lireLignes();
  if (actif.special) return <Journee mode={actif.special} lignes={lignes} />;
  return <Tableaux lignes={lignes} seulement={actif.tableaux} />;
}
