"use client";

import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import Link from "next/link";
import { GrainGradient } from "@paper-design/shaders-react";
import { ShieldCheck } from "lucide-react";
import "./auth-section-1.css";

/* ══════════════════════════════════════════════════════════════════════
   AuthSectionOne — la coque de la porte /connexion (14/09/2026)

   Origine : « auth-section-1 » (solaceui, via 21st.dev), collé par Teo
   pour remplacer la page de connexion. La référence est un écran
   d'inscription autonome : une carte blanche filetée à gauche (titre,
   sous-titre, deux boutons sociaux, « or », champs, conditions, Submit)
   et, à droite, un panneau noir peint par le GrainGradient de
   @paper-design/shaders-react, avec un grand titre et un bouton de
   téléchargement.

   Ce qu'on garde au pixel : la grille `lg:grid-cols-[0.94fr_1.06fr]`
   gap-6 dans un cadre p-3, la carte (rounded-md, border black/20, px-6 →
   xl:px-20, py-12 → lg:py-28, colonne de 590), le h1 (30 → 50 px, 500,
   -0.04em), le sous-titre (black/60), le panneau (rounded-md, p-8 →
   sm:p-12, h2 48 → 70 px, -0.05em, leading .98), le bouton-lien du bas
   (h-12, border white/25, backdrop-blur) et la recette du shader
   (softness .5, intensity .5, noise .25, shape corners, frame 2854.5).

   Ce qu'on a jeté : le formulaire factice (FieldBox à valeur pré-remplie,
   cases à cocher, Submit mort) — ici le formulaire est le module de
   connexion PARTAGÉ du site, passé en `children` ; les boutons Google /
   Apple (le compte Omega n'a pas de connexion sociale) — leur place est
   prise par les deux portes du module, réhabillées dans
   auth-section-1.css ; le « or » ; les icônes Google/Apple/Windows ;
   toutes les variantes `dark:` (le site est clair).

   Écarts assumés :
   · la palette du panneau. La référence est orange (#FC7819) ; le site
     est blanc et noir, et Teo a déjà fait retirer ce qui s'en écartait
     (accueil-omega-refus-bandes-noires : « pas assez noir »). On prend
     les quatre gris du fond Silk de l'accueil — même famille, même
     matière. Rendre l'orange = changer COULEURS, une ligne.
   · pas de `whitespace-nowrap` sur le h1 ni le sous-titre : en anglais
     « Create an account » tient sur une ligne, « Se connecter ou créer
     un compte » non, et un nowrap déborde de la carte à 1024.
   · le sous-titre plafonne à text-2xl (la référence monte à 3xl) : le
     budget est celui d'une ligne, et 44 signes à 30 px n'y tiennent pas.
   · `self-start` sur le bouton-lien : enfant d'une colonne flex, il
     serait étiré sur toute la largeur du panneau.
   · le panneau fait 420 px sous `lg` (720 sur la référence) : empilé
     sous le formulaire, il ne porte qu'une phrase et un lien.
   · le h2 du panneau : 36 px sous `sm` (48 sur la référence) et 52 px
     entre `lg` et `xl` (64) — « Think fast, » fait 11 signes, « Un seul
     compte » 14 et « pour tout Omega. » 16 : aux tailles de la référence
     le titre passait sur QUATRE lignes à 390 et à 1024 (mesuré le 14/09).
     64 px dès `xl`, 70 dès `2xl` — à 1440 le panneau a 640 px utiles.
   · `prefers-reduced-motion` : le shader s'arrête (speed 0) sur son
     image de départ, comme le fond Silk de l'accueil.
   · le shader n'est monté QU'APRÈS une sonde WebGL réussie. Vu à la
     recette du 14/09 : sans WebGL, @paper-design/shaders LÈVE une
     exception (« WebGL is not supported in this browser ») depuis son
     effet de montage — et une exception dans un effet fait tomber tout
     l'arbre jusqu'à la frontière d'erreur la plus proche, c'est-à-dire
     la page entière, formulaire compris. Un navigateur sans WebGL
     (poste verrouillé, accélération coupée, sonde de recette) doit
     pouvoir se connecter : il voit le panneau noir, le titre et le
     lien, sans nuancier.
   ══════════════════════════════════════════════════════════════════════ */

type Props = {
  titre: string;
  sousTitre: string;
  /* le grand titre du panneau noir — deux lignes, passer un <br /> */
  panneauTitre: ReactNode;
  /* le bouton-lien en bas du panneau */
  lien: { href: string; libelle: string };
  /* le formulaire */
  children: ReactNode;
};

/* les quatre gris du fond Silk de l'accueil (components/accueil/FondSilk) :
   0.961 → #f5f5f5, 0.690 → #b0b0b0, 0.227 → #3a3a3a. Blanc aux deux bouts
   comme la référence, qui encadre son orange de blanc. */
const COULEURS = ["#F5F5F5", "#B0B0B0", "#3A3A3A", "#F5F5F5"];

/* WebGL disponible ? Sondé une fois par page, en mémoire ensuite. Lu par
   useSyncExternalStore : `null` pour le rendu serveur ET l'hydratation
   (les deux arbres concordent), la vraie réponse au rendu suivant — le
   shader ne se monte que sur `true`. Pas d'effet, pas de setState. */
let webglSonde: boolean | null = null;
function sonderWebGL(): boolean {
  if (webglSonde === null) {
    try {
      const c = document.createElement("canvas");
      const gl = c.getContext("webgl2") ?? c.getContext("webgl");
      webglSonde = Boolean(gl);
      /* on rend le contexte tout de suite : la sonde ne doit pas compter
         parmi les contextes vivants (les navigateurs en plafonnent le
         nombre par page) */
      gl?.getExtension("WEBGL_lose_context")?.loseContext();
    } catch {
      webglSonde = false;
    }
  }
  return webglSonde;
}
const rienASuivre = () => () => {};
function useWebGL(): boolean | null {
  return useSyncExternalStore(rienASuivre, sonderWebGL, () => null);
}

function useMouvementReduit() {
  const [reduit, setReduit] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const lire = () => setReduit(mq.matches);
    lire();
    mq.addEventListener("change", lire);
    return () => mq.removeEventListener("change", lire);
  }, []);
  return reduit;
}

export default function AuthSectionOne({ titre, sousTitre, panneauTitre, lien, children }: Props) {
  const reduit = useMouvementReduit();
  const webgl = useWebGL();

  return (
    <section className="auth1 r-blanc p-3 text-[#050505] antialiased [font-synthesis:none]">
      <div className="grid gap-6 lg:min-h-[calc(100dvh-96px)] lg:grid-cols-[0.94fr_1.06fr]">
        {/* ——— la carte : titre, sous-titre, puis le module de connexion ——— */}
        <div className="flex items-start rounded-md border border-black/20 bg-white px-6 py-12 sm:px-10 lg:px-14 lg:py-28 xl:px-20">
          <div className="mx-auto w-full max-w-[590px]">
            <h1
              data-arrivee="titre"
              className="text-balance text-3xl font-medium tracking-[-0.04em] sm:text-4xl lg:text-[42px] lg:leading-[1.05] xl:text-[50px]"
            >
              {titre}
            </h1>
            <p data-arrivee="chapo" className="mt-3 text-balance text-lg leading-snug text-black/60 sm:text-xl lg:text-2xl">
              {sousTitre}
            </p>
            <div data-arrivee="bloc">{children}</div>
          </div>
        </div>

        {/* ——— le panneau : nuancier granuleux, grand titre, lien ——— */}
        <div
          data-arrivee="colonne"
          className="relative flex min-h-[420px] overflow-hidden rounded-md bg-black p-8 text-white sm:p-12 lg:min-h-0"
        >
          {webgl ? (
            <GrainGradient
              speed={reduit ? 0 : 1}
              scale={1}
              rotation={0}
              offsetX={0}
              offsetY={0}
              softness={0.5}
              intensity={0.5}
              noise={0.25}
              shape="corners"
              frame={2854.5}
              colors={COULEURS}
              colorBack="#00000000"
              className="absolute inset-0 bg-black"
            />
          ) : null}

          <div className="relative z-10 flex h-full w-full flex-col justify-between">
            {/* 15/09 — 28 px sous 480 : le panneau sombre fait toute la
                largeur sur téléphone, et `text-4xl` (36/40) y donnait deux
                lignes de titre pour une phrase de quatre mots. Rien ne
                change à partir de `sm`. */}
            <h2 className="max-w-[620px] pt-0 text-[28px] font-medium tracking-[-0.05em] text-white min-[480px]:text-4xl sm:text-6xl lg:pt-16 lg:text-[52px] lg:leading-[0.98] xl:text-[64px] 2xl:text-[70px]">
              {panneauTitre}
            </h2>

            <Link
              href={lien.href}
              className="mt-10 inline-flex h-12 max-w-full items-center gap-3 self-start rounded-[10px] border border-white/25 px-5 text-base font-medium text-white/85 backdrop-blur-sm transition-colors hover:border-white/45 hover:text-white xl:mb-32 xl:px-6 xl:text-2xl"
            >
              <ShieldCheck className="size-5 shrink-0 xl:size-7" aria-hidden="true" />
              <span className="truncate whitespace-nowrap">{lien.libelle}</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
