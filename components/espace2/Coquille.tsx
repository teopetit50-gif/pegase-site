"use client";

/* ══════════════════════════════════════════════════════════════════════
   La coquille du nouvel espace client (06/10/2026, session C1)

   La disposition du tableau de bord de référence : une barre du haut de
   64 px — le logo, une barre oblique, le sélecteur d'organisation, et,
   dans un module, une seconde oblique et le sélecteur de module — puis,
   collée dessous, la rangée d'onglets de la portée. À droite : la
   recherche (⌘K), le compte. Le tout reste collé en haut au défilement.

   Les écrans lisent la source (exemple ou base réelle) par le même
   contexte que l'ancien espace (components/espace/source.tsx) : rien
   n'est dupliqué côté données. Sans session, l'espace montre l'exemple.
   ══════════════════════════════════════════════════════════════════════ */

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Check, ChevronsUpDown, Database, ExternalLink, Home, Laptop, Moon, Search, Settings, Sun } from "lucide-react";
import { RouterProvider } from "react-aria-components";
import type { Utilisateur } from "@/lib/compte";
import { SourceFournisseur, useSource } from "@/components/espace/source";
import { FournisseurToasts, useToast } from "./Toasts";
import { ItemMenu, Kbd, MenuDeroulant, SectionMenu, SeparateurMenu } from "./ui";
import Onglets from "./Onglets";
import Palette from "./Palette";
import { MODULES, ONGLETS_ORGANISATION, RACINE, ongletActif, porteeDe } from "./modules";
import { changerTheme, useTheme } from "./theme";
import "./espace2.css";

function initiales(u: Utilisateur): string {
  const i = `${(u.prenom ?? "").trim().charAt(0)}${(u.nom ?? "").trim().charAt(0)}`.toUpperCase();
  return i || u.email.charAt(0).toUpperCase();
}

const Oblique = () => (
  <svg className="v2-oblique" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
    <path d="M16.88 3.549L7.12 20.451" />
  </svg>
);

const coche = (oui: boolean) => (oui ? <Check width={16} height={16} aria-label="choisi" /> : null);

export default function Coquille({ utilisateur, police, children }: { utilisateur: Utilisateur | null; police: string; children: React.ReactNode }) {
  const router = useRouter();
  /* les menus et fenêtres sont rendus dans <body>, hors de cet arbre : la
     variable de la police Geist doit vivre sur <html> pendant la visite */
  useEffect(() => {
    const html = document.documentElement;
    html.classList.add(police);
    return () => html.classList.remove(police);
  }, [police]);
  return (
    <div className="v2" data-lenis-prevent="">
      <SourceFournisseur connecte={!!utilisateur}>
        <RouterProvider navigate={router.push}>
          <FournisseurToasts>
            <Cadre utilisateur={utilisateur}>{children}</Cadre>
          </FournisseurToasts>
        </RouterProvider>
      </SourceFournisseur>
    </div>
  );
}

function Cadre({ utilisateur, children }: { utilisateur: Utilisateur | null; children: React.ReactNode }) {
  const chemin = usePathname() ?? RACINE;
  const theme = useTheme();
  const toast = useToast();
  const { source, changer, connecte } = useSource();
  const [palette, setPalette] = useState(false);
  const portee = porteeDe(chemin);
  const onglets = portee ? portee.onglets : ONGLETS_ORGANISATION;
  const organisation = utilisateur?.entreprise || (utilisateur ? "Mon organisation" : "Atelier Bertin");
  const nom = utilisateur ? [utilisateur.prenom, utilisateur.nom].filter(Boolean).join(" ") || utilisateur.email : null;

  useEffect(() => {
    const touche = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPalette((v) => !v);
      }
    };
    window.addEventListener("keydown", touche);
    return () => window.removeEventListener("keydown", touche);
  }, []);

  const choisirTheme = (t: "systeme" | "clair" | "sombre") => {
    changerTheme(t);
    toast(t === "systeme" ? "Thème du système appliqué" : t === "clair" ? "Thème clair appliqué" : "Thème sombre appliqué");
  };
  const choisirSource = (s: "exemple" | "reelle") => {
    if (s === "reelle" && !connecte) return;
    changer(s);
    toast(s === "reelle" ? "Base réelle affichée" : "Données d'exemple affichées");
  };

  return (
    <>
      <a href="#contenu" className="v2-sr" onFocus={(e) => e.currentTarget.classList.remove("v2-sr")} onBlur={(e) => e.currentTarget.classList.add("v2-sr")} style={{ position: "fixed", top: 8, left: 8, zIndex: 60, padding: "8px 12px", borderRadius: 6, background: "var(--v2-bg-100)" }}>
        Aller au contenu
      </a>
      <header className="v2-entete">
        <div className="v2-barre">
          <Link href={RACINE} className="v2-logo" aria-label="Omega — vue d'ensemble">
            {/* eslint-disable-next-line @next/next/no-img-element -- un logo de 26 px, déjà à sa taille */}
            <img src="/logo-pegase-blanc.png" alt="" width={26} height={26} />
          </Link>
          <Oblique />
          <MenuDeroulant
            etiquette={`Organisation : ${organisation}. Changer d'organisation ou de données`}
            classe="v2-portee"
            placement="bottom start"
            largeur={280}
            declencheur={
              <>
                <span className="v2-pastille-ronde" aria-hidden="true">
                  {organisation.charAt(0).toUpperCase()}
                </span>
                <span className={`v2-portee-nom${portee ? " v2-portee-nom--replie" : ""}`}>{organisation}</span>
                <span className="v2-badge v2-masque-mobile" data-teinte={source === "reelle" ? "bleu" : "gris"}>
                  {source === "reelle" ? "Base réelle" : "Exemple"}
                </span>
                <ChevronsUpDown width={14} height={14} aria-hidden="true" />
              </>
            }
          >
            <SectionMenu titre="Organisations">
              <ItemMenu id="org" href={RACINE} textValue={organisation} icone={<span className="v2-pastille-ronde">{organisation.charAt(0).toUpperCase()}</span>} suffixe={coche(true)}>
                {organisation}
              </ItemMenu>
            </SectionMenu>
            <SeparateurMenu />
            <SectionMenu titre="Données affichées">
              <ItemMenu id="exemple" onAction={() => choisirSource("exemple")} icone={<Database width={16} height={16} aria-hidden="true" />} suffixe={coche(source === "exemple")}>
                Données d&apos;exemple
              </ItemMenu>
              <ItemMenu id="reelle" isDisabled={!connecte} onAction={() => choisirSource("reelle")} textValue="Base réelle" icone={<Database width={16} height={16} aria-hidden="true" />} suffixe={connecte ? coche(source === "reelle") : <span>connexion requise</span>}>
                Base réelle
              </ItemMenu>
            </SectionMenu>
          </MenuDeroulant>
          {portee ? (
            <>
              <Oblique />
              <MenuDeroulant
                etiquette={`Module : ${portee.nom}. Changer de module`}
                classe="v2-portee"
                placement="bottom start"
                largeur={300}
                declencheur={
                  <>
                    <portee.icone width={16} height={16} aria-hidden="true" />
                    <span className="v2-portee-nom">{portee.nom}</span>
                    <ChevronsUpDown width={14} height={14} aria-hidden="true" />
                  </>
                }
              >
                <SectionMenu titre="Modules">
                  {MODULES.map((m) => (
                    <ItemMenu key={m.cle} id={m.cle} href={`${RACINE}/${m.cle}`} textValue={m.nom} icone={<m.icone width={16} height={16} aria-hidden="true" />} suffixe={coche(m.cle === portee.cle)}>
                      {m.nom} <span className="v2-gris">· {m.libelle}</span>
                    </ItemMenu>
                  ))}
                </SectionMenu>
              </MenuDeroulant>
            </>
          ) : null}

          <div className="v2-barre-droite">
            <button type="button" className="v2-recherche-bouton" onClick={() => setPalette(true)} aria-label="Rechercher (Ctrl K)" aria-keyshortcuts="Meta+K Control+K">
              <Search width={16} height={16} aria-hidden="true" />
              <span>Rechercher…</span>
              <Kbd>⌘K</Kbd>
            </button>
            <MenuDeroulant
              etiquette={nom ? `Compte : ${nom}` : "Compte : non connecté"}
              classe="v2-avatar"
              largeur={260}
              entete={
                <div className="v2-menu-entete" style={{ padding: "16px 16px 4px" }}>
                  <strong>{nom ?? "Non connecté"}</strong>
                  <small>{utilisateur ? utilisateur.email : "Vous voyez l'exemple : Atelier Bertin"}</small>
                </div>
              }
              declencheur={<span data-vide={utilisateur ? undefined : ""}>{utilisateur ? initiales(utilisateur) : "?"}</span>}
            >
              <SectionMenu>
                <ItemMenu id="tableau" href={RACINE} icone={<Home width={16} height={16} aria-hidden="true" />}>
                  Tableau de bord
                </ItemMenu>
                <ItemMenu id="reglages" href={`${RACINE}/reglages`} icone={<Settings width={16} height={16} aria-hidden="true" />}>
                  Réglages
                </ItemMenu>
              </SectionMenu>
              <SeparateurMenu />
              <SectionMenu titre="Thème">
                <ItemMenu id="t-systeme" onAction={() => choisirTheme("systeme")} icone={<Laptop width={16} height={16} aria-hidden="true" />} suffixe={coche(theme === "systeme")}>
                  Système
                </ItemMenu>
                <ItemMenu id="t-clair" onAction={() => choisirTheme("clair")} icone={<Sun width={16} height={16} aria-hidden="true" />} suffixe={coche(theme === "clair")}>
                  Clair
                </ItemMenu>
                <ItemMenu id="t-sombre" onAction={() => choisirTheme("sombre")} icone={<Moon width={16} height={16} aria-hidden="true" />} suffixe={coche(theme === "sombre")}>
                  Sombre
                </ItemMenu>
              </SectionMenu>
              <SeparateurMenu />
              <SectionMenu>
                <ItemMenu id="ancien" href="/espace/validations" icone={<ExternalLink width={16} height={16} aria-hidden="true" />}>
                  Ancien espace client
                </ItemMenu>
                <ItemMenu id="site" href="/" icone={<ExternalLink width={16} height={16} aria-hidden="true" />}>
                  Retour au site
                </ItemMenu>
              </SectionMenu>
            </MenuDeroulant>
          </div>
        </div>
        <Onglets key={portee?.cle ?? "organisation"} onglets={onglets} actif={ongletActif(onglets, chemin)} etiquette={portee ? `Écrans de ${portee.nom}` : "Écrans de l'organisation"} />
      </header>
      <main id="contenu" tabIndex={-1} style={{ outline: "none" }}>
        {children}
      </main>
      <Palette ouverte={palette} changer={setPalette} />
    </>
  );
}
