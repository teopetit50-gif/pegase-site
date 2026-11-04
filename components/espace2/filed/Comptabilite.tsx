"use client";

/* ══════════════════════════════════════════════════════════════════════
   FILED — la comptabilité sur la page « Reporting » de Plain (28/10/2026)

   L'écran /espace/filed/comptabilite (components/espace/filed/
   EcranComptabilite.tsx : le FEC des achats et les comptes de FILED),
   repris geste pour geste dans les briques de Rapports.tsx :
     · trois cartes-graphiques sur les factures d'achat validées et
       comptabilisées (écritures, HT, TVA déductible), à la période et à la
       granularité de l'adresse ; l'exemple = DOSSIERS_EXEMPLE, la base réelle =
       filed_factures (chargerVueFournisseurs) ;
     · l'export du FEC : un exercice ou une période, une société ;
       filed_exporter_fec rend le fichier, téléchargé tel quel ; le bilan ;
       masqué pour le collaborateur ;
     · les comptes : les cinq rôles, modifiables par le gérant ou
       l'administrateur (filed_regler_compte_systeme), dans la même fenêtre.
   ══════════════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Pencil } from "lucide-react";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import { createClient } from "@/lib/supabase/client";
import { CENTRES_COUT_EXEMPLE, DOSSIERS_EXEMPLE, IMPUTATIONS_EXEMPLE, MENTION_EXERCICE_EXEMPLE, dossiersTransmisExemple } from "@/components/espace/exemples/filed";
import { EXEMPLE_CLIENT_ID, ENTITES } from "@/components/espace/exemples/socle";
import { useSource } from "@/components/espace/source";
import { Avis } from "@/components/espace/ui";
import { montant, nombreFr } from "@/components/espace/format";
import { COMPTES_SYSTEME, SOUS_TITRE_FEC, exporterFec, quand, reglerCompte, telecharger, type ExportFec, type RoleCompte } from "@/components/espace/filed/factureElectronique";
import { EXERCICES_EXEMPLE, fecExemple, type Compte, type Contexte } from "@/components/espace/filed/EcranComptabilite";
import { chargerCentres, chargerVueFournisseurs, monClient, type CentreLu, type FactureDuFournisseur } from "@/components/espace/filed/portes";
import ChargesReprise from "./ChargesReprise";
import { useMonte } from "../horloge";
import { exemples as exportsExemple, nature as natureExport, nomFichier as fichierExport, periode as periodeExport, type ExportFiled } from "@/components/espace/filed/ExportsFiled";
import { AvisRapport, CarteRapport, CourbeRapport, Rapport, SectionRapport, TableauRapport, pluriel, serieDatee, useParametresRapport } from "../lin/Rapports";

const annee = new Date().getFullYear();
/* 04/11 — une date calendaire (AAAA-MM-JJ) en JJ/MM/AAAA, sans glissement de fuseau */
const jourFr = (iso: string) => new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
const comptesDefaut = (): Compte[] => COMPTES_SYSTEME.map((c) => ({ role: c.role, numero: c.numero, libelle: c.defaut, regle: false }));
const COMPTABILISEES = new Set(["validee", "comptabilisee"]);
type Ecriture = { jour: string; ht: number; tva: number; ttc: number; nature: "facture" | "avoir" };

export default function Comptabilite() {
  const { source } = useSource();
  const { periode, pas, filtre, lien } = useParametresRapport();
  const [reel, setReel] = useState<Contexte | null>(null);
  const [comptesExemple, setComptesExemple] = useState<Compte[]>(comptesDefaut);
  const [erreurLecture, setErreurLecture] = useState<string | null>(null);
  const [facturesReelles, setFacturesReelles] = useState<FactureDuFournisseur[] | null>(null);

  const charger = useCallback(async () => {
    await Promise.resolve();
    setErreurLecture(null);
    try {
      const moi = await monClient();
      if (!moi) throw new Error("Aucun compte rattaché à cette session.");
      const supabase = createClient();
      const [ex, cs, vue] = await Promise.all([
        supabase.from("filed_exercices").select("id, libelle, debut, fin, statut, entite_id, cloture_le").eq("client_id", moi.client_id).order("debut", { ascending: false }),
        supabase.from("filed_comptes_systeme").select("role, numero, libelle").eq("client_id", moi.client_id),
        chargerVueFournisseurs().catch(() => null),
      ]);
      const regles = new Map(((cs.data ?? []) as { role: RoleCompte; numero: string; libelle: string }[]).map((c) => [c.role, c]));
      setReel({
        client: moi.client_id,
        role: moi.role,
        entites: moi.entites,
        exercices: (ex.data ?? []) as Contexte["exercices"],
        comptes: COMPTES_SYSTEME.map((c) => {
          const r = regles.get(c.role);
          return r ? { role: c.role, numero: r.numero, libelle: r.libelle, regle: true } : { role: c.role, numero: c.numero, libelle: c.defaut, regle: false };
        }),
      });
      setFacturesReelles(vue?.factures ?? []);
    } catch (e) {
      setErreurLecture(e instanceof Error ? e.message : "La base n'a pas répondu.");
      setReel({ client: "", role: null, entites: [], exercices: [], comptes: comptesDefaut() });
    }
  }, []);
  useEffect(() => {
    if (source !== "reelle") return;
    const t = window.setTimeout(() => void charger(), 0);
    return () => window.clearTimeout(t);
  }, [source, charger]);

  const ctx: Contexte | null = useMemo(
    () => (source === "exemple" ? { client: EXEMPLE_CLIENT_ID, role: "gerant", entites: ENTITES.map((e) => ({ id: e.id, nom: e.nom, siren: "123456789" })), exercices: EXERCICES_EXEMPLE, comptes: comptesExemple } : reel),
    [source, reel, comptesExemple],
  );
  const peutExporter = !!ctx && ctx.role !== "collaborateur";
  const peutRegler = !!ctx && (ctx.role === "gerant" || ctx.role === "admin");

  /* les écritures : les factures validées ou comptabilisées, datées de leur émission */
  const ecritures: Ecriture[] = useMemo(() => {
    if (source === "exemple")
      return DOSSIERS_EXEMPLE.filter((d) => d.facture && COMPTABILISEES.has(d.facture.statut) && d.facture.date_emission && (!filtre || d.document.entite_id === filtre)).map((d) => ({
        jour: d.facture!.date_emission!,
        ht: d.facture!.montant_ht ?? 0,
        tva: d.facture!.montant_tva ?? 0,
        ttc: d.facture!.montant_ttc ?? 0,
        nature: d.facture!.nature,
      }));
    return (facturesReelles ?? []).filter((f) => COMPTABILISEES.has(f.statut) && f.date_emission).map((f) => ({ jour: f.date_emission!, ht: (f.montant_ttc ?? 0) - 0, tva: 0, ttc: f.montant_ttc ?? 0, nature: f.nature }));
  }, [source, facturesReelles, filtre]);
  const signe = (e: Ecriture, v: number) => (e.nature === "avoir" ? -Math.abs(v) : v);
  const totalHt = ecritures.reduce((s, e) => s + signe(e, e.ht), 0);
  const totalTva = ecritures.reduce((s, e) => s + signe(e, e.tva), 0);

  /* ——— les exports programmés (filed_exports) ——— */
  const [exportsReels, setExportsReels] = useState<ExportFiled[] | null>(null);
  useEffect(() => {
    if (source !== "reelle" || !ctx?.client) return;
    let actif = true;
    void createClient()
      .from("filed_exports")
      .select("id, tableau, du, au, nb_lignes, sha256, contenu, genere_le")
      .eq("client_id", ctx.client)
      .order("genere_le", { ascending: false })
      .limit(50)
      .then(({ data }) => actif && setExportsReels((data ?? []) as ExportFiled[]));
    return () => {
      actif = false;
    };
  }, [source, ctx?.client]);
  const exportsListe = useMemo(() => (source === "exemple" ? exportsExemple() : exportsReels), [source, exportsReels]);

  /* ——— 04/11 — les dossiers transmis à la comptabilité (promesse FILED n° 11) : en exemple, les deux derniers FEC
     mensuels ; en base réelle, le dernier export de cette session (le journal des exports n'est pas relu ici) ——— */
  const monte = useMonte();
  const transmis = useMemo(() => (source === "exemple" && monte ? dossiersTransmisExemple() : []), [source, monte]);

  /* ——— 04/11 — les centres de coût et ce qui leur est imputé (promesse FILED n° 45) ——— */
  const [centresReels, setCentresReels] = useState<CentreLu[] | null>(null);
  useEffect(() => {
    if (source !== "reelle" || !ctx?.client) return;
    let actif = true;
    chargerCentres(ctx.client)
      .then((c) => actif && setCentresReels(c))
      .catch(() => actif && setCentresReels([]));
    return () => {
      actif = false;
    };
  }, [source, ctx?.client]);
  const centres: CentreLu[] | null = useMemo(() => {
    if (source !== "exemple") return centresReels;
    return CENTRES_COUT_EXEMPLE.map((c) => {
      const ds = DOSSIERS_EXEMPLE.filter((d) => d.facture && IMPUTATIONS_EXEMPLE[d.document.reference]?.centre === c.code && (!filtre || d.document.entite_id === filtre));
      const signe = (d: (typeof ds)[number]) => (d.facture!.nature === "avoir" ? -1 : 1);
      return {
        code: c.code,
        libelle: c.libelle,
        actif: true,
        nb_factures: ds.length,
        montant_ht: Math.round(ds.reduce((t, d) => t + signe(d) * (d.facture!.montant_ht ?? 0), 0) * 100) / 100,
        nb_validees: ds.filter((d) => IMPUTATIONS_EXEMPLE[d.document.reference]?.statut === "validee").length,
      };
    });
  }, [source, centresReels, filtre]);

  /* ——— 04/11 — les pièces orientées vers l'exercice suivant, par exercice clos (promesse FILED n° 37) ——— */
  const [orienteesReelles, setOrienteesReelles] = useState<Record<string, number>>({});
  useEffect(() => {
    if (source !== "reelle" || !ctx?.client) return;
    let actif = true;
    void createClient()
      .from("filed_factures_exercices")
      .select("exercice_naturel_id")
      .eq("client_id", ctx.client)
      .eq("orientee", true)
      .then(({ data }) => {
        if (!actif) return;
        const n: Record<string, number> = {};
        for (const x of (data ?? []) as { exercice_naturel_id: string | null }[]) if (x.exercice_naturel_id) n[x.exercice_naturel_id] = (n[x.exercice_naturel_id] ?? 0) + 1;
        setOrienteesReelles(n);
      });
    return () => {
      actif = false;
    };
  }, [source, ctx?.client]);
  const orientees = source === "exemple" ? ({ "ex-agence-clos": 1 } as Record<string, number>) : orienteesReelles;
  const nomSociete = (id: string | null) => (id ? (ctx?.entites.find((e) => e.id === id)?.nom ?? ENTITES.find((e) => e.id === id)?.nom ?? "Société") : "Toute l'organisation");

  /* ——— l'export ——— */
  const [entite, setEntite] = useState("");
  const [mode, setMode] = useState<"exercice" | "periode">("periode");
  const [exercice, setExercice] = useState("");
  const [du, setDu] = useState(`${annee}-01-01`);
  const [au, setAu] = useState(`${annee}-12-31`);
  const [envoi, setEnvoi] = useState(false);
  const [resultat, setResultat] = useState<(ExportFec & { le: string }) | null>(null);
  const [erreurExport, setErreurExport] = useState<{ message: string; code: string | null } | null>(null);
  const entiteChoisie = entite || ctx?.entites[0]?.id || "";
  const exportPossible = !!ctx && peutExporter && !!entiteChoisie && (mode === "exercice" ? !!exercice : !!du && !!au && du <= au);

  async function exporter() {
    if (!ctx || !entiteChoisie) return;
    setEnvoi(true);
    setErreurExport(null);
    setResultat(null);
    try {
      const r =
        source === "reelle"
          ? await exporterFec({ client: ctx.client, entite: entiteChoisie, exercice: mode === "exercice" ? exercice || null : null, du: mode === "periode" ? du : null, au: mode === "periode" ? au : null })
          : (await new Promise((res) => setTimeout(res, 300)), fecExemple(du, au));
      telecharger(r.nom_fichier, r.contenu);
      setResultat({ ...r, le: new Date().toISOString() });
    } catch (e) {
      const o = e as { message?: string; code?: string | null };
      setErreurExport({ message: o.message ?? "La base a refusé l'export.", code: o.code ?? null });
    } finally {
      setEnvoi(false);
    }
  }

  /* ——— les comptes ——— */
  const [edition, setEdition] = useState<Compte | null>(null);
  const [numero, setNumero] = useState("");
  const [libelle, setLibelle] = useState("");
  const [erreurCompte, setErreurCompte] = useState<string | null>(null);
  const [faitCompte, setFaitCompte] = useState<string | null>(null);
  const numeroOk = /^[0-9]{3,12}$/.test(numero.trim());
  const ouvrirEdition = (c: Compte) => {
    setEdition(c);
    setNumero(c.numero);
    setLibelle(c.libelle);
    setErreurCompte(null);
    setFaitCompte(null);
  };
  async function enregistrerCompte() {
    if (!ctx || !edition) return;
    setEnvoi(true);
    setErreurCompte(null);
    try {
      if (source === "reelle") {
        await reglerCompte({ client: ctx.client, role: edition.role, numero: numero.trim(), libelle: libelle.trim() });
        await charger();
      } else {
        await new Promise((r) => setTimeout(r, 250));
        setComptesExemple((cs) => cs.map((c) => (c.role === edition.role ? { ...c, numero: numero.trim(), libelle: libelle.trim(), regle: true } : c)));
      }
      setFaitCompte(`${COMPTES_SYSTEME.find((c) => c.role === edition.role)?.libelle} : ${numero.trim()} ${libelle.trim()}.`);
      setEdition(null);
    } catch (e) {
      setErreurCompte(e instanceof Error ? e.message : "La base a refusé le compte.");
    } finally {
      setEnvoi(false);
    }
  }

  const libelleRole = (role: RoleCompte) => COMPTES_SYSTEME.find((x) => x.role === role)?.libelle;

  return (
    <>
      <Rapport
        titre="Comptabilité"
        actions={[
          { cle: "fec", libelle: envoi ? "Export en cours…" : "Exporter le FEC", inactif: !exportPossible || envoi, action: () => void exporter() },
          { cle: "documents", libelle: "Documents reçus", href: "/espace2/filed", externe: true, section: true },
          { cle: "a-payer", libelle: "À payer", href: "/espace2/filed/a-payer", externe: true },
        ]}
        filtres={
          source === "exemple"
            ? [
                { cle: "toutes", libelle: "Toutes les sociétés", coche: !filtre, href: lien({ filtre: null }) },
                ...ENTITES.map((e) => ({ cle: e.id, libelle: e.nom, coche: filtre === e.id, href: lien({ filtre: e.id }) })),
              ]
            : [{ cle: "toutes", libelle: "Toutes les sociétés", coche: true, href: lien({ filtre: null }) }]
        }
        filtreLibelle={filtre ? ENTITES.find((e) => e.id === filtre)?.nom : undefined}
        avis={
          <>
            {erreurLecture ? (
              <AvisRapport teinte="rouge" role="alert">
                <strong>La base réelle n&apos;a pas répondu.</strong> {erreurLecture}
              </AvisRapport>
            ) : null}
            {faitCompte ? (
              <AvisRapport teinte="vert" role="status">
                <strong>C&apos;est fait.</strong> {faitCompte}
              </AvisRapport>
            ) : null}
          </>
        }
      >
        <SectionRapport titre="Vue d'ensemble" meta={!ctx ? "Lecture…" : "Les factures d'achat validées et comptabilisées, à leur date d'émission"}>
          <CarteRapport
            titre="Écritures d'achat"
            info="Une écriture par facture validée ou comptabilisée (journal HA), datée de son émission."
            chiffre={nombreFr(ecritures.length)}
            legende={pluriel(ecritures.filter((e) => e.nature === "avoir").length, "avoir")}
            etat={ecritures.length ? "vert" : "gris"}
          >
            <CourbeRapport
              libelle="Écritures d'achat par jour"
              serie={serieDatee(
                ecritures.map((e) => ({ jour: e.jour, valeur: 1 })),
                periode,
                pas,
                "compte",
              )}
              format={(v) => pluriel(Math.round(v), "écriture")}
            />
          </CarteRapport>
          <CarteRapport
            titre="Charges HT"
            info="Le hors-taxes des factures comptabilisées, avoirs déduits (en base réelle, le TTC des factures tant que le HT n'est pas lu)."
            chiffre={montant(totalHt)}
            legende="sur la période lue"
            etat={totalHt > 0 ? "vert" : "gris"}
          >
            <CourbeRapport
              libelle="Charges HT par jour"
              serie={serieDatee(
                ecritures.map((e) => ({ jour: e.jour, valeur: signe(e, e.ht) })),
                periode,
                pas,
              )}
            />
          </CarteRapport>
          <CarteRapport titre="TVA déductible" info="La TVA des factures comptabilisées (compte 44566), avoirs déduits." chiffre={montant(totalTva)} legende="à déduire" etat={totalTva > 0 ? "vert" : "gris"}>
            <CourbeRapport
              libelle="TVA déductible par jour"
              serie={serieDatee(
                ecritures.map((e) => ({ jour: e.jour, valeur: signe(e, e.tva) })),
                periode,
                pas,
              )}
            />
          </CarteRapport>
        </SectionRapport>

        <SectionRapport titre="Fichier des écritures comptables (FEC)" meta="Les écritures d'achats tenues par FILED : journaux Achats, Banque, Caisse">
          <CarteRapport
            taille="pleine"
            titre="Export"
            info={`${SOUS_TITRE_FEC} Un exercice ou une période, une société ; le fichier est téléchargé tel quel (UTF-8, tabulations, CRLF).`}
            chiffre={resultat ? nombreFr(resultat.lignes) : transmis[0] ? nombreFr(transmis[0].lignes) : "—"}
            legende={
              resultat
                ? `${pluriel(resultat.ecritures, "écriture")} · débit ${montant(resultat.total_debit)} = crédit ${montant(resultat.total_credit)}`
                : transmis[0]
                  ? `lignes du dernier export · dossier de ${transmis[0].mois} transmis à la comptabilité, ${transmis[0].pieces} pièces`
                  : peutExporter
                    ? "lignes du dernier export"
                    : "réservé au gérant, à l'administrateur et au valideur"
            }
            etat={resultat ? (resultat.equilibre ? "vert" : "orange") : "gris"}
            etatTitre={resultat && !resultat.equilibre ? "Une écriture déséquilibrée" : undefined}
          >
            {!ctx ? (
              <p className="rap-sous">Lecture…</p>
            ) : peutExporter ? (
              <div className="rap-form">
                <div className="rap-form-ligne">
                  <label className="rap-libelle">
                    Société
                    <select className="rap-champ" value={entiteChoisie} onChange={(e) => setEntite(e.target.value)}>
                      {ctx.entites.map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.nom}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="rap-libelle">
                    Période
                    <select className="rap-champ" value={mode} onChange={(e) => setMode(e.target.value as "exercice" | "periode")}>
                      <option value="periode">Des dates</option>
                      <option value="exercice" disabled={!ctx.exercices.length}>
                        Un exercice{ctx.exercices.length ? "" : " (aucun ouvert)"}
                      </option>
                    </select>
                  </label>
                  {mode === "exercice" ? (
                    <label className="rap-libelle">
                      Exercice
                      <select className="rap-champ" value={exercice} onChange={(e) => setExercice(e.target.value)}>
                        <option value="">Choisir…</option>
                        {ctx.exercices.map((x) => (
                          <option key={x.id} value={x.id}>
                            {x.libelle}
                            {x.statut === "cloture" ? " (clôturé)" : ""}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : (
                    <>
                      <label className="rap-libelle">
                        Du
                        <input className="rap-champ" type="date" value={du} onChange={(e) => setDu(e.target.value)} />
                      </label>
                      <label className="rap-libelle">
                        Au
                        <input className="rap-champ" type="date" value={au} onChange={(e) => setAu(e.target.value)} />
                      </label>
                    </>
                  )}
                </div>
                <div className="rap-gestes">
                  <button type="button" className="rap-btn rap-btn--petit" disabled={envoi || !exportPossible} onClick={() => void exporter()}>
                    {envoi ? <Loader variant="spin" /> : null} Exporter le FEC
                  </button>
                  {resultat ? (
                    <span className="rap-sous" role="status">
                      <strong>{resultat.nom_fichier}</strong> téléchargé : {resultat.lignes} ligne{resultat.lignes > 1 ? "s" : ""}, {resultat.ecritures} écriture{resultat.ecritures > 1 ? "s" : ""}, débit{" "}
                      {montant(resultat.total_debit)} = crédit {montant(resultat.total_credit)}.
                      {!resultat.equilibre ? ` Attention : ${resultat.ecritures_desequilibrees} écriture(s) déséquilibrée(s). Ne transmettez pas ce fichier ; signalez-le.` : ""} Export enregistré au journal le{" "}
                      {quand(resultat.le)}
                      {resultat.empreinte && resultat.empreinte !== "exemple" ? ` · empreinte ${resultat.empreinte.slice(0, 12)}…` : ""}.
                    </span>
                  ) : null}
                  {erreurExport ? (
                    <span className="rap-sous" role="alert">
                      <strong>Refusé par la base.</strong> {erreurExport.message}
                      {/SIREN/.test(erreurExport.message) ? " Le SIREN se renseigne sur la fiche de la société, dans les réglages de l'organisation." : ""}
                    </span>
                  ) : null}
                </div>
              </div>
            ) : (
              <p className="rap-sous">L&apos;export du FEC est réservé au gérant, à l&apos;administrateur et au valideur.</p>
            )}
          </CarteRapport>
        </SectionRapport>

        {/* 04/11 — les dossiers transmis : « Dossier prêt — <mois> transmis à la comptabilité, 214 pièces » (promesse FILED n° 11) */}
        {source === "exemple" ? (
          <SectionRapport titre="Dossiers transmis à la comptabilité" meta="Le FEC du mois écoulé, préparé par FILED et transmis par une personne">
            <CarteRapport
              taille="pleine"
              titre="Dossier prêt"
              info="Chaque début de mois, les pièces du mois écoulé partent en un FEC ; l'export est inscrit au journal avec son empreinte."
              chiffre={transmis[0] ? nombreFr(transmis[0].pieces) : "—"}
              legende={transmis[0] ? `pièces dans le dossier de ${transmis[0].mois}, transmis le ${quand(transmis[0].transmis_le)}` : ""}
              etat="vert"
            >
              <TableauRapport libelle="Dossiers transmis à la comptabilité" colonnes={[{ libelle: "Dossier" }, { libelle: "Période" }, { libelle: "Pièces", num: true }, { libelle: "Lignes du FEC", num: true }, { libelle: "Total débit = crédit", num: true }, { libelle: "Transmis" }]}>
                {transmis.map((x) => (
                  <tr key={x.du}>
                    <td style={{ fontWeight: 500 }}>Dossier prêt — {x.mois.replace(/^./, (c) => c.toUpperCase())} transmis à la comptabilité, {x.pieces} pièces</td>
                    <td>
                      {jourFr(x.du)} → {jourFr(x.au)}
                    </td>
                    <td style={{ fontVariantNumeric: "tabular-nums", textAlign: "right" }}>{nombreFr(x.pieces)}</td>
                    <td style={{ fontVariantNumeric: "tabular-nums", textAlign: "right" }}>{nombreFr(x.lignes)}</td>
                    <td style={{ fontVariantNumeric: "tabular-nums", textAlign: "right" }}>{montant(x.total)}</td>
                    <td>
                      {quand(x.transmis_le)} · {x.par}
                    </td>
                  </tr>
                ))}
              </TableauRapport>
            </CarteRapport>
          </SectionRapport>
        ) : null}

        {/* 04/11 — les exercices et leur clôture : une pièce reçue après est orientée vers l'exercice suivant (promesse FILED n° 37) */}
        <SectionRapport titre="Exercices" meta="Une pièce reçue après la clôture est orientée vers l'exercice suivant, avec sa mention">
          <CarteRapport
            taille="pleine"
            titre="Exercices comptables"
            info="filed_exercices : un exercice par société (ou pour toute l'organisation) ; clos à une date, il ne reçoit plus de pièce."
            chiffre={ctx ? nombreFr(ctx.exercices.filter((x) => x.statut === "cloture").length) : "—"}
            legende={ctx ? `clos sur ${pluriel(ctx.exercices.length, "exercice")}` : ""}
            etat="vert"
          >
            {!ctx ? (
              <p className="rap-sous">Lecture…</p>
            ) : !ctx.exercices.length ? (
              <p className="rap-sous">Aucun exercice ouvert : les pièces ne portent pas encore d&apos;exercice.</p>
            ) : (
              <>
                <TableauRapport libelle="Exercices comptables" colonnes={[{ libelle: "Exercice" }, { libelle: "Société" }, { libelle: "Période" }, { libelle: "Statut" }, { libelle: "Reçues après la clôture", num: true }]}>
                  {ctx.exercices.map((x) => (
                    <tr key={x.id}>
                      <td style={{ fontWeight: 500 }}>{x.libelle}</td>
                      <td>{nomSociete(x.entite_id)}</td>
                      <td>
                        {jourFr(x.debut)} → {jourFr(x.fin)}
                      </td>
                      <td>{x.statut === "cloture" ? `clos le ${x.cloture_le ? jourFr(x.cloture_le) : "—"}` : "ouvert"}</td>
                      <td style={{ fontVariantNumeric: "tabular-nums", textAlign: "right" }}>{x.statut === "cloture" ? nombreFr(orientees[x.id] ?? 0) : "—"}</td>
                    </tr>
                  ))}
                </TableauRapport>
                {source === "exemple" ? <p className="rap-sous">{MENTION_EXERCICE_EXEMPLE} Le contrôle « Exercice » l&apos;a marquée : R2026-000028.</p> : null}
              </>
            )}
          </CarteRapport>
        </SectionRapport>

        {/* 04/11 — chaque pièce affectée au plan comptable et au centre de coût qui la portent (promesse FILED n° 45) */}
        <SectionRapport titre="Centres de coût" meta="Le centre de coût que porte chaque facture, proposé par FILED ou posé par une personne">
          <CarteRapport
            taille="pleine"
            titre="Imputations par centre de coût"
            info="filed_imputations : compte du plan comptable et centre de coût, ligne par ligne ; une imputation proposée attend qu'une personne la valide."
            chiffre={centres ? nombreFr(centres.filter((c) => c.nb_factures).length) : "—"}
            legende={centres ? `centres imputés sur ${pluriel(centres.length, "centre")}` : ""}
            etat="vert"
          >
            {!centres ? (
              <p className="rap-sous">Lecture…</p>
            ) : !centres.length ? (
              <p className="rap-sous">Aucun centre de coût n&apos;est encore défini.</p>
            ) : (
              <TableauRapport libelle="Imputations par centre de coût" colonnes={[{ libelle: "Centre de coût" }, { libelle: "Factures", num: true }, { libelle: "dont validées", num: true }, { libelle: "Montant HT", num: true }]}>
                {centres.map((c) => (
                  <tr key={c.code}>
                    <td style={{ fontWeight: 500 }}>
                      {c.code} — {c.libelle}
                      {c.actif ? null : <span className="rap-pastille">retiré</span>}
                    </td>
                    <td style={{ fontVariantNumeric: "tabular-nums", textAlign: "right" }}>{nombreFr(c.nb_factures)}</td>
                    <td style={{ fontVariantNumeric: "tabular-nums", textAlign: "right" }}>{nombreFr(c.nb_validees)}</td>
                    <td style={{ fontVariantNumeric: "tabular-nums", textAlign: "right" }}>{montant(c.montant_ht)}</td>
                  </tr>
                ))}
              </TableauRapport>
            )}
          </CarteRapport>
        </SectionRapport>

        {/* 04/11 — les exports programmés vers un tableur et le sceau mensuel (filed_exports, lecture seule) :
            le bloc d'ExportsFiled n'était monté par aucun écran (promesse FILED n° 52) */}
        <SectionRapport titre="Exports programmés" meta="Ce que FILED produit seul, à date fixe : tableaux pour vos tableurs, sceau mensuel de l'historique">
          <CarteRapport
            taille="pleine"
            titre="Les exports de FILED"
            info="Chaque fichier se télécharge pendant 90 jours ; ensuite seule son empreinte reste."
            chiffre={exportsListe ? nombreFr(exportsListe.length) : "—"}
            legende={exportsListe ? `${exportsListe.length > 1 ? "exports gardés" : "export gardé"}` : ""}
            etat="vert"
          >
            {!exportsListe ? (
              <p className="rap-sous">Lecture…</p>
            ) : !exportsListe.length ? (
              <p className="rap-sous">Aucun export pour l&apos;instant : le premier sceau arrive au début du mois prochain.</p>
            ) : (
              <TableauRapport libelle="Les exports de FILED" colonnes={[{ libelle: "Export" }, { libelle: "Période" }, { libelle: "Lignes", num: true }, { libelle: "Produit le" }, { libelle: "", num: true }]}>
                {exportsListe.map((x) => (
                  <tr key={x.id}>
                    <td style={{ fontWeight: 500 }}>{natureExport(x)}</td>
                    <td>{periodeExport(x)}</td>
                    <td style={{ fontVariantNumeric: "tabular-nums", textAlign: "right" }}>{nombreFr(x.nb_lignes)}</td>
                    <td>{quand(x.genere_le)}</td>
                    <td style={{ textAlign: "right" }}>
                      {x.contenu ? (
                        <button type="button" className="rap-lien" onClick={() => telecharger(fichierExport(x), x.contenu ?? "")}>
                          Télécharger
                        </button>
                      ) : (
                        <span className="rap-pastille" title="Le contenu est vidé après 90 jours ; l'empreinte reste">empreinte seule</span>
                      )}
                    </td>
                  </tr>
                ))}
              </TableauRapport>
            )}
          </CarteRapport>
        </SectionRapport>

        <SectionRapport
          titre="Les comptes de FILED"
          meta={peutRegler ? "Hors plan de charges ; un changement vaut pour les écritures à venir" : "Hors plan de charges ; les comptes se règlent par le gérant ou l'administrateur"}
        >
          <CarteRapport
            taille="pleine"
            titre="Comptes employés dans les écritures"
            info="Les cinq rôles de FILED, le numéro et le libellé en place, ou la valeur par défaut du plan comptable général."
            chiffre={ctx ? nombreFr(ctx.comptes.filter((c) => c.regle).length) : "—"}
            legende={ctx ? `réglé${ctx.comptes.filter((c) => c.regle).length > 1 ? "s" : ""} sur ${ctx.comptes.length}, le reste par défaut` : ""}
            etat="vert"
          >
            {ctx ? (
              <TableauRapport libelle="Les comptes de FILED" colonnes={[{ libelle: "Rôle" }, { libelle: "Compte" }, { libelle: "Libellé" }, { libelle: "", num: true }]}>
                {ctx.comptes.map((c) => (
                  <tr key={c.role}>
                    <td style={{ fontWeight: 500 }}>{libelleRole(c.role)}</td>
                    <td style={{ fontVariantNumeric: "tabular-nums" }}>{c.numero}</td>
                    <td>
                      {c.libelle}{" "}
                      {c.regle ? null : (
                        <span className="rap-pastille" title="Valeur du plan comptable général, en l'absence de réglage">
                          par défaut
                        </span>
                      )}
                    </td>
                    <td className="rap-num">
                      {peutRegler ? (
                        <button type="button" className="rap-lien" aria-label={`Modifier le compte : ${libelleRole(c.role)}`} onClick={() => ouvrirEdition(c)}>
                          Modifier
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </TableauRapport>
            ) : (
              <p className="rap-sous">Lecture…</p>
            )}
          </CarteRapport>
        </SectionRapport>

        <ChargesReprise source={source === "exemple" ? "exemple" : "reelle"} />
      </Rapport>

      <Dialog open={!!edition} onOpenChange={(o) => !o && !envoi && setEdition(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone>
              <Pencil width={18} height={18} aria-hidden="true" />
            </DialogIcone>
            <DialogTitle>Modifier le compte</DialogTitle>
            <DialogDescription>{edition ? libelleRole(edition.role) : ""} — employé dans les écritures que FILED passera à partir de maintenant ; les écritures passées ne changent pas.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              <label className="rv-libelle">
                Numéro de compte
                <input className="rv-champ esp-mono" inputMode="numeric" value={numero} onChange={(e) => setNumero(e.target.value)} />
              </label>
              {numero && !numeroOk ? <Avis teinte="ambre">Numéro de compte : de 3 à 12 chiffres.</Avis> : null}
              <label className="rv-libelle">
                Libellé
                <input className="rv-champ" value={libelle} onChange={(e) => setLibelle(e.target.value)} maxLength={200} />
              </label>
              {erreurCompte ? (
                <Avis teinte="rouge" role="alert">
                  {erreurCompte}
                </Avis>
              ) : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={!numeroOk || !libelle.trim() || envoi} onClick={() => void enregistrerCompte()}>
              {envoi ? <Loader variant="spin" /> : null} Enregistrer
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
