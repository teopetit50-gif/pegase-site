/* Un écran du pilotage (09/10/2026) : la page de /espace2 à la même place,
   ses onglets, et le contenu d'Omega — un document modifiable, un ou
   plusieurs tableaux, ou un écran à part (À valider, Point du matin). */

import Document from "./Document";
import Tableaux from "./Tableaux";
import Journee from "./Journee";
import Prospects from "./Prospects";
import DemandesOmega from "./DemandesOmega";
import Contacts from "./Contacts";
import Formation from "./Formation";
import ModeAppels from "./ModeAppels";
import Semaine from "./Semaine";
import SelecteurVue from "./SelecteurVue";
import type { DefPage, OngletPage } from "./pages";
import { PAR_PAGE, lireContacts, lireContactsSuivis, lireFileAppels, lireLignes, lirePage, lireProspects, type FiltresProspects } from "@/lib/omega/donnees";

export default async function EcranOmega({ page, def, actif, filtres = {} }: { page: string; def: DefPage; actif: OngletPage; filtres?: FiltresProspects }) {
  /* les écrans dupliqués de /espace2 portent leur propre page, sans titre visible (il est dans la barre du haut) */
  if (actif.special === "validations" || actif.special === "point") return <Journee mode={actif.special} lignes={await lireLignes()} />;
  const selecteur = def.onglets.length > 1 ? <SelecteurVue page={page} titre={def.titre} onglets={def.onglets} actif={actif.cle} /> : null;
  if (actif.special === "formation") return <Formation lignes={await lireLignes(["formation"])} selecteur={selecteur} />;
  if (actif.special === "appels") {
    const [file, lignes] = await Promise.all([lireFileAppels(filtres.secteur), lireLignes(["appels", "objections"])]);
    return <ModeAppels file={file.prospects} secteurs={file.secteurs} secteur={filtres.secteur} lignes={lignes} selecteur={selecteur} />;
  }
  if (actif.special === "semaine") {
    const [lignes, { echanges }, { contacts }] = await Promise.all([lireLignes(), lireContactsSuivis(), lireContacts()]);
    return <Semaine lignes={lignes} echanges={echanges.map((e) => e.quand)} prospects={contacts} selecteur={selecteur} />;
  }
  if (actif.special === "contacts") {
    const { contacts, echanges } = await lireContactsSuivis();
    return (
      <>
        {selecteur ? <div className="om-vue-haut">{selecteur}</div> : null}
        <Contacts contacts={contacts} echanges={echanges} />
      </>
    );
  }
  if (actif.special === "prospects") {
    const r = await lireProspects(filtres);
    return <Prospects lignes={r.lignes} total={r.total} page={r.page} parPage={PAR_PAGE} secteurs={r.secteurs} filtres={filtres} />;
  }
  if (actif.special === "demandes") {
    const [lignes, { contacts, secteurs }] = await Promise.all([lireLignes(), lireContacts()]);
    return (
      <div className="v2-page v2-arrivee">
        {selecteur ? <div className="om-vue-haut om-vue-haut--dedans">{selecteur}</div> : null}
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
      {selecteur ? <div className="om-vue-barre">{selecteur}</div> : null}
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
