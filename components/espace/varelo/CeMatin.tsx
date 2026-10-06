"use client";

/* ══════════════════════════════════════════════════════════════════════
   « Ce matin » — le point du matin Varelo en tête de l'écran (vague 3,
   06/10/2026, B1). Les mêmes lignes que les sections déposées chaque
   matin au gérant et aux directions (private.grp_lignes_matin, migration
   b1_07) : contrats à dénoncer, encours du groupe, réciproques
   intragroupe ; et, depuis b1_08, « le groupe ce matin » (trésorerie sous
   plancher, ventes en retard sur l'objectif, balance ancienne) ; depuis
   b1_11, les réserves à émettre (protestation au transporteur). En base réelle, public.grp_ce_matin(p_client) les rend au
   périmètre de la personne ; dans l'exemple, elles sont tirées des mêmes
   données d'exemple que les cartes.
   ══════════════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Source } from "../source";
import { Pastille } from "../ui";
import { montant } from "../format";
import { aujourdhui, contratsExemple, echeancier } from "./contrats";
import { calculerGroupe, exempleEncours, PLAFONDS_EXEMPLE } from "./encours";
import { RECIPROQUES_EXEMPLE } from "./reciproques";
import { BASES_EXEMPLE, ligneDePage } from "./groupe";
import { FAITS_EXEMPLE, OBLIGATIONS_EXEMPLE, echeances } from "./reportings";
import { RESERVES_EXEMPLE } from "./reserves";
import type { CodeRef, Objet } from "./types";

type Ligne = { texte: string; gravite: "info" | "attention" | "critique"; lien: string };
type Matin = { groupe: Ligne[]; reserves: Ligne[]; reportings: Ligne[]; contrats: Ligne[]; encours: Ligne[]; reciproques: Ligne[] };

const BLOCS: { cle: keyof Matin; titre: string; ancre: string; vide: string }[] = [
  { cle: "groupe", titre: "Le groupe ce matin", ancre: "vrl-groupe", vide: "Trésoreries au-dessus des planchers, ventes dans les objectifs." },
  { cle: "reserves", titre: "Réserves à émettre", ancre: "vrl-reserves", vide: "Aucune livraison abîmée ou incomplète en attente de protestation." },
  { cle: "reportings", titre: "Reportings dus", ancre: "vrl-reportings", vide: "Aucun reporting en retard ni dû dans la semaine." },
  { cle: "contrats", titre: "Contrats à dénoncer", ancre: "vrl-contrats", vide: "Aucun contrat à dénoncer dans les 30 jours." },
  { cle: "encours", titre: "Encours du groupe", ancre: "vrl-encours", vide: "Aucun client au-dessus de son plafond ; les balances sont à jour." },
  { cle: "reciproques", titre: "Réciproques intragroupe", ancre: "vrl-reciproques", vide: "Les comptes réciproques concordent." },
];

const euros = (v: number | null) => (v === null ? "—" : montant(v).replace(/,00\s€$/, " €"));
const jj = (iso: string) => iso.slice(8, 10) + "/" + iso.slice(5, 7);

/* l'exemple, avec les mêmes phrases que private.grp_lignes_matin */
function matinExemple(codes: CodeRef[], objets: Objet[]): Matin {
  const bruts = contratsExemple(objets);
  const contrats = bruts
    .map((k) => echeancier(k, bruts))
    .filter((c) => c.statut === "actif" && c.reconduction === "tacite" && c.date_limite >= aujourdhui() && c.jours_restants <= 30)
    .sort((a, b) => a.date_limite.localeCompare(b.date_limite))
    .map((c) => ({
      texte: `Avant le ${jj(c.date_limite)} : dénoncer « ${c.intitule} » (${c.tiers}, ${c.societe})${c.montant_annuel !== null ? ` — ${euros(c.montant_annuel)} par an` : ""}${c.contrats_du_tiers > 1 ? ` ; ${c.contrats_du_tiers} contrats chez ce tiers dans le groupe` : ""}`,
      gravite: (c.jours_restants <= 7 ? "critique" : "attention") as Ligne["gravite"],
      lien: "/espace/varelo",
    }));
  const d = exempleEncours(codes, objets, PLAFONDS_EXEMPLE);
  const encours: Ligne[] = [
    ...calculerGroupe(d.lignes, d.plafonds)
      .filter((g) => g.nature === "client" && g.depasse && !g.intragroupe)
      .map((g) => ({ texte: `${g.nom_groupe} : ${euros(g.total)} d'encours pour le groupe, plafond ${euros(g.plafond)} (dont ${euros(g.echu)} échus, ${g.societes} société${g.societes > 1 ? "s" : ""})`, gravite: "attention" as const, lien: "/espace/varelo" })),
    ...d.courants
      .filter((c) => c.age_jours > 7)
      .map((c) => ({ texte: `La balance ${c.nature === "client" ? "clients" : "fournisseurs"} de ${c.societe} date du ${jj(c.arrete_le)} (${c.age_jours} jours) : à redéposer`, gravite: "info" as const, lien: "/espace/varelo" })),
  ];
  const reciproques = RECIPROQUES_EXEMPLE.filter((r) => r.etat === "ecart" || r.etat === "manque_debiteur" || r.etat === "dates_differentes")
    .sort((a, b) => Math.abs(b.ecart) - Math.abs(a.ecart))
    .map((r) => ({
      texte:
        r.etat === "ecart" ? `${r.creancier} → ${r.debiteur} : écart de ${euros(r.ecart)} à expliquer`
        : r.etat === "manque_debiteur" ? `${r.creancier} dit que ${r.debiteur} lui doit ${euros(r.creance)} ; ${r.debiteur} ne reconnaît rien`
        : `${r.creancier} → ${r.debiteur} : balances arrêtées à des dates différentes (${jj(r.arrete_creancier ?? "")} et ${jj(r.arrete_debiteur ?? "")})`,
      gravite: (r.etat === "ecart" ? "attention" : "info") as Ligne["gravite"],
      lien: "/espace/varelo",
    }));
  const groupe: Ligne[] = [];
  for (const p of BASES_EXEMPLE().map(ligneDePage).sort((a, b) => a.societe.localeCompare(b.societe))) {
    if (p.sous_plancher) groupe.push({ texte: `${p.societe} : trésorerie de ${euros(p.tresorerie)}, sous son plancher de ${euros(p.tresorerie_plancher)} (balance au ${jj(p.arrete_le)})`, gravite: "attention", lien: "/espace/varelo" });
    if (p.objectif_a_date !== null && p.objectif_a_date > 0 && p.ecart_objectif !== null && p.ecart_objectif < -0.1 * p.objectif_a_date)
      groupe.push({ texte: `${p.societe} : ventes de ${euros(p.ventes)} au ${jj(p.arrete_le)}, ${euros(Math.round(-p.ecart_objectif * 100) / 100)} sous l'objectif à date`, gravite: "attention", lien: "/espace/varelo" });
    if (p.age_jours > 35) groupe.push({ texte: `La balance générale de ${p.societe} date du ${jj(p.arrete_le)} (${p.age_jours} jours) : à redéposer`, gravite: "info", lien: "/espace/varelo" });
  }
  const faits = FAITS_EXEMPLE();
  const reportings: Ligne[] = OBLIGATIONS_EXEMPLE()
    .flatMap((o) => echeances(o, faits))
    .filter((d) => d.etat === "en_retard" || d.etat === "aujourdhui" || d.etat === "semaine")
    .sort((a, b) => a.echeance.localeCompare(b.echeance) || a.societe.localeCompare(b.societe))
    .map((d) => ({
      texte: d.etat === "en_retard" ? `En retard depuis le ${jj(d.echeance)} : ${d.intitule} pour ${d.destinataire} (${d.societe}, période du ${jj(d.periode_debut)} au ${jj(d.periode_fin)})`
        : d.etat === "aujourdhui" ? `Aujourd'hui : ${d.intitule} pour ${d.destinataire} (${d.societe})`
        : `Avant le ${jj(d.echeance)} : ${d.intitule} pour ${d.destinataire} (${d.societe})`,
      gravite: (d.etat === "en_retard" ? "critique" : d.etat === "aujourdhui" ? "attention" : "info") as Ligne["gravite"],
      lien: "/espace/varelo",
    }));
  const reserves: Ligne[] = RESERVES_EXEMPLE()
    .filter((r) => r.statut === "a_examiner")
    .sort((a, b) => a.echeance.localeCompare(b.echeance) || a.societe.localeCompare(b.societe))
    .map((r) => ({
      texte: r.etat === "depasse" ? `Délai passé depuis le ${jj(r.echeance)} : ${r.transporteur} (${r.societe}, livraison du ${jj(r.date_reception)}) — la protestation est désormais tardive`
        : `Avant le ${jj(r.echeance)} : protestation à ${r.transporteur} (${r.societe}, livraison du ${jj(r.date_reception)}${r.expediteur ? `, ${r.expediteur}` : ""})`,
      gravite: (r.etat === "aujourdhui" || r.etat === "demain" || r.etat === "depasse" ? "critique" : "attention") as Ligne["gravite"],
      lien: "/espace/varelo",
    }));
  return { groupe, reserves, reportings, contrats, encours, reciproques };
}

export default function CeMatin({ source, client_id, actif, codes, objets }: { source: Source; client_id: string; actif: boolean; codes: CodeRef[]; objets: Objet[] }) {
  const [exemple] = useState<Matin>(() => matinExemple(codes, objets));
  const [reel, setReel] = useState<Matin | null>(null);
  const [erreur, setErreur] = useState(false);

  const charger = useCallback(async () => {
    const { data, error } = await createClient().rpc("grp_ce_matin", { p_client: client_id });
    if (error) {
      setErreur(true);
      setReel({ groupe: [], reserves: [], reportings: [], contrats: [], encours: [], reciproques: [] });
    } else {
      setErreur(false);
      setReel({ groupe: [], reserves: [], reportings: [], ...(data as Partial<Matin>) } as Matin);
    }
  }, [client_id]);
  useEffect(() => {
    if (source !== "reelle" || !actif) return;
    const t = window.setTimeout(() => void charger(), 0);
    return () => window.clearTimeout(t);
  }, [source, actif, charger]);

  const m = source === "exemple" ? exemple : reel;
  if (!m) return null;
  const total = m.groupe.length + m.reserves.length + m.reportings.length + m.contrats.length + m.encours.length + m.reciproques.length;

  return (
    <section className="esp-carte vrl-matin" aria-label="Ce matin" style={{ marginBottom: 16 }}>
      <div className="esp-carte-tete">
        <h2 className="esp-carte-titre">Ce matin</h2>
        <span className="esp-kpi-sous">{erreur ? "le point n'a pas pu être lu" : total ? `${total} point${total > 1 ? "s" : ""} à regarder, comme dans le point du matin des directions` : "rien à signaler"}</span>
      </div>
      <div className="vrl-matin-blocs">
        {BLOCS.map((b) => (
          <div key={b.cle} className="vrl-matin-bloc">
            <h3 className="esp-section-titre">
              <a href={`#${b.ancre}`}>{b.titre}</a> {m[b.cle].length ? <Pastille teinte={m[b.cle].some((l) => l.gravite === "critique") ? "rouge" : m[b.cle].some((l) => l.gravite === "attention") ? "ambre" : "gris"}>{m[b.cle].length}</Pastille> : null}
            </h3>
            {m[b.cle].length ? (
              <ul className="vrl-matin-liste">
                {m[b.cle].slice(0, 5).map((l, i) => (
                  <li key={i} data-gravite={l.gravite}>{l.texte}</li>
                ))}
                {m[b.cle].length > 5 ? <li className="vrl-paire-sous">… et {m[b.cle].length - 5} de plus</li> : null}
              </ul>
            ) : (
              <p className="esp-kpi-sous">{b.vide}</p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
