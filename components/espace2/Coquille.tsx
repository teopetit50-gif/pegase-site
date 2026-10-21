"use client";

/* ══════════════════════════════════════════════════════════════════════
   La coquille du nouvel espace client (06/10/2026, session C1)

   La disposition du tableau de bord de référence, version 2026 (retour de
   Teo sur le palier 1, captures de son propre tableau de bord) :
     · à GAUCHE, depuis le 21/10/2026, la navigation de Supabase en deux
       temps : un rail d'icônes de 48 px (une icône par section — accueil,
       travail, fiches, chaque module, suivi ; en bas l'aide, les réglages,
       la cloche et le compte) qui s'ouvre à 208 px au survol pour montrer
       ses libellés, puis un volet de 256 px qui liste les pages de la
       section ouverte, par groupe, sous un en-tête de 48 px ;
     · à DROITE, une barre du haut de 64 px : la portée (⌃⌄) à gauche, le
       titre de la page au centre, « Nouveau… » et « Assistant » à droite ;
       puis le contenu.
   Sous 768 px, la barre latérale devient un tiroir ouvert par un bouton.

   Les écrans lisent la source (exemple ou base réelle) par le même
   contexte que l'ancien espace (components/espace/source.tsx).
   ══════════════════════════════════════════════════════════════════════ */

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Activity, Banknote, Building2, CheckSquare, Home, Bell, Check, CheckCheck, ChevronRight, ChevronsUpDown, Database, ExternalLink, FileText, LayoutGrid, LifeBuoy, LogOut, Menu as IconeMenu, Moon, Search, Settings, Sparkles, Sun, X } from "lucide-react";
import { Button, Dialog, DialogTrigger, Modal, ModalOverlay, Popover, RouterProvider } from "react-aria-components";
import type { Utilisateur } from "@/lib/compte";
import { createClient } from "@/lib/supabase/client";
import { SourceFournisseur, useSource } from "@/components/espace/source";
import { relatif } from "@/components/espace/format";
import { FournisseurToasts, useToast } from "./Toasts";
import { ItemMenu, Kbd, MenuDeroulant, SectionMenu, SeparateurMenu } from "./ui";
import Palette from "./Palette";
import Assistant from "./Assistant";
import { useOuvertes } from "./Collection";
import { MODULES, MODULES_PRINCIPAUX, RACINE, moduleMetier, porteeDe, titreDe } from "./modules";
import { useCompteurs } from "./compteurs";
import { OrganisationContexte } from "./organisation";
import { useTheme } from "./theme";
import { useCalme } from "./mouvement";
import { useDonnees } from "./donnees";
import { A_PAYER, groupeDe } from "./filed/calculs";
import { useAujourdhui } from "./horloge";
import "./espace2.css";
import "./client.css";

function initiales(u: Utilisateur): string {
  const i = `${(u.prenom ?? "").trim().charAt(0)}${(u.nom ?? "").trim().charAt(0)}`.toUpperCase();
  return i || u.email.charAt(0).toUpperCase();
}

/* un lien vers /espace/… mène à /espace2/… ; « ?ancien=1 » le garde vers l'écran actuel */
export const versV2 = (href: string) => (/^\/espace(\/|\?|$)/.test(href) && !href.includes("ancien=1") ? href.replace(/^\/espace/, RACINE) : null);

const coche = (oui: boolean) => (oui ? <Check width={16} height={16} aria-label="choisi" /> : null);
const I = { width: 16, height: 16, strokeWidth: 1.6, "aria-hidden": true } as const;

export default function Coquille({ utilisateur, police, children }: { utilisateur: Utilisateur | null; police: string; children: React.ReactNode }) {
  const router = useRouter();
  /* les menus et fenêtres sont rendus dans <body>, hors de cet arbre : la
     variable de la police Geist doit vivre sur <html> pendant la visite */
  useEffect(() => {
    const html = document.documentElement;
    html.classList.add(police, "v2-actif", "oc-actif");
    return () => html.classList.remove(police, "v2-actif", "oc-actif");
  }, [police]);

  /* Les écrans repris de /espace écrivent leurs liens en dur vers /espace/… :
     dans le nouvel espace, ils mènent à /espace2/…. Les attributs href sont
     réécrits (survol, copie, lecteur d'écran), et un clic est rattrapé
     avant le routeur. Les liens hors de l'espace client ne sont pas touchés. */
  useEffect(() => {
    const reecrire = (racine: ParentNode) => {
      racine.querySelectorAll<HTMLAnchorElement>('a[href^="/espace"], a[data-v2-cible]').forEach((a) => {
        const href = a.getAttribute("href") ?? "";
        const v = versV2(href);
        if (v) {
          a.dataset.v2Cible = v;
          a.setAttribute("href", v);
        } else if (!href.startsWith(RACINE)) delete a.dataset.v2Cible;
      });
    };
    reecrire(document);
    const obs = new MutationObserver(() => reecrire(document));
    obs.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["href"] });
    const clic = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank") return;
      /* l'attribut a pu être réécrit déjà : le composant Link, lui, garde son href d'origine */
      const v = a.dataset.v2Cible ?? versV2(a.getAttribute("href") ?? "");
      if (!v) return;
      e.preventDefault();
      router.push(v);
    };
    window.addEventListener("click", clic, true);
    return () => {
      obs.disconnect();
      window.removeEventListener("click", clic, true);
    };
  }, [router]);
  return (
    /* .oc : le dessin du pilotage /omega, cloné pour le client (client.css, 11/10) */
    <div className="v2 oc" data-lenis-prevent="">
      <SourceFournisseur connecte={!!utilisateur}>
        <RouterProvider navigate={(href, options) => router.push(versV2(href) ?? href, options)}>
          <FournisseurToasts>
            <OrganisationContexte.Provider value={{ nom: utilisateur?.entreprise || (utilisateur ? "Mon organisation" : "CAMA"), connecte: !!utilisateur, prenom: utilisateur?.prenom ?? null }}>
              <Cadre utilisateur={utilisateur}>{children}</Cadre>
            </OrganisationContexte.Provider>
          </FournisseurToasts>
        </RouterProvider>
      </SourceFournisseur>
    </div>
  );
}

/* les alertes de la cloche : ce qui est en retard, tiré des mêmes données que la vue d'ensemble */
function useAlertes() {
  const { donnees } = useDonnees();
  /* 21/10 — l'horloge du navigateur (horloge.ts) : un retard ne se juge qu'une fois la page montée */
  const aujourdhui = useAujourdhui();
  if (!donnees) return { alertes: [], enAttente: 0 };
  const enAttente = donnees.demandes.filter((d) => d.statut === "en_attente");
  const alertes: { id: string; texte: string; quand: string | null; lien: string }[] = [];
  if (aujourdhui !== null) {
    for (const f of donnees.vue.factures) {
      if (!A_PAYER.has(f.statut) || f.nature === "avoir" || donnees.etats[f.id]?.etat === "payee") continue;
      if (groupeDe(f, aujourdhui) === "retard") alertes.push({ id: `f-${f.id}`, texte: `Facture ${f.reference ?? ""} en retard de paiement`, quand: f.echeance_lue, lien: `${RACINE}/filed/a-payer` });
    }
    for (const d of enAttente) {
      if (d.echeance && new Date(d.echeance).getTime() < aujourdhui) alertes.push({ id: `d-${d.id}`, texte: `Décision en retard : ${d.resume}`, quand: d.echeance, lien: `${RACINE}/validations` });
    }
  }
  return { alertes, enAttente: enAttente.length };
}

function Cadre({ utilisateur, children }: { utilisateur: Utilisateur | null; children: React.ReactNode }) {
  const chemin = usePathname() ?? RACINE;
  const [palette, setPalette] = useState(false);
  const [tiroir, setTiroir] = useState(false);
  const [assistant, setAssistant] = useState(false);
  /* la Vue d'ensemble ouvre l'assistant par un événement */
  useEffect(() => {
    const ouvrir = () => setAssistant(true);
    window.addEventListener("espace2-assistant", ouvrir);
    return () => window.removeEventListener("espace2-assistant", ouvrir);
  }, []);
  const portee = porteeDe(chemin);

  /* ⌘K / Ctrl+K partout ; F hors des champs de saisie */
  useEffect(() => {
    const touche = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPalette((v) => !v);
        return;
      }
      const cible = e.target as HTMLElement | null;
      const saisie = cible && (cible.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(cible.tagName));
      if (!saisie && !e.metaKey && !e.ctrlKey && !e.altKey && e.key.toLowerCase() === "f" && !document.querySelector(".v2-voile")) {
        e.preventDefault();
        setPalette(true);
      }
    };
    window.addEventListener("keydown", touche);
    return () => window.removeEventListener("keydown", touche);
  }, []);

  /* le tiroir se referme à la navigation */
  const [cheminVu, setCheminVu] = useState(chemin);
  if (cheminVu !== chemin) {
    setCheminVu(chemin);
    setTiroir(false);
  }

  return (
    <>
      <a href="#contenu" className="v2-evitement">
        Aller au contenu
      </a>
      <div className="v2-app">
        <aside className="v2-laterale v2-laterale--fixe" aria-label="Navigation de l'espace client">
          <BarreLaterale utilisateur={utilisateur} chemin={chemin} />
        </aside>
        <div className="v2-colonne-principale">
          <header className="v2-haut">
            <div className="v2-haut-gauche">
              <button type="button" className="v2-btn v2-btn--petit v2-btn--icone v2-btn--fantome v2-seul-mobile" aria-label="Ouvrir la navigation" onClick={() => setTiroir(true)}>
                <IconeMenu {...I} />
              </button>
              <MenuDeroulant
                etiquette={`Portée : ${portee ? portee.nom : "tous les modules"}. Changer de module`}
                classe="v2-portee"
                placement="bottom start"
                largeur={300}
                declencheur={
                  <>
                    {portee ? <portee.icone {...I} /> : <LayoutGrid {...I} />}
                    <span className="v2-portee-nom">{portee ? portee.nom : "Tous les modules"}</span>
                    <ChevronsUpDown width={14} height={14} aria-hidden="true" />
                  </>
                }
              >
                <ItemMenu id="tous" href={RACINE} textValue="Tous les modules" icone={<LayoutGrid {...I} />} suffixe={coche(!portee)}>
                  Tous les modules
                </ItemMenu>
                <SeparateurMenu />
                <SectionMenu titre="Modules">
                  {MODULES.map((m) => (
                    <ItemMenu key={m.cle} id={m.cle} href={`${RACINE}/${m.cle}${m.cle === "filed" ? "/a-payer" : ""}`} textValue={m.nom} icone={<m.icone {...I} />} suffixe={coche(m.cle === portee?.cle)}>
                      {m.nom} <span className="v2-gris">· {m.libelle}</span>
                    </ItemMenu>
                  ))}
                </SectionMenu>
              </MenuDeroulant>
            </div>
            {/* le titre visible ; chaque page porte son propre h1 (masqué), pour garder le titre exact de l'écran */}
            <p className="v2-haut-titre">{titreDe(chemin)}</p>
            <div className="v2-haut-droite">
              {/* la palette (touche F) : un bouton de la barre du haut, comme la recherche ⌘K de Supabase (21/10) */}
              <button type="button" className="v2-btn v2-btn--petit v2-recherche" onClick={() => setPalette(true)} aria-keyshortcuts="F Meta+K Control+K" aria-label="Rechercher">
                <Search {...I} />
                <span className="v2-masque-mobile">Rechercher…</span>
                <span className="v2-masque-mobile">
                  <Kbd>F</Kbd>
                </span>
              </button>
              <MenuDeroulant
                etiquette="Nouveau"
                classe="v2-btn v2-btn--petit v2-btn--primaire"
                largeur={260}
                declencheur={
                  <>
                    <span aria-hidden="true" style={{ fontSize: 16, lineHeight: 1 }}>
                      +
                    </span>
                    <span className="v2-masque-mobile">Nouveau…</span>
                  </>
                }
              >
                <ItemMenu id="paiement" href={`${RACINE}/filed/a-payer`} icone={<Banknote {...I} />}>
                  Noter un paiement
                </ItemMenu>
                <ItemMenu id="document" href={`${RACINE}/filed`} icone={<FileText {...I} />}>
                  Déposer un document
                </ItemMenu>
                <ItemMenu id="valider" href={`${RACINE}/validations`} icone={<CheckCheck {...I} />}>
                  Décider d&apos;une validation
                </ItemMenu>
              </MenuDeroulant>
              <button type="button" className="v2-btn v2-btn--petit v2-masque-mobile" onClick={() => setAssistant(true)}>
                <Sparkles {...I} /> Assistant
              </button>
            </div>
          </header>
          <main id="contenu" tabIndex={-1} style={{ outline: "none" }}>
            {children}
          </main>
        </div>
      </div>

      <Assistant ouvert={assistant} changer={setAssistant} connecte={!!utilisateur} prenom={utilisateur?.prenom ?? null} />
      <ModalOverlay isOpen={tiroir} onOpenChange={setTiroir} isDismissable className="v2-jetons v2-voile v2-voile--tiroir">
        <Modal className="v2-tiroir">
          <Dialog className="v2-modale-dialogue v2-laterale" aria-label="Navigation de l'espace client">
            <BarreLaterale utilisateur={utilisateur} chemin={chemin} fermer={() => setTiroir(false)} />
          </Dialog>
        </Modal>
      </ModalOverlay>
      <Palette ouverte={palette} changer={setPalette} />
    </>
  );
}

type Lien = { libelle: string; href: string; icone?: React.ReactNode; exact?: boolean; /** l'adresse qui allume l'entrée, quand le lien mène à une sous-page */ racine?: string; compteur?: number; sous?: { libelle: string; href: string }[]; bientot?: boolean };

/* une section du rail : une icône, et le volet des pages qu'elle ouvre
   (comme « Database » → Schema Visualizer, Tables… chez Supabase) */
type Section = { cle: string; titre: string; sousTitre?: string; icone: React.ReactNode; href: string; racines: string[]; groupes: { titre?: string; liens: Lien[] }[] };

/* les icônes du rail : size-5 et trait 1,5, comme la Sidebar du studio Supabase */
const R = { width: 20, height: 20, strokeWidth: 1.5, "aria-hidden": true } as const;

function BarreLaterale({ utilisateur, chemin, fermer }: { utilisateur: Utilisateur | null; chemin: string; fermer?: () => void }) {
  const [theme, changerTheme] = useTheme();
  useCalme();
  const toast = useToast();
  const { source, changer, connecte } = useSource();
  const { alertes, enAttente } = useAlertes();
  const compteurs = useCompteurs();
  const tachesOuvertes = useOuvertes("taches");
  const metier = moduleMetier(utilisateur?.secteur, !!utilisateur);
  const organisation = utilisateur?.entreprise || (utilisateur ? "Mon organisation" : "CAMA");
  const nom = utilisateur ? [utilisateur.prenom, utilisateur.nom].filter(Boolean).join(" ") || utilisateur.email : null;

  const choisirSource = (s: "exemple" | "reelle") => {
    if (s === "reelle" && !connecte) return;
    changer(s);
    toast(s === "reelle" ? "Base réelle affichée" : "Données d'exemple affichées");
  };
  /* /auth/signout n'accepte qu'un POST (une déconnexion ne suit jamais un simple lien) */
  const deconnecter = () => {
    const f = document.createElement("form");
    f.method = "post";
    f.action = "/auth/signout";
    document.body.append(f);
    f.submit();
  };

  /* 21/10/2026 — demande de Teo : la navigation de Supabase, en deux
     temps. Un rail d'icônes (une par section : l'accueil, le travail, les
     fiches, chaque module, le suivi ; en bas l'aide et les réglages) ;
     cliquer une icône mène à la première page de la section, et le volet
     à droite du rail liste ses pages, par groupe. Le rail s'ouvre au
     survol pour montrer ses libellés. Remplace les sections repliables à
     la Attio du 07/10. Les modules annoncés (« bientôt ») ne sont plus
     dans la navigation : ils restent dans le menu « Tous les modules ». */
  const pagesDe = (cle: string): Lien[] => {
    if (cle === "filed")
      return [
        { libelle: "Tableau de bord", href: `${RACINE}/filed`, exact: true },
        { libelle: "À payer", href: `${RACINE}/filed/a-payer` },
        { libelle: "Fournisseurs", href: `${RACINE}/filed/fournisseurs` },
        { libelle: "Boîte de réception", href: `${RACINE}/filed/boite` },
        { libelle: "Comptabilité", href: `${RACINE}/filed/comptabilite` },
      ];
    if (cle === "cashd") return SOUS_CASHD.map((s, i) => ({ ...s, exact: i === 0 }));
    if (cle === "reput")
      return [
        { libelle: "Demandes", href: `${RACINE}/reput`, exact: true },
        { libelle: "Base de connaissances", href: `${RACINE}/reput/base` },
        { libelle: "Sujets autorisés", href: `${RACINE}/reput/sujets` },
        { libelle: "Réglages et avis", href: `${RACINE}/reput/reglages` },
      ];
    if (cle === "offload") return [{ libelle: "Comptes à risque", href: `${RACINE}/offload`, exact: true }];
    return [{ libelle: "Tableau de bord", href: `${RACINE}/${cle}`, exact: true }];
  };
  /* 21/10/2026 — demande de Teo : sous les écrans de travail, une page par
     groupe de fonctions vendues sur la page produit du module */
  const fonctionsDe = (cle: string): Lien[] => FONCTIONS[cle] ?? [];
  const modules = MODULES.filter((m) => MODULES_PRINCIPAUX.includes(m.cle) || m.cle === metier)
    /* les quatre communs dans leur ordre, puis le module du métier */
    .sort((a, b) => Number(a.cle === metier) - Number(b.cle === metier));
  const sections: Section[] = [
    {
      cle: "accueil",
      titre: "Accueil",
      icone: <Home {...R} />,
      href: RACINE,
      racines: [],
      groupes: [
        {
          titre: "Tableau de bord",
          liens: [
            { libelle: "Vue d'ensemble", href: RACINE, exact: true },
            { libelle: "À valider", href: `${RACINE}/validations`, compteur: enAttente },
            { libelle: "Point du matin", href: `${RACINE}/point` },
            { libelle: "Demandes reçues", href: `${RACINE}/demandes` },
          ],
        },
      ],
    },
    {
      cle: "travail",
      titre: "Travail",
      icone: <CheckSquare {...R} />,
      href: `${RACINE}/taches`,
      racines: [],
      groupes: [
        {
          titre: "Au quotidien",
          liens: [
            { libelle: "Tâches", href: `${RACINE}/taches`, compteur: tachesOuvertes },
            { libelle: "Notes", href: `${RACINE}/notes` },
            { libelle: "Appels", href: `${RACINE}/appels` },
          ],
        },
      ],
    },
    {
      cle: "fiches",
      titre: "Fiches",
      icone: <Building2 {...R} />,
      href: `${RACINE}/entreprises`,
      racines: [],
      groupes: [
        {
          titre: "Annuaire",
          liens: [
            { libelle: "Entreprises", href: `${RACINE}/entreprises` },
            { libelle: "Contacts", href: `${RACINE}/contacts` },
          ],
        },
      ],
    },
    ...modules.map<Section>((m) => ({
      cle: m.cle,
      titre: m.nom,
      sousTitre: m.libelle,
      icone: <m.icone {...R} />,
      /* FILED ouvre sur « À payer », son écran de travail */
      href: `${RACINE}/${m.cle}${m.cle === "filed" ? "/a-payer" : ""}`,
      racines: [`${RACINE}/${m.cle}`],
      groupes: [
        { titre: "Pages", liens: pagesDe(m.cle).map((l, i) => (i === 0 ? { ...l, compteur: compteurs[m.cle] } : l)) },
        ...(fonctionsDe(m.cle).length ? [{ titre: "Fonctions", liens: fonctionsDe(m.cle) }] : []),
      ],
    })),
    {
      cle: "suivi",
      titre: "Suivi",
      icone: <Activity {...R} />,
      href: `${RACINE}/activite`,
      racines: [],
      groupes: [
        {
          titre: "Suivi",
          liens: [
            { libelle: "Activité", href: `${RACINE}/activite` },
            { libelle: "Automatisations", href: `${RACINE}/automatisations` },
            { libelle: "Utilisation", href: `${RACINE}/utilisation` },
          ],
        },
      ],
    },
  ];
  const reglages: Section = {
    cle: "reglages",
    titre: "Réglages",
    icone: <Settings {...R} />,
    href: `${RACINE}/reglages`,
    racines: [`${RACINE}/reglages`, `${RACINE}/equipe`],
    groupes: [
      {
        titre: "Réglages",
        liens: [
          { libelle: "Général", href: `${RACINE}/reglages`, exact: true },
          { libelle: "Accessibilité", href: `${RACINE}/reglages#accessibilite`, exact: true },
          { libelle: "Données", href: `${RACINE}/reglages#donnees`, exact: true },
          { libelle: "Équipe", href: `${RACINE}/equipe` },
        ],
      },
    ],
  };
  const toutes = [...sections, reglages];
  const ouvre = (l: Lien) => (l.exact ? chemin === l.href : chemin === (l.racine ?? l.href) || chemin.startsWith(`${l.racine ?? l.href}/`));
  const courante =
    toutes.find((s) => s.racines.some((r) => chemin === r || chemin.startsWith(`${r}/`))) ??
    toutes.find((s) => s.groupes.some((g) => g.liens.some(ouvre))) ??
    sections[0];
  /* les groupes du rail, séparés par un filet : l'accueil ; travail et fiches ; les modules ; le suivi */
  const rail: Section[][] = [[sections[0]], sections.slice(1, 3), sections.slice(3, 3 + modules.length), sections.slice(3 + modules.length)].filter((g) => g.length);
  /* 21/10 (soir), capture de Teo : la bulle « title » du navigateur restait
     dessinée par-dessus le rail ouvert (« Travail » collée sur « Accueil »),
     et parfois après le survol — le navigateur la pose et l'enlève à sa
     guise, rien ne la commande. Le rail s'ouvre au survol et montre le
     libellé lui-même : pas de title, donc ni doublon ni bulle figée. */
  const iconeRail = (s: Section) => (
    <Link href={s.href} className="v2-rail-item" data-actif={s.cle === courante.cle ? "" : undefined} aria-current={s.cle === courante.cle ? "true" : undefined}>
      {s.icone}
      <span className="v2-rail-libelle">{s.titre}</span>
    </Link>
  );

  return (
    <div className="v2-laterale-int">
      <div className="v2-rail-place" aria-hidden="true" />
      <div className="v2-rail">
        <div className="v2-rail-int">
          <MenuDeroulant
            /* le nom accessible contient le texte visible (« RENAULT » en
               démonstration) — WCAG 2.5.3 */
            etiquette={`Organisation : ${utilisateur ? "" : "Renault, "}${organisation}. Changer d'organisation ou de données`}
            classe="v2-rail-item v2-rail-logo"
            placement="bottom start"
            largeur={260}
            declencheur={
              <>
                {/* 14/10 — demande de Teo : « mets juste le logo Omega là ». Le
                   logo tient lieu d'icône du rail ; le nom de l'organisation
                   apparaît quand le rail s'ouvre. */}
                <span className="v2-marque-omega" aria-hidden="true">
                  {/* eslint-disable-next-line @next/next/no-img-element -- le logo Omega, déjà à sa taille */}
                  <img src="/logo-pegase-blanc.png" alt="" width={20} height={20} className="oc-logo-sombre" />
                  {/* eslint-disable-next-line @next/next/no-img-element -- la variante noire, pour le thème clair */}
                  <img src="/logo-pegase.png" alt="" width={20} height={20} className="oc-logo-clair" />
                </span>
                <span className="v2-rail-libelle">{organisation}</span>
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
              <ItemMenu id="exemple" onAction={() => choisirSource("exemple")} icone={<Database {...I} />} suffixe={coche(source === "exemple")}>
                Données d&apos;exemple
              </ItemMenu>
              <ItemMenu id="reelle" isDisabled={!connecte} onAction={() => choisirSource("reelle")} textValue="Base réelle" icone={<Database {...I} />} suffixe={connecte ? coche(source === "reelle") : <span>connexion requise</span>}>
                Base réelle
              </ItemMenu>
            </SectionMenu>
          </MenuDeroulant>

          <nav className="v2-rail-nav" aria-label="Sections">
            {rail.map((g, i) => (
              <ul key={i} className="v2-rail-groupe">
                {g.map((s) => (
                  <li key={s.cle}>{iconeRail(s)}</li>
                ))}
              </ul>
            ))}
          </nav>

          <div className="v2-rail-bas">
            <ul className="v2-rail-groupe">
              <li>
                <Link href="/contact" className="v2-rail-item">
                  <LifeBuoy {...R} />
                  <span className="v2-rail-libelle">Aide</span>
                </Link>
              </li>
              <li>{iconeRail(reglages)}</li>
            </ul>
            <ul className="v2-rail-groupe">
              <li>
                <DialogTrigger>
                  <Button className="v2-rail-item" aria-label={alertes.length ? `Alertes : ${alertes.length}` : "Alertes : aucune"}>
                    <Bell {...R} />
                    <span className="v2-rail-libelle">Alertes</span>
                    {alertes.length ? <span className="v2-rond-pastille" aria-hidden="true" /> : null}
                  </Button>
                  <Popover placement="top start" offset={8} className="v2-jetons v2-popover" style={{ width: 320 }}>
                    <Dialog className="v2-modale-dialogue" aria-label="Alertes">
                      <div className="v2-menu-entete" style={{ padding: "14px 16px 10px", borderBottom: "1px solid var(--v2-a-400)" }}>
                        <strong>Alertes</strong>
                      </div>
                      {alertes.length ? (
                        <ul className="v2-liste">
                          {alertes.map((a) => (
                            <li key={a.id} className="v2-liste-item">
                              <span className="v2-point" data-teinte="rouge" aria-hidden="true" />
                              <span className="v2-liste-texte">
                                <Link href={a.lien}>{a.texte}</Link>
                                <small>{relatif(a.quand)}</small>
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="v2-gris" style={{ margin: 0, padding: "24px 16px", textAlign: "center" }}>
                          Rien d&apos;urgent.
                        </p>
                      )}
                    </Dialog>
                  </Popover>
                </DialogTrigger>
              </li>
              <li>
                <MenuDeroulant
                  etiquette="Menu du compte"
                  classe="v2-rail-item"
                  placement="top start"
                  largeur={260}
                  entete={
                    <div className="v2-menu-entete" style={{ padding: "16px 16px 4px" }}>
                      <strong>{nom ?? "Non connecté"}</strong>
                      <small>{utilisateur ? utilisateur.email : "Vous voyez l'exemple : Atelier Bertin"}</small>
                    </div>
                  }
                  declencheur={
                    <>
                      <span className="v2-avatar" aria-hidden="true" data-vide={utilisateur ? undefined : ""}>
                        {utilisateur ? initiales(utilisateur) : "?"}
                      </span>
                      <span className="v2-rail-libelle">{nom ?? "Non connecté"}</span>
                    </>
                  }
                >
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
                    {utilisateur ? (
                      <ItemMenu id="sortir" onAction={deconnecter} icone={<LogOut {...I} />}>
                        Se déconnecter
                      </ItemMenu>
                    ) : null}
                  </SectionMenu>
                </MenuDeroulant>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="v2-volet">
        {/* l'en-tête du volet : le titre de la section, comme « Database » chez Supabase */}
        <div className="v2-laterale-haut">
          <p className="v2-volet-titre">
            {courante.titre}
            {courante.sousTitre ? <span className="v2-gris"> · {courante.sousTitre}</span> : null}
          </p>
          {fermer ? (
            <button type="button" className="v2-btn v2-btn--petit v2-btn--icone v2-btn--fantome" aria-label="Fermer la navigation" onClick={fermer}>
              <X {...I} />
            </button>
          ) : null}
        </div>
        <nav className="v2-laterale-nav" aria-label={`Pages de ${courante.titre}`}>
          {courante.groupes.map((g, i) => (
            <div key={i} className="v2-section">
              {g.titre ? <div className="v2-section-titre">{g.titre}</div> : null}
              <ul className="v2-groupe">
                {g.liens.map((l) => (
                  <LienLateral key={l.href} lien={l} chemin={chemin} />
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>
    </div>
  );
}

/* le logo du client : une URL signée du seau omega-clients ; sans logo
   (ou s'il ne se lit pas), l'initiale de l'entreprise */
function LogoClient({ chemin, nom, demo }: { chemin: string | null; nom: string; demo?: boolean }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!chemin) return;
    let actif = true;
    createClient()
      .storage.from("omega-clients")
      .createSignedUrl(chemin, 3600)
      .then(({ data }) => {
        if (actif && data?.signedUrl) setUrl(data.signedUrl);
      });
    return () => {
      actif = false;
    };
  }, [chemin]);
  /* la démonstration : CAMA, concession Renault — le losange, dessiné */
  if (demo)
    return (
      <span className="v2-marque-renault" aria-hidden="true">
        {/* le losange Renault (deux brins en chevrons), tracé d'après le logo fourni par Teo */}
        <svg viewBox="290 60 670 880" width="13" height="17" fill="currentColor">
          <polygon points="528,65 595,65 362,500 295,500" />
          <polygon points="295,500 362,500 595,935 528,935" />
          <polygon points="528,935 595,935 828,500 761,500" />
          <polygon points="761,500 828,500 713,285 646,285" />
          <polygon points="655,65 722,65 955,500 888,500" />
          <polygon points="888,500 955,500 722,935 655,935" />
          <polygon points="655,65 722,65 489,500 422,500" />
          <polygon points="422,500 489,500 605,715 538,715" />
        </svg>
        <span>RENAULT</span>
      </span>
    );
  return (
    /* l'initiale, sans logo, est dessinée en CSS : elle ne s'ajoute pas au
       texte visible du bouton, que son nom accessible doit contenir */
    <span className="v2-marque-client" aria-hidden="true" data-initiale={chemin && url ? undefined : nom.charAt(0).toUpperCase()}>
      {/* eslint-disable-next-line @next/next/no-img-element -- une URL signée, hors de next/image */}
      {chemin && url ? <img src={url} alt="" width={20} height={20} /> : null}
    </span>
  );
}

/* CASHD : le tableau de bord, puis chaque vue de l'écran de travail —
   EcranCashd (C2) ouvre la vue que porte ?vue= */
const SOUS_CASHD = [
  { libelle: "Tableau de bord", href: `${RACINE}/cashd` },
  { libelle: "Débiteurs", href: `${RACINE}/cashd/suivi?vue=debiteurs` },
  { libelle: "Relances", href: `${RACINE}/cashd/suivi?vue=relances` },
  { libelle: "Envois", href: `${RACINE}/cashd/suivi?vue=envois` },
  { libelle: "Trésorerie", href: `${RACINE}/cashd/suivi?vue=tresorerie` },
];

/* les pages de fonction de chaque module (21/10/2026) */
const FONCTIONS: Record<string, Lien[]> = {
  cashd: [
    { libelle: "Balance âgée", href: `${RACINE}/cashd/balance` },
    { libelle: "Litiges et pauses", href: `${RACINE}/cashd/litiges` },
    { libelle: "Risque client", href: `${RACINE}/cashd/risque` },
    { libelle: "Devis sans réponse", href: `${RACINE}/cashd/devis` },
    { libelle: "Encaissements", href: `${RACINE}/cashd/encaissements` },
  ],
  reput: [{ libelle: "Urgences et escalade", href: `${RACINE}/reput/urgences` }],
  offload: [
    { libelle: "Échéances", href: `${RACINE}/offload/echeances` },
    { libelle: "Affaires en plan", href: `${RACINE}/offload/affaires` },
    { libelle: "Groupes clients", href: `${RACINE}/offload/groupes` },
    { libelle: "Garde-fous", href: `${RACINE}/offload/garde-fous` },
    { libelle: "Pilotage", href: `${RACINE}/offload/pilotage` },
  ],
};

function LienLateral({ lien, chemin }: { lien: Lien; chemin: string }) {
  const base = lien.racine ?? lien.href;
  const dedans = lien.exact ? chemin === lien.href : chemin === base || chemin.startsWith(`${base}/`);
  const [ouvert, setOuvert] = useState(dedans);
  /* les icônes (lien.icone) ne sont plus rendues ici : le volet de Supabase
     n'en a pas devant ses entrées (21/10) ; la palette les garde */
  /* un module annoncé : sa place, sans lien tant que son écran n'existe pas */
  if (lien.bientot) {
    return (
      <li>
        <span className="v2-lien v2-lien--bientot" aria-disabled="true">
          <span>{lien.libelle}</span>
          <span className="v2-badge">bientôt</span>
        </span>
      </li>
    );
  }
  const id = `sous-${lien.href.replace(/\W+/g, "-")}`;
  if (lien.sous) {
    return (
      <li>
        <button type="button" className="v2-lien" aria-expanded={ouvert} aria-controls={id} data-dedans={dedans ? "" : undefined} onClick={() => setOuvert((v) => !v)}>
          <span>{lien.libelle}</span>
          <ChevronRight width={14} height={14} aria-hidden="true" className="v2-lien-chevron" />
        </button>
        <div className="v2-sous-menu" id={id} data-ouvert={ouvert ? "" : undefined}>
          <ul inert={!ouvert}>
            {lien.sous.map((s) => (
              <li key={s.href}>
                <Link href={s.href} className="v2-lien v2-lien--sous" aria-current={!s.href.includes("#") && chemin === s.href ? "page" : undefined}>
                  {s.libelle}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </li>
    );
  }
  return (
    <li>
      <Link href={lien.href} className="v2-lien" aria-current={dedans ? "page" : undefined}>
        <span>{lien.libelle}</span>
        {lien.compteur ? <span className="v2-lien-compteur">{lien.compteur}</span> : null}
      </Link>
    </li>
  );
}
