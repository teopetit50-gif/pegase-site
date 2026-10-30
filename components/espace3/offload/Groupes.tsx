"use client";

/* ══════════════════════════════════════════════════════════════════════
   OFFLOAD « Groupes clients », sur les pages « Tenants » de Plain
   (28/10/2026, demande de Teo : « reproduis-les à l'identique »).
   Briques : ../lin/FicheClient.tsx (relevé : scratchpad/plain-clients).

     · la liste : un groupe par ligne (entités, chiffre sur 12 mois, pire
       niveau, reprises, échéances, affaires en plan) ; les rattachements
       proposés (même domaine de courriel) sont des lignes « À rattacher » ;
       la recherche, « Filtres » (?filtre=), « Affichage V » (?tri=) ;
     · une ligne ouvre la fiche en pleine page (?id=, même route) : l'onglet
       Entités (chaque entité ouvre sa fiche sur la page Comptes à risque,
       comme avant : /espace3/offload?compte=), le volet Détails. Sur une
       proposition, le volet porte le geste d'avant : la raison sociale mère
       à saisir et « Rattacher » (offload_rattacher_groupe en base réelle ;
       l'exemple ne retient rien, comme avant).

   Mêmes données que la carte d'avant (components/espace/offload/Groupes.tsx) :
   l'exemple, ou public.offload_groupes().
   ══════════════════════════════════════════════════════════════════════ */

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Building2, Copy, ExternalLink, Layers, Link2, ShieldCheck } from "lucide-react";
import { useSource } from "@/components/espace3/base/source";
import { dateCourte, montant, nombreFr } from "@/components/espace3/base/format";
import { NIVEAUX } from "@/components/espace3/base/offload/etats";
import { chargerGroupes, rattacherGroupe } from "@/components/espace3/base/offload/portes";
import type { Groupe, Groupes as Donnees } from "@/components/espace3/base/offload/types";
import { useToast } from "../Toasts";
import { useEpingles } from "../lin/Lin";
import {
  BoutonAffichage,
  BoutonFiltres,
  DetailsLigne,
  DetailsPied,
  DetailsSection,
  FicheClient,
  IcBatiment,
  IcCercle,
  ListeClients,
  ListeItems,
  initiale,
  useEpingle,
  type ColonnePc,
  type LignePc,
  type OptionPc,
} from "../lin/FicheClient";
import { RACINE } from "../modules";

const CHEMIN = `${RACINE}/offload/groupes`;
const C = (n: number) => `00000000-0000-4000-8c40-${String(n).padStart(12, "0")}`;
const sansAccents = (x: string) => x.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? "s" : ""}`;
type Teinte = "rouge" | "jaune" | "vert" | "bleu" | undefined;
const teinteNiveau = (n: string | null): Teinte => {
  const t = n ? NIVEAUX[n as keyof typeof NIVEAUX]?.teinte : undefined;
  return t === "rouge" ? "rouge" : t === "ambre" ? "jaune" : t === "vert" ? "vert" : t === "bleu" ? "bleu" : undefined;
};
const libelleNiveau = (n: string | null) => (n ? (NIVEAUX[n as keyof typeof NIVEAUX]?.libelle ?? n) : "Pas encore évalué");

/* l'exemple de la carte d'avant (components/espace3/base/offload/Groupes.tsx), le même */
const EXEMPLE: Donnees = {
  groupes: [
    {
      nom: "Groupe hôtelier Alizés",
      nb: 2,
      ca_12m: 72100,
      valeur_annuelle: 81100,
      dernier_achat: null,
      pire_niveau: "decroche",
      reprises_en_cours: 1,
      echeances: 0,
      affaires_valeur: 5480,
      comptes: [
        { id: C(1), nom: "Hôtel Les Flamboyants", ref: "IMP-01184", niveau: "decroche", ca_12m: 40700, statut: "suivi", verification: null },
        { id: "x", nom: "Résidence Alizés Sainte-Anne", ref: "IMP-01192", niveau: "ok", ca_12m: 31400, statut: "suivi", verification: null },
      ],
    },
  ],
  a_rattacher: [
    {
      domaine: "caraibes-evenements.exemple",
      comptes: [
        { id: C(3), nom: "Caraïbes Événements", groupe: null },
        { id: "y", nom: "Caraïbes Événements Martinique", groupe: null },
      ],
    },
  ],
};

/* une ligne de la liste : un groupe, ou une proposition de rattachement */
type Ligne = {
  id: string;
  nom: string;
  proposition: boolean;
  groupe: Groupe | null;
  domaine: string | null;
  comptes: { id: string; nom: string; ref?: string; niveau?: string | null; ca_12m?: number | null; statut?: string; groupe?: string | null; verification?: string | null }[];
};
const lignesDe = (d: Donnees): Ligne[] => [
  ...d.groupes.map((g) => ({ id: g.nom, nom: g.nom, proposition: false, groupe: g, domaine: null, comptes: g.comptes })),
  ...d.a_rattacher.map((x) => ({ id: `@${x.domaine}`, nom: `@${x.domaine}`, proposition: true, groupe: null, domaine: x.domaine, comptes: x.comptes })),
];

const FILTRES: { cle: string; libelle: string; garde: (l: Ligne) => boolean; section?: boolean }[] = [
  { cle: "a_rattacher", libelle: "À rattacher (même domaine de courriel)", garde: (l) => l.proposition },
  { cle: "rattaches", libelle: "Groupes rattachés", garde: (l) => !l.proposition },
  ...(["eteint", "decroche", "saison", "ralentit", "ok"] as const).map((n, i) => ({ cle: n, libelle: `Pire niveau : ${NIVEAUX[n].libelle}`, garde: (l: Ligne) => l.groupe?.pire_niveau === n, section: i === 0 })),
];
const TRIS: { cle: string; libelle: string; ordre: (a: Ligne, b: Ligne) => number }[] = [
  { cle: "ca", libelle: "Chiffre sur 12 mois", ordre: (a, b) => (b.groupe?.ca_12m ?? -1) - (a.groupe?.ca_12m ?? -1) || a.nom.localeCompare(b.nom, "fr") },
  { cle: "entites", libelle: "Entités", ordre: (a, b) => b.comptes.length - a.comptes.length || a.nom.localeCompare(b.nom, "fr") },
  { cle: "nom", libelle: "Nom", ordre: (a, b) => a.nom.localeCompare(b.nom, "fr") },
];

function useGroupes() {
  const { source } = useSource();
  const [reel, setReel] = useState<Donnees | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const charger = useCallback(async () => {
    try {
      setErreur(null);
      setReel(await chargerGroupes());
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base n'a pas répondu.");
      setReel({ groupes: [], a_rattacher: [] });
    }
  }, []);
  useEffect(() => {
    if (source !== "reelle") return;
    const t = window.setTimeout(() => void charger(), 0);
    return () => window.clearTimeout(t);
  }, [source, charger]);
  return { source, donnees: source === "exemple" ? EXEMPLE : reel, erreur: source === "exemple" ? null : erreur, recharger: charger };
}

export function PageGroupes() {
  const params = useSearchParams();
  const g = useGroupes();
  const id = params.get("id");
  if (id) return <FicheGroupe id={id} {...g} filtre={params.get("filtre")} />;
  return <Liste {...g} filtre={params.get("filtre")} tri={params.get("tri")} />;
}

/* ——— la liste ——— */
function Liste({ donnees, erreur, filtre, tri }: { donnees: Donnees | null; erreur: string | null; filtre: string | null; tri: string | null }) {
  const routeur = useRouter();
  const [q, setQ] = useState("");
  const [epingle, basculerEpingle] = useEpingle("offload-groupes");
  const aller = (f: string | null, t: string | null) => {
    const p = new URLSearchParams();
    if (f) p.set("filtre", f);
    if (t) p.set("tri", t);
    routeur.replace(p.size ? `${CHEMIN}?${p}` : CHEMIN, { scroll: false });
  };
  const filtreActif = FILTRES.find((f) => f.cle === filtre) ?? null;
  const triActif = TRIS.find((t) => t.cle === tri) ?? TRIS[0];
  const base = useMemo(() => (donnees ? lignesDe(donnees) : []), [donnees]);
  const visibles = useMemo(() => {
    const r = sansAccents(q.trim());
    return base.filter((l) => (!filtreActif || filtreActif.garde(l)) && (!r || sansAccents(l.nom).includes(r) || l.comptes.some((c) => sansAccents(c.nom).includes(r)))).sort(triActif.ordre);
  }, [base, q, filtreActif, triActif]);

  const optionsFiltres: OptionPc[] = [
    ...FILTRES.map((f) => ({
      cle: f.cle,
      libelle: f.libelle,
      meta: String(base.filter(f.garde).length),
      coche: filtreActif?.cle === f.cle,
      section: f.section,
      action: () => aller(filtreActif?.cle === f.cle ? null : f.cle, tri),
    })),
    ...(filtreActif ? [{ cle: "tous", libelle: "Tous les groupes", meta: String(base.length), section: true, action: () => aller(null, tri) }] : []),
  ];
  const optionsAffichage: OptionPc[] = TRIS.map((t) => ({ cle: t.cle, libelle: `Trier par ${t.libelle.toLowerCase()}`, coche: t.cle === triActif.cle, action: () => aller(filtre, t.cle === TRIS[0].cle ? null : t.cle) }));

  const colonnes: ColonnePc[] = [
    { cle: "groupe", libelle: "Groupe" },
    { cle: "entites", libelle: "Entités", icone: <Building2 width={14} height={14} aria-hidden="true" />, num: true, largeur: 100, triee: triActif.cle === "entites" },
    { cle: "ca", libelle: "CA 12 mois", num: true, largeur: 130, triee: triActif.cle === "ca" },
    { cle: "niveau", libelle: "Pire niveau", icone: <IcCercle taille={14} />, largeur: 170, repli: "secondaire" },
    { cle: "reprises", libelle: "Reprises", num: true, largeur: 100, repli: "tertiaire" },
    { cle: "echeances", libelle: "Échéances", num: true, largeur: 110, repli: "tertiaire" },
    { cle: "affaires", libelle: "En attente de retrait", num: true, largeur: 160, repli: "secondaire" },
    { cle: "etat", libelle: "Rattachement", icone: <Link2 width={14} height={14} aria-hidden="true" />, largeur: 170, repli: "tertiaire" },
  ];
  const lignes: LignePc[] = visibles.map((l) => ({
    id: l.id,
    href: `${CHEMIN}?id=${encodeURIComponent(l.id)}`,
    libelle: `Ouvrir ${l.nom}`,
    cellules: [
      <>
        <span className="pc-tuile">
          <IcBatiment taille={12} />
        </span>
        <span>
          {l.nom}
          {l.proposition ? (
            <small className="pc-gris" style={{ fontSize: 12, fontWeight: 400 }}>
              {" "}
              {l.comptes.map((c) => c.nom).join(", ")}
            </small>
          ) : null}
        </span>
      </>,
      <span key="n" className="pc-val pc-val--num pc-val--compte">
        {nombreFr(l.comptes.length)}
      </span>,
      l.groupe ? (
        <span key="ca" className="pc-val pc-val--num pc-fort">
          {montant(l.groupe.ca_12m)}
        </span>
      ) : (
        <span key="ca" className="pc-gris">
          —
        </span>
      ),
      l.groupe ? (
        <span key="niv" className="pc-val" data-teinte={teinteNiveau(l.groupe.pire_niveau)}>
          <IcCercle taille={14} />
          <span>{libelleNiveau(l.groupe.pire_niveau)}</span>
        </span>
      ) : (
        <span key="niv" className="pc-gris">
          —
        </span>
      ),
      l.groupe?.reprises_en_cours ? (
        <span key="r" className="pc-val pc-val--num">
          {nombreFr(l.groupe.reprises_en_cours)}
        </span>
      ) : (
        <span key="r" className="pc-gris">
          —
        </span>
      ),
      l.groupe?.echeances ? (
        <span key="e" className="pc-val pc-val--num">
          {nombreFr(l.groupe.echeances)}
        </span>
      ) : (
        <span key="e" className="pc-gris">
          —
        </span>
      ),
      l.groupe?.affaires_valeur ? (
        <span key="a" className="pc-val pc-val--num" data-teinte="jaune">
          {montant(l.groupe.affaires_valeur)}
        </span>
      ) : (
        <span key="a" className="pc-gris">
          —
        </span>
      ),
      <span key="s" className="pc-val" data-teinte={l.proposition ? "jaune" : "vert"}>
        <IcCercle taille={14} />
        <span>{l.proposition ? "À rattacher" : "Rattaché"}</span>
      </span>,
    ],
  }));

  return (
    <ListeClients
      icone={<IcBatiment />}
      titre="Groupes clients"
      etoile={{ actif: epingle, basculer: basculerEpingle }}
      filtres={optionsFiltres}
      affichage={optionsAffichage}
      recherche={{ valeur: q, changer: setQ, placeholder: "Rechercher un groupe ou une entité" }}
      tri={{ libelle: triActif.libelle, retirer: triActif.cle !== TRIS[0].cle ? () => aller(filtre, null) : undefined }}
      filtresActifs={filtreActif ? [{ cle: filtreActif.cle, libelle: filtreActif.libelle, retirer: () => aller(null, tri) }] : []}
      erreur={erreur}
      colonnes={colonnes}
      lignes={lignes}
      chargement={!donnees && !erreur}
      vide={
        q || filtreActif
          ? { titre: "Aucun groupe ne correspond", texte: "Élargissez la recherche ou retirez le filtre." }
          : { titre: "Aucun groupe", texte: "La colonne « groupe » de votre export, ou un rattachement depuis une fiche, regroupe les entités d'un même client." }
      }
    />
  );
}

/* ——— la fiche d'un groupe, ou d'une proposition de rattachement ——— */
function FicheGroupe({
  id,
  donnees,
  erreur,
  source,
  recharger,
  filtre,
}: {
  id: string;
  donnees: Donnees | null;
  erreur: string | null;
  source: "exemple" | "reelle";
  recharger: () => Promise<void>;
  filtre: string | null;
}) {
  const routeur = useRouter();
  const toast = useToast();
  const [epingles, basculerEpingle] = useEpingles("offload-groupes");
  const [q, setQ] = useState("");
  const [nomMere, setNomMere] = useState("");
  const [enCours, setEnCours] = useState(false);
  const l = useMemo(() => (donnees ? (lignesDe(donnees).find((x) => x.id === id) ?? null) : null), [donnees, id]);
  const introuvable = !!donnees && !l;
  const nom = l?.nom ?? (donnees ? "Groupe introuvable" : "Lecture…");
  const g = l?.groupe ?? null;
  const aller = (fl: string | null) => {
    const p = new URLSearchParams({ id });
    if (fl) p.set("filtre", fl);
    routeur.replace(`${CHEMIN}?${p}`, { scroll: false });
  };
  const copier = (texte: string, quoi: string) =>
    navigator.clipboard?.writeText(texte).then(
      () => toast(`${quoi} copié.`, "vert"),
      () => toast("Le presse-papiers a refusé.", "rouge"),
    );
  const lienCompte = (c: string) => `${RACINE}/offload?compte=${encodeURIComponent(c)}`;

  /* le geste d'avant : rattacher les comptes d'un même domaine sous une raison sociale mère */
  const rattacher = async () => {
    if (!l?.proposition || !nomMere.trim()) return;
    if (source !== "reelle") {
      toast("Exemple : rien n'est enregistré. En base réelle, les comptes passent sous la raison sociale mère, et c'est au journal.", "neutre");
      return;
    }
    setEnCours(true);
    try {
      await rattacherGroupe(
        l.comptes.map((c) => c.id),
        nomMere.trim(),
      );
      toast("Rattachement noté : le plafond de sollicitation vaut désormais pour le groupe.", "vert");
      await recharger();
      routeur.replace(`${CHEMIN}?id=${encodeURIComponent(nomMere.trim())}`, { scroll: false });
    } catch (e) {
      toast(e instanceof Error ? e.message : "La base a refusé.", "rouge");
    } finally {
      setEnCours(false);
    }
  };

  const r = sansAccents(q.trim());
  const comptes = (l?.comptes ?? []).filter((c) => (!filtre || c.niveau === filtre) && (!r || sansAccents(c.nom).includes(r) || (c.ref && sansAccents(c.ref).includes(r))));
  const filtresEntites: OptionPc[] = (["eteint", "decroche", "saison", "ralentit", "ok", "sans_achat", "sous_seuil"] as const).map((n) => ({
    cle: n,
    libelle: NIVEAUX[n].libelle,
    meta: String((l?.comptes ?? []).filter((c) => c.niveau === n).length),
    coche: filtre === n,
    action: () => aller(filtre === n ? null : n),
  }));
  const actions: OptionPc[] = [
    { cle: "risque", libelle: "Ouvrir la page Comptes à risque", icone: <ShieldCheck aria-hidden="true" />, href: `${RACINE}/offload` },
    ...(l?.comptes[0] ? [{ cle: "premier", libelle: `Ouvrir ${l.comptes[0].nom}`, icone: <ExternalLink aria-hidden="true" />, href: lienCompte(l.comptes[0].id) }] : []),
    {
      cle: "copier",
      libelle: l?.proposition ? "Copier le domaine" : "Copier le nom du groupe",
      icone: <Copy aria-hidden="true" />,
      action: () => copier(l?.domaine ?? l?.nom ?? id, l?.proposition ? "Domaine" : "Nom"),
      inactif: !l,
      section: true,
    },
  ];

  const details = l ? (
    l.proposition ? (
      <>
        <DetailsSection>
          <DetailsLigne etiquette="Domaine" aide="Le domaine de courriel professionnel que ces comptes partagent" valeur={`@${l.domaine}`} mono action={() => copier(l.domaine ?? "", "Domaine")} />
          <DetailsLigne etiquette="Comptes" valeur={pluriel(l.comptes.length, "compte")} />
          <DetailsLigne etiquette="Rattachement" valeur="Proposé, rien n'est rattaché" point="jaune" />
        </DetailsSection>
        <DetailsSection titre="Rattacher sous une raison sociale mère">
          <input className="pc-champ" value={nomMere} placeholder="Raison sociale mère" aria-label={`Raison sociale mère pour ${l.domaine}`} onChange={(e) => setNomMere(e.target.value)} />
          <div className="pc-details-actions">
            <button type="button" className="pc-btn pc-btn--plein pc-btn--apres" disabled={!nomMere.trim() || enCours} onClick={() => void rattacher()}>
              Rattacher
              <Link2 aria-hidden="true" />
            </button>
          </div>
        </DetailsSection>
        <DetailsPied texte="Rien n'est rattaché sans votre geste" />
      </>
    ) : (
      <>
        <DetailsSection>
          <DetailsLigne etiquette="Raison sociale" valeur={l.nom} action={() => copier(l.nom, "Nom")} />
          <DetailsLigne etiquette="Entités" valeur={pluriel(g?.nb ?? l.comptes.length, "entité")} />
          <DetailsLigne etiquette="Pire niveau" aide="Le signal le plus inquiétant parmi ses entités" valeur={libelleNiveau(g?.pire_niveau ?? null)} point={teinteNiveau(g?.pire_niveau ?? null) ?? "gris"} />
          <DetailsLigne etiquette="Rattachement" valeur="Rattaché" point="vert" />
        </DetailsSection>
        <DetailsSection titre="Chiffres">
          <DetailsLigne etiquette="CA 12 mois" valeur={montant(g?.ca_12m ?? 0)} />
          <DetailsLigne etiquette="Valeur annuelle" aide="Ce que le groupe pèse sur une année, d'après son rythme" valeur={montant(g?.valeur_annuelle ?? 0)} />
          <DetailsLigne etiquette="Dernier achat" valeur={g?.dernier_achat ? dateCourte(g.dernier_achat) : "Aucun achat daté"} vide={!g?.dernier_achat} />
          <DetailsLigne etiquette="Reprises en cours" valeur={g?.reprises_en_cours ? nombreFr(g.reprises_en_cours) : "Aucune"} vide={!g?.reprises_en_cours} />
          <DetailsLigne etiquette="Échéances" valeur={g?.echeances ? nombreFr(g.echeances) : "Aucune"} vide={!g?.echeances} />
          <DetailsLigne etiquette="En attente de retrait" valeur={g?.affaires_valeur ? montant(g.affaires_valeur) : "Rien"} vide={!g?.affaires_valeur} teinte={g?.affaires_valeur ? "jaune" : undefined} />
        </DetailsSection>
        <DetailsPied texte="Chaque entité se suit sur la page Comptes à risque" href={`${RACINE}/offload`} libelle="Ouvrir la page Comptes à risque" />
      </>
    )
  ) : (
    <DetailsSection>
      <DetailsLigne etiquette="Groupe" valeur={introuvable ? "Groupe inconnu" : "Lecture…"} vide />
    </DetailsSection>
  );

  return (
    <FicheClient
      retour={{ href: CHEMIN, libelle: "Groupes clients" }}
      icone={<IcBatiment taille={14} />}
      nom={nom}
      meta={
        l ? (
          <>
            <span className="pc-point" data-teinte={l.proposition ? "jaune" : "vert"} />
            <strong>{l.proposition ? "À rattacher" : "Rattaché"}</strong>
            <span>· {pluriel(l.comptes.length, "entité")}</span>
            {g ? <span>· {montant(g.ca_12m)} sur 12 mois</span> : null}
          </>
        ) : erreur ? (
          <span>La base réelle n&apos;a pas répondu. {erreur}</span>
        ) : null
      }
      etoile={{ actif: epingles.has(id), basculer: () => basculerEpingle(id) }}
      actions={actions}
      onglets={[{ cle: "entites", libelle: "Entités", nombre: l ? l.comptes.length : undefined }]}
      onglet="entites"
      choisirOnglet={() => {}}
      droite={
        l && !l.proposition ? (
          <>
            <BoutonFiltres options={filtresEntites} />
            <BoutonAffichage options={[{ cle: "nom", libelle: "Trier par nom", coche: true, action: () => {} }]} />
          </>
        ) : null
      }
      details={details}
      introuvable={introuvable}
    >
      {!donnees && !erreur ? (
        <p className="pc-chargement" aria-busy="true">
          Lecture des groupes…
        </p>
      ) : (
        <ListeItems
          recherche={{ valeur: q, changer: setQ, placeholder: "Rechercher une entité" }}
          vide={{ titre: `Aucune entité${filtre ? " à ce niveau" : ""}`, texte: "Les comptes rattachés à ce groupe s'afficheront ici." }}
          items={comptes.map((c) => ({
            id: c.id,
            avatar: <span>{initiale(c.nom)}</span>,
            teinte: teinteNiveau(c.niveau ?? null),
            texte: (
              <>
                {c.nom} {c.ref ? <small>{c.ref}</small> : null}
                {c.groupe ? <small>déjà dans {c.groupe}</small> : null}
              </>
            ),
            sous:
              c.niveau !== undefined
                ? `${libelleNiveau(c.niveau ?? null)}${c.ca_12m !== null && c.ca_12m !== undefined ? ` · ${montant(c.ca_12m)} sur 12 mois` : ""}${c.statut === "exclu" ? " · exclu du suivi" : ""}${c.verification ? " · à vérifier" : ""}`
                : "Même domaine de courriel",
            droite: <Layers width={14} height={14} aria-hidden="true" />,
            href: lienCompte(c.id),
          }))}
        />
      )}
    </FicheClient>
  );
}
