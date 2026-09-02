import Link from "next/link";
import MiniSite from "./MiniSite";
import type { Modele } from "./donnees";
import { lienContact } from "@/lib/reservation";

/* ══════════════════════════════════════════════════════════════════════
   <CarteModele> — une entrée du catalogue.

   Extraite de la page le 03/08, quand le catalogue est passé d'une grille
   unique de vingt-deux à quatre sections rangées par usage : la carte est
   désormais rendue depuis <Categorie>, qui est un composant client, et
   elle devait donc vivre ailleurs que dans le corps de la page.

   Elle reste un composant SERVEUR : elle n'a aucun état, seul le
   dépliage « voir plus » en a un. Autant ne pas envoyer au navigateur le
   balisage de vingt-deux cartes pour un bouton.

   Deux liens à l'intérieur, jamais un lien englobant : visiter la démo et
   demander le modèle. Un <a> dans un <a> est invalide, et le navigateur
   défait le balisage à sa façon si on essaie quand même.

   02/09 — un troisième lien, discret, sous les deux autres : « Commander
   avec ce modèle » → /site/commande?modele=<slug>, le tunnel de commande
   avec le modèle pré-sélectionné. Petit et en retrait : /modeles reste
   une galerie, pas une page de vente — le prix se lit sur /tarifs/site.
   ══════════════════════════════════════════════════════════════════════ */

export default function CarteModele({ m }: { m: Modele }) {
  return (
    <div data-reveal className="m-carte group flex flex-col p-3">
      <a
        href={m.demo}
        target="_blank"
        rel="noopener noreferrer"
        className="block"
        aria-label={`Ouvrir la démonstration du modèle ${m.nom} dans un nouvel onglet`}
      >
        <MiniSite
          m={m}
          ton="clair"
          sizes="(max-width: 640px) 88vw, (max-width: 1280px) 44vw, 29vw"
          className="transition-transform duration-500 group-hover:scale-[1.012]"
        />
      </a>

      {/* Les pages intérieures. Un patron de petite entreprise qui regarde un modèle se
          demande « et les autres pages, elles ressemblent à quoi ? ». Les
          montrer répond avant qu'il pose la question, et prouve qu'on vend
          un site et pas une page d'accueil. */}
      {m.pages.length > 1 && (
        <div className="m-pages mt-2 grid grid-cols-3 gap-2 opacity-70 group-hover:translate-y-[-2px] group-hover:opacity-100">
          {m.pages.slice(1).map((suffixe, i) => (
            <a
              key={suffixe}
              href={m.demo}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Page intérieure du modèle ${m.nom}`}
              className="block overflow-hidden rounded-[6px] transition-transform duration-300 hover:scale-[1.04]"
            >
              <MiniSite
                m={m}
                page={i + 1}
                cadre={false}
                ton="clair"
                sizes="(max-width: 640px) 28vw, 14vw"
                className="!rounded-[6px]"
              />
            </a>
          ))}
        </div>
      )}

      <div className="flex flex-1 flex-col px-2 pb-1 pt-4">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-[17px]">{m.nom}</h3>
          <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.13em] text-[color:var(--m-faible)]">
            {m.pages.length > 1 ? `${m.pages.length} pages` : "Démo"}
          </span>
        </div>

        <p className="mt-1.5 text-[13px] text-[color:var(--m-faible)]">{m.style}</p>

        {/* Dit franchement quand l'entrée n'est pas une vitrine — Summit est
            une interface d'application, Material Kit une bibliothèque. Les
            vendre comme des sites serait faux, et ça se verrait au premier
            clic. */}
        {m.reserve && (
          <p className="mt-2.5 rounded-[6px] bg-black/[0.045] px-2.5 py-1.5 text-[12px] leading-snug text-[color:var(--m-doux)]">
            {m.reserve}
          </p>
        )}

        <p className="mt-3.5 text-[13.5px] leading-relaxed">
          <span className="text-[color:var(--m-faible)]">Va bien à&nbsp;: </span>
          <span className="text-[color:var(--m-doux)]">{m.pour}</span>
        </p>
        <p className="mt-2 text-[13.5px] leading-relaxed text-[color:var(--m-doux)]">{m.capte}</p>

        <div className="mt-auto flex flex-wrap items-center gap-x-5 gap-y-2 pt-5">
          <a
            href={m.demo}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[13.5px] font-medium underline-offset-4 hover:underline"
          >
            Visiter la démo
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path
                d="M5.5 10.5 10.5 5.5M6.5 5.5h4v4"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </a>
          <a
            href={lienContact(
              `Modèle ${m.nom}`,
              `Bonjour, je viens de voir le modèle « ${m.nom} » sur votre site et j'aimerais quelque chose comme ça pour mon entreprise.`
            )}
            className="inline-flex items-center gap-1.5 text-[13.5px] font-medium text-[color:var(--m-doux)] underline-offset-4 hover:text-[color:var(--m-encre)] hover:underline"
          >
            Je veux ce modèle
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path
                d="M3 8h10M9 4l4 4-4 4"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </a>
        </div>
        <p className="mt-2.5 text-[12.5px] text-[color:var(--m-faible)]">
          <Link
            href={`/site/commande?modele=${m.slug}`}
            className="underline-offset-4 hover:text-[color:var(--m-encre)] hover:underline"
          >
            Commander avec ce modèle
          </Link>
        </p>
      </div>
    </div>
  );
}
