"use client";

/* ══════════════════════════════════════════════════════════════════════
   CompteTableau — les tuiles et la barre de navigation de « Mon compte »
   (14/09/2026 soir, barre refaite le 14/09 nuit)

   ORIGINE DE LA BARRE. Teo a collé « Dashboard Sidebar » (21st.dev) :
   « remplace complètement ce qu'il y a actuellement par ce dashboard ;
   bien sûr les sections doivent afficher les mêmes trucs qu'on veut
   afficher, l'abonnement etc. que le client a ». La barre reprend donc
   son dessin ligne à ligne — en-tête à pastille carrée et deux lignes,
   groupes coiffés d'un intitulé en petites capitales, lignes compactes
   (icône 16 px au trait fin, libellé 13 px, coins de 6 px), badges
   ronds, sous-entrées dépliables au chevron avec leur filet vertical,
   et un pied séparé par un trait — mais avec NOS données et NOS
   couleurs.

   CE QUI A ÉTÉ REMPLACÉ, et par quoi :
   · le sélecteur d'espace de travail (« Acme Corp / Pro Plan », menu
     déroulant de trois espaces) → l'ENTREPRISE du client et sa formule.
     Un client Omega n'a qu'un compte : le menu déroulant n'aurait rien
     eu à proposer, la ligne devient un bloc d'information.
   · Search / Home / Inbox / Analytics / Projects / Team / Customers /
     API Keys / Webhooks → nos cinq sections réelles, en deux groupes.
   · Settings et Log out du pied → « Ouvrir mon espace » (vers le
     cockpit) et « Se déconnecter ». Ce sont des LIENS et un formulaire,
     pas des onglets : ils quittent la page.

   CE QUI A ÉTÉ JETÉ, et pourquoi :
   · la palette shadcn du modèle (bg-card, text-muted-foreground,
     bg-primary, border-border) n'existe pas dans ce site : Tailwind
     n'émet rien pour une couleur inconnue, la barre aurait été
     invisible. Tout est écrit en `.cpt-*` dans compte.css, sur les
     variables du monde `.resa`.
   · `animate-in fade-in zoom-in-95` vient de tailwindcss-animate, qui
     n'est installé nulle part dans le parc : classes mortes. Le
     dépliage est une transition de `grid-template-rows`, et la
     surbrillance un `layoutId` de motion, déjà utilisé ailleurs ici.
   · la palette de recherche ⌘K et les raccourcis clavier affichés au
     survol : cinq sections ne se cherchent pas, et nous n'avons aucun
     raccourci réel — un `kbd` qui ne correspond à rien est un mensonge.
   · le bouton de repli de la barre : sous 1024 px la barre devient une
     rangée défilante d'une seule ligne, ce qui vaut mieux qu'un panneau
     à ouvrir sur téléphone (menu-mobile-deplie-pas-a-plat).
   · les groupes « Developers » et les entrées de démonstration.

   ÉCART ASSUMÉ, contre la ressemblance : le modèle fait ses lignes en
   `<div onClick>`. Ici ce sont des onglets Radix — clavier (flèches haut
   et bas en colonne, gauche et droite en rangée), `aria-selected`, focus
   errant. Le dessin est le même au pixel, le comportement au clavier ne
   l'est pas. Ne pas « corriger » en revenant aux div.

   Le reste du mécanisme :
   · `forceMount` sur les panneaux : une saisie en cours (le formulaire
     du profil, un panneau de formule) survit au changement de section ;
     le CSS cache l'inactif.
   · l'orientation suit la largeur, l'ancre de l'URL ouvre une section
     (`#rendez-vous`), et le choix s'écrit par replaceState. Les deux
     sont lues par useSyncExternalStore, pas par un effet qui pose un
     état (react-hooks/set-state-in-effect, et un rendu de moins).
   · les sous-entrées ne sont pas des onglets : elles activent leur
     parent si besoin, puis font défiler jusqu'à leur ancre dans le
     panneau. Elles ne sont posées que là où le bloc visé existe
     vraiment — c'est CompteVue qui le sait.
   · les tuiles sont des boutons qui ouvrent leur section.

   Composant CLIENT : les contenus et les icônes arrivent en ReactNode
   depuis CompteVue (serveur). Jamais un composant d'icône, qui est une
   fonction (fonction-serveur-vers-composant-client).
   ══════════════════════════════════════════════════════════════════════ */

import { useState, useSyncExternalStore, type ReactNode } from "react";
import * as Tabs from "@radix-ui/react-tabs";
import { motion, useReducedMotion } from "motion/react";
import { ArrowUpRight, ChevronRight } from "lucide-react";
import "./compte.css";
import Lien from "@/components/Lien";

/* une sous-entrée : un repère DANS le panneau de sa section */
export type SousEntree = {
  id: string;
  libelle: string;
  /* l'id de l'élément visé dans le panneau */
  ancre: string;
};

export type SectionCompte = {
  /* l'identifiant : valeur de l'onglet, ancre de l'URL, data-section du panneau */
  id: string;
  /* dans la barre */
  libelle: string;
  icone: ReactNode;
  badge?: number | string;
  enfants?: SousEntree[];
  /* le groupe qui coiffe la ligne, repris tel quel par la barre */
  groupe?: string;
  /* en tête du panneau */
  titre: string;
  description?: ReactNode;
  contenu: ReactNode;
};

/* le pied de la barre : ce qui quitte la page */
export type LienRail = {
  id: string;
  libelle: string;
  icone: ReactNode;
  /* soit un lien, soit le formulaire de déconnexion */
  href?: string;
  externe?: boolean;
  deconnexion?: boolean;
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

/* ——— deux sources externes : l'ancre de l'URL et la largeur ——— */
function abonnerAncre(cb: () => void) {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
}
const lireAncre = () => window.location.hash.slice(1);
const lireAncreServeur = () => "";

const REQUETE_COLONNE = "(min-width: 1024px)";
function abonnerLargeur(cb: () => void) {
  const mq = window.matchMedia(REQUETE_COLONNE);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}
const lireColonne = () => window.matchMedia(REQUETE_COLONNE).matches;
const lireColonneServeur = () => true;

/* ——— une ligne de la barre ——— */
function LigneRail({
  section,
  actif,
  reduit,
  onAncre,
}: {
  section: SectionCompte;
  actif: boolean;
  reduit: boolean | null;
  onAncre: (section: string, ancre: string) => void;
}) {
  const [deplie, setDeplie] = useState(false);
  const enfants = section.enfants ?? [];

  return (
    <div className="cpt-bloc">
      <div className="cpt-ligne">
        {/* la surbrillance couvre la LIGNE, chevron compris : posée dans
            l'onglet elle s'arrêtait avant lui, et les lignes dépliables
            avaient un fond plus court que les autres */}
        {actif ? (
          <motion.span
            layoutId="cpt-surbrillance"
            className="cpt-surbrillance"
            aria-hidden="true"
            transition={reduit ? { duration: 0 } : { type: "spring", stiffness: 520, damping: 42 }}
          />
        ) : null}
        <Tabs.Trigger value={section.id} className="cpt-item">
          <span className="cpt-item-icone" aria-hidden="true">
            {section.icone}
          </span>
          <span className="cpt-item-libelle">{section.libelle}</span>
          {section.badge ? <span className="cpt-item-badge">{section.badge}</span> : null}
        </Tabs.Trigger>
        {enfants.length ? (
          <button
            type="button"
            className="cpt-chevron"
            aria-expanded={deplie}
            aria-controls={`cpt-sous-${section.id}`}
            aria-label={`${deplie ? "Replier" : "Déplier"} le détail de la section ${section.libelle}`}
            onClick={() => setDeplie((v) => !v)}
          >
            <ChevronRight size={14} strokeWidth={2} aria-hidden="true" />
          </button>
        ) : null}
      </div>

      {enfants.length ? (
        <div id={`cpt-sous-${section.id}`} className="cpt-sous" data-deplie={deplie}>
          <div className="cpt-sous-corps">
            <span className="cpt-sous-filet" aria-hidden="true" />
            {enfants.map((e) => (
              <button
                key={e.id}
                type="button"
                className="cpt-sous-item"
                onClick={() => onAncre(section.id, e.ancre)}
              >
                <span className="cpt-sous-croisillon" aria-hidden="true">
                  #
                </span>
                {e.libelle}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function CompteTableau({
  sections,
  tuiles,
  liens,
  enseigne,
  formule,
  defaut,
}: {
  sections: SectionCompte[];
  tuiles: TuileCompte[];
  liens: LienRail[];
  /* l'en-tête de la barre : l'entreprise du client, et sa formule */
  enseigne: string;
  formule: string;
  defaut?: string;
}) {
  /* le choix de la personne (clic, clavier, tuile) ; tant qu'il n'y en a
     pas, l'ancre de l'URL décide, puis `defaut` */
  const [choix, setChoix] = useState<string | null>(null);
  const ancre = useSyncExternalStore(abonnerAncre, lireAncre, lireAncreServeur);
  const vertical = useSyncExternalStore(abonnerLargeur, lireColonne, lireColonneServeur);
  const reduit = useReducedMotion();

  const ids = sections.map((s) => s.id);
  const actif = choix ?? (ancre && ids.includes(ancre) ? ancre : (defaut ?? ids[0] ?? ""));

  const choisir = (id: string) => {
    setChoix(id);
    try {
      window.history.replaceState(window.history.state, "", `#${id}`);
    } catch {
      /* un navigateur qui refuse : l'état suffit */
    }
  };

  /* une sous-entrée : activer la section si besoin, puis y défiler et
     l'éclairer une seconde. Le panneau est monté même inactif
     (forceMount), mais il n'a sa boîte qu'une fois affiché — d'où le
     temps laissé au rendu. Le halo n'est pas un ornement : la page tient
     sur un écran, donc il n'y a souvent RIEN à faire défiler et le clic
     resterait sans effet visible. */
  const allerA = (section: string, cible: string) => {
    const meme = actif === section;
    if (!meme) choisir(section);
    const defiler = () => {
      const el = document.getElementById(cible);
      if (!el) return;
      el.scrollIntoView({ behavior: reduit ? "auto" : "smooth", block: "start" });
      el.dataset.vise = "oui";
      window.setTimeout(() => delete el.dataset.vise, 1200);
    };
    if (meme) defiler();
    else requestAnimationFrame(() => requestAnimationFrame(defiler));
  };

  /* les groupes de la barre, dans l'ordre des sections */
  const groupes: { titre?: string; sections: SectionCompte[] }[] = [];
  for (const s of sections) {
    const dernier = groupes[groupes.length - 1];
    if (dernier && dernier.titre === s.groupe) dernier.sections.push(s);
    else groupes.push({ titre: s.groupe, sections: [s] });
  }

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

      {/* ——— la barre | le panneau ——— */}
      <Tabs.Root
        value={actif}
        onValueChange={choisir}
        orientation={vertical ? "vertical" : "horizontal"}
        className="cpt-corps"
        data-arrivee="colonne"
      >
        <div className="cpt-rail">
          {/* l'en-tête : l'entreprise et sa formule */}
          <div className="cpt-rail-tete">
            <span className="cpt-rail-jeton" aria-hidden="true">
              {enseigne.trim().charAt(0).toUpperCase()}
            </span>
            <span className="cpt-rail-tete-texte">
              <span className="cpt-rail-enseigne">{enseigne}</span>
              <span className="cpt-rail-formule">{formule}</span>
            </span>
          </div>

          <Tabs.List className="cpt-menu" aria-label="Les sections de votre compte">
            {groupes.map((g, i) => (
              <div key={g.titre ?? `g${i}`} className="cpt-groupe">
                {g.titre ? <span className="cpt-groupe-titre">{g.titre}</span> : null}
                {g.sections.map((s) => (
                  <LigneRail
                    key={s.id}
                    section={s}
                    actif={actif === s.id}
                    reduit={reduit}
                    onAncre={allerA}
                  />
                ))}
              </div>
            ))}
          </Tabs.List>

          {/* le pied : ce qui quitte la page */}
          <div className="cpt-rail-pied">
            {liens.map((l) =>
              l.deconnexion ? (
                <form key={l.id} action="/auth/signout" method="post">
                  <button type="submit" className="cpt-lien">
                    <span className="cpt-item-icone" aria-hidden="true">
                      {l.icone}
                    </span>
                    <span className="cpt-item-libelle">{l.libelle}</span>
                  </button>
                </form>
              ) : (
                <Lien
                  key={l.id}
                  href={l.href}
                  className="cpt-lien"
                  {...(l.externe ? { rel: "noreferrer" } : {})}
                >
                  <span className="cpt-item-icone" aria-hidden="true">
                    {l.icone}
                  </span>
                  <span className="cpt-item-libelle">{l.libelle}</span>
                  {l.externe ? (
                    <ArrowUpRight size={14} strokeWidth={2} className="cpt-lien-fleche" aria-hidden="true" />
                  ) : null}
                </Lien>
              ),
            )}
          </div>
        </div>

        {sections.map((s) => (
          <Tabs.Content key={s.id} value={s.id} forceMount className="cpt-panneau" data-section={s.id}>
            <header className="cpt-panneau-tete">
              <div className="min-w-0">
                <h2 className="cpt-panneau-titre">{s.titre}</h2>
                {s.description ? <p className="cpt-panneau-sous">{s.description}</p> : null}
              </div>
            </header>
            <div className="cpt-panneau-corps">{s.contenu}</div>
          </Tabs.Content>
        ))}
      </Tabs.Root>
    </>
  );
}
