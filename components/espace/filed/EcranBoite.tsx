"use client";

/* ══════════════════════════════════════════════════════════════════════
   /espace/filed/boite — la boîte de réception de FILED (06/10/2026, A3)

   Les courriels reçus sur la boîte du client (public.receptions, canal
   email, module filed), du plus récent au plus ancien : expéditeur, objet,
   pièces jointes, statut. Le détail montre le texte du message (jamais son
   HTML), chaque pièce jointe avec son lien et, quand elle est devenue un
   document FILED, sa référence. Un seul geste : marquer lu, écarter ou
   remettre en nouveau (reception_marquer, socle 19am).
   Avec portee="toutes" : /espace/demandes, toutes les boîtes et tous les
   canaux (sans le module tiroma), filtre par boîte = par enseigne.
   ══════════════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BookOpen, Check, Copy, FileText, Inbox, Paperclip, RotateCcw, Wallet, X } from "lucide-react";
import { DOSSIERS_EXEMPLE } from "../exemples/filed";
import { ilYa } from "../exemples/socle";
import { useSource } from "../source";
import { useTempsReel } from "../tempsReel";
import { Avis, Chargement, Def, Pastille, Ruban, Vide } from "../ui";
import { dateHeure } from "../format";
import { CANAUX, STATUTS_RECEPTION, champsDe, chargerBoite, marquerReception, type Marque, documentDe, lienPiece, piecesIgnorees, taille, type Portee, type Reception, type StatutReception, type VueBoite } from "./receptions";
import { libelleModule } from "../format";

const BOITE_EXEMPLE = "factures@atelier-bertin.recu.omegaai.fr";

/* l'exemple : un courriel par document FILED reçu par courriel, plus ce
   qu'une vraie boîte reçoit aussi (une relance sans pièce, une publicité,
   une pièce écartée) */
function vueExemple(portee: Portee): VueBoite {
  const documents = DOSSIERS_EXEMPLE.filter((d) => d.document.source === "courriel" && d.document.expediteur).map((d) => ({
    id: d.document.id,
    reference: d.document.reference,
    nom_fichier: d.document.nom_fichier,
    expediteur: d.document.expediteur,
    recu_le: d.document.recu_le,
    etat: d.document.etat,
  }));
  const statutDe = (etat: string): StatutReception => (etat === "en_lecture" ? "nouvelle" : etat === "a_traiter" || etat === "a_classer" ? "lue" : "traitee");
  const nomDe = (adresse: string) => {
    const d = DOSSIERS_EXEMPLE.find((x) => x.document.expediteur === adresse);
    return d?.fournisseur?.nom ?? null;
  };
  const receptions: Reception[] = documents.map((d, i) => ({
    id: 100 + i,
    entite_id: null,
    module: "filed",
    canal: "email" as const,
    boite: BOITE_EXEMPLE,
    identifiant_externe: `<ex-${i}@exemple>`,
    de_adresse: d.expediteur,
    de_nom: nomDe(d.expediteur!),
    sujet: `Facture ${d.nom_fichier.replace(/\.pdf$/i, "")}`,
    corps: `Bonjour,\n\nVeuillez trouver ci-joint notre facture ${d.nom_fichier.replace(/\.pdf$/i, "")}.\n\nCordialement,\n${nomDe(d.expediteur!) ?? ""}`,
    pieces: [{ nom: d.nom_fichier, mime: "application/pdf", taille: 84_000 + i * 7_300, chemin: null }],
    detail: {},
    statut: statutDe(d.etat),
    recu_le: d.recu_le,
  }));
  receptions.push(
    {
      id: 90, entite_id: null, module: "filed", canal: "email", boite: BOITE_EXEMPLE, identifiant_externe: "<ex-relance@exemple>", de_adresse: "compta@papeterie-durand.fr", de_nom: "Papeterie Durand",
      sujet: "Relance : avez-vous bien reçu notre facture PD-2026-1187 ?", corps: "Bonjour,\n\nPouvez-vous nous confirmer la bonne réception de notre facture PD-2026-1187 ?\n\nMerci.", pieces: [], detail: {}, statut: "lue", recu_le: ilYa(1, 15),
    },
    {
      id: 91, entite_id: null, module: "filed", canal: "email", boite: BOITE_EXEMPLE, identifiant_externe: "<ex-pub@exemple>", de_adresse: "promo@fournitures-discount.example", de_nom: "Fournitures Discount",
      sujet: "−40 % sur vos ramettes ce mois-ci", corps: "Profitez de nos offres de rentrée.", pieces: [], detail: {}, statut: "indesirable", recu_le: ilYa(2, 7),
    },
    {
      id: 92, entite_id: null, module: "filed", canal: "email", boite: BOITE_EXEMPLE, identifiant_externe: "<ex-lourd@exemple>", de_adresse: "contact@verreries-lyonnaises.fr", de_nom: "Verreries lyonnaises",
      sujet: "Facture et photos de la livraison", corps: "Bonjour,\n\nLa facture d'octobre suit ; les photos de la livraison sont jointes.\n\nBien à vous.", pieces: [],
      detail: { pieces_ignorees: [{ nom: "photos-livraison.zip", raison: "type de fichier non accepté (archive)" }] }, statut: "nouvelle", recu_le: ilYa(0, 8),
    },
  );
  if (portee === "toutes") {
    /* les demandes des sites vitrines et des messageries, par enseigne (boîte) */
    receptions.push(
      {
        id: 80, entite_id: null, module: "reput", canal: "formulaire", boite: "site:atelier-bertin.fr", identifiant_externe: "ex-form-80", de_adresse: "m.lefevre@exemple.fr", de_nom: "Marion Lefèvre",
        sujet: "Demande de devis : agencement d'une boutique", corps: "Bonjour, nous ouvrons une boutique de 60 m² à Lyon 2e et cherchons un agencement complet (comptoir, étagères). Pouvez-vous nous rappeler ?",
        pieces: [], detail: { telephone: "06 12 34 56 78", ville: "Lyon", budget: "15 000 à 20 000 €" }, statut: "nouvelle", recu_le: ilYa(0, 9),
      },
      {
        id: 81, entite_id: null, module: "reput", canal: "whatsapp", boite: "+33 4 78 00 00 00", identifiant_externe: "ex-wa-81", de_adresse: "+33 6 98 76 54 32", de_nom: "Karim B.",
        sujet: null, corps: "Bonjour, vous êtes ouverts samedi matin ? Je voudrais passer voir les échantillons de bois.", pieces: [], detail: {}, statut: "lue", recu_le: ilYa(1, 18),
      },
      {
        id: 82, entite_id: null, module: "reput", canal: "formulaire", boite: "site:menuiserie-bertin.fr", identifiant_externe: "ex-form-82", de_adresse: "contact@hotel-saone.example", de_nom: "Hôtel de la Saône",
        sujet: "Avis : très satisfaits de la pose", corps: "Pose des portes terminée dans les délais, équipe soigneuse. Merci !", pieces: [], detail: { note: "5 / 5" }, statut: "traitee", recu_le: ilYa(3, 11),
      },
    );
  }
  receptions.sort((a, b) => new Date(b.recu_le).getTime() - new Date(a.recu_le).getTime());
  return { receptions, documents, boites: portee === "toutes" ? Array.from(new Set(receptions.map((r) => r.boite))).sort() : [BOITE_EXEMPLE] };
}

type Famille = "nouvelle" | "lue" | "traitee" | "ecartee";
const FAMILLES: { cle: Famille; libelle: string; sous: string; teinte: "bleu" | "gris" | "vert" | "rouge" }[] = [
  { cle: "nouvelle", libelle: "Nouveaux", sous: "arrivés, pas encore lus par FILED", teinte: "bleu" },
  { cle: "lue", libelle: "Lus", sous: "pièces lues, en cours dans FILED", teinte: "gris" },
  { cle: "traitee", libelle: "Traités", sous: "documents intégrés ou classés", teinte: "vert" },
  { cle: "ecartee", libelle: "Écartés", sous: "ignorés ou indésirables", teinte: "rouge" },
];
const SOUS_TOUTES: Record<Famille, string> = { nouvelle: "pas encore ouvertes", lue: "ouvertes, sans suite encore", traitee: "réponse faite ou classée", ecartee: "ignorées ou indésirables" };
const familleDe = (s: StatutReception): Famille => (s === "ignoree" || s === "indesirable" ? "ecartee" : s);

export default function EcranBoite({ portee = "filed" }: { portee?: Portee }) {
  const toutes = portee === "toutes";
  const { source } = useSource();
  const [exemple, setExemple] = useState<VueBoite>(() => vueExemple(portee));
  const [marquage, setMarquage] = useState<number | null>(null);
  const [erreurMarque, setErreurMarque] = useState<string | null>(null);
  const [boiteChoisie, setBoiteChoisie] = useState("");
  const [reel, setReel] = useState<VueBoite | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [filtre, setFiltre] = useState<Famille | null>(null);
  const [recherche, setRecherche] = useState("");
  const [choix, setChoix] = useState<number | null>(null);
  const [copie, setCopie] = useState(false);
  const [erreurPiece, setErreurPiece] = useState<string | null>(null);

  const charger = useCallback(async () => {
    await Promise.resolve();
    setErreur(null);
    try {
      setReel(await chargerBoite(portee));
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base n'a pas répondu.");
      setReel({ receptions: [], documents: [], boites: [] });
    }
  }, [portee]);
  useEffect(() => {
    if (source !== "reelle") return;
    const t = window.setTimeout(() => void charger(), 0);
    return () => window.clearTimeout(t);
  }, [source, charger]);
  const direct = useTempsReel(["receptions", "filed_documents"], source === "reelle", charger);

  const vue = source === "exemple" ? exemple : reel;
  const compteurs = useMemo(() => {
    const c: Record<Famille, number> = { nouvelle: 0, lue: 0, traitee: 0, ecartee: 0 };
    for (const r of vue?.receptions ?? []) if (!boiteChoisie || r.boite.toLowerCase() === boiteChoisie) c[familleDe(r.statut)]++;
    return c;
  }, [vue, boiteChoisie]);
  const visibles = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    return (vue?.receptions ?? [])
      .filter((r) => !boiteChoisie || r.boite.toLowerCase() === boiteChoisie)
      .filter((r) => !filtre || familleDe(r.statut) === filtre)
      .filter((r) => !q || [r.de_adresse, r.de_nom, r.sujet, ...r.pieces.map((p) => p.nom)].some((x) => x && x.toLowerCase().includes(q)));
  }, [vue, filtre, recherche, boiteChoisie]);
  const choisi = choix !== null && visibles.some((r) => r.id === choix) ? choix : (visibles[0]?.id ?? null);
  const r = visibles.find((x) => x.id === choisi) ?? null;
  const boite = vue?.boites[0] ?? null;

  const copier = async () => {
    if (!boite) return;
    try {
      await navigator.clipboard.writeText(boite);
      setCopie(true);
      window.setTimeout(() => setCopie(false), 2000);
    } catch {
      setCopie(false);
    }
  };
  const marquer = async (id: number, m: Marque) => {
    setErreurMarque(null);
    const cible: StatutReception = m === "ecartee" ? "ignoree" : m;
    if (source === "exemple") {
      setExemple((v) => ({ ...v, receptions: v.receptions.map((x) => (x.id === id ? { ...x, statut: cible } : x)) }));
      return;
    }
    setMarquage(id);
    try {
      const statut = await marquerReception(id, m);
      setReel((v) => (v ? { ...v, receptions: v.receptions.map((x) => (x.id === id ? { ...x, statut } : x)) } : v));
    } catch (e) {
      setErreurMarque(e instanceof Error ? e.message : "La base n'a pas répondu.");
    } finally {
      setMarquage(null);
    }
  };
  const ouvrirPiece = async (chemin: string | null) => {
    setErreurPiece(null);
    if (source === "exemple" || !chemin) {
      setErreurPiece(source === "exemple" ? "Données d'exemple : la pièce n'existe pas." : "La réception ne dit pas où la pièce est rangée.");
      return;
    }
    try {
      window.open(await lienPiece(chemin), "_blank", "noopener");
    } catch (e) {
      setErreurPiece(e instanceof Error ? e.message : "Lien indisponible.");
    }
  };

  return (
    <>
      <div className="esp-tete" data-arrivee="">
        <div>
          <h1 className="esp-titre">{toutes ? "Demandes reçues" : "Boîte de réception"}</h1>
          <p className="esp-sous">
            {toutes
              ? "Tout ce qui arrive à vos boîtes : formulaires de vos sites, courriels, WhatsApp. Demandes de devis, questions, avis, par enseigne. Les réponses de patients restent dans l'écran du cabinet."
              : "Les courriels reçus sur la boîte de FILED : qui écrit, l'objet, les pièces jointes, et ce que FILED en a fait. Chaque facture jointe devient un document numéroté."}
          </p>
        </div>
        <div className="esp-item-haut">
          {direct !== "inactif" ? (
            <span className="esp-direct" data-etat={direct} role="status" title={direct === "en_direct" ? "Les courriels arrivent sans recharger la page." : direct === "coupe" ? "Votre réseau refuse le canal temps réel : la vue se relit seule toutes les 30 secondes." : "Connexion au temps réel…"}>
              <span className="esp-direct-point" aria-hidden="true" />
              {direct === "en_direct" ? "En direct" : direct === "coupe" ? "Relue toutes les 30 s" : "Connexion…"}
            </span>
          ) : null}
          {toutes ? (
            <Link href="/espace/filed/boite" className="r-btn r-btn--fil"><Inbox width={15} height={15} aria-hidden="true" /> Boîte de FILED</Link>
          ) : (
            <>
              <Link href="/espace/filed" className="r-btn r-btn--fil"><FileText width={15} height={15} aria-hidden="true" /> Documents reçus</Link>
              <Link href="/espace/filed/a-payer" className="r-btn r-btn--fil"><Wallet width={15} height={15} aria-hidden="true" /> À payer</Link>
              <Link href="/espace/filed/comptabilite" className="r-btn r-btn--fil"><BookOpen width={15} height={15} aria-hidden="true" /> Comptabilité</Link>
              <Link href="/espace/demandes" className="r-btn r-btn--fil"><Inbox width={15} height={15} aria-hidden="true" /> Toutes les demandes</Link>
            </>
          )}
          <Ruban source={source} />
        </div>
      </div>

      {toutes ? (
        vue && vue.boites.length > 1 ? (
          <div style={{ marginBottom: 14, maxWidth: 420 }}>
            <label className="rv-libelle">Enseigne (boîte de réception)
            <select className="rv-champ" value={boiteChoisie} onChange={(e) => { setBoiteChoisie(e.target.value); setChoix(null); }}>
              <option value="">Toutes les boîtes ({vue.boites.length})</option>
              {vue.boites.map((b) => <option key={b} value={b.toLowerCase()}>{b.startsWith("site:") ? `Site ${b.slice(5)}` : b}</option>)}
            </select>
            </label>
          </div>
        ) : null
      ) : (
        <div style={{ marginBottom: 14 }}>
        {boite ? (
          <Avis teinte="bleu">
            Vos fournisseurs envoient leurs factures à <strong className="esp-mono">{boite}</strong>.{" "}
            <button type="button" className="esp-lien-bouton" onClick={() => void copier()} aria-label={`Copier l'adresse ${boite}`}>
              <Copy width={12} height={12} aria-hidden="true" /> {copie ? "Adresse copiée" : "Copier l'adresse"}
            </button>
            {vue && vue.boites.length > 1 ? <> Autres boîtes : {vue.boites.slice(1).join(", ")}.</> : null}
          </Avis>
        ) : source === "reelle" && reel ? (
          <Avis teinte="gris">Aucune boîte FILED visible pour votre compte : son adresse est lisible du gérant, et apparaît ici dès le premier courriel reçu.</Avis>
        ) : null}
      </div>
      )}

      <div className="esp-kpis" data-arrivee="">
        {FAMILLES.map((x) => ({ ...x, sous: toutes ? SOUS_TOUTES[x.cle] : x.sous })).map((x) => (
          <button key={x.cle} type="button" className="esp-kpi" data-teinte={compteurs[x.cle] && x.cle !== "traitee" && x.cle !== "lue" ? x.teinte : undefined} aria-pressed={filtre === x.cle} onClick={() => setFiltre(filtre === x.cle ? null : x.cle)}>
            <span className="esp-kpi-etiquette">{x.libelle}</span>
            <span className="esp-kpi-valeur">{compteurs[x.cle]}</span>
            <span className="esp-kpi-sous">{x.sous}</span>
          </button>
        ))}
      </div>

      {erreur ? (
        <div style={{ marginBottom: 14 }}>
          <Avis teinte="rouge" role="alert"><strong>La base réelle n&apos;a pas répondu.</strong> {erreur}</Avis>
        </div>
      ) : null}

      <div className="esp-grille esp-grille--large">
        <section className="esp-carte" aria-label={toutes ? "Demandes reçues" : "Courriels reçus"}>
          <div className="esp-carte-tete">
            <h2 className="esp-carte-titre">{filtre ? FAMILLES.find((x) => x.cle === filtre)?.libelle : toutes ? "Toutes les demandes" : "Tous les courriels"}</h2>
            <span className="esp-kpi-sous">{visibles.length} {toutes ? "demande" : "courriel"}{visibles.length > 1 ? "s" : ""}</span>
          </div>
          <div style={{ padding: "12px 16px 0" }}>
            <input type="search" className="rv-champ" placeholder="Chercher un expéditeur, un objet, une pièce…" value={recherche} onChange={(e) => setRecherche(e.target.value)} aria-label={toutes ? "Chercher une demande" : "Chercher un courriel"} />
          </div>
          {source === "reelle" && !reel ? (
            <Chargement texte="Lecture de la boîte…" />
          ) : visibles.length === 0 ? (
            <Vide titre={toutes ? "Aucune demande" : "Aucun courriel"}>{filtre || recherche ? "Rien ne correspond." : toutes ? "Les demandes reçues par vos sites, vos boîtes et votre WhatsApp apparaissent ici dès leur arrivée." : "Les courriels envoyés à la boîte de FILED apparaissent ici dès leur arrivée."}</Vide>
          ) : (
            <ul className="esp-liste" aria-label={toutes ? "Demandes" : "Courriels"}>
              {visibles.map((x) => {
                const s = STATUTS_RECEPTION[x.statut] ?? STATUTS_RECEPTION.lue;
                return (
                  <li key={x.id}>
                    <button
                      type="button"
                      aria-current={choisi === x.id ? "true" : undefined}
                      className="esp-item"
                      onClick={() => {
                        setChoix(x.id);
                        setErreurPiece(null);
                        setErreurMarque(null);
                        if (window.innerWidth < 1024) document.getElementById("esp-courriel")?.scrollIntoView({ behavior: "smooth", block: "start" });
                      }}
                    >
                      <span className="esp-item-haut">
                        <Pastille teinte={s.teinte}>{s.libelle}</Pastille>
                        {toutes ? <Pastille contour>{CANAUX[x.canal] ?? x.canal}</Pastille> : null}
                        {toutes && x.module ? <span className="esp-kpi-sous">{libelleModule(x.module)}</span> : null}
                        {x.pieces.length ? <Pastille contour><Paperclip width={11} height={11} aria-hidden="true" /> {x.pieces.length} pièce{x.pieces.length > 1 ? "s" : ""}</Pastille> : null}
                        {piecesIgnorees(x).length ? <Pastille teinte="ambre">pièce écartée</Pastille> : null}
                      </span>
                      <span className="esp-item-titre">{x.sujet || (x.corps ? x.corps.slice(0, 80) : "(sans objet)")}</span>
                      <span className="esp-item-bas">
                        <span>{x.de_nom || x.de_adresse || "Expéditeur inconnu"}</span>
                        <span>{dateHeure(x.recu_le)}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section id="esp-courriel" className="esp-detail-mobile" aria-label={toutes ? "La demande" : "Le courriel"}>
          {r ? (
            <div className="esp-carte">
              <div className="esp-carte-tete">
                <h2 className="esp-carte-titre">{r.sujet || (toutes ? `Message ${CANAUX[r.canal] ?? r.canal}` : "(sans objet)")}</h2>
                <Pastille teinte={(STATUTS_RECEPTION[r.statut] ?? STATUTS_RECEPTION.lue).teinte}>{(STATUTS_RECEPTION[r.statut] ?? STATUTS_RECEPTION.lue).libelle}</Pastille>
              </div>
              <div className="esp-carte-corps" style={{ display: "grid", gap: 16 }}>
                <dl className="esp-def esp-def--trois">
                  <Def etiquette="De">{r.de_nom ? <>{r.de_nom} · </> : null}<span className="esp-mono">{r.de_adresse ?? "—"}</span></Def>
                  <Def etiquette="À"><span className="esp-mono">{r.boite}</span></Def>
                  <Def etiquette="Reçu le">{dateHeure(r.recu_le)}</Def>
                  {toutes ? <Def etiquette="Canal">{CANAUX[r.canal] ?? r.canal}{r.module ? ` · ${libelleModule(r.module)}` : ""}</Def> : null}
                </dl>
                {r.statut === "traitee" || r.statut === "indesirable" ? null : (
                  <div className="esp-actions">
                    {r.statut === "nouvelle" ? (
                      <button type="button" className="r-btn r-btn--fil r-btn--petit" disabled={marquage === r.id} onClick={() => void marquer(r.id, "lue")}><Check width={13} height={13} aria-hidden="true" /> Marquer comme lu</button>
                    ) : null}
                    {r.statut !== "ignoree" ? (
                      <button type="button" className="r-btn r-btn--fil r-btn--petit" disabled={marquage === r.id} onClick={() => void marquer(r.id, "ecartee")}><X width={13} height={13} aria-hidden="true" /> Écarter</button>
                    ) : null}
                    {r.statut !== "nouvelle" ? (
                      <button type="button" className="r-btn r-btn--fil r-btn--petit" disabled={marquage === r.id} onClick={() => void marquer(r.id, "nouvelle")}><RotateCcw width={13} height={13} aria-hidden="true" /> Remettre en nouveau</button>
                    ) : null}
                  </div>
                )}
                {erreurMarque ? <Avis teinte="rouge" role="alert"><strong>Refusé par la base.</strong> {erreurMarque}</Avis> : null}
                {champsDe(r).length ? (
                  <div>
                    <div className="esp-section-titre">{r.canal === "formulaire" ? "Champs du formulaire" : "Informations jointes"}</div>
                    <dl className="esp-def">
                      {champsDe(r).map(([k, v]) => <Def key={k} etiquette={k}>{v}</Def>)}
                    </dl>
                  </div>
                ) : null}

                <div>
                  <div className="esp-section-titre">Pièces jointes</div>
                  {r.pieces.length ? (
                    <ul className="esp-fil">
                      {r.pieces.map((p, i) => {
                        const d = documentDe(r, p, vue?.documents ?? []);
                        return (
                          <li key={`${p.nom}-${i}`}>
                            <span className="esp-fil-point" data-teinte={d ? "vert" : "bleu"} />
                            <div>
                              <div className="esp-fil-texte esp-item-haut">
                                <button type="button" className="esp-lien-bouton" onClick={() => void ouvrirPiece(p.chemin)} aria-label={`Ouvrir la pièce ${p.nom}`}>{p.nom}</button>
                                {p.taille ? <span className="esp-kpi-sous">{taille(p.taille)}</span> : null}
                              </div>
                              <div className="esp-fil-meta">
                                {r.module !== "filed" ? null : d ? (
                                  <>Devenue le document <Link href={`/espace/filed?objet=document:${encodeURIComponent(d.id)}`} className="esp-mono">{d.reference ?? "FILED"}</Link></>
                                ) : r.statut === "nouvelle" ? "En attente de lecture par FILED" : "Pas de document FILED retrouvé pour cette pièce"}
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="esp-kpi-sous" style={{ margin: 0 }}>{toutes ? "Aucune pièce jointe." : "Aucune pièce jointe : rien à lire pour FILED."}</p>
                  )}
                  {piecesIgnorees(r).map((p) => (
                    <div key={p.nom} style={{ marginTop: 8 }}>
                      <Avis teinte="ambre"><strong>{p.nom}</strong> n&apos;a pas été gardée{p.raison ? ` : ${p.raison}` : ""}. Demandez à l&apos;expéditeur de la renvoyer en PDF.</Avis>
                    </div>
                  ))}
                  {erreurPiece ? <div style={{ marginTop: 8 }}><Avis teinte="rouge" role="alert">{erreurPiece}</Avis></div> : null}
                </div>

                <div>
                  <div className="esp-section-titre">Message</div>
                  {r.corps?.trim() ? (
                    <div className="esp-courriel-texte" tabIndex={0} role="region" aria-label="Texte du message">{r.corps.trim()}</div>
                  ) : (
                    <p className="esp-kpi-sous" style={{ margin: 0 }}>Message sans texte.</p>
                  )}
                </div>
              </div>
            </div>
          ) : source === "reelle" && !reel ? (
            <div className="esp-carte"><Chargement texte="Lecture…" /></div>
          ) : (
            <div className="esp-carte"><Vide titre={toutes ? "Choisissez une demande" : "Choisissez un courriel"}>Son expéditeur, ses pièces jointes et son texte s&apos;affichent ici.</Vide></div>
          )}
        </section>
      </div>
    </>
  );
}
