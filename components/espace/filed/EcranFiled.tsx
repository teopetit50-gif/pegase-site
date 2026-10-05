"use client";

/* ══════════════════════════════════════════════════════════════════════
   /espace/filed — les documents reçus (05/10/2026)

   En haut, quatre compteurs qui filtrent : bloquées, en litige, en
   attente, traitées (etats.ts → famille()). À gauche la liste, numérotée
   R2026-000001 ; à droite le dossier du document ouvert (DossierVue) et
   la pièce en regard (VisionneusePiece).

   Deux sources : l'exemple (exemples/filed.ts, modifié en mémoire par les
   corrections pour que l'enchaînement se voie) ou la base réelle
   (portes.ts : la liste d'abord, le dossier à l'ouverture).
   ══════════════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useMemo, useState } from "react";
import { DOSSIERS_EXEMPLE, FOURNISSEURS_EXEMPLE, MOTIFS_EXEMPLE } from "../exemples/filed";
import { nomEntite } from "../exemples/socle";
import { useSource } from "../source";
import { Avis, Chargement, Pastille, Ruban, Vide } from "../ui";
import { dateCourte, montant } from "../format";
import type { DossierFiled, Fournisseur, MotifRefus } from "../types";
import { ETATS, FAMILLES, NATURES, STATUTS_FACTURE, famille, type Famille } from "./etats";
import { chargerDossier, chargerFournisseurs, chargerListe, type Apercu } from "./portes";
import DossierVue from "./DossierVue";

type Reel = { apercus: Apercu[]; motifs: MotifRefus[]; fournisseurs: Fournisseur[]; dossiers: Record<string, DossierFiled> };

export default function EcranFiled() {
  const { source } = useSource();
  const [local, setLocal] = useState<DossierFiled[]>(DOSSIERS_EXEMPLE);
  const [reel, setReel] = useState<Reel | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [filtre, setFiltre] = useState<Famille | null>(null);
  const [choix, setChoix] = useState<string | null>(null);
  const [chargeDossier, setChargeDossier] = useState(false);

  const charger = useCallback(async () => {
    await Promise.resolve();
    setErreur(null);
    setReel(null);
    try {
      const [liste, fournisseurs] = await Promise.all([chargerListe(), chargerFournisseurs().catch(() => [] as Fournisseur[])]);
      setReel({ ...liste, fournisseurs, dossiers: {} });
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base n'a pas répondu.");
      setReel({ apercus: [], motifs: [], fournisseurs: [], dossiers: {} });
    }
  }, []);

  useEffect(() => {
    if (source !== "reelle") return;
    const t = window.setTimeout(() => void charger(), 0);
    return () => window.clearTimeout(t);
  }, [source, charger]);

  /* ——— la liste, sous une forme commune aux deux sources ——— */
  const apercus: Apercu[] = useMemo(() => {
    if (source === "exemple") return local.map((d) => ({ document: d.document, facture: d.facture, fournisseur: d.fournisseur }));
    return reel?.apercus ?? [];
  }, [source, local, reel]);

  const rang: Record<Famille, number> = { bloquee: 0, litige: 1, attente: 2, reste: 3 };
  const visibles = useMemo(() => {
    const l = apercus.filter((a) => !filtre || famille(a.document, a.facture) === filtre);
    return [...l].sort((a, b) => {
      const fa = rang[famille(a.document, a.facture)];
      const fb = rang[famille(b.document, b.facture)];
      if (fa !== fb) return fa - fb;
      return new Date(b.document.recu_le).getTime() - new Date(a.document.recu_le).getTime();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `rang` est une constante
  }, [apercus, filtre]);

  const compteurs = useMemo(() => {
    const c: Record<Famille, number> = { bloquee: 0, litige: 0, attente: 0, reste: 0 };
    for (const a of apercus) c[famille(a.document, a.facture)]++;
    return c;
  }, [apercus]);

  const choisi = choix && visibles.some((a) => a.document.id === choix) ? choix : (visibles[0]?.document.id ?? null);
  const apercu = visibles.find((a) => a.document.id === choisi) ?? null;

  /* ——— le dossier ouvert ——— */
  const dossier: DossierFiled | null = useMemo(() => {
    if (!choisi) return null;
    if (source === "exemple") return local.find((d) => d.document.id === choisi) ?? null;
    return reel?.dossiers[choisi] ?? null;
  }, [source, local, reel, choisi]);

  useEffect(() => {
    if (source !== "reelle" || !apercu || !reel || reel.dossiers[apercu.document.id]) return;
    let actif = true;
    const t = window.setTimeout(async () => {
      setChargeDossier(true);
      try {
        const d = await chargerDossier(apercu);
        if (actif) setReel((prev) => (prev ? { ...prev, dossiers: { ...prev.dossiers, [d.document.id]: d } } : prev));
      } catch (e) {
        if (actif) setErreur(e instanceof Error ? e.message : "Le dossier n'a pas pu être lu.");
      } finally {
        if (actif) setChargeDossier(false);
      }
    }, 0);
    return () => {
      actif = false;
      window.clearTimeout(t);
    };
  }, [source, apercu, reel]);

  const motifs = source === "exemple" ? MOTIFS_EXEMPLE : (reel?.motifs ?? []);
  const fournisseurs = source === "exemple" ? FOURNISSEURS_EXEMPLE : (reel?.fournisseurs ?? []);

  /* en mode exemple, une correction remplace le dossier en mémoire ; en
     base réelle, on relit le dossier après la porte */
  const remplacerLocal = useCallback((d: DossierFiled) => {
    setLocal((prev) => prev.map((x) => (x.document.id === d.document.id ? d : x)));
  }, []);
  const relireReel = useCallback(async (a: Apercu) => {
    const liste = await chargerListe();
    const frais = liste.apercus.find((x) => x.document.id === a.document.id) ?? a;
    const d = await chargerDossier(frais);
    setReel((prev) => (prev ? { ...prev, apercus: liste.apercus, motifs: liste.motifs, dossiers: { ...prev.dossiers, [d.document.id]: d } } : prev));
  }, []);

  return (
    <>
      <div className="esp-tete" data-arrivee="">
        <div>
          <h1 className="esp-titre">Documents reçus</h1>
          <p className="esp-sous">
            Chaque document reçu a son numéro, ses contrôles et sa pièce. Ce qui bloque est en tête ; chaque correction passe par une porte et reste dans le fil.
          </p>
        </div>
        <Ruban source={source} />
      </div>

      <div className="esp-kpis" data-arrivee="">
        {FAMILLES.map((f) => (
          <button key={f.cle} type="button" className="esp-kpi" data-teinte={compteurs[f.cle] ? f.teinte : undefined} aria-pressed={filtre === f.cle} onClick={() => setFiltre(filtre === f.cle ? null : f.cle)}>
            <span className="esp-kpi-etiquette">{f.libelle}</span>
            <span className="esp-kpi-valeur">{compteurs[f.cle]}</span>
            <span className="esp-kpi-sous">{f.sous}</span>
          </button>
        ))}
      </div>

      {erreur ? (
        <div style={{ marginBottom: 14 }}>
          <Avis teinte="rouge" role="alert"><strong>La base réelle n&apos;a pas répondu.</strong> {erreur}</Avis>
        </div>
      ) : null}

      <div className="esp-grille esp-grille--large">
        <section className="esp-carte" aria-label="Documents">
          <div className="esp-carte-tete">
            <h2 className="esp-carte-titre">{filtre ? FAMILLES.find((f) => f.cle === filtre)?.libelle : "Tous les documents"}</h2>
            <span className="esp-kpi-sous">{visibles.length} document{visibles.length > 1 ? "s" : ""}</span>
          </div>
          {source === "reelle" && !reel ? (
            <Chargement texte="Lecture des documents…" />
          ) : visibles.length === 0 ? (
            <Vide titre="Aucun document">{filtre ? "Rien dans cette famille." : "Aucun document reçu pour l'instant."}</Vide>
          ) : (
            <ul className="esp-liste" role="listbox" aria-label="Documents reçus">
              {visibles.map((a) => {
                const fam = famille(a.document, a.facture);
                const e = ETATS[a.document.etat];
                return (
                  <li key={a.document.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={choisi === a.document.id}
                      className="esp-item"
                      onClick={() => {
                        setChoix(a.document.id);
                        if (window.innerWidth < 1024) document.getElementById("esp-dossier")?.scrollIntoView({ behavior: "smooth", block: "start" });
                      }}
                    >
                      <span className="esp-item-haut">
                        <span className="esp-mono" style={{ fontWeight: 600 }}>{a.document.reference}</span>
                        {a.facture ? <Pastille teinte={STATUTS_FACTURE[a.facture.statut].teinte}>{STATUTS_FACTURE[a.facture.statut].libelle}</Pastille> : <Pastille teinte={e.teinte}>{e.libelle}</Pastille>}
                        {fam === "litige" ? <Pastille teinte="ambre">Litige</Pastille> : null}
                        {a.facture?.nb_bloquants ? <Pastille teinte="rouge">{a.facture.nb_bloquants} bloquant{a.facture.nb_bloquants > 1 ? "s" : ""}</Pastille> : null}
                        {a.facture?.nb_attention ? <Pastille teinte="ambre">{a.facture.nb_attention} à vérifier</Pastille> : null}
                      </span>
                      <span className="esp-item-montant">{a.facture?.montant_ttc !== null && a.facture?.montant_ttc !== undefined ? montant(a.facture.montant_ttc, a.facture.devise) : ""}</span>
                      <span className="esp-item-titre">
                        {a.document.nature ? NATURES[a.document.nature] : "Document"}
                        {a.fournisseur ? ` — ${a.fournisseur.nom}` : a.document.expediteur ? ` — ${a.document.expediteur}` : ""}
                        {a.facture?.numero ? ` · n° ${a.facture.numero}` : ""}
                      </span>
                      <span className="esp-item-bas">
                        <span>Reçu le {dateCourte(a.document.recu_le)}</span>
                        {a.facture?.echeance_lue ? <span>Échéance {dateCourte(a.facture.echeance_lue)}</span> : null}
                        <span>{source === "exemple" ? nomEntite(a.document.entite_id) : a.document.nom_fichier}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section id="esp-dossier" className="esp-detail-mobile" aria-label="Dossier du document">
          {dossier ? (
            <DossierVue
              key={dossier.document.id}
              dossier={dossier}
              source={source}
              motifs={motifs}
              fournisseurs={fournisseurs}
              onLocal={remplacerLocal}
              relire={() => (apercu ? relireReel(apercu) : Promise.resolve())}
            />
          ) : chargeDossier || (source === "reelle" && apercu) ? (
            <div className="esp-carte"><Chargement texte="Lecture du dossier…" /></div>
          ) : (
            <div className="esp-carte"><Vide titre="Choisissez un document">Le dossier, les contrôles et la pièce s&apos;affichent ici.</Vide></div>
          )}
        </section>
      </div>
    </>
  );
}
