import MiniSite from "./MiniSite";
import { MODELES } from "./donnees";

/* ══════════════════════════════════════════════════════════════════════
   <Ruban> — le défilé horizontal des vingt-deux modèles.

   Ajouté le 03/08 à la demande de Teo (« faire apparaître les trucs, des
   slides »). Il vient combler un vrai trou du parcours : entre le hero, où
   l'on voit douze vitrines figées, et la grille, qu'il faut scroller pour
   découvrir, rien ne disait qu'il y en a vingt-deux. Le ruban le montre en
   trois secondes, sans faire défiler la page.

   Comment il boucle : la liste est dupliquée à l'identique, la piste
   translate de -50 % exactement, donc la seconde moitié prend la place de
   la première au pixel près et la reprise est invisible. C'est pour ça que
   le duplicata est obligatoire — avec une seule liste, le ruban sauterait à
   chaque tour.

   Il s'arrête au survol (règle `.m-ruban:hover` dans globals.css) : sans
   ça, on ne peut pas lire une vignette qui passe, et l'œil poursuit une
   cible qu'il n'attrape jamais. Chaque vignette est un lien vers la démo
   réelle, donc l'arrêt sert aussi à cliquer.

   Le ruban est décoratif au sens strict — tout ce qu'il montre est repris
   dans la grille juste en dessous, avec les mêmes liens. Le duplicata est
   donc masqué aux lecteurs d'écran, qui n'ont pas à entendre vingt-deux
   noms deux fois de suite.
   ══════════════════════════════════════════════════════════════════════ */

export default function Ruban() {
  /* durée proportionnelle au nombre de vignettes : en ajouter ne doit pas
     accélérer le défilé, sinon le ruban s'emballe à chaque nouvel achat */
  const duree = `${MODELES.length * 3.2}s`;

  return (
    <div
      className="m-ruban relative overflow-hidden"
      style={{
        maskImage:
          "linear-gradient(to right, transparent 0%, #000 7%, #000 93%, transparent 100%)",
        WebkitMaskImage:
          "linear-gradient(to right, transparent 0%, #000 7%, #000 93%, transparent 100%)",
      }}
    >
      <div
        className="m-ruban-piste flex w-max gap-4"
        style={{ ["--m-ruban-duree" as string]: duree }}
      >
        {[0, 1].map((copie) =>
          MODELES.map((m) => (
            <a
              key={`${copie}-${m.slug}`}
              href={m.demo}
              target="_blank"
              rel="noopener noreferrer"
              aria-hidden={copie === 1 ? true : undefined}
              tabIndex={copie === 1 ? -1 : undefined}
              title={`${m.nom} : ${m.style}`}
              className="block w-[196px] shrink-0 opacity-85 transition-opacity duration-300 hover:opacity-100"
            >
              <MiniSite
                m={m}
                cadre={false}
                ton="clair"
                sizes="196px"
                className="ring-1 ring-black/[0.07]"
              />
            </a>
          ))
        )}
      </div>
    </div>
  );
}
