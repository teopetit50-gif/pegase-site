"use client";

/* ══════════════════════════════════════════════════════════════════════
   DALIRO — « Réponse prête », en tête d'un mail reçu (07/11/2026, demande
   de Teo : « on doit lui faciliter la vie un maximum : il doit juste avoir
   un truc genre valider l'envoi ou modifier ; le back-end c'est Claude avec
   des harness conçues pour le moteur Daliro — pas que pour les devis, pour
   tous les trucs », puis « j'aime pas comment est présenté le contenu de la
   carte, trouve un truc plus propre »).

   Dès qu'un mail reçu s'ouvre sans réponse, l'encart demande la réponse à
   /api/daliro/reponse-mail (./reponseMail.ts) avec le mail et le chantier
   rattaché, et la montre comme une lettre : une ligne d'en-tête (l'étoile,
   « Réponse prête », ce qu'elle fait), le texte le long d'un filet, ce
   qu'il faut vérifier en dessous, puis trois gestes : « Valider et envoyer »
   (la page range la réponse dans le mail et le marque traité), « Modifier »
   (le texte devient une zone, l'objet un champ, on valide ensuite),
   « Refaire » (une consigne libre, Daliro réécrit dans ce sens). Quand
   Daliro juge qu'il n'y a rien à répondre (un relevé, des photos d'équipe),
   il le dit et « Rédiger quand même » force une réponse. La réponse écrite
   reste dans ce navigateur tant que le mail ne change pas. Pas de cadre ni
   de fond : la carte est déjà une carte, la colonne de droite reste calme.
   ══════════════════════════════════════════════════════════════════════ */

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Loader2, PencilLine, RefreshCw, Send, Sparkles, Undo2, X } from "lucide-react";
import type { Mail } from "./exemplesMails";
import { demanderReponse, empreinteDe, lireReponse, oublierReponse, poserReponse, type ReponsePrete as Reponse } from "./reponseMail";

const QUAND_MEME = "Écris quand même une réponse : un accusé de réception court et poli, qui dit ce qu'on fait du mail.";

export function ReponsePrete({ mail, chantier, envoyer }: { mail: Mail; chantier: string | null; envoyer: (objet: string, corps: string) => void }) {
  const [reponse, setReponse] = useState<Reponse | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  /* « Modifier » : l'objet et le texte avant la retouche, pour « Annuler » */
  const [avant, setAvant] = useState<{ objet: string; corps: string } | null>(null);
  const [refaire, setRefaire] = useState(false);
  const [consigne, setConsigne] = useState("");
  const requete = useRef<AbortController | null>(null);
  const empreinte = empreinteDe(mail);
  /* un mail sans réponse, pas archivé : la réponse s'écrit toute seule ; sinon on la demande d'un clic */
  const automatique = mail.reponses.length === 0 && mail.statut !== "archive";

  const demander = async (c = "") => {
    requete.current?.abort();
    const ctrl = new AbortController();
    requete.current = ctrl;
    setEnCours(true);
    setErreur(null);
    setAvant(null);
    try {
      const r = await demanderReponse(mail, chantier, c, ctrl.signal);
      if (ctrl.signal.aborted) return;
      poserReponse(mail.id, r);
      setReponse(r);
      setRefaire(false);
      setConsigne("");
    } catch (e) {
      if (ctrl.signal.aborted) return;
      setErreur(e instanceof Error ? e.message : "Daliro n'a pas pu écrire la réponse. Réessayez.");
    } finally {
      if (!ctrl.signal.aborted) setEnCours(false);
    }
  };

  /* à l'ouverture d'un mail (ou quand il change) : la réponse gardée, sinon on l'écrit.
     Lue après le montage (localStorage), comme la boîte elle-même dans ./Mails.tsx. */
  useEffect(() => {
    requete.current?.abort();
    const t = window.setTimeout(() => {
      const gardee = lireReponse(mail);
      setReponse(gardee);
      setErreur(null);
      setAvant(null);
      setRefaire(false);
      setConsigne("");
      setEnCours(false);
      if (!gardee && automatique) void demander();
    }, 0);
    return () => {
      window.clearTimeout(t);
      requete.current?.abort();
    };
  }, [mail.id, empreinte]); // eslint-disable-line react-hooks/exhaustive-deps

  const maj = (c: Partial<Reponse>) =>
    setReponse((r) => {
      if (!r) return r;
      const suivant = { ...r, ...c, retouchee: true };
      poserReponse(mail.id, suivant);
      return suivant;
    });
  const valider = () => {
    if (!reponse) return;
    const objet = reponse.objet.trim() || `Re: ${mail.objet}`;
    const corps = reponse.corps.trim();
    if (!corps) return;
    oublierReponse(mail.id);
    envoyer(objet, corps);
  };

  const entete = (icone: React.ReactNode, titre: string, sous?: string | null) => (
    <div className="dal-ml-rep-tete">
      <span className="dal-ml-rep-etoile" aria-hidden="true">
        {icone}
      </span>
      <h3 id={`rep-titre-${mail.id}`}>{titre}</h3>
      {sous ? <p>{sous}</p> : null}
    </div>
  );
  const formulaireRefaire = (
    <form
      className="dal-ml-rep-consigne"
      onSubmit={(e) => {
        e.preventDefault();
        void demander(consigne.trim());
      }}
    >
      <label className="v2-sr" htmlFor={`rep-consigne-${mail.id}`}>
        Une consigne pour Daliro
      </label>
      <span className="v2-champ">
        <input id={`rep-consigne-${mail.id}`} autoFocus value={consigne} onChange={(e) => setConsigne(e.target.value)} placeholder="Dites-lui quoi changer : « réponds que non, pas avant janvier »…" />
      </span>
      <button type="submit" className="v2-btn v2-btn--petit">
        <RefreshCw width={14} height={14} aria-hidden="true" /> Refaire
      </button>
    </form>
  );

  /* ——— en train d'écrire ——— */
  if (enCours)
    return (
      <section className="dal-ml-rep dal-ml-rep--ecrit" aria-busy="true" aria-live="polite" aria-labelledby={`rep-titre-${mail.id}`}>
        {entete(<Loader2 width={15} height={15} className="dal-ml-rep-tourne" />, "Daliro écrit la réponse…", `Il lit le mail${chantier ? " et le chantier" : ""}.`)}
        <div className="dal-ml-rep-lettre dal-ml-rep-os" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
        </div>
      </section>
    );

  /* ——— pas venue ——— */
  if (erreur)
    return (
      <section className="dal-ml-rep" aria-live="polite" aria-labelledby={`rep-titre-${mail.id}`}>
        {entete(<Sparkles width={15} height={15} />, "La réponse n'est pas venue", erreur)}
        <div className="dal-ml-rep-pied">
          <button type="button" className="v2-btn v2-btn--primaire" onClick={() => void demander(reponse?.consigne ?? "")}>
            <RefreshCw width={14} height={14} aria-hidden="true" /> Réessayer
          </button>
        </div>
      </section>
    );

  /* ——— rien d'écrit : un mail déjà répondu ou archivé, on la demande d'un clic ——— */
  if (!reponse)
    return (
      <section className="dal-ml-rep" aria-labelledby={`rep-titre-${mail.id}`}>
        {entete(<Sparkles width={15} height={15} />, mail.reponses.length ? "Une autre réponse ?" : "Préparer une réponse", mail.reponses.length ? "Daliro l'écrit d'après le mail et ce qui a déjà été répondu." : "Le mail est archivé : Daliro écrit la réponse si vous la demandez.")}
        <div className="dal-ml-rep-pied">
          <button type="button" className="v2-btn v2-btn--primaire" onClick={() => void demander()}>
            <Sparkles width={14} height={14} aria-hidden="true" /> Écrire la réponse
          </button>
        </div>
      </section>
    );

  /* ——— Daliro juge qu'il n'y a rien à répondre ——— */
  if (!reponse.repondre)
    return (
      <section className="dal-ml-rep" aria-live="polite" aria-labelledby={`rep-titre-${mail.id}`}>
        {entete(<Sparkles width={15} height={15} />, "Pas de réponse à envoyer", reponse.pourquoi || "Ce mail n'attend rien : à classer.")}
        <div className="dal-ml-rep-pied">
          <button type="button" className="v2-btn v2-btn--primaire" onClick={() => void demander(QUAND_MEME)}>
            <PencilLine width={14} height={14} aria-hidden="true" /> Rédiger quand même
          </button>
          <button type="button" className="v2-btn v2-btn--fantome" aria-expanded={refaire} onClick={() => setRefaire((v) => !v)}>
            <RefreshCw width={14} height={14} aria-hidden="true" /> Avec une consigne
          </button>
        </div>
        {refaire ? formulaireRefaire : null}
      </section>
    );

  /* ——— la réponse, prête à partir : une lettre le long d'un filet ——— */
  const retouche = avant !== null;
  const objetParDefaut = `Re: ${mail.objet}`;
  return (
    <section className="dal-ml-rep" aria-labelledby={`rep-titre-${mail.id}`} aria-live="polite">
      {entete(<Sparkles width={15} height={15} />, retouche ? "Modifier la réponse" : reponse.retouchee ? "Réponse prête, retouchée" : "Réponse prête", retouche ? "Changez ce que vous voulez, puis validez l'envoi." : reponse.pourquoi || null)}

      <div className="dal-ml-rep-lettre">
        {retouche ? (
          <label className="dal-ml-rep-objet">
            <span>Objet</span>
            <input value={reponse.objet} onChange={(e) => maj({ objet: e.target.value })} placeholder={objetParDefaut} />
          </label>
        ) : reponse.objet.trim() && reponse.objet.trim() !== objetParDefaut ? (
          <p className="dal-ml-rep-objet">
            <span>Objet</span>
            {reponse.objet}
          </p>
        ) : null}
        {retouche ? <textarea className="dal-ml-rep-zone" aria-label="Texte de la réponse" rows={12} autoFocus value={reponse.corps} onChange={(e) => maj({ corps: e.target.value })} /> : <p className="dal-ml-rep-corps">{reponse.corps}</p>}
      </div>

      {!retouche && reponse.a_verifier.length ? (
        <ul className="dal-ml-rep-verifier" aria-label="À vérifier avant d'envoyer">
          {reponse.a_verifier.map((x, i) => (
            <li key={i}>
              <AlertTriangle width={13} height={13} aria-hidden="true" />
              {i === 0 ? <strong>À vérifier : </strong> : null}
              {x}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="dal-ml-rep-pied">
        <button type="button" className="v2-btn v2-btn--primaire" disabled={!reponse.corps.trim()} onClick={valider}>
          <Send width={14} height={14} aria-hidden="true" /> Valider et envoyer
        </button>
        {retouche ? (
          <button
            type="button"
            className="v2-btn v2-btn--fantome"
            onClick={() => {
              maj({ objet: avant.objet, corps: avant.corps });
              setAvant(null);
            }}
          >
            <Undo2 width={14} height={14} aria-hidden="true" /> Annuler les modifications
          </button>
        ) : (
          <>
            <button type="button" className="v2-btn v2-btn--fantome" onClick={() => setAvant({ objet: reponse.objet, corps: reponse.corps })}>
              <PencilLine width={14} height={14} aria-hidden="true" /> Modifier
            </button>
            <button type="button" className="v2-btn v2-btn--fantome" aria-expanded={refaire} onClick={() => setRefaire((v) => !v)}>
              {refaire ? <X width={14} height={14} aria-hidden="true" /> : <RefreshCw width={14} height={14} aria-hidden="true" />} Refaire
            </button>
          </>
        )}
      </div>
      {refaire && !retouche ? formulaireRefaire : null}
    </section>
  );
}
