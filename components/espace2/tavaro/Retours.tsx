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
import { FAMILLES, STATUTS_FACTURE, famille, nomLocataire, propositionVivante, resteDu, type Famille } from "@/components/espace/tavaro/etats";
import type { Dossier, Facture } from "@/components/espace/tavaro/types";
import { useTavaro } from "./donnees";
import { TavCarte, TavMenu, type OptionMenu } from "./TavCadre";
import { TavIcone, type NomTavIcone } from "./TavIcone";
import FicheContrat from "./FicheContrat";
import { exporterCsv, useReportes, useSuivis } from "./navigateur";
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
  /* la vue « Factures » (promesse : factures de restitution échues relancées ; repères /tavaro/factures, E15 et E17) */
  const vue = params.get("vue") === "factures" ? "factures" : "contrats";
  const SOUS = ["a_envoyer", "hier", "impayees", "toutes"] as const;
  type Sous = (typeof SOUS)[number];
  const sousFacture = (SOUS.includes(params.get("factures") as Sous) ? params.get("factures") : "impayees") as Sous;
  const voirReportes = params.get("reportes") === "1";
  const suivis = useSuivis();
  const reportes = useReportes();
  const [maintenant] = useState(() => Date.now());
  const liste = useRef<HTMLUListElement>(null);

  const visibles = useMemo(() => {
    const l = dossiers.filter((d) => (!filtre || famille(d.contrat, d.propositions, d.factures) === filtre) && (voirReportes ? !!reportes.jusquA(`contrat:${d.contrat.id}`) : !reportes.jusquA(`contrat:${d.contrat.id}`)));
    return [...l].sort((a, b) => {
      /* Suivre (la cloche) : les contrats suivis d'abord */
      const sa = suivis.a(`contrat:${a.contrat.id}`) ? 0 : 1;
      const sb = suivis.a(`contrat:${b.contrat.id}`) ? 0 : 1;
      if (sa !== sb) return sa - sb;
      const fa = RANG[famille(a.contrat, a.propositions, a.factures)];
      const fb = RANG[famille(b.contrat, b.propositions, b.factures)];
      if (fa !== fb) return fa - fb;
      return (b.contrat.retour_reel_le ?? b.contrat.retour_prevu_le).localeCompare(a.contrat.retour_reel_le ?? a.contrat.retour_prevu_le);
    });
  }, [dossiers, filtre, voirReportes, reportes, suivis]);

  /* ——— les factures : à envoyer soi-même, émises hier, impayées avec leurs relances ——— */
  const [hier] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  });
  const toutesFactures = useMemo(() => dossiers.flatMap((d) => d.factures.map((f) => ({ f, d, reste: resteDu(f, d.avoirs) }))), [dossiers]);
  const estAEnvoyer = (f: Facture) => f.statut === "emise" && !f.envoi_id;
  const estImpayee = (x: { f: Facture; reste: number }) => (x.f.statut === "emise" || x.f.statut === "envoyee" || x.f.statut === "litige") && x.reste > 0;
  const comptesFactures = {
    a_envoyer: toutesFactures.filter((x) => estAEnvoyer(x.f)).length,
    hier: toutesFactures.filter((x) => x.f.date_facture.slice(0, 10) === hier).length,
    impayees: toutesFactures.filter(estImpayee).length,
    toutes: toutesFactures.length,
  };
  const factures = useMemo(
    () =>
      toutesFactures
        .filter((x) => (sousFacture === "a_envoyer" ? estAEnvoyer(x.f) : sousFacture === "hier" ? x.f.date_facture.slice(0, 10) === hier : sousFacture === "impayees" ? estImpayee(x) : true))
        .sort((x, y) => x.f.echeance_le.localeCompare(y.f.echeance_le)),
    [toutesFactures, sousFacture, hier],
  );
  const dossier = (vue === "factures" ? dossiers : visibles).find((d) => d.contrat.id === choix) ?? null;
  useEffect(() => {
    setActif(dossier?.contrat.id ?? null);
  }, [dossier, setActif]);

  const adresse = useCallback(
    (f: Famille | null, contrat: string | null, autre?: { vue?: "contrats" | "factures"; factures?: string; reportes?: boolean }) => {
      const q = new URLSearchParams();
      const v = autre?.vue ?? vue;
      if (v === "factures") {
        q.set("vue", "factures");
        q.set("factures", autre?.factures ?? sousFacture);
      } else if (f) q.set("famille", f);
      if (autre?.reportes ?? (v === "contrats" && voirReportes)) q.set("reportes", "1");
      if (contrat) q.set("contrat", contrat);
      const s = q.toString();
      return `${BASE}/retours${s ? `?${s}` : ""}`;
    },
    [vue, sousFacture, voirReportes],
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

  const exporter = () =>
    vue === "factures"
      ? exporterCsv(
          `factures-${sousFacture}`,
          ["Facture", "Contrat", "Locataire", "Nature", "Statut", "Émise le", "Échéance", "Total TTC", "Reste dû", "Relances", "Courriel"],
          factures.map(({ f, d, reste }) => [f.reference, d.contrat.numero, nomLocataire(d.locataire), f.nature, STATUTS_FACTURE[f.statut].libelle, f.date_facture.slice(0, 10), f.echeance_le.slice(0, 10), f.total_ttc, reste, f.relances ?? 0, f.statut === "envoyee" || f.statut === "reglee" ? "parti" : f.envoi_id ? "préparé" : "à envoyer vous-même"]),
        )
      : exporterCsv(
          "retours-a-facturer",
          ["Contrat", "Famille", "Locataire", "Véhicule", "Agence", "Départ", "Retour", "Montant"],
          visibles.map((d) => {
            const pv = propositionVivante(d.propositions);
            return [d.contrat.numero, FAMILLES.find((x) => x.cle === famille(d.contrat, d.propositions, d.factures))?.libelle, nomLocataire(d.locataire), d.vehicule?.immatriculation, nomAgenceDe(d.contrat.entite_id), d.contrat.depart_le.slice(0, 16), (d.contrat.retour_reel_le ?? d.contrat.retour_prevu_le).slice(0, 16), d.factures.length ? d.factures.reduce((x, f) => x + f.total_ttc, 0) : (pv?.total_ttc ?? "")];
          }),
        );
  const LIB_SOUS: Record<Sous, string> = { a_envoyer: "À envoyer vous-même", hier: "Émises hier", impayees: "Impayées", toutes: "Toutes les factures" };
  const optionsFiltre: OptionMenu[] = vue === "factures" ? SOUS.map((x) => ({ libelle: `${LIB_SOUS[x]} · ${comptesFactures[x]}`, icone: (sousFacture === x ? "IssueStatusDone" : "Euro") as NomTavIcone, href: adresse(null, null, { factures: x }) })) : [
    { libelle: `Tous les contrats · ${dossiers.length}`, icone: filtre === null ? "IssueStatusDone" : "Inbox", href: adresse(null, null) },
    ...FAMILLES.map((f) => ({ libelle: `${f.libelle} · ${compteurs[f.cle]}`, icone: (filtre === f.cle ? "IssueStatusDone" : STATUT[f.cle].icone) as NomTavIcone, href: adresse(filtre === f.cle ? null : f.cle, null) })),
  ];
  const optionsAgence: OptionMenu[] = [
    { libelle: "Toutes les agences", icone: agence === null ? "IssueStatusDone" : "Team", action: () => setAgence(null) },
    ...agences.map((a) => ({ libelle: (a.nom ?? a.code).split(" — ").pop() ?? a.code, icone: (agence === a.entite_id ? "IssueStatusDone" : "Team") as NomTavIcone, action: () => setAgence(a.entite_id) })),
  ];
  const titreListe = vue === "factures" ? `Factures · ${LIB_SOUS[sousFacture].toLowerCase()}` : voirReportes ? "Retours reportés" : filtre ? (FAMILLES.find((f) => f.cle === filtre)?.libelle ?? "Retours à facturer") : "Retours à facturer";
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
                vue === "factures"
                  ? { libelle: "Les contrats (retours à facturer)", icone: "Car", href: adresse(null, null, { vue: "contrats" }) }
                  : { libelle: `Les factures · ${montant(compteurs.encaisser)} à encaisser`, icone: "Euro", href: adresse(null, null, { vue: "factures", factures: "impayees" }) },
                ...(vue === "contrats" ? [{ libelle: voirReportes ? "Revenir aux retours" : `Voir les retours reportés · ${reportes.nombre}`, icone: "AlarmClock" as NomTavIcone, href: adresse(filtre, null, { reportes: !voirReportes }) }] : []),
                { libelle: "Exporter la liste affichée (CSV)", icone: "Spreadsheet", action: exporter },
                "sep",
                { libelle: "Ouvrir la file « À valider »", icone: "Inbox", href: "/espace2/validations" },
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
            ) : vue === "factures" ? (
              <>
                <p className="tav-i-avis">
                  À encaisser : {montant(compteurs.encaisser)} · {comptesFactures.a_envoyer} à envoyer vous-même · {comptesFactures.hier} émise{comptesFactures.hier > 1 ? "s" : ""} hier · {comptesFactures.impayees} impayée{comptesFactures.impayees > 1 ? "s" : ""}. Une relance se prépare depuis la facture, dans le contrat ouvert à droite ; elle part après validation.
                </p>
                {factures.length === 0 ? (
                  <p className="tav-i-avis">Aucune facture dans cette vue.</p>
                ) : (
                  <ul className="tav-i-lignes">
                    {factures.map(({ f, d, reste }) => {
                      const echue = (f.statut === "emise" || f.statut === "envoyee") && Date.parse(f.echeance_le) + 86_400_000 < maintenant;
                      const aFaire = estAEnvoyer(f) || estImpayee({ f, reste });
                      return (
                        <li key={f.id}>
                          <Link href={adresse(null, d.contrat.id)} replace scroll={false} className="tav-i-ligne" data-lu={aFaire ? undefined : ""} aria-current={dossier?.contrat.id === d.contrat.id ? "true" : undefined}>
                            <span className="tav-i-avatar" aria-hidden="true">
                              <TavIcone nom="Euro" taille={20} />
                            </span>
                            <span className="tav-i-texte">
                              <span className="tav-i-l1">
                                {aFaire ? <span className="tav-i-point" aria-label="geste en attente" /> : null}
                                <span className="tav-i-id">{f.reference}</span>
                                <span className="tav-i-sujet">
                                  {nomLocataire(d.locataire)} — {montant(f.total_ttc)}
                                </span>
                                <span className="tav-i-statut" data-etat={f.statut === "reglee" ? "fait" : f.statut === "litige" ? "tri" : f.statut === "envoyee" ? "cours" : "bloque"}>
                                  <TavIcone nom={f.statut === "reglee" ? "IssueStatusDone" : f.statut === "litige" ? "IssueStatusTriage" : f.statut === "envoyee" ? "IssueStatusStarted" : "IssueStatusTodo"} taille={14} />
                                </span>
                              </span>
                              <span className="tav-i-l2">
                                <span className="tav-i-sous">
                                  {[STATUTS_FACTURE[f.statut].libelle, estAEnvoyer(f) ? "à envoyer vous-même" : null, reste > 0 && f.statut !== "reglee" ? `reste ${montant(reste)}` : null, f.relances ? `${f.relances} relance${f.relances > 1 ? "s" : ""}` : null, d.contrat.numero].filter(Boolean).join(" · ")}
                                </span>
                                {echue ? (
                                  <span className="tav-i-priorite" aria-label="échéance dépassée">
                                    <TavIcone nom="Priority1" taille={14} />
                                  </span>
                                ) : null}
                                <span className="tav-i-age">{age(f.date_facture, maintenant)}</span>
                              </span>
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </>
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
                    suivis.a(`contrat:${d.contrat.id}`) ? "suivi" : null,
                    reportes.jusquA(`contrat:${d.contrat.id}`) ? `reporté au ${reportes.jusquA(`contrat:${d.contrat.id}`)?.slice(8, 10)}/${reportes.jusquA(`contrat:${d.contrat.id}`)?.slice(5, 7)}` : null,
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
              <p>{!pret ? "Lecture du dossier…" : vue === "factures" ? `${factures.length} facture${factures.length > 1 ? "s" : ""} · ${montant(compteurs.encaisser)} à encaisser` : `${actifs} retour${actifs > 1 ? "s" : ""} à facturer`}</p>
            </div>
          )}
        </section>
      </div>
    </TavCarte>
  );
}
