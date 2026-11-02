"use client";

/* ══════════════════════════════════════════════════════════════════════
   Réseau Omega › Opportunités (02/11/2026)

   Ce que le réseau fait gagner à « vous », l'organisation connectée
   d'Espace 2 (useOrganisation : CAMA dans l'exemple). Jamais un membre.

   La COMPOSITION est celle du kanban et des records d'Attio, relevés au
   style calculé sur attio.com (02/11, 1440 px) : des colonnes de 272 px
   espacées de 16 px, un en-tête de colonne (pastille de couleur, titre en
   14/600, compteur en 11 px), des cartes-records où chaque attribut tient
   une ligne de 32 px (icône de 16 px, valeur en 14/500, le nom souligné),
   un pied d'actions et l'âge à droite en 12 px ; au-delà de la largeur,
   le tableau défile de côté. L'HABILLAGE est entièrement celui d'Espace 2 :
   jetons --v2-*, v2-btn, v2-badge, v2-carte, v2-tableau, rayons de 6 et
   8 px, filets sans ombre portée, Inter et Manrope (opportunites.css).

   Trois colonnes, une par famille :
     1. Mises en relation tirées des données — la raison, la donnée qui
        l'a fait naître, « Accepter » et « Pas maintenant » ;
     2. Groupements de marchés publics — les lots et qui les tient,
        « Former un groupement » ;
     3. Achats groupés — inscrits, seuil, clôture, « Je participe ».
   Au-dessus, « Ce que le réseau vous a apporté » : intros acceptées →
   devis → signés → montants, puis le détail en records.

   Exemple ou réel : reseauEnExemple(source) (./source.ts). En base
   réelle, aucun faux membre : un état vide (le réseau n'a pas de table).
   Les gestes restent dans la page (useState) : rien n'est écrit en base.
   ══════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useMemo, useState } from "react";
import { BadgeCheck, Building2, CalendarClock, ChevronDown, ChevronUp, Clock, Database, Handshake, Landmark, MapPin, Network, ShoppingCart, Sparkles, TrendingDown, Undo2, Users } from "lucide-react";
import { useSource } from "@/components/espace/source";
import { useOrganisation } from "../organisation";
import { RACINE } from "../modules";
import { useToast } from "../Toasts";
import { Badge, ItemMenu, MenuDeroulant, Vide } from "../ui";
import { MEMBRES, type Ile, type Membre } from "./membres";
import { reseauEnExemple } from "./source";
import { ACHATS_GROUPES, GROUPEMENTS, MISES_EN_RELATION, SUIVI, type AchatGroupe, type Groupement, type MiseEnRelation, type Provenance, type Suivi } from "./opportunites-donnees";
import "./opportunites.css";

const I = { width: 16, height: 16, "aria-hidden": true, strokeWidth: 1.75 } as const;

const PAR_SLUG = new Map(MEMBRES.map((m) => [m.slug, m]));
const membre = (slug: string): Membre => {
  const m = PAR_SLUG.get(slug);
  if (!m) throw new Error(`Membre inconnu : ${slug}`);
  return m;
};
const ficheMembre = (slug: string) => `${RACINE}/reseau/membres/${slug}`;

const euros = (n: number) => `${n.toLocaleString("fr-FR")} €`;
const date = (iso: string, annee = false) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: annee ? "numeric" : undefined, timeZone: "UTC" });
const duree = (min: number) => (min < 60 ? `${min} min` : `${Math.floor(min / 60)} h${min % 60 ? ` ${String(min % 60).padStart(2, "0")}` : ""}`);
const initiales = (nom: string) =>
  nom
    .split(/\s+/)
    .slice(0, 2)
    .map((m) => m.charAt(0).toUpperCase())
    .join("");

type FiltreIle = "toutes" | Ile;

export default function Opportunites() {
  const { source, changer, connecte } = useSource();
  const exemple = reseauEnExemple(source);
  const org = useOrganisation();

  return (
    <div className="v2-page op-page">
      <header className="op-tete">
        <div>
          <h1 className="op-titre">Opportunités</h1>
          <p className="op-sous">Ce que le réseau peut vous faire gagner, tiré de vos données : des mises en relation, des marchés à plusieurs, des achats groupés.</p>
        </div>
      </header>
      {exemple ? (
        <Tableau vous={org.nom} />
      ) : (
        <Vide icone={<Network {...I} />} titre="Le réseau ouvre bientôt" action={connecte ? <button type="button" className="v2-btn v2-btn--petit" onClick={() => changer("exemple")}>Voir l&apos;exemple</button> : null}>
          Aucune entreprise n&apos;est encore inscrite au Réseau Omega. Dès les premiers membres, les mises en relation, les groupements de marchés publics et les achats groupés qui vous concernent apparaîtront ici, avec la raison de chaque suggestion.
        </Vide>
      )}
    </div>
  );
}

/* ——— la page en exemple ——— */

function Tableau({ vous }: { vous: string }) {
  const toast = useToast();
  const [ile, setIle] = useState<FiltreIle>("toutes");
  /* les gestes de la séance : rien n'est écrit en base */
  const [acceptees, setAcceptees] = useState<string[]>([]);
  const [deCote, setDeCote] = useState<string[]>([]);
  const [voirDeCote, setVoirDeCote] = useState(false);
  const [groupements, setGroupements] = useState<string[]>([]);
  const [participations, setParticipations] = useState<string[]>([]);

  const garde = (slug: string | null) => ile === "toutes" || slug === null || membre(slug).ile === ile;
  const relations = useMemo(() => MISES_EN_RELATION.filter((r) => (ile === "toutes" || membre(r.membre).ile === ile)), [ile]);
  const visibles = relations.filter((r) => !deCote.includes(r.id) || voirDeCote);
  const marches = GROUPEMENTS.filter((g) => g.lots.some((l) => l.titulaire && garde(l.titulaire)));
  const achats = ACHATS_GROUPES.filter((a) => garde(a.organisateur));
  const nbDeCote = relations.filter((r) => deCote.includes(r.id)).length;

  const accepter = (r: MiseEnRelation) => {
    setAcceptees((a) => [...a, r.id]);
    toast(`Intro demandée à ${membre(r.membre).nom}. Elle apparaîtra dans votre suivi.`, "vert");
  };
  const plusTard = (r: MiseEnRelation) => {
    setDeCote((d) => [...d, r.id]);
    toast(`${membre(r.membre).nom} : suggestion mise de côté.`);
  };
  const reprendre = (r: MiseEnRelation) => setDeCote((d) => d.filter((x) => x !== r.id));
  const former = (g: Groupement) => {
    setGroupements((x) => [...x, g.id]);
    const autres = g.lots.filter((l) => l.titulaire).map((l) => membre(l.titulaire as string).nom);
    toast(`Groupement proposé à ${autres.join(" et ")}.`, "vert");
  };
  const participer = (a: AchatGroupe) => {
    const deja = participations.includes(a.id);
    setParticipations((p) => (deja ? p.filter((x) => x !== a.id) : [...p, a.id]));
    toast(deja ? `Vous ne participez plus : ${a.titre}.` : `Inscription notée : ${a.titre}.`, deja ? "neutre" : "vert");
  };

  return (
    <>
      <Apports vous={vous} enPlus={acceptees.length} />

      <section className="op-section" aria-labelledby="op-tableau-titre">
        <div className="op-barre">
          <h2 id="op-tableau-titre" className="v2-h2">
            À saisir <span className="op-compte">{visibles.length + marches.length + achats.length}</span>
          </h2>
          <MenuDeroulant
            etiquette={`Île : ${ile === "toutes" ? "toutes les îles" : ile}. Changer`}
            classe="v2-btn v2-btn--petit"
            placement="bottom end"
            largeur={220}
            declencheur={
              <>
                <MapPin {...I} />
                {ile === "toutes" ? "Toutes les îles" : ile}
              </>
            }
          >
            {(["toutes", "Guadeloupe", "Martinique"] as const).map((x) => (
              <ItemMenu key={x} id={x} onAction={() => setIle(x)} suffixe={ile === x ? "✓" : undefined}>
                {x === "toutes" ? "Toutes les îles" : x}
              </ItemMenu>
            ))}
          </MenuDeroulant>
        </div>

        <div className="op-kanban" role="list" aria-label="Opportunités, par famille">
          <Colonne
            teinte="bleu"
            icone={<Handshake {...I} />}
            titre="Mises en relation"
            nombre={visibles.length}
            vide={nbDeCote ? "Toutes les suggestions sont mises de côté." : "Aucune mise en relation sur cette île pour l'instant."}
            pied={
              nbDeCote > 0 ? (
                <button type="button" className="op-colonne-pied" onClick={() => setVoirDeCote((v) => !v)} aria-expanded={voirDeCote}>
                  <Undo2 {...I} />
                  {voirDeCote ? "Masquer les suggestions mises de côté" : `${nbDeCote} mise${nbDeCote > 1 ? "s" : ""} de côté : revoir`}
                </button>
              ) : null
            }
          >
            {visibles.map((r) => (
              <CarteRelation key={r.id} r={r} acceptee={acceptees.includes(r.id)} deCote={deCote.includes(r.id)} onAccepter={() => accepter(r)} onPlusTard={() => plusTard(r)} onReprendre={() => reprendre(r)} />
            ))}
          </Colonne>
          <Colonne teinte="ambre" icone={<Landmark {...I} />} titre="Groupements de marchés publics" nombre={marches.length} vide="Aucun marché à plusieurs sur cette île pour l'instant.">
            {marches.map((g) => (
              <CarteGroupement key={g.id} g={g} vous={vous} forme={groupements.includes(g.id)} onFormer={() => former(g)} />
            ))}
          </Colonne>
          <Colonne teinte="vert" icone={<ShoppingCart {...I} />} titre="Achats groupés" nombre={achats.length} vide="Aucun achat groupé sur cette île pour l'instant.">
            {achats.map((a) => (
              <CarteAchat key={a.id} a={a} inscrit={participations.includes(a.id)} onParticiper={() => participer(a)} />
            ))}
          </Colonne>
        </div>
      </section>
    </>
  );
}

/* ——— une colonne du kanban ——— */

function Colonne({ teinte, icone, titre, nombre, vide, pied, children }: { teinte: "bleu" | "ambre" | "vert"; icone: React.ReactNode; titre: string; nombre: number; vide: string; pied?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="op-colonne" role="listitem" aria-label={`${titre}, ${nombre}`}>
      <header className="op-colonne-tete">
        <span className="v2-point op-colonne-point" data-teinte={teinte} aria-hidden="true" />
        <span className="op-colonne-icone" aria-hidden="true">
          {icone}
        </span>
        <h3 className="op-colonne-titre">{titre}</h3>
        <span className="op-compte">{nombre}</span>
      </header>
      {nombre === 0 ? (
        <p className="op-colonne-vide">{vide}</p>
      ) : (
        <div className="op-colonne-corps" role="list" aria-label={titre}>
          {children}
        </div>
      )}
      {pied}
    </section>
  );
}

/* ——— les briques d'une carte-record ——— */

function Attribut({ icone, etiquette, children }: { icone: React.ReactNode; etiquette: string; children: React.ReactNode }) {
  return (
    <div className="op-attr">
      <dt className="op-attr-icone" title={etiquette}>
        {icone}
        <span className="v2-sr">{etiquette}</span>
      </dt>
      <dd className="op-attr-valeur">{children}</dd>
    </div>
  );
}

function LienMembre({ slug, avecSecteur }: { slug: string; avecSecteur?: boolean }) {
  const m = membre(slug);
  return (
    <span className="op-membre">
      <span className="v2-initiales op-initiales" aria-hidden="true">
        {initiales(m.nom)}
      </span>
      <Link href={ficheMembre(slug)} className="op-lien">
        {m.nom}
      </Link>
      {avecSecteur ? <span className="op-gris">{m.commune}</span> : null}
    </span>
  );
}

/* les badges que le membre a choisi de montrer, et eux seuls (MEMBRES[].badges) */
function BadgesMembre({ slug }: { slug: string }) {
  const { badges } = membre(slug);
  const liste: React.ReactNode[] = [];
  if (badges.bonPayeur) liste.push(<Badge key="p" teinte="vert" title="Délai moyen de paiement de ses fournisseurs, sur 12 mois">Paie en {badges.bonPayeur.delaiJours} j</Badge>);
  if (badges.reponseRapide) liste.push(<Badge key="r" teinte="bleu" title="Délai médian de première réponse aux demandes">Répond en {duree(badges.reponseRapide.delaiMinutes)}</Badge>);
  if (!liste.length) return null;
  return <span className="op-badges">{liste}</span>;
}

function Origine({ p }: { p: Provenance }) {
  return (
    <Attribut icone={<Database {...I} />} etiquette="Tiré de">
      <span>
        {p.libelle} <span className="op-gris">· {p.detail}</span>
      </span>
    </Attribut>
  );
}

/* 1. mise en relation */
function CarteRelation({ r, acceptee, deCote, onAccepter, onPlusTard, onReprendre }: { r: MiseEnRelation; acceptee: boolean; deCote: boolean; onAccepter: () => void; onPlusTard: () => void; onReprendre: () => void }) {
  const m = membre(r.membre);
  const aBadges = !!(m.badges.bonPayeur || m.badges.reponseRapide);
  return (
    <article className="op-carte" role="listitem" data-etat={acceptee ? "acceptee" : deCote ? "de-cote" : undefined} aria-label={r.titre}>
      <p className="op-carte-titre">{r.titre}</p>
      <dl className="op-attrs">
        <Attribut icone={<Building2 {...I} />} etiquette="Membre">
          <LienMembre slug={r.membre} />
        </Attribut>
        <Attribut icone={<MapPin {...I} />} etiquette="Secteur et commune">
          <span className="op-tronque">
            {m.secteur} <span className="op-gris">· {m.commune}</span>
          </span>
        </Attribut>
        <Attribut icone={<Sparkles {...I} />} etiquette="Pourquoi">
          <span className="op-raison">{r.raison}</span>
        </Attribut>
        <Origine p={r.provenance} />
        {aBadges ? (
          <Attribut icone={<BadgeCheck {...I} />} etiquette="Badges montrés par le membre">
            <BadgesMembre slug={r.membre} />
          </Attribut>
        ) : null}
      </dl>
      <footer className="op-carte-pied">
        {acceptee ? (
          <span className="op-fait">
            <span className="v2-point" data-teinte="vert" aria-hidden="true" />
            Intro demandée
          </span>
        ) : deCote ? (
          <button type="button" className="v2-btn v2-btn--petit" onClick={onReprendre}>
            Reprendre
          </button>
        ) : (
          <span className="op-actions">
            <button type="button" className="v2-btn v2-btn--petit v2-btn--primaire" onClick={onAccepter}>
              Accepter
            </button>
            <button type="button" className="v2-btn v2-btn--petit v2-btn--fantome" onClick={onPlusTard}>
              Pas maintenant
            </button>
          </span>
        )}
        <span className="op-age" title="Suggestion née il y a">
          <Clock width={12} height={12} aria-hidden="true" />
          {r.age}
        </span>
      </footer>
    </article>
  );
}

/* 2. groupement de marché public */
function CarteGroupement({ g, vous, forme, onFormer }: { g: Groupement; vous: string; forme: boolean; onFormer: () => void }) {
  return (
    <article className="op-carte" role="listitem" data-etat={forme ? "acceptee" : undefined} aria-label={`${g.titre}, ${g.montant}`}>
      <p className="op-carte-titre">
        {g.titre}, <span className="v2-tabulaire">{g.montant}</span>
      </p>
      <p className="op-carte-phrase">{g.raison}</p>
      <dl className="op-attrs">
        <Attribut icone={<Landmark {...I} />} etiquette="Acheteur">
          {g.acheteur}
        </Attribut>
        <Attribut icone={<CalendarClock {...I} />} etiquette="Remise des offres">
          <span>
            Offres avant le <span className="v2-tabulaire">{date(g.remise, true)}</span>
          </span>
        </Attribut>
        <Origine p={g.provenance} />
      </dl>
      <ol className="op-lots" aria-label="Les lots et qui les couvre">
        {g.lots.map((l) => (
          <li key={l.numero} className="op-lot" data-vous={l.titulaire === null ? "" : undefined}>
            <span className="op-lot-numero">Lot {l.numero}</span>
            <span className="op-lot-intitule">{l.intitule}</span>
            <span className="op-lot-qui">
              {l.titulaire ? (
                <>
                  <LienMembre slug={l.titulaire} />
                  <BadgesMembre slug={l.titulaire} />
                </>
              ) : (
                <span className="op-membre">
                  <span className="v2-initiales op-initiales op-initiales--vous" aria-hidden="true">
                    {initiales(vous)}
                  </span>
                  <strong>Vous</strong>
                  <span className="op-gris">{vous}</span>
                </span>
              )}
            </span>
          </li>
        ))}
      </ol>
      <footer className="op-carte-pied">
        {forme ? (
          <span className="op-fait">
            <span className="v2-point" data-teinte="vert" aria-hidden="true" />
            Groupement proposé
          </span>
        ) : (
          <button type="button" className="v2-btn v2-btn--petit v2-btn--primaire" onClick={onFormer}>
            <Users {...I} />
            Former un groupement
          </button>
        )}
        <span className="op-age" title="Avis repéré il y a">
          <Clock width={12} height={12} aria-hidden="true" />
          {g.age}
        </span>
      </footer>
    </article>
  );
}

/* 3. achat groupé */
function CarteAchat({ a, inscrit, onParticiper }: { a: AchatGroupe; inscrit: boolean; onParticiper: () => void }) {
  const inscrits = a.inscrits + (inscrit ? 1 : 0);
  const atteint = inscrits >= a.seuil;
  const reste = a.seuil - inscrits;
  return (
    <article className="op-carte" role="listitem" data-etat={inscrit ? "acceptee" : undefined} aria-label={a.titre}>
      <p className="op-carte-titre">{a.titre}</p>
      <dl className="op-attrs">
        <Attribut icone={<Building2 {...I} />} etiquette="Organisé par">
          {a.organisateur ? <LienMembre slug={a.organisateur} /> : <span>Omega, pour le réseau</span>}
        </Attribut>
        <Attribut icone={<Sparkles {...I} />} etiquette="Pourquoi">
          <span className="op-raison">{a.raison}</span>
        </Attribut>
        <Origine p={a.provenance} />
        <Attribut icone={<TrendingDown {...I} />} etiquette="Ce qu'on vise">
          {a.gain}
        </Attribut>
        <Attribut icone={<CalendarClock {...I} />} etiquette="Clôture des inscriptions">
          <span>
            Inscriptions jusqu&apos;au <span className="v2-tabulaire">{date(a.cloture)}</span>
          </span>
        </Attribut>
      </dl>
      <div className="op-seuil">
        <div className="op-seuil-ligne">
          <span>
            <strong className="v2-tabulaire">{inscrits}</strong> inscrits sur <span className="v2-tabulaire">{a.seuil}</span> nécessaires
          </span>
          <span className="op-gris">{atteint ? "Seuil atteint" : `encore ${reste}`}</span>
        </div>
        <div className="op-jauge" role="progressbar" aria-label={`Inscrits : ${inscrits} sur ${a.seuil}`} aria-valuemin={0} aria-valuemax={a.seuil} aria-valuenow={Math.min(inscrits, a.seuil)} data-atteint={atteint ? "" : undefined}>
          <span style={{ width: `${Math.min(100, (inscrits / a.seuil) * 100)}%` }} />
        </div>
      </div>
      <footer className="op-carte-pied">
        {inscrit ? (
          <span className="op-actions">
            <span className="op-fait">
              <span className="v2-point" data-teinte="vert" aria-hidden="true" />
              Vous participez
            </span>
            <button type="button" className="v2-btn v2-btn--petit v2-btn--fantome" onClick={onParticiper}>
              Se retirer
            </button>
          </span>
        ) : (
          <button type="button" className="v2-btn v2-btn--petit v2-btn--primaire" onClick={onParticiper}>
            Je participe
          </button>
        )}
      </footer>
    </article>
  );
}

/* ——— « Ce que le réseau vous a apporté » ——— */

const ETAT: Record<Suivi["etat"], { libelle: string; teinte: "gris" | "bleu" | "vert" | "rouge" }> = {
  intro: { libelle: "Intro acceptée", teinte: "gris" },
  devis: { libelle: "Devis en cours", teinte: "bleu" },
  signe: { libelle: "Signé", teinte: "vert" },
  perdu: { libelle: "Sans suite", teinte: "rouge" },
};

function Apports({ vous, enPlus }: { vous: string; enPlus: number }) {
  const [detail, setDetail] = useState(false);
  const intros = SUIVI.length + enPlus;
  const devis = SUIVI.filter((s) => s.devis !== null);
  const signes = SUIVI.filter((s) => s.etat === "signe");
  const montant = signes.reduce((t, s) => t + (s.devis ?? 0), 0);
  const enCours = devis.filter((s) => s.etat === "devis").reduce((t, s) => t + (s.devis ?? 0), 0);
  const part = (n: number, sur: number) => (sur ? `${Math.round((n / sur) * 100)} %` : "—");
  const etapes = [
    { cle: "intros", libelle: "Intros acceptées", valeur: String(intros), sous: enPlus ? `dont ${enPlus} aujourd’hui` : "depuis septembre" },
    { cle: "devis", libelle: "Devis échangés", valeur: String(devis.length), sous: `${part(devis.length, intros)} des intros` },
    { cle: "signes", libelle: "Devis signés", valeur: String(signes.length), sous: `${part(signes.length, devis.length)} des devis` },
    { cle: "montant", libelle: "Montant signé", valeur: euros(montant), sous: `${euros(enCours)} encore en devis` },
  ];
  return (
    <section className="op-section" aria-labelledby="op-apports-titre">
      <div className="op-barre">
        <h2 id="op-apports-titre" className="v2-h2">
          Ce que le réseau vous a apporté
        </h2>
        <span className="op-gris op-barre-note">{vous}, montants hors taxes</span>
      </div>
      <div className="v2-carte op-apports">
        <ol className="op-entonnoir">
          {etapes.map((e) => (
            <li key={e.cle} className="op-etape">
              <span className="v2-stat-etiquette">{e.libelle}</span>
              <span className="v2-stat-valeur">{e.valeur}</span>
              <span className="v2-stat-sous">{e.sous}</span>
            </li>
          ))}
        </ol>
        {detail ? (
          <div className="v2-tableau-cadre op-records" id="op-records">
            <table className="v2-tableau v2-tableau--empile">
              <caption className="v2-sr">Le détail des mises en relation acceptées</caption>
              <thead>
                <tr>
                  <th scope="col">Membre</th>
                  <th scope="col">Objet</th>
                  <th scope="col">Intro</th>
                  <th scope="col">Devis</th>
                  <th scope="col" className="v2-num">
                    Montant
                  </th>
                  <th scope="col">État</th>
                </tr>
              </thead>
              <tbody>
                {SUIVI.map((s) => (
                  <tr key={s.membre}>
                    <td data-etiquette="Membre" data-plein="">
                      <LienMembre slug={s.membre} />
                    </td>
                    <td data-etiquette="Objet" data-plein="">
                      {s.objet}
                    </td>
                    <td data-etiquette="Intro" className="v2-tabulaire">
                      {date(s.intro)}
                    </td>
                    <td data-etiquette="Devis">{s.devis === null ? <span className="op-gris">Pas encore</span> : s.sens === "recu" ? "Reçu" : "Envoyé"}</td>
                    <td data-etiquette="Montant" className="v2-num">
                      {s.devis === null ? <span className="op-gris">—</span> : euros(s.devis)}
                    </td>
                    <td data-etiquette="État">
                      <Badge teinte={ETAT[s.etat].teinte}>{ETAT[s.etat].libelle}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        <div className="v2-carte-pied op-apports-pied">
          <span>{detail ? "Une ligne par intro acceptée, de l'intro au devis signé." : `Le détail des ${SUIVI.length} intros acceptées : devis, montants, état.`}</span>
          <button type="button" className="v2-btn v2-btn--petit" aria-expanded={detail} aria-controls="op-records" onClick={() => setDetail((d) => !d)}>
            {detail ? <ChevronUp {...I} /> : <ChevronDown {...I} />}
            {detail ? "Masquer le détail" : "Voir le détail"}
          </button>
        </div>
      </div>
    </section>
  );
}
