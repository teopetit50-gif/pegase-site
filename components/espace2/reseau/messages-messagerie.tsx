"use client";

/* ══════════════════════════════════════════════════════════════════════
   Réseau Omega › Messages — la messagerie entre patrons
   (reprise du 02/11/2026, demande de Teo : plus de Slack)

   RÉFÉRENCE (pages publiques, sans compte ni connexion) : Zulip.
     · https://chat.zulip.org/ : la vue publique de la communauté Zulip,
       sa vue d'arrivée « Recent conversations » et la barre de gauche
       (vues, dossiers de canaux, canaux, sujets du canal ouvert) ;
     · https://chat.zulip.org/#narrow/channel/101-design : un canal et un
       de ses sujets (barre « canal › sujet », messages, composeur) ;
     · https://zulip.com/help/direct-messages,
       https://zulip.com/help/recent-conversations,
       https://zulip.com/help/introduction-to-topics,
       https://zulip.com/help/emoji-reactions,
       https://zulip.com/help/mention-a-user-or-group,
       https://zulip.com/help/status-and-availability : les messages
       privés (cachés dans la vue publique), les filtres des conversations
       récentes, les sujets, les réactions, les mentions, la présence.
   Pourquoi Zulip : une conversation y est un SUJET dans un salon, ou un
   message privé. Des salons par île et par secteur où chaque demande
   ouvre son propre sujet, c'est exactement le besoin du réseau.

   HABILLAGE : celui des pages des cinq moteurs, kit components/espace2/lin/
   (lin.css, jetons --lin-*) : la boîte des moteurs (REPUT › Base de
   connaissances, CASHD › Débiteurs et relances, FILED › Boîte de
   réception) : liste de 400 à gauche, fiche ouverte à droite au gabarit
   d'un ticket Linear. Sombre et clair par les jetons du kit.

   « Vous » est l'organisation connectée (OrganisationContexte, « CAMA »
   en données d'exemple), jamais un des 12 membres.

   L'ADRESSE porte la vue : ?vue=recentes, ?salon=<id>,
   ?salon=<id>&sujet=<id>, ?a=<slug> (message privé entre vous et ce
   membre, ouvert même sans échange). Les changements passent par
   history.pushState, que le routeur de Next suit (useSearchParams) :
   « précédent » marche. Sans paramètre : les conversations récentes sur
   un grand écran, la liste seule sous 1024 px ; sous 1024 px, une vue
   ouverte prend tout l'écran, et sa flèche ramène à la liste en remettant
   l'adresse à jour.

   EXEMPLE OU RÉEL : en « Données d'exemple », les conversations de
   messages-donnees.ts, l'envoi en état local (messages-etat.ts). En
   « Base réelle », l'état vide commun du réseau (reseau-vide.tsx).
   ══════════════════════════════════════════════════════════════════════ */

import "../lin/lin.css";
import "./messages.css";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { MessagesSquare } from "lucide-react";
import { useSource } from "@/components/espace/source";
import { useOrganisation } from "../organisation";
import { useAujourdhui } from "../horloge";
import { reseauEnExemple } from "./source";
import { ReseauVide } from "./reseau-vide";
import { MEMBRES } from "./membres";
import { SALONS } from "./messages-donnees";
import { RACINE_MESSAGES } from "./messages-commun";
import { cleSujet, clePrive, useMessagerie } from "./messages-etat";
import ListeConversations, { type Ici } from "./messages-liste";
import Recentes from "./messages-recentes";
import Conversation, { type Ouverte } from "./messages-conversation";

const LARGE = "(min-width: 1024px)";
const abonnerLarge = (f: () => void) => {
  const q = window.matchMedia(LARGE);
  q.addEventListener("change", f);
  return () => q.removeEventListener("change", f);
};
const lireLarge = () => window.matchMedia(LARGE).matches;

export default function Messagerie() {
  const { source } = useSource();
  if (!reseauEnExemple(source))
    return (
      <div className="lin ms">
        <header className="lin-tete">
          <h1 className="lin-tete-titre">Messages</h1>
        </header>
        <div className="ms-ferme">
          <ReseauVide icone={MessagesSquare} page="Les messages privés et les salons par île et par secteur y arriveront avec les premiers membres." />
        </div>
      </div>
    );
  return <MessagerieExemple />;
}

function MessagerieExemple() {
  const { nom: nomVous } = useOrganisation();
  const minuit = useAujourdhui();
  const chemin = usePathname() ?? RACINE_MESSAGES;
  const params = useSearchParams();
  const large = useSyncExternalStore(abonnerLarge, lireLarge, () => true);
  const etat = useMessagerie();

  /* ——— la vue, lue dans l'adresse ——— */
  const a = params.get("a");
  const salonId = params.get("salon");
  const sujetId = params.get("sujet");
  const salon = SALONS.find((s) => s.id === salonId);
  const sujets = salon ? etat.sujets(salon) : [];
  const sujet = sujets.find((t) => t.id === sujetId);
  const choisie: Ici =
    a && MEMBRES.some((m) => m.slug === a)
      ? { vue: "prive", slug: a }
      : salon && sujet
        ? { vue: "sujet", salon: salon.id, sujet: sujet.id }
        : salon
          ? { vue: "salon", salon: salon.id }
          : params.get("vue") === "recentes"
            ? { vue: "recentes" }
            : { vue: null };
  /* sur un grand écran, sans choix : les conversations récentes, comme la vue d'arrivée de Zulip */
  const ici: Ici = choisie.vue === null && large ? { vue: "recentes" } : choisie;
  const cle = ici.vue === "sujet" ? cleSujet(ici.salon!, ici.sujet!) : ici.vue === "prive" ? clePrive(ici.slug!) : null;

  /* en ouvrant une conversation : on retient combien étaient nouveaux (le
     filet « Nouveaux »), puis elle passe en lue ; un privé commencé par
     ?a= rejoint la liste */
  const [vue, setVue] = useState<string | null>(null);
  const [nouveaux, setNouveaux] = useState(0);
  if (vue !== cle) {
    setVue(cle);
    setNouveaux(cle ? etat.nonLus(cle) : 0);
    if (cle) etat.marquerLu(cle);
    if (ici.vue === "prive") etat.ouvrirPrive(ici.slug!);
  }

  const aller = (href: string) => window.history.pushState(null, "", `${chemin}${href}`);
  const retour = () => window.history.pushState(null, "", chemin);

  const totalNonLus = etat.tousLesSujets.reduce((n, t) => n + t.nonLus, 0) + etat.prives.reduce((n, p) => n + p.nonLus, 0);

  const conv: Ouverte | null =
    ici.vue === "sujet" && salon && sujet
      ? { genre: "sujet", cle: cle!, salon, sujet, autres: sujets.filter((t) => t.id !== sujet.id) }
      : ici.vue === "salon" && salon
        ? { genre: "salon", salon, sujets }
        : ici.vue === "prive"
          ? { genre: "prive", cle: cle!, slug: ici.slug!, messages: etat.messagesDe(cle!) }
          : null;

  const actions = {
    aller,
    retour,
    envoyer: (texte: string) => {
      if (!cle) return;
      etat.envoyer(cle, texte);
      setNouveaux(0);
    },
    creerSujet: (titre: string, texte: string) => {
      if (!salon) return;
      const id = etat.creerSujet(salon.id, titre, texte);
      aller(`?salon=${salon.id}&sujet=${id}`);
    },
    reagir: (id: string, emoji: string) => cle && etat.reagir(cle, id, emoji),
  };

  /* la messagerie occupe la hauteur de la fenêtre sous ce qui la précède
     (la barre du haut, et le ruban « Données d'exemple » qui passe à la
     ligne sur mobile) : seules ses colonnes défilent */
  const racine = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = racine.current;
    if (!el) return;
    const mesurer = () => el.style.setProperty("--ms-haut", `${Math.max(0, el.getBoundingClientRect().top + window.scrollY)}px`);
    mesurer();
    const obs = new ResizeObserver(mesurer);
    const haut = document.querySelector(".v2-haut");
    if (haut) obs.observe(haut);
    window.addEventListener("resize", mesurer);
    return () => {
      obs.disconnect();
      window.removeEventListener("resize", mesurer);
    };
  }, []);

  return (
    <div className="lin ms" ref={racine} data-ouverte={choisie.vue ? "" : undefined}>
      <div className="lin-boite ms-boite">
        <ListeConversations etat={etat} ici={ici} aller={aller} nomVous={nomVous} minuit={minuit} totalNonLus={totalNonLus} />
        {ici.vue === "recentes" ? (
          <Recentes etat={etat} aller={aller} retour={retour} nomVous={nomVous} minuit={minuit} />
        ) : conv ? (
          <Conversation key={conv.genre === "salon" ? `s:${conv.salon.id}` : conv.cle} conv={conv} nomVous={nomVous} minuit={minuit} nouveaux={nouveaux} actions={actions} />
        ) : null}
      </div>
    </div>
  );
}
