"use client";

/* ══════════════════════════════════════════════════════════════════════
   FILED — Refusées, à reprendre ou à classer (26/10/2026)

   TMOD-01 (testeur indépendant) : une facture refusée sortait de toutes les
   listes, et après « reprise impossible » plus rien ne la reprenait. La base
   la garde visible (a4_92 : public.filed_factures_refusees, catégorie des
   pièces en cours) et ouvre une sortie, tracée : le classement sans suite
   (public.filed_classer_refusee). Cette page les montre :
     · chaque refusée, avec le motif écrit par le valideur, la date de la
       décision (a4_94), l'état de sa reprise et l'heure limite pour la
       corriger ;
     · le bouton « Classer sans suite », avec son motif : la facture reste
       refusée et visible à l'historique, elle n'est ni payée ni reprise ;
     · pour la rectificative du fournisseur : une nouvelle pièce, déposée
       comme les autres (« Documents reçus »).
   Données : l'exemple, ou la base réelle par les mêmes portes
   (filed/portes : chargerRefusees, classerRefusee).
   ══════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Dialog, Heading, Modal, ModalOverlay } from "react-aria-components";
import { Archive, FileText } from "lucide-react";
import { SbBandeau, SbLigneVide, SbListe, SbOutils, SbRecherche, SbTableau } from "../sb/Sb";
import { useSource } from "@/components/espace/source";
import { dateHeure, montant } from "@/components/espace/format";
import { chargerRefusees, classerRefusee, monClient, type Refusee } from "@/components/espace/filed/portes";
import { Badge, Interrupteur, Note, Squelette } from "../ui";
import { useMaintenant } from "../horloge";
import { useToast } from "../Toasts";

const HEURE = 3_600_000;
const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? "s" : ""}`;
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

function EtatReprise({ r }: { r: Refusee }) {
  if (r.classee_le) return <Badge teinte="gris">Classée le {dateHeure(r.classee_le)}</Badge>;
  if (r.reprise === "a_faire")
    return (
      <Badge teinte="ambre" title="La facture se corrige depuis « Documents reçus » ; la reprise repasse ensuite par une nouvelle validation.">
        À corriger avant le {dateHeure(r.corriger_avant)}
      </Badge>
    );
  if (r.reprise === "impossible") return <Badge teinte="rouge">Reprise impossible</Badge>;
  return <Badge teinte="gris">Sans reprise</Badge>;
}

export function Refusees() {
  const toast = useToast();
  const [avecClassees, setAvecClassees] = useState(false);
  const { source, lignes, erreur, charger, setExemple, maintenant } = useRefusees(avecClassees);
  const [q, setQ] = useState("");
  const [aClasser, setAClasser] = useState<Refusee | null>(null);
  const [motif, setMotif] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [refus, setRefus] = useState<string | null>(null);

  const r = q.trim().toLowerCase();
  const visibles = useMemo(
    () => (lignes ?? []).filter((x) => !r || [x.reference, x.numero, x.fournisseur, x.motif].some((v) => v && v.toLowerCase().includes(r))),
    [lignes, r],
  );
  const ouvertes = (lignes ?? []).filter((x) => !x.classee_le);
  const aCorriger = ouvertes.filter((x) => x.reprise === "a_faire").length;
  const motifOk = motif.trim().length >= 5;

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
              ? { ...y, classee_le: le, classee_motif: motif.trim(), reprise: y.reprise === "a_faire" ? "impossible" : y.reprise, reprise_motif: y.reprise === "a_faire" ? "Classée sans suite par une personne." : y.reprise_motif, geste: "Classée sans suite." }
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

  return (
    <SbListe
      titre="Refusées, à reprendre ou à classer"
      description="Une facture refusée reste ici, avec le motif du refus. Dans les 24 h, elle se corrige pour sa reprise ; ensuite, elle se classe sans suite, ou la facture rectificative du fournisseur se dépose comme une nouvelle pièce."
      actions={
        <Link href="/espace2/filed" className="v2-btn">
          <FileText width={14} height={14} aria-hidden="true" /> Documents reçus
        </Link>
      }
    >
      {erreur ? (
        <Note teinte="rouge" role="alert">
          <strong>La base réelle n&apos;a pas répondu.</strong> {erreur}
        </Note>
      ) : null}
      {lignes && maintenant !== null ? (
        <SbBandeau
          teinte={aCorriger ? "ambre" : undefined}
          titre={`${ouvertes.length} facture${ouvertes.length > 1 ? "s refusées" : " refusée"} à reprendre ou à classer · ${montant(ouvertes.reduce((s, x) => s + (x.montant_ttc ?? 0), 0))}`}
          texte={
            aCorriger
              ? `${aCorriger > 1 ? `${aCorriger} se corrigent` : "Une se corrige"} encore pour sa reprise ; passé l'heure limite, la reprise devient impossible.`
              : "Aucune n'attend de correction : elles se classent sans suite, ou se remplacent par la rectificative."
          }
        />
      ) : (
        <Squelette hauteur={80} />
      )}
      <SbOutils
        gauche={<SbRecherche valeur={q} changer={setQ} placeholder="Filtrer par fournisseur, numéro ou motif" />}
        droite={
          <Interrupteur actif={avecClassees} onChange={setAvecClassees}>
            Afficher les classées
          </Interrupteur>
        }
      />
      {!lignes || maintenant === null ? (
        erreur ? null : (
          <div className="v2-carte" aria-busy="true" style={{ padding: 16, display: "grid", gap: 16 }}>
            {[0, 1, 2].map((i) => (
              <Squelette key={i} hauteur={20} />
            ))}
          </div>
        )
      ) : (
        <SbTableau
          colonnes={[{ libelle: "Facture" }, { libelle: "Montant", num: true }, { libelle: "Refusée le" }, { libelle: "Motif du refus" }, { libelle: "Reprise" }, { libelle: "" }]}
          pied={pluriel(visibles.length, "facture")}
        >
          {visibles.length ? (
            visibles.map((x) => (
              <tr key={x.facture_id}>
                <td data-etiquette="Facture" data-plein="">
                  <span style={{ fontWeight: 500 }}>{x.fournisseur ?? "Fournisseur inconnu"}</span>
                  <small className="v2-mono">
                    {x.reference ?? "—"}
                    {x.numero ? ` · n° ${x.numero}` : ""}
                  </small>
                </td>
                <td data-etiquette="Montant" className="v2-num">
                  {montant(x.montant_ttc)}
                </td>
                <td data-etiquette="Refusée le">{dateHeure(x.refusee_le)}</td>
                <td data-etiquette="Motif du refus" data-plein="">
                  {x.motif}
                  {x.classee_motif ? <small>Classée : {x.classee_motif}</small> : x.reprise_motif ? <small>{x.reprise_motif}</small> : null}
                </td>
                <td data-etiquette="Reprise">
                  <EtatReprise r={x} />
                </td>
                <td data-etiquette="Geste" data-plein="">
                  {x.classee_le ? (
                    <span className="v2-gris">—</span>
                  ) : (
                    <button type="button" className="v2-btn v2-btn--petit" onClick={() => ouvrir(x)}>
                      <Archive width={14} height={14} aria-hidden="true" /> Classer sans suite
                    </button>
                  )}
                </td>
              </tr>
            ))
          ) : (
            <SbLigneVide
              colonnes={6}
              titre={r ? "Aucune facture ne correspond" : "Aucune facture refusée"}
              texte={r ? "Essayez un autre nom de fournisseur ou un autre numéro." : "Une facture refusée par un valideur apparaîtra ici, avec son motif."}
            />
          )}
        </SbTableau>
      )}

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
                    <textarea value={motif} onChange={(e) => setMotif(e.target.value)} rows={3} maxLength={500} placeholder="Par exemple : le fournisseur envoie une facture rectificative." aria-invalid={!!motif && !motifOk} />
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
    </SbListe>
  );
}
