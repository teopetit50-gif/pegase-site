import { Fragment } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Ecran } from "./textes";

/* 2 et 6. L'énoncé — leur bloc `statement` : un titre centré, puis leurs
   paragraphes séparés d'un espaceur de 18 px, une rangée de boutons à
   filet, et, pour le premier, l'image posée en pleine largeur. */
export default function Enonce({
  titre,
  paragraphes = [],
  boutons = [],
  ecran,
}: {
  titre: string;
  paragraphes?: readonly string[];
  boutons?: readonly { texte: string; href: string }[];
  ecran?: Ecran;
}) {
  return (
    <section className="grp-enonce grp-trame">
      <div className="grp-enonce-texte">
        <h2>{titre}</h2>
        {paragraphes.map((p, i) => (
          <Fragment key={i}>
            {i > 0 && <div className="grp-espace" />}
            <p>{p}</p>
          </Fragment>
        ))}
        {boutons.length ? (
          <div className="grp-boutons">
            {boutons.map((b) => (
              <Link key={b.href} href={b.href}>
                {b.texte} <b>↗</b>
              </Link>
            ))}
          </div>
        ) : null}
      </div>
      {ecran && (
        <Image
          className="grp-enonce-image grp-plein"
          src={ecran.src}
          width={ecran.l}
          height={ecran.h}
          alt={ecran.alt}
          sizes="(max-width: 760px) 100vw, min(1500px, 96vw)"
        />
      )}
    </section>
  );
}
