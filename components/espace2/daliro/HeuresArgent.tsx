"use client";

/* ══════════════════════════════════════════════════════════════════════
   DALIRO › fiche d'un chantier › Argent : les heures et la rentabilité
   (06/11/2026, demande de Teo : « le haut de la page est bien fait, recopie
   le même modèle en bas »).

   Jusqu'ici, le bas de l'onglet montait l'ancienne carte des heures
   (components/espace/daliro/HeuresCarte.tsx, son dessin de volet) telle
   quelle : titre en gros, grille de champs, quatre tuiles. Il est réécrit
   dans les briques du haut de la même page (le tableau de bord de CASHD,
   ../lin/lin.css) :
     · « Heures pointées » et « Marge par lot » : titres lin-projet-h2,
       comme « Avancement facturé par lot » ;
     · la semaine, le lot pointé et les gestes : des lignes lin-projet-ligne
       à pastilles (MenuOptions), comme « Propriétés » et « Factures » ;
     · la feuille de la semaine : une ligne de 36 par intervenant
       (lin-projet-liste), le nom dans la colonne de 220 des lots, puis une
       case par jour et le total en lin-meta — le seul écart à la référence,
       un geste du métier (poser ses heures) qu'elle n'a pas ;
     · la marge par lot : les lignes à barre de l'avancement (la barre dit
       la part du vendu déjà déboursée), cliquables comme les avenants,
       leur détail posé à droite ;
     · les chiffres : une carte « Rentabilité » à droite (lin-kpis et
       lin-props), comme « Facturation » et « Propriétés ».

   La logique (lecture, pointage, coût horaire, fenêtres) est celle de la
   carte, partagée par useHeuresChantier : aucun geste n'est réécrit.
   ══════════════════════════════════════════════════════════════════════ */

import { createPortal } from "react-dom";
import { Euro, Layers, Users } from "lucide-react";
import { useHeuresChantier } from "@/components/espace/daliro/HeuresCarte";
import { JOURS_COURTS, ajouterJours, heuresFr, lundiDe } from "@/components/espace/daliro/heures";
import type { Tableau } from "@/components/espace/daliro/types";
import type { Source } from "@/components/espace/source";
import { dateCourte, montant, pourcent } from "@/components/espace/format";
import { CarteDroite, MenuOptions, type Option } from "../lin/Lin";
import { Detail, Rangee, Rangees } from "../lin/Volet";
import { DalIcone } from "./DalIcone";

const HORS_LOT = "hors";

type Props = {
  t: Tableau;
  source: Source;
  /* la place de la carte « Rentabilité » dans la colonne de droite */
  droite: HTMLElement | null;
  choisie: string | null;
  choisir: (cle: string | null) => void;
};

export function HeuresArgent({ t, source, droite, choisie, choisir }: Props) {
  const { h, chargement, erreur, fait, alertes, envoi, lundi, setLundi, lot, setLot, saisies, setSaisies, enregistrer, cle, heuresDe, ouvert, auj, totalJour, ouvrirEquipe, ouvrirCout, equipeForm, coutForm, fenetres } = useHeuresChantier(t, source);

  if (!h) {
    return (
      <>
        <h3 className="lin-projet-h2">Heures pointées</h3>
        <p className="lin-maj-texte lin-maj-gris">{chargement ? "Lecture des heures…" : (erreur ?? "Les heures de ce chantier ne vous sont pas ouvertes.")}</p>
      </>
    );
  }

  const r = h.rentabilite;
  const nomLot = (id: string) => {
    if (id === HORS_LOT) return "Hors lot";
    const l = t.lots.find((x) => x.id === id);
    return l ? `${l.code} · ${l.libelle}` : "Lot";
  };
  /* les huit dernières semaines, la plus récente en tête */
  const lundiCourant = lundiDe(auj);
  const semaines: Option[] = Array.from({ length: 8 }, (_, k) => {
    const l = ajouterJours(lundiCourant, -7 * k);
    return { cle: l, libelle: `Semaine du ${dateCourte(l)}`, meta: k === 0 ? "en cours" : undefined, coche: l === lundi, icone: <DalIcone nom="Calendar" taille={14} />, action: () => (setLundi(l), setSaisies({})) };
  });
  const lots: Option[] = [...t.lots.map((l) => ({ cle: l.id, libelle: `${l.code} · ${l.libelle}` })), { cle: HORS_LOT, libelle: "Hors lot" }].map((o) => ({
    ...o,
    coche: o.cle === lot,
    icone: <Layers width={14} height={14} aria-hidden="true" />,
    action: () => (setLot(o.cle), setSaisies({})),
  }));
  const equipes: Option[] = h.equipes.map((e) => ({ cle: e.id, libelle: e.nom, icone: <Users width={14} height={14} aria-hidden="true" />, action: () => ouvrirEquipe(e.id) }));
  const coutOptions: Option[] = [{ cle: "poser", libelle: "Poser le coût horaire chargé", meta: h.cout_defaut != null ? `${montant(h.cout_defaut)} / h` : undefined, icone: <Euro width={14} height={14} aria-hidden="true" />, action: ouvrirCout }];

  const avis = [
    ...(fait ? [{ cle: "fait", teinte: "vert", texte: fait }] : []),
    ...alertes.map((a) => ({ cle: a, teinte: "jaune", texte: a })),
    ...(erreur && !equipeForm && !coutForm ? [{ cle: "erreur", teinte: "rouge", texte: erreur }] : []),
    ...(!ouvert ? [{ cle: "ferme", teinte: "gris", texte: "Le chantier n'est pas ouvert : on n'y pointe pas encore d'heures." }] : []),
  ];

  const carte =
    r && h.voit_prix ? (
      <CarteDroite titre="Rentabilité">
        <dl className="lin-kpis lin-kpis--trois">
          <div>
            <dt>
              <span className="lin-carre" style={{ background: "var(--lin-graph-bleu)" }} />
              Facturé
            </dt>
            <dd>{montant(r.facture_ht)}</dd>
          </div>
          <div>
            <dt>
              <span className="lin-carre" style={{ background: "var(--lin-graph-jaune)" }} />
              Déboursé
            </dt>
            <dd>{montant(r.debourse_ht)}</dd>
          </div>
          <div>
            <dt>
              <span className="lin-carre" style={{ background: r.marge_ht < 0 ? "var(--lin-rouge)" : "var(--lin-vert)" }} />
              Marge
            </dt>
            <dd>{montant(r.marge_ht)}</dd>
          </div>
        </dl>
        <dl className="lin-props dal-hg-props">
          <div>
            <dt>Heures pointées</dt>
            <dd>{heuresFr(r.heures)}</dd>
          </div>
          <div>
            <dt>Main-d&apos;œuvre</dt>
            <dd>{montant(r.main_oeuvre_ht)}</dd>
          </div>
          <div>
            <dt>Achats</dt>
            <dd>{montant(r.achats_ht)}</dd>
          </div>
          <div>
            <dt>Marge à date</dt>
            <dd data-teinte={r.marge_ht < 0 ? "rouge" : undefined}>{r.marge_taux !== null ? `${pourcent(Math.round(r.marge_taux * 1000) / 10)} du facturé` : "rien de facturé"}</dd>
          </div>
          <div>
            <dt>Coût horaire</dt>
            <dd className={h.cout_defaut == null ? "lin-props-vide" : undefined}>{h.cout_defaut != null ? `${montant(h.cout_defaut)} / h` : "à poser"}</dd>
          </div>
          {r.heures_sans_cout > 0 ? (
            <div>
              <dt>Sans coût</dt>
              <dd data-teinte="jaune">{heuresFr(r.heures_sans_cout)}</dd>
            </div>
          ) : null}
        </dl>
      </CarteDroite>
    ) : null;

  return (
    <>
      <h3 className="lin-projet-h2">Heures pointées</h3>
      <div className="lin-projet-ligne">
        <span className="lin-projet-etiquette">Semaine</span>
        <MenuOptions
          titre="Semaine…"
          declencheur={
            <>
              <DalIcone nom="Calendar" taille={14} />
              Semaine du {dateCourte(lundi)}
            </>
          }
          options={semaines}
          largeur={260}
        />
        <MenuOptions
          titre="Lot pointé…"
          declencheur={
            <>
              <Layers width={14} height={14} aria-hidden="true" />
              {nomLot(lot)}
            </>
          }
          options={lots}
          largeur={320}
        />
      </div>
      <div className="lin-projet-ligne">
        <span className="lin-projet-etiquette">Pointage</span>
        <MenuOptions
          titre="Pointer une équipe…"
          declencheur={
            <>
              <Users width={14} height={14} aria-hidden="true" />
              {h.equipes.length ? "Pointer une équipe" : "Aucune équipe"}
            </>
          }
          options={ouvert && !envoi ? equipes : []}
          largeur={280}
        />
        {h.voit_prix ? (
          <MenuOptions
            titre="Coût horaire…"
            teinte={h.cout_defaut == null ? "jaune" : undefined}
            declencheur={
              <>
                <Euro width={14} height={14} aria-hidden="true" />
                {h.cout_defaut != null ? `Coût horaire · ${montant(h.cout_defaut)}` : "Coût horaire à poser"}
              </>
            }
            options={envoi ? [] : coutOptions}
            largeur={300}
          />
        ) : null}
      </div>

      {avis.length ? (
        <div className="dal-hg-avis">
          {avis.map((a) => (
            <p key={a.cle} data-teinte={a.teinte} role={a.teinte === "vert" ? "status" : "alert"}>
              {a.texte}
            </p>
          ))}
        </div>
      ) : null}

      {h.intervenants.length ? (
        <ul className="lin-projet-liste dal-hg-feuille" aria-label={`Heures de la semaine du ${dateCourte(lundi)}, ${nomLot(lot)}`}>
          <li className="dal-hg-tete" aria-hidden="true">
            <span className="lin-tranche-nom">Intervenant</span>
            <span className="dal-hg-cases">
              {h.jours.map((j, k) => (
                <span key={j}>
                  {JOURS_COURTS[k]} {j.slice(8, 10)}
                </span>
              ))}
            </span>
            <span className="lin-meta dal-hg-total">Semaine</span>
          </li>
          {h.intervenants.map((i) => (
            <li key={i.id}>
              <span className="lin-tranche-nom" title={[i.nom, i.equipe_nom, !i.actif ? "inactif" : null].filter(Boolean).join(" · ")}>
                {i.nom}
                {i.equipe_nom || !i.actif ? <span className="dal-hg-equipe">{[i.equipe_nom, !i.actif ? "inactif" : null].filter(Boolean).join(" · ")}</span> : null}
              </span>
              <span className="dal-hg-cases">
                {h.jours.map((j) => {
                  const k = cle(i.id, j);
                  const v = heuresDe(i.id, j);
                  const autres = heuresDe(i.id, j, true) - v;
                  const ferme = !ouvert || j > auj || envoi || (!i.actif && v === 0);
                  return (
                    <input
                      key={j}
                      className="dal-hg-case"
                      inputMode="decimal"
                      aria-label={`Heures de ${i.nom} le ${dateCourte(j)} (${nomLot(lot)})`}
                      title={autres > 0 ? `+${heuresFr(autres)} sur d'autres lots ce jour` : undefined}
                      data-autres={autres > 0 ? "" : undefined}
                      value={saisies[k] ?? (v ? String(v).replace(".", ",") : "")}
                      placeholder={j > auj ? "" : "–"}
                      onChange={(e) => setSaisies((p) => ({ ...p, [k]: e.target.value }))}
                      onBlur={() => void enregistrer(i.id, i.nom, j)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                      }}
                      disabled={ferme}
                    />
                  );
                })}
              </span>
              <span className="lin-meta dal-hg-total">{heuresFr(h.jours.reduce((s, j) => s + heuresDe(i.id, j, true), 0))}</span>
            </li>
          ))}
          <li className="dal-hg-pied">
            <span className="lin-tranche-nom">Total du jour</span>
            <span className="dal-hg-cases">
              {h.jours.map((j) => (
                <span key={j}>{totalJour(j) ? heuresFr(totalJour(j)) : "–"}</span>
              ))}
            </span>
            <span className="lin-meta dal-hg-total">{heuresFr(h.semaine_heures)}</span>
          </li>
        </ul>
      ) : (
        <p className="lin-maj-texte lin-maj-gris">Aucun intervenant : ajoutez vos compagnons et leurs équipes pour pointer leurs heures.</p>
      )}
      <p className="lin-maj-texte lin-maj-gris dal-hg-note">Au quart d&apos;heure (7,5 = 7 h 30) ; 0 retire la journée. 12 h au plus par jour, tous chantiers confondus (Code du travail, L3121-18 et L3121-19).</p>

      <h3 className="lin-projet-h2">Marge par lot</h3>
      {r && h.voit_prix ? (
        <>
          <ul className="lin-projet-liste">
            {r.lots.map((l) => {
              const c = `rentabilite:${l.lot_id ?? HORS_LOT}`;
              const part = l.vendu_ht > 0 ? Math.min(100, Math.round((l.debourse_ht / l.vendu_ht) * 100)) : l.debourse_ht > 0 ? 100 : 0;
              return (
                <li key={c}>
                  <button type="button" className="lin-projet-lien dal-ag-lien dal-hg-lot" data-actif={choisie === c ? "" : undefined} aria-pressed={choisie === c} onClick={() => choisir(choisie === c ? null : c)} title={`${heuresFr(l.heures)} · déboursé ${montant(l.debourse_ht)} sur ${montant(l.vendu_ht)} vendus`}>
                    <span className="lin-tranche-nom">
                      {l.code ? `${l.code} ` : ""}
                      {l.libelle}
                    </span>
                    <span className="lin-tranche-barre" aria-hidden="true">
                      <span style={{ width: `${part}%` }} data-depasse={l.marge_ht < 0 ? "" : undefined} />
                    </span>
                    <span className="lin-meta" data-teinte={l.marge_ht < 0 ? "rouge" : undefined}>
                      {montant(l.marge_ht)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="lin-maj-texte lin-maj-gris dal-hg-note">La barre : la part du vendu déjà déboursée (main-d&apos;œuvre et achats). À droite : la marge à date du lot.</p>
          {r.lots.map((l) => (
            <Detail key={l.lot_id ?? HORS_LOT} cle={`rentabilite:${l.lot_id ?? HORS_LOT}`} titre={`${l.code ? `${l.code} · ` : ""}${l.libelle}`} sous="Rentabilité à date">
              <Rangees>
                <Rangee libelle="Vendu HT">{montant(l.vendu_ht)}</Rangee>
                <Rangee libelle="Facturé HT">{montant(l.facture_ht)}</Rangee>
                <Rangee libelle="Heures">{l.heures ? heuresFr(l.heures) : "–"}</Rangee>
                <Rangee libelle="Main-d'œuvre">− {montant(l.main_oeuvre_ht)}</Rangee>
                <Rangee libelle="Achats HT">− {montant(l.achats_ht)}</Rangee>
                <Rangee libelle="Marge" teinte={l.marge_ht < 0 ? "rouge" : undefined}>
                  {montant(l.marge_ht)}
                </Rangee>
              </Rangees>
            </Detail>
          ))}
        </>
      ) : (
        <p className="lin-maj-texte lin-maj-gris">La rentabilité (coûts et marge) est réservée à qui a le droit de voir les prix.</p>
      )}

      {droite && carte ? createPortal(carte, droite) : null}
      {/* les fenêtres de la carte (Pointer une équipe, Coût horaire) gardent le monde .resa .esp de leurs champs */}
      <div className="resa esp">{fenetres}</div>
    </>
  );
}
