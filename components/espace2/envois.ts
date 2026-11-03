/* Le journal des envois (03/11/2026). Le site promet « Chaque envoi laisse une trace : ce qui est parti, à qui,
   sur quelle règle, et qui l'a validé » et un journal « tout ce qui est parti ». Les envois sont inscrits dans
   public.journal_opposable (lecture des gérants et administrateurs, la même que l'export CSV des Réglages) ;
   la page Activité les montre dans une quatrième colonne, « Envois ». */

import { createClient } from "@/lib/supabase/client";
import { ilYa } from "@/components/espace/exemples/socle";

export type Envoi = { id: string; quand: string; quoi: string; module: string; a_qui: string; regle: string | null; valide_par: string | null; montant: number | null; lien: string | null };

/* une action du journal est un envoi quand elle dit qu'un message est parti */
const EST_ENVOI = /(envoy|envoi|\.parti|\.diffus|\.relance_partie)/i;

export async function chargerEnvois(): Promise<Envoi[]> {
  const { data, error } = await createClient()
    .from("journal_opposable")
    .select("id, survenu_le, action, objet_type, objet_id, acteur_libelle, donnees")
    .or("action.ilike.%envoy%,action.ilike.%envoi%,action.ilike.%diffus%")
    .order("survenu_le", { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);
  return ((data ?? []) as { id: number; survenu_le: string; action: string; objet_type: string; acteur_libelle: string | null; donnees: Record<string, unknown> | null }[])
    .filter((x) => EST_ENVOI.test(x.action))
    .map((x) => {
      const d = x.donnees ?? {};
      const t = (k: string) => (typeof d[k] === "string" ? (d[k] as string) : typeof d[k] === "number" ? String(d[k]) : null);
      const dest = t("destinataire") ?? t("destinataire_adresse") ?? t("a") ?? (t("destinataires") ? `${t("destinataires")} destinataire(s)` : null);
      return {
        id: `env-${x.id}`,
        quand: x.survenu_le,
        quoi: x.action.replace(/^[a-z0-9]+\./, "").replace(/[._]/g, " "),
        module: x.action.split(".")[0],
        a_qui: dest ?? "destinataire non noté",
        regle: t("regle") ?? t("regle_libelle") ?? t("palier"),
        valide_par: t("valide_par") ?? t("valideur") ?? x.acteur_libelle,
        montant: typeof d.montant === "number" ? (d.montant as number) : null,
        lien: null,
      };
    });
}

export function envoisExemple(): Envoi[] {
  return [
    { id: "env-1", quand: ilYa(0, 7), quoi: "Point du matin envoyé", module: "socle", a_qui: "2 destinataires · direction et comptabilité", regle: "point du matin, chaque jour ouvré à 7 h", valide_par: "envoi automatique autorisé", montant: null, lien: "/espace2/point" },
    { id: "env-2", quand: ilYa(0, 9), quoi: "Relance FA-2418 envoyée", module: "cashd", a_qui: "compta@lefevre-patrimoine.fr", regle: "rappel courtois, J+7 après l'échéance", valide_par: "Claire Morel", montant: 8940, lien: "/espace2/cashd/suivi?vue=relances" },
    { id: "env-3", quand: ilYa(0, 11), quoi: "Réponse envoyée · demande du samedi", module: "reput", a_qui: "client par courriel", regle: "sujet « Horaires », autorisé d'avance", valide_par: "réponse partie seule (sujet autorisé)", montant: null, lien: "/espace2/reput?vue=demandes" },
    { id: "env-4", quand: ilYa(0, 16), quoi: "3 pièces classées transmises à la comptabilité", module: "filed", a_qui: "cabinet@ferrand-expertise.fr", regle: "transmission à la validation", valide_par: "Vous", montant: null, lien: "/espace2/filed/comptabilite" },
    { id: "env-5", quand: ilYa(1, 10), quoi: "Message de reprise envoyé · Garage Martin", module: "offload", a_qui: "atelier@garage-martin.exemple", regle: "silence de 90 jours, au moins 200 € d'achats", valide_par: "Sofia Carvalho", montant: null, lien: "/espace2/offload" },
    { id: "env-6", quand: ilYa(2, 9), quoi: "Mise en demeure envoyée · Restaurant Le Comptoir", module: "cashd", a_qui: "gerance@le-comptoir.example.com", regle: "mise en demeure, J+30", valide_par: "Vous", montant: 3120, lien: "/espace2/cashd/suivi?vue=relances" },
  ];
}
