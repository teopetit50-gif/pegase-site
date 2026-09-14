"use client";

/* ══════════════════════════════════════════════════════════════════════
   CompteTableau — les tuiles, le menu latéral et le panneau de « Mon
   compte » (14/09/2026, soir)

   Teo, capture à l'appui : « une fois connecté c'est ultra moche, ça fait
   un gros truc au milieu ; va chercher des composants sur 21st.dev et
   change complètement ». Il a choisi la forme MENU LATÉRAL parmi trois :
   une seule section affichée à la fois, jamais de défilement, l'accès à
   l'espace client dans l'en-tête (CompteVue) et non plus dans un bloc
   noir au centre.

   ORIGINE. Deux reprises de 21st.dev, dont on garde le geste et non le
   code :
   · le menu vient de « Animated Sidebar » (sidebar-001, @unlumen) : une
     surbrillance qui GLISSE d'un item à l'autre au ressort (motion,
     layoutId), et une barre d'état active. Jeté : le contexte de survol
     qui mesure les rectangles à la main (la surbrillance suit ici l'item
     ACTIF, pas la souris — un menu de réglages n'a pas à frétiller sous
     le pointeur), les groupes repliables, la poignée de redimensionnement,
     l'interrupteur « effets » en localStorage, la barre rouge
     « accent-pro » (le monde .resa n'a pas de rouge d'accent) et
     `@/lib/utils` (ce dépôt a lib/cn, et rien ici n'en a besoin).
   · les tuiles viennent de « KPI Card » (@nayan_radadiya6) et
     « Statistics Card 1 » (@sean0205) : kicker, grande valeur, pastille
     d'état, dans une carte filetée. Leur registre répond 403 ; c'est le
     dessin des aperçus qui est repris, sur la carte à filets déjà posée
     pour /modeles (BandeauFaits). Jeté : les tendances « +15,1 % vs last
     month » — un compte n'a pas de tendance, il a un état.

   POURQUOI RADIX TABS et pas des <div> : la primitive donne le clavier
   (flèches haut/bas en colonne, gauche/droite en rangée), aria-selected,
   le focus errant — « prendre l'équivalent natif habillé au même pixel »
   (regles-maison). @radix-ui/react-tabs était déjà installé (calendrier
   de réservation).

   Ce qui est fait ici et nulle part ailleurs :
   · `forceMount` sur les cinq panneaux : une saisie en cours (le
     formulaire du profil, un panneau de formule) survit au changement de
     section ; le CSS cache l'inactif (compte.css).
   · l'orientation suit la largeur (matchMedia ≥ 1024) : colonne au-dessus,
     rangée défilante en dessous — le clavier suit.
   · l'ancre : `#rendez-vous` à l'arrivée ouvre la section, et le choix
     s'écrit dans l'URL par replaceState (un lien « voir mes rendez-vous »
     depuis un e-mail tombera au bon endroit). Le rendu serveur part de
     `defaut` : pas de décalage d'hydratation, l'ancre ne se lit qu'après.
   · les tuiles sont des <button> qui ouvrent leur section — la synthèse
     mène au détail.
   · rien n'anime l'opacité d'un élément flottant, et aucune sortie n'est
     animée (adapter-un-composant-shadcn, règle nº 4) : la surbrillance ne
     bouge qu'en position, le panneau entrant joue un keyframe CSS.

   Composant CLIENT : les contenus des sections arrivent en ReactNode
   depuis CompteVue (serveur) — des éléments déjà rendus, jamais un
   composant d'icône (fonction-serveur-vers-composant-client).
   ══════════════════════════════════════════════════════════════════════ */

import { useEffect, useState, type ReactNode } from "react";
import * as Tabs from "@radix-ui/react-tabs";
import { motion, useReducedMotion } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import "./compte.css";

export type SectionCompte = {
  /* l'identifiant : valeur de l'onglet, ancre de l'URL, data-section du panneau */
  id: string;
  /* dans le menu */
  libelle: string;
  sous: string;
  icone: ReactNode;
  compteur?: number;
  /* en tête du panneau */
  titre: string;
  description?: ReactNode;
  droite?: ReactNode;
  contenu: ReactNode;
};

export type TuileCompte = {
  id: string;
  /* la section qu'elle ouvre */
  cible: string;
  kicker: string;
  valeur: string;
  /* une valeur « vide » (aucune commande, —) se grise */
  vide?: boolean;
  sous?: ReactNode;
};

export default function CompteTableau({
  sections,
  tuiles,
  defaut,
}: {
  sections: SectionCompte[];
  tuiles: TuileCompte[];
  defaut?: string;
}) {
  const [actif, setActif] = useState(defaut ?? sections[0]?.id ?? "");
  const [vertical, setVertical] = useState(true);
  const reduit = useReducedMotion();
  const ids = sections.map((s) => s.id).join(",");

  /* l'ancre à l'arrivée : #rendez-vous ouvre la section */
  useEffect(() => {
    const h = window.location.hash.slice(1);
    if (h && ids.split(",").includes(h)) setActif(h);
  }, [ids]);

  /* colonne dès 1024 (le clavier suit : flèches haut/bas), rangée sinon */
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const lire = () => setVertical(mq.matches);
    lire();
    mq.addEventListener("change", lire);
    return () => mq.removeEventListener("change", lire);
  }, []);

  const choisir = (id: string) => {
    setActif(id);
    try {
      window.history.replaceState(window.history.state, "", `#${id}`);
    } catch {
      /* un navigateur qui refuse : l'état suffit */
    }
  };

  return (
    <>
      {/* ——— les tuiles de synthèse ——— */}
      <div className="cpt-tuiles" data-arrivee="bloc">
        {tuiles.map((t) => (
          <button key={t.id} type="button" className="cpt-tuile" onClick={() => choisir(t.cible)}>
            <span className="cpt-tuile-kicker">{t.kicker}</span>
            <span className={`cpt-tuile-valeur${t.vide ? " cpt-tuile-valeur--vide" : ""}`}>{t.valeur}</span>
            {t.sous ? <span className="cpt-tuile-sous">{t.sous}</span> : null}
            <ArrowUpRight size={16} strokeWidth={2} className="cpt-tuile-fleche" aria-hidden="true" />
          </button>
        ))}
      </div>

      {/* ——— menu | panneau ——— */}
      <Tabs.Root
        value={actif}
        onValueChange={choisir}
        orientation={vertical ? "vertical" : "horizontal"}
        className="cpt-corps"
        data-arrivee="colonne"
      >
        <Tabs.List className="cpt-menu" aria-label="Les sections de votre compte">
          {sections.map((s) => (
            <Tabs.Trigger key={s.id} value={s.id} className="cpt-item">
              {actif === s.id ? (
                <motion.span
                  layoutId="cpt-surbrillance"
                  className="cpt-surbrillance"
                  aria-hidden="true"
                  transition={reduit ? { duration: 0 } : { type: "spring", stiffness: 520, damping: 42 }}
                >
                  <span className="cpt-barre" />
                </motion.span>
              ) : null}
              <span className="cpt-item-icone" aria-hidden="true">
                {s.icone}
              </span>
              <span className="cpt-item-texte">
                <span className="cpt-item-libelle">{s.libelle}</span>
                <span className="cpt-item-sous">{s.sous}</span>
              </span>
              {s.compteur ? <span className="cpt-item-compteur">{s.compteur}</span> : null}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        {sections.map((s) => (
          <Tabs.Content key={s.id} value={s.id} forceMount className="cpt-panneau" data-section={s.id}>
            <header className="cpt-panneau-tete">
              <div className="min-w-0">
                <h2 className="cpt-panneau-titre">{s.titre}</h2>
                {s.description ? <p className="cpt-panneau-sous">{s.description}</p> : null}
              </div>
              {s.droite ? <div className="shrink-0">{s.droite}</div> : null}
            </header>
            <div className="cpt-panneau-corps">{s.contenu}</div>
          </Tabs.Content>
        ))}
      </Tabs.Root>
    </>
  );
}
