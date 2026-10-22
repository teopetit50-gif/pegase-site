"use client";

/* Vue d'ensemble (07/10/2026) — refaite sur la maquette donnée par Teo :
   quatre chiffres en tête, la courbe des factures reçues, les tâches du
   jour, les factures à payer en priorité, l'activité récente, et un
   bandeau qui ouvre l'assistant. Tout est lu dans les mêmes données que
   « À payer » et « Activité » (exemple ou base réelle) ; aucune variation
   inventée : un chiffre sans historique n'affiche pas de flèche.

   15/10/2026 — allégée sur le dessin du pilotage /omega (validé par Teo) :
   une ligne par élément, le titre à gauche, la date à droite ; plus
   d'icônes, de sous-lignes ni d'avatars ; la flèche au survol ; les
   échéances sans colonne « État » (une date dépassée passe au rouge) ; plus
   de bandeau de l'assistant, le bouton « Assistant » est en haut.
   17/10/2026 — décision de Teo : plus de salutation ni de rangée de quatre
   chiffres, comme la vue d'ensemble du pilotage.
   21/10/2026 — l'horloge est celle du navigateur (horloge.ts) : les cartes
   se rendent après le montage, en squelette avant. Le serveur, en UTC,
   n'écrit plus une heure ni un « Hier » que le visiteur en Guadeloupe
   recalculerait autrement (erreur d'hydratation #418 vue en production). */

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, Info } from "lucide-react";
import { dateCourte, montant, relatif } from "@/components/espace/format";
import { A_PAYER, aPayer, groupeDe, totaux } from "./filed/calculs";
import { useAujourdhui } from "./horloge";
import { Squelette } from "./ui";
import { RACINE } from "./modules";
import { useDonnees } from "./donnees";
import { evenements } from "./evenements";
import { ecrireStockage, useStockage } from "./Collection";
import "./sb/sb.css";

const CLE_TACHES = "espace2-collection-taches";

export default function Accueil() {
  const aujourdhui = useAujourdhui();
  const { donnees, erreur } = useDonnees();
  const [periode, setPeriode] = useState(30);

  const c = useMemo(() => {
    if (!donnees || aujourdhui === null) return null;
    const etats = donnees.etats;
    const aRegler = donnees.vue.factures.filter((f) => A_PAYER.has(f.statut) && f.nature !== "avoir" && etats[f.id]?.etat !== "payee");
    const retard = aRegler.filter((f) => groupeDe(f, aujourdhui) === "retard");
    const nomFournisseur = (id: string | null) => donnees.vue.fournisseurs.find((x) => x.id === id)?.nom ?? "Fournisseur inconnu";
    const priorite = aRegler
      .slice()
      .sort((a, b) => (a.echeance_lue ?? "9999").localeCompare(b.echeance_lue ?? "9999"))
      .slice(0, 5)
      .map((f) => ({ f, nom: nomFournisseur(f.fournisseur_id), groupe: groupeDe(f, aujourdhui), reste: aPayer(f, etats) }));
    /* la courbe : montant des documents reçus, en somme glissante sur 7
       jours (une courbe lisible, pas des marches) */
    const debut = aujourdhui - (periode - 1) * 86_400_000;
    const parJour = Array.from({ length: periode + 6 }, () => 0);
    for (const d of donnees.docs) {
      const i = Math.floor((new Date(d.recu_le).setHours(0, 0, 0, 0) - (debut - 6 * 86_400_000)) / 86_400_000);
      if (i >= 0 && i < parJour.length) parJour[i] += d.montant ?? 0;
    }
    const courbe = Array.from({ length: periode }, (_, i) => parJour.slice(i, i + 7).reduce((a, b) => a + b, 0));
    /* 22/10 — l'histogramme de « Service Health » : les documents reçus, jour par jour */
    const recusParJour = Array.from({ length: periode }, () => 0);
    for (const d of donnees.docs) {
      const i = Math.floor((new Date(d.recu_le).setHours(0, 0, 0, 0) - debut) / 86_400_000);
      if (i >= 0 && i < periode) recusParJour[i] += 1;
    }
    /* aujourd'hui : ce qui demande une action — échéances proches, accords */
    const actions = [
      ...aRegler
        .filter((f) => ["retard", "semaine"].includes(groupeDe(f, aujourdhui)))
        .map((f) => ({ id: f.id, titre: `Payer ${nomFournisseur(f.fournisseur_id)}`, quand: f.echeance_lue ? dateCourte(f.echeance_lue) : "", retard: groupeDe(f, aujourdhui) === "retard", lien: `${RACINE}/filed/a-payer` })),
      ...donnees.demandes
        .filter((d) => d.statut === "en_attente")
        .map((d) => ({ id: d.id, titre: `Valider : ${d.resume}`, quand: d.montant !== null ? montant(d.montant, d.devise) : "", retard: false, lien: `${RACINE}/validations` })),
    ];
    return {
      aRegler,
      retard,
      priorite,
      courbe,
      recusParJour,
      recus: recusParJour.reduce((a, b) => a + b, 0),
      debut,
      actions,
      totalARegler: totaux(aRegler, etats),
      totalRetard: totaux(retard, etats),
      aValider: donnees.demandes.filter((d) => d.statut === "en_attente").length,
      aTraiter: donnees.docs.filter((d) => ["en_lecture", "a_classer", "a_traiter", "illisible"].includes(d.etat)).length,
      activite: evenements(donnees).slice(0, 5),
    };
  }, [donnees, aujourdhui, periode]);

  /* les tâches de l'équipe (page Tâches, gardées sur l'appareil) */
  const brut = useStockage(CLE_TACHES);
  const taches = useMemo(() => {
    try {
      const v = JSON.parse(brut || "[]");
      return Array.isArray(v) ? (v as { id: string; titre?: string; echeance?: string; qui?: string; fait?: boolean }[]) : [];
    } catch {
      return [];
    }
  }, [brut]);
  const duJour = taches.filter((t) => !t.fait).slice(0, 4);
  const cocher = (id: string) => ecrireStockage(CLE_TACHES, JSON.stringify(taches.map((t) => (t.id === id ? { ...t, fait: true } : t))));


  const tuiles = c
    ? [
        { cle: "apayer", libelle: "À payer", valeur: c.totalARegler, aide: `${c.aRegler.length} facture${c.aRegler.length > 1 ? "s" : ""} validée${c.aRegler.length > 1 ? "s" : ""}`, lien: `${RACINE}/filed/a-payer` },
        { cle: "retard", libelle: "En retard", valeur: c.totalRetard, aide: `${c.retard.length} échéance${c.retard.length > 1 ? "s" : ""} passée${c.retard.length > 1 ? "s" : ""}`, lien: `${RACINE}/filed/a-payer`, teinte: c.retard.length ? "rouge" : undefined },
        { cle: "valider", libelle: "À valider", valeur: String(c.aValider), aide: "demandes en attente", lien: `${RACINE}/validations`, teinte: c.aValider ? "ambre" : undefined },
        { cle: "traiter", libelle: "Documents à traiter", valeur: String(c.aTraiter), aide: "en lecture ou à classer", lien: `${RACINE}/filed` },
        { cle: "actions", libelle: "Actions du jour", valeur: String(c.actions.length + duJour.length), aide: "échéances, accords et tâches", lien: `${RACINE}/taches` },
        { cle: "recus", libelle: "Documents reçus", valeur: String(c.recus), aide: `sur ${periode} jours`, lien: `${RACINE}/filed/boite` },
      ]
    : null;
  const maxRecus = c ? Math.max(1, ...c.recusParJour) : 1;

  /* 22/10 — la page Observability › Overview de Supabase, au 1:1 : le titre
     et ses actions, une rangée de tuiles (étiquette en capitales, valeur),
     puis « la santé » en une carte de cellules — les documents reçus en
     histogramme sur toute la largeur, puis ce qui est à payer, à faire
     aujourd'hui, et l'activité récente. Gabarit : ./sb/sb.css. */
  return (
    <div className="sb-obs v2-arrivee">
      <div className="sb-tete-ligne">
        <h1 className="sb-titre">Vue d&apos;ensemble</h1>
        <div className="sb-actions">
          <Link href={`${RACINE}/activite`} className="v2-btn">
            Activité
          </Link>
          <span className="v2-champ" style={{ height: 26, padding: "0 8px" }}>
            <select value={periode} onChange={(e) => setPeriode(Number(e.target.value))} aria-label="Période de la courbe" style={{ fontSize: 12 }}>
              <option value={7}>7 derniers jours</option>
              <option value={30}>30 derniers jours</option>
              <option value={90}>90 derniers jours</option>
            </select>
          </span>
        </div>
      </div>
      {erreur ? <p className="sb-texte">La base n&apos;a pas répondu : {erreur}</p> : null}

      <section className="sb-obs-section" aria-labelledby="va-chiffres">
        <h2 id="va-chiffres">Aujourd&apos;hui</h2>
        <div className="sb-tuiles">
          {(tuiles ?? [0, 1, 2, 3, 4, 5].map(() => null)).map((t, i) =>
            t ? (
              <Link key={t.cle} href={t.lien} className="sb-tuile" title={t.aide}>
                <span className="sb-tuile-etiquette">
                  {t.libelle}
                  <Info width={14} height={14} strokeWidth={1.5} aria-hidden="true" />
                </span>
                <span className="sb-tuile-valeur" data-teinte={t.teinte}>
                  {t.valeur}
                </span>
                <span className="v2-sr">{t.aide}</span>
              </Link>
            ) : (
              <div key={i} className="sb-tuile">
                <Squelette largeur="50%" hauteur={14} />
                <Squelette largeur={64} hauteur={22} />
              </div>
            ),
          )}
        </div>
      </section>

      <section className="sb-obs-section" aria-labelledby="va-sante">
        <h2 id="va-sante">L&apos;état de vos modules</h2>
        <div className="sb-sante">
          <div className="sb-sante-grille">
            <div className="sb-cellule sb-cellule--large">
              <div className="sb-cellule-tete">
                <Link href={`${RACINE}/filed/boite`}>Factures reçues</Link>
                <span className="sb-cellule-compte">{c ? `${c.recus} document${c.recus > 1 ? "s" : ""} · ${periode} jours` : <Squelette largeur={80} hauteur={14} />}</span>
              </div>
              <div className="sb-mini-histo" role="img" aria-label={c ? `${c.recus} documents reçus sur ${periode} jours` : "Chargement"}>
                {(c?.recusParJour ?? Array.from({ length: periode }, () => 0)).map((n, i) => (
                  <span key={i} data-vide={n ? undefined : ""} style={{ height: n ? `${Math.max(8, (n / maxRecus) * 100)}%` : "2px" }} />
                ))}
              </div>
            </div>

            <div className="sb-cellule">
              <div className="sb-cellule-tete">
                <Link href={`${RACINE}/filed/a-payer`}>À payer en priorité</Link>
                <span className="sb-cellule-compte">{c ? c.totalARegler : ""}</span>
              </div>
              {!c ? (
                <Squelette hauteur={80} />
              ) : !c.priorite.length ? (
                <p className="sb-mini-vide">Aucune facture à payer.</p>
              ) : (
                <ul className="sb-mini-liste">
                  {c.priorite.map(({ f, nom, groupe, reste }) => (
                    <li key={f.id}>
                      <Link href={`${RACINE}/filed/a-payer`}>{nom}</Link>
                      <span className="sb-meta">{montant(reste, f.devise)}</span>
                      <span className="sb-meta" data-retard={groupe === "retard" ? "" : undefined}>
                        {f.echeance_lue ? dateCourte(f.echeance_lue) : "—"}
                        {groupe === "retard" ? <span className="v2-sr"> (en retard)</span> : null}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="sb-cellule">
              <div className="sb-cellule-tete">
                <Link href={`${RACINE}/taches`}>Aujourd&apos;hui</Link>
                <span className="sb-cellule-compte">{c ? `${c.actions.length + duJour.length} à faire` : ""}</span>
              </div>
              {!c ? (
                <Squelette hauteur={80} />
              ) : !c.actions.length && !duJour.length ? (
                <p className="sb-mini-vide">
                  Rien d&apos;urgent aujourd&apos;hui. <Link href={`${RACINE}/taches`}>Ajouter une tâche</Link>
                </p>
              ) : (
                <ul className="sb-mini-liste">
                  {duJour.map((t) => (
                    <li key={t.id}>
                      <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <input type="checkbox" aria-label={`Marquer « ${t.titre} » comme faite`} onChange={() => cocher(t.id)} />
                        {t.titre}
                      </span>
                      {t.echeance ? <span className="sb-meta">{dateCourte(t.echeance)}</span> : null}
                    </li>
                  ))}
                  {c.actions.slice(0, 6).map((x) => (
                    <li key={x.id}>
                      <Link href={x.lien}>{x.titre}</Link>
                      {x.quand ? (
                        <span className="sb-meta" data-retard={x.retard ? "" : undefined}>
                          {x.quand}
                          {x.retard ? <span className="v2-sr"> (en retard)</span> : null}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="sb-cellule sb-cellule--large">
              <div className="sb-cellule-tete">
                <Link href={`${RACINE}/activite`}>Activité récente</Link>
                <ChevronRight width={14} height={14} aria-hidden="true" />
              </div>
              {!c ? (
                <Squelette hauteur={80} />
              ) : !c.activite.length ? (
                <p className="sb-mini-vide">Rien pour l&apos;instant.</p>
              ) : (
                <ul className="sb-mini-liste">
                  {c.activite.map((e) => (
                    <li key={e.id}>
                      {e.lien ? <Link href={e.lien}>{e.quoi} : {e.detail}</Link> : <span>{e.quoi} : {e.detail}</span>}
                      <span className="sb-meta" title={relatif(e.quand)}>
                        {heureCourte(e.quand)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

/* « 10:24 », « Hier 16:12 », sinon « 3 oct. » */
function heureCourte(iso: string): string {
  const d = new Date(iso);
  const j = new Date();
  const h = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  if (d.toDateString() === j.toDateString()) return h;
  j.setDate(j.getDate() - 1);
  if (d.toDateString() === j.toDateString()) return `Hier ${h}`;
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}
