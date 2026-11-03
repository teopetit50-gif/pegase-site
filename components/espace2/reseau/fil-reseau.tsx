"use client";

/* ══════════════════════════════════════════════════════════════════════
   /espace2/reseau — le Fil du Réseau Omega (reprise du 02/11/2026, soir)

   LE CONTENU vient des pages publiques de Circle, relevées dans Chromium
   sans compte :
     · le fil, https://community.circle.so/feed ;
     · un espace, https://community.circle.so/c/product-updates ;
     · une publication et ses commentaires,
       https://community.circle.so/c/product-updates/october-2026-release.
   Ce qu'on en garde, dans l'ordre de Circle : une publication porte son
   titre, son auteur (nom, étiquettes de membre, date, et la ligne qui dit
   qui il est), le texte coupé avec « Voir plus », le résumé des réactions
   et le nombre de commentaires, puis les actions (Like → « Je peux
   aider ») ; une publication épinglée porte l'épingle. Ouverte (?pub=),
   elle montre « Retour au fil », le texte entier, le champ « Post a
   comment » AVANT les réponses, puis chaque réponse : auteur, étiquettes,
   date, ligne de présentation, texte, menu « … ».

   L'HABILLAGE est celui des pages des moteurs (FILED, CASHD, REPUT,
   OFFLOAD, DALIRO) et de leur kit components/espace2/lin/ : barre du titre
   de 44 (titre, « … », ronds), pastilles de 28 pour les vues, et le fil
   d'activité de Linear déjà posé sur Activité (linear-pulse.css : colonne,
   composeur, cartes de mise à jour et de commentaire, bloc des propriétés,
   panneau de droite de 400 avec « Propriétés »). Jetons --lin-*, sombre et
   clair. Rien de Circle dans l'habillage.

   « Vous » est l'organisation connectée (useOrganisation), jamais un
   membre. En base réelle : l'état vide commun (ReseauVide). Les filtres
   et la publication ouverte vivent dans l'adresse (?type=, ?ile=,
   ?secteur=, ?pub=) ; publier, répondre, « Je peux aider » et épingler
   restent en état local.
   ══════════════════════════════════════════════════════════════════════ */

import { useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, BadgeCheck, Check, CloudRain, HandHelping, Link2, ListFilter, MapPin, MessageSquare, Network, PanelRight, Pin, PinOff, Search, Ship, Timer, UserRound, Zap } from "lucide-react";
import { useSource } from "@/components/espace/source";
import { useOrganisation } from "../organisation";
import { useToast } from "../Toasts";
import { RACINE } from "../modules";
import { CarteDroite, Menu, MenuActions, MenuOptions, type Option } from "../lin/Lin";
import { IconeCalendrier, IconeGroupe } from "../lin/icones";
import { MEMBRES, type Ile, type Membre } from "./membres";
import { reseauEnExemple } from "./source";
import { ReseauVide } from "./reseau-vide";
import { PUBLICATIONS, VOUS, ilYa, initiales, membreDe, type Publication, type Reponse, type TypePublication } from "./fil-donnees";
import "../lin/lin.css";
import "../lin/linear-pulse.css";
import "./fil.css";

const ILES: Ile[] = ["Guadeloupe", "Martinique"];
const ficheDe = (slug: string) => `${RACINE}/reseau/membres/${slug}`;
const ecrireA = (slug: string) => `${RACINE}/reseau/messages?a=${slug}`;
const I = { width: 14, height: 14, strokeWidth: 1.8, "aria-hidden": true } as const;
const ICONE_ALERTE = { port: Ship, coupure: Zap, meteo: CloudRain };
const TYPES: { cle: TypePublication | null; param: string | null; libelle: string }[] = [
  { cle: null, param: null, libelle: "Tout" },
  { cle: "demande", param: "demandes", libelle: "Demandes" },
  { cle: "alerte", param: "alertes", libelle: "Alertes terrain" },
];

type Brouillon = Omit<Publication, "id" | "auteur" | "ilYa" | "aident" | "reponses">;

export default function FilReseau() {
  const { source } = useSource();
  if (!reseauEnExemple(source))
    return (
      <div className="lin rf">
        <header className="lin-tete">
          <h1 className="lin-tete-titre rf-h1">Fil</h1>
        </header>
        <div className="rf-ferme">
          <ReseauVide icone={Network} page="Le Fil y montrera les demandes et les alertes terrain des membres." />
        </div>
      </div>
    );
  return <Fil />;
}

const secteurDe = (p: Publication) => (p.auteur === VOUS ? null : (membreDe(p.auteur)?.secteur ?? null));

function Fil() {
  const { nom: org } = useOrganisation();
  const toast = useToast();
  const params = useSearchParams();
  const router = useRouter();
  const chemin = usePathname();

  /* ——— l'adresse : ?type=demandes|alertes, ?ile=guadeloupe|martinique, ?secteur=…, ?pub=<id> ——— */
  const brutType = params.get("type");
  const type = TYPES.find((t) => t.param && t.param === brutType)?.cle ?? null;
  const ile = ILES.find((i) => i.toLowerCase() === params.get("ile")) ?? null;
  const secteur = params.get("secteur");
  const pubId = params.get("pub");
  const lien = (changes: Record<string, string | null>) => {
    const p = new URLSearchParams(params.toString());
    for (const [cle, valeur] of Object.entries(changes)) {
      if (valeur) p.set(cle, valeur);
      else p.delete(cle);
    }
    const q = p.toString();
    return q ? `${chemin}?${q}` : chemin;
  };
  const poser = (changes: Record<string, string | null>) => router.replace(lien(changes), { scroll: false });

  /* ——— l'état local : ce que « vous » publiez, répondez, proposez, épinglez ——— */
  const [miennes, setMiennes] = useState<Publication[]>([]);
  const [reponses, setReponses] = useState<Record<string, Reponse[]>>({});
  const [aidees, setAidees] = useState<Set<string>>(() => new Set());
  const [epingles, setEpingles] = useState<Record<string, boolean>>({});
  const [panneau, setPanneau] = useState(true);
  const compteur = useRef(1);

  const toutes = useMemo(
    () => [...miennes, ...PUBLICATIONS].map((p) => ({ ...p, reponses: [...p.reponses, ...(reponses[p.id] ?? [])], epinglee: p.type === "alerte" && (epingles[p.id] ?? !!p.epinglee) })),
    [miennes, reponses, epingles],
  );
  const secteurs = useMemo(() => [...new Set(PUBLICATIONS.map(secteurDe).filter((s): s is string => !!s))].sort((a, b) => a.localeCompare(b, "fr")), []);
  /* l'île et le secteur d'abord (les chiffres des pastilles en dépendent), puis le type */
  const parLieu = toutes.filter((p) => (!ile || p.ile === ile) && (!secteur || secteurDe(p) === secteur));
  const visibles = parLieu.filter((p) => !type || p.type === type).sort((a, b) => Number(b.epinglee) - Number(a.epinglee) || a.ilYa - b.ilYa);
  const nbType = (t: TypePublication | null) => parLieu.filter((p) => !t || p.type === t).length;
  const filtresPoses = Number(!!ile) + Number(!!secteur);
  const ouverte = pubId ? (toutes.find((p) => p.id === pubId) ?? null) : null;

  /* ——— les gestes ——— */
  const publier = (b: Brouillon) => {
    setMiennes((m) => [{ ...b, id: `vous-${compteur.current++}`, auteur: VOUS, ilYa: 0, aident: [], reponses: [] }, ...m]);
    toast(b.type === "alerte" ? "Alerte publiée dans le fil" : "Demande publiée dans le fil", "vert");
  };
  const repondre = (id: string, texte: string) => {
    setReponses((r) => ({ ...r, [id]: [...(r[id] ?? []), { id: `vous-r-${compteur.current++}`, auteur: VOUS, ilYa: 0, texte }] }));
    toast("Réponse publiée", "vert");
  };
  const aider = (p: Publication) => {
    const oui = !aidees.has(p.id);
    setAidees((s) => {
      const n = new Set(s);
      if (oui) n.add(p.id);
      else n.delete(p.id);
      return n;
    });
    if (oui) toast(`${membreDe(p.auteur)?.nom ?? "L'auteur"} voit que vous pouvez aider`, "vert");
  };
  const epingler = (p: Publication) => {
    setEpingles((e) => ({ ...e, [p.id]: !p.epinglee }));
    toast(p.epinglee ? "Alerte désépinglée" : "Alerte épinglée en tête du fil");
  };
  const copier = (href: string) =>
    navigator.clipboard?.writeText(`${window.location.origin}${href}`).then(
      () => toast("Lien copié", "vert"),
      () => toast("Impossible de copier le lien. Réessayez.", "rouge"),
    );

  const gestes = { org, aidees, aider, epingler, copier, lien };
  const optionsPage: Option[] = [
    { cle: "copier", libelle: "Copier le lien du fil", icone: <Link2 {...I} />, action: () => copier(lien({ pub: null })) },
    { cle: "membres", libelle: "Voir les membres", icone: <UserRound {...I} />, href: `${RACINE}/reseau/membres` },
    { cle: "messages", libelle: "Ouvrir les messages", icone: <MessageSquare {...I} />, href: `${RACINE}/reseau/messages` },
  ];

  return (
    <div className="lin lpu rf v2-arrivee">
      <header className="lin-tete">
        {ouverte ? (
          <nav className="lin-fil" aria-label="Fil d'Ariane">
            <Link href={lien({ pub: null })} className="lin-fil-lien" scroll={false}>
              Fil
            </Link>
            <span className="lin-fil-sep" aria-hidden="true">
              ›
            </span>
            <h1 className="lin-fil-ici rf-h1-fil">{ouverte.titre}</h1>
          </nav>
        ) : (
          <h1 className="lin-tete-titre rf-h1">Fil</h1>
        )}
        <MenuActions rond aGauche titre="Actions de la page" options={optionsPage} />
        <div className="lin-tete-droite">
          <span className="lin-position" aria-live="polite">
            {visibles.length === toutes.length ? `${toutes.length} publications` : `${visibles.length} sur ${toutes.length}`}
          </span>
          <Menu
            largeur={280}
            bouton={(ouvert, basculer) => (
              <button type="button" className="lin-rond" aria-label="Filtrer par île et par secteur" title="Filtrer" aria-expanded={ouvert} data-actif={filtresPoses ? "" : undefined} onClick={basculer}>
                <ListFilter {...I} />
              </button>
            )}
          >
            {(fermer) => (
              <div>
                <div role="group" aria-label="Île">
                  <p className="lpu-menu-titre">Île</p>
                  {[null, ...ILES].map((i) => (
                    <button
                      key={i ?? "toutes"}
                      type="button"
                      className="lin-menu-option"
                      aria-pressed={ile === i}
                      onClick={() => {
                        poser({ ile: i ? i.toLowerCase() : null, pub: null });
                        fermer();
                      }}
                    >
                      <MapPin {...I} />
                      <span>{i ?? "Toutes les îles"}</span>
                      <span className="lin-meta">{toutes.filter((p) => !i || p.ile === i).length}</span>
                      {ile === i ? <Check {...I} /> : null}
                    </button>
                  ))}
                </div>
                <div role="group" aria-label="Secteur">
                  <p className="lpu-menu-titre">Secteur de l&apos;auteur</p>
                  {[null, ...secteurs].map((s) => (
                    <button
                      key={s ?? "tous"}
                      type="button"
                      className="lin-menu-option"
                      aria-pressed={secteur === s}
                      onClick={() => {
                        poser({ secteur: s, pub: null });
                        fermer();
                      }}
                    >
                      <IconeGroupe />
                      <span>{s ?? "Tous les secteurs"}</span>
                      <span className="lin-meta">{toutes.filter((p) => !s || secteurDe(p) === s).length}</span>
                      {secteur === s ? <Check {...I} /> : null}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </Menu>
        </div>
      </header>

      <div className="lin-outils lpu-rangee">
        <nav className="lin-onglets" aria-label="Type de publication">
          {TYPES.map((t) => {
            const actif = !ouverte && type === t.cle;
            return (
              <Link key={t.libelle} href={lien({ type: t.param, pub: null })} replace scroll={false} className="lin-onglet" data-actif={actif ? "" : undefined} aria-current={actif ? "page" : undefined}>
                {t.libelle} <span className="rf-onglet-n">{nbType(t.cle)}</span>
              </Link>
            );
          })}
          {ile ? <FiltrePose libelle="Île" valeur={ile} retirer={() => poser({ ile: null })} /> : null}
          {secteur ? <FiltrePose libelle="Secteur" valeur={secteur} retirer={() => poser({ secteur: null })} /> : null}
        </nav>
        <div className="lin-outils-droite">
          <button type="button" className="lin-rond" aria-pressed={panneau} aria-label={panneau ? "Masquer le panneau" : "Afficher le panneau"} title={panneau ? "Masquer le panneau" : "Afficher le panneau"} onClick={() => setPanneau((v) => !v)}>
            <PanelRight {...I} />
          </button>
        </div>
      </div>

      <div className="lpu-corps">
        <div className="lpu-fil">
          <div className="lpu-colonne">
            {pubId ? (
              ouverte ? (
                <VuePublication p={ouverte} gestes={gestes} repondre={(t) => repondre(ouverte.id, t)} />
              ) : (
                <div className="lpu-bloc lpu-bloc--premier">
                  <div className="lpu-vide">
                    <Search width={18} height={18} strokeWidth={1.5} aria-hidden="true" />
                    <p>Publication introuvable</p>
                    <span>Elle a peut-être été retirée par son auteur.</span>
                    <Link href={lien({ pub: null })} className="lin-btn lin-btn--plein lin-btn--texte">
                      Retour au fil
                    </Link>
                  </div>
                </div>
              )
            ) : (
              <>
                <div className="lpu-bloc lpu-bloc--composeur">
                  <Composeur org={org} publier={publier} />
                </div>
                {visibles.length ? (
                  visibles.map((p, i) => (
                    <div key={p.id} className={i === 0 ? "lpu-bloc lpu-bloc--premier" : "lpu-bloc rf-bloc"}>
                      <CartePublication p={p} gestes={gestes} />
                    </div>
                  ))
                ) : (
                  <div className="lpu-bloc lpu-bloc--premier">
                    <div className="lpu-vide">
                      <Search width={18} height={18} strokeWidth={1.5} aria-hidden="true" />
                      <p>Aucune publication</p>
                      <span>Rien ne correspond à ce type, à cette île et à ce secteur.</span>
                      <button type="button" className="lin-btn lin-btn--plein lin-btn--texte" onClick={() => poser({ type: null, ile: null, secteur: null })}>
                        Effacer les filtres
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {panneau ? (
          <aside className="lpu-aside" aria-label="Panneau">
            <div className="lpu-aside-interieur">
              {ouverte ? (
                <PanneauPublication p={ouverte} org={org} aidee={aidees.has(ouverte.id)} />
              ) : (
                <>
                  <CarteDroite titre="Propriétés">
                    <dl className="lpu-proprietes">
                      <div>
                        <dt>Type</dt>
                        <dd>
                          <MenuOptions
                            plat
                            libelle="Changer le type"
                            titre="Type…"
                            options={TYPES.map((t) => ({ cle: t.libelle, libelle: t.libelle, meta: String(nbType(t.cle)), coche: type === t.cle, action: () => poser({ type: t.param }) }))}
                            declencheur={
                              <>
                                <HandHelping {...I} />
                                <span>{TYPES.find((t) => t.cle === type)?.libelle}</span>
                              </>
                            }
                          />
                        </dd>
                      </div>
                      <div>
                        <dt>Île</dt>
                        <dd>
                          <MenuOptions
                            plat
                            libelle="Changer d'île"
                            titre="Île…"
                            options={[null, ...ILES].map((i) => ({ cle: i ?? "toutes", libelle: i ?? "Toutes les îles", coche: ile === i, action: () => poser({ ile: i ? i.toLowerCase() : null }) }))}
                            declencheur={
                              <>
                                <MapPin {...I} />
                                <span>{ile ?? "Toutes les îles"}</span>
                              </>
                            }
                          />
                        </dd>
                      </div>
                      <div>
                        <dt>Secteur</dt>
                        <dd>
                          <MenuOptions
                            plat
                            largeur={300}
                            libelle="Changer de secteur"
                            titre="Secteur…"
                            options={[null, ...secteurs].map((s) => ({ cle: s ?? "tous", libelle: s ?? "Tous les secteurs", coche: secteur === s, action: () => poser({ secteur: s }) }))}
                            declencheur={
                              <>
                                <IconeGroupe />
                                <span>{secteur ?? "Tous les secteurs"}</span>
                              </>
                            }
                          />
                        </dd>
                      </div>
                      <div>
                        <dt>Publications</dt>
                        <dd>
                          <span className="lpu-valeur lpu-valeur--chiffre">
                            {visibles.length} sur {toutes.length}
                          </span>
                        </dd>
                      </div>
                    </dl>
                  </CarteDroite>

                  <CarteDroite titre="Îles">
                    <ul className="lpu-jalons">
                      {ILES.map((i) => {
                        const n = toutes.filter((p) => p.ile === i).length;
                        const actif = !ile || ile === i;
                        return (
                          <li key={i}>
                            <button type="button" className="lpu-jalon" aria-pressed={actif} onClick={() => poser({ ile: ile === i ? null : i.toLowerCase() })} title={ile === i ? "Voir toutes les îles" : `Ne voir que ${i}`}>
                              <MapPin {...I} />
                              <span className="lpu-jalon-nom">{i}</span>
                              <span className="lpu-jalon-compte">
                                {n} publication{n > 1 ? "s" : ""}
                              </span>
                              <span className="lpu-jalon-coche" aria-hidden="true">
                                <Check {...I} />
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </CarteDroite>

                  <CarteDroite titre="Le réseau">
                    <dl className="lpu-proprietes">
                      <div>
                        <dt>Membres</dt>
                        <dd>
                          <Link href={`${RACINE}/reseau/membres`} className="lpu-valeur">
                            <IconeGroupe />
                            <span>{MEMBRES.length} entreprises</span>
                          </Link>
                        </dd>
                      </div>
                      <div>
                        <dt>Demandes</dt>
                        <dd>
                          <span className="lpu-valeur">
                            <HandHelping {...I} />
                            <span>{toutes.filter((p) => p.type === "demande").length} ouvertes</span>
                          </span>
                        </dd>
                      </div>
                      <div>
                        <dt>Alertes</dt>
                        <dd>
                          <span className="lpu-valeur" data-teinte="jaune">
                            <Zap {...I} />
                            <span>{toutes.filter((p) => p.type === "alerte").length} en cours</span>
                          </span>
                        </dd>
                      </div>
                    </dl>
                  </CarteDroite>

                  <CarteDroite titre="Arrivés en octobre">
                    <ul className="lpu-jalons">
                      {MEMBRES.filter((m) => m.depuis === "2026-10").map((m) => (
                        <li key={m.slug}>
                          <Link href={ficheDe(m.slug)} className="lpu-jalon">
                            <span className="lpu-avatar" aria-hidden="true">
                              {initiales(m.nom)}
                            </span>
                            <span className="lpu-jalon-nom">{m.nom}</span>
                            <span className="lpu-jalon-compte rf-jalon-sous">{m.secteur}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </CarteDroite>
                </>
              )}
            </div>
          </aside>
        ) : null}
      </div>
    </div>
  );
}

type Gestes = {
  org: string;
  aidees: Set<string>;
  aider: (p: Publication) => void;
  epingler: (p: Publication) => void;
  copier: (href: string) => void;
  lien: (changes: Record<string, string | null>) => string;
};

/* un filtre posé, en pastille à côté des vues : un clic le retire */
function FiltrePose({ libelle, valeur, retirer }: { libelle: string; valeur: string; retirer: () => void }) {
  return (
    <button type="button" className="lin-onglet rf-pose" onClick={retirer} title="Retirer ce filtre" aria-label={`Retirer le filtre ${libelle} : ${valeur}`}>
      <span className="rf-pose-cle">{libelle}</span> {valeur}
      <span aria-hidden="true" className="rf-pose-x">
        ×
      </span>
    </button>
  );
}

/* les badges qu'un membre a accepté de montrer, prouvés par ses données (les étiquettes de membre de Circle) */
function Badges({ m }: { m: Membre }) {
  const b = m.badges;
  if (!b.bonPayeur && !b.reponseRapide) return null;
  return (
    <>
      {b.bonPayeur ? (
        <span className="rf-badge" title={`Bon payeur : paie ses fournisseurs en ${b.bonPayeur.delaiJours} jours en moyenne, sur 12 mois`}>
          <BadgeCheck {...I} />
          Bon payeur · {b.bonPayeur.delaiJours} j
        </span>
      ) : null}
      {b.reponseRapide ? (
        <span className="rf-badge" title={`Répond vite : première réponse en ${b.reponseRapide.delaiMinutes} min (médiane)`}>
          <Timer {...I} />
          Répond en {b.reponseRapide.delaiMinutes < 60 ? `${b.reponseRapide.delaiMinutes} min` : `${Math.round(b.reponseRapide.delaiMinutes / 60)} h`}
        </span>
      ) : null}
    </>
  );
}

/* l'auteur : un membre mène à sa fiche ; « vous », c'est l'organisation connectée */
function Auteur({ auteur, org }: { auteur: string; org: string }) {
  const m = auteur === VOUS ? null : membreDe(auteur);
  return (
    <span className="lpu-auteur-nom">
      <span className="lpu-avatar" data-vous={m ? undefined : ""} aria-hidden="true">
        {initiales(m?.nom ?? org)}
      </span>
      {m ? (
        <Link href={ficheDe(m.slug)} className="rf-auteur-lien">
          {m.nom}
        </Link>
      ) : (
        <>
          <span className="rf-auteur-vous">{org}</span>
          <span className="rf-vous">Vous</span>
        </>
      )}
    </span>
  );
}

function CartePublication({ p, gestes, entiere }: { p: Publication; gestes: Gestes; entiere?: boolean }) {
  const { org, aidees, aider, epingler, copier, lien } = gestes;
  const idTitre = useId();
  const [deplie, setDeplie] = useState(false);
  const m = p.auteur === VOUS ? null : membreDe(p.auteur);
  const aidee = aidees.has(p.id);
  const aidants = [...p.aident.map((s) => membreDe(s)?.nom).filter((n): n is string => !!n), ...(aidee ? ["vous"] : [])];
  const IconeType = p.type === "alerte" ? (p.genre ? ICONE_ALERTE[p.genre] : Zap) : HandHelping;
  const long = p.texte.length > 220;
  const href = lien({ pub: p.id });
  const options: Option[] = [
    ...(p.type === "alerte" ? [{ cle: "epingler", libelle: p.epinglee ? "Désépingler" : "Épingler en tête du fil", icone: p.epinglee ? <PinOff {...I} /> : <Pin {...I} />, action: () => epingler(p) }] : []),
    { cle: "copier", libelle: "Copier le lien", icone: <Link2 {...I} />, action: () => copier(href) },
    ...(m
      ? [
          { cle: "fiche", libelle: `Voir la fiche de ${m.nom}`, icone: <UserRound {...I} />, href: ficheDe(m.slug) },
          { cle: "ecrire", libelle: `Écrire à ${m.nom}`, icone: <MessageSquare {...I} />, href: ecrireA(m.slug) },
        ]
      : []),
  ];

  return (
    <article className="lpu-carte lpu-carte--maj rf-pub" aria-labelledby={idTitre} data-epinglee={p.epinglee ? "" : undefined}>
      <div className="lpu-carte-tete">
        <div className="lpu-carte-gauche">
          <span className="lpu-sante" data-teinte={p.type === "alerte" ? "jaune" : "bleu"}>
            <IconeType {...I} />
            {p.type === "alerte" ? "Alerte terrain" : "Demande"}
          </span>
          <span className="lpu-auteur">
            <Auteur auteur={p.auteur} org={org} />
            <span className="lpu-date">{ilYa(p.ilYa)}</span>
          </span>
        </div>
        <div className="rf-tete-droite">
          {p.epinglee ? (
            <span className="rf-epingle" title="Alerte épinglée en tête du fil">
              <Pin {...I} />
              <span className="v2-sr">Épinglée</span>
            </span>
          ) : null}
          <div className="lpu-carte-menu">
            <MenuActions rond aGauche titre="Actions de la publication" options={options} />
          </div>
        </div>
      </div>

      <h2 id={idTitre} className="rf-titre">
        {entiere ? (
          p.titre
        ) : (
          <Link href={href} scroll={false}>
            {p.titre}
          </Link>
        )}
      </h2>
      {p.texte ? (
        <>
          <p className="lpu-carte-texte rf-texte" data-coupe={!entiere && long && !deplie ? "" : undefined}>
            {p.texte}
          </p>
          {!entiere && long && !deplie ? (
            <button type="button" className="rf-voir-plus" onClick={() => setDeplie(true)}>
              Voir plus
            </button>
          ) : null}
        </>
      ) : null}

      {/* qui il est et ce qui compte, dans le bloc des propriétés des moteurs */}
      <div className="lpu-citation">
        <div className="lpu-citation-cadre">
          <span className="lpu-citation-barre" aria-hidden="true" />
          <dl className="lpu-props">
            <dt>Membre</dt>
            <dd>
              <IconeGroupe />
              <span>{m ? m.secteur : `Publié au nom de ${org}`}</span>
            </dd>
            <dt>{p.type === "alerte" ? "Où" : "Lieu"}</dt>
            <dd>
              <MapPin {...I} />
              <span>{p.lieu ?? (m ? `${m.commune}, ${p.ile}` : p.ile)}</span>
            </dd>
            {p.quand ? (
              <>
                <dt>Quand</dt>
                <dd>
                  <IconeCalendrier />
                  <span>{p.quand}</span>
                </dd>
              </>
            ) : null}
            {m && (m.badges.bonPayeur || m.badges.reponseRapide) ? (
              <>
                <dt>Badges</dt>
                <dd className="rf-badges">
                  <Badges m={m} />
                </dd>
              </>
            ) : null}
          </dl>
        </div>
      </div>

      {/* le résumé, comme « 44 reactions » de Circle : qui peut aider */}
      {p.type === "demande" && aidants.length ? (
        <p className="rf-aidants">
          <span className="rf-pile" aria-hidden="true">
            {aidants.slice(0, 3).map((n) => (
              <span key={n} className="lpu-avatar" data-vous={n === "vous" ? "" : undefined}>
                {n === "vous" ? initiales(org) : initiales(n)}
              </span>
            ))}
          </span>
          {phraseAidants(aidants)}
        </p>
      ) : null}

      <div className="lpu-carte-pied">
        {entiere ? null : (
          <Link href={href} scroll={false} className="lpu-bouton-bulle" aria-label={p.reponses.length ? `${p.reponses.length} réponse${p.reponses.length > 1 ? "s" : ""} : ouvrir la publication` : "Répondre : ouvrir la publication"}>
            <MessageSquare {...I} />
            {p.reponses.length ? `${p.reponses.length} réponse${p.reponses.length > 1 ? "s" : ""}` : "Répondre"}
          </Link>
        )}
        {p.type === "demande" && m ? (
          <button type="button" className="lpu-bouton-bulle rf-aider" aria-pressed={aidee} onClick={() => aider(p)}>
            <HandHelping {...I} />
            {aidee ? "Vous pouvez aider" : "Je peux aider"}
          </button>
        ) : null}
        {p.type === "alerte" ? (
          <button type="button" className="lpu-bouton-bulle rf-aider" aria-pressed={!!p.epinglee} onClick={() => epingler(p)}>
            {p.epinglee ? <PinOff {...I} /> : <Pin {...I} />}
            {p.epinglee ? "Désépingler" : "Épingler"}
          </button>
        ) : null}
        <button type="button" className="lin-rond" aria-label="Copier le lien de la publication" title="Copier le lien" onClick={() => copier(href)}>
          <Link2 {...I} />
        </button>
      </div>
    </article>
  );
}

function phraseAidants(noms: string[]) {
  const vous = noms.includes("vous");
  const autres = noms.filter((x) => x !== "vous");
  /* 03/11/2026 — « Solelek Antilles et vous peuvent aider » : avec « vous »,
     le verbe est « pouvez » ; dans une liste tronquée, « vous » passe en tête
     pour rester nommé */
  const liste = vous ? (autres.length >= 2 ? ["vous", ...autres] : [...autres, "vous"]) : autres;
  const texte = liste.length <= 2 ? liste.join(" et ") : `${liste.slice(0, 2).join(", ")} et ${liste.length - 2} autre${liste.length - 2 > 1 ? "s" : ""}`;
  const verbe = vous ? "pouvez" : liste.length > 1 ? "peuvent" : "peut";
  return `${texte.charAt(0).toUpperCase()}${texte.slice(1)} ${verbe} aider`;
}

/* la publication ouverte : la page d'une publication de Circle */
function VuePublication({ p, gestes, repondre }: { p: Publication; gestes: Gestes; repondre: (texte: string) => void }) {
  const { org, lien } = gestes;
  return (
    <>
      <div className="lpu-bloc lpu-bloc--premier">
        <Link href={lien({ pub: null })} scroll={false} className="rf-retour">
          <ArrowLeft {...I} />
          Retour au fil
        </Link>
      </div>
      <div className="lpu-bloc lpu-bloc--premier">
        <CartePublication p={p} gestes={gestes} entiere />
      </div>
      {/* « Post a comment » : le champ vient avant les réponses, comme chez Circle */}
      <div className="lpu-bloc lpu-bloc--composeur">
        <SaisieReponse org={org} titre={p.titre} envoyer={repondre} />
      </div>
      <div className="lpu-bloc lpu-bloc--premier">
        <h2 className="rf-section">{p.reponses.length ? `${p.reponses.length} réponse${p.reponses.length > 1 ? "s" : ""}` : "Aucune réponse pour l'instant"}</h2>
      </div>
      {p.reponses.map((r) => (
        <div key={r.id} className="lpu-bloc lpu-bloc--premier">
          <CarteReponse r={r} org={org} />
        </div>
      ))}
    </>
  );
}

function CarteReponse({ r, org }: { r: Reponse; org: string }) {
  const m = r.auteur === VOUS ? null : membreDe(r.auteur);
  const options: Option[] = m
    ? [
        { cle: "fiche", libelle: `Voir la fiche de ${m.nom}`, icone: <UserRound {...I} />, href: ficheDe(m.slug) },
        { cle: "ecrire", libelle: `Écrire à ${m.nom}`, icone: <MessageSquare {...I} />, href: ecrireA(m.slug) },
      ]
    : [];
  return (
    <article className="lpu-carte lpu-carte--commentaire rf-reponse" aria-label={`Réponse de ${m?.nom ?? org}`}>
      <div className="lpu-commentaire-corps">
        <div className="lpu-commentaire-tete rf-reponse-tete">
          <Auteur auteur={r.auteur} org={org} />
          {m ? <Badges m={m} /> : null}
          <span className="lpu-date">{ilYa(r.ilYa)}</span>
        </div>
        <p className="rf-reponse-sous">{m ? `${m.secteur} · ${m.commune}, ${m.ile}` : `Au nom de ${org}`}</p>
        <p className="lpu-carte-texte">{r.texte}</p>
        {options.length ? (
          <div className="lpu-commentaire-actions">
            <MenuActions rond aGauche titre="Actions de la réponse" options={options} />
          </div>
        ) : null}
      </div>
    </article>
  );
}

function SaisieReponse({ org, titre, envoyer }: { org: string; titre: string; envoyer: (texte: string) => void }) {
  const [texte, setTexte] = useState("");
  const id = useId();
  const valider = (e: React.FormEvent) => {
    e.preventDefault();
    if (!texte.trim()) return;
    envoyer(texte.trim());
    setTexte("");
  };
  return (
    <form className="lpu-composeur rf-composeur rf-composeur--reponse" onSubmit={valider} aria-label={`Répondre à « ${titre} »`}>
      <label className="v2-sr" htmlFor={id}>
        Votre réponse
      </label>
      <textarea id={id} className="lpu-composeur-champ rf-zone" rows={3} value={texte} onChange={(e) => setTexte(e.target.value)} placeholder="Votre réponse : une solution, un contact, une date…" />
      <div className="lpu-composeur-pied">
        <span className="lpu-composeur-source">
          <span className="lpu-avatar" data-vous="" aria-hidden="true">
            {initiales(org)}
          </span>
          Au nom de {org}
        </span>
        <div className="lpu-composeur-droite">
          <button type="submit" className="lin-btn lin-btn--plein rf-envoyer" disabled={!texte.trim()}>
            Répondre
          </button>
        </div>
      </div>
    </form>
  );
}

/* le composeur du fil (« Start a post ») : le type, le titre ; puis les détails, la précision et l'île */
function Composeur({ org, publier }: { org: string; publier: (b: Brouillon) => void }) {
  const [type, setType] = useState<TypePublication>("demande");
  const [titre, setTitre] = useState("");
  const [texte, setTexte] = useState("");
  const [ile, setIle] = useState<Ile>("Guadeloupe");
  const [precision, setPrecision] = useState("");
  const id = useId();
  const valider = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titre.trim()) return;
    publier({ type, titre: titre.trim(), texte: texte.trim(), ile, ...(type === "alerte" ? { lieu: precision.trim() || undefined } : { quand: precision.trim() || undefined }) });
    setTitre("");
    setTexte("");
    setPrecision("");
  };
  return (
    <form className="lpu-composeur rf-composeur" onSubmit={valider} aria-label="Nouvelle publication">
      <div className="lpu-composeur-haut">
        <div className="lpu-segment" role="group" aria-label="Type de publication">
          <button type="button" aria-pressed={type === "demande"} onClick={() => setType("demande")}>
            Demande
          </button>
          <button type="button" aria-pressed={type === "alerte"} onClick={() => setType("alerte")}>
            Alerte terrain
          </button>
        </div>
      </div>
      <label className="v2-sr" htmlFor={`${id}-t`}>
        Titre
      </label>
      <input id={`${id}-t`} className="lpu-composeur-champ" value={titre} onChange={(e) => setTitre(e.target.value)} placeholder={type === "alerte" ? "Ce qui se passe : retard, coupure, météo…" : "Ce que vous cherchez ou ce que vous proposez…"} autoComplete="off" />
      {titre ? (
        <>
          <label className="v2-sr" htmlFor={`${id}-d`}>
            Détails
          </label>
          <textarea id={`${id}-d`} className="lpu-composeur-champ rf-zone" rows={2} value={texte} onChange={(e) => setTexte(e.target.value)} placeholder="Les détails utiles : quantités, délais, conditions…" />
          <label className="v2-sr" htmlFor={`${id}-p`}>
            {type === "alerte" ? "Où" : "Pour quand"}
          </label>
          <input id={`${id}-p`} className="lpu-composeur-champ rf-precision" value={precision} onChange={(e) => setPrecision(e.target.value)} placeholder={type === "alerte" ? "Où (facultatif)" : "Pour quand (facultatif)"} autoComplete="off" />
        </>
      ) : null}
      <div className="lpu-composeur-pied">
        <span className="lpu-composeur-source">
          <span className="lpu-avatar" data-vous="" aria-hidden="true">
            {initiales(org)}
          </span>
          Au nom de {org}
        </span>
        <div className="lpu-composeur-droite">
          <MenuOptions
            plat
            aDroite
            libelle={`Île : ${ile}`}
            titre="Île…"
            options={ILES.map((i) => ({ cle: i, libelle: i, coche: ile === i, action: () => setIle(i) }))}
            declencheur={
              <>
                <MapPin {...I} />
                <span>{ile}</span>
              </>
            }
          />
          <button type="submit" className="lin-btn lin-btn--plein rf-envoyer" disabled={!titre.trim()}>
            Publier
          </button>
        </div>
      </div>
    </form>
  );
}

/* le panneau d'une publication ouverte : ses propriétés, qui peut aider, et les gestes vers l'auteur */
function PanneauPublication({ p, org, aidee }: { p: Publication; org: string; aidee: boolean }) {
  const m = p.auteur === VOUS ? null : membreDe(p.auteur);
  const aidants = p.aident.map((s) => membreDe(s)).filter((x): x is Membre => !!x);
  return (
    <>
      <CarteDroite titre="Publication">
        <dl className="lpu-proprietes">
          <div>
            <dt>Type</dt>
            <dd>
              <span className="lpu-valeur" data-teinte={p.type === "alerte" ? "jaune" : "bleu"}>
                {p.type === "alerte" ? <Zap {...I} /> : <HandHelping {...I} />}
                <span>{p.type === "alerte" ? "Alerte terrain" : "Demande"}</span>
              </span>
            </dd>
          </div>
          <div>
            <dt>Auteur</dt>
            <dd>
              {m ? (
                <Link href={ficheDe(m.slug)} className="lpu-valeur">
                  <IconeGroupe />
                  <span>{m.nom}</span>
                </Link>
              ) : (
                <span className="lpu-valeur">
                  <IconeGroupe />
                  <span>{org} (vous)</span>
                </span>
              )}
            </dd>
          </div>
          <div>
            <dt>Île</dt>
            <dd>
              <span className="lpu-valeur">
                <MapPin {...I} />
                <span>{p.ile}</span>
              </span>
            </dd>
          </div>
          {p.lieu || p.quand ? (
            <div>
              <dt>{p.lieu ? "Où" : "Quand"}</dt>
              <dd>
                <span className="lpu-valeur">
                  {p.lieu ? <MapPin {...I} /> : <IconeCalendrier />}
                  <span>{p.lieu ?? p.quand}</span>
                </span>
              </dd>
            </div>
          ) : null}
          <div>
            <dt>Publiée</dt>
            <dd>
              <span className="lpu-valeur">
                <IconeCalendrier />
                <span>{ilYa(p.ilYa)}</span>
              </span>
            </dd>
          </div>
          <div>
            <dt>Réponses</dt>
            <dd>
              <span className="lpu-valeur lpu-valeur--chiffre">
                <MessageSquare {...I} />
                <span>{p.reponses.length}</span>
              </span>
            </dd>
          </div>
        </dl>
        {m ? (
          <div className="lpu-detail-actions">
            <Link href={ecrireA(m.slug)} className="lin-btn lin-btn--plein lin-btn--texte">
              <MessageSquare {...I} />
              Écrire à {m.nom}
            </Link>
            <Link href={ficheDe(m.slug)} className="lin-btn lin-btn--texte">
              Voir la fiche
            </Link>
          </div>
        ) : null}
      </CarteDroite>
      {p.type === "demande" ? (
        <CarteDroite titre="Peuvent aider">
          {aidants.length || aidee ? (
            <ul className="lpu-jalons">
              {aidants.map((a) => (
                <li key={a.slug}>
                  <Link href={ficheDe(a.slug)} className="lpu-jalon">
                    <span className="lpu-avatar" aria-hidden="true">
                      {initiales(a.nom)}
                    </span>
                    <span className="lpu-jalon-nom">{a.nom}</span>
                    <span className="lpu-jalon-compte rf-jalon-sous">{a.secteur}</span>
                  </Link>
                </li>
              ))}
              {aidee ? (
                <li>
                  <span className="lpu-jalon">
                    <span className="lpu-avatar" data-vous="" aria-hidden="true">
                      {initiales(org)}
                    </span>
                    <span className="lpu-jalon-nom">{org}</span>
                    <span className="lpu-jalon-compte">vous</span>
                  </span>
                </li>
              ) : null}
            </ul>
          ) : (
            <p className="rf-panneau-vide">Personne pour l&apos;instant. « Je peux aider » prévient l&apos;auteur.</p>
          )}
        </CarteDroite>
      ) : null}
    </>
  );
}
