"use client";

/* ══════════════════════════════════════════════════════════════════════
   OFFLOAD — le pilotage (c4_09, 06/10/2026, session C4)

   Quatre tableaux, chacun exportable vers un tableur à la demande :
   le chiffre remis en jeu vague par vague (une vague = le passage d'un
   jour), les taux de réponse comparés (par segment, niveau, canal,
   message), le tableau de suivi mois par mois (échéances honorées,
   commandes reprises, affaires retirées) et les résultats par entité,
   par site et en consolidé. À date fixe : les arrêtés mensuels posés la
   nuit, chacun téléchargeable en tableur.
   Lecture : public.offload_pilotage(), public.offload_arretes_liste()
   (gérant, admin, valideur). L'exemple vit ici.
   25/10 (c4_36) : la valeur en jeu par segment et la restitution en
   tableur, réservées au gérant et à l'administrateur (Segments.tsx).
   ══════════════════════════════════════════════════════════════════════ */

import { useEffect, useState } from "react";
import { dateCourte, montant, nombreFr } from "../format";
import type { Source } from "../source";
import { Chargement, Vide } from "../ui";
import { AUTO_GP, BRICO_MQ, ENTITES, IMPORT } from "../exemples/socle";
import { SbGraphique, SbPage, SbSection } from "@/components/espace3/sb/Sb";
import { chargerArretes, chargerPilotage, chargerSegments, chargerTableau } from "./portes";
import { RestitutionEnTableur, segmentsExemple, ValeurParSegment } from "./Segments";
import { exporterArrete, exporterTableau, type TableauPilotage } from "./tableur";
import type { Arrete, LigneTaux, Pilotage as Donnees, Segment } from "./types";

type Onglet = TableauPilotage | "arretes" | "segments" | "restitution";
const EXPORTABLES: Onglet[] = ["vagues", "taux", "suivi", "entites"];

const ONGLETS: { cle: Onglet; libelle: string }[] = [
  { cle: "vagues", libelle: "Vagues" },
  { cle: "taux", libelle: "Taux de réponse" },
  { cle: "suivi", libelle: "Suivi" },
  { cle: "entites", libelle: "Entités et sites" },
  { cle: "arretes", libelle: "Arrêtés" },
  { cle: "segments", libelle: "Par segment" },
  { cle: "restitution", libelle: "Restitution" },
];

const AXES: { cle: keyof Donnees["taux"]; libelle: string }[] = [
  { cle: "segment", libelle: "Par segment" },
  { cle: "canal", libelle: "Par canal" },
  { cle: "message", libelle: "Par message" },
  { cle: "niveau", libelle: "Par niveau du signal" },
];

const NIVEAUX: Record<string, string> = { eteint: "Éteint", decroche: "Décroche", saison: "Saison manquée", ralentit: "Ralentit", ok: "Régulier", sans_achat: "Sans achat", sous_seuil: "Sous le seuil", inconnu: "Inconnu" };

function jour(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function mois(n: number) {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + n);
  return d.toISOString().slice(0, 7);
}

export function pilotageExemple(): Donnees {
  const r = (comptes: number, en_jeu: number, reponses: number, commandes: number, chiffre_repris: number, echeances_honorees: number, affaires_retirees: number) =>
    ({ comptes, en_jeu, reponses, commandes, chiffre_repris, echeances_honorees, affaires_retirees });
  return {
    depuis: jour(-365),
    calcule_le: new Date().toISOString(),
    vagues: [
      { vague: jour(-1), comptes: 412, en_jeu: 286400, messages: 396, appels: 16, reponses: 61, commandes: 23, chiffre_repris: 48700, taux_reponse: 14.8 },
      { vague: jour(-8), comptes: 1284, en_jeu: 487900, messages: 1251, appels: 33, reponses: 142, commandes: 96, chiffre_repris: 36480, taux_reponse: 11.1 },
      { vague: jour(-15), comptes: 268, en_jeu: 412300, messages: 241, appels: 27, reponses: 49, commandes: 18, chiffre_repris: 71200, taux_reponse: 18.3 },
    ],
    taux: {
      segment: [
        { valeur: "Particuliers — atelier automobile", sollicites: 1284, reponses: 142, taux: 11.1 },
        { valeur: "Artisans et BTP", sollicites: 318, reponses: 58, taux: 18.2 },
        { valeur: "Hôtellerie et restauration", sollicites: 64, reponses: 19, taux: 29.7 },
        { valeur: "Flottes d'entreprise", sollicites: 41, reponses: 11, taux: 26.8 },
        { valeur: "Garages indépendants", sollicites: 12, reponses: 4, taux: 33.3 },
        { valeur: "Sans segment", sollicites: 245, reponses: 38, taux: 15.5 },
      ],
      canal: [
        { valeur: "Courriel", sollicites: 1096, reponses: 118, taux: 10.8 },
        { valeur: "SMS", sollicites: 792, reponses: 121, taux: 15.3 },
        { valeur: "Appel", sollicites: 76, reponses: 33, taux: 43.4 },
      ],
      message: [
        { valeur: "Premier message", sollicites: 1888, reponses: 196, taux: 10.4 },
        { valeur: "Relance", sollicites: 1102, reponses: 51, taux: 4.6 },
        { valeur: "Rappel de retrait", sollicites: 214, reponses: 25, taux: 11.7 },
      ],
      niveau: [
        { valeur: "decroche", sollicites: 486, reponses: 98, taux: 20.2 },
        { valeur: "eteint", sollicites: 1341, reponses: 141, taux: 10.5 },
        { valeur: "ralentit", sollicites: 137, reponses: 33, taux: 24.1 },
      ],
    },
    suivi: [
      { mois: mois(0), echeances_honorees: 86, echeances_apres_message: 61, commandes_reprises: 58, chiffre_repris: 74300, affaires_retirees: 29, valeur_liberee: 41200 },
      { mois: mois(-1), echeances_honorees: 74, echeances_apres_message: 52, commandes_reprises: 61, chiffre_repris: 66900, affaires_retirees: 34, valeur_liberee: 38600 },
      { mois: mois(-2), echeances_honorees: 54, echeances_apres_message: 33, commandes_reprises: 35, chiffre_repris: 37700, affaires_retirees: 24, valeur_liberee: 22900 },
    ],
    entites: {
      par_entite: [
        { societe_id: AUTO_GP, societe: "Soléa Auto Guadeloupe", ...r(1402, 571300, 158, 104, 52900, 214, 31) },
        { societe_id: IMPORT, societe: "Soléa Import", ...r(186, 402600, 41, 19, 63800, 0, 12) },
        { societe_id: BRICO_MQ, societe: "Brico Soléa Martinique", ...r(142, 318400, 27, 12, 21400, 0, 18) },
        { societe_id: ENTITES[12].id, societe: "Brico Soléa Guadeloupe", ...r(118, 247100, 22, 9, 16900, 0, 14) },
        { societe_id: ENTITES[11].id, societe: "Soléa Pièces", ...r(97, 196500, 19, 8, 14300, 0, 9) },
        { societe_id: ENTITES[10].id, societe: "Soléa Location", ...r(19, 88600, 5, 2, 9600, 0, 3) },
      ],
      par_site: [
        { societe_id: AUTO_GP, societe: "Soléa Auto Guadeloupe", site_id: "t1", site: "Atelier de Jarry", ...r(938, 371200, 104, 71, 35600, 141, 19) },
        { societe_id: AUTO_GP, societe: "Soléa Auto Guadeloupe", site_id: "t2", site: "Atelier des Abymes", ...r(464, 200100, 54, 33, 17300, 73, 12) },
        { societe_id: BRICO_MQ, societe: "Brico Soléa Martinique", site_id: "t3", site: "Magasin du Lamentin", ...r(97, 221800, 19, 9, 15700, 0, 13) },
        { societe_id: BRICO_MQ, societe: "Brico Soléa Martinique", site_id: "t4", site: "Magasin de Rivière-Salée", ...r(45, 96600, 8, 3, 5700, 0, 5) },
      ],
      consolide: r(1964, 1824500, 272, 154, 178900, 214, 87),
    },
  };
}

function Taux({ l }: { l: LigneTaux }) {
  const t = l.taux ?? 0;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, justifyContent: "flex-end", width: "100%" }}>
      <span aria-hidden="true" style={{ width: 64, height: 6, borderRadius: 3, background: "var(--r-filet)", overflow: "hidden", flex: "none" }}>
        <span style={{ display: "block", width: `${Math.min(100, t)}%`, height: "100%", background: "var(--r-texte)", opacity: 0.8 }} />
      </span>
      <span style={{ minWidth: 52, textAlign: "right" }}>{l.taux === null ? "—" : `${String(l.taux).replace(".", ",")} %`}</span>
    </span>
  );
}

function Exporter({ onClick, libelle = "Exporter vers un tableur" }: { onClick: () => void; libelle?: string }) {
  return <button type="button" className="esp-lien-bouton" onClick={onClick}>{libelle}</button>;
}

function Cadre({ etiquette, children }: { etiquette: string; children: React.ReactNode }) {
  return <div className="esp-tableau-cadre" tabIndex={0} role="region" aria-label={`${etiquette} (tableau qui défile)`}>{children}</div>;
}

export default function Pilotage({ source, gabarit }: { source: Source; gabarit?: "sb" }) {
  const [onglet, setOnglet] = useState<Onglet>("vagues");
  const [reel, setReel] = useState<Donnees | null>(null);
  const [arretes, setArretes] = useState<Arrete[]>([]);
  const [erreur, setErreur] = useState<string | null>(null);
  const [charge, setCharge] = useState(false);
  const [client, setClient] = useState<string | null>(null);
  const [segments, setSegments] = useState<Segment[] | null>(null);
  const [erreurSegments, setErreurSegments] = useState<string | null>(null);

  useEffect(() => {
    if (source !== "reelle") return;
    let actif = true;
    const t = window.setTimeout(async () => {
      try {
        const [p, a] = await Promise.all([chargerPilotage(null), chargerArretes()]);
        if (actif) { setReel(p); setArretes(a); }
      } catch (e) {
        if (actif) setErreur(e instanceof Error ? e.message : "La base n'a pas répondu.");
      } finally {
        if (actif) setCharge(true);
      }
    }, 0);
    return () => { actif = false; window.clearTimeout(t); };
  }, [source]);

  /* c4_36 : par segment et restitution, lus avec le client que donne offload_tableau ; gérant ou administrateur */
  useEffect(() => {
    if (source !== "reelle") return;
    let actif = true;
    (async () => {
      try {
        const c = (await chargerTableau())?.client ?? null;
        if (!actif) return;
        setClient(c);
        if (!c) { setErreurSegments("OFFLOAD n'est pas installé pour cette organisation."); return; }
        const l = await chargerSegments(c);
        if (actif) setSegments(l);
      } catch (e) {
        if (actif) setErreurSegments(e instanceof Error ? e.message : "La base n'a pas répondu.");
      }
    })();
    return () => { actif = false; };
  }, [source]);

  const p = source === "exemple" ? pilotageExemple() : reel;
  const listeArretes: Arrete[] = source === "exemple" && p ? [{ jour: jour(-5), pilotage: p, cree_le: jour(-5) }] : arretes;
  const aujourdhui = new Date().toISOString().slice(0, 10);
  const lesSegments = source === "exemple" ? segmentsExemple() : segments;

  /* un tableau du pilotage : l'onglet de /espace, une section de la page Usage de /espace3 */
  const contenu = (o: Onglet, p: Donnees) => (
    <>
      {o === "vagues" ? (
        p.vagues.length === 0 ? <p className="esp-kpi-sous">Aucune vague sur la période.</p> : (
          <>
            <Cadre etiquette="Chiffre remis en jeu, vague par vague">
              <table className="esp-tableau">
                <thead><tr><th>Vague du</th><th className="esp-num">Comptes</th><th className="esp-num">En jeu HT</th><th className="esp-num">Réponses</th><th className="esp-num">Taux</th><th className="esp-num">Commandes</th><th className="esp-num">Chiffre repris HT</th></tr></thead>
                <tbody>
                  {p.vagues.map((v) => (
                    <tr key={v.vague}>
                      <td>{dateCourte(v.vague)}</td><td className="esp-num">{nombreFr(v.comptes)}</td><td className="esp-num">{montant(v.en_jeu)}</td>
                      <td className="esp-num">{nombreFr(v.reponses)}</td><td className="esp-num">{v.taux_reponse === null ? "—" : `${String(v.taux_reponse).replace(".", ",")} %`}</td>
                      <td className="esp-num">{nombreFr(v.commandes)}</td><td className="esp-num">{montant(v.chiffre_repris)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Cadre>
            <span className="esp-kpi-sous">En jeu : la valeur annuelle attendue des comptes sollicités, figée à l&apos;ouverture. Repris : leurs achats dans les 90 jours qui suivent.</span>
          </>
        )
      ) : null}

      {o === "taux" ? (
        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
          {AXES.map((ax) => (
            <Cadre key={ax.cle} etiquette={`Taux de réponse ${ax.libelle.toLowerCase()}`}>
              <table className="esp-tableau">
                <thead><tr><th>{ax.libelle}</th><th className="esp-num">Sollicités</th><th className="esp-num">Taux</th></tr></thead>
                <tbody>
                  {(p.taux[ax.cle] ?? []).length === 0 ? <tr><td colSpan={3} className="esp-kpi-sous">Aucune sollicitation.</td></tr> : null}
                  {(p.taux[ax.cle] ?? []).map((l) => (
                    <tr key={l.valeur}>
                      <td>{ax.cle === "niveau" ? NIVEAUX[l.valeur] ?? l.valeur : l.valeur}</td>
                      <td className="esp-num">{nombreFr(l.sollicites)}</td>
                      <td className="esp-num"><Taux l={l} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Cadre>
          ))}
        </div>
      ) : null}

      {o === "suivi" ? (
        <Cadre etiquette="Tableau de suivi">
          <table className="esp-tableau">
            <thead><tr><th>Mois</th><th className="esp-num">Échéances honorées</th><th className="esp-num">dont après message</th><th className="esp-num">Commandes reprises</th><th className="esp-num">Chiffre repris HT</th><th className="esp-num">Affaires retirées</th><th className="esp-num">Valeur libérée HT</th></tr></thead>
            <tbody>
              {p.suivi.map((m) => (
                <tr key={m.mois}>
                  <td>{m.mois.split("-").reverse().join("/")}</td><td className="esp-num">{nombreFr(m.echeances_honorees)}</td><td className="esp-num">{nombreFr(m.echeances_apres_message)}</td>
                  <td className="esp-num">{nombreFr(m.commandes_reprises)}</td><td className="esp-num">{montant(m.chiffre_repris)}</td>
                  <td className="esp-num">{nombreFr(m.affaires_retirees)}</td><td className="esp-num">{montant(m.valeur_liberee)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Cadre>
      ) : null}

      {o === "entites" ? (
        <Cadre etiquette="Résultats par entité, par site et en consolidé">
          <table className="esp-tableau">
            <thead><tr><th>Entité / site</th><th className="esp-num">Comptes</th><th className="esp-num">Réponses</th><th className="esp-num">Commandes</th><th className="esp-num">Chiffre repris HT</th><th className="esp-num">Échéances honorées</th><th className="esp-num">Affaires retirées</th></tr></thead>
            <tbody>
              {p.entites.par_entite.map((e) => (
                <FragmentEntite key={e.societe_id} nom={e.societe} r={e} sites={p.entites.par_site.filter((s) => s.societe_id === e.societe_id)} />
              ))}
              {p.entites.consolide ? (
                <tr style={{ fontWeight: 600 }}>
                  <td>Consolidé</td><td className="esp-num">{nombreFr(p.entites.consolide.comptes)}</td><td className="esp-num">{nombreFr(p.entites.consolide.reponses)}</td>
                  <td className="esp-num">{nombreFr(p.entites.consolide.commandes)}</td><td className="esp-num">{montant(p.entites.consolide.chiffre_repris)}</td>
                  <td className="esp-num">{nombreFr(p.entites.consolide.echeances_honorees)}</td><td className="esp-num">{nombreFr(p.entites.consolide.affaires_retirees)}</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </Cadre>
      ) : null}

      {o === "arretes" ? (
        listeArretes.length === 0 ? <p className="esp-kpi-sous">Aucun arrêté encore : le premier sera posé la nuit du jour réglé (le 1er du mois par défaut).</p> : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 6 }}>
            {listeArretes.map((a) => (
              <li key={a.jour} style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 8, border: "1px solid var(--r-filet)", borderRadius: 12, padding: "8px 12px" }}>
                <span>Arrêté du <strong>{dateCourte(a.jour)}</strong> <span className="esp-kpi-sous">— vagues, taux, suivi, entités</span></span>
                <Exporter libelle="Télécharger en tableur" onClick={() => exporterArrete(a.pilotage, a.jour)} />
              </li>
            ))}
          </ul>
        )
      ) : null}

      {o === "segments" ? <ValeurParSegment segments={lesSegments} erreur={source === "exemple" ? null : erreurSegments} /> : null}
      {o === "restitution" ? <RestitutionEnTableur source={source} client={client} /> : null}
    </>
  );

  if (gabarit === "sb") {
    /* 22/10 — la page Usage de Supabase : une section par tableau, le texte à gauche, le tableau à droite */
    const TEXTES: Record<Onglet, string> = {
      vagues: "Une vague est le passage d'un jour. En jeu : la valeur annuelle attendue des comptes sollicités ; repris : leurs achats dans les 90 jours.",
      taux: "Les taux de réponse comparés par segment, canal, message et niveau du signal.",
      suivi: "Mois par mois : échéances honorées, commandes reprises, affaires retirées.",
      entites: "Les résultats par entité, par site et en consolidé.",
      arretes: "Posés la nuit à date fixe, chacun téléchargeable en tableur.",
      segments: "La valeur annuelle en jeu chez les comptes à risque, segment par segment. Réservé au gérant et à l'administrateur.",
      restitution: "Un fichier CSV par famille, prêt pour un tableur.",
    };
    return (
      <SbPage titre="Pilotage" description={p ? `Douze derniers mois, depuis le ${dateCourte(p.depuis)}. Chaque tableau s'exporte vers un tableur.` : "Vue consolidée, réservée à la direction."}>
        {source === "reelle" && !charge ? <Chargement texte="Calcul du pilotage…" /> : !p ? (
          <Vide titre="Pilotage indisponible">{erreur ?? "Le pilotage consolidé se lit par le gérant, l'administrateur ou le valideur."}</Vide>
        ) : (
          <>
            <SbSection titre="Valeur en jeu par segment" textes={[TEXTES.segments]}>
              <div className="sb-pilotage">{contenu("segments", p)}</div>
            </SbSection>
            <SbSection titre="Chiffre repris" textes={["Le chiffre repris hors taxes, vague par vague, sur la période."]}>
              <SbGraphique titre="Chiffre repris HT" barres={p.vagues.map((v) => ({ cle: v.vague, libelle: dateCourte(v.vague), valeur: v.chiffre_repris }))} format={(n) => montant(n)} vide="Aucune vague sur la période" />
            </SbSection>
            {ONGLETS.filter((o) => o.cle !== "segments").map((o) => (
              <SbSection key={o.cle} titre={o.libelle} textes={[TEXTES[o.cle]]}>
                <div className="sb-pilotage">
                  {contenu(o.cle, p)}
                  {EXPORTABLES.includes(o.cle) ? <div><Exporter onClick={() => exporterTableau(p, o.cle as TableauPilotage, aujourdhui)} /></div> : null}
                </div>
              </SbSection>
            ))}
          </>
        )}
      </SbPage>
    );
  }

  return (
    <section className="esp-carte" aria-label="Pilotage">
      <div className="esp-carte-tete">
        <h2 className="esp-carte-titre">Pilotage</h2>
        <span className="esp-kpi-sous">{p ? `douze derniers mois, depuis le ${dateCourte(p.depuis)}` : "vue consolidée, réservée à la direction"}</span>
      </div>
      {source === "reelle" && !charge ? <Chargement texte="Calcul du pilotage…" /> : !p ? (
        <Vide titre="Pilotage indisponible">{erreur ?? "Le pilotage consolidé se lit par le gérant, l'administrateur ou le valideur."}</Vide>
      ) : (
        <div className="esp-carte-corps" style={{ display: "grid", gap: 10 }}>
          <div role="tablist" aria-label="Tableaux du pilotage" style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {ONGLETS.map((o) => (
              <button key={o.cle} type="button" role="tab" aria-selected={onglet === o.cle}
                className={`r-btn r-btn--petit ${onglet === o.cle ? "r-btn--noir" : "r-btn--fil"}`} onClick={() => setOnglet(o.cle)}>
                {o.libelle}
              </button>
            ))}
          </div>

          {contenu(onglet, p)}
          {EXPORTABLES.includes(onglet) ? <div><Exporter onClick={() => exporterTableau(p, onglet as TableauPilotage, aujourdhui)} /></div> : null}
        </div>
      )}
    </section>
  );
}

function FragmentEntite({ nom, r, sites }: { nom: string; r: Donnees["entites"]["par_entite"][number]; sites: Donnees["entites"]["par_site"] }) {
  return (
    <>
      <tr>
        <td><strong>{nom}</strong></td><td className="esp-num">{nombreFr(r.comptes)}</td><td className="esp-num">{nombreFr(r.reponses)}</td>
        <td className="esp-num">{nombreFr(r.commandes)}</td><td className="esp-num">{montant(r.chiffre_repris)}</td>
        <td className="esp-num">{nombreFr(r.echeances_honorees)}</td><td className="esp-num">{nombreFr(r.affaires_retirees)}</td>
      </tr>
      {sites.map((s) => (
        <tr key={s.site_id}>
          <td style={{ paddingLeft: 20 }}>{s.site}</td><td className="esp-num">{nombreFr(s.comptes)}</td><td className="esp-num">{nombreFr(s.reponses)}</td>
          <td className="esp-num">{nombreFr(s.commandes)}</td><td className="esp-num">{montant(s.chiffre_repris)}</td>
          <td className="esp-num">{nombreFr(s.echeances_honorees)}</td><td className="esp-num">{nombreFr(s.affaires_retirees)}</td>
        </tr>
      ))}
    </>
  );
}
