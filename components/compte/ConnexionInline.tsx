"use client";

/* ══════════════════════════════════════════════════════════════════════
   Le module de connexion — e-mail + mot de passe, code pour prouver
   l'adresse (02/09/2026, révisé le même jour)

   Première décision Teo du 02/09 : pas de mot de passe, un code à six
   chiffres à chaque fois. Révisée l'après-midi : le code ne sert qu'à
   PROUVER L'ADRESSE ; le quotidien se fait par MOT DE PASSE — sur le
   site comme sur le cockpit. D'où une petite machine à états, cinq
   modes :
     · « connexion » — e-mail + mot de passe (signInWithPassword). Erreur :
       « Adresse ou mot de passe incorrect. », avec deux issues, « Mot de
       passe oublié ? » et « Recevoir un code à la place ».
     · « creation »  — e-mail → code (signInWithOtp shouldCreateUser: true,
       puis verifyOtp type "email") → « Choisissez votre mot de passe »
       (+ prénom, nom, entreprise, téléphone quand `avecProfil`).
     · « code »      — e-mail → code → session ouverte ; si le compte n'a
       pas de mot de passe (mdp_defini absent — gérant invité par Teo), on
       enchaîne sur « Choisissez votre mot de passe ».
     · « reinit »    — e-mail → code → « Choisissez un nouveau mot de
       passe ».
     · « definir »   — déjà connecté : changer son mot de passe (/compte).
   Le mot de passe est enregistré par updateUser({ password, data:
   { mdp_defini: true, …profil } }) : le drapeau user_metadata.mdp_defini
   dit « ce compte a un mot de passe ». `onConnecte(u)` n'est appelé que
   lorsque la session est ouverte ET le mot de passe défini (ou déjà
   présent) — le parent décide de la suite.

   Le module sert à trois endroits, sans navigation : en pleine page sur
   /connexion (avec les deux portes en tête, `portes`), inline dans le
   parcours installation (PriseDeCreneau — le créneau choisi reste en
   état React), et dans « Mon compte » pour changer de mot de passe. Il
   rend ses propres <form> : il ne doit JAMAIS être posé à l'intérieur
   d'un autre <form> (revue 02/09, n° 3).

   Textes : sobres, insécable avant ? ! : ; on nomme la création de compte
   noir sur blanc (Teo, 02/09 : « je vois se connecter mais pas créer un
   compte, c'est normal ? »).

   À CONFIGURER PAR TEO dans Supabase Auth : le modèle « Magic Link » doit
   afficher {{ .Token }} (sinon l'e-mail porte un lien, pas un code) ; la
   longueur minimale de mot de passe à 8 (Auth → Passwords) — vérifiée
   ici aussi ; et le taux d'envoi : une adresse ne peut redemander un code
   qu'après 60 s — d'où le compte à rebours.
   ══════════════════════════════════════════════════════════════════════ */

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { MDP_LONGUEUR_MIN, signalerSession, utilisateurDepuis, type Utilisateur } from "@/lib/compte";

const DELAI_RENVOI_S = 60;
const NBSP = " "; // insécable, pour les intros en chaîne

export type ModeConnexion = "connexion" | "creation" | "code" | "reinit" | "definir";

type Props = {
  /* appelé quand la session est ouverte ET le mot de passe défini */
  onConnecte: (u: Utilisateur) => void;
  modeInitial?: ModeConnexion;
  /* titre et intro imposés par le contexte ; sinon ceux du mode courant.
     L'intro imposée ne vaut que pour le mode initial — les autres modes
     gardent la leur, qui explique leur geste. */
  titre?: string;
  intro?: string;
  /* une adresse déjà tapée dans le formulaire voisin, pour ne pas la
     redemander */
  emailInitial?: string;
  /* les deux portes en tête : « J'ai déjà un compte » / « Je crée mon
     compte » (pleine page /connexion) */
  portes?: boolean;
  /* en création : demander aussi prénom, nom, entreprise, téléphone.
     false dans PriseDeCreneau, où les coordonnées suivent juste après. */
  avecProfil?: boolean;
  /* mode « definir » : un bouton « Annuler », rendu par le parent sinon */
  onAnnuler?: () => void;
};

const TITRES: Record<ModeConnexion, string> = {
  connexion: "Se connecter",
  creation: "Créer mon compte",
  code: "Recevoir un code",
  reinit: "Mot de passe oublié",
  definir: "Mon mot de passe",
};

const INTROS: Record<ModeConnexion, string> = {
  connexion: "Votre adresse e-mail et votre mot de passe.",
  creation:
    `Votre adresse e-mail d'abord${NBSP}: vous recevez un code à six chiffres qui prouve qu'elle est à vous. Vous choisissez ensuite votre mot de passe.`,
  code:
    "Un code à six chiffres envoyé à votre adresse ouvre votre session, sans mot de passe pour cette fois.",
  reinit:
    `Votre adresse e-mail${NBSP}: vous recevez un code à six chiffres, puis vous choisissez un nouveau mot de passe.`,
  definir: `Choisissez un nouveau mot de passe${NBSP}: ${MDP_LONGUEUR_MIN} caractères minimum.`,
};

type Phase = "envoi" | "code" | "mdp" | "definir";

/* Les messages d'erreur de Supabase Auth sont en anglais et parlent en
   codes ; on parle en français, et on ne dit que ce qui aide à corriger. */
function lireErreur(e: { code?: string; status?: number; message: string }, phase: Phase): string {
  const m = e.message.toLowerCase();
  if (e.code === "over_email_send_rate_limit" || e.code === "over_request_rate_limit" || e.status === 429 || /rate limit|security purposes|seconds/.test(m)) {
    return phase === "envoi"
      ? `Un code vient d'être envoyé à cette adresse${NBSP}: patientez ${DELAI_RENVOI_S} secondes avant d'en demander un autre.`
      : "Trop de tentatives. Patientez un instant avant de réessayer.";
  }
  if (phase === "envoi") {
    if (e.code === "otp_disabled" || /signups not allowed/.test(m)) {
      return "Aucun compte n'existe avec cette adresse.";
    }
    if (e.code === "validation_failed" || e.code === "email_address_invalid" || /invalid|unable to validate/.test(m)) {
      return "Cette adresse e-mail n'est pas valide. Vérifiez-la et réessayez.";
    }
    if (e.code === "signup_disabled" || e.code === "email_provider_disabled") {
      return "L'envoi de codes est momentanément indisponible. Réessayez dans un instant.";
    }
    return "Le code n'est pas parti — vérifiez votre connexion et réessayez.";
  }
  if (phase === "code") {
    if (e.code === "otp_expired" || /expired|invalid/.test(m)) {
      return "Code incorrect ou expiré. Vérifiez les six chiffres, ou demandez un nouveau code.";
    }
    return "La vérification n'a pas abouti — réessayez, ou demandez un nouveau code.";
  }
  if (phase === "mdp") {
    if (e.code === "invalid_credentials" || /invalid login credentials/.test(m)) {
      return "Adresse ou mot de passe incorrect.";
    }
    if (e.code === "email_not_confirmed" || /not confirmed/.test(m)) {
      return "Cette adresse n'a pas encore été confirmée. Recevez un code pour la valider.";
    }
    return "La connexion n'a pas abouti — vérifiez votre connexion et réessayez.";
  }
  /* definir : updateUser({ password }) */
  if (e.code === "weak_password" || /at least|too short|weak/.test(m)) {
    return `${MDP_LONGUEUR_MIN} caractères minimum.`;
  }
  if (e.code === "same_password" || /different from the old/.test(m)) {
    return "Choisissez un mot de passe différent de l'ancien.";
  }
  if (e.code === "session_expired" || e.code === "session_not_found" || /session missing|not logged in|jwt/.test(m)) {
    return "Votre session a expiré. Reconnectez-vous, puis réessayez.";
  }
  return "Le mot de passe n'a pas été enregistré — réessayez.";
}

export default function ConnexionInline({
  onConnecte,
  modeInitial = "connexion",
  titre,
  intro,
  emailInitial = "",
  portes = false,
  avecProfil = true,
  onAnnuler,
}: Props) {
  const [mode, setMode] = useState<ModeConnexion>(modeInitial);
  /* pour les modes par code : l'adresse, puis le code, puis le mot de
     passe. « connexion » n'a qu'un écran, « definir » commence au dernier. */
  const [etape, setEtape] = useState<"email" | "code" | "definir">(
    modeInitial === "definir" ? "definir" : "email",
  );
  const [email, setEmail] = useState(emailInitial);
  const [mdp, setMdp] = useState("");
  const [mdp2, setMdp2] = useState("");
  const [voirMdp, setVoirMdp] = useState(false);
  const [code, setCode] = useState("");
  const [profil, setProfil] = useState({ prenom: "", nom: "", entreprise: "", telephone: "" });
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  /* secondes avant de pouvoir redemander un code */
  const [attente, setAttente] = useState(0);
  /* la personne dont l'adresse vient d'être prouvée (verifyOtp), en
     attendant qu'elle choisisse son mot de passe */
  const [prouve, setProuve] = useState<Utilisateur | null>(null);
  const champCode = useRef<HTMLInputElement | null>(null);
  const champMdp = useRef<HTMLInputElement | null>(null);
  /* garde synchrone contre le double envoi (un état React ne l'est pas) */
  const enCours = useRef(false);

  useEffect(() => {
    if (attente <= 0) return;
    const t = window.setTimeout(() => setAttente((a) => a - 1), 1000);
    return () => window.clearTimeout(t);
  }, [attente]);

  useEffect(() => {
    if (etape === "code") champCode.current?.focus();
    if (etape === "definir" && mode !== "definir") champMdp.current?.focus();
  }, [etape, mode]);

  const emailNet = email.trim().toLowerCase();
  const emailOk = /\S+@\S+\.\S+/.test(emailNet);
  const codeOk = /^\d{6}$/.test(code);
  const mdpOk = mdp.length >= MDP_LONGUEUR_MIN;
  const profilDemande = mode === "creation" && avecProfil;
  const profilOk = !profilDemande || Boolean(profil.prenom.trim() && profil.nom.trim() && profil.entreprise.trim());

  /* changer de mode garde l'adresse, efface le reste */
  const changerMode = (m: ModeConnexion) => {
    setMode(m);
    setEtape(m === "definir" ? "definir" : "email");
    setErreur(null);
    setCode("");
    setMdp("");
    setMdp2("");
    setVoirMdp(false);
    setProuve(null);
  };

  /* un seul appel réseau à la fois : posé AVANT le premier await, relâché
     dans tous les chemins de sortie */
  const verrouiller = () => {
    if (enCours.current) return false;
    enCours.current = true;
    setEnvoi(true);
    setErreur(null);
    return true;
  };
  const relacher = () => {
    enCours.current = false;
    setEnvoi(false);
  };

  /* ——— connexion : e-mail + mot de passe ——— */
  const connecterMdp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailOk || !mdp) return;
    if (!verrouiller()) return;
    const { data, error } = await createClient().auth.signInWithPassword({ email: emailNet, password: mdp });
    if (error || !data.user) {
      relacher();
      setErreur(error ? lireErreur(error, "mdp") : lireErreur({ message: "" }, "mdp"));
      return;
    }
    const u = utilisateurDepuis(data.user);
    if (!u) {
      relacher();
      setErreur("La session n'a pas pu s'ouvrir. Réessayez.");
      return;
    }
    /* le mot de passe vient de servir : le compte en a un, même si le
       drapeau manque (mot de passe posé à la main dans le dashboard) — on
       le pose au passage, sans attendre */
    if (!u.mdpDefini) {
      void createClient().auth.updateUser({ data: { mdp_defini: true } }).catch(() => {});
      u.mdpDefini = true;
    }
    relacher();
    signalerSession();
    onConnecte(u);
  };

  /* ——— code : envoi ——— */
  const envoyerCode = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!emailOk || attente > 0) return;
    if (!verrouiller()) return;
    const { error } = await createClient().auth.signInWithOtp({
      email: emailNet,
      /* seule la porte « Je crée mon compte » crée : les modes code et
         réinitialisation ne concernent qu'un compte qui existe */
      options: { shouldCreateUser: mode === "creation" },
    });
    relacher();
    if (error) {
      const message = lireErreur(error, "envoi");
      setErreur(message);
      /* limite de débit : on affiche quand même la saisie du code — un
         code précédent est peut-être encore valable dans la boîte */
      if (/patientez/.test(message)) {
        setAttente(DELAI_RENVOI_S);
        setEtape("code");
      }
      return;
    }
    setCode("");
    setAttente(DELAI_RENVOI_S);
    setEtape("code");
  };

  /* ——— code : vérification → session ouverte ——— */
  const verifier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codeOk) return;
    if (!verrouiller()) return;
    const { data, error } = await createClient().auth.verifyOtp({ email: emailNet, token: code, type: "email" });
    relacher();
    if (error || !data.user) {
      setErreur(error ? lireErreur(error, "code") : lireErreur({ message: "" }, "code"));
      return;
    }
    const u = utilisateurDepuis(data.user);
    if (!u) {
      setErreur("La session n'a pas pu s'ouvrir. Réessayez.");
      return;
    }
    signalerSession();
    /* réinitialisation : on choisit un nouveau mot de passe, toujours.
       Création ou secours : seulement si le compte n'en a pas encore. */
    if (mode === "reinit" || !u.mdpDefini) {
      setProuve(u);
      setEtape("definir");
      return;
    }
    onConnecte(u);
  };

  /* ——— définir / changer le mot de passe ——— */
  const definirMdp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mdpOk) {
      setErreur(`${MDP_LONGUEUR_MIN} caractères minimum.`);
      return;
    }
    if (mdp !== mdp2) {
      setErreur("Les deux mots de passe ne sont pas identiques.");
      return;
    }
    if (!profilOk) {
      setErreur("Prénom, nom et entreprise sont nécessaires.");
      return;
    }
    if (!verrouiller()) return;
    const donnees: Record<string, unknown> = { mdp_defini: true };
    if (profilDemande) {
      donnees.prenom = profil.prenom.trim();
      donnees.nom = profil.nom.trim();
      donnees.entreprise = profil.entreprise.trim();
      if (profil.telephone.trim()) donnees.telephone = profil.telephone.trim();
    }
    const { data, error } = await createClient().auth.updateUser({ password: mdp, data: donnees });
    relacher();
    if (error || !data.user) {
      setErreur(error ? lireErreur(error, "definir") : lireErreur({ message: "" }, "definir"));
      return;
    }
    const u = utilisateurDepuis(data.user) ?? (prouve ? { ...prouve, mdpDefini: true } : null);
    if (!u) {
      setErreur("La session n'a pas pu s'ouvrir. Réessayez.");
      return;
    }
    setMdp("");
    setMdp2("");
    signalerSession();
    onConnecte(u);
  };

  const parCode = mode === "creation" || mode === "code" || mode === "reinit";
  const lien = "underline underline-offset-2";
  const boutonClasse = (actif: boolean) => `r-btn shrink-0 ${!actif || envoi ? "rv-btn--attente" : "r-btn--noir"}`;

  return (
    /* keyé sur le mode : chaque écran (connexion, création, code, nouveau
       mot de passe) apparaît en fondu au lieu de sauter (02/09) */
    <div key={mode} className="rv-apparait rounded-xl border border-[#e3e3e3] bg-[#fafafa] p-5 sm:p-6">
      {portes ? (
        /* les deux portes — un sélecteur segmenté (.r-seg), comme le
           choix de profil sur /reserver-un-audit. « Mot de passe oublié »
           et « Recevoir un code » restent sous la première porte : ce
           sont des variantes de « j'ai déjà un compte ». */
        <div className="r-seg mb-5 flex w-full sm:inline-flex sm:w-auto">
          <button
            type="button"
            className="r-seg-btn flex-1 text-center sm:flex-none"
            data-actif={mode !== "creation"}
            aria-pressed={mode !== "creation"}
            onClick={() => changerMode("connexion")}
          >
            J&apos;ai déjà un compte
          </button>
          <button
            type="button"
            className="r-seg-btn flex-1 text-center sm:flex-none"
            data-actif={mode === "creation"}
            aria-pressed={mode === "creation"}
            onClick={() => changerMode("creation")}
          >
            Je crée mon compte
          </button>
        </div>
      ) : null}

      <h3 className="r-h4">{titre ?? TITRES[mode]}</h3>
      <p className="mt-2 max-w-[56ch] text-[15px] leading-[23px] text-[#3d3d3d]">
        {intro && mode === modeInitial ? intro : INTROS[mode]}
      </p>

      {erreur ? (
        <p className="rv-erreur mt-4" role="alert">
          {erreur}
        </p>
      ) : null}

      {/* ——— connexion : e-mail + mot de passe ——— */}
      {mode === "connexion" ? (
        <>
          <form onSubmit={connecterMdp} noValidate className="mt-5">
            <label className="rv-libelle" htmlFor="cx-email">
              Adresse e-mail
            </label>
            <input
              id="cx-email"
              type="email"
              className="rv-champ"
              autoComplete="username"
              inputMode="email"
              placeholder="vous@entreprise.gp"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <label className="rv-libelle mt-4" htmlFor="cx-mdp">
              Mot de passe
            </label>
            <div className="relative">
              <input
                id="cx-mdp"
                type={voirMdp ? "text" : "password"}
                className="rv-champ pr-24"
                autoComplete="current-password"
                value={mdp}
                onChange={(e) => setMdp(e.target.value)}
                required
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 mt-[3px] -translate-y-1/2 text-[13px] text-[#616161] underline underline-offset-2"
                onClick={() => setVoirMdp((v) => !v)}
                aria-pressed={voirMdp}
              >
                {voirMdp ? "Masquer" : "Afficher"}
              </button>
            </div>
            <div className="mt-5">
              <button type="submit" disabled={!emailOk || !mdp || envoi} className={boutonClasse(emailOk && Boolean(mdp))}>
                {envoi ? "Connexion…" : "Se connecter"}
              </button>
            </div>
          </form>
          <p className="r-note mt-4">
            <button type="button" className={lien} onClick={() => changerMode("reinit")}>
              Mot de passe oublié&nbsp;?
            </button>
            {" · "}
            <button type="button" className={lien} onClick={() => changerMode("code")}>
              Recevoir un code à la place
            </button>
          </p>
          {!portes ? (
            <p className="r-note mt-2">
              Pas encore de compte&nbsp;?{" "}
              <button type="button" className={lien} onClick={() => changerMode("creation")}>
                Créer mon compte
              </button>
            </p>
          ) : null}
        </>
      ) : null}

      {/* ——— par code, écran 1 : l'adresse ——— */}
      {parCode && etape === "email" ? (
        <>
          <form onSubmit={envoyerCode} noValidate className="mt-5">
            <label className="rv-libelle" htmlFor="cx-email">
              Adresse e-mail
            </label>
            <div className="mt-0 flex flex-col gap-3 sm:flex-row sm:items-end">
              <input
                id="cx-email"
                type="email"
                className="rv-champ sm:flex-1"
                autoComplete="email"
                inputMode="email"
                placeholder="vous@entreprise.gp"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <button type="submit" disabled={!emailOk || envoi} className={boutonClasse(emailOk)}>
                {envoi ? "Envoi…" : "Recevoir mon code"}
              </button>
            </div>
          </form>
          {mode === "creation" ? (
            !portes ? (
              <p className="r-note mt-4">
                Déjà un compte&nbsp;?{" "}
                <button type="button" className={lien} onClick={() => changerMode("connexion")}>
                  Se connecter
                </button>
              </p>
            ) : null
          ) : (
            <p className="r-note mt-4">
              <button type="button" className={lien} onClick={() => changerMode("connexion")}>
                ← Retour à la connexion
              </button>
              {" · "}
              Pas encore de compte&nbsp;?{" "}
              <button type="button" className={lien} onClick={() => changerMode("creation")}>
                Créer mon compte
              </button>
            </p>
          )}
        </>
      ) : null}

      {/* ——— par code, écran 2 : les six chiffres ——— */}
      {parCode && etape === "code" ? (
        <form onSubmit={verifier} noValidate className="mt-5">
          <p className="text-[14px] leading-[21px] text-[#3d3d3d]">
            Code envoyé à <span className="font-medium text-[#050505]">{emailNet}</span>.{" "}
            <button
              type="button"
              className={lien}
              onClick={() => {
                setEtape("email");
                setCode("");
                setErreur(null);
              }}
            >
              Changer d&apos;adresse
            </button>
          </p>
          <label className="rv-libelle mt-4" htmlFor="cx-code">
            Le code à six chiffres
          </label>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <input
              ref={champCode}
              id="cx-code"
              type="text"
              className="rv-champ num tracking-[0.3em] sm:max-w-[220px]"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              autoComplete="one-time-code"
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              required
            />
            <button type="submit" disabled={!codeOk || envoi} className={boutonClasse(codeOk)}>
              {envoi ? "Vérification…" : "Continuer"}
            </button>
          </div>
          <p className="r-note mt-3">
            Rien reçu&nbsp;? Regardez les indésirables.{" "}
            {attente > 0 ? (
              <span>Nouveau code possible dans {attente}&nbsp;s.</span>
            ) : (
              <button type="button" className={lien} onClick={() => envoyerCode()} disabled={envoi}>
                Renvoyer un code
              </button>
            )}
          </p>
        </form>
      ) : null}

      {/* ——— le mot de passe : le choisir, ou le changer ——— */}
      {etape === "definir" ? (
        <form onSubmit={definirMdp} noValidate className="mt-5">
          {prouve ? (
            <p className="text-[14px] leading-[21px] text-[#3d3d3d]">
              Adresse confirmée&nbsp;: <span className="font-medium text-[#050505]">{prouve.email}</span>.
              {mode === "reinit" ? null : " Il ne manque plus que votre mot de passe."}
            </p>
          ) : null}
          {/* l'adresse, pour que le gestionnaire de mots de passe range le
              couple identifiant / mot de passe — jamais modifiable ici */}
          {prouve || email ? (
            <input type="email" autoComplete="username" value={prouve?.email ?? emailNet} readOnly tabIndex={-1} className="sr-only" aria-hidden />
          ) : null}

          {profilDemande ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="rv-libelle" htmlFor="cx-prenom">Prénom</label>
                <input id="cx-prenom" className="rv-champ" autoComplete="given-name" value={profil.prenom} onChange={(e) => setProfil((p) => ({ ...p, prenom: e.target.value }))} required />
              </div>
              <div>
                <label className="rv-libelle" htmlFor="cx-nom">Nom</label>
                <input id="cx-nom" className="rv-champ" autoComplete="family-name" value={profil.nom} onChange={(e) => setProfil((p) => ({ ...p, nom: e.target.value }))} required />
              </div>
              <div>
                <label className="rv-libelle" htmlFor="cx-entreprise">Nom de l&apos;entreprise</label>
                <input id="cx-entreprise" className="rv-champ" autoComplete="organization" value={profil.entreprise} onChange={(e) => setProfil((p) => ({ ...p, entreprise: e.target.value }))} required />
              </div>
              <div>
                <label className="rv-libelle" htmlFor="cx-tel">
                  Téléphone / WhatsApp <small>— conseillé</small>
                </label>
                <input id="cx-tel" type="tel" className="rv-champ" autoComplete="tel" placeholder="0690 …" value={profil.telephone} onChange={(e) => setProfil((p) => ({ ...p, telephone: e.target.value }))} />
              </div>
            </div>
          ) : null}

          <label className={`rv-libelle ${profilDemande || prouve ? "mt-4" : ""}`} htmlFor="cx-mdp-neuf">
            {mode === "reinit" || mode === "definir" ? "Nouveau mot de passe" : "Votre mot de passe"}{" "}
            <small>— {MDP_LONGUEUR_MIN} caractères minimum</small>
          </label>
          <div className="relative">
            <input
              ref={champMdp}
              id="cx-mdp-neuf"
              type={voirMdp ? "text" : "password"}
              className="rv-champ pr-24"
              autoComplete="new-password"
              minLength={MDP_LONGUEUR_MIN}
              value={mdp}
              onChange={(e) => setMdp(e.target.value)}
              required
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 mt-[3px] -translate-y-1/2 text-[13px] text-[#616161] underline underline-offset-2"
              onClick={() => setVoirMdp((v) => !v)}
              aria-pressed={voirMdp}
            >
              {voirMdp ? "Masquer" : "Afficher"}
            </button>
          </div>
          <label className="rv-libelle mt-4" htmlFor="cx-mdp-bis">
            Confirmez-le
          </label>
          <input
            id="cx-mdp-bis"
            type={voirMdp ? "text" : "password"}
            className="rv-champ"
            autoComplete="new-password"
            minLength={MDP_LONGUEUR_MIN}
            value={mdp2}
            onChange={(e) => setMdp2(e.target.value)}
            required
          />
          <div className="mt-5 flex flex-wrap items-center gap-4">
            <button
              type="submit"
              disabled={!mdpOk || !mdp2 || !profilOk || envoi}
              className={boutonClasse(mdpOk && Boolean(mdp2) && profilOk)}
            >
              {envoi
                ? "Enregistrement…"
                : mode === "creation"
                  ? "Créer mon compte"
                  : mode === "code"
                    ? "Enregistrer et continuer"
                    : "Enregistrer le mot de passe"}
            </button>
            {mode === "definir" && onAnnuler ? (
              <button type="button" className="r-lien" onClick={onAnnuler}>
                Annuler
              </button>
            ) : null}
          </div>
        </form>
      ) : null}
    </div>
  );
}
