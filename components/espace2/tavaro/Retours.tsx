"use client";

/* ══════════════════════════════════════════════════════════════════════
   TAVARO — Retours à facturer (02/11/2026, refonte des pages métiers)

   L'Inbox de Linear, au 1:1 : relevé docs/refonte-metiers/releves/
   linear-inbox.md, styles ./tav-inbox.css (préfixe tav-i-). À gauche la
   liste (400 px), à droite le contrat ouvert, comme le ticket ouvert à
   droite de l'Inbox (./FicheContrat en mode « volet »).

   Ce qu'elle reprend de l'écran d'avant :
     · B06 / B08 : la liste des contrats, triée comme avant (famille, puis
       retour le plus récent) ; une notification de Linear par contrat :
       pastille « non lu » = un geste attend (à chiffrer, à valider,
       bloqué), numéro, locataire et véhicule, icône de statut ; dessous la
       famille, l'agence, le montant et l'âge du retour ;
     · B02 : les quatre familles dans le menu « Filtre » (?famille=, un
       seul à la fois, comme avant) ; B03 « À encaisser » dans le menu « … » ;
     · B07 : les agences dans « Options d'affichage » (filtre partagé par
       toute la page) ;
     · B09 : le volet vide (« N retours à facturer ») ;
     · L1 : un clic ouvre le contrat à droite (?contrat=) ; ↑ ↓ passent au
       suivant, Échap referme ; à 768 et moins, la page du contrat.
   ══════════════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { montant } from "@/components/espace/format";
import { FAMILLES, famille, nomLocataire, propositionVivante, type Famille } from "@/components/espace/tavaro/etats";
import type { Dossier } from "@/components/espace/tavaro/types";
import { useTavaro } from "./donnees";
import { TavCarte, TavMenu, type OptionMenu } from "./TavCadre";
import { TavIcone, type NomTavIcone } from "./TavIcone";
import FicheContrat from "./FicheContrat";
import { BASE } from "./VueEnsemble";
import "./tav-inbox.css";

const RANG: Record<Famille, number> = { a_chiffrer: 0, a_valider: 1, bloquee: 2, reste: 3 };
const STATUT: Record<Famille, { icone: NomTavIcone; etat: string }> = {
  a_chiffrer: { icone: "IssueStatusTriage", etat: "tri" },
  a_valider: { icone: "IssueStatusStarted", etat: "cours" },
  bloquee: { icone: "IssueStatusTodo", etat: "bloque" },
  reste: { icone: "IssueStatusDone", etat: "fait" },
};

/* l'âge court de Linear : « now », « 3min », « 4d » → « à l'instant », « 3 min », « 4 j » */
function age(iso: string, maintenant: number): string {
  const s = Math.max(0, (maintenant - Date.parse(iso)) / 1000);
  if (s < 60) return "à l'instant";
  if (s < 3600) return `${Math.floor(s / 60)} min`;
  if (s < 86400) return `${Math.floor(s / 3600)} h`;
  return `${Math.floor(s / 86400)} j`;
}

export default function Retours() {
  const { source, pret, erreur, moi, dossiers, compteurs, agences, agence, setAgence, nomAgenceDe, setActif } = useTavaro();
  const params = useSearchParams();
  const routeur = useRouter();
  const brut = params.get("famille");
  const filtre = (FAMILLES.some((f) => f.cle === brut) ? brut : null) as Famille | null;
  /* un repère de demande (aiguillage.ts) nomme une proposition, une facture ou un avoir : on ouvre son contrat */
  const parObjet = useMemo(() => {
    const prop = params.get("proposition");
    const fac = params.get("facture");
    const av = params.get("avoir");
    if (!prop && !fac && !av) return null;
    return dossiers.find((d) => (prop && d.propositions.some((x) => x.id === prop)) || (fac && d.factures.some((x) => x.id === fac)) || (av && d.avoirs.some((x) => x.id === av)))?.contrat.id ?? null;
  }, [params, dossiers]);
  const choix = params.get("contrat") ?? parObjet;
  const [maintenant] = useState(() => Date.now());
  const liste = useRef<HTMLUListElement>(null);

  const visibles = useMemo(() => {
    const l = dossiers.filter((d) => !filtre || famille(d.contrat, d.propositions, d.factures) === filtre);
    return [...l].sort((a, b) => {
      const fa = RANG[famille(a.contrat, a.propositions, a.factures)];
      const fb = RANG[famille(b.contrat, b.propositions, b.factures)];
      if (fa !== fb) return fa - fb;
      return (b.contrat.retour_reel_le ?? b.contrat.retour_prevu_le).localeCompare(a.contrat.retour_reel_le ?? a.contrat.retour_prevu_le);
    });
  }, [dossiers, filtre]);
  const dossier = visibles.find((d) => d.contrat.id === choix) ?? null;
  useEffect(() => {
    setActif(dossier?.contrat.id ?? null);
  }, [dossier, setActif]);

  const adresse = useCallback(
    (f: Famille | null, contrat: string | null) => {
      const q = new URLSearchParams();
      if (f) q.set("famille", f);
      if (contrat) q.set("contrat", contrat);
      const s = q.toString();
      return `${BASE}/retours${s ? `?${s}` : ""}`;
    },
    [],
  );
  const ouvrir = useCallback(
    (d: Dossier | null) => {
      if (d && window.matchMedia("(max-width: 768px)").matches) {
        routeur.push(`${BASE}/contrats/${encodeURIComponent(d.contrat.id)}`);
        return;
      }
      routeur.replace(adresse(filtre, d?.contrat.id ?? null), { scroll: false });
    },
    [routeur, adresse, filtre],
  );

  /* ↑ ↓ et Échap, hors des champs de saisie et des fenêtres */
  useEffect(() => {
    const touche = (e: KeyboardEvent) => {
      const cible = e.target as HTMLElement | null;
      if (cible && (cible.closest("input, textarea, select, [role=dialog], [role=menu]") || cible.isContentEditable)) return;
      if (e.key === "Escape" && dossier) {
        ouvrir(null);
        return;
      }
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      e.preventDefault();
      const i = dossier ? visibles.indexOf(dossier) : -1;
      const j = e.key === "ArrowDown" ? Math.min(visibles.length - 1, i + 1) : Math.max(0, i - 1);
      const d = visibles[j];
      if (d) {
        ouvrir(d);
        liste.current?.querySelector<HTMLElement>(`[data-contrat="${d.contrat.id}"]`)?.scrollIntoView({ block: "nearest" });
      }
    };
    document.addEventListener("keydown", touche);
    return () => document.removeEventListener("keydown", touche);
  }, [dossier, visibles, ouvrir]);

  const optionsFiltre: OptionMenu[] = [
    { libelle: `Tous les contrats · ${dossiers.length}`, icone: filtre === null ? "IssueStatusDone" : "Inbox", href: adresse(null, null) },
    ...FAMILLES.map((f) => ({ libelle: `${f.libelle} · ${compteurs[f.cle]}`, icone: (filtre === f.cle ? "IssueStatusDone" : STATUT[f.cle].icone) as NomTavIcone, href: adresse(filtre === f.cle ? null : f.cle, null) })),
  ];
  const optionsAgence: OptionMenu[] = [
    { libelle: "Toutes les agences", icone: agence === null ? "IssueStatusDone" : "Team", action: () => setAgence(null) },
    ...agences.map((a) => ({ libelle: (a.nom ?? a.code).split(" — ").pop() ?? a.code, icone: (agence === a.entite_id ? "IssueStatusDone" : "Team") as NomTavIcone, action: () => setAgence(a.entite_id) })),
  ];
  const titreListe = filtre ? (FAMILLES.find((f) => f.cle === filtre)?.libelle ?? "Retours à facturer") : "Retours à facturer";
  const actifs = visibles.filter((d) => famille(d.contrat, d.propositions, d.factures) !== "reste").length;

  return (
    <TavCarte className="tav--plein">
      <h1 className="v2-sr">Retours à facturer</h1>
      <div className="tav-i">
        <section className="tav-i-liste" aria-label="Contrats de location" data-ouvert={dossier ? "" : undefined}>
          <header className="tav-i-tete">
            <h2 className="tav-i-titre">{titreListe}</h2>
            <TavMenu
              libelle="Actions sur les retours"
              options={[
                { libelle: `À encaisser · ${montant(compteurs.encaisser)}`, icone: "Euro", href: adresse("bloquee", null) },
                { libelle: "Ouvrir la file « À valider »", icone: "Inbox", href: "/espace2/validations" },
                "sep",
                { libelle: "Vue d'ensemble", icone: "Home", href: BASE },
              ]}
            />
            <span className="tav-pousse" />
            <Link href={adresse(filtre === "reste" ? null : "reste", null)} className="tav-rond" aria-label="Le reste (contrats sans geste en attente)" title="Le reste (contrats sans geste en attente)" aria-pressed={filtre === "reste"}>
              <TavIcone nom="Archive" />
            </Link>
            <TavMenu libelle="Filtrer par famille" icone="Filtre" alignement="droite" options={optionsFiltre} />
            {agences.length > 1 ? <TavMenu libelle="Filtrer par agence" icone="Affichage" alignement="droite" options={optionsAgence} /> : null}
          </header>
          <div className="tav-i-defile">
            {erreur ? <p className="tav-i-avis">La base réelle n&apos;a pas répondu. {erreur}</p> : null}
            {source === "reelle" && pret && !moi ? <p className="tav-i-avis">Aucun compte rattaché à cette session : la lecture passe, les gestes resteront gris.</p> : null}
            {!pret ? (
              <p className="tav-i-avis">Lecture du parking…</p>
            ) : visibles.length === 0 ? (
              <p className="tav-i-avis">{filtre ? "Rien dans cette famille." : "Aucun contrat connu pour l'instant : ils arrivent par l'export de votre logiciel, par un contrat PDF lu, ou au comptoir."}</p>
            ) : (
              <ul ref={liste} className="tav-i-lignes">
                {visibles.map((d) => {
                  const fam = famille(d.contrat, d.propositions, d.factures);
                  const p = propositionVivante(d.propositions);
                  const total = d.factures.length ? d.factures.reduce((s, f) => s + f.total_ttc, 0) : (p?.total_ttc ?? null);
                  const litige = d.factures.some((f) => f.statut === "litige");
                  const quand = d.contrat.retour_reel_le ?? (p && typeof p.entrees.retour_reel_le === "string" ? p.entrees.retour_reel_le : null);
                  const sous = [
                    FAMILLES.find((f) => f.cle === fam)?.libelle,
                    litige ? "litige" : d.factures.some((f) => f.statut === "reglee") ? "réglé" : fam === "bloquee" && p?.statut !== "preuve_manquante" ? "impayé" : null,
                    nomAgenceDe(d.contrat.entite_id).split(" — ").pop(),
                    total !== null && total > 0 ? montant(total) : null,
                  ].filter(Boolean);
                  return (
                    <li key={d.contrat.id}>
                      <Link
                        href={adresse(filtre, d.contrat.id)}
                        replace
                        scroll={false}
                        data-contrat={d.contrat.id}
                        className="tav-i-ligne"
                        data-lu={fam === "reste" ? "" : undefined}
                        aria-current={dossier?.contrat.id === d.contrat.id ? "true" : undefined}
                        onClick={(e) => {
                          if (window.matchMedia("(max-width: 768px)").matches) {
                            e.preventDefault();
                            ouvrir(d);
                          }
                        }}
                      >
                        <span className="tav-i-avatar" aria-hidden="true">
                          <TavIcone nom="Car" taille={20} />
                        </span>
                        <span className="tav-i-texte">
                          <span className="tav-i-l1">
                            {fam !== "reste" ? <span className="tav-i-point" aria-label="geste en attente" /> : null}
                            <span className="tav-i-id">{d.contrat.numero}</span>
                            <span className="tav-i-sujet">
                              {nomLocataire(d.locataire)}
                              {d.vehicule ? ` — ${d.vehicule.immatriculation}${d.vehicule.modele ? ` · ${d.vehicule.modele}` : ""}` : ""}
                            </span>
                            <span className="tav-i-statut" data-etat={STATUT[fam].etat}>
                              <TavIcone nom={STATUT[fam].icone} taille={14} />
                            </span>
                          </span>
                          <span className="tav-i-l2">
                            <span className="tav-i-sous">{sous.join(" · ")}</span>
                            {fam === "bloquee" ? (
                              <span className="tav-i-priorite" aria-label="bloqué">
                                <TavIcone nom="Priority1" taille={14} />
                              </span>
                            ) : null}
                            <span className="tav-i-age">{quand ? age(quand, maintenant) : `retour ${age(d.contrat.retour_prevu_le, maintenant).replace("à l'instant", "imminent")}`}</span>
                          </span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>
        <section className="tav-i-droite" aria-label="Contrat ouvert">
          {dossier ? (
            <FicheContrat key={dossier.contrat.id} dossier={dossier} volet retour={{ libelle: titreListe, href: adresse(filtre, null) }} />
          ) : (
            <div className="tav-vide">
              <TavIcone nom="Inbox" taille={96} className="tav-i-illustration" />
              <p>{!pret ? "Lecture du dossier…" : `${actifs} retour${actifs > 1 ? "s" : ""} à facturer`}</p>
            </div>
          )}
        </section>
      </div>
    </TavCarte>
  );
}
