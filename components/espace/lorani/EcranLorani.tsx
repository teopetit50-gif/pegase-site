"use client";

/* ══════════════════════════════════════════════════════════════════════
   /espace/lorani — le calendrier des permis (05/10/2026, session B5)

   En haut, cinq compteurs qui filtrent : à confirmer (dates lues sur les
   courriers, décisions implicites), pièces à fournir, en instruction,
   accordés, clos. À gauche la liste des permis, groupés par projet, triés
   par ce qui presse (à confirmer, puis la prochaine date). À droite le
   permis ouvert (PermisVue : calendrier, dates lues, décision implicite,
   recours, échéances) et, dessous, le dossier du projet (équipe, lots,
   intervenants, courriers).

   Deux sources : l'exemple (exemples.ts, modifié en mémoire par les
   saisies pour que l'enchaînement se voie) ou la base réelle (portes.ts).
   L'URL ?permis=<id> ou ?projet=<id> ouvre directement un dossier : c'est
   le lien que portent les alertes et le point du matin (migration b5_02).
   ══════════════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useMemo, useState } from "react";
import { FolderPlus } from "lucide-react";
import { PERSONNES, nomPersonne } from "../exemples/socle";
import { useSource } from "../source";
import { useTempsReel } from "../tempsReel";
import { Avis, Chargement, Pastille, Ruban, Vide } from "../ui";
import { dateCourte } from "../format";
import { ETATS, FAMILLES, NATURES_PROJET, PHASES, TYPES, famille, prochaineDate, titrePermis, type Famille } from "./etats";
import { dossierExemple } from "./exemples";
import PermisVue from "./PermisVue";
import ProjetCarte from "./ProjetCarte";
import Formulaires, { type Form } from "./Formulaires";
import { chargerDossier } from "./portes";
import type { Dossier, Permis } from "./types";
import "./lorani.css";

const aujourdHuiIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, "0")}-${`${d.getDate()}`.padStart(2, "0")}`;
};

export default function EcranLorani() {
  const { source } = useSource();
  const [local, setLocal] = useState<Dossier>(() => dossierExemple());
  const [reel, setReel] = useState<Dossier | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [filtre, setFiltre] = useState<Famille | null>(null);
  const [choix, setChoix] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(null);
  const [envoi, setEnvoi] = useState(false);

  /* ——— base réelle ——— */
  const charger = useCallback(async () => {
    await Promise.resolve();
    setErreur(null);
    try {
      setReel(await chargerDossier());
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base n'a pas répondu.");
      setReel({ ...dossierExemple(), projets: [], permis: [], datesLues: [], echeances: [], recours: [], lots: [], intervenants: [], membres: [], pieces: [], controles: [], controlePieces: [], constats: [], plu: [], attestations: [], ordresService: [], reserves: [], comptesRendus: [], points: [], doe: [], consultations: [], offres: [], moi: null });
    }
  }, []);
  useEffect(() => {
    if (source !== "reelle") return;
    const t = window.setTimeout(() => {
      setReel(null);
      void charger();
    }, 0);
    return () => window.clearTimeout(t);
  }, [source, charger]);

  const relire = useCallback(async () => {
    try {
      setReel(await chargerDossier());
    } catch {
      /* la prochaine lecture à la main dira l'erreur */
    }
  }, []);
  useTempsReel(["lorani_permis", "lorani_permis_dates_lues", "lorani_permis_recours", "lorani_permis_echeances"], source === "reelle", relire);

  const dossier: Dossier = source === "exemple" ? local : (reel ?? local);
  const pret = source === "exemple" || reel !== null;

  /* ——— l'URL ouvre un permis ou un projet ——— */
  useEffect(() => {
    const t = window.setTimeout(() => {
      try {
        const q = new URLSearchParams(window.location.search);
        const permis = q.get("permis");
        const projet = q.get("projet");
        if (permis) setChoix(permis);
        else if (projet) setChoix(`projet:${projet}`);
      } catch {
        /* sans URL lisible, la liste choisit */
      }
    }, 0);
    return () => window.clearTimeout(t);
  }, []);

  /* ——— qui est qui ——— */
  const nommer = useCallback(
    (id: string | null | undefined) => {
      if (!id) return "—";
      if (source === "exemple") return nomPersonne(id);
      if (dossier.moi && id === dossier.moi.user_id) return "Vous";
      return dossier.noms[id] ?? id.slice(0, 8);
    },
    [source, dossier],
  );
  const personnes = useMemo(() => {
    if (source === "exemple") return Object.entries(PERSONNES).map(([user_id, p]) => ({ user_id, nom: p.nom }));
    return Object.entries(dossier.noms).map(([user_id, nom]) => ({ user_id, nom }));
  }, [source, dossier.noms]);

  /* ——— la liste ——— */
  const proposeesPar = useMemo(() => {
    const m: Record<string, number> = {};
    for (const d of dossier.datesLues) {
      if (d.statut !== "proposee") continue;
      const cle = d.permis_id ?? `projet:${d.projet_id}`;
      m[cle] = (m[cle] ?? 0) + 1;
    }
    return m;
  }, [dossier.datesLues]);

  const compteurs = useMemo(() => {
    const c: Record<Famille, number> = { a_confirmer: 0, pieces: 0, instruction: 0, accordes: 0, clos: 0 };
    for (const p of dossier.permis) c[famille(p, proposeesPar[p.id] ?? 0)]++;
    return c;
  }, [dossier.permis, proposeesPar]);

  const rangFamille: Record<Famille, number> = { a_confirmer: 0, pieces: 1, instruction: 2, accordes: 3, clos: 4 };
  const visibles = useMemo(() => {
    const l = dossier.permis.filter((p) => !filtre || famille(p, proposeesPar[p.id] ?? 0) === filtre);
    return [...l].sort((a, b) => {
      const fa = rangFamille[famille(a, proposeesPar[a.id] ?? 0)];
      const fb = rangFamille[famille(b, proposeesPar[b.id] ?? 0)];
      if (fa !== fb) return fa - fb;
      /* ce qu'un membre doit lire sur un courrier passe avant tout */
      const na = proposeesPar[a.id] ?? 0;
      const nb = proposeesPar[b.id] ?? 0;
      if (na !== nb) return nb - na;
      const da = prochaineDate(a) ?? "9999";
      const db = prochaineDate(b) ?? "9999";
      if (da !== db) return da < db ? -1 : 1;
      return b.cree_le.localeCompare(a.cree_le);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `rangFamille` est une constante
  }, [dossier.permis, filtre, proposeesPar]);

  /* groupés par projet, dans l'ordre du premier permis visible */
  const groupes = useMemo(() => {
    const m = new Map<string, Permis[]>();
    for (const p of visibles) m.set(p.projet_id, [...(m.get(p.projet_id) ?? []), p]);
    const sansPermis = dossier.projets.filter((pr) => !dossier.permis.some((p) => p.projet_id === pr.id) && !filtre);
    return { avec: Array.from(m.entries()), sans: sansPermis };
  }, [visibles, dossier.projets, dossier.permis, filtre]);

  const projetDe = (id: string) => dossier.projets.find((pr) => pr.id === id);

  /* le choix : un permis, ou un projet (sans permis ou visé par l'URL) */
  const choisi = (() => {
    if (choix?.startsWith("projet:")) {
      const id = choix.slice(7);
      const premier = visibles.find((p) => p.projet_id === id);
      if (premier) return premier.id;
      if (dossier.projets.some((pr) => pr.id === id)) return choix;
    }
    if (choix && visibles.some((p) => p.id === choix)) return choix;
    return visibles[0]?.id ?? (groupes.sans[0] ? `projet:${groupes.sans[0].id}` : null);
  })();
  const permis = choisi && !choisi.startsWith("projet:") ? (visibles.find((p) => p.id === choisi) ?? null) : null;
  const projet = permis ? projetDe(permis.projet_id) ?? null : choisi?.startsWith("projet:") ? projetDe(choisi.slice(7)) ?? null : null;

  const peutEcrire = source === "exemple" || (dossier.moi?.role !== "lecteur" && !!dossier.moi);

  const ouvrir = (id: string) => {
    setChoix(id);
    if (window.innerWidth < 1024) document.getElementById("esp-detail")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  /* les honoraires (b5_12) gèrent leurs propres dialogues : l'erreur de la base leur revient */
  const agir = async (reel: () => Promise<void>, localFn: () => Dossier) => {
    if (source === "reelle") {
      await reel();
      await relire();
    } else {
      setLocal(localFn());
    }
  };

  const gris = !peutEcrire || envoi;

  return (
    <>
      <div className="esp-tete" data-arrivee="">
        <div>
          <h1 className="esp-titre">Calendrier des permis</h1>
          <p className="esp-sous">
            Chaque permis déposé, suivi jusqu&apos;à la purge des recours : le délai d&apos;instruction, les pièces réclamées par la mairie, la décision tacite, l&apos;affichage et le recours des tiers. Les courriers de la mairie sont lus et leurs dates proposées à votre confirmation. Vous savez quand le chantier peut démarrer.
          </p>
        </div>
        <div className="esp-item-haut">
          <Ruban source={source} />
          <button type="button" className="r-btn r-btn--fil" disabled={gris} onClick={() => setForm({ type: "projet" })}>
            <FolderPlus width={16} height={16} aria-hidden="true" /> Nouveau projet
          </button>
        </div>
      </div>

      <div className="esp-kpis" data-arrivee="">
        {FAMILLES.map((f) => (
          <button key={f.cle} type="button" className="esp-kpi" data-teinte={compteurs[f.cle] ? f.teinte : undefined} aria-pressed={filtre === f.cle} onClick={() => setFiltre(filtre === f.cle ? null : f.cle)}>
            <span className="esp-kpi-etiquette">{f.libelle}</span>
            <span className="esp-kpi-valeur">{compteurs[f.cle]}</span>
            <span className="esp-kpi-sous">{f.sous}</span>
          </button>
        ))}
      </div>

      {erreur ? <div style={{ marginBottom: 14 }}><Avis teinte="rouge" role="alert"><strong>La base réelle n&apos;a pas répondu.</strong> {erreur}</Avis></div> : null}

      <div className="esp-grille">
        <section className="esp-carte" aria-label="Permis">
          <div className="esp-carte-tete">
            <h2 className="esp-carte-titre">{filtre ? FAMILLES.find((f) => f.cle === filtre)?.libelle : "Tous les permis"}</h2>
            <span className="esp-kpi-sous">{visibles.length} permis · {dossier.projets.length} projet{dossier.projets.length > 1 ? "s" : ""}</span>
          </div>
          {!pret ? (
            <Chargement texte="Lecture de vos projets…" />
          ) : visibles.length === 0 && groupes.sans.length === 0 ? (
            <Vide titre={filtre ? "Rien dans cette famille" : "Aucun projet"}>
              {filtre ? "Aucun permis ne correspond à ce filtre." : "Ouvrez un projet, puis saisissez son permis ou déposez le récépissé : le calendrier se calcule."}
            </Vide>
          ) : (
            <>
              {groupes.avec.map(([projetId, liste]) => {
                const pr = projetDe(projetId);
                return (
                  <div key={projetId}>
                    <div className="lor-projet-tete">
                      <span className="lor-projet-nom">{pr?.nom ?? "Projet"}{pr?.reference ? <span className="esp-kpi-sous"> · {pr.reference}</span> : null}</span>
                      <span className="lor-projet-lieu">{[pr?.commune, pr && NATURES_PROJET[pr.nature]].filter(Boolean).join(" · ")}</span>
                    </div>
                    <ul className="esp-liste" aria-label={pr?.nom ?? "Projet"}>
                      {liste.map((p) => {
                        const n = proposeesPar[p.id] ?? 0;
                        const e = ETATS[p.etat] ?? ETATS.a_deposer;
                        const prochaine = prochaineDate(p);
                        return (
                          <li key={p.id}>
                            <button type="button" aria-current={choisi === p.id ? "true" : undefined} className="esp-item" onClick={() => ouvrir(p.id)}>
                              <span className="esp-item-haut">
                                <Pastille teinte="noir">{TYPES[p.type_autorisation].court}</Pastille>
                                <Pastille teinte={e.teinte}>{e.court}</Pastille>
                                {n ? <Pastille teinte="ambre">{n} date{n > 1 ? "s" : ""} lue{n > 1 ? "s" : ""} à confirmer</Pastille> : null}
                              </span>
                              <span className="esp-item-montant">{p.numero ?? ""}</span>
                              <span className="esp-item-titre">{titrePermis(p, pr?.nom ?? "")}</span>
                              <span className="esp-item-bas">
                                {p.etat === "decision_a_confirmer" && p.calcul?.decision_implicite ? (
                                  <span className="esp-item-echeance" data-proche="true">{p.calcul.decision_implicite.nature === "tacite" ? "Accord tacite" : "Rejet implicite"} né le {dateCourte(`${p.calcul.decision_implicite.date}T12:00:00`)}</span>
                                ) : prochaine ? (
                                  <span className="esp-item-echeance" data-retard={prochaine < aujourdHuiIso()} data-proche={prochaine >= aujourdHuiIso() && prochaine <= aujourdHuiIso().slice(0, 8) + `${Math.min(31, Number(aujourdHuiIso().slice(8)) + 7)}`.padStart(2, "0")}>
                                    Prochaine étape le {dateCourte(`${prochaine}T12:00:00`)}
                                  </span>
                                ) : (
                                  <span>{p.date_depot ? `Déposé le ${dateCourte(`${p.date_depot}T12:00:00`)}` : "Pas encore déposé"}</span>
                                )}
                                {p.etat === "purge" && p.calcul?.chantier_sans_risque_le ? <span>Chantier sans risque depuis le {dateCourte(`${p.calcul.chantier_sans_risque_le}T12:00:00`)}</span> : null}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
              {groupes.sans.map((pr) => (
                <div key={pr.id}>
                  <div className="lor-projet-tete">
                    <span className="lor-projet-nom">{pr.nom}{pr.reference ? <span className="esp-kpi-sous"> · {pr.reference}</span> : null}</span>
                    <span className="lor-projet-lieu">{[pr.commune, NATURES_PROJET[pr.nature]].filter(Boolean).join(" · ")}</span>
                  </div>
                  <ul className="esp-liste" aria-label={pr.nom}>
                    <li>
                      <button type="button" aria-current={choisi === `projet:${pr.id}` ? "true" : undefined} className="esp-item" onClick={() => ouvrir(`projet:${pr.id}`)}>
                        <span className="esp-item-haut"><Pastille teinte="gris">Sans permis</Pastille></span>
                        <span className="esp-item-titre">Aucun permis saisi pour ce projet</span>
                        <span className="esp-item-bas"><span>Phase : {PHASES[pr.phase]}</span></span>
                      </button>
                    </li>
                  </ul>
                </div>
              ))}
            </>
          )}
        </section>

        <section id="esp-detail" className="esp-detail-mobile" aria-label="Le permis ouvert">
          {!pret ? (
            <div className="esp-carte"><Chargement texte="Lecture du dossier…" /></div>
          ) : permis && projet ? (
            <div style={{ display: "grid", gap: 14, gridTemplateColumns: "minmax(0, 1fr)" }}>
              <PermisVue
                permis={permis}
                projet={projet}
                dossier={dossier}
                source={source}
                peutEcrire={peutEcrire}
                nommer={nommer}
                /* une saisie fixe le permis ouvert : la liste se retrie, lui reste à l'écran */
                onLocal={(d) => { setChoix(permis.id); setLocal(d); }}
                relire={async () => { setChoix(permis.id); await relire(); }}
              />
              <ProjetCarte projet={projet} dossier={dossier} nommer={nommer} peutEcrire={peutEcrire} envoi={envoi} ouvrirForm={setForm} agir={agir} />
            </div>
          ) : projet ? (
            <ProjetCarte projet={projet} dossier={dossier} nommer={nommer} peutEcrire={peutEcrire} envoi={envoi} ouvrirForm={setForm} agir={agir} />
          ) : (
            <div className="esp-carte"><Vide titre="Choisissez un permis">Le calendrier, les dates lues sur les courriers et les recours s&apos;affichent ici.</Vide></div>
          )}
        </section>
      </div>

      <Formulaires
        form={form}
        fermer={() => setForm(null)}
        dossier={dossier}
        personnes={personnes}
        agir={agir}
        apres={(id, type) => setChoix(type === "projet" ? `projet:${id}` : id)}
        onEnvoi={setEnvoi}
      />
    </>
  );
}
