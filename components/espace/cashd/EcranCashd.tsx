"use client";

/* ══════════════════════════════════════════════════════════════════════
   /espace/cashd — les relances d'impayés (06/10/2026, session C2)

   En haut, l'encours échu au total et quatre compteurs ; dessous, la
   balance âgée de tout l'encours. À gauche les débiteurs (qui doit quoi,
   depuis quand, où en est la relance) ; à droite la fiche du compte
   ouvert (FicheCompte). Plus bas, les relances écrites ce matin et leur
   état dans la file de validation, puis les règlements à rapprocher.

   Deux sources : l'exemple (exemples.ts, joué en mémoire pour que les
   gestes se voient) ou la base réelle (portes.ts : cashd_tableau,
   cashd_relances_du_jour, cashd_fiche_compte, sous RLS).
   ══════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FileUp, PenLine } from "lucide-react";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import { useSource } from "../source";
import { useTempsReel } from "../tempsReel";
import { Avis, Chargement, Pastille, Ruban, Vide } from "../ui";
import { dateCourte, dateHeure, montant } from "../format";
import { tableauDe, balanceDe } from "./calcul";
import { DERNIER_IMPORT_EXEMPLE, FICHES_EXEMPLE, REGLAGES_EXEMPLE, RELANCES_EXEMPLE, SANS_COMPTE_EXEMPLE } from "./exemples";
import { ETATS_RELANCE, STATUTS_COMPTE, TRANCHES, libellePalier } from "./etats";
import { JEUX, LIBELLES_CHAMPS, lireDepot, type Jeu } from "./depot";
import * as portes from "./portes";
import FicheCompte, { type Actions } from "./FicheCompte";
import type { Fiche, Proposition, Relance, ReglementEtat, Tableau } from "./types";
import "./cashd.css";

type Filtre = "echu" | "plus_90" | "pause" | null;
type Reel = { client: portes.MonClient | null; tableau: Tableau | null; relances: Relance[]; fiches: Record<string, Fiche> };

export default function EcranCashd() {
  const { source } = useSource();
  const [fiches, setFiches] = useState<Fiche[]>(FICHES_EXEMPLE);
  const [sansCompte, setSansCompte] = useState<ReglementEtat[]>(SANS_COMPTE_EXEMPLE);
  const [relancesLocales, setRelancesLocales] = useState<Relance[]>(RELANCES_EXEMPLE);
  const [reel, setReel] = useState<Reel | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [filtre, setFiltre] = useState<Filtre>(null);
  const [choix, setChoix] = useState<string | null>(null);
  const [chargeFiche, setChargeFiche] = useState(false);
  const [fait, setFait] = useState<string | null>(null);

  const charger = useCallback(async () => {
    await Promise.resolve();
    setErreur(null);
    setReel(null);
    try {
      const client = await portes.monClient();
      if (!client) {
        setReel({ client: null, tableau: null, relances: [], fiches: {} });
        return;
      }
      const [tableau, relances] = await Promise.all([portes.chargerTableau(client.client_id), portes.chargerRelances(client.client_id)]);
      setReel({ client, tableau, relances, fiches: {} });
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base n'a pas répondu.");
      setReel({ client: null, tableau: null, relances: [], fiches: {} });
    }
  }, []);

  useEffect(() => {
    if (source !== "reelle") return;
    const t = window.setTimeout(() => void charger(), 0);
    return () => window.clearTimeout(t);
  }, [source, charger]);

  const relire = useCallback(async () => {
    const client = reel?.client;
    if (!client) return;
    try {
      const [tableau, relances] = await Promise.all([portes.chargerTableau(client.client_id), portes.chargerRelances(client.client_id)]);
      setReel((prev) => (prev ? { ...prev, tableau, relances, fiches: {} } : prev));
    } catch {
      /* la prochaine lecture à la main dira l'erreur */
    }
  }, [reel?.client]);
  useTempsReel(["cashd_factures", "cashd_reglements", "cashd_relances", "cashd_comptes"], source === "reelle", relire);

  const tableau: Tableau | null = useMemo(() => {
    if (source === "exemple") return tableauDe(fiches, { reglages: REGLAGES_EXEMPLE, dernier_import: DERNIER_IMPORT_EXEMPLE }, sansCompte);
    return reel?.tableau ?? null;
  }, [source, fiches, sansCompte, reel]);
  const relances = source === "exemple" ? relancesLocales : (reel?.relances ?? []);

  const comptes = useMemo(() => {
    const l = tableau?.comptes ?? [];
    return l.filter((b) => (filtre === "echu" ? b.echu > 0 : filtre === "plus_90" ? b.echu_plus_90 > 0 : filtre === "pause" ? b.statut !== "actif" : true));
  }, [tableau, filtre]);
  const choisi = choix && comptes.some((b) => b.compte_id === choix) ? choix : (comptes[0]?.compte_id ?? null);

  const fiche: Fiche | null = useMemo(() => {
    if (!choisi) return null;
    if (source === "exemple") {
      const f = fiches.find((x) => x.compte.id === choisi);
      return f ? { ...f, balance: balanceDe(f) } : null;
    }
    return reel?.fiches[choisi] ?? null;
  }, [source, fiches, reel, choisi]);

  useEffect(() => {
    if (source !== "reelle" || !choisi || !reel || reel.fiches[choisi]) return;
    let actif = true;
    const t = window.setTimeout(async () => {
      setChargeFiche(true);
      try {
        const f = await portes.chargerFiche(choisi);
        if (actif && f) setReel((prev) => (prev ? { ...prev, fiches: { ...prev.fiches, [choisi]: f } } : prev));
      } catch (e) {
        if (actif) setErreur(e instanceof Error ? e.message : "La fiche n'a pas pu être lue.");
      } finally {
        if (actif) setChargeFiche(false);
      }
    }, 0);
    return () => {
      actif = false;
      window.clearTimeout(t);
    };
  }, [source, choisi, reel]);

  /* ——— les gestes de la fiche : la porte en base réelle, la mémoire en exemple ——— */
  /* un geste fige le compte ouvert : la liste peut se réordonner, la fiche reste */
  const majFiche = (id: string, change: (f: Fiche) => Fiche) => {
    setChoix(id);
    setFiches((prev) => prev.map((f) => (f.compte.id === id ? change(f) : f)));
  };
  const actions: Actions | null = fiche
    ? {
        noterReglement: async (o) => {
          if (source === "reelle") {
            if (!reel?.client) throw new Error("Aucun compte rattaché à cette session.");
            setChoix(fiche.compte.id);
            const r = await portes.noterReglement({ client: reel.client.client_id, compte: fiche.compte.id, ...o });
            await relire();
            if (r.deja_note) return "Ce règlement était déjà noté : rien n'a été ajouté.";
            return r.a_imputer > 0 ? `Règlement noté ; ${montant(r.a_imputer)} restent à rapprocher.` : "Règlement noté et lettré. La relance prête de la facture est coupée.";
          }
          const cible = o.facture ?? fiche.pieces.find((p) => p.nature !== "devis" && p.nature !== "avoir" && p.statut === "ouverte" && Math.abs(p.montant_ttc - p.regle - p.avoirs_imputes - o.montant) < 0.005)?.id ?? null;
          majFiche(fiche.compte.id, (f) => ({
            ...f,
            pieces: f.pieces.map((p) => {
              if (p.id !== cible) return p;
              const regle = p.regle + o.montant;
              return { ...p, regle, statut: p.montant_ttc - regle - p.avoirs_imputes <= 0.005 ? "soldee" : p.statut };
            }),
            reglements: [...f.reglements, { id: crypto.randomUUID(), compte_id: f.compte.id, recu_le: o.date, montant: o.montant, mode: o.mode, reference: o.reference, libelle: null, statut: "actif", impute: cible ? o.montant : 0, a_imputer: cible ? 0 : o.montant }],
          }));
          if (cible) setRelancesLocales((prev) => prev.map((r) => (r.etat === "a_valider" && r.pieces.some((p) => p.facture_id === cible) ? { ...r, etat: "coupee", statut: "coupee", motif: "facture réglée" } : r)));
          return cible ? "Règlement noté et lettré (exemple) : la relance prête de la facture est coupée." : "Règlement noté (exemple) : il reste à rapprocher.";
        },
        changerStatut: async (statut, motif) => {
          if (source === "reelle") {
            setChoix(fiche.compte.id);
            const r = await portes.changerStatut(fiche.compte.id, statut, motif);
            await relire();
            return statut === "actif" ? "Le compte est repris : les relances reprennent au prochain matin." : `Compte mis en pause ; ${r.relances_coupees} relance(s) prête(s) coupée(s).`;
          }
          majFiche(fiche.compte.id, (f) => ({ ...f, compte: { ...f.compte, statut, statut_motif: motif, statut_le: new Date().toISOString() } }));
          if (statut !== "actif") setRelancesLocales((prev) => prev.map((r) => (r.compte_id === fiche.compte.id && r.etat === "a_valider" ? { ...r, etat: "coupee", statut: "coupee", motif: `compte en pause : ${motif}` } : r)));
          return statut === "actif" ? "Le compte est repris (exemple)." : "Compte mis en pause (exemple) : ses relances prêtes sont coupées.";
        },
        litige: async (facture, ouvrir, motif) => {
          if (source === "reelle") {
            setChoix(fiche.compte.id);
            const r = await portes.litige(facture, ouvrir, motif);
            await relire();
            return ouvrir ? `Facture en litige ; ${r.relances_coupees} relance(s) coupée(s).` : "Litige clos : la facture reprend son cycle.";
          }
          majFiche(fiche.compte.id, (f) => ({ ...f, pieces: f.pieces.map((p) => (p.id === facture ? { ...p, statut: ouvrir ? "litige" : "ouverte", statut_motif: motif } : p)) }));
          return ouvrir ? "Facture en litige (exemple) : elle sort du cycle." : "Litige clos (exemple).";
        },
      }
    : null;

  /* ——— préparer maintenant (base réelle) ——— */
  const [prepare, setPrepare] = useState(false);
  const preparer = async () => {
    if (!reel?.client) return;
    setPrepare(true);
    setErreur(null);
    try {
      const r = await portes.preparerMaintenant(reel.client.client_id);
      await relire();
      setFait(`${r.preparees} relance${r.preparees > 1 ? "s" : ""} écrite${r.preparees > 1 ? "s" : ""}${r.bloquees ? `, ${r.bloquees} arrêtée${r.bloquees > 1 ? "s" : ""} (voir leur motif)` : ""}. Elles attendent votre validation.`);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La préparation a échoué.");
    } finally {
      setPrepare(false);
    }
  };

  /* ——— rapprocher un règlement ——— */
  const [propositions, setPropositions] = useState<Record<string, Proposition[]>>({});
  const proposer = async (r: ReglementEtat) => {
    if (source === "reelle") {
      try {
        const p = await portes.chargerPropositions(r.id);
        setPropositions((prev) => ({ ...prev, [r.id]: p }));
      } catch (e) {
        setErreur(e instanceof Error ? e.message : "Les propositions n'ont pas pu être lues.");
      }
      return;
    }
    const p: Proposition[] = fiches
      .flatMap((f) => f.pieces.filter((x) => x.nature === "facture" && x.statut === "ouverte").map((x) => ({ f, x, reste: x.montant_ttc - x.regle - x.avoirs_imputes })))
      .filter(({ reste }) => Math.abs(reste - r.a_imputer) < 0.005)
      .map(({ f, x, reste }) => ({ raison: "montant_exact", factures: [{ id: x.id, numero: x.numero, compte: f.compte.nom, reste_du: reste, echeance: x.echeance }] }));
    setPropositions((prev) => ({ ...prev, [r.id]: p }));
  };
  const lettrer = async (r: ReglementEtat, factureId: string) => {
    if (source === "reelle") {
      try {
        await portes.lettrer(r.id, factureId);
        await relire();
        setFait("Règlement rapproché : la facture est lettrée et sa relance coupée si elle était prête.");
      } catch (e) {
        setErreur(e instanceof Error ? e.message : "Le lettrage a été refusé.");
      }
      return;
    }
    const f = fiches.find((x) => x.pieces.some((p) => p.id === factureId));
    if (!f) return;
    majFiche(f.compte.id, (y) => ({
      ...y,
      pieces: y.pieces.map((p) => (p.id === factureId ? { ...p, regle: p.regle + r.a_imputer, statut: p.montant_ttc - p.regle - r.a_imputer - p.avoirs_imputes <= 0.005 ? "soldee" : p.statut } : p)),
      reglements: [...y.reglements, { ...r, compte_id: y.compte.id, impute: r.a_imputer, a_imputer: 0 }],
    }));
    setSansCompte((prev) => prev.filter((x) => x.id !== r.id));
    setRelancesLocales((prev) => prev.map((x) => (x.etat === "a_valider" && x.pieces.some((p) => p.facture_id === factureId) ? { ...x, etat: "coupee", statut: "coupee", motif: "facture réglée" } : x)));
    setFait(`Règlement rapproché (exemple) : ${f.compte.nom} est lettré.`);
  };

  /* ——— déposer un export ——— */
  const [depot, setDepot] = useState(false);
  const [jeu, setJeu] = useState<Jeu>("factures");
  const [texte, setTexte] = useState("");
  const [nomFichier, setNomFichier] = useState("");
  const [complet, setComplet] = useState(true);
  const [envoiDepot, setEnvoiDepot] = useState(false);
  const [erreurDepot, setErreurDepot] = useState<string | null>(null);
  const lecture = useMemo(() => (texte.trim() ? lireDepot(texte, jeu) : null), [texte, jeu]);
  const ouvrirDepot = () => {
    setTexte("");
    setNomFichier("");
    setErreurDepot(null);
    setJeu("factures");
    setComplet(true);
    setDepot(true);
  };
  const lireFichier = async (fichier: File | undefined) => {
    if (!fichier) return;
    setErreurDepot(null);
    if (/\.xlsx?$/i.test(fichier.name)) {
      setErreurDepot("Un classeur Excel se dépose par la boîte de relevés de votre facturier (lecture côté serveur). Ici, enregistrez-le d'abord en CSV.");
      return;
    }
    setNomFichier(fichier.name);
    setTexte(await fichier.text());
  };
  const deposer = async () => {
    if (!lecture) return;
    setEnvoiDepot(true);
    setErreurDepot(null);
    try {
      if (source !== "reelle") {
        setFait(`Exemple : ${lecture.lignes.length} ligne${lecture.lignes.length > 1 ? "s" : ""} lue${lecture.lignes.length > 1 ? "s" : ""}, rien n'est envoyé. En base réelle, elles entrent par la porte cashd_importer.`);
        setDepot(false);
        return;
      }
      if (!reel?.client) throw new Error("Aucun compte rattaché à cette session.");
      const r = await portes.importer({ client: reel.client.client_id, jeu, lignes: lecture.lignes, complet: JEUX.find((x) => x.cle === jeu)?.complet ? complet : false, fichier: nomFichier || "collé dans l'espace" });
      await relire();
      setFait(
        `${r.lignes} ligne${r.lignes > 1 ? "s" : ""} lue${r.lignes > 1 ? "s" : ""} : ${r.creees} créée${r.creees > 1 ? "s" : ""}, ${r.modifiees} mise${r.modifiees > 1 ? "s" : ""} à jour` +
          (r.soldees_par_absence ? `, ${r.soldees_par_absence} soldée${r.soldees_par_absence > 1 ? "s" : ""} (absentes de l'export)` : "") +
          (r.lettrees ? `, ${r.lettrees} règlement${r.lettrees > 1 ? "s" : ""} lettré${r.lettrees > 1 ? "s" : ""}` : "") +
          (r.ecartees.length ? `. ${r.ecartees.length} écartée${r.ecartees.length > 1 ? "s" : ""} : ${r.ecartees.slice(0, 3).map((x) => `ligne ${x.ligne + 1} (${x.motif})`).join(", ")}${r.ecartees.length > 3 ? "…" : ""}` : "") +
          ".",
      );
      setDepot(false);
    } catch (e) {
      setErreurDepot(e instanceof Error ? e.message : "Le dépôt a été refusé.");
    } finally {
      setEnvoiDepot(false);
    }
  };

  const t = tableau?.totaux;
  const aValider = relances.filter((r) => r.etat === "a_valider" || r.etat === "non_reglee").length;
  const recentes = relances.slice(0, 12);
  const essai = tableau?.reglages?.mode !== "reel";
  const total = t ? Math.max(t.encours, 0.01) : 1;

  return (
    <>
      <div className="esp-tete" data-arrivee="">
        <div>
          <h1 className="esp-titre">Relances</h1>
          <p className="esp-sous">
            Qui vous doit de l&apos;argent, depuis quand, et où en est la relance. Chaque matin à 7 h, les relances sont écrites à partir de votre facturier relu ; aucune ne part sans votre validation.
          </p>
        </div>
        <div className="esp-item-haut">
          <button type="button" className="r-btn r-btn--noir" onClick={ouvrirDepot}><FileUp width={15} height={15} aria-hidden="true" /> Déposer un export</button>
          {source === "reelle" && reel?.client ? (
            <button type="button" className="r-btn" disabled={prepare} onClick={preparer}>{prepare ? <Loader variant="spin" /> : <PenLine width={15} height={15} aria-hidden="true" />} Écrire les relances du jour</button>
          ) : null}
          <Ruban source={source} />
        </div>
      </div>

      {fait ? <div style={{ marginBottom: 14 }}><Avis teinte="vert" role="status"><strong>C&apos;est fait.</strong> {fait}</Avis></div> : null}
      {erreur ? <div style={{ marginBottom: 14 }}><Avis teinte="rouge" role="alert"><strong>La base réelle a répondu autrement.</strong> {erreur}</Avis></div> : null}
      {source === "reelle" && reel && !reel.tableau?.reglages && !erreur ? (
        <div style={{ marginBottom: 14 }}><Avis teinte="bleu">CASHD n&apos;est pas encore installé pour votre organisation : Omega l&apos;installe en mode essai, puis vous déposez le premier export de votre facturier.</Avis></div>
      ) : null}

      {source === "reelle" && !reel ? (
        <div className="esp-carte"><Chargement texte="Lecture de l'encours…" /></div>
      ) : (
        <>
          <div className="esp-kpis" data-arrivee="">
            <button type="button" className="esp-kpi" data-teinte={t?.echu ? "rouge" : undefined} aria-pressed={filtre === "echu"} onClick={() => setFiltre(filtre === "echu" ? null : "echu")}>
              <span className="esp-kpi-etiquette">Encours échu</span>
              <span className="esp-kpi-valeur c2-kpi-montant">{montant(t?.echu ?? 0)}</span>
              <span className="esp-kpi-sous">{t?.comptes_en_retard ?? 0} compte{(t?.comptes_en_retard ?? 0) > 1 ? "s" : ""} en retard · encours total {montant(t?.encours ?? 0)}</span>
            </button>
            <button type="button" className="esp-kpi" data-teinte={t?.echu_plus_90 ? "rouge" : undefined} aria-pressed={filtre === "plus_90"} onClick={() => setFiltre(filtre === "plus_90" ? null : "plus_90")}>
              <span className="esp-kpi-etiquette">Plus de 90 jours</span>
              <span className="esp-kpi-valeur c2-kpi-montant">{montant(t?.echu_plus_90 ?? 0)}</span>
              <span className="esp-kpi-sous">le plus difficile à rattraper</span>
            </button>
            <a className="esp-kpi" href="#c2-relances" data-teinte={aValider ? "ambre" : undefined}>
              <span className="esp-kpi-etiquette">Relances à valider</span>
              <span className="esp-kpi-valeur">{aValider}</span>
              <span className="esp-kpi-sous">écrites ce matin, rien n&apos;est parti</span>
            </a>
            <button type="button" className="esp-kpi" data-teinte={(tableau?.comptes ?? []).some((b) => b.statut !== "actif") ? "ambre" : undefined} aria-pressed={filtre === "pause"} onClick={() => setFiltre(filtre === "pause" ? null : "pause")}>
              <span className="esp-kpi-etiquette">Hors cycle</span>
              <span className="esp-kpi-valeur">{(tableau?.comptes ?? []).filter((b) => b.statut !== "actif").length}</span>
              <span className="esp-kpi-sous">pause, litige, recouvrement</span>
            </button>
          </div>

          {t && t.encours > 0 ? (
            <section className="esp-carte c2-balance" aria-label="Balance âgée">
              <div className="esp-carte-tete">
                <h2 className="esp-carte-titre">Balance âgée</h2>
                <span className="esp-kpi-sous">
                  {tableau?.dernier_import ? `Facturier relu le ${dateHeure(tableau.dernier_import)}` : "Aucun export lu pour l'instant"}
                  {t.credits > 0 ? ` · ${montant(t.credits)} de crédits à déduire` : ""}
                </span>
              </div>
              <div className="esp-carte-corps">
                <div className="c2-barre" role="img" aria-label={TRANCHES.map((x) => `${x.libelle} : ${montant(t[x.cle])}`).join(", ")}>
                  {TRANCHES.map((x) => (t[x.cle] > 0 ? <span key={x.cle} className={`c2-segment ${x.teinte}`} style={{ width: `${(t[x.cle] / total) * 100}%` }} /> : null))}
                </div>
                <dl className="c2-legende">
                  {TRANCHES.map((x) => (
                    <div key={x.cle}>
                      <dt><span className={`c2-puce ${x.teinte}`} aria-hidden="true" />{x.libelle}</dt>
                      <dd>{montant(t[x.cle])}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </section>
          ) : null}

          {source === "exemple" || (reel?.tableau?.reglages && essai) ? (
            <div style={{ marginBottom: 14 }}>
              <Avis teinte="bleu">
                <strong>Mode essai.</strong> Les relances validées partent vers l&apos;adresse d&apos;essai d&apos;Omega, jamais chez vos clients, tant que le gérant n&apos;a pas basculé en réel.
              </Avis>
            </div>
          ) : null}

          <div className="esp-grille">
            <section className="esp-carte" aria-label="Débiteurs">
              <div className="esp-carte-tete">
                <h2 className="esp-carte-titre">{filtre === "echu" ? "Comptes en retard" : filtre === "plus_90" ? "Retards de plus de 90 jours" : filtre === "pause" ? "Comptes hors cycle" : "Débiteurs"}</h2>
                <span className="esp-kpi-sous">{comptes.length} compte{comptes.length > 1 ? "s" : ""}</span>
              </div>
              {comptes.length === 0 ? (
                <Vide titre="Personne ne vous doit rien ici">{filtre ? "Rien dans ce filtre." : "Déposez l'export des factures non soldées de votre facturier pour commencer."}</Vide>
              ) : (
                <ul className="esp-liste" aria-label="Débiteurs">
                  {comptes.map((b) => {
                    const s = STATUTS_COMPTE[b.statut];
                    return (
                      <li key={b.compte_id}>
                        <button
                          type="button"
                          className="esp-item"
                          aria-current={choisi === b.compte_id ? "true" : undefined}
                          onClick={() => {
                            setChoix(b.compte_id);
                            if (window.innerWidth < 1024) document.getElementById("c2-fiche")?.scrollIntoView({ behavior: "smooth", block: "start" });
                          }}
                        >
                          <span className="esp-item-haut">
                            <span style={{ fontWeight: 600 }}>{b.nom}</span>
                            {b.statut !== "actif" ? <Pastille teinte={s.teinte}>{s.libelle}</Pastille> : b.retard_max_jours > 60 ? <Pastille teinte="rouge">{b.retard_max_jours} j</Pastille> : b.retard_max_jours > 0 ? <Pastille teinte="ambre">{b.retard_max_jours} j</Pastille> : <Pastille teinte="vert">À échoir</Pastille>}
                            {b.depasse_plafond ? <Pastille teinte="rouge" contour>Plafond dépassé</Pastille> : null}
                          </span>
                          <span className="esp-item-montant">{montant(b.echu > 0 ? b.echu : b.encours)}</span>
                          <span className="esp-item-titre">{b.reference}{b.groupe ? ` · ${b.groupe}` : ""}</span>
                          <span className="esp-item-bas">
                            <span>{b.echu > 0 ? `${montant(b.echu)} échus sur ${montant(b.encours)}` : `${montant(b.encours)} à échoir`}</span>
                            <span>{b.factures_echues} facture{b.factures_echues > 1 ? "s" : ""} échue{b.factures_echues > 1 ? "s" : ""}</span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <section id="c2-fiche" className="esp-detail-mobile" aria-label="Fiche du compte">
              {fiche && actions ? (
                <FicheCompte key={`${source}:${fiche.compte.id}`} fiche={fiche} actions={actions} />
              ) : chargeFiche || (source === "reelle" && choisi) ? (
                <div className="esp-carte"><Chargement texte="Lecture du compte…" /></div>
              ) : (
                <div className="esp-carte"><Vide titre="Choisissez un compte">Ses factures, la relance de chacune et ses règlements s&apos;affichent ici.</Vide></div>
              )}
            </section>
          </div>

          <section id="c2-relances" className="esp-carte c2-section" aria-label="Relances">
            <div className="esp-carte-tete">
              <h2 className="esp-carte-titre">Relances écrites</h2>
              <Link className="esp-lien-bouton" href="/espace/validations">Ouvrir la file de validation</Link>
            </div>
            {recentes.length === 0 ? (
              <Vide titre="Aucune relance">Les relances s&apos;écrivent chaque matin à 7 h pour les comptes qui ont atteint un palier.</Vide>
            ) : (
              <ul className="c2-relances">
                {recentes.map((r) => {
                  const e = ETATS_RELANCE[r.etat] ?? ETATS_RELANCE.preparee;
                  return (
                    <li key={r.id}>
                      <details>
                        <summary>
                          <span className="esp-item-haut">
                            <strong>{r.compte}</strong>
                            <Pastille teinte={r.palier === "mise_en_demeure" ? "rouge" : "gris"} contour>{libellePalier(r.palier)}</Pastille>
                            <Pastille teinte={e.teinte}>{e.libelle}</Pastille>
                          </span>
                          <span className="c2-relance-ligne">
                            <span>{r.sujet ?? "—"}</span>
                            <span className="esp-num">{montant(r.montant)}</span>
                          </span>
                          <span className="c2-sous">
                            Écrite le {dateCourte(r.jour)}{r.destinataire_adresse ? ` pour ${r.destinataire_adresse}` : ""}
                            {r.envoye_le ? ` · partie le ${dateHeure(r.envoye_le)}` : ""}
                            {r.indemnites > 0 ? ` · indemnité ${montant(r.indemnites)}` : ""}
                            {r.penalites > 0 ? ` · pénalités ${montant(r.penalites)}` : ""}
                          </span>
                          {r.motif ? <span className="c2-sous c2-motif">{r.motif}</span> : null}
                        </summary>
                        {r.corps ? <pre className="c2-corps">{r.corps}</pre> : <p className="c2-sous">Le texte est dans la file de validation.</p>}
                      </details>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {(tableau?.a_imputer ?? []).length ? (
            <section className="esp-carte c2-section" aria-label="Règlements à rapprocher">
              <div className="esp-carte-tete">
                <h2 className="esp-carte-titre">Règlements à rapprocher</h2>
                <span className="esp-kpi-sous">la relance du compte concerné attend</span>
              </div>
              <ul className="c2-relances">
                {(tableau?.a_imputer ?? []).map((r) => (
                  <li key={r.id} className="c2-rapprocher">
                    <span className="c2-relance-ligne">
                      <span><strong>{montant(r.a_imputer)}</strong> reçus le {dateCourte(r.recu_le)} · {r.libelle ?? r.reference ?? "sans référence"}{r.compte ? ` · ${r.compte}` : ""}</span>
                      <button type="button" className="esp-lien-bouton" onClick={() => void proposer(r)}>Factures probables</button>
                    </span>
                    {propositions[r.id] ? (
                      propositions[r.id].length === 0 ? (
                        <span className="c2-sous">Aucune facture ouverte de ce montant : rapprochez-le depuis la fiche du compte.</span>
                      ) : (
                        <span className="c2-propositions">
                          {propositions[r.id].map((p, i) => (
                            <span key={i}>
                              {p.factures.map((x) => `${x.numero}${x.compte ? ` (${x.compte})` : ""} — ${montant(x.reste_du)}`).join(" + ")}
                              {p.factures.length === 1 ? (
                                <button type="button" className="r-btn" onClick={() => void lettrer(r, p.factures[0].id)}>Lettrer</button>
                              ) : null}
                            </span>
                          ))}
                        </span>
                      )
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}

      <Dialog open={depot} onOpenChange={(o) => !o && setDepot(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><FileUp width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>Déposer un export du facturier</DialogTitle>
            <DialogDescription>Un fichier CSV tel que votre logiciel l&apos;exporte : les colonnes sont reconnues par leur en-tête. Rien n&apos;est envoyé avant que vous ayez vu le compte des lignes.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              <label className="rv-libelle">Ce que contient le fichier
                <select className="rv-champ" value={jeu} onChange={(e) => setJeu(e.target.value as Jeu)}>
                  {JEUX.map((x) => <option key={x.cle} value={x.cle}>{x.libelle}</option>)}
                </select>
              </label>
              <p className="c2-sous">{JEUX.find((x) => x.cle === jeu)?.aide}</p>
              <label className="rv-libelle">Fichier CSV
                <input className="rv-champ" type="file" accept=".csv,.txt,.tsv,text/csv" onChange={(e) => void lireFichier(e.target.files?.[0])} />
              </label>
              <label className="rv-libelle">Ou collez les lignes (en-têtes compris)
                <textarea className="rv-champ" rows={4} value={texte} onChange={(e) => { setTexte(e.target.value); setNomFichier(""); }} placeholder="N° facture;Client;Date de facture;Échéance;Montant TTC;Reste dû" />
              </label>
              {JEUX.find((x) => x.cle === jeu)?.complet ? (
                <label className="c2-coche">
                  <input type="checkbox" checked={complet} onChange={(e) => setComplet(e.target.checked)} />
                  <span>Ce fichier liste toutes les pièces encore ouvertes : celles qui n&apos;y sont plus sont soldées.</span>
                </label>
              ) : null}
              {lecture ? (
                lecture.manque.length || lecture.sansClient ? (
                  <Avis teinte="ambre">
                    Colonnes introuvables : {[...lecture.manque.map((k) => LIBELLES_CHAMPS[k] ?? k), ...(lecture.sansClient ? ["client (code ou nom)"] : [])].join(", ")}. Vérifiez la première ligne du fichier.
                  </Avis>
                ) : (
                  <Avis teinte="vert" role="status">
                    {lecture.lignes.length} ligne{lecture.lignes.length > 1 ? "s" : ""} lue{lecture.lignes.length > 1 ? "s" : ""} ; colonnes reconnues : {lecture.reconnues.map((x) => x.entete).join(", ")}.
                    {lecture.ignorees.length ? ` Ignorées : ${lecture.ignorees.join(", ")}.` : ""}
                  </Avis>
                )
              ) : null}
              {erreurDepot ? <Avis teinte="rouge" role="alert">{erreurDepot}</Avis> : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={!lecture || !!lecture.manque.length || lecture.sansClient || !lecture.lignes.length || envoiDepot} onClick={deposer}>
              {envoiDepot ? <Loader variant="spin" /> : null} Déposer {lecture?.lignes.length ? `${lecture.lignes.length} ligne${lecture.lignes.length > 1 ? "s" : ""}` : ""}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
