"use client";

/* ══════════════════════════════════════════════════════════════════════
   VARELO — « Finance » (/espace2/varelo/finance), 02/11/2026, refonte des
   pages métiers : Plain, Insights (Reporting et ses rapports), au 1:1.
   Relevé : plain-insights.md ; styles ./var-plain.css et
   ./var-insights.css (préfixe var-n-).

   Ce qu'elle reprend de l'écran d'avant (blocs 13, 15 et 6) :
     · « Vue d'ensemble » (Overview) : encours du groupe (dont échu),
       échu à plus de 90 jours (et clients au-dessus du plafond), ventes
       des caisses d'hier (et l'écart sur une semaine) — valeur et
       graphique en barres, une barre par société ou par magasin ;
     · « Encours » : trois répartitions (par client ou fournisseur du
       groupe, échu par objet, la balance de chaque société avec son âge),
       puis le rapport par objet du groupe (le tableau des rapports de
       Plain) : sociétés, encours, échu, > 90 j, plafond, état ; le nom
       ouvre l'objet dans le référentiel ; Plafond (G30, G31) et Proposer
       (G29) en bout de ligne ; 12 lignes puis « Voir les N » ;
     · « Réciproques intragroupe » : écarts à traiter, répartition par
       paire, rapport des paires avec Justifier (G33) ;
     · « Ventes des caisses » : rapport par magasin ;
     · boutons de la barre : Filtre (société), Déposer (balance âgée G32,
       ventes de caisse G15), Nature (clients ou fournisseurs, le
       sélecteur d'avant pour l'encours), Export (réciproques en CSV, G34) ;
     · « ?objet=<id> » (repère grp_ref_objets : un client au-dessus de son
       plafond) et « ?depot=<id> » (grp_encours_depots : une balance âgée
       ancienne) désignent leur ligne.
   ══════════════════════════════════════════════════════════════════════ */

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { dateCourte, montant } from "@/components/espace/format";
import { DialogueBalance, DialoguePlafond, useEncoursGroupe } from "@/components/espace/varelo/CarteEncours";
import { DialogueJustification, useReciproquesGroupe } from "@/components/espace/varelo/CarteReciproques";
import { DialogueVentes, useCaisses } from "@/components/espace/varelo/Caisses";
import { LIBELLE_ETAT_RECIPROQUE, CATEGORIES_ECART } from "@/components/espace/varelo/reciproques";
import { etiquetteDecision } from "@/components/espace/varelo/decisions";
import { RACINE } from "../modules";
import { useVarelo } from "./donnees";
import { VarCarte } from "./VarCadre";
import { PlainIcone } from "./PlainIcone";
import { MenuPlain, useOuvert } from "./PlainCadre";
import { copier, exporterCsv } from "./local";
import { useToast } from "../Toasts";
import "./var-plain.css";
import "./var-insights.css";

type Nature = "client" | "fournisseur";
const k = (v: number) => (Math.abs(v) >= 1e6 ? `${(v / 1e6).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} M€` : Math.abs(v) >= 1e3 ? `${Math.round(v / 1e3).toLocaleString("fr-FR")} k€` : `${Math.round(v)} €`);

/* le graphique en barres des cartes de Plain : barres de 15 rayon 2, teinte selon la valeur,
   ligne de moyenne pointillée avec son étiquette, axe à droite */
function Barres({ valeurs }: { valeurs: { libelle: string; valeur: number }[] }) {
  const L = 316;
  const H = 155;
  const bas = 130;
  const axe = 36;
  if (!valeurs.length || valeurs.every((v) => v.valeur === 0)) {
    return (
      <div className="var-n-sans">
        <PlainIcone nom="Info" taille={14} />
        Pas de données
      </div>
    );
  }
  const max = Math.max(...valeurs.map((v) => v.valeur));
  const moyenne = valeurs.reduce((s, v) => s + v.valeur, 0) / valeurs.length;
  const pas = (L - axe) / valeurs.length;
  const y = (v: number) => bas - (v / max) * (bas - 12);
  return (
    <svg className="var-n-graphe" viewBox={`0 0 ${L} ${H}`} preserveAspectRatio="none" role="img" aria-label={valeurs.map((v) => `${v.libelle} : ${k(v.valeur)}`).join(", ")}>
      {valeurs.map((_, i) => (
        <line key={`g${i}`} className="var-n-grillage" x1={pas * i + 0.5} x2={pas * i + 0.5} y1={0} y2={bas} />
      ))}
      <line className="var-n-grillage" x1={0} x2={L - axe} y1={bas + 0.5} y2={bas + 0.5} />
      {valeurs.map((v, i) => (
        <rect key={v.libelle} x={pas * i + pas / 2 - 7.5} y={y(v.valeur)} width={15} height={Math.max(1, bas - y(v.valeur))} rx={2} fill={v.valeur === max ? "#4252e1" : v.valeur >= moyenne ? "#8a94ed" : "#d2d6f8"}>
          <title>{`${v.libelle} : ${montant(v.valeur)}`}</title>
        </rect>
      ))}
      <line className="var-n-moyenne" x1={0} x2={L - axe} y1={y(moyenne)} y2={y(moyenne)} />
      <rect className="var-n-etiquette" x={2} y={y(moyenne) - 16} width={86} height={14} rx={4} />
      <text x={6} y={y(moyenne) - 5} style={{ fontSize: 10 }}>
        Moyenne {k(moyenne)}
      </text>
      {[max, max / 2, 0].map((t, i) => (
        <text key={i} x={L - axe + 8} y={i === 0 ? 16 : i === 1 ? (bas + 12) / 2 + 4 : bas + 4} style={{ fontSize: 12 }}>
          {k(t)}
        </text>
      ))}
      {valeurs.length <= 6
        ? valeurs.map((v, i) => (
            <text key={`x${i}`} x={pas * i + pas / 2} y={H - 4} textAnchor="middle" style={{ fontSize: 11 }}>
              {v.libelle.length > 12 ? `${v.libelle.slice(0, 11)}…` : v.libelle}
            </text>
          ))
        : null}
    </svg>
  );
}

/* « Ask Agent » de Plain : copie le résumé de la carte pour l'assistant (presse-papier) */
function Agent({ texte }: { texte: string }) {
  const toast = useToast();
  return (
    <button type="button" className="var-n-agent" aria-label="Copier pour l'assistant" title="Copier pour l'assistant : le résumé de la carte, à coller dans l'assistant" onClick={() => void copier(texte).then((ok) => toast(ok ? "Résumé copié pour l'assistant" : "Le résumé n'a pas pu être copié.", ok ? "neutre" : "rouge"))}>
      <PlainIcone nom="Info" />
      <span>Copier pour l&apos;assistant</span>
    </button>
  );
}

/* la recherche et le téléchargement d'un rapport de Plain : filtre et export CSV des lignes affichées */
function OutilsRapport({ recherche, setRecherche, exporter }: { recherche: string; setRecherche: (q: string) => void; exporter: () => void }) {
  return (
    <div className="var-n-rapport-outils">
      <label className="var-p-recherche" style={{ width: 240 }}>
        <PlainIcone nom="Loupe" />
        <input type="search" placeholder="Chercher" value={recherche} onChange={(e) => setRecherche(e.target.value)} aria-label="Chercher dans le rapport" />
      </label>
      <button type="button" className="var-n-telecharger" aria-label="Télécharger les lignes affichées (CSV)" title="Télécharger les lignes affichées (CSV)" onClick={exporter}>
        <PlainIcone nom="Telecharger" />
      </button>
    </div>
  );
}

function Section({ titre, children }: { titre: string; children: React.ReactNode }) {
  const [ouverte, setOuverte] = useState(true);
  return (
    <section className="var-n-section" aria-label={titre}>
      <div className="var-n-section-tete">
        <button type="button" className="var-n-section-titre" aria-expanded={ouverte} onClick={() => setOuverte((o) => !o)}>
          <h2>{titre}</h2>
          <PlainIcone nom="ChevronBas" />
        </button>
      </div>
      {ouverte ? children : null}
    </section>
  );
}

function Repartition({ titre, info, lignes }: { titre: string; info: string; lignes: { cle: string; nom: string; valeur: number; texte: string; badge?: { texte: string; teinte?: "rouge" | "vert" } }[] }) {
  const max = Math.max(1, ...lignes.map((l) => Math.abs(l.valeur)));
  return (
    <div className="var-n-carte">
      <div className="var-n-carte-tete">
        <p className="var-n-carte-titre" title={info}>
          {titre}
          <PlainIcone nom="Info" />
          <span className="var-n-droite">
            <Agent texte={`${titre} (${info}) : ${lignes.slice(0, 5).map((l) => `${l.nom} ${l.texte}${l.badge ? ` (${l.badge.texte})` : ""}`).join(" ; ")}.`} />
          </span>
        </p>
      </div>
      {lignes.length ? (
        <ul className="var-n-repart">
          {lignes.slice(0, 5).map((l) => (
            <li key={l.cle}>
              <span className="var-n-repart-nom">
                <PlainIcone nom="Batiment" />
                <span>{l.nom}</span>
              </span>
              <span className="var-n-barre" style={{ width: `${Math.max(2, (Math.abs(l.valeur) / max) * 100)}%`, background: l.badge?.teinte === "rouge" ? "#5c67f4" : undefined }} />
              <span className="var-n-repart-valeur">
                {l.texte}
                {l.badge ? (
                  <span className="var-n-badge" data-teinte={l.badge.teinte}>
                    {l.badge.texte}
                  </span>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="var-n-encadre">
          <strong>Pas de données</strong>
          <p>Rien sur cette période.</p>
        </div>
      )}
    </div>
  );
}

export default function VueFinance() {
  const v = useVarelo();
  const params = useSearchParams();
  const routeur = useRouter();
  const societes = useMemo(() => v.donnees?.societes ?? [], [v.donnees]);
  const codes = useMemo(() => v.donnees?.codes ?? [], [v.donnees]);
  const objets = useMemo(() => v.donnees?.objets ?? [], [v.donnees]);
  const viseObjet = params.get("objet");
  const viseDepot = params.get("depot");
  const [nature, setNature] = useState<Nature>("client");
  const en = useEncoursGroupe({ source: v.source, contexte: v.contexte, client_id: v.client_id, nature, codes, objets, inscrireExemple: v.deposer, relireReferentiel: v.relire });
  const rc = useReciproquesGroupe({ source: v.source, contexte: v.contexte, client_id: v.client_id, onFait: v.setFait });
  const ca = useCaisses({ source: v.source, contexte: v.contexte, client_id: v.client_id });
  const [societe, setSociete] = useState<string | null>(null);
  /* la recherche de chaque rapport (Search accounts…) */
  const [rqEncours, setRqEncours] = useState("");
  const [rqRecip, setRqRecip] = useState("");
  const [rqCaisses, setRqCaisses] = useState("");
  /* « + » d'une section de Ce matin : ?nouveau=balance ouvre le dépôt d'une balance âgée */
  const [nouveauVu, setNouveauVu] = useState(false);
  if (!nouveauVu && params.get("nouveau") === "balance" && en.peutDeposer) {
    setNouveauVu(true);
    en.setDepot(true);
  }
  const { ouvert: fOuvert, setOuvert: setFOuvert, boite: fBoite } = useOuvert<HTMLDivElement>();
  const { ouvert: dOuvert, setOuvert: setDOuvert, boite: dBoite } = useOuvert<HTMLDivElement>();
  const { ouvert: nOuvert, setOuvert: setNOuvert, boite: nBoite } = useOuvert<HTMLDivElement>();
  const { ouvert: eOuvert, setOuvert: setEOuvert, boite: eBoite } = useOuvert<HTMLDivElement>();

  /* un repère de balance âgée désigne son dépôt (dans la nature choisie : clients d'abord) */
  const depotVise = viseDepot ? en.courants.find((c) => c.depot_id === viseDepot) : null;

  const nomSociete = societe ? societes.find((s) => s.entite_id === societe)?.nom : null;
  const courants = en.courants.filter((c) => !societe || c.entite_id === societe);
  const magasins = ca.magasins.filter((m) => !societe || m.entite_id === societe);
  const reciproques = rc.liste.filter((r) => !societe || r.creancier_id === societe || r.debiteur_id === societe);
  const q = (t: string) => t.trim().toLowerCase();
  const encoursAffiches = en.visibles.filter((g) => !q(rqEncours) || `${g.code_groupe} ${g.nom_groupe}`.toLowerCase().includes(q(rqEncours)));
  const recipAffichees = reciproques.filter((r) => !q(rqRecip) || `${r.creancier} ${r.debiteur}`.toLowerCase().includes(q(rqRecip)));
  const magasinsAffiches = magasins.filter((m) => !q(rqCaisses) || `${m.magasin} ${m.societe}`.toLowerCase().includes(q(rqCaisses)));
  const exporte = (n: number) => v.setFait(`${n} ligne${n > 1 ? "s" : ""} exportée${n > 1 ? "s" : ""} en CSV.`);
  const evolution = ca.avant ? Math.round(((ca.hier - ca.avant) / ca.avant) * 1000) / 10 : null;
  const libelleNature = nature === "client" ? "Clients" : "Fournisseurs";
  const ouvrirObjet = (id: string) => routeur.push(`${RACINE}/varelo/referentiel?objet=${encodeURIComponent(id)}&nature=${nature}`);
  const chargement = v.source === "reelle" && (!en.reel || !rc.reelles || !ca.reels);

  const colonnesEncours = nature === "client" ? "minmax(200px, 1.6fr) 80px 120px 110px 100px 110px 150px 170px" : "minmax(200px, 1.6fr) 80px 120px 110px 100px 150px";

  return (
    <VarCarte className="var--plain">
      <div className="var-n-page">
        <header className="var-n-tete">
          <h1 className="var-n-h1">Finance</h1>
          <div className="var-n-boutons">
            <div ref={fBoite} style={{ position: "relative" }}>
              <button type="button" className="var-n-bouton" aria-haspopup="menu" aria-expanded={fOuvert} onClick={() => setFOuvert((o) => !o)}>
                <PlainIcone nom="Filtres" />
                {nomSociete ?? "Filtre"}
              </button>
              {fOuvert ? (
                <MenuPlain
                  libelle="Filtrer par société"
                  style={{ top: 36, right: 0, minWidth: 235 }}
                  onFermer={() => setFOuvert(false)}
                  options={[{ libelle: "Toutes les sociétés", coche: !societe, action: () => setSociete(null) }, ...societes.map((s) => ({ libelle: s.nom, coche: societe === s.entite_id, action: () => setSociete(s.entite_id) }))]}
                />
              ) : null}
            </div>
            {en.peutDeposer || ca.peutDeposer ? (
              <div ref={dBoite} style={{ position: "relative" }}>
                <button type="button" className="var-n-bouton" aria-haspopup="menu" aria-expanded={dOuvert} onClick={() => setDOuvert((o) => !o)}>
                  <PlainIcone nom="Plus" />
                  Déposer
                </button>
                {dOuvert ? (
                  <MenuPlain
                    libelle="Déposer"
                    style={{ top: 36, right: 0, minWidth: 235 }}
                    onFermer={() => setDOuvert(false)}
                    options={[...(en.peutDeposer ? [{ libelle: "Une balance âgée", action: () => en.setDepot(true) }] : []), ...(ca.peutDeposer ? [{ libelle: "Des ventes de caisse", action: () => ca.setDepot(true) }] : [])]}
                  />
                ) : null}
              </div>
            ) : null}
            <div ref={nBoite} style={{ position: "relative" }}>
              <button type="button" className="var-n-bouton" aria-haspopup="menu" aria-expanded={nOuvert} onClick={() => setNOuvert((o) => !o)}>
                Nature <span className="var-n-valeur-bouton">{libelleNature}</span>
                <PlainIcone nom="ChevronBas" className="var-n-chevron" />
              </button>
              {nOuvert ? (
                <MenuPlain
                  libelle="Nature de l'encours"
                  style={{ top: 36, right: 0, minWidth: 199 }}
                  onFermer={() => setNOuvert(false)}
                  options={[
                    { libelle: "Clients", coche: nature === "client", action: () => setNature("client") },
                    { libelle: "Fournisseurs", coche: nature === "fournisseur", action: () => setNature("fournisseur") },
                  ]}
                />
              ) : null}
            </div>
            {rc.peutExporter ? (
              <div ref={eBoite} style={{ position: "relative" }}>
                <button type="button" className="var-n-bouton" aria-haspopup="menu" aria-expanded={eOuvert} onClick={() => setEOuvert((o) => !o)} disabled={rc.exportEnCours || rc.liste.length === 0}>
                  Export <span className="var-n-valeur-bouton">CSV</span>
                  <PlainIcone nom="ChevronBas" className="var-n-chevron" />
                </button>
                {eOuvert ? <MenuPlain libelle="Export" style={{ top: 36, right: 0, minWidth: 199 }} onFermer={() => setEOuvert(false)} options={[{ libelle: "Comptes réciproques (CSV)", icone: "Telecharger", action: () => void rc.telecharger() }]} /> : null}
              </div>
            ) : null}
          </div>
        </header>

        <div className="var-n-defile">
          {en.erreur || rc.erreur || ca.erreur ? (
            <p className="var-p-texte-libre" role="alert">
              La base réelle n&apos;a pas répondu. {en.erreur ?? rc.erreur ?? ca.erreur}
            </p>
          ) : null}
          {chargement ? <p className="var-p-texte-libre">Lecture de l&apos;encours, des réciproques et des caisses…</p> : null}

          <Section titre="Vue d'ensemble">
            <div className="var-n-grille">
              <div className="var-n-carte">
                <div className="var-n-carte-tete">
                  <p className="var-n-carte-titre" title="Hors intragroupe, d'après la dernière balance âgée de chaque société">
                    Encours du groupe — {libelleNature.toLowerCase()}
                    <PlainIcone nom="Info" />
                    <span className="var-n-droite">
                      <Agent texte={`Encours du groupe (${libelleNature.toLowerCase()}) : ${montant(en.totaux.total)}, dont ${montant(en.totaux.echu)} échus et ${montant(en.totaux.plus90)} à plus de 90 jours. Par société : ${courants.map((c) => `${c.societe} ${montant(c.total)} (balance du ${dateCourte(c.arrete_le)})`).join(" ; ")}.`} />
                    </span>
                  </p>
                  <p className="var-n-valeur">
                    {k(en.totaux.total)} <small>dont {k(en.totaux.echu)} échus</small>
                  </p>
                </div>
                <Barres valeurs={courants.map((c) => ({ libelle: c.societe, valeur: c.total }))} />
              </div>
              <div className="var-n-carte">
                <div className="var-n-carte-tete">
                  <p className="var-n-carte-titre" title="Échu depuis plus de 90 jours, hors intragroupe">
                    Échu à plus de 90 jours
                    <PlainIcone nom="Info" />
                    <span className="var-n-droite">
                      <Agent texte={`Échu à plus de 90 jours : ${montant(en.totaux.plus90)}. ${en.groupe.filter((g) => !g.intragroupe && g.echu_plus_90 > 0).map((g) => `${g.nom_groupe} ${montant(g.echu_plus_90)}`).join(" ; ")}.`} />
                    </span>
                  </p>
                  <p className="var-n-valeur">
                    {k(en.totaux.plus90)} <small>{nature === "client" ? `${en.totaux.depasses} au-dessus du plafond` : `intragroupe à part : ${k(en.totaux.intragroupe)}`}</small>
                  </p>
                </div>
                <Barres valeurs={en.groupe.filter((g) => !g.intragroupe && g.echu_plus_90 > 0).slice(0, 8).map((g) => ({ libelle: g.nom_groupe, valeur: g.echu_plus_90 }))} />
              </div>
              <div className="var-n-carte">
                <div className="var-n-carte-tete">
                  <p className="var-n-carte-titre" title="Le Z de chaque magasin, hier, pour tout le groupe">
                    Ventes des caisses hier
                    <PlainIcone nom="Info" />
                    <span className="var-n-droite">
                      <Agent texte={`Ventes des caisses hier : ${montant(ca.hier)} (semaine dernière ${montant(ca.avant)}). ${magasins.map((m) => `${m.magasin} ${m.hier_ttc === null ? "rien remonté" : montant(m.hier_ttc)}`).join(" ; ")}.`} />
                    </span>
                  </p>
                  <p className="var-n-valeur">
                    {k(ca.hier)} <small>{evolution === null ? "pas de semaine dernière" : `${evolution > 0 ? "+" : ""}${evolution.toLocaleString("fr-FR")} % sur une semaine`}</small>
                  </p>
                </div>
                <Barres valeurs={magasins.map((m) => ({ libelle: m.magasin, valeur: m.hier_ttc ?? 0 }))} />
              </div>
            </div>
          </Section>

          <Section titre={`Encours — ${libelleNature.toLowerCase()}`}>
            <div className="var-n-grille">
              <Repartition titre={`Par ${en.libelle.un} du groupe`} info="Les plus gros encours du groupe" lignes={en.groupe.filter((g) => !g.intragroupe).sort((a, b) => b.total - a.total).map((g) => ({ cle: g.objet_id, nom: g.nom_groupe, valeur: g.total, texte: k(g.total), badge: g.depasse ? { texte: "> plafond", teinte: "rouge" as const } : undefined }))} />
              <Repartition titre="Échu par objet" info="La part échue de l'encours" lignes={en.groupe.filter((g) => !g.intragroupe && g.echu > 0).sort((a, b) => b.echu - a.echu).map((g) => ({ cle: g.objet_id, nom: g.nom_groupe, valeur: g.echu, texte: k(g.echu), badge: g.echu_plus_90 ? { texte: `${k(g.echu_plus_90)} > 90 j`, teinte: "rouge" as const } : undefined }))} />
              <Repartition titre="La balance de chaque société" info="Plus de 7 jours : à redéposer" lignes={courants.map((c) => ({ cle: c.depot_id, nom: `${c.societe} · au ${dateCourte(c.arrete_le)}`, valeur: c.total, texte: k(c.total), badge: c.age_jours > 7 ? { texte: `${c.age_jours} jours`, teinte: "rouge" as const } : { texte: "à jour", teinte: "vert" as const } }))} />
            </div>
            {societes.filter((s) => !en.courants.some((c) => c.entite_id === s.entite_id)).length ? (
              <p className="var-n-gris" style={{ fontSize: 12, padding: "0 12px" }}>
                Sans balance {en.libelle.des} : {societes.filter((s) => !en.courants.some((c) => c.entite_id === s.entite_id)).map((s) => s.nom).join(", ")}.
              </p>
            ) : null}
            {depotVise ? (
              <p className="var-n-gris" style={{ fontSize: 12, padding: "0 12px" }} data-vise="">
                Balance de {depotVise.societe} arrêtée au {dateCourte(depotVise.arrete_le)} ({depotVise.age_jours} jours) : à redéposer.
              </p>
            ) : null}
            <div className="var-n-rapport">
              <OutilsRapport recherche={rqEncours} setRecherche={setRqEncours} exporter={() => exporte(exporterCsv(`encours-${en.libelle.des}`, ["Code", "Nom", "Sociétés", "Encours", "Échu", "Échu > 90 j", "Plafond", "État"], encoursAffiches.map((g) => [g.code_groupe, g.nom_groupe, g.societes, g.total, g.echu, g.echu_plus_90, g.plafond, g.depasse ? "Au-dessus du plafond" : g.intragroupe ? "Intragroupe" : g.provisoire ? "Provisoire" : ""])))} />
              <div className="var-n-ligne var-n-ligne--tete" style={{ gridTemplateColumns: colonnesEncours }}>
                <span>
                  <PlainIcone nom="Batiment" taille={14} />
                  {en.libelle.le}
                </span>
                <span className="var-n-num">Sociétés</span>
                <span className="var-n-num">Encours</span>
                <span className="var-n-num">Échu</span>
                <span className="var-n-num">&gt; 90 j</span>
                {nature === "client" ? <span className="var-n-num">Plafond</span> : null}
                <span>État</span>
                {nature === "client" ? <span /> : null}
              </div>
              {encoursAffiches.map((g) => {
                const d = en.decisionDe("relever_plafond", g.objet_id);
                return (
                  <div key={g.objet_id} className="var-n-ligne" style={{ gridTemplateColumns: colonnesEncours }} data-vise={g.objet_id === viseObjet ? "" : undefined}>
                    <button type="button" className="var-n-cellule-nom" onClick={() => ouvrirObjet(g.objet_id)}>
                      <PlainIcone nom="Batiment" />
                      {g.code_groupe} {g.nom_groupe}
                    </button>
                    <span className="var-n-num">{g.societes}</span>
                    <span className="var-n-num">{montant(g.total)}</span>
                    <span className="var-n-num">{montant(g.echu)}</span>
                    <span className="var-n-num">{montant(g.echu_plus_90)}</span>
                    {nature === "client" ? <span className="var-n-num var-n-gris">{g.plafond === null ? "N/A" : montant(g.plafond)}</span> : null}
                    <span className="var-n-gris">{g.depasse ? "Au-dessus du plafond" : g.intragroupe ? "Intragroupe" : g.provisoire ? "Provisoire" : g.societes > 1 ? `${g.societes} sociétés` : "Une société"}</span>
                    {nature === "client" ? (
                      <span className="var-n-actions">
                        {g.intragroupe || !en.peutProposer ? null : d && d.statut === "en_attente" ? (
                          <span className="var-n-badge" title={d.calcul}>
                            {etiquetteDecision(d).libelle}
                          </span>
                        ) : (
                          <button type="button" className="var-p-second" onClick={() => en.setProposition(g)}>
                            Proposer
                          </button>
                        )}
                        {!g.intragroupe && en.peutPlafond ? (
                          <button type="button" className="var-p-second" onClick={() => en.setPlafond(g)}>
                            Plafond
                          </button>
                        ) : null}
                      </span>
                    ) : null}
                  </div>
                );
              })}
              <div className="var-n-ligne var-n-ligne--pied" style={{ gridTemplateColumns: colonnesEncours }}>
                <span>Total</span>
                <span />
                <span className="var-n-num">{montant(en.totaux.total)}</span>
                <span className="var-n-num">{montant(en.totaux.echu)}</span>
                <span className="var-n-num">{montant(en.totaux.plus90)}</span>
              </div>
              {en.groupe.length > en.visibles.length ? (
                <div className="var-n-plus">
                  <button type="button" className="var-p-second" onClick={() => en.setTout(true)}>
                    Voir les {en.groupe.length}
                  </button>
                </div>
              ) : null}
              {en.nonRanges.length ? (
                <p className="var-n-gris" style={{ fontSize: 12, padding: "8px 20px" }}>
                  {en.nonRanges.length} ligne{en.nonRanges.length > 1 ? "s" : ""} de balance sous un code pas encore rangé : le prochain passage les rattache.
                </p>
              ) : null}
            </div>
          </Section>

          <Section titre="Réciproques intragroupe">
            <div className="var-n-grille">
              <div className="var-n-carte">
                <div className="var-n-carte-tete">
                  <p className="var-n-carte-titre" title="À traiter avant la clôture">
                    Écarts à traiter
                    <PlainIcone nom="Info" />
                    <span className="var-n-droite">
                      <Agent texte={`Réciproques intragroupe : ${rc.compte.ouverts} paire(s) à traiter sur ${rc.compte.paires}, ${montant(rc.compte.montant)} en jeu. ${reciproques.map((r) => `${r.creancier} → ${r.debiteur} : écart ${montant(r.ecart)} (${LIBELLE_ETAT_RECIPROQUE[r.etat].libelle})`).join(" ; ")}.`} />
                    </span>
                  </p>
                  <p className="var-n-valeur">
                    {k(rc.compte.montant)} <small>{rc.compte.ouverts} paire{rc.compte.ouverts > 1 ? "s" : ""} sur {rc.compte.paires}</small>
                  </p>
                </div>
                <Barres valeurs={reciproques.filter((r) => r.ecart).map((r) => ({ libelle: `${r.creancier} → ${r.debiteur}`, valeur: Math.abs(r.ecart) }))} />
              </div>
              <Repartition titre="Par paire de sociétés" info="Créance de l'une, dette reconnue de l'autre" lignes={reciproques.map((r) => ({ cle: `${r.creancier_id}-${r.debiteur_id}`, nom: `${r.creancier} → ${r.debiteur}`, valeur: Math.abs(r.ecart), texte: k(Math.abs(r.ecart)), badge: { texte: LIBELLE_ETAT_RECIPROQUE[r.etat].libelle, teinte: r.etat === "concorde" || r.etat === "justifie" ? ("vert" as const) : ("rouge" as const) } }))} />
              <div className="var-n-carte">
                <div className="var-n-carte-tete">
                  <p className="var-n-carte-titre">
                    Concordantes ou justifiées
                    <PlainIcone nom="Info" />
                    <span className="var-n-droite">
                      <Agent texte={`${rc.compte.concordes} paire(s) de comptes réciproques concordantes ou justifiées sur ${rc.compte.paires}.`} />
                    </span>
                  </p>
                  <p className="var-n-valeur">
                    {rc.compte.concordes} <small>paire{rc.compte.concordes > 1 ? "s" : ""}</small>
                  </p>
                </div>
                {rc.compte.ouverts === 0 ? (
                  <div className="var-n-encadre">
                    <strong>Aucun écart ouvert</strong>
                    <p>Les comptes réciproques concordent.</p>
                  </div>
                ) : null}
              </div>
            </div>
            <div className="var-n-rapport">
              <OutilsRapport recherche={rqRecip} setRecherche={setRqRecip} exporter={() => exporte(exporterCsv("reciproques-affichees", ["Créancier", "Débiteur", "Créance", "Dette reconnue", "Écart", "État"], recipAffichees.map((r) => [r.creancier, r.debiteur, r.creance, r.dette, r.ecart, LIBELLE_ETAT_RECIPROQUE[r.etat].libelle])))} />
              <div className="var-n-ligne var-n-ligne--tete" style={{ gridTemplateColumns: "minmax(220px, 1.6fr) 130px 130px 120px 180px 110px" }}>
                <span>Créancier → débiteur</span>
                <span className="var-n-num">Créance</span>
                <span className="var-n-num">Dette reconnue</span>
                <span className="var-n-num">Écart</span>
                <span>État</span>
                <span />
              </div>
              {recipAffichees.map((r) => (
                <div key={`${r.creancier_id}-${r.debiteur_id}`} className="var-n-ligne" style={{ gridTemplateColumns: "minmax(220px, 1.6fr) 130px 130px 120px 180px 110px" }}>
                  <span className="var-n-cellule-nom" style={{ marginLeft: -12 }}>
                    <PlainIcone nom="Batiment" />
                    {r.creancier} → {r.debiteur}
                  </span>
                  <span className="var-n-num">{r.creance === null ? "N/A" : montant(r.creance)}</span>
                  <span className="var-n-num">{r.dette === null ? "N/A" : montant(r.dette)}</span>
                  <span className="var-n-num">{montant(r.ecart)}</span>
                  <span className="var-n-gris" title={r.etat === "justifie" && r.motif ? `${CATEGORIES_ECART.find((c) => c.cle === r.categorie)?.libelle ?? r.categorie} — ${r.motif}` : undefined}>
                    {LIBELLE_ETAT_RECIPROQUE[r.etat].libelle}
                  </span>
                  <span className="var-n-actions">
                    {(r.etat === "ecart" || r.etat === "dates_differentes") && rc.peutJustifier ? (
                      <button type="button" className="var-p-second" onClick={() => rc.setCible(r)}>
                        Justifier
                      </button>
                    ) : null}
                  </span>
                </div>
              ))}
              {reciproques.length === 0 ? <p className="var-p-texte-libre">Aucune paire : les balances de deux sociétés du groupe ne se répondent pas encore.</p> : null}
            </div>
          </Section>

          <Section titre="Ventes des caisses">
            <div className="var-n-rapport">
              <OutilsRapport recherche={rqCaisses} setRecherche={setRqCaisses} exporter={() => exporte(exporterCsv("ventes-caisses", ["Magasin", "Société", "Hier", "Tickets hier", "Semaine dernière", "Mois en cours", "Dernier Z"], magasinsAffiches.map((m) => [m.magasin, m.societe, m.hier_ttc, m.hier_tickets, m.semaine_derniere_ttc, m.mois_ttc, m.dernier_jour])))} />
              <div className="var-n-ligne var-n-ligne--tete" style={{ gridTemplateColumns: "minmax(200px, 1.4fr) minmax(160px, 1fr) 120px 140px 130px 200px" }}>
                <span>Magasin</span>
                <span>Société</span>
                <span className="var-n-num">Hier</span>
                <span className="var-n-num">Semaine dernière</span>
                <span className="var-n-num">Mois en cours</span>
                <span>État</span>
              </div>
              {magasinsAffiches.map((m) => {
                const ecart = m.hier_ttc !== null && m.semaine_derniere_ttc ? Math.round(((m.hier_ttc - m.semaine_derniere_ttc) / m.semaine_derniere_ttc) * 100) : null;
                return (
                  <div key={`${m.entite_id}-${m.magasin}`} className="var-n-ligne" style={{ gridTemplateColumns: "minmax(200px, 1.4fr) minmax(160px, 1fr) 120px 140px 130px 200px" }}>
                    <span className="var-n-cellule-nom" style={{ marginLeft: -12 }}>
                      <PlainIcone nom="Batiment" />
                      {m.magasin}
                      {m.hier_tickets !== null ? <span className="var-n-gris" style={{ fontWeight: 400 }}>{m.hier_tickets} tickets</span> : null}
                    </span>
                    <span className="var-n-gris">{m.societe}</span>
                    <span className="var-n-num">{m.hier_ttc === null ? "N/A" : montant(m.hier_ttc)}</span>
                    <span className="var-n-num">{m.semaine_derniere_ttc === null ? "N/A" : montant(m.semaine_derniere_ttc)}</span>
                    <span className="var-n-num">{m.mois_ttc === null ? "N/A" : montant(m.mois_ttc)}</span>
                    <span className="var-n-gris">{m.hier_ttc === null ? `Rien remonté hier${m.dernier_jour ? ` (dernier Z le ${dateCourte(m.dernier_jour)})` : ""}` : ecart !== null && ecart <= -20 ? `${ecart} % sur une semaine` : ecart !== null ? `à jour (${ecart > 0 ? "+" : ""}${ecart} %)` : "à jour"}</span>
                  </div>
                );
              })}
              <div className="var-n-ligne var-n-ligne--pied" style={{ gridTemplateColumns: "minmax(200px, 1.4fr) minmax(160px, 1fr) 120px 140px 130px 200px" }}>
                <span>Total</span>
                <span>{ca.muets ? `${ca.muets} muet${ca.muets > 1 ? "s" : ""} hier` : ""}</span>
                <span className="var-n-num">{montant(ca.hier)}</span>
                <span className="var-n-num">{montant(ca.avant)}</span>
              </div>
            </div>
          </Section>

          {/* le pied « Customers helped » de Plain : depuis le début, les codes locaux rangés sous un nom du groupe */}
          <div className="var-n-pied" aria-label="Codes rangés sous un nom du groupe">
            <span className="var-n-pied-depuis">Depuis le début</span>
            <h3 className="var-n-pied-titre">Codes rangés sous un nom</h3>
            <span className="var-n-compteur" aria-label={String(codes.filter((x) => x.objet_id).length)}>
              {String(codes.filter((x) => x.objet_id).length)
                .padStart(3, "0")
                .split("")
                .map((ch, i) => (
                  <span key={i} className="var-n-chiffre">
                    <span>{ch}</span>
                  </span>
                ))}
            </span>
          </div>
        </div>
      </div>

      {en.plafond ? <DialoguePlafond g={en.plafond} onFermer={() => en.setPlafond(null)} regler={en.reglerIci} onFait={v.setFait} /> : null}
      {en.proposition ? <DialoguePlafond g={en.proposition} proposer onFermer={() => en.setProposition(null)} regler={en.proposerIci} onFait={v.setFait} /> : null}
      <DialogueBalance ouvert={en.depot} onFermer={() => en.setDepot(false)} societes={societes} natureDefaut={nature} deposer={en.deposerIci} onFait={v.setFait} />
      {rc.cible ? <DialogueJustification r={rc.cible} onFermer={() => rc.setCible(null)} justifier={rc.justifier} onFait={v.setFait} /> : null}
      {ca.depot ? <DialogueVentes societes={societes} onFermer={() => ca.setDepot(false)} deposer={ca.deposer} onFait={v.setFait} /> : null}
    </VarCarte>
  );
}
