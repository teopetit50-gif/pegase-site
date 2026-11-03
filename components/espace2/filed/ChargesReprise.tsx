"use client";

/* FILED, Comptabilité — deux promesses sans page (03/11/2026) :
   · « Les charges récurrentes produisent leurs écritures d'abonnement sans ressaisie » : la table
     public.filed_charges_recurrentes (a4_01, a4_03), lecture ouverte aux comptes du client ;
   · « Un historique de plusieurs exercices se reprend en une fois à l'installation » : public.filed_reprises
     (a4_24), un fichier d'écritures par exercice repris, avec ses totaux.
   Lecture seule ; mêmes briques que les autres sections de la page (SectionRapport, CarteRapport, TableauRapport). */

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { dateCourte, montant, nombreFr } from "@/components/espace/format";
import { CarteRapport, SectionRapport, TableauRapport, pluriel } from "../lin/Rapports";

type Charge = { id: string; libelle: string; periodicite: string; jour_attendu: number; montant_ht: number; debut: string; fin: string | null; actif: boolean; fournisseur: string | null };
type Reprise = { id: string; nom_fichier: string; debut: string; fin: string; ecritures: number; lignes: number; total_debit: number; tiers: number; cree_le: string };

const PERIODES: Record<string, string> = { mensuelle: "chaque mois", bimestrielle: "tous les deux mois", trimestrielle: "chaque trimestre", semestrielle: "chaque semestre", annuelle: "chaque année" };

const CHARGES_EXEMPLE: Charge[] = [
  { id: "c1", libelle: "Loyer de l'atelier — 18 rue des Charpentiers", periodicite: "mensuelle", jour_attendu: 1, montant_ht: 2350, debut: "2025-01-01", fin: null, actif: true, fournisseur: "SCI des Charpentiers" },
  { id: "c2", libelle: "Électricité — mensualité", periodicite: "mensuelle", jour_attendu: 5, montant_ht: 1915.33, debut: "2026-01-01", fin: null, actif: true, fournisseur: "Électricité de Lyon" },
  { id: "c3", libelle: "Licence du logiciel de dessin, 4 postes", periodicite: "annuelle", jour_attendu: 15, montant_ht: 1680, debut: "2024-03-15", fin: null, actif: true, fournisseur: "TechPro Informatique" },
  { id: "c4", libelle: "Location de la nacelle", periodicite: "trimestrielle", jour_attendu: 10, montant_ht: 870, debut: "2025-04-10", fin: "2026-09-30", actif: false, fournisseur: "Loxam Rhône" },
];
const REPRISES_EXEMPLE: Reprise[] = [
  { id: "r1", nom_fichier: "842015337FEC20241231.txt", debut: "2024-01-01", fin: "2024-12-31", ecritures: 3184, lignes: 9906, total_debit: 1842310.55, tiers: 64, cree_le: "2026-01-12T10:04:00Z" },
  { id: "r2", nom_fichier: "842015337FEC20251231.txt", debut: "2025-01-01", fin: "2025-12-31", ecritures: 3402, lignes: 10571, total_debit: 1977480.2, tiers: 71, cree_le: "2026-01-12T10:05:00Z" },
];

export default function ChargesReprise({ source }: { source: "exemple" | "reelle" }) {
  const [reel, setReel] = useState<{ charges: Charge[]; reprises: Reprise[] } | null>(null);
  useEffect(() => {
    if (source !== "reelle") return;
    let actif = true;
    const s = createClient();
    Promise.all([
      s.from("filed_charges_recurrentes").select("id, libelle, periodicite, jour_attendu, montant_ht, debut, fin, actif, filed_fournisseurs(nom)").order("libelle"),
      s.from("filed_reprises").select("id, nom_fichier, debut, fin, ecritures, lignes, total_debit, tiers, cree_le").order("debut"),
    ]).then(([c, r]) => {
      if (!actif) return;
      const charges = ((c.data ?? []) as unknown as (Omit<Charge, "fournisseur"> & { filed_fournisseurs: { nom: string } | { nom: string }[] | null })[]).map(({ filed_fournisseurs: f, ...x }) => ({ ...x, fournisseur: (Array.isArray(f) ? f[0]?.nom : f?.nom) ?? null }));
      setReel({ charges, reprises: (r.data ?? []) as Reprise[] });
    });
    return () => {
      actif = false;
    };
  }, [source]);
  const charges = source === "exemple" ? CHARGES_EXEMPLE : (reel?.charges ?? []);
  const reprises = source === "exemple" ? REPRISES_EXEMPLE : (reel?.reprises ?? []);
  const actives = charges.filter((x) => x.actif);
  const lecture = source === "reelle" && !reel;

  return (
    <>
      <SectionRapport titre="Charges récurrentes" meta="Chaque échéance produit son écriture d'abonnement, sans ressaisie ; la facture reçue y est rapprochée">
        <CarteRapport
          taille="pleine"
          titre="Abonnements et charges attendus"
          info="Fournisseur, rythme, jour attendu et montant hors taxes : la facture manquante au-delà de la tolérance remonte au point du matin."
          chiffre={nombreFr(actives.length)}
          legende={actives.length ? `en cours, ${montant(actives.reduce((t, x) => t + Number(x.montant_ht), 0))} HT par échéance au total` : "aucune charge déclarée"}
          etat={actives.length ? "vert" : "gris"}
        >
          {charges.length ? (
            <TableauRapport libelle="Charges récurrentes" colonnes={[{ libelle: "Charge" }, { libelle: "Fournisseur" }, { libelle: "Rythme" }, { libelle: "Montant HT", num: true }]}>
              {charges.map((x) => (
                <tr key={x.id}>
                  <td style={{ fontWeight: 500 }}>
                    {x.libelle}
                    {!x.actif || x.fin ? <span className="rap-pastille">{x.fin ? `arrêtée au ${dateCourte(x.fin)}` : "arrêtée"}</span> : null}
                  </td>
                  <td>{x.fournisseur ?? "—"}</td>
                  <td>
                    {PERIODES[x.periodicite] ?? x.periodicite}, le {x.jour_attendu}
                  </td>
                  <td className="rap-num">{montant(Number(x.montant_ht))}</td>
                </tr>
              ))}
            </TableauRapport>
          ) : (
            <p className="rap-sous">{lecture ? "Lecture…" : "Aucune charge récurrente déclarée."}</p>
          )}
        </CarteRapport>
      </SectionRapport>

      <SectionRapport titre="Reprise des exercices passés" meta="Les écritures des exercices antérieurs, reprises en une fois à l'installation">
        <CarteRapport
          taille="pleine"
          titre="Fichiers repris"
          info="Un fichier des écritures comptables par exercice, gardé avec son empreinte : les fournisseurs et leurs comptes en sont tirés."
          chiffre={nombreFr(reprises.length)}
          legende={reprises.length ? `${pluriel(reprises.length, "exercice repris", "exercices repris")}, ${nombreFr(reprises.reduce((t, x) => t + x.ecritures, 0))} écritures` : "aucun exercice repris"}
          etat={reprises.length ? "vert" : "gris"}
        >
          {reprises.length ? (
            <TableauRapport libelle="Exercices repris" colonnes={[{ libelle: "Exercice" }, { libelle: "Fichier" }, { libelle: "Écritures", num: true }, { libelle: "Tiers", num: true }, { libelle: "Total débit", num: true }]}>
              {reprises.map((x) => (
                <tr key={x.id}>
                  <td style={{ fontWeight: 500 }}>
                    {dateCourte(x.debut)} → {dateCourte(x.fin)}
                  </td>
                  <td>{x.nom_fichier}</td>
                  <td className="rap-num">{nombreFr(x.ecritures)}</td>
                  <td className="rap-num">{nombreFr(x.tiers)}</td>
                  <td className="rap-num">{montant(Number(x.total_debit))}</td>
                </tr>
              ))}
            </TableauRapport>
          ) : (
            <p className="rap-sous">{lecture ? "Lecture…" : "Aucun exercice passé repris."}</p>
          )}
        </CarteRapport>
      </SectionRapport>
    </>
  );
}
