"use client";

/* ══════════════════════════════════════════════════════════════════════
   DALIRO — le fil d'un mail et son composeur, la réponse déjà écrite
   (07/11/2026, demandes de Teo : « il doit juste avoir un truc genre
   valider l'envoi ou modifier, pour tous les mails », « j'aime pas comment
   est présenté le contenu de la carte », « c'est trop moche, regarde des
   exemples sur internet »)

   Le dessin des messageries d'aujourd'hui (Superhuman, Front, Shortwave,
   Gmail) : une seule colonne. En haut le fil — le message reçu avec son
   avatar, son nom, son adresse, sa date, son texte, ses pièces en puces,
   puis les réponses déjà parties, de « Vous » —, en bas le composeur, un
   cadre arrondi : « Répondre à … », l'objet, le texte, les gestes.

   Daliro remplit le composeur (./reponseMail.ts, /api/daliro/reponse-mail)
   dès qu'un mail reçu s'ouvre sans réponse : le texte est là, on le lit, on
   clique « Envoyer ». Pour le changer, on tape dedans, c'est tout. Pour le
   refaire, « Refaire » ouvre une consigne (« réponds que non, pas avant
   janvier »). Sous le texte, ce que Daliro demande de vérifier avant
   d'envoyer. Quand il juge qu'il n'y a rien à répondre, le composeur reste
   vide et une ligne le dit, « Rédiger quand même » force. Un mail parti de
   la boîte n'a pas de Daliro : le composeur note la suite.
   ══════════════════════════════════════════════════════════════════════ */

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Loader2, Paperclip, RefreshCw, Reply, Send, Sparkles, X } from "lucide-react";
import { dateHeure } from "@/components/espace/format";
import { couleurDe, initialesDe } from "../lin/ListeFils";
import { BOITE, type Mail, type PieceMail } from "./exemplesMails";
import { demanderReponse, empreinteDe, lireReponse, oublierReponse, poserReponse, type ReponsePrete } from "./reponseMail";

const taille = (o: number) => (o >= 1024 * 1024 ? `${(o / 1024 / 1024).toFixed(1).replace(".", ",")} Mo` : `${Math.max(1, Math.round(o / 1024))} Ko`);
const QUAND_MEME = "Écris quand même une réponse : un accusé de réception court et poli, qui dit ce qu'on fait du mail.";

/* ——— un message du fil : le mail reçu, ou une réponse partie ——— */
export function MessageFil({ nom, adresse, a, quand, texte, pieces, vous }: { nom: string; adresse: string; a: string; quand: string; texte: string; pieces?: PieceMail[]; vous?: boolean }) {
  return (
    <article className="dal-ml-msg" data-vous={vous || undefined}>
      <span className="dal-ml-msg-avatar" style={vous ? undefined : { background: couleurDe(adresse || nom) }} aria-hidden="true">
        {vous ? "V" : initialesDe(nom)}
      </span>
      <div className="dal-ml-msg-tete">
        <strong>{nom}</strong>
        {adresse ? <span className="dal-ml-msg-adresse">{adresse}</span> : null}
        <time dateTime={quand}>{dateHeure(quand)}</time>
      </div>
      <div className="dal-ml-msg-a">à {a}</div>
      <div className="dal-ml-msg-corps">{texte.trim() || "Message sans texte."}</div>
      {pieces?.length ? (
        <ul className="dal-ml-pj" aria-label="Pièces jointes">
          {pieces.map((p, i) => (
            <li key={`${p.nom}-${i}`} title="Pièce d'exemple : le fichier n'existe pas.">
              <Paperclip width={13} height={13} aria-hidden="true" />
              <span>{p.nom}</span>
              <small>{taille(p.taille)}</small>
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}

/* ——— le composeur, rempli par Daliro ——— */
export function ComposeurMail({ mail, chantier, envoyer }: { mail: Mail; chantier: string | null; envoyer: (objet: string, corps: string) => void }) {
  /* un mail parti de la boîte : pas de Daliro, on note la suite */
  const note = mail.de_adresse === BOITE;
  const objetParDefaut = `Re: ${mail.objet}`;
  const [objet, setObjet] = useState(objetParDefaut);
  const [corps, setCorps] = useState("");
  const [reponse, setReponse] = useState<ReponsePrete | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [refaire, setRefaire] = useState(false);
  const [consigne, setConsigne] = useState("");
  const requete = useRef<AbortController | null>(null);
  const zone = useRef<HTMLTextAreaElement>(null);
  const cadre = useRef<HTMLElement>(null);
  /* la réponse est là : la carte glisse jusqu'au composeur, « Envoyer » sous les yeux */
  const montrer = () => window.requestAnimationFrame(() => cadre.current?.scrollIntoView({ block: "end", behavior: "smooth" }));
  const empreinte = empreinteDe(mail);
  /* un mail reçu sans réponse, pas archivé : Daliro écrit tout seul ; sinon on lui demande */
  const automatique = !note && mail.reponses.length === 0 && mail.statut !== "archive";

  const poser = (r: ReponsePrete | null) => {
    setReponse(r);
    setObjet(r?.repondre && r.objet.trim() ? r.objet : objetParDefaut);
    setCorps(r?.repondre ? r.corps : "");
  };
  const demander = async (c = "") => {
    requete.current?.abort();
    const ctrl = new AbortController();
    requete.current = ctrl;
    setEnCours(true);
    setErreur(null);
    try {
      const r = await demanderReponse(mail, chantier, c, ctrl.signal);
      if (ctrl.signal.aborted) return;
      poserReponse(mail.id, r);
      poser(r);
      setRefaire(false);
      setConsigne("");
      if (r.repondre) montrer();
    } catch (e) {
      if (ctrl.signal.aborted) return;
      setErreur(e instanceof Error ? e.message : "Daliro n'a pas pu écrire la réponse. Réessayez.");
    } finally {
      if (!ctrl.signal.aborted) setEnCours(false);
    }
  };

  /* à l'ouverture (ou quand le mail change) : la réponse gardée, sinon Daliro l'écrit.
     Lue après le montage (localStorage), comme la boîte elle-même dans ./Mails.tsx. */
  useEffect(() => {
    requete.current?.abort();
    const t = window.setTimeout(() => {
      const gardee = lireReponse(mail);
      poser(gardee);
      setErreur(null);
      setRefaire(false);
      setConsigne("");
      setEnCours(false);
      if (gardee?.repondre) montrer();
      else if (!gardee && automatique) void demander();
    }, 0);
    return () => {
      window.clearTimeout(t);
      requete.current?.abort();
    };
  }, [mail.id, empreinte]); // eslint-disable-line react-hooks/exhaustive-deps

  /* le texte retouché reste dans ce navigateur, comme la réponse elle-même */
  const retoucher = (c: Partial<{ objet: string; corps: string }>) => {
    if (c.objet !== undefined) setObjet(c.objet);
    if (c.corps !== undefined) setCorps(c.corps);
    if (reponse?.repondre) {
      const suivant = { ...reponse, objet: c.objet ?? objet, corps: c.corps ?? corps, retouchee: true };
      setReponse(suivant);
      poserReponse(mail.id, suivant);
    }
  };
  const valider = () => {
    const texte = corps.trim();
    if (!texte || enCours) return;
    oublierReponse(mail.id);
    envoyer(objet.trim() || objetParDefaut, texte);
  };
  const qui = mail.de_nom || mail.de_adresse || "l'expéditeur";
  const pret = !!reponse?.repondre && !enCours;
  const retouchee = !!reponse?.retouchee;

  /* la ligne Daliro au-dessus du texte : ce qu'il a fait, ou ce qu'il propose */
  let ligne: React.ReactNode = null;
  if (!note) {
    if (enCours)
      ligne = (
        <div className="dal-ml-cmp-daliro" aria-live="polite">
          <Loader2 width={14} height={14} className="dal-ml-cmp-tourne" aria-hidden="true" />
          <span>
            Daliro écrit la réponse{chantier ? ", le chantier sous les yeux" : ""}…
          </span>
        </div>
      );
    else if (erreur)
      ligne = (
        <div className="dal-ml-cmp-daliro" aria-live="polite">
          <Sparkles width={14} height={14} aria-hidden="true" />
          <span>{erreur}</span>
          <button type="button" className="v2-btn v2-btn--petit" onClick={() => void demander(reponse?.consigne ?? "")}>
            Réessayer
          </button>
        </div>
      );
    else if (!reponse)
      ligne = (
        <div className="dal-ml-cmp-daliro">
          <Sparkles width={14} height={14} aria-hidden="true" />
          <span>{mail.reponses.length ? "Daliro peut écrire une autre réponse." : "Daliro peut écrire la réponse."}</span>
          <button type="button" className="v2-btn v2-btn--petit" onClick={() => void demander()}>
            Écrire la réponse
          </button>
        </div>
      );
    else if (!reponse.repondre)
      ligne = (
        <div className="dal-ml-cmp-daliro" aria-live="polite">
          <Sparkles width={14} height={14} aria-hidden="true" />
          <span>
            <strong>Rien à répondre, selon Daliro.</strong> {reponse.pourquoi}
          </span>
          <button type="button" className="v2-btn v2-btn--petit" onClick={() => void demander(QUAND_MEME)}>
            Rédiger quand même
          </button>
        </div>
      );
  }

  return (
    <section ref={cadre} className="dal-ml-cmp" aria-label={note ? "Noter la suite" : `Répondre à ${qui}`} data-pret={pret || undefined}>
      <div className="dal-ml-cmp-tete">
        <Reply width={14} height={14} aria-hidden="true" />
        <span className="dal-ml-cmp-qui">{note ? "Noter la suite" : `Répondre à ${qui}`}</span>
        {pret ? (
          <span className="dal-ml-cmp-tag" title={reponse?.pourquoi || undefined}>
            <Sparkles width={12} height={12} aria-hidden="true" />
            {retouchee ? "Daliro, retouchée" : "Écrite par Daliro"}
          </span>
        ) : null}
      </div>
      {ligne}
      {!note ? (
        <label className="dal-ml-cmp-objet">
          <span>Objet</span>
          <input value={objet} onChange={(e) => retoucher({ objet: e.target.value })} placeholder={objetParDefaut} />
        </label>
      ) : null}
      {enCours ? (
        <div className="dal-ml-cmp-os" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
        </div>
      ) : (
        <textarea
          ref={zone}
          className="dal-ml-cmp-zone"
          aria-label={note ? "La suite" : "Votre réponse"}
          value={corps}
          onChange={(e) => retoucher({ corps: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              valider();
            }
          }}
          placeholder={note ? "Noter la suite : relance, réponse du client…" : `Répondre à ${qui}…`}
          rows={4}
        />
      )}
      {pret && reponse?.a_verifier.length ? (
        <ul className="dal-ml-cmp-verifier" aria-label="À vérifier avant d'envoyer">
          {reponse.a_verifier.map((x, i) => (
            <li key={i}>
              <AlertTriangle width={13} height={13} aria-hidden="true" />
              {i === 0 ? <strong>À vérifier : </strong> : null}
              {x}
            </li>
          ))}
        </ul>
      ) : null}
      {pret && reponse?.pourquoi ? <p className="dal-ml-cmp-pourquoi">{reponse.pourquoi}</p> : null}
      <div className="dal-ml-cmp-pied">
        <button type="button" className="v2-btn v2-btn--primaire" disabled={!corps.trim() || enCours} onClick={valider} title="Ctrl + Entrée">
          <Send width={14} height={14} aria-hidden="true" /> {note ? "Noter" : "Envoyer"}
        </button>
        {!note && (reponse || erreur) && !enCours ? (
          <button type="button" className="v2-btn v2-btn--fantome" aria-expanded={refaire} onClick={() => setRefaire((v) => !v)}>
            {refaire ? <X width={14} height={14} aria-hidden="true" /> : <RefreshCw width={14} height={14} aria-hidden="true" />} Refaire
          </button>
        ) : null}
        {refaire ? (
          <form
            className="dal-ml-cmp-consigne"
            onSubmit={(e) => {
              e.preventDefault();
              void demander(consigne.trim());
            }}
          >
            <label className="v2-sr" htmlFor={`cmp-consigne-${mail.id}`}>
              Une consigne pour Daliro
            </label>
            <span className="v2-champ">
              <input id={`cmp-consigne-${mail.id}`} autoFocus value={consigne} onChange={(e) => setConsigne(e.target.value)} placeholder="Dites-lui quoi changer : « réponds que non, pas avant janvier »…" />
            </span>
            <button type="submit" className="v2-btn v2-btn--petit">
              Refaire
            </button>
          </form>
        ) : (
          <span className="dal-ml-cmp-note">Exemple : rien ne part vraiment.</span>
        )}
      </div>
    </section>
  );
}
