"use client";

/* ══════════════════════════════════════════════════════════════════════
   VARELO — « Référentiel » (/espace2/varelo/referentiel), 02/11/2026,
   refonte des pages métiers : Attio, liste People et fiche d'un contact,
   au 1:1. Relevé : attio-people.md (complément « Après import ») ; styles
   ./var-attio.css (préfixe var-a-).

   Ce qu'elle reprend de l'écran d'avant (blocs 9-12, 16, 21, G2, G3) :
     · la nature en haut (9) = le sélecteur de vue d'Attio (« Recently
       Contacted People ⌄ ») : Fournisseurs, Clients, Articles, Sites ; les
       lots à côté de la liste (16) = deux vues du même sélecteur : « Lots à
       valider » et « Dernières décisions » ;
     · les quatre compteurs (10) = le pied de la grille (« 77 count » et
       les calculs de chaque colonne) : objets, codes locaux (et à traiter),
       paires à valider (et lots dans la file), taux de rattachement ;
     · la liste (11) = la grille People : objet du groupe (pastille), état
       de rattachement (la pastille de « Connection strength »), codes
       locaux, sociétés ; la recherche = « Filter » ; le tri d'avant
       (à valider d'abord) = « Sorted by » ;
     · la fiche d'un objet (12, 12.a) = la fiche d'un contact : détails à
       gauche (code, nom, origine, nature, intragroupe), actions Proposer un
       nom, Fusionner dans…, Scinder (G5-G7) ; à droite « Highlights », les
       codes de chaque société avec Rattacher ailleurs et Détacher (G8, G9),
       les propositions en attente ;
     · « Import / Export » : Exporter (CSV) (G3) et le renvoi vers le dépôt
       d'un export (Sources et structure, sa seule entrée) ;
     · « New Person » = « Lancer un passage » (G2, fenêtre 21, confirmée) ;
     · Écarter une paire (G10) et « Décider dans la file » dans la vue des
       lots ; « ?objet=<id>&nature=… » ouvre la fiche (liens d'Encours, de
       Contrats et d'Opérations).
   ══════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { dateCourte, dateHeure, pourcent, relatif } from "@/components/espace/format";
import { DialogueCorrection, useObjetDetail } from "@/components/espace/varelo/ObjetDetail";
import { DialogueEcarter, LIBELLE_PROP, LIBELLE_STATUT, raisonTexte, useLots } from "@/components/espace/varelo/Lots";
import { LIBELLE_ETAT, LIBELLE_METHODE, LIBELLE_NATURE, LIBELLE_TYPE_ACTION, NATURES, type Nature, type Objet, type TypeActionRef } from "@/components/espace/varelo/types";
import { RACINE } from "../modules";
import { useVarelo } from "./donnees";
import { VarCarte } from "./VarCadre";
import { VarIcone, type NomVarIcone } from "./VarIcone";
import { Confirmer, type Demande } from "./Confirmer";
import { copier, exporterCsv, useFavoris } from "./local";
import { useToast } from "../Toasts";
import "./var-attio.css";

const ICI = `${RACINE}/varelo/referentiel`;
type Vue = Nature | "lots" | "decisions";
type ColonneA = "rattachement" | "codes" | "societes" | "maj";
const COLONNES_A: { cle: ColonneA; libelle: string; largeur: number }[] = [
  { cle: "rattachement", libelle: "Rattachement", largeur: 215 },
  { cle: "codes", libelle: "Codes locaux", largeur: 288 },
  { cle: "societes", libelle: "Sociétés", largeur: 310 },
  { cle: "maj", libelle: "Mis à jour", largeur: 250 },
];
const majuscule = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const ICONE_NATURE: Record<Nature, NomVarIcone> = { fournisseur: "Box", client: "Users", article: "Cart", site: "Factory" };
const initiales = (nom: string) =>
  nom
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((m) => m.charAt(0).toUpperCase())
    .join("");

export default function VueReferentiel() {
  const v = useVarelo();
  const params = useSearchParams();
  const routeur = useRouter();
  const objetId = params.get("objet");
  const natureParam = params.get("nature") as Nature | null;
  const vueParam = params.get("vue");
  const donnees = v.donnees;
  const [confirmer, setConfirmer] = useState<Demande | null>(null);
  const [menu, setMenu] = useState<"vue" | "reglages" | "export" | "plus" | null>(null);
  /* « View settings » : les colonnes affichées */
  const [masquees, setMasquees] = useState<ColonneA[]>([]);
  const toast = useToast();
  const [filtre, setFiltre] = useState(false);
  const vue: Vue = vueParam === "lots" ? "lots" : vueParam === "decisions" ? "decisions" : v.nature;

  /* un lien vers un objet (encours, contrat, réception) choisit sa nature */
  const objet = objetId ? (donnees?.objets.find((o) => o.id === objetId) ?? null) : null;
  const { nature, setNature } = v;
  useEffect(() => {
    const n = objet?.nature ?? (natureParam && NATURES.includes(natureParam) ? natureParam : null);
    if (n && n !== nature) setNature(n);
  }, [objet, natureParam, nature, setNature]);

  useEffect(() => {
    if (!menu) return;
    const dehors = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest("[data-var-menu]")) setMenu(null);
    };
    const echap = (e: KeyboardEvent) => e.key === "Escape" && setMenu(null);
    document.addEventListener("mousedown", dehors);
    document.addEventListener("keydown", echap);
    return () => {
      document.removeEventListener("mousedown", dehors);
      document.removeEventListener("keydown", echap);
    };
  }, [menu]);

  const choisirVue = (x: Vue) => {
    setMenu(null);
    if (x === "lots" || x === "decisions") routeur.push(`${ICI}?vue=${x}`, { scroll: false });
    else {
      v.setNature(x);
      routeur.push(ICI, { scroll: false });
    }
  };
  const libelleVue = vue === "lots" ? "Lots à valider" : vue === "decisions" ? "Dernières décisions" : `${majuscule(LIBELLE_NATURE[vue].des)} du groupe`;
  const lancer = () =>
    setConfirmer({
      titre: "Lancer un passage de rapprochement",
      texte: `Le calcul range les codes déposés : il ouvre un objet pour chaque tiers nouveau, place d'office ceux qu'un identifiant commun prouve (SIREN, TVA, IBAN, GTIN), propose les paires probables et forme les lots à valider. ${v.compteurs.a_traiter ? `${v.compteurs.a_traiter} code${v.compteurs.a_traiter > 1 ? "s" : ""} ${LIBELLE_NATURE[v.nature].un}${v.compteurs.a_traiter > 1 ? "s" : ""} attend${v.compteurs.a_traiter > 1 ? "ent" : ""} ce passage.` : "Aucun code n'attend : le passage revérifie les propositions ouvertes et applique les décisions prises."}`,
      bouton: "Lancer maintenant",
      faire: () => v.lancer(),
    });

  return (
    <VarCarte className="var--attio">
      <h1 className="v2-sr">Référentiel du groupe</h1>
      <div className="var-a-page">
        <header className="var-a-tete">
          <span className="var-a-fil">
            <span className="var-a-objet" aria-hidden="true">
              <VarIcone nom={vue === "lots" || vue === "decisions" ? "Checklist" : ICONE_NATURE[vue]} />
            </span>
            {objet ? (
              <>
                <Link href={ICI} scroll={false}>
                  {majuscule(LIBELLE_NATURE[objet.nature].des)}
                </Link>
                <span className="var-a-vide">/</span>
                <span>
                  {objet.code_groupe} {objet.nom_groupe}
                </span>
              </>
            ) : (
              <span>Référentiel</span>
            )}
          </span>
          <span className="var-a-pousse" />
          <button type="button" className="var-a-lien-tete" onClick={() => void copier(window.location.href).then((ok) => toast(ok ? "Lien copié" : "Le lien n'a pas pu être copié.", ok ? "neutre" : "rouge"))}>
            Partager
          </button>
          <Link href={`${RACINE}/notes`} className="var-a-bouton var-a-bouton--icone var-a-bouton--nu" aria-label="Notes de l'équipe" title="Notes de l'équipe">
            <VarIcone nom="Comment" />
          </Link>
          <Link href={`${RACINE}/formation`} className="var-a-bouton var-a-bouton--icone var-a-bouton--nu" aria-label="Aide" title="Aide : la formation">
            <VarIcone nom="Inbox" />
          </Link>
          <div style={{ position: "relative" }} data-var-menu="">
            <button type="button" className="var-a-bouton var-a-bouton--icone var-a-bouton--nu" aria-label="Plus" aria-haspopup="menu" aria-expanded={menu === "plus"} onClick={() => setMenu(menu === "plus" ? null : "plus")}>
              <VarIcone nom="Points" />
            </button>
            {menu === "plus" ? (
              <div className="var-a-menu" role="menu" aria-label="Plus" style={{ top: 32, right: 0 }}>
                <Link href={`${RACINE}/validations`} role="menuitem" className="var-a-menu-option" onClick={() => setMenu(null)}>
                  <VarIcone nom="Triage" />
                  File de validation
                </Link>
                <Link href={`${RACINE}/varelo/sources`} role="menuitem" className="var-a-menu-option" onClick={() => setMenu(null)}>
                  <VarIcone nom="Roue" />
                  Sources et structure
                </Link>
                <Link href={`${RACINE}/varelo?ancien=1`} role="menuitem" className="var-a-menu-option" onClick={() => setMenu(null)}>
                  <VarIcone nom="Archive" />
                  Ouvrir l&apos;ancien écran
                </Link>
              </div>
            ) : null}
          </div>
          <button
            type="button"
            className="var-a-bouton"
            aria-label="Copier pour l'assistant"
            title="Copier pour l'assistant : le résumé de ce que vous regardez"
            onClick={() => {
              const texte = objet
                ? `${objet.code_groupe} ${objet.nom_groupe} (${LIBELLE_NATURE[objet.nature].un}) : ${(v.codesParObjet.get(objet.id) ?? []).map((c) => `${c.code_local} « ${c.nom_local} » chez ${c.societe}`).join(" ; ")}.`
                : `${libelleVue} : ${v.objets.length} objets, ${v.compteurs.codes} codes locaux, ${v.compteurs.lots} paires à valider. ${v.objets.slice(0, 20).map((o) => `${o.code_groupe} ${o.nom_groupe}`).join(" ; ")}.`;
              void copier(texte).then((ok) => toast(ok ? "Résumé copié pour l'assistant" : "Le résumé n'a pas pu être copié.", ok ? "neutre" : "rouge"));
            }}
          >
            <VarIcone nom="Chat" />
            <span className="var-a-bouton-texte">Copier pour l&apos;assistant</span>
          </button>
        </header>

        {objet && donnees ? (
          <FicheObjet key={objet.id} objet={objet} />
        ) : (
          <>
            <div className="var-a-vue">
              <div style={{ position: "relative" }} data-var-menu="">
                <button type="button" className="var-a-bouton" aria-haspopup="menu" aria-expanded={menu === "vue"} onClick={() => setMenu(menu === "vue" ? null : "vue")}>
                  <VarIcone nom={vue === "lots" || vue === "decisions" ? "Checklist" : ICONE_NATURE[vue]} />
                  {libelleVue}
                  <VarIcone nom="Chevron" className="var-a-chevron" style={{ transform: "rotate(90deg)" }} />
                </button>
                {menu === "vue" ? (
                  <div className="var-a-menu" role="menu" aria-label="Vues" style={{ top: 32, left: 0 }}>
                    {NATURES.map((n) => (
                      <button key={n} type="button" role="menuitemradio" aria-checked={vue === n} className="var-a-menu-option" onClick={() => choisirVue(n)}>
                        <VarIcone nom={ICONE_NATURE[n]} />
                        {majuscule(LIBELLE_NATURE[n].des)} du groupe
                        {vue === n ? <span className="var-a-menu-coche">✓</span> : null}
                      </button>
                    ))}
                    <div className="var-a-menu-sep" role="separator" />
                    <button type="button" role="menuitemradio" aria-checked={vue === "lots"} className="var-a-menu-option" onClick={() => choisirVue("lots")}>
                      <VarIcone nom="Checklist" />
                      Lots à valider
                      {vue === "lots" ? <span className="var-a-menu-coche">✓</span> : null}
                    </button>
                    <button type="button" role="menuitemradio" aria-checked={vue === "decisions"} className="var-a-menu-option" onClick={() => choisirVue("decisions")}>
                      <VarIcone nom="Refresh" />
                      Dernières décisions
                      {vue === "decisions" ? <span className="var-a-menu-coche">✓</span> : null}
                    </button>
                  </div>
                ) : null}
              </div>
              {vue !== "lots" && vue !== "decisions" ? (
                <div style={{ position: "relative" }} data-var-menu="">
                  <button type="button" className="var-a-bouton" aria-haspopup="menu" aria-expanded={menu === "reglages"} onClick={() => setMenu(menu === "reglages" ? null : "reglages")}>
                    <VarIcone nom="Affichage" />
                    Réglages de la vue
                    <VarIcone nom="Chevron" className="var-a-chevron" style={{ transform: "rotate(90deg)" }} />
                  </button>
                  {menu === "reglages" ? (
                    <div className="var-a-menu" role="menu" aria-label="Colonnes affichées" style={{ top: 32, left: 0 }}>
                      {COLONNES_A.map((c) => (
                        <button key={c.cle} type="button" role="menuitemcheckbox" aria-checked={!masquees.includes(c.cle)} className="var-a-menu-option" onClick={() => setMasquees((m) => (m.includes(c.cle) ? m.filter((x) => x !== c.cle) : [...m, c.cle]))}>
                          {c.libelle}
                          {!masquees.includes(c.cle) ? <span className="var-a-menu-coche">✓</span> : null}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
              <span className="var-a-pousse" />
              <div style={{ position: "relative" }} data-var-menu="">
                <button type="button" className="var-a-bouton" aria-haspopup="menu" aria-expanded={menu === "export"} onClick={() => setMenu(menu === "export" ? null : "export")}>
                  <VarIcone nom="Refresh" />
                  Import / Export
                  <VarIcone nom="Chevron" className="var-a-chevron" style={{ transform: "rotate(90deg)" }} />
                </button>
                {menu === "export" ? (
                  <div className="var-a-menu" role="menu" aria-label="Import / Export" style={{ top: 32, right: 0 }}>
                    {v.peutGerer ? (
                      <Link href={`${RACINE}/varelo/sources`} role="menuitem" className="var-a-menu-option" onClick={() => setMenu(null)}>
                        <VarIcone nom="Spreadsheet" />
                        Déposer l&apos;export d&apos;une société
                      </Link>
                    ) : null}
                    {v.peutGerer ? (
                      <button type="button" role="menuitem" className="var-a-menu-option" disabled={v.exportEnCours} onClick={() => { setMenu(null); void v.telecharger(); }}>
                        <VarIcone nom="Page" />
                        Exporter les {LIBELLE_NATURE[v.nature].des} (CSV)
                      </button>
                    ) : (
                      <span className="var-a-menu-option var-a-vide">Seul le gérant ou l&apos;administrateur exporte.</span>
                    )}
                  </div>
                ) : null}
              </div>
              {v.peutValider ? (
                <button type="button" className="var-a-bouton var-a-bouton--bleu" disabled={v.passage === "encours"} onClick={lancer}>
                  <VarIcone nom="Plus" />
                  Lancer un passage
                </button>
              ) : null}
            </div>
            <div className="var-a-tri">
              <span className="var-a-puce">
                <VarIcone nom="Filtre" />
                <span className="var-a-puce-libelle">Trié par</span>
                {vue === "lots" ? "Ancienneté du lot" : vue === "decisions" ? "Date de décision" : "À valider d'abord"}
              </span>
              {vue !== "lots" && vue !== "decisions" ? (
                filtre || v.recherche ? (
                  <label className="var-a-filtre">
                    <VarIcone nom="Search" />
                    <input autoFocus type="search" placeholder="Nom, code local, société…" value={v.recherche} onChange={(e) => v.setRecherche(e.target.value)} onBlur={() => !v.recherche && setFiltre(false)} aria-label="Chercher dans le référentiel" />
                  </label>
                ) : (
                  <button type="button" className="var-a-filtre" onClick={() => setFiltre(true)}>
                    <VarIcone nom="Filtre" />
                    Filtre
                  </button>
                )
              ) : null}
            </div>
            {vue === "lots" || vue === "decisions" ? <GrilleLots decisions={vue === "decisions"} /> : <GrilleObjets masquees={masquees} />}
          </>
        )}
      </div>
      <Confirmer demande={confirmer} onFermer={() => setConfirmer(null)} />
    </VarCarte>
  );
}

/* ——— la grille des objets (People) ——— */
function GrilleObjets({ masquees }: { masquees: ColonneA[] }) {
  const v = useVarelo();
  const toast = useToast();
  const favoris = useFavoris();
  const lien = (o: Objet) => `${ICI}?objet=${encodeURIComponent(o.id)}&nature=${o.nature}`;
  const c = v.compteurs;
  const montre = (k: ColonneA) => !masquees.includes(k);
  const gabarit = ["250px", ...COLONNES_A.filter((k) => montre(k.cle)).map((k) => `${k.largeur}px`)].join(" ");
  /* cases à cocher : sélection multiple, puis actions groupées */
  const [selection, setSelection] = useState<string[]>([]);
  const [confirmer, setConfirmer] = useState<Demande | null>(null);
  const choisis = v.objets.filter((o) => selection.includes(o.id));
  const tousCoches = v.objets.length > 0 && selection.length === v.objets.length;
  const fusionner = () => {
    const [cible, ...autres] = choisis;
    setConfirmer({
      titre: `Fusionner ${autres.length} objet${autres.length > 1 ? "s" : ""} dans ${cible.code_groupe}`,
      texte: `${autres.map((o) => `${o.code_groupe} ${o.nom_groupe}`).join(", ")} ${autres.length > 1 ? "passent" : "passe"} sous ${cible.code_groupe} ${cible.nom_groupe}. Chaque fusion part en proposition au référent données, qui la décide dans la file de validation.`,
      bouton: "Proposer les fusions",
      faire: async () => {
        let n = 0;
        for (const o of autres) {
          try {
            await v.actions.proposer("fusionner", { objet_source: o.id, objet_cible: cible.id }, "Fusion proposée depuis la sélection du référentiel");
            n++;
          } catch (e) {
            toast(`${o.code_groupe} : ${e instanceof Error ? e.message : "la fusion n'a pas pu être proposée."}`, "rouge");
          }
        }
        if (n) v.setFait(`${n} fusion${n > 1 ? "s" : ""} proposée${n > 1 ? "s" : ""} vers ${cible.code_groupe} : elles attendent la décision du référent données.`);
        setSelection([]);
      },
    });
  };
  return (
    <div className="var-a-grille" role="table" aria-label={`${majuscule(LIBELLE_NATURE[v.nature].des)} du groupe`}>
      <div className="var-a-ligne var-a-ligne--tete" role="row" style={{ gridTemplateColumns: gabarit }}>
        <span className="var-a-cellule--premiere" role="columnheader">
          <input type="checkbox" className="var-a-case" aria-label="Tout choisir" checked={tousCoches} onChange={(e) => setSelection(e.target.checked ? v.objets.map((o) => o.id) : [])} />
          {majuscule(LIBELLE_NATURE[v.nature].un)} du groupe
          <span className="var-a-pousse" />
          {v.peutGerer ? (
            <Link href={`${RACINE}/varelo/sources`} className="var-a-plus" aria-label="Déposer l'export d'une société" title="Ajouter des codes : déposer l'export d'une société">
              <VarIcone nom="Plus" />
            </Link>
          ) : null}
        </span>
        {montre("rattachement") ? (
          <span role="columnheader">
            <VarIcone nom="AddRelation" />
            Rattachement
          </span>
        ) : null}
        {montre("codes") ? (
          <span role="columnheader">
            <VarIcone nom="Label" />
            Codes locaux
          </span>
        ) : null}
        {montre("societes") ? (
          <span role="columnheader">
            <VarIcone nom="Factory" />
            Sociétés
          </span>
        ) : null}
        {montre("maj") ? (
          <span role="columnheader" className="var-a-ajout">
            <VarIcone nom="Calendar" />
            Mis à jour
          </span>
        ) : null}
      </div>
      {v.source === "reelle" && !v.reel ? (
        <p className="var-a-cellule var-a-vide">Lecture du référentiel…</p>
      ) : v.objets.length === 0 ? (
        <p className="var-a-cellule var-a-vide" style={{ height: "auto", paddingBottom: 12 }}>
          {v.recherche ? "Rien ne répond à cette recherche." : `Aucun ${LIBELLE_NATURE[v.nature].un} dans le référentiel : déposez l'export d'une société, le prochain passage ouvre les objets.`}
        </p>
      ) : (
        v.objets.map((o) => {
          const codes = v.codesParObjet.get(o.id) ?? [];
          const attente = v.attenteParObjet.get(o.id) ?? 0;
          const societes = Array.from(new Set(codes.map((x) => x.societe)));
          const etat = attente ? { libelle: `${attente} à valider`, couleur: "#F97514" } : o.intragroupe ? { libelle: "Intragroupe", couleur: "#266DF0" } : o.nom_origine === "humain" ? { libelle: "Nom choisi", couleur: "#00D17E" } : codes.length > 1 ? { libelle: "Rattaché", couleur: "#00D17E" } : { libelle: "Seul", couleur: "#77797C" };
          return (
            <div key={o.id} className="var-a-ligne" role="row" style={{ gridTemplateColumns: gabarit }} data-choisi={selection.includes(o.id) ? "" : undefined}>
              <span className="var-a-cellule var-a-cellule--premiere" role="cell">
                <input type="checkbox" className="var-a-case" aria-label={`Choisir ${o.nom_groupe}`} checked={selection.includes(o.id)} onChange={(e) => setSelection((x) => (e.target.checked ? [...x, o.id] : x.filter((y) => y !== o.id)))} />
                <Link href={lien(o)} scroll={false} className="var-a-pastille" title={`${o.code_groupe} ${o.nom_groupe}`}>
                  <span className="var-a-avatar">{initiales(o.nom_groupe)}</span>
                  <span>{o.nom_groupe}</span>
                </Link>
              </span>
              {montre("rattachement") ? (
                <span className="var-a-cellule" role="cell">
                  <span className="var-a-force" style={{ ["--var-force" as string]: etat.couleur }}>
                    {etat.libelle}
                  </span>
                </span>
              ) : null}
              {montre("codes") ? (
                <span className="var-a-cellule" role="cell" title={codes.map((x) => `${x.code_local} (${x.societe})`).join(", ")}>
                  <span className="var-a-mono">{o.code_groupe}</span>
                  {codes.length ? `${codes.length} code${codes.length > 1 ? "s" : ""} · ${codes.map((x) => x.code_local).join(", ")}` : <span className="var-a-vide">aucun code</span>}
                </span>
              ) : null}
              {montre("societes") ? (
                <span className="var-a-cellule" role="cell">
                  {societes.length ? societes.join(" · ") : <span className="var-a-vide">Aucune société</span>}
                </span>
              ) : null}
              {montre("maj") ? (
                <span className="var-a-cellule" role="cell">
                  <span className="var-a-vide">{relatif(o.maj_le)}</span>
                </span>
              ) : null}
            </div>
          );
        })
      )}
      <div className="var-a-ligne var-a-ligne--pied" role="row" style={{ gridTemplateColumns: gabarit }}>
        <span className="var-a-cellule--premiere">
          <strong>{v.objets.length}</strong> objet{v.objets.length > 1 ? "s" : ""}
        </span>
        {montre("rattachement") ? (
          <span>
            <strong>{c.taux === null ? "—" : pourcent(Math.round(c.taux * 1000) / 10)}</strong> rattachés
          </span>
        ) : null}
        {montre("codes") ? (
          <span>
            <strong>{c.codes}</strong> codes locaux{c.a_traiter ? ` · ${c.a_traiter} à traiter au prochain passage` : ""}
          </span>
        ) : null}
        {montre("societes") ? (
          <span>
            <strong>{c.lots}</strong> paire{c.lots > 1 ? "s" : ""} à valider · {v.lotsOuverts} lot{v.lotsOuverts > 1 ? "s" : ""} dans la file
          </span>
        ) : null}
        {montre("maj") ? <span /> : null}
      </div>
      {selection.length ? (
        <div className="var-a-barre" role="toolbar" aria-label="Actions sur les objets choisis">
          <span>
            {selection.length} choisi{selection.length > 1 ? "s" : ""}
          </span>
          {choisis.length >= 2 && v.actions.contexte && v.actions.contexte.role !== "lecteur" ? (
            <button type="button" className="var-a-bouton" onClick={fusionner}>
              <VarIcone nom="AddRelation" />
              Fusionner dans {choisis[0].code_groupe}
            </button>
          ) : null}
          <button
            type="button"
            className="var-a-bouton"
            onClick={() => {
              const n = exporterCsv(`referentiel-${LIBELLE_NATURE[v.nature].des}-selection`, ["code_groupe", "nom_groupe", "societe", "code_local", "nom_local", "etat"], choisis.flatMap((o) => (v.codesParObjet.get(o.id) ?? []).map((x) => [o.code_groupe, o.nom_groupe, x.societe, x.code_local, x.nom_local, x.etat])));
              v.setFait(`${n} code${n > 1 ? "s" : ""} exporté${n > 1 ? "s" : ""} en CSV.`);
            }}
          >
            <VarIcone nom="Page" />
            Exporter en CSV
          </button>
          <button
            type="button"
            className="var-a-bouton"
            onClick={() => {
              const n = favoris.ajouter(choisis.map((o) => ({ cle: `objet:${o.id}`, libelle: `${o.code_groupe} ${o.nom_groupe}`, href: lien(o), genre: LIBELLE_NATURE[o.nature].un })));
              v.setFait(n ? `${n} objet${n > 1 ? "s" : ""} épinglé${n > 1 ? "s" : ""} dans Ce matin.` : "Ces objets sont déjà épinglés dans Ce matin.");
            }}
          >
            <VarIcone nom="Etoile" />
            Épingler
          </button>
          <button type="button" className="var-a-bouton" onClick={() => setSelection([])}>
            Effacer
          </button>
        </div>
      ) : null}
      <Confirmer demande={confirmer} onFermer={() => setConfirmer(null)} />
    </div>
  );
}

/* ——— les lots à valider et les dernières décisions (16, 16.a) ——— */
function GrilleLots({ decisions }: { decisions: boolean }) {
  const v = useVarelo();
  const donnees = v.donnees ?? { installation: null, poles: [], societes: [], codes: [], objets: [], propositions: [], demandes: [], etat: null };
  const h = useLots({ donnees, actions: v.actions });
  const lignes = decisions ? h.recentes.map((p) => ({ p, demande: null as null | (typeof h.lots)[number]["demande"] })) : h.lots.flatMap((l) => l.props.map((p) => ({ p, demande: l.demande })));
  return (
    <div className="var-a-grille" role="table" aria-label={decisions ? "Dernières décisions" : "Lots à valider"}>
      <div className="var-a-ligne var-a-ligne--tete" role="row">
        <span className="var-a-cellule--premiere" role="columnheader">
          <span className="var-a-case" aria-hidden="true" />
          Code ou objet
        </span>
        <span role="columnheader">
          <VarIcone nom="Shield" />
          {decisions ? "Décision" : "Preuve"}
        </span>
        <span role="columnheader">
          <VarIcone nom="Fleche" />
          Vers
        </span>
        <span role="columnheader">
          <VarIcone nom="Checklist" />
          {decisions ? "Raisons" : "Lot"}
        </span>
        <span role="columnheader" />
      </div>
      {lignes.length === 0 ? (
        <p className="var-a-cellule var-a-vide" style={{ height: "auto", paddingBottom: 12 }}>
          {decisions ? "Aucune décision prise pour l'instant." : "Rien à valider : le prochain passage proposera les paires qu'il trouve ; les lots arrivent aussi dans la file de validation."}
        </p>
      ) : (
        lignes.map(({ p, demande }) => {
          const { gauche, droite } = h.decrire(p);
          const preuve = p.preuve === "sure" ? { libelle: "Preuve sûre", couleur: "#00D17E" } : p.preuve === "probable" ? { libelle: `Probable${p.score !== null ? ` ${Math.round((p.score ?? 0) * 100)} %` : ""}`, couleur: "#266DF0" } : { libelle: "Proposé par une personne", couleur: "#77797C" };
          const statut = { libelle: LIBELLE_PROP[p.statut] ?? p.statut, couleur: p.statut === "executee" ? "#00D17E" : p.statut === "rejetee" ? "#FF5454" : "#77797C" };
          const x = decisions ? statut : preuve;
          return (
            <div key={p.id} className="var-a-ligne" role="row">
              <span className="var-a-cellule var-a-cellule--premiere" role="cell" title={`${gauche.titre} — ${gauche.sous}`}>
                <span className="var-a-case" aria-hidden="true" />
                <span className="var-a-pastille">
                  <span className="var-a-avatar">{initiales(gauche.titre.replace(/^\S+ · /, ""))}</span>
                  <span>{gauche.titre}</span>
                </span>
              </span>
              <span className="var-a-cellule" role="cell" title={raisonTexte(p)}>
                <span className="var-a-force" style={{ ["--var-force" as string]: x.couleur }}>
                  {x.libelle}
                </span>
              </span>
              <span className="var-a-cellule" role="cell" title={`${droite.titre} — ${droite.sous}`}>
                {droite.titre} <span className="var-a-vide">{droite.sous}</span>
              </span>
              <span className="var-a-cellule" role="cell" title={decisions ? raisonTexte(p) : demande?.resume}>
                {decisions ? (
                  <>
                    {raisonTexte(p)}
                    {p.motif ? <span className="var-a-vide"> — {p.motif}</span> : null}
                  </>
                ) : demande ? (
                  <>
                    {LIBELLE_TYPE_ACTION[demande.type_action as TypeActionRef] ?? demande.type_action} <span className="var-a-vide">· {LIBELLE_STATUT[demande.statut] ?? demande.statut} · {relatif(demande.cree_le)}</span>
                  </>
                ) : (
                  <span className="var-a-vide">Sans lot : il se forme au prochain passage</span>
                )}
              </span>
              <span className="var-a-cellule" role="cell" style={{ gap: 6 }}>
                {decisions ? (
                  <span className="var-a-vide">{dateHeure(p.traite_le ?? p.cree_le)}</span>
                ) : (
                  <>
                    {p.preuve !== "humaine" && h.peutEcarter(demande) ? (
                      <button type="button" className="var-a-petit" style={{ marginTop: -2 }} onClick={() => { h.setErreur(null); h.setMotif(""); h.setAEcarter(p); }}>
                        Écarter
                      </button>
                    ) : null}
                    {demande ? (
                      <Link href={`${RACINE}/validations`} className="var-a-petit" style={{ marginTop: -2 }}>
                        Décider dans la file
                      </Link>
                    ) : null}
                  </>
                )}
              </span>
            </div>
          );
        })
      )}
      <div className="var-a-ligne var-a-ligne--pied" role="row">
        <span className="var-a-cellule--premiere">
          <strong>{lignes.length}</strong> {decisions ? "décision" : "paire"}
          {lignes.length > 1 ? "s" : ""}
        </span>
        <span>{decisions ? "" : `${h.lots.length} lot${h.lots.length > 1 ? "s" : ""}`}</span>
        <span />
        <span />
        <span />
      </div>
      <DialogueEcarter h={h} />
    </div>
  );
}

/* ——— la fiche d'un objet (fiche d'un contact) ——— */
function FicheObjet({ objet }: { objet: Objet }) {
  const v = useVarelo();
  const donnees = v.donnees!;
  const h = useObjetDetail({ objet, donnees, actions: v.actions });
  const toast = v.setFait;
  const { fait, setFait } = h;
  useEffect(() => {
    if (fait) {
      toast(fait);
      setFait(null);
    }
  }, [fait, setFait, toast]);
  const [onglet, setOnglet] = useState<"apercu" | "codes" | "propositions">("apercu");
  const favoris = useFavoris();
  const societes = useMemo(() => Array.from(new Set(h.codes.map((c) => c.societe))), [h.codes]);
  const decisions = useMemo(
    () =>
      donnees.propositions
        .filter((p) => p.statut !== "a_valider" && (p.objet_cible === objet.id || p.objet_source === objet.id || h.codes.some((c) => c.code_id === p.code_id)))
        .sort((a, b) => new Date(b.traite_le ?? b.cree_le).getTime() - new Date(a.traite_le ?? a.cree_le).getTime())
        .slice(0, 6),
    [donnees.propositions, objet.id, h.codes],
  );
  const lienEncours = objet.nature === "client" || objet.nature === "fournisseur" ? `${RACINE}/varelo/finance?objet=${encodeURIComponent(objet.id)}` : null;

  const codesListe = (
    <ul className="var-a-liste">
      {h.codes.length === 0 ? (
        <li className="var-a-vide">Aucun code : cet objet a été vidé par une correction.</li>
      ) : (
        h.codes.map((c) => (
          <li key={c.code_id}>
            <span className="var-a-rond" data-fait={c.etat === "confirme" ? "" : undefined} aria-hidden="true" />
            <span className="var-a-liste-texte" title={Object.entries(c.anomalies ?? {}).map(([k, x]) => `${k.toUpperCase()} ${x}`).join(" · ") || undefined}>
              <span className="var-a-mono">{c.code_local}</span> {c.nom_local}
              <span className="var-a-vide">
                {c.societe} · {LIBELLE_ETAT[c.etat].libelle} · {c.methode ? LIBELLE_METHODE[c.methode] : "—"}
                {c.score !== null && c.score !== undefined && c.methode !== "nouveau" && c.methode !== "humain" ? ` (${Math.round(c.score * 100)} %)` : ""}
                {Object.keys(c.anomalies ?? {}).length ? ` · ${Object.keys(c.anomalies).map((k) => k.toUpperCase()).join(", ")} à vérifier` : ""}
              </span>
            </span>
            {c.rattache_le ? <span className="var-a-heure">{dateCourte(c.rattache_le)}</span> : null}
            {h.peutProposer ? (
              <>
                <button type="button" className="var-a-petit" disabled={c.etat === "propose" || !h.autres.length} title={c.etat === "propose" ? "Ce code attend déjà la validation de son rattachement" : undefined} onClick={() => h.ouvrir({ genre: "deplacer", code: c })}>
                  Rattacher ailleurs
                </button>
                <button type="button" className="var-a-petit" disabled={h.codes.length < 2 || c.etat === "propose"} title={h.codes.length < 2 ? "On ne détache pas le dernier code d'un objet" : undefined} onClick={() => h.ouvrir({ genre: "detacher", code: c })}>
                  Détacher
                </button>
              </>
            ) : null}
          </li>
        ))
      )}
    </ul>
  );
  const propositionsListe = (
    <ul className="var-a-liste">
      {h.attente.length === 0 ? (
        <li className="var-a-vide">Aucune proposition en attente.</li>
      ) : (
        h.attente.map((p) => (
          <li key={p.id}>
            <span className="var-a-rond" aria-hidden="true" />
            <span className="var-a-liste-texte">
              {majuscule(p.genre)}
              <span className="var-a-vide">{raisonTexte(p)}</span>
            </span>
            <span className="var-a-heure">{relatif(p.cree_le)}</span>
          </li>
        ))
      )}
    </ul>
  );

  return (
    <div className="var-a-fiche">
      <aside className="var-a-gauche" aria-label="Détails de l'objet">
        <div className="var-a-identite">
          <span className="var-a-avatar">{initiales(objet.nom_groupe)}</span>
          <h2>{objet.nom_groupe}</h2>
          {h.peutProposer ? (
            <button type="button" className="var-a-bouton var-a-bouton--icone var-a-bouton--nu" aria-label="Proposer un nom" title="Proposer un nom pour le groupe" onClick={() => h.ouvrir({ genre: "renommer" })}>
              <VarIcone nom="Write" />
            </button>
          ) : null}
          <button
            type="button"
            className="var-a-bouton var-a-bouton--icone var-a-bouton--nu"
            aria-pressed={favoris.estEpingle(`objet:${objet.id}`)}
            aria-label={favoris.estEpingle(`objet:${objet.id}`) ? "Retirer des épinglés" : "Épingler dans Ce matin"}
            title={favoris.estEpingle(`objet:${objet.id}`) ? "Retirer des épinglés" : "Épingler dans Ce matin"}
            onClick={() => favoris.basculer({ cle: `objet:${objet.id}`, libelle: `${objet.code_groupe} ${objet.nom_groupe}`, href: `${ICI}?objet=${encodeURIComponent(objet.id)}&nature=${objet.nature}`, genre: LIBELLE_NATURE[objet.nature].un })}
          >
            <VarIcone nom="Etoile" style={favoris.estEpingle(`objet:${objet.id}`) ? { color: "#f2c94c" } : undefined} />
          </button>
        </div>
        {h.peutProposer ? (
          <div className="var-a-actions">
            <button type="button" className="var-a-bouton" onClick={() => h.ouvrir({ genre: "renommer" })}>
              <VarIcone nom="Write" />
              Proposer un nom
            </button>
            <button type="button" className="var-a-bouton" disabled={!h.autres.length || h.codes.some((c) => c.etat === "propose")} onClick={() => h.ouvrir({ genre: "fusionner" })}>
              <VarIcone nom="AddRelation" />
              Fusionner dans…
            </button>
            <button type="button" className="var-a-bouton" disabled={h.codes.length < 2} onClick={() => h.ouvrir({ genre: "scinder" })}>
              <VarIcone nom="Subissue" />
              Scinder
            </button>
          </div>
        ) : (
          <p className="var-a-vide" style={{ padding: "12px 16px" }}>
            Un membre qui agit peut proposer une correction ; vous lisez seulement.
          </p>
        )}
        <div className="var-a-bloc">
          <p className="var-a-bloc-titre">Détails</p>
          <dl className="var-a-details">
            <div className="var-a-detail">
              <VarIcone nom="Label" />
              <dt>Code du groupe</dt>
              <dd className="var-a-mono">{objet.code_groupe}</dd>
            </div>
            <div className="var-a-detail">
              <VarIcone nom="Write" />
              <dt>Nom du groupe</dt>
              <dd>{objet.nom_groupe}</dd>
            </div>
            <div className="var-a-detail">
              <VarIcone nom="CurrentUser" />
              <dt>Origine du nom</dt>
              <dd>{objet.nom_origine === "humain" ? "Choisi par une personne" : "Libellé le plus complet"}</dd>
            </div>
            <div className="var-a-detail">
              <VarIcone nom={ICONE_NATURE[objet.nature]} />
              <dt>Nature</dt>
              <dd>{majuscule(LIBELLE_NATURE[objet.nature].un)}</dd>
            </div>
            <div className="var-a-detail">
              <VarIcone nom="Factory" />
              <dt>Intragroupe</dt>
              <dd className={h.intragroupe ? undefined : "var-a-vide"}>{h.intragroupe ?? "Non"}</dd>
            </div>
          </dl>
          <button type="button" className="var-a-voir-tout" onClick={() => setOnglet("codes")}>
            Voir tous les codes
          </button>
        </div>
        <div className="var-a-bloc">
          <p className="var-a-bloc-titre">
            Lots
            <Link href={`${ICI}?vue=lots`} scroll={false} style={{ color: "var(--a-second)" }}>
              Voir les lots
            </Link>
          </p>
          <p className="var-a-vide">{h.attente.length ? `${h.attente.length} proposition${h.attente.length > 1 ? "s" : ""} en attente de décision` : "Cet objet n'est dans aucun lot ouvert"}</p>
        </div>
        <div className="var-a-bloc">
          <p className="var-a-vide" style={{ fontSize: 12, lineHeight: "16px" }}>
            Une correction ne s&apos;applique qu&apos;après la décision du référent données ; celui qui la propose ne la décide pas.
          </p>
        </div>
      </aside>

      <div className="var-a-droite">
        <div className="var-a-onglets" role="tablist" aria-label="Vues de l'objet">
          <button type="button" role="tab" aria-selected={onglet === "apercu"} className="var-a-onglet" onClick={() => setOnglet("apercu")}>
            <VarIcone nom="CustomView" />
            Vue d&apos;ensemble
          </button>
          <button type="button" role="tab" aria-selected={onglet === "codes"} className="var-a-onglet" onClick={() => setOnglet("codes")}>
            <VarIcone nom="Label" />
            Codes <span className="var-a-compteur">{h.codes.length}</span>
          </button>
          <button type="button" role="tab" aria-selected={onglet === "propositions"} className="var-a-onglet" onClick={() => setOnglet("propositions")}>
            <VarIcone nom="Checklist" />
            Propositions <span className="var-a-compteur">{h.attente.length}</span>
          </button>
          {lienEncours ? (
            <Link href={lienEncours} className="var-a-onglet">
              <VarIcone nom="Euro" />
              Encours
            </Link>
          ) : null}
          <Link href={`${RACINE}/varelo/contrats`} className="var-a-onglet">
            <VarIcone nom="Signature" />
            Contrats
          </Link>
        </div>
        <div className="var-a-corps">
          {onglet === "apercu" ? (
            <>
              <p className="var-a-section-titre">Points clés</p>
              <div className="var-a-cartes">
                <div className="var-a-carte">
                  <span className="var-a-carte-titre">
                    Codes locaux
                    <VarIcone nom="Label" />
                  </span>
                  <span className="var-a-carte-valeur">{h.codes.length}</span>
                </div>
                <div className="var-a-carte">
                  <span className="var-a-carte-titre">
                    Sociétés
                    <VarIcone nom="Factory" />
                  </span>
                  <span className="var-a-carte-valeur" title={societes.join(", ")}>
                    {societes.length ? societes.length : <span className="var-a-vide">Aucune</span>}
                    {societes.length ? <small>{societes.join(" · ")}</small> : null}
                  </span>
                </div>
                <div className="var-a-carte">
                  <span className="var-a-carte-titre">
                    Propositions en attente
                    <VarIcone nom="Checklist" />
                  </span>
                  <span className={`var-a-carte-valeur${h.attente.length ? "" : " var-a-vide"}`}>{h.attente.length ? h.attente.length : "Aucune"}</span>
                </div>
                <div className="var-a-carte">
                  <span className="var-a-carte-titre">
                    Code du groupe
                    <VarIcone nom="Label" />
                  </span>
                  <span className="var-a-carte-valeur var-a-mono">{objet.code_groupe}</span>
                </div>
                <div className="var-a-carte">
                  <span className="var-a-carte-titre">
                    Intragroupe
                    <VarIcone nom="Factory" />
                  </span>
                  <span className={`var-a-carte-valeur${h.intragroupe ? "" : " var-a-vide"}`}>{h.intragroupe ?? "Hors groupe"}</span>
                </div>
                <div className="var-a-carte">
                  <span className="var-a-carte-titre">
                    Encours
                    <VarIcone nom="Euro" />
                  </span>
                  <span className="var-a-carte-valeur">{lienEncours ? <Link href={lienEncours} style={{ color: "var(--a-lien)" }}>Voir l&apos;encours du groupe</Link> : <span className="var-a-vide">Sans objet</span>}</span>
                </div>
              </div>
              <p className="var-a-section-titre">
                Activité
                <span className="var-a-pousse" />
                <Link href={`${ICI}?vue=decisions`} scroll={false}>
                  Tout voir
                </Link>
              </p>
              <ul className="var-a-liste">
                {decisions.length === 0 ? (
                  <li className="var-a-vide">Aucune décision sur cet objet.</li>
                ) : (
                  decisions.map((p) => (
                    <li key={p.id}>
                      <span className="var-a-avatar">{p.decide_par ? "VO" : "·"}</span>
                      <span className="var-a-liste-texte">
                        {majuscule(p.genre)} : {LIBELLE_PROP[p.statut] ?? p.statut}
                        {p.motif ? <span className="var-a-vide">{p.motif}</span> : null}
                      </span>
                      <span className="var-a-heure">{relatif(p.traite_le ?? p.cree_le)}</span>
                    </li>
                  ))
                )}
              </ul>
              <p className="var-a-section-titre">
                Codes <span className="var-a-compteur">{h.codes.length}</span>
              </p>
              {codesListe}
              <p className="var-a-section-titre">
                Propositions <span className="var-a-compteur">{h.attente.length}</span>
                <span className="var-a-pousse" />
                {h.peutProposer ? (
                  <button type="button" className="var-a-plus" aria-label="Proposer un nom" title="Proposer une correction : un nom pour le groupe" onClick={() => h.ouvrir({ genre: "renommer" })}>
                    <VarIcone nom="Plus" />
                  </button>
                ) : null}
              </p>
              {propositionsListe}
            </>
          ) : onglet === "codes" ? (
            codesListe
          ) : (
            propositionsListe
          )}
        </div>
      </div>
      <DialogueCorrection h={h} objet={objet} />
    </div>
  );
}
