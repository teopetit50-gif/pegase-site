"use client";

/* ══════════════════════════════════════════════════════════════════════
   TAVARO — Incidents (02/11/2026, refonte des pages métiers)

   La page Tasks de Plain (liste + détail), au 1:1 : relevé
   docs/refonte-metiers/releves/plain-tasks.md (relevé de la session
   références Plain), jetons plain-commun.md, styles ./tav-plain.css
   (préfixe tav-p-). Trois onglets du contrôle segmenté de Plain, un par
   sujet de l'écran d'avant (OperationsVue) :
     · Sinistres (B29) : G35 « Déclarer un sinistre » (la ligne « Add new
       task »), G36 « Faire avancer », G37 « Préparer le recours » ;
     · Assistance (B30) : l'avis « fournisseur de voix », G38 « Clore » ;
     · Caution (B32) : l'avis « prestataire de paiement », G40 « Demander
       une préautorisation », G41 « Capturer », G42 « Libérer » (confirmé).
   Une ligne Plain par objet : case d'état, identifiant, titre, pastille du
   compte (le véhicule ou le contrat) ; le détail s'ouvre à droite (360 px).
   La grille d'assistance (B31) est dans les Réglages.
   Fenêtre F16 : ./operations.
   ══════════════════════════════════════════════════════════════════════ */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import { Avis } from "@/components/espace/ui";
import { dateHeure, montant, relatif } from "@/components/espace/format";
import { ACTIONS, ETAPES_SINISTRE, NATURES_SINISTRE, RESPONSABILITES, STATUTS_CAUTION, TYPES_INCIDENT, type Caution, type Incident, type Sinistre } from "@/components/espace/tavaro/operations";
import { nomLocataire } from "@/components/espace/tavaro/etats";
import { useToast } from "../Toasts";
import { useTavaro } from "./donnees";
import { FenetreOperations } from "./operations";
import { TavMenu, type OptionMenu } from "./TavCadre";
import { TavIcone, type NomTavIcone } from "./TavIcone";
import { BASE } from "./VueEnsemble";
import { copier as copierTexte, dansJours, exporterCsv, useFavoris, useReportes, useSuivis } from "./navigateur";
import "./tav.css";
import "./tav-plain.css";

type Onglet = "sinistres" | "assistance" | "caution";
const ONGLETS: { cle: Onglet; libelle: string }[] = [
  { cle: "sinistres", libelle: "Sinistres" },
  { cle: "assistance", libelle: "Assistance" },
  { cle: "caution", libelle: "Caution" },
];

/* les deux cases de Plain : à faire (bleue), faite (verte), chemins relevés tels quels */
function Case({ faite }: { faite: boolean }) {
  return faite ? (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" className="tav-p-case" data-faite="">
      <path fillRule="evenodd" clipRule="evenodd" fill="currentColor" d="M16.667 2.667a4.667 4.667 0 0 1 4.666 4.666v9.334a4.667 4.667 0 0 1-4.666 4.666H7.333a4.667 4.667 0 0 1-4.666-4.666V7.333a4.667 4.667 0 0 1 4.666-4.666zm.158 5.842a1.167 1.167 0 0 0-1.65 0l-4.508 4.508-1.842-1.842a1.167 1.167 0 0 0-1.65 1.65l2.667 2.667a1.167 1.167 0 0 0 1.65 0l5.333-5.334a1.166 1.166 0 0 0 0-1.65" />
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" className="tav-p-case">
      <path fill="currentColor" d="M18.667 7.333a2 2 0 0 0-2-2H7.333a2 2 0 0 0-2 2v9.334a2 2 0 0 0 2 2h9.334a2 2 0 0 0 2-2zm2.666 9.334a4.667 4.667 0 0 1-4.666 4.666H7.333a4.667 4.667 0 0 1-4.666-4.666V7.333a4.667 4.667 0 0 1 4.666-4.666h9.334a4.667 4.667 0 0 1 4.666 4.666z" />
    </svg>
  );
}

type Ligne = { cle: string; id: string; titre: string; compte: string | null; faite: boolean; entite: string | null; s?: Sinistre; i?: Incident; k?: Caution };

export default function Incidents() {
  const { pret, agences, agence, setAgence, nomAgenceDe, tous, operations: o } = useTavaro();
  const toast = useToast();
  const params = useSearchParams();
  const onglet = (ONGLETS.some((x) => x.cle === params.get("onglet")) ? params.get("onglet") : "sinistres") as Onglet;
  const choix = params.get("element");
  const [liberer, setLiberer] = useState<Caution | null>(null);
  useEffect(() => {
    if (o.fait) {
      toast(`C'est fait. ${o.fait}`, "vert");
      const t = window.setTimeout(() => o.setFait(null), 0);
      return () => window.clearTimeout(t);
    }
  }, [o, toast]);
  const dossierDe = (contrat: string | null) => tous.find((d) => d.contrat.id === contrat) ?? null;
  const de = (e: string | null) => !agence || e === agence;

  const lignes = useMemo<Record<Onglet, Ligne[]>>(() => {
    if (!o.pret) return { sinistres: [], assistance: [], caution: [] };
    return {
      sinistres: o.ops.sinistres.filter((s) => de(s.entite_id)).map((s) => ({ cle: s.id, id: s.reference, titre: `${NATURES_SINISTRE[s.nature]} sur ${o.immat(s.vehicule_id)} — ${ETAPES_SINISTRE[s.statut].toLowerCase()}`, compte: s.contrat_id ? o.numero(s.contrat_id) : o.immat(s.vehicule_id), faite: s.statut === "clos" || s.statut === "regle", entite: s.entite_id, s })),
      assistance: o.ops.incidents.filter((i) => de(i.entite_id)).map((i) => ({ cle: i.id, id: TYPES_INCIDENT[i.type_incident], titre: `${i.action ? ACTIONS[i.action] : "Action à décider"}${i.prestataire ? ` : ${i.prestataire}` : ""}${i.vehicule_id ? ` — ${o.immat(i.vehicule_id)}` : ""}`, compte: i.contrat_id ? o.numero(i.contrat_id) : null, faite: i.statut === "clos", entite: i.entite_id, i })),
      caution: o.ops.cautions.filter((k) => de(k.entite_id)).map((k) => ({ cle: k.id, id: o.numero(k.contrat_id), titre: `Caution de ${montant(k.montant_eur)} — ${STATUTS_CAUTION[k.statut].toLowerCase()}`, compte: nomLocataire(dossierDe(k.contrat_id)?.locataire ?? null), faite: ["liberee", "expiree", "echec", "capturee"].includes(k.statut), entite: k.entite_id, k })),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [o.pret, o.ops, agence, tous]);
  const comptes = { sinistres: o.sinistresOuverts.length, assistance: o.incidentsOuverts.length, caution: o.cautionsVivantes.length };
  /* les boutons de Plain sans geste en base : « Assigned to me » = suivre, « Handle with Agent » = copier pour
     l'assistant, « More » = épingler, reporter, exporter (./navigateur) */
  const favoris = useFavoris();
  const suivis = useSuivis();
  const reportes = useReportes();
  const cleDe = (l: Ligne) => `incident:${onglet}:${l.cle}`;
  const liste = lignes[onglet].filter((l) => !reportes.jusquA(cleDe(l))).sort((a, b) => Number(suivis.a(cleDe(b))) - Number(suivis.a(cleDe(a))));
  const ligne = liste.find((l) => l.cle === choix) ?? null;
  const adresse = (on: Onglet, el: string | null) => `${BASE}/incidents?onglet=${on}${el ? `&element=${encodeURIComponent(el)}` : ""}`;

  const ajout: { libelle: string; action: () => void; actif: boolean } | null =
    onglet === "sinistres" ? { libelle: "Déclarer un sinistre", action: o.declarerSinistre, actif: o.agence } : onglet === "caution" ? { libelle: "Demander une préautorisation", action: o.demanderCaution, actif: o.agence } : null;
  const optionsAgence: OptionMenu[] = [
    { libelle: "Toutes les agences", icone: agence === null ? "IssueStatusDone" : "Team", action: () => setAgence(null) },
    ...agences.map((a) => ({ libelle: (a.nom ?? a.code).split(" — ").pop() ?? a.code, icone: (agence === a.entite_id ? "IssueStatusDone" : "Team") as NomTavIcone, action: () => setAgence(a.entite_id) })),
  ];
  const nomAgenceChoisie = agence ? ((agences.find((a) => a.entite_id === agence)?.nom ?? "").split(" — ").pop() ?? "") : "Toutes les agences";

  /* ——— le détail ——— */
  type Geste = { libelle: string; icone: NomTavIcone; action: () => void; actif: boolean; titre?: string };
  const gestes: Geste[] = [];
  let statut = "";
  let cree = "";
  let description: React.ReactNode = null;
  let proprietes: { dt: string; dd: string }[] = [];
  if (ligne?.s) {
    const s = ligne.s;
    statut = ETAPES_SINISTRE[s.statut];
    cree = s.cree_le;
    if (s.statut !== "clos") gestes.push({ libelle: "Faire avancer", icone: "Refresh", action: () => o.avancer(s), actif: o.agence });
    if (s.statut !== "clos" && (s.responsabilite === "tiers" || s.responsabilite === "partagee")) gestes.push({ libelle: s.recours ? "Refaire le recours" : "Préparer le recours", icone: "Send", action: () => o.recours(s), actif: o.direction, titre: o.direction ? undefined : "La direction ou un valideur prépare le recours" });
    description = (
      <>
        <p>
          Le {dateHeure(s.survenu_le)}
          {s.lieu ? `, ${s.lieu}` : ""}. {s.description ?? ""}
        </p>
        {s.recours ? (
          <details className="tav-p-recours">
            <summary>
              Recours de {montant(s.recours.montant)} pour {s.recours.jours} jour{s.recours.jours > 1 ? "s" : ""} d&apos;immobilisation{s.recours.envoye_le ? `, envoyé le ${dateHeure(s.recours.envoye_le)}` : ""}
            </summary>
            <pre>{s.recours.courrier}</pre>
          </details>
        ) : null}
      </>
    );
    proprietes = [
      { dt: "Véhicule", dd: o.immat(s.vehicule_id) },
      { dt: "Contrat", dd: s.contrat_id ? o.numero(s.contrat_id) : "hors location" },
      { dt: "Responsable", dd: RESPONSABILITES[s.responsabilite] },
      { dt: "Tiers", dd: [s.tiers.nom, s.tiers.assureur].filter(Boolean).join(", ") || "—" },
      { dt: "Réparation", dd: s.montant_reparation_eur ? montant(s.montant_reparation_eur) : "—" },
      { dt: "Franchise", dd: s.franchise_eur ? montant(s.franchise_eur) : "—" },
      { dt: "Agence", dd: s.entite_id ? (nomAgenceDe(s.entite_id).split(" — ").pop() ?? "") : "—" },
    ];
  } else if (ligne?.i) {
    const i = ligne.i;
    statut = i.statut === "clos" ? "Clos" : i.statut === "missionne" ? "Prestataire missionné" : i.statut === "transfere" ? "Transféré à l'agence" : "Ouvert";
    cree = i.recu_le;
    if (i.statut !== "clos") gestes.push({ libelle: "Clore", icone: "IssueStatusDone", action: () => o.clore(i), actif: o.agence });
    description = (
      <>
        <p>{i.description ?? "Appel reçu par l'assistant."}</p>
        {i.resume ? <p>{i.resume}</p> : null}
      </>
    );
    proprietes = [
      { dt: "Reçu", dd: dateHeure(i.recu_le) },
      { dt: "Position", dd: i.position ?? "—" },
      { dt: "Contrat", dd: i.contrat_id ? o.numero(i.contrat_id) : "non retrouvé" },
      { dt: "Prestataire", dd: i.prestataire ?? "—" },
      { dt: "Arrivée", dd: i.arrivee_estimee_le ? dateHeure(i.arrivee_estimee_le) : "—" },
    ];
  } else if (ligne?.k) {
    const k = ligne.k;
    statut = STATUTS_CAUTION[k.statut];
    cree = k.cree_le;
    if (k.statut === "preautorisee") gestes.push({ libelle: "Capturer", icone: "Euro", action: () => o.capturer(k), actif: o.direction, titre: o.direction ? undefined : "La direction ou un valideur capture la caution" });
    if (k.statut === "preautorisee" || k.statut === "capturee") gestes.push({ libelle: k.statut === "capturee" ? "Libérer le reste" : "Libérer", icone: "Shield", action: () => setLiberer(k), actif: o.agence });
    description = <p>{k.erreur ? `Le prestataire a répondu : ${k.erreur}` : "Le montant est bloqué sur la carte du locataire sans être débité ; il se capture pour régler une facture du contrat, ou se libère."}</p>;
    proprietes = [
      { dt: "Contrat", dd: o.numero(k.contrat_id) },
      { dt: "Montant", dd: montant(k.montant_eur) },
      { dt: "Garantie", dd: k.expire_le ? `jusqu'au ${dateHeure(k.expire_le)}` : "—" },
      { dt: "Capture", dd: k.capture_eur ? montant(k.capture_eur) : k.capture_demandee_eur ? `${montant(k.capture_demandee_eur)} demandés` : "—" },
      { dt: "Prestataire", dd: k.prestataire ?? "pas encore choisi" },
    ];
  }

  const avisOnglet =
    onglet === "assistance"
      ? "Le fournisseur de voix n'est pas encore choisi : dès qu'il est branché, chaque appel du client s'inscrit ici, avec le contrat retrouvé et l'action de votre grille."
      : onglet === "caution"
        ? "Le prestataire de paiement n'est pas encore choisi : les demandes attendent son branchement, les montants ne sont pas encore bloqués sur les cartes."
        : null;

  return (
    <div className="tav tav--plain">
      <div className="tav-carte tav-p-carte" data-detail={ligne ? "" : undefined}>
        <div className="tav-p-colonne">
          <header className="tav-p-tete">
            <h1 className="tav-p-h1">Incidents</h1>
            {ligne ? (
              <Link href={adresse(onglet, null)} className="tav-p-rond" aria-label="Masquer le détail" title="Masquer le détail">
                <TavIcone nom="Volet" taille={18} />
              </Link>
            ) : null}
          </header>
          <div className="tav-p-onglets">
            <div className="tav-p-segment" role="tablist" aria-label="Sujets">
              {ONGLETS.map((x) => (
                <Link key={x.cle} href={adresse(x.cle, null)} role="tab" aria-selected={onglet === x.cle} className="tav-p-onglet">
                  <Case faite={false} />
                  <span>{x.libelle}</span>
                  <span className="tav-p-compte">{comptes[x.cle]}</span>
                </Link>
              ))}
            </div>
            <span className="tav-pousse" />
            {agences.length > 1 ? (
              <div className="tav-p-tri">
                <TavMenu libelle={`Agence : ${nomAgenceChoisie}`} icone="Filtre" alignement="droite" options={optionsAgence} />
                <span>{nomAgenceChoisie}</span>
              </div>
            ) : null}
          </div>
          {avisOnglet ? <p className="tav-p-avis">{avisOnglet}</p> : null}
          {ajout ? (
            <button type="button" className="tav-p-ajout" disabled={!ajout.actif} onClick={ajout.action}>
              <TavIcone nom="Plus" taille={18} />
              <span>{ajout.libelle}</span>
            </button>
          ) : null}
          {!pret || !o.pret ? (
            <p className="tav-p-avis">Lecture des opérations…</p>
          ) : liste.length === 0 ? (
            <p className="tav-p-avis">{onglet === "sinistres" ? "Aucun sinistre : un accident, un vol ou un bris se déclare ici, rattaché au contrat." : onglet === "assistance" ? "Aucun appel d'assistance." : "Aucune caution en cours."}</p>
          ) : (
            <ul className="tav-p-lignes">
              {liste.map((l) => (
                <li key={l.cle} data-ouverte={ligne?.cle === l.cle ? "" : undefined}>
                  <Link href={adresse(onglet, l.cle)} replace scroll={false} className="tav-p-ligne" aria-current={ligne?.cle === l.cle ? "true" : undefined}>
                    <span className="tav-p-case-boite" data-faite={l.faite ? "" : undefined}>
                      <Case faite={l.faite} />
                    </span>
                    <span className="tav-p-titre">
                      <span className="tav-p-id">{l.id}</span>
                      <span className="tav-p-nom" data-faite={l.faite ? "" : undefined}>
                        {l.titre}
                      </span>
                      {suivis.a(cleDe(l)) ? <span className="tav-p-id">suivi</span> : null}
                    </span>
                    {l.compte ? (
                      <span className="tav-p-pastille">
                        <span className="tav-p-vignette">
                          <TavIcone nom={onglet === "caution" ? "Users" : "Car"} taille={12} />
                        </span>
                        {l.compte}
                      </span>
                    ) : null}
                    <span className="tav-p-avatar" aria-hidden="true">
                      {(l.entite ? (agences.find((a) => a.entite_id === l.entite)?.code ?? "") : "").slice(0, 1) || "·"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {ligne ? (
          <aside className="tav-p-detail" aria-label="Détail">
            <div className="tav-p-detail-tete">
              <span className="tav-p-detail-id">{ligne.id}</span>
              <span className="tav-pousse" />
              <TavMenu
                libelle="Plus d'actions"
                alignement="droite"
                options={[
                  { libelle: favoris.a(cleDe(ligne)) ? "Retirer des épinglés" : "Épingler en tête de la vue d'ensemble", icone: favoris.a(cleDe(ligne)) ? "Favorite" : "Etoile", action: () => favoris.basculer({ cle: cleDe(ligne), libelle: `${ligne.id} — ${ligne.titre}`, href: adresse(onglet, ligne.cle), detail: statut }) },
                  { libelle: "Reporter à demain", icone: "AlarmClock", action: () => { reportes.reporter(cleDe(ligne), dansJours(1)); toast(`${ligne.id} quitte la liste jusqu'à demain.`); } },
                  { libelle: "Reporter d'une semaine", icone: "AlarmClock", action: () => { reportes.reporter(cleDe(ligne), dansJours(7)); toast(`${ligne.id} quitte la liste pour une semaine.`); } },
                  "sep",
                  { libelle: "Exporter l'onglet (CSV)", icone: "Spreadsheet", action: () => exporterCsv(`incidents-${onglet}`, ["Identifiant", "Titre", "Compte", "Fait"], liste.map((l) => [l.id, l.titre, l.compte ?? "", l.faite ? "oui" : "non"])) },
                ]}
              />
              <Link href={adresse(onglet, null)} className="tav-p-rond" aria-label="Fermer" title="Fermer">
                <TavIcone nom="Plus" taille={18} style={{ transform: "rotate(45deg)" }} />
              </Link>
            </div>
            <div className="tav-p-actions">
              <span className="tav-p-etat">
                <Case faite={ligne.faite} />
                <span>{statut}</span>
              </span>
              <button type="button" className="tav-p-bouton tav-p-bouton--suivre" aria-pressed={suivis.a(cleDe(ligne))} onClick={() => suivis.basculer({ cle: cleDe(ligne), libelle: `${ligne.id} — ${ligne.titre}`, href: adresse(onglet, ligne.cle) })}>
                <TavIcone nom={suivis.a(cleDe(ligne)) ? "Notified" : "Subscribe"} taille={18} />
                <span>{suivis.a(cleDe(ligne)) ? "Suivi" : "Suivre"}</span>
              </button>
              <button type="button" className="tav-p-bouton" onClick={() => void copierTexte([`${ligne.id} : ${ligne.titre}`, `Statut : ${statut}`, ...proprietes.map((x) => `${x.dt} : ${x.dd}`)].join("\n")).then((ok) => toast(ok ? "Copié pour l'assistant : collez-le dans votre question." : "La copie a échoué.", ok ? undefined : "rouge"))}>
                <TavIcone nom="Agent" taille={18} />
                <span>Copier pour l&apos;assistant</span>
              </button>
              {gestes.map((g) => (
                <button key={g.libelle} type="button" className="tav-p-bouton" disabled={!g.actif} title={g.titre} onClick={g.action}>
                  <TavIcone nom={g.icone} taille={18} />
                  <span>{g.libelle}</span>
                </button>
              ))}
            </div>
            <h2 className="tav-p-detail-titre">{ligne.titre}</h2>
            <p className="tav-p-cree">Créé {relatif(cree)}</p>
            <div className="tav-p-description">{description}</div>
            <hr className="tav-p-filet" />
            <dl className="tav-p-dl">
              {proprietes.map((x) => (
                <div key={x.dt} className="tav-p-dl-ligne">
                  <dt>{x.dt}</dt>
                  <dd>{x.dd}</dd>
                </div>
              ))}
            </dl>
          </aside>
        ) : null}
      </div>

      <FenetreOperations o={o} />
      <Dialog open={!!liberer} onOpenChange={(x) => !x && setLiberer(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone>
              <ShieldCheck width={18} height={18} aria-hidden="true" />
            </DialogIcone>
            <DialogTitle>{liberer?.statut === "capturee" ? "Libérer le reste de la caution" : "Libérer la caution"} du contrat {liberer ? o.numero(liberer.contrat_id) : ""}</DialogTitle>
            <DialogDescription>La libération est demandée au prestataire : le montant bloqué sur la carte du locataire est rendu. Le geste ne se reprend pas.</DialogDescription>
          </DialogHeader>
          <DialogBody>{o.erreur ? <Avis teinte="rouge" role="alert">{o.erreur}</Avis> : null}</DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={o.envoi || !liberer} onClick={() => { if (liberer) void o.liberer(liberer).then(() => setLiberer(null)); }}>
              {o.envoi ? <Loader variant="spin" /> : null} Libérer
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
