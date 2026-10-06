"use client";

/* Les réglages : la page « avec barre latérale » de la référence. À
   gauche, les rubriques ; à droite, une carte par réglage, avec son pied
   gris et son bouton. Ce qui est réglable ici l'est vraiment : le thème
   et les données affichées. Le reste se règle encore dans le cockpit. */

import { useState } from "react";
import Link from "next/link";
import { Laptop, Moon, Sun } from "lucide-react";
import { useSource } from "@/components/espace/source";
import { Interrupteur, Note } from "./ui";
import { changerTheme, useTheme, type Theme } from "./theme";
import { useToast } from "./Toasts";

const RUBRIQUES = [
  { id: "apparence", libelle: "Apparence" },
  { id: "donnees", libelle: "Données" },
  { id: "compte", libelle: "Compte" },
];

export default function Reglages() {
  const theme = useTheme();
  const toast = useToast();
  const { source, changer, connecte } = useSource();
  const [choix, setChoix] = useState<Theme | null>(null);
  const [rubrique, setRubrique] = useState(RUBRIQUES[0].id);
  const enCours = choix ?? theme;

  return (
    <div className="v2-page v2-arrivee">
      <div className="v2-avec-cote">
        <nav className="v2-cote" aria-label="Rubriques des réglages">
          {RUBRIQUES.map((r) => (
            <a key={r.id} href={`#${r.id}`} aria-current={rubrique === r.id ? "location" : undefined} onClick={() => setRubrique(r.id)}>
              {r.libelle}
            </a>
          ))}
        </nav>
        <div style={{ display: "grid", gap: 24 }}>
          <section id="apparence" className="v2-carte" aria-labelledby="t-apparence">
            <div className="v2-carte-corps" style={{ display: "grid", gap: 16 }}>
              <h2 className="v2-h2" id="t-apparence" style={{ fontSize: 20, lineHeight: "26px", letterSpacing: "-0.4px" }}>
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

          <section id="donnees" className="v2-carte" aria-labelledby="t-donnees">
            <div className="v2-carte-corps" style={{ display: "grid", gap: 16 }}>
              <h2 className="v2-h2" id="t-donnees" style={{ fontSize: 20, lineHeight: "26px", letterSpacing: "-0.4px" }}>
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

          <section id="compte" className="v2-carte" aria-labelledby="t-compte">
            <div className="v2-carte-corps" style={{ display: "grid", gap: 16 }}>
              <h2 className="v2-h2" id="t-compte" style={{ fontSize: 20, lineHeight: "26px", letterSpacing: "-0.4px" }}>
                Compte et équipe
              </h2>
              <p className="v2-gris" style={{ margin: 0 }}>
                Les personnes, les rôles et les règles de validation se règlent pour l&apos;instant dans l&apos;espace client actuel.
              </p>
            </div>
            <div className="v2-carte-pied">
              <span>Écran actuel</span>
              <Link href="/espace/validations" className="v2-btn v2-btn--petit">
                Ouvrir
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
