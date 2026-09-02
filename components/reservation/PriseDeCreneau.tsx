"use client";

/* ══════════════════════════════════════════════════════════════════════
   Prise de créneau — le module de réservation en ligne (28/08/2026)

   Remplace le bouton WhatsApp comme voie principale : le visiteur choisit
   un jour dans le calendrier, une heure, laisse ses coordonnées, et le
   créneau est bloqué dans l'armoire OMEGA-Core — il apparaît dans
   l'agenda du cockpit. WhatsApp reste la voie de secours, en bas.

   DEUX PARCOURS, un seul module :
   · « installation » (/installation) — après le choix des postes sur
     /tarifs : réunion de réglage de 45 min, récapitulatif postes + prix ;
   · « audit » (/reserver) — les formats de /reserver-un-audit ; les deux
     formats sur place (site, atelier) n'ont pas de calendrier : la
     demande part « à traiter » et reçoit un devis.

   Étapes : créneau → coordonnées → fait. Le jour et l'heure se

   choisissent en heure de GUADELOUPE (annoncé sous le calendrier, avec
   l'équivalent chez le visiteur quand son fuseau diffère).

   La validation de fond (chevauchement, horaires, anti-abus) vit dans la
   fonction SQL reserver_audit — voir lib/creneaux.ts. Ici : présentation,
   et un pot de miel (champ invisible) qui écarte les robots sans CAPTCHA.

   02/09 — LE COMPTE CLIENT, pour le parcours « installation » SEULEMENT
   (décision Teo : l'audit et les devis restent libres, sans compte).
   À l'étape des coordonnées, sans session, le module de connexion
   (ConnexionInline — e-mail + mot de passe, avec le lien vers la création
   de compte ; décision révisée du 02/09) se pose AU-DESSUS du formulaire,
   qui reste désactivé tant qu'on n'est pas connecté ; le jour et l'heure
   choisis restent en état React — aucune navigation, rien à re-choisir.
   Le module rend ses propres <form> : il est posé AVANT le formulaire
   des coordonnées, jamais dedans (revue 02/09, n° 3 — un submit du module
   remontait jusqu'à envoyer()). Connecté : l'e-mail est celui du compte
   (pré-rempli, non modifiable — « Ce n'est pas vous ? Changer de compte »
   pour en sortir, revue n° 7), prénom/nom/entreprise/téléphone viennent du
   profil s'ils y sont, et la réservation part avec le jeton de session
   pour que la fonction SQL rattache la demande au compte. La session
   initiale vient du serveur (prop `utilisateur`, lue dans les cookies par
   app/installation/page.tsx) ; onAuthStateChange prend le relais pour la
   connexion faite en ligne. Parcours « audit » : zéro changement.
   ══════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import ConnexionInline from "@/components/compte/ConnexionInline";
import { signalerSession, utilisateurDepuis, type Utilisateur } from "@/lib/compte";
import { createClient } from "@/lib/supabase/client";
import {
  DUREES_RDV,
  ERREURS,
  SECTEURS,
  aujourdhuiGp,
  chargerAgenda,
  creneauxDuJour,
  heureGp,
  heureVisiteur,
  horizonGp,
  jourGpLabel,
  moisLabel,
  reserver,
  type Agenda,
} from "@/lib/creneaux";
import { SystemLogo } from "@/components/logos";
import { POSTES, prixPour } from "@/lib/paliers";
import { PROFILS, lienContact } from "@/lib/reservation";

/* ——— catalogue des formats réservables sur /reserver ———
   28/08, 3ᵉ passe (Teo) : UNIQUEMENT les formats d'organisation — depuis
   que l'audit est la porte des équipes, proposer ici le Diagnostic ou
   l'Audit complet des indépendants n'avait plus de sens. Les anciens ids
   restent acceptés par la fonction SQL ; un lien qui en porte un retombe
   sur le format par défaut. */
type Format = {
  id: string;
  nom: string;
  duree: string;
  profil: "tpe" | "equipe";
  conditions: string;
  surDevis: boolean;
};
const FORMATS: Format[] = PROFILS[1].formules.map((f) => ({
  id: f.id,
  nom: f.nom,
  duree: f.duree,
  profil: "equipe" as const,
  conditions: f.conditions,
  surDevis: DUREES_RDV[f.id] === null,
}));

type Etape = "creneau" | "coordonnees" | "fait";

type Props = {
  parcours: "installation" | "audit";
  formuleInitiale?: string;
  postes?: string[];
  /* 02/09 — la session lue côté serveur (parcours installation). Absent
     ou null : personne de connecté. Le parcours audit ne le passe pas. */
  utilisateur?: Utilisateur | null;
};

export default function PriseDeCreneau({ parcours, formuleInitiale, postes = [], utilisateur }: Props) {
  /* ——— le verrou compte (02/09) : installation seulement ——— */
  const verrou = parcours === "installation";
  const [util, setUtil] = useState<Utilisateur | null>(verrou ? (utilisateur ?? null) : null);

  /* ——— quoi ——— */
  const [formule, setFormule] = useState(() => {
    if (parcours === "installation") return "reglage";
    return FORMATS.some((f) => f.id === formuleInitiale) ? (formuleInitiale as string) : "process";
  });
  const format = FORMATS.find((f) => f.id === formule);
  const surDevis = parcours === "audit" && (format?.surDevis ?? false);
  const dureeMin = DUREES_RDV[formule] ?? null;

  const postesValides = useMemo(
    () => POSTES.filter((p) => postes.includes(p.id)),
    [postes],
  );
  const prix = parcours === "installation" ? prixPour(postesValides.length || 1) : null;

  /* ——— quand ——— */
  const [agenda, setAgenda] = useState<Agenda | null>(null);
  const [chargement, setChargement] = useState(true);
  const [vue, setVue] = useState(() => {
    const a = aujourdhuiGp();
    return { annee: a.annee, mois: a.mois };
  });
  const [jour, setJour] = useState<number | null>(null);
  const [creneau, setCreneau] = useState<number | null>(null);

  const rechargerAgenda = () => {
    setChargement(true);
    chargerAgenda()
      .then(setAgenda)
      .catch(() => setAgenda(null))
      .finally(() => setChargement(false));
  };
  useEffect(rechargerAgenda, []);

  /* disponibilité de chaque jour du mois affiché */
  const joursDuMois = useMemo(() => {
    if (!agenda || !dureeMin) return new Map<number, number[]>();
    const m = new Map<number, number[]>();
    const nb = new Date(Date.UTC(vue.annee, vue.mois, 0)).getUTCDate();
    for (let j = 1; j <= nb; j++) {
      const libres = creneauxDuJour(agenda, vue.annee, vue.mois, j, dureeMin);
      if (libres.length) m.set(j, libres);
    }
    return m;
  }, [agenda, vue, dureeMin]);

  /* bornes de navigation : du mois courant au mois du dernier jour
     réservable (J+70, en date calendaire GUADELOUPE — horizonGp fait la
     conversion dans le bon sens, voir lib/creneaux.ts). */
  const auj = aujourdhuiGp();
  const fin = horizonGp();
  const peutReculer = vue.annee * 12 + vue.mois > auj.annee * 12 + auj.mois;
  const peutAvancer = vue.annee * 12 + vue.mois < fin.annee * 12 + fin.mois;
  const bougerMois = (sens: 1 | -1) =>
    setVue((v) => {
      let m = v.mois + sens;
      let a = v.annee;
      if (m === 0) { m = 12; a -= 1; }
      if (m === 13) { m = 1; a += 1; }
      setJour(null);
      setCreneau(null);
      return { annee: a, mois: m };
    });

  /* décalage du 1ᵉʳ du mois (lundi en tête) */
  const cale = (() => {
    const d = new Date(Date.UTC(vue.annee, vue.mois - 1, 1, 12)).getUTCDay();
    return d === 0 ? 6 : d - 1;
  })();
  const nbJours = new Date(Date.UTC(vue.annee, vue.mois, 0)).getUTCDate();

  /* ——— qui ——— */
  const [etape, setEtape] = useState<Etape>(surDevis ? "coordonnees" : "creneau");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [refId, setRefId] = useState<string | null>(null);
  const [c, setC] = useState({
    /* 02/09 — déjà connecté à l'arrivée (installation) : l'e-mail du
       compte, et ce qui a été rangé sur le profil (à la création du
       compte sur /connexion, ou après une précédente réservation) */
    prenom: util?.prenom ?? "",
    nom: util?.nom ?? "",
    email: util?.email ?? "",
    entreprise: util?.entreprise ?? "",
    secteur: "",
    telephone: util?.telephone ?? "",
    commune: "",
    message: "",
    site_web: "", // pot de miel — un humain ne le voit jamais
  });
  const maj = (cle: keyof typeof c) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setC((prev) => ({ ...prev, [cle]: e.target.value }));

  /* 02/09 — la connexion (inline, ou dans un autre onglet) : on retient
     l'utilisateur ET on remplit le formulaire — l'e-mail est celui du
     compte (verrouillé), le reste vient des user_metadata s'il y est,
     sans jamais écraser ce que le visiteur a déjà tapé. Une seule
     fonction, appelée depuis les rappels (pas depuis un effet). */
  const connecter = (u: Utilisateur | null) => {
    setUtil(u);
    if (!u) return;
    setC((prev) => ({
      ...prev,
      email: u.email,
      prenom: prev.prenom || u.prenom || "",
      nom: prev.nom || u.nom || "",
      entreprise: prev.entreprise || u.entreprise || "",
      telephone: prev.telephone || u.telephone || "",
    }));
  };

  /* 02/09 (revue n° 7) — « Ce n'est pas vous ? » : quelqu'un connecté
     avec la mauvaise adresse (perso au lieu de pro, session d'un autre
     onglet) sort d'ici sans quitter la page — signOut côté client (le
     formulaire POST /auth/signout naviguerait, et perdrait le créneau),
     puis retour au module de connexion ; le créneau et les champs
     restent, l'e-mail redevient libre. */
  const [changement, setChangement] = useState(false);
  const changerDeCompte = async () => {
    if (changement) return;
    setChangement(true);
    try {
      await createClient().auth.signOut();
    } catch {
      /* déjà déconnecté, ou réseau absent : on se déconnecte quand même
         localement — la prochaine réservation exigera un vrai jeton */
    }
    setChangement(false);
    setErreur(null);
    setC((prev) => ({ ...prev, email: "" }));
    connecter(null);
    signalerSession();
  };
  useEffect(() => {
    if (!verrou) return;
    const { data } = createClient().auth.onAuthStateChange((evt, session) => {
      /* INITIAL_SESSION sans session : le serveur, lui, a peut-être vu un
         jeton valide (cookies) — on ne contredit pas le rendu initial sur
         un événement qui ne prouve rien. Tout autre événement fait foi. */
      if (evt === "INITIAL_SESSION" && !session) return;
      connecter(session?.user ? utilisateurDepuis(session.user) : null);
    });
    return () => data.subscription.unsubscribe();
  }, [verrou]);

  /* le formulaire attend la connexion (installation sans session) */
  const bloque = verrou && !util;

  const champsOk =
    c.prenom.trim() && c.nom.trim() && /\S+@\S+\.\S+/.test(c.email) && c.entreprise.trim() && c.secteur;

  /* 02/09 (revue n° 2) — garde SYNCHRONE contre le double envoi. Un état
     React (`envoi`) ne l'est pas : entre le premier await (getSession,
     qui peut attendre un rafraîchissement de jeton pendant des centaines
     de ms) et setEnvoi(true), un double clic relançait envoyer() et deux
     RPC partaient — la seconde recevait « créneau pris » et remettait le
     calendrier à zéro alors que la première avait réussi. Le ref est
     posé avant tout await et relâché dans tous les chemins de sortie. */
  const enCours = useRef(false);

  const envoyer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!champsOk || envoi || enCours.current) return;
    enCours.current = true;
    setEnvoi(true);
    setErreur(null);
    try {
      await envoyerVraiment();
    } finally {
      enCours.current = false;
      setEnvoi(false);
    }
  };

  const envoyerVraiment = async () => {
    /* robot pris au pot de miel : on fait comme si tout allait bien */
    if (c.site_web) {
      setEtape("fait");
      return;
    }

    /* 02/09 — le verrou, AVANT tout envoi : pas de session, pas de
       réservation d'installation. Le jeton est relu au moment de l'envoi
       (getSession rafraîchit s'il a expiré pendant la saisie). */
    let jeton: string | undefined;
    if (verrou) {
      if (!util) {
        setErreur("connexion_requise");
        return;
      }
      const { data } = await createClient().auth.getSession();
      jeton = data.session?.access_token;
      if (!jeton) {
        setUtil(null);
        setErreur("connexion_requise");
        return;
      }
    }

    const rep = await reserver(
      {
        parcours: parcours === "installation" ? "reglage" : surDevis ? "devis" : "audit",
        formule,
        profil: parcours === "installation" ? "" : (format?.profil ?? ""),
        nom: c.nom,
        prenom: c.prenom,
        email: c.email,
        entreprise: c.entreprise,
        secteur: c.secteur,
        telephone: c.telephone || undefined,
        commune: c.commune || undefined,
        message: c.message || undefined,
        creneau: surDevis ? undefined : (creneau ?? undefined),
        modules: parcours === "installation" ? postesValides.map((p) => p.id) : undefined,
      },
      jeton,
    );

    if (rep.ok) {
      setRefId(rep.id);
      setEtape("fait");
      /* prénom, nom, entreprise et téléphone rangés sur le compte pour la
         prochaine fois — au mieux, sans attendre ni bloquer : la
         réservation est déjà faite. updateUser fusionne les user_metadata
         (mdp_defini reste). */
      if (verrou && util) {
        const profil = {
          prenom: c.prenom.trim(),
          nom: c.nom.trim(),
          entreprise: c.entreprise.trim(),
          telephone: c.telephone.trim() || undefined,
        };
        const change =
          profil.prenom !== (util.prenom ?? "") ||
          profil.nom !== (util.nom ?? "") ||
          profil.entreprise !== (util.entreprise ?? "") ||
          (profil.telephone ?? "") !== (util.telephone ?? "");
        if (change) {
          void createClient()
            .auth.updateUser({ data: profil })
            .catch(() => {});
        }
      }
      return;
    }
    setErreur(rep.erreur);
    /* la session a sauté entre-temps (jeton refusé) : retour au module de
       connexion, le créneau et les champs restent */
    if (rep.erreur === "connexion_requise") setUtil(null);
    /* créneau invalide côté serveur — soufflé entre-temps, devenu trop
       proche/lointain, ou hors horaires après un changement de règles :
       retour au calendrier, grille rechargée, sélection effacée. Rester à
       l'étape coordonnées avec un créneau refusé serait une impasse. */
    if (
      ["creneau_pris", "creneau_passe", "creneau_trop_loin", "hors_horaires", "creneau_non_aligne"].includes(
        rep.erreur,
      )
    ) {
      setCreneau(null);
      setJour(null);
      rechargerAgenda();
      setEtape("creneau");
    }
  };

  /* ——— libellés ——— */
  const titreRecap =
    parcours === "installation"
      ? "Réunion d'installation"
      : (format?.nom ?? "Audit");
  const sousRecap =
    parcours === "installation"
      ? "45 min · en visio"
      : `${format?.duree ?? ""} · ${format?.conditions ?? ""}`;

  const dateJour = (j: number) => jourGpLabel(vue.annee, vue.mois, j);

  /* le fil d'étapes : deux pas pour une demande de devis, trois sinon —
     quatre pour une installation sans session (02/09) : « Votre compte »
     s'intercale entre le créneau et les coordonnées, et disparaît dès
     que la connexion est faite. */
  const etapes = surDevis
    ? ["Votre demande", "Confirmation"]
    : bloque
      ? ["Le créneau", "Votre compte", "Vos coordonnées", "Confirmation"]
      : ["Le créneau", "Vos coordonnées", "Confirmation"];
  const idxEtape =
    etape === "fait"
      ? etapes.length - 1
      : etape === "coordonnees"
        ? bloque
          ? 1
          : etapes.length - 2
        : 0;

  return (
    <div className="rv-cadre">
      {/* ═══ colonne récapitulatif ═══ */}
      <aside className="r-carte !p-7">
        <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#616161]">
          Votre demande
        </div>
        <h2 className="r-h4 mt-2">{titreRecap}</h2>
        <p className="num mt-1 text-[14px] leading-[22px] text-[#3d3d3d]">{sousRecap}</p>

        {parcours === "installation" ? (
          <>
            <div className="mt-5 border-t border-[#e3e3e3] pt-4 text-[14px] font-semibold text-[#050505]">
              {postesValides.length === POSTES.length
                ? "Tout Omega — les quatre postes :"
                : `Vos postes (${postesValides.length}) :`}
            </div>
            <ul className="mt-2.5 space-y-2.5">
              {postesValides.map((p) => (
                <li key={p.id} className="flex items-center gap-2.5 text-[14px] leading-[21px] text-[#3d3d3d]">
                  <SystemLogo system={p.system} />
                  <span>
                    <span className="font-medium text-[#050505]">{p.system}</span> · {p.nom}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex items-baseline justify-between border-t border-[#e3e3e3] pt-4">
              <span className="text-[14px] text-[#3d3d3d]">Abonnement</span>
              <span className="num text-[22px] font-semibold text-[#050505]">
                {prix} €<span className="text-[13px] font-normal text-[#616161]"> /mois</span>
              </span>
            </div>
            <p className="r-note mt-2">
              Sans engagement · satisfait ou remboursé 30 jours. Aucun paiement en ligne : tout se
              règle à l&apos;installation.{" "}
              <Link href="/tarifs" className="underline underline-offset-2">
                Modifier mes postes
              </Link>
            </p>
          </>
        ) : (
          <div className="mt-5 border-t border-[#e3e3e3] pt-4">
            {/* 28/08, 3ᵉ passe — retour au menu déroulant (Teo : « le menu
                déroulant était très bien ») : trois formats seulement, le
                select stylé .rv-champ (chevron custom, focus net) suffit
                et allège la colonne. */}
            <label className="rv-libelle" htmlFor="rv-format">
              Changer de format
            </label>
            <select
              id="rv-format"
              className="rv-champ"
              value={formule}
              onChange={(e) => {
                const id = e.target.value;
                setFormule(id);
                setJour(null);
                setCreneau(null);
                setErreur(null);
                setEtape(DUREES_RDV[id] === null ? "coordonnees" : "creneau");
              }}
            >
              {FORMATS.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nom} — {f.duree} · {f.surDevis ? "sur devis" : "gratuit"}
                </option>
              ))}
            </select>
          </div>
        )}

        {creneau !== null && etape !== "fait" ? (
          <div className="mt-4 rounded-lg bg-[#fdf3dd] px-4 py-3">
            <div className="text-[13px] font-semibold text-[#050505]">Créneau choisi</div>
            <div className="num mt-0.5 text-[14px] leading-[21px] text-[#3d3d3d]">
              {jour !== null ? dateJour(jour) : ""} · {heureGp(creneau)} (Guadeloupe)
              {heureVisiteur(creneau) ? ` — ${heureVisiteur(creneau)} chez vous` : ""}
            </div>
            {etape === "coordonnees" && !surDevis ? (
              <button
                type="button"
                onClick={() => setEtape("creneau")}
                className="mt-1.5 text-[13px] font-medium text-[#050505] underline underline-offset-2"
              >
                Modifier
              </button>
            ) : null}
          </div>
        ) : null}
      </aside>

      {/* ═══ colonne principale ═══ */}
      <div className="r-carte !p-7 sm:!p-9">
        <div className="rv-etapes mb-7">
          {etapes.map((nom, i) => (
            <span key={nom} className="contents">
              {i > 0 && <span aria-hidden className="rv-etape-lien" />}
              <span
                className={`rv-etape ${
                  i === idxEtape ? "rv-etape--active" : i < idxEtape ? "rv-etape--faite" : ""
                }`}
                aria-current={i === idxEtape ? "step" : undefined}
              >
                <i>{i < idxEtape ? "✓" : i + 1}</i>
                {nom}
              </span>
            </span>
          ))}
        </div>

        {/* ——— étape 1 : le créneau ——— */}
        {etape === "creneau" ? (
          <div className="rv-apparait">
            <h3 className="r-h4">Choisissez votre créneau</h3>
            {erreur ? <p className="rv-erreur mt-4">{ERREURS[erreur] ?? ERREURS.reseau}</p> : null}

            {chargement ? (
              <p className="mt-6 text-[15px] text-[#616161]">Chargement de l&apos;agenda…</p>
            ) : !agenda ? (
              <div className="mt-6">
                <p className="rv-erreur">
                  L&apos;agenda ne répond pas. Réessayez dans un instant — ou réservez directement{" "}
                  <a className="underline" href={lienContact("Réserver un créneau")}>
                    par WhatsApp
                  </a>
                  .
                </p>
                <button type="button" onClick={rechargerAgenda} className="r-btn r-btn--fil mt-4">
                  Réessayer
                </button>
              </div>
            ) : (
              <div className="mt-6 grid gap-8 md:grid-cols-[minmax(0,340px)_1fr]">
                {/* calendrier */}
                <div>
                  <div className="rv-cal-tete">
                    <button
                      type="button"
                      className="rv-cal-nav"
                      onClick={() => bougerMois(-1)}
                      disabled={!peutReculer}
                      aria-label="Mois précédent"
                    >
                      ←
                    </button>
                    <div className="text-[15px] font-semibold text-[#050505]">
                      {moisLabel(vue.mois, vue.annee)}
                    </div>
                    <button
                      type="button"
                      className="rv-cal-nav"
                      onClick={() => bougerMois(1)}
                      disabled={!peutAvancer}
                      aria-label="Mois suivant"
                    >
                      →
                    </button>
                  </div>

                  <div className="rv-cal-grille mt-4">
                    {["L", "M", "M", "J", "V", "S", "D"].map((l, i) => (
                      <div key={i} className="rv-cal-jour">
                        {l}
                      </div>
                    ))}
                    {Array.from({ length: cale }).map((_, i) => (
                      <div key={`v${i}`} />
                    ))}
                    {Array.from({ length: nbJours }, (_, i) => i + 1).map((j) => {
                      const libre = joursDuMois.has(j);
                      return (
                        <button
                          key={j}
                          type="button"
                          disabled={!libre}
                          aria-pressed={jour === j}
                          onClick={() => {
                            setJour(j);
                            setCreneau(null);
                          }}
                          className={`rv-cal-case num ${
                            jour === j
                              ? "rv-cal-case--choisi"
                              : libre
                                ? "rv-cal-case--libre"
                                : "rv-cal-case--vide"
                          }`}
                        >
                          {j}
                        </button>
                      );
                    })}
                  </div>
                  <p className="r-note mt-3">
                    Créneaux en heure de Guadeloupe. Agenda ouvert sur dix semaines.
                  </p>
                </div>

                {/* heures du jour choisi */}
                <div>
                  {jour === null ? (
                    <p className="text-[15px] leading-[23px] text-[#616161]">
                      Choisissez un jour dans le calendrier — les jours grisés sont complets ou
                      fermés.
                    </p>
                  ) : (
                    <>
                      <div className="text-[15px] font-semibold text-[#050505] first-letter:uppercase">
                        {dateJour(jour)}
                      </div>
                      <div className="rv-heures mt-4">
                        {(joursDuMois.get(jour) ?? []).map((cr) => (
                          <button
                            key={cr}
                            type="button"
                            aria-pressed={creneau === cr}
                            onClick={() => setCreneau(cr)}
                            className={`rv-heure num ${creneau === cr ? "rv-heure--choisi" : ""}`}
                          >
                            {heureGp(cr)}
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        disabled={creneau === null}
                        onClick={() => {
                          setErreur(null);
                          setEtape("coordonnees");
                        }}
                        className={`mt-6 w-full sm:w-auto ${
                          creneau === null ? "r-btn rv-btn--attente" : "r-btn r-btn--noir"
                        }`}
                      >
                        Continuer
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : null}

        {/* ——— étape 2 : les coordonnées ——— */}
        {etape === "coordonnees" ? (
          <div className="rv-apparait">
            {/* 02/09 — installation sans session : la connexion d'abord
                (e-mail + mot de passe, ou « Créer mon compte » : le code
                prouve l'adresse, puis le mot de passe seul — les
                coordonnées suivent ici, avecProfil={false}), le formulaire
                (désactivé) juste dessous. Le créneau choisi reste affiché
                dans la colonne de gauche. HORS du <form> des coordonnées :
                le module a ses propres formulaires (revue n° 3). */}
            {bloque ? (
              <div className="mb-8">
                <ConnexionInline
                  modeInitial="connexion"
                  avecProfil={false}
                  onConnecte={connecter}
                  intro={
                    "Votre installation est rattachée à un compte — c'est lui qui vous ouvrira votre cockpit. Connectez-vous, ou créez votre compte en une minute : votre adresse, un code reçu par e-mail, un mot de passe."
                  }
                  emailInitial={c.email}
                />
              </div>
            ) : null}

          <form onSubmit={envoyer} noValidate>
            <h3 className="r-h4">{surDevis ? "Votre demande de devis" : "Vos coordonnées"}</h3>
            {!surDevis && creneau === null ? (
              <p className="rv-erreur mt-4">{ERREURS.creneau_requis}</p>
            ) : null}
            {erreur ? <p className="rv-erreur mt-4">{ERREURS[erreur] ?? ERREURS.reseau}</p> : null}
            {verrou && util ? (
              <p className="r-note mt-2">
                Connecté avec {util.email}. Ce n&apos;est pas vous&nbsp;?{" "}
                <button
                  type="button"
                  className="underline underline-offset-2"
                  onClick={changerDeCompte}
                  disabled={changement || envoi}
                >
                  {changement ? "Un instant…" : "Changer de compte"}
                </button>
              </p>
            ) : null}

            {/* <fieldset disabled> : tout le formulaire s'éteint d'un coup
                tant que la connexion n'est pas faite — champs, menu, bouton.
                min-w-0 : un fieldset a une largeur minimale intrinsèque qui
                casserait la grille. */}
            <fieldset disabled={bloque} className={`m-0 min-w-0 border-0 p-0 ${bloque ? "opacity-50" : ""}`}>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="rv-libelle" htmlFor="rv-prenom">Prénom</label>
                <input id="rv-prenom" className="rv-champ" autoComplete="given-name" value={c.prenom} onChange={maj("prenom")} required />
              </div>
              <div>
                <label className="rv-libelle" htmlFor="rv-nom">Nom</label>
                <input id="rv-nom" className="rv-champ" autoComplete="family-name" value={c.nom} onChange={maj("nom")} required />
              </div>
              <div>
                <label className="rv-libelle" htmlFor="rv-email">
                  Adresse e-mail{verrou && util ? <small> — celle de votre compte</small> : null}
                </label>
                <input
                  id="rv-email"
                  type="email"
                  className={`rv-champ ${verrou && util ? "bg-[#f5f5f5] text-[#3d3d3d]" : ""}`}
                  autoComplete="email"
                  value={c.email}
                  onChange={maj("email")}
                  readOnly={Boolean(verrou && util)}
                  required
                />
              </div>
              <div>
                <label className="rv-libelle" htmlFor="rv-tel">
                  Téléphone / WhatsApp <small>— conseillé</small>
                </label>
                <input id="rv-tel" type="tel" className="rv-champ" autoComplete="tel" placeholder="0690 …" value={c.telephone} onChange={maj("telephone")} />
              </div>
              <div>
                <label className="rv-libelle" htmlFor="rv-entreprise">Nom de l&apos;entreprise</label>
                <input id="rv-entreprise" className="rv-champ" autoComplete="organization" value={c.entreprise} onChange={maj("entreprise")} required />
              </div>
              {/* 28/08, 3ᵉ passe — le secteur revient en menu déroulant
                  stylé (.rv-champ) : neuf pilules mangeaient la moitié du
                  formulaire, et le <select> natif est déjà accessible. */}
              <div>
                <label className="rv-libelle" htmlFor="rv-secteur">Secteur d&apos;activité</label>
                <select id="rv-secteur" className="rv-champ" value={c.secteur} onChange={maj("secteur")} required>
                  <option value="" disabled>Choisir…</option>
                  {SECTEURS.map((s) => (
                    <option key={s.valeur} value={s.valeur}>{s.libelle}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="rv-libelle" htmlFor="rv-commune">
                  Commune <small>— facultatif</small>
                </label>
                <input id="rv-commune" className="rv-champ" autoComplete="address-level2" value={c.commune} onChange={maj("commune")} />
              </div>
              <div className="sm:col-span-2">
                <label className="rv-libelle" htmlFor="rv-message">
                  {surDevis
                    ? "Votre situation en deux lignes"
                    : "Ce qui vous coûte le plus cher aujourd'hui"}{" "}
                  <small>— facultatif</small>
                </label>
                <textarea id="rv-message" rows={3} className="rv-champ resize-y" value={c.message} onChange={maj("message")} />
              </div>

              {/* pot de miel — jamais visible, jamais rempli par un humain.
                  28/08 (revue) : le libellé « Votre site web » + id « rv-site »
                  étaient exactement les signaux qu'un gestionnaire de mots de
                  passe utilise pour auto-remplir — un VRAI visiteur pouvait
                  déclencher le court-circuit et croire à une réservation qui
                  n'existait pas. Libellé neutre, nom sans signification, et
                  autocomplete="one-time-code" (le seul que les navigateurs
                  respectent vraiment) : plus rien à reconnaître. */}
              <div className="rv-miel" aria-hidden="true">
                <label htmlFor="rv-x7">Ne pas remplir</label>
                <input id="rv-x7" name="rv-x7" tabIndex={-1} autoComplete="one-time-code" value={c.site_web} onChange={maj("site_web")} />
              </div>
            </div>

            <div className="mt-7 flex flex-wrap items-center gap-4">
              <button
                type="submit"
                disabled={!champsOk || envoi || (!surDevis && creneau === null)}
                className={`r-btn w-full sm:w-auto ${
                  !champsOk || envoi || (!surDevis && creneau === null)
                    ? "rv-btn--attente"
                    : "r-btn--noir"
                }`}
              >
                {envoi
                  ? "Envoi…"
                  : surDevis
                    ? "Envoyer la demande de devis"
                    : "Confirmer ce créneau"}
              </button>
              {!surDevis ? (
                <button
                  type="button"
                  onClick={() => setEtape("creneau")}
                  className="r-lien"
                >
                  ← Revenir au calendrier
                </button>
              ) : null}
            </div>
            </fieldset>
            {/* 02/09 (revue n° 11) — pour l'installation, la phrase « rien
                n'est conservé sans votre accord » était devenue fausse : la
                demande est rattachée au compte et le profil y est gardé.
                On le dit. */}
            <p className="r-note mt-4 max-w-[60ch]">
              {verrou ? (
                <>
                  Vos coordonnées servent à organiser ce rendez-vous&nbsp;; prénom, nom, entreprise et
                  téléphone sont gardés sur votre compte pour vos prochaines demandes. Rien
                  n&apos;est revendu — voir{" "}
                </>
              ) : (
                <>
                  Vos coordonnées ne servent qu&apos;à organiser ce rendez-vous. Rien n&apos;est
                  conservé sans votre accord, rien n&apos;est revendu — voir{" "}
                </>
              )}
              <Link href="/vos-donnees" className="underline underline-offset-2">
                où vont vos données
              </Link>
              .
            </p>
          </form>
          </div>
        ) : null}

        {/* ——— étape 3 : c'est fait ——— */}
        {etape === "fait" ? (
          <div className="rv-apparait">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#050505]">
              <svg aria-hidden width="18" height="14" viewBox="0 0 18 14" fill="none">
                <path d="M1.5 7.5 6.5 12.5 16.5 1.5" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h3 className="r-h4 mt-5">
              {surDevis ? "Demande envoyée." : "Créneau réservé."}
            </h3>
            <p className="mt-3 max-w-[54ch] text-[15px] leading-[24px] text-[#3d3d3d]">
              {surDevis ? (
                <>Votre demande est enregistrée. On vous répond le jour même, avec un devis ou les
                questions qui le précèdent.</>
              ) : (
                <>
                  <span className="font-semibold text-[#050505] first-letter:uppercase">
                    {jour !== null ? dateJour(jour) : ""}
                    {creneau !== null ? ` · ${heureGp(creneau)} (heure de Guadeloupe)` : ""}
                  </span>
                  <br />
                  Le créneau est bloqué chez nous. Vous recevez un mot de confirmation le jour même
                  {c.telephone ? " sur WhatsApp ou par e-mail" : " par e-mail"}, avec le lien de la
                  visio.
                </>
              )}
            </p>
            {parcours === "installation" ? (
              <>
                <p className="mt-3 max-w-[54ch] text-[15px] leading-[24px] text-[#3d3d3d]">
                  À la réunion&nbsp;: on branche vos postes sur vos outils, on vérifie votre
                  éligibilité au Chèque TIC, et l&apos;abonnement ({prix} €/mois) ne démarre
                  qu&apos;une fois le système en route.
                </p>
                {/* 02/09 (revue n° 10) — le client vient de créer un compte
                    pour que sa demande lui soit rattachée : on lui dit où
                    la retrouver, sinon la raison d'être du compte reste
                    invisible. */}
                <p className="mt-3 max-w-[54ch] text-[15px] leading-[24px] text-[#3d3d3d]">
                  Votre demande est rangée dans « Mon compte », avec votre créneau.
                </p>
              </>
            ) : null}
            <div className="mt-7 flex flex-wrap gap-3">
              {parcours === "installation" ? (
                <Link href="/compte" className="r-btn r-btn--noir">
                  Suivre ma demande
                </Link>
              ) : null}
              <Link href="/offres" className="r-btn r-btn--fil">
                Découvrir les postes
              </Link>
              <Link href="/" className="r-lien self-center">
                Retour à l&apos;accueil
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
