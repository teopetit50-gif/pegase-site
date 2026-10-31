"use client";

/* ══════════════════════════════════════════════════════════════════════
   TAMILA › Pilotage du cabinet (30/10/2026, refonte des pages métiers)

   « Insights › Reporting » de Plain, au 1:1 : briques Rapport, Section-
   Rapport, CarteRapport et TableauRapport de components/espace2/lin/
   Rapports.tsx (plain-rapports.css, préfixe rap-). Une tête (titre,
   Actions, Filtres), une section « Vue d'ensemble » de cinq cartes à
   grand chiffre, puis une section par vue avec son tableau.

   L'écran d'avant l'ouvrait dans une fenêtre (PilotageCabinet, B13 ;
   inventaire § 8.4-1). Mêmes calculs (pilotage.ts : marges, charges,
   séries, sansDiligence, piecesAttendues), mêmes lectures du cabinet
   (chargerPilotage, aucun dossier ouvert) ; les cinq vues (L8) passent
   dans le menu Filtres et l'adresse (?vue=) ; le coût de revient d'une
   heure (L8, gardé dans ce navigateur) dans Actions ; chaque référence
   ouvre le dossier (L5). E11-E14 (expertises) mènent à « Pièces
   attendues ».
   ══════════════════════════════════════════════════════════════════════ */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Gauge } from "lucide-react";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { dateCourte } from "@/components/espace/format";
import { attentesExemple, conformiteExemple, expertisesExemple, honorairesExemple } from "@/components/espace/tamila/exemples";
import { charges, marges, piecesAttendues, sansDiligence, series, type DonneesPilotage } from "@/components/espace/tamila/pilotage";
import * as portes from "@/components/espace/tamila/portes";
import { libelleMatiere } from "@/components/espace/tamila/regles";
import type { Clair, Dossier } from "@/components/espace/tamila/types";
import { AvisRapport, CarteRapport, Rapport, SectionRapport, TableauRapport, pluriel, type OptionRapport } from "../lin/Rapports";
import { lienDossier, type OngletDossier } from "./commun";
import { useTamila } from "./donnees";
import "@/components/espace/espace.css";
import "../lin/lin.css";
import "../lin/plain-rapports.css";

type Vue = "marge" | "charge" | "series" | "diligence" | "pieces";
const VUES: { cle: Vue; libelle: string }[] = [
  { cle: "marge", libelle: "Marge" },
  { cle: "charge", libelle: "Charge" },
  { cle: "series", libelle: "Séries" },
  { cle: "diligence", libelle: "Sans diligence" },
  { cle: "pieces", libelle: "Pièces attendues" },
];
const estVue = (x: string | null): x is Vue => VUES.some((v) => v.cle === x);
const euros = (cents: number) => (cents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const heures = (minutes: number) => `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, "0")}`;
const CLE_COUT = "omega.tamila.cout_horaire";

function coutMemorise(): number {
  try {
    const v = parseInt(window.localStorage.getItem(CLE_COUT) ?? "", 10);
    return Number.isFinite(v) && v >= 1000 && v <= 100000 ? v : 9000;
  } catch {
    return 9000;
  }
}

export default function Pilotage() {
  const { source, pret, lignes, delaisCabinet, audiencesCabinet, personnes, local, clientId, avocat, installe } = useTamila();
  const params = useSearchParams();
  const chemin = usePathname();
  const v = params.get("vue");
  const vue: Vue | null = estVue(v) ? v : null;
  const lien = (x: Vue | null) => (x ? `${chemin}?vue=${x}` : chemin);
  const permis = source === "exemple" || (avocat && installe);

  const [lu, setLu] = useState<{ x: Omit<DonneesPilotage, "dossiers" | "delais" | "audiences" | "personnes">; le: number } | null | undefined>(undefined);
  const [cout, setCout] = useState<number>(9000);
  const [fenetreCout, setFenetreCout] = useState(false);
  const [saisie, setSaisie] = useState("");

  useEffect(() => {
    if (!pret || !permis) return;
    let actif = true;
    const t = window.setTimeout(async () => {
      setCout(coutMemorise());
      try {
        const x =
          source === "exemple"
            ? {
                honoraires: Object.fromEntries(local.map((c) => [c.dossier.id, honorairesExemple(c.dossier.id)])),
                avis: local.flatMap((c) => c.avis.map((a) => ({ dossier_id: a.dossier_id, date_avis: a.date_avis }))),
                pieces: local.flatMap((c) => c.pieces.map((p) => ({ objet_id: c.dossier.id, recue_le: p.recue_le, type_piece: p.type_piece }))),
                vigilances: local.flatMap((c) => {
                  const vg = conformiteExemple(c.dossier.id).vigilance;
                  return vg ? [vg] : [];
                }),
                expertises: local.flatMap((c) => expertisesExemple(c.dossier.id)),
                attentes: local.flatMap((c) => attentesExemple(c.dossier.id)),
              }
            : await portes.chargerPilotage(clientId);
        if (actif) setLu({ x, le: Date.now() });
      } catch {
        if (actif) setLu(null);
      }
    }, 0);
    return () => {
      actif = false;
      window.clearTimeout(t);
    };
  }, [pret, permis, source, clientId, local]);

  const dossiers = useMemo(() => lignes.map((x) => ({ dossier: x.dossier, clair: x.clair })), [lignes]);
  const donnees: DonneesPilotage | null = useMemo(() => (lu ? { ...lu.x, dossiers, delais: delaisCabinet, audiences: audiencesCabinet, personnes } : null), [lu, dossiers, delaisCabinet, audiencesCabinet, personnes]);
  const m = useMemo(() => (donnees && lu ? marges(donnees, cout, lu.le) : []), [donnees, cout, lu]);
  const c = useMemo(() => (donnees && lu ? charges(donnees, lu.le) : []), [donnees, lu]);
  const s = useMemo(() => (donnees ? series(donnees) : []), [donnees]);
  const sd = useMemo(() => (donnees && lu ? sansDiligence(donnees, lu.le) : []), [donnees, lu]);
  const pa = useMemo(() => (donnees && lu ? piecesAttendues(donnees, lu.le) : []), [donnees, lu]);

  const poserCout = () => {
    const x = Math.round(parseFloat(saisie.replace(",", ".")) * 100);
    if (!Number.isFinite(x) || x < 1000 || x > 100000) return;
    setCout(x);
    try {
      window.localStorage.setItem(CLE_COUT, String(x));
    } catch {
      /* le réglage vaut pour la séance */
    }
    setFenetreCout(false);
  };

  const ref = (d: Dossier, clair: Clair | null, onglet?: OngletDossier) => <Link href={lienDossier(d.id, onglet)}>{clair?.reference ?? "Chiffré"}</Link>;
  const montre = (x: Vue) => !vue || vue === x;
  const negatives = m.filter((x) => x.margeCents < 0).length;
  const margeTotale = m.reduce((t, x) => t + x.margeCents, 0);
  const minutes30 = c.reduce((t, x) => t + x.minutes30, 0);

  const actions: OptionRapport[] = [{ cle: "cout", libelle: `Coût de revient d'une heure : ${euros(cout)}…`, action: () => { setSaisie(String(cout / 100)); setFenetreCout(true); } }];
  const filtres: OptionRapport[] = [{ cle: "toutes", libelle: "Toutes les vues", coche: !vue, href: lien(null) }, ...VUES.map((x) => ({ cle: x.cle, libelle: x.libelle, coche: vue === x.cle, href: lien(x.cle) }))];

  return (
    <Rapport titre="Pilotage du cabinet" actions={actions} filtres={filtres} filtreLibelle={vue ? VUES.find((x) => x.cle === vue)?.libelle : undefined} periodes={false} granularites={false} avis={!permis && pret ? <AvisRapport>Le pilotage du cabinet se lit par un avocat, Tamila installé.</AvisRapport> : lu === null ? <AvisRapport teinte="rouge" role="alert">La base n&apos;a pas répondu.</AvisRapport> : null}>
      {!permis ? null : lu === undefined ? (
        <AvisRapport role="status">Lecture du cabinet…</AvisRapport>
      ) : lu === null ? null : (
        <>
          <SectionRapport titre="Vue d'ensemble" meta="calculé dans votre navigateur, sur les dossiers que vous voyez">
            <CarteRapport titre="Marge" info="Facturé et à facturer HT, moins le temps passé au coût de revient d'une heure" chiffre={euros(margeTotale)} legende={negatives ? `${pluriel(negatives, "dossier")} à perte` : "aucun dossier à perte"} etat={negatives ? "orange" : "vert"} />
            <CarteRapport titre="Charge" info="Temps saisi sur 30 jours, toutes personnes" chiffre={heures(minutes30)} legende={`sur 30 jours, ${pluriel(c.length, "personne")}`} etat="gris" />
            <CarteRapport titre="Séries" info="Même partie dans deux dossiers, ou même matière devant la même juridiction dans trois" chiffre={s.length} legende={s.length ? "à traiter ensemble" : "aucune série"} etat="gris" />
            <CarteRapport titre="Sans diligence" info="Aucun temps, acte, audience, avis ni pièce depuis 30 jours" chiffre={sd.length} legende="dossiers vivants à 30 jours" etat={sd.length ? "orange" : "vert"} />
            <CarteRapport titre="Pièces attendues" info="Convention sans exemplaire, accusé RPVA, pièce d'identité, expertise, pièces demandées" chiffre={pa.length} legende="à obtenir" etat={pa.length ? "orange" : "vert"} />
          </SectionRapport>

          {montre("marge") ? (
            <SectionRapport titre="Marge par dossier" meta={`coût de revient ${euros(cout)} / h`}>
              <CarteRapport titre="Dossiers" chiffre={m.length} legende="avec du temps ou des honoraires" etat="gris" taille="pleine">
                {m.length ? (
                  <TableauRapport libelle="Marge par dossier" colonnes={[{ libelle: "Dossier" }, { libelle: "Temps passé", num: true }, { libelle: "Facturé et à facturer HT", num: true }, { libelle: "Coût du temps", num: true }, { libelle: "Marge", num: true }, { libelle: "Taux réalisé", num: true }]}>
                    {m.map((x) => (
                      <tr key={x.dossier.id}>
                        <td>{ref(x.dossier, x.clair, "honoraires")}</td>
                        <td className="rap-num">{heures(x.minutes)}</td>
                        <td className="rap-num">{euros(x.factureHt + x.aFacturerHt)}</td>
                        <td className="rap-num">{euros(x.coutCents)}</td>
                        <td className="rap-num">
                          <span className="rap-pastille" data-teinte={x.margeCents < 0 ? "orange" : "vert"}>
                            {euros(x.margeCents)}
                          </span>
                        </td>
                        <td className="rap-num">{x.tauxRealiseCents ? `${euros(x.tauxRealiseCents)} / h` : "—"}</td>
                      </tr>
                    ))}
                  </TableauRapport>
                ) : null}
              </CarteRapport>
            </SectionRapport>
          ) : null}

          {montre("charge") ? (
            <SectionRapport titre="Charge par personne" meta="30 jours">
              <CarteRapport titre="Personnes" chiffre={c.length} etat="gris" taille="pleine">
                <TableauRapport libelle="Charge par personne" colonnes={[{ libelle: "Personne" }, { libelle: "Temps saisi (30 jours)", num: true }, { libelle: "Dossiers dont responsable", num: true }, { libelle: "Délais à 30 jours", num: true }, { libelle: "Audiences à 30 jours", num: true }]}>
                  {c.map((x) => (
                    <tr key={x.personne.user_id}>
                      <td>{x.personne.nom}</td>
                      <td className="rap-num">{heures(x.minutes30)}</td>
                      <td className="rap-num">{x.dossiers}</td>
                      <td className="rap-num">{x.delais30}</td>
                      <td className="rap-num">{x.audiences30}</td>
                    </tr>
                  ))}
                </TableauRapport>
              </CarteRapport>
            </SectionRapport>
          ) : null}

          {montre("series") ? (
            <SectionRapport titre="Dossiers en série">
              <CarteRapport titre="Séries" chiffre={s.length} legende={s.length ? undefined : "pas deux dossiers contre la même partie, ni trois dans la même matière devant la même juridiction"} etat="gris" taille="pleine">
                {s.length ? (
                  <TableauRapport libelle="Dossiers en série" colonnes={[{ libelle: "Série" }, { libelle: "Nature" }, { libelle: "Dossiers" }]}>
                    {s.map((x) => (
                      <tr key={x.cle}>
                        <td>{x.nature === "partie" ? x.libelle : `${libelleMatiere(x.dossiers[0].dossier.matiere ?? "")} · ${x.libelle}`}</td>
                        <td>{x.nature === "partie" ? "Même partie" : "Même matière, même juridiction"}</td>
                        <td>
                          {x.dossiers.map((d, i) => (
                            <span key={d.dossier.id}>
                              {i ? ", " : ""}
                              {ref(d.dossier, d.clair)}
                            </span>
                          ))}
                        </td>
                      </tr>
                    ))}
                  </TableauRapport>
                ) : null}
              </CarteRapport>
            </SectionRapport>
          ) : null}

          {montre("diligence") ? (
            <SectionRapport titre="Sans diligence">
              <CarteRapport titre="Dossiers" chiffre={sd.length} legende={sd.length ? "sans mouvement depuis 30 jours" : "chaque dossier vivant a bougé dans les 30 derniers jours"} etat={sd.length ? "orange" : "vert"} taille="pleine">
                {sd.length ? (
                  <TableauRapport libelle="Dossiers sans diligence" colonnes={[{ libelle: "Dossier" }, { libelle: "Dernier mouvement" }, { libelle: "Jours", num: true }]}>
                    {sd.map((x) => (
                      <tr key={x.dossier.id}>
                        <td>{ref(x.dossier, x.clair)}</td>
                        <td>{dateCourte(x.derniere)} (temps, acte, audience, avis ou pièce)</td>
                        <td className="rap-num">
                          <span className="rap-pastille" data-teinte={x.jours >= 90 ? "orange" : undefined}>
                            {x.jours}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </TableauRapport>
                ) : null}
              </CarteRapport>
            </SectionRapport>
          ) : null}

          {montre("pieces") ? (
            <SectionRapport titre="Pièces attendues">
              <CarteRapport titre="À obtenir" chiffre={pa.length} legende={pa.length ? undefined : "aucune pièce attendue"} etat={pa.length ? "orange" : "vert"} taille="pleine">
                {pa.length ? (
                  <TableauRapport libelle="Pièces attendues" colonnes={[{ libelle: "Dossier" }, { libelle: "Ce qui manque" }]}>
                    {pa.map((x, i) => (
                      <tr key={`${x.dossier.id}-${i}`}>
                        <td>{ref(x.dossier, x.clair, "pieces")}</td>
                        <td>
                          <span className="rap-pastille" data-teinte={x.gravite === "rouge" ? "orange" : undefined}>
                            {x.quoi}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </TableauRapport>
                ) : null}
              </CarteRapport>
            </SectionRapport>
          ) : null}
        </>
      )}

      <Dialog open={fenetreCout} onOpenChange={(o) => !o && setFenetreCout(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone>
              <Gauge width={18} height={18} aria-hidden="true" />
            </DialogIcone>
            <DialogTitle>Coût de revient d&apos;une heure</DialogTitle>
            <DialogDescription>Il sert au calcul de la marge. Il reste dans ce navigateur, rien n&apos;est envoyé.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              <label className="rv-libelle">
                En euros, de 10 à 1 000
                <input className="rv-champ" inputMode="decimal" value={saisie} onChange={(e) => setSaisie(e.target.value)} onKeyDown={(e) => e.key === "Enter" && poserCout()} />
              </label>
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" onClick={poserCout}>
              Enregistrer dans ce navigateur
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Rapport>
  );
}
