"use client";

/* ══════════════════════════════════════════════════════════════════════
   DALIRO — « Dicter un devis » (06/11/2026, demande de Teo : « tu mets un
   bouton, je clique, ça transcrit à l'écrit, ensuite ça me fait le devis
   dicté », pour le montrer en exemple)

   1. On clique « Commencer la dictée » et on parle : la reconnaissance
      vocale du navigateur (Web Speech API, français) écrit au fur et à
      mesure, les mots encore incertains en gris.
   2. « Arrêter et faire le devis » envoie le texte à /api/daliro/devis :
      l'API Claude reconnaît client, adresse et ouvrages ; les prix viennent
      de la bibliothèque (./bibliothequePrix) ; pour l'exemple, un ouvrage
      hors bibliothèque est chiffré pareil : quoi qu'on dicte, le devis sort
      complet, comme un vrai (demande de Teo, 06/11).
   3. Le devis s'affiche sur la page d'un devis dicté (./FicheDevis).

   « Essayer avec un exemple » lit une dictée d'exemple mot à mot, puis fait
   le devis tout seul : pour un rendez-vous, ou un navigateur sans dictée
   (Firefox). Le texte reste modifiable avant de faire le devis. Rien n'est
   écrit en base : le devis vit le temps de la page.
   ══════════════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { DalIcone } from "./DalIcone";
import { FicheDevis } from "./FicheDevis";
import { BIBLIOTHEQUE_PRIX, DICTEE_EXEMPLE } from "./bibliothequePrix";
import type { Devis, LigneDevis } from "./exemplesDevis";
import "./dal-ticket.css";
import "./dal-dictee.css";

/* la reconnaissance vocale n'est pas dans les types du DOM de TypeScript */
type ResultatVocal = { isFinal: boolean; 0: { transcript: string } };
type EvenementVocal = { resultIndex: number; results: ArrayLike<ResultatVocal> };
type Reconnaissance = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: EvenementVocal) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};
type ClasseReconnaissance = new () => Reconnaissance;
function classeReconnaissance(): ClasseReconnaissance | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: ClasseReconnaissance; webkitSpeechRecognition?: ClasseReconnaissance };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}
const rien = () => () => {};

type Phase = "pret" | "ecoute" | "exemple" | "calcul" | "fait";
type ReponseApi = { titre: string; client: string; adresse: string; telephone: string | null; lignes: LigneDevis[] };

function chrono(s: number): string {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
function dureeVocal(s: number): string {
  return `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, "0")}`;
}

export function DicterDevis({ retour }: { retour?: { libelle: string; href: string } }) {
  const compatible = useSyncExternalStore(rien, () => classeReconnaissance() !== null, () => true);
  const [phase, setPhase] = useState<Phase>("pret");
  const [texte, setTexte] = useState("");
  const [provisoire, setProvisoire] = useState("");
  const [secondes, setSecondes] = useState(0);
  const [erreur, setErreur] = useState<string | null>(null);
  const [devis, setDevis] = useState<Devis | null>(null);
  const reco = useRef<Reconnaissance | null>(null);
  const ecoute = useRef(false);
  const minuterie = useRef<number | null>(null);
  const lecture = useRef<number | null>(null);
  const texteRef = useRef("");
  const secondesRef = useRef(0);
  const direct = useRef<HTMLParagraphElement>(null);
  const provisoireRef = useRef("");

  const poserTexte = useCallback((t: string) => {
    texteRef.current = t;
    setTexte(t);
  }, []);
  const poserProvisoire = useCallback((t: string) => {
    provisoireRef.current = t;
    setProvisoire(t);
  }, []);
  const lancerChrono = useCallback(() => {
    secondesRef.current = 0;
    setSecondes(0);
    if (minuterie.current) window.clearInterval(minuterie.current);
    minuterie.current = window.setInterval(() => {
      secondesRef.current += 1;
      setSecondes(secondesRef.current);
    }, 1000);
  }, []);
  const couperChrono = useCallback(() => {
    if (minuterie.current) window.clearInterval(minuterie.current);
    minuterie.current = null;
  }, []);

  useEffect(
    () => () => {
      ecoute.current = false;
      reco.current?.abort();
      if (minuterie.current) window.clearInterval(minuterie.current);
      if (lecture.current) window.clearInterval(lecture.current);
    },
    [],
  );

  /* le texte suit la voix : on garde le bas de la feuille en vue */
  useEffect(() => {
    const f = direct.current;
    if (f) f.scrollTop = f.scrollHeight;
  }, [texte, provisoire, phase]);

  const faireDevis = useCallback(async () => {
    const vocal = texteRef.current.trim();
    if (vocal.length < 3) {
      setErreur("La dictée est vide : parlez, ou essayez l'exemple.");
      setPhase("pret");
      return;
    }
    setErreur(null);
    setPhase("calcul");
    try {
      const r = await fetch("/api/daliro/devis", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ vocal }) });
      const j = (await r.json().catch(() => ({}))) as Partial<ReponseApi> & { erreur?: string };
      if (!r.ok || !j.lignes) throw new Error(j.erreur ?? "Daliro n'a pas pu faire le devis. Réessayez.");
      if (j.lignes.length === 0) throw new Error("Daliro n'a reconnu aucun ouvrage dans la dictée : précisez les travaux et réessayez.");
      const maintenant = new Date();
      const plus = (m: number) => new Date(maintenant.getTime() + m * 60_000).toISOString();
      const manque = j.lignes.filter((l) => l.prix === null).length;
      const chiffrees = j.lignes.length - manque;
      const duree = Math.max(secondesRef.current, 1);
      setDevis({
        id: "dev-dicte",
        numero: "DEV-14",
        titre: j.titre ?? "Devis dicté",
        client: j.client ?? "Client à préciser",
        telephone: j.telephone ?? "",
        adresse: j.adresse ?? "Adresse à préciser",
        dicte_par: "Vous",
        quand: maintenant.toISOString(),
        duree_vocal: dureeVocal(duree),
        etat: manque ? "a_chiffrer" : "a_valider",
        vocal,
        lignes: j.lignes,
        journal: [
          { qui: "Vous", quoi: `avez dicté le devis (${dureeVocal(duree)})`, quand: plus(0) },
          { qui: "Daliro", quoi: `a transcrit la dictée et reconnu ${j.lignes.length} ouvrage${j.lignes.length > 1 ? "s" : ""}`, quand: plus(0) },
          ...(chiffrees ? [{ qui: "Daliro", quoi: `a chiffré ${chiffrees} ligne${chiffrees > 1 ? "s" : ""} sur la bibliothèque de prix`, quand: plus(0) }] : []),
          ...(manque ? [{ qui: "Daliro", quoi: `n'a pas trouvé de prix pour ${manque} ligne${manque > 1 ? "s" : ""} : ${manque > 1 ? "elles attendent" : "elle attend"} votre prix`, quand: plus(0) }] : []),
        ],
      });
      setPhase("fait");
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Daliro n'a pas pu faire le devis. Réessayez.");
      setPhase("pret");
    }
  }, []);

  const commencer = useCallback(() => {
    const Classe = classeReconnaissance();
    if (!Classe) {
      setErreur("Ce navigateur ne sait pas dicter : ouvrez la page dans Chrome, Edge ou Safari, écrivez la dictée, ou essayez l'exemple.");
      return;
    }
    setErreur(null);
    poserProvisoire("");
    const r = new Classe();
    r.lang = "fr-FR";
    r.continuous = true;
    r.interimResults = true;
    r.onresult = (e) => {
      let fin = "";
      let prov = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) fin += res[0].transcript;
        else prov += res[0].transcript;
      }
      if (fin.trim()) {
        const avant = texteRef.current.trimEnd();
        poserTexte(`${avant}${avant ? " " : ""}${fin.trim()}`);
      }
      poserProvisoire(prov.trim());
    };
    r.onerror = (e) => {
      if (e.error === "no-speech" || e.error === "aborted") return;
      ecoute.current = false;
      couperChrono();
      poserProvisoire("");
      setPhase("pret");
      setErreur(
        e.error === "not-allowed" || e.error === "service-not-allowed"
          ? "Le micro est refusé : autorisez-le pour cette page (icône à gauche de l'adresse), ou essayez l'exemple."
          : e.error === "audio-capture"
            ? "Aucun micro n'est branché : essayez l'exemple, ou écrivez la dictée."
            : "La dictée s'est coupée. Recommencez, ou écrivez la suite.",
      );
    };
    /* Chrome s'arrête seul après un silence : on relance tant qu'on écoute */
    r.onend = () => {
      if (ecoute.current) {
        try {
          r.start();
        } catch {
          ecoute.current = false;
        }
      }
    };
    reco.current = r;
    ecoute.current = true;
    try {
      r.start();
    } catch {
      ecoute.current = false;
      setErreur("La dictée n'a pas pu démarrer. Rechargez la page et réessayez.");
      return;
    }
    lancerChrono();
    setPhase("ecoute");
  }, [couperChrono, lancerChrono, poserProvisoire, poserTexte]);

  const arreter = useCallback(
    (puisDevis: boolean) => {
      ecoute.current = false;
      reco.current?.stop();
      couperChrono();
      /* les derniers mots encore provisoires restent dans la feuille */
      const p = provisoireRef.current;
      if (p) {
        const avant = texteRef.current.trimEnd();
        poserTexte(`${avant}${avant ? " " : ""}${p}`);
      }
      poserProvisoire("");
      if (puisDevis) void faireDevis();
      else setPhase("pret");
    },
    [couperChrono, faireDevis, poserProvisoire, poserTexte],
  );

  const exemple = useCallback(() => {
    setErreur(null);
    setDevis(null);
    poserTexte("");
    const mots = DICTEE_EXEMPLE.split(" ");
    let i = 0;
    lancerChrono();
    setPhase("exemple");
    if (lecture.current) window.clearInterval(lecture.current);
    lecture.current = window.setInterval(() => {
      i += 1;
      poserTexte(mots.slice(0, i).join(" "));
      poserProvisoire(i < mots.length ? (mots[i] ?? "") : "");
      if (i >= mots.length) {
        if (lecture.current) window.clearInterval(lecture.current);
        lecture.current = null;
        couperChrono();
        /* une dictée de ~25 s à l'oral */
        secondesRef.current = Math.max(secondesRef.current, Math.round(mots.length / 2.6));
        void faireDevis();
      }
    }, 170);
  }, [couperChrono, faireDevis, lancerChrono, poserProvisoire, poserTexte]);

  const recommencer = useCallback(() => {
    setDevis(null);
    setErreur(null);
    poserTexte("");
    poserProvisoire("");
    setSecondes(0);
    setPhase("pret");
  }, [poserProvisoire, poserTexte]);

  if (phase === "fait" && devis) {
    return (
      <div className="dal-dic-resultat">
        <div className="dal-dic-bandeau" role="status">
          <DalIcone nom="IssueStatusDone" taille={14} />
          <span>Devis fait à partir de votre dictée. Rien n&apos;est envoyé au client : relisez-le d&apos;abord.</span>
          <span className="dal-pousse" />
          <button type="button" className="dal-dic-bouton" onClick={recommencer}>
            <DalIcone nom="Mic" taille={14} />
            <span>Nouvelle dictée</span>
          </button>
        </div>
        <FicheDevis devis={devis} volet sansLien />
      </div>
    );
  }

  const occupe = phase === "ecoute" || phase === "exemple" || phase === "calcul";
  return (
    <div className="dal-tk">
      <header className="dal-tk-tete">
        <nav className="dal-tk-fil" aria-label="Fil d'Ariane">
          {retour ? (
            <>
              <Link href={retour.href} className="dal-tk-fil-lien">
                {retour.libelle}
              </Link>
              <span className="dal-tk-fil-sep" aria-hidden="true">
                ›
              </span>
            </>
          ) : null}
          <span className="dal-tk-fil-ticket">
            <h2>Dicter un devis</h2>
          </span>
        </nav>
      </header>
      <div className="dal-tk-defile">
        <div className="dal-dic">
          <h1 className="dal-dic-titre">Dicter un devis</h1>
          <p className="dal-dic-intro">
            Parlez comme sur le chantier : le client, l&apos;adresse, les travaux et les quantités. Daliro écrit pendant que vous parlez, puis fait le devis sur votre bibliothèque de prix ({BIBLIOTHEQUE_PRIX.length} ouvrages).
          </p>

          <div className="dal-dic-feuille" data-etat={phase}>
            <div className="dal-dic-feuille-tete">
              {phase === "ecoute" ? (
                <>
                  <span className="dal-dic-point" aria-hidden="true" />
                  <span>J&apos;écoute… {chrono(secondes)}</span>
                </>
              ) : phase === "exemple" ? (
                <>
                  <span className="dal-dic-point" aria-hidden="true" />
                  <span>Dictée d&apos;exemple… {chrono(secondes)}</span>
                </>
              ) : phase === "calcul" ? (
                <>
                  <span className="dal-dic-rouage" aria-hidden="true" />
                  <span>Daliro reconnaît les ouvrages et les chiffre…</span>
                </>
              ) : (
                <>
                  <DalIcone nom="Mic" taille={14} />
                  <span>{texte ? "Transcription : corrigez-la si besoin" : "La transcription s'écrit ici"}</span>
                </>
              )}
            </div>
            {occupe ? (
              <p ref={direct} className="dal-dic-texte" aria-live="polite">
                {texte}
                {provisoire ? <span className="dal-dic-provisoire"> {provisoire}</span> : null}
                {!texte && !provisoire ? <span className="dal-dic-provisoire">Parlez, le texte arrive…</span> : null}
              </p>
            ) : (
              <textarea
                className="dal-dic-texte"
                value={texte}
                onChange={(e) => poserTexte(e.target.value)}
                placeholder="« Devis pour Mme Thomas à Sainte-Anne. Salle d'eau de six mètres carrés, on dépose la baignoire… »"
                aria-label="Transcription de la dictée"
                rows={5}
              />
            )}
          </div>

          {erreur ? (
            <p className="dal-dic-erreur" role="alert">
              {erreur}
            </p>
          ) : null}

          <div className="dal-dic-boutons">
            {phase === "ecoute" ? (
              <>
                <button type="button" className="dal-dic-bouton dal-dic-bouton--plein" onClick={() => arreter(true)}>
                  <span className="dal-dic-carre" aria-hidden="true" />
                  <span>Arrêter et faire le devis</span>
                </button>
                <button type="button" className="dal-dic-bouton" onClick={() => arreter(false)}>
                  <span>Arrêter seulement</span>
                </button>
              </>
            ) : phase === "exemple" || phase === "calcul" ? (
              <button type="button" className="dal-dic-bouton dal-dic-bouton--plein" disabled>
                <span>{phase === "exemple" ? "Lecture de l'exemple…" : "Devis en cours…"}</span>
              </button>
            ) : (
              <>
                <button type="button" className="dal-dic-bouton dal-dic-bouton--plein" onClick={commencer}>
                  <DalIcone nom="Mic" taille={14} />
                  <span>{texte ? "Reprendre la dictée" : "Commencer la dictée"}</span>
                </button>
                {texte.trim() ? (
                  <button type="button" className="dal-dic-bouton" onClick={() => void faireDevis()}>
                    <DalIcone nom="Calculator" taille={14} />
                    <span>Faire le devis</span>
                  </button>
                ) : null}
                <button type="button" className="dal-dic-bouton" onClick={exemple}>
                  <DalIcone nom="Etoile" taille={14} />
                  <span>Essayer avec un exemple</span>
                </button>
                {texte ? (
                  <button type="button" className="dal-dic-bouton dal-dic-bouton--discret" onClick={recommencer}>
                    <span>Effacer</span>
                  </button>
                ) : null}
              </>
            )}
          </div>
          {!compatible ? <p className="dal-dic-note">Ce navigateur ne sait pas dicter (Firefox) : écrivez la dictée dans la feuille, ou essayez l&apos;exemple.</p> : null}

          <ol className="dal-dic-etapes">
            <li>
              <DalIcone nom="Mic" taille={14} />
              <span>
                <strong>Vous dictez</strong> sur place, après la visite.
              </span>
            </li>
            <li>
              <DalIcone nom="Write" taille={14} />
              <span>
                <strong>Daliro écrit</strong> la dictée, mot à mot.
              </span>
            </li>
            <li>
              <DalIcone nom="Calculator" taille={14} />
              <span>
                <strong>Daliro chiffre</strong> chaque ouvrage sur votre bibliothèque de prix et prépare le devis, prêt à relire.
              </span>
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}
