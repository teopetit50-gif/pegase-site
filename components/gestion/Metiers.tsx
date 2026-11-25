import {
  ArrowUpRight,
  Bot,
  Calculator,
  FileText,
  Landmark,
  Package,
  Plus,
  Quote,
  ReceiptText,
  ShoppingCart,
  type LucideIcon,
} from "lucide-react";
import Apparition from "./Apparition";
import { Bloc } from "./Trame";
import { METIERS } from "./textes";

/* ══════════════════════════════════════════════════════════════════════
   Le bandeau des métiers (« Trusted by innovative teams worldwide »,
   balisage.txt ligne 290 : un classement « Ranked #1 » et huit logos de
   clients). Les classes sont celles de la référence, dans l'ordre du DOM.

   CE QUI EST REMPLACÉ (règles maison : aucun client, aucun classement) :
   · « Ranked #1 in Speech Arena… » → une conviction d'Omega, dans le même
     bloc : l'icône en haut, le titre et le texte en bas ;
   · les huit logos → les sept métiers qui ont leur module, plus « Votre
     métier », en mots avec une icône (un mot-symbole, pas un logo).

   Écarts :
   · la phrase du haut est un <h2> (un <p> chez eux) : c'est le titre de
     la section ;
   · leurs logos sont à 40 % d'opacité, en niveaux de gris, et reprennent
     leur couleur au survol. Un nom de métier est un texte à lire : il est
     en stone-500 (4,6:1 sur blanc) et passe en stone-900 au survol ;
   · chez eux quatre logos sur huit mènent à une étude de cas ; ici les
     sept métiers mènent à leur page (/secteurs/…, lib/secteurs.ts), la
     case « Votre métier » ne mène nulle part, comme leurs quatre autres ;
   · sous xl le nom est en 15 px (18 px au-delà) : la case tombe à 166 px
     de large à 1024 px, où « automobiles » ne tient pas en 18 px.
   ══════════════════════════════════════════════════════════════════════ */

/* 25/11 — les cases ne nomment plus des métiers mais ce que vous recevez :
   les six modules, les agents, le sur-mesure (textes.ts, METIERS). Aucune
   n'est un lien : les modules se lisent sur cette page même. */
const ICONES: Record<string, LucideIcon> = {
  ventes: ReceiptText,
  achats: ShoppingCart,
  stock: Package,
  banque: Landmark,
  comptabilite: Calculator,
  documents: FileText,
  agents: Bot,
  "sur-mesure": Plus,
};

const CASE = "group relative flex h-32 rounded-[10px] bg-white transition-colors hover:bg-stone-100 lg:h-40";

function Marque({ cle, nom, lien }: { cle: string; nom: string; lien: boolean }) {
  const I = ICONES[cle] ?? Plus;
  return (
    <div className="relative flex h-full w-full items-center justify-center p-4">
      <div
        className={`relative flex min-w-0 items-center justify-center gap-2 text-stone-500 transition-colors duration-300 ease-out ${
          lien ? "group-hover:text-stone-900" : ""
        }`}
      >
        <I className="h-6 w-6 shrink-0 md:h-7 md:w-7" strokeWidth={1.6} aria-hidden="true" />
        <span className="min-w-0 text-[15px] font-semibold leading-tight xl:text-lg">{nom}</span>
      </div>
      {lien ? (
        <ArrowUpRight
          className="absolute right-2.5 top-2.5 h-5 w-5 text-stone-900 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          aria-hidden="true"
        />
      ) : null}
    </div>
  );
}

export function Metiers() {
  return (
    <Bloc id="metiers">
      <div className="border-b border-stone-200 px-4 py-6 md:px-8 xl:px-12">
        <h2 className="font-medium text-stone-500">
          {METIERS.titre[0]} <span className="text-[#342d27]">{METIERS.titre[1]}</span>
        </h2>
      </div>
      <div className="flex flex-col bg-stone-200 lg:flex-row">
        <Apparition
          x={-20}
          y={0}
          marge={100}
          className="flex flex-col justify-between gap-8 border-b border-stone-200 bg-stone-50 p-8 lg:w-80 lg:shrink-0 lg:border-b-0 lg:border-r lg:p-12"
        >
          <span>
            <Quote className="h-8 w-8 text-stone-500" fill="currentColor" fillOpacity={0.25} strokeWidth={1.5} aria-hidden="true" />
          </span>
          <div className="flex flex-col gap-4">
            <p className="ge-h2">{METIERS.pari.titre}</p>
            <p className="leading-tight text-stone-500">{METIERS.pari.texte}</p>
          </div>
        </Apparition>
        <ul className="grid min-w-0 flex-1 grid-cols-2 gap-px bg-stone-200 md:grid-cols-4">
          {METIERS.cases.map((c, i) => (
            <li key={c.cle}>
              <Apparition y={12} duree={0.4} retard={0.05 * i} marge={50}>
                <div className={CASE}>
                  <Marque cle={c.cle} nom={c.nom} lien={false} />
                </div>
              </Apparition>
            </li>
          ))}
        </ul>
      </div>
    </Bloc>
  );
}
