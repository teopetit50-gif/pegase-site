"use client";

/* ══════════════════════════════════════════════════════════════════════
   Suivi › Carte — l'entreprise du client, en circuit vivant (29/10/2026)

   Demande de Teo, sur la capture du « Circuit de validation » : reprendre
   ce dessin pour la page d'entrée du Suivi. Le même éditeur (../lin/Canevas
   › EditeurPlain), quatre colonnes :
     Sources  →  Agents  →  Vous  →  Résultats
   une rangée par agent commun (FILED, CASHD, REPUT, OFFLOAD). Des points
   courent sur les liens où quelque chose passe ; « Vous » respire en ambre
   quand une demande attend une personne. La carte d'en-tête dit les
   chiffres de la période.

   Le panneau : « Étapes » (chaque bloc, cliquable) et « Activité » (le fil
   de l'organisation, ../evenements) ; un bloc ouvert montre son détail et
   ses portes (ouvrir le module, voir dans le journal, À valider). Le
   journal complet reste la page Activité, en lien dans la barre.

   Rien ne se décide ici : on agit dans les modules et dans « À valider ».
   ══════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useRef } from "react";
import { Banknote, BookCheck, ExternalLink, FileSpreadsheet, History, Inbox, ListTree, MessageSquare, PhoneCall, Send, UserCheck } from "lucide-react";
import { dateHeure } from "@/components/espace/format";
import { useSource } from "@/components/espace/source";
import { STATUTS } from "@/components/espace/validations/regles";
import type { Demande } from "@/components/espace/types";
import { EditeurPlain, ElementPanneau, Fiche, Groupe, LigneExecution, Onglets, PanneauTete, Rangee, Section, Badge, type LienPE, type NoeudPE, type PoigneeEditeur } from "../lin/Canevas";
import { Note } from "../ui";
import { RACINE, moduleDe } from "../modules";
import { evenements } from "../evenements";
import { fluxDe, useCarte, type Agent, type CleAgent } from "./donnees";
import "../lin/lin.css";
import "./carte.css";

const CHEMIN = `${RACINE}/carte`;

const ICONES_SOURCE: Record<CleAgent, React.ReactNode> = {
  filed: <Inbox aria-hidden="true" />,
  cashd: <FileSpreadsheet aria-hidden="true" />,
  reput: <MessageSquare aria-hidden="true" />,
  offload: <History aria-hidden="true" />,
};
const ICONES_RESULTAT: Record<CleAgent, React.ReactNode> = {
  filed: <BookCheck aria-hidden="true" />,
  cashd: <Banknote aria-hidden="true" />,
  reput: <Send aria-hidden="true" />,
  offload: <PhoneCall aria-hidden="true" />,
};
const iconeAgent = (cle: CleAgent) => {
  const I = moduleDe(cle)?.icone;
  return I ? <I aria-hidden="true" /> : null;
};
const journal = (cle: CleAgent) => `${RACINE}/activite?modules=${cle}`;

type Onglet = "etapes" | "activite";

/* la rangée « libellé ……… valeur » d'un bloc */
function Mesure({ libelle, valeur, teinte, sortie }: { libelle: string; valeur: string; teinte?: string; sortie?: string }) {
  return (
    <Rangee sortie={sortie}>
      <span className="crt-mesure">
        <span>{libelle}</span>
        <span className="crt-valeur" data-teinte={teinte}>
          {valeur}
        </span>
      </span>
    </Rangee>
  );
}

function corpsAgent(a: Agent) {
  if (a.etat === "lecture") return <Rangee>Lecture en cours…</Rangee>;
  if (a.etat === "erreur") return <Rangee>La base n&apos;a pas répondu</Rangee>;
  return (
    <>
      {a.lignes.map((l) => (
        <Mesure key={l.libelle} libelle={l.libelle} valeur={l.valeur} teinte={l.teinte} />
      ))}
    </>
  );
}

export default function Carte() {
  const carte = useCarte();
  const { source } = useSource();
  const router = useRouter();
  const sp = useSearchParams();
  const editeur = useRef<PoigneeEditeur>(null);

  const onglet: Onglet = sp.get("onglet") === "activite" ? "activite" : "etapes";
  const bloc = sp.get("bloc");

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
  const choisir = useCallback((id: string | null) => poser({ bloc: id }), [poser]);
  const ouvrirBloc = useCallback(
    (id: string) => {
      poser({ bloc: id });
      editeur.current?.centrer(id);
    },
    [poser],
  );

  const totalAttente = carte ? carte.agents.reduce((s, a) => s + a.aValider.n, 0) : 0;

  /* ——— le dessin : sources → agents → vous → résultats ——— */
  const { noeuds, liens, eteints } = useMemo(() => {
    const noeuds: NoeudPE[] = [];
    const liens: LienPE[] = [];
    const eteints = new Set<string>();
    if (!carte) return { noeuds, liens, eteints };
    carte.agents.forEach((a, i) => {
      noeuds.push({
        id: `source:${a.cle}`,
        teinte: "gris",
        icone: ICONES_SOURCE[a.cle],
        titre: a.source.titre,
        libelle: `Source de ${a.nom} : ${a.source.titre}, ${a.source.texte}`,
        colonne: 0,
        rangee: i,
        sortie: "sortie",
        corps: <Rangee>{a.source.texte}</Rangee>,
      });
      noeuds.push({
        id: `agent:${a.cle}`,
        teinte: "indigo",
        icone: iconeAgent(a.cle),
        titre: a.nom,
        libelle: `${a.nom} : ${a.role}`,
        colonne: 1,
        rangee: i,
        entree: true,
        sortie: "sortie",
        corps: corpsAgent(a),
      });
      noeuds.push({
        id: `resultat:${a.cle}`,
        teinte: "vert",
        icone: ICONES_RESULTAT[a.cle],
        titre: a.resultat.titre,
        libelle: `Résultat de ${a.nom} : ${a.resultat.titre}, ${a.resultat.texte}`,
        colonne: 3,
        rangee: i,
        entree: true,
        corps: <Rangee>{a.resultat.texte}</Rangee>,
      });
      liens.push({ de: `source:${a.cle}`, sortie: "sortie", vers: `agent:${a.cle}`, flux: a.etat === "pret" ? fluxDe(a.source.n) : 0 });
      liens.push({ de: `agent:${a.cle}`, sortie: "sortie", vers: "vous", flux: fluxDe(a.aValider.n) });
      liens.push({ de: "vous", sortie: a.cle, vers: `resultat:${a.cle}`, flux: a.resultat.n > 0 ? 1 : 0 });
      if (a.etat === "erreur") for (const p of ["source", "agent", "resultat"]) eteints.add(`${p}:${a.cle}`);
    });
    noeuds.push({
      id: "vous",
      teinte: "jaune",
      icone: <UserCheck aria-hidden="true" />,
      titre: totalAttente ? `Vous · ${totalAttente} à valider` : "Vous",
      libelle: totalAttente ? `Vous : ${totalAttente} éléments attendent votre validation` : "Vous : rien n'attend votre validation",
      colonne: 2,
      rangee: 0,
      centre: true,
      entree: true,
      alerte: totalAttente > 0,
      corps: (
        <>
          {carte.agents.map((a) => (
            <Mesure key={a.cle} libelle={a.nom} valeur={a.aValider.texte} teinte={a.aValider.n ? "ambre" : undefined} sortie={a.cle} />
          ))}
        </>
      ),
    });
    return { noeuds, liens, eteints };
  }, [carte, totalAttente]);

  const activite = useMemo(() => (carte?.donnees ? evenements(carte.donnees).slice(0, 40) : []), [carte]);

  const entete = carte ? (
    <div className="crt-entete">
      <span className="crt-entete-titre">Ce que vos agents ont fait</span>
      <dl className="crt-chiffres">
        {carte.chiffres.map((c) => (
          <div key={c.libelle}>
            <dt>{c.libelle}</dt>
            <dd data-teinte={c.libelle === "À valider" && totalAttente ? "ambre" : undefined}>{c.valeur}</dd>
          </div>
        ))}
      </dl>
    </div>
  ) : null;

  /* ——— le panneau ——— */
  let panneau: React.ReactNode;
  if (!carte) {
    panneau = (
      <>
        <PanneauTete titre="Carte" />
        <div className="pe-panneau-corps pe-panneau-corps--pad">
          <p className="pe-panneau-vide" aria-busy="true">
            Lecture de vos agents…
          </p>
        </div>
      </>
    );
  } else if (bloc) {
    panneau = <PanneauBloc bloc={bloc} agents={carte.agents} enAttente={carte.enAttente} totalAttente={totalAttente} fermer={() => choisir(null)} />;
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
              { cle: "activite", libelle: "Activité", n: activite.length || undefined },
            ]}
          />
        </div>
        {onglet === "etapes" ? (
          <div className="pe-panneau-corps pe-panneau-corps--pad">
            <p className="crt-resume">{carte.chiffres.map((c) => `${c.libelle} : ${c.valeur}`).join(" · ")}</p>
            <div className="pe-groupes">
              <Groupe titre="Ce qui arrive">
                {carte.agents.map((a) => (
                  <ElementPanneau key={a.cle} teinte="gris" icone={ICONES_SOURCE[a.cle]} aide={`${a.source.texte} · arrive dans ${a.nom}`} actif={bloc === `source:${a.cle}`} onClick={() => ouvrirBloc(`source:${a.cle}`)}>
                    {a.source.titre}
                  </ElementPanneau>
                ))}
              </Groupe>
              <Groupe titre="Vos agents">
                {carte.agents.map((a) => (
                  <ElementPanneau key={a.cle} teinte="indigo" icone={iconeAgent(a.cle)} aide={a.role} onClick={() => ouvrirBloc(`agent:${a.cle}`)}>
                    {a.nom} · {moduleDe(a.cle)?.libelle}
                  </ElementPanneau>
                ))}
              </Groupe>
              <Groupe titre="Ce qui vous attend">
                <ElementPanneau
                  teinte="jaune"
                  icone={<UserCheck aria-hidden="true" />}
                  aide="Les demandes que vos agents ont préparées et qui attendent une personne."
                  chip={totalAttente ? <span className="pe-element-chip crt-chip-ambre">{totalAttente}</span> : undefined}
                  onClick={() => ouvrirBloc("vous")}
                >
                  {totalAttente ? `${totalAttente} à valider` : "Rien à valider"}
                </ElementPanneau>
              </Groupe>
              <Groupe titre="Ce qui en sort">
                {carte.agents.map((a) => (
                  <ElementPanneau key={a.cle} teinte="vert" icone={ICONES_RESULTAT[a.cle]} aide={a.resultat.texte} onClick={() => ouvrirBloc(`resultat:${a.cle}`)}>
                    {a.resultat.titre} · {a.resultat.texte}
                  </ElementPanneau>
                ))}
              </Groupe>
            </div>
          </div>
        ) : (
          <div className="pe-panneau-corps">
            {activite.length ? (
              <>
                {activite.map((e) => (
                  <LigneExecution key={e.id} date={dateHeure(e.quand)} sous={`${e.quoi} · ${e.detail}`} badge={<Badge teinte={e.etat.teinte}>{e.etat.libelle}</Badge>} onClick={() => router.push(e.lien ?? `${RACINE}/activite`)} />
                ))}
                <div className="crt-pied">
                  <Link href={`${RACINE}/activite`} className="pe-btn pe-btn--petit">
                    <ListTree aria-hidden="true" /> Ouvrir le journal complet
                  </Link>
                </div>
              </>
            ) : (
              <p className="pe-panneau-vide" style={{ padding: 16 }}>
                Rien pour l&apos;instant : les documents, les demandes et les décisions apparaîtront ici.
              </p>
            )}
          </div>
        )}
      </>
    );
  }

  return (
    <EditeurPlain
      ref={editeur}
      titre="Carte"
      retour={RACINE}
      badge={source === "exemple" ? { libelle: "Exemple", teinte: "gris" } : { libelle: "En direct", teinte: "vert" }}
      actions={
        <>
          <Link href={`${RACINE}/activite`} className="pe-btn">
            Journal
          </Link>
          <Link href={`${RACINE}/validations`} className="pe-btn pe-btn--primaire">
            À valider{totalAttente ? <span className="pe-btn-n">{totalAttente}</span> : null}
          </Link>
        </>
      }
      noeuds={noeuds}
      liens={liens}
      selection={bloc}
      choisir={choisir}
      eteints={eteints}
      entete={entete}
      ajusterAuDepart
      pasColonne={388}
      panneauFerme
      miniCarte={false}
      panneau={panneau}
      vide={{ titre: "Lecture de vos agents", texte: "FILED, CASHD, REPUT et OFFLOAD arrivent." }}
    />
  );
}

/* ——— le détail d'un bloc ——— */
function Portes({ children }: { children: React.ReactNode }) {
  return <div className="crt-portes">{children}</div>;
}

function PanneauBloc({ bloc, agents, enAttente, totalAttente, fermer }: { bloc: string; agents: Agent[]; enAttente: Demande[]; totalAttente: number; fermer: () => void }) {
  const router = useRouter();
  const [type, cle] = bloc.includes(":") ? [bloc.split(":")[0], bloc.slice(bloc.indexOf(":") + 1)] : [bloc, ""];
  const a = agents.find((x) => x.cle === cle);
  const erreur = a?.erreur ? (
    <Note teinte="rouge" role="alert">
      <strong>La base réelle n&apos;a pas répondu.</strong> {a.erreur}
    </Note>
  ) : null;

  if (type === "vous") {
    return (
      <>
        <PanneauTete retour={fermer} titre={totalAttente ? `${totalAttente} à valider` : "Rien à valider"} />
        <div className="pe-panneau-corps">
          <Section titre="Ce qui vous attend" texte="Vos agents préparent ; une personne décide. Rien ne part sans vous." espace>
            <Fiche lignes={agents.map((x) => ({ libelle: x.nom, valeur: x.aValider.n ? <Link href={x.aValider.lien} className="pe-fiche-lien">{x.aValider.texte}</Link> : <span className="pe-etape-gris">{x.aValider.texte}</span> }))} />
          </Section>
          {enAttente.length ? (
            <Section titre="Demandes en attente" texte="Les plus récentes d'abord.">
              <div className="crt-liste">
                {enAttente
                  .slice()
                  .sort((x, y) => y.cree_le.localeCompare(x.cree_le))
                  .slice(0, 12)
                  .map((d) => (
                    <LigneExecution key={d.id} date={d.resume} sous={`${moduleDe(d.module)?.nom ?? d.module.toUpperCase()} · ${dateHeure(d.cree_le)}`} badge={<Badge teinte="ambre">{STATUTS[d.statut]?.libelle ?? "En attente"}</Badge>} onClick={() => router.push(`${RACINE}/validations`)} />
                  ))}
              </div>
            </Section>
          ) : null}
          <Section titre="Décider">
            <Link href={`${RACINE}/validations`} className="pe-btn pe-btn--panneau">
              <ExternalLink aria-hidden="true" /> Ouvrir À valider
            </Link>
          </Section>
        </div>
      </>
    );
  }
  if (!a) {
    return (
      <>
        <PanneauTete retour={fermer} titre="Bloc introuvable" />
        <div className="pe-panneau-corps pe-panneau-corps--pad">
          <p className="pe-panneau-vide">Ce bloc n&apos;existe plus sur la carte.</p>
        </div>
      </>
    );
  }
  const ouvrir = (
    <Link href={a.lien} className="pe-btn pe-btn--panneau">
      <ExternalLink aria-hidden="true" /> Ouvrir {a.nom}
    </Link>
  );
  if (type === "source") {
    return (
      <>
        <PanneauTete retour={fermer} titre={a.source.titre} />
        <div className="pe-panneau-corps">
          {erreur ? <div style={{ padding: 16 }}>{erreur}</div> : null}
          <Section titre="Ce qui arrive" texte={`Le travail de ${a.nom} part d'ici.`} espace>
            <Fiche
              lignes={[
                { libelle: "Volume", valeur: a.source.texte },
                { libelle: "Période", valeur: a.periode },
                { libelle: "Arrive dans", valeur: a.nom },
              ]}
            />
          </Section>
          <Section titre="Ouvrir">{ouvrir}</Section>
        </div>
      </>
    );
  }
  if (type === "resultat") {
    return (
      <>
        <PanneauTete retour={fermer} titre={a.resultat.titre} />
        <div className="pe-panneau-corps">
          {erreur ? <div style={{ padding: 16 }}>{erreur}</div> : null}
          <Section titre="Ce qui en sort" texte={`Où aboutit le travail de ${a.nom}, une fois validé.`} espace>
            <Fiche
              lignes={[
                { libelle: "Résultat", valeur: a.resultat.texte },
                { libelle: "Période", valeur: a.periode },
                { libelle: "Vient de", valeur: a.nom },
              ]}
            />
          </Section>
          <Section titre="Ouvrir">{ouvrir}</Section>
        </div>
      </>
    );
  }
  return (
    <>
      <PanneauTete retour={fermer} titre={`${a.nom} · ${moduleDe(a.cle)?.libelle ?? ""}`} />
      <div className="pe-panneau-corps">
        {erreur ? <div style={{ padding: 16 }}>{erreur}</div> : null}
        <Section titre="Ce qu'il fait" texte={a.role} espace>
          <Fiche
            lignes={[
              ...a.lignes.map((l) => ({ libelle: l.libelle, valeur: l.teinte ? <Badge teinte={l.teinte}>{l.valeur}</Badge> : l.valeur })),
              { libelle: "À valider", valeur: a.aValider.n ? <Badge teinte="ambre">{a.aValider.texte}</Badge> : a.aValider.texte },
              { libelle: "Résultat", valeur: a.resultat.texte },
              { libelle: "Période", valeur: a.periode },
            ]}
          />
        </Section>
        <Section titre="Aller plus loin">
          <Portes>
            {ouvrir}
            <Link href={journal(a.cle)} className="pe-btn pe-btn--panneau">
              <ListTree aria-hidden="true" /> Voir dans le journal
            </Link>
          </Portes>
        </Section>
      </div>
    </>
  );
}
