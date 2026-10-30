"use client";

/* ══════════════════════════════════════════════════════════════════════
   REPUT — « Urgences et escalade » sur la liste des workflows de Plain
   (28/10/2026, 2e vague)

   Les règles d'escalade jouent le rôle des workflows : une ligne par
   motif qui sort une demande de la file ordinaire (urgence, client en
   litige, réclamation, demande de parler à une personne, demande que le
   système n'a pas pu traiter seul), plus la règle d'astreinte validée par
   Teo le 19/10/2026 (« jamais hors horaires », donc désactivée). Chaque
   règle porte le délai de son sujet (reput_sujets.delai_heures) et tient
   les demandes qui lui reviennent en ce moment.
   Données et portes de la page d'avant (Urgences.tsx : mondeExemple /
   monClient + chargerMonde), et chaque geste y est passé :
     · les trois gravités (Urgences · Réclamations · À reprendre) → les onglets ;
     · ouvrir une demande → la carte de sa règle (?id=), qui liste ses
       demandes, leur délai, et « Ouvrir la demande » ;
     · « Toutes les demandes » → la tête ;
     · le pied (hors horaires, le délai de chaque sujet, un client en litige)
       → la fiche de chaque règle.
   ══════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ListFilter, MessageSquareText } from "lucide-react";
import { dateHeure, relatif } from "@/components/espace3/base/format";
import { useSource } from "@/components/espace3/base/source";
import { mondeExemple } from "@/components/espace3/base/reput/exemples";
import { chargerMonde, monClient } from "@/components/espace3/base/reput/portes";
import type { Demande, Monde } from "@/components/espace3/base/reput/types";
import { useMaintenant } from "../horloge";
import { RACINE } from "../modules";
import { Badge } from "../ui";
import { CarteCentrale, Feuille } from "../lin/CarteCentrale";
import { OptionPlain, useAdresse } from "../lin/ListeFils";
import { BoutonPrimaire, ListeRegles, poserTri, triDepuis, trierRegles, type Regle } from "../lin/ListeRegles";

const CHEMIN = `${RACINE}/reput/urgences`;
const HEURE = 3_600_000;
const FERMEES = new Set(["envoyee", "refusee", "ignoree"]);
const sansAccents = (x: string) => x.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? "s" : ""}`;

type Gravite = "urgent" | "attention" | "reprendre";
const GRAVITES: { cle: Gravite; libelle: string; teinte: "rouge" | "ambre" | "bleu"; unite: [string, string] }[] = [
  { cle: "urgent", libelle: "Urgences", teinte: "rouge", unite: ["urgence", "urgences"] },
  { cle: "attention", libelle: "Réclamations", teinte: "ambre", unite: ["réclamation", "réclamations"] },
  { cle: "reprendre", libelle: "À reprendre", teinte: "bleu", unite: ["demande", "demandes"] },
];

const duree = (ms: number) => {
  const h = Math.floor(ms / HEURE);
  if (h < 1) return `${Math.max(1, Math.round(ms / 60_000))} min`;
  if (h < 48) return `${h} h`;
  return `${Math.floor(h / 24)} j`;
};

/* une demande tenue par une règle */
type Point = { d: Demande; sujet: string; ecoule: number; delai: number | null; depasse: boolean };
/* une règle d'escalade */
type RegleEscalade = { id: string; nom: string; gravite: Gravite; declencheur: string; delaiCode: string | null; quoi: string; pourquoi: string; desactivee?: boolean; garde: (d: Demande) => boolean };

const urgente = (d: Demande) => !!d.urgence || d.sujet === "urgence";
const REGLES: RegleEscalade[] = [
  {
    id: "urgence",
    nom: "Urgence",
    gravite: "urgent",
    declencheur: "Urgence signalée",
    delaiCode: "urgence",
    quoi: "Une urgence passe en tête de file et porte le délai du sujet « Urgence ».",
    pourquoi: "Chaque sujet porte le délai que vous avez fixé : une heure pour une urgence. Le client reçoit tout de suite une réponse honnête, et l'urgence passe en tête à l'ouverture.",
    garde: (d) => !!d.urgence || d.sujet === "urgence",
  },
  {
    id: "litige",
    nom: "Client en litige",
    gravite: "urgent",
    declencheur: "Client en litige",
    delaiCode: null,
    quoi: "Un client en litige ne reçoit aucune réponse automatique.",
    pourquoi: "Il ne reçoit aucune réponse automatique : la demande revient toujours à une personne.",
    garde: (d) => !!d.litige && !urgente(d),
  },
  {
    id: "reclamation",
    nom: "Réclamation",
    gravite: "attention",
    declencheur: "Sujet « Réclamation »",
    delaiCode: "reclamation",
    quoi: "Une réclamation sort de la file ordinaire et porte le délai de son sujet.",
    pourquoi: "Chaque sujet porte le délai que vous avez fixé : quatre heures pour une réclamation.",
    garde: (d) => d.sujet === "reclamation" && !d.litige && !urgente(d),
  },
  {
    id: "humain",
    nom: "Veut parler à une personne",
    gravite: "attention",
    declencheur: "Demande une personne",
    delaiCode: "humain",
    quoi: "Quelqu'un demande une personne : la demande lui revient, dans le délai du sujet.",
    pourquoi: "Personne ne se voit répondre par le système quand il a demandé une personne.",
    garde: (d) => d.sujet === "humain" && !d.litige && !urgente(d),
  },
  {
    id: "a-traiter",
    nom: "À traiter vous-même",
    gravite: "reprendre",
    declencheur: "Non traitée seule",
    delaiCode: null,
    quoi: "Une demande à traiter ou bloquée revient à une personne.",
    pourquoi: "Le système a traité seul les autres demandes ; celle-ci attend votre réponse.",
    garde: (d) => (d.statut === "a_traiter" || d.statut === "bloquee") && !d.litige && !urgente(d) && d.sujet !== "reclamation" && d.sujet !== "humain",
  },
  {
    id: "hors-horaires",
    nom: "Astreinte hors horaires",
    gravite: "urgent",
    declencheur: "Urgence hors horaires",
    delaiCode: null,
    quoi: "Par défaut, jamais hors horaires : personne n'est appelé la nuit.",
    pourquoi:
      "Personne n'est réveillé sans l'avoir choisi. Le client reçoit tout de suite une réponse honnête avec vos horaires écrits, et son urgence passe en tête à l'ouverture. Rien ici ne prétend qu'un appel part : il ne part pas.",
    desactivee: true,
    garde: () => false,
  },
];

export default function ReglesUrgences() {
  const { source } = useSource();
  const maintenant = useMaintenant();
  const routeur = useRouter();
  const params = useSearchParams();
  const adresse = useAdresse(CHEMIN, params);
  const [exemple] = useState<Monde>(() => mondeExemple());
  const [reel, setReel] = useState<Monde | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [recherche, setRecherche] = useState("");

  useEffect(() => {
    if (source !== "reelle") return;
    let actif = true;
    const t = window.setTimeout(async () => {
      setErreur(null);
      setReel(null);
      try {
        const client = await monClient();
        if (!client) throw new Error("Aucun compte rattaché à cette session.");
        const m = await chargerMonde(client);
        if (actif) setReel(m);
      } catch (e) {
        if (actif) {
          setErreur(e instanceof Error ? e.message : "La base n'a pas répondu.");
          setReel({ reglages: null, avis: [], indicateurs: {} as Monde["indicateurs"], demandes: [], receptions: {}, reponses: [], fiches: [], sujets: [], accords: {} as Monde["accords"] });
        }
      }
    }, 0);
    return () => {
      actif = false;
      window.clearTimeout(t);
    };
  }, [source]);
  const monde = source === "exemple" ? (maintenant === null ? null : exemple) : reel;

  /* ——— l'adresse : onglet, « délai dépassé », tri, règle ouverte ——— */
  const onglet = (GRAVITES.find((g) => g.cle === params.get("onglet"))?.cle ?? "tous") as Gravite | "tous";
  const depasseSeul = params.get("depasse") === "1";
  const tri = triDepuis(params);
  const id = params.get("id");
  const aller = (href: string) => routeur.replace(href, { scroll: false });
  const lienId = (x: string | null) => adresse((p) => (x !== null ? p.set("id", x) : p.delete("id")));

  /* ——— les demandes de chaque règle ——— */
  const points = useMemo(() => {
    const parRegle = new Map<string, Point[]>();
    if (!monde || maintenant === null) return parRegle;
    const delai = (code: string | null) => monde.sujets.find((s) => s.code === code)?.delai_heures ?? null;
    for (const r of REGLES) {
      const liste = monde.demandes
        .filter((d) => !FERMEES.has(d.statut) && r.garde(d))
        .map<Point>((d) => {
          const ecoule = maintenant - new Date(d.recu_le).getTime();
          const h = delai(r.delaiCode ?? d.sujet);
          return { d, sujet: monde.sujets.find((s) => s.code === d.sujet)?.libelle ?? "Sans sujet", ecoule, delai: h, depasse: h !== null && ecoule > h * HEURE };
        })
        .sort((a, b) => Number(b.depasse) - Number(a.depasse) || b.ecoule - a.ecoule);
      parRegle.set(r.id, liste);
    }
    return parRegle;
  }, [monde, maintenant]);
  const delaiDe = (r: RegleEscalade) => (r.delaiCode ? (monde?.sujets.find((s) => s.code === r.delaiCode)?.delai_heures ?? null) : null);
  const dateMaintenant = maintenant === null ? new Date() : new Date(maintenant);
  const q = sansAccents(recherche.trim());

  const visibles = REGLES.filter(
    (r) => (onglet === "tous" || r.gravite === onglet) && (!depasseSeul || (points.get(r.id) ?? []).some((p) => p.depasse)) && (!q || sansAccents(`${r.nom} ${r.declencheur} ${r.quoi}`).includes(q)),
  );
  const regles: Regle[] = visibles.map((r) => {
    const liste = points.get(r.id) ?? [];
    const dernier = liste.map((p) => p.d.recu_le).sort((a, b) => b.localeCompare(a))[0] ?? null;
    const depasses = liste.filter((p) => p.depasse).length;
    const h = delaiDe(r);
    const grav = GRAVITES.find((g) => g.cle === r.gravite)!;
    return {
      id: r.id,
      href: lienId(r.id),
      ordre: REGLES.indexOf(r) + 1,
      nom: r.nom,
      etat: r.desactivee
        ? { libelle: "Jamais hors horaires", cle: "desactivee" }
        : depasses
          ? { libelle: `${pluriel(depasses, "délai")} dépassé${depasses > 1 ? "s" : ""}`, teinte: "orange" }
          : liste.length
            ? { libelle: pluriel(liste.length, "demande") }
            : null,
      declencheur: r.declencheur,
      creee: { nom: "REPUT", lettre: "R", couleur: "#26b5ce" },
      modifiee: r.desactivee
        ? { nom: "Teo", lettre: "T", couleur: "#f2994a", quand: "19 oct." }
        : h !== null
          ? { nom: "Vous", lettre: "V", couleur: "#f2994a", quand: `délai ${h} h` }
          : { nom: "REPUT", lettre: "R", couleur: "#26b5ce" },
      dernier: dernier ? { texte: relatif(dernier, dateMaintenant), iso: dernier, urgence: depasses > 0 } : null,
      options: [
        { cle: "ouvrir", libelle: "Ouvrir la règle", icone: <ListFilter width={18} height={18} />, href: lienId(r.id) },
        {
          cle: "seule",
          libelle: `Seulement « ${grav.libelle} »`,
          icone: <ListFilter width={18} height={18} />,
          href: adresse((p) => {
            if (onglet === r.gravite) p.delete("onglet");
            else p.set("onglet", r.gravite);
            p.delete("id");
          }),
        },
        { cle: "demandes", libelle: "Toutes les demandes", icone: <MessageSquareText width={18} height={18} />, href: `${RACINE}/reput` },
      ],
    };
  });
  const triees = trierRegles(regles, tri);
  const compte = (g: Gravite) => REGLES.filter((r) => r.gravite === g).reduce((n, r) => n + (points.get(r.id)?.length ?? 0), 0);

  /* ——— la règle ouverte ——— */
  const choisie = id ? (REGLES.find((r) => r.id === id) ?? null) : null;
  const rang = choisie ? triees.findIndex((r) => r.id === choisie.id) : -1;
  const gravChoisie = choisie ? GRAVITES.find((g) => g.cle === choisie.gravite)! : null;
  const pointsChoisis = choisie ? (points.get(choisie.id) ?? []) : [];
  const hChoisi = choisie ? delaiDe(choisie) : null;

  return (
    <ListeRegles
      titre="Urgences et escalade"
      principal={
        <BoutonPrimaire href={`${RACINE}/reput`} icone={<MessageSquareText width={18} height={18} aria-hidden="true" />}>
          Toutes les demandes
        </BoutonPrimaire>
      }
      onglets={[
        ...GRAVITES.map((g) => ({
          cle: g.cle,
          libelle: g.libelle,
          n: monde ? compte(g.cle) : undefined,
          href: adresse((p) => {
            p.set("onglet", g.cle);
            p.delete("id");
          }),
        })),
        {
          cle: "tous",
          libelle: "Toutes",
          href: adresse((p) => {
            p.delete("onglet");
            p.delete("id");
          }),
        },
      ]}
      ongletActif={onglet}
      recherche={{ valeur: recherche, onChange: setRecherche, placeholder: "Chercher une règle", libelle: "Chercher une règle" }}
      nFiltres={depasseSeul ? 1 : 0}
      filtres={(fermer) => (
        <div className="pf-menu-groupe" role="group" aria-label="Délai">
          <p className="pf-menu-titre">Délai</p>
          <OptionPlain
            n={REGLES.filter((r) => (points.get(r.id) ?? []).some((p) => p.depasse)).length}
            actif={depasseSeul}
            onClick={() => {
              fermer();
              aller(adresse((p) => (depasseSeul ? p.delete("depasse") : p.set("depasse", "1"))));
            }}
          >
            Délai dépassé
          </OptionPlain>
        </div>
      )}
      note={erreur ? `La base réelle n'a pas répondu. ${erreur}` : null}
      regles={triees}
      tri={tri}
      lienTri={(cle) => adresse((p) => poserTri(p, tri, cle))}
      colonnes={{ creee: "Posée", modifiee: "Délai fixé par", dernier: "Dernière demande" }}
      idOuvert={id}
      chargement={!monde}
      vide={
        recherche || depasseSeul
          ? { titre: "Aucune règle ne correspond", texte: "Essayez un autre mot ou retirez le filtre." }
          : onglet === "urgent"
            ? { titre: "Aucune urgence", texte: "Aucune urgence ni client en litige n'attend de réponse." }
            : onglet === "attention"
              ? { titre: "Aucune réclamation", texte: "Aucune réclamation ni demande de parler à une personne." }
              : { titre: "Rien à reprendre", texte: "Le système a traité seul toutes les autres demandes." }
      }
    >
      <CarteCentrale
        ouverte={id !== null && !!monde}
        fermer={() => aller(lienId(null))}
        libelle={choisie ? `Règle ${choisie.nom}` : "Règle introuvable"}
        sur="REPUT · Règle d'escalade"
        statut={choisie ? <>{choisie.desactivee ? "Désactivée" : gravChoisie!.libelle}</> : undefined}
        nav={
          choisie && rang >= 0
            ? {
                position: rang + 1,
                total: triees.length,
                precedente: rang > 0 ? () => aller(lienId(triees[rang - 1].id)) : undefined,
                suivante: rang < triees.length - 1 ? () => aller(lienId(triees[rang + 1].id)) : undefined,
              }
            : null
        }
        gauche={
          choisie ? (
            <Feuille
              titre="RÈGLE"
              sous={choisie.declencheur}
              nom={choisie.nom}
              sousNom={[choisie.desactivee ? "Désactivée : jamais hors horaires" : hChoisi !== null ? `Réponse attendue sous ${hChoisi} h` : "Toujours une personne"]}
              texte={choisie.quoi}
            />
          ) : (
            <Feuille titre="RÈGLE" sous={null} texte="Aucune règle." />
          )
        }
        piedGauche={
          choisie ? (
            <div className="v2-det-document-ligne">
              <span className="v2-det-mono">{choisie.id}</span>
              <span className="v2-det-sous">{pluriel(pointsChoisis.length, "demande")} en ce moment</span>
            </div>
          ) : undefined
        }
        titre={choisie ? choisie.nom : "Règle introuvable"}
        chiffre={choisie && !choisie.desactivee ? `${pointsChoisis.length} ${pointsChoisis.length > 1 ? gravChoisie!.unite[1] : gravChoisie!.unite[0]}` : undefined}
        echeance={
          choisie && pointsChoisis.length
            ? {
                texte: pointsChoisis.some((p) => p.depasse)
                  ? `${pluriel(pointsChoisis.filter((p) => p.depasse).length, "délai")} dépassé${pointsChoisis.filter((p) => p.depasse).length > 1 ? "s" : ""}`
                  : hChoisi !== null
                    ? `Dans le délai de ${hChoisi} h`
                    : "Dans le délai",
                urgence: pointsChoisis.some((p) => p.depasse) ? "retard" : undefined,
              }
            : null
        }
        actions={
          choisie ? (
            <Link href={`${RACINE}/reput`} className="v2-btn v2-btn--primaire">
              <MessageSquareText width={14} height={14} aria-hidden="true" /> Toutes les demandes
            </Link>
          ) : undefined
        }
      >
        {choisie ? (
          <>
            <dl className="v2-det-fiche">
              <dt>Déclencheur</dt>
              <dd>{choisie.declencheur}</dd>
              <dt>Gravité</dt>
              <dd>
                <Badge teinte={gravChoisie!.teinte}>{gravChoisie!.libelle}</Badge>
              </dd>
              <dt>Délai</dt>
              <dd>
                {choisie.desactivee
                  ? "Aucun appel : l'urgence passe en tête à l'ouverture"
                  : hChoisi !== null
                    ? `Réponse attendue sous ${hChoisi} h (reput_sujets)`
                    : "Aucun délai fixé : la demande revient toujours à une personne"}
              </dd>
              <dt>État</dt>
              <dd>{choisie.desactivee ? "Désactivée · validée par Teo le 19/10/2026 pour un artisan seul" : "Active"}</dd>
            </dl>
            <div className="v2-det-bloc">
              <h3 className="v2-det-section-titre">Pourquoi</h3>
              <p>{choisie.pourquoi}</p>
            </div>
            {!choisie.desactivee ? (
              <div className="v2-det-bloc">
                <h3 className="v2-det-section-titre">
                  En ce moment
                  <small>{pointsChoisis.length}</small>
                </h3>
                {pointsChoisis.length ? (
                  <ul className="pw-det-liste">
                    {pointsChoisis.map((p) => (
                      <li key={p.d.id}>
                        <span>
                          <strong>{p.d.de_nom ?? p.d.adresse_reponse ?? "Expéditeur inconnu"}</strong>
                          <small>
                            {p.d.objet ?? p.sujet}
                            {p.d.motif ? ` · ${p.d.motif}` : ""} · reçue {dateHeure(p.d.recu_le)} · il y a {duree(p.ecoule)}
                            {p.delai !== null ? (p.depasse ? ` · délai de ${p.delai} h dépassé` : ` · dans les ${p.delai} h`) : ""}
                          </small>
                          <Badge teinte={p.depasse ? "rouge" : "vert"}>{p.depasse ? "Délai dépassé" : "Dans le délai"}</Badge>
                        </span>
                        <Link href={`${RACINE}/reput?demande=${encodeURIComponent(p.d.id)}`}>Ouvrir la demande</Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="v2-det-vide">Aucune demande en ce moment.</p>
                )}
              </div>
            ) : null}
          </>
        ) : (
          <p className="v2-det-vide">Cette règle n&apos;existe pas.</p>
        )}
      </CarteCentrale>
    </ListeRegles>
  );
}
