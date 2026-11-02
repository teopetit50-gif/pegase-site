"use client";

/* ══════════════════════════════════════════════════════════════════════
   TAMILA — vue d'ensemble (02/11/2026) : copie 1:1 de « My issues » de
   Linear (releves/linear-my-issues.md). Seul le contenu change.

   Onglets (Assigned · Created · Subscribed · Activity) :
     Échéances   délais (B20), audiences (B21), expertises (B24), relances
                 (B22) du cabinet, réunis (DECOUPAGES.md § TAMILA), groupés
                 comme les cycles : « Délais à confirmer » (Urgent issues),
                 « Sous 15 jours » et « Au-delà » avec leurs dates (Cycle 1, 2).
     Dossiers    la liste du cabinet (B10), groupée par statut ; les cinq
                 compteurs (B9) sont le filtre (bouton Filtre) et le volet.
     Clos        les dossiers clos, effacement prévu (E10).
     À décider   les demandes en attente (B18 : ouvrir, clôturer, lever une
                 muraille, confirmer un délai).
   « New issue » → « Nouveau dossier » (B16, G2). Une ligne mène à la page du
   dossier : la liste ne charge aucun dossier (lecture tracée, § 8.5-4).
   Adresse : ?vue=dossiers&filtre=a_confirmer|proches|audiences|ouverts|clos
   (atterrissage des lignes du point du matin E1-E3, E6, E10).
   ══════════════════════════════════════════════════════════════════════ */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { joursAvant, libelleMatiere, STATUTS_DOSSIER } from "@/components/espace/tamila/regles";
import type { Dossier } from "@/components/espace/tamila/types";
import { RACINE } from "@/components/espace2/modules";
import { Avatar, TamCarte, TamMenu } from "./TamCadre";
import { TamIcone, type NomTamIcone } from "./TamIcone";
import { dateCourte, echeancesDe, prioriteDe, type Echeance } from "./echeances";
import { FILTRES, dansFiltre, trier, useTamila, type Filtre, type Ligne } from "./donnees";
import NouveauDossier from "./NouveauDossier";
import Phrase from "./Phrase";
import "./tam-liste.css";

type Vue = "echeances" | "dossiers" | "clos" | "decider";
const VUES: { cle: Vue; libelle: string }[] = [
  { cle: "echeances", libelle: "Échéances" },
  { cle: "dossiers", libelle: "Dossiers" },
  { cle: "clos", libelle: "Clos" },
  { cle: "decider", libelle: "À décider" },
];

/* les couleurs d'étiquettes relevées sur Linear (linear-my-issues.md, « Couleurs d'étiquettes relevées ») */
const COULEURS = { rouge: "rgb(235, 87, 87)", rose: "rgb(247, 200, 193)", bleu: "rgb(38, 181, 206)", vert: "rgb(76, 183, 130)", violet: "lch(48 59.31 288.43)", beige: "lch(67.969 19.321 31.72)" };
const COULEUR_GENRE: Record<Echeance["genre"], string> = { delai: COULEURS.rouge, audience: COULEURS.violet, expertise: COULEURS.bleu, relance: COULEURS.beige };
const PALETTE = [COULEURS.vert, COULEURS.bleu, COULEURS.rose, COULEURS.violet, COULEURS.beige];
const couleurMatiere = (m: string | null) => PALETTE[[...(m ?? "")].reduce((a, c) => a + c.charCodeAt(0), 0) % PALETTE.length];

const ICONE_STATUT: Record<Dossier["statut"], NomTamIcone> = { attente: "IssueStatusTriage", ouvert: "IssueStatusStarted", audit: "IssueStatusReview", clos: "IssueStatusDone", efface: "StatusCanceled", refuse: "StatusCanceled" };

function Puce({ couleur, icone, retard, children, titre }: { couleur?: string; icone?: NomTamIcone; retard?: boolean; children: React.ReactNode; titre?: string }) {
  return (
    <span className={`tam-puce${retard ? " tam-puce--retard" : ""}`} title={titre}>
      {couleur ? <span className="tam-puce-point" style={{ "--point": couleur } as React.CSSProperties} aria-hidden="true" /> : null}
      {icone ? <TamIcone nom={icone} taille={14} /> : null}
      <span>{children}</span>
    </span>
  );
}

function Groupe({ libelle, compte, icone, dates, plus, children }: { libelle: string; compte: number; icone?: NomTamIcone; dates?: string; plus?: () => void; children: React.ReactNode }) {
  const [ouvert, setOuvert] = useState(true);
  return (
    <section className="tam-groupe" aria-label={libelle}>
      <div className="tam-groupe-tete">
        <button type="button" className="tam-replier" aria-expanded={ouvert} aria-label={ouvert ? "Replier le groupe" : "Déplier le groupe"} onClick={() => setOuvert((o) => !o)}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <path d="M5 6.5h6L8 10.5z" />
          </svg>
        </button>
        {icone ? <TamIcone nom={icone} className="tam-groupe-icone" /> : null}
        <span className="tam-groupe-libelle">{libelle}</span>
        <span className="tam-groupe-compte">{compte}</span>
        {dates ? <span className="tam-groupe-dates">{dates}</span> : null}
        {plus ? (
          <button type="button" className="tam-groupe-plus" aria-label="Nouveau dossier" title="Nouveau dossier" onClick={plus}>
            <TamIcone nom="Plus" />
          </button>
        ) : null}
      </div>
      {ouvert ? children : null}
    </section>
  );
}

const jourIso = (decalage: number) => {
  const d = new Date();
  d.setDate(d.getDate() + decalage);
  return d.toISOString().slice(0, 10);
};

export default function VueEnsemble() {
  const t = useTamila();
  const params = useSearchParams();
  const router = useRouter();
  const vue = (VUES.find((v) => v.cle === params.get("vue"))?.cle ?? (params.get("filtre") ? "dossiers" : "echeances")) as Vue;
  const filtre = (FILTRES.find((f) => f.cle === params.get("filtre"))?.cle ?? null) as Filtre | null;
  const [groupage, setGroupage] = useState<"statut" | "responsable">("statut");
  const [volet, setVolet] = useState(false);
  const [nouveau, setNouveau] = useState(false);
  const [phrase, setPhrase] = useState(false);
  const { lireAnnexes } = t;
  useEffect(() => lireAnnexes(), [lireAnnexes]);

  const aller = (v: Vue, f: Filtre | null = null) => {
    const q = new URLSearchParams();
    if (v !== "echeances") q.set("vue", v);
    if (f) q.set("filtre", f);
    router.replace(`${RACINE}/tamila${q.size ? `?${q}` : ""}`, { scroll: false });
  };

  const parDossier = useMemo(() => new Map(t.lignes.map((l) => [l.dossier.id, l])), [t.lignes]);
  const echeances = useMemo(
    () => echeancesDe(t.delaisCabinet, t.audiencesCabinet, t.annexes?.expertises ?? [], t.annexes?.attentes ?? [], t.objetAttente).filter((e) => parDossier.has(e.dossier)),
    [t.delaisCabinet, t.audiencesCabinet, t.annexes, t.objetAttente, parDossier],
  );
  const aConfirmer = echeances.filter((e) => e.aConfirmer);
  const reste = echeances.filter((e) => !e.aConfirmer);
  const proches = reste.filter((e) => joursAvant(e.date) <= 15);
  const loin = reste.filter((e) => joursAvant(e.date) > 15);

  const visibles = trier(t.lignes.filter((l) => dansFiltre(l, filtre)));
  const vivants = visibles.filter((l) => l.dossier.statut !== "clos");
  const clos = trier(t.lignes.filter((l) => l.dossier.statut === "clos"));
  const demandes = t.source === "exemple" ? t.local.flatMap((c) => c.demandes.filter((d) => d.statut === "en_attente")) : (t.cabinet?.demandes ?? []);

  const refDe = (id: string) => parDossier.get(id)?.clair?.reference ?? "Chiffré";
  const lienDossier = (id: string) => `${RACINE}/tamila/dossiers/${id}`;

  const ligneEcheance = (e: Echeance) => {
    const l = parDossier.get(e.dossier)!;
    const p = prioriteDe(e.date);
    const j = joursAvant(e.date);
    return (
      <Link key={e.cle} href={lienDossier(e.dossier)} className="tam-ligne">
        <span className="tam-case" aria-hidden="true" />
        <span className="tam-priorite" data-p={p.icone} title={`Priorité : ${p.libelle}`}>
          <TamIcone nom={p.icone} />
        </span>
        <span className="tam-identifiant">{refDe(e.dossier)}</span>
        <span className="tam-statut" data-s={e.statut} title={e.aConfirmer ? "À confirmer" : "En cours"}>
          <TamIcone nom={e.statut} taille={14} />
        </span>
        <span className="tam-titre">
          <span className="tam-titre-texte">{e.titre}</span>
          <Puce couleur={COULEUR_GENRE[e.genre]}>{e.etiquette}</Puce>
          <Puce icone="Project">{l.clair?.intitule ?? "Intitulé chiffré"}</Puce>
          <Puce icone="Cycle" titre={j < 0 ? `${-j} jour(s) de retard` : `Dans ${j} jour(s)`}>
            {j < 0 ? `J+${-j}` : `J-${j}`}
          </Puce>
          <Puce icone={j < 0 ? "CrossedOutCalendar" : "Calendar"} retard={j < 0} titre={`Échéance le ${dateCourte(e.date)}`}>
            {dateCourte(e.date)}
          </Puce>
          <Avatar nom={e.responsable ? t.nomDe(e.responsable) : null} />
        </span>
        <span className="tam-date" title={`Posée le ${new Date(e.creee).toLocaleString("fr-FR")}`}>
          {dateCourte(e.creee)}
        </span>
      </Link>
    );
  };

  const ligneDossier = (l: Ligne) => {
    const p = l.prochaine ? prioriteDe(l.prochaine) : { icone: "Priority0" as NomTamIcone, libelle: "Aucune échéance" };
    const j = l.prochaine ? joursAvant(l.prochaine) : null;
    const efface = l.dossier.effacement_prevu_le;
    return (
      <Link key={l.dossier.id} href={lienDossier(l.dossier.id)} className="tam-ligne">
        <span className="tam-case" aria-hidden="true" />
        <span className="tam-priorite" data-p={p.icone} title={`Priorité : ${p.libelle}`}>
          <TamIcone nom={p.icone} />
        </span>
        <span className="tam-identifiant">{l.clair?.reference ?? "Chiffré"}</span>
        <span className="tam-statut" data-s={ICONE_STATUT[l.dossier.statut]} title={STATUTS_DOSSIER[l.dossier.statut].libelle}>
          <TamIcone nom={ICONE_STATUT[l.dossier.statut]} taille={14} />
        </span>
        <span className="tam-titre">
          <span className="tam-titre-texte">{l.clair?.intitule ?? "Intitulé chiffré"}</span>
          {l.aConfirmer ? <Puce couleur={COULEURS.rouge}>{`${l.aConfirmer} à confirmer`}</Puce> : null}
          {l.dossier.matiere ? <Puce couleur={couleurMatiere(l.dossier.matiere)}>{libelleMatiere(l.dossier.matiere)}</Puce> : null}
          {l.dossier.juridiction ? <Puce icone="Project">{l.dossier.juridiction}</Puce> : null}
          {l.audience ? <Puce icone="Cycle" titre="Prochaine audience">{dateCourte(l.audience)}</Puce> : null}
          {l.prochaine && j !== null ? (
            <Puce icone={j < 0 ? "CrossedOutCalendar" : "Calendar"} retard={j < 0} titre={j < 0 ? "Échéance dépassée" : "Prochaine échéance"}>
              {dateCourte(l.prochaine)}
            </Puce>
          ) : null}
          {efface ? (
            <Puce icone={joursAvant(efface) <= 7 ? "CrossedOutCalendar" : "Calendar"} retard={joursAvant(efface) <= 7} titre="Effacement prévu">
              {`Effacé le ${dateCourte(efface)}`}
            </Puce>
          ) : null}
          <Avatar nom={l.responsable ? t.nomDe(l.responsable) : null} />
        </span>
        <span className="tam-date" title={`Créé le ${new Date(l.dossier.cree_le).toLocaleString("fr-FR")}`}>
          {dateCourte(l.dossier.cree_le)}
        </span>
      </Link>
    );
  };

  const groupesDossiers = (lignes: Ligne[]) => {
    if (groupage === "responsable") {
      const par = new Map<string, Ligne[]>();
      for (const l of lignes) {
        const k = l.responsable ?? "";
        par.set(k, [...(par.get(k) ?? []), l]);
      }
      return [...par.entries()].map(([k, ls]) => (
        <Groupe key={k || "aucun"} libelle={k ? t.nomDe(k) : "Sans responsable"} compte={ls.length} plus={() => setNouveau(true)}>
          {ls.map(ligneDossier)}
        </Groupe>
      ));
    }
    const ordre: Dossier["statut"][] = ["ouvert", "attente", "audit", "refuse", "clos"];
    return ordre
      .map((s) => ({ s, ls: lignes.filter((l) => l.dossier.statut === s) }))
      .filter((g) => g.ls.length)
      .map((g) => (
        <Groupe key={g.s} libelle={STATUTS_DOSSIER[g.s].libelle} compte={g.ls.length} icone={ICONE_STATUT[g.s]} plus={() => setNouveau(true)}>
          {g.ls.map(ligneDossier)}
        </Groupe>
      ));
  };

  const titreFiltre = filtre ? FILTRES.find((f) => f.cle === filtre)!.libelle : null;

  return (
    <TamCarte>
      <div className="tam-tete">
        <div className="tam-ligne1">
          <h2 className="tam-fil">{titreFiltre ?? "Vue d'ensemble"}</h2>
          <div className="tam-pousse" />
          <button type="button" className="tam-nouveau" onClick={() => setNouveau(true)} disabled={t.source === "reelle" && (!t.installe || t.moi?.role === "lecteur")} title="Nouveau dossier">
            <TamIcone nom="Plus" />
            <span className="tam-nouveau-libelle">Nouveau dossier</span>
          </button>
        </div>
        <div className="tam-ligne2" role="tablist" aria-label="Vues">
          {VUES.map((v, i) => (
            <button key={v.cle} type="button" role="tab" aria-selected={vue === v.cle} className={`tam-onglet${i >= 2 ? " tam-onglet-loin" : ""}`} onClick={() => aller(v.cle, v.cle === "dossiers" ? filtre : null)}>
              {v.libelle}
            </button>
          ))}
          <span className="tam-onglets-plus">
            <TamMenu
              libelle="2 de plus"
              classe="tam-onglet"
              enfants={
                <>
                  2 de plus <TamIcone nom="Chevron" taille={9} style={{ transform: "rotate(90deg)" }} />
                </>
              }
              options={VUES.slice(2).map((v) => ({ libelle: v.libelle, icone: v.cle === "clos" ? "IssueStatusDone" : "Inbox", action: () => aller(v.cle) }))}
            />
          </span>
          <div className="tam-droite">
            <TamMenu
              libelle="Filtrer"
              icone="Filtre"
              alignement="droite"
              options={[
                ...FILTRES.map((f) => ({ libelle: `${f.libelle} · ${t.compteurs[f.cle]}${filtre === f.cle ? " ✓" : ""}`, icone: "Filtre" as NomTamIcone, action: () => aller("dossiers", filtre === f.cle ? null : f.cle) })),
                "sep" as const,
                { libelle: "Retirer le filtre", icone: "StatusCanceled" as NomTamIcone, action: () => aller(vue === "dossiers" ? "dossiers" : vue), desactive: !filtre },
              ]}
            />
            <TamMenu
              libelle="Affichage"
              icone="Affichage"
              alignement="droite"
              options={[
                { libelle: `Grouper par statut${groupage === "statut" ? " ✓" : ""}`, icone: "IssueStatusStarted", action: () => setGroupage("statut") },
                { libelle: `Grouper par responsable${groupage === "responsable" ? " ✓" : ""}`, icone: "Members", action: () => setGroupage("responsable") },
              ]}
            />
            <button type="button" className={`tam-rond${volet ? " tam-rond--plein" : ""}`} aria-label={volet ? "Fermer les détails" : "Ouvrir les détails"} title="Détails" aria-expanded={volet} onClick={() => setVolet((v) => !v)}>
              <TamIcone nom="Volet" />
            </button>
          </div>
        </div>
      </div>
      <div className="tam-corps">
        <div className="tam-defile">
          {t.source === "reelle" && t.pret && !t.installe ? (
            <p className="tam-bandeau">
              Tamila n&apos;est pas installé pour ce cabinet.
              <Link className="tam-nouveau" href={`${RACINE}/tamila/reglages`}>
                Réglages
              </Link>
            </p>
          ) : null}
          {t.aLireParCoffre.length ? (
            <p className="tam-bandeau">
              Les clés de ce cabinet sont au coffre Scaleway : {t.aLireParCoffre.length} ouverture{t.aLireParCoffre.length > 1 ? "s" : ""} de clé pour lire les références (chacune est journalisée).
              <button type="button" className="tam-nouveau" onClick={() => void t.lireListeParCoffre()}>
                Lire les références
              </button>
            </p>
          ) : null}
          {t.source === "reelle" && t.pret && !t.phrase && !t.auCoffre && (t.cabinet?.dossiers.length ?? 0) > 0 ? (
            <p className="tam-bandeau">
              Les dossiers sont chiffrés. {t.cabinet?.cles.some((k) => k.statut === "active") ? "Saisissez la phrase du cabinet pour lire références et intitulés." : "Les clés ne sont lisibles que par les associés."}
              <button type="button" className="tam-nouveau" onClick={() => setPhrase(true)}>
                La phrase du cabinet
              </button>
            </p>
          ) : null}
          {t.source === "reelle" && (t.cabinet?.horsVue ?? 0) > 0 ? (
            <p className="tam-bandeau">
              {t.cabinet!.horsVue} dossier{t.cabinet!.horsVue! > 1 ? "s" : ""} du cabinet {t.cabinet!.horsVue! > 1 ? "sont" : "est"} hors de votre vue (muraille ou périmètre).
            </p>
          ) : null}
          {t.erreur ? (
            <p className="tam-bandeau" role="alert">
              {t.erreur}
            </p>
          ) : null}
          <div className="tam-liste" role="list">
            {!t.pret ? <p className="tam-vide-liste">Lecture des dossiers…</p> : null}
            {t.pret && vue === "echeances" ? (
              <>
                {aConfirmer.length ? (
                  <Groupe libelle="Délais à confirmer" compte={aConfirmer.length} plus={() => setNouveau(true)}>
                    {aConfirmer.map(ligneEcheance)}
                  </Groupe>
                ) : null}
                {proches.length ? (
                  <Groupe libelle="Sous 15 jours" compte={proches.length} icone="Cycle" dates={`${dateCourte(jourIso(0))} → ${dateCourte(jourIso(15))}`} plus={() => setNouveau(true)}>
                    {proches.map(ligneEcheance)}
                  </Groupe>
                ) : null}
                {loin.length ? (
                  <Groupe libelle="Au-delà" compte={loin.length} icone="Cycle" dates={`${dateCourte(jourIso(16))} → ${dateCourte(loin[loin.length - 1].date)}`} plus={() => setNouveau(true)}>
                    {loin.map(ligneEcheance)}
                  </Groupe>
                ) : null}
                {!echeances.length ? <p className="tam-vide-liste">Aucune échéance en cours dans les dossiers que vous voyez.</p> : null}
              </>
            ) : null}
            {t.pret && vue === "dossiers" ? (vivants.length ? groupesDossiers(vivants) : <p className="tam-vide-liste">{filtre ? "Aucun dossier dans ce filtre." : "Aucun dossier pour l'instant : « Nouveau dossier » ouvre le premier."}</p>) : null}
            {t.pret && vue === "clos" ? (
              clos.length ? (
                <Groupe libelle="Clos" compte={clos.length} icone="IssueStatusDone">
                  {clos.map(ligneDossier)}
                </Groupe>
              ) : (
                <p className="tam-vide-liste">Aucun dossier clos.</p>
              )
            ) : null}
            {t.pret && vue === "decider" ? (
              demandes.length ? (
                <Groupe libelle="Décisions en attente" compte={demandes.length} icone="IssueStatusTriage">
                  {demandes.map((d) => (
                    <Link key={d.id} href={lienDossier(d.objet_id ?? "")} className="tam-ligne">
                      <span className="tam-case" aria-hidden="true" />
                      <span className="tam-priorite" data-p="Priority2">
                        <TamIcone nom="Priority2" />
                      </span>
                      <span className="tam-identifiant">{refDe(d.objet_id ?? "")}</span>
                      <span className="tam-statut" data-s="IssueStatusTriage">
                        <TamIcone nom="IssueStatusTriage" taille={14} />
                      </span>
                      <span className="tam-titre">
                        <span className="tam-titre-texte">{d.resume}</span>
                        <Puce couleur={COULEURS.violet}>{({ ouvrir_dossier: "Ouverture", cloturer_dossier: "Clôture", lever_muraille: "Muraille", confirmer_delai: "Délai" } as Record<string, string>)[d.type_action] ?? d.type_action}</Puce>
                        <Puce icone="Project">{parDossier.get(d.objet_id ?? "")?.clair?.intitule ?? "Intitulé chiffré"}</Puce>
                      </span>
                      <span className="tam-date">{dateCourte(d.cree_le)}</span>
                    </Link>
                  ))}
                </Groupe>
              ) : (
                <p className="tam-vide-liste">Aucune décision en attente.</p>
              )
            ) : null}
          </div>
        </div>
        {volet ? (
          <aside className="tam-volet" aria-label="Détails">
            <div className="tam-volet-carte">
              <div className="tam-volet-titre">Compteurs</div>
              {FILTRES.map((f) => (
                <button key={f.cle} type="button" className="tam-volet-ligne" aria-pressed={filtre === f.cle} onClick={() => aller("dossiers", filtre === f.cle ? null : f.cle)}>
                  <span>
                    {f.libelle} <small>· {f.sous}</small>
                  </span>
                  <span>{t.compteurs[f.cle]}</span>
                </button>
              ))}
            </div>
          </aside>
        ) : null}
      </div>
      <NouveauDossier ouverte={nouveau} fermer={() => setNouveau(false)} />
      <Phrase ouverte={phrase} fermer={() => setPhrase(false)} />
    </TamCarte>
  );
}
