"use client";

/* ══════════════════════════════════════════════════════════════════════
   Les réglages par site (19/10/2026, C3, lot c3_17)

   Un site SUIT l'organisation (mêmes signature, ton, formules) tant qu'on
   ne le règle pas lui-même ; réglé, il a ses propres réglages, jusqu'à
   « Revenir à l'organisation ». Chacun ne voit et ne règle que les sites de
   son périmètre (vue reput_reglages_sites, portes reput_regler et
   reput_suivre_organisation).
   ══════════════════════════════════════════════════════════════════════ */

import { useEffect, useState } from "react";
import { Loader } from "@/components/ui/loader";
import { Avis, Pastille } from "../ui";
import { chargerSites, reglerSite, suivreOrganisation, type ReglageSite } from "./portes";
import type { Client } from "./types";

const EXEMPLE: ReglageSite[] = [
  { entite_id: "00000000-0000-4000-8000-00000000c3a1", nom: "Showroom de Lyon", type: "site", principale: false, source: "propres",
    signature: "L'équipe du showroom de Lyon", ton: "vouvoiement", formule_appel: "Bonjour,", formule_politesse: "À bientôt au showroom," },
  { entite_id: "00000000-0000-4000-8000-00000000c3a2", nom: "Atelier de Villeurbanne", type: "site", principale: false, source: "organisation",
    signature: "Bien cordialement,\nL'équipe de l'Atelier Bertin", ton: "vouvoiement", formule_appel: "Bonjour,", formule_politesse: "Bien cordialement," },
];

type Brouillon = Pick<ReglageSite, "signature" | "ton" | "formule_appel" | "formule_politesse">;

export default function ReglagesSites({ source, client, dirige }: { source: "exemple" | "reelle"; client: Client | null; dirige: boolean }) {
  const [sites, setSites] = useState<ReglageSite[] | null>(source === "exemple" ? EXEMPLE : null);
  const [ouvert, setOuvert] = useState<string | null>(null);
  const [b, setB] = useState<Brouillon | null>(null);
  const [envoi, setEnvoi] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [fait, setFait] = useState<string | null>(null);
  const [tour, setTour] = useState(0);

  useEffect(() => {
    if (source === "exemple" || !client) return;
    let vivant = true;
    chargerSites(client.client_id).then((x) => { if (vivant) setSites(x); })
      .catch((e) => { if (vivant) { setSites([]); setErreur(e instanceof Error ? e.message : "La base n'a pas répondu."); } });
    return () => { vivant = false; };
  }, [source, client, tour]);

  if (sites === null) return <p className="esp-kpi-sous"><Loader variant="spin" /> Sites…</p>;
  const autres = sites.filter((s) => !s.principale);
  if (!autres.length) return null;

  const agir = async (cle: string, reel: () => Promise<unknown>, local: (x: ReglageSite[]) => ReglageSite[], message: string) => {
    setEnvoi(cle);
    setErreur(null);
    setFait(null);
    try {
      if (source === "reelle") { await reel(); setTour((n) => n + 1); }
      else setSites((x) => local(x ?? []));
      setFait(message);
      setOuvert(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base n'a pas répondu.");
    } finally {
      setEnvoi(null);
    }
  };

  return (
    <section className="esp-carte" aria-label="Réglages par site" data-reglages-sites>
      <div className="esp-carte-tete"><h2 className="esp-carte-titre">Par site</h2></div>
      <div className="esp-carte-corps">
        <p className="esp-kpi-sous" style={{ marginBottom: 10 }}>
          Un site reprend la signature, le ton et les formules de l&apos;organisation tant que vous ne le réglez pas lui-même.
          Vous ne voyez que les sites de votre périmètre.
        </p>
        {fait ? <div style={{ marginBottom: 8 }}><Avis teinte="vert">{fait}</Avis></div> : null}
        {erreur ? <div style={{ marginBottom: 8 }}><Avis teinte="rouge">{erreur}</Avis></div> : null}
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 10 }}>
          {autres.map((s) => (
            <li key={s.entite_id} style={{ border: "1px solid var(--r-filet)", borderRadius: 8, padding: "10px 12px", minWidth: 0 }}>
              <div className="esp-item-haut" style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
                <strong style={{ overflowWrap: "anywhere" }}>{s.nom}</strong>
                {s.source === "propres" ? <Pastille teinte="bleu">Réglages propres</Pastille> : <Pastille contour>Suit l&apos;organisation</Pastille>}
              </div>
              <p className="esp-kpi-sous" style={{ marginTop: 4, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
                {s.ton === "tutoiement" ? "Tutoiement" : "Vouvoiement"} · signature : {s.signature}
              </p>
              {dirige && ouvert !== s.entite_id ? (
                <div className="esp-actions" style={{ marginTop: 8, flexWrap: "wrap" }}>
                  <button type="button" className="r-btn" disabled={envoi !== null}
                          onClick={() => { setOuvert(s.entite_id); setB({ signature: s.signature, ton: s.ton, formule_appel: s.formule_appel, formule_politesse: s.formule_politesse }); }}>
                    Régler ce site
                  </button>
                  {s.source === "propres" ? (
                    <button type="button" className="r-btn" disabled={envoi !== null}
                            onClick={() => void agir(`suivre:${s.entite_id}`, () => suivreOrganisation(client!.client_id, s.entite_id),
                              (x) => x.map((y) => (y.entite_id === s.entite_id ? { ...y, source: "organisation" } : y)),
                              `${s.nom} reprend les réglages de l'organisation.`)}>
                      {envoi === `suivre:${s.entite_id}` ? <Loader variant="spin" /> : null} Revenir à l&apos;organisation
                    </button>
                  ) : null}
                </div>
              ) : null}
              {dirige && ouvert === s.entite_id && b ? (
                <div className="esp-form" style={{ marginTop: 10 }}>
                  <label className="rv-libelle">Signature du site
                    <textarea className="rv-champ" rows={2} value={b.signature} onChange={(e) => setB({ ...b, signature: e.target.value })} />
                  </label>
                  <div className="esp-form-ligne">
                    <label className="rv-libelle">Formule d&apos;appel
                      <input className="rv-champ" value={b.formule_appel} onChange={(e) => setB({ ...b, formule_appel: e.target.value })} />
                    </label>
                    <label className="rv-libelle">Formule de politesse
                      <input className="rv-champ" value={b.formule_politesse} onChange={(e) => setB({ ...b, formule_politesse: e.target.value })} />
                    </label>
                    <label className="rv-libelle">Ton
                      <select className="rv-champ" value={b.ton} onChange={(e) => setB({ ...b, ton: e.target.value as ReglageSite["ton"] })}>
                        <option value="vouvoiement">Vouvoiement</option>
                        <option value="tutoiement">Tutoiement</option>
                      </select>
                    </label>
                  </div>
                  <div className="esp-actions" style={{ flexWrap: "wrap" }}>
                    <button type="button" className="r-btn r-btn--noir" disabled={envoi !== null || !b.signature.trim()}
                            onClick={() => void agir(`regler:${s.entite_id}`, () => reglerSite(client!.client_id, s.entite_id, b),
                              (x) => x.map((y) => (y.entite_id === s.entite_id ? { ...y, ...b, source: "propres" } : y)),
                              `${s.nom} a désormais ses propres réglages.`)}>
                      {envoi === `regler:${s.entite_id}` ? <Loader variant="spin" /> : null} Enregistrer pour ce site
                    </button>
                    <button type="button" className="r-btn" disabled={envoi !== null} onClick={() => setOuvert(null)}>Annuler</button>
                  </div>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
