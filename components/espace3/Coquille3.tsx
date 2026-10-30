"use client";

/* ══════════════════════════════════════════════════════════════════════
   La coquille de /espace3 — le tableau de bord d'un groupe (30/10/2026)

   Le même dessin que /espace2 (mêmes classes, même rail d'icônes, même
   barre du haut), pour un groupe de sociétés. Dans la barre du haut, à la
   place du module, le POSTE : le CEO ou la direction marketing. Changer de
   poste change toute la navigation et toutes les pages.
   ══════════════════════════════════════════════════════════════════════ */

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Check, ChevronsUpDown, ExternalLink, Menu as IconeMenu, Moon, Sparkles, Sun, User, X } from "lucide-react";
import { Dialog, Modal, ModalOverlay, RouterProvider } from "react-aria-components";
import { FournisseurToasts } from "@/components/espace2/Toasts";
import { ItemMenu, MenuDeroulant, SectionMenu, SeparateurMenu } from "@/components/espace2/ui";
import { useTheme } from "@/components/espace2/theme";
import { useCalme } from "@/components/espace2/mouvement";
import { GROUPE } from "./donnees";
import { NAVIGATION, POSTES, RACINE, REGLAGES, TITRES, ecrirePoste, posteImpose, usePosteChoisi, type Poste, type Section } from "./poste";
import "@/components/espace2/espace2.css";
import "@/components/espace2/client.css";
import "./espace3.css";

const I = { width: 16, height: 16, strokeWidth: 1.6, "aria-hidden": true } as const;
const R = { width: 20, height: 20, strokeWidth: 1.5, "aria-hidden": true } as const;
const coche = (oui: boolean) => (oui ? <Check width={16} height={16} aria-label="choisi" /> : null);

/* le poste en vigueur : celui qu'impose la page, sinon celui choisi */
export function usePoste(): Poste {
  const chemin = usePathname() ?? RACINE;
  const choisi = usePosteChoisi();
  return posteImpose(chemin) ?? choisi;
}

export default function Coquille3({ police, children }: { police: string; children: React.ReactNode }) {
  const router = useRouter();
  useEffect(() => {
    const html = document.documentElement;
    html.classList.add(...police.split(" "), "v2-actif", "oc-actif");
    return () => html.classList.remove(...police.split(" "), "v2-actif", "oc-actif");
  }, [police]);
  return (
    <div className="v2 oc e3" data-lenis-prevent="">
      <RouterProvider navigate={(href, options) => router.push(href, options)}>
        <FournisseurToasts>
          <Cadre>{children}</Cadre>
        </FournisseurToasts>
      </RouterProvider>
    </div>
  );
}

function Cadre({ children }: { children: React.ReactNode }) {
  const chemin = usePathname() ?? RACINE;
  const router = useRouter();
  const poste = usePoste();
  const impose = posteImpose(chemin);
  const [tiroir, setTiroir] = useState(false);

  /* une page propre à un poste le retient : revenir à l'accueil garde ce poste */
  useEffect(() => {
    if (impose) ecrirePoste(impose);
  }, [impose]);

  const [cheminVu, setCheminVu] = useState(chemin);
  if (cheminVu !== chemin) {
    setCheminVu(chemin);
    setTiroir(false);
  }

  const changerPoste = (p: Poste) => {
    ecrirePoste(p);
    /* la page courante n'existe pas pour l'autre poste : retour à son accueil */
    if (impose && impose !== p) router.push(RACINE);
  };

  const seg = chemin.replace(RACINE, "").split("/")[1] ?? "";
  const titre = TITRES[seg] ?? "Accueil";
  const P = POSTES[poste];

  return (
    <>
      <a href="#contenu" className="v2-evitement">
        Aller au contenu
      </a>
      <div className="v2-app">
        <header className="v2-haut">
          <div className="v2-haut-gauche">
            <button type="button" className="v2-btn v2-btn--petit v2-btn--icone v2-btn--fantome v2-seul-mobile" aria-label="Ouvrir la navigation" onClick={() => setTiroir(true)}>
              <IconeMenu {...I} />
            </button>
            <MenuGroupe classe="v2-portee v2-haut-org v2-masque-mobile" />
            <span className="v2-haut-sep v2-masque-mobile" aria-hidden="true">
              /
            </span>
            {/* le poste, à la place du module de /espace2 */}
            <MenuDeroulant
              etiquette={`Poste : ${P.nom}. Changer de poste`}
              classe="v2-portee e3-poste"
              placement="bottom start"
              largeur={300}
              declencheur={
                <>
                  <P.icone {...I} />
                  <span className="v2-portee-nom">{P.nom}</span>
                  <ChevronsUpDown width={14} height={14} aria-hidden="true" />
                </>
              }
            >
              <SectionMenu titre="Voir le tableau de bord de">
                {(Object.keys(POSTES) as Poste[]).map((p) => {
                  const X = POSTES[p];
                  return (
                    <ItemMenu key={p} id={p} textValue={X.nom} onAction={() => changerPoste(p)} icone={<X.icone {...I} />} suffixe={coche(p === poste)}>
                      {X.nom} <span className="v2-gris">· {X.libelle}</span>
                    </ItemMenu>
                  );
                })}
              </SectionMenu>
            </MenuDeroulant>
            <span className="v2-haut-sep v2-masque-mobile" aria-hidden="true">
              /
            </span>
            <p className="v2-haut-titre">{titre}</p>
          </div>
          <div className="v2-haut-droite">
            <span className="e3-ruban v2-masque-mobile">
              <span className="e3-ruban-point" aria-hidden="true" />
              Données d&apos;exemple
            </span>
            <Link href={`${RACINE}/demander`} className="v2-btn v2-btn--petit">
              <Sparkles {...I} />
              <span className="v2-masque-mobile v2-masque-etroit">Demander au groupe</span>
            </Link>
            <Link href={`${RACINE}/equipe`} className="v2-haut-compte" aria-label="Équipe et accès">
              <span className="v2-pastille-ronde" aria-hidden="true">
                <User {...I} />
              </span>
            </Link>
          </div>
        </header>
        <aside className="v2-laterale v2-laterale--fixe" aria-label="Navigation du tableau de bord">
          <BarreLaterale chemin={chemin} poste={poste} changerPoste={changerPoste} />
        </aside>
        <div className="v2-colonne-principale">
          <main id="contenu" tabIndex={-1} style={{ outline: "none" }}>
            {children}
          </main>
        </div>
      </div>

      <ModalOverlay isOpen={tiroir} onOpenChange={setTiroir} isDismissable className="v2-jetons v2-voile v2-voile--tiroir">
        <Modal className="v2-tiroir">
          <Dialog className="v2-modale-dialogue v2-laterale" aria-label="Navigation du tableau de bord">
            <BarreLaterale chemin={chemin} poste={poste} changerPoste={changerPoste} fermer={() => setTiroir(false)} />
          </Dialog>
        </Modal>
      </ModalOverlay>
    </>
  );
}

function MenuGroupe({ classe }: { classe: string }) {
  return (
    <MenuDeroulant
      etiquette={`Organisation : ${GROUPE.nom}`}
      classe={classe}
      placement="bottom start"
      largeur={260}
      declencheur={
        <>
          <span className="v2-marque-omega" aria-hidden="true">
            {/* eslint-disable-next-line @next/next/no-img-element -- l'icône pilotage, déjà à sa taille */}
            <img className="oc-logo-sombre" src="/omega-icone-pilotage.png" alt="" width={20} height={20} />
            {/* eslint-disable-next-line @next/next/no-img-element -- la marque noire, pour le thème clair */}
            <img className="oc-logo-clair" src="/logo-pegase.png" alt="" width={20} height={20} />
          </span>
          <span className="v2-rail-libelle v2-portee-nom">{GROUPE.nom}</span>
          <ChevronsUpDown width={14} height={14} aria-hidden="true" />
        </>
      }
    >
      <SectionMenu titre="Organisation">
        <ItemMenu id="groupe" href={RACINE} textValue={GROUPE.nom} icone={<span className="v2-pastille-ronde">{GROUPE.sigle}</span>} suffixe={coche(true)}>
          {GROUPE.nom}
        </ItemMenu>
      </SectionMenu>
      <SeparateurMenu />
      <SectionMenu>
        <ItemMenu id="site" href="/secteurs/groupes" icone={<ExternalLink {...I} />}>
          Découvrir l&apos;offre pour les groupes
        </ItemMenu>
      </SectionMenu>
    </MenuDeroulant>
  );
}

function BarreLaterale({ chemin, poste, changerPoste, fermer }: { chemin: string; poste: Poste; changerPoste: (p: Poste) => void; fermer?: () => void }) {
  const [theme, changerTheme] = useTheme();
  useCalme();
  const sections = NAVIGATION[poste];
  const toutes = [...sections, REGLAGES];
  const ouvre = (href: string, exact?: boolean) => (exact ? chemin === href : chemin === href || chemin.startsWith(`${href}/`));
  const courante = toutes.find((s) => s.groupes.some((g) => g.pages.some((p) => ouvre(p.href, p.exact)))) ?? sections[0];
  const P = POSTES[poste];

  const iconeRail = (s: Section) => (
    <Link href={s.groupes[0].pages[0].href} className="v2-rail-item" data-actif={s.cle === courante.cle ? "" : undefined} aria-current={s.cle === courante.cle ? "true" : undefined}>
      <s.icone {...R} />
      <span className="v2-rail-libelle">{s.titre}</span>
    </Link>
  );

  return (
    <div className="v2-laterale-int">
      <div className="v2-rail-place" aria-hidden="true" />
      <div className="v2-rail">
        <div className="v2-rail-int">
          {fermer ? <MenuGroupe classe="v2-rail-item v2-rail-logo" /> : null}
          <nav className="v2-rail-nav" aria-label="Sections">
            <ul className="v2-rail-groupe">
              <li>{iconeRail(sections[0])}</li>
            </ul>
            <ul className="v2-rail-groupe">
              {sections.slice(1).map((s) => (
                <li key={s.cle}>{iconeRail(s)}</li>
              ))}
            </ul>
          </nav>
          <div className="v2-rail-bas">
            <ul className="v2-rail-groupe">
              <li>{iconeRail(REGLAGES)}</li>
              <li>
                <MenuDeroulant
                  etiquette="Menu du compte"
                  classe="v2-rail-item"
                  placement="top start"
                  largeur={280}
                  entete={
                    <div className="v2-menu-entete" style={{ padding: "16px 16px 4px" }}>
                      <strong>{P.personne}</strong>
                      <small>
                        {P.libelle} · {GROUPE.nom}
                      </small>
                    </div>
                  }
                  declencheur={
                    <>
                      <span className="v2-avatar" aria-hidden="true">
                        <User width={12} height={12} strokeWidth={1.8} />
                      </span>
                      <span className="v2-rail-libelle">{P.personne}</span>
                    </>
                  }
                >
                  <SectionMenu titre="Poste">
                    {(Object.keys(POSTES) as Poste[]).map((p) => {
                      const X = POSTES[p];
                      return (
                        <ItemMenu key={p} id={`p-${p}`} textValue={X.nom} onAction={() => changerPoste(p)} icone={<X.icone {...I} />} suffixe={coche(p === poste)}>
                          {X.nom}
                        </ItemMenu>
                      );
                    })}
                  </SectionMenu>
                  <SeparateurMenu />
                  <SectionMenu titre="Apparence">
                    <ItemMenu id="sombre" textValue="Thème sombre" onAction={() => changerTheme("sombre")} icone={<Moon {...I} />} suffixe={coche(theme === "sombre")}>
                      Sombre
                    </ItemMenu>
                    <ItemMenu id="clair" textValue="Thème clair" onAction={() => changerTheme("clair")} icone={<Sun {...I} />} suffixe={coche(theme === "clair")}>
                      Clair
                    </ItemMenu>
                  </SectionMenu>
                  <SeparateurMenu />
                  <SectionMenu>
                    <ItemMenu id="site" href="/" icone={<ExternalLink {...I} />}>
                      Retour au site
                    </ItemMenu>
                  </SectionMenu>
                </MenuDeroulant>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="v2-volet">
        <div className="v2-laterale-haut">
          <p className="v2-volet-titre">{courante.titre}</p>
          {fermer ? (
            <button type="button" className="v2-btn v2-btn--petit v2-btn--icone v2-btn--fantome" aria-label="Fermer la navigation" onClick={fermer}>
              <X {...I} />
            </button>
          ) : null}
        </div>
        <nav className="v2-laterale-nav" aria-label={`Pages de ${courante.titre}`}>
          {courante.groupes.map((g) => (
            <div key={g.titre} className="v2-section">
              <div className="v2-section-titre">{g.titre}</div>
              <ul className="v2-groupe">
                {g.pages.map((p) => (
                  <li key={p.href}>
                    <Link href={p.href} className="v2-lien" aria-current={ouvre(p.href, p.exact) ? "page" : undefined}>
                      <span>{p.libelle}</span>
                      {p.compteur ? <span className="v2-lien-compteur">{p.compteur}</span> : null}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>
    </div>
  );
}
