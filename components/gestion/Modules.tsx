import { Bloc } from "./Trame";
import Onglets from "./Onglets";
import { EcranOnglet } from "./visuels";
import { MODULES } from "./textes";

/* ══════════════════════════════════════════════════════════════════════
   Les six modules reliés, en quatre onglets (« Built for teams that ship
   fast », balisage.txt ligne 199). Les onglets par secteur de la référence
   deviennent les modules : Ventes, Achats, Stock, Banque et comptabilité,
   chacun avec son écran. Le composant d'onglets, ses classes et ses écarts
   sont dans Onglets.tsx ; ici ne se fait que le rendu serveur des écrans.
   ══════════════════════════════════════════════════════════════════════ */

export function Modules() {
  return (
    <Bloc id="modules">
      <Onglets
        titre={
          <>
            {MODULES.titre[0]} <span className="text-[#342d27]">{MODULES.titre[1]}</span>
          </>
        }
        onglets={MODULES.onglets.map((o) => ({ ...o, visuel: <EcranOnglet id={o.id} /> }))}
      />
    </Bloc>
  );
}
