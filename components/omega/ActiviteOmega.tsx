"use client";

/* ══════════════════════════════════════════════════════════════════════
   Activité du pilotage — une seule page, un seul dessin (11/10/2026)

   Retour de Teo : « dans la page Activité il y a plein d'options et quand
   on clique sur une, ça renvoie vers l'ancien design. Je veux une et même
   page, un et même design, et on sélectionne les activités dans la
   liste. » D'après sa maquette (à la manière d'Attio) :

     · en tête, le sélecteur d'activité (Vidéos, Publicité, Preuves) et
       la vue (colonnes ou liste) ; à droite, le produit et la période ;
     · dessous, le tri, la recherche, la bascule colonnes / liste ;
     · les suivis (production vidéo, campagnes, preuves) en colonnes par
       statut : une carte par ligne, qu'on fait glisser d'une colonne à
       l'autre, qu'on ouvre en fiche sur le côté, qu'on ajoute en bas
       d'une colonne ;
     · les documents (calendrier, styles de montage, guides) et le
       tableau Meta Ads s'ouvrent à la même place, sous la même barre.

   Changer d'activité ne recharge rien : tout est lu une fois par
   EcranOmega, l'adresse suit (/omega/activite/<vue>) pour le partage et
   le retour arrière. Les écritures sont celles de Tableaux et Document
   (omega_lignes, omega_pages ; droits de la base, RLS omega_est_admin).
   ══════════════════════════════════════════════════════════════════════ */

import "@/components/espace2/notes.css";
import "./activite.css";
import { createElement, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { Dialog, Modal, ModalOverlay } from "react-aria-components";
import { Activity, ArrowUpDown, CalendarDays, Check, ChevronDown, ChevronRight, ChevronsUpDown, Columns3, LayoutGrid, List, Plus, Search, Trash2, X, type LucideIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ItemMenu, MenuDeroulant, SectionMenu, SeparateurMenu } from "@/components/espace2/ui";
import { MODULES } from "@/components/espace2/modules";
import Choix from "./Choix";
import Document from "./Document";
import MetaAds from "./MetaAds";
import { TABLEAUX, teinteStatut, type Ligne } from "./Tableaux";
import type { OngletPage } from "./pages";

const I = { width: 16, height: 16, strokeWidth: 1.6, "aria-hidden": true } as const;
const BASE = "/omega/activite";
const MINUTE = 60_000;
const HEURE = 3_600_000;
const JOUR = 86_400_000;

/* ——— les suivis en colonnes : quel champ fait la colonne, le titre, la ligne de détail ——— */
type Suivi = {
  tableau: string;
  colonne: string;
  titre: string;
  nom: string;
  nouveau: string;
  produit?: string;
  date: string;
  /* ce qui s'écrit sous le titre */
  details: (d: Record<string, string>) => string[];
  /* la colonne secondaire de la liste */
  secondaire: string;
};
const nombre = (v: string | undefined) => (v ?? "").trim();
const SUIVIS: Record<string, Suivi> = {
  videos: {
    tableau: "videos",
    colonne: "Statut",
    titre: "Vidéo",
    nom: "vidéo",
    nouveau: "Nouvelle vidéo",
    produit: "Produit",
    date: "Sortie",
    details: (d) => [d["Format"], d["Réseau"], nombre(d["Vues"]) && `${nombre(d["Vues"])} vues`, nombre(d["Messages"]) && `${nombre(d["Messages"])} messages`].filter(Boolean) as string[],
    secondaire: "Format",
  },
  pubs: {
    tableau: "pubs",
    colonne: "Statut",
    titre: "Campagne",
    nom: "campagne",
    nouveau: "Nouvelle campagne",
    produit: "Produit",
    date: "Début",
    details: (d) => [nombre(d["Budget / jour (€)"]) && `${nombre(d["Budget / jour (€)"])} € / jour`, nombre(d["Dépensé (€)"]) && `${nombre(d["Dépensé (€)"])} € dépensés`, nombre(d["Audits calés"]) && `${nombre(d["Audits calés"])} audits`].filter(Boolean) as string[],
    secondaire: "Accroche",
  },
  preuves: {
    tableau: "preuves",
    colonne: "Accord",
    titre: "Mesure",
    nom: "preuve",
    nouveau: "Nouvelle preuve",
    date: "Relevé le",
    details: (d) => [d["Client"], (nombre(d["Avant"]) || nombre(d["Après"])) && `${nombre(d["Avant"]) || "?"} → ${nombre(d["Après"]) || "?"}`].filter(Boolean) as string[],
    secondaire: "Client",
  },
};

type Tri = "recent" | "ancien" | "ordre";
const TRIS: { cle: Tri; libelle: string }[] = [
  { cle: "recent", libelle: "Plus récent en premier" },
  { cle: "ancien", libelle: "Plus ancien en premier" },
  { cle: "ordre", libelle: "Ordre du tableau" },
];
type Periode = "7j" | "30j" | "tout";
const PERIODES: { cle: Periode; libelle: string; duree: number }[] = [
  { cle: "7j", libelle: "7 derniers jours", duree: 7 * JOUR },
  { cle: "30j", libelle: "30 derniers jours", duree: 30 * JOUR },
  { cle: "tout", libelle: "Toutes les dates", duree: Infinity },
];

const sansAccents = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const iconeProduit = (nom: string): LucideIcon => MODULES.find((m) => m.nom === nom)?.icone ?? LayoutGrid;

/* le moment, au plus court : « À l'instant », « Il y a 12 min », « Il y a 2 h », « Hier », « 3 oct. » */
function moment(iso: string | undefined, maintenant: number): string {
  const t = iso ? new Date(iso).getTime() : NaN;
  if (Number.isNaN(t)) return "";
  const ecart = maintenant - t;
  if (ecart < MINUTE) return "À l'instant";
  if (ecart < HEURE) return `Il y a ${Math.floor(ecart / MINUTE)} min`;
  const jour = new Date(maintenant);
  jour.setHours(0, 0, 0, 0);
  if (t >= jour.getTime()) return `Il y a ${Math.floor(ecart / HEURE)} h`;
  if (t >= jour.getTime() - JOUR) return "Hier";
  const d = new Date(t);
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: d.getFullYear() === jour.getFullYear() ? undefined : "numeric" });
}

export type DocActivite = { titre: string; contenu: string };

export default function ActiviteOmega({ onglets, lignes: initiales, docs: docsInitiaux }: { onglets: OngletPage[]; lignes: Ligne[]; docs: Record<string, DocActivite> }) {
  /* la vue vient de l'adresse : le retour arrière et les liens partagés tombent juste */
  const chemin = usePathname();
  const cleVue = chemin.startsWith(`${BASE}/`) ? chemin.slice(BASE.length + 1).split("/")[0] : "";
  const onglet = onglets.find((o) => o.cle === cleVue) ?? onglets[0];
  const suivi = onglet.tableaux?.[0] ? SUIVIS[onglet.tableaux[0]] : undefined;

  const [lignes, setLignes] = useState(initiales);
  const [docs, setDocs] = useState(docsInitiaux);
  const [maintenant] = useState(() => Date.now());
  const [vue, setVue] = useState<"colonnes" | "liste">("colonnes");
  const [tri, setTri] = useState<Tri>("ordre");
  const [periode, setPeriode] = useState<Periode>("tout");
  const [produit, setProduit] = useState<string | null>(null);
  const [recherche, setRecherche] = useState("");
  const [ouverte, setOuverte] = useState<string | null>(null);
  const [glissee, setGlissee] = useState<string | null>(null);
  const [survol, setSurvol] = useState<string | null>(null);
  const [etat, setEtat] = useState("");

  function choisir(cle: string) {
    if (cle === onglet.cle) return;
    window.history.pushState(null, "", cle ? `${BASE}/${cle}` : BASE);
    setProduit(null);
    setRecherche("");
    setOuverte(null);
  }

  const def = suivi ? TABLEAUX.find((t) => t.cle === suivi.tableau) : undefined;
  const choixColonne = def?.colonnes.find((c) => c.cle === suivi?.colonne)?.choix ?? [];
  const duTableau = useMemo(() => (suivi ? lignes.filter((l) => l.tableau === suivi.tableau) : []), [lignes, suivi]);
  const produits = useMemo(() => (suivi?.produit ? Array.from(new Set(duTableau.map((l) => l.donnees[suivi.produit!]).filter(Boolean))).sort() : []), [duTableau, suivi]);

  const visibles = useMemo(() => {
    if (!suivi) return [];
    const duree = PERIODES.find((p) => p.cle === periode)?.duree ?? Infinity;
    const q = sansAccents(recherche.trim());
    return duTableau
      .filter(
        (l) =>
          (!produit || (suivi.produit && l.donnees[suivi.produit] === produit)) &&
          (duree === Infinity || (!!l.maj && maintenant - new Date(l.maj).getTime() <= duree)) &&
          (!q || sansAccents(Object.values(l.donnees).join(" ")).includes(q)),
      )
      .sort((a, b) => (tri === "ordre" ? a.ordre - b.ordre : tri === "recent" ? (b.maj ?? "").localeCompare(a.maj ?? "") : (a.maj ?? "").localeCompare(b.maj ?? "")));
  }, [duTableau, suivi, produit, periode, recherche, tri, maintenant]);

  /* ——— les écritures, comme dans Tableaux ——— */
  async function maj(id: string, cle: string, valeur: string) {
    const avant = lignes.find((l) => l.id === id);
    if (!avant || (avant.donnees[cle] ?? "") === valeur) return;
    const donnees = { ...avant.donnees, [cle]: valeur };
    const quand = new Date().toISOString();
    setLignes((ls) => ls.map((l) => (l.id === id ? { ...l, donnees, maj: quand } : l)));
    const { error } = await createClient().from("omega_lignes").update({ donnees, maj: quand }).eq("id", id);
    setEtat(error ? "Échec de l'enregistrement : vérifiez votre connexion." : "Enregistré");
  }

  async function ajouter(valeurColonne?: string) {
    if (!suivi || !def) return;
    const ordre = Math.max(0, ...duTableau.map((l) => l.ordre)) + 1;
    const donnees: Record<string, string> = Object.fromEntries(def.colonnes.filter((c) => c.choix).map((c) => [c.cle, c.choix![0]]));
    if (valeurColonne) donnees[suivi.colonne] = valeurColonne;
    if (produit && suivi.produit) donnees[suivi.produit] = produit;
    const { data, error } = await createClient().from("omega_lignes").insert({ tableau: suivi.tableau, ordre, donnees }).select("id, tableau, ordre, donnees, maj").single();
    if (error || !data) return setEtat("Échec de l'ajout : vérifiez votre connexion.");
    setLignes((ls) => [...ls, data as Ligne]);
    setOuverte((data as Ligne).id);
    setEtat("Ajoutée");
  }

  async function supprimer(id: string) {
    if (!window.confirm(`Supprimer cette ${suivi?.nom ?? "ligne"} ?`)) return;
    const { error } = await createClient().from("omega_lignes").delete().eq("id", id);
    if (error) return setEtat("Échec de la suppression.");
    setLignes((ls) => ls.filter((l) => l.id !== id));
    setOuverte(null);
    setEtat("Supprimée");
  }

  const coche = (actif: boolean) => (actif ? <Check width={14} height={14} aria-label="choisi" /> : null);
  const fiche = ouverte ? lignes.find((l) => l.id === ouverte) : undefined;
  const filtre = !!recherche.trim() || !!produit || periode !== "tout";

  /* ——— le sélecteur d'activité, rangé par rubrique comme le menu ⌃⌄ des autres pages ——— */
  const groupes: { titre?: string; onglets: OngletPage[] }[] = [];
  for (const o of onglets) {
    const dernier = groupes[groupes.length - 1];
    if (dernier && dernier.titre === o.groupe) dernier.onglets.push(o);
    else groupes.push({ titre: o.groupe, onglets: [o] });
  }
  const selecteur = (
    <MenuDeroulant
      etiquette={`Activité : ${onglet.libelle}. Changer d'activité`}
      classe="no-bouton ao-selecteur"
      placement="bottom start"
      largeur={280}
      declencheur={
        <>
          <Activity {...I} />
          <span className="ao-selecteur-nom">{onglet.libelle}</span>
          <ChevronsUpDown {...I} width={14} height={14} />
        </>
      }
    >
      {groupes
        .map((g, i) => (
          <SectionMenu key={g.titre ?? `g${i}`} titre={g.titre}>
            {g.onglets.map((o) => (
              <ItemMenu key={o.cle || "accueil"} id={o.cle || "accueil"} textValue={o.libelle} onAction={() => choisir(o.cle)} suffixe={coche(o.cle === onglet.cle)}>
                {o.libelle}
              </ItemMenu>
            ))}
          </SectionMenu>
        ))
        .flatMap((el, i) => (i ? [<SeparateurMenu key={`s${i}`} />, el] : [el]))}
    </MenuDeroulant>
  );

  return (
    <div className="no-page ao-page v2-arrivee">
      <h1 className="v2-sr">Activité : {onglet.libelle}</h1>

      {/* rangée 1 : l'activité et la vue ; le produit et la période */}
      <div className="no-barre ao-barre">
        <div className="ao-groupe">
          {selecteur}
          {suivi ? (
            <MenuDeroulant
              etiquette="Vue"
              classe="no-bouton"
              placement="bottom start"
              largeur={200}
              declencheur={
                <>
                  {vue === "colonnes" ? <Columns3 {...I} width={14} height={14} /> : <List {...I} width={14} height={14} />}
                  {vue === "colonnes" ? "Vue en colonnes" : "Vue en liste"}
                  <ChevronDown {...I} width={14} height={14} />
                </>
              }
            >
              <ItemMenu id="colonnes" icone={<Columns3 {...I} width={14} height={14} />} onAction={() => setVue("colonnes")} suffixe={coche(vue === "colonnes")}>
                Vue en colonnes
              </ItemMenu>
              <ItemMenu id="liste" icone={<List {...I} width={14} height={14} />} onAction={() => setVue("liste")} suffixe={coche(vue === "liste")}>
                Vue en liste
              </ItemMenu>
            </MenuDeroulant>
          ) : null}
        </div>
        {suivi ? (
          <div className="ao-groupe">
            {suivi.produit ? (
              <MenuDeroulant
                etiquette="Filtrer par produit"
                classe="no-bouton"
                placement="bottom end"
                largeur={220}
                declencheur={
                  <>
                    <LayoutGrid {...I} width={14} height={14} />
                    {produit ?? "Tous les produits"}
                    <ChevronDown {...I} width={14} height={14} />
                  </>
                }
              >
                <ItemMenu id="tous" onAction={() => setProduit(null)} suffixe={coche(!produit)}>
                  Tous les produits
                </ItemMenu>
                {produits.map((p) => (
                  <ItemMenu key={p} id={p} textValue={p} onAction={() => setProduit(p)} suffixe={coche(produit === p)}>
                    {p}
                  </ItemMenu>
                ))}
              </MenuDeroulant>
            ) : null}
            <MenuDeroulant
              etiquette="Période"
              classe="no-bouton"
              placement="bottom end"
              largeur={220}
              declencheur={
                <>
                  <CalendarDays {...I} width={14} height={14} />
                  {PERIODES.find((p) => p.cle === periode)?.libelle}
                  <ChevronDown {...I} width={14} height={14} />
                </>
              }
            >
              {PERIODES.map((p) => (
                <ItemMenu key={p.cle} id={p.cle} onAction={() => setPeriode(p.cle)} suffixe={coche(periode === p.cle)}>
                  {p.libelle}
                </ItemMenu>
              ))}
            </MenuDeroulant>
          </div>
        ) : null}
      </div>

      {/* rangée 2 : le tri ; la recherche et la bascule */}
      {suivi ? (
        <div className="no-barre ao-barre">
          <div className="ao-groupe">
            <MenuDeroulant
              etiquette="Trier"
              classe="no-bouton"
              placement="bottom start"
              largeur={240}
              declencheur={
                <>
                  <ArrowUpDown {...I} width={14} height={14} />
                  {TRIS.find((t) => t.cle === tri)?.libelle}
                  <ChevronDown {...I} width={14} height={14} />
                </>
              }
            >
              {TRIS.map((t) => (
                <ItemMenu key={t.cle} id={t.cle} onAction={() => setTri(t.cle)} suffixe={coche(tri === t.cle)}>
                  {t.libelle}
                </ItemMenu>
              ))}
            </MenuDeroulant>
            <p className="ao-etat" role="status">
              {etat}
            </p>
          </div>
          <div className="ao-groupe ao-groupe--droite">
            <label className="ao-recherche">
              <Search {...I} width={14} height={14} />
              <span className="v2-sr">Rechercher</span>
              <input type="search" value={recherche} placeholder="Rechercher" autoComplete="off" spellCheck={false} onChange={(e) => setRecherche(e.target.value)} onKeyDown={(e) => e.key === "Escape" && setRecherche("")} />
              {recherche ? (
                <button type="button" className="ao-effacer" aria-label="Effacer la recherche" onClick={() => setRecherche("")}>
                  <X width={12} height={12} strokeWidth={2} aria-hidden="true" />
                </button>
              ) : null}
            </label>
            <div className="no-bascule" role="group" aria-label="Affichage">
              <button type="button" aria-pressed={vue === "colonnes"} aria-label="Vue en colonnes" title="Vue en colonnes" onClick={() => setVue("colonnes")}>
                <Columns3 {...I} width={14} height={14} />
              </button>
              <button type="button" aria-pressed={vue === "liste"} aria-label="Vue en liste" title="Vue en liste" onClick={() => setVue("liste")}>
                <List {...I} width={14} height={14} />
              </button>
            </div>
            <button type="button" className="no-principal" onClick={() => ajouter()}>
              <Plus {...I} width={14} height={14} />
              {suivi.nouveau}
            </button>
          </div>
        </div>
      ) : null}

      {/* ——— le contenu ——— */}
      {suivi && vue === "colonnes" ? (
        <div className="ao-tableau" style={{ "--ao-colonnes": choixColonne.length } as React.CSSProperties}>
          {choixColonne.map((valeur) => {
            const liste = visibles.filter((l) => (l.donnees[suivi.colonne] || choixColonne[0]) === valeur);
            return (
              <section
                key={valeur}
                className="ao-colonne"
                aria-label={`${valeur} : ${liste.length}`}
                data-survol={survol === valeur ? "" : undefined}
                onDragOver={(e) => {
                  if (!glissee) return;
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  if (survol !== valeur) setSurvol(valeur);
                }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) setSurvol(null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const id = e.dataTransfer.getData("text/plain") || glissee;
                  setSurvol(null);
                  setGlissee(null);
                  if (id) void maj(id, suivi.colonne, valeur);
                }}
              >
                <header className="ao-colonne-tete">
                  <span className="ao-point" data-teinte={teinteStatut(valeur)} aria-hidden="true" />
                  <h2>{valeur}</h2>
                  <span className="no-compte">{liste.length}</span>
                  <button type="button" className="ao-icone ao-colonne-ajout" aria-label={`Ajouter une ${suivi.nom} dans « ${valeur} »`} onClick={() => ajouter(valeur)}>
                    <Plus {...I} width={14} height={14} />
                  </button>
                </header>
                <ul className="ao-cartes">
                  {liste.map((l) => (
                    <CarteSuivi
                      key={l.id}
                      l={l}
                      suivi={suivi}
                      maintenant={maintenant}
                      glissee={glissee === l.id}
                      onOuvrir={() => setOuverte(l.id)}
                      onGlisser={(debut) => setGlissee(debut ? l.id : null)}
                    />
                  ))}
                </ul>
                {!liste.length ? <p className="ao-vide">{filtre ? "Aucun résultat" : "Vide"}</p> : null}
                <button type="button" className="ao-ajout" onClick={() => ajouter(valeur)}>
                  <Plus {...I} width={14} height={14} />
                  Ajouter
                </button>
              </section>
            );
          })}
        </div>
      ) : suivi ? (
        visibles.length ? (
          <ul className="ao-liste">
            {visibles.map((l) => {
              const statut = l.donnees[suivi.colonne] || choixColonne[0];
              const p = suivi.produit ? l.donnees[suivi.produit] : "";
              return (
                <li key={l.id} className="ao-ligne">
                  <button type="button" onClick={() => setOuverte(l.id)}>
                    <span className="ao-ligne-titre">
                      <strong data-vide={l.donnees[suivi.titre] ? undefined : ""}>{l.donnees[suivi.titre] || `${suivi.titre} sans titre`}</strong>
                      <span>{suivi.details(l.donnees).join(" · ")}</span>
                    </span>
                    <span className="ao-statut">
                      <span className="ao-point" data-teinte={teinteStatut(statut)} aria-hidden="true" />
                      {statut}
                    </span>
                    <span className="ao-produit">{p ? <Produit nom={p} /> : l.donnees[suivi.secondaire] || ""}</span>
                    <span className="ao-ligne-date">{l.donnees[suivi.date] || ""}</span>
                    <time dateTime={l.maj}>{moment(l.maj, maintenant)}</time>
                    <ChevronRight {...I} width={14} height={14} className="ao-chevron" />
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="ao-vide ao-vide--liste">{filtre ? "Aucun résultat avec ces filtres" : `Aucune ${suivi.nom} pour l'instant`}</p>
        )
      ) : onglet.special === "meta" ? (
        <div className="ao-meta">
          <MetaAds lignes={lignes.filter((l) => ["meta", "meta-seuils", "pubs"].includes(l.tableau))} selecteur={null} />
        </div>
      ) : onglet.doc ? (
        <div className="ao-doc">
          <h2 className="ao-doc-titre">{docs[onglet.doc]?.titre || onglet.libelle}</h2>
          <Document
            key={onglet.doc}
            slug={onglet.doc}
            titre={docs[onglet.doc]?.titre || onglet.libelle}
            contenu={docs[onglet.doc]?.contenu ?? ""}
            onEnregistre={(contenu) => setDocs((d) => ({ ...d, [onglet.doc!]: { titre: d[onglet.doc!]?.titre || onglet.libelle, contenu } }))}
          />
        </div>
      ) : null}

      {/* ——— la fiche, sur le côté ——— */}
      <ModalOverlay isOpen={!!fiche && !!suivi && !!def} onOpenChange={(o) => !o && setOuverte(null)} isDismissable className="v2-jetons ao-voile">
        <Modal className="ao-fiche">
          <Dialog className="ao-fiche-dialogue" aria-label={suivi ? `Fiche ${suivi.nom}` : "Fiche"}>
            {fiche && suivi && def ? <Fiche key={fiche.id} l={fiche} suivi={suivi} colonnes={def.colonnes} maintenant={maintenant} onMaj={(cle, v) => maj(fiche.id, cle, v)} onSupprimer={() => supprimer(fiche.id)} onFermer={() => setOuverte(null)} /> : null}
          </Dialog>
        </Modal>
      </ModalOverlay>
    </div>
  );
}

function Produit({ nom }: { nom: string }) {
  return (
    <span className="ao-tag">
      {createElement(iconeProduit(nom), { ...I, width: 14, height: 14 })}
      {nom}
    </span>
  );
}

function CarteSuivi({ l, suivi, maintenant, glissee, onOuvrir, onGlisser }: { l: Ligne; suivi: Suivi; maintenant: number; glissee: boolean; onOuvrir: () => void; onGlisser: (debut: boolean) => void }) {
  const titre = l.donnees[suivi.titre];
  const details = suivi.details(l.donnees);
  const p = suivi.produit ? l.donnees[suivi.produit] : "";
  const date = l.donnees[suivi.date];
  return (
    <li
      className="ao-carte"
      draggable
      data-glissee={glissee ? "" : undefined}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", l.id);
        e.dataTransfer.effectAllowed = "move";
        onGlisser(true);
      }}
      onDragEnd={() => onGlisser(false)}
    >
      <button type="button" className="ao-carte-bouton" onClick={onOuvrir}>
        <span className="ao-carte-haut">
          <strong className="ao-carte-titre" data-vide={titre ? undefined : ""}>
            {titre || `${suivi.titre} sans titre`}
          </strong>
          <ChevronRight {...I} width={14} height={14} className="ao-chevron" />
        </span>
        {details.length ? (
          <span className="ao-meta-ligne">
            {details.map((d, i) => (
              <span key={i}>{d}</span>
            ))}
          </span>
        ) : null}
        <span className="ao-carte-pied">
          {p ? <Produit nom={p} /> : <span className="ao-tag">{date || " "}</span>}
          <time dateTime={l.maj}>{p && date ? date : moment(l.maj, maintenant)}</time>
        </span>
      </button>
    </li>
  );
}

function Fiche({ l, suivi, colonnes, maintenant, onMaj, onSupprimer, onFermer }: { l: Ligne; suivi: Suivi; colonnes: { cle: string; choix?: string[]; large?: boolean }[]; maintenant: number; onMaj: (cle: string, v: string) => void; onSupprimer: () => void; onFermer: () => void }) {
  const statut = l.donnees[suivi.colonne] || colonnes.find((c) => c.cle === suivi.colonne)?.choix?.[0] || "";
  const ajuster = (el: HTMLTextAreaElement | null) => {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };
  return (
    <>
      <div className="ao-fiche-haut">
        <span className="ao-fiche-type">{suivi.titre}</span>
        <button type="button" className="ao-icone" aria-label="Fermer la fiche" onClick={onFermer}>
          <X {...I} />
        </button>
      </div>
      <div className="ao-fiche-corps">
        <textarea
          ref={ajuster}
          className="ao-fiche-titre"
          defaultValue={l.donnees[suivi.titre] ?? ""}
          placeholder={`${suivi.titre} sans titre`}
          rows={1}
          aria-label={suivi.titre}
          autoFocus={!l.donnees[suivi.titre]}
          onChange={(e) => ajuster(e.target)}
          onBlur={(e) => onMaj(suivi.titre, e.target.value.trim())}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              e.currentTarget.blur();
            }
          }}
        />
        <Choix forme="pastille" etiquette={suivi.colonne} teinte={teinteStatut(statut)} valeur={statut} onChange={(v) => onMaj(suivi.colonne, v)} options={colonnes.find((c) => c.cle === suivi.colonne)?.choix ?? []} classe="ao-fiche-statut" />

        <h3 className="ao-fiche-section">Détails</h3>
        <dl className="ao-proprietes">
          {colonnes
            .filter((c) => c.cle !== suivi.titre && c.cle !== suivi.colonne)
            .map((c) => (
              <div key={c.cle} className="ao-propriete" data-large={c.large ? "" : undefined}>
                <dt>{c.cle}</dt>
                <dd>
                  {c.choix ? (
                    <Choix forme="fiche" etiquette={c.cle} valeur={l.donnees[c.cle] ?? c.choix[0]} onChange={(v) => onMaj(c.cle, v)} options={c.choix} classe="ao-choix" />
                  ) : c.large ? (
                    <textarea className="ao-champ" defaultValue={l.donnees[c.cle] ?? ""} placeholder="Vide" rows={2} aria-label={c.cle} onBlur={(e) => onMaj(c.cle, e.target.value.trim())} />
                  ) : (
                    <input className="ao-champ" defaultValue={l.donnees[c.cle] ?? ""} placeholder="Vide" aria-label={c.cle} onBlur={(e) => onMaj(c.cle, e.target.value.trim())} onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()} />
                  )}
                </dd>
              </div>
            ))}
        </dl>
      </div>
      <div className="ao-fiche-pied">
        <span>{l.maj ? `Modifiée ${/^\d/.test(moment(l.maj, maintenant)) ? `le ${moment(l.maj, maintenant)}` : moment(l.maj, maintenant).toLowerCase()}` : ""}</span>
        <button type="button" className="ao-supprimer" onClick={onSupprimer}>
          <Trash2 {...I} width={14} height={14} />
          Supprimer
        </button>
      </div>
    </>
  );
}
