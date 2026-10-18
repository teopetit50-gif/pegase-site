"use client";

/* Le sélecteur ⌃⌄ d'une page du pilotage (09/10/2026) : il remplace la
   rangée d'onglets. Un seul bouton, au style du choix de secteur des
   Entreprises ; le menu range les vues par rubrique (`groupe`). Changer de
   vue change le contenu à la même place — rien ne s'ajoute sous la page. */

import { Check, ChevronsUpDown } from "lucide-react";
import { ItemMenu, MenuDeroulant, SectionMenu, SeparateurMenu } from "@/components/espace2/ui";
import type { OngletPage } from "./pages";

export default function SelecteurVue({ page, titre, onglets, actif }: { page: string; titre: string; onglets: OngletPage[]; actif: string }) {
  const base = `/omega/${page}`;
  const courant = onglets.find((o) => o.cle === actif) ?? onglets[0];
  const groupes: { titre?: string; onglets: OngletPage[] }[] = [];
  for (const o of onglets) {
    const dernier = groupes[groupes.length - 1];
    if (dernier && dernier.titre === o.groupe) dernier.onglets.push(o);
    else groupes.push({ titre: o.groupe, onglets: [o] });
  }
  return (
    <MenuDeroulant
      etiquette={`${titre} : ${courant.libelle}. Changer de vue`}
      classe="v2-portee om-portee-secteur om-vue"
      placement="bottom start"
      largeur={280}
      declencheur={
        <>
          <span className="v2-portee-nom">{courant.libelle}</span>
          <ChevronsUpDown width={14} height={14} aria-hidden="true" />
        </>
      }
    >
      {groupes.map((g, i) => {
        const items = g.onglets.map((o) => (
          <ItemMenu key={o.cle || "accueil"} id={o.cle || "accueil"} href={o.cle ? `${base}/${o.cle}` : base} textValue={o.libelle} suffixe={o.cle === courant.cle ? <Check width={14} height={14} aria-hidden="true" /> : null}>
            {o.libelle}
          </ItemMenu>
        ));
        return g.titre ? (
          <SectionMenu key={g.titre} titre={g.titre}>
            {items}
          </SectionMenu>
        ) : (
          <SectionMenu key={`g${i}`}>{items}</SectionMenu>
        );
      }).flatMap((el, i) => (i ? [<SeparateurMenu key={`s${i}`} />, el] : [el]))}
    </MenuDeroulant>
  );
}
