"use client";

/* ══════════════════════════════════════════════════════════════════════
   CASHD — « Litiges et pauses » et « Devis sans réponse » sur la liste des
   fils de Plain (28/10/2026, demande de Teo : « reproduis-les à l'identique »)

   Les deux pages lisent le même tableau que les pages de fonction d'avant
   (./donnees.ts : l'exemple ou la base réelle, par les mêmes portes) et
   gardent chacun de leurs gestes :
     · la recherche d'un compte, dans le menu Filtres (F) ;
     · les chiffres du bandeau d'avant, en compteurs d'onglets, de filtres
       et dans la description de la section ;
     · « Débiteurs et relances », dans la tête ;
     · la fiche du compte (l'écran de travail), depuis la carte au milieu.
   Onglets, filtres, tri et ligne ouverte vivent dans l'adresse (replace).
   Gabarit : ../lin/ListeFils.tsx, ../lin/plain-fils.css.
   ══════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Copy, ExternalLink, ListChecks, ListFilter } from "lucide-react";
import { dateCourte, montant } from "@/components/espace3/base/format";
import type { Balance, DevisEnAttente, StatutCompte } from "@/components/espace3/base/cashd/types";
import { MenuActions, type Option } from "../lin/Lin";
import { CarteCentrale, Feuille } from "../lin/CarteCentrale";
import {
  BoutonPlain,
  ChampPlain,
  IconeAffichage,
  IconeAnneau,
  IconeCroix,
  IconeFiltres,
  IconeHorloge,
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
import { useToast } from "../Toasts";
import { RACINE } from "../modules";
import { lienCompte, useTableauCashd } from "./donnees";

const sansAccents = (x: string) => x.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? "s" : ""}`;
const LIEN_DEBITEURS = `${RACINE}/cashd/suivi?vue=debiteurs`;

/* ═══════════════════ Litiges et pauses ═══════════════════ */

const HORS_CYCLE: readonly StatutCompte[] = ["litige", "pause", "recouvrement", "attente_contact", "hors_perimetre"];
/* la situation d'un compte hors cycle : son statut, ou « litige partiel » (compte suivi, une facture contestée) */
type Situation = StatutCompte | "partiel";
const SITUATIONS: { cle: Situation; libelle: string; sous: string; prio: Priorite; icone: React.ReactNode; teinte?: "bleu" | "orange" }[] = [
  { cle: "litige", libelle: "En litige", sous: "contestation ouverte, plus aucune relance", prio: 3, icone: <IconeAnneau />, teinte: "orange" },
  { cle: "partiel", libelle: "Litige partiel", sous: "une facture contestée, le reste du compte continue", prio: 3, icone: <IconeAnneau /> },
  { cle: "recouvrement", libelle: "En recouvrement", sous: "dossier remis", prio: 4, icone: <IconeAnneau />, teinte: "orange" },
  { cle: "pause", libelle: "En pause", sous: "relances suspendues", prio: 2, icone: <IconeHorloge /> },
  { cle: "attente_contact", libelle: "Contact à désigner", sous: "personne à qui écrire", prio: 2, icone: <IconeAnneau />, teinte: "bleu" },
  { cle: "hors_perimetre", libelle: "Ne plus contacter", sous: "sorti du périmètre", prio: 1, icone: <IconeCroix /> },
];
const situationDe = (b: Balance): Situation => (b.statut === "actif" ? "partiel" : b.statut);
const infoSituation = (s: Situation) => SITUATIONS.find((x) => x.cle === s)!;

type OngletLitiges = "litige" | "pause" | "tous";
const ONGLETS_LITIGES: { cle: OngletLitiges; libelle: string; garde: (s: Situation) => boolean }[] = [
  { cle: "litige", libelle: "En litige", garde: (s) => s === "litige" || s === "partiel" || s === "recouvrement" },
  { cle: "pause", libelle: "En pause", garde: (s) => s === "pause" || s === "attente_contact" || s === "hors_perimetre" },
  { cle: "tous", libelle: "Toutes les situations", garde: () => true },
];
type TriLitiges = "litige" | "encours" | "echeance" | "nom";
const TRIS_LITIGES: { cle: TriLitiges; libelle: string }[] = [
  { cle: "litige", libelle: "Montant en litige, le plus lourd d'abord" },
  { cle: "encours", libelle: "Encours, le plus lourd d'abord" },
  { cle: "echeance", libelle: "Plus ancienne échéance d'abord" },
  { cle: "nom", libelle: "Nom du compte" },
];

export function FilsLitiges() {
  const CHEMIN = `${RACINE}/cashd/litiges`;
  const { tableau, erreur } = useTableauCashd();
  const routeur = useRouter();
  const params = useSearchParams();
  const toast = useToast();
  const adresse = useAdresse(CHEMIN, params);
  const [recherche, setRecherche] = useState("");

  const onglet = (ONGLETS_LITIGES.find((o) => o.cle === params.get("onglet"))?.cle ?? "litige") as OngletLitiges;
  const situation = (SITUATIONS.find((s) => s.cle === params.get("situation"))?.cle ?? null) as Situation | null;
  const tri = (TRIS_LITIGES.find((t) => t.cle === params.get("tri"))?.cle ?? "litige") as TriLitiges;
  const grouper = params.get("grouper") === "1";
  const id = params.get("id");
  const aller = (href: string) => routeur.replace(href, { scroll: false });
  const lienId = (x: string | null) => adresse((p) => (x ? p.set("id", x) : p.delete("id")));

  /* les comptes hors cycle : un statut hors cycle, ou une facture en litige sur un compte suivi */
  const base = useMemo(() => (tableau ? tableau.comptes.filter((b) => HORS_CYCLE.includes(b.statut) || b.en_litige > 0) : []), [tableau]);
  const q = sansAccents(recherche.trim());
  const correspond = (b: Balance) => !q || [b.nom, b.reference, b.groupe].some((x) => x && sansAccents(x).includes(q));
  const garde = ONGLETS_LITIGES.find((o) => o.cle === onglet)!.garde;
  const visibles = base.filter((b) => garde(situationDe(b)) && (!situation || situationDe(b) === situation) && correspond(b));
  const ordre = (a: Balance, b: Balance) =>
    tri === "nom"
      ? a.nom.localeCompare(b.nom, "fr")
      : tri === "encours"
        ? b.encours - a.encours || b.en_litige - a.en_litige
        : tri === "echeance"
          ? (a.plus_ancienne_echeance ?? "9").localeCompare(b.plus_ancienne_echeance ?? "9")
          : b.en_litige - a.en_litige || b.encours - a.encours;
  const tries = [...visibles].sort(ordre);

  const fil = (b: Balance): Fil => {
    const s = infoSituation(situationDe(b));
    const apercu = [b.en_litige ? `En litige ${montant(b.en_litige, b.devise)}` : null, `Encours ${montant(b.encours, b.devise)}`, b.retard_max_jours > 0 ? `retard max ${b.retard_max_jours} j` : null]
      .filter(Boolean)
      .join(" · ");
    return {
      id: b.compte_id,
      href: lienId(b.compte_id),
      etat: s.icone,
      etatTeinte: s.teinte,
      avatar: { lettre: initialesDe(b.nom), couleur: couleurDe(b.compte_id), titre: b.nom },
      client: b.nom,
      contact: b.groupe,
      badge: situationDe(b) === "partiel" ? { texte: "Litige partiel" } : null,
      ref: b.reference,
      titre: s.libelle,
      apercu,
      priorite: s.prio,
      heure: { texte: b.plus_ancienne_echeance ? dateCourte(b.plus_ancienne_echeance) : "—", iso: b.plus_ancienne_echeance ?? undefined, icone: "calendrier", urgence: b.retard_max_jours > 0 },
      qui: null,
    };
  };

  const totalLitige = tableau?.totaux.en_litige ?? 0;
  const n = (s: Situation) => base.filter((b) => situationDe(b) === s && correspond(b)).length;
  const description = [`Montant en litige : ${montant(totalLitige)}`, `${pluriel(n("pause"), "compte")} en pause`, `${n("recouvrement")} en recouvrement`, `${n("attente_contact")} sans contact`].join(" · ");
  const sections: SectionFils[] = grouper
    ? SITUATIONS.map((s) => ({ cle: s.cle, titre: s.libelle, icone: s.icone, description: s.sous, fils: tries.filter((b) => situationDe(b) === s.cle).map(fil) }))
    : [{ cle: "tous", titre: "Comptes hors cycle", description, fils: tries.map(fil) }];
  const filtresPoses: FiltrePose[] = [
    ...(situation ? [{ cle: "situation", libelle: infoSituation(situation).libelle, icone: infoSituation(situation).icone, href: adresse((p) => p.delete("situation")) }] : []),
    ...(recherche ? [{ cle: "q", libelle: `« ${recherche} »`, href: "#" }] : []),
  ];

  const choisi = id ? (base.find((b) => b.compte_id === id) ?? null) : null;
  const rang = choisi ? tries.findIndex((b) => b.compte_id === choisi.compte_id) : -1;
  const copier = (texte: string, quoi: string) =>
    navigator.clipboard?.writeText(texte).then(
      () => toast(quoi, "vert"),
      () => toast("Impossible de copier. Réessayez.", "rouge"),
    );

  return (
    <ListeFils
      titre="Litiges et pauses"
      actions={
        <>
          <BoutonPlain href={LIEN_DEBITEURS} icone={<ListChecks width={18} height={18} aria-hidden="true" />}>
            Débiteurs et relances
          </BoutonPlain>
          <MenuPlain icone={<IconeFiltres />} libelle="Filtres" raccourci="F" n={filtresPoses.length || undefined}>
            {(fermer) => (
              <>
                <div className="pf-menu-groupe">
                  <input
                    className="pf-menu-champ"
                    autoFocus
                    placeholder="Rechercher un compte…"
                    aria-label="Rechercher un compte"
                    value={recherche}
                    onChange={(e) => setRecherche(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && fermer()}
                  />
                </div>
                <div className="pf-menu-groupe" role="group" aria-label="Situation">
                  <p className="pf-menu-titre">Situation</p>
                  {SITUATIONS.map((s) => (
                    <OptionPlain
                      key={s.cle}
                      icone={s.icone}
                      n={n(s.cle)}
                      actif={situation === s.cle}
                      onClick={() => {
                        fermer();
                        aller(adresse((p) => (situation === s.cle ? p.delete("situation") : p.set("situation", s.cle))));
                      }}
                    >
                      {s.libelle}
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
                    Par situation
                  </button>
                </div>
                <p className="pf-etiquette">Trier par</p>
                <ChampPlain<TriLitiges> libelle="Trier par" valeur={tri} options={TRIS_LITIGES} onChange={(v) => aller(adresse((p) => (v === "litige" ? p.delete("tri") : p.set("tri", v))))} />
              </div>
            )}
          </MenuPlain>
        </>
      }
      onglets={ONGLETS_LITIGES.map((o) => ({
        cle: o.cle,
        libelle: o.libelle,
        icone: o.cle === "litige" ? <IconeAnneau /> : o.cle === "pause" ? <IconeHorloge /> : undefined,
        teinte: o.cle === "litige" ? "bleu" : undefined,
        n: o.cle === "tous" ? undefined : base.filter((b) => o.garde(situationDe(b))).length,
        href: adresse((p) => {
          if (o.cle === "litige") p.delete("onglet");
          else p.set("onglet", o.cle);
          p.delete("id");
        }),
      }))}
      ongletActif={onglet}
      filtresPoses={filtresPoses.map((f) => (f.cle === "q" ? { ...f, href: adresse(() => {}) } : f))}
      note={erreur ? `La base réelle n'a pas répondu. ${erreur}` : null}
      sections={sections}
      idOuvert={id}
      chargement={!tableau && !erreur}
      vide={
        recherche || situation
          ? { titre: "Aucun compte ne correspond", texte: "Essayez un autre nom ou retirez le filtre." }
          : onglet === "pause"
            ? { titre: "Aucun compte en pause", texte: "Toutes les factures ouvertes suivent leur séquence de relance." }
            : { titre: "Aucun compte hors cycle", texte: "Toutes les factures ouvertes suivent leur séquence de relance." }
      }
    >
      <CarteCentrale
        ouverte={!!id && !!tableau}
        fermer={() => aller(lienId(null))}
        libelle={choisi ? `Compte ${choisi.nom}` : "Compte introuvable"}
        sur="CASHD · Compte hors cycle"
        statut={choisi ? <>{infoSituation(situationDe(choisi)).libelle}</> : undefined}
        nav={
          choisi && rang >= 0
            ? {
                position: rang + 1,
                total: tries.length,
                precedente: rang > 0 ? () => aller(lienId(tries[rang - 1].compte_id)) : undefined,
                suivante: rang < tries.length - 1 ? () => aller(lienId(tries[rang + 1].compte_id)) : undefined,
              }
            : null
        }
        gauche={
          choisi ? (
            <Feuille
              titre="COMPTE CLIENT"
              sous={choisi.reference}
              nom={choisi.nom}
              sousNom={choisi.groupe ? [choisi.groupe] : undefined}
              lignes={[
                ["Situation", infoSituation(situationDe(choisi)).libelle],
                ["En litige", choisi.en_litige ? montant(choisi.en_litige, choisi.devise) : "—"],
                ["Échu", montant(choisi.echu, choisi.devise)],
                ["Non échu", montant(choisi.non_echu, choisi.devise)],
                ["Plus de 90 jours", choisi.echu_plus_90 ? montant(choisi.echu_plus_90, choisi.devise) : "—"],
                ["Crédits", choisi.credits ? montant(choisi.credits, choisi.devise) : "—"],
                ["Factures ouvertes", `${choisi.factures_ouvertes}, dont ${pluriel(choisi.factures_echues, "échue")}`],
                ["Plus ancienne échéance", choisi.plus_ancienne_echeance ? dateCourte(choisi.plus_ancienne_echeance) : "—"],
                ["Retard max", choisi.retard_max_jours > 0 ? `${choisi.retard_max_jours} j` : "—"],
                ["Plafond d'encours", choisi.plafond_encours !== null ? montant(choisi.plafond_encours, choisi.devise) : "aucun"],
              ]}
              total={["Encours", montant(choisi.encours, choisi.devise)]}
            />
          ) : (
            <Feuille titre="COMPTE CLIENT" sous={null} texte="Aucune fiche." />
          )
        }
        titre={choisi ? choisi.nom : "Compte introuvable"}
        chiffre={choisi ? montant(choisi.en_litige || choisi.encours, choisi.devise) : undefined}
        echeance={choisi?.plus_ancienne_echeance ? { texte: `Plus ancienne échéance · ${dateCourte(choisi.plus_ancienne_echeance)}`, urgence: choisi.retard_max_jours > 0 ? "retard" : undefined } : null}
        actions={
          choisi ? (
            <>
              <Link href={lienCompte(choisi.compte_id)} className="v2-btn v2-btn--primaire">
                <ExternalLink width={14} height={14} aria-hidden="true" /> Ouvrir la fiche du compte
              </Link>
              <Link href={LIEN_DEBITEURS} className="v2-btn v2-btn--fantome">
                <ListChecks width={14} height={14} aria-hidden="true" /> Débiteurs et relances
              </Link>
              <span className="v2 pf-plus">
                <span className="lin">
                  <MenuActions
                    rond
                    titre="Plus d'actions"
                    options={
                      [
                        { cle: "nom", libelle: "Copier le nom", icone: <Copy width={16} height={16} />, action: () => void copier(choisi.nom, "Nom copié") },
                        { cle: "ref", libelle: "Copier la référence", meta: choisi.reference, icone: <Copy width={16} height={16} />, action: () => void copier(choisi.reference, "Référence copiée") },
                        {
                          cle: "seule",
                          libelle: `Seulement « ${infoSituation(situationDe(choisi)).libelle} »`,
                          icone: <ListFilter width={16} height={16} />,
                          coche: situation === situationDe(choisi),
                          action: () => aller(adresse((p) => (situation === situationDe(choisi) ? p.delete("situation") : p.set("situation", situationDe(choisi))))),
                        },
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
          <>
            <dl className="v2-det-fiche">
              <dt>Situation</dt>
              <dd>
                {infoSituation(situationDe(choisi)).libelle} <span className="v2-det-sous">· {infoSituation(situationDe(choisi)).sous}</span>
              </dd>
              <dt>Référence</dt>
              <dd>
                <span className="v2-det-mono">{choisi.reference}</span>
                {choisi.groupe ? <span className="v2-det-sous"> · {choisi.groupe}</span> : null}
              </dd>
              <dt>En litige</dt>
              <dd>{choisi.en_litige ? montant(choisi.en_litige, choisi.devise) : "Aucune facture contestée"}</dd>
              <dt>Encours</dt>
              <dd>
                {montant(choisi.encours, choisi.devise)} <span className="v2-det-sous">· échu {montant(choisi.echu, choisi.devise)}</span>
              </dd>
              <dt>Retard</dt>
              <dd>{choisi.retard_max_jours > 0 ? `${choisi.retard_max_jours} jours au plus, ${pluriel(choisi.factures_echues, "facture échue")}` : "Aucune facture en retard"}</dd>
            </dl>
            <div className="v2-det-bloc">
              <h3 className="v2-det-section-titre">Ce que fait CASHD</h3>
              <p className="v2-det-vide">
                {situationDe(choisi) === "partiel"
                  ? "La facture contestée ne reçoit plus de relance ; le reste du compte continue sa séquence."
                  : situationDe(choisi) === "pause"
                    ? "Les relances sont suspendues. La reprise se décide dans la fiche du compte, jamais par un simple délai écoulé."
                    : situationDe(choisi) === "recouvrement"
                      ? "Le dossier est remis au recouvrement : plus aucune relance ne part d'ici."
                      : situationDe(choisi) === "attente_contact"
                        ? "Personne à qui écrire : désignez un contact dans la fiche du compte pour que les relances repartent."
                        : situationDe(choisi) === "hors_perimetre"
                          ? "Ce compte n'est plus contacté."
                          : "Une contestation est ouverte : aucune relance ne part tant qu'elle n'est pas levée dans la fiche du compte."}
              </p>
            </div>
          </>
        ) : (
          <p className="v2-det-vide">Le compte que désigne ce lien n&apos;est pas connu.</p>
        )}
      </CarteCentrale>
    </ListeFils>
  );
}

/* ═══════════════════ Devis sans réponse ═══════════════════ */

type Etape = "avant" | "premier" | "second";
const ETAPES: { cle: Etape; libelle: string; sous: string; prio: Priorite; icone: React.ReactNode; teinte?: "bleu" | "orange" }[] = [
  { cle: "avant", libelle: "Avant le premier rappel", sous: "moins de trois jours depuis l'envoi", prio: 2, icone: <IconeHorloge /> },
  { cle: "premier", libelle: "Premier rappel", sous: "entre le troisième et le dixième jour", prio: 3, icone: <IconeAnneau />, teinte: "bleu" },
  { cle: "second", libelle: "Second rappel passé", sous: "plus de dix jours sans réponse", prio: 4, icone: <IconeAnneau />, teinte: "orange" },
];
const etapeDe = (d: DevisEnAttente): Etape => (d.jours_ecoules < 3 ? "avant" : d.jours_ecoules < 10 ? "premier" : "second");
const infoEtape = (e: Etape) => ETAPES.find((x) => x.cle === e)!;
type OngletDevis = "rappel" | "avant" | "tous";
const ONGLETS_DEVIS: { cle: OngletDevis; libelle: string; garde: (e: Etape) => boolean }[] = [
  { cle: "rappel", libelle: "À rappeler", garde: (e) => e !== "avant" },
  { cle: "avant", libelle: "Avant le premier rappel", garde: (e) => e === "avant" },
  { cle: "tous", libelle: "Tous les devis", garde: () => true },
];
type TriDevis = "attente" | "montant" | "compte";
const TRIS_DEVIS: { cle: TriDevis; libelle: string }[] = [
  { cle: "attente", libelle: "Attente, la plus longue d'abord" },
  { cle: "montant", libelle: "Montant, le plus gros d'abord" },
  { cle: "compte", libelle: "Nom du compte" },
];

export function FilsDevis() {
  const CHEMIN = `${RACINE}/cashd/devis`;
  const { tableau, erreur } = useTableauCashd();
  const routeur = useRouter();
  const params = useSearchParams();
  const toast = useToast();
  const adresse = useAdresse(CHEMIN, params);
  const [recherche, setRecherche] = useState("");

  const onglet = (ONGLETS_DEVIS.find((o) => o.cle === params.get("onglet"))?.cle ?? "rappel") as OngletDevis;
  const etape = (ETAPES.find((e) => e.cle === params.get("etape"))?.cle ?? null) as Etape | null;
  const tri = (TRIS_DEVIS.find((t) => t.cle === params.get("tri"))?.cle ?? "attente") as TriDevis;
  const grouper = params.get("grouper") === "1";
  const id = params.get("id");
  const aller = (href: string) => routeur.replace(href, { scroll: false });
  const lienId = (x: string | null) => adresse((p) => (x ? p.set("id", x) : p.delete("id")));

  const base = useMemo(() => tableau?.devis_en_attente ?? [], [tableau]);
  const q = sansAccents(recherche.trim());
  const correspond = (d: DevisEnAttente) => !q || [d.compte, d.numero].some((x) => x && sansAccents(x).includes(q));
  const garde = ONGLETS_DEVIS.find((o) => o.cle === onglet)!.garde;
  const visibles = base.filter((d) => garde(etapeDe(d)) && (!etape || etapeDe(d) === etape) && correspond(d));
  const tries = [...visibles].sort((a, b) => (tri === "compte" ? a.compte.localeCompare(b.compte, "fr") : tri === "montant" ? b.montant_ttc - a.montant_ttc : b.jours_ecoules - a.jours_ecoules));

  const fil = (d: DevisEnAttente): Fil => {
    const e = infoEtape(etapeDe(d));
    return {
      id: d.id,
      href: lienId(d.id),
      etat: e.icone,
      etatTeinte: e.teinte,
      avatar: { lettre: initialesDe(d.compte), couleur: couleurDe(d.compte_id), titre: d.compte },
      client: d.compte,
      ref: d.numero,
      titre: e.libelle,
      apercu: `${montant(d.montant_ttc)} TTC · envoyé le ${dateCourte(d.date_emission)}`,
      priorite: e.prio,
      heure: { texte: `${d.jours_ecoules} j`, iso: d.date_emission, icone: "horloge", urgence: d.jours_ecoules > 10 },
      qui: null,
    };
  };
  const n = (e: Etape) => base.filter((d) => etapeDe(d) === e && correspond(d)).length;
  const total = base.reduce((s, x) => s + x.montant_ttc, 0);
  const plusAncien = base.length ? Math.max(...base.map((x) => x.jours_ecoules)) : 0;
  const description = [`${pluriel(base.length, "devis")} sans réponse`, `${montant(total)} TTC en jeu`, `${n("second")} après les deux rappels`, plusAncien ? `le plus ancien : ${plusAncien} j` : null]
    .filter(Boolean)
    .join(" · ");
  const sections: SectionFils[] = grouper
    ? ETAPES.map((e) => ({ cle: e.cle, titre: e.libelle, icone: e.icone, description: e.sous, fils: tries.filter((d) => etapeDe(d) === e.cle).map(fil) }))
    : [{ cle: "tous", titre: "Devis en attente", description, fils: tries.map(fil) }];
  const filtresPoses: FiltrePose[] = [
    ...(etape ? [{ cle: "etape", libelle: infoEtape(etape).libelle, icone: infoEtape(etape).icone, href: adresse((p) => p.delete("etape")) }] : []),
    ...(recherche ? [{ cle: "q", libelle: `« ${recherche} »`, href: adresse(() => {}) }] : []),
  ];

  const choisi = id ? (base.find((d) => d.id === id) ?? null) : null;
  const rang = choisi ? tries.findIndex((d) => d.id === choisi.id) : -1;
  const copier = (texte: string, quoi: string) =>
    navigator.clipboard?.writeText(texte).then(
      () => toast(quoi, "vert"),
      () => toast("Impossible de copier. Réessayez.", "rouge"),
    );
  const prochain = (d: DevisEnAttente) =>
    d.jours_ecoules < 3
      ? `Premier rappel dans ${3 - d.jours_ecoules} j, à valider dans « À valider »`
      : d.jours_ecoules < 10
        ? `Second rappel dans ${10 - d.jours_ecoules} j, à valider dans « À valider »`
        : "Les deux rappels sont passés : à décider dans la fiche du compte";

  return (
    <ListeFils
      titre="Devis sans réponse"
      actions={
        <>
          <BoutonPlain href={LIEN_DEBITEURS} icone={<ListChecks width={18} height={18} aria-hidden="true" />}>
            Débiteurs et relances
          </BoutonPlain>
          <MenuPlain icone={<IconeFiltres />} libelle="Filtres" raccourci="F" n={filtresPoses.length || undefined}>
            {(fermer) => (
              <>
                <div className="pf-menu-groupe">
                  <input
                    className="pf-menu-champ"
                    autoFocus
                    placeholder="Rechercher un compte, un numéro…"
                    aria-label="Rechercher un devis"
                    value={recherche}
                    onChange={(e) => setRecherche(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && fermer()}
                  />
                </div>
                <div className="pf-menu-groupe" role="group" aria-label="Étape">
                  <p className="pf-menu-titre">Étape</p>
                  {ETAPES.map((e) => (
                    <OptionPlain
                      key={e.cle}
                      icone={e.icone}
                      n={n(e.cle)}
                      actif={etape === e.cle}
                      onClick={() => {
                        fermer();
                        aller(adresse((p) => (etape === e.cle ? p.delete("etape") : p.set("etape", e.cle))));
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
                    Par étape
                  </button>
                </div>
                <p className="pf-etiquette">Trier par</p>
                <ChampPlain<TriDevis> libelle="Trier par" valeur={tri} options={TRIS_DEVIS} onChange={(v) => aller(adresse((p) => (v === "attente" ? p.delete("tri") : p.set("tri", v))))} />
              </div>
            )}
          </MenuPlain>
        </>
      }
      onglets={ONGLETS_DEVIS.map((o) => ({
        cle: o.cle,
        libelle: o.libelle,
        icone: o.cle === "rappel" ? <IconeAnneau /> : o.cle === "avant" ? <IconeHorloge /> : undefined,
        teinte: o.cle === "rappel" ? "bleu" : undefined,
        n: o.cle === "tous" ? undefined : base.filter((d) => o.garde(etapeDe(d))).length,
        href: adresse((p) => {
          if (o.cle === "rappel") p.delete("onglet");
          else p.set("onglet", o.cle);
          p.delete("id");
        }),
      }))}
      ongletActif={onglet}
      filtresPoses={filtresPoses}
      note={erreur ? `La base réelle n'a pas répondu. ${erreur}` : null}
      sections={sections}
      idOuvert={id}
      chargement={!tableau && !erreur}
      vide={recherche || etape ? { titre: "Aucun devis ne correspond", texte: "Essayez un autre nom ou retirez le filtre." } : { titre: "Aucun devis en attente", texte: "Tous les devis envoyés ont reçu une réponse." }}
    >
      <CarteCentrale
        ouverte={!!id && !!tableau}
        fermer={() => aller(lienId(null))}
        libelle={choisi ? `Devis ${choisi.numero}` : "Devis introuvable"}
        sur="CASHD · Devis sans réponse"
        statut={choisi ? <>{infoEtape(etapeDe(choisi)).libelle}</> : undefined}
        nav={
          choisi && rang >= 0
            ? {
                position: rang + 1,
                total: tries.length,
                precedente: rang > 0 ? () => aller(lienId(tries[rang - 1].id)) : undefined,
                suivante: rang < tries.length - 1 ? () => aller(lienId(tries[rang + 1].id)) : undefined,
              }
            : null
        }
        gauche={
          choisi ? (
            <Feuille
              titre="DEVIS"
              sous={choisi.numero}
              nom={choisi.compte}
              lignes={[
                ["Envoyé le", dateCourte(choisi.date_emission)],
                ["Sans réponse depuis", `${choisi.jours_ecoules} j`],
                ["Étape", infoEtape(etapeDe(choisi)).libelle],
                ["Prochain rappel", choisi.jours_ecoules < 3 ? `J+3, dans ${3 - choisi.jours_ecoules} j` : choisi.jours_ecoules < 10 ? `J+10, dans ${10 - choisi.jours_ecoules} j` : "passé"],
              ]}
              total={["Montant TTC", montant(choisi.montant_ttc)]}
            />
          ) : (
            <Feuille titre="DEVIS" sous={null} texte="Aucune fiche." />
          )
        }
        titre={choisi ? `Devis ${choisi.numero} · ${choisi.compte}` : "Devis introuvable"}
        chiffre={choisi ? montant(choisi.montant_ttc) : undefined}
        echeance={choisi ? { texte: `Envoyé le ${dateCourte(choisi.date_emission)} · ${choisi.jours_ecoules} j sans réponse`, urgence: choisi.jours_ecoules > 10 ? "retard" : undefined } : null}
        actions={
          choisi ? (
            <>
              <Link href={lienCompte(choisi.compte_id)} className="v2-btn v2-btn--primaire">
                <ExternalLink width={14} height={14} aria-hidden="true" /> Ouvrir la fiche du compte
              </Link>
              <Link href={`${RACINE}/validations`} className="v2-btn v2-btn--fantome">
                <ListChecks width={14} height={14} aria-hidden="true" /> À valider
              </Link>
              <span className="v2 pf-plus">
                <span className="lin">
                  <MenuActions
                    rond
                    titre="Plus d'actions"
                    options={
                      [
                        { cle: "numero", libelle: "Copier le numéro", meta: choisi.numero, icone: <Copy width={16} height={16} />, action: () => void copier(choisi.numero, "Numéro copié") },
                        { cle: "compte", libelle: "Copier le nom du compte", icone: <Copy width={16} height={16} />, action: () => void copier(choisi.compte, "Nom copié") },
                        {
                          cle: "seule",
                          libelle: `Seulement « ${infoEtape(etapeDe(choisi)).libelle} »`,
                          icone: <ListFilter width={16} height={16} />,
                          coche: etape === etapeDe(choisi),
                          action: () => aller(adresse((p) => (etape === etapeDe(choisi) ? p.delete("etape") : p.set("etape", etapeDe(choisi))))),
                        },
                        { cle: "debiteurs", libelle: "Débiteurs et relances", icone: <ExternalLink width={16} height={16} />, href: LIEN_DEBITEURS },
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
          <>
            <dl className="v2-det-fiche">
              <dt>Étape</dt>
              <dd>
                {infoEtape(etapeDe(choisi)).libelle} <span className="v2-det-sous">· {infoEtape(etapeDe(choisi)).sous}</span>
              </dd>
              <dt>Compte</dt>
              <dd>{choisi.compte}</dd>
              <dt>Numéro</dt>
              <dd>
                <span className="v2-det-mono">{choisi.numero}</span>
              </dd>
              <dt>Montant</dt>
              <dd>{montant(choisi.montant_ttc)} TTC</dd>
              <dt>Envoyé le</dt>
              <dd>
                {dateCourte(choisi.date_emission)} <span className="v2-det-sous">· {choisi.jours_ecoules} j sans réponse</span>
              </dd>
            </dl>
            <div className="v2-det-bloc">
              <h3 className="v2-det-section-titre">Ce que fait CASHD</h3>
              <p className="v2-det-vide">{prochain(choisi)}.</p>
            </div>
          </>
        ) : (
          <p className="v2-det-vide">Le devis que désigne ce lien n&apos;est pas connu.</p>
        )}
      </CarteCentrale>
    </ListeFils>
  );
}
