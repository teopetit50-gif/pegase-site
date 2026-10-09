"use client";

/* ══════════════════════════════════════════════════════════════════════
   La coquille du pilotage interne d'Omega (09/10/2026)

   DUPLIQUÉE de components/espace2/Coquille.tsx, à la demande de Teo :
   « je ne te demande pas de le refaire, je te demande de le dupliquer et
   de refaire juste le contenu des pages ». Même disposition, mêmes
   classes v2- : barre latérale de 255 px (sélecteur, « Rechercher » sur
   F ou ⌘K, sections titrées qui se replient, la personne, le menu « … »,
   la cloche), barre du haut (portée ⌃⌄, titre, « Nouveau… »), tiroir
   sous 768 px.

   Ce qui change : les liens mènent aux pages du pilotage, et les
   compteurs comme la cloche lisent le tableau opérationnel (omega_lignes)
   — les tâches en retard, celles de la semaine, les clients suivis.
   Pas de données d'exemple, pas d'assistant : rien que du réel.
   ══════════════════════════════════════════════════════════════════════ */

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowRight, Bell, BookOpen, CalendarCheck, Check, ChevronDown, ChevronRight, ChevronsUpDown, Clapperboard, Compass, CornerDownLeft, ExternalLink, LayoutGrid, Link2, ListChecks, LogOut, Menu as IconeMenu, MessagesSquare, MoreHorizontal, Repeat, Search, UserPlus, Users, Wrench, X } from "lucide-react";
import { Autocomplete, Button, Dialog, DialogTrigger, Input, Menu, Modal, ModalOverlay, Popover, RouterProvider, TextField, useFilter } from "react-aria-components";
import { createClient } from "@/lib/supabase/client";
import { FournisseurToasts, useToast } from "@/components/espace2/Toasts";
import { ItemMenu, Kbd, MenuDeroulant, SectionMenu } from "@/components/espace2/ui";
import { ecrireStockage, useStockage } from "@/components/espace2/Collection";
import "@/components/espace2/espace2.css";
import "./omega.css";

export const RACINE = "/omega";
const I = { width: 16, height: 16, strokeWidth: 1.6, "aria-hidden": true } as const;
const coche = (oui: boolean) => (oui ? <Check width={16} height={16} aria-label="choisi" /> : null);

const FICHES: [string, string][] = [["cashd", "CASHD"], ["reput", "REPUT"], ["filed", "FILED"], ["offload", "OFFLOAD"], ["daliro", "Daliro (BTP)"], ["tavaro", "Tavaro (loueurs)"], ["lorani", "Lorani (architectes)"], ["tamila", "Tamila (avocats)"], ["tiroma", "Tiroma (dentaires)"], ["varelo", "Varelo (groupes)"]];
const VIDEOS: [string, string][] = [["general", "Général"], ...FICHES];

/* les cinq pages, dans l'ordre de la portée et de la palette */
export const PAGES = [
  { cle: "tableau", href: RACINE, nom: "Vue d'ensemble", libelle: "le tableau opérationnel", icone: LayoutGrid },
  { cle: "strategie", href: `${RACINE}/strategie`, nom: "Stratégie", libelle: "le pourquoi, Hormozi", icone: Compass },
  { cle: "manuel", href: `${RACINE}/manuel`, nom: "Manuel", libelle: "le parcours en 9 étapes", icone: BookOpen },
  { cle: "vendre", href: `${RACINE}/vendre`, nom: "Vendre", libelle: "méthode et fiches", icone: MessagesSquare },
  { cle: "videos", href: `${RACINE}/videos`, nom: "Vidéos", libelle: "bibliothèque et calendrier", icone: Clapperboard },
] as const;

const pageDe = (chemin: string) => PAGES.find((p) => (p.href === RACINE ? chemin === RACINE : chemin === p.href || chemin.startsWith(`${p.href}/`)));

/* ——— le tableau opérationnel, lu pour la cloche et les compteurs ——— */
type LigneBrute = { tableau: string; donnees: Record<string, string> };

/* « 11/10 » → la date ; octobre à décembre en 2026, le reste en 2027 */
function echeance(texte: string | undefined): number | null {
  const m = texte?.match(/(\d{1,2})\/(\d{1,2})/);
  if (!m) return null;
  const mois = Number(m[2]);
  return new Date(mois >= 10 ? 2026 : 2027, mois - 1, Number(m[1]), 23, 59).getTime();
}

function useTableau() {
  const [{ lignes, maintenant }, setEtat] = useState<{ lignes: LigneBrute[]; maintenant: number }>({ lignes: [], maintenant: 0 });
  const chemin = usePathname();
  useEffect(() => {
    let actif = true;
    createClient()
      .from("omega_lignes")
      .select("tableau, donnees")
      .then(({ data }) => {
        if (actif && data) setEtat({ lignes: data as LigneBrute[], maintenant: Date.now() });
      });
    return () => {
      actif = false;
    };
  }, [chemin]);
  const taches = lignes.filter((l) => (l.tableau === "plan" || l.tableau === "ajouts") && l.donnees["Statut"] !== "Fait");
  const enRetard = taches.filter((l) => (echeance(l.donnees["Échéance"]) ?? Infinity) < maintenant);
  const semaine = taches.filter((l) => (echeance(l.donnees["Échéance"]) ?? Infinity) < maintenant + 7 * 864e5);
  const clients = lignes.filter((l) => l.tableau === "clients" && l.donnees["Client"] && l.donnees["Étape"] !== "Perdu");
  const moteurs = lignes.filter((l) => l.tableau === "moteurs" && l.donnees["Statut"] !== "Fait");
  const routines = lignes.filter((l) => l.tableau === "routines" && l.donnees["Statut cette semaine"] !== "Fait");
  return {
    alertes: enRetard.map((l, i) => ({ id: `t-${i}`, texte: l.donnees["Tâche"] ?? "Tâche", quand: l.donnees["Échéance"] ?? "", lien: `${RACINE}#plan` })),
    semaine: semaine.length,
    clients: clients.length,
    moteurs: moteurs.length,
    routines: routines.length,
  };
}

export default function CoquilleOmega({ email, police, children }: { email: string; police: string; children: React.ReactNode }) {
  const router = useRouter();
  useEffect(() => {
    const html = document.documentElement;
    html.classList.add(police, "v2-actif");
    return () => html.classList.remove(police, "v2-actif");
  }, [police]);
  return (
    <div className="v2" data-lenis-prevent="">
      <RouterProvider navigate={(href, options) => router.push(href, options)}>
        <FournisseurToasts>
          <Cadre email={email}>{children}</Cadre>
        </FournisseurToasts>
      </RouterProvider>
    </div>
  );
}

function Cadre({ email, children }: { email: string; children: React.ReactNode }) {
  const chemin = usePathname() ?? RACINE;
  const [palette, setPalette] = useState(false);
  const [tiroir, setTiroir] = useState(false);
  const page = pageDe(chemin);

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
        <aside className="v2-laterale v2-laterale--fixe" aria-label="Navigation du pilotage">
          <BarreLaterale email={email} chemin={chemin} ouvrirPalette={() => setPalette(true)} />
        </aside>
        <div className="v2-colonne-principale">
          <header className="v2-haut">
            <div className="v2-haut-gauche">
              <button type="button" className="v2-btn v2-btn--petit v2-btn--icone v2-btn--fantome v2-seul-mobile" aria-label="Ouvrir la navigation" onClick={() => setTiroir(true)}>
                <IconeMenu {...I} />
              </button>
              <MenuDeroulant
                etiquette={`Page : ${page ? page.nom : "pilotage"}. Changer de page`}
                classe="v2-portee"
                placement="bottom start"
                largeur={300}
                declencheur={
                  <>
                    {page ? <page.icone {...I} /> : <LayoutGrid {...I} />}
                    <span className="v2-portee-nom">{page ? page.nom : "Pilotage"}</span>
                    <ChevronsUpDown width={14} height={14} aria-hidden="true" />
                  </>
                }
              >
                <SectionMenu titre="Pages">
                  {PAGES.map((p) => (
                    <ItemMenu key={p.cle} id={p.cle} href={p.href} textValue={p.nom} icone={<p.icone {...I} />} suffixe={coche(p.cle === page?.cle)}>
                      {p.nom} <span className="v2-gris">· {p.libelle}</span>
                    </ItemMenu>
                  ))}
                </SectionMenu>
              </MenuDeroulant>
            </div>
            <p className="v2-haut-titre">{page?.nom ?? "Pilotage"}</p>
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
                <ItemMenu id="tache" href={`${RACINE}?ajouter=plan#plan`} icone={<ListChecks {...I} />}>
                  Ajouter une tâche
                </ItemMenu>
                <ItemMenu id="prospect" href={`${RACINE}?ajouter=clients#clients`} icone={<UserPlus {...I} />}>
                  Ajouter un prospect
                </ItemMenu>
                <ItemMenu id="chantier" href={`${RACINE}?ajouter=moteurs#moteurs`} icone={<Wrench {...I} />}>
                  Ajouter un chantier moteur
                </ItemMenu>
              </MenuDeroulant>
            </div>
          </header>
          <main id="contenu" tabIndex={-1} style={{ outline: "none" }}>
            {children}
          </main>
        </div>
      </div>

      <ModalOverlay isOpen={tiroir} onOpenChange={setTiroir} isDismissable className="v2-jetons v2-voile v2-voile--tiroir">
        <Modal className="v2-tiroir">
          <Dialog className="v2-modale-dialogue v2-laterale" aria-label="Navigation du pilotage">
            <BarreLaterale email={email} chemin={chemin} ouvrirPalette={() => setPalette(true)} fermer={() => setTiroir(false)} />
          </Dialog>
        </Modal>
      </ModalOverlay>
      <PaletteOmega ouverte={palette} changer={setPalette} />
    </>
  );
}

type Lien = { libelle: string; href: string; icone: React.ReactNode; exact?: boolean; racine?: string; compteur?: number; sous?: { libelle: string; href: string }[] };

function BarreLaterale({ email, chemin, ouvrirPalette, fermer }: { email: string; chemin: string; ouvrirPalette: () => void; fermer?: () => void }) {
  const { alertes, semaine, clients, moteurs, routines } = useTableau();
  const [ouvertes, basculer] = useSections();
  const deconnecter = () => {
    const f = document.createElement("form");
    f.method = "post";
    f.action = "/auth/signout";
    document.body.append(f);
    f.submit();
  };

  const groupes: { titre?: string; liens: Lien[] }[] = [
    {
      liens: [
        { libelle: "Vue d'ensemble", href: RACINE, icone: <LayoutGrid {...I} />, exact: true },
        { libelle: "Cette semaine", href: `${RACINE}#plan`, icone: <CalendarCheck {...I} />, compteur: semaine },
        { libelle: "Routines", href: `${RACINE}#routines`, icone: <Repeat {...I} />, compteur: routines },
      ],
    },
    {
      titre: "Pilotage",
      liens: [
        { libelle: "Suivi clients", href: `${RACINE}#clients`, icone: <Users {...I} />, compteur: clients },
        { libelle: "Moteurs", href: `${RACINE}#moteurs`, icone: <Wrench {...I} />, compteur: moteurs },
      ],
    },
    {
      titre: "Documents",
      liens: [
        { libelle: "Stratégie", href: `${RACINE}/strategie`, icone: <Compass {...I} /> },
        { libelle: "Manuel", href: `${RACINE}/manuel`, icone: <BookOpen {...I} /> },
      ],
    },
    {
      titre: "Vendre",
      liens: [
        { libelle: "La méthode", href: `${RACINE}/vendre`, icone: <MessagesSquare {...I} />, exact: true },
        {
          libelle: "Fiches de vente",
          href: `${RACINE}/vendre/fiches`,
          racine: `${RACINE}/vendre/`,
          icone: <ListChecks {...I} />,
          sous: [{ libelle: "Toutes les fiches", href: `${RACINE}/vendre/fiches` }, ...FICHES.map(([c, l]) => ({ libelle: l, href: `${RACINE}/vendre/${c}` }))],
        },
      ],
    },
    {
      titre: "Vidéos",
      liens: [
        { libelle: "Mode d'emploi", href: `${RACINE}/videos`, icone: <Clapperboard {...I} />, exact: true },
        {
          libelle: "Bibliothèque",
          href: `${RACINE}/videos/general`,
          racine: `${RACINE}/videos/`,
          icone: <BookOpen {...I} />,
          sous: VIDEOS.map(([c, l]) => ({ libelle: l, href: `${RACINE}/videos/${c}` })),
        },
      ],
    },
  ];

  return (
    <div className="v2-laterale-int">
      <div className="v2-laterale-haut">
        <MenuDeroulant
          etiquette="Organisation : Omega. Pilotage interne"
          classe="v2-equipe"
          placement="bottom start"
          largeur={260}
          declencheur={
            <>
              <span className="v2-marque-omega" aria-hidden="true">
                {/* eslint-disable-next-line @next/next/no-img-element -- le logo Omega, déjà à sa taille */}
                <img src="/logo-pegase-blanc.png" alt="" width={20} height={20} />
              </span>
              <span className="v2-equipe-nom">Omega</span>
              <span className="v2-badge">pilotage</span>
              <ChevronsUpDown width={14} height={14} aria-hidden="true" className="v2-equipe-chevrons" />
            </>
          }
        >
          <SectionMenu titre="Espaces">
            <ItemMenu id="pilotage" href={RACINE} textValue="Pilotage Omega" icone={<LayoutGrid {...I} />} suffixe={coche(true)}>
              Pilotage Omega
            </ItemMenu>
            <ItemMenu id="client" href="/espace2" textValue="Espace client" icone={<ExternalLink {...I} />}>
              Espace client (démonstration)
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

      <nav className="v2-laterale-nav" aria-label="Pages du pilotage">
        {groupes.map((g, i) => {
          const ici = g.liens.some((l) => chemin === (l.racine ?? l.href) || chemin.startsWith(l.racine ?? `${l.href}/`));
          const replie = !!g.titre && !(ouvertes[g.titre] ?? (ici || g.titre === "Pilotage"));
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
          <span className="v2-avatar" aria-hidden="true">
            {email.charAt(0).toUpperCase()}
          </span>
          <span className="v2-moi-nom">Teo</span>
        </span>
        <MenuDeroulant
          etiquette="Menu du compte"
          classe="v2-rond"
          placement="top end"
          largeur={260}
          entete={
            <div className="v2-menu-entete" style={{ padding: "16px 16px 4px" }}>
              <strong>Teo</strong>
              <small>{email}</small>
            </div>
          }
          declencheur={<MoreHorizontal {...I} />}
        >
          <SectionMenu>
            <ItemMenu id="client" href="/espace2" icone={<ExternalLink {...I} />}>
              Espace client (démonstration)
            </ItemMenu>
            <ItemMenu id="site" href="/" icone={<ExternalLink {...I} />}>
              Retour au site
            </ItemMenu>
            <ItemMenu id="sortir" onAction={deconnecter} icone={<LogOut {...I} />}>
              Se déconnecter
            </ItemMenu>
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
                <strong>Tâches en retard</strong>
              </div>
              {alertes.length ? (
                <ul className="v2-liste">
                  {alertes.map((a) => (
                    <li key={a.id} className="v2-liste-item">
                      <span className="v2-point" data-teinte="rouge" aria-hidden="true" />
                      <span className="v2-liste-texte">
                        <Link href={a.lien}>{a.texte}</Link>
                        <small>échéance {a.quand}</small>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="v2-gris" style={{ margin: 0, padding: "24px 16px", textAlign: "center" }}>
                  Rien en retard.
                </p>
              )}
            </Dialog>
          </Popover>
        </DialogTrigger>
      </div>
    </div>
  );
}

function useSections(): [Record<string, boolean>, (titre: string, ouvrir: boolean) => void] {
  const brut = useStockage("omega-sections");
  let etat: Record<string, boolean> = {};
  try {
    const v = JSON.parse(brut || "{}");
    if (v && typeof v === "object" && !Array.isArray(v)) etat = v;
  } catch {}
  const basculer = (titre: string, ouvrir: boolean) => ecrireStockage("omega-sections", JSON.stringify({ ...etat, [titre]: ouvrir }));
  return [etat, basculer];
}

function LienLateral({ lien, chemin }: { lien: Lien; chemin: string }) {
  const base = lien.racine ?? lien.href;
  const dedans = lien.exact ? chemin === lien.href : chemin === base || chemin.startsWith(base.endsWith("/") ? base : `${base}/`);
  const [ouvert, setOuvert] = useState(dedans);
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
                <Link href={s.href} className="v2-lien v2-lien--sous" aria-current={chemin === s.href ? "page" : undefined}>
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
      <Link href={lien.href} className="v2-lien" aria-current={!lien.href.includes("#") && dedans ? "page" : undefined}>
        {lien.icone}
        <span>{lien.libelle}</span>
        {lien.compteur ? <span className="v2-lien-compteur">{lien.compteur}</span> : null}
      </Link>
    </li>
  );
}

/* la palette (F, ⌘K) : la même que l'espace client, sur les pages du pilotage */
function PaletteOmega({ ouverte, changer }: { ouverte: boolean; changer: (v: boolean) => void }) {
  const router = useRouter();
  const toast = useToast();
  const { contains } = useFilter({ sensitivity: "base" });
  const agir = (cle: React.Key) => {
    const c = String(cle);
    changer(false);
    if (c.startsWith("aller:")) router.push(c.slice(6));
    else if (c === "copier")
      navigator.clipboard?.writeText(window.location.href).then(
        () => toast("Lien copié", "vert"),
        () => toast("Impossible de copier le lien. Réessayez.", "rouge"),
      );
  };
  const fleche = <ArrowRight width={16} height={16} aria-hidden="true" />;
  return (
    <ModalOverlay isOpen={ouverte} onOpenChange={changer} isDismissable className="v2-jetons v2-voile v2-voile--palette">
      <Modal className="v2-modale v2-palette">
        <Dialog className="v2-modale-dialogue" aria-label="Palette de commandes">
          <Autocomplete filter={contains}>
            <TextField aria-label="Rechercher une page" autoFocus className="v2-palette-champ">
              <Search width={18} height={18} aria-hidden="true" />
              <Input placeholder="Rechercher une page, une fiche, une vidéo…" />
              <Kbd>Échap</Kbd>
            </TextField>
            <Menu className="v2-menu" onAction={agir} aria-label="Résultats" renderEmptyState={() => <div className="v2-palette-vide">Aucun résultat.</div>}>
              <SectionMenu titre="Pages">
                {PAGES.map((p) => (
                  <ItemMenu key={p.cle} id={`aller:${p.href}`} textValue={`${p.nom} ${p.libelle}`} icone={<p.icone width={16} height={16} aria-hidden="true" />} suffixe={<span>{p.libelle}</span>}>
                    {p.nom}
                  </ItemMenu>
                ))}
              </SectionMenu>
              <SectionMenu titre="Fiches de vente">
                {FICHES.map(([c, l]) => (
                  <ItemMenu key={c} id={`aller:${RACINE}/vendre/${c}`} textValue={`Fiche de vente ${l}`} icone={fleche}>
                    {`Fiche ${l}`}
                  </ItemMenu>
                ))}
              </SectionMenu>
              <SectionMenu titre="Vidéos">
                {VIDEOS.map(([c, l]) => (
                  <ItemMenu key={c} id={`aller:${RACINE}/videos/${c}`} textValue={`Vidéos ${l}`} icone={fleche}>
                    {`Vidéos ${l}`}
                  </ItemMenu>
                ))}
              </SectionMenu>
              <SectionMenu titre="Actions">
                <ItemMenu id="copier" textValue="Copier le lien de la page" icone={<Link2 width={16} height={16} aria-hidden="true" />}>
                  Copier le lien de la page
                </ItemMenu>
              </SectionMenu>
            </Menu>
          </Autocomplete>
          <div className="v2-palette-pied" aria-hidden="true">
            <span>
              <Kbd>↑</Kbd>
              <Kbd>↓</Kbd> parcourir
            </span>
            <span>
              <Kbd>
                <CornerDownLeft width={12} height={12} />
              </Kbd>{" "}
              ouvrir
            </span>
          </div>
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}
