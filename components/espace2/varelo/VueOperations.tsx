"use client";

/* ══════════════════════════════════════════════════════════════════════
   VARELO — « Opérations » (/espace2/varelo/operations), 02/11/2026,
   refonte des pages métiers : Linear, Board (« All issues » en vue Board),
   au 1:1. Relevé : docs/refonte-metiers/releves/linear-board.md ; styles
   ./var.css (en-tête) et ./var-board.css (tableau).

   Ce qu'elle reprend de l'écran d'avant (inventaire, blocs 7 et 8) :
     · les réserves à émettre (8) et les reportings dus (7) deviennent des
       cartes, rangées en colonnes par état, dans l'ordre des états de
       Linear : En retard (Triage) · À venir (Backlog) · Cette semaine
       (Todo) · Aujourd'hui ou demain (In Progress) · Faits (Done) ·
       Classés (lignes cachées : sans suite, dispensés) ;
     · les onglets Active · Backlog · All issues deviennent Tout ·
       Réserves · Reportings (les filtres d'avant « À protester »,
       « À faire »… sont les colonnes) ; Filter = la société ; Display =
       les colonnes masquées ;
     · « New issue » = « Nouveau » : Enregistrer une livraison (G19),
       Ajouter un reporting (G16) ; le « + » d'une colonne ouvre le même
       choix ;
     · une carte s'ouvre sur ses gestes (le menu contextuel de Linear) :
       réserve → Lettre (G22), Faire valider (G21), Suite… (G23), Photos
       (G20, 8.d) ; reporting → Envoyé… (G17), Ne plus suivre (G18) ;
     · « ?reception=<id> » et « ?echeance=<id> » (repères grp_receptions,
       grp_reportings_echeances) ouvrent les gestes de la carte visée.
   Les fenêtres (8.a-8.d, 7.a, 7.b) sont celles de l'écran d'avant. Faire
   valider et Ne plus suivre demandent maintenant une confirmation.
   ══════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { dateCourte, montant } from "@/components/espace/format";
import { DialogueLettre, DialoguePhotos, DialogueReception, DialogueSuite, useReservesGroupe } from "@/components/espace/varelo/CarteReserves";
import { DialogueAjout, DialogueMarquer, useReportingsGroupe } from "@/components/espace/varelo/CarteReportings";
import { LIBELLE_ETAT_RESERVE, REGLES, type Reserve } from "@/components/espace/varelo/reserves";
import { LIBELLE_CANAL, LIBELLE_ETAT_DU, LIBELLE_PERIODICITE, type Du } from "@/components/espace/varelo/reportings";
import { etiquetteDecision } from "@/components/espace/varelo/decisions";
import { RACINE } from "../modules";
import { useVarelo } from "./donnees";
import { VarCarte } from "./VarCadre";
import { VarIcone, type NomVarIcone } from "./VarIcone";
import { Confirmer, type Demande } from "./Confirmer";
import { copier, useFavoris, useSuivis } from "./local";
import { useToast } from "../Toasts";
import "./var-board.css";

const BASE = `${RACINE}/varelo`;
const ICI = `${BASE}/operations`;

type Col = "retard" | "avenir" | "semaine" | "urgent" | "faits" | "classes";
const COLONNES: { cle: Col; libelle: string; icone: NomVarIcone; couleur: string }[] = [
  { cle: "retard", libelle: "En retard", icone: "IssueStatusTriage", couleur: "rgb(243, 127, 88)" },
  { cle: "avenir", libelle: "À venir", icone: "IssueStatusBacklog", couleur: "var(--var-t3)" },
  { cle: "semaine", libelle: "Cette semaine", icone: "IssueStatusTodo", couleur: "var(--var-t2)" },
  { cle: "urgent", libelle: "Aujourd'hui ou demain", icone: "IssueStatusStarted", couleur: "#f0bf00" },
  { cle: "faits", libelle: "Faits", icone: "IssueStatusDone", couleur: "lch(48 59.31 288.43)" },
  { cle: "classes", libelle: "Classés", icone: "StatusCanceled", couleur: "var(--var-t3)" },
];
const PLAFOND_FAITS = 20;

type Element = { genre: "reserve"; r: Reserve; col: Col; date: string } | { genre: "reporting"; d: Du; col: Col; date: string };

function colonneReserve(r: Reserve): Col {
  if (r.statut === "protestee") return "faits";
  if (r.statut === "sans_suite") return "classes";
  if (r.etat === "depasse") return "retard";
  if (r.etat === "aujourdhui" || r.etat === "demain") return "urgent";
  return r.jours_restants <= 7 ? "semaine" : "avenir";
}
function colonneReporting(d: Du): Col {
  if (d.statut === "envoye") return "faits";
  if (d.statut === "dispense") return "classes";
  if (d.etat === "en_retard") return "retard";
  if (d.etat === "aujourdhui") return "urgent";
  return d.etat === "semaine" ? "semaine" : "avenir";
}
const jj = (iso: string | null) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : "–");

export default function VueOperations() {
  const v = useVarelo();
  const params = useSearchParams();
  const routeur = useRouter();
  const societes = useMemo(() => v.donnees?.societes ?? [], [v.donnees]);
  const objets = useMemo(() => v.donnees?.objets ?? [], [v.donnees]);
  const rs = useReservesGroupe({ source: v.source, contexte: v.contexte, client_id: v.client_id, objets, onFait: v.setFait });
  const rp = useReportingsGroupe({ source: v.source, contexte: v.contexte, client_id: v.client_id, onFait: v.setFait });
  /* la vue (onglet, société) se lit dans l'adresse : l'icône des vues en copie le lien */
  const vueAdresse = params.get("vue");
  const [onglet, setOnglet] = useState<"tout" | "reserves" | "reportings">(vueAdresse === "reserves" || vueAdresse === "reportings" ? vueAdresse : "tout");
  const [societe, setSociete] = useState<string | null>(params.get("societe"));
  const favoris = useFavoris();
  const suivis = useSuivis();
  const toast = useToast();
  /* la cloche : ne montrer que les cartes suivies */
  const [suivisSeuls, setSuivisSeuls] = useState(false);
  /* « Open details » : le volet de la carte choisie, à droite du tableau */
  const [details, setDetails] = useState(false);
  const [choisi, setChoisi] = useState<string | null>(null);
  /* « + » d'une section de Ce matin : ?nouveau=livraison|reporting ouvre la fenêtre une fois */
  const [nouveauVu, setNouveauVu] = useState(false);
  const [masquees, setMasquees] = useState<Col[]>([]);
  const [menu, setMenu] = useState<string | null>(null);
  const [toutFaits, setToutFaits] = useState(false);
  const [confirmer, setConfirmer] = useState<Demande | null>(null);

  /* un repère (point du matin, alerte) ouvre les gestes de sa carte */
  const visee = params.get("reception") ? `r:${params.get("reception")}` : params.get("echeance") ? `d:${params.get("echeance")}` : null;
  const [vu, setVu] = useState<string | null>(null);
  if (visee && visee !== vu) {
    setVu(visee);
    setMenu(visee);
  }
  useEffect(() => {
    if (!visee) return;
    const t = window.setTimeout(() => document.getElementById(`var-b-${visee}`)?.scrollIntoView({ block: "center", inline: "center" }), 300);
    return () => window.clearTimeout(t);
  }, [visee]);

  /* un clic dehors ou Échap ferment le menu d'une carte, d'une colonne ou de « Nouveau » */
  useEffect(() => {
    if (!menu) return;
    const dehors = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest("[data-var-menu]")) setMenu(null);
    };
    const echap = (e: KeyboardEvent) => e.key === "Escape" && setMenu(null);
    document.addEventListener("mousedown", dehors);
    document.addEventListener("keydown", echap);
    return () => {
      document.removeEventListener("mousedown", dehors);
      document.removeEventListener("keydown", echap);
    };
  }, [menu]);

  const idDe = (e: Element) => (e.genre === "reserve" ? `r:${e.r.id}` : `d:${e.d.id}`);
  const elements = useMemo(() => {
    const l: Element[] = [];
    if (onglet !== "reportings") for (const r of rs.toutes) l.push({ genre: "reserve", r, col: colonneReserve(r), date: r.echeance });
    if (onglet !== "reserves") for (const d of rp.tous) l.push({ genre: "reporting", d, col: colonneReporting(d), date: d.echeance });
    return l.filter((e) => (!societe || (e.genre === "reserve" ? e.r.entite_id : e.d.entite_id) === societe) && (!suivisSeuls || suivis.estSuivi(e.genre === "reserve" ? `r:${e.r.id}` : `d:${e.d.id}`)));
  }, [rs.toutes, rp.tous, onglet, societe, suivisSeuls, suivis]);
  const parColonne = useMemo(() => {
    const m = new Map<Col, Element[]>();
    for (const c of COLONNES) m.set(c.cle, []);
    for (const e of elements) m.get(e.col)!.push(e);
    /* les cartes suivies passent en tête de leur colonne */
    const rang = (e: Element) => (suivis.estSuivi(e.genre === "reserve" ? `r:${e.r.id}` : `d:${e.d.id}`) ? 0 : 1);
    for (const [k, l] of m) l.sort((a, b) => rang(a) - rang(b) || (k === "faits" || k === "classes" ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date)));
    return m;
  }, [elements, suivis]);

  if (!nouveauVu && (params.get("nouveau") === "livraison" || params.get("nouveau") === "reporting")) {
    setNouveauVu(true);
    if (params.get("nouveau") === "livraison" && rs.peutSaisir) rs.setAjout(true);
    if (params.get("nouveau") === "reporting" && rp.peutSaisir) rp.setAjout(true);
  }

  /* les gestes d'une carte (menu de la carte et volet « Open details ») */
  type Option = { libelle: string; icone: NomVarIcone; faire: () => void };
  const optionsDe = (e: Element): Option[] => {
    const id = idDe(e);
    const suivre: Option = { libelle: suivis.estSuivi(id) ? "Arrêter de suivre la carte" : "Suivre la carte", icone: "Subscribe", faire: () => suivis.basculer(id) };
    if (e.genre === "reserve") {
      const r = e.r;
      const dec = rs.decisionDe("protester_reception", r.id);
      return [
        ...(r.statut === "a_examiner" ? [{ libelle: "Lettre de protestation", icone: "Page" as const, faire: () => void rs.ouvrirLettre(r) }] : []),
        ...(r.statut === "a_examiner" && rs.peutSaisir && !dec ? [{ libelle: "Faire valider", icone: "Send" as const, faire: () => demanderValidation(r) }] : []),
        ...(r.statut === "a_examiner" && rs.peutDecider ? [{ libelle: "Suite…", icone: "IssueStatusDone" as const, faire: () => rs.setSuite(r) }] : []),
        { libelle: `Photos du constat (${r.photos.length})`, icone: "Image" as const, faire: () => rs.setPhotos(r.id) },
        ...(r.objet_id ? [{ libelle: "Ouvrir l'expéditeur dans le référentiel", icone: "Users" as const, faire: () => routeur.push(`${BASE}/referentiel?objet=${encodeURIComponent(r.objet_id as string)}&nature=fournisseur`) }] : []),
        suivre,
      ];
    }
    const d = e.d;
    return [
      ...(d.statut === "a_faire" && rp.peutMarquer(d) ? [{ libelle: "Envoyé…", icone: "Send" as const, faire: () => rp.setCible(d) }] : []),
      ...(rp.peutArreter ? [{ libelle: "Ne plus suivre", icone: "Archive" as const, faire: () => demanderArret(d) }] : []),
      suivre,
    ];
  };
  const cliquer = (id: string) => {
    if (details) setChoisi(id);
    else setMenu(menu === id ? null : id);
  };

  const demanderValidation = (r: Reserve) =>
    setConfirmer({
      titre: "Faire valider la protestation",
      texte: `La protestation à ${r.transporteur} (livraison du ${dateCourte(r.date_reception)}, ${r.societe}) part à la direction des opérations, avec son calcul : ${REGLES[r.mode].libelle}, ${r.calcul_detail ?? `date limite au ${dateCourte(r.echeance)}`}.`,
      bouton: "Envoyer à la direction des opérations",
      faire: () => rs.faireValider(r),
    });
  const demanderArret = (d: Du) =>
    setConfirmer({
      titre: "Ne plus suivre ce reporting",
      texte: `« ${d.intitule} » pour ${d.destinataire} (${d.societe}) ne créera plus d'échéances ni d'alertes.`,
      bouton: "Ne plus suivre",
      faire: () => rp.arreter(d),
    });

  const nouveau = (cle: string, style: React.CSSProperties) =>
    menu === cle ? (
      <div className="var-menu" role="menu" aria-label="Nouveau" style={style} data-var-menu="">
        {rs.peutSaisir ? (
          <button type="button" role="menuitem" className="var-menu-option" onClick={() => { setMenu(null); rs.setAjout(true); }}>
            <VarIcone nom="Box" />
            <span>Enregistrer une livraison</span>
          </button>
        ) : null}
        {rp.peutSaisir ? (
          <button type="button" role="menuitem" className="var-menu-option" onClick={() => { setMenu(null); rp.setAjout(true); }}>
            <VarIcone nom="Report" />
            <span>Ajouter un reporting</span>
          </button>
        ) : null}
      </div>
    ) : null;

  const carte = (e: Element) => {
    const id = e.genre === "reserve" ? `r:${e.r.id}` : `d:${e.d.id}`;
    const colonne = COLONNES.find((c) => c.cle === e.col)!;
    const ouvert = menu === id;
    if (e.genre === "reserve") {
      const r = e.r;
      const dec = rs.decisionDe("protester_reception", r.id);
      const enRetard = r.statut === "a_examiner" && r.etat === "depasse";
      const options = optionsDe(e);
      return (
        <div key={id} id={`var-b-${id}`} style={{ position: "relative" }} data-var-menu="">
          <button type="button" className="var-b-carte" data-choisi={details && choisi === id ? "" : undefined} aria-haspopup="menu" aria-expanded={ouvert} onClick={() => cliquer(id)} onContextMenu={(ev) => { ev.preventDefault(); setMenu(id); }}>
            <span className="var-b-l1">
              <span>Réserve · {REGLES[r.mode].libelle}</span>
              <span className="var-pousse" />
              <span className="var-b-avatar var-b-avatar--vide" aria-hidden="true">
                <VarIcone nom="AvatarEmpty" taille={18} />
              </span>
            </span>
            <span className="var-b-titre">
              <VarIcone nom={colonne.icone} style={{ color: colonne.couleur }} />
              <span>
                Protestation à {r.transporteur}
                {r.expediteur ? ` — ${r.expediteur}` : ""}
              </span>
            </span>
            <span className="var-b-puces">
              {suivis.estSuivi(id) ? (
                <span className="var-b-puce" title="Vous suivez cette carte : elle reste en tête de sa colonne">
                  <VarIcone nom="Subscribe" />
                  Suivi
                </span>
              ) : null}
              <span className="var-b-puce var-b-puce--carre" title={LIBELLE_ETAT_RESERVE[r.etat].libelle}>
                <VarIcone nom={r.statut !== "a_examiner" ? "Priority0" : enRetard || r.etat === "aujourdhui" || r.etat === "demain" ? "Priority1" : "Priority2"} style={{ color: enRetard || r.etat === "aujourdhui" || r.etat === "demain" ? "rgb(243, 127, 88)" : undefined }} />
              </span>
              <span className="var-b-puce" title={`Protester avant le ${dateCourte(r.echeance)}`}>
                <VarIcone nom={enRetard ? "CrossedOutCalendar" : "Calendar"} style={enRetard ? { color: "lch(58% 73 29)" } : undefined} />
                {jj(r.echeance)}
              </span>
              <span className="var-b-puce">
                <VarIcone nom="Project" />
                {r.societe}
              </span>
              {r.avarie ? (
                <span className="var-b-puce">
                  <span className="var-b-point" style={{ background: "lch(58% 73 29)" }} />
                  Avarie
                </span>
              ) : null}
              {r.manquant ? (
                <span className="var-b-puce">
                  <span className="var-b-point" style={{ background: "#f0bf00" }} />
                  Manquant
                </span>
              ) : null}
              {r.photos.length ? (
                <span className="var-b-puce">
                  <VarIcone nom="Image" />
                  {r.photos.length}
                </span>
              ) : null}
              {r.montant_estime !== null ? <span className="var-b-puce">{montant(r.montant_estime)}</span> : null}
              {dec ? (
                <span className="var-b-puce" title={dec.calcul}>
                  <span className="var-b-point" style={{ background: "#5e6ad2" }} />
                  {etiquetteDecision(dec).libelle}
                </span>
              ) : null}
            </span>
            <span className="var-b-pied">
              Reçue le {jj(r.date_reception)}
              {r.statut === "protestee" ? ` · protestation le ${jj(r.protestation_le)}` : r.statut === "sans_suite" ? " · sans suite" : ""}
            </span>
          </button>
          {ouvert ? (
            <div className="var-menu var-b-carte-menu" role="menu" aria-label="Gestes de la réserve">
              {options.map((o) => (
                <button key={o.libelle} type="button" role="menuitem" className="var-menu-option" onClick={() => { setMenu(null); o.faire(); }}>
                  <VarIcone nom={o.icone} />
                  <span>{o.libelle}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      );
    }
    const d = e.d;
    const aMoi = d.responsable_id && d.responsable_id === rp.moi;
    const enRetard = d.etat === "en_retard";
    const options = optionsDe(e);
    return (
      <div key={id} id={`var-b-${id}`} style={{ position: "relative" }} data-var-menu="">
        <button type="button" className="var-b-carte" data-choisi={details && choisi === id ? "" : undefined} aria-haspopup="menu" aria-expanded={ouvert} onClick={() => cliquer(id)} onContextMenu={(ev) => { ev.preventDefault(); setMenu(id); }}>
          <span className="var-b-l1">
            <span>Reporting · {LIBELLE_PERIODICITE[d.periodicite]}</span>
            <span className="var-pousse" />
            {aMoi ? (
              <span className="var-b-avatar" title="Vous en êtes responsable">
                VO
              </span>
            ) : (
              <span className="var-b-avatar var-b-avatar--vide" aria-hidden="true">
                <VarIcone nom="AvatarEmpty" taille={18} />
              </span>
            )}
          </span>
          <span className="var-b-titre">
            <VarIcone nom={colonne.icone} style={{ color: colonne.couleur }} />
            <span>
              {d.intitule} pour {d.destinataire}
            </span>
          </span>
          <span className="var-b-puces">
            {suivis.estSuivi(id) ? (
              <span className="var-b-puce" title="Vous suivez cette carte : elle reste en tête de sa colonne">
                <VarIcone nom="Subscribe" />
                Suivi
              </span>
            ) : null}
            <span className="var-b-puce var-b-puce--carre" title={LIBELLE_ETAT_DU[d.etat].libelle}>
              <VarIcone nom={d.statut !== "a_faire" ? "Priority0" : enRetard || d.etat === "aujourdhui" ? "Priority1" : d.etat === "semaine" ? "Priority2" : "Priority4"} style={{ color: enRetard || d.etat === "aujourdhui" ? "rgb(243, 127, 88)" : undefined }} />
            </span>
            <span className="var-b-puce" title={`Échéance du ${dateCourte(d.echeance)}`}>
              <VarIcone nom={enRetard ? "CrossedOutCalendar" : "Calendar"} style={enRetard ? { color: "lch(58% 73 29)" } : undefined} />
              {jj(d.echeance)}
            </span>
            <span className="var-b-puce">
              <VarIcone nom="Project" />
              {d.societe}
            </span>
            <span className="var-b-puce">
              <span className="var-b-point" style={{ background: "#26b5ce" }} />
              {LIBELLE_CANAL[d.canal]}
            </span>
          </span>
          <span className="var-b-pied">
            Période du {jj(d.periode_debut)} au {jj(d.periode_fin)}
            {d.fait_le ? ` · ${d.statut === "dispense" ? "dispensé" : "envoyé"} le ${jj(d.fait_le)}` : ""}
          </span>
        </button>
        {ouvert && options.length ? (
          <div className="var-menu var-b-carte-menu" role="menu" aria-label="Gestes du reporting">
            {options.map((o) => (
              <button key={o.libelle} type="button" role="menuitem" className="var-menu-option" onClick={() => { setMenu(null); o.faire(); }}>
                <VarIcone nom={o.icone} />
                <span>{o.libelle}</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>
    );
  };

  const nomSociete = societe ? societes.find((s) => s.entite_id === societe)?.nom : null;
  const chargement = v.source === "reelle" && (!rs.reelles || !rp.reels);

  return (
    <VarCarte>
      <h1 className="v2-sr">Opérations</h1>
      <header className="var-tete">
        <div className="var-ligne1">
          <Link href={BASE} className="var-fil">
            <VarIcone nom="Factory" style={{ color: "var(--var-equipe)" }} />
            <span>Référentiel du groupe</span>
          </Link>
          <span className="var-b-fil-sep" aria-hidden="true">
            <VarIcone nom="Chevron" taille={14} />
          </span>
          <span className="var-fil" style={{ paddingLeft: 4 }} aria-current="page">
            Opérations
          </span>
          <button
            type="button"
            className="var-rond"
            aria-pressed={favoris.estEpingle("vue:operations")}
            aria-label={favoris.estEpingle("vue:operations") ? "Retirer Opérations des épinglés" : "Épingler Opérations dans Ce matin"}
            title={favoris.estEpingle("vue:operations") ? "Retirer des épinglés" : "Épingler dans Ce matin"}
            onClick={() => favoris.basculer({ cle: "vue:operations", libelle: "Réserves et reportings", href: ICI, genre: "vue" })}
          >
            <VarIcone nom="Etoile" style={favoris.estEpingle("vue:operations") ? { color: "#f2c94c" } : undefined} />
          </button>
          <span className="var-pousse" />
          <button
            type="button"
            className="var-rond"
            aria-pressed={suivisSeuls}
            aria-label={suivisSeuls ? "Montrer toutes les cartes" : `Ne montrer que les cartes suivies (${suivis.liste.length})`}
            title={suivisSeuls ? "Montrer toutes les cartes" : `Ne montrer que les cartes suivies (${suivis.liste.length})`}
            onClick={() => setSuivisSeuls((x) => !x)}
          >
            <VarIcone nom="Notified" style={suivisSeuls ? { color: "var(--var-t1)" } : undefined} />
          </button>
          <div style={{ position: "relative" }} data-var-menu="">
            <button type="button" className="var-b-nouveau" aria-haspopup="menu" aria-expanded={menu === "nouveau"} onClick={() => setMenu(menu === "nouveau" ? null : "nouveau")} disabled={!rs.peutSaisir && !rp.peutSaisir}>
              <VarIcone nom="Plus" />
              <span className="var-b-nouveau-texte">Nouveau</span>
            </button>
            {nouveau("nouveau", { top: 32, right: 0 })}
          </div>
        </div>
        <div className="var-ligne2">
          <div style={{ display: "flex", gap: 8 }} role="tablist" aria-label="Vues">
            {(
              [
                ["tout", "Tout"],
                ["reserves", "Réserves"],
                ["reportings", "Reportings"],
              ] as const
            ).map(([k, l]) => (
              <button key={k} type="button" role="tab" className="var-onglet" aria-selected={onglet === k} onClick={() => setOnglet(k)}>
                {l}
              </button>
            ))}
            <button
              type="button"
              className="var-rond"
              aria-label="Copier le lien de cette vue"
              title="Copier le lien de cette vue (onglet et société)"
              onClick={() => {
                const q = new URLSearchParams();
                if (onglet !== "tout") q.set("vue", onglet);
                if (societe) q.set("societe", societe);
                void copier(`${window.location.origin}${ICI}${q.size ? `?${q}` : ""}`).then((ok) => toast(ok ? "Lien de la vue copié" : "Le lien n'a pas pu être copié.", ok ? "neutre" : "rouge"));
              }}
            >
              <VarIcone nom="CustomView" />
            </button>
          </div>
          <div className="var-b-outils">
            <div style={{ position: "relative" }} data-var-menu="">
              <button type="button" className="var-rond" aria-label={nomSociete ? `Filtre : ${nomSociete}` : "Filtrer par société"} title={nomSociete ? `Filtre : ${nomSociete}` : "Filtrer par société"} aria-haspopup="menu" aria-expanded={menu === "filtre"} onClick={() => setMenu(menu === "filtre" ? null : "filtre")}>
                <VarIcone nom="Filtre" />
              </button>
              {menu === "filtre" ? (
                <div className="var-menu" role="menu" aria-label="Filtrer par société" style={{ top: 32, right: 0 }}>
                  <button type="button" role="menuitem" className="var-menu-option" onClick={() => { setSociete(null); setMenu(null); }}>
                    <VarIcone nom="Project" />
                    <span>Toutes les sociétés{societe ? "" : " ✓"}</span>
                  </button>
                  {societes.map((s) => (
                    <button key={s.entite_id} type="button" role="menuitem" className="var-menu-option" onClick={() => { setSociete(s.entite_id); setMenu(null); }}>
                      <VarIcone nom="Project" />
                      <span>
                        {s.nom}
                        {societe === s.entite_id ? " ✓" : ""}
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <div style={{ position: "relative" }} data-var-menu="">
              <button type="button" className="var-rond" aria-label="Affichage" title="Affichage" aria-haspopup="menu" aria-expanded={menu === "affichage"} onClick={() => setMenu(menu === "affichage" ? null : "affichage")}>
                <VarIcone nom="Affichage" />
              </button>
              {menu === "affichage" ? (
                <div className="var-menu" role="menu" aria-label="Colonnes" style={{ top: 32, right: 0 }}>
                  {COLONNES.map((c) => (
                    <button key={c.cle} type="button" role="menuitemcheckbox" aria-checked={!masquees.includes(c.cle)} className="var-menu-option" onClick={() => setMasquees((m) => (m.includes(c.cle) ? m.filter((x) => x !== c.cle) : [...m, c.cle]))}>
                      <VarIcone nom={c.icone} style={{ color: c.couleur }} />
                      <span>
                        {c.libelle}
                        {masquees.includes(c.cle) ? "" : " ✓"}
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <button type="button" className="var-rond" aria-pressed={details} aria-label={details ? "Fermer le volet des détails" : "Ouvrir le volet des détails"} title={details ? "Fermer le volet des détails" : "Ouvrir le volet des détails : un clic sur une carte y montre ses champs et ses gestes"} onClick={() => setDetails((x) => !x)}>
              <VarIcone nom="Volet" />
            </button>
          </div>
        </div>
      </header>

      <div className="var-defile" style={{ overflow: "hidden" }}>
        {rs.erreur || rp.erreur ? (
          <p className="var-b-plus" role="alert">
            La base réelle n&apos;a pas répondu. {rs.erreur ?? rp.erreur}
          </p>
        ) : null}
        {chargement ? (
          <p className="var-b-plus">Lecture des réserves et des reportings…</p>
        ) : (
<div className="var-b-cadre">
          <div className="var-b-plateau" aria-label="Opérations par état">
            {COLONNES.filter((c) => !masquees.includes(c.cle)).map((c) => {
              const l = parColonne.get(c.cle) ?? [];
              const montres = c.cle === "faits" && !toutFaits ? l.slice(0, PLAFOND_FAITS) : l;
              return (
                <section key={c.cle} className="var-b-zone" aria-label={c.libelle}>
                  <div className="var-b-entete">
                    <VarIcone nom={c.icone} style={{ color: c.couleur }} />
                    <h2 className="var-b-nom-col">{c.libelle}</h2>
                    <span className="var-b-compte">{l.length}</span>
                    <span className="var-pousse" />
                    <span className="var-b-entete-actions">
                      <span style={{ position: "relative" }} data-var-menu="">
                        <button type="button" className="var-rond" aria-label={`Options de la colonne ${c.libelle}`} aria-haspopup="menu" aria-expanded={menu === `col:${c.cle}`} onClick={() => setMenu(menu === `col:${c.cle}` ? null : `col:${c.cle}`)}>
                          <VarIcone nom="Points" />
                        </button>
                        {menu === `col:${c.cle}` ? (
                          <div className="var-menu" role="menu" aria-label={`Options de la colonne ${c.libelle}`} style={{ top: 32, right: 0 }}>
                            <button type="button" role="menuitem" className="var-menu-option" onClick={() => { setMasquees((m) => [...m, c.cle]); setMenu(null); }}>
                              <VarIcone nom="Archive" />
                              <span>Masquer la colonne</span>
                            </button>
                          </div>
                        ) : null}
                      </span>
                      <span style={{ position: "relative" }} data-var-menu="">
                        <button type="button" className="var-rond" aria-label="Nouveau" aria-haspopup="menu" aria-expanded={menu === `plus:${c.cle}`} onClick={() => setMenu(menu === `plus:${c.cle}` ? null : `plus:${c.cle}`)} disabled={!rs.peutSaisir && !rp.peutSaisir}>
                          <VarIcone nom="Plus" />
                        </button>
                        {nouveau(`plus:${c.cle}`, { top: 32, right: 0 })}
                      </span>
                    </span>
                  </div>
                  <div className="var-b-pile">
                    {montres.map(carte)}
                    {montres.length < l.length ? (
                      <div className="var-b-plus">
                        <button type="button" onClick={() => setToutFaits(true)}>
                          … et {l.length - montres.length} de plus
                        </button>
                      </div>
                    ) : null}
                  </div>
                </section>
              );
            })}
          </div>
            {details ? <VoletCarte e={elements.find((x) => idDe(x) === choisi) ?? null} options={(() => { const e = elements.find((x) => idDe(x) === choisi); return e ? optionsDe(e) : []; })()} suivi={!!choisi && suivis.estSuivi(choisi)} /> : null}
          </div>
        )}
      </div>

      {rs.ajout ? <DialogueReception societes={societes} objets={objets} onFermer={() => rs.setAjout(false)} enregistrer={rs.enregistrer} ajouterPhotos={rs.ajouterPhotos} onFait={v.setFait} /> : null}
      {rs.reservePhotos ? <DialoguePhotos r={rs.reservePhotos} source={v.source} peutAjouter={rs.peutSaisir} ajouterPhotos={rs.ajouterPhotos} onFermer={() => rs.setPhotos(null)} /> : null}
      {rs.lettre ? <DialogueLettre r={rs.lettre.r} texte={rs.lettre.texte} onFermer={() => rs.setLettre(null)} /> : null}
      {rs.suite ? <DialogueSuite r={rs.suite} onFermer={() => rs.setSuite(null)} decider={rs.decider} onFait={v.setFait} /> : null}
      {rp.ajout ? <DialogueAjout societes={societes} moi={rp.moi} onFermer={() => rp.setAjout(false)} enregistrer={rp.enregistrer} onFait={v.setFait} /> : null}
      {rp.cible ? <DialogueMarquer d={rp.cible} onFermer={() => rp.setCible(null)} marquer={rp.marquer} onFait={v.setFait} /> : null}
      <Confirmer demande={confirmer} onFermer={() => setConfirmer(null)} />
    </VarCarte>
  );
}

/* le volet « Open details » de Linear : la carte choisie, ses champs et ses gestes */
function VoletCarte({ e, options, suivi }: { e: Element | null; options: { libelle: string; icone: NomVarIcone; faire: () => void }[]; suivi: boolean }) {
  if (!e) {
    return (
      <aside className="var-b-volet" aria-label="Détails">
        <p className="var-b-volet-vide">Choisissez une carte : ses champs et ses gestes s&apos;affichent ici.</p>
      </aside>
    );
  }
  const champs: [string, string][] =
    e.genre === "reserve"
      ? [
          ["État", LIBELLE_ETAT_RESERVE[e.r.etat].libelle],
          ["Protester avant le", dateCourte(e.r.echeance)],
          ["Règle", `${REGLES[e.r.mode].libelle}${e.r.calcul_detail ? ` : ${e.r.calcul_detail}` : ""}`],
          ["Société", e.r.societe],
          ["Reçue le", dateCourte(e.r.date_reception)],
          ["Document", e.r.document_transport ?? "–"],
          ["Expéditeur", e.r.expediteur ?? "–"],
          ["Colis", e.r.colis_attendus !== null ? `${e.r.colis_recus ?? "?"} reçus sur ${e.r.colis_attendus}` : "–"],
          ["Constat", [e.r.avarie ? "avarie" : "", e.r.manquant ? "manquant" : "", e.r.constat ?? ""].filter(Boolean).join(", ") || "–"],
          ["Préjudice estimé", e.r.montant_estime !== null ? montant(e.r.montant_estime) : "–"],
          ["Photos", String(e.r.photos.length)],
        ]
      : [
          ["État", LIBELLE_ETAT_DU[e.d.etat].libelle],
          ["Échéance", dateCourte(e.d.echeance)],
          ["Destinataire", e.d.destinataire],
          ["Société", e.d.societe],
          ["Période", `du ${dateCourte(e.d.periode_debut)} au ${dateCourte(e.d.periode_fin)}`],
          ["Périodicité", LIBELLE_PERIODICITE[e.d.periodicite]],
          ["Canal", LIBELLE_CANAL[e.d.canal]],
          ["Fait le", e.d.fait_le ? dateCourte(e.d.fait_le) : "–"],
          ["Note", e.d.note ?? "–"],
        ];
  return (
    <aside className="var-b-volet" aria-label="Détails de la carte">
      <p className="var-b-volet-titre">{e.genre === "reserve" ? `Protestation à ${e.r.transporteur}` : `${e.d.intitule} pour ${e.d.destinataire}`}</p>
      {suivi ? <p className="var-b-volet-suivi">Suivie : elle reste en tête de sa colonne.</p> : null}
      <dl className="var-b-volet-champs">
        {champs.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      <div className="var-b-volet-gestes">
        {options.map((o) => (
          <button key={o.libelle} type="button" className="var-menu-option" onClick={o.faire}>
            <VarIcone nom={o.icone} />
            <span>{o.libelle}</span>
          </button>
        ))}
      </div>
    </aside>
  );
}
