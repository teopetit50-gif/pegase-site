"use client";

/* ══════════════════════════════════════════════════════════════════════
   TAMILA › Honoraires du cabinet (30/10/2026, refonte des pages métiers)

   La liste « Tenants » de Plain, au 1:1 : relevé docs/refonte-metiers/
   releves/plain-tenants.md, briques ListeClients de components/espace2/lin/
   FicheClient.tsx (préfixe pc-, plain-clients.css). Tête (titre, filtres,
   export), recherche, tableau à colonnes qui se replient.

   L'écran d'avant l'ouvrait dans une fenêtre (HonorairesCabinet, B12 ;
   inventaire § 8.4-1). Tout y est : les totaux (à facturer HT et heures,
   reste dû et provisions, facturé et encaissé de l'année), les filtres
   Tous / À facturer / À traiter (L6, dans l'adresse : ?filtre=, que
   visent les lignes E8 et E9 du point du matin), le tableau par dossier
   (référence, intitulé, responsable, convention, non facturé, à facturer,
   provisions, reste dû, signaux), la référence qui ouvre le dossier (L5,
   onglet Honoraires) et l'export CSV (L7). Mêmes calculs (resumer,
   consommationForfait). Une lecture du cabinet, aucun dossier ouvert.
   ══════════════════════════════════════════════════════════════════════ */

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Download, Scale } from "lucide-react";
import { honorairesExemple } from "@/components/espace/tamila/exemples";
import { MODES_HONORAIRES, resumer } from "@/components/espace/tamila/HonorairesTamila";
import * as portes from "@/components/espace/tamila/portes";
import { consommationForfait } from "@/components/espace/tamila/temps";
import type { Dossier, Honoraires as H } from "@/components/espace/tamila/types";
import { ListeClients, type ColonnePc, type LignePc, type OptionPc } from "../lin/FicheClient";
import { lienDossier } from "./commun";
import { useTamila } from "./donnees";
import "../lin/lin.css";
import "../lin/plain-clients.css";

const euros = (cents: number) => (cents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
const heures = (minutes: number) => `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, "0")}`;
const JOUR = 86_400_000;

type Filtre = "tous" | "a_facturer" | "signaux";
const FILTRES: { cle: Filtre; libelle: string }[] = [
  { cle: "tous", libelle: "Tous" },
  { cle: "a_facturer", libelle: "À facturer" },
  { cle: "signaux", libelle: "À traiter" },
];

type Ligne = {
  dossier: Dossier;
  reference: string;
  intitule: string | null;
  responsable: string;
  convention: string;
  minutes: number;
  aFacturer: number;
  provisions: number;
  resteDu: number;
  factureAnnee: number;
  encaisseAnnee: number;
  signaux: { texte: string; teinte: "rouge" | "jaune" }[];
};

export default function HonorairesCabinet() {
  const { source, pret, lignes: dossiers, clientId, nomDe, avocat, installe } = useTamila();
  const params = useSearchParams();
  const chemin = usePathname();
  const routeur = useRouter();
  const f = params.get("filtre");
  const filtre: Filtre = f === "a_facturer" || f === "signaux" ? f : "tous";
  const [q, setQ] = useState("");

  /* undefined : lecture ; null : la base n'a pas les honoraires (b4_06) */
  const [lu, setLu] = useState<{ par: Record<string, H> | null; le: number } | undefined>(undefined);
  const permis = source === "exemple" || (avocat && installe);
  const ids = useMemo(() => dossiers.map((d) => d.dossier.id).join(","), [dossiers]);
  useEffect(() => {
    if (!pret || !permis) return;
    let actif = true;
    const t = window.setTimeout(async () => {
      const x = source === "exemple" ? Object.fromEntries(ids.split(",").filter(Boolean).map((id) => [id, honorairesExemple(id)])) : await portes.chargerHonorairesCabinet(clientId);
      if (actif) setLu({ par: x, le: Date.now() });
    }, 0);
    return () => {
      actif = false;
      window.clearTimeout(t);
    };
  }, [pret, permis, source, clientId, ids]);

  const lignes: Ligne[] = useMemo(() => {
    if (!lu?.par) return [];
    const par = lu.par;
    const maintenant = lu.le;
    const annee = new Date(maintenant).getFullYear().toString();
    return dossiers
      .filter((x) => x.dossier.statut !== "efface" && x.dossier.statut !== "refuse")
      .map(({ dossier, clair }) => {
        const h = par[dossier.id] ?? { convention: null, conventions: [], temps: [], provisions: [], factures: [] };
        const r = resumer(h, dossier, maintenant);
        const c = h.convention;
        const forfait = consommationForfait(c, h);
        const signaux: Ligne["signaux"] = [];
        if (r.sansConvention) signaux.push({ texte: "Sans convention signée", teinte: "rouge" });
        const impayees = h.factures.filter((x) => x.statut === "emise" && maintenant - Date.parse(`${x.emise_le}T12:00:00Z`) > 30 * JOUR);
        if (impayees.length) signaux.push({ texte: `${impayees.length} facture${impayees.length > 1 ? "s" : ""} impayée${impayees.length > 1 ? "s" : ""} à 30 jours`, teinte: "rouge" });
        if (forfait?.pct !== null && forfait?.pct !== undefined && forfait.pct >= 80) signaux.push({ texte: `Forfait consommé à ${forfait.pct} %`, teinte: forfait.pct >= 100 ? "rouge" : "jaune" });
        if (dossier.statut === "clos" && r.aFacturerHt > 0) signaux.push({ texte: "Clos avec du temps non facturé", teinte: "jaune" });
        return {
          dossier,
          reference: clair?.reference ?? "Chiffré",
          intitule: clair?.intitule ?? null,
          responsable: nomDe(dossier.responsable_id),
          convention: c ? `${MODES_HONORAIRES[c.mode]}${c.statut === "signee" ? "" : c.urgence ? " (urgence)" : " (non signée)"}` : "Aucune",
          minutes: r.minutes,
          aFacturer: r.aFacturerHt,
          provisions: r.provisionsDispo,
          resteDu: r.resteDu,
          factureAnnee: h.factures.filter((x) => x.statut !== "annulee" && x.emise_le.startsWith(annee)).reduce((s, x) => s + x.total_ttc_cents, 0),
          encaisseAnnee: h.factures.filter((x) => x.statut === "payee" && (x.payee_le ?? "").startsWith(annee)).reduce((s, x) => s + x.total_ttc_cents, 0),
          signaux,
        };
      })
      .sort((a, b) => b.signaux.length - a.signaux.length || b.aFacturer + b.resteDu - (a.aFacturer + a.resteDu));
  }, [lu, dossiers, nomDe]);

  const dansFiltre = (l: Ligne, x: Filtre) => (x === "a_facturer" ? l.aFacturer > 0 : x === "signaux" ? l.signaux.length > 0 : true);
  const recherche = q.trim().toLowerCase();
  const visibles = lignes.filter((l) => dansFiltre(l, filtre) && (!recherche || `${l.reference} ${l.intitule ?? ""} ${l.responsable}`.toLowerCase().includes(recherche)));
  const total = (k: "minutes" | "aFacturer" | "provisions" | "resteDu" | "factureAnnee" | "encaisseAnnee") => lignes.reduce((s, l) => s + l[k], 0);
  const aller = (x: Filtre) => routeur.push(x === "tous" ? chemin : `${chemin}?filtre=${x}`, { scroll: false });

  const exporter = () => {
    const champ = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const tete = ["Référence", "Intitulé", "Responsable", "Statut", "Convention", "Temps non facturé (min)", "À facturer HT (€)", "Provisions disponibles (€)", "Reste dû (€)", "Facturé TTC dans l'année (€)", "Encaissé TTC dans l'année (€)", "À faire"];
    const corps = lignes.map((l) => [l.reference, l.intitule ?? "", l.responsable, l.dossier.statut, l.convention, l.minutes, (l.aFacturer / 100).toFixed(2), (l.provisions / 100).toFixed(2), (l.resteDu / 100).toFixed(2), (l.factureAnnee / 100).toFixed(2), (l.encaisseAnnee / 100).toFixed(2), l.signaux.map((s) => s.texte).join(" ; ")]);
    const csv = "﻿" + [tete, ...corps].map((r) => r.map(champ).join(";")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `honoraires-cabinet-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const filtres: OptionPc[] = FILTRES.map((x) => ({ cle: x.cle, libelle: x.libelle, meta: String(lignes.filter((l) => dansFiltre(l, x.cle)).length), coche: filtre === x.cle, action: () => aller(x.cle) }));

  const colonnes: ColonnePc[] = [
    { cle: "dossier", libelle: "Dossier" },
    { cle: "responsable", libelle: "Responsable", largeur: 130, repli: "secondaire" },
    { cle: "convention", libelle: "Convention", largeur: 140, repli: "tertiaire" },
    { cle: "minutes", libelle: "Non facturé", num: true, largeur: 90, repli: "tertiaire" },
    { cle: "a_facturer", libelle: "À facturer HT", num: true, largeur: 120, triee: true },
    { cle: "provisions", libelle: "Provisions", num: true, largeur: 100, repli: "secondaire" },
    { cle: "reste", libelle: "Reste dû", num: true, largeur: 100, repli: "tertiaire" },
    { cle: "signaux", libelle: "À faire", largeur: 190, repli: "secondaire" },
  ];
  const tirets = (v: number, rendu: (v: number) => string) => (v ? <span className="pc-val pc-val--num">{rendu(v)}</span> : <span className="pc-gris">—</span>);
  const lignesPc: LignePc[] = visibles.map((l) => ({
    id: l.dossier.id,
    href: lienDossier(l.dossier.id, "honoraires"),
    libelle: `Ouvrir les honoraires du dossier ${l.reference}`,
    cellules: [
      <>
        <span className="pc-tuile">
          <Scale width={12} height={12} aria-hidden="true" />
        </span>
        <span>
          {l.reference}{" "}
          <small className="pc-gris" style={{ fontSize: 12, fontWeight: 400 }}>
            {l.intitule ?? "intitulé chiffré"}
          </small>
        </span>
      </>,
      <span key="r" className="pc-gris">
        {l.responsable}
      </span>,
      <span key="c" className={l.convention === "Aucune" ? "pc-gris" : "pc-val"}>
        {l.convention}
      </span>,
      <span key="m">{tirets(l.minutes, heures)}</span>,
      <span key="a">{tirets(l.aFacturer, euros)}</span>,
      <span key="p">{tirets(l.provisions, euros)}</span>,
      <span key="d">{tirets(l.resteDu, euros)}</span>,
      l.signaux.length ? (
        <span key="s" className="pc-val" data-teinte={l.signaux[0].teinte} title={l.signaux.map((s) => s.texte).join(" ; ")}>
          {l.signaux[0].texte}
          {l.signaux.length > 1 ? ` (+${l.signaux.length - 1})` : ""}
        </span>
      ) : (
        <span key="s" className="pc-gris">
          —
        </span>
      ),
    ],
  }));

  const annee = new Date().getFullYear();
  return (
    <ListeClients
      icone={<Scale width={18} height={18} aria-hidden="true" />}
      titre="Honoraires du cabinet"
      filtres={filtres}
      action={
        <button type="button" className="pc-btn pc-btn--plein" disabled={!lu?.par || !lignes.length} onClick={exporter}>
          <Download aria-hidden="true" />
          Exporter (CSV)
        </button>
      }
      recherche={{ valeur: q, changer: setQ, placeholder: "Rechercher un dossier" }}
      tri={{ libelle: "ce qui est à traiter, puis le montant" }}
      filtresActifs={filtre !== "tous" ? [{ cle: filtre, libelle: FILTRES.find((x) => x.cle === filtre)!.libelle, retirer: () => aller("tous") }] : undefined}
      erreur={null}
      colonnes={colonnes}
      lignes={lignesPc}
      chargement={permis && (source === "reelle" ? !pret || lu === undefined : lu === undefined)}
      vide={
        !permis
          ? { titre: "Réservé aux avocats du cabinet", texte: "Les honoraires du cabinet se lisent par un avocat, Tamila installé." }
          : lu?.par === null
            ? { titre: "Honoraires pas encore installés", texte: "Les tables des honoraires ne sont pas posées sur cette base." }
            : { titre: filtre === "tous" ? "Aucun dossier" : "Rien dans cette famille", texte: "Les dossiers que vous voyez, calculés comme dans chaque dossier." }
      }
      pied={
        lignes.length ? (
          <p className="pc-chargement">
            À facturer {euros(total("aFacturer"))} HT, {heures(total("minutes"))} non facturées · reste dû {euros(total("resteDu"))}, provisions disponibles {euros(total("provisions"))} · facturé en {annee} {euros(total("factureAnnee"))} TTC, encaissé {euros(total("encaisseAnnee"))}
          </p>
        ) : null
      }
    />
  );
}
