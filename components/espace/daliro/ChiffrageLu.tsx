/* ══════════════════════════════════════════════════════════════════════
   Le chiffrage d'un avenant ouvert par le lecteur (11/10/2026, session B6, b6_26)

   Quand Daliro ouvre un avenant depuis une photo ou un vocal, il cherche
   le prix VALIDÉ de la bibliothèque qui correspond à l'ouvrage lu (même
   unité, mots en commun) et la ligne du marché qui lui ressemble. Ce bloc
   dit ce qu'il a trouvé ; il ne décide rien : l'avenant reste à relire.
   ══════════════════════════════════════════════════════════════════════ */

import { montant } from "../format";

type Candidat = { designation?: string; prix_unitaire_ht?: number | string; unite?: string };
export type ChiffrageAuto = {
  etat?: "trouve" | "ambigu" | "sans_prix" | "sans_unite" | "sans_mot";
  designation?: string;
  prix_unitaire_ht?: number | string;
  unite?: string;
  candidats?: Candidat[];
  proche_du_marche?: { designation?: string; unite?: string } | null;
};

const prix = (c: Candidat, voitPrix: boolean) => (voitPrix && c.prix_unitaire_ht != null ? ` (${montant(Number(c.prix_unitaire_ht))} HT / ${c.unite ?? "u"})` : "");

export default function ChiffrageLu({ chiffrage, chiffree, voitPrix }: { chiffrage: unknown; chiffree: boolean; voitPrix: boolean }) {
  if (!chiffrage || typeof chiffrage !== "object") return null;
  const c = chiffrage as ChiffrageAuto;
  const phrase =
    c.etat === "trouve"
      ? chiffree
        ? `Chiffré par Daliro sur votre prix validé « ${c.designation} »${prix(c, voitPrix)} : vérifiez la quantité avant de soumettre.`
        : `Prix validé proposé : « ${c.designation} »${prix(c, voitPrix)} ; la quantité n'a pas été dite, chiffrez la ligne.`
      : c.etat === "ambigu"
        ? `Plusieurs prix validés possibles : ${(c.candidats ?? []).map((x) => `« ${x.designation} »${prix(x, voitPrix)}`).join(", ")}. Choisissez en chiffrant la ligne.`
        : c.etat
          ? "Aucun prix validé de votre bibliothèque ne correspond à l'ouvrage lu : chiffrez à la main."
          : null;
  return (
    <>
      {phrase ? <div className="esp-kpi-sous">{phrase}</div> : null}
      {c.proche_du_marche?.designation
        ? <div className="esp-kpi-sous">Proche de la ligne du marché « {c.proche_du_marche.designation} » : vérifiez que ce travail n&apos;y est pas déjà compris.</div>
        : null}
    </>
  );
}
