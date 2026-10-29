"use client";

/* ══════════════════════════════════════════════════════════════════════
   LORANI « Honoraires et temps », sur Settings › Billing de Linear
   (29/10/2026)

   Les honoraires d'un projet, phase par phase, et le temps passé dessus
   (bloc B27 de l'inventaire docs/refonte-metiers/lorani.md, fenêtres F22
   et F23, gestes G42 à G45). Le projet est dans l'adresse (?projet=) et se
   change en tête ; sans projet nommé, le premier qui a des honoraires.

     · « Mission » (la carte du plan) : les honoraires HT, le nombre
       d'éléments, la phase, ce qui est facturé ; « Ajouter un élément »
       (F22, poserHonoraire) ;
     · « Phases » (la mise à niveau et sa grille cochée) : un élément par
       case, coché plein quand il est facturé, coché ambre quand il est
       achevé et que l'appel d'honoraires reste à émettre ; une case ouvre
       l'étape suivante (Achevé, puis Facturé : changerHonoraire), après
       une fenêtre de confirmation qu'elle n'avait pas sur /espace (O11) ;
     · « Temps passé » (l'usage, au chevron) : heures saisies contre
       heures prévues, avis à 80 % et au-delà, jauge par élément, derniers
       temps saisis ; « Saisir des temps » (F23, saisirTemps) ;
     · « Factures et situations d'honoraires » (Recent invoices) : les
       éléments achevés (appel à émettre) et facturés.
   Aucun calcul ni aucune fenêtre n'est réécrit : la carte de l'écran
   d'avant (components/espace/lorani/Honoraires.tsx) les fournit par sa
   prop `habit`, et garde ses deux fenêtres.
   Gabarit : ../lin/lin.css ; mesures propres : ../lin/linear-billing.css.
   ══════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { ArrowUpRight, Check, ChevronDown, ChevronRight } from "lucide-react";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import { Avis } from "@/components/espace/ui";
import { dateCourte } from "@/components/espace/format";
import { PHASES } from "@/components/espace/lorani/etats";
import CarteHonoraires, { ELEMENTS, type LigneHonoraire, type VueHonoraires } from "@/components/espace/lorani/Honoraires";
import type { Honoraire, Projet } from "@/components/espace/lorani/types";
import { Menu } from "../lin/Lin";
import { RACINE } from "../modules";
import { useToast } from "../Toasts";
import { useLorani } from "./donnees";
import "@/components/espace/espace.css";
import "../lin/lin.css";
import "../lin/linear-billing.css";

const CHEMIN = `${RACINE}/lorani/honoraires`;
const lienProjet = (id: string) => `${RACINE}/lorani/projets/${encodeURIComponent(id)}?partie=projet`;
const euros = (n: number) => `${n.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} €`;
const heures = (n: number) => `${n.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} h`;
const court = (h: Honoraire) => ELEMENTS.find((e) => e.cle === h.element)?.court ?? h.element.toUpperCase();
const jour = (iso: string | null) => (iso ? dateCourte(`${iso}T12:00:00`) : "");
const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? "s" : ""}`;

/* la coche de 12 de la grille : pleine (facturé), cochée (achevé), à moitié (en cours), vide (à venir) */
function Coche({ l }: { l: LigneHonoraire }) {
  const etat = l.statut === "facturee" || l.statut === "achevee" ? l.statut : l.etat === "depasse" ? "depasse" : l.statut;
  return (
    <svg className="lbi-coche" data-etat={etat} viewBox="0 0 12 12" aria-hidden="true">
      {l.statut === "facturee" ? (
        <>
          <circle cx="6" cy="6" r="6" fill="currentColor" />
          <path d="m3.4 6.2 1.8 1.8 3.4-3.6" fill="none" stroke="var(--lin-detail)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </>
      ) : l.statut === "achevee" ? (
        <path d="m2.2 6.4 2.4 2.4 5.2-5.4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      ) : l.statut === "en_cours" ? (
        <>
          <circle cx="6" cy="6" r="5.25" fill="none" stroke="currentColor" strokeWidth="1.3" />
          <path d="M6 3a3 3 0 0 1 0 6z" fill="currentColor" />
        </>
      ) : (
        <circle cx="6" cy="6" r="5.25" fill="none" stroke="currentColor" strokeWidth="1.3" />
      )}
    </svg>
  );
}

const LIBELLES_ETAT: Record<Honoraire["statut"], string> = { a_venir: "à venir", en_cours: "en cours", achevee: "achevé, appel d'honoraires à émettre", facturee: "facturé" };
/* l'étape suivante d'un élément : achevé, puis facturé */
const suivant = (l: LigneHonoraire): "achevee" | "facturee" | null => (l.statut === "achevee" ? "facturee" : l.statut === "facturee" ? null : "achevee");

type AChanger = { ligne: LigneHonoraire; statut: "achevee" | "facturee" } | null;

/* les quatre cartes de Billing, dessinées avec ce que la carte de l'écran d'avant calcule */
function Cartes({ v, projet, peutEcrire, nommer }: { v: VueHonoraires; projet: Projet; peutEcrire: boolean; nommer: (id: string | null | undefined) => string }) {
  const toast = useToast();
  const [deplie, setDeplie] = useState(false);
  const [aChanger, setAChanger] = useState<AChanger>(null);
  const [echec, setEchec] = useState(false);
  const gris = !peutEcrire || v.envoi;

  const factures = v.lignes.filter((l) => l.statut === "achevee" || l.statut === "facturee").sort((a, b) => (b.facturee_le ?? b.achevee_le ?? "").localeCompare(a.facturee_le ?? a.achevee_le ?? ""));
  const nFacturees = v.lignes.filter((l) => l.statut === "facturee").length;
  const prochaine = v.lignes.find((l) => l.statut === "achevee") ?? v.lignes.find((l) => l.statut === "en_cours") ?? null;
  const conso = v.prevues > 0 ? Math.round((100 * v.passees) / v.prevues) : null;
  const depassees = v.alerte.filter((l) => l.etat === "depasse").length;
  const aSurveiller = v.alerte.length - depassees;

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
      <fieldset className="lbi-groupe">
        <legend className="v2-sr">Mission</legend>

        {/* 1. Mission : la carte du plan */}
        <section className="lbi-carte lbi-carte--plan" aria-label="Mission">
          <div className="lbi-plan">
            <div className="lbi-pile">
              <span className="lbi-plan-titre">{v.lignes.length ? `${euros(v.total)} HT d'honoraires` : "Aucun élément de mission"}</span>
              <span className="lbi-sous">
                {pluriel(v.lignes.length, "élément")} de mission · phase {PHASES[projet.phase] ?? projet.phase} · {euros(v.facture)} facturés
              </span>
            </div>
            <button type="button" className="lbi-btn" disabled={gris} onClick={v.ouvrirElement}>
              Ajouter un élément
            </button>
          </div>
        </section>

        {/* 2. Phases : la rangée haute et la grille cochée */}
        <section className="lbi-carte" aria-label="Phases de la mission">
          <div className="lbi-rangee">
            <div className="lbi-pile">
              <span className="lbi-libelle">Phases de la mission</span>
              <span className="lbi-sous">
                {nFacturees} facturée{nFacturees > 1 ? "s" : ""} sur {v.lignes.length} · {euros(v.facture)} sur {euros(v.total)} HT
              </span>
            </div>
            <div className="lbi-boutons">
              <Link className="lbi-btn lbi-btn--32" href={lienProjet(projet.id)}>
                Voir le projet
              </Link>
              {prochaine ? (
                <button type="button" className="lbi-btn lbi-btn--32 lbi-btn--primaire" disabled={gris} onClick={() => demander(prochaine)}>
                  {prochaine.statut === "achevee" ? `Facturer ${court(prochaine)}` : `Achever ${court(prochaine)}`}
                </button>
              ) : null}
            </div>
          </div>
          {v.lignes.length ? (
            <ul className="lbi-grille">
              {v.lignes.map((l) => {
                const texte = `${court(l)} · ${v.libelle(l)}`;
                const titre = `${v.libelle(l)} : ${euros(l.montant_ht)} HT, ${LIBELLES_ETAT[l.statut]}`;
                return (
                  <li key={l.id}>
                    {suivant(l) && peutEcrire ? (
                      <button type="button" className="lbi-phase" title={`${titre}. ${suivant(l) === "facturee" ? "Marquer facturé" : "Marquer achevé"}`} disabled={v.envoi} onClick={() => demander(l)}>
                        <Coche l={l} />
                        <span>{texte}</span>
                      </button>
                    ) : (
                      <span className="lbi-phase" title={titre} data-fait={l.statut === "facturee" ? "" : undefined}>
                        <Coche l={l} />
                        <span>{texte}</span>
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="lbi-rien">Posez les honoraires de chaque phase (esquisse, APS, APD…) pour suivre le temps passé.</p>
          )}
        </section>

        {/* 3. Temps passé : l'usage, qui se déplie */}
        <section className="lbi-carte" aria-label="Temps passé">
          <div className="lbi-usage-ligne">
            <button type="button" className="lbi-usage" aria-expanded={deplie} aria-controls="lbi-temps-detail" onClick={() => setDeplie((x) => !x)}>
              <span className="lbi-pile">
                <span className="lbi-libelle">Temps passé</span>
                <span className="lbi-sous">
                  {heures(v.passees)} sur {heures(v.prevues)} prévues{conso !== null ? ` · ${conso} %` : ""}
                  {depassees ? (
                    <span data-teinte="rouge"> · {pluriel(depassees, "élément")} dépassé{depassees > 1 ? "s" : ""}</span>
                  ) : null}
                  {aSurveiller ? (
                    <span data-teinte="jaune"> · {pluriel(aSurveiller, "élément")} à surveiller</span>
                  ) : null}
                </span>
              </span>
              <ChevronRight className="lbi-chevron" aria-hidden="true" />
            </button>
            <button type="button" className="lbi-btn" disabled={!v.peutSaisirTemps || v.envoi} onClick={v.ouvrirTemps}>
              Saisir des temps
            </button>
          </div>
          {deplie ? (
            <div className="lbi-detail" id="lbi-temps-detail">
              {v.alerte.map((l) => (
                <p key={l.id} className="lbi-avis" data-teinte={l.etat === "depasse" ? "rouge" : "jaune"}>
                  {v.libelle(l)} : {heures(l.passees)} pour {heures(l.heures_prevues)} prévues ({l.conso} %){l.etat === "depasse" ? ", les honoraires de la phase sont dépassés" : ", avant la fin de la phase"}
                  {l.taux ? ` ; taux réalisé ${euros(Math.round(l.taux))} HT de l'heure` : ""}.
                </p>
              ))}
              {v.lignes.length ? (
                <ul className="lbi-jauges" aria-label="Temps passé par élément">
                  {v.lignes.map((l) => (
                    <li key={l.id}>
                      <span>
                        {court(l)} · {v.libelle(l)}
                      </span>
                      <span className="lbi-jauge" data-etat={l.etat === "a_surveiller" && (l.statut === "achevee" || l.statut === "facturee") ? "ok" : l.etat} role="img" aria-label={l.conso === null ? "sans heures prévues" : `${l.conso} % des heures prévues`}>
                        <span style={{ width: `${Math.min(100, l.conso ?? 0)}%` }} />
                      </span>
                      <span>
                        {heures(l.passees)} / {heures(l.heures_prevues)}
                        {l.taux ? ` · ${euros(Math.round(l.taux))} / h` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="lbi-avis">Aucun élément : le temps se saisit sur un élément de mission.</p>
              )}
              {v.temps.length ? (
                <>
                  <p className="lbi-sous-titre">Derniers temps saisis ({v.temps.length})</p>
                  <ul className="lbi-temps">
                    {v.temps.slice(0, 12).map((t) => {
                      const e = v.lignes.find((l) => l.id === t.honoraire_id);
                      return (
                        <li key={t.id}>
                          <span>
                            {heures(t.heures)} · {e ? v.libelle(e) : "élément"} · {nommer(t.membre)}
                            {t.note ? ` · ${t.note}` : ""}
                          </span>
                          <span>{jour(t.jour)}</span>
                        </li>
                      );
                    })}
                  </ul>
                </>
              ) : null}
            </div>
          ) : null}
        </section>
      </fieldset>

      {/* 4. Factures et situations d'honoraires : Recent invoices */}
      <fieldset className="lbi-groupe">
        <legend className="v2-sr">Factures et situations d&apos;honoraires</legend>
        <h3 className="lbi-h3">Factures et situations d&apos;honoraires</h3>
        <section className="lbi-carte" aria-label="Factures et situations d'honoraires">
          {factures.length ? (
            <ul className="lbi-factures">
              {factures.map((l) => (
                <li key={l.id} className="lbi-facture">
                  <span className="lbi-pile">
                    <span className="lbi-libelle">
                      {court(l)} · {v.libelle(l)}
                    </span>
                    <span className="lbi-sous">
                      {l.statut === "facturee" ? (
                        `Facturé${l.facturee_le ? ` le ${jour(l.facturee_le)}` : ""}`
                      ) : (
                        <span data-teinte="jaune">Achevé{l.achevee_le ? ` le ${jour(l.achevee_le)}` : ""} · appel d&apos;honoraires à émettre</span>
                      )}
                    </span>
                  </span>
                  <span className="lbi-facture-montant">{euros(l.montant_ht)} HT</span>
                  {l.statut === "achevee" ? (
                    <button type="button" className="lbi-btn" disabled={gris} onClick={() => demander(l)}>
                      Marquer facturé
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="lbi-rien">Aucun élément achevé ni facturé pour l&apos;instant.</p>
          )}
        </section>
      </fieldset>

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
  const lien = (id: string) => `${CHEMIN}?projet=${encodeURIComponent(id)}`;

  return (
    <div className="lin lbi">
      <h1 className="v2-sr">Honoraires et temps</h1>
      <div className="lbi-bande" />
      <div className="lbi-zone">
        <div className="lbi-colonne">
          <header className="lbi-tete">
            <h2 className="lbi-h2">Honoraires et temps</h2>
            <div className="lbi-tete-ligne">
              <p className="lbi-aide">
                {projet ? (
                  <>
                    La mission de <Link href={lienProjet(projet.id)}>{projet.nom}</Link>, phase par phase, et le temps passé dessus.
                  </>
                ) : (
                  "Les honoraires d'un projet, phase par phase, et le temps passé dessus."
                )}
              </p>
              {projets.length > 1 ? (
                <Menu
                  largeur={260}
                  bouton={(ouvert, basculer) => (
                    <>
                      <button type="button" className="lbi-btn lbi-btn--tete" aria-expanded={ouvert} aria-haspopup="menu" onClick={basculer}>
                        Changer de projet
                        <ChevronDown aria-hidden="true" />
                      </button>
                    </>
                  )}
                >
                  {(fermer) =>
                    projets.map((p) => (
                      <Link key={p.id} href={lien(p.id)} scroll={false} className="lin-menu-option" aria-current={p.id === projet?.id ? "true" : undefined} onClick={fermer}>
                        <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.nom}</span>
                        <span className="lin-meta">{totalDe[p.id] !== undefined ? euros(totalDe[p.id]) : "—"}</span>
                      </Link>
                    ))
                  }
                </Menu>
              ) : projet ? (
                <Link className="lbi-btn lbi-btn--tete" href={lienProjet(projet.id)}>
                  Le projet
                  <ArrowUpRight aria-hidden="true" />
                </Link>
              ) : null}
            </div>
          </header>

          {chargement ? (
            <p className="lbi-rien">Lecture du dossier…</p>
          ) : erreur ? (
            <p className="lbi-rien" role="alert">
              Le dossier n&apos;a pas pu être lu : {erreur}
            </p>
          ) : projet ? (
            <CarteHonoraires key={projet.id} projet={projet} dossier={dossier} nommer={nommer} peutEcrire={peutEcrire} agir={agir} habit={(v) => <Cartes v={v} projet={projet} peutEcrire={peutEcrire} nommer={nommer} />} />
          ) : (
            <p className="lbi-rien">Aucun projet : ouvrez-en un depuis la vue d&apos;ensemble pour poser ses honoraires.</p>
          )}
        </div>
      </div>
    </div>
  );
}
