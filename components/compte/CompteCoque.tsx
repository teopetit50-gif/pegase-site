"use client";

/* ══════════════════════════════════════════════════════════════════════
   CompteCoque — l'écran de « Mon compte », en pleine page (15/09/2026)

   Teo, troisième retour : « c'est toujours aussi long, c'est toujours pas
   pleine page, et c'est encore amateur — utilise de vrais composants. »

   Le gabarit est `@uniquesonu/dashboard-with-collapsible-sidebar`
   (21st.dev, 629 téléchargements) : barre latérale repliable de 256 px
   collée en haut sur toute la hauteur de l'écran, identité en tête,
   entrées à icône avec l'active marquée d'un trait, groupe secondaire
   sous un filet, replieur en bas ; à droite, une zone de contenu qui
   occupe tout le reste, un titre, quatre tuiles de faits et des panneaux.
   Le relevé des valeurs et la liste de ce qui a été changé (couleurs,
   mode sombre retiré, tuiles sans chiffres inventés, hauteur d'écran)
   sont en tête de coque.css.

   CE QUI RÈGLE LES TROIS REPROCHES :

   · « pas pleine page » — la route n'utilise plus PageShell (colonne de
     1440 px, filets latéraux, pied de page). L'écran prend toute la
     largeur et `100dvh` moins le header du site, qui reste seul au-dessus.
   · « toujours long » — les sections ne sont plus empilées : ce sont des
     ONGLETS, un seul panneau à la fois. On ne défile plus pour atteindre
     son mot de passe, on clique. Sous 1024 px, la barre latérale cède la
     place à une rangée d'onglets en pastilles (la sidebar y mangerait la
     moitié de l'écran).
   · « amateur » — la géométrie, les proportions et les états viennent du
     gabarit, pas de mon jugement : tuiles à 12 de rayon, gouttière 16,
     entrées de 44 px, icône dans une gouttière de 46, trait d'actif de
     2 px.

   ACCESSIBILITÉ : ce sont de vrais onglets (Radix Tabs, déjà dans le
   projet), en `orientation="vertical"` — flèches haut/bas dans la barre,
   `aria-selected`, `role="tabpanel"`, et un seul index de tabulation pour
   la liste. Les deux listes (barre latérale et pastilles) partagent le
   même Root : cliquer dans l'une met l'autre à jour.

   LE CONTENU N'EST PAS ICI. La coque reçoit des onglets tout faits
   (`contenu`, `actions`, `tuiles`) depuis CompteVue, qui reste le seul
   endroit où se décide QUOI s'affiche — et qui est rendu côté serveur.
   ══════════════════════════════════════════════════════════════════════ */

import * as Tabs from "@radix-ui/react-tabs";
import {
  ChevronsRight,
  CreditCard,
  ExternalLink,
  LayoutGrid,
  ShieldCheck,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import "./coque.css";

export type CleOnglet = "apercu" | "abonnement" | "profil" | "securite";

export type OngletCompte = {
  cle: CleOnglet;
  /* le libellé de la barre — court, il vit dans 190 px */
  libelle: string;
  /* le titre de l'écran, et la phrase dessous */
  titre: string;
  sous: string;
  /* une pastille de comptage à droite de l'entrée (les commandes) */
  marque?: string;
  /* les boutons de l'en-tête de l'écran */
  actions?: React.ReactNode;
  contenu: React.ReactNode;
};

const ICONES: Record<CleOnglet, LucideIcon> = {
  apercu: LayoutGrid,
  abonnement: CreditCard,
  profil: UserRound,
  securite: ShieldCheck,
};

export default function CompteCoque({
  initiales,
  nom,
  sous,
  onglets,
  espaceHref,
  espaceLibelle,
}: {
  initiales: string;
  nom: string;
  sous: string;
  onglets: OngletCompte[];
  /* le lien vers l'espace client, dans le groupe bas de la barre */
  espaceHref: string;
  espaceLibelle: string;
}) {
  const [actif, setActif] = useState<CleOnglet>(onglets[0]?.cle ?? "apercu");
  const [replie, setReplie] = useState(false);
  const courant = onglets.find((o) => o.cle === actif) ?? onglets[0];

  return (
    <Tabs.Root
      className="cpt resa"
      data-replie={replie ? "oui" : "non"}
      value={actif}
      onValueChange={(v) => setActif(v as CleOnglet)}
      orientation="vertical"
    >
      {/* ——— la barre latérale (≥ 1024 px) ——— */}
      <nav className="cpt-flanc" aria-label="Mon compte">
        <div className="cpt-identite">
          <span className="cpt-pastille" aria-hidden="true">
            {initiales}
          </span>
          {replie ? null : (
            <span className="cpt-identite-texte">
              <span className="cpt-identite-nom">{nom}</span>
              <span className="cpt-identite-sous">{sous}</span>
            </span>
          )}
        </div>

        <Tabs.List className="cpt-nav" aria-label="Sections de mon compte">
          {onglets.map((o) => {
            const Icone = ICONES[o.cle];
            return (
              <Tabs.Trigger
                key={o.cle}
                value={o.cle}
                className="cpt-entree"
                /* `data-actif` par PRÉSENCE : Radix écrit data-state="active",
                   et un `data-[active=true]` de shadcn ne correspondrait
                   jamais (voir la mémoire adapter-un-composant-shadcn) */
                data-actif={actif === o.cle ? "" : undefined}
                title={replie ? o.libelle : undefined}
              >
                <span className="cpt-entree-icone" aria-hidden="true">
                  <Icone size={17} strokeWidth={1.75} />
                </span>
                {replie ? (
                  <span className="sr-only">{o.libelle}</span>
                ) : (
                  <span className="cpt-entree-titre">{o.libelle}</span>
                )}
                {o.marque && !replie ? (
                  <span className="cpt-entree-marque">{o.marque}</span>
                ) : null}
              </Tabs.Trigger>
            );
          })}
        </Tabs.List>

        <div className="cpt-groupe">
          {replie ? null : <p className="cpt-groupe-titre">Votre espace</p>}
          <a href={espaceHref} className="cpt-entree" title={replie ? espaceLibelle : undefined}>
            <span className="cpt-entree-icone" aria-hidden="true">
              <ExternalLink size={17} strokeWidth={1.75} />
            </span>
            {replie ? (
              <span className="sr-only">{espaceLibelle}</span>
            ) : (
              <span className="cpt-entree-titre">{espaceLibelle}</span>
            )}
          </a>
          <form action="/auth/signout" method="post">
            <button type="submit" className="cpt-entree w-full">
              <span className="cpt-entree-icone" aria-hidden="true">
                {/* la porte de sortie : une flèche qui sort du cadre */}
                <svg
                  width="17"
                  height="17"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <path d="m16 17 5-5-5-5" />
                  <path d="M21 12H9" />
                </svg>
              </span>
              {replie ? (
                <span className="sr-only">Se déconnecter</span>
              ) : (
                <span className="cpt-entree-titre">Se déconnecter</span>
              )}
            </button>
          </form>
        </div>

        <button
          type="button"
          className="cpt-replieur"
          onClick={() => setReplie((r) => !r)}
          aria-expanded={!replie}
        >
          <span className="cpt-replieur-icone" aria-hidden="true">
            <ChevronsRight size={17} strokeWidth={1.75} />
          </span>
          {replie ? (
            <span className="sr-only">Déplier le menu</span>
          ) : (
            <span className="cpt-entree-titre">Replier</span>
          )}
        </button>
      </nav>

      {/* ——— la zone de contenu ——— */}
      <div className="cpt-contenu">
        {/* sous 1024 px : les mêmes onglets, en pastilles */}
        <Tabs.List className="cpt-onglets" aria-label="Sections de mon compte">
          {onglets.map((o) => {
            const Icone = ICONES[o.cle];
            return (
              <Tabs.Trigger
                key={o.cle}
                value={o.cle}
                className="cpt-onglet"
                data-actif={actif === o.cle ? "" : undefined}
              >
                <Icone size={15} strokeWidth={1.75} aria-hidden="true" />
                {o.libelle}
              </Tabs.Trigger>
            );
          })}
        </Tabs.List>

        <header className="cpt-tete">
          <div className="min-w-0">
            <h1 className="cpt-titre">{courant.titre}</h1>
            <p className="cpt-sous">{courant.sous}</p>
          </div>
          {courant.actions ? <div className="cpt-actions">{courant.actions}</div> : null}
        </header>

        {onglets.map((o) => (
          <Tabs.Content key={o.cle} value={o.cle} className="min-w-0">
            {o.contenu}
          </Tabs.Content>
        ))}

        {/* Sous 1024 px la barre latérale n'est pas rendue — et elle porte
            « Mon espace client » ET « Se déconnecter ». Sans ce pied, un
            visiteur sur téléphone n'a plus de porte de sortie. */}
        <div className="cpt-pied">
          <a href={espaceHref} className="cp-lien">
            {espaceLibelle}
          </a>
          <form action="/auth/signout" method="post">
            <button type="submit" className="cp-lien">
              Se déconnecter
            </button>
          </form>
        </div>
      </div>
    </Tabs.Root>
  );
}
