import Image from "next/image";
import Link from "next/link";
import Copier from "./Copier";
import Verre from "./Verre";
import { AUDIT, COURRIEL, HEROS } from "./textes";

/* 1. Le héros — leur `hero grid-bg` : le verre animé derrière, le texte
   (5 fr), deux écrans superposés (7 fr), puis la légende centrée. Leur
   rangée de logos clients est vide chez eux (`.logos:empty`) : absente.
   Les deux écrans sont préchargés, le grand en priorité haute : dans
   Next 16, `priority` ne pose plus de `fetchpriority`, et au téléphone
   les écrans du survol et de l'accordéon (dans le seuil de chargement
   paresseux de Chrome) passaient devant lui. */
export default function Heros() {
  const [grand, petit] = HEROS.ecrans;
  return (
    <section className="grp-heros grp-trame">
      <div className="grp-heros-verre" aria-hidden="true">
        <Verre />
      </div>
      <div className="grp-heros-texte">
        <h1>{HEROS.titre}</h1>
        <p>{HEROS.chapo}</p>
        <div className="grp-heros-actions">
          <Copier texte={COURRIEL} />
          <Link href={AUDIT}>
            {HEROS.bouton} <b>↗</b>
          </Link>
        </div>
      </div>
      <div className="grp-heros-ecrans">
        <Image
          src={grand.src}
          width={grand.l}
          height={grand.h}
          alt={grand.alt}
          sizes="(max-width: 760px) 82vw, 40vw"
          preload
          fetchPriority="high"
        />
        <Image
          src={petit.src}
          width={petit.l}
          height={petit.h}
          alt={petit.alt}
          sizes="(max-width: 760px) 48vw, 24vw"
          preload
        />
      </div>
      <div className="grp-legende">{HEROS.legende}</div>
    </section>
  );
}
