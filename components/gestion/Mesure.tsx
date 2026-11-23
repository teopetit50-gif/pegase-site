import { Blocks, Bot, PencilRuler, type LucideIcon } from "lucide-react";
import Depliant from "./Depliant";
import { Bloc } from "./Trame";
import { EcranOnglet } from "./visuels";
import { MESURE } from "./textes";

/* ══════════════════════════════════════════════════════════════════════
   Les agents, les métiers, le sur-mesure (« Run anywhere. Scale
   everywhere. », balisage.txt ligne 778). L'accordéon, ses classes et ses
   écarts sont dans Depliant.tsx ; ici ne se fait que le rendu serveur du
   titre, des icônes et des écrans : la nuit des quatre agents, les sept
   modules métier, le planning construit sur mesure.

   Écart : leurs icônes « Solar » → celles de lucide, déjà dans le site.
   ══════════════════════════════════════════════════════════════════════ */

const ICONES: Record<string, LucideIcon> = {
  "quatre-agents": Bot,
  metiers: Blocks,
  "sur-mesure": PencilRuler,
};

export function Mesure() {
  return (
    <Bloc id="agents">
      <Depliant
        entete={
          <div className="mb-10">
            <h2 className="ge-h2">
              <span className="block">{MESURE.titre[0]}</span>{" "}
              <span className="block text-[#342d27]">{MESURE.titre[1]}</span>
            </h2>
            <p className="ge-desc mt-6 max-w-lg">{MESURE.texte}</p>
          </div>
        }
        volets={MESURE.volets.map((v) => {
          const I = ICONES[v.id] ?? Bot;
          return {
            ...v,
            icone: <I className="h-6 w-6" fill="currentColor" fillOpacity={0.2} strokeWidth={1.6} aria-hidden="true" />,
            visuel: <EcranOnglet id={v.id} />,
          };
        })}
      />
    </Bloc>
  );
}
