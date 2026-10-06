"use client";

/* ══════════════════════════════════════════════════════════════════════
   /espace/point — le point du matin du jour (05/10/2026)

   Un bandeau noir : la date, l'heure du point, le canal, les compteurs.
   Puis les sections dans l'ordre de section_rang, chaque ligne avec sa
   gravité (critique / attention / info) ou sa santé ; le rang 0 d'une
   section veut dire « rien à signaler ». Les sections incomplètes le
   disent, et les motifs du point (connecteur muet…) sont en tête.

   Flèches pour relire les points des jours passés. Sans point assemblé
   pour le jour (base réelle), on propose l'aperçu (apercu_point). Les deux
   portes rendent sections[].lignes[] (portes.ts) ; l'exemple a la même
   forme une fois aplati.
   ══════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { pointExemple } from "../exemples/point";
import { aujourdHui } from "../exemples/socle";
import { useSource } from "../source";
import { useTempsReel } from "../tempsReel";
import { Avis, Chargement, Pastille, Ruban, Vide } from "../ui";
import { dateHeure, dateLongue, libelleModule } from "../format";
import type { LignePoint, PointDuJour } from "../types";
import { apercuPoint, lirePoint, listerPoints, monCompte } from "./portes";

type Contenu = { point: PointDuJour | null; lignes: LignePoint[]; apercu?: boolean; motifs?: unknown[] };

const STATUTS: Record<PointDuJour["statut"], { libelle: string; teinte: "vert" | "ambre" | "rouge" | "bleu" | "gris" }> = {
  pret: { libelle: "Prêt", teinte: "bleu" },
  remis: { libelle: "Remis", teinte: "vert" },
  vide: { libelle: "Rien à signaler", teinte: "vert" },
  echec: { libelle: "Échec d'envoi", teinte: "rouge" },
  perime: { libelle: "Périmé", teinte: "gris" },
};

export default function PointDuMatin() {
  const { source } = useSource();
  const [decalage, setDecalage] = useState(0);
  const [points, setPoints] = useState<PointDuJour[] | null>(null);
  const [contenus, setContenus] = useState<Record<string, Contenu>>({});
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargeApercu, setChargeApercu] = useState(false);

  const jour = aujourdHui(decalage);

  /* ——— base réelle : la liste de mes points, puis le contenu du jour ——— */
  useEffect(() => {
    if (source !== "reelle") return;
    let actif = true;
    const t = window.setTimeout(async () => {
      setErreur(null);
      setPoints(null);
      try {
        const l = await listerPoints();
        if (actif) setPoints(l);
      } catch (e) {
        if (actif) {
          setErreur(e instanceof Error ? e.message : "La base n'a pas répondu.");
          setPoints([]);
        }
      }
    }, 0);
    return () => {
      actif = false;
      window.clearTimeout(t);
    };
  }, [source]);

  /* le point du matin assemblé ou remis pendant qu'on regarde : relire la liste */
  const relire = useCallback(async () => {
    try {
      const l = await listerPoints();
      setPoints(l);
      setContenus({});
    } catch {
      /* la prochaine lecture à la main dira l'erreur */
    }
  }, []);
  useTempsReel(["points_du_jour"], source === "reelle", relire);

  const pointDuJour = useMemo(() => (points ?? []).filter((p) => p.jour === jour).sort((a, b) => b.version - a.version)[0] ?? null, [points, jour]);

  useEffect(() => {
    if (source !== "reelle" || !pointDuJour || contenus[pointDuJour.id]) return;
    let actif = true;
    const t = window.setTimeout(async () => {
      try {
        const r = await lirePoint(pointDuJour);
        if (actif) setContenus((prev) => ({ ...prev, [pointDuJour.id]: { point: r.point, lignes: r.lignes, motifs: r.motifs } }));
      } catch (e) {
        if (actif) setErreur(e instanceof Error ? e.message : "Le point n'a pas pu être lu.");
      }
    }, 0);
    return () => {
      actif = false;
      window.clearTimeout(t);
    };
  }, [source, pointDuJour, contenus]);

  const demanderApercu = useCallback(async () => {
    setChargeApercu(true);
    setErreur(null);
    try {
      const c = await monCompte();
      if (!c) throw new Error("Aucun compte rattaché à cette session.");
      const r = await apercuPoint(c.client_id, c.user_id, jour);
      setContenus((prev) => ({ ...prev, [`apercu-${jour}`]: { point: null, lignes: r.lignes, apercu: true, motifs: r.motifs } }));
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "L'aperçu n'a pas pu être fabriqué.");
    } finally {
      setChargeApercu(false);
    }
  }, [jour]);

  /* ——— le contenu affiché ——— */
  const contenu: Contenu | null = useMemo(() => {
    if (source === "exemple") {
      if (decalage < -6) return { point: null, lignes: [] };
      return pointExemple(decalage);
    }
    if (pointDuJour) return contenus[pointDuJour.id] ?? null;
    return contenus[`apercu-${jour}`] ?? { point: null, lignes: [] };
  }, [source, decalage, pointDuJour, contenus, jour]);

  const sections = useMemo(() => {
    const m = new Map<number, LignePoint[]>();
    for (const l of contenu?.lignes ?? []) m.set(l.section_rang, [...(m.get(l.section_rang) ?? []), l]);
    return Array.from(m.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([rang, lignes]) => ({ rang, lignes: lignes.sort((a, b) => a.rang - b.rang), titre: lignes[0]?.titre ?? `Section ${rang}`, module: lignes[0]?.module ?? null, incomplete: lignes.some((l) => l.section_incomplete) }));
  }, [contenu]);

  const p = contenu?.point ?? null;
  const critiques = (contenu?.lignes ?? []).filter((l) => l.gravite === "critique").length;
  const attention = (contenu?.lignes ?? []).filter((l) => l.gravite === "attention").length;
  const motifs = (contenu?.motifs ?? p?.motifs ?? []) as { module?: string; motif?: string }[];

  return (
    <>
      <div className="esp-tete" data-arrivee="">
        <div>
          <h1 className="esp-titre">Point du matin</h1>
          <p className="esp-sous">Ce qui a bougé pendant la nuit, ce qui attend une décision, ce qui va bien. Assemblé chaque matin à l&apos;heure que vous avez choisie, remis par courriel.</p>
        </div>
        <Ruban source={source} />
      </div>

      <div className="esp-point-tete" data-arrivee="">
        <div>
          <div className="esp-point-jour">{dateLongue(`${jour}T12:00:00`)}</div>
          <div className="esp-point-meta" style={{ marginTop: 6 }}>
            {p ? (
              <>
                <span>Point de {p.heure ? p.heure.slice(0, 5).replace(":", " h ") : "7 h 00"}{p.fuseau ? ` (${p.fuseau})` : ""}</span>
                <span>{p.canal === "whatsapp" ? "Remis par WhatsApp" : "Remis par courriel"}{p.remis_le ? ` le ${dateHeure(p.remis_le)}` : ""}</span>
                <span>{p.nb_sections} sections · {p.nb_items} points</span>
              </>
            ) : contenu?.apercu ? (
              <span>Aperçu fabriqué à l&apos;instant — ce point n&apos;a pas été remis.</span>
            ) : (
              <span>Aucun point assemblé ce jour-là.</span>
            )}
          </div>
        </div>
        <div className="esp-item-haut">
          {p ? <Pastille teinte={STATUTS[p.statut].teinte}>{STATUTS[p.statut].libelle}</Pastille> : null}
          {critiques ? <Pastille teinte="rouge">{critiques} critique{critiques > 1 ? "s" : ""}</Pastille> : null}
          {attention ? <Pastille teinte="ambre">{attention} à surveiller</Pastille> : null}
          {p?.incomplet ? <Pastille teinte="ambre">Incomplet</Pastille> : null}
          <div className="esp-point-nav" role="group" aria-label="Changer de jour">
            <button type="button" aria-label="Jour précédent" onClick={() => setDecalage((d) => d - 1)}><ChevronLeft width={18} height={18} aria-hidden="true" /></button>
            <button type="button" aria-label="Jour suivant" disabled={decalage >= 0} onClick={() => setDecalage((d) => Math.min(0, d + 1))}><ChevronRight width={18} height={18} aria-hidden="true" /></button>
            {decalage !== 0 ? <button type="button" className="esp-lien-bouton" style={{ color: "#fff", marginLeft: 6 }} onClick={() => setDecalage(0)}>Aujourd&apos;hui</button> : null}
          </div>
        </div>
      </div>

      {erreur ? <div style={{ marginTop: 14 }}><Avis teinte="rouge" role="alert"><strong>La base réelle n&apos;a pas répondu.</strong> {erreur}</Avis></div> : null}

      {motifs.length ? (
        <div style={{ marginTop: 14 }}>
          <Avis teinte="ambre">
            <strong>Point incomplet.</strong>{" "}
            {motifs.map((m, i) => (
              <span key={i}>{m.module ? `${libelleModule(m.module)} : ` : ""}{m.motif ?? JSON.stringify(m)}{i < motifs.length - 1 ? " · " : ""}</span>
            ))}
          </Avis>
        </div>
      ) : null}

      {source === "reelle" && !points ? (
        <div className="esp-carte" style={{ marginTop: 14 }}><Chargement texte="Lecture de vos points…" /></div>
      ) : source === "reelle" && pointDuJour && !contenu ? (
        <div className="esp-carte" style={{ marginTop: 14 }}><Chargement texte="Lecture du point…" /></div>
      ) : !contenu || !sections.length ? (
        <div className="esp-carte" style={{ marginTop: 14 }}>
          <Vide titre={contenu?.apercu ? "Un aperçu sans rien dedans" : "Pas de point ce jour-là"}>
            {contenu?.apercu ? (
              "L'aperçu a été fabriqué, mais il ne porte aucune section : aucun gabarit de point n'est réglé pour votre organisation, ou rien n'est à signaler."
            ) : source === "reelle" && decalage === 0 ? (
              <>
                <p>Le point du matin n&apos;a pas encore été assemblé pour aujourd&apos;hui.</p>
                <div className="esp-actions" style={{ justifyContent: "center", marginTop: 12 }}>
                  <button type="button" className="r-btn r-btn--noir" disabled={chargeApercu} onClick={demanderApercu}>{chargeApercu ? "Fabrication…" : "Fabriquer un aperçu maintenant"}</button>
                </div>
              </>
            ) : source === "exemple" ? (
              "L'exemple ne remonte que sur une semaine."
            ) : (
              "Aucun point n'a été assemblé ce jour-là."
            )}
          </Vide>
        </div>
      ) : (
        <div className="esp-point-sections">
          {sections.map((s) => (
            <section key={s.rang} className={`esp-carte${s.lignes.some((l) => l.gravite === "critique") ? " esp-point-section--large" : ""}`} aria-label={s.titre}>
              <div className="esp-carte-tete">
                <h2 className="esp-carte-titre">{s.titre}</h2>
                <span className="esp-item-haut">
                  {s.module ? <Pastille teinte="noir">{libelleModule(s.module)}</Pastille> : null}
                  {s.incomplete ? <Pastille teinte="ambre">Incomplète</Pastille> : null}
                </span>
              </div>
              <div className="esp-carte-corps">
                {s.lignes.map((l) =>
                  l.rang === 0 ? (
                    <div key={l.id} className="esp-point-ligne">
                      <span className="esp-point-gravite" data-sante="true" aria-hidden="true" />
                      <div className="esp-point-rien">{l.texte ?? "Rien à signaler."}</div>
                    </div>
                  ) : (
                    <div key={l.id} className="esp-point-ligne">
                      <span className="esp-point-gravite" data-gravite={l.gravite ?? undefined} data-sante={l.sante} {...(l.gravite || l.sante ? { role: "img", "aria-label": l.gravite ?? "va bien" } : { "aria-hidden": true })} />
                      <div>
                        {l.entite_nom ? <div className="esp-point-entite">{l.entite_nom}</div> : null}
                        <div className="esp-point-texte">
                          {l.texte}
                          {l.lien ? (
                            <>
                              {" "}
                              {l.lien.startsWith("/") ? <Link href={l.lien}>Ouvrir</Link> : <a href={l.lien} target="_blank" rel="noopener noreferrer">Ouvrir</a>}
                            </>
                          ) : null}
                        </div>
                        {l.objet_id ? <div className="esp-point-entite esp-mono">{l.objet_id}</div> : null}
                      </div>
                    </div>
                  ),
                )}
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
