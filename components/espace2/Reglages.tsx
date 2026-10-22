"use client";

/* Les réglages — la page Settings › General de Supabase, au 1:1 (22/10/2026).

   06–07/10 : page « avec barre latérale », rubriques à la Attio.
   22/10 : demande de Teo, recopier exactement les réglages de Supabase :
   conteneur de 768 px, titre et description, une section par sujet (titre
   Manrope 18 px, description, carte), dans la carte des lignes « libellé
   et aide à gauche, commande à droite », le pied aligné à droite. Les
   rubriques ne sont plus dans la page : le volet de navigation les porte
   déjà (Général, Accessibilité, Données, Équipe). La section « Export et
   effacement » garde l'écran Réglages de /espace (A3 : journal, export
   complet, préparer l'effacement), repris tel quel. Gabarit : ./sb. */

import Link from "next/link";
import { useSource } from "@/components/espace/source";
import EcranReglages from "@/components/espace/reglages/EcranReglages";
import "@/components/espace/espace.css";
import "./habillage.css";
import "./sb/sb.css";
import { Interrupteur, Note } from "./ui";
import { changerCalme, useCalme } from "./mouvement";
import { useToast } from "./Toasts";

function Section({ id, titre, description, children }: { id: string; titre: string; description?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="sb-reglages-section" aria-labelledby={`t-${id}`}>
      <header>
        <h2 id={`t-${id}`}>{titre}</h2>
        {description ? <p>{description}</p> : null}
      </header>
      {children}
    </section>
  );
}

function Ligne({ libelle, aide, children }: { libelle: string; aide?: string; children: React.ReactNode }) {
  return (
    <div className="sb-champ-ligne">
      <div className="sb-champ-libelle">
        <strong>{libelle}</strong>
        {aide ? <span>{aide}</span> : null}
      </div>
      <div className="sb-champ-commande">{children}</div>
    </div>
  );
}

export default function Reglages() {
  const toast = useToast();
  const { source, changer, connecte } = useSource();
  const calme = useCalme();

  return (
    <div className="sb-reglages v2-arrivee">
      <div className="sb-liste-tete" style={{ alignItems: "flex-start" }}>
        <div>
          <h1 className="sb-titre">Réglages</h1>
          <p className="sb-description">L&apos;affichage de l&apos;espace, vos données, les accès de l&apos;équipe et l&apos;assistance.</p>
        </div>
      </div>

      <Section id="accessibilite" titre="Accessibilité" description="Le confort de lecture, pour cet appareil.">
        <div className="sb-carte-form">
          <Ligne libelle="Réduire les animations" aide="Coupe les animations et les transitions de l'espace : les écrans changent d'un coup, sans mouvement.">
            <Interrupteur
              actif={calme}
              onChange={(v) => {
                changerCalme(v);
                toast(v ? "Animations réduites" : "Animations rétablies", "vert");
              }}
            >
              <span className="v2-sr">Réduire les animations</span>
            </Interrupteur>
          </Ligne>
          <div className="sb-carte-form-pied">
            <span>Enregistré sur cet appareil.</span>
          </div>
        </div>
      </Section>

      <Section id="donnees" titre="Données affichées" description="L'entreprise d'exemple, ou vos propres données lues dans la base sous vos droits.">
        <div className="sb-carte-form">
          <Ligne libelle="Afficher la base réelle" aide="Les écrans montrent soit l'entreprise d'exemple (Atelier Bertin), soit vos propres données.">
            <Interrupteur
              actif={source === "reelle"}
              desactive={!connecte}
              onChange={(v) => {
                changer(v ? "reelle" : "exemple");
                toast(v ? "Base réelle affichée" : "Données d'exemple affichées");
              }}
            >
              <span className="v2-sr">Afficher la base réelle</span>
            </Interrupteur>
          </Ligne>
          {!connecte ? <Note teinte="bleu">Vous n&apos;êtes pas connecté : seul l&apos;exemple est visible. Connectez-vous depuis le cockpit pour voir vos données.</Note> : null}
        </div>
      </Section>

      <Section id="donnees-export" titre="Export et effacement" description="Le journal de tout ce qui a été fait, l'export complet en un clic, et la sortie.">
        <div className="resa esp">
          <EcranReglages />
        </div>
      </Section>

      <Section id="compte" titre="Membres et équipe" description="Chaque personne a son propre accès, avec son adresse e-mail : on ne partage pas un mot de passe.">
        <div className="sb-carte-form">
          <Ligne libelle="Ouvrir un accès" aide="Pour ouvrir un accès à un collègue, écrivez à Omega.">
            <Link href="/contact" className="v2-btn">
              Demander un accès
            </Link>
          </Ligne>
          <Ligne libelle="Délégations et règles de validation" aide="Elles se règlent depuis la file « À valider ».">
            <Link href="/espace2/validations" className="v2-btn">
              Ouvrir « À valider »
            </Link>
          </Ligne>
          <Ligne libelle="L'équipe" aide="Qui a accès à l'espace, et avec quel rôle.">
            <Link href="/espace2/equipe" className="v2-btn">
              Voir l&apos;équipe
            </Link>
          </Ligne>
        </div>
      </Section>

      <Section id="utilisation" titre="Utilisation" description="Le volume traité par vos modules, module par module.">
        <div className="sb-carte-form">
          <Ligne libelle="Utilisation de l'espace" aide="Documents, montants, demandes et décisions sur la période.">
            <Link href="/espace2/utilisation" className="v2-btn">
              Ouvrir
            </Link>
          </Ligne>
        </div>
      </Section>

      <Section id="support" titre="Support" description="Une question, un module qui ne fait pas ce qu'il devrait, une demande sur mesure.">
        <div className="sb-carte-form">
          <Ligne libelle="Écrire à Omega" aide="Une personne de l'équipe vous répond.">
            <Link href="/contact" className="v2-btn">
              Écrire à Omega
            </Link>
          </Ligne>
        </div>
      </Section>
    </div>
  );
}
