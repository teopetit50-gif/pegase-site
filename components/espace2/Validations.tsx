"use client";

/* ══════════════════════════════════════════════════════════════════════
   /espace2/validations — « À valider », redessiné (07/10/2026)

   Le dessin est celui de la maquette de Teo, à l'identique : trois onglets
   soulignés, la recherche et « Décider en lot » à droite ; trois filtres
   (modules, catégories, échéances) ; une carte par groupe d'échéance, une
   ligne par demande (case, intitulé, module · nature, icône du module,
   montant et échéance, chevron) ; à droite, le circuit d'approbation de
   la demande choisie et les délégations.

   La logique n'a pas changé : c'est celle de components/espace/validations/
   FileValidations.tsx (mêmes sources exemple / base réelle, même temps
   réel, même verdict, mêmes décisions en mémoire sur l'exemple). Le
   détail complet et ses quatre actions — DetailDemande, inchangé — s'ouvre
   dans un panneau par « Consulter la demande » ; les délégations se gèrent
   dans le même panneau (MesDelegations, inchangé).
   ══════════════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  ChevronRight,
  ChevronDown,
  CircleCheck,
  CircleDashed,
  CircleX,
  FileText,
  Inbox,
  KeyRound,
  LayoutGrid,
  ListFilter,
  MessageCircle,
  ReceiptText,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { Dialog, Modal, ModalOverlay } from "react-aria-components";
import type { Utilisateur } from "@/lib/compte";
import { APPROBATIONS_EXEMPLE, DELEGATIONS_EXEMPLE, DEMANDES_EXEMPLE, EQUIPES_EXEMPLE } from "@/components/espace/exemples/validations";
import { EXEMPLE_MOI, PERSONNES, nomEntite, nomPersonne } from "@/components/espace/exemples/socle";
import { useSource } from "@/components/espace/source";
import { useTempsReel } from "@/components/espace/tempsReel";
import { dateCourte, libelleModule, montant, phrase } from "@/components/espace/format";
import type { Approbation, Delegation, Demande, Entite, Role } from "@/components/espace/types";
import { GROUPES, STATUTS, compteApprobations, groupeDe, trier, verdict, type Decideur } from "@/components/espace/validations/regles";
import { chargerContexte, chargerFile, type ContexteSocle } from "@/components/espace/validations/portes";
import DetailDemande from "@/components/espace/validations/DetailDemande";
import DecisionLot, { eligibilite } from "@/components/espace/validations/DecisionLot";
import MesDelegations from "@/components/espace/validations/MesDelegations";
import { Note } from "./ui";
import { EnDirect, IconeModule, Initiales } from "./vivant";
import { useToast } from "./Toasts";
import "@/components/espace/espace.css";
import "./habillage.css";

type Etat = { demandes: Demande[]; approbations: Approbation[]; delegations: Delegation[]; contexte: ContexteSocle | null };
type Filtre = "a_decider" | "en_attente" | "decidees";

const ONGLETS: { cle: Filtre; libelle: string }[] = [
  { cle: "a_decider", libelle: "À décider par moi" },
  { cle: "en_attente", libelle: "Toutes en attente" },
  { cle: "decidees", libelle: "Décidées" },
];

/* l'icône de la colonne du milieu, par module */
const ICONES: Record<string, typeof FileText> = {
  cashd: RefreshCw,
  filed: ReceiptText,
  reput: MessageCircle,
  offload: MessageCircle,
  tavaro: KeyRound,
};

/* la nature d'une demande, dite comme on la dit (sinon : la clé en phrase) */
const NATURES: Record<string, string> = {
  virement_fournisseur: "Virement à approuver",
  payer_facture: "Facture à payer",
  lever_anomalie: "Anomalie à lever",
  commande: "Commande à approuver",
  conge: "Congé à accorder",
  decouvert: "Découvert à autoriser",
  prelevement_sepa: "Prélèvement SEPA",
  remboursement_caution: "Caution à rembourser",
};
const nature = (cle: string | null | undefined) => (cle ? (NATURES[cle] ?? phrase(cle)) : "Décision");
const categorie_libelle = (cle: string) => (NATURES[cle] ? NATURES[cle].replace(/ à .*$/, "") : phrase(cle));

const NATURE_DOSSIER: Record<string, string> = { filed_facture: "Facture fournisseur" };
const RANGS = ["Première", "Seconde", "Troisième", "Quatrième", "Cinquième"];

/* « Hier », « Aujourd'hui », « Demain », « Dans 3 jours », « Il y a 4 jours » */
function jourRelatif(iso: string): string {
  const a = new Date(iso);
  a.setHours(0, 0, 0, 0);
  const b = new Date();
  b.setHours(0, 0, 0, 0);
  const n = Math.round((a.getTime() - b.getTime()) / 86_400_000);
  if (n === 0) return "Aujourd'hui";
  if (n === -1) return "Hier";
  if (n === 1) return "Demain";
  return n > 0 ? `Dans ${n} jours` : `Il y a ${-n} jours`;
}

export default function Validations({ utilisateur }: { utilisateur: Utilisateur | null }) {
  const { source } = useSource();
  const toast = useToast();
  const [local, setLocal] = useState<Etat>(() => ({ demandes: DEMANDES_EXEMPLE, approbations: APPROBATIONS_EXEMPLE, delegations: DELEGATIONS_EXEMPLE, contexte: null }));
  const [reel, setReel] = useState<Etat | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [filtre, setFiltre] = useState<Filtre>("a_decider");
  const [module, setModule] = useState("");
  const [categorie, setCategorie] = useState("");
  const [echeance, setEcheance] = useState("");
  const [recherche, setRecherche] = useState<string | null>(null);
  const [choix, setChoix] = useState<string | null>(null);
  const [coches, setCoches] = useState<string[]>([]);
  const [decisionLot, setDecisionLot] = useState<{ decision: "approuve" | "rejete"; demandes: Demande[]; cle: number } | null>(null);
  /* le panneau de droite : le détail complet, ou la gestion des délégations */
  const [panneau, setPanneau] = useState<"detail" | "delegations" | null>(null);

  const etat = source === "exemple" ? local : reel;

  /* ——— chargement de la base réelle (comme FileValidations) ——— */
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
    const t = window.setTimeout(() => void charger(), 0);
    return () => window.clearTimeout(t);
  }, [source, charger]);
  const relire = useCallback(async () => {
    try {
      const [contexte, file] = await Promise.all([chargerContexte(), chargerFile()]);
      setReel({ ...file, contexte });
    } catch {
      /* la prochaine lecture à la main dira l'erreur */
    }
  }, []);
  useTempsReel(["demandes_validation", "approbations", "delegations"], source === "reelle", relire);

  /* ——— qui suis-je, qui sont les autres ——— */
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
  const equipes = useMemo(() => (source === "exemple" ? EQUIPES_EXEMPLE : (etat?.contexte?.equipes ?? { noms: {}, membres: {} })), [source, etat]);
  const entites: Entite[] = useMemo(() => (source === "exemple" ? [] : (etat?.contexte?.entites ?? [])), [source, etat]);
  const nommerEntite = useCallback(
    (id: string | null | undefined): string => {
      if (source === "exemple") return nomEntite(id);
      if (!id) return "Toutes les entités";
      return entites.find((e) => e.id === id)?.nom ?? id.slice(0, 8);
    },
    [source, entites],
  );
  const personnes = useMemo(() => {
    if (source === "exemple") return Object.entries(PERSONNES).filter(([id]) => id !== EXEMPLE_MOI).map(([id, p]) => ({ id, libelle: `${p.nom} (${p.role})` }));
    const annuaire = etat?.contexte?.annuaire ?? [];
    if (annuaire.length) return annuaire.filter((a) => a.user_id !== moi.id).map((a) => ({ id: a.user_id, libelle: `${a.nom} (${a.role})` }));
    return (etat?.contexte?.comptes ?? []).filter((c) => c.user_id !== moi.id).map((c) => ({ id: c.user_id, libelle: `${c.user_id.slice(0, 8)} (${c.role})` }));
  }, [source, etat, moi.id]);

  /* ——— la file : onglet, filtres, recherche ——— */
  const modules = useMemo(() => Array.from(new Set((etat?.demandes ?? []).map((d) => d.module))).sort(), [etat]);
  const categories = useMemo(() => Array.from(new Set((etat?.demandes ?? []).map((d) => d.type_action).filter(Boolean))).sort(), [etat]);

  const visibles = useMemo(() => {
    if (!etat) return [];
    const q = (recherche ?? "").trim().toLowerCase();
    const base = etat.demandes.filter((d) => {
      if (module && d.module !== module) return false;
      if (categorie && d.type_action !== categorie) return false;
      if (q && !`${d.resume} ${libelleModule(d.module)} ${d.objet_id ?? ""}`.toLowerCase().includes(q)) return false;
      if (filtre === "decidees") return d.statut !== "en_attente";
      if (d.statut !== "en_attente") return false;
      if (echeance && groupeDe(d) !== echeance) return false;
      if (filtre === "en_attente") return true;
      if (etat.approbations.some((a) => a.demande_id === d.id && a.user_id === moi.id)) return false;
      if (d.demandeur_type === "utilisateur" && d.demandeur_id === moi.id) return true;
      return verdict(d, moi, etat.approbations, etat.delegations, new Date(), equipes).peut;
    });
    return trier(base);
  }, [etat, filtre, module, categorie, echeance, recherche, moi, equipes]);

  const groupes = useMemo(() => {
    const m = new Map<string, Demande[]>();
    for (const d of visibles) {
      const g = d.statut === "en_attente" ? groupeDe(d) : "decidees";
      m.set(g, [...(m.get(g) ?? []), d]);
    }
    return m;
  }, [visibles]);

  const choisie = choix && visibles.some((d) => d.id === choix) ? choix : (visibles[0]?.id ?? null);
  const demande = useMemo(() => etat?.demandes.find((d) => d.id === choisie) ?? null, [etat, choisie]);

  /* ——— le lot : une case par demande décidable ——— */
  const decidables = useMemo(
    () => (etat ? visibles.filter((d) => d.statut === "en_attente" && eligibilite(d, moi, etat.approbations, etat.delegations, equipes).ok) : []),
    [visibles, etat, moi, equipes],
  );
  const cochees = useMemo(() => decidables.filter((d) => coches.includes(d.id)), [decidables, coches]);
  const cocher = (id: string, v: boolean) => setCoches((c) => (v ? [...c.filter((x) => x !== id), id] : c.filter((x) => x !== id)));

  /* ——— en mode exemple, appliquer en mémoire (comme FileValidations) ——— */
  const appliquerLocal = useCallback((a: Approbation) => {
    setLocal((prev) => {
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
  }, []);
  const ajouterLocal = useCallback((d: Demande, remplace: string) => {
    setLocal((prev) => ({ ...prev, demandes: [d, ...prev.demandes.map((x) => (x.id === remplace ? { ...x, statut: "annulee" as const, decide_le: new Date().toISOString() } : x))] }));
    setChoix(d.id);
  }, []);
  const annulerLocal = useCallback((id: string) => {
    setLocal((prev) => ({ ...prev, demandes: prev.demandes.map((x) => (x.id === id ? { ...x, statut: "annulee" as const, decide_le: new Date().toISOString() } : x)) }));
  }, []);
  const revoquerLocal = useCallback((id: string) => {
    setLocal((prev) => ({ ...prev, delegations: prev.delegations.map((g) => (g.id === id ? { ...g, revoquee_le: new Date().toISOString() } : g)) }));
  }, []);
  const ajouterDelegationLocal = useCallback((g: Delegation) => {
    setLocal((prev) => ({ ...prev, delegations: [g, ...prev.delegations] }));
  }, []);

  /* ——— le circuit de la demande choisie ——— */
  const circuit = useMemo(() => {
    if (!etat || !demande) return null;
    const liees = etat.approbations.filter((a) => a.demande_id === demande.id).sort((a, b) => a.decide_le.localeCompare(b.decide_le));
    const { faites } = compteApprobations(demande, etat.approbations);
    const restantes = demande.statut === "en_attente" ? Math.max(0, demande.approbations_requises - faites) : 0;
    return { liees, faites, restantes };
  }, [etat, demande]);

  /* ——— les délégations en cours qui me concernent ——— */
  const delegationsEnCours = useMemo(() => {
    const maintenant = new Date().toISOString();
    return (etat?.delegations ?? []).filter((g) => !g.revoquee_le && g.fin >= maintenant && (g.delegant === moi.id || g.delegataire === moi.id));
  }, [etat, moi.id]);

  const sousTitre = (d: Demande) => {
    if (d.statut !== "en_attente") return `${libelleModule(d.module)} · ${STATUTS[d.statut].libelle}`;
    return `${libelleModule(d.module)} · ${nature(d.type_action)}`;
  };

  return (
    <div className="v2-page v2-arrivee v2-val v2-vivant">
      <h1 className="v2-sr">À valider</h1>

      {/* ——— la vue et les filtres, en menus ; la recherche à droite ——— */}
      <div className="v2-val-filtres">
        <Selecteur icone={Inbox} valeur={filtre} changer={(v) => setFiltre(v as Filtre)} options={ONGLETS.map((o) => ({ cle: o.cle, libelle: o.libelle }))} />
        <Selecteur icone={LayoutGrid} valeur={module} changer={setModule} tous="Tous les modules" options={modules.map((m) => ({ cle: m, libelle: libelleModule(m) }))} />
        <Selecteur icone={ListFilter} valeur={categorie} changer={setCategorie} tous="Toutes les catégories" options={categories.map((c) => ({ cle: c, libelle: categorie_libelle(c) }))} />
        <Selecteur icone={CalendarDays} valeur={echeance} changer={setEcheance} tous="Toutes les échéances" options={GROUPES.map((g) => ({ cle: g.cle, libelle: g.libelle }))} />
        <span className="v2-val-droite">
          <EnDirect />
          {recherche !== null ? (
            <span className="v2-val-recherche">
              <Search width={16} height={16} aria-hidden="true" />
              <input autoFocus value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Rechercher une demande…" aria-label="Rechercher une demande" />
              <button type="button" className="v2-val-icone" aria-label="Fermer la recherche" onClick={() => setRecherche(null)}>
                <X width={14} height={14} />
              </button>
            </span>
          ) : (
            <button type="button" className="v2-val-bouton v2-val-bouton--icone" aria-label="Rechercher" onClick={() => setRecherche("")}>
              <Search width={16} height={16} />
            </button>
          )}
        </span>
      </div>

      {erreur ? (
        <Note teinte="rouge" role="alert">
          La base réelle n&apos;a pas répondu : {erreur}
        </Note>
      ) : null}

      {/* ——— la barre du lot, quand des cases sont cochées ——— */}
      {cochees.length ? (
        <div className="v2-val-lot" role="group" aria-label="Décision en lot">
          <span>
            {cochees.length} demande{cochees.length > 1 ? "s" : ""} cochée{cochees.length > 1 ? "s" : ""}
          </span>
          <span className="v2-val-actions">
            <button type="button" className="v2-btn v2-btn--petit v2-btn--fantome" onClick={() => setCoches([])}>
              Annuler
            </button>
            <button type="button" className="v2-btn v2-btn--petit" onClick={() => setDecisionLot({ decision: "rejete", demandes: cochees, cle: Date.now() })}>
              Refuser ({cochees.length})
            </button>
            <button type="button" className="v2-btn v2-btn--petit v2-btn--primaire" onClick={() => setDecisionLot({ decision: "approuve", demandes: cochees, cle: Date.now() })}>
              Approuver ({cochees.length})
            </button>
          </span>
        </div>
      ) : null}

      <div className="v2-val-grille">
        {/* ——— la file, une carte par échéance ——— */}
        <div className="v2-val-col">
          {!etat ? (
            <div className="v2-carte v2-val-vide">Lecture de la file…</div>
          ) : visibles.length === 0 ? (
            <div className="v2-carte v2-val-vide">
              {filtre === "a_decider" ? "Aucune demande n'attend votre décision pour l'instant." : "Aucune demande ne correspond à ces filtres."}
            </div>
          ) : (
            [...GROUPES, { cle: "decidees" as const, libelle: "Décidées" }].map((g) => {
              const liste = groupes.get(g.cle);
              if (!liste?.length) return null;
              return (
                <section key={g.cle} className="v2-carte" aria-label={g.libelle}>
                  <h2 className="v2-val-groupe">{g.libelle}</h2>
                  <ul className="v2-val-liste">
                    {liste.map((d) => {
                      const Icone = ICONES[d.module] ?? FileText;
                      const decidable = decidables.some((x) => x.id === d.id);
                      const quand = d.statut !== "en_attente" ? (d.decide_le ? jourRelatif(d.decide_le) : "") : d.echeance ? jourRelatif(d.echeance) : "";
                      return (
                        <li key={d.id} className="v2-val-ligne" aria-current={choisie === d.id ? "true" : undefined}>
                          <span className="v2-val-case">
                            <input
                              type="checkbox"
                              checked={coches.includes(d.id)}
                              disabled={!decidable}
                              title={decidable ? undefined : "Cette demande ne peut pas être décidée par vous en lot"}
                              aria-label={`Cocher : ${d.resume}`}
                              onChange={(e) => cocher(d.id, e.target.checked)}
                            />
                          </span>
                          <button type="button" className="v2-val-corps" onClick={() => setChoix(d.id)}>
                            <span className="v2-val-texte">
                              <span>{d.resume}</span>
                              <small>{sousTitre(d)}</small>
                            </span>
                            <span className="v2-val-module" aria-hidden="true">
                              <IconeModule cle={d.module} icone={Icone} taille={20} />
                            </span>
                            <span className="v2-val-montant">
                              <span>{d.montant !== null ? montant(d.montant, d.devise) : "—"}</span>
                              <small data-retard={d.statut === "en_attente" && groupeDe(d) === "retard" ? "" : undefined}>{quand}</small>
                            </span>
                            <ChevronRight width={16} height={16} aria-hidden="true" className="v2-val-chevron" />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })
          )}
        </div>

        {/* ——— à droite : le circuit, puis les délégations ——— */}
        <div className="v2-val-col v2-val-cote">
          <section className="v2-carte" aria-label="Circuit d'approbation">
            <h2 className="v2-val-groupe">Circuit d&apos;approbation</h2>
            {demande && circuit ? (
              <div className="v2-val-circuit">
                <div>
                  <p className="v2-val-circuit-titre">{demande.resume}</p>
                  <p className="v2-val-gris">
                    {libelleModule(demande.module)} · {circuit.faites} sur {demande.approbations_requises} approbation{demande.approbations_requises > 1 ? "s" : ""}
                  </p>
                </div>
                <div className="v2-val-jauge" role="progressbar" aria-valuemin={0} aria-valuemax={demande.approbations_requises} aria-valuenow={circuit.faites}>
                  <span style={{ width: `${Math.min(100, (circuit.faites / Math.max(1, demande.approbations_requises)) * 100)}%` }} />
                </div>
                <ol className="v2-val-etapes">
                  {circuit.liees.map((a) => (
                    <li key={a.id}>
                      <span className="v2-val-etape-icone v2-val-etape-avatar" data-refus={a.decision === "rejete" ? "" : undefined}>
                        <Initiales nom={a.user_nom ?? nommer(a.user_id)} taille={22} />
                        <i>{a.decision === "rejete" ? <CircleX width={11} height={11} /> : <CircleCheck width={11} height={11} />}</i>
                      </span>
                      <span>
                        <span className="v2-val-etape-nom">{a.user_nom ?? nommer(a.user_id)}</span>
                        <small className="v2-val-gris">
                          {a.decision === "rejete" ? "A refusé" : "A approuvé"} · {new Date(a.decide_le).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}
                        </small>
                      </span>
                    </li>
                  ))}
                  {Array.from({ length: circuit.restantes }, (_, i) => (
                    <li key={`attente-${i}`} data-attente="">
                      <span className="v2-val-etape-icone">
                        <CircleDashed width={18} height={18} />
                      </span>
                      <span>
                        <span className="v2-val-etape-nom">{RANGS[circuit.faites + i] ?? `${circuit.faites + i + 1}e`} approbation</span>
                        <small className="v2-val-gris">En attente</small>
                      </span>
                    </li>
                  ))}
                  {demande.statut !== "en_attente" && !circuit.liees.length ? (
                    <li>
                      <span className="v2-val-etape-icone"><CircleCheck width={18} height={18} /></span>
                      <span>
                        <span className="v2-val-etape-nom">{STATUTS[demande.statut].libelle}</span>
                        <small className="v2-val-gris">{demande.decide_le ? dateCourte(demande.decide_le) : ""}</small>
                      </span>
                    </li>
                  ) : null}
                </ol>
                {demande.objet_id ? (
                  <div className="v2-val-dossier">
                    <p className="v2-val-gris" style={{ margin: 0 }}>Dossier associé</p>
                    <div className="v2-val-dossier-ligne">
                      <FileText width={20} height={20} aria-hidden="true" />
                      <span>{demande.objet_id}</span>
                      <small className="v2-val-gris">{NATURE_DOSSIER[demande.objet_type ?? ""] ?? phrase(demande.objet_type)}</small>
                    </div>
                  </div>
                ) : null}
                <button type="button" className="v2-val-lien" onClick={() => setPanneau("detail")}>
                  Consulter la demande <ArrowRight width={16} height={16} aria-hidden="true" />
                </button>
              </div>
            ) : (
              <p className="v2-val-gris v2-val-pad">Choisissez une demande pour voir son circuit.</p>
            )}
          </section>

          <section className="v2-carte" aria-label="Délégations">
            <h2 className="v2-val-groupe">Délégations</h2>
            {delegationsEnCours.length ? (
              <ul className="v2-val-delegations">
                {delegationsEnCours.map((g) => {
                  const donnee = g.delegant === moi.id;
                  return (
                    <li key={g.id}>
                      <Initiales nom={donnee ? (g.delegataire_nom ?? nommer(g.delegataire)) : (g.delegant_nom ?? nommer(g.delegant))} taille={28} />
                      <span className="v2-val-texte">
                        <span>{donnee ? `Donnée → ${g.delegataire_nom ?? nommer(g.delegataire)}` : `Reçue ← ${g.delegant_nom ?? nommer(g.delegant)}`}</span>
                        <small>
                          {g.module ? libelleModule(g.module) : "Tous les modules"} · Jusqu&apos;au {new Date(g.fin).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}
                        </small>
                      </span>
                      <button type="button" className="v2-val-lien v2-val-lien--petit" onClick={() => setPanneau("delegations")}>
                        {donnee ? (
                          <>
                            Gérer <ArrowRight width={14} height={14} aria-hidden="true" />
                          </>
                        ) : (
                          <>
                            Voir <ArrowUpRight width={14} height={14} aria-hidden="true" />
                          </>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="v2-val-gris v2-val-pad">Aucune délégation en cours. Pour en donner une, ouvrez une demande puis « Déléguer ».</p>
            )}
          </section>
        </div>
      </div>

      {/* ——— la décision en lot (inchangée) ——— */}
      {etat && decisionLot ? (
        <div className="resa esp">
          {/* DecisionLot ouvre son propre dialogue, habillé par html.v2-actif */}
          <DecisionLot
            key={decisionLot.cle}
            ouvert
            decision={decisionLot.decision}
            choisies={decisionLot.demandes}
            moi={moi}
            source={source}
            approbations={etat.approbations}
            delegations={etat.delegations}
            equipes={equipes}
            nommer={nommer}
            onDecisionLocale={appliquerLocal}
            recharger={relire}
            onFermer={(bilan) => {
              const decision = decisionLot.decision;
              setDecisionLot(null);
              if (bilan?.length) {
                const ok = bilan.filter((l) => l.ok).length;
                toast(`${ok} demande${ok > 1 ? "s" : ""} ${decision === "approuve" ? "approuvée" : "refusée"}${ok > 1 ? "s" : ""}${bilan.length > ok ? ` ; ${bilan.length - ok} restée${bilan.length - ok > 1 ? "s" : ""} dans la file` : ""}`, "vert");
                setCoches((c) => c.filter((id) => bilan.some((l) => !l.ok && l.demande.id === id)));
              }
            }}
          />
        </div>
      ) : null}

      {/* ——— le panneau : détail complet et actions, ou délégations ——— */}
      <ModalOverlay isOpen={panneau !== null} onOpenChange={(o) => !o && setPanneau(null)} isDismissable className="v2-jetons v2-voile v2-voile--assistant">
        <Modal className="v2-assistant v2-val-panneau">
          <Dialog className="v2-modale-dialogue v2-assistant-corps" aria-label={panneau === "delegations" ? "Délégations" : "Détail de la demande"}>
            <div className="v2-assistant-tete">
              <strong style={{ fontWeight: 500 }}>{panneau === "delegations" ? "Délégations" : "Détail de la demande"}</strong>
              <button type="button" className="v2-btn v2-btn--petit v2-btn--icone v2-btn--fantome" aria-label="Fermer" onClick={() => setPanneau(null)} style={{ marginLeft: "auto" }}>
                <X width={16} height={16} />
              </button>
            </div>
            <div className="v2 v2-val-panneau-corps"><div className="resa esp">
              {panneau === "detail" && etat && demande ? (
                <DetailDemande
                  demande={demande}
                  approbations={etat.approbations}
                  delegations={etat.delegations}
                  equipes={equipes}
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
                  onAnnulationLocale={annulerLocal}
                  onDelegationLocale={ajouterDelegationLocal}
                  recharger={charger}
                  onFait={(t) => {
                    if (t) toast(t, "vert");
                  }}
                />
              ) : null}
              {panneau === "delegations" && etat ? (
                <MesDelegations delegations={etat.delegations} moi={moi.id} source={source} nommer={nommer} onRevocationLocale={revoquerLocal} recharger={charger} />
              ) : null}
            </div></div>
          </Dialog>
        </Modal>
      </ModalOverlay>
    </div>
  );
}

/* un filtre : l'icône, le libellé choisi, ⌃⌄ — un <select> natif posé
   dessus, invisible, pour le clavier et les lecteurs d'écran */
function Selecteur({
  icone: Icone,
  valeur,
  changer,
  tous,
  options,
}: {
  icone: typeof FileText;
  valeur: string;
  changer: (v: string) => void;
  tous?: string;
  options: { cle: string; libelle: string }[];
}) {
  const choisi = options.find((o) => o.cle === valeur)?.libelle ?? tous ?? "";
  return (
    <label className="v2-val-bouton" data-actif={valeur && tous ? "" : undefined}>
      <Icone width={16} height={16} aria-hidden="true" />
      <span>{choisi}</span>
      <ChevronDown width={14} height={14} aria-hidden="true" className="v2-val-bouton-chevron" />
      <select value={valeur} onChange={(e) => changer(e.target.value)} aria-label={tous ?? "Vue"}>
        {tous ? <option value="">{tous}</option> : null}
        {options.map((o) => (
          <option key={o.cle} value={o.cle}>
            {o.libelle}
          </option>
        ))}
      </select>
    </label>
  );
}
