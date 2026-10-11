"use client";

/* ══════════════════════════════════════════════════════════════════════
   Notes — à la manière de la page Notes d'Attio (10/10/2026)

   Demande de Teo : « exactement le même design que la page notes
   d'Attio », pour les salariés d'une entreprise : des notes déjà
   remplies, qu'on modifie, et ses propres modèles. Repris d'Attio :
   les onglets Notes / Modèles avec leur compte, « Trié par … », grille
   ou liste, « Affichage », le bouton bleu « Nouvelle note », la zone
   Favoris en pointillés, les notes rangées par période en cartes
   (entreprise liée, titre, aperçu, auteur, date), et l'éditeur en
   fenêtre (réduire, agrandir, fermer, copier le lien, « Lier un
   rendez-vous », modèles favoris quand la note est vide).

   Comme les autres collections de /espace2, les notes vivent dans le
   navigateur de cet appareil (localStorage) — la page le dit. Le jour où
   elles passent en base, seuls `lire` et `ecrire` changent.
   ══════════════════════════════════════════════════════════════════════ */

import "./notes.css";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Dialog, Modal, ModalOverlay } from "react-aria-components";
import { ArrowUpDown, Building2, CalendarDays, Check, Copy, FileText, LayoutGrid, Link2, List, Maximize2, Minimize2, Minus, MoreHorizontal, NotebookPen, Plus, SlidersHorizontal, Star, Trash2, X } from "lucide-react";
import { ItemMenu, MenuDeroulant, SectionMenu, SeparateurMenu } from "./ui";
import { ecrireStockage, useStockage } from "./Collection";
import { useOrganisation } from "./organisation";
import { useToast } from "./Toasts";

const CLE = "espace2-notes-v1";
const I = { width: 16, height: 16, strokeWidth: 1.6, "aria-hidden": true } as const;
const JOUR = 86_400_000;

type NoteT = { id: string; titre: string; texte: string; entreprise?: string; rdv?: string; favori?: boolean; auteur: string; cree: string; maj: string };
type Modele = { id: string; titre: string; texte: string; favori?: boolean; cree: string };
type Donnees = { notes: NoteT[]; modeles: Modele[] };
type Ouvert = { genre: "note" | "modele"; id: string } | null;

const nouvelId = () => Math.random().toString(36).slice(2, 10);
const ilYa = (j: number) => new Date(Date.now() - j * JOUR).toISOString();

/* ——— ce que l'équipe trouve en arrivant : des exemples à garder, modifier ou supprimer ——— */
function exemples(organisation: string, auteur: string): Donnees {
  const n = (titre: string, texte: string, jours: number, entreprise?: string, extra: Partial<NoteT> = {}): NoteT => ({ id: nouvelId(), titre, texte, entreprise, auteur, cree: ilYa(jours), maj: ilYa(jours), ...extra });
  return {
    notes: [
      n(
        "Bienvenue dans vos notes",
        "Un endroit pour tout ce qu'on veut retrouver plus tard : comptes rendus, appels, consignes, idées.\n\n• Cliquez sur « Nouvelle note » pour écrire.\n• Liez une note à une entreprise et à un rendez-vous.\n• L'étoile met une note en favori, en haut de la page.\n• L'onglet « Modèles » garde vos trames : une note vide les propose.\n\nCette note est un exemple : modifiez-la ou supprimez-la.",
        0,
        organisation,
        { favori: true },
      ),
      n(
        "Réunion d'équipe du lundi",
        "Présents : toute l'équipe\n\nPoints abordés\n• Planning de la semaine\n• Commandes en retard\n• Congés de fin d'année\n\nDécisions\n• Les relances partent le mardi matin\n\nÀ faire\n• Mettre à jour le planning partagé\n• Confirmer les dates de congés avant vendredi",
        1,
        organisation,
      ),
      n(
        "Appel fournisseur : délais de livraison",
        "Objet : retard sur la dernière commande\n\nCe qui a été dit\n• Livraison décalée d'une semaine\n• Geste commercial possible sur la prochaine commande\n\nSuite\n• Rappeler jeudi pour confirmer la date",
        3,
        "Fournisseur principal",
        { rdv: ilYa(-2).slice(0, 10) },
      ),
      n(
        "Visite client : besoins relevés",
        "Contexte : premier rendez-vous sur place\n\nBesoins\n• Un devis sous dix jours\n• Une intervention avant la fin du mois\n\nProchaine étape\n• Envoyer le devis et proposer deux créneaux",
        9,
        "Client — visite sur place",
      ),
      n(
        "Idées pour mieux accueillir les clients",
        "• Un message de confirmation après chaque rendez-vous\n• Une fiche « ce qu'il faut apporter » envoyée la veille\n• Rappeler les clients sans nouvelles depuis trois mois",
        20,
      ),
    ],
    modeles: [
      { id: nouvelId(), titre: "Compte rendu de réunion", texte: "Présents :\n\nPoints abordés\n• \n\nDécisions\n• \n\nÀ faire (qui, quand)\n• ", favori: true, cree: ilYa(30) },
      { id: nouvelId(), titre: "Appel client", texte: "Interlocuteur :\nObjet de l'appel :\n\nCe qui a été dit\n• \n\nSuite à donner\n• ", favori: true, cree: ilYa(30) },
      { id: nouvelId(), titre: "Visite sur place", texte: "Adresse :\nPersonnes présentes :\n\nConstat\n• \n\nPhotos et mesures\n• \n\nProchaine étape\n• ", cree: ilYa(30) },
      { id: nouvelId(), titre: "Point de la semaine", texte: "Ce qui est fait\n• \n\nCe qui bloque\n• \n\nPriorités de la semaine prochaine\n• ", cree: ilYa(30) },
      { id: nouvelId(), titre: "Arrivée d'un salarié", texte: "Prénom et poste :\nDate d'arrivée :\n\nAvant le premier jour\n• Accès et matériel\n• Planning de la première semaine\n\nPremier jour\n• Présentation à l'équipe\n• Visite des locaux", cree: ilYa(30) },
    ],
  };
}

function lire(brut: string | null): Donnees | null {
  if (brut === null || brut === "") return null;
  try {
    const v = JSON.parse(brut) as Donnees;
    return { notes: Array.isArray(v.notes) ? v.notes : [], modeles: Array.isArray(v.modeles) ? v.modeles : [] };
  } catch {
    return { notes: [], modeles: [] };
  }
}
const ecrire = (d: Donnees) => ecrireStockage(CLE, JSON.stringify(d));

const dateLongue = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
const dateCourte = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
const apercu = (t: string) => t.replace(/\s+/g, " ").trim();
const initiale = (s: string) => (s.trim()[0] ?? "?").toUpperCase();

type Tri = "cree" | "maj" | "titre";
const TRIS: { cle: Tri; libelle: string }[] = [
  { cle: "cree", libelle: "Date de création" },
  { cle: "maj", libelle: "Dernière modification" },
  { cle: "titre", libelle: "Titre" },
];

export default function Notes() {
  const brut = useStockage(CLE);
  const { nom: organisation, prenom } = useOrganisation();
  const auteur = prenom || "Vous";
  const donnees = lire(brut);
  const toast = useToast();
  const router = useRouter();
  const params = useSearchParams();

  /* premier passage sur cet appareil : on pose les exemples */
  useEffect(() => {
    if (brut === "") ecrire(exemples(organisation, auteur));
  }, [brut, organisation, auteur]);

  const [onglet, setOnglet] = useState<"notes" | "modeles">("notes");
  const [tri, setTri] = useState<Tri>("cree");
  const [vue, setVue] = useState<"grille" | "liste">("grille");
  const [apercus, setApercus] = useState(true);
  const [periodes, setPeriodes] = useState(true);
  const [ouvert, setOuvert] = useState<Ouvert>(null);
  const [fenetre, setFenetre] = useState<"normale" | "agrandie" | "reduite">("normale");
  const [maintenant] = useState(() => Date.now());

  /* lien partagé : /espace2/notes?note=… ouvre la note */
  const demandee = params.get("note");
  useEffect(() => {
    if (!demandee || !donnees?.notes.some((n) => n.id === demandee)) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- l'ouverture vient de l'adresse, une seule fois
    setOuvert({ genre: "note", id: demandee });
    setFenetre("normale");
    router.replace("/espace2/notes", { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- une seule fois par lien
  }, [demandee, !!donnees]);

  const notes = useMemo(() => {
    const ls = [...(donnees?.notes ?? [])];
    return ls.sort((a, b) => (tri === "titre" ? a.titre.localeCompare(b.titre, "fr") : tri === "maj" ? b.maj.localeCompare(a.maj) : b.cree.localeCompare(a.cree)));
  }, [donnees, tri]);
  const modeles = useMemo(() => [...(donnees?.modeles ?? [])].sort((a, b) => Number(!!b.favori) - Number(!!a.favori) || a.titre.localeCompare(b.titre, "fr")), [donnees]);

  if (!donnees) return <div className="v2-page v2-arrivee no-page" aria-busy="true" />;

  const majNote = (id: string, champs: Partial<NoteT>) => ecrire({ ...donnees, notes: donnees.notes.map((n) => (n.id === id ? { ...n, ...champs, maj: new Date().toISOString() } : n)) });
  const majModele = (id: string, champs: Partial<Modele>) => ecrire({ ...donnees, modeles: donnees.modeles.map((m) => (m.id === id ? { ...m, ...champs } : m)) });

  function creerNote(depuis?: Modele) {
    const maintenant = new Date().toISOString();
    const n: NoteT = { id: nouvelId(), titre: depuis ? depuis.titre : "", texte: depuis ? depuis.texte : "", auteur, cree: maintenant, maj: maintenant };
    ecrire({ ...donnees!, notes: [n, ...donnees!.notes] });
    setOnglet("notes");
    setFenetre("normale");
    setOuvert({ genre: "note", id: n.id });
  }
  function creerModele(depuis?: NoteT) {
    const m: Modele = { id: nouvelId(), titre: depuis ? depuis.titre || "Nouveau modèle" : "", texte: depuis?.texte ?? "", cree: new Date().toISOString() };
    ecrire({ ...donnees!, modeles: [m, ...donnees!.modeles] });
    if (depuis) toast("Modèle créé", "vert");
    setOnglet("modeles");
    setFenetre("normale");
    setOuvert({ genre: "modele", id: m.id });
  }
  function supprimer(genre: "note" | "modele", id: string) {
    if (!window.confirm(genre === "note" ? "Supprimer cette note ?" : "Supprimer ce modèle ?")) return;
    ecrire(genre === "note" ? { ...donnees!, notes: donnees!.notes.filter((n) => n.id !== id) } : { ...donnees!, modeles: donnees!.modeles.filter((m) => m.id !== id) });
    if (ouvert?.id === id) setOuvert(null);
    toast("Supprimé");
  }
  function dupliquer(n: NoteT) {
    const maintenant = new Date().toISOString();
    ecrire({ ...donnees!, notes: [{ ...n, id: nouvelId(), titre: `${n.titre || "Sans titre"} (copie)`, favori: false, auteur, cree: maintenant, maj: maintenant }, ...donnees!.notes] });
    toast("Note dupliquée", "vert");
  }

  const favoris = notes.filter((n) => n.favori);
  const autres = notes.filter((n) => !n.favori);
  const groupes = periodes
    ? [
        { titre: "Créées cette semaine", liste: autres.filter((n) => maintenant - Date.parse(n.cree) < 7 * JOUR) },
        { titre: "Créées ce mois-ci", liste: autres.filter((n) => maintenant - Date.parse(n.cree) >= 7 * JOUR && maintenant - Date.parse(n.cree) < 31 * JOUR) },
        { titre: "Plus anciennes", liste: autres.filter((n) => maintenant - Date.parse(n.cree) >= 31 * JOUR) },
      ].filter((g) => g.liste.length)
    : [{ titre: "Toutes les notes", liste: autres }];

  const noteOuverte = ouvert?.genre === "note" ? donnees.notes.find((n) => n.id === ouvert.id) : undefined;
  const modeleOuvert = ouvert?.genre === "modele" ? donnees.modeles.find((m) => m.id === ouvert.id) : undefined;
  const entreprises = Array.from(new Set([organisation, ...donnees.notes.map((n) => n.entreprise).filter((e): e is string => !!e)]));

  const carteNote = (n: NoteT) =>
    vue === "grille" ? (
      <CarteNote key={n.id} n={n} ouvrir={() => setOuvert({ genre: "note", id: n.id })} favori={() => majNote(n.id, { favori: !n.favori })} dupliquer={() => dupliquer(n)} supprimer={() => supprimer("note", n.id)} apercus={apercus} />
    ) : (
      <LigneNote key={n.id} n={n} ouvrir={() => setOuvert({ genre: "note", id: n.id })} favori={() => majNote(n.id, { favori: !n.favori })} dupliquer={() => dupliquer(n)} supprimer={() => supprimer("note", n.id)} apercus={apercus} />
    );

  return (
    <div className="v2-page v2-arrivee no-page">
      <h1 className="v2-sr">Notes</h1>
      <div className="no-onglets" role="tablist" aria-label="Notes et modèles">
        <button type="button" role="tab" aria-selected={onglet === "notes"} className="no-onglet" onClick={() => setOnglet("notes")}>
          <NotebookPen {...I} />
          Notes <span className="no-compte">{donnees.notes.length}</span>
        </button>
        <button type="button" role="tab" aria-selected={onglet === "modeles"} className="no-onglet" onClick={() => setOnglet("modeles")}>
          <FileText {...I} />
          Modèles <span className="no-compte">{donnees.modeles.length}</span>
        </button>
      </div>

      <div className="no-barre">
        {onglet === "notes" ? (
          <MenuDeroulant
            etiquette={`Trié par ${TRIS.find((t) => t.cle === tri)?.libelle}. Changer le tri`}
            classe="no-bouton"
            placement="bottom start"
            largeur={240}
            declencheur={
              <>
                <ArrowUpDown {...I} />
                <span className="no-gris">Trié par</span> {TRIS.find((t) => t.cle === tri)?.libelle}
              </>
            }
          >
            {TRIS.map((t) => (
              <ItemMenu key={t.cle} id={t.cle} onAction={() => setTri(t.cle)} suffixe={tri === t.cle ? <Check width={14} height={14} aria-hidden="true" /> : null}>
                {t.libelle}
              </ItemMenu>
            ))}
          </MenuDeroulant>
        ) : (
          <p className="no-gris no-barre-texte">Une note vide propose les modèles mis en favori.</p>
        )}
        <div className="no-barre-droite">
          {onglet === "notes" ? (
            <>
              <div className="no-bascule" role="group" aria-label="Affichage">
                <button type="button" aria-pressed={vue === "liste"} aria-label="En liste" onClick={() => setVue("liste")}>
                  <List {...I} />
                </button>
                <button type="button" aria-pressed={vue === "grille"} aria-label="En grille" onClick={() => setVue("grille")}>
                  <LayoutGrid {...I} />
                </button>
              </div>
              <MenuDeroulant
                etiquette="Réglages de l'affichage"
                classe="no-bouton"
                largeur={260}
                declencheur={
                  <>
                    <SlidersHorizontal {...I} />
                    Affichage
                  </>
                }
              >
                <SectionMenu titre="Afficher">
                  <ItemMenu id="apercus" onAction={() => setApercus((v) => !v)} suffixe={apercus ? <Check width={14} height={14} aria-hidden="true" /> : null}>
                    L&apos;aperçu du texte
                  </ItemMenu>
                  <ItemMenu id="periodes" onAction={() => setPeriodes((v) => !v)} suffixe={periodes ? <Check width={14} height={14} aria-hidden="true" /> : null}>
                    Regrouper par période
                  </ItemMenu>
                </SectionMenu>
              </MenuDeroulant>
              <button type="button" className="no-principal" onClick={() => creerNote()}>
                <Plus {...I} />
                Nouvelle note
              </button>
            </>
          ) : (
            <button type="button" className="no-principal" onClick={() => creerModele()}>
              <Plus {...I} />
              Nouveau modèle
            </button>
          )}
        </div>
      </div>

      {onglet === "notes" ? (
        <>
          <section className="no-section" aria-label="Favoris">
            <h2 className="no-section-titre">Favoris</h2>
            {favoris.length ? (
              <div className={vue === "grille" ? "no-grille" : "no-liste"}>{favoris.map(carteNote)}</div>
            ) : (
              <div className="no-vide">
                <strong>Favoris</strong>
                <span>Les notes mises en favori apparaîtront ici</span>
              </div>
            )}
          </section>
          {groupes.map((g) => (
            <section key={g.titre} className="no-section no-section--filet" aria-label={g.titre}>
              <h2 className="no-section-titre">
                {g.titre} <span className="no-compte">{g.liste.length}</span>
              </h2>
              <div className={vue === "grille" ? "no-grille" : "no-liste"}>{g.liste.map(carteNote)}</div>
            </section>
          ))}
          {notes.length === 0 ? <p className="no-gris no-pad">Aucune note pour l&apos;instant : « Nouvelle note » pour commencer.</p> : null}
        </>
      ) : (
        <section className="no-section" aria-label="Modèles">
          <div className="no-grille">
            {modeles.map((m) => (
              <div key={m.id} className="no-carte no-carte--modele">
                <button type="button" className="no-carte-ouvrir" onClick={() => setOuvert({ genre: "modele", id: m.id })} aria-label={`Modifier le modèle ${m.titre || "sans titre"}`} />
                <span className="no-carte-haut">
                  <span className="no-lien-entreprise">
                    <FileText width={14} height={14} aria-hidden="true" /> Modèle
                  </span>
                </span>
                <span className="no-carte-titre">{m.titre || "Sans titre"}</span>
                <span className="no-carte-apercu">{apercu(m.texte) || "Ce modèle est vide."}</span>
                <span className="no-carte-pied">
                  <button type="button" className="no-lien-action" onClick={() => creerNote(m)}>
                    <Plus width={14} height={14} aria-hidden="true" /> Utiliser
                  </button>
                  <button type="button" className="no-etoile" aria-pressed={!!m.favori} aria-label={m.favori ? "Retirer des favoris" : "Mettre en favori"} onClick={() => majModele(m.id, { favori: !m.favori })}>
                    <Star width={16} height={16} aria-hidden="true" />
                  </button>
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <p className="no-gris no-mention">Les notes sont gardées dans le navigateur de cet appareil.</p>

      {/* ——— l'éditeur, en fenêtre ——— */}
      <ModalOverlay
        isOpen={!!ouvert && fenetre !== "reduite" && !!(noteOuverte || modeleOuvert)}
        onOpenChange={(o) => {
          if (!o) setOuvert(null);
        }}
        isDismissable
        className="v2-jetons no-voile"
      >
        <Modal className="no-fenetre" data-agrandie={fenetre === "agrandie" ? "" : undefined}>
          <Dialog className="no-dialogue" aria-label={noteOuverte ? noteOuverte.titre || "Note sans titre" : modeleOuvert?.titre || "Modèle sans titre"}>
            {noteOuverte ? (
              <Editeur
                genre="note"
                titre={noteOuverte.titre}
                texte={noteOuverte.texte}
                entete={noteOuverte.entreprise || "Note"}
                auteur={noteOuverte.auteur}
                fenetre={fenetre}
                setFenetre={setFenetre}
                fermer={() => setOuvert(null)}
                changer={(c) => majNote(noteOuverte.id, c)}
                menu={
                  <>
                    <ItemMenu id="fav" icone={<Star {...I} />} onAction={() => majNote(noteOuverte.id, { favori: !noteOuverte.favori })}>
                      {noteOuverte.favori ? "Retirer des favoris" : "Mettre en favori"}
                    </ItemMenu>
                    <ItemMenu id="dup" icone={<Copy {...I} />} onAction={() => dupliquer(noteOuverte)}>
                      Dupliquer
                    </ItemMenu>
                    <ItemMenu id="mod" icone={<FileText {...I} />} onAction={() => creerModele(noteOuverte)}>
                      Enregistrer comme modèle
                    </ItemMenu>
                    <SeparateurMenu />
                    <ItemMenu id="sup" danger icone={<Trash2 {...I} />} onAction={() => supprimer("note", noteOuverte.id)}>
                      Supprimer la note
                    </ItemMenu>
                  </>
                }
                lien={() => {
                  void navigator.clipboard?.writeText(`${window.location.origin}/espace2/notes?note=${noteOuverte.id}`);
                  toast("Lien copié", "vert");
                }}
                meta={
                  <>
                    <MenuDeroulant
                      etiquette="Entreprise liée"
                      classe="no-meta"
                      placement="bottom start"
                      largeur={260}
                      declencheur={
                        <>
                          <Building2 {...I} />
                          <span data-vide={noteOuverte.entreprise ? undefined : ""}>{noteOuverte.entreprise || "Lier une entreprise"}</span>
                        </>
                      }
                    >
                      <SectionMenu titre="Entreprise liée">
                        {entreprises.map((e) => (
                          <ItemMenu key={e} id={`e-${e}`} onAction={() => majNote(noteOuverte.id, { entreprise: e })} suffixe={noteOuverte.entreprise === e ? <Check width={14} height={14} aria-hidden="true" /> : null}>
                            {e}
                          </ItemMenu>
                        ))}
                        <ItemMenu
                          id="autre"
                          icone={<Plus {...I} />}
                          onAction={() => {
                            const e = window.prompt("Nom de l'entreprise")?.trim();
                            if (e) majNote(noteOuverte.id, { entreprise: e });
                          }}
                        >
                          Autre entreprise…
                        </ItemMenu>
                      </SectionMenu>
                      {noteOuverte.entreprise ? (
                        <SectionMenu>
                          <ItemMenu id="aucune" icone={<X {...I} />} onAction={() => majNote(noteOuverte.id, { entreprise: undefined })}>
                            Retirer le lien
                          </ItemMenu>
                        </SectionMenu>
                      ) : null}
                    </MenuDeroulant>
                    <label className="no-meta">
                      <CalendarDays {...I} />
                      <span data-vide={noteOuverte.rdv ? undefined : ""}>{noteOuverte.rdv ? `Rendez-vous du ${dateCourte(noteOuverte.rdv)}` : "Lier un rendez-vous"}</span>
                      <input type="date" className="no-meta-date" value={noteOuverte.rdv ?? ""} aria-label="Date du rendez-vous lié" onClick={(e) => e.currentTarget.showPicker?.()} onChange={(e) => majNote(noteOuverte.id, { rdv: e.target.value || undefined })} />
                    </label>
                  </>
                }
                vide={
                  <>
                    <p className="no-etiquette">Modèles favoris</p>
                    {modeles.filter((m) => m.favori).length ? (
                      <ul className="no-actions">
                        {modeles
                          .filter((m) => m.favori)
                          .map((m) => (
                            <li key={m.id}>
                              <button type="button" onClick={() => majNote(noteOuverte.id, { titre: noteOuverte.titre || m.titre, texte: m.texte })}>
                                <span className="no-actions-icone">
                                  <FileText width={14} height={14} aria-hidden="true" />
                                </span>
                                {m.titre}
                              </button>
                            </li>
                          ))}
                      </ul>
                    ) : (
                      <p className="no-gris">Les modèles mis en favori apparaîtront ici</p>
                    )}
                    <p className="no-etiquette">Actions</p>
                    <ul className="no-actions">
                      <li>
                        <button
                          type="button"
                          onClick={() => {
                            setOuvert(null);
                            setOnglet("modeles");
                          }}
                        >
                          <span className="no-actions-icone">
                            <FileText width={14} height={14} aria-hidden="true" />
                          </span>
                          Voir tous les modèles
                        </button>
                      </li>
                      <li>
                        <button type="button" onClick={() => creerModele()}>
                          <span className="no-actions-icone">
                            <Plus width={14} height={14} aria-hidden="true" />
                          </span>
                          Créer un modèle
                        </button>
                      </li>
                    </ul>
                  </>
                }
              />
            ) : modeleOuvert ? (
              <Editeur
                genre="modele"
                titre={modeleOuvert.titre}
                texte={modeleOuvert.texte}
                entete="Modèle"
                auteur={auteur}
                fenetre={fenetre}
                setFenetre={setFenetre}
                fermer={() => setOuvert(null)}
                changer={(c) => majModele(modeleOuvert.id, c)}
                menu={
                  <>
                    <ItemMenu id="fav" icone={<Star {...I} />} onAction={() => majModele(modeleOuvert.id, { favori: !modeleOuvert.favori })}>
                      {modeleOuvert.favori ? "Retirer des favoris" : "Mettre en favori"}
                    </ItemMenu>
                    <ItemMenu id="use" icone={<Plus {...I} />} onAction={() => creerNote(modeleOuvert)}>
                      Créer une note avec ce modèle
                    </ItemMenu>
                    <SeparateurMenu />
                    <ItemMenu id="sup" danger icone={<Trash2 {...I} />} onAction={() => supprimer("modele", modeleOuvert.id)}>
                      Supprimer le modèle
                    </ItemMenu>
                  </>
                }
                meta={
                  <span className="no-meta no-meta--fixe">
                    <FileText {...I} />
                    Modèle de note
                  </span>
                }
              />
            ) : null}
          </Dialog>
        </Modal>
      </ModalOverlay>

      {/* la fenêtre réduite : une pastille en bas, comme Attio */}
      {ouvert && fenetre === "reduite" && (noteOuverte || modeleOuvert) ? (
        <div className="v2-jetons no-reduite">
          <button type="button" className="no-reduite-titre" onClick={() => setFenetre("normale")}>
            <NotebookPen {...I} />
            {(noteOuverte?.titre ?? modeleOuvert?.titre) || "Sans titre"}
          </button>
          <button type="button" className="no-icone" aria-label="Rouvrir" onClick={() => setFenetre("normale")}>
            <Maximize2 width={14} height={14} aria-hidden="true" />
          </button>
          <button type="button" className="no-icone" aria-label="Fermer" onClick={() => setOuvert(null)}>
            <X width={14} height={14} aria-hidden="true" />
          </button>
        </div>
      ) : null}
    </div>
  );
}

/* ——— une carte de la grille ——— */
function CarteNote({ n, ouvrir, favori, dupliquer, supprimer, apercus }: { n: NoteT; ouvrir: () => void; favori: () => void; dupliquer: () => void; supprimer: () => void; apercus: boolean }) {
  return (
    <div className="no-carte">
      <button type="button" className="no-carte-ouvrir" onClick={ouvrir} aria-label={`Ouvrir la note ${n.titre || "sans titre"}`} />
      <span className="no-carte-haut">
        {n.entreprise ? (
          <span className="no-lien-entreprise">
            <Building2 width={14} height={14} aria-hidden="true" /> <u>{n.entreprise}</u>
          </span>
        ) : (
          <span className="no-lien-entreprise no-gris">
            <NotebookPen width={14} height={14} aria-hidden="true" /> Note libre
          </span>
        )}
        <OutilsNote n={n} favori={favori} dupliquer={dupliquer} supprimer={supprimer} />
      </span>
      <span className="no-carte-titre">{n.titre || "Sans titre"}</span>
      {apercus ? <span className="no-carte-apercu">{apercu(n.texte) || "Cette note est vide."}</span> : null}
      <span className="no-carte-pied">
        <span className="no-auteur">
          <span className="no-avatar" aria-hidden="true">
            {initiale(n.auteur)}
          </span>
          {n.auteur}
        </span>
        <time dateTime={n.cree}>{dateLongue(n.cree)}</time>
      </span>
    </div>
  );
}

function LigneNote({ n, ouvrir, favori, dupliquer, supprimer, apercus }: { n: NoteT; ouvrir: () => void; favori: () => void; dupliquer: () => void; supprimer: () => void; apercus: boolean }) {
  return (
    <div className="no-ligne">
      <button type="button" className="no-carte-ouvrir" onClick={ouvrir} aria-label={`Ouvrir la note ${n.titre || "sans titre"}`} />
      <span className="no-ligne-titre">
        <strong>{n.titre || "Sans titre"}</strong>
        {apercus ? <span>{apercu(n.texte) || "Cette note est vide."}</span> : null}
      </span>
      <span className="no-ligne-entreprise">{n.entreprise ? <><Building2 width={14} height={14} aria-hidden="true" /> {n.entreprise}</> : null}</span>
      <span className="no-auteur">
        <span className="no-avatar" aria-hidden="true">
          {initiale(n.auteur)}
        </span>
        {n.auteur}
      </span>
      <time dateTime={n.cree}>{dateCourte(n.cree)}</time>
      <OutilsNote n={n} favori={favori} dupliquer={dupliquer} supprimer={supprimer} />
    </div>
  );
}

function OutilsNote({ n, favori, dupliquer, supprimer }: { n: NoteT; favori: () => void; dupliquer: () => void; supprimer: () => void }) {
  return (
    <span className="no-outils">
      <button type="button" className="no-etoile" aria-pressed={!!n.favori} aria-label={n.favori ? "Retirer des favoris" : "Mettre en favori"} onClick={favori}>
        <Star width={16} height={16} aria-hidden="true" />
      </button>
      <MenuDeroulant etiquette="Actions de la note" classe="no-icone" declencheur={<MoreHorizontal width={16} height={16} aria-hidden="true" />}>
        <ItemMenu id="dup" icone={<Copy {...I} />} onAction={dupliquer}>
          Dupliquer
        </ItemMenu>
        <ItemMenu id="sup" danger icone={<Trash2 {...I} />} onAction={supprimer}>
          Supprimer
        </ItemMenu>
      </MenuDeroulant>
    </span>
  );
}

/* ——— l'éditeur : en-tête de fenêtre, titre, liens, texte ——— */
function Editeur({
  genre,
  titre,
  texte,
  entete,
  auteur,
  fenetre,
  setFenetre,
  fermer,
  changer,
  menu,
  lien,
  meta,
  vide,
}: {
  genre: "note" | "modele";
  titre: string;
  texte: string;
  entete: string;
  auteur: string;
  fenetre: "normale" | "agrandie" | "reduite";
  setFenetre: (f: "normale" | "agrandie" | "reduite") => void;
  fermer: () => void;
  changer: (c: { titre?: string; texte?: string }) => void;
  menu: React.ReactNode;
  lien?: () => void;
  meta: React.ReactNode;
  vide?: React.ReactNode;
}) {
  const zone = useRef<HTMLTextAreaElement>(null);
  const ajuster = (el: HTMLTextAreaElement | null) => {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };
  useEffect(() => ajuster(zone.current), [texte]);
  return (
    <>
      <div className="no-fenetre-haut">
        <span className="no-fenetre-nom">
          {genre === "note" ? <Building2 width={14} height={14} aria-hidden="true" /> : <FileText width={14} height={14} aria-hidden="true" />}
          {entete}
        </span>
        <span className="no-fenetre-boutons">
          <button type="button" className="no-icone" aria-label="Réduire" onClick={() => setFenetre("reduite")}>
            <Minus {...I} />
          </button>
          <button type="button" className="no-icone" aria-label={fenetre === "agrandie" ? "Rétablir la taille" : "Agrandir"} onClick={() => setFenetre(fenetre === "agrandie" ? "normale" : "agrandie")}>
            {fenetre === "agrandie" ? <Minimize2 width={15} height={15} aria-hidden="true" /> : <Maximize2 width={15} height={15} aria-hidden="true" />}
          </button>
          <button type="button" className="no-icone" aria-label="Fermer" onClick={fermer}>
            <X {...I} />
          </button>
        </span>
      </div>
      <div className="no-fenetre-corps" data-lenis-prevent="">
        <div className="no-fenetre-outils">
          <span className="no-avatar no-avatar--grand" aria-label={`Auteur : ${auteur}`}>
            {initiale(auteur)}
          </span>
          {lien ? (
            <button type="button" className="no-lien-copie" onClick={lien}>
              <Link2 {...I} />
              Copier le lien
            </button>
          ) : null}
          <MenuDeroulant etiquette={genre === "note" ? "Actions de la note" : "Actions du modèle"} classe="no-icone" largeur={240} declencheur={<MoreHorizontal {...I} />}>
            {menu}
          </MenuDeroulant>
        </div>
        <div className="no-feuille">
          <input
            className="no-titre"
            value={titre}
            placeholder={genre === "note" ? "Sans titre" : "Nom du modèle"}
            aria-label={genre === "note" ? "Titre de la note" : "Nom du modèle"}
            autoFocus={!titre}
            onChange={(e) => changer({ titre: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                zone.current?.focus();
              }
            }}
          />
          <div className="no-metas">{meta}</div>
          <textarea
            ref={(el) => {
              zone.current = el;
              ajuster(el);
            }}
            className="no-texte"
            value={texte}
            rows={1}
            placeholder={genre === "note" ? "Commencez à écrire votre note" : "Écrivez la trame du modèle"}
            aria-label={genre === "note" ? "Texte de la note" : "Texte du modèle"}
            onChange={(e) => {
              changer({ texte: e.target.value });
              ajuster(e.target);
            }}
          />
          {!texte && vide ? <div className="no-suggestions">{vide}</div> : null}
        </div>
      </div>
    </>
  );
}
