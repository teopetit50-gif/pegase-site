"use client";

/* ══════════════════════════════════════════════════════════════════════
   CASHD « Balance âgée » et « Risque client », sur les pages « Tenants »
   de Plain (28/10/2026, demande de Teo : « reproduis-les à l'identique »).
   Briques : ../lin/FicheClient.tsx (relevé : scratchpad/plain-clients).

     · la liste : un compte par ligne — la balance âgée par tranche de
       retard, ou le plafond, l'encours, l'utilisation et l'état du risque ;
       la recherche, « Filtres » (en place, ?filtre=), « Affichage V » (le
       tri, ?tri=), et sur la balance le bouton « Exporter vers un tableur »
       de l'écran d'avant ; les chiffres du bandeau d'avant sont les
       compteurs des filtres ;
     · une ligne ouvre la fiche du débiteur en pleine page (?id=, même
       route ; « ← » revient à la liste) : onglets Factures · Relances ·
       Règlements · Pièces, le volet Détails avec ses propriétés et son
       encours par tranche. Les gestes qui se décident dans l'écran de
       travail (statut, plafond, litiges) y mènent par un vrai lien, comme
       avant (lienCompte) ; « Débiteurs et relances » est dans le « ··· ».

   Mêmes données que les pages d'avant (./donnees.ts : l'exemple ou
   cashd_tableau), la fiche par cashd_fiche_compte et les relances par
   cashd_relances_du_jour en base réelle.
   ══════════════════════════════════════════════════════════════════════ */

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Copy, Download, ExternalLink, FileText, HandCoins, LayoutDashboard, ListChecks, Paperclip, Send, ShieldAlert } from "lucide-react";
import { useSource } from "@/components/espace/source";
import { dateCourte, montant } from "@/components/espace/format";
import { jourParis } from "@/components/espace/cashd/calcul";
import { ETATS_RELANCE, STATUTS_COMPTE, libellePalier } from "@/components/espace/cashd/etats";
import { exporterBalance } from "@/components/espace/cashd/tableur";
import { FICHES_EXEMPLE, RELANCES_EXEMPLE } from "@/components/espace/cashd/exemples";
import * as portes from "@/components/espace/cashd/portes";
import type { Balance, Fiche, Relance, Tableau } from "@/components/espace/cashd/types";
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
  useEpingle,
  type ColonnePc,
  type LignePc,
  type OptionPc,
} from "../lin/FicheClient";
import { RACINE } from "../modules";
import { lienCompte, useTableauCashd } from "./donnees";

type Vue = "balance" | "risque";
const CHEMINS: Record<Vue, string> = { balance: `${RACINE}/cashd/balance`, risque: `${RACINE}/cashd/risque` };
const TITRES: Record<Vue, string> = { balance: "Balance âgée", risque: "Risque client" };
const sansAccents = (x: string) => x.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? "s" : ""}`;
const utilisation = (b: Balance) => (b.plafond_encours && b.plafond_encours > 0 ? (b.encours / b.plafond_encours) * 100 : null);

/* ——— les tranches de la balance ——— */
const TRANCHES = [
  { cle: "non_echu", libelle: "Non échu" },
  { cle: "echu_1_30", libelle: "1 à 30 j" },
  { cle: "echu_31_60", libelle: "31 à 60 j" },
  { cle: "echu_61_90", libelle: "61 à 90 j" },
  { cle: "echu_plus_90", libelle: "+ 90 j" },
] as const;

/* ——— les filtres, un par page, lus dans l'adresse (?filtre=) ——— */
type Filtre = { cle: string; libelle: string; garde: (b: Balance) => boolean; section?: boolean };
const FILTRES: Record<Vue, Filtre[]> = {
  balance: [
    { cle: "echu", libelle: "Échus seulement", garde: (b) => b.echu > 0 },
    { cle: "plus_90", libelle: "Plus de 90 jours", garde: (b) => b.echu_plus_90 > 0 },
    { cle: "litige", libelle: "En litige", garde: (b) => b.en_litige > 0 },
    { cle: "credits", libelle: "Avec un crédit client", garde: (b) => b.credits > 0 },
    { cle: "pause", libelle: "En pause", garde: (b) => b.statut === "pause", section: true },
    { cle: "recouvrement", libelle: "En recouvrement", garde: (b) => b.statut === "recouvrement" },
    { cle: "attente_contact", libelle: "Contact à désigner", garde: (b) => b.statut === "attente_contact" },
  ],
  risque: [
    { cle: "au_dessus", libelle: "Au-dessus du plafond", garde: (b) => !!b.depasse_plafond },
    { cle: "proche", libelle: "Proches du plafond (80 % et plus)", garde: (b) => (utilisation(b) ?? 0) >= 80 && !b.depasse_plafond },
    { cle: "retard_60", libelle: "Retard de plus de 60 j", garde: (b) => b.retard_max_jours > 60 },
    { cle: "sans_plafond", libelle: "Sans plafond", garde: (b) => b.plafond_encours === null },
    { cle: "dans_plafond", libelle: "Dans le plafond", garde: (b) => b.plafond_encours !== null && !b.depasse_plafond && (utilisation(b) ?? 0) < 80, section: true },
  ],
};

/* ——— les tris (« Affichage V »), lus dans l'adresse (?tri=) ——— */
type Tri = { cle: string; libelle: string; ordre: (a: Balance, b: Balance) => number };
const TRIS: Record<Vue, Tri[]> = {
  balance: [
    { cle: "echu", libelle: "Échu", ordre: (a, b) => b.echu - a.echu || b.encours - a.encours },
    { cle: "encours", libelle: "Encours", ordre: (a, b) => b.encours - a.encours },
    { cle: "retard", libelle: "Retard max", ordre: (a, b) => b.retard_max_jours - a.retard_max_jours || b.echu - a.echu },
    { cle: "nom", libelle: "Nom", ordre: (a, b) => a.nom.localeCompare(b.nom, "fr") },
  ],
  risque: [
    {
      cle: "utilise",
      libelle: "Utilisation du plafond",
      ordre: (a, b) => Number(!!b.depasse_plafond) - Number(!!a.depasse_plafond) || (utilisation(b) ?? -1) - (utilisation(a) ?? -1) || b.retard_max_jours - a.retard_max_jours,
    },
    { cle: "encours", libelle: "Encours", ordre: (a, b) => b.encours - a.encours },
    { cle: "retard", libelle: "Retard max", ordre: (a, b) => b.retard_max_jours - a.retard_max_jours },
    { cle: "nom", libelle: "Nom", ordre: (a, b) => a.nom.localeCompare(b.nom, "fr") },
  ],
};

export function BalanceAgee() {
  return <PageClients vue="balance" />;
}
export function Risque() {
  return <PageClients vue="risque" />;
}

function PageClients({ vue }: { vue: Vue }) {
  const params = useSearchParams();
  const id = params.get("id");
  const { tableau, erreur } = useTableauCashd();
  if (id) return <FicheDebiteur vue={vue} id={id} tableau={tableau} erreur={erreur} onglet={params.get("onglet") ?? "factures"} filtre={params.get("filtre")} />;
  return <Liste vue={vue} tableau={tableau} erreur={erreur} filtre={params.get("filtre")} tri={params.get("tri")} />;
}

/* ——— la liste ——— */
function Liste({ vue, tableau, erreur, filtre, tri }: { vue: Vue; tableau: Tableau | null; erreur: string | null; filtre: string | null; tri: string | null }) {
  const routeur = useRouter();
  const [q, setQ] = useState("");
  const [epingle, basculerEpingle] = useEpingle(`cashd-${vue}`);
  const chemin = CHEMINS[vue];
  const aller = (f: string | null, t: string | null) => {
    const p = new URLSearchParams();
    if (f) p.set("filtre", f);
    if (t) p.set("tri", t);
    routeur.replace(p.size ? `${chemin}?${p}` : chemin, { scroll: false });
  };
  const filtres = FILTRES[vue];
  const tris = TRIS[vue];
  const filtreActif = filtres.find((f) => f.cle === filtre) ?? null;
  const triActif = tris.find((t) => t.cle === tri) ?? tris[0];

  /* les comptes de la page : ceux qui ont un encours, un crédit ou un plafond, comme avant */
  const base = useMemo(() => {
    const c = tableau?.comptes ?? [];
    return vue === "balance" ? c.filter((b) => b.encours !== 0 || b.credits !== 0) : c.filter((b) => b.encours > 0 || b.plafond_encours !== null);
  }, [tableau, vue]);
  const visibles = useMemo(() => {
    const r = sansAccents(q.trim());
    return base.filter((b) => (!filtreActif || filtreActif.garde(b)) && (!r || sansAccents(b.nom).includes(r) || sansAccents(b.reference).includes(r))).sort(triActif.ordre);
  }, [base, q, filtreActif, triActif]);

  /* les chiffres du bandeau d'avant : les compteurs des filtres */
  const metaDe = (f: Filtre) => {
    const c = base.filter(f.garde);
    if (vue === "balance") {
      const somme =
        f.cle === "echu"
          ? c.reduce((s, b) => s + b.echu, 0)
          : f.cle === "plus_90"
            ? c.reduce((s, b) => s + b.echu_plus_90, 0)
            : f.cle === "litige"
              ? c.reduce((s, b) => s + b.en_litige, 0)
              : f.cle === "credits"
                ? c.reduce((s, b) => s + b.credits, 0)
                : null;
      return somme !== null ? `${c.length} · ${montant(somme)}` : String(c.length);
    }
    return String(c.length);
  };
  const optionsFiltres: OptionPc[] = [
    ...filtres.map((f) => ({ cle: f.cle, libelle: f.libelle, meta: metaDe(f), coche: filtreActif?.cle === f.cle, section: f.section, action: () => aller(filtreActif?.cle === f.cle ? null : f.cle, tri) })),
    ...(filtreActif ? [{ cle: "tous", libelle: "Tous les comptes", meta: String(base.length), section: true, action: () => aller(null, tri) }] : []),
  ];
  const optionsAffichage: OptionPc[] = tris.map((t) => ({ cle: t.cle, libelle: `Trier par ${t.libelle.toLowerCase()}`, coche: t.cle === triActif.cle, action: () => aller(filtre, t.cle === tris[0].cle ? null : t.cle) }));

  const colonnes: ColonnePc[] =
    vue === "balance"
      ? [
          { cle: "compte", libelle: "Compte" },
          ...TRANCHES.map((x) => ({ cle: x.cle, libelle: x.libelle, num: true, largeur: 112, repli: "secondaire" as const })),
          { cle: "encours", libelle: "Encours", num: true, largeur: 130, triee: triActif.cle === "encours" || triActif.cle === "echu" },
          { cle: "retard", libelle: "Retard max", icone: <IcCercle taille={14} />, num: true, largeur: 140, repli: "tertiaire", triee: triActif.cle === "retard" },
        ]
      : [
          { cle: "compte", libelle: "Compte" },
          { cle: "encours", libelle: "Encours", num: true, largeur: 130, triee: triActif.cle === "encours" },
          { cle: "plafond", libelle: "Plafond", num: true, largeur: 130, repli: "tertiaire" },
          { cle: "utilise", libelle: "Utilisé", num: true, largeur: 104, repli: "secondaire", triee: triActif.cle === "utilise" },
          { cle: "retard", libelle: "Retard max", icone: <IcCercle taille={14} />, num: true, largeur: 140, repli: "secondaire", triee: triActif.cle === "retard" },
          { cle: "etat", libelle: "État", icone: <ShieldAlert width={14} height={14} aria-hidden="true" />, largeur: 190 },
        ];

  const nom = (b: Balance) => (
    <>
      <span className="pc-tuile">
        <IcBatiment taille={12} />
      </span>
      <span>
        {b.nom}{" "}
        <small className="pc-gris" style={{ fontSize: 12, fontWeight: 400 }}>
          {b.reference}
        </small>
      </span>
    </>
  );
  const somme = (v: number, devise: string, teinte?: "rouge") =>
    v ? (
      <span className="pc-val pc-val--num" data-teinte={teinte}>
        {montant(v, devise)}
      </span>
    ) : (
      <span className="pc-gris">—</span>
    );
  const retard = (b: Balance) =>
    b.retard_max_jours > 0 ? (
      <span className="pc-val pc-val--num pc-val--compte" data-teinte={b.retard_max_jours > 90 ? "rouge" : undefined}>
        <IcCercle taille={14} />
        {b.retard_max_jours} j
      </span>
    ) : (
      <span className="pc-gris">—</span>
    );
  const etat = (b: Balance) => {
    const u = utilisation(b);
    const [libelle, teinte]: [string, "rouge" | "jaune" | "vert" | undefined] = b.depasse_plafond
      ? ["Au-dessus du plafond", "rouge"]
      : u !== null && u >= 80
        ? ["Proche du plafond", "jaune"]
        : b.retard_max_jours > 60
          ? ["Retard qui s'allonge", "jaune"]
          : u === null
            ? ["Plafond à fixer", undefined]
            : ["Dans le plafond", "vert"];
    return (
      <span className="pc-val" data-teinte={teinte}>
        <IcCercle taille={14} />
        <span>{libelle}</span>
      </span>
    );
  };
  const lignes: LignePc[] = visibles.map((b) => ({
    id: b.compte_id,
    href: `${chemin}?id=${encodeURIComponent(b.compte_id)}`,
    libelle: `Ouvrir ${b.nom}`,
    cellules:
      vue === "balance"
        ? [
            nom(b),
            ...TRANCHES.map((x) => somme(b[x.cle], b.devise, x.cle === "echu_plus_90" && b[x.cle] > 0 ? "rouge" : undefined)),
            <span key="e" className="pc-val pc-val--num pc-fort">
              {montant(b.encours, b.devise)}
            </span>,
            retard(b),
          ]
        : [
            nom(b),
            <span key="e" className="pc-val pc-val--num pc-fort">
              {montant(b.encours, b.devise)}
            </span>,
            b.plafond_encours !== null ? (
              <span key="p" className="pc-val pc-val--num">
                {montant(b.plafond_encours, b.devise)}
              </span>
            ) : (
              <span key="p" className="pc-gris">
                aucun
              </span>
            ),
            utilisation(b) !== null ? (
              <span key="u" className="pc-val pc-val--num pc-val--compte" data-teinte={b.depasse_plafond ? "rouge" : undefined}>
                {Math.round(utilisation(b)!)} %
              </span>
            ) : (
              <span key="u" className="pc-gris">
                —
              </span>
            ),
            retard(b),
            etat(b),
          ],
  }));

  return (
    <ListeClients
      icone={<IcBatiment />}
      titre={TITRES[vue]}
      etoile={{ actif: epingle, basculer: basculerEpingle }}
      filtres={optionsFiltres}
      affichage={optionsAffichage}
      action={
        vue === "balance" && tableau ? (
          <button type="button" className="pc-btn pc-btn--plein" onClick={() => exporterBalance(tableau.comptes, jourParis())}>
            <Download aria-hidden="true" />
            Exporter vers un tableur
          </button>
        ) : null
      }
      recherche={{ valeur: q, changer: setQ, placeholder: "Rechercher un compte" }}
      tri={{ libelle: triActif.libelle, retirer: triActif.cle !== tris[0].cle ? () => aller(filtre, null) : undefined }}
      filtresActifs={filtreActif ? [{ cle: filtreActif.cle, libelle: filtreActif.libelle, retirer: () => aller(null, tri) }] : []}
      erreur={erreur}
      colonnes={colonnes}
      lignes={lignes}
      chargement={!tableau && !erreur}
      vide={
        q || filtreActif
          ? { titre: "Aucun compte ne correspond", texte: "Élargissez la recherche ou retirez le filtre." }
          : vue === "balance"
            ? { titre: "Aucun encours", texte: "Le facturier ne contient aucune facture ouverte." }
            : { titre: "Aucun compte à suivre", texte: "Aucun encours ni plafond pour l'instant." }
      }
    />
  );
}

/* ——— la fiche d'un débiteur ——— */
const ONGLETS = [
  { cle: "factures", libelle: "Factures" },
  { cle: "relances", libelle: "Relances" },
  { cle: "reglements", libelle: "Règlements" },
  { cle: "pieces", libelle: "Pièces" },
];

function FicheDebiteur({ vue, id, tableau, erreur, onglet, filtre }: { vue: Vue; id: string; tableau: Tableau | null; erreur: string | null; onglet: string; filtre: string | null }) {
  const routeur = useRouter();
  const toast = useToast();
  const { source } = useSource();
  const chemin = CHEMINS[vue];
  const [epingles, basculerEpingle] = useEpingles("cashd-comptes");
  const [q, setQ] = useState("");
  const [fiche, setFiche] = useState<{ id: string; fiche: Fiche | null; relances: Relance[] } | null>(null);
  const b = tableau?.comptes.find((x) => x.compte_id === id) ?? null;

  /* la fiche : l'exemple, ou cashd_fiche_compte + les relances du jour (base réelle) */
  useEffect(() => {
    if (source !== "reelle") return;
    let actif = true;
    const t = window.setTimeout(async () => {
      try {
        const [f, c] = await Promise.all([portes.chargerFiche(id), portes.monClient()]);
        const r = c ? await portes.chargerRelances(c.client_id) : [];
        if (actif) setFiche({ id, fiche: f, relances: r.filter((x) => x.compte_id === id) });
      } catch {
        if (actif) setFiche({ id, fiche: null, relances: [] });
      }
    }, 0);
    return () => {
      actif = false;
      window.clearTimeout(t);
    };
  }, [source, id]);
  const exemple = useMemo(() => ({ id, fiche: FICHES_EXEMPLE.find((f) => f.compte.id === id) ?? null, relances: RELANCES_EXEMPLE.filter((r) => r.compte_id === id) }), [id]);
  const d = source === "exemple" ? exemple : fiche && fiche.id === id ? fiche : null;
  const f = d?.fiche ?? null;

  const aller = (o: string, fl: string | null) => {
    const p = new URLSearchParams({ id });
    if (o !== "factures") p.set("onglet", o);
    if (fl) p.set("filtre", fl);
    routeur.replace(`${chemin}?${p}`, { scroll: false });
  };
  const copier = (texte: string, quoi: string) => {
    navigator.clipboard?.writeText(texte).then(
      () => toast(`${quoi} copié.`, "vert"),
      () => toast("Le presse-papiers a refusé.", "rouge"),
    );
  };

  const introuvable = !!tableau && !b;
  const nom = b?.nom ?? (tableau ? "Compte introuvable" : "Lecture…");
  const suivi = lienCompte(id);
  const actions: OptionPc[] = [
    { cle: "suivi", libelle: "Ouvrir dans Débiteurs et relances", icone: <ListChecks aria-hidden="true" />, href: suivi },
    { cle: "bord", libelle: "Ouvrir dans le tableau de bord CASHD", icone: <LayoutDashboard aria-hidden="true" />, href: `${RACINE}/cashd?compte=${encodeURIComponent(id)}` },
    { cle: "envois", libelle: "Voir ses envois", icone: <Send aria-hidden="true" />, href: `${RACINE}/cashd/suivi?vue=envois&filtre=debiteur:${encodeURIComponent(id)}` },
    {
      cle: "autre",
      libelle: vue === "balance" ? "Son risque client" : "Sa balance âgée",
      icone: <ExternalLink aria-hidden="true" />,
      href: `${CHEMINS[vue === "balance" ? "risque" : "balance"]}?id=${encodeURIComponent(id)}`,
      section: true,
    },
    { cle: "copier", libelle: "Copier la référence", icone: <Copy aria-hidden="true" />, action: () => copier(b?.reference ?? id, "Référence"), inactif: !b },
    ...(vue === "balance" && tableau
      ? [{ cle: "export", libelle: "Exporter la balance vers un tableur", icone: <Download aria-hidden="true" />, action: () => exporterBalance(tableau.comptes, jourParis()), section: true }]
      : []),
  ];

  /* ——— le corps : les quatre onglets ——— */
  const r = sansAccents(q.trim());
  const ok = (...xs: (string | null | undefined)[]) => !r || xs.some((x) => x && sansAccents(x).includes(r));
  const factures = (f?.pieces ?? [])
    .filter((p) => (filtre === "echues" ? p.retard_jours > 0 && p.reste_du > 0 : filtre === "devis" ? p.nature === "devis" : filtre === "ouvertes" ? p.reste_du > 0 : true) && ok(p.numero, p.statut))
    .sort((a, x) => x.date_emission.localeCompare(a.date_emission));
  const relances = (d?.relances ?? []).filter((x) => (filtre ? x.etat === filtre : true) && ok(x.sujet, x.palier, x.destinataire_adresse)).sort((a, x) => x.jour.localeCompare(a.jour));
  const reglements = (f?.reglements ?? []).filter((x) => ok(x.reference, x.libelle, x.mode)).sort((a, x) => x.recu_le.localeCompare(a.recu_le));
  const pieces = (f?.pieces_jointes ?? []).filter((x) => ok(x.nom, x.nature)).sort((a, x) => x.cree_le.localeCompare(a.cree_le));
  const nombres: Record<string, number> = { factures: f?.pieces.length ?? 0, relances: d?.relances.length ?? 0, reglements: f?.reglements.length ?? 0, pieces: f?.pieces_jointes?.length ?? 0 };
  const chargement = !tableau || (!d && !erreur);

  const filtresFactures: OptionPc[] = [
    { cle: "ouvertes", libelle: "Reste à régler", coche: filtre === "ouvertes", action: () => aller(onglet, filtre === "ouvertes" ? null : "ouvertes") },
    { cle: "echues", libelle: "Échues seulement", coche: filtre === "echues", action: () => aller(onglet, filtre === "echues" ? null : "echues") },
    { cle: "devis", libelle: "Devis", coche: filtre === "devis", action: () => aller(onglet, filtre === "devis" ? null : "devis") },
  ];
  const filtresRelances: OptionPc[] = (Object.keys(ETATS_RELANCE) as (keyof typeof ETATS_RELANCE)[]).map((e) => ({
    cle: e,
    libelle: ETATS_RELANCE[e].libelle,
    meta: String((d?.relances ?? []).filter((x) => x.etat === e).length),
    coche: filtre === e,
    action: () => aller(onglet, filtre === e ? null : e),
  }));
  const affichage: OptionPc[] = [{ cle: "date", libelle: "Trier par date", coche: true, action: () => {} }];

  const corps =
    chargement && !introuvable ? (
      <p className="pc-chargement" aria-busy="true">
        Lecture de la fiche…
      </p>
    ) : onglet === "relances" ? (
      <ListeItems
        recherche={{ valeur: q, changer: setQ, placeholder: "Rechercher une relance" }}
        vide={{ titre: `Aucune relance pour ${nom}`, texte: "Les relances préparées pour ce compte s'afficheront ici." }}
        items={relances.map((x) => ({
          id: x.id,
          avatar: <Send aria-hidden="true" />,
          teinte: x.etat === "a_valider" ? "jaune" : x.etat === "envoyee" ? "vert" : x.etat === "echec" || x.etat === "bloquee" || x.etat === "sans_adresse" ? "rouge" : undefined,
          texte: (
            <>
              {libellePalier(x.palier)} <small>{ETATS_RELANCE[x.etat]?.libelle ?? x.etat}</small>
            </>
          ),
          sous: `${dateCourte(x.jour)} · ${x.destinataire_adresse ?? "sans adresse"}${x.sujet ? ` · ${x.sujet}` : ""}`,
          droite: <span className="pc-fort">{montant(x.montant)}</span>,
          href: `${RACINE}/cashd/suivi?vue=envois&id=${encodeURIComponent(x.id)}`,
        }))}
      />
    ) : onglet === "reglements" ? (
      <ListeItems
        recherche={{ valeur: q, changer: setQ, placeholder: "Rechercher un règlement" }}
        vide={{ titre: `Aucun règlement pour ${nom}`, texte: "Les règlements reçus de ce compte s'afficheront ici." }}
        items={reglements.map((x) => ({
          id: x.id,
          avatar: <HandCoins aria-hidden="true" />,
          teinte: x.a_imputer > 0 ? "jaune" : x.statut === "annule" ? "rouge" : "vert",
          texte: (
            <>
              {montant(x.montant)} <small>{x.mode ?? "règlement"}</small>
            </>
          ),
          sous: `Reçu le ${dateCourte(x.recu_le)}${x.reference ? ` · ${x.reference}` : ""}${x.libelle ? ` · ${x.libelle}` : ""}`,
          droite: x.statut === "annule" ? "annulé" : x.a_imputer > 0 ? `${montant(x.a_imputer)} à imputer` : "imputé",
          href: `${RACINE}/cashd/suivi?vue=tresorerie`,
        }))}
      />
    ) : onglet === "pieces" ? (
      <ListeItems
        recherche={{ valeur: q, changer: setQ, placeholder: "Rechercher une pièce" }}
        vide={{ titre: `Aucune pièce jointe pour ${nom}`, texte: "Les pièces jointes aux factures (bons de livraison, contrats) s'afficheront ici." }}
        items={pieces.map((x) => ({
          id: x.id,
          avatar: <Paperclip aria-hidden="true" />,
          texte: x.nom,
          sous: `${x.nature.replace(/_/g, " ")} · ${dateCourte(x.cree_le)}`,
          href: suivi,
        }))}
      />
    ) : (
      <ListeItems
        recherche={{ valeur: q, changer: setQ, placeholder: "Rechercher une facture" }}
        vide={{ titre: `Aucune facture pour ${nom}`, texte: "Les factures lues dans le facturier s'afficheront ici." }}
        items={factures.map((p) => ({
          id: p.id,
          avatar: p.nature === "devis" ? <span>D</span> : p.nature === "avoir" ? <span>A</span> : <FileText aria-hidden="true" />,
          teinte: p.retard_jours > 0 && p.reste_du > 0 ? (p.retard_jours > 90 ? "rouge" : "jaune") : p.reste_du > 0 ? undefined : "vert",
          texte: (
            <>
              {p.numero} <small>{p.statut.replace(/_/g, " ")}</small>
            </>
          ),
          sous: `Émise le ${dateCourte(p.date_emission)}${p.echeance ? ` · échéance ${dateCourte(p.echeance)}` : ""}${p.retard_jours > 0 && p.reste_du > 0 ? ` · ${p.retard_jours} j de retard` : ""}`,
          droite: p.reste_du > 0 ? <span className="pc-fort">{montant(p.reste_du, p.devise)}</span> : `${montant(p.montant_ttc, p.devise)} réglé`,
          href: suivi,
        }))}
      />
    );

  /* ——— le volet Détails ——— */
  const st = b ? STATUTS_COMPTE[b.statut] : null;
  const teintePoint = (t: string | undefined): "gris" | "rouge" | "jaune" | "vert" | "bleu" => (t === "rouge" || t === "noir" ? "rouge" : t === "ambre" ? "jaune" : t === "vert" ? "vert" : t === "bleu" ? "bleu" : "gris");
  const u = b ? utilisation(b) : null;
  const details = b ? (
    <>
      <DetailsSection>
        <DetailsLigne etiquette="Référence" aide="Le code du compte dans votre facturier" valeur={b.reference} mono action={() => copier(b.reference, "Référence")} />
        <DetailsLigne etiquette="Statut" aide="Se change dans Débiteurs et relances" valeur={st?.libelle ?? b.statut} point={teintePoint(st?.teinte)} href={suivi} />
        <DetailsLigne
          etiquette="Plafond d'encours"
          aide="Se fixe dans la fiche du compte"
          valeur={b.plafond_encours !== null ? montant(b.plafond_encours, b.devise) : "Fixer un plafond"}
          vide={b.plafond_encours === null}
          teinte={b.depasse_plafond ? "rouge" : undefined}
          href={suivi}
        />
        {u !== null ? <DetailsLigne etiquette="Plafond utilisé" valeur={`${Math.round(u)} %`} teinte={b.depasse_plafond ? "rouge" : u >= 80 ? "jaune" : undefined} /> : null}
        <DetailsLigne etiquette="Groupe" valeur={b.groupe ?? "Aucun groupe"} vide={!b.groupe} />
        {f ? <DetailsLigne etiquette="Langue" valeur={f.compte.langue.toUpperCase()} /> : null}
        {f ? <DetailsLigne etiquette="SIREN" valeur={f.compte.siren ?? "Inconnu"} vide={!f.compte.siren} mono={!!f.compte.siren} /> : null}
        {f?.compte.secteur ? <DetailsLigne etiquette="Secteur" valeur={f.compte.secteur} /> : null}
      </DetailsSection>
      <DetailsSection titre="Encours">
        <DetailsLigne etiquette="Encours" valeur={montant(b.encours, b.devise)} />
        <DetailsLigne etiquette="Échu" valeur={montant(b.echu, b.devise)} teinte={b.echu > 0 ? "jaune" : undefined} vide={!b.echu} />
        {TRANCHES.map((x) => (
          <DetailsLigne
            key={x.cle}
            etiquette={x.libelle === "+ 90 j" ? "Plus de 90 j" : x.libelle}
            valeur={montant(b[x.cle], b.devise)}
            vide={!b[x.cle]}
            teinte={x.cle === "echu_plus_90" && b[x.cle] > 0 ? "rouge" : undefined}
          />
        ))}
        <DetailsLigne etiquette="En litige" valeur={b.en_litige ? montant(b.en_litige, b.devise) : "Aucun litige"} vide={!b.en_litige} teinte={b.en_litige ? "rouge" : undefined} />
        <DetailsLigne etiquette="Crédits" valeur={b.credits ? montant(b.credits, b.devise) : "Aucun crédit"} vide={!b.credits} />
        <DetailsLigne etiquette="Retard max" valeur={b.retard_max_jours > 0 ? `${b.retard_max_jours} jours` : "Aucun retard"} vide={!b.retard_max_jours} teinte={b.retard_max_jours > 90 ? "rouge" : undefined} />
        <DetailsLigne etiquette="Plus ancienne échéance" valeur={b.plus_ancienne_echeance ? dateCourte(b.plus_ancienne_echeance) : "—"} vide={!b.plus_ancienne_echeance} />
        <DetailsLigne etiquette="Factures ouvertes" valeur={`${b.factures_ouvertes} dont ${pluriel(b.factures_echues, "échue")}`} />
      </DetailsSection>
      {f ? (
        <DetailsSection titre="Contacts">
          <DetailsLigne etiquette="Facturation" valeur={f.compte.contact_facturation_nom ?? "Personne désignée"} vide={!f.compte.contact_facturation_nom} />
          <DetailsLigne etiquette="E-mail facturation" valeur={f.compte.contact_facturation_email ?? "Ajouter une adresse"} vide={!f.compte.contact_facturation_email} href={suivi} />
          <DetailsLigne etiquette="E-mail commercial" valeur={f.compte.contact_commercial_email ?? "Aucune"} vide={!f.compte.contact_commercial_email} />
          <DetailsLigne etiquette="Réciproque" aide="Un client qui est aussi un fournisseur" valeur={f.compte.reciproque ? "Oui" : "Non"} point={f.compte.reciproque ? "bleu" : "gris"} />
        </DetailsSection>
      ) : null}
      <DetailsPied texte="Statut, plafond et litiges se règlent dans la fiche du compte" href={suivi} libelle="Ouvrir la fiche du compte dans Débiteurs et relances" />
    </>
  ) : (
    <DetailsSection>
      <DetailsLigne etiquette="Référence" valeur={introuvable ? "Compte inconnu" : "Lecture…"} vide />
    </DetailsSection>
  );

  return (
    <FicheClient
      retour={{ href: chemin, libelle: TITRES[vue] }}
      icone={<IcBatiment taille={14} />}
      nom={nom}
      meta={
        b ? (
          <>
            <span className="pc-mono">{b.reference}</span>
            <span>·</span>
            <span className="pc-point" data-teinte={teintePoint(st?.teinte) === "gris" ? undefined : teintePoint(st?.teinte)} />
            <strong>{st?.libelle ?? b.statut}</strong>
            {tableau?.dernier_import ? <span>· dernier import {dateCourte(tableau.dernier_import)}</span> : null}
          </>
        ) : erreur ? (
          <span>La base réelle n&apos;a pas répondu. {erreur}</span>
        ) : null
      }
      etoile={{ actif: epingles.has(id), basculer: () => basculerEpingle(id) }}
      actions={actions}
      onglets={ONGLETS.map((o) => ({ ...o, nombre: d ? nombres[o.cle] : undefined }))}
      onglet={onglet}
      choisirOnglet={(o) => {
        setQ("");
        aller(o, null);
      }}
      droite={
        onglet === "factures" ? (
          <>
            <BoutonFiltres options={filtresFactures} />
            <BoutonAffichage options={affichage} />
          </>
        ) : onglet === "relances" ? (
          <>
            <BoutonFiltres options={filtresRelances} />
            <BoutonAffichage options={affichage} />
          </>
        ) : null
      }
      details={details}
      introuvable={introuvable}
    >
      {corps}
    </FicheClient>
  );
}
