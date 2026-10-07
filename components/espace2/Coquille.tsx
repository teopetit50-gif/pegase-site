"use client";

/* ══════════════════════════════════════════════════════════════════════
   La coquille du nouvel espace client (06/10/2026, session C1)

   La disposition du tableau de bord de référence, version 2026 (retour de
   Teo sur le palier 1, captures de son propre tableau de bord) :
     · à GAUCHE, une barre latérale de 255 px, pleine hauteur : le
       sélecteur d'organisation, le champ « Rechercher » (touche F), trois
       groupes de liens séparés par un filet — l'organisation, les modules
       (ceux qui ont des sous-pages se déplient), l'aide et les réglages —
       et, tout en bas, la personne, son menu « … » et la cloche ;
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
import { Activity, Banknote, Building2, CheckSquare, ChevronDown, NotebookPen, Phone, Users, Workflow, Gauge, Inbox, Bell, Check, CheckCheck, ChevronRight, ChevronsUpDown, Database, ExternalLink, FileText, LayoutGrid, LifeBuoy, LogOut, Menu as IconeMenu, MoreHorizontal, Search, Settings, Sparkles, Sun, X } from "lucide-react";
import { Button, Dialog, DialogTrigger, Modal, ModalOverlay, Popover, RouterProvider } from "react-aria-components";
import type { Utilisateur } from "@/lib/compte";
import { SourceFournisseur, useSource } from "@/components/espace/source";
import { relatif } from "@/components/espace/format";
import { FournisseurToasts, useToast } from "./Toasts";
import { ItemMenu, Kbd, MenuDeroulant, SectionMenu, SeparateurMenu } from "./ui";
import Palette from "./Palette";
import { ecrireStockage, useOuvertes, useStockage } from "./Collection";
import { MODULES, MODULES_A_VENIR, MODULES_PRINCIPAUX, RACINE, moduleMetier, porteeDe, titreDe } from "./modules";
import { useCompteurs } from "./compteurs";
import { OrganisationContexte } from "./organisation";
import { useTheme } from "./theme";
import { useCalme } from "./mouvement";
import { useDonnees } from "./donnees";
import { A_PAYER, groupeDe, minuit } from "./filed/calculs";
import "./espace2.css";

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
    html.classList.add(police, "v2-actif");
    return () => html.classList.remove(police, "v2-actif");
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
    <div className="v2" data-lenis-prevent="">
      <SourceFournisseur connecte={!!utilisateur}>
        <RouterProvider navigate={(href, options) => router.push(versV2(href) ?? href, options)}>
          <FournisseurToasts>
            <OrganisationContexte.Provider value={{ nom: utilisateur?.entreprise || (utilisateur ? "Mon organisation" : "Atelier Bertin"), connecte: !!utilisateur }}>
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
  const [aujourdhui] = useState(minuit);
  if (!donnees) return { alertes: [], enAttente: 0 };
  const enAttente = donnees.demandes.filter((d) => d.statut === "en_attente");
  const alertes: { id: string; texte: string; quand: string | null; lien: string }[] = [];
  for (const f of donnees.vue.factures) {
    if (!A_PAYER.has(f.statut) || f.nature === "avoir" || donnees.etats[f.id]?.etat === "payee") continue;
    if (groupeDe(f, aujourdhui) === "retard") alertes.push({ id: `f-${f.id}`, texte: `Facture ${f.reference ?? ""} en retard de paiement`, quand: f.echeance_lue, lien: `${RACINE}/filed/a-payer` });
  }
  for (const d of enAttente) {
    if (d.echeance && new Date(d.echeance).getTime() < aujourdhui) alertes.push({ id: `d-${d.id}`, texte: `Décision en retard : ${d.resume}`, quand: d.echeance, lien: `${RACINE}/validations` });
  }
  return { alertes, enAttente: enAttente.length };
}

function Cadre({ utilisateur, children }: { utilisateur: Utilisateur | null; children: React.ReactNode }) {
  const chemin = usePathname() ?? RACINE;
  const [palette, setPalette] = useState(false);
  const [tiroir, setTiroir] = useState(false);
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
          <BarreLaterale utilisateur={utilisateur} chemin={chemin} ouvrirPalette={() => setPalette(true)} />
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
              <button type="button" className="v2-btn v2-btn--petit v2-masque-mobile" disabled title="L'assistant arrive bientôt">
                <Sparkles {...I} /> Assistant
                <span className="v2-badge">bientôt</span>
              </button>
            </div>
          </header>
          <main id="contenu" tabIndex={-1} style={{ outline: "none" }}>
            {children}
          </main>
        </div>
      </div>

      <ModalOverlay isOpen={tiroir} onOpenChange={setTiroir} isDismissable className="v2-jetons v2-voile v2-voile--tiroir">
        <Modal className="v2-tiroir">
          <Dialog className="v2-modale-dialogue v2-laterale" aria-label="Navigation de l'espace client">
            <BarreLaterale utilisateur={utilisateur} chemin={chemin} ouvrirPalette={() => setPalette(true)} fermer={() => setTiroir(false)} />
          </Dialog>
        </Modal>
      </ModalOverlay>
      <Palette ouverte={palette} changer={setPalette} />
    </>
  );
}

type Lien = { libelle: string; href: string; icone: React.ReactNode; exact?: boolean; /** l'adresse qui allume l'entrée, quand le lien mène à une sous-page */ racine?: string; compteur?: number; sous?: { libelle: string; href: string }[]; bientot?: boolean };

function BarreLaterale({ utilisateur, chemin, ouvrirPalette, fermer }: { utilisateur: Utilisateur | null; chemin: string; ouvrirPalette: () => void; fermer?: () => void }) {
  useTheme();
  useCalme();
  const toast = useToast();
  const { source, changer, connecte } = useSource();
  const { alertes, enAttente } = useAlertes();
  const compteurs = useCompteurs();
  const tachesOuvertes = useOuvertes("taches");
  const metier = moduleMetier(utilisateur?.secteur, !!utilisateur);
  const [ouvertes, basculer] = useSections();
  const organisation = utilisateur?.entreprise || (utilisateur ? "Mon organisation" : "Atelier Bertin");
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

  /* 07/10/2026 — demande de Teo : des sections titrées, comme la barre
     d'Attio (« Records ⌄ », « Lists ⌄ »), qui se replient d'un clic pour
     que la liste ne devienne pas immense à faire défiler. */
  const groupes: { titre?: string; liens: Lien[] }[] = [
    {
      liens: [
        { libelle: "Vue d'ensemble", href: RACINE, icone: <LayoutGrid {...I} />, exact: true },
        { libelle: "À valider", href: `${RACINE}/validations`, icone: <CheckCheck {...I} />, compteur: enAttente },
        { libelle: "Point du matin", href: `${RACINE}/point`, icone: <Sun {...I} /> },
        { libelle: "Demandes reçues", href: `${RACINE}/demandes`, icone: <Inbox {...I} /> },
      ],
    },
    {
      titre: "Travail",
      liens: [
        { libelle: "Tâches", href: `${RACINE}/taches`, icone: <CheckSquare {...I} />, compteur: tachesOuvertes },
        { libelle: "Notes", href: `${RACINE}/notes`, icone: <NotebookPen {...I} /> },
        { libelle: "Appels", href: `${RACINE}/appels`, icone: <Phone {...I} /> },
      ],
    },
    {
      titre: "Fiches",
      liens: [
        { libelle: "Entreprises", href: `${RACINE}/entreprises`, icone: <Building2 {...I} /> },
        { libelle: "Contacts", href: `${RACINE}/contacts`, icone: <Users {...I} /> },
      ],
    },
    {
      titre: "Modules",
      liens: MODULES.filter((m) => MODULES_PRINCIPAUX.includes(m.cle) || m.cle === metier)
        /* les quatre communs dans leur ordre, puis le module du métier */
        .sort((a, b) => Number(a.cle === metier) - Number(b.cle === metier))
        .map<Lien>((m) => ({
          libelle: m.nom,
          /* FILED : un lien simple vers « À payer », sans menu déroulant —
             ses autres pages sont dans ses onglets */
          href: `${RACINE}/${m.cle}${m.cle === "filed" ? "/a-payer" : ""}`,
          racine: `${RACINE}/${m.cle}`,
          icone: <m.icone {...I} />,
          compteur: compteurs[m.cle],
        }))
        .concat(MODULES_A_VENIR.map<Lien>((m) => ({ libelle: m.nom, href: `${RACINE}/${m.cle}`, icone: <m.icone {...I} />, bientot: true }))),
    },
    {
      titre: "Suivi",
      liens: [
        { libelle: "Activité", href: `${RACINE}/activite`, icone: <Activity {...I} /> },
        { libelle: "Automatisations", href: `${RACINE}/automatisations`, icone: <Workflow {...I} /> },
        { libelle: "Utilisation", href: `${RACINE}/utilisation`, icone: <Gauge {...I} /> },
      ],
    },
    {
      liens: [
        { libelle: "Aide", href: "/contact", icone: <LifeBuoy {...I} /> },
        {
          libelle: "Réglages",
          href: `${RACINE}/reglages`,
          icone: <Settings {...I} />,
          sous: [
            { libelle: "Accessibilité", href: `${RACINE}/reglages#accessibilite` },
            { libelle: "Données", href: `${RACINE}/reglages#donnees` },
            { libelle: "Équipe", href: `${RACINE}/reglages#compte` },
          ],
        },
      ],
    },
  ];

  return (
    <div className="v2-laterale-int">
      <div className="v2-laterale-haut">
        <MenuDeroulant
          etiquette={`Organisation : ${organisation}. Changer d'organisation ou de données`}
          classe="v2-equipe"
          placement="bottom start"
          largeur={260}
          declencheur={
            <>
              <span className="v2-pastille-ronde" aria-hidden="true">
                {/* eslint-disable-next-line @next/next/no-img-element -- le logo Omega, 16 px, déjà à sa taille */}
                <img src="/logo-pegase-blanc.png" alt="" width={16} height={16} />
              </span>
              <span className="v2-equipe-nom">{organisation}</span>
              <span className="v2-badge" data-teinte={source === "reelle" ? "bleu" : "gris"}>
                {source === "reelle" ? "Base réelle" : "Exemple"}
              </span>
              <ChevronsUpDown width={14} height={14} aria-hidden="true" className="v2-equipe-chevrons" />
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
        {fermer ? (
          <button type="button" className="v2-btn v2-btn--petit v2-btn--icone v2-btn--fantome" aria-label="Fermer la navigation" onClick={fermer}>
            <X {...I} />
          </button>
        ) : null}
      </div>

      <button
        type="button"
        className="v2-trouver"
        onClick={() => {
          fermer?.();
          ouvrirPalette();
        }}
        aria-label="Rechercher (touche F)"
        aria-keyshortcuts="F Meta+K Control+K"
      >
        <Search {...I} />
        <span>Rechercher…</span>
        <Kbd>F</Kbd>
      </button>

      <nav className="v2-laterale-nav" aria-label="Pages et modules">
        {groupes.map((g, i) => {
          /* fermée par défaut (Teo, 07/10) ; celle de la page courante
             s'ouvre seule, tant qu'on ne l'a pas refermée à la main */
          const ici = g.liens.some((l) => chemin === (l.racine ?? l.href) || chemin.startsWith(`${l.racine ?? l.href}/`));
          const replie = !!g.titre && !(ouvertes[g.titre] ?? ici);
          return (
            <div key={i} className="v2-section">
              {g.titre ? (
                <button type="button" className="v2-section-titre" aria-expanded={!replie} onClick={() => basculer(g.titre!, replie)}>
                  <span>{g.titre}</span>
                  <ChevronDown width={14} height={14} aria-hidden="true" />
                </button>
              ) : null}
              {replie ? null : (
                <ul className="v2-groupe">
                  {g.liens.map((l) => (
                    <LienLateral key={l.href} lien={l} chemin={chemin} />
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </nav>

      <div className="v2-laterale-bas">
        <span className="v2-moi">
          <span className="v2-avatar" aria-hidden="true" data-vide={utilisateur ? undefined : ""}>
            {utilisateur ? initiales(utilisateur) : "?"}
          </span>
          <span className="v2-moi-nom">{nom ?? "Non connecté"}</span>
        </span>
        <MenuDeroulant
          etiquette="Menu du compte"
          classe="v2-rond"
          placement="top end"
          largeur={260}
          entete={
            <div className="v2-menu-entete" style={{ padding: "16px 16px 4px" }}>
              <strong>{nom ?? "Non connecté"}</strong>
              <small>{utilisateur ? utilisateur.email : "Vous voyez l'exemple : Atelier Bertin"}</small>
            </div>
          }
          declencheur={<MoreHorizontal {...I} />}
        >
          <SectionMenu>
            <ItemMenu id="ancien" href="/espace/validations?ancien=1" icone={<ExternalLink {...I} />}>
              Ancien espace client
            </ItemMenu>
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
        <DialogTrigger>
          <Button className="v2-rond" aria-label={alertes.length ? `Alertes : ${alertes.length}` : "Alertes : aucune"}>
            <Bell {...I} />
            {alertes.length ? <span className="v2-rond-pastille" aria-hidden="true" /> : null}
          </Button>
          <Popover placement="top end" offset={8} className="v2-jetons v2-popover" style={{ width: 320 }}>
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
      </div>
    </div>
  );
}

/* l'état ouvert / fermé choisi à la main pour chaque section, gardé sur
   l'appareil ; une section jamais touchée suit la règle par défaut */
function useSections(): [Record<string, boolean>, (titre: string, ouvrir: boolean) => void] {
  const brut = useStockage("espace2-sections");
  let etat: Record<string, boolean> = {};
  try {
    const v = JSON.parse(brut || "{}");
    if (v && typeof v === "object" && !Array.isArray(v)) etat = v;
  } catch {}
  const basculer = (titre: string, ouvrir: boolean) => ecrireStockage("espace2-sections", JSON.stringify({ ...etat, [titre]: ouvrir }));
  return [etat, basculer];
}

function LienLateral({ lien, chemin }: { lien: Lien; chemin: string }) {
  const base = lien.racine ?? lien.href;
  const dedans = lien.exact ? chemin === lien.href : chemin === base || chemin.startsWith(`${base}/`);
  const [ouvert, setOuvert] = useState(dedans);
  /* un module annoncé : sa place, sans lien tant que son écran n'existe pas */
  if (lien.bientot) {
    return (
      <li>
        <span className="v2-lien v2-lien--bientot" aria-disabled="true">
          {lien.icone}
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
          {lien.icone}
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
        {lien.icone}
        <span>{lien.libelle}</span>
        {lien.compteur ? <span className="v2-lien-compteur">{lien.compteur}</span> : null}
      </Link>
    </li>
  );
}
