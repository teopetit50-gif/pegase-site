"use client";

/* Les réglages : la page « avec barre latérale » de la référence. À
   gauche, les rubriques ; à droite, une carte par réglage, avec son pied
   gris et son bouton. Le thème et les données affichées sont à nous ; la
   rubrique « Données » porte aussi l'écran Réglages de /espace (A3 :
   journal, export complet, préparer l'effacement), repris tel quel — son
   h1 « Réglages » est celui de la page. */

import { Fragment, useState } from "react";
import Link from "next/link";
import { Laptop, Moon, Sun } from "lucide-react";
import { useSource } from "@/components/espace/source";
import EcranReglages from "@/components/espace/reglages/EcranReglages";
import "@/components/espace/espace.css";
import "./habillage.css";
import { Interrupteur, Note } from "./ui";
import { changerTheme, useTheme, type Theme } from "./theme";
import { changerCalme, useCalme } from "./mouvement";
import { useToast } from "./Toasts";

/* 07/10/2026 — demande de Teo, d'après les Settings d'Attio : les
   rubriques rangées sous des intertitres (Personnel, Espace, Données,
   Aide), dans la colonne de la page et non dans la barre de gauche, qui
   n'a qu'une entrée « Réglages ». */
const GROUPES = [
  {
    titre: "Personnel",
    rubriques: [
      { id: "apparence", libelle: "Apparence" },
      { id: "accessibilite", libelle: "Accessibilité" },
    ],
  },
  {
    titre: "Espace",
    rubriques: [
      { id: "compte", libelle: "Membres et équipe" },
      { id: "utilisation", libelle: "Utilisation" },
    ],
  },
  {
    titre: "Données",
    rubriques: [
      { id: "donnees", libelle: "Données affichées" },
      { id: "donnees-export", libelle: "Export et effacement" },
    ],
  },
  { titre: "Aide", rubriques: [{ id: "support", libelle: "Support" }] },
];
const RUBRIQUES = GROUPES.flatMap((g) => g.rubriques);

const TITRE_CARTE = { fontSize: 20, lineHeight: "26px", letterSpacing: "-0.4px" } as const;

export default function Reglages() {
  const theme = useTheme();
  const toast = useToast();
  const { source, changer, connecte } = useSource();
  const [choix, setChoix] = useState<Theme | null>(null);
  const [rubrique, setRubrique] = useState(RUBRIQUES[0].id);
  const enCours = choix ?? theme;
  const calme = useCalme();

  return (
    <div className="v2-page v2-arrivee">
      <div className="v2-avec-cote">
        <nav className="v2-cote" aria-label="Rubriques des réglages">
          {GROUPES.map((g) => (
            <Fragment key={g.titre}>
              <p className="v2-cote-groupe">{g.titre}</p>
              {g.rubriques.map((r) => (
                <a key={r.id} href={`#${r.id}`} aria-current={rubrique === r.id ? "location" : undefined} onClick={() => setRubrique(r.id)}>
                  {r.libelle}
                </a>
              ))}
            </Fragment>
          ))}
        </nav>
        <div style={{ display: "grid", gap: 24 }}>
          <section id="apparence" className="v2-carte" aria-labelledby="t-apparence">
            <div className="v2-carte-corps" style={{ display: "grid", gap: 16 }}>
              <h2 className="v2-h2" id="t-apparence" style={TITRE_CARTE}>
                Thème
              </h2>
              <p className="v2-gris" style={{ margin: 0 }}>
                Le thème de l&apos;espace client sur cet appareil. « Système » suit le réglage de votre ordinateur ou de votre téléphone.
              </p>
              <div className="v2-bascule" role="radiogroup" aria-label="Thème" style={{ width: "fit-content" }}>
                {(
                  [
                    ["systeme", "Système", Laptop],
                    ["clair", "Clair", Sun],
                    ["sombre", "Sombre", Moon],
                  ] as const
                ).map(([cle, libelle, Icone]) => (
                  <button key={cle} type="button" role="radio" aria-checked={enCours === cle} onClick={() => setChoix(cle)} style={{ width: "auto", padding: "0 12px", gap: 6, display: "inline-flex", alignItems: "center" }}>
                    <Icone width={16} height={16} aria-hidden="true" /> {libelle}
                  </button>
                ))}
              </div>
            </div>
            <div className="v2-carte-pied">
              <span>Enregistré sur cet appareil.</span>
              <button
                type="button"
                className="v2-btn v2-btn--petit v2-btn--primaire"
                disabled={!choix || choix === theme}
                onClick={() => {
                  if (!choix) return;
                  changerTheme(choix);
                  setChoix(null);
                  toast("Thème enregistré", "vert");
                }}
              >
                Enregistrer
              </button>
            </div>
          </section>

          <section id="accessibilite" className="v2-carte" aria-labelledby="t-accessibilite">
            <div className="v2-carte-corps" style={{ display: "grid", gap: 16 }}>
              <h2 className="v2-h2" id="t-accessibilite" style={TITRE_CARTE}>
                Accessibilité
              </h2>
              <p className="v2-gris" style={{ margin: 0 }}>
                Coupe les animations et les transitions de l&apos;espace : les écrans changent d&apos;un coup, sans mouvement.
              </p>
              <Interrupteur
                actif={calme}
                onChange={(v) => {
                  changerCalme(v);
                  toast(v ? "Animations réduites" : "Animations rétablies", "vert");
                }}
              >
                Réduire les animations
              </Interrupteur>
            </div>
            <div className="v2-carte-pied">
              <span>Enregistré sur cet appareil.</span>
            </div>
          </section>

          <section id="donnees" className="v2-carte" aria-labelledby="t-donnees">
            <div className="v2-carte-corps" style={{ display: "grid", gap: 16 }}>
              <h2 className="v2-h2" id="t-donnees" style={TITRE_CARTE}>
                Données affichées
              </h2>
              <p className="v2-gris" style={{ margin: 0 }}>
                Les écrans montrent soit l&apos;entreprise d&apos;exemple (Atelier Bertin), soit vos propres données, lues dans la base sous vos droits.
              </p>
              <Interrupteur
                actif={source === "reelle"}
                desactive={!connecte}
                onChange={(v) => {
                  changer(v ? "reelle" : "exemple");
                  toast(v ? "Base réelle affichée" : "Données d'exemple affichées");
                }}
              >
                Afficher la base réelle
              </Interrupteur>
              {!connecte ? <Note teinte="bleu">Vous n&apos;êtes pas connecté : seul l&apos;exemple est visible. Connectez-vous depuis le cockpit pour voir vos données.</Note> : null}
            </div>
          </section>

          <div id="donnees-export" className="resa esp">
            <EcranReglages />
          </div>

          <section id="compte" className="v2-carte" aria-labelledby="t-compte">
            <div className="v2-carte-corps" style={{ display: "grid", gap: 16 }}>
              <h2 className="v2-h2" id="t-compte" style={TITRE_CARTE}>
                Membres et équipe
              </h2>
              <p className="v2-gris" style={{ margin: 0 }}>
                Chaque personne a son propre accès, avec son adresse e-mail : on ne partage pas un mot de passe. Les délégations et les règles de validation se règlent depuis la file « À valider » ; pour ouvrir un accès à un collègue, écrivez à Omega.
              </p>
            </div>
            <div className="v2-carte-pied">
              <Link href="/contact" className="v2-btn v2-btn--petit">
                Demander un accès
              </Link>
              <Link href="/espace2/validations" className="v2-btn v2-btn--petit">
                Ouvrir « À valider »
              </Link>
            </div>
          </section>

          <section id="utilisation" className="v2-carte" aria-labelledby="t-utilisation">
            <div className="v2-carte-corps" style={{ display: "grid", gap: 16 }}>
              <h2 className="v2-h2" id="t-utilisation" style={TITRE_CARTE}>
                Utilisation
              </h2>
              <p className="v2-gris" style={{ margin: 0 }}>
                Le volume traité par vos modules, module par module.
              </p>
            </div>
            <div className="v2-carte-pied">
              <span>Utilisation</span>
              <Link href="/espace2/utilisation" className="v2-btn v2-btn--petit">
                Ouvrir
              </Link>
            </div>
          </section>

          <section id="support" className="v2-carte" aria-labelledby="t-support">
            <div className="v2-carte-corps" style={{ display: "grid", gap: 16 }}>
              <h2 className="v2-h2" id="t-support" style={TITRE_CARTE}>
                Support
              </h2>
              <p className="v2-gris" style={{ margin: 0 }}>
                Une question, un module qui ne fait pas ce qu&apos;il devrait, une demande sur mesure : écrivez à Omega.
              </p>
            </div>
            <div className="v2-carte-pied">
              <span>Contact</span>
              <Link href="/contact" className="v2-btn v2-btn--petit">
                Écrire à Omega
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
