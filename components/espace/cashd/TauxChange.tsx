"use client";

/* ══════════════════════════════════════════════════════════════════════
   CASHD — les taux de change, vue Trésorerie (19/10/2026, session C2)

   Les factures en devise sont suivies en euros au taux le plus récent :
   celui de la BCE, chargé chaque jour ouvré (c2_15), ou celui que
   l'organisation saisit (cashd_poser_taux), qui l'emporte le même jour
   (c2_16). Ici : le taux retenu pour chaque devise des factures, et la
   saisie d'un taux.
   ══════════════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useState } from "react";
import { Avis, Pastille } from "../ui";
import { dateCourte } from "../format";
import * as portes from "./portes";
import { jourParis } from "./calcul";

const EXEMPLE: portes.TauxConnu[] = [
  { devise: "CHF", jour: null, taux: 1.0638, source: "bce" },
  { devise: "USD", jour: null, taux: 0.9195, source: "saisie" },
];

function nombre(t: string): number {
  const s = t.replace(/[\s  €]/g, "").replace(",", ".");
  const n = Number(s);
  return s && Number.isFinite(n) && n > 0 ? n : NaN;
}

export default function TauxChange({ source, client }: { source: "exemple" | "reelle"; client: string | null }) {
  const [liste, setListe] = useState<portes.TauxConnu[]>(source === "exemple" ? EXEMPLE.map((x) => ({ ...x, jour: jourParis() })) : []);
  const [f, setF] = useState({ devise: "", jour: jourParis(), taux: "" });
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [fait, setFait] = useState<string | null>(null);

  const charger = useCallback(async () => {
    if (source !== "reelle" || !client) return;
    try {
      setListe(await portes.chargerTaux(client));
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Les taux n'ont pas pu être lus.");
    }
  }, [source, client]);
  useEffect(() => {
    const t = window.setTimeout(() => void charger(), 0);
    return () => window.clearTimeout(t);
  }, [charger]);

  const devise = f.devise.trim().toUpperCase();
  const taux = nombre(f.taux);
  const valide = /^[A-Z]{3}$/.test(devise) && devise !== "EUR" && !Number.isNaN(taux) && !!f.jour && f.jour <= jourParis();

  const enregistrer = async () => {
    setEnvoi(true);
    setErreur(null);
    setFait(null);
    try {
      if (source === "reelle") {
        if (!client) throw new Error("Aucun compte rattaché à cette session.");
        await portes.poserTaux(client, devise, f.jour, taux);
        await charger();
      } else {
        setListe((prev) => [...prev.filter((x) => x.devise !== devise), { devise, jour: f.jour, taux, source: "saisie" as const }].sort((a, b) => a.devise.localeCompare(b.devise)));
      }
      setFait(`Taux enregistré${source === "exemple" ? " (exemple)" : ""} : 1 ${devise} = ${String(taux).replace(".", ",")} € le ${dateCourte(f.jour)}. Il l'emporte sur la BCE ce jour-là.`);
      setF({ devise: "", jour: jourParis(), taux: "" });
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base a refusé ce taux.");
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <section className="esp-carte c2-section" aria-label="Taux de change">
      <div className="esp-carte-tete">
        <h2 className="esp-carte-titre">Taux de change</h2>
        <span className="esp-kpi-sous">les factures en devise sont suivies en euros au taux le plus récent : la BCE chaque jour ouvré, ou le vôtre</span>
      </div>
      <div className="esp-carte-corps">
        {liste.length ? (
          <ul className="c2-taux">
            {liste.map((x) => (
              <li key={x.devise}>
                <strong>{x.devise}</strong>
                <span className="esp-num">{x.taux === null ? "aucun taux" : `1 ${x.devise} = ${String(x.taux).replace(".", ",")} €`}</span>
                {x.source ? <Pastille teinte={x.source === "bce" ? "gris" : "bleu"}>{x.source === "bce" ? "BCE" : "Saisi"}</Pastille> : <Pastille teinte="ambre">À saisir</Pastille>}
                {x.jour ? <span className="c2-sous">du {dateCourte(x.jour)}</span> : null}
              </li>
            ))}
          </ul>
        ) : <p className="c2-sous">Aucune facture en devise étrangère.</p>}
        <div className="esp-form c2-taux-form">
          <div className="esp-form-ligne">
            <label className="rv-libelle">Devise
              <input className="rv-champ" maxLength={3} value={f.devise} onChange={(e) => setF({ ...f, devise: e.target.value })} placeholder="USD" />
            </label>
            <label className="rv-libelle">Jour
              <input className="rv-champ" type="date" max={jourParis()} value={f.jour} onChange={(e) => setF({ ...f, jour: e.target.value })} />
            </label>
            <label className="rv-libelle">1 unité = … €
              <input className="rv-champ" inputMode="decimal" value={f.taux} onChange={(e) => setF({ ...f, taux: e.target.value })} placeholder="0,9195" />
            </label>
          </div>
          <div className="esp-actions">
            <button type="button" className="r-btn" disabled={!valide || envoi} onClick={() => void enregistrer()}>Saisir ce taux</button>
          </div>
          {erreur ? <Avis teinte="rouge">{erreur}</Avis> : null}
          {fait ? <Avis teinte="vert" role="status">{fait}</Avis> : null}
        </div>
      </div>
    </section>
  );
}
