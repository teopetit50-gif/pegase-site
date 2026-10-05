"use client";

/* ══════════════════════════════════════════════════════════════════════
   /espace/validations — la file de ce qui attend une décision (05/10/2026)

   Deux sources, une seule interface : l'exemple (components/espace/
   exemples/validations.ts) ou la base réelle (portes.ts, sous RLS). Le
   choix vient de l'interrupteur de la barre (source.tsx).

   La liste est triée par PRIORITÉ (regles.ts : retard → aujourd'hui →
   semaine → plus tard → sans échéance ; puis échéance, montant, âge) et
   groupée par échéance. Le détail, à droite (ou en dessous sur
   téléphone), porte la règle (X approbations sur Y, rôles), les décisions
   déjà prises, la séparation saisie / approbation quand elle s'applique,
   et les quatre actions. Les formulaires vivent dans des Dialog (ui/
   dialog) : le commentaire, la pièce jointe et le motif de refus y sont
   OBLIGATOIRES quand la règle l'exige (regles.ts → exigences()).

   En mode exemple, une décision ne quitte pas l'écran : elle est
   appliquée en mémoire (la demande avance, le fil s'enrichit), pour que
   l'enchaînement se voie. Rien n'est écrit nulle part.
   ══════════════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Utilisateur } from "@/lib/compte";
import { APPROBATIONS_EXEMPLE, DELEGATIONS_EXEMPLE, DEMANDES_EXEMPLE } from "../exemples/validations";
import { EXEMPLE_MOI, PERSONNES, nomEntite, nomPersonne } from "../exemples/socle";
import { useSource } from "../source";
import { Avis, Chargement, Pastille, Ruban, Vide } from "../ui";
import { dateCourte, libelleModule, montant, relatif } from "../format";
import type { Approbation, Delegation, Demande, Entite, Role } from "../types";
import { GROUPES, STATUTS, compteApprobations, groupeDe, trier, type Decideur } from "./regles";
import { chargerContexte, chargerFile, type ContexteSocle } from "./portes";
import DetailDemande from "./DetailDemande";

type Etat = {
  demandes: Demande[];
  approbations: Approbation[];
  delegations: Delegation[];
  contexte: ContexteSocle | null;
};

type Filtre = "a_decider" | "en_attente" | "decidees" | "toutes";

const FILTRES: { cle: Filtre; libelle: string }[] = [
  { cle: "a_decider", libelle: "À décider par moi" },
  { cle: "en_attente", libelle: "Toutes en attente" },
  { cle: "decidees", libelle: "Décidées" },
  { cle: "toutes", libelle: "Toutes" },
];

export default function FileValidations({ utilisateur }: { utilisateur: Utilisateur | null }) {
  const { source } = useSource();
  /* deux états, un par source : l'exemple (modifié en mémoire par les
     décisions prises à l'écran) et le réel (relu à chaque bascule) */
  const [local, setLocal] = useState<Etat>(() => ({
    demandes: DEMANDES_EXEMPLE,
    approbations: APPROBATIONS_EXEMPLE,
    delegations: DELEGATIONS_EXEMPLE,
    contexte: null,
  }));
  const [reel, setReel] = useState<Etat | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [filtre, setFiltre] = useState<Filtre>("a_decider");
  const [module, setModule] = useState<string | null>(null);
  const [choix, setChoix] = useState<string | null>(null);

  const etat = source === "exemple" ? local : reel;

  /* ——— chargement de la base réelle ——— */
  const charger = useCallback(async () => {
    await Promise.resolve();
    setErreur(null);
    setReel(null);
    try {
      const [contexte, file] = await Promise.all([chargerContexte(), chargerFile()]);
      setReel({ ...file, contexte });
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base n'a pas répondu.");
      setReel({ demandes: [], approbations: [], delegations: [], contexte: null });
    }
  }, []);

  useEffect(() => {
    if (source !== "reelle") return;
    /* lancée hors du corps de l'effet : la lecture est asynchrone, l'état
       n'est posé qu'à la réponse de la base */
    const t = window.setTimeout(() => void charger(), 0);
    return () => window.clearTimeout(t);
  }, [source, charger]);

  /* ——— qui suis-je, dans cette source ——— */
  const moi: Decideur = useMemo(() => {
    if (source === "exemple") return { id: EXEMPLE_MOI, role: "valideur" as Role };
    return { id: etat?.contexte?.user_id ?? utilisateur?.id ?? "", role: etat?.contexte?.compte?.role ?? null };
  }, [source, etat, utilisateur]);

  const nommer = useCallback(
    (id: string | null | undefined): string => {
      if (!id) return "Système";
      if (id === moi.id) return "Vous";
      if (source === "exemple") return nomPersonne(id);
      const a = etat?.contexte?.annuaire.find((x) => x.user_id === id);
      if (a) return a.nom;
      const c = etat?.contexte?.comptes.find((x) => x.user_id === id);
      return c ? `${id.slice(0, 8)} (${c.role})` : id.slice(0, 8);
    },
    [source, etat, moi.id],
  );

  const entites: Entite[] = useMemo(() => {
    if (source === "exemple") return [];
    return etat?.contexte?.entites ?? [];
  }, [source, etat]);

  const nommerEntite = useCallback(
    (id: string | null | undefined): string => {
      if (source === "exemple") return nomEntite(id);
      if (!id) return "Toutes les entités";
      return entites.find((e) => e.id === id)?.nom ?? id.slice(0, 8);
    },
    [source, entites],
  );

  /* ——— la liste filtrée, triée, groupée ——— */
  const modules = useMemo(() => Array.from(new Set((etat?.demandes ?? []).map((d) => d.module))).sort(), [etat]);

  const visibles = useMemo(() => {
    if (!etat) return [];
    const base = etat.demandes.filter((d) => {
      if (module && d.module !== module) return false;
      if (filtre === "toutes") return true;
      if (filtre === "decidees") return d.statut !== "en_attente";
      if (d.statut !== "en_attente") return false;
      if (filtre === "en_attente") return true;
      /* à décider par moi : la règle m'autorise (rôle ou délégation) et je n'ai pas encore décidé */
      const dejaMoi = etat.approbations.some((a) => a.demande_id === d.id && a.user_id === moi.id);
      if (dejaMoi) return false;
      if (d.demandeur_type === "utilisateur" && d.demandeur_id === moi.id) return true; // visible, mais grisée : la séparation s'affiche
      if (moi.role && d.roles_autorises.includes(moi.role)) return true;
      return etat.delegations.some((g) => g.delegataire === moi.id && !g.revoquee_le && (!g.module || g.module === d.module));
    });
    return trier(base);
  }, [etat, filtre, module, moi]);

  const groupes = useMemo(() => {
    const m = new Map<string, Demande[]>();
    for (const d of visibles) {
      const g = d.statut === "en_attente" ? groupeDe(d) : "decidees";
      m.set(g, [...(m.get(g) ?? []), d]);
    }
    return m;
  }, [visibles]);

  /* la demande ouverte : celle qu'on a choisie si elle est encore visible, sinon la première */
  const choisie = choix && visibles.some((d) => d.id === choix) ? choix : (visibles[0]?.id ?? null);

  const demande = useMemo(() => etat?.demandes.find((d) => d.id === choisie) ?? null, [etat, choisie]);

  /* ——— compteurs ——— */
  const compteurs = useMemo(() => {
    const attente = (etat?.demandes ?? []).filter((d) => d.statut === "en_attente");
    const retard = attente.filter((d) => groupeDe(d) === "retard").length;
    const jour = attente.filter((d) => groupeDe(d) === "aujourdhui").length;
    const total = attente.reduce((s, d) => s + (d.montant ?? 0), 0);
    return { attente: attente.length, retard, jour, total };
  }, [etat]);

  /* ——— en mode exemple, appliquer une décision en mémoire ——— */
  const appliquerLocal = useCallback(
    (a: Approbation) => {
      setLocal((prev) => {
        if (!prev) return prev;
        const approbations = [a, ...prev.approbations];
        const demandes = prev.demandes.map((d) => {
          if (d.id !== a.demande_id) return d;
          const { faites, refus } = compteApprobations(d, approbations);
          if (refus > 0) return { ...d, statut: "rejetee" as const, decide_le: a.decide_le };
          if (faites >= d.approbations_requises) return { ...d, statut: "approuvee" as const, decide_le: a.decide_le };
          return d;
        });
        return { ...prev, approbations, demandes };
      });
    },
    [],
  );

  const ajouterLocal = useCallback((d: Demande, remplace: string) => {
    setLocal((prev) =>
      prev
        ? {
            ...prev,
            demandes: [d, ...prev.demandes.map((x) => (x.id === remplace ? { ...x, statut: "annulee" as const, decide_le: new Date().toISOString() } : x))],
          }
        : prev,
    );
    setChoix(d.id);
  }, []);

  const ajouterDelegationLocal = useCallback((g: Delegation) => {
    setLocal((prev) => ({ ...prev, delegations: [g, ...prev.delegations] }));
  }, []);

  const personnes = useMemo(() => {
    if (source === "exemple") return Object.entries(PERSONNES).filter(([id]) => id !== EXEMPLE_MOI).map(([id, p]) => ({ id, libelle: `${p.nom} (${p.role})` }));
    const annuaire = etat?.contexte?.annuaire ?? [];
    if (annuaire.length) return annuaire.filter((a) => a.user_id !== moi.id).map((a) => ({ id: a.user_id, libelle: `${a.nom} (${a.role})` }));
    return (etat?.contexte?.comptes ?? []).filter((c) => c.user_id !== moi.id).map((c) => ({ id: c.user_id, libelle: `${c.user_id.slice(0, 8)} (${c.role})` }));
  }, [source, etat, moi.id]);

  return (
    <>
      <div className="esp-tete" data-arrivee="">
        <div>
          <h1 className="esp-titre">À valider</h1>
          <p className="esp-sous">
            Ce qui attend votre décision, par priorité et par échéance. Approuvez, refusez, modifiez ou déléguez ;
            chaque décision est prise en votre nom et reste lisible dans le journal.
          </p>
        </div>
        <Ruban source={source} />
      </div>

      <div className="esp-kpis" data-arrivee="">
        <button type="button" className="esp-kpi" data-teinte={compteurs.retard ? "rouge" : undefined} aria-pressed={filtre === "en_attente" && !module} onClick={() => { setFiltre("en_attente"); setModule(null); }}>
          <span className="esp-kpi-etiquette">En retard</span>
          <span className="esp-kpi-valeur">{compteurs.retard}</span>
          <span className="esp-kpi-sous">échéance dépassée</span>
        </button>
        <button type="button" className="esp-kpi" data-teinte={compteurs.jour ? "ambre" : undefined} aria-pressed={false} onClick={() => { setFiltre("en_attente"); setModule(null); }}>
          <span className="esp-kpi-etiquette">Aujourd&apos;hui</span>
          <span className="esp-kpi-valeur">{compteurs.jour}</span>
          <span className="esp-kpi-sous">à décider avant ce soir</span>
        </button>
        <button type="button" className="esp-kpi" aria-pressed={filtre === "a_decider"} onClick={() => { setFiltre("a_decider"); setModule(null); }}>
          <span className="esp-kpi-etiquette">En attente</span>
          <span className="esp-kpi-valeur">{compteurs.attente}</span>
          <span className="esp-kpi-sous">demandes ouvertes</span>
        </button>
        <div className="esp-kpi" data-teinte="bleu" role="note">
          <span className="esp-kpi-etiquette">Montant en attente</span>
          <span className="esp-kpi-valeur" style={{ fontSize: 22 }}>{montant(compteurs.total)}</span>
          <span className="esp-kpi-sous">toutes demandes ouvertes</span>
        </div>
      </div>

      {erreur ? (
        <div style={{ marginBottom: 14 }}>
          <Avis teinte="rouge" role="alert">
            <strong>La base réelle n&apos;a pas répondu.</strong> {erreur} Repassez sur les données d&apos;exemple, ou réessayez.
          </Avis>
        </div>
      ) : null}

      <div className="esp-grille">
        <section className="esp-carte" aria-label="File des demandes">
          <div className="esp-carte-tete">
            <h2 className="esp-carte-titre">File</h2>
            <span className="esp-kpi-sous">{visibles.length} demande{visibles.length > 1 ? "s" : ""}</span>
          </div>
          <div className="esp-carte-corps" style={{ display: "grid", gap: 8 }}>
            <div className="esp-filtres" role="group" aria-label="Filtrer la file">
              {FILTRES.map((f) => (
                <button key={f.cle} type="button" className="esp-filtre" aria-pressed={filtre === f.cle} onClick={() => setFiltre(f.cle)}>
                  {f.libelle}
                </button>
              ))}
            </div>
            {modules.length > 1 ? (
              <div className="esp-filtres" role="group" aria-label="Filtrer par module">
                <button type="button" className="esp-filtre" aria-pressed={module === null} onClick={() => setModule(null)}>
                  Tous les modules
                </button>
                {modules.map((m) => (
                  <button key={m} type="button" className="esp-filtre" aria-pressed={module === m} onClick={() => setModule(m)}>
                    {libelleModule(m)}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          {!etat ? (
            <Chargement texte="Lecture de la file…" />
          ) : visibles.length === 0 ? (
            <Vide titre="Rien à décider">
              {filtre === "a_decider" ? "Aucune demande n'attend votre décision pour l'instant." : "Aucune demande ne correspond à ce filtre."}
            </Vide>
          ) : (
            <>
              {[...GROUPES, { cle: "decidees" as const, libelle: "Décidées" }].map((g) => {
                const liste = groupes.get(g.cle);
                if (!liste?.length) return null;
                return (
                  <div key={g.cle}>
                    <div className="esp-groupe-titre" data-teinte={"teinte" in g ? g.teinte : undefined}>
                      <span>{g.libelle}</span>
                      <span>{liste.length}</span>
                    </div>
                    <ul className="esp-liste" role="listbox" aria-label={g.libelle}>
                      {liste.map((d) => {
                        const c = compteApprobations(d, etat.approbations);
                        const grp = groupeDe(d);
                        const moiDemandeur = d.demandeur_type === "utilisateur" && d.demandeur_id === moi.id;
                        return (
                          <li key={d.id}>
                            <button
                              type="button"
                              role="option"
                              aria-selected={choisie === d.id}
                              className="esp-item"
                              onClick={() => {
                                setChoix(d.id);
                                if (window.innerWidth < 1024) document.getElementById("esp-detail")?.scrollIntoView({ behavior: "smooth", block: "start" });
                              }}
                            >
                              <span className="esp-item-haut">
                                <Pastille teinte="noir">{libelleModule(d.module)}</Pastille>
                                {d.statut !== "en_attente" ? <Pastille teinte={STATUTS[d.statut].teinte}>{STATUTS[d.statut].libelle}</Pastille> : null}
                                {d.approbations_requises > 1 ? <Pastille contour>{c.faites}/{c.requises} approbations</Pastille> : null}
                                {moiDemandeur ? <Pastille teinte="ambre">Saisie par vous</Pastille> : null}
                              </span>
                              <span className="esp-item-montant">{d.montant !== null ? montant(d.montant, d.devise) : ""}</span>
                              <span className="esp-item-titre">{d.resume}</span>
                              <span className="esp-item-bas">
                                <span className="esp-item-echeance" data-retard={grp === "retard"} data-proche={grp === "aujourdhui"}>
                                  {d.echeance ? `Échéance ${relatif(d.echeance)}` : "Sans échéance"}
                                </span>
                                <span>{nommerEntite(d.entite_id)}</span>
                                <span>Demandé par {nommer(d.demandeur_id)} le {dateCourte(d.cree_le)}</span>
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </>
          )}
        </section>

        <section id="esp-detail" className="esp-detail-mobile" aria-label="Détail de la demande">
          {etat && demande ? (
            <DetailDemande
              demande={demande}
              approbations={etat.approbations}
              delegations={etat.delegations}
              moi={moi}
              source={source}
              clientId={etat.contexte?.compte?.client_id ?? demande.client_id}
              email={utilisateur?.email ?? null}
              entites={entites}
              personnes={personnes}
              nommer={nommer}
              nommerEntite={nommerEntite}
              onDecisionLocale={appliquerLocal}
              onDemandeLocale={ajouterLocal}
              onDelegationLocale={ajouterDelegationLocal}
              recharger={charger}
            />
          ) : etat ? (
            <div className="esp-carte">
              <Vide titre="Choisissez une demande">Le détail et les actions s&apos;affichent ici.</Vide>
            </div>
          ) : null}
        </section>
      </div>
    </>
  );
}
