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
   ══════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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
};

export default function PriseDeCreneau({ parcours, formuleInitiale, postes = [] }: Props) {
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
    prenom: "",
    nom: "",
    email: "",
    entreprise: "",
    secteur: "",
    telephone: "",
    commune: "",
    message: "",
    site_web: "", // pot de miel — un humain ne le voit jamais
  });
  const maj = (cle: keyof typeof c) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setC((prev) => ({ ...prev, [cle]: e.target.value }));

  const champsOk =
    c.prenom.trim() && c.nom.trim() && /\S+@\S+\.\S+/.test(c.email) && c.entreprise.trim() && c.secteur;

  const envoyer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!champsOk || envoi) return;
    setErreur(null);

    /* robot pris au pot de miel : on fait comme si tout allait bien */
    if (c.site_web) {
      setEtape("fait");
      return;
    }

    setEnvoi(true);
    const rep = await reserver({
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
    });
    setEnvoi(false);

    if (rep.ok) {
      setRefId(rep.id);
      setEtape("fait");
      return;
    }
    setErreur(rep.erreur);
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

  /* le fil d'étapes : deux pas pour une demande de devis, trois sinon */
  const etapes = surDevis
    ? ["Votre demande", "Confirmation"]
    : ["Le créneau", "Vos coordonnées", "Confirmation"];
  const idxEtape =
    etape === "fait" ? etapes.length - 1 : etape === "coordonnees" ? etapes.length - 2 : 0;

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
          <div>
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
          <form onSubmit={envoyer} noValidate>
            <h3 className="r-h4">{surDevis ? "Votre demande de devis" : "Vos coordonnées"}</h3>
            {!surDevis && creneau === null ? (
              <p className="rv-erreur mt-4">{ERREURS.creneau_requis}</p>
            ) : null}
            {erreur ? <p className="rv-erreur mt-4">{ERREURS[erreur] ?? ERREURS.reseau}</p> : null}

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
                <label className="rv-libelle" htmlFor="rv-email">Adresse e-mail</label>
                <input id="rv-email" type="email" className="rv-champ" autoComplete="email" value={c.email} onChange={maj("email")} required />
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
            <p className="r-note mt-4 max-w-[60ch]">
              Vos coordonnées ne servent qu&apos;à organiser ce rendez-vous. Rien n&apos;est
              conservé sans votre accord, rien n&apos;est revendu — voir{" "}
              <Link href="/vos-donnees" className="underline underline-offset-2">
                où vont vos données
              </Link>
              .
            </p>
          </form>
        ) : null}

        {/* ——— étape 3 : c'est fait ——— */}
        {etape === "fait" ? (
          <div>
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
              <p className="mt-3 max-w-[54ch] text-[15px] leading-[24px] text-[#3d3d3d]">
                À la réunion : on branche vos postes sur vos outils, on vérifie votre éligibilité au
                Chèque TIC, et l&apos;abonnement ({prix} €/mois) ne démarre qu&apos;une fois le
                système en route.
              </p>
            ) : null}
            <div className="mt-7 flex flex-wrap gap-3">
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
