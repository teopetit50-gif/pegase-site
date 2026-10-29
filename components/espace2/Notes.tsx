"use client";

/* ══════════════════════════════════════════════════════════════════════
   Notes — sur le document de projet de Linear (28/10/2026, nuit).

   Demande de Teo : « reproduis-les à l'identique », modèle = un document
   de projet Linear. Relevé au getComputedStyle dans son espace
   (document « Réunion d'équipe du lundi » du projet « exemple ») :
   scratchpad/releve-linear-docs.md ; briques : ./lin/linear-docs.css (ld-)
   et le cadre partagé ./lin/lin.css.

     · la liste = la page d'un projet : barre du titre, onglets Notes ·
       Modèles, la colonne (tuile, titre, résumé), la ligne « Favoris » en
       pastilles comme les « Resources » d'un projet, puis les notes par
       période en lignes de 36 (icône, titre, aperçu, entreprise, auteur,
       date, étoile et « ··· » au survol) ou en pastilles (vue grille) ;
       le rond « Affichage » règle le tri, l'aperçu, les périodes, la vue ;
       la recherche filtre titre et texte ; tout est dans l'adresse
       (?onglet= ?tri= ?vue= ?q= ?apercu= ?periodes=, en place) ;
     · une note s'ouvre comme un document Linear (?note=, même route) :
       fil d'Ariane « Notes › titre », étoile, « ··· » (dupliquer,
       renommer, enregistrer comme modèle, favori, copier le lien,
       télécharger, supprimer), « Modifié le … » et son volet (auteur,
       création, modification), copier le lien, fermer ; la colonne de 805
       avec l'icône, le titre 24/600, les liens entreprise / rendez-vous en
       pastilles, le texte 15/450/24 rendu comme chez Linear (## titre,
       ### sous-titre, • liste, > citation) et édité au clic ; le plan des
       titres au bord gauche ; une note vide propose les modèles favoris.

   Comme avant, les notes vivent dans le navigateur de cet appareil
   (localStorage, même clé) — la page le dit. Le jour où elles passent en
   base, seuls `lire` et `ecrire` changent.
   ══════════════════════════════════════════════════════════════════════ */

import "./lin/lin.css";
import "./lin/linear-docs.css";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Building2, CalendarDays, Check, Copy, Download, FileText, History, LayoutGrid, Link2, List, MoreHorizontal, Pencil, Plus, Search, SlidersHorizontal, Star, Trash2, X } from "lucide-react";
import { ecrireStockage, useStockage } from "./Collection";
import { useOrganisation } from "./organisation";
import { useToast } from "./Toasts";
import { IconeDocument } from "./lin/icones";

const CLE = "espace2-notes-v1";
const RACINE = "/espace2/notes";
const JOUR = 86_400_000;

type NoteT = { id: string; titre: string; texte: string; entreprise?: string; rdv?: string; favori?: boolean; auteur: string; cree: string; maj: string };
type Modele = { id: string; titre: string; texte: string; favori?: boolean; cree: string };
type Donnees = { notes: NoteT[]; modeles: Modele[] };

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
        "Présents : toute l'équipe\n\n## Points abordés\n• Planning de la semaine\n• Commandes en retard\n• Congés de fin d'année\n\n### Décisions\n> Les relances partent le mardi matin\n\n### À faire\n• Mettre à jour le planning partagé\n• Confirmer les dates de congés avant vendredi",
        1,
        organisation,
      ),
      n(
        "Appel fournisseur : délais de livraison",
        "Objet : retard sur la dernière commande\n\n## Ce qui a été dit\n• Livraison décalée d'une semaine\n• Geste commercial possible sur la prochaine commande\n\n## Suite\n• Rappeler jeudi pour confirmer la date",
        3,
        "Fournisseur principal",
        { rdv: ilYa(-2).slice(0, 10) },
      ),
      n(
        "Visite client : besoins relevés",
        "Contexte : premier rendez-vous sur place\n\n## Besoins\n• Un devis sous dix jours\n• Une intervention avant la fin du mois\n\n## Prochaine étape\n• Envoyer le devis et proposer deux créneaux",
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
      { id: nouvelId(), titre: "Compte rendu de réunion", texte: "Présents :\n\n## Points abordés\n• \n\n## Décisions\n• \n\n## À faire (qui, quand)\n• ", favori: true, cree: ilYa(30) },
      { id: nouvelId(), titre: "Appel client", texte: "Interlocuteur :\nObjet de l'appel :\n\n## Ce qui a été dit\n• \n\n## Suite à donner\n• ", favori: true, cree: ilYa(30) },
      { id: nouvelId(), titre: "Visite sur place", texte: "Adresse :\nPersonnes présentes :\n\n## Constat\n• \n\n## Photos et mesures\n• \n\n## Prochaine étape\n• ", cree: ilYa(30) },
      { id: nouvelId(), titre: "Point de la semaine", texte: "## Ce qui est fait\n• \n\n## Ce qui bloque\n• \n\n## Priorités de la semaine prochaine\n• ", cree: ilYa(30) },
      {
        id: nouvelId(),
        titre: "Arrivée d'un salarié",
        texte: "Prénom et poste :\nDate d'arrivée :\n\n## Avant le premier jour\n• Accès et matériel\n• Planning de la première semaine\n\n## Premier jour\n• Présentation à l'équipe\n• Visite des locaux",
        cree: ilYa(30),
      },
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
const dateHeure = (iso: string) => `${dateCourte(iso)}, ${new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;
const apercu = (t: string) =>
  t
    .replace(/^#{1,3} |^> /gm, "")
    .replace(/\s+/g, " ")
    .trim();
const initiale = (s: string) => (s.trim()[0] ?? "?").toUpperCase();
const normaliser = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

type Tri = "cree" | "maj" | "titre";
const TRIS: { cle: Tri; libelle: string }[] = [
  { cle: "cree", libelle: "Date de création" },
  { cle: "maj", libelle: "Dernière modification" },
  { cle: "titre", libelle: "Titre" },
];

/* ——— le texte d'une note rendu comme un document Linear ———
   une ligne = un bloc : « ## » titre, « ### » sous-titre, « • » / « - » liste, « > » citation, sinon paragraphe */
type Bloc = { genre: "p" | "h2" | "h3" | "quote"; texte: string } | { genre: "ul"; items: string[] };
function blocs(texte: string): Bloc[] {
  const out: Bloc[] = [];
  for (const brute of texte.split("\n")) {
    const l = brute.trim();
    if (!l) continue;
    if (l.startsWith("### ")) out.push({ genre: "h3", texte: l.slice(4) });
    else if (l.startsWith("## ") || l.startsWith("# ")) out.push({ genre: "h2", texte: l.replace(/^#+ /, "") });
    else if (l.startsWith("> ")) out.push({ genre: "quote", texte: l.slice(2) });
    else if (/^[•\-*] ?/.test(l)) {
      const item = l.replace(/^[•\-*] ?/, "");
      const dernier = out[out.length - 1];
      if (dernier && dernier.genre === "ul") dernier.items.push(item);
      else out.push({ genre: "ul", items: [item] });
    } else out.push({ genre: "p", texte: l });
  }
  return out;
}
const titresDe = (texte: string) =>
  blocs(texte)
    .map((b, i) => (b.genre === "h2" || b.genre === "h3" ? { niveau: b.genre === "h2" ? 2 : 3, texte: b.texte, i } : null))
    .filter((t): t is { niveau: number; texte: string; i: number } => !!t);

function Rendu({ texte, placeholder, onClick }: { texte: string; placeholder: string; onClick: () => void }) {
  const bs = blocs(texte);
  return (
    <div className="ld-rendu" onClick={onClick} role="button" tabIndex={0} aria-label="Modifier le texte" onKeyDown={(e) => (e.key === "Enter" ? onClick() : undefined)}>
      {bs.length === 0 ? <p className="ld-placeholder">{placeholder}</p> : null}
      {bs.map((b, i) =>
        b.genre === "ul" ? (
          <ul key={i}>
            {b.items.map((it, j) => (
              <li key={j}>{it || " "}</li>
            ))}
          </ul>
        ) : b.genre === "h2" ? (
          <h2 key={i} id={`ld-titre-${i}`}>
            {b.texte}
          </h2>
        ) : b.genre === "h3" ? (
          <h3 key={i} id={`ld-titre-${i}`}>
            {b.texte}
          </h3>
        ) : b.genre === "quote" ? (
          <blockquote key={i}>
            <p>{b.texte}</p>
          </blockquote>
        ) : (
          <p key={i}>{b.texte}</p>
        ),
      )}
    </div>
  );
}

/* ——— un menu « ··· » de Linear : 264 de large, lignes de 32, raccourci à droite ——— */
type Item = { cle: string; libelle: string; icone?: React.ReactNode; raccourci?: string; coche?: boolean | null; action: () => void } | "sep" | { titre: string };
function MenuLd({ items, bouton, cote, libelle }: { items: Item[]; bouton: (ouvert: boolean, basculer: () => void) => React.ReactNode; cote?: "droite"; libelle: string }) {
  const [ouvert, setOuvert] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ouvert) return;
    const clic = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOuvert(false);
    };
    const touche = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOuvert(false);
      }
    };
    document.addEventListener("mousedown", clic);
    document.addEventListener("keydown", touche, true);
    return () => {
      document.removeEventListener("mousedown", clic);
      document.removeEventListener("keydown", touche, true);
    };
  }, [ouvert]);
  return (
    <div className="lin-ancre" ref={ref}>
      {bouton(ouvert, () => setOuvert((v) => !v))}
      {ouvert ? (
        <div className="ld-menu" data-cote={cote} role="menu" aria-label={libelle}>
          <ul>
            {items.map((it, i) =>
              it === "sep" ? (
                <li key={i} className="ld-menu-sep" role="separator" />
              ) : "titre" in it ? (
                <li key={i} className="ld-menu-titre">
                  {it.titre}
                </li>
              ) : (
                <li key={it.cle} role="none">
                  <button
                    type="button"
                    role="menuitem"
                    className="ld-menu-item"
                    data-coche={it.coche !== undefined ? "" : undefined}
                    onClick={() => {
                      setOuvert(false);
                      it.action();
                    }}
                  >
                    {it.icone}
                    <span>{it.libelle}</span>
                    {it.coche !== undefined ? <Check className="ld-menu-coche" data-vide={it.coche ? undefined : ""} aria-hidden="true" /> : null}
                    {it.raccourci ? (
                      <span className="ld-menu-kbd" aria-hidden="true">
                        {it.raccourci}
                      </span>
                    ) : null}
                  </button>
                </li>
              ),
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export default function Notes() {
  const brut = useStockage(CLE);
  const { nom: organisation, prenom } = useOrganisation();
  const auteur = prenom || "Vous";
  const donnees = lire(brut);
  const toast = useToast();
  const router = useRouter();
  const chemin = usePathname();
  const params = useSearchParams();

  /* premier passage sur cet appareil : on pose les exemples */
  useEffect(() => {
    if (brut === "") ecrire(exemples(organisation, auteur));
  }, [brut, organisation, auteur]);

  /* tout l'état de la page est dans l'adresse, en place */
  const onglet: "notes" | "modeles" = params.get("onglet") === "modeles" ? "modeles" : "notes";
  const tri: Tri = (TRIS.find((t) => t.cle === params.get("tri"))?.cle ?? "cree") as Tri;
  const vue: "liste" | "grille" = params.get("vue") === "grille" ? "grille" : "liste";
  const apercus = params.get("apercu") !== "0";
  const periodes = params.get("periodes") !== "0";
  const q = params.get("q") ?? "";
  const noteId = params.get("note");
  const modeleId = params.get("modele");
  const poser = (champs: Record<string, string | null>) => {
    const sp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(champs)) {
      if (v === null || v === "") sp.delete(k);
      else sp.set(k, v);
    }
    const s = sp.toString();
    router.replace(s ? `${chemin}?${s}` : chemin, { scroll: false });
  };
  const [maintenant] = useState(() => Date.now());

  const notes = useMemo(() => {
    const ls = [...(donnees?.notes ?? [])];
    return ls.sort((a, b) => (tri === "titre" ? a.titre.localeCompare(b.titre, "fr") : tri === "maj" ? b.maj.localeCompare(a.maj) : b.cree.localeCompare(a.cree)));
  }, [donnees, tri]);
  const modeles = useMemo(() => [...(donnees?.modeles ?? [])].sort((a, b) => Number(!!b.favori) - Number(!!a.favori) || a.titre.localeCompare(b.titre, "fr")), [donnees]);

  if (!donnees) return <div className="lin ld" aria-busy="true" />;

  const majNote = (id: string, champs: Partial<NoteT>) => ecrire({ ...donnees, notes: donnees.notes.map((n) => (n.id === id ? { ...n, ...champs, maj: new Date().toISOString() } : n)) });
  const majModele = (id: string, champs: Partial<Modele>) => ecrire({ ...donnees, modeles: donnees.modeles.map((m) => (m.id === id ? { ...m, ...champs } : m)) });

  function creerNote(depuis?: Modele) {
    const instant = new Date().toISOString();
    const n: NoteT = { id: nouvelId(), titre: depuis ? depuis.titre : "", texte: depuis ? depuis.texte : "", auteur, cree: instant, maj: instant };
    ecrire({ ...donnees!, notes: [n, ...donnees!.notes] });
    poser({ onglet: null, note: n.id, modele: null });
  }
  function creerModele(depuis?: NoteT) {
    const m: Modele = { id: nouvelId(), titre: depuis ? depuis.titre || "Nouveau modèle" : "", texte: depuis?.texte ?? "", cree: new Date().toISOString() };
    ecrire({ ...donnees!, modeles: [m, ...donnees!.modeles] });
    if (depuis) toast("Modèle créé", "vert");
    poser({ onglet: "modeles", note: null, modele: m.id });
  }
  function supprimer(genre: "note" | "modele", id: string) {
    if (!window.confirm(genre === "note" ? "Supprimer cette note ?" : "Supprimer ce modèle ?")) return;
    ecrire(genre === "note" ? { ...donnees!, notes: donnees!.notes.filter((n) => n.id !== id) } : { ...donnees!, modeles: donnees!.modeles.filter((m) => m.id !== id) });
    if (noteId === id || modeleId === id) poser({ note: null, modele: null });
    toast("Supprimé");
  }
  function dupliquer(n: NoteT) {
    const instant = new Date().toISOString();
    ecrire({ ...donnees!, notes: [{ ...n, id: nouvelId(), titre: `${n.titre || "Sans titre"} (copie)`, favori: false, auteur, cree: instant, maj: instant }, ...donnees!.notes] });
    toast("Note dupliquée", "vert");
  }
  function copierLien(id: string) {
    void navigator.clipboard?.writeText(`${window.location.origin}${RACINE}?note=${id}`);
    toast("Lien copié", "vert");
  }
  function telecharger(titre: string, texte: string) {
    const blob = new Blob([`${titre || "Sans titre"}\n\n${texte}`], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(titre || "note").replace(/[\\/:*?"<>|]+/g, " ").trim() || "note"}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const entreprises = Array.from(new Set([organisation, ...donnees.notes.map((n) => n.entreprise).filter((e): e is string => !!e)]));

  /* ——— le document ouvert ——— */
  const noteOuverte = noteId ? donnees.notes.find((n) => n.id === noteId) : undefined;
  const modeleOuvert = modeleId ? donnees.modeles.find((m) => m.id === modeleId) : undefined;
  if (noteOuverte) {
    const n = noteOuverte;
    return (
      <Document
        genre="note"
        cle={n.id}
        titre={n.titre}
        texte={n.texte}
        favori={!!n.favori}
        auteur={n.auteur}
        cree={n.cree}
        maj={n.maj}
        retour={{ onglet: null, note: null }}
        changer={(c) => majNote(n.id, c)}
        basculerFavori={() => majNote(n.id, { favori: !n.favori })}
        copierLien={() => copierLien(n.id)}
        fermer={() => poser({ note: null })}
        menu={(renommer) => [
          { cle: "dup", libelle: "Dupliquer", icone: <Copy aria-hidden="true" />, action: () => dupliquer(n) },
          { cle: "ren", libelle: "Renommer…", icone: <Pencil aria-hidden="true" />, raccourci: "⇧ R", action: renommer },
          { cle: "mod", libelle: "Enregistrer comme modèle", icone: <FileText aria-hidden="true" />, action: () => creerModele(n) },
          "sep",
          { cle: "fav", libelle: n.favori ? "Retirer des favoris" : "Mettre en favori", icone: <Star aria-hidden="true" />, raccourci: "⌥ F", action: () => majNote(n.id, { favori: !n.favori }) },
          { cle: "lien", libelle: "Copier le lien", icone: <Link2 aria-hidden="true" />, action: () => copierLien(n.id) },
          { cle: "dl", libelle: "Télécharger", icone: <Download aria-hidden="true" />, action: () => telecharger(n.titre, n.texte) },
          "sep",
          { cle: "sup", libelle: "Supprimer", icone: <Trash2 aria-hidden="true" />, action: () => supprimer("note", n.id) },
        ]}
        props={
          <div className="ld-props">
            <MenuLd
              libelle="Entreprise liée"
              bouton={(ouvert, basculer) => (
                <button type="button" className="ld-pastille" data-vide={n.entreprise ? undefined : ""} data-ouvert={ouvert ? "" : undefined} aria-haspopup="menu" aria-expanded={ouvert} onClick={basculer}>
                  <Building2 aria-hidden="true" />
                  <span className="ld-pastille-titre">{n.entreprise || "Lier une entreprise"}</span>
                </button>
              )}
              items={[
                { titre: "Entreprise liée" },
                ...entreprises.map((e) => ({ cle: `e-${e}`, libelle: e, coche: n.entreprise === e, action: () => majNote(n.id, { entreprise: e }) })),
                {
                  cle: "autre",
                  libelle: "Autre entreprise…",
                  icone: <Plus aria-hidden="true" />,
                  action: () => {
                    const e = window.prompt("Nom de l'entreprise")?.trim();
                    if (e) majNote(n.id, { entreprise: e });
                  },
                },
                ...(n.entreprise ? (["sep", { cle: "aucune", libelle: "Retirer le lien", icone: <X aria-hidden="true" />, action: () => majNote(n.id, { entreprise: undefined }) }] as Item[]) : []),
              ]}
            />
            <label className="ld-pastille" data-vide={n.rdv ? undefined : ""}>
              <CalendarDays aria-hidden="true" />
              <span className="ld-pastille-titre">{n.rdv ? `Rendez-vous du ${dateCourte(n.rdv)}` : "Lier un rendez-vous"}</span>
              <input
                type="date"
                className="ld-date-cachee"
                value={n.rdv ?? ""}
                aria-label="Date du rendez-vous lié"
                onClick={(e) => e.currentTarget.showPicker?.()}
                onChange={(e) => majNote(n.id, { rdv: e.target.value || undefined })}
              />
            </label>
          </div>
        }
        vide={
          <div className="ld-suggestions">
            <p className="ld-suggestions-etiquette">Modèles favoris</p>
            {modeles.filter((m) => m.favori).length ? (
              <ul>
                {modeles
                  .filter((m) => m.favori)
                  .map((m) => (
                    <li key={m.id}>
                      <button type="button" onClick={() => majNote(n.id, { titre: n.titre || m.titre, texte: m.texte })}>
                        <FileText aria-hidden="true" />
                        {m.titre}
                      </button>
                    </li>
                  ))}
              </ul>
            ) : (
              <p>Les modèles mis en favori apparaîtront ici</p>
            )}
            <p className="ld-suggestions-etiquette">Actions</p>
            <ul>
              <li>
                <button type="button" onClick={() => poser({ note: null, onglet: "modeles" })}>
                  <FileText aria-hidden="true" />
                  Voir tous les modèles
                </button>
              </li>
              <li>
                <button type="button" onClick={() => creerModele()}>
                  <Plus aria-hidden="true" />
                  Créer un modèle
                </button>
              </li>
            </ul>
          </div>
        }
      />
    );
  }
  if (modeleOuvert) {
    const m = modeleOuvert;
    return (
      <Document
        genre="modele"
        cle={m.id}
        titre={m.titre}
        texte={m.texte}
        favori={!!m.favori}
        auteur={auteur}
        cree={m.cree}
        retour={{ onglet: "modeles", modele: null }}
        changer={(c) => majModele(m.id, c)}
        basculerFavori={() => majModele(m.id, { favori: !m.favori })}
        fermer={() => poser({ modele: null })}
        menu={(renommer) => [
          { cle: "use", libelle: "Créer une note avec ce modèle", icone: <Plus aria-hidden="true" />, action: () => creerNote(m) },
          { cle: "ren", libelle: "Renommer…", icone: <Pencil aria-hidden="true" />, raccourci: "⇧ R", action: renommer },
          "sep",
          { cle: "fav", libelle: m.favori ? "Retirer des favoris" : "Mettre en favori", icone: <Star aria-hidden="true" />, raccourci: "⌥ F", action: () => majModele(m.id, { favori: !m.favori }) },
          { cle: "dl", libelle: "Télécharger", icone: <Download aria-hidden="true" />, action: () => telecharger(m.titre, m.texte) },
          "sep",
          { cle: "sup", libelle: "Supprimer", icone: <Trash2 aria-hidden="true" />, action: () => supprimer("modele", m.id) },
        ]}
        props={
          <div className="ld-props">
            <span className="ld-pastille" data-vide="">
              <FileText aria-hidden="true" />
              <span className="ld-pastille-titre">Modèle de note</span>
            </span>
          </div>
        }
      />
    );
  }

  /* ——— la liste ——— */
  const filtre = normaliser(q.trim());
  const correspond = (titre: string, texte: string) => !filtre || normaliser(`${titre} ${texte}`).includes(filtre);
  const visibles = notes.filter((n) => correspond(n.titre, n.texte));
  const favoris = visibles.filter((n) => n.favori);
  const autres = visibles.filter((n) => !n.favori);
  const groupes = periodes
    ? [
        { titre: "Créées cette semaine", liste: autres.filter((n) => maintenant - Date.parse(n.cree) < 7 * JOUR) },
        { titre: "Créées ce mois-ci", liste: autres.filter((n) => maintenant - Date.parse(n.cree) >= 7 * JOUR && maintenant - Date.parse(n.cree) < 31 * JOUR) },
        { titre: "Plus anciennes", liste: autres.filter((n) => maintenant - Date.parse(n.cree) >= 31 * JOUR) },
      ].filter((g) => g.liste.length)
    : [{ titre: "Toutes les notes", liste: autres }];
  const modelesVisibles = modeles.filter((m) => correspond(m.titre, m.texte));

  const menuNote = (n: NoteT): Item[] => [
    { cle: "fav", libelle: n.favori ? "Retirer des favoris" : "Mettre en favori", icone: <Star aria-hidden="true" />, action: () => majNote(n.id, { favori: !n.favori }) },
    { cle: "dup", libelle: "Dupliquer", icone: <Copy aria-hidden="true" />, action: () => dupliquer(n) },
    { cle: "mod", libelle: "Enregistrer comme modèle", icone: <FileText aria-hidden="true" />, action: () => creerModele(n) },
    { cle: "lien", libelle: "Copier le lien", icone: <Link2 aria-hidden="true" />, action: () => copierLien(n.id) },
    "sep",
    { cle: "sup", libelle: "Supprimer", icone: <Trash2 aria-hidden="true" />, action: () => supprimer("note", n.id) },
  ];
  const menuModele = (m: Modele): Item[] => [
    { cle: "use", libelle: "Créer une note avec ce modèle", icone: <Plus aria-hidden="true" />, action: () => creerNote(m) },
    { cle: "fav", libelle: m.favori ? "Retirer des favoris" : "Mettre en favori", icone: <Star aria-hidden="true" />, action: () => majModele(m.id, { favori: !m.favori }) },
    "sep",
    { cle: "sup", libelle: "Supprimer", icone: <Trash2 aria-hidden="true" />, action: () => supprimer("modele", m.id) },
  ];

  const pastilleNote = (n: NoteT) => (
    <span key={n.id} className="ld-pastille">
      <button type="button" className="ld-pastille-ouvrir" aria-label={`Ouvrir la note ${n.titre || "sans titre"}`} onClick={() => poser({ note: n.id })} />
      <IconeDocument />
      <span className="ld-pastille-titre">{n.titre || "Sans titre"}</span>
      {n.favori ? <Star className="ld-pastille-etoile" aria-label="Favori" /> : null}
      <span className="ld-pastille-plus">
        <MenuLd libelle="Actions de la note" items={menuNote(n)} bouton={(ouvert, basculer) => <Rond libelle="Actions de la note" ouvert={ouvert} onClick={basculer} icone={<MoreHorizontal aria-hidden="true" />} />} />
      </span>
    </span>
  );
  const ligneNote = (n: NoteT) => (
    <li key={n.id} className="ld-ligne">
      <button type="button" className="ld-ligne-ouvrir" aria-label={`Ouvrir la note ${n.titre || "sans titre"}`} onClick={() => poser({ note: n.id })} />
      <IconeDocument />
      <span className="ld-ligne-titre">{n.titre || "Sans titre"}</span>
      {apercus ? <span className="ld-ligne-apercu">{apercu(n.texte) || "Cette note est vide."}</span> : null}
      <span className="ld-ligne-meta">
        {n.entreprise ? (
          <span className="ld-ligne-entreprise">
            <Building2 aria-hidden="true" />
            {n.entreprise}
          </span>
        ) : null}
        <span className="ld-ligne-auteur">
          <span className="ld-avatar" aria-hidden="true">
            {initiale(n.auteur)}
          </span>
          {n.auteur}
        </span>
        <time dateTime={n.cree}>{dateCourte(n.cree)}</time>
      </span>
      <span className="ld-ligne-outils">
        <Rond libelle={n.favori ? "Retirer des favoris" : "Mettre en favori"} presse={!!n.favori} onClick={() => majNote(n.id, { favori: !n.favori })} icone={<Star aria-hidden="true" />} />
        <MenuLd
          libelle="Actions de la note"
          cote="droite"
          items={menuNote(n)}
          bouton={(ouvert, basculer) => <Rond libelle="Actions de la note" ouvert={ouvert} onClick={basculer} icone={<MoreHorizontal aria-hidden="true" />} />}
        />
      </span>
    </li>
  );
  const ligneModele = (m: Modele) => (
    <li key={m.id} className="ld-ligne">
      <button type="button" className="ld-ligne-ouvrir" aria-label={`Modifier le modèle ${m.titre || "sans titre"}`} onClick={() => poser({ modele: m.id })} />
      <IconeDocument />
      <span className="ld-ligne-titre">{m.titre || "Sans titre"}</span>
      {apercus ? <span className="ld-ligne-apercu">{apercu(m.texte) || "Ce modèle est vide."}</span> : null}
      <span className="ld-ligne-meta">
        <time dateTime={m.cree}>{dateCourte(m.cree)}</time>
      </span>
      <span className="ld-ligne-outils">
        <button type="button" className="lin-btn lin-btn--texte ld-utiliser" onClick={() => creerNote(m)}>
          <Plus width={14} height={14} aria-hidden="true" />
          Utiliser
        </button>
        <Rond libelle={m.favori ? "Retirer des favoris" : "Mettre en favori"} presse={!!m.favori} onClick={() => majModele(m.id, { favori: !m.favori })} icone={<Star aria-hidden="true" />} />
        <MenuLd
          libelle="Actions du modèle"
          cote="droite"
          items={menuModele(m)}
          bouton={(ouvert, basculer) => <Rond libelle="Actions du modèle" ouvert={ouvert} onClick={basculer} icone={<MoreHorizontal aria-hidden="true" />} />}
        />
      </span>
    </li>
  );
  const pastilleModele = (m: Modele) => (
    <span key={m.id} className="ld-pastille">
      <button type="button" className="ld-pastille-ouvrir" aria-label={`Modifier le modèle ${m.titre || "sans titre"}`} onClick={() => poser({ modele: m.id })} />
      <IconeDocument />
      <span className="ld-pastille-titre">{m.titre || "Sans titre"}</span>
      {m.favori ? <Star className="ld-pastille-etoile" aria-label="Favori" /> : null}
      <span className="ld-pastille-plus">
        <MenuLd libelle="Actions du modèle" items={menuModele(m)} bouton={(ouvert, basculer) => <Rond libelle="Actions du modèle" ouvert={ouvert} onClick={basculer} icone={<MoreHorizontal aria-hidden="true" />} />} />
      </span>
    </span>
  );

  const affichage: Item[] = [
    { titre: "Trier par" },
    ...TRIS.map((t) => ({ cle: `tri-${t.cle}`, libelle: t.libelle, coche: tri === t.cle, action: () => poser({ tri: t.cle === "cree" ? null : t.cle }) })),
    "sep",
    { titre: "Afficher" },
    { cle: "apercus", libelle: "L'aperçu du texte", coche: apercus, action: () => poser({ apercu: apercus ? "0" : null }) },
    { cle: "periodes", libelle: "Regrouper par période", coche: periodes, action: () => poser({ periodes: periodes ? "0" : null }) },
    "sep",
    { titre: "Vue" },
    { cle: "liste", libelle: "En liste", icone: <List aria-hidden="true" />, coche: vue === "liste", action: () => poser({ vue: null }) },
    { cle: "grille", libelle: "En grille", icone: <LayoutGrid aria-hidden="true" />, coche: vue === "grille", action: () => poser({ vue: "grille" }) },
  ];

  return (
    <div className="lin ld">
      <h1 className="v2-sr">Notes</h1>
      <header className="lin-tete">
        <nav className="lin-fil" aria-label="Fil d'Ariane">
          <span className="lin-fil-ici lin-fil-projet" aria-current="page">
            <IconeDocument />
            Notes
          </span>
        </nav>
        <div className="lin-tete-ronds">
          {onglet === "notes" ? (
            <button type="button" className="lin-btn lin-btn--plein lin-btn--texte" onClick={() => creerNote()}>
              <Plus width={14} height={14} aria-hidden="true" />
              <span>Nouvelle note</span>
            </button>
          ) : (
            <button type="button" className="lin-btn lin-btn--plein lin-btn--texte" onClick={() => creerModele()}>
              <Plus width={14} height={14} aria-hidden="true" />
              <span>Nouveau modèle</span>
            </button>
          )}
        </div>
      </header>

      <div className="lin-outils">
        <nav className="lin-onglets" aria-label="Notes et modèles">
          <Link
            href={q ? `${RACINE}?q=${encodeURIComponent(q)}` : RACINE}
            replace
            scroll={false}
            className="v2-btn v2-btn--petit"
            data-actif={onglet === "notes" ? "" : undefined}
            aria-current={onglet === "notes" ? "page" : undefined}
          >
            Notes
            <span className="ld-compte">{donnees.notes.length}</span>
          </Link>
          <Link
            href={`${RACINE}?onglet=modeles${q ? `&q=${encodeURIComponent(q)}` : ""}`}
            replace
            scroll={false}
            className="v2-btn v2-btn--petit"
            data-actif={onglet === "modeles" ? "" : undefined}
            aria-current={onglet === "modeles" ? "page" : undefined}
          >
            Modèles
            <span className="ld-compte">{donnees.modeles.length}</span>
          </Link>
        </nav>
        <div className="lin-outils-droite">
          <label className="ld-recherche">
            <Search aria-hidden="true" />
            <input type="search" value={q} placeholder={onglet === "notes" ? "Rechercher une note…" : "Rechercher un modèle…"} aria-label="Rechercher" onChange={(e) => poser({ q: e.target.value })} />
            {q ? (
              <button type="button" className="ld-recherche-effacer" aria-label="Effacer la recherche" onClick={() => poser({ q: null })}>
                <X aria-hidden="true" />
              </button>
            ) : null}
          </label>
          <MenuLd libelle="Affichage" cote="droite" items={affichage} bouton={(ouvert, basculer) => <Rond libelle="Affichage" ouvert={ouvert} onClick={basculer} icone={<SlidersHorizontal aria-hidden="true" />} />} />
        </div>
      </div>

      <div className="lin-projet">
        <article className="lin-projet-texte">
          <span className="lin-tuile" aria-hidden="true">
            <IconeDocument />
          </span>
          <h2 className="lin-projet-h1">{onglet === "notes" ? "Notes" : "Modèles"}</h2>
          <p className="lin-projet-resume">{onglet === "notes" ? "Les notes sont gardées dans le navigateur de cet appareil." : "Une note vide propose les modèles mis en favori."}</p>

          {onglet === "notes" ? (
            <>
              <div className="lin-projet-ligne">
                <span className="lin-projet-etiquette">Favoris</span>
                {favoris.length ? <span className="ld-pastilles">{favoris.map(pastilleNote)}</span> : <span className="ld-vide">Les notes mises en favori apparaîtront ici</span>}
              </div>
              {groupes.map((g) => (
                <section key={g.titre} aria-label={g.titre}>
                  <h3 className="lin-projet-h2">
                    {g.titre}
                    <span className="ld-compte">{g.liste.length}</span>
                  </h3>
                  {vue === "grille" ? <div className="ld-pastilles">{g.liste.map(pastilleNote)}</div> : <ul className="ld-lignes">{g.liste.map(ligneNote)}</ul>}
                </section>
              ))}
              {notes.length === 0 ? <p className="ld-rien">Aucune note pour l&apos;instant : « Nouvelle note » pour commencer.</p> : null}
              {notes.length > 0 && visibles.length === 0 ? <p className="ld-rien">Aucune note ne correspond à « {q} ».</p> : null}
            </>
          ) : (
            <>
              <section aria-label="Modèles">
                <h3 className="lin-projet-h2">
                  Modèles
                  <span className="ld-compte">{modelesVisibles.length}</span>
                </h3>
                {vue === "grille" ? <div className="ld-pastilles">{modelesVisibles.map(pastilleModele)}</div> : <ul className="ld-lignes">{modelesVisibles.map(ligneModele)}</ul>}
              </section>
              {modeles.length === 0 ? <p className="ld-rien">Aucun modèle pour l&apos;instant : « Nouveau modèle » pour commencer.</p> : null}
              {modeles.length > 0 && modelesVisibles.length === 0 ? <p className="ld-rien">Aucun modèle ne correspond à « {q} ».</p> : null}
            </>
          )}
        </article>
      </div>
    </div>
  );
}

/* ——— un bouton rond de 28 (étoile, « ··· », Affichage) ——— */
function Rond({ libelle, icone, onClick, ouvert, presse }: { libelle: string; icone: React.ReactNode; onClick: () => void; ouvert?: boolean; presse?: boolean }) {
  return (
    <button type="button" className="lin-rond" aria-label={libelle} title={libelle} aria-expanded={ouvert} aria-pressed={presse} onClick={onClick}>
      {icone}
    </button>
  );
}

/* ——— le document : barre du titre, colonne de 805, plan ——— */
function Document({
  genre,
  cle,
  titre,
  texte,
  favori,
  auteur,
  cree,
  maj,
  retour,
  changer,
  basculerFavori,
  copierLien,
  fermer,
  menu,
  props,
  vide,
}: {
  genre: "note" | "modele";
  cle: string;
  titre: string;
  texte: string;
  favori: boolean;
  auteur: string;
  cree: string;
  maj?: string;
  retour: Record<string, string | null>;
  changer: (c: { titre?: string; texte?: string }) => void;
  basculerFavori: () => void;
  copierLien?: () => void;
  fermer: () => void;
  menu: (renommer: () => void) => Item[];
  props: React.ReactNode;
  vide?: React.ReactNode;
}) {
  const router = useRouter();
  const chemin = usePathname();
  const params = useSearchParams();
  const champTitre = useRef<HTMLInputElement>(null);
  const zone = useRef<HTMLTextAreaElement>(null);
  const [edition, setEdition] = useState(() => !texte);
  const [infos, setInfos] = useState(false);
  const refInfos = useRef<HTMLDivElement>(null);
  const titres = titresDe(texte);

  /* le lien de retour garde l'onglet et la recherche */
  const lienRetour = (() => {
    const sp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(retour)) {
      if (v === null) sp.delete(k);
      else sp.set(k, v);
    }
    sp.delete("note");
    sp.delete("modele");
    const s = sp.toString();
    return s ? `${chemin}?${s}` : chemin;
  })();

  const ajuster = (el: HTMLTextAreaElement | null) => {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };
  useEffect(() => {
    if (edition) {
      ajuster(zone.current);
      if (!titre && !texte) champTitre.current?.focus();
      else zone.current?.focus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- au passage en édition seulement
  }, [edition]);
  useEffect(() => {
    if (!infos) return;
    const clic = (e: MouseEvent) => {
      if (refInfos.current && !refInfos.current.contains(e.target as Node)) setInfos(false);
    };
    document.addEventListener("mousedown", clic);
    return () => document.removeEventListener("mousedown", clic);
  }, [infos]);
  /* raccourcis de Linear : ⇧R renomme, ⌥F favori ; Échap ferme le document */
  useEffect(() => {
    const touche = (e: KeyboardEvent) => {
      const cible = e.target as HTMLElement | null;
      const saisie = !!cible && (cible.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(cible.tagName));
      if (e.key === "Escape") {
        if (saisie) {
          cible?.blur();
          return;
        }
        if (document.querySelector('[role="menu"]')) return;
        e.preventDefault();
        router.replace(lienRetour, { scroll: false });
      } else if (!saisie && e.shiftKey && !e.metaKey && !e.ctrlKey && e.key.toLowerCase() === "r") {
        e.preventDefault();
        champTitre.current?.focus();
        champTitre.current?.select();
      } else if (!saisie && e.altKey && e.code === "KeyF") {
        e.preventDefault();
        basculerFavori();
      }
    };
    window.addEventListener("keydown", touche);
    return () => window.removeEventListener("keydown", touche);
  }, [lienRetour, router, basculerFavori]);

  /* « Renommer… » du menu : le champ du titre prend le focus au rendu suivant (pas de ref lue pendant le rendu) */
  const [renommage, setRenommage] = useState(0);
  useEffect(() => {
    if (!renommage) return;
    champTitre.current?.focus();
    champTitre.current?.select();
  }, [renommage]);
  const renommer = () => setRenommage((v) => v + 1);
  const allerAuTitre = (i: number) => {
    setEdition(false);
    requestAnimationFrame(() => document.getElementById(`ld-titre-${i}`)?.scrollIntoView({ block: "start", behavior: "smooth" }));
  };

  return (
    <div className="lin ld" key={cle}>
      <h1 className="v2-sr">{titre || (genre === "note" ? "Note sans titre" : "Modèle sans titre")}</h1>
      <header className="lin-tete">
        <nav className="lin-fil" aria-label="Fil d'Ariane">
          <Link href={lienRetour} replace scroll={false} className="lin-fil-equipe">
            <IconeDocument />
            {genre === "note" ? "Notes" : "Modèles"}
          </Link>
          <span className="lin-fil-sep" aria-hidden="true">
            ›
          </span>
          <span className="lin-fil-ici lin-fil-projet" aria-current="page">
            <IconeDocument />
            {titre || (genre === "note" ? "Nouvelle note" : "Nouveau modèle")}
          </span>
        </nav>
        <Rond
          libelle={favori ? "Retirer des favoris" : "Mettre en favori"}
          presse={favori}
          onClick={basculerFavori}
          icone={<Star aria-hidden="true" style={favori ? { fill: "currentColor", color: "var(--lin-en-cours)" } : undefined} />}
        />
        <MenuLd
          libelle={genre === "note" ? "Actions de la note" : "Actions du modèle"}
          items={menu(renommer)}
          bouton={(ouvert, basculer) => <Rond libelle={genre === "note" ? "Actions de la note" : "Actions du modèle"} ouvert={ouvert} onClick={basculer} icone={<MoreHorizontal aria-hidden="true" />} />}
        />
        <div className="lin-tete-ronds">
          <div className="lin-ancre" ref={refInfos}>
            <button type="button" className="ld-edite" aria-haspopup="dialog" aria-expanded={infos} onClick={() => setInfos((v) => !v)}>
              <SlidersHorizontal aria-hidden="true" />
              Modifié le {dateCourte(maj ?? cree)}
            </button>
            {infos ? (
              <div className="ld-infos" role="dialog" aria-label="Auteur et dates">
                <div className="ld-infos-ligne">
                  <span className="ld-infos-etiquette">Auteur</span>
                  <span className="ld-infos-qui">
                    <span className="ld-avatar" aria-hidden="true">
                      {initiale(auteur)}
                    </span>
                    {auteur}
                  </span>
                </div>
                <div className="ld-infos-ligne">
                  <span className="ld-infos-etiquette">Créé</span>
                  <span className="ld-infos-qui">
                    <span className="ld-avatar" aria-hidden="true">
                      {initiale(auteur)}
                    </span>
                    {auteur}
                  </span>
                  <span className="ld-infos-date">{dateHeure(cree)}</span>
                </div>
                {maj ? (
                  <div className="ld-infos-ligne">
                    <span className="ld-infos-etiquette">Modifié</span>
                    <span className="ld-infos-qui">
                      <span className="ld-avatar" aria-hidden="true">
                        {initiale(auteur)}
                      </span>
                      {auteur}
                    </span>
                    <span className="ld-infos-date">{dateHeure(maj)}</span>
                  </div>
                ) : null}
                <div className="ld-infos-pied">
                  <button type="button" onClick={() => setInfos(false)} title={`Créé le ${dateLongue(cree)}`}>
                    <History aria-hidden="true" />
                    {maj ? `Dernière modification le ${dateLongue(maj)}` : `Créé le ${dateLongue(cree)}`}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
          {copierLien ? <Rond libelle="Copier le lien" onClick={copierLien} icone={<Link2 aria-hidden="true" />} /> : null}
          <Rond libelle="Fermer" onClick={fermer} icone={<X aria-hidden="true" />} />
        </div>
      </header>

      {titres.length ? (
        <div className="ld-plan">
          <div className="ld-plan-tirets" aria-hidden="true">
            {titres.map((t) => (
              <span key={t.i} className="ld-plan-tiret" data-niveau={t.niveau} />
            ))}
          </div>
          <nav className="ld-plan-volet" aria-label="Plan">
            {titres.map((t) => (
              <button key={t.i} type="button" data-niveau={t.niveau} onClick={() => allerAuTitre(t.i)}>
                {t.texte}
              </button>
            ))}
          </nav>
        </div>
      ) : null}

      <div className="ld-doc">
        <div className="ld-doc-colonne">
          <div className="ld-doc-haut">
            <button
              type="button"
              className="ld-doc-icone"
              data-favori={favori ? "" : undefined}
              aria-label={favori ? "Retirer des favoris" : "Mettre en favori"}
              title={favori ? "Retirer des favoris" : "Mettre en favori"}
              onClick={basculerFavori}
            >
              <IconeDocument />
            </button>
          </div>
          <input
            ref={champTitre}
            className="ld-titre"
            value={titre}
            placeholder={genre === "note" ? "Nouvelle note" : "Nom du modèle"}
            aria-label={genre === "note" ? "Titre de la note" : "Nom du modèle"}
            onChange={(e) => changer({ titre: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                setEdition(true);
                requestAnimationFrame(() => zone.current?.focus());
              }
            }}
          />
          {props}
          <div className="ld-corps" data-lenis-prevent="">
            {edition ? (
              <textarea
                ref={(el) => {
                  zone.current = el;
                  ajuster(el);
                }}
                className="ld-texte"
                value={texte}
                rows={1}
                placeholder={genre === "note" ? "Commencez à écrire…" : "Écrivez la trame du modèle…"}
                aria-label={genre === "note" ? "Texte de la note" : "Texte du modèle"}
                onChange={(e) => {
                  changer({ texte: e.target.value });
                  ajuster(e.target);
                }}
                onBlur={() => {
                  if (texte.trim()) setEdition(false);
                }}
              />
            ) : (
              <Rendu texte={texte} placeholder={genre === "note" ? "Commencez à écrire…" : "Écrivez la trame du modèle…"} onClick={() => setEdition(true)} />
            )}
            {!texte.trim() && vide ? vide : null}
          </div>
        </div>
      </div>
    </div>
  );
}
