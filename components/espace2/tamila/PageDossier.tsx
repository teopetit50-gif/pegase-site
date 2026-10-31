"use client";

/* ══════════════════════════════════════════════════════════════════════
   TAMILA › la page d'un dossier (30/10/2026, refonte des pages métiers)

   La page d'une Initiative de Linear, au 1:1 : relevé docs/refonte-
   metiers/releves/linear-initiative.md, mesures dans components/espace2/
   lin/linear-initiative.css (préfixe lit-). Barre du fil (Dossiers ›
   référence), onglets en pilules, la zone centrale, et le volet « détails »
   à droite (bouton rond au bout des onglets).

   Les onglets et ce qu'ils reprennent (DECOUPAGES.md § TAMILA, inventaire
   tamila.md) ; une partie à la fois (?partie=, « Tout voir » rend la pile) :
     Procédure    B20 (+ L9, L10), B21 (+ L11), B24-B25, B35, B39 — en tête
                  le titre, le résumé et les propriétés de l'Overview
     Pièces       B28-B29 (+ L12), B22-B23, B26-B27 (+ L13, L14) : les
                  lectures après les pièces dont elles dépendent
     Honoraires   B30-B32 (+ L15, L16)
     Conformité   conflits et vigilance EN PREMIER puis les parties (B33,
                  B34, B19 : montés ensemble, le contrôle automatique d'une
                  partie qui entre en dépend), qui voit le dossier (B36),
                  exports (B37), journal des accès (B38, L17)
     Volet        l'identité et les décisions (B17, B18 : exporter,
                  clôturer, annuler la clôture, convertir l'audit, décider)
   Chaque partie monte DossierTamila avec ses seules cartes (`cartes`) :
   mêmes portes, mêmes fenêtres, mêmes rôles. Le dossier est lu une fois
   (useTamila().ouvrir : consultation, journal, clé), puis gardé par le
   layout tant que l'onglet du navigateur vit.
   ══════════════════════════════════════════════════════════════════════ */

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { CalendarClock, Copy, FolderLock, PanelRight, Scale, UserRound } from "lucide-react";
import DossierTamila, { type CarteDossier } from "@/components/espace/tamila/DossierTamila";
import { STATUTS_DOSSIER, delaiCourt, joursAvant, libelleMatiere, libelleTerritoire } from "@/components/espace/tamila/regles";
import { dateCourte } from "@/components/espace/format";
import Habille from "@/components/espace2/Habille";
import { useToast } from "../Toasts";
import { BASE, initiales, type OngletDossier } from "./commun";
import { useTamila } from "./donnees";
import "../lin/lin.css";
import "../lin/linear-initiative.css";

type Partie = { cle: string; libelle: string; cartes: CarteDossier[] };
const ONGLETS: { cle: OngletDossier; libelle: string; parties: Partie[] }[] = [
  {
    cle: "procedure",
    libelle: "Procédure",
    parties: [
      { cle: "delais", libelle: "Appel et délais", cartes: ["delais"] },
      { cle: "audiences", libelle: "Audiences", cartes: ["audiences"] },
      { cle: "expertise", libelle: "Expertise", cartes: ["expertise"] },
      { cle: "avis", libelle: "Avis RPVA", cartes: ["avis"] },
    ],
  },
  {
    cle: "pieces",
    libelle: "Pièces",
    parties: [
      { cle: "pieces", libelle: "Pièces", cartes: ["pieces"] },
      { cle: "attentes", libelle: "Pièces attendues", cartes: ["attentes"] },
      { cle: "lectures", libelle: "Lectures", cartes: ["lectures"] },
    ],
  },
  { cle: "honoraires", libelle: "Honoraires", parties: [{ cle: "honoraires", libelle: "Honoraires", cartes: ["honoraires"] }] },
  {
    cle: "conformite",
    libelle: "Conformité",
    parties: [
      { cle: "conflits", libelle: "Conflits et parties", cartes: ["conformite", "parties"] },
      { cle: "membres", libelle: "Qui voit le dossier", cartes: ["membres"] },
      { cle: "exports", libelle: "Exports", cartes: ["exports"] },
      { cle: "journal", libelle: "Journal des accès", cartes: ["journal"] },
    ],
  },
];
const estOnglet = (x: string | null): x is OngletDossier => ONGLETS.some((o) => o.cle === x);

const abonnerLarge = (rappel: () => void) => {
  const m = window.matchMedia("(min-width: 1024px)");
  m.addEventListener("change", rappel);
  return () => m.removeEventListener("change", rappel);
};

const TEINTE: Record<string, string> = { vert: "vert", ambre: "jaune", rouge: "rouge", bleu: "bleu", gris: "gris", noir: "gris" };

export default function PageDossier({ id }: { id: string }) {
  const { source, pret, moi, personnes, regles, reglages, clientId, lignes, complet: completDe, ouvrir, enLecture, cle, remplacerLocal, relireDossier, referenceDe, nomDe } = useTamila();
  const params = useSearchParams();
  const chemin = usePathname();
  const toast = useToast();
  /* le volet s'ouvre de lui-même sur grand écran ; en dessous de 1024, il attend qu'on le demande */
  const large = useSyncExternalStore(abonnerLarge, () => window.matchMedia("(min-width: 1024px)").matches, () => true);
  const [voletChoisi, setVolet] = useState<boolean | null>(null);
  const volet = voletChoisi ?? large;

  useEffect(() => {
    ouvrir(id);
  }, [id, ouvrir]);

  const o = params.get("onglet");
  const onglet: OngletDossier = estOnglet(o) ? o : "procedure";
  const courant = ONGLETS.find((x) => x.cle === onglet)!;
  const p = params.get("partie");
  const partie = p === "tout" ? "tout" : (courant.parties.find((x) => x.cle === p)?.cle ?? courant.parties[0].cle);
  const cartes: CarteDossier[] = partie === "tout" ? courant.parties.flatMap((x) => x.cartes) : courant.parties.find((x) => x.cle === partie)!.cartes;
  const lienOnglet = (cle: OngletDossier) => (cle === "procedure" ? chemin : `${chemin}?onglet=${cle}`);
  const lienPartie = (cle: string) => `${chemin}?onglet=${onglet}&partie=${cle}`;

  const ligne = lignes.find((x) => x.dossier.id === id) ?? null;
  const complet = completDe(id);
  const absent = pret && !ligne;
  const clair = complet?.clair ?? ligne?.clair ?? null;
  const nom = clair?.reference ?? "Dossier chiffré";
  const s = ligne ? STATUTS_DOSSIER[ligne.dossier.statut] : null;

  const copierLien = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast("Lien de la page copié.", "vert");
    } catch {
      toast("Le lien n'a pas pu être copié.", "rouge");
    }
  };

  const monter = (c: CarteDossier[], k: string) =>
    complet ? (
      <DossierTamila
        key={`${k}-${source}-${complet.dossier.id}`}
        complet={complet}
        source={source}
        moi={moi}
        personnes={personnes}
        regles={regles}
        reglages={reglages}
        cle={cle(complet.dossier.id)}
        clientId={clientId}
        onLocal={remplacerLocal}
        relire={() => relireDossier(complet.dossier.id)}
        referenceDe={referenceDe}
        cartes={c}
      />
    ) : null;

  return (
    <div className="lin lit">
      <h1 className="v2-sr">{nom}</h1>

      <header className="lit-tete">
        <nav className="lit-fil" aria-label="Fil d'Ariane">
          <Link href={BASE} className="lit-fil-lien">
            Dossiers
          </Link>
          <span className="lit-fil-sep" aria-hidden="true">
            ›
          </span>
          <span className="lit-fil-ici" aria-current="page" data-teinte={s ? TEINTE[s.teinte] : "gris"}>
            <FolderLock aria-hidden="true" />
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
        <nav className="lit-onglets" aria-label="Vues du dossier">
          {ONGLETS.map((x) => (
            <Link key={x.cle} href={lienOnglet(x.cle)} scroll={false} className="lit-onglet" aria-current={onglet === x.cle ? "page" : undefined}>
              {x.libelle}
            </Link>
          ))}
        </nav>
        <button type="button" className="lit-rond lit-rond--plein" aria-label={volet ? "Fermer les détails du dossier" : "Ouvrir les détails du dossier"} title={volet ? "Fermer les détails du dossier" : "Ouvrir les détails du dossier"} aria-expanded={volet} aria-controls={volet ? "lit-volet" : undefined} onClick={() => setVolet(!volet)}>
          <PanelRight aria-hidden="true" />
        </button>
      </div>

      {!complet ? (
        <div className="lit-corps">
          <div className="lit-zone">
            <p className="lit-vide" role={absent ? "alert" : "status"}>
              {absent ? (
                <>
                  Ce dossier n&apos;est pas visible avec ce compte.{" "}
                  <Link href={BASE} className="lit-lien">
                    Revenir aux dossiers
                  </Link>
                </>
              ) : enLecture(id) || !pret ? (
                "Lecture du dossier… (une consultation tracée au journal)"
              ) : (
                "Lecture du dossier…"
              )}
            </p>
          </div>
        </div>
      ) : (
        <div className="lit-corps" data-volet={volet ? "" : undefined}>
          <div className="lit-zone">
            {onglet === "procedure" && partie !== "tout" && partie === courant.parties[0].cle ? <Apercu id={id} /> : null}
            <div className="lit-gestes">
              {courant.parties.length > 1 ? (
                <nav className="lit-parties" aria-label={`Parties de l'onglet ${courant.libelle}`}>
                  {courant.parties.map((x) => (
                    <Link key={x.cle} href={lienPartie(x.cle)} scroll={false} className="lit-partie" aria-current={partie === x.cle ? "page" : undefined}>
                      {x.libelle}
                    </Link>
                  ))}
                  <Link href={lienPartie("tout")} scroll={false} className="lit-partie lit-partie--tout" aria-current={partie === "tout" ? "page" : undefined}>
                    Tout voir
                  </Link>
                </nav>
              ) : null}
              <Habille>{monter(cartes, `${onglet}-${partie}`)}</Habille>
            </div>
          </div>

          {volet ? (
            <aside id="lit-volet" className="lit-volet" aria-label="Détails du dossier">
              <section className="lit-carte" aria-labelledby="lit-proprietes">
                <h2 id="lit-proprietes" className="lit-carte-titre">
                  Propriétés
                </h2>
                <div className="lit-carte-gestes">
                  <Habille>{monter(["entete"], "entete")}</Habille>
                </div>
              </section>
              <section className="lit-carte" aria-labelledby="lit-activite">
                <h2 id="lit-activite" className="lit-carte-titre">
                  Dernières lectures
                  <Link href={`${chemin}?onglet=conformite&partie=journal`} className="lit-carte-lien">
                    Tout le journal
                  </Link>
                </h2>
                <ul className="lit-activite">
                  {complet.lectures.slice(0, 5).map((l, i) => (
                    <li key={`${l.user_id}-${l.lu_le}-${i}`}>
                      <span className="lit-activite-point" data-teinte="bleu" aria-hidden="true" />
                      <span className="lit-activite-texte">
                        {nomDe(l.user_id)} {l.contexte === "export.telechargement" ? "a téléchargé un export" : l.contexte === "export" ? "a demandé un export" : "a consulté le dossier"}
                        <span className="lit-activite-quand"> · {dateCourte(l.lu_le)}</span>
                      </span>
                    </li>
                  ))}
                  {complet.lectures.length === 0 ? <li className="lit-activite-texte">Aucune lecture rendue.</li> : null}
                </ul>
              </section>
            </aside>
          ) : null}
        </div>
      )}
    </div>
  );
}

/* l'en-tête de l'Overview : tuile, titre, résumé, propriétés en pastilles (sans geste : les gestes sont dans le volet) */
function Apercu({ id }: { id: string }) {
  const { lignes, complet: completDe, nomDe } = useTamila();
  const ligne = lignes.find((x) => x.dossier.id === id);
  const complet = completDe(id);
  if (!ligne || !complet) return null;
  const d = ligne.dossier;
  const s = STATUTS_DOSSIER[d.statut];
  const clair = complet.clair ?? ligne.clair;
  const prochaine = complet.delais.filter(delaiCourt).sort((a, b) => a.echeance_retenue.localeCompare(b.echeance_retenue))[0] ?? null;
  const audience = complet.audiences.filter((a) => a.statut === "prevue" && new Date(a.date_heure) >= new Date()).sort((a, b) => a.date_heure.localeCompare(b.date_heure))[0] ?? null;
  const j = prochaine ? joursAvant(prochaine.echeance_retenue) : null;
  const resume = [clair?.numero_rg ? `RG ${clair.numero_rg}` : null, d.matiere ? libelleMatiere(d.matiere) : null, d.juridiction ?? libelleTerritoire(d.territoire), d.mode === "dommage_corporel" ? "dommage corporel" : null].filter(Boolean).join(" · ");
  const responsable = d.responsable_id ? nomDe(d.responsable_id) : null;
  return (
    <div className="lit-page">
      <div className="lit-texte">
        <span className="lit-tuile" data-teinte={TEINTE[s.teinte]} aria-hidden="true">
          <FolderLock />
        </span>
        <h2 className="lit-titre">{clair ? `${clair.reference} — ${clair.intitule}` : "Référence et intitulé chiffrés"}</h2>
        <p className="lit-resume">{resume}</p>
        <div className="lit-rangee">
          <h3 className="lit-etiquette">Propriétés</h3>
          <ul className="lit-puces">
            <li className="lit-puce" title={`Statut : ${s.libelle}`} data-teinte={TEINTE[s.teinte]}>
              {s.libelle}
            </li>
            <li className={responsable ? "lit-puce" : "lit-puce lit-puce--vide"} title="Avocat responsable">
              {responsable ? (
                <span className="lit-avatar" aria-hidden="true">
                  {initiales(responsable) || "?"}
                </span>
              ) : (
                <UserRound className="lit-ic" aria-hidden="true" />
              )}
              {responsable ?? "Responsable à désigner"}
            </li>
            <li className={prochaine ? "lit-puce" : "lit-puce lit-puce--vide"} title="Prochaine échéance de procédure" data-teinte={j !== null && j <= 15 ? "rouge" : undefined}>
              <CalendarClock className="lit-ic" aria-hidden="true" />
              {prochaine ? `Échéance ${dateCourte(prochaine.echeance_retenue)}${j !== null && j < 0 ? ", dépassée" : j !== null && j <= 15 ? `, J-${j}` : ""}` : "Aucune échéance en cours"}
            </li>
            <li className={audience ? "lit-puce" : "lit-puce lit-puce--vide"} title="Prochaine audience">
              <Scale className="lit-ic" aria-hidden="true" />
              {audience ? `Audience ${dateCourte(audience.date_heure)}` : "Aucune audience prévue"}
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
