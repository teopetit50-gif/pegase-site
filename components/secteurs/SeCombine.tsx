import type { CSSProperties } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PAGE_OFFRE, secteur } from "@/lib/secteurs";
import "./se-combine.css";

/* ══════════════════════════════════════════════════════════════════════
   « Se combine avec » — le dernier bloc de chaque page métier (25/09/2026)

   Teo : « on peut aussi bien prendre le SaaS BTP et vouloir prendre CASHD
   aussi, mais c'est pas très compréhensible ». Le menu range désormais les
   deux familles dans un même panneau (lib/menu.ts) ; ce bloc dit la même
   chose au moment où le visiteur choisit : le logiciel de son métier ne
   remplace pas les offres pour toute entreprise, il s'y ajoute.

   Posé HORS de l'enveloppe scopée de chaque page (`.p-btp`, `.p-avocats`…),
   juste avant le pied : il porte la peau d'omegaai.fr, pas celle du SaaS
   rapatrié, et se lit pareil sur les six pages. Ses règles vivent dans
   se-combine.css, préfixées `.scb`.

   Les offres citées et leur raison viennent de `combine` dans
   lib/secteurs.ts : c'est là qu'on les change, pas ici.
   ══════════════════════════════════════════════════════════════════════ */

export default function SeCombine({ slug }: { slug: string }) {
  const s = secteur(slug);
  if (!s) return null;

  return (
    <section data-monde="clair" className="scb" aria-labelledby="scb-titre">
      <div className="scb-wrap">
        <div className="scb-tete">
          <p className="scb-etiquette">Se combine avec</p>
          <h2 id="scb-titre" className="scb-titre">
            {s.saas} s&apos;ajoute aux offres pour toute entreprise.
          </h2>
          <p className="scb-chapo">Un seul audit cadre l&apos;ensemble.</p>
        </div>

        <div className="scb-cartes">
          {s.combine.map(({ offre, raison }) => (
            <Link key={offre} href={PAGE_OFFRE[offre]} className="scb-carte">
              <span
                aria-hidden
                className="scb-signe"
                style={
                  {
                    "--scb-signe": `url(/logos/${offre.toLowerCase()}-mark.png)`,
                  } as CSSProperties
                }
              />
              <h3 className="scb-nom">{offre}</h3>
              <p className="scb-raison">{raison}</p>
              <span className="scb-lien">
                Voir {offre}
                <ArrowRight aria-hidden size={15} strokeWidth={1.75} />
              </span>
            </Link>
          ))}
        </div>

        <Link href="/offres" className="scb-tout">
          Toutes les offres
          <ArrowRight aria-hidden size={15} strokeWidth={1.75} />
        </Link>
      </div>
    </section>
  );
}
