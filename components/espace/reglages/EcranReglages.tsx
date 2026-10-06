"use client";

/* ══════════════════════════════════════════════════════════════════════
   /espace/reglages — vos données (06/10/2026, A3 ; audit des promesses § 0)

   Trois gestes, dans cet ordre :
     · « Exporter mon journal » : le journal opposable en CSV, à tout moment
       (gérants et admins, ceux qui le lisent) ;
     · « Exporter toutes mes données » : l'export complet en un clic (gérant) ;
     · « Préparer l'effacement » : la liste de ce qui sera effacé à la sortie
       (gérant). Rien ne s'efface d'ici.
   Voir reglages/donnees.ts pour les portes et ce qui manque encore.
   ══════════════════════════════════════════════════════════════════════ */

import { useEffect, useState } from "react";
import { Copy, Download, FileSpreadsheet, Trash2 } from "lucide-react";
import { Loader } from "@/components/ui/loader";
import { EXEMPLE_CLIENT_ID, ilYa } from "../exemples/socle";
import { useSource } from "../source";
import { Avis, Ruban } from "../ui";
import { dateHeure } from "../format";
import { monClient } from "../filed/portes";
import {
  NonBranche,
  apercuEffacement,
  demanderExportComplet,
  journalEnCsv,
  lireJournal,
  octets,
  telechargerTexte,
  type ApercuEffacement,
  type ExportComplet,
  type LigneJournal,
} from "./donnees";

const jour = () => new Date().toISOString().slice(0, 10).replace(/-/g, "");

function journalExemple(): LigneJournal[] {
  const l = (id: number, quand: string, acteur: string, action: string, objet_type: string, objet_id: string, donnees: Record<string, unknown>): LigneJournal => ({
    id, survenu_le: quand, entite_id: null, acteur_type: acteur === "Omega" ? "systeme" : "utilisateur", acteur_id: null, acteur_libelle: acteur, action, objet_type, objet_id, donnees,
    hash_precedent: id > 1 ? `\\x${(id - 1).toString(16).padStart(64, "0")}` : null, hash: `\\x${id.toString(16).padStart(64, "0")}`,
  });
  return [
    l(1, ilYa(6, 9), "Omega", "filed.document.recu", "filed_documents", "R2026-000014", { source: "courriel" }),
    l(2, ilYa(6, 9), "Omega", "filed.controles.passes", "filed_factures", "PD-2026-1187", { bloquants: 0 }),
    l(3, ilYa(5, 15), "Claire Martin", "demande.approuvee", "demandes", "Payer R2026-000014", { commentaire: "OK ; livraison reçue" }),
    l(4, ilYa(3, 11), "Claire Martin", "filed.fournisseur.confirme", "filed_fournisseurs", "Papeterie Durand", {}),
    l(5, ilYa(1, 10), "Sofia Carvalho", "filed.document.depose", "filed_documents", "R2026-000016", { nom_fichier: "IV-2026-1187.pdf" }),
    l(6, ilYa(0, 8), "Omega", "point.envoye", "points", "Point du matin", { destinataires: 2 }),
  ];
}
function exportExemple(): ExportComplet {
  return {
    export_id: "00000000-0000-4000-8000-0000000e0001",
    lien: "#exemple",
    mot_de_passe: "vT7q-Lm2x-9KpR-c4Hw",
    expire_le: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    nb_fichiers: 12,
    fichiers_manquants: 1,
    octets: 4_718_592,
    sha256: "3f9a0c6e1b7d24c58e0f1a2b3c4d5e6f708192a3b4c5d6e7f8091a2b3c4d5e6f7",
  };
}

export default function EcranReglages() {
  const { source } = useSource();
  const [compte, setCompte] = useState<{ client_id: string; role: string | null } | null>(null);
  const [lu, setLu] = useState(false);
  const [envoi, setEnvoi] = useState<"journal" | "export" | "effacement" | null>(null);
  const [progres, setProgres] = useState(0);
  const [faitJournal, setFaitJournal] = useState<string | null>(null);
  const [exportFait, setExportFait] = useState<ExportComplet | null>(null);
  const [manifeste, setManifeste] = useState<ApercuEffacement | null>(null);
  const [mdpCopie, setMdpCopie] = useState(false);
  const [erreur, setErreur] = useState<{ ou: "journal" | "export" | "effacement"; texte: string; branche: boolean } | null>(null);

  useEffect(() => {
    if (source !== "reelle") return;
    let vivant = true;
    monClient()
      .then((c) => { if (vivant) { setCompte(c ? { client_id: c.client_id, role: c.role } : null); setLu(true); } })
      .catch(() => { if (vivant) setLu(true); });
    return () => { vivant = false; };
  }, [source]);

  const role = source === "exemple" ? "gerant" : (compte?.role ?? null);
  const client = source === "exemple" ? EXEMPLE_CLIENT_ID : (compte?.client_id ?? null);
  const lecteurJournal = role === "gerant" || role === "admin";
  /* export complet et aperçu de l'effacement : gérant ou admin (demander_export_complet, apercu_effacement) */
  const exporteur = role === "gerant" || role === "admin";

  const echec = (ou: "journal" | "export" | "effacement", e: unknown) =>
    setErreur({ ou, texte: e instanceof NonBranche ? "" : e instanceof Error ? e.message : "La base n'a pas répondu.", branche: !(e instanceof NonBranche) });

  const exporterJournal = async () => {
    if (!client) return;
    setEnvoi("journal"); setErreur(null); setFaitJournal(null); setProgres(0);
    try {
      const lignes = source === "exemple" ? journalExemple() : await lireJournal(client, setProgres);
      const nom = `journal-omega-${jour()}.csv`;
      telechargerTexte(nom, journalEnCsv(lignes), "text/csv;charset=utf-8");
      setFaitJournal(lignes.length
        ? `${nom} téléchargé : ${lignes.length} ligne${lignes.length > 1 ? "s" : ""}, du ${dateHeure(lignes[0].survenu_le)} au ${dateHeure(lignes[lignes.length - 1].survenu_le)}.`
        : `${nom} téléchargé : le journal est encore vide.`);
    } catch (e) {
      echec("journal", e);
    } finally {
      setEnvoi(null);
    }
  };
  const exporterTout = async () => {
    if (!client) return;
    setEnvoi("export"); setErreur(null); setExportFait(null);
    try {
      setMdpCopie(false);
      setExportFait(source === "exemple" ? exportExemple() : await demanderExportComplet(client));
    } catch (e) {
      echec("export", e);
    } finally {
      setEnvoi(null);
    }
  };
  const preparer = async () => {
    if (!client) return;
    setEnvoi("effacement"); setErreur(null); setManifeste(null);
    try {
      setManifeste(source === "exemple"
        ? {
            client: EXEMPLE_CLIENT_ID, lignes: 1284, comptes: 4, calcule_le: new Date().toISOString(), rien_n_est_efface: true,
            tables: [{ table: "filed_documents", ordre: 3, lignes: 12 }, { table: "filed_factures", ordre: 3, lignes: 11 }, { table: "demandes", ordre: 2, lignes: 9 }, { table: "journal_opposable", ordre: 4, lignes: 1180 }, { table: "receptions", ordre: 2, lignes: 13 }],
            fichiers: { liste: [], nombre: 12, octets: 4_718_592 },
          }
        : await apercuEffacement(client));
    } catch (e) {
      echec("effacement", e);
    } finally {
      setEnvoi(null);
    }
  };

  const erreurDe = (ou: "journal" | "export" | "effacement") =>
    erreur?.ou === ou ? (
      erreur.branche ? (
        <Avis teinte="rouge" role="alert"><strong>{ou === "export" ? "L'export n'a pas abouti." : "Refusé par la base."}</strong> {erreur.texte}</Avis>
      ) : (
        <Avis teinte="ambre" role="status"><strong>Pas encore branché sur cette base.</strong> La porte de ce geste n&apos;est pas encore posée ; l&apos;équipe Omega la pose, puis le bouton fonctionne tel quel.</Avis>
      )
    ) : null;

  const sansDroit = (qui: string) =>
    source === "reelle" && !lu ? (
      <p className="esp-kpi-sous" style={{ margin: 0 }} role="status">Lecture de votre rôle…</p>
    ) : (
      <p className="esp-kpi-sous" style={{ margin: 0 }}>Réservé {qui}.{role ? ` Votre rôle : ${role}.` : " Aucun compte lu pour cette session."}</p>
    );
  const copierMdp = async () => {
    if (!exportFait) return;
    try {
      await navigator.clipboard.writeText(exportFait.mot_de_passe);
      setMdpCopie(true);
    } catch {
      setMdpCopie(false);
    }
  };

  return (
    <>
      <div className="esp-tete" data-arrivee="">
        <div>
          <h1 className="esp-titre">Réglages</h1>
          <p className="esp-sous">Vos données vous appartiennent : le journal de tout ce qui a été fait, exportable à tout moment ; l&apos;export complet en un clic ; à la sortie, l&apos;export puis l&apos;effacement.</p>
        </div>
        <div className="esp-item-haut">
          <Ruban source={source} />
        </div>
      </div>

      <div style={{ display: "grid", gap: 16 }}>
        <section className="esp-carte" aria-labelledby="titre-journal">
          <div className="esp-carte-tete">
            <h2 className="esp-carte-titre" id="titre-journal">Le journal</h2>
          </div>
          <div className="esp-carte-corps" style={{ display: "grid", gap: 12 }}>
            <p className="esp-kpi-sous" style={{ margin: 0 }}>
              Chaque action, de chaque personne et d&apos;Omega, y est écrite à la suite des autres, avec son empreinte : une ligne modifiée ou retirée se verrait. Le fichier CSV s&apos;ouvre dans un tableur ; il porte les empreintes pour qu&apos;un tiers puisse vérifier la chaîne.
            </p>
            {lecteurJournal ? (
              <div className="esp-actions">
                <button type="button" className="r-btn r-btn--noir" disabled={!!envoi || !client} onClick={() => void exporterJournal()}>
                  {envoi === "journal" ? <Loader variant="spin" /> : <FileSpreadsheet width={15} height={15} aria-hidden="true" />} Exporter mon journal (CSV)
                </button>
                {envoi === "journal" && progres ? <span className="esp-kpi-sous" role="status">{progres} lignes lues…</span> : null}
              </div>
            ) : sansDroit("aux gérants et administrateurs, qui lisent le journal")}
            {faitJournal ? <Avis teinte="vert" role="status"><strong>C&apos;est fait.</strong> {faitJournal}</Avis> : null}
            {erreurDe("journal")}
          </div>
        </section>

        <section className="esp-carte" aria-labelledby="titre-export">
          <div className="esp-carte-tete">
            <h2 className="esp-carte-titre" id="titre-export">Export complet</h2>
          </div>
          <div className="esp-carte-corps" style={{ display: "grid", gap: 12 }}>
            <p className="esp-kpi-sous" style={{ margin: 0 }}>
              Toutes les données de votre organisation, table par table, et tous vos fichiers (pièces, PDF), réunis dans une archive zip chiffrée. Le lien de téléchargement vaut 24 heures.
            </p>
            {exporteur ? (
              <div className="esp-actions">
                <button type="button" className="r-btn r-btn--noir" disabled={!!envoi || !client} onClick={() => void exporterTout()}>
                  {envoi === "export" ? <Loader variant="spin" /> : <Download width={15} height={15} aria-hidden="true" />} {envoi === "export" ? "Préparation de l'archive…" : "Exporter toutes mes données"}
                </button>
              </div>
            ) : sansDroit("au gérant et aux administrateurs de l'organisation")}
            {exportFait ? (
              <Avis teinte="vert" role="status">
                <strong>Votre archive est prête.</strong> {exportFait.nb_fichiers} fichier{exportFait.nb_fichiers > 1 ? "s" : ""}, {octets(exportFait.octets)}.{" "}
                {exportFait.fichiers_manquants ? `${exportFait.fichiers_manquants} fichier${exportFait.fichiers_manquants > 1 ? "s" : ""} introuvable${exportFait.fichiers_manquants > 1 ? "s" : ""} dans le stockage : ${exportFait.fichiers_manquants > 1 ? "ils sont listés" : "il est listé"} dans l'archive. ` : ""}
                <br />
                <a href={exportFait.lien} target="_blank" rel="noopener noreferrer" download>Télécharger l&apos;archive (zip)</a> — lien valable jusqu&apos;au {dateHeure(exportFait.expire_le)}.
              </Avis>
            ) : null}
            {exportFait ? (
              <div className="esp-carte" style={{ padding: 14, display: "grid", gap: 8 }}>
                <div className="esp-section-titre">Mot de passe de l&apos;archive</div>
                <div className="esp-item-haut">
                  <span className="esp-mono" style={{ fontSize: 17, letterSpacing: 0.5 }}>{exportFait.mot_de_passe}</span>
                  <button type="button" className="esp-lien-bouton" onClick={() => void copierMdp()}><Copy width={12} height={12} aria-hidden="true" /> {mdpCopie ? "Mot de passe copié" : "Copier le mot de passe"}</button>
                </div>
                <Avis teinte="ambre">Notez-le maintenant : il n&apos;est montré qu&apos;une fois et n&apos;est gardé nulle part. Sans lui, l&apos;archive ne s&apos;ouvre pas.</Avis>
                <p className="esp-kpi-sous" style={{ margin: 0 }}>
                  L&apos;archive est chiffrée en AES-256 : l&apos;archiveur intégré de macOS ne l&apos;ouvre pas. Utilisez 7-Zip (Windows), Keka (Mac) ou WinRAR. Empreinte SHA-256 de l&apos;archive : <span className="esp-mono">{exportFait.sha256}</span>
                </p>
              </div>
            ) : null}
            {erreurDe("export")}
          </div>
        </section>

        <section className="esp-carte" aria-labelledby="titre-sortie">
          <div className="esp-carte-tete">
            <h2 className="esp-carte-titre" id="titre-sortie">Quitter Omega</h2>
          </div>
          <div className="esp-carte-corps" style={{ display: "grid", gap: 12 }}>
            <p className="esp-kpi-sous" style={{ margin: 0 }}>
              À la sortie : l&apos;export complet d&apos;abord, puis l&apos;effacement. « Préparer l&apos;effacement » compte ce qui serait effacé (lignes, comptes, fichiers) ; rien ne s&apos;efface d&apos;ici : l&apos;effacement lui-même se demande à l&apos;équipe Omega, après votre export.
            </p>
            {exporteur ? (
              <div className="esp-actions">
                <button type="button" className="r-btn r-btn--fil" disabled={!!envoi || !client} onClick={() => void preparer()}>
                  {envoi === "effacement" ? <Loader variant="spin" /> : <Trash2 width={15} height={15} aria-hidden="true" />} Préparer l&apos;effacement
                </button>
              </div>
            ) : sansDroit("au gérant et aux administrateurs de l'organisation")}
            {manifeste ? (
              <Avis teinte="bleu" role="status">
                <strong>Liste prête.</strong> {manifeste.lignes ?? 0} ligne{(manifeste.lignes ?? 0) > 1 ? "s" : ""} dans {(manifeste.tables ?? []).filter((t) => t.lignes > 0).length} tables, {manifeste.comptes ?? 0} compte{(manifeste.comptes ?? 0) > 1 ? "s" : ""} et {manifeste.fichiers?.nombre ?? 0} fichier{(manifeste.fichiers?.nombre ?? 0) > 1 ? "s" : ""} ({octets(manifeste.fichiers?.octets ?? 0)}) seraient effacés. Rien n&apos;est effacé : calculé le {dateHeure(manifeste.calcule_le)}.
                {(manifeste.tables ?? []).some((t) => t.lignes > 0) ? (
                  <span style={{ display: "block", marginTop: 6 }}>
                    Les plus grosses tables : {[...(manifeste.tables ?? [])].sort((a, b) => b.lignes - a.lignes).filter((t) => t.lignes > 0).slice(0, 5).map((t) => `${t.table} (${t.lignes})`).join(", ")}.
                  </span>
                ) : null}
              </Avis>
            ) : null}
            {erreurDe("effacement")}
          </div>
        </section>
      </div>
    </>
  );
}
