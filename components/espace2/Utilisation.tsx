"use client";

/* ══════════════════════════════════════════════════════════════════════
   « Utilisation » — la page « Usage » de Supabase, au 1:1 (22/10/2026)

   06/10 : première page de suivi, sur le modèle « Usage » de Vercel.
   22/10 : demande de Teo, recopier exactement la page Usage de
   l'organisation Supabase (supabase.com/dashboard/org/…/usage) : l'en-tête,
   la barre de filtres collante (période à gauche ; source et dates à
   droite), la section « résumé » (texte à gauche, grille de compteurs à
   jauges à droite), puis une section par mesure (texte à gauche ; barre,
   lignes de quota et histogramme par jour à droite). Gabarit : ./sb.

   Ce qui est compté vient des mêmes données que la vue d'ensemble
   (./donnees.ts : exemple ou base réelle) : documents reçus, montants
   facturés et payés (FILED), demandes et décisions (validations).
   ══════════════════════════════════════════════════════════════════════ */

import { useMemo, useState } from "react";
import { useSource } from "@/components/espace/source";
import { dateCourte, montant } from "@/components/espace/format";
import { ChoixPeriode, PERIODES, type Periode } from "./Suivi";
import { Note, Squelette } from "./ui";
import { useDonnees } from "./donnees";
import { A_PAYER, du } from "./filed/calculs";
import { useAujourdhui } from "./horloge";
import { SbCompteur, SbCompteurs, SbGraphique, SbMesure, SbPage, SbSection, type SbBarre } from "./sb/Sb";

const JOUR = 86_400_000;
const nombre = (n: number) => new Intl.NumberFormat("fr-FR").format(n);
const euros = (n: number) => montant(Math.round(n * 100) / 100);
const pct = (a: number, b: number) => (b > 0 ? (a / b) * 100 : 0);
const pctTexte = (a: number, b: number) => {
  if (b <= 0) return "";
  const p = pct(a, b);
  return p > 0 && p < 1 ? " (<1 %)" : ` (${Math.round(p)} %)`;
};

/* une barre par jour de la période, du plus ancien au plus récent */
function parJour<T>(items: T[], date: (t: T) => string | null | undefined, valeur: (t: T) => number, depuis: number, jours: number): SbBarre[] {
  const barres: SbBarre[] = Array.from({ length: jours }, (_, i) => {
    const d = new Date(depuis + i * JOUR);
    return { cle: d.toISOString().slice(0, 10), libelle: d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }), valeur: 0 };
  });
  for (const t of items) {
    const iso = date(t);
    if (!iso) continue;
    const i = Math.floor((new Date(iso).getTime() - depuis) / JOUR);
    if (i >= 0 && i < jours) barres[i].valeur += valeur(t);
  }
  return barres;
}

export default function Utilisation() {
  const { donnees, erreur } = useDonnees();
  const { source } = useSource();
  const [periode, setPeriode] = useState<Periode>(PERIODES[1]);
  /* 21/10 — l'horloge du navigateur (horloge.ts) : null au rendu serveur, les squelettes en attendant */
  const aujourdhui = useAujourdhui();
  const depuis = aujourdhui === null ? null : aujourdhui - periode.jours * JOUR + JOUR;
  const dans = (iso: string | null | undefined) => depuis !== null && !!iso && new Date(iso).getTime() >= depuis;

  const m = useMemo(() => {
    if (!donnees || depuis === null) return null;
    const docs = donnees.docs.filter((d) => dans(d.recu_le));
    const emises = donnees.vue.factures.filter((f) => f.nature !== "avoir" && dans(f.date_emission));
    const aPayer = donnees.vue.factures.filter((f) => A_PAYER.has(f.statut) && f.nature !== "avoir");
    const reglees = aPayer.filter((f) => dans(donnees.etats[f.id]?.dernier_le));
    const demandes = donnees.demandes.filter((d) => dans(d.cree_le));
    const decisions = donnees.demandes.filter((d) => dans(d.decide_le));
    const enAttente = donnees.demandes.filter((d) => d.statut === "en_attente");
    const facture = emises.reduce((s, f) => s + (f.montant_ttc ?? 0), 0);
    const paye = reglees.reduce((s, f) => s + (donnees.etats[f.id]?.regle ?? 0), 0);
    const reste = aPayer.reduce((s, f) => s + du(f), 0);
    const j = periode.jours;
    return {
      docs: docs.length,
      docsTotal: donnees.docs.length,
      facture,
      nbEmises: emises.length,
      paye,
      reste,
      demandes: demandes.length,
      demandesTotal: donnees.demandes.length,
      decisions: decisions.length,
      enAttente: enAttente.length,
      series: {
        docs: parJour(docs, (d) => d.recu_le, () => 1, depuis, j),
        facture: parJour(emises, (f) => f.date_emission, (f) => f.montant_ttc ?? 0, depuis, j),
        paye: parJour(reglees, (f) => donnees.etats[f.id]?.dernier_le, (f) => donnees.etats[f.id]?.regle ?? 0, depuis, j),
        demandes: parJour(demandes, (d) => d.cree_le, () => 1, depuis, j),
        decisions: parJour(decisions, (d) => d.decide_le, () => 1, depuis, j),
      },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `dans` ne dépend que de `depuis`
  }, [donnees, depuis, periode.jours]);

  const bornes = depuis !== null && aujourdhui !== null ? `${dateCourte(new Date(depuis).toISOString())} – ${dateCourte(new Date(aujourdhui).toISOString())}` : null;
  const attente = <Squelette largeur={96} hauteur={14} />;

  return (
    <SbPage
      titre="Utilisation"
      filtres={{
        gauche: <ChoixPeriode valeur={periode} changer={setPeriode} />,
        droite: (
          <>
            <span>
              Vous voyez {source === "exemple" ? <span className="sb-marque">les données d&apos;exemple</span> : <span className="sb-marque">votre base réelle</span>}
            </span>
            <span className="v2-tabulaire">{bornes ?? attente}</span>
          </>
        ),
      }}
    >
      {erreur ? (
        <div className="sb-conteneur" style={{ paddingTop: 24 }}>
          <Note teinte="rouge" role="alert">
            <strong>La base réelle n&apos;a pas répondu.</strong> {erreur}
          </Note>
        </div>
      ) : null}

      <SbSection
        id="resume"
        titre="Résumé de l'utilisation"
        textes={["Ce que l'espace a traité pour vous sur la période : les documents lus par FILED, les montants facturés et payés, les demandes passées par la file de validation. Les chiffres se mettent à jour à chaque passage des moteurs."]}
        liens={[
          { libelle: "Vos données", href: "/vos-donnees", externe: true },
          { libelle: "Réglages de l'espace", href: "/espace2/reglages" },
        ]}
      >
        <p className="sb-texte">{m ? `Sur ${periode.libelle.toLowerCase()} : ${nombre(m.docs)} document${m.docs > 1 ? "s" : ""} reçu${m.docs > 1 ? "s" : ""} et ${nombre(m.demandes)} demande${m.demandes > 1 ? "s" : ""} de validation.` : attente}</p>
        <SbCompteurs>
          <SbCompteur libelle="Documents reçus" href="#documents" valeur={m ? `${nombre(m.docs)} / ${nombre(m.docsTotal)}${pctTexte(m.docs, m.docsTotal)}` : attente} pct={m ? pct(m.docs, m.docsTotal) : null} />
          <SbCompteur libelle="Montant facturé" href="#facture" valeur={m ? euros(m.facture) : attente} />
          <SbCompteur libelle="Payé" href="#paye" valeur={m ? `${euros(m.paye)} / ${euros(m.reste)}${pctTexte(m.paye, m.reste)}` : attente} pct={m ? pct(m.paye, m.reste) : null} />
          <SbCompteur libelle="Demandes reçues" href="#demandes" valeur={m ? `${nombre(m.demandes)} / ${nombre(m.demandesTotal)}${pctTexte(m.demandes, m.demandesTotal)}` : attente} pct={m ? pct(m.demandes, m.demandesTotal) : null} />
          <SbCompteur libelle="Décisions prises" href="#decisions" valeur={m ? `${nombre(m.decisions)} / ${nombre(m.demandes)}${pctTexte(m.decisions, m.demandes)}` : attente} pct={m ? pct(m.decisions, m.demandes) : null} />
          <SbCompteur
            libelle="En attente de décision"
            href="/espace2/validations"
            badge={m && m.enAttente ? { texte: "À traiter", teinte: "ambre" } : undefined}
            valeur={m ? `${nombre(m.enAttente)} / ${nombre(m.demandesTotal)}` : attente}
            pct={m ? pct(m.enAttente, m.demandesTotal) : null}
            teinte={m && m.enAttente ? "ambre" : undefined}
          />
        </SbCompteurs>
      </SbSection>

      <SbSection
        id="documents"
        titre="Documents reçus"
        textes={["Chaque document arrivé dans FILED : reçu par l'adresse dédiée, déposé à la main ou repris d'un dossier, puis lu, contrôlé et classé.", "Un doublon ou une pièce illisible compte comme reçu : il apparaît dans les documents, avec son état."]}
        liens={[{ libelle: "Documents reçus", href: "/espace2/filed" }]}
      >
        {m ? (
          <>
            <SbMesure
              titre="Documents sur la période"
              pct={pct(m.docs, m.docsTotal)}
              lignes={[
                { libelle: "Reçus sur la période", valeur: nombre(m.docs) },
                { libelle: "Dans l'espace, toutes périodes", valeur: nombre(m.docsTotal) },
              ]}
            />
            <SbGraphique titre="Documents par jour" texte="Le nombre de pièces arrivées chaque jour, toutes sources confondues." barres={m.series.docs} format={nombre} />
          </>
        ) : (
          attente
        )}
      </SbSection>

      <SbSection id="facture" titre="Montant facturé" textes={["Le total toutes taxes des factures fournisseurs émises sur la période, avoirs exclus.", "Le montant suit la date d'émission lue sur la pièce, pas sa date d'arrivée."]} liens={[{ libelle: "À payer", href: "/espace2/filed/a-payer" }]}>
        {m ? (
          <>
            <SbMesure
              titre="Factures émises sur la période"
              lignes={[
                { libelle: "Factures", valeur: nombre(m.nbEmises) },
                { libelle: "Montant TTC", valeur: euros(m.facture) },
              ]}
            />
            <SbGraphique titre="Montant facturé par jour" texte="Le total TTC des factures, à leur date d'émission." barres={m.series.facture} format={euros} />
          </>
        ) : (
          attente
        )}
      </SbSection>

      <SbSection id="paye" titre="Payé" textes={["Les règlements notés sur la période, face au reste dû des factures validées.", "Une facture réglée en plusieurs fois compte chaque règlement à sa date."]} liens={[{ libelle: "À payer", href: "/espace2/filed/a-payer" }]}>
        {m ? (
          <>
            <SbMesure
              titre="Règlements sur la période"
              pct={pct(m.paye, m.reste)}
              lignes={[
                { libelle: "Payé sur la période", valeur: euros(m.paye) },
                { libelle: "Reste dû aujourd'hui", valeur: euros(m.reste) },
              ]}
            />
            <SbGraphique titre="Payé par jour" texte="Le montant des règlements notés, jour par jour." barres={m.series.paye} format={euros} />
          </>
        ) : (
          attente
        )}
      </SbSection>

      <SbSection id="demandes" titre="Demandes reçues" textes={["Les demandes entrées dans la file de validation : un virement, une facture à payer, un IBAN à confirmer, une anomalie à lever.", "Rien ne part sans une décision : chaque demande attend la personne que la règle désigne."]} liens={[{ libelle: "À valider", href: "/espace2/validations" }]}>
        {m ? (
          <>
            <SbMesure
              titre="Demandes sur la période"
              pct={pct(m.demandes, m.demandesTotal)}
              lignes={[
                { libelle: "Reçues sur la période", valeur: nombre(m.demandes) },
                { libelle: "En attente aujourd'hui", valeur: nombre(m.enAttente) },
              ]}
            />
            <SbGraphique titre="Demandes par jour" barres={m.series.demandes} format={nombre} />
          </>
        ) : (
          attente
        )}
      </SbSection>

      <SbSection id="decisions" titre="Décisions prises" textes={["Les demandes approuvées, refusées, annulées ou expirées sur la période, avec leur date de décision."]} liens={[{ libelle: "À valider", href: "/espace2/validations" }]}>
        {m ? (
          <>
            <SbMesure
              titre="Décisions sur la période"
              pct={pct(m.decisions, m.demandes)}
              lignes={[
                { libelle: "Décisions", valeur: nombre(m.decisions) },
                { libelle: "Demandes reçues sur la période", valeur: nombre(m.demandes) },
              ]}
            />
            <SbGraphique titre="Décisions par jour" barres={m.series.decisions} format={nombre} />
          </>
        ) : (
          attente
        )}
      </SbSection>
    </SbPage>
  );
}
