"use client";

/* ══════════════════════════════════════════════════════════════════════
   DALIRO › la fiche d'un chantier (29/10/2026, refonte des pages métiers)

   La page d'une Initiative de Linear, au 1:1 : relevé docs/refonte-metiers/
   releves/linear-initiative.md, mesures dans ../lin/linear-initiative.css
   (préfixe lit-). Barre de tête « Chantiers › nom », onglets en pilules
   gardés dans l'adresse (?onglet=, « apercu » par défaut), volet de
   détails de 400 à droite, ouvert par le bouton de la barre des onglets
   (ouvert d'office au-dessus de 1 200 px de large).

   Ce que l'écran d'avant faisait (ChantierVue, inventaire daliro.md), et
   où c'est ici :
     Aperçu     la page « Overview » de l'initiative, dessinée ici : le
                nom et l'adresse ; les propriétés (statut, étape et lot en
                cours, dates, maître d'ouvrage, notre place, TVA) ; les
                ressources (marché vérifié, factures rattachées) ; la
                dernière nouvelle (l'origine d'avenant la plus récente,
                sinon la dernière réponse à une confirmation de passage) ;
                les contrôles bloquants et à voir en phrases (B12) ; les
                lots au format du tableau « Projects » (B13 : santé
                d'après le déboursé, exécutant, statut, avancement)
     Terrain    B12, B15, B16, B17-B18, B19 — ChantierVue habillé
     Argent     B13, B14, B20, B22, B23, B25 — ChantierVue habillé
     Fil        B21 — ChantierVue habillé
     Réception  B24 — ChantierVue habillé
     Volet      B11 (l'en-tête et ses gestes : ouvrir, suspendre, reprendre,
                ouvrir un avenant, rattacher une facture, relevé du
                chantier) — ChantierVue habillé, restylé en rangées
   Aucun geste n'est réécrit : chaque onglet monte sa propre ChantierVue
   (mêmes portes, mêmes fenêtres). Les ancres #planning, #avenants,
   #situations et #fil (posées dans ChantierVue) sont rejointes à
   l'arrivée, une fois le tableau lu.
   ══════════════════════════════════════════════════════════════════════ */

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ArrowUpRight, ChevronDown, Copy, FileSignature, HardHat, Layers, Link2, MessageSquare, PanelRight, Percent, Receipt, UserRound } from "lucide-react";
import ChantierVue, { type SectionChantier } from "@/components/espace/daliro/ChantierVue";
import { CONFIRMATIONS, EXECUTIONS, STATUTS_CHANTIER } from "@/components/espace/daliro/etats";
import type { Lot, StatutChantier, Tableau } from "@/components/espace/daliro/types";
import { dateCourte, dateHeure, montant, relatif } from "@/components/espace/format";
import Habille from "@/components/espace2/Habille";
import { RACINE } from "@/components/espace2/modules";
import { IconeCalendrier, IconeDocument, IconeGroupe, IconeJauge, IconeSante, IconeStatutProjet, type EtatProjet, type Sante } from "../lin/icones";
import { useToast } from "../Toasts";
import { useDaliro } from "./donnees";
import "../lin/lin.css";
import "../lin/linear-initiative.css";

const BASE = `${RACINE}/daliro`;

type CleOnglet = "apercu" | "terrain" | "argent" | "fil" | "reception";
const ONGLETS: { cle: CleOnglet; libelle: string; sections?: SectionChantier[] }[] = [
  { cle: "apercu", libelle: "Aperçu" },
  { cle: "terrain", libelle: "Terrain", sections: ["controles", "questions", "meteo", "planning", "appro"] },
  { cle: "argent", libelle: "Argent", sections: ["marche", "lots", "avenants", "situations", "heures", "factures"] },
  { cle: "fil", libelle: "Fil", sections: ["fil"] },
  { cle: "reception", libelle: "Réception", sections: ["reception"] },
];
const estOnglet = (v: string | null): v is CleOnglet => ONGLETS.some((o) => o.cle === v);

/* les teintes des états (etats.ts) dans celles du gabarit */
type TeinteLin = "vert" | "jaune" | "rouge" | "bleu" | "gris";
const teinteLin = (t: string): TeinteLin => (t === "ambre" ? "jaune" : t === "vert" || t === "rouge" || t === "bleu" ? t : "gris");
const ETAT: Record<StatutChantier, EtatProjet> = { preparation: "planifie", ouvert: "en-cours", suspendu: "en-cours", receptionne: "fait", clos: "fait", annule: "annule" };
const ETAT_LOT: Record<Lot["statut"], EtatProjet> = { a_venir: "planifie", en_cours: "en-cours", termine: "fait" };
/* les groupes du tableau des lots, dans l'ordre de Linear (In Progress, Planned, puis Completed) */
const GROUPES: { cle: Lot["statut"]; libelle: string }[] = [
  { cle: "en_cours", libelle: "En cours" },
  { cle: "a_venir", libelle: "À venir" },
  { cle: "termine", libelle: "Terminés" },
];
const CANAUX: Record<string, string> = { vocal: "Vocal", photo: "Photo", visite: "Visite de chantier", courriel: "Courriel", email: "Courriel", whatsapp: "WhatsApp", sms: "SMS" };

const initiales = (nom: string) =>
  nom
    .replace(/[^\p{L}\s-]/gu, " ")
    .trim()
    .split(/\s+/)
    .filter((m) => m.length > 1 || /\p{Lu}/u.test(m))
    .slice(0, 2)
    .map((m) => m[0]?.toUpperCase() ?? "")
    .join("");
const jourLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, "0")}-${`${d.getDate()}`.padStart(2, "0")}`;
};
const quandLong = (iso: string) => (/^\d{4}-\d{2}-\d{2}$/.test(iso) ? dateCourte(iso) : dateHeure(iso));
const temps = (iso: string) => {
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? 0 : t;
};

/* le volet s'ouvre d'office sur un écran d'au moins 1 200 px */
const LARGE = "(min-width: 1200px)";
const abonner = (cb: () => void) => {
  const m = window.matchMedia(LARGE);
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
};
const useLarge = () =>
  useSyncExternalStore(
    abonner,
    () => window.matchMedia(LARGE).matches,
    () => false,
  );

/* ——— la chronique du chantier, tirée du tableau seul (aucune lecture de plus) ——— */
type Nouvelle = {
  cle: string;
  quand: string;
  genre: "message" | "confirmation" | "evenement";
  auteur: string | null;
  etat: string;
  teinte: TeinteLin;
  texte: string;
  lien: string;
  lienLibelle: string;
};

function chronique(t: Tableau, ici: string): Nouvelle[] {
  const c = t.chantier;
  const n: Nouvelle[] = [];
  /* un message du terrain à l'origine d'un avenant : le fil du chantier, tel que le tableau le porte */
  for (const a of t.avenants) {
    const o = a.origine ?? {};
    if (o.texte && o.date) {
      n.push({
        cle: `m-${a.id}`,
        quand: String(o.date),
        genre: "message",
        auteur: o.auteur ? String(o.auteur) : null,
        etat: CANAUX[String(o.canal ?? "")] ?? "Message",
        teinte: "bleu",
        texte: String(o.texte),
        lien: `${ici}?onglet=argent#avenants`,
        lienLibelle: `Avenant n° ${a.numero}`,
      });
    }
    if (a.statut === "signe" && a.signe_le) {
      n.push({ cle: `s-${a.id}`, quand: a.signe_le, genre: "evenement", auteur: a.signe_par ?? null, etat: "Signé", teinte: "vert", texte: `Avenant n° ${a.numero} signé : ${a.objet}.`, lien: `${ici}?onglet=argent#avenants`, lienLibelle: `Avenant n° ${a.numero}` });
    }
  }
  /* les réponses aux confirmations de passage (J-2) */
  for (const p of t.passages) {
    const qui = p.intervenant_nom ?? p.intervenant_lu ?? "L'intervenant";
    const du = `son passage du ${dateCourte(p.debut)}${p.tache ? ` (${p.tache})` : ""}`;
    for (const e of p.confirmations ?? []) {
      const conf = CONFIRMATIONS[e.evenement];
      const texte =
        e.evenement === "confirmee" ? `${qui} a confirmé ${du}.` : e.evenement === "declinee" ? `${qui} a décliné ${du}.` : e.evenement === "sans_reponse" ? `${qui} n'a pas répondu pour ${du}.` : `Confirmation demandée à ${qui} pour ${du}.`;
      n.push({ cle: `c-${e.id}`, quand: e.survenu_le, genre: "confirmation", auteur: qui, etat: conf.libelle, teinte: teinteLin(conf.teinte), texte, lien: `${ici}?onglet=terrain#planning`, lienLibelle: "Planning" });
    }
  }
  if (c.ouvert_le) n.push({ cle: "ouvert", quand: c.ouvert_le, genre: "evenement", auteur: null, etat: "Ouvert", teinte: "vert", texte: "Le chantier est ouvert.", lien: ici, lienLibelle: "Chantier" });
  n.push({ cle: "cree", quand: c.cree_le, genre: "evenement", auteur: null, etat: "Créé", teinte: "gris", texte: "Le chantier est créé, en préparation.", lien: ici, lienLibelle: "Chantier" });
  return n.sort((a, b) => temps(b.quand) - temps(a.quand));
}

/* l'avancement d'un lot : la dernière situation de travaux (lignes du lot, pondérées par leur base), sinon son état */
function avancements(t: Tableau): Map<string, number> {
  const m = new Map<string, number>();
  const s = [...(t.situations ?? [])].filter((x) => x.statut !== "annulee" && x.statut !== "refusee").sort((a, b) => b.numero - a.numero)[0];
  const cumul = new Map<string, { base: number; fait: number }>();
  for (const l of s?.lignes ?? []) {
    if (!l.lot_id || !l.base_ht) continue;
    const e = cumul.get(l.lot_id) ?? { base: 0, fait: 0 };
    e.base += Math.abs(l.base_ht);
    e.fait += (Math.abs(l.base_ht) * l.avancement) / 100;
    cumul.set(l.lot_id, e);
  }
  for (const [id, e] of cumul) m.set(id, Math.round((e.fait / e.base) * 100));
  return m;
}

export default function FicheChantier({ id }: { id: string }) {
  const { source, pret, erreur, liste, tableau, demander, enLecture, onLocal, relireChantier } = useDaliro();
  const params = useSearchParams();
  const chemin = usePathname();
  const toast = useToast();
  const large = useLarge();
  const [voletChoisi, setVoletChoisi] = useState<boolean | null>(null);
  const volet = voletChoisi ?? large;

  const o = params.get("onglet");
  const onglet: CleOnglet = estOnglet(o) ? o : "apercu";
  const t = tableau(id);
  const lu = t !== null;

  /* en base réelle, le tableau du chantier se lit une fois */
  useEffect(() => {
    if (source === "reelle" && pret) demander(id);
  }, [source, pret, id, demander]);

  /* l'ancre de l'adresse (#planning, #avenants, #situations, #fil) : rejointe une fois l'onglet rendu */
  useEffect(() => {
    if (!lu) return;
    const ancre = window.location.hash.slice(1);
    if (!ancre) return;
    const minuterie = window.setTimeout(() => document.getElementById(decodeURIComponent(ancre))?.scrollIntoView({ block: "start" }), 80);
    return () => window.clearTimeout(minuterie);
  }, [onglet, lu]);

  const absent = source === "exemple" ? !t : pret && !t && !enLecture(id) && (!!erreur || !liste.some((c) => c.id === id));
  const nom = t?.chantier.nom ?? liste.find((c) => c.id === id)?.nom ?? "Chantier";
  const lienOnglet = (cle: CleOnglet) => (cle === "apercu" ? chemin : `${chemin}?onglet=${cle}`);
  const relire = () => relireChantier(id);

  const copierLien = () => {
    void navigator.clipboard?.writeText(window.location.href).then(
      () => toast("Lien copié"),
      () => toast("Le lien n'a pas pu être copié.", "rouge"),
    );
  };

  const statut = t ? STATUTS_CHANTIER[t.chantier.statut] : null;
  const courant = ONGLETS.find((x) => x.cle === onglet);

  return (
    <div className="lin lit">
      <h1 className="v2-sr">{nom}</h1>

      <header className="lit-tete">
        <nav className="lit-fil" aria-label="Fil d'Ariane">
          <Link href={`${BASE}/chantiers`} className="lit-fil-lien">
            Chantiers
          </Link>
          <span className="lit-fil-sep" aria-hidden="true">
            ›
          </span>
          <span className="lit-fil-ici" aria-current="page" data-teinte={statut ? teinteLin(statut.teinte) : "gris"}>
            <HardHat aria-hidden="true" />
            <span>{nom}</span>
          </span>
        </nav>
        <div className="lit-tete-droite">
          <button type="button" className="lit-rond lit-rond--24" aria-label="Copier le lien de la page" title="Copier le lien de la page" onClick={copierLien}>
            <Copy aria-hidden="true" />
          </button>
        </div>
      </header>

      <div className="lit-barre">
        <nav className="lit-onglets" aria-label="Vues du chantier">
          {ONGLETS.map((x) => (
            <Link key={x.cle} href={lienOnglet(x.cle)} scroll={false} className="lit-onglet" aria-current={onglet === x.cle ? "page" : undefined}>
              {x.libelle}
            </Link>
          ))}
        </nav>
        <button
          type="button"
          className="lit-rond lit-rond--plein"
          aria-label={volet ? "Fermer les détails du chantier" : "Ouvrir les détails du chantier"}
          title={volet ? "Fermer les détails du chantier" : "Ouvrir les détails du chantier"}
          aria-expanded={volet}
          aria-controls={volet ? "lit-volet" : undefined}
          onClick={() => setVoletChoisi(!volet)}
        >
          <PanelRight aria-hidden="true" />
        </button>
      </div>

      {!t ? (
        <div className="lit-corps">
          <div className="lit-zone">
            <p className="lit-vide" role={absent ? "alert" : "status"}>
              {absent ? (
                <>
                  Ce chantier n&apos;est pas visible avec ce compte.{" "}
                  <Link href={`${BASE}/chantiers`} className="lit-lien">
                    Revenir aux chantiers
                  </Link>
                </>
              ) : (
                "Lecture du chantier…"
              )}
            </p>
          </div>
        </div>
      ) : (
        <div className="lit-corps" data-volet={volet ? "" : undefined}>
          <div className="lit-zone">
            {onglet === "apercu" ? (
              <Apercu t={t} ici={chemin} />
            ) : (
              <div className="lit-gestes">
                {onglet === "reception" && !t.reception && !["ouvert", "suspendu", "receptionne", "clos"].includes(t.chantier.statut) ? (
                  <p className="lit-vide">La réception se prononce sur un chantier ouvert ou suspendu. Ouvrez d&apos;abord le chantier, depuis les détails.</p>
                ) : null}
                <Habille>
                  <ChantierVue key={`${onglet}-${source}-${id}`} tableau={t} source={source} onLocal={onLocal} relire={relire} sections={courant?.sections} />
                </Habille>
              </div>
            )}
          </div>

          {volet ? (
            <aside id="lit-volet" className="lit-volet" aria-label="Détails du chantier">
              <section className="lit-carte" aria-labelledby="lit-proprietes">
                <h2 id="lit-proprietes" className="lit-carte-titre">
                  Propriétés
                </h2>
                <div className="lit-carte-gestes">
                  <Habille>
                    <ChantierVue key={`entete-${source}-${id}`} tableau={t} source={source} onLocal={onLocal} relire={relire} sections={["entete"]} />
                  </Habille>
                </div>
              </section>
              <Activite t={t} ici={chemin} />
            </aside>
          ) : null}
        </div>
      )}
    </div>
  );
}

/* ——— la carte « Activity » du volet : les cinq derniers faits du chantier ——— */
function Activite({ t, ici }: { t: Tableau; ici: string }) {
  const faits = useMemo(() => chronique(t, ici).slice(0, 5), [t, ici]);
  return (
    <section className="lit-carte" aria-labelledby="lit-activite">
      <h2 id="lit-activite" className="lit-carte-titre">
        Activité
        <Link href={`${ici}?onglet=fil`} className="lit-carte-lien">
          Voir le fil
        </Link>
      </h2>
      <ul className="lit-activite">
        {faits.map((f) => (
          <li key={f.cle}>
            <span className="lit-activite-point" data-teinte={f.teinte} aria-hidden="true" />
            <span className="lit-activite-texte">
              {f.texte}
              <span className="lit-activite-quand" title={quandLong(f.quand)}>
                {" "}
                · {relatif(f.quand)}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ——— l'onglet Aperçu : la page « Overview » de l'initiative ——— */
function Apercu({ t, ici }: { t: Tableau; ici: string }) {
  const c = t.chantier;
  const s = STATUTS_CHANTIER[c.statut];
  const et = c.etape;
  const aujourdhui = useMemo(() => jourLocal(), []);
  const finPassee = !!c.date_fin_prevue && c.date_fin_prevue < aujourdhui && !["receptionne", "clos", "annule"].includes(c.statut);
  const marcheVerifie = !!c.marche_verifie || t.marches.some((m) => m.statut === "verifie");
  const factures = t.factures.filter((f) => f.statut === "rattachee").length;

  const nouvelles = useMemo(() => chronique(t, ici), [t, ici]);
  const derniere = nouvelles.find((n) => n.genre === "message") ?? nouvelles.find((n) => n.genre === "confirmation") ?? null;

  const controles = t.controles.filter((k) => k.gravite !== "info").sort((a, b) => (a.gravite === b.gravite ? 0 : a.gravite === "bloquant" ? -1 : 1));
  const nbBloquants = controles.filter((k) => k.gravite === "bloquant").length;
  const nbAVoir = controles.length - nbBloquants;

  const place = c.place_client === "titulaire" ? "Titulaire" : c.place_client === "cotraitant" ? "Cotraitant" : `Sous-traitant${c.donneur_ordre_nom ? ` de ${c.donneur_ordre_nom}` : ""}`;
  const tva = c.regime_tva === "normal" ? "TVA au régime normal" : c.regime_tva === "autoliquidation" ? "TVA autoliquidée (sous-traitance)" : c.regime_tva === "non_applicable" ? "TVA non applicable (Guyane, Mayotte)" : "Hors du champ de la TVA";
  const dates = c.date_debut || c.date_fin_prevue ? `${c.date_debut ? dateCourte(c.date_debut) : "début à fixer"} → ${c.date_fin_prevue ? dateCourte(c.date_fin_prevue) : "fin à fixer"}` : null;
  const resume = [c.adresse, `${c.code_postal} ${c.commune}`.trim(), c.reference ? `référence ${c.reference}` : null].filter(Boolean).join(" · ");

  return (
    <div className="lit-page">
      <div className="lit-texte">
        <span className="lit-tuile" data-teinte={teinteLin(s.teinte)} aria-hidden="true">
          <HardHat />
        </span>
        <h2 className="lit-titre">{c.nom}</h2>
        <p className="lit-resume">{resume}</p>

        <div className="lit-rangee">
          <h3 className="lit-etiquette">Propriétés</h3>
          <ul className="lit-puces">
            <li className="lit-puce" title={`Statut : ${s.libelle}`}>
              <IconeStatutProjet etat={ETAT[c.statut]} />
              {s.libelle}
            </li>
            <li className={et && et.etapes ? "lit-puce" : "lit-puce lit-puce--vide"} title="Étape et lot en cours">
              <IconeJauge />
              {et && et.etapes ? `Étape ${et.etape} sur ${et.etapes}${et.lot_libelle ? ` · ${et.lot_libelle}` : ""}` : "Aucun lot"}
            </li>
            <li className={dates ? "lit-puce" : "lit-puce lit-puce--vide"} title={finPassee ? "Début → fin prévue (la fin prévue est dépassée)" : "Début → fin prévue"}>
              <IconeCalendrier passe={finPassee} />
              {dates ?? "Dates à fixer"}
            </li>
            <li className={c.maitre_ouvrage_nom ? "lit-puce" : "lit-puce lit-puce--vide"} title="Maître d'ouvrage">
              {c.maitre_ouvrage_nom ? (
                <span className="lit-avatar" aria-hidden="true">
                  {initiales(c.maitre_ouvrage_nom) || "?"}
                </span>
              ) : (
                <UserRound className="lit-ic" aria-hidden="true" />
              )}
              {c.maitre_ouvrage_nom ?? "Maître d'ouvrage à désigner"}
            </li>
            <li className="lit-puce" title="Notre place au marché">
              <IconeGroupe />
              {place}
            </li>
            <li className="lit-puce" title="Régime de TVA">
              <Percent className="lit-ic" aria-hidden="true" />
              {tva}
            </li>
          </ul>
        </div>

        <div className="lit-rangee">
          <h3 className="lit-etiquette">Ressources</h3>
          <ul className="lit-puces">
            <li>
              <Link href={`${ici}?onglet=argent`} className="lit-puce" data-teinte={marcheVerifie ? "vert" : "jaune"}>
                <IconeDocument className="lit-ic-teinte" />
                {marcheVerifie ? "Marché vérifié" : "Marché à vérifier"}
              </Link>
            </li>
            <li>
              <Link href={`${ici}?onglet=argent`} className={factures ? "lit-puce" : "lit-puce lit-puce--vide"}>
                <Receipt className="lit-ic" aria-hidden="true" />
                {factures ? `${factures} facture${factures > 1 ? "s" : ""} rattachée${factures > 1 ? "s" : ""}` : "Aucune facture rattachée"}
              </Link>
            </li>
          </ul>
        </div>

        {/* « Latest update » : le dernier message du terrain, sinon la dernière réponse à une confirmation */}
        <section className="lit-maj" aria-labelledby="lit-maj-titre">
          <div className="lit-maj-tete">
            <h3 id="lit-maj-titre" className="lit-etiquette">
              Dernière nouvelle
            </h3>
            <Link href={`${ici}?onglet=fil`} className="lit-maj-bouton" aria-label="Voir le fil du chantier" title="Voir le fil du chantier">
              <MessageSquare aria-hidden="true" />
              <span>Voir le fil</span>
            </Link>
          </div>
          {derniere ? (
            <div className="lit-maj-corps">
              <div className="lit-maj-meta">
                <span className="lit-maj-etat" data-teinte={derniere.teinte}>
                  {derniere.genre === "message" ? <MessageSquare aria-hidden="true" /> : <IconeSante etat={derniere.teinte === "vert" ? "bien" : derniere.teinte === "rouge" ? "hors" : derniere.teinte === "jaune" ? "risque" : "neutre"} />}
                  {derniere.etat}
                </span>
                {derniere.auteur ? (
                  <>
                    <span className="lit-avatar lit-avatar--18" aria-hidden="true">
                      {initiales(derniere.auteur) || "?"}
                    </span>
                    <span className="lit-maj-gris">{derniere.auteur}</span>
                  </>
                ) : null}
                <span className="lit-maj-gris" title={quandLong(derniere.quand)}>
                  {relatif(derniere.quand)}
                </span>
              </div>
              <p className="lit-maj-texte">{derniere.genre === "message" ? `« ${derniere.texte} »` : derniere.texte}</p>
              <div className="lit-maj-pied">
                <Link href={derniere.lien} className="lit-maj-pilule">
                  {derniere.genre === "message" ? <FileSignature aria-hidden="true" /> : <Link2 aria-hidden="true" />}
                  {derniere.lienLibelle}
                </Link>
              </div>
            </div>
          ) : (
            <div className="lit-maj-corps">
              <p className="lit-maj-texte lit-maj-texte--vide">Rien de neuf : aucun message du terrain sur un avenant, aucune réponse à une confirmation de passage.</p>
            </div>
          )}
        </section>

        {/* « Description » : les contrôles bloquants et à voir (B12), en phrases */}
        <section className="lit-description" aria-labelledby="lit-description-titre">
          <h3 id="lit-description-titre" className="lit-etiquette">
            Contrôles
          </h3>
          <div className="lit-description-texte">
            {controles.length ? (
              <>
                <p>
                  {nbBloquants ? `${nbBloquants} point${nbBloquants > 1 ? "s" : ""} bloquant${nbBloquants > 1 ? "s" : ""}` : "Aucun point bloquant"}
                  {nbAVoir ? `, ${nbAVoir} à voir` : ""}.
                </p>
                <ul>
                  {controles.map((k) => (
                    <li key={`${k.code}-${k.objet_id}`}>
                      <strong data-teinte={k.gravite === "bloquant" ? "rouge" : "jaune"}>{k.gravite === "bloquant" ? "Bloquant." : "À voir."}</strong> {k.message}
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p>Rien à signaler : aucun contrôle bloquant ni à voir sur ce chantier.</p>
            )}
            <p>
              <Link href={`${ici}?onglet=terrain`} className="lit-lien">
                Tous les contrôles, dans Terrain
              </Link>
            </p>
          </div>
        </section>
      </div>

      <Lots t={t} ici={ici} />
    </div>
  );
}

/* ——— le tableau « Projects » de l'initiative : les lots du chantier, groupés par état ——— */
function Lots({ t, ici }: { t: Tableau; ici: string }) {
  const [replies, setReplies] = useState<Set<string>>(new Set());
  const avance = useMemo(() => avancements(t), [t]);
  const prix = t.voit_prix;
  const basculer = (cle: string) =>
    setReplies((p) => {
      const n = new Set(p);
      if (n.has(cle)) n.delete(cle);
      else n.add(cle);
      return n;
    });

  return (
    <section className="lit-lots" aria-labelledby="lit-lots-titre">
      <div className="lit-lots-tete">
        <h3 id="lit-lots-titre" className="lit-lots-titre">
          Lots
        </h3>
        <Link href={`${ici}?onglet=argent`} className="lit-rond lit-rond--plein" aria-label="Lots et déboursé, dans Argent" title="Lots et déboursé, dans Argent">
          <ArrowUpRight aria-hidden="true" />
        </Link>
      </div>
      {t.lots.length ? (
        <table className="lit-table" data-prix={prix ? "" : undefined}>
          <thead>
            <tr className="lit-table-tete">
              <th aria-hidden="true" />
              <th scope="col">Nom</th>
              <th scope="col">Santé</th>
              <th scope="col" className="lit-col-executant">
                Exécutant
              </th>
              {prix ? (
                <th scope="col" className="lit-col-reste">
                  Reste HT
                </th>
              ) : null}
              <th scope="col">Statut</th>
              <th aria-hidden="true" />
            </tr>
          </thead>
          {GROUPES.map((g) => {
            const lots = t.lots.filter((l) => l.statut === g.cle).sort((a, b) => a.rang - b.rang);
            if (!lots.length) return null;
            const replie = replies.has(g.cle);
            return (
              <tbody key={g.cle} className="lit-groupe-corps">
                <tr className="lit-groupe">
                  <th scope="rowgroup" colSpan={prix ? 7 : 6}>
                    <button type="button" className="lit-groupe-fleche" aria-expanded={!replie} aria-label={replie ? `Déplier le groupe ${g.libelle}` : `Replier le groupe ${g.libelle}`} onClick={() => basculer(g.cle)}>
                      <ChevronDown aria-hidden="true" />
                    </button>
                    <span className="lit-groupe-nom">{g.libelle}</span>
                    <span className="lit-groupe-filet" aria-hidden="true" />
                  </th>
                </tr>
                {replie
                  ? null
                  : lots.map((l) => {
                      const d = t.debourse.find((x) => x.lot_id === l.id);
                      const reste = d?.reste_ht ?? null;
                      const engage = (d?.engage_marche_ht ?? 0) + (d?.engage_avenants_ht ?? 0);
                      const sante: Sante = reste === null || !prix ? "neutre" : reste < 0 ? "hors" : reste > 0 ? "bien" : "neutre";
                      const santeTexte =
                        reste === null || !prix ? "Santé : le déboursé est réservé aux comptes qui voient les prix" : reste < 0 ? `Dépassé de ${montant(-reste)} HT` : reste > 0 ? `Dans le budget : reste ${montant(reste)} HT` : engage ? "Soldé : tout l'engagé est facturé" : "Rien d'engagé sur ce lot";
                      const qui = l.tiers_nom ?? l.equipe_nom ?? null;
                      const pct = l.statut === "termine" ? 100 : (avance.get(l.id) ?? (l.statut === "a_venir" ? 0 : null));
                      const etat = l.statut === "a_venir" ? "À venir" : l.statut === "en_cours" ? "En cours" : "Terminé";
                      return (
                        <tr key={l.id} className="lit-ligne">
                          <td aria-hidden="true" />
                          <td className="lit-ligne-nom">
                            <Layers className="lit-ic" aria-hidden="true" />
                            <Link href={`${ici}?onglet=argent`} className="lit-ligne-lien">
                              <span className="lit-ligne-code">{l.code}</span> {l.libelle}
                            </Link>
                          </td>
                          <td>
                            <span className="lit-rond lit-rond--cellule" role="img" aria-label={santeTexte} title={santeTexte}>
                              <IconeSante etat={sante} />
                            </span>
                          </td>
                          <td className="lit-col-executant" title={`${EXECUTIONS[l.execution]}${qui ? ` : ${qui}` : ", à désigner"}`}>
                            {qui ? (
                              <span className="lit-avatar" aria-hidden="true">
                                {initiales(qui) || "?"}
                              </span>
                            ) : (
                              <UserRound className="lit-ic" aria-hidden="true" />
                            )}
                            <span className={qui ? "lit-executant" : "lit-executant lit-executant--vide"}>{qui ?? "À désigner"}</span>
                          </td>
                          {prix ? (
                            <td className="lit-col-reste">
                              <span className="lit-reste" data-teinte={reste !== null && reste < 0 ? "rouge" : undefined}>
                                {reste === null ? "—" : montant(reste)}
                              </span>
                            </td>
                          ) : null}
                          <td>
                            <span className="lit-statut" title={`${etat}${pct === null ? ", avancement non mesuré (aucune situation)" : `, ${pct} %`}`}>
                              <IconeStatutProjet etat={ETAT_LOT[l.statut]} />
                              <span className="lit-statut-pct">{pct === null ? "—" : `${pct}%`}</span>
                            </span>
                          </td>
                          <td aria-hidden="true" />
                        </tr>
                      );
                    })}
              </tbody>
            );
          })}
        </table>
      ) : (
        <p className="lit-aide">Aucun lot : le planning et les lignes du marché ne peuvent pas s&apos;y rattacher.</p>
      )}
      {!prix ? <p className="lit-aide">Les montants sont réservés aux personnes qui ont le droit de voir les prix.</p> : null}
    </section>
  );
}
