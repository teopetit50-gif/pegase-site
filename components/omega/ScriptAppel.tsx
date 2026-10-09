"use client";

/* ══════════════════════════════════════════════════════════════════════
   Le script de l'appel à froid, en quatre temps (09/10/2026) — d'après
   « Give me 22 mins, and I'll make your cold calls impossible to hang up
   on » (Micah Vu), ajouté à la Méthode de vente :

     1. Ouverture  : demander la permission (30 secondes), ton de pair,
        calme, lent, une pause en fin de phrase — jamais l'enthousiasme
        du vendeur ;
     2. Pitch      : « référence + nouveauté » — décrire le problème du
        métier mieux que les dix derniers qui ont appelé, puis ce qu'on
        fait, en une histoire, pas en « on aide les entreprises à… » ;
     3. Demande    : la demande douce — une question de logistique
        (« votre agenda est sous la main ? »), jamais « ça vous
        intéresse ? » ;
     4. Après le oui : les questions de qualification, une fois le
        rendez-vous calé — trois douleurs du métier, il choisit.

   Un temps à la fois, sur place (sélecteur en haut de la carte) : rien ne
   s'ajoute sous la page. Le pitch suit le premier moteur du secteur.
   ══════════════════════════════════════════════════════════════════════ */

import { useState } from "react";

type Pitch = { reference: string; solution: string; douleurs: [string, string, string] };

/* une histoire par moteur : le problème dit comme un pair du métier, puis ce qu'on fait */
export const PITCHS: Record<string, Pitch> = {
  CASHD: {
    reference: "Dans votre métier, le problème qui revient le plus, ce n'est pas de vendre : c'est que l'argent reste chez les clients. La facture part, personne n'a le temps de relancer, et passé 60 jours on n'ose plus appeler.",
    solution: "On installe un système qui relit vos factures et vos devis en attente et prépare chaque relance au bon moment, avec le bon ton. Vous validez d'un geste, rien ne part sans vous.",
    douleurs: ["des factures qui dépassent les 60 jours", "des devis envoyés restés sans réponse", "personne dans l'équipe pour relancer"],
  },
  REPUT: {
    reference: "Ce que j'entends partout dans votre métier : les demandes arrivent pendant que vous êtes occupé, par téléphone, message, mail. Celui qui répond en premier prend le client, et les autres ne rappellent pas.",
    solution: "On installe un système qui répond vite à chaque demande, avec vos mots, et qui demande un avis Google à chaque client content. Vous gardez la main sur tout ce qui part.",
    douleurs: ["des demandes perdues faute de réponse rapide", "pas assez d'avis Google", "des messages éparpillés entre téléphone, mail et réseaux"],
  },
  FILED: {
    reference: "Dans votre métier, la paperasse ne se voit pas, mais elle mange les soirées : les factures fournisseurs arrivent par mail, en photo, en papier, et à la fin du mois il faut tout retrouver pour le comptable.",
    solution: "On installe un système qui lit chaque facture fournisseur dès qu'elle arrive, la range au bon endroit et prépare l'envoi au comptable. Vous ne cherchez plus rien.",
    douleurs: ["des soirées passées à classer", "des pièces introuvables quand le comptable les demande", "des factures en double ou oubliées"],
  },
  OFFLOAD: {
    reference: "Le chiffre qu'on ne regarde jamais dans votre métier : les clients qui ont arrêté de commander sans rien dire. Personne ne les a perdus, ils sont juste partis.",
    solution: "On installe un système qui repère les clients qui ne commandent plus et leur écrit au bon moment, avec votre validation. Les plus fidèles reviennent souvent sur un simple message.",
    douleurs: ["des clients réguliers qui ne commandent plus", "aucune liste de qui relancer", "pas le temps de faire le tour des anciens clients"],
  },
  Daliro: {
    reference: "Sur les chantiers, ce qui coûte le plus, ce sont les travaux en plus : le client demande « tant que vous y êtes », on le fait, et au moment de facturer il ne s'en souvient plus.",
    solution: "On installe un outil qui fait signer chaque travail supplémentaire sur le chantier, en deux minutes, avec photo et prix. À la fin, tout est facturé, rien ne se discute.",
    douleurs: ["des travaux en plus jamais facturés", "des litiges en fin de chantier", "des avenants qui traînent sur papier"],
  },
  Tavaro: {
    reference: "En location, l'argent se perd à la restitution : une rayure, un plein pas fait, un jour de retard. Sans preuve sur le moment, on laisse passer pour éviter la dispute.",
    solution: "On installe un outil qui facture chaque restitution avec les preuves jointes, photos et relevés, au moment où le client rend. Plus de discussion, plus d'oubli.",
    douleurs: ["des dégâts non facturés faute de preuve", "des disputes à la restitution", "des frais oubliés (carburant, retard, nettoyage)"],
  },
  Lorani: {
    reference: "En agence, le piège, c'est l'écart entre les plans, le CCTP et la DPGF : une ligne qui manque, une quantité qui ne colle pas, et on le découvre sur le chantier.",
    solution: "On installe un outil qui croise les trois documents et vous liste les écarts avant l'appel d'offres. Vous corrigez avant, pas pendant le chantier.",
    douleurs: ["des écarts découverts trop tard", "des heures de relecture croisée", "des avenants qui viennent d'un oubli de pièce"],
  },
  Tamila: {
    reference: "En cabinet, ce qui prend le plus de temps n'est pas d'écrire : c'est de retrouver la bonne pièce pour chaque fait, dans des dossiers de plusieurs centaines de pages.",
    solution: "On installe un outil qui relie chaque fait du dossier à sa pièce, avec la page exacte. Vos conclusions se montent en une fraction du temps.",
    douleurs: ["des heures à chercher les pièces", "des bordereaux à refaire à chaque version", "un fait avancé sans sa pièce"],
  },
  Tiroma: {
    reference: "Au cabinet, un créneau annulé la veille est presque toujours perdu : le temps de rappeler la liste d'attente, la journée est passée.",
    solution: "On installe un outil qui propose le créneau libéré aux patients en attente dès l'annulation et le remplit tout seul. Les trous du planning se referment.",
    douleurs: ["des créneaux annulés jamais remplis", "une liste d'attente qu'on n'a pas le temps d'appeler", "des absents sans prévenir"],
  },
  Varelo: {
    reference: "Quand on dirige plusieurs sociétés, le problème n'est pas le manque de chiffres : c'est qu'ils sont dans dix outils différents, et qu'on n'a jamais la vue d'ensemble au bon moment.",
    solution: "On installe une page unique qui rassemble tout le groupe : trésorerie, encours, alertes. Vous la lisez chaque matin en deux minutes.",
    douleurs: ["des chiffres éparpillés entre les sociétés", "des tableaux refaits à la main chaque mois", "des alertes qui arrivent trop tard"],
  },
};

const ETAPES = ["Ouverture", "Pitch", "Demande", "Après le oui"] as const;
const CONSEILS = [
  "Ton de pair : calme, un peu plus lent que d'habitude, une pause en fin de phrase. Jamais « Comment allez-vous aujourd'hui ? ».",
  "Une histoire, pas une liste de bénéfices. S'il coupe : « Ah ? » et deux secondes de silence.",
  "Jamais « ça vous intéresse ? » : la seule réponse logique est non. Une question de logistique.",
  "Le moment où il vous fait le plus confiance : c'est maintenant qu'on qualifie. Note sa réponse ci-dessous.",
];

export default function ScriptAppel({ prenom, moteur }: { prenom: string; moteur?: string }) {
  const [etape, setEtape] = useState(0);
  const p = (moteur && PITCHS[moteur]) || PITCHS.CASHD;
  const textes = [
    `Bonjour${prenom ? ` ${prenom}` : ""}, c'est Teo, d'Omega. Je sais que je vous appelle à l'improviste… vous me laissez trente secondes pour vous dire pourquoi j'appelle, et vous me dites si ça vous parle ?`,
    `${p.reference} ${p.solution} C'est pour ça que j'appelle : je propose un audit de 30 minutes, gratuit, où on regarde vos vrais chiffres. Si ça ne vaut pas le coup chez vous, je vous le dirai.`,
    "Le plus simple, c'est qu'on se cale 30 minutes. Vous avez votre agenda sous la main ? … Vous êtes plutôt matin ou après-midi ?",
    `Parfait, c'est noté. Dernière chose avant de vous laisser : dans votre métier, on retrouve en général l'un de ces trois soucis : ${p.douleurs[0]}, ${p.douleurs[1]}, ou ${p.douleurs[2]}. Chez vous, c'est lequel le plus important en ce moment ?`,
  ];
  return (
    <div className="om-script">
      <div className="om-onglets om-script-etapes" role="tablist" aria-label="Temps de l'appel">
        {ETAPES.map((e, i) => (
          <button key={e} type="button" role="tab" className="om-onglet" aria-selected={i === etape} aria-current={i === etape ? "page" : undefined} onClick={() => setEtape(i)}>
            {i + 1}. {e}
          </button>
        ))}
      </div>
      <blockquote className="om-appel-script">« {textes[etape]} »</blockquote>
      <p className="om-script-conseil v2-gris">
        {CONSEILS[etape]}
        {etape < 3 ? (
          <button type="button" className="om-script-suite" onClick={() => setEtape(etape + 1)}>
            Suite : {ETAPES[etape + 1]} →
          </button>
        ) : null}
      </p>
    </div>
  );
}
