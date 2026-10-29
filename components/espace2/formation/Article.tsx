import Link from "next/link";
import type { ReactNode } from "react";
import Lecteur from "./Lecteur";
import Sommaire from "./Sommaire";
import type { Bloc, PageFormation, Riche } from "./pages";
import "./formation.css";

/* Le gabarit commun des pages de /espace2/formation, sur une page de la
   documentation Linear : titre, intro, vidéo (s'il y en a une), sections,
   sommaire collant à droite, carte « Suivant ». Le contenu vient de
   pages.ts ; le sommaire se déduit des sections. */

/* un texte riche : [libellé](/lien) devient un lien, le reste est du texte */
function riche(texte: Riche): ReactNode[] {
  const morceaux: ReactNode[] = [];
  const motif = /\[([^\]]+)\]\(([^)]+)\)/g;
  let fin = 0;
  for (const m of texte.matchAll(motif)) {
    if (m.index > fin) morceaux.push(texte.slice(fin, m.index));
    morceaux.push(
      <Link key={m.index} href={m[2]}>
        {m[1]}
      </Link>,
    );
    fin = m.index + m[0].length;
  }
  if (fin < texte.length) morceaux.push(texte.slice(fin));
  return morceaux;
}

function blocs(liste: Bloc[]) {
  return liste.map((b, i) => {
    if ("sous" in b)
      return (
        <p key={i} className="fm-sous">
          {b.sous}
        </p>
      );
    if ("liste" in b)
      return (
        <ul key={i}>
          {b.liste.map((l, j) => (
            <li key={j}>{riche(l)}</li>
          ))}
        </ul>
      );
    return <p key={i}>{riche(b.p)}</p>;
  });
}

export default function Article({ page }: { page: PageFormation }) {
  const sommaire = page.sections.map((s) => ({ id: s.id, texte: s.titre, niveau: s.niveau }));
  return (
    <div className="fm">
      <article className="fm-article">
        <h1 className="fm-h1">{page.titre}</h1>
        <p className="fm-intro">{riche(page.intro)}</p>

        {page.video && <Lecteur src={page.video.src} affiche={page.video.affiche} titre={page.video.titre} duree={page.video.duree} />}

        {page.sections.map((s) => {
          const Titre = s.niveau === 2 ? "h2" : "h3";
          return (
            <section key={s.id} className="fm-section">
              <Titre id={s.id}>{s.titre}</Titre>
              {s.video && <Lecteur src={s.video.src} affiche={s.video.affiche} titre={s.video.titre} duree={s.video.duree} />}
              {blocs(s.blocs)}
            </section>
          );
        })}

        {page.suivant && (
          <Link href={page.suivant.href} className="fm-suivant">
            <span className="fm-suivant-sur">
              Suivant
              <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
                <path d="M6 3.5 10.5 8 6 12.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="fm-suivant-titre">{page.suivant.titre}</span>
          </Link>
        )}
      </article>

      {sommaire.length > 0 && <Sommaire entrees={sommaire} />}
    </div>
  );
}
