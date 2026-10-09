"use client";

/* ══════════════════════════════════════════════════════════════════════
   Les chiffres de la semaine (09/10/2026). Rien à saisir ici : tout se
   compte dans ce que les autres écrans enregistrent déjà —
     · le mode appels (tableau « appels ») : appels, décrochés, RDV pris ;
     · les rendez-vous (« rdv ») : audits tenus ;
     · le journal des contacts (omega_echanges) : échanges notés ;
     · la production vidéo (« videos ») : vidéos publiées ;
     · les clients installés (« installes ») ;
     · les finances réelles (« finances ») : encaissé, dépensé.
   La semaine se choisit avec ⌃⌄ ; le tableau montre les six dernières
   semaines côte à côte, sur un seul écran.
   ══════════════════════════════════════════════════════════════════════ */

import { useState } from "react";
import { CalendarRange, ChevronsUpDown } from "lucide-react";
import { ItemMenu, MenuDeroulant } from "@/components/espace2/ui";
import type { Ligne } from "./Tableaux";

const JOUR = 86400000;

/* lundi 0 h de la semaine d'une date */
function lundi(d: Date) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}

/* les dates saisies à la main : « 14/10 », « 14/10/2026 », « 2026-10-14 » */
function lireDate(v: string | undefined, annee: number): Date | null {
  if (!v) return null;
  const iso = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return v.length > 10 ? new Date(v) : new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  const fr = v.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
  if (fr) return new Date(fr[3] ? Number(fr[3].length === 2 ? `20${fr[3]}` : fr[3]) : annee, Number(fr[2]) - 1, Number(fr[1]));
  return null;
}

const montant = (v: string | undefined) => Number((v ?? "").replace(/\s/g, "").replace(",", ".").replace(/[^\d.-]/g, "")) || 0;
const euros = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} €`;

type Mesure = { cle: string; libelle: string; valeur: (debut: Date) => number; argent?: boolean };

export default function Semaine({ lignes, echanges, prospects, selecteur }: { lignes: Ligne[]; echanges: string[]; prospects: string[]; selecteur: React.ReactNode }) {
  const [cette] = useState(() => lundi(new Date()));
  const [choisie, setChoisie] = useState(0);
  const annee = cette.getFullYear();
  const debutDe = (n: number) => new Date(cette.getTime() - n * 7 * JOUR);
  const dans = (d: Date | null, debut: Date) => !!d && d >= debut && d.getTime() < debut.getTime() + 7 * JOUR;
  const de = (t: string) => lignes.filter((l) => l.tableau === t);
  const compte = (t: string, champ: string, filtre: (l: Ligne) => boolean = () => true) => (debut: Date) => de(t).filter((l) => filtre(l) && dans(lireDate(l.donnees[champ], annee), debut)).length;
  const somme = (sens: string) => (debut: Date) => de("finances").filter((l) => l.donnees["Sens"] === sens && l.donnees["Statut"] === "Payé" && dans(lireDate(l.donnees["Date"], annee), debut)).reduce((s, l) => s + montant(l.donnees["Montant (€)"]), 0);

  const MESURES: Mesure[] = [
    { cle: "appels", libelle: "Appels passés", valeur: compte("appels", "Date") },
    { cle: "decroches", libelle: "Décrochés", valeur: compte("appels", "Date", (l) => l.donnees["Issue"] !== "Pas de réponse") },
    { cle: "rdv", libelle: "RDV pris", valeur: compte("appels", "Date", (l) => l.donnees["Issue"] === "RDV pris") },
    { cle: "audits", libelle: "Audits tenus", valeur: compte("rdv", "Date", (l) => l.donnees["Type"] === "Audit" && l.donnees["Statut"] === "Tenu") },
    { cle: "fiches", libelle: "Établissements traités", valeur: (debut) => prospects.filter((q) => dans(new Date(q), debut)).length },
    { cle: "echanges", libelle: "Échanges notés", valeur: (debut) => echanges.filter((q) => dans(new Date(q), debut)).length },
    { cle: "videos", libelle: "Vidéos publiées", valeur: compte("videos", "Sortie", (l) => l.donnees["Statut"] === "Publiée") },
    { cle: "clients", libelle: "Clients installés", valeur: compte("installes", "Installé le") },
    { cle: "encaisse", libelle: "Encaissé", valeur: somme("Recette"), argent: true },
    { cle: "depense", libelle: "Dépensé", valeur: somme("Dépense"), argent: true },
  ];
  const UNE = ["appels", "rdv", "videos", "encaisse"];

  const libelleSemaine = (n: number) => {
    const d = debutDe(n);
    const f = new Date(d.getTime() + 6 * JOUR);
    const court = (x: Date) => x.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
    return n === 0 ? "Cette semaine" : n === 1 ? "La semaine dernière" : `Du ${court(d)} au ${court(f)}`;
  };
  const colonnes = Array.from({ length: 6 }, (_, i) => choisie + 5 - i);
  const debut = debutDe(choisie);
  const avant = debutDe(choisie + 1);
  const fmt = (m: Mesure, v: number) => (m.argent ? euros(v) : v.toLocaleString("fr-FR"));
  const conversion = (() => {
    const a = MESURES[0].valeur(debut);
    const r = MESURES[2].valeur(debut);
    return a ? `${Math.round((r / a) * 100)} % des appels finissent en RDV` : "aucun appel encore cette semaine";
  })();

  return (
    <div className="v2-page v2-arrivee v2-val om-semaine">
      <h1 className="v2-sr">Chiffres de la semaine</h1>

      <div className="v2-val-filtres">
        {selecteur}
        <MenuDeroulant
          etiquette={`Semaine : ${libelleSemaine(choisie)}. Changer de semaine`}
          classe="v2-portee om-portee-secteur"
          placement="bottom start"
          largeur={260}
          declencheur={
            <>
              <CalendarRange width={16} height={16} strokeWidth={1.6} aria-hidden="true" />
              <span className="v2-portee-nom">{libelleSemaine(choisie)}</span>
              <ChevronsUpDown width={14} height={14} aria-hidden="true" />
            </>
          }
        >
          {Array.from({ length: 12 }, (_, n) => (
            <ItemMenu key={n} id={`s${n}`} textValue={libelleSemaine(n)} onAction={() => setChoisie(n)} suffixe={n === choisie ? <span className="v2-gris">✓</span> : null}>
              {libelleSemaine(n)}
            </ItemMenu>
          ))}
        </MenuDeroulant>
        <span className="v2-gris om-formation-compte">{conversion}</span>
      </div>

      <div className="om-cartes om-cartes--quatre">
        {MESURES.filter((m) => UNE.includes(m.cle)).map((m) => {
          const v = m.valeur(debut);
          const p = m.valeur(avant);
          const ecart = v - p;
          return (
            <div key={m.cle} className="v2-carte om-carte">
              <span className="om-carte-titre">{m.libelle}</span>
              <span className="om-carte-valeur">
                <strong>{fmt(m, v)}</strong>
              </span>
              <span className="om-carte-pied" data-sens={ecart > 0 ? "haut" : ecart < 0 ? "bas" : undefined}>
                {ecart === 0 ? "comme la semaine d'avant" : `${ecart > 0 ? "+" : "−"}${fmt(m, Math.abs(ecart))} sur la semaine d'avant`}
              </span>
            </div>
          );
        })}
      </div>

      <section className="v2-carte om-section">
        <div className="v2-tableau-cadre om-tableau-cadre">
          <table className="v2-tableau om-grille om-semaine-grille">
            <thead>
              <tr>
                <th>Mesure</th>
                {colonnes.map((n) => (
                  <th key={n} data-choisie={n === choisie ? "" : undefined}>
                    {debutDe(n).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MESURES.map((m) => (
                <tr key={m.cle}>
                  <td>{m.libelle}</td>
                  {colonnes.map((n) => (
                    <td key={n} data-choisie={n === choisie ? "" : undefined}>
                      {fmt(m, m.valeur(debutDe(n)))}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
