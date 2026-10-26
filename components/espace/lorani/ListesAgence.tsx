"use client";

/* Les listes de contrôle de l'agence (b5_60) : le gérant et les admins écrivent les règles internes de l'agence, et
   elles s'ajoutent aux contrôles réglementaires de chaque dossier. Trois genres de points : une cote ou une surface lue
   (au moins / au plus une valeur), une pièce ou un champ présent (une notice, l'indice au cartouche de chaque planche),
   un point à vérifier à la main. Chaque enregistrement fait une version figée ; les constats citent la liste, la
   version et le point. Une liste peut ne viser que certaines natures de projet ou certaines phases, et se retirer.
   Base réelle : lorani_listes, lorani_liste_versions sous la RLS (lecture par les membres) ; écriture par les portes
   lorani_liste_enregistrer et lorani_liste_activer. Exemple : les saisies s'appliquent en mémoire. */

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ListChecks, Trash2 } from "lucide-react";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import { Avis, Pastille } from "../ui";
import { dateCourte } from "../format";
import { activerListe, enregistrerListe } from "./portes";
import { NATURES_PROJET, PHASES } from "./etats";
import type { Constat, Dossier, GenrePointListe, ListeAgence, NatureProjet, PhaseProjet, PointListe, RolePieceControle } from "./types";

/* les grandeurs du contrat de lecture (private.lorani_grandeur) */
const GRANDEURS: { cle: string; libelle: string; unite: string }[] = [
  { cle: "hauteur_faitage_m", libelle: "Hauteur au faîtage", unite: "m" },
  { cle: "hauteur_egout_m", libelle: "Hauteur à l’égout", unite: "m" },
  { cle: "hauteur_acrotere_m", libelle: "Hauteur à l’acrotère", unite: "m" },
  { cle: "recul_voie_m", libelle: "Recul sur voie", unite: "m" },
  { cle: "recul_limite_m", libelle: "Recul sur limite séparative", unite: "m" },
  { cle: "distance_batiments_m", libelle: "Distance entre bâtiments", unite: "m" },
  { cle: "emprise_sol_m2", libelle: "Emprise au sol", unite: "m²" },
  { cle: "emprise_sol_pct", libelle: "Emprise au sol", unite: "%" },
  { cle: "surface_plancher_m2", libelle: "Surface de plancher", unite: "m²" },
  { cle: "surface_taxable_m2", libelle: "Surface taxable", unite: "m²" },
  { cle: "surface_habitable_m2", libelle: "Surface habitable", unite: "m²" },
  { cle: "espaces_verts_pct", libelle: "Part d’espaces verts", unite: "%" },
  { cle: "pleine_terre_pct", libelle: "Part de pleine terre", unite: "%" },
  { cle: "stationnement_nb", libelle: "Places de stationnement", unite: "" },
  { cle: "logements_nb", libelle: "Nombre de logements", unite: "" },
  { cle: "niveaux_nb", libelle: "Nombre de niveaux", unite: "" },
  { cle: "pente_toiture_pct", libelle: "Pente de toiture", unite: "%" },
  { cle: "longueur_m", libelle: "Longueur", unite: "m" },
  { cle: "largeur_m", libelle: "Largeur", unite: "m" },
  { cle: "cote_altimetrique_m", libelle: "Cote altimétrique", unite: "m NGF" },
  { cle: "largeur_porte_m", libelle: "Passage utile d’une porte", unite: "m" },
  { cle: "largeur_cheminement_m", libelle: "Largeur de cheminement", unite: "m" },
  { cle: "largeur_degagement_m", libelle: "Largeur de dégagement", unite: "m" },
  { cle: "pente_rampe_pct", libelle: "Pente de rampe", unite: "%" },
  { cle: "ressaut_m", libelle: "Ressaut", unite: "m" },
  { cle: "distance_escalier_m", libelle: "Distance à un escalier", unite: "m" },
  { cle: "effectif_nb", libelle: "Effectif", unite: "" },
  { cle: "degagements_nb", libelle: "Nombre de dégagements", unite: "" },
  { cle: "hauteur_dernier_plancher_m", libelle: "Hauteur du dernier plancher", unite: "m" },
  { cle: "distance_voie_engins_m", libelle: "Distance à la voie engins", unite: "m" },
  { cle: "largeur_voie_engins_m", libelle: "Largeur de la voie engins", unite: "m" },
  { cle: "surface_exutoire_m2", libelle: "Surface d’exutoire", unite: "m²" },
  { cle: "distance_hydrant_m", libelle: "Distance à l’hydrant", unite: "m" },
  { cle: "c_plus_d_m", libelle: "C+D entre baies", unite: "m" },
  { cle: "masse_combustible_mj_m2", libelle: "Masse combustible M", unite: "MJ/m²" },
];
const ROLES: Record<RolePieceControle, string> = { planche: "Planche", cctp: "CCTP", dpgf: "DPGF", plu: "Règlement du PLU", metre: "Métré", cerfa: "Cerfa de la demande", re2020: "Attestation RE2020", bet: "Plan du BET", notice: "Notice", autre: "Autre pièce" };
const GENRES: Record<GenrePointListe, string> = { mesure: "Une cote ou une surface lue", presence: "Une pièce ou un champ présent", manuel: "À vérifier à la main" };
const GRAVITES: Record<Constat["gravite"], string> = { bloquant: "Bloquant", majeur: "Majeur", mineur: "Mineur" };
const nombreFr = (n: number | undefined) => (n === undefined ? "" : String(n).replace(".", ","));

/* un point en saisie : la valeur de la règle reste du texte (virgule acceptée) jusqu'à l'enregistrement */
type Saisie = { cle: string; id?: string; libelle: string; genre: GenrePointListe; gravite: Constat["gravite"]; reference: string; grandeur: string; borne: "min" | "max"; seuil: string; objet: string; role: RolePieceControle; champ: string };
const vide = (n: number): Saisie => ({ cle: `n${n}`, libelle: "", genre: "manuel", gravite: "mineur", reference: "", grandeur: "largeur_porte_m", borne: "min", seuil: "", objet: "", role: "notice", champ: "" });
const versSaisie = (p: PointListe, i: number): Saisie => ({
  cle: p.id ?? `p${i}`, id: p.id, libelle: p.libelle, genre: p.genre, gravite: p.gravite, reference: p.reference ?? "", grandeur: p.grandeur ?? "largeur_porte_m",
  borne: p.borne ?? "min", seuil: nombreFr(p.seuil), objet: p.objet ?? "", role: p.role ?? "notice", champ: p.champ ?? "",
});
/* le point tel que la base l'attend, ou un message (les mêmes refus que private.lorani_liste_points) */
const versPoint = (s: Saisie, n: number): PointListe | string => {
  const libelle = s.libelle.trim().replace(/\s+/g, " ");
  if (libelle.length < 3 || libelle.length > 300) return `Point ${n} : le libellé fait de 3 à 300 caractères.`;
  const base: PointListe = { ...(s.id ? { id: s.id } : {}), libelle, genre: s.genre, gravite: s.gravite, ...(s.reference.trim() ? { reference: s.reference.trim() } : {}) };
  if (s.genre === "mesure") {
    const t = s.seuil.trim().replace(",", ".");
    if (!/^-?\d+(\.\d+)?$/.test(t)) return `Point ${n} : la valeur de la règle est un nombre.`;
    const objet = s.objet.trim().toLowerCase();
    if (objet && !/^[a-z0-9_]{1,60}$/.test(objet)) return `Point ${n} : l’objet s’écrit en minuscules sans accent (« batiment_a »).`;
    return { ...base, grandeur: s.grandeur, borne: s.borne, seuil: Number(t), ...(objet ? { objet } : {}) };
  }
  if (s.genre === "presence") {
    const champ = s.champ.trim().toLowerCase();
    if (champ && !/^[a-z][a-z0-9_.]{1,79}$/.test(champ)) return `Point ${n} : le champ s’écrit comme au contrat de lecture (« indice »).`;
    return { ...base, role: s.role, ...(champ ? { champ } : {}) };
  }
  return base;
};
/* une ligne de lecture : « Passage utile d'une porte : au moins 0,9 m » */
export const resumePoint = (p: PointListe) => {
  if (p.genre === "mesure") {
    const g = GRANDEURS.find((x) => x.cle === p.grandeur);
    return `${g?.libelle ?? p.grandeur}${p.objet ? ` (${p.objet.replace(/_/g, " ")})` : ""} : ${p.borne === "max" ? "au plus" : "au moins"} ${nombreFr(p.seuil)}${g?.unite ? ` ${g.unite}` : ""}`;
  }
  if (p.genre === "presence") return `${ROLES[p.role ?? "autre"]} au contrôle${p.champ ? `, « ${p.champ} » lu sur chacune` : ""}`;
  return "À vérifier à la main";
};

export default function ListesAgence({ dossier, ouvert, fermer, agir }: {
  dossier: Dossier;
  ouvert: boolean;
  fermer: () => void;
  agir: (reel: () => Promise<void>, local: () => Dossier) => Promise<void>;
}) {
  const listes = useMemo(() => [...dossier.listes].sort((a, b) => Number(b.actif) - Number(a.actif) || a.nom.localeCompare(b.nom)), [dossier.listes]);
  const peutTenir = ["gerant", "admin"].includes(dossier.moi?.role ?? "");
  const clientId = dossier.moi?.client_id ?? "";
  const pointsDe = (l: ListeAgence) => dossier.listeVersions.find((v) => v.liste_id === l.id && v.version === l.version)?.points ?? [];

  /* null : la vue d'ensemble ; « nouvelle » ou une liste : l'édition */
  const [edition, setEdition] = useState<ListeAgence | "nouvelle" | null>(null);
  const [nom, setNom] = useState("");
  const [description, setDescription] = useState("");
  const [natures, setNatures] = useState<NatureProjet[]>([]);
  const [phases, setPhases] = useState<PhaseProjet[]>([]);
  const [saisies, setSaisies] = useState<Saisie[]>([]);
  const [compteur, setCompteur] = useState(1);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const ouvrirEdition = (l: ListeAgence | null) => {
    setErreur(null);
    setNom(l?.nom ?? "");
    setDescription(l?.description ?? "");
    setNatures(l?.natures ?? []);
    setPhases(l?.phases ?? []);
    setSaisies(l ? pointsDe(l).map(versSaisie) : [vide(0)]);
    setEdition(l ?? "nouvelle");
  };
  const changer = (cle: string, v: Partial<Saisie>) => setSaisies((l) => l.map((x) => (x.cle === cle ? { ...x, ...v } : x)));
  const deplacer = (i: number, d: -1 | 1) => setSaisies((l) => {
    const j = i + d;
    if (j < 0 || j >= l.length) return l;
    const m = [...l];
    [m[i], m[j]] = [m[j], m[i]];
    return m;
  });
  const ajouter = () => {
    setSaisies((l) => [...l, vide(compteur)]);
    setCompteur((n) => n + 1);
  };

  const points = saisies.map((s, i) => versPoint(s, i + 1));
  const probleme = edition === null ? null
    : !nom.trim() || nom.trim().length > 120 ? "Le nom de la liste fait de 1 à 120 caractères."
    : listes.some((l) => l.nom.toLowerCase() === nom.trim().replace(/\s+/g, " ").toLowerCase() && (edition === "nouvelle" || l.id !== edition.id)) ? "Une autre liste de l’agence porte déjà ce nom."
    : description.length > 500 ? "La description fait au plus 500 caractères."
    : !saisies.length ? "Une liste a au moins un point."
    : saisies.length > 100 ? "Une liste a au plus 100 points."
    : (points.find((p) => typeof p === "string") as string | undefined) ?? null;

  const lancer = async (reel: () => Promise<void>, local: () => Dossier, apres?: () => void) => {
    setEnvoi(true);
    setErreur(null);
    try {
      await agir(reel, local);
      apres?.();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base n'a pas répondu.");
    } finally {
      setEnvoi(false);
    }
  };
  const enregistrer = () => {
    if (probleme || edition === null) return;
    const ps = points as PointListe[];
    const v = { nom: nom.trim().replace(/\s+/g, " "), description: description.trim() || null, natures: [...natures].sort(), phases: [...phases].sort(), points: ps };
    const avant = edition === "nouvelle" ? null : edition;
    return lancer(
      () => enregistrerListe(clientId, avant?.id ?? null, v).then(() => undefined),
      () => {
        const id = avant?.id ?? `local-liste-${Date.now()}`;
        const version = (avant?.version ?? 0) + 1;
        const maintenant = new Date().toISOString();
        const numerotes = ps.map((p, i) => ({ ...p, id: p.id ?? `${id}-p${version}-${i}` }));
        const l: ListeAgence = { id, nom: v.nom, description: v.description, natures: v.natures as NatureProjet[], phases: v.phases as PhaseProjet[], actif: true, version, points_nb: ps.length, maj_le: maintenant };
        return {
          ...dossier,
          listes: avant ? dossier.listes.map((x) => (x.id === id ? l : x)) : [...dossier.listes, l],
          listeVersions: [{ id: `${id}-v${version}`, liste_id: id, version, points: numerotes, enregistre_par: dossier.moi?.user_id ?? null, enregistre_le: maintenant }, ...dossier.listeVersions],
        };
      },
      () => setEdition(null),
    );
  };
  const basculer = (l: ListeAgence) =>
    lancer(() => activerListe(l.id, !l.actif), () => ({ ...dossier, listes: dossier.listes.map((x) => (x.id === l.id ? { ...x, actif: !l.actif } : x)) }));

  const portee = (l: ListeAgence) => [
    l.natures.length ? l.natures.map((n) => NATURES_PROJET[n]).join(", ") : "tous les projets",
    l.phases.length ? `en ${l.phases.map((p) => PHASES[p]).join(", ")}` : "",
  ].filter(Boolean).join(", ");

  return (
    <Dialog open={ouvert} onOpenChange={(o) => { if (!o) { setEdition(null); fermer(); } }}>
      <DialogContent>
        <DialogHeader>
          <DialogIcone><ListChecks width={18} height={18} aria-hidden="true" /></DialogIcone>
          <DialogTitle>{edition === null ? "Listes de contrôle de l’agence" : edition === "nouvelle" ? "Nouvelle liste" : `Modifier « ${edition.nom} »`}</DialogTitle>
          <DialogDescription>
            {edition === null
              ? "Vos règles internes s’ajoutent aux contrôles réglementaires de chaque dossier : une cote lue, une pièce attendue, ou un point à vérifier à la main. Chaque enregistrement fait une nouvelle version, citée par les constats."
              : "Enregistrer fait la version suivante ; elle vaut au prochain passage des contrôles. Un point gardé garde la décision prise sur son constat."}
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          {edition === null ? (
            <div className="esp-form">
              {!listes.length ? <div className="lor-tableau-vide">L’agence n’a pas encore de liste de contrôle.</div> : (
                <ul className="lor-liste" aria-label="Listes de l’agence">
                  {listes.map((l) => {
                    const pts = pointsDe(l);
                    return (
                      <li key={l.id}>
                        <div className="lor-situation-tete">
                          <strong>{l.nom}</strong>
                          <Pastille teinte={l.actif ? "vert" : "gris"}>{l.actif ? `Version ${l.version}` : "Retirée"}</Pastille>
                          <span className="esp-kpi-sous">{l.points_nb} point{l.points_nb > 1 ? "s" : ""} · {portee(l)} · {dateCourte(l.maj_le)}</span>
                        </div>
                        {l.description ? <div className="lor-sous">{l.description}</div> : null}
                        <ol className="lor-citations">
                          {pts.map((p, i) => <li key={p.id ?? i}>{p.libelle} <span className="esp-kpi-sous">({resumePoint(p)} · {GRAVITES[p.gravite].toLowerCase()}{p.reference ? ` · ${p.reference}` : ""})</span></li>)}
                        </ol>
                        {peutTenir ? (
                          <div className="esp-actions">
                            <button type="button" className="r-btn r-btn--fil r-btn--petit" disabled={envoi || !l.actif} onClick={() => ouvrirEdition(l)}>Modifier</button>
                            <button type="button" className="esp-lien-bouton" disabled={envoi} onClick={() => void basculer(l)}>{l.actif ? "Retirer" : "Remettre"}</button>
                          </div>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              )}
              {!peutTenir ? <p className="lor-sous">Le gérant et les admins de l’agence tiennent ces listes.</p> : null}
              {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
            </div>
          ) : (
            <div className="esp-form">
              <label className="rv-libelle">Nom <span className="esp-obligatoire">(obligatoire)</span>
                <input className="rv-champ" value={nom} maxLength={120} onChange={(e) => setNom(e.target.value)} placeholder="Avant chaque dépôt" />
              </label>
              <label className="rv-libelle">Description
                <textarea className="rv-champ" rows={2} maxLength={500} value={description} onChange={(e) => setDescription(e.target.value)} />
              </label>
              <fieldset className="lor-choix-pieces">
                <legend className="rv-libelle">Projets visés <span className="esp-kpi-sous">(aucune case : tous)</span></legend>
                <div className="lor-activites">
                  {(Object.entries(NATURES_PROJET) as [NatureProjet, string][]).map(([cle, libelle]) => (
                    <label key={cle} className="lor-choix-case">
                      <input type="checkbox" checked={natures.includes(cle)} onChange={(e) => setNatures((l) => (e.target.checked ? [...l, cle] : l.filter((x) => x !== cle)))} /> <span>{libelle}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <fieldset className="lor-choix-pieces">
                <legend className="rv-libelle">Phases visées <span className="esp-kpi-sous">(aucune case : toutes)</span></legend>
                <div className="lor-activites">
                  {(Object.entries(PHASES) as [PhaseProjet, string][]).map(([cle, libelle]) => (
                    <label key={cle} className="lor-choix-case">
                      <input type="checkbox" checked={phases.includes(cle)} onChange={(e) => setPhases((l) => (e.target.checked ? [...l, cle] : l.filter((x) => x !== cle)))} /> <span>{libelle}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <fieldset className="lor-choix-pieces">
                <legend className="rv-libelle">Points <span className="esp-obligatoire">(un au moins)</span></legend>
                {saisies.map((s, i) => (
                  <div key={s.cle} className="lor-constat">
                    <div className="lor-situation-tete">
                      <strong>Point {i + 1}</strong>
                      <button type="button" className="esp-lien-bouton" aria-label={`Monter le point ${i + 1}`} disabled={i === 0} onClick={() => deplacer(i, -1)}><ArrowUp width={14} height={14} aria-hidden="true" /></button>
                      <button type="button" className="esp-lien-bouton" aria-label={`Descendre le point ${i + 1}`} disabled={i === saisies.length - 1} onClick={() => deplacer(i, 1)}><ArrowDown width={14} height={14} aria-hidden="true" /></button>
                      <button type="button" className="esp-lien-bouton" aria-label={`Retirer le point ${i + 1}`} onClick={() => setSaisies((l) => l.filter((x) => x.cle !== s.cle))}><Trash2 width={14} height={14} aria-hidden="true" /></button>
                    </div>
                    <label className="rv-libelle">Ce que l’agence vérifie
                      <input className="rv-champ" value={s.libelle} maxLength={300} onChange={(e) => changer(s.cle, { libelle: e.target.value })} placeholder="Les légendes des façades reprennent les matériaux de la notice" />
                    </label>
                    <div className="lor-tolerances">
                      <label className="rv-libelle">Genre
                        <select className="rv-champ" value={s.genre} onChange={(e) => changer(s.cle, { genre: e.target.value as GenrePointListe })}>
                          {(Object.entries(GENRES) as [GenrePointListe, string][]).map(([cle, libelle]) => <option key={cle} value={cle}>{libelle}</option>)}
                        </select>
                      </label>
                      <label className="rv-libelle">Gravité
                        <select className="rv-champ" value={s.gravite} onChange={(e) => changer(s.cle, { gravite: e.target.value as Constat["gravite"] })}>
                          {(Object.entries(GRAVITES) as [Constat["gravite"], string][]).map(([cle, libelle]) => <option key={cle} value={cle}>{libelle}</option>)}
                        </select>
                      </label>
                      <label className="rv-libelle">Référence interne
                        <input className="rv-champ" value={s.reference} maxLength={120} onChange={(e) => changer(s.cle, { reference: e.target.value })} placeholder="Charte, § 4" />
                      </label>
                    </div>
                    {s.genre === "mesure" ? (
                      <div className="lor-tolerances">
                        <label className="rv-libelle">Grandeur lue
                          <select className="rv-champ" value={s.grandeur} onChange={(e) => changer(s.cle, { grandeur: e.target.value })}>
                            {GRANDEURS.map((g) => <option key={g.cle} value={g.cle}>{g.libelle}{g.unite ? ` (${g.unite})` : ""}</option>)}
                          </select>
                        </label>
                        <label className="rv-libelle">Règle
                          <select className="rv-champ" value={s.borne} onChange={(e) => changer(s.cle, { borne: e.target.value as "min" | "max" })}>
                            <option value="min">Au moins</option>
                            <option value="max">Au plus</option>
                          </select>
                        </label>
                        <label className="rv-libelle">Valeur
                          <input className="rv-champ" inputMode="decimal" value={s.seuil} onChange={(e) => changer(s.cle, { seuil: e.target.value })} placeholder="0,90" />
                        </label>
                        <label className="rv-libelle">Objet <span className="esp-kpi-sous">(vide : tous)</span>
                          <input className="rv-champ" value={s.objet} maxLength={60} onChange={(e) => changer(s.cle, { objet: e.target.value })} placeholder="porte_hall" />
                        </label>
                      </div>
                    ) : s.genre === "presence" ? (
                      <div className="lor-tolerances">
                        <label className="rv-libelle">Pièce attendue
                          <select className="rv-champ" value={s.role} onChange={(e) => changer(s.cle, { role: e.target.value as RolePieceControle })}>
                            {(Object.entries(ROLES) as [RolePieceControle, string][]).map(([cle, libelle]) => <option key={cle} value={cle}>{libelle}</option>)}
                          </select>
                        </label>
                        <label className="rv-libelle">Champ lu sur chacune <span className="esp-kpi-sous">(facultatif)</span>
                          <input className="rv-champ" value={s.champ} maxLength={80} onChange={(e) => changer(s.cle, { champ: e.target.value })} placeholder="indice" />
                        </label>
                      </div>
                    ) : null}
                  </div>
                ))}
                <div><button type="button" className="esp-lien-bouton" disabled={saisies.length >= 100} onClick={ajouter}>Ajouter un point</button></div>
              </fieldset>
              {probleme ? <Avis teinte="ambre" role="status">{probleme}</Avis> : null}
              {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
            </div>
          )}
        </DialogBody>
        <DialogFooter>
          {edition === null ? (
            peutTenir ? <button type="button" className="r-btn r-btn--noir" disabled={envoi || listes.length >= 50} onClick={() => ouvrirEdition(null)}>Nouvelle liste</button> : null
          ) : (
            <>
              <button type="button" className="r-btn r-btn--fil" disabled={envoi} onClick={() => setEdition(null)}>Retour aux listes</button>
              <button type="button" className="r-btn r-btn--noir" disabled={!!probleme || envoi} onClick={enregistrer}>{envoi ? <Loader variant="spin" /> : null} Enregistrer la version {edition === "nouvelle" ? 1 : edition.version + 1}</button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
