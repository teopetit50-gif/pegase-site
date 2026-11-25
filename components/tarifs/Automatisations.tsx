import Section from "@/components/charte/Section";
import EnTeteSection from "@/components/charte/EnTeteSection";
import { GrilleCartes, Scene } from "@/components/charte/Cartes";
import "./automatisations.css";

/* ══════════════════════════════════════════════════════════════════════
   /tarifs — LES AUTOMATISATIONS (25/11/2026)

   Teo : « pour la page tarifs, voici ce qu'on propose pour la partie
   automatisation, installation » — document « Prix des automatisations »
   (artefact claude.ai U6czTsu1Bfc2YGSFJSc537, 25/11/2026).

   Ce qui en est repris, mot pour mot quand c'est possible : les trois cas
   (sans IA, avec IA, sur-mesure) et leurs montants, la grille des recharges
   (celle qu'Odoo applique à la lecture des factures, décidée le 25/11), ses
   quatre règles, les deux suggestions du tableau de bord, l'exemple.
   Ce qui n'en est PAS repris, parce que c'est interne : nos coûts (« pour
   nous : … »), la comparaison chiffrée avec Odoo, la note sur les agents
   et la liste « à trancher entre nous ».
   Montants hors taxes, comme tout le reste de la page.
   ══════════════════════════════════════════════════════════════════════ */

const CAS = [
  {
    origine: "Proposée par nous",
    titre: "Sans IA",
    texte: "Elle suit une règle : elle prévient le responsable quand le stock passe sous 10 unités.",
    une_fois: "49 € HT d'installation",
    ensuite: "Rien",
    ensuite_vide: true,
    suggestion: {
      qui: "Suggestion sans IA",
      texte:
        "Votre stock de cartouches d'encre passe souvent sous 10 unités sans que personne ne le voie. Je peux prévenir Julien dès que cela arrive. Installation : 49 € HT, une fois. Ensuite, rien à payer.",
    },
  },
  {
    origine: "Proposée par nous",
    titre: "Avec IA",
    texte: "L'IA travaille à chaque passage : elle rédige chaque relance selon l'historique du client.",
    une_fois: "99 € HT d'installation",
    ensuite: "0,10 à 0,15 € HT la pièce",
    ensuite_vide: false,
    suggestion: {
      qui: "Suggestion avec IA",
      texte:
        "Vous relancez vos clients à la main chaque matin. Je peux rédiger et envoyer ces relances pour vous. Installation : 99 € HT, une fois, avec 100 relances offertes. Ensuite, chaque relance utilise une pièce de vos recharges, dès 0,10 € HT.",
    },
  },
  {
    origine: "Demandée par vous",
    titre: "Sur-mesure",
    texte: "Vous décrivez ce que vous voulez, une automatisation ou un agent. Nous le construisons pour vous.",
    une_fois: "Sur devis",
    ensuite: "À la pièce, s'il y a de l'IA",
    ensuite_vide: true,
    planchers: [
      { quoi: "Une automatisation", prix: "dès 490 € HT" },
      { quoi: "Un agent", prix: "dès 1 190 € HT" },
    ],
  },
];

const RECHARGES = [
  { pieces: "100 pièces", prix: "15 €", unite: "0,15 € la pièce" },
  { pieces: "1 000 pièces", prix: "120 €", unite: "0,12 € la pièce" },
  { pieces: "10 000 pièces", prix: "1 000 €", unite: "0,10 € la pièce" },
];

const REGLES = [
  { fort: "100 pièces offertes", suite: " à l'installation d'une automatisation avec IA, pour l'essayer." },
  { fort: "Pas de date limite", suite: " : les pièces restent tant qu'elles ne sont pas utilisées." },
  {
    fort: "Une alerte avant d'être à court",
    suite: ", et une recharge automatique si vous la souhaitez. À zéro, les automatisations avec IA s'arrêtent, et aucun dépassement n'est facturé.",
  },
  { fort: "Un document de plus de 10 pages", suite: " compte pour deux pièces." },
];

function Suggestion({ qui, texte }: { qui: string; texte: string }) {
  return (
    <div className="ch-auto-bulle">
      <span className="ch-auto-qui">{qui}</span>
      <p>{texte}</p>
      <div className="ch-auto-btns" aria-hidden="true">
        <span>Installer</span>
        <span>Plus tard</span>
      </div>
    </div>
  );
}

export default function Automatisations() {
  return (
    <>
      <Section id="automatisations">
        <EnTeteSection
          pastille="Automatisations"
          titre="Chaque automatisation se paie une fois, à l'installation."
          suite="Quand l'IA y travaille, chaque tâche se paie à la pièce."
          chapo="Les pièces s'achètent en recharges payées d'avance. Plus la recharge est importante, moins la pièce coûte."
        />
        <GrilleCartes colonnes={3}>
          {CAS.map((c) => (
            <article key={c.titre} className="ch-carte">
              <Scene basse className="ch-auto-scene">
                {c.suggestion ? (
                  <Suggestion qui={c.suggestion.qui} texte={c.suggestion.texte} />
                ) : (
                  <ul className="ch-auto-planchers">
                    {c.planchers?.map((p) => (
                      <li key={p.quoi}>
                        <span>{p.quoi}</span>
                        <b>{p.prix}</b>
                      </li>
                    ))}
                  </ul>
                )}
              </Scene>
              <div className="ch-carte-texte">
                <span className="ch-auto-origine">{c.origine}</span>
                <h3>{c.titre}</h3>
                <p>{c.texte}</p>
                <dl className="ch-auto-paiements">
                  <div>
                    <dt>Une fois</dt>
                    <dd>{c.une_fois}</dd>
                  </div>
                  <div>
                    <dt>Ensuite</dt>
                    <dd className={c.ensuite_vide ? "is-vide" : ""}>{c.ensuite}</dd>
                  </div>
                </dl>
              </div>
            </article>
          ))}
        </GrilleCartes>
      </Section>

      <Section id="recharges">
        <EnTeteSection
          pastille="Recharges"
          titre="Les pièces se paient en recharges."
          suite="Le prix ne dépend pas de la tâche."
          chapo="Dans une automatisation, une pièce est une tâche de l'IA : une facture lue, une relance rédigée, un mail trié, un résumé."
        />
        <GrilleCartes colonnes={3}>
          {RECHARGES.map((r) => (
            <article key={r.pieces} className="ch-carte">
              <Scene basse className="ch-auto-recharge">
                <span className="ch-auto-pieces">{r.pieces}</span>
                <span className="ch-auto-montant">{r.prix}</span>
                <span className="ch-auto-unite">{r.unite}</span>
              </Scene>
            </article>
          ))}
        </GrilleCartes>
        <div className="ch-contenu ch-auto-bas">
          <ul className="ch-auto-regles">
            {REGLES.map((r) => (
              <li key={r.fort}>
                <b>{r.fort}</b>
                {r.suite}
              </li>
            ))}
          </ul>
          <div className="ch-auto-exemple">
            <span className="ch-pastille">Exemple</span>
            <p>
              Une PME de 10 personnes installe <b>deux automatisations sans IA</b>, une alerte de stock et un
              rappel de devis non signé : <b>98 € HT</b>, une seule fois.
            </p>
            <p>
              Elle installe aussi <b>les relances rédigées par l&apos;IA</b> : <b>99 € HT</b>, une fois, avec 100
              pièces offertes. Elle envoie 315 relances par mois et prend une recharge de{" "}
              <b>1 000 pièces à 120 € HT</b> : la recharge dure un peu plus de trois mois, soit{" "}
              <b>environ 38 € HT par mois</b>.
            </p>
            <p>
              Puis elle demande un outil qui rapproche ses paiements bancaires de ses factures : c&apos;est du{" "}
              <b>sur-mesure, sur devis</b>.
            </p>
          </div>
        </div>
      </Section>
    </>
  );
}
