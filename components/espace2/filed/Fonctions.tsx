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
import { SbConseiller, type SbGravite, type SbProbleme } from "../sb/Conseiller";
import { SbBandeau, SbGroupe, SbLigneVide, SbListe, SbOutils, SbRecherche, SbRegle, SbTableau } from "../sb/Sb";
import { CheckCheck, FileText, Users } from "lucide-react";
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
import { Badge, Note, Squelette } from "../ui";
import { useMaintenant } from "../horloge";

const JOUR = 86_400_000;
const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? "s" : ""}`;

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

/* 22/10 — le gabarit « Advisors » de Supabase (../sb/Conseiller) : chaque
   point de contrôle devient un problème, rangé par gravité comme
   Errors / Warnings / Info ; un clic ouvre son détail à droite. */
const GRAVITES_CONTROLE: SbGravite[] = [
  { cle: "bloquant", libelle: "Bloquants", teinte: "rouge", unite: ["point bloquant", "points bloquants"] },
  { cle: "verifier", libelle: "À vérifier", teinte: "ambre", unite: ["point à vérifier", "points à vérifier"] },
  { cle: "info", libelle: "Pour information", teinte: "vert", unite: ["information", "informations"] },
];

export function Controles() {
  const { donnees, erreur } = useControles();

  const problemes = useMemo<SbProbleme[] | null>(() => {
    if (!donnees) return null;
    const { pieces, vue } = donnees;
    const nom = (id: string) => vue.fournisseurs.find((f) => f.id === id)?.nom ?? "Fournisseur inconnu";
    const liste: SbProbleme[] = [];
    /* un IBAN proposé chez un fournisseur qui en a déjà un validé : un changement de coordonnées */
    for (const i of vue.ibans.filter((x) => x.statut === "propose")) {
      const change = vue.ibans.some((x) => x.fournisseur_id === i.fournisseur_id && x.id !== i.id && (x.statut === "valide" || x.statut === "revoque"));
      liste.push({
        cle: `iban-${i.id}`,
        gravite: change ? "bloquant" : "verifier",
        type: change ? "Changement de RIB" : "Premier IBAN",
        element: <span className="sb-mono">{nom(i.fournisseur_id)}</span>,
        description: change ? `Un nouvel IBAN (${i.iban_masque}) remplace un IBAN validé : à confirmer avant tout paiement.` : `IBAN reçu le ${dateCourte(i.propose_le)}, à confirmer une fois.`,
        detail: (
          <>
            <h3>Fournisseur</h3>
            <p className="sb-texte--fort">{nom(i.fournisseur_id)}</p>
            <h3>IBAN proposé</h3>
            <p className="v2-mono">{i.iban_masque}</p>
            <h3>Pourquoi</h3>
            <p>
              {change
                ? "Un changement de coordonnées bancaires chez un fournisseur connu est la première porte d'entrée de la fraude au virement. Aucun paiement ne part vers ce nouvel IBAN tant qu'une personne ne l'a pas confirmé, idéalement par un appel au numéro habituel du fournisseur."
                : "Un fournisseur payé pour la première fois : son IBAN est confirmé une fois, puis il sert pour les paiements suivants."}
            </p>
            <Link href="/espace2/filed/fournisseurs" className="v2-btn" style={{ width: "fit-content" }}>
              Ouvrir Fournisseurs
            </Link>
          </>
        ),
      });
    }
    for (const p of pieces) {
      const f = p.facture;
      if (!f || ["validee", "comptabilisee", "refusee"].includes(f.statut)) continue;
      if (!(f.anomalies.length > 0 || f.nb_bloquants > 0 || f.nb_attention > 0)) continue;
      const familles = Array.from(new Set(f.anomalies.map(familleDe)));
      const bloquant = f.nb_bloquants > 0 || f.anomalies.some((c) => c.startsWith("fournisseur.iban") || c.startsWith("doublon"));
      liste.push({
        cle: `piece-${p.document.id}`,
        gravite: bloquant ? "bloquant" : "verifier",
        type: familles[0] ? `Contrôle « ${familles[0]} »` : "Pièce en anomalie",
        element: <span className="sb-mono">{p.document.reference}</span>,
        description: `${p.fournisseur?.nom ?? "Fournisseur inconnu"} · ${montant(f.montant_ttc, f.devise)}${familles.length > 1 ? ` · ${familles.length} contrôles en défaut` : ""}`,
        detail: (
          <>
            <h3>Pièce</h3>
            <p className="sb-texte--fort">
              {p.document.reference} · reçue le {dateCourte(p.document.recu_le)}
            </p>
            <h3>Fournisseur et montant</h3>
            <p>
              {p.fournisseur?.nom ?? "Fournisseur inconnu"} · {montant(f.montant_ttc, f.devise)}
            </p>
            <h3>Contrôles en défaut</h3>
            <p>{familles.length ? familles.join(", ") : "Voir la pièce"}</p>
            <p>{bloquant ? "La pièce n'est ni classée ni payée tant qu'une personne n'a pas levé le point, avec son motif." : "La pièce peut avancer ; le point est à vérifier avant le paiement."}</p>
            <Link href={lienPiece(p)} className="v2-btn" style={{ width: "fit-content" }}>
              Ouvrir la pièce
            </Link>
          </>
        ),
      });
    }
    for (const f of vue.fournisseurs.filter((x) => x.statut === "a_confirmer" || x.statut === "bloque" || x.identite_verdict?.resultat === "invalide")) {
      const grave = f.statut === "bloque" || f.identite_verdict?.resultat === "invalide";
      liste.push({
        cle: `four-${f.id}`,
        gravite: grave ? "bloquant" : "verifier",
        type: f.statut === "bloque" ? "Fournisseur bloqué" : f.identite_verdict?.resultat === "invalide" ? "Introuvable au registre" : "Fournisseur à confirmer",
        element: <span className="sb-mono">{f.nom}</span>,
        description:
          f.statut === "bloque"
            ? "Ne pas payer : le fournisseur est bloqué."
            : f.identite_verdict?.resultat === "invalide"
              ? `Le SIREN ${f.siren ?? "lu"} n'est pas trouvé au registre public.`
              : "Jamais vu : une personne le confirme une fois.",
        detail: (
          <>
            <h3>Fournisseur</h3>
            <p className="sb-texte--fort">{f.nom}</p>
            <h3>SIREN</h3>
            <p className="v2-mono">{f.siren ?? "—"}</p>
            <h3>Identité</h3>
            <p>{f.identite_verifiee_le ? `Vérifiée le ${dateCourte(f.identite_verifiee_le)}` : "Pas encore vérifiée"}</p>
            <Link href="/espace2/filed/fournisseurs" className="v2-btn" style={{ width: "fit-content" }}>
              Ouvrir Fournisseurs
            </Link>
          </>
        ),
      });
    }
    for (const p of pieces.filter((x) => x.document.etat === "doublon")) {
      liste.push({
        cle: `doublon-${p.document.id}`,
        gravite: "info",
        type: "Doublon écarté",
        element: <span className="sb-mono">{p.document.reference}</span>,
        description: `${p.fournisseur?.nom ?? "Fournisseur inconnu"} · reconnu même renommé ou rescanné, il n'est ni classé ni payé deux fois.`,
        detail: (
          <>
            <h3>Pièce</h3>
            <p className="sb-texte--fort">{p.document.reference}</p>
            <p>FILED a reconnu une pièce déjà reçue : elle reste visible, marquée doublon, et ne compte pas dans les montants.</p>
            <Link href={lienPiece(p)} className="v2-btn" style={{ width: "fit-content" }}>
              Ouvrir la pièce
            </Link>
          </>
        ),
      });
    }
    return liste;
  }, [donnees]);

  return (
    <>
      {erreur ? (
        <div style={{ padding: "16px 24px 0" }}>
          <Note teinte="rouge" role="alert">
            <strong>La base réelle n&apos;a pas répondu.</strong> {erreur}
          </Note>
        </div>
      ) : null}
      <SbConseiller
        titre="Contrôles et fraude"
        gravites={GRAVITES_CONTROLE}
        problemes={problemes}
        colonnes={["Point", "Élément", "Description"]}
        vide={(g) =>
          g.cle === "bloquant"
            ? { titre: "Aucun point bloquant", texte: "Aucune pièce, aucun IBAN ni aucun fournisseur n'empêche un paiement." }
            : g.cle === "verifier"
              ? { titre: "Rien à vérifier", texte: "Toutes les pièces en cours ont passé leurs contrôles." }
              : { titre: "Rien à signaler", texte: "Aucun doublon écarté pour l'instant." }
        }
        actions={
          <>
            <Link href="/espace2/filed/fournisseurs" className="v2-btn">
              <Users width={14} height={14} aria-hidden="true" /> Fournisseurs
            </Link>
            <Link href="/espace2/filed" className="v2-btn">
              <FileText width={14} height={14} aria-hidden="true" /> Documents reçus
            </Link>
          </>
        }
        pied={[
          { titre: "Ce qui est contrôlé", texte: "Les totaux et la TVA, les doublons même renommés, l'identité du fournisseur au registre public et ses coordonnées bancaires." },
          { titre: "Lever un point", texte: "Un point se lève depuis la pièce, avec son motif ; au-delà de la règle, il passe par « À valider »." },
          { titre: "Un changement de RIB", texte: "Il n'est jamais pris en compte sans confirmation : appelez le fournisseur au numéro que vous connaissez déjà." },
        ]}
      />
    </>
  );
}

/* ══ Circuit de validation ════════════════════════════════════════════ */

export type DonneesCircuit = { demandes: Demande[]; approbations: Approbation[]; delegations: Delegation[]; regles: Regle[] };

export const ROLES: Record<Role, string> = { gerant: "gérant", admin: "administrateur", valideur: "valideur", collaborateur: "collaborateur", lecteur: "lecteur" };
const ACTIONS: Record<string, string> = { payer_facture: "Payer une facture", valider_facture: "Valider une facture", lever_anomalie: "Lever une anomalie", valider_iban: "Confirmer un IBAN" };
export const action = (t: string | null) => (t ? (ACTIONS[t] ?? t.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase())) : "Toute action");
export const nomDe = (id: string, nom?: string) => nom ?? PERSONNES[id]?.nom ?? "Une personne de l'équipe";

export function useCircuit() {
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

export const tranche = (r: Regle) => (r.montant_max === null ? (r.montant_min > 0 ? `à partir de ${montant(r.montant_min)}` : "tout montant") : `de ${montant(r.montant_min)} à ${montant(r.montant_max)}`);

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

  const [q, setQ] = useState("");
  const r = q.trim().toLowerCase();
  const garde = (...xs: (string | null | undefined)[]) => !r || xs.some((x) => x && x.toLowerCase().includes(r));
  const parModule = calc ? [calc.regles.filter((x) => x.module === "filed"), calc.regles.filter((x) => x.module === "*")] : null;

  /* 22/10 — le gabarit « Database › Policies » de Supabase (../sb) : titre et
     description, bandeau, barre d'outils, puis une carte par « table » de
     règles (FILED, règles communes) et, dessous, les tableaux du circuit. */
  return (
    <SbListe
      titre="Circuit de validation"
      description="Qui approuve quoi : l'approbation suit le montant et l'action, celle qui a saisi ne peut pas approuver, et le motif d'un refus reste attaché à la facture."
      actions={
        <Link href="/espace2/validations" className="v2-btn">
          <CheckCheck width={14} height={14} aria-hidden="true" /> À valider
        </Link>
      }
    >
      {erreur ? (
        <Note teinte="rouge" role="alert">
          <strong>La base réelle n&apos;a pas répondu.</strong> {erreur}
        </Note>
      ) : null}
      {calc ? (
        <SbBandeau
          teinte={calc.attente.length ? "ambre" : undefined}
          titre={`${calc.attente.length} demande${calc.attente.length > 1 ? "s" : ""} en attente d'approbation · ${montant(calc.attente.reduce((s, d) => s + (d.montant ?? 0), 0))}`}
          texte={`${calc.attente.filter((d) => d.approbations_requises > 1).length} en double approbation · ${calc.delegations.length} délégation${calc.delegations.length > 1 ? "s" : ""} en cours · ${calc.decidees.length} décision${calc.decidees.length > 1 ? "s" : ""} sur 30 jours`}
        />
      ) : (
        <Squelette hauteur={80} />
      )}
      <SbOutils gauche={<SbRecherche valeur={q} changer={setQ} placeholder="Filtrer les règles et les demandes" />} />
      {!calc || !parModule ? (
        <Attente erreur={erreur} />
      ) : (
        <div className="sb-pile">
          {[
            { nom: "filed", lignes: parModule[0], aide: "Les règles propres à FILED" },
            { nom: "toutes les actions", lignes: parModule[1], aide: "La règle commune à tous les modules" },
          ].map((m) => {
            const lignes = m.lignes.filter((x) => garde(action(x.type_action), x.roles_autorises.join(" ")));
            return (
              <SbGroupe
                key={m.nom}
                nom={m.nom}
                badges={
                  <span className="sb-badge" data-teinte={lignes.length ? "vert" : undefined}>
                    {lignes.length ? `${lignes.length} règle${lignes.length > 1 ? "s" : ""}` : "aucune règle"}
                  </span>
                }
                vide={`${m.aide} : aucune pour l'instant. Les règles se posent à l'installation, avec vous.`}
              >
                {lignes.length
                  ? lignes.map((x) => (
                      <SbRegle
                        key={x.id}
                        nom={action(x.type_action)}
                        sous={tranche(x)}
                        commande={
                          <span className="sb-commande">
                            {x.approbations_requises} approbation{x.approbations_requises > 1 ? "s" : ""}
                          </span>
                        }
                        cible={<span className="sb-gris">{x.roles_autorises.map((y) => ROLES[y] ?? y).join(", ")}</span>}
                        fin={
                          <span style={{ display: "flex", flexWrap: "wrap", gap: 4, justifyContent: "flex-end" }}>
                            {x.exige_commentaire ? <span className="sb-commande">commentaire</span> : null}
                            {x.exige_piece ? <span className="sb-commande">pièce</span> : null}
                            {x.exige_motif !== false ? <span className="sb-commande">motif</span> : null}
                          </span>
                        }
                      />
                    ))
                  : null}
              </SbGroupe>
            );
          })}

          <p className="sb-pile-titre">En attente d&apos;approbation</p>
          <SbTableau
            colonnes={[{ libelle: "Demande" }, { libelle: "Montant", num: true }, { libelle: "Approbations" }, { libelle: "Échéance" }]}
            pied={pluriel(calc.attente.filter((d) => garde(d.resume, d.type_action)).length, "demande")}
          >
            {calc.attente.filter((d) => garde(d.resume, d.type_action)).length ? (
              calc.attente
                .filter((d) => garde(d.resume, d.type_action))
                .map((d) => {
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
                })
            ) : (
              <SbLigneVide colonnes={4} titre="Rien en attente" texte="Aucune facture n'attend d'approbation." />
            )}
          </SbTableau>

          <p className="sb-pile-titre">Délégations en cours</p>
          <SbTableau colonnes={[{ libelle: "De" }, { libelle: "À" }, { libelle: "Jusqu'au" }, { libelle: "Motif" }]} pied={pluriel(calc.delegations.length, "délégation")}>
            {calc.delegations.length ? (
              calc.delegations.map((g) => (
                <tr key={g.id}>
                  <td data-etiquette="De">{nomDe(g.delegant, g.delegant_nom)}</td>
                  <td data-etiquette="À">{nomDe(g.delegataire, g.delegataire_nom)}</td>
                  <td data-etiquette="Jusqu'au">{dateCourte(g.fin)}</td>
                  <td data-etiquette="Motif" data-plein="">
                    {g.motif ?? "—"}
                  </td>
                </tr>
              ))
            ) : (
              <SbLigneVide colonnes={4} titre="Aucune délégation" texte="Une absence se couvre par une délégation datée, depuis « À valider »." />
            )}
          </SbTableau>

          <p className="sb-pile-titre">Décisions des 30 derniers jours</p>
          <SbTableau colonnes={[{ libelle: "Demande" }, { libelle: "Décision" }, { libelle: "Le" }, { libelle: "Commentaire ou motif" }]} pied={pluriel(calc.decidees.length, "décision")}>
            {calc.decidees.length ? (
              calc.decidees.map((d) => {
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
              })
            ) : (
              <SbLigneVide colonnes={4} titre="Aucune décision récente" texte="Les décisions prises sur FILED apparaîtront ici." />
            )}
          </SbTableau>
        </div>
      )}
    </SbListe>
  );
}
