"use client";

/* ══════════════════════════════════════════════════════════════════════
   Les exports de FILED (21/10/2026, session A4, lot 4 de la reprise) :
   ce que le balayage a produit dans filed_exports — les exports programmés
   et le sceau mensuel de l'historique (a4_64). Une ligne par export : sa
   nature, sa période, ses lignes, son empreinte, sa date ; le fichier se
   télécharge tant que son contenu est gardé (90 jours, puis seule
   l'empreinte reste).
   Le courriel du sceau mène ici par /espace/filed/comptabilite?export=<id> :
   la ligne de cet export est mise en avant, avec son empreinte entière.
   ══════════════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Stamp } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Avis, Chargement, Pastille } from "../ui";
import { quand, telecharger } from "./factureElectronique";

export type ExportFiled = {
  id: string;
  tableau: string;
  du: string | null;
  au: string | null;
  nb_lignes: number;
  sha256: string;
  contenu: string | null;
  genere_le: string;
};

const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const jour = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });

function nature(x: ExportFiled): string {
  if (x.tableau === "sceau_historique") {
    const d = x.du ? new Date(`${x.du}T12:00:00`) : null;
    return d ? `Sceau de l'historique — ${MOIS[d.getMonth()]} ${d.getFullYear()}` : "Sceau de l'historique";
  }
  return x.tableau.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
}

function periode(x: ExportFiled): string {
  if (x.du && x.au) return x.du === x.au ? jour(x.du) : `${jour(x.du)} → ${jour(x.au)}`;
  return x.du ? `depuis le ${jour(x.du)}` : x.au ? `jusqu'au ${jour(x.au)}` : "—";
}

const nomFichier = (x: ExportFiled) => `filed-${x.tableau.replace(/_/g, "-")}-${(x.du ?? x.genere_le).slice(0, 10)}.csv`;

/* l'exemple : le sceau du mois écoulé, au format du balayage (a4_64) */
function exemples(): ExportFiled[] {
  const now = new Date();
  const debut = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const fin = new Date(now.getFullYear(), now.getMonth(), 0);
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const empreinte = "9f2c4e1a7b3d5c8e0f6a2b4c6d8e0a1b3c5d7e9f1a3b5c7d9e1f3a5b7c9d1e3f";
  const contenu = `mois;dernier_rang;empreinte;lignes_du_mois;chaine;verifie_le\n${iso(debut).slice(0, 7)};412;${empreinte};37;intacte;${now.toISOString().slice(0, 19)}Z\n`;
  return [{ id: "exemple-sceau", tableau: "sceau_historique", du: iso(debut), au: iso(fin), nb_lignes: 1, sha256: empreinte, contenu, genere_le: now.toISOString() }];
}

export default function ExportsFiled({ source, client }: { source: "reelle" | "exemple"; client: string }) {
  const [lignes, setLignes] = useState<ExportFiled[] | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [vise, setVise] = useState<string | null>(null);

  /* l'export visé par le lien du courriel (?export=<id>) */
  useEffect(() => {
    const t = window.setTimeout(() => setVise(new URLSearchParams(window.location.search).get("export")), 0);
    return () => window.clearTimeout(t);
  }, []);

  const charger = useCallback(async () => {
    await Promise.resolve();
    setErreur(null);
    if (source === "exemple") {
      setLignes(exemples());
      return;
    }
    if (!client) {
      setLignes([]);
      return;
    }
    const { data, error } = await createClient()
      .from("filed_exports")
      .select("id, tableau, du, au, nb_lignes, sha256, contenu, genere_le")
      .eq("client_id", client)
      .order("genere_le", { ascending: false })
      .limit(50);
    if (error) {
      setErreur(error.message);
      setLignes([]);
    } else {
      setLignes((data ?? []) as ExportFiled[]);
    }
  }, [source, client]);
  useEffect(() => {
    const t = window.setTimeout(() => void charger(), 0);
    return () => window.clearTimeout(t);
  }, [charger]);

  const enAvant = useMemo(() => (lignes && vise ? lignes.find((x) => x.id === vise) ?? null : null), [lignes, vise]);
  useEffect(() => {
    if (!enAvant) return;
    document.getElementById(`export-${enAvant.id}`)?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [enAvant]);

  return (
    <section className="esp-carte" aria-labelledby="titre-exports">
      <div className="esp-carte-tete">
        <h2 className="esp-carte-titre" id="titre-exports">Les exports de FILED</h2>
        <span className="esp-kpi-sous">gardés 90 jours, l&apos;empreinte ensuite</span>
      </div>
      <div className="esp-carte-corps" style={{ display: "grid", gap: 10 }}>
        {erreur ? <Avis teinte="rouge" role="alert"><strong>La base n&apos;a pas répondu.</strong> {erreur}</Avis> : null}
        {vise && lignes && !enAvant ? (
          <Avis teinte="ambre" role="status">L&apos;export de ce lien n&apos;est pas dans la liste : il est plus ancien, ou d&apos;une autre organisation.</Avis>
        ) : null}
        {enAvant ? (
          <Avis teinte="bleu" role="status">
            <strong>{nature(enAvant)}</strong> — produit le {quand(enAvant.genere_le)}. Empreinte du fichier : <span className="esp-mono" style={{ wordBreak: "break-all" }}>{enAvant.sha256}</span>.
            {enAvant.tableau === "sceau_historique" ? " Conservez-la hors d'Omega : une vérification qui la retrouve prouve que l'historique n'a pas été réécrit." : ""}
          </Avis>
        ) : null}
        {!lignes ? (
          <Chargement texte="Lecture des exports…" />
        ) : !lignes.length ? (
          <p className="esp-sous" style={{ margin: 0 }}>Aucun export pour l&apos;instant : le premier sceau arrive au début du mois prochain.</p>
        ) : (
          <div className="esp-tableau-cadre" tabIndex={0} role="region" aria-label="Les exports de FILED">
            <table className="esp-tableau">
              <thead><tr><th>Export</th><th>Période</th><th>Lignes</th><th>Empreinte</th><th>Produit le</th><th aria-label="Télécharger" /></tr></thead>
              <tbody>
                {lignes.map((x) => (
                  <tr key={x.id} id={`export-${x.id}`} aria-current={enAvant?.id === x.id ? "true" : undefined}
                      style={enAvant?.id === x.id ? { outline: "2px solid var(--esp-accent, currentColor)", outlineOffset: -2 } : undefined}>
                    <td>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        {x.tableau === "sceau_historique" ? <Stamp width={13} height={13} aria-hidden="true" style={{ flex: "none" }} /> : null}
                        {nature(x)}
                      </span>
                    </td>
                    <td>{periode(x)}</td>
                    <td>{x.nb_lignes}</td>
                    <td className="esp-mono" title={x.sha256}>{x.sha256.slice(0, 12)}…</td>
                    <td>{quand(x.genere_le)}</td>
                    <td>
                      {x.contenu ? (
                        <button type="button" className="r-btn r-btn--fil r-btn--petit" aria-label={`Télécharger : ${nature(x)}`} onClick={() => telecharger(nomFichier(x), x.contenu ?? "")}>
                          <Download width={12} height={12} aria-hidden="true" /> Télécharger
                        </button>
                      ) : (
                        <Pastille contour title="Le contenu est vidé après 90 jours ; l'empreinte reste">empreinte seule</Pastille>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
