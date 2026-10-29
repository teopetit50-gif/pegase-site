"use client";

/* ══════════════════════════════════════════════════════════════════════
   DALIRO › Annuaire (29/10/2026, refonte des pages métiers)

   Les tiers de l'entreprise (B26, partie annuaire), sortis du dossier d'un
   chantier où l'écran d'avant les rangeait (ChantierVue, carte « Annuaire
   et bibliothèque »), sur Settings › Integrations de Linear :
     · colonne de 640, titre, recherche par nom ou commune (?q=) ;
     · à la place du carrousel « Essentials », un panneau « À surveiller »
       au même format : les entreprises dont l'attestation de vigilance est
       absente, de plus de six mois ou à renouveler (aucun : pas de panneau) ;
     · une rangée d'onglets par famille de rôles (?role=) puis des sections
       de cartes de 156 : pastille d'initiales à la place du logo, nom,
       rôles, commune, téléphone, courriel, et la vigilance des
       sous-traitants ;
     · un clic ouvre la page de l'entreprise (?entreprise=<id>), au format
       de la page d'une intégration : coordonnées, vigilance et ses dates,
       les chantiers et lots où elle intervient, ses prochains passages, et
       le lien vers la page Équipes (ses disponibilités, B27).
   Relevé : docs/refonte-metiers/releves/linear-integrations.md ;
   mesures : components/espace2/lin/linear-integrations.css (préfixe lig-).

   Lecture seule, comme l'annuaire de l'écran d'avant : aucun geste n'écrit
   ici (« Poser un prix » est dans Réglages). En base réelle, l'annuaire se
   lit dans un tableau de chantier (demander) ; la page d'une entreprise
   lit les tableaux de tous les chantiers (demanderTous).
   ══════════════════════════════════════════════════════════════════════ */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, CalendarRange, ChevronLeft, ChevronRight, Search } from "lucide-react";
import type { Teinte } from "@/components/espace/ui";
import { dateCourte } from "@/components/espace/format";
import { CONFIRMATIONS, ROLES_TIERS, STATUTS_CHANTIER, VIGILANCES } from "@/components/espace/daliro/etats";
import type { Chantier, Lot, Passage, Tiers, Vigilance } from "@/components/espace/daliro/types";
import { RACINE } from "../modules";
import { useDaliro } from "./donnees";
import "../lin/lin.css";
import "../lin/linear-integrations.css";

const BASE = `${RACINE}/daliro`;

/* les familles de rôles : un onglet chacune, si l'annuaire en compte */
type Groupe = { cle: string; libelle: string; roles: string[] };
const GROUPES: Groupe[] = [
  { cle: "sous-traitants", libelle: "Sous-traitants", roles: ["sous_traitant"] },
  { cle: "maitres-ouvrage", libelle: "Maîtres d'ouvrage", roles: ["maitre_ouvrage"] },
  { cle: "maitrise-oeuvre", libelle: "Maîtrise d'œuvre", roles: ["maitre_oeuvre"] },
  { cle: "fournisseurs", libelle: "Fournisseurs", roles: ["fournisseur", "loueur"] },
];
const CONNUS = GROUPES.flatMap((g) => g.roles);
const AUTRES: Groupe = { cle: "autres", libelle: "Autres", roles: [] };

const dans = (t: Tiers, g: Groupe) => (g.cle === "autres" ? !t.roles.length || t.roles.some((r) => !CONNUS.includes(r)) : t.roles.some((r) => g.roles.includes(r)));
/* en « Tous », chaque entreprise est rangée une fois, sous son premier rôle */
const rangement = (t: Tiers) => GROUPES.find((g) => dans(t, g)) ?? AUTRES;

const A_SURVEILLER: Vigilance[] = ["absente", "echue", "a_renouveler"];
const INTERVENANTS = ["sous_traitant", "autre_titulaire"];
const STATUTS_LOT: Record<Lot["statut"], string> = { a_venir: "à venir", en_cours: "en cours", termine: "terminé" };
const CANAUX: Record<string, string> = { email: "courriel", sms: "SMS", whatsapp: "WhatsApp" };

const sansAccent = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const jj = (s: string) => s.slice(0, 10);
const aujourdhui = () => new Date().toISOString().slice(0, 10);
const libelleRoles = (t: Tiers) => t.roles.map((r) => ROLES_TIERS[r] ?? r).join(", ");
const majuscule = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ");

/* « +33612345601 » → « 06 12 34 56 01 » ; le reste tel quel */
function telephone(v: string): string {
  const n = v.replace(/\s/g, "");
  const m = /^(?:\+33|0)(\d{9})$/.exec(n);
  return m ? `0${m[1]}`.replace(/(\d{2})(?=\d)/g, "$1 ") : v;
}

/* la pastille d'initiales, à la place du logo ; sa teinte suit l'identifiant */
const MOTS_VIDES = new Set(["m.", "mme", "m", "et", "de", "du", "des", "la", "le", "les", "sci", "sarl", "sas", "sasu", "eurl", "sa"]);
function initiales(nom: string): string {
  const mots = nom.split(/\s+/).filter((m) => m && /\p{L}/u.test(m.charAt(0)) && !MOTS_VIDES.has(m.toLowerCase()));
  const l = (mots.length ? mots : [nom]).slice(0, 2).map((m) => m.charAt(0).toUpperCase());
  return l.join("") || "?";
}
function ton(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return String(h % 8);
}
function Pastille({ t, taille }: { t: Tiers; taille?: 16 | 48 | 56 }) {
  return (
    <span className={`lig-pastille${taille ? ` lig-pastille--${taille}` : ""}`} data-ton={ton(t.id)} aria-hidden="true">
      {initiales(t.nom)}
    </span>
  );
}

function Badge({ teinte, children }: { teinte: Teinte; children: React.ReactNode }) {
  return (
    <span className="lig-badge" data-teinte={teinte}>
      <span className="lig-point" aria-hidden="true" />
      <span className="lig-badge-texte">{children}</span>
    </span>
  );
}

/* l'attestation vaut six mois : la date où ils sont atteints */
function sixMois(iso: string): string {
  const d = new Date(`${jj(iso)}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + 6);
  return d.toISOString().slice(0, 10);
}
function phraseVigilance(t: Tiers): string {
  const a = t.vigilance_attestation_le;
  const verifiee = t.vigilance_verifiee_le ? ` Vérifiée le ${dateCourte(t.vigilance_verifiee_le)}.` : "";
  if (t.vigilance === "absente" || !a) return "Aucune attestation de vigilance n'est enregistrée pour cette entreprise.";
  return `Attestation du ${dateCourte(a)} : six mois atteints le ${dateCourte(sixMois(a))}.${verifiee}`;
}

/* « jeu. 31 oct. », ou « du 31 oct. au 4 nov. » */
const fmtJour = (iso: string) => new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${jj(iso)}T00:00:00Z`));
const fmtCourt = (iso: string) => new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${jj(iso)}T00:00:00Z`));
const periode = (p: Passage) => (jj(p.debut) === jj(p.fin) ? majuscule(fmtJour(p.debut)) : `Du ${fmtCourt(p.debut)} au ${fmtCourt(p.fin)}`);
const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? "s" : ""}`;

export default function Annuaire() {
  const { source, pret, erreur: erreurBase, liste, tableau, premier, demander, demanderTous } = useDaliro();
  const params = useSearchParams();
  const routeur = useRouter();
  const chemin = usePathname();

  const entrepriseId = params.get("entreprise");

  /* en base réelle, l'annuaire se lit dans un tableau de chantier ; la page d'une entreprise, dans tous */
  useEffect(() => {
    if (source === "reelle" && pret && !premier && liste[0]) demander(liste[0].id);
  }, [source, pret, premier, liste, demander]);
  useEffect(() => {
    if (source === "reelle" && pret && entrepriseId) demanderTous();
  }, [source, pret, entrepriseId, demanderTous]);

  /* ——— l'adresse porte le rôle, la recherche et l'entreprise ouverte ——— */
  const adresse = (changes: Record<string, string | null>) => {
    const p = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(changes)) {
      if (v) p.set(k, v);
      else p.delete(k);
    }
    const s = p.toString();
    return s ? `${chemin}?${s}` : chemin;
  };
  const q = params.get("q") ?? "";
  const [saisie, setSaisie] = useState(q);
  const chercher = (v: string) => {
    setSaisie(v);
    routeur.replace(adresse({ q: v.trim() || null }), { scroll: false });
  };

  const tiers = useMemo(() => [...(premier?.tiers ?? [])].sort((a, b) => a.nom.localeCompare(b.nom, "fr")), [premier]);
  const groupes = useMemo(() => {
    const presents = GROUPES.filter((g) => tiers.some((t) => dans(t, g)));
    const avecLoueur = tiers.some((t) => t.roles.includes("loueur"));
    const l = presents.map((g) => (g.cle === "fournisseurs" && avecLoueur ? { ...g, libelle: "Fournisseurs et loueurs" } : g));
    return tiers.some((t) => dans(t, AUTRES)) ? [...l, AUTRES] : l;
  }, [tiers]);
  const groupe = groupes.find((g) => g.cle === params.get("role")) ?? null;

  const visibles = useMemo(() => {
    const m = sansAccent(q.trim());
    return tiers.filter((t) => (!groupe || dans(t, groupe)) && (!m || sansAccent(t.nom).includes(m) || sansAccent(t.commune ?? "").includes(m)));
  }, [tiers, groupe, q]);
  /* en « Tous » : une section par famille ; sur un onglet : la seule famille choisie */
  const sections = useMemo(
    () => (groupe ? [{ g: groupe, l: visibles }] : groupes.map((g) => ({ g, l: visibles.filter((t) => rangement(t).cle === g.cle) }))).filter((s) => s.l.length),
    [groupe, groupes, visibles],
  );

  /* « À surveiller » : vigilance absente, échue ou à renouveler, la plus grave d'abord */
  const surveiller = useMemo(
    () => tiers.filter((t) => t.vigilance && A_SURVEILLER.includes(t.vigilance)).sort((a, b) => A_SURVEILLER.indexOf(a.vigilance!) - A_SURVEILLER.indexOf(b.vigilance!) || a.nom.localeCompare(b.nom, "fr")),
    [tiers],
  );
  const [choisi, setChoisi] = useState(0);
  const enAvant = surveiller[Math.min(choisi, surveiller.length - 1)] ?? null;

  const enLecture = source === "reelle" && (!pret || (!premier && liste.length > 0));
  const sansChantier = source === "reelle" && pret && liste.length === 0;
  const lienFiche = (t: Tiers) => adresse({ entreprise: t.id });

  /* ——— la page d'une entreprise ——— */
  if (entrepriseId) {
    const t = tiers.find((x) => x.id === entrepriseId) ?? null;
    return (
      <div className="lin lig">
        <h1 className="v2-sr">{t ? t.nom : "Annuaire"}</h1>
        <div className="lig-barre">
          <Link href={adresse({ entreprise: null })} className="lig-retour">
            <ChevronLeft aria-hidden="true" />
            Annuaire
          </Link>
        </div>
        <div className="lig-colonne lig-fiche">
          {t ? (
            <Fiche t={t} liste={liste} tableau={tableau} />
          ) : (
            <p className="lig-vide">{erreurBase ? `La base réelle n'a pas répondu. ${erreurBase}` : enLecture ? "Lecture de l'annuaire…" : "Cette entreprise n'est pas dans l'annuaire."}</p>
          )}
        </div>
      </div>
    );
  }

  /* ——— le catalogue ——— */
  const carte = (t: Tiers) => {
    const vigilance = t.roles.includes("sous_traitant") && t.vigilance ? VIGILANCES[t.vigilance] : null;
    const lignes = [t.commune, t.telephone ? telephone(t.telephone) : null, t.email].filter(Boolean) as string[];
    return (
      <li key={t.id} className="lig-carte" data-badge={vigilance ? "" : undefined}>
        <Link href={lienFiche(t)} className="lig-lien" aria-label={`${t.nom}, ${libelleRoles(t)} : ouvrir la fiche`} />
        <span className="lig-carte-ligne">
          <Pastille t={t} />
          <span className="lig-carte-noms">
            <span className="lig-nom">{t.nom}</span>
            <span className="lig-roles">{libelleRoles(t)}</span>
          </span>
        </span>
        <p className="lig-desc">
          {lignes.length
            ? lignes.map((l, i) => (
                <span key={l}>
                  {i ? <br /> : null}
                  {l}
                </span>
              ))
            : "Aucune coordonnée enregistrée."}
        </p>
        {vigilance ? <Badge teinte={vigilance.teinte}>{vigilance.libelle}</Badge> : null}
        <ChevronRight className="lig-chevron" aria-hidden="true" />
      </li>
    );
  };

  return (
    <div className="lin lig">
      <h1 className="v2-sr">Annuaire</h1>
      <div className="lig-colonne">
        <div className="lig-tete">
          <h2 className="lig-titre">Annuaire</h2>
          <p className="lig-sous">Les entreprises avec qui vous travaillez : maîtres d&apos;ouvrage, sous-traitants, fournisseurs. Ouvrez une fiche pour voir ses chantiers et ses passages.</p>
        </div>

        <label className="lig-recherche">
          <Search aria-hidden="true" />
          <input className="lig-champ" type="search" placeholder="Rechercher par nom ou commune" aria-label="Rechercher une entreprise par nom ou commune" value={saisie} onChange={(e) => chercher(e.target.value)} />
        </label>

        {/* ——— « À surveiller » : le carrousel « Essentials », sans image ——— */}
        {enAvant ? (
          <section className="lig-surveiller" aria-label="À surveiller">
            <div id="lig-panneau" role={surveiller.length > 1 ? "tabpanel" : undefined}>
              <Link href={lienFiche(enAvant)} className="lig-panneau" data-teinte={VIGILANCES[enAvant.vigilance!].teinte}>
                <span className="lig-etiquette">À surveiller</span>
                <p className="lig-panneau-corps">{phraseVigilance(enAvant)}</p>
                <span className="lig-panneau-pied">
                  <Pastille t={enAvant} taille={56} />
                  <span className="lig-panneau-texte">
                    <span className="lig-panneau-nom">{enAvant.nom}</span>
                    <span className="lig-panneau-phrase">{VIGILANCES[enAvant.vigilance!].libelle}</span>
                  </span>
                  <ArrowRight aria-hidden="true" />
                </span>
              </Link>
            </div>
            {surveiller.length > 1 ? (
              <div className="lig-onglets" role="tablist" aria-label="Entreprises à surveiller">
                {surveiller.map((t, i) => (
                  <button key={t.id} type="button" role="tab" className="lig-onglet" aria-selected={t.id === enAvant.id} aria-controls="lig-panneau" onClick={() => setChoisi(i)}>
                    <Pastille t={t} taille={16} />
                    {t.nom}
                  </button>
                ))}
              </div>
            ) : null}
          </section>
        ) : null}

        {/* à 390 : le panneau devient une section en liste, comme « Essentials » chez Linear */}
        {surveiller.length ? (
          <section className="lig-section lig-surveiller-liste" aria-labelledby="lig-surveiller-titre">
            <h3 id="lig-surveiller-titre" className="lig-sur">
              À surveiller
            </h3>
            <ul className="lig-grille">{surveiller.map(carte)}</ul>
          </section>
        ) : null}

        {/* ——— les onglets des rôles ——— */}
        {groupes.length > 1 ? (
          <nav className="lig-onglets lig-onglets--roles" aria-label="Filtrer par rôle">
            <Link href={adresse({ role: null })} className="lig-onglet" aria-current={!groupe ? "page" : undefined} scroll={false}>
              Tous
            </Link>
            {groupes.map((g) => (
              <Link key={g.cle} href={adresse({ role: g.cle })} className="lig-onglet" aria-current={groupe?.cle === g.cle ? "page" : undefined} scroll={false}>
                {g.libelle}
              </Link>
            ))}
          </nav>
        ) : null}

        {/* ——— les sections de cartes ——— */}
        {erreurBase ? (
          <p className="lig-vide" data-erreur="" role="alert">
            La base réelle n&apos;a pas répondu. {erreurBase}
          </p>
        ) : enLecture ? (
          <p className="lig-vide">Lecture de l&apos;annuaire…</p>
        ) : sansChantier ? (
          <p className="lig-vide">L&apos;annuaire se lit avec vos chantiers : créez d&apos;abord un chantier.</p>
        ) : !tiers.length ? (
          <p className="lig-vide">L&apos;annuaire se remplit avec vos chantiers : maîtres d&apos;ouvrage, sous-traitants et fournisseurs.</p>
        ) : !sections.length ? (
          <p className="lig-vide">Aucune entreprise ne correspond.</p>
        ) : (
          sections.map(({ g, l }) => (
            <section key={g.cle} className="lig-section" aria-labelledby={`lig-${g.cle}`}>
              <h3 id={`lig-${g.cle}`} className="lig-sur">
                {g.libelle}
              </h3>
              <ul className="lig-grille">{l.map(carte)}</ul>
            </section>
          ))
        )}
      </div>
    </div>
  );
}

/* ══════ la page d'une entreprise : la page d'une intégration de Linear ══════ */

type LigneChantier = { c: Chantier; mentions: string[] };
type Prochain = { p: Passage; c: Chantier };

function Fiche({ t, liste, tableau }: { t: Tiers; liste: Chantier[]; tableau: ReturnType<typeof useDaliro>["tableau"] }) {
  const lus = liste.every((c) => tableau(c.id));

  /* les chantiers où elle intervient : ses rôles au chantier, ses lots, ses passages */
  const chantiers = useMemo<LigneChantier[]>(() => {
    const l: LigneChantier[] = [];
    for (const c of liste) {
      const m: string[] = [];
      if (c.maitre_ouvrage_id === t.id) m.push("Maître d'ouvrage");
      if (c.maitre_oeuvre_id === t.id) m.push("Maître d'œuvre");
      if (c.donneur_ordre_id === t.id) m.push("Donneur d'ordre");
      const tb = tableau(c.id);
      if (tb) {
        for (const lot of tb.lots.filter((x) => x.tiers_id === t.id)) m.push(`Lot ${lot.code} — ${lot.libelle} (${STATUTS_LOT[lot.statut]})`);
        const n = tb.passages.filter((p) => p.tiers_id === t.id && p.statut !== "annule").length;
        if (n) m.push(`${pluriel(n, "passage")} au planning`);
      }
      if (m.length) l.push({ c, mentions: m });
    }
    return l;
  }, [liste, tableau, t.id]);

  /* ses prochains passages, tous chantiers */
  const prochains = useMemo<Prochain[]>(() => {
    const jour = aujourdhui();
    const l: Prochain[] = [];
    for (const c of liste) {
      const tb = tableau(c.id);
      if (!tb) continue;
      for (const p of tb.passages) if (p.tiers_id === t.id && p.statut === "prevu" && jj(p.fin) >= jour) l.push({ p, c });
    }
    return l.sort((a, b) => a.p.debut.localeCompare(b.p.debut));
  }, [liste, tableau, t.id]);

  const sousTraitant = t.roles.includes("sous_traitant");
  const intervenant = t.roles.some((r) => INTERVENANTS.includes(r)) || prochains.length > 0;
  const vigilance = t.vigilance && (sousTraitant || t.vigilance !== "sans_objet") ? t.vigilance : null;
  const metas: [string, string][] = [
    ["Rôles", libelleRoles(t) || "—"],
    ...(t.commune ? [["Commune", t.commune] as [string, string]] : []),
    ...(t.siren ? [["SIREN", t.siren] as [string, string]] : []),
    ...(t.corps_etat.length ? [["Corps d'état", t.corps_etat.map(majuscule).join(", ")] as [string, string]] : []),
    ...(t.departements.length ? [["Départements", t.departements.join(", ")] as [string, string]] : []),
  ];

  return (
    <>
      <div className="lig-fiche-tete">
        <Pastille t={t} taille={48} />
        <div className="lig-fiche-noms">
          <h2 className="lig-fiche-titre">{t.nom}</h2>
          <p className="lig-fiche-phrase">{[libelleRoles(t), t.commune].filter(Boolean).join(" · ")}</p>
        </div>
      </div>

      {/* ——— la carte d'info : méta, puis les coordonnées ——— */}
      <section className="lig-info" aria-label="Coordonnées">
        <dl className="lig-metas">
          {metas.map(([k, v]) => (
            <div key={k} className="lig-meta">
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
        <h3 className="lig-info-titre">Coordonnées</h3>
        <ul className="lig-coord">
          {t.telephone ? (
            <li>
              <span className="lig-coord-libelle">Téléphone</span> · <a href={`tel:${t.telephone.replace(/\s/g, "")}`}>{telephone(t.telephone)}</a>
            </li>
          ) : null}
          {t.email ? (
            <li>
              <span className="lig-coord-libelle">Courriel</span> · <a href={`mailto:${t.email}`}>{t.email}</a>
            </li>
          ) : null}
          {!t.telephone && !t.email ? <li>Aucune coordonnée enregistrée.</li> : null}
          {intervenant ? (
            <li>
              <span className="lig-coord-libelle">Confirmation des passages</span> ·{" "}
              {t.confirmer_passages ? `demandée à J-2${t.canal ? ` par ${CANAUX[t.canal] ?? t.canal}` : ""}` : "non demandée"}
            </li>
          ) : null}
        </ul>
      </section>

      {/* ——— la vigilance et ses dates ——— */}
      {vigilance ? (
        <section className="lig-bloc" aria-labelledby="lig-vigilance">
          <div className="lig-bloc-tete">
            <div className="lig-bloc-noms">
              <h3 id="lig-vigilance" className="lig-bloc-titre">
                Vigilance
              </h3>
              <p className="lig-bloc-sous">L&apos;attestation de vigilance d&apos;un sous-traitant se renouvelle tous les six mois.</p>
            </div>
          </div>
          <ul className="lig-liste">
            <li className="lig-rang">
              <span className="lig-rang-texte">
                <span className="lig-rang-titre">Attestation de vigilance</span>
                <span className="lig-rang-aide">{t.vigilance_attestation_le ? `Du ${dateCourte(t.vigilance_attestation_le)}` : "Aucune attestation enregistrée"}</span>
              </span>
              <Badge teinte={VIGILANCES[vigilance].teinte}>{VIGILANCES[vigilance].libelle}</Badge>
            </li>
            <li className="lig-rang">
              <span className="lig-rang-texte">
                <span className="lig-rang-titre">Dernière vérification</span>
                <span className="lig-rang-aide">{t.vigilance_verifiee_le ? `Le ${dateCourte(t.vigilance_verifiee_le)}` : "Pas encore vérifiée"}</span>
              </span>
            </li>
            {t.vigilance_attestation_le ? (
              <li className="lig-rang">
                <span className="lig-rang-texte">
                  <span className="lig-rang-titre">Six mois atteints</span>
                  <span className="lig-rang-aide">Le {dateCourte(sixMois(t.vigilance_attestation_le))}</span>
                </span>
              </li>
            ) : null}
          </ul>
        </section>
      ) : null}

      {/* ——— les chantiers et lots ——— */}
      <section className="lig-bloc" aria-labelledby="lig-chantiers">
        <div className="lig-bloc-tete">
          <div className="lig-bloc-noms">
            <h3 id="lig-chantiers" className="lig-bloc-titre">
              Chantiers et lots
            </h3>
            <p className="lig-bloc-sous">{lus ? (chantiers.length ? `Elle intervient sur ${pluriel(chantiers.length, "chantier")}.` : "Elle n'intervient sur aucun chantier.") : "Lecture des chantiers…"}</p>
          </div>
        </div>
        {chantiers.length ? (
          <ul className="lig-liste">
            {chantiers.map(({ c, mentions }) => {
              const s = STATUTS_CHANTIER[c.statut];
              return (
                <li key={c.id} className="lig-rang">
                  <Link href={`${BASE}/chantiers/${c.id}`} className="lig-lien" aria-label={`${c.nom} : ouvrir la fiche du chantier`} />
                  <span className="lig-rang-texte">
                    <span className="lig-rang-titre">{c.nom}</span>
                    <span className="lig-rang-aide">{mentions.join(" · ")}</span>
                  </span>
                  <Badge teinte={s.teinte}>{s.libelle}</Badge>
                  <ChevronRight aria-hidden="true" />
                </li>
              );
            })}
          </ul>
        ) : null}
      </section>

      {/* ——— ses prochains passages, et ses disponibilités sur la page Équipes ——— */}
      {intervenant ? (
        <section className="lig-bloc" aria-labelledby="lig-passages">
          <div className="lig-bloc-tete">
            <div className="lig-bloc-noms">
              <h3 id="lig-passages" className="lig-bloc-titre">
                Prochains passages
              </h3>
              <p className="lig-bloc-sous">{lus ? (prochains.length ? `${pluriel(prochains.length, "passage")} prévu${prochains.length > 1 ? "s" : ""}, tous chantiers.` : "Aucun passage prévu.") : "Lecture du planning…"}</p>
            </div>
            <Link href={`${BASE}/equipes${sousTraitant ? "?type=sous-traitants" : ""}`} className="lig-petit">
              <CalendarRange aria-hidden="true" />
              Disponibilités
            </Link>
          </div>
          {prochains.length ? (
            <ul className="lig-liste">
              {prochains.map(({ p, c }) => {
                const conf = CONFIRMATIONS[p.confirmation];
                return (
                  <li key={p.id} className="lig-rang">
                    <Link href={`${BASE}/chantiers/${c.id}`} className="lig-lien" aria-label={`${periode(p)}, ${c.nom} : ouvrir la fiche du chantier`} />
                    <span className="lig-rang-texte">
                      <span className="lig-rang-titre">{periode(p)}</span>
                      <span className="lig-rang-aide">{[c.nom, p.tache, p.lot_code ? `lot ${p.lot_code}` : null].filter(Boolean).join(" · ")}</span>
                    </span>
                    <Badge teinte={conf.teinte}>{conf.libelle}</Badge>
                    <ChevronRight aria-hidden="true" />
                  </li>
                );
              })}
            </ul>
          ) : null}
        </section>
      ) : null}
    </>
  );
}
