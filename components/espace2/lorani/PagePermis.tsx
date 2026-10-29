"use client";

/* ══════════════════════════════════════════════════════════════════════
   LORANI › la page d'un permis (29/10/2026, refonte des pages métiers)

   La page « Get started » de Plain, au 1:1 : relevé docs/refonte-metiers/
   releves/plain-get-started.md, mesures dans ../lin/plain-get-started.css
   (préfixe pgs-). En tête : retour à la vue d'ensemble, le titre du permis,
   son projet (lien) et son état, « N sur 7 terminées ». Puis la vie d'un
   permis en sept étapes, dans l'ordre : dépôt, complétude, instruction,
   décision, affichage, recours des tiers, purge. Une étape est cochée
   quand elle est franchie (d'après les dates du permis et son calcul) ;
   l'étape en cours est ouverte d'office, une seule à la fois.

   Ce que l'écran d'avant faisait (PermisVue, inventaire lorani.md
   « Un permis », B7-B17, F7-F13), et où c'est ici :
     en tête      B8 (lecture seule), B9 (décision implicite à confirmer,
                  F9, F10), B10 (dates lues à confirmer ou écarter, F7, F8),
                  B14 (avertissements) — s'ils existent
     dépôt        B11 « Dossier déposé » (F10) ; B12 étape de dépôt
     complétude   B11 « Demande de pièces reçue », « Pièces reçues par la
                  mairie » (F10) ; B12, B15 ; B13 (plusieurs demandes)
     instruction  B11 « Délai notifié » (F10) ; B7 sans son titre (pastilles,
                  Régime F12, quatre chiffres, règle d'instruction) ; B12, B15
     décision     B11 « Arrêté reçu » (F10) ; B12, B15 (retrait)
     affichage    B11 « Permis affiché sur le terrain » (F10) ; B12, B15
     recours      B11 « Recours reçu » (F11) ; B16 et son issue (F13) ; B12, B15
     purge        B12, B15 (purge, chantier sans risque)
     sous la liste  B17 (courriers du dossier)
   Le titre de B7 est la tête de la page. Aucun geste n'est réécrit :
   chaque bloc est PermisVue habillée, filtrée par `parties` (mêmes
   portes, mêmes fenêtres). Les liens des alertes (E1-E3, E5-E9) arrivent
   ici : ce qui attend un membre est en tête, l'étape en cours ouverte.
   ══════════════════════════════════════════════════════════════════════ */

import { useMemo, useState } from "react";
import Link from "next/link";
import { Check, ChevronDown, ChevronLeft } from "lucide-react";
import PermisVue, { type PartiePermis } from "@/components/espace/lorani/PermisVue";
import { DECISIONS, ETATS, TYPES, titrePermis } from "@/components/espace/lorani/etats";
import type { Calcul, Etape, Permis, Recours } from "@/components/espace/lorani/types";
import Habille from "@/components/espace2/Habille";
import { RACINE } from "@/components/espace2/modules";
import { useLorani } from "./donnees";
import "@/components/espace/lorani/lorani.css";
import "../lin/lin.css";
import "../lin/plain-get-started.css";

const BASE = `${RACINE}/lorani`;

type CleEtape = "depot" | "completude" | "instruction" | "decision" | "affichage" | "recours" | "purge";

/* les sept étapes ; `gestes` : les boutons de « Saisir ce qui est arrivé » sous le texte ;
   `carte` : les blocs de la colonne de droite (natures d'étape du calendrier et d'échéance) */
const ETAPES: { cle: CleEtape; titre: string; gestes: PartiePermis[]; carte: PartiePermis[] }[] = [
  { cle: "depot", titre: "Dépôt du dossier", gestes: ["saisir:depot"], carte: ["etape:depot"] },
  {
    cle: "completude",
    titre: "Complétude : les pièces demandées",
    gestes: ["saisir:demande_pieces", "saisir:pieces_fournies"],
    carte: ["demandes", "etape:completude", "etape:demande_pieces", "etape:pieces", "echeance:completude", "echeance:pieces"],
  },
  { cle: "instruction", titre: "Instruction", gestes: ["saisir:delai"], carte: ["regime", "etape:instruction", "etape:delai_notifie", "echeance:instruction"] },
  { cle: "decision", titre: "Décision de la mairie", gestes: ["saisir:decision"], carte: ["etape:decision", "etape:decision_tacite", "etape:retrait", "echeance:retrait"] },
  { cle: "affichage", titre: "Affichage sur le terrain", gestes: ["saisir:affichage"], carte: ["etape:affichage", "echeance:affichage"] },
  { cle: "recours", titre: "Recours des tiers", gestes: ["saisir:recours"], carte: ["recours", "etape:recours", "etape:recours_saisi", "echeance:recours"] },
  { cle: "purge", titre: "Purge", gestes: [], carte: ["etape:purge", "etape:chantier", "echeance:purge"] },
];
/* une nature d'étape qu'aucune étape ne range va à l'instruction : rien du calendrier ne disparaît */
const NATURES_RANGEES = new Set(ETAPES.flatMap((e) => e.carte.filter((x) => x.startsWith("etape:")).map((x) => x.slice(6))));

const FINIES = ["fait", "passe"];
const CLOS = ["refuse", "rejete", "annule", "classe"];

const aujourdHui = () => {
  const d = new Date();
  return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, "0")}-${`${d.getDate()}`.padStart(2, "0")}`;
};
/* « 12 mars 2026 » : une date calendaire se lit en UTC (components/espace/format.ts) */
const jourFr = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const jour = (iso: string | null | undefined) => (iso ? jourFr.format(new Date(`${iso.slice(0, 10)}T12:00:00Z`)) : "—");
const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? "s" : ""}`;

type Contexte = { p: Permis; c: Calcul; etapes: Etape[]; recours: Recours[]; auj: string };

/* une étape est franchie d'après les dates du permis, son état et les étapes de son calcul */
function franchies({ p, etapes, recours, auj }: Contexte): Record<CleEtape, boolean> {
  const e = (n: string) => etapes.find((x) => x.nature === n);
  const passee = (n: string) => {
    const x = e(n);
    return !!x && (FINIES.includes(x.statut) || (!!x.date && x.date < auj));
  };
  const accorde = p.decision === "favorable" || p.decision === "tacite";
  return {
    depot: !!p.date_depot,
    completude: !!p.date_depot && (p.date_demande_pieces ? !!p.date_pieces_fournies : !!p.decision || !["a_deposer", "completude"].includes(p.etat) || passee("completude")),
    instruction: !!p.decision || ["decision_a_confirmer", "accorde", "recours_en_cours", "purge", "refuse", "rejete"].includes(p.etat),
    decision: !!p.decision,
    affichage: accorde && !!p.date_affichage,
    recours: p.etat === "purge" || (accorde && !!p.date_affichage && !recours.some((r) => r.issue === "en_cours") && passee("recours")),
    purge: p.etat === "purge",
  };
}

/* le titre vert et le texte de l'étape ouverte, tirés du permis */
function texte(cle: CleEtape, { p, c, etapes, recours }: Contexte): { titre: string; corps: string } {
  const e = (n: string) => etapes.find((x) => x.nature === n);
  const dp = p.type_autorisation === "dp";
  const accorde = p.decision === "favorable" || p.decision === "tacite";
  const pasAccorde = CLOS.includes(p.etat) || p.decision === "defavorable" || p.decision === "rejet_implicite";
  const sansObjet = { titre: "Sans objet", corps: "Le permis n'a pas été accordé : il n'y a ni affichage, ni recours des tiers, ni purge à suivre." };
  switch (cle) {
    case "depot":
      if (p.date_depot) return { titre: `Déposé le ${jour(p.date_depot)}`, corps: `${p.numero ? `Dossier n° ${p.numero}.` : "Aucun numéro de dossier saisi."} La mairie a un mois pour réclamer des pièces ; les échéances et leurs rappels sont nés au dépôt.` };
      if (p.etat === "hors_catalogue") return { titre: "Pas encore déposé", corps: "Lorani ne calcule pas les délais de ce territoire." };
      return { titre: "Pas encore déposé", corps: "Le calendrier commence au dépôt du dossier : saisissez la date de dépôt, ou déposez le récépissé pour qu'il soit lu. Les échéances et leurs rappels naissent à ce moment." };
    case "completude": {
      if (!p.date_depot) return { titre: "Après le dépôt", corps: "La mairie a un mois après le dépôt pour réclamer des pièces manquantes. Sans demande dans ce délai, le dossier est complet." };
      const codes = p.pieces_demandees.map((x) => x.code).join(", ");
      if (p.date_demande_pieces && !p.date_pieces_fournies) {
        const limite = e("pieces")?.date;
        return {
          titre: `${pluriel(p.pieces_demandees.length, "pièce")} à fournir`,
          corps: `Demandées le ${jour(p.date_demande_pieces)}${codes ? ` : ${codes}` : ""}.${limite ? ` À adresser à la mairie au plus tard le ${jour(limite)}, sinon ${dp ? "opposition" : "rejet"} tacite.` : ""} L'instruction commence à la réception de toutes les pièces.`,
        };
      }
      if (p.date_demande_pieces && p.date_pieces_fournies) return { titre: `Pièces reçues le ${jour(p.date_pieces_fournies)}`, corps: `Demandées le ${jour(p.date_demande_pieces)}${codes ? ` (${codes})` : ""}. L'instruction est repartie de la réception des pièces.` };
      const fin = e("completude")?.date;
      if (p.etat === "completude" && fin && fin >= aujourdHui()) return { titre: `La mairie peut réclamer des pièces jusqu'au ${jour(fin)}`, corps: "Si une lettre de demande arrive, saisissez-la ou déposez-la pour qu'elle soit lue : le délai de trois mois pour répondre court de sa date." };
      return { titre: "Dossier complet", corps: `Aucune pièce demandée dans le mois qui a suivi le dépôt${fin ? `, clos le ${jour(fin)}` : ""}.` };
    }
    case "instruction": {
      const regle = c.regime ? `Règle d'instruction : ${c.regime.regle_instruction}${c.regime.delai_notifie_mois ? `, délai de ${c.regime.delai_notifie_mois} mois notifié par la mairie` : ""}.` : "";
      if (!p.date_depot) return { titre: "Après le dépôt", corps: `${regle} Réglez le régime du permis pour que le délai et l'effet du silence soient justes.`.trim() };
      if (p.etat === "pieces_demandees") return { titre: "En attente des pièces", corps: `L'instruction commence à la réception de toutes les pièces manquantes. ${regle}`.trim() };
      if (p.decision) return { titre: "Instruction terminée", corps: `Décision rendue le ${jour(p.date_decision)}. ${regle}`.trim() };
      if (p.etat === "decision_a_confirmer") return { titre: "Délai écoulé", corps: `Aucune décision notifiée dans le délai : la décision implicite est à confirmer en tête de page. ${regle}`.trim() };
      return {
        titre: c.date_decision_attendue ? `Décision attendue le ${jour(c.date_decision_attendue)}` : "Instruction en cours",
        corps: `${regle}${c.regime ? ` Sans réponse de la mairie : ${c.regime.effet_silence}.` : ""}`.trim() || "Saisissez le délai notifié par la mairie s'il diffère du délai de droit commun.",
      };
    }
    case "decision": {
      if (p.decision) {
        const titre = `${DECISIONS[p.decision]} le ${jour(p.date_decision)}`;
        if (accorde) return { titre, corps: "Affichez le permis sur le terrain, puis saisissez le premier jour : le délai de recours des tiers court de là. La mairie peut retirer un permis illégal pendant trois mois." };
        return { titre, corps: p.decision === "defavorable" ? "La mairie a refusé le permis." : "Le silence de la mairie vaut rejet." };
      }
      if (p.etat === "decision_a_confirmer" && c.decision_implicite) {
        const tacite = c.decision_implicite.nature === "tacite";
        return {
          titre: `${tacite ? (dp ? "Non-opposition tacite née" : "Permis tacite né") : dp ? "Opposition tacite" : "Rejet implicite"} le ${jour(c.decision_implicite.date)}`,
          corps: "Si aucune décision ne vous a été notifiée, confirmez-la en tête de page. Si un arrêté est arrivé, saisissez-le plutôt.",
        };
      }
      if (!p.date_depot) return { titre: "Après l'instruction", corps: "La décision de la mairie arrive à la fin de l'instruction. Sans réponse, son silence vaut accord ou rejet selon le régime du permis." };
      return { titre: c.date_decision_attendue ? `Attendue au plus tard le ${jour(c.date_decision_attendue)}` : "Pas encore de décision", corps: "Saisissez l'arrêté dès sa réception, ou déposez-le pour qu'il soit lu." };
    }
    case "affichage":
      if (pasAccorde) return sansObjet;
      if (p.date_affichage) return { titre: `Affiché depuis le ${jour(p.date_affichage)}`, corps: "Le délai de recours des tiers court à compter du premier jour d'affichage continu sur le terrain." };
      if (accorde) return { titre: "Affichage à saisir", corps: "Tant que le premier jour d'affichage n'est pas saisi, le délai de recours des tiers ne court pas." };
      return { titre: "Après la décision", corps: "Le permis s'affiche sur le terrain dès qu'il est accordé, de façon visible depuis la voie publique." };
    case "recours": {
      if (pasAccorde) return sansObjet;
      const ouverts = recours.filter((r) => r.issue === "en_cours").length;
      if (ouverts) return { titre: `${pluriel(ouverts, "recours")} en cours`, corps: "Pas de purge avant son issue : saisissez-la dès qu'elle est connue." };
      if (p.etat === "purge" || (p.date_affichage && e("recours") && FINIES.includes(e("recours")!.statut))) return { titre: "Délai des tiers écoulé", corps: recours.length ? "Les recours saisis sont clos." : "Aucun recours saisi." };
      if (p.date_affichage) {
        const fin = e("recours")?.date;
        return { titre: fin ? `Les tiers peuvent agir jusqu'au ${jour(fin)}` : "Délai des tiers en cours", corps: "Un recours reçu se saisit ici : il suspend la purge jusqu'à son issue." };
      }
      return { titre: "Après l'affichage", corps: accorde ? "Tant que le permis n'est pas affiché, un recours reste possible." : "Les tiers peuvent former un recours à compter du premier jour d'affichage sur le terrain." };
    }
    case "purge": {
      if (pasAccorde) return sansObjet;
      const purge = c.date_purge ?? p.date_purge;
      const chantier = c.chantier_sans_risque_le;
      if (purge) return { titre: `${p.etat === "purge" ? "Purgé" : "Purge"} le ${jour(purge)}`, corps: chantier ? `Chantier sans risque de retrait ni de recours des tiers ${chantier <= aujourdHui() ? "depuis" : "dès"} le ${jour(chantier)}.` : "Le permis est purgé de tout retrait et de tout recours des tiers." };
      if (p.etat === "recours_en_cours") return { titre: "Suspendue", corps: "Un recours est en cours : la purge attend son issue." };
      return { titre: "Pas encore de date", corps: "La purge se calcule une fois le permis accordé et affiché : à la fin du retrait par la mairie et du recours des tiers." };
    }
  }
}

export default function PagePermis({ id }: { id: string }) {
  const { source, pret, erreur, dossier, peutEcrire, nommer, onLocal, relire } = useLorani();
  const p = dossier.permis.find((x) => x.id === id);
  const projet = p ? dossier.projets.find((x) => x.id === p.projet_id) : undefined;
  /* l'étape choisie ; tant que personne n'a cliqué, l'étape en cours */
  const [choisie, setChoisie] = useState<CleEtape | null | undefined>(undefined);

  const ctx = useMemo<Contexte | null>(() => {
    if (!p) return null;
    const c: Calcul = p.calcul ?? { etat: p.etat, etapes: [] };
    return { p, c, etapes: c.etapes ?? [], recours: dossier.recours.filter((r) => r.permis_id === p.id), auj: aujourdHui() };
  }, [p, dossier.recours]);

  const absent = pret && (!p || !projet);
  const titre = p ? titrePermis(p, projet?.nom ?? "") : "Permis";

  if (!p || !projet || !ctx) {
    return (
      <div className="lin pgs">
        <h1 className="v2-sr">{titre}</h1>
        <div className="pgs-colonne">
          <Link href={BASE} className="pgs-retour">
            <ChevronLeft aria-hidden="true" />
            Calendrier des permis
          </Link>
          <p className="pgs-vide" role={absent ? "alert" : "status"}>
            {absent ? (
              <>
                {erreur ? `La base n'a pas répondu : ${erreur} ` : "Ce permis n'est pas visible avec ce compte. "}
                <Link href={BASE} className="pgs-lien">
                  Revenir aux permis
                </Link>
              </>
            ) : (
              "Lecture du permis…"
            )}
          </p>
        </div>
      </div>
    );
  }

  const faites = franchies(ctx);
  const nbFaites = ETAPES.filter((e) => faites[e.cle]).length;
  const courante = ETAPES.find((e) => !faites[e.cle])?.cle ?? null;
  const ouverte = choisie === undefined ? courante : choisie;
  const etat = ETATS[p.etat] ?? ETATS.a_deposer;
  /* les natures d'étape que le calcul pose sans qu'une étape les range */
  const autres = [...new Set(ctx.etapes.map((e) => e.nature).filter((n) => !NATURES_RANGEES.has(n)))].map((n) => `etape:${n}` as PartiePermis);

  /* un bloc de l'écran d'avant, habillé, filtré par `parties` */
  const vue = (parties: PartiePermis[], cle: string) => (
    <Habille key={cle}>
      <PermisVue permis={p} projet={projet} dossier={dossier} source={source} peutEcrire={peutEcrire} nommer={nommer} onLocal={onLocal} relire={relire} parties={parties} />
    </Habille>
  );

  return (
    <div className="lin pgs">
      <h1 className="v2-sr">{titre}</h1>
      <div className="pgs-colonne">
        <Link href={BASE} className="pgs-retour">
          <ChevronLeft aria-hidden="true" />
          Calendrier des permis
        </Link>

        <header className="pgs-tete">
          <div className="pgs-tete-gauche">
            <div className="pgs-titre-ligne">
              <h2 className="pgs-titre">{titre}</h2>
              <span className="pgs-pastille" data-teinte={etat.teinte} title={etat.libelle}>
                {etat.court}
              </span>
            </div>
            <p className="pgs-sous">
              {TYPES[p.type_autorisation].libelle}
              {p.numero ? ` · n° ${p.numero}` : " · sans numéro"}
              {projet.commune ? ` · ${projet.commune}` : ""}
              {" · projet "}
              <Link href={`${BASE}/projets/${projet.id}`} className="pgs-lien">
                {projet.nom}
              </Link>
            </p>
          </div>
          <p className="pgs-compte">{`${nbFaites} sur ${ETAPES.length} terminées`}</p>
        </header>

        {/* ce qui attend un membre : lecture seule, décision implicite, dates lues, avertissements */}
        <div className="pgs-attente">{vue(["lecture", "retour", "implicite", "lues", "avertissements"], "attente")}</div>

        <ul className="pgs-liste" aria-label="Les étapes du permis">
          {ETAPES.map((e) => {
            const ouvre = ouverte === e.cle;
            const t = ouvre ? texte(e.cle, ctx) : null;
            return (
              <li key={e.cle} className="pgs-etape" data-ouverte={ouvre ? "" : undefined} data-faite={faites[e.cle] ? "" : undefined}>
                <button type="button" className="pgs-entete" aria-expanded={ouvre} aria-controls={ouvre ? `pgs-${e.cle}` : undefined} onClick={() => setChoisie(ouvre ? null : e.cle)}>
                  <span className="pgs-case" data-faite={faites[e.cle] ? "" : undefined} aria-hidden="true">
                    {faites[e.cle] ? <Check /> : null}
                  </span>
                  <span className="pgs-etape-titre">
                    {faites[e.cle] ? <span className="v2-sr">Terminée : </span> : null}
                    {e.titre}
                  </span>
                  <span className="pgs-chevron" aria-hidden="true">
                    <ChevronDown />
                  </span>
                </button>
                {ouvre && t ? (
                  <div id={`pgs-${e.cle}`} className="pgs-contenu">
                    <div className="pgs-grille">
                      <div className="pgs-texte">
                        <h3 className="pgs-h3">{t.titre}</h3>
                        <p className="pgs-p">{t.corps}</p>
                        {e.gestes.length ? <div className="pgs-gestes">{vue(["retour", ...e.gestes], `gestes-${e.cle}`)}</div> : null}
                      </div>
                      <div className="pgs-carte">{vue(["retour", ...e.carte, ...(e.cle === "instruction" ? autres : [])], `carte-${e.cle}`)}</div>
                    </div>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>

        {/* les courriers du dossier et les dates déjà décidées */}
        <div className="pgs-courriers">{vue(["courriers"], "courriers")}</div>
      </div>
    </div>
  );
}
