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
import Link from "next/link";
import { Building2, Upload, Wallet } from "lucide-react";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import { COMMANDES_EXEMPLE, DOSSIERS_EXEMPLE, FOURNISSEURS_EXEMPLE, LIGNES_COMMANDE_EXEMPLE, MOTIFS_EXEMPLE } from "../exemples/filed";
import { ENTITES, EXEMPLE_CLIENT_ID, EXEMPLE_MOI, SIEGE, nomEntite } from "../exemples/socle";
import { useSource } from "../source";
import { useTempsReel } from "../tempsReel";
import { Avis, Chargement, Pastille, Ruban, Vide } from "../ui";
import { dateCourte, montant } from "../format";
import type { Commande, DossierFiled, Fournisseur, LigneCommande, MotifRefus } from "../types";
import { FAMILLES, NATURES, etatDocument, famille, statutFacture, type Famille } from "./etats";
import { chargerCommandes, chargerDossier, chargerFournisseurs, chargerListe, deposerDocument, monClient, type Apercu } from "./portes";
import DossierVue from "./DossierVue";
import { lireCible, trouverCible, type Cible } from "./lien";

type Reel = { apercus: Apercu[]; motifs: MotifRefus[]; fournisseurs: Fournisseur[]; commandes: Commande[]; lignesCommande: LigneCommande[]; dossiers: Record<string, DossierFiled>; moi: string | null };

export default function EcranFiled() {
  const { source } = useSource();
  const [local, setLocal] = useState<DossierFiled[]>(DOSSIERS_EXEMPLE);
  const [reel, setReel] = useState<Reel | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [filtre, setFiltre] = useState<Famille | null>(null);
  const [choix, setChoix] = useState<string | null>(null);
  const [chargeDossier, setChargeDossier] = useState(false);
  /* /espace/filed?objet=facture:<id> — le dossier qu'une demande de validation désigne */
  const [cible, setCible] = useState<Cible | null>(null);
  const [cibleIntrouvable, setCibleIntrouvable] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setCible(lireCible(window.location.search)), 0);
    return () => window.clearTimeout(t);
  }, []);

  const charger = useCallback(async () => {
    await Promise.resolve();
    setErreur(null);
    setReel(null);
    try {
      const [liste, fournisseurs, cmd, compte] = await Promise.all([
        chargerListe(),
        chargerFournisseurs().catch(() => [] as Fournisseur[]),
        chargerCommandes().catch(() => ({ commandes: [] as Commande[], lignes: [] as LigneCommande[] })),
        monClient().catch(() => null),
      ]);
      setReel({ ...liste, fournisseurs, commandes: cmd.commandes, lignesCommande: cmd.lignes, dossiers: {}, moi: compte?.user_id ?? null });
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base n'a pas répondu.");
      setReel({ apercus: [], motifs: [], fournisseurs: [], commandes: [], lignesCommande: [], dossiers: {}, moi: null });
    }
  }, []);

  useEffect(() => {
    if (source !== "reelle") return;
    const t = window.setTimeout(() => void charger(), 0);
    return () => window.clearTimeout(t);
  }, [source, charger]);

  /* un document reçu, une facture qui change d'état, un contrôle rejoué :
     la liste se relit, et le dossier ouvert avec elle (son cache est vidé) */
  const relire = useCallback(async () => {
    try {
      const liste = await chargerListe();
      setReel((prev) => (prev ? { ...prev, apercus: liste.apercus, motifs: liste.motifs, dossiers: {} } : prev));
    } catch {
      /* la prochaine lecture à la main dira l'erreur */
    }
  }, []);
  useTempsReel(["filed_documents", "filed_factures", "filed_controles", "filed_historique", "filed_fournisseurs"], source === "reelle", relire);

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

  /* la cible de l'URL s'ouvre dès que la liste qui la porte est là ; tant
     qu'elle n'est pas trouvée, elle reste (la source peut passer de
     l'exemple à la base réelle juste après le chargement) */
  useEffect(() => {
    if (!cible || (source === "reelle" && !reel)) return;
    const t = window.setTimeout(() => {
      const a = trouverCible(apercus, cible);
      setCibleIntrouvable(!a);
      if (!a) return;
      setFiltre(null);
      setChoix(a.document.id);
      setCible(null);
      if (window.matchMedia("(max-width: 1023px)").matches) document.getElementById("esp-dossier")?.scrollIntoView({ block: "start" });
    }, 0);
    return () => window.clearTimeout(t);
  }, [cible, source, reel, apercus]);

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
  const commandes = source === "exemple" ? COMMANDES_EXEMPLE : (reel?.commandes ?? []);
  const lignesCommande = source === "exemple" ? LIGNES_COMMANDE_EXEMPLE : (reel?.lignesCommande ?? []);

  /* ——— déposer un document depuis l'espace ——— */
  const [depot, setDepot] = useState(false);
  const [fichier, setFichier] = useState<File | null>(null);
  const [entiteDepot, setEntiteDepot] = useState<string>("");
  const [envoiDepot, setEnvoiDepot] = useState(false);
  const [erreurDepot, setErreurDepot] = useState<string | null>(null);
  const [faitDepot, setFaitDepot] = useState<string | null>(null);
  const [entitesReelles, setEntitesReelles] = useState<{ id: string; nom: string }[]>([]);
  const ouvrirDepot = async () => {
    setErreurDepot(null);
    setFichier(null);
    setEntiteDepot(source === "exemple" ? SIEGE : "");
    setDepot(true);
    if (source === "reelle" && !entitesReelles.length) {
      const c = await monClient().catch(() => null);
      if (c) {
        setEntitesReelles(c.entites);
        setEntiteDepot(c.entites[0]?.id ?? "");
      }
    }
  };
  const soumettreDepot = async () => {
    if (!fichier) return;
    setEnvoiDepot(true);
    setErreurDepot(null);
    try {
      let message = `${fichier.name} est déposé : il reçoit son numéro et part en lecture.`;
      if (source === "reelle") {
        const c = await monClient();
        if (!c) throw new Error("Aucun compte rattaché à cette session.");
        const depose = await deposerDocument({ client_id: c.client_id, entite_id: entiteDepot || null, fichier, expediteur: c.email });
        if (depose.doublon_de) message = `${fichier.name} était déjà reçu : il est marqué doublon${depose.reference ? ` (${depose.reference})` : ""}.`;
        else if (depose.reference) message = `${fichier.name} est déposé sous le numéro ${depose.reference} et part en lecture.`;
        await charger();
        setChoix(depose.document_id);
      } else {
        await new Promise((r) => setTimeout(r, 400));
        const id = crypto.randomUUID();
        const quand = new Date().toISOString();
        const numero = Math.max(0, ...local.map((d) => Number(d.document.reference.slice(-6)) || 0)) + 1;
        setLocal((prev) => [
          {
            document: { id, client_id: EXEMPLE_CLIENT_ID, entite_id: entiteDepot || null, reference: `R${new Date().getFullYear()}-${String(numero).padStart(6, "0")}`, piece_id: `${id}-p`, source: "depot", expediteur: null, nom_fichier: fichier.name, recu_le: quand, etat: "en_lecture", nature: null, nature_source: null, doublon_de: null, motif: null, lu_le: null, traite_le: null },
            facture: null, lignes: [], tva: [], controles: [], levees: [], fournisseur: null, ibans: [], appariements: [], rapprochement: null,
            piece: { id: `${id}-p`, nom_fichier: fichier.name, mime: fichier.type || "application/octet-stream", chemin: `${EXEMPLE_CLIENT_ID}/filed_document/${id}/${fichier.name}`, nb_pages: null, statut: "recue", type_piece: null, methode: null },
            pages: [], valeurs: [],
            historique: [{ id: `depot-${quand}`, etape: "reception", message: "Déposé depuis l'espace par vous.", detail: {}, acteur_type: "utilisateur", acteur_libelle: "Vous", survenu_le: quand }, { id: `lecture-${quand}`, etape: "lecture", message: "Lecture en cours…", detail: {}, acteur_type: "systeme", acteur_libelle: null, survenu_le: quand }],
          },
          ...prev,
        ]);
        setChoix(id);
      }
      setFaitDepot(message);
      setDepot(false);
    } catch (e) {
      setErreurDepot(e instanceof Error ? e.message : "Le dépôt a échoué.");
    } finally {
      setEnvoiDepot(false);
    }
  };
  const entitesDepot = source === "exemple" ? ENTITES : entitesReelles;

  /* en mode exemple, une correction remplace le dossier en mémoire ; en
     base réelle, on relit le dossier après la porte */
  /* après une action, le dossier ouvert le reste, même s'il change de rang
     dans la liste (une facture débloquée passe derrière les bloquées) */
  const remplacerLocal = useCallback((d: DossierFiled) => {
    setLocal((prev) => prev.map((x) => (x.document.id === d.document.id ? d : x)));
    setChoix(d.document.id);
  }, []);
  const relireReel = useCallback(async (a: Apercu) => {
    setChoix(a.document.id);
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
        <div className="esp-item-haut">
          <Link href="/espace/filed/a-payer" className="r-btn r-btn--fil"><Wallet width={15} height={15} aria-hidden="true" /> À payer</Link>
          <Link href="/espace/filed/fournisseurs" className="r-btn r-btn--fil"><Building2 width={15} height={15} aria-hidden="true" /> Fournisseurs</Link>
          <button type="button" className="r-btn r-btn--noir" onClick={ouvrirDepot}><Upload width={15} height={15} aria-hidden="true" /> Déposer un document</button>
          <Ruban source={source} />
        </div>
      </div>

      {faitDepot ? <div style={{ marginBottom: 14 }}><Avis teinte="vert" role="status"><strong>C&apos;est fait.</strong> {faitDepot}</Avis></div> : null}

      <div className="esp-kpis" data-arrivee="">
        {FAMILLES.map((f) => (
          <button key={f.cle} type="button" className="esp-kpi" data-teinte={compteurs[f.cle] ? f.teinte : undefined} aria-pressed={filtre === f.cle} onClick={() => setFiltre(filtre === f.cle ? null : f.cle)}>
            <span className="esp-kpi-etiquette">{f.libelle}</span>
            <span className="esp-kpi-valeur">{compteurs[f.cle]}</span>
            <span className="esp-kpi-sous">{f.sous}</span>
          </button>
        ))}
      </div>

      {cibleIntrouvable ? (
        <div style={{ marginBottom: 14 }}>
          <Avis teinte="ambre" role="status"><strong>Document introuvable.</strong> Le document que désigne la demande n&apos;est pas dans cette liste{source === "exemple" ? " (vous regardez les données d'exemple)" : ""}.</Avis>
        </div>
      ) : null}

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
                const e = etatDocument(a.document.etat);
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
                        {a.facture ? <Pastille teinte={statutFacture(a.facture.statut).teinte}>{statutFacture(a.facture.statut).libelle}</Pastille> : <Pastille teinte={e.teinte}>{e.libelle}</Pastille>}
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
              commandes={commandes}
              lignesCommande={lignesCommande}
              onLocal={remplacerLocal}
              relire={() => (apercu ? relireReel(apercu) : Promise.resolve())}
              moi={source === "exemple" ? EXEMPLE_MOI : (reel?.moi ?? null)}
            />
          ) : chargeDossier || (source === "reelle" && apercu) ? (
            <div className="esp-carte"><Chargement texte="Lecture du dossier…" /></div>
          ) : (
            <div className="esp-carte"><Vide titre="Choisissez un document">Le dossier, les contrôles et la pièce s&apos;affichent ici.</Vide></div>
          )}
        </section>
      </div>

      <Dialog open={depot} onOpenChange={(o) => !o && setDepot(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><Upload width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>Déposer un document</DialogTitle>
            <DialogDescription>Le fichier reçoit un numéro, est lu par le lecteur, puis contrôlé comme tout document reçu.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              <div>
                <span className="rv-libelle">Fichier <span className="esp-obligatoire">(obligatoire)</span></span>
                <div className="esp-fichier">
                  <input id="esp-depot-fichier" type="file" className="esp-fichier-natif" accept=".pdf,.png,.jpg,.jpeg,.xml,.csv,.xlsx" onChange={(e) => setFichier(e.target.files?.[0] ?? null)} />
                  <label htmlFor="esp-depot-fichier" className="r-btn r-btn--fil r-btn--petit" style={{ cursor: "pointer" }}>{fichier ? "Changer de fichier" : "Choisir un fichier"}</label>
                  <span className="esp-kpi-sous">{fichier ? `${fichier.name} · ${Math.round(fichier.size / 1024)} Ko` : "PDF, image, Factur-X (XML), CSV ou tableur."}</span>
                </div>
              </div>
              {entitesDepot.length > 1 ? (
                <label className="rv-libelle">Entité
                  <select className="rv-champ" value={entiteDepot} onChange={(e) => setEntiteDepot(e.target.value)}>
                    {entitesDepot.map((en) => <option key={en.id} value={en.id}>{en.nom}</option>)}
                  </select>
                </label>
              ) : null}
              {erreurDepot ? <Avis teinte="rouge" role="alert">{erreurDepot}</Avis> : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={!fichier || envoiDepot} onClick={soumettreDepot}>{envoiDepot ? <Loader variant="spin" /> : null} Déposer</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
