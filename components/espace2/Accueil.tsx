"use client";

/* ══════════════════════════════════════════════════════════════════════
   La vue d'ensemble de l'organisation (06/10/2026, session C1)

   La page d'accueil du tableau de bord de référence, transposée : en haut,
   la recherche, le choix grille / liste et le bouton « Nouveau… » ; à
   gauche, la carte des compteurs (l'« usage ») et la liste de ce qui
   attend une décision ; à droite, une carte par module (la carte
   « projet ») ; dessous, le tableau des derniers documents reçus.

   Les chiffres viennent des mêmes sources que les écrans : l'exemple
   (components/espace/exemples) ou la base réelle (mêmes portes).
   ══════════════════════════════════════════════════════════════════════ */

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Copy, ExternalLink, LayoutGrid, List, MoreHorizontal, Search } from "lucide-react";
import { useSource } from "@/components/espace/source";
import { nomPersonne } from "@/components/espace/exemples/socle";
import { dateCourte, libelleModule, montant, relatif } from "@/components/espace/format";
import { etatDocument } from "@/components/espace/filed/etats";
import { A_PAYER, aPayer, du, groupeDe, minuit, totaux } from "./filed/calculs";
import { AnneauJauge, Badge, Etat, ItemMenu, MenuDeroulant, SeparateurMenu, Squelette, Vide, teinte } from "./ui";
import { MODULES, RACINE, type ModuleV2 } from "./modules";
import { useToast } from "./Toasts";
import { useDonnees } from "./donnees";

const sansAccents = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

export default function Accueil() {
  const { source } = useSource();
  const toast = useToast();
  const [vueModules, setVueModules] = useState<"grille" | "liste">("grille");
  const [recherche, setRecherche] = useState("");
  const [aujourdhui] = useState(minuit);
  const { donnees, erreur } = useDonnees();
  const chargement = !donnees;

  /* les compteurs : les mêmes règles et le même reste à payer que « À payer » */
  const compte = useMemo(() => {
    if (!donnees) return null;
    const etats = donnees.etats;
    const aRegler = donnees.vue.factures.filter((f) => A_PAYER.has(f.statut) && f.nature !== "avoir" && etats[f.id]?.etat !== "payee");
    const retard = aRegler.filter((f) => groupeDe(f, aujourdhui) === "retard");
    const semaine = aRegler.filter((f) => groupeDe(f, aujourdhui) === "semaine");
    const enAttente = donnees.demandes.filter((d) => d.statut === "en_attente");
    const aTraiter = donnees.docs.filter((d) => ["en_lecture", "a_classer", "a_traiter", "illisible"].includes(d.etat));
    return {
      retard,
      semaine,
      aRegler,
      enAttente,
      aTraiter,
      totalRetard: totaux(retard, etats),
      totalARegler: totaux(aRegler, etats),
      partRetard: aRegler.length ? retard.reduce((s, f) => s + aPayer(f, etats), 0) / Math.max(1, aRegler.reduce((s, f) => s + du(f), 0)) : 0,
    };
  }, [donnees, aujourdhui]);

  const q = sansAccents(recherche.trim());
  const modules = MODULES.filter((m) => !q || sansAccents(`${m.nom} ${m.libelle} ${m.description}`).includes(q));

  const pilule = (m: ModuleV2): { texte: string; teinte: "rouge" | "ambre" | "vert" | "gris" } => {
    if (m.cle === "filed" && compte) {
      if (compte.retard.length) return { texte: `${compte.retard.length} facture${compte.retard.length > 1 ? "s" : ""} en retard · ${compte.totalRetard}`, teinte: "rouge" };
      if (compte.semaine.length) return { texte: `${compte.semaine.length} à payer cette semaine`, teinte: "ambre" };
      return { texte: "Rien en retard", teinte: "vert" };
    }
    return { texte: "Nouveau design à venir", teinte: "gris" };
  };

  const copier = (chemin: string) =>
    navigator.clipboard?.writeText(`${window.location.origin}${chemin}`).then(
      () => toast("Lien copié", "vert"),
      () => toast("Impossible de copier le lien. Réessayez.", "rouge"),
    );

  return (
    <div className="v2-page v2-arrivee">
      <div className="v2-outils">
        <label className="v2-champ">
          <Search width={16} height={16} aria-hidden="true" />
          <span className="v2-sr">Rechercher un module</span>
          <input type="search" value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Rechercher un module…" />
        </label>
        <div className="v2-bascule v2-masque-mobile" role="group" aria-label="Affichage des modules">
          <button type="button" aria-pressed={vueModules === "grille"} onClick={() => setVueModules("grille")} aria-label="En grille">
            <LayoutGrid width={16} height={16} aria-hidden="true" />
          </button>
          <button type="button" aria-pressed={vueModules === "liste"} onClick={() => setVueModules("liste")} aria-label="En liste">
            <List width={16} height={16} aria-hidden="true" />
          </button>
        </div>
      </div>

      {erreur ? (
        <div className="v2-note" data-teinte="rouge" role="alert" style={{ marginBottom: 24 }}>
          <strong>La base réelle n&apos;a pas répondu.</strong> {erreur}
        </div>
      ) : null}

      <div className="v2-accueil">
        <div className="v2-colonne">
          <section aria-labelledby="titre-jour">
            <div className="v2-section-titre">
              <h2 className="v2-h2" id="titre-jour">
                Aujourd&apos;hui
              </h2>
              <span className="v2-gris" style={{ fontSize: 13 }}>
                {source === "reelle" ? "Base réelle" : "Données d'exemple"}
              </span>
            </div>
            <div className="v2-carte">
              <div className="v2-jauges">
                {chargement || !compte ? (
                  [0, 1, 2, 3].map((i) => (
                    <div key={i} className="v2-jauge">
                      <Squelette largeur={18} hauteur={18} rond />
                      <Squelette largeur="50%" hauteur={14} />
                    </div>
                  ))
                ) : (
                  <>
                    <Link href={`${RACINE}/validations`} className="v2-jauge">
                      <AnneauJauge part={compte.enAttente.length / Math.max(1, donnees!.demandes.length)} teinte={compte.enAttente.length ? "ambre" : "vert"} />
                      À valider
                      <span className="v2-jauge-valeur">{compte.enAttente.length}</span>
                    </Link>
                    <Link href={`${RACINE}/filed/a-payer`} className="v2-jauge">
                      <AnneauJauge part={compte.partRetard} teinte={compte.retard.length ? "rouge" : "vert"} />
                      Factures en retard
                      <span className="v2-jauge-valeur">{compte.retard.length ? compte.totalRetard : "0"}</span>
                    </Link>
                    <Link href={`${RACINE}/filed/a-payer`} className="v2-jauge">
                      <AnneauJauge part={compte.aRegler.length ? 1 : 0} teinte="bleu" />
                      Reste à payer
                      <span className="v2-jauge-valeur">{compte.totalARegler}</span>
                    </Link>
                    <Link href={`${RACINE}/filed`} className="v2-jauge">
                      <AnneauJauge part={compte.aTraiter.length / Math.max(1, donnees!.docs.length)} teinte="gris" />
                      Documents à traiter
                      <span className="v2-jauge-valeur">{compte.aTraiter.length}</span>
                    </Link>
                  </>
                )}
              </div>
              <div className="v2-carte-pied">
                <span>Mis à jour à l&apos;ouverture</span>
                <Link href={`${RACINE}/activite`} className="v2-btn v2-btn--petit">
                  Activité
                </Link>
              </div>
            </div>
          </section>

          <section aria-labelledby="titre-attente">
            <div className="v2-section-titre">
              <h2 className="v2-h2" id="titre-attente">
                En attente de décision
              </h2>
              <Link href={`${RACINE}/validations`} className="v2-gris" style={{ fontSize: 13 }}>
                Tout voir
              </Link>
            </div>
            <div className="v2-carte">
              {chargement || !compte ? (
                <ul className="v2-liste" aria-busy="true">
                  {[0, 1, 2].map((i) => (
                    <li key={i} className="v2-liste-item">
                      <Squelette largeur={32} hauteur={32} rond />
                      <span className="v2-liste-texte">
                        <Squelette largeur="80%" hauteur={14} />
                        <Squelette largeur="40%" hauteur={12} />
                      </span>
                    </li>
                  ))}
                </ul>
              ) : compte.enAttente.length ? (
                <ul className="v2-liste">
                  {compte.enAttente
                    .slice()
                    .sort((a, b) => (a.echeance ?? "9999").localeCompare(b.echeance ?? "9999"))
                    .slice(0, 5)
                    .map((d) => {
                      const enRetard = !!d.echeance && new Date(d.echeance).getTime() < aujourdhui;
                      return (
                        <li key={d.id} className="v2-liste-item">
                          <span className="v2-projet-icone" aria-hidden="true" style={{ fontSize: 11, fontWeight: 600 }}>
                            {libelleModule(d.module).slice(0, 2)}
                          </span>
                          <span className="v2-liste-texte">
                            <span>{d.resume}</span>
                            <small>
                              {d.demandeur_type === "systeme" ? "Omega" : nomPersonne(d.demandeur_id)} · {libelleModule(d.module)}
                              {d.montant !== null ? ` · ${montant(d.montant, d.devise)}` : ""}
                            </small>
                          </span>
                          <Badge teinte={enRetard ? "rouge" : "gris"} title={d.echeance ? `Échéance le ${dateCourte(d.echeance)}` : undefined}>
                            {relatif(d.echeance)}
                          </Badge>
                        </li>
                      );
                    })}
                </ul>
              ) : (
                <div className="v2-carte-corps v2-gris">Rien n&apos;attend votre décision.</div>
              )}
            </div>
          </section>
        </div>

        <div className="v2-colonne">
          <section aria-labelledby="titre-modules">
            <div className="v2-section-titre">
              <h2 className="v2-h2" id="titre-modules">
                Modules
              </h2>
            </div>
            {modules.length ? (
              <div className="v2-projets" data-vue={vueModules}>
                {modules.map((m) => {
                  const p = pilule(m);
                  const href = `${RACINE}/${m.cle}${m.cle === "filed" ? "/a-payer" : ""}`;
                  return (
                    <article key={m.cle} className="v2-projet">
                      <div className="v2-projet-haut">
                        <span className="v2-projet-icone" aria-hidden="true">
                          <m.icone width={16} height={16} />
                        </span>
                        <div style={{ minWidth: 0 }}>
                          <h3 className="v2-projet-titre v2-h3">
                            <Link href={href} className="v2-projet-lien">
                              {m.nom}
                            </Link>
                          </h3>
                          <div className="v2-projet-sous">{m.libelle}</div>
                        </div>
                        <div className="v2-projet-menu">
                          <MenuDeroulant etiquette={`Actions sur ${m.nom}`} declencheur={<MoreHorizontal width={16} height={16} aria-hidden="true" />}>
                            <ItemMenu id="ouvrir" href={href} icone={<ArrowUpRight width={16} height={16} aria-hidden="true" />}>
                              Ouvrir {m.nom}
                            </ItemMenu>
                            <ItemMenu id="ancien" href={m.ancien} icone={<ExternalLink width={16} height={16} aria-hidden="true" />}>
                              Ouvrir l&apos;écran actuel
                            </ItemMenu>
                            <SeparateurMenu />
                            <ItemMenu id="copier" onAction={() => void copier(href)} icone={<Copy width={16} height={16} aria-hidden="true" />}>
                              Copier le lien
                            </ItemMenu>
                          </MenuDeroulant>
                        </div>
                      </div>
                      <span className="v2-projet-pilule">
                        <span className="v2-point" data-teinte={p.teinte} aria-hidden="true" style={{ width: 8, height: 8 }} />
                        <span>{chargement && m.cle === "filed" ? "Lecture…" : p.texte}</span>
                      </span>
                      <div className="v2-projet-bas">
                        <span>{m.description}</span>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <Vide icone={<Search width={20} height={20} />} titre="Aucun module ne correspond">
                Rien ne répond à « {recherche} ».
              </Vide>
            )}
          </section>

          <section aria-labelledby="titre-docs">
            <div className="v2-section-titre">
              <h2 className="v2-h2" id="titre-docs">
                Derniers documents reçus
              </h2>
              <Link href={`${RACINE}/filed`} className="v2-gris" style={{ fontSize: 13 }}>
                Tout voir
              </Link>
            </div>
            <div className="v2-carte">
              <div className="v2-tableau-cadre">
                <table className="v2-tableau v2-tableau--empile">
                  <thead>
                    <tr>
                      <th scope="col">Référence</th>
                      <th scope="col">Fournisseur</th>
                      <th scope="col">Reçu</th>
                      <th scope="col">État</th>
                      <th scope="col" className="v2-num">
                        Montant
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {chargement
                      ? [0, 1, 2, 3].map((i) => (
                          <tr key={i}>
                            {[0, 1, 2, 3, 4].map((j) => (
                              <td key={j}>
                                <Squelette hauteur={14} />
                              </td>
                            ))}
                          </tr>
                        ))
                      : donnees.docs
                          .slice()
                          .sort((a, b) => b.recu_le.localeCompare(a.recu_le))
                          .slice(0, 6)
                          .map((d) => {
                            const e = etatDocument(d.etat);
                            return (
                              <tr key={d.id}>
                                <td data-etiquette="Référence">
                                  <Link href={`/espace/filed?objet=document:${encodeURIComponent(d.id)}`} className="v2-mono">
                                    {d.reference}
                                  </Link>
                                </td>
                                <td data-etiquette="Fournisseur">{d.fournisseur ?? <span className="v2-gris">à identifier</span>}</td>
                                <td data-etiquette="Reçu">
                                  <span title={dateCourte(d.recu_le)}>{relatif(d.recu_le)}</span>
                                </td>
                                <td data-etiquette="État">
                                  <Etat teinte={teinte(e.teinte)}>{e.libelle}</Etat>
                                </td>
                                <td data-etiquette="Montant" className="v2-num">
                                  {montant(d.montant, d.devise)}
                                </td>
                              </tr>
                            );
                          })}
                  </tbody>
                </table>
              </div>
              {!chargement && !donnees.docs.length ? <div className="v2-carte-corps v2-gris">Aucun document reçu.</div> : null}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
