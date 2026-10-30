"use client";

/* ══════════════════════════════════════════════════════════════════════
   FILED — « Circuit de validation » sur l'éditeur de workflow de Plain
   (28/10/2026, 2e vague)

   Le canevas dessine le circuit réel : le déclencheur (une demande
   d'approbation FILED), puis, règle par règle (celles de FILED, puis la
   règle commune), un bloc « Si / sinon » (action, montant) relié au bloc
   « Approbation » qu'il déclenche (nombre d'approbations, rôles, exigences) ;
   le « sinon » passe à la règle suivante. Les délégations en cours sont
   des blocs à part, sous le déclencheur. Données et portes : celles de
   l'écran d'avant (./Fonctions.tsx : useCircuit, regles_validation sous
   RLS, chargerFile), et chaque geste y est passé :
     · la recherche « Filtrer les règles et les demandes » → la recherche
       du panneau « Étapes » (atténue les blocs qui ne répondent pas) ;
     · le bandeau (demandes en attente, montant, délégations, décisions
       sur 30 jours) → la ligne de résumé du panneau « Validations » et le
       compteur du bouton de la barre ;
     · les tableaux « En attente », « Délégations », « Décisions » → les
       lignes du panneau « Validations » (une demande ouverte montre sa
       fiche et ses étapes : règle appliquée, approbations, motif) et les
       blocs « Délégation » ;
     · « À valider » et le lien de chaque demande → le bouton de la barre,
       le ⋯, et « Ouvrir dans À valider » dans la fiche d'une demande ;
     · les règles (action, tranche, approbations, rôles, exigences) → les
       blocs et, au clic, le panneau « Configurer » qui les détaille.
   Rien ne se décide ni ne se modifie ici (les règles se posent à
   l'installation ; les décisions se prennent dans « À valider »).
   ══════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useRef, useState } from "react";
import { CalendarDays, CheckCheck, ExternalLink, FileText, Layers, MessageSquare, Paperclip, Play, Shuffle, Sparkles, UserRound, Users, Zap } from "lucide-react";
import { useMaintenant } from "../horloge";
import { dateCourte, dateHeure, montant, relatif } from "@/components/espace3/base/format";
import { EQUIPES_EXEMPLE } from "@/components/espace3/base/exemples/validations";
import { STATUTS, compteApprobations } from "@/components/espace3/base/validations/regles";
import type { Approbation, Delegation, Demande, Regle } from "@/components/espace3/base/types";
import { MenuActions, type Option } from "../lin/Lin";
import {
  Badge,
  CarteCondition,
  Champ,
  Condition,
  EditeurPlain,
  ElementPanneau,
  Encart,
  Etape,
  Fiche,
  Groupe,
  LigneExecution,
  Onglets,
  Op,
  Ou,
  PanneauTete,
  Puce,
  Rangee,
  RangeeAction,
  RangeeSinon,
  Recherche,
  Section,
  type LienPE,
  type NoeudPE,
  type PoigneeEditeur,
} from "../lin/Canevas";
import { Note } from "../ui";
import { RACINE } from "../modules";
import { ROLES, action, nomDe, tranche, useCircuit } from "./Fonctions";

const CHEMIN = `${RACINE}/filed/circuit`;
const JOUR = 86_400_000;
const sansAccents = (x: string) => x.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? "s" : ""}`;
const roles = (r: Regle) => r.roles_autorises.map((y) => ROLES[y] ?? y).join(", ");
const equipe = (id: string | null) => (id ? (EQUIPES_EXEMPLE.noms[id] ?? "Une équipe dédiée") : null);
const approbations = (r: Regle) => `${r.approbations_requises} approbation${r.approbations_requises > 1 ? "s" : ""}`;
const teinteStatut = (t: (typeof STATUTS)[keyof typeof STATUTS]["teinte"]) => (t === "bleu" ? "gris" : t);

/* les puces de la condition d'une règle : [Action · est · …] puis [Montant · … · …] */
function lignesRegle(r: Regle): React.ReactNode[] {
  const action1 = r.type_action ? (
    <>
      <Puce>Action</Puce>
      <Op>EST</Op>
      <Puce>{action(r.type_action)}</Puce>
    </>
  ) : (
    <>
      <Puce>Module</Puce>
      <Op>EST</Op>
      <Puce>{r.module === "*" ? "tous" : r.module.toUpperCase()}</Puce>
    </>
  );
  const montant1 =
    r.montant_max === null ? (
      r.montant_min > 0 ? (
        <>
          <Puce>Montant</Puce>
          <Op>≥</Op>
          <Puce>{montant(r.montant_min)}</Puce>
        </>
      ) : (
        <>
          <Puce>Montant</Puce>
          <Op>EST</Op>
          <Puce>tout montant</Puce>
        </>
      )
    ) : (
      <>
        <Puce>Montant</Puce>
        <Op>ENTRE</Op>
        <Puce>{montant(r.montant_min)}</Puce>
        <Op>ET</Op>
        <Puce>{montant(r.montant_max)}</Puce>
      </>
    );
  return [action1, <Op key="et">ET</Op>, montant1];
}

type Onglet = "etapes" | "validations";

export default function CircuitEditeur() {
  const { donnees, erreur } = useCircuit();
  const maintenant = useMaintenant();
  const router = useRouter();
  const sp = useSearchParams();
  const editeur = useRef<PoigneeEditeur>(null);
  const [q, setQ] = useState("");

  const onglet: Onglet = sp.get("onglet") === "validations" ? "validations" : "etapes";
  const bloc = sp.get("bloc");
  const demandeId = sp.get("demande");

  const poser = useCallback(
    (cles: Record<string, string | null>) => {
      const p = new URLSearchParams(sp.toString());
      for (const [k, v] of Object.entries(cles)) {
        if (v === null) p.delete(k);
        else p.set(k, v);
      }
      const s = p.toString();
      router.replace(s ? `${CHEMIN}?${s}` : CHEMIN, { scroll: false });
    },
    [router, sp],
  );
  const choisir = useCallback((id: string | null) => poser({ bloc: id, demande: null }), [poser]);
  const ouvrirBloc = useCallback(
    (id: string) => {
      poser({ bloc: id, demande: null });
      editeur.current?.centrer(id);
    },
    [poser],
  );

  const calc = useMemo(() => {
    if (!donnees || maintenant === null) return null;
    const filed = donnees.demandes.filter((d) => d.module === "filed");
    const attente = filed.filter((d) => d.statut === "en_attente").sort((a, b) => (a.echeance ?? "9999").localeCompare(b.echeance ?? "9999"));
    const decidees = filed.filter((d) => d.decide_le && maintenant - new Date(d.decide_le).getTime() <= 30 * JOUR).sort((a, b) => (b.decide_le ?? "").localeCompare(a.decide_le ?? ""));
    const delegations = donnees.delegations.filter((g) => !g.revoquee_le && (g.module === null || g.module === "filed") && new Date(g.fin).getTime() > maintenant && new Date(g.debut).getTime() <= maintenant);
    const regles = donnees.regles.filter((r) => r.actif && (r.module === "filed" || r.module === "*")).sort((a, b) => Number(a.module === "*") - Number(b.module === "*") || a.montant_min - b.montant_min);
    const lignes = [...attente, ...decidees].sort((a, b) => (b.decide_le ?? b.cree_le).localeCompare(a.decide_le ?? a.cree_le));
    return { attente, decidees, delegations, regles, lignes };
  }, [donnees, maintenant]);

  /* ——— le circuit : déclencheur → règle (si → approbation ; sinon → règle suivante) ; délégations sous le déclencheur ——— */
  const { noeuds, liens } = useMemo(() => {
    if (!calc) return { noeuds: [] as NoeudPE[], liens: [] as LienPE[] };
    const noeuds: NoeudPE[] = [];
    const liens: LienPE[] = [];
    noeuds.push({
      id: "declencheur",
      teinte: "vert",
      icone: <Play aria-hidden="true" />,
      titre: "Début",
      libelle: "Début : une demande d'approbation FILED",
      colonne: 0,
      rangee: 0,
      sortie: "sortie",
      corps: <Rangee>{calc.regles.length ? "Demande d'approbation créée" : "Demande d'approbation créée — aucune règle posée"}</Rangee>,
    });
    calc.regles.forEach((r, i) => {
      noeuds.push({
        id: `regle:${r.id}`,
        teinte: "jaune",
        icone: <Shuffle aria-hidden="true" />,
        titre: "Si / sinon",
        libelle: `Règle : ${action(r.type_action)}, ${tranche(r)}`,
        colonne: 1,
        rangee: i,
        entree: true,
        corps: (
          <>
            <Condition libelle="Si" lignes={lignesRegle(r)} sortie="si" />
            <RangeeSinon sortie="sinon">Sinon</RangeeSinon>
          </>
        ),
      });
      const eq = equipe(r.equipe_id);
      noeuds.push({
        id: `appro:${r.id}`,
        teinte: "indigo",
        icone: <CheckCheck aria-hidden="true" />,
        titre: "Approbation",
        libelle: `Approbation : ${approbations(r)} par ${roles(r)}`,
        colonne: 2,
        rangee: i,
        entree: true,
        corps: (
          <>
            <RangeeAction icone={<Sparkles aria-hidden="true" />}>
              {approbations(r)} · {roles(r)}
            </RangeeAction>
            {eq ? <RangeeAction icone={<Users aria-hidden="true" />}>Décidée par {eq}</RangeeAction> : null}
            {r.exige_commentaire ? <RangeeAction icone={<MessageSquare aria-hidden="true" />}>Commentaire obligatoire</RangeeAction> : null}
            {r.exige_piece ? <RangeeAction icone={<Paperclip aria-hidden="true" />}>Pièce jointe à la décision</RangeeAction> : null}
            {r.exige_motif !== false ? <RangeeAction icone={<FileText aria-hidden="true" />}>Motif en cas de refus</RangeeAction> : null}
          </>
        ),
      });
      liens.push({ de: i === 0 ? "declencheur" : `regle:${calc.regles[i - 1].id}`, sortie: i === 0 ? "sortie" : "sinon", vers: `regle:${r.id}` });
      liens.push({ de: `regle:${r.id}`, sortie: "si", vers: `appro:${r.id}` });
    });
    calc.delegations.forEach((g, j) => {
      noeuds.push({
        id: `deleg:${g.id}`,
        teinte: "gris",
        icone: <UserRound aria-hidden="true" />,
        titre: "Délégation",
        libelle: `Délégation de ${nomDe(g.delegant, g.delegant_nom)} à ${nomDe(g.delegataire, g.delegataire_nom)}`,
        colonne: 0,
        rangee: j + 1,
        corps: (
          <>
            <Rangee>
              {nomDe(g.delegant, g.delegant_nom)} → {nomDe(g.delegataire, g.delegataire_nom)}
            </Rangee>
            <RangeeAction icone={<CalendarDays aria-hidden="true" />}>Jusqu&apos;au {dateCourte(g.fin)}</RangeeAction>
            {g.module ? <RangeeAction icone={<Layers aria-hidden="true" />}>Module {g.module.toUpperCase()}</RangeeAction> : null}
          </>
        ),
      });
    });
    return { noeuds, liens };
  }, [calc]);

  /* la recherche : les blocs qui ne répondent pas s'atténuent, la liste se filtre */
  const r = sansAccents(q.trim());
  const garde = useCallback((...xs: (string | null | undefined)[]) => !r || xs.some((x) => x && sansAccents(x).includes(r)), [r]);
  const eteints = useMemo(() => {
    const s = new Set<string>();
    if (!r || !calc) return s;
    for (const g of calc.regles) {
      const ok = garde(action(g.type_action), tranche(g), roles(g), approbations(g), g.module);
      if (!ok) {
        s.add(`regle:${g.id}`);
        s.add(`appro:${g.id}`);
      }
    }
    for (const g of calc.delegations) if (!garde(nomDe(g.delegant, g.delegant_nom), nomDe(g.delegataire, g.delegataire_nom), g.motif)) s.add(`deleg:${g.id}`);
    return s;
  }, [r, calc, garde]);

  const demande = useMemo(() => (calc && demandeId ? (calc.lignes.find((d) => d.id === demandeId) ?? null) : null), [calc, demandeId]);
  const regleDe = (d: Demande) => calc?.regles.find((x) => x.id === d.regle_id) ?? null;

  const options: Option[] = [
    { cle: "valider", libelle: "Ouvrir À valider", icone: <CheckCheck width={14} height={14} aria-hidden="true" />, href: `${RACINE}/validations` },
    { cle: "etapes", libelle: "Afficher les étapes", coche: onglet === "etapes" && !bloc && !demandeId, action: () => poser({ onglet: null, bloc: null, demande: null }) },
    { cle: "validations", libelle: "Afficher les validations", coche: onglet === "validations" && !bloc && !demandeId, action: () => poser({ onglet: "validations", bloc: null, demande: null }) },
    { cle: "ajuster", libelle: "Ajuster le circuit à la fenêtre", action: () => editeur.current?.ajuster() },
  ];

  /* ——— le panneau ——— */
  let panneau: React.ReactNode;
  if (!calc) {
    panneau = (
      <>
        <PanneauTete titre="Circuit" />
        <div className="pe-panneau-corps pe-panneau-corps--pad">
          {erreur ? (
            <Note teinte="rouge" role="alert">
              <strong>La base réelle n&apos;a pas répondu.</strong> {erreur}
            </Note>
          ) : (
            <p className="pe-panneau-vide" aria-busy="true">
              Chargement du circuit…
            </p>
          )}
        </div>
      </>
    );
  } else if (bloc) {
    panneau = <PanneauConfigurer bloc={bloc} calc={calc} fermer={() => choisir(null)} />;
  } else if (demande) {
    panneau = <PanneauDemande demande={demande} regle={regleDe(demande)} approbations={donnees!.approbations} fermer={() => poser({ demande: null })} ouvrirRegle={(id) => ouvrirBloc(`regle:${id}`)} />;
  } else {
    panneau = (
      <>
        <div className="pe-panneau-tete">
          <Onglets<Onglet>
            libelle="Panneau"
            actif={onglet}
            changer={(o) => poser({ onglet: o === "etapes" ? null : o })}
            onglets={[
              { cle: "etapes", libelle: "Étapes" },
              { cle: "validations", libelle: "Validations", n: calc.attente.length || undefined },
            ]}
          />
        </div>
        {onglet === "etapes" ? (
          <div className="pe-panneau-corps pe-panneau-corps--pad">
            <Recherche valeur={q} changer={setQ} placeholder="Filtrer les règles et les demandes" libelle="Filtrer les règles, les approbations et les délégations" />
            <div className="pe-groupes">
              <Groupe titre="Déclencheur">
                <ElementPanneau
                  teinte="vert"
                  icone={<Play aria-hidden="true" />}
                  aide="Une demande d'approbation FILED : une facture à payer, une anomalie à lever, un IBAN à confirmer."
                  actif={bloc === "declencheur"}
                  onClick={() => ouvrirBloc("declencheur")}
                >
                  Demande d&apos;approbation
                </ElementPanneau>
              </Groupe>
              <Groupe titre="Règles">
                {calc.regles.filter((g) => !eteints.has(`regle:${g.id}`)).length ? (
                  calc.regles
                    .filter((g) => !eteints.has(`regle:${g.id}`))
                    .map((g) => (
                      <ElementPanneau
                        key={g.id}
                        teinte="jaune"
                        icone={<Shuffle aria-hidden="true" />}
                        aide={`${g.module === "*" ? "Règle commune à tous les modules" : "Règle propre à FILED"} · ${tranche(g)}`}
                        chip={g.module === "*" ? <span className="pe-element-chip">commune</span> : undefined}
                        onClick={() => ouvrirBloc(`regle:${g.id}`)}
                      >
                        {action(g.type_action)} · {tranche(g)}
                      </ElementPanneau>
                    ))
                ) : (
                  <p className="pe-panneau-vide">{r ? "Aucune règle ne répond." : "Aucune règle pour l'instant. Les règles se posent à l'installation, avec vous."}</p>
                )}
              </Groupe>
              <Groupe titre="Approbations">
                {calc.regles.filter((g) => !eteints.has(`appro:${g.id}`)).length ? (
                  calc.regles
                    .filter((g) => !eteints.has(`appro:${g.id}`))
                    .map((g) => (
                      <ElementPanneau
                        key={g.id}
                        teinte="indigo"
                        icone={<CheckCheck aria-hidden="true" />}
                        aide={`Pour « ${action(g.type_action)} », ${tranche(g)} : ${roles(g)}`}
                        onClick={() => ouvrirBloc(`appro:${g.id}`)}
                      >
                        {approbations(g)} · {roles(g)}
                      </ElementPanneau>
                    ))
                ) : (
                  <p className="pe-panneau-vide">{r ? "Aucune approbation ne répond." : "Aucune approbation : posez d'abord une règle."}</p>
                )}
              </Groupe>
              <Groupe titre="Délégations">
                {calc.delegations.filter((g) => !eteints.has(`deleg:${g.id}`)).length ? (
                  calc.delegations
                    .filter((g) => !eteints.has(`deleg:${g.id}`))
                    .map((g) => (
                      <ElementPanneau key={g.id} teinte="gris" icone={<UserRound aria-hidden="true" />} aide={g.motif ?? `Jusqu'au ${dateCourte(g.fin)}`} onClick={() => ouvrirBloc(`deleg:${g.id}`)}>
                        {nomDe(g.delegant, g.delegant_nom)} → {nomDe(g.delegataire, g.delegataire_nom)}
                      </ElementPanneau>
                    ))
                ) : (
                  <p className="pe-panneau-vide">{r ? "Aucune délégation ne répond." : "Aucune délégation en cours. Une absence se couvre par une délégation datée, depuis « À valider »."}</p>
                )}
              </Groupe>
            </div>
          </div>
        ) : (
          <div className="pe-panneau-corps">
            {erreur ? (
              <div style={{ padding: 16 }}>
                <Note teinte="rouge" role="alert">
                  <strong>La base réelle n&apos;a pas répondu.</strong> {erreur}
                </Note>
              </div>
            ) : null}
            <p className="pe-execution-resume">
              {pluriel(calc.attente.length, "demande")} en attente · {montant(calc.attente.reduce((s, d) => s + (d.montant ?? 0), 0))} · {calc.attente.filter((d) => d.approbations_requises > 1).length} en double
              approbation · {pluriel(calc.delegations.length, "délégation")} · {pluriel(calc.decidees.length, "décision")} sur 30 jours
            </p>
            {calc.lignes.length ? (
              calc.lignes.map((d) => {
                const st = STATUTS[d.statut];
                return (
                  <LigneExecution
                    key={d.id}
                    date={dateHeure(d.decide_le ?? d.cree_le)}
                    sous={d.resume}
                    badge={<Badge teinte={teinteStatut(st.teinte)}>{st.libelle}</Badge>}
                    onClick={() => poser({ demande: d.id, bloc: null })}
                  />
                );
              })
            ) : (
              <p className="pe-panneau-vide">Aucune demande FILED : rien en attente, aucune décision sur 30 jours.</p>
            )}
          </div>
        )}
      </>
    );
  }

  return (
    <EditeurPlain
      ref={editeur}
      titre="Circuit de validation"
      retour={`${RACINE}/filed`}
      badge={calc ? (calc.regles.length ? { libelle: "En vigueur" } : { libelle: "Aucune règle", teinte: "gris" }) : undefined}
      actions={
        <>
          <span className="v2 pe-plus">
            <span className="lin">
              <MenuActions titre="Plus d'actions" options={options} />
            </span>
          </span>
          <button type="button" className="pe-btn" onClick={() => poser({ onglet: "validations", bloc: null, demande: null })}>
            Validations{calc?.attente.length ? <span className="pe-btn-n">{calc.attente.length}</span> : null}
          </button>
          <Link href={`${RACINE}/validations`} className="pe-btn pe-btn--primaire">
            À valider
          </Link>
        </>
      }
      noeuds={noeuds}
      liens={liens}
      selection={bloc}
      choisir={choisir}
      eteints={eteints}
      panneau={panneau}
      vide={{ titre: erreur ? "Le circuit n'a pas pu être lu" : "Chargement du circuit", texte: erreur ?? "Les règles, les approbations et les délégations arrivent." }}
    />
  );
}

/* ——— « Configurer » : le détail d'un bloc, dans le dessin du panneau de Plain ——— */
function PanneauConfigurer({ bloc, calc, fermer }: { bloc: string; calc: { regles: Regle[]; delegations: Delegation[] }; fermer: () => void }) {
  const [type, id] = bloc.includes(":") ? [bloc.split(":")[0], bloc.slice(bloc.indexOf(":") + 1)] : [bloc, ""];
  const regle = type === "regle" || type === "appro" ? calc.regles.find((x) => x.id === id) : undefined;
  const delegation = type === "deleg" ? calc.delegations.find((x) => x.id === id) : undefined;

  if (type === "declencheur") {
    const actions = Array.from(new Set(calc.regles.map((x) => action(x.type_action))));
    return (
      <>
        <PanneauTete retour={fermer} titre="Configurer le déclencheur" />
        <div className="pe-panneau-corps">
          <Section titre="Déclencheur" texte="Comment ce circuit démarre-t-il ?" espace>
            <Champ>Automatique</Champ>
            <Encart titre="Automatique">Le circuit s&apos;exécute à chaque demande d&apos;approbation FILED : une facture à payer, une anomalie à lever, un IBAN à confirmer. Rien à déclencher vous-même.</Encart>
          </Section>
          <Section titre="Événements" texte="Les demandes qui passent par ce circuit." espace>
            {actions.length ? (
              actions.map((a) => (
                <Champ key={a} haut>
                  {a}
                </Champ>
              ))
            ) : (
              <Champ haut gris>
                Aucune règle posée
              </Champ>
            )}
          </Section>
        </div>
      </>
    );
  }
  if (type === "regle" && regle) {
    return (
      <>
        <PanneauTete retour={fermer} titre="Configurer la règle" />
        <div className="pe-panneau-corps">
          <Section titre="Condition" texte="Les règles sont lues de haut en bas ; la première qui correspond l'emporte." />
          <Section titre="Si" espace>
            <div className="pe-cartes">
              <CarteCondition libelle="Condition" aide="L'action demandée">
                {regle.type_action ? (
                  <>
                    <Champ icone={<Zap aria-hidden="true" />}>Action</Champ>
                    <Champ>est</Champ>
                    <Champ gris>{action(regle.type_action)}</Champ>
                  </>
                ) : (
                  <>
                    <Champ icone={<Layers aria-hidden="true" />}>Module</Champ>
                    <Champ>est</Champ>
                    <Champ gris>{regle.module === "*" ? "tous les modules" : regle.module.toUpperCase()}</Champ>
                  </>
                )}
              </CarteCondition>
              <div>
                <Ou>Et</Ou>
              </div>
              <CarteCondition libelle="Condition" aide="Le montant de la demande">
                <Champ icone={<FileText aria-hidden="true" />}>Montant</Champ>
                <Champ>{regle.montant_max === null ? (regle.montant_min > 0 ? "est au moins" : "est") : "est entre"}</Champ>
                <Champ gris>{regle.montant_max === null ? (regle.montant_min > 0 ? montant(regle.montant_min) : "tout montant") : `${montant(regle.montant_min)} et ${montant(regle.montant_max)}`}</Champ>
              </CarteCondition>
            </div>
            <p className="pe-section-texte">Les règles se posent à l&apos;installation, avec vous.</p>
          </Section>
          <Section titre="Sinon" gris texte="La demande passe à la règle suivante." />
        </div>
      </>
    );
  }
  if (type === "appro" && regle) {
    const eq = equipe(regle.equipe_id);
    return (
      <>
        <PanneauTete retour={fermer} titre="Configurer l'approbation" />
        <div className="pe-panneau-corps">
          <Section titre="Approbation" texte="Qui décide, et combien de fois." espace>
            <Champ icone={<CheckCheck aria-hidden="true" />}>{approbations(regle)}</Champ>
            <Encart titre="Deux personnes distinctes">Celle qui a saisi ne peut pas approuver ; au-delà d&apos;une approbation, chacune est donnée par une personne différente.</Encart>
          </Section>
          <Section titre="Rôles autorisés" texte="Les rôles qui peuvent approuver cette demande.">
            <div className="pe-puces">
              {regle.roles_autorises.map((y) => (
                <Puce key={y} icone={<UserRound aria-hidden="true" />}>
                  {ROLES[y] ?? y}
                </Puce>
              ))}
            </div>
          </Section>
          {eq ? (
            <Section titre="Équipe" texte="Seuls ses membres décident.">
              <Champ icone={<Users aria-hidden="true" />}>{eq}</Champ>
            </Section>
          ) : null}
          <Section titre="Exigences" texte="Ce que la décision doit porter.">
            <div className="pe-puces">
              {regle.exige_commentaire ? <Puce icone={<MessageSquare aria-hidden="true" />}>commentaire</Puce> : null}
              {regle.exige_piece ? <Puce icone={<Paperclip aria-hidden="true" />}>pièce jointe</Puce> : null}
              {regle.exige_motif !== false ? <Puce icone={<FileText aria-hidden="true" />}>motif de refus</Puce> : null}
              {!regle.exige_commentaire && !regle.exige_piece && regle.exige_motif === false ? <span className="pe-section-texte">Aucune.</span> : null}
            </div>
          </Section>
        </div>
      </>
    );
  }
  if (type === "deleg" && delegation) {
    return (
      <>
        <PanneauTete retour={fermer} titre="Délégation" />
        <div className="pe-panneau-corps">
          <Section titre="Délégation" texte="Une absence se couvre par une délégation datée : la personne déléguée décide à la place de l'autre." espace>
            <Champ icone={<UserRound aria-hidden="true" />}>De {nomDe(delegation.delegant, delegation.delegant_nom)}</Champ>
            <Champ icone={<UserRound aria-hidden="true" />}>À {nomDe(delegation.delegataire, delegation.delegataire_nom)}</Champ>
            <Champ icone={<CalendarDays aria-hidden="true" />}>
              Du {dateCourte(delegation.debut)} au {dateCourte(delegation.fin)}
            </Champ>
            <Champ icone={<Layers aria-hidden="true" />}>{delegation.module ? `Module ${delegation.module.toUpperCase()}` : "Tous les modules"}</Champ>
          </Section>
          <Section titre="Motif" texte={delegation.motif ?? "—"} />
          <Section titre="Gérer" texte="Les délégations se posent et se révoquent depuis « À valider ».">
            <Link href={`${RACINE}/validations`} className="pe-btn pe-btn--panneau">
              <ExternalLink aria-hidden="true" /> Ouvrir À valider
            </Link>
          </Section>
        </div>
      </>
    );
  }
  return (
    <>
      <PanneauTete retour={fermer} titre="Bloc introuvable" />
      <div className="pe-panneau-corps pe-panneau-corps--pad">
        <p className="pe-panneau-vide">Ce bloc n&apos;existe plus dans le circuit.</p>
      </div>
    </>
  );
}

/* ——— une demande ouverte : sa fiche et ses étapes (le détail d'une exécution chez Plain) ——— */
function PanneauDemande({ demande: d, regle, approbations: toutes, fermer, ouvrirRegle }: { demande: Demande; regle: Regle | null; approbations: Approbation[]; fermer: () => void; ouvrirRegle: (id: string) => void }) {
  const st = STATUTS[d.statut];
  const c = compteApprobations(d, toutes);
  const complet = c.faites >= c.requises;
  const quand = (iso: string | null) => (iso ? relatif(iso) : undefined);
  return (
    <>
      <PanneauTete retour={fermer} titre={dateHeure(d.decide_le ?? d.cree_le)} leger />
      <div className="pe-panneau-corps pe-panneau-corps--pad">
        <Fiche
          lignes={[
            { libelle: "Statut", valeur: <Badge teinte={teinteStatut(st.teinte)}>{st.libelle}</Badge> },
            {
              libelle: "Demande",
              valeur: (
                <Link href={`${RACINE}/validations`} className="pe-fiche-lien">
                  <CheckCheck aria-hidden="true" /> {action(d.type_action)}
                </Link>
              ),
            },
            { libelle: "Objet", valeur: d.resume },
            { libelle: "Montant", valeur: d.montant !== null ? montant(d.montant, d.devise) : "—" },
            { libelle: "Approbations", valeur: <Badge teinte={complet ? "vert" : "ambre"}>{`${c.faites} sur ${c.requises}`}</Badge> },
            { libelle: "Échéance", valeur: d.echeance ? dateCourte(d.echeance) : "—" },
            { libelle: "Créée", valeur: relatif(d.cree_le) },
            { libelle: "Décidée", valeur: d.decide_le ? relatif(d.decide_le) : "—" },
            {
              libelle: "Règle",
              valeur: regle ? (
                <button type="button" className="pe-fiche-lien" onClick={() => ouvrirRegle(regle.id)}>
                  <Shuffle aria-hidden="true" /> {action(regle.type_action)} · {tranche(regle)}
                </button>
              ) : (
                "—"
              ),
            },
          ]}
        />
        <hr className="pe-hr" />
        <div className="pe-etapes-tete">
          <h2>Étapes</h2>
          <Link href={`${RACINE}/validations`} className="pe-btn pe-btn--petit">
            <ExternalLink aria-hidden="true" /> Ouvrir dans À valider
          </Link>
        </div>
        <div className="pe-etapes">
          <Etape teinte="vert" icone={<Play aria-hidden="true" />} titre="Début" quand={quand(d.cree_le)}>
            <span className="pe-etape-texte">
              <Puce>Demande d&apos;approbation créée</Puce>
            </span>
          </Etape>
          <Etape
            teinte="jaune"
            icone={<Shuffle aria-hidden="true" />}
            titre="Règle appliquée"
            badge={
              <Badge teinte={regle ? "vert" : "gris"} petit>
                {regle ? "Correspond" : "Sans règle"}
              </Badge>
            }
            quand={quand(d.cree_le)}
          >
            {regle ? (
              <div className="pe-condition-lignes">
                {lignesRegle(regle).map((l, i) => (
                  <div className="pe-condition-ligne" key={i}>
                    {l}
                  </div>
                ))}
              </div>
            ) : (
              <span className="pe-etape-texte pe-etape-gris">Aucune règle active ne correspond.</span>
            )}
          </Etape>
          <Etape
            teinte="indigo"
            icone={<CheckCheck aria-hidden="true" />}
            titre="Approbation"
            badge={
              <Badge teinte={d.statut === "rejetee" ? "rouge" : complet ? "vert" : "ambre"} petit>
                {d.statut === "rejetee" ? "Refusée" : complet ? "Complète" : `${c.faites} sur ${c.requises}`}
              </Badge>
            }
            quand={quand(d.decide_le)}
          >
            {c.liste.length ? (
              c.liste.map((a) => (
                <span className="pe-etape-texte" key={a.id}>
                  {a.decision === "approuve" ? <CheckCheck aria-hidden="true" /> : <Sparkles aria-hidden="true" />}
                  <span>
                    {nomDe(a.user_id, a.user_nom)}
                    {a.au_nom_de ? ` (au nom de ${nomDe(a.au_nom_de)})` : ""} · {a.decision === "approuve" ? "a approuvé" : "a refusé"}
                    {a.commentaire ? <span className="pe-etape-gris"> — {a.commentaire}</span> : null}
                  </span>
                </span>
              ))
            ) : (
              <span className="pe-etape-texte pe-etape-gris">Aucune approbation encore donnée · {roles({ roles_autorises: d.roles_autorises } as Regle)}</span>
            )}
          </Etape>
        </div>
      </div>
    </>
  );
}
