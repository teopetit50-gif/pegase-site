"use client";

/* La carte « Le cabinet » (05/10/2026, session B3) : l'état du cabinet
   (logiciel, branchement, mode, dernier relevé), les relevés reçus, ce que
   le logiciel tient (capacités), l'équipe, les fauteuils, les horaires, les
   fermetures, le vocabulaire à classer et les règles. Les écritures passent
   par les portes publiques (brancher, changer le mode) ou par les écritures
   que les politiques prévoient pour le titulaire (fauteuil, horaire,
   fermeture, praticien, vocabulaire, règles). En exemple, tout se joue en
   mémoire. */

import { useState } from "react";
import { Plug, Settings2 } from "lucide-react";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import { Avis, Def, Pastille, Vide } from "../ui";
import { dateHeure } from "../format";
import {
  CAPACITES, DOMAINES_CAPACITE, ETATS_CAPACITE, FAMILLES, JOURS, JOURS_COURTS, MODES_RELEVE, NATURES_FERMETURE, STATUTS_CABINET, STATUTS_RELEVE,
  heureSansSecondes, libelleLogiciel,
} from "./libelles";
import type { Capacite, Dossier, Famille, Fermeture, Horaire, TypeRdv } from "./types";

export type Action =
  | { type: "brancher" }
  | { type: "mode"; mode: "a_blanc" | "reel" }
  | { type: "statut"; statut: "actif" | "coupe" | "clos" }
  | { type: "fauteuil"; nom: string; capacites: Capacite[]; objectif: number | null }
  | { type: "horaire"; jour: number; debut: string; fin: string; fauteuil_id: string | null }
  | { type: "retirer_horaire"; id: string }
  | { type: "fermeture"; debut: string; fin: string; nature: Fermeture["nature"]; fauteuil_id: string | null; praticien_id: string | null }
  | { type: "praticien"; nom_affiche: string; metier: "titulaire" | "collaborateur" | "salarie" | "orthodontiste" | "remplacant" }
  | { type: "classer"; typeRdv: TypeRdv; famille: Famille; statut: "propose" | "valide"; necessite_labo: boolean; chirurgie: boolean; exige_assistante: boolean; duree_defaut_min: number | null };

type Props = { dossier: Dossier; agir: (a: Action) => Promise<void> };

export default function Cabinet({ dossier, agir }: Props) {
  const { cabinet, profil, fauteuils, praticiens, membres, horaires, fermetures, regles, releves, capacites, types } = dossier;
  const titulaire = profil === "titulaire";
  const [dialogue, setDialogue] = useState<null | "fauteuil" | "horaire" | "fermeture" | "praticien" | "classer" | "mode" | "statut">(null);
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [fait, setFait] = useState<string | null>(null);

  /* formulaires */
  const [nomFauteuil, setNomFauteuil] = useState("");
  const [capsFauteuil, setCapsFauteuil] = useState<Capacite[]>(["soins"]);
  const [objectif, setObjectif] = useState("");
  const [jour, setJour] = useState(1);
  const [debut, setDebut] = useState("08:00");
  const [fin, setFin] = useState("12:00");
  const [fauteuilHoraire, setFauteuilHoraire] = useState("");
  const [fermDebut, setFermDebut] = useState("");
  const [fermFin, setFermFin] = useState("");
  const [fermNature, setFermNature] = useState<Fermeture["nature"]>("conge");
  const [fermQui, setFermQui] = useState("");
  const [nomPrat, setNomPrat] = useState("");
  const [metierPrat, setMetierPrat] = useState<"titulaire" | "collaborateur" | "salarie" | "orthodontiste" | "remplacant">("collaborateur");
  const [typeChoisi, setTypeChoisi] = useState<TypeRdv | null>(null);
  const [famille, setFamille] = useState<Famille>("controle");
  const [labo, setLabo] = useState(false);
  const [chir, setChir] = useState(false);
  const [assist, setAssist] = useState(true);
  const [duree, setDuree] = useState("");
  const [modeVoulu, setModeVoulu] = useState<"a_blanc" | "reel">("reel");
  const [statutVoulu, setStatutVoulu] = useState<"actif" | "coupe" | "clos">("coupe");

  const lancer = async (a: Action, message: string) => {
    setOccupe(true);
    setErreur(null);
    try {
      await agir(a);
      setFait(message);
      setDialogue(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base n'a pas répondu.");
    } finally {
      setOccupe(false);
    }
  };

  const ouvrirClasser = (t: TypeRdv) => {
    setTypeChoisi(t);
    setFamille(t.famille ?? "controle");
    setLabo(t.necessite_labo);
    setChir(t.chirurgie);
    setAssist(t.exige_assistante);
    setDuree(t.duree_defaut_min ? String(t.duree_defaut_min) : "");
    setErreur(null);
    setDialogue("classer");
  };

  const s = STATUTS_CABINET[cabinet.statut];
  const aClasser = types.filter((t) => t.statut !== "valide");
  const horairesCabinet = horaires.filter((h) => !h.exceptionnel).sort((a, b) => a.jour - b.jour || a.debut.localeCompare(b.debut));

  return (
    <section id="tiroma-cabinet" className="esp-carte" aria-label="Le cabinet">
      <div className="esp-carte-tete">
        <h2 className="esp-carte-titre">Le cabinet</h2>
        <span className="esp-item-haut">
          <Pastille teinte={s.teinte}>{s.libelle}</Pastille>
          <Pastille teinte={cabinet.mode === "reel" ? "noir" : "gris"} contour>{cabinet.mode === "reel" ? "Mode réel" : "À blanc"}</Pastille>
          {cabinet.releves_douteux_suite ? <Pastille teinte="ambre">{cabinet.releves_douteux_suite} relevé{cabinet.releves_douteux_suite > 1 ? "s" : ""} douteux de suite</Pastille> : null}
        </span>
      </div>
      <div className="esp-carte-corps" style={{ display: "grid", gap: 18 }}>
        {fait ? <Avis teinte="vert" role="status"><strong>C&apos;est fait.</strong> {fait}</Avis> : null}

        <dl className="esp-def esp-def--trois">
          <Def etiquette="Entité">{cabinet.entite_nom ?? cabinet.entite_id.slice(0, 8)}</Def>
          <Def etiquette="Logiciel">{libelleLogiciel(cabinet.logiciel)}{cabinet.logiciel_version ? ` ${cabinet.logiciel_version}` : ""}</Def>
          <Def etiquette="Point du matin">à {heureSansSecondes(cabinet.heure_point)}</Def>
          <Def etiquette="Dernier relevé">{cabinet.dernier_releve_le ? dateHeure(cabinet.dernier_releve_le) : "aucun"}</Def>
          <Def etiquette="Dernier relevé sûr">{cabinet.dernier_releve_ok_le ? dateHeure(cabinet.dernier_releve_ok_le) : "aucun"}</Def>
          <Def etiquette="Partage">{cabinet.perimetre_partage === "cabinet" ? "Tout le cabinet voit les patients" : "Chaque praticien voit ses patients"}</Def>
        </dl>

        {titulaire ? (
          <div className="esp-actions">
            {cabinet.statut === "installation" ? (
              <button type="button" className="r-btn r-btn--noir" disabled={occupe} onClick={() => lancer({ type: "brancher" }, "Le cabinet est branché : les exports du logiciel seront lus dès leur arrivée.")}>
                <Plug width={15} height={15} aria-hidden="true" /> Brancher le logiciel
              </button>
            ) : null}
            <button type="button" className="r-btn r-btn--fil r-btn--petit" onClick={() => { setModeVoulu(cabinet.mode === "reel" ? "a_blanc" : "reel"); setErreur(null); setDialogue("mode"); }}>
              {cabinet.mode === "reel" ? "Repasser à blanc" : "Passer en mode réel"}
            </button>
            {cabinet.statut !== "clos" ? (
              <button type="button" className="r-btn r-btn--fil r-btn--petit" onClick={() => { setStatutVoulu(cabinet.statut === "coupe" ? "actif" : "coupe"); setErreur(null); setDialogue("statut"); }}>
                {cabinet.statut === "coupe" ? "Réactiver" : "Couper"}
              </button>
            ) : null}
          </div>
        ) : null}

        {/* ——— relevés ——— */}
        <div>
          <h3 className="esp-groupe-titre">Relevés du logiciel</h3>
          {!releves.length ? (
            <p className="esp-fil-meta">{titulaire ? "Aucun relevé reçu : branchez le logiciel, puis déposez son premier export." : "Les relevés sont visibles du titulaire."}</p>
          ) : (
            <ul className="esp-fil">
              {releves.slice(0, 6).map((r) => (
                <li key={r.id}>
                  <span className="esp-fil-point" data-teinte={STATUTS_RELEVE[r.statut]?.teinte ?? "gris"} />
                  <div className="esp-fil-texte">
                    <span className="esp-item-haut">
                      <strong>{dateHeure(r.recu_le)}</strong>
                      <Pastille teinte={STATUTS_RELEVE[r.statut]?.teinte ?? "gris"}>{STATUTS_RELEVE[r.statut]?.libelle ?? r.statut}</Pastille>
                      <span className="esp-kpi-sous">{MODES_RELEVE[r.mode] ?? r.mode} · {r.voie}</span>
                    </span>
                    {r.raison ? <div className="esp-fil-meta">{r.raison}</div> : null}
                    {r.statut === "ok" && r.compteurs && Object.keys(r.compteurs).length ? (
                      <div className="esp-fil-meta">
                        {Object.entries(r.compteurs).filter(([, v]) => v && typeof v === "object").slice(0, 4).map(([k, v]) => {
                          const o = v as Record<string, unknown>;
                          const parts = ["ajouts", "modifications", "evenements", "disparitions"].filter((c) => typeof o[c] === "number" && (o[c] as number) > 0).map((c) => `${o[c]} ${c === "ajouts" ? "ajout(s)" : c === "modifications" ? "modif." : c === "evenements" ? "événement(s)" : "disparition(s)"}`);
                          return parts.length ? `${k} : ${parts.join(", ")}` : null;
                        }).filter(Boolean).join(" · ")}
                      </div>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ——— capacités ——— */}
        {capacites.length ? (
          <div>
            <h3 className="esp-groupe-titre">Ce que le logiciel tient</h3>
            <div className="esp-item-haut">
              {capacites.map((k) => (
                <Pastille key={k.id} teinte={ETATS_CAPACITE[k.etat]?.teinte ?? "gris"} contour title={JSON.stringify(k.mesure)}>
                  {DOMAINES_CAPACITE[k.domaine] ?? k.domaine} : {ETATS_CAPACITE[k.etat]?.libelle ?? k.etat}
                </Pastille>
              ))}
            </div>
          </div>
        ) : null}

        {/* ——— équipe et fauteuils ——— */}
        <div className="esp-grille">
          <div>
            <div className="esp-item-haut" style={{ justifyContent: "space-between" }}>
              <h3 className="esp-groupe-titre" style={{ margin: 0 }}>Praticiens et équipe</h3>
              {titulaire ? <button type="button" className="esp-lien-bouton" onClick={() => { setNomPrat(""); setErreur(null); setDialogue("praticien"); }}>Ajouter un praticien</button> : null}
            </div>
            {!praticiens.length && !membres.length ? <p className="esp-fil-meta">Les praticiens arrivent avec le premier relevé, ou se posent ici.</p> : null}
            <ul className="esp-liste">
              {praticiens.map((p) => (
                <li key={p.id} className="esp-item" style={{ cursor: "default" }}>
                  <span className="esp-item-titre">{p.nom_affiche}</span>
                  <span className="esp-item-bas"><span>{p.metier}</span>{!p.actif ? <span>inactif</span> : null}</span>
                </li>
              ))}
              {membres.map((m) => (
                <li key={m.id} className="esp-item" style={{ cursor: "default" }}>
                  <span className="esp-item-titre">{m.prenom}</span>
                  <span className="esp-item-bas"><span>assistante</span><span>{m.fauteuil_habituel_id ? fauteuils.find((f) => f.id === m.fauteuil_habituel_id)?.nom ?? "" : "sans fauteuil habituel"}</span></span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="esp-item-haut" style={{ justifyContent: "space-between" }}>
              <h3 className="esp-groupe-titre" style={{ margin: 0 }}>Fauteuils</h3>
              {titulaire ? <button type="button" className="esp-lien-bouton" onClick={() => { setNomFauteuil(`Fauteuil ${fauteuils.length + 1}`); setCapsFauteuil(["soins"]); setObjectif(""); setErreur(null); setDialogue("fauteuil"); }}>Ajouter un fauteuil</button> : null}
            </div>
            {!fauteuils.length ? <p className="esp-fil-meta">Aucun fauteuil. Les fauteuils arrivent avec l&apos;agenda du logiciel (salles), ou se posent ici.</p> : null}
            <ul className="esp-liste">
              {fauteuils.map((f) => (
                <li key={f.id} className="esp-item" style={{ cursor: "default" }}>
                  <span className="esp-item-haut"><strong>{f.nom}</strong>{!f.actif ? <Pastille teinte="gris">inactif</Pastille> : null}</span>
                  <span className="esp-item-bas">
                    <span>{f.capacites.map((c) => CAPACITES[c]).join(", ")}</span>
                    {f.objectif_occupation !== null ? <span>objectif {Math.round(f.objectif_occupation * 100)} %</span> : null}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* ——— horaires et fermetures ——— */}
        <div className="esp-grille">
          <div>
            <div className="esp-item-haut" style={{ justifyContent: "space-between" }}>
              <h3 className="esp-groupe-titre" style={{ margin: 0 }}>Horaires</h3>
              {titulaire ? <button type="button" className="esp-lien-bouton" onClick={() => { setErreur(null); setDialogue("horaire"); }}>Ajouter un horaire</button> : null}
            </div>
            {!horairesCabinet.length ? (
              <p className="esp-fil-meta">Aucun horaire : sans eux, Tiroma ne sait pas quand un fauteuil est ouvert.</p>
            ) : (
              <div className="esp-tableau-cadre">
                <table className="esp-tableau">
                  <thead><tr><th>Jour</th><th>De</th><th>À</th><th>Pour</th>{titulaire ? <th aria-label="Retirer" /> : null}</tr></thead>
                  <tbody>
                    {horairesCabinet.map((h: Horaire) => (
                      <tr key={h.id}>
                        <td>{JOURS[h.jour]}</td>
                        <td>{heureSansSecondes(h.debut)}</td>
                        <td>{heureSansSecondes(h.fin)}</td>
                        <td>{h.fauteuil_id ? fauteuils.find((f) => f.id === h.fauteuil_id)?.nom ?? "un fauteuil" : h.praticien_id ? praticiens.find((p) => p.id === h.praticien_id)?.nom_affiche ?? "un praticien" : "le cabinet"}</td>
                        {titulaire ? <td><button type="button" className="esp-lien-bouton" disabled={occupe} onClick={() => lancer({ type: "retirer_horaire", id: h.id }, "L'horaire est retiré.")}>Retirer</button></td> : null}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <div>
            <div className="esp-item-haut" style={{ justifyContent: "space-between" }}>
              <h3 className="esp-groupe-titre" style={{ margin: 0 }}>Fermetures et congés</h3>
              {titulaire ? <button type="button" className="esp-lien-bouton" onClick={() => { setFermDebut(""); setFermFin(""); setFermQui(""); setErreur(null); setDialogue("fermeture"); }}>Ajouter une fermeture</button> : null}
            </div>
            {!fermetures.length ? <p className="esp-fil-meta">Aucune fermeture à venir.</p> : (
              <ul className="esp-liste">
                {fermetures.map((f) => (
                  <li key={f.id} className="esp-item" style={{ cursor: "default" }}>
                    <span className="esp-item-haut"><Pastille teinte="gris" contour>{NATURES_FERMETURE[f.nature] ?? f.nature}</Pastille></span>
                    <span className="esp-item-titre">Du {dateHeure(f.debut)} au {dateHeure(f.fin)}</span>
                    <span className="esp-item-bas"><span>{f.praticien_id ? praticiens.find((p) => p.id === f.praticien_id)?.nom_affiche ?? "un praticien" : f.fauteuil_id ? fauteuils.find((x) => x.id === f.fauteuil_id)?.nom ?? "un fauteuil" : "tout le cabinet"}</span></span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* ——— vocabulaire ——— */}
        <div>
          <div className="esp-item-haut" style={{ justifyContent: "space-between" }}>
            <h3 className="esp-groupe-titre" style={{ margin: 0 }}>Vocabulaire du logiciel</h3>
            <span className="esp-kpi-sous">{aClasser.length ? `${aClasser.length} type${aClasser.length > 1 ? "s" : ""} de rendez-vous à confirmer` : `${types.length} type${types.length > 1 ? "s" : ""}, tous validés`}</span>
          </div>
          {!types.length ? <p className="esp-fil-meta">Les types de rendez-vous arrivent avec le premier relevé ; Tiroma propose une famille, le titulaire confirme.</p> : (
            <div className="esp-tableau-cadre">
              <table className="esp-tableau">
                <thead><tr><th>Dans le logiciel</th><th>Famille</th><th>Durée</th><th>État</th>{titulaire ? <th aria-label="Classer" /> : null}</tr></thead>
                <tbody>
                  {types.map((t) => (
                    <tr key={t.id}>
                      <td>{t.libelle_source}{t.categorie_source ? <span className="esp-kpi-sous"> · {t.categorie_source}</span> : null}</td>
                      <td>{t.famille ? FAMILLES[t.famille] : <em>à classer</em>}{t.necessite_labo ? " · labo" : ""}{t.chirurgie ? " · chirurgie" : ""}</td>
                      <td>{t.duree_defaut_min ? `${t.duree_defaut_min} min` : "—"}</td>
                      <td><Pastille teinte={t.statut === "valide" ? "vert" : t.statut === "propose" ? "bleu" : "ambre"}>{t.statut === "valide" ? "Validé" : t.statut === "propose" ? `Proposé${t.confiance ? ` (${t.confiance})` : ""}` : "À classer"}</Pastille></td>
                      {titulaire ? <td><button type="button" className="esp-lien-bouton" onClick={() => ouvrirClasser(t)}>{t.statut === "valide" ? "Modifier" : "Classer"}</button></td> : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ——— règles ——— */}
        {regles ? (
          <div>
            <h3 className="esp-groupe-titre">Règles du cabinet</h3>
            <dl className="esp-def esp-def--trois">
              <Def etiquette="Ordre pour un créneau libéré">{regles.ordre_priorite.map((o) => ({ plan: "plan accepté", attente: "liste d'attente", controle: "contrôle dû" })[o]).join(" → ")}</Def>
              <Def etiquette="Créneau minimal">{regles.creneau_min_minutes} min · {regles.nb_propositions} propositions</Def>
              <Def etiquette="Horizon">{regles.horizon_creneaux_jours} jour{regles.horizon_creneaux_jours > 1 ? "s" : ""} · appel au plus tard {regles.delai_min_appel_minutes} min avant</Def>
              <Def etiquette="Contrôle dû">au-delà de {regles.seuil_controle_mois} mois · {regles.quota_controles_demi_journee} par demi-journée</Def>
              <Def etiquette="Vérifications">laboratoire à J-{regles.labo_verif_jours} · devis {regles.alerte_devis_expire_jours} j avant échéance · interruption {regles.delai_interruption_jours} j</Def>
              <Def etiquette="Demi-journée vide">sous {Math.round(regles.seuil_demi_journee_vide * 100)} % d&apos;occupation</Def>
            </dl>
            <p className="esp-fil-meta" style={{ marginTop: 8 }}>Les règles se fixent avec Omega à l&apos;audit ; le titulaire peut les ajuster ici (durée et préférences tenues : {regles.tenir_duree ? "oui" : "non"} / {regles.tenir_preferences ? "oui" : "non"}).</p>
          </div>
        ) : !titulaire ? null : <Vide titre="Règles non lues">Les règles du cabinet n&apos;ont pas été lues.</Vide>}
      </div>

      {/* ——— dialogues ——— */}
      <Dialog open={dialogue === "fauteuil"} onOpenChange={(o) => !o && setDialogue(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><Settings2 width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>Ajouter un fauteuil</DialogTitle>
            <DialogDescription>Un fauteuil porte des capacités : Tiroma ne proposera un créneau de prothèse que sur un fauteuil qui la permet.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              <label className="rv-libelle">Nom <span className="esp-obligatoire">(obligatoire)</span>
                <input className="rv-champ" value={nomFauteuil} onChange={(e) => setNomFauteuil(e.target.value)} maxLength={80} />
              </label>
              <div>
                <span className="rv-libelle">Capacités</span>
                <div className="esp-item-haut">
                  {(Object.keys(CAPACITES) as Capacite[]).map((c) => (
                    <label key={c} className="esp-coche"><input type="checkbox" checked={capsFauteuil.includes(c)} onChange={(e) => setCapsFauteuil((prev) => (e.target.checked ? [...prev, c] : prev.filter((x) => x !== c)))} /> {CAPACITES[c]}</label>
                  ))}
                </div>
              </div>
              <label className="rv-libelle">Objectif d&apos;occupation (%)
                <input className="rv-champ" type="number" min={0} max={100} value={objectif} onChange={(e) => setObjectif(e.target.value)} placeholder="80" />
              </label>
              {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={occupe || !nomFauteuil.trim() || !capsFauteuil.length} onClick={() => lancer({ type: "fauteuil", nom: nomFauteuil.trim(), capacites: capsFauteuil, objectif: objectif ? Number(objectif) / 100 : null }, `${nomFauteuil.trim()} est posé.`)}>{occupe ? <Loader variant="spin" /> : null} Ajouter</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogue === "horaire"} onOpenChange={(o) => !o && setDialogue(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><Settings2 width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>Ajouter un horaire</DialogTitle>
            <DialogDescription>Une plage d&apos;ouverture hebdomadaire, pour tout le cabinet ou pour un fauteuil.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              <label className="rv-libelle">Jour
                <select className="rv-champ" value={jour} onChange={(e) => setJour(Number(e.target.value))}>
                  {[1, 2, 3, 4, 5, 6, 7].map((j) => <option key={j} value={j}>{JOURS[j]}</option>)}
                </select>
              </label>
              <div className="esp-form-ligne">
                <label className="rv-libelle">De<input className="rv-champ" type="time" value={debut} onChange={(e) => setDebut(e.target.value)} /></label>
                <label className="rv-libelle">À<input className="rv-champ" type="time" value={fin} onChange={(e) => setFin(e.target.value)} /></label>
              </div>
              <label className="rv-libelle">Pour
                <select className="rv-champ" value={fauteuilHoraire} onChange={(e) => setFauteuilHoraire(e.target.value)}>
                  <option value="">Tout le cabinet</option>
                  {fauteuils.map((f) => <option key={f.id} value={f.id}>{f.nom}</option>)}
                </select>
              </label>
              {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={occupe || !debut || !fin || fin <= debut} onClick={() => lancer({ type: "horaire", jour, debut, fin, fauteuil_id: fauteuilHoraire || null }, `${JOURS_COURTS[jour]} ${debut}–${fin} est posé.`)}>{occupe ? <Loader variant="spin" /> : null} Ajouter</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogue === "fermeture"} onOpenChange={(o) => !o && setDialogue(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><Settings2 width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>Ajouter une fermeture</DialogTitle>
            <DialogDescription>Congé d&apos;un praticien, fermeture d&apos;un fauteuil ou du cabinet, formation : la plage ouverte se réduit d&apos;autant.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              <label className="rv-libelle">Nature
                <select className="rv-champ" value={fermNature} onChange={(e) => setFermNature(e.target.value as Fermeture["nature"])}>
                  {Object.entries(NATURES_FERMETURE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </label>
              <div className="esp-form-ligne">
                <label className="rv-libelle">Du<input className="rv-champ" type="datetime-local" value={fermDebut} onChange={(e) => setFermDebut(e.target.value)} /></label>
                <label className="rv-libelle">Au<input className="rv-champ" type="datetime-local" value={fermFin} onChange={(e) => setFermFin(e.target.value)} /></label>
              </div>
              <label className="rv-libelle">Qui
                <select className="rv-champ" value={fermQui} onChange={(e) => setFermQui(e.target.value)}>
                  <option value="">Tout le cabinet</option>
                  {praticiens.map((p) => <option key={p.id} value={`p:${p.id}`}>{p.nom_affiche}</option>)}
                  {fauteuils.map((f) => <option key={f.id} value={`f:${f.id}`}>{f.nom}</option>)}
                </select>
              </label>
              {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={occupe || !fermDebut || !fermFin || fermFin <= fermDebut}
              onClick={() => lancer({ type: "fermeture", debut: new Date(fermDebut).toISOString(), fin: new Date(fermFin).toISOString(), nature: fermNature, praticien_id: fermQui.startsWith("p:") ? fermQui.slice(2) : null, fauteuil_id: fermQui.startsWith("f:") ? fermQui.slice(2) : null }, "La fermeture est posée.")}>{occupe ? <Loader variant="spin" /> : null} Ajouter</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogue === "praticien"} onOpenChange={(o) => !o && setDialogue(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><Settings2 width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>Ajouter un praticien</DialogTitle>
            <DialogDescription>Le nom tel que l&apos;agenda du logiciel l&apos;écrit, pour que les rendez-vous lui soient rattachés.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              <label className="rv-libelle">Nom affiché <span className="esp-obligatoire">(obligatoire)</span>
                <input className="rv-champ" value={nomPrat} onChange={(e) => setNomPrat(e.target.value)} maxLength={120} placeholder="Dr Prénom Nom" />
              </label>
              <label className="rv-libelle">Métier
                <select className="rv-champ" value={metierPrat} onChange={(e) => setMetierPrat(e.target.value as typeof metierPrat)}>
                  <option value="titulaire">Titulaire</option><option value="collaborateur">Collaborateur</option><option value="salarie">Salarié</option><option value="orthodontiste">Orthodontiste</option><option value="remplacant">Remplaçant</option>
                </select>
              </label>
              {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={occupe || !nomPrat.trim()} onClick={() => lancer({ type: "praticien", nom_affiche: nomPrat.trim(), metier: metierPrat }, `${nomPrat.trim()} est ajouté.`)}>{occupe ? <Loader variant="spin" /> : null} Ajouter</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogue === "classer"} onOpenChange={(o) => !o && setDialogue(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><Settings2 width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>Classer « {typeChoisi?.libelle_source} »</DialogTitle>
            <DialogDescription>La famille décide du fauteuil, de la durée et des vérifications (laboratoire, implant). Validé, le type ne bouge plus au prochain relevé.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              <label className="rv-libelle">Famille
                <select className="rv-champ" value={famille} onChange={(e) => setFamille(e.target.value as Famille)}>
                  {(Object.keys(FAMILLES) as Famille[]).map((f) => <option key={f} value={f}>{FAMILLES[f]}</option>)}
                </select>
              </label>
              <label className="rv-libelle">Durée par défaut (min)
                <input className="rv-champ" type="number" min={5} max={600} value={duree} onChange={(e) => setDuree(e.target.value)} />
              </label>
              <div className="esp-item-haut">
                <label className="esp-coche"><input type="checkbox" checked={labo} onChange={(e) => setLabo(e.target.checked)} /> Travail de laboratoire</label>
                <label className="esp-coche"><input type="checkbox" checked={chir} onChange={(e) => setChir(e.target.checked)} /> Chirurgie</label>
                <label className="esp-coche"><input type="checkbox" checked={assist} onChange={(e) => setAssist(e.target.checked)} /> Exige une assistante</label>
              </div>
              {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--fil" disabled={occupe || !typeChoisi} onClick={() => typeChoisi && lancer({ type: "classer", typeRdv: typeChoisi, famille, statut: "propose", necessite_labo: labo, chirurgie: chir, exige_assistante: assist, duree_defaut_min: duree ? Number(duree) : null }, "Le type est classé, à valider plus tard.")}>Classer sans valider</button>
            <button type="button" className="r-btn r-btn--noir" disabled={occupe || !typeChoisi} onClick={() => typeChoisi && lancer({ type: "classer", typeRdv: typeChoisi, famille, statut: "valide", necessite_labo: labo, chirurgie: chir, exige_assistante: assist, duree_defaut_min: duree ? Number(duree) : null }, "Le type est validé.")}>{occupe ? <Loader variant="spin" /> : null} Valider</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogue === "mode"} onOpenChange={(o) => !o && setDialogue(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><Settings2 width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>{modeVoulu === "reel" ? "Passer en mode réel" : "Repasser à blanc"}</DialogTitle>
            <DialogDescription>{modeVoulu === "reel" ? "Les mesures du cabinet comptent désormais pour de vrai ; le point du matin est remis à l'équipe." : "Les mesures sont marquées « à blanc » : on règle sans conséquence."}</DialogDescription>
          </DialogHeader>
          <DialogBody>{erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}</DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={occupe} onClick={() => lancer({ type: "mode", mode: modeVoulu }, modeVoulu === "reel" ? "Le cabinet est en mode réel." : "Le cabinet est à blanc.")}>{occupe ? <Loader variant="spin" /> : null} Confirmer</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogue === "statut"} onOpenChange={(o) => !o && setDialogue(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><Settings2 width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>{statutVoulu === "actif" ? "Réactiver le cabinet" : statutVoulu === "coupe" ? "Couper le cabinet" : "Clore le cabinet"}</DialogTitle>
            <DialogDescription>{statutVoulu === "coupe" ? "Coupé, le cabinet ne reçoit plus de point du matin ni de mesures ; ses données restent. Il se réactive d'un clic." : statutVoulu === "clos" ? "Clos, le cabinet ne se branche plus ; les données suivent la durée de conservation." : "Le cabinet reprend ses relevés, ses mesures et son point du matin."}</DialogDescription>
          </DialogHeader>
          <DialogBody>
            {statutVoulu === "coupe" ? <label className="esp-coche"><input type="checkbox" onChange={(e) => setStatutVoulu(e.target.checked ? "clos" : "coupe")} /> Clore définitivement plutôt que couper</label> : null}
            {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
          </DialogBody>
          <DialogFooter>
            <button type="button" className={`r-btn ${statutVoulu === "clos" ? "r-btn--rouge" : "r-btn--noir"}`} disabled={occupe} onClick={() => lancer({ type: "statut", statut: statutVoulu }, statutVoulu === "actif" ? "Le cabinet est réactivé." : statutVoulu === "coupe" ? "Le cabinet est coupé." : "Le cabinet est clos.")}>{occupe ? <Loader variant="spin" /> : null} Confirmer</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
