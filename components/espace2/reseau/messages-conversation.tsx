"use client";

/* Réseau › Messages — la conversation ouverte et son fil, sur la
   composition de Slack :
     · l'en-tête de 49 px : « # salon » ou le membre (présence), le sujet
       en gris, à droite la pile des membres (le détail dans un menu) ;
     · les messages : avatar de 36 px en gouttière, nom en 600 et heure en
       gris, les messages rapprochés d'un même auteur sans en-tête (l'heure
       revient au survol), les séparateurs de jour collés en haut, le filet
       « Nouveaux » avant le premier non lu, les réactions en pastilles, le
       résumé du fil (« 3 réponses ») ; au survol, la barre d'actions en
       haut à droite du message ;
     · le fil (« Répondre dans le fil ») s'ouvre dans une colonne à droite ;
       sous 1440 px, il prend la place de la conversation.
   Tout est habillé avec les jetons et les classes d'Espace 2. */

import Link from "next/link";
import { Fragment, useEffect, useRef } from "react";
import { ArrowLeft, Hash, Megaphone, MessageSquareText, UserRound, Users, X } from "lucide-react";
import { Button, Dialog, DialogTrigger, Popover } from "react-aria-components";
import { MEMBRES } from "./membres";
import { VOUS, membre, presenceDe, type Message, type Salon } from "./messages-donnees";
import { Avatar, PointPresence, TexteMessage, ficheDe, libelleJour, mentionneVous, minutes, nomDe, quand } from "./messages-commun";
import Composeur from "./messages-composeur";

const I = { width: 16, height: 16, strokeWidth: 1.6, "aria-hidden": true } as const;
const RAPIDES = ["👍", "🙏", "✅"];

export type Ouverte = { cle: string; salon?: Salon; slug?: string; messages: Message[]; membres: string[] };

type Actions = {
  envoyer: (texte: string) => void;
  repondre: (id: string, texte: string) => void;
  reagir: (id: string, emoji: string) => void;
  ouvrirFil: (id: string) => void;
};

export default function Conversation({ conv, nomVous, minuit, nouveaux, fil, fermerFil, retour, actions }: { conv: Ouverte; nomVous: string; minuit: number | null; nouveaux: number; fil: string | null; fermerFil: () => void; retour: () => void; actions: Actions }) {
  const defile = useRef<HTMLDivElement>(null);
  const titre = conv.salon ? conv.salon.nom : nomDe(conv.slug ?? "", nomVous);
  const m = conv.slug ? membre(conv.slug) : undefined;
  const parent = fil ? conv.messages.find((x) => x.id === fil) : undefined;

  /* en arrivant, et à chaque message envoyé : le bas de la conversation */
  const total = conv.messages.length;
  useEffect(() => {
    const d = defile.current;
    if (d) d.scrollTop = d.scrollHeight;
  }, [conv.cle, total, minuit]);

  return (
    <>
      <section className="ms-conv" aria-label={conv.salon ? `Salon ${titre}` : `Conversation privée avec ${titre}`}>
        <header className="ms-conv-tete">
          <button type="button" className="v2-btn v2-btn--petit v2-btn--icone v2-btn--fantome ms-retour" aria-label="Retour à la liste des conversations" onClick={retour}>
            <ArrowLeft {...I} />
          </button>
          {conv.salon ? (
            <div className="ms-conv-titre">
              <h2>
                {conv.salon.genre === "alertes" ? <Megaphone {...I} /> : <Hash {...I} />}
                <span>{titre}</span>
              </h2>
              <p className="ms-conv-sujet v2-gris">{conv.salon.sujet}</p>
            </div>
          ) : (
            <div className="ms-conv-titre ms-conv-titre--prive">
              <Avatar slug={conv.slug!} nomVous={nomVous} taille={24} presence />
              <div>
                <h2>
                  <Link href={ficheDe(conv.slug!)}>{titre}</Link>
                </h2>
                <p className="ms-conv-sujet v2-gris">
                  {m ? `${m.secteur} · ${m.commune}` : null} · {presenceDe(conv.slug!) === "en-ligne" ? "en ligne" : "absent"}
                </p>
              </div>
            </div>
          )}
          <div className="ms-conv-droite">
            {conv.salon ? (
              <ListeMembres membres={conv.membres} nomVous={nomVous} salon={titre} />
            ) : (
              <Link href={ficheDe(conv.slug!)} className="v2-btn v2-btn--petit">
                <UserRound {...I} />
                <span className="ms-masque-etroit">Voir la fiche</span>
              </Link>
            )}
          </div>
        </header>

        <div className="ms-defile" ref={defile}>
          <Intro conv={conv} nomVous={nomVous} />
          {minuit === null ? (
            <div className="ms-attente" aria-hidden="true" />
          ) : (
            <div role="log" aria-label={`Messages de ${conv.salon ? `# ${titre}` : titre}`} className="ms-messages">
              {conv.messages.map((x, i) => {
                const prec = conv.messages[i - 1];
                const nouveauJour = !prec || prec.jour !== x.jour;
                const debutNonLus = nouveaux > 0 && i === conv.messages.length - nouveaux;
                const suite = !nouveauJour && !debutNonLus && prec.auteur === x.auteur && minutes(x) - minutes(prec) < 5;
                return (
                  <Fragment key={x.id}>
                    {nouveauJour ? (
                      <div className="ms-jour" role="separator">
                        <span>{libelleJour(x.jour, minuit)}</span>
                      </div>
                    ) : null}
                    {debutNonLus ? (
                      <div className="ms-nouveaux" role="separator">
                        <span>Nouveaux</span>
                      </div>
                    ) : null}
                    <LigneMessage message={x} suite={suite} nomVous={nomVous} minuit={minuit} actions={actions} fil={fil} />
                  </Fragment>
                );
              })}
            </div>
          )}
        </div>

        <Composeur
          key={conv.cle}
          etiquette={conv.salon ? `Écrire dans # ${titre}` : `Écrire à ${titre}`}
          placeholder={conv.salon ? `Écrire dans # ${titre}` : `Écrire à ${titre}`}
          membres={conv.membres}
          nomVous={nomVous}
          envoyer={actions.envoyer}
        />
      </section>

      {parent ? (
        <aside className="ms-fil" aria-label="Fil de discussion">
          <header className="ms-conv-tete ms-fil-tete">
            <div className="ms-conv-titre">
              <h2>
                <MessageSquareText {...I} />
                <span>Fil</span>
              </h2>
              <p className="ms-conv-sujet v2-gris">{conv.salon ? `# ${titre}` : titre}</p>
            </div>
            <button type="button" className="v2-btn v2-btn--petit v2-btn--icone v2-btn--fantome" aria-label="Fermer le fil" onClick={fermerFil}>
              <X {...I} />
            </button>
          </header>
          <div className="ms-defile">
            {minuit === null ? null : (
              <div role="log" aria-label="Réponses du fil" className="ms-messages ms-messages--fil">
                <LigneMessage message={parent} suite={false} nomVous={nomVous} minuit={minuit} actions={actions} dansFil />
                <div className="ms-fil-compte" role="separator">
                  <span>{parent.reponses?.length ? `${parent.reponses.length} réponse${parent.reponses.length > 1 ? "s" : ""}` : "Aucune réponse pour l'instant"}</span>
                </div>
                {(parent.reponses ?? []).map((x, i, t) => {
                  const prec = t[i - 1];
                  const suite = !!prec && prec.auteur === x.auteur && prec.jour === x.jour && minutes(x) - minutes(prec) < 5;
                  return <LigneMessage key={x.id} message={x} suite={suite} nomVous={nomVous} minuit={minuit} actions={actions} dansFil />;
                })}
              </div>
            )}
          </div>
          <Composeur key={parent.id} etiquette="Répondre dans le fil" placeholder="Répondre…" membres={conv.membres} nomVous={nomVous} envoyer={(t) => actions.repondre(parent.id, t)} compact />
        </aside>
      ) : null}
    </>
  );
}

function Intro({ conv, nomVous }: { conv: Ouverte; nomVous: string }) {
  if (conv.salon)
    return (
      <div className="ms-intro">
        <span className="ms-intro-icone" aria-hidden="true">
          {conv.salon.genre === "alertes" ? <Megaphone width={24} height={24} strokeWidth={1.6} /> : <Hash width={24} height={24} strokeWidth={1.6} />}
        </span>
        <h3>{conv.salon.nom}</h3>
        <p className="v2-gris">
          {conv.salon.sujet} {conv.membres.length + 1} entreprises dans ce salon, vous compris.
        </p>
      </div>
    );
  const m = membre(conv.slug ?? "");
  if (!m) return null;
  return (
    <div className="ms-intro">
      <Avatar slug={m.slug} nomVous={nomVous} taille={72} />
      <h3>
        <Link href={ficheDe(m.slug)}>{m.nom}</Link>
      </h3>
      <p className="v2-gris">
        {m.secteur} · {m.commune}, {m.ile}. C&apos;est le début de votre conversation privée avec {m.nom} : seules vos deux entreprises la voient.
      </p>
    </div>
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

function LigneMessage({ message: x, suite, nomVous, minuit, actions, fil, dansFil }: { message: Message; suite: boolean; nomVous: string; minuit: number; actions: Actions; fil?: string | null; dansFil?: boolean }) {
  const reponses = x.reponses ?? [];
  const derniere = reponses[reponses.length - 1];
  const auteursFil = [...new Set(reponses.map((y) => y.auteur))].slice(0, 3);
  const heure = x.heure.replace(":", " h ");
  return (
    <div className="ms-message" data-suite={suite ? "" : undefined} data-mention={mentionneVous(x.texte) ? "" : undefined} data-fil-ouvert={fil === x.id ? "" : undefined}>
      <div className="ms-gouttiere">
        {suite ? (
          <time className="ms-heure-suite" title={quand(x, minuit)}>
            {x.heure}
          </time>
        ) : x.auteur === VOUS ? (
          <Avatar slug={x.auteur} nomVous={nomVous} />
        ) : (
          <Link href={ficheDe(x.auteur)} tabIndex={-1} aria-hidden="true" className="ms-avatar-lien">
            <Avatar slug={x.auteur} nomVous={nomVous} />
          </Link>
        )}
      </div>
      <div className="ms-corps">
        {suite ? (
          <span className="v2-sr">
            {nomDe(x.auteur, nomVous)}, {quand(x, minuit)} :
          </span>
        ) : (
          <div className="ms-tete">
            <NomAuteur slug={x.auteur} nomVous={nomVous} />
            <time className="ms-heure" title={quand(x, minuit)}>
              {heure}
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
                <button key={r.emoji} type="button" className="ms-reaction" aria-pressed={moi} title={`${r.emoji} ${noms}`} aria-label={`${r.emoji} ${r.qui.length} : ${noms}. ${moi ? "Retirer" : "Ajouter"} votre réaction`} onClick={() => actions.reagir(x.id, r.emoji)}>
                  <span aria-hidden="true">{r.emoji}</span>
                  <span className="v2-tabulaire">{r.qui.length}</span>
                </button>
              );
            })}
          </div>
        ) : null}
        {!dansFil && reponses.length ? (
          <button type="button" className="ms-fil-resume" onClick={() => actions.ouvrirFil(x.id)}>
            <span className="ms-fil-avatars" aria-hidden="true">
              {auteursFil.map((a) => (
                <Avatar key={a} slug={a} nomVous={nomVous} taille={20} />
              ))}
            </span>
            <span className="ms-fil-nombre">
              {reponses.length} réponse{reponses.length > 1 ? "s" : ""}
            </span>
            <span className="ms-fil-derniere v2-gris">Dernière réponse {quand(derniere, minuit)}</span>
            <span className="ms-fil-voir v2-gris" aria-hidden="true">
              Voir le fil
            </span>
          </button>
        ) : null}
      </div>
      <div className="ms-actions" role="toolbar" aria-label="Actions sur le message">
        {RAPIDES.map((e) => (
          <button key={e} type="button" className="ms-action" aria-label={`Réagir ${e}`} onClick={() => actions.reagir(x.id, e)}>
            <span aria-hidden="true">{e}</span>
          </button>
        ))}
        {dansFil ? null : (
          <button type="button" className="ms-action" aria-label="Répondre dans le fil" title="Répondre dans le fil" onClick={() => actions.ouvrirFil(x.id)}>
            <MessageSquareText {...I} />
          </button>
        )}
      </div>
    </div>
  );
}

/* la pile des membres d'un salon, et leur liste (présence, lien vers la fiche) */
function ListeMembres({ membres, nomVous, salon }: { membres: string[]; nomVous: string; salon: string }) {
  const tries = [...membres].sort((a, b) => Number(presenceDe(b) === "en-ligne") - Number(presenceDe(a) === "en-ligne") || nomDe(a, nomVous).localeCompare(nomDe(b, nomVous), "fr"));
  return (
    <DialogTrigger>
      <Button className="v2-btn v2-btn--petit ms-pile" aria-label={`Membres de # ${salon} : ${membres.length + 1}`}>
        <span className="ms-pile-avatars" aria-hidden="true">
          {tries.slice(0, 3).map((s) => (
            <Avatar key={s} slug={s} nomVous={nomVous} taille={20} />
          ))}
        </span>
        <Users {...I} className="ms-pile-icone" />
        <span className="v2-tabulaire">{membres.length + 1}</span>
      </Button>
      <Popover placement="bottom end" offset={8} className="v2-jetons v2-popover ms-pop-membres">
        <Dialog className="v2-modale-dialogue" aria-label={`Membres de # ${salon}`}>
          <div className="ms-pop-tete">
            <strong># {salon}</strong>
            <small className="v2-gris">{membres.length + 1} entreprises</small>
          </div>
          <ul className="ms-pop-liste">
            <li>
              <span className="ms-pop-ligne">
                <Avatar slug={VOUS} nomVous={nomVous} taille={24} />
                <span className="ms-pop-nom">
                  {nomVous} <span className="v2-gris">(vous)</span>
                </span>
              </span>
            </li>
            {tries.map((s) => {
              const y = MEMBRES.find((z) => z.slug === s);
              return (
                <li key={s}>
                  <Link href={ficheDe(s)} className="ms-pop-ligne">
                    <Avatar slug={s} nomVous={nomVous} taille={24} />
                    <span className="ms-pop-nom">
                      {y?.nom ?? s}
                      <small className="v2-gris">{y ? `${y.secteur} · ${y.commune}` : null}</small>
                    </span>
                    <PointPresence slug={s} />
                  </Link>
                </li>
              );
            })}
          </ul>
        </Dialog>
      </Popover>
    </DialogTrigger>
  );
}
