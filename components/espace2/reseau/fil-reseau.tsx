"use client";

/* ══════════════════════════════════════════════════════════════════════
   /espace2/reseau — le Fil du Réseau Omega (02/11/2026)

   La COMPOSITION est celle du fil de Circle (community.circle.so/feed,
   relevé au style calculé le 02/11/2026) : une colonne de publications de
   672 px au plus ; chaque carte porte son titre, puis l'auteur (pastille
   de 40 px, nom en 500, étiquettes de membre, date ; dessous, d'où il
   vient), le texte, une ligne de résumé (qui peut aider, combien de
   réponses), un filet, la rangée d'actions, puis les réponses. En tête,
   le composeur « Publier… » qui se déplie.

   L'HABIT est celui d'Espace 2, sans rien de Circle : jetons --v2-*,
   cartes .v2-carte, boutons .v2-btn, champs .v2-champ, badges .v2-badge,
   menus MenuDeroulant, police de l'espace, thème clair et sombre.

   « Vous » est l'organisation connectée (OrganisationContexte), jamais
   un membre. En base réelle, l'état vide commun (source.ts). Les filtres
   (type, île, secteur) vivent dans l'adresse ; le reste (publier,
   répondre, « Je peux aider », épingler) est en état local.
   ══════════════════════════════════════════════════════════════════════ */

import { useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Check, ChevronDown, CloudRain, HandHelping, MessageCircle, Network, Pin, PinOff, Send, Ship, Zap } from "lucide-react";
import { useSource } from "@/components/espace/source";
import { useOrganisation } from "../organisation";
import { useToast } from "../Toasts";
import { Badge, ItemMenu, MenuDeroulant, SectionMenu, SeparateurMenu, Vide } from "../ui";
import { RACINE } from "../modules";
import { MEMBRES, type Ile } from "./membres";
import { reseauEnExemple } from "./source";
import { ReseauVide } from "./reseau-vide";
import { PUBLICATIONS, VOUS, ilYa, initiales, membreDe, type Auteur, type Publication, type Reponse, type TypePublication } from "./fil-donnees";
import "./fil.css";

const I = { width: 14, height: 14, strokeWidth: 1.8, "aria-hidden": true } as const;
const ILES: Ile[] = ["Guadeloupe", "Martinique"];
const ficheDe = (slug: string) => `${RACINE}/reseau/membres/${slug}`;

export default function FilReseau() {
  const { source } = useSource();
  if (!reseauEnExemple(source))
    return (
      <div className="v2-page rf">
        <h1 className="v2-sr">Fil du réseau</h1>
        <div className="rf-colonnes">
          <div className="rf-flux">
            <ReseauVide icone={Network} page="Le Fil y montrera les demandes et les alertes terrain des membres." />
          </div>
        </div>
      </div>
    );
  return <Fil />;
}

/* ——— les filtres, dans l'adresse : ?type=demandes|alertes, ?ile=guadeloupe|martinique, ?secteur=… ——— */
function useFiltres() {
  const params = useSearchParams();
  const router = useRouter();
  const chemin = usePathname();
  const brutType = params.get("type");
  const type: TypePublication | null = brutType === "demandes" ? "demande" : brutType === "alertes" ? "alerte" : null;
  const ile = ILES.find((i) => i.toLowerCase() === params.get("ile")) ?? null;
  const secteur = params.get("secteur");
  const poser = (changes: Record<string, string | null>) => {
    const p = new URLSearchParams(params.toString());
    for (const [cle, valeur] of Object.entries(changes)) {
      if (valeur) p.set(cle, valeur);
      else p.delete(cle);
    }
    const q = p.toString();
    router.replace(q ? `${chemin}?${q}` : chemin, { scroll: false });
  };
  return { type, ile, secteur, poser };
}

const secteurDe = (a: Auteur) => (a === VOUS ? null : (membreDe(a)?.secteur ?? null));

function Fil() {
  const { nom: org } = useOrganisation();
  const toast = useToast();
  const { type, ile, secteur, poser } = useFiltres();

  /* l'état local : ce que « vous » publiez, répondez, proposez, épinglez */
  const [miennes, setMiennes] = useState<Publication[]>([]);
  const [reponses, setReponses] = useState<Record<string, Reponse[]>>({});
  const [aidees, setAidees] = useState<Set<string>>(() => new Set());
  const [epingles, setEpingles] = useState<Record<string, boolean>>({});
  const compteur = useRef(1);

  const toutes = useMemo(() => [...miennes, ...PUBLICATIONS].map((p) => ({ ...p, reponses: [...p.reponses, ...(reponses[p.id] ?? [])], epinglee: epingles[p.id] ?? !!p.epinglee })), [miennes, reponses, epingles]);
  const secteurs = useMemo(() => [...new Set(PUBLICATIONS.map((p) => secteurDe(p.auteur)).filter((s): s is string => !!s))].sort((a, b) => a.localeCompare(b, "fr")), []);

  /* l'île et le secteur d'abord (les compteurs des types en dépendent), puis le type */
  const parLieu = toutes.filter((p) => (!ile || p.ile === ile) && (!secteur || secteurDe(p.auteur) === secteur));
  const visibles = parLieu
    .filter((p) => !type || p.type === type)
    /* les alertes épinglées en tête, puis de la plus récente à la plus ancienne */
    .sort((a, b) => Number(b.epinglee && b.type === "alerte") - Number(a.epinglee && a.type === "alerte") || a.ilYa - b.ilYa);
  const nb = (t: TypePublication) => parLieu.filter((p) => p.type === t).length;
  const filtre = !!(type || ile || secteur);

  const publier = (p: Omit<Publication, "id" | "auteur" | "ilYa" | "aident" | "reponses">) => {
    setMiennes((m) => [{ ...p, id: `vous-${compteur.current++}`, auteur: VOUS, ilYa: 0, aident: [], reponses: [] }, ...m]);
    toast(p.type === "alerte" ? "Alerte publiée dans le fil" : "Demande publiée dans le fil", "vert");
  };
  const repondre = (id: string, texte: string) => setReponses((r) => ({ ...r, [id]: [...(r[id] ?? []), { id: `vous-r-${compteur.current++}`, auteur: VOUS, ilYa: 0, texte }] }));
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

  const nouveaux = MEMBRES.filter((m) => m.depuis === "2026-10");

  return (
    <div className="v2-page rf">
      <h1 className="v2-sr">Fil du réseau</h1>
      <div className="rf-colonnes">
        <div className="rf-flux">
          {/* la barre des filtres : le type en onglets, l'île et le secteur en menus */}
          <div className="rf-outils">
            <div className="rf-types" role="group" aria-label="Type de publication">
              <button type="button" aria-pressed={!type} onClick={() => poser({ type: null })}>
                Tout <span className="rf-nb">{parLieu.length}</span>
              </button>
              <button type="button" aria-pressed={type === "demande"} onClick={() => poser({ type: "demandes" })}>
                Demandes <span className="rf-nb">{nb("demande")}</span>
              </button>
              <button type="button" aria-pressed={type === "alerte"} onClick={() => poser({ type: "alertes" })}>
                Alertes terrain <span className="rf-nb">{nb("alerte")}</span>
              </button>
            </div>
            <div className="rf-menus">
              <MenuDeroulant etiquette={`Île : ${ile ?? "toutes"}`} classe="v2-btn rf-menu" placement="bottom end" largeur={220} declencheur={<>{ile ?? "Toutes les îles"}<Chevron /></>}>
                <ItemMenu id="toutes" onAction={() => poser({ ile: null })} suffixe={ile ? null : <Coche />}>
                  Toutes les îles
                </ItemMenu>
                <SeparateurMenu />
                {ILES.map((i) => (
                  <ItemMenu key={i} id={i} onAction={() => poser({ ile: i.toLowerCase() })} suffixe={ile === i ? <Coche /> : null}>
                    {i}
                  </ItemMenu>
                ))}
              </MenuDeroulant>
              <MenuDeroulant etiquette={`Secteur : ${secteur ?? "tous"}`} classe="v2-btn rf-menu" placement="bottom end" largeur={280} declencheur={<><span className="rf-menu-texte">{secteur ?? "Tous les secteurs"}</span><Chevron /></>}>
                <ItemMenu id="tous" onAction={() => poser({ secteur: null })} suffixe={secteur ? null : <Coche />}>
                  Tous les secteurs
                </ItemMenu>
                <SeparateurMenu />
                <SectionMenu titre="Secteurs des membres">
                  {secteurs.map((s) => (
                    <ItemMenu key={s} id={s} onAction={() => poser({ secteur: s })} suffixe={secteur === s ? <Coche /> : null}>
                      {s}
                    </ItemMenu>
                  ))}
                </SectionMenu>
              </MenuDeroulant>
            </div>
          </div>

          <Composeur org={org} publier={publier} />

          {visibles.length ? (
            <ul className="rf-liste" aria-label="Publications">
              {visibles.map((p) => (
                <li key={p.id}>
                  <CartePublication p={p} org={org} aidee={aidees.has(p.id)} aider={() => aider(p)} epingler={() => epingler(p)} repondre={(t) => repondre(p.id, t)} />
                </li>
              ))}
            </ul>
          ) : (
            <Vide
              icone={<Network width={20} height={20} aria-hidden="true" />}
              titre="Rien pour ces filtres"
              action={
                filtre ? (
                  <button type="button" className="v2-btn" onClick={() => poser({ type: null, ile: null, secteur: null })}>
                    Effacer les filtres
                  </button>
                ) : null
              }
            >
              Aucune publication ne correspond à ce type, à cette île et à ce secteur.
            </Vide>
          )}
        </div>

        {/* le côté, sur un grand écran : le réseau en bref, et les derniers arrivés */}
        <aside className="rf-cote" aria-label="Le réseau en bref">
          <section className="v2-carte rf-encart">
            <h2 className="v2-h3">Le réseau</h2>
            <dl className="rf-chiffres">
              <div>
                <dt>Membres</dt>
                <dd>
                  <Link href={`${RACINE}/reseau/membres`}>{MEMBRES.length}</Link>
                </dd>
              </div>
              <div>
                <dt>Demandes ouvertes</dt>
                <dd>{toutes.filter((p) => p.type === "demande").length}</dd>
              </div>
              <div>
                <dt>Alertes terrain</dt>
                <dd>{toutes.filter((p) => p.type === "alerte").length}</dd>
              </div>
            </dl>
            <p className="rf-aide">Le fil est réservé aux entreprises clientes d&apos;Omega. Une demande, une alerte, une réponse : restez concret.</p>
          </section>
          <section className="v2-carte rf-encart">
            <h2 className="v2-h3">Arrivés en octobre</h2>
            <ul className="rf-nouveaux">
              {nouveaux.map((m) => (
                <li key={m.slug}>
                  <Pastille nom={m.nom} petite />
                  <span className="rf-nouveau-texte">
                    <Link href={ficheDe(m.slug)} className="rf-lien-nom">
                      {m.nom}
                    </Link>
                    <small>
                      {m.secteur} · {m.ile}
                    </small>
                  </span>
                </li>
              ))}
            </ul>
            <Link href={`${RACINE}/reseau/membres`} className="rf-lien-tout">
              Tous les membres
            </Link>
          </section>
        </aside>
      </div>
    </div>
  );
}

const Chevron = () => <ChevronDown width={12} height={12} aria-hidden="true" />;
const Coche = () => <Check width={14} height={14} aria-label="choisi" />;

/* la pastille d'une entreprise : ses initiales, sur le gris de l'espace */
function Pastille({ nom, petite, vous }: { nom: string; petite?: boolean; vous?: boolean }) {
  return (
    <span className="rf-pastille" data-petite={petite ? "" : undefined} data-vous={vous ? "" : undefined} aria-hidden="true">
      {initiales(nom)}
    </span>
  );
}

/* le nom de l'auteur : un membre mène à sa fiche ; « vous », c'est l'organisation connectée */
function NomAuteur({ auteur, org }: { auteur: Auteur; org: string }) {
  if (auteur === VOUS)
    return (
      <>
        <span className="rf-nom">{org}</span>
        <Badge teinte="bleu">Vous</Badge>
      </>
    );
  const m = membreDe(auteur);
  if (!m) return <span className="rf-nom">Membre du réseau</span>;
  return (
    <Link href={ficheDe(m.slug)} className="rf-nom rf-lien-nom">
      {m.nom}
    </Link>
  );
}

/* les badges qu'un membre a accepté de montrer, prouvés par ses données */
function BadgesMembre({ slug }: { slug: Auteur }) {
  const b = membreDe(slug)?.badges;
  if (!b) return null;
  return (
    <>
      {b.bonPayeur ? (
        <Badge teinte="vert" title={`Paie ses fournisseurs en ${b.bonPayeur.delaiJours} jours en moyenne, sur 12 mois`}>
          Bon payeur
        </Badge>
      ) : null}
      {b.reponseRapide ? (
        <Badge title={`Première réponse en ${b.reponseRapide.delaiMinutes} min (médiane)`}>
          Répond vite
        </Badge>
      ) : null}
    </>
  );
}

const ICONE_ALERTE = { port: Ship, coupure: Zap, meteo: CloudRain };

function CartePublication({ p, org, aidee, aider, epingler, repondre }: { p: Publication; org: string; aidee: boolean; aider: () => void; epingler: () => void; repondre: (texte: string) => void }) {
  const idTitre = useId();
  const idReponses = useId();
  const [toutes, setToutes] = useState(false);
  const [ecrire, setEcrire] = useState(false);
  const m = p.auteur === VOUS ? null : membreDe(p.auteur);
  const nomAuteur = m?.nom ?? org;
  const aident = p.aident.length + (aidee ? 1 : 0);
  const IconeAlerte = p.genre ? ICONE_ALERTE[p.genre] : null;
  const epinglee = p.type === "alerte" && p.epinglee;
  const caches = toutes ? 0 : Math.max(0, p.reponses.length - 2);
  const montrees = p.reponses.slice(caches);

  return (
    <article className="v2-carte rf-pub" aria-labelledby={idTitre} data-type={p.type}>
      {epinglee ? (
        <p className="rf-epinglee">
          <Pin {...I} /> Alerte épinglée
        </p>
      ) : null}
      <div className="rf-pub-haut">
        <h2 id={idTitre} className="rf-pub-titre">
          {IconeAlerte ? <IconeAlerte width={16} height={16} strokeWidth={1.8} aria-hidden="true" className="rf-pub-icone" /> : null}
          {p.titre}
        </h2>
        <Badge teinte={p.type === "alerte" ? "ambre" : "bleu"}>{p.type === "alerte" ? "Alerte terrain" : "Demande"}</Badge>
      </div>

      <div className="rf-auteur">
        <Pastille nom={nomAuteur} vous={!m} />
        <div className="rf-auteur-texte">
          <div className="rf-auteur-ligne">
            <NomAuteur auteur={p.auteur} org={org} />
            {m ? <BadgesMembre slug={m.slug} /> : null}
            <span className="rf-quand">{ilYa(p.ilYa)}</span>
          </div>
          <p className="rf-auteur-sous">{m ? `${m.secteur} · ${m.commune}, ${m.ile}` : `Publié au nom de ${org} · ${p.ile}`}</p>
        </div>
      </div>

      <p className="rf-pub-texte">{p.texte}</p>
      {p.lieu || p.quand ? (
        <ul className="rf-meta" aria-label="Précisions">
          {p.lieu ? <li>Où : {p.lieu}</li> : null}
          {p.quand ? <li>Quand : {p.quand}</li> : null}
        </ul>
      ) : null}

      {/* le résumé, comme la ligne des réactions de la référence */}
      {aident || p.reponses.length ? (
        <div className="rf-resume">
          <span>{p.type === "demande" && aident ? `${aident} ${aident > 1 ? "peuvent" : "peut"} aider${aidee ? ", dont vous" : ""}` : null}</span>
          {p.reponses.length ? (
            <span>
              {p.reponses.length} réponse{p.reponses.length > 1 ? "s" : ""}
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="rf-actions">
        {p.type === "demande" && m ? (
          <button type="button" className="v2-btn v2-btn--fantome rf-action" aria-pressed={aidee} onClick={aider}>
            <HandHelping {...I} />
            {aidee ? "Vous pouvez aider" : "Je peux aider"}
          </button>
        ) : null}
        {p.type === "alerte" ? (
          <button type="button" className="v2-btn v2-btn--fantome rf-action" aria-pressed={!!epinglee} onClick={epingler}>
            {epinglee ? <PinOff {...I} /> : <Pin {...I} />}
            {epinglee ? "Désépingler" : "Épingler"}
          </button>
        ) : null}
        <button type="button" className="v2-btn v2-btn--fantome rf-action" aria-expanded={ecrire} aria-controls={idReponses} onClick={() => setEcrire((v) => !v)}>
          <MessageCircle {...I} />
          Répondre
        </button>
      </div>

      {montrees.length || ecrire ? (
        <div className="rf-reponses" id={idReponses}>
          {caches ? (
            <button type="button" className="rf-voir" onClick={() => setToutes(true)}>
              Voir {caches > 1 ? `les ${caches} réponses précédentes` : "la réponse précédente"}
            </button>
          ) : null}
          {montrees.length ? (
            <ul className="rf-reponses-liste" aria-label={`Réponses à « ${p.titre} »`}>
              {montrees.map((r) => {
                const rm = r.auteur === VOUS ? null : membreDe(r.auteur);
                return (
                  <li key={r.id} className="rf-reponse">
                    <Pastille nom={rm?.nom ?? org} petite vous={!rm} />
                    <div className="rf-reponse-corps">
                      <div className="rf-auteur-ligne">
                        <NomAuteur auteur={r.auteur} org={org} />
                        <span className="rf-quand">{ilYa(r.ilYa)}</span>
                      </div>
                      <p>{r.texte}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : null}
          {ecrire ? <SaisieReponse org={org} envoyer={repondre} /> : null}
        </div>
      ) : null}
    </article>
  );
}

function SaisieReponse({ org, envoyer }: { org: string; envoyer: (texte: string) => void }) {
  const [texte, setTexte] = useState("");
  const valider = (e: React.FormEvent) => {
    e.preventDefault();
    if (!texte.trim()) return;
    envoyer(texte.trim());
    setTexte("");
  };
  return (
    <form className="rf-saisie" onSubmit={valider}>
      <Pastille nom={org} petite vous />
      <label className="v2-champ rf-saisie-champ">
        <span className="v2-sr">Votre réponse</span>
        <input autoFocus value={texte} onChange={(e) => setTexte(e.target.value)} placeholder={`Répondre au nom de ${org}…`} />
      </label>
      <button type="submit" className="v2-btn v2-btn--primaire v2-btn--icone" aria-label="Envoyer la réponse" disabled={!texte.trim()}>
        <Send {...I} />
      </button>
    </form>
  );
}

/* le composeur : une ligne « Publier… » qui se déplie, comme « Start a post » */
function Composeur({ org, publier }: { org: string; publier: (p: Omit<Publication, "id" | "auteur" | "ilYa" | "aident" | "reponses">) => void }) {
  const [ouvert, setOuvert] = useState(false);
  const [type, setType] = useState<TypePublication>("demande");
  const [titre, setTitre] = useState("");
  const [texte, setTexte] = useState("");
  const [ile, setIle] = useState<Ile>("Guadeloupe");
  const [precision, setPrecision] = useState("");
  const id = useId();

  const fermer = () => {
    setOuvert(false);
    setTitre("");
    setTexte("");
    setPrecision("");
  };
  const valider = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titre.trim()) return;
    publier({ type, titre: titre.trim(), texte: texte.trim(), ile, ...(type === "alerte" ? { lieu: precision.trim() || undefined } : { quand: precision.trim() || undefined }) });
    fermer();
  };

  if (!ouvert)
    return (
      <div className="v2-carte rf-composeur">
        <Pastille nom={org} vous />
        <button type="button" className="rf-composeur-ouvrir" onClick={() => setOuvert(true)}>
          Une demande ou une alerte pour le réseau ?
        </button>
      </div>
    );

  return (
    <form className="v2-carte rf-composeur rf-composeur--ouvert" onSubmit={valider} aria-label="Nouvelle publication">
      <div className="rf-composeur-tete">
        <Pastille nom={org} vous />
        <div className="rf-types rf-types--petit" role="radiogroup" aria-label="Type de publication">
          <button type="button" role="radio" aria-checked={type === "demande"} onClick={() => setType("demande")}>
            Demande
          </button>
          <button type="button" role="radio" aria-checked={type === "alerte"} onClick={() => setType("alerte")}>
            Alerte terrain
          </button>
        </div>
      </div>
      <label className="v2-champ">
        <span className="v2-sr">Titre</span>
        <input autoFocus value={titre} onChange={(e) => setTitre(e.target.value)} placeholder={type === "alerte" ? "Ce qui se passe : retard, coupure, météo…" : "Ce que vous cherchez ou proposez"} />
      </label>
      <label className="v2-champ rf-zone">
        <span className="v2-sr">Détails</span>
        <textarea value={texte} onChange={(e) => setTexte(e.target.value)} rows={3} placeholder="Les détails utiles : quantités, délais, conditions…" />
      </label>
      <div className="rf-composeur-ligne">
        <label className="v2-champ rf-composeur-ile">
          <span className="v2-sr">Île</span>
          <select value={ile} onChange={(e) => setIle(e.target.value as Ile)}>
            {ILES.map((i) => (
              <option key={i}>{i}</option>
            ))}
          </select>
        </label>
        <label className="v2-champ rf-composeur-precision" htmlFor={`${id}-p`}>
          <span className="v2-sr">{type === "alerte" ? "Lieu" : "Pour quand"}</span>
          <input id={`${id}-p`} value={precision} onChange={(e) => setPrecision(e.target.value)} placeholder={type === "alerte" ? "Où (facultatif)" : "Pour quand (facultatif)"} />
        </label>
      </div>
      <div className="rf-composeur-pied">
        <span className="rf-aide">Publié au nom de {org}, visible des membres du réseau.</span>
        <span className="rf-composeur-boutons">
          <button type="button" className="v2-btn v2-btn--fantome" onClick={fermer}>
            Annuler
          </button>
          <button type="submit" className="v2-btn v2-btn--primaire" disabled={!titre.trim()}>
            Publier
          </button>
        </span>
      </div>
    </form>
  );
}
