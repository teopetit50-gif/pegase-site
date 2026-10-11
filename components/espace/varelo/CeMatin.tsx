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
import { matinExemple, type Matin } from "./matin";
import type { CodeRef, Objet } from "./types";

const BLOCS: { cle: keyof Matin; titre: string; ancre: string; vide: string }[] = [
  { cle: "groupe", titre: "Le groupe ce matin", ancre: "vrl-groupe", vide: "Trésoreries au-dessus des planchers, ventes dans les objectifs." },
  { cle: "reserves", titre: "Réserves à émettre", ancre: "vrl-reserves", vide: "Aucune livraison abîmée ou incomplète en attente de protestation." },
  { cle: "reportings", titre: "Reportings dus", ancre: "vrl-reportings", vide: "Aucun reporting en retard ni dû dans la semaine." },
  { cle: "contrats", titre: "Contrats à dénoncer", ancre: "vrl-contrats", vide: "Aucun contrat à dénoncer dans les 30 jours." },
  { cle: "encours", titre: "Encours du groupe", ancre: "vrl-encours", vide: "Aucun client au-dessus de son plafond ; les balances sont à jour." },
  { cle: "reciproques", titre: "Réciproques intragroupe", ancre: "vrl-reciproques", vide: "Les comptes réciproques concordent." },
];

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
