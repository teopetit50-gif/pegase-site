"use client";
/* ══════════════════════════════════════════════════════════════════════
   Les pièces communes aux six barres des sites dédiés (10/11/2026)

   Teo : « pour la barre du haut tu dois aller récupérer la barre du haut
   du site modèle de base, car on a copié le design, et ça doit pas
   renvoyer vers une page quand on clique dessus mais vers la section
   correspondante ». Chaque barre (Daliro.tsx, Lorani.tsx…) reprend le
   dessin de l'en-tête du site source (dossier-omega/<site>/src/components/
   nav*.tsx) ; ses entrées sont des ANCRES vers les sections de la page.

   · `Lockup` : le logo signe + mot du logiciel (public/logos/<clé>-lockup.png,
     un masque alpha rendu en `currentColor`, comme btp/marque.tsx).
   · `LienSection` : un lien « /#section ». Sur la page d'accueil il fait
     défiler en douceur sans recharger ; depuis une autre page (/contact,
     /vos-donnees) il ramène à l'accueil puis à la section.
   · `Panneau` : le menu de téléphone, le même pour les six — un volet
     blanc plein écran avec les entrées et l'appel à l'action.
   ══════════════════════════════════════════════════════════════════════ */
import { useEffect, useState, type CSSProperties, type MouseEvent, type ReactNode } from "react";
import { Menu, X } from "lucide-react";

export type Entree = { label: string; id: string };

export function Lockup({ src, ratio, className = "", label }: { src: string; ratio: string; className?: string; label: string }) {
  const masque: CSSProperties = {
    aspectRatio: ratio,
    WebkitMaskImage: `url(${src})`,
    maskImage: `url(${src})`,
    WebkitMaskSize: "contain",
    maskSize: "contain",
    WebkitMaskRepeat: "no-repeat",
    maskRepeat: "no-repeat",
    WebkitMaskPosition: "left center",
    maskPosition: "left center",
  };
  return <span role="img" aria-label={label} className={`inline-block shrink-0 bg-current ${className}`} style={masque} />;
}

export function allerALaSection(e: MouseEvent<HTMLAnchorElement>, id: string) {
  if (window.location.pathname !== "/") return;
  const cible = document.getElementById(id);
  if (!cible) return;
  e.preventDefault();
  cible.scrollIntoView({ behavior: "smooth", block: "start" });
  window.history.replaceState(window.history.state, "", `#${id}`);
}

export function LienSection({ id, className, children, onClick }: { id: string; className?: string; children: ReactNode; onClick?: () => void }) {
  return (
    <a
      href={`/#${id}`}
      className={className}
      onClick={(e) => {
        onClick?.();
        allerALaSection(e, id);
      }}
    >
      {children}
    </a>
  );
}

export function Panneau({
  marque,
  entrees,
  cta,
  classeBouton = "inline-flex size-9 items-center justify-center rounded-md text-[#171717] hover:bg-black/5",
}: {
  marque: ReactNode;
  entrees: Entree[];
  cta: { label: string; id: string };
  classeBouton?: string;
}) {
  const [ouvert, setOuvert] = useState(false);
  useEffect(() => {
    if (!ouvert) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && setOuvert(false);
    window.addEventListener("keydown", k);
    document.documentElement.classList.add("overflow-hidden");
    return () => {
      window.removeEventListener("keydown", k);
      document.documentElement.classList.remove("overflow-hidden");
    };
  }, [ouvert]);
  return (
    <>
      <button type="button" aria-label="Ouvrir le menu" aria-expanded={ouvert} className={classeBouton} onClick={() => setOuvert(true)}>
        <Menu className="size-5" />
      </button>
      {ouvert ? (
        <div className="fixed inset-0 z-[70] flex flex-col bg-white text-[#171717]" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="flex h-16 items-center justify-between px-4">
            {marque}
            <button type="button" aria-label="Fermer le menu" className={classeBouton} onClick={() => setOuvert(false)}>
              <X className="size-5" />
            </button>
          </div>
          <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-4 pt-4" aria-label="Sections de la page">
            {entrees.map((l) => (
              <LienSection key={l.id} id={l.id} className="block py-3 text-2xl font-medium" onClick={() => setOuvert(false)}>
                {l.label}
              </LienSection>
            ))}
            <LienSection
              id={cta.id}
              className="mt-6 inline-flex h-12 items-center justify-center rounded-md bg-[#171717] px-5 text-base font-medium text-white"
              onClick={() => setOuvert(false)}
            >
              {cta.label}
            </LienSection>
          </nav>
        </div>
      ) : null}
    </>
  );
}
