"use client";

/* ══════════════════════════════════════════════════════════════════════
   « Mon abonnement » — le contenu de la carte de /compte (03/09/2026)

   Demande Teo : « permet de gérer l'abonnement (annuler ou changer) ».
   La page (app/compte/page.tsx) pose l'en-tête coloré de la section
   (SectionCompte) ; ce composant n'en rend que le CONTENU :

     1. les postes de l'abonnement (logo + nom), la formule et son prix,
        l'état en pastille (réservé / en service / reçu / annulé) ;
     2. les actions — deux régimes, voir l'en-tête de lib/abonnement.ts :
        · pas encore finalisée : « Changer de formule » (panneau inline :
          cases des quatre postes, mensuel | annuel, aperçu du nouveau
          prix, Enregistrer → modifier_installation) et « Annuler ma
          réservation » (confirmation en deux temps → annuler_demande).
          Effet immédiat, la page se rafraîchit ;
        · finalisée / en service : « Demander un changement » (même
          panneau + message → demander_abonnement 'changement') et
          « Résilier mon abonnement » (motif + message → 'resiliation').
          Ce sont des DEMANDES : Teo les traite dans le cockpit, on le dit
          (« confirmé par e-mail sous 48 h ») ;
     3. la liste des demandes déjà envoyées, avec leur statut et la
        réponse de Teo quand elle existe.

   Sans abonnement : un mot, et le lien vers /tarifs.

   Le jeton de session est relu AU MOMENT de l'envoi (getSession rafraîchit
   s'il a expiré pendant la saisie), garde synchrone useRef contre le
   double clic (même raison que PriseDeCreneau), boutons éteints pendant
   l'envoi, erreurs en français (ERREURS_ABONNEMENT). Les panneaux qui
   s'ouvrent jouent .rv-apparait ; les cases de postes réutilisent
   .rv-case / .rv-coche (globals.css, sous .resa) et le sélecteur
   mensuel | annuel le .r-seg de /tarifs.
   ══════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { SystemLogo } from "@/components/logos";
import {
  LIBELLES_STATUT_ABONNEMENT,
  LIBELLES_TYPE_ABONNEMENT,
  MOTIFS_RESILIATION,
  annulerDemande,
  demanderAbonnement,
  estEnService,
  estModifiable,
  etatAbonnement,
  libellePrix,
  lignesDetail,
  messageErreur,
  modifierInstallation,
  nomPoste,
  postesTries,
  prixChoix,
  prixNombre,
  type DemandeAbonnement,
  type DemandeCompte,
} from "@/lib/abonnement";
import { dateGp } from "@/lib/site-commande";
import { POSTES, REMISE_ANNUELLE, lirePeriodicite, type Periodicite } from "@/lib/paliers";
import { createClient } from "@/lib/supabase/client";

type Props = {
  /* l'abonnement retenu par abonnementCourant() — null : aucun */
  demande: DemandeCompte | null;
  /* le compte a une ligne `comptes` (cockpit ouvert) */
  rattache: boolean;
  /* rpc mes_demandes_abonnement, les plus récentes d'abord */
  demandesAbonnement: DemandeAbonnement[];
  /* la lecture des demandes d'abonnement a échoué : on le dit */
  panneDemandesAbonnement?: boolean;
  /* la réunion de cette demande est déjà passée — calculé par la page,
     côté serveur (aucune horloge dans ce rendu) : une réservation non
     finalisée dont la réunion a eu lieu ne se modifie plus en ligne,
     même garde que annuler_demande / modifier_installation */
  reunionPassee?: boolean;
};

/* quel panneau est déplié — un seul à la fois */
type Panneau = "aucun" | "formule" | "annulation" | "resiliation";

/* la pastille d'état — une teinte par code, la même .cp-pastille
   [data-teinte] que les rendez-vous et les commandes (globals.css :
   texte foncé sur fond doux, contraste ≥ 4,5:1, 13,5 px) */
const TEINTES: Record<string, string> = {
  reserve: "bleu",
  en_service: "vert",
  recu: "ambre",
  annule: "gris",
  a_traiter: "ambre",
  traitee: "vert",
  refusee: "gris",
};

function Pastille({ code, children }: { code: string; children: React.ReactNode }) {
  return (
    <span className="cp-pastille" data-teinte={TEINTES[code] ?? "gris"}>
      {children}
    </span>
  );
}

const REMISE_PCT = Math.round(REMISE_ANNUELLE * 100);

export default function AbonnementCarte({
  demande,
  rattache,
  demandesAbonnement,
  panneDemandesAbonnement,
  reunionPassee = false,
}: Props) {
  const router = useRouter();

  const [panneau, setPanneau] = useState<Panneau>("aucun");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  /* le message de confirmation après une action réussie */
  const [fait, setFait] = useState<string | null>(null);

  /* ——— le panneau « formule » (modifier ou demander un changement) ——— */
  const modulesActuels = postesTries(demande?.modules);
  const periodiciteActuelle = lirePeriodicite(demande?.periodicite);
  const [choix, setChoix] = useState<string[]>(modulesActuels);
  const [periodicite, setPeriodicite] = useState<Periodicite>(periodiciteActuelle);
  const [message, setMessage] = useState("");

  /* ——— le panneau « résiliation » ——— */
  const [motif, setMotif] = useState("");

  /* garde SYNCHRONE contre le double clic — un état React ne l'est pas
     entre le premier await (getSession) et setEnvoi(true) */
  const enCours = useRef(false);

  if (!demande) {
    return (
      <div>
        {/* après « Oui, annuler », la page se rafraîchit et la demande
            annulée n'est plus retenue : la confirmation doit survivre ici,
            sinon elle disparaît en quelques centaines de millisecondes */}
        {fait ? (
          <p className="rv-apparait mb-4 rounded-lg bg-[#e8f6ed] px-4 py-3 text-[14px] leading-[21px] text-[#15753a]" role="status">
            {fait}
          </p>
        ) : null}
        <p className="text-[15px] leading-[24px] text-[#3d3d3d]">
          Aucun abonnement n&apos;est en cours sur ce compte. Choisissez vos postes sur la grille&nbsp;:
          la réunion d&apos;installation est incluse, et le mensuel est sans engagement.
        </p>
        <div className="mt-5">
          <Link href="/tarifs" className="r-btn r-btn--noir">
            Voir les tarifs
          </Link>
        </div>
      </div>
    );
  }

  const etat = etatAbonnement(demande, rattache);
  /* modifiable = les gardes SQL (estModifiable) + réunion pas encore
     passée. Un compte rattaché qui a réservé une NOUVELLE réunion
     (client_id null, confirme) modifie bien celle-ci directement : c'est
     ce que la base permet, et la pastille dit « Réservé » */
  const modifiable = estModifiable(demande) && !reunionPassee;
  const enService = estEnService(demande, rattache);
  const mensuel = prixNombre(demande.prix_mensuel_eur);
  const annuel = prixNombre(demande.prix_annuel_eur);
  const prix = mensuel != null ? libellePrix(mensuel, periodiciteActuelle, annuel) : null;

  /* le choix affiché dans le panneau — et s'il change quelque chose */
  const apercu = prixChoix(choix, periodicite);
  const memeFormule =
    choix.length === modulesActuels.length &&
    choix.every((m) => modulesActuels.includes(m)) &&
    periodicite === periodiciteActuelle;

  const resiliationEnCours = demandesAbonnement.some((d) => d.type === "resiliation" && d.statut === "a_traiter");

  const ouvrir = (p: Panneau) => {
    setErreur(null);
    setFait(null);
    if (p === "formule") {
      setChoix(modulesActuels);
      setPeriodicite(periodiciteActuelle);
      setMessage("");
    }
    if (p === "resiliation") {
      setMotif("");
      setMessage("");
    }
    setPanneau(panneau === p ? "aucun" : p);
  };
  const fermer = () => {
    setPanneau("aucun");
    setErreur(null);
  };
  const bascule = (id: string) =>
    setChoix((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  /* ——— l'envoi, un seul chemin pour les quatre actions ——— */
  const agir = async (action: (jeton: string) => Promise<{ ok: true } | { ok: false; erreur: string }>, merci: string) => {
    if (envoi || enCours.current) return;
    enCours.current = true;
    setEnvoi(true);
    setErreur(null);
    try {
      const { data } = await createClient().auth.getSession();
      const jeton = data.session?.access_token;
      if (!jeton) {
        setErreur(messageErreur("connexion_requise"));
        return;
      }
      const rep = await action(jeton);
      if (!rep.ok) {
        setErreur(messageErreur(rep.erreur));
        return;
      }
      setFait(merci);
      setPanneau("aucun");
      /* la page est un Server Component : on lui fait relire la base pour
         que la carte, l'aside cockpit et la liste des demandes suivent */
      router.refresh();
    } finally {
      enCours.current = false;
      setEnvoi(false);
    }
  };

  const enregistrerFormule = () =>
    agir(
      (jeton) => modifierInstallation(demande.id, postesTries(choix), periodicite, jeton),
      "Formule enregistrée. Votre réunion d'installation garde son créneau ; le nouveau prix s'applique dès la mise en route.",
    );
  const annulerReservation = () =>
    agir(
      (jeton) => annulerDemande(demande.id, jeton),
      "Réservation annulée. Rien n'est prélevé. Vous pouvez réserver à nouveau quand vous voulez depuis la grille des tarifs.",
    );
  const demanderChangement = () =>
    agir(
      (jeton) =>
        demanderAbonnement("changement", { modules: postesTries(choix), periodicite }, message, jeton),
      "Demande de changement envoyée. Nous vous confirmons par e-mail sous 48 h ; en attendant, votre formule actuelle continue telle quelle.",
    );
  const demanderResiliation = () =>
    agir(
      (jeton) => demanderAbonnement("resiliation", { motif: motif || null }, message, jeton),
      "Demande de résiliation envoyée. Nous vous confirmons par e-mail sous 48 h ; votre abonnement s'arrête à la fin de la période en cours, rien n'est prélevé au-delà.",
    );

  return (
    <div>
      {/* ——— 1. ce que le client a ——— */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-[14px] font-semibold text-[#050505]">
            {modulesActuels.length === POSTES.length
              ? "Tout Omega — les quatre postes"
              : modulesActuels.length
                ? `${modulesActuels.length} poste${modulesActuels.length > 1 ? "s" : ""} en formule`
                : "Réunion d'installation"}
          </div>
          {demande.entreprise ? (
            <div className="mt-1 text-[14px] leading-[22px] text-[#3d3d3d]">
              pour <span className="font-medium text-[#050505]">{demande.entreprise}</span>
            </div>
          ) : null}
        </div>
        <Pastille code={etat.code}>{etat.libelle}</Pastille>
      </div>

      {modulesActuels.length ? (
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {modulesActuels.map((m) => {
            const p = POSTES.find((x) => x.id === m);
            return (
              <li
                key={m}
                className="flex items-center gap-3 rounded-lg border border-[#e3e3e3] bg-white px-3 py-2.5"
              >
                <SystemLogo system={p?.system ?? m.toUpperCase()} />
                <span className="text-[14px] font-medium leading-[20px] text-[#050505]">{nomPoste(m)}</span>
              </li>
            );
          })}
        </ul>
      ) : null}

      {prix ? (
        <div className="mt-4 flex flex-wrap items-baseline justify-between gap-3 border-t border-[#e3e3e3] pt-4">
          <span className="text-[14px] text-[#3d3d3d]">
            Formule {periodiciteActuelle === "annuel" ? "annuelle" : "mensuelle"}
            <span className="block text-[13px] text-[#616161]">PULSE et VAULT compris</span>
          </span>
          <span className="text-right">
            <span className="num block text-[22px] font-semibold leading-[28px] text-[#050505]">
              {periodiciteActuelle === "annuel" && annuel != null ? (
                <>
                  {Math.round(annuel)} €<span className="text-[13px] font-normal text-[#616161]"> /an</span>
                </>
              ) : (
                <>
                  {Math.round(mensuel ?? 0)} €<span className="text-[13px] font-normal text-[#616161]"> /mois</span>
                </>
              )}
            </span>
            <span className="mt-1 flex items-center justify-end gap-2 text-[13px] text-[#616161]">
              {periodiciteActuelle === "annuel" && annuel != null ? (
                <>
                  soit {Math.round(annuel / 12)} €/mois
                  <span className="inline-flex items-center rounded-md bg-[#e8f6ed] px-2 py-0.5 text-[13px] font-semibold text-[#15753a]">
                    −{REMISE_PCT}&nbsp;%
                  </span>
                </>
              ) : (
                "sans engagement"
              )}
            </span>
          </span>
        </div>
      ) : null}

      {/* ——— retours ——— */}
      {fait ? (
        <p className="rv-apparait mt-4 rounded-lg bg-[#e8f6ed] px-4 py-3 text-[14px] leading-[21px] text-[#15753a]" role="status">
          {fait}
        </p>
      ) : null}
      {erreur ? (
        <p className="rv-erreur mt-4" role="alert">
          {erreur}
        </p>
      ) : null}

      {/* ——— 2. les actions ——— */}
      {etat.code === "annule" ? (
        <div className="mt-5 border-t border-[#e3e3e3] pt-4">
          <p className="text-[14px] leading-[22px] text-[#3d3d3d]">
            Cette réservation a été annulée. Pour repartir, choisissez vos postes sur la grille.
          </p>
          <Link href="/tarifs" className="r-btn r-btn--fil mt-4">
            Voir les tarifs
          </Link>
        </div>
      ) : modifiable ? (
        <div className="mt-5 border-t border-[#e3e3e3] pt-4">
          <p className="text-[13px] leading-[20px] text-[#616161]">
            Tant que l&apos;installation n&apos;est pas faite, vous changez ou annulez ici, tout de suite.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="r-btn r-btn--noir" onClick={() => ouvrir("formule")} disabled={envoi}>
              Changer de formule
            </button>
            <button type="button" className="r-btn r-btn--fil" onClick={() => ouvrir("annulation")} disabled={envoi}>
              Annuler ma réservation
            </button>
          </div>
        </div>
      ) : enService ? (
        <div className="mt-5 border-t border-[#e3e3e3] pt-4">
          <p className="text-[13px] leading-[20px] text-[#616161]">
            Votre installation est faite&nbsp;: un changement ou une résiliation passe par une demande,
            confirmée par e-mail sous 48&nbsp;h.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="r-btn r-btn--noir" onClick={() => ouvrir("formule")} disabled={envoi}>
              Demander un changement
            </button>
            {resiliationEnCours ? null : (
              <button type="button" className="r-btn r-btn--fil" onClick={() => ouvrir("resiliation")} disabled={envoi}>
                Résilier mon abonnement
              </button>
            )}
          </div>
          {resiliationEnCours ? (
            <p className="r-note mt-3">Votre demande de résiliation est en cours — voir ci-dessous.</p>
          ) : null}
        </div>
      ) : (
        <p className="mt-5 border-t border-[#e3e3e3] pt-4 text-[13px] leading-[20px] text-[#616161]">
          Cette demande ne se modifie plus en ligne. Écrivez-nous, on s&apos;en occupe.
        </p>
      )}

      {/* ——— le panneau formule : modifier (direct) ou demander (finalisée) ——— */}
      {panneau === "formule" ? (
        <div className="rv-apparait mt-4 rounded-xl border border-[#e3e3e3] bg-[#f5f5f5] p-4 sm:p-5">
          <div className="cp-secondaire cp-kicker-ligne">
            {modifiable ? "Nouvelle formule" : "Formule souhaitée"}
          </div>
          <p className="mt-1 text-[14px] leading-[21px] text-[#3d3d3d]">
            Un poste 59&nbsp;€, deux ou trois 89&nbsp;€, les quatre 119&nbsp;€ par mois. PULSE et VAULT
            sont compris quel que soit le choix.
          </p>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {POSTES.map((p) => {
              const actif = choix.includes(p.id);
              return (
                <label key={p.id} className={`rv-case ${actif ? "rv-case--actif" : ""}`}>
                  <input
                    type="checkbox"
                    checked={actif}
                    onChange={() => bascule(p.id)}
                    className="sr-only"
                    disabled={envoi}
                  />
                  <span className="rv-coche" aria-hidden />
                  <SystemLogo system={p.system} />
                  <span>
                    <span className="block text-[14px] font-medium leading-[20px] text-[#050505]">{p.nom}</span>
                    <span className="mt-0.5 block text-[13px] leading-[18px] text-[#616161]">{p.resume}</span>
                  </span>
                </label>
              );
            })}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="r-seg flex w-full sm:inline-flex sm:w-auto" role="group" aria-label="Périodicité">
              <button
                type="button"
                className="r-seg-btn flex-1 text-center sm:flex-none"
                data-actif={periodicite === "mensuel"}
                onClick={() => setPeriodicite("mensuel")}
                disabled={envoi}
              >
                Mensuel
              </button>
              <button
                type="button"
                className="r-seg-btn flex-1 text-center sm:flex-none"
                data-actif={periodicite === "annuel"}
                onClick={() => setPeriodicite("annuel")}
                disabled={envoi}
              >
                Annuel <span className="text-[#15753a]">−{REMISE_PCT}&nbsp;%</span>
              </button>
            </div>
            <div className="text-right">
              <div className="text-[13px] text-[#616161]">Nouveau prix</div>
              <div className="num text-[18px] font-semibold leading-[24px] text-[#050505]" aria-live="polite">
                {choix.length === 0
                  ? "—"
                  : periodicite === "annuel" && apercu.annuel != null
                    ? `${apercu.annuel} €/an, soit ${Math.round(apercu.annuel / 12)} €/mois`
                    : `${apercu.mensuel} €/mois`}
              </div>
            </div>
          </div>

          {choix.length === 0 ? (
            <p className="r-note mt-3">Choisissez au moins un poste.</p>
          ) : memeFormule ? (
            <p className="r-note mt-3">C&apos;est votre formule actuelle — changez un poste ou la périodicité.</p>
          ) : null}

          {!modifiable ? (
            <div className="mt-4">
              <label className="rv-libelle" htmlFor="ab-message-changement">
                Un mot pour nous <small>— facultatif</small>
              </label>
              <textarea
                id="ab-message-changement"
                className="rv-champ"
                rows={3}
                maxLength={2000}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                disabled={envoi}
                placeholder="À partir de quand, ce qui vous manque, ce qui ne sert pas…"
              />
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              className="r-btn r-btn--noir"
              onClick={modifiable ? enregistrerFormule : demanderChangement}
              disabled={envoi || choix.length === 0 || memeFormule}
            >
              {envoi ? "Envoi…" : modifiable ? "Enregistrer" : "Envoyer ma demande"}
            </button>
            <button type="button" className="r-btn r-btn--fil" onClick={fermer} disabled={envoi}>
              Annuler
            </button>
          </div>
          {!modifiable ? (
            <p className="r-note mt-3">
              Nous vous confirmons par e-mail sous 48&nbsp;h. Jusque-là, votre formule actuelle continue.
            </p>
          ) : null}
        </div>
      ) : null}

      {/* ——— l'annulation : confirmation en deux temps ——— */}
      {panneau === "annulation" ? (
        <div className="rv-apparait mt-4 rounded-xl border border-[#e4b7b0] bg-[#fdf1ef] p-4 sm:p-5">
          <div className="text-[15px] font-semibold text-[#7c2d24]">Vous êtes sûr&nbsp;?</div>
          <p className="mt-1 text-[14px] leading-[21px] text-[#7c2d24]">
            Votre créneau de réunion sera libéré et votre demande d&apos;installation annulée. Rien
            n&apos;a été prélevé, rien ne le sera. Vous pourrez réserver à nouveau quand vous voudrez.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" className="r-btn r-btn--noir" onClick={annulerReservation} disabled={envoi}>
              {envoi ? "Annulation…" : "Oui, annuler"}
            </button>
            <button type="button" className="r-btn r-btn--fil" onClick={fermer} disabled={envoi}>
              Garder ma réservation
            </button>
          </div>
        </div>
      ) : null}

      {/* ——— la résiliation : motif + message → demande ——— */}
      {panneau === "resiliation" ? (
        <div className="rv-apparait mt-4 rounded-xl border border-[#e3e3e3] bg-[#f5f5f5] p-4 sm:p-5">
          <div className="cp-secondaire cp-kicker-ligne">
            Résilier mon abonnement
          </div>
          <p className="mt-1 text-[14px] leading-[21px] text-[#3d3d3d]">
            Nous vous confirmons par e-mail sous 48&nbsp;h&nbsp;; votre abonnement s&apos;arrête à la fin
            de la période en cours, rien n&apos;est prélevé au-delà.
          </p>
          <div className="mt-4 grid gap-4">
            <div>
              <label className="rv-libelle" htmlFor="ab-motif">
                Pourquoi&nbsp;? <small>— facultatif, ça nous aide</small>
              </label>
              <select
                id="ab-motif"
                className="rv-champ"
                value={motif}
                onChange={(e) => setMotif(e.target.value)}
                disabled={envoi}
              >
                <option value="">Je préfère ne pas dire</option>
                {MOTIFS_RESILIATION.map((m) => (
                  <option key={m.valeur} value={m.valeur}>
                    {m.libelle}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="rv-libelle" htmlFor="ab-message-resiliation">
                Un mot pour nous <small>— facultatif</small>
              </label>
              <textarea
                id="ab-message-resiliation"
                className="rv-champ"
                rows={3}
                maxLength={2000}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                disabled={envoi}
                placeholder="Ce qui n'a pas marché, ou ce qui aurait pu vous retenir…"
              />
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" className="r-btn r-btn--noir" onClick={demanderResiliation} disabled={envoi}>
              {envoi ? "Envoi…" : "Envoyer ma demande de résiliation"}
            </button>
            <button type="button" className="r-btn r-btn--fil" onClick={fermer} disabled={envoi}>
              Garder mon abonnement
            </button>
          </div>
        </div>
      ) : null}

      {/* ——— 3. les demandes déjà envoyées ——— */}
      {panneDemandesAbonnement ? (
        <p className="rv-erreur mt-5">
          Vos demandes d&apos;abonnement ne répondent pas pour le moment. Rechargez la page dans un
          instant.
        </p>
      ) : demandesAbonnement.length ? (
        <div className="mt-5 border-t border-[#e3e3e3] pt-4">
          <div className="cp-secondaire cp-kicker-ligne">
            Vos demandes
          </div>
          <ul className="mt-3 space-y-3">
            {demandesAbonnement.map((d) => (
              <li key={d.id} className="rounded-lg border border-[#e3e3e3] bg-white px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[14px] font-semibold text-[#050505]">
                    {LIBELLES_TYPE_ABONNEMENT[d.type] ?? d.type}
                    <span className="num ml-2 text-[13px] font-normal text-[#616161]">{dateGp(d.cree_le)}</span>
                  </span>
                  <Pastille code={d.statut}>{LIBELLES_STATUT_ABONNEMENT[d.statut] ?? d.statut}</Pastille>
                </div>
                {lignesDetail(d).map((l) => (
                  <p key={l} className="mt-1.5 text-[13.5px] leading-[20px] text-[#3d3d3d]">
                    {l}
                  </p>
                ))}
                {d.message ? (
                  <p className="mt-1.5 text-[13.5px] leading-[20px] text-[#616161]">
                    Votre message&nbsp;: «&nbsp;{d.message}&nbsp;»
                  </p>
                ) : null}
                {d.reponse ? (
                  <p className="mt-2 rounded-md bg-[#fdf3dd] px-3 py-2 text-[13.5px] leading-[20px] text-[#050505]">
                    <span className="font-semibold">Réponse d&apos;Omega</span>
                    {d.traitee_le ? (
                      <span className="num text-[13px] text-[#616161]"> · {dateGp(d.traitee_le)}</span>
                    ) : null}
                    <span className="block">{d.reponse}</span>
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
