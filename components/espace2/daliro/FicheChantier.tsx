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
   05/11/2026 (Teo : « super moches ») : Terrain, Argent et Réception
   quittent le gabarit d'outil de Lorani (onglets soulignés, tableaux) pour
   une seule page par onglet (pas de sous-pages) : chaque partie l'une sous
   l'autre, son titre et ses gestes, puis son tableau au dessin de Lots.
   Lots devient l'onglet « Projects » de l'Initiative tel que Linear le
   montre, un tableau (LotsProjets.tsx) ; la frise reste en option.
   30/10/2026 : dans ces onglets, chaque partie est une liste groupée (« My
   issues » de Linear) et l'élément choisi s'ouvre dans le volet, à la place
   des propriétés (../lin/Volet.tsx, PartiesChantier.tsx et chaque carte).
   Aucun geste n'est réécrit : chaque onglet monte sa propre ChantierVue
   (mêmes portes, mêmes fenêtres). Les ancres #planning, #avenants,
   #situations et #fil (posées dans ChantierVue) sont rejointes à
   l'arrivée, une fois le tableau lu.
   ══════════════════════════════════════════════════════════════════════ */

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import ChantierVue, { type FormChantier, type SectionChantier } from "@/components/espace/daliro/ChantierVue";
import type { StatutChantier } from "@/components/espace/daliro/types";
import Habille from "@/components/espace2/Habille";
import { RACINE } from "@/components/espace2/modules";
import { BoiteContexte, VoletContexte } from "../lin/Volet";
import { useToast } from "../Toasts";
import { useDaliro } from "./donnees";
import "../lin/lin.css";
import "../lin/linear-initiative.css";
import { DalCarte, DalMenu } from "./DalCadre";
import { DalIcone } from "./DalIcone";
import "./dal-initiative.css";
import { ApercuChantier, VoletChantier } from "./ApercuChantier";
import { ActiviteChantier } from "./ActiviteChantier";
import Chantiers from "./Chantiers";
import { LotsProjets } from "./LotsProjets";
import { ArgentPilotage } from "./ArgentPilotage";
import { ConversationDaliro } from "./QuestionsDaliro";
import { EtoilePleine } from "./IconesProjet";
import { useFavoris, useSuivis } from "./navigateur";

const BASE = `${RACINE}/daliro`;

type CleOnglet = "apercu" | "fil" | "projets" | "terrain" | "argent" | "reception";
/* 05/11/2026 : Terrain et Argent montrent toutes leurs parties sur une page, la plus utile d'abord ;
   ?partie= et les ancres des repères (#planning, #avenants, #situations) y font défiler. */
/* l'ordre de Linear : Overview, Activity, puis les vues ajoutées (« Add new view ») — Terrain,
   Argent, Réception sont des vues du chantier en listes ; « Fil » garde sa clé d'adresse */
const ONGLETS: { cle: CleOnglet; libelle: string; sections?: SectionChantier[] }[] = [
  { cle: "apercu", libelle: "Aperçu" },
  { cle: "fil", libelle: "Activité", sections: ["fil"] },
  /* l'onglet « Projects » de l'Initiative : les lots du chantier sur la frise de Chantiers */
  { cle: "projets", libelle: "Lots" },
  { cle: "terrain", libelle: "Terrain", sections: ["controles", "planning", "appro", "meteo", "questions"] },
  { cle: "argent", libelle: "Argent", sections: ["avenants", "situations", "factures", "lots", "marche", "heures"] },
  { cle: "reception", libelle: "Réception", sections: ["reception"] },
];
const estOnglet = (v: string | null): v is CleOnglet => ONGLETS.some((o) => o.cle === v);

/* l'icône du fil d'Ariane, couleur du statut (couleurs d'icônes relevées chez Linear) */
const COULEUR_FIL: Record<StatutChantier, string> = { preparation: "#f0bf00", ouvert: "#26b5ce", suspendu: "#e78f41", receptionne: "#5e6ad2", clos: "#a2a6ac", annule: "#a2a6ac" };

/* au-dessous de 1 200 px, le volet passe au-dessus du contenu */
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

export default function FicheChantier({ id }: { id: string }) {
  const { source, pret, erreur, liste, tableau, demander, enLecture, onLocal, relireChantier } = useDaliro();
  const params = useSearchParams();
  const chemin = usePathname();
  const routeur = useRouter();
  const toast = useToast();
  const large = useLarge();
  const [voletChoisi, setVoletChoisi] = useState<boolean | null>(null);
  /* 30/10/2026 : l'élément choisi dans une partie (passage, avenant, commande…) s'ouvre dans le volet */
  const [choisie, setChoisie] = useState<string | null>(null);
  const [cible, setCible] = useState<HTMLElement | null>(null);
  /* fermé à l'arrivée, comme chez Linear (capture 1440-reel) ; ⌘ I ou le bouton l'ouvre */
  const volet = choisie !== null || (voletChoisi ?? false);
  /* les gestes de l'en-tête (ouvrir, suspendre, avenant, facture, relevé) : les fenêtres de ChantierVue */
  const [demande, setDemande] = useState<{ n: number; form: FormChantier } | null>(null);
  const geste = (form: FormChantier) => setDemande((d) => ({ n: (d?.n ?? 0) + 1, form }));

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
  const chantierListe = liste.find((c) => c.id === id) ?? null;
  const favoris = useFavoris();
  const suivis = useSuivis();
  const epingle = favoris.estEpingle("btp_chantiers", id);
  const suivi = suivis.estSuivi("btp_chantiers", id);
  const nom = t?.chantier.nom ?? chantierListe?.nom ?? "Chantier";
  const lienParam = (cle: string, valeur: string | null) => {
    const p = new URLSearchParams(params.toString());
    if (valeur === null) p.delete(cle);
    else p.set(cle, valeur);
    return `${chemin}?${p.toString()}`;
  };
  const lienOnglet = (cle: CleOnglet) => (cle === "apercu" ? chemin : `${chemin}?onglet=${cle}`);
  const relire = () => relireChantier(id);

  const copierLien = () => {
    void navigator.clipboard?.writeText(window.location.href).then(
      () => toast("Lien copié"),
      () => toast("Le lien n'a pas pu être copié.", "rouge"),
    );
  };

  const courant = ONGLETS.find((x) => x.cle === onglet);
  /* l'onglet Lots : le tableau « Projects » de Linear, ou la frise (« Options d'affichage », ?vue=frise) */
  const frise = params.get("vue") === "frise";
  const fl = params.get("lots");
  const filtreLots = fl === "en_cours" || fl === "a_venir" || fl === "termine" ? fl : null;
  /* la phrase du volet de droite de la boîte, quand rien n'est choisi */
  const resumeBoite = (() => {
    if (!t) return "";
    if (onglet === "reception") {
      const r = t.reception;
      if (!r) return "Réception pas encore prononcée";
      const n = r.reserves.filter((x) => x.statut !== "levee").length;
      return r.avec_reserves ? `${n} réserve${n > 1 ? "s" : ""} à lever sur ${r.reserves.length}` : "Réception prononcée sans réserve";
    }
    const auj = new Date().toISOString().slice(0, 10);
    const bloquants = [...t.controles, ...t.controles_organisation].filter((k) => k.gravite === "bloquant").length;
    const prevus = t.passages.filter((x) => x.statut === "prevu");
    const retard = prevus.filter((x) => x.fin < auj).length;
    const avenir = prevus.length - retard;
    const pl = (n: number, mot: string) => `${n} ${mot}${n > 1 ? "s" : ""}`;
    return `${bloquants ? pl(bloquants, "point bloquant") : "Aucun point bloquant"} · ${pl(avenir, "passage")} à venir${retard ? `, ${retard} en retard` : ""}`;
  })();
  /* ?partie= (ou ?liste=, l'adresse du 04/11) : la page de l'onglet défile jusqu'à cette partie */
  const partie = params.get("partie") ?? params.get("liste");
  useEffect(() => {
    if (!lu || !partie) return;
    const minuterie = window.setTimeout(() => document.getElementById(`partie-${partie}`)?.scrollIntoView({ block: "start" }), 120);
    return () => window.clearTimeout(minuterie);
  }, [onglet, partie, lu]);

  /* changer d'onglet ou de partie referme l'élément choisi ; Échap aussi */
  const [vue, setVue] = useState(onglet);
  if (vue !== onglet) {
    setVue(onglet);
    setChoisie(null);
  }
  useEffect(() => {
    if (choisie === null) return;
    const touche = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || document.querySelector("[role='dialog']")) return;
      setChoisie(null);
    };
    window.addEventListener("keydown", touche);
    return () => window.removeEventListener("keydown", touche);
  }, [choisie]);
  /* moins large, le volet passe au-dessus du contenu : on l'amène à l'écran */
  useEffect(() => {
    if (choisie === null || large || !cible) return;
    cible.parentElement?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [choisie, large, cible]);
  const contexte = useMemo(() => ({ cible, choisie, choisir: setChoisie }), [cible, choisie]);
  /* ⌘ I ouvre ou ferme le volet de détails (raccourci de Linear) */
  useEffect(() => {
    const touche = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== "i") return;
      e.preventDefault();
      setChoisie(null);
      setVoletChoisi(!volet);
    };
    window.addEventListener("keydown", touche);
    return () => window.removeEventListener("keydown", touche);
  }, [volet]);

  return (
    <VoletContexte.Provider value={contexte}>
    <DalCarte className="dal-fc dal-tl-page">
    <div className="lin lit">
      <h1 className="v2-sr">{nom}</h1>

      <header className="dal-tete">
        <div className="dal-ligne1">
          <nav className="dal-fc-fil" aria-label="Fil d'Ariane">
            <Link href={`${BASE}/chantiers`} className="dal-fc-fil-lien">
              Chantiers
            </Link>
            <span className="dal-fc-fil-sep" aria-hidden="true">
              ›
            </span>
            <span className="dal-fc-fil-ici" aria-current="page">
              <DalIcone nom="Crane" style={{ color: COULEUR_FIL[t?.chantier.statut ?? "preparation"] }} />
              <span>{nom}</span>
            </span>
          </nav>
          {/* étoile « Add to favorites » → Épingler : le chantier remonte en tête de la vue d'ensemble */}
          <button
            type="button"
            className="dal-rond"
            role="switch"
            aria-checked={epingle}
            aria-label={epingle ? "Désépingler le chantier" : "Épingler le chantier"}
            title={epingle ? "Désépingler (retirer des épinglés de la vue d'ensemble)" : "Épingler en tête de la vue d'ensemble"}
            onClick={() => favoris.basculer({ type: "btp_chantiers", id, titre: nom, href: `${BASE}/chantiers/${encodeURIComponent(id)}` })}
          >
            {epingle ? <EtoilePleine /> : <DalIcone nom="Etoile" taille={14} />}
          </button>
          <DalMenu
            libelle="Actions sur le chantier"
            options={[
              ...(t?.chantier.statut === "preparation" ? [{ libelle: "Ouvrir le chantier…", icone: "Lock" as const, action: () => geste({ type: "statut", statut: "ouvert" }) }] : []),
              ...(t?.chantier.statut === "ouvert" ? [{ libelle: "Suspendre le chantier…", icone: "Hourglass" as const, action: () => geste({ type: "statut", statut: "suspendu" }) }] : []),
              ...(t?.chantier.statut === "suspendu" ? [{ libelle: "Reprendre le chantier…", icone: "Refresh" as const, action: () => geste({ type: "statut", statut: "ouvert" }) }] : []),
              ...(t && (t.chantier.statut === "ouvert" || t.chantier.statut === "suspendu") ? [{ libelle: "Ouvrir un avenant…", icone: "Signature" as const, action: () => geste({ type: "avenant" }) }] : []),
              { libelle: "Rattacher une facture…", icone: "Attachment", action: () => geste({ type: "facture" }) },
              { libelle: "Relevé du chantier…", icone: "Checklist", action: () => geste({ type: "releve" }) },
              "sep",
              { libelle: "Détails du chantier", icone: "Volet", action: () => (setChoisie(null), setVoletChoisi(true)) },
              { libelle: "Fil du chantier", icone: "Comment", href: `${chemin}?onglet=fil` },
              { libelle: "Avenants et situations", icone: "Signature", href: `${BASE}/avenants` },
            ]}
          />
          <span className="dal-pousse" />
          <button type="button" className="dal-rond dal-fc-24" aria-label="Copier le lien de la page" title="Copier le lien de la page" onClick={copierLien}>
            <DalIcone nom="LienUrl" />
          </button>
          {/* cloche « Notifications » → Suivre : ses nouveaux messages passent en tête d'À ranger, marqués « suivi » */}
          <button
            type="button"
            className="dal-rond"
            aria-pressed={suivi}
            aria-label={suivi ? "Ne plus suivre le chantier" : "Suivre le chantier"}
            title={suivi ? "Suivi : ses nouveaux messages passent en tête d'À ranger — ne plus suivre" : "Suivre : ses nouveaux messages passeront en tête d'À ranger"}
            onClick={() => suivis.basculer({ type: "btp_chantiers", id, titre: nom, href: `${BASE}/chantiers/${encodeURIComponent(id)}` })}
          >
            <DalIcone nom={suivi ? "Notified" : "Subscribe"} taille={14} />
          </button>
          <button
            type="button"
            className="dal-rond"
            aria-label="Ouvrir un avenant"
            title={t && (t.chantier.statut === "ouvert" || t.chantier.statut === "suspendu") ? "Ouvrir un avenant" : "Un avenant se prépare sur un chantier ouvert"}
            disabled={!t || (t.chantier.statut !== "ouvert" && t.chantier.statut !== "suspendu")}
            onClick={() => geste({ type: "avenant" })}
          >
            <DalIcone nom="Plus" />
          </button>
        </div>
        <div className="dal-ligne2 dal-fc-ligne2">
          <span className="dal-fc-onglets">
            {ONGLETS.map((x) => (
              <Link key={x.cle} href={lienOnglet(x.cle)} scroll={false} className="dal-onglet" aria-current={onglet === x.cle ? "page" : undefined}>
                {x.libelle}
              </Link>
            ))}
            <Link href={`${BASE}/avenants`} className="dal-rond dal-fc-vue" aria-label="Avenants et situations" title="Avenants et situations">
              <DalIcone nom="CustomView" />
            </Link>
          </span>
          <span className="dal-pousse" />
          {onglet === "projets" ? (
            <span className="dal-fc-outils">
              <DalMenu
                libelle="Filtrer les lots"
                icone="Filtre"
                plein
                alignement="droite"
                actif={!!params.get("lots")}
                options={[
                  { libelle: "Tous les lots", icone: "Project", href: lienParam("lots", null) },
                  { libelle: "En cours", icone: "IssueStatusStarted", href: lienParam("lots", "en_cours") },
                  { libelle: "À venir", icone: "IssueStatusTodo", href: lienParam("lots", "a_venir") },
                  { libelle: "Terminés", icone: "IssueStatusDone", href: lienParam("lots", "termine") },
                ]}
              />
              <DalMenu
                libelle="Options d'affichage"
                icone="Affichage"
                plein
                alignement="droite"
                options={[
                  { libelle: "Affichage : tableau", icone: "Project", href: lienParam("vue", null) },
                  { libelle: "Affichage : frise", icone: "Calendar", href: lienParam("vue", "frise") },
                  ...(frise
                    ? [
                        "sep" as const,
                        { libelle: "Échelle : mois", icone: "Calendar" as const, href: lienParam("zoom", null) },
                        { libelle: "Échelle : trimestre", icone: "Calendar" as const, href: lienParam("zoom", "trimestre") },
                        { libelle: "Échelle : année", icone: "Calendar" as const, href: lienParam("zoom", "annee") },
                      ]
                    : []),
                ]}
              />
            </span>
          ) : null}
          <button
            type="button"
            className="dal-rond dal-rond--plein"
            aria-label={volet ? "Fermer les détails du chantier" : "Ouvrir les détails du chantier"}
            title={volet ? "Fermer les détails du chantier (⌘ I)" : "Ouvrir les détails du chantier (⌘ I)"}
            aria-expanded={volet}
            aria-controls={volet ? "dal-ini-volet" : undefined}
            onClick={() => {
              setChoisie(null);
              setVoletChoisi(!volet);
            }}
          >
            <DalIcone nom="Volet" />
          </button>
        </div>
      </header>

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
        <>
          <div className="dal-fc-gestes">
            <Habille>
              <ChantierVue key={`gestes-${source}-${id}`} tableau={t} source={source} onLocal={onLocal} relire={relire} sections={[]} demande={demande} />
            </Habille>
          </div>
          {onglet === "projets" ? (
            frise ? (
              <Chantiers lotsDe={id} />
            ) : (
              <div className="dal-lp-zone">
                <LotsProjets t={t} ici={chemin} filtre={filtreLots} />
              </div>
            )
          ) : onglet === "apercu" || onglet === "fil" ? (
            <div className="dal-ini-corps">
              <div className="dal-ini-zone">
                {onglet === "apercu" ? (
                  <ApercuChantier t={t} c={chantierListe ?? t.chantier} ici={chemin} ouvrirVolet={() => setVoletChoisi(true)} demander={geste} />
                ) : (
                  <div id="fil">
                    <ActiviteChantier
                      t={t}
                      source={source}
                      relire={relire}
                      ici={chemin}
                      actions={{
                        question: (texte) => routeur.push(`${chemin}?onglet=terrain&partie=questions&question=${encodeURIComponent(texte)}`),
                        avenant: (objet) => geste({ type: "avenant", objet }),
                        facture: () => geste({ type: "facture" }),
                        avenantPossible: t.chantier.statut === "ouvert" || t.chantier.statut === "suspendu",
                      }}
                    />
                  </div>
                )}
              </div>
              {volet ? <VoletChantier t={t} c={chantierListe ?? t.chantier} ici={chemin} /> : null}
            </div>
          ) : onglet === "argent" ? (
            <div className="lit-corps dal-ag-corps">
              {/* 06/11/2026 — décision de Teo : l'onglet Argent reprend le Pilotage de Tamila (Plain › Insights) */}
              <ArgentPilotage t={t} source={source} ici={chemin} />
            </div>
          ) : (
            /* 05/11 (choix de Teo) : Terrain et Réception sur la boîte de CASHD › Débiteurs — à gauche une
               seule liste de ce qui demande une action, à droite le détail de l'élément choisi (ses gestes),
               sinon les questions au chantier. Pas de sous-pages. */
            <div className="lit-corps dal-boite-corps">
              <div className="lin-boite dal-boite">
                <div className="lin-boite-liste dal-boite-liste">
                  <header className="lin-tete">
                    <span className="lin-boite-titre">{onglet === "reception" ? "Réception des travaux" : "Terrain"}</span>
                  </header>
                  {onglet === "reception" && !t.reception && !["ouvert", "suspendu", "receptionne", "clos"].includes(t.chantier.statut) ? (
                    <p className="lit-vide">La réception se prononce sur un chantier ouvert ou suspendu. Ouvrez d&apos;abord le chantier, depuis le menu « … ».</p>
                  ) : null}
                  <BoiteContexte.Provider value={true}>
                    {(courant?.sections ?? []).filter((sec) => sec !== "questions").map((sec) => (
                      <div key={sec} id={`partie-${sec}`} className="lit-gestes dal-boite-partie">
                        <Habille>
                          <ChantierVue key={`${sec}-${source}-${id}`} tableau={t} source={source} onLocal={onLocal} relire={relire} sections={[sec]} />
                        </Habille>
                      </div>
                    ))}
                  </BoiteContexte.Provider>
                </div>
                <div className="lin-boite-detail dal-boite-detail">
                  <div ref={setCible} className="lvp-cible dal-boite-cible" />
                  {/* 06/11/2026 — Terrain : la conversation avec Daliro, façon Claude (./QuestionsDaliro), à la place
                      de l'ancienne carte « Questions sur le chantier » ; gardée montée quand un élément est choisi */}
                  {onglet === "terrain" ? (
                    <div id="partie-questions" className="dal-boite-repos dal-boite-conversation" hidden={choisie !== null}>
                      <ConversationDaliro key={`daliro-${source}-${id}`} t={t} resume={resumeBoite} />
                    </div>
                  ) : choisie === null ? (
                    <div className="dal-boite-repos">
                      <div className="lin-boite-vide dal-boite-vide">
                        <DalIcone nom="Inbox" taille={48} />
                        <span>{resumeBoite}</span>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
    </DalCarte>
    </VoletContexte.Provider>
  );
}
