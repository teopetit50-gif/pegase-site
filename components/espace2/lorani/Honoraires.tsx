"use client";

/* ══════════════════════════════════════════════════════════════════════
   LORANI « Honoraires et temps » (refait le 02/11/2026)

   Attio, liste People et fiche d'un contact, au 1:1 : relevé
   docs/refonte-metiers/releves/attio-people.md (01/11, refait après
   import le 02/11), styles dans ./lor-attio.css (préfixe lor-at-, jetons
   d'Attio sombre et clair). Une personne d'Attio = un élément de mission
   du projet (esquisse, APS, APD, permis…) :

     en-tête          « Honoraires » / projet / élément ouvert
     vue              le projet (« Recently Contacted People ⌄ ») ;
                      View settings : colonnes affichées
     New Person       « Saisir du temps » (F23, G42)
     Import / Export  « Ajouter / Exporter ⌄ » : un élément de mission (F22,
                      G43) ; la liste affichée en CSV
     cases            sélection : épingler, exporter, marquer achevé
                      (confirmation) ; « + Add column » : colonnes ;
                      « Add calculation » : somme, moyenne ou décompte
     Sorted by        l'ordre des phases ; Filter : l'état des éléments
     grille           Élément · Temps (pastille de niveau : à venir, en
                      cours, à surveiller à 80 %, dépassé, facturé) ·
                      Honoraires HT · État · Taux réalisé ; pied : nombre
                      d'éléments et totaux
     fiche            (?element=) panneau de gauche : l'élément, ses gestes
                      (Saisir du temps, Marquer achevé, Marquer facturé :
                      G44, G45 après confirmation), ses valeurs ; à droite
                      Overview : Highlights (temps, taux, honoraires,
                      prévu, état, facturation), Activity (temps saisis),
                      Temps (Notes), Appel d'honoraires (Tasks)

   Aucun calcul ni aucune fenêtre n'est réécrit : la carte de l'écran
   d'avant (components/espace/lorani/Honoraires.tsx) les fournit par sa
   prop `habit` et garde ses deux fenêtres (F22, F23). Les liens des
   alertes E12, E13 (« ?projet= ») arrivent ici.
   ══════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check } from "lucide-react";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import { Avis } from "@/components/espace/ui";
import { dateCourte } from "@/components/espace/format";
import { PHASES } from "@/components/espace/lorani/etats";
import CarteHonoraires, { ELEMENTS, type LigneHonoraire, type VueHonoraires } from "@/components/espace/lorani/Honoraires";
import type { Honoraire, Projet } from "@/components/espace/lorani/types";
import { RACINE } from "../modules";
import { useToast } from "../Toasts";
import { useLorani } from "./donnees";
import { LIBELLES_CALCUL, calculer, exporterCsv, useMarques, type Calcul } from "./lor-local";
import { BarreSelection, BoutonEtoile, useSelection } from "./lor-selection";
import "@/components/espace/espace.css";
import "./lor.css";
import "./lor-attio.css";

const CHEMIN = `${RACINE}/lorani/honoraires`;
const lienProjet = (id: string) => `${RACINE}/lorani/projets/${encodeURIComponent(id)}`;
const euros = (n: number) => `${n.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} €`;
const heures = (n: number) => `${n.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} h`;
const court = (h: Honoraire) => ELEMENTS.find((e) => e.cle === h.element)?.court ?? h.element.toUpperCase();
const jour = (iso: string | null) => (iso ? dateCourte(`${iso}T12:00:00`) : "");
const pluriel = (n: number, un: string, plusieurs = `${un}s`) => `${n} ${n > 1 ? plusieurs : un}`;
function depuis(iso: string): string {
  const j = Math.round((Date.now() - Date.parse(`${iso.slice(0, 10)}T12:00:00`)) / 86_400_000);
  if (j <= 0) return "aujourd'hui";
  if (j === 1) return "hier";
  if (j < 30) return `il y a ${j} jours`;
  if (j < 60) return "il y a environ 1 mois";
  if (j < 365) return `il y a ${Math.round(j / 30)} mois`;
  return "il y a plus d'un an";
}

/* le niveau d'un élément, à la manière de « Connection strength » : une pastille de couleur et son libellé */
type Niveau = { couleur: string; libelle: string };
function niveau(l: LigneHonoraire): Niveau {
  if (l.statut === "facturee") return { couleur: "#00D17E", libelle: "Facturé" };
  if (l.statut === "achevee") return { couleur: "#266DF0", libelle: "Achevé" };
  if (l.etat === "depasse") return { couleur: "#FF5454", libelle: "Dépassé" };
  if (l.etat === "a_surveiller") return { couleur: "#F97514", libelle: "À surveiller" };
  if (l.statut === "en_cours") return { couleur: "#266DF0", libelle: "En cours" };
  return { couleur: "#77797C", libelle: "À venir" };
}
const LIBELLES_ETAT: Record<Honoraire["statut"], string> = { a_venir: "À venir", en_cours: "En cours", achevee: "Achevé, appel à émettre", facturee: "Facturé" };
const suivant = (l: LigneHonoraire): "achevee" | "facturee" | null => (l.statut === "achevee" ? "facturee" : l.statut === "facturee" ? null : "achevee");
type AChanger = { ligne: LigneHonoraire; statut: "achevee" | "facturee" } | null;

/* ——— un menu qui se ferme au clic dehors et sur Échap ——— */
function useMenu() {
  const [ouvert, setOuvert] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ouvert) return;
    const dehors = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOuvert(false);
    };
    const echap = (e: KeyboardEvent) => e.key === "Escape" && setOuvert(false);
    document.addEventListener("mousedown", dehors);
    document.addEventListener("keydown", echap);
    return () => {
      document.removeEventListener("mousedown", dehors);
      document.removeEventListener("keydown", echap);
    };
  }, [ouvert]);
  return [ouvert, setOuvert, ref] as const;
}

/* ——— les icônes d'Attio (tracés de 16 recopiés de son interface, trait 1.25) ——— */
const Ic = {
  objet: (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <rect x="1.5" y="1.5" width="13" height="13" rx="3.5" fill="currentColor" />
      <path d="M5 8.2h6M8 5.2v6" stroke="var(--lor-at-fond)" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  chevron: (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="m5 6.5 3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  reglages: (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M2.5 4.5h3m3 0h5m-11 7h7m3 0h1M7 3v3m3.5 4v3" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  ),
  tri: (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M2.5 4.5h7m-7 3.5h5m-5 3.5h3M12 3.5v9m0 0-2-2m2 2 2-2" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  filtre: (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M2.5 4.5h11m-9 3.5h7m-5 3.5h3" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  ),
  plus: (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M8 3.5v9M3.5 8h9" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  ),
  personne: (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8" r="7" fill="currentColor" opacity="0.25" />
      <circle cx="8" cy="6.5" r="2.2" fill="currentColor" />
      <path d="M4.2 12.4a4.2 4.2 0 0 1 7.6 0" fill="currentColor" />
    </svg>
  ),
  horloge: (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8" r="5.75" fill="none" stroke="currentColor" strokeWidth="1.25" />
      <path d="M8 5v3.2l2 1.3" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  ),
  euro: (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M11.5 4.3a4.5 4.5 0 1 0 0 7.4M3 7h6.5M3 9h6" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  ),
  etat: (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8" r="5.75" fill="none" stroke="currentColor" strokeWidth="1.25" />
      <path d="m5.6 8.1 1.6 1.6 3.2-3.3" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  jauge: (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M2.5 11.5a5.5 5.5 0 1 1 11 0" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
      <path d="m8 11.5 2.5-3" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  ),
  calendrier: (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <rect x="2.5" y="3" width="11" height="10.5" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.25" />
      <path d="M2.5 6.5h11M5.5 1.8V4m5-2.2V4" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  ),
  dossier: (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M2.5 4.5a1.5 1.5 0 0 1 1.5-1.5h2.6l1.5 1.5H12a1.5 1.5 0 0 1 1.5 1.5v5.5A1.5 1.5 0 0 1 12 13H4a1.5 1.5 0 0 1-1.5-1.5z" fill="none" stroke="currentColor" strokeWidth="1.25" />
    </svg>
  ),
};

/* ——— la fiche d'un élément (le « record » d'Attio) ——— */
function Fiche({ v, l, projet, peutEcrire, nommer, demander }: { v: VueHonoraires; l: LigneHonoraire; projet: Projet; peutEcrire: boolean; nommer: (id: string | null | undefined) => string; demander: (l: LigneHonoraire) => void }) {
  const [onglet, setOnglet] = useState<"overview" | "temps">("overview");
  const temps = v.temps.filter((t) => t.honoraire_id === l.id);
  const n = niveau(l);
  const gris = !peutEcrire || v.envoi;
  const prochain = suivant(l);
  const valeurs: { cle: string; icone: React.ReactNode; libelle: string; valeur: React.ReactNode; vide?: boolean }[] = [
    { cle: "element", icone: Ic.objet, libelle: "Élément", valeur: `${court(l)} · ${v.libelle(l)}` },
    { cle: "projet", icone: Ic.dossier, libelle: "Projet", valeur: <Link href={lienProjet(projet.id)} className="lor-at-lien">{projet.nom}</Link> },
    { cle: "montant", icone: Ic.euro, libelle: "Honoraires HT", valeur: euros(l.montant_ht) },
    { cle: "prevues", icone: Ic.horloge, libelle: "Heures prévues", valeur: l.heures_prevues ? heures(l.heures_prevues) : "Non fixées", vide: !l.heures_prevues },
    { cle: "etat", icone: Ic.etat, libelle: "État", valeur: LIBELLES_ETAT[l.statut] },
  ];
  return (
    <div className="lor-at-fiche">
      <aside className="lor-at-gauche" aria-label="L'élément">
        <div className="lor-at-identite">
          <span className="lor-at-avatar-grand" aria-hidden="true">
            {court(l).slice(0, 3)}
          </span>
          <h2>{v.libelle(l)}</h2>
          <BoutonEtoile cle={`honoraire:${l.id}`} nom={v.libelle(l)} />
        </div>
        <div className="lor-at-actions">
          <button type="button" className="lor-at-bouton" disabled={gris || !v.peutSaisirTemps} onClick={v.ouvrirTemps}>
            {Ic.horloge}
            Saisir du temps
          </button>
          {prochain ? (
            <button type="button" className="lor-at-bouton" disabled={gris} onClick={() => demander(l)}>
              {Ic.etat}
              {prochain === "facturee" ? "Marquer facturé" : "Marquer achevé"}
            </button>
          ) : null}
          <Link href={lienProjet(projet.id)} className="lor-at-bouton">
            {Ic.dossier}
            Ouvrir le projet
          </Link>
        </div>
        <div className="lor-at-section">
          <h3 className="lor-at-petit-titre">Détails {Ic.chevron}</h3>
          <dl className="lor-at-details">
            {valeurs.map((x) => (
              <div key={x.cle} className="lor-at-detail">
                <dt>
                  {x.icone}
                  {x.libelle}
                </dt>
                <dd data-vide={x.vide ? "" : undefined}>{x.valeur}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="lor-at-section lor-at-section--filet">
          <h3 className="lor-at-petit-titre">Projet {Ic.chevron}</h3>
          <p className="lor-at-discret">Phase {PHASES[projet.phase]?.toLowerCase() ?? projet.phase} · {pluriel(v.lignes.length, "élément")} de mission</p>
        </div>
      </aside>
      <div className="lor-at-droite">
        <nav className="lor-at-onglets" aria-label="Vues de l'élément">
          <button type="button" className="lor-at-onglet" aria-pressed={onglet === "overview"} onClick={() => setOnglet("overview")}>
            {Ic.objet}
            Vue d&apos;ensemble
          </button>
          <button type="button" className="lor-at-onglet" aria-pressed={onglet === "temps"} onClick={() => setOnglet("temps")}>
            {Ic.horloge}
            Temps <span className="lor-at-compteur">{temps.length}</span>
          </button>
        </nav>
        {onglet === "overview" ? (
          <div className="lor-at-panneau">
            <h3 className="lor-at-titre-section">En bref</h3>
            <div className="lor-at-cartes">
              <div className="lor-at-carte">
                <span className="lor-at-carte-titre">Temps passé {Ic.horloge}</span>
                <span className="lor-at-carte-valeur">
                  <span className="lor-at-pastille" style={{ "--lor-at-pastille": n.couleur } as React.CSSProperties} />
                  {heures(l.passees)}
                  {l.heures_prevues ? ` sur ${heures(l.heures_prevues)}` : ""}
                </span>
              </div>
              <div className="lor-at-carte">
                <span className="lor-at-carte-titre">Consommation {Ic.jauge}</span>
                <span className="lor-at-carte-valeur" data-vide={l.conso === null ? "" : undefined}>
                  {l.conso === null ? "Pas d'heures prévues" : `${l.conso} %`}
                </span>
              </div>
              <div className="lor-at-carte">
                <span className="lor-at-carte-titre">Honoraires HT {Ic.euro}</span>
                <span className="lor-at-carte-valeur">{euros(l.montant_ht)}</span>
              </div>
              <div className="lor-at-carte">
                <span className="lor-at-carte-titre">Taux réalisé {Ic.euro}</span>
                <span className="lor-at-carte-valeur" data-vide={l.taux === null ? "" : undefined}>
                  {l.taux === null ? "Aucun temps saisi" : `${euros(l.taux)} / h`}
                </span>
              </div>
              <div className="lor-at-carte">
                <span className="lor-at-carte-titre">État {Ic.etat}</span>
                <span className="lor-at-carte-valeur">{LIBELLES_ETAT[l.statut]}</span>
              </div>
              <div className="lor-at-carte">
                <span className="lor-at-carte-titre">Facturation {Ic.calendrier}</span>
                <span className="lor-at-carte-valeur" data-vide={l.facturee_le || l.achevee_le ? undefined : ""}>
                  {l.facturee_le ? `Facturé le ${jour(l.facturee_le)}` : l.achevee_le ? `Achevé le ${jour(l.achevee_le)}` : "Pas encore achevé"}
                </span>
              </div>
            </div>

            <div className="lor-at-tete-section">
              <h3 className="lor-at-titre-section">Activité</h3>
              <button type="button" className="lor-at-voir" onClick={() => setOnglet("temps")}>
                Tout voir
              </button>
            </div>
            <ul className="lor-at-liste">
              {temps.slice(0, 3).map((t) => (
                <li key={t.id} className="lor-at-ligne">
                  <span className="lor-at-mini" aria-hidden="true">
                    {(nommer(t.membre)[0] ?? "?").toUpperCase()}
                  </span>
                  <span className="lor-at-ligne-texte">
                    {nommer(t.membre)} <span className="lor-at-discret">a saisi</span> {heures(t.heures)}
                  </span>
                  <span className="lor-at-quand">{depuis(t.jour)}</span>
                </li>
              ))}
              {!temps.length ? <li className="lor-at-ligne lor-at-discret">Aucun temps saisi sur cet élément.</li> : null}
            </ul>

            <div className="lor-at-tete-section">
              <h3 className="lor-at-titre-section">
                Temps <span className="lor-at-compteur">{temps.length}</span>
              </h3>
              <span className="lor-at-tete-droite">
                <button type="button" className="lor-at-voir" onClick={() => setOnglet("temps")}>
                  Tout voir
                </button>
                <button type="button" className="lor-at-rond" aria-label="Saisir du temps" title="Saisir du temps" disabled={gris || !v.peutSaisirTemps} onClick={v.ouvrirTemps}>
                  {Ic.plus}
                </button>
              </span>
            </div>
            <ul className="lor-at-liste">
              {temps.slice(0, 3).map((t) => (
                <li key={t.id} className="lor-at-ligne">
                  <span className="lor-at-mini" aria-hidden="true">
                    {(nommer(t.membre)[0] ?? "?").toUpperCase()}
                  </span>
                  <span className="lor-at-ligne-texte">
                    {heures(t.heures)} le {jour(t.jour)} <span className="lor-at-discret">{t.note ?? "sans note"}</span>
                  </span>
                  <span className="lor-at-quand">{depuis(t.jour)}</span>
                </li>
              ))}
              {!temps.length ? <li className="lor-at-ligne lor-at-discret">Le temps passé se compare aux heures prévues : prévenu à 80 % et à 100 %.</li> : null}
            </ul>

            <div className="lor-at-tete-section">
              <h3 className="lor-at-titre-section">
                Appel d&apos;honoraires <span className="lor-at-compteur">{l.statut === "achevee" ? 1 : 0}</span>
              </h3>
            </div>
            <ul className="lor-at-liste">
              {l.statut === "achevee" ? (
                <li className="lor-at-ligne">
                  <button type="button" className="lor-at-coche" aria-label="Marquer facturé" title="Marquer facturé" disabled={gris} onClick={() => demander(l)} />
                  <span className="lor-at-ligne-texte">Émettre l&apos;appel d&apos;honoraires de {euros(l.montant_ht)} HT</span>
                  <span className="lor-at-echeance">
                    {Ic.calendrier}
                    {l.achevee_le ? `Depuis le ${jour(l.achevee_le)}` : "Aujourd'hui"}
                  </span>
                </li>
              ) : (
                <li className="lor-at-ligne lor-at-discret">{l.statut === "facturee" ? `Facturé le ${jour(l.facturee_le)}.` : "L'appel d'honoraires est à émettre quand l'élément est achevé."}</li>
              )}
            </ul>
          </div>
        ) : (
          <div className="lor-at-panneau">
            <div className="lor-at-tete-section">
              <h3 className="lor-at-titre-section">
                Temps saisis <span className="lor-at-compteur">{temps.length}</span>
              </h3>
              <button type="button" className="lor-at-rond" aria-label="Saisir du temps" title="Saisir du temps" disabled={gris || !v.peutSaisirTemps} onClick={v.ouvrirTemps}>
                {Ic.plus}
              </button>
            </div>
            <ul className="lor-at-liste">
              {temps.map((t) => (
                <li key={t.id} className="lor-at-ligne">
                  <span className="lor-at-mini" aria-hidden="true">
                    {(nommer(t.membre)[0] ?? "?").toUpperCase()}
                  </span>
                  <span className="lor-at-ligne-texte">
                    {nommer(t.membre)} · {heures(t.heures)} <span className="lor-at-discret">{t.note ?? ""}</span>
                  </span>
                  <span className="lor-at-quand">{jour(t.jour)}</span>
                </li>
              ))}
              {!temps.length ? <li className="lor-at-ligne lor-at-discret">Aucun temps saisi.</li> : null}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

/* ——— la page : la grille People d'Attio, ou la fiche d'un élément ——— */
function Vue({ v, projet, projets, totalDe, peutEcrire, nommer }: { v: VueHonoraires; projet: Projet; projets: Projet[]; totalDe: Record<string, number>; peutEcrire: boolean; nommer: (id: string | null | undefined) => string }) {
  const toast = useToast();
  const params = useSearchParams();
  const chemin = usePathname();
  const [ouvertVue, setOuvertVue, vueRef] = useMenu();
  const [ouvertReglages, setOuvertReglages, reglagesRef] = useMenu();
  const [ouvertAjout, setOuvertAjout, ajoutRef] = useMenu();
  const [ouvertFiltre, setOuvertFiltre, filtreRef] = useMenu();
  const [voirTaux, setVoirTaux] = useState(true);
  /* 02/11 : cases (sélection), étoile (épinglés en tête), « Add calculation » par colonne — ./lor-local.ts */
  const selection = useSelection();
  const favoris = useMarques("favoris");
  const [calculs, setCalculs] = useState<Record<string, Calcul>>({ temps: "somme", montant: "somme", taux: "moyenne" });
  const SUITE: Calcul[] = ["somme", "moyenne", "decompte", "aucun"];
  const changerCalcul = (c: string) => setCalculs((x) => ({ ...x, [c]: SUITE[(SUITE.indexOf(x[c] ?? "aucun") + 1) % SUITE.length] }));
  const [filtre, setFiltre] = useState<Honoraire["statut"] | null>(null);
  const [aChanger, setAChanger] = useState<AChanger>(null);
  const [echec, setEchec] = useState(false);
  const gris = !peutEcrire || v.envoi;

  const lien = (q: Record<string, string | null>) => {
    const p = new URLSearchParams(params.toString());
    for (const [k, x] of Object.entries(q)) {
      if (x === null) p.delete(k);
      else p.set(k, x);
    }
    const s = p.toString();
    return s ? `${chemin}?${s}` : chemin;
  };
  const choisie = v.lignes.find((l) => l.id === params.get("element")) ?? null;
  const lignes = v.lignes.filter((l) => !filtre || l.statut === filtre).sort((a, b) => Number(favoris.a(`honoraire:${b.id}`)) - Number(favoris.a(`honoraire:${a.id}`)));
  const exporter = (choisies: LigneHonoraire[]) =>
    exporterCsv(
      `honoraires-${projet.nom}`,
      ["Élément", "Intitulé", "Honoraires HT", "Heures prévues", "Heures passées", "Consommation %", "État", "Achevé le", "Facturé le", "Taux réalisé €/h"],
      choisies.map((l) => [court(l), v.libelle(l), l.montant_ht, l.heures_prevues, l.passees, l.conso ?? "", LIBELLES_ETAT[l.statut], l.achevee_le ?? "", l.facturee_le ?? "", l.taux === null ? "" : Math.round(l.taux)]),
    );
  /* la valeur d'un calcul de pied, sur les lignes affichées */
  const pied = (c: string, valeurs: (number | null)[], format: (n: number) => string) => {
    const k = calculs[c] ?? "aucun";
    const r = calculer(k, valeurs);
    return (
      <button type="button" className="lor-at-calcul" onClick={() => changerCalcul(c)} title={`${LIBELLES_CALCUL[k]} sur les lignes affichées · cliquer pour changer (somme, moyenne, décompte)`}>
        {k === "aucun" ? (
          <span className="lor-at-discret">+ Calcul</span>
        ) : (
          <>
            <span className="lor-at-discret">{LIBELLES_CALCUL[k].toLowerCase()}</span> {r === null ? "—" : k === "decompte" ? r : format(r)}
          </>
        )}
      </button>
    );
  };

  const demander = (ligne: LigneHonoraire) => {
    const statut = suivant(ligne);
    if (!statut) return;
    setEchec(false);
    setAChanger({ ligne, statut });
  };
  const confirmer = async () => {
    if (!aChanger) return;
    const ok = await v.changerStatut(aChanger.ligne, aChanger.statut);
    if (ok) {
      toast(aChanger.statut === "facturee" ? `« ${v.libelle(aChanger.ligne)} » est facturé.` : `« ${v.libelle(aChanger.ligne)} » est achevé : l'appel d'honoraires est à émettre.`, "vert");
      setAChanger(null);
    } else {
      setEchec(true);
    }
  };

  return (
    <>
      <header className="lor-at-entete">
        <div className="lor-at-fil">
          <span className="lor-at-objet">{Ic.objet}</span>
          <Link href={lien({ element: null })} className="lor-at-fil-lien">
            Honoraires
          </Link>
          {choisie ? (
            <>
              <span className="lor-at-fil-sep">/</span>
              <span className="lor-at-fil-courant">{v.libelle(choisie)}</span>
            </>
          ) : null}
        </div>
        <div className="lor-at-entete-droite">
          <Link href={lienProjet(projet.id)} className="lor-at-bouton">
            {Ic.dossier}
            {projet.nom}
          </Link>
        </div>
      </header>

      {choisie ? (
        <Fiche v={v} l={choisie} projet={projet} peutEcrire={peutEcrire} nommer={nommer} demander={demander} />
      ) : (
        <>
          <div className="lor-at-barre-vue">
            <div className="lor-at-groupe">
              <div className="lor-at-ancre" ref={vueRef}>
                <button type="button" className="lor-at-bouton" aria-expanded={ouvertVue} aria-haspopup="menu" onClick={() => setOuvertVue((o) => !o)}>
                  <span className="lor-at-vue-icone" aria-hidden="true" />
                  {projet.nom}
                  {Ic.chevron}
                </button>
                {ouvertVue ? (
                  <div className="lor-at-menu" role="menu" style={{ left: 0, top: 32 }}>
                    {projets.map((p) => (
                      <Link key={p.id} role="menuitem" href={`${CHEMIN}?projet=${encodeURIComponent(p.id)}`} scroll={false} className="lor-at-option" aria-current={p.id === projet.id ? "true" : undefined} onClick={() => setOuvertVue(false)}>
                        <span className="lor-at-option-texte">{p.nom}</span>
                        <span className="lor-at-discret">{totalDe[p.id] !== undefined ? euros(totalDe[p.id]) : "—"}</span>
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
              <div className="lor-at-ancre" ref={reglagesRef}>
                <button type="button" className="lor-at-bouton" aria-expanded={ouvertReglages} onClick={() => setOuvertReglages((o) => !o)}>
                  {Ic.reglages}
                  Affichage
                  {Ic.chevron}
                </button>
                {ouvertReglages ? (
                  <div className="lor-at-menu" role="dialog" aria-label="Affichage" style={{ left: 0, top: 32 }}>
                    <label className="lor-at-option">
                      <input type="checkbox" checked={voirTaux} onChange={(e) => setVoirTaux(e.target.checked)} />
                      <span className="lor-at-option-texte">Colonne « Taux réalisé »</span>
                    </label>
                  </div>
                ) : null}
              </div>
            </div>
            <div className="lor-at-groupe">
              <div className="lor-at-ancre" ref={ajoutRef}>
                <button type="button" className="lor-at-bouton" aria-expanded={ouvertAjout} onClick={() => setOuvertAjout((o) => !o)}>
                  {Ic.plus}
                  Ajouter / Exporter
                  {Ic.chevron}
                </button>
                {ouvertAjout ? (
                  <div className="lor-at-menu" role="menu" style={{ right: 0, top: 32 }}>
                    <button
                      type="button"
                      role="menuitem"
                      className="lor-at-option"
                      disabled={gris}
                      onClick={() => {
                        setOuvertAjout(false);
                        v.ouvrirElement();
                      }}
                    >
                      <span className="lor-at-option-texte">Ajouter un élément de mission…</span>
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      className="lor-at-option"
                      onClick={() => {
                        setOuvertAjout(false);
                        exporter(lignes);
                      }}
                    >
                      <span className="lor-at-option-texte">Exporter la liste affichée (CSV)</span>
                    </button>
                  </div>
                ) : null}
              </div>
              <button type="button" className="lor-at-bouton lor-at-bouton--bleu" disabled={gris || !v.peutSaisirTemps} onClick={v.ouvrirTemps} title={v.peutSaisirTemps ? "Saisir du temps" : "Ajoutez d'abord un élément de mission"}>
                {Ic.plus}
                Saisir du temps
              </button>
            </div>
          </div>
          <div className="lor-at-barre-tri">
            <span className="lor-at-tri">
              {Ic.tri}
              <span className="lor-at-discret-fort">Trié par</span> phase
            </span>
            <div className="lor-at-ancre" ref={filtreRef}>
              <button type="button" className="lor-at-filtre" data-actif={filtre ? "" : undefined} aria-expanded={ouvertFiltre} onClick={() => setOuvertFiltre((o) => !o)}>
                {Ic.filtre}
                {filtre ? LIBELLES_ETAT[filtre] : "Filtrer"}
              </button>
              {ouvertFiltre ? (
                <div className="lor-at-menu" role="menu" style={{ left: 0, top: 32 }}>
                  {([null, "a_venir", "en_cours", "achevee", "facturee"] as (Honoraire["statut"] | null)[]).map((s) => (
                    <button
                      key={s ?? "tous"}
                      type="button"
                      role="menuitemradio"
                      aria-checked={filtre === s}
                      className="lor-at-option"
                      onClick={() => {
                        setFiltre(s);
                        setOuvertFiltre(false);
                      }}
                    >
                      <span className="lor-at-option-texte">{s ? LIBELLES_ETAT[s] : "Tous les éléments"}</span>
                      <span className="lor-at-discret">{s ? v.lignes.filter((l) => l.statut === s).length : v.lignes.length}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            {v.alerte.length ? (
              <span className="lor-at-avis" role="status">
                {v.alerte.map((l) => `${court(l)} : ${l.etat === "depasse" ? "heures prévues dépassées" : "80 % des heures prévues"}`).join(" · ")}
              </span>
            ) : null}
          </div>


          <div className="lor-at-grille" role="table" aria-label={`Honoraires de ${projet.nom}`} data-taux={voirTaux ? "" : undefined}>
            <div className="lor-at-rang lor-at-rang--tete" role="row">
              <span className="lor-at-cell lor-at-c1" role="columnheader">
                <button
                  type="button"
                  className="lor-at-case"
                  role="checkbox"
                  aria-checked={!!lignes.length && selection.cles.length === lignes.length}
                  aria-label="Tout sélectionner"
                  onClick={() => (selection.cles.length === lignes.length ? selection.vider() : selection.tout(lignes.map((l) => l.id)))}
                />
                Élément
                <button type="button" className="lor-at-plus-col" aria-label="Ajouter un élément de mission" title="Ajouter un élément de mission" disabled={gris} onClick={v.ouvrirElement}>
                  {Ic.plus}
                </button>
              </span>
              <span className="lor-at-cell" role="columnheader">
                {Ic.horloge}
                Temps passé
              </span>
              <span className="lor-at-cell" role="columnheader">
                {Ic.euro}
                Honoraires HT
              </span>
              <span className="lor-at-cell" role="columnheader">
                {Ic.etat}
                État
              </span>
              {voirTaux ? (
                <span className="lor-at-cell" role="columnheader">
                  {Ic.jauge}
                  Taux réalisé
                </span>
              ) : (
                <button type="button" className="lor-at-cell lor-at-ajout-col" role="columnheader" onClick={() => setVoirTaux(true)} title="Ajouter la colonne « Taux réalisé »">
                  {Ic.plus}
                  Ajouter une colonne
                </button>
              )}
            </div>
            {lignes.map((l) => {
              const n = niveau(l);
              return (
                <div key={l.id} className="lor-at-rang" role="row">
                  <span className="lor-at-cell lor-at-c1" role="cell">
                    <button type="button" className="lor-at-case" role="checkbox" aria-checked={selection.a(l.id)} aria-label={`Sélectionner ${v.libelle(l)}`} onClick={() => selection.basculer(l.id)} />
                    <Link href={lien({ element: l.id })} scroll={false} className="lor-at-pilule">
                      <span className="lor-at-mini" aria-hidden="true">
                        {court(l)[0]}
                      </span>
                      <span className="lor-at-pilule-texte">
                        {court(l)} · {v.libelle(l)}
                      </span>
                      {favoris.a(`honoraire:${l.id}`) ? <span className="lor-marque">épinglé</span> : null}
                    </Link>
                  </span>
                  <span className="lor-at-cell" role="cell" title={l.conso !== null ? `${l.conso} % des heures prévues` : undefined}>
                    <span className="lor-at-pastille" style={{ "--lor-at-pastille": n.couleur } as React.CSSProperties} aria-hidden="true" />
                    <span className="lor-at-cell-texte">
                      {heures(l.passees)}
                      {l.heures_prevues ? ` sur ${heures(l.heures_prevues)}` : ""}
                    </span>
                  </span>
                  <span className="lor-at-cell" role="cell">
                    {euros(l.montant_ht)}
                  </span>
                  <span className="lor-at-cell" role="cell" data-vide={l.statut === "a_venir" ? "" : undefined}>
                    {l.statut === "facturee" ? `Facturé le ${jour(l.facturee_le)}` : l.statut === "achevee" ? `Achevé le ${jour(l.achevee_le)}, appel à émettre` : LIBELLES_ETAT[l.statut]}
                  </span>
                  {voirTaux ? (
                    <span className="lor-at-cell" role="cell" data-vide={l.taux === null ? "" : undefined}>
                      {l.taux === null ? "Aucun temps" : `${euros(l.taux)} / h`}
                    </span>
                  ) : null}
                </div>
              );
            })}
            {!lignes.length ? (
              <div className="lor-at-rang" role="row">
                <span className="lor-at-cell lor-at-c1 lor-at-discret" role="cell">
                  {v.lignes.length ? "Aucun élément dans cet état." : "Aucun élément de mission : ajoutez-en un."}
                </span>
              </div>
            ) : null}
            <div className="lor-at-rang lor-at-rang--pied" role="row">
              <span className="lor-at-cell lor-at-c1 lor-at-pied" role="cell">
                {lignes.length} <span className="lor-at-discret">éléments</span>
              </span>
              <span className="lor-at-cell lor-at-pied" role="cell">
                {pied("temps", lignes.map((l) => l.passees), heures)}
              </span>
              <span className="lor-at-cell lor-at-pied" role="cell">
                {pied("montant", lignes.map((l) => l.montant_ht), euros)}
              </span>
              <span className="lor-at-cell lor-at-pied" role="cell">
                {euros(lignes.filter((l) => l.statut === "facturee").reduce((t, l) => t + l.montant_ht, 0))} <span className="lor-at-discret">facturés</span>
              </span>
              {voirTaux ? (
                <span className="lor-at-cell lor-at-pied" role="cell">
                  {pied("taux", lignes.map((l) => l.taux), (n) => `${euros(n)} / h`)}
                </span>
              ) : null}
            </div>
          </div>
        </>
      )}

      {/* la barre prend les jetons de ./lor.css (menus de Linear) : un conteneur sans boîte (display: contents) */}
      <div className="lor lor-contenu">
        <BarreSelection
          nombre={selection.cles.length}
          vider={selection.vider}
          actions={[
            { cle: "epingler", libelle: "Épingler", faire: () => favoris.poser(selection.cles.map((id) => `honoraire:${id}`), true) },
            { cle: "csv", libelle: "Exporter en CSV", faire: () => exporter(v.lignes.filter((l) => selection.a(l.id))) },
            ...(peutEcrire
              ? [
                  {
                    cle: "achever",
                    libelle: "Marquer achevé",
                    confirmer: { titre: "Marquer achevés les éléments sélectionnés ?", texte: "Chaque élément en cours ou à venir passe à « achevé » ce jour : le chef de projet est prévenu qu'un appel d'honoraires est à émettre. Les éléments déjà achevés ou facturés ne changent pas.", bouton: "Marquer achevé" },
                    faire: async () => {
                      const cibles = v.lignes.filter((l) => selection.a(l.id) && (l.statut === "a_venir" || l.statut === "en_cours"));
                      let ok = 0;
                      for (const l of cibles) if (await v.changerStatut(l, "achevee")) ok++;
                      toast(`${ok} élément${ok > 1 ? "s" : ""} achevé${ok > 1 ? "s" : ""} sur ${cibles.length}.`, ok === cibles.length ? "vert" : "rouge");
                      selection.vider();
                    },
                  },
                ]
              : []),
          ]}
        />
      </div>

      {/* Achevé / Facturé (G44, G45) : une fenêtre de confirmation avant d'écrire */}
      <Dialog open={!!aChanger} onOpenChange={(o) => !o && !v.envoi && setAChanger(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone>
              <Check width={18} height={18} aria-hidden="true" />
            </DialogIcone>
            <DialogTitle>{aChanger ? `${aChanger.statut === "facturee" ? "Marquer facturé" : "Marquer achevé"} : ${v.libelle(aChanger.ligne)}` : ""}</DialogTitle>
            <DialogDescription>
              {aChanger?.statut === "facturee"
                ? `L'élément passe à « facturé » ce jour, pour ${euros(aChanger.ligne.montant_ht)} HT. Il ne revient pas en arrière depuis cette page.`
                : aChanger
                  ? `L'élément passe à « achevé » ce jour : le chef de projet est prévenu qu'un appel d'honoraires de ${euros(aChanger.ligne.montant_ht)} HT est à émettre.`
                  : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            {aChanger ? (
              <p className="esp-kpi-sous">
                {heures(aChanger.ligne.passees)} passées sur {heures(aChanger.ligne.heures_prevues)} prévues{aChanger.ligne.conso !== null ? ` (${aChanger.ligne.conso} %)` : ""}.
              </p>
            ) : null}
            {echec && v.erreur ? (
              <Avis teinte="rouge" role="alert">
                {v.erreur}
              </Avis>
            ) : null}
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={gris} onClick={confirmer}>
              {v.envoi ? <Loader variant="spin" /> : null} {aChanger?.statut === "facturee" ? "Marquer facturé" : "Marquer achevé"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function HonorairesTemps() {
  const { source, pret, erreur, dossier, peutEcrire, agir, nommer } = useLorani();
  const params = useSearchParams();
  const chargement = source === "reelle" && !pret;

  const projets = useMemo(() => [...dossier.projets].sort((a, b) => Number(b.actif) - Number(a.actif) || a.nom.localeCompare(b.nom, "fr")), [dossier.projets]);
  const totalDe = useMemo(() => {
    const m: Record<string, number> = {};
    for (const h of dossier.honoraires) m[h.projet_id] = (m[h.projet_id] ?? 0) + h.montant_ht;
    return m;
  }, [dossier.honoraires]);
  const demande = params.get("projet");
  const projet = projets.find((p) => p.id === demande) ?? projets.find((p) => totalDe[p.id] !== undefined) ?? projets[0] ?? null;

  return (
    <div className="lor-at">
      <h1 className="v2-sr">Honoraires et temps</h1>
      {chargement ? (
        <p className="lor-at-message">Lecture du dossier…</p>
      ) : erreur ? (
        <p className="lor-at-message" role="alert">
          Le dossier n&apos;a pas pu être lu : {erreur}
        </p>
      ) : projet ? (
        <CarteHonoraires key={projet.id} projet={projet} dossier={dossier} nommer={nommer} peutEcrire={peutEcrire} agir={agir} habit={(v) => <Vue v={v} projet={projet} projets={projets} totalDe={totalDe} peutEcrire={peutEcrire} nommer={nommer} />} />
      ) : (
        <p className="lor-at-message">Aucun projet : ouvrez-en un depuis la vue d&apos;ensemble pour poser ses honoraires.</p>
      )}
    </div>
  );
}
