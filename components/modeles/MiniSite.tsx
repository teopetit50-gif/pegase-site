import Image from "next/image";
import { capture, type Modele } from "./donnees";

/* ══════════════════════════════════════════════════════════════════════
   <MiniSite> — une vitrine du catalogue, dans son cadre de navigateur.

   Version du 03/08 (soir) : le corps était jusqu'ici un faux site rendu en
   CSS, faute de licences achetées. Teo ayant acheté et déployé les
   templates, on affiche désormais la CAPTURE RÉELLE de son déploiement.
   C'est le seul fichier qu'il a fallu toucher — la mosaïque et la page
   n'ont pas bougé d'une ligne, ce que la v1 avait prévu.

   Le cadre de navigateur (barre à trois pastilles + adresse) n'est pas de
   la décoration : sans lui, une capture de site posée sur une page de site
   se lit comme une section de CETTE page, pas comme un aperçu d'un autre
   site. La barre lève l'ambiguïté en une fraction de seconde.

   `priority` est réservé aux vignettes du mur, visibles au chargement :
   les cartes du catalogue, plus bas, se chargent en paresseux.
   ══════════════════════════════════════════════════════════════════════ */

export default function MiniSite({
  m,
  page = 0,
  className = "",
  cadre = true,
  ton = "sombre",
  priority = false,
  sizes = "(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 22vw",
}: {
  m: Modele;
  /* index dans m.pages : 0 = accueil, 1+ = pages internes du même site */
  page?: number;
  className?: string;
  /* le collage du hero se passe du chrome de navigateur : à 200 px de large
     la barre mangerait un dixième de la vignette pour rien */
  cadre?: boolean;
  /* ton du CADRE, pas du contenu — la capture, elle, ne change jamais.
     « clair » sert les cartes du catalogue, posées sur le panneau gris du
     monde blanc, où un chrome sombre ferait une tache. */
  ton?: "sombre" | "clair";
  priority?: boolean;
  sizes?: string;
}) {
  const clair = ton === "clair";
  const fond = m.theme === "sombre" ? "#0e1116" : "#faf8f5";

  return (
    <div
      className={`overflow-hidden rounded-[10px] border ${
        clair ? "border-black/[0.08] bg-[#f7f7f7]" : "border-white/[0.09] bg-[#0e1116]"
      } ${className}`}
    >
      {cadre && (
        <div
          className={`flex items-center gap-2 border-b px-3 py-2 ${
            clair ? "border-black/[0.07] bg-[#efefef]" : "border-white/[0.07] bg-[#14171d]"
          }`}
        >
          <span className="flex gap-1.5">
            {[0, 1, 2].map((k) => (
              <i
                key={k}
                className={`block h-[7px] w-[7px] rounded-full ${
                  clair ? "bg-black/15" : "bg-white/20"
                }`}
              />
            ))}
          </span>
          <span
            className={`ml-1 truncate font-mono text-[10px] leading-none ${
              clair ? "text-black/40" : "text-muted/70"
            }`}
          >
            {m.nom.toLowerCase()}.fr
          </span>
        </div>
      )}

      <div className="relative" style={{ aspectRatio: "4 / 3", background: fond }}>
        <Image
          src={capture(m, page)}
          alt={
            page === 0
              ? `Aperçu du modèle ${m.nom} : ${m.style}`
              : `Modèle ${m.nom}, page intérieure`
          }
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover object-top"
        />
      </div>
    </div>
  );
}
