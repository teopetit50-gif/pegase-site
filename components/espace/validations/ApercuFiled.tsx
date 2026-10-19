"use client";

/* ══════════════════════════════════════════════════════════════════════
   Le dossier FILED d'une demande, vu depuis la file des validations
   (06/10/2026)

   Avant de décider « valider la facture », on voit ce qu'on valide : le
   document, le fournisseur, le TTC, l'état et les contrôles (bloquants, à
   vérifier, levés), et un lien qui ouvre le dossier complet dans
   /espace/filed. En base réelle, la facture est lue sous RLS ; en exemple,
   dans les dossiers d'exemple.
   ══════════════════════════════════════════════════════════════════════ */

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileSearch } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Source } from "../source";
import { Pastille } from "../ui";
import { montant } from "../format";
import type { Demande, StatutFacture } from "../types";
import { DOSSIERS_EXEMPLE } from "../exemples/filed";
import { statutFacture } from "../filed/etats";
import { lienDossierFiled } from "../filed/lien";

type Resume = {
  reference: string | null;
  numero: string | null;
  fournisseur: string | null;
  ttc: number | null;
  devise: string;
  statut: StatutFacture;
  bloquants: number;
  attention: number;
  levees: number;
};

async function lireReel(factureId: string): Promise<Resume | null> {
  const supabase = createClient();
  const { data: f } = await supabase
    .from("filed_factures")
    .select("id, numero, statut, montant_ttc, devise, nb_bloquants, nb_attention, fournisseur_id, document_id")
    .eq("id", factureId)
    .maybeSingle();
  if (!f) return null;
  const [doc, four, lev] = await Promise.all([
    supabase.from("filed_documents").select("reference").eq("id", f.document_id).maybeSingle(),
    f.fournisseur_id ? supabase.from("filed_fournisseurs").select("nom").eq("id", f.fournisseur_id).maybeSingle() : null,
    supabase.from("filed_levees").select("id", { count: "exact", head: true }).eq("facture_id", f.id),
  ]);
  return {
    reference: (doc.data as { reference?: string } | null)?.reference ?? null,
    numero: f.numero,
    fournisseur: (four?.data as { nom?: string } | null)?.nom ?? null,
    ttc: f.montant_ttc,
    devise: f.devise ?? "EUR",
    statut: f.statut,
    bloquants: f.nb_bloquants ?? 0,
    attention: f.nb_attention ?? 0,
    levees: lev.count ?? 0,
  };
}

function lireExemple(objetId: string): Resume | null {
  const d = DOSSIERS_EXEMPLE.find((x) => x.facture && (x.facture.id === objetId || x.document.reference === objetId));
  if (!d?.facture) return null;
  return {
    reference: d.document.reference,
    numero: d.facture.numero,
    fournisseur: d.fournisseur?.nom ?? null,
    ttc: d.facture.montant_ttc,
    devise: d.facture.devise,
    statut: d.facture.statut,
    bloquants: d.facture.nb_bloquants,
    attention: d.facture.nb_attention,
    levees: d.levees.length,
  };
}

export default function ApercuFiled({ demande: d, source }: { demande: Demande; source: Source }) {
  const lien = lienDossierFiled(d.objet_type, d.objet_id, d.payload);
  const facture = d.objet_type === "filed_facture" && d.objet_id ? d.objet_id : null;
  const [reel, setReel] = useState<{ pour: string; resume: Resume | null } | null>(null);

  useEffect(() => {
    if (source !== "reelle" || !facture) return;
    let actif = true;
    lireReel(facture)
      .then((r) => actif && setReel({ pour: facture, resume: r }))
      .catch(() => actif && setReel({ pour: facture, resume: null }));
    return () => {
      actif = false;
    };
  }, [source, facture]);

  if (!lien) return null;
  const r = !facture ? null : source === "exemple" ? lireExemple(facture) : reel?.pour === facture ? reel.resume : null;
  const s = r ? statutFacture(r.statut) : null;

  return (
    <div className="esp-apercu-filed">
      <div className="esp-section-titre">Le dossier</div>
      {r && s ? (
        <div className="esp-item-haut" style={{ marginBottom: 8 }}>
          {r.reference ? <span className="esp-mono" style={{ fontWeight: 700 }}>{r.reference}</span> : null}
          <Pastille teinte={s.teinte}>{s.libelle}</Pastille>
          {r.bloquants ? <Pastille teinte="rouge">{r.bloquants} bloquant{r.bloquants > 1 ? "s" : ""}</Pastille> : null}
          {r.attention ? <Pastille teinte="ambre">{r.attention} à vérifier</Pastille> : null}
          {r.levees ? <Pastille teinte="bleu">{r.levees} levé{r.levees > 1 ? "s" : ""}</Pastille> : null}
          {!r.bloquants && !r.attention ? <Pastille teinte="vert">contrôles passés</Pastille> : null}
        </div>
      ) : null}
      {r ? (
        <p className="esp-kpi-sous" style={{ margin: "0 0 10px" }}>
          {r.numero ? `Facture n° ${r.numero}` : "Facture"}
          {r.fournisseur ? ` de ${r.fournisseur}` : ""}
          {r.ttc !== null ? ` · ${montant(r.ttc, r.devise)} TTC` : ""}
        </p>
      ) : null}
      <Link href={lien} className="r-btn r-btn--fil r-btn--petit">
        <FileSearch width={13} height={13} aria-hidden="true" /> Ouvrir le dossier
      </Link>
    </div>
  );
}
