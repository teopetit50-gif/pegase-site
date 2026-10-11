"use client";

/* Les compléments du cabinet (11/10/2026, session B3, b3_23). Cinq cartes :
   - « Soins à regrouper » (titulaire) : sur deux jours, les demi-journées où
     un fauteuil tourne à vide pour un ou deux soins, et les fauteuils qui
     pourraient les prendre (équipés, libres, avec une assistante si le soin
     en exige une). Si tous les soins trouvent une place, la demi-journée se
     libère.
   - « Séances longues mal placées » : sur sept jours, les séances d'une
     heure et plus (ou les chirurgies) qui sortent des horaires, tombent sur
     un fauteuil non équipé, sans assistante, ou quand le praticien est pris.
   - « Un créneau pour chaque plan » : pour chaque plan signé sans rendez-vous,
     jusqu'à trois créneaux libres de la durée de la séance suivante.
   - « Contrôles dus » : les patients actifs pas revus en contrôle depuis le
     seuil du cabinet, sans le plafond du point du matin.
   - « Vos données » (titulaire) : tout ce que Tiroma garde du cabinet, en un
     fichier ; l'export est noté au journal.
   Rien n'est déplacé ni posé dans l'agenda : Tiroma lit, le cabinet décide
   dans son logiciel. */

import { useState } from "react";
import { Loader } from "@/components/ui/loader";
import { Avis, Pastille, Vide } from "../ui";
import type { ControlesDus as ControlesDusT, PlanCreneaux, SeanceMalPlacee, SoinsADeplacer as SoinsADeplacerT } from "./types";

function jourEnClair(iso: string): string {
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" }).format(d);
}

function heure(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(d).replace(":", " h ");
}

function plage(debut: string, fin: string): string {
  return `${heure(debut)} – ${heure(fin)}`;
}

function pourcent(t: number | null): string {
  return t === null ? "—" : `${Math.round(t * 100)} %`;
}

function pluriel(n: number, mot: string): string {
  return `${n} ${mot}${n > 1 ? "s" : ""}`;
}

/* ——— soins à regrouper ——— */

export function SoinsADeplacer({ soins }: { soins: SoinsADeplacerT | null }) {
  if (!soins) return null;
  const liste = soins.demi_journees;
  const liberables = liste.filter((x) => x.libere).length;
  return (
    <section id="tiroma-soins-a-deplacer" className="esp-carte" aria-label="Soins à regrouper">
      <div className="esp-carte-tete">
        <h2 className="esp-carte-titre">Soins à regrouper</h2>
        <span className="esp-kpi-sous">
          {liste.length ? `${pluriel(liste.length, "demi-journée")} à vide, ${liberables} libérable${liberables > 1 ? "s" : ""}` : "Aucun fauteuil à vide sur deux jours"}
        </span>
      </div>
      <div className="esp-carte-corps" style={{ display: "grid", gap: 14 }}>
        {!liste.length ? (
          <Vide titre="Rien à regrouper">Une demi-journée remonte ici quand un fauteuil reste sous le seuil d&apos;occupation pour un ou deux soins qu&apos;un autre fauteuil pourrait prendre.</Vide>
        ) : (
          <ul className="esp-liste" aria-label="Demi-journées à vide">
            {liste.map((x) => (
              <li key={`${x.fauteuil_id}-${x.jour}-${x.moment}`} className="esp-item" style={{ cursor: "default" }}>
                <span className="esp-item-haut">
                  <Pastille teinte={x.libere ? "vert" : "ambre"}>{x.libere ? "Peut se libérer" : "Un soin reste sans place"}</Pastille>
                  <Pastille teinte="gris">Occupé à {pourcent(x.taux)}</Pastille>
                </span>
                <span className="esp-item-titre">{x.fauteuil} — {jourEnClair(x.jour)}, {x.moment === "matin" ? "matin" : "après-midi"}</span>
                <ul style={{ display: "grid", gap: 6, margin: 0, paddingLeft: 18 }}>
                  {x.soins.map((s) => (
                    <li key={s.rendez_vous_id} className="esp-fil-meta" style={{ overflowWrap: "anywhere" }}>
                      <strong>{plage(s.debut, s.fin)}</strong> · {s.patient_nom}{s.soin ? ` · ${s.soin}` : ""} →{" "}
                      {s.vers.length
                        ? s.vers.map((v) => `${v.fauteuil} (${pourcent(v.taux)}${v.assistante ? `, avec ${v.assistante}` : ""})`).join(", ")
                        : "aucun fauteuil libre, équipé et accompagné à cette heure"}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
        <p className="esp-fil-meta">Tiroma ne déplace rien : le cabinet change le fauteuil dans son logiciel, et le relevé suivant en tient compte.</p>
      </div>
    </section>
  );
}

/* ——— séances longues mal placées ——— */

export function SeancesLongues({ seances }: { seances: SeanceMalPlacee[] | null }) {
  if (!seances) return null;
  return (
    <section id="tiroma-seances-longues" className="esp-carte" aria-label="Séances longues mal placées">
      <div className="esp-carte-tete">
        <h2 className="esp-carte-titre">Séances longues mal placées</h2>
        <span className="esp-kpi-sous">{seances.length ? `${pluriel(seances.length, "séance")} à revoir sur sept jours` : "Rien à revoir sur sept jours"}</span>
      </div>
      <div className="esp-carte-corps" style={{ display: "grid", gap: 14 }}>
        {!seances.length ? (
          <Vide titre="Toutes les séances longues sont bien placées">Une séance d&apos;une heure et plus, ou une chirurgie, remonte ici si elle sort des horaires, tombe sur un fauteuil non équipé, sans assistante, ou quand le praticien est pris ailleurs.</Vide>
        ) : (
          <ul className="esp-liste" aria-label="Séances à revoir">
            {seances.map((x) => (
              <li key={x.rendez_vous_id} className="esp-item" style={{ cursor: "default" }}>
                <span className="esp-item-haut">
                  <Pastille teinte={x.raisons.length > 1 ? "rouge" : "ambre"}>{pluriel(x.raisons.length, "problème")}</Pastille>
                  <Pastille teinte="gris">{x.minutes} min</Pastille>
                </span>
                <span className="esp-item-titre">{jourEnClair(x.debut)}, {plage(x.debut, x.fin)} — {x.patient_nom}</span>
                <span className="esp-item-bas">
                  <span>{[x.soin, x.fauteuil, x.praticien].filter(Boolean).join(" · ")}</span>
                </span>
                <ul style={{ display: "grid", gap: 4, margin: 0, paddingLeft: 18 }}>
                  {x.raisons.map((r) => <li key={r} className="esp-fil-meta">{r}</li>)}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

/* ——— un créneau pour chaque plan ——— */

export function CreneauxPlans({ plans }: { plans: PlanCreneaux[] | null }) {
  if (!plans) return null;
  const servis = plans.filter((p) => p.creneaux.length).length;
  return (
    <section id="tiroma-creneaux-plans" className="esp-carte" aria-label="Un créneau pour chaque plan">
      <div className="esp-carte-tete">
        <h2 className="esp-carte-titre">Un créneau pour chaque plan</h2>
        <span className="esp-kpi-sous">{plans.length ? `${servis} plan${servis > 1 ? "s" : ""} sur ${plans.length} trouve${servis > 1 ? "nt" : ""} une place sous quatorze jours` : "Aucun plan sans rendez-vous"}</span>
      </div>
      <div className="esp-carte-corps" style={{ display: "grid", gap: 14 }}>
        {!plans.length ? (
          <Vide titre="Tous les plans ont leur rendez-vous">Un plan signé dont la séance suivante n&apos;est pas posée remonte ici avec les premiers créneaux libres de la bonne durée.</Vide>
        ) : (
          <ul className="esp-liste" aria-label="Plans et créneaux proposés">
            {plans.map((p) => (
              <li key={p.plan_id} className="esp-item" style={{ cursor: "default" }}>
                <span className="esp-item-haut">
                  <Pastille teinte={p.creneaux.length ? "bleu" : "gris"}>{p.creneaux.length ? `${p.creneaux.length} créneau${p.creneaux.length > 1 ? "x" : ""}` : "Aucun créneau"}</Pastille>
                  <Pastille teinte="gris">{p.duree_min} min</Pastille>
                </span>
                <span className="esp-item-titre">{p.patient_nom}{p.devis_numero ? ` — devis ${p.devis_numero}` : ""}</span>
                <span className="esp-item-bas">
                  <span>{[p.seance?.libelle, p.praticien].filter(Boolean).join(" · ") || "Séance suivante du plan"}</span>
                </span>
                {p.creneaux.length ? (
                  <ul style={{ display: "grid", gap: 4, margin: 0, paddingLeft: 18 }}>
                    {p.creneaux.map((c) => <li key={`${c.fauteuil_id}-${c.debut}`} className="esp-fil-meta">{jourEnClair(c.debut)}, {plage(c.debut, c.fin)} · {c.fauteuil}</li>)}
                  </ul>
                ) : (
                  <span className="esp-fil-meta">Aucun fauteuil équipé n&apos;a cette durée de libre quand le praticien l&apos;est aussi.</span>
                )}
              </li>
            ))}
          </ul>
        )}
        <p className="esp-fil-meta">Les créneaux tiennent compte des horaires, des fermetures, du fauteuil qu&apos;il faut et de l&apos;agenda du praticien. Le rendez-vous se pose dans le logiciel du cabinet.</p>
      </div>
    </section>
  );
}

/* ——— contrôles dus ——— */

export function ControlesDus({ controles }: { controles: ControlesDusT | null }) {
  const [tout, setTout] = useState(false);
  if (!controles) return null;
  const liste = tout ? controles.patients : controles.patients.slice(0, 8);
  return (
    <section id="tiroma-controles" className="esp-carte" aria-label="Contrôles dus">
      <div className="esp-carte-tete">
        <h2 className="esp-carte-titre">Contrôles dus</h2>
        <span className="esp-kpi-sous">
          {controles.total ? `${pluriel(controles.total, "patient")} sans contrôle depuis plus de ${controles.seuil_mois} mois` : `Personne au-delà de ${controles.seuil_mois} mois`}
        </span>
      </div>
      <div className="esp-carte-corps" style={{ display: "grid", gap: 14 }}>
        {!controles.patients.length ? (
          <Vide titre="Tous les patients actifs sont à jour">Un patient actif remonte ici quand son dernier contrôle dépasse le seuil du cabinet et qu&apos;aucun rendez-vous n&apos;est posé.</Vide>
        ) : (
          <ul className="esp-liste" aria-label="Patients à rappeler pour un contrôle">
            {liste.map((p) => (
              <li key={p.patient_id} className="esp-item" style={{ cursor: "default" }}>
                <span className="esp-item-haut">
                  <Pastille teinte={p.mois_depuis === null ? "rouge" : p.mois_depuis >= controles.seuil_mois * 2 ? "ambre" : "gris"}>
                    {p.mois_depuis === null ? "Jamais de contrôle" : `${p.mois_depuis} mois`}
                  </Pastille>
                </span>
                <span className="esp-item-titre">{p.patient_nom}</span>
                <span className="esp-item-bas">
                  <span>{p.dernier_controle_le ? `Dernier contrôle le ${new Date(`${p.dernier_controle_le}T12:00:00`).toLocaleDateString("fr-FR")}` : "Aucun contrôle connu"}</span>
                  {p.praticien ? <span>{p.praticien}</span> : null}
                </span>
              </li>
            ))}
          </ul>
        )}
        {controles.patients.length > 8 ? (
          <div className="esp-actions">
            <button type="button" className="r-btn r-btn--fil" onClick={() => setTout((t) => !t)}>{tout ? "Réduire la liste" : `Voir les ${controles.patients.length}`}</button>
          </div>
        ) : null}
        <p className="esp-fil-meta">
          {controles.ne_pas_contacter
            ? `${pluriel(controles.ne_pas_contacter, "patient")} qui ne souhaite${controles.ne_pas_contacter > 1 ? "nt" : ""} pas être contacté${controles.ne_pas_contacter > 1 ? "s" : ""} ${controles.ne_pas_contacter > 1 ? "sont comptés" : "est compté"} à part et ${controles.ne_pas_contacter > 1 ? "n'apparaissent" : "n'apparaît"} pas ici. `
            : ""}
          Le point du matin en propose quelques-uns chaque jour ; la liste entière est ici.
        </p>
      </div>
    </section>
  );
}

/* ——— vos données ——— */

export function ExportDonnees({ exporter }: { exporter: () => Promise<unknown> }) {
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [fait, setFait] = useState<string | null>(null);
  const lancer = async () => {
    setEnCours(true);
    setErreur(null);
    setFait(null);
    try {
      const donnees = await exporter();
      const blob = new Blob([JSON.stringify(donnees, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const lien = document.createElement("a");
      lien.href = url;
      lien.download = `tiroma-donnees-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(lien);
      lien.click();
      lien.remove();
      URL.revokeObjectURL(url);
      setFait("Fichier téléchargé. L'export est noté au journal du cabinet.");
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "L'export a échoué.");
    } finally {
      setEnCours(false);
    }
  };
  return (
    <section id="tiroma-donnees" className="esp-carte" aria-label="Vos données">
      <div className="esp-carte-tete">
        <h2 className="esp-carte-titre">Vos données</h2>
        <span className="esp-kpi-sous">Réservé au titulaire</span>
      </div>
      <div className="esp-carte-corps" style={{ display: "grid", gap: 14 }}>
        <p className="esp-fil-meta">
          Tout ce que Tiroma garde de ce cabinet (fauteuils, équipe, patients, rendez-vous, plans et leurs actes, appels, rappels, liste d&apos;attente, règles) en un seul fichier, lisible sans Tiroma. Le fichier contient des données de santé : gardez-le sur un poste du cabinet.
        </p>
        {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
        {fait ? <Avis teinte="vert">{fait}</Avis> : null}
        <div className="esp-actions">
          <button type="button" className="r-btn r-btn--noir" disabled={enCours} onClick={lancer}>{enCours ? <Loader variant="spin" /> : null} Télécharger les données</button>
        </div>
      </div>
    </section>
  );
}
