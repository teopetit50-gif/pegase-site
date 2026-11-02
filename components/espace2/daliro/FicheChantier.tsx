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
import { usePathname, useSearchParams } from "next/navigation";
import ChantierVue, { type FormChantier, type SectionChantier } from "@/components/espace/daliro/ChantierVue";
import type { StatutChantier } from "@/components/espace/daliro/types";
import Habille from "@/components/espace2/Habille";
import { RACINE } from "@/components/espace2/modules";
import { VoletContexte } from "../lin/Volet";
import { useToast } from "../Toasts";
import { useDaliro } from "./donnees";
import Essentiel from "./Essentiel";
import "../lin/lin.css";
import "../lin/linear-initiative.css";
import { DalCarte, DalMenu } from "./DalCadre";
import { DalIcone } from "./DalIcone";
import "./dal-initiative.css";
import { ApercuChantier, VoletChantier } from "./ApercuChantier";
import { ActiviteChantier } from "./ActiviteChantier";

const BASE = `${RACINE}/daliro`;

type CleOnglet = "apercu" | "terrain" | "argent" | "fil" | "reception";
/* 30/10/2026 : Terrain et Argent montrent une partie à la fois (?partie=, pastilles sous les onglets),
   la plus utile d'abord ; « Tout » rend l'ancienne pile. Les ancres des repères (#planning, #avenants,
   #situations) choisissent leur partie. */
/* l'ordre de Linear : Overview, Activity, puis les vues ajoutées (« Add new view ») — Terrain,
   Argent, Réception sont des vues du chantier en listes ; « Fil » garde sa clé d'adresse */
const ONGLETS: { cle: CleOnglet; libelle: string; sections?: SectionChantier[] }[] = [
  { cle: "apercu", libelle: "Aperçu" },
  { cle: "fil", libelle: "Activité", sections: ["fil"] },
  { cle: "terrain", libelle: "Terrain", sections: ["planning", "controles", "questions", "appro", "meteo"] },
  { cle: "argent", libelle: "Argent", sections: ["avenants", "situations", "marche", "lots", "factures", "heures"] },
  { cle: "reception", libelle: "Réception", sections: ["reception"] },
];
const estOnglet = (v: string | null): v is CleOnglet => ONGLETS.some((o) => o.cle === v);
const PARTIES: Partial<Record<SectionChantier, string>> = {
  planning: "Planning",
  controles: "Points à régler",
  questions: "Questions",
  appro: "Approvisionnement",
  meteo: "Météo",
  avenants: "Avenants",
  situations: "Situations",
  marche: "Marché",
  lots: "Lots et déboursé",
  factures: "Factures",
  heures: "Heures",
};

/* l'icône du fil d'Ariane, couleur du statut (couleurs d'icônes relevées chez Linear) */
const COULEUR_FIL: Record<StatutChantier, string> = { preparation: "#f0bf00", ouvert: "#26b5ce", suspendu: "#e78f41", receptionne: "#5e6ad2", clos: "#a2a6ac", annule: "#a2a6ac" };

const jourLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, "0")}-${`${d.getDate()}`.padStart(2, "0")}`;
};

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
  const nom = t?.chantier.nom ?? chantierListe?.nom ?? "Chantier";
  const lienOnglet = (cle: CleOnglet) => (cle === "apercu" ? chemin : `${chemin}?onglet=${cle}`);
  const relire = () => relireChantier(id);

  const copierLien = () => {
    void navigator.clipboard?.writeText(window.location.href).then(
      () => toast("Lien copié"),
      () => toast("Le lien n'a pas pu être copié.", "rouge"),
    );
  };

  const courant = ONGLETS.find((x) => x.cle === onglet);
  const auj = useMemo(() => jourLocal(), []);
  /* la partie montrée : ?partie=, sinon l'ancre d'un repère, sinon la première ; « tout » rend la pile */
  const [ancre, setAncre] = useState("");
  useEffect(() => {
    const lire = () => setAncre(decodeURIComponent(window.location.hash.slice(1)));
    lire();
    window.addEventListener("hashchange", lire);
    return () => window.removeEventListener("hashchange", lire);
  }, []);
  const pParam = params.get("partie");
  const parties = courant?.sections && courant.sections.length > 1 ? courant.sections : null;
  const partie: SectionChantier | "tout" | null = !parties
    ? null
    : pParam === "tout"
      ? "tout"
      : parties.find((x) => x === pParam) ?? parties.find((x) => x === ancre) ?? parties[0];
  const lienPartie = (x: SectionChantier | "tout") => `${chemin}?onglet=${onglet}&partie=${x}`;
  const sectionsMontrees = partie === null || partie === "tout" ? courant?.sections : [partie];

  /* changer d'onglet ou de partie referme l'élément choisi ; Échap aussi */
  const [vue, setVue] = useState(`${onglet}/${partie}`);
  if (vue !== `${onglet}/${partie}`) {
    setVue(`${onglet}/${partie}`);
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
    <DalCarte className="dal-fc">
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
          {ONGLETS.map((x) => (
            <Link key={x.cle} href={lienOnglet(x.cle)} scroll={false} className="dal-onglet" aria-current={onglet === x.cle ? "page" : undefined}>
              {x.libelle}
            </Link>
          ))}
          <Link href={`${BASE}/avenants`} className="dal-rond dal-fc-vue" aria-label="Avenants et situations" title="Avenants et situations">
            <DalIcone nom="CustomView" />
          </Link>
          <span className="dal-pousse" />
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
          {onglet === "apercu" || onglet === "fil" ? (
            <div className="dal-ini-corps">
              <div className="dal-ini-zone">
                {onglet === "apercu" ? (
                  <ApercuChantier t={t} c={chantierListe ?? t.chantier} ici={chemin} ouvrirVolet={() => setVoletChoisi(true)} demander={geste} />
                ) : (
                  <div id="fil">
                    <ActiviteChantier t={t} source={source} relire={relire} ici={chemin} />
                  </div>
                )}
              </div>
              {volet ? <VoletChantier t={t} c={chantierListe ?? t.chantier} ici={chemin} /> : null}
            </div>
          ) : (
            <div className="lit-corps" data-volet={volet ? "" : undefined}>
              <div className="lit-zone">
                <div className="lit-gestes">
                  {onglet === "reception" && !t.reception && !["ouvert", "suspendu", "receptionne", "clos"].includes(t.chantier.statut) ? (
                    <p className="lit-vide">La réception se prononce sur un chantier ouvert ou suspendu. Ouvrez d&apos;abord le chantier, depuis le menu « … ».</p>
                  ) : null}
                  {onglet === "argent" ? <Essentiel t={t} onglet={onglet} auj={auj} phrases={false} /> : null}
                  {parties ? (
                    <nav className="lit-parties" aria-label={`Parties de l'onglet ${courant?.libelle ?? ""}`}>
                      {parties.map((x) => (
                        <Link key={x} href={lienPartie(x)} scroll={false} className="lit-partie" aria-current={partie === x ? "page" : undefined}>
                          {PARTIES[x] ?? x}
                        </Link>
                      ))}
                      <Link href={lienPartie("tout")} scroll={false} className="lit-partie lit-partie--tout" aria-current={partie === "tout" ? "page" : undefined}>
                        Tout voir
                      </Link>
                    </nav>
                  ) : null}
                  <Habille>
                    <ChantierVue key={`${onglet}-${source}-${id}`} tableau={t} source={source} onLocal={onLocal} relire={relire} sections={sectionsMontrees} />
                  </Habille>
                </div>
              </div>
              {volet ? (
                <aside className="lit-volet" aria-label="Élément choisi">
                  <div ref={setCible} className="lvp-cible" />
                  {choisie === null ? <VoletChantier t={t} c={chantierListe ?? t.chantier} ici={chemin} /> : null}
                </aside>
              ) : null}
            </div>
          )}
        </>
      )}
    </div>
    </DalCarte>
    </VoletContexte.Provider>
  );
}
