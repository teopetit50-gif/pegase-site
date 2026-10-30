"use client";

/* ══════════════════════════════════════════════════════════════════════
   La Carte en miniature, en tête de la vue d'ensemble (29/10/2026)

   Une ligne par agent : la source, l'agent et son chiffre, ce qui vous
   attend, le résultat ; un point court sur chaque fil où quelque chose
   passe. Chaque ligne ouvre la Carte sur son agent. Mêmes données que la
   Carte (./donnees › useCarte). Sur un téléphone, les fils et la source
   tombent : l'agent, l'attente et le résultat restent.
   ══════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Squelette } from "../ui";
import { RACINE } from "../modules";
import { useCarte } from "./donnees";
import "./mini-carte.css";

function Fil({ passe }: { passe: boolean }) {
  return (
    <span className="mc-fil" aria-hidden="true">
      {passe ? <span className="mc-point" /> : null}
    </span>
  );
}

export default function MiniCarte() {
  const carte = useCarte();
  const total = carte ? carte.agents.reduce((s, a) => s + a.aValider.n, 0) : 0;

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
        <Squelette largeur="100%" hauteur={176} />
      ) : (
        <ul className="mc-lignes">
          {carte.agents.map((a) => (
            <li key={a.cle}>
              <Link href={`${RACINE}/carte?bloc=agent:${a.cle}`} className="mc-ligne" data-erreur={a.etat === "erreur" ? "" : undefined} aria-label={`${a.nom} : ${a.source.texte}, ${a.aValider.texte}, ${a.resultat.texte}. Ouvrir sur la carte.`}>
                <span className="mc-source">{a.source.texte}</span>
                <Fil passe={a.etat === "pret" && a.source.n > 0} />
                <span className="mc-agent">
                  <strong>{a.nom}</strong>
                  <span>{a.etat === "erreur" ? "pas de réponse" : a.etat === "lecture" ? "lecture…" : (a.lignes[1] ? `${a.lignes[1].libelle.toLowerCase()} : ${a.lignes[1].valeur}` : "")}</span>
                </span>
                <Fil passe={a.aValider.n > 0} />
                <span className="mc-vous" data-attente={a.aValider.n ? "" : undefined}>
                  {a.aValider.n ? `${a.aValider.n} à valider` : "rien à valider"}
                </span>
                <Fil passe={a.resultat.n > 0} />
                <span className="mc-resultat">{a.resultat.texte}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {carte && total ? (
        <p className="mc-pied">
          <Link href={`${RACINE}/validations`} className="v2-va-lien">
            {total} élément{total > 1 ? "s" : ""} vous attend{total > 1 ? "ent" : ""} dans « À valider » <ArrowRight width={14} height={14} />
          </Link>
        </p>
      ) : null}
    </section>
  );
}
