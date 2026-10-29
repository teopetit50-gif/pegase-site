import type { Metadata } from "next";
import Link from "next/link";
import { MODULES, MODULES_PRINCIPAUX } from "@/components/espace2/modules";
import Lecteur from "@/components/espace2/formation/Lecteur";
import Sommaire, { type Entree } from "@/components/espace2/formation/Sommaire";
import "@/components/espace2/formation/formation.css";

/* ══════════════════════════════════════════════════════════════════════
   /espace2/formation — le guide de démarrage de l'espace client (29/10/2026)

   Demande de Teo : « la page d'un SaaS où il y a du texte et une vidéo
   qu'on peut lancer pour débuter — fais exactement la même ». Retrouvée :
   le Start Guide de la documentation Linear (linear.app/docs/start-guide),
   vidéo « Intro to Linear » en tête. D'abord livrée seule sous /formation,
   avec la barre latérale de Linear ; le même jour, Teo l'a voulue DANS
   l'espace client : elle vit ici, dans la coquille de /espace2, et
   /formation y renvoie. Relevé et écarts : components/espace2/formation/
   formation.css.

   La vidéo (public/formation/decouvrir-omega.mp4) est PROVISOIRE : une
   suite de cartes titrées tirée par outils/video-formation.py, sans voix.
   Pour la remplacer, déposer le nouveau fichier sous le même nom (et son
   image d'affiche, decouvrir-omega.jpg, 1280 × 720) — rien d'autre à
   toucher.
   ══════════════════════════════════════════════════════════════════════ */

export const metadata: Metadata = {
  title: "Formation",
};

const PRINCIPAUX = MODULES_PRINCIPAUX.map((cle) => MODULES.find((m) => m.cle === cle)!);

/* le sommaire de droite : un titre ajouté à l'article s'ajoute ici, avec le même id */
const SOMMAIRE: Entree[] = [
  { id: "vue-ensemble", texte: "Vue d'ensemble et démo", niveau: 2 },
  { id: "ouvrir", texte: "Ouvrir votre espace", niveau: 2 },
  { id: "meilleur", texte: "Tirer le meilleur d'Omega", niveau: 3 },
  { id: "modules", texte: "Les modules", niveau: 3 },
  { id: "garde-fous", texte: "Ce qu'Omega ne fait jamais sans vous", niveau: 3 },
];

export default function Page() {
  return (
    <div className="fm">
      <article className="fm-article">
        <h1 className="fm-h1">Guide de démarrage</h1>
        <p className="fm-intro">
          Omega relance vos impayés, répond à vos demandes et classe vos factures, et c&apos;est toujours vous qui validez. Ce guide
          vous mène de votre premier accès à votre première validation.
        </p>

        <Lecteur src="/formation/decouvrir-omega.mp4" affiche="/formation/decouvrir-omega.jpg" titre="Découvrir Omega" duree={38} />

        <h2 id="vue-ensemble">Vue d&apos;ensemble et démo</h2>
        <p>
          Commencez par la <Link href="/espace2">vue d&apos;ensemble</Link> : tout ce qui demande votre attention aujourd&apos;hui y
          tient sur un écran. Sans compte, l&apos;espace montre une entreprise fictive, telle que vous verrez la vôtre.
        </p>
        <p>
          Si vous préférez qu&apos;on vous le montre, <Link href="/reserver">réservez un appel</Link> : nous faisons le tour de
          l&apos;espace avec vous et répondons à vos questions.
        </p>

        <h2 id="ouvrir">Ouvrir votre espace</h2>
        <p>
          Une fois le contrat signé, vous recevez par e-mail votre lien de connexion. Au premier passage, quatre questions règlent
          l&apos;espace : votre entreprise, votre métier, votre messagerie et votre équipe.
        </p>

        <h3 id="meilleur">Tirer le meilleur d&apos;Omega</h3>
        <p className="fm-sous">Le dirigeant</p>
        <ul>
          <li>
            <Link href="/espace2/point">Lire le point du matin</Link>
          </li>
          <li>
            <Link href="/espace2/validations">Valider ce qui attend votre accord</Link>
          </li>
          <li>
            <Link href="/espace2/activite">Suivre l&apos;activité de la semaine</Link>
          </li>
        </ul>
        <p className="fm-sous">L&apos;équipe</p>
        <ul>
          <li>
            <Link href="/espace2/equipe">Inviter vos collaborateurs</Link>
          </li>
        </ul>

        <h3 id="modules">Les modules</h3>
        <ul className="fm-liste-large">
          {PRINCIPAUX.map((m) => (
            <li key={m.cle}>
              <Link href={`/espace2/${m.cle}`}>{m.nom}</Link> : {m.description.charAt(0).toLowerCase() + m.description.slice(1)}
            </li>
          ))}
        </ul>

        <h3 id="garde-fous">Ce qu&apos;Omega ne fait jamais sans vous</h3>
        <p>
          Aucun message engageant ne part sans votre accord, et un seul réglage coupe tous les envois. Tout se règle dans vos{" "}
          <Link href="/espace2/reglages">réglages</Link> ; pour le reste, <Link href="/contact">écrivez-nous</Link>.
        </p>

        <Link href="/espace2" className="fm-suivant">
          <span className="fm-suivant-sur">
            Suivant
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
              <path d="M6 3.5 10.5 8 6 12.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="fm-suivant-titre">Vue d&apos;ensemble de l&apos;espace</span>
        </Link>
      </article>

      <Sommaire entrees={SOMMAIRE} />
    </div>
  );
}
