"use client";

/* ══════════════════════════════════════════════════════════════════════
   Notes du pilotage, à la manière d'Attio (10/10/2026)

   Même dessin que les notes de l'espace client (components/espace2/Notes,
   styles notes.css) : onglets Notes / Modèles, « Trié par », grille ou
   liste, Favoris, cartes par période, éditeur en fenêtre.

   Les données sont celles de la base (omega_pages), donc partagées entre
   les appareils de Teo :
     · Stratégie, Manuel et Plan LinkedIn sont des notes de référence ;
     · « Nouvelle note » crée une page « note-… » ;
     · toutes s'écrivent directement dans la page (EditeurRiche, 11/10 :
       « toute la note éditable, c'est du texte ») ;
     · les modèles : trois fournis, plus ceux qu'on crée (« modele-… »).
   Les favoris sont gardés dans ce navigateur.
   ══════════════════════════════════════════════════════════════════════ */

import "@/components/espace2/notes.css";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Dialog, Modal, ModalOverlay } from "react-aria-components";
import { ArrowUpDown, BookMarked, Check, Copy, FileText, LayoutGrid, Link2, List, Maximize2, Minimize2, Minus, MoreHorizontal, NotebookPen, Plus, Star, Trash2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ItemMenu, MenuDeroulant, SeparateurMenu } from "@/components/espace2/ui";
import EditeurRiche from "./EditeurRiche";
import { NOTES_REFERENCE, type PageNote } from "./notes-communes";

const I = { width: 16, height: 16, strokeWidth: 1.6, "aria-hidden": true } as const;
const JOUR = 86_400_000;
const CLE_FAVORIS = "omega.notes.favoris";
const AUTEUR = "Teo";

/* les modèles fournis : toujours là, non supprimables */
const MODELES_FOURNIS: PageNote[] = [
  { slug: "modele-appel", titre: "Compte rendu d'appel", contenu: "Entreprise :\nInterlocuteur :\n\nCe qu'il a dit\n• \n\nObjection entendue\n• \n\nSuite (date)\n• ", maj: "" },
  { slug: "modele-audit", titre: "Compte rendu d'audit", contenu: "Entreprise :\nPrésents :\n\nCe qu'on a mesuré\n• \n\nL'argent trouvé\n• \n\nCe qu'on propose\n• \n\nProchaine étape\n• ", maj: "" },
  { slug: "modele-semaine", titre: "Point de la semaine", contenu: "Appels, échanges, rendez-vous :\n\nCe qui a marché\n• \n\nCe qui bloque\n• \n\nLes trois priorités de la semaine prochaine\n• ", maj: "" },
];

const estReference = (slug: string) => NOTES_REFERENCE.includes(slug);
const estModele = (slug: string) => slug.startsWith("modele-");
const apercu = (t: string) =>
  t
    .replace(/<\?claude[^>]*\?>/g, " ")
    .replace(/[#*_>`|]/g, " ")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/-\s\[[ x]\]/g, "•")
    .replace(/\s+/g, " ")
    .trim();
const dateLongue = (iso: string) => (iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "");
const dateCourte = (iso: string) => (iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) : "");

function lireFavoris(): string[] {
  try {
    return JSON.parse(localStorage.getItem(CLE_FAVORIS) || "[]") as string[];
  } catch {
    return [];
  }
}

type Tri = "maj" | "titre";
type Fenetre = "normale" | "agrandie" | "reduite";

export default function NotesOmega({ pages: initiales }: { pages: PageNote[] }) {
  const [pages, setPages] = useState(initiales);
  const [onglet, setOnglet] = useState<"notes" | "modeles">("notes");
  const [tri, setTri] = useState<Tri>("maj");
  const [vue, setVue] = useState<"grille" | "liste">("grille");
  const [favoris, setFavoris] = useState<string[]>([]);
  const [ouvert, setOuvert] = useState<string | null>(null);
  const [fenetre, setFenetre] = useState<Fenetre>("normale");
  const [etat, setEtat] = useState("");
  const [maintenant] = useState(() => Date.now());
  const router = useRouter();
  const params = useSearchParams();

  // eslint-disable-next-line react-hooks/set-state-in-effect -- les favoris vivent dans le navigateur, lus après le montage
  useEffect(() => setFavoris(lireFavoris()), []);
  const basculerFavori = (slug: string) =>
    setFavoris((f) => {
      const v = f.includes(slug) ? f.filter((x) => x !== slug) : [...f, slug];
      try {
        localStorage.setItem(CLE_FAVORIS, JSON.stringify(v));
      } catch {}
      return v;
    });

  /* lien partagé ou ancienne adresse : /omega/notes?note=manuel ouvre la note */
  const demandee = params.get("note");
  useEffect(() => {
    if (!demandee) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- l'ouverture vient de l'adresse, une seule fois
    setOuvert(demandee);
    setFenetre("normale");
    router.replace("/omega/notes", { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- une seule fois par lien
  }, [demandee]);

  const notes = useMemo(() => pages.filter((p) => !estModele(p.slug)).sort((a, b) => (tri === "titre" ? a.titre.localeCompare(b.titre, "fr") : (b.maj || "").localeCompare(a.maj || ""))), [pages, tri]);
  const modeles = useMemo(() => [...MODELES_FOURNIS.filter((m) => !pages.some((p) => p.slug === m.slug)), ...pages.filter((p) => estModele(p.slug))].sort((a, b) => Number(favoris.includes(b.slug)) - Number(favoris.includes(a.slug)) || a.titre.localeCompare(b.titre, "fr")), [pages, favoris]);
  const tout = [...pages, ...MODELES_FOURNIS.filter((m) => !pages.some((p) => p.slug === m.slug))];
  const courante = ouvert ? tout.find((p) => p.slug === ouvert) : undefined;

  async function enregistrer(slug: string, champs: Partial<PageNote>) {
    const avant = tout.find((p) => p.slug === slug);
    if (!avant) return;
    const suivante = { ...avant, ...champs, maj: new Date().toISOString() };
    setPages((ps) => (ps.some((p) => p.slug === slug) ? ps.map((p) => (p.slug === slug ? suivante : p)) : [...ps, suivante]));
    const { error } = await createClient().from("omega_pages").upsert({ slug, titre: suivante.titre, contenu: suivante.contenu, maj: suivante.maj });
    setEtat(error ? "Échec de l'enregistrement : vérifiez votre connexion." : "");
  }
  async function creer(prefixe: "note" | "modele", depuis?: PageNote) {
    const slug = `${prefixe}-${Math.random().toString(36).slice(2, 10)}`;
    const p: PageNote = { slug, titre: depuis ? (prefixe === "modele" ? depuis.titre : depuis.titre) : "", contenu: depuis?.contenu ?? "", maj: new Date().toISOString() };
    setPages((ps) => [...ps, p]);
    const { error } = await createClient().from("omega_pages").upsert(p);
    if (error) return setEtat("Échec de la création : vérifiez votre connexion.");
    setOnglet(prefixe === "note" ? "notes" : "modeles");
    setFenetre("normale");
    setOuvert(slug);
  }
  async function supprimer(slug: string) {
    if (estReference(slug) || MODELES_FOURNIS.some((m) => m.slug === slug && !pages.some((p) => p.slug === slug))) return;
    if (!window.confirm(estModele(slug) ? "Supprimer ce modèle ?" : "Supprimer cette note ?")) return;
    const { error } = await createClient().from("omega_pages").delete().eq("slug", slug);
    if (error) return setEtat("Échec de la suppression.");
    setPages((ps) => ps.filter((p) => p.slug !== slug));
    if (ouvert === slug) setOuvert(null);
  }

  const favorisNotes = notes.filter((n) => favoris.includes(n.slug));
  const autres = notes.filter((n) => !favoris.includes(n.slug));
  const age = (n: PageNote) => maintenant - Date.parse(n.maj || "1970-01-01");
  const groupes = [
    { titre: "Modifiées cette semaine", liste: autres.filter((n) => age(n) < 7 * JOUR) },
    { titre: "Modifiées ce mois-ci", liste: autres.filter((n) => age(n) >= 7 * JOUR && age(n) < 31 * JOUR) },
    { titre: "Plus anciennes", liste: autres.filter((n) => age(n) >= 31 * JOUR) },
  ].filter((g) => g.liste.length);

  const carte = (n: PageNote) => {
    const fav = favoris.includes(n.slug);
    const outils = (
      <span className="no-outils">
        <button type="button" className="no-etoile" aria-pressed={fav} aria-label={fav ? "Retirer des favoris" : "Mettre en favori"} onClick={() => basculerFavori(n.slug)}>
          <Star width={16} height={16} aria-hidden="true" />
        </button>
        <MenuDeroulant etiquette="Actions de la note" classe="no-icone" declencheur={<MoreHorizontal width={16} height={16} aria-hidden="true" />}>
          <ItemMenu id="dup" icone={<Copy {...I} />} onAction={() => creer("note", { ...n, titre: `${n.titre || "Sans titre"} (copie)` })}>
            Dupliquer
          </ItemMenu>
          {estReference(n.slug) ? null : (
            <ItemMenu id="sup" danger icone={<Trash2 {...I} />} onAction={() => supprimer(n.slug)}>
              Supprimer
            </ItemMenu>
          )}
        </MenuDeroulant>
      </span>
    );
    const etiquette = estReference(n.slug) ? (
      <span className="no-lien-entreprise">
        <BookMarked width={14} height={14} aria-hidden="true" /> <u>Référence</u>
      </span>
    ) : (
      <span className="no-lien-entreprise no-gris">
        <NotebookPen width={14} height={14} aria-hidden="true" /> Note
      </span>
    );
    return vue === "grille" ? (
      <div key={n.slug} className="no-carte">
        <button type="button" className="no-carte-ouvrir" onClick={() => setOuvert(n.slug)} aria-label={`Ouvrir la note ${n.titre || "sans titre"}`} />
        <span className="no-carte-haut">
          {etiquette}
          {outils}
        </span>
        <span className="no-carte-titre">{n.titre || "Sans titre"}</span>
        <span className="no-carte-apercu">{apercu(n.contenu) || "Cette note est vide."}</span>
        <span className="no-carte-pied">
          <span className="no-auteur">
            <span className="no-avatar" aria-hidden="true">
              T
            </span>
            {AUTEUR}
          </span>
          <time dateTime={n.maj}>{dateLongue(n.maj)}</time>
        </span>
      </div>
    ) : (
      <div key={n.slug} className="no-ligne">
        <button type="button" className="no-carte-ouvrir" onClick={() => setOuvert(n.slug)} aria-label={`Ouvrir la note ${n.titre || "sans titre"}`} />
        <span className="no-ligne-titre">
          <strong>{n.titre || "Sans titre"}</strong>
          <span>{apercu(n.contenu) || "Cette note est vide."}</span>
        </span>
        <span className="no-ligne-entreprise">{estReference(n.slug) ? "Référence" : "Note"}</span>
        <span className="no-auteur">
          <span className="no-avatar" aria-hidden="true">
            T
          </span>
          {AUTEUR}
        </span>
        <time dateTime={n.maj}>{dateCourte(n.maj)}</time>
        {outils}
      </div>
    );
  };

  return (
    <div className="v2-page v2-arrivee no-page">
      <h1 className="v2-sr">Notes</h1>
      <div className="no-onglets" role="tablist" aria-label="Notes et modèles">
        <button type="button" role="tab" aria-selected={onglet === "notes"} className="no-onglet" onClick={() => setOnglet("notes")}>
          <NotebookPen {...I} />
          Notes <span className="no-compte">{notes.length}</span>
        </button>
        <button type="button" role="tab" aria-selected={onglet === "modeles"} className="no-onglet" onClick={() => setOnglet("modeles")}>
          <FileText {...I} />
          Modèles <span className="no-compte">{modeles.length}</span>
        </button>
      </div>

      <div className="no-barre">
        {onglet === "notes" ? (
          <MenuDeroulant
            etiquette="Changer le tri"
            classe="no-bouton"
            placement="bottom start"
            largeur={240}
            declencheur={
              <>
                <ArrowUpDown {...I} />
                <span className="no-gris">Trié par</span> {tri === "maj" ? "Dernière modification" : "Titre"}
              </>
            }
          >
            <ItemMenu id="maj" onAction={() => setTri("maj")} suffixe={tri === "maj" ? <Check width={14} height={14} aria-hidden="true" /> : null}>
              Dernière modification
            </ItemMenu>
            <ItemMenu id="titre" onAction={() => setTri("titre")} suffixe={tri === "titre" ? <Check width={14} height={14} aria-hidden="true" /> : null}>
              Titre
            </ItemMenu>
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
              <button type="button" className="no-principal" onClick={() => creer("note")}>
                <Plus {...I} />
                Nouvelle note
              </button>
            </>
          ) : (
            <button type="button" className="no-principal" onClick={() => creer("modele")}>
              <Plus {...I} />
              Nouveau modèle
            </button>
          )}
        </div>
      </div>
      {etat ? (
        <p className="om-etat" role="status">
          {etat}
        </p>
      ) : null}

      {onglet === "notes" ? (
        <>
          <section className="no-section" aria-label="Favoris">
            <h2 className="no-section-titre">Favoris</h2>
            {favorisNotes.length ? (
              <div className={vue === "grille" ? "no-grille" : "no-liste"}>{favorisNotes.map(carte)}</div>
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
              <div className={vue === "grille" ? "no-grille" : "no-liste"}>{g.liste.map(carte)}</div>
            </section>
          ))}
        </>
      ) : (
        <section className="no-section" aria-label="Modèles">
          <div className="no-grille">
            {modeles.map((m) => (
              <div key={m.slug} className="no-carte no-carte--modele">
                <button type="button" className="no-carte-ouvrir" onClick={() => setOuvert(m.slug)} aria-label={`Modifier le modèle ${m.titre || "sans titre"}`} />
                <span className="no-carte-haut">
                  <span className="no-lien-entreprise">
                    <FileText width={14} height={14} aria-hidden="true" /> Modèle
                  </span>
                </span>
                <span className="no-carte-titre">{m.titre || "Sans titre"}</span>
                <span className="no-carte-apercu">{apercu(m.contenu) || "Ce modèle est vide."}</span>
                <span className="no-carte-pied">
                  <button type="button" className="no-lien-action" onClick={() => creer("note", m)}>
                    <Plus width={14} height={14} aria-hidden="true" /> Utiliser
                  </button>
                  <button type="button" className="no-etoile" aria-pressed={favoris.includes(m.slug)} aria-label={favoris.includes(m.slug) ? "Retirer des favoris" : "Mettre en favori"} onClick={() => basculerFavori(m.slug)}>
                    <Star width={16} height={16} aria-hidden="true" />
                  </button>
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ——— l'éditeur, en fenêtre ——— */}
      <ModalOverlay isOpen={!!courante && fenetre !== "reduite"} onOpenChange={(o) => (o ? null : setOuvert(null))} isDismissable className="v2-jetons no-voile">
        <Modal className="no-fenetre" data-agrandie={fenetre === "agrandie" ? "" : undefined}>
          <Dialog className="no-dialogue" aria-label={courante?.titre || "Note sans titre"}>
            {courante ? (
              <Fenetre
                key={courante.slug}
                note={courante}
                fenetre={fenetre}
                setFenetre={setFenetre}
                fermer={() => setOuvert(null)}
                enregistrer={(c) => enregistrer(courante.slug, c)}
                favori={favoris.includes(courante.slug)}
                basculerFavori={() => basculerFavori(courante.slug)}
                dupliquer={() => creer("note", { ...courante, titre: `${courante.titre || "Sans titre"} (copie)` })}
                commeModele={() => creer("modele", courante)}
                utiliser={() => creer("note", courante)}
                supprimer={estReference(courante.slug) ? undefined : () => supprimer(courante.slug)}
                modelesFavoris={modeles.filter((m) => favoris.includes(m.slug))}
                voirModeles={() => {
                  setOuvert(null);
                  setOnglet("modeles");
                }}
                creerModele={() => creer("modele")}
              />
            ) : null}
          </Dialog>
        </Modal>
      </ModalOverlay>

      {courante && fenetre === "reduite" ? (
        <div className="v2-jetons no-reduite">
          <button type="button" className="no-reduite-titre" onClick={() => setFenetre("normale")}>
            <NotebookPen {...I} />
            {courante.titre || "Sans titre"}
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

function Fenetre({
  note,
  fenetre,
  setFenetre,
  fermer,
  enregistrer,
  favori,
  basculerFavori,
  dupliquer,
  commeModele,
  utiliser,
  supprimer,
  modelesFavoris,
  voirModeles,
  creerModele,
}: {
  note: PageNote;
  fenetre: Fenetre;
  setFenetre: (f: Fenetre) => void;
  fermer: () => void;
  enregistrer: (c: Partial<PageNote>) => Promise<void>;
  favori: boolean;
  basculerFavori: () => void;
  dupliquer: () => void;
  commeModele: () => void;
  utiliser: () => void;
  supprimer?: () => void;
  modelesFavoris: PageNote[];
  voirModeles: () => void;
  creerModele: () => void;
}) {
  const modele = estModele(note.slug);
  const [titre, setTitre] = useState(note.titre);
  const [texte, setTexte] = useState(note.contenu);
  /* le texte s'enregistre 0,7 s après la dernière frappe, et à la fermeture */
  const [version, setVersion] = useState(0);
  const enAttente = useRef<string | null>(null);
  const minuteur = useRef<ReturnType<typeof setTimeout> | null>(null);
  const enregistrerRef = useRef(enregistrer);
  useEffect(() => {
    enregistrerRef.current = enregistrer;
  });
  const vider = () => {
    if (minuteur.current) clearTimeout(minuteur.current);
    if (enAttente.current !== null) void enregistrerRef.current({ contenu: enAttente.current });
    enAttente.current = null;
  };
  useEffect(() => vider, []);
  const ecrire = (md: string) => {
    setTexte(md);
    enAttente.current = md;
    if (minuteur.current) clearTimeout(minuteur.current);
    minuteur.current = setTimeout(vider, 700);
  };
  return (
    <>
      <div className="no-fenetre-haut">
        <span className="no-fenetre-nom">
          {modele ? <FileText width={14} height={14} aria-hidden="true" /> : estReference(note.slug) ? <BookMarked width={14} height={14} aria-hidden="true" /> : <NotebookPen width={14} height={14} aria-hidden="true" />}
          {modele ? "Modèle" : estReference(note.slug) ? "Note de référence" : "Note"}
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
          <span className="no-avatar no-avatar--grand" aria-label={`Auteur : ${AUTEUR}`}>
            T
          </span>
          {modele ? null : (
            <button type="button" className="no-lien-copie" onClick={() => void navigator.clipboard?.writeText(`${window.location.origin}/omega/notes?note=${note.slug}`)}>
              <Link2 {...I} />
              Copier le lien
            </button>
          )}
          <MenuDeroulant etiquette="Actions" classe="no-icone" largeur={240} declencheur={<MoreHorizontal {...I} />}>
            <ItemMenu id="fav" icone={<Star {...I} />} onAction={basculerFavori}>
              {favori ? "Retirer des favoris" : "Mettre en favori"}
            </ItemMenu>
            {modele ? (
              <ItemMenu id="use" icone={<Plus {...I} />} onAction={utiliser}>
                Créer une note avec ce modèle
              </ItemMenu>
            ) : (
              <>
                <ItemMenu id="dup" icone={<Copy {...I} />} onAction={dupliquer}>
                  Dupliquer
                </ItemMenu>
                <ItemMenu id="mod" icone={<FileText {...I} />} onAction={commeModele}>
                  Enregistrer comme modèle
                </ItemMenu>
              </>
            )}
            {supprimer ? (
              <>
                <SeparateurMenu />
                <ItemMenu id="sup" danger icone={<Trash2 {...I} />} onAction={supprimer}>
                  Supprimer
                </ItemMenu>
              </>
            ) : null}
          </MenuDeroulant>
        </div>
        <div className="no-feuille">
          <input
            className="no-titre"
            value={titre}
            placeholder={modele ? "Nom du modèle" : "Sans titre"}
            aria-label="Titre"
            autoFocus={!titre}
            onChange={(e) => setTitre(e.target.value)}
            onBlur={() => titre !== note.titre && void enregistrer({ titre: titre.trim() })}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                (e.target as HTMLInputElement).blur();
              }
            }}
          />
          <div className="no-metas">
            <span className="no-meta no-meta--fixe">
              {estReference(note.slug) ? <BookMarked {...I} /> : <NotebookPen {...I} />}
              {note.maj ? `Modifiée le ${dateLongue(note.maj)}` : "Modèle fourni"}
            </span>
          </div>
          <EditeurRiche key={version} markdown={texte} onChange={ecrire} placeholder={modele ? "Écrivez la trame du modèle" : "Commencez à écrire votre note"} etiquette={modele ? "Texte du modèle" : "Texte de la note"} />
          {!texte && !modele ? (
                <div className="no-suggestions">
                  <p className="no-etiquette">Modèles favoris</p>
                  {modelesFavoris.length ? (
                    <ul className="no-actions">
                      {modelesFavoris.map((m) => (
                        <li key={m.slug}>
                          <button
                            type="button"
                            onClick={() => {
                              setTexte(m.contenu);
                              setVersion((v) => v + 1);
                              if (!titre) setTitre(m.titre);
                              void enregistrer({ contenu: m.contenu, titre: titre || m.titre });
                            }}
                          >
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
                      <button type="button" onClick={voirModeles}>
                        <span className="no-actions-icone">
                          <FileText width={14} height={14} aria-hidden="true" />
                        </span>
                        Voir tous les modèles
                      </button>
                    </li>
                    <li>
                      <button type="button" onClick={creerModele}>
                        <span className="no-actions-icone">
                          <Plus width={14} height={14} aria-hidden="true" />
                        </span>
                        Créer un modèle
                      </button>
                    </li>
                  </ul>
                </div>
              ) : null}
        </div>
      </div>
    </>
  );
}
