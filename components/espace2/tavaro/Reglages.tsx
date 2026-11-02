"use client";

/* ══════════════════════════════════════════════════════════════════════
   TAVARO — Réglages (02/11/2026, refonte des pages métiers)

   Les réglages de Linear, « Issue labels » et « Issue templates », au
   1:1 : relevé docs/refonte-metiers/releves/linear-labels-templates.md,
   styles ./tav-reglages.css (préfixe tav-g-).
     · Barème (la page Labels, tableau pleine largeur) : B48. Un groupe
       par barème (en vigueur, retirés), une ligne par poste ; pastille de
       la famille, libellé, code et unité, catégorie, TVA, prix, date
       d'effet. « New label » → Publier un barème (F31, G64), « New
       group » → Retirer le barème en vigueur (F32, G65). Filtre par nom.
     · Règles (la page Templates, colonne centrée et cartes-listes) :
       B19 les responsables des remises par agence (G13), B31 la grille
       d'assistance (G39), et les règles du loueur (loc_reglages, sans
       écran jusqu'ici : tolérance de retard, netteté, contestation,
       remise ; porte poserReglages).
   Le référentiel Crit'Air et contrôle technique (B26) reste au Parc et
   atelier, à côté des véhicules : une seule entrée.
   ══════════════════════════════════════════════════════════════════════ */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Settings2 } from "lucide-react";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import { Avis } from "@/components/espace/ui";
import { dateCourte, montant, pourcent } from "@/components/espace/format";
import { FAMILLES_LIGNE, UNITES } from "@/components/espace/tavaro/etats";
import { ACTIONS, TYPES_INCIDENT } from "@/components/espace/tavaro/operations";
import type { Reglages as ReglesLoueur } from "@/components/espace/tavaro/types";
import { useToast } from "../Toasts";
import { useTavaro } from "./donnees";
import { FenetreOperations } from "./operations";
import { FenetresBareme, type DemandeBareme } from "./FenetresBareme";
import { TavCarte } from "./TavCadre";
import { TavIcone } from "./TavIcone";
import { BASE } from "./VueEnsemble";
import { TavMenu, type OptionMenu } from "./TavCadre";
import { copier as copierTexte, exporterCsv } from "./navigateur";
import type { LigneBareme } from "@/components/espace/tavaro/types";
import "./tav-reglages.css";

/* une couleur de pastille par famille de poste (les couleurs d'étiquettes relevées chez Linear) */
const COULEUR: Record<string, string> = { carburant: "#26b5ce", kilometres: "#4ea7fc", retard: "#bb87fc", dommage: "#eb5757", nettoyage: "#4cb782", frais: "#95a2b3", autre: "#5e6ad2" };

type Regle = { cle: keyof ReglesLoueur; libelle: string; unite: string; texte?: boolean };
const REGLES: Regle[] = [
  { cle: "tolerance_retard_min", libelle: "Tolérance de retard au retour", unite: "min" },
  { cle: "nettete_min", libelle: "Netteté minimale d'une photo d'état des lieux", unite: "" },
  { cle: "contestation_delai_jours", libelle: "Délai laissé par la banque pour répondre à une contestation", unite: "j" },
  { cle: "contestation_adresse", libelle: "Adresse du service des contestations de la banque", unite: "", texte: true },
  { cle: "remise_duree_min", libelle: "Durée d'une remise en location", unite: "min" },
  { cle: "remise_marge_min", libelle: "Marge avant le prochain départ", unite: "min" },
  { cle: "echeance_pro_jours", libelle: "Échéance des factures aux professionnels", unite: "j" },
];

export default function Reglages() {
  const { monde, role, nommer, nomAgenceDe, gestesParc, operations: o, reglerLoueur } = useTavaro();
  const toast = useToast();
  const params = useSearchParams();
  const vue = params.get("vue") === "regles" ? "regles" : "bareme";
  const [filtre, setFiltre] = useState("");
  const [ouverts, setOuverts] = useState<Record<string, boolean>>({});
  const [demande, setDemande] = useState<DemandeBareme>(null);
  const [regle, setRegle] = useState<{ r: Regle; valeur: string } | null>(null);
  const [envoi, setEnvoi] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const direction = role === "gerant" || role === "admin";
  useEffect(() => {
    if (o.fait) {
      toast(`C'est fait. ${o.fait}`, "vert");
      const t = window.setTimeout(() => o.setFait(null), 0);
      return () => window.clearTimeout(t);
    }
  }, [o, toast]);

  const baremes = useMemo(() => [...(monde?.baremes ?? [])].sort((a, b) => Number(b.statut === "publie") - Number(a.statut === "publie") || b.date_effet.localeCompare(a.date_effet)), [monde]);
  const enVigueur = useMemo(() => {
    const auj = new Date().toISOString().slice(0, 10);
    return baremes.filter((b) => b.statut === "publie" && b.date_effet <= auj).sort((a, b) => b.date_effet.localeCompare(a.date_effet))[0] ?? baremes.find((b) => b.statut === "publie") ?? null;
  }, [baremes]);
  const nomCategorie = (id: string | null) => (id ? (monde?.categories.find((c) => c.id === id)?.code ?? "?") : "toutes");
  const f = filtre.trim().toLowerCase();
  /* les boutons de la page Labels : filtre par famille, options d'affichage, cases, « … » de ligne */
  const [familleFiltre, setFamilleFiltre] = useState<string | null>(null);
  const [coches, setCoches] = useState<Set<string>>(new Set());
  /* une ligne au format que « Publier un barème » relit (code ; libellé ; famille ; unité ; prix ; régime ; taux ; catégorie) */
  const auFormat = (l: LigneBareme) => [l.code, l.libelle, l.famille, l.unite, l.prix_eur ?? "", l.regime_tva, l.taux_tva ?? "", l.categorie_id ? nomCategorie(l.categorie_id) : ""].join(" ; ").replace(/( ; )+$/, "");
  const toutesLignes = (monde?.lignesBareme ?? []).filter((l) => (!f || l.libelle.toLowerCase().includes(f) || l.code.toLowerCase().includes(f)) && (!familleFiltre || l.famille === familleFiltre));
  const copierLignes = async (ls: LigneBareme[]) => {
    const ok = await copierTexte(ls.map(auFormat).join("\n"));
    toast(ok ? `${ls.length} ligne${ls.length > 1 ? "s" : ""} copiée${ls.length > 1 ? "s" : ""} au format du barème : collez-les dans « Publier un barème ».` : "La copie a échoué.", ok ? undefined : "rouge");
  };
  const exporterBareme = (ls: LigneBareme[]) => exporterCsv("bareme", ["Barème", "Code", "Libellé", "Famille", "Unité", "Prix", "Régime TVA", "Taux TVA", "Catégorie"], ls.map((l) => [baremes.find((b) => b.id === l.bareme_id)?.libelle ?? "", l.code, l.libelle, FAMILLES_LIGNE[l.famille], UNITES[l.unite], l.prix_eur ?? "", l.regime_tva, l.taux_tva ?? "", nomCategorie(l.categorie_id)]));
  const optionsFamille: OptionMenu[] = [
    { libelle: "Toutes les familles", icone: familleFiltre === null ? "IssueStatusDone" : "Label", action: () => setFamilleFiltre(null) },
    ...Object.entries(FAMILLES_LIGNE).map(([k, v]) => ({ libelle: v, icone: (familleFiltre === k ? "IssueStatusDone" : "Label") as "Label", action: () => setFamilleFiltre(k) })),
  ];
  /* section « Sources » : ce que Tavaro lit du logiciel de location (promesse : « votre logiciel reste en place ») */
  const SOURCES: Record<string, string> = { export: "Export du logiciel de location", pdf: "Contrats PDF lus", connecteur: "Connecteur du logiciel", comptoir: "Saisis au comptoir", saisie: "Saisis à la main" };
  const contrats = (monde?.dossiers ?? []).map((d) => d.contrat);
  const parSource = Object.keys(SOURCES)
    .map((k) => {
      const l = contrats.filter((c) => c.source === k);
      const dernier = l.map((c) => c.maj_le).sort().pop() ?? null;
      return { k, n: l.length, dernier };
    })
    .filter((x) => x.n > 0);
  const disparus = contrats.filter((c) => c.disparu_le).length;
  const ecarts = contrats.filter((c) => c.avertissements.some((a) => a.code === "ecart_avec_le_logiciel")).length;

  const parc = monde?.parc;
  const entites = [...new Set([...(parc?.vehicules ?? []).map((v) => v.entite_id).filter((x): x is string => !!x), ...(parc?.responsables ?? []).map((x) => x.entite_id)])];
  const reglages = monde?.reglages ?? null;

  const agir = async (cle: string, action: () => Promise<string>) => {
    setEnvoi(cle);
    setErreur(null);
    try {
      toast(`C'est fait. ${await action()}`, "vert");
      setRegle(null);
    } catch (e) {
      const m = e instanceof Error ? e.message : "La base a refusé l'opération.";
      setErreur(m);
      toast(m, "rouge");
    } finally {
      setEnvoi(null);
    }
  };

  return (
    <TavCarte>
      <h1 className="v2-sr">Réglages de la location</h1>
      <div className="tav-defile">
        <nav className="tav-g-bande" aria-label="Réglages">
          <Link href={`${BASE}/reglages`} className="tav-onglet" aria-current={vue === "bareme" ? "page" : undefined}>
            Barème
          </Link>
          <Link href={`${BASE}/reglages?vue=regles`} className="tav-onglet" aria-current={vue === "regles" ? "page" : undefined}>
            Règles et responsables
          </Link>
        </nav>

        {vue === "bareme" ? (
          <>
            <div className="tav-g-titre-ligne">
              <h2 className="tav-g-titre">Barème de remise en état</h2>
              <button type="button" className="tav-g-bouton" disabled={!direction || !enVigueur} title={direction ? undefined : "Seule la direction retire un barème"} onClick={() => enVigueur && setDemande((d) => ({ quoi: "retirer", bareme: enVigueur, n: (d?.n ?? 0) + 1 }))}>
                Retirer le barème
              </button>
              <button type="button" className="tav-g-bouton tav-g-bouton--primaire" disabled={!direction} title={direction ? undefined : "Seule la direction publie le barème"} onClick={() => setDemande((d) => ({ quoi: "publier", n: (d?.n ?? 0) + 1 }))}>
                Publier un barème
              </button>
            </div>
            <div className="tav-g-filtre">
              <label className="tav-g-champ">
                <TavIcone nom="Search" />
                <input type="search" placeholder="Filtrer par libellé…" value={filtre} onChange={(e) => setFiltre(e.target.value)} />
              </label>
              <span className="tav-pousse" />
              <span className="tav-g-outils">
                <TavMenu libelle={familleFiltre ? `Famille : ${FAMILLES_LIGNE[familleFiltre as keyof typeof FAMILLES_LIGNE]}` : "Filtrer par famille"} icone="Filtre" alignement="droite" options={optionsFamille} />
                <TavMenu
                  libelle="Options d'affichage"
                  icone="Affichage"
                  alignement="droite"
                  options={[
                    { libelle: "Tout déplier", icone: "Folder", action: () => setOuverts(Object.fromEntries(baremes.map((b) => [b.id, true]))) },
                    { libelle: "Tout replier", icone: "Folder", action: () => setOuverts(Object.fromEntries(baremes.map((b) => [b.id, false]))) },
                    "sep",
                    { libelle: "Exporter les lignes affichées (CSV)", icone: "Spreadsheet", action: () => exporterBareme(toutesLignes) },
                    { libelle: "Copier le barème en vigueur au format de publication", icone: "Page", action: () => void copierLignes((monde?.lignesBareme ?? []).filter((l) => l.bareme_id === enVigueur?.id).sort((x, y) => x.rang - y.rang)) },
                  ]}
                />
              </span>
            </div>
            {!enVigueur ? <p className="tav-g-avis">Aucun barème publié : sans barème en vigueur à la date du départ, aucun retour ne se chiffre. La direction doit en publier un.</p> : null}
            <div className="tav-g-tableau" role="table" aria-label="Lignes des barèmes">
              <div className="tav-g-entete" role="row">
                <span />
                <span className="tav-g-tri" role="columnheader">
                  Libellé <TavIcone nom="Chevron" taille={12} style={{ transform: "rotate(90deg)" }} />
                </span>
                <span className="tav-g-tri" role="columnheader">Code et unité</span>
                <span className="tav-g-tri" role="columnheader">Catégorie</span>
                <span className="tav-g-tri" role="columnheader">TVA</span>
                <span className="tav-g-tri" role="columnheader">Prix</span>
                <span className="tav-g-tri" role="columnheader">Effet</span>
                <span />
                <span />
              </div>
              {baremes.map((b) => {
                const lignes = toutesLignes.filter((l) => l.bareme_id === b.id).sort((x, y) => x.rang - y.rang);
                const ouvert = ouverts[b.id] ?? b.id === enVigueur?.id;
                return (
                  <div key={b.id} role="rowgroup">
                    <div className="tav-g-ligne tav-g-groupe" role="row">
                      <span />
                      <span className="tav-g-nom">
                        <button type="button" className="tav-g-chevron" aria-expanded={ouvert} aria-label={ouvert ? "Replier" : "Déplier"} onClick={() => setOuverts((x) => ({ ...x, [b.id]: !ouvert }))}>
                          <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden="true" style={{ transform: ouvert ? undefined : "rotate(-90deg)" }}>
                            <path d="M1 2.5h6L4 6z" fill="currentColor" />
                          </svg>
                        </button>
                        <TavIcone nom="Folder" taille={14} />
                        <span>{b.libelle}</span>
                      </span>
                      <span className="tav-g-cellule">{b.statut === "publie" ? (b.id === enVigueur?.id ? "En vigueur" : "Publié") : `Retiré${b.motif_retrait ? ` : ${b.motif_retrait}` : ""}`}</span>
                      <span />
                      <span />
                      <span className="tav-g-cellule">{lignes.length} ligne{lignes.length > 1 ? "s" : ""}</span>
                      <span className="tav-g-date">{dateCourte(b.statut === "publie" ? b.date_effet : b.retire_le)}</span>
                      <span />
                      <span />
                    </div>
                    {ouvert
                      ? lignes.map((l, i) => (
                          <div key={l.id} className="tav-g-ligne tav-g-enfant" role="row" data-dernier={i === lignes.length - 1 || undefined} data-coche={coches.has(l.id) || undefined}>
                            <span className="tav-g-case">
                              <input
                                type="checkbox"
                                aria-label={`Sélectionner ${l.libelle}`}
                                checked={coches.has(l.id)}
                                onChange={(e) =>
                                  setCoches((c) => {
                                    const n = new Set(c);
                                    if (e.target.checked) n.add(l.id);
                                    else n.delete(l.id);
                                    return n;
                                  })
                                }
                              />
                            </span>
                            <span className="tav-g-nom">
                              <span className="tav-g-pastille" style={{ background: COULEUR[l.famille] ?? "#95a2b3" }} />
                              <span>{l.libelle}</span>
                            </span>
                            <span className="tav-g-cellule">
                              {l.code} · {UNITES[l.unite]} · {FAMILLES_LIGNE[l.famille]}
                            </span>
                            <span className="tav-g-cellule">{nomCategorie(l.categorie_id)}</span>
                            <span className="tav-g-cellule">{l.regime_tva === "hors_champ" ? "hors champ" : l.taux_tva !== null ? pourcent(l.taux_tva) : "de l'agence"}</span>
                            <span className="tav-g-cellule">{l.prix_eur !== null ? montant(l.prix_eur) : l.famille === "retard" ? "tarif du contrat" : "devis"}</span>
                            <span />
                            <span className="tav-g-menu">
                              <TavMenu
                                libelle={`Actions sur « ${l.libelle} »`}
                                alignement="droite"
                                options={[
                                  { libelle: "Copier la ligne au format du barème", icone: "Page", action: () => void copierLignes([l]) },
                                  { libelle: "Filtrer sur sa famille", icone: "Filtre", action: () => setFamilleFiltre(l.famille) },
                                ]}
                              />
                            </span>
                            <span />
                          </div>
                        ))
                      : null}
                  </div>
                );
              })}
            </div>
            {coches.size ? (
              <div className="tav-n-barre tav-g-barre" role="toolbar" aria-label="Actions sur la sélection">
                <span>
                  {coches.size} ligne{coches.size > 1 ? "s" : ""} sélectionnée{coches.size > 1 ? "s" : ""}
                </span>
                <button type="button" className="tav-n-barre-bouton" onClick={() => void copierLignes((monde?.lignesBareme ?? []).filter((l) => coches.has(l.id)))}>
                  <TavIcone nom="Page" taille={14} />
                  <span>Copier au format du barème</span>
                </button>
                <button type="button" className="tav-n-barre-bouton" onClick={() => exporterBareme((monde?.lignesBareme ?? []).filter((l) => coches.has(l.id)))}>
                  <TavIcone nom="Spreadsheet" taille={14} />
                  <span>Exporter (CSV)</span>
                </button>
                <button type="button" className="tav-n-barre-bouton" onClick={() => setCoches(new Set())}>
                  <span>Annuler</span>
                </button>
              </div>
            ) : null}
          </>
        ) : (
          <div className="tav-g-colonne">
            <div className="tav-g-entete-centre">
              <h2 className="tav-g-titre">Règles et responsables</h2>
              <p className="tav-g-aide">Qui reçoit les remises en location de chaque agence, ce que l&apos;assistant fait pour chaque type d&apos;incident, et les règles que Tavaro applique aux retours, aux photos et aux contestations.</p>
            </div>

            <section className="tav-g-carte" aria-label="Responsables des remises">
              <header className="tav-g-carte-tete">
                <span>
                  {entites.length} agence{entites.length > 1 ? "s" : ""} — responsables des remises
                </span>
              </header>
              <ul>
                {entites.map((entite) => {
                  const actuel = (parc?.responsables ?? []).find((x) => x.entite_id === entite)?.remise_responsable ?? "";
                  return (
                    <li key={entite} className="tav-g-modele">
                      <span className="tav-g-vignette">
                        <TavIcone nom="Team" />
                      </span>
                      <span className="tav-g-modele-texte">
                        <span className="tav-g-modele-nom">Remises de {nomAgenceDe(entite).split(" — ").pop()}</span>
                        <span className="tav-g-modele-meta">{actuel ? `Confiées d'office à ${nommer(actuel)}` : "Personne : la direction est prévenue à chaque retour"}</span>
                      </span>
                      <select
                        className="tav-g-choix"
                        aria-label={`Responsable des remises de ${nomAgenceDe(entite)}`}
                        value={actuel}
                        disabled={!direction || envoi !== null}
                        title={direction ? undefined : "La direction règle le responsable des remises"}
                        onChange={(ev) => {
                          const personne = ev.target.value;
                          if (personne) void agir(`resp:${entite}`, async () => { await gestesParc.responsable(entite, personne); return `Les remises de ${nomAgenceDe(entite)} reviennent d'office à ${nommer(personne)}.`; });
                        }}
                      >
                        {actuel ? null : <option value="">Personne</option>}
                        {(parc?.membres ?? []).map((m) => (
                          <option key={m.user_id} value={m.user_id}>
                            {nommer(m.user_id)}
                          </option>
                        ))}
                      </select>
                    </li>
                  );
                })}
              </ul>
            </section>

            <section className="tav-g-carte" aria-label="Grille d'assistance">
              <header className="tav-g-carte-tete">
                <span>
                  {o.ops.grille.length} type{o.ops.grille.length > 1 ? "s" : ""} d&apos;incident — grille d&apos;assistance
                </span>
                <button type="button" className="tav-rond tav-g-plus" aria-label="Ajouter un type d'incident" title={o.directionStricte ? "Ajouter un type d'incident" : "La direction règle la grille"} disabled={!o.directionStricte} onClick={() => o.ligneGrille()}>
                  <TavIcone nom="Plus" />
                </button>
              </header>
              <ul>
                {o.ops.grille.map((g) => (
                  <li key={g.id} className="tav-g-modele">
                    <span className="tav-g-vignette">
                      <TavIcone nom="Phone" />
                    </span>
                    <span className="tav-g-modele-texte">
                      <span className="tav-g-modele-nom">
                        {TYPES_INCIDENT[g.type_incident]} → {ACTIONS[g.action]}
                      </span>
                      <span className="tav-g-modele-meta">{[g.prestataire, g.prestataire_telephone, g.delai_cible_min ? `${g.delai_cible_min} min visées` : null].filter(Boolean).join(" · ") || "Sans prestataire"}{g.consignes ? ` · ${g.consignes}` : ""}</span>
                    </span>
                    <button type="button" className="tav-rond tav-g-plus" aria-label={`Modifier : ${TYPES_INCIDENT[g.type_incident]}`} title="Modifier" disabled={!o.directionStricte} onClick={() => o.ligneGrille(g.type_incident)}>
                      <TavIcone nom="Points" />
                    </button>
                  </li>
                ))}
              </ul>
            </section>

            <section className="tav-g-carte" aria-label="Sources">
              <header className="tav-g-carte-tete">
                <span>Sources — ce que Tavaro lit de votre logiciel</span>
              </header>
              <ul>
                {parSource.length === 0 ? (
                  <li className="tav-g-modele">
                    <span className="tav-g-vignette">
                      <TavIcone nom="Spreadsheet" />
                    </span>
                    <span className="tav-g-modele-texte">
                      <span className="tav-g-modele-nom">Aucun contrat lu pour l&apos;instant</span>
                      <span className="tav-g-modele-meta">Votre logiciel reste en place : Tavaro lit ses exports de contrats, les contrats PDF, ou ce que le comptoir saisit.</span>
                    </span>
                  </li>
                ) : (
                  parSource.map((x) => (
                    <li key={x.k} className="tav-g-modele">
                      <span className="tav-g-vignette">
                        <TavIcone nom={x.k === "pdf" ? "PdfFile" : x.k === "export" || x.k === "connecteur" ? "Spreadsheet" : "Write"} />
                      </span>
                      <span className="tav-g-modele-texte">
                        <span className="tav-g-modele-nom">{SOURCES[x.k]}</span>
                        <span className="tav-g-modele-meta">
                          {x.n} contrat{x.n > 1 ? "s" : ""}
                          {x.dernier ? ` · dernière lecture le ${dateCourte(x.dernier)} à ${new Date(x.dernier).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}` : ""}
                        </span>
                      </span>
                    </li>
                  ))
                )}
                <li className="tav-g-modele">
                  <span className="tav-g-vignette">
                    <TavIcone nom="Alert" />
                  </span>
                  <span className="tav-g-modele-texte">
                    <span className="tav-g-modele-nom">À vérifier</span>
                    <span className="tav-g-modele-meta">
                      {ecarts} contrat{ecarts > 1 ? "s" : ""} en écart avec le logiciel (une saisie à la main n&apos;est jamais écrasée) · {disparus} contrat{disparus > 1 ? "s" : ""} disparu{disparus > 1 ? "s" : ""} du dernier export
                    </span>
                  </span>
                  {ecarts ? (
                    <Link href={`${BASE}/retours`} className="tav-rond tav-g-plus" aria-label="Voir les contrats" title="Voir les contrats">
                      <TavIcone nom="Chevron" />
                    </Link>
                  ) : null}
                </li>
              </ul>
            </section>

            <section className="tav-g-carte" aria-label="Règles du loueur">
              <header className="tav-g-carte-tete">
                <span>{REGLES.length} règles du loueur</span>
              </header>
              <ul>
                {REGLES.map((r) => {
                  const v = reglages ? reglages[r.cle] : undefined;
                  return (
                    <li key={String(r.cle)} className="tav-g-modele">
                      <span className="tav-g-vignette">
                        <TavIcone nom={r.texte ? "Email" : "Clock"} />
                      </span>
                      <span className="tav-g-modele-texte">
                        <span className="tav-g-modele-nom">{r.libelle}</span>
                        <span className="tav-g-modele-meta">{v === undefined || v === null || v === "" ? "valeur par défaut" : `${String(v)}${r.unite ? ` ${r.unite}` : ""}`}</span>
                      </span>
                      <button type="button" className="tav-rond tav-g-plus" aria-label={`Modifier : ${r.libelle}`} title={direction ? "Modifier" : "La direction règle les règles du loueur"} disabled={!direction} onClick={() => { setErreur(null); setRegle({ r, valeur: v === undefined || v === null ? "" : String(v) }); }}>
                        <TavIcone nom="Points" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          </div>
        )}
      </div>

      <FenetresBareme demande={demande} onFait={(m) => toast(`C'est fait. ${m}`, "vert")} />
      <FenetreOperations o={o} />
      <Dialog open={!!regle} onOpenChange={(x) => !x && setRegle(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone>
              <Settings2 width={18} height={18} aria-hidden="true" />
            </DialogIcone>
            <DialogTitle>{regle?.r.libelle}</DialogTitle>
            <DialogDescription>La règle vaut pour toutes les agences du loueur, à partir du prochain retour ; les retours déjà chiffrés ne changent pas.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            {regle ? (
              <div className="esp-form">
                <label className="rv-libelle">
                  {regle.r.libelle}
                  {regle.r.unite ? ` (${regle.r.unite})` : ""}
                  <input className="rv-champ" inputMode={regle.r.texte ? "email" : "numeric"} value={regle.valeur} onChange={(e) => setRegle({ ...regle, valeur: e.target.value })} />
                </label>
                {erreur ? (
                  <Avis teinte="rouge" role="alert">
                    {erreur}
                  </Avis>
                ) : null}
              </div>
            ) : null}
          </DialogBody>
          <DialogFooter>
            <button
              type="button"
              className="r-btn r-btn--noir"
              disabled={envoi !== null || !regle}
              onClick={() => {
                if (!regle) return;
                const brut = regle.valeur.trim();
                const valeur = regle.r.texte ? brut || null : brut === "" ? null : Number(brut.replace(",", "."));
                if (!regle.r.texte && valeur !== null && !Number.isFinite(valeur)) {
                  setErreur("Un nombre est attendu.");
                  return;
                }
                void agir(`regle:${String(regle.r.cle)}`, async () => {
                  await reglerLoueur({ [regle.r.cle]: valeur } as Partial<ReglesLoueur>);
                  return `« ${regle.r.libelle} » est réglée.`;
                });
              }}
            >
              {envoi ? <Loader variant="spin" /> : null} Enregistrer
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TavCarte>
  );
}
