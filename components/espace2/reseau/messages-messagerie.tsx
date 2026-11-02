"use client";

/* ══════════════════════════════════════════════════════════════════════
   Réseau Omega › Messages — le chat entre patrons (02/11/2026)

   Composition de Slack (la colonne des conversations, la conversation, le
   fil à droite, le composeur en bas), habillée ENTIÈREMENT avec le système
   d'Espace 2 : jetons --v2-*, v2-btn, menus de ui.tsx, police d'Espace 2,
   rayons de 6 / 8 px, filets sans ombre. Le thème sombre suit.

   « Vous » est l'organisation connectée (OrganisationContexte, « CAMA »
   en données d'exemple), jamais un des 12 membres.

   L'adresse porte la conversation : ?salon=<id> ou ?a=<slug> (message
   privé entre vous et ce membre, ouvert même sans échange encore). Les
   changements passent par history.pushState, que le routeur de Next
   suit (useSearchParams) : le bouton « précédent » du navigateur marche.
   Sous 1024 px, la liste d'abord, puis la conversation en plein écran,
   avec un retour qui remet l'adresse à jour.

   Exemple ou réel : en « Données d'exemple », les membres fictifs et les
   conversations de messages-donnees.ts, et l'envoi reste dans l'état de la
   page. En « Base réelle », un état vide honnête : le réseau n'a encore
   aucune table (docs/reseau-espace2/schema-messages.sql).
   ══════════════════════════════════════════════════════════════════════ */

import "./messages.css";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { MessagesSquare } from "lucide-react";
import { useSource } from "@/components/espace/source";
import { useOrganisation } from "../organisation";
import { useAujourdhui } from "../horloge";
import { Vide } from "../ui";
import { reseauEnExemple } from "./source";
import { MEMBRES } from "./membres";
import { PRIVES, SALONS, VOUS, mentionsVous, type Message } from "./messages-donnees";
import { heureMaintenant } from "./messages-commun";
import ListeConversations from "./messages-liste";
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
      <div className="v2-page v2-page--etroite">
        <h1 className="v2-sr">Messages du réseau</h1>
        <Vide icone={<MessagesSquare width={20} height={20} strokeWidth={1.6} />} titre="Le réseau ouvre bientôt">
          Les messages entre les entreprises clientes d&apos;Omega arriveront avec l&apos;ouverture du réseau. Aucune conversation n&apos;existe encore dans votre base : il n&apos;y a rien à afficher ici pour l&apos;instant.
        </Vide>
      </div>
    );
  return <MessagerieExemple />;
}

function MessagerieExemple() {
  const { nom: nomVous } = useOrganisation();
  const minuit = useAujourdhui();
  const chemin = usePathname() ?? "/espace2/reseau/messages";
  const params = useSearchParams();
  const large = useSyncExternalStore(abonnerLarge, lireLarge, () => true);

  /* ——— les conversations, et ce qui a été lu, envoyé, réagi pendant la visite ——— */
  const [messages, setMessages] = useState<Record<string, Message[]>>(() => ({
    ...Object.fromEntries(SALONS.map((s) => [`s:${s.id}`, s.messages])),
    ...Object.fromEntries(PRIVES.map((p) => [`p:${p.slug}`, p.messages])),
  }));
  const [lus, setLus] = useState<Record<string, true>>({});
  const [ajoutes, setAjoutes] = useState<string[]>([]);
  const nonLusDepart = useMemo(() => new Map<string, number>([...SALONS.map((s) => [`s:${s.id}`, s.nonLus] as const), ...PRIVES.map((p) => [`p:${p.slug}`, p.nonLus] as const)]), []);
  const etat = useCallback(
    (cle: string) => {
      if (lus[cle]) return { cle, nonLus: 0, mentions: 0 };
      const n = nonLusDepart.get(cle) ?? 0;
      return { cle, nonLus: n, mentions: mentionsVous(messages[cle] ?? [], n) };
    },
    [lus, nonLusDepart, messages],
  );

  /* ——— la conversation choisie, lue dans l'adresse ——— */
  const a = params.get("a");
  const salonParam = params.get("salon");
  const choisie = a && MEMBRES.some((m) => m.slug === a) ? `p:${a}` : salonParam && SALONS.some((s) => s.id === salonParam) ? `s:${salonParam}` : null;
  /* sur un grand écran, sans choix, le premier salon de l'île est ouvert ; sur un petit, la liste */
  const active = choisie ?? (large ? "s:guadeloupe" : null);

  /* en ouvrant une conversation : on retient combien étaient nouveaux (le
     filet « Nouveaux »), puis elle passe en lue ; le fil ouvert se ferme */
  const [vue, setVue] = useState<string | null>(null);
  const [nouveaux, setNouveaux] = useState(0);
  const [fil, setFil] = useState<string | null>(null);
  if (vue !== active) {
    setVue(active);
    setFil(null);
    if (active) {
      setNouveaux(etat(active).nonLus);
      if (!lus[active]) setLus((l) => ({ ...l, [active]: true }));
      if (active.startsWith("p:") && !PRIVES.some((p) => `p:${p.slug}` === active) && !ajoutes.includes(active.slice(2))) setAjoutes((x) => [active.slice(2), ...x]);
    }
  }

  const prives = [...ajoutes, ...PRIVES.map((p) => p.slug).filter((s) => !ajoutes.includes(s))];

  const ouvrir = (cle: string) => {
    const [genre, id] = [cle.slice(0, 1), cle.slice(2)];
    window.history.pushState(null, "", `${chemin}?${genre === "p" ? "a" : "salon"}=${encodeURIComponent(id)}`);
  };
  const retour = () => window.history.pushState(null, "", chemin);

  /* ——— les gestes, en état local (données d'exemple) ——— */
  const nouvelId = () => `n${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const modifier = (cle: string, f: (liste: Message[]) => Message[]) => setMessages((t) => ({ ...t, [cle]: f(t[cle] ?? []) }));
  const actions = {
    envoyer: (texte: string) => {
      if (!active) return;
      modifier(active, (l) => [...l, { id: nouvelId(), auteur: VOUS, jour: 0, heure: heureMaintenant(), texte }]);
      setNouveaux(0);
    },
    repondre: (id: string, texte: string) => {
      if (!active) return;
      modifier(active, (l) => l.map((x) => (x.id === id ? { ...x, reponses: [...(x.reponses ?? []), { id: nouvelId(), auteur: VOUS, jour: 0, heure: heureMaintenant(), texte }] } : x)));
    },
    reagir: (id: string, emoji: string) => {
      if (!active) return;
      const basculer = (x: Message): Message => {
        if (x.id !== id) return x.reponses ? { ...x, reponses: x.reponses.map(basculer) } : x;
        const rs = x.reactions ?? [];
        const r = rs.find((y) => y.emoji === emoji);
        const suivantes = !r
          ? [...rs, { emoji, qui: [VOUS] }]
          : rs
              .map((y) => (y.emoji !== emoji ? y : { ...y, qui: y.qui.includes(VOUS) ? y.qui.filter((q) => q !== VOUS) : [...y.qui, VOUS] }))
              .filter((y) => y.qui.length);
        return { ...x, reactions: suivantes };
      };
      modifier(active, (l) => l.map(basculer));
    },
    ouvrirFil: (id: string) => setFil(id),
  };

  const conv: Ouverte | null = active
    ? active.startsWith("s:")
      ? (() => {
          const salon = SALONS.find((s) => `s:${s.id}` === active)!;
          return { cle: active, salon, messages: messages[active] ?? [], membres: salon.membres };
        })()
      : { cle: active, slug: active.slice(2), messages: messages[active] ?? [], membres: [active.slice(2)] }
    : null;

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
    <div className="ms" ref={racine} data-ouverte={choisie ? "" : undefined} data-fil={fil ? "" : undefined}>
      <h1 className="v2-sr">Messages du réseau</h1>
      <ListeConversations salons={SALONS} prives={prives} etat={etat} active={active} ouvrir={ouvrir} nomVous={nomVous} />
      {conv ? (
        <Conversation key={conv.cle} conv={conv} nomVous={nomVous} minuit={minuit} nouveaux={nouveaux} fil={fil} fermerFil={() => setFil(null)} retour={retour} actions={actions} />
      ) : null}
    </div>
  );
}
