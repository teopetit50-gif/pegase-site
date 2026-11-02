"use client";

/* ══════════════════════════════════════════════════════════════════════
   TAMILA — Arrivées (02/11/2026) : copie 1:1 du Triage de Linear
   (releves/linear-triage.md). Seul le contenu change.

   La file : les avis RPVA reçus par courriel, à rattacher (B7). Chaque
   ligne : sujet du courriel, n° RG cité (l'identifiant), expéditeur,
   échéance d'effacement (sept jours), priorité tirée de cette échéance.
   L'avis ouvert à droite (?avis=<id>) : titre, pilules (à rattacher,
   type supposé, dossier proposé par le même n° RG, pièces, effacement),
   texte du courriel, activité, et à la place de la boîte de commentaire
   le rattachement (B8, G7 : chaque pièce chiffrée avec la clé du dossier
   puis déposée). La barre de triage (Accept · Decline · Duplicate ·
   Snooze) : Rattacher · Écarter · Écarter comme doublon · Écarter, déjà
   saisi à la main (G8, motifs du socle) — chaque écart passe par une
   fenêtre de confirmation.
   Logique reprise d'AvisEntrantsTamila (écran d'avant) à l'identique.
   ══════════════════════════════════════════════════════════════════════ */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { MOTIFS_ECART, rgCite } from "@/components/espace/tamila/AvisEntrantsTamila";
import { chiffrerOctets, empreinte } from "@/components/espace/tamila/chiffrement";
import * as portes from "@/components/espace/tamila/portes";
import { TYPES_AVIS, joursAvant } from "@/components/espace/tamila/regles";
import { RACINE } from "@/components/espace2/modules";
import { Avatar, TamCarte, TamMenu } from "./TamCadre";
import { TamIcone, type NomTamIcone } from "./TamIcone";
import { Champ, TamFenetre } from "./TamFenetre";
import { dateCourte, dateLongue, ilYaCourt } from "./echeances";
import { useTamila } from "./donnees";
import { AVIS_ENTRANTS_PLUS } from "./exemplesPlus";
import { copier, estReporte, exporterCsv, useMemoire } from "./navigateur";
import NouveauDossier from "./NouveauDossier";
import "./tam-liste.css";
import "./tam-triage.css";

const ICI = `${RACINE}/tamila/arrivees`;
const normaliserRg = (rg: string) => rg.replace(/[^0-9/]/g, "");
type Tri = "recents" | "expiration";
type Vue = "tous" | "proposes" | "sans" | "reportes";

/* la priorité de Linear, lue dans le temps qui reste avant l'effacement de la copie en clair */
const prioriteEffacement = (iso: string): NomTamIcone => {
  const j = joursAvant(iso);
  return j <= 2 ? "Priority1" : j <= 4 ? "Priority2" : j <= 6 ? "Priority3" : "Priority4";
};

export default function Arrivees() {
  const t = useTamila();
  const params = useSearchParams();
  const router = useRouter();
  const choisi = params.get("avis");
  const [avis, setAvis] = useState<portes.AvisEntrant[] | null | undefined>(() => (t.source === "exemple" ? AVIS_ENTRANTS_PLUS : undefined));
  const [tri, setTri] = useState<Tri>("recents");
  const [vue, setVue] = useState<Vue>("tous");
  const favoris = useMemoire("favoris");
  const suivis = useMemoire("suivis");
  const reportes = useMemoire("reportes");
  const favori = favoris.a("page:arrivees");
  const [reporter, setReporter] = useState<{ avis: portes.AvisEntrant; jusqu: string } | null>(null);
  const [nouveau, setNouveau] = useState(false);
  const [choix, setChoix] = useState<{ dossier: string; type: string } | null>(null);
  const [ecart, setEcart] = useState<{ avis: portes.AvisEntrant; motif: string } | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [fait, setFait] = useState<string | null>(null);

  useEffect(() => {
    if (t.source !== "reelle") return;
    let actif = true;
    const h = window.setTimeout(async () => {
      const a = await portes.chargerAvisEntrants().catch(() => null);
      if (actif) setAvis(a);
    }, 0);
    return () => {
      actif = false;
      window.clearTimeout(h);
    };
  }, [t.source]);

  /* les dossiers où l'on peut rattacher : vivants, avec leur clair s'il est connu (E:661) */
  const vivants = useMemo(() => t.lignes.filter((l) => ["attente", "ouvert", "audit"].includes(l.dossier.statut)), [t.lignes]);
  const proposes = useMemo(() => {
    const p: Record<string, string> = {};
    for (const a of avis ?? []) {
      const rg = rgCite(`${a.reception?.sujet ?? ""} ${a.reception?.corps ?? ""}`);
      if (!rg) continue;
      const d = vivants.find((x) => x.clair?.numero_rg && normaliserRg(x.clair.numero_rg) === normaliserRg(rg));
      if (d) p[a.id] = d.dossier.id;
    }
    return p;
  }, [avis, vivants]);
  const refDe = (id: string) => t.lignes.find((x) => x.dossier.id === id)?.clair?.reference ?? "dossier chiffré";

  /* « suivi » : l'avis vise un dossier suivi (cloche de la page du dossier) ; il passe en tête */
  const suiviDe = (x: portes.AvisEntrant) => !!proposes[x.id] && suivis.a(`dossier:${proposes[x.id]}`);
  const liste = (avis ?? [])
    .filter((a) => (vue === "reportes" ? estReporte(reportes.valeur, a.id) : !estReporte(reportes.valeur, a.id)))
    .filter((a) => (vue === "proposes" ? !!proposes[a.id] : vue === "sans" ? !proposes[a.id] : true))
    .sort((a, b) => (tri === "recents" ? (a.recu_le < b.recu_le ? 1 : -1) : a.expire_le < b.expire_le ? -1 : 1))
    .sort((a, b) => Number(suiviDe(b)) - Number(suiviDe(a)));
  const a = (avis ?? []).find((x) => x.id === choisi) ?? null;

  const ouvrir = (id: string | null) => {
    setErreur(null);
    setChoix(null);
    router.replace(id ? `${ICI}?avis=${id}` : ICI, { scroll: false });
  };
  const retirer = (id: string) => {
    setAvis((x) => (x ? x.filter((y) => y.id !== id) : x));
    const reste = liste.filter((y) => y.id !== id);
    ouvrir(reste[0]?.id ?? null);
  };

  /* G7 — rattacher : chaque pièce jointe chiffrée avec la clé du dossier, déposée, puis l'avis rattaché */
  const rattacher = async (x: portes.AvisEntrant, dossier: string, type: string) => {
    if (!dossier) return setErreur("Choisissez le dossier.");
    setEnvoi(true);
    setErreur(null);
    try {
      if (t.source === "reelle") {
        const cle = await t.cleDe(dossier);
        if (!cle) throw new Error("La clé de ce dossier n'est pas ouverte (phrase du cabinet ou coffre) : la pièce ne peut pas être chiffrée.");
        const pieces: string[] = [];
        for (const p of x.reception?.pieces ?? []) {
          const clair = await portes.telecharger(p.chemin);
          const chiffre = await chiffrerOctets(cle, clair);
          clair.fill(0);
          const sha = await empreinte(chiffre);
          const chemin = `${t.clientId}/tamila_dossier/${dossier}/${p.nom}.${sha.slice(0, 12)}.chiffre`;
          await portes.televerser(chemin, chiffre);
          const r = await portes.deposerPiece(dossier, p.nom, p.mime || "application/octet-stream", chiffre.length, sha, chemin, type || null);
          pieces.push(r.piece_id);
        }
        if (!pieces.length) throw new Error("Ce courriel n'a pas de pièce jointe à rattacher : écartez-le, et saisissez l'avis à la main dans le dossier.");
        await portes.rattacherAvis(x.id, dossier, pieces);
        void t.relireDossier(dossier).catch(() => undefined);
      } else {
        await new Promise((r) => setTimeout(r, 400));
      }
      setFait(`Avis rattaché au dossier ${refDe(dossier)} : la pièce y est chiffrée, la copie reçue par courriel est effacée.`);
      retirer(x.id);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Le rattachement a échoué.");
    } finally {
      setEnvoi(false);
    }
  };

  /* G8 — écarter (motif du socle), après la fenêtre de confirmation */
  const ecarter = async () => {
    if (!ecart) return;
    setEnvoi(true);
    setErreur(null);
    try {
      if (t.source === "reelle") await portes.ecarterAvis(ecart.avis.id, ecart.motif);
      else await new Promise((r) => setTimeout(r, 300));
      setFait("Avis écarté : sa copie reçue par courriel est effacée.");
      retirer(ecart.avis.id);
      setEcart(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base a refusé.");
    } finally {
      setEnvoi(false);
    }
  };

  const rgDe = (x: portes.AvisEntrant) => rgCite(`${x.reception?.sujet ?? ""} ${x.reception?.corps ?? ""}`);
  const dossierChoisi = a ? (choix?.dossier ?? proposes[a.id] ?? "") : "";
  const typeChoisi = a ? (choix?.type ?? a.type_suppose ?? "") : "";
  const nb = (avis ?? []).length;

  return (
    <TamCarte>
      <div className="tam-triage" data-ouvert={!!a}>
        <div className="tam-tri-liste">
          <div className="tam-tri-tete">
            <h2>Arrivées</h2>
            <button
              type="button"
              className="tam-rond"
              aria-pressed={favori}
              aria-label={favori ? "Désépingler les Arrivées" : "Épingler les Arrivées"}
              title={favori ? "Désépingler (quitte « Épinglés » de la vue d'ensemble)" : "Épingler en tête de la vue d'ensemble"}
              onClick={() => favoris.basculer("page:arrivees")}
            >
              <TamIcone nom={favori ? "Favorite" : "Etoile"} />
            </button>
            <div className="tam-pousse" />
            <TamMenu
              libelle="Filtrer"
              icone="Filtre"
              alignement="droite"
              options={[
                { libelle: `Tous les avis${vue === "tous" ? " ✓" : ""}`, icone: "Inbox", action: () => setVue("tous") },
                { libelle: `Dossier proposé (même n° RG)${vue === "proposes" ? " ✓" : ""}`, icone: "Project", action: () => setVue("proposes") },
                { libelle: `Sans dossier lisible${vue === "sans" ? " ✓" : ""}`, icone: "Alert", action: () => setVue("sans") },
                { libelle: `Reportés${vue === "reportes" ? " ✓" : ""}`, icone: "AlarmClock", action: () => setVue("reportes") },
              ]}
            />
            <TamMenu
              libelle="Affichage"
              icone="Affichage"
              alignement="droite"
              options={[
                { libelle: `Les plus récents d'abord${tri === "recents" ? " ✓" : ""}`, icone: "Created", action: () => setTri("recents") },
                { libelle: `Effacés le plus tôt d'abord${tri === "expiration" ? " ✓" : ""}`, icone: "Calendar", action: () => setTri("expiration") },
                "sep",
                { libelle: "Exporter la file affichée (CSV)", icone: "Spreadsheet", action: () => exporterCsv("tamila-arrivees", [["Reçu le", "Sujet", "N° RG", "Type supposé", "Dossier proposé", "Pièces", "Effacé le"], ...liste.map((x) => [x.recu_le.slice(0, 16).replace("T", " "), x.reception?.sujet ?? "", rgDe(x) ?? "", x.type_suppose ?? "", proposes[x.id] ? refDe(proposes[x.id]) : "", x.nb_pieces, x.expire_le.slice(0, 10)])]) },
              ]}
            />
          </div>
          <div className="tam-tri-defile" role="list" aria-label="Avis RPVA à rattacher">
            {avis === undefined ? <p className="tam-vide-liste">Lecture de la file…</p> : null}
            {avis === null ? <p className="tam-vide-liste">La file des avis reçus par courriel n&apos;est pas installée sur cette base.</p> : null}
            {avis && !liste.length ? <p className="tam-vide-liste">{nb ? "Aucun avis dans ce filtre." : "Aucun avis à rattacher."}</p> : null}
            {liste.map((x) => {
              const rg = rgDe(x);
              const j = joursAvant(x.expire_le);
              const p = prioriteEffacement(x.expire_le);
              return (
                <Link key={x.id} href={`${ICI}?avis=${x.id}`} replace scroll={false} className="tam-tri-ligne" aria-current={x.id === choisi} role="listitem">
                  <span className="tam-tri-l1">
                    <span className="tam-tri-titre">{x.reception?.sujet ?? "Avis reçu par courriel"}</span>
                    <span className="tam-tri-id">{rg ?? "—"}</span>
                  </span>
                  <span className="tam-tri-l2">
                    <span className="tam-tri-auteur">
                      <Avatar nom={x.reception?.de_nom ?? "e-barreau"} taille={16} />
                      {x.reception?.de_nom ?? "e-barreau"}
                    </span>
                    {j <= 2 ? (
                      <span className="tam-puce tam-puce--retard" title="Copie en clair effacée bientôt">
                        <TamIcone nom="CrossedOutCalendar" taille={14} />
                        <span>{dateCourte(x.expire_le)}</span>
                      </span>
                    ) : null}
                    <span className="tam-tri-prio" data-p={p}>
                      <TamIcone nom={p} />
                    </span>
                    {suiviDe(x) ? (
                      <span className="tam-puce" title="Le dossier proposé est suivi">
                        <TamIcone nom="Subscribe" taille={14} />
                        <span>suivi</span>
                      </span>
                    ) : null}
                    {estReporte(reportes.valeur, x.id) ? <span className="tam-tri-quand">reporté au {dateCourte(reportes.valeur[x.id])}</span> : null}
                    <span className="tam-tri-quand">{ilYaCourt(x.recu_le)}</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </div>

        {a ? (
          <div className="tam-tri-detail">
            <div className="tam-tri-tete">
              <button type="button" className="tam-rond tam-tri-retour" aria-label="Revenir à la liste" onClick={() => ouvrir(null)}>
                <TamIcone nom="Chevron" style={{ transform: "rotate(180deg)" }} />
              </button>
              <span className="tam-tri-fil">
                <h2>
                  {rgDe(a) ? <span>RG {rgDe(a)} </span> : null}
                  {a.reception?.sujet ?? "Avis reçu par courriel"}
                </h2>
              </span>
              <TamMenu
                libelle="Actions de l'avis"
                options={[
                  ...(proposes[a.id] ? [{ libelle: `Ouvrir le dossier ${refDe(proposes[a.id])}`, icone: "Project" as NomTamIcone, href: `${RACINE}/tamila/dossiers/${proposes[a.id]}` }] : []),
                  ...(rgDe(a) ? [{ libelle: "Copier le n° RG", icone: "LienUrl" as NomTamIcone, action: () => void navigator.clipboard?.writeText(rgDe(a)!) }] : []),
                  { libelle: "Revenir à la file", icone: "Inbox", action: () => ouvrir(null) },
                ]}
              />
              <div className="tam-tri-actions">
                <button type="button" className="tam-rond" aria-label="Rattacher à son dossier" title="Rattacher à son dossier" onClick={() => void rattacher(a, dossierChoisi, typeChoisi)} disabled={envoi}>
                  <TamIcone nom="Resolved" />
                </button>
                {t.avocat ? (
                  <>
                    <button type="button" className="tam-rond" aria-label="Écarter l'avis" title="Écarter l'avis" onClick={() => setEcart({ avis: a, motif: "pas_un_avis" })}>
                      <TamIcone nom="StatusCanceled" />
                    </button>
                    <button type="button" className="tam-rond" aria-label="Écarter comme doublon" title="Écarter comme doublon" onClick={() => setEcart({ avis: a, motif: "doublon" })}>
                      <TamIcone nom="StatusDuplicate" />
                    </button>
                    <button
                      type="button"
                      className="tam-rond"
                      aria-label={estReporte(reportes.valeur, a.id) ? "Ne plus reporter" : "Reporter"}
                      title={estReporte(reportes.valeur, a.id) ? `Reporté au ${dateCourte(reportes.valeur[a.id])} : le remettre dans la file` : "Reporter : l'avis quitte la file jusqu'à la date choisie (avant son effacement)"}
                      onClick={() => (estReporte(reportes.valeur, a.id) ? reportes.poser(a.id, null) : setReporter({ avis: a, jusqu: new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10) }))}
                    >
                      <TamIcone nom="AlarmClock" />
                    </button>
                  </>
                ) : null}
              </div>
            </div>
            {/* la barre flottante (787×44, p 8 12 8 0) : boutons ronds pleins à droite */}
            <div className="tam-tri-barre">
              {proposes[a.id] ? (
                <Link className="tam-rond tam-rond--plein" href={`${RACINE}/tamila/dossiers/${proposes[a.id]}`} aria-label={`Ouvrir le dossier ${refDe(proposes[a.id])}`} title={`Ouvrir le dossier ${refDe(proposes[a.id])}`}>
                  <TamIcone nom="Project" />
                </Link>
              ) : null}
              <button type="button" className="tam-rond tam-rond--plein" aria-label="Copier l'adresse de l'avis" title="Copier l'adresse de l'avis" onClick={() => void copier(window.location.href)}>
                <TamIcone nom="LienUrl" />
              </button>
              {/* « Copy as prompt | Choose coding tool » de Linear : copier pour l'assistant, et le menu des autres copies */}
              <span style={{ display: "inline-flex" }}>
                <button
                  type="button"
                  className="tam-bouton"
                  style={{ borderRadius: "9999px 0 0 9999px", borderRight: 0 }}
                  title="Copier pour l'assistant : un résumé en clair de l'avis"
                  onClick={() =>
                    void copier(
                      [`Avis RPVA reçu ${ilYaCourt(a.recu_le)} de ${a.reception?.de_nom ?? "e-barreau"}`, a.reception?.sujet ?? "", rgDe(a) ? `N° RG : ${rgDe(a)}` : "", proposes[a.id] ? `Dossier proposé : ${refDe(proposes[a.id])}` : "", a.type_suppose ? `Type supposé : ${TYPES_AVIS[a.type_suppose as keyof typeof TYPES_AVIS] ?? a.type_suppose}` : "", "", a.reception?.corps ?? ""]
                        .filter((x, i) => x || i === 5)
                        .join("\n"),
                    )
                  }
                >
                  Copier pour l&apos;assistant
                </button>
                <TamMenu
                  libelle="Autres copies"
                  icone="Chevron"
                  alignement="droite"
                  classe="tam-bouton"
                  options={[
                    { libelle: "Copier le texte du courriel", icone: "Email", action: () => void copier(a.reception?.corps ?? "") },
                    { libelle: "Copier le n° RG", icone: "LienUrl", action: () => void copier(rgDe(a) ?? ""), desactive: !rgDe(a) },
                    { libelle: "Copier le sujet", icone: "Page", action: () => void copier(a.reception?.sujet ?? "") },
                  ]}
                />
              </span>
            </div>
            <div className="tam-tri-corps">
              <div className="tam-tri-colonne">
                <h1 className="tam-tri-grand">{a.reception?.sujet ?? "Avis reçu par courriel"}</h1>
                <div className="tam-pilules">
                  <span className="tam-pilule" data-valeur="">
                    <TamIcone nom="IssueStatusTriage" style={{ color: "var(--tam-triage)" }} />
                    <span>À rattacher</span>
                  </span>
                  <span className="tam-pilule" data-valeur={a.type_suppose ? "" : undefined}>
                    <TamIcone nom="Label" />
                    <span>{a.type_suppose ? (TYPES_AVIS[a.type_suppose as keyof typeof TYPES_AVIS] ?? a.type_suppose) : "Type à lire"}</span>
                  </span>
                  <span className="tam-pilule" data-valeur={proposes[a.id] ? "" : undefined}>
                    <TamIcone nom="Project" />
                    <span>{proposes[a.id] ? `${refDe(proposes[a.id])} (même n° RG)` : rgDe(a) ? `RG ${rgDe(a)} : aucun dossier lisible` : "Dossier"}</span>
                  </span>
                  <span className="tam-pilule" data-valeur="">
                    <TamIcone nom="Attachment" />
                    <span>
                      {a.nb_pieces} pièce{a.nb_pieces > 1 ? "s" : ""} jointe{a.nb_pieces > 1 ? "s" : ""}
                    </span>
                  </span>
                  <span className="tam-pilule" data-valeur="">
                    <TamIcone nom={joursAvant(a.expire_le) <= 2 ? "CrossedOutCalendar" : "Calendar"} style={joursAvant(a.expire_le) <= 2 ? { color: "var(--tam-rouge)" } : undefined} />
                    <span>Effacé le {dateCourte(a.expire_le)}</span>
                  </span>
                </div>
                <p className="tam-tri-texte">{(a.reception?.corps ?? "").slice(0, 600) || "Le courriel n'a pas de texte."}</p>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 24 }}>
                  <h3 className="tam-tri-h3" style={{ marginTop: 0 }}>
                    Activité
                  </h3>
                  {proposes[a.id] ? (
                    <button type="button" className="tam-nouveau" onClick={() => suivis.basculer(`dossier:${proposes[a.id]}`)} title="Les avis du dossier suivi passent en tête de la file">
                      {suivis.a(`dossier:${proposes[a.id]}`) ? "Ne plus suivre le dossier" : "Suivre le dossier"}
                    </button>
                  ) : null}
                </div>
                <p className="tam-evenement">
                  <Avatar nom={a.reception?.de_nom ?? "e-barreau"} taille={14} />
                  <b>{a.reception?.de_nom ?? "e-barreau"}</b> a envoyé l&apos;avis{a.reception?.de_adresse ? ` (${a.reception.de_adresse})` : ""} <b>·</b> {ilYaCourt(a.recu_le)}
                </p>
                <p className="tam-evenement">
                  <TamIcone nom="Lock" taille={14} />
                  L&apos;avis transite en clair chez le prestataire de courriel et dans sa réception le temps du rattachement, sept jours au plus : copie effacée le {dateLongue(a.expire_le)} s&apos;il n&apos;est pas rattaché.
                </p>
                <div className="tam-composeur" role="group" aria-label="Rattacher l'avis à son dossier">
                  <div className="tam-champs-ligne">
                    <Champ libelle="Dossier">
                      <select value={dossierChoisi} onChange={(e) => setChoix({ dossier: e.target.value, type: typeChoisi })}>
                        <option value="">— choisir —</option>
                        {vivants.map((d) => (
                          <option key={d.dossier.id} value={d.dossier.id}>
                            {d.clair ? `${d.clair.reference} — ${d.clair.intitule}` : `Dossier chiffré (${d.dossier.id.slice(0, 8)})`}
                            {proposes[a.id] === d.dossier.id ? " · proposé" : ""}
                          </option>
                        ))}
                      </select>
                    </Champ>
                    <Champ libelle="Type d'avis">
                      <select value={typeChoisi} onChange={(e) => setChoix({ dossier: dossierChoisi, type: e.target.value })}>
                        <option value="">— à lire par le lecteur —</option>
                        {(Object.keys(TYPES_AVIS) as (keyof typeof TYPES_AVIS)[]).map((k) => (
                          <option key={k} value={k}>
                            {TYPES_AVIS[k]}
                          </option>
                        ))}
                      </select>
                    </Champ>
                  </div>
                  <p className="tam-champ-aide">
                    Chaque pièce jointe ({a.nb_pieces}) est chiffrée dans votre navigateur avec la clé du dossier, puis déposée ; le lecteur la lira et posera les délais. La copie reçue en clair est ensuite effacée.
                  </p>
                  {erreur ? (
                    <p className="tam-note" data-teinte="rouge" role="alert">
                      {erreur}
                    </p>
                  ) : null}
                  <div className="tam-composeur-pied">
                    <button type="button" className="tam-bouton tam-bouton--principal" disabled={envoi || !dossierChoisi} onClick={() => void rattacher(a, dossierChoisi, typeChoisi)}>
                      {envoi ? "Chiffrement…" : "Chiffrer et rattacher"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="tam-tri-vide">
            {/* l'illustration de Linear (132×84, linear-triage.md), prise telle quelle sur les captures de référence */}
            {/* eslint-disable-next-line @next/next/no-img-element -- image fixe, déjà à sa taille */}
            <img className="tam-tri-illu tam-tri-illu--sombre" src="/espace2/tamila/triage-vide-sombre.png" alt="" width={136} height={87} />
            {/* eslint-disable-next-line @next/next/no-img-element -- idem, thème clair */}
            <img className="tam-tri-illu tam-tri-illu--clair" src="/espace2/tamila/triage-vide-clair.png" alt="" width={136} height={87} />
            {fait ? <p role="status">{fait}</p> : null}
            <span>
              {nb} avis à rattacher
            </span>
            <button type="button" className="tam-pilule" onClick={() => setNouveau(true)} disabled={t.source === "reelle" && (!t.installe || t.moi?.role === "lecteur")}>
              <TamIcone nom="Plus" />
              Nouveau dossier
            </button>
          </div>
        )}
      </div>
      <TamFenetre
        titre="Écarter l'avis"
        sous={ecart?.avis.reception?.sujet ?? "Avis reçu par courriel"}
        ouverte={!!ecart}
        fermer={() => !envoi && setEcart(null)}
        pied={
          <button type="button" className="tam-bouton tam-bouton--danger" disabled={envoi} onClick={() => void ecarter()}>
            {envoi ? "…" : "Écarter"}
          </button>
        }
      >
        <Champ libelle="Motif">
          <select value={ecart?.motif ?? "pas_un_avis"} onChange={(e) => ecart && setEcart({ ...ecart, motif: e.target.value })}>
            {Object.entries(MOTIFS_ECART).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </select>
        </Champ>
        <p className="tam-note">La copie de l&apos;avis reçue par courriel est effacée ; rien n&apos;est déposé au dossier.</p>
        {erreur ? (
          <p className="tam-note" data-teinte="rouge" role="alert">
            {erreur}
          </p>
        ) : null}
      </TamFenetre>
      <TamFenetre
        titre="Reporter l'avis"
        sous="L'avis quitte la file de ce navigateur jusqu'à la date choisie ; rien n'est écrit en base. Sa copie en clair reste effacée à sept jours s'il n'est pas rattaché."
        ouverte={!!reporter}
        fermer={() => setReporter(null)}
        pied={
          <button
            type="button"
            className="tam-bouton tam-bouton--principal"
            disabled={!reporter?.jusqu}
            onClick={() => {
              if (!reporter) return;
              reportes.poser(reporter.avis.id, reporter.jusqu);
              setFait(`Avis reporté au ${dateCourte(reporter.jusqu)}.`);
              ouvrir(null);
              setReporter(null);
            }}
          >
            Reporter
          </button>
        }
      >
        <Champ libelle="Jusqu'au" aide={reporter ? `Effacement de la copie en clair le ${dateLongue(reporter.avis.expire_le)}.` : undefined}>
          <input type="date" min={new Date().toISOString().slice(0, 10)} max={reporter?.avis.expire_le.slice(0, 10)} value={reporter?.jusqu ?? ""} onChange={(e) => reporter && setReporter({ ...reporter, jusqu: e.target.value })} />
        </Champ>
      </TamFenetre>
      <NouveauDossier ouverte={nouveau} fermer={() => setNouveau(false)} />
    </TamCarte>
  );
}
