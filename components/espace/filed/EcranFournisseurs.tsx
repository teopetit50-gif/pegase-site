"use client";

/* ══════════════════════════════════════════════════════════════════════
   /espace/filed/fournisseurs — les fournisseurs de FILED (06/10/2026)

   Jusqu'ici on ne voyait un fournisseur qu'à travers une facture. Ici :
   tous, ceux à confirmer et les bloqués en tête, avec leur identité
   (« Vérifiée le … par VIES »), leurs IBAN et leurs factures. Les gestes
   sont ceux de la fiche du dossier, par les mêmes portes :
     filed_confirmer_fournisseur (jamais le déposant de la pièce d'origine),
     identite_demander (revérifier), filed_attester_identite,
     filed_bloquer_fournisseur, filed_proposer_iban.
   Un IBAN proposé se valide dans la file « À valider » (demande
   filed.valider_iban) : la vue le dit et y renvoie.
   ══════════════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { BadgeCheck, Ban, FileText, Landmark, Unlock, UserCheck, Wallet } from "lucide-react";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import { DOSSIERS_EXEMPLE } from "../exemples/filed";
import { EXEMPLE_MOI } from "../exemples/socle";
import { useSource } from "../source";
import { useTempsReel } from "../tempsReel";
import { Avis, Chargement, Pastille, Ruban, Vide } from "../ui";
import { dateCourte, masquerIban, montant } from "../format";
import type { Fournisseur, IbanFournisseur } from "../types";
import { statutFacture } from "./etats";
import FicheFournisseur, { STATUTS_FOURNISSEUR, identiteDe, registreDe } from "./FicheFournisseur";
import { attesterIdentite, bloquerFournisseur, chargerVueFournisseurs, confirmerFournisseur, demanderVerification, monClient, proposerIban, type VueFournisseurs } from "./portes";

type Famille = "a_confirmer" | "bloque" | "actif" | "refuse";
const RANG: Record<Famille, number> = { a_confirmer: 0, bloque: 1, actif: 2, refuse: 3 };
const FAMILLES: { cle: Famille; libelle: string; sous: string; teinte: "ambre" | "rouge" | "vert" | "gris" }[] = [
  { cle: "a_confirmer", libelle: "À confirmer", sous: "fournisseurs nouveaux, factures bloquées", teinte: "ambre" },
  { cle: "bloque", libelle: "Bloqués", sous: "aucun paiement tant que le blocage tient", teinte: "rouge" },
  { cle: "actif", libelle: "Actifs", sous: "confirmés, payables", teinte: "vert" },
  { cle: "refuse", libelle: "Refusés", sous: "écartés par une décision", teinte: "gris" },
];

type Form = { type: "confirmer" } | { type: "attester" } | { type: "bloquer"; bloquer: boolean } | { type: "iban" } | null;

/* l'exemple : les fournisseurs des dossiers d'exemple (un même fournisseur
   porte un identifiant par dossier : on les réunit par leur code), leurs
   IBAN et leurs factures */
export function vueExemple(): VueFournisseurs {
  const fournisseurs = new Map<string, Fournisseur>();
  const parCode = new Map<string, string>();
  const ibans = new Map<string, IbanFournisseur>();
  const deposants: Record<string, string | null> = {};
  const factures: VueFournisseurs["factures"] = [];
  for (const d of DOSSIERS_EXEMPLE) {
    if (!d.fournisseur) continue;
    const id = parCode.get(d.fournisseur.code ?? d.fournisseur.id) ?? d.fournisseur.id;
    parCode.set(d.fournisseur.code ?? d.fournisseur.id, id);
    if (!fournisseurs.has(id)) fournisseurs.set(id, { ...d.fournisseur, id });
    for (const i of d.ibans) if (![...ibans.values()].some((x) => x.fournisseur_id === id && x.iban_masque === i.iban_masque)) ibans.set(i.id, { ...i, fournisseur_id: id });
    if (d.origine_deposee_par !== undefined) deposants[id] = d.origine_deposee_par ?? null;
    if (d.facture) factures.push({ id: d.facture.id, numero: d.facture.numero, statut: d.facture.statut, nature: d.facture.nature, montant_ttc: d.facture.montant_ttc, net_a_payer: d.facture.net_a_payer, devise: d.facture.devise, date_emission: d.facture.date_emission, echeance_lue: d.facture.echeance_lue, iban: d.facture.iban, fournisseur_id: id, reference: d.document.reference });
  }
  return { fournisseurs: Array.from(fournisseurs.values()), ibans: Array.from(ibans.values()), factures, deposants };
}

const maintenant = () => new Date().toISOString();

export default function EcranFournisseurs() {
  const { source } = useSource();
  const [local, setLocal] = useState<VueFournisseurs>(vueExemple);
  const [reel, setReel] = useState<VueFournisseurs | null>(null);
  const [moiReel, setMoiReel] = useState<{ user_id: string; client_id: string } | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [filtre, setFiltre] = useState<Famille | null>(null);
  const [recherche, setRecherche] = useState("");
  const [choix, setChoix] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(null);
  const [motif, setMotif] = useState("");
  const [iban, setIban] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreurAction, setErreurAction] = useState<string | null>(null);
  const [fait, setFait] = useState<string | null>(null);

  const charger = useCallback(async () => {
    await Promise.resolve();
    setErreur(null);
    try {
      const [vue, compte] = await Promise.all([chargerVueFournisseurs(), monClient().catch(() => null)]);
      setReel(vue);
      setMoiReel(compte ? { user_id: compte.user_id, client_id: compte.client_id } : null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base n'a pas répondu.");
      setReel({ fournisseurs: [], ibans: [], factures: [], deposants: {} });
    }
  }, []);

  useEffect(() => {
    if (source !== "reelle") return;
    const t = window.setTimeout(() => void charger(), 0);
    return () => window.clearTimeout(t);
  }, [source, charger]);
  /* filed_fournisseurs (confirmation, blocage, verdict d'identité) est publiée depuis le 06/10 ;
     filed_historique aussi, et reçoit une ligne à chaque IBAN proposé, confirmation ou attestation
     — c'est elle qui fait apparaître un nouvel IBAN tant que filed_fournisseurs_ibans n'est pas publiée */
  const direct = useTempsReel(["filed_fournisseurs", "filed_historique", "filed_fournisseurs_ibans", "filed_factures"], source === "reelle", charger);

  /* après « Revérifier », la réponse du registre arrive en une à deux minutes : relire à 1, 2 et 4 min */
  const relectures = useRef<number[]>([]);
  useEffect(() => () => relectures.current.forEach((t) => window.clearTimeout(t)), []);
  const relireApres = () => {
    relectures.current.forEach((t) => window.clearTimeout(t));
    relectures.current = [60, 120, 240].map((sec) => window.setTimeout(() => void charger(), sec * 1000));
  };

  const vue = source === "exemple" ? local : reel;
  const moi = source === "exemple" ? EXEMPLE_MOI : (moiReel?.user_id ?? null);

  const compteurs = useMemo(() => {
    const c: Record<Famille, number> = { a_confirmer: 0, bloque: 0, actif: 0, refuse: 0 };
    for (const f of vue?.fournisseurs ?? []) c[f.statut] = (c[f.statut] ?? 0) + 1;
    return c;
  }, [vue]);

  const visibles = useMemo(() => {
    const q = recherche.trim().toLowerCase().replace(/\s+/g, "");
    return (vue?.fournisseurs ?? [])
      .filter((f) => !filtre || f.statut === filtre)
      .filter((f) => !q || [f.nom, f.siren, f.tva, f.code].some((x) => x && x.toLowerCase().replace(/\s+/g, "").includes(q)))
      .sort((a, b) => (RANG[a.statut] ?? 9) - (RANG[b.statut] ?? 9) || a.nom.localeCompare(b.nom, "fr"));
  }, [vue, filtre, recherche]);

  const choisi = choix && visibles.some((f) => f.id === choix) ? choix : (visibles[0]?.id ?? null);
  const f = visibles.find((x) => x.id === choisi) ?? null;
  const ibansDe = (id: string) => (vue?.ibans ?? []).filter((i) => i.fournisseur_id === id);
  const facturesDe = (id: string) => (vue?.factures ?? []).filter((x) => x.fournisseur_id === id);
  const deposantOrigine = !!f && f.statut === "a_confirmer" && !!moi && vue?.deposants[f.id] === moi;
  const registre = f ? registreDe(f) : null;

  const ouvrir = (x: Form) => {
    setErreurAction(null);
    setFait(null);
    setMotif("");
    setIban("");
    setForm(x);
  };
  const motifOk = motif.trim().length >= 3;
  const ibanPropre = iban.replace(/\s+/g, "").toUpperCase();
  const ibanOk = /^[A-Z]{2}[0-9]{2}[A-Z0-9]{10,30}$/.test(ibanPropre);

  /* une porte en base réelle, sinon la même chose en mémoire */
  async function envoyer(action: () => Promise<unknown>, localement: (v: VueFournisseurs) => VueFournisseurs, message: string, apres?: () => void) {
    setEnvoi(true);
    setErreurAction(null);
    try {
      if (source === "reelle") {
        await action();
        await charger();
        apres?.();
      } else {
        await new Promise((r) => setTimeout(r, 350));
        setLocal((v) => localement(v));
      }
      if (f) setChoix(f.id);
      setFait(message);
      setForm(null);
    } catch (e) {
      setErreurAction(e instanceof Error ? e.message : "La base a refusé l'opération.");
    } finally {
      setEnvoi(false);
    }
  }
  const changer = (v: VueFournisseurs, id: string, maj: Partial<Fournisseur>): VueFournisseurs => ({ ...v, fournisseurs: v.fournisseurs.map((x) => (x.id === id ? { ...x, ...maj } : x)) });

  const confirmer = () =>
    f &&
    envoyer(
      () => confirmerFournisseur(f.id, motif.trim()),
      (v) => {
        const w = changer(v, f.id, { statut: "actif", confirme_le: maintenant(), confirme_par: moi });
        return { ...w, ibans: w.ibans.map((i) => (i.fournisseur_id === f.id && i.statut === "propose" ? { ...i, statut: "valide" as const } : i)), factures: w.factures.map((x) => (x.fournisseur_id === f.id && x.statut === "bloquee" ? { ...x, statut: "a_valider" as const } : x)) };
      },
      `${f.nom} est confirmé ; ses factures bloquées sont recontrôlées.`,
    );
  const attester = () =>
    f &&
    envoyer(
      () => attesterIdentite(f.id, motif.trim()),
      (v) => changer(v, f.id, { identite_verifiee_le: maintenant(), identite_source: "humain", identite_verdict: { resultat: "valide", registre: "humain", preuve: { par: moi, motif: motif.trim() } } }),
      "L'identité est attestée, avec votre motif.",
    );
  const reverifier = () => {
    if (!f || !registre) return;
    const nom = registre.nom === "vies" ? "VIES" : "Sirene";
    const client = moiReel?.client_id;
    void envoyer(
      () => (client ? demanderVerification(client, registre.nom, registre.identifiant, f.id) : Promise.reject(new Error("Aucun compte rattaché à cette session."))),
      (v) => changer(v, f.id, { identite_verifiee_le: maintenant(), identite_source: registre.nom, identite_verdict: { resultat: "valide", registre: registre.nom, identifiant: registre.identifiant.replace(/\s+/g, "") } }),
      source === "reelle" ? `La vérification est demandée à ${nom} ; la réponse arrive en une à deux minutes et la fiche se relit seule.` : `Identité confirmée par ${nom} (en exemple, la réponse est immédiate).`,
      relireApres,
    );
  };
  const bloquer = (b: boolean) =>
    f &&
    envoyer(
      () => bloquerFournisseur(f.id, b, motif.trim()),
      (v) => changer(v, f.id, { statut: b ? "bloque" : "actif" }),
      b ? `${f.nom} est bloqué : plus aucune facture ne sera payée sans déblocage.` : `${f.nom} est débloqué.`,
    );
  const soumettreIban = () =>
    f &&
    envoyer(
      () => proposerIban(f.id, ibanPropre, motif.trim()),
      (v) => ({ ...v, ibans: [...v.ibans, { id: `iban-${Date.now()}`, fournisseur_id: f.id, iban_masque: masquerIban(ibanPropre), statut: "propose", propose_le: maintenant() }] }),
      f.statut === "actif" ? "L'IBAN est proposé ; sa validation part dans la file « À valider »." : "L'IBAN est proposé ; il sera validé avec le fournisseur.",
    );

  return (
    <>
      <div className="esp-tete" data-arrivee="">
        <div>
          <h1 className="esp-titre">Fournisseurs</h1>
          <p className="esp-sous">
            Les fournisseurs que FILED connaît : ceux à confirmer en tête, leur identité vérifiée auprès des registres publics, leurs IBAN et leurs factures.
          </p>
        </div>
        <div className="esp-item-haut">
          {direct !== "inactif" ? (
            <span className="esp-direct" data-etat={direct} role="status" title={direct === "en_direct" ? "Les changements arrivent sans recharger la page." : direct === "coupe" ? "Votre réseau refuse le canal temps réel : la vue se relit seule toutes les 30 secondes." : "Connexion au temps réel…"}>
              <span className="esp-direct-point" aria-hidden="true" />
              {direct === "en_direct" ? "En direct" : direct === "coupe" ? "Relue toutes les 30 s" : "Connexion…"}
            </span>
          ) : null}
          <Link href="/espace/filed" className="r-btn r-btn--fil"><FileText width={15} height={15} aria-hidden="true" /> Documents reçus</Link>
          <Link href="/espace/filed/a-payer" className="r-btn r-btn--fil"><Wallet width={15} height={15} aria-hidden="true" /> À payer</Link>
          <Ruban source={source} />
        </div>
      </div>

      <div className="esp-kpis" data-arrivee="">
        {FAMILLES.map((x) => (
          <button key={x.cle} type="button" className="esp-kpi" data-teinte={compteurs[x.cle] && x.cle !== "actif" ? x.teinte : undefined} aria-pressed={filtre === x.cle} onClick={() => setFiltre(filtre === x.cle ? null : x.cle)}>
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
        <section className="esp-carte" aria-label="Fournisseurs">
          <div className="esp-carte-tete">
            <h2 className="esp-carte-titre">{filtre ? FAMILLES.find((x) => x.cle === filtre)?.libelle : "Tous les fournisseurs"}</h2>
            <span className="esp-kpi-sous">{visibles.length} fournisseur{visibles.length > 1 ? "s" : ""}</span>
          </div>
          <div style={{ padding: "12px 16px 0" }}>
            <input type="search" className="rv-champ" placeholder="Chercher un nom, un SIREN, une TVA…" value={recherche} onChange={(e) => setRecherche(e.target.value)} aria-label="Chercher un fournisseur" />
          </div>
          {source === "reelle" && !reel ? (
            <Chargement texte="Lecture des fournisseurs…" />
          ) : visibles.length === 0 ? (
            <Vide titre="Aucun fournisseur">{filtre || recherche ? "Rien ne correspond." : "Les fournisseurs naissent de la première facture lue."}</Vide>
          ) : (
            <ul className="esp-liste" aria-label="Fournisseurs">
              {visibles.map((x) => {
                const s = STATUTS_FOURNISSEUR[x.statut] ?? STATUTS_FOURNISSEUR.actif;
                const id = identiteDe(x);
                const proposes = ibansDe(x.id).filter((i) => i.statut === "propose").length;
                const enCours = facturesDe(x.id).filter((y) => y.statut === "bloquee" || y.statut === "a_valider" || y.statut === "a_completer").length;
                return (
                  <li key={x.id}>
                    <button
                      type="button"
                      aria-current={choisi === x.id ? "true" : undefined}
                      className="esp-item"
                      onClick={() => {
                        setChoix(x.id);
                        setFait(null);
                        if (window.innerWidth < 1024) document.getElementById("esp-fournisseur")?.scrollIntoView({ behavior: "smooth", block: "start" });
                      }}
                    >
                      <span className="esp-item-haut">
                        <Pastille teinte={s.teinte}>{s.libelle}</Pastille>
                        <Pastille teinte={id.teinte}>{id.teinte === "vert" ? "Identité vérifiée" : id.teinte === "rouge" ? "Identité invalide" : id.teinte === "ambre" ? "Registre en attente" : "Identité non vérifiée"}</Pastille>
                        {proposes ? <Pastille teinte="ambre">{proposes} IBAN à valider</Pastille> : null}
                      </span>
                      <span className="esp-item-titre">{x.nom}</span>
                      <span className="esp-item-bas">
                        {x.siren ? <span>SIREN {x.siren}</span> : x.tva ? <span>TVA {x.tva}</span> : <span>Sans identifiant</span>}
                        <span>{enCours ? `${enCours} facture${enCours > 1 ? "s" : ""} en cours` : `${facturesDe(x.id).length} facture${facturesDe(x.id).length > 1 ? "s" : ""}`}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section id="esp-fournisseur" className="esp-detail-mobile" aria-label="Fiche du fournisseur">
          {f ? (
            <div className="esp-carte">
              <div className="esp-carte-tete">
                <h2 className="esp-carte-titre">{f.nom}</h2>
                {f.code ? <span className="esp-mono esp-kpi-sous">{f.code}</span> : null}
              </div>
              <div className="esp-carte-corps" style={{ display: "grid", gap: 16 }}>
                <FicheFournisseur
                  fournisseur={f}
                  deposantOrigine={deposantOrigine}
                  registre={registre?.nom ?? null}
                  envoi={envoi && !form}
                  onConfirmer={() => ouvrir({ type: "confirmer" })}
                  onAttester={() => ouvrir({ type: "attester" })}
                  onReverifier={() => { setFait(null); reverifier(); }}
                />
                <div className="esp-actions">
                  {f.statut !== "refuse" ? (
                    <button type="button" className="r-btn r-btn--fil r-btn--petit" onClick={() => ouvrir({ type: "iban" })}><Landmark width={13} height={13} aria-hidden="true" /> Proposer un IBAN</button>
                  ) : null}
                  {f.statut === "actif" || f.statut === "bloque" ? (
                    <button type="button" className="r-btn r-btn--fil r-btn--petit" onClick={() => ouvrir({ type: "bloquer", bloquer: f.statut !== "bloque" })}>
                      {f.statut === "bloque" ? <Unlock width={13} height={13} aria-hidden="true" /> : <Ban width={13} height={13} aria-hidden="true" />} {f.statut === "bloque" ? "Débloquer" : "Bloquer"}
                    </button>
                  ) : null}
                </div>

                {fait ? <Avis teinte="vert" role="status"><strong>C&apos;est fait.</strong> {fait}</Avis> : null}
                {erreurAction && !form ? <Avis teinte="rouge" role="alert"><strong>Refusé par la base.</strong> {erreurAction}</Avis> : null}

                <div>
                  <div className="esp-section-titre">IBAN</div>
                  {ibansDe(f.id).length ? (
                    <ul className="esp-fil">
                      {ibansDe(f.id).map((i) => (
                        <li key={i.id}>
                          <span className="esp-fil-point" data-teinte={i.statut === "valide" ? "vert" : i.statut === "propose" ? "bleu" : i.statut === "refuse" ? "rouge" : undefined} />
                          <div>
                            <div className="esp-fil-texte esp-item-haut">
                              <span className="esp-mono">{i.iban_masque}</span>
                              <Pastille teinte={i.statut === "valide" ? "vert" : i.statut === "propose" ? "ambre" : "gris"}>{i.statut === "valide" ? "Validé" : i.statut === "propose" ? "Proposé" : i.statut === "refuse" ? "Refusé" : "Révoqué"}</Pastille>
                            </div>
                            <div className="esp-fil-meta">
                              Proposé le {dateCourte(i.propose_le)}
                              {i.statut === "propose" ? (f.statut === "a_confirmer" ? " · validé avec le fournisseur à sa confirmation" : <> · à valider dans la file <Link href="/espace/validations">« À valider »</Link></>) : ""}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="esp-kpi-sous">Aucun IBAN connu : le paiement passera par un autre moyen, ou proposez-en un.</p>
                  )}
                </div>

                <div>
                  <div className="esp-section-titre">Factures</div>
                  {facturesDe(f.id).length ? (
                    <ul className="esp-fil">
                      {facturesDe(f.id).map((x) => {
                        const s = statutFacture(x.statut);
                        return (
                          <li key={x.id}>
                            <span className="esp-fil-point" data-teinte={s.teinte === "rouge" ? "rouge" : s.teinte === "vert" ? "vert" : "bleu"} />
                            <div>
                              <div className="esp-fil-texte esp-item-haut">
                                <Link href={`/espace/filed?objet=facture:${encodeURIComponent(x.id)}`} className="esp-mono">{x.reference ?? x.numero ?? "Facture"}</Link>
                                <Pastille teinte={s.teinte}>{s.libelle}</Pastille>
                                {x.montant_ttc !== null ? <span>{montant(x.montant_ttc, x.devise)} TTC</span> : null}
                              </div>
                              <div className="esp-fil-meta">{x.numero ? `n° ${x.numero}` : ""}{x.date_emission ? ` · du ${dateCourte(x.date_emission)}` : ""}</div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="esp-kpi-sous">Aucune facture rattachée.</p>
                  )}
                </div>
              </div>
            </div>
          ) : source === "reelle" && !reel ? (
            <div className="esp-carte"><Chargement texte="Lecture…" /></div>
          ) : (
            <div className="esp-carte"><Vide titre="Choisissez un fournisseur">Sa fiche, ses IBAN et ses factures s&apos;affichent ici.</Vide></div>
          )}
        </section>
      </div>

      {/* ——— dialogues ——— */}
      <Dialog open={form?.type === "confirmer"} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><UserCheck width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>Confirmer le fournisseur</DialogTitle>
            <DialogDescription>Vous confirmez que {f?.nom} est bien un fournisseur de l&apos;entreprise. Il devient actif, l&apos;IBAN proposé avec sa première facture est validé, et ses factures bloquées sont recontrôlées.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              <Avis teinte="ambre">La personne qui a déposé la pièce d&apos;origine ne confirme pas ce fournisseur : une autre personne décide. La confirmation est réservée au gérant, à l&apos;administrateur et au valideur ; elle est conservée avec votre nom et l&apos;heure.</Avis>
              <label className="rv-libelle">
                Motif <span className="esp-kpi-sous">(facultatif)</span>
                <textarea className="rv-champ" value={motif} onChange={(e) => setMotif(e.target.value)} maxLength={500} placeholder="Ce que vous avez vérifié : bon de commande, appel au numéro connu, contrat…" />
              </label>
              {erreurAction ? <Avis teinte="rouge" role="alert">{erreurAction}</Avis> : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={envoi || deposantOrigine} onClick={() => void confirmer()}>{envoi ? <Loader variant="spin" /> : null} Confirmer le fournisseur</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={form?.type === "attester"} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><BadgeCheck width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>Attester l&apos;identité</DialogTitle>
            <DialogDescription>Quand le registre ne répond pas, ou pour un fournisseur étranger hors registre, vous attestez que {f?.nom} est bien l&apos;entreprise qu&apos;il dit être.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              <Motif motif={motif} onChange={setMotif} aide="Sur quoi l'attestation se fonde : extrait Kbis reçu, registre étranger consulté, contrat signé…" />
              {erreurAction ? <Avis teinte="rouge" role="alert">{erreurAction}</Avis> : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={!motifOk || envoi} onClick={() => void attester()}>{envoi ? <Loader variant="spin" /> : null} Attester</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={form?.type === "bloquer"} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone>{form?.type === "bloquer" && !form.bloquer ? <Unlock width={18} height={18} aria-hidden="true" /> : <Ban width={18} height={18} aria-hidden="true" />}</DialogIcone>
            <DialogTitle>{form?.type === "bloquer" && !form.bloquer ? "Débloquer le fournisseur" : "Bloquer le fournisseur"}</DialogTitle>
            <DialogDescription>{form?.type === "bloquer" && !form.bloquer ? `${f?.nom} pourra de nouveau être payé.` : `Plus aucune facture de ${f?.nom} ne sera payée tant que le blocage tient.`}</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              <Motif motif={motif} onChange={setMotif} />
              {erreurAction ? <Avis teinte="rouge" role="alert">{erreurAction}</Avis> : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className={`r-btn ${form?.type === "bloquer" && !form.bloquer ? "r-btn--noir" : "r-btn--rouge"}`} disabled={!motifOk || envoi} onClick={() => form?.type === "bloquer" && void bloquer(form.bloquer)}>{envoi ? <Loader variant="spin" /> : null} {form?.type === "bloquer" && !form.bloquer ? "Débloquer" : "Bloquer"}</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={form?.type === "iban"} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><Landmark width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>Proposer un IBAN</DialogTitle>
            <DialogDescription>Pour {f?.nom}. L&apos;IBAN proposé devra être validé par une personne habilitée avant tout paiement.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              <label className="rv-libelle">IBAN <span className="esp-obligatoire">(obligatoire)</span>
                <input className="rv-champ esp-mono" value={iban} onChange={(e) => setIban(e.target.value)} placeholder="FR76 …" autoComplete="off" />
              </label>
              {iban && !ibanOk ? <Avis teinte="ambre">Format attendu : deux lettres, deux chiffres, puis 10 à 30 caractères.</Avis> : null}
              <Motif motif={motif} onChange={setMotif} aide="D'où vient cet IBAN et comment il a été vérifié (appel au numéro connu, courrier signé…)." />
              {erreurAction ? <Avis teinte="rouge" role="alert">{erreurAction}</Avis> : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={!motifOk || !ibanOk || envoi} onClick={() => void soumettreIban()}>{envoi ? <Loader variant="spin" /> : null} Proposer</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Motif({ motif, onChange, aide }: { motif: string; onChange: (s: string) => void; aide?: string }) {
  return (
    <label className="rv-libelle">
      Motif <span className="esp-obligatoire">(obligatoire, 3 caractères au moins)</span>
      <textarea className="rv-champ" value={motif} onChange={(e) => onChange(e.target.value)} maxLength={500} placeholder={aide ?? "Pourquoi, en une phrase."} />
    </label>
  );
}
