"use client";
/* ══════════════════════════════════════════════════════════════════════
   La barre du site Tamila — la barre du modèle Radius (11/11/2026)

   Teo : « refais exactement le même design que ce site […] en 1:1 ». La
   page /secteurs/avocats est désormais le dessin de
   https://radius.nextjsshop-preview.workers.dev/ (voir l'en-tête de
   app/secteurs/avocats/page.tsx) ; cette barre est son en-tête, classe
   pour classe : collante, 64 px, blanche, filet gris-100 ; colonne
   max-w-7xl (px 16 / 24 / 32) ; à gauche le signe (h-6) et le nom en
   18 px semi-gras ; au centre, dès `md`, six entrées en 14 px médium
   gris-700 ; à droite « Connexion » (le « Log in » du modèle, vers
   l'espace client du logiciel, comme la barre Daliro) et le bouton noir ;
   sous `md`, le bouton menu et le volet déroulant du modèle (max-h 0 →
   500 px en 500 ms, entrées qui montent une à une, 60 ms d'écart).
   Les entrées sont des ANCRES vers les sections de la page (communs.tsx,
   LienSection) ; leurs `id` sont posés dans components/secteurs/avocats.
   Couleurs du modèle : gris-100 #f3f4f6, -50 #f9fafb, -700 #364153,
   -800 #1e2939, -900 #101828 (palette Tailwind v4, en hexadécimal pour
   ne pas dépendre du thème du site).
   ══════════════════════════════════════════════════════════════════════ */
import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Glyphe } from "@/components/secteurs/avocats/marque";
import { LienSection, type Entree } from "./communs";

/* Six entrées, comme le modèle — courtes : à 768 px, les six mots anglais du
   modèle tiennent tout juste (715 px sur 720) ; « Vérification » et « Outils »
   n'apparaissent qu'à partir de `lg` (`large`), sinon la barre déborde de la
   fenêtre à 768 (constaté : 853 px de large). */
const ENTREES: (Entree & { large?: boolean })[] = [
  { label: "Pourquoi", id: "fonctionnalites" },
  { label: "Secret", id: "secret" },
  { label: "Vérification", id: "verification", large: true },
  { label: "Formules", id: "formules" },
  { label: "Outils", id: "outils", large: true },
  { label: "Point du matin", id: "point-du-matin" },
];
const CTA = { label: "Réserver un audit", id: "audit" };
const CONNEXION = { label: "Connexion", href: "/espace2/tamila" };

const ENTREE = "text-sm font-medium text-[#364153] transition-colors hover:text-[#101828]";
const BOUTON = "rounded-lg bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1e2939]";
const ENTREE_VOLET = "block rounded-md px-3 py-3 text-base font-medium text-[#364153] transition-all duration-300 hover:bg-[#f9fafb] hover:text-[#101828]";

export default function BarreTamila() {
  const [ouvert, setOuvert] = useState(false);
  const etat = ouvert ? "translate-y-0 opacity-100" : "-translate-y-4 opacity-0";
  const fermer = () => setOuvert(false);
  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#f3f4f6] bg-white" style={{ viewTransitionName: "site-header", fontFamily: '"Geist", "Geist Fallback", ui-sans-serif, system-ui, sans-serif' }}>
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2" aria-label="Tamila, accueil">
          <Glyphe className="h-6 w-6 text-[#101828]" />
          <span className="text-lg font-semibold text-[#101828]">Tamila</span>
        </Link>
        <div className="hidden items-center gap-8 md:flex">
          {ENTREES.map((l) => (
            <LienSection key={l.id} id={l.id} className={`${ENTREE} ${l.large ? "hidden lg:inline" : ""}`}>
              {l.label}
            </LienSection>
          ))}
        </div>
        <div className="hidden items-center gap-6 md:flex">
          <Link href={CONNEXION.href} className={ENTREE}>
            {CONNEXION.label}
          </Link>
          <LienSection id={CTA.id} className={BOUTON}>
            {CTA.label}
          </LienSection>
        </div>
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-md p-2 text-[#364153] transition-colors hover:bg-[#f3f4f6] md:hidden"
          aria-label="Ouvrir le menu"
          aria-expanded={ouvert}
          onClick={() => setOuvert((o) => !o)}
        >
          {ouvert ? <X className="h-6 w-6" aria-hidden="true" /> : <Menu className="h-6 w-6" aria-hidden="true" />}
        </button>
      </nav>
      <div className={`overflow-hidden transition-all duration-500 ease-in-out md:hidden ${ouvert ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"}`}>
        <div className="space-y-1 border-t border-[#f3f4f6] bg-white px-4 pb-6 pt-2 sm:px-6">
          {ENTREES.map((l, i) => (
            <LienSection key={l.id} id={l.id} onClick={fermer} className={`${ENTREE_VOLET} transform ${etat}`}>
              <span style={{ transitionDelay: ouvert ? `${60 * i}ms` : "0ms" }}>{l.label}</span>
            </LienSection>
          ))}
          <div className="mt-4 space-y-3 border-t border-[#f3f4f6] pt-4">
            <Link href={CONNEXION.href} onClick={fermer} className={`block rounded-md px-3 py-3 text-base font-medium text-[#364153] transition-all duration-300 hover:bg-[#f9fafb] ${etat}`} style={{ transitionDelay: ouvert ? `${60 * ENTREES.length}ms` : "0ms" }}>
              {CONNEXION.label}
            </Link>
            <LienSection id={CTA.id} onClick={fermer} className={`block rounded-lg bg-black px-4 py-3 text-center text-base font-medium text-white transition-all duration-300 hover:bg-[#1e2939] ${etat}`}>
              {CTA.label}
            </LienSection>
          </div>
        </div>
      </div>
    </header>
  );
}
