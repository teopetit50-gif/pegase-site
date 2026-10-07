"use client";

/* Le panneau de l'assistant (07/10/2026) — s'ouvre à droite depuis le
   bouton « Assistant » de la barre du haut. Il parle à /api/assistant,
   qui appelle l'API Claude et renvoie la réponse en flux. La conversation
   ne vit que dans ce panneau : elle disparaît au rechargement. */

import { useRef, useState, type FormEvent } from "react";
import { Sparkles, X } from "lucide-react";
import { Dialog, Modal, ModalOverlay } from "react-aria-components";
import { Note } from "./ui";

type Message = { role: "user" | "assistant"; content: string };

export default function Assistant({ ouvert, changer, connecte }: { ouvert: boolean; changer: (v: boolean) => void; connecte: boolean }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [enCours, setEnCours] = useState(false);
  const fil = useRef<HTMLDivElement>(null);

  const defiler = () => requestAnimationFrame(() => fil.current?.scrollTo({ top: fil.current.scrollHeight }));

  const envoyer = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const champ = e.currentTarget.elements.namedItem("question") as HTMLTextAreaElement;
    const texte = champ.value.trim();
    if (!texte || enCours) return;
    champ.value = "";
    const historique: Message[] = [...messages, { role: "user", content: texte }];
    setMessages([...historique, { role: "assistant", content: "" }]);
    setEnCours(true);
    defiler();
    try {
      const rep = await fetch("/api/assistant", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: historique }) });
      if (!rep.ok || !rep.body) {
        const erreur = ((await rep.json().catch(() => null)) as { erreur?: string } | null)?.erreur ?? "L'assistant n'a pas pu répondre.";
        setMessages([...historique, { role: "assistant", content: erreur }]);
        return;
      }
      const lecteur = rep.body.getReader();
      const decodeur = new TextDecoder();
      let reponse = "";
      for (;;) {
        const { done, value } = await lecteur.read();
        if (done) break;
        reponse += decodeur.decode(value, { stream: true });
        setMessages([...historique, { role: "assistant", content: reponse }]);
        defiler();
      }
    } catch {
      setMessages([...historique, { role: "assistant", content: "Connexion perdue. Réessayez." }]);
    } finally {
      setEnCours(false);
    }
  };

  return (
    <ModalOverlay isOpen={ouvert} onOpenChange={changer} isDismissable className="v2-jetons v2-voile v2-voile--assistant">
      <Modal className="v2-assistant">
        <Dialog className="v2-modale-dialogue v2-assistant-corps" aria-label="Assistant">
          <div className="v2-assistant-tete">
            <Sparkles width={16} height={16} aria-hidden="true" />
            <strong style={{ fontWeight: 500 }}>Assistant</strong>
            <button type="button" className="v2-btn v2-btn--petit v2-btn--icone v2-btn--fantome" aria-label="Fermer l'assistant" onClick={() => changer(false)} style={{ marginLeft: "auto" }}>
              <X width={16} height={16} aria-hidden="true" />
            </button>
          </div>
          <div className="v2-assistant-fil" ref={fil} aria-live="polite">
            {messages.length === 0 ? (
              <p className="v2-gris" style={{ margin: 0 }}>
                Posez une question sur l&apos;espace, faites rédiger un message ou résumer un texte. L&apos;assistant ne voit pas vos factures ni vos clients.
              </p>
            ) : (
              messages.map((m, i) => (
                <div key={i} className="v2-assistant-bulle" data-role={m.role}>
                  {m.content || (enCours ? "…" : "")}
                </div>
              ))
            )}
          </div>
          {connecte ? (
            <form className="v2-assistant-saisie" onSubmit={envoyer}>
              <span className="v2-champ" style={{ height: "auto", padding: 8, flex: 1 }}>
                <textarea
                  name="question"
                  rows={2}
                  maxLength={4000}
                  placeholder="Votre question…"
                  aria-label="Votre question"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      e.currentTarget.form?.requestSubmit();
                    }
                  }}
                  style={{ flex: 1, border: 0, outline: 0, background: "transparent", color: "inherit", font: "inherit", resize: "none" }}
                />
              </span>
              <button type="submit" className="v2-btn v2-btn--petit v2-btn--primaire" disabled={enCours}>
                Envoyer
              </button>
            </form>
          ) : (
            <div style={{ padding: 16 }}>
              <Note teinte="bleu">Connectez-vous pour utiliser l&apos;assistant.</Note>
            </div>
          )}
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}
