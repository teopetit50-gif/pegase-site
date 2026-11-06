"use client";

/* ══════════════════════════════════════════════════════════════════════
   DALIRO › fiche d'un chantier : l'onglet Argent, sur le Pilotage de
   TAMILA (06/11/2026, décision de Teo : « oui, comme Tamila »).

   Copie du gabarit d'Insights › Reporting de Plain déjà relevé pour
   Tamila (components/espace2/tamila/Pilotage.tsx, ses briques Barres,
   Courbe, Repartition, Section, Carte et tamp-pilotage.css) : barre de
   titre et boutons bordés à droite, sections repliables, cartes à valeur
   et graphique, pied à volets. Seul le contenu change : l'argent du
   chantier.

     Vue d'ensemble   marge à date (par lot), facturé (courbe des
                      situations), déboursé (par lot) ;
     Heures           heures par jour de la semaine choisie, par lot ;
                      par intervenant, main-d'œuvre par lot, sans coût ;
     Marge par lot    marge, budget consommé, avancement facturé ;
     Avenants, situations et factures.
   Boutons Filter · Timeframe de Plain → Filtre (un lot) · Semaine ; plus
   « Pointer une équipe » et « Coût horaire », les gestes du pointage
   (les fenêtres de la carte des heures, useHeuresChantier).

   Ce qui demandait un geste et vivait ici (signer un avenant, préparer
   une situation) reste sur la page « Avenants et situations ».
   ══════════════════════════════════════════════════════════════════════ */

import { useMemo, useState } from "react";
import { useHeuresChantier } from "@/components/espace/daliro/HeuresCarte";
import { JOURS_COURTS, ajouterJours, heuresFr, lundiDe } from "@/components/espace/daliro/heures";
import { STATUTS_AVENANT } from "@/components/espace/daliro/etats";
import type { Tableau } from "@/components/espace/daliro/types";
import type { Source } from "@/components/espace/source";
import { dateCourte } from "@/components/espace/format";
import { RACINE } from "@/components/espace2/modules";
import { Barres, Carte, Courbe, Repartition, Section, type LigneRep } from "@/components/espace2/tamila/Pilotage";
import { PlainCarte, useOuvert } from "@/components/espace2/tamila/TamCadre";
import { PlainIcone, TamIcone } from "@/components/espace2/tamila/TamIcone";
import { lignesLots } from "./ApercuChantier";

const eur = (n: number) => n.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const COULEURS = ["#5c67f4", "#1bd379", "#ab4aba", "#ffcb14", "#e33d3d", "#636370"];
const ROUGE = "#e33d3d";
const AMBRE = "#ffcb14";
const SITUATION: Record<string, string> = { brouillon: "en préparation", soumise: "soumise", validee: "validée", refusee: "refusée" };

export function ArgentPilotage({ t, source, ici }: { t: Tableau; source: Source; ici: string }) {
  const { h, lundi, setLundi, setSaisies, setLot, ouvrirEquipe, ouvrirCout, fenetres, auj, ouvert, envoi, fait, alertes, erreur, equipeForm, coutForm, totalJour, heuresDe } = useHeuresChantier(t, source);
  const [filtre, setFiltre] = useState<string | null>(null);
  const { ouvert: fOuvert, setOuvert: ouvrirF, boite: boiteF } = useOuvert<HTMLDivElement>();
  const { ouvert: sOuvert, setOuvert: ouvrirS, boite: boiteS } = useOuvert<HTMLDivElement>();

  const prix = t.voit_prix;
  const r = h?.rentabilite ?? null;
  const lotFiltre = filtre ? t.lots.find((l) => l.id === filtre) ?? null : null;
  const garder = <T extends { lot_id: string | null }>(xs: T[]) => (filtre ? xs.filter((x) => x.lot_id === filtre) : xs);
  const lotsR = r ? garder(r.lots) : [];
  const nomLot = (code: string | null, libelle: string) => `${code ? `${code} ` : ""}${libelle}`;
  const lienLots = `${ici}?onglet=projets`;
  const lienAvenants = `${RACINE}/daliro/avenants`;

  /* le facturé, situation après situation */
  const chrono = useMemo(() => (t.situations ?? []).filter((s) => s.statut === "validee" || s.statut === "soumise").sort((a, b) => a.numero - b.numero), [t.situations]);
  const signes = t.avenants.filter((a) => a.statut === "signe");
  const venduCalc = (t.marches[0]?.total_ht_lignes ?? 0) + signes.reduce((s, a) => s + (a.montant_ht ?? 0), 0);
  const vendu = r?.vendu_ht ?? venduCalc;
  const facture = r?.facture_ht ?? Math.max(0, ...chrono.filter((s) => s.statut === "validee").map((s) => s.cumul_ht));
  const marge = lotsR.reduce((s, l) => s + l.marge_ht, 0);
  const debourse = lotsR.reduce((s, l) => s + l.debourse_ht, 0);
  const factureFiltre = lotsR.reduce((s, l) => s + l.facture_ht, 0);

  /* les heures de la semaine choisie */
  const semaines = Array.from({ length: 8 }, (_, k) => ajouterJours(lundiDe(auj), -7 * k));
  const parJour = h ? h.jours.map((j) => totalJour(j)) : [];
  const semaineTotal = parJour.reduce((s, v) => s + v, 0);
  const parIntervenant = h
    ? h.intervenants.map((i) => ({ i, heures: h.jours.reduce((s, j) => s + heuresDe(i.id, j, true), 0) })).filter((x) => x.heures > 0).sort((a, b) => b.heures - a.heures)
    : [];
  const heuresTotal = r ? lotsR.reduce((s, l) => s + l.heures, 0) : (h?.total_heures ?? 0);
  const sansCout = lotsR.reduce((s, l) => s + l.heures_sans_cout, 0);

  const lots = lignesLots(t).filter((x) => !filtre || x.lot.id === filtre);
  const factures = t.factures.filter((f) => f.statut === "rattachee" && (!filtre || f.lot_id === filtre));
  const parFournisseur = [...factures.reduce((m, f) => m.set(f.fournisseur_nom ?? "Fournisseur inconnu", (m.get(f.fournisseur_nom ?? "Fournisseur inconnu") ?? 0) + (f.montant_ht ?? 0)), new Map<string, number>())].sort((a, b) => b[1] - a[1]);
  const avenants = [...t.avenants].sort((a, b) => b.numero - a.numero);
  const reserve = "Réservé à qui voit les prix";

  const avis = [
    ...(fait ? [{ cle: "fait", ton: "vert", texte: fait }] : []),
    ...alertes.map((a) => ({ cle: a, ton: "ambre", texte: a })),
    ...(erreur && !equipeForm && !coutForm ? [{ cle: "erreur", ton: "rouge", texte: erreur }] : []),
  ];

  return (
    <PlainCarte className="dal-ap">
      <div className="tamp-rapport">
        <header className="tamp-rtete">
          <h1 className="tamp-titre">Argent du chantier</h1>
          <div className="tamp-rboutons">
            <div ref={boiteF} style={{ position: "relative" }}>
              <button type="button" className="tamp-borde" aria-haspopup="menu" aria-expanded={fOuvert} onClick={() => ouvrirF((o) => !o)}>
                <PlainIcone nom="Filtres" taille={14} />
                {lotFiltre ? `Lot ${lotFiltre.code}` : "Filtre"}
              </button>
              {fOuvert ? (
                <div className="tamp-menu" role="menu" style={{ top: 34, right: 0, width: 280 }}>
                  <button type="button" role="menuitemradio" aria-checked={!filtre} className="tamp-menu-option tamp-menu-option--grand" onClick={() => (setFiltre(null), ouvrirF(false))}>
                    Tous les lots {!filtre ? "✓" : ""}
                  </button>
                  {t.lots.map((l) => (
                    <button
                      key={l.id}
                      type="button"
                      role="menuitemradio"
                      aria-checked={filtre === l.id}
                      className="tamp-menu-option tamp-menu-option--grand"
                      onClick={() => {
                        setFiltre(l.id);
                        /* le lot filtré devient aussi le lot pointé */
                        setLot(l.id);
                        setSaisies({});
                        ouvrirF(false);
                      }}
                    >
                      <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{nomLot(l.code, l.libelle)}</span>
                      {filtre === l.id ? "✓" : ""}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <div ref={boiteS} style={{ position: "relative" }}>
              <button type="button" className="tamp-borde" aria-haspopup="menu" aria-expanded={sOuvert} onClick={() => ouvrirS((o) => !o)}>
                Semaine <span>du {dateCourte(lundi)}</span>
                <TamIcone nom="Chevron" taille={14} style={{ transform: "rotate(90deg)" }} />
              </button>
              {sOuvert ? (
                <div className="tamp-menu" role="menu" style={{ top: 34, right: 0, width: 220 }}>
                  {semaines.map((l, k) => (
                    <button key={l} type="button" role="menuitemradio" aria-checked={lundi === l} className="tamp-menu-option tamp-menu-option--grand" style={{ flexDirection: "column", alignItems: "flex-start", gap: 0 }} onClick={() => (setLundi(l), setSaisies({}), ouvrirS(false))}>
                      <span>
                        Semaine du {dateCourte(l)} {lundi === l ? "✓" : ""}
                      </span>
                      <small style={{ color: "var(--p-texte-2)" }}>{k === 0 ? "en cours" : `il y a ${k} semaine${k > 1 ? "s" : ""}`}</small>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <button type="button" className="tamp-borde" onClick={() => ouvrirEquipe()} disabled={!h || !ouvert || envoi || !h.equipes.length} title={!ouvert ? "On pointe des heures sur un chantier ouvert" : undefined}>
              <TamIcone nom="Users" taille={14} />
              Pointer une équipe
            </button>
            {prix ? (
              <button type="button" className="tamp-borde" onClick={ouvrirCout} disabled={!h || envoi}>
                Coût horaire <span>{h?.cout_defaut != null ? `${eur(h.cout_defaut)} / h` : "à poser"}</span>
                <TamIcone nom="Chevron" taille={14} style={{ transform: "rotate(90deg)" }} />
              </button>
            ) : null}
          </div>
        </header>
        <div className="tamp-rzone">
          {avis.length ? (
            <div className="dal-ap-avis">
              {avis.map((a) => (
                <p key={a.cle} data-ton={a.ton} role={a.ton === "vert" ? "status" : "alert"}>
                  {a.texte}
                </p>
              ))}
            </div>
          ) : null}
          {!h ? <p className="tamp-rpied">Lecture de l&apos;argent du chantier…</p> : null}
          {h ? (
            <>
              <Section titre="Vue d'ensemble">
                <div className="tamp-rgrille">
                  <Carte
                    titre="Marge à date"
                    aide="Facturé HT (dernière situation validée) moins le déboursé : main-d'œuvre (heures × coût horaire chargé) et achats (factures rattachées)."
                    valeur={r ? eur(marge) : "—"}
                    suffixe={r ? (filtre ? `sur le lot ${lotFiltre?.code}` : r.marge_taux !== null ? `soit ${(Math.round(r.marge_taux * 1000) / 10).toLocaleString("fr-FR")} % du facturé` : "rien de facturé encore") : reserve}
                    signal={
                      r && marge < 0 ? (
                        <span className="tamp-signal">
                          <TamIcone nom="Alert" taille={14} />
                          Marge négative
                        </span>
                      ) : undefined
                    }
                  >
                    <Barres valeurs={lotsR.map((l) => Math.round(l.marge_ht))} couleurs={lotsR.map((l) => (l.marge_ht < 0 ? ROUGE : null))} etiquettes={["Par lot", ""]} />
                  </Carte>
                  <Carte titre="Facturé" aide="Le cumul HT des situations de travaux, situation après situation." valeur={prix ? eur(filtre ? factureFiltre : facture) : "—"} suffixe={prix ? `sur ${eur(vendu)} vendus` : reserve}>
                    <Courbe valeurs={prix ? [0, ...chrono.map((s) => s.cumul_ht)] : []} etiquettes={["Début", chrono.length ? `Situation n° ${chrono[chrono.length - 1].numero}` : "Aujourd'hui"]} />
                  </Carte>
                  <Carte titre="Déboursé" aide="Ce que le chantier a coûté à date : main-d'œuvre pointée et achats rattachés, lot par lot." valeur={r ? eur(debourse) : "—"} suffixe={r ? "main-d'œuvre et achats" : reserve}>
                    <Barres valeurs={lotsR.map((l) => Math.round(l.debourse_ht))} etiquettes={["Par lot", ""]} />
                  </Carte>
                </div>
              </Section>

              <Section titre="Heures">
                <div className="tamp-rgrille tamp-rgrille--2">
                  <Carte
                    titre="Heures pointées par jour"
                    aide="Toutes les heures pointées sur ce chantier, tous lots, jour par jour de la semaine choisie (bouton « Semaine »)."
                    valeur={heuresFr(semaineTotal)}
                    suffixe={`semaine du ${dateCourte(lundi)}`}
                    signal={
                      parJour.some((v) => v > 0) && h.intervenants.some((i) => h.jours.some((j) => heuresDe(i.id, j, true) > 10)) ? (
                        <span className="tamp-signal">
                          <TamIcone nom="Alert" taille={14} />
                          Plus de 10 h un jour
                        </span>
                      ) : undefined
                    }
                  >
                    <Barres valeurs={parJour} etiquettes={[`${JOURS_COURTS[0]} ${h.jours[0]?.slice(8, 10) ?? ""}`, `${JOURS_COURTS[6]} ${h.jours[6]?.slice(8, 10) ?? ""}`]} moyenne={heuresFr(Math.round((semaineTotal / 7) * 10) / 10)} />
                  </Carte>
                  <Carte titre="Heures par lot" aide="Toutes les heures pointées depuis le début du chantier, lot par lot." valeur={heuresFr(heuresTotal)} suffixe="depuis le début">
                    <Barres valeurs={lotsR.map((l) => l.heures)} etiquettes={["Par lot", ""]} />
                  </Carte>
                </div>
                <div className="tamp-rgrille">
                  <Carte titre="Heures par intervenant" aide="La semaine choisie, tous lots du chantier." valeur={String(parIntervenant.length)} suffixe={`intervenant${parIntervenant.length > 1 ? "s" : ""} cette semaine`}>
                    <Repartition
                      lignes={parIntervenant.slice(0, 6).map((x, k): LigneRep => ({ cle: x.i.id, nom: x.i.equipe_nom ? `${x.i.nom} · ${x.i.equipe_nom}` : x.i.nom, valeur: x.heures, libelle: heuresFr(x.heures), icone: "Users", couleur: COULEURS[k % COULEURS.length], badge: x.heures > 48 ? { texte: "+ de 48 h", ton: "rouge" } : undefined }))}
                      vide={["Aucune heure", "Personne n'a pointé sur ce chantier cette semaine."]}
                    />
                  </Carte>
                  <Carte titre="Main-d'œuvre par lot" aide="Les heures pointées au coût horaire chargé du jour où elles ont été faites." valeur={r ? eur(lotsR.reduce((s, l) => s + l.main_oeuvre_ht, 0)) : "—"} suffixe={r ? "depuis le début" : reserve}>
                    <Repartition
                      lignes={lotsR.filter((l) => l.main_oeuvre_ht > 0).sort((a, b) => b.main_oeuvre_ht - a.main_oeuvre_ht).slice(0, 6).map((l, k): LigneRep => ({ cle: l.lot_id ?? "hors", nom: nomLot(l.code, l.libelle), valeur: l.main_oeuvre_ht, libelle: eur(l.main_oeuvre_ht), href: lienLots, icone: "Project", couleur: COULEURS[k % COULEURS.length] }))}
                      vide={["Aucune donnée", r ? "Aucune heure chiffrée sur ce chantier." : reserve]}
                    />
                  </Carte>
                  <Carte titre="Heures sans coût" aide="Des heures pointées pour qui aucun coût horaire n'est posé : elles ne comptent pas dans la marge. Posez-le avec « Coût horaire »." valeur={heuresFr(sansCout)} suffixe="à chiffrer">
                    <Repartition
                      lignes={lotsR.filter((l) => l.heures_sans_cout > 0).map((l): LigneRep => ({ cle: l.lot_id ?? "hors", nom: nomLot(l.code, l.libelle), valeur: l.heures_sans_cout, libelle: heuresFr(l.heures_sans_cout), icone: "Alert", couleur: AMBRE, badge: { texte: "sans coût", ton: "ambre" } }))}
                      vide={["Tout est chiffré", "Chaque heure pointée a son coût horaire."]}
                    />
                  </Carte>
                </div>
              </Section>

              <Section titre="Marge par lot">
                <div className="tamp-rgrille">
                  <Carte titre="Marge" aide="Facturé moins déboursé, lot par lot : les lots qui perdent de l'argent d'abord." valeur={r ? String(lotsR.filter((l) => l.marge_ht < 0).length) : "—"} suffixe={r ? "lot(s) à marge négative" : reserve}>
                    <Repartition
                      lignes={[...lotsR].sort((a, b) => a.marge_ht - b.marge_ht).slice(0, 6).map((l): LigneRep => ({ cle: l.lot_id ?? "hors", nom: nomLot(l.code, l.libelle), valeur: l.marge_ht, libelle: eur(l.marge_ht), href: lienLots, couleur: l.marge_ht < 0 ? ROUGE : "#5c67f4", badge: l.marge_ht < 0 ? { texte: "négative", ton: "rouge" } : undefined }))}
                      vide={["Aucune donnée", r ? "Ni heure ni facture sur ce chantier." : reserve]}
                    />
                  </Carte>
                  <Carte titre="Budget consommé" aide="La part du vendu du lot déjà déboursée (main-d'œuvre et achats). Au-delà de 100 %, le lot coûte plus qu'il ne rapporte." valeur={r ? String(lotsR.filter((l) => l.vendu_ht > 0 && l.debourse_ht / l.vendu_ht > 0.8).length) : "—"} suffixe={r ? "lot(s) au-delà de 80 %" : reserve}>
                    <Repartition
                      lignes={lotsR
                        .filter((l) => l.vendu_ht > 0 || l.debourse_ht > 0)
                        .map((l) => ({ l, part: l.vendu_ht > 0 ? Math.round((l.debourse_ht / l.vendu_ht) * 100) : 100 }))
                        .sort((a, b) => b.part - a.part)
                        .slice(0, 6)
                        .map(({ l, part }): LigneRep => ({ cle: l.lot_id ?? "hors", nom: nomLot(l.code, l.libelle), valeur: part, libelle: `${part} %`, href: lienLots, couleur: part > 100 ? ROUGE : part > 80 ? AMBRE : "#1bd379", badge: part > 100 ? { texte: "dépassé", ton: "rouge" } : undefined }))}
                      vide={["Aucune donnée", r ? "Aucun lot vendu ni déboursé." : reserve]}
                    />
                  </Carte>
                  <Carte titre="Avancement facturé" aide="L'avancement que les situations ont facturé, lot par lot." valeur={lots.length ? `${Math.round(lots.reduce((s, x) => s + (x.pct ?? 0), 0) / lots.length)} %` : "—"} suffixe="en moyenne">
                    <Repartition
                      lignes={lots.filter((x) => x.pct !== null).sort((a, b) => (b.pct ?? 0) - (a.pct ?? 0)).slice(0, 6).map((x): LigneRep => ({ cle: x.lot.id, nom: nomLot(x.lot.code, x.lot.libelle), valeur: x.pct ?? 0, libelle: `${x.pct} %`, href: lienLots, couleur: "#ab4aba" }))}
                      vide={["Aucune donnée", "Aucune situation n'a encore facturé d'avancement."]}
                    />
                  </Carte>
                </div>
              </Section>

              <Section titre="Avenants, situations et factures">
                <div className="tamp-rgrille">
                  <Carte titre="Avenants" aide="Les travaux en plus du marché : signés, à signer, à chiffrer. Signer ou chiffrer un avenant se fait sur la page « Avenants et situations »." valeur={String(signes.length)} suffixe={prix ? `signé(s), ${eur(signes.reduce((s, a) => s + (a.montant_ht ?? 0), 0))}` : "signé(s)"}>
                    <Repartition
                      lignes={avenants.slice(0, 6).map((a): LigneRep => ({ cle: a.id, nom: `n° ${a.numero} · ${a.objet}`, valeur: a.montant_ht ?? 0, libelle: prix && a.montant_ht !== null ? eur(a.montant_ht) : STATUTS_AVENANT[a.statut].libelle, href: lienAvenants, icone: "Label", couleur: a.statut === "signe" ? "#1bd379" : a.statut === "soumis" ? AMBRE : "#636370", badge: a.statut === "soumis" ? { texte: "à signer", ton: "ambre" } : a.statut === "brouillon" ? { texte: "à chiffrer", ton: "ambre" } : a.statut === "refuse" ? { texte: "refusé", ton: "rouge" } : undefined }))}
                      vide={["Aucun avenant", "Rien n'a été demandé en plus du marché."]}
                    />
                  </Carte>
                  <Carte titre="Situations" aide="Les situations de travaux mensuelles : le net à payer de chacune." valeur={String((t.situations ?? []).length)} suffixe={`situation(s), ${chrono.filter((s) => s.statut === "validee").length} validée(s)`}>
                    <Repartition
                      lignes={[...(t.situations ?? [])].sort((a, b) => b.numero - a.numero).slice(0, 6).map((s): LigneRep => ({ cle: s.id, nom: `Situation n° ${s.numero} au ${dateCourte(s.periode_fin)}`, valeur: s.net_a_payer, libelle: prix ? eur(s.net_a_payer) : (SITUATION[s.statut] ?? s.statut), href: lienAvenants, icone: "Calendar", couleur: s.statut === "validee" ? "#5c67f4" : "#636370", badge: s.statut === "soumise" ? { texte: "soumise", ton: "ambre" } : s.statut === "brouillon" ? { texte: "en préparation", ton: "ambre" } : undefined }))}
                      vide={["Aucune situation", "La première se prépare depuis le marché vérifié."]}
                    />
                  </Carte>
                  <Carte titre="Factures fournisseurs" aide="Les factures d'achat et de sous-traitance rattachées au chantier, par fournisseur." valeur={String(factures.length)} suffixe={prix ? `facture(s), ${eur(factures.reduce((s, f) => s + (f.montant_ht ?? 0), 0))} HT` : "facture(s)"}>
                    <Repartition
                      lignes={parFournisseur.slice(0, 6).map(([nom, total], k): LigneRep => ({ cle: nom, nom, valeur: total, libelle: prix ? eur(total) : "", icone: "Attachment", couleur: COULEURS[k % COULEURS.length] }))}
                      vide={["Aucune facture", "Aucune facture fournisseur rattachée à ce chantier."]}
                    />
                  </Carte>
                </div>
              </Section>

              <div className="tamp-rpied">
                <span>Depuis l&apos;ouverture du chantier</span>
                <h3>Heures pointées</h3>
                <span className="tamp-volets" aria-label={`${Math.round(h.total_heures)} heures`}>
                  {String(Math.round(h.total_heures))
                    .padStart(3, "0")
                    .split("")
                    .map((ch, i) => (
                      <span key={i}>{ch}</span>
                    ))}
                </span>
              </div>
            </>
          ) : null}
        </div>
      </div>
      {/* les fenêtres de la carte des heures (Pointer une équipe, Coût horaire) gardent le monde .resa .esp de leurs champs */}
      <div className="resa esp">{fenetres}</div>
    </PlainCarte>
  );
}
