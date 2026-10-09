/* Un écran du pilotage (09/10/2026) : la page de /espace2 à la même place,
   ses onglets, et le contenu d'Omega — un document modifiable, un ou
   plusieurs tableaux, ou un écran à part (À valider, Point du matin). */

import Link from "next/link";
import Document from "./Document";
import Tableaux from "./Tableaux";
import Journee from "./Journee";
import Prospects from "./Prospects";
import DemandesOmega from "./DemandesOmega";
import type { DefPage, OngletPage } from "./pages";
import { PAR_PAGE, lireContacts, lireLignes, lirePage, lireProspects, type FiltresProspects } from "@/lib/omega/donnees";

export default async function EcranOmega({ page, def, actif, filtres = {} }: { page: string; def: DefPage; actif: OngletPage; filtres?: FiltresProspects }) {
  const base = `/omega/${page}`;
  /* les écrans dupliqués de /espace2 portent leur propre page, sans titre visible (il est dans la barre du haut) */
  if (actif.special === "validations" || actif.special === "point") return <Journee mode={actif.special} lignes={await lireLignes()} />;
  if (actif.special === "demandes") {
    const [lignes, { contacts, secteurs }] = await Promise.all([lireLignes(), lireContacts()]);
    return (
      <div className="v2-page v2-arrivee">
        <DemandesOmega lignes={lignes} secteurs={secteurs} contacts={contacts} />
        <div id="ecran" className="om-ecran-liste">
          <Tableaux lignes={lignes} seulement={["clients"]} />
        </div>
      </div>
    );
  }
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
      <Contenu actif={actif} filtres={filtres} />
    </div>
  );
}

async function Contenu({ actif, filtres }: { actif: OngletPage; filtres: FiltresProspects }) {
  if (actif.special === "prospects") {
    const r = await lireProspects(filtres);
    return <Prospects lignes={r.lignes} total={r.total} page={r.page} parPage={PAR_PAGE} secteurs={r.secteurs} filtres={filtres} />;
  }
  if (actif.doc) {
    const p = await lirePage(actif.doc);
    return <Document key={actif.doc} slug={actif.doc} titre={p?.titre ?? actif.libelle} contenu={p?.contenu ?? ""} />;
  }
  const lignes = await lireLignes();
  if (actif.special === "validations" || actif.special === "point") return <Journee mode={actif.special} lignes={lignes} />;
  return <Tableaux lignes={lignes} seulement={actif.tableaux} />;
}
