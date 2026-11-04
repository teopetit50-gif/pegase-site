"use client";

/* ══════════════════════════════════════════════════════════════════════
   FILED — la page d'un document, côté comptable (04/11/2026)

   Trois sections de la page d'un document (TableauFiled.tsx), dans les
   briques de la page d'un projet (lin-projet-h2, lin-projet-liste) :
     · « Références citées » : la commande, le bon de livraison et le
       contrat lus sur la pièce (filed_factures.refs) — promesse FILED n° 31 ;
     · « Imputation » : le compte du plan comptable, le centre de coût et
       l'exercice que porte la facture (filed_imputations, filed_centres_cout,
       filed_factures_exercices), avec la mention d'une pièce reçue après la
       clôture — promesses FILED n° 37 et 45 ;
     · « Piste d'audit » : « Reconstituer la piste d'audit » et « Vérifier
       l'archive », par les portes filed_piste_audit et
       filed_verifier_archive (a4_05) — promesse FILED n° 48.
   En exemple, aucun geste n'appelle une porte : la piste est reconstituée
   du dossier en mémoire, la vérification rend un résultat d'exemple.
   ══════════════════════════════════════════════════════════════════════ */

import { useEffect, useState } from "react";
import { FileSearch, ShieldCheck } from "lucide-react";
import { Loader } from "@/components/ui/loader";
import { montant, nombreFr } from "@/components/espace/format";
import { CENTRES_COUT_EXEMPLE, EXERCICE_DE_EXEMPLE, IMPUTATIONS_EXEMPLE } from "@/components/espace/exemples/filed";
import { chargerImputation, pisteAudit, verifierArchive, type ExerciceLu, type ImputationLue, type LignePiste, type VerificationArchive } from "@/components/espace/filed/portes";
import type { DossierFiled, Facture } from "@/components/espace/types";

type Source = "exemple" | "reelle";

const dateHeure = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString("fr-FR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: iso.length === 10 ? "UTC" : undefined }) : "—";

/* ——— Références citées (promesse FILED n° 31) ——— */
const REFS: [string, string][] = [
  ["commande", "Commande"],
  ["bon_livraison", "Bon de livraison"],
  ["contrat", "Contrat"],
];
export function References({ fac }: { fac: Facture }) {
  const refs = (fac.refs ?? {}) as Record<string, unknown>;
  const lues = REFS.filter(([k]) => typeof refs[k] === "string" && refs[k]);
  return (
    <>
      <h3 className="lin-projet-h2">Références citées</h3>
      <ul className="lin-projet-liste filed-lignes-actions">
        {REFS.map(([k, lib]) => {
          const v = typeof refs[k] === "string" ? (refs[k] as string) : null;
          return (
            <li key={k}>
              <span>{lib}</span>
              <span className={v ? "lin-meta" : "lin-meta lin-props-vide"}>{v ?? "non citée"}</span>
            </li>
          );
        })}
      </ul>
      <p className="lin-maj-texte lin-maj-gris">
        {lues.length
          ? "Les références de commande, de bon de livraison et de contrat sont lues telles qu'elles figurent sur la pièce ; la commande citée sert au rapprochement."
          : "Aucune référence de commande, de bon de livraison ni de contrat n'est citée sur cette pièce."}
      </p>
    </>
  );
}

/* ——— Imputation : compte, centre de coût, exercice (promesses FILED n° 37 et 45) ——— */
const STATUTS_IMPUTATION: Record<string, string> = { proposee: "proposée par FILED", validee: "validée" };
const ORIGINES: Record<string, string> = { apprise: "apprise sur les écritures passées", recurrente: "charge récurrente", saisie: "posée par une personne" };

export function Imputation({ dossier, source }: { dossier: DossierFiled; source: Source }) {
  const fac = dossier.facture!;
  const [reel, setReel] = useState<{ lignes: ImputationLue[]; exercice: ExerciceLu | null } | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  useEffect(() => {
    if (source !== "reelle") return;
    let actif = true;
    chargerImputation(fac.id)
      .then((r) => actif && setReel(r))
      .catch((e) => actif && setErreur(e instanceof Error ? e.message : "La base n'a pas répondu."));
    return () => {
      actif = false;
    };
  }, [source, fac.id]);

  let lignes: ImputationLue[] | null;
  let exercice: ExerciceLu | null;
  if (source === "exemple") {
    const x = IMPUTATIONS_EXEMPLE[dossier.document.reference];
    const c = x?.centre ? CENTRES_COUT_EXEMPLE.find((k) => k.code === x.centre) : null;
    lignes = x
      ? [{ rang: 1, compte: x.compte, compte_libelle: x.compte_libelle, centre: x.centre, centre_libelle: c?.libelle ?? null, montant_ht: fac.montant_ht, statut: x.statut, origine: x.origine, confiance: x.confiance, mention: x.mention ?? null }]
      : [];
    exercice = EXERCICE_DE_EXEMPLE(dossier.document.reference, dossier.document.entite_id, fac.date_emission);
  } else {
    lignes = reel?.lignes ?? null;
    exercice = reel?.exercice ?? null;
  }
  return (
    <>
      <h3 className="lin-projet-h2">Imputation</h3>
      {erreur ? (
        <p className="lin-maj-texte lin-maj-gris">L&apos;imputation n&apos;a pas pu être lue : {erreur}</p>
      ) : !lignes ? (
        <p className="lin-maj-texte lin-maj-gris">Lecture de l&apos;imputation…</p>
      ) : (
        <ul className="lin-projet-liste filed-lignes-actions">
          {lignes.length ? (
            lignes.map((l) => (
              <li key={l.rang} style={{ flexWrap: "wrap" }}>
                <span>
                  Compte {l.compte}
                  {l.compte_libelle ? ` · ${l.compte_libelle}` : ""}
                </span>
                <span className="lin-meta">{l.montant_ht !== null ? `${montant(l.montant_ht, fac.devise)} HT` : ""}</span>
              </li>
            ))
          ) : (
            <li>
              <span>Compte du plan comptable</span>
              <span className="lin-meta lin-props-vide">pas encore imputée</span>
            </li>
          )}
          {lignes.map((l) => (
            <li key={`centre-${l.rang}`}>
              <span>Centre de coût</span>
              <span className={l.centre ? "lin-meta" : "lin-meta lin-props-vide"}>{l.centre ? `${l.centre}${l.centre_libelle ? ` — ${l.centre_libelle}` : ""}` : "aucun"}</span>
            </li>
          ))}
          {lignes.map((l) => (
            <li key={`statut-${l.rang}`}>
              <span>{ORIGINES[l.origine] ? `Imputation ${ORIGINES[l.origine]}` : "Imputation"}</span>
              <span className="lin-meta">
                {STATUTS_IMPUTATION[l.statut] ?? l.statut}
                {l.statut === "proposee" && l.confiance !== null ? ` · confiance ${nombreFr(Math.round(l.confiance * 100))} %` : ""}
              </span>
            </li>
          ))}
          <li>
            <span>Exercice</span>
            <span className={exercice?.libelle ? "lin-meta" : "lin-meta lin-props-vide"}>
              {exercice?.libelle ? `${exercice.libelle}${exercice.orientee ? " · orientée vers l'exercice suivant" : ""}` : "aucun exercice ouvert"}
            </span>
          </li>
        </ul>
      )}
      {exercice?.mention ? <p className="lin-maj-texte">{exercice.mention}</p> : null}
      {lignes?.some((l) => l.statut === "proposee") ? (
        <p className="lin-maj-texte lin-maj-gris">Une imputation proposée n&apos;écrit rien : une personne la valide, ligne par ligne, avant toute écriture.</p>
      ) : null}
    </>
  );
}

/* ——— Piste d'audit et vérification d'archive (promesse FILED n° 48) ——— */

/* une empreinte d'exemple, stable pour un même document (64 caractères hexadécimaux) */
function empreinteExemple(graine: string): string {
  let h = 2166136261;
  let s = "";
  for (let tour = 0; s.length < 64; tour++) {
    for (const c of `${graine}:${tour}`) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
    s += h.toString(16).padStart(8, "0");
  }
  return s.slice(0, 64);
}
const ARCHIVEES = new Set(["validee", "comptabilisee"]);
const quandArchive = (d: DossierFiled) => d.historique.find((h) => ["validee", "integration", "classement"].includes(h.etape))?.survenu_le ?? d.document.traite_le ?? d.document.recu_le;
const numeroJournal = (d: DossierFiled) => 380 + (parseInt(d.document.reference.slice(-2), 10) || 0) * 3;

function pisteExemple(d: DossierFiled): LignePiste[] {
  const l: LignePiste[] = [];
  l.push({ survenu_le: d.document.recu_le, source: "document", etape: "recu", message: `Pièce reçue (${d.document.reference}), ${d.document.source}.`, acteur: d.document.expediteur ?? "FILED", detail: { nom_fichier: d.document.nom_fichier } });
  for (const h of d.historique) l.push({ survenu_le: h.survenu_le, source: "historique", etape: h.etape, message: h.message, acteur: h.acteur_libelle ?? (h.acteur_type === "systeme" ? "FILED" : h.acteur_type), detail: h.detail });
  const controle = d.facture?.controle_le ?? d.document.recu_le;
  for (const c of d.controles) l.push({ survenu_le: controle, source: "controle", etape: c.code, message: `[${c.gravite}/${c.resultat}] ${c.message}`, acteur: "FILED", detail: null });
  const imp = IMPUTATIONS_EXEMPLE[d.document.reference];
  if (imp) l.push({ survenu_le: controle, source: "imputation", etape: imp.statut, message: `Imputation ${imp.statut} (${imp.origine}) : compte ${imp.compte}${imp.centre ? `, centre ${imp.centre}` : ""}, ${montant(d.facture?.montant_ht ?? 0)} HT.`, acteur: "FILED", detail: null });
  if (d.facture && ARCHIVEES.has(d.facture.statut)) {
    const le = quandArchive(d);
    const emp = empreinteExemple(d.document.id);
    l.push({ survenu_le: le, source: "archive", etape: "archivee", message: `Archive version 1 : empreinte ${emp}.`, acteur: "FILED", detail: null });
    l.push({ survenu_le: le, source: "journal", etape: "filed.archive", message: `Journal n° ${numeroJournal(d)} : filed.archive.`, acteur: "FILED", detail: null });
  }
  return l.sort((a, b) => a.survenu_le.localeCompare(b.survenu_le) || a.source.localeCompare(b.source));
}
function verificationExemple(d: DossierFiled): VerificationArchive {
  if (!d.facture || !ARCHIVEES.has(d.facture.statut)) return { archivee: false, integre: null, motif: "Facture pas encore archivée" };
  const emp = empreinteExemple(d.document.id);
  return { archivee: true, integre: true, version: 1, version_courante: d.facture.version, empreinte_archive: emp, empreinte_recalculee: emp, journal: numeroJournal(d), journal_porte_empreinte: true, archive_le: quandArchive(d) };
}

const SOURCES_PISTE: Record<string, string> = { document: "Réception", historique: "Dossier", controle: "Contrôle", validation: "Validation", imputation: "Imputation", archive: "Archive", journal: "Journal opposable" };

export function PisteAudit({ dossier, source }: { dossier: DossierFiled; source: Source }) {
  const fac = dossier.facture!;
  const [piste, setPiste] = useState<LignePiste[] | null>(null);
  const [verif, setVerif] = useState<VerificationArchive | null>(null);
  const [envoi, setEnvoi] = useState<"piste" | "archive" | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [tout, setTout] = useState(false);

  async function reconstituer() {
    setErreur(null);
    setEnvoi("piste");
    try {
      setPiste(source === "reelle" ? await pisteAudit(fac.id) : (await new Promise((r) => setTimeout(r, 250)), pisteExemple(dossier)));
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base n'a pas répondu.");
    } finally {
      setEnvoi(null);
    }
  }
  async function verifier() {
    setErreur(null);
    setEnvoi("archive");
    try {
      setVerif(source === "reelle" ? await verifierArchive(fac.id) : (await new Promise((r) => setTimeout(r, 250)), verificationExemple(dossier)));
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base n'a pas répondu.");
    } finally {
      setEnvoi(null);
    }
  }

  const visibles = piste ? (tout ? piste : piste.slice(-8)) : [];
  return (
    <>
      <h3 className="lin-projet-h2">Piste d&apos;audit</h3>
      <p className="lin-maj-texte lin-maj-gris">
        Tout ce qui est arrivé à la facture, dans l&apos;ordre du temps : réception, lectures, contrôles, décisions, imputation, archive et lignes du journal opposable. L&apos;archive lie le fichier, les valeurs lues et le
        numéro de réception par une empreinte SHA-256 inscrite au journal.
      </p>
      <div className="filed-audit-gestes" style={{ display: "flex", flexWrap: "wrap", gap: 8, margin: "8px 0" }}>
        <button type="button" className="v2-btn v2-btn--petit" disabled={!!envoi} onClick={() => void reconstituer()}>
          {envoi === "piste" ? <Loader variant="spin" /> : <FileSearch width={14} height={14} aria-hidden="true" />} Reconstituer la piste d&apos;audit
        </button>
        <button type="button" className="v2-btn v2-btn--petit" disabled={!!envoi} onClick={() => void verifier()}>
          {envoi === "archive" ? <Loader variant="spin" /> : <ShieldCheck width={14} height={14} aria-hidden="true" />} Vérifier l&apos;archive
        </button>
      </div>
      {erreur ? (
        <p className="lin-maj-texte" role="alert">
          <strong>Refusé par la base.</strong> {erreur}
        </p>
      ) : null}
      {verif ? (
        <p className="lin-maj-texte" role="status">
          {!verif.archivee ? (
            <>
              <strong>Pas encore archivée.</strong> L&apos;archive à valeur probante est posée quand la facture est validée ; {verif.motif ? verif.motif.toLowerCase() : "rien à vérifier pour l'instant"}.
            </>
          ) : verif.integre ? (
            <>
              <strong>Archive intègre.</strong> L&apos;empreinte recalculée ({verif.empreinte_recalculee?.slice(0, 16)}…) est celle inscrite le {dateHeure(verif.archive_le)}
              {verif.journal ? ` à la ligne n° ${verif.journal} du journal opposable` : ""}, version {verif.version ?? 1}.{source === "exemple" ? " (Résultat d'exemple : aucune porte n'est appelée.)" : ""}
            </>
          ) : (
            <>
              <strong>Archive altérée.</strong> L&apos;empreinte recalculée ({verif.empreinte_recalculee?.slice(0, 16)}…) ne retrouve pas celle inscrite ({verif.empreinte_archive?.slice(0, 16)}…)
              {verif.journal_porte_empreinte === false ? ", et le journal ne la porte pas" : ""}. Signalez-le avant toute transmission.
            </>
          )}
        </p>
      ) : null}
      {piste ? (
        piste.length ? (
          <>
            <ul className="lin-projet-liste filed-lignes-actions" aria-label="Piste d'audit">
              {visibles.map((x, i) => (
                <li key={`${x.survenu_le}-${x.source}-${i}`}>
                  <span>
                    <span className="lin-meta">{SOURCES_PISTE[x.source] ?? x.source} · </span>
                    {x.message}
                  </span>
                  <span className="lin-meta">
                    {dateHeure(x.survenu_le)}
                    {x.acteur ? ` · ${x.acteur}` : ""}
                  </span>
                </li>
              ))}
            </ul>
            {piste.length > visibles.length || tout ? (
              <button type="button" className="lin-maj-lien" onClick={() => setTout((v) => !v)}>
                {tout ? "Montrer les 8 dernières lignes" : `Montrer les ${piste.length} lignes`}
              </button>
            ) : null}
            {source === "exemple" ? <p className="lin-maj-texte lin-maj-gris">Piste d&apos;exemple, reconstituée du dossier en mémoire : aucune porte n&apos;est appelée.</p> : null}
          </>
        ) : (
          <p className="lin-maj-texte lin-maj-gris">Aucune ligne dans la piste d&apos;audit de cette facture.</p>
        )
      ) : null}
    </>
  );
}
