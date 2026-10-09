"use client";

/* ══════════════════════════════════════════════════════════════════════
   L'outil d'audit (09/10/2026)

   Pendant le rendez-vous : on dépose l'export du prospect (CSV, tel que
   le sort son logiciel de facturation ou Excel), on vérifie les colonnes
   reconnues, et les chiffres sortent en direct — l'argent en retard par
   ancienneté, les devis sans réponse, les plus gros retards. Quatre
   questions complètent (demandes, administratif, clients dormants), puis
   le verdict : le produit à proposer, le plafond défendable pour
   l'installation, ou « n'installez rien ».

   Le fichier est lu DANS LE NAVIGATEUR et n'est envoyé nulle part. Seul
   le résumé (montants, verdict) s'enregistre dans le suivi des prospects
   quand Teo le demande.
   ══════════════════════════════════════════════════════════════════════ */

import Choix from "./Choix";
import { useMemo, useState } from "react";
import { FileUp, Printer, Save } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import "@/components/espace2/habillage.css";

type Table = { tete: string[]; lignes: string[][] };
type Role = "montant" | "echeance" | "emission" | "statut" | "paiement" | "type" | "client";
const ROLES: { cle: Role; libelle: string; re: RegExp }[] = [
  { cle: "client", libelle: "Client", re: /client|tiers|raison|nom|soci/i },
  { cle: "montant", libelle: "Montant (TTC de préférence)", re: /ttc|montant|total|reste|solde|amount/i },
  { cle: "emission", libelle: "Date d'émission", re: /date.*(fact|emis|émis|crea|créa)|^date$|date pi/i },
  { cle: "echeance", libelle: "Date d'échéance", re: /éch|ech[eé]ance|due|limite/i },
  { cle: "paiement", libelle: "Date de paiement", re: /pai|r[eè]gl|encaiss/i },
  { cle: "statut", libelle: "Statut", re: /statut|état|etat|status/i },
  { cle: "type", libelle: "Type (devis / facture)", re: /type|nature|pi[eè]ce|doc/i },
];

/* ——— lecture du CSV : séparateur deviné, guillemets respectés ——— */
function lireCsv(texte: string): Table {
  const t = texte.replace(/^﻿/, "").replace(/\r\n?/g, "\n");
  const premiere = t.split("\n")[0] ?? "";
  const sep = [";", "\t", ","].sort((a, b) => premiere.split(b).length - premiere.split(a).length)[0];
  const lignes: string[][] = [];
  let champ = "",
    ligne: string[] = [],
    guillemets = false;
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (guillemets) {
      if (ch === '"' && t[i + 1] === '"') {
        champ += '"';
        i++;
      } else if (ch === '"') guillemets = false;
      else champ += ch;
    } else if (ch === '"') guillemets = true;
    else if (ch === sep) {
      ligne.push(champ.trim());
      champ = "";
    } else if (ch === "\n") {
      ligne.push(champ.trim());
      if (ligne.some((c) => c)) lignes.push(ligne);
      ligne = [];
      champ = "";
    } else champ += ch;
  }
  ligne.push(champ.trim());
  if (ligne.some((c) => c)) lignes.push(ligne);
  return { tete: lignes[0] ?? [], lignes: lignes.slice(1) };
}

const nombre = (v: string | undefined) => {
  if (!v) return NaN;
  const net = v.replace(/[€\s ]/g, "").replace(/[A-Za-z]/g, "");
  const normal = /,\d{1,2}$/.test(net) ? net.replace(/\./g, "").replace(",", ".") : net.replace(/,/g, "");
  return Number(normal);
};
function date(v: string | undefined): number | null {
  if (!v) return null;
  let m = v.match(/(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/);
  if (m) return new Date(Number(m[3].length === 2 ? `20${m[3]}` : m[3]), Number(m[2]) - 1, Number(m[1])).getTime();
  m = v.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getTime();
  return null;
}
const euros = (v: number) => `${Math.round(v).toLocaleString("fr-FR")} €`;
const JOUR = 86_400_000;

export default function AuditOmega() {
  const [prospect, setProspect] = useState("");
  const [metier, setMetier] = useState("BTP");
  const [table, setTable] = useState<Table | null>(null);
  const [nomFichier, setNomFichier] = useState("");
  const [roles, setRoles] = useState<Partial<Record<Role, number>>>({});
  const [q, setQ] = useState({ demandes: "", perdues: "", panier: "", signature: "30", heures: "", taux: "45", dormants: "", caClient: "", retour: "20", seuil: "5000" });
  const [maintenant] = useState(() => Date.now());
  const [etat, setEtat] = useState("");

  async function charger(f: File | undefined) {
    if (!f) return;
    const texte = await f.text();
    const t = lireCsv(texte);
    setTable(t);
    setNomFichier(f.name);
    const devines: Partial<Record<Role, number>> = {};
    for (const r of ROLES) {
      const i = t.tete.findIndex((h, j) => r.re.test(h) && !Object.values(devines).includes(j));
      if (i >= 0) devines[r.cle] = i;
    }
    setRoles(devines);
  }

  const res = useMemo(() => {
    if (!table) return null;
    const col = (l: string[], r: Role) => (roles[r] === undefined ? undefined : l[roles[r]!]);
    const pieces = table.lignes.map((l) => {
      const type = (col(l, "type") ?? "").toLowerCase();
      const statut = (col(l, "statut") ?? "").toLowerCase();
      return {
        client: col(l, "client") || "Sans nom",
        montant: nombre(col(l, "montant")),
        devis: /devis|proposition|estimat/.test(type) || /devis/.test(statut),
        paye: /pay|r[eé]gl|sold|encaiss/.test(statut) || !!date(col(l, "paiement")),
        clos: /accept|sign|refus|perdu|annul|transform|factur/.test(statut),
        echeance: date(col(l, "echeance")),
        emission: date(col(l, "emission")),
      };
    }).filter((p) => Number.isFinite(p.montant) && p.montant > 0);
    const factures = pieces.filter((p) => !p.devis && !p.paye);
    const echues = factures.filter((p) => (p.echeance ?? p.emission ?? Infinity) < maintenant).map((p) => ({ ...p, retard: Math.floor((maintenant - (p.echeance ?? p.emission!)) / JOUR) }));
    const tranches = [
      { libelle: "1 à 30 jours", min: 0, max: 30 },
      { libelle: "31 à 60 jours", min: 31, max: 60 },
      { libelle: "61 à 90 jours", min: 61, max: 90 },
      { libelle: "Plus de 90 jours", min: 91, max: Infinity },
    ].map((t) => {
      const ps = echues.filter((p) => p.retard >= t.min && p.retard <= t.max);
      return { ...t, nombre: ps.length, total: ps.reduce((s, p) => s + p.montant, 0) };
    });
    const encours = echues.reduce((s, p) => s + p.montant, 0);
    const retardMoyen = encours ? echues.reduce((s, p) => s + p.montant * p.retard, 0) / encours : 0;
    const parClient = new Map<string, number>();
    for (const p of echues) parClient.set(p.client, (parClient.get(p.client) ?? 0) + p.montant);
    const top = [...parClient.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
    const devisDormants = pieces.filter((p) => p.devis && !p.clos && (p.emission ?? Infinity) < maintenant - 15 * JOUR);
    return { lues: table.lignes.length, retenues: pieces.length, encours, retardMoyen, tranches, top, nbEchues: echues.length, devisDormants: devisDormants.length, totalDevis: devisDormants.reduce((s, p) => s + p.montant, 0) };
  }, [table, roles, maintenant]);

  const n = (k: keyof typeof q) => Number(q[k].replace(",", ".")) || 0;
  const valeurs = [
    { produit: "CASHD", libelle: "Factures en retard à faire rentrer", valeur: res?.encours ?? 0 },
    { produit: "CASHD", libelle: "Devis sans réponse depuis plus de 15 jours (à 30 % de signature)", valeur: (res?.totalDevis ?? 0) * 0.3 },
    { produit: "REPUT", libelle: "Demandes perdues sur un an", valeur: n("demandes") * 52 * (n("perdues") / 100) * (n("signature") / 100) * n("panier") },
    { produit: "FILED", libelle: "Temps d'administratif sur un an", valeur: n("heures") * 52 * n("taux") },
    { produit: "OFFLOAD", libelle: "Clients dormants qui reviendraient", valeur: n("dormants") * (n("retour") / 100) * n("caClient") },
  ];
  const total = valeurs.reduce((s, v) => s + v.valeur, 0);
  const meilleur = [...valeurs].sort((a, b) => b.valeur - a.valeur)[0];
  const rien = total < n("seuil");
  const plafond = total / 5;

  async function enregistrer() {
    const donnees = {
      Client: prospect || "Prospect sans nom",
      Métier: metier,
      "Offre visée": rien ? "Rien à installer" : meilleur.produit,
      Étape: "Audit tenu",
      "Prochaine action": rien ? "Demander une recommandation" : `Envoyer le récapitulatif (${euros(total)} en jeu)`,
      Date: new Date(maintenant).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }),
      "Encours relevé (€)": String(Math.round(res?.encours ?? 0)),
      "Étude de cas": "",
    };
    const { error } = await createClient().from("omega_lignes").insert({ tableau: "clients", ordre: 1000, donnees });
    setEtat(error ? "Échec de l'enregistrement." : "Audit enregistré dans « Demandes reçues ».");
  }

  return (
    <div className="v2-page v2-va om-audit">
      <div className="v2-tete om-sans-impression">
        <h1>Audit</h1>
      </div>

      <section className="v2-carte v2-carte-corps om-audit-entete">
        <div className="om-audit-champs">
          <label className="om-label">
            Prospect
            <span className="v2-champ">
              <input value={prospect} onChange={(e) => setProspect(e.target.value)} placeholder="Nom de l'entreprise" />
            </span>
          </label>
          <label className="om-label">
            Métier
            <Choix etiquette="Métier" valeur={metier} onChange={setMetier} options={["BTP", "Location automobile", "Architecte", "Avocat", "Cabinet dentaire", "Groupe", "Autre"]} />
          </label>
        </div>
        <label className="om-depot om-sans-impression">
          <FileUp width={18} height={18} aria-hidden="true" />
          <span>{nomFichier ? `${nomFichier} · ${res?.lues ?? 0} lignes lues` : "Déposer l'export des factures et devis (CSV)"}</span>
          <input type="file" accept=".csv,.txt,text/csv" onChange={(e) => charger(e.target.files?.[0])} />
        </label>
        <p className="v2-gris om-note">Le fichier est lu dans ce navigateur et n&apos;est envoyé nulle part. Depuis Excel : Fichier → Enregistrer sous → CSV.</p>
      </section>

      {table ? (
        <section className="v2-carte v2-carte-corps om-sans-impression">
          <div className="v2-va-titre">
            <h2 className="v2-h2">Colonnes reconnues</h2>
            <span className="v2-gris">vérifie et corrige si besoin</span>
          </div>
          <div className="om-audit-roles">
            {ROLES.map((r) => (
              <label key={r.cle} className="om-label">
                {r.libelle}
                <Choix etiquette={r.libelle} valeur={roles[r.cle] === undefined ? "" : String(roles[r.cle])} onChange={(v) => setRoles((x) => ({ ...x, [r.cle]: v === "" ? undefined : Number(v) }))} vide="— aucune —" options={table.tete.map((h, i) => ({ cle: String(i), libelle: h || `Colonne ${i + 1}` }))} />
              </label>
            ))}
          </div>
        </section>
      ) : null}

      {res ? (
        <>
          <section className="v2-va-kpis" aria-label="Chiffres de l'export">
            <div className="v2-va-kpi" data-alerte={res.encours > 0 ? "" : undefined}>
              <span className="v2-va-kpi-libelle">Argent en retard</span>
              <strong>{euros(res.encours)}</strong>
              <small className="v2-gris v2-va-kpi-sous">{res.nbEchues} factures échues</small>
            </div>
            <div className="v2-va-kpi">
              <span className="v2-va-kpi-libelle">Retard moyen</span>
              <strong>{Math.round(res.retardMoyen)} j</strong>
              <small className="v2-gris v2-va-kpi-sous">pondéré par les montants</small>
            </div>
            <div className="v2-va-kpi">
              <span className="v2-va-kpi-libelle">Devis sans réponse</span>
              <strong>{res.devisDormants}</strong>
              <small className="v2-gris v2-va-kpi-sous">{euros(res.totalDevis)} depuis plus de 15 jours</small>
            </div>
            <div className="v2-va-kpi">
              <span className="v2-va-kpi-libelle">Pièces lues</span>
              <strong>{res.retenues}</strong>
              <small className="v2-gris v2-va-kpi-sous">sur {res.lues} lignes du fichier</small>
            </div>
          </section>
          <div className="v2-va-grille">
            <div className="v2-va-col">
              <section className="v2-carte v2-carte-corps">
                <div className="v2-va-titre">
                  <h2 className="v2-h2">Ancienneté des retards</h2>
                </div>
                <div className="v2-tableau-cadre">
                  <table className="v2-va-table">
                    <thead>
                      <tr>
                        <th>Retard</th>
                        <th>Factures</th>
                        <th style={{ textAlign: "right" }}>Montant</th>
                      </tr>
                    </thead>
                    <tbody>
                      {res.tranches.map((t) => (
                        <tr key={t.libelle}>
                          <td>{t.libelle}</td>
                          <td className="v2-gris">{t.nombre}</td>
                          <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{euros(t.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
            <div className="v2-va-col">
              <section className="v2-carte v2-carte-corps">
                <div className="v2-va-titre">
                  <h2 className="v2-h2">Les plus gros retards</h2>
                </div>
                <ul className="v2-va-liste">
                  {res.top.map(([client, total]) => (
                    <li key={client}>
                      <span className="v2-va-texte">
                        <span>{client}</span>
                      </span>
                      <span style={{ fontVariantNumeric: "tabular-nums" }}>{euros(total)}</span>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          </div>
        </>
      ) : null}

      <section className="v2-carte v2-carte-corps">
        <div className="v2-va-titre">
          <h2 className="v2-h2">Les questions de l&apos;audit</h2>
          <span className="v2-gris">ce que l&apos;export ne dit pas</span>
        </div>
        <div className="om-audit-roles">
          {(
            [
              ["demandes", "Demandes reçues par semaine"],
              ["perdues", "Part sans réponse sous 24 h (%)"],
              ["panier", "Panier moyen d'une affaire (€)"],
              ["signature", "Taux de signature d'une demande (%)"],
              ["heures", "Heures d'administratif par semaine"],
              ["taux", "Coût d'une heure (€)"],
              ["dormants", "Clients sans achat depuis plus de 90 jours"],
              ["caClient", "Chiffre annuel moyen d'un client (€)"],
              ["retour", "Part qui reviendrait si relancée (%)"],
              ["seuil", "Seuil « rien à installer » (€ par an)"],
            ] as [keyof typeof q, string][]
          ).map(([k, l]) => (
            <label key={k} className="om-label">
              {l}
              <span className="v2-champ">
                <input inputMode="decimal" value={q[k]} onChange={(e) => setQ((x) => ({ ...x, [k]: e.target.value }))} />
              </span>
            </label>
          ))}
        </div>
      </section>

      <section className="v2-carte v2-carte-corps om-verdict" data-rien={rien ? "" : undefined}>
        <div className="v2-va-titre">
          <h2 className="v2-h2">{prospect ? `Le verdict pour ${prospect}` : "Le verdict"}</h2>
          <strong className="om-verdict-total">{euros(total)} par an en jeu</strong>
        </div>
        <div className="v2-tableau-cadre">
          <table className="v2-va-table">
            <tbody>
              {valeurs.map((v) => (
                <tr key={v.libelle}>
                  <td>
                    <span className="v2-etat">{v.produit}</span>
                  </td>
                  <td>{v.libelle}</td>
                  <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{euros(v.valeur)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rien ? (
          <p className="om-verdict-texte">
            <strong>N&apos;installez rien.</strong> Ce qui est en jeu reste sous le seuil : le dire franchement, puis demander une recommandation.
          </p>
        ) : (
          <p className="om-verdict-texte">
            <strong>Produit à proposer en premier : {meilleur.produit}</strong> ({meilleur.libelle.toLowerCase()}). Installation défendable jusqu&apos;à <strong>{euros(plafond)}</strong> (un cinquième de la valeur en jeu), garantie conditionnelle à 60 jours (90 pour le BTP).
          </p>
        )}
        <div className="om-actions om-sans-impression">
          <span className="om-etat" role="status">
            {etat}
          </span>
          <button type="button" className="v2-btn v2-btn--petit" onClick={() => window.print()}>
            <Printer width={14} height={14} aria-hidden="true" /> Imprimer le rapport
          </button>
          <button type="button" className="v2-btn v2-btn--petit v2-btn--primaire" onClick={enregistrer}>
            <Save width={14} height={14} aria-hidden="true" /> Enregistrer dans le suivi
          </button>
        </div>
      </section>
    </div>
  );
}
