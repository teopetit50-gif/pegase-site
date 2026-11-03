"use client";

/* FILED, tableau de bord — la carte « Engagé ce mois » et le délai de traitement (03/11/2026).
   Le site promet « L'engagé du mois se lit par fournisseur, par société et par centre de coût » et
   « Le délai moyen de traitement se mesure de la réception au classement ». Les deux portes existent
   (filed_engage_mois, filed_delai_traitement, a4_06) ; aucune carte ne les montrait. Même carte que
   « Échéances » à côté (CarteDroite, lin-kpis, onglets lin-segment-carte, lin-repartition). */

import { useEffect, useState } from "react";
import { montant, nombreFr } from "@/components/espace/format";
import { ENTITES } from "@/components/espace/exemples/socle";
import { delaiTraitement, engageMois, monClient, type DelaiTraitement, type LigneEngage } from "@/components/espace/filed/portes";
import type { DossierFiled } from "@/components/espace/types";
import { CarteDroite } from "../lin/Lin";

type Onglet = "fournisseur" | "entite" | "centre";
const ONGLETS: [Onglet, string][] = [
  ["fournisseur", "Fournisseurs"],
  ["entite", "Sociétés"],
  ["centre", "Centres de coût"],
];
const STATUTS = new Set(["bloquee", "a_valider", "validee", "comptabilisee"]);
const arrondi = (v: number) => Math.round(v * 100) / 100;
const jours = (v: number | null | undefined) => (v === null || v === undefined ? "—" : `${nombreFr(v)} j`);

/* l'exemple, calculé comme la porte : factures émises ce mois, non écartées, avoirs en moins ; sans imputation, « Non imputé » */
const cleMois = (d: Date) => `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, "0")}`;
function engageExemple(dossiers: DossierFiled[], mois: string): LigneEngage[] {
  const lignes: LigneEngage[] = [];
  for (const d of dossiers) {
    const f = d.facture;
    if (!f || !STATUTS.has(f.statut) || !f.date_emission?.startsWith(mois) || f.devise !== "EUR") continue;
    const signe = f.nature === "avoir" ? -1 : 1;
    const entite = ENTITES.find((e) => e.id === d.document.entite_id) ?? null;
    lignes.push({
      entite_id: entite?.id ?? null,
      entite: entite?.nom ?? null,
      fournisseur_id: d.fournisseur?.id ?? null,
      fournisseur: d.fournisseur?.nom ?? "Fournisseur non rattaché",
      centre_id: null,
      centre: d.fournisseur?.code === "GIRAUDP" ? "CC-12 — Chantier Croix-Rousse" : d.fournisseur?.code === "CANUTS" ? "CC-03 — Vie de l'équipe" : "Non imputé",
      nb_factures: 1,
      montant_ht: signe * (f.montant_ht ?? 0),
      montant_ttc: signe * (f.montant_ttc ?? 0),
    });
  }
  return lignes;
}

/* de la réception à la validation : la première étape « validee » ou « integration » du dossier */
function delaiExemple(dossiers: DossierFiled[]): DelaiTraitement {
  const d = dossiers
    .map((x) => {
      const fin = x.historique.find((h) => h.etape === "validee" || h.etape === "integration")?.survenu_le;
      return fin ? (new Date(fin).getTime() - new Date(x.document.recu_le).getTime()) / 86_400_000 : null;
    })
    .filter((v): v is number => v !== null && v >= 0)
    .sort((a, b) => a - b);
  if (!d.length) return { nb_factures: 0, delai_moyen_jours: null, delai_median_jours: null, delai_max_jours: null };
  const r1 = (v: number) => Math.round(v * 10) / 10;
  const milieu = d.length % 2 ? d[(d.length - 1) / 2] : (d[d.length / 2 - 1] + d[d.length / 2]) / 2;
  return { nb_factures: d.length, delai_moyen_jours: r1(d.reduce((a, b) => a + b, 0) / d.length), delai_median_jours: r1(milieu), delai_max_jours: r1(d[d.length - 1]) };
}

export default function PilotageFiled({ source, dossiers, aujourdhui }: { source: "exemple" | "reelle"; dossiers: DossierFiled[]; aujourdhui: Date }) {
  const [onglet, setOnglet] = useState<Onglet>("fournisseur");
  /* le mois tout juste commencé est presque vide : le mois dernier se lit d'un clic (p_mois de la porte) */
  const [precedent, setPrecedent] = useState(aujourdhui.getDate() < 8);
  const leMois = precedent ? new Date(aujourdhui.getFullYear(), aujourdhui.getMonth() - 1, 1) : new Date(aujourdhui.getFullYear(), aujourdhui.getMonth(), 1);
  const mois = cleMois(leMois);
  const [reel, setReel] = useState<{ engage: LigneEngage[]; delai: DelaiTraitement | null } | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    if (source !== "reelle") return;
    let actif = true;
    (async () => {
      try {
        const c = await monClient();
        if (!c) throw new Error("Aucun client rattaché à ce compte.");
        const [engage, delai] = await Promise.all([engageMois(c.client_id, `${mois}-01`), delaiTraitement(c.client_id)]);
        if (actif) setReel({ engage: engage ?? [], delai });
      } catch (e) {
        if (actif) setErreur(e instanceof Error ? e.message : "La base n'a pas répondu.");
      }
    })();
    return () => {
      actif = false;
    };
  }, [source, mois]);

  const engage = source === "exemple" ? engageExemple(dossiers, mois) : (reel?.engage ?? []);
  const delai = source === "exemple" ? delaiExemple(dossiers) : (reel?.delai ?? null);
  const totalHt = arrondi(engage.reduce((t, l) => t + Number(l.montant_ht), 0));
  const nb = engage.reduce((t, l) => t + Number(l.nb_factures), 0);
  const repartition = [...new Set(engage.map((l) => (onglet === "fournisseur" ? l.fournisseur : onglet === "entite" ? (l.entite ?? "Sans société") : l.centre)))]
    .map((cle) => ({
      cle,
      n: arrondi(engage.filter((l) => (onglet === "fournisseur" ? l.fournisseur : onglet === "entite" ? (l.entite ?? "Sans société") : l.centre) === cle).reduce((t, l) => t + Number(l.montant_ht), 0)),
    }))
    .sort((a, b) => b.n - a.n);
  const nomMois = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(leMois);

  return (
    <CarteDroite
      titre={`Engagé · ${nomMois}`}
      action={
        <button type="button" className="lin-carte-lien" onClick={() => setPrecedent((v) => !v)}>
          {precedent ? "Ce mois" : "Mois dernier"}
        </button>
      }
    >
      {erreur ? <p className="lin-activite-vide">Le pilotage n&apos;a pas pu être lu : {erreur}</p> : null}
      <dl className="lin-kpis lin-kpis--trois">
        <div data-teinte="bleu">
          <dt>
            <span className="lin-carre" style={{ background: "var(--lin-graph-bleu)" }} />
            Engagé HT
          </dt>
          <dd>{montant(totalHt)}</dd>
        </div>
        <div data-teinte="gris">
          <dt>
            <span className="lin-carre" style={{ background: "var(--lin-graph-gris)" }} />
            Factures
          </dt>
          <dd>{nb}</dd>
        </div>
        <div data-teinte="jaune">
          <dt title="De la réception de la pièce à sa validation, factures classées ce mois">
            <span className="lin-carre" style={{ background: "var(--lin-graph-jaune)" }} />
            Délai moyen
          </dt>
          <dd>{jours(delai?.delai_moyen_jours)}</dd>
        </div>
      </dl>
      <p className="lin-activite-vide" style={{ marginTop: 12 }}>
        {delai && delai.nb_factures
          ? `Traitement, de la réception au classement : ${jours(delai.delai_moyen_jours)} en moyenne, ${jours(delai.delai_median_jours)} en médiane, ${jours(delai.delai_max_jours)} au plus, sur ${delai.nb_factures} facture${delai.nb_factures > 1 ? "s" : ""}.`
          : "Aucune facture classée ce mois : le délai de traitement se mesure à la première validation."}
      </p>
      <div className="lin-segment-carte" role="tablist">
        {ONGLETS.map(([cle, lib]) => (
          <button key={cle} type="button" role="tab" className="lin-details-onglet" aria-selected={onglet === cle} onClick={() => setOnglet(cle)}>
            {lib}
          </button>
        ))}
      </div>
      {repartition.length ? (
        <ul className="lin-repartition">
          {repartition.map((l) => (
            <li key={l.cle}>
              <span>{l.cle}</span>
              <span>{montant(l.n)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="lin-activite-vide" style={{ marginTop: 12 }}>
          Aucune facture émise ce mois.
        </p>
      )}
    </CarteDroite>
  );
}
