"use client";

/* ══════════════════════════════════════════════════════════════════════
   Les trois blocs de capacités, partagés par les quatre pages produit
   (14/09/2026)

   `GrilleCapacites`  le catalogue, familles en cartes, dense à dessein :
                      c'est la densité qui produit l'effet, pas un adjectif.
                      Aucun onglet — un onglet cacherait cinq familles sur
                      six, donc exactement ce qu'on cherche à montrer.
   `CasLimites`       douze situations en accordéon (Radix, déjà installé),
                      deux colonnes à partir de 1024 px.
   `EchelleGroupe`    six cartes : ce qui change quand plusieurs services
                      valident.

   Trois précautions du parc appliquées ici :
   · les icônes arrivent par NOM (voir `icones.tsx`) ;
   · le style est en CSS scopé, jamais en utilitaires, parce qu'une peau de
     page bat un utilitaire et qu'un `border` nu se peint en `currentColor` ;
   · le contenu d'un accordéon Radix fermé est DÉMONTÉ : une sonde qui
     cherche le texte d'une réponse repliée rend `null`, ce n'est pas un
     trou dans la page.
   ══════════════════════════════════════════════════════════════════════ */

import * as Accordion from "@radix-ui/react-accordion";

import type { BlocCasLimites, BlocEchelle, Catalogue } from "@/lib/produits/capacites/types";
import { compterCapacites } from "@/lib/produits/capacites/types";
import { Icone } from "./icones";
import "./capacites.css";

function Coche() {
  return (
    <svg className="cap-puce" viewBox="0 0 10 10" aria-hidden="true">
      <path d="M1 5.4 3.6 8 9 1.8" />
    </svg>
  );
}

export function GrilleCapacites({ donnees }: { donnees: Catalogue }) {
  const total = compterCapacites(donnees);

  return (
    <div className="cap">
      <p className="cap-etiquette">{donnees.etiquette}</p>
      <h2 className="cap-titre">{donnees.titre}</h2>
      <p className="cap-chapo">{donnees.chapo}</p>

      <p className="cap-compte">
        <b>{total}</b>
        <span>
          capacités, réparties en {donnees.familles.length} familles
        </span>
      </p>

      <div className="cap-grille">
        {donnees.familles.map((f) => (
          <section key={f.nom} className="cap-famille">
            <header className="cap-famille-tete">
              <span className="cap-famille-icone">
                <Icone nom={f.icone} />
              </span>
              <h3 className="cap-famille-nom">{f.nom}</h3>
              <span className="cap-famille-compte">{f.lignes.length}</span>
            </header>
            <ul className="cap-liste">
              {f.lignes.map((l) => (
                <li key={l.t}>
                  <Coche />
                  <span>{l.t}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <p className="cap-mention">{donnees.mention}</p>
    </div>
  );
}

export function CasLimites({ donnees }: { donnees: BlocCasLimites }) {
  return (
    <div className="cap">
      <p className="cap-etiquette">{donnees.etiquette}</p>
      <h2 className="cap-titre">{donnees.titre}</h2>
      <p className="cap-chapo">{donnees.chapo}</p>

      <Accordion.Root type="multiple" className="cap-cas">
        {donnees.cas.map((c, i) => (
          <Accordion.Item key={c.q} value={`cas-${i}`} className="cap-cas-item">
            <Accordion.Header>
              <Accordion.Trigger className="cap-cas-tete">
                <span className="cap-cas-q">{c.q}</span>
                <svg className="cap-cas-signe" viewBox="0 0 16 16" aria-hidden="true">
                  <path
                    d="M8 2v12M2 8h12"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </Accordion.Trigger>
            </Accordion.Header>
            <Accordion.Content className="cap-cas-corps">
              <p>{c.r}</p>
            </Accordion.Content>
          </Accordion.Item>
        ))}
      </Accordion.Root>
    </div>
  );
}

export function EchelleGroupe({ donnees }: { donnees: BlocEchelle }) {
  return (
    <div className="cap">
      <p className="cap-etiquette">{donnees.etiquette}</p>
      <h2 className="cap-titre">{donnees.titre}</h2>
      <p className="cap-chapo">{donnees.chapo}</p>

      <div className="cap-echelle">
        {donnees.cartes.map((c) => (
          <article key={c.titre} className="cap-carte">
            <span className="cap-carte-icone">
              <Icone nom={c.icone} />
            </span>
            <h3>{c.titre}</h3>
            <p>{c.texte}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
