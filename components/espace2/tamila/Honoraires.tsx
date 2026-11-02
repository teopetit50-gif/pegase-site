"use client";

/* ══════════════════════════════════════════════════════════════════════
   TAMILA — Honoraires du cabinet (02/11/2026) : copie 1:1 de la liste
   « Accounts » de Plain (releves/plain-tenants.md). Seul le contenu change.

   Le tableau B12 (une fenêtre dans l'écran d'avant) : une ligne par
   dossier qu'on voit, calculée comme la carte Honoraires du dossier
   (resumer) — convention, temps non facturé, à facturer HT, provisions
   disponibles, reste dû, facturé et encaissé de l'année, et ce qui demande
   un geste (pas de convention, facture impayée depuis plus de trente
   jours, forfait consommé à 80 %, clos avec du temps non facturé).
   Colonnes de Plain → Name : dossier ; Open threads : à facturer ;
   Tier : convention ; Source : référence ; Ville : responsable ;
   MRR : temps non facturé ; Renouvellement : provisions ; Contrat actif :
   convention signée ; Modules : à faire. « Show more fields » : reste dû,
   facturé et encaissé de l'année. Filters (F) : tous / à facturer / à
   traiter (L6) ; Display (V) : colonnes montrées ; « Create account » →
   « Exporter (CSV) » (L7). Une ligne mène à la page du dossier (L5).
   Aucun dossier n'est ouvert : les honoraires se lisent pour tout le
   cabinet (chargerHonorairesCabinet, sans trace de lecture).
   ══════════════════════════════════════════════════════════════════════ */

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { MODES_HONORAIRES, resumer } from "@/components/espace/tamila/HonorairesTamila";
import { consommationForfait } from "@/components/espace/tamila/temps";
import type { Dossier } from "@/components/espace/tamila/types";
import { RACINE } from "@/components/espace2/modules";
import { PlainCarte, useOuvert } from "./TamCadre";
import { PlainIcone, TamIcone, type NomPlainIcone, type NomTamIcone } from "./TamIcone";
import { useTamila } from "./donnees";
import { useMemoire } from "./navigateur";
import "./tamp-comptes.css";

const euros = (cents: number) => (cents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: cents % 100 ? 2 : 0 });
const heures = (minutes: number) => `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, "0")}`;
const JOUR = 86_400_000;

type Signal = { texte: string; rouge: boolean };
type Ligne = {
  dossier: Dossier;
  reference: string;
  intitule: string;
  responsable: string;
  convention: { libelle: string; couleur: string } | null;
  signee: boolean | null;
  minutes: number;
  aFacturer: number;
  provisions: number;
  resteDu: number;
  factureAnnee: number;
  encaisseAnnee: number;
  signaux: Signal[];
};
type Cle = "aFacturer" | "convention" | "reference" | "responsable" | "minutes" | "provisions" | "signee" | "signaux" | "resteDu" | "factureAnnee" | "encaisseAnnee";
type Colonne = { cle: Cle; libelle: string; plain?: NomPlainIcone; linear?: NomTamIcone; droite?: boolean; plus?: boolean };

/* les couleurs des tiers créés pour le relevé (plain-tenants.md) : Entreprise, Business, Essentiel, Pilote */
const COULEURS_MODE: Record<string, string> = { temps_passe: "#7048E8", forfait: "#1971C2", mixte: "#2F9E44" };

const COLONNES: Colonne[] = [
  { cle: "aFacturer", libelle: "À facturer HT", plain: "Cercle", droite: true },
  { cle: "convention", libelle: "Convention", plain: "Tier" },
  { cle: "reference", libelle: "Référence", plain: "Source" },
  { cle: "responsable", libelle: "Responsable", linear: "ProjectLead" },
  { cle: "minutes", libelle: "Temps non facturé", linear: "Clock", droite: true },
  { cle: "provisions", libelle: "Provisions disponibles", linear: "Euro", droite: true },
  { cle: "signee", libelle: "Convention signée", linear: "Signature" },
  { cle: "signaux", libelle: "À faire", linear: "Label" },
  { cle: "resteDu", libelle: "Reste dû", linear: "Euro", droite: true, plus: true },
  { cle: "factureAnnee", libelle: "Facturé TTC de l'année", linear: "Page", droite: true, plus: true },
  { cle: "encaisseAnnee", libelle: "Encaissé TTC de l'année", linear: "Bank", droite: true, plus: true },
];

type Filtre = "tous" | "a_facturer" | "signaux";

function MenuColonne({ c, tri, sens, trier, masquer }: { c: Colonne; tri: Cle; sens: 1 | -1; trier: (c: Cle, s: 1 | -1) => void; masquer: (c: Cle) => void }) {
  const { ouvert, setOuvert, boite } = useOuvert<HTMLDivElement>();
  return (
    <div ref={boite} style={{ position: "relative" }}>
      <button type="button" className="tamp-th" data-droite={c.droite ? "" : undefined} aria-haspopup="menu" aria-expanded={ouvert} aria-label={`Options de la colonne ${c.libelle}`} onClick={() => setOuvert((o) => !o)}>
        {c.plain ? <PlainIcone nom={c.plain} taille={14} /> : c.linear ? <TamIcone nom={c.linear} taille={14} /> : null}
        {c.libelle}
        {tri === c.cle ? <PlainIcone nom={sens === -1 ? "TriBas" : "TriHaut"} taille={14} /> : null}
      </button>
      {ouvert ? (
        <div className="tamp-menu" role="menu" style={{ top: 34, right: 0, width: 157 }}>
          <button type="button" role="menuitem" className="tamp-menu-option" onClick={() => (trier(c.cle, 1), setOuvert(false))}>
            <PlainIcone nom="TriHaut" taille={14} /> Tri croissant {tri === c.cle && sens === 1 ? "✓" : ""}
          </button>
          <button type="button" role="menuitem" className="tamp-menu-option" onClick={() => (trier(c.cle, -1), setOuvert(false))}>
            <PlainIcone nom="TriBas" taille={14} /> Tri décroissant {tri === c.cle && sens === -1 ? "✓" : ""}
          </button>
          <div className="tamp-menu-sep" role="separator" />
          <button type="button" role="menuitem" className="tamp-menu-option" onClick={() => (masquer(c.cle), setOuvert(false))}>
            <PlainIcone nom="Croix" taille={14} /> Masquer la colonne
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default function Honoraires() {
  const t = useTamila();
  const params = useSearchParams();
  const router = useRouter();
  const filtre = (["a_facturer", "signaux"].includes(params.get("filtre") ?? "") ? params.get("filtre") : "tous") as Filtre;
  const [tri, setTri] = useState<Cle>("aFacturer");
  const [sens, setSens] = useState<1 | -1>(-1);
  const [masquees, setMasquees] = useState<Set<Cle>>(() => new Set(COLONNES.filter((c) => c.plus).map((c) => c.cle)));
  const [recherche, setRecherche] = useState("");
  const favoris = useMemoire("favoris");
  const favori = favoris.a("page:honoraires");
  const { ouvert: filtresOuvert, setOuvert: ouvrirFiltres, boite: boiteFiltres } = useOuvert<HTMLDivElement>();
  const { ouvert: affichageOuvert, setOuvert: ouvrirAffichage, boite: boiteAffichage } = useOuvert<HTMLDivElement>();
  const [maintenant] = useState(() => Date.now());
  const recherchee = useRef<HTMLInputElement>(null);
  const { lireAnnexes } = t;
  useEffect(() => lireAnnexes(), [lireAnnexes]);

  /* F : filtres ; V : affichage (raccourcis de Plain) */
  useEffect(() => {
    const touche = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || (e.target as HTMLElement).closest("input, textarea, select")) return;
      if (e.key === "f" || e.key === "F") ouvrirFiltres((o) => !o);
      if (e.key === "v" || e.key === "V") ouvrirAffichage((o) => !o);
    };
    document.addEventListener("keydown", touche);
    return () => document.removeEventListener("keydown", touche);
  }, [ouvrirFiltres, ouvrirAffichage]);

  const poserFiltre = (f: Filtre) => router.replace(`${RACINE}/tamila/honoraires${f === "tous" ? "" : `?filtre=${f}`}`, { scroll: false });

  const lignes: Ligne[] = useMemo(() => {
    const par = t.annexes?.honoraires;
    if (!par) return [];
    const annee = new Date(maintenant).getFullYear().toString();
    return t.lignes
      .filter((x) => x.dossier.statut !== "efface" && x.dossier.statut !== "refuse")
      .map(({ dossier, clair }) => {
        const h = par[dossier.id] ?? { convention: null, conventions: [], temps: [], provisions: [], factures: [] };
        const r = resumer(h, dossier, maintenant);
        const c = h.convention;
        const forfait = consommationForfait(c, h);
        const signaux: Signal[] = [];
        if (r.sansConvention) signaux.push({ texte: "Sans convention signée", rouge: true });
        const impayees = h.factures.filter((f) => f.statut === "emise" && maintenant - Date.parse(`${f.emise_le}T12:00:00Z`) > 30 * JOUR);
        if (impayees.length) signaux.push({ texte: `${impayees.length} facture${impayees.length > 1 ? "s" : ""} impayée${impayees.length > 1 ? "s" : ""} > 30 j`, rouge: true });
        if (forfait?.pct !== null && forfait?.pct !== undefined && forfait.pct >= 80) signaux.push({ texte: `Forfait à ${forfait.pct} %`, rouge: forfait.pct >= 100 });
        if (dossier.statut === "clos" && r.aFacturerHt > 0) signaux.push({ texte: "Clos, temps non facturé", rouge: false });
        return {
          dossier,
          reference: clair?.reference ?? "Chiffré",
          intitule: clair?.intitule ?? "Intitulé chiffré",
          responsable: t.nomDe(dossier.responsable_id),
          convention: c ? { libelle: `${MODES_HONORAIRES[c.mode]}${c.statut === "signee" ? "" : c.urgence ? " (urgence)" : ""}`, couleur: COULEURS_MODE[c.mode] } : null,
          signee: c ? c.statut === "signee" : null,
          minutes: r.minutes,
          aFacturer: r.aFacturerHt,
          provisions: r.provisionsDispo,
          resteDu: r.resteDu,
          factureAnnee: h.factures.filter((f) => f.statut !== "annulee" && f.emise_le.startsWith(annee)).reduce((s, f) => s + f.total_ttc_cents, 0),
          encaisseAnnee: h.factures.filter((f) => f.statut === "payee" && (f.payee_le ?? "").startsWith(annee)).reduce((s, f) => s + f.total_ttc_cents, 0),
          signaux,
        };
      });
  }, [t, maintenant]);

  const valeurTri = (l: Ligne): string | number => {
    switch (tri) {
      case "convention":
        return l.convention?.libelle ?? "";
      case "reference":
        return l.reference;
      case "responsable":
        return l.responsable;
      case "signee":
        return l.signee === null ? -1 : l.signee ? 1 : 0;
      case "signaux":
        return l.signaux.length;
      default:
        return l[tri];
    }
  };
  const q = recherche.trim().toLowerCase();
  const visibles = lignes
    .filter((l) => (filtre === "a_facturer" ? l.aFacturer > 0 : filtre === "signaux" ? l.signaux.length > 0 : true))
    .filter((l) => !q || `${l.reference} ${l.intitule} ${l.responsable}`.toLowerCase().includes(q))
    .sort((a, b) => {
      const x = valeurTri(a);
      const y = valeurTri(b);
      return (x < y ? -1 : x > y ? 1 : 0) * sens;
    });
  const colonnes = COLONNES.filter((c) => !masquees.has(c.cle));
  const total = (k: "minutes" | "aFacturer" | "provisions" | "resteDu" | "factureAnnee" | "encaisseAnnee") => lignes.reduce((s, l) => s + l[k], 0);
  const triParDefaut = tri === "aFacturer" && sens === -1;

  /* L7 — le CSV, composé ici : rien ne part au serveur */
  const exporter = () => {
    const champ = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const tete = ["Référence", "Intitulé", "Responsable", "Statut", "Convention", "Temps non facturé (min)", "À facturer HT (€)", "Provisions disponibles (€)", "Reste dû (€)", "Facturé TTC dans l'année (€)", "Encaissé TTC dans l'année (€)", "À faire"];
    const corps = lignes.map((l) => [l.reference, l.intitule, l.responsable, l.dossier.statut, l.convention?.libelle ?? "Aucune", l.minutes, (l.aFacturer / 100).toFixed(2), (l.provisions / 100).toFixed(2), (l.resteDu / 100).toFixed(2), (l.factureAnnee / 100).toFixed(2), (l.encaisseAnnee / 100).toFixed(2), l.signaux.map((s) => s.texte).join(" ; ")]);
    const csv = "﻿" + [tete, ...corps].map((r) => r.map(champ).join(";")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `honoraires-cabinet-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const cellule = (c: Colonne, l: Ligne) => {
    switch (c.cle) {
      case "aFacturer":
        return (
          <span className="tamp-nombre">
            <PlainIcone nom="Cercle" taille={14} />
            {euros(l.aFacturer)}
          </span>
        );
      case "convention":
        return l.convention ? (
          <span className="tamp-pastille">
            <PlainIcone nom="Tier" taille={14} style={{ color: l.convention.couleur }} />
            {l.convention.libelle}
          </span>
        ) : (
          <span className="tamp-vide">–</span>
        );
      case "reference":
        return (
          <span className="tamp-source">
            <PlainIcone nom="Api" taille={14} />
            {l.reference}
          </span>
        );
      case "responsable":
        return <span className="tamp-gris">{l.responsable}</span>;
      case "minutes":
        return <div className="tamp-gris tamp-droite">{l.minutes ? heures(l.minutes) : <span className="tamp-vide">–</span>}</div>;
      case "provisions":
        return <div className="tamp-gris tamp-droite">{l.provisions ? euros(l.provisions) : <span className="tamp-vide">–</span>}</div>;
      case "signee":
        return l.signee === null ? <span className="tamp-vide">–</span> : <span className="tamp-oui" data-non={l.signee ? undefined : ""}>{l.signee ? "Oui" : "Non"}</span>;
      case "signaux":
        return l.signaux.length ? (
          <span className="tamp-pile">
            {l.signaux.map((s) => (
              <span key={s.texte} className="tamp-pastille tamp-pastille--nue" style={s.rouge ? { color: "var(--p-rouge-icone-1)" } : undefined}>
                {s.texte}
              </span>
            ))}
          </span>
        ) : (
          <span className="tamp-vide">–</span>
        );
      default:
        return <div className="tamp-gris tamp-droite">{l[c.cle] ? euros(l[c.cle] as number) : <span className="tamp-vide">–</span>}</div>;
    }
  };

  return (
    <PlainCarte>
      <div className="tamp-col">
        <header className="tamp-tete">
          <div className="tamp-tete-titre">
            <PlainIcone nom="Batiment" />
            <h1 className="tamp-titre">Honoraires du cabinet</h1>
          </div>
          <div className="tamp-tete-actions">
            <button type="button" className="tamp-icone" aria-pressed={favori} aria-label={favori ? "Désépingler la page" : "Épingler en tête de la vue d'ensemble"} title={favori ? "Désépingler la page" : "Épingler en tête de la vue d'ensemble"} onClick={() => favoris.basculer("page:honoraires")}>
              <PlainIcone nom="Etoile" style={favori ? { color: "var(--p-jaune-icone-1)" } : undefined} />
            </button>
            <div ref={boiteFiltres} style={{ position: "relative" }}>
              <button type="button" className="tamp-fantome" aria-haspopup="menu" aria-expanded={filtresOuvert} aria-keyshortcuts="F" onClick={() => ouvrirFiltres((o) => !o)}>
                <PlainIcone nom="Filtres" />
                Filtres
              </button>
              {filtresOuvert ? (
                <div className="tamp-menu" role="menu" style={{ top: 38, right: 0, width: 200 }}>
                  {(
                    [
                      ["tous", "Tous les dossiers"],
                      ["a_facturer", "À facturer"],
                      ["signaux", "À traiter"],
                    ] as [Filtre, string][]
                  ).map(([f, l]) => (
                    <button key={f} type="button" role="menuitemradio" aria-checked={filtre === f} className="tamp-menu-option" onClick={() => (poserFiltre(f), ouvrirFiltres(false))}>
                      <PlainIcone nom="Filtres" taille={14} />
                      <span style={{ flex: 1 }}>{l}</span>
                      {filtre === f ? "✓" : ""}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <div ref={boiteAffichage} style={{ position: "relative" }}>
              <button type="button" className="tamp-fantome" aria-haspopup="dialog" aria-expanded={affichageOuvert} aria-keyshortcuts="V" onClick={() => ouvrirAffichage((o) => !o)}>
                <PlainIcone nom="Ecran" />
                Affichage
                <span className="tamp-kbd">V</span>
              </button>
              {affichageOuvert ? (
                <div className="tamp-popover" role="dialog" aria-label="Affichage" style={{ top: 42, right: 0 }}>
                  <h4>Colonnes du tableau</h4>
                  {COLONNES.map((c) => (
                    <div key={c.cle} className="tamp-popover-ligne">
                      {c.plain ? <PlainIcone nom={c.plain} taille={14} /> : c.linear ? <TamIcone nom={c.linear} taille={14} /> : null}
                      <span>{c.libelle}</span>
                      <button
                        type="button"
                        className="tamp-oeil"
                        aria-pressed={!masquees.has(c.cle)}
                        aria-label={masquees.has(c.cle) ? `Montrer ${c.libelle}` : `Masquer ${c.libelle}`}
                        onClick={() =>
                          setMasquees((m) => {
                            const n = new Set(m);
                            if (n.has(c.cle)) n.delete(c.cle);
                            else n.add(c.cle);
                            return n;
                          })
                        }
                      >
                        <TamIcone nom={masquees.has(c.cle) ? "IssueStatusTodo" : "IssueStatusDone"} taille={14} />
                      </button>
                    </div>
                  ))}
                  <p className="tamp-popover-pied">Les montants se calculent comme dans la page de chaque dossier.</p>
                </div>
              ) : null}
            </div>
            <button type="button" className="tamp-secondaire" onClick={exporter} disabled={!lignes.length}>
              <PlainIcone nom="Plus" />
              Exporter (CSV)
            </button>
          </div>
        </header>
        <section className="tamp-section" aria-label="Honoraires par dossier">
          <div className="tamp-outils">
            <label className="tamp-recherche">
              <PlainIcone nom="Loupe" />
              <input ref={recherchee} type="search" placeholder="Rechercher" value={recherche} onChange={(e) => setRecherche(e.target.value)} aria-label="Rechercher un dossier" />
            </label>
            <span className="tamp-tri">
              <PlainIcone nom="Tri" />
              Trié par <b>{COLONNES.find((c) => c.cle === tri)?.libelle}</b>
              {!triParDefaut ? (
                <button
                  type="button"
                  aria-label="Retirer le tri"
                  onClick={() => {
                    setTri("aFacturer");
                    setSens(-1);
                  }}
                >
                  <PlainIcone nom="Croix" taille={14} />
                </button>
              ) : null}
            </span>
          </div>
          {t.annexes === null ? <p className="tamp-pied">Lecture des honoraires…</p> : null}
          {t.annexes && !Object.keys(t.annexes.honoraires).length && t.source === "reelle" ? <p className="tamp-pied">Les honoraires ne sont pas encore installés sur cette base.</p> : null}
          <table className="tamp-table">
            <thead>
              <tr>
                <th scope="col">
                  <span className="tamp-th">Dossier</span>
                </th>
                {colonnes.map((c) => (
                  <th key={c.cle} scope="col">
                    <MenuColonne
                      c={c}
                      tri={tri}
                      sens={sens}
                      trier={(k, s) => {
                        setTri(k);
                        setSens(s);
                      }}
                      masquer={(k) => setMasquees((m) => new Set(m).add(k))}
                    />
                  </th>
                ))}
                <th scope="col" aria-label="Plus de colonnes">
                  <button type="button" className="tamp-th" aria-label="Montrer plus de colonnes" onClick={() => ouvrirAffichage(true)}>
                    <PlainIcone nom="Points" taille={14} />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((l) => {
                const href = `${RACINE}/tamila/dossiers/${l.dossier.id}?onglet=honoraires`;
                return (
                  <tr key={l.dossier.id}>
                    <td>
                      <Link href={href} className="tamp-cellule-lien" aria-label={`Ouvrir ${l.reference}`} />
                      <span className="tamp-nom">
                        <span className="tamp-vignette">
                          <PlainIcone nom="Batiment" taille={12} />
                        </span>
                        <span>{l.intitule}</span>
                      </span>
                    </td>
                    {colonnes.map((c) => (
                      <td key={c.cle}>
                        <Link href={href} className="tamp-cellule-lien" tabIndex={-1} aria-hidden="true" />
                        {cellule(c, l)}
                      </td>
                    ))}
                    <td>
                      <Link href={href} className="tamp-cellule-lien" tabIndex={-1} aria-hidden="true" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="tamp-pied">
            {visibles.length ? (
              <span>
                Total du cabinet : {euros(total("aFacturer"))} HT à facturer ({heures(total("minutes"))}) · {euros(total("resteDu"))} restant dus · {euros(total("provisions"))} de provisions · facturé {euros(total("factureAnnee"))}, encaissé {euros(total("encaisseAnnee"))} cette année
              </span>
            ) : (
              <span>{lignes.length ? "Aucun dossier dans ce filtre." : "Aucun dossier."}</span>
            )}
          </div>
        </section>
      </div>
    </PlainCarte>
  );
}
