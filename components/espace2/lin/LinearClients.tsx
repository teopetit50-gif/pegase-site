"use client";

/* ══════════════════════════════════════════════════════════════════════
   Entreprises et Contacts, sur la liste « Projects » de Linear et la page
   d'un projet (28/10/2026, nuit ; relevé : scratchpad/releve-linear-clients.md).

   Le modèle demandé était « Customers » : sur l'espace Linear de Teo, la
   fonction « Customer requests » est désactivée (réglage à off, « No
   customers ») et son activation a été refusée par le garde-fou ; c'est donc
   le repli prévu par le brief, la liste des projets et la page d'un projet.

     · la liste : une fiche par ligne (nom, type, commune, téléphone, nombre
       de contacts, créée le — pour les contacts : nom, entreprise, e-mail,
       téléphone, créé le) ; en tête « + Nouvelle entreprise » ouvre la
       fenêtre de création, comme « New project » ; la barre d'outils porte
       les pastilles de filtre (en place, ?type= / ?entreprise=), la loupe
       (recherche), le filtre et le tri (?tri=) en menus, et le volet Détails
       avec les totaux ;
     · une ligne ouvre la fiche en pleine page (?id=, même route, « ← » par
       le fil d'Ariane) : tuile, titre et résumé, puces de propriétés qui se
       modifient en place, la liste des contacts de l'entreprise (ou
       l'entreprise du contact, en lien), la description, et à droite les
       cartes Propriétés, Contacts, Activité ; « ··· » : copier le lien,
       supprimer.

   Mêmes données qu'avant (../Collection.tsx : espace2-collection-entreprises
   et -contacts, dans le localStorage de cet appareil) ; le lien entre un
   contact et son entreprise est `entreprise_id`, posé quand le nom saisi est
   celui d'une entreprise connue (le texte libre d'avant reste accepté).
   ══════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Bell, Briefcase, Building2, ChevronDown, Copy, Handshake, ListFilter, Mail, MapPin, PanelRight, Pencil, Phone, Plus, Search, SlidersHorizontal, Star, Tag, Trash2, Truck, UserRound, X } from "lucide-react";
import { useToast } from "../Toasts";
import { CarteDroite, MenuActions, MenuOptions, useEpingles, type Option } from "./Lin";
import { IconeCalendrier, IconeGroupe } from "./icones";
import { RACINE } from "../modules";
import { useFiches, type Collection, type Fiche } from "./annuaire";
import "./linear-clients.css";

/* ——— les données : les mêmes clés que la page d'avant ——— */
const CHEMINS: Record<Collection, string> = { entreprises: `${RACINE}/entreprises`, contacts: `${RACINE}/contacts` };
const texte = (v: string | boolean | undefined) => (typeof v === "string" ? v.trim() : "");
const sansAccents = (x: string) => x.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? "s" : ""}`;
/* une date calendaire (« 2026-10-21 ») se lit en UTC : le même jour partout */
const dateCourte = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: /^\d{4}-\d{2}-\d{2}$/.test(iso) ? "UTC" : undefined });
};
const dateLongue = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
};
const initiales = (nom: string) =>
  nom
    .split(/[\s-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((m) => m[0]?.toUpperCase() ?? "")
    .join("") || "?";

/* ——— le type d'une entreprise : le texte libre d'avant, rangé dans quatre familles ——— */
type TypeCle = "client" | "fournisseur" | "partenaire" | "autre";
const TYPES: { cle: TypeCle; libelle: string; icone: React.ReactNode }[] = [
  { cle: "client", libelle: "Client", icone: <Briefcase aria-hidden="true" /> },
  { cle: "fournisseur", libelle: "Fournisseur", icone: <Truck aria-hidden="true" /> },
  { cle: "partenaire", libelle: "Partenaire", icone: <Handshake aria-hidden="true" /> },
  { cle: "autre", libelle: "Autre", icone: <Tag aria-hidden="true" /> },
];
function typeDe(f: Fiche): { cle: TypeCle | null; libelle: string; icone: React.ReactNode } {
  const t = sansAccents(texte(f.type));
  if (!t) return { cle: null, libelle: "Sans type", icone: <Tag aria-hidden="true" /> };
  const connu = TYPES.find((x) => t.includes(x.cle));
  if (connu) return connu;
  return { cle: "autre", libelle: texte(f.type), icone: <Tag aria-hidden="true" /> };
}

/* l'entreprise d'un contact : par son identifiant, sinon par son nom (le texte libre d'avant) */
const entrepriseDe = (c: Fiche, entreprises: Fiche[]) =>
  entreprises.find((e) => e.id === c.entreprise_id) ?? entreprises.find((e) => sansAccents(texte(e.nom)) === sansAccents(texte(c.entreprise)) && texte(c.entreprise)) ?? null;
const contactsDe = (e: Fiche, contacts: Fiche[]) => contacts.filter((c) => c.entreprise_id === e.id || (!c.entreprise_id && texte(c.entreprise) && sansAccents(texte(c.entreprise)) === sansAccents(texte(e.nom))));

/* ——— les tris (« Options d'affichage »), lus dans l'adresse (?tri=) ——— */
type Tri = { cle: string; libelle: string; ordre: (a: Fiche, b: Fiche) => number };
const parNom = (a: Fiche, b: Fiche) => texte(a.nom).localeCompare(texte(b.nom), "fr");
const parDate = (a: Fiche, b: Fiche) => b.cree.localeCompare(a.cree);
const TRIS: Record<Collection, Tri[]> = {
  entreprises: [
    { cle: "recent", libelle: "Les plus récentes", ordre: parDate },
    { cle: "nom", libelle: "Nom", ordre: parNom },
    { cle: "ville", libelle: "Commune", ordre: (a, b) => texte(a.ville).localeCompare(texte(b.ville), "fr") || parNom(a, b) },
  ],
  contacts: [
    { cle: "recent", libelle: "Les plus récents", ordre: parDate },
    { cle: "nom", libelle: "Nom", ordre: parNom },
    { cle: "entreprise", libelle: "Entreprise", ordre: (a, b) => texte(a.entreprise).localeCompare(texte(b.entreprise), "fr") || parNom(a, b) },
  ],
};

/* ═══════════════════════ les deux pages ═══════════════════════ */
export function Entreprises() {
  return <PageCollection collection="entreprises" />;
}
export function Contacts() {
  return <PageCollection collection="contacts" />;
}

function PageCollection({ collection }: { collection: Collection }) {
  const params = useSearchParams();
  const [entreprises, majEntreprises] = useFiches("entreprises");
  const [contacts, majContacts] = useFiches("contacts");
  const id = params.get("id");
  const donnees = { entreprises, contacts, majEntreprises, majContacts };
  if (id) return <FichePage collection={collection} id={id} onglet={params.get("onglet")} {...donnees} />;
  return (
    <Liste
      collection={collection}
      filtre={params.get(collection === "entreprises" ? "type" : "entreprise")}
      tri={params.get("tri")}
      nouveau={params.get("nouveau") !== null}
      prerempli={params.get("entreprise")}
      {...donnees}
    />
  );
}

type Donnees = { entreprises: Fiche[] | null; contacts: Fiche[] | null; majEntreprises: (f: Fiche[]) => void; majContacts: (f: Fiche[]) => void };

/* ═══════════════════════ la liste ═══════════════════════ */
const SEUIL = 10;
function Liste({
  collection,
  filtre,
  tri,
  nouveau,
  prerempli,
  entreprises,
  contacts,
  majEntreprises,
  majContacts,
}: { collection: Collection; filtre: string | null; tri: string | null; nouveau: boolean; prerempli: string | null } & Donnees) {
  const routeur = useRouter();
  const toast = useToast();
  const chemin = CHEMINS[collection];
  const fiches = collection === "entreprises" ? entreprises : contacts;
  const maj = collection === "entreprises" ? majEntreprises : majContacts;
  const [q, setQ] = useState("");
  const [chercher, setChercher] = useState(false);
  const [details, setDetails] = useState(false);
  const [creer, setCreer] = useState(false);
  const champ = useRef<HTMLInputElement>(null);
  const tris = TRIS[collection];
  const triActif = tris.find((t) => t.cle === tri) ?? tris[0];
  const [tout, setTout] = useState(false);

  /* l'adresse porte le filtre et le tri : un menu change la page en place */
  const aller = (f: string | null, t: string | null) => {
    const p = new URLSearchParams();
    if (f) p.set(collection === "entreprises" ? "type" : "entreprise", f);
    if (t && t !== tris[0].cle) p.set("tri", t);
    routeur.replace(p.size ? `${chemin}?${p}` : chemin, { scroll: false });
  };

  const entrepriseFiltre = collection === "contacts" && filtre ? ((entreprises ?? []).find((e) => e.id === filtre) ?? null) : null;
  const visibles = useMemo(() => {
    const r = sansAccents(q);
    return (fiches ?? [])
      .filter((f) => {
        if (collection === "entreprises") {
          if (filtre && typeDe(f).cle !== filtre) return false;
          return !r || [f.nom, f.type, f.ville, f.telephone].some((v) => sansAccents(texte(v)).includes(r));
        }
        if (entrepriseFiltre && entrepriseDe(f, entreprises ?? [])?.id !== entrepriseFiltre.id) return false;
        return !r || [f.nom, f.entreprise, f.email, f.telephone].some((v) => sansAccents(texte(v)).includes(r));
      })
      .sort(triActif.ordre);
  }, [fiches, q, filtre, collection, entrepriseFiltre, entreprises, triActif]);
  /* 29/10 — au-delà de SEUIL fiches, la liste s'arrête sous un fondu et un
     « Voir plus » : quarante lignes alignées, on n'en lit aucune */
  const caches = visibles.length - SEUIL;
  const affichees = tout || caches <= 0 ? visibles : visibles.slice(0, SEUIL);

  const titre = collection === "entreprises" ? "Entreprises" : "Contacts";
  const une = collection === "entreprises" ? "Nouvelle entreprise" : "Nouveau contact";
  const comptes = collection === "entreprises" ? TYPES.map((t) => ({ ...t, n: (fiches ?? []).filter((f) => typeDe(f).cle === t.cle).length })).filter((t) => t.n > 0) : [];

  const optionsFiltre: Option[] =
    collection === "entreprises"
      ? [
          ...TYPES.map((t) => ({
            cle: t.cle,
            libelle: t.libelle,
            icone: t.icone,
            meta: String((fiches ?? []).filter((f) => typeDe(f).cle === t.cle).length),
            coche: filtre === t.cle,
            action: () => aller(filtre === t.cle ? null : t.cle, tri),
          })),
          ...(filtre ? [{ cle: "toutes", libelle: "Toutes les entreprises", icone: <Building2 aria-hidden="true" />, meta: String((fiches ?? []).length), action: () => aller(null, tri) }] : []),
        ]
      : [
          ...(entreprises ?? []).map((e) => ({
            cle: e.id,
            libelle: texte(e.nom),
            icone: <Building2 aria-hidden="true" />,
            meta: String(contactsDe(e, contacts ?? []).length),
            coche: filtre === e.id,
            action: () => aller(filtre === e.id ? null : e.id, tri),
          })),
          ...(filtre ? [{ cle: "tous", libelle: "Tous les contacts", icone: <UserRound aria-hidden="true" />, meta: String((fiches ?? []).length), action: () => aller(null, tri) }] : []),
        ];
  const optionsTri: Option[] = tris.map((t) => ({ cle: t.cle, libelle: `Trier par ${t.libelle.toLowerCase()}`, coche: t.cle === triActif.cle, action: () => aller(filtre, t.cle) }));

  const ouvrir = (f: Fiche) => routeur.push(`${chemin}?id=${f.id}`, { scroll: false });
  const changerType = (f: Fiche, t: TypeCle) => {
    maj((fiches ?? []).map((x) => (x.id === f.id ? { ...x, type: TYPES.find((y) => y.cle === t)!.libelle } : x)));
    toast("Enregistré", "vert");
  };
  const fermerCreation = () => {
    setCreer(false);
    if (nouveau) aller(filtre, tri);
  };

  return (
    <div className={`lin lcl lcl--${collection}`}>
      <h1 className="v2-sr">{titre}</h1>
      <header className="lin-tete">
        <span className="lin-tete-titre">{titre}</span>
        <div className="lin-tete-droite">
          <button type="button" className="lin-btn lin-btn--texte" onClick={() => setCreer(true)}>
            <Plus width={14} height={14} aria-hidden="true" />
            <span>{une}</span>
          </button>
        </div>
      </header>

      <div className="lin-outils">
        <nav className="lin-onglets" aria-label="Filtres">
          <Link href={tri && tri !== tris[0].cle ? `${chemin}?tri=${tri}` : chemin} className="lin-onglet" data-actif={!filtre ? "" : undefined} aria-current={!filtre ? "page" : undefined} replace scroll={false}>
            {collection === "entreprises" ? "Toutes les entreprises" : "Tous les contacts"}
          </Link>
          {comptes.map((t) => (
            <Link
              key={t.cle}
              href={`${chemin}?type=${t.cle}${tri && tri !== tris[0].cle ? `&tri=${tri}` : ""}`}
              className="lin-onglet"
              data-actif={filtre === t.cle ? "" : undefined}
              aria-current={filtre === t.cle ? "page" : undefined}
              replace
              scroll={false}
            >
              {t.libelle}
            </Link>
          ))}
          {entrepriseFiltre ? (
            <Link href={chemin} className="lin-onglet lin-filtre-actif" data-actif="" title="Retirer ce filtre" replace scroll={false}>
              {texte(entrepriseFiltre.nom)} ✕
            </Link>
          ) : null}
        </nav>
        <div className="lin-outils-droite">
          {chercher ? (
            <label className="lcl-recherche">
              <Search aria-hidden="true" />
              <input
                ref={champ}
                autoFocus
                value={q}
                placeholder={collection === "entreprises" ? "Rechercher une entreprise…" : "Rechercher un contact…"}
                aria-label={`Rechercher : ${titre}`}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setQ("");
                    setChercher(false);
                  }
                }}
              />
            </label>
          ) : (
            <button type="button" className="lin-rond" aria-label="Rechercher" title="Rechercher" onClick={() => setChercher(true)}>
              <Search aria-hidden="true" />
            </button>
          )}
          <MenuOptions rond declencheur={<ListFilter aria-hidden="true" />} libelle="Filtrer" titre="Filtrer…" options={optionsFiltre} aDroite raccourci="f" />
          <MenuOptions rond declencheur={<SlidersHorizontal aria-hidden="true" />} libelle="Options d'affichage" titre="Trier…" options={optionsTri} aDroite />
          <button type="button" className="lin-rond" aria-label="Ouvrir le volet Détails" title="Détails" aria-pressed={details} onClick={() => setDetails((v) => !v)}>
            <PanelRight aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="lin-corps" data-details={details ? "" : undefined}>
        <div className="lin-liste">
          <div className="lcl-table" role="table" aria-label={titre}>
            {collection === "entreprises" ? (
              <div className="lcl-tete" role="row">
                <span role="columnheader" aria-hidden="true" />
                <span role="columnheader" aria-hidden="true" />
                <span role="columnheader" className="lcl-col-nom">
                  Nom
                </span>
                <span role="columnheader">Type</span>
                <span role="columnheader">Commune</span>
                <span role="columnheader">Téléphone</span>
                <span role="columnheader">Contacts</span>
                <span role="columnheader" className="lcl-col-date">
                  Créée le
                </span>
                <span role="columnheader" aria-hidden="true" />
              </div>
            ) : (
              <div className="lcl-tete" role="row">
                <span role="columnheader" aria-hidden="true" />
                <span role="columnheader" aria-hidden="true" />
                <span role="columnheader" className="lcl-col-nom">
                  Nom
                </span>
                <span role="columnheader">Entreprise</span>
                <span role="columnheader">E-mail</span>
                <span role="columnheader">Téléphone</span>
                <span role="columnheader" className="lcl-col-date">
                  Créé le
                </span>
                <span role="columnheader" aria-hidden="true" />
              </div>
            )}
            {fiches === null ? null : visibles.length === 0 ? (
              <p className="lcl-vide">
                {q || filtre ? (
                  "Rien ne correspond."
                ) : (
                  <>
                    <b>{collection === "entreprises" ? "Aucune entreprise pour l'instant." : "Aucun contact pour l'instant."}</b>
                    {collection === "entreprises" ? "Vos clients, fournisseurs et partenaires, avec leurs coordonnées." : "Les personnes à qui vous parlez, et l'entreprise où elles travaillent."}
                  </>
                )}
              </p>
            ) : collection === "entreprises" ? (
              affichees.map((f) => {
                const t = typeDe(f);
                const n = contactsDe(f, contacts ?? []).length;
                return (
                  <div
                    key={f.id}
                    className="lcl-ligne"
                    role="row"
                    tabIndex={0}
                    aria-label={`Ouvrir ${texte(f.nom) || "la fiche"}`}
                    onClick={() => ouvrir(f)}
                    onKeyDown={(e) => e.key === "Enter" && e.target === e.currentTarget && ouvrir(f)}
                  >
                    <span role="cell" aria-hidden="true" />
                    <span role="cell">
                      <span className="lcl-case" aria-hidden="true" />
                    </span>
                    <span role="cell" className="lcl-nom lcl-col-nom">
                      <span className="lcl-icone">
                        <Building2 aria-hidden="true" />
                      </span>
                      <span className="lcl-titre">{texte(f.nom) || "Sans nom"}</span>
                    </span>
                    <span role="cell" onClick={(e) => (e.preventDefault(), e.stopPropagation())}>
                      <MenuOptions
                        plat
                        aDroite
                        libelle={`Type : ${t.libelle}`}
                        titre="Changer le type…"
                        declencheur={
                          <>
                            {t.icone}
                            <span className="lcl-type-texte" title={t.libelle}>{t.libelle}</span>
                          </>
                        }
                        options={TYPES.map((x) => ({ cle: x.cle, libelle: x.libelle, icone: x.icone, coche: t.cle === x.cle, action: () => changerType(f, x.cle) }))}
                      />
                    </span>
                    <span role="cell">
                      <span className={texte(f.ville) ? "lcl-valeur" : "lcl-valeur lcl-valeur--vide"}>
                        <MapPin aria-hidden="true" />
                        <span>{texte(f.ville) || "—"}</span>
                      </span>
                    </span>
                    <span role="cell">
                      <span className={texte(f.telephone) ? "lcl-valeur" : "lcl-valeur lcl-valeur--vide"}>
                        <Phone aria-hidden="true" />
                        <span>{texte(f.telephone) || "—"}</span>
                      </span>
                    </span>
                    <span role="cell" className="lcl-num">
                      <span className="lcl-compte" aria-label={pluriel(n, "contact")}>
                        {n}
                      </span>
                    </span>
                    <span role="cell" className="lcl-col-date">
                      <span className="lcl-valeur">
                        <IconeCalendrier />
                        <span>{dateCourte(f.cree)}</span>
                      </span>
                    </span>
                    <span role="cell" aria-hidden="true" />
                  </div>
                );
              })
            ) : (
              affichees.map((f) => {
                const e = entrepriseDe(f, entreprises ?? []);
                return (
                  <div
                    key={f.id}
                    className="lcl-ligne"
                    role="row"
                    tabIndex={0}
                    aria-label={`Ouvrir ${texte(f.nom) || "la fiche"}`}
                    onClick={() => ouvrir(f)}
                    onKeyDown={(ev) => ev.key === "Enter" && ev.target === ev.currentTarget && ouvrir(f)}
                  >
                    <span role="cell" aria-hidden="true" />
                    <span role="cell">
                      <span className="lcl-case" aria-hidden="true" />
                    </span>
                    <span role="cell" className="lcl-nom lcl-col-nom">
                      <span className="lcl-icone">
                        <span className="lcl-avatar" aria-hidden="true">
                          {initiales(texte(f.nom))}
                        </span>
                      </span>
                      <span className="lcl-titre">{texte(f.nom) || "Sans nom"}</span>
                    </span>
                    <span role="cell">
                      {e ? (
                        <Link href={`${CHEMINS.entreprises}?id=${e.id}`} className="lcl-valeur lcl-valeur--lien" onClick={(ev) => ev.stopPropagation()} scroll={false}>
                          <Building2 aria-hidden="true" />
                          <span>{texte(e.nom)}</span>
                        </Link>
                      ) : (
                        <span className={texte(f.entreprise) ? "lcl-valeur" : "lcl-valeur lcl-valeur--vide"}>
                          <Building2 aria-hidden="true" />
                          <span>{texte(f.entreprise) || "—"}</span>
                        </span>
                      )}
                    </span>
                    <span role="cell">
                      <span className={texte(f.email) ? "lcl-valeur" : "lcl-valeur lcl-valeur--vide"}>
                        <Mail aria-hidden="true" />
                        <span>{texte(f.email) || "—"}</span>
                      </span>
                    </span>
                    <span role="cell">
                      <span className={texte(f.telephone) ? "lcl-valeur" : "lcl-valeur lcl-valeur--vide"}>
                        <Phone aria-hidden="true" />
                        <span>{texte(f.telephone) || "—"}</span>
                      </span>
                    </span>
                    <span role="cell" className="lcl-col-date">
                      <span className="lcl-valeur">
                        <IconeCalendrier />
                        <span>{dateCourte(f.cree)}</span>
                      </span>
                    </span>
                    <span role="cell" aria-hidden="true" />
                  </div>
                );
              })
            )}
          </div>
          {caches > 0 ? (
            <div className="lcl-suite" data-ouvert={tout ? "" : undefined}>
              <button type="button" className="lcl-suite-btn" aria-expanded={tout} onClick={() => setTout((v) => !v)}>
                {tout ? "Voir moins" : `Voir plus · ${caches}`}
                <ChevronDown aria-hidden="true" />
              </button>
            </div>
          ) : null}
        </div>

        {details ? (
          <aside className="lin-details" aria-label="Détails">
            <div className="lin-details-onglets" role="tablist">
              <button type="button" role="tab" className="lin-details-onglet" aria-selected="true">
                Résumé
              </button>
            </div>
            <ul className="lin-details-lignes">
              <li>
                <span>{collection === "entreprises" ? "Entreprises" : "Contacts"}</span>
                <span className="lin-details-valeur">{(fiches ?? []).length}</span>
              </li>
              {collection === "entreprises"
                ? comptes.map((t) => (
                    <li key={t.cle}>
                      <span>{t.libelle}</span>
                      <span className="lin-details-valeur">{t.n}</span>
                    </li>
                  ))
                : (entreprises ?? [])
                    .map((e) => ({ e, n: contactsDe(e, contacts ?? []).length }))
                    .filter((x) => x.n > 0)
                    .map(({ e, n }) => (
                      <li key={e.id}>
                        <span>{texte(e.nom)}</span>
                        <span className="lin-details-valeur">{n}</span>
                      </li>
                    ))}
              {q || filtre ? (
                <li>
                  <span>Affichés</span>
                  <span className="lin-details-valeur">{visibles.length}</span>
                </li>
              ) : null}
            </ul>
            <p className="lcl-details-note">Fiches gardées sur cet appareil : vos collègues ne les voient pas encore.</p>
          </aside>
        ) : null}
      </div>

      {(creer || nouveau) && entreprises !== null && fiches !== null ? (
        <Creation
          collection={collection}
          entreprises={entreprises ?? []}
          prerempli={prerempli}
          fermer={fermerCreation}
          creer={(f) => (maj([f, ...(fiches ?? [])]), toast("Enregistré", "vert"), fermerCreation(), ouvrir(f))}
        />
      ) : null}
    </div>
  );
}

/* ═══════════════════════ la fenêtre de création (« New project ») ═══════════════════════ */
function Creation({ collection, entreprises, prerempli, fermer, creer }: { collection: Collection; entreprises: Fiche[]; prerempli: string | null; fermer: () => void; creer: (f: Fiche) => void }) {
  const [type, setType] = useState<TypeCle | null>(null);
  const [entrepriseId, setEntrepriseId] = useState<string | null>(prerempli);
  const [nom, setNom] = useState("");
  const entreprisePre = entreprises.find((e) => e.id === entrepriseId) ?? null;
  const [entrepriseNom, setEntrepriseNom] = useState(entreprisePre ? texte(entreprisePre.nom) : "");
  useEffect(() => {
    const touche = (e: KeyboardEvent) => {
      if (e.key === "Escape") fermer();
    };
    document.addEventListener("keydown", touche);
    return () => document.removeEventListener("keydown", touche);
  }, [fermer]);

  const envoyer = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    const v = (k: string) => d.get(k)?.toString().trim() ?? "";
    const fiche: Fiche = { id: crypto.randomUUID(), cree: new Date().toISOString(), nom: v("nom"), telephone: v("telephone"), notes: v("notes") };
    if (collection === "entreprises") {
      fiche.type = type ? TYPES.find((t) => t.cle === type)!.libelle : v("type_libre");
      fiche.ville = v("ville");
    } else {
      const choisie = entreprises.find((x) => x.id === entrepriseId) ?? entreprises.find((x) => sansAccents(texte(x.nom)) === sansAccents(entrepriseNom) && entrepriseNom) ?? null;
      fiche.entreprise = choisie ? texte(choisie.nom) : entrepriseNom;
      if (choisie) fiche.entreprise_id = choisie.id;
      fiche.email = v("email");
    }
    creer(fiche);
  };
  const t = type ? TYPES.find((x) => x.cle === type)! : null;
  const estEntreprise = collection === "entreprises";
  return (
    <div className="lcl-voile" onMouseDown={(e) => e.target === e.currentTarget && fermer()}>
      <div className="lcl-modale" role="dialog" aria-modal="true" aria-labelledby="lcl-creation-titre">
        <div className="lcl-modale-tete">
          <span className="lcl-modale-equipe">
            {estEntreprise ? <Building2 aria-hidden="true" /> : <UserRound aria-hidden="true" />}
            {estEntreprise ? "Entreprises" : "Contacts"}
          </span>
          <span className="lin-fil-sep" aria-hidden="true">
            ›
          </span>
          <span className="lcl-modale-ici" id="lcl-creation-titre">
            {estEntreprise ? "Nouvelle entreprise" : "Nouveau contact"}
          </span>
          <button type="button" className="lin-rond" aria-label="Fermer" onClick={fermer}>
            <X aria-hidden="true" />
          </button>
        </div>
        <form id="lcl-creation" onSubmit={envoyer} className="lcl-modale-corps">
          <span className="lcl-modale-tuile" aria-hidden="true">
            {estEntreprise ? <Building2 /> : <span className="lcl-avatar lcl-avatar--grand">{initiales(nom)}</span>}
          </span>
          <input
            className="lcl-modale-nom"
            name="nom"
            required
            autoFocus
            autoComplete="off"
            placeholder={estEntreprise ? "Nom de l'entreprise" : "Prénom et nom"}
            aria-label="Nom"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
          />
          <input
            className="lcl-modale-resume"
            name={estEntreprise ? "type_libre" : "email"}
            type={estEntreprise ? "text" : "email"}
            autoComplete="off"
            placeholder={estEntreprise ? "Un mot sur elle : client, fournisseur, partenaire…" : "Adresse e-mail"}
            aria-label={estEntreprise ? "Type (texte libre)" : "E-mail"}
          />
          <div className="lcl-modale-puces">
            {estEntreprise ? (
              <MenuOptions
                libelle="Type"
                titre="Changer le type…"
                aDroite
                declencheur={
                  <>
                    {t ? t.icone : <Tag aria-hidden="true" />}
                    {t ? t.libelle : "Type"}
                  </>
                }
                options={TYPES.map((x) => ({ cle: x.cle, libelle: x.libelle, icone: x.icone, coche: type === x.cle, action: () => setType(x.cle) }))}
              />
            ) : (
              <>
                <label className="lcl-chip">
                  <Building2 aria-hidden="true" />
                  <input
                    list="lcl-entreprises"
                    name="entreprise"
                    autoComplete="off"
                    placeholder="Entreprise"
                    aria-label="Entreprise"
                    value={entrepriseNom}
                    onChange={(e) => {
                      setEntrepriseNom(e.target.value);
                      setEntrepriseId(null);
                    }}
                  />
                  <datalist id="lcl-entreprises">
                    {entreprises.map((e) => (
                      <option key={e.id} value={texte(e.nom)} />
                    ))}
                  </datalist>
                </label>
              </>
            )}
            {estEntreprise ? (
              <label className="lcl-chip">
                <MapPin aria-hidden="true" />
                <input name="ville" autoComplete="off" placeholder="Commune" aria-label="Commune" />
              </label>
            ) : null}
            <label className="lcl-chip">
              <Phone aria-hidden="true" />
              <input name="telephone" type="tel" autoComplete="off" placeholder="Téléphone" aria-label="Téléphone" />
            </label>
          </div>
          <div className="lcl-modale-desc">
            <textarea className="lcl-desc" name="notes" placeholder={estEntreprise ? "Une description, des consignes, ce qu'il faut savoir…" : "Son rôle, ce qu'il faut savoir…"} aria-label="Description" />
          </div>
        </form>
        <div className="lcl-modale-pied">
          <p className="lcl-modale-note">Enregistré sur cet appareil.</p>
          <button type="button" className="lcl-btn-fantome" onClick={fermer}>
            Annuler
          </button>
          <button type="submit" form="lcl-creation" className="lcl-btn-plein">
            {estEntreprise ? "Créer l'entreprise" : "Créer le contact"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════ la fiche en pleine page (« page d'un projet ») ═══════════════════════ */
function FichePage({ collection, id, onglet, entreprises, contacts, majEntreprises, majContacts }: { collection: Collection; id: string; onglet: string | null } & Donnees) {
  const routeur = useRouter();
  const toast = useToast();
  const chemin = CHEMINS[collection];
  const fiches = collection === "entreprises" ? entreprises : contacts;
  const maj = collection === "entreprises" ? majEntreprises : majContacts;
  const fiche = (fiches ?? []).find((f) => f.id === id) ?? null;
  const [epingles, basculerEpingle] = useEpingles(`lcl-${collection}`);
  const [cartes, setCartes] = useState(true);
  const [supprimer, setSupprimer] = useState(false);
  const estEntreprise = collection === "entreprises";
  const titre = estEntreprise ? "Entreprises" : "Contacts";

  const poser = (champs: Partial<Fiche>) => {
    if (!fiche) return;
    maj((fiches ?? []).map((x) => (x.id === fiche.id ? { ...x, ...champs } : x)));
    toast("Enregistré", "vert");
  };
  const effacer = () => {
    if (!fiche) return;
    maj((fiches ?? []).filter((x) => x.id !== fiche.id));
    toast("Supprimé");
    routeur.replace(chemin, { scroll: false });
  };
  const copierLien = () => {
    navigator.clipboard?.writeText(`${location.origin}${chemin}?id=${id}`).then(
      () => toast("Lien copié", "vert"),
      () => toast("Impossible de copier le lien", "rouge"),
    );
  };

  if (fiches === null) return <div className="lin lcl" />;
  if (!fiche)
    return (
      <div className="lin lcl">
        <header className="lin-tete">
          <nav className="lin-fil" aria-label="Fil d'Ariane">
            <Link href={chemin} className="lin-fil-lien">
              {titre}
            </Link>
            <span className="lin-fil-sep" aria-hidden="true">
              ›
            </span>
            <span className="lin-fil-ici" aria-current="page">
              Introuvable
            </span>
          </nav>
        </header>
        <p className="lcl-vide">
          <b>Cette fiche n&apos;existe plus sur cet appareil.</b>
          <Link href={chemin}>Revenir à la liste</Link>
        </p>
      </div>
    );

  const t = typeDe(fiche);
  const nom = texte(fiche.nom) || "Sans nom";
  const entreprise = estEntreprise ? null : entrepriseDe(fiche, entreprises ?? []);
  const lies = estEntreprise ? contactsDe(fiche, contacts ?? []) : [];
  const resume = estEntreprise
    ? [t.cle ? t.libelle : null, texte(fiche.ville) || null].filter(Boolean).join(" · ")
    : [entreprise ? texte(entreprise.nom) : texte(fiche.entreprise) || null, texte(fiche.email) || null].filter(Boolean).join(" · ");
  const ongletActif = onglet === "contacts" && estEntreprise ? "contacts" : "apercu";
  const actions: Option[] = [
    { cle: "copier", libelle: "Copier le lien", icone: <Copy aria-hidden="true" />, action: copierLien },
    ...(estEntreprise ? [{ cle: "contact", libelle: "Ajouter un contact", icone: <Plus aria-hidden="true" />, href: `${CHEMINS.contacts}?nouveau&entreprise=${fiche.id}` }] : []),
    { cle: "supprimer", libelle: "Supprimer…", icone: <Trash2 aria-hidden="true" />, action: () => setSupprimer(true) },
  ];

  return (
    <div className={`lin lcl lcl--${collection}`}>
      <h1 className="v2-sr">{nom}</h1>
      <header className="lin-tete">
        <nav className="lin-fil" aria-label="Fil d'Ariane">
          <Link href={chemin} className="lin-fil-lien" scroll={false}>
            {titre}
          </Link>
          <span className="lin-fil-sep" aria-hidden="true">
            ›
          </span>
          <span className="lin-fil-ici lcl-fil-nom" aria-current="page">
            {estEntreprise ? (
              <Building2 aria-hidden="true" />
            ) : (
              <span className="lcl-avatar" aria-hidden="true">
                {initiales(nom)}
              </span>
            )}
            {nom}
          </span>
        </nav>
        <button
          type="button"
          className="lin-rond"
          aria-label={epingles.has(fiche.id) ? "Retirer des favoris" : "Ajouter aux favoris"}
          aria-pressed={epingles.has(fiche.id)}
          data-actif={epingles.has(fiche.id) ? "" : undefined}
          onClick={() => basculerEpingle(fiche.id)}
        >
          <Star aria-hidden="true" fill={epingles.has(fiche.id) ? "currentColor" : "none"} />
        </button>
        <MenuActions rond aGauche titre="Actions" options={actions} />
        <div className="lin-tete-ronds">
          <button type="button" className="lin-rond" aria-label="Copier le lien de la page" title="Copier le lien" onClick={copierLien}>
            <Copy aria-hidden="true" />
          </button>
          <button type="button" className="lin-rond" aria-label="Notifications (bientôt)" title="Notifications" disabled>
            <Bell aria-hidden="true" />
          </button>
        </div>
      </header>

      <div className="lin-outils">
        <nav className="lin-onglets" aria-label="Vues">
          <Link href={`${chemin}?id=${id}`} className="lin-onglet" data-actif={ongletActif === "apercu" ? "" : undefined} aria-current={ongletActif === "apercu" ? "page" : undefined} replace scroll={false}>
            Aperçu
          </Link>
          {estEntreprise ? (
            <Link
              href={`${chemin}?id=${id}&onglet=contacts`}
              className="lin-onglet"
              data-actif={ongletActif === "contacts" ? "" : undefined}
              aria-current={ongletActif === "contacts" ? "page" : undefined}
              replace
              scroll={false}
            >
              Contacts
            </Link>
          ) : null}
        </nav>
        <div className="lin-outils-droite">
          <button type="button" className="lin-rond" aria-label={cartes ? "Fermer le volet" : "Ouvrir le volet"} title="Volet" aria-pressed={cartes} onClick={() => setCartes((v) => !v)}>
            <PanelRight aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="lin-projet">
        <div className="lin-projet-texte">
          <span className={estEntreprise ? "lin-tuile lcl-tuile" : "lin-tuile lcl-tuile lcl-tuile--contact"} aria-hidden="true">
            {estEntreprise ? <Building2 /> : <span className="lcl-avatar lcl-avatar--grand">{initiales(nom)}</span>}
          </span>
          <TitreModifiable valeur={texte(fiche.nom)} poser={(v) => poser({ nom: v })} />
          <p className="lin-projet-resume">{resume || (estEntreprise ? "Ni type ni commune pour l'instant." : "Ni entreprise ni e-mail pour l'instant.")}</p>

          {ongletActif === "contacts" ? (
            <>
              <h2 className="lin-projet-h2">{pluriel(lies.length, "contact")}</h2>
              <ListeContacts lies={lies} />
              <Link href={`${CHEMINS.contacts}?nouveau&entreprise=${fiche.id}`} className="lcl-plus" scroll={false}>
                <Plus aria-hidden="true" /> Contact
              </Link>
            </>
          ) : (
            <>
              <div className="lin-projet-ligne">
                <span className="lin-projet-etiquette">Propriétés</span>
                {estEntreprise ? (
                  <MenuOptions
                    libelle={`Type : ${t.libelle}`}
                    titre="Changer le type…"
                    aDroite
                    declencheur={
                      <>
                        {t.icone}
                        {t.cle ? t.libelle : "Type"}
                      </>
                    }
                    options={TYPES.map((x) => ({ cle: x.cle, libelle: x.libelle, icone: x.icone, coche: t.cle === x.cle, action: () => poser({ type: x.libelle }) }))}
                  />
                ) : (
                  <PuceEntreprise fiche={fiche} entreprise={entreprise} entreprises={entreprises ?? []} poser={poser} />
                )}
                {estEntreprise ? (
                  <PuceModifiable icone={<MapPin aria-hidden="true" />} valeur={texte(fiche.ville)} vide="Commune" libelle="Commune" poser={(v) => poser({ ville: v })} />
                ) : (
                  <PuceModifiable icone={<Mail aria-hidden="true" />} valeur={texte(fiche.email)} vide="E-mail" libelle="E-mail" type="email" poser={(v) => poser({ email: v })} />
                )}
                <PuceModifiable icone={<Phone aria-hidden="true" />} valeur={texte(fiche.telephone)} vide="Téléphone" libelle="Téléphone" type="tel" poser={(v) => poser({ telephone: v })} />
                <span className="lin-puce" title={estEntreprise ? "Créée le" : "Créé le"}>
                  <IconeCalendrier />
                  {dateCourte(fiche.cree)}
                </span>
              </div>
              {estEntreprise ? (
                <div className="lin-projet-ligne">
                  <span className="lin-projet-etiquette">Contacts</span>
                  {lies.slice(0, 4).map((c) => (
                    <Link key={c.id} href={`${CHEMINS.contacts}?id=${c.id}`} className="lin-puce" scroll={false}>
                      <span className="lcl-avatar" aria-hidden="true">
                        {initiales(texte(c.nom))}
                      </span>
                      {texte(c.nom)}
                    </Link>
                  ))}
                  {lies.length > 4 ? (
                    <Link href={`${chemin}?id=${id}&onglet=contacts`} className="lin-puce" replace scroll={false}>
                      +{lies.length - 4}
                    </Link>
                  ) : null}
                  <Link href={`${CHEMINS.contacts}?nouveau&entreprise=${fiche.id}`} className="lin-puce lin-puce--vide" scroll={false}>
                    <Plus aria-hidden="true" width={16} height={16} /> Ajouter un contact
                  </Link>
                </div>
              ) : null}

              <Description valeur={texte(fiche.notes)} poser={(v) => poser({ notes: v })} />

              {estEntreprise ? (
                <>
                  <h2 className="lin-projet-h2">Contacts</h2>
                  <ListeContacts lies={lies} />
                  <Link href={`${CHEMINS.contacts}?nouveau&entreprise=${fiche.id}`} className="lcl-plus" scroll={false}>
                    <Plus aria-hidden="true" /> Contact
                  </Link>
                </>
              ) : null}
            </>
          )}
        </div>

        {cartes ? (
          <div className="lin-cartes-droite">
            <CarteDroite titre="Propriétés">
              <dl className="lin-props">
                {estEntreprise ? (
                  <div>
                    <dt>Type</dt>
                    <dd>
                      <MenuOptions
                        aDroite
                        libelle={`Type : ${t.libelle}`}
                        titre="Changer le type…"
                        declencheur={
                          <>
                            {t.icone}
                            {t.cle ? t.libelle : "Sans type"}
                          </>
                        }
                        options={TYPES.map((x) => ({ cle: x.cle, libelle: x.libelle, icone: x.icone, coche: t.cle === x.cle, action: () => poser({ type: x.libelle }) }))}
                      />
                    </dd>
                  </div>
                ) : (
                  <div>
                    <dt>Entreprise</dt>
                    <dd>
                      <PuceEntreprise fiche={fiche} entreprise={entreprise} entreprises={entreprises ?? []} poser={poser} />
                    </dd>
                  </div>
                )}
                {estEntreprise ? (
                  <div>
                    <dt>Commune</dt>
                    <dd>
                      <PuceModifiable icone={<MapPin aria-hidden="true" />} valeur={texte(fiche.ville)} vide="Ajouter" libelle="Commune" poser={(v) => poser({ ville: v })} />
                    </dd>
                  </div>
                ) : (
                  <div>
                    <dt>E-mail</dt>
                    <dd>
                      <PuceModifiable icone={<Mail aria-hidden="true" />} valeur={texte(fiche.email)} vide="Ajouter" libelle="E-mail" type="email" poser={(v) => poser({ email: v })} />
                    </dd>
                  </div>
                )}
                <div>
                  <dt>Téléphone</dt>
                  <dd>
                    <PuceModifiable icone={<Phone aria-hidden="true" />} valeur={texte(fiche.telephone)} vide="Ajouter" libelle="Téléphone" type="tel" poser={(v) => poser({ telephone: v })} />
                  </dd>
                </div>
                <div>
                  <dt>{estEntreprise ? "Créée le" : "Créé le"}</dt>
                  <dd>
                    <span className="lcl-valeur">
                      <IconeCalendrier />
                      <span>{dateLongue(fiche.cree)}</span>
                    </span>
                  </dd>
                </div>
                {estEntreprise ? (
                  <div>
                    <dt>Contacts</dt>
                    <dd>
                      <span className="lcl-valeur">
                        <IconeGroupe />
                        <span>{lies.length}</span>
                      </span>
                    </dd>
                  </div>
                ) : null}
              </dl>
            </CarteDroite>
            {estEntreprise ? (
              <CarteDroite
                titre="Contacts"
                action={
                  <Link href={`${CHEMINS.contacts}?nouveau&entreprise=${fiche.id}`} className="lcl-carte-droite-action" aria-label="Ajouter un contact" title="Ajouter un contact" scroll={false}>
                    <Plus aria-hidden="true" />
                  </Link>
                }
              >
                {lies.length ? (
                  <ul className="lcl-carte-liste">
                    {lies.map((c) => (
                      <li key={c.id}>
                        <Link href={`${CHEMINS.contacts}?id=${c.id}`} scroll={false}>
                          <span className="lcl-avatar" aria-hidden="true">
                            {initiales(texte(c.nom))}
                          </span>
                          <span>{texte(c.nom)}</span>
                          {texte(c.email) ? <span className="lin-meta">{texte(c.email)}</span> : null}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="lcl-carte-vide">
                    Personne encore chez {nom}. <Link href={`${CHEMINS.contacts}?nouveau&entreprise=${fiche.id}`}>Ajouter un contact</Link>
                  </p>
                )}
              </CarteDroite>
            ) : (
              <CarteDroite titre="Entreprise">
                {entreprise ? (
                  <ul className="lcl-carte-liste">
                    <li>
                      <Link href={`${CHEMINS.entreprises}?id=${entreprise.id}`} scroll={false}>
                        <Building2 aria-hidden="true" width={16} height={16} />
                        <span>{texte(entreprise.nom)}</span>
                        <span className="lin-meta">{pluriel(contactsDe(entreprise, contacts ?? []).length, "contact")}</span>
                      </Link>
                    </li>
                  </ul>
                ) : (
                  <p className="lcl-carte-vide">{texte(fiche.entreprise) ? `« ${texte(fiche.entreprise)} » n'est pas une entreprise de la liste.` : "Aucune entreprise rattachée."}</p>
                )}
              </CarteDroite>
            )}
            <CarteDroite titre="Activité">
              <ul className="lin-activite">
                <li>
                  {estEntreprise ? <Building2 aria-hidden="true" width={16} height={16} /> : <UserRound aria-hidden="true" width={16} height={16} />}
                  <span>
                    <b>Fiche créée</b> · {dateCourte(fiche.cree)}
                  </span>
                </li>
              </ul>
            </CarteDroite>
          </div>
        ) : null}
      </div>

      {supprimer ? (
        <div className="lcl-voile" onMouseDown={(e) => e.target === e.currentTarget && setSupprimer(false)}>
          <div className="lcl-modale lcl-modale--petite" role="alertdialog" aria-modal="true" aria-labelledby="lcl-suppr-titre">
            <div className="lcl-modale-tete">
              <span className="lcl-modale-ici">Supprimer</span>
              <button type="button" className="lin-rond" aria-label="Fermer" onClick={() => setSupprimer(false)}>
                <X aria-hidden="true" />
              </button>
            </div>
            <div className="lcl-modale-corps">
              <h2 id="lcl-suppr-titre">Supprimer « {nom} » ?</h2>
              <p>{estEntreprise ? "La fiche disparaît de cet appareil. Ses contacts restent dans la liste des contacts." : "La fiche disparaît de cet appareil."}</p>
            </div>
            <div className="lcl-modale-pied">
              <button type="button" className="lcl-btn-fantome" onClick={() => setSupprimer(false)}>
                Annuler
              </button>
              <button type="button" className="lcl-btn-plein lcl-btn-danger" onClick={effacer}>
                Supprimer
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ListeContacts({ lies }: { lies: Fiche[] }) {
  if (!lies.length) return <p className="lcl-carte-vide">Personne encore.</p>;
  return (
    <ul className="lcl-liens">
      {lies.map((c) => (
        <li key={c.id}>
          <Link href={`${CHEMINS.contacts}?id=${c.id}`} className="lcl-lien" scroll={false}>
            <span className="lcl-avatar" aria-hidden="true">
              {initiales(texte(c.nom))}
            </span>
            <span>{texte(c.nom)}</span>
            {texte(c.email) ? <span className="lin-meta">{texte(c.email)}</span> : null}
            {texte(c.telephone) ? <span className="lin-meta">{texte(c.telephone)}</span> : null}
          </Link>
        </li>
      ))}
    </ul>
  );
}

/* le titre : un clic le rend modifiable ; Entrée ou un clic ailleurs enregistre, Échap annule */
function TitreModifiable({ valeur, poser }: { valeur: string; poser: (v: string) => void }) {
  const [v, setV] = useState(valeur);
  const [edite, setEdite] = useState(false);
  const enregistrer = () => {
    setEdite(false);
    const n = v.trim();
    if (n && n !== valeur) poser(n);
    else setV(valeur);
  };
  return (
    <input
      className="lin-projet-h1 lcl-h1"
      aria-label="Nom"
      value={edite ? v : valeur}
      placeholder="Sans nom"
      onFocus={() => {
        setV(valeur);
        setEdite(true);
      }}
      onChange={(e) => setV(e.target.value)}
      onBlur={enregistrer}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") {
          setV(valeur);
          setEdite(false);
          e.currentTarget.blur();
        }
      }}
    />
  );
}

/* une puce de propriété : la valeur, ou « Commune » en gris ; un clic ouvre le champ à la place */
function PuceModifiable({ icone, valeur, vide, libelle, type = "text", poser }: { icone: React.ReactNode; valeur: string; vide: string; libelle: string; type?: string; poser: (v: string) => void }) {
  const [edite, setEdite] = useState(false);
  const [v, setV] = useState(valeur);
  if (edite)
    return (
      <input
        className="lcl-saisie"
        type={type}
        autoFocus
        aria-label={libelle}
        placeholder={libelle}
        value={v}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => {
          setEdite(false);
          if (v.trim() !== valeur) poser(v.trim());
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") {
            setV(valeur);
            setEdite(false);
          }
        }}
      />
    );
  return (
    <button
      type="button"
      className={valeur ? "lin-puce" : "lin-puce lin-puce--vide"}
      aria-label={`${libelle} : ${valeur || "vide"} — modifier`}
      onClick={() => {
        setV(valeur);
        setEdite(true);
      }}
    >
      {icone}
      {valeur || vide}
    </button>
  );
}

/* l'entreprise d'un contact : un menu des entreprises connues, ou le nom libre d'avant */
function PuceEntreprise({ fiche, entreprise, entreprises, poser }: { fiche: Fiche; entreprise: Fiche | null; entreprises: Fiche[]; poser: (c: Partial<Fiche>) => void }) {
  const libre = texte(fiche.entreprise);
  const options: Option[] = [
    ...entreprises.map((e) => ({ cle: e.id, libelle: texte(e.nom), icone: <Building2 aria-hidden="true" />, coche: entreprise?.id === e.id, action: () => poser({ entreprise: texte(e.nom), entreprise_id: e.id }) })),
    { cle: "aucune", libelle: "Aucune entreprise", icone: <X aria-hidden="true" />, coche: !entreprise && !libre, action: () => poser({ entreprise: "", entreprise_id: undefined }) },
  ];
  return (
    <MenuOptions
      libelle={`Entreprise : ${entreprise ? texte(entreprise.nom) : libre || "aucune"}`}
      titre="Changer d'entreprise…"
      aDroite
      declencheur={
        <>
          <Building2 aria-hidden="true" />
          {entreprise ? texte(entreprise.nom) : libre || "Entreprise"}
        </>
      }
      options={options}
    />
  );
}

/* la description : « Description » puis le texte, enregistré en quittant le champ.
   29/10 — Teo : toute la bande se clique, pas seulement le libellé, et le champ
   est grand ; il suit la longueur du texte et se voit encadré pendant la saisie */
function Description({ valeur, poser }: { valeur: string; poser: (v: string) => void }) {
  const [v, setV] = useState(valeur);
  const [edite, setEdite] = useState(false);
  const champ = useRef<HTMLTextAreaElement>(null);
  const affiche = edite ? v : valeur;
  /* le champ grandit avec le texte (field-sizing n'existe pas partout) */
  useEffect(() => {
    const t = champ.current;
    if (!t) return;
    t.style.height = "auto";
    t.style.height = `${t.scrollHeight + 2}px`;
  }, [affiche]);
  const ouvrir = () => {
    const t = champ.current;
    if (!t) return;
    t.focus({ preventScroll: true });
    t.setSelectionRange(t.value.length, t.value.length);
    t.scrollIntoView({ block: "center", behavior: "smooth" });
  };
  return (
    <>
      <button type="button" className="lin-maj lcl-maj" onClick={ouvrir}>
        <span className="lcl-maj-btn">
          <Pencil aria-hidden="true" />
          {valeur ? "Modifier la description" : "Écrire une première note"}
        </span>
      </button>
      <h2 className="lin-projet-h2">Description</h2>
      <textarea
        ref={champ}
        id="lcl-description"
        className="lcl-desc lcl-desc--fiche"
        aria-label="Description"
        placeholder="Ajouter une description…"
        value={affiche}
        onFocus={() => {
          setV(valeur);
          setEdite(true);
        }}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => {
          setEdite(false);
          if (v.trim() !== valeur) poser(v.trim());
        }}
      />
    </>
  );
}
