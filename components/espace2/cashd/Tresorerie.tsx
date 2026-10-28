"use client";

/* ══════════════════════════════════════════════════════════════════════
   CASHD — la trésorerie sur la page « Reporting » de Plain (28/10/2026)

   La vue « Trésorerie » de l'écran de travail (components/espace/cashd/
   EcranCashd.tsx), reprise geste pour geste dans les briques de Rapports.tsx :
     · la balance âgée (encours, échu, par tranche, crédits), la prévision
       d'encaissement (cashd_prevision), le pilotage (taux de réponse par
       palier, arrêtés de la balance téléchargeables) ;
     · les taux de change (TauxChange : la BCE ou le vôtre, saisie d'un taux) ;
     · les règlements à rapprocher (factures probables, lettrage) ;
     · en tête, dans « Actions » : le tableur de la balance, « Écrire les
       relances du jour » (base réelle) et « Déposer un export » (la même
       fenêtre de dépôt).
   Deux sources : l'exemple (joué en mémoire, les gestes se voient) ou la
   base réelle (portes.ts, sous RLS, relue en temps réel).
   ══════════════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useMemo, useState } from "react";
import { FileUp } from "lucide-react";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import { useSource } from "@/components/espace/source";
import { useTempsReel } from "@/components/espace/tempsReel";
import { Avis } from "@/components/espace/ui";
import { dateCourte, dateHeure, montant } from "@/components/espace/format";
import { etatPiece, jourParis, tableauDe } from "@/components/espace/cashd/calcul";
import { exporterBalance } from "@/components/espace/cashd/tableur";
import { DERNIER_IMPORT_EXEMPLE, FICHES_EXEMPLE, REGLAGES_EXEMPLE, SANS_COMPTE_EXEMPLE } from "@/components/espace/cashd/exemples";
import { TRANCHES, libellePalier } from "@/components/espace/cashd/etats";
import { JEUX, LIBELLES_CHAMPS, lireDepot, type Jeu } from "@/components/espace/cashd/depot";
import * as portes from "@/components/espace/cashd/portes";
import { TAUX_EXEMPLE } from "@/components/espace/cashd/TauxChange";
import type { Fiche, Proposition, ReglementEtat, Tableau } from "@/components/espace/cashd/types";
import { AvisRapport, CarteRapport, CourbeRapport, Rapport, SectionRapport, TableauRapport, pluriel, type Serie } from "../lin/Rapports";
import { lienCompte } from "./donnees";
import Link from "next/link";

type Reel = { client: portes.MonClient | null; tableau: Tableau | null };
const pct = (v: number | null) => (v === null ? "—" : `${String(v).replace(".", ",")} %`);

function nombre(t: string): number {
  const s = t.replace(/[\s  €]/g, "").replace(",", ".");
  const n = Number(s);
  return s && Number.isFinite(n) && n > 0 ? n : NaN;
}

export default function Tresorerie() {
  const { source } = useSource();
  const [fiches, setFiches] = useState<Fiche[]>(FICHES_EXEMPLE);
  const [sansCompte, setSansCompte] = useState<ReglementEtat[]>(SANS_COMPTE_EXEMPLE);
  const [reel, setReel] = useState<Reel | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [fait, setFait] = useState<string | null>(null);
  const [previsionReelle, setPrevisionReelle] = useState<portes.Prevision | null>(null);
  const [pilotageReel, setPilotageReel] = useState<{ reponses: portes.Reponse[]; arretes: portes.Arrete[] } | null>(null);

  const charger = useCallback(async () => {
    await Promise.resolve();
    setErreur(null);
    setReel(null);
    try {
      const client = await portes.monClient();
      if (!client) {
        setReel({ client: null, tableau: null });
        return;
      }
      const tableau = await portes.chargerTableau(client.client_id);
      setReel({ client, tableau });
      setPrevisionReelle(await portes.prevision(client.client_id).catch(() => null));
      setPilotageReel(await portes.chargerPilotage(client.client_id).catch(() => null));
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base n'a pas répondu.");
      setReel({ client: null, tableau: null });
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
      const tableau = await portes.chargerTableau(client.client_id);
      setReel((prev) => (prev ? { ...prev, tableau } : prev));
    } catch {
      /* la prochaine lecture à la main dira l'erreur */
    }
  }, [reel?.client]);
  useTempsReel(["cashd_factures", "cashd_reglements", "cashd_relances", "cashd_comptes"], source === "reelle", relire);

  const tableau: Tableau | null = useMemo(() => {
    if (source === "exemple") return tableauDe(fiches, { reglages: REGLAGES_EXEMPLE, dernier_import: DERNIER_IMPORT_EXEMPLE }, sansCompte);
    return reel?.tableau ?? null;
  }, [source, fiches, sansCompte, reel]);
  const t = tableau?.totaux;
  const client = reel?.client?.client_id ?? null;

  /* le pilotage : taux de réponse par palier et arrêtés de la balance (exemple : les relances parties de l'exemple) */
  const pilotage = useMemo(() => {
    if (source === "reelle") return pilotageReel;
    const premier = `${jourParis().slice(0, 8)}01`;
    return {
      reponses: [
        { palier: "rappel", envoyees: 14, suivies: 9, taux_pct: 64.3 },
        { palier: "relance", envoyees: 6, suivies: 3, taux_pct: 50 },
        { palier: "mise_en_demeure", envoyees: 2, suivies: 2, taux_pct: 100 },
      ] as portes.Reponse[],
      arretes: tableau ? [{ jour: premier, balance: tableau.comptes, totaux: { encours: tableau.totaux.encours, echu: tableau.totaux.echu, en_litige: tableau.totaux.en_litige } }] : [],
    };
  }, [source, pilotageReel, tableau]);
  /* la prévision : la porte en base réelle ; en exemple, l'échéance de chaque pièce ouverte (même règle, sans retard habituel) */
  const prevision = useMemo(() => {
    if (source === "reelle") return previsionReelle;
    const jour = jourParis();
    const dans = (n: number) => {
      const d = new Date(`${jour}T12:00:00Z`);
      d.setUTCDate(d.getUTCDate() + n);
      return d.toISOString().slice(0, 10);
    };
    const ouvertes = fiches
      .filter((f) => f.compte.statut !== "litige" && f.compte.statut !== "recouvrement" && f.compte.statut !== "hors_perimetre")
      .flatMap((f) => f.pieces.map((p) => etatPiece(p)).filter((p) => (p.nature === "facture" || p.nature === "acompte") && p.statut === "ouverte" && p.reste_du > 0));
    const somme = (limite: string) => ouvertes.filter((p) => (p.echeance ?? jour) <= limite).reduce((s, p) => s + p.reste_du - (p.montant_conteste ?? 0), 0);
    return { a_30_jours: somme(dans(30)), a_60_jours: somme(dans(60)), au_dela: 0, tenu_a_part: 0 };
  }, [source, previsionReelle, fiches]);

  /* ——— préparer maintenant (base réelle) ——— */
  const [prepare, setPrepare] = useState(false);
  const preparer = async () => {
    if (!reel?.client) return;
    setPrepare(true);
    setErreur(null);
    try {
      const r = await portes.preparerMaintenant(reel.client.client_id);
      await relire();
      setFait(
        `${r.preparees} relance${r.preparees > 1 ? "s" : ""} écrite${r.preparees > 1 ? "s" : ""}${r.bloquees ? `, ${r.bloquees} arrêtée${r.bloquees > 1 ? "s" : ""} (voir leur motif)` : ""}. Elles attendent votre validation.`,
      );
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
    setFiches((prev) =>
      prev.map((y) =>
        y.compte.id !== f.compte.id
          ? y
          : {
              ...y,
              pieces: y.pieces.map((p) => (p.id === factureId ? { ...p, regle: p.regle + r.a_imputer, statut: p.montant_ttc - p.regle - r.a_imputer - p.avoirs_imputes <= 0.005 ? "soldee" : p.statut } : p)),
              reglements: [...y.reglements, { ...r, compte_id: y.compte.id, impute: r.a_imputer, a_imputer: 0 }],
            },
      ),
    );
    setSansCompte((prev) => prev.filter((x) => x.id !== r.id));
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
        setFait(
          `Exemple : ${lecture.lignes.length} ligne${lecture.lignes.length > 1 ? "s" : ""} lue${lecture.lignes.length > 1 ? "s" : ""}, rien n'est envoyé. En base réelle, elles entrent par la porte cashd_importer.`,
        );
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
          (r.ecartees.length
            ? `. ${r.ecartees.length} écartée${r.ecartees.length > 1 ? "s" : ""} : ${r.ecartees
                .slice(0, 3)
                .map((x) => `ligne ${x.ligne + 1} (${x.motif})`)
                .join(", ")}${r.ecartees.length > 3 ? "…" : ""}`
            : "") +
          (r.avoirs_non_imputes?.length
            ? `. ${r.avoirs_non_imputes.length} avoir${r.avoirs_non_imputes.length > 1 ? "s" : ""} non imputé${r.avoirs_non_imputes.length > 1 ? "s" : ""}, facture visée inconnue : ${r.avoirs_non_imputes
                .slice(0, 3)
                .map((x) => `${x.numero} sur ${x.vise}`)
                .join(", ")}${r.avoirs_non_imputes.length > 3 ? "…" : ""}`
            : "") +
          (r.incoherentes?.length
            ? `. ${r.incoherentes.length} facture${r.incoherentes.length > 1 ? "s" : ""} au total incohérent, relance suspendue : ${r.incoherentes
                .slice(0, 3)
                .map((x) => `${x.numero} (${x.motif})`)
                .join(", ")}${r.incoherentes.length > 3 ? "…" : ""}`
            : "") +
          ".",
      );
      setDepot(false);
    } catch (e) {
      setErreurDepot(e instanceof Error ? e.message : "Le dépôt a été refusé.");
    } finally {
      setEnvoiDepot(false);
    }
  };

  /* ——— les taux de change (TauxChange, c2_15 / c2_16) ——— */
  const [taux, setTaux] = useState<portes.TauxConnu[]>(source === "exemple" ? TAUX_EXEMPLE.map((x) => ({ ...x, jour: jourParis() })) : []);
  const [f, setF] = useState({ devise: "", jour: jourParis(), taux: "" });
  const [envoiTaux, setEnvoiTaux] = useState(false);
  const [erreurTaux, setErreurTaux] = useState<string | null>(null);
  const [faitTaux, setFaitTaux] = useState<string | null>(null);
  const chargerTaux = useCallback(async () => {
    if (source !== "reelle" || !client) return;
    try {
      setTaux(await portes.chargerTaux(client));
    } catch (e) {
      setErreurTaux(e instanceof Error ? e.message : "Les taux n'ont pas pu être lus.");
    }
  }, [source, client]);
  useEffect(() => {
    const x = window.setTimeout(() => void chargerTaux(), 0);
    return () => window.clearTimeout(x);
  }, [chargerTaux]);
  const devise = f.devise.trim().toUpperCase();
  const tauxSaisi = nombre(f.taux);
  const tauxValide = /^[A-Z]{3}$/.test(devise) && devise !== "EUR" && !Number.isNaN(tauxSaisi) && !!f.jour && f.jour <= jourParis();
  const enregistrerTaux = async () => {
    setEnvoiTaux(true);
    setErreurTaux(null);
    setFaitTaux(null);
    try {
      if (source === "reelle") {
        if (!client) throw new Error("Aucun compte rattaché à cette session.");
        await portes.poserTaux(client, devise, f.jour, tauxSaisi);
        await chargerTaux();
      } else {
        setTaux((prev) => [...prev.filter((x) => x.devise !== devise), { devise, jour: f.jour, taux: tauxSaisi, source: "saisie" as const }].sort((a, b) => a.devise.localeCompare(b.devise)));
      }
      setFaitTaux(`Taux enregistré${source === "exemple" ? " (exemple)" : ""} : 1 ${devise} = ${String(tauxSaisi).replace(".", ",")} € le ${dateCourte(f.jour)}. Il l'emporte sur la BCE ce jour-là.`);
      setF({ devise: "", jour: jourParis(), taux: "" });
    } catch (e) {
      setErreurTaux(e instanceof Error ? e.message : "La base a refusé ce taux.");
    } finally {
      setEnvoiTaux(false);
    }
  };

  /* ——— les séries ——— */
  const serieTranches: Serie = { etiquettes: TRANCHES.map((x) => (x.cle === "echu_plus_90" ? "+ 90 j" : x.libelle)), valeurs: TRANCHES.map((x) => (t ? t[x.cle] : 0)) };
  const seriePrevision: Serie = prevision
    ? { etiquettes: ["Aujourd'hui", "À 30 jours", "À 60 jours", "Au-delà"], valeurs: [0, prevision.a_30_jours, prevision.a_60_jours, prevision.a_60_jours + prevision.au_dela] }
    : { etiquettes: [], valeurs: [] };
  const reponses = pilotage?.reponses ?? [];
  const serieReponses: Serie = { etiquettes: reponses.map((x) => libellePalier(x.palier)), valeurs: reponses.map((x) => x.taux_pct ?? 0) };
  const envoyees = reponses.reduce((s, x) => s + x.envoyees, 0);
  const suivies = reponses.reduce((s, x) => s + x.suivies, 0);
  const aImputer = tableau?.a_imputer ?? [];
  const chargement = source === "reelle" && !reel;
  const essai = tableau?.reglages?.mode !== "reel";

  return (
    <>
      <Rapport
        titre="Trésorerie"
        periodes={false}
        granularites={false}
        actions={[
          { cle: "tableur", libelle: "Balance âgée en tableur", action: () => exporterBalance(tableau?.comptes ?? [], jourParis()) },
          ...(source === "reelle" && reel?.client ? [{ cle: "preparer", libelle: prepare ? "Écriture en cours…" : "Écrire les relances du jour", inactif: prepare, action: () => void preparer() }] : []),
          { cle: "depot", libelle: "Déposer un export", action: ouvrirDepot },
          { cle: "debiteurs", libelle: "Débiteurs et relances", href: "/espace2/cashd/suivi?vue=debiteurs", externe: true, section: true },
          { cle: "encaissements", libelle: "Encaissements", href: "/espace2/cashd/encaissements", externe: true },
        ]}
        avis={
          <>
            {fait ? (
              <AvisRapport teinte="vert" role="status">
                <strong>C&apos;est fait.</strong> {fait}
              </AvisRapport>
            ) : null}
            {erreur ? (
              <AvisRapport teinte="rouge" role="alert">
                <strong>La base réelle a répondu autrement.</strong> {erreur}
              </AvisRapport>
            ) : null}
            {source === "reelle" && reel && !reel.tableau?.reglages && !erreur ? (
              <AvisRapport>CASHD n&apos;est pas encore installé pour votre organisation : Omega l&apos;installe en mode essai, puis vous déposez le premier export de votre facturier.</AvisRapport>
            ) : null}
          </>
        }
      >
        <SectionRapport
          titre="Vue d'ensemble"
          meta={
            chargement ? "Lecture de l'encours…" : tableau?.dernier_import ? `Facturier relu le ${dateHeure(tableau.dernier_import)}${essai && tableau.reglages ? " · mode essai" : ""}` : "Aucun export lu pour l'instant"
          }
        >
          <CarteRapport
            titre="Encours"
            info="La balance âgée de tout l'encours, recalculée à chaque relecture du facturier, chaque matin."
            chiffre={montant(t?.encours ?? 0)}
            legende={t ? `dont ${montant(t.echu)} échus${t.credits > 0 ? ` · ${montant(t.credits)} de crédits` : ""}` : "—"}
            etat={t?.echu_plus_90 ? "orange" : t?.echu ? "vert" : "gris"}
            etatTitre={t?.echu_plus_90 ? "Des retards de plus de 90 jours" : undefined}
          >
            <CourbeRapport libelle="L'encours par tranche de retard" serie={serieTranches} vide="Aucun encours" />
          </CarteRapport>
          <CarteRapport
            titre="Encaissements attendus"
            info="Les factures ouvertes à leur échéance, hors litiges et recouvrement ; en base réelle, avec le retard habituel de chaque compte."
            chiffre={montant(prevision?.a_30_jours ?? 0)}
            legende={prevision ? `à 30 jours · ${montant(prevision.a_60_jours)} à 60 jours${prevision.tenu_a_part > 0 ? ` · ${montant(prevision.tenu_a_part)} tenus à part` : ""}` : "prévision indisponible"}
            etat={prevision ? "vert" : "gris"}
          >
            <CourbeRapport libelle="Encaissements attendus, en cumul" serie={seriePrevision} vide="Aucune échéance" />
          </CarteRapport>
          <CarteRapport
            titre="Taux de réponse"
            info="Une relance est « suivie » d'un règlement ou d'une réponse dans les quinze jours."
            chiffre={pct(envoyees ? Math.round((suivies / envoyees) * 1000) / 10 : null)}
            legende={envoyees ? `${suivies} sur ${pluriel(envoyees, "relance partie", "relances parties")}` : "aucune relance partie"}
            etat={envoyees ? "vert" : "gris"}
          >
            <CourbeRapport libelle="Taux de réponse par palier" serie={serieReponses} format={(v) => pct(Math.round(v * 10) / 10)} vide="Aucune relance partie" />
          </CarteRapport>
        </SectionRapport>

        <SectionRapport titre="Balance âgée">
          <CarteRapport
            taille="large"
            titre="Par tranche de retard"
            info="Le non échu, puis les retards de 1 à 30, 31 à 60, 61 à 90 jours et au-delà."
            chiffre={montant(t?.echu ?? 0)}
            legende={t ? `échus sur ${pluriel(t.comptes_en_retard ?? 0, "compte en retard", "comptes en retard")}` : "—"}
            etat={t?.echu ? "orange" : "vert"}
            droite={
              <button type="button" className="rap-lien" onClick={() => exporterBalance(tableau?.comptes ?? [], jourParis())}>
                Tableur
              </button>
            }
          >
            {t && t.encours > 0 ? (
              <TableauRapport libelle="Balance âgée par tranche" colonnes={[{ libelle: "Tranche" }, { libelle: "Montant", num: true }, { libelle: "Part", num: true }]}>
                {TRANCHES.map((x) => (
                  <tr key={x.cle}>
                    <td>{x.libelle}</td>
                    <td className="rap-num">{montant(t[x.cle])}</td>
                    <td className="rap-num">
                      <span className="rap-part">
                        <i aria-hidden="true">
                          <b style={{ width: `${Math.min(100, (t[x.cle] / Math.max(t.encours, 0.01)) * 100)}%` }} />
                        </i>
                        <span style={{ minWidth: 44, textAlign: "right" }}>{Math.round((t[x.cle] / Math.max(t.encours, 0.01)) * 100)} %</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </TableauRapport>
            ) : (
              <p className="rap-sous">{chargement ? "Lecture de l'encours…" : "Aucun encours : la balance âgée, la prévision d'encaissement et les arrêtés s'affichent dès le premier export lu."}</p>
            )}
          </CarteRapport>
          <CarteRapport
            taille="large"
            titre="Arrêtés de la balance"
            info="La balance figée au jour du mois réglé ; chaque arrêté se télécharge en tableur."
            chiffre={String(pilotage?.arretes.length ?? 0)}
            legende={pilotage?.arretes.length ? `le dernier au ${dateCourte(pilotage.arretes[0].jour)}` : "le premier se prend au jour du mois réglé"}
            etat={pilotage?.arretes.length ? "vert" : "gris"}
          >
            {pilotage?.arretes.length ? (
              <TableauRapport libelle="Arrêtés de la balance" colonnes={[{ libelle: "Au" }, { libelle: "Échus", num: true }, { libelle: "Encours", num: true }, { libelle: "", num: true }]}>
                {pilotage.arretes.map((a) => (
                  <tr key={a.jour}>
                    <td>{dateCourte(a.jour)}</td>
                    <td className="rap-num">{montant(a.totaux.echu)}</td>
                    <td className="rap-num">{montant(a.totaux.encours)}</td>
                    <td className="rap-num">
                      <button type="button" className="rap-lien" onClick={() => exporterBalance(a.balance, a.jour)}>
                        Tableur
                      </button>
                    </td>
                  </tr>
                ))}
              </TableauRapport>
            ) : (
              <p className="rap-sous">Le premier arrêté se prend au jour du mois réglé.</p>
            )}
          </CarteRapport>
        </SectionRapport>

        <SectionRapport titre="Taux de change" meta="Les factures en devise sont suivies en euros au taux le plus récent : la BCE chaque jour ouvré, ou le vôtre">
          <CarteRapport
            taille="large"
            titre="Taux retenus"
            info="Celui de la BCE, chargé chaque jour ouvré, ou celui que l'organisation saisit, qui l'emporte le même jour."
            chiffre={String(taux.length)}
            legende={taux.length ? pluriel(taux.length, "devise") : "aucune facture en devise étrangère"}
            etat={taux.some((x) => x.taux === null) ? "orange" : "vert"}
            etatTitre={taux.some((x) => x.taux === null) ? "Un taux à saisir" : undefined}
          >
            {taux.length ? (
              <TableauRapport libelle="Taux de change retenus" colonnes={[{ libelle: "Devise" }, { libelle: "Taux", num: true }, { libelle: "Source" }, { libelle: "Du" }]}>
                {taux.map((x) => (
                  <tr key={x.devise}>
                    <td style={{ fontWeight: 500 }}>{x.devise}</td>
                    <td className="rap-num">{x.taux === null ? "aucun taux" : `1 ${x.devise} = ${String(x.taux).replace(".", ",")} €`}</td>
                    <td>
                      <span className="rap-pastille" data-teinte={x.source === "saisie" ? "bleu" : x.source ? undefined : "orange"}>
                        {x.source === "bce" ? "BCE" : x.source === "saisie" ? "Saisi" : "À saisir"}
                      </span>
                    </td>
                    <td>{x.jour ? dateCourte(x.jour) : "—"}</td>
                  </tr>
                ))}
              </TableauRapport>
            ) : (
              <p className="rap-sous">Aucune facture en devise étrangère.</p>
            )}
          </CarteRapport>
          <CarteRapport taille="large" titre="Saisir un taux" info="Votre taux l'emporte sur celui de la BCE le jour saisi." chiffre="1 unité" legende="= … € le jour choisi" etat="gris">
            <div className="rap-form">
              <div className="rap-form-ligne">
                <label className="rap-libelle">
                  Devise
                  <input className="rap-champ" maxLength={3} value={f.devise} onChange={(e) => setF({ ...f, devise: e.target.value })} placeholder="USD" />
                </label>
                <label className="rap-libelle">
                  Jour
                  <input className="rap-champ" type="date" max={jourParis()} value={f.jour} onChange={(e) => setF({ ...f, jour: e.target.value })} />
                </label>
                <label className="rap-libelle">
                  1 unité = … €
                  <input className="rap-champ" inputMode="decimal" value={f.taux} onChange={(e) => setF({ ...f, taux: e.target.value })} placeholder="0,9195" />
                </label>
              </div>
              <div className="rap-gestes">
                <button type="button" className="rap-btn rap-btn--petit" disabled={!tauxValide || envoiTaux} onClick={() => void enregistrerTaux()}>
                  Saisir ce taux
                </button>
                {erreurTaux ? (
                  <span className="rap-sous" role="alert">
                    {erreurTaux}
                  </span>
                ) : null}
                {faitTaux ? (
                  <span className="rap-sous" role="status">
                    {faitTaux}
                  </span>
                ) : null}
              </div>
            </div>
          </CarteRapport>
        </SectionRapport>

        <SectionRapport titre="Règlements à rapprocher" meta={aImputer.length ? "La relance du compte concerné attend" : undefined}>
          <CarteRapport
            taille="pleine"
            titre="À rapprocher"
            info="Un règlement reçu qui ne solde pas encore une facture : les factures probables se proposent, le lettrage coupe la relance prête."
            chiffre={montant(aImputer.reduce((s, x) => s + x.a_imputer, 0))}
            legende={pluriel(aImputer.length, "règlement")}
            etat={aImputer.length ? "orange" : "vert"}
            etatTitre={aImputer.length ? "Des règlements attendent leur facture" : "Tout est imputé"}
          >
            {aImputer.length ? (
              <TableauRapport libelle="Règlements à rapprocher" colonnes={[{ libelle: "Reçu le" }, { libelle: "Libellé" }, { libelle: "Compte" }, { libelle: "À imputer", num: true }, { libelle: "Factures probables" }]}>
                {aImputer.map((r) => (
                  <tr key={r.id}>
                    <td>{dateCourte(r.recu_le)}</td>
                    <td>{r.libelle ?? r.reference ?? "sans référence"}</td>
                    <td>
                      {r.compte_id ? (
                        <Link href={lienCompte(r.compte_id)}>{r.compte ?? "Compte"}</Link>
                      ) : (
                        <span className="rap-pastille" data-teinte="orange">
                          Sans compte
                        </span>
                      )}
                    </td>
                    <td className="rap-num" style={{ fontWeight: 500 }}>
                      {montant(r.a_imputer)}
                    </td>
                    <td>
                      {propositions[r.id] ? (
                        propositions[r.id].length === 0 ? (
                          <small>Aucune facture ouverte de ce montant : rapprochez-le depuis la fiche du compte.</small>
                        ) : (
                          <span className="rap-gestes">
                            {propositions[r.id].map((p, i) => (
                              <span key={i} className="rap-gestes">
                                <span>{p.factures.map((x) => `${x.numero}${x.compte ? ` (${x.compte})` : ""} — ${montant(x.reste_du)}`).join(" + ")}</span>
                                {p.factures.length === 1 ? (
                                  <button type="button" className="rap-btn rap-btn--petit" onClick={() => void lettrer(r, p.factures[0].id)}>
                                    Lettrer
                                  </button>
                                ) : null}
                              </span>
                            ))}
                          </span>
                        )
                      ) : (
                        <button type="button" className="rap-lien" onClick={() => void proposer(r)}>
                          Factures probables
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </TableauRapport>
            ) : (
              <p className="rap-sous">{chargement ? "Lecture…" : "Tout est imputé : chaque règlement reçu solde la facture qu'il vise."}</p>
            )}
          </CarteRapport>
        </SectionRapport>
      </Rapport>

      <Dialog open={depot} onOpenChange={(o) => !o && setDepot(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone>
              <FileUp width={18} height={18} aria-hidden="true" />
            </DialogIcone>
            <DialogTitle>Déposer un export du facturier</DialogTitle>
            <DialogDescription>Un fichier CSV tel que votre logiciel l&apos;exporte : les colonnes sont reconnues par leur en-tête. Rien n&apos;est envoyé avant que vous ayez vu le compte des lignes.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              <label className="rv-libelle">
                Ce que contient le fichier
                <select className="rv-champ" value={jeu} onChange={(e) => setJeu(e.target.value as Jeu)}>
                  {JEUX.map((x) => (
                    <option key={x.cle} value={x.cle}>
                      {x.libelle}
                    </option>
                  ))}
                </select>
              </label>
              <p className="c2-sous">{JEUX.find((x) => x.cle === jeu)?.aide}</p>
              <label className="rv-libelle">
                Fichier CSV
                <input className="rv-champ" type="file" accept=".csv,.txt,.tsv,text/csv" onChange={(e) => void lireFichier(e.target.files?.[0])} />
              </label>
              <label className="rv-libelle">
                Ou collez les lignes (en-têtes compris)
                <textarea
                  className="rv-champ"
                  rows={4}
                  value={texte}
                  onChange={(e) => {
                    setTexte(e.target.value);
                    setNomFichier("");
                  }}
                  placeholder="N° facture;Client;Date de facture;Échéance;Montant TTC;Reste dû"
                />
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
              {erreurDepot ? (
                <Avis teinte="rouge" role="alert">
                  {erreurDepot}
                </Avis>
              ) : null}
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
