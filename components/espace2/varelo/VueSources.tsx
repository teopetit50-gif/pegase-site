"use client";

/* ══════════════════════════════════════════════════════════════════════
   VARELO — « Sources et structure » (/espace2/varelo/sources), 02/11/2026,
   refonte des pages métiers : Linear, Settings › Integrations (catalogue et
   page d'une intégration), au 1:1. Relevé : linear-integrations.md ;
   styles ./var-integ.css (préfixe var-g-).

   Ce qu'elle reprend de l'écran d'avant (blocs 3, 17, 18, 19, 20) :
     · le catalogue : une section par pôle (puis « Sans pôle »), une carte
       par société (logo = initiales, nom, SIREN, territoire et fuseau,
       logiciel, nomenclature, codes déposés, état de branchement) ; une
       section « Règles du groupe » ; la recherche filtre les cartes ;
     · le carrousel « Essentials » = les gestes de structure : Déposer
       l'export d'une société (G1, fenêtre 20 — la seule entrée de dépôt),
       Inscrire une société (G11), Créer un pôle (G12), Règles du groupe
       (G35), et Installer Varelo (G4, base réelle, pas encore installé) ;
     · la page d'une société (?societe=<id>) = la page d'une intégration :
       SIREN, logiciel, état ; « Enable » = Brancher (G36, demande à la
       DSI) ou Débrancher (G37, confirmé) ; « Connections » = les exports
       reçus du logiciel branché ; « Reviews & commits » = les jeux
       attendus, en interrupteurs (lecture seule) ;
     · la page des règles (?regles=1) : les quatre règles et « Modifier »
       (G35, fenêtre 18.a).
   ══════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { dateCourte, montant } from "@/components/espace/format";
import Depot from "@/components/espace/varelo/Depot";
import { DialogueStructure, useStructure } from "@/components/espace/varelo/Societes";
import { DialogueBrancher, JEUX, LOGICIELS, jeuxDe, useBranchements } from "@/components/espace/varelo/Branchements";
import { DialogueRegles, useReglesGroupe } from "@/components/espace/varelo/ReglesGroupe";
import { LIBELLE_BRANCHEMENT, type Societe } from "@/components/espace/varelo/types";
import { RACINE } from "../modules";
import { useVarelo } from "./donnees";
import { VarCarte } from "./VarCadre";
import { VarIcone, type NomVarIcone } from "./VarIcone";
import { Confirmer, type Demande } from "./Confirmer";
import "./var-integ.css";

const ICI = `${RACINE}/varelo/sources`;
const initiales = (nom: string) =>
  nom
    .split(/[\s—–-]+/)
    .filter((m) => m.length > 2 || /^[A-Z]/.test(m))
    .slice(0, 2)
    .map((m) => m.charAt(0).toUpperCase())
    .join("");

type Geste = { cle: string; badge: string; nom: string; texte: string; icone: NomVarIcone; faire: () => void };

export default function VueSources() {
  const v = useVarelo();
  const params = useSearchParams();
  const societes = useMemo(() => v.donnees?.societes ?? [], [v.donnees]);
  const donneesVides = useMemo(() => ({ installation: null, poles: [], societes: [], codes: [], objets: [], propositions: [], demandes: [], etat: null }), []);
  const donnees = v.donnees ?? donneesVides;
  const st = useStructure({ donnees, actions: v.actions, majLocal: v.majLocal });
  const br = useBranchements({ source: v.source, contexte: v.contexte, client_id: v.client_id, societes, onFait: v.setFait });
  const rg = useReglesGroupe({ source: v.source, contexte: v.contexte, client_id: v.client_id, onFait: v.setFait });
  const [recherche, setRecherche] = useState("");
  const [vitrine, setVitrine] = useState(0);
  const [confirmer, setConfirmer] = useState<Demande | null>(null);

  const nonInstalle = v.source === "reelle" && !!v.reel && !v.reel.installation;
  const gestes: Geste[] = [
    ...(nonInstalle && v.peutGerer ? [{ cle: "installer", badge: "Installation", nom: "Installer Varelo", texte: "Les six directions, les sept règles de validation du référentiel et le battement quotidien.", icone: "Factory" as const, faire: () => setConfirmer({ titre: "Installer Varelo", texte: "L'installation pose les six directions (présidence, finances, juridique, opérations, DSI, référent données), les sept règles de validation du référentiel et le battement quotidien.", bouton: "Installer", faire: () => v.installerIci() }) }] : []),
    ...(v.peutGerer ? [{ cle: "depot", badge: "Dépôt", nom: "Déposer l'export d'une société", texte: "Fichier ou texte collé : ses codes rejoignent le référentiel, le prochain passage les range.", icone: "Spreadsheet" as const, faire: () => v.setDepot(true) }] : []),
    ...(v.peutGerer ? [{ cle: "societe", badge: "Structure", nom: "Inscrire une société", texte: "Son territoire fixe son fuseau et ses délais ; on ne suppose jamais la métropole.", icone: "Bank" as const, faire: () => st.ouvrir("societe") }] : []),
    ...(v.peutGerer ? [{ cle: "pole", badge: "Structure", nom: "Créer un pôle", texte: "Un pôle range des sociétés (distribution, logistique, services…).", icone: "Folder" as const, faire: () => st.ouvrir("pole") }] : []),
    { cle: "regles", badge: "Règles", nom: "Règles du groupe", texte: "Écrites une fois, appliquées dans chaque société : préavis, dénonciation, plafond, réserve.", icone: "Roue" as const, faire: () => rg.peutRegler && rg.r ? rg.setOuvert(true) : undefined },
  ];
  const g = gestes[Math.min(vitrine, gestes.length - 1)];

  const societeId = params.get("societe");
  const societe = societeId ? (societes.find((s) => s.entite_id === societeId) ?? null) : null;
  const pageRegles = params.get("regles") === "1";
  /* une page d'intégration s'ouvre en haut, pas au défilement du catalogue */
  const defile = useRef<HTMLDivElement>(null);
  useEffect(() => {
    defile.current?.scrollTo(0, 0);
  }, [societeId, pageRegles]);

  const q = recherche.trim().toLowerCase();
  const carteSociete = (s: Societe) => {
    const b = LIBELLE_BRANCHEMENT[s.statut_branchement] ?? LIBELLE_BRANCHEMENT.a_brancher;
    const n = st.codesParSociete.get(s.entite_id) ?? 0;
    return (
      <Link key={s.entite_id} href={`${ICI}?societe=${encodeURIComponent(s.entite_id)}`} className="var-g-carte" scroll={false}>
        <span className="var-g-carte-tete">
          <span className="var-g-logo">{initiales(s.nom)}</span>
          <span className="var-g-nom">{s.nom}</span>
        </span>
        <span className="var-g-texte">
          {s.principale ? "Entité principale. " : ""}
          {s.siren ? `SIREN ${s.siren}` : "SIREN non renseigné"} · {s.territoire_libelle ?? s.territoire_iso ?? "territoire ?"}
          {s.fuseau ? ` (${s.fuseau})` : ""}
          {s.logiciel ? ` · ${s.logiciel}` : ""}
          {s.nomenclature ? ` · ${s.nomenclature}` : ""} · {n} code{n > 1 ? "s" : ""} déposé{n > 1 ? "s" : ""} · {b.libelle}
        </span>
        <VarIcone nom="Chevron" className="var-g-chevron" />
      </Link>
    );
  };

  const regles = rg.r;
  const lignesRegles = regles
    ? [
        { titre: "Préavis d'un contrat", aide: "Quand un contrat n'en porte pas", valeur: regles.preavis_valeur !== null && regles.preavis_unite ? `${regles.preavis_valeur} ${regles.preavis_unite}` : "3 mois (par défaut)" },
        { titre: "Dénonciation proposée", aide: "La décision part à la direction juridique avant la date limite", valeur: `${regles.contrat_jours_decision} jours avant` },
        { titre: "Plafond d'encours d'un client", aide: "Au-delà, une alerte est levée à la direction financière", valeur: regles.plafond_defaut !== null ? montant(regles.plafond_defaut) : "aucun par défaut" },
        { titre: "Réserve au transporteur", aide: "Le délai de protestation après une livraison", valeur: regles.reserve_jours !== null ? `au plus ${regles.reserve_jours} jour${regles.reserve_jours > 1 ? "s" : ""}` : "le délai légal seul" },
      ]
    : [];

  return (
    <VarCarte>
      <h1 className="v2-sr">Sources et structure</h1>
      <div className="var-defile" ref={defile}>
        {societe ? (
          <PageSociete s={societe} br={br} codes={st.codesParSociete.get(societe.entite_id) ?? 0} onDepot={() => v.setDepot(true)} peutDeposer={v.peutGerer} confirmer={setConfirmer} />
        ) : pageRegles ? (
          <>
            <div className="var-g-retour">
              <Link href={ICI} scroll={false}>
                <VarIcone nom="Chevron" />
                Sources et structure
              </Link>
            </div>
            <div className="var-g-page">
              <div className="var-g-page-tete">
                <span className="var-g-logo">
                  <VarIcone nom="Roue" />
                </span>
                <div>
                  <h2>Règles du groupe</h2>
                  <p>Écrites une fois pour le groupe, elles s&apos;appliquent dans chaque société : délai de réserve, préavis de contrat, seuil d&apos;encours.</p>
                </div>
              </div>
              <section className="var-g-info">
                <dl className="var-g-meta">
                  <div>
                    <dt>Portée</dt>
                    <dd>Toutes les sociétés</dd>
                  </div>
                  <div>
                    <dt>Qui les change</dt>
                    <dd>Gérant, administrateur</dd>
                  </div>
                  <span className="var-pousse" />
                  {rg.peutRegler && regles ? (
                    <button type="button" className="var-g-activer" onClick={() => rg.setOuvert(true)}>
                      <VarIcone nom="Roue" />
                      Modifier les règles
                    </button>
                  ) : null}
                </dl>
                <h3>Ce qu&apos;elles règlent</h3>
                <p>Chaque changement est inscrit au journal. Un contrat, un client ou une livraison qui porte sa propre valeur la garde.</p>
              </section>
              <section className="var-g-bloc">
                <div className="var-g-bloc-tete">
                  <h3>Les règles</h3>
                </div>
                {regles ? (
                  <ul className="var-g-liste">
                    {lignesRegles.map((l) => (
                      <li key={l.titre}>
                        <span className="var-g-liste-textes">
                          <span className="var-g-liste-titre">{l.titre}</span>
                          <span className="var-g-liste-aide">{l.aide}</span>
                        </span>
                        <span className="var-g-petit">{l.valeur}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="var-g-vide">Lecture des règles…</p>
                )}
              </section>
            </div>
          </>
        ) : (
          <div className="var-g">
            <header className="var-g-tete">
              <h2 className="var-g-titre">Sources et structure</h2>
              <p className="var-g-sous">Les sociétés du groupe, leurs logiciels branchés avec l&apos;accord de la DSI, et les règles du groupe</p>
            </header>
            <label className="var-g-recherche">
              <VarIcone nom="Search" />
              <input type="search" placeholder="Chercher une société, un logiciel, un territoire" value={recherche} onChange={(e) => setRecherche(e.target.value)} />
            </label>

            {g ? (
              <section aria-label="Gestes de structure">
                <button type="button" className="var-g-vitrine" onClick={g.faire}>
                  <span className="var-g-badge">{g.badge}</span>
                  <span className="var-g-vitrine-pied">
                    <span className="var-g-vitrine-logo">
                      <VarIcone nom={g.icone} />
                    </span>
                    <span>
                      <span className="var-g-vitrine-nom">{g.nom}</span>
                      <span className="var-g-vitrine-texte">{g.texte}</span>
                    </span>
                  </span>
                </button>
                <div className="var-g-pastilles">
                  <div className="var-g-pastilles-defile" role="tablist" aria-label="Gestes">
                    {gestes.map((x, i) => (
                      <button key={x.cle} type="button" role="tab" aria-selected={x === g} className="var-g-onglet" onClick={() => setVitrine(i)}>
                        <VarIcone nom={x.icone} />
                        {x.nom}
                      </button>
                    ))}
                  </div>
                  <button type="button" className="var-rond" aria-label="Geste précédent" onClick={() => setVitrine((i) => (i + gestes.length - 1) % gestes.length)}>
                    <VarIcone nom="Chevron" style={{ transform: "scaleX(-1)" }} />
                  </button>
                  <button type="button" className="var-rond" aria-label="Geste suivant" onClick={() => setVitrine((i) => (i + 1) % gestes.length)}>
                    <VarIcone nom="Chevron" />
                  </button>
                </div>
              </section>
            ) : null}

            {societes.length === 0 ? (
              <section className="var-g-section">
                <h3 className="var-g-surtitre">Sociétés</h3>
                <p className="var-g-vide">Le groupe commence par une société : inscrivez-la avec son territoire, puis déposez son export.</p>
              </section>
            ) : (
              st.parPole.map(({ pole, societes: l }) => {
                const visibles = q ? l.filter((s) => [s.nom, s.siren ?? "", s.logiciel ?? "", s.territoire_libelle ?? "", s.nomenclature ?? ""].some((x) => x.toLowerCase().includes(q))) : l;
                if (q && visibles.length === 0) return null;
                return (
                  <section key={pole?.id ?? "sans"} className="var-g-section" aria-label={pole ? pole.nom : "Sans pôle"}>
                    <h3 className="var-g-surtitre">{pole ? pole.nom : "Sans pôle"}</h3>
                    {visibles.length ? <div className="var-g-grille">{visibles.map(carteSociete)}</div> : <p className="var-g-vide">Aucune société dans ce pôle.</p>}
                  </section>
                );
              })
            )}
            {!q || "règles du groupe".includes(q) ? (
              <section className="var-g-section" aria-label="Règles du groupe">
                <h3 className="var-g-surtitre">Règles du groupe</h3>
                <div className="var-g-grille">
                  <Link href={`${ICI}?regles=1`} className="var-g-carte" scroll={false}>
                    <span className="var-g-carte-tete">
                      <span className="var-g-logo">
                        <VarIcone nom="Roue" />
                      </span>
                      <span className="var-g-nom">Règles du groupe</span>
                    </span>
                    <span className="var-g-texte">{lignesRegles.map((l) => `${l.titre} : ${l.valeur}`).join(" · ")}</span>
                    <VarIcone nom="Chevron" className="var-g-chevron" />
                  </Link>
                </div>
              </section>
            ) : null}
          </div>
        )}
      </div>

      {v.donnees ? <Depot ouvert={v.depot} onFermer={() => v.setDepot(false)} societes={societes} deposer={v.deposer} onFait={v.setFait} /> : null}
      <DialogueStructure h={st} donnees={donnees} />
      {br.cible ? <DialogueBrancher s={br.cible} onFermer={() => br.setCible(null)} brancher={br.brancher} /> : null}
      {rg.ouvert && rg.r ? <DialogueRegles r={rg.r} onFermer={() => rg.setOuvert(false)} regler={rg.regler} /> : null}
      <Confirmer demande={confirmer} onFermer={() => setConfirmer(null)} />
    </VarCarte>
  );
}

type Br = ReturnType<typeof useBranchements>;

function PageSociete({ s, br, codes, onDepot, peutDeposer, confirmer }: { s: Societe; br: Br; codes: number; onDepot: () => void; peutDeposer: boolean; confirmer: (d: Demande) => void }) {
  const ici = br.parSociete.find((x) => x.s.entite_id === s.entite_id);
  const branches = ici?.b ?? [];
  const demande = br.demandeDe(s.entite_id);
  const b = LIBELLE_BRANCHEMENT[s.statut_branchement] ?? LIBELLE_BRANCHEMENT.a_brancher;
  const actif = branches.find((x) => x.statut === "actif") ?? null;
  const nomLogiciel = (cle: string) => LOGICIELS.find((l) => l.cle === cle)?.libelle ?? cle;
  return (
    <>
      <div className="var-g-retour">
        <Link href={ICI} scroll={false}>
          <VarIcone nom="Chevron" />
          Sources et structure
        </Link>
      </div>
      <div className="var-g-page">
        <div className="var-g-page-tete">
          <span className="var-g-logo">{initiales(s.nom)}</span>
          <div>
            <h2>{s.nom}</h2>
            <p>
              {s.principale ? "Entité principale du groupe. " : ""}
              {s.territoire_libelle ?? s.territoire_iso ?? "Territoire non renseigné"}
              {s.fuseau ? ` (${s.fuseau})` : ""}
              {s.pole ? `, pôle ${s.pole}` : ""}. {codes} code{codes > 1 ? "s" : ""} déposé{codes > 1 ? "s" : ""} au référentiel.
            </p>
          </div>
        </div>
        <section className="var-g-info">
          <dl className="var-g-meta">
            <div>
              <dt>SIREN</dt>
              <dd>{s.siren ?? "–"}</dd>
            </div>
            <div>
              <dt>Logiciel</dt>
              <dd>{actif ? nomLogiciel(actif.logiciel) : (s.logiciel ?? "–")}</dd>
            </div>
            <div>
              <dt>État</dt>
              <dd>{b.libelle}</dd>
            </div>
            <span className="var-pousse" />
            {demande ? (
              <button type="button" className="var-g-activer var-g-activer--neutre" disabled>
                {demande.genre === "brancher" ? "Branchement" : "Débranchement"} en attente de la DSI
              </button>
            ) : actif ? (
              br.peutBrancher ? (
                <button
                  type="button"
                  className="var-g-activer var-g-activer--neutre"
                  onClick={() =>
                    confirmer({
                      titre: "Débrancher le logiciel",
                      texte: `Le débranchement de ${nomLogiciel(actif.logiciel)} (${s.nom}) est demandé à la DSI : plus aucun export ne sera lu après sa validation.`,
                      bouton: "Demander le débranchement",
                      faire: () => br.debrancher(s, actif),
                    })
                  }
                >
                  Débrancher
                </button>
              ) : null
            ) : br.peutBrancher ? (
              <button type="button" className="var-g-activer" onClick={() => br.setCible(s)}>
                <VarIcone nom="Plus" />
                Brancher
              </button>
            ) : null}
          </dl>
          {br.erreurDebrancher ? <p role="alert">{br.erreurDebrancher}</p> : null}
          <h3>Lecture seule</h3>
          <p>Chaque source se branche en lecture seule, avec l&apos;accord de la DSI, et se débranche de la même façon. Un branchement lit d&apos;eux-mêmes les exports du logiciel ; sans branchement, on dépose un export à la main.</p>
        </section>

        <section className="var-g-bloc">
          <div className="var-g-bloc-tete">
            <h3>Exports reçus</h3>
            {peutDeposer ? (
              <button type="button" className="var-g-petit" onClick={onDepot}>
                Déposer un export
              </button>
            ) : null}
          </div>
          <ul className="var-g-liste">
            {actif ? (
              actif.jeux
                .filter((j) => j.actif)
                .map((j) => (
                  <li key={j.code}>
                    <span className="var-g-liste-textes">
                      <span className="var-g-liste-titre">{JEUX.find((x) => x.cle === j.code)?.libelle ?? j.code}</span>
                      <span className="var-g-liste-aide">{j.dernier_recu_le ? `Dernier export le ${dateCourte(j.dernier_recu_le)} : ${j.lignes} ligne${j.lignes > 1 ? "s" : ""}` : "Rien reçu"}</span>
                    </span>
                  </li>
                ))
            ) : (
              <li>
                <span className="var-g-liste-aide">Aucun logiciel branché : déposez un export à la main, ou demandez le branchement à la DSI.</span>
              </li>
            )}
          </ul>
        </section>

        <section className="var-g-bloc">
          <div className="var-g-bloc-tete" style={{ flexDirection: "column", alignItems: "flex-start", gap: 2 }}>
            <h3>Exports attendus</h3>
            <p>Les jeux que le logiciel sort ; un interrupteur ouvre leur choix, envoyé à la DSI.</p>
          </div>
          <ul className="var-g-liste">
            {jeuxDe(actif?.logiciel ?? s.logiciel ?? "tableur").map((j) => {
              const on = !!actif?.jeux.some((x) => x.code === j.cle && x.actif);
              return (
                <li key={j.cle}>
                  <span className="var-g-liste-textes">
                    <span className="var-g-liste-titre">{j.libelle}</span>
                    <span className="var-g-liste-aide">{on ? "Lu à chaque export" : "Pas lu"}</span>
                  </span>
                  {br.peutBrancher && !demande ? (
                    <button
                      type="button"
                      className="var-g-interrupteur"
                      role="switch"
                      aria-checked={on}
                      aria-label={`${j.libelle} : choisir les exports lus (demande à la DSI)`}
                      title="Choisir les exports lus : la demande part à la DSI"
                      data-on={on ? "" : undefined}
                      onClick={() => br.setCible(s)}
                    />
                  ) : (
                    <span className="var-g-interrupteur" role="switch" aria-checked={on} aria-readonly="true" aria-label={j.libelle} data-on={on ? "" : undefined} data-inactif="" />
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </>
  );
}
