"use client";

/* Les décisions à prendre : celles qui remontent au poste choisi, avec le
   calcul et les pièces. Rien ne part sans un clic. */

import { useState } from "react";
import { Check, FileText, Forward, X } from "lucide-react";
import { useToast } from "@/components/espace2/Toasts";
import { usePoste } from "../Coquille3";
import { DECISIONS_CEO, DECISIONS_MARKETING, JOURNAL, enseigne, keur, quand, societe } from "../donnees";
import { Carte, Ligne, Liste, Page, Pastille, Tete } from "../ui3";

type Suite = "valide" | "refuse" | "delegue";
const TEXTE: Record<Suite, string> = { valide: "Validée", refuse: "Refusée", delegue: "Déléguée" };

export default function Decisions() {
  const poste = usePoste();
  const decisions = poste === "marketing" ? DECISIONS_MARKETING : DECISIONS_CEO;
  const [suites, setSuites] = useState<Record<string, Suite>>({});
  const toast = useToast();
  const decider = (id: string, titre: string, s: Suite) => {
    setSuites((x) => ({ ...x, [id]: s }));
    toast(`${TEXTE[s]} : ${titre}`, s === "refuse" ? "neutre" : "vert");
  };
  const restantes = decisions.filter((d) => !suites[d.id]).length;
  const journal = poste === "marketing" ? JOURNAL.filter((j) => j.qui.includes("Marketing")) : JOURNAL;

  return (
    <Page>
      <Tete
        titre="Décisions à prendre"
        sous={
          poste === "marketing"
            ? "Ce qui demande l'accord de la direction marketing ce matin. Chaque proposition arrive avec ses chiffres et ses pièces ; rien ne part sans votre clic."
            : "Ce qui remonte à la présidence : au-delà de 150 k€, ou quand une règle du groupe est en jeu. Chaque décision arrive avec le calcul et les pièces qui la justifient."
        }
      />
      <div className="e3-decisions">
        {decisions.map((d) => {
          const fait = suites[d.id];
          const nomSociete = d.societe ? (societe(d.societe)?.nom ?? enseigne(d.societe)?.nom) : "Plusieurs sociétés";
          return (
            <article key={d.id} className="e3-decision" data-fait={fait ? "" : undefined}>
              <div className="e3-decision-tete">
                <strong>{d.titre}</strong>
                {fait ? <Pastille teinte={fait === "refuse" ? "gris" : "vert"}>{TEXTE[fait]}</Pastille> : <Pastille teinte={d.echeance <= 1 ? "rouge" : "ambre"}>{quand(d.echeance)}</Pastille>}
              </div>
              <p>{d.detail}</p>
              <div className="e3-pieces">
                {d.pieces.map((p) => (
                  <span key={p} className="e3-piece">
                    <FileText width={12} height={12} aria-hidden="true" /> {p}
                  </span>
                ))}
              </div>
              <div className="e3-decision-pied">
                <span className="e3-meta">
                  {nomSociete} · préparée par la {d.direction === "Marketing" ? "direction marketing" : `direction ${d.direction.toLowerCase() === "finance" ? "financière" : d.direction.toLowerCase()}`}
                  {d.montant ? ` · enjeu ${d.montant < 10 ? `${(d.montant * 1000).toLocaleString("fr-FR")} €` : keur(d.montant)}` : ""}
                </span>
                {!fait ? (
                  <span className="e3-boutons">
                    <button type="button" className="v2-btn v2-btn--petit v2-btn--fantome" onClick={() => decider(d.id, d.titre, "delegue")}>
                      <Forward width={14} height={14} aria-hidden="true" /> Déléguer
                    </button>
                    <button type="button" className="v2-btn v2-btn--petit" onClick={() => decider(d.id, d.titre, "refuse")}>
                      <X width={14} height={14} aria-hidden="true" /> Refuser
                    </button>
                    <button type="button" className="v2-btn v2-btn--petit v2-btn--primaire" onClick={() => decider(d.id, d.titre, "valide")}>
                      <Check width={14} height={14} aria-hidden="true" /> Valider
                    </button>
                  </span>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
      {restantes === 0 ? <p className="v2-gris" style={{ margin: 0 }}>Plus rien à décider ce matin. Le prochain point arrive demain à 6 h 15.</p> : null}
      <Carte titre="Déjà décidé" sous="Le journal garde qui a validé quoi, quand, et sur quelles pièces">
        <Liste>
          {journal.map((j, i) => (
            <Ligne key={i} teinte="vert" titre={`${j.qui} ${j.quoi}`} sous={j.module} fin={j.quand} />
          ))}
        </Liste>
      </Carte>
    </Page>
  );
}
