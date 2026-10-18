"use client";

/* La porte du pilotage (09/10/2026), dans le style sombre du tableau de
   bord. Deux façons d'entrer, toutes deux SUR PLACE (jamais de renvoi
   vers le cockpit, qui est l'ancien tableau de bord — retour de Teo) :
     · e-mail + mot de passe ;
     · un code à six chiffres reçu par e-mail (signInWithOtp sans création
       de compte, puis verifyOtp type « email »).
   Après connexion, on recharge : le layout décide si la personne entre. */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import "@/components/espace2/espace2.css";
import "./omega.css";

type Mode = "mdp" | "email-code" | "code";

export default function PorteOmega({ police }: { police: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("mdp");
  const [email, setEmail] = useState("");
  const [mdp, setMdp] = useState("");
  const [code, setCode] = useState("");
  const [erreur, setErreur] = useState("");
  const [info, setInfo] = useState("");
  const [envoi, setEnvoi] = useState(false);
  useEffect(() => {
    const html = document.documentElement;
    html.classList.add(police, "v2-actif");
    return () => html.classList.remove(police, "v2-actif");
  }, [police]);

  const adresse = email.trim().toLowerCase();

  async function soumettre(e: { preventDefault: () => void }) {
    e.preventDefault();
    setEnvoi(true);
    setErreur("");
    const auth = createClient().auth;
    if (mode === "mdp") {
      const { error } = await auth.signInWithPassword({ email: adresse, password: mdp });
      setEnvoi(false);
      if (error) return setErreur("Adresse ou mot de passe incorrect. Vous pouvez aussi recevoir un code par e-mail.");
      return router.refresh();
    }
    if (mode === "email-code") {
      const { error } = await auth.signInWithOtp({ email: adresse, options: { shouldCreateUser: false } });
      setEnvoi(false);
      if (error) return setErreur(/rate|seconds|limit/i.test(error.message) ? "Un code vient d'être envoyé : patientez une minute avant d'en redemander un." : "Impossible d'envoyer le code à cette adresse.");
      setInfo(`Code envoyé à ${adresse}. Il arrive en moins d'une minute.`);
      return setMode("code");
    }
    const { error } = await auth.verifyOtp({ email: adresse, token: code.trim(), type: "email" });
    setEnvoi(false);
    if (error) return setErreur("Code incorrect ou expiré.");
    router.refresh();
  }

  const pret = mode === "mdp" ? !!adresse && !!mdp : mode === "email-code" ? !!adresse : /^\d{6,8}$/.test(code.trim());

  return (
    <div className="v2 om-porte">
      <form className="v2-carte om-porte-boite" onSubmit={soumettre} noValidate>
        <span className="om-marque">
          <span className="v2-marque-omega" aria-hidden="true">
            {/* eslint-disable-next-line @next/next/no-img-element -- le logo Omega, déjà à sa taille */}
            <img src="/logo-pegase-blanc.png" alt="" width={20} height={20} className="om-logo-sombre" />
            {/* eslint-disable-next-line @next/next/no-img-element -- la variante noire, pour le thème clair */}
            <img src="/logo-pegase.png" alt="" width={20} height={20} className="om-logo-clair" />
          </span>
          <span className="v2-equipe-nom">Omega</span>
        </span>
        <h1 className="om-porte-titre">Pilotage</h1>
        <p className="v2-gris om-porte-texte">{mode === "code" ? info : "Espace réservé. Connectez-vous avec votre adresse."}</p>

        {mode !== "code" ? (
          <>
            <label className="om-label" htmlFor="porte-email">
              Adresse e-mail
            </label>
            <span className="v2-champ">
              <input id="porte-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </span>
          </>
        ) : null}
        {mode === "mdp" ? (
          <>
            <label className="om-label" htmlFor="porte-mdp">
              Mot de passe
            </label>
            <span className="v2-champ">
              <input id="porte-mdp" type="password" autoComplete="current-password" value={mdp} onChange={(e) => setMdp(e.target.value)} />
            </span>
          </>
        ) : null}
        {mode === "code" ? (
          <>
            <label className="om-label" htmlFor="porte-code">
              Code reçu par e-mail
            </label>
            <span className="v2-champ">
              <input id="porte-code" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} autoFocus />
            </span>
          </>
        ) : null}

        {erreur ? (
          <p className="om-porte-erreur" role="alert">
            {erreur}
          </p>
        ) : null}
        <button type="submit" className="v2-btn v2-btn--primaire om-porte-bouton" disabled={envoi || !pret}>
          {envoi ? "Un instant…" : mode === "mdp" ? "Se connecter" : mode === "email-code" ? "Recevoir un code" : "Entrer"}
        </button>
        <button
          type="button"
          className="om-porte-lien"
          onClick={() => {
            setErreur("");
            setMode(mode === "mdp" ? "email-code" : "mdp");
          }}
        >
          {mode === "mdp" ? "Pas de mot de passe ? Recevoir un code par e-mail" : "Utiliser mon mot de passe"}
        </button>
      </form>
    </div>
  );
}
