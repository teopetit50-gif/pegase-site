"use client";

/* ══════════════════════════════════════════════════════════════════════
   /espace/daliro — les chantiers (05/10/2026, session B6)

   En haut, quatre compteurs qui filtrent : bloqués, avenants à signer,
   passages à confirmer, chantiers ouverts (sur le quota de la formule). À
   gauche la liste des chantiers (étape, maître d'ouvrage, prochain
   passage) ; à droite le tableau du chantier ouvert (ChantierVue).

   Deux sources : l'exemple (exemples.ts, modifié en mémoire par les
   actions pour que l'enchaînement se voie) ou la base réelle (portes.ts :
   btp_liste_chantiers() d'abord, btp_tableau_chantier() à l'ouverture).
   ══════════════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useMemo, useState } from "react";
import { HardHat, Plus } from "lucide-react";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import { createClient } from "@/lib/supabase/client";
import { EXEMPLE_CLIENT_ID } from "../exemples/socle";
import { useSource } from "../source";
import { useTempsReel } from "../tempsReel";
import { Avis, Chargement, Pastille, Ruban, Vide } from "../ui";
import { dateCourte } from "../format";
import { CONFIRMATIONS, FAMILLES, STATUTS_CHANTIER, type Famille } from "./etats";
import { TABLEAUX_EXEMPLE } from "./exemples";
import { chargerListe, chargerTableau, monClient } from "./portes";
import type { Chantier, Tableau } from "./types";
import ChantierVue from "./ChantierVue";

type Reel = { liste: Chantier[]; tableaux: Record<string, Tableau>; client: { client_id: string; user_id: string; role: string } | null };

export function famille(c: Chantier): Famille | null {
  if ((c.nb_bloquants ?? 0) > 0) return "bloque";
  if ((c.nb_avenants_en_cours ?? 0) > 0) return "a_signer";
  const conf = c.prochain_passage?.confirmation;
  if (conf === "demandee" || conf === "sans_reponse" || conf === "declinee") return "a_confirmer";
  if (c.statut === "ouvert" || c.statut === "suspendu") return "ouvert";
  return null;
}

/* la liste d'exemple se recalcule depuis les tableaux (en mémoire) */
function listeDepuis(tableaux: Record<string, Tableau>): Chantier[] {
  return Object.values(tableaux).map((t) => ({
    ...t.chantier,
    nb_lots: t.lots.length,
    nb_bloquants: t.controles.filter((k) => k.gravite === "bloquant").length,
    nb_attention: t.controles.filter((k) => k.gravite === "attention").length,
    marche_verifie: t.marches.some((m) => m.statut === "verifie"),
    nb_avenants_en_cours: t.avenants.filter((a) => a.statut === "brouillon" || a.statut === "soumis").length,
    nb_avenants_signes: t.avenants.filter((a) => a.statut === "signe").length,
    prochain_passage: (() => {
      const p = [...t.passages].filter((x) => x.statut === "prevu").sort((a, b) => a.debut.localeCompare(b.debut))[0];
      return p ? { id: p.id, debut: p.debut, fin: p.fin, tache: p.tache, confirmation: p.confirmation, intervenant_type: p.intervenant_type, intervenant_nom: p.intervenant_nom ?? null } : null;
    })(),
  }));
}

const MO_TYPES = [
  { cle: "professionnel", libelle: "Professionnel (promoteur, SCI, entreprise)" },
  { cle: "particulier", libelle: "Particulier" },
  { cle: "acheteur_public", libelle: "Acheteur public (commune, bailleur, État)" },
];
const PLACES = [
  { cle: "titulaire", libelle: "Titulaire du marché" },
  { cle: "cotraitant", libelle: "Cotraitant (groupement)" },
  { cle: "sous_traitant", libelle: "Sous-traitant d'une entreprise principale" },
];

export default function EcranDaliro() {
  const { source } = useSource();
  const [local, setLocal] = useState<Record<string, Tableau>>(TABLEAUX_EXEMPLE);
  const [reel, setReel] = useState<Reel | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [filtre, setFiltre] = useState<Famille | null>(null);
  const [choix, setChoix] = useState<string | null>(null);
  const [chargeTableau, setChargeTableau] = useState(false);

  const charger = useCallback(async () => {
    await Promise.resolve();
    setErreur(null);
    setReel(null);
    try {
      const [liste, client] = await Promise.all([chargerListe(), monClient().catch(() => null)]);
      setReel({ liste, tableaux: {}, client });
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base n'a pas répondu.");
      setReel({ liste: [], tableaux: {}, client: null });
    }
  }, []);

  useEffect(() => {
    if (source !== "reelle") return;
    const t = window.setTimeout(() => void charger(), 0);
    return () => window.clearTimeout(t);
  }, [source, charger]);

  const relire = useCallback(async () => {
    try {
      const liste = await chargerListe();
      setReel((prev) => (prev ? { ...prev, liste, tableaux: {} } : prev));
    } catch {
      /* la prochaine lecture à la main dira l'erreur */
    }
  }, []);
  useTempsReel(["btp_chantiers", "btp_marches", "btp_passages", "btp_avenants", "btp_factures_chantier"], source === "reelle", relire);

  const liste: Chantier[] = useMemo(() => (source === "exemple" ? listeDepuis(local) : (reel?.liste ?? [])), [source, local, reel]);
  const ordre: Record<Famille, number> = { bloque: 0, a_signer: 1, a_confirmer: 2, ouvert: 3 };
  const visibles = useMemo(() => {
    const l = liste.filter((c) => !filtre || famille(c) === filtre);
    return [...l].sort((a, b) => {
      const fa = famille(a) ? ordre[famille(a)!] : 4;
      const fb = famille(b) ? ordre[famille(b)!] : 4;
      if (fa !== fb) return fa - fb;
      return a.nom.localeCompare(b.nom, "fr");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `ordre` est une constante
  }, [liste, filtre]);

  const compteurs = useMemo(() => {
    const c: Record<Famille, number> = { bloque: 0, a_signer: 0, a_confirmer: 0, ouvert: 0 };
    for (const ch of liste) {
      if ((ch.nb_bloquants ?? 0) > 0) c.bloque++;
      if ((ch.nb_avenants_en_cours ?? 0) > 0) c.a_signer++;
      const conf = ch.prochain_passage?.confirmation;
      if (conf === "demandee" || conf === "sans_reponse" || conf === "declinee") c.a_confirmer++;
      if (ch.statut === "ouvert" || ch.statut === "suspendu") c.ouvert++;
    }
    return c;
  }, [liste]);

  const choisi = choix && visibles.some((c) => c.id === choix) ? choix : (visibles[0]?.id ?? null);
  const apercu = visibles.find((c) => c.id === choisi) ?? null;

  const tableau: Tableau | null = useMemo(() => {
    if (!choisi) return null;
    if (source === "exemple") return local[choisi] ?? null;
    return reel?.tableaux[choisi] ?? null;
  }, [source, local, reel, choisi]);

  useEffect(() => {
    if (source !== "reelle" || !apercu || !reel || reel.tableaux[apercu.id]) return;
    let actif = true;
    const t = window.setTimeout(async () => {
      setChargeTableau(true);
      try {
        const tb = await chargerTableau(apercu.id);
        if (actif && tb) setReel((prev) => (prev ? { ...prev, tableaux: { ...prev.tableaux, [tb.chantier.id]: tb } } : prev));
        if (actif && !tb) setErreur("Ce chantier n'est pas visible avec ce compte.");
      } catch (e) {
        if (actif) setErreur(e instanceof Error ? e.message : "Le chantier n'a pas pu être lu.");
      } finally {
        if (actif) setChargeTableau(false);
      }
    }, 0);
    return () => {
      actif = false;
      window.clearTimeout(t);
    };
  }, [source, apercu, reel]);

  const remplacerLocal = useCallback((t: Tableau) => setLocal((prev) => ({ ...prev, [t.chantier.id]: t })), []);
  const relireReel = useCallback(async (id: string) => {
    const [liste, tb] = await Promise.all([chargerListe(), chargerTableau(id)]);
    setReel((prev) => (prev ? { ...prev, liste, tableaux: tb ? { ...prev.tableaux, [id]: tb } : prev.tableaux } : prev));
  }, []);

  /* ——— nouveau chantier (INSERT direct, politique du bureau) ——— */
  const [nouveau, setNouveau] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [erreurNouveau, setErreurNouveau] = useState<string | null>(null);
  const [fait, setFait] = useState<string | null>(null);
  const [f, setF] = useState({ nom: "", reference: "", adresse: "", code_postal: "", commune: "", maitre_ouvrage_type: "professionnel", place_client: "titulaire", maitre_ouvrage_id: "" });
  const tiersMo = (source === "exemple" ? Object.values(local)[0]?.tiers ?? [] : Object.values(reel?.tableaux ?? {})[0]?.tiers ?? []).filter((t) => t.roles.includes("maitre_ouvrage"));
  const ouvrirNouveau = () => {
    setErreurNouveau(null);
    setF({ nom: "", reference: "", adresse: "", code_postal: "", commune: "", maitre_ouvrage_type: "professionnel", place_client: "titulaire", maitre_ouvrage_id: "" });
    setNouveau(true);
  };
  const pret = f.nom.trim().length > 0 && /^[0-9]{5}$/.test(f.code_postal) && f.commune.trim().length > 0;
  const creer = async () => {
    setEnvoi(true);
    setErreurNouveau(null);
    try {
      if (source === "reelle") {
        const c = reel?.client ?? (await monClient());
        if (!c) throw new Error("Aucun compte rattaché à cette session.");
        const supabase = createClient();
        const { data, error } = await supabase
          .from("btp_chantiers")
          .insert({ client_id: c.client_id, nom: f.nom.trim(), reference: f.reference.trim() || null, adresse: f.adresse.trim() || null, code_postal: f.code_postal, commune: f.commune.trim(), maitre_ouvrage_type: f.maitre_ouvrage_type, place_client: f.place_client, maitre_ouvrage_id: f.maitre_ouvrage_id || null })
          .select("id")
          .single();
        if (error) throw new Error(error.message);
        await charger();
        setChoix((data as { id: string }).id);
      } else {
        const id = crypto.randomUUID();
        const mo = tiersMo.find((t) => t.id === f.maitre_ouvrage_id);
        const modele = Object.values(local)[0];
        const chantier: Chantier = {
          id, client_id: EXEMPLE_CLIENT_ID, entite_id: `${id}-e`, nom: f.nom.trim(), reference: f.reference.trim() || null, adresse: f.adresse.trim() || null, code_postal: f.code_postal, commune: f.commune.trim(),
          departement: f.code_postal.slice(0, 2), territoire: "metropole", zone_tva: "metropole", regime_tva: f.place_client === "sous_traitant" ? "autoliquidation" : "normal",
          maitre_ouvrage_type: f.maitre_ouvrage_type as Chantier["maitre_ouvrage_type"], nature_marche: f.maitre_ouvrage_type === "acheteur_public" ? "public" : "prive", place_client: f.place_client as Chantier["place_client"],
          maitre_ouvrage_id: mo?.id ?? null, maitre_ouvrage_nom: mo?.nom ?? null, maitre_oeuvre_id: null, donneur_ordre_id: null, conducteur_id: null, statut: "preparation", date_debut: null, date_fin_prevue: null, date_reception: null,
          ouvert_le: null, cree_le: new Date().toISOString(), etape: { etape: 0, etapes: 0, lot_id: null, lot_libelle: null, avancement_pct: 0 },
        };
        const controles = [
          { chantier_id: id, objet_type: "btp_chantiers", objet_id: id, code: "chantier_sans_lots", gravite: "attention" as const, message: `${chantier.nom} : aucun lot ; le planning et les passages ne peuvent pas s'y rattacher.` },
          ...(mo ? [] : [{ chantier_id: id, objet_type: "btp_chantiers", objet_id: id, code: "chantier_sans_maitre_ouvrage", gravite: "bloquant" as const, message: `${chantier.nom} : aucun maître d'ouvrage désigné ; personne ne peut signer ses avenants.` }]),
          { chantier_id: id, objet_type: "btp_chantiers", objet_id: id, code: "chantier_sans_coordonnees", gravite: "info" as const, message: `${chantier.nom} : adresse non localisée ; pas de météo, ni de rattachement par la position.` },
        ];
        setLocal((prev) => ({ ...prev, [id]: { ...modele, chantier, lots: [], marches: [], controles, passages: [], dependances: [], acceptations: [], avenants: [], factures: [], debourse: [] } }));
        setChoix(id);
      }
      setFait(`${f.nom.trim()} est créé, en préparation : posez ses lots, son marché, puis ouvrez-le.`);
      setNouveau(false);
    } catch (e) {
      setErreurNouveau(e instanceof Error ? e.message : "La création a échoué.");
    } finally {
      setEnvoi(false);
    }
  };

  const quota = (source === "exemple" ? Object.values(local)[0]?.reglages?.quota_chantiers : Object.values(reel?.tableaux ?? {})[0]?.reglages?.quota_chantiers) ?? null;

  return (
    <>
      <div className="esp-tete" data-arrivee="">
        <div>
          <h1 className="esp-titre">Chantiers</h1>
          <p className="esp-sous">
            Le marché vérifié ligne à ligne, les travaux supplémentaires chiffrés sur vos prix et signés avant exécution, les passages confirmés à J-2, les factures rattachées à leurs lots. Chaque action passe par une porte et reste au journal.
          </p>
        </div>
        <div className="esp-item-haut">
          <button type="button" className="r-btn r-btn--noir" onClick={ouvrirNouveau}><Plus width={15} height={15} aria-hidden="true" /> Nouveau chantier</button>
          <Ruban source={source} />
        </div>
      </div>

      {fait ? <div style={{ marginBottom: 14 }}><Avis teinte="vert" role="status"><strong>C&apos;est fait.</strong> {fait}</Avis></div> : null}

      <div className="esp-kpis" data-arrivee="">
        {FAMILLES.map((fa) => (
          <button key={fa.cle} type="button" className="esp-kpi" data-teinte={compteurs[fa.cle] ? fa.teinte : undefined} aria-pressed={filtre === fa.cle} onClick={() => setFiltre(filtre === fa.cle ? null : fa.cle)}>
            <span className="esp-kpi-etiquette">{fa.libelle}</span>
            <span className="esp-kpi-valeur">{fa.cle === "ouvert" && quota ? `${compteurs.ouvert} / ${quota}` : compteurs[fa.cle]}</span>
            <span className="esp-kpi-sous">{fa.sous}</span>
          </button>
        ))}
      </div>

      {erreur ? (
        <div style={{ marginBottom: 14 }}>
          <Avis teinte="rouge" role="alert"><strong>La base réelle n&apos;a pas répondu.</strong> {erreur}</Avis>
        </div>
      ) : null}

      <div className="esp-grille esp-grille--large">
        <section className="esp-carte" aria-label="Chantiers">
          <div className="esp-carte-tete">
            <h2 className="esp-carte-titre">{filtre ? FAMILLES.find((x) => x.cle === filtre)?.libelle : "Tous les chantiers"}</h2>
            <span className="esp-kpi-sous">{visibles.length} chantier{visibles.length > 1 ? "s" : ""}</span>
          </div>
          {source === "reelle" && !reel ? (
            <Chargement texte="Lecture des chantiers…" />
          ) : visibles.length === 0 ? (
            <Vide titre="Aucun chantier">{filtre ? "Rien dans cette famille." : "Créez votre premier chantier : son nom, son adresse, son maître d'ouvrage."}</Vide>
          ) : (
            <ul className="esp-liste" aria-label="Chantiers">
              {visibles.map((c) => {
                const s = STATUTS_CHANTIER[c.statut];
                const p = c.prochain_passage;
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      aria-current={choisi === c.id ? "true" : undefined}
                      className="esp-item"
                      onClick={() => {
                        setChoix(c.id);
                        if (window.innerWidth < 1024) document.getElementById("esp-dossier")?.scrollIntoView({ behavior: "smooth", block: "start" });
                      }}
                    >
                      <span className="esp-item-haut">
                        <span style={{ fontWeight: 600 }}>{c.nom}</span>
                        <Pastille teinte={s.teinte}>{s.libelle}</Pastille>
                        {c.nb_bloquants ? <Pastille teinte="rouge">{c.nb_bloquants} bloquant{c.nb_bloquants > 1 ? "s" : ""}</Pastille> : null}
                        {c.nb_avenants_en_cours ? <Pastille teinte="ambre">{c.nb_avenants_en_cours} avenant{c.nb_avenants_en_cours > 1 ? "s" : ""} en cours</Pastille> : null}
                      </span>
                      <span className="esp-item-montant">{c.etape && c.etape.etapes ? `${c.etape.avancement_pct} %` : ""}</span>
                      <span className="esp-item-titre">
                        {c.commune} ({c.code_postal}){c.maitre_ouvrage_nom ? ` — ${c.maitre_ouvrage_nom}` : ""}
                        {c.etape?.lot_libelle ? ` · ${c.etape.lot_libelle}` : ""}
                      </span>
                      <span className="esp-item-bas">
                        <span>{c.nb_lots ?? 0} lot{(c.nb_lots ?? 0) > 1 ? "s" : ""}{c.marche_verifie ? " · marché vérifié" : " · marché à vérifier"}</span>
                        {p ? <span>Prochain passage le {dateCourte(p.debut)}{p.intervenant_nom ? ` — ${p.intervenant_nom}` : ""} · {CONFIRMATIONS[p.confirmation].libelle.toLowerCase()}</span> : <span>Aucun passage prévu</span>}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section id="esp-dossier" className="esp-detail-mobile" aria-label="Tableau du chantier">
          {tableau ? (
            <ChantierVue key={tableau.chantier.id} tableau={tableau} source={source} onLocal={remplacerLocal} relire={() => relireReel(tableau.chantier.id)} />
          ) : chargeTableau || (source === "reelle" && apercu) ? (
            <div className="esp-carte"><Chargement texte="Lecture du chantier…" /></div>
          ) : (
            <div className="esp-carte"><Vide titre="Choisissez un chantier">Le marché, le planning, les avenants et les factures s&apos;affichent ici.</Vide></div>
          )}
        </section>
      </div>

      <Dialog open={nouveau} onOpenChange={(o) => !o && setNouveau(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><HardHat width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>Nouveau chantier</DialogTitle>
            <DialogDescription>Le chantier naît en préparation. Le département, le territoire et le régime de TVA se déduisent du code postal ; une entité « site » lui est ouverte.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              <label className="rv-libelle">Nom <span className="esp-obligatoire">(obligatoire)</span>
                <input className="rv-champ" value={f.nom} onChange={(e) => setF({ ...f, nom: e.target.value })} placeholder="Résidence Les Tilleuls" />
              </label>
              <div className="esp-form-ligne">
                <label className="rv-libelle">Référence interne
                  <input className="rv-champ" value={f.reference} onChange={(e) => setF({ ...f, reference: e.target.value })} placeholder="TIL-2026" />
                </label>
                <label className="rv-libelle">Code postal <span className="esp-obligatoire">(obligatoire)</span>
                  <input className="rv-champ" inputMode="numeric" value={f.code_postal} onChange={(e) => setF({ ...f, code_postal: e.target.value.replace(/\D/g, "").slice(0, 5) })} placeholder="69100" />
                </label>
              </div>
              <label className="rv-libelle">Commune <span className="esp-obligatoire">(obligatoire)</span>
                <input className="rv-champ" value={f.commune} onChange={(e) => setF({ ...f, commune: e.target.value })} placeholder="Villeurbanne" />
              </label>
              <label className="rv-libelle">Adresse
                <input className="rv-champ" value={f.adresse} onChange={(e) => setF({ ...f, adresse: e.target.value })} placeholder="14 rue des Tilleuls" />
              </label>
              <div className="esp-form-ligne">
                <label className="rv-libelle">Maître d&apos;ouvrage
                  <select className="rv-champ" value={f.maitre_ouvrage_type} onChange={(e) => setF({ ...f, maitre_ouvrage_type: e.target.value })}>
                    {MO_TYPES.map((o) => <option key={o.cle} value={o.cle}>{o.libelle}</option>)}
                  </select>
                </label>
                <label className="rv-libelle">Notre place
                  <select className="rv-champ" value={f.place_client} onChange={(e) => setF({ ...f, place_client: e.target.value })}>
                    {PLACES.map((o) => <option key={o.cle} value={o.cle}>{o.libelle}</option>)}
                  </select>
                </label>
              </div>
              <label className="rv-libelle">Qui signe (annuaire, rôle maître d&apos;ouvrage)
                <select className="rv-champ" value={f.maitre_ouvrage_id} onChange={(e) => setF({ ...f, maitre_ouvrage_id: e.target.value })}>
                  <option value="">À désigner plus tard (le chantier ne pourra pas s&apos;ouvrir sans lui)</option>
                  {tiersMo.map((t) => <option key={t.id} value={t.id}>{t.nom}</option>)}
                </select>
              </label>
              {erreurNouveau ? <Avis teinte="rouge" role="alert">{erreurNouveau}</Avis> : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={!pret || envoi} onClick={creer}>{envoi ? <Loader variant="spin" /> : null} Créer le chantier</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
