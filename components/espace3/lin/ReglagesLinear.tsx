"use client";

/* ══════════════════════════════════════════════════════════════════════
   Les réglages — la page Settings › Preferences de Linear, au 1:1
   (28/10/2026, nuit ; demande de Teo : « reproduis-les à l'identique »).

   Une colonne de 640 centrée, le titre, puis une section par sujet : son
   titre (15/500), une carte (rayon 10) de lignes « libellé et aide à
   gauche, commande à droite » (interrupteur 30 × 20, liste déroulante de
   30, bouton texte de 32). Mesures : ./linear-reglages.css, relevé
   scratchpad/releve-linear-reglages.md.

   Les gestes de la page d'avant (components/espace3/Reglages.tsx, modèle
   Supabase) sont tous là, au même endroit :
     · #accessibilite : réduire les animations (cet appareil) ;
     · #donnees : afficher la base réelle (ou l'exemple), la note « non
       connecté » ;
     · #donnees-export : l'écran Réglages de /espace (journal, export
       complet, préparer l'effacement), repris tel quel ;
     · #compte : demander un accès, « À valider », l'équipe ;
     · #utilisation, #support : les liens.
   Le volet de navigation pointe #accessibilite et #donnees : les sections
   gardent ces ancres (scroll-margin sous la barre du haut).
   ══════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useSource } from "@/components/espace3/base/source";
import EcranReglages from "@/components/espace3/base/reglages/EcranReglages";
import "@/components/espace3/base/espace.css";
import "../habillage.css";
import "./lin.css";
import "./linear-reglages.css";
import { changerCalme, useCalme } from "../mouvement";
import { useToast } from "../Toasts";

/* ——— briques ——— */
export function Chevron() {
  return (
    <svg className="lrg-chevron" viewBox="0 0 9 5" aria-hidden="true">
      <path fill="currentColor" d="M1.915.557a.667.667 0 0 0-.943.943l2.862 2.862a.942.942 0 0 0 1.333 0L8.028 1.5a.667.667 0 0 0-.943-.943L4.5 3.14 1.915.557Z" />
    </svg>
  );
}

/* l'interrupteur de Linear : 30 × 20, bouton de 14 */
export function Interrupteur({ actif, onChange, libelle, desactive }: { actif: boolean; onChange: (v: boolean) => void; libelle: string; desactive?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={actif} aria-label={libelle} className="lrg-interrupteur" disabled={desactive} onClick={() => onChange(!actif)}>
      <span className="lrg-interrupteur-rail" aria-hidden="true" />
    </button>
  );
}

/* la liste déroulante de Linear : un bouton de 30, le <select> natif invisible par-dessus */
export function Select<T extends string>({
  valeur,
  options,
  onChange,
  libelle,
  desactive,
  faible,
}: {
  valeur: T;
  options: { cle: T; libelle: string }[];
  onChange: (v: T) => void;
  libelle: string;
  desactive?: boolean;
  faible?: string;
}) {
  return (
    <span className="lrg-select" data-desactive={desactive ? "" : undefined}>
      {options.find((o) => o.cle === valeur)?.libelle ?? valeur}
      {faible ? <span className="lrg-faible">{faible}</span> : null}
      <Chevron />
      <select aria-label={libelle} value={valeur} disabled={desactive} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((o) => (
          <option key={o.cle} value={o.cle}>
            {o.libelle}
          </option>
        ))}
      </select>
    </span>
  );
}

function Section({ id, titre, description, children }: { id: string; titre: string; description?: string; children: React.ReactNode }) {
  return (
    <fieldset id={id} className="lrg-section" aria-labelledby={`t-${id}`}>
      <div className="lrg-section-tete">
        <h3 id={`t-${id}`} className="lrg-h3">
          {titre}
        </h3>
        {description ? <p className="lrg-section-desc">{description}</p> : null}
      </div>
      {children}
    </fieldset>
  );
}

function Ligne({ libelle, aide, children }: { libelle: string; aide?: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="lrg-ligne">
      <div className="lrg-ligne-texte">
        <span className="lrg-libelle">{libelle}</span>
        {aide ? <span className="lrg-aide">{aide}</span> : null}
      </div>
      <div className="lrg-ligne-droite">{children}</div>
    </li>
  );
}

export default function ReglagesLinear() {
  const toast = useToast();
  const { source, changer, connecte } = useSource();
  const calme = useCalme();

  return (
    <div className="lin lrg">
      <div className="lrg-page">
        <div className="lrg-col">
          <div className="lrg-tete">
            <h1 className="lrg-h1">Réglages</h1>
          </div>

          <div className="lrg-sections">
            <Section id="accessibilite" titre="Accessibilité">
              <ul className="lrg-carte">
                <Ligne libelle="Réduire les animations" aide="Coupe les animations et les transitions de l'espace : les écrans changent d'un coup, sans mouvement. Enregistré sur cet appareil.">
                  <Interrupteur
                    actif={calme}
                    libelle="Réduire les animations"
                    onChange={(v) => {
                      changerCalme(v);
                      toast(v ? "Animations réduites" : "Animations rétablies", "vert");
                    }}
                  />
                </Ligne>
              </ul>
            </Section>

            <Section id="donnees" titre="Données affichées">
              <ul className="lrg-carte">
                <Ligne libelle="Afficher la base réelle" aide="Les écrans montrent soit le groupe d'exemple (Groupe Soléa, fictif), soit vos propres données, lues dans la base sous vos droits.">
                  <Interrupteur
                    actif={source === "reelle"}
                    desactive={!connecte}
                    libelle="Afficher la base réelle"
                    onChange={(v) => {
                      changer(v ? "reelle" : "exemple");
                      toast(v ? "Base réelle affichée" : "Données d'exemple affichées");
                    }}
                  />
                </Ligne>
                {!connecte ? (
                  <li className="lrg-ligne lrg-ligne--texte" role="status">
                    <span className="lrg-aide">Vous n&apos;êtes pas connecté : seul l&apos;exemple est visible. Connectez-vous depuis le cockpit pour voir vos données.</span>
                  </li>
                ) : null}
              </ul>
            </Section>

            <Section id="donnees-export" titre="Export et effacement" description="Le journal de tout ce qui a été fait, l'export complet en un clic, et la sortie.">
              <div className="lrg-ancien resa esp">
                <EcranReglages />
              </div>
            </Section>

            <Section id="compte" titre="Membres et équipe">
              <ul className="lrg-carte">
                <Ligne libelle="L'équipe" aide="Qui a accès à l'espace, avec quel rôle, sur quelles sociétés.">
                  <Link href="/espace3/equipe" className="lrg-btn lrg-btn--texte">
                    Voir l&apos;équipe
                  </Link>
                </Ligne>
                <Ligne libelle="Ouvrir un accès" aide="Chaque personne a son propre accès, avec son adresse e-mail : on ne partage pas un mot de passe. Pour ouvrir un accès à un collègue, écrivez à Omega.">
                  <Link href="/contact" className="lrg-btn lrg-btn--texte">
                    Demander un accès
                  </Link>
                </Ligne>
                <Ligne libelle="Délégations et règles de validation" aide="Elles se règlent depuis la file « À valider ».">
                  <Link href="/espace3/validations" className="lrg-btn lrg-btn--texte">
                    Ouvrir « À valider »
                  </Link>
                </Ligne>
              </ul>
            </Section>

            <Section id="utilisation" titre="Utilisation">
              <ul className="lrg-carte">
                <Ligne libelle="Utilisation de l'espace" aide="Documents, montants, demandes et décisions sur la période, module par module.">
                  <Link href="/espace3/utilisation" className="lrg-btn lrg-btn--texte">
                    Ouvrir
                  </Link>
                </Ligne>
              </ul>
            </Section>

            <Section id="support" titre="Support">
              <ul className="lrg-carte">
                <Ligne libelle="Écrire à Omega" aide="Une question, un module qui ne fait pas ce qu'il devrait, une demande sur mesure : une personne de l'équipe vous répond.">
                  <Link href="/contact" className="lrg-btn lrg-btn--texte">
                    Écrire à Omega
                  </Link>
                </Ligne>
              </ul>
            </Section>
          </div>
        </div>
      </div>
    </div>
  );
}
