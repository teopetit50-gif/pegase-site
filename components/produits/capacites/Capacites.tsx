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

import { useState } from "react";

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

/* Combien de lignes une famille montre sur téléphone avant de se replier.
   Trois : de quoi comprendre ce que la famille couvre, sans dérouler les
   huit. Sur ordinateur la coupe n'existe pas — voir capacites.css. */
const LIGNES_MOBILE = 3;

export function GrilleCapacites({ donnees }: { donnees: Catalogue }) {
  const total = compterCapacites(donnees);
  /* 16/09/2026 (Teo, par l'associé) — « cette section est beaucoup trop
     longue sur mobile, c'est immense ; que l'essentiel, uniquement sur la
     vue mobile, ça peut rester comme ça sur desktop ».

     Quarante-cinq lignes en une colonne font un mur de deux écrans et
     demi sur un téléphone. Sur ordinateur, c'est l'inverse : la densité
     EST l'argument de la section, six colonnes se balayent d'un regard,
     et on n'y touche pas.

     Chaque famille s'arrête donc à trois lignes sur téléphone, avec le
     reste à un geste. RIEN N'EST RETIRÉ DU DOM : la coupe est faite en
     CSS sous 768 px (`:nth-child(n + 4)`), le même balisage est rendu
     partout. C'est ce qui permet de garder le référencement et la
     recherche dans la page — et d'éviter une bascule au montage, qui
     ferait clignoter la liste entière à l'arrivée sur mobile. */
  const [deployees, setDeployees] = useState<string[]>([]);

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
          <section
            key={f.nom}
            className="cap-famille"
            data-tout={deployees.includes(f.nom) ? "" : undefined}
          >
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
            {/* Caché sur ordinateur par la feuille de style, et pas rendu
                du tout quand la famille tient déjà en entier : un bouton
                « voir les 0 autres » est une faute, pas un détail. */}
            {f.lignes.length > LIGNES_MOBILE ? (
              <button
                type="button"
                className="cap-plus"
                aria-expanded={deployees.includes(f.nom)}
                onClick={() =>
                  setDeployees((d) =>
                    d.includes(f.nom) ? d.filter((x) => x !== f.nom) : [...d, f.nom],
                  )
                }
              >
                {deployees.includes(f.nom)
                  ? "Réduire"
                  : `Voir les ${f.lignes.length - LIGNES_MOBILE} autres`}
              </button>
            ) : null}
          </section>
        ))}
      </div>

      <p className="cap-mention">{donnees.mention}</p>
    </div>
  );
}

/* Combien de questions et de cartes restent visibles sur téléphone avant
   le repli. Six : la moitié d'un bloc de douze, un tiers de page au lieu
   des deux tiers, et assez pour que le visiteur voie de quoi il s'agit. */
const CAS_MOBILE = 6;
const CARTES_MOBILE = 3;

export function CasLimites({ donnees }: { donnees: BlocCasLimites }) {
  /* 16/09/2026 (Teo, par l'associé) — « toute la page CASHD est cent fois
     trop remplie sur la version mobile ». Douze questions en accordéon
     font douze cents pixels de rangées fermées : on en montre six, les
     autres à un geste. Sur ordinateur elles s'affichent sur deux colonnes
     dès 1024 et ne coûtent qu'un demi-écran — rien n'y change. */
  const [tout, setTout] = useState(false);
  return (
    <div className="cap" data-tout={tout ? "" : undefined}>
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
      {donnees.cas.length > CAS_MOBILE ? (
        <button type="button" className="cap-plus cap-plus--bloc" aria-expanded={tout} onClick={() => setTout((v) => !v)}>
          {tout ? "Réduire" : `Voir les ${donnees.cas.length - CAS_MOBILE} autres questions`}
        </button>
      ) : null}
    </div>
  );
}

export function EchelleGroupe({ donnees }: { donnees: BlocEchelle }) {
  /* Même raison que ci-dessus : six cartes en pile font seize cents
     pixels, et cette section-là parle des groupes à plusieurs services —
     ce n'est pas ce que le visiteur d'un téléphone cherche en premier. */
  const [tout, setTout] = useState(false);
  return (
    <div className="cap" data-tout={tout ? "" : undefined}>
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
      {donnees.cartes.length > CARTES_MOBILE ? (
        <button type="button" className="cap-plus cap-plus--bloc" aria-expanded={tout} onClick={() => setTout((v) => !v)}>
          {tout ? "Réduire" : `Voir les ${donnees.cartes.length - CARTES_MOBILE} autres`}
        </button>
      ) : null}
    </div>
  );
}
