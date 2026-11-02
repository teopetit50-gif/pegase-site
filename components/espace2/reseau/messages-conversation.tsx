"use client";

/* Réseau › Messages — la conversation ouverte : un sujet d'un salon, un
   salon (la liste de ses sujets), ou un message privé.

   CONTENU : Zulip (chat.zulip.org, vue publique d'un canal et d'un sujet ;
   zulip.com/help/direct-messages, /introduction-to-topics,
   /emoji-reactions, /status-and-availability) :
     · l'en-tête « # salon › sujet » (Zulip : la barre du destinataire) ;
     · la description du salon ; dans un salon, la liste de ses sujets,
       le plus récent en haut, avec leurs non-lus ;
     · les messages : avatar, nom, heure, texte ; les messages qui se
       suivent d'un même auteur sans répéter l'en-tête ; le jour en
       séparateur ; un filet « Nouveaux » avant le premier non lu ; les
       réactions sous le message (cliquer en ajoute ou en retire une) ;
     · la présence d'un membre (en ligne, absent) ;
     · un message privé : visible des deux entreprises seulement.

   HABILLAGE : la fiche ouverte des moteurs (REPUT › Base de
   connaissances, CASHD › Débiteurs) : tête de 44 (référence grise, nom,
   ronds à droite), colonne de 591 avec le titre 24/600 et la description
   15/24, le trait, « Activité » devenu « Messages », le composeur, et la
   colonne de droite en sections (pilules de 28) quand la place le permet. */

import Link from "next/link";
import { Fragment, useEffect, useRef } from "react";
import { ArrowLeft, Hash, Megaphone, SmilePlus, UserRound, Users } from "lucide-react";
import { Menu } from "../lin/Lin";
import { MEMBRES } from "./membres";
import { VOUS, membre, presenceDe, type Message, type Salon } from "./messages-donnees";
import { Avatar, IconeSalon, TexteMessage, ficheDe, heureLigne, libelleJour, libellePresence, mentionneVous, minutes, nomDe, quand } from "./messages-commun";
import type { SujetVu } from "./messages-etat";
import Composeur from "./messages-composeur";

const RAPIDES = ["👍", "🙏", "✅"];

export type Ouverte =
  | { genre: "sujet"; cle: string; salon: Salon; sujet: SujetVu; autres: SujetVu[] }
  | { genre: "salon"; salon: Salon; sujets: SujetVu[] }
  | { genre: "prive"; cle: string; slug: string; messages: Message[] };

type Actions = {
  aller: (href: string) => void;
  retour: () => void;
  envoyer: (texte: string) => void;
  creerSujet: (titre: string, texte: string) => void;
  reagir: (id: string, emoji: string) => void;
};

export default function Conversation({ conv, nomVous, minuit, nouveaux, actions }: { conv: Ouverte; nomVous: string; minuit: number | null; nouveaux: number; actions: Actions }) {
  const defile = useRef<HTMLDivElement>(null);
  const messages = conv.genre === "sujet" ? conv.sujet.messages : conv.genre === "prive" ? conv.messages : [];
  const total = messages.length;
  const cle = conv.genre === "salon" ? `s:${conv.salon.id}` : conv.cle;
  const membresConv = conv.genre === "prive" ? [conv.slug] : conv.salon.membres;

  /* en arrivant : le filet « Nouveaux » au milieu s'il y en a un, sinon le dernier message ; à chaque envoi : le bas */
  const vu = useRef<string | null>(null);
  useEffect(() => {
    const d = defile.current;
    if (!d || minuit === null) return;
    const premiere = vu.current !== cle;
    vu.current = cle;
    const filet = d.querySelector<HTMLElement>(".ms-nouveaux");
    if (premiere && filet) filet.scrollIntoView({ block: "center" });
    else if (!premiere || total > 4) d.scrollTop = d.scrollHeight;
    else d.scrollTop = 0;
  }, [cle, total, minuit]);

  const lien = (href: string) => ({
    href,
    onClick: (e: React.MouseEvent) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      e.preventDefault();
      actions.aller(href);
    },
  });

  const m = conv.genre === "prive" ? membre(conv.slug) : undefined;
  const titre = conv.genre === "sujet" ? conv.sujet.titre : conv.genre === "salon" ? conv.salon.nom : (m?.nom ?? "");
  const participants = conv.genre === "sujet" ? conv.sujet.participants : conv.genre === "prive" ? [conv.slug, VOUS] : [];

  return (
    <section className="lin-boite-detail ms-detail" aria-label={conv.genre === "prive" ? `Conversation privée avec ${titre}` : conv.genre === "salon" ? `Salon ${titre}` : `${conv.salon.nom}, ${titre}`}>
      <header className="lin-tete">
        <button type="button" className="lin-rond ms-retour" aria-label="Retour à la liste des conversations" onClick={actions.retour}>
          <ArrowLeft aria-hidden="true" />
        </button>
        {conv.genre === "sujet" ? (
          <>
            <a {...lien(`?salon=${conv.salon.id}`)} className="lin-tete-ref ms-tete-ref">
              {conv.salon.genre === "reseau" ? <Megaphone aria-hidden="true" /> : <Hash aria-hidden="true" />}
              {conv.salon.nom}
            </a>
            <span className="lin-fil-sep" aria-hidden="true">
              ›
            </span>
            <span className="lin-tete-nom ms-tete-nom">{titre}</span>
          </>
        ) : conv.genre === "salon" ? (
          <>
            <span className="lin-tete-ref ms-tete-ref">
              {conv.salon.genre === "reseau" ? <Megaphone aria-hidden="true" /> : <Hash aria-hidden="true" />}
              Salon
            </span>
            <span className="lin-tete-nom ms-tete-nom">{titre}</span>
            <span className="lin-tete-compte v2-tabulaire">{conv.sujets.length} sujets</span>
          </>
        ) : (
          <>
            <span className="lin-tete-ref ms-tete-ref">Message privé</span>
            <Link href={ficheDe(conv.slug)} className="lin-tete-nom ms-tete-nom">
              {titre}
            </Link>
          </>
        )}
        <div className="lin-tete-ronds">
          {conv.genre === "prive" ? (
            <Link href={ficheDe(conv.slug)} className="lin-rond" aria-label={`Voir la fiche de ${titre}`} title="Voir la fiche">
              <UserRound aria-hidden="true" />
            </Link>
          ) : (
            <Menu
              largeur={300}
              bouton={(ouvert, basculer) => (
                <button type="button" className="lin-btn lin-btn--texte ms-qui" aria-label={`Membres de ${conv.salon.nom} : ${conv.salon.membres.length + 1}`} aria-expanded={ouvert} onClick={basculer}>
                  <Users width={14} height={14} aria-hidden="true" />
                  <span className="v2-tabulaire">{conv.salon.membres.length + 1}</span>
                </button>
              )}
            >
              {() => <ListeMembres membres={conv.salon.membres} nomVous={nomVous} titre={`Membres de ${conv.salon.nom}`} />}
            </Menu>
          )}
        </div>
      </header>

      <div className="ms-defile" ref={defile}>
        <div className="lin-ticket ms-ticket">
          <article className="lin-ticket-corps ms-corps">
            {conv.genre === "prive" ? (
              <div className="ms-titre-prive">
                <Avatar slug={conv.slug} nomVous={nomVous} taille={40} presence />
                <h2 className="lin-ticket-titre">
                  <Link href={ficheDe(conv.slug)}>{titre}</Link>
                </h2>
              </div>
            ) : (
              <h2 className="lin-ticket-titre">{titre}</h2>
            )}
            <p className="lin-ticket-desc">
              {conv.genre === "sujet" ? (
                <>
                  Dans{" "}
                  <a {...lien(`?salon=${conv.salon.id}`)} className="ms-lien">
                    # {conv.salon.nom}
                  </a>{" "}
                  · {conv.sujet.messages.length} message{conv.sujet.messages.length > 1 ? "s" : ""} · {participants.length} participant{participants.length > 1 ? "s" : ""}
                </>
              ) : conv.genre === "salon" ? (
                <>
                  {conv.salon.description} {conv.salon.membres.length + 1} entreprises, vous comprise.
                </>
              ) : m ? (
                <>
                  {m.secteur} · {m.commune}, {m.ile} · {libellePresence(m.slug)}. Seules vos deux entreprises voient cette conversation.
                </>
              ) : null}
            </p>

            {conv.genre === "salon" ? (
              <>
                <ul className="lin-ticket-sous ms-sujets-salon" aria-label={`Sujets de ${conv.salon.nom}`}>
                  {conv.sujets.map((t) => (
                    <li key={t.id}>
                      <a {...lien(`?salon=${conv.salon.id}&sujet=${t.id}`)} className="lin-ticket-sous-ligne" data-non-lu={t.nonLus ? "" : undefined}>
                        {t.nonLus ? <span className="lin-boite-point" aria-hidden="true" /> : <span className="ms-sans-point" aria-hidden="true" />}
                        <span className="lin-ticket-sous-nom">{t.titre}</span>
                        <span className="lin-ticket-sous-meta">
                          {t.messages.length} message{t.messages.length > 1 ? "s" : ""}
                          {t.dernier && minuit !== null ? ` · ${heureLigne(t.dernier, minuit)}` : ""}
                        </span>
                        {t.nonLus ? <span className="ms-compte" data-mention={t.mentions ? "" : undefined}>{t.nonLus}</span> : null}
                        {t.nonLus ? <span className="v2-sr">, {t.nonLus} non lu{t.nonLus > 1 ? "s" : ""}</span> : null}
                      </a>
                    </li>
                  ))}
                </ul>
                <hr className="lin-ticket-trait" />
                <div className="lin-ticket-activite-tete">
                  <h3>Nouveau sujet</h3>
                </div>
                <Composeur key={`nouveau-${conv.salon.id}`} etiquette={`Premier message du sujet, dans ${conv.salon.nom}`} placeholder={`Votre demande à # ${conv.salon.nom}…`} membres={conv.salon.membres} nomVous={nomVous} envoyer={(t, ti) => actions.creerSujet(ti, t)} avecTitre />
              </>
            ) : (
              <>
                <hr className="lin-ticket-trait" />
                <div className="lin-ticket-activite-tete">
                  <h3>Messages</h3>
                </div>
                {minuit === null ? (
                  <div className="ms-attente" aria-hidden="true" />
                ) : (
                  <div role="log" aria-label={`Messages : ${titre}`} className="ms-messages">
                    {messages.map((x, i) => {
                      const prec = messages[i - 1];
                      const nouveauJour = !prec || prec.jour !== x.jour;
                      const debutNonLus = nouveaux > 0 && i === messages.length - nouveaux;
                      const suite = !nouveauJour && !debutNonLus && prec.auteur === x.auteur && minutes(x) - minutes(prec) < 10;
                      return (
                        <Fragment key={x.id}>
                          {nouveauJour ? (
                            <div className="ms-jour" role="separator">
                              {libelleJour(x.jour, minuit)}
                            </div>
                          ) : null}
                          {debutNonLus ? (
                            <div className="ms-nouveaux" role="separator">
                              Nouveaux
                            </div>
                          ) : null}
                          <LigneMessage message={x} suite={suite} nomVous={nomVous} minuit={minuit} reagir={actions.reagir} />
                        </Fragment>
                      );
                    })}
                  </div>
                )}
                <Composeur
                  key={cle}
                  etiquette={conv.genre === "prive" ? `Écrire à ${titre}` : `Répondre dans ${conv.salon.nom}, ${titre}`}
                  placeholder={conv.genre === "prive" ? `Écrire à ${titre}…` : `Répondre dans # ${conv.salon.nom} › ${titre}…`}
                  membres={membresConv}
                  nomVous={nomVous}
                  envoyer={(t) => actions.envoyer(t)}
                />
              </>
            )}
          </article>

          <aside className="lin-ticket-cote ms-cote" aria-label="Détails de la conversation">
            {conv.genre === "prive" && m ? (
              <>
                <section className="lin-ticket-section">
                  <h3>Membre</h3>
                  <div className="lin-ticket-pilules">
                    <Link href={ficheDe(m.slug)} className="lin-ticket-pilule">
                      <Avatar slug={m.slug} nomVous={nomVous} taille={18} presence />
                      {m.nom}
                    </Link>
                    <span className="lin-ticket-pilule">{m.secteur}</span>
                    <span className="lin-ticket-pilule">
                      {m.commune}, {m.ile}
                    </span>
                    <span className="lin-ticket-pilule">
                      <span className="ms-point-presence" data-etat={presenceDe(m.slug)} aria-hidden="true" />
                      {presenceDe(m.slug) === "en-ligne" ? "En ligne" : "Absent"}
                    </span>
                  </div>
                </section>
                <section className="lin-ticket-section">
                  <h3>Propose</h3>
                  <div className="lin-ticket-pilules">
                    {m.propose.map((p) => (
                      <span key={p} className="lin-ticket-pilule">
                        {p}
                      </span>
                    ))}
                  </div>
                </section>
                <section className="lin-ticket-section">
                  <h3>Cherche</h3>
                  <div className="lin-ticket-pilules">
                    {m.cherche.map((p) => (
                      <span key={p} className="lin-ticket-pilule">
                        {p}
                      </span>
                    ))}
                  </div>
                </section>
              </>
            ) : conv.genre !== "prive" ? (
              <>
                <section className="lin-ticket-section">
                  <h3>Salon</h3>
                  <div className="lin-ticket-pilules">
                    <a {...lien(`?salon=${conv.salon.id}`)} className="lin-ticket-pilule">
                      <IconeSalon salon={conv.salon} taille={18} />
                      {conv.salon.nom}
                    </a>
                  </div>
                </section>
                {conv.genre === "sujet" ? (
                  <section className="lin-ticket-section">
                    <h3>Participants</h3>
                    <div className="lin-ticket-pilules">
                      {participants.map((p) =>
                        p === VOUS ? (
                          <span key={p} className="lin-ticket-pilule">
                            <Avatar slug={p} nomVous={nomVous} taille={18} />
                            {nomVous} (vous)
                          </span>
                        ) : (
                          <Link key={p} href={ficheDe(p)} className="lin-ticket-pilule">
                            <Avatar slug={p} nomVous={nomVous} taille={18} presence />
                            {nomDe(p, nomVous)}
                          </Link>
                        ),
                      )}
                    </div>
                  </section>
                ) : null}
                {conv.genre === "sujet" && conv.autres.length ? (
                  <section className="lin-ticket-section">
                    <h3>Autres sujets du salon</h3>
                    <div className="lin-ticket-pilules">
                      {conv.autres.slice(0, 5).map((t) => (
                        <a key={t.id} {...lien(`?salon=${conv.salon.id}&sujet=${t.id}`)} className="lin-ticket-pilule ms-pilule-sujet">
                          {t.nonLus ? <span className="lin-boite-point" aria-hidden="true" /> : null}
                          <span>{t.titre}</span>
                        </a>
                      ))}
                    </div>
                  </section>
                ) : null}
                {conv.genre === "salon" ? (
                  <section className="lin-ticket-section">
                    <h3>Membres</h3>
                    <div className="lin-ticket-pilules">
                      {[...conv.salon.membres]
                        .sort((a, b) => Number(presenceDe(b) === "en-ligne") - Number(presenceDe(a) === "en-ligne"))
                        .map((p) => (
                          <Link key={p} href={ficheDe(p)} className="lin-ticket-pilule">
                            <Avatar slug={p} nomVous={nomVous} taille={18} presence />
                            {nomDe(p, nomVous)}
                          </Link>
                        ))}
                    </div>
                  </section>
                ) : null}
              </>
            ) : null}
          </aside>
        </div>
      </div>
    </section>
  );
}

function NomAuteur({ slug, nomVous }: { slug: string; nomVous: string }) {
  if (slug === VOUS) return <span className="ms-auteur">{nomVous}</span>;
  return (
    <Link href={ficheDe(slug)} className="ms-auteur">
      {nomDe(slug, nomVous)}
    </Link>
  );
}

function LigneMessage({ message: x, suite, nomVous, minuit, reagir }: { message: Message; suite: boolean; nomVous: string; minuit: number; reagir: (id: string, emoji: string) => void }) {
  return (
    <div className="ms-message" data-suite={suite ? "" : undefined} data-mention={mentionneVous(x.texte) ? "" : undefined}>
      <div className="ms-gouttiere">
        {suite ? null : x.auteur === VOUS ? (
          <Avatar slug={x.auteur} nomVous={nomVous} />
        ) : (
          <Link href={ficheDe(x.auteur)} tabIndex={-1} aria-hidden="true" className="ms-avatar-lien">
            <Avatar slug={x.auteur} nomVous={nomVous} />
          </Link>
        )}
      </div>
      <div className="ms-message-corps">
        {suite ? (
          <span className="v2-sr">
            {nomDe(x.auteur, nomVous)}, {quand(x, minuit)} :
          </span>
        ) : (
          <div className="ms-message-tete">
            <NomAuteur slug={x.auteur} nomVous={nomVous} />
            <time className="ms-heure" title={quand(x, minuit)}>
              {x.heure.replace(":", " h ")}
            </time>
          </div>
        )}
        <p className="ms-texte">
          <TexteMessage texte={x.texte} nomVous={nomVous} />
        </p>
        {x.reactions?.length ? (
          <div className="ms-reactions">
            {x.reactions.map((r) => {
              const moi = r.qui.includes(VOUS);
              const noms = r.qui.map((q) => (q === VOUS ? "vous" : nomDe(q, nomVous))).join(", ");
              return (
                <button key={r.emoji} type="button" className="ms-reaction" aria-pressed={moi} title={`${r.emoji} ${noms}`} aria-label={`${r.emoji} ${r.qui.length} : ${noms}. ${moi ? "Retirer" : "Ajouter"} votre réaction`} onClick={() => reagir(x.id, r.emoji)}>
                  <span aria-hidden="true">{r.emoji}</span>
                  <span className="v2-tabulaire">{r.qui.length}</span>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
      <div className="ms-actions" role="toolbar" aria-label="Réagir au message">
        <SmilePlus className="ms-actions-icone" aria-hidden="true" />
        {RAPIDES.map((e) => (
          <button key={e} type="button" className="lin-rond ms-action" aria-label={`Réagir ${e}`} onClick={() => reagir(x.id, e)}>
            <span aria-hidden="true">{e}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* la liste des membres d'un salon (menu de la tête) : présence et lien vers la fiche */
function ListeMembres({ membres, nomVous, titre }: { membres: string[]; nomVous: string; titre: string }) {
  const tries = [...membres].sort((a, b) => Number(presenceDe(b) === "en-ligne") - Number(presenceDe(a) === "en-ligne") || nomDe(a, nomVous).localeCompare(nomDe(b, nomVous), "fr"));
  return (
    <div className="ms-menu-membres" aria-label={titre}>
      <div className="lin-menu-section">
        <span className="lin-reglage">
          {titre} · {membres.length + 1}
        </span>
      </div>
      <span className="lin-menu-option ms-menu-vous">
        <Avatar slug={VOUS} nomVous={nomVous} taille={18} />
        <span className="ms-menu-nom">{nomVous}</span>
        <span className="lin-meta">vous</span>
      </span>
      {tries.map((s) => {
        const y = MEMBRES.find((z) => z.slug === s);
        return (
          <Link key={s} href={ficheDe(s)} className="lin-menu-option">
            <Avatar slug={s} nomVous={nomVous} taille={18} presence />
            <span className="ms-menu-nom">{y?.nom ?? s}</span>
            <span className="lin-meta">{libellePresence(s)}</span>
          </Link>
        );
      })}
    </div>
  );
}
