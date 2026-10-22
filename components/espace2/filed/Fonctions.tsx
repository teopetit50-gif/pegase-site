"use client";

/* ══════════════════════════════════════════════════════════════════════
   FILED — les pages de fonction (21/10/2026)

   Demande de Teo, après CASHD, REPUT et OFFLOAD : deux pages de plus dans
   le volet de FILED, une par famille du catalogue de la page produit
   (lib/produits/capacites/factures.ts) :
     · Contrôles et fraude   — « Contrôles avant classement » : les pièces
       en anomalie, les changements de coordonnées bancaires, les
       fournisseurs à confirmer ou bloqués, les doublons écartés ;
     · Circuit de validation — « Circuit de validation » : les règles qui
       disent qui approuve quoi, les factures en attente avec le compte de
       leurs approbations, les délégations en cours, les dernières
       décisions et leur motif.
   Rien ne se décide ici : on agit dans « Documents reçus », « Fournisseurs »
   ou « À valider ». Données : l'exemple, ou la base réelle par les mêmes
   portes que ces écrans (filed/portes, validations/portes) et, pour les
   règles, la table regles_validation sous RLS.
   ══════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CheckCheck, FileText, ShieldCheck, Users } from "lucide-react";
import { useSource } from "@/components/espace/source";
import { dateCourte, montant } from "@/components/espace/format";
import { DOSSIERS_EXEMPLE } from "@/components/espace/exemples/filed";
import { PERSONNES } from "@/components/espace/exemples/socle";
import { APPROBATIONS_EXEMPLE, DELEGATIONS_EXEMPLE, DEMANDES_EXEMPLE, REGLES_EXEMPLE } from "@/components/espace/exemples/validations";
import { vueExemple } from "@/components/espace/filed/EcranFournisseurs";
import { FAMILLES_CONTROLE } from "@/components/espace/filed/etats";
import { chargerListe, chargerVueFournisseurs, type VueFournisseurs } from "@/components/espace/filed/portes";
import { chargerFile } from "@/components/espace/validations/portes";
import { STATUTS, compteApprobations } from "@/components/espace/validations/regles";
import type { Approbation, Delegation, Demande, DocumentFiled, Facture, Fournisseur, Regle, Role } from "@/components/espace/types";
import { createClient } from "@/lib/supabase/client";
import { Badge, Note, Squelette, Vide } from "../ui";
import { useMaintenant } from "../horloge";

const JOUR = 86_400_000;
const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? "s" : ""}`;

type Stat = { libelle: string; valeur: string; sous: string; teinte?: "vert" | "ambre" | "rouge" | "bleu" | "gris" };

function Stats({ stats }: { stats: Stat[] | null }) {
  return (
    <div className="v2-stats" style={{ "--nb": stats?.length ?? 4 } as React.CSSProperties}>
      {(stats ?? [0, 1, 2, 3].map(() => null)).map((x, i) => (
        <div key={x?.libelle ?? i} className="v2-stat" style={{ cursor: "default" }}>
          <span className="v2-stat-etiquette">
            <span className="v2-point" data-teinte={x?.teinte ?? "gris"} aria-hidden="true" />
            {x ? x.libelle : <Squelette largeur="60%" hauteur={14} />}
          </span>
          <span className="v2-stat-valeur">{x ? x.valeur : <Squelette largeur={48} hauteur={28} />}</span>
          <span className="v2-stat-sous">{x ? x.sous : <Squelette largeur="70%" hauteur={14} />}</span>
        </div>
      ))}
    </div>
  );
}

function Attente({ erreur }: { erreur: string | null }) {
  if (erreur) return null;
  return (
    <div className="v2-carte" aria-busy="true" style={{ padding: 16, display: "grid", gap: 16 }}>
      {[0, 1, 2].map((i) => (
        <Squelette key={i} hauteur={20} />
      ))}
    </div>
  );
}

function Erreur({ erreur }: { erreur: string | null }) {
  if (!erreur) return null;
  return (
    <div style={{ marginBottom: 24 }}>
      <Note teinte="rouge" role="alert">
        <strong>La base réelle n&apos;a pas répondu.</strong> {erreur}
      </Note>
    </div>
  );
}

function Section({ id, titre, sous, children }: { id: string; titre: string; sous?: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id}>
      <div className="v2-section-titre">
        <h2 className="v2-h2" id={id}>
          {titre}
        </h2>
        {sous ? (
          <span className="v2-gris v2-tabulaire" style={{ fontSize: 13 }}>
            {sous}
          </span>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function Tableau({ colonnes, children }: { colonnes: { libelle: string; num?: boolean }[]; children: React.ReactNode }) {
  return (
    <div className="v2-carte">
      <div className="v2-tableau-cadre">
        <table className="v2-tableau v2-tableau--empile">
          <thead>
            <tr>
              {colonnes.map((c) => (
                <th key={c.libelle} scope="col" className={c.num ? "v2-num" : undefined}>
                  {c.libelle}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
    </div>
  );
}

/* ══ Contrôles et fraude ══════════════════════════════════════════════ */

type Piece = { document: DocumentFiled; facture: Facture | null; fournisseur: Fournisseur | null };
type DonneesControles = { pieces: Piece[]; vue: VueFournisseurs };

function useControles() {
  const { source } = useSource();
  const [reel, setReel] = useState<DonneesControles | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  useEffect(() => {
    if (source !== "reelle") return;
    let actif = true;
    const t = window.setTimeout(async () => {
      setErreur(null);
      setReel(null);
      try {
        const [liste, vue] = await Promise.all([chargerListe(), chargerVueFournisseurs()]);
        if (actif) setReel({ pieces: liste.apercus, vue });
      } catch (e) {
        if (actif) setErreur(e instanceof Error ? e.message : "La base n'a pas répondu.");
      }
    }, 0);
    return () => {
      actif = false;
      window.clearTimeout(t);
    };
  }, [source]);
  const exemple = useMemo<DonneesControles>(() => ({ pieces: DOSSIERS_EXEMPLE.map((d) => ({ document: d.document, facture: d.facture, fournisseur: d.fournisseur })), vue: vueExemple() }), []);
  return { donnees: source === "exemple" ? exemple : reel, erreur: source === "exemple" ? null : erreur };
}

const familleDe = (code: string) => FAMILLES_CONTROLE[code.split(".")[0]] ?? code.split(".")[0];
const lienPiece = (p: Piece) => (p.facture ? `/espace2/filed?objet=facture:${encodeURIComponent(p.facture.id)}` : "/espace2/filed");

export function Controles() {
  const { donnees, erreur } = useControles();

  const calc = useMemo(() => {
    if (!donnees) return null;
    const { pieces, vue } = donnees;
    const enAnomalie = pieces
      .filter((p) => p.facture && (p.facture.anomalies.length > 0 || p.facture.nb_bloquants > 0 || p.facture.nb_attention > 0) && !["validee", "comptabilisee", "refusee"].includes(p.facture.statut))
      .sort((a, b) => (b.facture?.nb_bloquants ?? 0) - (a.facture?.nb_bloquants ?? 0) || b.document.recu_le.localeCompare(a.document.recu_le));
    const nom = (id: string) => vue.fournisseurs.find((f) => f.id === id)?.nom ?? "Fournisseur inconnu";
    /* un IBAN proposé chez un fournisseur qui en a déjà un validé : un changement de coordonnées */
    const ibans = vue.ibans
      .filter((i) => i.statut === "propose")
      .map((i) => ({ ...i, nom: nom(i.fournisseur_id), change: vue.ibans.some((x) => x.fournisseur_id === i.fournisseur_id && x.id !== i.id && (x.statut === "valide" || x.statut === "revoque")) }))
      .sort((a, b) => Number(b.change) - Number(a.change) || b.propose_le.localeCompare(a.propose_le));
    const surveiller = vue.fournisseurs.filter((f) => f.statut === "a_confirmer" || f.statut === "bloque" || f.identite_verdict?.resultat === "invalide");
    const doublons = pieces.filter((p) => p.document.etat === "doublon");
    return { enAnomalie, ibans, surveiller, doublons, bloquees: enAnomalie.filter((p) => (p.facture?.nb_bloquants ?? 0) > 0).length };
  }, [donnees]);

  const stats: Stat[] | null = calc
    ? [
        { libelle: "Pièces bloquées", valeur: String(calc.bloquees), sous: "aucune n'est classée au jugé", teinte: calc.bloquees ? "rouge" : "vert" },
        { libelle: "Changements de RIB", valeur: String(calc.ibans.filter((i) => i.change).length), sous: "à confirmer avant tout paiement", teinte: calc.ibans.some((i) => i.change) ? "rouge" : "vert" },
        { libelle: "Fournisseurs à surveiller", valeur: String(calc.surveiller.length), sous: "à confirmer, bloqués ou non vérifiés", teinte: calc.surveiller.length ? "ambre" : "gris" },
        { libelle: "Doublons écartés", valeur: String(calc.doublons.length), sous: "même renommés ou rescannés" },
      ]
    : null;

  return (
    <div className="v2-page v2-arrivee">
      <h1 className="v2-sr">Contrôles et fraude</h1>
      <div className="v2-tete" style={{ marginBottom: 24 }}>
        <div>
          <p>
            Ce que FILED vérifie avant de classer une pièce : les totaux, la TVA, les doublons, l&apos;identité du fournisseur et ses coordonnées bancaires. Une pièce en anomalie attend une personne ; un changement de RIB n&apos;est jamais pris en compte sans confirmation.
          </p>
        </div>
        <div className="v2-actions">
          <Link href="/espace2/filed/fournisseurs" className="v2-btn">
            <Users width={16} height={16} aria-hidden="true" /> Fournisseurs
          </Link>
          <Link href="/espace2/filed" className="v2-btn">
            <FileText width={16} height={16} aria-hidden="true" /> Documents reçus
          </Link>
        </div>
      </div>
      <Erreur erreur={erreur} />
      <Stats stats={stats} />

      {!calc ? (
        <Attente erreur={erreur} />
      ) : (
        <div style={{ display: "grid", gap: 24 }}>
          <Section id="ctl-rib" titre="Coordonnées bancaires proposées" sous={pluriel(calc.ibans.length, "IBAN")}>
            {calc.ibans.length ? (
              <Tableau colonnes={[{ libelle: "Fournisseur" }, { libelle: "IBAN proposé" }, { libelle: "Reçu le" }, { libelle: "Signal" }]}>
                {calc.ibans.map((i) => (
                  <tr key={i.id}>
                    <td data-etiquette="Fournisseur" data-plein="">
                      <Link href="/espace2/filed/fournisseurs" style={{ fontWeight: 500 }}>
                        {i.nom}
                      </Link>
                    </td>
                    <td data-etiquette="IBAN proposé">
                      <span className="v2-mono">{i.iban_masque}</span>
                    </td>
                    <td data-etiquette="Reçu le">{dateCourte(i.propose_le)}</td>
                    <td data-etiquette="Signal">{i.change ? <Badge teinte="rouge">Remplace un IBAN validé</Badge> : <Badge teinte="ambre">Premier IBAN, à confirmer</Badge>}</td>
                  </tr>
                ))}
              </Tableau>
            ) : (
              <Vide icone={<ShieldCheck width={20} height={20} />} titre="Aucun IBAN en attente">Chaque facture à payer porte un IBAN déjà confirmé.</Vide>
            )}
          </Section>

          <Section id="ctl-pieces" titre="Pièces en anomalie" sous={pluriel(calc.enAnomalie.length, "pièce")}>
            {calc.enAnomalie.length ? (
              <Tableau colonnes={[{ libelle: "Pièce" }, { libelle: "Fournisseur" }, { libelle: "Contrôles en défaut" }, { libelle: "Montant", num: true }, { libelle: "Gravité" }]}>
                {calc.enAnomalie.map((p) => {
                  const f = p.facture!;
                  const familles = Array.from(new Set(f.anomalies.map(familleDe)));
                  return (
                    <tr key={p.document.id}>
                      <td data-etiquette="Pièce">
                        <Link href={lienPiece(p)} className="v2-mono">
                          {p.document.reference}
                        </Link>
                        <small>reçue le {dateCourte(p.document.recu_le)}</small>
                      </td>
                      <td data-etiquette="Fournisseur">{p.fournisseur?.nom ?? "Fournisseur inconnu"}</td>
                      <td data-etiquette="Contrôles en défaut" data-plein="">
                        <span style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                          {familles.length ? familles.map((x) => <Badge key={x}>{x}</Badge>) : <span className="v2-gris">voir la pièce</span>}
                        </span>
                      </td>
                      <td data-etiquette="Montant" className="v2-num">
                        {montant(f.montant_ttc, f.devise)}
                      </td>
                      <td data-etiquette="Gravité">
                        {f.nb_bloquants > 0 || f.anomalies.some((c) => c.startsWith("fournisseur.iban") || c.startsWith("doublon")) ? <Badge teinte="rouge">Bloquante</Badge> : <Badge teinte="ambre">À vérifier</Badge>}
                      </td>
                    </tr>
                  );
                })}
              </Tableau>
            ) : (
              <Vide icone={<ShieldCheck width={20} height={20} />} titre="Aucune pièce en anomalie">Toutes les pièces en cours ont passé leurs contrôles.</Vide>
            )}
          </Section>

          <Section id="ctl-fournisseurs" titre="Fournisseurs à surveiller" sous={pluriel(calc.surveiller.length, "fournisseur")}>
            {calc.surveiller.length ? (
              <Tableau colonnes={[{ libelle: "Fournisseur" }, { libelle: "SIREN" }, { libelle: "Identité" }, { libelle: "Statut" }]}>
                {calc.surveiller.map((f) => (
                  <tr key={f.id}>
                    <td data-etiquette="Fournisseur" data-plein="">
                      <Link href="/espace2/filed/fournisseurs" style={{ fontWeight: 500 }}>
                        {f.nom}
                      </Link>
                    </td>
                    <td data-etiquette="SIREN">
                      <span className="v2-mono">{f.siren ?? "—"}</span>
                    </td>
                    <td data-etiquette="Identité">
                      {f.identite_verdict?.resultat === "invalide" ? (
                        <Badge teinte="rouge">Introuvable au registre</Badge>
                      ) : f.identite_verifiee_le ? (
                        <Badge teinte="vert">Vérifiée le {dateCourte(f.identite_verifiee_le)}</Badge>
                      ) : (
                        <Badge>Non vérifiée</Badge>
                      )}
                    </td>
                    <td data-etiquette="Statut">{f.statut === "bloque" ? <Badge teinte="rouge">Bloqué : ne pas payer</Badge> : f.statut === "a_confirmer" ? <Badge teinte="ambre">Jamais vu, à confirmer</Badge> : <Badge>Actif</Badge>}</td>
                  </tr>
                ))}
              </Tableau>
            ) : (
              <Vide icone={<Users width={20} height={20} />} titre="Aucun fournisseur à surveiller">Chaque fournisseur est confirmé et son identité vérifiée.</Vide>
            )}
          </Section>
        </div>
      )}
    </div>
  );
}

/* ══ Circuit de validation ════════════════════════════════════════════ */

type DonneesCircuit = { demandes: Demande[]; approbations: Approbation[]; delegations: Delegation[]; regles: Regle[] };

const ROLES: Record<Role, string> = { gerant: "gérant", admin: "administrateur", valideur: "valideur", collaborateur: "collaborateur", lecteur: "lecteur" };
const ACTIONS: Record<string, string> = { payer_facture: "Payer une facture", valider_facture: "Valider une facture", lever_anomalie: "Lever une anomalie", valider_iban: "Confirmer un IBAN" };
const action = (t: string | null) => (t ? (ACTIONS[t] ?? t.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase())) : "Toute action");
const nomDe = (id: string, nom?: string) => nom ?? PERSONNES[id]?.nom ?? "Une personne de l'équipe";

function useCircuit() {
  const { source } = useSource();
  const [reel, setReel] = useState<DonneesCircuit | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  useEffect(() => {
    if (source !== "reelle") return;
    let actif = true;
    const t = window.setTimeout(async () => {
      setErreur(null);
      setReel(null);
      try {
        const [file, regles] = await Promise.all([
          chargerFile(),
          createClient()
            .from("regles_validation")
            .select("*")
            .eq("actif", true)
            .then((r) => (r.error ? [] : ((r.data ?? []) as Regle[]))),
        ]);
        if (actif) setReel({ ...file, regles });
      } catch (e) {
        if (actif) setErreur(e instanceof Error ? e.message : "La base n'a pas répondu.");
      }
    }, 0);
    return () => {
      actif = false;
      window.clearTimeout(t);
    };
  }, [source]);
  const exemple = useMemo<DonneesCircuit>(() => ({ demandes: DEMANDES_EXEMPLE, approbations: APPROBATIONS_EXEMPLE, delegations: DELEGATIONS_EXEMPLE, regles: REGLES_EXEMPLE }), []);
  return { donnees: source === "exemple" ? exemple : reel, erreur: source === "exemple" ? null : erreur };
}

const tranche = (r: Regle) => (r.montant_max === null ? (r.montant_min > 0 ? `à partir de ${montant(r.montant_min)}` : "tout montant") : `de ${montant(r.montant_min)} à ${montant(r.montant_max)}`);

export function Circuit() {
  const { donnees, erreur } = useCircuit();
  const maintenant = useMaintenant();

  const calc = useMemo(() => {
    if (!donnees || maintenant === null) return null;
    const filed = donnees.demandes.filter((d) => d.module === "filed");
    const attente = filed.filter((d) => d.statut === "en_attente").sort((a, b) => (a.echeance ?? "9999").localeCompare(b.echeance ?? "9999"));
    const decidees = filed.filter((d) => d.decide_le && maintenant - new Date(d.decide_le).getTime() <= 30 * JOUR).sort((a, b) => (b.decide_le ?? "").localeCompare(a.decide_le ?? ""));
    const delegations = donnees.delegations.filter((g) => !g.revoquee_le && (g.module === null || g.module === "filed") && new Date(g.fin).getTime() > maintenant && new Date(g.debut).getTime() <= maintenant);
    const regles = donnees.regles.filter((r) => r.actif && (r.module === "filed" || r.module === "*")).sort((a, b) => Number(a.module === "*") - Number(b.module === "*") || a.montant_min - b.montant_min);
    return { attente, decidees, delegations, regles };
  }, [donnees, maintenant]);

  const stats: Stat[] | null = calc
    ? [
        { libelle: "En attente d'approbation", valeur: String(calc.attente.length), sous: montant(calc.attente.reduce((s, d) => s + (d.montant ?? 0), 0)), teinte: calc.attente.length ? "ambre" : "vert" },
        { libelle: "Double approbation", valeur: String(calc.attente.filter((d) => d.approbations_requises > 1).length), sous: "deux personnes distinctes", teinte: calc.attente.some((d) => d.approbations_requises > 1) ? "ambre" : "gris" },
        { libelle: "Délégations en cours", valeur: String(calc.delegations.length), sous: "avec leur date de fin" },
        { libelle: "Décidées sur 30 jours", valeur: String(calc.decidees.length), sous: pluriel(calc.decidees.filter((d) => d.statut === "rejetee").length, "refus") },
      ]
    : null;

  return (
    <div className="v2-page v2-arrivee">
      <h1 className="v2-sr">Circuit de validation</h1>
      <div className="v2-tete" style={{ marginBottom: 24 }}>
        <div>
          <p>
            Qui approuve quoi : l&apos;approbation suit le montant et l&apos;action ; au-delà d&apos;un seuil, deux personnes distinctes signent, et celle qui a saisi ne peut pas approuver. Le commentaire, la pièce et le motif d&apos;un refus restent attachés à la facture.
          </p>
        </div>
        <div className="v2-actions">
          <Link href="/espace2/validations" className="v2-btn">
            <CheckCheck width={16} height={16} aria-hidden="true" /> À valider
          </Link>
        </div>
      </div>
      <Erreur erreur={erreur} />
      <Stats stats={stats} />

      {!calc ? (
        <Attente erreur={erreur} />
      ) : (
        <div style={{ display: "grid", gap: 24 }}>
          <Section id="cv-regles" titre="Les règles du circuit" sous={pluriel(calc.regles.length, "règle")}>
            {calc.regles.length ? (
              <Tableau colonnes={[{ libelle: "Action" }, { libelle: "Montant" }, { libelle: "Approbations", num: true }, { libelle: "Qui peut approuver" }, { libelle: "Exigé" }]}>
                {calc.regles.map((r) => (
                  <tr key={r.id}>
                    <td data-etiquette="Action" data-plein="">
                      <span style={{ fontWeight: 500 }}>{action(r.type_action)}</span>
                      <small>{r.module === "*" ? "règle commune à tous les modules" : "FILED"}</small>
                    </td>
                    <td data-etiquette="Montant">{tranche(r)}</td>
                    <td data-etiquette="Approbations" className="v2-num">
                      {r.approbations_requises}
                    </td>
                    <td data-etiquette="Qui peut approuver">{r.roles_autorises.map((x) => ROLES[x] ?? x).join(", ")}</td>
                    <td data-etiquette="Exigé">
                      <span style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                        {r.exige_commentaire ? <Badge>Commentaire</Badge> : null}
                        {r.exige_piece ? <Badge>Pièce jointe</Badge> : null}
                        {r.exige_motif !== false ? <Badge>Motif si refus</Badge> : null}
                      </span>
                    </td>
                  </tr>
                ))}
              </Tableau>
            ) : (
              <Vide icone={<CheckCheck width={20} height={20} />} titre="Aucune règle posée">Les règles d&apos;approbation se posent à l&apos;installation, avec vous.</Vide>
            )}
          </Section>

          <Section id="cv-attente" titre="En attente d'approbation" sous={pluriel(calc.attente.length, "demande")}>
            {calc.attente.length ? (
              <Tableau colonnes={[{ libelle: "Demande" }, { libelle: "Montant", num: true }, { libelle: "Approbations" }, { libelle: "Échéance" }]}>
                {calc.attente.map((d) => {
                  const c = compteApprobations(d, donnees!.approbations);
                  return (
                    <tr key={d.id}>
                      <td data-etiquette="Demande" data-plein="">
                        <Link href="/espace2/validations" style={{ fontWeight: 500 }}>
                          {action(d.type_action)}
                        </Link>
                        <small>{d.resume}</small>
                      </td>
                      <td data-etiquette="Montant" className="v2-num">
                        {d.montant !== null ? montant(d.montant, d.devise) : "—"}
                      </td>
                      <td data-etiquette="Approbations">
                        <Badge teinte={c.faites >= c.requises ? "vert" : "ambre"}>
                          {c.faites} sur {c.requises}
                        </Badge>
                      </td>
                      <td data-etiquette="Échéance">{d.echeance ? dateCourte(d.echeance) : "—"}</td>
                    </tr>
                  );
                })}
              </Tableau>
            ) : (
              <Vide icone={<CheckCheck width={20} height={20} />} titre="Rien en attente">Aucune facture n&apos;attend d&apos;approbation.</Vide>
            )}
          </Section>

          <Section id="cv-delegations" titre="Délégations en cours" sous={pluriel(calc.delegations.length, "délégation")}>
            {calc.delegations.length ? (
              <Tableau colonnes={[{ libelle: "De" }, { libelle: "À" }, { libelle: "Jusqu'au" }, { libelle: "Motif" }]}>
                {calc.delegations.map((g) => (
                  <tr key={g.id}>
                    <td data-etiquette="De">{nomDe(g.delegant, g.delegant_nom)}</td>
                    <td data-etiquette="À">{nomDe(g.delegataire, g.delegataire_nom)}</td>
                    <td data-etiquette="Jusqu'au">{dateCourte(g.fin)}</td>
                    <td data-etiquette="Motif" data-plein="">
                      {g.motif ?? "—"}
                    </td>
                  </tr>
                ))}
              </Tableau>
            ) : (
              <Vide icone={<Users width={20} height={20} />} titre="Aucune délégation">Une absence se couvre par une délégation datée, depuis « À valider ».</Vide>
            )}
          </Section>

          <Section id="cv-decisions" titre="Décisions des 30 derniers jours" sous={pluriel(calc.decidees.length, "décision")}>
            {calc.decidees.length ? (
              <Tableau colonnes={[{ libelle: "Demande" }, { libelle: "Décision" }, { libelle: "Le" }, { libelle: "Commentaire ou motif" }]}>
                {calc.decidees.map((d) => {
                  const st = STATUTS[d.statut];
                  const mot = donnees!.approbations.filter((a) => a.demande_id === d.id && a.commentaire).map((a) => a.commentaire)[0];
                  return (
                    <tr key={d.id}>
                      <td data-etiquette="Demande" data-plein="">
                        <span style={{ fontWeight: 500 }}>{action(d.type_action)}</span>
                        <small>{d.resume}</small>
                      </td>
                      <td data-etiquette="Décision">
                        <Badge teinte={st.teinte}>{st.libelle}</Badge>
                      </td>
                      <td data-etiquette="Le">{d.decide_le ? dateCourte(d.decide_le) : "—"}</td>
                      <td data-etiquette="Commentaire ou motif">{mot ?? <span className="v2-gris">—</span>}</td>
                    </tr>
                  );
                })}
              </Tableau>
            ) : (
              <Vide icone={<CheckCheck width={20} height={20} />} titre="Aucune décision récente">Les décisions prises sur FILED apparaîtront ici.</Vide>
            )}
          </Section>
        </div>
      )}
    </div>
  );
}
