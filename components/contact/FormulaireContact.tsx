"use client";

import { useState } from "react";
import { CANAL_VALEUR, COURRIEL, lienContact, lienCourriel } from "@/lib/reservation";

/* ══════════════════════════════════════════════════════════════════════
   Le formulaire du service client (08/09/2026)

   Demande de l'associé : « un formulaire comme pour l'audit, avec un carré
   pour que la personne puisse écrire ». Mêmes champs et mêmes classes que
   le formulaire de réservation (components/reservation/PriseDeCreneau.tsx :
   .rv-libelle, .rv-champ, .rv-erreur, pot de miel .rv-miel), un sujet à
   choisir et le message en grand.

   Le message part par e-mail à contact@omegaai.fr (POST /api/contact, qui
   passe par le service d'envoi), avec l'adresse du client en « répondre
   à » : depuis leur boîte, les associés répondent d'un clic. Rien n'est
   stocké ici. Tant que la clé d'envoi n'est pas posée sur le projet du
   site (RESEND_API_KEY, voir app/api/contact/route.ts), l'API répond
   « indisponible » et le formulaire montre les deux autres portes,
   WhatsApp et l'adresse — jamais un échec muet.

   Un robot pris au pot de miel reçoit l'écran « Message envoyé » : même
   règle que la réservation, on ne lui apprend rien.
   ══════════════════════════════════════════════════════════════════════ */

const SUJETS = [
  { valeur: "installation", libelle: "Mon installation ou ma réunion" },
  { valeur: "abonnement", libelle: "Mon abonnement ou une facture" },
  { valeur: "poste", libelle: "Un poste en service" },
  { valeur: "application", libelle: "L'application sur mon téléphone ou mon ordinateur" },
  { valeur: "site", libelle: "Mon site" },
  { valeur: "autre", libelle: "Autre chose" },
];

type Champs = {
  prenom: string;
  nom: string;
  entreprise: string;
  email: string;
  telephone: string;
  sujet: string;
  message: string;
  x7: string; // pot de miel — un humain ne le voit jamais
};

const VIDE: Champs = {
  prenom: "",
  nom: "",
  entreprise: "",
  email: "",
  telephone: "",
  sujet: "",
  message: "",
  x7: "",
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function FormulaireContact() {
  const [c, setC] = useState<Champs>(VIDE);
  const [etat, setEtat] = useState<"saisie" | "envoi" | "fait" | "indisponible" | "erreur">("saisie");

  const maj =
    (k: keyof Champs) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setC((prev) => ({ ...prev, [k]: e.target.value }));

  const champsOk =
    c.prenom.trim().length > 0 &&
    c.nom.trim().length > 0 &&
    EMAIL.test(c.email.trim()) &&
    c.sujet !== "" &&
    c.message.trim().length >= 10;

  async function envoyer(e: React.FormEvent) {
    e.preventDefault();
    if (!champsOk || etat === "envoi") return;
    setEtat("envoi");
    try {
      const r = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(c),
      });
      if (r.ok) {
        setEtat("fait");
        return;
      }
      setEtat(r.status === 503 ? "indisponible" : "erreur");
    } catch {
      setEtat("erreur");
    }
  }

  if (etat === "fait") {
    return (
      <div className="ap-carte">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#050505]">
          <svg aria-hidden width="18" height="14" viewBox="0 0 18 14" fill="none">
            <path d="M1.5 7.5 6.5 12.5 16.5 1.5" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h2 className="r-h4 mt-5">Message envoyé.</h2>
        <p className="mt-3 max-w-[54ch] text-[15px] leading-[24px] text-[#3d3d3d]">
          On vous répond dans les deux jours ouvrés, souvent plus vite, à l&apos;adresse{" "}
          <span className="font-semibold text-[#050505]">{c.email.trim()}</span>
          {c.telephone.trim() ? " — ou sur WhatsApp si c'est plus simple" : ""}.
        </p>
      </div>
    );
  }

  const sujetLibelle = SUJETS.find((s) => s.valeur === c.sujet)?.libelle ?? "Service client";
  const secours = `${sujetLibelle} — ${c.prenom} ${c.nom}`.trim();

  return (
    <form onSubmit={envoyer} noValidate className="ap-carte">
      <h2 className="r-h4">Écrivez-nous</h2>
      <p className="ap-sous">Réponse dans les deux jours ouvrés, souvent le jour même</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="rv-libelle" htmlFor="ct-prenom">Prénom</label>
          <input id="ct-prenom" className="rv-champ" autoComplete="given-name" value={c.prenom} onChange={maj("prenom")} required />
        </div>
        <div>
          <label className="rv-libelle" htmlFor="ct-nom">Nom</label>
          <input id="ct-nom" className="rv-champ" autoComplete="family-name" value={c.nom} onChange={maj("nom")} required />
        </div>
        <div>
          <label className="rv-libelle" htmlFor="ct-email">Adresse e-mail</label>
          <input id="ct-email" type="email" className="rv-champ" autoComplete="email" value={c.email} onChange={maj("email")} required />
        </div>
        <div>
          <label className="rv-libelle" htmlFor="ct-tel">
            Téléphone / WhatsApp <small>— facultatif</small>
          </label>
          <input id="ct-tel" type="tel" className="rv-champ" autoComplete="tel" placeholder="0690 …" value={c.telephone} onChange={maj("telephone")} />
        </div>
        <div>
          <label className="rv-libelle" htmlFor="ct-entreprise">
            Nom de l&apos;entreprise <small>— facultatif</small>
          </label>
          <input id="ct-entreprise" className="rv-champ" autoComplete="organization" value={c.entreprise} onChange={maj("entreprise")} />
        </div>
        <div>
          <label className="rv-libelle" htmlFor="ct-sujet">Votre demande concerne</label>
          <select id="ct-sujet" className="rv-champ" value={c.sujet} onChange={maj("sujet")} required>
            <option value="" disabled>Choisir…</option>
            {SUJETS.map((s) => (
              <option key={s.valeur} value={s.valeur}>{s.libelle}</option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="rv-libelle" htmlFor="ct-message">Votre message</label>
          <textarea
            id="ct-message"
            rows={6}
            className="rv-champ resize-y"
            placeholder="Dites-nous ce qui se passe, avec le plus de détails possible : ce que vous attendiez, ce que vous avez vu, depuis quand."
            value={c.message}
            onChange={maj("message")}
            required
          />
        </div>
        {/* pot de miel — mêmes précautions que la réservation : libellé
            neutre, nom sans signification, autocomplete one-time-code */}
        <div className="rv-miel" aria-hidden="true">
          <label htmlFor="ct-x7">Ne pas remplir</label>
          <input id="ct-x7" name="ct-x7" tabIndex={-1} autoComplete="one-time-code" value={c.x7} onChange={maj("x7")} />
        </div>
      </div>

      {etat === "indisponible" ? (
        <p className="rv-erreur mt-4" role="alert">
          L&apos;envoi depuis le site n&apos;est pas encore ouvert. Écrivez-nous directement à{" "}
          <a href={lienCourriel(secours)} className="underline underline-offset-2">{COURRIEL}</a>, ou sur
          WhatsApp au{" "}
          <a href={lienContact(secours)} className="underline underline-offset-2">{CANAL_VALEUR}</a>.
        </p>
      ) : null}
      {etat === "erreur" ? (
        <p className="rv-erreur mt-4" role="alert">
          Le message n&apos;est pas parti. Réessayez dans un instant, ou écrivez-nous à{" "}
          <a href={lienCourriel(secours)} className="underline underline-offset-2">{COURRIEL}</a>.
        </p>
      ) : null}

      <div className="mt-7 flex flex-wrap items-center gap-4">
        <button type="submit" disabled={!champsOk || etat === "envoi"} className={`r-btn w-full sm:w-auto ${champsOk && etat !== "envoi" ? "r-btn--noir" : "rv-btn--attente"}`}>
          {etat === "envoi" ? "Envoi…" : "Envoyer mon message"}
        </button>
        <p className="r-note max-w-[40ch]">
          Vos coordonnées ne servent qu&apos;à vous répondre. Rien n&apos;est cédé, rien n&apos;est
          revendu.
        </p>
      </div>
    </form>
  );
}
