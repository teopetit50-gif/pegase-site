/* ══════════════════════════════════════════════════════════════════════
   Le pied du site Tamila — le pied du modèle Radius (11/11/2026)

   Rendu par components/site-dedie/Pied.tsx sur le déploiement dédié
   tamila, à la place du pied commun des sites dédiés. Classe pour classe,
   le `<footer>` du modèle (voir l'en-tête de app/secteurs/avocats/
   page.tsx) : filet haut, fond blanc, colonne de 1500 px ; à gauche le
   signe et le nom, une phrase, puis quatre colonnes de liens (titres en
   capitales espacées, liens gris) ; en bas, le filet, le copyright et
   une rangée de liens. Ce qui ne vient pas : les icônes de réseaux et la
   pastille « All systems normal » du modèle (comptes et promesse que
   Tamila n'a pas), les pages Produit / Blog / Legal (le site dédié n'a
   qu'une page : tous les liens sont des ancres vers ses sections, et
   « Réserver un audit » mène à #audit).
   ══════════════════════════════════════════════════════════════════════ */
import Link from "next/link";
import { Glyphe } from "@/components/secteurs/avocats/marque";
import { HERO } from "@/components/secteurs/avocats/textes";

const COLONNES: { titre: string; liens: { label: string; href: string; neuf?: boolean }[] }[] = [
  {
    titre: "Le dossier",
    liens: [
      { label: "Fonctionnalités", href: "/#fonctionnalites" },
      { label: "Vérification", href: "/#verification" },
      { label: "Rapport de cohérence", href: "/#audit-dossier" },
      { label: "Point du matin", href: "/#point-du-matin" },
    ],
  },
  {
    titre: "Le cabinet",
    liens: [
      { label: "Matières", href: "/#matieres" },
      { label: "Formules", href: "/#formules" },
      { label: "Vos outils", href: "/#outils" },
      { label: "Réserver un audit", href: "/#audit" },
    ],
  },
  {
    titre: "Secret professionnel",
    liens: [
      { label: "Six engagements", href: "/#secret" },
      { label: "Hébergement et droit applicable", href: "/#souverainete" },
    ],
  },
  /* 11/11 — la colonne « Compte » (Connexion vers l'espace client) est partie : Teo, « Connexion, ça disparaît aussi » */
];

const LIEN = "inline-block text-sm text-[#524f49] transition-colors duration-200 hover:text-[#0f0e0d]";

export default function PiedTamila() {
  return (
    <footer
      className="mx-[calc(50%-50vw)] border-t border-[#e5e5e3] bg-white"
      aria-labelledby="pied-tamila"
      /* `background` et `border-top-color` en ligne : la section #audit qui précède
         (`.rdv`) repeint « .rdv ~ footer » en noir (app/reserver-un-audit/reserver.css,
         pour le pied d'Omega) ; le pied du modèle est blanc. */
      style={{ fontFamily: '"Geist", "Geist Fallback", ui-sans-serif, system-ui, sans-serif', background: "#ffffff", borderTopColor: "#e5e5e3" }}
    >
      <h2 id="pied-tamila" className="sr-only">
        Pied de page
      </h2>
      <div className="mx-auto max-w-[1500px] px-4 sm:px-6 md:px-8 lg:px-12">
        <div className="grid grid-cols-1 gap-10 py-12 sm:gap-12 sm:py-16 md:grid-cols-12 md:gap-8 md:py-20 lg:gap-12">
          <div className="flex flex-col gap-6 md:col-span-4">
            <Link aria-label="Tamila, accueil" href="/">
              <div className="flex items-center gap-2">
                <Glyphe className="h-6 w-6 text-[#0f0e0d]" />
                <span className="text-lg font-medium tracking-tight text-[#0f0e0d]">Tamila</span>
              </div>
            </Link>
            <p className="max-w-sm text-sm leading-relaxed text-[#524f49]">{HERO.annonce}.</p>
          </div>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 sm:gap-6 md:col-span-8 md:gap-8 lg:gap-12">
            {COLONNES.map((c) => (
              <div key={c.titre} className="flex flex-col gap-4">
                <h3 className="text-xs font-medium uppercase tracking-wider text-[#0f0e0d]">{c.titre}</h3>
                <ul className="flex flex-col gap-3">
                  {c.liens.map((l) => (
                    <li key={l.href + l.label}>
                      <Link className={LIEN} href={l.href}>
                        <span className="inline-flex items-center gap-2">{l.label}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col items-start justify-between gap-4 border-t border-[#e5e5e3] py-6 sm:flex-row sm:items-center sm:py-8">
          <p className="text-xs text-[#6e6a65] sm:text-sm">© 2026 Tamila. Tous droits réservés.</p>
          <ul className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <li>
              <Link className={LIEN} href="/#audit">
                <span className="inline-flex items-center gap-2">Réserver un audit</span>
              </Link>
            </li>
            <li>
              <Link className={LIEN} href="/#souverainete">
                <span className="inline-flex items-center gap-2">Hébergement des pièces</span>
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
