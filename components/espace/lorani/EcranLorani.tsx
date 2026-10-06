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
import { FolderPlus, Mail, Plus, UserPlus } from "lucide-react";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import { PERSONNES, nomPersonne } from "../exemples/socle";
import { useSource } from "../source";
import { useTempsReel } from "../tempsReel";
import { Avis, Chargement, Pastille, Ruban, Vide } from "../ui";
import { dateCourte } from "../format";
import { ETATS, FAMILLES, NATURES_INTERVENANT, NATURES_PROJET, PHASES, ROLES_PROJET, TYPES, TYPES_PIECE, famille, prochaineDate, titrePermis, type Famille } from "./etats";
import { dossierExemple } from "./exemples";
import Chantier from "./Chantier";
import Assurances from "./Assurances";
import Controle from "./Controle";
import PluProjet from "./PluProjet";
import Honoraires from "./Honoraires";
import PermisVue from "./PermisVue";
import { ajouterIntervenant, ajouterLot, ajouterMembre, chargerDossier, deposerCourrier, ouvrirPermis, ouvrirProjet } from "./portes";
import type { Dossier, Intervenant, Lot, MembreProjet, Permis, PieceProjet, Projet } from "./types";
import "./lorani.css";

type Form = { type: "projet" } | { type: "permis"; projet: string } | { type: "courrier"; projet: string } | { type: "lot"; projet: string } | { type: "intervenant"; projet: string } | { type: "membre"; projet: string } | null;

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
  const [erreurForm, setErreurForm] = useState<string | null>(null);

  /* ——— base réelle ——— */
  const charger = useCallback(async () => {
    await Promise.resolve();
    setErreur(null);
    try {
      setReel(await chargerDossier());
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base n'a pas répondu.");
      setReel({ ...dossierExemple(), projets: [], permis: [], datesLues: [], echeances: [], recours: [], lots: [], intervenants: [], membres: [], pieces: [], controles: [], controlePieces: [], constats: [], plu: [], attestations: [], moi: null });
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

  /* ——— les formulaires de l'écran ——— */
  const [np, setNp] = useState({ nom: "", reference: "", adresse: "", code_postal: "", commune: "", code_insee: "", parcelles: "", nature: "maison_individuelle", marche_public: false });
  const [nx, setNx] = useState({ type: "pc", intitule: "", numero: "", date_depot: "" });
  const [fichier, setFichier] = useState<File | null>(null);
  const [typePiece, setTypePiece] = useState("");
  const [nl, setNl] = useState({ numero: "", intitule: "" });
  const [ni, setNi] = useState({ nature: "bet_structure", organisme: "", contact: "", email: "", telephone: "", siren: "", lot_id: "" });
  const [nm, setNm] = useState({ user_id: "", role_projet: "chef_projet" });

  const appliquer = async (reel: () => Promise<void>, localFn: () => Dossier) => {
    setEnvoi(true);
    setErreurForm(null);
    try {
      if (source === "reelle") {
        await reel();
        await relire();
      } else {
        setLocal(localFn());
      }
      setForm(null);
    } catch (e) {
      setErreurForm(e instanceof Error ? e.message : "La base n'a pas répondu.");
    } finally {
      setEnvoi(false);
    }
  };
  const clientId = dossier.moi?.client_id ?? "";
  /* les honoraires (b5_12) gèrent leurs propres dialogues : l'erreur de la base leur revient */
  const agir = async (reel: () => Promise<void>, localFn: () => Dossier) => {
    if (source === "reelle") {
      await reel();
      await relire();
    } else {
      setLocal(localFn());
    }
  };

  const soumettreProjet = async () => {
    const parcelles = np.parcelles.split(/[,;\n]+/).map((x) => x.trim().toUpperCase()).filter(Boolean);
    const v = { client_id: clientId, nom: np.nom.trim(), reference: np.reference.trim() || null, adresse: np.adresse.trim() || null, code_postal: np.code_postal.trim() || null, commune: np.commune.trim() || null, code_insee: np.code_insee.trim() || null, parcelles, nature: np.nature as Projet["nature"], marche_public: np.marche_public };
    await appliquer(
      () => ouvrirProjet(v).then((id) => setChoix(`projet:${id}`)),
      () => {
        const id = `local-projet-${Date.now()}`;
        const nouveau: Projet = { ...v, id, entite_id: local.projets[0]?.entite_id ?? "", phase: "esq", territoire: "metropole", actif: true, cree_le: new Date().toISOString(), maj_le: new Date().toISOString() };
        setChoix(`projet:${id}`);
        return { ...local, projets: [nouveau, ...local.projets] };
      },
    );
  };

  const soumettrePermis = async () => {
    if (form?.type !== "permis") return;
    const v = { client_id: clientId, projet_id: form.projet, type_autorisation: nx.type as Permis["type_autorisation"], intitule: nx.intitule.trim() || null, numero: nx.numero.trim() || null, date_depot: nx.date_depot || null };
    await appliquer(
      () => ouvrirPermis(v).then((id) => setChoix(id)),
      () => {
        const id = `local-permis-${Date.now()}`;
        const nouveau: Permis = {
          ...v,
          id,
          entite_id: local.projets.find((p) => p.id === form.projet)?.entite_id ?? "",
          secteur_protege: false, immeuble_inscrit_mh: false, erp_autorisation: false, igh: false, evaluation_environnementale: false, cas_rejet: [],
          date_demande_pieces: null, date_pieces_fournies: null, delai_notifie_mois: null, date_notification_delai: null, decision: null, date_decision: null, date_affichage: null,
          actif: true, etat: v.date_depot ? "completude" : "a_deposer", silence: "tacite", date_decision_attendue: null, date_purge: null,
          calcul: { version: "lorani.m4.1", etat: v.date_depot ? "completude" : "a_deposer", etapes: v.date_depot ? [{ nature: "depot", libelle: "Dépôt du dossier en mairie", date: v.date_depot, statut: "fait" }] : [], avertissements: [] },
          calcule_le: new Date().toISOString(), cree_le: new Date().toISOString(), maj_le: new Date().toISOString(), pieces_demandees: [],
        };
        setChoix(id);
        return { ...local, permis: [nouveau, ...local.permis] };
      },
    );
  };

  const soumettreCourrier = async () => {
    if (form?.type !== "courrier" || !fichier) return;
    const f = fichier;
    await appliquer(
      () => deposerCourrier(clientId, form.projet, f, typePiece || null).then(() => undefined),
      () => {
        const nouveau: PieceProjet = { id: `local-piece-${Date.now()}`, objet_id: form.projet, nom_fichier: f.name, mime: f.type, statut: "en_lecture", type_piece: typePiece || null, cree_le: new Date().toISOString() };
        return { ...local, pieces: [nouveau, ...local.pieces] };
      },
    );
  };

  const soumettreLot = async () => {
    if (form?.type !== "lot") return;
    const v = { client_id: clientId, projet_id: form.projet, numero: nl.numero.trim(), intitule: nl.intitule.trim() };
    await appliquer(
      () => ajouterLot(v),
      () => ({ ...local, lots: [...local.lots, { id: `local-lot-${Date.now()}`, projet_id: v.projet_id, numero: v.numero, intitule: v.intitule, activites_requises: [] } satisfies Lot] }),
    );
  };

  const soumettreIntervenant = async () => {
    if (form?.type !== "intervenant") return;
    const v = { client_id: clientId, projet_id: form.projet, nature: ni.nature as Intervenant["nature"], organisme: ni.organisme.trim(), contact: ni.contact.trim() || null, email: ni.email.trim() || null, telephone: ni.telephone.trim() || null, siren: ni.siren.replace(/\s/g, "") || null, lot_id: ni.lot_id || null };
    await appliquer(
      () => ajouterIntervenant(v),
      () => ({ ...local, intervenants: [...local.intervenants, { ...v, id: `local-int-${Date.now()}`, actif: true } satisfies Intervenant] }),
    );
  };

  const soumettreMembre = async () => {
    if (form?.type !== "membre") return;
    const v = { client_id: clientId, projet_id: form.projet, user_id: nm.user_id, role_projet: nm.role_projet as MembreProjet["role_projet"] };
    await appliquer(
      () => ajouterMembre(v),
      () => ({ ...local, membres: [...local.membres, { id: `local-m-${Date.now()}`, projet_id: v.projet_id, user_id: v.user_id, role_projet: v.role_projet } satisfies MembreProjet] }),
    );
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
          <button type="button" className="r-btn r-btn--fil" disabled={gris} onClick={() => { setNp({ nom: "", reference: "", adresse: "", code_postal: "", commune: "", code_insee: "", parcelles: "", nature: "maison_individuelle", marche_public: false }); setErreurForm(null); setForm({ type: "projet" }); }}>
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
              <ProjetCarte projet={projet} dossier={dossier} nommer={nommer} peutEcrire={peutEcrire} envoi={envoi} ouvrirForm={(f) => { setErreurForm(null); setForm(f); }} agir={agir} />
            </div>
          ) : projet ? (
            <ProjetCarte projet={projet} dossier={dossier} nommer={nommer} peutEcrire={peutEcrire} envoi={envoi} ouvrirForm={(f) => { setErreurForm(null); setForm(f); }} agir={agir} />
          ) : (
            <div className="esp-carte"><Vide titre="Choisissez un permis">Le calendrier, les dates lues sur les courriers et les recours s&apos;affichent ici.</Vide></div>
          )}
        </section>
      </div>

      {/* ——— nouveau projet ——— */}
      <Dialog open={form?.type === "projet"} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><FolderPlus width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>Nouveau projet</DialogTitle>
            <DialogDescription>Le lieu du terrain fixe les règles : le code INSEE ou le code postal dit si le code de l&apos;urbanisme national s&apos;applique.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              <label className="rv-libelle">Nom du projet <span className="esp-obligatoire">(obligatoire)</span>
                <input className="rv-champ" value={np.nom} onChange={(e) => setNp((s) => ({ ...s, nom: e.target.value }))} maxLength={200} placeholder="Maison Lemoine" />
              </label>
              <div className="esp-form-ligne">
                <label className="rv-libelle">Référence interne
                  <input className="rv-champ" value={np.reference} onChange={(e) => setNp((s) => ({ ...s, reference: e.target.value }))} maxLength={60} placeholder="26-014" />
                </label>
                <label className="rv-libelle">Nature
                  <select className="rv-champ" value={np.nature} onChange={(e) => setNp((s) => ({ ...s, nature: e.target.value }))}>
                    {(Object.keys(NATURES_PROJET) as Projet["nature"][]).map((n) => <option key={n} value={n}>{NATURES_PROJET[n]}</option>)}
                  </select>
                </label>
              </div>
              <label className="rv-libelle">Adresse du terrain
                <input className="rv-champ" value={np.adresse} onChange={(e) => setNp((s) => ({ ...s, adresse: e.target.value }))} maxLength={300} />
              </label>
              <div className="esp-form-ligne">
                <label className="rv-libelle">Code postal <span className="esp-obligatoire">(obligatoire)</span>
                  <input className="rv-champ" inputMode="numeric" value={np.code_postal} onChange={(e) => setNp((s) => ({ ...s, code_postal: e.target.value.replace(/\D/g, "").slice(0, 5) }))} placeholder="44000" />
                </label>
                <label className="rv-libelle">Commune
                  <input className="rv-champ" value={np.commune} onChange={(e) => setNp((s) => ({ ...s, commune: e.target.value }))} maxLength={120} placeholder="Nantes" />
                </label>
              </div>
              <div className="esp-form-ligne">
                <label className="rv-libelle">Code INSEE
                  <input className="rv-champ" value={np.code_insee} onChange={(e) => setNp((s) => ({ ...s, code_insee: e.target.value.toUpperCase().slice(0, 5) }))} placeholder="44109" />
                </label>
                <label className="rv-libelle">Parcelles
                  <input className="rv-champ" value={np.parcelles} onChange={(e) => setNp((s) => ({ ...s, parcelles: e.target.value }))} placeholder="AB 123, AB 124" />
                </label>
              </div>
              <div className="lor-cases">
                <label><input type="checkbox" checked={np.marche_public} onChange={(e) => setNp((s) => ({ ...s, marche_public: e.target.checked }))} /> Marché public (maîtrise d&apos;ouvrage publique)</label>
              </div>
              {erreurForm ? <Avis teinte="rouge" role="alert">{erreurForm}</Avis> : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={!np.nom.trim() || !/^\d{5}$/.test(np.code_postal) || envoi} onClick={soumettreProjet}>{envoi ? <Loader variant="spin" /> : null} Ouvrir le projet</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ——— nouveau permis ——— */}
      <Dialog open={form?.type === "permis"} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><Plus width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>Nouveau permis</DialogTitle>
            <DialogDescription>Le type fixe le délai de droit commun (un mois pour une déclaration préalable, deux pour une maison, trois pour les autres permis). Les cas particuliers (secteur protégé, ERP, monument historique) se cochent ensuite sur le permis.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              <label className="rv-libelle">Type d&apos;autorisation
                <select className="rv-champ" value={nx.type} onChange={(e) => setNx((s) => ({ ...s, type: e.target.value }))}>
                  {(Object.keys(TYPES) as Permis["type_autorisation"][]).map((t) => <option key={t} value={t}>{TYPES[t].libelle}</option>)}
                </select>
              </label>
              <label className="rv-libelle">Intitulé
                <input className="rv-champ" value={nx.intitule} onChange={(e) => setNx((s) => ({ ...s, intitule: e.target.value }))} maxLength={120} placeholder="Extension, clôture, surélévation…" />
              </label>
              <div className="esp-form-ligne">
                <label className="rv-libelle">Numéro du dossier
                  <input className="rv-champ" value={nx.numero} onChange={(e) => setNx((s) => ({ ...s, numero: e.target.value }))} maxLength={40} placeholder="si déjà déposé" />
                </label>
                <label className="rv-libelle">Date de dépôt
                  <input className="rv-champ" type="date" value={nx.date_depot} onChange={(e) => setNx((s) => ({ ...s, date_depot: e.target.value }))} max={aujourdHuiIso()} />
                </label>
              </div>
              {erreurForm ? <Avis teinte="rouge" role="alert">{erreurForm}</Avis> : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={envoi} onClick={soumettrePermis}>{envoi ? <Loader variant="spin" /> : null} Saisir le permis</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ——— déposer un courrier ——— */}
      <Dialog open={form?.type === "courrier"} onOpenChange={(o) => { if (!o) { setForm(null); setFichier(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><Mail width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>Déposer un courrier de la mairie</DialogTitle>
            <DialogDescription>Récépissé, lettre de délai, demande de pièces, arrêté, certificat de permis tacite ou constat d&apos;affichage. Lorani le lit et vous propose la date à confirmer.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              <label className="rv-libelle" htmlFor="lor-courrier-fichier">
                <span>Fichier <span className="esp-obligatoire">(obligatoire)</span></span>
                <div className="esp-fichier">
                  <input id="lor-courrier-fichier" type="file" className="esp-fichier-natif" accept=".pdf,.png,.jpg,.jpeg" onChange={(e) => setFichier(e.target.files?.[0] ?? null)} />
                  <span className="r-btn r-btn--fil" role="presentation">Choisir un fichier</span>
                  <span className="esp-kpi-sous">{fichier ? `${fichier.name} · ${Math.round(fichier.size / 1024)} Ko` : "PDF ou image, 50 Mo au plus."}</span>
                </div>
              </label>
              <label className="rv-libelle">Nature du courrier
                <select className="rv-champ" value={typePiece} onChange={(e) => setTypePiece(e.target.value)}>
                  <option value="">Laisser Lorani reconnaître</option>
                  {TYPES_PIECE.map((t) => <option key={t.cle} value={t.cle}>{t.libelle}</option>)}
                </select>
              </label>
              {erreurForm ? <Avis teinte="rouge" role="alert">{erreurForm}</Avis> : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={!fichier || envoi} onClick={soumettreCourrier}>{envoi ? <Loader variant="spin" /> : null} Déposer</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ——— lot, intervenant, membre ——— */}
      <Dialog open={form?.type === "lot"} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><Plus width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>Ajouter un lot</DialogTitle>
            <DialogDescription>Le numéro est unique dans le projet (01, 02, 08.1…).</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              <div className="esp-form-ligne">
                <label className="rv-libelle">Numéro <span className="esp-obligatoire">(obligatoire)</span>
                  <input className="rv-champ" value={nl.numero} onChange={(e) => setNl((s) => ({ ...s, numero: e.target.value }))} maxLength={10} placeholder="01" />
                </label>
                <label className="rv-libelle">Intitulé <span className="esp-obligatoire">(obligatoire)</span>
                  <input className="rv-champ" value={nl.intitule} onChange={(e) => setNl((s) => ({ ...s, intitule: e.target.value }))} maxLength={200} placeholder="Gros œuvre" />
                </label>
              </div>
              {erreurForm ? <Avis teinte="rouge" role="alert">{erreurForm}</Avis> : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={!/^[0-9A-Za-z][0-9A-Za-z.-]{0,9}$/.test(nl.numero.trim()) || !nl.intitule.trim() || envoi} onClick={soumettreLot}>{envoi ? <Loader variant="spin" /> : null} Ajouter</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={form?.type === "intervenant"} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><UserPlus width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>Ajouter un intervenant</DialogTitle>
            <DialogDescription>Maître d&apos;ouvrage, bureaux d&apos;études, contrôleur, entreprise : qui travaille sur le projet, et sur quel lot.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              <div className="esp-form-ligne">
                <label className="rv-libelle">Rôle
                  <select className="rv-champ" value={ni.nature} onChange={(e) => setNi((s) => ({ ...s, nature: e.target.value }))}>
                    {(Object.keys(NATURES_INTERVENANT) as Intervenant["nature"][]).map((n) => <option key={n} value={n}>{NATURES_INTERVENANT[n]}</option>)}
                  </select>
                </label>
                <label className="rv-libelle">Lot
                  <select className="rv-champ" value={ni.lot_id} onChange={(e) => setNi((s) => ({ ...s, lot_id: e.target.value }))}>
                    <option value="">Tout le projet</option>
                    {dossier.lots.filter((l) => form?.type === "intervenant" && l.projet_id === form.projet).map((l) => <option key={l.id} value={l.id}>{l.numero} · {l.intitule}</option>)}
                  </select>
                </label>
              </div>
              <label className="rv-libelle">Organisme <span className="esp-obligatoire">(obligatoire)</span>
                <input className="rv-champ" value={ni.organisme} onChange={(e) => setNi((s) => ({ ...s, organisme: e.target.value }))} maxLength={200} />
              </label>
              <div className="esp-form-ligne">
                <label className="rv-libelle">Contact
                  <input className="rv-champ" value={ni.contact} onChange={(e) => setNi((s) => ({ ...s, contact: e.target.value }))} maxLength={200} />
                </label>
                <label className="rv-libelle">SIREN
                  <input className="rv-champ" inputMode="numeric" value={ni.siren} onChange={(e) => setNi((s) => ({ ...s, siren: e.target.value.replace(/\D/g, "").slice(0, 9) }))} />
                </label>
              </div>
              <div className="esp-form-ligne">
                <label className="rv-libelle">Courriel
                  <input className="rv-champ" type="email" value={ni.email} onChange={(e) => setNi((s) => ({ ...s, email: e.target.value }))} maxLength={320} />
                </label>
                <label className="rv-libelle">Téléphone
                  <input className="rv-champ" value={ni.telephone} onChange={(e) => setNi((s) => ({ ...s, telephone: e.target.value }))} maxLength={40} />
                </label>
              </div>
              {erreurForm ? <Avis teinte="rouge" role="alert">{erreurForm}</Avis> : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={!ni.organisme.trim() || (ni.siren !== "" && ni.siren.length !== 9) || envoi} onClick={soumettreIntervenant}>{envoi ? <Loader variant="spin" /> : null} Ajouter</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={form?.type === "membre"} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><UserPlus width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>Composer l&apos;équipe</DialogTitle>
            <DialogDescription>Le chef de projet reçoit les rappels et la ligne du point du matin. Un membre voit le projet s&apos;il y a accès ; un gérant ou un admin ouvre l&apos;accès.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              <div className="esp-form-ligne">
                <label className="rv-libelle">Personne <span className="esp-obligatoire">(obligatoire)</span>
                  <select className="rv-champ" value={nm.user_id} onChange={(e) => setNm((s) => ({ ...s, user_id: e.target.value }))}>
                    <option value="">Choisir…</option>
                    {personnes.map((p) => <option key={p.user_id} value={p.user_id}>{p.nom}</option>)}
                  </select>
                </label>
                <label className="rv-libelle">Rôle dans le projet
                  <select className="rv-champ" value={nm.role_projet} onChange={(e) => setNm((s) => ({ ...s, role_projet: e.target.value }))}>
                    {(Object.keys(ROLES_PROJET) as MembreProjet["role_projet"][]).map((r) => <option key={r} value={r}>{ROLES_PROJET[r]}</option>)}
                  </select>
                </label>
              </div>
              {erreurForm ? <Avis teinte="rouge" role="alert">{erreurForm}</Avis> : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={!nm.user_id || envoi} onClick={soumettreMembre}>{envoi ? <Loader variant="spin" /> : null} Ajouter</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ——— le dossier du projet : équipe, lots, intervenants, actions ——— */
function ProjetCarte({ projet, dossier, nommer, peutEcrire, envoi, ouvrirForm, agir }: { projet: Projet; dossier: Dossier; nommer: (id: string | null | undefined) => string; peutEcrire: boolean; envoi: boolean; ouvrirForm: (f: Form) => void; agir: (reel: () => Promise<void>, local: () => Dossier) => Promise<void> }) {
  const membres = dossier.membres.filter((m) => m.projet_id === projet.id);
  const lots = dossier.lots.filter((l) => l.projet_id === projet.id);
  const intervenants = dossier.intervenants.filter((i) => i.projet_id === projet.id && i.actif);
  const gris = !peutEcrire || envoi;
  return (
    <section className="esp-carte" aria-label="Dossier du projet">
      <div className="esp-carte-tete">
        <div>
          <h2 className="esp-carte-titre">{projet.nom}</h2>
          <div className="lor-sous">
            {[projet.reference, projet.adresse, [projet.code_postal, projet.commune].filter(Boolean).join(" "), projet.parcelles.length ? `parcelles ${projet.parcelles.join(", ")}` : null].filter(Boolean).join(" · ")}
          </div>
        </div>
        <span className="esp-item-haut">
          <Pastille contour>{NATURES_PROJET[projet.nature]}</Pastille>
          <Pastille contour>{PHASES[projet.phase]}</Pastille>
          {projet.marche_public ? <Pastille contour>Marché public</Pastille> : null}
          {projet.territoire ? <Pastille teinte="gris">{projet.territoire === "metropole" ? "Métropole" : projet.territoire}</Pastille> : <Pastille teinte="ambre">Territoire inconnu</Pastille>}
        </span>
      </div>
      <div className="esp-carte-corps">
        <div className="esp-actions">
          <button type="button" className="r-btn r-btn--noir" disabled={gris} onClick={() => ouvrirForm({ type: "courrier", projet: projet.id })}><Mail width={16} height={16} aria-hidden="true" /> Déposer un courrier de la mairie</button>
          <button type="button" className="r-btn r-btn--fil" disabled={gris} onClick={() => ouvrirForm({ type: "permis", projet: projet.id })}><Plus width={16} height={16} aria-hidden="true" /> Nouveau permis</button>
        </div>
      </div>
      <div className="esp-carte-corps">
        <div className="lor-grille-dossier">
          <div>
            <div className="esp-section-titre">
              <span>Équipe</span>
              <button type="button" className="esp-lien-bouton" disabled={gris} onClick={() => ouvrirForm({ type: "membre", projet: projet.id })}>Ajouter</button>
            </div>
            {membres.length ? (
              <dl className="esp-def">
                {membres.map((m) => (
                  <div key={m.id}>
                    <dt>{ROLES_PROJET[m.role_projet]}</dt>
                    <dd>{nommer(m.user_id)}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <div className="lor-tableau-vide">Personne : les rappels n&apos;ont pas de destinataire. Nommez un chef de projet.</div>
            )}
          </div>
          <div>
            <div className="esp-section-titre">
              <span>Lots</span>
              <button type="button" className="esp-lien-bouton" disabled={gris} onClick={() => ouvrirForm({ type: "lot", projet: projet.id })}>Ajouter</button>
            </div>
            {lots.length ? (
              <dl className="esp-def">
                {lots.map((l) => (
                  <div key={l.id}>
                    <dt className="esp-mono">{l.numero}</dt>
                    <dd>{l.intitule}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <div className="lor-tableau-vide">Aucun lot.</div>
            )}
          </div>
        </div>
      </div>
      <div className="esp-carte-corps">
        <div className="esp-section-titre">
          <span>Intervenants</span>
          <button type="button" className="esp-lien-bouton" disabled={gris} onClick={() => ouvrirForm({ type: "intervenant", projet: projet.id })}>Ajouter</button>
        </div>
        {intervenants.length ? (
          /* le tableau défile à 390 : focusable au clavier, nommé (axe, scrollable-region-focusable) */
          <div className="esp-tableau-cadre" tabIndex={0} role="region" aria-label="Intervenants du projet">
            <table className="esp-tableau">
              <thead>
                <tr>
                  <th>Rôle</th>
                  <th>Organisme</th>
                  <th>Contact</th>
                  <th>Lot</th>
                </tr>
              </thead>
              <tbody>
                {intervenants.map((i) => (
                  <tr key={i.id}>
                    <td>{NATURES_INTERVENANT[i.nature]}</td>
                    <td>{i.organisme}{i.siren ? <span className="esp-kpi-sous"> · SIREN {i.siren}</span> : null}</td>
                    <td>{[i.contact, i.email, i.telephone].filter(Boolean).join(" · ") || "—"}</td>
                    <td>{i.lot_id ? (lots.find((l) => l.id === i.lot_id)?.numero ?? "—") : "Tout le projet"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="lor-tableau-vide">Aucun intervenant.</div>
        )}
      </div>
      <PluProjet projet={projet} dossier={dossier} peutEcrire={peutEcrire} agir={agir} />
      <Controle projet={projet} dossier={dossier} nommer={nommer} peutEcrire={peutEcrire} agir={agir} />
      <Honoraires projet={projet} dossier={dossier} nommer={nommer} peutEcrire={peutEcrire} agir={agir} />
      <Chantier projet={projet} dossier={dossier} peutEcrire={peutEcrire} agir={agir} />
      <Assurances projet={projet} dossier={dossier} peutEcrire={peutEcrire} agir={agir} />
    </section>
  );
}
