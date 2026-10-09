"use client";

/* ══════════════════════════════════════════════════════════════════════
   Une page-document du pilotage, modifiable (09/10/2026)

   Le texte vit dans omega_pages (Markdown). La page est découpée en
   sections « ## » : chacune a son bouton « Modifier », qui ouvre son
   Markdown dans un champ ; « Enregistrer » réécrit la page entière en
   base. Les cases à cocher s'enregistrent au clic. Les droits sont ceux
   de la base (RLS omega_est_admin) : sans eux, l'écriture échoue et la
   page le dit.
   ══════════════════════════════════════════════════════════════════════ */

import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Markdown, basculerCase, sections } from "./markdown";

const I = { width: 14, height: 14, strokeWidth: 1.6, "aria-hidden": true } as const;

export default function Document({ slug, titre, contenu: initial }: { slug: string; titre: string; contenu: string }) {
  const [contenu, setContenu] = useState(initial);
  const [edition, setEdition] = useState<number | null>(null);
  const [brouillon, setBrouillon] = useState("");
  const [etat, setEtat] = useState<"" | "enregistrement" | "enregistre" | "erreur">("");
  const parties = sections(contenu);

  async function enregistrer(texte: string) {
    setEtat("enregistrement");
    const { error } = await createClient()
      .from("omega_pages")
      .upsert({ slug, titre, contenu: texte, maj: new Date().toISOString() });
    if (error) {
      setEtat("erreur");
      return false;
    }
    setContenu(texte);
    setEtat("enregistre");
    return true;
  }

  const recomposer = (index: number, texte: string) => {
    const copie = [...parties];
    if (index >= copie.length) copie.push(texte.trim());
    else if (texte.trim()) copie[index] = texte.trim();
    else copie.splice(index, 1);
    return copie.join("\n\n") + "\n";
  };

  return (
    <div className="om-doc">
      <p className="om-etat" role="status">
        {etat === "enregistrement" ? "Enregistrement…" : etat === "enregistre" ? "Enregistré" : etat === "erreur" ? "Échec de l'enregistrement : vérifiez votre connexion." : ""}
      </p>
      {parties.map((p, i) =>
        edition === i ? (
          <section key={i} className="v2-carte om-section om-section--edition">
            <label className="om-label" htmlFor={`edition-${slug}-${i}`}>
              Modifier la section (Markdown : ## titre, **gras**, - liste, - [ ] case, | tableau |)
            </label>
            <textarea id={`edition-${slug}-${i}`} className="om-zone" value={brouillon} onChange={(e) => setBrouillon(e.target.value)} rows={Math.min(40, Math.max(8, brouillon.split("\n").length + 2))} autoFocus />
            <div className="om-actions">
              <button type="button" className="v2-btn v2-btn--petit v2-btn--fantome" onClick={() => setEdition(null)}>
                Annuler
              </button>
              <button
                type="button"
                className="v2-btn v2-btn--petit v2-btn--primaire"
                onClick={async () => {
                  if (await enregistrer(recomposer(i, brouillon))) setEdition(null);
                }}
              >
                Enregistrer
              </button>
            </div>
          </section>
        ) : (
          <section key={i} className="v2-carte om-section">
            <button
              type="button"
              className="v2-btn v2-btn--petit v2-btn--fantome om-modifier"
              onClick={() => {
                setBrouillon(p);
                setEdition(i);
                setEtat("");
              }}
            >
              <Pencil {...I} />
              Modifier
            </button>
            <Markdown source={p} onCase={(rang) => enregistrer(recomposer(i, basculerCase(p, rang)))} />
          </section>
        ),
      )}
      {edition === parties.length ? null : (
        <button
          type="button"
          className="v2-btn v2-btn--petit om-ajouter"
          onClick={() => {
            setBrouillon("## Nouvelle section\n\n");
            setEdition(parties.length);
            setEtat("");
          }}
        >
          <Plus {...I} />
          Ajouter une section
        </button>
      )}
      {edition === parties.length ? (
        <section className="v2-carte om-section om-section--edition">
          <label className="om-label" htmlFor={`edition-${slug}-nouvelle`}>
            Nouvelle section
          </label>
          <textarea id={`edition-${slug}-nouvelle`} className="om-zone" value={brouillon} onChange={(e) => setBrouillon(e.target.value)} rows={10} autoFocus />
          <div className="om-actions">
            <button type="button" className="v2-btn v2-btn--petit v2-btn--fantome" onClick={() => setEdition(null)}>
              Annuler
            </button>
            <button
              type="button"
              className="v2-btn v2-btn--petit v2-btn--primaire"
              onClick={async () => {
                if (await enregistrer(recomposer(parties.length, brouillon))) setEdition(null);
              }}
            >
              Enregistrer
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
