"use client";

/* ══════════════════════════════════════════════════════════════════════
   OFFLOAD — le pilotage sur la page « Reporting » de Plain (28/10/2026)

   Mêmes données et mêmes portes que l'écran d'avant
   (components/espace/offload/Pilotage.tsx : offload_pilotage, offload_arretes_liste,
   offload_valeur_par_segment, offload_restitution_tableur ; l'exemple y vit),
   posées dans les briques de Rapports.tsx : des sections repliables de
   cartes-graphiques. Période et granularité (?periode= ?pas=) rangent les
   vagues ; « Grouper par » choisit l'axe des taux de réponse (?groupe=) ;
   « Filtres » restreint les résultats à une entité (?filtre=). Chaque
   tableau s'exporte toujours vers un tableur (menu « Actions », et sous
   chaque carte).
   ══════════════════════════════════════════════════════════════════════ */

import { useEffect, useMemo, useState } from "react";
import { dateCourte, montant, nombreFr } from "@/components/espace3/base/format";
import { useSource } from "@/components/espace3/base/source";
import { pilotageExemple } from "@/components/espace3/base/offload/Pilotage";
import { chargerArretes, chargerPilotage, chargerSegments, chargerTableau, restituerTableur } from "@/components/espace3/base/offload/portes";
import { restitutionExemple, segmentsExemple } from "@/components/espace3/base/offload/Segments";
import { exporterArrete, exporterSegments, exporterTableau, telechargerFichier, type TableauPilotage } from "@/components/espace3/base/offload/tableur";
import type { Arrete, Pilotage as Donnees, Segment } from "@/components/espace3/base/offload/types";
import { AvisRapport, CarteRapport, CourbeRapport, PERIODES, Rapport, SectionRapport, TableauRapport, jourIso, pluriel, serieDatee, useParametresRapport } from "../lin/Rapports";

const AXES: { cle: keyof Donnees["taux"]; libelle: string }[] = [
  { cle: "segment", libelle: "Segment" },
  { cle: "canal", libelle: "Canal" },
  { cle: "message", libelle: "Message" },
  { cle: "niveau", libelle: "Niveau du signal" },
];
const NIVEAUX: Record<string, string> = {
  eteint: "Éteint",
  decroche: "Décroche",
  saison: "Saison manquée",
  ralentit: "Ralentit",
  ok: "Régulier",
  sans_achat: "Sans achat",
  sous_seuil: "Sous le seuil",
  inconnu: "Inconnu",
};
const EXPORTS: { cle: TableauPilotage; libelle: string }[] = [
  { cle: "vagues", libelle: "Vagues" },
  { cle: "taux", libelle: "Taux de réponse" },
  { cle: "suivi", libelle: "Suivi mensuel" },
  { cle: "entites", libelle: "Entités et sites" },
];
const pct = (v: number | null) => (v === null ? "—" : `${String(Math.round(v * 10) / 10).replace(".", ",")} %`);
const jour = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

export default function Pilotage() {
  const { source } = useSource();
  const { periode, pas, groupe, filtre, lien } = useParametresRapport();
  const [reel, setReel] = useState<Donnees | null>(null);
  const [arretes, setArretes] = useState<Arrete[]>([]);
  const [erreur, setErreur] = useState<string | null>(null);
  const [charge, setCharge] = useState(false);
  const [client, setClient] = useState<string | null>(null);
  const [segments, setSegments] = useState<Segment[] | null>(null);
  const [erreurSegments, setErreurSegments] = useState<string | null>(null);

  useEffect(() => {
    if (source !== "reelle") return;
    let actif = true;
    const t = window.setTimeout(async () => {
      try {
        const [p, a] = await Promise.all([chargerPilotage(null), chargerArretes()]);
        if (actif) {
          setReel(p);
          setArretes(a);
        }
      } catch (e) {
        if (actif) setErreur(e instanceof Error ? e.message : "La base n'a pas répondu.");
      } finally {
        if (actif) setCharge(true);
      }
    }, 0);
    return () => {
      actif = false;
      window.clearTimeout(t);
    };
  }, [source]);

  /* c4_36 : par segment et restitution, avec le client que donne offload_tableau ; gérant ou administrateur */
  useEffect(() => {
    if (source !== "reelle") return;
    let actif = true;
    (async () => {
      try {
        const c = (await chargerTableau())?.client ?? null;
        if (!actif) return;
        setClient(c);
        if (!c) {
          setErreurSegments("OFFLOAD n'est pas installé pour cette organisation.");
          return;
        }
        const l = await chargerSegments(c);
        if (actif) setSegments(l);
      } catch (e) {
        if (actif) setErreurSegments(e instanceof Error ? e.message : "La base n'a pas répondu.");
      }
    })();
    return () => {
      actif = false;
    };
  }, [source]);

  const p = useMemo(() => (source === "exemple" ? pilotageExemple() : reel), [source, reel]);
  const listeArretes: Arrete[] = source === "exemple" && p ? [{ jour: jour(-5), pilotage: p, cree_le: jour(-5) }] : arretes;
  const lesSegments = source === "exemple" ? segmentsExemple() : segments;
  const aujourdhui = jourIso();
  const jours = PERIODES.find((x) => x.cle === periode)?.jours ?? 30;
  const depuis = useMemo(() => {
    const d = new Date(`${aujourdhui}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() - (jours - 1));
    return d.toISOString().slice(0, 10);
  }, [aujourdhui, jours]);

  /* ——— la restitution en tableur (c4_36) ——— */
  const [fichiers, setFichiers] = useState<Record<string, string> | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [erreurRestitution, setErreurRestitution] = useState<string | null>(null);
  const preparer = async () => {
    setErreurRestitution(null);
    if (source === "exemple") {
      setFichiers(restitutionExemple().fichiers);
      return;
    }
    if (!client) return;
    setEnCours(true);
    try {
      setFichiers((await restituerTableur(client)).fichiers);
    } catch (e) {
      setErreurRestitution(e instanceof Error ? e.message : "La base n'a pas répondu.");
    } finally {
      setEnCours(false);
    }
  };

  const axe = (AXES.find((a) => a.cle === groupe) ?? AXES[0]).cle;
  const vagues = p ? p.vagues.filter((v) => v.vague >= depuis) : [];
  const suivi = p ? p.suivi.filter((m) => `${m.mois}-01` >= depuis.slice(0, 7) + "-01") : [];
  const entites = p ? p.entites.par_entite.filter((e) => !filtre || e.societe_id === filtre) : [];
  const sites = p ? p.entites.par_site.filter((s) => !filtre || s.societe_id === filtre) : [];
  const sollicites = vagues.reduce((s, v) => s + v.messages + v.appels, 0);
  const reponses = vagues.reduce((s, v) => s + v.reponses, 0);
  const repris = vagues.reduce((s, v) => s + v.chiffre_repris, 0);
  const enJeu = vagues.reduce((s, v) => s + v.en_jeu, 0);
  const lignesTaux = p?.taux[axe] ?? [];
  const totalSegments = (lesSegments ?? []).reduce((t, s) => t + Number(s.valeur_en_jeu || 0), 0);
  const nbFichiers = fichiers ? Object.entries(fichiers).sort(([a], [b]) => a.localeCompare(b)) : [];
  const lignesCsv = (csv: string) => Math.max(0, csv.split("\n").filter((l) => l.trim() !== "").length - 1);

  return (
    <Rapport
      titre="Pilotage"
      actions={p ? EXPORTS.map((e) => ({ cle: e.cle, libelle: `${e.libelle} en tableur`, action: () => exporterTableau(p, e.cle, aujourdhui) })) : []}
      filtres={[
        { cle: "toutes", libelle: "Toutes les entités", coche: !filtre, href: lien({ filtre: null }) },
        ...(p?.entites.par_entite ?? []).map((e) => ({ cle: e.societe_id, libelle: e.societe, coche: filtre === e.societe_id, href: lien({ filtre: e.societe_id }) })),
      ]}
      filtreLibelle={filtre ? (p?.entites.par_entite.find((e) => e.societe_id === filtre)?.societe ?? undefined) : undefined}
      groupes={AXES.map((a) => ({ cle: a.cle, libelle: a.libelle, coche: a.cle === axe, href: lien({ groupe: a.cle === "segment" ? null : a.cle }) }))}
      groupeLibelle={AXES.find((a) => a.cle === axe)?.libelle}
      avis={
        <>
          {erreur ? (
            <AvisRapport teinte="rouge" role="alert">
              <strong>La base réelle n&apos;a pas répondu.</strong> {erreur}
            </AvisRapport>
          ) : null}
          {source === "reelle" && charge && !p && !erreur ? <AvisRapport>Le pilotage consolidé se lit par le gérant, l&apos;administrateur ou le valideur.</AvisRapport> : null}
        </>
      }
    >
      <SectionRapport titre="Vue d'ensemble" meta={p ? `Douze derniers mois, depuis le ${dateCourte(p.depuis)}` : source === "reelle" && !charge ? "Calcul du pilotage…" : undefined}>
        <CarteRapport
          titre="Chiffre repris HT"
          info="Les achats des comptes sollicités dans les 90 jours qui suivent la vague."
          chiffre={montant(repris)}
          legende={pluriel(vagues.length, "vague")}
          etat={repris > 0 ? "vert" : "gris"}
          etatTitre={repris > 0 ? "Des achats repris" : "Rien de repris sur la période"}
        >
          <CourbeRapport
            libelle="Chiffre repris HT, vague par vague"
            serie={serieDatee(
              vagues.map((v) => ({ jour: v.vague, valeur: v.chiffre_repris })),
              periode,
              pas,
            )}
          />
        </CarteRapport>
        <CarteRapport
          titre="Valeur en jeu HT"
          info="La valeur annuelle attendue des comptes sollicités, figée à l'ouverture de la vague."
          chiffre={montant(enJeu)}
          legende={pluriel(
            vagues.reduce((s, v) => s + v.comptes, 0),
            "compte sollicité",
            "comptes sollicités",
          )}
          etat={enJeu > 0 ? "vert" : "gris"}
        >
          <CourbeRapport
            libelle="Valeur en jeu HT, vague par vague"
            serie={serieDatee(
              vagues.map((v) => ({ jour: v.vague, valeur: v.en_jeu })),
              periode,
              pas,
            )}
          />
        </CarteRapport>
        <CarteRapport
          titre="Taux de réponse"
          info="Les réponses reçues rapportées aux messages et appels de la période."
          chiffre={pct(sollicites ? (reponses / sollicites) * 100 : null)}
          legende={`${reponses} sur ${pluriel(sollicites, "sollicitation")}`}
          etat={sollicites === 0 ? "gris" : reponses / sollicites < 0.2 ? "orange" : "vert"}
          etatTitre={sollicites && reponses / sollicites < 0.2 ? "Moins d'une réponse sur cinq" : undefined}
        >
          <CourbeRapport
            libelle="Réponses reçues, vague par vague"
            serie={serieDatee(
              vagues.map((v) => ({ jour: v.vague, valeur: v.reponses })),
              periode,
              pas,
            )}
            format={(v) => pluriel(Math.round(v), "réponse")}
          />
        </CarteRapport>
      </SectionRapport>

      <SectionRapport titre="Taux de réponse comparés" meta={`Par ${(AXES.find((a) => a.cle === axe)?.libelle ?? "").toLowerCase()}`}>
        <CarteRapport
          taille="pleine"
          titre={`Par ${(AXES.find((a) => a.cle === axe)?.libelle ?? "").toLowerCase()}`}
          info="Une réponse est un règlement, un retour ou une commande dans les quinze jours."
          chiffre={pct(sollicites ? (reponses / sollicites) * 100 : null)}
          legende="toutes sollicitations confondues"
          etat={lignesTaux.length ? "vert" : "gris"}
          droite={
            p ? (
              <button type="button" className="rap-lien" onClick={() => exporterTableau(p, "taux", aujourdhui)}>
                Tableur
              </button>
            ) : null
          }
        >
          {lignesTaux.length ? (
            <TableauRapport
              libelle="Taux de réponse"
              colonnes={[{ libelle: AXES.find((a) => a.cle === axe)?.libelle ?? "" }, { libelle: "Sollicités", num: true }, { libelle: "Réponses", num: true }, { libelle: "Taux", num: true }]}
            >
              {lignesTaux.map((l) => (
                <tr key={l.valeur}>
                  <td>{axe === "niveau" ? (NIVEAUX[l.valeur] ?? l.valeur) : l.valeur}</td>
                  <td className="rap-num">{nombreFr(l.sollicites)}</td>
                  <td className="rap-num">{nombreFr(l.reponses)}</td>
                  <td className="rap-num">
                    <span className="rap-part">
                      <i aria-hidden="true">
                        <b style={{ width: `${Math.min(100, l.taux ?? 0)}%` }} />
                      </i>
                      <span style={{ minWidth: 52, textAlign: "right" }}>{pct(l.taux)}</span>
                    </span>
                  </td>
                </tr>
              ))}
            </TableauRapport>
          ) : (
            <p className="rap-sous">Aucune sollicitation.</p>
          )}
        </CarteRapport>
      </SectionRapport>

      <SectionRapport titre="Suivi mensuel" meta="Mois par mois, à la granularité « Par mois »">
        <CarteRapport
          titre="Échéances honorées"
          info="Dont celles honorées après un message d'OFFLOAD."
          chiffre={nombreFr(suivi.reduce((s, m) => s + m.echeances_honorees, 0))}
          legende={`dont ${suivi.reduce((s, m) => s + m.echeances_apres_message, 0)} après message`}
          etat={suivi.length ? "vert" : "gris"}
        >
          <CourbeRapport
            libelle="Échéances honorées par mois"
            serie={serieDatee(
              suivi.map((m) => ({ jour: `${m.mois}-01`, valeur: m.echeances_honorees })),
              periode,
              "mois",
            )}
            format={(v) => pluriel(Math.round(v), "échéance")}
          />
        </CarteRapport>
        <CarteRapport
          titre="Commandes reprises"
          info="Les commandes passées par des comptes sollicités, et leur chiffre HT."
          chiffre={nombreFr(suivi.reduce((s, m) => s + m.commandes_reprises, 0))}
          legende={`${montant(suivi.reduce((s, m) => s + m.chiffre_repris, 0))} HT`}
          etat={suivi.length ? "vert" : "gris"}
        >
          <CourbeRapport
            libelle="Chiffre repris HT par mois"
            serie={serieDatee(
              suivi.map((m) => ({ jour: `${m.mois}-01`, valeur: m.chiffre_repris })),
              periode,
              "mois",
            )}
          />
        </CarteRapport>
        <CarteRapport
          titre="Affaires retirées"
          info="Les affaires restées en plan que le client est venu reprendre, et la valeur libérée."
          chiffre={nombreFr(suivi.reduce((s, m) => s + m.affaires_retirees, 0))}
          legende={`${montant(suivi.reduce((s, m) => s + m.valeur_liberee, 0))} libérés`}
          etat={suivi.length ? "vert" : "gris"}
        >
          <CourbeRapport
            libelle="Valeur libérée HT par mois"
            serie={serieDatee(
              suivi.map((m) => ({ jour: `${m.mois}-01`, valeur: m.valeur_liberee })),
              periode,
              "mois",
            )}
          />
        </CarteRapport>
      </SectionRapport>

      <SectionRapport titre="Entités et sites" meta={filtre ? "Une entité" : "Par entité, par site et en consolidé"}>
        <CarteRapport
          taille="pleine"
          titre="Résultats"
          info="Comptes sollicités, réponses, commandes et chiffre repris, par entité puis par site."
          chiffre={p?.entites.consolide ? montant(p.entites.consolide.chiffre_repris) : "—"}
          legende="repris en consolidé"
          etat={entites.length ? "vert" : "gris"}
          droite={
            p ? (
              <button type="button" className="rap-lien" onClick={() => exporterTableau(p, "entites", aujourdhui)}>
                Tableur
              </button>
            ) : null
          }
        >
          {entites.length ? (
            <TableauRapport
              libelle="Résultats par entité et par site"
              colonnes={[
                { libelle: "Entité / site" },
                { libelle: "Comptes", num: true },
                { libelle: "Réponses", num: true },
                { libelle: "Commandes", num: true },
                { libelle: "Chiffre repris HT", num: true },
                { libelle: "Échéances honorées", num: true },
                { libelle: "Affaires retirées", num: true },
              ]}
            >
              {entites.map((e) => (
                <FragmentEntite key={e.societe_id} e={e} sites={sites.filter((s) => s.societe_id === e.societe_id)} />
              ))}
              {p?.entites.consolide && !filtre ? (
                <tr data-total="">
                  <td>Consolidé</td>
                  <td className="rap-num">{nombreFr(p.entites.consolide.comptes)}</td>
                  <td className="rap-num">{nombreFr(p.entites.consolide.reponses)}</td>
                  <td className="rap-num">{nombreFr(p.entites.consolide.commandes)}</td>
                  <td className="rap-num">{montant(p.entites.consolide.chiffre_repris)}</td>
                  <td className="rap-num">{nombreFr(p.entites.consolide.echeances_honorees)}</td>
                  <td className="rap-num">{nombreFr(p.entites.consolide.affaires_retirees)}</td>
                </tr>
              ) : null}
            </TableauRapport>
          ) : (
            <p className="rap-sous">Aucun résultat sur la période.</p>
          )}
        </CarteRapport>
      </SectionRapport>

      <SectionRapport titre="Arrêtés et restitution" meta="Posés la nuit à date fixe ; réservé au gérant et à l'administrateur">
        <CarteRapport
          taille="large"
          titre="Arrêtés"
          info="Un arrêté fige vagues, taux, suivi et entités à la date réglée (le 1er du mois par défaut)."
          chiffre={nombreFr(listeArretes.length)}
          legende={listeArretes.length ? `le dernier au ${dateCourte(listeArretes[0].jour)}` : "aucun encore"}
          etat={listeArretes.length ? "vert" : "gris"}
        >
          {listeArretes.length ? (
            <TableauRapport libelle="Arrêtés" colonnes={[{ libelle: "Arrêté du" }, { libelle: "Contenu" }, { libelle: "", num: true }]}>
              {listeArretes.map((a) => (
                <tr key={a.jour}>
                  <td>{dateCourte(a.jour)}</td>
                  <td>
                    <small>vagues, taux, suivi, entités</small>
                  </td>
                  <td className="rap-num">
                    <button type="button" className="rap-lien" onClick={() => exporterArrete(a.pilotage, a.jour)}>
                      Télécharger en tableur
                    </button>
                  </td>
                </tr>
              ))}
            </TableauRapport>
          ) : (
            <p className="rap-sous">Aucun arrêté encore : le premier sera posé la nuit du jour réglé.</p>
          )}
        </CarteRapport>
        <CarteRapport
          taille="large"
          titre="Valeur en jeu par segment"
          info="Le segment est le secteur du compte. En jeu : la valeur annuelle des comptes qui décrochent, ralentissent, ont manqué leur saison ou se sont éteints."
          chiffre={lesSegments ? montant(totalSegments) : "—"}
          legende={
            lesSegments
              ? pluriel(
                  lesSegments.reduce((t, s) => t + Number(s.a_risque || 0), 0),
                  "compte à risque",
                  "comptes à risque",
                )
              : (erreurSegments ?? "Lecture des segments…")
          }
          etat={lesSegments?.length ? "vert" : "gris"}
          droite={
            lesSegments?.length ? (
              <button type="button" className="rap-lien" onClick={() => exporterSegments(lesSegments, aujourdhui)}>
                Tableur
              </button>
            ) : null
          }
        >
          {lesSegments?.length ? (
            <TableauRapport
              libelle="Valeur en jeu par segment"
              colonnes={[{ libelle: "Segment" }, { libelle: "Valeur en jeu HT", num: true }, { libelle: "À risque", num: true }, { libelle: "Suivis", num: true }, { libelle: "Reprises", num: true }]}
            >
              {lesSegments.map((s) => (
                <tr key={s.segment}>
                  <td>{s.segment}</td>
                  <td className="rap-num">
                    <span className="rap-part">
                      <i aria-hidden="true">
                        <b style={{ width: `${totalSegments > 0 ? Math.round((Number(s.valeur_en_jeu) / totalSegments) * 100) : 0}%` }} />
                      </i>
                      <span style={{ minWidth: 88, textAlign: "right" }}>{montant(s.valeur_en_jeu)}</span>
                    </span>
                  </td>
                  <td className="rap-num">{nombreFr(s.a_risque)}</td>
                  <td className="rap-num">{nombreFr(s.comptes)}</td>
                  <td className="rap-num">{nombreFr(s.reprises_en_cours)}</td>
                </tr>
              ))}
            </TableauRapport>
          ) : (
            <p className="rap-sous">{erreurSegments ?? (lesSegments ? "Aucun compte suivi pour l'instant." : "Lecture des segments…")}</p>
          )}
        </CarteRapport>
        <CarteRapport
          taille="pleine"
          titre="Restitution en tableur"
          info="Toutes vos données OFFLOAD en fichiers CSV, un par famille, au séparateur « ; ». Chaque restitution est notée au journal."
          chiffre={fichiers ? nombreFr(nbFichiers.length) : "—"}
          legende={fichiers ? pluriel(nbFichiers.length, "fichier prêt", "fichiers prêts") : "comptes, achats, reprises, affaires, échéances, règles"}
          etat={fichiers ? "vert" : "gris"}
        >
          <div className="rap-gestes" style={{ marginBottom: nbFichiers.length ? 12 : 0 }}>
            <button type="button" className="rap-btn rap-btn--petit" onClick={() => void preparer()} disabled={enCours || (source === "reelle" && !client)}>
              {enCours ? "Préparation…" : fichiers ? "Préparer à nouveau" : "Préparer la restitution en tableur"}
            </button>
            {erreurRestitution ? (
              <span className="rap-sous" role="alert">
                {erreurRestitution}
              </span>
            ) : null}
            {fichiers && nbFichiers.length === 0 ? <span className="rap-sous">Aucune donnée à restituer.</span> : null}
          </div>
          {nbFichiers.length ? (
            <TableauRapport libelle="Fichiers de la restitution" colonnes={[{ libelle: "Fichier" }, { libelle: "Lignes", num: true }, { libelle: "", num: true }]}>
              {nbFichiers.map(([nom, csv]) => (
                <tr key={nom}>
                  <td>{nom}</td>
                  <td className="rap-num">{nombreFr(lignesCsv(csv))}</td>
                  <td className="rap-num">
                    <button type="button" className="rap-lien" onClick={() => telechargerFichier(nom, csv)}>
                      Télécharger
                    </button>
                  </td>
                </tr>
              ))}
            </TableauRapport>
          ) : null}
        </CarteRapport>
      </SectionRapport>
    </Rapport>
  );
}

function FragmentEntite({ e, sites }: { e: Donnees["entites"]["par_entite"][number]; sites: Donnees["entites"]["par_site"] }) {
  const ligne = (r: Donnees["entites"]["consolide"] & object) => (
    <>
      <td className="rap-num">{nombreFr(r.comptes)}</td>
      <td className="rap-num">{nombreFr(r.reponses)}</td>
      <td className="rap-num">{nombreFr(r.commandes)}</td>
      <td className="rap-num">{montant(r.chiffre_repris)}</td>
      <td className="rap-num">{nombreFr(r.echeances_honorees)}</td>
      <td className="rap-num">{nombreFr(r.affaires_retirees)}</td>
    </>
  );
  return (
    <>
      <tr>
        <td style={{ fontWeight: 500 }}>{e.societe}</td>
        {ligne(e)}
      </tr>
      {sites.map((s) => (
        <tr key={s.site_id} data-retrait="">
          <td>{s.site}</td>
          {ligne(s)}
        </tr>
      ))}
    </>
  );
}
