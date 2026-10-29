"use client";

/* La coquille de /formation : barre latérale, barre du haut, sommaire de
   droite. Le contenu de l'article arrive en enfants, rendu côté serveur
   (app/formation/page.tsx). Relevé et écarts : tête de formation.css. */

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  Coffee,
  Copy,
  Globe,
  GraduationCap,
  LayoutGrid,
  Menu,
  MessageCircle,
  Moon,
  Sun,
  X,
  type LucideIcon,
} from "lucide-react";

export type Lien = { libelle: string; href: string; icone?: "guide" | "vue" | "point" };
export type Groupe = { titre: string; ouvert?: boolean; liens: Lien[] };

const ICONES: Record<NonNullable<Lien["icone"]>, LucideIcon> = { guide: GraduationCap, vue: LayoutGrid, point: Coffee };

const PIED: { libelle: string; href: string; icone: LucideIcon }[] = [
  { libelle: "Formation", href: "/formation", icone: BookOpen },
  { libelle: "Espace client", href: "/espace2", icone: LayoutGrid },
  { libelle: "Le site", href: "/", icone: Globe },
  { libelle: "Nous contacter", href: "/contact", icone: MessageCircle },
];

export type Entree = { id: string; texte: string; niveau: 2 | 3 };
type Theme = "sombre" | "clair";
const CLE_THEME = "omega-formation-theme";

/* le thème choisi la dernière fois ; sombre par défaut, comme la référence.
   Un magasin externe plutôt qu'un effet : la règle react-hooks du dépôt
   refuse un setState posé dans un effet. */
const abonnes = new Set<() => void>();
function lireTheme(): Theme {
  try {
    return localStorage.getItem(CLE_THEME) === "clair" ? "clair" : "sombre";
  } catch {
    return "sombre";
  }
}
function ecrireTheme(t: Theme) {
  try {
    localStorage.setItem(CLE_THEME, t);
  } catch {}
  abonnes.forEach((f) => f());
}
const abonner = (f: () => void) => {
  abonnes.add(f);
  return () => abonnes.delete(f);
};

export default function Coquille({
  groupes,
  sommaire,
  police,
  rubrique,
  titre,
  children,
}: {
  groupes: Groupe[];
  sommaire: Entree[];
  police: string;
  rubrique: string;
  titre: string;
  children: React.ReactNode;
}) {
  const chemin = usePathname();
  const article = useRef<HTMLElement | null>(null);
  const theme = useSyncExternalStore(abonner, lireTheme, () => "sombre" as Theme);
  const [menu, setMenu] = useState(false);
  const [copie, setCopie] = useState(false);
  const [actif, setActif] = useState<string | null>(null);

  const basculerTheme = () => ecrireTheme(theme === "sombre" ? "clair" : "sombre");

  /* la section courante : le dernier titre passé sous la barre du haut */
  useEffect(() => {
    if (!sommaire.length) return;
    let raf = 0;
    const calculer = () => {
      raf = 0;
      let courant = sommaire[0].id;
      for (const e of sommaire) {
        const h = document.getElementById(e.id);
        if (h && h.getBoundingClientRect().top < 140) courant = e.id;
      }
      /* en bas de page, le dernier titre, même s'il n'a pas pu remonter */
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) courant = sommaire[sommaire.length - 1].id;
      setActif(courant);
    };
    const surDefilement = () => {
      if (!raf) raf = requestAnimationFrame(calculer);
    };
    raf = requestAnimationFrame(calculer);
    window.addEventListener("scroll", surDefilement, { passive: true });
    window.addEventListener("resize", surDefilement);
    return () => {
      window.removeEventListener("scroll", surDefilement);
      window.removeEventListener("resize", surDefilement);
      cancelAnimationFrame(raf);
    };
  }, [sommaire]);

  /* le panneau du téléphone : Échap le ferme, la page derrière ne défile plus */
  useEffect(() => {
    if (!menu) return;
    const touche = (e: KeyboardEvent) => e.key === "Escape" && setMenu(false);
    document.addEventListener("keydown", touche);
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", touche);
      document.documentElement.style.overflow = "";
    };
  }, [menu]);

  const copier = useCallback(async () => {
    const texte = `${article.current?.innerText ?? ""}\n\n${window.location.href}`;
    try {
      await navigator.clipboard.writeText(texte);
      setCopie(true);
      setTimeout(() => setCopie(false), 1600);
    } catch {}
  }, []);

  const logo = theme === "sombre" ? "/logo-pegase-blanc.png" : "/logo-pegase.png";

  const navigation = (
    <>
      <ul className="fm-nav-liste">
        {groupes.map((g) => (
          <GroupeNav key={g.titre} groupe={g} chemin={chemin} fermer={() => setMenu(false)} />
        ))}
      </ul>
      <div className="fm-nav-pied">
        {PIED.map(({ libelle, href, icone: Icone }) => (
          <Link key={href} href={href} className="fm-nav-pied-lien" aria-current={href === chemin ? "page" : undefined} onClick={() => setMenu(false)}>
            <Icone size={16} strokeWidth={1.75} aria-hidden="true" />
            {libelle}
          </Link>
        ))}
      </div>
    </>
  );

  return (
    <div className={`fm ${police}`} data-theme={theme} data-lenis-prevent="">
      <a href="#fm-article" className="fm-evitement">
        Aller au contenu
      </a>

      {/* ——— barre latérale (bureau) ——— */}
      <nav className="fm-nav" aria-label="Formation">
        <header className="fm-nav-tete">
          <Link href="/formation" className="fm-marque">
            <Image src={logo} alt="Omega" width={40} height={40} className="fm-marque-logo" />
            <span className="fm-marque-filet" aria-hidden="true" />
            <span className="fm-marque-nom">Formation</span>
          </Link>
        </header>
        {navigation}
      </nav>

      {/* ——— barre du haut (téléphone) ——— */}
      <header className="fm-mobile-tete">
        <Link href="/formation" className="fm-marque">
          <Image src={logo} alt="Omega" width={40} height={40} className="fm-marque-logo" />
          <span className="fm-marque-filet" aria-hidden="true" />
          <span className="fm-marque-nom">Formation</span>
        </Link>
        <div className="fm-mobile-actions">
          <Link href="/espace2" className="fm-bouton-app">
            Ouvrir l&apos;espace
          </Link>
          <button type="button" className="fm-burger" aria-expanded={menu} aria-controls="fm-panneau" aria-label={menu ? "Fermer le menu" : "Ouvrir le menu"} onClick={() => setMenu((v) => !v)}>
            {menu ? <X size={20} strokeWidth={1.75} aria-hidden="true" /> : <Menu size={20} strokeWidth={1.75} aria-hidden="true" />}
          </button>
        </div>
      </header>
      <div id="fm-panneau" className="fm-panneau" data-ouvert={menu} hidden={!menu}>
        {navigation}
      </div>

      {/* ——— colonne principale ——— */}
      <div className="fm-principal">
        <header className="fm-tete">
          <ol className="fm-fil" aria-label="Fil d'Ariane">
            <li>{rubrique}</li>
            <li aria-hidden="true" className="fm-fil-sep">
              /
            </li>
            <li aria-current="page" className="fm-fil-courant">
              {titre}
            </li>
          </ol>
          <div className="fm-tete-actions">
            <button type="button" className="fm-bouton-rond" onClick={basculerTheme} aria-label={theme === "sombre" ? "Passer en thème clair" : "Passer en thème sombre"}>
              {theme === "sombre" ? <Sun size={16} strokeWidth={1.75} aria-hidden="true" /> : <Moon size={16} strokeWidth={1.75} aria-hidden="true" />}
            </button>
            <button type="button" className="fm-bouton-copier" onClick={copier} aria-live="polite">
              {copie ? <Check size={14} strokeWidth={2} aria-hidden="true" /> : <Copy size={14} strokeWidth={1.75} aria-hidden="true" />}
              {copie ? "Copiée" : "Copier la page"}
            </button>
            <Link href="/espace2" className="fm-bouton-app">
              Ouvrir l&apos;espace
            </Link>
          </div>
        </header>

        <div className="fm-grille">
          <article id="fm-article" ref={article} className="fm-article">
            {children}
          </article>

          {sommaire.length > 0 && (
            <aside className="fm-sommaire" aria-label="Sur cette page">
              <ul>
                {sommaire.map((e) => (
                  <li key={e.id} data-niveau={e.niveau}>
                    <a href={`#${e.id}`} aria-current={actif === e.id ? "location" : undefined}>
                      {e.texte}
                    </a>
                  </li>
                ))}
              </ul>
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}

function GroupeNav({ groupe, chemin, fermer }: { groupe: Groupe; chemin: string; fermer: () => void }) {
  const [ouvert, setOuvert] = useState(!!groupe.ouvert);
  const id = `fm-groupe-${groupe.titre.replace(/\W+/g, "-").toLowerCase()}`;
  return (
    <li className="fm-groupe" data-ouvert={ouvert}>
      <button type="button" className="fm-groupe-titre" aria-expanded={ouvert} aria-controls={id} onClick={() => setOuvert((v) => !v)}>
        <span>{groupe.titre}</span>
        {ouvert ? <ChevronDown size={16} strokeWidth={1.75} aria-hidden="true" /> : <ChevronRight size={16} strokeWidth={1.75} aria-hidden="true" />}
      </button>
      {ouvert && (
        <ul id={id} className="fm-groupe-liens">
          {groupe.liens.map((l) => {
            const Icone = l.icone ? ICONES[l.icone] : null;
            return (
              <li key={l.href}>
                <Link href={l.href} className="fm-lien" aria-current={l.href === chemin ? "page" : undefined} onClick={fermer}>
                  {Icone && <Icone size={16} strokeWidth={1.75} aria-hidden="true" />}
                  {l.libelle}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
}
