"use client";

/* ══════════════════════════════════════════════════════════════════════
   La vue d'ensemble de l'organisation (06/10/2026, session C1)

   Sur le modèle de la page d'aperçu d'un projet du tableau de bord de
   référence (retour de Teo, 18 h 50 Z) :
     · un en-tête : le nom, l'état (exemple ou base réelle), les liens
       principaux à droite ;
     · un grand bloc pour l'élément le plus récent — le dernier document
       reçu, avec l'aperçu de sa pièce à gauche (comme la capture d'un
       déploiement) et sa fiche à droite, ses boutons en pied ;
     · des blocs compacts : activité récente, indicateurs, décisions en
       attente ; puis les modules.
   Les chiffres viennent des mêmes sources que les écrans (./donnees.ts).
   ══════════════════════════════════════════════════════════════════════ */

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Banknote, CheckCheck, Copy, ExternalLink, FileText, Inbox, MoreHorizontal, Sun } from "lucide-react";
import { useSource } from "@/components/espace/source";
import { nomPersonne } from "@/components/espace/exemples/socle";
import { dateCourte, dateHeure, libelleModule, montant, relatif } from "@/components/espace/format";
import { etatDocument } from "@/components/espace/filed/etats";
import FactureDessinee from "@/components/espace/filed/FactureDessinee";
import { A_PAYER, aPayer, du, groupeDe, minuit, totaux } from "./filed/calculs";
import { AnneauJauge, Badge, Etat, ItemMenu, MenuDeroulant, SeparateurMenu, Squelette, teinte } from "./ui";
import { MODULES, RACINE, type ModuleV2 } from "./modules";
import { useToast } from "./Toasts";
import { useDonnees } from "./donnees";
import { evenements } from "./evenements";
import { useOrganisation } from "./organisation";
import "@/components/espace/espace.css";
import "./habillage.css";

export default function Accueil() {
  const { source } = useSource();
  const toast = useToast();
  const { nom: organisation } = useOrganisation();
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

  /* le plus récent : sur l'exemple, le dernier document qui a une facture
     (son aperçu parle) ; en base réelle, le dernier document reçu, sans aperçu */
  const vedette = useMemo(() => {
    if (!donnees) return null;
    if (donnees.dernier) {
      const d = donnees.dernier;
      return { doc: donnees.docs.find((x) => x.id === d.document.id) ?? null, dossier: d };
    }
    const doc = donnees.docs.slice().sort((a, b) => b.recu_le.localeCompare(a.recu_le))[0] ?? null;
    return { doc, dossier: null };
  }, [donnees]);

  const activite = useMemo(() => (donnees ? evenements(donnees).slice(0, 6) : []), [donnees]);

  const pilule = (m: ModuleV2): { texte: string; teinte: "rouge" | "ambre" | "vert" | "gris" } => {
    if (m.cle === "filed" && compte) {
      if (compte.retard.length) return { texte: `${compte.retard.length} facture${compte.retard.length > 1 ? "s" : ""} en retard`, teinte: "rouge" };
      if (compte.semaine.length) return { texte: `${compte.semaine.length} à payer cette semaine`, teinte: "ambre" };
      return { texte: "Rien en retard", teinte: "vert" };
    }
    return { texte: source === "reelle" ? "Base réelle" : "Données d'exemple", teinte: "gris" };
  };

  const copier = (chemin: string) =>
    navigator.clipboard?.writeText(`${window.location.origin}${chemin}`).then(
      () => toast("Lien copié", "vert"),
      () => toast("Impossible de copier le lien. Réessayez.", "rouge"),
    );

  const v = vedette;
  const etatV = v?.doc ? etatDocument(v.doc.etat) : null;
  const bloquants = (v?.dossier?.controles ?? []).filter((c) => c.resultat === "anomalie" && c.gravite === "bloquant").length;
  const lienV = v?.doc ? `${RACINE}/filed?objet=document:${encodeURIComponent(v.doc.id)}` : `${RACINE}/filed`;

  return (
    <div className="v2-page v2-arrivee">
      {/* ——— l'en-tête : le nom, l'état, les liens principaux ——— */}
      <div className="v2-apercu-tete">
        <div className="v2-apercu-nom">
          <h1>{organisation}</h1>
          <Badge moyen teinte={source === "reelle" ? "bleu" : "gris"}>
            {source === "reelle" ? "Base réelle" : "Données d'exemple"}
          </Badge>
        </div>
        <div className="v2-actions">
          <Link href={`${RACINE}/point`} className="v2-btn v2-btn--petit">
            <Sun width={16} height={16} aria-hidden="true" /> Point du matin
          </Link>
          <Link href={`${RACINE}/validations`} className="v2-btn v2-btn--petit">
            <CheckCheck width={16} height={16} aria-hidden="true" /> À valider
            {compte?.enAttente.length ? <span className="v2-badge">{compte.enAttente.length}</span> : null}
          </Link>
          <Link href={`${RACINE}/filed`} className="v2-btn v2-btn--petit v2-btn--primaire">
            <FileText width={16} height={16} aria-hidden="true" /> Documents reçus
          </Link>
        </div>
      </div>

      {erreur ? (
        <div className="v2-note" data-teinte="rouge" role="alert" style={{ marginBottom: 24 }}>
          <strong>La base réelle n&apos;a pas répondu.</strong> {erreur}
        </div>
      ) : null}

      {/* ——— le grand bloc : le dernier document reçu ——— */}
      <section className="v2-carte v2-vedette" aria-labelledby="titre-vedette">
        <div className="v2-vedette-corps">
          <div className="v2-vedette-apercu">
            {chargement ? (
              <Squelette largeur="100%" hauteur={260} />
            ) : v?.dossier ? (
              <div className="resa esp v2-vedette-page" role="img" aria-label={`Aperçu de la pièce ${v.dossier.document.reference}`}>
                <div className="esp-page" style={{ aspectRatio: "595 / 842" }}>
                  <FactureDessinee dossier={v.dossier} page={1} />
                </div>
              </div>
            ) : (
              <div className="v2-vedette-vide" aria-hidden="true">
                <FileText width={28} height={28} />
              </div>
            )}
          </div>
          <div className="v2-vedette-fiche">
            <h2 className="v2-h3 v2-gris" id="titre-vedette" style={{ fontWeight: 500 }}>
              Dernier document reçu
            </h2>
            {chargement ? (
              <div style={{ display: "grid", gap: 12 }}>
                <Squelette largeur="60%" />
                <Squelette largeur="40%" />
                <Squelette largeur="50%" />
              </div>
            ) : v?.doc ? (
              <dl className="v2-fiche">
                <div>
                  <dt>Document</dt>
                  <dd>
                    <Link href={lienV} className="v2-mono v2-lien-souligne">
                      {v.doc.reference}
                    </Link>
                  </dd>
                </div>
                <div>
                  <dt>Fournisseur</dt>
                  <dd>{v.doc.fournisseur ?? <span className="v2-gris">à identifier</span>}</dd>
                </div>
                <div>
                  <dt>État</dt>
                  <dd className="v2-fiche-ligne">
                    <Etat teinte={teinte(etatV?.teinte)}>{etatV?.libelle}</Etat>
                    {bloquants ? (
                      <Badge teinte="rouge">
                        {bloquants} contrôle{bloquants > 1 ? "s" : ""} bloquant{bloquants > 1 ? "s" : ""}
                      </Badge>
                    ) : null}
                  </dd>
                </div>
                <div>
                  <dt>Reçu</dt>
                  <dd title={dateHeure(v.doc.recu_le)}>
                    {relatif(v.doc.recu_le)}
                    {v.dossier?.document.expediteur ? <span className="v2-gris"> · {v.dossier.document.expediteur}</span> : null}
                  </dd>
                </div>
                <div>
                  <dt>Montant</dt>
                  <dd className="v2-tabulaire">{montant(v.doc.montant, v.doc.devise)}</dd>
                </div>
                {v.dossier?.facture?.echeance_lue ? (
                  <div>
                    <dt>Échéance</dt>
                    <dd>{dateCourte(v.dossier.facture.echeance_lue)}</dd>
                  </div>
                ) : null}
              </dl>
            ) : (
              <p className="v2-gris" style={{ margin: 0 }}>
                Aucun document reçu pour l&apos;instant.
              </p>
            )}
          </div>
        </div>
        <div className="v2-carte-pied v2-vedette-pied">
          <span>Les documents arrivent par la boîte de réception ou par dépôt ; FILED les lit et les contrôle.</span>
          <span className="v2-actions">
            <Link href={`${RACINE}/filed/boite`} className="v2-btn v2-btn--petit">
              <Inbox width={16} height={16} aria-hidden="true" /> Boîte de réception
            </Link>
            <Link href={`${RACINE}/filed/a-payer`} className="v2-btn v2-btn--petit">
              <Banknote width={16} height={16} aria-hidden="true" /> À payer
            </Link>
            <Link href={lienV} className="v2-btn v2-btn--petit v2-btn--primaire">
              Ouvrir le dossier
            </Link>
          </span>
        </div>
      </section>

      {/* ——— les blocs compacts ——— */}
      <div className="v2-accueil v2-accueil--apercu">
        <section aria-labelledby="titre-activite">
          <div className="v2-section-titre">
            <h2 className="v2-h2" id="titre-activite">
              Activité récente
            </h2>
            <Link href={`${RACINE}/activite`} className="v2-gris" style={{ fontSize: 13 }}>
              Tout voir
            </Link>
          </div>
          <div className="v2-carte">
            <ul className="v2-liste" aria-busy={chargement}>
              {chargement
                ? [0, 1, 2, 3].map((i) => (
                    <li key={i} className="v2-liste-item">
                      <Squelette largeur={10} hauteur={10} rond />
                      <span className="v2-liste-texte">
                        <Squelette largeur="70%" hauteur={14} />
                        <Squelette largeur="40%" hauteur={12} />
                      </span>
                    </li>
                  ))
                : activite.map((e) => (
                    <li key={e.id} className="v2-liste-item">
                      <span className="v2-point" data-teinte={e.etat.teinte} aria-hidden="true" />
                      <span className="v2-liste-texte">
                        {e.lien ? <Link href={e.lien}>{e.quoi}</Link> : <span>{e.quoi}</span>}
                        <small>
                          {e.detail} · {libelleModule(e.module)}
                        </small>
                      </span>
                      <span className="v2-gris" style={{ fontSize: 13, whiteSpace: "nowrap" }} title={dateHeure(e.quand)}>
                        {relatif(e.quand)}
                      </span>
                    </li>
                  ))}
            </ul>
          </div>
        </section>

        <div className="v2-colonne">
          <section aria-labelledby="titre-indicateurs">
            <div className="v2-section-titre">
              <h2 className="v2-h2" id="titre-indicateurs">
                Indicateurs
              </h2>
              <Link href={`${RACINE}/utilisation`} className="v2-gris" style={{ fontSize: 13 }}>
                Utilisation
              </Link>
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
                <div className="v2-carte-corps">
                  <Squelette hauteur={14} />
                </div>
              ) : compte.enAttente.length ? (
                <ul className="v2-liste">
                  {compte.enAttente
                    .slice()
                    .sort((a, b) => (a.echeance ?? "9999").localeCompare(b.echeance ?? "9999"))
                    .slice(0, 3)
                    .map((d) => {
                      const enRetard = !!d.echeance && new Date(d.echeance).getTime() < aujourdhui;
                      return (
                        <li key={d.id} className="v2-liste-item">
                          <span className="v2-liste-texte">
                            <span>{d.resume}</span>
                            <small>
                              {d.demandeur_type === "systeme" ? "Omega" : nomPersonne(d.demandeur_id)} · {libelleModule(d.module)}
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
      </div>

      {/* ——— les modules ——— */}
      <section aria-labelledby="titre-modules" style={{ marginTop: 32 }}>
        <div className="v2-section-titre">
          <h2 className="v2-h2" id="titre-modules">
            Modules
          </h2>
        </div>
        <div className="v2-projets" data-vue="grille">
          {MODULES.map((m) => {
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
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
