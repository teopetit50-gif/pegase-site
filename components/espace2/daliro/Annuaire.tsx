"use client";

/* ══════════════════════════════════════════════════════════════════════
   DALIRO › Annuaire — copie 1:1 de la liste People d'Attio et de la fiche
   d'un contact (02/11/2026, règles de Teo : docs/refonte-metiers/REGLES.md ;
   relevé : docs/refonte-metiers/releves/attio-people.md ; styles :
   ./dal-attio.css, préfixe dat-).

   Ce qu'Attio montre, et ce que c'est ici :
     en-tête « People »                → « Annuaire » (fil : « Annuaire / <entreprise> »)
     vue « Recently Contacted People ⌄ »
                                        → « Toutes les entreprises ⌄ » : une vue
                                          par famille de rôles (?role=)
     « Sorted by Last interaction »     → « Trié par Nom » (Nom, Prochain passage,
                                          Vigilance ; ?tri=)
     « Filter »                         → « Filtrer » : nom ou commune (?q=) et
                                          « À surveiller » (vigilance absente, de plus
                                          de six mois, à renouveler ou à vérifier ; ?veille=1)
     grille : Person · Connection strength · Last email interaction ·
     Last calendar interaction (colonnes calculées, teintées)
                                        → Entreprise · Vigilance (même pastille,
                                          mêmes couleurs par niveau) · Dernier passage ·
                                          Prochain passage ; puis Rôles, une colonne
                                          ajoutée comme Attio les range (avant « Add column »)
     pied « 77 count »                  → « N entreprises »
     fiche d'un contact (?entreprise=)  → la fiche d'une entreprise :
       nom, rangée d'actions            → « Écrire un courriel » (mailto),
                                          « Appeler » (tel), « Disponibilités » (sa page
                                          dans Équipes)
       « Record Details »               → Nom, Courriel, Téléphone, Rôles, Commune,
                                          SIREN ; « Voir toutes les valeurs » : corps
                                          d'état, départements, confirmation J-2
       « Lists »                        → « Chantiers » : ceux où elle intervient
       onglets Overview / Activity / … → Vue d'ensemble · Passages · Chantiers · Lots
       « Highlights » (3×2)             → Vigilance · Prochain passage · Rôles ·
                                          Courriel · Téléphone · Commune
       « Activity »                     → les passages (prochains d'abord)
       « Notes »                        → les chantiers (rôle, lots, statut)
       « Tasks »                        → ses lots (rond plein quand le lot est fini)

   Lecture seule, comme l'annuaire de l'écran d'avant (inventaire B26 :
   « aucun geste d'écriture » ; « Poser un prix » est dans Réglages). En base
   réelle, l'annuaire se lit dans un tableau de chantier (demander) ; la fiche
   lit les tableaux de tous les chantiers (demanderTous).
   ══════════════════════════════════════════════════════════════════════ */

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowDownUp,
  AtSign,
  Briefcase,
  CalendarCheck,
  CalendarClock,
  CalendarRange,
  ChevronDown,
  CircleCheck,
  Hash,
  HardHat,
  IdCard,
  LayoutGrid,
  ListFilter,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  User,
  Users,
} from "lucide-react";
import { CONFIRMATIONS, ROLES_TIERS, STATUTS_CHANTIER } from "@/components/espace/daliro/etats";
import type { Chantier, Lot, Passage, Tiers, Vigilance } from "@/components/espace/daliro/types";
import { RACINE } from "../modules";
import { useDaliro } from "./donnees";
import "./dal-attio.css";

const BASE = `${RACINE}/daliro`;

/* les familles de rôles : une vue chacune, si l'annuaire en compte */
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

/* la pastille « Connection strength » d'Attio (sprite : rect x4 y4 w8 h8 rx3), ses quatre couleurs
   par niveau, et le gris « No communication » : ici, la vigilance */
const NIVEAUX: Record<Vigilance, { libelle: string; couleur: string; rang: number }> = {
  a_jour: { libelle: "À jour", couleur: "#00D17E", rang: 5 },
  a_renouveler: { libelle: "À renouveler", couleur: "#266DF0", rang: 3 },
  a_verifier: { libelle: "À vérifier", couleur: "#F97514", rang: 2 },
  echue: { libelle: "Plus de six mois", couleur: "#FF5454", rang: 1 },
  absente: { libelle: "Attestation absente", couleur: "#FF5454", rang: 0 },
  sans_objet: { libelle: "Sans objet", couleur: "#77797C", rang: 4 },
};
const A_SURVEILLER: Vigilance[] = ["absente", "echue", "a_renouveler", "a_verifier"];
const STATUTS_LOT: Record<Lot["statut"], string> = { a_venir: "à venir", en_cours: "en cours", termine: "terminé" };
const CANAUX: Record<string, string> = { email: "courriel", sms: "SMS", whatsapp: "WhatsApp" };
type Tri = "nom" | "prochain" | "vigilance";
const TRIS: Record<Tri, string> = { nom: "Nom", prochain: "Prochain passage", vigilance: "Vigilance" };

const sansAccent = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const jj = (s: string) => s.slice(0, 10);
const aujourdhui = () => {
  const d = new Date();
  return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, "0")}-${`${d.getDate()}`.padStart(2, "0")}`;
};
const libelleRoles = (t: Tiers) => t.roles.map((r) => ROLES_TIERS[r] ?? r).join(", ");
const majuscule = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ");
const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? "s" : ""}`;
const num = (iso: string) => {
  const [a, m, j] = iso.slice(0, 10).split("-").map(Number);
  return Math.floor(Date.UTC(a, (m || 1) - 1, j || 1) / 86_400_000);
};

/* les dates relatives d'Attio (« 1 day ago », « about 1 month ago », « over 1 year ago ») */
function relatif(jour: string, auj: string): string {
  const n = num(jour) - num(auj);
  if (n === 0) return "aujourd'hui";
  if (n === 1) return "demain";
  if (n === -1) return "hier";
  const a = Math.abs(n);
  const quoi = a < 30 ? pluriel(a, "jour") : a < 60 ? "environ 1 mois" : a < 365 ? `environ ${Math.round(a / 30)} mois` : a < 730 ? "plus d'un an" : `plus de ${Math.floor(a / 365)} ans`;
  return n > 0 ? `dans ${quoi}` : `il y a ${quoi}`;
}
/* « +33612345601 » → « 06 12 34 56 01 » ; le reste tel quel */
function telephone(v: string): string {
  const n = v.replace(/\s/g, "");
  const m = /^(?:\+33|0)(\d{9})$/.exec(n);
  return m ? `0${m[1]}`.replace(/(\d{2})(?=\d)/g, "$1 ") : v;
}

function Force({ v }: { v: Vigilance | null | undefined }) {
  const n = v ? NIVEAUX[v] : null;
  return (
    <span className="dat-force">
      <svg width={16} height={16} viewBox="0 0 16 16" aria-hidden="true">
        <rect x={4} y={4} width={8} height={8} rx={3} fill={n?.couleur ?? "#77797C"} />
      </svg>
      <span className="dat-td-texte">{n?.libelle ?? "Non renseignée"}</span>
    </span>
  );
}

function Avatar() {
  return (
    <span className="dat-avatar" aria-hidden="true">
      <User width={10} height={10} strokeWidth={3} fill="currentColor" />
    </span>
  );
}

/* un menu sous son bouton (Échap ou un clic dehors le ferme) */
function useMenu() {
  const [ouvert, setOuvert] = useState(false);
  const boite = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ouvert) return;
    const dehors = (e: MouseEvent) => {
      if (!boite.current?.contains(e.target as Node)) setOuvert(false);
    };
    const echap = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOuvert(false);
    };
    document.addEventListener("mousedown", dehors);
    document.addEventListener("keydown", echap);
    return () => {
      document.removeEventListener("mousedown", dehors);
      document.removeEventListener("keydown", echap);
    };
  }, [ouvert]);
  return [ouvert, setOuvert, boite] as const;
}

type Passages = { prochain: { p: Passage; c: Chantier } | null; dernier: { p: Passage; c: Chantier } | null; tous: { p: Passage; c: Chantier }[] };

export default function Annuaire() {
  const { source, pret, erreur: erreurBase, liste, tableau, premier, demander, demanderTous } = useDaliro();
  const params = useSearchParams();
  const routeur = useRouter();
  const chemin = usePathname();
  const auj = useMemo(() => aujourdhui(), []);

  const entrepriseId = params.get("entreprise");

  /* en base réelle, l'annuaire se lit dans un tableau de chantier ; les passages, dans tous */
  useEffect(() => {
    if (source === "reelle" && pret && !premier && liste[0]) demander(liste[0].id);
  }, [source, pret, premier, liste, demander]);
  useEffect(() => {
    if (source === "reelle" && pret) demanderTous();
  }, [source, pret, demanderTous]);

  const adresse = (changes: Record<string, string | null>) => {
    const p = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(changes)) {
      if (v) p.set(k, v);
      else p.delete(k);
    }
    const s = p.toString();
    return s ? `${chemin}?${s}` : chemin;
  };

  /* l'annuaire vaut pour toute l'entreprise : celui du premier tableau lu, complété des tiers des autres
     (l'exemple en compte dans chaque chantier) */
  const tiers = (() => {
    const m = new Map<string, Tiers>();
    for (const t of premier?.tiers ?? []) m.set(t.id, t);
    for (const c of liste) for (const t of tableau(c.id)?.tiers ?? []) if (!m.has(t.id)) m.set(t.id, t);
    return [...m.values()];
  })();
  /* les passages de chaque entreprise, tous chantiers lus */
  const passages = (() => {
    const m = new Map<string, Passages>();
    for (const c of liste) {
      const tb = tableau(c.id);
      if (!tb) continue;
      for (const p of tb.passages) {
        if (!p.tiers_id || p.statut === "annule") continue;
        const e = m.get(p.tiers_id) ?? { prochain: null, dernier: null, tous: [] };
        e.tous.push({ p, c });
        if (p.statut === "prevu" && jj(p.fin) >= auj && (!e.prochain || p.debut < e.prochain.p.debut)) e.prochain = { p, c };
        if (jj(p.debut) <= auj && (!e.dernier || p.debut > e.dernier.p.debut)) e.dernier = { p, c };
        m.set(p.tiers_id, e);
      }
    }
    return m;
  })();

  const groupes = (() => {
    const l = GROUPES.filter((g) => tiers.some((t) => dans(t, g)));
    return tiers.some((t) => dans(t, AUTRES)) ? [...l, AUTRES] : l;
  })();
  const groupe = groupes.find((g) => g.cle === params.get("role")) ?? null;
  const q = params.get("q") ?? "";
  const veille = params.get("veille") === "1";
  const triParam = params.get("tri");
  const tri: Tri = triParam === "prochain" || triParam === "vigilance" ? triParam : "nom";

  const visibles = (() => {
    const m = sansAccent(q.trim());
    const l = tiers.filter((t) => (!groupe || dans(t, groupe)) && (!veille || (t.vigilance && A_SURVEILLER.includes(t.vigilance))) && (!m || sansAccent(t.nom).includes(m) || sansAccent(t.commune ?? "").includes(m)));
    const parNom = (a: Tiers, b: Tiers) => a.nom.localeCompare(b.nom, "fr");
    if (tri === "prochain") return l.sort((a, b) => (passages.get(a.id)?.prochain?.p.debut ?? "9999").localeCompare(passages.get(b.id)?.prochain?.p.debut ?? "9999") || parNom(a, b));
    if (tri === "vigilance") return l.sort((a, b) => (a.vigilance ? NIVEAUX[a.vigilance].rang : 9) - (b.vigilance ? NIVEAUX[b.vigilance].rang : 9) || parNom(a, b));
    return l.sort(parNom);
  })();

  const enLecture = source === "reelle" && (!pret || (!premier && liste.length > 0));
  const sansChantier = source === "reelle" && pret && liste.length === 0;

  const [vueOuvert, setVueOuvert, vueBoite] = useMenu();
  const [triOuvert, setTriOuvert, triBoite] = useMenu();
  const [filtreOuvert, setFiltreOuvert, filtreBoite] = useMenu();
  const [saisie, setSaisie] = useState(q);
  const chercher = (v: string) => {
    setSaisie(v);
    routeur.replace(adresse({ q: v.trim() || null }), { scroll: false });
  };

  const fiche = entrepriseId ? (tiers.find((x) => x.id === entrepriseId) ?? null) : null;

  return (
    <div className="dat">
      <header className="dat-entete">
        <span className="dat-objet" aria-hidden="true">
          <Users width={12} height={12} strokeWidth={2.5} />
        </span>
        <nav className="dat-fil" aria-label="Fil d'Ariane">
          {entrepriseId ? (
            <>
              <Link href={adresse({ entreprise: null, onglet: null })}>Annuaire</Link>
              <span className="dat-fil-sep">/</span>
              <span className="dat-fil-nom">{fiche?.nom ?? "Entreprise"}</span>
            </>
          ) : (
            <span>Annuaire</span>
          )}
        </nav>
      </header>
      <h1 className="v2-sr">{fiche ? fiche.nom : "Annuaire"}</h1>

      {entrepriseId ? (
        fiche ? (
          <Fiche t={fiche} liste={liste} tableau={tableau} passages={passages.get(fiche.id) ?? null} auj={auj} onglet={params.get("onglet")} adresse={adresse} />
        ) : (
          <p className="dat-vide">{erreurBase ? `La base réelle n'a pas répondu. ${erreurBase}` : enLecture ? "Lecture de l'annuaire…" : "Cette entreprise n'est pas dans l'annuaire."}</p>
        )
      ) : (
        <>
          <div className="dat-barre">
            <div className="dat-menu-boite" ref={vueBoite}>
              <button type="button" className="dat-bouton" aria-haspopup="menu" aria-expanded={vueOuvert} onClick={() => setVueOuvert((o) => !o)}>
                <span className="dat-vue-icone" aria-hidden="true">
                  <LayoutGrid width={10} height={10} strokeWidth={3} />
                </span>
                {groupe ? groupe.libelle : "Toutes les entreprises"}
                <ChevronDown className="dat-chevron" width={16} height={16} aria-hidden="true" />
              </button>
              {vueOuvert ? (
                <div className="dat-menu" role="menu" aria-label="Vues">
                  <div className="dat-menu-titre">Vues</div>
                  {[null, ...groupes].map((g) => (
                    <Link key={g?.cle ?? "tous"} href={adresse({ role: g?.cle ?? null })} role="menuitemradio" aria-checked={(groupe?.cle ?? null) === (g?.cle ?? null)} className="dat-menu-option" scroll={false} onClick={() => setVueOuvert(false)}>
                      {g ? g.libelle : "Toutes les entreprises"}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          <div className="dat-barre">
            <div className="dat-menu-boite" ref={triBoite}>
              <button type="button" className="dat-bouton" data-tri="" aria-haspopup="menu" aria-expanded={triOuvert} onClick={() => setTriOuvert((o) => !o)}>
                <ArrowDownUp width={16} height={16} aria-hidden="true" style={{ opacity: 0.63 }} />
                <span className="dat-bouton-faible">Trié par</span> {TRIS[tri]}
              </button>
              {triOuvert ? (
                <div className="dat-menu" role="menu" aria-label="Trier par">
                  {(Object.keys(TRIS) as Tri[]).map((k) => (
                    <Link key={k} href={adresse({ tri: k === "nom" ? null : k })} role="menuitemradio" aria-checked={tri === k} className="dat-menu-option" scroll={false} onClick={() => setTriOuvert(false)}>
                      {TRIS[k]}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
            <span className="dat-sep-v" aria-hidden="true" />
            <div className="dat-menu-boite" ref={filtreBoite}>
              <button type="button" className="dat-bouton" data-filtre="" data-actif={veille || q ? "" : undefined} aria-haspopup="dialog" aria-expanded={filtreOuvert} onClick={() => setFiltreOuvert((o) => !o)}>
                <ListFilter width={16} height={16} aria-hidden="true" />
                {veille || q ? `Filtré${veille && q ? " (2)" : ""}` : "Filtrer"}
              </button>
              {filtreOuvert ? (
                <div className="dat-menu" role="dialog" aria-label="Filtrer">
                  <input className="dat-menu-champ" type="search" placeholder="Nom ou commune" aria-label="Rechercher une entreprise par nom ou commune" value={saisie} onChange={(e) => chercher(e.target.value)} autoFocus />
                  <Link href={adresse({ veille: veille ? null : "1" })} role="menuitemcheckbox" aria-checked={veille} className="dat-menu-option" scroll={false}>
                    <ShieldCheck width={16} height={16} aria-hidden="true" />À surveiller (vigilance)
                  </Link>
                </div>
              ) : null}
            </div>
          </div>

          {erreurBase ? (
            <p className="dat-vide" role="alert">
              La base réelle n&apos;a pas répondu. {erreurBase}
            </p>
          ) : enLecture ? (
            <p className="dat-vide">Lecture de l&apos;annuaire…</p>
          ) : sansChantier ? (
            <p className="dat-vide">L&apos;annuaire se lit avec vos chantiers : créez d&apos;abord un chantier.</p>
          ) : !tiers.length ? (
            <p className="dat-vide">L&apos;annuaire se remplit avec vos chantiers : maîtres d&apos;ouvrage, sous-traitants et fournisseurs.</p>
          ) : (
            <div className="dat-grille-boite">
              <div className="dat-grille" role="grid" aria-label="Entreprises" aria-rowcount={visibles.length + 1} style={{ gridTemplateRows: `40px repeat(${visibles.length || 1}, 36px) 1fr 37px` }}>
                <div className="dat-rangee" role="row">
                  <div className="dat-th" role="columnheader">
                    <span className="dat-th-texte">Entreprise</span>
                  </div>
                  <div className="dat-th" role="columnheader">
                    <ShieldCheck aria-hidden="true" />
                    <span className="dat-th-texte">Vigilance</span>
                  </div>
                  <div className="dat-th" role="columnheader">
                    <CalendarCheck aria-hidden="true" />
                    <span className="dat-th-texte">Dernier passage</span>
                  </div>
                  <div className="dat-th" role="columnheader">
                    <CalendarClock aria-hidden="true" />
                    <span className="dat-th-texte">Prochain passage</span>
                  </div>
                  <div className="dat-th" role="columnheader">
                    <Briefcase aria-hidden="true" />
                    <span className="dat-th-texte">Rôles</span>
                  </div>
                </div>
                {visibles.map((t) => {
                  const ps = passages.get(t.id);
                  return (
                    <div key={t.id} className="dat-rangee" role="row">
                      <div className="dat-td" role="gridcell">
                        <Link href={adresse({ entreprise: t.id })} className="dat-personne">
                          <Avatar />
                          <span>{t.nom}</span>
                        </Link>
                      </div>
                      <div className="dat-td" role="gridcell" data-calcule="">
                        <Force v={t.vigilance} />
                      </div>
                      <div className="dat-td" role="gridcell" data-calcule="" data-vide={ps?.dernier ? undefined : ""}>
                        <span className="dat-td-texte" title={ps?.dernier ? `${ps.dernier.p.tache ?? "Passage"}, ${ps.dernier.c.nom}` : undefined}>
                          {ps?.dernier ? majuscule(relatif(jj(ps.dernier.p.debut), auj)) : "Aucun passage"}
                        </span>
                      </div>
                      <div className="dat-td" role="gridcell" data-calcule="" data-vide={ps?.prochain ? undefined : ""}>
                        <span className="dat-td-texte" title={ps?.prochain ? `${ps.prochain.p.tache ?? "Passage"}, ${ps.prochain.c.nom}` : undefined}>
                          {ps?.prochain ? majuscule(relatif(jj(ps.prochain.p.debut) < auj ? auj : jj(ps.prochain.p.debut), auj)) : "Aucun passage"}
                        </span>
                      </div>
                      <div className="dat-td" role="gridcell" data-vide={t.roles.length ? undefined : ""}>
                        <span className="dat-td-texte">{libelleRoles(t) || "Aucun rôle"}</span>
                      </div>
                    </div>
                  );
                })}
                {!visibles.length ? (
                  <div className="dat-rangee" role="row">
                    <div className="dat-td" role="gridcell" data-vide="" style={{ gridColumn: "1 / -1" }}>
                      Aucune entreprise ne correspond.
                    </div>
                  </div>
                ) : null}
                <div className="dat-rangee dat-reste" aria-hidden="true">
                  <div />
                  <div />
                  <div />
                  <div />
                  <div />
                </div>
                <div className="dat-pied" role="row">
                  <div role="gridcell">{pluriel(visibles.length, "entreprise")}</div>
                  <div role="gridcell" />
                  <div role="gridcell" />
                  <div role="gridcell" />
                  <div role="gridcell" />
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ══════ la fiche d'une entreprise : la fiche d'un contact d'Attio ══════ */

type LigneChantier = { c: Chantier; mentions: string[] };
type Onglet = "ensemble" | "passages" | "chantiers" | "lots";

function Fiche({
  t,
  liste,
  tableau,
  passages,
  auj,
  onglet: ongletParam,
  adresse,
}: {
  t: Tiers;
  liste: Chantier[];
  tableau: ReturnType<typeof useDaliro>["tableau"];
  passages: Passages | null;
  auj: string;
  onglet: string | null;
  adresse: (c: Record<string, string | null>) => string;
}) {
  const [tout, setTout] = useState(false);
  const onglet: Onglet = ongletParam === "passages" || ongletParam === "chantiers" || ongletParam === "lots" ? ongletParam : "ensemble";

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
        for (const lot of tb.lots.filter((x) => x.tiers_id === t.id)) m.push(`lot ${lot.code} — ${lot.libelle}`);
        const n = tb.passages.filter((p) => p.tiers_id === t.id && p.statut !== "annule").length;
        if (n) m.push(`${pluriel(n, "passage")} au planning`);
      }
      if (m.length) l.push({ c, mentions: m });
    }
    return l;
  }, [liste, tableau, t.id]);
  const lots = useMemo(() => liste.flatMap((c) => (tableau(c.id)?.lots ?? []).filter((x) => x.tiers_id === t.id).map((lot) => ({ lot, c }))), [liste, tableau, t.id]);
  /* les passages : les prochains d'abord (du plus proche au plus lointain), puis les passés (du plus récent) */
  const tous = useMemo(() => {
    const l = [...(passages?.tous ?? [])];
    const avenir = l.filter(({ p }) => jj(p.fin) >= auj).sort((a, b) => a.p.debut.localeCompare(b.p.debut));
    const passes = l.filter(({ p }) => jj(p.fin) < auj).sort((a, b) => b.p.debut.localeCompare(a.p.debut));
    return [...avenir, ...passes];
  }, [passages, auj]);

  const vigilance = t.vigilance ?? null;
  const prochain = passages?.prochain ?? null;
  const lien = (o: Onglet) => adresse({ onglet: o === "ensemble" ? null : o });
  const detail = (icone: React.ReactNode, libelle: string, valeur: React.ReactNode, vide?: boolean) => (
    <div className="dat-detail" key={libelle}>
      <dt>
        {icone}
        {libelle}
      </dt>
      <dd data-vide={vide ? "" : undefined}>{valeur}</dd>
    </div>
  );
  const ico = (I: typeof Mail) => <I width={16} height={16} aria-hidden="true" />;
  const intervenant = t.roles.includes("sous_traitant") || t.roles.includes("autre_titulaire") || tous.length > 0;

  const lignePassage = ({ p, c }: { p: Passage; c: Chantier }) => {
    const conf = CONFIRMATIONS[p.confirmation];
    return (
      <li key={p.id}>
        <Link href={`${BASE}/chantiers?passage=${encodeURIComponent(p.id)}`} className="dat-ligne">
          <span className="dat-avatar" aria-hidden="true">
            {c.nom.charAt(0).toUpperCase()}
          </span>
          <span className="dat-ligne-titre">{c.nom}</span>
          <span className="dat-ligne-faible">{p.statut === "fait" ? "a noté fait" : "attend"}</span>
          <span className="dat-ligne-gris">{[p.tache, p.lot_code ? `lot ${p.lot_code}` : null, conf?.libelle].filter(Boolean).join(" · ")}</span>
          <span className="dat-ligne-fin">{majuscule(relatif(jj(p.debut) < auj && jj(p.fin) >= auj ? auj : jj(p.debut), auj))}</span>
        </Link>
      </li>
    );
  };
  const ligneChantier = ({ c, mentions }: LigneChantier) => (
    <li key={c.id}>
      <Link href={`${BASE}/chantiers/${encodeURIComponent(c.id)}`} className="dat-ligne">
        <span className="dat-avatar" aria-hidden="true">
          {c.nom.charAt(0).toUpperCase()}
        </span>
        <span className="dat-ligne-titre">{c.nom}</span>
        <span className="dat-ligne-gris">{mentions.join(" · ")}</span>
        <span className="dat-ligne-fin">{STATUTS_CHANTIER[c.statut]?.libelle ?? c.statut}</span>
      </Link>
    </li>
  );
  const ligneLot = ({ lot, c }: { lot: Lot; c: Chantier }) => (
    <li key={lot.id}>
      <Link href={`${BASE}/chantiers/${encodeURIComponent(c.id)}`} className="dat-ligne">
        <span className="dat-rond" data-fait={lot.statut === "termine" ? "" : undefined} aria-hidden="true">
          {lot.statut === "termine" ? <CircleCheck width={12} height={12} /> : null}
        </span>
        <span className="dat-ligne-titre">
          Lot {lot.code} — {lot.libelle}
        </span>
        <span className="dat-ligne-fin">
          <span>{c.nom}</span>
          <span className={lot.statut === "en_cours" ? "dat-echeance" : undefined}>
            {lot.statut === "en_cours" ? <CalendarRange width={12} height={12} aria-hidden="true" /> : null}
            {majuscule(STATUTS_LOT[lot.statut])}
          </span>
        </span>
      </Link>
    </li>
  );

  return (
    <div className="dat-fiche">
      <aside className="dat-gauche" aria-label="Détails de l'entreprise">
        <div className="dat-ident">
          <span className="dat-avatar" aria-hidden="true">
            <User width={18} height={18} strokeWidth={2.5} fill="currentColor" />
          </span>
          <p className="dat-ident-nom">{t.nom}</p>
        </div>
        <div className="dat-actions">
          <a className="dat-bouton" href={t.email ? `mailto:${t.email}` : undefined} aria-disabled={t.email ? undefined : "true"}>
            {ico(Mail)}Écrire un courriel
          </a>
          <a className="dat-bouton" href={t.telephone ? `tel:${t.telephone.replace(/\s/g, "")}` : undefined} aria-disabled={t.telephone ? undefined : "true"} aria-label="Appeler">
            {ico(Phone)}
            <span className="dat-bouton-texte">Appeler</span>
          </a>
          {intervenant ? (
            <Link className="dat-bouton" href={`${BASE}/equipes?intervenant=${encodeURIComponent(`t:${t.id}`)}`} aria-label="Disponibilités">
              {ico(CalendarRange)}
              <span className="dat-bouton-texte">Disponibilités</span>
            </Link>
          ) : null}
        </div>
        <section className="dat-bloc" aria-label="Détails">
          <div className="dat-bloc-tete">
            <span>Détails de la fiche</span>
          </div>
          <dl className="dat-details">
            {detail(ico(IdCard), "Nom", t.nom)}
            {detail(ico(AtSign), "Courriel", t.email ? <a className="dat-lien" href={`mailto:${t.email}`}>{t.email}</a> : "Aucun courriel", !t.email)}
            {detail(ico(Phone), "Téléphone", t.telephone ? <a className="dat-lien" href={`tel:${t.telephone.replace(/\s/g, "")}`}>{telephone(t.telephone)}</a> : "Aucun téléphone", !t.telephone)}
            {detail(ico(Briefcase), "Rôles", libelleRoles(t) || "Aucun rôle", !t.roles.length)}
            {detail(ico(MapPin), "Commune", t.commune ?? "Aucune commune", !t.commune)}
            {detail(ico(Hash), "SIREN", t.siren ?? "Aucun SIREN", !t.siren)}
            {tout ? (
              <>
                {detail(ico(HardHat), "Corps d'état", t.corps_etat.length ? t.corps_etat.map(majuscule).join(", ") : "Aucun", !t.corps_etat.length)}
                {detail(ico(MapPin), "Départements", t.departements.length ? t.departements.join(", ") : "Aucun", !t.departements.length)}
                {detail(ico(CalendarCheck), "Confirmation J-2", t.confirmer_passages ? `Demandée${t.canal ? ` par ${CANAUX[t.canal] ?? t.canal}` : ""}` : "Non demandée")}
                {detail(ico(ShieldCheck), "Attestation", t.vigilance_attestation_le ? `Du ${new Date(`${jj(t.vigilance_attestation_le)}T00:00:00Z`).toLocaleDateString("fr-FR", { timeZone: "UTC" })}` : "Aucune", !t.vigilance_attestation_le)}
              </>
            ) : null}
          </dl>
          <button type="button" className="dat-voir" onClick={() => setTout((v) => !v)} aria-expanded={tout}>
            {tout ? "Voir moins de valeurs" : "Voir toutes les valeurs"}
          </button>
        </section>
        <section className="dat-bloc" aria-label="Chantiers">
          <div className="dat-bloc-tete">
            <span>Chantiers</span>
            <Link href={lien("chantiers")} scroll={false}>
              Tout voir
            </Link>
          </div>
          {chantiers.length ? (
            <div className="dat-pastilles">
              {chantiers.map(({ c }) => (
                <Link key={c.id} href={`${BASE}/chantiers/${encodeURIComponent(c.id)}`}>
                  {c.nom}
                </Link>
              ))}
            </div>
          ) : (
            <p className="dat-vide-texte">Cette entreprise n&apos;intervient sur aucun chantier</p>
          )}
        </section>
      </aside>

      <div className="dat-droite">
        <nav className="dat-onglets" aria-label="Onglets de la fiche">
          <Link href={lien("ensemble")} scroll={false} className="dat-onglet" aria-current={onglet === "ensemble" ? "page" : undefined}>
            {ico(LayoutGrid)}Vue d&apos;ensemble
          </Link>
          <span className="dat-onglet-sep" aria-hidden="true" />
          <Link href={lien("passages")} scroll={false} className="dat-onglet" aria-current={onglet === "passages" ? "page" : undefined}>
            {ico(CalendarClock)}Passages <span className="dat-compteur">{tous.length}</span>
          </Link>
          <Link href={lien("chantiers")} scroll={false} className="dat-onglet" aria-current={onglet === "chantiers" ? "page" : undefined}>
            {ico(HardHat)}Chantiers <span className="dat-compteur">{chantiers.length}</span>
          </Link>
          <Link href={lien("lots")} scroll={false} className="dat-onglet" aria-current={onglet === "lots" ? "page" : undefined}>
            {ico(CircleCheck)}Lots <span className="dat-compteur">{lots.length}</span>
          </Link>
        </nav>

        <div className="dat-corps">
          {onglet === "ensemble" ? (
            <>
              <h2 className="dat-titre">En bref</h2>
              <div className="dat-cartes">
                <div className="dat-carte">
                  <div className="dat-carte-tete">
                    Vigilance
                    <ShieldCheck aria-hidden="true" />
                  </div>
                  <div className="dat-carte-valeur" data-vide={vigilance ? undefined : ""}>
                    {vigilance ? <Force v={vigilance} /> : "Non renseignée"}
                  </div>
                </div>
                <div className="dat-carte">
                  <div className="dat-carte-tete">
                    Prochain passage
                    <CalendarClock aria-hidden="true" />
                  </div>
                  <div className="dat-carte-valeur" data-vide={prochain ? undefined : ""}>
                    {prochain ? `${majuscule(relatif(jj(prochain.p.debut) < auj ? auj : jj(prochain.p.debut), auj))} · ${prochain.c.nom}` : "Aucun passage"}
                  </div>
                </div>
                <div className="dat-carte">
                  <div className="dat-carte-tete">
                    Rôles
                    <Briefcase aria-hidden="true" />
                  </div>
                  <div className="dat-carte-valeur" data-vide={t.roles.length ? undefined : ""}>
                    {libelleRoles(t) || "Aucun rôle"}
                    {t.corps_etat.length ? <span className="dat-carte-sous">{t.corps_etat.map(majuscule).join(", ")}</span> : null}
                  </div>
                </div>
                <div className="dat-carte">
                  <div className="dat-carte-tete">
                    Courriel
                    <AtSign aria-hidden="true" />
                  </div>
                  <div className="dat-carte-valeur" data-vide={t.email ? undefined : ""}>
                    {t.email ? (
                      <a className="dat-lien" href={`mailto:${t.email}`}>
                        {t.email}
                      </a>
                    ) : (
                      "Aucun courriel"
                    )}
                  </div>
                </div>
                <div className="dat-carte">
                  <div className="dat-carte-tete">
                    Téléphone
                    <Phone aria-hidden="true" />
                  </div>
                  <div className="dat-carte-valeur" data-vide={t.telephone ? undefined : ""}>
                    {t.telephone ? (
                      <a className="dat-lien" href={`tel:${t.telephone.replace(/\s/g, "")}`}>
                        {telephone(t.telephone)}
                      </a>
                    ) : (
                      "Aucun téléphone"
                    )}
                  </div>
                </div>
                <div className="dat-carte">
                  <div className="dat-carte-tete">
                    Commune
                    <MapPin aria-hidden="true" />
                  </div>
                  <div className="dat-carte-valeur" data-vide={t.commune ? undefined : ""}>
                    {t.commune ?? "Aucune commune"}
                  </div>
                </div>
              </div>

              <h2 className="dat-titre">
                Passages
                <span className="dat-titre-droite">
                  <Link href={lien("passages")} scroll={false}>
                    Tout voir
                  </Link>
                </span>
              </h2>
              {tous.length ? <ul className="dat-boite">{tous.slice(0, 3).map(lignePassage)}</ul> : <p className="dat-note">Aucun passage au planning.</p>}

              <h2 className="dat-titre">
                Chantiers <span className="dat-compteur">{chantiers.length}</span>
                <span className="dat-titre-droite">
                  <Link href={lien("chantiers")} scroll={false}>
                    Tout voir
                  </Link>
                </span>
              </h2>
              {chantiers.length ? (
                <ul className="dat-boite" data-haute="">
                  {chantiers.slice(0, 3).map(ligneChantier)}
                </ul>
              ) : (
                <p className="dat-note">Elle n&apos;intervient sur aucun chantier.</p>
              )}

              <h2 className="dat-titre">
                Lots <span className="dat-compteur">{lots.length}</span>
                <span className="dat-titre-droite">
                  <Link href={lien("lots")} scroll={false}>
                    Tout voir
                  </Link>
                </span>
              </h2>
              {lots.length ? (
                <ul className="dat-boite" data-haute="">
                  {lots.slice(0, 3).map(ligneLot)}
                </ul>
              ) : (
                <p className="dat-note">Aucun lot à son nom.</p>
              )}
            </>
          ) : onglet === "passages" ? (
            <>
              <h2 className="dat-titre">
                Passages <span className="dat-compteur">{tous.length}</span>
              </h2>
              {tous.length ? <ul className="dat-boite">{tous.map(lignePassage)}</ul> : <p className="dat-note">Aucun passage au planning.</p>}
            </>
          ) : onglet === "chantiers" ? (
            <>
              <h2 className="dat-titre">
                Chantiers <span className="dat-compteur">{chantiers.length}</span>
              </h2>
              {chantiers.length ? (
                <ul className="dat-boite" data-haute="">
                  {chantiers.map(ligneChantier)}
                </ul>
              ) : (
                <p className="dat-note">Elle n&apos;intervient sur aucun chantier.</p>
              )}
            </>
          ) : (
            <>
              <h2 className="dat-titre">
                Lots <span className="dat-compteur">{lots.length}</span>
              </h2>
              {lots.length ? (
                <ul className="dat-boite" data-haute="">
                  {lots.map(ligneLot)}
                </ul>
              ) : (
                <p className="dat-note">Aucun lot à son nom.</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
