"use client";

/* ══════════════════════════════════════════════════════════════════════
   « Ce matin » — le point du matin Varelo en tête de l'écran (vague 3,
   06/10/2026, B1). Les mêmes lignes que les sections déposées chaque
   matin au gérant et aux directions (private.grp_lignes_matin, migration
   b1_07) : contrats à dénoncer, encours du groupe, réciproques
   intragroupe. En base réelle, public.grp_ce_matin(p_client) les rend au
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
import type { CodeRef, Objet } from "./types";

type Ligne = { texte: string; gravite: "info" | "attention" | "critique"; lien: string };
type Matin = { contrats: Ligne[]; encours: Ligne[]; reciproques: Ligne[] };

const BLOCS: { cle: keyof Matin; titre: string; ancre: string; vide: string }[] = [
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
  return { contrats, encours, reciproques };
}

export default function CeMatin({ source, client_id, actif, codes, objets }: { source: Source; client_id: string; actif: boolean; codes: CodeRef[]; objets: Objet[] }) {
  const [exemple] = useState<Matin>(() => matinExemple(codes, objets));
  const [reel, setReel] = useState<Matin | null>(null);
  const [erreur, setErreur] = useState(false);

  const charger = useCallback(async () => {
    const { data, error } = await createClient().rpc("grp_ce_matin", { p_client: client_id });
    if (error) {
      setErreur(true);
      setReel({ contrats: [], encours: [], reciproques: [] });
    } else {
      setErreur(false);
      setReel(data as Matin);
    }
  }, [client_id]);
  useEffect(() => {
    if (source !== "reelle" || !actif) return;
    const t = window.setTimeout(() => void charger(), 0);
    return () => window.clearTimeout(t);
  }, [source, actif, charger]);

  const m = source === "exemple" ? exemple : reel;
  if (!m) return null;
  const total = m.contrats.length + m.encours.length + m.reciproques.length;

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
