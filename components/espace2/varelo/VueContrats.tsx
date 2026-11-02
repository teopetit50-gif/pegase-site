"use client";

/* ══════════════════════════════════════════════════════════════════════
   VARELO — « Contrats » (/espace2/varelo/contrats), 02/11/2026, refonte des
   pages métiers : Plain, Accounts (ex-Tenants), la liste et la fiche d'un
   compte, au 1:1. Relevés : plain-commun.md, plain-tenants.md,
   plain-tenant.md ; styles ./var-plain.css (préfixe var-p-).

   Ce qu'elle reprend de l'écran d'avant (bloc 14 de l'inventaire) :
     · la liste des contrats du groupe = le tableau des Accounts : une ligne
       par contrat, toute la ligne ouvre sa fiche (?contrat=<id>) ; colonnes
       Jours restants (le cercle d'« Open threads », teinté par l'état du
       délai), Catégorie (pastille du Tier), Reconduction (Source), Société
       (Ville), Montant annuel (MRR), Échéance (Renouvellement), Dénoncé
       (booléen), Décision (pastille, comme Modules) ;
     · les filtres « À surveiller / Dénoncés / Tous » = menu « Filters » (F) ;
       les colonnes = popover « Display » (V) ; le tri = menu de l'en-tête
       (« Sorted by … » et sa croix) ; la recherche ; « Load more » par 25 ;
     · « Ajouter un contrat » (G24) = « Create account » ;
     · la fiche : « ← Contrats », vignette, intitulé, méta ; le menu « … »
       porte Corriger (G25), Faire valider (G26), Dénoncé… (G27), Archiver
       (G28), et « Ouvrir le tiers dans le référentiel » (lien d'avant) ;
       le contrôle segmenté : Étapes (Tasks : faire valider, dénoncer),
       Contrats du tiers (Customers), Notes ; le volet « Details » :
       Référence, Catégorie, Tiers ; Échéance (échéance, reconduction,
       préavis, date limite) ; Suivi (montant, statut, décision) ;
     · les quatre compteurs d'avant (sous 30 j, sous 90 j, montant en jeu,
       reconduits) : la phrase de méta sous le titre de la liste n'existant
       pas chez Plain, ils passent dans le menu « Filters » comme comptes.
   Les fenêtres (14.a, 14.b) sont celles de l'écran d'avant. Faire valider
   et Archiver demandent maintenant une confirmation.
   ══════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { dateCourte, montant } from "@/components/espace/format";
import { DialogueContrat, DialogueDenonciation, useContratsGroupe } from "@/components/espace/varelo/CarteContrats";
import { CATEGORIES, LIBELLE_DELAI, type Contrat } from "@/components/espace/varelo/contrats";
import { etiquetteDecision } from "@/components/espace/varelo/decisions";
import { RACINE } from "../modules";
import { useVarelo } from "./donnees";
import { VarCarte } from "./VarCadre";
import { PlainIcone, type NomPlainIcone } from "./PlainIcone";
import { MenuPlain, useOuvert, useTouche, type OptionPlain } from "./PlainCadre";
import { Confirmer, type Demande } from "./Confirmer";
import "./var-plain.css";

const ICI = `${RACINE}/varelo/contrats`;
const PAR_PAGE = 25;

type Filtre = "a_surveiller" | "denonces" | "tous";
type Colonne = "jours" | "categorie" | "reconduction" | "societe" | "montant" | "echeance" | "denonce" | "decision";
type Tri = { col: "nom" | Colonne; sens: "asc" | "desc" } | null;

const COLONNES: { cle: Colonne; libelle: string; icone: NomPlainIcone; droite?: boolean }[] = [
  { cle: "jours", libelle: "Jours restants", icone: "Cercle", droite: true },
  { cle: "categorie", libelle: "Catégorie", icone: "Tier" },
  { cle: "reconduction", libelle: "Reconduction", icone: "Source" },
  { cle: "societe", libelle: "Société", icone: "Batiment" },
  { cle: "montant", libelle: "Montant annuel (€)", icone: "Tri", droite: true },
  { cle: "echeance", libelle: "Échéance", icone: "Affichage" },
  { cle: "denonce", libelle: "Dénoncé", icone: "Coche" },
  { cle: "decision", libelle: "Décision", icone: "Filtres" },
];
const COULEUR_CATEGORIE: Record<string, string> = { prestation: "#7048E8", maintenance: "#1971C2", location: "#2F9E44", abonnement: "#F08C00", licence: "#7048E8", assurance: "#1971C2", fourniture: "#2F9E44", bail: "#F08C00", autre: "#868e96" };
const COULEUR_DELAI: Record<string, string> = { depasse: "var(--p-rouge-icone)", urgent: "var(--p-rouge-icone)", bientot: "var(--p-jaune-icone)", large: "var(--p-bleu-icone)", sans_objet: "var(--p-i2)" };
const RECONDUCTION: Record<string, string> = { tacite: "Tacite", expresse: "Expresse", aucune: "Aucune" };
const libelleCategorie = (c: Contrat) => CATEGORIES.find((x) => x.cle === c.categorie)?.libelle ?? c.categorie;
const jours = (n: number) => `${n} jour${Math.abs(n) > 1 ? "s" : ""}`;

export default function VueContrats() {
  const v = useVarelo();
  const params = useSearchParams();
  const routeur = useRouter();
  const ouvertId = params.get("contrat");
  const societes = useMemo(() => v.donnees?.societes ?? [], [v.donnees]);
  const objets = useMemo(() => v.donnees?.objets ?? [], [v.donnees]);
  const c = useContratsGroupe({ source: v.source, contexte: v.contexte, client_id: v.client_id, societes, objets, onFait: v.setFait });
  const [confirmer, setConfirmer] = useState<Demande | null>(null);

  const tous = c.tous ?? [];
  const contrat = ouvertId ? (tous.find((k) => k.id === ouvertId) ?? null) : null;

  const demanderValidation = (k: Contrat) =>
    setConfirmer({
      titre: "Faire valider la dénonciation",
      texte: `La dénonciation de « ${k.intitule} » (${k.tiers}, ${k.societe}) part à la direction juridique, avec son calcul : échéance du ${dateCourte(k.echeance_courante)} − préavis de ${k.preavis_valeur} ${k.preavis_unite} = date limite du ${dateCourte(k.date_limite)}.`,
      bouton: "Envoyer à la direction juridique",
      faire: () => c.faireValider(k),
    });
  const demanderArchivage = (k: Contrat) =>
    setConfirmer({
      titre: "Archiver le contrat",
      texte: `« ${k.intitule} » ne sera plus suivi : sa date limite de dénonciation ne lèvera plus d'alerte.`,
      bouton: "Archiver",
      faire: () => c.archiver(k),
    });

  return (
    <VarCarte className="var--plain">
      <h1 className="v2-sr">Contrats</h1>
      {contrat ? (
        <Fiche k={contrat} tous={tous} c={c} onValider={demanderValidation} onArchiver={demanderArchivage} />
      ) : ouvertId && v.source === "reelle" && !c.reels ? (
        <div className="var-p-page">
          <p className="var-p-texte-libre">Lecture du contrat…</p>
        </div>
      ) : (
        <Liste c={c} ouvrir={(id) => routeur.push(`${ICI}?contrat=${encodeURIComponent(id)}`, { scroll: false })} introuvable={!!ouvertId} />
      )}
      {c.edition ? <DialogueContrat contrat={c.edition === "nouveau" ? null : c.edition} societes={societes} objets={objets} onFermer={() => c.setEdition(null)} enregistrer={c.enregistrer} onFait={v.setFait} /> : null}
      {c.denonce ? <DialogueDenonciation c={c.denonce} onFermer={() => c.setDenonce(null)} denoncer={c.denoncer} onFait={v.setFait} /> : null}
      <Confirmer demande={confirmer} onFermer={() => setConfirmer(null)} />
    </VarCarte>
  );
}

type C = ReturnType<typeof useContratsGroupe>;

/* ——— la liste (Accounts) ——— */
function Liste({ c, ouvrir, introuvable }: { c: C; ouvrir: (id: string) => void; introuvable: boolean }) {
  const v = useVarelo();
  const [recherche, setRecherche] = useState("");
  const [tri, setTri] = useState<Tri>(null);
  const [masquees, setMasquees] = useState<Colonne[]>([]);
  const [nombre, setNombre] = useState(PAR_PAGE);
  const { ouvert: filtresOuvert, setOuvert: setFiltresOuvert, boite: filtresBoite } = useOuvert<HTMLDivElement>();
  const { ouvert: affichageOuvert, setOuvert: setAffichageOuvert, boite: affichageBoite } = useOuvert<HTMLDivElement>();
  const [menuCol, setMenuCol] = useState<"nom" | Colonne | null>(null);
  const basculerFiltres = useCallback(() => setFiltresOuvert((o) => !o), [setFiltresOuvert]);
  const basculerAffichage = useCallback(() => setAffichageOuvert((o) => !o), [setAffichageOuvert]);
  useTouche("f", basculerFiltres);
  useTouche("v", basculerAffichage);

  const lignes = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    const l = q ? c.liste.filter((k) => [k.intitule, k.tiers, k.societe, k.reference ?? "", libelleCategorie(k)].some((x) => x.toLowerCase().includes(q))) : c.liste;
    if (!tri) return l;
    const val = (k: Contrat): string | number => {
      switch (tri.col) {
        case "nom": return k.intitule.toLowerCase();
        case "jours": return k.reconduction === "aucune" ? 1e9 : k.jours_restants;
        case "categorie": return libelleCategorie(k);
        case "reconduction": return k.reconduction;
        case "societe": return k.societe;
        case "montant": return k.montant_annuel ?? -1;
        case "echeance": return k.echeance_courante;
        case "denonce": return k.statut === "denonce" ? 1 : 0;
        case "decision": return c.decisionDe("denoncer_contrat", k.id)?.statut ?? "";
      }
    };
    const s = tri.sens === "asc" ? 1 : -1;
    return [...l].sort((a, b) => (val(a) < val(b) ? -s : val(a) > val(b) ? s : 0));
  }, [c, recherche, tri]);
  const visibles = COLONNES.filter((k) => !masquees.includes(k.cle));
  const libelleTri = tri ? (tri.col === "nom" ? "Contrat" : COLONNES.find((k) => k.cle === tri.col)?.libelle) : "Date limite";

  const FILTRES: [Filtre, string][] = [
    ["a_surveiller", `À surveiller · ${c.compte.urgent} sous 30 j, ${c.compte.bientot} sous 90 j`],
    ["denonces", "Dénoncés"],
    ["tous", `Tous · ${c.compte.reconduits} reconduit${c.compte.reconduits > 1 ? "s" : ""}`],
  ];

  const enTete = (cle: "nom" | Colonne, libelle: string, icone: NomPlainIcone | null, droite?: boolean) => (
    <th key={cle} style={{ position: cle === "nom" ? "sticky" : undefined }}>
      <div style={{ position: "relative" }}>
        <button type="button" className={`var-p-th${droite ? " var-p-th--droite" : ""}`} aria-label={`Options pour ${libelle}`} aria-haspopup="menu" aria-expanded={menuCol === cle} onClick={() => setMenuCol(menuCol === cle ? null : cle)}>
          {icone ? <PlainIcone nom={icone} /> : null}
          <span>{libelle}</span>
          {tri?.col === cle ? <PlainIcone nom={tri.sens === "asc" ? "FlecheHaut" : "FlecheBas"} /> : null}
        </button>
        {menuCol === cle ? (
          <MenuPlain
            libelle={`Options pour ${libelle}`}
            style={{ top: 34, right: droite ? 0 : undefined, left: droite ? undefined : 0 }}
            onFermer={() => setMenuCol(null)}
            options={[
              { libelle: "Trier en ordre croissant", icone: "FlecheHaut", coche: tri?.col === cle && tri.sens === "asc", action: () => setTri({ col: cle, sens: "asc" }) },
              { libelle: "Trier en ordre décroissant", icone: "FlecheBas", coche: tri?.col === cle && tri.sens === "desc", action: () => setTri({ col: cle, sens: "desc" }) },
              ...(cle === "nom" ? [] : (["sep", { libelle: "Masquer dans le tableau", icone: "Oeil" as const, action: () => setMasquees((m) => [...m, cle as Colonne]) }] as OptionPlain[])),
            ]}
          />
        ) : null}
      </div>
    </th>
  );

  const cellule = (k: Contrat, col: Colonne) => {
    switch (col) {
      case "jours":
        return k.statut === "actif" && k.reconduction !== "aucune" ? (
          <span className="var-p-compte" title={`${LIBELLE_DELAI[k.etat_delai].libelle} : dénoncer avant le ${dateCourte(k.date_limite)}`}>
            <PlainIcone nom="Cercle" style={{ color: COULEUR_DELAI[k.etat_delai] }} />
            {k.jours_restants}
          </span>
        ) : (
          <span className="var-p-tiret" style={{ display: "block", textAlign: "right" }}>–</span>
        );
      case "categorie":
        return (
          <span className="var-p-pastille">
            <PlainIcone nom="Tier" style={{ color: COULEUR_CATEGORIE[k.categorie] }} />
            {libelleCategorie(k)}
          </span>
        );
      case "reconduction":
        return (
          <span className="var-p-texte">
            <PlainIcone nom="Api" />
            {RECONDUCTION[k.reconduction]}
          </span>
        );
      case "societe":
        return <span className="var-p-gris">{k.societe}</span>;
      case "montant":
        return k.montant_annuel === null ? <span className="var-p-tiret" style={{ display: "block", textAlign: "right" }}>–</span> : <span className="var-p-gris" style={{ display: "block", textAlign: "right" }}>{Math.round(k.montant_annuel)}</span>;
      case "echeance":
        return <span className="var-p-gris">{dateCourte(k.echeance_courante)}</span>;
      case "denonce":
        return (
          <span className="var-p-booleen" data-oui={k.statut === "denonce" ? "" : undefined}>
            {k.statut === "denonce" ? "Oui" : "Non"}
          </span>
        );
      case "decision": {
        const d = c.decisionDe("denoncer_contrat", k.id);
        return d ? <span className="var-p-pastille var-p-pastille--nue" title={d.calcul ?? undefined}>{etiquetteDecision(d).libelle}</span> : <span className="var-p-tiret">–</span>;
      }
    }
  };

  return (
    <div className="var-p-page">
      <header className="var-p-tete">
        <div className="var-p-titre">
          <PlainIcone nom="Batiment" />
          <h2 className="var-p-h1">Contrats</h2>
        </div>
        <div className="var-p-actions">
          <div ref={filtresBoite} style={{ position: "relative" }}>
            <button type="button" className="var-p-fantome" aria-haspopup="menu" aria-expanded={filtresOuvert} onClick={basculerFiltres}>
              <PlainIcone nom="Filtres" />
              Filtres
            </button>
            {filtresOuvert ? (
              <MenuPlain libelle="Filtres" style={{ top: 42, right: 0, minWidth: 260 }} onFermer={() => setFiltresOuvert(false)} options={FILTRES.map(([k, l]) => ({ libelle: l, coche: c.filtre === k, action: () => c.setFiltre(k) }))} />
            ) : null}
          </div>
          <div ref={affichageBoite} style={{ position: "relative" }}>
            <button type="button" className="var-p-fantome" aria-haspopup="dialog" aria-expanded={affichageOuvert} onClick={basculerAffichage}>
              <PlainIcone nom="Affichage" />
              Affichage
              <span className="var-p-kbd">V</span>
            </button>
            {affichageOuvert ? (
              <div className="var-p-pop" role="dialog" aria-label="Affichage" style={{ top: 42, right: 0 }}>
                <p className="var-p-pop-titre">Colonnes du tableau</p>
                {COLONNES.map((k) => {
                  const vue = !masquees.includes(k.cle);
                  return (
                    <div key={k.cle} className="var-p-pop-ligne">
                      <PlainIcone nom={k.icone} />
                      <span>{k.libelle}</span>
                      <button type="button" className="var-p-oeil" aria-pressed={vue} aria-label={vue ? `Masquer ${k.libelle}` : `Montrer ${k.libelle}`} onClick={() => setMasquees((m) => (vue ? [...m, k.cle] : m.filter((x) => x !== k.cle)))}>
                        <PlainIcone nom="Oeil" />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
          {c.peutSaisir ? (
            <button type="button" className="var-p-second" onClick={() => c.setEdition("nouveau")}>
              <PlainIcone nom="Plus" />
              Ajouter un contrat
            </button>
          ) : null}
        </div>
      </header>

      <section className="var-p-section" aria-label="Contrats du groupe">
        <div className="var-p-outils">
          <label className="var-p-recherche">
            <PlainIcone nom="Loupe" />
            <input type="search" placeholder="Chercher" aria-label="Chercher un contrat, un tiers, une société" value={recherche} onChange={(e) => setRecherche(e.target.value)} />
          </label>
          <span className="var-p-tri">
            <PlainIcone nom="Tri" />
            <span>
              Trié par <strong>{libelleTri}</strong>
            </span>
            {tri ? (
              <button type="button" aria-label="Retirer le tri" title="Retirer le tri" onClick={() => setTri(null)}>
                <PlainIcone nom="Croix" />
              </button>
            ) : null}
          </span>
        </div>

        {introuvable ? <p className="var-p-texte-libre">Ce contrat n&apos;est pas dans la liste : archivé, ou hors de votre périmètre.</p> : null}
        {c.erreur ? <p className="var-p-texte-libre" role="alert">Les contrats n&apos;ont pas pu être lus. {c.erreur}</p> : null}
        {v.source === "reelle" && !c.reels ? (
          <p className="var-p-texte-libre">Lecture des contrats…</p>
        ) : lignes.length === 0 ? (
          <div className="var-p-vide">
            <strong>{c.filtre === "denonces" ? "Aucun contrat dénoncé" : "Aucun contrat"}</strong>
            <p>{recherche ? "Rien ne répond à cette recherche." : c.peutSaisir ? "Ajoutez les contrats de chaque société : leur date limite de dénonciation s'affiche ici, et une alerte vous prévient 30 jours avant." : "Les contrats du groupe s'affichent ici dès qu'une société les a enregistrés."}</p>
          </div>
        ) : (
          <div className="var-p-tableau-cadre">
            <table className="var-p-table">
              <thead>
                <tr>
                  {enTete("nom", "Contrat", null)}
                  {visibles.map((k) => enTete(k.cle, k.libelle, k.icone, k.droite))}
                </tr>
              </thead>
              <tbody>
                {lignes.slice(0, nombre).map((k) => (
                  <tr key={k.id}>
                    <td>
                      <a href={`${ICI}?contrat=${encodeURIComponent(k.id)}`} className="var-p-plein" aria-label={`Ouvrir « ${k.intitule} »`} onClick={(e) => { e.preventDefault(); ouvrir(k.id); }} />
                      <span className="var-p-nom">
                        <span className="var-p-vignette">
                          <PlainIcone nom="Batiment" />
                        </span>
                        <span>{k.intitule}</span>
                      </span>
                    </td>
                    {visibles.map((col) => (
                      <td key={col.cle}>{cellule(k, col.cle)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {lignes.length > nombre ? (
              <div className="var-p-pied">
                <button type="button" className="var-p-second" onClick={() => setNombre((n) => n + PAR_PAGE)}>
                  Voir plus
                </button>
              </div>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}

/* ——— la fiche (page d'un account) ——— */
function Fiche({ k, tous, c, onValider, onArchiver }: { k: Contrat; tous: Contrat[]; c: C; onValider: (k: Contrat) => void; onArchiver: (k: Contrat) => void }) {
  const routeur = useRouter();
  const [onglet, setOnglet] = useState<"etapes" | "tiers" | "notes">("etapes");
  const [volet, setVolet] = useState(true);
  const { ouvert: plusOuvert, setOuvert: setPlusOuvert, boite: plusBoite } = useOuvert<HTMLDivElement>();
  const decision = c.decisionDe("denoncer_contrat", k.id);
  const peutValider = c.peutSaisir && !decision && k.statut === "actif" && k.reconduction === "tacite" && k.jours_restants >= 0;
  const duTiers = tous.filter((x) => x.id !== k.id && x.statut !== "archive" && ((k.objet_id && x.objet_id === k.objet_id) || (!k.objet_id && x.tiers === k.tiers)));
  const lienTiers = k.objet_id ? `${RACINE}/varelo/referentiel?objet=${encodeURIComponent(k.objet_id)}${k.nature ? `&nature=${k.nature}` : ""}` : null;
  const preavis = `${k.preavis_valeur} ${k.preavis_unite === "mois" ? "mois" : jours(k.preavis_valeur).replace(/^\d+ /, "")}`;

  const options: OptionPlain[] = [
    ...(c.peutSaisir && k.statut !== "archive" ? [{ libelle: "Corriger", action: () => c.setEdition(k) }] : []),
    ...(peutValider ? [{ libelle: "Faire valider la dénonciation", action: () => onValider(k) }] : []),
    ...(c.peutDenoncer && k.statut === "actif" && k.reconduction !== "aucune" ? [{ libelle: "Dénoncé…", action: () => c.setDenonce(k) }] : []),
    ...(lienTiers ? ["sep" as const, { libelle: "Ouvrir le tiers dans le référentiel", action: () => routeur.push(lienTiers) }] : []),
    ...(c.peutArchiver && k.statut !== "archive" ? ["sep" as const, { libelle: "Archiver", action: () => onArchiver(k) }] : []),
  ];

  const etapes = [
    { id: "ÉTAPE-1", titre: decision ? etiquetteDecision(decision).libelle : "Faire valider la dénonciation par la direction juridique", fait: !!decision && decision.statut !== "en_attente", sous: decision?.calcul ?? `Échéance du ${dateCourte(k.echeance_courante)} − préavis de ${preavis} = date limite du ${dateCourte(k.date_limite)}` },
    { id: "ÉTAPE-2", titre: k.statut === "denonce" ? `Dénoncé le ${dateCourte(k.denonce_le)}` : `Envoyer la dénonciation avant le ${dateCourte(k.date_limite)}`, fait: k.statut === "denonce", sous: k.statut === "actif" && k.reconduction !== "aucune" ? (k.jours_restants >= 0 ? `dans ${jours(k.jours_restants)}` : `délai passé depuis ${jours(-k.jours_restants)}`) : (k.motif ?? "") },
  ];

  return (
    <div className="var-p-fiche">
      <div className="var-p-colonne">
        <header className="var-p-fiche-tete">
          <div className="var-p-fiche-bloc">
            <Link href={ICI} scroll={false} className="var-p-retour">
              <PlainIcone nom="Retour" />
              Contrats
            </Link>
            <div className="var-p-fiche-titre">
              <span className="var-p-vignette">
                <PlainIcone nom="Batiment" />
              </span>
              <span className="var-p-fiche-nom">{k.intitule}</span>
              <span className="var-p-meta">
                {k.societe} · <strong>{k.tiers}</strong>
                {k.reconduit ? ` · reconduit (échéance d'origine ${dateCourte(k.date_echeance)})` : ""}
              </span>
            </div>
          </div>
          <div className="var-p-fiche-actions" ref={plusBoite}>
            <button type="button" className="var-p-icone" aria-label="Plus d'actions" aria-haspopup="menu" aria-expanded={plusOuvert} onClick={() => setPlusOuvert((o) => !o)} disabled={options.length === 0}>
              <PlainIcone nom="Points" />
            </button>
            <button type="button" className="var-p-icone" aria-label={volet ? "Masquer le volet" : "Montrer le volet"} aria-pressed={volet} onClick={() => setVolet((x) => !x)}>
              <PlainIcone nom="Volet" />
            </button>
            {plusOuvert ? <MenuPlain libelle="Actions sur le contrat" style={{ top: 36, right: 0, minWidth: 220 }} onFermer={() => setPlusOuvert(false)} options={options} /> : null}
          </div>
        </header>

        <div className="var-p-onglets">
          <div className="var-p-segmente" role="radiogroup" aria-label="Vue de la fiche">
            {(
              [
                ["etapes", "Étapes"],
                ["tiers", "Contrats du tiers"],
                ["notes", "Notes"],
              ] as const
            ).map(([cle, l]) => (
              <button key={cle} type="button" role="radio" aria-checked={onglet === cle} className="var-p-segment" onClick={() => setOnglet(cle)}>
                {l}
              </button>
            ))}
          </div>
          <div className="var-p-onglets-droite">
            {onglet === "etapes" && peutValider ? (
              <button type="button" className="var-p-second" onClick={() => onValider(k)}>
                Faire valider
                <PlainIcone nom="Plus" />
              </button>
            ) : null}
            {onglet === "etapes" && c.peutDenoncer && k.statut === "actif" && k.reconduction !== "aucune" ? (
              <button type="button" className="var-p-second" onClick={() => c.setDenonce(k)}>
                Dénoncé…
              </button>
            ) : null}
          </div>
        </div>

        {onglet === "etapes" ? (
          <ul>
            {etapes.map((e) => (
              <li key={e.id} className="var-p-tache">
                <span className="var-p-case" data-fait={e.fait ? "" : undefined} aria-label={e.fait ? "Fait" : "À faire"} />
                <span className="var-p-tache-ligne1">
                  <span className="var-p-tache-id">{e.id}</span>
                  <span className="var-p-tache-titre">{e.titre}</span>
                </span>
                <span />
                <span className="var-p-tache-ligne2">
                  <span className="var-p-pastille">
                    <PlainIcone nom="Batiment" />
                    {k.societe}
                  </span>
                  {e.sous ? <span className="var-p-gris">{e.sous}</span> : null}
                </span>
              </li>
            ))}
          </ul>
        ) : onglet === "tiers" ? (
          duTiers.length ? (
            <ul>
              {duTiers.map((x) => (
                <li key={x.id}>
                  <Link href={`${ICI}?contrat=${encodeURIComponent(x.id)}`} scroll={false} className="var-p-rangee">
                    <span className="var-p-avatar">{x.societe.charAt(0)}</span>
                    <span className="var-p-rangee-nom">{x.intitule}</span>
                    <span className="var-p-rangee-second">
                      {x.societe} · échéance {dateCourte(x.echeance_courante)}
                      {x.montant_annuel !== null ? ` · ${montant(x.montant_annuel)} par an` : ""}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="var-p-vide">
              <strong>Aucun autre contrat chez ce tiers</strong>
              <p>Quand une autre société du groupe enregistre un contrat avec {k.tiers}, il s&apos;affiche ici : une négociation à mener pour tout le groupe.</p>
            </div>
          )
        ) : k.notes ? (
          <p className="var-p-texte-libre">{k.notes}</p>
        ) : (
          <div className="var-p-vide">
            <strong>Aucune note</strong>
            <p>Les notes se posent en corrigeant le contrat.</p>
          </div>
        )}
      </div>

      {volet ? (
        <aside className="var-p-volet" aria-label="Détails" data-ouvert="">
          {/* à 768 et moins, le volet est une feuille plein écran : Plain y rappelle le titre */}
          <div className="var-p-rappel">
            <Link href={ICI} scroll={false} className="var-p-retour">
              <PlainIcone nom="Retour" />
              Contrats
            </Link>
            <div className="var-p-fiche-titre">
              <span className="var-p-vignette">
                <PlainIcone nom="Batiment" />
              </span>
              <span className="var-p-fiche-nom">{k.intitule}</span>
              <span className="var-p-meta">
                {k.societe} · <strong>{k.tiers}</strong>
              </span>
            </div>
            <button type="button" className="var-p-icone var-p-rappel-fermer" aria-label="Masquer le volet" onClick={() => setVolet(false)}>
              <PlainIcone nom="Volet" />
            </button>
          </div>
          <h2>Détails</h2>
          <div className="var-p-pile">
            <dl className="var-p-bloc">
              <div className="var-p-prop">
                <dt>Référence</dt>
                <dd className="var-p-mono">{k.reference || "–"}</dd>
              </div>
              <div className="var-p-prop">
                <dt>Catégorie</dt>
                <dd>
                  <span className="var-p-pastille">
                    <PlainIcone nom="Tier" style={{ color: COULEUR_CATEGORIE[k.categorie] }} />
                    {libelleCategorie(k)}
                  </span>
                </dd>
              </div>
              <div className="var-p-prop">
                <dt>Tiers</dt>
                <dd>{lienTiers ? <Link href={lienTiers} className="var-p-lien">{k.code_groupe ? `${k.code_groupe} · ` : ""}{k.tiers}</Link> : k.tiers}</dd>
              </div>
              <div className="var-p-prop">
                <dt>Société</dt>
                <dd>{k.societe}</dd>
              </div>
            </dl>
            <dl className="var-p-bloc">
              <p className="var-p-bloc-titre">Échéance</p>
              <div className="var-p-prop">
                <dt>Échéance</dt>
                <dd>{dateCourte(k.echeance_courante)}</dd>
              </div>
              <div className="var-p-prop">
                <dt>Reconduction</dt>
                <dd>{k.reconduction === "tacite" ? `Tacite, ${k.duree_reconduction_mois} mois` : RECONDUCTION[k.reconduction]}</dd>
              </div>
              <div className="var-p-prop">
                <dt>Préavis</dt>
                <dd>{preavis}</dd>
              </div>
              <div className="var-p-prop">
                <dt>Dénoncer avant le</dt>
                <dd>{k.reconduction === "aucune" ? "–" : dateCourte(k.date_limite)}</dd>
              </div>
            </dl>
            <dl className="var-p-bloc">
              <p className="var-p-bloc-titre">Suivi</p>
              <div className="var-p-prop">
                <dt>Montant annuel</dt>
                <dd>{k.montant_annuel === null ? "–" : montant(k.montant_annuel)}</dd>
              </div>
              <div className="var-p-prop">
                <dt>État</dt>
                <dd>{k.statut === "denonce" ? `Dénoncé le ${dateCourte(k.denonce_le)}` : k.statut === "archive" ? "Archivé" : LIBELLE_DELAI[k.etat_delai].libelle}</dd>
              </div>
              <div className="var-p-prop">
                <dt>Décision</dt>
                <dd>{decision ? etiquetteDecision(decision).libelle : "–"}</dd>
              </div>
              <div className="var-p-prop">
                <dt>Contrats du tiers</dt>
                <dd>
                  {k.contrats_du_tiers} contrat{k.contrats_du_tiers > 1 ? "s" : ""}, {k.societes_du_tiers} société{k.societes_du_tiers > 1 ? "s" : ""}
                </dd>
              </div>
            </dl>
          </div>
        </aside>
      ) : null}
    </div>
  );
}
