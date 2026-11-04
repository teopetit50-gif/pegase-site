"use client";

/* ══════════════════════════════════════════════════════════════════════
   La Carte en miniature, en tête de la vue d'ensemble (29/10/2026,
   en tableau le 01/11/2026)

   Un tableau, une ligne par agent : son état, ce qui est entré, le point
   à surveiller, ce qui vous attend, ce qui en est sorti. Les colonnes ont
   un titre, les chiffres sont alignés et restent sans couleur ; seule la
   pastille d'état en porte une. Chaque ligne ouvre la Carte sur son agent.
   Mêmes données que la Carte (./donnees › useCarte). Sur une tablette les
   entrées tombent ; sur un téléphone chaque ligne passe en fiche.
   ══════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { ArrowRight, ChevronRight } from "lucide-react";
import { Squelette } from "../ui";
import { RACINE } from "../modules";
import { useCarte, type Agent } from "./donnees";
import "./mini-carte.css";

const ETAT: Record<Agent["etat"], string> = { pret: "Actif", lecture: "Lecture…", erreur: "Hors ligne" };

/* le point à surveiller : le premier chiffre qui porte une alerte, sinon le deuxième du bloc de l'agent */
const signalDe = (a: Agent) => a.lignes.find((l) => l.teinte && l.teinte !== "vert") ?? a.lignes[1];

export default function MiniCarte() {
  const carte = useCarte();
  /* 04/11 — seules les demandes qui sont dans « À valider » se comptent ici :
     les réponses de REPUT et les messages d'OFFLOAD se relisent sur leur page */
  const total = carte ? carte.agents.filter((a) => a.aValider.lien === `${RACINE}/validations`).reduce((s, a) => s + a.aValider.n, 0) : 0;

  return (
    <section className="v2-carte v2-carte-corps mc" aria-labelledby="mc-titre">
      <div className="v2-va-titre">
        <h2 className="v2-h2" id="mc-titre">
          Vos agents en ce moment
        </h2>
        <Link href={`${RACINE}/carte`} className="v2-va-lien">
          Ouvrir la carte <ArrowRight width={14} height={14} />
        </Link>
      </div>
      {!carte ? (
        <Squelette largeur="100%" hauteur={232} />
      ) : (
        <div className="mc-tableau">
          <div className="mc-entete" aria-hidden="true">
            <span>Agent</span>
            <span className="mc-col-entrees">Entrées</span>
            <span>À surveiller</span>
            <span className="mc-col-n">À valider</span>
            <span>Résultat</span>
            <span />
          </div>
          <ul className="mc-lignes">
            {carte.agents.map((a) => {
              const signal = a.etat === "pret" ? signalDe(a) : undefined;
              return (
                <li key={a.cle}>
                  <Link
                    href={`${RACINE}/carte?bloc=agent:${a.cle}`}
                    className="mc-ligne"
                    data-etat={a.etat}
                    aria-label={`${a.nom}, ${ETAT[a.etat].toLowerCase()} : ${a.source.texte}, ${a.aValider.texte}, ${a.resultat.texte}. Ouvrir sur la carte.`}
                  >
                    <span className="mc-agent">
                      <span className="mc-pastille" aria-hidden="true" />
                      <strong>{a.nom}</strong>
                      <span className="mc-etat">{ETAT[a.etat]}</span>
                    </span>
                    <span className="mc-col-entrees mc-texte">{a.source.texte}</span>
                    <span className="mc-signal">
                      {signal ? (
                        <>
                          <span className="mc-signal-libelle">{signal.libelle}</span>
                          <span className="mc-signal-valeur">{signal.valeur}</span>
                        </>
                      ) : (
                        <span className="mc-vide">—</span>
                      )}
                    </span>
                    <span className="mc-col-n mc-attente" data-attente={a.aValider.n ? "" : undefined}>
                      {a.aValider.n ? a.aValider.n : <span className="mc-vide">—</span>}
                    </span>
                    <span className="mc-texte mc-resultat">{a.resultat.texte}</span>
                    <ChevronRight className="mc-chevron" width={16} height={16} aria-hidden="true" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {carte && total ? (
        <p className="mc-pied">
          <Link href={`${RACINE}/validations`} className="v2-va-lien">
            {total} décision{total > 1 ? "s" : ""} de vos agents vous attend{total > 1 ? "ent" : ""} dans « À valider » <ArrowRight width={14} height={14} />
          </Link>
        </p>
      ) : null}
    </section>
  );
}
