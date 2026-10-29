import type { Metadata } from "next";
import Link from "next/link";
import { Inter } from "next/font/google";
import { MODULES, MODULES_PRINCIPAUX, ONGLETS_ORGANISATION } from "@/components/espace2/modules";
import Coquille, { type Entree, type Groupe } from "./Coquille";
import Lecteur from "./Lecteur";
import "./formation.css";

/* ══════════════════════════════════════════════════════════════════════
   /formation — la formation de l'espace client (29/10/2026)

   Demande de Teo : « la page où il y a du texte et une vidéo qu'on peut
   lancer pour débuter avec le SaaS — retrouve-la et fais exactement la
   même ». Retrouvée : le Start Guide de la documentation Linear
   (linear.app/docs/start-guide), vidéo « Intro to Linear » en tête.
   Relevé au style calculé à 1440, 1024 et 390 ; les valeurs sont en tête
   de formation.css.

   La vidéo (public/formation/decouvrir-omega.mp4) est PROVISOIRE : une
   suite de cartes titrées tirée par outils/video-formation.py, sans
   voix. Pour la
   remplacer, déposer le nouveau fichier sous le même nom (et son image
   d'affiche, decouvrir-omega.jpg, 1280 × 720) — rien d'autre à toucher.

   La navigation de gauche est tirée de components/espace2/modules.ts :
   chaque lien mène à l'écran réel de /espace2, et un écran ajouté là-bas
   apparaît ici sans retouche.
   ══════════════════════════════════════════════════════════════════════ */

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: "Guide de démarrage | Formation Omega",
  description: "Prendre en main l'espace client Omega : la vidéo de découverte, le premier accès, et ce qu'il faut regarder chaque jour.",
  /* tant que la vidéo est provisoire */
  robots: { index: false, follow: false },
};

const ORGANISATION = (libelles: string[]) =>
  ONGLETS_ORGANISATION.filter((o) => libelles.includes(o.libelle)).map(({ libelle, href }) => ({ libelle, href }));

const PRINCIPAUX = MODULES_PRINCIPAUX.map((cle) => MODULES.find((m) => m.cle === cle)!);

const GROUPES: Groupe[] = [
  {
    titre: "Bien démarrer",
    ouvert: true,
    liens: [
      { libelle: "Guide de démarrage", href: "/formation", icone: "guide" },
      { libelle: "Vue d'ensemble", href: "/espace2", icone: "vue" },
      { libelle: "Point du matin", href: "/espace2/point", icone: "point" },
    ],
  },
  { titre: "Le quotidien", liens: ORGANISATION(["À valider", "Demandes reçues", "Activité", "Tâches", "Notes", "Appels"]) },
  ...PRINCIPAUX.map((m) => ({ titre: m.libelle, liens: m.onglets.map(({ libelle, href }) => ({ libelle, href })) })),
  { titre: "Votre organisation", liens: ORGANISATION(["Entreprises", "Contacts", "Automatisations", "Utilisation", "Réglages", "Équipe"]) },
];

/* le sommaire de droite : un titre ajouté à l'article s'ajoute ici, avec le même id */
const SOMMAIRE: Entree[] = [
  { id: "vue-ensemble", texte: "Vue d'ensemble et démo", niveau: 2 },
  { id: "ouvrir", texte: "Ouvrir votre espace", niveau: 2 },
  { id: "meilleur", texte: "Tirer le meilleur d'Omega", niveau: 3 },
  { id: "modules", texte: "Les modules", niveau: 3 },
  { id: "garde-fous", texte: "Ce qu'Omega ne fait jamais sans vous", niveau: 3 },
];

export default function PageFormation() {
  return (
    <Coquille groupes={GROUPES} sommaire={SOMMAIRE} police={inter.variable} rubrique="Bien démarrer" titre="Guide de démarrage">
      <h1 className="fm-h1">Guide de démarrage</h1>
      <div className="fm-espace" aria-hidden="true" />
      <p>
        Omega relance vos impayés, répond à vos demandes et classe vos factures, et c&apos;est toujours vous qui validez. Ce guide
        vous mène de votre premier accès à votre première validation.
      </p>

      <Lecteur src="/formation/decouvrir-omega.mp4" affiche="/formation/decouvrir-omega.jpg" titre="Découvrir Omega" />

      <h2 id="vue-ensemble">Vue d&apos;ensemble et démo</h2>
      <p>
        Pour découvrir l&apos;espace avant d&apos;y entrer avec vos données, parcourez notre <Link href="/espace2">espace d&apos;exemple</Link> :
        une entreprise fictive, avec ses relances, ses factures et ses demandes, telles que vous les verrez.
      </p>
      <p>
        Si vous préférez qu&apos;on vous le montre, <Link href="/reserver">réservez un appel</Link> : nous faisons le tour de l&apos;espace
        avec vous et répondons à vos questions.
      </p>

      <h2 id="ouvrir">Ouvrir votre espace</h2>
      <p>
        Une fois le contrat signé, vous recevez par e-mail votre <Link href="/espace2">lien de connexion</Link>. Au premier passage,
        quatre questions règlent l&apos;espace : votre entreprise, votre métier, votre messagerie et votre équipe.
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
    </Coquille>
  );
}
