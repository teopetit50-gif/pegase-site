"use client";

/* ══════════════════════════════════════════════════════════════════════
   FILED — Refusées, à reprendre ou à classer (26/10/2026 ; liste des fils
   de Plain le 28/10/2026)

   TMOD-01 (testeur indépendant) : une facture refusée sortait de toutes les
   listes, et après « reprise impossible » plus rien ne la reprenait. La base
   la garde visible (a4_92 : public.filed_factures_refusees, catégorie des
   pièces en cours) et ouvre une sortie, tracée : le classement sans suite
   (public.filed_classer_refusee). Cette page les montre, un fil par facture,
   dans le dessin de « All threads » de Plain (../lin/ListeFils.tsx) :
     · onglets À corriger · Reprise impossible · Toutes (les classées
       comprises) ; le menu Filtres (F) garde la recherche et l'état de
       reprise ; le menu Affichage (V) le tri, le regroupement et
       « Afficher les classées » (le geste d'avant) ;
     · ouvrir un fil : la carte au milieu, avec le motif du valideur, la
       date de la décision (a4_94), l'état de la reprise, l'heure limite ;
     · « Classer sans suite », avec son motif (la même fenêtre qu'avant) :
       la facture reste refusée et visible à l'historique ;
     · pour la rectificative du fournisseur : « Documents reçus ».
   Données : l'exemple, ou la base réelle par les mêmes portes
   (filed/portes : chargerRefusees, classerRefusee).
   ══════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Dialog, Heading, Modal, ModalOverlay } from "react-aria-components";
import { Archive, Copy, ExternalLink, FileText, ListFilter } from "lucide-react";
import { useSource } from "@/components/espace/source";
import { dateCourte, dateHeure, montant, relatif } from "@/components/espace/format";
import { chargerRefusees, classerRefusee, monClient, type Refusee } from "@/components/espace/filed/portes";
import { MenuActions, type Option } from "../lin/Lin";
import { CarteCentrale, Feuille } from "../lin/CarteCentrale";
import {
  BoutonPlain,
  ChampPlain,
  IconeAffichage,
  IconeAnneau,
  IconeCoche,
  IconeCroix,
  IconeFiltres,
  ListeFils,
  MenuPlain,
  OptionPlain,
  couleurDe,
  initialesDe,
  useAdresse,
  type Fil,
  type FiltrePose,
  type Priorite,
  type SectionFils,
} from "../lin/ListeFils";
import { Note } from "../ui";
import { useMaintenant } from "../horloge";
import { useToast } from "../Toasts";
import { RACINE } from "../modules";

const CHEMIN = `${RACINE}/filed/refusees`;
const HEURE = 3_600_000;
const sansAccents = (x: string) => x.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const GESTE_SANS_REPRISE = "À classer sans suite, ou à redéposer en facture rectificative.";

/* L'exemple : trois refus, aux dates comptées depuis l'horloge du navigateur. */
function refuseesExemple(maintenant: number): Refusee[] {
  const iso = (h: number) => new Date(maintenant + h * HEURE).toISOString();
  return [
    {
      facture_id: "ex-refusee-1",
      reference: "R2026-000112",
      numero: "MAT-2026-0418",
      fournisseur: "Matériaux du Littoral (exemple)",
      montant_ttc: 928.2,
      refusee_le: iso(-6),
      motif: "TVA à 19 % non justifiée : demander au fournisseur une facture rectificative à 8,5 %.",
      reprise: "a_faire",
      reprise_motif: null,
      corriger_avant: iso(18),
      classee_le: null,
      classee_motif: null,
      geste: "À corriger pour sa reprise avant l'heure limite, sinon à classer sans suite.",
    },
    {
      facture_id: "ex-refusee-2",
      reference: "R2026-000097",
      numero: "TP-10-2291",
      fournisseur: "Transports Bellevue (exemple)",
      montant_ttc: 1460,
      refusee_le: iso(-50),
      motif: "Livraison jamais reçue sur le chantier : ne pas payer.",
      reprise: "impossible",
      reprise_motif: "Aucune correction de la facture dans les 24 h qui ont suivi le refus : à classer sans suite, ou à redéposer en facture rectificative.",
      corriger_avant: null,
      classee_le: null,
      classee_motif: null,
      geste: GESTE_SANS_REPRISE,
    },
    {
      facture_id: "ex-refusee-3",
      reference: "R2026-000081",
      numero: "QC-0907",
      fournisseur: "Quincaillerie Centrale (exemple)",
      montant_ttc: 212.4,
      refusee_le: iso(-120),
      motif: "Déjà réglée en espèces au comptoir.",
      reprise: "impossible",
      reprise_motif: "Classée sans suite par une personne.",
      corriger_avant: null,
      classee_le: iso(-118),
      classee_motif: "Réglée au comptoir, ticket joint à la caisse.",
      geste: "Classée sans suite.",
    },
  ];
}

function useRefusees(avecClassees: boolean) {
  const { source } = useSource();
  const maintenant = useMaintenant();
  const [reel, setReel] = useState<Refusee[] | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [exemple, setExemple] = useState<Refusee[] | null>(null);

  const charger = useCallback(async () => {
    setErreur(null);
    try {
      const c = await monClient();
      if (!c) throw new Error("Aucune organisation n'est rattachée à ce compte.");
      setReel(await chargerRefusees(c.client_id, avecClassees));
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base n'a pas répondu.");
    }
  }, [avecClassees]);

  useEffect(() => {
    if (source !== "reelle") return;
    const t = window.setTimeout(() => void charger(), 0);
    return () => window.clearTimeout(t);
  }, [source, charger]);

  useEffect(() => {
    if (maintenant === null || exemple) return;
    const t = window.setTimeout(() => setExemple(refuseesExemple(maintenant)), 0);
    return () => window.clearTimeout(t);
  }, [maintenant, exemple]);

  const lignes = source === "exemple" ? (exemple ? exemple.filter((r) => avecClassees || !r.classee_le) : null) : reel;
  return { source, lignes, erreur: source === "exemple" ? null : erreur, charger, setExemple, maintenant };
}

/* l'état d'une refusée : à corriger (reprise ouverte), reprise impossible, classée sans suite */
type Etat = "corriger" | "impossible" | "classee";
const ETATS: { cle: Etat; libelle: string; sous: string; prio: Priorite; icone: React.ReactNode; teinte?: "bleu" | "orange" }[] = [
  { cle: "corriger", libelle: "À corriger", sous: "la reprise est encore ouverte, jusqu'à l'heure limite", prio: 3, icone: <IconeAnneau />, teinte: "bleu" },
  { cle: "impossible", libelle: "Reprise impossible", sous: GESTE_SANS_REPRISE, prio: 2, icone: <IconeCroix />, teinte: "orange" },
  { cle: "classee", libelle: "Classée sans suite", sous: "ni payée ni reprise, visible à l'historique", prio: 1, icone: <IconeCoche /> },
];
const etatDe = (r: Refusee): Etat => (r.classee_le ? "classee" : r.reprise === "a_faire" ? "corriger" : "impossible");
const infoEtat = (e: Etat) => ETATS.find((x) => x.cle === e)!;
type Onglet = "corriger" | "impossible" | "toutes";
const ONGLETS: { cle: Onglet; libelle: string; garde: (e: Etat) => boolean }[] = [
  { cle: "corriger", libelle: "À corriger", garde: (e) => e === "corriger" },
  { cle: "impossible", libelle: "Reprise impossible", garde: (e) => e === "impossible" },
  { cle: "toutes", libelle: "Toutes les refusées", garde: () => true },
];
type Tri = "recent" | "limite" | "montant" | "fournisseur";
const TRIS: { cle: Tri; libelle: string }[] = [
  { cle: "recent", libelle: "Refusée, la plus récente d'abord" },
  { cle: "limite", libelle: "Heure limite, la plus proche d'abord" },
  { cle: "montant", libelle: "Montant, le plus gros d'abord" },
  { cle: "fournisseur", libelle: "Fournisseur" },
];

export function Refusees() {
  const toast = useToast();
  const routeur = useRouter();
  const params = useSearchParams();
  const adresse = useAdresse(CHEMIN, params);
  const onglet = (ONGLETS.find((o) => o.cle === params.get("onglet"))?.cle ?? "corriger") as Onglet;
  const etat = (ETATS.find((e) => e.cle === params.get("etat"))?.cle ?? null) as Etat | null;
  const tri = (TRIS.find((t) => t.cle === params.get("tri"))?.cle ?? "recent") as Tri;
  const grouper = params.get("grouper") === "1";
  /* « Afficher les classées » (le geste d'avant) : l'onglet Toutes les montre toujours, les autres sur demande */
  const avecClassees = onglet === "toutes" || etat === "classee" || params.get("classees") === "1";
  const id = params.get("id");
  const aller = (href: string) => routeur.replace(href, { scroll: false });
  const lienId = (x: string | null) => adresse((p) => (x ? p.set("id", x) : p.delete("id")));

  const { source, lignes, erreur, charger, setExemple, maintenant } = useRefusees(avecClassees);
  const [recherche, setRecherche] = useState("");
  const [aClasser, setAClasser] = useState<Refusee | null>(null);
  const [motif, setMotif] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [refus, setRefus] = useState<string | null>(null);

  const q = sansAccents(recherche.trim());
  const base = useMemo(() => lignes ?? [], [lignes]);
  const correspond = (x: Refusee) => !q || [x.reference, x.numero, x.fournisseur, x.motif].some((v) => v && sansAccents(v).includes(q));
  const garde = ONGLETS.find((o) => o.cle === onglet)!.garde;
  const visibles = base.filter((x) => garde(etatDe(x)) && (!etat || etatDe(x) === etat) && correspond(x));
  const tries = [...visibles].sort((a, b) =>
    tri === "fournisseur"
      ? (a.fournisseur ?? "").localeCompare(b.fournisseur ?? "", "fr")
      : tri === "montant"
        ? (b.montant_ttc ?? 0) - (a.montant_ttc ?? 0)
        : tri === "limite"
          ? (a.corriger_avant ?? "9").localeCompare(b.corriger_avant ?? "9")
          : (b.refusee_le ?? "").localeCompare(a.refusee_le ?? ""),
  );
  const n = (e: Etat) => base.filter((x) => etatDe(x) === e && correspond(x)).length;
  const ouvertes = base.filter((x) => !x.classee_le);
  const aCorriger = ouvertes.filter((x) => x.reprise === "a_faire").length;
  const motifOk = motif.trim().length >= 5;
  const dateMaintenant = maintenant === null ? new Date() : new Date(maintenant);

  function ouvrir(x: Refusee) {
    setAClasser(x);
    setMotif("");
    setRefus(null);
  }

  async function classer() {
    if (!aClasser || !motifOk) return;
    const x = aClasser;
    setEnvoi(true);
    setRefus(null);
    try {
      if (source === "reelle") {
        await classerRefusee(x.facture_id, motif.trim());
        await charger();
      } else {
        await new Promise((t) => setTimeout(t, 300));
        const le = new Date().toISOString();
        setExemple((e) =>
          (e ?? []).map((y) =>
            y.facture_id === x.facture_id
              ? {
                  ...y,
                  classee_le: le,
                  classee_motif: motif.trim(),
                  reprise: y.reprise === "a_faire" ? "impossible" : y.reprise,
                  reprise_motif: y.reprise === "a_faire" ? "Classée sans suite par une personne." : y.reprise_motif,
                  geste: "Classée sans suite.",
                }
              : y,
          ),
        );
      }
      toast(`${x.reference ?? "La facture"} classée sans suite`, "vert");
      setAClasser(null);
    } catch (e) {
      setRefus(e instanceof Error ? e.message : "La base a refusé le classement.");
    } finally {
      setEnvoi(false);
    }
  }
  const copier = (texte: string, quoi: string) =>
    navigator.clipboard?.writeText(texte).then(
      () => toast(quoi, "vert"),
      () => toast("Impossible de copier. Réessayez.", "rouge"),
    );

  /* ——— les lignes ——— */
  const repriseTexte = (x: Refusee) =>
    x.classee_le ? `Classée le ${dateHeure(x.classee_le)}` : x.reprise === "a_faire" ? `À corriger avant le ${dateHeure(x.corriger_avant)}` : x.reprise === "impossible" ? "Reprise impossible" : "Sans reprise";
  const fil = (x: Refusee): Fil => {
    const e = infoEtat(etatDe(x));
    const urgent = x.reprise === "a_faire" && !!x.corriger_avant && new Date(x.corriger_avant).getTime() - dateMaintenant.getTime() < 6 * HEURE;
    return {
      id: x.facture_id,
      href: lienId(x.facture_id),
      etat: e.icone,
      etatTeinte: e.teinte,
      avatar: { lettre: initialesDe(x.fournisseur ?? "?"), couleur: couleurDe(x.fournisseur ?? x.facture_id), titre: x.fournisseur ?? undefined },
      client: x.fournisseur ?? "Fournisseur inconnu",
      contact: x.numero ? `n° ${x.numero}` : null,
      badge: x.classee_le ? { texte: "Classée" } : urgent ? { texte: "Heure limite proche", teinte: "orange" } : null,
      ref: x.reference ?? "—",
      titre: repriseTexte(x),
      apercu: x.motif,
      priorite: urgent ? 4 : e.prio,
      etiquettes: <span style={{ fontVariantNumeric: "tabular-nums" }}>{montant(x.montant_ttc)}</span>,
      heure: { texte: relatif(x.refusee_le, dateMaintenant), iso: x.refusee_le ?? undefined, icone: "calendrier", urgence: urgent },
      qui: null,
    };
  };
  const description = [
    `${ouvertes.length} ${ouvertes.length > 1 ? "factures refusées" : "facture refusée"} à reprendre ou à classer · ${montant(ouvertes.reduce((s, x) => s + (x.montant_ttc ?? 0), 0))}`,
    aCorriger
      ? `${aCorriger > 1 ? `${aCorriger} se corrigent` : "une se corrige"} encore pour sa reprise ; passé l'heure limite, la reprise devient impossible`
      : "aucune n'attend de correction : elles se classent sans suite, ou se remplacent par la rectificative",
  ].join(" · ");
  const sections: SectionFils[] = grouper
    ? ETATS.map((e) => ({ cle: e.cle, titre: e.libelle, icone: e.icone, description: e.sous, fils: tries.filter((x) => etatDe(x) === e.cle).map(fil) }))
    : [{ cle: "toutes", titre: "Factures refusées", description, fils: tries.map(fil) }];
  const filtresPoses: FiltrePose[] = [
    ...(etat ? [{ cle: "etat", libelle: infoEtat(etat).libelle, icone: infoEtat(etat).icone, href: adresse((p) => p.delete("etat")) }] : []),
    ...(recherche ? [{ cle: "q", libelle: `« ${recherche} »`, href: adresse(() => {}) }] : []),
  ];

  const choisi = id ? (base.find((x) => x.facture_id === id) ?? null) : null;
  const rang = choisi ? tries.findIndex((x) => x.facture_id === choisi.facture_id) : -1;

  return (
    <ListeFils
      titre="Refusées, à reprendre ou à classer"
      actions={
        <>
          <BoutonPlain href={`${RACINE}/filed`} icone={<FileText width={18} height={18} aria-hidden="true" />}>
            Documents reçus
          </BoutonPlain>
          <MenuPlain icone={<IconeFiltres />} libelle="Filtres" raccourci="F" n={filtresPoses.length || undefined}>
            {(fermer) => (
              <>
                <div className="pf-menu-groupe">
                  <input
                    className="pf-menu-champ"
                    autoFocus
                    placeholder="Filtrer par fournisseur, numéro ou motif"
                    aria-label="Filtrer les refusées"
                    value={recherche}
                    onChange={(e) => setRecherche(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && fermer()}
                  />
                </div>
                <div className="pf-menu-groupe" role="group" aria-label="Reprise">
                  <p className="pf-menu-titre">Reprise</p>
                  {ETATS.map((e) => (
                    <OptionPlain
                      key={e.cle}
                      icone={e.icone}
                      n={n(e.cle)}
                      actif={etat === e.cle}
                      onClick={() => {
                        fermer();
                        aller(adresse((p) => (etat === e.cle ? p.delete("etat") : p.set("etat", e.cle))));
                      }}
                    >
                      {e.libelle}
                    </OptionPlain>
                  ))}
                </div>
              </>
            )}
          </MenuPlain>
          <MenuPlain icone={<IconeAffichage />} libelle="Affichage" raccourci="V" large>
            {() => (
              <div className="pf-menu-corps">
                <div className="pf-segment" role="group" aria-label="Regroupement">
                  <button type="button" aria-pressed={!grouper} onClick={() => aller(adresse((p) => p.delete("grouper")))}>
                    Liste
                  </button>
                  <button type="button" aria-pressed={grouper} onClick={() => aller(adresse((p) => p.set("grouper", "1")))}>
                    Par reprise
                  </button>
                </div>
                <p className="pf-etiquette">Trier par</p>
                <ChampPlain<Tri> libelle="Trier par" valeur={tri} options={TRIS} onChange={(v) => aller(adresse((p) => (v === "recent" ? p.delete("tri") : p.set("tri", v))))} />
                <label className="pf-bascule">
                  Afficher les classées
                  <input
                    type="checkbox"
                    checked={avecClassees}
                    disabled={onglet === "toutes" || etat === "classee"}
                    onChange={(e) => aller(adresse((p) => (e.target.checked ? p.set("classees", "1") : p.delete("classees"))))}
                  />
                </label>
              </div>
            )}
          </MenuPlain>
        </>
      }
      onglets={ONGLETS.map((o) => ({
        cle: o.cle,
        libelle: o.libelle,
        icone: o.cle === "corriger" ? <IconeAnneau /> : o.cle === "impossible" ? <IconeCroix /> : undefined,
        teinte: o.cle === "corriger" ? "bleu" : undefined,
        n: o.cle === "toutes" ? undefined : base.filter((x) => o.garde(etatDe(x))).length,
        href: adresse((p) => {
          if (o.cle === "corriger") p.delete("onglet");
          else p.set("onglet", o.cle);
          p.delete("id");
        }),
      }))}
      ongletActif={onglet}
      filtresPoses={filtresPoses}
      note={erreur ? `La base réelle n'a pas répondu. ${erreur}` : null}
      sections={sections}
      idOuvert={id}
      chargement={!lignes || maintenant === null}
      vide={
        recherche || etat
          ? { titre: "Aucune facture ne correspond", texte: "Essayez un autre nom de fournisseur ou un autre numéro." }
          : onglet === "corriger"
            ? {
                titre: "Rien à corriger",
                texte: "Aucune facture refusée n'attend de correction pour sa reprise.",
                geste: base.length ? (
                  <Link href={adresse((p) => p.set("onglet", "toutes"))} replace className="pf-lien">
                    Voir toutes les refusées
                  </Link>
                ) : undefined,
              }
            : { titre: "Aucune facture refusée", texte: "Une facture refusée par un valideur apparaîtra ici, avec son motif." }
      }
    >
      <CarteCentrale
        ouverte={!!id && !!lignes}
        fermer={() => aller(lienId(null))}
        libelle={choisi ? `Facture refusée ${choisi.reference ?? ""}` : "Facture introuvable"}
        sur="FILED · Facture refusée"
        statut={choisi ? <>{infoEtat(etatDe(choisi)).libelle}</> : undefined}
        nav={
          choisi && rang >= 0
            ? {
                position: rang + 1,
                total: tries.length,
                precedente: rang > 0 ? () => aller(lienId(tries[rang - 1].facture_id)) : undefined,
                suivante: rang < tries.length - 1 ? () => aller(lienId(tries[rang + 1].facture_id)) : undefined,
              }
            : null
        }
        gauche={
          choisi ? (
            <Feuille
              titre="FACTURE REFUSÉE"
              sous={choisi.reference}
              nom={choisi.fournisseur ?? "Fournisseur inconnu"}
              sousNom={choisi.numero ? [`n° ${choisi.numero}`] : undefined}
              lignes={[
                ["Refusée le", dateHeure(choisi.refusee_le)],
                ["Motif du refus", choisi.motif ?? "—"],
                ["Reprise", repriseTexte(choisi)],
                ...(choisi.corriger_avant && !choisi.classee_le ? [["Heure limite", dateHeure(choisi.corriger_avant)] as [string, string]] : []),
                ...(choisi.classee_le ? [["Classée le", dateHeure(choisi.classee_le)] as [string, string], ["Motif du classement", choisi.classee_motif ?? "—"] as [string, string]] : []),
              ]}
              total={["Montant TTC", montant(choisi.montant_ttc)]}
            />
          ) : (
            <Feuille titre="FACTURE REFUSÉE" sous={null} texte="Aucune fiche." />
          )
        }
        piedGauche={
          choisi ? (
            <div className="v2-det-document-ligne">
              <span className="v2-det-mono">{choisi.reference ?? "—"}</span>
              <span className="v2-det-sous">{choisi.geste}</span>
            </div>
          ) : undefined
        }
        titre={choisi ? (choisi.fournisseur ?? "Fournisseur inconnu") : "Facture introuvable"}
        chiffre={choisi ? montant(choisi.montant_ttc) : undefined}
        echeance={
          choisi
            ? choisi.classee_le
              ? { texte: `Classée le ${dateCourte(choisi.classee_le)}` }
              : choisi.reprise === "a_faire"
                ? { texte: `À corriger avant le ${dateHeure(choisi.corriger_avant)}`, urgence: "aujourdhui" }
                : { texte: `Refusée le ${dateHeure(choisi.refusee_le)}`, urgence: "retard" }
            : null
        }
        notes={
          choisi ? (
            <>
              {choisi.classee_le ? (
                <Note teinte="gris">
                  <strong>Classée sans suite.</strong> {choisi.classee_motif}
                </Note>
              ) : choisi.reprise === "a_faire" ? (
                <Note teinte="ambre">
                  <strong>Reprise ouverte.</strong> La facture se corrige depuis « Documents reçus » avant le {dateHeure(choisi.corriger_avant)} ; la reprise repasse ensuite par une nouvelle validation.
                </Note>
              ) : (
                <Note teinte="rouge">
                  <strong>Reprise impossible.</strong> {choisi.reprise_motif ?? GESTE_SANS_REPRISE}
                </Note>
              )}
            </>
          ) : undefined
        }
        actions={
          choisi ? (
            <>
              {!choisi.classee_le ? (
                <button type="button" className="v2-btn v2-det-btn-danger v2-det-btn-danger--plein" onClick={() => ouvrir(choisi)}>
                  <Archive width={14} height={14} aria-hidden="true" /> Classer sans suite
                </button>
              ) : null}
              <Link href={`${RACINE}/filed`} className="v2-btn v2-btn--fantome">
                <FileText width={14} height={14} aria-hidden="true" /> Documents reçus
              </Link>
              <span className="v2 pf-plus">
                <span className="lin">
                  <MenuActions
                    rond
                    titre="Plus d'actions"
                    options={
                      [
                        ...(choisi.reference
                          ? [{ cle: "ref", libelle: "Copier la référence", meta: choisi.reference, icone: <Copy width={16} height={16} />, action: () => void copier(choisi.reference ?? "", "Référence copiée") }]
                          : []),
                        ...(choisi.numero
                          ? [{ cle: "num", libelle: "Copier le numéro", meta: choisi.numero, icone: <Copy width={16} height={16} />, action: () => void copier(choisi.numero ?? "", "Numéro copié") }]
                          : []),
                        {
                          cle: "seule",
                          libelle: `Seulement « ${infoEtat(etatDe(choisi)).libelle} »`,
                          icone: <ListFilter width={16} height={16} />,
                          coche: etat === etatDe(choisi),
                          action: () => aller(adresse((p) => (etat === etatDe(choisi) ? p.delete("etat") : p.set("etat", etatDe(choisi))))),
                        },
                        { cle: "doc", libelle: "Ouvrir dans Documents reçus", icone: <ExternalLink width={16} height={16} />, href: `${RACINE}/filed?objet=facture:${encodeURIComponent(choisi.facture_id)}` },
                      ] satisfies Option[]
                    }
                  />
                </span>
              </span>
            </>
          ) : undefined
        }
      >
        {choisi ? (
          <dl className="v2-det-fiche">
            <dt>Reprise</dt>
            <dd>
              {infoEtat(etatDe(choisi)).libelle} <span className="v2-det-sous">· {infoEtat(etatDe(choisi)).sous}</span>
            </dd>
            <dt>Motif du refus</dt>
            <dd>{choisi.motif ?? "—"}</dd>
            <dt>Refusée le</dt>
            <dd>{dateHeure(choisi.refusee_le)}</dd>
            <dt>Facture</dt>
            <dd>
              <span className="v2-det-mono">{choisi.reference ?? "—"}</span>
              {choisi.numero ? <span className="v2-det-sous"> · n° {choisi.numero}</span> : null}
            </dd>
            <dt>Montant</dt>
            <dd>{montant(choisi.montant_ttc)} TTC</dd>
            {choisi.reprise_motif ? (
              <>
                <dt>Détail</dt>
                <dd>{choisi.reprise_motif}</dd>
              </>
            ) : null}
          </dl>
        ) : (
          <p className="v2-det-vide">La facture que désigne ce lien n&apos;est pas connue{source === "exemple" ? " (vous regardez les données d'exemple)" : ""}.</p>
        )}
      </CarteCentrale>

      <ModalOverlay isOpen={!!aClasser} onOpenChange={(o) => !o && !envoi && setAClasser(null)} isDismissable={!envoi} className="v2-jetons v2-voile">
        <Modal className="v2-modale">
          <Dialog className="v2-modale-dialogue">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (motifOk && !envoi) void classer();
              }}
            >
              <div className="v2-modale-corps">
                <Heading slot="title">Classer sans suite</Heading>
                <p>
                  {aClasser ? `${aClasser.fournisseur ?? "Fournisseur"} — ${aClasser.reference ?? ""}${aClasser.numero ? ` (n° ${aClasser.numero})` : ""}, ${montant(aClasser.montant_ttc)}. ` : ""}
                  La facture reste refusée et visible à l&apos;historique : elle ne sera ni payée ni reprise.
                  {aClasser?.reprise === "a_faire" ? " Sa reprise, encore ouverte, devient impossible." : ""}
                </p>
                <label className="v2-libelle">
                  Motif du classement
                  <span className={`v2-champ${motif && !motifOk ? " v2-champ--erreur" : ""}`}>
                    <textarea
                      value={motif}
                      onChange={(e) => setMotif(e.target.value)}
                      rows={3}
                      maxLength={500}
                      placeholder="Par exemple : le fournisseur envoie une facture rectificative."
                      aria-invalid={!!motif && !motifOk}
                    />
                  </span>
                  {motif && !motifOk ? <span className="v2-aide v2-aide--erreur">Cinq caractères au moins.</span> : null}
                </label>
                <p className="v2-aide" style={{ margin: 0 }}>
                  La rectificative du fournisseur se dépose comme une nouvelle pièce, depuis « Documents reçus ». Réservé au gérant, à l&apos;administrateur et au valideur.
                </p>
                {refus ? (
                  <Note teinte="rouge" role="alert">
                    <strong>Refusé par la base.</strong> {refus}
                  </Note>
                ) : null}
              </div>
              <div className="v2-modale-pied">
                <Button className="v2-btn v2-btn--petit" slot="close" isDisabled={envoi}>
                  Annuler
                </Button>
                <button type="submit" className="v2-btn v2-btn--petit v2-btn--primaire" disabled={!motifOk || envoi}>
                  {envoi ? "Classement…" : "Classer sans suite"}
                </button>
              </div>
            </form>
          </Dialog>
        </Modal>
      </ModalOverlay>
    </ListeFils>
  );
}
