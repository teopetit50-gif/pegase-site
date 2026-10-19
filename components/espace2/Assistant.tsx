"use client";

/* L'assistant (07/10/2026, refait le même jour à la manière de Claude) —
   un panneau à droite depuis le bouton « Assistant ». Vide, il salue
   (« Bonjour Teo, comment puis-je vous aider aujourd'hui ? ») avec la
   barre de saisie au centre et quelques idées ; dès le premier message,
   la conversation se déroule et la barre descend en bas. Les anciennes
   conversations se retrouvent dans l'historique : elles sont gardées sur
   cet appareil (localStorage), jamais envoyées ailleurs qu'à l'API.
   Il parle à /api/assistant, qui appelle l'API Claude en flux. */

import { useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { ArrowUp, History, MessageSquare, Plus, Sparkles, Trash2, X } from "lucide-react";
import { Dialog, Modal, ModalOverlay } from "react-aria-components";
import { ecrireStockage, useStockage } from "./Collection";

type Message = { role: "user" | "assistant"; content: string };
type Conversation = { id: string; titre: string; maj: string; messages: Message[] };

const CLE = "espace2-assistant-conversations";
const IDEES = ["Rédiger une relance polie pour une facture impayée", "Résumer un texte que je vais coller", "Comment valider une facture dans l'espace ?"];

function lire(brut: string | null): Conversation[] {
  try {
    const v = JSON.parse(brut || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

const quand = (iso: string) => {
  const d = new Date(iso);
  const j = new Date();
  if (d.toDateString() === j.toDateString()) return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
};

export default function Assistant({ ouvert, changer, connecte, prenom }: { ouvert: boolean; changer: (v: boolean) => void; connecte: boolean; prenom?: string | null }) {
  const conversations = lire(useStockage(CLE));
  const [courante, setCourante] = useState<string | null>(null);
  const [vueHistorique, setVueHistorique] = useState(false);
  /* la conversation en cours d'écriture (la réponse arrive en flux) */
  const [enCours, setEnCours] = useState<Message[] | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [texte, setTexte] = useState("");
  const fil = useRef<HTMLDivElement>(null);

  const conv = conversations.find((c) => c.id === courante) ?? null;
  const messages = enCours ?? conv?.messages ?? [];
  const defiler = () => requestAnimationFrame(() => fil.current?.scrollTo({ top: fil.current.scrollHeight }));

  const enregistrer = (id: string, msgs: Message[]) => {
    const toutes = lire(localStorage.getItem(CLE));
    const titre = msgs.find((m) => m.role === "user")?.content.slice(0, 60) ?? "Conversation";
    const autre = toutes.filter((c) => c.id !== id);
    ecrireStockage(CLE, JSON.stringify([{ id, titre, maj: new Date().toISOString(), messages: msgs }, ...autre].slice(0, 50)));
  };

  const envoyer = async (question: string) => {
    const q = question.trim();
    if (!q || envoi || !connecte) return;
    const id = courante ?? crypto.randomUUID();
    if (!courante) setCourante(id);
    const historique: Message[] = [...messages, { role: "user", content: q }];
    setTexte("");
    setEnCours([...historique, { role: "assistant", content: "" }]);
    setEnvoi(true);
    defiler();
    let reponse = "";
    try {
      const rep = await fetch("/api/assistant", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: historique }) });
      if (!rep.ok || !rep.body) {
        reponse = ((await rep.json().catch(() => null)) as { erreur?: string } | null)?.erreur ?? "L'assistant n'a pas pu répondre.";
      } else {
        const lecteur = rep.body.getReader();
        const decodeur = new TextDecoder();
        for (;;) {
          const { done, value } = await lecteur.read();
          if (done) break;
          reponse += decodeur.decode(value, { stream: true });
          setEnCours([...historique, { role: "assistant", content: reponse }]);
          defiler();
        }
      }
    } catch {
      reponse = reponse || "Connexion perdue. Réessayez.";
    } finally {
      enregistrer(id, [...historique, { role: "assistant", content: reponse }]);
      setEnCours(null);
      setEnvoi(false);
    }
  };

  const nouvelle = () => {
    setCourante(null);
    setEnCours(null);
    setVueHistorique(false);
    setTexte("");
  };

  const supprimer = (id: string) => {
    ecrireStockage(CLE, JSON.stringify(conversations.filter((c) => c.id !== id)));
    if (id === courante) nouvelle();
  };

  const vide = messages.length === 0;

  const saisie = (
    <form
      className="v2-ia-saisie"
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        void envoyer(texte);
      }}
    >
      <textarea
        value={texte}
        onChange={(e) => setTexte(e.target.value)}
        rows={vide ? 3 : 1}
        maxLength={4000}
        disabled={!connecte}
        placeholder={connecte ? (vide ? "Posez votre question…" : "Répondre…") : "Connectez-vous pour utiliser l'assistant"}
        aria-label="Votre message"
        onKeyDown={(e: KeyboardEvent<HTMLTextAreaElement>) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            void envoyer(texte);
          }
        }}
      />
      <div className="v2-ia-saisie-pied">
        <span>{connecte ? "Entrée pour envoyer · Maj + Entrée pour aller à la ligne" : "Réservé aux comptes connectés"}</span>
        <button type="submit" className="v2-ia-envoyer" disabled={!connecte || envoi || !texte.trim()} aria-label="Envoyer">
          <ArrowUp width={16} height={16} />
        </button>
      </div>
    </form>
  );

  return (
    <ModalOverlay isOpen={ouvert} onOpenChange={changer} isDismissable className="v2-jetons v2-voile v2-voile--assistant">
      <Modal className="v2-assistant v2-ia">
        <Dialog className="v2-modale-dialogue v2-assistant-corps" aria-label="Assistant">
          <div className="v2-ia-tete">
            <button type="button" className="v2-val-bouton" aria-pressed={vueHistorique} onClick={() => setVueHistorique((v) => !v)}>
              <History width={16} height={16} aria-hidden="true" /> Historique
            </button>
            <button type="button" className="v2-val-bouton" onClick={nouvelle}>
              <Plus width={16} height={16} aria-hidden="true" /> Nouvelle
            </button>
            <button type="button" className="v2-val-bouton v2-val-bouton--icone" aria-label="Fermer l'assistant" onClick={() => changer(false)} style={{ marginLeft: "auto" }}>
              <X width={16} height={16} />
            </button>
          </div>

          {vueHistorique ? (
            <div className="v2-ia-historique">
              <p className="v2-ia-historique-titre">Vos conversations</p>
              {conversations.length ? (
                <ul>
                  {conversations.map((c) => (
                    <li key={c.id} data-actif={c.id === courante ? "" : undefined}>
                      <button
                        type="button"
                        onClick={() => {
                          setCourante(c.id);
                          setVueHistorique(false);
                          defiler();
                        }}
                      >
                        <MessageSquare width={16} height={16} aria-hidden="true" />
                        <span>{c.titre}</span>
                        <small>{quand(c.maj)}</small>
                      </button>
                      <button type="button" className="v2-ia-suppr" aria-label={`Supprimer « ${c.titre} »`} onClick={() => supprimer(c.id)}>
                        <Trash2 width={14} height={14} />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="v2-ia-gris">Aucune conversation pour l&apos;instant.</p>
              )}
              <p className="v2-ia-gris v2-ia-note">Gardées sur cet appareil uniquement.</p>
            </div>
          ) : vide ? (
            <div className="v2-ia-accueil">
              <Sparkles width={28} height={28} aria-hidden="true" className="v2-ia-etoile" />
              <h2>
                Bonjour{prenom ? ` ${prenom}` : ""},
                <br />
                comment puis-je vous aider aujourd&apos;hui&nbsp;?
              </h2>
              {saisie}
              <div className="v2-ia-idees">
                {IDEES.map((i) => (
                  <button key={i} type="button" className="v2-val-bouton" disabled={!connecte} onClick={() => void envoyer(i)}>
                    {i}
                  </button>
                ))}
              </div>
              <p className="v2-ia-gris v2-ia-note">L&apos;assistant ne voit pas vos factures ni vos clients.</p>
            </div>
          ) : (
            <>
              <div className="v2-ia-fil" ref={fil} aria-live="polite">
                {messages.map((m, i) =>
                  m.role === "user" ? (
                    <div key={i} className="v2-ia-moi">
                      {m.content}
                    </div>
                  ) : (
                    <div key={i} className="v2-ia-lui">
                      <Sparkles width={16} height={16} aria-hidden="true" className="v2-ia-etoile" />
                      <div>{m.content || (envoi ? <span className="v2-ia-points" aria-label="L'assistant écrit">●●●</span> : "")}</div>
                    </div>
                  ),
                )}
              </div>
              <div className="v2-ia-bas">{saisie}</div>
            </>
          )}
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}
