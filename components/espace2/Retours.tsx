"use client";

/* Le Feedback et l'Aide (24/10/2026) — demande de Teo : les deux boutons
   de la barre du haut menaient à la page /contact du site, « pas pro ».
   Ils ouvrent maintenant un panneau à droite, le même que l'assistant :
     · Feedback : une idée, un problème ou une question, écrits sur place
       et envoyés par /api/contact (sujet « feedback ») au nom du compte
       connecté, avec la page d'où ils partent : ils arrivent chez Teo
       (teo.karczewski@omegaai.fr), « répondre » répond au client ;
     · Aide : l'assistant, écrire à l'équipe, les raccourcis clavier et
       les questions fréquentes de l'espace. */

import { useState, type FormEvent, type KeyboardEvent } from "react";
import { usePathname } from "next/navigation";
import { ArrowUp, Bug, CheckCircle2, ChevronRight, CircleHelp, Lightbulb, MessageSquare, Sparkles, X } from "lucide-react";
import { Dialog, Modal, ModalOverlay } from "react-aria-components";
import type { Utilisateur } from "@/lib/compte";
import { Kbd } from "./ui";

export type TypeRetour = "idee" | "probleme" | "question";

const TYPES: { cle: TypeRetour; libelle: string; icone: typeof Lightbulb; invite: string }[] = [
  { cle: "idee", libelle: "Idée", icone: Lightbulb, invite: "Ce qui vous ferait gagner du temps, ce qui manque…" },
  { cle: "probleme", libelle: "Problème", icone: Bug, invite: "Ce qui ne marche pas, sur quelle page, ce que vous attendiez…" },
  { cle: "question", libelle: "Question", icone: CircleHelp, invite: "Votre question pour l'équipe Omega…" },
];

function Panneau({ ouvert, changer, titre, children }: { ouvert: boolean; changer: (v: boolean) => void; titre: string; children: React.ReactNode }) {
  return (
    <ModalOverlay isOpen={ouvert} onOpenChange={changer} isDismissable className="v2-jetons v2-voile v2-voile--assistant">
      <Modal className="v2-assistant v2-ret">
        <Dialog className="v2-modale-dialogue v2-assistant-corps" aria-label={titre}>
          <div className="v2-ia-tete">
            <p className="v2-ret-titre">{titre}</p>
            <button type="button" className="v2-val-bouton v2-val-bouton--icone" aria-label={`Fermer ${titre.toLowerCase()}`} onClick={() => changer(false)} style={{ marginLeft: "auto" }}>
              <X width={16} height={16} />
            </button>
          </div>
          {children}
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}

/* /api/contact demande au moins 10 caractères */
const MINIMUM = 10;

export function PanneauRetour({ ouvert, changer, utilisateur, type, changerType }: { ouvert: boolean; changer: (v: boolean) => void; utilisateur: Utilisateur | null; type: TypeRetour; changerType: (t: TypeRetour) => void }) {
  const page = usePathname() ?? "";
  const connecte = !!utilisateur;
  const [texte, setTexte] = useState("");
  const [etat, setEtat] = useState<"saisie" | "envoi" | "envoye" | "erreur">("saisie");
  const choisi = TYPES.find((t) => t.cle === type) ?? TYPES[0];

  const envoyer = async () => {
    const message = texte.trim();
    if (message.length < MINIMUM || !utilisateur || etat === "envoi") return;
    setEtat("envoi");
    const ok = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prenom: utilisateur.prenom || utilisateur.email.split("@")[0],
        nom: utilisateur.nom || "-",
        entreprise: utilisateur.entreprise ?? "",
        email: utilisateur.email,
        telephone: utilisateur.telephone ?? "",
        sujet: "feedback",
        message: `Feedback de l'espace client · ${choisi.libelle}\nPage : ${page}\n\n${message}`,
      }),
    })
      .then((r) => r.ok)
      .catch(() => false);
    if (!ok) return setEtat("erreur");
    setTexte("");
    setEtat("envoye");
  };

  const fermer = (v: boolean) => {
    changer(v);
    if (!v && etat !== "envoi") setEtat("saisie");
  };

  return (
    <Panneau ouvert={ouvert} changer={fermer} titre="Feedback">
      {etat === "envoye" ? (
        <div className="v2-ia-accueil">
          <CheckCircle2 width={28} height={28} aria-hidden="true" className="v2-ia-etoile" />
          <h2>
            Merci, c&apos;est reçu.
          </h2>
          <p className="v2-ia-gris v2-ret-centre">L&apos;équipe Omega lit chaque message. Si une réponse est utile, elle vous écrit à {utilisateur?.email ?? "votre adresse"}.</p>
          <div className="v2-ia-idees">
            <button type="button" className="v2-val-bouton" onClick={() => setEtat("saisie")}>
              Envoyer autre chose
            </button>
            <button type="button" className="v2-val-bouton" onClick={() => fermer(false)}>
              Fermer
            </button>
          </div>
        </div>
      ) : (
        <form
          className="v2-ret-corps"
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            void envoyer();
          }}
        >
          <p className="v2-ret-intro">Une idée, un souci, une question ? Dites-le ici, l&apos;équipe Omega le reçoit directement.</p>
          <div className="v2-ret-types" role="radiogroup" aria-label="Type de message">
            {TYPES.map((t) => (
              <button key={t.cle} type="button" role="radio" aria-checked={t.cle === type} className="v2-ret-type" onClick={() => changerType(t.cle)}>
                <t.icone width={16} height={16} aria-hidden="true" />
                {t.libelle}
              </button>
            ))}
          </div>
          <div className="v2-ia-saisie">
            <textarea
              value={texte}
              onChange={(e) => {
                setTexte(e.target.value);
                if (etat === "erreur") setEtat("saisie");
              }}
              rows={7}
              maxLength={4000}
              disabled={!connecte}
              placeholder={connecte ? choisi.invite : "Connectez-vous pour envoyer un message"}
              aria-label="Votre message"
              autoFocus
              onKeyDown={(e: KeyboardEvent<HTMLTextAreaElement>) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  void envoyer();
                }
              }}
            />
            <div className="v2-ia-saisie-pied">
              <span>{connecte ? "⌘ + Entrée pour envoyer" : "Réservé aux comptes connectés"}</span>
              <button type="submit" className="v2-ia-envoyer" disabled={!connecte || etat === "envoi" || texte.trim().length < MINIMUM} aria-label="Envoyer">
                <ArrowUp width={16} height={16} />
              </button>
            </div>
          </div>
          {etat === "erreur" ? (
            <p className="v2-ret-erreur" role="alert">
              Le message n&apos;est pas parti. Réessayez dans un instant, ou écrivez à teo.karczewski@omegaai.fr.
            </p>
          ) : null}
          <p className="v2-ia-gris">La page où vous êtes est jointe au message, pour qu&apos;on retrouve le contexte.</p>
        </form>
      )}
    </Panneau>
  );
}

const FAQ = [
  { q: "Comment valider une facture ?", r: "Ouvrez « À valider » dans l'accueil : chaque demande montre le document, le montant et qui l'attend. Validez ou refusez d'un clic ; la décision est gardée dans l'activité." },
  { q: "Pourquoi je vois « Atelier Bertin » ?", r: "C'est l'entreprise d'exemple. Le menu de l'organisation, en haut à gauche, passe de l'exemple à vos propres données (base réelle) une fois connecté." },
  { q: "Comment donner un accès à un collègue ?", r: "Écrivez à l'équipe Omega depuis ce panneau : elle ouvre l'accès et règle son rôle. L'équipe actuelle est visible dans Réglages → Équipe." },
  { q: "Où régler les délégations de validation ?", r: "Depuis la file « À valider » : qui peut valider quoi, et jusqu'à quel montant." },
];

export function PanneauAide({ ouvert, changer, ouvrirAssistant, ecrire }: { ouvert: boolean; changer: (v: boolean) => void; ouvrirAssistant: () => void; ecrire: (t: TypeRetour) => void }) {
  return (
    <Panneau ouvert={ouvert} changer={changer} titre="Aide">
      <div className="v2-ret-corps v2-ret-defile">
        <section>
          <p className="v2-ret-section">Obtenir de l&apos;aide</p>
          <ul className="v2-ret-liste">
            <li>
              <button type="button" onClick={ouvrirAssistant}>
                <Sparkles width={16} height={16} aria-hidden="true" />
                <span>
                  Demander à l&apos;assistant
                  <small>Une réponse tout de suite, à toute heure</small>
                </span>
                <ChevronRight width={14} height={14} aria-hidden="true" />
              </button>
            </li>
            <li>
              <button type="button" onClick={() => ecrire("question")}>
                <MessageSquare width={16} height={16} aria-hidden="true" />
                <span>
                  Écrire à l&apos;équipe Omega
                  <small>Une personne de l&apos;équipe vous répond</small>
                </span>
                <ChevronRight width={14} height={14} aria-hidden="true" />
              </button>
            </li>
            <li>
              <button type="button" onClick={() => ecrire("probleme")}>
                <Bug width={16} height={16} aria-hidden="true" />
                <span>
                  Signaler un problème
                  <small>Quelque chose ne marche pas comme prévu</small>
                </span>
                <ChevronRight width={14} height={14} aria-hidden="true" />
              </button>
            </li>
          </ul>
        </section>

        <section>
          <p className="v2-ret-section">Raccourcis clavier</p>
          <dl className="v2-ret-raccourcis">
            <div>
              <dt>Rechercher dans l&apos;espace</dt>
              <dd>
                <Kbd>⌘K</Kbd> <Kbd>F</Kbd>
              </dd>
            </div>
            <div>
              <dt>Fermer un panneau</dt>
              <dd>
                <Kbd>Échap</Kbd>
              </dd>
            </div>
            <div>
              <dt>Aller à la ligne dans l&apos;assistant</dt>
              <dd>
                <Kbd>Maj</Kbd> <Kbd>Entrée</Kbd>
              </dd>
            </div>
          </dl>
        </section>

        <section>
          <p className="v2-ret-section">Questions fréquentes</p>
          <div className="v2-ret-faq">
            {FAQ.map((f) => (
              <details key={f.q}>
                <summary>
                  {f.q}
                  <ChevronRight width={14} height={14} aria-hidden="true" />
                </summary>
                <p>{f.r}</p>
              </details>
            ))}
          </div>
        </section>
      </div>
    </Panneau>
  );
}
